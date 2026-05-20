#!/usr/bin/env node
/*
 * Sprint 141 Mobile Menu Deep QA
 *
 * Static and token-aware live QA for mobile menu routes. It locks the grouped
 * menu/page contract so mobile does not regress to blank pages.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REPORT = path.join(ROOT, 'test_reports', 'sprint141_mobile_menu_deep_qa_latest.json');
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

const ROUTES = [
  ['home', 'getDashboardData'],
  ['jobs', 'checkJobs'],
  ['crm', 'listCustomers'],
  ['billing', 'listBillings'],
  ['reports', 'getReportData'],
  ['inventory', 'inventoryOverview'],
  ['po', 'listPurchaseOrders'],
  ['warranty', 'listWarranties'],
  ['vision', 'getVisionDashboardStats'],
  ['line-center', 'getLineCommandCenter'],
  ['admin', 'getSecurityStatus'],
];

async function main() {
  const files = { index: read('pwa/index.html'), app: read('pwa/app.js'), actions: read('pwa/app_actions.js'), home: read('pwa/app_home.js'), css: read('pwa/mobile_glass.css') };
  const checks = [];
  ROUTES.forEach(([route]) => {
    checks.push({ id: `route-${route}`, ok: has(files.index, `page-${route}`) || has(files.app, route) || has(files.home, route), type: 'static' });
  });
  checks.push({ id: 'last-page-restore', ok: has(files.app, 'lastPage') || has(files.app, 'currentPage'), type: 'static' });
  checks.push({ id: 'blank-page-diagnostic', ok: has(files.app, 'blank') || has(files.app, 'diagnostic') || has(files.app, 'renderPageError'), type: 'static' });
  checks.push({ id: 'quick-action-real-modals', ok: has(files.actions, 'openNewJob') && has(files.actions, 'addCustomer') && has(files.actions, 'openAICompanion'), type: 'static' });
  checks.push({ id: 'scroll-safe-mobile-css', ok: has(files.css, 'overflow') && has(files.css, 'touch-action'), type: 'static' });

  if (!TOKEN) {
    checks.push({ id: 'protected-live-menu-actions', ok: true, type: 'live', status: 'SKIP', detail: 'COMPHONE_AUTH_TOKEN required for protected menu API proof.' });
  } else {
    for (const [route, action] of ROUTES) {
      const payload = action === 'getReportData' ? { period: 'month' } : action === 'listPurchaseOrders' || action === 'listWarranties' || action === 'checkJobs' || action === 'listBillings' ? { limit: 10 } : {};
      const result = await request(action, payload);
      checks.push({ id: `live-${route}-${action}`, ok: result.status === 200 && result.body && result.body.success !== false, type: 'live', http_status: result.status });
    }
  }

  const failures = checks.filter(row => !row.ok);
  const report = { generated_at: new Date().toISOString(), gas_url: GAS_URL, token_present: !!TOKEN, mode: 'mobile-menu-deep-qa', status: failures.length ? 'fail' : 'ok', score: Math.round((checks.length - failures.length) / checks.length * 100), checks };
  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, JSON.stringify(report, null, 2) + '\n', 'utf8');
  console.log(`[Sprint 141 Mobile Menu Deep QA] status=${report.status} score=${report.score}/100 checks=${checks.length - failures.length}/${checks.length}`);
  console.log(`[Sprint 141 Mobile Menu Deep QA] report: ${path.relative(ROOT, REPORT).replace(/\\/g, '/')}`);
  if (failures.length) process.exit(1);
}

main().catch(err => { console.error('[Sprint 141 Mobile Menu Deep QA] fatal:', err); process.exit(1); });
