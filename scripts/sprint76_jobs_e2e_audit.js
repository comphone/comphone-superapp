#!/usr/bin/env node
/*
 * Sprint 76 focused audit for Jobs end-to-end workflow.
 * Covers: open job, detail, timeline, quick note, assignment, status transition,
 * Vision handoff, Billing handoff, backend routes, and optional live read checks.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REPORT_DIR = path.join(ROOT, 'test_reports');
const REPORT_JSON = path.join(REPORT_DIR, 'sprint76_jobs_e2e_latest.json');
const REPORT_MD = path.join(REPORT_DIR, 'sprint76_jobs_e2e_latest.md');
const TOKEN = process.env.COMPHONE_AUTH_TOKEN || '';

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function has(text, pattern) {
  return pattern instanceof RegExp ? pattern.test(text) : text.includes(pattern);
}

function md(value) {
  return String(value || '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

function gasUrl() {
  const match = read('pwa/gas_config.js').match(/url:\s*'([^']+)'/);
  return process.env.COMPHONE_GAS_URL || (match && match[1]);
}

async function request(url, action, payload = {}) {
  const qs = new URLSearchParams(Object.assign({ action, token: TOKEN, _t: Date.now() }, payload));
  const started = Date.now();
  const res = await fetch(`${url}?${qs.toString()}`, { redirect: 'follow' });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch (_) {
    body = { success: false, error: `non-JSON response: ${text.slice(0, 120)}` };
  }
  return { action, status: res.status, elapsed_ms: Date.now() - started, body };
}

function score(issues) {
  return Math.max(0, 100 - issues.reduce((sum, issue) => {
    if (issue.severity === 'P0') return sum + 30;
    if (issue.severity === 'P1') return sum + 8;
    return sum + 3;
  }, 0));
}

async function main() {
  const source = {
    mobileHtml: read('pwa/index.html'),
    mobileJobs: read('pwa/app_jobs.js') + '\n' + read('pwa/job_workflow.js') + '\n' + read('pwa/app_actions.js'),
    pcHtml: read('pwa/dashboard_pc.html'),
    pcJobs: read('pwa/section_jobs.js'),
    pcCore: read('pwa/dashboard_pc_core.js'),
    apiContract: read('pwa/api_contract.js'),
    routerSplit: read('clasp-ready/RouterSplit.gs'),
    jobsHandler: read('clasp-ready/JobsHandler.gs'),
    jobState: read('clasp-ready/JobStateMachine.gs'),
    vision: read('pwa/section_vision.js'),
    billing: read('pwa/billing_section.js'),
  };

  const checks = [];
  const issues = [];
  function check(area, name, ok, severity, detail, remediation = '') {
    const row = { area, name, ok: !!ok, severity, detail, remediation };
    checks.push(row);
    if (!row.ok) issues.push(row);
  }

  check('mobile-jobs', 'shell-and-modals-present',
    ['page-jobs', 'jobs-list', 'modal-job', 'modal-job-content']
      .every(id => has(source.mobileHtml, id)),
    'P0',
    'Mobile Jobs shell must include the jobs page and shared workflow modal.');
  check('mobile-jobs', 'end-to-end-actions-present',
    ['openNewJob', 'submitNewJob', 'openAssignJob', 'submitAssignJob', 'showJobTimeline', 'openQuickNote', 'submitQuickNote', 'markJobDoneV2', 'advanceJobStatus', 'showJobDetailV2']
      .every(fn => has(source.mobileJobs, fn)),
    'P0',
    'Mobile Jobs must expose open/detail/timeline/note/assign/status/done handlers.');
  check('mobile-jobs', 'handoffs-present',
    has(source.mobileJobs, 'openCameraForJob') && has(source.mobileJobs, 'openBillingModal'),
    'P1',
    'Mobile Jobs should hand off to camera/Vision capture and Billing.');
  check('mobile-jobs', 'write-safety',
    has(source.mobileJobs, 'client_request_id') && has(source.mobileJobs, /dataset\.submitting[\s\S]*disabled\s*=\s*true/),
    'P1',
    'Mobile open-job writes should be idempotent and double-submit guarded.');

  check('pc-jobs', 'section-real-renderer',
    has(source.pcHtml, 'section-jobs') && has(source.pcCore, 'renderJobsSection') && has(source.pcJobs, 'function renderJobsSection'),
    'P0',
    'PC Jobs must route to section_jobs.js renderer.');
  check('pc-jobs', 'end-to-end-actions-present',
    ['_showPcCreateJob', '_doPcCreateJob', '_showPcJobDetail', '_showPcAssignJob', '_doPcAssignJob', '_showPcQuickNote', '_doPcQuickNote', '_showJobTimeline', '_showJobTransition', '_doJobTransition']
      .every(fn => has(source.pcJobs, fn)),
    'P0',
    'PC Jobs must expose open/detail/assign/note/timeline/status actions.');
  check('pc-jobs', 'handoffs-present',
    has(source.pcJobs, '_openPcJobVision') && has(source.pcJobs, '_openPcJobBilling') &&
      has(source.pcJobs, 'openBillingModal') && has(source.pcJobs, 'loadSection(\'vision\''),
    'P1',
    'PC Jobs should hand off to Vision and Billing from job detail/table actions.');
  check('pc-jobs', 'no-undefined-table-helper',
    !has(source.pcJobs, '_buildJobsTable('),
    'P1',
    'PC Jobs must not reference removed/undefined _buildJobsTable helper.');

  check('backend-jobs', 'router-actions-present',
    ['openJob', 'checkJobs', 'getJobTimeline', 'transitionJob', 'addQuickNote', 'updateJobById']
      .every(action => has(source.routerSplit, `'${action}'`)),
    'P0',
    'RouterSplit must expose all Jobs E2E actions.');
  check('backend-jobs', 'add-quick-note-implemented',
    has(source.jobsHandler + source.jobState, 'function addQuickNote'),
    'P0',
    'Backend addQuickNote route must resolve to a real function.');
  check('backend-jobs', 'transition-billing-automation',
    has(source.jobState, 'autoGenerateBillingForJob') && has(source.jobState, 'markBillingPaid'),
    'P1',
    'Job state transitions should keep Billing automation hooks intact.');
  check('contract', 'job-workflow-documented',
    has(source.apiContract, 'job_e2e') &&
      ['checkJobs', 'getJobTimeline', 'openJob', 'addQuickNote', 'transitionJob'].every(action => has(source.apiContract, action)),
    'P1',
    'API contract should document Jobs E2E read/write actions.');

  const live = [];
  if (TOKEN && gasUrl()) {
    const url = gasUrl();
    for (const [action, payload] of [
      ['checkJobs', { limit: 10 }],
      ['getJobStateConfig', {}],
      ['getDashboardData', {}],
    ]) {
      try {
        const result = await request(url, action, payload);
        const ok = result.status === 200 && result.body && result.body.success !== false;
        live.push({ action, ok, status: result.status, elapsed_ms: result.elapsed_ms, error: ok ? '' : (result.body && (result.body.error || result.body.message)) || 'unexpected response' });
      } catch (err) {
        live.push({ action, ok: false, status: 0, elapsed_ms: 0, error: err.message });
      }
    }
  }

  live.forEach(row => check('live-jobs-read', row.action, row.ok, 'P1',
    row.ok ? `HTTP ${row.status} in ${row.elapsed_ms}ms` : row.error,
    'Investigate Jobs protected read route if live smoke fails.'));

  const reportScore = score(issues);
  const report = {
    generated_at: new Date().toISOString(),
    name: 'Sprint 76 Jobs E2E Audit',
    score: reportScore,
    status: issues.some(issue => issue.severity === 'P0') ? 'fail' : (issues.length ? 'warn' : 'ok'),
    token_present: !!TOKEN,
    checks,
    issues,
    live,
  };

  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(REPORT_JSON, JSON.stringify(report, null, 2) + '\n', 'utf8');
  fs.writeFileSync(REPORT_MD, [
    '# Sprint 76 Jobs E2E Audit',
    '',
    `Score: **${reportScore}/100**`,
    `Status: **${report.status.toUpperCase()}**`,
    `Token present: ${!!TOKEN}`,
    '',
    '## Findings',
    '',
    issues.length
      ? '| Severity | Area | Check | Detail |\n|---|---|---|---|\n' + issues.map(row => `| ${row.severity} | ${md(row.area)} | ${md(row.name)} | ${md(row.detail)} |`).join('\n')
      : 'No findings. Jobs E2E contracts are aligned.',
    '',
    '## Checks',
    '',
    '| Area | Check | Result | Detail |',
    '|---|---|---|---|',
    ...checks.map(row => `| ${md(row.area)} | ${md(row.name)} | ${row.ok ? 'OK' : row.severity} | ${md(row.detail)} |`),
    '',
  ].join('\n'));

  console.log(`[Sprint 76 Jobs E2E Audit] score=${reportScore}/100 status=${report.status} checks=${checks.length} issues=${issues.length}`);
  console.log(`[Sprint 76 Jobs E2E Audit] report: ${path.relative(ROOT, REPORT_JSON).replace(/\\/g, '/')}`);
  for (const issue of issues) console.log(`[${issue.severity}] ${issue.area}/${issue.name}: ${issue.detail}`);
  if (issues.some(issue => issue.severity === 'P0')) process.exit(1);
}

main().catch(err => {
  console.error('[Sprint 76 Jobs E2E Audit] FAILED:', err.stack || err.message);
  process.exit(1);
});
