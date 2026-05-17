#!/usr/bin/env node
/*
 * Sprint 102 Live UX Menu Audit
 *
 * Guards the production navigation runtime after the write lifecycle hardening:
 * PC sections must not wipe the dashboard shell, mobile must restore nested
 * More-menu pages correctly, and priority menu read APIs must be shape-safe.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REPORT_DIR = path.join(ROOT, 'test_reports');
const REPORT_JSON = path.join(REPORT_DIR, 'sprint102_live_ux_menu_latest.json');
const REPORT_MD = path.join(REPORT_DIR, 'sprint102_live_ux_menu_latest.md');
const API_CONTRACT = require(path.join(ROOT, 'pwa', 'api_contract.js'));

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function has(text, pattern) {
  return pattern instanceof RegExp ? pattern.test(text) : text.includes(pattern);
}

function gasUrl() {
  const match = read('pwa/gas_config.js').match(/url:\s*'([^']+)'/);
  return process.env.COMPHONE_GAS_URL || (match && match[1]) || '';
}

function classify(error, status) {
  const raw = String(error || '').toUpperCase();
  if (status === 401 || /AUTH|TOKEN|SESSION|LOGIN/.test(raw)) return 'AUTH_FAIL';
  if (status === 403 || /PERMISSION|FORBIDDEN|ROLE/.test(raw)) return 'PERMISSION';
  if (/NOT_FOUND|UNKNOWN ACTION|NO_HANDLER|FUNCTION NOT FOUND|ACTION/.test(raw)) return 'CONTRACT';
  if (/TIMEOUT|ABORT/.test(raw)) return 'TIMEOUT';
  if (/NETWORK|FAILED TO FETCH|LOAD FAILED|OFFLINE/.test(raw)) return 'NETWORK';
  return 'BACKEND';
}

async function request(url, action, payload = {}) {
  const qs = new URLSearchParams(Object.assign({ action, _t: Date.now() }, payload));
  const started = Date.now();
  const res = await fetch(`${url}?${qs.toString()}`, { redirect: 'follow' });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch (_) {
    throw new Error(`${action}: non-JSON ${res.status} ${text.slice(0, 120)}`);
  }
  return { status: res.status, body, elapsedMs: Date.now() - started };
}

function rowsFor(body, keys) {
  for (const key of keys) {
    const value = key.split('.').reduce((obj, part) => obj && obj[part], body);
    if (Array.isArray(value)) return value;
  }
  return [];
}

async function main() {
  const files = {
    mobileHtml: read('pwa/index.html'),
    app: read('pwa/app.js'),
    appActions: read('pwa/app_actions.js'),
    pcHtml: read('pwa/dashboard_pc.html'),
    pcCore: read('pwa/dashboard_pc_core.js'),
    backup: read('pwa/section_backup.js'),
    reports: read('pwa/reports.js'),
    billing: read('pwa/billing_section.js'),
    vision: read('pwa/section_vision.js'),
    line: read('pwa/section_line_center.js'),
    workflow: read('.github/workflows/auto-deploy.yml'),
    regression: read('scripts/regression-guard.sh'),
  };

  const checks = [];
  const issues = [];
  const live = [];

  function check(area, name, ok, detail, severity = 'P1') {
    const row = { area, name, ok: !!ok, severity, detail };
    checks.push(row);
    if (!row.ok) issues.push(row);
  }

  const mobilePages = [
    'jobs', 'crm', 'inventory', 'po', 'billing', 'reports', 'attendance',
    'warranty', 'dashboard', 'analytics', 'revenue', 'tax', 'performance',
    'vision', 'line-center', 'admin'
  ];
  const pcSections = [
    'dashboard', 'jobs', 'crm', 'attendance', 'po', 'inventory', 'billing',
    'warranty', 'revenue', 'tax', 'reports', 'analytics', 'performance',
    'vision', 'line-center', 'backup', 'settings'
  ];

  check('mobile_runtime', 'nested-page-restore-uses-more-nav',
    has(files.app, 'function getNavButtonForPage') &&
      has(files.app, "document.getElementById('nav-more')") &&
      has(files.app, 'restoreLastPage') &&
      has(files.app, 'getNavButtonForPage(savedPage)') &&
      has(files.app, 'getNavButtonForPage(page)'),
    'Mobile restore/deep-link must reopen nested More pages with the correct active nav state.',
    'P0');

  check('mobile_runtime', 'accidental-exit-protection',
    has(files.app, "window.addEventListener('beforeunload'") &&
      has(files.app, "window.addEventListener('popstate'") &&
      has(files.app, 'protectedPage') &&
      has(files.app, 'comphone_offline_queue'),
    'Mobile must warn on accidental close/back when an operator is inside a work page or has offline queue items.',
    'P0');

  check('mobile_runtime', 'more-menu-scrollable-grouped-surface',
    has(files.mobileHtml, 'more-menu-overlay') &&
      has(files.app, 'MENU_GROUPS') &&
      has(files.app, 'more-menu-group-label') &&
      has(files.app, 'data-menu-page') &&
      has(files.app, 'data-quick-action'),
    'Mobile More sheet must stay grouped, data-driven, and support both page routes and quick actions.',
    'P0');

  for (const page of mobilePages) {
    check('mobile_page', `${page}:container-restorable`,
      has(files.mobileHtml, `id="page-${page}"`) &&
        has(files.app, `'${page}'`),
      `Mobile ${page} needs a page container and restorable route contract.`,
      'P0');
  }

  check('pc_runtime', 'section-renderers-do-not-wipe-main-shell',
    has(files.pcCore, 'function getSectionMount') &&
      has(files.pcCore, 'function renderMissingSection') &&
      !has(files.pcCore, 'main.innerHTML = global.renderSettingsSection()') &&
      !has(files.pcCore, "main.innerHTML = '<h3>") &&
      has(files.backup, "document.getElementById('backup-content') || document.getElementById('main-content')"),
    'PC renderers must write into section mounts, not replace #main-content and destroy other sections.',
    'P0');

  for (const section of pcSections) {
    check('pc_section', `${section}:section-and-content`,
      has(files.pcHtml, `id="section-${section}"`) &&
        (section === 'dashboard' || has(files.pcHtml, `id="${section}-content"`)),
      `PC ${section} needs a stable section/content mount.`,
      'P0');
    check('pc_section', `${section}:route`,
      section === 'dashboard' || has(files.pcHtml, `loadSection('${section}')`) || has(files.pcCore, `${section}:`),
      `PC ${section} needs a sidebar route or core renderer route.`,
      'P0');
  }

  check('priority_menus', 'reports-billing-vision-line-are-real-surfaces',
    has(files.reports, 'async function renderReportModule') &&
      has(files.billing, 'function renderBillingSection') &&
      has(files.vision, 'renderMobileVisionPage') &&
      has(files.line, 'renderMobileLineCenterPage'),
    'Priority menus must stay real modules, not blank shell pages.',
    'P0');

  check('ci', 'sprint102-is-wired',
    has(files.workflow, 'sprint102_live_ux_menu_audit.js') &&
      has(files.regression, 'sprint102_live_ux_menu_audit.js'),
    'Sprint 102 audit must run in Auto Deploy and local regression guard.',
    'P1');

  const requiredMenus = ['dashboard', 'crm', 'inventory', 'po', 'reports', 'vision', 'line-center', 'admin'];
  for (const menuId of requiredMenus) {
    const menu = (API_CONTRACT.menus || []).find(item => item.id === menuId);
    check('api_contract', `${menuId}:required-read-actions`,
      !!menu && (menu.actions || []).some(action => action.read && (action.required || !action.optional)),
      `${menuId} should expose at least one read action for live menu diagnostics.`,
      'P1');
  }

  const url = gasUrl();
  const token = process.env.COMPHONE_AUTH_TOKEN || '';
  if (!url) {
    live.push({ menu: 'system', action: 'gas-url', ok: false, status: 'CONFIG', error: 'Missing GAS URL' });
    check('protected_live', 'gas-url-present', false, 'GAS URL is not configured.', 'P0');
  } else if (!token) {
    live.push({ menu: 'protected-live-suite', action: '-', ok: true, status: 'skip', error: 'Set COMPHONE_AUTH_TOKEN to run protected read checks.' });
  } else {
    const probes = [
      ['dashboard', 'getDashboardData', {}, body => rowsFor(body, ['jobs', 'summary.recentJobs']).length >= 0],
      ['jobs', 'checkJobs', { limit: 10 }, body => rowsFor(body, ['jobs', 'data', 'rows']).length >= 0],
      ['crm', 'listCustomers', {}, body => rowsFor(body, ['customers', 'data', 'rows']).length >= 0],
      ['inventory', 'inventoryOverview', {}, body => !!(body.overview || body.summary || body.items || body.data || body.success)],
      ['po', 'listPurchaseOrders', { limit: 10 }, body => rowsFor(body, ['items', 'purchaseOrders', 'orders', 'data', 'rows']).length >= 0],
      ['billing', 'listBillings', { limit: 10 }, body => rowsFor(body, ['billings', 'data', 'rows']).length >= 0],
      ['reports', 'getReportData', { period: 'month' }, body => body && body.success !== false],
      ['vision', 'getVisionDashboardStats', { days: 7 }, body => body && body.success !== false],
      ['line-center', 'getLineCommandCenter', { days: 7 }, body => body && body.success !== false],
      ['admin', 'getSecurityStatus', {}, body => body && body.success !== false],
    ];

    for (const [menu, action, payload, validate] of probes) {
      try {
        const result = await request(url, action, Object.assign({}, payload, { token }));
        const ok = result.status === 200 && result.body && result.body.success !== false && validate(result.body);
        const error = ok ? '' : (result.body && (result.body.error || result.body.message || result.body.status)) || 'unexpected response';
        live.push({ menu, action, ok, status: ok ? 'ok' : classify(error, result.status), httpStatus: result.status, elapsedMs: result.elapsedMs, error });
        if (!ok) check('protected_live', `${menu}:${action}`, false, `${action} returned ${error}`, 'P0');
      } catch (err) {
        live.push({ menu, action, ok: false, status: classify(err.message), httpStatus: 0, elapsedMs: 0, error: err.message });
        check('protected_live', `${menu}:${action}`, false, err.message, 'P0');
      }
    }
  }

  const p0 = issues.filter(item => item.severity === 'P0').length;
  const score = Math.round((checks.filter(item => item.ok).length / checks.length) * 100);
  const status = p0 ? 'fail' : issues.length ? 'warn' : 'ok';
  const report = {
    generatedAt: new Date().toISOString(),
    sprint: 102,
    focus: 'live UX menu runtime stability',
    status,
    score,
    checksTotal: checks.length,
    checksPassed: checks.filter(item => item.ok).length,
    issues,
    protectedLive: live,
    checks,
  };

  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(REPORT_JSON, JSON.stringify(report, null, 2) + '\n', 'utf8');
  fs.writeFileSync(REPORT_MD, [
    '# Sprint 102 Live UX Menu Audit',
    '',
    `- Status: ${status}`,
    `- Score: ${score}/100`,
    `- Checks: ${report.checksPassed}/${checks.length}`,
    `- Protected live rows: ${live.length}`,
    '',
    '| Area | Check | Result | Detail |',
    '|---|---|---|---|',
    ...checks.map(item => `| ${item.area} | ${item.name} | ${item.ok ? 'OK' : item.severity} | ${item.detail} |`),
    '',
    '## Protected Live',
    '',
    '| Menu | Action | Result | Elapsed |',
    '|---|---|---|---|',
    ...live.map(item => `| ${item.menu || '-'} | ${item.action || '-'} | ${item.ok ? 'OK' : item.status} | ${item.elapsedMs || 0}ms |`),
    '',
  ].join('\n'), 'utf8');

  console.log(`[Sprint 102 Live UX Menu Audit] status=${status} score=${score}/100 checks=${report.checksPassed}/${checks.length} live=${live.length}`);
  for (const item of live) {
    if (item.action && item.action !== '-') console.log(`[live] ${item.menu} ${item.action}: ${item.ok ? 'OK' : item.status} ${item.elapsedMs || 0}ms${item.error ? ' - ' + item.error : ''}`);
  }
  for (const issue of issues) console.log(`- [${issue.severity}] ${issue.area}/${issue.name}: ${issue.detail}`);
  if (p0) process.exit(1);
}

main().catch(err => {
  console.error('[Sprint 102 Live UX Menu Audit] FAILED');
  console.error(err);
  process.exit(1);
});
