// ============================================================
// COMPHONE SUPER APP V5.5+ — ErrorTelemetry.gs
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
