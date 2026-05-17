#!/usr/bin/env node
/*
 * Sprint 101 Write Lifecycle Audit
 *
 * Guards the controlled service-to-cash write path:
 * open smoke customer/job -> note/status -> billing -> read-back -> cleanup.
 *
 * CI/static mode is skip-safe. When local write/cleanup reports exist, this
 * script verifies the most recent evidence.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REPORT_DIR = path.join(ROOT, 'test_reports');
const REPORT_JSON = path.join(REPORT_DIR, 'sprint101_write_lifecycle_latest.json');
const REPORT_MD = path.join(REPORT_DIR, 'sprint101_write_lifecycle_latest.md');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function readJsonIfExists(rel) {
  const full = path.join(ROOT, rel);
  if (!fs.existsSync(full)) return null;
  return JSON.parse(fs.readFileSync(full, 'utf8'));
}

function has(text, pattern) {
  return pattern instanceof RegExp ? pattern.test(text) : text.includes(pattern);
}

function main() {
  const files = {
    writeSmoke: read('scripts/pwa_write_smoke.js'),
    cleanupPlan: read('scripts/pwa_smoke_cleanup_plan.js'),
    billingCore: read('BillingCore.gs'),
    billingCoreReady: read('clasp-ready/BillingCore.gs'),
    smokeCleanup: read('clasp-ready/SmokeCleanup.gs'),
  };
  const writeReport = readJsonIfExists('test_reports/pwa_write_smoke_latest.json');
  const cleanupReport = readJsonIfExists('test_reports/pwa_smoke_cleanup_plan_latest.json');

  const checks = [];
  const issues = [];

  function check(area, name, ok, detail, severity = 'P1') {
    const item = { area, name, ok: !!ok, severity, detail };
    checks.push(item);
    if (!item.ok) issues.push(item);
  }

  check('write_smoke', 'explicit-write-gate',
    has(files.writeSmoke, 'COMPHONE_WRITE_SMOKE_CONFIRM') &&
      has(files.writeSmoke, 'CREATE_TEST_RECORDS') &&
      has(files.writeSmoke, 'COMPHONE_WRITE_SMOKE') &&
      has(files.writeSmoke, 'token_present'),
    'Write smoke must require token and explicit CREATE_TEST_RECORDS confirmation.',
    'P0');

  check('write_smoke', 'service-to-cash-flow',
    ['createCustomer', 'openJob', 'addQuickNote', 'transitionJob', 'getJobTimeline', 'createBilling', 'getBilling', 'listBillings'].every(action => has(files.writeSmoke, `'${action}'`)),
    'Write smoke must cover customer, job, note/status, timeline, billing, and billing list read-back.',
    'P0');

  check('write_smoke', 'idempotent-replay-verification',
    has(files.writeSmoke, 'idempotent_replay') &&
      has(files.writeSmoke, 'client_request_id') &&
      has(files.writeSmoke, 'createWriteRequestId') === false,
    'Node write smoke must generate durable client_request_id values and verify idempotent replay without depending on browser globals.',
    'P1');

  check('billing_cleanup', 'billing-smoke-marker-persisted',
    has(files.billingCore, 'options.notes') &&
      has(files.billingCoreReady, 'options.notes') &&
      has(files.billingCore, 'Billing synced from job state') &&
      has(files.billingCoreReady, 'Billing synced from job state'),
    'Billing rows must persist smoke notes/markers so cleanup can safely identify test billings.',
    'P0');

  check('cleanup', 'latest-write-report-candidates',
    has(files.cleanupPlan, 'pwa_write_smoke_latest.json') &&
      has(files.cleanupPlan, 'loadLatestWriteSmokeCandidates') &&
      has(files.cleanupPlan, 'latest-write-smoke-report') &&
      has(files.cleanupPlan, 'pushUniqueCandidate'),
    'Cleanup planner must merge IDs from the latest write-smoke report, not only broad list scans.',
    'P0');

  check('cleanup', 'backend-archive-before-delete',
    has(files.smokeCleanup, 'archiveSmokeCleanupRow_') &&
      has(files.smokeCleanup, 'SMOKE_CLEANUP_CONFIRM') &&
      has(files.smokeCleanup, 'marker_ok') &&
      has(files.smokeCleanup, 'sheet.deleteRow'),
    'Backend cleanup must archive rows and delete only marker-verified reviewed smoke records.',
    'P0');

  if (writeReport && writeReport.mode === 'write') {
    const failedWrites = (writeReport.results || []).filter(row => row.ok === false);
    const requiredActions = ['createCustomer', 'openJob', 'addQuickNote', 'transitionJob', 'getJobTimeline', 'createBilling', 'getBilling', 'listBillings'];
    check('evidence', 'latest-write-smoke-passed',
      failedWrites.length === 0 &&
        requiredActions.every(action => (writeReport.results || []).some(row => row.action === action && row.ok === true)),
      'Latest local write-smoke evidence should pass the full service-to-cash lifecycle.',
      'P0');
  } else {
    check('evidence', 'latest-write-smoke-available',
      true,
      'No committed write evidence required in CI; run pwa_write_smoke.js with explicit gates for protected local validation.',
      'P3');
  }

  if (cleanupReport && cleanupReport.mode === 'execute-requested') {
    check('evidence', 'latest-cleanup-executed',
      cleanupReport.executed === true &&
        ['deleted-reviewed-smoke-records', 'nothing-deleted'].includes(cleanupReport.status),
      'Latest cleanup evidence should execute with reviewed smoke records and finish in a safe terminal state.',
      'P0');
  } else {
    check('evidence', 'latest-cleanup-available',
      true,
      'No committed cleanup evidence required in CI; run pwa_smoke_cleanup_plan.js with explicit cleanup gates after write smoke.',
      'P3');
  }

  const p0 = issues.filter(item => item.severity === 'P0').length;
  const score = Math.round((checks.filter(item => item.ok).length / checks.length) * 100);
  const status = p0 ? 'fail' : issues.length ? 'warn' : 'ok';
  const report = {
    generatedAt: new Date().toISOString(),
    sprint: 101,
    focus: 'controlled Jobs/Billing write lifecycle and cleanup',
    status,
    score,
    checksTotal: checks.length,
    checksPassed: checks.filter(item => item.ok).length,
    evidence: {
      writeSmokeMode: writeReport && writeReport.mode,
      writeSmokeId: writeReport && writeReport.smoke_id,
      cleanupStatus: cleanupReport && cleanupReport.status,
      cleanupCandidates: cleanupReport && cleanupReport.candidates && cleanupReport.candidates.length,
      cleanupExecuted: cleanupReport && cleanupReport.executed,
    },
    issues,
    checks,
  };

  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(REPORT_JSON, JSON.stringify(report, null, 2) + '\n', 'utf8');
  fs.writeFileSync(REPORT_MD, [
    '# Sprint 101 Write Lifecycle Audit',
    '',
    `- Status: ${status}`,
    `- Score: ${score}/100`,
    `- Checks: ${report.checksPassed}/${checks.length}`,
    `- Write smoke: ${report.evidence.writeSmokeMode || 'not-present'} ${report.evidence.writeSmokeId || ''}`,
    `- Cleanup: ${report.evidence.cleanupStatus || 'not-present'} (${report.evidence.cleanupCandidates || 0} candidates)`,
    '',
    '| Area | Check | Result | Detail |',
    '|---|---|---|---|',
    ...checks.map(item => `| ${item.area} | ${item.name} | ${item.ok ? 'OK' : item.severity} | ${item.detail} |`),
    '',
  ].join('\n'), 'utf8');

  console.log(`[Sprint 101 Write Lifecycle Audit] status=${status} score=${score}/100 checks=${report.checksPassed}/${checks.length}`);
  for (const issue of issues) console.log(`- [${issue.severity}] ${issue.area}/${issue.name}: ${issue.detail}`);
  if (p0) process.exit(1);
}

main();
