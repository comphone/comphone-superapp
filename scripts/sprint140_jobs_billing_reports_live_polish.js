#!/usr/bin/env node
/*
 * Sprint 140 Jobs -> Billing -> Reports Live Polish
 *
 * Token-aware read-only proof for the operational chain. It verifies that the
 * UI and API contract keep empty/missing data diagnosable instead of blank.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REPORT = path.join(ROOT, 'test_reports', 'sprint140_jobs_billing_reports_live_polish_latest.json');
const TOKEN = process.env.COMPHONE_AUTH_TOKEN || '';
const gasConfig = fs.readFileSync(path.join(ROOT, 'pwa', 'gas_config.js'), 'utf8');
const urlMatch = gasConfig.match(/url:\s*'([^']+)'/);
const GAS_URL = process.env.COMPHONE_GAS_URL || (urlMatch && urlMatch[1]);

function read(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }
function has(text, token) { return text.includes(token); }
function nested(obj, key) { return key.split('.').reduce((cur, part) => cur && cur[part], obj); }
function rowsFor(body, keys) { for (const key of keys) { const v = nested(body, key); if (Array.isArray(v)) return v; } return []; }
function first(row, keys) { for (const key of keys) { const v = nested(row, key); if (v !== undefined && v !== null && v !== '') return String(v); } return ''; }

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

function staticChecks() {
  const files = {
    jobs: read('pwa/section_jobs.js'),
    billing: read('pwa/billing_section.js'),
    reports: read('pwa/reports.js'),
    contract: read('pwa/api_contract.js'),
  };
  return [
    ['jobs-open-modal', has(files.jobs, 'openJob') && has(files.jobs, 'client_request_id')],
    ['billing-incomplete-diagnostic', has(files.billing, 'Missing Job_ID') && has(files.billing, 'getBilling')],
    ['reports-empty-state', has(files.reports, 'report-empty-state') && has(files.reports, 'getReportData')],
    ['contract-chain', ['checkJobs', 'listBillings', 'getBilling', 'getReportData'].every(token => has(files.contract, token))],
  ].map(([id, ok]) => ({ id, ok, type: 'static' }));
}

async function liveChecks() {
  if (!TOKEN) return [{ id: 'token-required', ok: true, type: 'live', status: 'SKIP', detail: 'COMPHONE_AUTH_TOKEN required for protected live chain.' }];
  const checks = [];
  const jobs = await request('checkJobs', { limit: 10 });
  const jobRows = rowsFor(jobs.body, ['jobs', 'data', 'rows', 'items']);
  checks.push({ id: 'checkJobs', ok: jobs.status === 200 && jobs.body.success !== false, type: 'live', count: jobRows.length });
  const billings = await request('listBillings', { limit: 20 });
  const billingRows = rowsFor(billings.body, ['billings', 'data', 'rows', 'items']);
  checks.push({ id: 'listBillings', ok: billings.status === 200 && billings.body.success !== false, type: 'live', count: billingRows.length });
  const jobId = first(billingRows.find(row => first(row, ['Job_ID', 'job_id', 'jobId'])) || jobRows[0] || {}, ['Job_ID', 'job_id', 'jobId', 'id', 'ID']);
  if (jobId) {
    const billing = await request('getBilling', { job_id: jobId });
    checks.push({ id: 'getBilling-selected-job', ok: billing.status === 200, type: 'live', job_id: jobId, success: billing.body && billing.body.success !== false });
  }
  const report = await request('getReportData', { period: 'month' });
  checks.push({ id: 'getReportData-month', ok: report.status === 200 && report.body.success !== false, type: 'live', daily_revenue_rows: rowsFor(report.body, ['dailyRevenue', 'data.dailyRevenue', 'report.dailyRevenue']).length });
  return checks;
}

async function main() {
  const checks = staticChecks().concat(await liveChecks());
  const failures = checks.filter(row => !row.ok);
  const report = { generated_at: new Date().toISOString(), gas_url: GAS_URL, token_present: !!TOKEN, mode: 'read-only-jobs-billing-reports-polish', status: failures.length ? 'fail' : 'ok', score: Math.round((checks.length - failures.length) / checks.length * 100), checks };
  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, JSON.stringify(report, null, 2) + '\n', 'utf8');
  console.log(`[Sprint 140 Jobs/Billing/Reports] status=${report.status} score=${report.score}/100 checks=${checks.length - failures.length}/${checks.length}`);
  console.log(`[Sprint 140 Jobs/Billing/Reports] report: ${path.relative(ROOT, REPORT).replace(/\\/g, '/')}`);
  if (failures.length) process.exit(1);
}

main().catch(err => { console.error('[Sprint 140 Jobs/Billing/Reports] fatal:', err); process.exit(1); });
