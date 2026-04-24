// ============================================================
// TaxDocuments.gs — เอกสารภาษีไทย + Tax Reminder
// COMPHONE SUPER APP V5.5+
// ============================================================
//
// TASK 3: Tax Report รายเดือน (VAT + WHT)
// TASK 4: เอกสารภาษีไทย — ใบกำกับภาษี + รายงาน ภงด.
// TASK 5: Tax Reminder — แจ้งเตือนยื่นภาษีผ่าน LINE + Trigger
//
// ทุก action เขียน Audit Log ตาม RULE 5
// ทุกค่า Config ใช้ getConfig() ตาม RULE 4
// ============================================================

// ============================================================
// 🔧 generateTaxInvoice(data)
// ============================================================
// สร้างใบกำกับภาษีอย่างย่อ (PDF) ตามมาตรฐานไทย
// data: { billing_id, job_id, user }
// ============================================================
function generateTaxInvoice(data) {
  try {
    data = data || {};
    var billingId = String(data.billing_id || data.billingId || '').trim();
    var jobId     = String(data.job_id || data.jobId || '').trim();
    if (!billingId && !jobId) return { success: false, error: 'billing_id or job_id is required' };

    // ดึงข้อมูล Billing
    var billingResult = billingId ? getBillingById_(billingId) : getBilling({ job_id: jobId });
    if (!billingResult || !billingResult.success) return { success: false, error: 'Billing not found' };
    var billing = billingResult.billing;

    // คำนวณภาษี
    var tax = calculateTax({
      subtotal:     billing.subtotal || (billing.parts_cost + billing.labor_cost),
      discount:     billing.discount || 0,
      vat_mode:     billing.vat_mode || getConfig('TAX_MODE', 'VAT7'),
      wht_rate_pct: billing.wht_rate_pct
    });

    // ข้อมูลบริษัท
    var companyName    = getConfig('COMPANY_NAME', 'ร้านคอมโฟน');
    var companyTaxId   = getConfig('COMPANY_TAX_ID', '-');
    var companyAddress = getConfig('COMPANY_ADDRESS', '-');
    var companyPhone   = getConfig('COMPANY_PHONE', '-');
    var now            = new Date();
    var docNo          = 'TAX-' + Utilities.formatDate(now, 'Asia/Bangkok', 'yyyyMMddHHmmss');
    var docDate        = Utilities.formatDate(now, 'Asia/Bangkok', 'dd/MM/') + (now.getFullYear() + 543);

    var html = buildTaxInvoiceHtml_({
      docNo:          docNo,
      docDate:        docDate,
      companyName:    companyName,
      companyTaxId:   companyTaxId,
      companyAddress: companyAddress,
      companyPhone:   companyPhone,
      billing:        billing,
      tax:            tax
    });

    // สร้าง PDF
    var folder = getReceiptFolderSafe_();
    var pdfBlob = Utilities.newBlob(html, 'text/html', docNo + '.html').getAs(MimeType.PDF).setName(docNo + '.pdf');
    var pdfFile = folder.createFile(pdfBlob);

    writeAuditLog('TAX_INVOICE_GENERATE', data.user || 'SYSTEM', docNo + ' billing=' + billing.billing_id, { result: 'success' });

    return {
      success:     true,
      doc_no:      docNo,
      doc_date:    docDate,
      file_id:     pdfFile.getId(),
      file_url:    pdfFile.getUrl(),
      tax_summary: tax
    };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

// ============================================================
// 🔧 generateWhtDocument(data)
// ============================================================
// สร้างรายงาน ภงด.3 / ภงด.53 (PDF) สำหรับยื่นสรรพากร
// data: { period, user }  period = 'yyyy-MM'
// ============================================================
function generateWhtDocument(data) {
  try {
    data = data || {};
    var period = String(data.period || Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM')).trim();

    var reportResult = getTaxReport(period);
    if (!reportResult.success) return reportResult;

    var records  = reportResult.records || [];
    var summary  = reportResult.summary;
    var now      = new Date();
    var docNo    = 'WHT-' + period.replace('-', '') + '-' + Utilities.formatDate(now, 'Asia/Bangkok', 'HHmmss');
    var docDate  = Utilities.formatDate(now, 'Asia/Bangkok', 'dd/MM/') + (now.getFullYear() + 543);

    var companyName  = getConfig('COMPANY_NAME', 'ร้านคอมโฟน');
    var companyTaxId = getConfig('COMPANY_TAX_ID', '-');

    var html = buildWhtDocumentHtml_({
      docNo:       docNo,
      docDate:     docDate,
      period:      period,
      companyName: companyName,
      companyTaxId: companyTaxId,
      records:     records,
      summary:     summary
    });

    var folder  = getReceiptFolderSafe_();
    var pdfBlob = Utilities.newBlob(html, 'text/html', docNo + '.html').getAs(MimeType.PDF).setName(docNo + '.pdf');
    var pdfFile = folder.createFile(pdfBlob);

    writeAuditLog('WHT_DOCUMENT_GENERATE', data.user || 'SYSTEM', docNo + ' period=' + period + ' records=' + records.length, { result: 'success' });

    return {
      success:    true,
      doc_no:     docNo,
      period:     period,
      file_id:    pdfFile.getId(),
      file_url:   pdfFile.getUrl(),
      summary:    summary
    };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

// ============================================================
// 🔔 TASK 5: getTaxReminder(data) + cronTaxReminder()
// ============================================================
// แจ้งเตือนยื่นภาษีรายเดือนผ่าน LINE Group Accounting
// ============================================================
function getTaxReminder(data) {
  data = data || {};
  var now      = new Date();
  var period   = Utilities.formatDate(now, 'Asia/Bangkok', 'yyyy-MM');
  var report   = getTaxReport(period);
  var summary  = (report && report.summary) ? report.summary : buildEmptyTaxSummary_(period);

  var thaiMonth = getThaiMonthName_(now.getMonth());
  var thaiYear  = now.getFullYear() + 543;

  return {
    success:  true,
    period:   period,
    message:  '📋 สรุปภาษีเดือน ' + thaiMonth + ' ' + thaiYear + '\n' +
              '💰 ยอดรวม: ' + formatMoney_(summary.total_subtotal) + ' บาท\n' +
              '🧾 VAT: ' + formatMoney_(summary.total_vat_amount) + ' บาท\n' +
              '📝 ภงด.: ' + formatMoney_(summary.total_wht_amount) + ' บาท\n' +
              '✅ Net: ' + formatMoney_(summary.total_net_payable) + ' บาท\n' +
              '📌 กรุณายื่น ภพ.30 ภายในวันที่ 15 ของเดือนถัดไป',
    summary:  summary
  };
}

function cronTaxReminder() {
  try {
    _logInfo_('cronTaxReminder', 'Starting tax reminder check');
    var reminder = getTaxReminder({});
    var lineToken = getConfig('LINE_CHANNEL_ACCESS_TOKEN', '');
    var groupId   = getConfig('LINE_GROUP_ACCOUNTING', '');

    if (lineToken && groupId) {
      var payload = JSON.stringify({
        to: groupId,
        messages: [{ type: 'text', text: reminder.message }]
      });
      UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', {
        method: 'post',
        contentType: 'application/json',
        headers: { 'Authorization': 'Bearer ' + lineToken },
        payload: payload,
        muteHttpExceptions: true
      });
    }

    writeAuditLog('TAX_REMINDER_SENT', 'CRON', 'period=' + reminder.period, { result: 'success' });
    return { success: true, period: reminder.period, message: reminder.message };
  } catch (e) {
    _logError_('HIGH', 'cronTaxReminder', e);
    writeAuditLog('TAX_REMINDER_ERROR', 'CRON', e.toString(), { result: 'error' });
    return { success: false, error: e.toString() };
  }
}

function setupTaxReminderTrigger() {
  // ลบ trigger เดิมถ้ามี
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'cronTaxReminder') ScriptApp.deleteTrigger(t);
  });
  // สร้าง trigger ใหม่ — วันที่ 1 ของทุกเดือน เวลา 09:00
  ScriptApp.newTrigger('cronTaxReminder')
    .timeBased()
    .onMonthDay(1)
    .atHour(9)
    .create();
  return { success: true, message: 'Tax reminder trigger set: day 1 of every month at 09:00' };
}

// ============================================================
// 🎨 HTML Builders
// ============================================================

function buildTaxInvoiceHtml_(opts) {
  var billing = opts.billing || {};
  var tax     = opts.tax || {};
  var vatModeLabel = { VAT7: 'มี VAT 7%', ZERO: 'VAT 0%', EXEMPT: 'ยกเว้น VAT', MIXED: 'Mixed VAT' };

  return '<!DOCTYPE html><html lang="th"><head><meta charset="UTF-8">' +
    '<style>' +
    'body{font-family:\'Sarabun\',\'TH Sarabun New\',sans-serif;font-size:14px;margin:20px;color:#222;}' +
    'h1{font-size:20px;text-align:center;margin-bottom:4px;}' +
    '.subtitle{text-align:center;font-size:13px;color:#555;margin-bottom:16px;}' +
    'table{width:100%;border-collapse:collapse;margin-bottom:12px;}' +
    'th,td{border:1px solid #ccc;padding:6px 10px;font-size:13px;}' +
    'th{background:#f0f4ff;font-weight:bold;}' +
    '.right{text-align:right;} .center{text-align:center;}' +
    '.total-row{font-weight:bold;background:#fff8e1;}' +
    '.net-row{font-weight:bold;background:#e8f5e9;font-size:15px;}' +
    '.footer{margin-top:20px;font-size:12px;color:#888;text-align:center;}' +
    '</style></head><body>' +
    '<h1>ใบกำกับภาษีอย่างย่อ</h1>' +
    '<div class="subtitle">TAX INVOICE</div>' +
    '<table>' +
    '<tr><td><b>ผู้ออกเอกสาร:</b> ' + opts.companyName + '</td><td><b>เลขประจำตัวผู้เสียภาษี:</b> ' + opts.companyTaxId + '</td></tr>' +
    '<tr><td><b>ที่อยู่:</b> ' + opts.companyAddress + '</td><td><b>โทร:</b> ' + opts.companyPhone + '</td></tr>' +
    '<tr><td><b>เลขที่เอกสาร:</b> ' + opts.docNo + '</td><td><b>วันที่:</b> ' + opts.docDate + '</td></tr>' +
    '<tr><td><b>ลูกค้า:</b> ' + (billing.customer_name || '-') + '</td><td><b>Job ID:</b> ' + (billing.job_id || '-') + '</td></tr>' +
    '</table>' +
    '<table>' +
    '<tr><th>รายการ</th><th class="right">จำนวนเงิน (บาท)</th></tr>' +
    '<tr><td>ค่าอะไหล่ (Parts)</td><td class="right">' + formatMoney_(billing.parts_cost || 0) + '</td></tr>' +
    '<tr><td>ค่าแรง (Labor)</td><td class="right">' + formatMoney_(billing.labor_cost || 0) + '</td></tr>' +
    (billing.discount > 0 ? '<tr><td>ส่วนลด (Discount)</td><td class="right" style="color:red;">-' + formatMoney_(billing.discount) + '</td></tr>' : '') +
    '<tr class="total-row"><td>ยอดก่อนภาษี (Subtotal)</td><td class="right">' + formatMoney_(tax.net_subtotal) + '</td></tr>' +
    '<tr><td>ประเภทภาษี: ' + (vatModeLabel[tax.vat_mode] || tax.vat_mode) + ' (ฐาน ' + formatMoney_(tax.vat_base) + ' บาท)</td><td class="right">' + formatMoney_(tax.vat_amount) + '</td></tr>' +
    '<tr><td>ยอดรวมก่อนหัก ณ ที่จ่าย</td><td class="right">' + formatMoney_(tax.total_before_wht) + '</td></tr>' +
    (tax.wht_amount > 0 ? '<tr><td>หัก ณ ที่จ่าย ภงด. ' + tax.wht_rate_pct + '% (ฐาน ' + formatMoney_(tax.wht_base) + ' บาท)</td><td class="right" style="color:red;">-' + formatMoney_(tax.wht_amount) + '</td></tr>' : '') +
    '<tr class="net-row"><td>ยอดสุทธิที่ต้องชำระ (Net Payable)</td><td class="right">' + formatMoney_(tax.net_payable) + '</td></tr>' +
    '</table>' +
    '<div class="footer">เอกสารนี้ออกโดยระบบ COMPHONE SUPER APP V5.5 | ' + opts.docDate + '</div>' +
    '</body></html>';
}

function buildWhtDocumentHtml_(opts) {
  var records = opts.records || [];
  var summary = opts.summary || {};
  var rows = records.map(function (r, i) {
    return '<tr>' +
      '<td class="center">' + (i + 1) + '</td>' +
      '<td>' + (r.customer_name || '-') + '</td>' +
      '<td>' + (r.bill_id || '-') + '</td>' +
      '<td>' + (r.invoice_date || '-') + '</td>' +
      '<td class="right">' + formatMoney_(r.wht_base) + '</td>' +
      '<td class="center">' + (r.wht_rate || '3') + '%</td>' +
      '<td class="right">' + formatMoney_(r.wht_amount) + '</td>' +
      '</tr>';
  }).join('');

  return '<!DOCTYPE html><html lang="th"><head><meta charset="UTF-8">' +
    '<style>' +
    'body{font-family:\'Sarabun\',\'TH Sarabun New\',sans-serif;font-size:13px;margin:20px;color:#222;}' +
    'h1{font-size:18px;text-align:center;}' +
    '.subtitle{text-align:center;font-size:12px;color:#555;margin-bottom:12px;}' +
    'table{width:100%;border-collapse:collapse;margin-bottom:12px;}' +
    'th,td{border:1px solid #ccc;padding:5px 8px;}' +
    'th{background:#e3f2fd;font-weight:bold;text-align:center;}' +
    '.right{text-align:right;} .center{text-align:center;}' +
    '.summary-row{font-weight:bold;background:#fff8e1;}' +
    '.footer{margin-top:16px;font-size:11px;color:#888;text-align:center;}' +
    '</style></head><body>' +
    '<h1>รายงานภาษีหัก ณ ที่จ่าย (ภงด.)</h1>' +
    '<div class="subtitle">WHT REPORT — เดือน ' + opts.period + '</div>' +
    '<table>' +
    '<tr><td><b>ผู้จ่ายเงิน:</b> ' + opts.companyName + '</td><td><b>เลขประจำตัวผู้เสียภาษี:</b> ' + opts.companyTaxId + '</td></tr>' +
    '<tr><td><b>เลขที่เอกสาร:</b> ' + opts.docNo + '</td><td><b>วันที่ออกเอกสาร:</b> ' + opts.docDate + '</td></tr>' +
    '</table>' +
    '<table>' +
    '<tr><th>#</th><th>ชื่อผู้รับเงิน</th><th>เลขที่บิล</th><th>วันที่</th><th class="right">ฐานภาษี (บาท)</th><th>อัตรา</th><th class="right">ภาษีหัก (บาท)</th></tr>' +
    rows +
    '<tr class="summary-row"><td colspan="4" class="center">รวมทั้งสิ้น (' + records.length + ' รายการ)</td>' +
    '<td class="right">' + formatMoney_(summary.total_subtotal) + '</td>' +
    '<td></td>' +
    '<td class="right">' + formatMoney_(summary.total_wht_amount) + '</td></tr>' +
    '</table>' +
    '<div class="footer">เอกสารนี้ออกโดยระบบ COMPHONE SUPER APP V5.5 | ' + opts.docDate + '</div>' +
    '</body></html>';
}

// ============================================================
// 🔧 Helpers
// ============================================================

function getBillingById_(billingId) {
  try {
    var ss = getComphoneSheet();
    if (!ss) return { success: false, error: 'Spreadsheet not found' };
    var sh = findSheetByName(ss, 'DB_BILLING');
    if (!sh || sh.getLastRow() < 2) return { success: false, error: 'DB_BILLING not found' };

    var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    var rows    = sh.getRange(2, 1, sh.getLastRow() - 1, headers.length).getValues();
    var bidIdx  = findHeaderIndex_(headers, ['Billing_ID', 'Bill_ID', 'billing_id']);

    for (var i = 0; i < rows.length; i++) {
      if (String(rows[i][bidIdx] || '').trim() === String(billingId).trim()) {
        var billing = {};
        headers.forEach(function (h, j) { billing[h.toLowerCase()] = rows[i][j]; });
        return { success: true, billing: billing };
      }
    }
    return { success: false, error: 'Billing not found: ' + billingId };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

// getReceiptFolderSafe_ consolidated to Utils.gs (PHMP v1 dedup)

function formatMoney_(value) {
  return Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getThaiMonthName_(monthIndex) {
  var months = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
                'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
  return months[monthIndex] || '';
}

// buildEmptyTaxSummary_ consolidated to Utils.gs (PHMP v1 dedup)
