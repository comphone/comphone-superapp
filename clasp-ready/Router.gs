// COMPHONE SUPER APP V5.5
// ============================================================
// Router.gs - Main Router and API Dispatcher
// ============================================================
// ARCHITECTURE:
//   GAS = API ONLY (JSON responses via ContentService)
//   UI  = PWA ONLY → https://comphone.github.io/comphone-superapp/pwa/
//   HtmlService ถูกลบออกทั้งหมด (V5.5.8 API-Only)
// ============================================================

/**
 * doGet — API-Only JSON endpoint
 * ไม่มี HtmlService อีกต่อไป
 * ทุก GET request → JSON response
 */
function doGet(e) {
  try {
    var params = (e && e.parameter) || {};
    var action = normalizeActionV55_(params.action || '');
    var jobId  = params.jobId || params.job_id || '';

    // Health Check — GET ?action=health
    if (action === 'health' || action === 'ping' || action === 'healthcheck') {
      return jsonOutputV55_(healthCheckV55_());
    }

    // Version — GET ?action=getVersion
    if (action === 'getversion' || action === 'version') {
      return jsonOutputV55_(getVersionV55_());
    }

    // Dashboard Data — GET ?action=getDashboardData
    if (action === 'json' || action === 'getDashboardData' || action === 'getdashboarddata') {
      return jsonOutputV55_(getDashboardData());
    }

    // Job State Config — GET ?action=getJobStateConfig
    if (action === 'getjobstateconfig') {
      return jsonOutputV55_(getJobStateConfig());
    }

    // Job QR Data — GET ?action=getJobQRData&jobId=...
    if (action === 'getjobqrdata' || action === 'jobqrdata') {
      return jsonOutputV55_(getJobWebAppPayload(jobId));
    }

    // Photo Gallery Data — GET ?action=getPhotoGalleryData&jobId=...
    if (action === 'getphotogallerydata' || action === 'photogallerydata') {
      return jsonOutputV55_(getPhotoGalleryData(jobId));
    }

    // Default: API Ready response + redirect hint
    return jsonOutputV55_({
      status:       'ok',
      version:      (typeof CONFIG !== 'undefined' ? CONFIG.VERSION : 'V5.5.8'),
      message:      'COMPHONE API READY',
      architecture: 'API-Only (V5.5.8)',
      ui_url:       'https://comphone.github.io/comphone-superapp/pwa/',
      note:         'UI อยู่ที่ PWA เท่านั้น — GAS เป็น API Backend เท่านั้น'
    });
  } catch (error) {
    return jsonOutputV55_({
      status:  'error',
      error:   error.toString(),
      version: (typeof CONFIG !== 'undefined' ? CONFIG.VERSION : 'V5.5.8')
    });
  }
}

function doPost(e) {
  try {
    // ── Rate Limiting: 60 requests/min per IP via CacheService ──
    try {
      var ip = (e && e.parameter && e.parameter.ip) || 'global';
      var cache = CacheService.getScriptCache();
      var cacheKey = 'rl_' + ip.replace(/[^a-zA-Z0-9]/g, '_');
      var count = parseInt(cache.get(cacheKey) || '0', 10);
      if (count >= 60) {
        return jsonOutputV55_({ success: false, error: 'Rate limit exceeded. Please retry in 60 seconds.', code: 429 });
      }
      cache.put(cacheKey, String(count + 1), 60);
    } catch (rlErr) { /* rate limit ไม่ critical — ไม่ต้องหยุด */ }

    var payload = parsePostPayloadV55_(e);
    // ── ตรวจจับ LINE Webhook (มี destination + events array) ──
    if (payload.destination && Array.isArray(payload.events)) {
      // ตรวจสอบ HMAC-SHA256 signature ก่อนประมวลผล
      if (typeof verifyLineSignature_ === 'function' && !verifyLineSignature_(e)) {
        return jsonOutputV55_({ success: false, error: 'Invalid LINE signature' });
      }
      return jsonOutputV55_(handleLineWebhook(e));
    }
    var action = payload.action || payload.route || payload.fn || payload.method || 'help';
    return jsonOutputV55_(routeActionV55(action, payload));
  } catch (error) {
    return jsonOutputV55_({ success: false, error: error.toString() });
  }
}

function routeActionV55(action, payload) {
  var normalizedAction = normalizeActionV55_(action || '');
  var args = Array.isArray(payload) ? payload : [payload || {}];
  return dispatchActionV55_(normalizedAction, payload || {}, args);
}

function dispatchActionV55_(action, payload, args) {
  payload = payload || {};
  args = Array.isArray(args) ? args : [payload];

  try {
    switch (action) {
      case 'help':
        return {
          success: true,
          app: 'COMPHONE SUPER APP V5.5+',
          version: CONFIG.VERSION || 'V5.5.7',
          actions: [
            'getDashboardData', 'getJobStateConfig', 'getJobTimeline', 'transitionJob', 'updateJobById',
            'addQuickNote', 'checkJobs', 'listJobs', 'openJob', 'updateJobStatus', 'getPhotoGalleryData', 'generateJobQR',
            'getJobQRData', 'handleProcessPhotos', 'sendDashboardSummary', 'inventoryOverview',
            'transferStock', 'createCustomer', 'updateCustomer', 'getCustomer', 'listCustomers',
            'loginUser', 'logoutUser', 'verifySession', 'listUsers', 'createUser', 'updateUserRole', 'setUserActive', 'setupUserSheet',
            'clockIn', 'clockOut', 'getAttendanceReport', 'getTechHistory', 'getAllTechsSummary',
            'getAfterSalesDue', 'logAfterSalesFollowUp', 'sendAfterSalesAlerts', 'getAfterSalesSummary',
            'addInventoryItem', 'updateInventoryItem', 'deleteInventoryItem', 'getInventoryItemDetail',
            'getStockMovementHistory', 'createPurchaseOrder', 'listPurchaseOrders', 'receivePurchaseOrder',
            'checkStock', 'barcodeLookup', 'scanWithdrawStock', 'geminiReorderSuggestion',
            'createBilling', 'getBilling', 'generatePromptPayQR', 'updatePayment', 'listBillings',
            'initSystem', 'systemStatus', 'setupAllTriggers', 'cleanupSessions', 'verifyToken', 'getSchemaInfo', 'validateConfig', 'getComphoneConfig', 'setScriptProperties'
          ]
        };

      case 'getDashboardData':
        return getDashboardData();
      case 'getJobStateConfig':
        return getJobStateConfig();
      case 'getJobTimeline':
        return getJobTimelineV55_(payload.job_id || payload.jobId || (args[0] && args[0].job_id) || '');
      case 'transitionJob':
        if (args.length >= 2) return invokeFunctionByNameV55_('transitionJob', args);
        return transitionJob(payload.job_id || payload.jobId || '', payload.new_status || payload.to_status || payload.status_code || payload.status, payload);
      case 'updateJobById':
        if (args.length >= 2) return invokeFunctionByNameV55_('updateJobById', args);
        return updateJobById(payload.job_id || payload.jobId || '', payload);
      case 'addQuickNote':
        if (args.length >= 3) return invokeFunctionByNameV55_('addQuickNote', args);
        return addQuickNote(payload.job_id || payload.jobId || '', payload.note || '', payload.user || payload.changed_by || 'SYSTEM');
      case 'checkJobs':
      case 'listJobs':
        return checkJobs(payload);
      case 'openJob':
      case 'createJob':
        return openJob(payload);
      case 'updateJobStatus':
        return updateJobStatus(payload);
      case 'getJobQRData':
        return getJobWebAppPayload(payload.job_id || payload.jobId || '');
      case 'generateJobQR':
        return generateJobQR(payload.job_id || payload.jobId || '');
      case 'getPhotoGalleryData':
      case 'photoGalleryData':
        return getPhotoGalleryData(payload.job_id || payload.jobId || '');
      case 'handleProcessPhotos':
        return handleProcessPhotos();
      case 'sendDashboardSummary':
        return sendDashboardSummary();
      case 'inventoryOverview':
        return getInventoryOverview(payload);
      case 'transferStock':
        return transferStock(payload.from_location || payload.from, payload.to_location || payload.to, payload.item_id || payload.item_code || payload.code || payload.itemId, payload.qty, payload);
      case 'addInventoryItem':
        return addInventoryItem(payload);
      case 'updateInventoryItem':
        return updateInventoryItem(payload);
      case 'deleteInventoryItem':
        return deleteInventoryItem(payload);
      case 'getInventoryItemDetail':
        return getInventoryItemDetail(payload);
      case 'getStockMovementHistory':
        return getStockMovementHistory(payload);
      case 'createPurchaseOrder':
        return createPurchaseOrder(payload);
      case 'listPurchaseOrders':
        return listPurchaseOrders(payload);
      case 'receivePurchaseOrder':
        return receivePurchaseOrder(payload);
      case 'cancelPurchaseOrder':
        return cancelPurchaseOrder_(payload);
      case 'checkStock':
        return checkStock(payload);
      case 'barcodeLookup':
        return barcodeLookup(payload);
      case 'scanWithdrawStock':
        return scanWithdrawStock(payload);
      case 'geminiReorderSuggestion':
        return geminiReorderSuggestion();
      case 'createCustomer':
        return createCustomer(payload);
      case 'updateCustomer':
        return updateCustomer(payload);
      case 'getCustomer':
        return getCustomer(payload);
      case 'listCustomers':
        return listCustomers(payload);

      // ============================================================
      // Auth & RBAC
      // ============================================================
      case 'loginUser':
        return loginUser(payload.username || '', payload.password || '');
      case 'logoutUser':
        return logoutUser(payload.token || '');
      case 'verifySession':
        return verifySession(payload.token || '');
      case 'listUsers':
        return listUsers(payload.token || '');
      case 'createUser':
        return createUser(payload.token || '', payload);
      case 'updateUserRole':
        return updateUserRole(payload.token || '', payload.username || '', payload.role || '');
      case 'setUserActive':
        return setUserActive(payload.token || '', payload.username || '', payload.active !== false);
      case 'setupUserSheet':
        return setupUserSheet();
      case 'forceResetAdmin':
        return forceResetAdmin(payload.password || payload.newPassword || '');
      case 'cleanupSessions':
        return cleanupSessions();
      case 'verifyToken':
        return verifyToken(payload.token || '');

      // ============================================================
      // System Setup & Health Check
      // ============================================================
      case 'setScriptProperties':
        return setScriptPropertiesFromPayload(payload);
      case 'initSystem':
        return initSystem();
      case 'systemStatus':
        return systemStatus();
      case 'setupTriggers':
      case 'setupAllTriggers':
        return setupAllTriggers();
      case 'getSchemaInfo':
        return getSchemaInfo();
      case 'validateConfig':
        return validateRequiredConfigs();
      case 'getComphoneConfig':
        return getComphoneConfig();

      // ============================================================
      // Attendance & Tech History
      // ============================================================
      case 'clockIn':
        return clockIn(payload.tech || payload.tech_name || '', payload.note || '');
      case 'clockOut':
        return clockOut(payload.tech || payload.tech_name || '', payload.note || '');
      case 'getAttendanceReport':
        return getAttendanceReport(payload);
      case 'getTechHistory':
        return getTechHistory(payload.tech || payload.tech_name || '', payload);
      case 'getAllTechsSummary':
        return getAllTechsSummary();

      // ============================================================
      // Billing & Payment
      // ============================================================
      case 'createBilling':
        return autoGenerateBillingForJob(payload.job_id || payload.jobId || '', payload);
      case 'getBilling':
        return getBilling(payload);
      case 'generatePromptPayQR':
        return generatePromptPayQR(payload);
      case 'updatePayment':
      case 'markBillingPaid':
        return markBillingPaid(payload);
      case 'listBillings':
        return listAllBillings_(payload);

      // ============================================================
      // CRM Sprint 3 — Customer History + Follow-up
      // ============================================================
      case 'getCustomerHistoryFull':
        return getCustomerHistoryFull(payload);
      case 'getCustomerListWithStats':
        return getCustomerListWithStats(payload);
      case 'scheduleFollowUp':
        return scheduleFollowUp_(payload);
      case 'logFollowUpResult':
        return logFollowUpResult_(payload);
      case 'getCRMFollowUpSchedule':
        return getCRMFollowUpSchedule_(payload);
      case 'getCRMMetrics':
        return getCRMMetrics_();
      case 'nudgeSalesTeam':
        return nudgeSalesTeam_(payload);

      // ============================================================
      // After-Sales Service
      // ============================================================
      case 'createAfterSalesRecord':
        return createAfterSalesRecord(payload.job_id || payload.jobId || '');
      case 'getAfterSalesDue':
        return getAfterSalesDue(payload.days || 30);
      case 'logAfterSalesFollowUp':
        return logAfterSalesFollowUp(payload.record_id || '', payload.note || '', payload.followup_by || '', payload.next_action || '');
      case 'sendAfterSalesAlerts':
        return sendAfterSalesAlerts();
      case 'getAfterSalesSummary':
        return getAfterSalesSummary();

      // ============================================================
      // Push Notifications
      // ============================================================
      case 'savePushSubscription':
        return savePushSubscription(payload);
      case 'removePushSubscription':
        return removePushSubscription(payload);
      case 'sendPushToAll':
        return sendPushToAll(payload.title || '', payload.body || '', payload);
      case 'setupNotificationTriggers':
        return setupNotificationTriggers();

      // ============================================================
      // Audit Log
      // ============================================================
      // ============================================================
      // Security
      // ============================================================
      case 'changePassword':
        return changePassword(payload);
      case 'forcePasswordChange':
        return forcePasswordChange(payload);
      case 'lockAccount':
        return lockAccount(payload);
      case 'unlockAccount':
        return unlockAccount(payload);
      case 'getSecurityStatus':
        return getSecurityStatus();

      case 'getAuditLog':
        return getAuditLog(payload);
      case 'getAuditSummary':
        return getAuditSummary(payload.period || 'today');
      case 'pruneAuditLog':
        return pruneAuditLog(payload.keep_days || 90);

      // ============================================================
      // Quick Actions (LINE, Appointment, Status)
      // ============================================================
      case 'sendLineMessage':
        return sendLinePush(
          payload.message || '',
          payload.to || payload.toId || _getRoomGroupId(payload.room || 'TECHNICIAN')
        );
      case 'nudgeTech':
        return nudgeTechAction_(payload);
      case 'addAppointment':
      case 'updateJobSchedule':
        return updateJobScheduleV55(payload);
      case 'markJobStatus':
        return transitionJob(
          payload.job_id || payload.jobId || '',
          payload.new_status || payload.status || '',
          payload.changed_by || payload.user || 'PWA',
          payload.note || ''
        );

      // ============================================================
      // Reports
      // ============================================================
      case 'getReportData':
        return getReportData_(payload.period || 'month');

      // ============================================================
      // Drive Sync
      // ============================================================
      case 'syncCodeToDrive':
        return DriveSync_receiveSync(payload);

      case 'getDriveSyncStatus':
        return getDriveSyncStatus();

      case 'storeSessionContent':
        return storeSessionContent(payload.content || '');

      // Customer Portal (Public — ไม่ต้อง Auth)
      // ============================================================
      case 'getJobStatusPublic':
        return getJobStatusPublic(
          payload.job_id || payload.jobId || '',
          payload.phone || ''
        );

      // ============================================================
      // Notification Center — Sprint 3 T4
      // ============================================================
      case 'cronMorningAlert':
        return cronMorningAlert();

      // ============================================================
      // Admin Panel — Sprint 3 T3
      // ============================================================
      case 'listUsers':
        return listUsers_(payload);
      case 'createUser':
        return createUser_(payload);
      case 'setUserActive':
        return setUserActive_(payload);
      case 'updateUserRole':
        return updateUserRole_(payload);
      case 'setupAllTriggers':
        return setupAllTriggers();
      case 'runBackup':
        return runBackup();
      case 'seedAllData':
        return seedAllData();

      // ============================================================
      // AI Systems — Final Sprint T5
      // ============================================================
      case 'smartAssignTech':
        return smartAssignTech_(payload);
      case 'optimizeRoute':
        return optimizeRoute(
          payload.start_lat || payload.lat || 0,
          payload.start_lng || payload.lng || 0,
          payload.destinations || []
        );
      case 'analyzeWorkImage':
        return analyzeWorkImage(
          payload.image_url || payload.imageUrl || '',
          payload.context || payload.symptom || ''
        );
      case 'runJobCompletionQC':
        return runJobCompletionQC(
          payload.job_id || payload.jobId || '',
          payload
        );
      case 'qualityCheck':
        return qualityCheck(
          payload.image_url || payload.imageUrl || '',
          payload.job_id || payload.jobId || ''
        );
      case 'geminiSlipVerify':
        return geminiSlipVerify_(payload);
      case 'verifyPaymentSlip':
        // ตรวจสลิปด้วย API หรือ Gemini Vision เป็น fallback
        return verifyPaymentSlip_(payload);

      // ============================================================
      // Tax Engine (TASK 1-2: VAT Flexible + WHT ภงด.)
      // ============================================================
      case 'calculateTax':
        return taxAction(Object.assign({ sub: 'calculate' }, payload));
      case 'getTaxReport':
        return taxAction(Object.assign({ sub: 'report' }, payload));
      case 'saveTaxReport':
        return taxAction(Object.assign({ sub: 'save' }, payload));
      case 'taxAction':
        return taxAction(payload);
      case 'generateTaxInvoice':
        return generateTaxInvoice(payload);
      case 'generateWhtDocument':
        return generateWhtDocument(payload);
      case 'getTaxReminder':
        return getTaxReminder(payload);

      // ============================================================
      // Warranty Management (TASK 6)
      // ============================================================
      case 'createWarranty':
        return createWarranty(payload);
      case 'getWarrantyByJobId':
        return getWarrantyByJobId(payload);
      case 'listWarranties':
        return listWarranties(payload);
      case 'updateWarrantyStatus':
        return updateWarrantyStatus(payload);
      case 'getWarrantyDue':
        return getWarrantyDue(payload);

      // ============================================================
      // Health Monitoring (TASK 9)
      // ============================================================
      case 'healthCheck':
        return healthCheck(payload);
      case 'getHealthHistory':
        return getHealthHistory(payload);

      // ============================================================
      // Multi-branch (TASK 7)
      // ============================================================
      case 'getBranchList':
        return getBranchList();
      case 'getBranchSummary':
        return getBranchSummary(payload.branch_id || '');
      case 'branchAction':
        return branchAction(payload);
      case 'ensureAllBranchIdColumns':
        return ensureAllBranchIdColumns();

      // ============================================================
      // Database Integrity (PART 2)
      // ============================================================
      case 'databaseMaintenance':
        return jsonOutputV55_(runDatabaseMaintenance());
      case 'validateSchema':
        return jsonOutputV55_(validateSchema_(payload.sheetName || 'DBJOBS'));
      case 'runIntegrityCheck':
        return jsonOutputV55_(runIntegrityCheck());
      case 'cleanAllData':
        return jsonOutputV55_(cleanAllData());

      // ── Kudos / Customer Rating ────────────────────────────────────────────
      case 'submitCustomerRating':
        return jsonOutputV55_(submitCustomerRating_(payload));
      case 'getCustomerRatings':
        return jsonOutputV55_(getCustomerRatings_(payload));

      // ── POS / Retail Sale (ขายหน้าร้าน) ────────────────────────────────
      case 'createSale':
      case 'createRetailSale':
        if (typeof createRetailSale_ === 'function') return createRetailSale_(payload);
        // fallback: ใช้ createBilling แทนจนกว่าจะมี POS module
        return autoGenerateBillingForJob(payload.job_id || '', Object.assign({ sale_type: 'retail' }, payload));
      case 'listSales':
      case 'listRetailSales':
        if (typeof listRetailSales_ === 'function') return listRetailSales_(payload);
        return listAllBillings_(Object.assign({ type: 'retail' }, payload));
      case 'getSaleSummary':
        if (typeof getRetailSaleSummary_ === 'function') return getRetailSaleSummary_(payload);
        return getReportData(Object.assign({ type: 'sale' }, payload));

      default:
        return invokeFunctionByNameV55_(action, args);
    }
  } catch (error) {
    return { success: false, action: action, error: error.toString() };
  }
}

function normalizeActionV55_(action) {
  action = String(action || '').trim();
  var map = {
    'เปิดงาน': 'openJob',
    'create_job': 'createJob',
    'openjob': 'openJob',
    'open_job': 'openJob',
    'createjob': 'createJob',
    'เช็คงาน': 'checkJobs',
    'checkjobs': 'checkJobs',
    'check_jobs': 'checkJobs',
    'เช็คสต็อก': 'checkStock',
    'checkstock': 'checkStock',
    'check_stock': 'checkStock',
    'ปิดงาน': 'completeJob',
    'closejob': 'completeJob',
    'close_job': 'completeJob',
    'อัพเดทสถานะ': 'updateJobStatus',
    'updatestatus': 'updateJobStatus',
    'update_status': 'updateJobStatus',
    'transition_job': 'transitionJob',
    'เปลี่ยนสถานะงาน': 'transitionJob',
    'jobStateConfig': 'getJobStateConfig',
    'jobqrdata': 'getJobQRData',
    'getPhotoGallery': 'getPhotoGalleryData',
    'photoGallery': 'getPhotoGalleryData',
    'ดูรูปงาน': 'getPhotoGalleryData',
    'บาร์โค้ด': 'barcodeLookup',
    'summary': 'sendDashboardSummary'
  };
  return map[action] || action;
}

function invokeFunctionByNameV55_(functionName, args) {
  functionName = String(functionName || '').trim();
  if (!functionName) return { success: false, error: 'Function name is required' };
  var globalScope = typeof globalThis !== 'undefined' ? globalThis : this;
  var fn = globalScope[functionName];
  if (typeof fn !== 'function') {
    return { success: false, error: 'Function not found: ' + functionName, action: functionName };
  }
  return fn.apply(globalScope, Array.isArray(args) ? args : []);
}

function parsePostPayloadV55_(e) {
  if (!e || !e.postData || !e.postData.contents) return {};
  try {
    return JSON.parse(e.postData.contents || '{}');
  } catch (error) {
    throw new Error('Invalid JSON payload');
  }
}

/**
 * JSON output พร้อม security headers
 * GAS ContentService ไม่รองรับ setHeader — ใช้ metadata ใน response body แทน
 * @param {*} data
 * @return {TextOutput}
 */
function jsonOutputV55_(data) {
  // GAS ไม่รองรับ custom HTTP headers — เพิ่ม _headers metadata ใน response
  // เพื่อให้ Cloudflare Worker หรือ proxy สามารถอ่านและเพิ่ม headers ได้
  if (data && typeof data === 'object') {
    if (!data._headers) {
      data._headers = {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'Cache-Control': 'no-store, no-cache, must-revalidate'
      };
    }
    // เพิ่ม meta.version ในทุก response — Frontend ใช้ตรวจสอบ version mismatch
    if (!data.meta) {
      data.meta = {
        version: (typeof CONFIG !== 'undefined' && CONFIG.VERSION) || 'V5.5.7',
        ts: Date.now()
      };
    }
  }
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function sanitizeHtmlTextV55_(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ============================================================
// 🏥 Health Check — GET ?action=health
// ============================================================
/**
 * ตรวจสอบสุขภาพระบบแบบ lightweight
 * เรียกได้โดยไม่ต้อง auth (public endpoint)
 * @return {Object} { status, version, timestamp, checks }
 */
function healthCheckV55_() {
  var start = Date.now();
  var checks = {};
  var overallOk = true;

  // 1. Spreadsheet connectivity
  try {
    var ss = getComphoneSheet();
    checks.spreadsheet = { ok: true, id: ss.getId() };
  } catch (e) {
    checks.spreadsheet = { ok: false, error: e.message };
    overallOk = false;
  }

  // 2. Script Properties (required keys)
  try {
    var props = PropertiesService.getScriptProperties().getProperties();
    var requiredKeys = ['DB_SS_ID'];
    var missingKeys  = requiredKeys.filter(function(k) { return !props[k]; });
    checks.config = {
      ok:       missingKeys.length === 0,
      missing:  missingKeys,
      line_ok:  !!props['LINE_CHANNEL_ACCESS_TOKEN'],
      gemini_ok: !!props['GEMINI_API_KEY']
    };
    if (missingKeys.length > 0) overallOk = false;
  } catch (e) {
    checks.config = { ok: false, error: e.message };
    overallOk = false;
  }

  // 3. Triggers
  try {
    var triggers = ScriptApp.getProjectTriggers();
    checks.triggers = {
      ok:    triggers.length > 0,
      count: triggers.length,
      fns:   triggers.map(function(t) { return t.getHandlerFunction(); })
    };
  } catch (e) {
    checks.triggers = { ok: false, error: e.message };
  }

  // 4. DB_USERS (login ได้ไหม)
  try {
    var userSheet = findSheetByName(getComphoneSheet(), 'DB_USERS');
    var userCount = userSheet ? Math.max(0, userSheet.getLastRow() - 1) : 0;
    checks.users = { ok: userCount > 0, count: userCount };
    if (userCount === 0) overallOk = false;
  } catch (e) {
    checks.users = { ok: false, error: e.message };
    overallOk = false;
  }

  var elapsed = Date.now() - start;

  return {
    status:    overallOk ? 'healthy' : 'degraded',
    version:   CONFIG.VERSION || 'V5.5.7',
    timestamp: Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd HH:mm:ss'),
    elapsed_ms: elapsed,
    checks:    checks
  };
}

// ============================================================
// 📌 getVersion — GET ?action=getVersion
// ============================================================
function getVersionV55_() {
  return {
    success: true,
    version: CONFIG.VERSION || 'V5.5.7',
    build:   CONFIG.BUILD   || '2026-04-19',
    app:     CONFIG.APP_NAME,
    timestamp: Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd HH:mm:ss')
  };
}
