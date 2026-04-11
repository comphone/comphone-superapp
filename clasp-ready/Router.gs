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
          app: 'COMPHONE SUPER APP V5.5',
          actions: [
            'getDashboardData', 'getJobStateConfig', 'getJobTimeline', 'transitionJob', 'updateJobById',
            'addQuickNote', 'openJob', 'updateJobStatus', 'getPhotoGalleryData', 'generateJobQR',
            'getJobQRData', 'handleProcessPhotos', 'sendDashboardSummary', 'inventoryOverview',
            'transferStock', 'createCustomer', 'updateCustomer', 'getCustomer', 'listCustomers'
          ]
        };

      case 'getDashboardData':
        return getDashboardData();
      case 'getJobStateConfig':
        return getJobStateConfig();
      case 'getJobTimeline':
        return invokeFunctionByNameV55_('getJobTimeline', args);
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
      case 'createCustomer':
        return createCustomer(payload);
      case 'updateCustomer':
        return updateCustomer(payload);
      case 'getCustomer':
        return getCustomer(payload);
      case 'listCustomers':
        return listCustomers(payload);
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
