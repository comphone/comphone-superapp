// ============================================================
// COMPHONE SUPER APP v5.9.0-phase31a — SheetOptimizer.gs
// Phase 4: Sheet Optimization — preload, reuse, reduce reads
// ============================================================

var _SHEET_CACHE_ = {}; // In-memory cache per execution
var _SS_INSTANCE_ = null; // Singleton spreadsheet instance

/**
 * getComphoneSheetCached — Singleton pattern to avoid repeated openById
 * GAS V8: SpreadsheetApp.openById() takes ~300-500ms each call
 * This reduces it to 1 call per execution
 */
function getComphoneSheetCached() {
  if (_SS_INSTANCE_) return _SS_INSTANCE_;
  _SS_INSTANCE_ = getComphoneSheet();
  return _SS_INSTANCE_;
}

/**
 * getSheetDataCached — Read sheet data once and cache in memory
 * Subsequent calls within same execution return cached data
 */
function getSheetDataCached(sheetName) {
  if (_SHEET_CACHE_[sheetName]) return _SHEET_CACHE_[sheetName];
  var ss = getComphoneSheetCached();
  if (!ss) return null;
  var sh = findSheetByName(ss, sheetName);
  if (!sh || sh.getLastRow() < 2) {
    _SHEET_CACHE_[sheetName] = { headers: [], rows: [], sheet: sh };
    return _SHEET_CACHE_[sheetName];
  }
  var lastRow = sh.getLastRow();
  var lastCol = sh.getLastColumn();
  _SHEET_CACHE_[sheetName] = {
    headers: sh.getRange(1, 1, 1, lastCol).getValues()[0],
    rows: sh.getRange(2, 1, lastRow - 1, lastCol).getValues(),
    sheet: sh,
    lastRow: lastRow,
    lastCol: lastCol
  };
  return _SHEET_CACHE_[sheetName];
}

/**
 * clearSheetCache — Call after write operations to invalidate cache
 */
function clearSheetCache(sheetName) {
  if (sheetName) {
    delete _SHEET_CACHE_[sheetName];
  } else {
    _SHEET_CACHE_ = {};
    _SS_INSTANCE_ = null;
  }
}

/**
 * batchReadSheets — Read multiple sheets in sequence (single SS open)
 * More efficient than calling getSheetDataCached separately
 */
function batchReadSheets(sheetNames) {
  var ss = getComphoneSheetCached();
  if (!ss) return {};
  var result = {};
  sheetNames.forEach(function(name) {
    result[name] = getSheetDataCached(name);
  });
  return result;
}

/**
 * findRowByKey — Binary search on sorted data, or linear scan
 */
function findRowByKey(sheetData, keyColIndex, keyValue) {
  if (!sheetData || !sheetData.rows) return -1;
  var rows = sheetData.rows;
  var keyStr = String(keyValue || '').trim().toLowerCase();
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i][keyColIndex] || '').trim().toLowerCase() === keyStr) return i;
  }
  return -1;
}

/**
 * findHeaderIndex — Find column index by header name (case-insensitive)
 */
function findHeaderIndexOpt(headers, candidates) {
  if (!headers) return -1;
  var lower = headers.map(function(h) { return String(h || '').toLowerCase().trim(); });
  for (var i = 0; i < candidates.length; i++) {
    var idx = lower.indexOf(candidates[i].toLowerCase().trim());
    if (idx >= 0) return idx;
  }
  return -1;
}

/**
 * getReportData — Optimized report using cached sheet reads
 */
function getReportData(params) {
  params = params || {};
  var period = params.period || 'month';
  var cacheKey = 'report_data_' + period;

  // Try GAS CacheService
  try {
    var cache = CacheService.getScriptCache();
    var cached = cache.get(cacheKey);
    if (cached) {
      var parsed = JSON.parse(cached);
      parsed._cached = true;
      return parsed;
    }
  } catch(e) {}

  var start = Date.now();
  var now = new Date();
  var periodStart;
  switch(period) {
    case 'today': periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()); break;
    case 'week':  periodStart = new Date(now.getTime() - 7 * 86400000); break;
    case 'month': periodStart = new Date(now.getFullYear(), now.getMonth(), 1); break;
    case 'year':  periodStart = new Date(now.getFullYear(), 0, 1); break;
    default:      periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  // Read all needed sheets at once
  var sheets = batchReadSheets(['DBJOBS', 'DBBILLING', 'DBINVENTORY']);
  var jobsData = sheets['DBJOBS'];
  var billingData = sheets['DBBILLING'];

  // Process jobs
  var totalJobs = 0, completedJobs = 0;
  var doneStatuses = ['เสร็จแล้ว', 'ส่งคืนแล้ว'];
  if (jobsData && jobsData.rows.length) {
    var statusIdx = findHeaderIndexOpt(jobsData.headers, ['สถานะ', 'status']);
    var dateIdx = findHeaderIndexOpt(jobsData.headers, ['วันที่', 'created_at', 'date']);
    jobsData.rows.forEach(function(r) {
      if (!r[0]) return;
      var rowDate = null;
      try { rowDate = new Date(r[dateIdx] || ''); } catch(e) {}
      if (!rowDate || isNaN(rowDate.getTime()) || rowDate < periodStart) return;
      totalJobs++;
      if (doneStatuses.indexOf(String(r[statusIdx] || '')) >= 0) completedJobs++;
    });
  }

  // Process billing/revenue
  var revenue = { today: 0, week: 0, month: 0, period: 0 };
  var todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  var weekStart = new Date(now.getTime() - 7 * 86400000);
  var monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  if (billingData && billingData.rows.length) {
    var amtIdx = findHeaderIndexOpt(billingData.headers, ['amount', 'ยอด', 'total', 'grand_total']);
    var bdateIdx = findHeaderIndexOpt(billingData.headers, ['วันที่', 'date', 'created_at', 'billing_date']);
    var bstatIdx = findHeaderIndexOpt(billingData.headers, ['สถานะ', 'status']);
    billingData.rows.forEach(function(r) {
      if (!r[0]) return;
      if (bstatIdx >= 0) {
        var st = String(r[bstatIdx] || '').toLowerCase();
        if (st === 'cancelled' || st === 'ยกเลิก') return;
      }
      var amt = Number(r[amtIdx] || 0);
      if (!amt) return;
      var rowDate = null;
      try { rowDate = new Date(r[bdateIdx] || ''); } catch(e) {}
      if (!rowDate || isNaN(rowDate.getTime())) return;
      if (rowDate >= todayStart) revenue.today += amt;
      if (rowDate >= weekStart) revenue.week += amt;
      if (rowDate >= monthStart) revenue.month += amt;
      if (rowDate >= periodStart) revenue.period += amt;
    });
  }

  var result = {
    success: true,
    period: period,
    period_start: periodStart.toISOString(),
    total_jobs: totalJobs,
    completed_jobs: completedJobs,
    completion_rate: totalJobs > 0 ? Math.round(completedJobs / totalJobs * 100) : 0,
    revenue: revenue,
    _elapsed_ms: Date.now() - start,
    _cached: false
  };

  // Cache for 5 minutes
  try {
    CacheService.getScriptCache().put(cacheKey, JSON.stringify(result), 300);
  } catch(e) {}

  return result;
}
