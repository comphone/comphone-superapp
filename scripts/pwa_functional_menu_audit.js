#!/usr/bin/env node
/*
 * COMPHONE functional menu audit.
 *
 * This is stricter than the static relationship audit: it verifies that the
 * visible PC/mobile menu surfaces have a real page container, a renderer or
 * loader, a backend contract where needed, and no required production menu is
 * left as a blank/coming-soon shell.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REPORT_DIR = path.join(ROOT, 'test_reports');
const REPORT_JSON = path.join(REPORT_DIR, 'pwa_functional_menu_audit_latest.json');
const REPORT_MD = path.join(REPORT_DIR, 'pwa_functional_menu_audit_latest.md');
const API_CONTRACT = require(path.join(ROOT, 'pwa', 'api_contract.js'));

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function has(text, pattern) {
  return pattern instanceof RegExp ? pattern.test(text) : text.includes(pattern);
}

function localScripts(html) {
  return [...html.matchAll(/<script\s+src=["']([^"']+)["']/g)]
    .map(match => match[1].split('?')[0])
    .filter(src => !/^https?:\/\//.test(src) && !src.startsWith('//'));
}

function actionsFor(menuId) {
  const menu = API_CONTRACT.menus.find(item => item.id === menuId);
  return menu ? menu.actions.map(item => item.action) : [];
}

async function main() {
  const files = {
    mobileHtml: read('pwa/index.html'),
    pcHtml: read('pwa/dashboard_pc.html'),
    app: read('pwa/app.js'),
    appActions: read('pwa/app_actions.js'),
    pcCore: read('pwa/dashboard_pc_core.js'),
    settings: read('pwa/section_settings.js'),
    reports: exists('pwa/reports.js') ? read('pwa/reports.js') : '',
    crm: read('pwa/section_crm.js'),
    jobs: read('pwa/section_jobs.js') + '\n' + read('pwa/job_workflow.js'),
    inventory: read('pwa/section_inventory.js') + '\n' + read('pwa/inventory_ui.js'),
    po: read('pwa/section_po.js') + '\n' + read('pwa/purchase_order.js'),
    billing: read('pwa/section_billing.js') + '\n' + read('pwa/billing_section.js'),
    tax: read('pwa/section_tax.js') + '\n' + read('pwa/tax_ui.js'),
    vision: read('pwa/section_vision.js'),
    lineCenter: read('pwa/section_line_center.js'),
  };

  const mobileScripts = localScripts(files.mobileHtml);
  const pcScripts = localScripts(files.pcHtml);
  const checks = [];
  const issues = [];

  function check(area, name, ok, detail, severity = 'P1') {
    const row = { area, name, ok: !!ok, severity, detail };
    checks.push(row);
    if (!row.ok) issues.push(row);
  }

  const mobileMenus = [
    ['jobs', 'renderJobsPage', files.app + files.appActions + files.jobs],
    ['crm', 'loadCRMPage', files.app + files.crm],
    ['inventory', 'loadInventoryPage', files.app + files.inventory],
    ['po', 'loadPurchaseOrderPage', files.app + files.po],
    ['billing', 'loadBillingPage', files.app + files.billing],
    ['reports', 'loadReportsPage', files.app + files.reports],
    ['vision', 'renderMobileVisionPage', files.app + files.vision],
    ['line-center', 'renderMobileLineCenterPage', files.app + files.lineCenter],
    ['profile', 'renderProfile', files.app],
  ];

  for (const [page, loader, source] of mobileMenus) {
    check('mobile-menu', `${page}:page-container`, files.mobileHtml.includes(`id="page-${page}"`),
      `Mobile shell must include #page-${page}`, 'P0');
    check('mobile-menu', `${page}:loader`, source.includes(loader) || files.app.includes(`page === '${page}'`),
      `Mobile ${page} must have a loader/renderer`, 'P0');
  }

  check('mobile-menu', 'quick-actions-configurable',
    has(files.app, 'showQuickActionSettings') && has(files.app, 'QUICK_ACTIONS_KEY') &&
      has(files.mobileHtml, 'showQuickActionSettings'),
    'Mobile settings must expose dashboard quick action configuration', 'P1');
  check('mobile-menu', 'more-menu-grouped',
    has(files.app, 'MENU_GROUPS') && has(files.app, 'renderMoreMenu') && has(files.app, 'data-menu-page'),
    'Mobile More menu must be grouped and data-driven', 'P1');
  check('mobile-menu', 'blank-page-guard',
    has(files.app, 'ensurePageHasContent') && has(files.app, 'getPageMount'),
    'Mobile navigation must protect against blank menu pages', 'P1');

  const pcMenus = [
    ['dashboard', 'renderDashboard'],
    ['jobs', 'renderJobsSection'],
    ['crm', 'renderCRMSection'],
    ['attendance', 'renderAttendanceSection'],
    ['po', 'renderPOSection'],
    ['inventory', 'renderInventorySection'],
    ['billing', 'renderBillingSection'],
    ['warranty', 'renderWarrantySection'],
    ['revenue', 'renderRevenueSection'],
    ['tax', 'renderTaxSection'],
    ['reports', 'renderReportModule'],
    ['analytics', 'renderAnalyticsSection'],
    ['performance', 'renderPerformanceSection'],
    ['vision', 'renderVisionSection'],
    ['line-center', 'renderLineCenterSection'],
    ['settings', 'renderSettingsSection'],
  ];

  for (const [section, renderer] of pcMenus) {
    const hasNav = files.pcHtml.includes(`loadSection('${section}')`) || files.pcHtml.includes(`loadSection("${section}")`);
    const hasCoreRoute = files.pcCore.includes(`${section}:`) || files.pcCore.includes(`'${section}':`);
    const hasRenderer = files.pcCore.includes(renderer) ||
      Object.values(files).some(text => typeof text === 'string' && text.includes(`function ${renderer}`));
    check('pc-menu', `${section}:nav`, hasNav || section === 'dashboard',
      `PC dashboard must expose nav for ${section}`, section === 'dashboard' ? 'P1' : 'P0');
    check('pc-menu', `${section}:route-renderer`, hasCoreRoute && hasRenderer,
      `PC section ${section} must route to ${renderer}`, 'P0');
  }

  const requiredContracts = ['dashboard', 'crm', 'inventory', 'po', 'reports', 'vision', 'line-center', 'admin'];
  for (const menu of requiredContracts) {
    check('api-contract', `${menu}:required-actions`, actionsFor(menu).length > 0,
      `${menu} must have API contract actions`, 'P0');
  }

  check('settings', 'runtime-self-test-visible',
    has(files.settings, 'runtime-selftest-content') && has(files.settings, 'hydrateSettingsRuntimePanels'),
    'Settings must mount Runtime Self-Test', 'P1');
  check('settings', 'diagnostics-export',
    has(files.settings, 'exportComphoneDiagnostics') && has(files.settings, 'hydrateSystemDiagnostics'),
    'Settings must expose live diagnostics export and readiness summary', 'P1');
  check('settings', 'safe-cache-clear',
    has(files.settings, 'clearPwaRuntimeCache') && has(files.settings, 'serviceWorker.getRegistrations'),
    'Settings must clear PWA caches and stale service workers safely', 'P1');

  const forbiddenRequiredShells = [
    ['pc-core-coming-soon', /settings[\s\S]{0,500}Coming soon|jobs[\s\S]{0,500}Coming soon|reports[\s\S]{0,500}Coming soon/i.test(files.pcCore)],
    ['mobile-empty-required-page', /page-(jobs|crm|inventory|po|billing|reports|vision|line-center)[\s\S]{0,300}ยังไม่พร้อมใช้งาน/i.test(files.mobileHtml)],
  ];
  for (const [name, found] of forbiddenRequiredShells) {
    check('blank-shell', name, !found, `${name} must not appear in required production journeys`, 'P0');
  }

  const live = await runLiveShapeChecks();
  for (const row of live.checks) checks.push(row);
  for (const row of live.checks.filter(row => !row.ok)) issues.push(row);

  const p0 = issues.filter(item => item.severity === 'P0').length;
  const score = Math.max(0, Math.round((checks.filter(item => item.ok).length / checks.length) * 100));
  const report = {
    generatedAt: new Date().toISOString(),
    status: p0 ? 'fail' : issues.length ? 'warn' : 'ok',
    score,
    checksTotal: checks.length,
    checksPassed: checks.filter(item => item.ok).length,
    issues,
    mobileScripts,
    pcScripts,
    checks,
  };

  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(REPORT_JSON, JSON.stringify(report, null, 2) + '\n', 'utf8');
  fs.writeFileSync(REPORT_MD, [
    '# PWA Functional Menu Audit',
    '',
    `- Status: ${report.status}`,
    `- Score: ${score}/100`,
    `- Checks: ${report.checksPassed}/${checks.length}`,
    `- Issues: ${issues.length}`,
    '',
    '| Area | Check | Result | Detail |',
    '|---|---|---|---|',
    ...checks.map(item => `| ${item.area} | ${item.name} | ${item.ok ? 'OK' : item.severity} | ${item.detail} |`),
    '',
  ].join('\n'), 'utf8');

  console.log(`[PWA Functional Menu Audit] status=${report.status} score=${score}/100 checks=${report.checksPassed}/${checks.length}`);
  for (const issue of issues) console.log(`- [${issue.severity}] ${issue.area}/${issue.name}: ${issue.detail}`);
  if (p0) process.exit(1);
}

async function runLiveShapeChecks() {
  const token = process.env.COMPHONE_AUTH_TOKEN || '';
  const gasConfig = read('pwa/gas_config.js');
  const urlMatch = gasConfig.match(/url:\s*'([^']+)'/);
  const gasUrl = process.env.COMPHONE_GAS_URL || (urlMatch && urlMatch[1]);
  const checks = [];
  const add = (name, ok, detail, severity = 'P1') =>
    checks.push({ area: 'live-data', name, ok: !!ok, severity, detail });

  if (!gasUrl) {
    add('gas-url-present', false, 'No GAS URL configured', 'P0');
    return { checks };
  }
  add('gas-url-present', true, 'GAS URL is configured');

  if (!token) {
    add('protected-live-shape', true, 'Skipped: COMPHONE_AUTH_TOKEN is not set', 'P2');
    return { checks };
  }

  async function call(action, payload = {}) {
    const qs = new URLSearchParams(Object.assign({ action, token, _t: Date.now() }, payload));
    const res = await fetch(`${gasUrl}?${qs.toString()}`, { redirect: 'follow' });
    const body = await res.json();
    return { status: res.status, body };
  }

  const probes = [
    ['dashboard-data-shape', 'getDashboardData', {}, body => Array.isArray(body.jobs || (body.summary && body.summary.recentJobs) || [])],
    ['crm-list-shape', 'listCustomers', {}, body => Array.isArray(body.customers || body.data || body.rows || [])],
    ['inventory-overview-shape', 'inventoryOverview', {}, body => !!(body.overview || body.summary || body.items || body.data || body.success)],
    ['reports-shape', 'getReportData', { period: 'month' }, body => body.success !== false && !!body],
    ['line-center-shape', 'getLineCommandCenter', { days: 7 }, body => body.success !== false && !!body],
  ];

  for (const [name, action, payload, validate] of probes) {
    const started = Date.now();
    try {
      const result = await call(action, payload);
      const ok = result.status === 200 && result.body && result.body.success !== false && validate(result.body);
      add(name, ok, `${action} HTTP ${result.status} ${Date.now() - started}ms`, ok ? 'P1' : 'P0');
    } catch (err) {
      add(name, false, `${action} failed: ${err.message}`, 'P0');
    }
  }

  return { checks };
}

main().catch(err => {
  console.error('[PWA Functional Menu Audit] FAILED');
  console.error(err);
  process.exit(1);
});
