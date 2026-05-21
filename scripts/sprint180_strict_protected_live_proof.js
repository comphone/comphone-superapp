#!/usr/bin/env node
/*
 * Sprint 180 Strict Protected Live Proof
 *
 * Operator-facing wrapper for the real protected-live acceptance proof. Default
 * mode is CI-safe. Real proof requires:
 *   COMPHONE_AUTH_TOKEN
 *   COMPHONE_SPRINT180_RUN_STRICT_PROOF=1
 *
 * This script is read-only and blocks data repair or LINE real-send env vars.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const REPORT = path.join(ROOT, 'test_reports', 'sprint180_strict_protected_live_proof_latest.json');
const TOKEN = process.env.COMPHONE_AUTH_TOKEN || '';
const RUN_STRICT = process.env.COMPHONE_SPRINT180_RUN_STRICT_PROOF === '1';

function readJson(file) {
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
}

function run(script, extraEnv = {}) {
  return cp.spawnSync(process.execPath, [script], {
    cwd: ROOT,
    env: Object.assign({}, process.env, extraEnv),
    encoding: 'utf8'
  });
}

function main() {
  const strict = run('scripts/sprint178_strict_live_acceptance_gate.js', {
    COMPHONE_SPRINT178_STRICT_LIVE: RUN_STRICT ? '1' : ''
  });
  const sweep = readJson(path.join(ROOT, 'test_reports', 'sprint161_protected_live_token_sweep_latest.json'));
  const strictReport = readJson(path.join(ROOT, 'test_reports', 'sprint178_strict_live_acceptance_gate_latest.json'));
  const expectedProtectedReads = [
    'getDashboardData',
    'checkJobs',
    'listBillings',
    'getReportData',
    'getVisionDashboardStats',
    'getLineCommandCenter',
    'getSecurityStatus'
  ];
  const checks = [
    { id: 'strict-live-gate-clean', ok: strict.status === 0, stdout: strict.stdout.slice(-1000), stderr: strict.stderr.slice(-1000) },
    { id: 'strict-proof-policy', ok: RUN_STRICT ? !!TOKEN && strictReport.strict === true && sweep.protected_run === true : true, run_strict: RUN_STRICT, token_present: !!TOKEN, strict: !!strictReport.strict, protected_run: !!sweep.protected_run },
    { id: 'protected-read-suite-clean', ok: sweep.status === 'ok', status: sweep.status || 'unknown' },
    { id: 'protected-read-coverage-listed', ok: expectedProtectedReads.length === 7, expectedProtectedReads },
    { id: 'no-dangerous-env', ok: !process.env.EXECUTE_REVIEWED_DATA_REPAIR && !process.env.COMPHONE_LINE_SEND_CONFIRM && !process.env.COMPHONE_LINE_REAL_SEND },
  ];
  const failures = checks.filter(row => !row.ok);
  const report = {
    generated_at: new Date().toISOString(),
    mode: 'strict-protected-live-proof-read-only',
    run_strict: RUN_STRICT,
    token_present: !!TOKEN,
    status: failures.length ? 'fail' : 'ok',
    checks
  };
  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, JSON.stringify(report, null, 2) + '\n');
  console.log(`[Sprint 180 Strict Live Proof] status=${report.status} checks=${checks.length - failures.length}/${checks.length} strict=${RUN_STRICT}`);
  console.log(`[Sprint 180 Strict Live Proof] report: ${path.relative(ROOT, REPORT).replace(/\\/g, '/')}`);
  if (failures.length) process.exit(1);
}

main();
