#!/usr/bin/env node
/*
 * Sprint 135 Data Completeness Panel Audit
 *
 * Static guard for the owner-facing data completeness panels in PC Settings
 * and Mobile Admin. The panels must be read-only, separate system health from
 * business-data warnings, and keep destructive repair behind the existing
 * archive/owner-confirmation console.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REPORT_DIR = path.join(ROOT, 'test_reports');
const REPORT_JSON = path.join(REPORT_DIR, 'sprint135_data_completeness_panel_latest.json');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function has(text, pattern) {
  return pattern instanceof RegExp ? pattern.test(text) : text.includes(pattern);
}

const files = {
  settings: read('pwa/section_settings.js'),
  admin: read('pwa/admin_panel.js'),
  sprint134: read('scripts/sprint134_data_completeness_review.js'),
  staticGuard: read('scripts/pwa_static_guard.js'),
  regression: read('scripts/regression-guard.sh'),
  workflow: read('.github/workflows/auto-deploy.yml'),
  blueprint: read('BLUEPRINT.md'),
};

const checks = [];
function check(id, ok, detail, severity = 'P0') {
  checks.push({ id, ok: !!ok, severity, detail });
}

check('pc-settings-panel-present',
  has(files.settings, 'settings-data-completeness-content') &&
    has(files.settings, 'hydrateSettingsDataCompletenessPanel') &&
    has(files.settings, 'Data Completeness') &&
    has(files.settings, 'business-data review'),
  'PC Settings must show an owner-facing Data Completeness panel.');

check('mobile-admin-panel-present',
  has(files.admin, 'admin-data-completeness') &&
    has(files.admin, 'hydrateAdminDataCompleteness_') &&
    has(files.admin, 'Data Completeness') &&
    has(files.admin, 'Business-data warnings do not mean the system is down'),
  'Mobile Admin Repair tab must show the Data Completeness panel.');

check('read-only-api-scope',
  ['checkJobs', 'listBillings', 'getBilling', 'getReportData', 'listWarranties', 'previewDataRepair']
    .every(action => has(files.settings, action) && has(files.admin, action)) &&
    !/hydrateSettingsDataCompletenessPanel[\s\S]{0,5000}executeDataRepair/.test(files.settings) &&
    !/hydrateAdminDataCompleteness_[\s\S]{0,5000}executeDataRepair/.test(files.admin),
  'Data Completeness panels must use read APIs and refresh explicitly.');

check('repair-stays-separated',
  has(files.settings, 'executeSettingsDataRepair_') &&
    has(files.admin, 'executeAdminDataRepair_') &&
    has(files.settings, 'EXECUTE_REVIEWED_DATA_REPAIR') &&
    has(files.admin, 'EXECUTE_REVIEWED_DATA_REPAIR'),
  'Destructive data repair must remain behind the existing explicit owner confirmation flow.');

check('sprint134-source-aligned',
  has(files.sprint134, 'Sprint 134 Data Completeness Review') &&
    has(files.sprint134, 'Billing detail linkage') &&
    has(files.sprint134, 'Warranty detail linkage') &&
    has(files.sprint134, 'current-month report revenue rows'),
  'Panel logic must stay aligned with Sprint 134 review boundaries.');

check('ci-wiring',
  has(files.staticGuard, 'sprint135_data_completeness_panel_audit.js') &&
    has(files.regression, 'sprint135_data_completeness_panel_audit.js') &&
    has(files.workflow, 'sprint135_data_completeness_panel_audit.js'),
  'Sprint 135 audit must be wired into static guard, regression guard, and GitHub Actions.',
  'P1');

check('blueprint-current',
  has(files.blueprint, 'Phase 135') &&
    has(files.blueprint, 'Data Completeness Panel'),
  'BLUEPRINT must document Sprint 135 before handoff.',
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

console.log(`[Sprint 135 Data Completeness Panel] status=${report.status} score=${report.score}/100 checks=${checks.filter(row => row.ok).length}/${checks.length}`);
console.log(`[Sprint 135 Data Completeness Panel] report: ${path.relative(ROOT, REPORT_JSON).replace(/\\/g, '/')}`);
checks.filter(row => !row.ok).forEach(row => console.log(`- [${row.severity}] ${row.id}: ${row.detail}`));

if (failures.length) process.exit(1);
