// ============================================================
// COMPHONE SUPER APP V5.5 — execution_lock.js
// PHASE 20.2: GLOBAL EXECUTION LOCK (CRITICAL)
// Version: 5.6.2-PROD
// ============================================================
// หลักการ:
//   1. ล็อก google.script.run ทุก property → โยน DIRECT_GAS_CALL_BLOCKED
//   2. สร้าง GAS_EXECUTE() — เป็นช่องทางเดียวที่ใช้ original GAS run ในตัว
//   3. สร้าง AI_EXECUTOR.execute() — entry point ที่ถูกต้องใช้
//   4. จับบีปา๊สล้องทุกครั้ง → __SECURITY_VIOLATION[]
//   5. ห้ามการเข้าถึง → showToast + log
// ============================================================

(function() {
  'use strict';

  const LOCK_VERSION = '5.6.2-PROD';
  const LOCK_MARKER = '__EXECUTION_LOCK_INSTALLED';

  // ===== 1. PREVENT DOUBLE-LOCK =====
  if (window[LOCK_MARKER]) {
    console.log('[EXECUTION_LOCK] Already installed v' + window.__EXECUTION_LOCK_VERSION);
    return;
  }
  window[LOCK_MARKER] = true;
  window.__EXECUTION_LOCK_VERSION = LOCK_VERSION;

  // ===== 2. SECURITY VIOLATION LOG =====
  window.__SECURITY_VIOLATION = [];

  // ===== 3. ORIGINAL REFERENCE (private) =====
  let __ORIGINAL_GAS_RUN = null;

  // ===== 4. NONCE GENERATOR =====
  function _generateNonce() {
    const arr = new Uint8Array(8);
    if (window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(arr);
    } else {
      for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256);
    }
    return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('') + '-' + Date.now();
  }

  // ===== 5. INSTALL PROXY LOCK =====
  function installLock() {
    if (!window.google || !window.google.script || !window.google.script.run) {
      return false; // GAS runtime ยังไม่พร้อม
    }
    if (__ORIGINAL_GAS_RUN) return true; // ล็อกไปแล้ว

    // เก็บ original ไว้ (ใช้แค่ GAS_EXECUTE เท่านั้น)
    __ORIGINAL_GAS_RUN = window.google.script.run;

    const handler = {
      get(target, prop) {
        if (typeof prop === 'symbol') return undefined;

        // Internal inspection (อนุญาตให้ดู/ debug เท่านั้น)
        if (prop === '__IS_LOCKED')     return true;
        if (prop === '__ORIGINAL')      return __ORIGINAL_GAS_RUN;
        if (prop === '__VERSION')       return LOCK_VERSION;
        if (prop === '__LOCK_INSTALLER')return 'execution_lock.js';

        // ทุก property อื่น → BLOCK
        const err = new Error(
          'DIRECT_GAS_CALL_BLOCKED: Cannot call google.script.run.' + prop + '\n' +
          '✖ ห้ามเรียก google.script.run โดยตรง\n' +
          '✓ ใช้ AI_EXECUTOR.execute({ action: "' + prop + '", payload: {...} })\n' +
          '✓ หรือ GAS_EXECUTE("' + prop + '", {...})'
        );

        console.error('[EXECUTION_LOCK] ⛔ BLOCKED: google.script.run.' + prop);
        console.error('[EXECUTION_LOCK] Stack:', new Error().stack);

        window.__SECURITY_VIOLATION.push({
          type: 'DIRECT_CALL_BLOCKED',
          method: String(prop),
          ts: Date.now(),
          stack: new Error().stack
        });

        throw err;
      }
    };

    window.google.script.run = new Proxy(__ORIGINAL_GAS_RUN, handler);
    console.log('[EXECUTION_LOCK] 🔒 v' + LOCK_VERSION + ' installed. Direct GAS calls BLOCKED.');
    return true;
  }

  // ล็อกทันทีที่ทำงาน (fallback ถ้า GAS runtime ยังไม่พร้อม)
  if (!installLock()) {
    let attempts = 0;
    const maxAttempts = 100; // 10 วินาที
    const interval = setInterval(() => {
      attempts++;
      if (installLock()) {
        clearInterval(interval);
      } else if (attempts >= maxAttempts) {
        clearInterval(interval);
        console.error('[EXECUTION_LOCK] ⛐ Failed: google.script.run never appeared after 10s');
      }
    }, 100);
  }

  // ===== 6. BYPASS DETECTION =====
  window.addEventListener('error', function(e) {
    if (e && e.message && e.message.includes('DIRECT_GAS_CALL_BLOCKED')) {
      window.__SECURITY_VIOLATION.push({
        type: 'BYPASS_ATTEMPT_CAUGHT',
        ts: Date.now(),
        source: e.filename || 'unknown',
        line: e.lineno,
        col: e.colno,
        message: e.message
      });

      console.error('[SECURITY] 🚨 BYPASS_ATTEMPT caught at', e.filename, 'line', e.lineno);

      // แจ้งงผู้ใช้ (toast)
      if (typeof showToast === 'function') {
        showToast('🚨 ตรวจพบการพยายามความปลอดภัย', 'error');
      }
    }
  });

  // จับ console.warn/error ที่มี bypass ผ่าน eval/setTimeout
  const origEval = window.eval;
  window.eval = function(code) {
    if (typeof code === 'string' && code.includes('google.script.run')) {
      window.__SECURITY_VIOLATION.push({
        type: 'EVAL_BYPASS_ATTEMPT',
        ts: Date.now(),
        code: code.substring(0, 200)
      });
      console.error('[SECURITY] 🚨 eval() with google.script.run blocked');
      throw new Error('EVAL_GAS_BLOCKED: google.script.run in eval() is forbidden');
    }
    return origEval.apply(this, arguments);
  };

  // ===== 7. SAFE WRAPPER: GAS_EXECUTE() =====
  /**
   * ช่องทางเดียวที่ปลอดภัยในการเรียก GAS
   * @param {string} action - ชื่อ function บน GAS
   * @param {object} payload - ข้อมูลที่ส่ง
   * @return {Promise} - resolve/reject ตาม GAS response
   */
  window.GAS_EXECUTE = async function(action, payload) {
    return new Promise((resolve, reject) => {
      if (!action || typeof action !== 'string') {
        reject(new Error('GAS_EXECUTE: action must be a non-empty string'));
        return;
      }

      payload = payload || {};

      // เพิ่ม execution metadata (สำหรับ audit trail)
      payload.__execMeta = {
        ts: Date.now(),
        nonce: _generateNonce(),
        source: 'GAS_EXECUTE',
        lockVersion: LOCK_VERSION
      };

      if (!__ORIGINAL_GAS_RUN) {
        reject(new Error('GAS_EXECUTE: Original google.script.run not captured. Lock may have failed.'));
        return;
      }

      __ORIGINAL_GAS_RUN
        .withSuccessHandler(function(result) {
          resolve(result);
        })
        .withFailureHandler(function(err) {
          reject(err);
        })[action](payload);
    });
  };

  // ===== 8. AI_EXECUTOR ENTRY POINT =====
  /**
   * จุดที่ทุก action ต้องผ่านที่นี้
   * @param {object} request - { action: string, payload: object }
   * @return {Promise} - GAS response
   */
  window.AI_EXECUTOR = window.AI_EXECUTOR || {};

  window.AI_EXECUTOR.execute = async function(request) {
    request = request || {};
    const action = request.action;
    const payload = request.payload || {};

    if (!action) {
      throw new Error('AI_EXECUTOR.execute: missing action');
    }
    if (typeof action !== 'string') {
      throw new Error('AI_EXECUTOR.execute: action must be a string');
    }

    // ห่อมื่นที่นี้จะเพิ่ม approval check ได้ (ถ้าต้องการ)
    // ในอนาคต ใช้ canApprove() จาก approval_guard.js ก่อนหลังจากนี้

    return window.GAS_EXECUTE(action, payload);
  };

  // ===== 9. DEBUG / SECURITY UTILITIES =====
  window.AI_EXECUTOR.security = {
    /**
     * ดึงรายการ bypass ที่จับได้
     */
    getViolations: function() {
      return [...window.__SECURITY_VIOLATION];
    },

    /**
     * ล้าง violation log
     */
    clearViolations: function() {
      window.__SECURITY_VIOLATION = [];
    },

    /**
     * ตรวจว่า lock ทำงานอยู่หรือไม่
     */
    isLocked: function() {
      return !!(
        __ORIGINAL_GAS_RUN &&
        window.google &&
        window.google.script &&
        window.google.script.run &&
        window.google.script.run.__IS_LOCKED
      );
    },

    /**
     * เวอร์ชั่นของ lock
     */
    getVersion: function() {
      return LOCK_VERSION;
    },

    /**
     * ส่ง violation log ขึ้น server (สำหรับ audit)
     */
    reportViolations: async function() {
      const v = window.__SECURITY_VIOLATION;
      if (v.length === 0) return { reported: 0 };
      try {
        await window.GAS_EXECUTE('logSecurityViolations', { violations: v });
        window.__SECURITY_VIOLATION = [];
        return { reported: v.length };
      } catch(e) {
        return { reported: 0, error: e.message };
      }
    }
  };

  console.log('[EXECUTION_LOCK] ✅ Global Execution Lock loaded. All direct GAS calls are FORBIDDEN.');
})();
