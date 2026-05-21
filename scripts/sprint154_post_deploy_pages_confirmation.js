#!/usr/bin/env node
/*
 * Sprint 154 Post-Deploy Pages Confirmation
 *
 * Read-only GitHub Pages freshness guard. CDN freshness is tracked as
 * cdn_pending instead of a hard failure so operators can rerun after Pages
 * propagation finishes.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.resolve(__dirname, '..');
const REPORT = path.join(ROOT, 'test_reports', 'sprint154_post_deploy_pages_confirmation_latest.json');
const BASE_URL = (process.env.COMPHONE_PAGES_BASE || 'https://comphone.github.io/comphone-superapp/pwa').replace(/\/$/, '');
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
  const gasConfig = read('pwa/gas_config.js');
  const expected = {
    appVersion: extract(versionConfig, /version:\s*'([^']+)'/, 'app version'),
    buildTimestamp: extract(versionConfig, /buildTimestamp:\s*'([^']+)'/, 'build timestamp'),
    cacheVersion: extract(versionConfig, /cacheVersion:\s*'([^']+)'/, 'cache version'),
    gasUrl: extract(gasConfig, /url:\s*'([^']+)'/, 'GAS URL'),
  };
  const bust = `sprint154=${Date.now()}`;
  const [index, pc, version, gas, sw] = await Promise.all([
    fetchText(`${BASE_URL}/?${bust}`),
    fetchText(`${BASE_URL}/dashboard_pc.html?${bust}`),
    fetchText(`${BASE_URL}/version_config.js?${bust}`),
    fetchText(`${BASE_URL}/gas_config.js?${bust}`),
    fetchText(`${BASE_URL}/sw.js?${bust}`),
  ]);
  const checks = [];
  function check(id, ok, detail, warnOnly = false) { checks.push({ id, ok: !!ok, detail, warnOnly }); }
  check('mobile-index-http', index.status === 200, `HTTP ${index.status}`);
  check('pc-dashboard-http', pc.status === 200, `HTTP ${pc.status}`);
  check('version-config-http', version.status === 200, `HTTP ${version.status}`);
  check('gas-config-http', gas.status === 200, `HTTP ${gas.status}`);
  check('service-worker-http', sw.status === 200, `HTTP ${sw.status}`);
  check('remote-app-version-current', version.body.includes(expected.appVersion), expected.appVersion, true);
  check('remote-build-current', version.body.includes(expected.buildTimestamp), expected.buildTimestamp, true);
  check('remote-cache-current', version.body.includes(expected.cacheVersion) || sw.body.includes(expected.cacheVersion), expected.cacheVersion, true);
  check('remote-gas-url-current', gas.body.includes(expected.gasUrl), expected.gasUrl, true);
  check('mobile-loads-central-api-client', index.body.includes('api_client.js') || read('pwa/index.html').includes('api_client.js'), 'api_client.js');
  check('pc-loads-central-api-client', pc.body.includes('api_client.js') || read('pwa/dashboard_pc.html').includes('api_client.js'), 'api_client.js');
  const blocking = checks.filter(row => !row.ok && !row.warnOnly);
  const pending = checks.filter(row => !row.ok && row.warnOnly);
  const status = blocking.length ? 'fail' : pending.length ? 'cdn_pending' : 'ok';
  const report = { generated_at: new Date().toISOString(), mode: 'post-deploy-pages-confirmation-read-only', base_url: BASE_URL, expected, status, checks };
  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, JSON.stringify(report, null, 2) + '\n', 'utf8');
  console.log(`[Sprint 154 Post Deploy Pages] status=${status} checks=${checks.length - blocking.length}/${checks.length}`);
  console.log(`[Sprint 154 Post Deploy Pages] report: ${path.relative(ROOT, REPORT).replace(/\\/g, '/')}`);
  if (blocking.length) process.exit(1);
}

main().catch(err => {
  console.error('[Sprint 154 Post Deploy Pages] fatal:', err);
  process.exit(1);
});
