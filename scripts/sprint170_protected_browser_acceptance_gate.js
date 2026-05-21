#!/usr/bin/env node
/*
 * Sprint 170 Protected Browser Acceptance Gate
 *
 * Token-aware acceptance gate for the PC/mobile browser contract. It remains
 * skip-safe in CI, but can require protected proof with
 * COMPHONE_REQUIRE_PROTECTED_BROWSER_ACCEPTANCE=1.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const REPORT = path.join(ROOT, 'test_reports', 'sprint170_protected_browser_acceptance_gate_latest.json');
const TOKEN = process.env.COMPHONE_AUTH_TOKEN || '';
const REQUIRE_PROTECTED = process.env.COMPHONE_REQUIRE_PROTECTED_BROWSER_ACCEPTANCE === '1';

function readJson(file) {
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
}

function main() {
  const contractRun = cp.spawnSync(process.execPath, ['scripts/sprint165_browser_profile_clickthrough_pack.js'], {
    cwd: ROOT,
    env: process.env,
    encoding: 'utf8'
  });
  const sweepRun = cp.spawnSync(process.execPath, ['scripts/sprint166_protected_token_full_sweep_pack.js'], {
    cwd: ROOT,
    env: process.env,
    encoding: 'utf8'
  });
  const contract = readJson(path.join(ROOT, 'test_reports', 'sprint160_real_browser_clickthrough_contract_latest.json'));
  const sweep = readJson(path.join(ROOT, 'test_reports', 'sprint161_protected_live_token_sweep_latest.json'));
  const checks = [
    { id: 'browser-clickthrough-pack-ran', ok: contractRun.status === 0, stdout: contractRun.stdout.slice(-1000), stderr: contractRun.stderr.slice(-1000) },
    { id: 'protected-token-sweep-pack-ran', ok: sweepRun.status === 0, stdout: sweepRun.stdout.slice(-1000), stderr: sweepRun.stderr.slice(-1000) },
    { id: 'browser-contract-clean', ok: contract.status === 'ok' && Number(contract.score || 0) >= 100, score: contract.score },
    { id: 'protected-proof-mode', ok: REQUIRE_PROTECTED ? !!TOKEN && sweep.protected_run === true : true, token_present: !!TOKEN, protected_run: !!sweep.protected_run, required: REQUIRE_PROTECTED },
    { id: 'protected-sweep-clean', ok: sweep.status === 'ok', status: sweep.status || 'unknown' },
  ];
  const failures = checks.filter(row => !row.ok);
  const report = {
    generated_at: new Date().toISOString(),
    mode: 'protected-browser-acceptance-gate-read-only',
    token_present: !!TOKEN,
    require_protected: REQUIRE_PROTECTED,
    status: failures.length ? 'fail' : 'ok',
    checks
  };
  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, JSON.stringify(report, null, 2) + '\n');
  console.log(`[Sprint 170 Browser Acceptance] status=${report.status} checks=${checks.length - failures.length}/${checks.length} protected_required=${REQUIRE_PROTECTED}`);
  console.log(`[Sprint 170 Browser Acceptance] report: ${path.relative(ROOT, REPORT).replace(/\\/g, '/')}`);
  if (failures.length) process.exit(1);
}

main();
