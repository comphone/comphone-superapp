#!/usr/bin/env node
/*
 * Sprint 136 Data Review Workflow Audit
 *
 * Static guard for the owner review workflow layered on top of the Data
 * Completeness panels: export review summary, note findings, mark reviewed,
 * and deep-link to the relevant menu without executing any data repair.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REPORT_DIR = path.join(ROOT, 'test_reports');
const REPORT_JSON = path.join(REPORT_DIR, 'sprint136_data_review_workflow_latest.json');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function has(text, pattern) {
  return pattern instanceof RegExp ? pattern.test(text) : text.includes(pattern);
}

const files = {
  settings: read('pwa/section_settings.js'),
  admin: read('pwa/admin_panel.js'),
  sprint135: read('scripts/sprint135_data_completeness_panel_audit.js'),
  staticGuard: read('scripts/pwa_static_guard.js'),
  regression: read('scripts/regression-guard.sh'),
  workflow: read('.github/workflows/auto-deploy.yml'),
  blueprint: read('BLUEPRINT.md'),
};

const checks = [];
function check(id, ok, detail, severity = 'P0') {
  checks.push({ id, ok: !!ok, severity, detail });
}

check('pc-export-review',
  has(files.settings, 'exportSettingsDataCompletenessReview') &&
    has(files.settings, 'comphone-data-completeness-review-') &&
    has(files.settings, 'review_state'),
  'PC Settings must export the current data completeness review and local owner review state.');

check('mobile-export-review',
  has(files.admin, 'exportAdminDataCompletenessReview_') &&
    has(files.admin, 'comphone-data-completeness-review-') &&
    has(files.admin, 'review_state'),
  'Mobile Admin must export the current data completeness review and local owner review state.');

check('owner-notes-and-reviewed-state',
  ['comphone_data_completeness_reviews', 'Mark Reviewed', 'Owner review note', 'reviewed_at']
    .every(token => has(files.settings, token) && has(files.admin, token)),
  'Both panels must support local review notes and mark-reviewed state.');

check('deep-links-to-source-menus',
  has(files.settings, 'settings-data-open') &&
    has(files.settings, 'loadSection(target)') &&
    has(files.admin, 'admin-data-open') &&
    has(files.admin, "goPage(target") &&
    ['billing', 'reports', 'warranty'].every(token => has(files.settings, token) && has(files.admin, token)),
  'Findings must deep-link operators to Billing, Reports, or Warranty review surfaces.');

check('no-repair-in-review-workflow',
  !/exportSettingsDataCompletenessReview[\s\S]{0,2500}executeDataRepair/.test(files.settings) &&
    !/markSettingsDataFindingReviewed[\s\S]{0,2500}executeDataRepair/.test(files.settings) &&
    !/exportAdminDataCompletenessReview_[\s\S]{0,2500}executeDataRepair/.test(files.admin) &&
    !/markAdminDataFindingReviewed_[\s\S]{0,2500}executeDataRepair/.test(files.admin),
  'Export/mark-reviewed/note workflow must not execute repair actions.');

check('sprint135-base-preserved',
  has(files.sprint135, 'Sprint 135 Data Completeness Panel Audit') &&
    has(files.sprint135, 'read-only'),
  'Sprint 136 must keep Sprint 135 read-only Data Completeness panel base intact.',
  'P1');

check('ci-wiring',
  has(files.staticGuard, 'sprint136_data_review_workflow_audit.js') &&
    has(files.regression, 'sprint136_data_review_workflow_audit.js') &&
    has(files.workflow, 'sprint136_data_review_workflow_audit.js'),
  'Sprint 136 audit must be wired into static guard, regression guard, and GitHub Actions.',
  'P1');

check('blueprint-current',
  has(files.blueprint, 'Phase 136') &&
    has(files.blueprint, 'Data Review Workflow'),
  'BLUEPRINT must document Sprint 136 before handoff.',
  'P1');

const failures = checks.filter(row => !row.ok && row.severity === 'P0');
const report = {
  generated_at: new Date().toISOString(),
  status: failures.length ? 'fail' : checks.some(row => !row.ok) ? 'warning' : 'ok',
  score: Math.round((checks.filter(row => row.ok).length / checks.length) * 100),
  checks,
};

fs.mkdirSync(REPORT_DIR, { recursive: true });
fs.writeFileSync(REPORT_JSON, JSON.stringify(report, null, 2) + '\n', 'utf8');

console.log(`[Sprint 136 Data Review Workflow] status=${report.status} score=${report.score}/100 checks=${checks.filter(row => row.ok).length}/${checks.length}`);
console.log(`[Sprint 136 Data Review Workflow] report: ${path.relative(ROOT, REPORT_JSON).replace(/\\/g, '/')}`);
checks.filter(row => !row.ok).forEach(row => console.log(`- [${row.severity}] ${row.id}: ${row.detail}`));

if (failures.length) process.exit(1);
