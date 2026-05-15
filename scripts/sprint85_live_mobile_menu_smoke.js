#!/usr/bin/env node
/*
 * Sprint 85 live mobile menu smoke.
 *
 * Read-only production smoke for the mobile menu set. Public checks always run.
 * Protected checks run only when COMPHONE_AUTH_TOKEN is set, so CI can execute
 * safely without storing a session token.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REPORT_DIR = path.join(ROOT, 'test_reports');
const REPORT_JSON = path.join(REPORT_DIR, 'sprint85_live_mobile_menu_smoke_latest.json');
const REPORT_MD = path.join(REPORT_DIR, 'sprint85_live_mobile_menu_smoke_latest.md');
const gasConfig = fs.readFileSync(path.join(ROOT, 'pwa', 'gas_config.js'), 'utf8');
const urlMatch = gasConfig.match(/url:\s*'([^']+)'/);
const GAS_URL = process.env.COMPHONE_GAS_URL || (urlMatch && urlMatch[1]);
const TOKEN = process.env.COMPHONE_AUTH_TOKEN || '';
const TIMEOUT_MS = Number(process.env.COMPHONE_LIVE_SMOKE_TIMEOUT_MS || 30000);

if (!GAS_URL) {
  console.error('[Sprint 85 Live Mobile Menu Smoke] Missing GAS URL.');
  process.exit(1);
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

function normalizeArray(body, keys) {
  for (const key of keys) {
    const value = key.split('.').reduce((obj, part) => obj && obj[part], body);
    if (Array.isArray(value)) return value;
  }
  return [];
}

function hasObject(body, keys) {
  return keys.some(key => {
    const value = key.split('.').reduce((obj, part) => obj && obj[part], body);
    return value && typeof value === 'object';
  });
}

function sanitizePayload(payload) {
  const copy = Object.assign({}, payload || {});
  Object.keys(copy).forEach(key => {
    if (copy[key] === '__SMOKE_EMPTY__') copy[key] = '';
    if (copy[key] && typeof copy[key] === 'object') copy[key] = JSON.stringify(copy[key]);
  });
  return copy;
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

function okBase(body) {
  return body && body.success !== false && body.status !== 'error';
}

const PUBLIC_STEPS = [
  {
    menu: 'system',
    action: 'health',
    validate: body => okBase(body) && (!body.status || ['healthy', 'ok'].includes(String(body.status).toLowerCase())),
    summarize: body => ({ status: body.status || '', version: body.version || '' }),
  },
  {
    menu: 'system',
    action: 'getVersion',
    validate: okBase,
    summarize: body => ({ version: body.version || body.backend_version || '' }),
  },
];

const PROTECTED_STEPS = [
  {
    menu: 'dashboard',
    action: 'getDashboardData',
    validate: body => okBase(body) && (hasObject(body, ['summary', 'data.summary']) || Array.isArray(body.jobs) || Array.isArray(body.data && body.data.jobs)),
    summarize: body => ({ hasSummary: hasObject(body, ['summary', 'data.summary']), jobs: normalizeArray(body, ['jobs', 'data.jobs']).length }),
  },
  {
    menu: 'jobs',
    action: 'checkJobs',
    payload: { limit: 10 },
    validate: body => okBase(body) && (normalizeArray(body, ['jobs', 'items', 'data.jobs', 'data.items']).length >= 0),
    summarize: body => ({ count: normalizeArray(body, ['jobs', 'items', 'data.jobs', 'data.items']).length }),
  },
  {
    menu: 'crm',
    action: 'listCustomers',
    validate: body => okBase(body) && (normalizeArray(body, ['customers', 'items', 'data.customers', 'data']).length >= 0),
    summarize: body => ({ count: normalizeArray(body, ['customers', 'items', 'data.customers', 'data']).length }),
  },
  {
    menu: 'inventory',
    action: 'inventoryOverview',
    validate: body => okBase(body) && (hasObject(body, ['overview', 'summary', 'data.overview']) || normalizeArray(body, ['items', 'data.items', 'data']).length >= 0),
    summarize: body => ({ items: normalizeArray(body, ['items', 'data.items', 'data']).length, hasOverview: hasObject(body, ['overview', 'summary', 'data.overview']) }),
  },
  {
    menu: 'po',
    action: 'listPurchaseOrders',
    payload: { limit: 10 },
    validate: body => okBase(body) && (normalizeArray(body, ['items', 'purchaseOrders', 'orders', 'data.items', 'data']).length >= 0),
    summarize: body => ({ count: normalizeArray(body, ['items', 'purchaseOrders', 'orders', 'data.items', 'data']).length }),
  },
  {
    menu: 'billing',
    action: 'listBillings',
    payload: { limit: 10 },
    validate: body => okBase(body) && (normalizeArray(body, ['items', 'billings', 'data.items', 'data']).length >= 0),
    summarize: body => ({ count: normalizeArray(body, ['items', 'billings', 'data.items', 'data']).length }),
  },
  {
    menu: 'reports',
    action: 'getReportData',
    payload: { period: 'month' },
    validate: body => okBase(body) && (hasObject(body, ['data', 'summary']) || normalizeArray(body, ['records', 'data.records', 'data.dailyRevenue']).length >= 0),
    summarize: body => ({ hasData: hasObject(body, ['data', 'summary']), records: normalizeArray(body, ['records', 'data.records', 'data.dailyRevenue']).length }),
  },
  {
    menu: 'warranty',
    action: 'listWarranties',
    payload: { limit: 10 },
    validate: body => okBase(body) && (normalizeArray(body, ['warranties', 'items', 'data.warranties', 'data.items', 'data']).length >= 0),
    summarize: body => ({ count: normalizeArray(body, ['warranties', 'items', 'data.warranties', 'data.items', 'data']).length }),
  },
  {
    menu: 'vision',
    action: 'getVisionDashboardStats',
    payload: { days: 7 },
    validate: body => okBase(body) && hasObject(body, ['stats', 'data.stats']),
    summarize: body => ({ hasStats: hasObject(body, ['stats', 'data.stats']) }),
  },
  {
    menu: 'line-center',
    action: 'getLineRoomStatus',
    validate: body => okBase(body) && (hasObject(body, ['rooms', 'data.rooms']) || normalizeArray(body, ['rooms', 'data.rooms']).length >= 0),
    summarize: body => ({ rooms: normalizeArray(body, ['rooms', 'data.rooms']).length, hasRoomsObject: hasObject(body, ['rooms', 'data.rooms']) }),
  },
  {
    menu: 'admin',
    action: 'getSecurityStatus',
    validate: okBase,
    summarize: body => ({ status: body.status || body.security_status || '' }),
  },
];

async function runStep(scope, step, report) {
  const started = Date.now();
  try {
    const payload = Object.assign({}, step.payload || {});
    if (scope === 'protected') payload.token = TOKEN;
    const result = await request(step.action, payload);
    const ok = result.status === 200 && step.validate(result.body);
    const error = ok ? '' : (result.body && (result.body.error || result.body.message || result.body.status)) || 'unexpected response shape';
    const row = {
      scope,
      menu: step.menu,
      action: step.action,
      ok,
      status_label: ok ? 'OK' : classify(error, result.status),
      http_status: result.status,
      elapsed_ms: Date.now() - started,
      error,
      summary: step.summarize ? step.summarize(result.body) : {},
    };
    report.results.push(row);
    console.log(`[${scope.padEnd(9)}] ${step.menu.padEnd(12)} ${step.action}: ${row.status_label} ${row.http_status} ${row.elapsed_ms}ms${error ? ' - ' + error : ''}`);
    return row;
  } catch (err) {
    const row = {
      scope,
      menu: step.menu,
      action: step.action,
      ok: false,
      status_label: classify(err.message),
      http_status: 0,
      elapsed_ms: Date.now() - started,
      error: err.name === 'AbortError' ? `timeout after ${TIMEOUT_MS}ms` : err.message,
      summary: {},
    };
    report.results.push(row);
    console.log(`[${scope.padEnd(9)}] ${step.menu.padEnd(12)} ${step.action}: ${row.status_label} 0 ${row.elapsed_ms}ms - ${row.error}`);
    return row;
  }
}

async function run() {
  const report = {
    generated_at: new Date().toISOString(),
    version: 'sprint85-live-mobile-menu-smoke-1.0.0',
    gas_url: GAS_URL,
    token_present: !!TOKEN,
    mode: 'read-only',
    results: [],
  };
  const failures = [];

  for (const step of PUBLIC_STEPS) {
    const row = await runStep('public', step, report);
    if (!row.ok) failures.push(`${step.action}: ${row.status_label} ${row.error}`);
  }

  if (!TOKEN) {
    const row = {
      scope: 'protected',
      menu: 'mobile-menus',
      action: 'protected-read-suite',
      ok: true,
      status_label: 'SKIP',
      http_status: 0,
      elapsed_ms: 0,
      error: 'COMPHONE_AUTH_TOKEN is not set',
      summary: { protected_steps: PROTECTED_STEPS.length },
    };
    report.results.push(row);
    console.log(`[protected] mobile-menus protected-read-suite: SKIP 0 0ms - ${row.error}`);
  } else {
    for (const step of PROTECTED_STEPS) {
      const row = await runStep('protected', step, report);
      if (!row.ok) failures.push(`${step.menu}/${step.action}: ${row.status_label} ${row.error}`);
    }
  }

  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(REPORT_JSON, JSON.stringify(report, null, 2) + '\n', 'utf8');
  fs.writeFileSync(REPORT_MD, [
    '# Sprint 85 Live Mobile Menu Smoke',
    '',
    `- Generated: ${report.generated_at}`,
    `- Token present: ${report.token_present ? 'yes' : 'no'}`,
    `- Mode: ${report.mode}`,
    '',
    '## Results',
    ...report.results.map(item => `- ${item.ok ? 'OK' : 'FAIL'} [${item.scope}] ${item.menu}/${item.action}: ${item.status_label}${item.error ? ` - ${item.error}` : ''}`),
    '',
  ].join('\n'));

  console.log(`[Sprint 85 Live Mobile Menu Smoke] report: ${path.relative(ROOT, REPORT_JSON).replace(/\\/g, '/')}`);

  if (failures.length) {
    console.error('[Sprint 85 Live Mobile Menu Smoke] FAILED');
    failures.forEach(item => console.error(`- ${item}`));
    process.exit(1);
  }

  console.log('[Sprint 85 Live Mobile Menu Smoke] OK');
}

run().catch(err => {
  console.error('[Sprint 85 Live Mobile Menu Smoke] FAILED');
  console.error(err);
  process.exit(1);
});
