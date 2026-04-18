// ============================================================
// HealthMonitor.gs — Health Monitoring + Performance + Security Hardening
// COMPHONE SUPER APP V5.5+
// ============================================================
//
// TASK 8: Security Hardening — token verify, CORS, rate limit
// TASK 9: Health Monitoring — auto health check + LINE alert
// TASK 10: Performance — batch write, cache, optimize API
//
// ทุก action เขียน Audit Log ตาม RULE 5
// ทุกค่า Config ใช้ getConfig() ตาม RULE 4
// ============================================================

var HEALTH_SHEET = 'DB_HEALTH_LOG';
var HEALTH_HEADERS = [
  'Log_ID', 'Timestamp', 'Status', 'Spreadsheet_OK', 'Sheets_Count',
  'Drive_OK', 'Line_OK', 'Gemini_OK', 'Response_Time_ms',
  'Error_Detail', 'Triggered_By'
];

// ── In-memory cache (ใช้ CacheService ของ GAS) ──────────────
var CACHE_TTL_SECONDS = 300; // 5 นาที

// ============================================================
// 🔧 TASK 9: healthCheck(data)
// ============================================================
// ตรวจสอบสถานะระบบทั้งหมด
// ============================================================
function healthCheck(data) {
  data = data || {};
  var startTime = new Date().getTime();
  var result = {
    timestamp:       new Date().toISOString(),
    spreadsheet_ok:  false,
    sheets_count:    0,
    drive_ok:        false,
    line_ok:         false,
    gemini_ok:       false,
    response_time_ms: 0,
    status:          'UNKNOWN',
    errors:          []
  };

  // ── ตรวจ Spreadsheet ──
  try {
    var ss = getComphoneSheet();
    if (ss) {
      result.spreadsheet_ok = true;
      result.sheets_count   = ss.getSheets().length;
    } else {
      result.errors.push('Spreadsheet not accessible');
    }
  } catch (e) {
    result.errors.push('Spreadsheet error: ' + e.toString());
  }

  // ── ตรวจ Google Drive ──
  try {
    var folderId = getConfig('ROOT_FOLDER_ID', '');
    if (folderId) {
      DriveApp.getFolderById(folderId);
      result.drive_ok = true;
    } else {
      result.drive_ok = true; // ไม่ได้ตั้งค่า folder แต่ Drive ยังใช้ได้
    }
  } catch (e) {
    result.errors.push('Drive error: ' + e.toString());
  }

  // ── ตรวจ LINE API ──
  try {
    var lineToken = getConfig('LINE_CHANNEL_ACCESS_TOKEN', '');
    if (lineToken) {
      var lineResp = UrlFetchApp.fetch('https://api.line.me/v2/bot/info', {
        headers: { 'Authorization': 'Bearer ' + lineToken },
        muteHttpExceptions: true
      });
      result.line_ok = (lineResp.getResponseCode() === 200);
      if (!result.line_ok) result.errors.push('LINE API HTTP ' + lineResp.getResponseCode());
    } else {
      result.line_ok = null; // ไม่ได้ตั้งค่า
    }
  } catch (e) {
    result.errors.push('LINE check error: ' + e.toString());
  }

  // ── ตรวจ Gemini API ──
  try {
    var geminiKey = getConfig('GEMINI_API_KEY', '');
    if (geminiKey) {
      var geminiResp = UrlFetchApp.fetch(
        'https://generativelanguage.googleapis.com/v1beta/models?key=' + geminiKey,
        { muteHttpExceptions: true }
      );
      result.gemini_ok = (geminiResp.getResponseCode() === 200);
      if (!result.gemini_ok) result.errors.push('Gemini API HTTP ' + geminiResp.getResponseCode());
    } else {
      result.gemini_ok = null;
    }
  } catch (e) {
    result.errors.push('Gemini check error: ' + e.toString());
  }

  result.response_time_ms = new Date().getTime() - startTime;
  result.status = (result.spreadsheet_ok && result.drive_ok && result.errors.length === 0)
    ? 'HEALTHY' : (result.spreadsheet_ok ? 'DEGRADED' : 'CRITICAL');

  // บันทึก Health Log
  saveHealthLog_(result, data.triggered_by || 'API');

  // แจ้งเตือน LINE ถ้าสถานะ CRITICAL
  if (result.status === 'CRITICAL') {
    sendHealthAlertToLine_(result);
  }

  writeAuditLog('HEALTH_CHECK', data.triggered_by || 'API', result.status + ' rt=' + result.response_time_ms + 'ms', { result: result.status.toLowerCase() });

  return { success: true, health: result };
}

// ============================================================
// 🔧 getHealthHistory(data)
// ============================================================
// ดึงประวัติ Health Log
// data: { limit }  default = 20
// ============================================================
function getHealthHistory(data) {
  try {
    data = data || {};
    var limit = parseInt(data.limit || 20, 10);
    var ss = getComphoneSheet();
    if (!ss) return { success: false, error: 'Spreadsheet not found' };
    var sh = findSheetByName(ss, HEALTH_SHEET);
    if (!sh || sh.getLastRow() < 2) return { success: true, logs: [] };

    var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    var lastRow  = sh.getLastRow();
    var startRow = Math.max(2, lastRow - limit + 1);
    var rows     = sh.getRange(startRow, 1, lastRow - startRow + 1, headers.length).getValues();

    var logs = rows.reverse().map(function (row) {
      var obj = {};
      HEALTH_HEADERS.forEach(function (h, i) {
        var idx = findHeaderIndex_(headers, [h]);
        obj[h.toLowerCase()] = idx > -1 ? row[idx] : '';
      });
      return obj;
    });

    return { success: true, logs: logs };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

// ============================================================
// 🔧 TASK 8: verifyRequestToken_(token)
// ============================================================
// ตรวจสอบ token ทุก API request
// ============================================================
function verifyRequestToken_(token) {
  if (!token) return { valid: false, reason: 'No token provided' };
  var adminToken = getConfig('API_SECRET_TOKEN', '');
  if (!adminToken) return { valid: true, reason: 'Token check disabled (no API_SECRET_TOKEN set)' };
  if (token === adminToken) return { valid: true, reason: 'Token valid' };
  return { valid: false, reason: 'Invalid token' };
}

// ============================================================
// 🔧 TASK 8: checkRateLimit_(clientId)
// ============================================================
// Rate limiting ด้วย CacheService
// ============================================================
function checkRateLimit_(clientId) {
  try {
    var maxReqPerMin = parseInt(getConfig('RATE_LIMIT_PER_MIN', 60), 10);
    var cache        = CacheService.getScriptCache();
    var key          = 'rl_' + String(clientId || 'default').replace(/[^a-zA-Z0-9]/g, '_');
    var current      = parseInt(cache.get(key) || '0', 10);

    if (current >= maxReqPerMin) {
      return { allowed: false, current: current, limit: maxReqPerMin };
    }
    cache.put(key, String(current + 1), 60); // reset ทุก 60 วินาที
    return { allowed: true, current: current + 1, limit: maxReqPerMin };
  } catch (e) {
    return { allowed: true, current: 0, limit: 60 }; // fail-open
  }
}

// ============================================================
// 🔧 TASK 8: validateCorsOrigin_(origin)
// ============================================================
// ตรวจสอบ CORS origin
// ============================================================
function validateCorsOrigin_(origin) {
  var allowedOrigins = getConfig('ALLOWED_ORIGINS', '');
  if (!allowedOrigins) return true; // ไม่ได้ตั้งค่า = อนุญาตทั้งหมด
  var allowed = allowedOrigins.split(',').map(function (o) { return o.trim(); });
  return allowed.indexOf(origin) > -1 || allowed.indexOf('*') > -1;
}

// ============================================================
// 🔧 TASK 10: getCachedData_(key, fetchFn, ttl)
// ============================================================
// Cache wrapper สำหรับ API responses
// ============================================================
function getCachedData_(key, fetchFn, ttl) {
  ttl = ttl || CACHE_TTL_SECONDS;
  try {
    var cache     = CacheService.getScriptCache();
    var cacheKey  = 'cache_' + String(key).replace(/[^a-zA-Z0-9_]/g, '_');
    var cached    = cache.get(cacheKey);
    if (cached) {
      try { return JSON.parse(cached); } catch (e) {}
    }
    var data = fetchFn();
    try { cache.put(cacheKey, JSON.stringify(data), ttl); } catch (e) {}
    return data;
  } catch (e) {
    return fetchFn();
  }
}

// ============================================================
// 🔧 TASK 10: batchWriteToSheet_(sh, rows)
// ============================================================
// เขียนหลาย rows พร้อมกัน (batch) แทนการ appendRow ทีละ row
// ============================================================
function batchWriteToSheet_(sh, rows) {
  if (!sh || !rows || rows.length === 0) return { success: true, count: 0 };
  try {
    var startRow = sh.getLastRow() + 1;
    sh.getRange(startRow, 1, rows.length, rows[0].length).setValues(rows);
    return { success: true, count: rows.length, start_row: startRow };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

// ============================================================
// 🔧 TASK 10: invalidateCache_(pattern)
// ============================================================
// ล้าง cache ที่ match pattern
// ============================================================
function invalidateCache_(pattern) {
  try {
    var cache = CacheService.getScriptCache();
    var key   = 'cache_' + String(pattern || '').replace(/[^a-zA-Z0-9_]/g, '_');
    cache.remove(key);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

// ============================================================
// 🔧 cronHealthCheck()
// ============================================================
// Trigger function — รันทุก 30 นาที
// ============================================================
function cronHealthCheck() {
  return healthCheck({ triggered_by: 'CRON' });
}

function setupHealthCheckTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'cronHealthCheck') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('cronHealthCheck')
    .timeBased()
    .everyMinutes(30)
    .create();
  return { success: true, message: 'Health check trigger set: every 30 minutes' };
}

// ============================================================
// 🔧 Helpers
// ============================================================

function saveHealthLog_(result, triggeredBy) {
  try {
    var ss = getComphoneSheet();
    if (!ss) return;
    var sh = findSheetByName(ss, HEALTH_SHEET);
    if (!sh) {
      sh = ss.insertSheet(HEALTH_SHEET);
      sh.getRange(1, 1, 1, HEALTH_HEADERS.length).setValues([HEALTH_HEADERS]);
    }
    var logId = 'HL' + Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyyMMddHHmmss');
    sh.appendRow([
      logId,
      result.timestamp,
      result.status,
      result.spreadsheet_ok ? 'OK' : 'FAIL',
      result.sheets_count,
      result.drive_ok === null ? 'N/A' : (result.drive_ok ? 'OK' : 'FAIL'),
      result.line_ok === null ? 'N/A' : (result.line_ok ? 'OK' : 'FAIL'),
      result.gemini_ok === null ? 'N/A' : (result.gemini_ok ? 'OK' : 'FAIL'),
      result.response_time_ms,
      result.errors.join('; '),
      triggeredBy || 'UNKNOWN'
    ]);
  } catch (e) {
    Logger.log('saveHealthLog_ error: ' + e);
  }
}

function sendHealthAlertToLine_(result) {
  try {
    var lineToken = getConfig('LINE_CHANNEL_ACCESS_TOKEN', '');
    var groupId   = getConfig('LINE_GROUP_EXECUTIVE', '') || getConfig('LINE_GROUP_ACCOUNTING', '');
    if (!lineToken || !groupId) return;

    var msg = '🚨 COMPHONE SYSTEM ALERT\n' +
              'สถานะ: ' + result.status + '\n' +
              'เวลา: ' + result.timestamp + '\n' +
              'ข้อผิดพลาด: ' + (result.errors.join(', ') || 'ไม่มี') + '\n' +
              'Response Time: ' + result.response_time_ms + 'ms';

    UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', {
      method: 'post',
      contentType: 'application/json',
      headers: { 'Authorization': 'Bearer ' + lineToken },
      payload: JSON.stringify({ to: groupId, messages: [{ type: 'text', text: msg }] }),
      muteHttpExceptions: true
    });
  } catch (e) {
    Logger.log('sendHealthAlertToLine_ error: ' + e);
  }
}
