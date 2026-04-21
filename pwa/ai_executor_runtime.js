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

// Main execution function
async function AI_EXECUTOR(decision) {
  if (!window.__AI_EXECUTOR_ENABLED) {
    return { error: 'EXECUTOR_DISABLED' };
  }

  // 1. PRE-CONDITION VALIDATION
  const preCheck = validatePreCondition(decision);
  if (!preCheck.valid) {
    console.error('PRE_CONDITION_FAILED:', preCheck.reason, decision);
    return { error: 'PRE_CONDITION_FAILED', reason: preCheck.reason };
  }

  const action = decision.action;

  // 2. TRUST CHECK
  if (!checkTrust()) {
    return { error: 'AI_TRUST_TOO_LOW' };
  }

  // 3. IDEMPOTENCY CHECK
  const idemCheck = checkIdempotency(action);
  if (!idemCheck.allowed) {
    return { error: 'IDEMPOTENCY_BLOCK', reason: idemCheck.reason, waitTime: idemCheck.waitTime };
  }

  // 4. REAL APPROVAL (SANDBOX)
  const map = window.__ACTION_MAP[action];
  if (map && map.type === 'write') {
    // สำหรับ write action — ต้องขอ approve ผ่าน approval_guard.js
    const approved = await AI_SANDBOX.propose(action, decision);
    if (!approved) {
      return { error: 'USER_DENIED_APPROVAL' };
    }
  }

  // 5. EXECUTION (ENFORCED THROUGH API_CONTROLLER -> GAS_EXECUTE)
  try {
    const result = await API_CONTROLLER.call(action, decision.payload);

    // 6. POST-CONDITION VALIDATION
    const postCheck = validatePostCondition(action, result);
    if (!postCheck.valid) {
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
    return {
      success: true,
      data: result.data,
      impactId: window.__EXECUTION_LOG.length - 1,
      executionTrace: window.__EXECUTION_LOG.slice(-1)
    };

  } catch (err) {
    console.error('EXECUTION_ERROR:', err);
    const failure = recordFailure(action);
    if (failure.disabled) {
      return { error: 'EXECUTION_ERROR', message: err.message, failureGuard: failure };
    }
    return { error: 'EXECUTION_ERROR', message: err.message };
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
console.log('AI_EXECUTOR v18.1 - SAFE EXECUTION LOADED (PHASE 20.5)');
