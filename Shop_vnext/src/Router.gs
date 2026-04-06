// ============================================================
// Router.gs - Main API Router (V367 — doGet + doPost single entry point)
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

    // HTML Dashboard — Null Fallback Variables
    var template = HtmlService.createTemplateFromFile('Index');

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
      .setTitle('Comphone Dashboard V367')
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

    // ── LINE Webhook Detection ──
    // LINE sends { events: [...] } with no action field
    if (data.events && Array.isArray(data.events)) {
      for (var ei = 0; ei < data.events.length; ei++) {
        var evt = data.events[ei];
        if (evt.type === 'message' && evt.message && evt.message.type === 'text') {
          try {
            var userId = (evt.source && evt.source.userId) || '';
            var userName = (evt.source && evt.source.displayName) || '';
            processLineMessage(evt.message.text, userId, userName);
          } catch (lineErr) {
            Logger.log('LINE event error: ' + lineErr);
          }
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ success: true, source: 'line_webhook' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

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
      'scanWithdrawStock': 'scanWithdrawStock', 'สแกนเบิก': 'scanWithdrawStock',
      'getDashboardJobs': 'getDashboardJobs',
      'getDashboardInventory': 'getDashboardInventory',
      'getDashboardSummary': 'getDashboardSummary',
      'sendCRMNotification': 'sendCRMNotification',
      'dailyReport': 'dailyReport',
      'sendDashboardSummary': 'sendDashboardSummary',
      'sendJobStatusSummary': 'sendJobStatusSummary',
      'backup': 'backup', 'สำรอง': 'backup',
      'logs': 'logs', 'ดูlog': 'logs',
      'stockAlert': 'stockAlert', 'เช็คสต็อกเตือน': 'stockAlert',
      'getProfitReport': 'getProfitReport',
      'getCalendar': 'getCalendar',
      'getCRMSchedule': 'getCRMSchedule',
      'reserveItems': 'reserveItems', 'จองของ': 'reserveItems',
      'releaseReservation': 'releaseReservation', 'คืนจอง': 'releaseReservation',
      'cutStockAuto': 'cutStockAuto', 'ตัดสต็อก': 'cutStockAuto',
      'reorderSuggestion': 'reorderSuggestion', 'สั่งซื้อแนะนำ': 'reorderSuggestion',
      'getTechnicianKPI': 'getTechnicianKPI', 'KPIช่าง': 'getTechnicianKPI'
    };
    var norm = actionMap[action] || action;
    var result = { action: norm };
    switch (norm) {
      case 'help':
        result.success = true;
        result.message = 'Actions: openjob, checkjobs, checkstock, closejob, updatestatus, summary, getDashboardData';
        break;
      case 'summary':
        result.success = true; result.data = summarizeJobs();
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
      case 'sendNotify':
        result.success = true; result.data = sendLineNotify(data);
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
      case 'sendJobStatusSummary':
        result.success = true; result.data = sendJobStatusSummary();
        break;
      case 'generateWarranty':
        result.success = true; result.data = generateWarrantyPDF(data.job_id || '');
        break;
      case 'getTechnicianKPI':
        result.success = true; result.data = getTechnicianKPI(data.techName || null);
        break;
      default:
        result.success = false;
        result.error = 'Unknown action: ' + String(action || '(empty)');
        break;
    }
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    Logger.log('doPost error: ' + err);
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.toString(),
      stack: err.stack || ''
    })).setMimeType(ContentService.MimeType.JSON);
  }
}