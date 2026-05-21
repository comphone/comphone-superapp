#!/usr/bin/env node
/*
 * Sprint 169 Pages Fresh Release Gate
 *
 * Post-publish guard for GitHub Pages. Default mode is CI-safe while Pages
 * catches up; set COMPHONE_PAGES_REQUIRE_FRESH=1 to fail stale assets.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const REPORT = path.join(ROOT, 'test_reports', 'sprint169_pages_fresh_release_gate_latest.json');
const REQUIRE_FRESH = process.env.COMPHONE_PAGES_REQUIRE_FRESH === '1' || process.env.COMPHONE_RELEASE_REQUIRE_PAGES_FRESH === '1';

function readJson(file) {
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
}

function main() {
  const child = cp.spawnSync(process.execPath, ['scripts/sprint164_pages_publish_lock.js'], {
    cwd: ROOT,
    env: Object.assign({}, process.env, { COMPHONE_PAGES_REQUIRE_FRESH: REQUIRE_FRESH ? '1' : '' }),
    encoding: 'utf8'
  });
  const upstream = readJson(path.join(ROOT, 'test_reports', 'sprint164_pages_publish_lock_latest.json'));
  const checks = [
    { id: 'sprint164-strict-publish-lock-ran', ok: child.status === 0, stdout: child.stdout.slice(-1000), stderr: child.stderr.slice(-1000) },
    { id: 'remote-pages-fresh-policy', ok: REQUIRE_FRESH ? upstream.status === 'ok' : ['ok', 'cdn_pending'].includes(upstream.status), status: upstream.status || 'unknown', require_fresh: REQUIRE_FRESH },
    { id: 'freshness-mode-recorded', ok: upstream.require_fresh === REQUIRE_FRESH, require_fresh: upstream.require_fresh },
  ];
  const failures = checks.filter(row => !row.ok);
  const report = { generated_at: new Date().toISOString(), mode: 'pages-fresh-release-gate', require_fresh: REQUIRE_FRESH, status: failures.length ? 'fail' : (upstream.status || 'ok'), checks };
  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, JSON.stringify(report, null, 2) + '\n');
  console.log(`[Sprint 169 Pages Fresh Gate] status=${report.status} checks=${checks.length - failures.length}/${checks.length}`);
  console.log(`[Sprint 169 Pages Fresh Gate] report: ${path.relative(ROOT, REPORT).replace(/\\/g, '/')}`);
  if (failures.length) process.exit(1);
}

main();
