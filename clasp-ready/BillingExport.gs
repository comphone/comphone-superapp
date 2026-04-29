// ============================================================
// COMPHONE SUPER APP v5.9.0-phase31a
// BillingExport.gs — Receipt PDF Generation & Export Utilities
// Extracted from BillingManager.gs (Phase 31 Refactoring)
// ============================================================

function generateReceiptPDF(data) {
  try {
    data = data || {};
    var jobId = String(data.job_id || data.jobId || '').trim();
    if (!jobId) return { success: false, error: 'job_id is required' };

    var billingResult = getBilling({ job_id: jobId });
    if (!billingResult.success) return billingResult;
    var billing = billingResult.billing;

    var receiptNo = String(data.receipt_no || billing.receipt_no || generateReceiptNumber_()).trim();
    var folder = getReceiptFolder_();
    var paidAt = data.paid_at || billing.paid_at || new Date();
    var paidDateText = formatDateTimeSafe_(paidAt);

    var htmlContent = buildReceiptHtml_(billing, receiptNo, jobId, paidDateText, data);
    var htmlBlob = Utilities.newBlob(htmlContent, 'text/html', 'Receipt-' + receiptNo + '-' + jobId + '.html');
    var pdfBlob = htmlBlob.getAs(MimeType.PDF).setName('Receipt-' + receiptNo + '-' + jobId + '.pdf');
    var pdfFile = folder.createFile(pdfBlob);

    updateBillingFieldsByJobId_(jobId, {
      Receipt_No: receiptNo,
      Receipt_File_ID: pdfFile.getId(),
      Receipt_URL: pdfFile.getUrl(),
      Updated_At: new Date()
    });

    return {
      success: true,
      receipt_no: receiptNo,
      file_id: pdfFile.getId(),
      receipt_url: pdfFile.getUrl()
    };
  } catch (e) {
    try { if (typeof _logError_ === 'function') _logError_('MEDIUM', 'generateReceiptPDF', e, {source: 'BILLING'}); } catch(_le) {}
    return { success: false, error: e.toString() };
  }
}

function getReceiptFolder_() {
  var folderId = getConfigSafe_('BILLING_RECEIPT_FOLDER_ID');
  if (folderId) {
    try { return DriveApp.getFolderById(folderId); } catch (e) { Logger.log('getReceiptFolder_ invalid folder id: ' + e); }
  }
  return DriveApp.getRootFolder();
}

function buildReceiptHtml_(billing, receiptNo, jobId, paidDateText, data) {
  try {
    data = data || {};
    var companyPhone = getConfigSafe_('COMPANY_PHONE') || '-';
    var companyAddress = getConfigSafe_('COMPANY_ADDRESS') || '\u0e23\u0e49\u0e32\u0e19\u0e04\u0e2d\u0e21\u0e42\u0e1f\u0e19';
    var promptpayId = billing.promptpay_biller_id || getConfigSafe_('PROMPTPAY_BILLER_ID') || '';
    var qrUrl = billing.promptpay_qr_url || '';
    var isPaid = (billing.payment_status === 'PAID');
    var discount = Number(billing.discount || 0);
    var balanceDue = Number(billing.balance_due || 0);
    var transactionRef = data.transaction_ref || billing.transaction_ref || '-';
    var invoiceDate = billing.invoice_date ? formatDateTimeSafe_(billing.invoice_date) : paidDateText;
    var receivedBy = data.received_by || getConfigSafe_('OWNER_NAME') || 'COMPHONE';

    var qrSection = '';
    if (qrUrl) {
      qrSection = '<div class="qr-box">' +
        '<img src="' + qrUrl + '" alt="PromptPay QR Code" />' +
        '<div class="qr-label">PromptPay: ' + promptpayId + '</div>' +
        '</div>';
    } else if (promptpayId) {
      var amount = Number(billing.balance_due || billing.total_amount || 0);
      var qrApiUrl = 'https://promptpay.io/' + promptpayId + '/' + amount + '.png';
      qrSection = '<div class="qr-box">' +
        '<img src="' + qrApiUrl + '" alt="PromptPay QR Code" />' +
        '<div class="qr-label">PromptPay: ' + promptpayId + '</div>' +
        '</div>';
    }

    var discountRow = discount > 0 ? '<tr><td>\u0e2a\u0e48\u0e27\u0e19\u0e25\u0e14 / Discount</td><td style="color:#E53935;">-' + formatMoneyText_(discount) + '</td></tr>' : '';
    var discountTotalRow = discount > 0 ? '<div class="total-row discount"><span>\u0e2a\u0e48\u0e27\u0e19\u0e25\u0e14</span><span>-' + formatMoneyText_(discount) + ' \u0e1a\u0e32\u0e17</span></div>' : '';
    var balanceRow = balanceDue > 0 ? '<div class="info-row" style="margin-bottom:6px;"><span class="info-label">\u0e04\u0e07\u0e40\u0e2b\u0e25\u0e37\u0e2d:</span><span class="info-value" style="color:#E53935;font-weight:bold;">' + formatMoneyText_(balanceDue) + ' \u0e1a\u0e32\u0e17</span></div>' : '';

    var paymentBadge = isPaid
      ? '<div class="paid-badge">\u2713 \u0e0a\u0e33\u0e23\u0e30\u0e40\u0e07\u0e34\u0e19\u0e41\u0e25\u0e49\u0e27 / PAID</div>'
      : '<div class="unpaid-badge">\u23f3 \u0e23\u0e2d\u0e0a\u0e33\u0e23\u0e30 / UNPAID</div>';

    var paymentMethod = data.payment_method || (billing.transaction_ref ? 'PromptPay / \u0e42\u0e2d\u0e19\u0e40\u0e07\u0e34\u0e19' : '\u0e40\u0e07\u0e34\u0e19\u0e2a\u0e14 / Cash');

    var template = '';
    try {
      template = HtmlService.createTemplateFromFile('ReceiptTemplate').getRawContent();
    } catch (e) {
      template = getReceiptHtmlFallback_();
    }

    template = template
      .replace(/{{COMPANY_PHONE}}/g, companyPhone)
      .replace(/{{COMPANY_ADDRESS}}/g, companyAddress)
      .replace(/{{RECEIPT_NO}}/g, receiptNo)
      .replace(/{{JOB_ID}}/g, jobId)
      .replace(/{{INVOICE_DATE}}/g, invoiceDate)
      .replace(/{{PAID_DATE}}/g, paidDateText)
      .replace(/{{CUSTOMER_NAME}}/g, billing.customer_name || '-')
      .replace(/{{PHONE}}/g, billing.phone || '-')
      .replace(/{{PARTS_DESCRIPTION}}/g, billing.parts_description || '-')
      .replace(/{{TRANSACTION_REF}}/g, transactionRef)
      .replace(/{{PARTS_COST}}/g, formatMoneyText_(billing.parts_cost))
      .replace(/{{LABOR_COST}}/g, formatMoneyText_(billing.labor_cost))
      .replace(/{{DISCOUNT_ROW}}/g, discountRow)
      .replace(/{{SUBTOTAL}}/g, formatMoneyText_(billing.subtotal || (Number(billing.parts_cost || 0) + Number(billing.labor_cost || 0))))
      .replace(/{{DISCOUNT_TOTAL_ROW}}/g, discountTotalRow)
      .replace(/{{TOTAL_AMOUNT}}/g, formatMoneyText_(billing.total_amount))
      .replace(/{{QR_CODE_SECTION}}/g, qrSection)
      .replace(/{{PAYMENT_BADGE}}/g, paymentBadge)
      .replace(/{{AMOUNT_PAID}}/g, formatMoneyText_(billing.amount_paid || billing.total_amount))
      .replace(/{{BALANCE_ROW}}/g, balanceRow)
      .replace(/{{PAYMENT_METHOD}}/g, paymentMethod)
      .replace(/{{RECEIVED_BY}}/g, receivedBy)
      .replace(/{{GENERATED_AT}}/g, Utilities.formatDate(new Date(), 'Asia/Bangkok', 'dd/MM/yyyy HH:mm'));

    return template;
  } catch (e) {
    Logger.log('buildReceiptHtml_ error: ' + e);
    return '<html><body><h1>Receipt ' + receiptNo + '</h1><p>Job: ' + jobId + '</p><p>Total: ' + formatMoneyText_(billing.total_amount) + '</p></body></html>';
  }
}

function getReceiptHtmlFallback_() {
  return '<!DOCTYPE html><html lang="th"><head><meta charset="UTF-8"><style>body{font-family:Tahoma,Arial,sans-serif;font-size:13px;padding:20px;max-width:700px;margin:0 auto}.header{text-align:center;border-bottom:3px solid #1565C0;padding-bottom:12px;margin-bottom:12px}.company{font-size:20px;font-weight:bold;color:#1565C0}.title{font-size:15px;font-weight:bold;margin-top:6px}.meta{display:flex;gap:12px;margin-bottom:12px}.meta-box{flex:1;background:#F5F5F5;border-radius:6px;padding:8px 12px}.meta-label{font-size:11px;color:#888}.meta-value{font-size:13px;font-weight:bold}table{width:100%;border-collapse:collapse;margin-bottom:10px}th{background:#1565C0;color:#fff;padding:7px 10px;text-align:left}td{padding:6px 10px;border-bottom:1px solid #EEE}td:last-child{text-align:right}.total-row{display:flex;justify-content:space-between;padding:5px 10px}.grand{background:#1565C0;color:#fff;font-weight:bold;font-size:15px;border-radius:4px;margin-top:4px;padding:8px 12px}.footer{text-align:center;margin-top:20px;color:#888;font-size:11px;border-top:1px solid #DDD;padding-top:10px}</style></head><body><div class="header"><div class="company">COMPHONE &amp; ELECTRONICS</div><div>{{COMPANY_ADDRESS}} | Tel: {{COMPANY_PHONE}}</div><div class="title">\u0e43\u0e1a\u0e40\u0e2a\u0e23\u0e47\u0e08\u0e23\u0e31\u0e1a\u0e40\u0e07\u0e34\u0e19 / RECEIPT</div></div><div class="meta"><div class="meta-box"><div class="meta-label">\u0e40\u0e25\u0e02\u0e17\u0e35\u0e48\u0e43\u0e1a\u0e40\u0e2a\u0e23\u0e47\u0e08</div><div class="meta-value">{{RECEIPT_NO}}</div></div><div class="meta-box"><div class="meta-label">\u0e40\u0e25\u0e02\u0e17\u0e35\u0e48\u0e07\u0e32\u0e19</div><div class="meta-value">{{JOB_ID}}</div></div><div class="meta-box"><div class="meta-label">\u0e27\u0e31\u0e19\u0e17\u0e35\u0e48\u0e0a\u0e33\u0e23\u0e30</div><div class="meta-value">{{PAID_DATE}}</div></div></div><p><b>\u0e25\u0e39\u0e01\u0e04\u0e49\u0e32:</b> {{CUSTOMER_NAME}} | <b>\u0e42\u0e17\u0e23:</b> {{PHONE}}</p><p><b>\u0e23\u0e32\u0e22\u0e25\u0e30\u0e40\u0e2d\u0e35\u0e22\u0e14:</b> {{PARTS_DESCRIPTION}}</p><table><tr><th>\u0e23\u0e32\u0e22\u0e01\u0e32\u0e23</th><th>\u0e08\u0e33\u0e19\u0e27\u0e19\u0e40\u0e07\u0e34\u0e19 (\u0e1a\u0e32\u0e17)</th></tr><tr><td>\u0e04\u0e48\u0e32\u0e2d\u0e30\u0e2b\u0e25\u0e48\u0e32</td><td>{{PARTS_COST}}</td></tr><tr><td>\u0e04\u0e48\u0e32\u0e41\u0e23\u0e07</td><td>{{LABOR_COST}}</td></tr>{{DISCOUNT_ROW}}</table><div class="total-row"><span>\u0e22\u0e2d\u0e14\u0e23\u0e27\u0e21\u0e01\u0e48\u0e2d\u0e19\u0e25\u0e14</span><span>{{SUBTOTAL}} \u0e1a\u0e32\u0e17</span></div>{{DISCOUNT_TOTAL_ROW}}<div class="total-row grand"><span>\u0e22\u0e2d\u0e14\u0e23\u0e27\u0e21\u0e2a\u0e38\u0e17\u0e18\u0e34</span><span>{{TOTAL_AMOUNT}} \u0e1a\u0e32\u0e17</span></div>{{QR_CODE_SECTION}}<p>{{PAYMENT_BADGE}} \u0e0a\u0e33\u0e23\u0e30\u0e41\u0e25\u0e49\u0e27: {{AMOUNT_PAID}} \u0e1a\u0e32\u0e17 {{BALANCE_ROW}}</p><p>\u0e27\u0e34\u0e18\u0e35\u0e0a\u0e33\u0e23\u0e30: {{PAYMENT_METHOD}} | Ref: {{TRANSACTION_REF}}</p><div class="footer">\u0e02\u0e2d\u0e1a\u0e04\u0e38\u0e13\u0e17\u0e35\u0e48\u0e43\u0e0a\u0e49\u0e1a\u0e23\u0e34\u0e01\u0e32\u0e23 | {{GENERATED_AT}}</div></body></html>';
}

// ─── Common Utility Functions ──────────────────────────────

function getCustomerLineUserIdByName_(customerName) {
  try {
    if (!customerName || typeof findCustomerRow_ !== 'function' || typeof ensureCustomerSheet_ !== 'function' || typeof getCustomerSheetContext_ !== 'function') return '';
    var ss = getComphoneSheet();
    if (!ss) return '';
    var sh = ensureCustomerSheet_(ss);
    var ctx = getCustomerSheetContext_(sh);
    var found = findCustomerRow_(sh, ctx, { customer_name: customerName });
    if (!found || found.rowIndex < 0 || !found.row) return '';
    return safeCellValue_(found.row, ctx.indices.lineUserId);
  } catch (e) {
    Logger.log('getCustomerLineUserIdByName_ error: ' + e);
    return '';
  }
}

function calculatePartsCostFromDescription_(partsDescription) {
  try {
    if (!partsDescription) return 0;
    var ss = getComphoneSheet();
    if (!ss) return 0;
    var sh = findSheetByName(ss, 'DB_INVENTORY');
    if (!sh || sh.getLastRow() < 2) return 0;

    var rows = sh.getDataRange().getValues();
    var headers = rows[0];
    var codeIdx = findHeaderIndex_(headers, ['Item_ID', 'Item_Code', 'Code', 'code', '\u0e23\u0e2b\u0e31\u0e2a', 'Barcode']);
    var nameIdx = findHeaderIndex_(headers, ['Item_Name', 'Name', 'name', '\u0e0a\u0e37\u0e48\u0e2d', '\u0e0a\u0e37\u0e48\u0e2d\u0e2a\u0e34\u0e19\u0e04\u0e49\u0e32']);
    var costIdx = findHeaderIndex_(headers, ['Cost', 'cost', 'Unit_Cost', 'unit_cost', '\u0e15\u0e49\u0e19\u0e17\u0e38\u0e19']);
    if (costIdx < 0) costIdx = 3;

    var total = 0;
    var items = String(partsDescription).split(',');
    for (var i = 0; i < items.length; i++) {
      var part = String(items[i] || '').trim();
      if (!part) continue;
      var split = part.split(':');
      var key = String(split[0] || '').trim();
      var qty = parseInt(split[1] || '1', 10);
      if (!(qty > 0)) qty = 1;

      for (var j = 1; j < rows.length; j++) {
        var code = codeIdx > -1 ? String(rows[j][codeIdx] || '').trim() : '';
        var name = nameIdx > -1 ? String(rows[j][nameIdx] || '').trim() : '';
        if (key === code || key === name) {
          total += normalizeMoneyValue_(rows[j][costIdx], 0) * qty;
          break;
        }
      }
    }
    return roundMoney_(total);
  } catch (e) {
    Logger.log('calculatePartsCostFromDescription_ error: ' + e);
    return 0;
  }
}

function extractLaborCostFromText_(text) {
  var match = String(text || '').match(/(?:\u0e04\u0e48\u0e32\u0e41\u0e23\u0e07|labor)\s*[:=]?\s*([0-9,]+(?:\.[0-9]+)?)/i);
  return match ? normalizeMoneyValue_(match[1], 0) : 0;
}

function extractPartsDescriptionFromText_(text) {
  var match = String(text || '').match(/(?:\u0e2d\u0e30\u0e2b\u0e25\u0e48\u0e32|parts)\s*[:=]\s*([^\n]+)/i);
  return match ? String(match[1] || '').trim() : '';
}

function generateBillingId_() {
  return 'B' + Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyyMMddHHmmss') + '-' + Math.floor(Math.random() * 900 + 100);
}

function generateReceiptNumber_() {
  return 'RC' + Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyyMMddHHmmss');
}

function normalizeMoneyValue_(value, fallback) {
  if (value === null || value === undefined || value === '') return roundMoney_(fallback || 0);
  var num = Number(String(value).replace(/,/g, ''));
  return isNaN(num) ? roundMoney_(fallback || 0) : roundMoney_(num);
}

function normalizeDigits_(value) {
  return String(value || '').replace(/\D/g, '');
}

function safeJsonStringify_(value) {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'string') return value;
  try { return JSON.stringify(value); } catch (e) { return String(value); }
}

function appendTimestampedNote_(oldText, newText) {
  var prefix = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd HH:mm:ss');
  var line = prefix + ' ' + newText;
  return oldText ? String(oldText) + '\n' + line : line;
}

function formatDateTimeSafe_(value) {
  if (!value) return '';
  if (value instanceof Date) return Utilities.formatDate(value, 'Asia/Bangkok', 'yyyy-MM-dd HH:mm:ss');
  var date = new Date(value);
  if (!isNaN(date.getTime())) return Utilities.formatDate(date, 'Asia/Bangkok', 'yyyy-MM-dd HH:mm:ss');
  return String(value);
}

function formatMoneyText_(value) {
  return normalizeMoneyValue_(value, 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getConfigSafe_(key) {
  try { return getConfig(key) || ''; } catch (e) { return ''; }
}

function mergeObjects_(base, extra) {
  var out = {};
  var k;
  for (k in base) if (base.hasOwnProperty(k)) out[k] = base[k];
  for (k in extra) if (extra.hasOwnProperty(k)) out[k] = extra[k];
  return out;
}
