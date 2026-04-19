// ============================================================
// COMPHONE SUPER APP V5.5
// ============================================================
// BillingManager.gs - Billing & Payment Automation
// ============================================================

var BILLING_SHEET_NAME = 'DB_BILLING';
var BILLING_DEFAULT_HEADERS = [
  'Billing_ID',
  'Job_ID',
  'Customer_Name',
  'Phone',
  'Parts_Description',
  'Parts_Cost',
  'Labor_Cost',
  'Subtotal',
  'Discount',
  'Total_Amount',
  'Amount_Paid',
  'Balance_Due',
  'Payment_Status',
  'PromptPay_Biller_ID',
  'PromptPay_Payload',
  'PromptPay_QR_URL',
  'Slip_Image_URL',
  'Slip_Payload',
  'Transaction_Ref',
  'Receipt_No',
  'Receipt_File_ID',
  'Receipt_URL',
  'Invoice_Date',
  'Paid_At',
  'Created_At',
  'Updated_At',
  'Notes'
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
    return { success: false, error: e.toString() };
  }
}

function generatePromptPayQR(data) {
  try {
    data = data || {};
    var jobId = String(data.job_id || data.jobId || '').trim();
    var amount = data.amount;
    var billerId = data.biller_id || data.promptpay_id || data.target || getConfigSafe_('PROMPTPAY_BILLER_ID') || getConfigSafe_('PROMPTPAY_ID');

    if (jobId) {
      var billingResult = getBilling({ job_id: jobId });
      if (billingResult.success) {
        amount = normalizeMoneyValue_(amount, billingResult.billing.balance_due || billingResult.billing.total_amount);
        billerId = billerId || billingResult.billing.promptpay_biller_id;
      }
    }

    if (!billerId) return { success: false, error: 'PromptPay biller id is required (PROMPTPAY_BILLER_ID)' };
    amount = normalizeMoneyValue_(amount, 0);
    if (amount <= 0) return { success: false, error: 'amount must be greater than 0' };

    var normalized = normalizePromptPayTarget_(billerId);
    if (!normalized.success) return normalized;

    var payload = buildPromptPayPayload_(normalized.value, amount, normalized.type);
    var size = Math.max(200, parseInt(data.size || 300, 10));
    var qrImageUrl = buildPromptPayQrImageUrl_(payload, size);

    if (jobId) {
      updateBillingFieldsByJobId_(jobId, {
        PromptPay_Biller_ID: normalized.raw,
        PromptPay_Payload: payload,
        PromptPay_QR_URL: qrImageUrl,
        Updated_At: new Date()
      });
    }

    return {
      success: true,
      job_id: jobId || '',
      amount: amount,
      biller_id: normalized.raw,
      biller_type: normalized.type,
      promptpay_payload: payload,
      qr_image_url: qrImageUrl
    };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

function verifyPaymentSlip(data) {
  try {
    data = data || {};
    var jobId = String(data.job_id || data.jobId || '').trim();
    if (!jobId) return { success: false, error: 'job_id is required' };

    var billingResult = getBilling({ job_id: jobId });
    if (!billingResult.success) return billingResult;
    var billing = billingResult.billing;

    var verification = callSlipVerificationApi_(data, billing);
    if (!verification.success) return verification;

    var expectedAmount = normalizeMoneyValue_(data.expected_amount, billing.balance_due || billing.total_amount);
    var expectedReceiver = normalizeDigits_(data.expected_receiver || billing.promptpay_biller_id || getConfigSafe_('PROMPTPAY_BILLER_ID'));
    var actualAmount = normalizeMoneyValue_(verification.amount, 0);
    var actualReceiver = normalizeDigits_(verification.receiver || verification.receiver_account || verification.receiver_proxy || '');

    var amountMatched = Math.abs(actualAmount - expectedAmount) < 0.01;
    var receiverMatched = !expectedReceiver || !actualReceiver || actualReceiver.indexOf(expectedReceiver) > -1 || expectedReceiver.indexOf(actualReceiver) > -1;
    var verified = amountMatched && receiverMatched;

    updateBillingFieldsByJobId_(jobId, {
      Slip_Image_URL: data.slip_image_url || data.slip_url || data.image_url || '',
      Slip_Payload: safeJsonStringify_(verification.raw || verification),
      Transaction_Ref: verification.transaction_ref || verification.ref || '',
      Updated_At: new Date(),
      Notes: appendTimestampedNote_('', 'Slip verification: ' + (verified ? 'VERIFIED' : 'MISMATCH'))
    });

    if (!verified) {
      return {
        success: false,
        verified: false,
        error: 'Slip verification mismatch',
        expected_amount: expectedAmount,
        actual_amount: actualAmount,
        expected_receiver: expectedReceiver,
        actual_receiver: actualReceiver,
        verification: verification
      };
    }

    var paid = markBillingPaid({
      job_id: jobId,
      amount_paid: actualAmount,
      transaction_ref: verification.transaction_ref || verification.ref || '',
      slip_image_url: data.slip_image_url || data.slip_url || data.image_url || '',
      slip_payload: verification.raw || verification,
      changed_by: data.changed_by || data.user || 'SLIP_API',
      skip_job_transition: true,
      generate_receipt: data.generate_receipt !== false
    });

    return {
      success: !!(paid && paid.success),
      verified: true,
      billing: paid.billing,
      receipt: paid.receipt,
      verification: verification
    };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

function markBillingPaid(data) {
  try {
    data = data || {};
    var jobId = String(data.job_id || data.jobId || '').trim();
    if (!jobId) return { success: false, error: 'job_id is required' };

    var billingResult = getBilling({ job_id: jobId });
    if (!billingResult.success) return billingResult;
    var billing = billingResult.billing;

    var amountPaid = normalizeMoneyValue_(data.amount_paid, billing.total_amount);
    var newPaid = Math.max(amountPaid, 0);
    var balance = Math.max(0, roundMoney_(billing.total_amount - newPaid));
    var paymentStatus = balance <= 0 ? 'PAID' : (newPaid > 0 ? 'PARTIAL' : 'UNPAID');

    updateBillingFieldsByJobId_(jobId, {
      Amount_Paid: newPaid,
      Balance_Due: balance,
      Payment_Status: paymentStatus,
      Slip_Image_URL: data.slip_image_url || billing.slip_image_url || '',
      Slip_Payload: safeJsonStringify_(data.slip_payload || billing.slip_payload || ''),
      Transaction_Ref: data.transaction_ref || billing.transaction_ref || '',
      Paid_At: newPaid > 0 ? new Date() : '',
      Updated_At: new Date(),
      Notes: appendTimestampedNote_(billing.notes, 'Payment status updated to ' + paymentStatus)
    });

    var receipt = null;
    if (paymentStatus === 'PAID' && data.generate_receipt !== false) {
      receipt = generateReceiptPDF({
        job_id: jobId,
        receipt_no: data.receipt_no || '',
        transaction_ref: data.transaction_ref || billing.transaction_ref || '',
        paid_at: data.paid_at || new Date()
      });
    }

    var updated = getBilling({ job_id: jobId });

    if (paymentStatus === 'PAID' && data.skip_job_transition !== true && typeof transitionJob === 'function') {
      try {
        var jobDetail = typeof getJobDetailById_ === 'function' ? getJobDetailById_(jobId) : null;
        if (jobDetail && jobDetail.success && Number(jobDetail.job.current_status_code || 0) === 10) {
          transitionJob(jobId, 11, {
            changed_by: data.changed_by || data.user || 'BillingManager',
            note: 'ระบบยืนยันการชำระเงินแล้ว',
            source: 'BillingManager'
          });
        }
      } catch (transitionErr) {
        Logger.log('markBillingPaid transition error: ' + transitionErr);
      }
    }

    /* LINE Notify เมื่อชำระเงินสำเร็ఈ */
    if (paymentStatus === 'PAID') {
      try {
        var msg = '✅ ชำระเงินแล้ว!\n' +
          '📋 งาน: ' + jobId + '\n' +
          '👤 ลูกค้า: ' + (billing.customer_name || '-') + '\n' +
          '💰 ยอด: ฿' + newPaid.toLocaleString() + '\n' +
          '🕒 ' + getThaiTimestamp();
        if (typeof sendLineNotify === 'function') sendLineNotify({ message: msg, room: 'OWNER' });
      } catch(lineErr) { Logger.log('LINE notify error: ' + lineErr); }
      try { writeAuditLog('PAYMENT_RECEIVED', jobId, 'ยอด=' + newPaid, data.changed_by || 'system'); } catch(e2) {}
    }
    return {
      success: true,
      job_id: jobId,
      billing: updated.success ? updated.billing : null,
      receipt: receipt
    };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

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

    // สร้าง HTML ใบเสร็จสวยงาม
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

    // ── Auto-Tax: เรียก TaxEngine คำนวณ VAT/WHT อัตโนมัติ ──
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
    billingId: findHeaderIndex_(headers, ['Billing_ID', 'billing_id']),
    jobId: findHeaderIndex_(headers, ['Job_ID', 'job_id', 'JobID']),
    customerName: findHeaderIndex_(headers, ['Customer_Name', 'customer_name', 'ชื่อลูกค้า']),
    phone: findHeaderIndex_(headers, ['Phone', 'phone', 'เบอร์โทร']),
    partsDescription: findHeaderIndex_(headers, ['Parts_Description', 'parts_description', 'รายการอะไหล่']),
    partsCost: findHeaderIndex_(headers, ['Parts_Cost', 'parts_cost', 'ค่าอะไหล่']),
    laborCost: findHeaderIndex_(headers, ['Labor_Cost', 'labor_cost', 'ค่าแรง']),
    subtotal: findHeaderIndex_(headers, ['Subtotal', 'subtotal']),
    discount: findHeaderIndex_(headers, ['Discount', 'discount', 'ส่วนลด']),
    vatAmount: findHeaderIndex_(headers, ['VAT_Amount', 'vat_amount', 'VAT']),
    whtAmount: findHeaderIndex_(headers, ['WHT_Amount', 'wht_amount', 'WHT']),
    totalAmount: findHeaderIndex_(headers, ['Total_Amount', 'total_amount', 'รวม', 'ยอดรวม']),
    amountPaid: findHeaderIndex_(headers, ['Amount_Paid', 'amount_paid', 'ยอดชำระ']),
    balanceDue: findHeaderIndex_(headers, ['Balance_Due', 'balance_due', 'คงเหลือ']),
    paymentStatus: findHeaderIndex_(headers, ['Payment_Status', 'payment_status', 'สถานะการชำระ']),
    promptpayBillerId: findHeaderIndex_(headers, ['PromptPay_Biller_ID', 'promptpay_biller_id']),
    promptpayPayload: findHeaderIndex_(headers, ['PromptPay_Payload', 'promptpay_payload']),
    promptpayQrUrl: findHeaderIndex_(headers, ['PromptPay_QR_URL', 'promptpay_qr_url']),
    slipImageUrl: findHeaderIndex_(headers, ['Slip_Image_URL', 'slip_image_url']),
    slipPayload: findHeaderIndex_(headers, ['Slip_Payload', 'slip_payload']),
    transactionRef: findHeaderIndex_(headers, ['Transaction_Ref', 'transaction_ref']),
    receiptNo: findHeaderIndex_(headers, ['Receipt_No', 'receipt_no']),
    receiptFileId: findHeaderIndex_(headers, ['Receipt_File_ID', 'receipt_file_id']),
    receiptUrl: findHeaderIndex_(headers, ['Receipt_URL', 'receipt_url']),
    invoiceDate: findHeaderIndex_(headers, ['Invoice_Date', 'invoice_date']),
    paidAt: findHeaderIndex_(headers, ['Paid_At', 'paid_at']),
    createdAt: findHeaderIndex_(headers, ['Created_At', 'created_at']),
    updatedAt: findHeaderIndex_(headers, ['Updated_At', 'updated_at']),
    notes: findHeaderIndex_(headers, ['Notes', 'notes', 'หมายเหตุ'])
  };

  return {
    headers: headers,
    indices: indices,
    fieldToIndex: {
      Billing_ID: indices.billingId,
      Job_ID: indices.jobId,
      Customer_Name: indices.customerName,
      Phone: indices.phone,
      Parts_Description: indices.partsDescription,
      Parts_Cost: indices.partsCost,
      Labor_Cost: indices.laborCost,
      Subtotal: indices.subtotal,
      Discount: indices.discount,
      VAT_Amount: indices.vatAmount,
      WHT_Amount: indices.whtAmount,
      Total_Amount: indices.totalAmount,
      Amount_Paid: indices.amountPaid,
      Balance_Due: indices.balanceDue,
      Payment_Status: indices.paymentStatus,
      PromptPay_Biller_ID: indices.promptpayBillerId,
      PromptPay_Payload: indices.promptpayPayload,
      PromptPay_QR_URL: indices.promptpayQrUrl,
      Slip_Image_URL: indices.slipImageUrl,
      Slip_Payload: indices.slipPayload,
      Transaction_Ref: indices.transactionRef,
      Receipt_No: indices.receiptNo,
      Receipt_File_ID: indices.receiptFileId,
      Receipt_URL: indices.receiptUrl,
      Invoice_Date: indices.invoiceDate,
      Paid_At: indices.paidAt,
      Created_At: indices.createdAt,
      Updated_At: indices.updatedAt,
      Notes: indices.notes
    }
  };
}

function buildBillingObjectFromRow_(row, indices) {
  return {
    billing_id: safeCellValue_(row, indices.billingId),
    job_id: safeCellValue_(row, indices.jobId),
    customer_name: safeCellValue_(row, indices.customerName),
    phone: safeCellValue_(row, indices.phone),
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

function buildPromptPayPayload_(targetValue, amount, targetType) {
  var proxyTag = targetType === 'MOBILE' ? '01' : (targetType === 'EWALLET' ? '03' : '02');
  var merchantInfo = '0016A000000677010111' + proxyTag + formatEmvLength_(targetValue) + targetValue;
  var payload = '' +
    '000201' +
    '010212' +
    '29' + formatEmvLength_(merchantInfo) + merchantInfo +
    '5303764' +
    '54' + formatEmvLength_(amount.toFixed(2)) + amount.toFixed(2) +
    '5802TH' +
    '6304';

  return payload + crc16Ccitt_(payload);
}

function normalizePromptPayTarget_(value) {
  var digits = normalizeDigits_(value);
  if (!digits) return { success: false, error: 'PromptPay biller id is empty' };

  if (digits.length === 10 && digits.charAt(0) === '0') {
    return { success: true, raw: digits, value: '0066' + digits.substring(1), type: 'MOBILE' };
  }
  if (digits.length === 13) {
    return { success: true, raw: digits, value: digits, type: 'NATIONAL_OR_TAX_ID' };
  }
  if (digits.length === 15) {
    return { success: true, raw: digits, value: digits, type: 'EWALLET' };
  }

  return {
    success: false,
    error: 'Unsupported PromptPay target. รองรับเบอร์มือถือ 10 หลัก, เลขประจำตัว/ภาษี 13 หลัก หรือ e-Wallet 15 หลักเท่านั้น'
  };
}

function buildPromptPayQrImageUrl_(payload, size) {
  return 'https://api.qrserver.com/v1/create-qr-code/?size=' + size + 'x' + size + '&data=' + encodeURIComponent(payload);
}

function crc16Ccitt_(input) {
  var crc = 0xFFFF;
  for (var i = 0; i < input.length; i++) {
    crc ^= input.charCodeAt(i) << 8;
    for (var j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc = crc << 1;
      }
      crc &= 0xFFFF;
    }
  }
  var hex = crc.toString(16).toUpperCase();
  return ('0000' + hex).slice(-4);
}

function formatEmvLength_(value) {
  return String(String(value || '').length).padStart(2, '0');
}

function callSlipVerificationApi_(data, billing) {
  try {
    var apiUrl = getConfigSafe_('SLIP_VERIFY_API_URL');
    if (!apiUrl) {
      return { success: false, error: 'SLIP_VERIFY_API_URL not configured' };
    }

    var payload = {
      image_url: data.slip_image_url || data.slip_url || data.image_url || '',
      file_url: data.slip_image_url || data.slip_url || data.image_url || '',
      amount: billing.balance_due || billing.total_amount,
      receiver: billing.promptpay_biller_id || getConfigSafe_('PROMPTPAY_BILLER_ID') || '',
      job_id: billing.job_id
    };

    var body = data.api_payload && typeof data.api_payload === 'object' ? mergeObjects_(payload, data.api_payload) : payload;
    var headers = {};
    var apiKey = getConfigSafe_('SLIP_VERIFY_API_KEY');
    if (apiKey) {
      headers.Authorization = 'Bearer ' + apiKey;
      headers['X-API-Key'] = apiKey;
    }

    var response = UrlFetchApp.fetch(apiUrl, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(body),
      headers: headers,
      muteHttpExceptions: true
    });

    var code = response.getResponseCode();
    var text = response.getContentText();
    if (code < 200 || code >= 300) {
      return { success: false, error: 'Slip API HTTP ' + code, detail: text };
    }

    var parsed = text ? JSON.parse(text) : {};
    var amount = parsed.amount || parsed.data && parsed.data.amount || parsed.transaction && parsed.transaction.amount || 0;
    var receiver = parsed.receiver || parsed.receiver_account || parsed.data && (parsed.data.receiver || parsed.data.receiver_account) || parsed.transaction && (parsed.transaction.receiver || parsed.transaction.receiver_account) || '';
    var transactionRef = parsed.transaction_ref || parsed.ref || parsed.reference || parsed.data && (parsed.data.ref || parsed.data.transaction_ref) || '';

    return {
      success: true,
      amount: normalizeMoneyValue_(amount, 0),
      receiver: receiver,
      transaction_ref: transactionRef,
      raw: parsed
    };
  } catch (e) {
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
    var codeIdx = findHeaderIndex_(headers, ['Item_ID', 'Item_Code', 'Code', 'code', 'รหัส', 'Barcode']);
    var nameIdx = findHeaderIndex_(headers, ['Item_Name', 'Name', 'name', 'ชื่อ', 'ชื่อสินค้า']);
    var costIdx = findHeaderIndex_(headers, ['Cost', 'cost', 'Unit_Cost', 'unit_cost', 'ต้นทุน']);
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
  var match = String(text || '').match(/(?:ค่าแรง|labor)\s*[:=]?\s*([0-9,]+(?:\.[0-9]+)?)/i);
  return match ? normalizeMoneyValue_(match[1], 0) : 0;
}

function extractPartsDescriptionFromText_(text) {
  var match = String(text || '').match(/(?:อะไหล่|parts)\s*[:=]\s*([^\n]+)/i);
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

function roundMoney_(value) {
  return Math.round(Number(value || 0) * 100) / 100;
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

function buildReceiptHtml_(billing, receiptNo, jobId, paidDateText, data) {
  try {
    data = data || {};
    var companyPhone = getConfigSafe_('COMPANY_PHONE') || '-';
    var companyAddress = getConfigSafe_('COMPANY_ADDRESS') || 'ร้านคอมโฟน';
    var promptpayId = billing.promptpay_biller_id || getConfigSafe_('PROMPTPAY_BILLER_ID') || '';
    var qrUrl = billing.promptpay_qr_url || '';
    var isPaid = (billing.payment_status === 'PAID');
    var discount = Number(billing.discount || 0);
    var balanceDue = Number(billing.balance_due || 0);
    var transactionRef = data.transaction_ref || billing.transaction_ref || '-';
    var invoiceDate = billing.invoice_date ? formatDateTimeSafe_(billing.invoice_date) : paidDateText;
    var receivedBy = data.received_by || getConfigSafe_('OWNER_NAME') || 'COMPHONE';

    // QR Code section
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

    // Discount rows
    var discountRow = discount > 0 ? '<tr><td>ส่วนลด / Discount</td><td style="color:#E53935;">-' + formatMoneyText_(discount) + '</td></tr>' : '';
    var discountTotalRow = discount > 0 ? '<div class="total-row discount"><span>ส่วนลด</span><span>-' + formatMoneyText_(discount) + ' บาท</span></div>' : '';

    // Balance row
    var balanceRow = balanceDue > 0 ? '<div class="info-row" style="margin-bottom:6px;"><span class="info-label">คงเหลือ:</span><span class="info-value" style="color:#E53935;font-weight:bold;">' + formatMoneyText_(balanceDue) + ' บาท</span></div>' : '';

    // Payment badge
    var paymentBadge = isPaid
      ? '<div class="paid-badge">✓ ชำระเงินแล้ว / PAID</div>'
      : '<div class="unpaid-badge">⏳ รอชำระ / UNPAID</div>';

    // Payment method
    var paymentMethod = data.payment_method || (billing.transaction_ref ? 'PromptPay / โอนเงิน' : 'เงินสด / Cash');

    // Read HTML template
    var template = '';
    try {
      template = HtmlService.createTemplateFromFile('ReceiptTemplate').getRawContent();
    } catch (e) {
      // Fallback: use inline template
      template = getReceiptHtmlFallback_();
    }

    // Replace placeholders
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
  return '<!DOCTYPE html><html lang="th"><head><meta charset="UTF-8"><style>body{font-family:Tahoma,Arial,sans-serif;font-size:13px;padding:20px;max-width:700px;margin:0 auto}.header{text-align:center;border-bottom:3px solid #1565C0;padding-bottom:12px;margin-bottom:12px}.company{font-size:20px;font-weight:bold;color:#1565C0}.title{font-size:15px;font-weight:bold;margin-top:6px}.meta{display:flex;gap:12px;margin-bottom:12px}.meta-box{flex:1;background:#F5F5F5;border-radius:6px;padding:8px 12px}.meta-label{font-size:11px;color:#888}.meta-value{font-size:13px;font-weight:bold}table{width:100%;border-collapse:collapse;margin-bottom:10px}th{background:#1565C0;color:#fff;padding:7px 10px;text-align:left}td{padding:6px 10px;border-bottom:1px solid #EEE}td:last-child{text-align:right}.total-row{display:flex;justify-content:space-between;padding:5px 10px}.grand{background:#1565C0;color:#fff;font-weight:bold;font-size:15px;border-radius:4px;margin-top:4px;padding:8px 12px}.footer{text-align:center;margin-top:20px;color:#888;font-size:11px;border-top:1px solid #DDD;padding-top:10px}</style></head><body><div class="header"><div class="company">COMPHONE &amp; ELECTRONICS</div><div>{{COMPANY_ADDRESS}} | Tel: {{COMPANY_PHONE}}</div><div class="title">ใบเสร็จรับเงิน / RECEIPT</div></div><div class="meta"><div class="meta-box"><div class="meta-label">เลขที่ใบเสร็จ</div><div class="meta-value">{{RECEIPT_NO}}</div></div><div class="meta-box"><div class="meta-label">เลขที่งาน</div><div class="meta-value">{{JOB_ID}}</div></div><div class="meta-box"><div class="meta-label">วันที่ชำระ</div><div class="meta-value">{{PAID_DATE}}</div></div></div><p><b>ลูกค้า:</b> {{CUSTOMER_NAME}} | <b>โทร:</b> {{PHONE}}</p><p><b>รายละเอียด:</b> {{PARTS_DESCRIPTION}}</p><table><tr><th>รายการ</th><th>จำนวนเงิน (บาท)</th></tr><tr><td>ค่าอะไหล่</td><td>{{PARTS_COST}}</td></tr><tr><td>ค่าแรง</td><td>{{LABOR_COST}}</td></tr>{{DISCOUNT_ROW}}</table><div class="total-row"><span>ยอดรวมก่อนลด</span><span>{{SUBTOTAL}} บาท</span></div>{{DISCOUNT_TOTAL_ROW}}<div class="total-row grand"><span>ยอดรวมสุทธิ</span><span>{{TOTAL_AMOUNT}} บาท</span></div>{{QR_CODE_SECTION}}<p>{{PAYMENT_BADGE}} ชำระแล้ว: {{AMOUNT_PAID}} บาท {{BALANCE_ROW}}</p><p>วิธีชำระ: {{PAYMENT_METHOD}} | Ref: {{TRANSACTION_REF}}</p><div class="footer">ขอบคุณที่ใช้บริการ | {{GENERATED_AT}}</div></body></html>';
}

// ============================================================
// listAllBillings_ — ดึงรายการ billing ทั้งหมด
// ============================================================
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
    // filter by status
    if (options.status) {
      billings = billings.filter(function(b) { return b.payment_status === options.status; });
    }
    // sort by created_at desc
    billings.sort(function(a, b) { return new Date(b.created_at) - new Date(a.created_at); });
    return { success: true, billings: billings, count: billings.length };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

/**
 * verifyPaymentSlip_ — ตรวจสลิปด้วย SLIP_VERIFY_API_URL หรือ Gemini Vision (fallback)
 * เรียกจาก Router.gs case 'verifyPaymentSlip'
 * @param {Object} payload - { job_id, billing_id, slip_base64, slip_mime_type, expected_amount }
 * @returns {Object} { success, verification: { verified, amount_match, detected_amount, confidence, note } }
 */
function verifyPaymentSlip_(payload) {
  try {
    var jobId = payload.job_id || payload.jobId || '';
    var billingId = payload.billing_id || payload.billingId || '';
    var base64 = payload.slip_base64 || '';
    var mimeType = payload.slip_mime_type || 'image/jpeg';
    var expectedAmount = parseFloat(payload.expected_amount || payload.amount || 0);

    if (!base64) return { success: false, error: 'ไม่พบข้อมูลรูปสลิป' };

    // ลอง SLIP_VERIFY_API_URL ก่อน
    var apiUrl = getConfigSafe_('SLIP_VERIFY_API_URL');
    if (apiUrl) {
      var apiKey = getConfigSafe_('SLIP_VERIFY_API_KEY');
      var headers = {};
      if (apiKey) { headers.Authorization = 'Bearer ' + apiKey; headers['X-API-Key'] = apiKey; }

      var body = { image_base64: base64, mime_type: mimeType, amount: expectedAmount, job_id: jobId };
      var resp = UrlFetchApp.fetch(apiUrl, {
        method: 'post', contentType: 'application/json',
        payload: JSON.stringify(body), headers: headers, muteHttpExceptions: true
      });
      var code = resp.getResponseCode();
      if (code >= 200 && code < 300) {
        var parsed = JSON.parse(resp.getContentText() || '{}');
        return {
          success: true,
          verification: {
            verified: parsed.verified || parsed.is_valid || false,
            amount_match: parsed.amount_match || false,
            detected_amount: parsed.amount || parsed.detected_amount || 0,
            confidence: parsed.confidence || 0,
            note: parsed.note || parsed.message || '',
            provider: 'slip_verify_api'
          }
        };
      }
    }

    // Fallback: ใช้ Gemini Vision
    var geminiKey = getConfigSafe_('GEMINI_API_KEY') || getConfigSafe_('GOOGLE_AI_API_KEY') || '';
    if (!geminiKey) {
      return { success: false, error: 'ไม่มี SLIP_VERIFY_API_URL และ GEMINI_API_KEY — กรุณาตั้งค่าใน Script Properties' };
    }

    var prompt = 'คุณคือระบบตรวจสอบสลิปโอนเงิน PromptPay/ธนาคาร\n\n' +
      'วิเคราะห์รูปสลิปและตอบ JSON เท่านั้น:\n' +
      '{"is_slip":true,"amount":1500.00,"receiver_name":"ชื่อผู้รับ","transaction_ref":"รหัส","confidence":0.95,"is_valid":true,"issues":[]}\n\n' +
      (expectedAmount > 0 ? 'ยอดที่คาดหวัง: ฿' + expectedAmount + '\n\n' : '') +
      'ตอบ JSON อย่างเดียว ไม่มี markdown:';

    var result = _callGeminiVision_(geminiKey, prompt, base64);
    if (result.error) return { success: false, error: result.error };

    var detectedAmount = parseFloat(result.amount || 0);
    var amountMatch = expectedAmount > 0 ? Math.abs(detectedAmount - expectedAmount) < 1 : true;

    return {
      success: true,
      verification: {
        verified: result.is_valid !== false && amountMatch,
        amount_match: amountMatch,
        detected_amount: detectedAmount,
        confidence: result.confidence || 0,
        note: result.issues && result.issues.length > 0 ? result.issues.join(', ') : '',
        provider: 'gemini-vision'
      }
    };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}
