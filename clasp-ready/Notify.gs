// ============================================================
// COMPHONE SUPER APP V5.5
// ============================================================
// Notify.gs - LINE Messaging API + CRM + Cron
// ⚠️ LINE Notify ปิดให้บริการแล้ว — ใช้ LINE Messaging API แทน
// ============================================================

// ============================================================
// 🔵 Core: sendLinePush() — LINE Messaging API (Push Message)
// ============================================================
function sendLinePush(message, toId) {
  try {
    var token = getConfig('LINE_CHANNEL_ACCESS_TOKEN') || '';
    if (!token) {
      Logger.log('LINE_CHANNEL_ACCESS_TOKEN not configured — logging only');
      _logNotifyFallback('NO_TOKEN', toId, message);
      return { success: false, error: 'LINE_CHANNEL_ACCESS_TOKEN not configured' };
    }
    if (!toId) {
      Logger.log('sendLinePush: No toId specified');
      return { success: false, error: 'No toId (groupId/userId) specified' };
    }

    // ตัดข้อความถ้ายาวเกิน 5000 (LINE limit)
    if (message.length > 5000) {
      message = message.substring(0, 4997) + '...';
    }

    var payload = {
      to: toId,
      messages: [{ type: 'text', text: message }]
    };

    var options = {
      method: 'post',
      contentType: 'application/json',
      headers: { 'Authorization': 'Bearer ' + token },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    var resp = UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', options);
    var code = resp.getResponseCode();

    if (code === 200) {
      return { success: true, to: toId };
    } else {
      var body = resp.getContentText();
      Logger.log('LINE Push failed: HTTP ' + code + ' — ' + body);
      _logNotifyFallback('HTTP_' + code, toId, message);
      return { success: false, error: 'HTTP ' + code, detail: body };
    }
  } catch (e) {
    Logger.log('sendLinePush error: ' + e);
    _logNotifyFallback('ERROR', toId, message);
    return { error: e.toString() };
  }
}

// ============================================================
// 🔵 Wrapper: sendLineNotify() — Backward-compatible interface
// เรียกใช้แบบเดิม: sendLineNotify({ message: '...', room: 'TECHNICIAN' })
// ภายในเปลี่ยนเป็น LINE Messaging API
// ============================================================
function sendLineNotify(data) {
  var msg = data.message || 'แจ้งเตือน';
  var room = data.room || 'TECHNICIAN';

  // Map room name → Group ID จาก Config
  var groupId = _getRoomGroupId(room);

  if (!groupId) {
    Logger.log('No Group ID for room: ' + room + ' — fallback log');
    _logNotifyFallback('NO_GROUP', room, msg);
    return { success: true, message: 'บันทึกแจ้งเตือนแล้ว (log) \u2014 กรุณาตั้งค่า: setConfig("LINE_GROUP_' + room + '", "C...")' };
  }

  return sendLinePush(msg, groupId);
}

// ============================================================
// Room → Group ID Mapping
// Config keys: LINE_GROUP_TECHNICIAN, LINE_GROUP_ACCOUNTING, etc.
// ============================================================
function _getRoomGroupId(room) {
  // 1. ลองจาก Config ก่อน
  var key = 'LINE_GROUP_' + room;
  var groupId = getConfig(key);
  if (groupId) return groupId;

  // 2. Hardcoded defaults (จาก MEMORY.md)
  var defaults = {
    'TECHNICIAN':  'C8ad22a115f38c9ad3cb5ea5c2ff4863b',
    'ACCOUNTING':  'C7b939d1d367e6b854690e58b392e88cc',
    'PROCUREMENT': 'Cfd103d59e77acf00e2f2f801d391c566',
    'SALES':       'Cb7cc146227212f70e4f171ef3f2bce15',
    'EXECUTIVE':   'C8ad22a115f38c9ad3cb5ea5c2ff4863b'  // fallback to TECHNICIAN
  };

  return defaults[room] || null;
}

// ============================================================
// Fallback Logger — บันทึกลง SYSTEM_LOGS เมื่อส่งไม่ได้
// ============================================================
function _logNotifyFallback(reason, target, message) {
  try {
    var ss = getComphoneSheet();
    var lsh = findSheetByName(ss, 'SYSTEM_LOGS');
    if (!lsh) {
      lsh = ss.insertSheet('SYSTEM_LOGS');
      lsh.appendRow(['Timestamp', 'Type', 'Room', 'Message']);
    }
    lsh.appendRow([new Date(), 'LINE_PUSH_' + reason, target, message]);
  } catch (e) {
    Logger.log('_logNotifyFallback error: ' + e);
  }
}

// ============================================================
// 📊 Cron Morning Alert — สรุปเช้า
// ============================================================
function cronMorningAlert() {
  try {
    var ss = getComphoneSheet();
    var sh = findSheetByName(ss, 'DB_INVENTORY');
    if (!sh) return { error: 'Sheet not found' };
    var all = sh.getDataRange().getValues();
    var nameIdx = 1, qtyIdx = 2;
    var headers = all[0];
    for (var hi = 0; hi < headers.length; hi++) {
      var h = String(headers[hi]);
      if (h === 'ชื่อ') nameIdx = hi;
      if (h === 'จำนวน') qtyIdx = hi;
    }
    var lowStock = [];
    for (var i = 1; i < all.length; i++) {
      if (Number(all[i][qtyIdx] || 0) < 5) {
        lowStock.push(String(all[i][nameIdx]) + ': ' + Number(all[i][qtyIdx]) + ' ชิ้น');
      }
    }
    if (lowStock.length > 0) {
      sendLineNotify({ message: '\u26a0\ufe0f สต็อกใกล้หมด (' + lowStock.length + ' รายการ)\n\n' + lowStock.join('\n'), room: 'PROCUREMENT' });
    }
    var jsh = findSheetByName(ss, 'DBJOBS');
    if (jsh) {
      var jobs = jsh.getDataRange().getValues();
      var p = 0, c = 0, sc = 3;
      for (var hi2 = 0; hi2 < jobs[0].length; hi2++) {
        if (String(jobs[0][hi2]).indexOf('สถานะ') > -1 || String(jobs[0][hi2]).indexOf('สถาน') > -1) { sc = hi2; break; }
      }
      for (var j = 1; j < jobs.length; j++) {
        var s = String(jobs[j][sc]);
        if (s.indexOf('รอดำ') === 0) p++;
        if (s === 'Completed') c++;
      }
      sendLineNotify({ message: '\ud83d\udcca สรุปเช้า\n\u23f3 รอดำเนินการ: ' + p + ' งาน\n\u2705 เสร็จแล้ว: ' + c + ' งาน', room: 'TECHNICIAN' });
    }
    return { success: true, lowStock: lowStock.length };
  } catch (e) { return { error: e.toString() }; }
}

// ============================================================
// 📋 CRM Notification — บันทึก Log
// ============================================================
function sendCRMNotification(data) {
  try {
    var ss = getComphoneSheet();
    var lsh = findSheetByName(ss, 'SYSTEM_LOGS');
    if (!lsh) { lsh = ss.insertSheet('SYSTEM_LOGS'); lsh.appendRow(['Timestamp','Type','JobID','Customer','Message']); }
    var status = data.status || '';
    lsh.appendRow([new Date(), status === 'Completed' ? 'JOB_COMPLETED' : 'PM_REMINDER', data.job_id || '', data.customer_name || '', status === 'Completed' ? 'งานเสร็จแล้ว' : 'รอบ PM ถัดไป: ' + (data.next_pm || '')]);
    return { success: true, message: 'CRM notification logged' };
  } catch (e) { return { error: e.toString() }; }
}


// ============================================================
// Phase 2 — Multi-channel Notification Helpers
// ============================================================
function sendTelegramMessage(message, chatId) {
  try {
    var token = getConfig('TELEGRAM_BOT_TOKEN') || '';
    if (!token) {
      _logNotifyFallback('TG_NO_TOKEN', chatId || '', message || '');
      return { success: false, error: 'TELEGRAM_BOT_TOKEN not configured' };
    }
    if (!chatId) {
      return { success: false, error: 'Telegram chat id is required' };
    }

    var payload = {
      chat_id: chatId,
      text: String(message || '').substring(0, 4000),
      parse_mode: 'HTML',
      disable_web_page_preview: false
    };

    var resp = UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
    var code = resp.getResponseCode();
    var body = resp.getContentText();
    if (code >= 200 && code < 300) return { success: true, chat_id: chatId };

    _logNotifyFallback('TG_HTTP_' + code, chatId, message);
    return { success: false, error: 'HTTP ' + code, detail: body };
  } catch (e) {
    _logNotifyFallback('TG_ERROR', chatId || '', message || '');
    return { success: false, error: e.toString() };
  }
}

function sendMultiChannelNotification(data) {
  try {
    data = data || {};
    var message = data.message || 'แจ้งเตือนจากระบบ';
    var room = data.room || 'TECHNICIAN';
    var channels = data.channels || ['line'];
    if (typeof channels === 'string') channels = channels.split(',');

    var result = { success: true, line: null, telegram: null, customer_line: null };

    for (var i = 0; i < channels.length; i++) {
      var channel = String(channels[i] || '').trim().toLowerCase();
      if (!channel) continue;

      if (channel === 'line') {
        result.line = data.to_line_id ? sendLinePush(message, data.to_line_id) : sendLineNotify({ message: message, room: room });
      } else if (channel === 'telegram') {
        var chatId = data.telegram_chat_id || getConfig('TELEGRAM_CHAT_' + room) || '';
        result.telegram = sendTelegramMessage(message, chatId);
      } else if (channel === 'customer_line' && data.customer_line_user_id) {
        result.customer_line = sendLinePush(message, data.customer_line_user_id);
      }
    }

    return result;
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

function notifyBillingReady(data) {
  try {
    data = data || {};
    var billingResult = typeof getBilling === 'function' ? getBilling({ job_id: data.job_id }) : null;
    if (!billingResult || !billingResult.success) return { success: false, error: 'Billing not found' };
    var billing = billingResult.billing;

    var financeMessage =
      'แจ้งเตือนการเรียกเก็บเงิน\n' +
      'งาน: ' + billing.job_id + '\n' +
      'ลูกค้า: ' + (billing.customer_name || '-') + '\n' +
      'ยอดชำระ: ' + Number(billing.balance_due || billing.total_amount || 0).toLocaleString() + ' บาท\n' +
      'QR: ' + (billing.promptpay_qr_url || '-') + '\n' +
      'สถานะ: ' + (billing.payment_status || 'UNPAID');

    var customerMessage =
      'ใบแจ้งชำระเงิน COMPHONE\n' +
      'เลขที่งาน: ' + billing.job_id + '\n' +
      'ยอดชำระ: ' + Number(billing.balance_due || billing.total_amount || 0).toLocaleString() + ' บาท\n' +
      'สแกนชำระ: ' + (billing.promptpay_qr_url || '-') + '\n' +
      'กรุณาแจ้งสลิปหลังชำระเงิน';

    return {
      success: true,
      accounting: sendMultiChannelNotification({
        room: 'ACCOUNTING',
        message: financeMessage,
        channels: ['line', 'telegram']
      }),
      customer: billing.customer_line_user_id ? sendMultiChannelNotification({
        message: customerMessage,
        channels: ['customer_line'],
        customer_line_user_id: billing.customer_line_user_id
      }) : { success: true, skipped: true, reason: 'No customer LINE user id' }
    };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

function notifyPaymentReceived(data) {
  try {
    data = data || {};
    var billingResult = typeof getBilling === 'function' ? getBilling({ job_id: data.job_id }) : null;
    if (!billingResult || !billingResult.success) return { success: false, error: 'Billing not found' };
    var billing = billingResult.billing;

    var opsMessage =
      'ยืนยันการรับชำระเงินแล้ว\n' +
      'งาน: ' + billing.job_id + '\n' +
      'ลูกค้า: ' + (billing.customer_name || '-') + '\n' +
      'ยอดรับ: ' + Number(billing.amount_paid || billing.total_amount || 0).toLocaleString() + ' บาท\n' +
      'Receipt: ' + (billing.receipt_url || '-') + '\n' +
      'Ref: ' + (billing.transaction_ref || '-');

    var customerMessage =
      'ระบบได้รับชำระเงินแล้ว\n' +
      'เลขที่งาน: ' + billing.job_id + '\n' +
      'ยอดชำระ: ' + Number(billing.amount_paid || billing.total_amount || 0).toLocaleString() + ' บาท\n' +
      'ใบเสร็จ: ' + (billing.receipt_url || '-');

    return {
      success: true,
      accounting: sendMultiChannelNotification({
        room: 'ACCOUNTING',
        message: opsMessage,
        channels: ['line', 'telegram']
      }),
      executive: sendMultiChannelNotification({
        room: 'EXECUTIVE',
        message: opsMessage,
        channels: ['line']
      }),
      customer: billing.customer_line_user_id ? sendMultiChannelNotification({
        message: customerMessage,
        channels: ['customer_line'],
        customer_line_user_id: billing.customer_line_user_id
      }) : { success: true, skipped: true, reason: 'No customer LINE user id' }
    };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

function sendCriticalDashboardAlerts() {
  try {
    if (typeof getAlerts !== 'function') return { success: false, error: 'getAlerts not available' };
    var alerts = getAlerts();
    if (!alerts.success) return alerts;
    if (!alerts.items || alerts.items.length === 0) return { success: true, message: 'No critical alerts' };

    var lines = [];
    for (var i = 0; i < alerts.items.length && i < 10; i++) {
      lines.push((i + 1) + '. [' + alerts.items[i].type + '] ' + alerts.items[i].message);
    }

    return sendMultiChannelNotification({
      room: 'EXECUTIVE',
      message: 'Dashboard Alerts\n' + lines.join('\n'),
      channels: ['line', 'telegram']
    });
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

// ============================================================
// nudgeTechAction_() — จี้ช่างผ่าน LINE (เรียกจาก Router)
// payload: { job_id, tech_name, message, user }
// ============================================================
/**
 * ส่ง LINE แจ้งเตือนช่างให้เร่งทำงาน
 * @param {Object} payload - { job_id, tech_name, message, user }
 * @return {Object} { success, message, lineResult }
 */
function nudgeTechAction_(payload) {
  try {
    payload = payload || {};
    var jobId    = payload.job_id || payload.jobId || '';
    var techName = payload.tech_name || payload.tech || 'ช่าง';
    var sender   = payload.user || payload.changed_by || 'Admin';
    var customMsg = payload.message || '';

    var msg = customMsg ||
      '🔔 แจ้งเตือนจากระบบ COMPHONE\n' +
      '━━━━━━━━━━━━━━━━━━━━\n' +
      '👤 ช่าง: ' + techName + '\n' +
      (jobId ? '🔧 งาน: ' + jobId + '\n' : '') +
      '⚡ กรุณาอัปเดตสถานะงานด้วยนะครับ\n' +
      '📤 ส่งโดย: ' + sender + '\n' +
      '⏰ ' + Utilities.formatDate(new Date(), 'Asia/Bangkok', 'dd/MM/yyyy HH:mm');

    var lineResult = sendLineNotify({ message: msg, room: 'TECHNICIAN' });

    // บันทึก log
    _logNotifyFallback('NUDGE_TECH', techName, msg);

    return {
      success: true,
      message: 'ส่งการแจ้งเตือนช่างแล้ว',
      tech: techName,
      job_id: jobId,
      lineResult: lineResult
    };
  } catch (e) {
    Logger.log('nudgeTechAction_ ERROR: ' + e.message);
    return { success: false, error: e.message };
  }
}
