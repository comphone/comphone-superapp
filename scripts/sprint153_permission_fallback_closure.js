#!/usr/bin/env node
/*
 * Sprint 153 Permission Fallback Closure
 *
 * Readiness guard for closing the review-log fallback later. The fallback stays
 * active until live storage reports DB_DATA_REVIEW_LOG, and no secret or token
 * is written to the repo.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REPORT = path.join(ROOT, 'test_reports', 'sprint153_permission_fallback_closure_latest.json');
const TOKEN = process.env.COMPHONE_AUTH_TOKEN || '';
const gasConfig = fs.readFileSync(path.join(ROOT, 'pwa', 'gas_config.js'), 'utf8');
const GAS_URL = process.env.COMPHONE_GAS_URL || (gasConfig.match(/url:\s*'([^']+)'/) || [])[1];

function read(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }
function has(text, token) { return text.includes(token); }
async function request(action, payload = {}) {
  const data = Object.assign({ action, _t: Date.now() }, payload);
  if (TOKEN) data.token = TOKEN;
  const res = await fetch(`${GAS_URL}?${new URLSearchParams(data).toString()}`, { redirect: 'follow' });
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch (_) { throw new Error(`${action}: non-JSON ${res.status}`); }
  return { status: res.status, body };
}

async function main() {
  const files = {
    rootRepair: read('DataRepairConsole.gs'),
    claspRepair: read('clasp-ready/DataRepairConsole.gs'),
    schema: read('docs/database_schema_registry.json'),
    sprint148: read('scripts/sprint148_ops_permission_cleanup.js'),
    blueprint: read('BLUEPRINT.md'),
  };
  const repoSurface = `${files.rootRepair}\n${files.claspRepair}\n${files.schema}\n${files.blueprint}`;
  const checks = [
    { id: 'fallback-still-visible', ok: has(files.rootRepair, 'DATA_REVIEW_LOG_JSON') && has(files.rootRepair, 'script_properties_fallback'), type: 'static' },
    { id: 'root-clasp-fallback-aligned', ok: has(files.claspRepair, 'DATA_REVIEW_LOG_JSON') && has(files.claspRepair, 'script_properties_fallback'), type: 'static' },
    { id: 'db-review-log-registered', ok: has(files.schema, 'DB_DATA_REVIEW_LOG'), type: 'static' },
    { id: 'sprint148-readiness-present', ok: has(files.sprint148, 'ops-permission-cleanup-readiness'), type: 'static' },
    { id: 'no-secret-leak', ok: !/AIza[0-9A-Za-z_-]{20,}/.test(repoSurface) && !/[A-Za-z0-9+/]{120,}={0,2}/.test(files.blueprint), type: 'static' },
  ];

  let liveStorage = 'unknown';
  if (!TOKEN) {
    checks.push({ id: 'live-storage-proof', ok: true, type: 'live', status: 'SKIP', detail: 'COMPHONE_AUTH_TOKEN required for storage closure proof.' });
  } else {
    const result = await request('getDataReviewLog', {});
    liveStorage = result.body && result.body.storage || 'unknown';
    checks.push({ id: 'live-storage-proof', ok: result.status === 200 && result.body && result.body.success !== false, type: 'live', http_status: result.status, storage: liveStorage });
    checks.push({ id: 'fallback-retirement-ready', ok: true, type: 'advisory', ready: liveStorage === 'sheet', detail: liveStorage === 'sheet' ? 'DB_DATA_REVIEW_LOG sheet storage is active.' : 'Keep fallback until Apps Script spreadsheet write permission is fixed.' });
  }

  const failures = checks.filter(row => !row.ok);
  const report = { generated_at: new Date().toISOString(), gas_url: GAS_URL, token_present: !!TOKEN, live_storage: liveStorage, mode: 'permission-fallback-closure-readiness', status: failures.length ? 'fail' : 'ok', score: Math.round((checks.length - failures.length) / checks.length * 100), checks };
  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, JSON.stringify(report, null, 2) + '\n', 'utf8');
  console.log(`[Sprint 153 Permission Fallback Closure] status=${report.status} score=${report.score}/100 checks=${checks.length - failures.length}/${checks.length} storage=${liveStorage}`);
  console.log(`[Sprint 153 Permission Fallback Closure] report: ${path.relative(ROOT, REPORT).replace(/\\/g, '/')}`);
  if (failures.length) process.exit(1);
}

main().catch(err => { console.error('[Sprint 153 Permission Fallback Closure] fatal:', err); process.exit(1); });
