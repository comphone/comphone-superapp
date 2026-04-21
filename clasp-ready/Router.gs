// COMPHONE SUPER APP V5.5
// ============================================================
// Router.gs - Main Router and API Dispatcher
// ============================================================

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function doGet(e) {
  try {
    var params = (e && e.parameter) || {};
    var action = normalizeActionV55_(params.action || '');
    var jobId = params.jobId || params.job_id || '';

    // ============================================================
    // Health Check Endpoint — GET ?action=health
    // Returns: { status, version, timestamp, checks }
    // ============================================================
    if (action === 'health' || action === 'ping' || action === 'healthcheck') {
      return jsonOutputV55_(healthCheckV55_());
    }

    if (action === 'json' || action === 'getDashboardData') {
      return jsonOutputV55_(getDashboardData());
    }

    if (action === 'getJobStateConfig') {
      return jsonOutputV55_(getJobStateConfig());
    }

    if (action === 'getJobQRData' || action === 'jobqrdata') {
      return jsonOutputV55_(getJobWebAppPayload(jobId));
    }

    if (action === 'getPhotoGalleryData' || action === 'photogallerydata') {
      return jsonOutputV55_(getPhotoGalleryData(jobId));
    }

    if (params.view === 'jobqr' || action === 'jobqr') {
      var qrTemplate = HtmlService.createTemplateFromFile('JobQRView');
      qrTemplate.jobId = jobId;
      qrTemplate.apiBaseUrl = getWebAppBaseUrl_() || '';
      return qrTemplate.evaluate()
        .setTitle('COMPHONE SUPER APP V5.5 - Job QR')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
        .addMetaTag('viewport', 'width=device-width, initial-scale=1.0');
    }

    if (params.view === 'photogallery' || action === 'photogallery') {
      var galleryTemplate = HtmlService.createTemplateFromFile('PhotoGallery');
      galleryTemplate.jobId = jobId;
      galleryTemplate.apiBaseUrl = getWebAppBaseUrl_() || '';
      return galleryTemplate.evaluate()
        .setTitle('COMPHONE SUPER APP V5.5 - Photo Gallery')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
        .addMetaTag('viewport', 'width=device-width, initial-scale=1.0');
    }

    var template = HtmlService.createTemplateFromFile('Index');
    template.apiBaseUrl = getWebAppBaseUrl_() || '';
    template.jobQrWebAppUrl = buildWebAppUrl_(getWebAppBaseUrl_() || '', { view: 'jobqr', jobId: jobId });
    template.mode = params.mode || '';
    template.jobId = jobId;
    template.status = params.status || '';
    template.customerName = params.customerName || '';
    template.action = params.action || '';
    template.view = params.view || '';
    template.filter = params.filter || '';
    template.search = params.search || '';
    template.techName = params.techName || '';
    template.date = params.date || '';
    template.dateFrom = params.dateFrom || '';
    template.dateTo = params.dateTo || '';
    template.reportType = params.reportType || '';
    template.editMode = params.editMode || '';
    template.tab = params.tab || '';
    template.page = params.page || '';
    template.query = params.query || '';
    template.type = params.type || '';
    template.id = params.id || '';
    template.name = params.name || '';
    template.description = params.description || '';
    template.callback = params.callback || '';
    template.redirect = params.redirect || '';

    return template.evaluate()
      .setTitle('COMPHONE SUPER APP V5.5')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1.0');
  } catch (error) {
    return HtmlService.createHtmlOutput(
      '<html><head><meta charset="UTF-8"><title>COMPHONE SUPER APP V5.5</title></head><body>' +
      '<h2>COMPHONE SUPER APP V5.5 - Router Error</h2><pre>' +
      sanitizeHtmlTextV55_(String(error)) + '\n' + sanitizeHtmlTextV55_(String(error && error.stack || '')) +
      '</pre></body></html>'
    );
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
          version: CONFIG.VERSION || '5.5.2',
          actions: [
            'getDashboardData', 'getJobStateConfig', 'getJobTimeline', 'transitionJob', 'updateJobById',
            'addQuickNote', 'openJob', 'updateJobStatus', 'getPhotoGalleryData', 'generateJobQR',
            'getJobQRData', 'handleProcessPhotos', 'sendDashboardSummary', 'inventoryOverview',
            'transferStock', 'createCustomer', 'updateCustomer', 'getCustomer', 'listCustomers',
            'loginUser', 'logoutUser', 'verifySession', 'listUsers', 'createUser', 'updateUserRole', 'setUserActive', 'setupUserSheet',
            'clockIn', 'clockOut', 'getAttendanceReport', 'getTechHistory', 'getAllTechsSummary',
            'getAfterSalesDue', 'logAfterSalesFollowUp', 'sendAfterSalesAlerts', 'getAfterSalesSummary',
            'addInventoryItem', 'updateInventoryItem', 'deleteInventoryItem', 'getInventoryItemDetail',
            'getStockMovementHistory', 'createPurchaseOrder', 'listPurchaseOrders', 'receivePurchaseOrder',
            'checkStock', 'barcodeLookup', 'scanWithdrawStock', 'geminiReorderSuggestion',
            'createBilling', 'getBilling', 'generatePromptPayQR', 'updatePayment', 'listBillings',
            'initSystem', 'systemStatus', 'setupAllTriggers', 'getSchemaInfo', 'validateConfig', 'getComphoneConfig', 'setScriptProperties'
          ]
        };

      case 'getDashboardData':
        return getDashboardData();
      case 'getDashboardBundle':
        // PC Dashboard bundle — ขณะนี้ใช้ getDashboardData() เป็นฐาน สามารถ customize ที่หลังได้
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

      // Approval & Security Audit (PHASE 20.5)
      case 'validateApproval':
        return validateApproval_(payload);
      case 'batchValidateApproval':
        return batchValidateApproval_(payload);
      case 'logApprovalAudit':
        return logApprovalAudit_(payload);
      case 'batchLogApprovalAudit':
        return batchLogApprovalAudit_(payload);
      case 'logSecurityViolations':
        return logSecurityViolations_(payload);

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
      // ============================================================
      // Customer Portal (Public — ไม่ต้อง Auth)
      // ============================================================
      case 'getJobStatusPublic':
        return getJobStatusPublic(
          payload.job_id || payload.jobId || '',
          payload.phone || ''
        );
      case 'submitCustomerRating':
        return submitCustomerRating_(payload);

      // ============================================================
      // Notification Center — Sprint 3 T4
      // ============================================================
      case 'cronMorningAlert':
        return cronMorningAlert();

      // ============================================================
      // Admin Panel — Sprint 3 T3
      // ============================================================
      // หมายเหตุ: listUsers, createUser, setUserActive, updateUserRole, setupAllTriggers
      // ถูกจัดการไว้ในส่วน Auth แล้ว (บนบนที่ 243-252)
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

      // ── Kudos / Customer Rating (หมายเหตุ: submitCustomerRating อยู่ในส่วน Customer Portal แล้ว)
      case 'getCustomerRatings':
        return jsonOutputV55_(getCustomerRatings_(payload));

      default:
        return invokeFunctionByNameV55_(action, args);
    }
  } catch (error) {
    return { success: false, action: action, error: error.toString() };
  }
}

// ============================================================
// PHASE 21.1: Production Approval & Security Audit
// NEVER TRUST CLIENT — ทุก approval ต้องผ่าน server-side validation
// ============================================================

// Role → Allowed Actions (whitelist ที่ชัดเจน)
// ถ้า action ไม่อยู่ใน list ของ role นั้น → REJECT
var APPROVAL_ROLE_PERMISSIONS = {
  owner: [
    // Admin / System
    'deleteJob', 'deleteData', 'deleteUser', 'deleteInventoryItem', 'cancelJob', 'refund',
    'approveBilling', 'rejectBilling', 'setupSystem', 'initSystem', 'setScriptProperties',
    'setupAllTriggers', 'runBackup', 'seedAllData', 'pruneAuditLog', 'cleanAllData',
    'databaseMaintenance', 'validateSchema', 'runIntegrityCheck', 'syncCodeToDrive',
    'storeSessionContent', 'createUser', 'updateUserRole', 'setUserActive', 'listUsers',
    // Financial
    'createBilling', 'updatePayment', 'markBillingPaid', 'generatePromptPayQR',
    'calculateTax', 'saveTaxReport', 'generateTaxInvoice', 'generateWhtDocument',
    // Stock
    'transferStock', 'createPurchaseOrder', 'receivePurchaseOrder', 'cancelPurchaseOrder',
    'addInventoryItem', 'updateInventoryItem', 'deleteInventoryItem', 'scanWithdrawStock',
    // Job / CRM
    'createJob', 'openJob', 'updateJobStatus', 'transitionJob', 'updateJobById',
    'markJobStatus', 'markDone', 'markWaiting', 'addQuickNote', 'addAppointment',
    'updateJobSchedule', 'createCustomer', 'updateCustomer', 'createAfterSalesRecord',
    'logAfterSalesFollowUp', 'sendAfterSalesAlerts', 'scheduleFollowUp', 'logFollowUpResult',
    'nudgeSalesTeam', 'createWarranty', 'updateWarrantyStatus',
    // Communication
    'sendLineMessage', 'nudgeTech', 'sendPushToAll', 'savePushSubscription', 'removePushSubscription',
    // AI
    'smartAssignTech', 'optimizeRoute', 'analyzeWorkImage', 'runJobCompletionQC',
    'qualityCheck', 'geminiSlipVerify', 'verifyPaymentSlip',
    // Auth (self-service)
    'changePassword', 'logoutUser'
  ],
  accountant: [
    'createBilling', 'updatePayment', 'markBillingPaid', 'generatePromptPayQR',
    'transferStock', 'createPurchaseOrder', 'receivePurchaseOrder', 'cancelPurchaseOrder',
    'addInventoryItem', 'updateInventoryItem', 'getInventoryItemDetail',
    'getStockMovementHistory', 'checkStock', 'barcodeLookup', 'scanWithdrawStock',
    'calculateTax', 'saveTaxReport', 'getTaxReport', 'generateTaxInvoice', 'generateWhtDocument',
    'listBillings', 'getBilling', 'getReportData',
    'updateJobStatus', 'transitionJob', 'markJobStatus', 'markDone', 'markWaiting',
    'createJob', 'openJob', 'updateCustomer', 'createCustomer',
    'changePassword', 'logoutUser'
  ],
  sales: [
    'createJob', 'openJob', 'updateJobStatus', 'transitionJob', 'updateJobById',
    'markJobStatus', 'markDone', 'markWaiting', 'addQuickNote', 'addAppointment',
    'updateJobSchedule', 'createCustomer', 'updateCustomer',
    'createBilling', 'updatePayment', 'markBillingPaid',
    'sendLineMessage', 'nudgeTech', 'nudgeSalesTeam',
    'changePassword', 'logoutUser'
  ],
  technician: [
    'updateJobStatus', 'transitionJob', 'markJobStatus', 'markDone', 'markWaiting',
    'addQuickNote', 'clockIn', 'clockOut', 'addAppointment',
    'handleProcessPhotos', 'analyzeWorkImage', 'qualityCheck', 'runJobCompletionQC',
    'changePassword', 'logoutUser'
  ]
};

/**
 * validateApproval_ — Production-grade server-side approval validation
 * @param {Object} payload — { token, username, action, clientRole, nonce, timestamp, ... }
 * @return {Object} — { success: true/false, reason: 'OK'|'INVALID_SESSION'|... }
 */
function validateApproval_(payload) {
  try {
    var token     = payload.token || '';
    var username  = payload.username || '';
    var action    = payload.action || '';
    var nonce     = payload.nonce || '';
    var timestamp = Number(payload.timestamp || 0);

    // ── 1. REQUIRED FIELD CHECK ────────────────────────────────────────
    if (!token)     return { success: false, reason: 'MISSING_TOKEN' };
    if (!action)    return { success: false, reason: 'MISSING_ACTION' };
    if (!nonce)     return { success: false, reason: 'MISSING_NONCE' };
    if (!timestamp) return { success: false, reason: 'MISSING_TIMESTAMP' };

    // ── 2. TIMESTAMP DRIFT (±5 นาที) ────────────────────────────────────
    var now = Date.now();
    var drift = Math.abs(now - timestamp);
    var MAX_DRIFT_MS = 5 * 60 * 1000; // 5 นาที
    if (drift > MAX_DRIFT_MS) {
      return { success: false, reason: 'TIME_DRIFT', detail: 'drift=' + Math.round(drift/1000) + 's' };
    }

    // ── 3. NONCE ANTI-REPLAY (CacheService, TTL 10 นาที) ──────────────────
    var cache = CacheService.getScriptCache();
    var nonceKey = 'nonce_' + String(nonce).replace(/[^a-zA-Z0-9_-]/g, '');
    if (cache.get(nonceKey)) {
      return { success: false, reason: 'NONCE_USED' };
    }
    // บันทึก nonce ทันที (10 นาที)
    cache.put(nonceKey, '1', 600);

    // ── 4. SESSION VERIFICATION ────────────────────────────────────
    var sessionCheck = verifySession(token);
    if (!sessionCheck || !sessionCheck.valid) {
      return { success: false, reason: 'INVALID_SESSION', detail: sessionCheck ? sessionCheck.error : 'verifySession failed' };
    }
    var session = sessionCheck.session;

    // ตรวจว่า username ตรงกับ session
    if (session.username && username && session.username.toLowerCase() !== username.toLowerCase()) {
      return { success: false, reason: 'USER_MISMATCH', detail: 'token owner != requested user' };
    }

    // ── 5. USER VERIFICATION (DB_USERS — ตรวจ active) ────────────────────
    var ss = getComphoneSheet();
    var userSheet = findSheetByName(ss, 'DB_USERS');
    if (!userSheet) {
      return { success: false, reason: 'DB_USERS_NOT_FOUND' };
    }
    var rows = userSheet.getDataRange().getValues();
    var headers = rows[0];
    var idx = {};
    for (var h = 0; h < headers.length; h++) {
      idx[String(headers[h]).toLowerCase().trim()] = h;
    }
    var colUser   = idx['username'] !== undefined ? idx['username'] : 0;
    var colActive = idx['active']   !== undefined ? idx['active']   : 4;
    var colRole   = idx['role']     !== undefined ? idx['role']     : 2;

    var userFound = false;
    var userActive = false;
    var dbRole = '';
    for (var r = 1; r < rows.length; r++) {
      var rowUser = String(rows[r][colUser] || '').trim().toLowerCase();
      if (rowUser === session.username.toLowerCase()) {
        userFound = true;
        var activeVal = String(rows[r][colActive] || 'TRUE').toUpperCase();
        userActive = activeVal !== 'FALSE' && activeVal !== '0';
        dbRole = String(rows[r][colRole] || 'TECHNICIAN').toLowerCase().trim();
        break;
      }
    }
    if (!userFound) {
      return { success: false, reason: 'USER_NOT_FOUND' };
    }
    if (!userActive) {
      return { success: false, reason: 'USER_INACTIVE' };
    }

    // ── 6. ROLE PERMISSION CHECK ────────────────────────────────────────
    var normalizedRole = dbRole;
    // Alias mapping (ป้องกันกับ PWA roles)
    if (normalizedRole === 'admin')   normalizedRole = 'owner';
    if (normalizedRole === 'acct')    normalizedRole = 'accountant';
    if (normalizedRole === 'tech')    normalizedRole = 'technician';
    if (normalizedRole === 'exec')    normalizedRole = 'owner';

    var allowedActions = APPROVAL_ROLE_PERMISSIONS[normalizedRole];
    if (!allowedActions) {
      return { success: false, reason: 'UNKNOWN_ROLE', detail: dbRole };
    }

    // OWNER = all-powerful (ไม่ต้องตรวจ whitelist)
    if (normalizedRole !== 'owner') {
      var actionAllowed = false;
      for (var a = 0; a < allowedActions.length; a++) {
        if (allowedActions[a] === action) {
          actionAllowed = true;
          break;
        }
      }
      if (!actionAllowed) {
        return { success: false, reason: 'ROLE_DENIED', detail: 'role=' + dbRole + ' action=' + action };
      }
    }

    // ── 7. APPROVED ────────────────────────────────────────────────────
    // Log approval success
    try {
      logApprovalAudit_({
        action: action,
        targetId: payload.targetId || '',
        success: true,
        reason: 'OK',
        user: session.username,
        role: dbRole,
        nonce: nonce,
        source: 'validateApproval_'
      });
    } catch (logErr) { /* silent — ห้าม audit log ล้มเหลว ไม่ควรหยุด approval */ }

    return {
      success: true,
      reason: 'OK',
      user: session.username,
      role: dbRole,
      action: action,
      nonce: nonce
    };

  } catch (e) {
    // ล้มเหลวใน validateApproval_ — ห้าม allow โดยเด็ดขาด
    return { success: false, reason: 'SERVER_ERROR', detail: e.toString() };
  }
}

/**
 * batchValidateApproval_ — Batch approval validation
 */
function batchValidateApproval_(payload) {
  try {
    var items = payload.items || [];
    if (!Array.isArray(items) || items.length === 0) {
      return { success: false, reason: 'EMPTY_BATCH' };
    }
    var approved = 0;
    var results = [];
    for (var i = 0; i < items.length; i++) {
      var r = validateApproval_(items[i]);
      if (r && r.success) approved++;
      results.push(r);
    }
    return { success: true, approved: approved, total: items.length, results: results };
  } catch (e) {
    return { success: false, reason: 'SERVER_ERROR', detail: e.toString() };
  }
}

/**
 * logApprovalAudit_ — บันทึก audit log ลง AUDIT_LOG sheet
 */
function logApprovalAudit_(payload) {
  try {
    var ss = getComphoneSheet();
    var sheet = findSheetByName(ss, 'AUDIT_LOG');
    if (!sheet) {
      sheet = ss.insertSheet('AUDIT_LOG');
      sheet.appendRow(['timestamp', 'action', 'target_id', 'success', 'reason', 'user', 'role', 'nonce', 'source']);
    }
    sheet.appendRow([
      Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd HH:mm:ss'),
      payload.action || '',
      payload.targetId || payload.id || '',
      payload.success === true ? 'true' : 'false',
      payload.reason || '',
      payload.user || '',
      payload.role || '',
      payload.nonce || '',
      payload.source || 'approval_guard'
    ]);
    return { success: true };
  } catch (e) {
    return { success: false, reason: 'AUDIT_LOG_ERROR', detail: e.toString() };
  }
}

/**
 * batchLogApprovalAudit_ — Batch audit log
 */
function batchLogApprovalAudit_(payload) {
  try {
    var logs = Array.isArray(payload) ? payload : (payload.logs || []);
    if (!Array.isArray(logs)) logs = [logs];
    for (var i = 0; i < logs.length; i++) {
      logApprovalAudit_(logs[i]);
    }
    return { success: true, logged: logs.length };
  } catch (e) {
    return { success: false, reason: 'SERVER_ERROR', detail: e.toString() };
  }
}

/**
 * logSecurityViolations_ — บันทึก security violations ลง SECURITY_LOG sheet
 */
function logSecurityViolations_(payload) {
  try {
    var violations = payload.violations || [];
    var ss = getComphoneSheet();
    var sheet = findSheetByName(ss, 'SECURITY_LOG');
    if (!sheet) {
      sheet = ss.insertSheet('SECURITY_LOG');
      sheet.appendRow(['timestamp', 'type', 'action', 'method', 'source', 'stack', 'count']);
    }
    for (var i = 0; i < violations.length; i++) {
      var v = violations[i];
      sheet.appendRow([
        Utilities.formatDate(new Date((v.ts || Date.now())), 'Asia/Bangkok', 'yyyy-MM-dd HH:mm:ss'),
        v.type || '',
        v.action || '',
        v.method || '',
        v.source || '',
        (v.stack || '').substring(0, 500),
        violations.length
      ]);
    }
    return { success: true, logged: violations.length };
  } catch (e) {
    return { success: false, reason: 'AUDIT_LOG_ERROR', detail: e.toString() };
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
  if (data && typeof data === 'object' && !data._headers) {
    data._headers = {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Cache-Control': 'no-store, no-cache, must-revalidate'
    };
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
    version:   'V5.5.6',
    timestamp: Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd HH:mm:ss'),
    elapsed_ms: elapsed,
    checks:    checks
  };
}

// ============================================================
// Customer Portal Helpers
// ============================================================
/**
 * submitCustomerRating_ - บันทึกคะแนนจากลูกค้า (Public API)
 * @param {Object} payload - { job_id, rating, comment? }
 * @return {Object} - { success, message }
 */
function submitCustomerRating_(payload) {
  try {
    var jobId = payload.job_id || payload.jobId || '';
    var rating = Number(payload.rating || 0);
    var comment = payload.comment || '';

    if (!jobId) return { success: false, error: 'ไม่พบ job_id' };
    if (!rating || rating < 1 || rating > 5) return { success: false, error: 'Rating ต้องอยู่ระหว่าง 1-5' };

    var ss = getComphoneSheet();
    var sheet = findSheetByName(ss, 'CUSTOMER_RATINGS');

    // ถ้าไม่มี sheet ให้สร้าง
    if (!sheet) {
      sheet = ss.insertSheet('CUSTOMER_RATINGS');
      sheet.appendRow(['job_id', 'rating', 'comment', 'submitted_at', 'source']);
    }

    sheet.appendRow([
      jobId,
      rating,
      comment,
      Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd HH:mm:ss'),
      'customer_portal'
    ]);

    return { success: true, message: 'ขอบคุณสำหรับคะแนน' };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}
