#!/usr/bin/env node
/*
 * Sprint 77 focused audit for Billing end-to-end workflow.
 * Covers: PC/mobile billing UI, backend routes, job handoff, payment/receipt,
 * field contract normalization, and optional live read checks.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REPORT_DIR = path.join(ROOT, 'test_reports');
const REPORT_JSON = path.join(REPORT_DIR, 'sprint77_billing_e2e_latest.json');
const REPORT_MD = path.join(REPORT_DIR, 'sprint77_billing_e2e_latest.md');
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
    mobileApp: read('pwa/app.js') + '\n' + read('pwa/billing_customer.js') + '\n' + read('pwa/billing_slip_verify.js') + '\n' + read('pwa/app_actions.js'),
    pcHtml: read('pwa/dashboard_pc.html'),
    pcCore: read('pwa/dashboard_pc_core.js'),
    billingSection: read('pwa/billing_section.js'),
    billingShim: read('pwa/section_billing.js'),
    sectionJobs: read('pwa/section_jobs.js'),
    apiContract: read('pwa/api_contract.js'),
    routerSplit: read('clasp-ready/RouterSplit.gs'),
    billingCore: read('clasp-ready/BillingCore.gs'),
    billingPayment: read('clasp-ready/BillingPayment.gs'),
    billingExport: read('clasp-ready/BillingExport.gs'),
    jobsHandler: read('clasp-ready/JobsHandler.gs'),
    taxEngine: read('clasp-ready/TaxEngine.gs'),
  };

  const checks = [];
  const issues = [];
  function check(area, name, ok, severity, detail, remediation = '') {
    const row = { area, name, ok: !!ok, severity, detail, remediation };
    checks.push(row);
    if (!row.ok) issues.push(row);
  }

  check('pc-billing', 'real-renderer-loaded',
    has(source.pcHtml, 'billing_section.js') && has(source.pcCore, 'renderBillingSection') && has(source.billingSection, 'function renderBillingSection'),
    'P0',
    'PC Billing must load and route to the production billing renderer.');
  check('pc-billing', 'no-demo-shim-runtime',
    has(source.billingShim, 'COMPHONE_BILLING_SHIM_READY') && !has(source.billingShim, /fake demo|coming soon/i),
    'P1',
    'Billing compatibility shim must not contain fake/demo production content.');
  check('pc-billing', 'actions-present',
    ['_listBillings', '_showBillingDetail', '_showCreateBilling', '_doCreateBilling', '_doMarkPaid', '_showPromptPayQR', '_exportBillingCSV']
      .every(fn => has(source.billingSection, fn)),
    'P0',
    'Billing UI must expose list/detail/create/pay/QR/export actions.');
  check('pc-billing', 'backend-field-normalization',
    has(source.billingSection, '_normalizeBilling') &&
      ['payment_status', 'job_id', 'billing_id', 'balance_due', 'total_amount'].every(field => has(source.billingSection, field)),
    'P0',
    'Billing UI must normalize backend lowercase fields before rendering legacy table/detail code.');
  check('pc-billing', 'qr-response-compatible',
    has(source.billingSection, 'qr_image_url') && has(source.billingSection, 'promptpay_qr_url'),
    'P1',
    'PromptPay QR UI should accept current backend response fields.');
  check('pc-billing', 'payment-amount-correct',
    has(source.billingSection, 'totalForPayment') && !has(source.billingSection, 'amount_paid: balanceDue'),
    'P1',
    'Mark-paid should send the total paid amount, not only remaining balance, to avoid partial payment math drift.');

  check('mobile-billing', 'modal-and-loaders-present',
    ['modal-billing', 'billing-modal-content'].every(id => has(source.mobileHtml, id)) &&
      ['openBillingModal', 'loadBillingData', 'saveBilling', 'openQRPayment'].every(fn => has(source.mobileApp, fn)),
    'P0',
    'Mobile Billing must include billing modal and save/QR handlers.');
  check('mobile-billing', 'slip-flow-present',
    ['openSlipUploadModal', 'verifySlipWithAI', 'confirmPaymentManual', 'verifyPaymentSlip', 'markBillingPaid'].every(token => has(source.mobileApp, token)),
    'P1',
    'Mobile Billing should expose payment slip verification and paid handoff.');

  check('job-handoff', 'jobs-to-billing-present',
    has(source.sectionJobs, '_openPcJobBilling') && has(source.sectionJobs, 'openBillingModal') && has(source.mobileApp, 'openBillingModal'),
    'P0',
    'Jobs must hand off directly to Billing on both PC and mobile.');

  check('backend-billing', 'routes-present',
    ['createBilling', 'getBilling', 'listBillings', 'generatePromptPayQR', 'markBillingPaid', 'verifyPaymentSlip']
      .every(action => has(source.routerSplit, `'${action}'`)),
    'P0',
    'RouterSplit must expose Billing create/read/list/QR/payment/slip actions.');
  check('backend-billing', 'create-wrapper-present',
    has(source.jobsHandler, 'function createBilling') || has(source.billingCore, 'function createBilling'),
    'P0',
    'createBilling route must resolve to a real function.');
  check('backend-billing', 'payment-receipt-hooks',
    has(source.billingPayment, 'function markBillingPaid') && has(source.billingPayment, 'generateReceiptPDF') &&
      has(source.billingExport, 'function generateReceiptPDF'),
    'P0',
    'Paid billing must generate receipt through BillingExport.');
  check('backend-billing', 'tax-hooks-present',
    has(source.billingCore, 'calculateTax') && has(source.taxEngine, 'function calculateTax') && has(source.taxEngine, 'function applyTaxToBilling'),
    'P1',
    'Billing total calculation should keep VAT/WHT hooks intact.');
  check('contract', 'billing-workflow-documented',
    has(source.apiContract, 'billing_payment') &&
      ['getBilling', 'listBillings', 'createBilling', 'generatePromptPayQR', 'markBillingPaid', 'verifyPaymentSlip'].every(action => has(source.apiContract, action)),
    'P1',
    'API contract should document Billing read/write/payment actions.');

  const live = [];
  if (TOKEN && gasUrl()) {
    const url = gasUrl();
    for (const [action, payload] of [
      ['listBillings', { limit: 10 }],
      ['getReportData', { period: 'month' }],
      ['taxAction', { sub: 'calculate', subtotal: 1000, tax_mode: 'VAT7' }],
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

  live.forEach(row => check('live-billing-read', row.action, row.ok, 'P1',
    row.ok ? `HTTP ${row.status} in ${row.elapsed_ms}ms` : row.error,
    'Investigate protected Billing/Tax read route if live smoke fails.'));

  const reportScore = score(issues);
  const report = {
    generated_at: new Date().toISOString(),
    name: 'Sprint 77 Billing E2E Audit',
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
    '# Sprint 77 Billing E2E Audit',
    '',
    `Score: **${reportScore}/100**`,
    `Status: **${report.status.toUpperCase()}**`,
    `Token present: ${!!TOKEN}`,
    '',
    '## Findings',
    '',
    issues.length
      ? '| Severity | Area | Check | Detail |\n|---|---|---|---|\n' + issues.map(row => `| ${row.severity} | ${md(row.area)} | ${md(row.name)} | ${md(row.detail)} |`).join('\n')
      : 'No findings. Billing E2E contracts are aligned.',
    '',
    '## Checks',
    '',
    '| Area | Check | Result | Detail |',
    '|---|---|---|---|',
    ...checks.map(row => `| ${md(row.area)} | ${md(row.name)} | ${row.ok ? 'OK' : row.severity} | ${md(row.detail)} |`),
    '',
  ].join('\n'));

  console.log(`[Sprint 77 Billing E2E Audit] score=${reportScore}/100 status=${report.status} checks=${checks.length} issues=${issues.length}`);
  console.log(`[Sprint 77 Billing E2E Audit] report: ${path.relative(ROOT, REPORT_JSON).replace(/\\/g, '/')}`);
  for (const issue of issues) console.log(`[${issue.severity}] ${issue.area}/${issue.name}: ${issue.detail}`);
  if (issues.some(issue => issue.severity === 'P0')) process.exit(1);
}

main().catch(err => {
  console.error('[Sprint 77 Billing E2E Audit] FAILED:', err.stack || err.message);
  process.exit(1);
});
