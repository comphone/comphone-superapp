#!/usr/bin/env node
/*
 * Validate high-risk PWA write flows stay aligned with the API write-smoke contract.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REPORT_DIR = path.join(ROOT, 'test_reports');
const REPORT_JSON = path.join(REPORT_DIR, 'pwa_ui_write_contract_latest.json');
const REPORT_MD = path.join(REPORT_DIR, 'pwa_ui_write_contract_latest.md');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function has(text, pattern) {
  return typeof pattern === 'string' ? text.includes(pattern) : pattern.test(text);
}

function main() {
  const files = {
    apiClient: read('pwa/api_client.js'),
    mobileActions: read('pwa/app_actions.js'),
    billing: read('pwa/billing_section.js'),
    crm: read('pwa/section_crm.js'),
    inventory: read('pwa/section_inventory.js'),
    writeSmoke: read('scripts/pwa_write_smoke.js'),
  };

  const checks = [
    {
      name: 'api-client:createWriteRequestId',
      ok: has(files.apiClient, 'function createWriteRequestId(prefix)'),
      detail: 'central write request id helper exists',
    },
    {
      name: 'api-client:object-payload-serialization',
      ok: has(files.apiClient, 'JSON.stringify(value)'),
      detail: 'object/array payloads are serialized before URLSearchParams',
    },
    {
      name: 'mobile:openJob-client-request-id',
      ok: has(files.mobileActions, /callAPI\('openJob'[\s\S]*client_request_id/),
      detail: 'mobile openJob sends client_request_id',
    },
    {
      name: 'mobile:createCustomer-client-request-id',
      ok: has(files.mobileActions, /callAPI\('createCustomer'[\s\S]*client_request_id/),
      detail: 'mobile createCustomer sends client_request_id',
    },
    {
      name: 'pc:createBilling-client-request-id',
      ok: has(files.billing, /callApi\('createBilling'[\s\S]*client_request_id/),
      detail: 'PC billing create sends client_request_id',
    },
    {
      name: 'pc:createBilling-complex-payload',
      ok: has(files.billing, /parts:\s*\{[\s\S]*labor:\s*\{/),
      detail: 'PC billing sends structured parts/labor payload',
    },
    {
      name: 'pc:createCustomer-client-request-id',
      ok: has(files.crm, /callApi\('createCustomer'[\s\S]*client_request_id/),
      detail: 'PC CRM add customer sends client_request_id',
    },
    {
      name: 'pc:createPurchaseOrder-client-request-id',
      ok: has(files.inventory, /callApi\('createPurchaseOrder'[\s\S]*client_request_id/),
      detail: 'PC inventory PO create sends client_request_id',
    },
    {
      name: 'write-smoke:read-back-verification',
      ok: has(files.writeSmoke, 'verifyReadBack') && has(files.writeSmoke, "'getBilling'"),
      detail: 'write smoke validates read-back after writes',
    },
    {
      name: 'write-smoke:po-safety-gate',
      ok: has(files.writeSmoke, 'COMPHONE_PO_WRITE_SMOKE_CONFIRM') && has(files.writeSmoke, 'CREATE_TEST_PO'),
      detail: 'PO write smoke is behind an explicit safety gate',
    },
  ];

  const failures = checks.filter(check => !check.ok);
  const report = {
    generatedAt: new Date().toISOString(),
    status: failures.length ? 'fail' : 'ok',
    checks,
    failures,
  };

  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(REPORT_JSON, JSON.stringify(report, null, 2) + '\n', 'utf8');
  fs.writeFileSync(REPORT_MD, [
    '# PWA UI Write Contract',
    '',
    `- Status: ${report.status}`,
    `- Checks: ${checks.length}`,
    `- Failures: ${failures.length}`,
    '',
    '| Check | Result | Detail |',
    '|---|---|---|',
    ...checks.map(check => `| ${check.name} | ${check.ok ? 'OK' : 'FAIL'} | ${check.detail} |`),
    '',
  ].join('\n'), 'utf8');

  console.log(`[PWA UI Write Contract] status=${report.status} checks=${checks.length}`);
  for (const failure of failures) console.log(`- FAIL ${failure.name}: ${failure.detail}`);
  if (failures.length) process.exit(1);
}

main();
