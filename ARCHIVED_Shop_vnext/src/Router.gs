// ============================================================
// Router.gs - Main API Router (V362 — doGet + doPost single entry point)
// ============================================================

// ============================================================
// 🔧 Template Include Helper — for modular HTML files
// ============================================================
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// ============================================================
// 🌐 doGet — Dashboard HTML Entry Point (V362)
// ============================================================
function doGet(e) {
  try {
    var p = (e && e.parameter) || {};
    var action = p.action || '';

    // JSON API endpoint
    if (action === 'json') {
      var result = {
        success: true,
        jobs: getDashboardJobs(),
        inventory: getDashboardInventory(),
        summary: getDashboardSummary()
      };
      return ContentService.createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'jobqrdata' || action === 'getJobQRData') {
      return ContentService.createTextOutput(JSON.stringify(getJobWebAppPayload(p.jobId || p.job_id || '')))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (p.view === 'jobqr' || action === 'jobqr') {
      var jobTemplate = HtmlService.createTemplateFromFile('JobQRView');
      jobTemplate.jobId = p.jobId || p.job_id || '';
      jobTemplate.apiBaseUrl = getWebAppBaseUrl_() || '';
      return jobTemplate.evaluate()
        .setTitle('COMPHONE Job QR')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
        .addMetaTag('viewport', 'width=device-width, initial-scale=1.0');
    }

    if (action === 'photoGalleryData' || action === 'getPhotoGalleryData') {
      return ContentService.createTextOutput(JSON.stringify(getPhotoGalleryData(p.jobId || p.job_id || '')))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (p.view === 'photogallery' || action === 'photogallery') {
      var galleryTemplate = HtmlService.createTemplateFromFile('PhotoGallery');
      galleryTemplate.jobId = p.jobId || p.job_id || '';
      galleryTemplate.apiBaseUrl = getWebAppBaseUrl_() || '';
      return galleryTemplate.evaluate()
        .setTitle('COMPHONE Photo Gallery')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
        .addMetaTag('viewport', 'width=device-width, initial-scale=1.0');
    }

    // HTML Dashboard — Null Fallback Variables
    var template = HtmlService.createTemplateFromFile('Index');
    template.apiBaseUrl = getWebAppBaseUrl_() || '';
    template.jobQrWebAppUrl = buildWebAppUrl_(getWebAppBaseUrl_() || '', { view: 'jobqr', jobId: p.jobId || '' });
    

    // Send all possible template variables with null fallback
    template.mode = p.mode || '';
    template.jobId = p.jobId || '';
    template.status = p.status || '';
    template.customerName = p.customerName || '';
    template.action = action;
    template.view = p.view || '';
    template.filter = p.filter || '';
    template.search = p.search || '';
    template.techName = p.techName || '';
    template.date = p.date || '';
    template.dateFrom = p.dateFrom || '';
    template.dateTo = p.dateTo || '';
    template.reportType = p.reportType || '';
    template.editMode = p.editMode || '';
    template.tab = p.tab || '';
    template.page = p.page || '';
    template.query = p.query || '';
    template.type = p.type || '';
    template.id = p.id || '';
    template.name = p.name || '';
    template.description = p.description || '';
    template.callback = p.callback || '';
    template.redirect = p.redirect || '';

    return template.evaluate()
      .setTitle('Comphone Dashboard V362')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1.0');

  } catch (e) {
    // Emergency fallback — plain text error page
    return HtmlService.createHtmlOutput(
      '<html><head><meta charset="UTF-8"></head><body>' +
      '<h2>⚠️ doGet Error</h2><pre>' +
      String(e.toString()) + ' ' + String(e.stack || '') +
      '</pre></body></html>'
    );
  }
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var action = data.action || '';
    var actionMap = {
      'เปิดงาน': 'openjob', 'เช็คงาน': 'checkjobs', 'เช็คสต็อก': 'checkstock',
      'ปิดงาน': 'closejob', 'อัพเดทสถานะ': 'updatestatus',
      'openjob': 'openjob', 'open_job': 'openjob',
      'checkjobs': 'checkjobs', 'check_jobs': 'checkjobs',
      'checkstock': 'checkstock', 'check_stock': 'checkstock',
      'closejob': 'closejob', 'close_job': 'closejob',
      'updatestatus': 'updatestatus', 'update_status': 'updatestatus',
      'สรุปงาน': 'summary', 'summary': 'summary',
      'getDashboardData': 'getDashboardData',
      'barcode': 'barcode', 'บาร์โค้ด': 'barcode',
      'sendNotify': 'sendNotify', 'แจ้งไลน์': 'sendNotify',
      'cronMorning': 'cronMorning',
      'createInvoice': 'createInvoice', 'สร้างบิล': 'createInvoice',
      'getJobFolder': 'getJobFolder',
      'saveJobPhoto': 'saveJobPhoto',
      'updatePhotoLink': 'updatePhotoLink',
      'updateJobById': 'updateJobById',
      'barcodeLookup': 'barcodeLookup',
      'createJob': 'createJob', 'create_job': 'createJob', 'สร้างงาน': 'createJob',
      'transitionJob': 'transitionJob', 'transition_job': 'transitionJob', 'เปลี่ยนสถานะงาน': 'transitionJob',
      'generateJobQR': 'generateJobQR', 'generate_job_qr': 'generateJobQR', 'สร้างคิวอาร์งาน': 'generateJobQR',
      'getJobStateConfig': 'getJobStateConfig', 'jobStateConfig': 'getJobStateConfig',
      'getJobQRData': 'getJobQRData', 'jobqrdata': 'getJobQRData',
      'photoGalleryData': 'photoGalleryData', 'getPhotoGalleryData': 'photoGalleryData', 'ดูรูปงาน': 'photoGalleryData',
      'createBeforeAfterCollage': 'createBeforeAfterCollage', 'photoCollage': 'createBeforeAfterCollage',
      'createCustomer': 'createCustomer', 'updateCustomer': 'updateCustomer', 'getCustomer': 'getCustomer', 'listCustomers': 'listCustomers',
      'getCustomerHistory': 'getCustomerHistory', 'syncCustomerFromJob': 'syncCustomerFromJob',
      'predictiveMaintenance': 'predictiveMaintenance', 'runPredictiveMaintenance': 'runPredictiveMaintenance',
      'transferStock': 'transferStock', 'getVanStock': 'getVanStock', 'inventoryOverview': 'inventoryOverview',
      'predictiveStocking': 'predictiveStocking', 'createWeeklyToolAuditChecklist': 'createWeeklyToolAuditChecklist',
      'getWeeklyToolAuditChecklist': 'getWeeklyToolAuditChecklist', 'submitToolAudit': 'submitToolAudit',
      'createBilling': 'createBilling', 'getBilling': 'getBilling', 'generatePromptPayQR': 'generatePromptPayQR',
      'verifyPaymentSlip': 'verifyPaymentSlip', 'markBillingPaid': 'markBillingPaid', 'generateReceiptPDF': 'generateReceiptPDF',
      'notifyBillingReady': 'notifyBillingReady', 'notifyPaymentReceived': 'notifyPaymentReceived', 'sendCriticalDashboardAlerts': 'sendCriticalDashboardAlerts',
      'getRevenueReport': 'getRevenueReport', 'getJobStatusDistribution': 'getJobStatusDistribution', 'getAlerts': 'getAlerts'
    };
    var norm = actionMap[action] || action;
    var result = { action: norm };
    switch (norm) {
      case 'help':
        result.success = true;
        result.message = 'Actions: createJob, transitionJob, generateJobQR, getJobStateConfig, getJobQRData, photoGalleryData, createBeforeAfterCollage, createCustomer, updateCustomer, getCustomer, listCustomers, getCustomerHistory, syncCustomerFromJob, predictiveMaintenance, runPredictiveMaintenance, transferStock, getVanStock, inventoryOverview, predictiveStocking, createWeeklyToolAuditChecklist, getWeeklyToolAuditChecklist, submitToolAudit, openjob, checkjobs, checkstock, closejob, updatestatus, summary, getDashboardData';
        break;
      case 'summary':
        result.success = true; result.data = summarizeJobs();
        break;
      case 'createJob':
        result.success = true; result.data = createJob(data);
        break;
      case 'transitionJob':
        result.success = true; result.data = transitionJob(data.job_id || data.jobId || '', data.new_status || data.to_status || data.status_code || data.status, data);
        break;
      case 'generateJobQR':
        result.success = true; result.data = generateJobQR(data.job_id || data.jobId || '');
        break;
      case 'getJobStateConfig':
        result.success = true; result.data = getJobStateConfig();
        break;
      case 'getJobQRData':
        result.success = true; result.data = getJobWebAppPayload(data.job_id || data.jobId || '');
        break;
      case 'photoGalleryData':
        result.success = true; result.data = getPhotoGalleryData(data.job_id || data.jobId || '');
        break;
      case 'createBeforeAfterCollage':
        result.success = true; result.data = createBeforeAfterCollage(data.job_id || data.jobId || '', data);
        break;
      case 'createCustomer':
        result.success = true; result.data = createCustomer(data);
        break;
      case 'updateCustomer':
        result.success = true; result.data = updateCustomer(data);
        break;
      case 'getCustomer':
        result.success = true; result.data = getCustomer(data);
        break;
      case 'listCustomers':
        result.success = true; result.data = listCustomers(data);
        break;
      case 'getCustomerHistory':
        result.success = true; result.data = getCustomerHistory(data);
        break;
      case 'syncCustomerFromJob':
        result.success = true; result.data = syncCustomerFromJob(data.job_id || data.jobId || '');
        break;
      case 'predictiveMaintenance':
      case 'runPredictiveMaintenance':
        result.success = true; result.data = runPredictiveMaintenance(data);
        break;
      case 'openjob':
        result.success = true; result.data = openJob(data);
        break;
      case 'checkjobs':
        result.success = true; result.data = checkJobs(data);
        break;
      case 'checkstock':
        result.success = true; result.data = checkStock(data);
        break;
      case 'inventoryOverview':
        result.success = true; result.data = getInventoryOverview(data);
        break;
      case 'transferStock':
        result.success = true; result.data = transferStock(data.from_location || data.from, data.to_location || data.to, data.item_id || data.item_code || data.code || data.itemId, data.qty, data);
        break;
      case 'getVanStock':
        result.success = true; result.data = getVanStock(data.tech_id || data.tech || data.technician || '');
        break;
      case 'predictiveStocking':
        result.success = true; result.data = predictiveStocking(data);
        break;
      case 'createWeeklyToolAuditChecklist':
        result.success = true; result.data = createWeeklyToolAuditChecklist(data);
        break;
      case 'getWeeklyToolAuditChecklist':
        result.success = true; result.data = getWeeklyToolAuditChecklist(data);
        break;
      case 'submitToolAudit':
        result.success = true; result.data = submitToolAudit(data);
        break;
      case 'closejob':
        result.success = true; result.data = completeJob(data);
        break;
      case 'updatestatus':
        result.success = true; result.data = updateJobStatus(data);
        break;
      case 'updateJobById':
        result.success = true; result.data = updateJobById(data.job_id || '', data);
        break;
      case 'getDashboardData':
        result.success = true; result.data = getDashboardData();
        break;
      case 'barcode': case 'barcodeLookup':
        result.success = true; result.data = barcodeLookup(data);
        break;
      case 'scanWithdrawStock':
        result.success = true; result.data = scanWithdrawStock(data);
        break;
      case 'getJobFolder':
        result.success = true; result.data = getOrCreateJobFolder(data);
        break;
      case 'saveJobPhoto':
        result.success = true; result.data = saveJobPhoto(data);
        break;
      case 'updatePhotoLink':
        result.success = true; result.data = updatePhotoLink(data);
        break;
      case 'createInvoice':
        result.success = true; result.data = createInvoicePDF(data);
        break;
      case 'createBilling':
        result.success = true; result.data = createBilling(data.job_id || data.jobId || '', data.parts, data.labor);
        break;
      case 'getBilling':
        result.success = true; result.data = getBilling(data);
        break;
      case 'generatePromptPayQR':
        result.success = true; result.data = generatePromptPayQR(data);
        break;
      case 'verifyPaymentSlip':
        result.success = true; result.data = verifyPaymentSlip(data);
        break;
      case 'markBillingPaid':
        result.success = true; result.data = markBillingPaid(data);
        break;
      case 'generateReceiptPDF':
        result.success = true; result.data = generateReceiptPDF(data);
        break;
      case 'sendNotify':
        result.success = true; result.data = sendLineNotify(data);
        break;
      case 'notifyBillingReady':
        result.success = true; result.data = notifyBillingReady(data);
        break;
      case 'notifyPaymentReceived':
        result.success = true; result.data = notifyPaymentReceived(data);
        break;
      case 'sendCriticalDashboardAlerts':
        result.success = true; result.data = sendCriticalDashboardAlerts();
        break;
      case 'cronMorning':
        result.success = true; result.data = cronMorningAlert();
        break;
      case 'getDashboardJobs':
        result.success = true; result.data = getDashboardJobs();
        break;
      case 'getDashboardInventory':
        result.success = true; result.data = getDashboardInventory();
        break;
      case 'getDashboardSummary':
        result.success = true; result.data = getDashboardSummary();
        break;
      case 'getRevenueReport':
        result.success = true; result.data = getRevenueReport(data.period || 'today');
        break;
      case 'getJobStatusDistribution':
        result.success = true; result.data = getJobStatusDistribution();
        break;
      case 'getAlerts':
        result.success = true; result.data = getAlerts();
        break;
      case 'sendCRMNotification':
        result.success = true; result.data = sendCRMNotification(data);
        break;
      case 'dailyReport':
        result.success = true; result.data = getDailyReport();
        break;
      case 'sendDashboardSummary':
        result.success = true; result.data = sendDashboardSummary();
        break;
      case 'backup': case 'สำรอง':
        result.success = true; result.data = autoBackup();
        break;
      case 'logs': case 'ดูlog':
        result.success = true; result.data = { logs: getLastLogs(data.limit || 50) };
        break;
      case 'stockAlert': case 'เช็คสต็อกเตือน':
        result.success = true; result.data = checkLowStockAlert();
        break;
      case 'getProfitReport':
        result.success = true; result.data = getProfitReport(data);
        break;
      case 'getCalendar':
        result.success = true; result.data = getCalendarJobs(data.days || 7);
        break;
      case 'getCRMSchedule':
        result.success = true; result.data = getCRMSchedule();
        break;
      case 'reserveItems': case 'จองของ':
        result.success = true; result.data = reserveItemsForJob(data.job_id || '', data.items || []);
        break;
      case 'releaseReservation': case 'คืนจอง':
        result.success = true; result.data = releaseReservation(data.job_id || '');
        break;
      case 'cutStockAuto': case 'ตัดสต็อก':
        result.success = true; result.data = cutStockAuto(data.job_id || '');
        break;
      case 'reorderSuggestion': case 'สั่งซื้อแนะนำ':
        result.success = true; result.data = geminiReorderSuggestion();
        break;
      case 'setupTriggers': case 'ตั้งtrigger':
        result.success = true; result.data = setupAllTriggers();
        break;
      case 'listTriggers': case 'ดูtrigger':
        result.success = true; result.data = listTriggers();
        break;
      case 'deleteTriggers': case 'ลบtrigger':
        result.success = true; result.data = deleteAllTriggers();
        break;
      case 'getJobTimeline': case 'ดูไทม์ไลน์':
        result.success = true; result.data = getJobTimeline(data.job_id || '');
        break;
      case 'addQuickNote': case 'เพิ่มหมายเหตุด่วน':
        result.success = true; result.data = addQuickNote(data.job_id || '', data.note, data.user || '');
        break;
      case 'generateWarranty': case 'สร้างใบรับประกัน':
        result.success = true; result.data = generateWarrantyPDF(data.job_id || '');
        break;
      case 'processImageQueue': case 'จัดรูป':
        result.success = true; result.data = processImageSorting();
        break;
      case 'photoQueueCount': case 'คิวรูป':
        result.success = true; result.data = getPhotoQueueCount();
        break;
      case 'queuePhoto': case 'ฝากรูป':
        result.success = true; result.data = queuePhotoFromLINE(data.image_id || '', data.job_id || '', data.tech_name || '');
        break;
      default:
        result.success = false;
        result.error = 'Unknown action: ' + action;
    }
    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Server error: ' + err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

function summarizeJobs() {
  try {
    var ss = getComphoneSheet();
    var sh = findSheetByName(ss, 'DBJOBS');
    if (!sh) return { error: 'DBJOBS not found' };
    var d = sh.getDataRange().getValues();
    if (d.length < 2) return { message: 'ไม่มีงานในระบบ' };
    var p = 0, c = 0, ip = 0;
    for (var i = 1; i < d.length; i++) {
      var s = String(d[i][3]);
      if (s === 'Completed') c++;
      else if (s === 'InProgress' || s.indexOf('กำลัง') === 0) ip++;
      else p++;
    }
    return { total: d.length - 1, pending: p, inProgress: ip, completed: c, date: new Date().toLocaleDateString('th-TH') };
  } catch (e) { return { error: e.toString() }; }
}
