// Sprint 194 — Job Archive Restore Guard
// Verifies that the preview-and-restore flow for DBJOBS_ARCHIVE is correctly
// implemented and cannot silently regress.

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

const checks = [];
let pass = 0;
let fail = 0;

function ok(name, detail) {
  checks.push({ name, status: 'OK', detail: detail || '' });
  pass++;
}
function ko(name, detail) {
  checks.push({ name, status: 'FAIL', detail: detail || '' });
  fail++;
}

// ── GAS backend ─────────────────────────────────────────────

const jobsHandler = read('JobsHandler.gs');

if (/function\s+listJobArchive\s*\(/.test(jobsHandler))
  ok('listJobArchive-defined', 'listJobArchive function present in JobsHandler.gs');
else
  ko('listJobArchive-defined', 'listJobArchive function missing from JobsHandler.gs');

if (/function\s+previewJobRestore\s*\(/.test(jobsHandler))
  ok('previewJobRestore-defined', 'previewJobRestore function present in JobsHandler.gs');
else
  ko('previewJobRestore-defined', 'previewJobRestore function missing from JobsHandler.gs');

if (/function\s+restoreJob\s*\(/.test(jobsHandler))
  ok('restoreJob-defined', 'restoreJob function present in JobsHandler.gs');
else
  ko('restoreJob-defined', 'restoreJob function missing from JobsHandler.gs');

if (/confirmText\s*!==\s*['"]RESTORE_JOB['"]/.test(jobsHandler))
  ok('restore-confirm-gate', 'restoreJob requires RESTORE_JOB confirmation');
else
  ko('restore-confirm-gate', 'restoreJob missing RESTORE_JOB confirmation check');

if (/already exists in DBJOBS/.test(jobsHandler) || /duplicate_exists/.test(jobsHandler))
  ok('duplicate-detection', 'restoreJob detects duplicate JobID in live DBJOBS');
else
  ko('duplicate-detection', 'restoreJob missing duplicate JobID detection');

if (/admin.*owner|owner.*admin/.test(jobsHandler))
  ok('admin-owner-gate', 'restoreJob/listJobArchive gates on admin/owner role');
else
  ko('admin-owner-gate', 'admin/owner role check missing from archive restore');

if (/writeAuditLog\s*\(\s*['"]RESTORE_JOB['"]/.test(jobsHandler))
  ok('restore-audit-log', 'restoreJob writes audit log with RESTORE_JOB action');
else
  ko('restore-audit-log', 'restoreJob missing writeAuditLog call');

if (/LockService\.getScriptLock\(\)/.test(jobsHandler.slice(jobsHandler.indexOf('function restoreJob'))))
  ok('restore-lock', 'restoreJob uses LockService to prevent concurrent restores');
else
  ko('restore-lock', 'restoreJob missing LockService guard');

// ── RouterSplit registration ─────────────────────────────────

const router = read('RouterSplit.gs');

if (/'listJobArchive'\s*:/.test(router))
  ok('router-listJobArchive', 'listJobArchive registered in RouterSplit');
else
  ko('router-listJobArchive', 'listJobArchive not registered in RouterSplit');

if (/'previewJobRestore'\s*:/.test(router))
  ok('router-previewJobRestore', 'previewJobRestore registered in RouterSplit');
else
  ko('router-previewJobRestore', 'previewJobRestore not registered in RouterSplit');

if (/'restoreJob'\s*:/.test(router))
  ok('router-restoreJob', 'restoreJob registered in RouterSplit');
else
  ko('router-restoreJob', 'restoreJob not registered in RouterSplit');

// ── clasp-ready alignment ────────────────────────────────────

const claspJobs = read('clasp-ready/JobsHandler.gs');
const claspRouter = read('clasp-ready/RouterSplit.gs');

if (/function\s+restoreJob\s*\(/.test(claspJobs))
  ok('clasp-ready-jobs', 'clasp-ready/JobsHandler.gs contains restoreJob');
else
  ko('clasp-ready-jobs', 'clasp-ready/JobsHandler.gs out of sync — missing restoreJob');

if (/'restoreJob'\s*:/.test(claspRouter))
  ok('clasp-ready-router', 'clasp-ready/RouterSplit.gs contains restoreJob route');
else
  ko('clasp-ready-router', 'clasp-ready/RouterSplit.gs out of sync — missing restoreJob');

// ── schema registry ──────────────────────────────────────────

const schema = read('docs/database_schema_registry.json');
if (schema.includes('DBJOBS_ARCHIVE'))
  ok('schema-dbjobs-archive', 'DBJOBS_ARCHIVE registered in database schema registry');
else
  ko('schema-dbjobs-archive', 'DBJOBS_ARCHIVE missing from docs/database_schema_registry.json');

// ── api_contract.js ──────────────────────────────────────────

const contract = read('pwa/api_contract.js');

if (contract.includes("action: 'listJobArchive'"))
  ok('contract-listJobArchive', 'listJobArchive in api_contract.js');
else
  ko('contract-listJobArchive', 'listJobArchive missing from api_contract.js');

if (contract.includes("action: 'previewJobRestore'"))
  ok('contract-previewJobRestore', 'previewJobRestore in api_contract.js');
else
  ko('contract-previewJobRestore', 'previewJobRestore missing from api_contract.js');

if (contract.includes("action: 'restoreJob'"))
  ok('contract-restoreJob', 'restoreJob in api_contract.js');
else
  ko('contract-restoreJob', 'restoreJob missing from api_contract.js');

// ── admin_panel.js ───────────────────────────────────────────

const adminPanel = read('pwa/admin_panel.js');

if (adminPanel.includes("data-tab=\"archive\""))
  ok('admin-archive-tab', 'Archive tab present in admin panel tab bar');
else
  ko('admin-archive-tab', 'Archive tab missing from admin_panel.js tab bar');

if (/renderJobArchivePanel_\s*\(/.test(adminPanel))
  ok('admin-archive-renderer', 'renderJobArchivePanel_ function present in admin_panel.js');
else
  ko('admin-archive-renderer', 'renderJobArchivePanel_ function missing from admin_panel.js');

if (/showJobRestorePreview_\s*\(/.test(adminPanel))
  ok('admin-preview-function', 'showJobRestorePreview_ function present in admin_panel.js');
else
  ko('admin-preview-function', 'showJobRestorePreview_ function missing from admin_panel.js');

if (/executeJobRestore_\s*\(/.test(adminPanel))
  ok('admin-execute-function', 'executeJobRestore_ function present in admin_panel.js');
else
  ko('admin-execute-function', 'executeJobRestore_ function missing from admin_panel.js');

if (adminPanel.includes('RESTORE_JOB'))
  ok('admin-confirm-phrase', 'RESTORE_JOB confirmation phrase present in admin UI');
else
  ko('admin-confirm-phrase', 'RESTORE_JOB confirmation phrase missing from admin_panel.js');

if (/duplicate_exists|duplicate exists|ยังมีอยู่ใน DBJOBS/.test(adminPanel))
  ok('admin-duplicate-warning', 'Admin UI shows duplicate warning when restore is blocked');
else
  ko('admin-duplicate-warning', 'Admin UI missing duplicate-blocked warning message');

// ── Report ───────────────────────────────────────────────────

const report = {
  guard: 'Sprint 194 Job Archive Restore',
  timestamp: new Date().toISOString(),
  score: pass + '/' + (pass + fail),
  pass,
  fail,
  status: fail === 0 ? 'ok' : 'fail',
  checks
};

const reportDir = path.join(ROOT, 'test_reports');
if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(
  path.join(reportDir, 'sprint194_job_archive_restore_guard_latest.json'),
  JSON.stringify(report, null, 2)
);

checks.forEach(c => {
  console.log((c.status === 'OK' ? 'OK  ' : 'FAIL') + '  ' + c.name + (c.detail ? ' - ' + c.detail : ''));
});

console.log('[Sprint 194] ' + (fail === 0 ? 'OK' : 'FAIL') + ' ' + pass + '/' + (pass + fail) + ' - Job Archive Restore guard ' + (fail === 0 ? 'passed' : 'failed'));
console.log('[Sprint 194] report: test_reports/sprint194_job_archive_restore_guard_latest.json');

if (fail > 0) process.exit(1);
