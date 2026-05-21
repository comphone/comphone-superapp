#!/usr/bin/env node
/*
 * Sprint 173 Release Readiness Master Gate
 *
 * Aggregates the release-critical gates after Sprint 169-172. This script is
 * read-only, skip-safe for protected live proof unless strict env gates are set,
 * and never sends LINE messages or executes data repair.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const REPORT = path.join(ROOT, 'test_reports', 'sprint173_release_readiness_master_gate_latest.json');
const REQUIRE_PAGES_FRESH = process.env.COMPHONE_RELEASE_REQUIRE_PAGES_FRESH === '1';
const REQUIRE_PROTECTED = process.env.COMPHONE_RELEASE_REQUIRE_PROTECTED === '1';

function run(script, extraEnv = {}) {
  return cp.spawnSync(process.execPath, [script], {
    cwd: ROOT,
    env: Object.assign({}, process.env, extraEnv),
    encoding: 'utf8'
  });
}

function main() {
  const pages = REQUIRE_PAGES_FRESH
    ? run('scripts/sprint169_pages_fresh_release_gate.js')
    : run('scripts/sprint164_pages_publish_lock.js');
  const browser = run('scripts/sprint170_protected_browser_acceptance_gate.js', {
    COMPHONE_REQUIRE_PROTECTED_BROWSER_ACCEPTANCE: REQUIRE_PROTECTED ? '1' : ''
  });
  const vision = run('scripts/sprint171_ai_vision_sample_evidence_contract.js');
  const line = run('scripts/sprint172_line_room_notification_matrix_gate.js');
  const staticGuard = run('scripts/pwa_static_guard.js');
  const checks = [
    { id: 'pages-publish-gate', ok: pages.status === 0, strict: REQUIRE_PAGES_FRESH, stdout: pages.stdout.slice(-1000), stderr: pages.stderr.slice(-1000) },
    { id: 'browser-protected-acceptance-gate', ok: browser.status === 0, protected_required: REQUIRE_PROTECTED, stdout: browser.stdout.slice(-1000), stderr: browser.stderr.slice(-1000) },
    { id: 'ai-vision-evidence-contract', ok: vision.status === 0, stdout: vision.stdout.slice(-1000), stderr: vision.stderr.slice(-1000) },
    { id: 'line-room-notification-matrix', ok: line.status === 0, stdout: line.stdout.slice(-1000), stderr: line.stderr.slice(-1000) },
    { id: 'pwa-static-guard', ok: staticGuard.status === 0, stdout: staticGuard.stdout.slice(-1000), stderr: staticGuard.stderr.slice(-1000) },
    { id: 'no-dangerous-release-actions', ok: !process.env.EXECUTE_REVIEWED_DATA_REPAIR && !process.env.COMPHONE_LINE_SEND_CONFIRM, execute_repair: !!process.env.EXECUTE_REVIEWED_DATA_REPAIR, line_send_confirm: !!process.env.COMPHONE_LINE_SEND_CONFIRM },
  ];
  const failures = checks.filter(row => !row.ok);
  const report = {
    generated_at: new Date().toISOString(),
    mode: 'release-readiness-master-gate-read-only',
    token_present: !!process.env.COMPHONE_AUTH_TOKEN,
    require_pages_fresh: REQUIRE_PAGES_FRESH,
    require_protected: REQUIRE_PROTECTED,
    status: failures.length ? 'fail' : 'ok',
    checks
  };
  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, JSON.stringify(report, null, 2) + '\n');
  console.log(`[Sprint 173 Release Readiness] status=${report.status} checks=${checks.length - failures.length}/${checks.length}`);
  console.log(`[Sprint 173 Release Readiness] report: ${path.relative(ROOT, REPORT).replace(/\\/g, '/')}`);
  if (failures.length) process.exit(1);
}

main();
