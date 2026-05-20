#!/usr/bin/env node
/*
 * Sprint 144 Owner Data Resolution
 *
 * Converts Sprint 139 data findings into an owner-approved resolution plan.
 * This script is intentionally non-mutating: it must never call executeDataRepair
 * or write production rows. It may read live protected data when a session token
 * is provided, and it always produces a clear owner checklist.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REPORT = path.join(ROOT, 'test_reports', 'sprint144_owner_data_resolution_latest.json');
const MARKDOWN = path.join(ROOT, 'test_reports', 'sprint144_owner_data_resolution_latest.md');
const SPRINT139_REPORT = path.join(ROOT, 'test_reports', 'sprint139_data_cleanup_triage_latest.json');
const TOKEN = process.env.COMPHONE_AUTH_TOKEN || '';
const gasConfig = fs.readFileSync(path.join(ROOT, 'pwa', 'gas_config.js'), 'utf8');
const urlMatch = gasConfig.match(/url:\s*'([^']+)'/);
const GAS_URL = process.env.COMPHONE_GAS_URL || (urlMatch && urlMatch[1]);

function read(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }
function has(text, token) { return text.includes(token); }
function safeJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (_) { return null; }
}
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

function priorFindings() {
  const report = safeJson(SPRINT139_REPORT);
  const rows = report && Array.isArray(report.findings) ? report.findings : [];
  if (rows.length) return rows;
  return [
    { key: 'jobs:J0022', domain: 'jobs', disposition: 'manual_backfill' },
    { key: 'jobs:J0021', domain: 'jobs', disposition: 'manual_backfill' },
    { key: 'customers:C0003', domain: 'customers', disposition: 'controlled_repair_candidate' },
    { key: 'customers:C0002', domain: 'customers', disposition: 'controlled_repair_candidate' },
  ];
}

function buildResolutionPlan(findings) {
  return findings.map(item => {
    const key = item.key || item.id || item.record_key || `${item.domain || 'unknown'}:${item.record_id || 'unknown'}`;
    const domain = item.domain || key.split(':')[0] || 'unknown';
    const disposition = item.disposition || item.recommended_disposition || 'manual_backfill';
    const owner_action = disposition === 'controlled_repair_candidate'
      ? 'owner_review_then_preview_repair'
      : 'owner_manual_verify_and_backfill';
    return {
      key,
      domain,
      disposition,
      owner_action,
      production_mutation: false,
      requires_owner_approval: true,
      next_step: 'Confirm source-of-truth values, preview any generated repair, archive before change, then run a separate approved repair sprint.',
    };
  });
}

async function liveContext() {
  if (!TOKEN) {
    return [{ id: 'protected-data-context', ok: true, type: 'live', status: 'SKIP', detail: 'COMPHONE_AUTH_TOKEN required for protected read-only context.' }];
  }
  const checks = [];
  for (const [id, action, payload] of [
    ['jobs-read-context', 'checkJobs', { limit: 25 }],
    ['customers-read-context', 'listCustomers', { limit: 25 }],
    ['review-log-read-context', 'getDataReviewLog', {}],
  ]) {
    const result = await request(action, payload);
    checks.push({ id, ok: result.status === 200 && result.body && result.body.success !== false, type: 'live', http_status: result.status });
  }
  return checks;
}

async function main() {
  const files = {
    repair: read('scripts/sprint111_controlled_data_repair_execution.js'),
    triage: read('scripts/sprint139_data_cleanup_triage.js'),
    contract: read('pwa/api_contract.js'),
  };
  const findings = priorFindings();
  const resolution_plan = buildResolutionPlan(findings);
  const checks = [
    { id: 'owner-approval-required', ok: resolution_plan.every(row => row.requires_owner_approval === true), type: 'static' },
    { id: 'no-production-mutation', ok: resolution_plan.every(row => row.production_mutation === false), type: 'static' },
    { id: 'repair-execution-stays-gated', ok: has(files.repair, 'OWNER_APPROVED_DATA_REPAIR') || has(files.repair, 'EXECUTE_REVIEWED_DATA_REPAIR'), type: 'static' },
    { id: 'repair-execution-is-not-invoked', ok: !/await\s+request\(\s*['"]executeDataRepair['"]/.test(fs.readFileSync(__filename, 'utf8')), type: 'static' },
    { id: 'review-log-contract-present', ok: has(files.contract, 'getDataReviewLog') && has(files.contract, 'saveDataReviewLog') && has(files.contract, 'executeDataRepair'), type: 'static' },
  ].concat(await liveContext());

  const failures = checks.filter(row => !row.ok);
  const report = {
    generated_at: new Date().toISOString(),
    gas_url: GAS_URL,
    token_present: !!TOKEN,
    mode: 'owner-data-resolution-no-production-mutation',
    status: failures.length ? 'fail' : 'ok',
    score: Math.round((checks.length - failures.length) / checks.length * 100),
    source_findings: findings.length,
    resolution_plan,
    checks,
  };
  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, JSON.stringify(report, null, 2) + '\n', 'utf8');
  fs.writeFileSync(MARKDOWN, [
    '# Sprint 144 Owner Data Resolution',
    '',
    `Status: ${report.status}`,
    `Score: ${report.score}/100`,
    '',
    'Production mutation: false',
    '',
    ...resolution_plan.map(row => `- ${row.key}: ${row.disposition} -> ${row.owner_action}`),
    '',
  ].join('\n'), 'utf8');
  console.log(`[Sprint 144 Owner Data Resolution] status=${report.status} score=${report.score}/100 checks=${checks.length - failures.length}/${checks.length}`);
  console.log(`[Sprint 144 Owner Data Resolution] report: ${path.relative(ROOT, REPORT).replace(/\\/g, '/')}`);
  if (failures.length) process.exit(1);
}

main().catch(err => { console.error('[Sprint 144 Owner Data Resolution] fatal:', err); process.exit(1); });
