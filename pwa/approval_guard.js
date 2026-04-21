// ============================================================
// COMPHONE SUPER APP V5.5 — approval_guard.js
// PHASE 20.1: Production Approval Hardening
// Version: 5.6.1-PROD
// ============================================================
// หลักการ:
//   1. NEVER TRUST CLIENT — ทุก approval ต้องผ่าน Server validation
//   2. ZERO SILENT FAILURE — ทุก error ต้อง log + notify
//   3. AUDIT EVERY ACTION — บันทึกทุก approve/reject/timeout
//   4. ANTI-TAMPER — Token + Timestamp + Nonce validation
// ============================================================

'use strict';

// ============================================================
// 1. APPROVAL CONFIGURATION
// ============================================================
const APPROVAL_CONFIG = {
  // Cooldown ระหว่าง approve ครั้งซ้ำ (ป้องกัน double-click)
  cooldownMs: 3000,

  // Timeout รอ server response
  serverTimeoutMs: 15000,

  // ต้องยืนยันก่อน approve ถ้า impact = high
  requireConfirmHighImpact: true,

  // Impact mapping
  impactMap: {
    'deleteJob':        'high',
    'deleteData':       'high',
    'deleteUser':       'high',
    'transferStock':    'high',
    'createPO':         'medium',
    'updateJobStatus':  'medium',
    'markDone':         'low',
    'markWaiting':      'low',
    'approveBilling':   'high',
    'rejectBilling':    'medium',
    'cancelJob':        'high',
    'refund':           'high',
  }
};

// ============================================================
// 2. CLIENT-SIDE ROLE MAP (Fallback เท่านั้น — Server เป็นตัวตัดสิน)
// ============================================================
const APPROVAL_ROLE_MAP = {
  // High-risk actions
  'deleteData':       { minLevel: 4, roles: ['owner'] },
  'deleteJob':        { minLevel: 4, roles: ['owner'] },
  'deleteUser':       { minLevel: 4, roles: ['owner'] },
  'cancelJob':        { minLevel: 4, roles: ['owner'] },
  'refund':           { minLevel: 4, roles: ['owner'] },
  'approveBilling':   { minLevel: 4, roles: ['owner'] },
  'setupSystem':      { minLevel: 4, roles: ['owner'] },

  // Medium-risk actions
  'updateJobStatus':  { minLevel: 2, roles: ['owner','sales','technician'] },
  'createJob':        { minLevel: 2, roles: ['owner','sales'] },
  'createPO':         { minLevel: 3, roles: ['owner','accountant'] },
  'transferStock':    { minLevel: 3, roles: ['owner','accountant'] },
  'rejectBilling':    { minLevel: 3, roles: ['owner','accountant'] },

  // Low-risk actions
  'markDone':         { minLevel: 1, roles: ['owner','technician'] },
  'markWaiting':      { minLevel: 1, roles: ['owner','technician'] },
  'addAppointment':   { minLevel: 1, roles: ['owner','sales','technician'] },
  'sendLine':         { minLevel: 2, roles: ['owner','sales'] },
  'nudgeTech':        { minLevel: 2, roles: ['owner','sales'] },

  // Read-only
  'getDashboardBundle': { minLevel: 1, roles: ['owner','accountant','sales','technician'] },
  'viewRevenue':      { minLevel: 3, roles: ['owner','accountant'] },
};

// ============================================================
// 3. APPROVAL STATE (Runtime)
// ============================================================
const ApprovalState = {
  lastActionAt: 0,
  pending: new Map(), // nonce -> { action, id, timestamp }
};

// ============================================================
// 4. CORE: canApprove() — Client-side pre-check (Defense in Depth)
// ============================================================
/**
 * ตรวจสอบสิทธิ์เบื้องต้นฝั่ง Client (ไม่ใช่ตัวตัดสินสุดท้าย)
 * @param {string} action - ชื่อ action
 * @return {object} { allowed: boolean, reason: string, impact: string }
 */
function canApprove(action) {
  if (!action) return { allowed: false, reason: 'ไม่ระบุ action', impact: 'unknown' };

  // ดึง user จาก APP state
  const user = (typeof APP !== 'undefined' && APP.user) ? APP.user : null;
  if (!user) return { allowed: false, reason: 'ยังไม่ได้เข้าสู่ระบบ', impact: 'unknown' };

  // Cooldown check
  const now = Date.now();
  const elapsed = now - ApprovalState.lastActionAt;
  if (elapsed < APPROVAL_CONFIG.cooldownMs) {
    return {
      allowed: false,
      reason: `กรุณารอ ${Math.ceil((APPROVAL_CONFIG.cooldownMs - elapsed)/1000)} วินาที`,
      impact: 'unknown'
    };
  }

  // Role + Level check
  const rule = APPROVAL_ROLE_MAP[action];
  if (!rule) {
    // ไม่มีใน map = ทุกคนทำได้ (แต่ server จะตรวจอีกรอบ)
    return { allowed: true, reason: 'OK (default allow)', impact: 'low' };
  }

  const ROLE_LEVELS = { owner: 4, accountant: 3, sales: 2, technician: 1 };
  const rawRole = String(user.role || user.gasRole || '').toLowerCase();
  const roleKey = ROLE_ALIASES[rawRole] || rawRole;
  const userLevel = ROLE_LEVELS[roleKey] || 1;

  if (userLevel < rule.minLevel) {
    return {
      allowed: false,
      reason: `ต้องการระดับ ${rule.minLevel} (คุณอยู่ระดับ ${userLevel})`,
      impact: APPROVAL_CONFIG.impactMap[action] || 'unknown'
    };
  }

  if (!rule.roles.includes(roleKey)) {
    return {
      allowed: false,
      reason: `Role '${roleKey}' ไม่มีสิทธิ์ทำ '${action}'`,
      impact: APPROVAL_CONFIG.impactMap[action] || 'unknown'
    };
  }

  return {
    allowed: true,
    reason: 'OK',
    impact: APPROVAL_CONFIG.impactMap[action] || 'low'
  };
}

// ============================================================
// 5. CORE: approve() — Production-grade with Server Validation
// ============================================================
/**
 * ทำการ approve action พร้อม server-side validation + audit logging
 * @param {string} id - รหัสรายการ (เช่น jobId, userId)
 * @param {string} action - ชื่อ action
 * @param {object} options - { onSuccess, onError, confirmHighImpact, payload }
 */
function approve(id, action, options) {
  options = options || {};
  const {
    onSuccess,
    onError,
    confirmHighImpact = true,
    payload = {}
  } = options;

  // --- STEP 1: Client-side pre-check ---
  const preCheck = canApprove(action);
  if (!preCheck.allowed) {
    showToast(`⛔ ${preCheck.reason}`, 'error');
    _logApprovalAttempt(action, id, false, preCheck.reason);
    if (typeof onError === 'function') onError({ stage: 'preCheck', reason: preCheck.reason });
    return Promise.reject(preCheck.reason);
  }

  // --- STEP 2: High-impact confirmation ---
  const impact = preCheck.impact;
  if (confirmHighImpact && APPROVAL_CONFIG.requireConfirmHighImpact && impact === 'high') {
    const confirmed = confirm(
      `⚠️ การดำเนินการสูงความเสี่ยง\n\n` +
      `Action: ${action}\n` +
      `รายการ: ${id}\n\n` +
      `ต้องการดำเนินการต่อหรือไม่?`
    );
    if (!confirmed) {
      _logApprovalAttempt(action, id, false, 'User cancelled confirmation');
      return Promise.reject('User cancelled');
    }
  }

  // --- STEP 3: Generate Nonce (Anti-replay) ---
  const nonce = _generateNonce();
  const timestamp = Date.now();
  ApprovalState.pending.set(nonce, { action, id, timestamp });
  ApprovalState.lastActionAt = timestamp;

  // --- STEP 4: Server Validation (SOURCE OF TRUTH) ---
  showToast('⏳ กำลังตรวจสอบสิทธิ์...', 'info');

  return new Promise((resolve, reject) => {
    const user = (typeof APP !== 'undefined' && APP.user) ? APP.user : {};
    const requestPayload = {
      token: user.authToken || '',
      username: user.username || '',
      action: action,
      targetId: id,
      nonce: nonce,
      timestamp: timestamp,
      clientRole: user.role || '',
      payload: payload,
      userAgent: navigator.userAgent,
      screenSize: `${window.innerWidth}x${window.innerHeight}`
    };

    // Timeout handler
    const timeoutId = setTimeout(() => {
      ApprovalState.pending.delete(nonce);
      showToast('⛔ เซิร์ฟเวอร์ไม่ตอบสนอง กรุณาลองใหม่', 'error');
      _logApprovalAttempt(action, id, false, 'Server timeout');
      if (typeof onError === 'function') onError({ stage: 'timeout', reason: 'Server timeout' });
      reject('Server timeout');
    }, APPROVAL_CONFIG.serverTimeoutMs);

    google.script.run
      .withSuccessHandler((result) => {
        clearTimeout(timeoutId);
        ApprovalState.pending.delete(nonce);

        if (result && result.allowed) {
          showToast(`✅ ${result.message || 'อนุมัติสำเร็จ'}`, 'success');
          _logApprovalAttempt(action, id, true, 'Server approved', result);
          if (typeof onSuccess === 'function') onSuccess(result);
          resolve(result);
        } else {
          const reason = result ? (result.reason || 'ไม่มีสิทธิ์ (Server)') : 'ไม่มีสิทธิ์ (Server)';
          showToast(`⛔ ${reason}`, 'error');
          _logApprovalAttempt(action, id, false, reason, result);
          if (typeof onError === 'function') onError({ stage: 'server', reason: reason, serverResult: result });
          reject(reason);
        }
      })
      .withFailureHandler((err) => {
        clearTimeout(timeoutId);
        ApprovalState.pending.delete(nonce);

        const errorMsg = (err && err.message) ? err.message : String(err);
        showToast(`⛔ เกิดข้อผิดพลาด: ${errorMsg}`, 'error');
        _logApprovalAttempt(action, id, false, `Server error: ${errorMsg}`);
        if (typeof onError === 'function') onError({ stage: 'serverError', reason: errorMsg });
        reject(errorMsg);
      })
      .validateApproval(requestPayload);
  });
}

// ============================================================
// 6. CORE: batchApprove() — อนุมัติหลายรายการพร้อมกัน
// ============================================================
/**
 * Batch approval with server validation
 * @param {Array} items - [{ id, action, payload }]
 * @param {object} options
 */
function batchApprove(items, options) {
  options = options || {};
  if (!Array.isArray(items) || items.length === 0) {
    showToast('ไม่มีรายการที่ต้องอนุมัติ', 'warning');
    return Promise.reject('Empty items');
  }

  const confirmed = confirm(
    `ยืนยันการอนุมัติ ${items.length} รายการ?\n\n` +
    items.slice(0, 5).map(i => `- ${i.action}: ${i.id}`).join('\n') +
    (items.length > 5 ? `\n...และอีก ${items.length - 5} รายการ` : '')
  );
  if (!confirmed) return Promise.reject('User cancelled');

  showToast(`⏳ กำลังอนุมัติ ${items.length} รายการ...`, 'info');

  return new Promise((resolve, reject) => {
    const user = (typeof APP !== 'undefined' && APP.user) ? APP.user : {};
    const nonce = _generateNonce();
    const timestamp = Date.now();

    google.script.run
      .withSuccessHandler((result) => {
        if (result && result.success) {
          showToast(`✅ สำเร็จ ${result.approved || 0}/${items.length} รายการ`, 'success');
          if (typeof options.onSuccess === 'function') options.onSuccess(result);
          resolve(result);
        } else {
          showToast(`⛔ ไม่สำเร็จ: ${result ? result.error : 'Unknown error'}`, 'error');
          if (typeof options.onError === 'function') options.onError(result);
          reject(result);
        }
      })
      .withFailureHandler((err) => {
        showToast(`⛔ Server error: ${err}`, 'error');
        if (typeof options.onError === 'function') options.onError(err);
        reject(err);
      })
      .batchValidateApproval({
        token: user.authToken || '',
        username: user.username || '',
        items: items,
        nonce: nonce,
        timestamp: timestamp,
        clientRole: user.role || ''
      });
  });
}

// ============================================================
// 7. UTILITY: Button Wrapper — ห่อปุ่มให้มี guard อัตโนมัติ
// ============================================================
/**
 * สร้างปุ่มที่มี approval guard ในตัว
 * @param {string} text - ข้อความปุ่ม
 * @param {string} action - action name
 * @param {string} id - target id
 * @param {Function} onAllowed - ถ้าอนุมัติแล้วจะเรียก (รับ result จาก server)
 * @param {object} opts - { className, style, confirmHighImpact, payload, onError }
 */
function createGuardedButton(text, action, id, onAllowed, opts) {
  opts = opts || {};
  const btn = document.createElement('button');
  btn.className = opts.className || 'btn btn-primary btn-sm';
  if (opts.style) Object.assign(btn.style, opts.style);
  btn.innerHTML = text;

  // Pre-check UI (disable ถ้าไม่มีสิทธิ์)
  const check = canApprove(action);
  if (!check.allowed) {
    btn.disabled = true;
    btn.title = check.reason;
    btn.classList.add('opacity-50', 'cursor-not-allowed');
    btn.onclick = () => showToast(`⛔ ${check.reason}`, 'error');
    return btn;
  }

  btn.onclick = () => {
    approve(id, action, {
      confirmHighImpact: opts.confirmHighImpact,
      payload: opts.payload,
      onSuccess: (result) => {
        if (typeof onAllowed === 'function') onAllowed(result);
      },
      onError: opts.onError
    }).catch(() => {}); // handled internally
  };

  return btn;
}

// ============================================================
// 8. INTERNAL: Audit Logging (Client-side buffer)
// ============================================================
function _logApprovalAttempt(action, id, success, reason, serverResult) {
  try {
    const entry = {
      t: Date.now(),
      action: action,
      id: id,
      success: success,
      reason: reason,
      user: (typeof APP !== 'undefined' && APP.user) ? APP.user.username : 'anonymous',
      role: (typeof APP !== 'undefined' && APP.user) ? APP.user.role : 'none',
      url: window.location.href
    };

    // เก็บลง localStorage (ส่งต่อไปยัง server ตอน sync)
    const key = 'approval_audit_log';
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    existing.push(entry);
    // เก็บสูงสุด 500 entries
    while (existing.length > 500) existing.shift();
    localStorage.setItem(key, JSON.stringify(existing));

    // ถ้าเป็น high-impact หรือ failed สำคัญ → ส่ง log ทันที
    if (!success || (serverResult && serverResult.impact === 'high')) {
      _sendAuditLogImmediate(entry);
    }
  } catch (e) {
    // Silent ignore for logging failure (don't break user flow)
    console.error('Audit log error:', e);
  }
}

function _sendAuditLogImmediate(entry) {
  try {
    google.script.run
      .withSuccessHandler(() => {})
      .withFailureHandler(() => {})
      .logApprovalAudit(entry);
  } catch (e) {}
}

// ============================================================
// 9. INTERNAL: Nonce Generator
// ============================================================
function _generateNonce() {
  const arr = new Uint8Array(12);
  if (window.crypto && window.crypto.getRandomValues) {
    window.crypto.getRandomValues(arr);
  } else {
    for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('') + '-' + Date.now();
}

// ============================================================
// 10. SYNC: ส่ง Audit Log ที่ค้างอยู่ขึ้น Server
// ============================================================
function syncApprovalAuditLogs() {
  try {
    const key = 'approval_audit_log';
    const logs = JSON.parse(localStorage.getItem(key) || '[]');
    if (logs.length === 0) return;

    google.script.run
      .withSuccessHandler(() => {
        localStorage.removeItem(key);
      })
      .withFailureHandler(() => {
        // Keep for next sync
      })
      .batchLogApprovalAudit(logs);
  } catch (e) {
    console.error('Sync audit log error:', e);
  }
}

// ============================================================
// 11. EXPORT / BACKWARD COMPATIBILITY
// ============================================================
// ให้ window.__USER_ROLE อ่านจาก APP state (read-only getter)
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

// เก็บ reference เดิม (ถ้ามี)
if (typeof window.canApproveLegacy === 'undefined' && typeof window.canApprove !== 'undefined') {
  window.canApproveLegacy = window.canApprove;
}
window.canApprove = canApprove;
