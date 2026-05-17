#!/usr/bin/env node
/*
 * Sprint 107 Controlled Data Cleanup / Backfill Plan
 *
 * Read-only planning layer for production data warnings found by Sprint 106.
 * It never mutates production data. Execution is intentionally blocked unless
 * a future backend action with archive-before-change semantics is added.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REPORT_DIR = path.join(ROOT, 'test_reports');
const REPORT_JSON = path.join(REPORT_DIR, 'sprint107_controlled_data_cleanup_plan_latest.json');
const REPORT_MD = path.join(REPORT_DIR, 'sprint107_controlled_data_cleanup_plan_latest.md');
const SPRINT106_REPORT = path.join(REPORT_DIR, 'sprint106_production_data_quality_latest.json');
const EXECUTE = process.env.COMPHONE_DATA_CLEANUP === '1';
const CONFIRM = process.env.COMPHONE_DATA_CLEANUP_CONFIRM || '';
const REQUIRED_CONFIRM = 'REVIEWED_PRODUCTION_DATA_CLEANUP_PLAN';

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function has(text, pattern) {
  return pattern instanceof RegExp ? pattern.test(text) : text.includes(pattern);
}

function loadSprint106Report() {
  if (!fs.existsSync(SPRINT106_REPORT)) return null;
  try {
    return JSON.parse(fs.readFileSync(SPRINT106_REPORT, 'utf8'));
  } catch (err) {
    return { parse_error: err.message };
  }
}

function staticChecks() {
  const checks = [];
  const sprint106 = read('scripts/sprint106_production_data_quality_guard.js');
  const workflow = read('.github/workflows/auto-deploy.yml');
  const regression = read('scripts/regression-guard.sh');
  const staticGuard = read('scripts/pwa_static_guard.js');
  const smokeCleanup = read('scripts/pwa_smoke_cleanup_plan.js');
  const smokeCleanupGs = read('clasp-ready/SmokeCleanup.gs');

  function check(area, name, ok, detail, severity = 'P0') {
    checks.push({ area, name, ok: !!ok, severity, detail });
  }

  check('source_report', 'sprint106-safe-metadata',
    has(sprint106, 'incomplete_rows') &&
      has(sprint106, 'billing_id_present') &&
      has(sprint106, 'job_id_present') &&
      has(sprint106, 'status_present'),
    'Sprint 106 must expose safe field-presence metadata for cleanup planning.');

  check('safety_gate', 'smoke-cleanup-marker-only',
    has(smokeCleanup, 'COMPHONE_SMOKE_CLEANUP_CONFIRM') &&
      has(smokeCleanupGs, 'smokeCleanupRowHasMarker_') &&
      has(smokeCleanupGs, 'archiveSmokeCleanupRow_'),
    'Existing smoke cleanup path must remain marker-gated and archive-before-delete.');

  check('ci_contract', 'sprint107-wired',
    has(workflow, 'sprint107_controlled_data_cleanup_plan.js') &&
      has(regression, 'sprint107_controlled_data_cleanup_plan.js') &&
      has(staticGuard, 'sprint107_controlled_data_cleanup_plan.js'),
    'Sprint 107 cleanup/backfill planner must be wired into Actions, regression guard, and static guard.',
    'P1');

  return checks;
}

function actionForBillingWarning(summary) {
  const rows = summary.incomplete_rows || [];
  return rows.map(row => {
    const missing = [];
    if (!row.billing_id_present) missing.push('Billing_ID');
    if (!row.job_id_present) missing.push('Job_ID');
    if (!row.amount_present) missing.push('Total_Amount');
    if (!row.status_present) missing.push('Payment_Status');
    return {
      scope: 'billing',
      source: 'DB_BILLING',
      row_number: row.row_number,
      severity: row.job_id_present ? 'review-backfill' : 'review-or-archive',
      missing_fields: missing,
      safe_automation: false,
      recommended_action: row.job_id_present
        ? 'Manual review: if Billing_ID/status are blank but Job_ID is valid, backfill from the job/billing snapshot after archive.'
        : 'Manual review: row has no usable Job_ID, so do not backfill automatically; archive/delete only after business owner confirms it is an orphan row.',
    };
  });
}

function actionForReportWarning(summary) {
  if (!summary.empty_period) return [];
  return [{
    scope: 'reports',
    source: 'getReportData(period=month)',
    severity: 'business-review',
    missing_fields: ['dailyRevenue records'],
    safe_automation: false,
    recommended_action: 'Confirm whether the current month should have revenue records. If sales occurred, trace DB_BILLING dates/status/amount fields before editing reports code.',
  }];
}

function buildPlan(sprint106) {
  const actions = [];
  const notes = [];

  if (!sprint106) {
    notes.push('Sprint 106 report is missing. Run scripts/sprint106_production_data_quality_guard.js with COMPHONE_AUTH_TOKEN for live data-quality evidence.');
    return { actions, notes, sourceStatus: 'missing' };
  }
  if (sprint106.parse_error) {
    notes.push(`Sprint 106 report could not be parsed: ${sprint106.parse_error}`);
    return { actions, notes, sourceStatus: 'parse-error' };
  }

  for (const row of sprint106.live_results || []) {
    if (row.area === 'billing' && row.status_label === 'WARN') {
      actions.push(...actionForBillingWarning(row.summary || {}));
    }
    if (row.area === 'reports' && row.status_label === 'WARN') {
      actions.push(...actionForReportWarning(row.summary || {}));
    }
  }

  if (!actions.length) {
    notes.push('No cleanup/backfill actions are needed from the latest Sprint 106 report.');
  }

  return { actions, notes, sourceStatus: sprint106.status || 'unknown' };
}

function writeReports(report) {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(REPORT_JSON, JSON.stringify(report, null, 2) + '\n', 'utf8');
  fs.writeFileSync(REPORT_MD, [
    '# Sprint 107 Controlled Data Cleanup / Backfill Plan',
    '',
    `- Generated: ${report.generated_at}`,
    `- Status: ${report.status}`,
    `- Mode: ${report.mode}`,
    `- Score: ${report.score}/100`,
    `- Actions: ${report.actions.length}`,
    `- Executed: ${report.executed ? 'yes' : 'no'}`,
    '',
    '## Actions',
    '',
    '| Scope | Source | Row | Severity | Safe Automation | Recommended Action |',
    '|---|---|---:|---|---|---|',
    ...report.actions.map(row => `| ${row.scope} | ${row.source} | ${row.row_number || '-'} | ${row.severity} | ${row.safe_automation ? 'yes' : 'no'} | ${row.recommended_action} |`),
    '',
    '## Notes',
    '',
    ...(report.notes.length ? report.notes.map(note => `- ${note}`) : ['- None']),
    '',
  ].join('\n'), 'utf8');
}

function main() {
  const staticResults = staticChecks();
  const sprint106 = loadSprint106Report();
  const plan = buildPlan(sprint106);
  const report = {
    generated_at: new Date().toISOString(),
    version: 'sprint107-controlled-data-cleanup-plan-1.0.0',
    mode: EXECUTE ? 'execute-requested' : 'plan-only',
    executed: false,
    required_confirm: REQUIRED_CONFIRM,
    status: 'pending',
    score: 0,
    source_status: plan.sourceStatus,
    summary: {
      static_total: staticResults.length,
      static_pass: staticResults.filter(row => row.ok).length,
      static_fail: staticResults.filter(row => !row.ok).length,
      actions: plan.actions.length,
    },
    static_checks: staticResults,
    actions: plan.actions,
    notes: plan.notes.slice(),
  };

  const staticP0Failures = staticResults.filter(row => !row.ok && row.severity === 'P0');
  if (EXECUTE) {
    report.status = 'blocked';
    report.notes.push(`Execution is blocked in Sprint 107. Set ${REQUIRED_CONFIRM} only after a future archive-before-change backend action exists; current script remains read-only.`);
    if (CONFIRM && CONFIRM !== REQUIRED_CONFIRM) {
      report.notes.push(`Received invalid confirmation value; expected ${REQUIRED_CONFIRM}.`);
    }
  } else if (staticP0Failures.length) {
    report.status = 'fail';
  } else if (report.actions.length || report.summary.static_fail) {
    report.status = 'warning';
  } else {
    report.status = 'ok';
  }

  const total = report.summary.static_total + Math.max(1, report.actions.length);
  const passed = report.summary.static_pass + report.actions.length;
  report.score = total ? Math.round((passed / total) * 100) : 0;

  writeReports(report);
  console.log(`[Sprint 107 Controlled Data Cleanup Plan] status=${report.status} mode=${report.mode} actions=${report.actions.length}`);
  console.log(`[Sprint 107 Controlled Data Cleanup Plan] report: ${path.relative(ROOT, REPORT_JSON).replace(/\\/g, '/')}`);
  if (report.status === 'fail' || report.status === 'blocked') process.exit(EXECUTE ? 1 : 0);
}

main();
