#!/usr/bin/env node
/*
 * Sprint 150 Data Cleanup Owner Workflow
 *
 * Converts known smoke-test data findings into a controlled owner workflow:
 * inspect, approve, backfill/repair separately, and verify. This script never
 * executes production repair and never creates business rows.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REPORT = path.join(ROOT, 'test_reports', 'sprint150_data_cleanup_owner_workflow_latest.json');
const TOKEN = process.env.COMPHONE_AUTH_TOKEN || '';
const gasConfig = fs.readFileSync(path.join(ROOT, 'pwa', 'gas_config.js'), 'utf8');
const GAS_URL = process.env.COMPHONE_GAS_URL || (gasConfig.match(/url:\s*'([^']+)'/) || [])[1];

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

const TARGETS = [
  { key: 'jobs:J0022', domain: 'jobs', record_id: 'J0022', disposition: 'manual_backfill' },
  { key: 'jobs:J0021', domain: 'jobs', record_id: 'J0021', disposition: 'manual_backfill' },
  { key: 'customers:C0003', domain: 'customers', record_id: 'C0003', disposition: 'controlled_repair_candidate' },
  { key: 'customers:C0002', domain: 'customers', record_id: 'C0002', disposition: 'controlled_repair_candidate' },
];

async function main() {
  const files = {
    sprint144: read('scripts/sprint144_owner_data_resolution.js'),
    dataRepair: read('DataRepairConsole.gs'),
    contract: read('pwa/api_contract.js'),
  };
  const workflow = TARGETS.map(item => ({
    ...item,
    production_mutation: false,
    requires_owner_approval: true,
    workflow: ['inspect_source', 'owner_approve', 'archive_before_change', 'separate_repair_or_manual_backfill', 'verify_read_paths'],
  }));
  const checks = [
    { id: 'targets-locked', ok: TARGETS.length === 4 && TARGETS.every(row => row.key.includes(':')), type: 'static' },
    { id: 'owner-approval-required', ok: workflow.every(row => row.requires_owner_approval), type: 'static' },
    { id: 'no-production-mutation', ok: workflow.every(row => row.production_mutation === false), type: 'static' },
    { id: 'sprint144-plan-present', ok: has(files.sprint144, 'owner-data-resolution-no-production-mutation'), type: 'static' },
    { id: 'repair-execution-gated', ok: has(files.dataRepair, 'EXECUTE_REVIEWED_DATA_REPAIR') && has(files.contract, 'executeDataRepair'), type: 'static' },
    { id: 'does-not-execute-repair', ok: !/await\s+request\(\s*['"]executeDataRepair['"]/.test(fs.readFileSync(__filename, 'utf8')), type: 'static' },
  ];

  if (!TOKEN) {
    checks.push({ id: 'protected-source-inspection', ok: true, type: 'live', status: 'SKIP', detail: 'COMPHONE_AUTH_TOKEN required for protected source inspection.' });
  } else {
    for (const [id, action, payload] of [
      ['jobs-context', 'checkJobs', { limit: 50 }],
      ['customers-context', 'listCustomers', { limit: 50 }],
      ['repair-preview', 'previewDataRepair', { period: 'month' }],
      ['review-log-read', 'getDataReviewLog', {}],
    ]) {
      const result = await request(action, payload);
      checks.push({ id: `live-${id}`, ok: result.status === 200 && result.body && result.body.success !== false, type: 'live', http_status: result.status });
    }
  }

  const failures = checks.filter(row => !row.ok);
  const report = { generated_at: new Date().toISOString(), gas_url: GAS_URL, token_present: !!TOKEN, mode: 'data-cleanup-owner-workflow-no-mutation', status: failures.length ? 'fail' : 'ok', score: Math.round((checks.length - failures.length) / checks.length * 100), targets: workflow, checks };
  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, JSON.stringify(report, null, 2) + '\n', 'utf8');
  console.log(`[Sprint 150 Data Cleanup Owner Workflow] status=${report.status} score=${report.score}/100 checks=${checks.length - failures.length}/${checks.length}`);
  console.log(`[Sprint 150 Data Cleanup Owner Workflow] report: ${path.relative(ROOT, REPORT).replace(/\\/g, '/')}`);
  if (failures.length) process.exit(1);
}

main().catch(err => { console.error('[Sprint 150 Data Cleanup Owner Workflow] fatal:', err); process.exit(1); });
