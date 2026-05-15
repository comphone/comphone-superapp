#!/usr/bin/env node
/*
 * Sprint 82 mobile quick actions audit.
 *
 * Verifies the mobile dashboard quick actions and More sheet are not just
 * visible buttons, but complete operator entry paths for Jobs/CRM.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REPORT_DIR = path.join(ROOT, 'test_reports');
const JSON_REPORT = path.join(REPORT_DIR, 'sprint82_mobile_quick_actions_latest.json');
const MD_REPORT = path.join(REPORT_DIR, 'sprint82_mobile_quick_actions_latest.md');

function read(relPath) {
  const file = path.join(ROOT, relPath);
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
}

function rel(file) {
  return file.replace(/\\/g, '/');
}

function has(text, needle) {
  return typeof needle === 'string' ? text.includes(needle) : needle.test(text);
}

function check(id, label, ok, severity, details, files) {
  return { id, label, ok: !!ok, severity, details, files: files.map(rel) };
}

const files = {
  mobileHtml: 'pwa/index.html',
  app: 'pwa/app.js',
  appHome: 'pwa/app_home.js',
  appActions: 'pwa/app_actions.js',
  apiContract: 'pwa/api_contract.js',
  autoDeploy: '.github/workflows/auto-deploy.yml',
  regressionGuard: 'scripts/regression-guard.sh',
};

const text = Object.fromEntries(Object.entries(files).map(([key, file]) => [key, read(file)]));
const defaultQuickActions = ['openNewJob', 'addCustomer', 'jobs', 'crm'];
const catalogActions = ['openNewJob', 'addCustomer', 'jobs', 'crm', 'billing', 'inventory', 'po', 'reports'];
const requiredEntryFields = [
  'nj-customer', 'nj-phone', 'nj-symptom', 'nj-device', 'nj-submit-btn',
  'new-cust-name', 'new-cust-phone', 'new-cust-type', 'new-cust-address',
];

const checks = [
  check(
    'dashboard-quick-actions-surface',
    'Mobile home renders dashboard quick action buttons through the central dispatcher.',
    has(text.mobileHtml, 'id="quick-actions-grid"') &&
      has(text.appHome, 'getQuickActions()') &&
      has(text.appHome, 'runQuickAction(') &&
      has(text.appHome, 'data-quick-action=') &&
      has(text.appHome, 'type="button"'),
    'P0',
    'The mobile dashboard must expose stable, tappable quick action buttons that route through runQuickAction().',
    [files.mobileHtml, files.appHome]
  ),
  check(
    'quick-action-catalog-complete',
    'Quick action catalog keeps the required operator shortcuts.',
    has(text.app, 'const QUICK_ACTION_CATALOG') &&
      defaultQuickActions.every(id => has(text.app, `'${id}'`)) &&
      catalogActions.every(id => has(text.app, id)),
    'P0',
    `Required catalog/default quick actions: ${defaultQuickActions.join(', ')}.`,
    [files.app]
  ),
  check(
    'quick-action-dispatch-contract',
    'Quick actions dispatch both local functions and navigable pages.',
    has(text.app, 'function runQuickAction') &&
      has(text.app, 'window[action.fn]') &&
      has(text.app, 'goPage(action.page') &&
      has(text.app, 'showQuickActionSettings') &&
      has(text.app, 'saveQuickActions') &&
      has(text.app, 'resetQuickActions') &&
      has(text.app, 'slice(0, 6)'),
    'P0',
    'The dispatcher must support openNewJob/addCustomer functions, page routes, and configurable max-6 dashboard shortcuts.',
    [files.app]
  ),
  check(
    'open-job-entry-workflow',
    'Open Job quick action has a real modal workflow and protected write contract.',
    has(text.appActions, 'function openNewJob') &&
      has(text.appActions, 'function submitNewJob') &&
      has(text.appActions, "ensureActionModal('modal-new-job'") &&
      ['nj-customer', 'nj-phone', 'nj-symptom', 'nj-device', 'nj-price', 'nj-note'].every(id => has(text.appActions, id)) &&
      has(text.appActions, "callAPI('openJob'") &&
      has(text.appActions, 'client_request_id') &&
      has(text.appActions, "dataset.submitting === '1'") &&
      has(text.appActions, "goPage('jobs'"),
    'P0',
    'Open Job must collect customer/problem details, create via unified callAPI(openJob), prevent double submits, and return to Jobs.',
    [files.appActions]
  ),
  check(
    'add-customer-entry-workflow',
    'Add Customer quick action has a real modal workflow and protected write contract.',
    has(text.appActions, 'function addCustomer') &&
      has(text.appActions, 'function saveNewCustomer') &&
      has(text.appActions, "ensureActionModal('modal-add-customer'") &&
      ['new-cust-name', 'new-cust-phone', 'new-cust-type', 'new-cust-address', 'new-cust-notes'].every(id => has(text.appActions, id)) &&
      has(text.appActions, "callAPI('createCustomer'") &&
      has(text.appActions, 'client_request_id') &&
      has(text.appActions, "dataset.submitting === '1'"),
    'P0',
    'Add Customer must collect customer data, create via unified callAPI(createCustomer), and prevent double submits.',
    [files.appActions]
  ),
  check(
    'more-sheet-not-blank',
    'Mobile More sheet is grouped, includes quick-action items, and old moreActions fallback opens the same sheet.',
    has(text.mobileHtml, 'id="more-menu-overlay"') &&
      has(text.mobileHtml, 'id="more-menu-content"') &&
      has(text.app, 'function renderMoreMenu') &&
      has(text.app, 'more-menu-group-label') &&
      has(text.app, 'data-quick-action') &&
      has(text.app, 'data-menu-page') &&
      has(text.app, 'navigateFromMore') &&
      has(text.appActions, 'function moreActions') &&
      has(text.appActions, 'showMoreMenu()'),
    'P0',
    'The More button must render real grouped navigation, and legacy callers must not open a missing Bootstrap modal.',
    [files.mobileHtml, files.app, files.appActions]
  ),
  check(
    'entry-fields-present',
    'Required Jobs/CRM entry field IDs remain stable for browser smoke tests and support tooling.',
    requiredEntryFields.every(id => has(text.appActions, id)),
    'P1',
    `Stable field IDs required: ${requiredEntryFields.join(', ')}.`,
    [files.appActions]
  ),
  check(
    'api-contract-covers-quick-actions',
    'API contract still covers the backend actions used by mobile quick entries.',
    has(text.apiContract, 'openJob') &&
      has(text.apiContract, 'createCustomer') &&
      has(text.apiContract, 'listCustomers') &&
      has(text.apiContract, 'checkJobs'),
    'P1',
    'Mobile quick actions depend on the shared API contract for smoke/audit coverage.',
    [files.apiContract]
  ),
  check(
    'ci-coverage',
    'Sprint 82 quick action audit is wired into CI and regression guard.',
    has(text.autoDeploy, 'sprint82_mobile_quick_actions_audit.js') &&
      has(text.regressionGuard, 'sprint82_mobile_quick_actions_audit.js'),
    'P1',
    'Future menu edits must run this audit in Auto Deploy and local regression guard.',
    [files.autoDeploy, files.regressionGuard]
  ),
];

const findings = checks.filter(item => !item.ok);
const penalty = findings.reduce((sum, item) => sum + ({ P0: 12, P1: 6, P2: 3 }[item.severity] || 2), 0);
const score = Math.max(0, 100 - penalty);

const report = {
  generated_at: new Date().toISOString(),
  version: 'sprint82-mobile-quick-actions-audit-1.0.0',
  score,
  checks,
  findings: findings.map(item => ({
    id: item.id,
    severity: item.severity,
    label: item.label,
    details: item.details,
    files: item.files,
  })),
};

fs.mkdirSync(REPORT_DIR, { recursive: true });
fs.writeFileSync(JSON_REPORT, JSON.stringify(report, null, 2) + '\n', 'utf8');
fs.writeFileSync(MD_REPORT, [
  '# Sprint 82 Mobile Quick Actions Audit',
  '',
  `- Generated: ${report.generated_at}`,
  `- Score: ${score}/100`,
  '',
  '## Checks',
  ...checks.map(item => `- ${item.ok ? 'OK' : 'FAIL'} [${item.severity}] ${item.id}: ${item.label}`),
  '',
  '## Findings',
  ...(report.findings.length
    ? report.findings.map(item => `- [${item.severity}] ${item.id}: ${item.details}`)
    : ['- No mobile quick action findings detected.']),
  '',
].join('\n'));

console.log(`[Sprint 82 Mobile Quick Actions Audit] score=${score}/100 findings=${report.findings.length}`);
console.log(`[Sprint 82 Mobile Quick Actions Audit] report: ${rel(path.relative(ROOT, JSON_REPORT))}`);

if (report.findings.some(item => item.severity === 'P0' || item.severity === 'P1')) {
  console.error('[Sprint 82 Mobile Quick Actions Audit] FAILED');
  report.findings.forEach(item => console.error(`- [${item.severity}] ${item.id}: ${item.details}`));
  process.exit(1);
}
