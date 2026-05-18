#!/usr/bin/env node
/*
 * Sprint 114 Jobs Workflow Polish Audit
 *
 * Guards Jobs menu continuity across PC, mobile, backend routes, and API
 * contract. CI-safe: no production writes.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REPORT_DIR = path.join(ROOT, 'test_reports');
const REPORT_JSON = path.join(REPORT_DIR, 'sprint114_jobs_workflow_polish_latest.json');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function has(text, needle) {
  return text.includes(needle);
}

function main() {
  const files = {
    pcJobs: read('pwa/section_jobs.js'),
    mobileJobs: read('pwa/app_jobs.js'),
    workflow: read('pwa/job_workflow.js'),
    apiContract: read('pwa/api_contract.js'),
    router: read('clasp-ready/RouterSplit.gs'),
    backend: read('clasp-ready/JobStateMachine.gs') + '\n' + read('clasp-ready/JobsHandler.gs'),
    staticGuard: read('scripts/pwa_static_guard.js'),
    regression: read('scripts/regression-guard.sh'),
    actions: read('.github/workflows/auto-deploy.yml'),
    blueprint: read('BLUEPRINT.md'),
  };
  const checks = [];
  const issues = [];
  function check(area, name, ok, detail, severity = 'P0') {
    const row = { area, name, ok: !!ok, severity, detail };
    checks.push(row);
    if (!row.ok) issues.push(row);
  }

  check('pc_jobs', 'detail-timeline-vision-billing-handoffs',
    has(files.pcJobs, '_showPcJobDetail') &&
      has(files.pcJobs, '_showJobTimeline') &&
      has(files.pcJobs, '_openPcJobVision') &&
      has(files.pcJobs, '_openPcJobBilling'),
    'PC Jobs must keep detail, timeline, Vision, and Billing second-click handoffs.');

  check('pc_jobs', 'write-actions-use-state-machine',
    has(files.pcJobs, "callApi('transitionJob'") &&
      has(files.pcJobs, "callApi('addQuickNote'") &&
      has(files.pcJobs, 'changed_by:') &&
      has(files.pcJobs, 'PC Dashboard'),
    'PC Jobs note/status actions must route through protected backend APIs with traceable actor fields.');

  check('mobile_jobs', 'mobile-second-clicks-available',
    has(files.mobileJobs, 'openMobileJobTimeline') &&
      has(files.mobileJobs, 'openMobileJobBilling') &&
      has(files.mobileJobs, 'openMobileJobVision') &&
      has(files.mobileJobs, 'APP.currentJobId') &&
      has(files.mobileJobs, 'comphone_current_job_id'),
    'Mobile Jobs must keep timeline, billing, Vision, and current job context.');

  check('contract', 'jobs-actions-in-api-contract',
      has(files.apiContract, 'getJobTimeline') &&
      has(files.apiContract, 'addQuickNote') &&
      has(files.apiContract, 'transitionJob') &&
      has(files.apiContract, 'getJobStateConfig') &&
      has(files.apiContract, 'job_e2e'),
    'Jobs API contract must list read and write actions used by PC/mobile menus.');

  check('backend', 'router-and-state-machine-present',
    has(files.router, "'getJobTimeline'") &&
      has(files.router, "'addQuickNote'") &&
      has(files.router, "'transitionJob'") &&
      has(files.backend, 'function addQuickNote') &&
      has(files.backend, 'function transitionJob'),
    'Backend route table and state machine must expose Jobs timeline/note/status APIs.');

  check('ci', 'sprint114-wired',
    has(files.staticGuard, 'sprint114_jobs_workflow_polish_audit.js') &&
      has(files.regression, 'sprint114_jobs_workflow_polish_audit.js') &&
      has(files.actions, 'sprint114_jobs_workflow_polish_audit.js'),
    'Sprint 114 guard must run in static guard, regression guard, and Actions syntax checks.');

  check('blueprint', 'blueprint-documents-sprint114',
    has(files.blueprint, 'Phase 114 Jobs Workflow Polish') &&
      has(files.blueprint, 'Jobs detail/timeline/Vision/Billing') &&
      has(files.blueprint, 'sprint114_jobs_workflow_polish_audit.js'),
    'BLUEPRINT must document Jobs workflow polish and guard command.');

  const p0 = issues.filter(item => item.severity === 'P0').length;
  const score = Math.round((checks.filter(item => item.ok).length / checks.length) * 100);
  const report = { generated_at: new Date().toISOString(), version: 'sprint114-jobs-workflow-polish-1.0.0', status: p0 ? 'fail' : 'ok', score, checks, issues };
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(REPORT_JSON, JSON.stringify(report, null, 2) + '\n', 'utf8');
  console.log(`[Sprint 114 Jobs Workflow Polish] status=${report.status} score=${score}/100`);
  console.log(`[Sprint 114 Jobs Workflow Polish] report: ${path.relative(ROOT, REPORT_JSON).replace(/\\/g, '/')}`);
  if (p0) process.exit(1);
}

main();
