#!/usr/bin/env node
/*
 * Sprint 155 Owner Data Backfill Readiness
 *
 * Owner approval/backfill checklist for known smoke/test records. This guard
 * never mutates production data.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REPORT = path.join(ROOT, 'test_reports', 'sprint155_owner_data_backfill_readiness_latest.json');
const TOKEN = process.env.COMPHONE_AUTH_TOKEN || '';
const gasConfig = fs.readFileSync(path.join(ROOT, 'pwa', 'gas_config.js'), 'utf8');
const GAS_URL = process.env.COMPHONE_GAS_URL || (gasConfig.match(/url:\s*'([^']+)'/) || [])[1];

const TARGETS = [
  { domain: 'jobs', id: 'J0022', recommended_action: 'owner_review_then_manual_backfill_or_archive' },
  { domain: 'jobs', id: 'J0021', recommended_action: 'owner_review_then_manual_backfill_or_archive' },
  { domain: 'customers', id: 'C0003', recommended_action: 'owner_review_then_merge_or_archive' },
  { domain: 'customers', id: 'C0002', recommended_action: 'owner_review_then_merge_or_archive' },
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
    read('scripts/sprint144_owner_data_resolution.js'),
    read('DataRepairConsole.gs'),
    read('pwa/api_contract.js'),
  ].join('\n');
  const checks = [
    { id: 'four-known-targets-tracked', ok: TARGETS.length === 4 && TARGETS.every(row => row.id), type: 'plan' },
    { id: 'archive-before-change-required', ok: has(source, 'archive-before-change') || has(source, 'archive_before_change'), type: 'plan' },
    { id: 'owner-confirmation-required', ok: has(source, 'owner_approve') || has(source, 'OWNER_REVIEWED'), type: 'plan' },
    { id: 'repair-preview-before-execute', ok: has(source, 'previewDataRepair') && has(source, 'executeDataRepair'), type: 'contract' },
    { id: 'no-production-mutation-in-guard', ok: !/request\(\s*['"]executeDataRepair['"]/.test(fs.readFileSync(__filename, 'utf8')), type: 'safety' },
  ];
  if (!TOKEN) {
    checks.push({ id: 'protected-source-review', ok: true, type: 'live', status: 'SKIP', detail: 'COMPHONE_AUTH_TOKEN required for live source review.' });
  } else {
    for (const [id, action, payload] of [
      ['jobs-source-list', 'checkJobs', { limit: 100 }],
      ['customers-source-list', 'listCustomers', { limit: 100 }],
      ['repair-status', 'getDataRepairStatus', {}],
      ['repair-preview', 'previewDataRepair', { period: 'month' }],
      ['review-log', 'getDataReviewLog', {}],
    ]) {
      const result = await request(action, payload);
      checks.push({ id: `live-${id}`, ok: result.status === 200 && result.body && result.body.success !== false, type: 'live', http_status: result.status });
    }
  }
  const failures = checks.filter(row => !row.ok);
  const report = { generated_at: new Date().toISOString(), mode: 'owner-data-backfill-readiness-no-mutation', token_present: !!TOKEN, targets: TARGETS.map(row => Object.assign({ requires_owner_approval: true, production_mutation: false }, row)), status: failures.length ? 'fail' : 'ok', score: Math.round((checks.length - failures.length) / checks.length * 100), checks };
  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, JSON.stringify(report, null, 2) + '\n', 'utf8');
  console.log(`[Sprint 155 Owner Data Backfill] status=${report.status} score=${report.score}/100 checks=${checks.length - failures.length}/${checks.length}`);
  console.log(`[Sprint 155 Owner Data Backfill] report: ${path.relative(ROOT, REPORT).replace(/\\/g, '/')}`);
  if (failures.length) process.exit(1);
}

main().catch(err => {
  console.error('[Sprint 155 Owner Data Backfill] fatal:', err);
  process.exit(1);
});
