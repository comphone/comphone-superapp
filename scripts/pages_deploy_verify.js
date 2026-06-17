#!/usr/bin/env node
/*
 * Verify that GitHub Pages is serving the same PWA version/build/GAS URL
 * that is committed in the repository. This is read-only and safe for CI.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.resolve(__dirname, '..');
const PWA = path.join(ROOT, 'pwa');
const REPORT_DIR = path.join(ROOT, 'test_reports');
const REPORT_JSON = path.join(REPORT_DIR, 'pages_deploy_verify_latest.json');
const REPORT_MD = path.join(REPORT_DIR, 'pages_deploy_verify_latest.md');
const BASE_URL = process.env.COMPHONE_PAGES_BASE || 'https://comphone.github.io/comphone-superapp/pwa';
const TIMEOUT_MS = Number(process.env.COMPHONE_PAGES_TIMEOUT_MS || 15000);

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

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
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('timeout', () => {
      req.destroy(new Error(`timeout after ${TIMEOUT_MS}ms`));
    });
    req.on('error', reject);
  });
}

async function main() {
  const localVersionConfig = read(path.join(PWA, 'version_config.js'));
  const localGasConfig = read(path.join(PWA, 'gas_config.js'));
  const expected = {
    appVersion: extract(localVersionConfig, /version:\s*'([^']+)'/, 'local app version'),
    buildTimestamp: extract(localVersionConfig, /buildTimestamp:\s*'([^']+)'/, 'local build timestamp'),
    cacheVersion: extract(localVersionConfig, /cacheVersion:\s*'([^']+)'/, 'local cache version'),
    gasUrl: extract(localGasConfig, /url:\s*'([^']+)'/, 'local GAS URL'),
  };

  const cacheBust = `codex=${Date.now()}`;
  const [remoteVersion, remoteGas, remoteVersionJson] = await Promise.all([
    fetchText(`${BASE_URL}/version_config.js?${cacheBust}`),
    fetchText(`${BASE_URL}/gas_config.js?${cacheBust}`),
    fetchText(`${BASE_URL}/version.json?${cacheBust}`),
  ]);

  const checks = [];
  function check(name, ok, detail, warnOnly = false) {
    checks.push({ name, ok: !!ok, warnOnly, detail });
  }

  check('version_config_http', remoteVersion.status === 200, `HTTP ${remoteVersion.status}`);
  check('gas_config_http', remoteGas.status === 200, `HTTP ${remoteGas.status}`);
  // version.json must exist — 404 means deploy did not update Pages (blocking)
  check('version_json_http', remoteVersionJson.status === 200, `HTTP ${remoteVersionJson.status}`);
  check('app_version', remoteVersion.body.includes(expected.appVersion), expected.appVersion, true);
  check('build_timestamp', remoteVersion.body.includes(expected.buildTimestamp), expected.buildTimestamp, true);
  check('cache_version', remoteVersion.body.includes(expected.cacheVersion), expected.cacheVersion, true);
  check('gas_url', remoteGas.body.includes(expected.gasUrl), expected.gasUrl, true);

  const blockingFailures = checks.filter(item => !item.ok && !item.warnOnly);
  const cdnPending = checks.some(item => !item.ok && item.warnOnly);
  const status = blockingFailures.length ? 'fail' : cdnPending ? 'cdn_pending' : 'ok';
  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    expected,
    status,
    checks,
  };

  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(REPORT_JSON, JSON.stringify(report, null, 2) + '\n', 'utf8');
  fs.writeFileSync(REPORT_MD, [
    '# GitHub Pages Deploy Verify',
    '',
    `- Status: ${status}`,
    `- Base URL: ${BASE_URL}`,
    `- Expected app: ${expected.appVersion}`,
    `- Expected build: ${expected.buildTimestamp}`,
    '',
    '| Check | Result | Detail |',
    '|---|---|---|',
    ...checks.map(item => `| ${item.name} | ${item.ok ? 'OK' : item.warnOnly ? 'PENDING' : 'FAIL'} | ${item.detail} |`),
    '',
  ].join('\n'), 'utf8');

  console.log(`[Pages Verify] status=${status}`);
  for (const item of checks) {
    console.log(`- ${item.ok ? 'OK' : item.warnOnly ? 'PENDING' : 'FAIL'} ${item.name}: ${item.detail}`);
  }
  if (blockingFailures.length) process.exit(1);
}

main().catch((error) => {
  console.error('[Pages Verify] ERROR:', error.message);
  process.exit(1);
});
