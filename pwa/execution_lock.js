// ============================================================
// COMPHONE SUPER APP V5.5 — execution_lock.js
// PHASE 20.2 + 20.3: GLOBAL EXECUTION LOCK + TRUSTED EXECUTION ENFORCEMENT
// Version: 5.6.3-PROD
// ============================================================
// หลักการ:
//   1. ล็อก google.script.run ทุก property → โยน DIRECT_GAS_CALL_BLOCKED
//   2. สร้าง GAS_EXECUTE() — เป็นช่องทางเดียวที่ใช้ original GAS run ในตัว
//   3. สร้าง AI_EXECUTOR.execute() — entry point ที่ถูกต้องใช้
//   4. จับบีปา๊สล้องทุกครั้ง → __SECURITY_VIOLATION[]
//   5. ห้ามการเข้าถึง → showToast + log
//   6. WHITELIST: __TRUSTED_ACTIONS — อนุญาตเฉพาะ action ที่ลงทะเบียน
//   7. APPROVAL TOKEN: __LAST_APPROVED_ACTION — one-time use, auto-clear 3s
// ============================================================

(function() {
  'use strict';

  const LOCK_VERSION = '5.6.5-PROD';
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

  // ===== 2a. TRUSTED ACTIONS WHITELIST (PHASE 20.3 + 20.4) =====
  // อัพเดตรายการที่ใช้งานจริงใน COMPHONE SUPER APP
  window.__TRUSTED_ACTIONS = {
    // === Read / Query (no approval required) ===
    getDashboardData: true,
    getJobStateConfig: true,
    getJobTimeline: true,
    getJobQRData: true,
    getPhotoGalleryData: true,
    inventoryOverview: true,
    getInventoryItemDetail: true,
    getStockMovementHistory: true,
    checkStock: true,
    barcodeLookup: true,
    listPurchaseOrders: true,
    getCustomer: true,
    listCustomers: true,
    getCustomerHistoryFull: true,
    getCustomerListWithStats: true,
    getCRMFollowUpSchedule: true,
    getCRMMetrics: true,
    getAfterSalesDue: true,
    getAfterSalesSummary: true,
    getAttendanceReport: true,
    getTechHistory: true,
    getAllTechsSummary: true,
    getBilling: true,
    listBillings: true,
    getReportData: true,
    getAuditLog: true,
    getAuditSummary: true,
    getSecurityStatus: true,
    getComphoneConfig: true,
    getSchemaInfo: true,
    systemStatus: true,
    health: true,
    help: true,
    verifySession: true,
    listUsers: true,
    geminiReorderSuggestion: true,
    getWarrantyByJobId: true,
    listWarranties: true,
    getTaxReport: true,
    getTaxReminder: true,
    getJobStatusPublic: true,
    getDriveSyncStatus: true,
    // === Public / Customer Portal ===
    submitCustomerRating: true,
    // === Write / Mutate (require approval) ===
    updateJobStatus: true,
    transitionJob: true,
    updateJobById: true,
    openJob: true,
    createJob: true,
    deleteJob: true,
    addQuickNote: true,
    markJobStatus: true,
    handleProcessPhotos: true,
    sendDashboardSummary: true,
    transferStock: true,
    addInventoryItem: true,
    updateInventoryItem: true,
    deleteInventoryItem: true,
    scanWithdrawStock: true,
    createPurchaseOrder: true,
    receivePurchaseOrder: true,
    cancelPurchaseOrder: true,
    createCustomer: true,
    updateCustomer: true,
    createBilling: true,
    updatePayment: true,
    markBillingPaid: true,
    generatePromptPayQR: true,
    createAfterSalesRecord: true,
    logAfterSalesFollowUp: true,
    sendAfterSalesAlerts: true,
    scheduleFollowUp: true,
    logFollowUpResult: true,
    nudgeSalesTeam: true,
    clockIn: true,
    clockOut: true,
    loginUser: true,
    logoutUser: true,
    createUser: true,
    updateUserRole: true,
    setUserActive: true,
    changePassword: true,
    forcePasswordChange: true,
    lockAccount: true,
    unlockAccount: true,
    sendLineMessage: true,
    nudgeTech: true,
    addAppointment: true,
    updateJobSchedule: true,
    savePushSubscription: true,
    removePushSubscription: true,
    sendPushToAll: true,
    smartAssignTech: true,
    smartAssignV2: true,
    optimizeRoute: true,
    analyzeWorkImage: true,
    runJobCompletionQC: true,
    qualityCheck: true,
    geminiSlipVerify: true,
    verifyPaymentSlip: true,
    calculateTax: true,
    saveTaxReport: true,
    taxAction: true,
    generateTaxInvoice: true,
    generateWhtDocument: true,
    createWarranty: true,
    updateWarrantyStatus: true,
    runBackup: true,
    seedAllData: true,
    setupAllTriggers: true,
    initSystem: true,
    setScriptProperties: true,
    syncCodeToDrive: true,
    storeSessionContent: true,
    pruneAuditLog: true,
    cronMorningAlert: true,
    // === Security / Audit (internal) ===
    logApprovalAudit: true,
    batchLogApprovalAudit: true,
    batchValidateApproval: true,
    validateApproval: true,
    logSecurityViolations: true,
  };

  // ===== 2b. APPROVAL TOKEN (PHASE 20.3) =====
  // สำหรับ one-time execution หลัง approve สำเร็จ
  window.__LAST_APPROVED_ACTION = null;
  window.__APPROVAL_CLEAR_TIMEOUT = null;
  const APPROVAL_TOKEN_TTL_MS = 3000; // 3 วินาที

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
  // PHASE 26.4: ตรวจจับ static hosting — ถ้าไม่ใช่ GAS origin ให้ข้าม retry loop
  const isGasEnvironment = typeof google !== 'undefined' && google.script && google.script.run;
  const isStaticHosting = window.location.protocol === 'file:' || !isGasEnvironment;

  if (isStaticHosting) {
    console.log('[EXECUTION_LOCK] 📡 Static hosting detected — skipping GAS lock install');
  } else if (!installLock()) {
    let attempts = 0;
    const maxAttempts = 100; // 10 วินาที
    const interval = setInterval(() => {
      attempts++;
      if (installLock()) {
        clearInterval(interval);
      } else if (attempts >= maxAttempts) {
        clearInterval(interval);
        console.warn('[EXECUTION_LOCK] ⛐ Failed: google.script.run never appeared after 10s');
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

  // ===== 7. SAFE WRAPPER: GAS_EXECUTE() (PHASE 20.3 HARDENED) =====
  /**
   * ช่องทางเดียวที่ปลอดภัยในการเรียก GAS
   * การตรวจสอบ:
   *   1. Action ต้องอยู่ใน __TRUSTED_ACTIONS
   *   2. ต้องมี approval token (__LAST_APPROVED_ACTION === action)
   *   3. ใช้งานได้ครั้งเดียว (auto-clear หลัง execute)
   * @param {string} action - ชื่อ function บน GAS
   * @param {object} payload - ข้อมูลที่ส่ง
   * @param {object} opts - { skipApprovalCheck: boolean } สำหรับ internal เช่น validateApproval
   * @return {Promise} - resolve/reject ตาม GAS response
   */
  window.GAS_EXECUTE = async function(action, payload, opts) {
    opts = opts || {};

    return new Promise((resolve, reject) => {
      if (!action || typeof action !== 'string') {
        reject(new Error('GAS_EXECUTE: action must be a non-empty string'));
        return;
      }

      // --- STEP 1: WHITELIST CHECK ---
      if (!window.__TRUSTED_ACTIONS[action]) {
        const err = new Error('UNTRUSTED_ACTION_BLOCKED: "' + action + '" is not in the trusted actions whitelist');
        console.error('[EXECUTION_LOCK] ⛔ UNTRUSTED_ACTION_BLOCKED:', action);
        window.__SECURITY_VIOLATION.push({
          type: 'UNTRUSTED_ACTION',
          action: action,
          ts: Date.now()
        });
        reject(err);
        return;
      }

      // --- STEP 2: APPROVAL TOKEN CHECK (ยกเว้น skip สำหรับ internal calls) ---
      if (!opts.skipApprovalCheck) {
        if (!window.__LAST_APPROVED_ACTION || window.__LAST_APPROVED_ACTION !== action) {
          const err = new Error('APPROVAL_REQUIRED: "' + action + '" requires prior approval via approve()');
          console.error('[EXECUTION_LOCK] ⛔ APPROVAL_REQUIRED:', action);
          window.__SECURITY_VIOLATION.push({
            type: 'APPROVAL_REQUIRED',
            action: action,
            ts: Date.now()
          });
          reject(err);
          return;
        }
      }

      payload = payload || {};

      // เพิ่ม execution metadata (สำหรับ audit trail)
      payload.__execMeta = {
        ts: Date.now(),
        nonce: _generateNonce(),
        source: 'GAS_EXECUTE',
        lockVersion: LOCK_VERSION,
        approvalToken: !!window.__LAST_APPROVED_ACTION
      };

      if (!__ORIGINAL_GAS_RUN) {
        // ===== STATIC HOSTING FALLBACK: ใช้ fetch() แทน google.script.run =====
        // PHASE 26.6 FIX: On GitHub Pages (static hosting), google.script.run doesn't exist.
        // Use GET-based fetch to the GAS API URL instead.
        const gasUrl = window.COMPHONE_GAS_URL || (window.GAS_CONFIG && window.GAS_CONFIG.url) || '';
        if (!gasUrl) {
          if (!opts.skipApprovalCheck) {
            window.__LAST_APPROVED_ACTION = null;
          }
          reject(new Error('GAS_EXECUTE: No google.script.run AND no GAS URL configured'));
          return;
        }

        console.log('[EXECUTION_LOCK] 📡 Static hosting → fetch fallback for:', action);
        const qs = new URLSearchParams(
          Object.assign({}, payload, { action: action, _t: Date.now() })
        ).toString();
        const fetchUrl = gasUrl + '?' + qs;

        // Clear approval token
        if (!opts.skipApprovalCheck) {
          window.__LAST_APPROVED_ACTION = null;
          if (window.__APPROVAL_CLEAR_TIMEOUT) {
            clearTimeout(window.__APPROVAL_CLEAR_TIMEOUT);
            window.__APPROVAL_CLEAR_TIMEOUT = null;
          }
          console.log('[EXECUTION_LOCK] 🔑 Approval token consumed (fetch) for:', action);
        }

        fetch(fetchUrl, { redirect: 'follow' })
          .then(function(res) { return res.json(); })
          .then(function(data) {
            console.log('[EXECUTION_LOCK] ✅ fetch fallback OK for:', action);
            resolve(data);
          })
          .catch(function(err) {
            console.error('[EXECUTION_LOCK] ❌ fetch fallback FAIL for:', action, err);
            reject(new Error('GAS_EXECUTE fetch failed: ' + err.message));
          });
        return;
      }

      // ส่ง flattened payload เพื่อ backward compatibility กับ Router.gs
      // Router.gs รับ payload แบบ flattened object ที่มี action อยู่ใน property
      const gasPayload = Object.assign({}, payload, {
        action: action,
        __execMeta: payload.__execMeta
      });

      __ORIGINAL_GAS_RUN
        .withSuccessHandler(function(result) {
          // ONE-TIME USE: ล้าง approval token ทันที (ใช้งานได้ครั้งเดียว)
          if (!opts.skipApprovalCheck) {
            window.__LAST_APPROVED_ACTION = null;
            if (window.__APPROVAL_CLEAR_TIMEOUT) {
              clearTimeout(window.__APPROVAL_CLEAR_TIMEOUT);
              window.__APPROVAL_CLEAR_TIMEOUT = null;
            }
            console.log('[EXECUTION_LOCK] 🔑 Approval token consumed for:', action);
          }
          resolve(result);
        })
        .withFailureHandler(function(err) {
          // ถ้า execute ล้มเหลว → ล้าง token ด้วย (ป้องกัน reuse ในกรณีที่ล้มเหลว)
          if (!opts.skipApprovalCheck) {
            window.__LAST_APPROVED_ACTION = null;
            if (window.__APPROVAL_CLEAR_TIMEOUT) {
              clearTimeout(window.__APPROVAL_CLEAR_TIMEOUT);
              window.__APPROVAL_CLEAR_TIMEOUT = null;
            }
          }
          reject(err);
        })
        .routeActionV55(action, gasPayload);
    });
  };

  // ===== 8. AI_EXECUTOR ENTRY POINT (PHASE 20.4) =====
  /**
   * จุดที่ทุก action ต้องผ่านที่นี้
   * สำหรับ write/delete/financial actions (ต้อง approval)
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

    return window.GAS_EXECUTE(action, payload);
  };

  /**
   * สำหรับ read/query actions (ไม่ต้อง approval)
   * @param {object} request - { action: string, payload: object }
   * @return {Promise} - GAS response
   */
  window.AI_EXECUTOR.query = async function(request) {
    request = request || {};
    const action = request.action;
    const payload = request.payload || {};

    if (!action) {
      throw new Error('AI_EXECUTOR.query: missing action');
    }
    if (typeof action !== 'string') {
      throw new Error('AI_EXECUTOR.query: action must be a string');
    }

    // Query actions ไม่ต้อง approval — ใช้ skipApprovalCheck
    return window.GAS_EXECUTE(action, payload, { skipApprovalCheck: true });
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
