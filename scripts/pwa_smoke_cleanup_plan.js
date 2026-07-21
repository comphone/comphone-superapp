#!/usr/bin/env node
/*
 * Smoke/test data cleanup planner.
 *
 * Default mode is read-only. It searches live read APIs for records tagged by
 * write-smoke harnesses and writes a cleanup plan. It intentionally does not
 * delete data unless the backend cleanup action is explicitly confirmed.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REPORT_DIR = path.join(ROOT, 'test_reports');
const REPORT_JSON = path.join(REPORT_DIR, 'pwa_smoke_cleanup_plan_latest.json');
const REPORT_MD = path.join(REPORT_DIR, 'pwa_smoke_cleanup_plan_latest.md');
const WRITE_SMOKE_REPORT = path.join(REPORT_DIR, 'pwa_write_smoke_latest.json');
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

function idOf(row, scope) {
  if (!row) return '';
  if (scope === 'jobs') return row.job_id || row.Job_ID || row.id || '';
  if (scope === 'customers') return row.customer_id || row.Customer_ID || row.id || '';
  if (scope === 'billings') return row.billing_id || row.Billing_ID || row.id || '';
  if (scope === 'purchase_orders') return row.po_id || row.PO_ID || row.id || '';
  return row.id || row.ref || row.no || row.number || '';
}

function pushUniqueCandidate(report, candidate) {
  const key = `${candidate.scope}:${candidate.id}`;
  if (!candidate.id || report.candidates.some(item => `${item.scope}:${item.id}` === key)) return;
  report.candidates.push(candidate);
}

function candidateKey(item) {
  return `${item.scope}:${item.id}`;
}

function loadLatestWriteSmokeCandidates() {
  if (!fs.existsSync(WRITE_SMOKE_REPORT)) return [];
  try {
    const latest = JSON.parse(fs.readFileSync(WRITE_SMOKE_REPORT, 'utf8'));
    if (!latest || latest.mode !== 'write' || !latest.smoke_id) return [];
    const out = [];
    (latest.results || []).forEach(row => {
      if (!row || !row.ok || !row.response_id) return;
      const phase = String(row.phase || '');
      let scope = '';
      if (phase.indexOf('job') === 0) scope = 'jobs';
      if (phase.indexOf('customer') === 0) scope = 'customers';
      if (phase.indexOf('billing') === 0) scope = 'billings';
      if (phase.indexOf('po') === 0) scope = 'purchase_orders';
      if (!scope) return;
      out.push({
        scope,
        action: 'pwa_write_smoke_latest',
        id: row.response_id,
        label: latest.smoke_id,
        cleanup: 'latest-write-smoke-report',
        reason: `Latest write-smoke report produced ${row.response_id}`,
      });
    });
    return out;
  } catch (err) {
    return [{ scope: 'report', action: 'pwa_write_smoke_latest', id: '', label: '', cleanup: 'read-error', reason: err.message }];
  }
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
  if (action === 'listPurchaseOrders') return body.items || body.purchaseOrders || body.orders || body.data || body.rows || [];
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
    hints: [],
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
        pushUniqueCandidate(report, {
          scope,
          action,
          id: idOf(row, scope),
          label: row.title || row.customer || row.customer_name || row.name || row.description || row.symptom || '',
          cleanup: 'manual-review-required',
          reason: 'Record contains AUTO WRITE SMOKE / WSMOKE marker',
        });
      });
    } catch (err) {
      report.notes.push(`${action} scan failed: ${err.message}`);
    }
  }

  report.hints = loadLatestWriteSmokeCandidates().filter(item => item.id);
  if (report.hints.length) {
    report.notes.push(`${report.hints.length} latest write-smoke IDs retained as hints only; live read scans decide cleanup candidates.`);
  }

  if (EXECUTE) {
    if (CONFIRM !== 'REVIEWED_SMOKE_RECORDS') {
      report.status = 'blocked';
      report.notes.push('Execution blocked. Set COMPHONE_SMOKE_CLEANUP_CONFIRM=REVIEWED_SMOKE_RECORDS after reviewing the plan.');
    } else if (!report.candidates.length) {
      report.status = 'nothing-to-clean';
      report.notes.push('No live smoke records were found; backend cleanup was not called.');
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
        const backendSeen = new Set([]
          .concat(cleanup.body.candidates || [])
          .concat(cleanup.body.deleted || [])
          .concat(cleanup.body.skipped || [])
          .map(candidateKey));
        const notFound = report.candidates.filter(item => !backendSeen.has(candidateKey(item)));
        if (notFound.length) {
          report.notFoundAfterBackendScan = notFound.map(item => ({ scope: item.scope, id: item.id }));
          report.notes.push(`Backend cleanup scan did not find ${notFound.length} requested records; these are not present in target sheets.`);
        }
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
    `- Historical hints: ${(report.hints || []).length}`,
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
