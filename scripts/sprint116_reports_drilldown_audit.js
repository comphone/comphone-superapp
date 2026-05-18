#!/usr/bin/env node
/*
 * Sprint 116 Reports Drilldown Audit
 *
 * Guards report drilldown behavior and a clear empty-state for billing revenue
 * records so Reports does not look like a blank/broken menu.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REPORT_DIR = path.join(ROOT, 'test_reports');
const REPORT_JSON = path.join(REPORT_DIR, 'sprint116_reports_drilldown_latest.json');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function has(text, needle) {
  return text.includes(needle);
}

function main() {
  const files = {
    reports: read('pwa/reports.js'),
    sectionReports: read('pwa/section_reports.js'),
    apiContract: read('pwa/api_contract.js'),
    backend: read('clasp-ready/Reports.gs') + '\n' + read('clasp-ready/RouterSplit.gs'),
    staticGuard: read('scripts/pwa_static_guard.js'),
    regression: read('scripts/regression-guard.sh'),
    workflow: read('.github/workflows/auto-deploy.yml'),
    blueprint: read('BLUEPRINT.md'),
  };
  const checks = [];
  const issues = [];
  function check(area, name, ok, detail, severity = 'P0') {
    const row = { area, name, ok: !!ok, severity, detail };
    checks.push(row);
    if (!row.ok) issues.push(row);
  }

  check('reports_ui', 'billing-drilldown-empty-state',
    has(files.reports, 'report-empty-state') &&
      has(files.reports, 'No billing records for this period') &&
      has(files.reports, 'Data Repair Console') &&
      has(files.reports, 'const records = Array.isArray(res.records)'),
    'Billing Reports must show a diagnostic empty state when summary exists but drilldown rows are empty.');

  check('reports_ui', 'real-report-module-active',
    has(files.reports, '_loadReportBilling') &&
      has(files.reports, '_loadReportJobs') &&
      has(files.reports, '_loadReportInventory') &&
      has(files.reports, 'loadReportsPage') &&
      has(files.sectionReports, 'renderReportsSection') &&
      !has(files.sectionReports, 'coming soon'),
    'PC/mobile Reports should route to the real reports module, not a prototype placeholder.');

  check('contract', 'reports-actions-contracted',
    has(files.apiContract, 'getReportData') &&
      has(files.apiContract, 'reports') &&
      has(files.apiContract, 'responseShape'),
    'Reports data action and response shape must stay in the API contract.');

  check('backend', 'reports-backend-route-present',
    has(files.backend, "'getReportData'") &&
      has(files.backend, 'function getReportData'),
    'Backend must keep getReportData route and handler available.');

  check('ci', 'sprint116-wired',
    has(files.staticGuard, 'sprint116_reports_drilldown_audit.js') &&
      has(files.regression, 'sprint116_reports_drilldown_audit.js') &&
      has(files.workflow, 'sprint116_reports_drilldown_audit.js'),
    'Sprint 116 guard must run in static guard, regression guard, and Actions syntax checks.');

  check('blueprint', 'blueprint-documents-sprint116',
    has(files.blueprint, 'Phase 116 Reports Drilldown') &&
      has(files.blueprint, 'report-empty-state') &&
      has(files.blueprint, 'sprint116_reports_drilldown_audit.js'),
    'BLUEPRINT must document Reports drilldown hardening and the guard command.');

  const p0 = issues.filter(item => item.severity === 'P0').length;
  const score = Math.round((checks.filter(item => item.ok).length / checks.length) * 100);
  const report = { generated_at: new Date().toISOString(), version: 'sprint116-reports-drilldown-1.0.0', status: p0 ? 'fail' : 'ok', score, checks, issues };
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(REPORT_JSON, JSON.stringify(report, null, 2) + '\n', 'utf8');
  console.log(`[Sprint 116 Reports Drilldown] status=${report.status} score=${score}/100`);
  console.log(`[Sprint 116 Reports Drilldown] report: ${path.relative(ROOT, REPORT_JSON).replace(/\\/g, '/')}`);
  if (p0) process.exit(1);
}

main();
