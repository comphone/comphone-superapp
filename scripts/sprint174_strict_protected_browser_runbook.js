#!/usr/bin/env node
/*
 * Sprint 174 Strict Protected Browser Runbook
 *
 * Read-only acceptance gate for a real PC/mobile protected session. Default
 * mode is CI-safe; strict mode requires COMPHONE_AUTH_TOKEN and proves the
 * protected menu/API sweep is actually executed.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const REPORT = path.join(ROOT, 'test_reports', 'sprint174_strict_protected_browser_runbook_latest.json');
const TOKEN = process.env.COMPHONE_AUTH_TOKEN || '';
const STRICT = process.env.COMPHONE_REQUIRE_PROTECTED_BROWSER_ACCEPTANCE === '1' ||
  process.env.COMPHONE_SPRINT174_STRICT_PROTECTED_BROWSER === '1';

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
  const acceptance = run('scripts/sprint170_protected_browser_acceptance_gate.js', {
    COMPHONE_REQUIRE_PROTECTED_BROWSER_ACCEPTANCE: STRICT ? '1' : ''
  });
  const contract = readJson(path.join(ROOT, 'test_reports', 'sprint160_real_browser_clickthrough_contract_latest.json'));
  const sweep = readJson(path.join(ROOT, 'test_reports', 'sprint161_protected_live_token_sweep_latest.json'));
  const manualChecklist = [
    'Mobile: login, reload, verify same page restore, open Jobs/Billing/Reports/Vision/LINE/Settings',
    'PC: login, reload, verify same section restore, open Jobs/Billing/Reports/Inventory/Vision/LINE/Settings',
    'Confirm no online screen is mislabeled as offline',
    'Confirm More/menu panels are scrollable and not blank',
    'Run this gate with COMPHONE_REQUIRE_PROTECTED_BROWSER_ACCEPTANCE=1 only after setting a fresh token'
  ];
  const checks = [
    { id: 'strict-acceptance-gate-ran', ok: acceptance.status === 0, stdout: acceptance.stdout.slice(-1000), stderr: acceptance.stderr.slice(-1000) },
    { id: 'route-contract-complete', ok: contract.status === 'ok' && Number(contract.score || 0) >= 100, score: contract.score },
    { id: 'protected-mode-policy', ok: STRICT ? !!TOKEN && sweep.protected_run === true : true, strict: STRICT, token_present: !!TOKEN, protected_run: !!sweep.protected_run },
    { id: 'protected-sweep-clean', ok: sweep.status === 'ok', status: sweep.status || 'unknown' },
    { id: 'manual-browser-profile-runbook-present', ok: manualChecklist.length === 5, manualChecklist },
  ];
  const failures = checks.filter(row => !row.ok);
  const report = {
    generated_at: new Date().toISOString(),
    mode: 'strict-protected-browser-runbook-read-only',
    strict: STRICT,
    token_present: !!TOKEN,
    status: failures.length ? 'fail' : 'ok',
    checks
  };
  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, JSON.stringify(report, null, 2) + '\n');
  console.log(`[Sprint 174 Strict Browser] status=${report.status} checks=${checks.length - failures.length}/${checks.length} strict=${STRICT}`);
  console.log(`[Sprint 174 Strict Browser] report: ${path.relative(ROOT, REPORT).replace(/\\/g, '/')}`);
  if (failures.length) process.exit(1);
}

main();
