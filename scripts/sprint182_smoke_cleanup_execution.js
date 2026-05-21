#!/usr/bin/env node
/*
 * Sprint 182 Smoke Cleanup Execution
 *
 * Default mode is protected preview only. Real archive/delete requires:
 *   COMPHONE_AUTH_TOKEN
 *   COMPHONE_SPRINT182_EXECUTE_CLEANUP=1
 *   COMPHONE_SPRINT182_CLEANUP_CONFIRM=DELETE_REVIEWED_SMOKE_RECORDS
 *
 * Backend deletion is still limited to rows with smoke markers and archives
 * every deleted row into DB_SMOKE_CLEANUP_ARCHIVE.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REPORT = path.join(ROOT, 'test_reports', 'sprint182_smoke_cleanup_execution_latest.json');
const TOKEN = process.env.COMPHONE_AUTH_TOKEN || '';
const EXECUTE = process.env.COMPHONE_SPRINT182_EXECUTE_CLEANUP === '1';
const CONFIRM = process.env.COMPHONE_SPRINT182_CLEANUP_CONFIRM || '';
const TARGETS = [
  { scope: 'jobs', id: 'J0022' },
  { scope: 'jobs', id: 'J0021' },
  { scope: 'customers', id: 'C0003' },
  { scope: 'customers', id: 'C0002' },
];

const gasConfig = fs.readFileSync(path.join(ROOT, 'pwa', 'gas_config.js'), 'utf8');
const GAS_URL = process.env.COMPHONE_GAS_URL || (gasConfig.match(/url:\s*'([^']+)'/) || [])[1];

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

async function request(action, payload = {}) {
  const data = Object.assign({ action, _t: Date.now() }, payload);
  if (TOKEN) data.token = TOKEN;
  for (const key of Object.keys(data)) {
    if (data[key] && typeof data[key] === 'object') data[key] = JSON.stringify(data[key]);
  }
  const res = await fetch(`${GAS_URL}?${new URLSearchParams(data).toString()}`, { redirect: 'follow' });
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch (_) { throw new Error(`${action}: non-JSON ${res.status} ${text.slice(0, 120)}`); }
  return { status: res.status, body };
}

async function main() {
  const smokeGs = read('clasp-ready/SmokeCleanup.gs');
  const adminJs = read('pwa/admin_panel.js');
  const settingsJs = read('pwa/section_settings.js');
  const routerGs = read('clasp-ready/Router.gs');
  const publicBlock = (routerGs.match(/var PUBLIC_ACTIONS = \{([\s\S]*?)\n  \};/) || [])[1] || '';
  const adminBlock = (routerGs.match(/var ADMIN_ACTIONS = \{([\s\S]*?)\n  \};/) || [])[1] || '';
  const checks = [
    { id: 'cleanup-confirm-gate', ok: smokeGs.includes('DELETE_REVIEWED_SMOKE_RECORDS') },
    { id: 'archive-before-delete', ok: smokeGs.includes('archiveSmokeCleanupRow_') && smokeGs.includes('sheet.deleteRow') },
    { id: 'smoke-marker-required', ok: smokeGs.includes('smokeCleanupRowHasMarker_') && smokeGs.includes('missing-smoke-marker') },
    { id: 'admin-ui-cleanup-menu', ok: adminJs.includes('Smoke/Test Data Cleanup') && adminJs.includes('executeAdminSmokeCleanup_') },
    { id: 'pc-settings-cleanup-menu', ok: settingsJs.includes('Smoke/Test Data Cleanup') && settingsJs.includes('executeSettingsSmokeCleanup_') },
    { id: 'cleanup-admin-protected', ok: adminBlock.includes("'cleanupSmokeTestRecords': 1") && !publicBlock.includes('cleanupSmokeTestRecords') },
  ];

  const live = { token_present: !!TOKEN, execute_requested: EXECUTE, preview: null, execution: null, verify: null };
  if (!TOKEN) {
    checks.push({ id: 'protected-preview-live', ok: true, status: 'SKIP', detail: 'COMPHONE_AUTH_TOKEN is required for live cleanup preview.' });
  } else {
    const preview = await request('cleanupSmokeTestRecords', { execute: false, records: TARGETS });
    live.preview = {
      http_status: preview.status,
      ok: preview.status === 200 && preview.body && preview.body.success !== false,
      candidates: preview.body && preview.body.candidates ? preview.body.candidates.length : 0,
      skipped: preview.body && preview.body.skipped ? preview.body.skipped.length : 0,
    };
    checks.push({ id: 'protected-preview-live', ok: live.preview.ok, live: live.preview });

    if (EXECUTE) {
      const executionAllowed = CONFIRM === 'DELETE_REVIEWED_SMOKE_RECORDS';
      checks.push({ id: 'owner-confirmation-present', ok: executionAllowed, confirm: CONFIRM ? 'provided' : 'missing' });
      if (executionAllowed) {
        const execution = await request('cleanupSmokeTestRecords', {
          execute: true,
          confirm: CONFIRM,
          records: TARGETS,
          operator: 'sprint182-guard',
          reason: 'Sprint 182 owner-approved smoke cleanup'
        });
        live.execution = {
          http_status: execution.status,
          ok: execution.status === 200 && execution.body && execution.body.success !== false,
          deleted: execution.body && execution.body.deleted ? execution.body.deleted.length : 0,
          skipped: execution.body && execution.body.skipped ? execution.body.skipped.length : 0,
          status: execution.body && execution.body.status,
        };
        checks.push({ id: 'owner-approved-execution', ok: live.execution.ok, live: live.execution });
        const verify = await request('cleanupSmokeTestRecords', { execute: false, records: TARGETS });
        live.verify = {
          http_status: verify.status,
          ok: verify.status === 200 && verify.body && verify.body.success !== false,
          remaining_candidates: verify.body && verify.body.candidates ? verify.body.candidates.length : 0,
        };
        checks.push({ id: 'post-cleanup-verify', ok: live.verify.ok, live: live.verify });
      }
    } else {
      checks.push({ id: 'owner-approved-execution', ok: true, status: 'SKIP', detail: 'Set Sprint 182 execute env vars to archive/delete smoke-marker rows.' });
    }
  }

  const failures = checks.filter(row => !row.ok);
  const report = {
    generated_at: new Date().toISOString(),
    mode: 'smoke-cleanup-preview-or-owner-approved-execution',
    targets: TARGETS,
    execute_requested: EXECUTE,
    executed: !!(live.execution && live.execution.ok),
    status: failures.length ? 'fail' : 'ok',
    checks,
    live,
  };
  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, JSON.stringify(report, null, 2) + '\n');
  console.log(`[Sprint 182 Smoke Cleanup] status=${report.status} checks=${checks.length - failures.length}/${checks.length} executed=${report.executed}`);
  console.log(`[Sprint 182 Smoke Cleanup] report: ${path.relative(ROOT, REPORT).replace(/\\/g, '/')}`);
  if (failures.length) process.exit(1);
}

main().catch(err => {
  console.error('[Sprint 182 Smoke Cleanup] FAILED');
  console.error(err);
  process.exit(1);
});
