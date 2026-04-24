// ============================================================
// COMPHONE SUPER APP V5.5
// Approval.gs — Server-side Approval Validation (SOURCE OF TRUTH)
// PHASE 20.1 + 20.3: Production Approval Hardening + Trusted Execution Enforcement
// Version: 5.6.3-PROD
// ============================================================
// หลักการ:
//   1. SERVER IS THE SOURCE OF TRUTH — ไม่เຊื่อ client แม้วแต่ role/token
//   2. Verify session ทุกครั้ง — ป้องกัน token reuse / replay
//   3. Validate timestamp ภายใน 5 นาที — ป้องกัน replay attack
//   4. Log ทุก approval ไม่ว่า success หรือ fail
//   5. ส่ง LINE notify ถ้า high-impact + fail
// ============================================================

'use strict';

// ============================================================
// SERVER-SIDE PERMISSION MAP (Ground Truth)
// ต้องตรงกันกับ APPROVAL_ROLE_MAP ใน approval_guard.js
// ============================================================
var SERVER_APPROVAL_RULES = {
  // High-risk (level 4, owner only)
  'deleteData':       { minLevel: 4, roles: ['OWNER'], impact: 'high', audit: true },
  'deleteJob':        { minLevel: 4, roles: ['OWNER'], impact: 'high', audit: true },
  'deleteUser':       { minLevel: 4, roles: ['OWNER'], impact: 'high', audit: true },
  'cancelJob':        { minLevel: 4, roles: ['OWNER'], impact: 'high', audit: true },
  'refund':           { minLevel: 4, roles: ['OWNER'], impact: 'high', audit: true },
  'approveBilling':   { minLevel: 4, roles: ['OWNER'], impact: 'high', audit: true },
  'setupSystem':      { minLevel: 4, roles: ['OWNER'], impact: 'high', audit: true },

  // Medium-risk (level 2-3)
  'updateJobStatus':  { minLevel: 2, roles: ['OWNER','SALES','TECHNICIAN'], impact: 'medium', audit: true },
  'createJob':        { minLevel: 2, roles: ['OWNER','SALES'], impact: 'medium', audit: true },
  'createPO':         { minLevel: 3, roles: ['OWNER','ACCOUNTANT'], impact: 'medium', audit: true },
  'transferStock':    { minLevel: 3, roles: ['OWNER','ACCOUNTANT'], impact: 'medium', audit: true },
  'rejectBilling':    { minLevel: 3, roles: ['OWNER','ACCOUNTANT'], impact: 'medium', audit: true },

  // Low-risk (level 1+)
  'markDone':         { minLevel: 1, roles: ['OWNER','TECHNICIAN'], impact: 'low', audit: true },
  'markWaiting':      { minLevel: 1, roles: ['OWNER','TECHNICIAN'], impact: 'low', audit: true },
  'addAppointment':   { minLevel: 1, roles: ['OWNER','SALES','TECHNICIAN'], impact: 'low', audit: false },
  'sendLine':         { minLevel: 2, roles: ['OWNER','SALES'], impact: 'low', audit: false },
  'nudgeTech':        { minLevel: 2, roles: ['OWNER','SALES'], impact: 'low', audit: false },

  // Read-only (no approval needed, but log)
  'getDashboardBundle': { minLevel: 1, roles: ['OWNER','ACCOUNTANT','SALES','TECHNICIAN'], impact: 'low', audit: false },
  'viewRevenue':      { minLevel: 3, roles: ['OWNER','ACCOUNTANT'], impact: 'low', audit: false },
};

var APPROVAL_MAX_TIMESTAMP_DRIFT_MS = 5 * 60 * 1000; // 5 นาที
var APPROVAL_USED_NONCE_PROP = 'USED_NONCES';
var APPROVAL_NONCE_MAX_AGE_MS = 10 * 60 * 1000; // 10 นาที

// ============================================================
// PHASE 20.3: SERVER-SIDE TRUSTED ACTIONS (Ground Truth)
// ต้องตรงกันกับ __TRUSTED_ACTIONS ใน execution_lock.js
// ============================================================
var SERVER_TRUSTED_ACTIONS = {
  getDashboardBundle: true,
  getJobList: true,
  getStockList: true,
  getPOSItems: true,
  viewRevenue: true,
  updateJobStatus: true,
  createJob: true,
  deleteJob: true,
  deleteData: true,
  deleteUser: true,
  cancelJob: true,
  refund: true,
  approveBilling: true,
  rejectBilling: true,
  transferStock: true,
  createPO: true,
  markDone: true,
  markWaiting: true,
  addAppointment: true,
  sendLine: true,
  nudgeTech: true,
  posCheckout: true,
  updateStock: true,
  processPayment: true,
  setupSystem: true,
  logApprovalAudit: true,
  batchLogApprovalAudit: true,
  batchValidateApproval: true,
  validateApproval: true,
  logSecurityViolations: true,
};

// ============================================================
// CORE: validateApproval() — ตรวจสอบสิทธิ์การอนุมัติ (Single)
// ============================================================
/**
 * @param {Object} request - { token, username, action, targetId, nonce, timestamp, clientRole, payload, userAgent, screenSize }
 * @return {Object} { allowed: boolean, message, reason, impact }
 */
function validateApproval(request) {
  try {
    request = request || {};
    var action    = String(request.action || '').trim();
    var targetId  = String(request.targetId || request.target_id || '').trim();
    var nonce     = String(request.nonce || '').trim();
    var timestamp = Number(request.timestamp || 0);
    var token     = String(request.token || '').trim();
    var username  = String(request.username || '').trim().toLowerCase();
    var clientRole= String(request.clientRole || request.client_role || '').toUpperCase();

    // --- STEP 1: Validate request shape ---
    if (!action)    return _rejectApproval('MISSING_ACTION', action, targetId, username, 'No action specified');
    if (!token)     return _rejectApproval('MISSING_TOKEN', action, targetId, username, 'No token provided');
    if (!nonce)     return _rejectApproval('MISSING_NONCE', action, targetId, username, 'No nonce provided');
    if (!timestamp) return _rejectApproval('MISSING_TIMESTAMP', action, targetId, username, 'No timestamp provided');

    // --- STEP 1b: PHASE 20.3 Trusted Action Check ---
    if (!SERVER_TRUSTED_ACTIONS[action]) {
      return _rejectApproval('UNTRUSTED_ACTION', action, targetId, username,
        'Action "' + action + '" is not in the server trusted actions list');
    }

    // --- STEP 2: Verify session token (SOURCE OF TRUTH) ---
    var sessionCheck = verifySession(token);
    if (!sessionCheck.valid) {
      return _rejectApproval('INVALID_TOKEN', action, targetId, username,
        'Session invalid: ' + (sessionCheck.error || 'unknown'));
    }
    var session = sessionCheck.session;

    // ป้องกัน username mismatch (ป้องการใช้ token คนอื่น)
    if (session.username !== username) {
      return _rejectApproval('USERNAME_MISMATCH', action, targetId, username,
        'Token belongs to ' + session.username + ' but request claims ' + username);
    }

    // --- STEP 3: Anti-replay: nonce check ---
    var nonceCheck = _checkAndStoreNonce_(nonce, timestamp);
    if (!nonceCheck.ok) {
      return _rejectApproval('REPLAY_DETECTED', action, targetId, username, nonceCheck.reason);
    }

    // --- STEP 4: Timestamp drift check ---
    var now = Date.now();
    var drift = Math.abs(now - timestamp);
    if (drift > APPROVAL_MAX_TIMESTAMP_DRIFT_MS) {
      return _rejectApproval('TIMESTAMP_DRIFT', action, targetId, username,
        'Timestamp drift ' + drift + 'ms exceeds limit');
    }

    // --- STEP 5: Role validation (GROUND TRUTH from session) ---
    var serverRole = String(session.role || 'TECHNICIAN').toUpperCase();
    var roleInfo = AUTH_ROLES[serverRole] || AUTH_ROLES.TECHNICIAN;
    var userLevel = roleInfo.level || 1;

    // ห้ามการแก้ง clientRole ของจริง → ส่งแจ้งง warning (แต่ไม่ block ถ้า serverRole ผ่าน)
    if (clientRole && clientRole !== serverRole) {
      try {
        writeAuditLog('APPROVAL_TAMPER', username,
          'clientRole=' + clientRole + ' but serverRole=' + serverRole,
          { role: serverRole, result: 'warning' });
      } catch(e) {}
    }

    var rule = SERVER_APPROVAL_RULES[action];
    if (!rule) {
      // ไม่มีใน map = อนุมัติได้ (default allow) แต่ log ไว้
      _writeApprovalAudit(action, targetId, username, serverRole, true, 'No rule defined (default allow)');
      return { allowed: true, message: 'Approved (no rule)', impact: 'low' };
    }

    // Level check
    if (userLevel < rule.minLevel) {
      return _rejectApproval('INSUFFICIENT_LEVEL', action, targetId, username,
        'Level ' + userLevel + ' < required ' + rule.minLevel);
    }

    // Role check
    if (rule.roles.indexOf(serverRole) === -1) {
      return _rejectApproval('INSUFFICIENT_ROLE', action, targetId, username,
        'Role ' + serverRole + ' not in ' + rule.roles.join(','));
    }

    // --- STEP 6: Success — Log and return ---
    _writeApprovalAudit(action, targetId, username, serverRole, true, 'Server approved');

    // High-impact → ส่ง LINE notify ถ้ามีการตั้งค่า
    if (rule.impact === 'high') {
      try {
        var notifyMsg = '✅ [APPROVAL] ' + action + '\nUser: ' + username + '\nTarget: ' + targetId + '\nTime: ' + getThaiTimestamp();
        sendLineNotify({ message: notifyMsg, room: 'OWNER' });
      } catch(e) {}
    }

    return {
      allowed: true,
      message: 'Approved',
      impact: rule.impact,
      serverRole: serverRole,
      level: userLevel
    };

  } catch (e) {
    // ห้าม unexpected error → ปลอดภัย + log
    try {
      writeAuditLog('APPROVAL_EXCEPTION', request.username || 'unknown',
        e.message, { result: 'error' });
    } catch(err) {}
    return { allowed: false, reason: 'Server error: ' + e.message, impact: 'unknown' };
  }
}

// ============================================================
// CORE: batchValidateApproval() — ตรวจหลายรายการ
// ============================================================
/**
 * @param {Object} request - { token, username, items: [{id, action, payload}], nonce, timestamp }
 * @return {Object} { success, approved, rejected, results: [{id, allowed, reason}] }
 */
function batchValidateApproval(request) {
  try {
    request = request || {};
    var token    = String(request.token || '').trim();
    var username = String(request.username || '').trim().toLowerCase();
    var items    = request.items || [];

    if (!token) return { success: false, error: 'Missing token' };
    if (!Array.isArray(items) || items.length === 0) return { success: false, error: 'No items' };

    var sessionCheck = verifySession(token);
    if (!sessionCheck.valid) return { success: false, error: 'Invalid session' };
    var session = sessionCheck.session;

    if (session.username !== username) {
      return { success: false, error: 'Username mismatch' };
    }

    var results = [];
    var approvedCount = 0;
    var rejectedCount = 0;

    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var res = validateApproval({
        token: token,
        username: username,
        action: String(item.action || ''),
        targetId: String(item.id || ''),
        nonce: String(request.nonce || '') + '-' + i,
        timestamp: Number(request.timestamp || Date.now()),
        clientRole: request.clientRole || '',
        payload: item.payload || {}
      });

      results.push({
        id: String(item.id || ''),
        action: String(item.action || ''),
        allowed: res.allowed,
        reason: res.reason || res.message || ''
      });

      if (res.allowed) approvedCount++; else rejectedCount++;
    }

    _writeApprovalAudit('BATCH_APPROVAL', approvedCount + '/' + items.length, username,
      session.role, true, 'Batch complete A=' + approvedCount + ' R=' + rejectedCount);

    return {
      success: true,
      approved: approvedCount,
      rejected: rejectedCount,
      results: results
    };

  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ============================================================
// AUDIT: logApprovalAudit() + batchLogApprovalAudit()
// ============================================================
function logApprovalAudit(entry) {
  try {
    entry = entry || {};
    _writeApprovalAudit(
      entry.action || 'UNKNOWN',
      entry.id || '',
      entry.user || 'anonymous',
      entry.role || '',
      entry.success,
      entry.reason || ''
    );
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function batchLogApprovalAudit(entries) {
  try {
    if (!Array.isArray(entries)) return { success: false, error: 'Not an array' };
    var count = 0;
    for (var i = 0; i < entries.length; i++) {
      try {
        var e = entries[i];
        _writeApprovalAudit(
          e.action || 'UNKNOWN',
          e.id || '',
          e.user || 'anonymous',
          e.role || '',
          e.success,
          e.reason || ''
        );
        count++;
      } catch(err) {}
    }
    return { success: true, logged: count };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ============================================================
// INTERNAL: Reject helper
// ============================================================
function _rejectApproval(code, action, targetId, username, reason) {
  try {
    _writeApprovalAudit(action, targetId, username || 'unknown', '', false, code + ': ' + reason);
  } catch(e) {}

  // ส่ง LINE แจ้งงถ้า reject ที่เกี่ยวข้อง
  try {
    var msg = '🚨 [APPROVAL REJECTED] ' + code + '\nAction: ' + action + '\nUser: ' + username + '\nReason: ' + reason + '\nTime: ' + getThaiTimestamp();
    sendLineNotify({ message: msg, room: 'OWNER' });
  } catch(e) {}

  return { allowed: false, code: code, reason: reason, impact: 'high' };
}

// ============================================================
// INTERNAL: Write to DB_AUDIT
// ============================================================
function _writeApprovalAudit(action, targetId, username, role, success, detail) {
  try {
    writeAuditLog('APPROVAL_' + (success ? 'OK' : 'FAIL'), username, detail, {
      role: role,
      job_id: targetId,
      result: success ? 'ok' : 'rejected'
    });
  } catch (e) {
    Logger.log('_writeApprovalAudit ERROR: ' + e.message);
  }
}

// ============================================================
// INTERNAL: Nonce management (Anti-replay)
// ============================================================
function _checkAndStoreNonce_(nonce, timestamp) {
  try {
    var now = Date.now();
    var nonceAge = now - Number(timestamp || 0);
    if (nonceAge > APPROVAL_NONCE_MAX_AGE_MS) {
      return { ok: false, reason: 'Nonce too old' };
    }

    var props = PropertiesService.getScriptProperties();
    var raw = props.getProperty(APPROVAL_USED_NONCE_PROP);
    var used = raw ? JSON.parse(raw) : {};

    // Cleanup old nonces
    var cleaned = {};
    for (var key in used) {
      if (used.hasOwnProperty(key)) {
        if (now - used[key] < APPROVAL_NONCE_MAX_AGE_MS) {
          cleaned[key] = used[key];
        }
      }
    }

    if (cleaned[nonce]) {
      return { ok: false, reason: 'Nonce already used' };
    }

    cleaned[nonce] = now;
    props.setProperty(APPROVAL_USED_NONCE_PROP, JSON.stringify(cleaned));
    return { ok: true };

  } catch (e) {
    // หาก nonce system พัง → อนุมัติต่อ (ไม่ปลอดภัย user flow)
    Logger.log('_checkAndStoreNonce_ ERROR: ' + e.message);
    return { ok: true };
  }
}

// ============================================================
// INTERNAL: Helper
// ============================================================
// _findColIdx_ consolidated to Utils.gs (PHMP v1 dedup)
