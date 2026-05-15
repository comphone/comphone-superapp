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
    notes: []
  };

  if (!requested.length) {
    requested = [
      { scope: 'jobs', id: 'J0022' },
      { scope: 'jobs', id: 'J0021' },
      { scope: 'customers', id: 'C0003' },
      { scope: 'customers', id: 'C0002' }
    ];
    report.requested = requested;
    report.notes.push('No records supplied; using known reviewed smoke candidates.');
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
    report.executed = true;
    report.status = report.deleted.length ? 'deleted-reviewed-smoke-records' : 'nothing-deleted';
  }

  return report;
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
  if (!sheet) {
    report.skipped.push({ scope: scope, sheet: sheetName, reason: 'sheet-not-found' });
    return;
  }

  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return;
  var headers = values[0].map(function(h) { return String(h || ''); });
  var idCol = findHeaderIndex_(headers, headerNames);
  if (idCol < 0) idCol = fallbackCol || 0;

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

function findHeaderIndex_(headers, candidates) {
  for (var i = 0; i < headers.length; i++) {
    var h = String(headers[i] || '').toLowerCase();
    for (var j = 0; j < candidates.length; j++) {
      if (h === String(candidates[j]).toLowerCase()) return i;
    }
  }
  return -1;
}
