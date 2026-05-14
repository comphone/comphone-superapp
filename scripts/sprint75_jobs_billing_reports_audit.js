#!/usr/bin/env node
/*
 * Sprint 75 focused audit for the highest-value operator workflows:
 * Jobs -> Billing -> Reports.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REPORT_DIR = path.join(ROOT, 'test_reports');
const REPORT_JSON = path.join(REPORT_DIR, 'sprint75_jobs_billing_reports_latest.json');
const REPORT_MD = path.join(REPORT_DIR, 'sprint75_jobs_billing_reports_latest.md');
const TOKEN = process.env.COMPHONE_AUTH_TOKEN || '';

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function has(text, pattern) {
  return pattern instanceof RegExp ? pattern.test(text) : text.includes(pattern);
}

function gasUrl() {
  const match = read('pwa/gas_config.js').match(/url:\s*'([^']+)'/);
  return process.env.COMPHONE_GAS_URL || (match && match[1]);
}

function md(value) {
  return String(value || '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

async function request(url, action, payload = {}) {
  const qs = new URLSearchParams(Object.assign({ action, token: TOKEN, _t: Date.now() }, payload));
  const started = Date.now();
  const res = await fetch(`${url}?${qs.toString()}`, { redirect: 'follow' });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch (err) {
    body = { success: false, error: `non-JSON response: ${text.slice(0, 100)}` };
  }
  return { action, status: res.status, elapsed_ms: Date.now() - started, body };
}

function scoreFromIssues(issues) {
  return Math.max(0, 100 - issues.reduce((sum, issue) => {
    if (issue.severity === 'P0') return sum + 30;
    if (issue.severity === 'P1') return sum + 8;
    return sum + 3;
  }, 0));
}

async function main() {
  const files = {
    apiContract: read('pwa/api_contract.js'),
    mobileHtml: read('pwa/index.html'),
    pcHtml: read('pwa/dashboard_pc.html'),
    app: read('pwa/app.js'),
    appActions: read('pwa/app_actions.js'),
    pcCore: read('pwa/dashboard_pc_core.js'),
    jobs: read('pwa/section_jobs.js') + '\n' + read('pwa/job_workflow.js'),
    billing: read('pwa/section_billing.js') + '\n' + read('pwa/billing_section.js'),
    reports: read('pwa/reports.js') + '\n' + (exists('pwa/section_reports.js') ? read('pwa/section_reports.js') : ''),
    routerSplit: read('clasp-ready/RouterSplit.gs'),
    jobsGas: read('clasp-ready/JobsHandler.gs'),
    reportsGas: read('clasp-ready/Reports.gs'),
  };

  const checks = [];
  const issues = [];
  function check(area, name, ok, severity, detail, remediation = '') {
    const row = { area, name, ok: !!ok, severity, detail, remediation };
    checks.push(row);
    if (!row.ok) issues.push(row);
  }

  check('jobs', 'mobile-jobs-page-and-actions',
    has(files.mobileHtml, 'id="page-jobs"') && has(files.app, "page === 'jobs'") &&
      has(files.appActions, 'openJob') && has(files.appActions, 'submitNewJob'),
    'P0',
    'Mobile Jobs must expose page container and create-job action flow.',
    'Keep Jobs page and quick action wired in mobile shell/app_actions.');
  check('jobs', 'pc-jobs-section-real-renderer',
    has(files.pcHtml, 'section-jobs') && has(files.pcCore, "'jobs'") &&
      (has(files.jobs, 'renderJobsSection') || has(files.jobs, 'loadJobsPage')),
    'P0',
    'PC Jobs must route to a real renderer, not a placeholder.',
    'Keep section_jobs.js/job_workflow.js loaded before dashboard_pc_core.js.');
  check('jobs', 'backend-job-contract',
    ['openJob', 'checkJobs', 'getJobTimeline', 'transitionJob', 'addQuickNote'].every(action => has(files.routerSplit, `'${action}'`)) &&
      has(files.jobsGas, 'getIdempotentReplay_') && has(files.jobsGas, 'rememberIdempotentResult_'),
    'P0',
    'Job backend must expose read/write workflow actions and idempotent create flow.',
    'Keep RouterSplit, JobsHandler, and api_contract aligned.');

  check('billing', 'mobile-billing-page-and-create-flow',
    has(files.mobileHtml, 'id="page-billing"') && has(files.app, "page === 'billing'") &&
      has(files.billing, 'createBilling') && has(files.billing, 'client_request_id'),
    'P0',
    'Mobile Billing must expose billing page and idempotent create billing flow.',
    'Keep section_billing/billing_section loaded in mobile shell.');
  check('billing', 'pc-billing-section-real-renderer',
    has(files.pcHtml, 'section-billing') && has(files.pcCore, "'billing'") &&
      (has(files.billing, 'renderBillingSection') || has(files.billing, 'loadBillingPage')),
    'P0',
    'PC Billing must route to a real renderer.',
    'Keep billing section renderer available from PC nav.');
  check('billing', 'backend-billing-contract',
    ['createBilling', 'getBilling', 'generatePromptPayQR'].every(action => has(files.routerSplit, `'${action}'`)) &&
      has(files.apiContract, 'billing_payment') && has(files.apiContract, 'markBillingPaid'),
    'P1',
    'Billing contract should cover create, lookup, QR, and payment workflow.',
    'Keep billing_payment workflow updated when billing actions change.');

  check('reports', 'mobile-reports-page-real-loader',
    has(files.mobileHtml, 'id="page-reports"') && has(files.app, "page === 'reports'") &&
      has(files.reports, 'getReportData'),
    'P0',
    'Mobile Reports must call real report data action.',
    'Keep reports.js loaded and page loader wired.');
  check('reports', 'pc-reports-section-real-renderer',
    has(files.pcHtml, 'section-reports') && has(files.pcCore, 'renderReportsSection') &&
      has(files.reports, 'renderReportsSection'),
    'P0',
    'PC Reports must render the production reports module.',
    'Keep section_reports.js/reports.js script order intact.');
  check('reports', 'backend-reports-contract',
    has(files.routerSplit, "'getReportData'") && has(files.reportsGas, 'getReportData'),
    'P0',
    'Reports backend must expose getReportData.',
    'Keep Reports.gs and RouterSplit action aligned.');

  check('cross-workflow', 'jobs-billing-reports-workflows-documented',
    ['job_e2e', 'billing_payment'].every(id => has(files.apiContract, id)) &&
      has(files.apiContract, 'getReportData'),
    'P1',
    'API contract should document Jobs/Billing/Reports read and write paths.',
    'Update pwa/api_contract.js when workflow actions change.');
  check('cross-workflow', 'no-placeholder-language-on-critical-sections',
    !/coming soon|เร็วๆ นี้|prototype/i.test(files.jobs + files.billing + files.reports),
    'P1',
    'Critical Jobs/Billing/Reports modules should not ship as placeholder shells.',
    'Replace placeholder branches with diagnostics-backed real renderers.');

  const live = [];
  const url = gasUrl();
  if (TOKEN && url) {
    const liveActions = [
      ['jobs', 'checkJobs', { limit: 10 }],
      ['billing', 'generatePromptPayQR', { amount: 1, ref: 'SPRINT75_AUDIT' }],
      ['reports', 'getReportData', { period: 'month' }],
    ];
    for (const [area, action, payload] of liveActions) {
      try {
        const result = await request(url, action, payload);
        const ok = result.status === 200 && result.body && result.body.success !== false;
        live.push({ area, action, ok, status: result.status, elapsed_ms: result.elapsed_ms, error: ok ? '' : (result.body && (result.body.error || result.body.message)) || 'unexpected response' });
      } catch (err) {
        live.push({ area, action, ok: false, status: 0, elapsed_ms: 0, error: err.message });
      }
    }
  }

  live.forEach(row => {
    check(`live-${row.area}`, row.action, row.ok, 'P1',
      row.ok ? `HTTP ${row.status} in ${row.elapsed_ms}ms` : row.error,
      'Investigate protected API contract/runtime if live focused smoke fails.');
  });

  const score = scoreFromIssues(issues);
  const report = {
    generated_at: new Date().toISOString(),
    name: 'Sprint 75 Jobs/Billing/Reports Focus Audit',
    score,
    status: issues.some(issue => issue.severity === 'P0') ? 'fail' : (issues.length ? 'warn' : 'ok'),
    token_present: !!TOKEN,
    checks,
    issues,
    live,
  };

  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(REPORT_JSON, JSON.stringify(report, null, 2) + '\n', 'utf8');
  fs.writeFileSync(REPORT_MD, [
    '# Sprint 75 Jobs/Billing/Reports Focus Audit',
    '',
    `Score: **${score}/100**`,
    `Status: **${report.status.toUpperCase()}**`,
    `Token present: ${!!TOKEN}`,
    '',
    '## Findings',
    '',
    issues.length
      ? '| Severity | Area | Check | Detail |\n|---|---|---|---|\n' + issues.map(row => `| ${row.severity} | ${md(row.area)} | ${md(row.name)} | ${md(row.detail)} |`).join('\n')
      : 'No findings. Jobs/Billing/Reports core paths are aligned.',
    '',
    '## Checks',
    '',
    '| Area | Check | Result | Detail |',
    '|---|---|---|---|',
    ...checks.map(row => `| ${md(row.area)} | ${md(row.name)} | ${row.ok ? 'OK' : row.severity} | ${md(row.detail)} |`),
    '',
  ].join('\n'));

  console.log(`[Sprint 75 JBR Audit] score=${score}/100 status=${report.status} checks=${checks.length} issues=${issues.length}`);
  console.log(`[Sprint 75 JBR Audit] report: ${path.relative(ROOT, REPORT_JSON).replace(/\\/g, '/')}`);
  if (issues.some(issue => issue.severity === 'P0')) process.exitCode = 1;
}

main().catch(err => {
  console.error('[Sprint 75 JBR Audit] FAILED:', err.stack || err.message);
  process.exit(1);
});
