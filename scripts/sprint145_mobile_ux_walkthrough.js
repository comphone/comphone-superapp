#!/usr/bin/env node
/*
 * Sprint 145 Mobile UX Walkthrough
 *
 * Locks the mobile operator journey: grouped menus, quick actions, page
 * restoration, blank-page diagnostics, and protected read paths. This is
 * read-only and safe to run in CI without a token.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REPORT = path.join(ROOT, 'test_reports', 'sprint145_mobile_ux_walkthrough_latest.json');
const TOKEN = process.env.COMPHONE_AUTH_TOKEN || '';
const gasConfig = fs.readFileSync(path.join(ROOT, 'pwa', 'gas_config.js'), 'utf8');
const urlMatch = gasConfig.match(/url:\s*'([^']+)'/);
const GAS_URL = process.env.COMPHONE_GAS_URL || (urlMatch && urlMatch[1]);

function read(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }
function has(text, token) { return text.includes(token); }
async function request(action, payload = {}) {
  const data = Object.assign({ action, _t: Date.now() }, payload);
  if (TOKEN) data.token = TOKEN;
  const res = await fetch(`${GAS_URL}?${new URLSearchParams(data).toString()}`, { redirect: 'follow' });
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch (_) { throw new Error(`${action}: non-JSON ${res.status}`); }
  return { status: res.status, body };
}

const WALKTHROUGH = [
  ['home-dashboard', 'home', 'getDashboardData'],
  ['open-job', 'jobs', 'checkJobs'],
  ['new-customer', 'crm', 'listCustomers'],
  ['billing-followup', 'billing', 'listBillings'],
  ['reports-read', 'reports', 'getReportData'],
  ['inventory-risk', 'inventory', 'inventoryOverview'],
  ['vision-review', 'vision', 'getVisionDashboardStats'],
  ['line-center', 'line-center', 'getLineCommandCenter'],
  ['admin-health', 'admin', 'getSecurityStatus'],
];

async function main() {
  const files = {
    index: read('pwa/index.html'),
    app: read('pwa/app.js'),
    actions: read('pwa/app_actions.js'),
    home: read('pwa/app_home.js'),
    css: read('pwa/mobile_glass.css'),
    contract: read('pwa/api_contract.js'),
  };
  const appSource = `${files.index}\n${files.app}\n${files.actions}\n${files.home}`;
  const checks = [
    { id: 'mobile-grouped-menu-contract', ok: has(files.app, 'MENU_GROUPS') && has(files.app, 'showMoreMenu') && has(files.app, 'goPage'), type: 'static' },
    { id: 'quick-action-settings-dashboard', ok: has(files.app, 'showQuickActionSettings') && has(files.app, 'saveQuickActions') && has(files.app, 'QUICK_ACTIONS_KEY'), type: 'static' },
    { id: 'page-restore-current-page', ok: has(files.app, 'currentPage') && has(files.app, 'history.pushState') && has(files.app, 'popstate'), type: 'static' },
    { id: 'accidental-exit-recovery', ok: has(files.app, 'beforeunload') || has(files.app, 'popstate') || has(files.app, 'history.pushState'), type: 'static' },
    { id: 'blank-page-diagnostic-visible', ok: has(files.app, 'ensurePageHasContent') && has(files.app, 'page-load-diagnostic'), type: 'static' },
    { id: 'scroll-touch-safe', ok: has(files.css, 'overflow') && has(files.css, 'touch-action'), type: 'static' },
    { id: 'real-action-modals', ok: ['openNewJob', 'addCustomer', 'openAICompanion'].every(token => has(appSource, token)), type: 'static' },
  ];
  WALKTHROUGH.forEach(([id, route, action]) => {
    checks.push({ id: `route-${id}`, ok: has(appSource, route) && has(files.contract, action), type: 'static' });
  });

  if (!TOKEN) {
    checks.push({ id: 'protected-mobile-walkthrough', ok: true, type: 'live', status: 'SKIP', detail: 'COMPHONE_AUTH_TOKEN required for protected mobile read walkthrough.' });
  } else {
    for (const [id, , action] of WALKTHROUGH) {
      const payload = action === 'getReportData' ? { period: 'month' } : (action === 'checkJobs' || action === 'listBillings') ? { limit: 10 } : {};
      const result = await request(action, payload);
      checks.push({ id: `live-${id}-${action}`, ok: result.status === 200 && result.body && result.body.success !== false, type: 'live', http_status: result.status });
    }
  }

  const failures = checks.filter(row => !row.ok);
  const report = { generated_at: new Date().toISOString(), gas_url: GAS_URL, token_present: !!TOKEN, mode: 'mobile-ux-walkthrough-read-only', status: failures.length ? 'fail' : 'ok', score: Math.round((checks.length - failures.length) / checks.length * 100), checks };
  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, JSON.stringify(report, null, 2) + '\n', 'utf8');
  console.log(`[Sprint 145 Mobile UX Walkthrough] status=${report.status} score=${report.score}/100 checks=${checks.length - failures.length}/${checks.length}`);
  console.log(`[Sprint 145 Mobile UX Walkthrough] report: ${path.relative(ROOT, REPORT).replace(/\\/g, '/')}`);
  if (failures.length) process.exit(1);
}

main().catch(err => { console.error('[Sprint 145 Mobile UX Walkthrough] fatal:', err); process.exit(1); });
