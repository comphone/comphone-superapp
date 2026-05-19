#!/usr/bin/env node
/*
 * Sprint 134 Data Completeness Review
 *
 * Token-aware, read-only review for the production data gaps that still make
 * some detail/drilldown flows optional: Billing detail linkage, Warranty detail linkage,
 * and current-month report revenue rows.
 *
 * This script never repairs, deletes, writes, or creates Sheet data. It only
 * reads live endpoints and the Data Repair preview, then writes a local report.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REPORT_DIR = path.join(ROOT, 'test_reports');
const REPORT_JSON = path.join(REPORT_DIR, 'sprint134_data_completeness_review_latest.json');
const REPORT_MD = path.join(REPORT_DIR, 'sprint134_data_completeness_review_latest.md');
const gasConfig = fs.readFileSync(path.join(ROOT, 'pwa', 'gas_config.js'), 'utf8');
const urlMatch = gasConfig.match(/url:\s*'([^']+)'/);
const GAS_URL = process.env.COMPHONE_GAS_URL || (urlMatch && urlMatch[1]);
const TOKEN = process.env.COMPHONE_AUTH_TOKEN || '';
const TIMEOUT_MS = Number(process.env.COMPHONE_DATA_COMPLETENESS_TIMEOUT_MS || 30000);
const FAIL_ON_DATA_GAP = /^(1|true|yes)$/i.test(process.env.COMPHONE_DATA_COMPLETENESS_FAIL_ON_GAP || '');

if (!GAS_URL) {
  console.error('[Sprint 134 Data Completeness Review] Missing GAS URL. Set COMPHONE_GAS_URL or update pwa/gas_config.js.');
  process.exit(1);
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function has(text, pattern) {
  return pattern instanceof RegExp ? pattern.test(text) : text.includes(pattern);
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

function okBase(body) {
  return body && body.success !== false && body.status !== 'error';
}

function classify(error, status) {
  const raw = String(error || '').toUpperCase();
  if (status === 401 || /AUTH|TOKEN|SESSION|LOGIN|401/.test(raw)) return 'AUTH_FAIL';
  if (status === 403 || /PERMISSION|FORBIDDEN|DENIED|ROLE|ADMIN ACCESS|403/.test(raw)) return 'PERMISSION';
  if (/NOT_FOUND|UNKNOWN ACTION|NO_HANDLER|FUNCTION NOT FOUND|ACTION/.test(raw)) return 'CONTRACT';
  if (/TIMEOUT|ABORT/.test(raw)) return 'TIMEOUT';
  if (/NETWORK|FAILED TO FETCH|LOAD FAILED|OFFLINE/.test(raw)) return 'NETWORK';
  return 'BACKEND';
}

function staticChecks() {
  const checks = [];
  const files = {
    billing: read('pwa/billing_section.js'),
    reports: read('pwa/reports.js'),
    warranty: read('pwa/section_warranty.js'),
    repairRoot: read('DataRepairConsole.gs'),
    repairClasp: read('clasp-ready/DataRepairConsole.gs'),
    staticGuard: read('scripts/pwa_static_guard.js'),
    regression: read('scripts/regression-guard.sh'),
    workflow: read('.github/workflows/auto-deploy.yml'),
  };
  function check(area, name, ok, detail) {
    checks.push({ area, name, ok: !!ok, detail });
  }
  check('billing', 'missing-job-id-disabled',
    has(files.billing, 'Missing Job_ID') && has(files.billing, 'getBilling'),
    'Billing UI must keep disabling detail/QR actions when a row has no safe Job_ID.');
  check('reports', 'empty-revenue-diagnostic',
    has(files.reports, 'report-empty-state') && has(files.reports, 'getReportData'),
    'Reports must show a diagnostic empty state instead of a blank drilldown.');
  check('warranty', 'job-id-detail-contract',
    has(files.warranty, 'getWarrantyByJobId') && has(files.warranty, 'job_id') && !has(files.warranty, "getWarrantyByJobId', { warranty_id"),
    'Warranty detail must stay on the job_id backend contract and avoid warranty_id mismatch.');
  check('data-repair', 'preview-before-execution',
    has(files.repairRoot, 'previewDataRepair') && has(files.repairRoot, 'archive') &&
      has(files.repairClasp, 'previewDataRepair') && has(files.repairClasp, 'EXECUTE_REVIEWED_DATA_REPAIR'),
    'Data repair must remain preview/archive/owner-confirmation gated in both root and clasp-ready source.');
  check('ci', 'sprint134-wired',
    has(files.staticGuard, 'sprint134_data_completeness_review.js') &&
      has(files.regression, 'sprint134_data_completeness_review.js') &&
      has(files.workflow, 'sprint134_data_completeness_review.js'),
    'Sprint 134 must be wired into static guard, regression guard, and GitHub Actions.');
  return checks;
}

async function runLive(action, payload, summarize) {
  const started = Date.now();
  try {
    const result = await request(action, payload);
    const ok = result.status === 200 && okBase(result.body);
    const summary = ok && summarize ? summarize(result.body) : {};
    return {
      action,
      ok,
      status_label: ok ? 'OK' : classify(result.body && (result.body.error || result.body.message), result.status),
      http_status: result.status,
      elapsed_ms: Date.now() - started,
      error: ok ? '' : (result.body && (result.body.error || result.body.message || result.body.status)) || 'unexpected response',
      summary,
    };
  } catch (err) {
    return {
      action,
      ok: false,
      status_label: classify(err.name === 'AbortError' ? 'timeout' : err.message, 0),
      http_status: 0,
      elapsed_ms: Date.now() - started,
      error: err.name === 'AbortError' ? `timeout after ${TIMEOUT_MS}ms` : err.message,
      summary: {},
    };
  }
}

function selectJobId(jobs) {
  for (const job of jobs || []) {
    const id = firstValue(job, ['job_id', 'Job_ID', 'jobId', 'id', 'ID']);
    if (id) return id;
  }
  return '';
}

function summarizeBillingRows(rows) {
  const usable = [];
  const incomplete = [];
  rows.forEach((row, index) => {
    const billingId = firstValue(row, ['Billing_ID', 'billing_id', 'billingId', 'id', 'ID']);
    const jobId = firstValue(row, ['Job_ID', 'job_id', 'jobId']);
    const amount = firstValue(row, ['Total_Amount', 'total_amount', 'amount', 'total']);
    const paymentStatus = firstValue(row, ['Payment_Status', 'payment_status', 'status']);
    const record = {
      row_number: index + 1,
      billing_id_present: !!billingId,
      job_id_present: !!jobId,
      amount_present: amount !== '',
      payment_status_present: !!paymentStatus,
      job_id: jobId || '',
    };
    if (billingId && jobId && amount !== '' && paymentStatus) usable.push(record);
    else incomplete.push(record);
  });
  return { total: rows.length, usable: usable.length, incomplete: incomplete.length, usable_rows: usable, incomplete_rows: incomplete };
}

function summarizeReport(body) {
  const dailyRevenue = rowsFor(body, ['dailyRevenue', 'data.dailyRevenue', 'report.dailyRevenue', 'records', 'data.records']);
  const billings = rowsFor(body, ['billings', 'data.billings', 'report.billings']);
  const jobs = rowsFor(body, ['jobs', 'data.jobs', 'report.jobs']);
  return {
    daily_revenue_rows: dailyRevenue.length,
    billing_rows: billings.length,
    job_rows: jobs.length,
    empty_daily_revenue: dailyRevenue.length === 0,
  };
}

function summarizeWarranties(rows) {
  const detailReady = [];
  const missingJob = [];
  rows.forEach((row, index) => {
    const jobId = firstValue(row, ['Job_ID', 'job_id', 'jobId']);
    const warrantyId = firstValue(row, ['Warranty_ID', 'warranty_id', 'warrantyId', 'id', 'ID']);
    const record = { row_number: index + 1, warranty_id_present: !!warrantyId, job_id_present: !!jobId, job_id: jobId || '' };
    if (jobId) detailReady.push(record);
    else missingJob.push(record);
  });
  return { total: rows.length, detail_ready: detailReady.length, missing_job_id: missingJob.length, detail_ready_rows: detailReady, missing_job_id_rows: missingJob };
}

function summarizeRepairPreview(body) {
  const candidates = rowsFor(body, ['candidates', 'data.candidates', 'preview.candidates', 'tasks', 'data.tasks']);
  const executable = candidates.filter(row => row && (row.executable || row.can_execute || row.safe_to_execute)).length;
  return {
    candidate_count: candidates.length,
    executable_count: executable,
    archive_before_change: /archive/i.test(JSON.stringify(body || {})),
    audit_before_change: /audit/i.test(JSON.stringify(body || {})),
  };
}

function dataGapFindings(state) {
  const findings = [];
  if (state.billing && state.billing.incomplete > 0) {
    findings.push({
      area: 'Billing',
      severity: 'data-gap',
      detail: `${state.billing.incomplete}/${state.billing.total} Billing rows are incomplete and cannot be used as safe detail sources.`,
      next_step: 'Review DB_BILLING preview candidate; repair only after archive-before-change and owner confirmation.',
    });
  }
  if (state.latestJobId && state.billingDetail && (state.billingDetail.status_label === 'WARN' || !state.billingDetail.ok)) {
    findings.push({
      area: 'Billing',
      severity: 'optional-gap',
      detail: `Latest Job ${state.latestJobId} has no readable Billing detail in the current production data.`,
      next_step: 'Confirm whether this job should have a Billing row before creating or repairing records.',
    });
  }
  if (state.report && state.report.empty_daily_revenue) {
    findings.push({
      area: 'Reports',
      severity: 'business-review',
      detail: 'Current-month report is healthy but daily revenue rows are empty.',
      next_step: 'Confirm whether there was real revenue in the selected period before changing report logic.',
    });
  }
  if (state.warranty && state.warranty.total === 0) {
    findings.push({
      area: 'Warranty',
      severity: 'empty-data',
      detail: 'Warranty list is live and healthy but currently returns no rows.',
      next_step: 'Confirm whether warranty data should exist; no detail repair is possible without source rows.',
    });
  } else if (state.warranty && state.warranty.missing_job_id > 0) {
    findings.push({
      area: 'Warranty',
      severity: 'data-gap',
      detail: `${state.warranty.missing_job_id}/${state.warranty.total} Warranty rows lack Job_ID for detail lookup.`,
      next_step: 'Repair warranty Job_ID linkage only after preview and owner approval.',
    });
  }
  return findings;
}

async function liveReview() {
  const live = [];
  const state = {};

  const jobs = await runLive('checkJobs', { limit: 20 }, body => {
    const rows = rowsFor(body, ['jobs', 'items', 'data.jobs', 'data.items', 'data']);
    const latestJobId = selectJobId(rows);
    state.latestJobId = latestJobId;
    return { total: rows.length, latest_job_id_present: !!latestJobId, latest_job_id: latestJobId };
  });
  live.push(Object.assign({ area: 'Jobs' }, jobs));

  const billings = await runLive('listBillings', { limit: 50 }, body => {
    const summary = summarizeBillingRows(rowsFor(body, ['billings', 'items', 'data.billings', 'data.items', 'data', 'rows']));
    state.billing = summary;
    const usableJobId = (summary.usable_rows[0] && summary.usable_rows[0].job_id) || '';
    state.billingUsableJobId = usableJobId;
    return Object.assign({ usable_job_id: usableJobId }, summary);
  });
  live.push(Object.assign({ area: 'Billing' }, billings));

  const billingDetailJobId = state.billingUsableJobId || state.latestJobId || '';
  if (billingDetailJobId) {
    const billingDetail = await runLive('getBilling', { job_id: billingDetailJobId }, body => ({
      requested_job_id: billingDetailJobId,
      has_billing: !!(body.billing || body.data || body.record),
      source: state.billingUsableJobId ? 'usable billing row' : 'latest job fallback',
    }));
    if (!billingDetail.ok && billingDetail.http_status === 200 && /not found/i.test(String(billingDetail.error || ''))) {
      billingDetail.ok = true;
      billingDetail.status_label = 'WARN';
    }
    state.billingDetail = billingDetail;
    live.push(Object.assign({ area: 'Billing' }, billingDetail));
  } else {
    state.billingDetail = {
      action: 'getBilling',
      ok: true,
      status_label: 'SKIP',
      http_status: 0,
      elapsed_ms: 0,
      error: 'No Job_ID source available for safe getBilling review.',
      summary: {},
    };
    live.push(Object.assign({ area: 'Billing' }, state.billingDetail));
  }

  const report = await runLive('getReportData', { period: 'month' }, body => {
    const summary = summarizeReport(body);
    state.report = summary;
    return summary;
  });
  live.push(Object.assign({ area: 'Reports' }, report));

  const warranties = await runLive('listWarranties', { limit: 50 }, body => {
    const summary = summarizeWarranties(rowsFor(body, ['warranties', 'items', 'data.warranties', 'data.items', 'data', 'rows']));
    state.warranty = summary;
    return summary;
  });
  live.push(Object.assign({ area: 'Warranty' }, warranties));

  const repairPreview = await runLive('previewDataRepair', { period: 'month' }, body => {
    const summary = summarizeRepairPreview(body);
    state.repair = summary;
    return summary;
  });
  live.push(Object.assign({ area: 'Data Repair' }, repairPreview));

  return { live, state, findings: dataGapFindings(state) };
}

function writeReports(report) {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(REPORT_JSON, JSON.stringify(report, null, 2) + '\n', 'utf8');
  fs.writeFileSync(REPORT_MD, [
    '# Sprint 134 Data Completeness Review',
    '',
    `- Generated: ${report.generated_at}`,
    `- Status: ${report.status}`,
    `- Token present: ${report.token_present ? 'yes' : 'no'}`,
    `- Static checks: ${report.summary.static_pass}/${report.summary.static_total}`,
    `- Live checks: ${report.summary.live_pass}/${report.summary.live_total}`,
    `- Data findings: ${report.summary.data_findings}`,
    '',
    '## Findings',
    '',
    report.findings.length ? '| Area | Severity | Detail | Next Step |\n|---|---|---|---|\n' +
      report.findings.map(row => `| ${row.area} | ${row.severity} | ${row.detail} | ${row.next_step} |`).join('\n') : 'No blocking data findings in this run.',
    '',
    '## Live Checks',
    '',
    '| Area | Action | Result | HTTP | Time |',
    '|---|---|---:|---:|---:|',
    ...report.live_results.map(row => `| ${row.area} | ${row.action} | ${row.status_label} | ${row.http_status} | ${row.elapsed_ms}ms |`),
    '',
  ].join('\n'), 'utf8');
}

async function main() {
  const staticResults = staticChecks();
  const staticFailures = staticResults.filter(row => !row.ok);
  const report = {
    generated_at: new Date().toISOString(),
    version: 'sprint134-data-completeness-review-1.0.0',
    focus: 'read-only production data completeness review for Billing, Reports, Warranty, and Data Repair preview',
    gas_url: GAS_URL,
    token_present: !!TOKEN,
    fail_on_data_gap: FAIL_ON_DATA_GAP,
    status: 'pending',
    summary: {
      static_total: staticResults.length,
      static_pass: staticResults.filter(row => row.ok).length,
      static_fail: staticFailures.length,
      live_total: 0,
      live_pass: 0,
      live_fail: 0,
      live_skipped: 0,
      data_findings: 0,
    },
    static_checks: staticResults,
    live_results: [],
    findings: [],
  };

  if (!TOKEN) {
    report.summary.live_skipped = 1;
    report.live_results.push({
      area: 'safety',
      action: 'data-completeness-live-gate',
      ok: true,
      status_label: 'SKIP',
      http_status: 0,
      elapsed_ms: 0,
      error: 'set COMPHONE_AUTH_TOKEN to run protected data completeness review',
      summary: {},
    });
  } else {
    const review = await liveReview();
    report.live_results = review.live;
    report.findings = review.findings;
  }

  report.summary.live_total = report.live_results.length;
  report.summary.live_pass = report.live_results.filter(row => row.ok).length;
  report.summary.live_fail = report.live_results.filter(row => !row.ok).length;
  report.summary.data_findings = report.findings.length;

  if (staticFailures.length || report.summary.live_fail || (FAIL_ON_DATA_GAP && report.findings.length)) {
    report.status = 'fail';
  } else if (!TOKEN || report.findings.length) {
    report.status = 'warning';
  } else {
    report.status = 'ok';
  }

  writeReports(report);
  report.live_results.forEach(row => {
    console.log(`[${row.area.padEnd(12)}] ${row.action}: ${row.status_label} ${row.http_status || 0} ${row.elapsed_ms || 0}ms${row.error ? ' - ' + row.error : ''}`);
  });
  report.findings.forEach(row => console.log(`[finding] ${row.area}: ${row.detail}`));
  console.log(`[Sprint 134 Data Completeness Review] status=${report.status} findings=${report.findings.length}`);
  console.log(`[Sprint 134 Data Completeness Review] report: ${path.relative(ROOT, REPORT_JSON).replace(/\\/g, '/')}`);
  if (report.status === 'fail') process.exit(1);
}

main().catch(err => {
  console.error('[Sprint 134 Data Completeness Review] FAILED');
  console.error(err);
  process.exit(1);
});
