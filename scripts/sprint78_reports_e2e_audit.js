#!/usr/bin/env node
/*
 * Sprint 78 focused audit for Reports/Revenue/Analytics end-to-end workflow.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REPORT_DIR = path.join(ROOT, 'test_reports');
const REPORT_JSON = path.join(REPORT_DIR, 'sprint78_reports_e2e_latest.json');
const REPORT_MD = path.join(REPORT_DIR, 'sprint78_reports_e2e_latest.md');
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
  try { body = JSON.parse(text); } catch (_) { body = { success: false, error: `non-JSON response: ${text.slice(0, 120)}` }; }
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
    pcHtml: read('pwa/dashboard_pc.html'),
    pcCore: read('pwa/dashboard_pc_core.js'),
    mobileHtml: read('pwa/index.html'),
    app: read('pwa/app.js'),
    reports: read('pwa/reports.js'),
    reportsBridge: read('pwa/section_reports.js'),
    revenue: read('pwa/section_revenue.js'),
    analytics: read('pwa/section_analytics.js') + '\n' + read('pwa/analytics_section.js'),
    apiContract: read('pwa/api_contract.js'),
    routerSplit: read('clasp-ready/RouterSplit.gs'),
    reportsGs: read('clasp-ready/Reports.gs'),
    sheetOptimizer: read('clasp-ready/SheetOptimizer.gs'),
    dashboardGs: read('clasp-ready/Dashboard.gs'),
    attendanceGs: read('clasp-ready/Attendance.gs'),
    businessAnalytics: read('clasp-ready/BusinessAnalytics.gs'),
  };

  const checks = [];
  const issues = [];
  function check(area, name, ok, severity, detail, remediation = '') {
    const row = { area, name, ok: !!ok, severity, detail, remediation };
    checks.push(row);
    if (!row.ok) issues.push(row);
  }

  check('reports-ui', 'pc-mobile-shell-loaded',
    has(source.pcHtml, 'section-reports') && has(source.pcHtml, 'reports.js') &&
      has(source.mobileHtml, 'reports-content') && has(source.mobileHtml, 'reports.js') &&
      has(source.app, "page === 'reports'"),
    'P0',
    'Reports must be loaded on both PC and mobile shells.');
  check('reports-ui', 'real-renderer-and-bridge',
    has(source.reports, 'function renderReportModule') && has(source.reportsBridge, 'function renderReportsSection') &&
      has(source.pcCore, 'renderReportModule'),
    'P0',
    'PC Reports must route to the real reports module through the compatibility bridge.');
  check('reports-ui', 'report-actions-present',
    ['_showReport', '_loadReportAttendance', '_loadReportJobs', '_loadReportBilling', '_loadReportInventory',
     '_exportReportAttendancePDF', '_exportReportJobsPDF', '_exportReportBillingPDF', '_exportReportInventoryPDF']
      .every(fn => has(source.reports, fn)),
    'P0',
    'Reports UI must expose attendance/jobs/billing/inventory load and export actions.');
  check('reports-ui', 'backend-response-normalization',
    has(source.reports, '_normalizeReportData') && has(source.reports, 'dailyRevenue') && has(source.reports, 'summary.total_revenue'),
    'P0',
    'Reports UI must normalize backend report shapes before rendering Billing report cards.');
  check('reports-ui', 'no-demo-random-in-runtime',
    !has(source.reports + source.reportsBridge + source.revenue + source.analytics, /Math\.random\(\).*Demo|Demo data|fake/i),
    'P1',
    'Loaded reports/revenue/analytics runtime must not depend on random demo data.');

  check('revenue-ui', 'uses-report-api-first',
    has(source.revenue, "callApi('getReportData'") && has(source.revenue, '_normalizeRevenueReportData') &&
      has(source.revenue, '_exportRevenueCSV'),
    'P1',
    'Revenue should use report data first and keep CSV export available.');
  check('analytics-ui', 'real-api-route',
    has(source.analytics, "callApi('analyzeBusiness'") || has(source.analytics, "callApi('getDashboardAnalytics'"),
    'P1',
    'Analytics section should call a real backend analytics route.');

  check('backend-reports', 'routes-present',
    ['getReportData', 'getDashboardAnalytics', 'analyzeBusiness', 'getAttendanceMonthlySummary', 'inventoryOverview']
      .every(action => has(source.routerSplit, `'${action}'`)),
    'P0',
    'RouterSplit must expose report, analytics, attendance, and inventory report sources.');
  check('backend-reports', 'report-engines-present',
    has(source.reportsGs, 'function getReportData_') && has(source.sheetOptimizer, 'function getReportData') &&
      has(source.dashboardGs, 'function getProfitReport') && has(source.attendanceGs, 'function getAttendanceMonthlySummary'),
    'P0',
    'Backend report engines must be present for report center workflows.');
  check('backend-reports', 'business-analytics-present',
    has(source.businessAnalytics, 'function analyzeBusiness_') && has(source.routerSplit, 'analyzeBusiness_'),
    'P1',
    'Business analytics route should be backed by BusinessAnalytics.gs.');
  check('contract', 'reports-workflow-documented',
    has(source.apiContract, "id: 'reports'") &&
      ['getReportData', 'getAttendanceMonthlySummary', 'getDashboardBundle', 'inventoryOverview', 'analyzeBusiness', 'getDashboardAnalytics'].every(action => has(source.apiContract, action)),
    'P1',
    'API contract should document Reports, Revenue, and Analytics read actions.');

  const live = [];
  if (TOKEN && gasUrl()) {
    const url = gasUrl();
    for (const [action, payload] of [
      ['getReportData', { period: 'month' }],
      ['getAttendanceMonthlySummary', { group_by: 'month' }],
      ['getDashboardAnalytics', { period: 'month' }],
      ['analyzeBusiness', { period: '7d' }],
      ['inventoryOverview', {}],
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

  live.forEach(row => check('live-reports-read', row.action, row.ok, 'P1',
    row.ok ? `HTTP ${row.status} in ${row.elapsed_ms}ms` : row.error,
    'Investigate protected Reports/Analytics read route if live smoke fails.'));

  const reportScore = score(issues);
  const report = {
    generated_at: new Date().toISOString(),
    name: 'Sprint 78 Reports E2E Audit',
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
    '# Sprint 78 Reports E2E Audit',
    '',
    `Score: **${reportScore}/100**`,
    `Status: **${report.status.toUpperCase()}**`,
    `Token present: ${!!TOKEN}`,
    '',
    '## Findings',
    '',
    issues.length
      ? '| Severity | Area | Check | Detail |\n|---|---|---|---|\n' + issues.map(row => `| ${row.severity} | ${md(row.area)} | ${md(row.name)} | ${md(row.detail)} |`).join('\n')
      : 'No findings. Reports E2E contracts are aligned.',
    '',
    '## Checks',
    '',
    '| Area | Check | Result | Detail |',
    '|---|---|---|---|',
    ...checks.map(row => `| ${md(row.area)} | ${md(row.name)} | ${row.ok ? 'OK' : row.severity} | ${md(row.detail)} |`),
    '',
  ].join('\n'));

  console.log(`[Sprint 78 Reports E2E Audit] score=${reportScore}/100 status=${report.status} checks=${checks.length} issues=${issues.length}`);
  console.log(`[Sprint 78 Reports E2E Audit] report: ${path.relative(ROOT, REPORT_JSON).replace(/\\/g, '/')}`);
  for (const issue of issues) console.log(`[${issue.severity}] ${issue.area}/${issue.name}: ${issue.detail}`);
  if (issues.some(issue => issue.severity === 'P0')) process.exit(1);
}

main().catch(err => {
  console.error('[Sprint 78 Reports E2E Audit] FAILED:', err.stack || err.message);
  process.exit(1);
});
