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
    var payload = parsePostPayloadV55_(e);
    // ── ตรวจจับ LINE Webhook (มี destination + events array) ──
    if (payload.destination && Array.isArray(payload.events)) {
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

function jsonOutputV55_(data) {
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
