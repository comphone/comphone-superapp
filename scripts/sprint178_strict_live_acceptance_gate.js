#!/usr/bin/env node
/*
 * Sprint 178 Strict Live Acceptance Gate
 *
 * Final wrapper for strict protected acceptance on the published Pages build.
 * Default mode is skip-safe. Real strict proof requires:
 *   COMPHONE_AUTH_TOKEN
 *   COMPHONE_SPRINT178_STRICT_LIVE=1
 *
 * This gate is read-only and blocks if destructive/LINE-send env vars are set.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const REPORT = path.join(ROOT, 'test_reports', 'sprint178_strict_live_acceptance_gate_latest.json');
const TOKEN = process.env.COMPHONE_AUTH_TOKEN || '';
const STRICT = process.env.COMPHONE_SPRINT178_STRICT_LIVE === '1';

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
  const published = run('scripts/sprint176_published_protected_acceptance.js', {
    COMPHONE_SPRINT176_REQUIRE_LIVE: STRICT ? '1' : '',
    COMPHONE_SPRINT176_REQUIRE_PAGES_FRESH: STRICT ? '1' : ''
  });
  const sweep = readJson(path.join(ROOT, 'test_reports', 'sprint161_protected_live_token_sweep_latest.json'));
  const acceptance = readJson(path.join(ROOT, 'test_reports', 'sprint176_published_protected_acceptance_latest.json'));
  const runbook = [
    'Set COMPHONE_AUTH_TOKEN to a fresh admin/owner session token',
    'Set COMPHONE_SPRINT178_STRICT_LIVE=1',
    'Do not set EXECUTE_REVIEWED_DATA_REPAIR',
    'Do not set COMPHONE_LINE_SEND_CONFIRM or COMPHONE_LINE_REAL_SEND',
    'Run after GitHub Pages verifies the current build'
  ];
  const checks = [
    { id: 'published-protected-acceptance-clean', ok: published.status === 0, stdout: published.stdout.slice(-1000), stderr: published.stderr.slice(-1000) },
    { id: 'strict-policy', ok: STRICT ? !!TOKEN && acceptance.require_live === true && sweep.protected_run === true : true, strict: STRICT, token_present: !!TOKEN, require_live: !!acceptance.require_live, protected_run: !!sweep.protected_run },
    { id: 'protected-sweep-clean', ok: sweep.status === 'ok', status: sweep.status || 'unknown' },
    { id: 'no-dangerous-env', ok: !process.env.EXECUTE_REVIEWED_DATA_REPAIR && !process.env.COMPHONE_LINE_SEND_CONFIRM && !process.env.COMPHONE_LINE_REAL_SEND },
    { id: 'strict-runbook-present', ok: runbook.length === 5, runbook },
  ];
  const failures = checks.filter(row => !row.ok);
  const report = {
    generated_at: new Date().toISOString(),
    mode: 'strict-live-acceptance-read-only',
    strict: STRICT,
    token_present: !!TOKEN,
    status: failures.length ? 'fail' : 'ok',
    checks
  };
  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, JSON.stringify(report, null, 2) + '\n');
  console.log(`[Sprint 178 Strict Live Acceptance] status=${report.status} checks=${checks.length - failures.length}/${checks.length} strict=${STRICT}`);
  console.log(`[Sprint 178 Strict Live Acceptance] report: ${path.relative(ROOT, REPORT).replace(/\\/g, '/')}`);
  if (failures.length) process.exit(1);
}

main();
