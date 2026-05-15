#!/usr/bin/env node
/*
 * Sprint 83 mobile core workflows audit.
 *
 * Checks the highest-value mobile operator chain:
 * Jobs -> CRM -> Billing. These pages must have real loaders, normalized data,
 * recovery-safe modals, and write contracts.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REPORT_DIR = path.join(ROOT, 'test_reports');
const JSON_REPORT = path.join(REPORT_DIR, 'sprint83_mobile_core_workflows_latest.json');
const MD_REPORT = path.join(REPORT_DIR, 'sprint83_mobile_core_workflows_latest.md');

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
  jobs: 'pwa/app_jobs.js',
  crm: 'pwa/crm_attendance.js',
  billing: 'pwa/billing_section.js',
  appActions: 'pwa/app_actions.js',
  apiContract: 'pwa/api_contract.js',
  autoDeploy: '.github/workflows/auto-deploy.yml',
  regressionGuard: 'scripts/regression-guard.sh',
};

const text = Object.fromEntries(Object.entries(files).map(([key, file]) => [key, read(file)]));

const checks = [
  check(
    'mobile-core-pages-present',
    'Mobile shell exposes Jobs, CRM, and Billing page containers with concrete mount points.',
    ['page-jobs', 'jobs-list', 'page-crm', 'crm-list', 'crm-after-sales-section', 'page-billing', 'billing-content']
      .every(id => has(text.mobileHtml, `id="${id}"`)),
    'P0',
    'Jobs/CRM/Billing are the core counter workflow and must have stable containers in index.html.',
    [files.mobileHtml]
  ),
  check(
    'jobs-workflow-complete',
    'Mobile Jobs page supports list, filters, detail modal, status actions, photos, and Billing handoff.',
    has(text.jobs, 'function renderJobsPage') &&
      has(text.jobs, 'function renderJobCard') &&
      has(text.jobs, 'function filterByStatus') &&
      has(text.jobs, 'function showJobDetail') &&
      has(text.jobs, 'modal-job-content') &&
      has(text.jobs, 'openCameraForJob') &&
      has(text.jobs, 'markJobDone') &&
      has(text.jobs, 'openBillingModal') &&
      has(text.app, "if (page === 'jobs') renderJobsPage()"),
    'P0',
    'Jobs must be an actionable work queue, not only a static list.',
    [files.jobs, files.app]
  ),
  check(
    'crm-loader-and-normalization',
    'Mobile CRM loads backend customers into crm-list and normalizes backend field aliases.',
    has(text.crm, 'function loadCRMPage') &&
      has(text.crm, "callApi({ action: 'listCustomers'") &&
      has(text.crm, 'function normalizeMobileCustomer') &&
      ['customer_name', 'customer_id', 'customer_type', 'total_jobs', 'total_revenue', 'created_at']
        .every(alias => has(text.crm, alias)) &&
      has(text.crm, 'renderCRMList') &&
      has(text.app, "if (page === 'crm') loadCRMPage()"),
    'P0',
    'CRM must render real backend customer data even when the API returns sheet-style field names.',
    [files.crm, files.app]
  ),
  check(
    'crm-modal-recovery',
    'Mobile CRM details and add-customer flows recover modals dynamically.',
    has(text.crm, "ensureActionModal('modal-customer'") &&
      has(text.crm, 'modal-customer-content') &&
      has(text.crm, "ensureActionModal('modal-aftersales'") &&
      has(text.crm, 'modal-aftersales-content') &&
      has(text.crm, 'if (typeof addCustomer ===') &&
      has(text.appActions, "ensureActionModal('modal-add-customer'"),
    'P0',
    'CRM must not depend on removed static modal shells in index.html.',
    [files.crm, files.appActions]
  ),
  check(
    'crm-write-contract',
    'Mobile CRM customer writes include idempotency and unified API action coverage.',
    has(text.crm, 'function saveNewCustomerFromCRM') &&
      has(text.crm, 'client_request_id') &&
      has(text.crm, "action: 'createCustomer'") &&
      has(text.crm, "source: 'mobile_crm'") &&
      has(text.apiContract, 'createCustomer') &&
      has(text.apiContract, 'listCustomers'),
    'P1',
    'Legacy CRM add-customer path must be safe if called directly.',
    [files.crm, files.apiContract]
  ),
  check(
    'billing-mobile-workflow-complete',
    'Mobile Billing page uses the shared renderer with list/create/pay/QR contracts.',
    has(text.mobileHtml, 'id="billing-content"') &&
      has(text.billing, 'function loadBillingPage') &&
      has(text.billing, "document.getElementById('main-content') || document.getElementById('billing-content')") &&
      has(text.billing, 'function _listBillings') &&
      has(text.billing, 'function _showCreateBilling') &&
      has(text.billing, 'function _doCreateBilling') &&
      has(text.billing, "callApi('createBilling'") &&
      has(text.billing, 'client_request_id') &&
      has(text.billing, 'function _doMarkPaid') &&
      has(text.billing, 'function _showPromptPayQR') &&
      has(text.app, "if (page === 'billing')"),
    'P0',
    'Billing must work from the mobile page and from Jobs handoff without blank mounts.',
    [files.mobileHtml, files.billing, files.app]
  ),
  check(
    'api-contract-core-flow',
    'API contract documents read/write actions for Jobs, CRM, and Billing.',
    ['openJob', 'checkJobs', 'getJobTimeline', 'listCustomers', 'createCustomer', 'listBillings', 'createBilling', 'markBillingPaid', 'generatePromptPayQR']
      .every(action => has(text.apiContract, action)),
    'P1',
    'Core mobile workflows should remain visible to smoke tests and future audits.',
    [files.apiContract]
  ),
  check(
    'ci-coverage',
    'Sprint 83 mobile core workflows audit is wired into CI and regression guard.',
    has(text.autoDeploy, 'sprint83_mobile_core_workflows_audit.js') &&
      has(text.regressionGuard, 'sprint83_mobile_core_workflows_audit.js'),
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
  version: 'sprint83-mobile-core-workflows-audit-1.0.0',
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
  '# Sprint 83 Mobile Core Workflows Audit',
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
    : ['- No mobile core workflow findings detected.']),
  '',
].join('\n'));

console.log(`[Sprint 83 Mobile Core Workflows Audit] score=${score}/100 findings=${report.findings.length}`);
console.log(`[Sprint 83 Mobile Core Workflows Audit] report: ${rel(path.relative(ROOT, JSON_REPORT))}`);

if (report.findings.some(item => item.severity === 'P0' || item.severity === 'P1')) {
  console.error('[Sprint 83 Mobile Core Workflows Audit] FAILED');
  report.findings.forEach(item => console.error(`- [${item.severity}] ${item.id}: ${item.details}`));
  process.exit(1);
}
