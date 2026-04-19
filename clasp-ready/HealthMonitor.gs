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

// ============================================================
// 🔧 getHealthMonitor(data) — V5.5.8 Real-time Control Panel
// ============================================================
// รวมข้อมูลทั้งหมดสำหรับ System Graph Dashboard
// Returns: status, version, triggers, logs, latency, node_status
// ============================================================
function getHealthMonitor(data) {
  data = data || {};
  var startTime = new Date().getTime();

  // ── 1. Version & SSOT Info ──
  var versionInfo = {
    version:      CONFIG && CONFIG.VERSION ? CONFIG.VERSION : 'V5.5.8',
    last_updated: new Date().toISOString(),
    architecture: 'API-Only (V5.5.8)',
    ssot_nodes:   ['Router', 'Auth', 'Config', 'Setup']
  };

  // ── 2. Trigger Status ──
  var triggerInfo = { count: 0, functions: [], active: false };
  try {
    var triggers = ScriptApp.getProjectTriggers();
    triggerInfo.count     = triggers.length;
    triggerInfo.functions = triggers.map(function(t) {
      return { name: t.getHandlerFunction(), type: t.getEventType().toString() };
    });
    triggerInfo.active = triggers.length > 0;
  } catch (e) {
    triggerInfo.error = e.message;
  }

  // ── 3. Health Check (fast) ──
  var healthResult = { status: 'UNKNOWN', spreadsheet_ok: false, drive_ok: false, errors: [] };
  try {
    var h = healthCheckV55_();
    healthResult = {
      status:         h.status || 'UNKNOWN',
      spreadsheet_ok: h.checks && h.checks.spreadsheet ? h.checks.spreadsheet.ok : false,
      config_ok:      h.checks && h.checks.config ? h.checks.config.ok : false,
      users_ok:       h.checks && h.checks.users ? h.checks.users.ok : false,
      users_count:    h.checks && h.checks.users ? h.checks.users.count : 0,
      elapsed_ms:     h.elapsed_ms || 0,
      errors:         []
    };
    if (!healthResult.spreadsheet_ok) healthResult.errors.push('Spreadsheet not accessible');
    if (!healthResult.config_ok)      healthResult.errors.push('Config not loaded');
  } catch (e) {
    healthResult.errors.push('Health check error: ' + e.message);
  }

  // ── 4. Node Status Map ──
  // แต่ละ node มี: status, version, isSSOT, latency_ms, error_rate, last_updated
  var nodeStatus = {
    Router:       { status: healthResult.status === 'HEALTHY' ? 'ok' : 'warning', isSSOT: true,  version: versionInfo.version, latency_ms: healthResult.elapsed_ms || 0, error_rate: 0 },
    Auth:         { status: healthResult.users_ok ? 'ok' : 'warning',             isSSOT: true,  version: versionInfo.version, latency_ms: 0, error_rate: 0, users_count: healthResult.users_count },
    Security:     { status: healthResult.config_ok ? 'ok' : 'warning',            isSSOT: true,  version: versionInfo.version, latency_ms: 0, error_rate: 0 },
    Dashboard:    { status: healthResult.spreadsheet_ok ? 'ok' : 'error',         isSSOT: false, version: versionInfo.version, latency_ms: 0, error_rate: 0 },
    CRM:          { status: healthResult.spreadsheet_ok ? 'ok' : 'error',         isSSOT: false, version: versionInfo.version, latency_ms: 0, error_rate: 0 },
    Jobs:         { status: healthResult.spreadsheet_ok ? 'ok' : 'error',         isSSOT: false, version: versionInfo.version, latency_ms: 0, error_rate: 0 },
    Billing:      { status: healthResult.spreadsheet_ok ? 'ok' : 'error',         isSSOT: false, version: versionInfo.version, latency_ms: 0, error_rate: 0 },
    Inventory:    { status: healthResult.spreadsheet_ok ? 'ok' : 'error',         isSSOT: false, version: versionInfo.version, latency_ms: 0, error_rate: 0 },
    Reports:      { status: healthResult.spreadsheet_ok ? 'ok' : 'error',         isSSOT: false, version: versionInfo.version, latency_ms: 0, error_rate: 0 },
    Warranty:     { status: healthResult.spreadsheet_ok ? 'ok' : 'error',         isSSOT: false, version: versionInfo.version, latency_ms: 0, error_rate: 0 },
    MultiBranch:  { status: healthResult.spreadsheet_ok ? 'ok' : 'error',         isSSOT: false, version: versionInfo.version, latency_ms: 0, error_rate: 0 },
    DB_JOBS:      { status: healthResult.spreadsheet_ok ? 'ok' : 'error',         isSSOT: true,  version: 'sheet-v1', latency_ms: 0, error_rate: 0 },
    DB_CUSTOMERS: { status: healthResult.spreadsheet_ok ? 'ok' : 'error',         isSSOT: true,  version: 'sheet-v1', latency_ms: 0, error_rate: 0 },
    DB_INVENTORY: { status: healthResult.spreadsheet_ok ? 'ok' : 'error',         isSSOT: true,  version: 'sheet-v1', latency_ms: 0, error_rate: 0 }
  };

  // ── 5. Health Score Calculation ──
  var totalNodes   = Object.keys(nodeStatus).length;
  var okNodes      = Object.values(nodeStatus).filter(function(n) { return n.status === 'ok'; }).length;
  var warnNodes    = Object.values(nodeStatus).filter(function(n) { return n.status === 'warning'; }).length;
  var errorNodes   = Object.values(nodeStatus).filter(function(n) { return n.status === 'error'; }).length;
  var healthScore  = Math.round((okNodes * 100 + warnNodes * 50) / totalNodes);

  // ── 6. Recent Health Logs (last 5) ──
  var recentLogs = [];
  try {
    var logResult = getHealthHistory({ limit: 5 });
    if (logResult.success) recentLogs = logResult.logs;
  } catch (e) {
    recentLogs = [];
  }

  // ── 7. Auto Diagnostic ──
  var diagnostics = [];
  if (!healthResult.spreadsheet_ok) {
    diagnostics.push({
      severity: 'critical',
      node:     'Dashboard/DB',
      problem:  'ไม่สามารถเข้าถึง Spreadsheet',
      cause:    'Spreadsheet ID ผิด หรือ permission ถูกเพิกถอน',
      fix:      'ตรวจสอบ SPREADSHEET_ID ใน Config และ Share permission'
    });
  }
  if (!healthResult.config_ok) {
    diagnostics.push({
      severity: 'warning',
      node:     'Security/Config',
      problem:  'Config ไม่ครบถ้วน',
      cause:    'ค่า Config บางรายการยังไม่ได้ตั้งค่า',
      fix:      'รัน setupConfig() ใน GAS Editor'
    });
  }
  if (triggerInfo.count === 0) {
    diagnostics.push({
      severity: 'warning',
      node:     'Router',
      problem:  'ไม่มี Triggers ทำงาน',
      cause:    'Triggers ยังไม่ได้ตั้งค่า',
      fix:      'รัน setupAllTriggers() ใน GAS Editor'
    });
  }
  if (healthResult.elapsed_ms > 3000) {
    diagnostics.push({
      severity: 'warning',
      node:     'Router',
      problem:  'Response time สูง (' + healthResult.elapsed_ms + 'ms)',
      cause:    'GAS cold start หรือ Spreadsheet ขนาดใหญ่',
      fix:      'ลด data ใน sheet หรือใช้ Cache'
    });
  }

  var totalElapsed = new Date().getTime() - startTime;

  return {
    success:      true,
    timestamp:    new Date().toISOString(),
    version:      versionInfo,
    health:       healthResult,
    health_score: healthScore,
    node_status:  nodeStatus,
    triggers:     triggerInfo,
    diagnostics:  diagnostics,
    recent_logs:  recentLogs,
    stats: {
      total_nodes:  totalNodes,
      ok_nodes:     okNodes,
      warn_nodes:   warnNodes,
      error_nodes:  errorNodes,
      elapsed_ms:   totalElapsed
    }
  };
}

// ============================================================
// 🎛️ controlAction(data) — Action Panel: clearCache, restart, reFetch, sendAlert
// data: { action: 'clearCache'|'restart'|'reFetch'|'sendAlert', module, message, severity }
// ============================================================
function controlAction(data) {
  data = data || {};
  var action = data.action || '';
  var module = data.module || 'all';
  var result = { success: false, action: action, module: module };

  try {
    if (action === 'clearCache') {
      var cache = CacheService.getScriptCache();
      var keysToDelete = ['dashboard_data_v557', 'dashboard_data_v55', 'health_check_v55', 'METRIC_ACTIVE_SESSIONS'];
      if (module !== 'all') {
        keysToDelete = keysToDelete.filter(function(k) { return k.indexOf(module.toLowerCase()) > -1; });
      }
      if (keysToDelete.length > 0) cache.removeAll(keysToDelete);
      result.success = true;
      result.message = 'Cache cleared: ' + keysToDelete.join(', ');
      writeAuditLog('CONTROL_ACTION', 'API', 'clearCache module=' + module, { keys: keysToDelete });

    } else if (action === 'restart') {
      var cache2 = CacheService.getScriptCache();
      cache2.removeAll(['dashboard_data_v557', 'health_check_v55', 'METRIC_ACTIVE_SESSIONS', 'SEC_LOG_LATEST']);
      var props = PropertiesService.getScriptProperties();
      props.deleteProperty('LAST_HEALTH_CHECK');
      result.success = true;
      result.message = 'Module ' + module + ' restarted (cache + props cleared)';
      writeAuditLog('CONTROL_ACTION', 'API', 'restart module=' + module, {});
      try {
        sendLineNotify({ message: '🔄 [COMPHONE] Module restart: ' + module + '\nเวลา: ' + new Date().toLocaleString('th-TH'), room: 'TECHNICIAN' });
      } catch(e) {}

    } else if (action === 'reFetch') {
      var cache3 = CacheService.getScriptCache();
      cache3.removeAll(['dashboard_data_v557']);
      result.success = true;
      result.message = 'Re-fetch triggered for ' + module;
      writeAuditLog('CONTROL_ACTION', 'API', 'reFetch module=' + module, {});

    } else if (action === 'sendAlert') {
      var msg = data.message || 'Manual alert from System Graph';
      var severity = data.severity || 'warning';
      var lineMsg = (severity === 'critical' ? '🚨' : '⚠️') + ' [COMPHONE ALERT]\n' + msg + '\nเวลา: ' + new Date().toLocaleString('th-TH');
      try {
        sendLineNotify({ message: lineMsg, room: 'TECHNICIAN' });
        result.success = true;
        result.message = 'Alert sent to LINE';
      } catch(e) {
        result.success = false;
        result.error = 'LINE send failed: ' + e.toString();
      }
      writeAuditLog('CONTROL_ACTION', 'API', 'sendAlert severity=' + severity, { message: msg });

    } else {
      result.error = 'Unknown action: ' + action;
    }
  } catch (e) {
    result.error = e.toString();
  }
  return result;
}

// ============================================================
// 📸 storeSnapshot(data) — บันทึก Snapshot ลง Google Sheets
// data: { label: string, snapshot: object }
// ============================================================
var SNAPSHOT_SHEET = 'SYSTEM_SNAPSHOTS';

function storeSnapshot(data) {
  data = data || {};
  var label = data.label || ('snapshot_' + new Date().toISOString());
  var snapshot = data.snapshot || {};
  try {
    var ss = getComphoneSheet();
    if (!ss) return { success: false, error: 'Spreadsheet not found' };
    var sh = findSheetByName(ss, SNAPSHOT_SHEET);
    if (!sh) {
      sh = ss.insertSheet(SNAPSHOT_SHEET);
      sh.appendRow(['id', 'label', 'timestamp', 'health_score', 'ok_nodes', 'warn_nodes', 'error_nodes', 'version', 'snapshot_json']);
    }
    var id = 'snap_' + Date.now();
    var ts = new Date().toISOString();
    var healthScore = snapshot.health_score || 0;
    var stats = snapshot.stats || {};
    var version = (snapshot.version && snapshot.version.version) ? snapshot.version.version : '5.5.8';
    var jsonStr = JSON.stringify(snapshot);
    if (jsonStr.length > 50000) jsonStr = jsonStr.substring(0, 50000) + '...';
    sh.appendRow([id, label, ts, healthScore, stats.ok_nodes || 0, stats.warn_nodes || 0, stats.error_nodes || 0, version, jsonStr]);
    writeAuditLog('SNAPSHOT', 'API', 'storeSnapshot label=' + label, { id: id });
    return { success: true, id: id, label: label, timestamp: ts };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

// ============================================================
// 📋 getSnapshots(data) — ดึงรายการ Snapshots
// data: { limit: number }
// ============================================================
function getSnapshots(data) {
  data = data || {};
  var limit = parseInt(data.limit || 20, 10);
  try {
    var ss = getComphoneSheet();
    if (!ss) return { success: false, error: 'Spreadsheet not found' };
    var sh = findSheetByName(ss, SNAPSHOT_SHEET);
    if (!sh || sh.getLastRow() < 2) return { success: true, snapshots: [] };
    var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    var lastRow = sh.getLastRow();
    var startRow = Math.max(2, lastRow - limit + 1);
    var rows = sh.getRange(startRow, 1, lastRow - startRow + 1, headers.length).getValues();
    var snapshots = rows.map(function(row) {
      var obj = {};
      headers.forEach(function(h, i) { obj[h] = row[i]; });
      delete obj.snapshot_json;
      return obj;
    }).reverse();
    return { success: true, snapshots: snapshots };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

// ============================================================
// 📈 getHealthTrend(data) — ดึงข้อมูล trend สำหรับ chart
// data: { limit: number }
// ============================================================
function getHealthTrend(data) {
  data = data || {};
  var limit = parseInt(data.limit || 24, 10);
  try {
    var ss = getComphoneSheet();
    if (!ss) return { success: false, error: 'Spreadsheet not found' };
    var sh = findSheetByName(ss, HEALTH_SHEET);
    if (!sh || sh.getLastRow() < 2) return { success: true, trend: [] };
    var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    var lastRow = sh.getLastRow();
    var startRow = Math.max(2, lastRow - limit + 1);
    var rows = sh.getRange(startRow, 1, lastRow - startRow + 1, headers.length).getValues();
    var trend = rows.map(function(row) {
      var obj = {};
      headers.forEach(function(h, i) { obj[h] = row[i]; });
      var status = (obj['Status'] || obj['status'] || 'UNKNOWN').toString().toUpperCase();
      return {
        timestamp:       obj['Timestamp'] || obj['checked_at'] || '',
        status:          status,
        response_time_ms: Number(obj['Response_Time_ms'] || obj['response_time_ms'] || 0),
        health_score:    status === 'HEALTHY' ? 100 : (status === 'DEGRADED' ? 70 : 30)
      };
    });
    return { success: true, trend: trend };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}
