#!/usr/bin/env node
/*
 * COMPHONE PWA Menu Journey Audit
 *
 * Static journey-level guard for the most important PC/mobile menus. This
 * catches "menu exists but opens an empty/prototype page" regressions before
 * deployment.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REPORT_DIR = path.join(ROOT, 'test_reports');
const REPORT_JSON = path.join(REPORT_DIR, 'pwa_menu_journey_latest.json');
const REPORT_MD = path.join(REPORT_DIR, 'pwa_menu_journey_latest.md');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function indexOf(text, needle) {
  const pos = text.indexOf(needle);
  return pos < 0 ? Number.MAX_SAFE_INTEGER : pos;
}

function has(text, pattern) {
  return pattern instanceof RegExp ? pattern.test(text) : text.includes(pattern);
}

function main() {
  const files = {
    apiContract: read('pwa/api_contract.js'),
    app: read('pwa/app.js'),
    appActions: read('pwa/app_actions.js'),
    pcHtml: read('pwa/dashboard_pc.html'),
    pcCore: read('pwa/dashboard_pc_core.js'),
    apiClient: read('pwa/api_client.js'),
    reports: exists('pwa/reports.js') ? read('pwa/reports.js') : '',
    sectionReports: read('pwa/section_reports.js'),
    jobs: read('pwa/job_workflow.js') + '\n' + read('pwa/section_jobs.js') + '\n' + read('pwa/app_actions.js'),
    crm: read('pwa/section_crm.js') + '\n' + read('pwa/app_actions.js'),
    billing: read('pwa/billing_section.js') + '\n' + read('pwa/billing_customer.js'),
    inventory: read('pwa/inventory_ui.js') + '\n' + read('pwa/section_inventory.js'),
    po: read('pwa/purchase_order.js') + '\n' + read('pwa/section_po.js') + '\n' + read('pwa/section_inventory.js'),
  };

  const checks = [];
  const issues = [];

  function check(journey, name, ok, detail, severity = 'P1') {
    const item = { journey, name, ok: !!ok, severity, detail };
    checks.push(item);
    if (!item.ok) issues.push(item);
  }

  const reportLoadOrderOk =
    indexOf(files.pcHtml, 'reports.js?v=') < indexOf(files.pcHtml, 'section_reports.js?v=') &&
    indexOf(files.pcHtml, 'section_reports.js?v=') < indexOf(files.pcHtml, 'dashboard_pc_core.js?v=');

  check('reports', 'pc-loads-real-reports-before-bridge', reportLoadOrderOk,
    'dashboard_pc.html must load reports.js before section_reports.js and dashboard_pc_core.js', 'P0');
  check('reports', 'real-report-module-present',
    has(files.reports, 'function renderReportModule') && has(files.reports, 'function loadReportsPage'),
    'reports.js must expose renderReportModule() and loadReportsPage()', 'P0');
  check('reports', 'pc-core-prefers-real-report-module',
    has(files.pcCore, 'renderReportModule') &&
      indexOf(files.pcCore, 'renderReportModule') < indexOf(files.pcCore, 'renderReportsSection'),
    'PC core must prefer renderReportModule() before legacy renderReportsSection()', 'P0');
  check('reports', 'reports-bridge-not-prototype',
    !/coming soon|Prototype|alert\([^)]*coming soon/i.test(files.sectionReports),
    'section_reports.js must not render prototype/coming-soon report buttons', 'P0');
  check('reports', 'report-actions-covered',
    ['getReportData', 'getAttendanceReport'].every(action => files.apiContract.includes(action) || files.reports.includes(action)) &&
      ['_loadReportAttendance', '_loadReportJobs', '_loadReportBilling', '_loadReportInventory']
        .every(fn => files.reports.includes(fn)),
    'Report menu must reference backend report actions and all visible report loaders', 'P1');

  check('service_job', 'mobile-job-entry-present',
    has(files.app, 'openNewJob') && has(files.jobs, 'submitNewJob'),
    'Mobile job journey must expose openNewJob() and submitNewJob()', 'P0');
  check('service_job', 'job-write-contract',
    has(files.jobs, 'createWriteRequestId') && has(files.jobs, 'openJob'),
    'Job write journey must send a durable request id to openJob', 'P0');
  check('service_job', 'job-transition-guard',
    has(files.jobs, 'transitionJob') && has(files.jobs, 'confirm('),
    'Job status transitions must require an explicit confirmation', 'P1');

  check('customer_crm', 'crm-entry-present',
    has(files.app, 'addCustomer') && has(files.crm, /function\s+(saveNewCustomer|openAddCustomer)/),
    'Mobile CRM journey must expose openNewCustomer() and saveNewCustomer()', 'P0');
  check('customer_crm', 'crm-write-contract',
    has(files.crm, 'createWriteRequestId') && has(files.crm, 'createCustomer'),
    'CRM create journey must send a durable request id to createCustomer', 'P0');
  check('customer_crm', 'crm-list-contract',
    has(files.apiContract, 'listCustomers') && has(files.crm, 'listCustomers'),
    'CRM menu must keep listCustomers contract wired', 'P1');

  check('billing_payment', 'billing-entry-present',
    has(files.billing, '_showCreateBilling') && has(files.billing, '_doCreateBilling'),
    'Billing menu must expose create billing UI and submit handler', 'P0');
  check('billing_payment', 'billing-write-contract',
    has(files.billing, 'createWriteRequestId') && has(files.billing, 'createBilling'),
    'Billing create journey must send a durable request id to createBilling', 'P0');
  check('billing_payment', 'billing-payment-confirmed',
    has(files.billing, 'markBillingPaid') && has(files.billing, 'confirm('),
    'Payment completion must require explicit confirmation', 'P1');

  check('inventory_po', 'inventory-overview-present',
    has(files.inventory, 'inventoryOverview') && has(files.app, 'loadInventory'),
    'Inventory menu must have mobile loader and overview API action', 'P1');
  check('inventory_po', 'po-write-contract',
    has(files.po, 'createWriteRequestId') && has(files.po, 'createPurchaseOrder'),
    'PO create journey must send a durable request id to createPurchaseOrder', 'P0');
  check('inventory_po', 'po-receive-confirmed',
    has(files.po, 'receivePurchaseOrder') && has(files.po, 'confirm('),
    'PO receiving must require explicit confirmation', 'P1');

  check('platform', 'central-api-client-present',
    has(files.apiClient, 'function callApi') && has(files.apiClient, 'createWriteRequestId'),
    'PWA must use central callApi() and createWriteRequestId()', 'P0');
  check('platform', 'api-contract-required-menus',
    ['dashboard', 'crm', 'inventory', 'po', 'reports', 'billing', 'vision', 'line-center', 'admin']
      .every(menu => files.apiContract.includes(`id: '${menu}'`)),
    'api_contract.js must document all required menu groups', 'P1');

  const p0 = issues.filter(item => item.severity === 'P0').length;
  const score = Math.max(0, Math.round((checks.filter(item => item.ok).length / checks.length) * 100));
  const status = p0 ? 'fail' : issues.length ? 'warn' : 'ok';
  const report = {
    generatedAt: new Date().toISOString(),
    status,
    score,
    checksTotal: checks.length,
    checksPassed: checks.filter(item => item.ok).length,
    issues,
    checks,
  };

  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(REPORT_JSON, JSON.stringify(report, null, 2) + '\n', 'utf8');
  fs.writeFileSync(REPORT_MD, [
    '# PWA Menu Journey Audit',
    '',
    `- Status: ${status}`,
    `- Score: ${score}/100`,
    `- Checks: ${report.checksPassed}/${checks.length}`,
    `- Issues: ${issues.length}`,
    '',
    '| Journey | Check | Result | Detail |',
    '|---|---|---|---|',
    ...checks.map(item => `| ${item.journey} | ${item.name} | ${item.ok ? 'OK' : item.severity} | ${item.detail} |`),
    '',
  ].join('\n'), 'utf8');

  console.log(`[PWA Menu Journey Audit] status=${status} score=${score}/100 checks=${report.checksPassed}/${checks.length}`);
  for (const issue of issues) {
    console.log(`- [${issue.severity}] ${issue.journey}/${issue.name}: ${issue.detail}`);
  }

  if (p0) process.exit(1);
}

main();
