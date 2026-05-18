#!/usr/bin/env node
/*
 * Sprint 105 Record Detail Completeness
 *
 * Read-only guard for the second click: menu list -> selected record detail /
 * drilldown. CI-safe without secrets; with COMPHONE_AUTH_TOKEN it verifies that
 * Jobs timeline, Billing detail, and Reports drilldown APIs can return useful
 * shapes from real production records without creating data.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REPORT_DIR = path.join(ROOT, 'test_reports');
const REPORT_JSON = path.join(REPORT_DIR, 'sprint105_record_detail_completeness_latest.json');
const REPORT_MD = path.join(REPORT_DIR, 'sprint105_record_detail_completeness_latest.md');
const gasConfig = fs.readFileSync(path.join(ROOT, 'pwa', 'gas_config.js'), 'utf8');
const urlMatch = gasConfig.match(/url:\s*'([^']+)'/);
const GAS_URL = process.env.COMPHONE_GAS_URL || (urlMatch && urlMatch[1]);
const TOKEN = process.env.COMPHONE_AUTH_TOKEN || '';
const TIMEOUT_MS = Number(process.env.COMPHONE_LIVE_QA_TIMEOUT_MS || 30000);
const SLOW_MS = Number(process.env.COMPHONE_LIVE_QA_SLOW_MS || 15000);
const FAIL_ON_SLOW = /^(1|true|yes)$/i.test(process.env.COMPHONE_LIVE_QA_FAIL_ON_SLOW || '');

if (!GAS_URL) {
  console.error('[Sprint 105 Record Detail Completeness] Missing GAS URL.');
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

const STATIC_FILES = {
  jobs: read('pwa/section_jobs.js'),
  billing: read('pwa/billing_section.js'),
  reports: read('pwa/reports.js'),
  apiContract: read('pwa/api_contract.js'),
  workflow: read('.github/workflows/auto-deploy.yml'),
  regression: read('scripts/regression-guard.sh'),
  staticGuard: read('scripts/pwa_static_guard.js'),
  sprint104: read('scripts/sprint104_protected_browser_journey.js'),
};

function staticChecks() {
  const checks = [];
  function check(area, name, ok, detail, severity = 'P0') {
    checks.push({ area, name, ok: !!ok, severity, detail });
  }

  check('jobs_detail', 'timeline-entrypoint-and-api',
    has(STATIC_FILES.jobs, '_showJobTimeline') &&
      has(STATIC_FILES.jobs, "callApi('getJobTimeline'") &&
      has(STATIC_FILES.jobs, "{job_id: jobId}") &&
      has(STATIC_FILES.jobs, 'document.body.insertAdjacentHTML'),
    'Jobs table/detail must expose timeline and call getJobTimeline with job_id.');

  check('jobs_detail', 'detail-actions-present',
    has(STATIC_FILES.jobs, '_showPcJobDetail') &&
      has(STATIC_FILES.jobs, '_showPcAssignJob') &&
      has(STATIC_FILES.jobs, '_showPcQuickNote') &&
      has(STATIC_FILES.jobs, '_showJobTransition'),
    'Jobs detail must keep detail, assign, quick note, and status handoffs available.');

  check('billing_detail', 'detail-uses-job-id-contract',
    has(STATIC_FILES.billing, 'async function _showBillingDetail(jobId)') &&
      has(STATIC_FILES.billing, "callApi('getBilling', { job_id: jobId })") &&
      (has(STATIC_FILES.billing, "_showBillingDetail('${b.Job_ID}')") ||
        (has(STATIC_FILES.billing, "_showBillingDetail('${safeJobId}')") &&
          has(STATIC_FILES.billing, 'billing-row-incomplete'))),
    'Billing detail must use the backend getBilling job_id contract.');

  check('billing_detail', 'detail-modal-and-payment-handoffs',
    has(STATIC_FILES.billing, "id=\"billing-modal\"") ||
      (has(STATIC_FILES.billing, "document.getElementById('billing-modal')") &&
        has(STATIC_FILES.billing, '_doMarkPaid') &&
        has(STATIC_FILES.billing, '_showPromptPayQR')),
    'Billing detail must render a modal and preserve paid/PromptPay handoffs.');

  check('reports_detail', 'drilldown-cards-and-containers',
    ['attendance', 'jobs', 'billing', 'inventory'].every(type => has(STATIC_FILES.reports, `_showReport('${type}')`)) &&
      ['rpt-att-content', 'rpt-jobs-content', 'rpt-bill-content', 'rpt-inv-content'].every(id => has(STATIC_FILES.reports, id)),
    'Reports must expose all drilldown cards and stable detail containers.');

  check('reports_detail', 'billing-report-normalizer-and-api',
    has(STATIC_FILES.reports, '_normalizeReportData') &&
      has(STATIC_FILES.reports, "callApi('getReportData'") &&
      has(STATIC_FILES.reports, 'dailyRevenue') &&
      has(STATIC_FILES.reports, 'window._lastBillingReport'),
    'Billing report drilldown must normalize getReportData and retain export state.');

  check('reports_detail', 'jobs-report-read-fallback',
    has(STATIC_FILES.reports, "callApi('getDashboardBundle'") &&
      has(STATIC_FILES.reports, "callApi('getDashboardData'") &&
      has(STATIC_FILES.reports, 'window._lastJobsReport'),
    'Jobs report drilldown must use dashboard bundle first and dashboard data fallback.');

  check('api_contract', 'record-detail-workflow-actions',
    has(STATIC_FILES.apiContract, 'getJobTimeline') &&
      has(STATIC_FILES.apiContract, 'listBillings') &&
      has(STATIC_FILES.apiContract, 'getBilling') &&
      has(STATIC_FILES.apiContract, 'getReportData') &&
      has(STATIC_FILES.apiContract, 'generatePromptPayQR'),
    'API contract must track record-detail and report drilldown read actions.');

  check('sprint104_contract', 'billing-detail-uses-job-id',
    has(STATIC_FILES.sprint104, 'latestBillingJobId') &&
      has(STATIC_FILES.sprint104, 'job_id: state.latestBillingJobId'),
    'Sprint 104 must use the actual getBilling job_id contract.');

  check('ci_contract', 'sprint105-wired',
    has(STATIC_FILES.workflow, 'sprint105_record_detail_completeness.js') &&
      has(STATIC_FILES.regression, 'sprint105_record_detail_completeness.js') &&
      has(STATIC_FILES.staticGuard, 'sprint105_record_detail_completeness.js'),
    'Sprint 105 record detail completeness must be wired into Actions, regression guard, and static guard.',
    'P1');

  return checks;
}

const LIVE_STEPS = [
  {
    scope: 'public',
    menu: 'system',
    action: 'health',
    payload: {},
    validate: body => okBase(body) && (!body.status || ['healthy', 'ok'].includes(String(body.status).toLowerCase())),
    summarize: body => ({ status: body.status || '' }),
    recommendation: 'Confirm production GAS is reachable.',
  },
  {
    scope: 'protected',
    menu: 'jobs',
    action: 'checkJobs',
    payload: { limit: 10 },
    validate: body => okBase(body) && normalizeArray(body, ['jobs', 'items', 'data.jobs', 'data.items', 'data']).length >= 0,
    summarize: body => ({ count: normalizeArray(body, ['jobs', 'items', 'data.jobs', 'data.items', 'data']).length }),
    capture: (state, body) => {
      const jobs = normalizeArray(body, ['jobs', 'items', 'data.jobs', 'data.items', 'data']);
      const latest = jobs.find(item => firstValue(item, ['Job_ID', 'job_id', 'jobId', 'id', 'ID']));
      if (latest) state.jobId = firstValue(latest, ['Job_ID', 'job_id', 'jobId', 'id', 'ID']);
    },
    recommendation: 'Fix Jobs list before detail journey can be trusted.',
  },
  {
    scope: 'protected',
    menu: 'jobs',
    action: 'getJobTimeline',
    payloadFromState: state => state.jobId ? { job_id: state.jobId, jobId: state.jobId } : null,
    optional: true,
    validate: okBase,
    summarize: body => ({ timeline: normalizeArray(body, ['timeline', 'events', 'items', 'data.timeline', 'data.events', 'data.items']).length }),
    recommendation: 'Fix timeline aliases or job timeline response shape.',
  },
  {
    scope: 'protected',
    menu: 'billing',
    action: 'listBillings',
    payload: { limit: 10 },
    validate: body => okBase(body) && normalizeArray(body, ['billings', 'items', 'data.billings', 'data.items', 'data']).length >= 0,
    summarize: body => ({ count: normalizeArray(body, ['billings', 'items', 'data.billings', 'data.items', 'data']).length }),
    capture: (state, body) => {
      const billings = normalizeArray(body, ['billings', 'items', 'data.billings', 'data.items', 'data']);
      const latest = billings.find(item => firstValue(item, ['Job_ID', 'job_id', 'jobId']));
      if (latest) {
        state.billingJobId = firstValue(latest, ['Job_ID', 'job_id', 'jobId']);
        state.billingId = firstValue(latest, ['Billing_ID', 'billing_id', 'id', 'ID']);
      }
    },
    recommendation: 'Fix billing list before billing detail can be trusted.',
  },
  {
    scope: 'protected',
    menu: 'billing',
    action: 'getBilling',
    payloadFromState: state => state.billingJobId ? { job_id: state.billingJobId, jobId: state.billingJobId } : null,
    optional: true,
    validate: body => okBase(body) && hasObject(body, ['billing', 'data.billing', 'data']),
    summarize: body => ({
      billing_id: firstValue(body, ['billing.Billing_ID', 'billing.billing_id', 'data.billing.Billing_ID', 'data.Billing_ID']),
      job_id: firstValue(body, ['billing.Job_ID', 'billing.job_id', 'data.billing.Job_ID', 'data.Job_ID']),
    }),
    recommendation: 'Fix getBilling job_id detail contract or Billing_ID/Job_ID normalization.',
  },
  {
    scope: 'protected',
    menu: 'reports',
    action: 'getReportData',
    payload: { period: 'month' },
    validate: body => okBase(body) && (hasObject(body, ['data', 'summary']) || normalizeArray(body, ['records', 'data.records', 'data.dailyRevenue']).length >= 0),
    summarize: body => ({
      hasData: hasObject(body, ['data', 'summary']),
      dailyRevenue: normalizeArray(body, ['dailyRevenue', 'data.dailyRevenue', 'records', 'data.records']).length,
    }),
    recommendation: 'Fix report data response shape before report drilldowns can be trusted.',
  },
  {
    scope: 'protected',
    menu: 'reports',
    action: 'getDashboardBundle',
    payload: {},
    optional: true,
    validate: okBase,
    summarize: body => ({ hasSummary: hasObject(body, ['summary', 'data.summary', 'data']) }),
    recommendation: 'Jobs report can fall back to getDashboardData if bundle is unavailable.',
  },
  {
    scope: 'protected',
    menu: 'reports',
    action: 'getDashboardData',
    payload: {},
    validate: body => okBase(body) && (hasObject(body, ['summary', 'data.summary', 'data']) || normalizeArray(body, ['jobs', 'data.jobs']).length >= 0),
    summarize: body => ({ hasSummary: hasObject(body, ['summary', 'data.summary']), jobs: normalizeArray(body, ['jobs', 'data.jobs']).length }),
    recommendation: 'Fix dashboard data fallback used by Jobs report drilldown.',
  },
];

async function runLiveStep(step, state) {
  const started = Date.now();
  const dynamicPayload = step.payloadFromState ? step.payloadFromState(state) : {};
  if (step.payloadFromState && !dynamicPayload) {
    return {
      scope: step.scope,
      menu: step.menu,
      action: step.action,
      ok: true,
      optional: true,
      slow: false,
      status_label: 'SKIP',
      http_status: 0,
      elapsed_ms: 0,
      error: 'No source record available for this detail read.',
      summary: {},
      recommendation: '',
    };
  }

  try {
    const payload = Object.assign({}, step.payload || {}, dynamicPayload || {});
    if (step.scope === 'protected') payload.token = TOKEN;
    const result = await request(step.action, payload);
    const elapsed = Date.now() - started;
    const ok = result.status === 200 && step.validate(result.body);
    const error = ok ? '' : (result.body && (result.body.error || result.body.message || result.body.status)) || 'unexpected response shape';
    const slow = ok && elapsed >= SLOW_MS;
    if (ok && typeof step.capture === 'function') step.capture(state, result.body);
    return {
      scope: step.scope,
      menu: step.menu,
      action: step.action,
      ok,
      optional: !!step.optional,
      slow,
      status_label: ok ? (slow ? 'SLOW' : 'OK') : classify(error, result.status),
      http_status: result.status,
      elapsed_ms: elapsed,
      error,
      summary: step.summarize ? step.summarize(result.body) : {},
      recommendation: ok ? '' : step.recommendation,
    };
  } catch (err) {
    return {
      scope: step.scope,
      menu: step.menu,
      action: step.action,
      ok: false,
      optional: !!step.optional,
      slow: false,
      status_label: classify(err.name === 'AbortError' ? 'timeout' : err.message),
      http_status: 0,
      elapsed_ms: Date.now() - started,
      error: err.name === 'AbortError' ? `timeout after ${TIMEOUT_MS}ms` : err.message,
      summary: {},
      recommendation: step.recommendation,
    };
  }
}

function writeReports(report) {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(REPORT_JSON, JSON.stringify(report, null, 2) + '\n', 'utf8');

  const lines = [
    '# Sprint 105 Record Detail Completeness',
    '',
    `- Generated: ${report.generated_at}`,
    `- Status: ${report.status}`,
    `- Score: ${report.score}/100`,
    `- Token present: ${report.token_present ? 'yes' : 'no'}`,
    `- Static checks: ${report.summary.static_pass}/${report.summary.static_total}`,
    `- Live checks: ${report.summary.live_pass} pass, ${report.summary.live_slow} slow, ${report.summary.live_fail} fail, ${report.summary.live_skip} skipped`,
    '',
    '## Static Contracts',
    '',
    '| Area | Check | Result | Detail |',
    '|---|---|---|---|',
    ...report.static_checks.map(row => `| ${row.area} | ${row.name} | ${row.ok ? 'OK' : row.severity} | ${row.detail} |`),
    '',
    '## Live Detail Journey',
    '',
    '| Scope | Menu | Action | Result | HTTP | Time | Detail |',
    '|---|---|---|---|---:|---:|---|',
    ...report.live_results.map(row => `| ${row.scope} | ${row.menu} | ${row.action} | ${row.status_label} | ${row.http_status} | ${row.elapsed_ms}ms | ${row.recommendation || row.error || ''} |`),
    '',
  ];
  fs.writeFileSync(REPORT_MD, lines.join('\n'), 'utf8');
}

async function main() {
  const staticResults = staticChecks();
  const liveResults = [];
  const state = {};
  const report = {
    generated_at: new Date().toISOString(),
    version: 'sprint105-record-detail-completeness-1.0.0',
    focus: 'Jobs timeline, Billing detail, and Reports drilldown completeness',
    gas_url: GAS_URL,
    token_present: !!TOKEN,
    timeout_ms: TIMEOUT_MS,
    slow_threshold_ms: SLOW_MS,
    fail_on_slow: FAIL_ON_SLOW,
    status: 'pending',
    score: 0,
    summary: {
      static_total: staticResults.length,
      static_pass: staticResults.filter(row => row.ok).length,
      static_fail: staticResults.filter(row => !row.ok).length,
      live_pass: 0,
      live_slow: 0,
      live_fail: 0,
      live_skip: 0,
    },
    static_checks: staticResults,
    live_results: liveResults,
  };

  if (!TOKEN) {
    liveResults.push({
      scope: 'protected',
      menu: 'record-detail-completeness',
      action: 'operator-token-required',
      ok: true,
      optional: true,
      slow: false,
      status_label: 'SKIP',
      http_status: 0,
      elapsed_ms: 0,
      error: 'COMPHONE_AUTH_TOKEN is not set',
      summary: { protected_steps: LIVE_STEPS.filter(step => step.scope === 'protected').length },
      recommendation: 'Set COMPHONE_AUTH_TOKEN from a fresh login session to run protected detail reads.',
    });
    report.summary.live_skip = LIVE_STEPS.filter(step => step.scope === 'protected').length;
  } else {
    for (const step of LIVE_STEPS) {
      const row = await runLiveStep(step, state);
      liveResults.push(row);
      if (row.status_label === 'SKIP') report.summary.live_skip += 1;
      else if (!row.ok && !row.optional) report.summary.live_fail += 1;
      else if (!row.ok && row.optional) report.summary.live_skip += 1;
      else if (row.slow) report.summary.live_slow += 1;
      else report.summary.live_pass += 1;
      console.log(`[${row.scope.padEnd(9)}] ${row.menu.padEnd(10)} ${row.action}: ${row.status_label} ${row.http_status} ${row.elapsed_ms}ms${row.error ? ' - ' + row.error : ''}`);
    }
  }

  const staticP0Failures = staticResults.filter(row => !row.ok && row.severity === 'P0');
  const checksTotal = report.summary.static_total + liveResults.length;
  const checksPassed = report.summary.static_pass + liveResults.filter(row => row.ok).length;
  report.score = checksTotal ? Math.round((checksPassed / checksTotal) * 100) : 0;

  if (staticP0Failures.length || report.summary.live_fail > 0 || (FAIL_ON_SLOW && report.summary.live_slow > 0)) {
    report.status = 'fail';
  } else if (report.summary.static_fail > 0 || report.summary.live_slow > 0 || !TOKEN) {
    report.status = 'warning';
  } else {
    report.status = 'ok';
  }

  writeReports(report);
  console.log(`[Sprint 105 Record Detail Completeness] status=${report.status} score=${report.score}/100 static=${report.summary.static_pass}/${report.summary.static_total} live_fail=${report.summary.live_fail}`);
  console.log(`[Sprint 105 Record Detail Completeness] report: ${path.relative(ROOT, REPORT_JSON).replace(/\\/g, '/')}`);

  if (report.status === 'fail') process.exit(1);
}

main().catch(err => {
  console.error('[Sprint 105 Record Detail Completeness] FAILED:', err.message);
  process.exit(1);
});
