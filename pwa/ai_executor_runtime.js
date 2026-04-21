// ===== AI_EXECUTOR RUNTIME v18 - SAFE EXECUTION LAYER =====
'use strict';

// Safety flags
window.__AI_EXECUTOR_ENABLED = true;
window.__AI_TRUST_TOO_LOW = false;
window.__ACTION_EXEC_LOCK = new Map(); // actionName -> expiry timestamp
window.__EXECUTION_LOG = []; // For debugging
window.__USER_ROLE = localStorage.getItem('comphone_user_role') || 'admin'; // admin / staff / viewer

// Trust system (simplified - would integrate with real trust scoring)
function checkTrust() {
  // In real implementation, this would check actual trust score
  return !window.__AI_TRUST_TOO_LOW;
}

// Action registry (would be populated from backend/config)
const __ACTION_REGISTRY = new Set([
  'getStockList',
  'updateJobStatus', 
  'posCheckout',
  'getJobList',
  'createJob',
  'updateStock',
  'getPOSItems',
  'processPayment'
]);

// Data schema (defined in dashboard_pc.html)
window.__DATA_SCHEMA = window.__DATA_SCHEMA || {};

// Action map (defined in dashboard_pc.html)
window.__ACTION_MAP = window.__ACTION_MAP || {};

// Sandbox for proposals (would integrate with real approval system)
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
// Approval queue and related functionswindow.__APPROVAL_QUEUE = [];window.__APPROVAL_LOG = [];const APPROVAL_TIMEOUT = 30000; // 30 secfunction canApprove(action) {  const roleMap = {    deleteData: 'admin',    updateJobStatus: 'staff',    getDashboardBundle: 'viewer'  };  return roleMap[action] === window.__USER_ROLE;}function approve(id) {  const item = window.__APPROVAL_QUEUE.find(x => x.id === id);  if (!canApprove(item.action)) {    alert('NO_PERMISSION');    return;  }  item.resolve(true);  logApproval(item, true);  removeApproval(id);}function reject(id) {  const item = window.__APPROVAL_QUEUE.find(x => x.id === id);  item.resolve(false);  logApproval(item, false);  removeApproval(id);}function removeApproval(id) {  window.__APPROVAL_QUEUE = window.__APPROVAL_QUEUE.filter(x => x.id !== id);  renderApprovalUI();}function logApproval(item, approved) {  window.__APPROVAL_LOG.push({    action: item.action,    decision: item.decision,    approved,    role: window.__USER_ROLE,    ts: Date.now()  });}function getPriority(action) {  const map = {    deleteData: 0,    posCheckout: 1,    updateJobStatus: 2,    getDashboardBundle: 3  };  return map[action] ?? 99;}function renderApprovalUI() {  const queue = window.__APPROVAL_QUEUE    .sort((a, b) => getPriority(a.action) - getPriority(b.action));  const html = queue.map(item => `    <div class="approval-item">      <b>${item.action}</b>      <button onclick="approve('${item.id}')">อนุมัติ</button>      <button onclick="reject('${item.id}')">ปฏิเสธ</button>    </div>  `).join('');  document.getElementById('approval-panel').innerHTML = html;}// Auto cleanup expired approvalssetInterval(() => {  const now = Date.now();  window.__APPROVAL_QUEUE = window.__APPROVAL_QUEUE.filter(item => {    const expired = now - item.createdAt > APPROVAL_TIMEOUT;    if (expired) {      item.resolve(false);    }    return !expired;  });  renderApprovalUI();}, 5000);

// API Controller (real implementation for GAS)
const API_CONTROLLER = {
  call: async function(apiName, payload) {
    // Get GAS URL from localStorage (set during login/PWA setup)
    const GAS_URL = localStorage.getItem('comphone_gas_url');
    
    if (!GAS_URL) {
      throw new Error('GAS_URL_NOT_CONFIGURED');
    }
    
    // Make real API call to Google Apps Script
    const res = await fetch(GAS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: apiName,
        payload
      })
    });

    const data = await res.json();

    if (!data.success) {
      throw new Error(data.error || 'API_FAILED');
    }

    return data;
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
    // Simplified - in reality would calculate business impact
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
  
  // Check if action is registered
  if (!__ACTION_REGISTRY.has(action)) {
    return { valid: false, reason: 'UNREGISTERED_ACTION' };
  }
  
  // Check if action has mapping
  const map = window.__ACTION_MAP[action];
  if (!map) {
    return { valid: false, reason: 'NO_ACTION_MAPPING' };
  }
  
  // Check payload based on action type
  if (!decision.payload || typeof decision.payload !== 'object') {
    return { valid: false, reason: 'MISSING_PAYLOAD' };
  }
  
  // Additional pre-condition checks could go here
  // For example: check if user has permission, validate data format, etc.
  
  return { valid: true };
}

function validatePostCondition(action, result) {
  if (!result || typeof result !== 'object') {
    return { valid: false, reason: 'INVALID_RESULT_FORMAT' };
  }
  
  // Check if action succeeded
  if (result.success === false) {
    return { valid: false, reason: 'ACTION_FAILED', detail: result.error };
  }
  
  // Action-specific post conditions could go here
  // For example: verify data was actually updated in sheet, etc.
  
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
  const approved = await AI_SANDBOX.propose(action, decision);
  if (!approved) {
    return { error: 'USER_DENIED_APPROVAL' };
  }
  
  // 5. EXECUTION (ENFORCED THROUGH API_CONTROLLER)
  try {
    // GET ACTION MAP
    const map = window.__ACTION_MAP[action];
    if (!map) {
      return { error: 'NO_ACTION_MAPPING' };
    }
    
    // EXECUTE VIA API_CONTROLLER ONLY - NO DIRECT DB ACCESS
    const result = await API_CONTROLLER.call(map.api, decision.payload);
    
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
    if (map.type === 'write' && window.__UI_REFRESH_MAP && window.__UI_REFRESH_MAP[action]) {
      try {
        await window.__UI_REFRESH_MAP[action]();
      } catch (uiErr) {
        console.warn('UI_REFRESH_ERROR:', uiErr);
        // Don't fail the whole action for UI refresh issues
      }
    }
    
    // 8. IMPACT TRACKING
    // In real implementation, we'd capture before state
    const impact = IMPACT_TRACKER.track(action, { /* before */ }, result.data || {});
    
    // 9. RETURN SUCCESS
    return { 
      success: true, 
      data: result.data,
      impactId: window.__EXECUTION_LOG.length - 1,
      executionTrace: window.__EXECUTION_LOG.slice(-1) // Last entry
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

// Debug/exploration functions
window.AI_EXECUTOR = {
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
      actionRegistry: Array.from(__ACTION_REGISTRY),
      actionMap: window.__ACTION_MAP,
      dataSchema: window.__DATA_SCHEMA
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
  setTrustLow: function(flag) { window.__AI_TRUST_TOO_LOW = !!flag; }
};

// Auto-initialize
console.log('AI_EXECUTOR v18 - SAFE EXECUTION LOADED');