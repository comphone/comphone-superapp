#!/usr/bin/env node
/*
 * Sprint 156 Mobile Menu E2E Guard
 *
 * Static + optional protected read guard for the mobile menu surfaces users
 * rely on most. It blocks empty menu regressions and verifies page restore.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REPORT = path.join(ROOT, 'test_reports', 'sprint156_mobile_menu_e2e_guard_latest.json');
const TOKEN = process.env.COMPHONE_AUTH_TOKEN || '';
const gasConfig = fs.readFileSync(path.join(ROOT, 'pwa', 'gas_config.js'), 'utf8');
const GAS_URL = process.env.COMPHONE_GAS_URL || (gasConfig.match(/url:\s*'([^']+)'/) || [])[1];

function read(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }
function has(text, token) { return text.includes(token); }
async function request(action, payload = {}) {
  const data = Object.assign({ action, _t: Date.now() }, payload);
  if (TOKEN) data.token = TOKEN;
  Object.keys(data).forEach(key => { if (data[key] && typeof data[key] === 'object') data[key] = JSON.stringify(data[key]); });
  const res = await fetch(`${GAS_URL}?${new URLSearchParams(data).toString()}`, { redirect: 'follow' });
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch (_) { throw new Error(`${action}: non-JSON ${res.status}`); }
  return { status: res.status, body };
}

const LIVE_READS = [
  ['dashboard', 'getDashboardData', {}],
  ['jobs', 'checkJobs', { limit: 10 }],
  ['new-customer', 'listCustomers', { limit: 10 }],
  ['billing', 'listBillings', { limit: 10 }],
  ['reports', 'getReportData', { period: 'month' }],
  ['inventory', 'inventoryOverview', {}],
  ['vision', 'getVisionDashboardStats', { days: 7 }],
  ['line-center', 'getLineCommandCenter', { days: 7 }],
  ['settings', 'getSecurityStatus', {}],
];

async function main() {
  const files = {
    index: read('pwa/index.html'),
    app: read('pwa/app.js'),
    home: read('pwa/app_home.js'),
    css: read('pwa/mobile_shared.css') + '\n' + read('pwa/mobile_glass.css'),
    contract: read('pwa/api_contract.js'),
  };
  const source = Object.values(files).join('\n');
  const checks = [
    { id: 'central-api-client-loaded', ok: has(files.index, 'api_client.js'), type: 'static' },
    { id: 'last-page-restore-enabled', ok: has(files.app, 'LAST_PAGE_KEY') && has(files.app, 'comphone_last_mobile_page') && has(files.app, 'goPage(savedPage'), type: 'navigation' },
    { id: 'back-button-protected-page-guard', ok: has(files.app, 'popstate') && has(files.app, 'hasOfflineQueue') && has(files.app, 'protectedPage'), type: 'navigation' },
    { id: 'more-menu-grouped-and-clickable', ok: has(files.app, 'renderMoreMenu') && has(files.app, 'MENU_GROUPS') && has(files.app, 'navigateFromMore'), type: 'menu' },
    { id: 'more-menu-scrollable', ok: has(files.css, 'more-menu-grid') && has(files.css, 'overflow'), type: 'menu' },
    { id: 'page-loading-watchdog', ok: has(files.app, 'page-load-diagnostic') && has(files.app, 'markPageReady'), type: 'reliability' },
    { id: 'mobile-decision-layer', ok: has(files.home, 'renderMobileDecisionLayer') && has(files.css, 'mobile-decision-layer'), type: 'dashboard' },
    { id: 'quick-action-settings', ok: has(files.app, 'showQuickActionSettings') && has(files.app, 'QUICK_ACTIONS_KEY'), type: 'settings' },
    { id: 'required-mobile-pages-present', ok: ['page-dashboard', 'page-jobs', 'page-billing', 'page-reports', 'page-vision', 'page-line-center', 'page-profile'].every(id => has(source, id)), type: 'menu' },
    { id: 'api-contract-core-menus', ok: ['dashboard', 'crm', 'billing', 'reports', 'vision', 'line-center'].every(id => has(files.contract, `id: '${id}'`)), type: 'contract' },
  ];
  if (!TOKEN) {
    checks.push({ id: 'protected-mobile-menu-live-reads', ok: true, type: 'live', status: 'SKIP', detail: 'COMPHONE_AUTH_TOKEN required for live menu reads.' });
  } else {
    for (const [page, action, payload] of LIVE_READS) {
      const result = await request(action, payload);
      checks.push({ id: `live-mobile-${page}-${action}`, ok: result.status === 200 && result.body && result.body.success !== false, type: 'live', http_status: result.status });
    }
  }
  const failures = checks.filter(row => !row.ok);
  const report = { generated_at: new Date().toISOString(), mode: 'mobile-menu-e2e-guard', token_present: !!TOKEN, status: failures.length ? 'fail' : 'ok', score: Math.round((checks.length - failures.length) / checks.length * 100), checks };
  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, JSON.stringify(report, null, 2) + '\n', 'utf8');
  console.log(`[Sprint 156 Mobile Menu E2E] status=${report.status} score=${report.score}/100 checks=${checks.length - failures.length}/${checks.length}`);
  console.log(`[Sprint 156 Mobile Menu E2E] report: ${path.relative(ROOT, REPORT).replace(/\\/g, '/')}`);
  if (failures.length) process.exit(1);
}

main().catch(err => {
  console.error('[Sprint 156 Mobile Menu E2E] fatal:', err);
  process.exit(1);
});
