#!/usr/bin/env node
/*
 * Static UI surface audit for PC/Mobile high-use write flows.
 * This complements browser automation by catching broken load order,
 * missing modal handlers, unsafe submit buttons, and modal overflow risks.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REPORT_DIR = path.join(ROOT, 'test_reports');
const REPORT_JSON = path.join(REPORT_DIR, 'pwa_ui_surface_audit_latest.json');
const REPORT_MD = path.join(REPORT_DIR, 'pwa_ui_surface_audit_latest.md');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function localScripts(html) {
  return [...html.matchAll(/<script\s+src=["']([^"']+)["']/g)]
    .map(match => match[1].split('?')[0])
    .filter(src => !/^https?:\/\//.test(src) && !src.startsWith('//'));
}

function checkOrder(scripts, before, after) {
  const b = scripts.indexOf(before);
  const a = scripts.indexOf(after);
  return b > -1 && a > -1 && b < a;
}

function has(text, pattern) {
  return typeof pattern === 'string' ? text.includes(pattern) : pattern.test(text);
}

function main() {
  const indexHtml = read('pwa/index.html');
  const pcHtml = read('pwa/dashboard_pc.html');
  const pcScripts = localScripts(pcHtml);
  const mobileScripts = localScripts(indexHtml);
  const files = {
    apiClient: read('pwa/api_client.js'),
    mobileActions: read('pwa/app_actions.js'),
    billing: read('pwa/billing_section.js'),
    crm: read('pwa/section_crm.js'),
    inventory: read('pwa/section_inventory.js'),
    po: read('pwa/section_po.js'),
  };

  const checks = [
    {
      name: 'pc-load-order:api-before-sections',
      ok: checkOrder(pcScripts, 'api_client.js', 'section_crm.js') &&
        checkOrder(pcScripts, 'api_client.js', 'section_inventory.js') &&
        checkOrder(pcScripts, 'api_client.js', 'billing_section.js'),
      detail: 'PC dashboard loads api_client.js before write-flow sections',
    },
    {
      name: 'mobile-load-order:api-before-app-actions',
      ok: checkOrder(mobileScripts, 'api_client.js', 'app_actions.js'),
      detail: 'Mobile PWA loads api_client.js before app_actions.js',
    },
    {
      name: 'global-helper:createWriteRequestId',
      ok: has(files.apiClient, 'function createWriteRequestId(prefix)'),
      detail: 'write request id helper is available globally from api_client.js',
    },
    {
      name: 'mobile-open-job:handlers',
      ok: has(files.mobileActions, 'function openNewJob') &&
        has(files.mobileActions, 'async function submitNewJob') &&
        has(files.mobileActions, "callAPI('openJob'"),
      detail: 'mobile open-job modal and submit handler exist',
    },
    {
      name: 'mobile-open-job:double-submit-guard',
      ok: has(files.mobileActions, /dataset\.submitting[\s\S]*disabled\s*=\s*true/),
      detail: 'mobile open-job flow disables submit during write',
    },
    {
      name: 'mobile-customer:handlers',
      ok: has(files.mobileActions, 'async function saveNewCustomer') &&
        has(files.mobileActions, "callAPI('createCustomer'"),
      detail: 'mobile add-customer submit handler exists',
    },
    {
      name: 'pc-billing:modal-scroll',
      ok: has(files.billing, /max-height:\s*85vh[\s\S]*overflow-y:\s*auto/),
      detail: 'PC billing modal has constrained height and scroll',
    },
    {
      name: 'pc-billing:double-submit-guard',
      ok: has(files.billing, /dataset\.submitting[\s\S]*disabled\s*=\s*true/),
      detail: 'PC billing create flow disables submit during write',
    },
    {
      name: 'pc-crm:add-customer-handler',
      ok: has(files.crm, 'async function _doAddCustomer') &&
        has(files.crm, "callApi('createCustomer'") &&
        has(files.crm, 'client_request_id'),
      detail: 'PC CRM add customer sends through API with request id',
    },
    {
      name: 'pc-inventory:create-po-handler',
      ok: has(files.inventory, 'async function _doCreatePO') &&
        has(files.inventory, "callApi('createPurchaseOrder'") &&
        has(files.inventory, 'client_request_id') &&
        has(files.inventory, 'items: poItems'),
      detail: 'PC inventory create PO sends structured items with request id',
    },
    {
      name: 'pc-po:receive-requires-confirm',
      ok: has(files.po, /confirm\([\s\S]*receivePurchaseOrder/),
      detail: 'PC receive PO flow requires a user confirmation before write',
    },
    {
      name: 'legacy-call-shape:stock-not-loaded',
      ok: !pcScripts.includes('stock.js') && !mobileScripts.includes('stock.js'),
      detail: 'legacy stock.js callApi({action}) surface is not loaded by PC/mobile shells',
    },
  ];

  const failures = checks.filter(check => !check.ok);
  const report = {
    generatedAt: new Date().toISOString(),
    status: failures.length ? 'fail' : 'ok',
    pcScripts,
    mobileScripts,
    checks,
    failures,
  };

  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(REPORT_JSON, JSON.stringify(report, null, 2) + '\n', 'utf8');
  fs.writeFileSync(REPORT_MD, [
    '# PWA UI Surface Audit',
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

  console.log(`[PWA UI Surface Audit] status=${report.status} checks=${checks.length}`);
  for (const failure of failures) console.log(`- FAIL ${failure.name}: ${failure.detail}`);
  if (failures.length) process.exit(1);
}

main();
