// ============================================================
// COMPHONE SUPER APP - Smoke/Test Data Cleanup
// Purpose: remove only reviewed write-smoke records with strict gates.
// ============================================================

var SMOKE_CLEANUP_CONFIRM = 'DELETE_REVIEWED_SMOKE_RECORDS';
var SMOKE_CLEANUP_ARCHIVE_SHEET = 'DB_SMOKE_CLEANUP_ARCHIVE';

function cleanupSmokeTestRecords(params) {
  params = params || {};
  var execute = params.execute === true || params.execute === 'true' || params.execute === '1';
  var confirm = String(params.confirm || '');
  var requested = normalizeSmokeCleanupRecords_(params.records || params.items || params.ids || []);
  var report = {
    success: true,
    executed: false,
    status: execute ? 'execute-requested' : 'review-only',
    reviewed_at: new Date(),
    requested: requested,
    candidates: [],
    deleted: [],
    skipped: [],
    scans: [],
    notes: []
  };

  if (!requested.length) {
    report.status = 'no-records-selected';
    report.notes.push('No records supplied; cleanup is a safe no-op.');
    return report;
  }

  var ss = getComphoneSheet();
  if (!ss) return { success: false, error: 'Spreadsheet not found' };

  var archive = ensureSmokeCleanupArchive_(ss);
  var groups = groupSmokeCleanupRecords_(requested);
  scanSmokeCleanupSheet_(ss, archive, report, groups.jobs, 'jobs', CONFIG.SHEETS.JOBS, ['Job_ID', 'job_id', 'เลขงาน'], 0, execute, confirm);
  scanSmokeCleanupSheet_(ss, archive, report, groups.customers, 'customers', CONFIG.SHEETS.CUSTOMERS, ['Customer_ID', 'customer_id', 'รหัสลูกค้า'], 0, execute, confirm);
  scanSmokeCleanupSheet_(ss, archive, report, groups.billings, 'billings', CONFIG.SHEETS.BILLING, ['Billing_ID', 'billing_id', 'Bill_ID', 'bill_id'], 0, execute, confirm);
  scanSmokeCleanupSheet_(ss, archive, report, groups.purchase_orders, 'purchase_orders', CONFIG.SHEETS.PURCHASE_ORDERS, ['PO_ID', 'po_id', 'Purchase_Order_ID'], 0, execute, confirm);

  if (execute && confirm !== SMOKE_CLEANUP_CONFIRM) {
    report.status = 'blocked';
    report.success = false;
    report.notes.push('Execution blocked: confirm must be ' + SMOKE_CLEANUP_CONFIRM + '.');
    return report;
  }

  if (execute) {
    invalidateSmokeCleanupCaches_(requested);
    report.executed = true;
    report.status = report.deleted.length ? 'deleted-reviewed-smoke-records' : 'nothing-deleted';
  }

  return report;
}

function invalidateSmokeCleanupCaches_(requested) {
  try {
    var cache = CacheService.getScriptCache();
    var keys = ['dashboard_bundle_v61', 'dashboard_data_v89', 'dashboard_data_v557'];
    (requested || []).forEach(function(item) {
      if (item.scope !== 'jobs' && item.scope !== 'job') return;
      var search = String(item.id || '').trim().toLowerCase();
      if (!search) return;
      keys.push('jobs:check:' + search + ':50');
      keys.push('jobs:check:' + search + ':100');
    });
    keys.forEach(function(key) { cache.remove(key); });
  } catch (_cacheError) {}
  try {
    if (typeof invalidateBundleCache === 'function') invalidateBundleCache();
  } catch (_bundleCacheError) {}
}

function normalizeSmokeCleanupRecords_(records) {
  if (typeof records === 'string') {
    try {
      records = JSON.parse(records);
    } catch (e) {
      records = records.split(',').map(function(id) { return { id: id.trim() }; });
    }
  }
  if (!Array.isArray(records)) records = [records];
  var out = [];
  records.forEach(function(item) {
    if (!item) return;
    if (typeof item === 'string') item = { id: item };
    var id = String(item.id || item.job_id || item.customer_id || item.billing_id || item.po_id || '').trim();
    if (!id) return;
    var scope = String(item.scope || '').toLowerCase();
    if (!scope) {
      var first = id.charAt(0).toUpperCase();
      scope = first === 'J' ? 'jobs' : (first === 'C' ? 'customers' : (id.indexOf('PO-') === 0 ? 'purchase_orders' : (first === 'B' ? 'billings' : 'unknown')));
    }
    out.push({ scope: scope, id: id });
  });
  return out;
}

function groupSmokeCleanupRecords_(records) {
  var groups = { jobs: {}, customers: {}, billings: {}, purchase_orders: {} };
  records.forEach(function(item) {
    if (item.scope === 'jobs' || item.scope === 'job') groups.jobs[item.id] = true;
    if (item.scope === 'customers' || item.scope === 'customer') groups.customers[item.id] = true;
    if (item.scope === 'billings' || item.scope === 'billing') groups.billings[item.id] = true;
    if (item.scope === 'purchase_orders' || item.scope === 'purchase_order' || item.scope === 'po') groups.purchase_orders[item.id] = true;
  });
  return groups;
}

function scanSmokeCleanupSheet_(ss, archive, report, idMap, scope, sheetName, headerNames, fallbackCol, execute, confirm) {
  var ids = Object.keys(idMap || {});
  if (!ids.length) return;

  var sheet = findSheetByName(ss, sheetName);
  var scan = {
    scope: scope,
    requested_sheet: sheetName,
    resolved_sheet: sheet ? sheet.getName() : '',
    requested_ids: ids,
    row_count: 0,
    id_column: -1,
    id_header: ''
  };
  report.scans.push(scan);
  if (!sheet) {
    report.skipped.push({ scope: scope, sheet: sheetName, reason: 'sheet-not-found' });
    return;
  }

  var values = sheet.getDataRange().getValues();
  scan.row_count = Math.max(0, values.length - 1);
  if (values.length < 2) return;
  var headers = values[0].map(function(h) { return String(h || ''); });
  var idCol = findSmokeCleanupHeaderIndex_(headers, headerNames);
  if (idCol < 0) idCol = fallbackCol || 0;
  scan.id_column = idCol;
  scan.id_header = headers[idCol] || '';

  var rowsToDelete = [];
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var id = String(row[idCol] || '').trim();
    if (!idMap[id]) continue;
    var markerOk = smokeCleanupRowHasMarker_(row);
    var candidate = {
      scope: scope,
      sheet: sheetName,
      id: id,
      row: i + 1,
      marker_ok: markerOk,
      preview: row.slice(0, Math.min(row.length, 8)).join(' | ')
    };
    report.candidates.push(candidate);

    if (!markerOk) {
      report.skipped.push({ scope: scope, id: id, row: i + 1, reason: 'missing-smoke-marker' });
      continue;
    }

    if (execute && confirm === SMOKE_CLEANUP_CONFIRM) {
      archiveSmokeCleanupRow_(archive, scope, sheetName, id, i + 1, headers, row);
      rowsToDelete.push(i + 1);
      report.deleted.push({ scope: scope, sheet: sheetName, id: id, row: i + 1 });
    }
  }

  rowsToDelete.sort(function(a, b) { return b - a; }).forEach(function(rowNumber) {
    sheet.deleteRow(rowNumber);
  });
}

function smokeCleanupRowHasMarker_(row) {
  var text = JSON.stringify(row || []).toUpperCase();
  return text.indexOf('AUTO WRITE SMOKE') > -1 ||
    text.indexOf('WSMOKE_') > -1 ||
    text.indexOf('PWA_WRITE_SMOKE') > -1 ||
    text.indexOf('SOURCE=PWA_WRITE_SMOKE') > -1 ||
    text.indexOf('SMOKE-TEST') > -1;
}

function ensureSmokeCleanupArchive_(ss) {
  var sheet = findSheetByName(ss, SMOKE_CLEANUP_ARCHIVE_SHEET);
  if (!sheet) sheet = ss.insertSheet(SMOKE_CLEANUP_ARCHIVE_SHEET);
  if (sheet.getLastRow() < 1) {
    sheet.appendRow(['Archived_At', 'Scope', 'Source_Sheet', 'Record_ID', 'Source_Row', 'Headers_JSON', 'Row_JSON']);
  }
  return sheet;
}

function archiveSmokeCleanupRow_(archive, scope, sheetName, id, rowNumber, headers, row) {
  archive.appendRow([
    new Date(),
    scope,
    sheetName,
    id,
    rowNumber,
    JSON.stringify(headers || []),
    JSON.stringify(row || [])
  ]);
}

function findSmokeCleanupHeaderIndex_(headers, candidates) {
  for (var j = 0; j < candidates.length; j++) {
    var candidate = String(candidates[j] || '').trim().toLowerCase();
    for (var i = 0; i < headers.length; i++) {
      if (String(headers[i] || '').trim().toLowerCase() === candidate) return i;
    }
  }
  return -1;
}

// ============================================================
// ล้างข้อมูลงานทดสอบ (Keyword-based test job cleanup)
// ============================================================

var TEST_JOB_KEYWORDS = ['ทดสอบ', 'test', 'demo', 'ตัวอย่าง', 'sample', 'dummy', 'testing', 'ทดลอง'];
var CLEAR_TEST_JOBS_CONFIRM = 'CLEAR_TEST_JOBS';

function clearTestJobsPreview() {
  var ss = getComphoneSheet();
  if (!ss) return { success: false, error: 'Spreadsheet not found' };

  var sheetName = (typeof CONFIG !== 'undefined' && CONFIG.SHEETS && CONFIG.SHEETS.JOBS) ? CONFIG.SHEETS.JOBS : 'DBJOBS';
  var sheet = findSheetByName(ss, sheetName);
  if (!sheet) return { success: false, error: 'ไม่พบ sheet DBJOBS' };

  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return { success: true, candidates: [], total: 0 };

  var headers = values[0].map(function(h) { return String(h || '').toLowerCase(); });
  var idCol      = findHeaderIndex_(headers, ['job_id', 'jobid', 'เลขงาน', 'id']) || 0;
  var custCol    = findHeaderIndex_(headers, ['customer_name', 'customer', 'ชื่อลูกค้า', 'ลูกค้า']);
  var symptomCol = findHeaderIndex_(headers, ['symptom', 'อาการ', 'title', 'หัวข้อ']);
  var phoneCol   = findHeaderIndex_(headers, ['phone', 'เบอร์โทร', 'tel', 'mobile']);
  if (custCol < 0) custCol = 1;

  var candidates = [];
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var id       = String(row[idCol]   || '').trim();
    var customer = String(row[custCol] || '').trim();
    var symptom  = symptomCol >= 0 ? String(row[symptomCol] || '').trim() : '';
    var phone    = phoneCol >= 0 ? String(row[phoneCol] || '').trim() : '';

    if (!id) continue;

    var haystack = (customer + ' ' + symptom + ' ' + phone).toLowerCase();
    var matched = false;
    for (var k = 0; k < TEST_JOB_KEYWORDS.length; k++) {
      if (haystack.indexOf(TEST_JOB_KEYWORDS[k].toLowerCase()) > -1) {
        matched = true;
        break;
      }
    }
    if (!matched) continue;

    candidates.push({
      id: id,
      row: i + 1,
      customer: customer,
      symptom: symptom,
      phone: phone
    });
  }

  return { success: true, candidates: candidates, total: candidates.length };
}

function clearTestJobsExecute(params) {
  params = params || {};
  var confirm = String(params.confirm || '');
  if (confirm !== CLEAR_TEST_JOBS_CONFIRM) {
    return { success: false, error: 'confirm ต้องเป็น ' + CLEAR_TEST_JOBS_CONFIRM };
  }

  var preview = clearTestJobsPreview();
  if (!preview.success) return preview;
  if (!preview.candidates.length) {
    return { success: true, deleted: 0, message: 'ไม่พบข้อมูลทดสอบในระบบ' };
  }

  var ss = getComphoneSheet();
  var sheetName = (typeof CONFIG !== 'undefined' && CONFIG.SHEETS && CONFIG.SHEETS.JOBS) ? CONFIG.SHEETS.JOBS : 'DBJOBS';
  var sheet = findSheetByName(ss, sheetName);
  if (!sheet) return { success: false, error: 'ไม่พบ sheet DBJOBS' };

  var rowNumbers = preview.candidates.map(function(c) { return c.row; });
  rowNumbers.sort(function(a, b) { return b - a; });
  rowNumbers.forEach(function(rowNum) { sheet.deleteRow(rowNum); });

  try {
    var cache = CacheService.getScriptCache();
    cache.remove('dashboard_bundle_v61');
  } catch(e) {}

  try { logActivity('CLEAR_TEST_JOBS', 'ADMIN', 'Deleted ' + rowNumbers.length + ' test job rows'); } catch(e) {}

  return {
    success: true,
    deleted: rowNumbers.length,
    ids: preview.candidates.map(function(c) { return c.id; })
  };
}
