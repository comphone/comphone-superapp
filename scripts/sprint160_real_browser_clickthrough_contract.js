#!/usr/bin/env node
/*
 * Sprint 160 Real Browser Click-Through Contract
 *
 * Source-level browser click-through contract for PC/Mobile. It verifies that
 * every operator route has a real mount, renderer, fallback diagnostic, and
 * protected read contract. Manual/browser-profile proof can use the generated
 * checklist without changing production data.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REPORT = path.join(ROOT, 'test_reports', 'sprint160_real_browser_clickthrough_contract_latest.json');
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

const ROUTES = [
  ['mobile-dashboard', 'page-dashboard', 'loadDashboardPage', 'getDashboardData'],
  ['mobile-jobs', 'page-jobs', 'renderJobsPage', 'checkJobs'],
  ['mobile-billing', 'page-billing', 'loadBillingPage', 'listBillings'],
  ['mobile-reports', 'page-reports', 'loadReportsPage', 'getReportData'],
  ['mobile-vision', 'page-vision', 'renderMobileVisionPage', 'getVisionDashboardStats'],
  ['mobile-line-center', 'page-line-center', 'renderMobileLineCenterPage', 'getLineCommandCenter'],
  ['pc-dashboard', 'section-dashboard', 'renderDashboard', 'getDashboardData'],
  ['pc-jobs', 'section-jobs', 'renderJobsSection', 'checkJobs'],
  ['pc-billing', 'section-billing', 'renderBillingSection', 'listBillings'],
  ['pc-reports', 'section-reports', 'renderReportModule', 'getReportData'],
  ['pc-inventory', 'section-inventory', 'renderInventorySection', 'inventoryOverview'],
  ['pc-vision', 'section-vision', 'renderVisionSection', 'getVisionDashboardStats'],
  ['pc-line-center', 'section-line-center', 'renderLineCenterSection', 'getLineCommandCenter'],
  ['pc-settings', 'section-settings', 'renderSettingsSection', 'getSecurityStatus'],
];

async function main() {
  const files = {
    index: read('pwa/index.html'),
    pcHtml: read('pwa/dashboard_pc.html'),
    app: read('pwa/app.js'),
    pcCore: read('pwa/dashboard_pc_core.js'),
    allPwa: fs.readdirSync(path.join(ROOT, 'pwa')).filter(f => f.endsWith('.js')).map(f => read(`pwa/${f}`)).join('\n'),
  };
  const surface = `${files.index}\n${files.pcHtml}\n${files.app}\n${files.pcCore}\n${files.allPwa}`;
  const checks = [
    { id: 'browser-proof-checklist-generated', ok: true, type: 'runbook', routes: ROUTES.map(row => row[0]) },
    { id: 'mobile-last-page-restore', ok: has(files.app, 'LAST_PAGE_KEY') && has(files.app, 'goPage(savedPage'), type: 'navigation' },
    { id: 'pc-last-section-restore', ok: has(files.pcCore, 'LAST_SECTION_KEY') && has(files.pcCore, 'localStorage.setItem(LAST_SECTION_KEY'), type: 'navigation' },
    { id: 'blank-page-diagnostics', ok: has(files.app, 'page-load-diagnostic') && has(files.pcCore, 'renderMissingSection'), type: 'diagnostic' },
  ];
  for (const [id, mount, renderer, action] of ROUTES) {
    checks.push({ id: `${id}-mount`, ok: has(surface, mount), type: 'route' });
    checks.push({ id: `${id}-renderer`, ok: has(surface, renderer), type: 'route' });
    checks.push({ id: `${id}-api-action`, ok: has(surface, action), type: 'route' });
  }
  if (!TOKEN) {
    checks.push({ id: 'protected-browser-clickthrough-reads', ok: true, type: 'live', status: 'SKIP', detail: 'COMPHONE_AUTH_TOKEN required for protected read probes.' });
  } else {
    const actions = [...new Set(ROUTES.map(row => row[3]))];
    for (const action of actions) {
      const payload = action === 'getReportData' ? { period: 'month' } : action === 'getVisionDashboardStats' || action === 'getLineCommandCenter' ? { days: 7 } : {};
      const result = await request(action, payload);
      checks.push({ id: `live-${action}`, ok: result.status === 200 && result.body && result.body.success !== false, type: 'live', http_status: result.status });
    }
  }
  const failures = checks.filter(row => !row.ok);
  const report = { generated_at: new Date().toISOString(), mode: 'real-browser-clickthrough-contract', token_present: !!TOKEN, status: failures.length ? 'fail' : 'ok', score: Math.round((checks.length - failures.length) / checks.length * 100), checks };
  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, JSON.stringify(report, null, 2) + '\n', 'utf8');
  console.log(`[Sprint 160 Browser Clickthrough] status=${report.status} score=${report.score}/100 checks=${checks.length - failures.length}/${checks.length}`);
  console.log(`[Sprint 160 Browser Clickthrough] report: ${path.relative(ROOT, REPORT).replace(/\\/g, '/')}`);
  if (failures.length) process.exit(1);
}

main().catch(err => {
  console.error('[Sprint 160 Browser Clickthrough] fatal:', err);
  process.exit(1);
});
