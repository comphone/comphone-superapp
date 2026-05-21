#!/usr/bin/env node
/*
 * Sprint 161 Protected Live Token Sweep
 *
 * Token-aware read-only sweep for the protected actions behind the most
 * important PC/Mobile menus. Default mode is skip-safe when no session token is
 * provided.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REPORT = path.join(ROOT, 'test_reports', 'sprint161_protected_live_token_sweep_latest.json');
const TOKEN = process.env.COMPHONE_AUTH_TOKEN || '';
const gasConfig = fs.readFileSync(path.join(ROOT, 'pwa', 'gas_config.js'), 'utf8');
const GAS_URL = process.env.COMPHONE_GAS_URL || (gasConfig.match(/url:\s*'([^']+)'/) || [])[1];

const READS = [
  ['system', 'health', {}, true],
  ['system', 'getVersion', {}, true],
  ['dashboard', 'getDashboardData', {}, false],
  ['jobs', 'checkJobs', { limit: 20 }, false],
  ['crm', 'listCustomers', { limit: 20 }, false],
  ['billing', 'listBillings', { limit: 20 }, false],
  ['reports', 'getReportData', { period: 'month' }, false],
  ['inventory', 'inventoryOverview', {}, false],
  ['po', 'listPurchaseOrders', { limit: 20 }, false],
  ['vision', 'getVisionDashboardStats', { days: 7 }, false],
  ['vision', 'getVisionPipelineVersion', {}, false],
  ['vision', 'getVisionReviewQueue', { limit: 10, days: 30 }, false],
  ['line-center', 'getLineRoomStatus', {}, false],
  ['line-center', 'getLineNotificationSettings', {}, false],
  ['line-center', 'getLineCommandCenter', { days: 7 }, false],
  ['admin', 'getSecurityStatus', {}, false],
];

async function request(action, payload = {}, noAuth = false) {
  const data = Object.assign({ action, _t: Date.now() }, payload);
  if (TOKEN && !noAuth) data.token = TOKEN;
  Object.keys(data).forEach(key => { if (data[key] && typeof data[key] === 'object') data[key] = JSON.stringify(data[key]); });
  const res = await fetch(`${GAS_URL}?${new URLSearchParams(data).toString()}`, { redirect: 'follow' });
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch (_) { throw new Error(`${action}: non-JSON ${res.status}`); }
  return { status: res.status, body };
}

async function main() {
  const checks = [];
  for (const [menu, action, payload, noAuth] of READS) {
    if (!TOKEN && !noAuth) {
      checks.push({ id: `${menu}-${action}`, ok: true, type: 'live', status: 'SKIP', detail: 'COMPHONE_AUTH_TOKEN required.' });
      continue;
    }
    const started = Date.now();
    try {
      const result = await request(action, payload, noAuth);
      const ok = result.status === 200 && result.body && (result.body.status === 'healthy' || result.body.success !== false);
      checks.push({ id: `${menu}-${action}`, ok, type: noAuth ? 'public' : 'protected', http_status: result.status, elapsed_ms: Date.now() - started, code: result.body && result.body.code, error: ok ? '' : (result.body && (result.body.error || result.body.message || result.body.status)) || 'unexpected response' });
    } catch (err) {
      checks.push({ id: `${menu}-${action}`, ok: false, type: noAuth ? 'public' : 'protected', http_status: 0, elapsed_ms: Date.now() - started, error: err.message });
    }
  }
  const failures = checks.filter(row => !row.ok);
  const protectedRun = checks.some(row => row.type === 'protected' && row.status !== 'SKIP');
  const report = { generated_at: new Date().toISOString(), mode: 'protected-live-token-sweep-read-only', token_present: !!TOKEN, protected_run: protectedRun, status: failures.length ? 'fail' : 'ok', score: Math.round((checks.length - failures.length) / checks.length * 100), checks };
  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, JSON.stringify(report, null, 2) + '\n', 'utf8');
  console.log(`[Sprint 161 Protected Live Sweep] status=${report.status} score=${report.score}/100 checks=${checks.length - failures.length}/${checks.length} protected_run=${protectedRun}`);
  console.log(`[Sprint 161 Protected Live Sweep] report: ${path.relative(ROOT, REPORT).replace(/\\/g, '/')}`);
  if (failures.length) process.exit(1);
}

main().catch(err => {
  console.error('[Sprint 161 Protected Live Sweep] fatal:', err);
  process.exit(1);
});
