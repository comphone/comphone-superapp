#!/usr/bin/env node
/*
 * Sprint 176 Published Protected Acceptance
 *
 * Verifies GitHub Pages freshness, then runs protected browser/API acceptance.
 * Default mode is skip-safe while Pages catches up; strict mode requires the
 * published build to be fresh plus a fresh COMPHONE_AUTH_TOKEN.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const REPORT = path.join(ROOT, 'test_reports', 'sprint176_published_protected_acceptance_latest.json');
const TOKEN = process.env.COMPHONE_AUTH_TOKEN || '';
const REQUIRE_LIVE = process.env.COMPHONE_SPRINT176_REQUIRE_LIVE === '1';
const REQUIRE_PAGES_FRESH = process.env.COMPHONE_SPRINT176_REQUIRE_PAGES_FRESH === '1' || REQUIRE_LIVE;

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
  const pages = run('scripts/pages_deploy_verify.js');
  const strictBrowser = run('scripts/sprint174_strict_protected_browser_runbook.js', {
    COMPHONE_REQUIRE_PROTECTED_BROWSER_ACCEPTANCE: REQUIRE_LIVE ? '1' : ''
  });
  const sweep = readJson(path.join(ROOT, 'test_reports', 'sprint161_protected_live_token_sweep_latest.json'));
  const checks = [
    { id: 'pages-build-fresh-policy', ok: REQUIRE_PAGES_FRESH ? pages.status === 0 && pages.stdout.includes('status=ok') : pages.status === 0, require_fresh: REQUIRE_PAGES_FRESH, stdout: pages.stdout.slice(-1000), stderr: pages.stderr.slice(-1000) },
    { id: 'protected-browser-acceptance-ran', ok: strictBrowser.status === 0, stdout: strictBrowser.stdout.slice(-1000), stderr: strictBrowser.stderr.slice(-1000) },
    { id: 'strict-live-policy', ok: REQUIRE_LIVE ? !!TOKEN && sweep.protected_run === true : true, require_live: REQUIRE_LIVE, token_present: !!TOKEN, protected_run: !!sweep.protected_run },
    { id: 'protected-sweep-clean', ok: sweep.status === 'ok', status: sweep.status || 'unknown' },
    { id: 'no-write-or-line-send-env', ok: !process.env.EXECUTE_REVIEWED_DATA_REPAIR && !process.env.COMPHONE_LINE_SEND_CONFIRM },
  ];
  const failures = checks.filter(row => !row.ok);
  const report = {
    generated_at: new Date().toISOString(),
    mode: 'published-protected-acceptance-read-only',
    require_live: REQUIRE_LIVE,
    require_pages_fresh: REQUIRE_PAGES_FRESH,
    token_present: !!TOKEN,
    status: failures.length ? 'fail' : 'ok',
    checks
  };
  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, JSON.stringify(report, null, 2) + '\n');
  console.log(`[Sprint 176 Published Protected] status=${report.status} checks=${checks.length - failures.length}/${checks.length} require_live=${REQUIRE_LIVE}`);
  console.log(`[Sprint 176 Published Protected] report: ${path.relative(ROOT, REPORT).replace(/\\/g, '/')}`);
  if (failures.length) process.exit(1);
}

main();
