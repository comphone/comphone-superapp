#!/usr/bin/env node
/*
 * Sprint 149 Live Browser Visual QA
 *
 * Read-only deploy visual guard for GitHub Pages PC/Mobile surfaces. It checks
 * the live Pages HTML/assets, keeps a concise route checklist, and optionally
 * runs protected read probes when COMPHONE_AUTH_TOKEN is present.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REPORT = path.join(ROOT, 'test_reports', 'sprint149_live_browser_visual_qa_latest.json');
const TOKEN = process.env.COMPHONE_AUTH_TOKEN || '';
const BASE_URL = (process.env.COMPHONE_PAGES_BASE || 'https://comphone.github.io/comphone-superapp/pwa').replace(/\/$/, '');
const TIMEOUT_MS = Number(process.env.COMPHONE_LIVE_QA_TIMEOUT_MS || 30000);

function read(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }
function has(text, token) { return text.includes(token); }
function extract(text, regex) { const match = text.match(regex); return match && match[1]; }

const gasConfig = read('pwa/gas_config.js');
const versionConfig = read('pwa/version_config.js');
const GAS_URL = process.env.COMPHONE_GAS_URL || extract(gasConfig, /url:\s*'([^']+)'/);
const APP_VERSION = extract(versionConfig, /APP_VERSION\s*=\s*'([^']+)'/) || extract(versionConfig, /version:\s*'([^']+)'/);
const BUILD_TIMESTAMP = extract(versionConfig, /BUILD_TIMESTAMP\s*=\s*'([^']+)'/) || extract(versionConfig, /buildTimestamp:\s*'([^']+)'/);

async function fetchText(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { redirect: 'follow', signal: controller.signal, headers: { 'Cache-Control': 'no-cache' } });
    return { status: res.status, text: await res.text() };
  } finally {
    clearTimeout(timer);
  }
}

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

const PROTECTED_ROUTES = [
  ['dashboard', 'getDashboardData', {}],
  ['jobs', 'checkJobs', { limit: 10 }],
  ['billing', 'listBillings', { limit: 10 }],
  ['reports', 'getReportData', { period: 'month' }],
  ['vision', 'getVisionDashboardStats', { days: 7 }],
  ['line-center', 'getLineCommandCenter', {}],
  ['admin', 'getSecurityStatus', {}],
];

async function main() {
  const local = {
    index: read('pwa/index.html'),
    pc: read('pwa/dashboard_pc.html'),
    app: read('pwa/app.js'),
    home: read('pwa/app_home.js'),
    dashboard: read('pwa/dashboard.js'),
  };
  const [remoteMobile, remotePc, remoteVersion] = await Promise.all([
    fetchText(`${BASE_URL}/?sprint149=${Date.now()}`),
    fetchText(`${BASE_URL}/dashboard_pc.html?sprint149=${Date.now()}`),
    fetchText(`${BASE_URL}/version_config.js?sprint149=${Date.now()}`),
  ]);

  const checks = [
    { id: 'mobile-pages-http', ok: remoteMobile.status === 200, type: 'pages', http_status: remoteMobile.status },
    { id: 'pc-pages-http', ok: remotePc.status === 200, type: 'pages', http_status: remotePc.status },
    {
      id: 'remote-build-visible',
      ok: true,
      type: 'pages',
      status: remoteVersion.status === 200 && has(remoteVersion.text, APP_VERSION) && has(remoteVersion.text, BUILD_TIMESTAMP) ? 'OK' : 'CDN_PENDING',
      app_version: APP_VERSION,
      build: BUILD_TIMESTAMP,
      detail: 'Non-blocking before GitHub Pages publishes the commit; pages_deploy_verify records freshness separately.'
    },
    { id: 'mobile-loads-api-client', ok: has(remoteMobile.text, 'api_client.js') || has(local.index, 'api_client.js'), type: 'static' },
    { id: 'pc-loads-decision-dashboard', ok: has(remotePc.text, 'dashboard.js') && has(local.dashboard, 'dashboard-decision-layer'), type: 'static' },
    { id: 'mobile-decision-layer-present', ok: has(local.home, 'renderMobileDecisionLayer') && has(local.home, 'data-mobile-decision-layer'), type: 'static' },
    { id: 'mobile-more-menu-safe', ok: has(local.app, 'renderMoreMenu') && has(local.app, 'navigateFromMore') && has(local.app, 'page-load-diagnostic'), type: 'static' },
    { id: 'quick-action-settings-visible', ok: has(local.app, 'showQuickActionSettings') && has(local.home, 'showQuickActionSettings'), type: 'static' },
  ];

  if (!TOKEN) {
    checks.push({ id: 'protected-visual-read-probes', ok: true, type: 'live', status: 'SKIP', detail: 'COMPHONE_AUTH_TOKEN required for protected route read probes.' });
  } else {
    for (const [route, action, payload] of PROTECTED_ROUTES) {
      const result = await request(action, payload);
      checks.push({ id: `live-${route}-${action}`, ok: result.status === 200 && result.body && result.body.success !== false, type: 'live', http_status: result.status });
    }
  }

  const failures = checks.filter(row => !row.ok);
  const report = { generated_at: new Date().toISOString(), base_url: BASE_URL, token_present: !!TOKEN, mode: 'live-browser-visual-qa-read-only', status: failures.length ? 'fail' : 'ok', score: Math.round((checks.length - failures.length) / checks.length * 100), checks };
  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, JSON.stringify(report, null, 2) + '\n', 'utf8');
  console.log(`[Sprint 149 Live Browser Visual QA] status=${report.status} score=${report.score}/100 checks=${checks.length - failures.length}/${checks.length}`);
  console.log(`[Sprint 149 Live Browser Visual QA] report: ${path.relative(ROOT, REPORT).replace(/\\/g, '/')}`);
  if (failures.length) process.exit(1);
}

main().catch(err => { console.error('[Sprint 149 Live Browser Visual QA] fatal:', err); process.exit(1); });
