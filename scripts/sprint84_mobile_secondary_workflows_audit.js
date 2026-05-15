#!/usr/bin/env node
/*
 * Sprint 84 mobile secondary workflows audit.
 *
 * Checks Inventory -> PO -> Warranty -> Reports mobile surfaces. These are the
 * supporting workflows that feed parts, purchasing, guarantees, and management
 * visibility around the core Jobs/CRM/Billing chain.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REPORT_DIR = path.join(ROOT, 'test_reports');
const JSON_REPORT = path.join(REPORT_DIR, 'sprint84_mobile_secondary_workflows_latest.json');
const MD_REPORT = path.join(REPORT_DIR, 'sprint84_mobile_secondary_workflows_latest.md');

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
  inventory: 'pwa/section_inventory.js',
  po: 'pwa/purchase_order.js',
  warranty: 'pwa/section_warranty.js',
  reports: 'pwa/reports.js',
  apiContract: 'pwa/api_contract.js',
  autoDeploy: '.github/workflows/auto-deploy.yml',
  regressionGuard: 'scripts/regression-guard.sh',
};

const text = Object.fromEntries(Object.entries(files).map(([key, file]) => [key, read(file)]));

const checks = [
  check(
    'mobile-secondary-pages-present',
    'Mobile shell exposes Inventory, PO, Warranty, and Reports page containers with stable mounts.',
    ['page-inventory', 'page-po', 'po-list', 'page-warranty', 'warranty-content', 'page-reports', 'reports-content']
      .every(id => has(text.mobileHtml, `id="${id}"`)),
    'P0',
    'Secondary operator pages must have real containers in index.html.',
    [files.mobileHtml]
  ),
  check(
    'inventory-mobile-workflow',
    'Inventory loads live overview into the mobile mount and exposes scanner/filter/low-stock PO handoff.',
    has(text.inventory, 'function loadInventoryPage') &&
      has(text.inventory, 'function _inventoryMount_') &&
      has(text.inventory, "document.getElementById('inventory-content')") &&
      has(text.inventory, "callApi('inventoryOverview'") &&
      has(text.inventory, '_openInventoryScanner_') &&
      has(text.inventory, '_filterInventory') &&
      has(text.inventory, '_showCreatePOFromLowStock') &&
      has(text.app, "if (page === 'inventory')"),
    'P0',
    'Inventory must render on mobile and connect low-stock work to purchasing.',
    [files.inventory, files.app]
  ),
  check(
    'po-mobile-modal-recovery',
    'PO list/detail/create flows recover missing modal shells dynamically.',
    has(text.po, 'function loadPurchaseOrderPage') &&
      has(text.po, "callApi({ action: 'listPurchaseOrders'") &&
      has(text.po, 'function ensurePOModalShell') &&
      has(text.po, "id = 'modal-po'") &&
      has(text.po, "id = 'modal-create-po'") &&
      has(text.po, 'modal-po-content') &&
      has(text.po, 'po-supplier') &&
      has(text.po, 'po-items-container') &&
      has(text.po, 'po-total-display') &&
      has(text.app, "if (page === 'po') loadPurchaseOrderPage()"),
    'P0',
    'PO must not depend on removed static modal markup in index.html.',
    [files.po, files.app]
  ),
  check(
    'po-write-and-receive-contract',
    'PO create and receive flows use durable write contracts.',
    has(text.po, 'function saveNewPO') &&
      has(text.po, "action: 'createPurchaseOrder'") &&
      has(text.po, 'client_request_id') &&
      has(text.po, "source: 'mobile_po'") &&
      has(text.po, 'items: validItems.map') &&
      has(text.po, 'function confirmReceivePO') &&
      has(text.po, "action: 'receivePurchaseOrder'") &&
      has(text.po, 'confirm('),
    'P0',
    'PO writes must be idempotent and receiving stock must remain explicitly confirmed.',
    [files.po]
  ),
  check(
    'warranty-mobile-workflow',
    'Warranty has a mobile loader alias and real API read/detail contract.',
    has(text.warranty, 'function renderWarrantySection') &&
      has(text.warranty, 'function loadWarrantyPage') &&
      has(text.warranty, "callApi('listWarranties'") &&
      has(text.warranty, 'function _viewWarrantyDetail') &&
      has(text.warranty, "callApi('getWarrantyByJobId'") &&
      has(text.app, "if (page === 'warranty')"),
    'P0',
    'Warranty page should be a first-class mobile route, not only a fallback renderer.',
    [files.warranty, files.app]
  ),
  check(
    'reports-mobile-workflow',
    'Reports page exposes the production report module and core report loaders.',
    has(text.reports, 'async function renderReportModule') &&
      has(text.reports, 'function loadReportsPage') &&
      has(text.reports, 'report-detail') &&
      ['_showReport', '_loadReportAttendance', '_loadReportJobs', '_loadReportBilling', '_loadReportInventory']
        .every(fn => has(text.reports, fn)) &&
      has(text.app, "if (page === 'reports')"),
    'P0',
    'Reports must expose actionable report cards for attendance, jobs, billing, and inventory.',
    [files.reports, files.app]
  ),
  check(
    'api-contract-secondary-flow',
    'API contract documents Inventory, PO, Warranty, and Reports read/write actions.',
    [
      'inventoryOverview', 'checkStock', 'barcodeLookup',
      'listPurchaseOrders', 'createPurchaseOrder', 'receivePurchaseOrder',
      'listWarranties', 'getWarrantyByJobId', 'createWarranty', 'updateWarrantyStatus',
      'getReportData', 'getAttendanceMonthlySummary'
    ].every(action => has(text.apiContract, action)),
    'P1',
    'Secondary mobile workflows should remain visible to smoke tests and future audits.',
    [files.apiContract]
  ),
  check(
    'ci-coverage',
    'Sprint 84 mobile secondary workflows audit is wired into CI and regression guard.',
    has(text.autoDeploy, 'sprint84_mobile_secondary_workflows_audit.js') &&
      has(text.regressionGuard, 'sprint84_mobile_secondary_workflows_audit.js'),
    'P1',
    'Future secondary-menu edits must run this audit in Auto Deploy and local regression guard.',
    [files.autoDeploy, files.regressionGuard]
  ),
];

const findings = checks.filter(item => !item.ok);
const penalty = findings.reduce((sum, item) => sum + ({ P0: 12, P1: 6, P2: 3 }[item.severity] || 2), 0);
const score = Math.max(0, 100 - penalty);

const report = {
  generated_at: new Date().toISOString(),
  version: 'sprint84-mobile-secondary-workflows-audit-1.0.0',
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
  '# Sprint 84 Mobile Secondary Workflows Audit',
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
    : ['- No mobile secondary workflow findings detected.']),
  '',
].join('\n'));

console.log(`[Sprint 84 Mobile Secondary Workflows Audit] score=${score}/100 findings=${report.findings.length}`);
console.log(`[Sprint 84 Mobile Secondary Workflows Audit] report: ${rel(path.relative(ROOT, JSON_REPORT))}`);

if (report.findings.some(item => item.severity === 'P0' || item.severity === 'P1')) {
  console.error('[Sprint 84 Mobile Secondary Workflows Audit] FAILED');
  report.findings.forEach(item => console.error(`- [${item.severity}] ${item.id}: ${item.details}`));
  process.exit(1);
}
