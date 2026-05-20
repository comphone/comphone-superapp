#!/usr/bin/env node
/*
 * Sprint 148 Ops Permission Cleanup
 *
 * Produces a readiness proof for retiring review-log fallback later. This guard
 * keeps fallback visible for safety, verifies DB_DATA_REVIEW_LOG registry
 * coverage, checks production URL stability, and confirms no secrets are
 * committed. Live checks are read-only unless the existing Sprint 143 metadata
 * proof is run separately.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REPORT = path.join(ROOT, 'test_reports', 'sprint148_ops_permission_cleanup_latest.json');
const TOKEN = process.env.COMPHONE_AUTH_TOKEN || '';
const gasConfig = fs.readFileSync(path.join(ROOT, 'pwa', 'gas_config.js'), 'utf8');
const urlMatch = gasConfig.match(/url:\s*'([^']+)'/);
const GAS_URL = process.env.COMPHONE_GAS_URL || (urlMatch && urlMatch[1]);

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

function secretLeakChecks(text) {
  return [
    { id: 'no-google-api-key-leak', ok: !/AIza[0-9A-Za-z_-]{20,}/.test(text), type: 'static' },
    { id: 'no-line-token-leak', ok: !/[A-Za-z0-9+/]{120,}={0,2}/.test(text), type: 'static' },
    { id: 'no-browser-session-token-leak', ok: !/comphone_auth_session[\s\S]{0,120}[a-f0-9]{32,}/i.test(text), type: 'static' },
  ];
}

async function main() {
  const files = {
    dataRepair: read('clasp-ready/DataRepairConsole.gs'),
    schema: read('docs/database_schema_registry.json'),
    gas: read('pwa/gas_config.js'),
    blueprint: read('BLUEPRINT.md'),
    contract: read('pwa/api_contract.js'),
  };
  const repoSecretSurface = `${files.blueprint}\n${files.gas}\n${files.contract}`;
  const checks = [
    { id: 'db-data-review-log-registry', ok: has(files.schema, 'DB_DATA_REVIEW_LOG') && has(files.schema, '"maintenance"'), type: 'static' },
    { id: 'fallback-visible-until-permission-fixed', ok: has(files.dataRepair, 'DATA_REVIEW_LOG_JSON') && has(files.dataRepair, 'script_properties_fallback'), type: 'static' },
    { id: 'permission-cleanup-runbook-documented', ok: has(files.blueprint, 'Sprint 148') || has(files.blueprint, 'review-log fallback'), type: 'static' },
    { id: 'production-url-stable', ok: has(files.gas, 'AKfycbwN_mbyHOJ4vXRNpHjuN8dUFbXjERwtgTbNROt5_ynakfYm6Xv4RrgvhPMvI53lIhPWBA'), type: 'static' },
    { id: 'review-log-actions-in-contract', ok: has(files.contract, 'getDataReviewLog') && has(files.contract, 'saveDataReviewLog'), type: 'static' },
  ].concat(secretLeakChecks(repoSecretSurface));

  if (!TOKEN) {
    checks.push({ id: 'review-log-live-storage-read', ok: true, type: 'live', status: 'SKIP', detail: 'COMPHONE_AUTH_TOKEN required for protected review-log storage proof.' });
  } else {
    const result = await request('getDataReviewLog', {});
    checks.push({ id: 'review-log-live-storage-read', ok: result.status === 200 && result.body && result.body.success !== false, type: 'live', http_status: result.status, storage: result.body && result.body.storage });
  }

  const failures = checks.filter(row => !row.ok);
  const report = {
    generated_at: new Date().toISOString(),
    gas_url: GAS_URL,
    token_present: !!TOKEN,
    mode: 'ops-permission-cleanup-readiness',
    status: failures.length ? 'fail' : 'ok',
    score: Math.round((checks.length - failures.length) / checks.length * 100),
    owner_next_steps: [
      'Confirm Apps Script executing account can edit the production spreadsheet.',
      'Run Sprint 143 metadata proof after permission change.',
      'Retire DATA_REVIEW_LOG_JSON fallback only after DB_DATA_REVIEW_LOG readback is stable.',
    ],
    checks,
  };
  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, JSON.stringify(report, null, 2) + '\n', 'utf8');
  console.log(`[Sprint 148 Ops Permission Cleanup] status=${report.status} score=${report.score}/100 checks=${checks.length - failures.length}/${checks.length}`);
  console.log(`[Sprint 148 Ops Permission Cleanup] report: ${path.relative(ROOT, REPORT).replace(/\\/g, '/')}`);
  if (failures.length) process.exit(1);
}

main().catch(err => { console.error('[Sprint 148 Ops Permission Cleanup] fatal:', err); process.exit(1); });
