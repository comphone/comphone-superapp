#!/usr/bin/env node
/*
 * Sprint 157 PC Dashboard Workflow Guard
 *
 * Guards PC dashboard high-value workflow routes: Jobs, Billing, Reports,
 * Inventory, AI Vision, LINE Center, and Settings.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REPORT = path.join(ROOT, 'test_reports', 'sprint157_pc_dashboard_workflow_guard_latest.json');
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

const READS = [
  ['dashboard', 'getDashboardData', {}],
  ['jobs', 'checkJobs', { limit: 10 }],
  ['billing', 'listBillings', { limit: 10 }],
  ['reports', 'getReportData', { period: 'month' }],
  ['inventory', 'inventoryOverview', {}],
  ['po', 'listPurchaseOrders', { limit: 10 }],
  ['vision', 'getVisionDashboardStats', { days: 7 }],
  ['line-center', 'getLineCommandCenter', { days: 7 }],
  ['settings', 'getSecurityStatus', {}],
];

async function main() {
  const files = {
    html: read('pwa/dashboard_pc.html'),
    core: read('pwa/dashboard_pc_core.js'),
    dashboard: read('pwa/dashboard.js'),
    jobs: read('pwa/section_jobs.js') + '\n' + read('pwa/job_workflow.js'),
    billing: read('pwa/billing_section.js'),
    reports: read('pwa/reports.js') + '\n' + read('pwa/section_reports.js'),
    vision: read('pwa/section_vision.js'),
    line: read('pwa/section_line_center.js'),
    settings: read('pwa/section_settings.js'),
  };
  const checks = [
    { id: 'pc-api-client-loaded-before-core', ok: files.html.indexOf('api_client.js') >= 0 && files.html.indexOf('api_client.js') < files.html.indexOf('dashboard_pc_core.js'), type: 'load-order' },
    { id: 'pc-last-section-restore', ok: has(files.core, 'LAST_SECTION_KEY') && has(files.core, 'localStorage.setItem(LAST_SECTION_KEY'), type: 'navigation' },
    { id: 'pc-section-state-watchdog', ok: has(files.core, 'data-section-state') && has(files.core, 'renderMissingSection'), type: 'reliability' },
    { id: 'dashboard-decision-layer', ok: has(files.dashboard, 'dashboard-decision-layer') && has(files.dashboard, 'openDashboardCommand'), type: 'dashboard' },
    { id: 'jobs-real-open-flow', ok: has(files.jobs, '_showPcCreateJob') && has(files.jobs, '_doPcCreateJob') && has(files.jobs, 'client_request_id'), type: 'jobs' },
    { id: 'billing-real-payment-flow', ok: has(files.billing, '_showCreateBilling') && has(files.billing, 'markBillingPaid') && has(files.billing, 'confirm('), type: 'billing' },
    { id: 'reports-real-module', ok: has(files.reports, 'renderReportModule') && has(files.reports, '_loadReportJobs') && has(files.reports, '_loadReportBilling'), type: 'reports' },
    { id: 'vision-pc-panel', ok: has(files.vision, 'renderVisionSection') && has(files.vision, 'runSelectedVisionPipeline') && has(files.vision, 'previewVisionSuggestion'), type: 'vision' },
    { id: 'line-center-pc-panel', ok: has(files.line, 'renderLineCenterSection') && has(files.line, 'toggleLineRoomNotification') && has(files.line, 'previewLineMessage'), type: 'line' },
    { id: 'settings-quick-actions-link', ok: has(files.settings, 'showQuickActionSettings'), type: 'settings' },
  ];
  if (!TOKEN) {
    checks.push({ id: 'protected-pc-workflow-reads', ok: true, type: 'live', status: 'SKIP', detail: 'COMPHONE_AUTH_TOKEN required for live PC workflow reads.' });
  } else {
    for (const [section, action, payload] of READS) {
      const result = await request(action, payload);
      checks.push({ id: `live-pc-${section}-${action}`, ok: result.status === 200 && result.body && result.body.success !== false, type: 'live', http_status: result.status });
    }
  }
  const failures = checks.filter(row => !row.ok);
  const report = { generated_at: new Date().toISOString(), mode: 'pc-dashboard-workflow-guard', token_present: !!TOKEN, status: failures.length ? 'fail' : 'ok', score: Math.round((checks.length - failures.length) / checks.length * 100), checks };
  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, JSON.stringify(report, null, 2) + '\n', 'utf8');
  console.log(`[Sprint 157 PC Dashboard Workflow] status=${report.status} score=${report.score}/100 checks=${checks.length - failures.length}/${checks.length}`);
  console.log(`[Sprint 157 PC Dashboard Workflow] report: ${path.relative(ROOT, REPORT).replace(/\\/g, '/')}`);
  if (failures.length) process.exit(1);
}

main().catch(err => {
  console.error('[Sprint 157 PC Dashboard Workflow] fatal:', err);
  process.exit(1);
});
