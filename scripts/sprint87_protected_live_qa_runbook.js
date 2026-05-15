#!/usr/bin/env node
/*
 * Sprint 87 protected live QA runbook.
 *
 * Operator-safe protected read suite for the high-value PC/mobile menu chain.
 * CI can run this without secrets: when COMPHONE_AUTH_TOKEN is absent it writes
 * a skipped runbook report and exits successfully. With a token, it performs
 * read-only checks and highlights failed/slow menu contracts.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REPORT_DIR = path.join(ROOT, 'test_reports');
const REPORT_JSON = path.join(REPORT_DIR, 'sprint87_protected_live_qa_runbook_latest.json');
const REPORT_MD = path.join(REPORT_DIR, 'sprint87_protected_live_qa_runbook_latest.md');
const gasConfig = fs.readFileSync(path.join(ROOT, 'pwa', 'gas_config.js'), 'utf8');
const urlMatch = gasConfig.match(/url:\s*'([^']+)'/);
const GAS_URL = process.env.COMPHONE_GAS_URL || (urlMatch && urlMatch[1]);
const TOKEN = process.env.COMPHONE_AUTH_TOKEN || '';
const TIMEOUT_MS = Number(process.env.COMPHONE_LIVE_QA_TIMEOUT_MS || 30000);
const SLOW_MS = Number(process.env.COMPHONE_LIVE_QA_SLOW_MS || 12000);
const FAIL_ON_SLOW = /^(1|true|yes)$/i.test(process.env.COMPHONE_LIVE_QA_FAIL_ON_SLOW || '');

if (!GAS_URL) {
  console.error('[Sprint 87 Protected Live QA] Missing GAS URL.');
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
    return value && typeof value === 'object' && !Array.isArray(value);
  });
}

function okBase(body) {
  return body && body.success !== false && body.status !== 'error';
}

function sanitizePayload(payload) {
  const copy = Object.assign({}, payload || {});
  Object.keys(copy).forEach(key => {
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

const PUBLIC_STEPS = [
  {
    scope: 'public',
    menu: 'system',
    action: 'health',
    validate: body => okBase(body) && (!body.status || ['healthy', 'ok'].includes(String(body.status).toLowerCase())),
    summarize: body => ({ status: body.status || '', version: body.version || '' }),
    recommendation: 'If this fails, confirm GAS deployment URL and Apps Script availability first.',
  },
  {
    scope: 'public',
    menu: 'system',
    action: 'getVersion',
    validate: okBase,
    summarize: body => ({ version: body.version || body.backend_version || '' }),
    recommendation: 'If version fails, check Router public action mapping and deployment freshness.',
  },
];

const PROTECTED_STEPS = [
  {
    menu: 'dashboard',
    action: 'getDashboardData',
    validate: body => okBase(body) && (hasObject(body, ['summary', 'data.summary']) || normalizeArray(body, ['jobs', 'data.jobs']).length >= 0),
    summarize: body => ({ hasSummary: hasObject(body, ['summary', 'data.summary']), jobs: normalizeArray(body, ['jobs', 'data.jobs']).length }),
    recommendation: 'Check dashboard loader contract before PC/mobile home QA.',
  },
  {
    menu: 'jobs',
    action: 'checkJobs',
    payload: { limit: 10 },
    validate: body => okBase(body) && normalizeArray(body, ['jobs', 'items', 'data.jobs', 'data.items']).length >= 0,
    summarize: body => ({ count: normalizeArray(body, ['jobs', 'items', 'data.jobs', 'data.items']).length }),
    recommendation: 'Check JobsHandler routes and mobile Jobs menu if this fails.',
  },
  {
    menu: 'crm',
    action: 'listCustomers',
    validate: body => okBase(body) && normalizeArray(body, ['customers', 'items', 'data.customers', 'data']).length >= 0,
    summarize: body => ({ count: normalizeArray(body, ['customers', 'items', 'data.customers', 'data']).length }),
    recommendation: 'Check CRM/customer field normalization and auth gate.',
  },
  {
    menu: 'inventory',
    action: 'inventoryOverview',
    validate: body => okBase(body) && (hasObject(body, ['overview', 'summary', 'data.overview']) || normalizeArray(body, ['items', 'data.items', 'data']).length >= 0),
    summarize: body => ({ hasOverview: hasObject(body, ['overview', 'summary', 'data.overview']), items: normalizeArray(body, ['items', 'data.items', 'data']).length }),
    recommendation: 'Check Inventory routes and overview response shape.',
  },
  {
    menu: 'po',
    action: 'listPurchaseOrders',
    payload: { limit: 10 },
    validate: body => okBase(body) && normalizeArray(body, ['items', 'purchaseOrders', 'orders', 'data.items', 'data']).length >= 0,
    summarize: body => ({ count: normalizeArray(body, ['items', 'purchaseOrders', 'orders', 'data.items', 'data']).length }),
    recommendation: 'Check PO route alias and purchase order sheet headers.',
  },
  {
    menu: 'billing',
    action: 'listBillings',
    payload: { limit: 10 },
    validate: body => okBase(body) && normalizeArray(body, ['items', 'billings', 'data.items', 'data']).length >= 0,
    summarize: body => ({ count: normalizeArray(body, ['items', 'billings', 'data.items', 'data']).length }),
    recommendation: 'Check BillingManager route and billing list response normalization.',
  },
  {
    menu: 'reports',
    action: 'getReportData',
    payload: { period: 'month' },
    validate: body => okBase(body) && (hasObject(body, ['data', 'summary']) || normalizeArray(body, ['records', 'data.records', 'data.dailyRevenue']).length >= 0),
    summarize: body => ({ hasData: hasObject(body, ['data', 'summary']), records: normalizeArray(body, ['records', 'data.records', 'data.dailyRevenue']).length }),
    recommendation: 'Check Reports renderer/API bridge before operator report QA.',
  },
  {
    menu: 'warranty',
    action: 'listWarranties',
    payload: { limit: 10 },
    validate: body => okBase(body) && normalizeArray(body, ['warranties', 'items', 'data.warranties', 'data.items', 'data']).length >= 0,
    summarize: body => ({ count: normalizeArray(body, ['warranties', 'items', 'data.warranties', 'data.items', 'data']).length }),
    recommendation: 'Check warranty loader alias and warranty route handler.',
  },
  {
    menu: 'vision',
    action: 'getVisionDashboardStats',
    payload: { days: 7 },
    validate: body => okBase(body) && hasObject(body, ['stats', 'data.stats']),
    summarize: body => ({ hasStats: hasObject(body, ['stats', 'data.stats']) }),
    recommendation: 'Check Gemini property and Vision dashboard read endpoint.',
  },
  {
    menu: 'line-center',
    action: 'getLineRoomStatus',
    validate: body => okBase(body) && (hasObject(body, ['rooms', 'data.rooms']) || normalizeArray(body, ['rooms', 'data.rooms']).length >= 0),
    summarize: body => ({ rooms: normalizeArray(body, ['rooms', 'data.rooms']).length, hasRoomsObject: hasObject(body, ['rooms', 'data.rooms']) }),
    recommendation: 'Check LINE room config and status route; do not expose room secrets in reports.',
  },
  {
    menu: 'admin',
    action: 'getSecurityStatus',
    validate: okBase,
    summarize: body => ({ status: body.status || body.security_status || '' }),
    recommendation: 'Check admin role/session if this is AUTH_FAIL or PERMISSION.',
  },
].map(step => Object.assign({ scope: 'protected' }, step));

function operatorCommands() {
  return {
    powershell: [
      "$env:COMPHONE_AUTH_TOKEN='PASTE_SESSION_TOKEN_HERE'",
      'node scripts\\sprint87_protected_live_qa_runbook.js',
      'Remove-Item Env:\\COMPHONE_AUTH_TOKEN',
    ],
    browser_console_token_expression: "JSON.parse(localStorage.getItem('comphone_auth_session') || '{}').token",
    note: 'Use a freshly logged-in admin session token. Never paste a real token into Git, BLUEPRINT, screenshots, or chat.',
  };
}

async function runStep(step) {
  const started = Date.now();
  try {
    const payload = Object.assign({}, step.payload || {});
    if (step.scope === 'protected') payload.token = TOKEN;
    const result = await request(step.action, payload);
    const elapsed = Date.now() - started;
    const ok = result.status === 200 && step.validate(result.body);
    const error = ok ? '' : (result.body && (result.body.error || result.body.message || result.body.status)) || 'unexpected response shape';
    const slow = ok && elapsed >= SLOW_MS;
    return {
      scope: step.scope,
      menu: step.menu,
      action: step.action,
      ok,
      slow,
      status_label: ok ? (slow ? 'SLOW' : 'OK') : classify(error, result.status),
      http_status: result.status,
      elapsed_ms: elapsed,
      error,
      summary: step.summarize ? step.summarize(result.body) : {},
      recommendation: ok ? '' : step.recommendation,
    };
  } catch (err) {
    return {
      scope: step.scope,
      menu: step.menu,
      action: step.action,
      ok: false,
      slow: false,
      status_label: classify(err.message),
      http_status: 0,
      elapsed_ms: Date.now() - started,
      error: err.name === 'AbortError' ? `timeout after ${TIMEOUT_MS}ms` : err.message,
      summary: {},
      recommendation: step.recommendation,
    };
  }
}

function writeReports(report) {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(REPORT_JSON, JSON.stringify(report, null, 2) + '\n', 'utf8');

  const lines = [
    '# Sprint 87 Protected Live QA Runbook',
    '',
    `- Generated: ${report.generated_at}`,
    `- Status: ${report.status}`,
    `- Token present: ${report.token_present ? 'yes' : 'no'}`,
    `- Slow threshold: ${report.slow_threshold_ms}ms`,
    `- Summary: ${report.summary.pass} pass, ${report.summary.slow} slow, ${report.summary.fail} fail, ${report.summary.skipped} skipped`,
    '',
    '## Operator Commands',
    '',
    '```powershell',
    ...report.operator_commands.powershell,
    '```',
    '',
    `Browser token expression: \`${report.operator_commands.browser_console_token_expression}\``,
    '',
    '## Results',
    '',
    '| Scope | Menu | Action | Status | HTTP | Time | Recommendation |',
    '|---|---|---|---|---:|---:|---|',
    ...report.results.map(row => `| ${row.scope} | ${row.menu} | ${row.action} | ${row.status_label} | ${row.http_status} | ${row.elapsed_ms}ms | ${row.recommendation || ''} |`),
    '',
  ];
  fs.writeFileSync(REPORT_MD, lines.join('\n'), 'utf8');
}

async function main() {
  const report = {
    generated_at: new Date().toISOString(),
    version: 'sprint87-protected-live-qa-runbook-1.0.0',
    gas_url: GAS_URL,
    token_present: !!TOKEN,
    timeout_ms: TIMEOUT_MS,
    slow_threshold_ms: SLOW_MS,
    fail_on_slow: FAIL_ON_SLOW,
    status: 'pending',
    mode: 'read-only',
    operator_commands: operatorCommands(),
    summary: { pass: 0, slow: 0, fail: 0, skipped: 0 },
    results: [],
  };

  if (!TOKEN) {
    report.status = 'skipped';
    report.summary.skipped = PROTECTED_STEPS.length;
    report.results.push({
      scope: 'protected',
      menu: 'protected-live-suite',
      action: 'operator-token-required',
      ok: true,
      slow: false,
      status_label: 'SKIP',
      http_status: 0,
      elapsed_ms: 0,
      error: 'COMPHONE_AUTH_TOKEN is not set',
      summary: { protected_steps: PROTECTED_STEPS.length },
      recommendation: 'Set COMPHONE_AUTH_TOKEN from a fresh login session, then rerun this script.',
    });
    writeReports(report);
    console.log('[Sprint 87 Protected Live QA] SKIP - set COMPHONE_AUTH_TOKEN to run protected read-only menu checks.');
    console.log(`[Sprint 87 Protected Live QA] report: ${path.relative(ROOT, REPORT_JSON)}`);
    return;
  }

  for (const step of PUBLIC_STEPS.concat(PROTECTED_STEPS)) {
    const row = await runStep(step);
    report.results.push(row);
    if (!row.ok) report.summary.fail += 1;
    if (row.ok && row.slow) report.summary.slow += 1;
    if (row.ok && !row.slow) report.summary.pass += 1;
    console.log(`[${row.scope.padEnd(9)}] ${row.menu.padEnd(12)} ${row.action}: ${row.status_label} ${row.http_status} ${row.elapsed_ms}ms${row.error ? ' - ' + row.error : ''}`);
  }

  if (report.summary.fail > 0) {
    report.status = 'fail';
  } else if (report.summary.slow > 0) {
    report.status = 'warning';
  } else {
    report.status = 'ok';
  }

  writeReports(report);
  console.log(`[Sprint 87 Protected Live QA] report: ${path.relative(ROOT, REPORT_JSON)}`);
  if (report.summary.fail > 0 || (FAIL_ON_SLOW && report.summary.slow > 0)) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('[Sprint 87 Protected Live QA] FAILED:', err.message);
  process.exit(1);
});
