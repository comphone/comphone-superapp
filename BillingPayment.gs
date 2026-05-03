// ============================================================
// COMPHONE SUPER APP v5.9.0-phase31a
// BillingPayment.gs — PromptPay QR, Slip Verification, Payment Processing
// Extracted from BillingManager.gs (Phase 31 Refactoring)
// ============================================================

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
    try { if (typeof _logError_ === 'function') _logError_('MEDIUM', 'generatePromptPayQR', e, {source: 'BILLING'}); } catch(_le) {}
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
        success: false, verified: false, error: 'Slip verification mismatch',
        expected_amount: expectedAmount, actual_amount: actualAmount,
        expected_receiver: expectedReceiver, actual_receiver: actualReceiver,
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
    try { if (typeof _logError_ === 'function') _logError_('MEDIUM', 'verifyPaymentSlip', e, {source: 'BILLING'}); } catch(_le) {}
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
      Amount_Paid: newPaid, Balance_Due: balance, Payment_Status: paymentStatus,
      Slip_Image_URL: data.slip_image_url || billing.slip_image_url || '',
      Slip_Payload: safeJsonStringify_(data.slip_payload || billing.slip_payload || ''),
      Transaction_Ref: data.transaction_ref || billing.transaction_ref || '',
      Paid_At: newPaid > 0 ? new Date() : '', Updated_At: new Date(),
      Notes: appendTimestampedNote_(billing.notes, 'Payment status updated to ' + paymentStatus)
    });

    var receipt = null;
    if (paymentStatus === 'PAID' && data.generate_receipt !== false) {
      receipt = generateReceiptPDF({
        job_id: jobId, receipt_no: data.receipt_no || '',
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
            note: '\u0e23\u0e30\u0e1a\u0e1a\u0e22\u0e37\u0e19\u0e22\u0e31\u0e19\u0e01\u0e32\u0e23\u0e0a\u0e33\u0e23\u0e30\u0e40\u0e07\u0e34\u0e19\u0e41\u0e25\u0e49\u0e27',
            source: 'BillingManager'
          });
        }
      } catch (transitionErr) {
        Logger.log('markBillingPaid transition error: ' + transitionErr);
      }
    }

    if (paymentStatus === 'PAID') {
      try {
        var msg = '\u2705 \u0e0a\u0e33\u0e23\u0e30\u0e40\u0e07\u0e34\u0e19\u0e41\u0e25\u0e49\u0e27!\n' +
          '\ud83d\udccb \u0e07\u0e32\u0e19: ' + jobId + '\n' +
          '\ud83d\udc64 \u0e25\u0e39\u0e01\u0e04\u0e49\u0e32: ' + (billing.customer_name || '-') + '\n' +
          '\ud83d\udcb0 \u0e22\u0e2d\u0e14: \u0e3f' + newPaid.toLocaleString() + '\n' +
          '\ud83d\udd52 ' + getThaiTimestamp();
        if (typeof sendLineNotify === 'function') sendLineNotify({ message: msg, room: 'OWNER' });
      } catch(lineErr) { Logger.log('LINE notify error: ' + lineErr); }
      try { writeAuditLog('PAYMENT_RECEIVED', jobId, '\u0e22\u0e2d\u0e14=' + newPaid, data.changed_by || 'system'); } catch(e2) {}
    }

    return {
      success: true,
      job_id: jobId,
      billing: updated.success ? updated.billing : null,
      receipt: receipt
    };
  } catch (e) {
    try { if (typeof _logError_ === 'function') _logError_('MEDIUM', 'markBillingPaid', e, {source: 'BILLING'}); } catch(_le) {}
    return { success: false, error: e.toString() };
  }
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
      method: 'post', contentType: 'application/json',
      payload: JSON.stringify(body), headers: headers, muteHttpExceptions: true
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

    return { success: true, amount: normalizeMoneyValue_(amount, 0), receiver: receiver, transaction_ref: transactionRef, raw: parsed };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

function verifyPaymentSlip_(payload) {
  try {
    var jobId = payload.job_id || payload.jobId || '';
    var billingId = payload.billing_id || payload.billingId || '';
    var base64 = payload.slip_base64 || '';
    var mimeType = payload.slip_mime_type || 'image/jpeg';
    var expectedAmount = parseFloat(payload.expected_amount || payload.amount || 0);

    if (!base64) return { success: false, error: '\u0e44\u0e21\u0e48\u0e1e\u0e1a\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25\u0e23\u0e39\u0e1b\u0e2a\u0e25\u0e34\u0e1b' };

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

    var geminiKey = getConfigSafe_('GEMINI_API_KEY') || getConfigSafe_('GOOGLE_AI_API_KEY') || '';
    if (!geminiKey) {
      return { success: false, error: '\u0e44\u0e21\u0e48\u0e21\u0e35 SLIP_VERIFY_API_URL \u0e41\u0e25\u0e30 GEMINI_API_KEY \u2014 \u0e01\u0e23\u0e38\u0e13\u0e32\u0e15\u0e31\u0e49\u0e07\u0e04\u0e48\u0e32\u0e43\u0e19 Script Properties' };
    }

    var prompt = '\u0e04\u0e38\u0e13\u0e04\u0e37\u0e2d\u0e23\u0e30\u0e1a\u0e1a\u0e15\u0e23\u0e27\u0e08\u0e2a\u0e2d\u0e1a\u0e2a\u0e25\u0e34\u0e1b\u0e42\u0e2d\u0e19\u0e40\u0e07\u0e34\u0e19 PromptPay/\u0e18\u0e19\u0e32\u0e04\u0e32\u0e23\n\n' +
      '\u0e27\u0e34\u0e40\u0e04\u0e23\u0e32\u0e30\u0e2b\u0e4c\u0e23\u0e39\u0e1b\u0e2a\u0e25\u0e34\u0e1b\u0e41\u0e25\u0e30\u0e15\u0e2d\u0e1a JSON \u0e40\u0e17\u0e48\u0e32\u0e19\u0e31\u0e49\u0e19:\n' +
      '{"is_slip":true,"amount":1500.00,"receiver_name":"\u0e0a\u0e37\u0e48\u0e2d\u0e1c\u0e39\u0e49\u0e23\u0e31\u0e1a","transaction_ref":"\u0e23\u0e2b\u0e31\u0e2a","confidence":0.95,"is_valid":true,"issues":[]}\n\n' +
      (expectedAmount > 0 ? '\u0e22\u0e2d\u0e14\u0e17\u0e35\u0e48\u0e04\u0e32\u0e14\u0e2b\u0e27\u0e31\u0e07: \u0e3f' + expectedAmount + '\n\n' : '') +
      '\u0e15\u0e2d\u0e1a JSON \u0e2d\u0e22\u0e48\u0e32\u0e07\u0e40\u0e14\u0e35\u0e22\u0e27 \u0e44\u0e21\u0e48\u0e21\u0e35 markdown:';

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

// ─── PromptPay Helpers ─────────────────────────────────────

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
  return { success: false, error: 'Unsupported PromptPay target. \u0e23\u0e2d\u0e07\u0e23\u0e31\u0e1a\u0e40\u0e1a\u0e2d\u0e23\u0e4c\u0e21\u0e37\u0e2d\u0e16\u0e37\u0e2d 10 \u0e2b\u0e25\u0e31\u0e01, \u0e40\u0e25\u0e02\u0e1b\u0e23\u0e30\u0e08\u0e33\u0e15\u0e31\u0e27/\u0e20\u0e32\u0e29\u0e35 13 \u0e2b\u0e25\u0e31\u0e01 \u0e2b\u0e23\u0e37\u0e2d e-Wallet 15 \u0e2b\u0e25\u0e31\u0e01\u0e40\u0e17\u0e48\u0e32\u0e19\u0e31\u0e49\u0e19' };
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
