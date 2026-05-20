#!/usr/bin/env node
/*
 * Sprint 139 Data Cleanup Triage
 *
 * Token-aware, read-only triage for the four Sprint 134 business-data findings.
 * It classifies each gap into manual_backfill, controlled_repair_candidate, or
 * acceptable_empty_state. It never executes repair or writes business data.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REPORT_DIR = path.join(ROOT, 'test_reports');
const REPORT_JSON = path.join(REPORT_DIR, 'sprint139_data_cleanup_triage_latest.json');
const REPORT_MD = path.join(REPORT_DIR, 'sprint139_data_cleanup_triage_latest.md');
const gasConfig = fs.readFileSync(path.join(ROOT, 'pwa', 'gas_config.js'), 'utf8');
const urlMatch = gasConfig.match(/url:\s*'([^']+)'/);
const GAS_URL = process.env.COMPHONE_GAS_URL || (urlMatch && urlMatch[1]);
const TOKEN = process.env.COMPHONE_AUTH_TOKEN || '';
const TIMEOUT_MS = Number(process.env.COMPHONE_TRIAGE_TIMEOUT_MS || 30000);

if (!GAS_URL) {
  console.error('[Sprint 139 Data Cleanup Triage] Missing GAS URL.');
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

async function request(action, payload = {}) {
  const data = Object.assign({ action, _t: Date.now() }, payload);
  if (TOKEN) data.token = TOKEN;
  Object.keys(data).forEach(key => {
    if (data[key] && typeof data[key] === 'object') data[key] = JSON.stringify(data[key]);
  });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${GAS_URL}?${new URLSearchParams(data).toString()}`, { redirect: 'follow', signal: controller.signal });
    const text = await res.text();
    let body;
    try { body = JSON.parse(text); } catch (_) { throw new Error(`${action}: non-JSON ${res.status} ${text.slice(0, 160)}`); }
    return { status: res.status, body };
  } finally {
    clearTimeout(timer);
  }
}

function classifyError(error, status) {
  const raw = String(error || '').toUpperCase();
  if (status === 401 || /AUTH|TOKEN|SESSION|LOGIN/.test(raw)) return 'AUTH_FAIL';
  if (/NOT_FOUND|UNKNOWN ACTION|NO_HANDLER/.test(raw)) return 'CONTRACT';
  if (/TIMEOUT|ABORT/.test(raw)) return 'TIMEOUT';
  return 'BACKEND';
}

async function live(action, payload = {}) {
  const started = Date.now();
  try {
    const result = await request(action, payload);
    const ok = result.status === 200 && result.body && result.body.success !== false;
    return {
      action,
      ok,
      status_label: ok ? 'OK' : classifyError(result.body && (result.body.error || result.body.message), result.status),
      http_status: result.status,
      elapsed_ms: Date.now() - started,
      error: ok ? '' : (result.body && (result.body.error || result.body.message || result.body.status)) || 'unexpected response',
      body: result.body,
    };
  } catch (err) {
    return { action, ok: false, status_label: classifyError(err.message, 0), http_status: 0, elapsed_ms: Date.now() - started, error: err.message, body: null };
  }
}

function classifyBillingRows(billings) {
  const incomplete = [];
  const usable = [];
  billings.forEach((row, index) => {
    const billingId = firstValue(row, ['Billing_ID', 'billing_id', 'billingId', 'id', 'ID']);
    const jobId = firstValue(row, ['Job_ID', 'job_id', 'jobId']);
    const amount = firstValue(row, ['Total_Amount', 'total_amount', 'Amount', 'amount', 'total']);
    const status = firstValue(row, ['Payment_Status', 'payment_status', 'Status', 'status']);
    const item = { row_number: index + 1, billing_id: billingId, job_id: jobId, amount_present: amount !== '', status_present: !!status };
    if (billingId && jobId && amount !== '' && status) usable.push(item);
    else incomplete.push(item);
  });
  return { usable, incomplete };
}

function latestJobWithoutBilling(jobs, billings) {
  const billedJobs = new Set(billings.map(row => firstValue(row, ['Job_ID', 'job_id', 'jobId'])).filter(Boolean));
  for (const job of jobs) {
    const jobId = firstValue(job, ['Job_ID', 'job_id', 'jobId', 'id', 'ID']);
    if (jobId && !billedJobs.has(jobId)) return jobId;
  }
  return '';
}

function buildTriage(staticOnly, liveRows) {
  const findings = [];
  if (staticOnly) {
    return [{
      id: 'token-required',
      area: 'system',
      severity: 'P2',
      classification: 'live_token_required',
      action: 'Set COMPHONE_AUTH_TOKEN for production data triage.',
    }];
  }

  const jobs = rowsFor(liveRows.checkJobs.body || {}, ['jobs', 'data', 'rows', 'items']);
  const billings = rowsFor(liveRows.listBillings.body || {}, ['billings', 'data', 'rows', 'items']);
  const billingSummary = classifyBillingRows(billings);
  const reportSummary = liveRows.getReportData.body || {};
  const dailyRevenue = rowsFor(reportSummary, ['dailyRevenue', 'data.dailyRevenue', 'report.dailyRevenue', 'records', 'data.records']);
  const warranties = rowsFor(liveRows.listWarranties.body || {}, ['warranties', 'data', 'rows', 'items']);
  const repairCandidates = rowsFor(liveRows.previewDataRepair.body || {}, ['candidates', 'data.candidates']);

  billingSummary.incomplete.forEach(row => {
    findings.push({
      id: `billing-row-${row.row_number}`,
      area: 'billing',
      severity: row.billing_id || row.job_id ? 'P1' : 'P2',
      classification: row.billing_id || row.job_id ? 'manual_backfill_required' : 'controlled_repair_candidate',
      action: row.billing_id || row.job_id ? 'Backfill missing Billing fields after owner review.' : 'Use controlled repair only after archive-before-change confirmation.',
      evidence: row,
    });
  });

  const unbilledJob = latestJobWithoutBilling(jobs, billings);
  if (unbilledJob) {
    findings.push({
      id: `job-without-billing-${unbilledJob}`,
      area: 'jobs',
      severity: 'P2',
      classification: 'manual_business_decision',
      action: 'Confirm whether this job should have a billing record before creating/backfilling anything.',
      evidence: { job_id: unbilledJob },
    });
  }

  if (dailyRevenue.length === 0) {
    findings.push({
      id: 'reports-empty-daily-revenue',
      area: 'reports',
      severity: 'P2',
      classification: 'acceptable_empty_state_or_data_gap',
      action: 'Confirm current-period paid billing activity; keep Reports diagnostic empty state if no revenue exists.',
      evidence: { daily_revenue_rows: 0 },
    });
  }

  if (warranties.length === 0) {
    findings.push({
      id: 'warranty-empty-list',
      area: 'warranty',
      severity: 'P3',
      classification: 'acceptable_empty_state_or_source_gap',
      action: 'Confirm warranty source process; no automatic repair is possible until warranty rows exist.',
      evidence: { warranty_rows: 0 },
    });
  }

  return findings.map(item => Object.assign(item, {
    repair_preview_candidates: repairCandidates.length,
    production_mutation: false,
  }));
}

function writeReport(report) {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(REPORT_JSON, JSON.stringify(report, null, 2) + '\n', 'utf8');
  const lines = [
    '# Sprint 139 Data Cleanup Triage',
    '',
    `Status: ${report.status}`,
    `Mode: ${report.mode}`,
    `Findings: ${report.findings.length}`,
    '',
    ...report.findings.map(item => `- [${item.severity}] ${item.id}: ${item.classification} - ${item.action}`),
    '',
  ];
  fs.writeFileSync(REPORT_MD, lines.join('\n'), 'utf8');
  console.log(`[Sprint 139 Data Cleanup Triage] report: ${path.relative(ROOT, REPORT_JSON).replace(/\\/g, '/')}`);
}

async function main() {
  const report = {
    generated_at: new Date().toISOString(),
    gas_url: GAS_URL,
    token_present: !!TOKEN,
    mode: 'read-only-triage-no-repair-execution',
    results: [],
    findings: [],
  };

  if (!TOKEN) {
    report.status = 'warning';
    report.findings = buildTriage(true, {});
    writeReport(report);
    console.log('[Sprint 139 Data Cleanup Triage] SKIP: set COMPHONE_AUTH_TOKEN for live data triage.');
    return;
  }

  for (const [name, action, payload] of [
    ['checkJobs', 'checkJobs', { limit: 20 }],
    ['listBillings', 'listBillings', { limit: 50 }],
    ['getReportData', 'getReportData', { period: 'month' }],
    ['listWarranties', 'listWarranties', { limit: 50 }],
    ['previewDataRepair', 'previewDataRepair', { period: 'month' }],
  ]) {
    report.results[name] = await live(action, payload);
    console.log(`[${name.padEnd(18)}] ${report.results[name].status_label} ${report.results[name].http_status} ${report.results[name].elapsed_ms}ms${report.results[name].error ? ' - ' + report.results[name].error : ''}`);
  }
  report.findings = buildTriage(false, report.results);
  report.status = Object.values(report.results).some(row => !row.ok) ? 'warning' : 'ok';
  report.score = Math.round((Object.values(report.results).filter(row => row.ok).length / Object.values(report.results).length) * 100);
  writeReport(report);
  console.log(`[Sprint 139 Data Cleanup Triage] status=${report.status} score=${report.score}/100 findings=${report.findings.length}`);
}

main().catch(err => {
  console.error('[Sprint 139 Data Cleanup Triage] fatal:', err && err.stack ? err.stack : err);
  process.exit(1);
});
