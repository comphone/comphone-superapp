#!/usr/bin/env node
/*
 * Sprint 100 Operator Menu Audit
 *
 * Guards the menu-by-menu production QA sequence:
 * Jobs -> Billing -> Reports -> AI Vision -> LINE Center.
 *
 * Static checks are blocking. Protected API checks run when COMPHONE_AUTH_TOKEN
 * is available and remain skip-safe in CI.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REPORT_DIR = path.join(ROOT, 'test_reports');
const REPORT_JSON = path.join(REPORT_DIR, 'sprint100_operator_menu_latest.json');
const REPORT_MD = path.join(REPORT_DIR, 'sprint100_operator_menu_latest.md');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function has(text, pattern) {
  return pattern instanceof RegExp ? pattern.test(text) : text.includes(pattern);
}

function gasUrl() {
  const config = read('pwa/gas_config.js');
  const match = config.match(/url:\s*'([^']+)'/);
  return process.env.COMPHONE_GAS_URL || (match && match[1]) || '';
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

async function request(url, action, payload = {}) {
  const qs = new URLSearchParams(Object.assign({ action, _t: Date.now() }, payload));
  const started = Date.now();
  const res = await fetch(`${url}?${qs.toString()}`, { redirect: 'follow' });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch (_) {
    throw new Error(`${action}: non-JSON response (${res.status}) ${text.slice(0, 120)}`);
  }
  return { status: res.status, body, elapsedMs: Date.now() - started };
}

async function main() {
  const files = {
    app: read('pwa/app.js'),
    appJobs: read('pwa/app_jobs.js'),
    pcCore: read('pwa/dashboard_pc_core.js'),
    pcJobs: read('pwa/section_jobs.js'),
    billing: read('pwa/billing_section.js'),
    reports: read('pwa/reports.js'),
    sectionReports: read('pwa/section_reports.js'),
    dashboard: read('pwa/dashboard.js'),
    vision: read('pwa/section_vision.js'),
    line: read('pwa/section_line_center.js'),
  };

  const checks = [];
  const issues = [];
  const live = [];

  function check(area, name, ok, detail, severity = 'P1') {
    const item = { area, name, ok: !!ok, severity, detail };
    checks.push(item);
    if (!item.ok) issues.push(item);
  }

  check('pc_dashboard', 'command-center-routes-priority-work',
    has(files.dashboard, 'executive-command-center') &&
      has(files.dashboard, 'openDashboardCommand') &&
      ['jobs', 'billing', 'reports', 'vision', 'line-center'].every(page => files.dashboard.includes(`openDashboardCommand('${page}')`) || files.dashboard.includes(`renderCommandTile('${page}'`)),
    'PC Dashboard must expose one-click operator routes for Jobs, Billing, Reports, Vision, and LINE.',
    'P0');

  check('jobs', 'pc-jobs-real-detail-and-handoffs',
    has(files.pcJobs, 'function _showPcJobDetail') &&
      has(files.pcJobs, 'function _showPcCreateJob') &&
      has(files.pcJobs, "callApi('addQuickNote'") &&
      has(files.pcJobs, "callApi('transitionJob'") &&
      has(files.pcJobs, 'function _openPcJobBilling') &&
      has(files.pcJobs, 'function _openPcJobVision') &&
      has(files.pcJobs, 'function _showJobTimeline'),
    'PC Jobs must have detail, create, note, status/timeline, Billing, and Vision handoffs.',
    'P0');

  check('jobs', 'mobile-jobs-real-detail-and-handoffs',
    has(files.appJobs, 'openMobileJobTimeline') &&
      has(files.appJobs, 'openMobileJobBilling') &&
      has(files.appJobs, 'openMobileJobVision') &&
      has(files.appJobs, 'comphone_current_job_id') &&
      has(files.app, "DEFAULT_QUICK_ACTION_IDS = ['openNewJob', 'jobs', 'billing', 'reports']") &&
      has(files.app, "'vision', 'line-center'") &&
      has(files.app, 'more-menu-advanced'),
    'Mobile Jobs must keep current job context and expose Timeline, Billing, Vision, and operator quick actions.',
    'P0');

  check('billing', 'billing-read-write-payment-surface',
    has(files.billing, 'function renderBillingSection') &&
      has(files.billing, "callApi('listBillings'") &&
      has(files.billing, "callApi('getBilling'") &&
      has(files.billing, "callApi('createBilling'") &&
      has(files.billing, "callApi('markBillingPaid'") &&
      has(files.billing, 'PromptPay QR') &&
      has(files.billing, 'createWriteRequestId'),
    'Billing must load lists/details, create bills with request IDs, mark paid with confirmation, and show PromptPay QR.',
    'P0');

  check('reports', 'reports-real-module-not-empty-shell',
    has(files.reports, 'async function renderReportModule') &&
      ['_showReport', '_loadReportJobs', '_loadReportBilling', '_loadReportInventory', '_loadReportAttendance'].every(fn => has(files.reports, fn)) &&
      has(files.pcCore, 'renderReportModule') &&
      has(files.sectionReports, 'renderReportModule'),
    'Reports must render a real module with Jobs/Billing/Inventory/Attendance loaders on PC and mobile.',
    'P0');

  check('ai_vision', 'vision-safe-operator-loop',
    has(files.vision, 'vision-operational-loop') &&
      has(files.vision, 'restoreVisionJobContext') &&
      has(files.vision, 'previewVisionSuggestion') &&
      has(files.vision, 'executeVisionSuggestion') &&
      has(files.vision, 'linkLastVisionToJobTimeline'),
    'AI Vision must keep capture/analyze/review/link/notify flow and require preview/confirm before execution.',
    'P0');

  check('line_center', 'line-read-preview-safe-send',
    has(files.line, 'line-route-matrix') &&
      has(files.line, 'Role Routing Matrix') &&
      has(files.line, 'previewLineMessage') &&
      has(files.line, 'sendLineMessageConfirmed') &&
      has(files.line, 'queueLineTestAlert'),
    'LINE Center must expose routing matrix, preview, explicit send confirmation, and safe queued test alerts.',
    'P0');

  check('fallbacks', 'priority-renderers-are-loaded-before-pc-core',
    ['section_jobs.js', 'billing_section.js', 'reports.js', 'section_vision.js', 'section_line_center.js', 'dashboard_pc_core.js'].every(name => read('pwa/dashboard_pc.html').includes(name)) &&
      read('pwa/dashboard_pc.html').indexOf('section_jobs.js') < read('pwa/dashboard_pc.html').indexOf('dashboard_pc_core.js') &&
      read('pwa/dashboard_pc.html').indexOf('billing_section.js') < read('pwa/dashboard_pc.html').indexOf('dashboard_pc_core.js') &&
      read('pwa/dashboard_pc.html').indexOf('reports.js') < read('pwa/dashboard_pc.html').indexOf('dashboard_pc_core.js') &&
      read('pwa/dashboard_pc.html').indexOf('section_vision.js') < read('pwa/dashboard_pc.html').indexOf('dashboard_pc_core.js') &&
      read('pwa/dashboard_pc.html').indexOf('section_line_center.js') < read('pwa/dashboard_pc.html').indexOf('dashboard_pc_core.js'),
    'Priority operator renderers must load before PC core so users do not land on empty fallback shells.',
    'P2');

  const url = gasUrl();
  const token = process.env.COMPHONE_AUTH_TOKEN || '';
  if (!url) {
    live.push({ scope: 'live', status: 'skip', detail: 'Missing GAS URL' });
  } else if (!token) {
    live.push({ scope: 'protected', status: 'skip', detail: 'Set COMPHONE_AUTH_TOKEN to run protected operator menu reads.' });
  } else {
    const liveActions = [
      ['dashboard', 'getDashboardData', {}],
      ['jobs', 'checkJobs', { limit: 10 }],
      ['billing', 'listBillings', { limit: 10 }],
      ['reports', 'getReportData', { type: 'billing' }],
      ['vision', 'getVisionDashboardStats', {}],
      ['line-center', 'getLineCommandCenter', { days: 7 }],
    ];
    let latestJobId = '';
    for (const [menu, action, payload] of liveActions) {
      try {
        const result = await request(url, action, Object.assign({}, payload, { token }));
        const ok = result.status === 200 && result.body && result.body.success !== false;
        const error = ok ? '' : (result.body && (result.body.error || result.body.message || result.body.status)) || 'unexpected response';
        live.push({ menu, action, ok, httpStatus: result.status, elapsedMs: result.elapsedMs, status: ok ? 'ok' : classify(error, result.status), error });
        if (ok && action === 'checkJobs') {
          const jobs = result.body.jobs || result.body.data || result.body.rows || [];
          latestJobId = jobs[0] && (jobs[0].job_id || jobs[0].id || '');
        }
        if (!ok) check('protected_live', `${menu}-${action}`, false, `${action} returned ${error}`, 'P0');
      } catch (err) {
        live.push({ menu, action, ok: false, httpStatus: 0, elapsedMs: 0, status: classify(err.message), error: err.message });
        check('protected_live', `${menu}-${action}`, false, err.message, 'P0');
      }
    }
    if (latestJobId) {
      for (const [menu, action, payload] of [
        ['jobs', 'getJobTimeline', { job_id: latestJobId }],
        ['billing', 'getBilling', { job_id: latestJobId, optional: true }],
        ['vision', 'getVisionFieldContext', { job_id: latestJobId }],
      ]) {
        try {
          const result = await request(url, action, Object.assign({}, payload, { token }));
          const ok = result.status === 200 && result.body && result.body.success !== false;
          live.push({ menu, action, ok, optional: action === 'getBilling', httpStatus: result.status, elapsedMs: result.elapsedMs, status: ok ? 'ok' : 'warn' });
        } catch (err) {
          live.push({ menu, action, ok: false, optional: action === 'getBilling', httpStatus: 0, elapsedMs: 0, status: 'warn', error: err.message });
        }
      }
    }
  }

  const p0 = issues.filter(item => item.severity === 'P0').length;
  const score = Math.round((checks.filter(item => item.ok).length / checks.length) * 100);
  const status = p0 ? 'fail' : issues.length ? 'warn' : 'ok';
  const report = {
    generatedAt: new Date().toISOString(),
    sprint: 100,
    focus: 'operator menu click-through readiness',
    status,
    score,
    checksTotal: checks.length,
    checksPassed: checks.filter(item => item.ok).length,
    protectedLive: live,
    issues,
    checks,
  };

  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(REPORT_JSON, JSON.stringify(report, null, 2) + '\n', 'utf8');
  fs.writeFileSync(REPORT_MD, [
    '# Sprint 100 Operator Menu Audit',
    '',
    `- Status: ${status}`,
    `- Score: ${score}/100`,
    `- Checks: ${report.checksPassed}/${checks.length}`,
    `- Protected live rows: ${live.length}`,
    `- Issues: ${issues.length}`,
    '',
    '| Area | Check | Result | Detail |',
    '|---|---|---|---|',
    ...checks.map(item => `| ${item.area} | ${item.name} | ${item.ok ? 'OK' : item.severity} | ${item.detail} |`),
    '',
    '## Protected Live',
    '',
    '| Menu | Action | Result | Elapsed |',
    '|---|---|---|---|',
    ...live.map(item => `| ${item.menu || item.scope || '-'} | ${item.action || '-'} | ${item.ok ? 'OK' : item.status} | ${item.elapsedMs || 0}ms |`),
    '',
  ].join('\n'), 'utf8');

  console.log(`[Sprint 100 Operator Menu Audit] status=${status} score=${score}/100 checks=${report.checksPassed}/${checks.length} live=${live.length}`);
  for (const item of live) {
    if (item.action) console.log(`[live] ${item.menu} ${item.action}: ${item.ok ? 'OK' : item.status} ${item.elapsedMs || 0}ms${item.error ? ' - ' + item.error : ''}`);
  }
  for (const issue of issues) console.log(`- [${issue.severity}] ${issue.area}/${issue.name}: ${issue.detail}`);
  if (p0) process.exit(1);
}

main().catch(err => {
  console.error('[Sprint 100 Operator Menu Audit] FAILED');
  console.error(err);
  process.exit(1);
});
