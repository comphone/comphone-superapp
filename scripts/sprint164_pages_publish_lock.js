#!/usr/bin/env node
/*
 * Sprint 164 Pages Publish Lock
 * Read-only post-publish guard. Default is non-blocking while GitHub Pages
 * catches up; set COMPHONE_PAGES_REQUIRE_FRESH=1 to fail stale assets.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const REPORT = path.join(ROOT, 'test_reports', 'sprint164_pages_publish_lock_latest.json');
const REQUIRE_FRESH = process.env.COMPHONE_PAGES_REQUIRE_FRESH === '1';

async function main() {
  const publish = require('child_process').spawnSync(process.execPath, ['scripts/sprint159_post_deploy_publish_confirmation.js'], {
    cwd: ROOT,
    env: Object.assign({}, process.env, { COMPHONE_PAGES_REQUIRE_FRESH: REQUIRE_FRESH ? '1' : '' }),
    encoding: 'utf8'
  });
  const latest = path.join(ROOT, 'test_reports', 'sprint159_post_deploy_publish_confirmation_latest.json');
  const upstream = fs.existsSync(latest) ? JSON.parse(fs.readFileSync(latest, 'utf8')) : {};
  const checks = [
    { id: 'sprint159-ran', ok: publish.status === 0, stdout: publish.stdout.slice(-1000), stderr: publish.stderr.slice(-1000) },
    { id: 'pages-http-ok', ok: !upstream.checks || upstream.checks.filter(c => /http/.test(c.id)).every(c => c.ok), status: upstream.status },
    { id: 'freshness-policy', ok: REQUIRE_FRESH ? upstream.status === 'ok' : ['ok', 'cdn_pending'].includes(upstream.status), status: upstream.status || 'unknown', require_fresh: REQUIRE_FRESH },
  ];
  const failures = checks.filter(c => !c.ok);
  const report = { generated_at: new Date().toISOString(), mode: 'pages-publish-lock', status: failures.length ? 'fail' : (upstream.status || 'ok'), require_fresh: REQUIRE_FRESH, checks };
  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, JSON.stringify(report, null, 2) + '\n');
  console.log(`[Sprint 164 Pages Publish Lock] status=${report.status} checks=${checks.length - failures.length}/${checks.length}`);
  console.log(`[Sprint 164 Pages Publish Lock] report: ${path.relative(ROOT, REPORT).replace(/\\/g, '/')}`);
  if (failures.length) process.exit(1);
}
main().catch(err => { console.error('[Sprint 164 Pages Publish Lock] fatal:', err); process.exit(1); });
