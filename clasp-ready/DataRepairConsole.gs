// ============================================================
// COMPHONE SUPER APP - Sprint 111 Controlled Data Repair Console
// Purpose: preview and execute narrowly scoped production data repairs with
// archive-before-change and audit logging.
// ============================================================

var DATA_REPAIR_CONFIRM = 'EXECUTE_REVIEWED_DATA_REPAIR';
var DATA_REPAIR_ARCHIVE_SHEET = 'DB_DATA_REPAIR_ARCHIVE';
var DATA_REPAIR_AUDIT_SHEET = 'DB_DATA_REPAIR_AUDIT';

function previewDataRepair(params) {
  params = params || {};
  try {
    var ss = getComphoneSheet();
    if (!ss) return { success: false, error: 'Spreadsheet not found' };

    var report = {
      success: true,
      status: 'preview',
      executed: false,
      confirm_required: DATA_REPAIR_CONFIRM,
      generated_at: new Date(),
      candidates: [],
      notes: []
    };

    report.candidates = report.candidates.concat(scanIncompleteBillingRows_(ss));
    report.candidates = report.candidates.concat(buildReportRevenueReviewCandidate_(params));

    if (!report.candidates.length) {
      report.notes.push('No repair candidates found by Sprint 111 preview.');
    }
    return report;
  } catch (e) {
    return { success: false, error: e.toString(), status: 'preview-error' };
  }
}

function executeDataRepair(params) {
  params = params || {};
  try {
    var execute = params.execute === true || params.execute === 'true' || params.execute === '1';
    var confirm = String(params.confirm || '');
    var repairId = String(params.repair_id || params.repairId || '').trim();
    var requestedAction = String(params.repair_action || params.action_type || '').trim();

    if (!execute) {
      var preview = previewDataRepair(params);
      preview.status = 'preview-only';
      return preview;
    }
    if (confirm !== DATA_REPAIR_CONFIRM) {
      return {
        success: false,
        status: 'blocked',
        executed: false,
        error: 'Execution blocked: confirm must be ' + DATA_REPAIR_CONFIRM + '.'
      };
    }
    if (!repairId) {
      return { success: false, status: 'blocked', executed: false, error: 'repair_id is required.' };
    }

    var ss = getComphoneSheet();
    if (!ss) return { success: false, error: 'Spreadsheet not found' };

    var previewReport = previewDataRepair(params);
    if (!previewReport.success) return previewReport;
    var candidate = null;
    for (var i = 0; i < previewReport.candidates.length; i++) {
      if (String(previewReport.candidates[i].repair_id || '') === repairId) {
        candidate = previewReport.candidates[i];
        break;
      }
    }
    if (!candidate) {
      logDataRepairAudit_(ss, 'blocked-not-found', repairId, requestedAction, params, {});
      return { success: false, status: 'blocked', executed: false, error: 'Repair candidate not found or no longer valid: ' + repairId };
    }

    if (candidate.safe_action !== 'archive_delete_orphan_billing_row') {
      logDataRepairAudit_(ss, 'blocked-unsupported-action', repairId, requestedAction, params, candidate);
      return {
        success: false,
        status: 'blocked',
        executed: false,
        error: 'Candidate is preview-only and cannot be executed automatically.'
      };
    }
    if (requestedAction && requestedAction !== candidate.safe_action) {
      logDataRepairAudit_(ss, 'blocked-action-mismatch', repairId, requestedAction, params, candidate);
      return { success: false, status: 'blocked', executed: false, error: 'repair_action does not match candidate safe_action.' };
    }

    var result = archiveDeleteBillingCandidate_(ss, candidate, params);
    logDataRepairAudit_(ss, result.success ? 'executed' : 'failed', repairId, candidate.safe_action, params, candidate, result);
    return result;
  } catch (e) {
    return { success: false, status: 'execute-error', executed: false, error: e.toString() };
  }
}

function getDataRepairStatus(params) {
  params = params || {};
  var preview = previewDataRepair(params);
  if (!preview.success) return preview;
  return {
    success: true,
    status: 'ok',
    version: 'sprint111-controlled-data-repair-execution-1.0.0',
    confirm_required: DATA_REPAIR_CONFIRM,
    archive_sheet: DATA_REPAIR_ARCHIVE_SHEET,
    audit_sheet: DATA_REPAIR_AUDIT_SHEET,
    candidate_count: preview.candidates.length,
    candidates: preview.candidates
  };
}

function scanIncompleteBillingRows_(ss) {
  var candidates = [];
  var sh = findSheetByName(ss, 'DB_BILLING');
  if (!sh || sh.getLastRow() < 2) return candidates;

  var values = sh.getDataRange().getValues();
  var headers = values[0].map(function(h) { return String(h || ''); });
  var billingIdCol = dataRepairFindHeader_(headers, ['Billing_ID', 'billing_id', 'Bill_ID', 'bill_id']);
  var jobIdCol = dataRepairFindHeader_(headers, ['Job_ID', 'job_id', 'JobID']);
  var amountCol = dataRepairFindHeader_(headers, ['Total_Amount', 'total_amount', 'Amount', 'Total']);
  var statusCol = dataRepairFindHeader_(headers, ['Payment_Status', 'payment_status', 'Status']);

  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    if (dataRepairRowBlank_(row)) continue;

    var billingId = dataRepairCell_(row, billingIdCol);
    var jobId = dataRepairCell_(row, jobIdCol);
    var amount = dataRepairCell_(row, amountCol);
    var status = dataRepairCell_(row, statusCol);
    var missing = [];
    if (!billingId) missing.push('Billing_ID');
    if (!jobId) missing.push('Job_ID');
    if (!amount && amount !== 0) missing.push('Total_Amount');
    if (!status) missing.push('Payment_Status');

    if (!missing.length) continue;
    var rowNumber = i + 1;
    var canArchiveDelete = !billingId && !jobId;
    candidates.push({
      repair_id: 'billing-row-' + rowNumber,
      scope: 'billing',
      source_sheet: 'DB_BILLING',
      source_row: rowNumber,
      safe_action: canArchiveDelete ? 'archive_delete_orphan_billing_row' : 'manual_backfill_required',
      executable: canArchiveDelete,
      archive_required: true,
      owner_confirmation_required: true,
      missing_fields: missing,
      preview: dataRepairPreviewRow_(headers, row),
      recommendation: canArchiveDelete
        ? 'Archive then delete only after owner confirms this is an orphan billing row.'
        : 'Manual review/backfill required because the row still has a usable billing or job identifier.'
    });
  }
  return candidates;
}

function buildReportRevenueReviewCandidate_(params) {
  params = params || {};
  var period = String(params.period || 'month');
  return [{
    repair_id: 'reports-daily-revenue-' + period,
    scope: 'reports',
    source_sheet: 'DB_BILLING',
    source_row: null,
    safe_action: 'business_review_only',
    executable: false,
    archive_required: false,
    owner_confirmation_required: true,
    missing_fields: ['dailyRevenue records'],
    preview: { period: period },
    recommendation: 'Confirm real business activity and source date/status/amount fields before changing Reports logic.'
  }];
}

function archiveDeleteBillingCandidate_(ss, candidate, params) {
  var sh = findSheetByName(ss, 'DB_BILLING');
  if (!sh) return { success: false, executed: false, status: 'failed', error: 'DB_BILLING sheet not found' };

  var rowNumber = Number(candidate.source_row || 0);
  if (rowNumber < 2 || rowNumber > sh.getLastRow()) {
    return { success: false, executed: false, status: 'blocked', error: 'Invalid billing source row.' };
  }

  var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(function(h) { return String(h || ''); });
  var row = sh.getRange(rowNumber, 1, 1, headers.length).getValues()[0];
  var billingId = dataRepairCell_(row, dataRepairFindHeader_(headers, ['Billing_ID', 'billing_id', 'Bill_ID', 'bill_id']));
  var jobId = dataRepairCell_(row, dataRepairFindHeader_(headers, ['Job_ID', 'job_id', 'JobID']));
  if (billingId || jobId) {
    return { success: false, executed: false, status: 'blocked', error: 'Row now has Billing_ID or Job_ID; automatic archive/delete is no longer allowed.' };
  }

  var archive = ensureDataRepairArchive_(ss);
  archive.appendRow([
    new Date(),
    candidate.repair_id,
    candidate.scope,
    candidate.source_sheet,
    rowNumber,
    candidate.safe_action,
    String((params && (params.operator || params.user || params.username)) || 'unknown'),
    JSON.stringify(headers),
    JSON.stringify(row),
    String((params && params.reason) || 'Sprint 111 controlled repair')
  ]);

  sh.deleteRow(rowNumber);
  return {
    success: true,
    executed: true,
    status: 'archived-and-deleted',
    repair_id: candidate.repair_id,
    source_sheet: candidate.source_sheet,
    source_row: rowNumber,
    archive_sheet: DATA_REPAIR_ARCHIVE_SHEET
  };
}

function ensureDataRepairArchive_(ss) {
  var sh = findSheetByName(ss, DATA_REPAIR_ARCHIVE_SHEET);
  if (!sh) sh = ss.insertSheet(DATA_REPAIR_ARCHIVE_SHEET);
  if (sh.getLastRow() < 1) {
    sh.appendRow(['Archived_At', 'Repair_ID', 'Scope', 'Source_Sheet', 'Source_Row', 'Action', 'Operator', 'Headers_JSON', 'Row_JSON', 'Reason']);
  }
  return sh;
}

function ensureDataRepairAudit_(ss) {
  var sh = findSheetByName(ss, DATA_REPAIR_AUDIT_SHEET);
  if (!sh) sh = ss.insertSheet(DATA_REPAIR_AUDIT_SHEET);
  if (sh.getLastRow() < 1) {
    sh.appendRow(['Logged_At', 'Status', 'Repair_ID', 'Action', 'Operator', 'Candidate_JSON', 'Result_JSON']);
  }
  return sh;
}

function logDataRepairAudit_(ss, status, repairId, action, params, candidate, result) {
  try {
    var audit = ensureDataRepairAudit_(ss);
    audit.appendRow([
      new Date(),
      status,
      repairId,
      action,
      String((params && (params.operator || params.user || params.username)) || 'unknown'),
      JSON.stringify(candidate || {}),
      JSON.stringify(result || {})
    ]);
  } catch (e) {
    Logger.log('[DataRepairConsole] audit failed: ' + e.toString());
  }
}

function dataRepairFindHeader_(headers, candidates) {
  for (var i = 0; i < headers.length; i++) {
    var h = String(headers[i] || '').toLowerCase();
    for (var j = 0; j < candidates.length; j++) {
      if (h === String(candidates[j]).toLowerCase()) return i;
    }
  }
  return -1;
}

function dataRepairCell_(row, index) {
  if (index < 0) return '';
  var value = row[index];
  if (value === 0) return 0;
  return String(value || '').trim();
}

function dataRepairRowBlank_(row) {
  return row.every(function(cell) { return String(cell || '').trim() === ''; });
}

function dataRepairPreviewRow_(headers, row) {
  var preview = {};
  for (var i = 0; i < Math.min(headers.length, row.length, 10); i++) {
    preview[headers[i] || ('Column_' + (i + 1))] = String(row[i] || '').slice(0, 80);
  }
  return preview;
}
