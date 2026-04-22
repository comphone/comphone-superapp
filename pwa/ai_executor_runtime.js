// ===== AI_EXECUTOR RUNTIME v18.1 - SAFE EXECUTION LAYER =====
// PHASE 20.4 + 20.5: Hardened AI_EXECUTOR with GAS_EXECUTE integration
// COMPHONE SUPER APP V5.5
// ============================================================
// การทำงาน:
//   1. ไม่ทับ AI_EXECUTOR ที่มาจาก execution_lock.js
//   2. API_CONTROLLER ใช้ GAS_EXECUTE แทน fetch โดยตรง
//   3. ใช้ __TRUSTED_ACTIONS แทน __ACTION_REGISTRY เพื่อลดข้อผิดพลาด
// ============================================================
'use strict';

// Safety flags
window.__AI_EXECUTOR_ENABLED = true;
window.__AI_TRUST_TOO_LOW = false;
window.__ACTION_EXEC_LOCK = new Map(); // actionName -> expiry timestamp
window.__EXECUTION_LOG = []; // For debugging

// PHASE 20.3+20.5: Defensive declarations (source of truth is execution_lock.js)
window.__TRUSTED_ACTIONS = window.__TRUSTED_ACTIONS || {};
window.__LAST_APPROVED_ACTION = window.__LAST_APPROVED_ACTION || null;

// PHASE 25.4: Global Execution Trace
window.EXECUTION_TRACE = window.EXECUTION_TRACE || [];

// PHASE 25.5: Persist execution trace from localStorage
(function loadPersistedTrace() {
  try {
    const saved = localStorage.getItem('comphone_exec_trace');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        window.EXECUTION_TRACE = parsed;
      }
    }
  } catch (e) {
    console.warn('[TRACE] Failed to load persisted trace:', e);
  }
})();

function persistTrace() {
  try {
    const trimmed = window.EXECUTION_TRACE.slice(-100);
    localStorage.setItem('comphone_exec_trace', JSON.stringify(trimmed));
  } catch (e) {
    // Ignore quota errors
  }
}

// PHASE 25.5: Failure Memory
window.FAILURE_MEMORY = {
  records: [],
  record: function(entry) {
    this.records.push({
      action: entry.action,
      error: entry.error,
      timestamp: Date.now()
    });
    // Keep only last 50
    if (this.records.length > 50) this.records = this.records.slice(-50);
    try {
      localStorage.setItem('comphone_failure_mem', JSON.stringify(this.records));
    } catch (e) {}
  },
  load: function() {
    try {
      const saved = localStorage.getItem('comphone_failure_mem');
      if (saved) this.records = JSON.parse(saved);
    } catch (e) {}
  }
};
window.FAILURE_MEMORY.load();

// PHASE 25.5: Failure Alert (>3 errors in 60s)
const __ERROR_WINDOW = [];
function checkFailureAlert(action, normalizedError) {
  const now = Date.now();
  __ERROR_WINDOW.push({ ts: now, action, error: normalizedError });
  // Trim old entries (>60s)
  const cutoff = now - 60000;
  while (__ERROR_WINDOW.length > 0 && __ERROR_WINDOW[0].ts < cutoff) {
    __ERROR_WINDOW.shift();
  }
  if (__ERROR_WINDOW.length > 3) {
    console.warn('[FAILURE_ALERT] มี Error มากกว่า 3 ครั้ง ใน 60 วิ:', __ERROR_WINDOW);
    // Optional: notify admin via GAS if available
    if (window.GAS_EXECUTE && typeof window.GAS_EXECUTE === 'function') {
      try {
        window.GAS_EXECUTE('notifyAdmin', {
          subject: 'COMPHONE FAILURE ALERT',
          body: JSON.stringify(__ERROR_WINDOW.slice(-3))
        });
      } catch (e) {}
    }
  }
}

// PHASE 25.4: Error Normalization Map
const ERROR_NORMALIZATION = {
  map: function(err) {
    const msg = (err && err.message) ? err.message : String(err);
    if (msg.includes('APPROVAL_REQUIRED')) return { type: 'APPROVAL_REQUIRED', code: 401, message: msg };
    if (msg.includes('UNTRUSTED_ACTION')) return { type: 'UNTRUSTED_ACTION', code: 403, message: msg };
    if (msg.includes('TIMEOUT') || msg.includes('timeout')) return { type: 'TIMEOUT', code: 408, message: msg };
    if (msg.includes('API_ERROR') || msg.includes('SERVER_ERROR')) return { type: 'API_ERROR', code: 500, message: msg };
    if (msg.includes('NETWORK') || msg.includes('fetch') || msg.includes('ECONNREFUSED')) return { type: 'API_ERROR', code: 503, message: msg };
    return { type: 'UNKNOWN', code: 500, message: msg };
  }
};

// อ่าน role จาก APP state (ไม่อ่านจาก localStorage โดยตรง)
Object.defineProperty(window, '__USER_ROLE', {
  get() {
    const user = (typeof APP !== 'undefined' && APP.user) ? APP.user : null;
    return user ? (user.role || 'guest') : 'guest';
  },
  set() {
    console.warn('⛔ __USER_ROLE is read-only in production mode');
  },
  configurable: false
});

// Trust system
function checkTrust() {
  return !window.__AI_TRUST_TOO_LOW;
}

// ใช้ __TRUSTED_ACTIONS จาก execution_lock.js แทน __ACTION_REGISTRY
function isActionRegistered(action) {
  if (window.__TRUSTED_ACTIONS && window.__TRUSTED_ACTIONS[action]) {
    return true;
  }
  // SECURITY: ถ้าไม่อยู่ใน whitelist → BLOCK
  return false;
}

// Data schema (defined in dashboard_pc.html or injected)
window.__DATA_SCHEMA = window.__DATA_SCHEMA || {};

// Action map (defined in dashboard_pc.html)
window.__ACTION_MAP = window.__ACTION_MAP || {};

// Approval queue and related functions (Hardened Approval System)
window.__APPROVAL_QUEUE = window.__APPROVAL_QUEUE || [];
window.__APPROVAL_LOG = window.__APPROVAL_LOG || [];
const APPROVAL_TIMEOUT = 30000; // 30 sec

function getPriority(action) {
  const map = {
    deleteData: 0,
    posCheckout: 1,
    updateJobStatus: 2,
    getDashboardBundle: 3
  };
  return map[action] ?? 99;
}

function renderApprovalUI() {
  const panel = document.getElementById('approval-panel');
  if (!panel) return;
  const queue = window.__APPROVAL_QUEUE
    .sort((a, b) => getPriority(a.action) - getPriority(b.action));
  const html = queue.map(item => `
    <div class="approval-item">
      <b>${item.action}</b>
      <button onclick="window._approveItem('${item.id}')">อนุมัติ</button>
      <button onclick="window._rejectItem('${item.id}')">ปฏิเสธ</button>
    </div>
  `).join('');
  panel.innerHTML = html;
}

window._approveItem = function(id) {
  const item = window.__APPROVAL_QUEUE.find(x => x.id === id);
  if (!item) return;

  // PHASE 20.3 FIX: Set one-time approval token BEFORE resolving
  window.__LAST_APPROVED_ACTION = item.action;
  if (window.__APPROVAL_CLEAR_TIMEOUT) {
    clearTimeout(window.__APPROVAL_CLEAR_TIMEOUT);
  }
  window.__APPROVAL_CLEAR_TIMEOUT = setTimeout(() => {
    window.__LAST_APPROVED_ACTION = null;
    console.log('[APPROVAL] ⏰ Token auto-cleared for:', item.action);
  }, 3000);

  item.resolve(true);
  _logApprovalItem(item, true);
  _removeApprovalItem(id);
};

window._rejectItem = function(id) {
  const item = window.__APPROVAL_QUEUE.find(x => x.id === id);
  if (!item) return;
  item.resolve(false);
  _logApprovalItem(item, false);
  _removeApprovalItem(id);
};

function _removeApprovalItem(id) {
  window.__APPROVAL_QUEUE = window.__APPROVAL_QUEUE.filter(x => x.id !== id);
  renderApprovalUI();
}

function _logApprovalItem(item, approved) {
  window.__APPROVAL_LOG.push({
    action: item.action,
    decision: item.decision,
    approved: approved,
    role: window.__USER_ROLE,
    ts: Date.now()
  });
}

// Auto cleanup expired approvals
setInterval(() => {
  const now = Date.now();
  window.__APPROVAL_QUEUE = window.__APPROVAL_QUEUE.filter(item => {
    const expired = now - item.createdAt > APPROVAL_TIMEOUT;
    if (expired) {
      item.resolve(false);
    }
    return !expired;
  });
  renderApprovalUI();
}, 5000);

// ============================================================
// API Controller — ใช้ GAS_EXECUTE แทน fetch โดยตรง (PHASE 20.5)
// ============================================================
const API_CONTROLLER = {
  call: async function(apiName, payload) {
    // ตรวจสอบว่า action อยู่ใน whitelist
    if (window.__TRUSTED_ACTIONS && !window.__TRUSTED_ACTIONS[apiName]) {
      throw new Error('UNTRUSTED_ACTION_BLOCKED: "' + apiName + '"');
    }

    // ใช้ AI_EXECUTOR ที่มาจาก execution_lock.js
    // AI_EXECUTOR.execute จะต้องงาน approval token (สำหรับ write)
    // AI_EXECUTOR.query ไม่ต้อง approval token (สำหรับ read)
    const map = window.__ACTION_MAP[apiName];
    const isWrite = map && map.type === 'write';

    if (window.AI_EXECUTOR && window.AI_EXECUTOR.execute && window.AI_EXECUTOR.query) {
      const method = isWrite ? 'execute' : 'query';
      return await window.AI_EXECUTOR[method]({ action: apiName, payload: payload || {} });
    }

    // Fallback ที่ปลอดภัย — ไม่ควรถึงใช้งานใน production
    throw new Error('AI_EXECUTOR_NOT_AVAILABLE: Cannot execute "' + apiName + '" — execution_lock.js not loaded');
  }
};

// Impact tracking (business metrics)
const IMPACT_TRACKER = {
  track: function(action, before, after) {
    const impact = {
      action,
      timestamp: new Date().toISOString(),
      before,
      after,
      delta: this.calculateDelta(before, after)
    };
    window.__EXECUTION_LOG.push(impact);
    console.log('IMPACT_TRACKED:', impact);
    return impact;
  },
  calculateDelta: function(before, after) {
    if (typeof before === 'number' && typeof after === 'number') {
      return after - before;
    }
    return null;
  }
};

// Validation functions
function validatePreCondition(decision) {
  if (!decision || typeof decision !== 'object') {
    return { valid: false, reason: 'INVALID_DECISION_FORMAT' };
  }

  if (!decision.action || typeof decision.action !== 'string') {
    return { valid: false, reason: 'MISSING_ACTION' };
  }

  const action = decision.action;

  // Check if action is trusted (ใช้ __TRUSTED_ACTIONS จาก execution_lock.js)
  if (!isActionRegistered(action)) {
    return { valid: false, reason: 'UNREGISTERED_ACTION' };
  }

  // Check payload
  if (!decision.payload || typeof decision.payload !== 'object') {
    return { valid: false, reason: 'MISSING_PAYLOAD' };
  }

  return { valid: true };
}

function validatePostCondition(action, result) {
  if (!result || typeof result !== 'object') {
    return { valid: false, reason: 'INVALID_RESULT_FORMAT' };
  }

  if (result.success === false) {
    return { valid: false, reason: 'ACTION_FAILED', detail: result.error };
  }

  return { valid: true };
}

// Idempotency check
function checkIdempotency(action) {
  const now = Date.now();
  const expiry = window.__ACTION_EXEC_LOCK.get(action);

  if (expiry && expiry > now) {
    return { allowed: false, reason: 'IDEMPOTENCY_BLOCK', waitTime: Math.ceil((expiry - now) / 1000) };
  }

  // Set lock for 60 seconds
  window.__ACTION_EXEC_LOCK.set(action, now + 60000);
  return { allowed: true };
}

// Failure guard
const __FAILURE_COUNT = new Map(); // actionName -> count

function recordFailure(action) {
  const count = (__FAILURE_COUNT.get(action) || 0) + 1;
  __FAILURE_COUNT.set(action, count);

  if (count >= 2) {
    // Disable action for 5 minutes
    setTimeout(() => {
      __FAILURE_COUNT.delete(action);
      console.log(`ACTION_REENABLED: ${action} after failure cool-down`);
    }, 300000); // 5 minutes

    return { disabled: true, reason: 'FAILURE_GUARD', coolDownMs: 300000 };
  }

  return { disabled: false };
}

// Main execution function (PHASE 25.4: with execution trace)
async function AI_EXECUTOR(decision) {
  const traceEntry = {
    action: decision && decision.action,
    ts: Date.now(),
    status: 'started',
    result: null,
    error: null,
    tokenUsed: !!window.__LAST_APPROVED_ACTION,
    duration: 0
  };

  if (!window.__AI_EXECUTOR_ENABLED) {
    traceEntry.status = 'disabled';
    traceEntry.error = 'EXECUTOR_DISABLED';
    window.EXECUTION_TRACE.push(traceEntry);
    persistTrace();
    return { error: 'EXECUTOR_DISABLED' };
  }

  // PHASE 26.5: POLICY CHECK BEFORE EXECUTE
  if (typeof window.POLICY_CHECK_BEFORE_EXECUTE === 'function') {
    const policyCheck = window.POLICY_CHECK_BEFORE_EXECUTE(decision);
    if (policyCheck.blocked) {
      traceEntry.status = 'policy_blocked';
      traceEntry.error = policyCheck.reason;
      window.EXECUTION_TRACE.push(traceEntry);
      persistTrace();
      console.error('POLICY_BLOCKED:', policyCheck.reason, decision);
      return { error: 'POLICY_BLOCKED', reason: policyCheck.reason };
    }
  }

  // 1. PRE-CONDITION VALIDATION
  const preCheck = validatePreCondition(decision);
  if (!preCheck.valid) {
    traceEntry.status = 'pre_check_failed';
    traceEntry.error = preCheck.reason;
    window.EXECUTION_TRACE.push(traceEntry);
    persistTrace();
    console.error('PRE_CONDITION_FAILED:', preCheck.reason, decision);
    return { error: 'PRE_CONDITION_FAILED', reason: preCheck.reason };
  }

  const action = decision.action;
  const startTime = Date.now();

  // 2. TRUST CHECK
  if (!checkTrust()) {
    traceEntry.status = 'trust_low';
    traceEntry.error = 'AI_TRUST_TOO_LOW';
    window.EXECUTION_TRACE.push(traceEntry);
    persistTrace();
    return { error: 'AI_TRUST_TOO_LOW' };
  }

  // 3. IDEMPOTENCY CHECK
  const idemCheck = checkIdempotency(action);
  if (!idemCheck.allowed) {
    traceEntry.status = 'idempotency_block';
    traceEntry.error = idemCheck.reason;
    traceEntry.duration = Date.now() - startTime;
    window.EXECUTION_TRACE.push(traceEntry);
    persistTrace();
    return { error: 'IDEMPOTENCY_BLOCK', reason: idemCheck.reason, waitTime: idemCheck.waitTime };
  }

  // 4. REAL APPROVAL (SANDBOX)
  const map = window.__ACTION_MAP[action];
  if (map && map.type === 'write') {
    const approved = await AI_SANDBOX.propose(action, decision);
    if (!approved) {
      traceEntry.status = 'user_denied';
      traceEntry.error = 'USER_DENIED_APPROVAL';
      traceEntry.duration = Date.now() - startTime;
      window.EXECUTION_TRACE.push(traceEntry);
    persistTrace();
      return { error: 'USER_DENIED_APPROVAL' };
    }
  }

  // 5. EXECUTION (ENFORCED THROUGH API_CONTROLLER -> GAS_EXECUTE)
  try {
    const result = await API_CONTROLLER.call(action, decision.payload);
    traceEntry.status = 'success';
    traceEntry.result = result;

    // 6. POST-CONDITION VALIDATION
    const postCheck = validatePostCondition(action, result);
    if (!postCheck.valid) {
      traceEntry.status = 'post_check_failed';
      traceEntry.error = postCheck.reason;
      traceEntry.duration = Date.now() - startTime;
      window.EXECUTION_TRACE.push(traceEntry);
    persistTrace();
      console.error('POST_CONDITION_FAILED:', postCheck.reason, result);
      const failure = recordFailure(action);
      if (failure.disabled) {
        return { error: 'POST_CONDITION_FAILED', reason: postCheck.reason, failureGuard: failure };
      }
      return { error: 'POST_CONDITION_FAILED', reason: postCheck.reason };
    }

    // 7. UI REFRESH (if write action)
    if (map && map.type === 'write' && window.__UI_REFRESH_MAP && window.__UI_REFRESH_MAP[action]) {
      try {
        await window.__UI_REFRESH_MAP[action]();
      } catch (uiErr) {
        console.warn('UI_REFRESH_ERROR:', uiErr);
      }
    }

    // 8. IMPACT TRACKING
    const impact = IMPACT_TRACKER.track(action, { /* before */ }, result.data || {});

    // 9. RETURN SUCCESS
    traceEntry.duration = Date.now() - startTime;
    window.EXECUTION_TRACE.push(traceEntry);
    persistTrace();

    // PHASE 26.5: AUDIT LOG
    if (typeof window.AI_AUDIT_PUSH === 'function') {
      window.AI_AUDIT_PUSH({
        type: 'EXECUTION_SUCCESS',
        action: action,
        duration: traceEntry.duration,
        ts: Date.now()
      });
    }

    return {
      success: true,
      data: result.data,
      impactId: window.__EXECUTION_LOG.length - 1,
      executionTrace: window.__EXECUTION_LOG.slice(-1)
    };

  } catch (err) {
    const normalized = ERROR_NORMALIZATION.map(err);
    traceEntry.status = 'error';
    traceEntry.error = normalized;
    traceEntry.duration = Date.now() - startTime;
    window.EXECUTION_TRACE.push(traceEntry);
    persistTrace();

    // PHASE 25.5: Record failure + alert
    window.FAILURE_MEMORY.record({ action, error: normalized });
    checkFailureAlert(action, normalized);

    console.error('EXECUTION_ERROR:', normalized.type, normalized.message);
    const failure = recordFailure(action);

    // PHASE 26.5: AUDIT LOG
    if (typeof window.AI_AUDIT_PUSH === 'function') {
      window.AI_AUDIT_PUSH({
        type: 'EXECUTION_ERROR',
        action: action,
        errorType: normalized.type,
        errorMessage: normalized.message,
        ts: Date.now()
      });
    }

    if (failure.disabled) {
      return { error: normalized.type, message: normalized.message, failureGuard: failure };
    }
    return { error: normalized.type, message: normalized.message };
  }
}

// Sandbox for proposals (Hardened Approval System)
const AI_SANDBOX = {
  propose: async function(action, decision) {
    return new Promise((resolve) => {
      const id = 'APP_' + Date.now();

      window.__APPROVAL_QUEUE.push({
        id,
        action,
        decision,
        resolve,
        createdAt: Date.now()
      });

      renderApprovalUI();
    });
  }
};

// ============================================================
// PHASE 20.5: Merge with execution_lock.js AI_EXECUTOR
// ไม่ทับ object ทั้งก้อน — เพิ่ม properties ที่ขาดหายไป
// ============================================================
const __EXISTING_AI_EXECUTOR = window.AI_EXECUTOR || {};

// ถ้าไม่มี execute จาก execution_lock.js — ใช้ fallback ที่เหลือมัน
const __FALLBACK_EXECUTE = __EXISTING_AI_EXECUTOR.execute || function(request) {
  console.warn('[AI_EXECUTOR] Fallback execute() called. execution_lock.js may not be loaded.');
  request = request || {};
  if (!request.action) throw new Error('AI_EXECUTOR.execute: missing action');
  return window.GAS_EXECUTE ? window.GAS_EXECUTE(request.action, request.payload || {}) : Promise.reject('GAS_EXECUTE not available');
};

const __FALLBACK_QUERY = __EXISTING_AI_EXECUTOR.query || function(request) {
  request = request || {};
  if (!request.action) throw new Error('AI_EXECUTOR.query: missing action');
  return window.GAS_EXECUTE ? window.GAS_EXECUTE(request.action, request.payload || {}, { skipApprovalCheck: true }) : Promise.reject('GAS_EXECUTE not available');
};

const __FALLBACK_SECURITY = __EXISTING_AI_EXECUTOR.security || {};

window.AI_EXECUTOR = Object.assign(
  {},
  __EXISTING_AI_EXECUTOR,
  {
    // รักษา execute/query จาก execution_lock.js (ห้ามทับ)
    execute: __FALLBACK_EXECUTE,
    query: __FALLBACK_QUERY,
    security: __FALLBACK_SECURITY,

    // เพิ่ม debug utilities
    debug: function() {
      return {
        enabled: window.__AI_EXECUTOR_ENABLED,
        trustTooLow: window.__AI_TRUST_TOO_LOW,
        actionLocks: Array.from(window.__ACTION_EXEC_LOCK.entries()).map(([action, expiry]) => ({
          action,
          expiresIn: Math.max(0, Math.ceil((expiry - Date.now()) / 1000))
        })),
        failureCounts: Array.from(__FAILURE_COUNT.entries()),
        executionLogLength: window.__EXECUTION_LOG.length,
        recentLog: window.__EXECUTION_LOG.slice(-5),
        actionMap: window.__ACTION_MAP,
        dataSchema: window.__DATA_SCHEMA,
        approvalQueueLength: window.__APPROVAL_QUEUE.length,
        approvalLogLength: window.__APPROVAL_LOG.length,
        lockInstalled: !!(window.google && window.google.script && window.google.script.run && window.google.script.run.__IS_LOCKED),
        lockVersion: (window.google && window.google.script && window.google.script.run && window.google.script.run.__VERSION) || 'unknown'
      };
    },
    reset: function() {
      window.__ACTION_EXEC_LOCK.clear();
      __FAILURE_COUNT.clear();
      window.__EXECUTION_LOG = [];
      console.log('AI_EXECUTOR reset');
    },
    enable: function() { window.__AI_EXECUTOR_ENABLED = true; },
    disable: function() { window.__AI_EXECUTOR_ENABLED = false; },
    setTrustLow: function(flag) { window.__AI_TRUST_TOO_LOW = !!flag; },

    // Legacy: AI_EXECUTOR(decision) wrapper
    run: AI_EXECUTOR
  }
);

// Auto-initialize
console.log('AI_EXECUTOR v18.2 - SAFE EXECUTION LOADED (PHASE 25.5)');

// PHASE 25.4: Debug Panel
window.AI_DEBUG_PANEL = function() {
  return {
    last10: window.EXECUTION_TRACE.slice(-10),
    inFlight: Array.from(window.__ACTION_EXEC_LOCK.entries()).map(([action, expiry]) => ({
      action,
      expiresIn: Math.max(0, Math.ceil((expiry - Date.now()) / 1000))
    })),
    disabled: Array.from(__FAILURE_COUNT.entries()).map(([action, count]) => ({ action, count })),
    version: window.__APP_VERSION,
    totalTraces: window.EXECUTION_TRACE.length,
    approvalQueue: window.__APPROVAL_QUEUE.length,
    lastError: window.EXECUTION_TRACE.filter(t => t.error).slice(-1)[0] || null
  };
};

// PHASE 25.4: Execution Health Check
window.EXECUTION_HEALTH_CHECK = function() {
  return {
    executor: typeof window.AI_EXECUTOR,
    gas: typeof window.GAS_EXECUTE,
    lock: window.__EXECUTION_LOCK_VERSION || 'NOT_INSTALLED',
    version: window.__APP_VERSION || 'NOT_SET',
    trustedActions: window.__TRUSTED_ACTIONS ? Object.keys(window.__TRUSTED_ACTIONS).length : 0,
    traceCount: window.EXECUTION_TRACE ? window.EXECUTION_TRACE.length : 0,
    timestamp: Date.now()
  };
};

// PHASE 25.5: System Ready Check
window.SYSTEM_READY_CHECK = function() {
  const health = window.EXECUTION_HEALTH_CHECK ? window.EXECUTION_HEALTH_CHECK() : {};
  return {
    version: window.__APP_VERSION,
    executor: typeof window.AI_EXECUTOR,
    gas: typeof window.GAS_EXECUTE,
    lock: window.__EXECUTION_LOCK_VERSION,
    trace: window.EXECUTION_TRACE ? window.EXECUTION_TRACE.length : 0,
    failures: window.FAILURE_MEMORY ? window.FAILURE_MEMORY.records.length : 0,
    ready: !!(
      window.__APP_VERSION &&
      window.AI_EXECUTOR &&
      typeof window.GAS_EXECUTE === 'function' &&
      window.__TRUSTED_ACTIONS &&
      Object.keys(window.__TRUSTED_ACTIONS).length > 0
    ),
    health: health
  };
};

// ============================================================
// PHASE 26: SELF HEALING SYSTEM
// ============================================================

// STEP 1 — AUTO ROOT CAUSE
window.AUTO_ROOT_CAUSE = function() {
  const recent = (window.EXECUTION_TRACE || []).slice(-20);
  const failures = recent.filter(t => t.status === 'error' || t.status === 'post_check_failed' || t.status === 'pre_check_failed');

  if (failures.length === 0) {
    return { cause: 'HEALTHY', confidence: 1.0, count: 0 };
  }

  const counts = {};
  failures.forEach(f => {
    const errType = (f.error && f.error.type) || (typeof f.error === 'string' ? f.error : 'UNKNOWN');
    counts[errType] = (counts[errType] || 0) + 1;
  });

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const [topCause, topCount] = sorted[0];
  const totalFailures = failures.length;
  const confidence = Math.min(0.99, topCount / Math.max(totalFailures, 3));

  let cause = topCause;
  // Map raw error types to root cause categories
  const causeMap = {
    'APPROVAL_REQUIRED': 'APPROVAL_REQUIRED',
    'USER_DENIED_APPROVAL': 'APPROVAL_REQUIRED',
    'API_ERROR': 'API_ERROR',
    'TIMEOUT': 'TIMEOUT',
    'UNTRUSTED_ACTION': 'UNTRUSTED_ACTION',
    'UNTRUSTED_ACTION_BLOCKED': 'UNTRUSTED_ACTION',
    'PRE_CONDITION_FAILED': 'VALIDATION',
    'POST_CONDITION_FAILED': 'VALIDATION',
    'IDEMPOTENCY_BLOCK': 'RATE_LIMIT',
    'AI_TRUST_TOO_LOW': 'TRUST',
    'EXECUTOR_DISABLED': 'CONFIG'
  };
  cause = causeMap[cause] || cause;

  return {
    cause: cause,
    confidence: parseFloat(confidence.toFixed(2)),
    count: totalFailures,
    breakdown: counts,
    recentActions: failures.slice(-3).map(f => f.action)
  };
};

// STEP 4 — FIX LEARNING ENGINE (define before AUTO_FIX)
window.FIX_LEARNING_ENGINE = {
  db: [],
  learn: function(entry) {
    this.db.push({
      cause: entry.cause,
      fix: entry.fix,
      success: entry.success,
      ts: Date.now()
    });
    // Keep last 100
    if (this.db.length > 100) this.db = this.db.slice(-100);
    try {
      localStorage.setItem('comphone_fix_db', JSON.stringify(this.db));
    } catch (e) {}
  },
  load: function() {
    try {
      const saved = localStorage.getItem('comphone_fix_db');
      if (saved) this.db = JSON.parse(saved);
    } catch (e) {}
  },
  getSuccessRate: function(cause, fix) {
    const matches = this.db.filter(r => r.cause === cause && r.fix === fix);
    if (matches.length === 0) return null;
    const successes = matches.filter(r => r.success).length;
    return parseFloat((successes / matches.length).toFixed(2));
  },
  suggestFix: function(cause) {
    // Find the fix with highest success rate for this cause
    const causeRecords = this.db.filter(r => r.cause === cause);
    if (causeRecords.length === 0) return null;
    const fixCounts = {};
    causeRecords.forEach(r => {
      if (!fixCounts[r.fix]) fixCounts[r.fix] = { total: 0, success: 0 };
      fixCounts[r.fix].total++;
      if (r.success) fixCounts[r.fix].success++;
    });
    let bestFix = null;
    let bestRate = -1;
    Object.entries(fixCounts).forEach(([fix, stats]) => {
      const rate = stats.success / stats.total;
      if (rate > bestRate) {
        bestRate = rate;
        bestFix = fix;
      }
    });
    return bestFix ? { fix: bestFix, rate: parseFloat(bestRate.toFixed(2)) } : null;
  }
};
window.FIX_LEARNING_ENGINE.load();

// STEP 5 — SAFETY GUARD
window.SELF_HEAL_SAFETY = {
  check: function(cause, confidence) {
    // NEVER auto-fix these
    const NEVER_AUTO = ['UNKNOWN', 'SECURITY', 'UNTRUSTED_ACTION', 'CONFIG'];
    if (NEVER_AUTO.includes(cause)) {
      return { allowed: false, reason: 'SAFETY_NEVER_AUTO: ' + cause };
    }
    // Confidence threshold
    if (confidence < 0.7) {
      return { allowed: false, reason: 'SAFETY_LOW_CONFIDENCE: ' + confidence };
    }
    // Require minimum sample size
    return { allowed: true };
  }
};

// STEP 2 — AUTO FIX ENGINE
window.AUTO_FIX = async function(cause) {
  const fixId = 'FIX_' + Date.now();
  console.log('[AUTO_FIX] Starting fix for cause:', cause, 'id:', fixId);

  // PHASE 26.5: POLICY CHECK BEFORE FIX
  if (typeof window.POLICY_CHECK_BEFORE_FIX === 'function') {
    const policyResult = window.POLICY_CHECK_BEFORE_FIX(cause);
    if (!policyResult.allowed) {
      console.warn('[AUTO_FIX] POLICY BLOCKED:', policyResult.reason, 'cause:', cause);
      if (typeof window.AI_AUDIT_PUSH === 'function') {
        window.AI_AUDIT_PUSH({ type: 'AUTO_FIX_BLOCKED', cause: cause, reason: policyResult.reason, ts: Date.now() });
      }
      return { fix: 'POLICY_BLOCKED', success: false, detail: policyResult.reason };
    }
  }

  let result = { fix: 'NONE', success: false, detail: '' };

  switch (cause) {

    case 'APPROVAL_REQUIRED':
      // Reset approval token to unlock UI
      window.__LAST_APPROVED_ACTION = null;
      if (window.__APPROVAL_CLEAR_TIMEOUT) {
        clearTimeout(window.__APPROVAL_CLEAR_TIMEOUT);
        window.__APPROVAL_CLEAR_TIMEOUT = null;
      }
      // Clear expired approvals
      window.__APPROVAL_QUEUE = (window.__APPROVAL_QUEUE || []).filter(item => {
        const expired = Date.now() - item.createdAt > 30000;
        if (expired && item.resolve) item.resolve(false);
        return !expired;
      });
      renderApprovalUI();
      result = { fix: 'RESET_APPROVAL_TOKEN', success: true, detail: 'Cleared stale approval tokens' };
      break;

    case 'API_ERROR':
      // Enter safe mode: disable executor temporarily, force cache usage
      window.__AI_EXECUTOR_ENABLED = false;

      // PHASE 26.5: SAFE MODE MONITOR
      if (typeof window.SAFE_MODE_MONITOR !== 'undefined' && window.SAFE_MODE_MONITOR.enterSafeMode) {
        window.SAFE_MODE_MONITOR.enterSafeMode('API_ERROR');
      }

      setTimeout(() => {
        window.__AI_EXECUTOR_ENABLED = true;
        console.log('[AUTO_FIX] Executor re-enabled after API_ERROR cool-down');
      }, 30000);
      result = { fix: 'ENTER_SAFE_MODE', success: true, detail: 'Executor disabled for 30s' };
      break;

    case 'TIMEOUT':
      // Enable safe mode: increase timeout tolerance, show offline indicator
      window.__TIMEOUT_SAFE_MODE = true;
      setTimeout(() => {
        window.__TIMEOUT_SAFE_MODE = false;
        console.log('[AUTO_FIX] Timeout safe mode cleared');
      }, 60000);
      result = { fix: 'TIMEOUT_SAFE_MODE', success: true, detail: 'Timeout safe mode enabled for 60s' };
      break;

    case 'RATE_LIMIT':
      // Clear idempotency locks
      if (window.__ACTION_EXEC_LOCK) {
        window.__ACTION_EXEC_LOCK.clear();
      }
      result = { fix: 'CLEAR_RATE_LIMITS', success: true, detail: 'Cleared all action locks' };
      break;

    case 'TRUST':
      // Reset trust flag
      window.__AI_TRUST_TOO_LOW = false;
      result = { fix: 'RESET_TRUST', success: true, detail: 'Trust flag reset' };
      break;

    case 'VALIDATION':
      // Log for manual review — validation errors need human inspection
      result = { fix: 'LOG_FOR_REVIEW', success: false, detail: 'Validation errors require manual review' };
      break;

    case 'HEALTHY':
      result = { fix: 'NO_ACTION', success: true, detail: 'System is healthy' };
      break;

    default:
      result = { fix: 'UNKNOWN_CAUSE', success: false, detail: 'No fix defined for: ' + cause };
  }

  // Learn from this fix
  window.FIX_LEARNING_ENGINE.learn({
    cause: cause,
    fix: result.fix,
    success: result.success
  });

  // PHASE 26.5: AUDIT LOG
  if (typeof window.AI_AUDIT_PUSH === 'function') {
    window.AI_AUDIT_PUSH({
      type: 'AUTO_FIX',
      cause: cause,
      fix: result.fix,
      success: result.success,
      detail: result.detail,
      ts: Date.now()
    });
  }

  console.log('[AUTO_FIX] Completed:', result);
  return result;
};

// STEP 3 — SELF HEAL LOOP
window.__SELF_HEAL_INTERVAL = null;
window.__SELF_HEAL_STATS = { runs: 0, fixesApplied: 0, lastRun: null };

window.START_SELF_HEAL = function() {
  if (window.__SELF_HEAL_INTERVAL) {
    console.log('[SELF_HEAL] Already running');
    return;
  }

  // PHASE 26.5: SYSTEM CONTROL GUARD
  if (!window.SYSTEM_CONTROL || !window.SYSTEM_CONTROL.selfHeal) {
    console.warn('[SELF_HEAL] BLOCKED by SYSTEM_CONTROL.selfHeal = false');
    return;
  }

  window.__SELF_HEAL_INTERVAL = setInterval(function() {
    window.__SELF_HEAL_STATS.runs++;
    window.__SELF_HEAL_STATS.lastRun = Date.now();

    const rc = window.AUTO_ROOT_CAUSE();
    if (!rc || rc.cause === 'HEALTHY') {
      return; // Nothing to fix
    }

    // Safety guard
    const safety = window.SELF_HEAL_SAFETY.check(rc.cause, rc.confidence);
    if (!safety.allowed) {
      console.warn('[SELF_HEAL] BLOCKED:', safety.reason, 'cause:', rc.cause, 'confidence:', rc.confidence);
      return;
    }

    console.log('[SELF_HEAL] Detected issue:', rc.cause, 'confidence:', rc.confidence, 'count:', rc.count);

    // Try fix
    window.AUTO_FIX(rc.cause).then(function(fixResult) {
      if (fixResult && fixResult.success) {
        window.__SELF_HEAL_STATS.fixesApplied++;
        console.log('[SELF_HEAL] Fix applied successfully:', fixResult.fix);
      } else {
        console.warn('[SELF_HEAL] Fix failed or no-op:', fixResult);
      }
    });

  }, 30000);
  console.log('[SELF_HEAL] Loop started (30s interval)');
};

window.STOP_SELF_HEAL = function() {
  if (window.__SELF_HEAL_INTERVAL) {
    clearInterval(window.__SELF_HEAL_INTERVAL);
    window.__SELF_HEAL_INTERVAL = null;
    console.log('[SELF_HEAL] Loop stopped');
  }
};

window.SELF_HEAL_STATUS = function() {
  return {
    running: !!window.__SELF_HEAL_INTERVAL,
    stats: window.__SELF_HEAL_STATS,
    learningDbSize: window.FIX_LEARNING_ENGINE ? window.FIX_LEARNING_ENGINE.db.length : 0
  };
};

// Auto-start self-heal after 10 seconds
setTimeout(function() {
  if (window.__APP_VERSION) {
    window.START_SELF_HEAL();
  }
}, 10000);
