// ============================================================
// COMPHONE SUPER APP v5.9.0-phase31a — ErrorTelemetry.gs
// Phase 2C: Centralized Error Telemetry + Failure Classification
// ============================================================
// PURPOSE: Single sink for ALL server-side errors.
//   Every catch block should call _logError_() to capture
//   structured error data for anomaly detection and learning.
//
// SCHEMA: DB_ERRORS sheet
//   timestamp | severity | action | user | error_msg | stack | context | count
//
// SEVERITY LEVELS:
//   CRITICAL — System down, data loss, auth bypass
//   HIGH     — Feature broken, payment failure, job stuck
//   MEDIUM   — Degraded performance, retry needed, fallback used
//   LOW      — Cosmetic, expected failure, debug info
// ============================================================

var ERROR_HEADERS = [
  'timestamp', 'severity', 'action', 'user', 'error_msg', 'stack_trace', 'context', 'occurrence_count'
];

var _ERROR_SHEET_NAME = 'DB_ERRORS';
var _ERROR_MAX_ROWS = 5000;
var _ERROR_DEDUP_WINDOW_MS = 60000; // 1 minute dedup window

/**
 * _logError_ — Centralized error telemetry
 * NEVER throws. If logging fails, silently degrades.
 *
 * @param {string} severity — CRITICAL | HIGH | MEDIUM | LOW
 * @param {string} action — The action/function that failed
 * @param {Error|string} error — The error object or message
 * @param {Object} [context] — Additional context (payload, user, etc.)
 * @return {void}
 */
function _logError_(severity, action, error, context) {
  try {
    var errorMsg = (error && error.message) ? error.message : String(error || 'Unknown error');
    var stackTrace = (error && error.stack) ? String(error.stack).substring(0, 1000) : '';
    var contextStr = '';
    try {
      contextStr = JSON.stringify(context || {}).substring(0, 2000);
    } catch (jsonErr) {
      contextStr = String(context).substring(0, 2000);
    }

    var user = '';
    try {
      if (context && context.user) user = String(context.user);
      else if (context && context.userId) user = String(context.userId);
    } catch (e) { /* ignore */ }

    // Dedup: check if same error was logged recently
    var fingerprint = severity + '|' + action + '|' + errorMsg.substring(0, 100);
    if (_isDuplicateError_(fingerprint)) {
      _incrementErrorCount_(fingerprint);
      return;
    }

    var ss = _getErrorSheet_();
    if (!ss) return;

    var now = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd HH:mm:ss');
    ss.appendRow([
      now,
      severity,
      action,
      user,
      errorMsg.substring(0, 500),
      stackTrace,
      contextStr,
      1
    ]);

    // Cache fingerprint for dedup
    _cacheErrorFingerprint_(fingerprint);

    // Auto-prune
    if (ss.getLastRow() > _ERROR_MAX_ROWS + 1) {
      ss.deleteRows(2, ss.getLastRow() - _ERROR_MAX_ROWS - 1);
    }

    // Alert on CRITICAL errors
    if (severity === 'CRITICAL') {
      _alertCriticalError_(action, errorMsg);
    }
  } catch (e) {
    // NEVER throw from error logger
    try { Logger.log('[ErrorTelemetry] Logger itself failed: ' + e); } catch (ignore) {}
  }
}

/**
 * _logErrorQuick_ — Simplified error logging for common catch blocks
 * Usage: } catch(e) { _logErrorQuick_('actionName', e); }
 *
 * @param {string} action — The action that failed
 * @param {Error|string} error — The error
 * @param {string} [severity] — Default: MEDIUM
 */
function _logErrorQuick_(action, error, severity) {
  _logError_(severity || 'MEDIUM', action, error);
}

/**
 * _getErrorSheet_ — Get or create DB_ERRORS sheet
 * @return {Sheet|null}
 */
function _getErrorSheet_() {
  try {
    var ssId = PropertiesService.getScriptProperties().getProperty('DB_SS_ID');
    if (!ssId) return null;
    var ss = SpreadsheetApp.openById(ssId);
    var sheet = ss.getSheetByName(_ERROR_SHEET_NAME);
    if (!sheet) {
      sheet = ss.insertSheet(_ERROR_SHEET_NAME);
      sheet.appendRow(ERROR_HEADERS);
      sheet.setFrozenRows(1);
      // Set column widths for readability
      sheet.setColumnWidth(1, 160); // timestamp
      sheet.setColumnWidth(2, 90);  // severity
      sheet.setColumnWidth(3, 150); // action
      sheet.setColumnWidth(5, 300); // error_msg
      sheet.setColumnWidth(6, 300); // stack_trace
      sheet.setColumnWidth(7, 300); // context
    }
    return sheet;
  } catch (e) {
    try { Logger.log('[ErrorTelemetry] Sheet access failed: ' + e); } catch (ignore) {}
    return null;
  }
}

/**
 * _isDuplicateError_ — Check if this error was logged recently (dedup)
 * Uses PropertiesService for lightweight dedup cache
 */
function _isDuplicateError_(fingerprint) {
  try {
    var cache = PropertiesService.getScriptProperties().getProperty('_err_dedup');
    if (!cache) return false;
    var map = JSON.parse(cache);
    var entry = map[fingerprint];
    if (!entry) return false;
    return (Date.now() - entry.t) < _ERROR_DEDUP_WINDOW_MS;
  } catch (e) { return false; }
}

/**
 * _cacheErrorFingerprint_ — Store fingerprint for dedup
 */
function _cacheErrorFingerprint_(fingerprint) {
  try {
    var cache = PropertiesService.getScriptProperties().getProperty('_err_dedup');
    var map = {};
    try { map = JSON.parse(cache || '{}'); } catch (e) { map = {}; }

    map[fingerprint] = { t: Date.now(), c: 1 };

    // Prune old entries (keep last 100)
    var keys = Object.keys(map);
    if (keys.length > 100) {
      keys.sort(function(a, b) { return (map[a].t || 0) - (map[b].t || 0); });
      for (var i = 0; i < keys.length - 100; i++) {
        delete map[keys[i]];
      }
    }

    PropertiesService.getScriptProperties().setProperty('_err_dedup', JSON.stringify(map));
  } catch (e) { /* non-critical */ }
}

/**
 * _incrementErrorCount_ — Bump occurrence count for deduped error
 */
function _incrementErrorCount_(fingerprint) {
  try {
    var ss = _getErrorSheet_();
    if (!ss) return;
    var lastRow = ss.getLastRow();
    if (lastRow < 2) return;
    // Find the most recent row with this fingerprint and increment count
    var data = ss.getRange(Math.max(2, lastRow - 20), 1, Math.min(20, lastRow - 1), 8).getValues();
    for (var i = data.length - 1; i >= 0; i--) {
      var rowFp = data[i][2] + '|' + data[i][4].substring(0, 100);
      if (rowFp === fingerprint.substring(0, fingerprint.indexOf('|', fingerprint.indexOf('|') + 1) + 100)) {
        var count = Number(data[i][7]) || 1;
        ss.getRange(Math.max(2, lastRow - 20) + i, 8).setValue(count + 1);
        break;
      }
    }
  } catch (e) { /* non-critical */ }
}

/**
 * _alertCriticalError_ — Send LINE alert for CRITICAL errors
 */
function _alertCriticalError_(action, errorMsg) {
  try {
    var lineToken = getConfig('LINE_CHANNEL_ACCESS_TOKEN', '');
    var groupId = getConfig('LINE_GROUP_EXECUTIVE', '') || getConfig('LINE_GROUP_ACCOUNTING', '');
    if (!lineToken || !groupId) return;

    var msg = '🔴 CRITICAL ERROR\n' +
              'Action: ' + action + '\n' +
              'Error: ' + errorMsg.substring(0, 200) + '\n' +
              'Time: ' + Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd HH:mm:ss');

    UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', {
      method: 'post',
      contentType: 'application/json',
      headers: { 'Authorization': 'Bearer ' + lineToken },
      payload: JSON.stringify({ to: groupId, messages: [{ type: 'text', text: msg }] }),
      muteHttpExceptions: true
    });
  } catch (e) { /* never throw */ }
}

/**
 * getErrorTelemetryStats — Dashboard endpoint for error stats
 * @return {Object} Error statistics
 */
function getErrorTelemetryStats() {
  try {
    var ss = _getErrorSheet_();
    if (!ss || ss.getLastRow() < 2) {
      return { success: true, total: 0, by_severity: {}, recent: [] };
    }

    var lastRow = ss.getLastRow();
    var data = ss.getRange(2, 1, Math.min(lastRow - 1, 500), 8).getValues();

    var bySeverity = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
    var byAction = {};
    var recent = [];

    for (var i = 0; i < data.length; i++) {
      var sev = data[i][1] || 'MEDIUM';
      bySeverity[sev] = (bySeverity[sev] || 0) + 1;

      var act = data[i][2] || 'unknown';
      byAction[act] = (byAction[act] || 0) + 1;

      if (i >= data.length - 10) {
        recent.push({
          timestamp: data[i][0],
          severity: sev,
          action: act,
          error: String(data[i][4]).substring(0, 100),
          count: data[i][7] || 1
        });
      }
    }

    return {
      success: true,
      status: 'healthy',
      total: data.length,
      by_severity: bySeverity,
      by_action: byAction,
      recent: recent
    };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

/**
 * _classifyError_ — Auto-classify error severity based on patterns
 * @param {string} action — The action that failed
 * @param {Error|string} error — The error
 * @return {string} severity level
 */
function _classifyError_(action, error) {
  var msg = String((error && error.message) || error || '').toLowerCase();
  var act = String(action || '').toLowerCase();

  // CRITICAL: System-level failures
  if (msg.indexOf('quota') !== -1 && msg.indexOf('exceeded') !== -1) return 'CRITICAL';
  if (msg.indexOf('permission denied') !== -1) return 'CRITICAL';
  if (msg.indexOf('spreadsheet not found') !== -1) return 'CRITICAL';
  if (act.indexOf('auth') !== -1 && msg.indexOf('bypass') !== -1) return 'CRITICAL';

  // HIGH: Feature-breaking failures
  if (act.indexOf('billing') !== -1 || act.indexOf('payment') !== -1) return 'HIGH';
  if (act.indexOf('job') !== -1 && msg.indexOf('transition') !== -1) return 'HIGH';
  if (msg.indexOf('timeout') !== -1) return 'HIGH';
  if (msg.indexOf('circuit') !== -1) return 'HIGH';

  // MEDIUM: Degraded but functional
  if (msg.indexOf('retry') !== -1) return 'MEDIUM';
  if (msg.indexOf('fallback') !== -1) return 'MEDIUM';
  if (msg.indexOf('rate limit') !== -1) return 'MEDIUM';

  // LOW: Expected/cosmetic
  return 'LOW';
}


// ============================================================
// Phase 2D: Error Trend Analysis + Anomaly Detection
// ============================================================

/**
 * runErrorTrendAnalysis — Daily cron to analyze error patterns
 * Detects: error rate spikes, new error types, severity escalation
 * @return {Object} Trend analysis report
 */
function runErrorTrendAnalysis() {
  var report = {
    timestamp: Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd HH:mm:ss'),
    status: 'HEALTHY',
    alerts: [],
    trends: {}
  };

  try {
    var ss = _getErrorSheet_();
    if (!ss || ss.getLastRow() < 2) {
      report.status = 'NO_DATA';
      return { success: true, report: report };
    }

    var lastRow = ss.getLastRow();
    var data = ss.getRange(2, 1, Math.min(lastRow - 1, 5000), 8).getValues();

    // 1. Count errors by severity (last 24h vs previous 24h)
    var now = Date.now();
    var day1 = 24 * 60 * 60 * 1000;
    var recent24h = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, total: 0 };
    var prev24h = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, total: 0 };

    for (var i = 0; i < data.length; i++) {
      var rowTime = _parseTimestamp_(data[i][0]);
      if (!rowTime) continue;
      var age = now - rowTime;
      var sev = data[i][1] || 'MEDIUM';
      var count = Number(data[i][7]) || 1;

      if (age < day1) {
        recent24h[sev] = (recent24h[sev] || 0) + count;
        recent24h.total += count;
      } else if (age < day1 * 2) {
        prev24h[sev] = (prev24h[sev] || 0) + count;
        prev24h.total += count;
      }
    }

    report.trends.recent_24h = recent24h;
    report.trends.prev_24h = prev24h;

    // 2. Detect error rate spike (>2x previous day)
    if (prev24h.total > 0 && recent24h.total > prev24h.total * 2) {
      report.alerts.push({
        level: 'WARNING',
        type: 'SPIKE',
        message: 'Error rate spike: ' + recent24h.total + ' vs ' + prev24h.total + ' (prev day)'
      });
    }

    // 3. Detect new CRITICAL errors
    if (recent24h.CRITICAL > 0 && prev24h.CRITICAL === 0) {
      report.alerts.push({
        level: 'CRITICAL',
        type: 'NEW_CRITICAL',
        message: 'New CRITICAL errors detected: ' + recent24h.CRITICAL
      });
    }

    // 4. Find top error sources
    var byAction = {};
    for (var j = 0; j < data.length; j++) {
      var rowTime2 = _parseTimestamp_(data[j][0]);
      if (!rowTime2 || (now - rowTime2) > day1) continue;
      var act = data[j][2] || 'unknown';
      byAction[act] = (byAction[act] || 0) + (Number(data[j][7]) || 1);
    }

    var topActions = Object.keys(byAction).sort(function(a, b) { return byAction[b] - byAction[a]; }).slice(0, 5);
    report.trends.top_error_sources = topActions.map(function(a) { return { action: a, count: byAction[a] }; });

    // 5. Determine overall status
    if (report.alerts.some(function(a) { return a.level === 'CRITICAL'; })) {
      report.status = 'CRITICAL';
    } else if (report.alerts.length > 0) {
      report.status = 'WARNING';
    }

    // 6. Save trend report
    _saveTrendReport_(report);

    // 7. Alert on CRITICAL
    if (report.status === 'CRITICAL') {
      _alertTrendCritical_(report);
    }

    return { success: true, report: report };
  } catch (e) {
    try { _logError_('HIGH', 'runErrorTrendAnalysis', e); } catch (ignore) {}
    return { success: false, error: e.toString() };
  }
}

/**
 * _parseTimestamp_ — Parse timestamp string to Date.getTime()
 */
function _parseTimestamp_(ts) {
  try {
    if (!ts) return null;
    if (ts instanceof Date) return ts.getTime();
    var d = new Date(String(ts));
    return isNaN(d.getTime()) ? null : d.getTime();
  } catch (e) { return null; }
}

/**
 * _saveTrendReport_ — Save trend report to DB_ERROR_TRENDS sheet
 */
function _saveTrendReport_(report) {
  try {
    var ssId = PropertiesService.getScriptProperties().getProperty('DB_SS_ID');
    if (!ssId) return;
    var ss = SpreadsheetApp.openById(ssId);
    var sheet = ss.getSheetByName('DB_ERROR_TRENDS');
    if (!sheet) {
      sheet = ss.insertSheet('DB_ERROR_TRENDS');
      sheet.appendRow(['timestamp', 'status', 'total_24h', 'critical_24h', 'high_24h', 'top_sources', 'alerts']);
      sheet.setFrozenRows(1);
    }

    var r = report.trends.recent_24h;
    sheet.appendRow([
      report.timestamp,
      report.status,
      r.total,
      r.CRITICAL,
      r.HIGH,
      JSON.stringify(report.trends.top_error_sources || []),
      JSON.stringify(report.alerts)
    ]);

    // Keep 90 days
    if (sheet.getLastRow() > 92) {
      sheet.deleteRows(2, sheet.getLastRow() - 92);
    }
  } catch (e) { /* non-critical */ }
}

/**
 * _alertTrendCritical_ — LINE alert for critical error trends
 */
function _alertTrendCritical_(report) {
  try {
    var lineToken = getConfig('LINE_CHANNEL_ACCESS_TOKEN', '');
    var groupId = getConfig('LINE_GROUP_EXECUTIVE', '') || getConfig('LINE_GROUP_ACCOUNTING', '');
    if (!lineToken || !groupId) return;

    var alertMsgs = report.alerts.filter(function(a) { return a.level === 'CRITICAL'; })
                                 .map(function(a) { return '• ' + a.message; });

    var topSrcs = (report.trends.top_error_sources || []).map(function(s) {
      return '  ' + s.action + ': ' + s.count;
    });

    var msg = '📈 ERROR TREND ALERT\n' +
              'Status: ' + report.status + '\n' +
              'Time: ' + report.timestamp + '\n' +
              'Errors (24h): ' + report.trends.recent_24h.total + '\n' +
              'Alerts:\n' + alertMsgs.join('\n') + '\n' +
              'Top Sources:\n' + topSrcs.join('\n');

    UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', {
      method: 'post',
      contentType: 'application/json',
      headers: { 'Authorization': 'Bearer ' + lineToken },
      payload: JSON.stringify({ to: groupId, messages: [{ type: 'text', text: msg }] }),
      muteHttpExceptions: true
    });
  } catch (e) { /* never throw */ }
}

/**
 * getErrorTrendStatus — Dashboard endpoint for error trends
 */
function getErrorTrendStatus() {
  try {
    var ssId = PropertiesService.getScriptProperties().getProperty('DB_SS_ID');
    if (!ssId) return { success: true, status: 'NO_DATA' };

    var ss = SpreadsheetApp.openById(ssId);
    var sheet = ss.getSheetByName('DB_ERROR_TRENDS');
    if (!sheet || sheet.getLastRow() < 2) {
      return { success: true, status: 'NO_DATA', message: 'No trend data yet' };
    }

    var lastRow = sheet.getLastRow();
    var data = sheet.getRange(lastRow, 1, 1, 7).getValues()[0];

    return {
      success: true,
      status: data[1],
      last_analysis: data[0],
      total_24h: data[2],
      critical_24h: data[3],
      high_24h: data[4],
      top_sources: JSON.parse(data[5] || '[]'),
      alerts: JSON.parse(data[6] || '[]')
    };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

/**
 * setupErrorTrendTrigger — Set up daily error trend analysis
 */
function setupErrorTrendTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'runErrorTrendAnalysis') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }

  ScriptApp.newTrigger('runErrorTrendAnalysis')
    .timeBased()
    .everyDays(1)
    .atHour(7) // 7 AM daily (after stewardship at 6 AM)
    .create();

  return { success: true, message: 'Error trend trigger set: daily at 7:00 AM' };
}

// ============================================================
// Phase 2E-1: Structured Info Logging
// ============================================================

/**
 * _logInfo_ — Structured info-level telemetry
 * Replaces raw Logger.log with structured, queryable output.
 * NEVER throws. Writes to both Logger.log (console) and DB_LOGS (sheet).
 *
 * @param {string} action — The function/section logging this message
 * @param {string} message — Human-readable message
 * @param {Object} [context] — Optional structured context
 */
function _logInfo_(action, message, context) {
  try {
    // Always write to Logger.log for GAS execution log
    Logger.log('[INFO][' + action + '] ' + message);

    // Lightweight sheet write — skip if DB_SS_ID not configured
    var ssId = PropertiesService.getScriptProperties().getProperty('DB_SS_ID');
    if (!ssId) return;

    var ss = SpreadsheetApp.openById(ssId);
    var sheet = ss.getSheetByName('DB_LOGS');
    if (!sheet) {
      sheet = ss.insertSheet('DB_LOGS');
      sheet.appendRow(['timestamp', 'level', 'action', 'message', 'context']);
      sheet.setFrozenRows(1);
      sheet.setColumnWidth(1, 160);
      sheet.setColumnWidth(3, 150);
      sheet.setColumnWidth(4, 300);
      sheet.setColumnWidth(5, 300);
    }

    var now = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd HH:mm:ss');
    var ctxStr = '';
    try { ctxStr = context ? JSON.stringify(context).substring(0, 1000) : ''; } catch (e) { ctxStr = String(context).substring(0, 1000); }

    sheet.appendRow([now, 'INFO', action, message.substring(0, 500), ctxStr]);

    // Auto-prune at 3000 rows (keep ~30 days at ~100 entries/day)
    if (sheet.getLastRow() > 3001) {
      sheet.deleteRows(2, sheet.getLastRow() - 3001);
    }
  } catch (e) {
    // NEVER throw from logger — fallback to raw Logger.log
    try { Logger.log('[INFO FALLBACK][' + action + '] ' + message); } catch (ignore) {}
  }
}

/**
 * _cronWrap_ — Instrumented cron execution wrapper
 * Wraps a cron function with entry/exit telemetry, timing, and error capture.
 * Use at the TOP of cron functions: return _cronWrap_('cronName', function() { ... });
 *
 * @param {string} name — Cron job name (e.g. 'autoBackup')
 * @param {Function} fn — The cron function body
 * @return {*} Original function return value
 */
function _cronWrap_(name, fn) {
  var startMs = Date.now();
  _logInfo_('cron:' + name, 'START');
  try {
    var result = fn();
    var elapsed = Date.now() - startMs;
    var summary = '';
    try {
      if (result && typeof result === 'object') {
        summary = result.success === false ? 'FAIL' : 'OK';
        if (result.error) summary += ' — ' + String(result.error).substring(0, 100);
        if (result.message) summary += ' — ' + String(result.message).substring(0, 100);
      } else {
        summary = 'OK (no result object)';
      }
    } catch (e) { summary = 'OK (result parse error)'; }
    _logInfo_('cron:' + name, 'END [' + elapsed + 'ms] ' + summary);
    return result;
  } catch (e) {
    var elapsed2 = Date.now() - startMs;
    _logError_('HIGH', 'cron:' + name, e, { elapsed_ms: elapsed2, cron: name });
    _logInfo_('cron:' + name, 'CRASH [' + elapsed2 + 'ms] ' + String(e).substring(0, 200));
    throw e; // Re-throw so GAS reports the failure
  }
}

/**
 * getCronTelemetryStats — Dashboard endpoint for cron execution stats
 * Reads from DB_LOGS to show recent cron run history
 */
function getCronTelemetryStats() {
  try {
    var ssId = PropertiesService.getScriptProperties().getProperty('DB_SS_ID');
    if (!ssId) return { success: true, cron_runs: [] };
    var ss = SpreadsheetApp.openById(ssId);
    var sheet = ss.getSheetByName('DB_LOGS');
    if (!sheet || sheet.getLastRow() < 2) return { success: true, cron_runs: [] };

    var lastRow = sheet.getLastRow();
    var data = ss.getSheetByName('DB_LOGS').getRange(2, 1, Math.min(lastRow - 1, 500), 5).getValues();

    var cronRuns = [];
    for (var i = 0; i < data.length; i++) {
      var action = String(data[i][2] || '');
      if (action.indexOf('cron:') === 0) {
        cronRuns.push({
          timestamp: data[i][0],
          level: data[i][1],
          cron: action.replace('cron:', ''),
          message: data[i][3],
          context: data[i][4]
        });
      }
    }

    // Get last run per cron
    var lastRun = {};
    for (var j = 0; j < cronRuns.length; j++) {
      var cronName = cronRuns[j].cron;
      if (cronRuns[j].message.indexOf('END') === 0 || cronRuns[j].message.indexOf('CRASH') === 0) {
        lastRun[cronName] = cronRuns[j];
      }
    }

    return {
      success: true,
      recent_runs: cronRuns.slice(-20),
      last_run_per_cron: lastRun,
      total_log_entries: cronRuns.length
    };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}
