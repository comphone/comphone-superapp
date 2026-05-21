#!/usr/bin/env node
/*
 * Sprint 166 Protected Token Full Sweep Pack
 * Read-only wrapper around Sprint 161 and pwa_api_smoke. Skip-safe without
 * COMPHONE_AUTH_TOKEN; protected proof occurs only when a fresh token is set.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const ROOT = path.resolve(__dirname, '..');
const REPORT = path.join(ROOT, 'test_reports', 'sprint166_protected_token_full_sweep_pack_latest.json');

function run(script) {
  return cp.spawnSync(process.execPath, [script], { cwd: ROOT, env: process.env, encoding: 'utf8' });
}
async function main() {
  const sweep = run('scripts/sprint161_protected_live_token_sweep.js');
  const smoke = run('scripts/pwa_api_smoke.js');
  const checks = [
    { id: 'sprint161-sweep', ok: sweep.status === 0, stdout: sweep.stdout.slice(-1000), stderr: sweep.stderr.slice(-1000) },
    { id: 'pwa-api-smoke', ok: smoke.status === 0, stdout: smoke.stdout.slice(-1000), stderr: smoke.stderr.slice(-1000) },
    { id: 'token-mode-recorded', ok: true, token_present: !!process.env.COMPHONE_AUTH_TOKEN },
  ];
  const failures = checks.filter(c => !c.ok);
  const report = { generated_at: new Date().toISOString(), mode: 'protected-token-full-sweep-read-only', token_present: !!process.env.COMPHONE_AUTH_TOKEN, status: failures.length ? 'fail' : 'ok', checks };
  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, JSON.stringify(report, null, 2) + '\n');
  console.log(`[Sprint 166 Protected Token Sweep] status=${report.status} checks=${checks.length - failures.length}/${checks.length}`);
  console.log(`[Sprint 166 Protected Token Sweep] report: ${path.relative(ROOT, REPORT).replace(/\\/g, '/')}`);
  if (failures.length) process.exit(1);
}
main().catch(err => { console.error('[Sprint 166 Protected Token Sweep] fatal:', err); process.exit(1); });
