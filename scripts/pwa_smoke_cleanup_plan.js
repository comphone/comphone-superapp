#!/usr/bin/env node
/*
 * Smoke/test data cleanup planner.
 *
 * Default mode is read-only. It searches live read APIs for records tagged by
 * write-smoke harnesses and writes a cleanup plan. It intentionally does not
 * delete data unless a future backend cleanup action is implemented and gated.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REPORT_DIR = path.join(ROOT, 'test_reports');
const REPORT_JSON = path.join(REPORT_DIR, 'pwa_smoke_cleanup_plan_latest.json');
const REPORT_MD = path.join(REPORT_DIR, 'pwa_smoke_cleanup_plan_latest.md');
const TOKEN = process.env.COMPHONE_AUTH_TOKEN || '';
const CONFIRM = process.env.COMPHONE_SMOKE_CLEANUP_CONFIRM || '';
const EXECUTE = process.env.COMPHONE_SMOKE_CLEANUP === '1';

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function gasUrl() {
  const gasConfig = read('pwa/gas_config.js');
  const match = gasConfig.match(/url:\s*'([^']+)'/);
  return process.env.COMPHONE_GAS_URL || (match && match[1]);
}

function containsSmokeMarker(value) {
  const text = JSON.stringify(value || {}).toUpperCase();
  return text.includes('AUTO WRITE SMOKE') ||
    text.includes('WSMOKE_') ||
    text.includes('PWA_WRITE_SMOKE') ||
    text.includes('SOURCE=PWA_WRITE_SMOKE');
}

function idOf(row) {
  return row && (row.id || row.job_id || row.customer_id || row.billing_id || row.po_id || row.ref || row.no || row.number || '');
}

async function request(url, action, payload = {}) {
  const qs = new URLSearchParams(Object.assign({ action, token: TOKEN, _t: Date.now() }, payload));
  const res = await fetch(`${url}?${qs.toString()}`, { redirect: 'follow' });
  return { status: res.status, body: await res.json() };
}

function rowsFrom(action, body) {
  if (!body) return [];
  if (action === 'getDashboardData') return body.jobs || (body.summary && body.summary.recentJobs) || [];
  if (action === 'listCustomers') return body.customers || body.data || body.rows || [];
  if (action === 'listBillings') return body.billings || body.data || body.rows || [];
  if (action === 'listPurchaseOrders') return body.purchaseOrders || body.orders || body.data || body.rows || [];
  if (action === 'getReportData') return body.rows || body.data || body.jobs || body.billings || [];
  return body.rows || body.data || [];
}

async function main() {
  const url = gasUrl();
  const report = {
    generatedAt: new Date().toISOString(),
    mode: EXECUTE ? 'execute-requested' : 'plan-only',
    tokenPresent: !!TOKEN,
    executed: false,
    status: 'ok',
    candidates: [],
    notes: [],
  };

  if (!url) {
    report.status = 'fail';
    report.notes.push('GAS URL is not configured.');
    writeReport(report);
    process.exit(1);
  }

  if (!TOKEN) {
    report.status = 'skipped';
    report.notes.push('Set COMPHONE_AUTH_TOKEN to scan production read APIs for smoke/test records.');
    writeReport(report);
    console.log('[PWA Smoke Cleanup Plan] skipped: COMPHONE_AUTH_TOKEN is not set');
    return;
  }

  const scans = [
    ['jobs', 'getDashboardData', {}],
    ['customers', 'listCustomers', {}],
    ['billings', 'listBillings', { limit: 100 }],
    ['purchase_orders', 'listPurchaseOrders', { limit: 100 }],
    ['reports', 'getReportData', { period: 'month' }],
  ];

  for (const [scope, action, payload] of scans) {
    try {
      const result = await request(url, action, payload);
      const rows = rowsFrom(action, result.body);
      rows.filter(containsSmokeMarker).forEach(row => {
        report.candidates.push({
          scope,
          action,
          id: idOf(row),
          label: row.title || row.customer || row.customer_name || row.name || row.description || row.symptom || '',
          cleanup: 'manual-review-required',
          reason: 'Record contains AUTO WRITE SMOKE / WSMOKE marker',
        });
      });
    } catch (err) {
      report.notes.push(`${action} scan failed: ${err.message}`);
    }
  }

  if (EXECUTE) {
    if (CONFIRM !== 'REVIEWED_SMOKE_RECORDS') {
      report.status = 'blocked';
      report.notes.push('Execution blocked. Set COMPHONE_SMOKE_CLEANUP_CONFIRM=REVIEWED_SMOKE_RECORDS after reviewing the plan.');
    } else {
      const cleanup = await request(url, 'cleanupSmokeTestRecords', {
        execute: 'true',
        confirm: 'DELETE_REVIEWED_SMOKE_RECORDS',
        records: JSON.stringify(report.candidates.map(item => ({ scope: item.scope, id: item.id }))),
      });
      report.cleanupAction = cleanup.body;
      if (cleanup.status === 200 && cleanup.body && cleanup.body.success !== false) {
        report.executed = !!cleanup.body.executed;
        report.status = cleanup.body.status || 'cleanup-action-complete';
        report.notes.push(`Backend cleanup action deleted ${((cleanup.body.deleted || []).length)} reviewed smoke records.`);
      } else {
        report.status = 'fail';
        report.notes.push(`Backend cleanup action failed: ${(cleanup.body && (cleanup.body.error || cleanup.body.status)) || cleanup.status}`);
      }
    }
  }

  writeReport(report);
  console.log(`[PWA Smoke Cleanup Plan] status=${report.status} candidates=${report.candidates.length}`);
  console.log(`[PWA Smoke Cleanup Plan] report: ${path.relative(ROOT, REPORT_JSON).replace(/\\/g, '/')}`);
}

function writeReport(report) {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(REPORT_JSON, JSON.stringify(report, null, 2) + '\n', 'utf8');
  fs.writeFileSync(REPORT_MD, [
    '# PWA Smoke Cleanup Plan',
    '',
    `- Status: ${report.status}`,
    `- Mode: ${report.mode}`,
    `- Token present: ${report.tokenPresent}`,
    `- Candidates: ${report.candidates.length}`,
    '',
    '| Scope | ID | Label | Cleanup | Reason |',
    '|---|---|---|---|---|',
    ...report.candidates.map(row => `| ${row.scope} | ${row.id || '-'} | ${String(row.label || '-').replace(/\|/g, '/')} | ${row.cleanup} | ${row.reason} |`),
    '',
    '## Notes',
    '',
    ...(report.notes.length ? report.notes.map(note => `- ${note}`) : ['- None']),
    '',
  ].join('\n'), 'utf8');
}

main().catch(err => {
  console.error('[PWA Smoke Cleanup Plan] FAILED');
  console.error(err);
  process.exit(1);
});
