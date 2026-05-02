// ============================================================
// COMPHONE SUPER APP v5.9.0-phase31a
// BillingCore.gs — Billing CRUD, Sheet Context, Row Management
// Extracted from BillingManager.gs (Phase 31 Refactoring)
// ============================================================

var BILLING_SHEET_NAME = 'DB_BILLING';
var BILLING_DEFAULT_HEADERS = [
  'Billing_ID', 'Job_ID', 'Customer_Name', 'Phone', 'Parts_Description', 'Parts_Cost',
  'Labor_Cost', 'Subtotal', 'Discount', 'Total_Amount', 'Amount_Paid', 'Balance_Due',
  'Payment_Status', 'PromptPay_Biller_ID', 'PromptPay_Payload', 'PromptPay_QR_URL',
  'Slip_Image_URL', 'Slip_Payload', 'Transaction_Ref', 'Receipt_No', 'Receipt_File_ID',
  'Receipt_URL', 'Invoice_Date', 'Paid_At', 'Created_At', 'Updated_At', 'Notes'
];

function createBillingPhase2_(jobId, parts, labor) {
  return autoGenerateBillingForJob(jobId, {
    parts: parts || '',
    labor_cost: Number(labor || 0),
    source: 'JobsHandler'
  });
}

function autoGenerateBillingForJob(jobId, options) {
  try {
    options = options || {};
    jobId = String(jobId || options.job_id || options.jobId || '').trim();
    if (!jobId) return { success: false, error: 'job_id is required' };

    var snapshot = buildBillingSnapshotFromJob_(jobId, options);
    if (!snapshot.success) return snapshot;

    var upsert = upsertBillingRecord_(snapshot.billing);
    if (!upsert.success) return upsert;

    var qr = generatePromptPayQR({
      job_id: jobId,
      biller_id: snapshot.billing.promptpay_biller_id,
      amount: snapshot.billing.balance_due || snapshot.billing.total_amount,
      size: options.qr_size || 360,
      silent_update: true
    });

    return {
      success: true,
      action: upsert.action,
      billing: getBilling({ job_id: jobId }).billing,
      qr: qr
    };
  } catch (e) {
    try { if (typeof _logError_ === 'function') _logError_('MEDIUM', 'autoGenerateBillingForJob', e, {source: 'BILLING'}); } catch(_le) {}
    return { success: false, error: e.toString() };
  }
}

function getBilling(data) {
  try {
    data = data || {};
    var jobId = String(data.job_id || data.jobId || '').trim();
    if (!jobId) return { success: false, error: 'job_id is required' };

    var ss = getComphoneSheet();
    if (!ss) return { success: false, error: 'Spreadsheet not found' };
    var sh = ensureBillingSheet_(ss);
    var ctx = getBillingSheetContext_(sh);
    var rowIndex = findBillingRowIndexByJobId_(sh, ctx, jobId);
    if (rowIndex < 0) return { success: false, error: 'Billing not found for job_id: ' + jobId };

    var row = sh.getRange(rowIndex, 1, 1, ctx.headers.length).getValues()[0];
    return {
      success: true,
      row_index: rowIndex,
      billing: buildBillingObjectFromRow_(row, ctx.indices)
    };
  } catch (e) {
    try { if (typeof _logError_ === 'function') _logError_('MEDIUM', 'getBilling', e, {source: 'BILLING'}); } catch(_le) {}
    return { success: false, error: e.toString() };
  }
}

function buildBillingSnapshotFromJob_(jobId, options) {
  try {
    options = options || {};
    var detail = typeof getJobDetailById_ === 'function' ? getJobDetailById_(jobId) : null;
    if (!detail || !detail.success) return { success: false, error: 'Job not found: ' + jobId };

    var existing = getBilling({ job_id: jobId });
    var job = detail.job || {};
    var partsDescription = options.parts || options.parts_description || (existing.success ? existing.billing.parts_description : '') || extractPartsDescriptionFromText_(job.note || '');
    var partsCost = normalizeMoneyValue_(options.parts_cost, existing.success ? existing.billing.parts_cost : calculatePartsCostFromDescription_(partsDescription));
    var laborCost = normalizeMoneyValue_(options.labor_cost, existing.success ? existing.billing.labor_cost : extractLaborCostFromText_(job.note || ''));
    var subtotal = roundMoney_(partsCost + laborCost);
    var discount = normalizeMoneyValue_(options.discount, existing.success ? existing.billing.discount : 0);
    var subtotalAfterDiscount = roundMoney_(subtotal - discount);

    var taxResult = null;
    if (typeof calculateTax === 'function') {
      taxResult = calculateTax({
        subtotal: subtotalAfterDiscount,
        tax_mode: options.tax_mode || getConfigSafe_('TAX_MODE') || 'VAT7',
        wht_rate: options.wht_rate ? parseFloat(options.wht_rate) : null,
        apply_wht: options.apply_wht || false
      });
    }
    var vatAmount = taxResult ? (taxResult.vat_amount || 0) : 0;
    var whtAmount = taxResult ? (taxResult.wht_amount || 0) : 0;
    var netPayable = taxResult ? (taxResult.net_payable || subtotalAfterDiscount) : subtotalAfterDiscount;
    var totalAmount = normalizeMoneyValue_(options.total_amount, existing.success ? existing.billing.total_amount : netPayable);
    var amountPaid = normalizeMoneyValue_(options.amount_paid, existing.success ? existing.billing.amount_paid : 0);
    var balanceDue = roundMoney_(Math.max(0, totalAmount - amountPaid));
    var promptPayId = options.biller_id || options.promptpay_biller_id || getConfigSafe_('PROMPTPAY_BILLER_ID') || getConfigSafe_('PROMPTPAY_ID');
    var paymentStatus = balanceDue <= 0 && totalAmount > 0 ? 'PAID' : (amountPaid > 0 ? 'PARTIAL' : 'UNPAID');
    var customerLine = getCustomerLineUserIdByName_(job.customer_name || '');

    var billing = {
      billing_id: existing.success ? existing.billing.billing_id : generateBillingId_(),
      job_id: jobId,
      customer_name: job.customer_name || '',
      phone: extractPhoneFromText_(job.note || '') || (existing.success ? existing.billing.phone : ''),
      parts_description: partsDescription || '-',
      parts_cost: partsCost,
      labor_cost: laborCost,
      subtotal: subtotal,
      discount: discount,
      vat_amount: vatAmount,
      wht_amount: whtAmount,
      total_amount: totalAmount,
      amount_paid: amountPaid,
      balance_due: balanceDue,
      payment_status: paymentStatus,
      promptpay_biller_id: promptPayId || '',
      promptpay_payload: existing.success ? existing.billing.promptpay_payload : '',
      promptpay_qr_url: existing.success ? existing.billing.promptpay_qr_url : '',
      slip_image_url: existing.success ? existing.billing.slip_image_url : '',
      slip_payload: existing.success ? existing.billing.slip_payload : '',
      transaction_ref: existing.success ? existing.billing.transaction_ref : '',
      receipt_no: existing.success ? existing.billing.receipt_no : '',
      receipt_file_id: existing.success ? existing.billing.receipt_file_id : '',
      receipt_url: existing.success ? existing.billing.receipt_url : '',
      invoice_date: existing.success ? existing.billing.invoice_date : new Date(),
      paid_at: existing.success ? existing.billing.paid_at : '',
      created_at: existing.success ? existing.billing.created_at : new Date(),
      updated_at: new Date(),
      notes: appendTimestampedNote_(existing.success ? existing.billing.notes : '', 'Billing synced from job state ' + (job.status_label || '')),
      customer_line_user_id: customerLine
    };

    return { success: true, billing: billing, job: job };
  } catch (e) {
    try { if (typeof _logError_ === 'function') _logError_('MEDIUM', 'buildBillingSnapshotFromJob_', e, {source: 'BILLING'}); } catch(_le) {}
    return { success: false, error: e.toString() };
  }
}

function upsertBillingRecord_(billing) {
  try {
    var ss = getComphoneSheet();
    if (!ss) return { success: false, error: 'Spreadsheet not found' };
    var sh = ensureBillingSheet_(ss);
    var ctx = getBillingSheetContext_(sh);
    var rowIndex = findBillingRowIndexByJobId_(sh, ctx, billing.job_id);
    var row = rowIndex > -1 ? sh.getRange(rowIndex, 1, 1, ctx.headers.length).getValues()[0] : createEmptyRow_(ctx.headers.length);

    fillBillingRow_(row, ctx.indices, billing);

    if (rowIndex > -1) {
      sh.getRange(rowIndex, 1, 1, ctx.headers.length).setValues([row]);
      return { success: true, action: 'updated', row_index: rowIndex };
    }

    sh.appendRow(row);
    return { success: true, action: 'created', row_index: sh.getLastRow() };
  } catch (e) {
    try { if (typeof _logError_ === 'function') _logError_('MEDIUM', 'upsertBillingRecord_', e, {source: 'BILLING'}); } catch(_le) {}
    return { success: false, error: e.toString() };
  }
}

function updateBillingFieldsByJobId_(jobId, fields) {
  try {
    var ss = getComphoneSheet();
    if (!ss) return { success: false, error: 'Spreadsheet not found' };
    var sh = ensureBillingSheet_(ss);
    var ctx = getBillingSheetContext_(sh);
    var rowIndex = findBillingRowIndexByJobId_(sh, ctx, jobId);
    if (rowIndex < 0) return { success: false, error: 'Billing not found for job_id: ' + jobId };

    var row = sh.getRange(rowIndex, 1, 1, ctx.headers.length).getValues()[0];
    for (var key in fields) {
      if (!fields.hasOwnProperty(key)) continue;
      var index = ctx.fieldToIndex[key];
      if (index > -1) row[index] = fields[key];
    }
    sh.getRange(rowIndex, 1, 1, ctx.headers.length).setValues([row]);
    return { success: true, row_index: rowIndex };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

function listAllBillings_(options) {
  try {
    options = options || {};
    var ss = getComphoneSheet();
    if (!ss) return { success: false, error: 'Spreadsheet not found' };
    var sh = ensureBillingSheet_(ss);
    var ctx = getBillingSheetContext_(sh);
    var all = sh.getDataRange().getValues();
    var billings = [];
    for (var i = 1; i < all.length; i++) {
      var row = all[i];
      if (!row[0]) continue;
      billings.push(buildBillingObjectFromRow_(row, ctx.indices));
    }
    if (options.status) {
      billings = billings.filter(function(b) { return b.payment_status === options.status; });
    }
    billings.sort(function(a, b) { return new Date(b.created_at) - new Date(a.created_at); });
    return { success: true, billings: billings, count: billings.length };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

// ─── SHEET HELPERS ─────────────────────────────────────────

function ensureBillingSheet_(ss) {
  var sh = findSheetByName(ss, BILLING_SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(BILLING_SHEET_NAME);
    sh.getRange(1, 1, 1, BILLING_DEFAULT_HEADERS.length).setValues([BILLING_DEFAULT_HEADERS]);
    return sh;
  }
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, BILLING_DEFAULT_HEADERS.length).setValues([BILLING_DEFAULT_HEADERS]);
    return sh;
  }
  var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var missing = [];
  for (var i = 0; i < BILLING_DEFAULT_HEADERS.length; i++) {
    if (findHeaderIndex_(headers, [BILLING_DEFAULT_HEADERS[i]]) === -1) missing.push(BILLING_DEFAULT_HEADERS[i]);
  }
  if (missing.length > 0) {
    sh.getRange(1, headers.length + 1, 1, missing.length).setValues([missing]);
  }
  return sh;
}

function getBillingSheetContext_(sh) {
  var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var indices = {
    billingId:        findHeaderIndex_(headers, ['Billing_ID', 'billing_id']),
    jobId:            findHeaderIndex_(headers, ['Job_ID', 'job_id', 'JobID']),
    customerName:     findHeaderIndex_(headers, ['Customer_Name', 'customer_name', '\u0e0a\u0e37\u0e48\u0e2d\u0e25\u0e39\u0e01\u0e04\u0e49\u0e32']),
    phone:            findHeaderIndex_(headers, ['Phone', 'phone', '\u0e40\u0e1a\u0e2d\u0e23\u0e4c\u0e42\u0e17\u0e23']),
    partsDescription: findHeaderIndex_(headers, ['Parts_Description', 'parts_description', '\u0e23\u0e32\u0e22\u0e01\u0e32\u0e23\u0e2d\u0e30\u0e2b\u0e25\u0e48\u0e32']),
    partsCost:        findHeaderIndex_(headers, ['Parts_Cost', 'parts_cost', '\u0e04\u0e48\u0e32\u0e2d\u0e30\u0e2b\u0e25\u0e48\u0e32']),
    laborCost:        findHeaderIndex_(headers, ['Labor_Cost', 'labor_cost', '\u0e04\u0e48\u0e32\u0e41\u0e23\u0e07']),
    subtotal:         findHeaderIndex_(headers, ['Subtotal', 'subtotal']),
    discount:         findHeaderIndex_(headers, ['Discount', 'discount', '\u0e2a\u0e48\u0e27\u0e19\u0e25\u0e14']),
    vatAmount:        findHeaderIndex_(headers, ['VAT_Amount', 'vat_amount', 'VAT']),
    whtAmount:        findHeaderIndex_(headers, ['WHT_Amount', 'wht_amount', 'WHT']),
    totalAmount:      findHeaderIndex_(headers, ['Total_Amount', 'total_amount', '\u0e23\u0e27\u0e21', '\u0e22\u0e2d\u0e14\u0e23\u0e27\u0e21']),
    amountPaid:       findHeaderIndex_(headers, ['Amount_Paid', 'amount_paid', '\u0e22\u0e2d\u0e14\u0e0a\u0e33\u0e23\u0e30']),
    balanceDue:       findHeaderIndex_(headers, ['Balance_Due', 'balance_due', '\u0e04\u0e07\u0e40\u0e2b\u0e25\u0e37\u0e2d']),
    paymentStatus:    findHeaderIndex_(headers, ['Payment_Status', 'payment_status', '\u0e2a\u0e16\u0e32\u0e19\u0e30\u0e01\u0e32\u0e23\u0e0a\u0e33\u0e23\u0e30']),
    promptpayBillerId:findHeaderIndex_(headers, ['PromptPay_Biller_ID', 'promptpay_biller_id']),
    promptpayPayload: findHeaderIndex_(headers, ['PromptPay_Payload', 'promptpay_payload']),
    promptpayQrUrl:   findHeaderIndex_(headers, ['PromptPay_QR_URL', 'promptpay_qr_url']),
    slipImageUrl:     findHeaderIndex_(headers, ['Slip_Image_URL', 'slip_image_url']),
    slipPayload:      findHeaderIndex_(headers, ['Slip_Payload', 'slip_payload']),
    transactionRef:   findHeaderIndex_(headers, ['Transaction_Ref', 'transaction_ref']),
    receiptNo:        findHeaderIndex_(headers, ['Receipt_No', 'receipt_no']),
    receiptFileId:    findHeaderIndex_(headers, ['Receipt_File_ID', 'receipt_file_id']),
    receiptUrl:       findHeaderIndex_(headers, ['Receipt_URL', 'receipt_url']),
    invoiceDate:      findHeaderIndex_(headers, ['Invoice_Date', 'invoice_date']),
    paidAt:           findHeaderIndex_(headers, ['Paid_At', 'paid_at']),
    createdAt:        findHeaderIndex_(headers, ['Created_At', 'created_at']),
    updatedAt:        findHeaderIndex_(headers, ['Updated_At', 'updated_at']),
    notes:            findHeaderIndex_(headers, ['Notes', 'notes', '\u0e2b\u0e21\u0e32\u0e22\u0e40\u0e2b\u0e15\u0e38'])
  };

  return {
    headers: headers,
    indices: indices,
    fieldToIndex: {
      Billing_ID: indices.billingId, Job_ID: indices.jobId, Customer_Name: indices.customerName,
      Phone: indices.phone, Parts_Description: indices.partsDescription, Parts_Cost: indices.partsCost,
      Labor_Cost: indices.laborCost, Subtotal: indices.subtotal, Discount: indices.discount,
      VAT_Amount: indices.vatAmount, WHT_Amount: indices.whtAmount, Total_Amount: indices.totalAmount,
      Amount_Paid: indices.amountPaid, Balance_Due: indices.balanceDue, Payment_Status: indices.paymentStatus,
      PromptPay_Biller_ID: indices.promptpayBillerId, PromptPay_Payload: indices.promptpayPayload,
      PromptPay_QR_URL: indices.promptpayQrUrl, Slip_Image_URL: indices.slipImageUrl,
      Slip_Payload: indices.slipPayload, Transaction_Ref: indices.transactionRef,
      Receipt_No: indices.receiptNo, Receipt_File_ID: indices.receiptFileId, Receipt_URL: indices.receiptUrl,
      Invoice_Date: indices.invoiceDate, Paid_At: indices.paidAt, Created_At: indices.createdAt,
      Updated_At: indices.updatedAt, Notes: indices.notes
    }
  };
}

function buildBillingObjectFromRow_(row, indices) {
  return {
    billing_id: safeCellValue_(row, indices.billingId), job_id: safeCellValue_(row, indices.jobId),
    customer_name: safeCellValue_(row, indices.customerName), phone: safeCellValue_(row, indices.phone),
    parts_description: safeCellValue_(row, indices.partsDescription),
    parts_cost: normalizeMoneyValue_(safeCellRaw_(row, indices.partsCost), 0),
    labor_cost: normalizeMoneyValue_(safeCellRaw_(row, indices.laborCost), 0),
    subtotal: normalizeMoneyValue_(safeCellRaw_(row, indices.subtotal), 0),
    discount: normalizeMoneyValue_(safeCellRaw_(row, indices.discount), 0),
    total_amount: normalizeMoneyValue_(safeCellRaw_(row, indices.totalAmount), 0),
    amount_paid: normalizeMoneyValue_(safeCellRaw_(row, indices.amountPaid), 0),
    balance_due: normalizeMoneyValue_(safeCellRaw_(row, indices.balanceDue), 0),
    payment_status: safeCellValue_(row, indices.paymentStatus),
    promptpay_biller_id: safeCellValue_(row, indices.promptpayBillerId),
    promptpay_payload: safeCellValue_(row, indices.promptpayPayload),
    promptpay_qr_url: safeCellValue_(row, indices.promptpayQrUrl),
    slip_image_url: safeCellValue_(row, indices.slipImageUrl),
    slip_payload: safeCellValue_(row, indices.slipPayload),
    transaction_ref: safeCellValue_(row, indices.transactionRef),
    receipt_no: safeCellValue_(row, indices.receiptNo),
    receipt_file_id: safeCellValue_(row, indices.receiptFileId),
    receipt_url: safeCellValue_(row, indices.receiptUrl),
    invoice_date: formatDateTimeSafe_(safeCellRaw_(row, indices.invoiceDate)),
    paid_at: formatDateTimeSafe_(safeCellRaw_(row, indices.paidAt)),
    created_at: formatDateTimeSafe_(safeCellRaw_(row, indices.createdAt)),
    updated_at: formatDateTimeSafe_(safeCellRaw_(row, indices.updatedAt)),
    notes: safeCellValue_(row, indices.notes)
  };
}

function fillBillingRow_(row, indices, billing) {
  setIfIndex_(row, indices.billingId, billing.billing_id);
  setIfIndex_(row, indices.jobId, billing.job_id);
  setIfIndex_(row, indices.customerName, billing.customer_name);
  setIfIndex_(row, indices.phone, billing.phone);
  setIfIndex_(row, indices.partsDescription, billing.parts_description);
  setIfIndex_(row, indices.partsCost, billing.parts_cost);
  setIfIndex_(row, indices.laborCost, billing.labor_cost);
  setIfIndex_(row, indices.subtotal, billing.subtotal);
  setIfIndex_(row, indices.discount, billing.discount);
  setIfIndex_(row, indices.vatAmount, billing.vat_amount || 0);
  setIfIndex_(row, indices.whtAmount, billing.wht_amount || 0);
  setIfIndex_(row, indices.totalAmount, billing.total_amount);
  setIfIndex_(row, indices.amountPaid, billing.amount_paid);
  setIfIndex_(row, indices.balanceDue, billing.balance_due);
  setIfIndex_(row, indices.paymentStatus, billing.payment_status);
  setIfIndex_(row, indices.promptpayBillerId, billing.promptpay_biller_id);
  setIfIndex_(row, indices.promptpayPayload, billing.promptpay_payload);
  setIfIndex_(row, indices.promptpayQrUrl, billing.promptpay_qr_url);
  setIfIndex_(row, indices.slipImageUrl, billing.slip_image_url);
  setIfIndex_(row, indices.slipPayload, billing.slip_payload);
  setIfIndex_(row, indices.transactionRef, billing.transaction_ref);
  setIfIndex_(row, indices.receiptNo, billing.receipt_no);
  setIfIndex_(row, indices.receiptFileId, billing.receipt_file_id);
  setIfIndex_(row, indices.receiptUrl, billing.receipt_url);
  setIfIndex_(row, indices.invoiceDate, billing.invoice_date);
  setIfIndex_(row, indices.paidAt, billing.paid_at);
  setIfIndex_(row, indices.createdAt, billing.created_at);
  setIfIndex_(row, indices.updatedAt, billing.updated_at);
  setIfIndex_(row, indices.notes, billing.notes);
}

function findBillingRowIndexByJobId_(sh, ctx, jobId) {
  var lastRow = sh.getLastRow();
  if (lastRow < 2) return -1;
  var idx = ctx.indices.jobId > -1 ? ctx.indices.jobId : 0;
  var values = sh.getRange(2, idx + 1, lastRow - 1, 1).getValues();
  for (var i = 0; i < values.length; i++) {
    if (String(values[i][0] || '').trim() === String(jobId)) return i + 2;
  }
    return -1;
}

function getCustomerReceipts(data) {
  try {
    var customerId = (data || {}).customer_id || '';
    if (!customerId) {
      return { success: false, error: 'customer_id is required' };
    }
    // ใช้ listAllBillings_ แลัว filter ด้วย job_id ที่ลูกค้าเคยใช้
    // เนื่องจาก DB_BILLING ไม่มี customer_id โดยตรง ใช้วิธีดึงจาก job ที่ลูกค้าเป็นเจ้าของ
    var ss = getComphoneSheet();
    if (!ss) return { success: false, error: 'Spreadsheet not found' };
    var jobSh = findSheetByName(ss, 'DB_JOBS');
    if (!jobSh) return { success: false, error: 'Jobs sheet not found' };
    var jobs = jobSh.getDataRange().getValues();
    var jobIndices = getJobSheetContext_(jobSh).indices;
    var customerJobs = [];
    for (var i = 1; i < jobs.length; i++) {
      if (String(jobs[i][jobIndices.customerId] || '') === customerId) {
        customerJobs.push(String(jobs[i][jobIndices.jobId] || ''));
      }
    }
    var billingResult = listAllBillings_({});
    if (!billingResult.success) return billingResult;
    var receipts = billingResult.billings.filter(function(b) {
      return customerJobs.indexOf(b.job_id) !== -1;
    }).map(function(b) {
      return {
        receipt_no: b.receipt_no || '',
        billing_id: b.billing_id || '',
        job_id: b.job_id || '',
        total_amount: b.total_amount || 0,
        amount_paid: b.amount_paid || 0,
        balance_due: b.balance_due || 0,
        payment_status: b.payment_status || '',
        receipt_url: b.receipt_url || '',
        invoice_date: b.invoice_date || '',
        created_at: b.created_at || ''
      };
    });
    return { success: true, receipts: receipts, count: receipts.length };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}
