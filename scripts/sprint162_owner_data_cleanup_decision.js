#!/usr/bin/env node
/*
 * Sprint 162 Owner Data Cleanup Decision
 *
 * Decision-only pack for the known smoke/test records. It creates an auditable
 * recommendation matrix and optional live context, but never repairs, deletes,
 * or creates business rows.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REPORT = path.join(ROOT, 'test_reports', 'sprint162_owner_data_cleanup_decision_latest.json');
const TOKEN = process.env.COMPHONE_AUTH_TOKEN || '';
const gasConfig = fs.readFileSync(path.join(ROOT, 'pwa', 'gas_config.js'), 'utf8');
const GAS_URL = process.env.COMPHONE_GAS_URL || (gasConfig.match(/url:\s*'([^']+)'/) || [])[1];

const TARGETS = [
  { key: 'jobs:J0022', domain: 'jobs', id: 'J0022', decision: 'owner_review_required', allowed_next: ['manual_backfill', 'archive_as_test', 'keep_as_real'] },
  { key: 'jobs:J0021', domain: 'jobs', id: 'J0021', decision: 'owner_review_required', allowed_next: ['manual_backfill', 'archive_as_test', 'keep_as_real'] },
  { key: 'customers:C0003', domain: 'customers', id: 'C0003', decision: 'owner_review_required', allowed_next: ['merge_duplicate', 'archive_as_test', 'keep_as_real'] },
  { key: 'customers:C0002', domain: 'customers', id: 'C0002', decision: 'owner_review_required', allowed_next: ['merge_duplicate', 'archive_as_test', 'keep_as_real'] },
];

function read(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }
function has(text, token) { return text.includes(token); }
async function request(action, payload = {}) {
  const data = Object.assign({ action, _t: Date.now() }, payload);
  if (TOKEN) data.token = TOKEN;
  Object.keys(data).forEach(key => { if (data[key] && typeof data[key] === 'object') data[key] = JSON.stringify(data[key]); });
  const res = await fetch(`${GAS_URL}?${new URLSearchParams(data).toString()}`, { redirect: 'follow' });
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch (_) { throw new Error(`${action}: non-JSON ${res.status}`); }
  return { status: res.status, body };
}

async function main() {
  const source = [
    read('scripts/sprint150_data_cleanup_owner_workflow.js'),
    read('scripts/sprint155_owner_data_backfill_readiness.js'),
    read('DataRepairConsole.gs'),
    read('pwa/api_contract.js'),
  ].join('\n');
  const checks = [
    { id: 'decision-targets-locked', ok: TARGETS.length === 4, type: 'decision' },
    { id: 'owner-review-required', ok: TARGETS.every(row => row.decision === 'owner_review_required'), type: 'decision' },
    { id: 'archive-before-change-contract', ok: has(source, 'archive-before-change') || has(source, 'archive_before_change'), type: 'safety' },
    { id: 'preview-before-execute-contract', ok: has(source, 'previewDataRepair') && has(source, 'executeDataRepair'), type: 'safety' },
    { id: 'no-mutation-in-this-script', ok: !/request\(\s*['"](executeDataRepair|cleanupSmokeTestRecords|createCustomer|openJob)['"]/.test(fs.readFileSync(__filename, 'utf8')), type: 'safety' },
  ];
  if (!TOKEN) {
    checks.push({ id: 'protected-owner-context', ok: true, type: 'live', status: 'SKIP', detail: 'COMPHONE_AUTH_TOKEN required for live owner context.' });
  } else {
    for (const [id, action, payload] of [
      ['jobs-context', 'checkJobs', { limit: 100 }],
      ['customers-context', 'listCustomers', { limit: 100 }],
      ['review-log', 'getDataReviewLog', {}],
      ['repair-preview', 'previewDataRepair', { period: 'month' }],
    ]) {
      const result = await request(action, payload);
      checks.push({ id: `live-${id}`, ok: result.status === 200 && result.body && result.body.success !== false, type: 'live', http_status: result.status });
    }
  }
  const failures = checks.filter(row => !row.ok);
  const report = { generated_at: new Date().toISOString(), mode: 'owner-data-cleanup-decision-no-mutation', token_present: !!TOKEN, targets: TARGETS, status: failures.length ? 'fail' : 'ok', score: Math.round((checks.length - failures.length) / checks.length * 100), checks };
  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, JSON.stringify(report, null, 2) + '\n', 'utf8');
  console.log(`[Sprint 162 Owner Data Decision] status=${report.status} score=${report.score}/100 checks=${checks.length - failures.length}/${checks.length}`);
  console.log(`[Sprint 162 Owner Data Decision] report: ${path.relative(ROOT, REPORT).replace(/\\/g, '/')}`);
  if (failures.length) process.exit(1);
}

main().catch(err => {
  console.error('[Sprint 162 Owner Data Decision] fatal:', err);
  process.exit(1);
});
