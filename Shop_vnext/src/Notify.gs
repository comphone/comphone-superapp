// ============================================================
// Notify.gs - LINE Messaging API + CRM + Cron (V351)
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
