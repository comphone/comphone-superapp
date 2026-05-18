#!/usr/bin/env node
/*
 * Sprint 124 Protected Visual/Menu QA
 *
 * Token-aware, read-only protected visual/menu QA runner for PC dashboard sections and Mobile More
 * menu pages. It is CI-safe without COMPHONE_AUTH_TOKEN: static and public
 * freshness checks still run, while protected read checks skip with a clear
 * operator instruction.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REPORT_DIR = path.join(ROOT, 'test_reports');
const REPORT_JSON = path.join(REPORT_DIR, 'sprint124_protected_visual_menu_qa_latest.json');
const REPORT_MD = path.join(REPORT_DIR, 'sprint124_protected_visual_menu_qa_latest.md');
const TOKEN = process.env.COMPHONE_AUTH_TOKEN || '';
const TIMEOUT_MS = Number(process.env.COMPHONE_LIVE_QA_TIMEOUT_MS || 30000);

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

const gasConfig = read('pwa/gas_config.js');
const gasUrlMatch = gasConfig.match(/url:\s*'([^']+)'/);
const GAS_URL = process.env.COMPHONE_GAS_URL || (gasUrlMatch && gasUrlMatch[1]);
const versionConfig = read('pwa/version_config.js');
const buildMatch = versionConfig.match(/BUILD_TIMESTAMP\s*=\s*'([^']+)'/);
const cacheMatch = versionConfig.match(/CACHE_VERSION\s*=\s*'([^']+)'/);
const BUILD_TIMESTAMP = buildMatch && buildMatch[1];
const CACHE_VERSION = cacheMatch && cacheMatch[1];

if (!GAS_URL) {
  console.error('[Sprint 124 Protected Visual/Menu QA] Missing GAS URL.');
  process.exit(1);
}

function nestedValue(obj, key) {
  return key.split('.').reduce((current, part) => current && current[part], obj);
}

function normalizeArray(body, keys) {
  for (const key of keys) {
    const value = nestedValue(body, key);
    if (Array.isArray(value)) return value;
  }
  return [];
}

function hasObject(body, keys) {
  return keys.some(key => {
    const value = nestedValue(body, key);
    return value && typeof value === 'object' && !Array.isArray(value);
  });
}

function okBase(body) {
  return body && body.success !== false && body.status !== 'error';
}

function classify(error, status) {
  const raw = String(error || '').toUpperCase();
  if (status === 401 || /AUTH|TOKEN|SESSION|LOGIN|401/.test(raw)) return 'AUTH_FAIL';
  if (status === 403 || /PERMISSION|FORBIDDEN|DENIED|ROLE|ADMIN ACCESS|403/.test(raw)) return 'PERMISSION';
  if (/NOT_FOUND|UNKNOWN ACTION|NO_HANDLER|FUNCTION NOT FOUND|ACTION/.test(raw)) return 'CONTRACT';
  if (/TIMEOUT|ABORT/.test(raw)) return 'TIMEOUT';
  if (/NETWORK|FAILED TO FETCH|LOAD FAILED|OFFLINE/.test(raw)) return 'NETWORK';
  return 'BACKEND';
}

function sanitizePayload(payload) {
  const copy = Object.assign({}, payload || {});
  Object.keys(copy).forEach(key => {
    if (copy[key] && typeof copy[key] === 'object') copy[key] = JSON.stringify(copy[key]);
  });
  return copy;
}

async function fetchText(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { redirect: 'follow', signal: controller.signal });
    return { ok: res.ok, status: res.status, text: await res.text() };
  } finally {
    clearTimeout(timer);
  }
}

async function request(action, payload = {}) {
  const qs = new URLSearchParams(Object.assign({ action, _t: Date.now() }, sanitizePayload(payload)));
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${GAS_URL}?${qs.toString()}`, { redirect: 'follow', signal: controller.signal });
    const text = await res.text();
    let body;
    try {
      body = JSON.parse(text);
    } catch (_) {
      throw new Error(`${action}: non-JSON response (${res.status}) ${text.slice(0, 160)}`);
    }
    return { status: res.status, body };
  } finally {
    clearTimeout(timer);
  }
}

const STATIC = {
  index: read('pwa/index.html'),
  pc: read('pwa/dashboard_pc.html'),
  app: read('pwa/app.js'),
  appHome: read('pwa/app_home.js'),
  appActions: read('pwa/app_actions.js'),
  dashboard: read('pwa/dashboard.js'),
  pcCore: read('pwa/dashboard_pc_core.js'),
  manifest: read('pwa/pwa_asset_manifest.js'),
  workflow: read('.github/workflows/auto-deploy.yml'),
  regression: read('scripts/regression-guard.sh'),
  staticGuard: read('scripts/pwa_static_guard.js'),
  blueprint: read('BLUEPRINT.md'),
};

const MENU_STEPS = [
  {
    surface: 'PC/Mobile Dashboard',
    page: 'dashboard',
    action: 'getDashboardData',
    validate: body => okBase(body) && (hasObject(body, ['summary', 'data.summary']) || normalizeArray(body, ['jobs', 'data.jobs']).length >= 0),
    summarize: body => ({ hasSummary: hasObject(body, ['summary', 'data.summary']), jobs: normalizeArray(body, ['jobs', 'data.jobs']).length }),
  },
  {
    surface: 'Mobile Jobs',
    page: 'jobs',
    action: 'checkJobs',
    payload: { limit: 10 },
    validate: body => okBase(body) && normalizeArray(body, ['jobs', 'items', 'data.jobs', 'data.items']).length >= 0,
    summarize: body => ({ count: normalizeArray(body, ['jobs', 'items', 'data.jobs', 'data.items']).length }),
  },
  {
    surface: 'Mobile CRM',
    page: 'crm',
    action: 'listCustomers',
    payload: { limit: 10 },
    validate: body => okBase(body) && normalizeArray(body, ['customers', 'items', 'data.customers', 'data.items', 'data']).length >= 0,
    summarize: body => ({ count: normalizeArray(body, ['customers', 'items', 'data.customers', 'data.items', 'data']).length }),
  },
  {
    surface: 'Mobile Billing',
    page: 'billing',
    action: 'listBillings',
    payload: { limit: 10 },
    validate: body => okBase(body) && normalizeArray(body, ['items', 'billings', 'data.items', 'data']).length >= 0,
    summarize: body => ({ count: normalizeArray(body, ['items', 'billings', 'data.items', 'data']).length }),
  },
  {
    surface: 'Mobile Reports',
    page: 'reports',
    action: 'getReportData',
    payload: { period: 'month' },
    validate: body => okBase(body) && (hasObject(body, ['summary', 'data', 'data.summary']) || normalizeArray(body, ['records', 'data.records', 'data.dailyRevenue']).length >= 0),
    summarize: body => ({ hasData: hasObject(body, ['summary', 'data', 'data.summary']), records: normalizeArray(body, ['records', 'data.records', 'data.dailyRevenue']).length }),
  },
  {
    surface: 'Mobile Inventory',
    page: 'inventory',
    action: 'inventoryOverview',
    validate: body => okBase(body) && (hasObject(body, ['overview', 'summary', 'data.overview']) || normalizeArray(body, ['items', 'data.items', 'data']).length >= 0),
    summarize: body => ({ hasOverview: hasObject(body, ['overview', 'summary', 'data.overview']), items: normalizeArray(body, ['items', 'data.items', 'data']).length }),
  },
  {
    surface: 'Mobile PO',
    page: 'po',
    action: 'listPurchaseOrders',
    payload: { limit: 10 },
    validate: body => okBase(body) && normalizeArray(body, ['items', 'purchaseOrders', 'orders', 'data.items', 'data']).length >= 0,
    summarize: body => ({ count: normalizeArray(body, ['items', 'purchaseOrders', 'orders', 'data.items', 'data']).length }),
  },
  {
    surface: 'Mobile Warranty',
    page: 'warranty',
    action: 'listWarranties',
    payload: { limit: 10 },
    validate: body => okBase(body) && normalizeArray(body, ['warranties', 'items', 'data.warranties', 'data.items', 'data']).length >= 0,
    summarize: body => ({ count: normalizeArray(body, ['warranties', 'items', 'data.warranties', 'data.items', 'data']).length }),
  },
  {
    surface: 'Mobile AI Vision',
    page: 'vision',
    action: 'getVisionDashboardStats',
    payload: { days: 7 },
    validate: body => okBase(body) && hasObject(body, ['stats', 'data.stats']),
    summarize: body => ({ hasStats: hasObject(body, ['stats', 'data.stats']) }),
  },
  {
    surface: 'Mobile LINE Center',
    page: 'line-center',
    action: 'getLineCommandCenter',
    validate: body => okBase(body) && (hasObject(body, ['data', 'summary', 'rooms', 'data.rooms']) || normalizeArray(body, ['rooms', 'alerts', 'data.rooms', 'data.alerts']).length >= 0),
    summarize: body => ({ rooms: normalizeArray(body, ['rooms', 'data.rooms']).length, alerts: normalizeArray(body, ['alerts', 'data.alerts']).length }),
  },
  {
    surface: 'PC/Admin Settings',
    page: 'admin',
    action: 'getSecurityStatus',
    validate: okBase,
    summarize: body => ({ status: body.status || body.security_status || '' }),
  },
];

function runStaticChecks(report) {
  function add(area, name, ok, detail) {
    report.static_checks.push({ area, name, ok: Boolean(ok), detail });
  }

  const pages = ['dashboard', 'jobs', 'crm', 'billing', 'reports', 'inventory', 'po', 'warranty', 'vision', 'line-center', 'admin'];
  add('mobile_routes', 'critical-page-mounts',
    pages.every(page => STATIC.index.includes(`id="page-${page}"`)),
    'Mobile shell must keep stable page mounts for protected visual QA.');

  add('mobile_routes', 'last-page-and-back-protection',
    STATIC.app.includes('LAST_PAGE_KEY') &&
      STATIC.app.includes('RESTORABLE_PAGES') &&
      STATIC.app.includes("window.addEventListener('popstate'") &&
      STATIC.app.includes("window.addEventListener('beforeunload'"),
    'Mobile should restore current page and reduce accidental close/back loss.');

  add('mobile_routes', 'quick-action-real-modals',
    STATIC.appHome.includes('data-quick-action') &&
      STATIC.appActions.includes("ensureActionModal('modal-new-job'") &&
      STATIC.appActions.includes("ensureActionModal('modal-add-customer'") &&
      STATIC.appActions.includes("callAPI('openJob'") &&
      STATIC.appActions.includes("callAPI('createCustomer'"),
    'Open Job and Add Customer quick actions must be modal-backed real flows.');

  add('mobile_routes', 'more-menu-typed-routes',
    STATIC.app.includes('renderMoreMenu') &&
      STATIC.app.includes('data-menu-page="${item.page}"') &&
      STATIC.app.includes("data-quick-action=\"${item.id}\"") &&
      STATIC.app.includes('navigateFromMore'),
    'More menu must keep typed route/action attributes.');

  add('pc_routes', 'dashboard-section-loaders',
    ['jobs', 'billing', 'reports', 'analytics', 'performance', 'vision', 'line-center', 'settings']
      .every(section => STATIC.pcCore.includes(`${section}:`) || STATIC.pcCore.includes(`'${section}':`)),
    'PC dashboard core must keep high-value section loaders.');

  add('visual_contract', 'operator-insight-and-pulse',
    STATIC.dashboard.includes('operator-insight-strip') &&
      STATIC.appHome.includes('operator-pulse-card') &&
      STATIC.dashboard.includes('executive-command-center'),
    'PC Operator Insight and Mobile Operator Pulse must stay visible contracts.');

  add('runtime_contract', 'blank-page-diagnostics',
    STATIC.app.includes('ensurePageHasContent(page)') &&
      STATIC.app.includes('page-load-diagnostic') &&
      STATIC.app.includes('page-loading-watchdog'),
    'Mobile route changes must keep loading watchdog and blank-page diagnostics.');

  add('release_contract', 'sprint124-wired',
    STATIC.workflow.includes('scripts/sprint124_protected_visual_menu_qa.js') &&
      STATIC.regression.includes('sprint124_protected_visual_menu_qa.js') &&
      STATIC.staticGuard.includes('SPRINT124_PROTECTED_VISUAL_MENU_QA') &&
      STATIC.blueprint.includes('Phase 124 Protected Visual/Menu QA'),
    'Sprint 124 must be wired into Actions, regression, static guard, and BLUEPRINT.');
}

async function runPagesFreshness(report) {
  const urls = [
    'https://comphone.github.io/comphone-superapp/pwa/version_config.js',
    'https://comphone.github.io/comphone-superapp/pwa/gas_config.js',
  ];
  for (const url of urls) {
    const started = Date.now();
    try {
      const res = await fetchText(`${url}?qa=${Date.now()}`);
      const fresh = url.includes('version_config')
        ? res.text.includes(BUILD_TIMESTAMP) && res.text.includes(CACHE_VERSION)
        : res.text.includes(GAS_URL);
      report.public_checks.push({
        area: 'pages_freshness',
        url,
        ok: res.ok,
        status: res.status,
        elapsed_ms: Date.now() - started,
        fresh,
        detail: fresh ? 'fresh' : 'reachable but not yet on current local build; verify after deploy with pages_deploy_verify.js',
      });
    } catch (err) {
      report.public_checks.push({
        area: 'pages_freshness',
        url,
        ok: false,
        status: 0,
        elapsed_ms: Date.now() - started,
        detail: err.name === 'AbortError' ? `timeout after ${TIMEOUT_MS}ms` : err.message,
      });
    }
  }
}

async function runProtectedChecks(report) {
  if (!TOKEN) {
    report.protected_checks.push({
      surface: 'protected-suite',
      page: '*',
      action: '*',
      ok: true,
      status_label: 'SKIP',
      http_status: 0,
      elapsed_ms: 0,
      detail: 'COMPHONE_AUTH_TOKEN is not set',
      recommendation: 'Set a fresh session token and rerun: node scripts/sprint124_protected_visual_menu_qa.js',
    });
    return;
  }

  for (const step of MENU_STEPS) {
    const started = Date.now();
    try {
      const payload = Object.assign({}, step.payload || {}, { token: TOKEN });
      const result = await request(step.action, payload);
      const ok = result.status === 200 && step.validate(result.body);
      const error = ok ? '' : (result.body && (result.body.error || result.body.message || result.body.status)) || 'unexpected response shape';
      report.protected_checks.push({
        surface: step.surface,
        page: step.page,
        action: step.action,
        ok,
        status_label: ok ? 'OK' : classify(error, result.status),
        http_status: result.status,
        elapsed_ms: Date.now() - started,
        detail: error,
        summary: step.summarize ? step.summarize(result.body) : {},
      });
    } catch (err) {
      report.protected_checks.push({
        surface: step.surface,
        page: step.page,
        action: step.action,
        ok: false,
        status_label: classify(err.message),
        http_status: 0,
        elapsed_ms: Date.now() - started,
        detail: err.name === 'AbortError' ? `timeout after ${TIMEOUT_MS}ms` : err.message,
        summary: {},
      });
    }
  }
}

async function main() {
  const report = {
    generated_at: new Date().toISOString(),
    version: 'sprint124-protected-visual-menu-qa-1.0.0',
    mode: 'read-only',
    token_present: Boolean(TOKEN),
    gas_url: GAS_URL,
    build_timestamp: BUILD_TIMESTAMP,
    cache_version: CACHE_VERSION,
    static_checks: [],
    public_checks: [],
    protected_checks: [],
  };

  runStaticChecks(report);
  await runPagesFreshness(report);
  await runProtectedChecks(report);

  const allChecks = [...report.static_checks, ...report.public_checks, ...report.protected_checks];
  const failures = allChecks.filter(item => !item.ok);

  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(REPORT_JSON, JSON.stringify(report, null, 2) + '\n', 'utf8');
  fs.writeFileSync(REPORT_MD, [
    '# Sprint 124 Protected Visual/Menu QA',
    '',
    `- Generated: ${report.generated_at}`,
    `- Mode: ${report.mode}`,
    `- Token present: ${report.token_present ? 'yes' : 'no'}`,
    `- Build: ${report.build_timestamp}`,
    `- Static checks: ${report.static_checks.filter(item => item.ok).length}/${report.static_checks.length}`,
    `- Public checks: ${report.public_checks.filter(item => item.ok).length}/${report.public_checks.length}`,
    `- Protected checks: ${report.protected_checks.filter(item => item.ok).length}/${report.protected_checks.length}`,
    '',
    '## Results',
    '',
    '| Scope | Surface | Action | Status | Detail |',
    '|---|---|---|---|---|',
    ...allChecks.map(item => `| ${item.area || item.page || 'protected'} | ${item.surface || item.name || item.url || '-'} | ${item.action || '-'} | ${item.ok ? 'OK' : 'FAIL'} | ${(item.detail || item.recommendation || '').replace(/\|/g, '/')} |`),
    '',
  ].join('\n'), 'utf8');

  console.log('[Sprint 124 Protected Visual/Menu QA]');
  console.log(`- static: ${report.static_checks.filter(item => item.ok).length}/${report.static_checks.length}`);
  console.log(`- public: ${report.public_checks.filter(item => item.ok).length}/${report.public_checks.length}`);
  console.log(`- protected: ${report.protected_checks.filter(item => item.ok).length}/${report.protected_checks.length}${TOKEN ? '' : ' (skip-safe)'}`);
  console.log(`[Sprint 124 Protected Visual/Menu QA] report: ${path.relative(ROOT, REPORT_JSON).replace(/\\/g, '/')}`);

  if (failures.length) {
    console.error('[Sprint 124 Protected Visual/Menu QA] FAIL');
    for (const failure of failures) {
      console.error(`- ${failure.surface || failure.name || failure.url || failure.page}: ${failure.status_label || 'FAIL'} ${failure.detail || ''}`);
    }
    process.exit(1);
  }
  console.log('[Sprint 124 Protected Visual/Menu QA] OK');
}

main().catch(err => {
  console.error('[Sprint 124 Protected Visual/Menu QA] ERROR', err);
  process.exit(1);
});
