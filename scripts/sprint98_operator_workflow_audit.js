#!/usr/bin/env node
/*
 * Sprint 98 Operator Workflow Audit
 *
 * Guards the five production-facing polish themes:
 * Jobs/Billing UX, mobile field continuity, PC command dashboard, LINE routing,
 * and AI Vision operational loop.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REPORT_DIR = path.join(ROOT, 'test_reports');
const REPORT_JSON = path.join(REPORT_DIR, 'sprint98_operator_workflow_latest.json');
const REPORT_MD = path.join(REPORT_DIR, 'sprint98_operator_workflow_latest.md');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function has(text, pattern) {
  return pattern instanceof RegExp ? pattern.test(text) : text.includes(pattern);
}

function main() {
  const files = {
    app: read('pwa/app.js'),
    appJobs: read('pwa/app_jobs.js'),
    pcJobs: read('pwa/section_jobs.js'),
    dashboard: read('pwa/dashboard.js'),
    line: read('pwa/section_line_center.js'),
    vision: read('pwa/section_vision.js'),
  };
  const checks = [];
  const issues = [];

  function check(area, name, ok, detail, severity = 'P1') {
    const item = { area, name, ok: !!ok, severity, detail };
    checks.push(item);
    if (!item.ok) issues.push(item);
  }

  check('jobs_billing', 'mobile-job-handoffs',
    has(files.appJobs, 'openMobileJobTimeline') &&
      has(files.appJobs, 'openMobileJobBilling') &&
      has(files.appJobs, 'openMobileJobVision') &&
      has(files.appJobs, 'comphone_current_job_id'),
    'Mobile job detail must expose Timeline, Billing, and Vision handoffs while remembering active job context.',
    'P0');

  check('jobs_billing', 'pc-status-transition-confirm',
    has(files.pcJobs, '_doJobTransition') && has(files.pcJobs, 'Confirm job status change'),
    'PC job status transitions must require a final explicit confirmation.',
    'P0');

  check('mobile_field', 'quick-actions-field-default',
    has(files.app, "const DEFAULT_QUICK_ACTION_IDS = ['openNewJob', 'jobs', 'billing', 'reports']") &&
      has(files.app, 'MOBILE_QUICK_ACTION_LIMIT = 4') &&
      has(files.app, "'vision', 'line-center'"),
    'Mobile default quick actions should prioritize a lean 4-button field dashboard while keeping Vision/LINE available in More.',
    'P1');

  check('mobile_field', 'more-nav-nested-ai-line',
    has(files.app, "'vision', 'line-center'") && has(files.app, 'RESTORABLE_PAGES'),
    'Mobile More nav should keep Vision/LINE active and restorable instead of falling back to home.',
    'P1');

  check('pc_dashboard', 'executive-command-center',
    has(files.dashboard, 'executive-command-center') &&
      has(files.dashboard, 'openDashboardCommand') &&
      has(files.dashboard, 'renderCommandTile') &&
      ['jobs', 'billing', 'po', 'inventory', 'vision', 'line-center'].every(key => files.dashboard.includes(`renderCommandTile('${key}'`)),
    'Dashboard must expose a command center covering Jobs, Billing, PO, Inventory, Vision, and LINE.',
    'P0');

  check('line_routing', 'role-routing-matrix',
    has(files.line, 'line-route-matrix') &&
      has(files.line, 'Role Routing Matrix') &&
      has(files.line, 'queueLineTestAlert'),
    'LINE Center must show role-to-room routing and allow safe queued test alerts.',
    'P1');

  check('vision_loop', 'operational-loop',
    has(files.vision, 'vision-operational-loop') &&
      has(files.vision, 'restoreVisionJobContext') &&
      has(files.vision, 'loadVisionFieldContext(jobId)'),
    'AI Vision must show the Capture -> Analyze -> Review -> Link -> Notify loop and restore linked job context.',
    'P1');

  const p0 = issues.filter(item => item.severity === 'P0').length;
  const score = Math.round((checks.filter(item => item.ok).length / checks.length) * 100);
  const status = p0 ? 'fail' : issues.length ? 'warn' : 'ok';
  const report = {
    generatedAt: new Date().toISOString(),
    sprint: 98,
    focus: 'operator workflow polish',
    status,
    score,
    checksTotal: checks.length,
    checksPassed: checks.filter(item => item.ok).length,
    issues,
    checks,
  };

  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(REPORT_JSON, JSON.stringify(report, null, 2) + '\n', 'utf8');
  fs.writeFileSync(REPORT_MD, [
    '# Sprint 98 Operator Workflow Audit',
    '',
    `- Status: ${status}`,
    `- Score: ${score}/100`,
    `- Checks: ${report.checksPassed}/${checks.length}`,
    `- Issues: ${issues.length}`,
    '',
    '| Area | Check | Result | Detail |',
    '|---|---|---|---|',
    ...checks.map(item => `| ${item.area} | ${item.name} | ${item.ok ? 'OK' : item.severity} | ${item.detail} |`),
    '',
  ].join('\n'), 'utf8');

  console.log(`[Sprint 98 Operator Workflow Audit] status=${status} score=${score}/100 checks=${report.checksPassed}/${checks.length}`);
  for (const issue of issues) console.log(`- [${issue.severity}] ${issue.area}/${issue.name}: ${issue.detail}`);
  if (p0) process.exit(1);
}

main();
