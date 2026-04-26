// ============================================================
// COMPHONE SUPER APP v5.9.0-phase2d
// AuditLog.gs — Structured Audit Log (DB_AUDIT sheet)
// Version: 5.6.0
// ============================================================
// Schema DB_AUDIT:
//   timestamp | action | user | role | ip | job_id | detail | result | session_id
// ============================================================

'use strict';

var AUDIT_SHEET_NAME = 'DB_AUDIT';

var AUDIT_SCHEMA = [
  'timestamp', 'action', 'user', 'role', 'ip',
  'job_id', 'detail', 'result', 'session_id'
];

// ============================================================
// CORE: writeAuditLog()
// ============================================================
/**
 * เขียน Audit Log ลง DB_AUDIT sheet
 * @param {string} action  - ชื่อ action เช่น LOGIN, CREATE_JOB
 * @param {string} user    - username
 * @param {string} detail  - รายละเอียด
 * @param {Object} opts    - { role, ip, job_id, result, session_id }
 */
function writeAuditLog(action, user, detail, opts) {
  try {
    opts = opts || {};
    var ss  = getComphoneSheet();
    var sh  = _getOrCreateAuditSheet_(ss);
    var now = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd HH:mm:ss');

    sh.appendRow([
      now,
      String(action  || '').toUpperCase(),
      String(user    || 'SYSTEM'),
      String(opts.role       || ''),
      String(opts.ip         || ''),
      String(opts.job_id     || ''),
      String(detail  || '').substring(0, 500),
      String(opts.result     || 'ok'),
      String(opts.session_id || '')
    ]);
  } catch (e) {
    Logger.log('writeAuditLog ERROR: ' + e.message);
  }
}

// ============================================================
// QUERY: getAuditLog()
// ============================================================
/**
 * ดึง Audit Log ตามเงื่อนไข
 * @param {Object} params - { limit, action, user, from_date, to_date, job_id }
 * @return {Object} { success, logs, total }
 */
function getAuditLog(params) {
  try {
    params = params || {};
    var limit    = Math.min(Number(params.limit || 100), 500);
    var filterAction = String(params.action || '').toUpperCase();
    var filterUser   = String(params.user   || '').toLowerCase();
    var filterJobId  = String(params.job_id || '');
    var fromDate     = params.from_date ? new Date(params.from_date) : null;
    var toDate       = params.to_date   ? new Date(params.to_date)   : null;

    var ss  = getComphoneSheet();
    var sh  = _getOrCreateAuditSheet_(ss);
    var all = sh.getDataRange().getValues();

    if (all.length <= 1) return { success: true, logs: [], total: 0 };

    var headers = all[0];
    var tsIdx     = _findColIdx_(headers, 'timestamp');
    var actionIdx = _findColIdx_(headers, 'action');
    var userIdx   = _findColIdx_(headers, 'user');
    var roleIdx   = _findColIdx_(headers, 'role');
    var jobIdx    = _findColIdx_(headers, 'job_id');
    var detailIdx = _findColIdx_(headers, 'detail');
    var resultIdx = _findColIdx_(headers, 'result');
    var sessIdx   = _findColIdx_(headers, 'session_id');

    var logs = [];
    // อ่านจากท้ายขึ้นมา (ล่าสุดก่อน)
    for (var i = all.length - 1; i >= 1; i--) {
      var row = all[i];
      if (!row[tsIdx]) continue;

      // Filter
      if (filterAction && String(row[actionIdx] || '').toUpperCase().indexOf(filterAction) === -1) continue;
      if (filterUser   && String(row[userIdx]   || '').toLowerCase().indexOf(filterUser)   === -1) continue;
      if (filterJobId  && String(row[jobIdx]    || '') !== filterJobId) continue;

      var rowDate = row[tsIdx] ? new Date(row[tsIdx]) : null;
      if (fromDate && rowDate && rowDate < fromDate) continue;
      if (toDate   && rowDate && rowDate > toDate)   continue;

      logs.push({
        timestamp:  String(row[tsIdx]     || ''),
        action:     String(row[actionIdx] || ''),
        user:       String(row[userIdx]   || ''),
        role:       String(row[roleIdx]   || ''),
        job_id:     String(row[jobIdx]    || ''),
        detail:     String(row[detailIdx] || ''),
        result:     String(row[resultIdx] || ''),
        session_id: String(row[sessIdx]   || '')
      });

      if (logs.length >= limit) break;
    }

    return { success: true, logs: logs, total: logs.length };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ============================================================
// SUMMARY: getAuditSummary()
// ============================================================
/**
 * สรุป Audit Log รายวัน/รายสัปดาห์
 * @param {string} period - 'today' | 'week' | 'month'
 * @return {Object} { success, summary }
 */
function getAuditSummary(period) {
  try {
    period = period || 'today';
    var now   = new Date();
    var fromDate;
    if (period === 'today') {
      fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (period === 'week') {
      fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else {
      fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    var result = getAuditLog({ limit: 500, from_date: fromDate.toISOString() });
    if (!result.success) return result;

    // นับตาม action
    var actionCounts = {};
    var userCounts   = {};
    result.logs.forEach(function(log) {
      actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
      userCounts[log.user]     = (userCounts[log.user]     || 0) + 1;
    });

    return {
      success: true,
      period: period,
      total: result.total,
      by_action: actionCounts,
      by_user: userCounts,
      from: fromDate.toISOString()
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ============================================================
// CLEANUP: pruneAuditLog()
// ============================================================
/**
 * ลบ Audit Log ที่เก่ากว่า N วัน
 * @param {number} keepDays - จำนวนวันที่เก็บ (default 90)
 * @return {Object} { success, deleted }
 */
function pruneAuditLog(keepDays) {
  try {
    keepDays = Number(keepDays || 90);
    var cutoff = new Date(Date.now() - keepDays * 24 * 60 * 60 * 1000);

    var ss  = getComphoneSheet();
    var sh  = _getOrCreateAuditSheet_(ss);
    var all = sh.getDataRange().getValues();
    if (all.length <= 1) return { success: true, deleted: 0 };

    var headers = all[0];
    var tsIdx   = _findColIdx_(headers, 'timestamp');

    // หา rows ที่ต้องลบ (เก่ากว่า cutoff)
    var toDelete = [];
    for (var i = 1; i < all.length; i++) {
      var rowDate = all[i][tsIdx] ? new Date(all[i][tsIdx]) : null;
      if (rowDate && rowDate < cutoff) toDelete.push(i + 1); // 1-indexed
    }

    // ลบจากท้ายขึ้นมา (ไม่กระทบ index)
    for (var j = toDelete.length - 1; j >= 0; j--) {
      sh.deleteRow(toDelete[j]);
    }

    Logger.log('pruneAuditLog: deleted ' + toDelete.length + ' rows older than ' + keepDays + ' days');
    return { success: true, deleted: toDelete.length };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ============================================================
// PRIVATE HELPERS
// ============================================================
/**
 * หรือสร้าง DB_AUDIT sheet พร้อม header
 * @param {Spreadsheet} ss
 * @return {Sheet}
 */
function _getOrCreateAuditSheet_(ss) {
  var sh = findSheetByName(ss, AUDIT_SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(AUDIT_SHEET_NAME);
    sh.getRange(1, 1, 1, AUDIT_SCHEMA.length).setValues([AUDIT_SCHEMA]);
    sh.getRange(1, 1, 1, AUDIT_SCHEMA.length)
      .setBackground('#1e293b')
      .setFontColor('#ffffff')
      .setFontWeight('bold');
    sh.setFrozenRows(1);
    Logger.log('DB_AUDIT sheet created');
  }
  return sh;
}

/**
 * หา column index จาก header array
 * @param {Array} headers
 * @param {string} name
 * @return {number}
 */
// _findColIdx_ consolidated to Utils.gs (PHMP v1 dedup)
