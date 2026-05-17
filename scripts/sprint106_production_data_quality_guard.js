#!/usr/bin/env node
/*
 * Sprint 106 Production Data Quality Guard
 *
 * Token-aware, read-only data quality guard. CI can run without secrets and
 * exits safely. With COMPHONE_AUTH_TOKEN it checks production list/read shapes
 * for incomplete records that make detail screens skip or look empty.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REPORT_DIR = path.join(ROOT, 'test_reports');
const REPORT_JSON = path.join(REPORT_DIR, 'sprint106_production_data_quality_latest.json');
const REPORT_MD = path.join(REPORT_DIR, 'sprint106_production_data_quality_latest.md');
const gasConfig = fs.readFileSync(path.join(ROOT, 'pwa', 'gas_config.js'), 'utf8');
const urlMatch = gasConfig.match(/url:\s*'([^']+)'/);
const GAS_URL = process.env.COMPHONE_GAS_URL || (urlMatch && urlMatch[1]);
const TOKEN = process.env.COMPHONE_AUTH_TOKEN || '';
const TIMEOUT_MS = Number(process.env.COMPHONE_LIVE_QA_TIMEOUT_MS || 30000);
const FAIL_ON_DATA_WARN = /^(1|true|yes)$/i.test(process.env.COMPHONE_DATA_QUALITY_FAIL_ON_WARN || '');

if (!GAS_URL) {
  console.error('[Sprint 106 Production Data Quality] Missing GAS URL.');
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

function normalizeArray(body, keys) {
  for (const key of keys) {
    const value = nestedValue(body, key);
    if (Array.isArray(value)) return value;
  }
  return [];
}

function hasObject(body, keys) {
  return keys.some(key => {
    const value = nestedValue(body, key);
    return value && typeof value === 'object' && !Array.isArray(value);
  });
}

function firstValue(body, keys) {
  for (const key of keys) {
    const value = nestedValue(body, key);
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return '';
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

function sanitizePayload(payload) {
  const copy = Object.assign({}, payload || {});
  Object.keys(copy).forEach(key => {
    if (copy[key] && typeof copy[key] === 'object') copy[key] = JSON.stringify(copy[key]);
  });
  return copy;
}

async function request(action, payload = {}) {
  const qs = new URLSearchParams(Object.assign({ action, _t: Date.now() }, sanitizePayload(payload)));
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

function staticChecks() {
  const checks = [];
  const apiContract = read('pwa/api_contract.js');
  const sprint105 = read('scripts/sprint105_record_detail_completeness.js');
  const workflow = read('.github/workflows/auto-deploy.yml');
  const regression = read('scripts/regression-guard.sh');
  const staticGuard = read('scripts/pwa_static_guard.js');

  function check(area, name, ok, detail, severity = 'P0') {
    checks.push({ area, name, ok: !!ok, severity, detail });
  }

  check('api_contract', 'billing-list-first-class',
    has(apiContract, "id: 'billing'") &&
      has(apiContract, "action: 'listBillings'") &&
      has(apiContract, "action: 'getBilling'"),
    'Billing menu contract must include listBillings and getBilling.');

  check('detail_guard', 'sprint105-record-source-safe',
    has(sprint105, 'No source record available for this detail read') &&
      has(sprint105, 'billingJobId') &&
      has(sprint105, 'listBillings'),
    'Sprint 105 must skip billing detail safely when no usable Job_ID source exists.');

  check('ci_contract', 'sprint106-wired',
    has(workflow, 'sprint106_production_data_quality_guard.js') &&
      has(regression, 'sprint106_production_data_quality_guard.js') &&
      has(staticGuard, 'sprint106_production_data_quality_guard.js'),
    'Sprint 106 production data quality guard must be wired into Actions, regression guard, and static guard.',
    'P1');

  return checks;
}

function summarizeBillingRows(rows) {
  const incomplete = [];
  const usable = [];
  rows.forEach((row, index) => {
    const billingId = firstValue(row, ['Billing_ID', 'billing_id', 'id', 'ID']);
    const jobId = firstValue(row, ['Job_ID', 'job_id', 'jobId']);
    const amount = firstValue(row, ['Total_Amount', 'total_amount', 'amount', 'total']);
    const status = firstValue(row, ['Payment_Status', 'payment_status', 'status']);
    const complete = !!(billingId && jobId && amount !== '' && status);
    const safeRow = {
      row_number: index + 1,
      billing_id_present: !!billingId,
      job_id_present: !!jobId,
      amount_present: amount !== '',
      status_present: !!status,
    };
    if (complete) usable.push(safeRow);
    else incomplete.push(safeRow);
  });
  return {
    total: rows.length,
    usable: usable.length,
    incomplete: incomplete.length,
    incomplete_rows: incomplete,
    recommendation: incomplete.length
      ? 'Review DB_BILLING rows with missing Billing_ID, Job_ID, amount, or Payment_Status before relying on Billing detail drilldowns.'
      : '',
  };
}

function summarizeJobs(rows) {
  const missingId = rows
    .map((row, index) => ({ row_number: index + 1, has_id: !!firstValue(row, ['Job_ID', 'job_id', 'jobId', 'id', 'ID']) }))
    .filter(row => !row.has_id);
  return {
    total: rows.length,
    missing_id: missingId.length,
    missing_id_rows: missingId,
    recommendation: missingId.length ? 'Review Jobs rows without a job id; timeline/detail reads need a stable identifier.' : '',
  };
}

function summarizeReports(body) {
  const records = normalizeArray(body, ['dailyRevenue', 'data.dailyRevenue', 'records', 'data.records']);
  return {
    has_data_object: hasObject(body, ['data', 'summary']),
    records: records.length,
    empty_period: records.length === 0,
    recommendation: records.length === 0
      ? 'Report API is healthy but the selected month has no daily revenue records; verify this matches business data.'
      : '',
  };
}

async function liveChecks() {
  const rows = [];
  const state = { warnings: 0, failures: 0 };

  async function run(step) {
    const started = Date.now();
    try {
      const payload = Object.assign({}, step.payload || {});
      if (step.protected) payload.token = TOKEN;
      const result = await request(step.action, payload);
      const elapsed = Date.now() - started;
      const ok = result.status === 200 && okBase(result.body);
      const summary = ok && step.summarize ? step.summarize(result.body) : {};
      const warning = ok && step.warnIf ? step.warnIf(summary, result.body) : '';
      if (!ok) state.failures += 1;
      if (warning) state.warnings += 1;
      const row = {
        area: step.area,
        action: step.action,
        ok,
        warning: warning || '',
        status_label: ok ? (warning ? 'WARN' : 'OK') : classify(result.body && (result.body.error || result.body.message), result.status),
        http_status: result.status,
        elapsed_ms: elapsed,
        summary,
        recommendation: warning || summary.recommendation || '',
      };
      rows.push(row);
      console.log(`[${step.area.padEnd(10)}] ${step.action}: ${row.status_label} ${row.http_status} ${row.elapsed_ms}ms${row.warning ? ' - ' + row.warning : ''}`);
    } catch (err) {
      state.failures += 1;
      const row = {
        area: step.area,
        action: step.action,
        ok: false,
        warning: '',
        status_label: classify(err.name === 'AbortError' ? 'timeout' : err.message),
        http_status: 0,
        elapsed_ms: Date.now() - started,
        summary: {},
        recommendation: err.name === 'AbortError' ? `timeout after ${TIMEOUT_MS}ms` : err.message,
      };
      rows.push(row);
      console.log(`[${step.area.padEnd(10)}] ${step.action}: ${row.status_label} 0 ${row.elapsed_ms}ms - ${row.recommendation}`);
    }
  }

  await run({
    area: 'system',
    action: 'health',
    protected: false,
    summarize: body => ({ status: body.status || '', version: body.version || '' }),
  });
  await run({
    area: 'jobs',
    action: 'checkJobs',
    protected: true,
    payload: { limit: 20 },
    summarize: body => summarizeJobs(normalizeArray(body, ['jobs', 'items', 'data.jobs', 'data.items', 'data'])),
    warnIf: summary => summary.missing_id ? summary.recommendation : '',
  });
  await run({
    area: 'billing',
    action: 'listBillings',
    protected: true,
    payload: { limit: 20 },
    summarize: body => summarizeBillingRows(normalizeArray(body, ['billings', 'items', 'data.billings', 'data.items', 'data'])),
    warnIf: summary => summary.incomplete ? summary.recommendation : '',
  });
  await run({
    area: 'reports',
    action: 'getReportData',
    protected: true,
    payload: { period: 'month' },
    summarize: summarizeReports,
    warnIf: summary => summary.empty_period ? summary.recommendation : '',
  });

  return { rows, warnings: state.warnings, failures: state.failures };
}

function writeReports(report) {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(REPORT_JSON, JSON.stringify(report, null, 2) + '\n', 'utf8');
  fs.writeFileSync(REPORT_MD, [
    '# Sprint 106 Production Data Quality Guard',
    '',
    `- Generated: ${report.generated_at}`,
    `- Status: ${report.status}`,
    `- Score: ${report.score}/100`,
    `- Token present: ${report.token_present ? 'yes' : 'no'}`,
    `- Static checks: ${report.summary.static_pass}/${report.summary.static_total}`,
    `- Live warnings: ${report.summary.live_warnings}`,
    `- Live failures: ${report.summary.live_failures}`,
    '',
    '## Static Contracts',
    '',
    '| Area | Check | Result | Detail |',
    '|---|---|---|---|',
    ...report.static_checks.map(row => `| ${row.area} | ${row.name} | ${row.ok ? 'OK' : row.severity} | ${row.detail} |`),
    '',
    '## Live Data Quality',
    '',
    '| Area | Action | Result | HTTP | Time | Recommendation |',
    '|---|---|---|---:|---:|---|',
    ...report.live_results.map(row => `| ${row.area} | ${row.action} | ${row.status_label} | ${row.http_status} | ${row.elapsed_ms}ms | ${row.recommendation || ''} |`),
    '',
  ].join('\n'), 'utf8');
}

async function main() {
  const staticResults = staticChecks();
  const staticFailures = staticResults.filter(row => !row.ok && row.severity === 'P0');
  const report = {
    generated_at: new Date().toISOString(),
    version: 'sprint106-production-data-quality-1.0.0',
    focus: 'read-only production data quality for Jobs, Billing, and Reports',
    gas_url: GAS_URL,
    token_present: !!TOKEN,
    fail_on_data_warn: FAIL_ON_DATA_WARN,
    status: 'pending',
    score: 0,
    summary: {
      static_total: staticResults.length,
      static_pass: staticResults.filter(row => row.ok).length,
      static_fail: staticResults.filter(row => !row.ok).length,
      live_warnings: 0,
      live_failures: 0,
      live_skipped: 0,
    },
    static_checks: staticResults,
    live_results: [],
  };

  if (!TOKEN) {
    report.summary.live_skipped = 3;
    report.live_results.push({
      area: 'protected',
      action: 'operator-token-required',
      ok: true,
      warning: '',
      status_label: 'SKIP',
      http_status: 0,
      elapsed_ms: 0,
      summary: {},
      recommendation: 'Set COMPHONE_AUTH_TOKEN from a fresh login session to run live production data quality checks.',
    });
  } else {
    const live = await liveChecks();
    report.live_results = live.rows;
    report.summary.live_warnings = live.warnings;
    report.summary.live_failures = live.failures;
  }

  const total = report.summary.static_total + report.live_results.length;
  const passed = report.summary.static_pass + report.live_results.filter(row => row.ok).length;
  report.score = total ? Math.round((passed / total) * 100) : 0;

  if (staticFailures.length || report.summary.live_failures || (FAIL_ON_DATA_WARN && report.summary.live_warnings)) {
    report.status = 'fail';
  } else if (report.summary.static_fail || report.summary.live_warnings || !TOKEN) {
    report.status = 'warning';
  } else {
    report.status = 'ok';
  }

  writeReports(report);
  console.log(`[Sprint 106 Production Data Quality] status=${report.status} score=${report.score}/100 warnings=${report.summary.live_warnings} failures=${report.summary.live_failures}`);
  console.log(`[Sprint 106 Production Data Quality] report: ${path.relative(ROOT, REPORT_JSON).replace(/\\/g, '/')}`);
  if (report.status === 'fail') process.exit(1);
}

main().catch(err => {
  console.error('[Sprint 106 Production Data Quality] FAILED:', err.message);
  process.exit(1);
});
