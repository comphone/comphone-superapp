#!/usr/bin/env node
/*
 * Sprint 86 operator UX QA checklist.
 *
 * A deterministic pre-release checklist for the PC/Mobile operator surfaces.
 * It does not replace manual QA, but it makes the expected walkthrough visible:
 * entry points, menu routes, recovery settings, modal recovery, and live smoke
 * readiness must all be present before a release is considered operator-ready.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REPORT_DIR = path.join(ROOT, 'test_reports');
const REPORT_JSON = path.join(REPORT_DIR, 'sprint86_operator_ux_qa_latest.json');
const REPORT_MD = path.join(REPORT_DIR, 'sprint86_operator_ux_qa_latest.md');

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

function localScripts(html) {
  return [...html.matchAll(/<script\s+src=["']([^"']+)["']/g)]
    .map(match => match[1].split('?')[0])
    .filter(src => !/^https?:\/\//.test(src) && !src.startsWith('//'));
}

function orderBefore(scripts, before, after) {
  const b = scripts.indexOf(before);
  const a = scripts.indexOf(after);
  return b > -1 && a > -1 && b < a;
}

function check(area, id, label, ok, severity, operatorStep, files) {
  return { area, id, label, ok: !!ok, severity, operatorStep, files: files.map(rel) };
}

const files = {
  mobileHtml: 'pwa/index.html',
  pcHtml: 'pwa/dashboard_pc.html',
  app: 'pwa/app.js',
  appHome: 'pwa/app_home.js',
  appActions: 'pwa/app_actions.js',
  appJobs: 'pwa/app_jobs.js',
  crm: 'pwa/crm_attendance.js',
  po: 'pwa/purchase_order.js',
  inventory: 'pwa/section_inventory.js',
  billing: 'pwa/billing_section.js',
  reports: 'pwa/reports.js',
  warranty: 'pwa/section_warranty.js',
  settings: 'pwa/section_settings.js',
  pcCore: 'pwa/dashboard_pc_core.js',
  runtimeSelfTest: 'pwa/runtime_self_test.js',
  pwaInstall: 'pwa/pwa_install.js',
  apiClient: 'pwa/api_client.js',
  browserSmoke: 'scripts/browser-smoke-test.py',
  liveMobileSmoke: 'scripts/sprint85_live_mobile_menu_smoke.js',
  autoDeploy: '.github/workflows/auto-deploy.yml',
  regressionGuard: 'scripts/regression-guard.sh',
};

const text = Object.fromEntries(Object.entries(files).map(([key, file]) => [key, read(file)]));
const mobileScripts = localScripts(text.mobileHtml);
const pcScripts = localScripts(text.pcHtml);

const pcSections = [
  'dashboard', 'jobs', 'crm', 'po', 'inventory', 'billing', 'warranty',
  'revenue', 'tax', 'reports', 'analytics', 'performance', 'vision',
  'line-center', 'attendance', 'settings',
];

const mobilePages = [
  'home', 'jobs', 'camera', 'crm', 'po', 'attendance', 'vision',
  'line-center', 'profile', 'reports', 'inventory', 'billing',
  'warranty', 'dashboard', 'customer-portal', 'notifications',
  'analytics', 'revenue', 'tax', 'performance', 'admin',
];

const checklist = [
  check(
    'entrypoints',
    'pc-and-mobile-entrypoints',
    'PC and mobile app shells have the critical runtime load order.',
    orderBefore(pcScripts, 'version_config.js', 'api_client.js') &&
      orderBefore(pcScripts, 'api_contract.js', 'api_client.js') &&
      orderBefore(pcScripts, 'api_client.js', 'dashboard_pc_core.js') &&
      orderBefore(mobileScripts, 'version_config.js', 'api_client.js') &&
      orderBefore(mobileScripts, 'api_contract.js', 'api_client.js') &&
      orderBefore(mobileScripts, 'api_client.js', 'app_actions.js') &&
      has(text.pcHtml, 'version_badge') &&
      has(text.mobileHtml, 'main-app'),
    'P0',
    'Open PC dashboard and mobile PWA; both should boot with version/config/API loaded before feature modules.',
    [files.pcHtml, files.mobileHtml, files.apiClient]
  ),
  check(
    'pc-navigation',
    'pc-sidebar-routes',
    'PC dashboard exposes and routes all operator sidebar sections.',
    pcSections.every(section => text.pcHtml.includes(`loadSection('${section}')`) || section === 'dashboard') &&
      pcSections.every(section => text.pcCore.includes(`'${section}'`) || text.pcCore.includes(`${section}:`)),
    'P0',
    'Click each PC sidebar item and confirm the title/content changes without a blank panel.',
    [files.pcHtml, files.pcCore]
  ),
  check(
    'mobile-navigation',
    'mobile-pages-and-more-sheet',
    'Mobile PWA has all page containers plus grouped More-sheet navigation.',
    mobilePages.every(page => has(text.mobileHtml, `id="page-${page}"`)) &&
      has(text.app, 'const MENU_GROUPS') &&
      has(text.app, 'function renderMoreMenu') &&
      has(text.app, 'data-menu-page') &&
      has(text.app, 'data-quick-action') &&
      has(text.mobileHtml, 'id="more-menu-overlay"'),
    'P0',
    'Open mobile More; grouped menu must show real items and route to each page without a white blank sheet.',
    [files.mobileHtml, files.app]
  ),
  check(
    'mobile-dashboard',
    'mobile-quick-actions',
    'Mobile dashboard quick actions are stable, configurable, and dispatch to real functions/routes.',
    has(text.mobileHtml, 'id="quick-actions-grid"') &&
      has(text.appHome, 'data-quick-action=') &&
      has(text.app, 'function runQuickAction') &&
      has(text.app, 'showQuickActionSettings') &&
      has(text.appActions, 'function openNewJob') &&
      has(text.appActions, 'function addCustomer'),
    'P0',
    'Tap Open Job, Add Customer, Jobs, and Customers from the mobile dashboard.',
    [files.mobileHtml, files.appHome, files.app, files.appActions]
  ),
  check(
    'core-workflows',
    'jobs-crm-billing-chain',
    'Jobs, CRM, and Billing have actionable mobile workflows and modal recovery.',
    has(text.appJobs, 'function showJobDetail') &&
      has(text.appJobs, 'openBillingModal') &&
      has(text.crm, 'function normalizeMobileCustomer') &&
      has(text.crm, "ensureActionModal('modal-customer'") &&
      has(text.billing, 'function loadBillingPage') &&
      has(text.billing, "document.getElementById('billing-content')") &&
      has(text.billing, "callApi('createBilling'"),
    'P0',
    'Walk Jobs -> detail -> Billing handoff, CRM -> customer detail, Billing -> list/create modal.',
    [files.appJobs, files.crm, files.billing]
  ),
  check(
    'secondary-workflows',
    'inventory-po-warranty-reports-chain',
    'Inventory, PO, Warranty, and Reports have mobile loaders and recovery-safe interaction points.',
    has(text.inventory, 'function loadInventoryPage') &&
      has(text.inventory, "callApi('inventoryOverview'") &&
      has(text.po, 'function ensurePOModalShell') &&
      has(text.po, "action: 'createPurchaseOrder'") &&
      has(text.po, 'client_request_id') &&
      has(text.warranty, 'function loadWarrantyPage') &&
      has(text.warranty, "callApi('listWarranties'") &&
      has(text.reports, 'function loadReportsPage') &&
      has(text.reports, '_loadReportInventory'),
    'P0',
    'Walk Inventory -> low stock/PO, PO -> detail/create/receive confirmation, Warranty list, Reports cards.',
    [files.inventory, files.po, files.warranty, files.reports]
  ),
  check(
    'recovery',
    'settings-diagnostics-and-cache-repair',
    'PC/mobile recovery surfaces expose runtime self-test, diagnostics export, and safe PWA cache repair.',
    has(text.settings, 'runtime-selftest-content') &&
      has(text.settings, 'exportComphoneDiagnostics') &&
      has(text.settings, 'clearPwaRuntimeCache') &&
      has(text.runtimeSelfTest, 'runRuntimeSelfTest') &&
      has(text.runtimeSelfTest, 'GitHub Pages') &&
      has(text.pwaInstall, '_reloadAfterSwUpdate'),
    'P1',
    'Open Settings and confirm runtime self-test, diagnostics export, and cache repair controls are available.',
    [files.settings, files.runtimeSelfTest, files.pwaInstall]
  ),
  check(
    'live-smoke',
    'token-aware-live-menu-smoke',
    'Live mobile menu smoke exists, is CI-wired, and remains token-aware.',
    has(text.liveMobileSmoke, 'COMPHONE_AUTH_TOKEN') &&
      has(text.liveMobileSmoke, 'protected-read-suite') &&
      has(text.liveMobileSmoke, 'getLineRoomStatus') &&
      has(text.liveMobileSmoke, 'listWarranties') &&
      has(text.autoDeploy, 'sprint85_live_mobile_menu_smoke.js') &&
      has(text.regressionGuard, 'sprint85_live_mobile_menu_smoke.js'),
    'P1',
    'Run node scripts/sprint85_live_mobile_menu_smoke.js; protected checks should run only with a session token.',
    [files.liveMobileSmoke, files.autoDeploy, files.regressionGuard]
  ),
  check(
    'browser-smoke',
    'browser-smoke-covered-by-regression',
    'Local browser-level PC shell smoke remains available in regression guard.',
    has(text.browserSmoke, 'dashboard_pc.html') &&
      has(text.browserSmoke, 'SimpleHTTPRequestHandler') &&
      has(text.browserSmoke, 'version_badge') &&
      has(text.regressionGuard, 'browser-smoke-test.py'),
    'P1',
    'Run python scripts/browser-smoke-test.py to confirm the PC shell serves over HTTP and avoids known recurrence patterns.',
    [files.browserSmoke, files.regressionGuard]
  ),
];

const findings = checklist.filter(item => !item.ok);
const penalty = findings.reduce((sum, item) => sum + ({ P0: 12, P1: 6, P2: 3 }[item.severity] || 2), 0);
const score = Math.max(0, 100 - penalty);

const report = {
  generated_at: new Date().toISOString(),
  version: 'sprint86-operator-ux-qa-checklist-1.0.0',
  score,
  checklist,
  findings: findings.map(item => ({
    area: item.area,
    id: item.id,
    severity: item.severity,
    label: item.label,
    operatorStep: item.operatorStep,
    files: item.files,
  })),
  manual_walkthrough_order: [
    'PC login -> dashboard -> Jobs -> CRM -> Billing -> Reports -> Settings diagnostics',
    'Mobile login -> dashboard quick actions -> Jobs -> CRM -> Billing',
    'Mobile More -> Inventory -> PO -> Warranty -> Reports -> Vision -> LINE Center',
    'Settings -> runtime self-test -> diagnostics export -> cache repair visibility',
  ],
};

fs.mkdirSync(REPORT_DIR, { recursive: true });
fs.writeFileSync(REPORT_JSON, JSON.stringify(report, null, 2) + '\n', 'utf8');
fs.writeFileSync(REPORT_MD, [
  '# Sprint 86 Operator UX QA Checklist',
  '',
  `- Generated: ${report.generated_at}`,
  `- Score: ${score}/100`,
  '',
  '## Checklist',
  ...checklist.map(item => `- ${item.ok ? 'OK' : 'FAIL'} [${item.severity}] ${item.area}/${item.id}: ${item.operatorStep}`),
  '',
  '## Manual Walkthrough Order',
  ...report.manual_walkthrough_order.map(item => `- ${item}`),
  '',
  '## Findings',
  ...(report.findings.length
    ? report.findings.map(item => `- [${item.severity}] ${item.area}/${item.id}: ${item.label}`)
    : ['- No operator UX checklist findings detected.']),
  '',
].join('\n'));

console.log(`[Sprint 86 Operator UX QA] score=${score}/100 findings=${report.findings.length}`);
console.log(`[Sprint 86 Operator UX QA] report: ${path.relative(ROOT, REPORT_JSON).replace(/\\/g, '/')}`);

if (report.findings.some(item => item.severity === 'P0' || item.severity === 'P1')) {
  console.error('[Sprint 86 Operator UX QA] FAILED');
  report.findings.forEach(item => console.error(`- [${item.severity}] ${item.area}/${item.id}: ${item.label}`));
  process.exit(1);
}
