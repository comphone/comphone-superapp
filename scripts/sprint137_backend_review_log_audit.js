#!/usr/bin/env node
/*
 * Sprint 137 Backend Review Log Audit
 *
 * Guards the durable owner-review log for Data Completeness findings. This log
 * stores review notes/status and audit entries only; it must not execute repair.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REPORT_DIR = path.join(ROOT, 'test_reports');
const REPORT_JSON = path.join(REPORT_DIR, 'sprint137_backend_review_log_latest.json');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function has(text, pattern) {
  return pattern instanceof RegExp ? pattern.test(text) : text.includes(pattern);
}

const files = {
  rootRepair: read('DataRepairConsole.gs'),
  claspRepair: read('clasp-ready/DataRepairConsole.gs'),
  rootRouter: read('RouterSplit.gs'),
  claspRouter: read('clasp-ready/RouterSplit.gs'),
  rootRouterMain: read('Router.gs'),
  claspRouterMain: read('clasp-ready/Router.gs'),
  schema: read('docs/database_schema_registry.json'),
  settings: read('pwa/section_settings.js'),
  admin: read('pwa/admin_panel.js'),
  app: read('pwa/app.js'),
  apiContract: read('pwa/api_contract.js'),
  staticGuard: read('scripts/pwa_static_guard.js'),
  regression: read('scripts/regression-guard.sh'),
  workflow: read('.github/workflows/auto-deploy.yml'),
  blueprint: read('BLUEPRINT.md'),
};

const checks = [];
function check(id, ok, detail, severity = 'P0') {
  checks.push({ id, ok: !!ok, severity, detail });
}

check('backend-functions-present',
  ['DATA_REVIEW_LOG_SHEET', 'getDataReviewLog', 'saveDataReviewLog', 'ensureDataReviewLog_', 'logDataReviewAudit_']
    .every(token => has(files.rootRepair, token) && has(files.claspRepair, token)),
  'Root and clasp-ready DataRepairConsole must expose durable review log helpers.');

check('schema-registered',
  has(files.schema, '"DB_DATA_REVIEW_LOG"') && has(files.schema, '"domain": "maintenance"'),
  'DB_DATA_REVIEW_LOG must be registered before any code can create it.');

check('router-wired',
  ['getDataReviewLog', 'saveDataReviewLog'].every(action =>
    has(files.rootRouter, `'${action}'`) &&
    has(files.claspRouter, `'${action}'`) &&
    has(files.rootRouterMain, `'${action}'`) &&
    has(files.claspRouterMain, `'${action}'`)),
  'RouterSplit and Router dynamic whitelist must expose review log actions.');

check('pwa-contract-wired',
  has(files.app, 'getDataReviewLog: true') &&
    has(files.apiContract, "action: 'getDataReviewLog'") &&
    has(files.apiContract, "action: 'saveDataReviewLog'"),
  'PWA read action map and API contract must know the review log actions.');

check('pc-mobile-use-backend-with-fallback',
  has(files.settings, 'getDataReviewLog') &&
    has(files.settings, 'saveDataReviewLog') &&
    has(files.settings, 'comphone_data_completeness_reviews') &&
    has(files.admin, 'getDataReviewLog') &&
    has(files.admin, 'saveDataReviewLog') &&
    has(files.admin, 'comphone_data_completeness_reviews'),
  'PC and Mobile panels must sync backend review state while keeping localStorage fallback.');

check('review-log-not-repair',
  !/saveDataReviewLog[\s\S]{0,2200}executeDataRepair/.test(files.rootRepair) &&
    !/saveDataReviewLog[\s\S]{0,2200}deleteRow/.test(files.rootRepair) &&
    !/saveDataReviewLog[\s\S]{0,2200}archiveDeleteBillingCandidate_/.test(files.rootRepair),
  'Saving review status must not execute data repair or delete production rows.');

check('ci-wiring',
  has(files.staticGuard, 'sprint137_backend_review_log_audit.js') &&
    has(files.regression, 'sprint137_backend_review_log_audit.js') &&
    has(files.workflow, 'sprint137_backend_review_log_audit.js'),
  'Sprint 137 audit must be wired into static guard, regression guard, and GitHub Actions.',
  'P1');

check('blueprint-current',
  has(files.blueprint, 'Phase 137') &&
    has(files.blueprint, 'Backend Review Log'),
  'BLUEPRINT must document Sprint 137 before handoff.',
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

console.log(`[Sprint 137 Backend Review Log] status=${report.status} score=${report.score}/100 checks=${checks.filter(row => row.ok).length}/${checks.length}`);
console.log(`[Sprint 137 Backend Review Log] report: ${path.relative(ROOT, REPORT_JSON).replace(/\\/g, '/')}`);
checks.filter(row => !row.ok).forEach(row => console.log(`- [${row.severity}] ${row.id}: ${row.detail}`));

if (failures.length) process.exit(1);
