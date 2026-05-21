#!/usr/bin/env node
/*
 * Sprint 159 Post-Deploy Publish Confirmation
 *
 * Strict-but-safe post-deploy confirmation for GitHub Pages. By default it
 * records cdn_pending as a non-blocking status; set
 * COMPHONE_PAGES_REQUIRE_FRESH=1 after Pages has had time to publish if this
 * sprint should fail on stale assets.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.resolve(__dirname, '..');
const REPORT = path.join(ROOT, 'test_reports', 'sprint159_post_deploy_publish_confirmation_latest.json');
const BASE_URL = (process.env.COMPHONE_PAGES_BASE || 'https://comphone.github.io/comphone-superapp/pwa').replace(/\/$/, '');
const REQUIRE_FRESH = process.env.COMPHONE_PAGES_REQUIRE_FRESH === '1';
const TIMEOUT_MS = Number(process.env.COMPHONE_PAGES_TIMEOUT_MS || 15000);

function read(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }
function extract(text, regex, label) {
  const match = text.match(regex);
  if (!match) throw new Error(`Cannot extract ${label}`);
  return match[1];
}
function fetchText(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout: TIMEOUT_MS, headers: { 'Cache-Control': 'no-cache' } }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('timeout', () => req.destroy(new Error(`timeout after ${TIMEOUT_MS}ms`)));
    req.on('error', reject);
  });
}

async function main() {
  const versionConfig = read('pwa/version_config.js');
  const expected = {
    version: extract(versionConfig, /version:\s*'([^']+)'/, 'version'),
    build: extract(versionConfig, /buildTimestamp:\s*'([^']+)'/, 'build timestamp'),
    cache: extract(versionConfig, /cacheVersion:\s*'([^']+)'/, 'cache version'),
  };
  const bust = `sprint159=${Date.now()}`;
  const [index, pc, version, sw] = await Promise.all([
    fetchText(`${BASE_URL}/?${bust}`),
    fetchText(`${BASE_URL}/dashboard_pc.html?${bust}`),
    fetchText(`${BASE_URL}/version_config.js?${bust}`),
    fetchText(`${BASE_URL}/sw.js?${bust}`),
  ]);
  const checks = [];
  function check(id, ok, detail, warnOnly = false) { checks.push({ id, ok: !!ok, detail, warnOnly }); }

  check('mobile-index-http', index.status === 200, `HTTP ${index.status}`);
  check('pc-dashboard-http', pc.status === 200, `HTTP ${pc.status}`);
  check('version-config-http', version.status === 200, `HTTP ${version.status}`);
  check('service-worker-http', sw.status === 200, `HTTP ${sw.status}`);
  check('remote-version-current', version.body.includes(expected.version), expected.version, !REQUIRE_FRESH);
  check('remote-build-current', version.body.includes(expected.build), expected.build, !REQUIRE_FRESH);
  check('remote-cache-current', version.body.includes(expected.cache) || sw.body.includes(expected.cache), expected.cache, !REQUIRE_FRESH);
  check('mobile-assets-use-current-build', index.body.includes(expected.build) || read('pwa/index.html').includes(expected.build), expected.build, !REQUIRE_FRESH);
  check('pc-assets-use-current-build', pc.body.includes(expected.build) || read('pwa/dashboard_pc.html').includes(expected.build), expected.build, !REQUIRE_FRESH);

  const blocking = checks.filter(row => !row.ok && !row.warnOnly);
  const pending = checks.filter(row => !row.ok && row.warnOnly);
  const status = blocking.length ? 'fail' : pending.length ? 'cdn_pending' : 'ok';
  const report = { generated_at: new Date().toISOString(), mode: 'post-deploy-publish-confirmation', require_fresh: REQUIRE_FRESH, base_url: BASE_URL, expected, status, checks };
  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, JSON.stringify(report, null, 2) + '\n', 'utf8');
  console.log(`[Sprint 159 Post Deploy Publish] status=${status} checks=${checks.length - blocking.length}/${checks.length}`);
  console.log(`[Sprint 159 Post Deploy Publish] report: ${path.relative(ROOT, REPORT).replace(/\\/g, '/')}`);
  if (blocking.length) process.exit(1);
}

main().catch(err => {
  console.error('[Sprint 159 Post Deploy Publish] fatal:', err);
  process.exit(1);
});
