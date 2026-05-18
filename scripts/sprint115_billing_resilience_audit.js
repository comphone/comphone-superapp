#!/usr/bin/env node
/*
 * Sprint 115 Billing Resilience Audit
 *
 * Ensures incomplete Billing rows cannot drive broken detail/QR navigation and
 * that operators get a clear repair hint instead of a blank menu.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REPORT_DIR = path.join(ROOT, 'test_reports');
const REPORT_JSON = path.join(REPORT_DIR, 'sprint115_billing_resilience_latest.json');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function has(text, needle) {
  return text.includes(needle);
}

function main() {
  const files = {
    billing: read('pwa/billing_section.js'),
    apiContract: read('pwa/api_contract.js'),
    backend: read('clasp-ready/BillingCore.gs') + '\n' + read('clasp-ready/RouterSplit.gs'),
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

  check('billing_ui', 'missing-job-id-buttons-disabled',
    has(files.billing, 'billing-row-incomplete') &&
      has(files.billing, 'Missing Job_ID - open Data Repair Console') &&
      has(files.billing, 'const detailButton = jobId') &&
      has(files.billing, 'const qrButton = status !==') &&
      has(files.billing, '<button disabled'),
    'Billing list must disable detail/QR actions for rows without Job_ID and show a repair marker.');

  check('billing_ui', 'safe-inline-job-id',
    has(files.billing, 'function _billingInlineArg') &&
      has(files.billing, 'replace(/\\\\/g') &&
      has(files.billing, 'safeJobId'),
    'Billing action handlers must escape Job_ID before placing it in inline event handlers.');

  check('contract', 'billing-actions-contracted',
    has(files.apiContract, 'listBillings') &&
      has(files.apiContract, 'getBilling') &&
      has(files.apiContract, 'createBilling') &&
      has(files.apiContract, 'generatePromptPayQR'),
    'Billing list/detail/create/QR actions must stay in the API contract.');

  check('backend', 'billing-backend-routes-present',
    has(files.backend, "'listBillings'") &&
      has(files.backend, "'getBilling'") &&
      has(files.backend, 'function listAllBillings_') &&
      has(files.backend, 'function getBilling'),
    'Backend must keep Billing list/detail routes for PC/mobile surfaces.');

  check('ci', 'sprint115-wired',
    has(files.staticGuard, 'sprint115_billing_resilience_audit.js') &&
      has(files.regression, 'sprint115_billing_resilience_audit.js') &&
      has(files.workflow, 'sprint115_billing_resilience_audit.js'),
    'Sprint 115 guard must run in static guard, regression guard, and Actions syntax checks.');

  check('blueprint', 'blueprint-documents-sprint115',
    has(files.blueprint, 'Phase 115 Billing Resilience') &&
      has(files.blueprint, 'billing-row-incomplete') &&
      has(files.blueprint, 'sprint115_billing_resilience_audit.js'),
    'BLUEPRINT must document Billing resilience and the guard command.');

  const p0 = issues.filter(item => item.severity === 'P0').length;
  const score = Math.round((checks.filter(item => item.ok).length / checks.length) * 100);
  const report = { generated_at: new Date().toISOString(), version: 'sprint115-billing-resilience-1.0.0', status: p0 ? 'fail' : 'ok', score, checks, issues };
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(REPORT_JSON, JSON.stringify(report, null, 2) + '\n', 'utf8');
  console.log(`[Sprint 115 Billing Resilience] status=${report.status} score=${score}/100`);
  console.log(`[Sprint 115 Billing Resilience] report: ${path.relative(ROOT, REPORT_JSON).replace(/\\/g, '/')}`);
  if (p0) process.exit(1);
}

main();
