#!/usr/bin/env node
/*
 * Sprint 132 Core Workflow Live QA
 *
 * Token-aware, read-only proof for the highest-value operator chain:
 * Jobs -> Billing -> Reports -> AI Vision -> LINE Center.
 *
 * CI-safe without COMPHONE_AUTH_TOKEN: writes a skipped report and exits OK.
 * With a fresh token, it verifies live production read contracts and cross-menu
 * handoffs without creating, updating, deleting, or sending LINE messages.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const gasConfig = fs.readFileSync(path.join(ROOT, 'pwa', 'gas_config.js'), 'utf8');
const urlMatch = gasConfig.match(/url:\s*'([^']+)'/);
const GAS_URL = process.env.COMPHONE_GAS_URL || (urlMatch && urlMatch[1]);
const TOKEN = process.env.COMPHONE_AUTH_TOKEN || '';
const TIMEOUT_MS = Number(process.env.COMPHONE_WORKFLOW_QA_TIMEOUT_MS || 30000);
const REPORT_PATH = process.env.COMPHONE_WORKFLOW_QA_REPORT ||
  path.join(ROOT, 'test_reports', 'sprint132_core_workflow_live_qa_latest.json');

if (!GAS_URL) {
  console.error('[Sprint 132 Core Workflow Live QA] Missing GAS URL. Set COMPHONE_GAS_URL or update pwa/gas_config.js.');
  process.exit(1);
}

function nestedValue(obj, key) {
  return key.split('.').reduce((current, part) => current && current[part], obj);
}

function rowsFor(body, keys) {
  for (const key of keys) {
    const value = nestedValue(body, key);
    if (Array.isArray(value)) return value;
  }
  return [];
}

function firstValue(obj, keys) {
  for (const key of keys) {
    const value = nestedValue(obj, key);
    if (value !== undefined && value !== null && value !== '') return String(value);
  }
  return '';
}

function encodePayload(payload) {
  const copy = Object.assign({}, payload || {});
  for (const key of Object.keys(copy)) {
    if (copy[key] && typeof copy[key] === 'object') copy[key] = JSON.stringify(copy[key]);
  }
  return copy;
}

async function request(action, payload = {}) {
  const qsPayload = Object.assign({ action, _t: Date.now() }, encodePayload(payload));
  if (TOKEN) qsPayload.token = TOKEN;
  const qs = new URLSearchParams(qsPayload);
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

function classify(error, status) {
  const raw = String(error || '').toUpperCase();
  if (status === 401 || /AUTH|TOKEN|SESSION|LOGIN|401/.test(raw)) return 'AUTH_FAIL';
  if (status === 403 || /PERMISSION|FORBIDDEN|DENIED|ROLE|ADMIN ACCESS|403/.test(raw)) return 'PERMISSION';
  if (/NOT_FOUND|UNKNOWN ACTION|NO_HANDLER|FUNCTION NOT FOUND|ACTION/.test(raw)) return 'CONTRACT';
  if (/REQUIRED|MISSING|INVALID/.test(raw)) return 'VALIDATION';
  if (/TIMEOUT|ABORT/.test(raw)) return 'TIMEOUT';
  if (/NETWORK|FAILED TO FETCH|LOAD FAILED|OFFLINE/.test(raw)) return 'NETWORK';
  return 'BACKEND';
}

function summarize(action, body) {
  if (!body || typeof body !== 'object') return {};
  if (action === 'checkJobs') {
    const jobs = rowsFor(body, ['jobs', 'data', 'rows', 'items']);
    return { count: jobs.length, latestJobId: selectJobId(jobs) };
  }
  if (action === 'getJobTimeline') {
    const timeline = rowsFor(body, ['timeline', 'logs', 'items', 'data']);
    return { count: timeline.length };
  }
  if (action === 'listBillings') {
    const billings = rowsFor(body, ['billings', 'data', 'rows', 'items']);
    return { count: billings.length, usableJobId: selectBillingJobId(billings) };
  }
  if (action === 'getBilling') {
    return {
      hasBilling: !!(body.billing || body.data || body.record),
      jobId: firstValue(body.billing || body.data || body.record || {}, ['job_id', 'Job_ID', 'jobId']),
    };
  }
  if (action === 'getReportData') {
    return {
      hasData: !!(body.data || body.report || body.summary),
      dailyRevenue: rowsFor(body, ['dailyRevenue', 'data.dailyRevenue', 'report.dailyRevenue']).length,
      jobs: rowsFor(body, ['jobs', 'data.jobs', 'report.jobs']).length,
      billings: rowsFor(body, ['billings', 'data.billings', 'report.billings']).length,
    };
  }
  if (action === 'getVisionDashboardStats') {
    const stats = body.stats || (body.data && body.data.stats) || {};
    return {
      total: stats.total || 0,
      needReview: stats.needReview || stats.need_review || 0,
      failed: stats.failed || 0,
    };
  }
  if (action === 'getVisionActionSuggestions') {
    return { count: Array.isArray(body.suggestions) ? body.suggestions.length : body.count || 0 };
  }
  if (action === 'getVisionReviewQueue') {
    return { count: Array.isArray(body.queue) ? body.queue.length : body.count || 0 };
  }
  if (action === 'getLineCommandCenter') {
    return {
      rooms: Array.isArray(body.rooms) ? body.rooms.length : 0,
      alerts: body.queue && Array.isArray(body.queue.alerts) ? body.queue.alerts.length : undefined,
    };
  }
  if (action === 'getLineRoomStatus') {
    return { total: body.total, configured: body.configured, tokenConfigured: body.tokenConfigured };
  }
  if (action === 'previewLineRoomMessage') {
    return {
      dryRun: body.dryRun,
      rooms: Array.isArray(body.rooms) ? body.rooms.map(room => ({
        id: room.id,
        configured: room.configured,
        notificationEnabled: room.notificationEnabled,
        willNotify: room.willNotify,
      })) : [],
    };
  }
  return { status: body.status || '', success: body.success };
}

function record(report, row) {
  report.results.push(row);
  console.log(`[${row.menu.padEnd(12)}] ${row.action}: ${row.status_label} ${row.http_status || 0} ${row.elapsed_ms || 0}ms${row.error ? ' - ' + row.error : ''}`);
}

async function runAction(report, menu, action, payload, verifier, options = {}) {
  const started = Date.now();
  try {
    const result = await request(action, payload);
    const ok = result.status === 200 && result.body && result.body.success !== false && (!verifier || verifier(result.body));
    const error = ok ? '' : (result.body && (result.body.error || result.body.message || result.body.status || result.body.code)) || 'unexpected response';
    const row = {
      menu,
      action,
      ok: ok || !!options.optional,
      optional: !!options.optional,
      status_label: ok ? 'OK' : options.optional ? 'OPTIONAL' : classify(error, result.status),
      http_status: result.status,
      elapsed_ms: Date.now() - started,
      error,
      payload_hint: options.payloadHint || '',
      summary: summarize(action, result.body),
    };
    record(report, row);
    return ok ? result.body : null;
  } catch (err) {
    const row = {
      menu,
      action,
      ok: !!options.optional,
      optional: !!options.optional,
      status_label: options.optional ? 'OPTIONAL' : classify(err.message, 0),
      http_status: 0,
      elapsed_ms: Date.now() - started,
      error: err.message,
      payload_hint: options.payloadHint || '',
      summary: {},
    };
    record(report, row);
    return null;
  }
}

function selectJobId(jobs) {
  for (const job of jobs || []) {
    const id = firstValue(job, ['job_id', 'Job_ID', 'jobId', 'id']);
    if (id) return id;
  }
  return '';
}

function selectBillingJobId(billings) {
  for (const billing of billings || []) {
    const id = firstValue(billing, ['job_id', 'Job_ID', 'jobId']);
    if (id) return id;
  }
  return '';
}

function writeReport(report) {
  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2) + '\n', 'utf8');
  console.log(`[Sprint 132 Core Workflow Live QA] report: ${path.relative(ROOT, REPORT_PATH).replace(/\\/g, '/')}`);
}

async function main() {
  const report = {
    generated_at: new Date().toISOString(),
    gas_url: GAS_URL,
    token_present: !!TOKEN,
    mode: TOKEN ? 'protected-read-only-core-workflow' : 'skip-safe',
    chain: ['Jobs', 'Billing', 'Reports', 'AI Vision', 'LINE Center'],
    results: [],
  };

  if (!TOKEN) {
    record(report, {
      menu: 'safety',
      action: 'core-workflow-live-qa-gate',
      ok: true,
      status_label: 'SKIP',
      http_status: 0,
      elapsed_ms: 0,
      error: 'set COMPHONE_AUTH_TOKEN to run protected Jobs -> Billing -> Reports -> AI Vision -> LINE Center live QA',
      summary: {},
    });
    writeReport(report);
    console.log('[Sprint 132 Core Workflow Live QA] OK (protected checks skipped safely)');
    return;
  }

  const jobsBody = await runAction(
    report,
    'Jobs',
    'checkJobs',
    { limit: 15 },
    body => rowsFor(body, ['jobs', 'data', 'rows', 'items']).length >= 0
  );
  const jobs = rowsFor(jobsBody || {}, ['jobs', 'data', 'rows', 'items']);
  const latestJobId = selectJobId(jobs);
  if (latestJobId) {
    await runAction(
      report,
      'Jobs',
      'getJobTimeline',
      { job_id: latestJobId },
      body => body.success !== false && Array.isArray(rowsFor(body, ['timeline', 'logs', 'items', 'data'])),
      { payloadHint: 'latest job from checkJobs' }
    );
  } else {
    record(report, {
      menu: 'Jobs',
      action: 'getJobTimeline',
      ok: true,
      optional: true,
      status_label: 'OPTIONAL',
      http_status: 0,
      elapsed_ms: 0,
      error: 'No live job id returned by checkJobs; timeline detail skipped without creating data',
      summary: {},
    });
  }

  const billingsBody = await runAction(
    report,
    'Billing',
    'listBillings',
    { limit: 25 },
    body => rowsFor(body, ['billings', 'data', 'rows', 'items']).length >= 0
  );
  const billings = rowsFor(billingsBody || {}, ['billings', 'data', 'rows', 'items']);
  const billingJobId = selectBillingJobId(billings) || latestJobId;
  if (billingJobId) {
    await runAction(
      report,
      'Billing',
      'getBilling',
      { job_id: billingJobId },
      body => body.success !== false,
      { optional: true, payloadHint: selectBillingJobId(billings) ? 'job id from listBillings' : 'latest job fallback' }
    );
  } else {
    record(report, {
      menu: 'Billing',
      action: 'getBilling',
      ok: true,
      optional: true,
      status_label: 'OPTIONAL',
      http_status: 0,
      elapsed_ms: 0,
      error: 'No usable Billing Job_ID or latest Job ID; detail skipped without mutation',
      summary: {},
    });
  }

  await runAction(
    report,
    'Reports',
    'getReportData',
    { period: 'month' },
    body => body && body.success !== false
  );

  await runAction(
    report,
    'AI Vision',
    'getVisionDashboardStats',
    { days: 7 },
    body => body && body.success !== false && !!(body.stats || body.data)
  );
  await runAction(
    report,
    'AI Vision',
    'getVisionActionSuggestions',
    { result: { type: 'QC', confidence: 0.9, decision: { code: 'APPROVED' }, data: { job_id: latestJobId } } },
    body => body && body.success !== false && Array.isArray(body.suggestions)
  );
  await runAction(
    report,
    'AI Vision',
    'getVisionReviewQueue',
    { limit: 5, days: 30 },
    body => body && body.success !== false && Array.isArray(body.queue)
  );

  await runAction(
    report,
    'LINE Center',
    'getLineCommandCenter',
    { days: 7 },
    body => body && body.success !== false && Array.isArray(body.rooms) && body.queue && body.analytics
  );
  const lineStatus = await runAction(
    report,
    'LINE Center',
    'getLineRoomStatus',
    {},
    body => body && body.success !== false && Array.isArray(body.rooms)
  );
  const rooms = rowsFor(lineStatus || {}, ['rooms']);
  const targetRoom = (rooms.find(room => room.configured) || rooms[0] || {}).id || 'EXECUTIVE';
  await runAction(
    report,
    'LINE Center',
    'previewLineRoomMessage',
    {
      rooms: [targetRoom],
      message: `COMPHONE Sprint 132 preview only${latestJobId ? ' - job ' + latestJobId : ''}`,
    },
    body => body && body.success !== false && body.dryRun === true && Array.isArray(body.rooms),
    { payloadHint: 'preview only; no outbound LINE send' }
  );

  writeReport(report);
  const failures = report.results.filter(row => !row.ok);
  if (failures.length) {
    console.error('[Sprint 132 Core Workflow Live QA] FAILED');
    process.exit(1);
  }
  console.log('[Sprint 132 Core Workflow Live QA] OK');
}

main().catch(err => {
  console.error('[Sprint 132 Core Workflow Live QA] FAILED');
  console.error(err);
  process.exit(1);
});
