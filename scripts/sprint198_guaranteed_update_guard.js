// Sprint 198 — Guaranteed Update Delivery Guard
// Verifies: inline version guard in index.html, SW navigation cache:no-cache,
//           periodic registration.update() every 10 min + visibilitychange,
//           version.json + version_config.js + sw.js all at sprint198
'use strict';

const fs   = require('fs');
const path = require('path');

const PWA = path.join(__dirname, '..', 'pwa');
const read = f => fs.readFileSync(path.join(PWA, f), 'utf8');

let pass = 0; let fail = 0;
const ok = label => { console.log('OK   ', label); pass++; };
const ko = (label, reason) => { console.error('FAIL ', label, '-', reason); fail++; };

// ── index.html — inline version guard ────────────────────────
const indexHtml = read('index.html');

if (/EXPECTED_BUILD\s*=\s*'20260617_\d{4}'/.test(indexHtml))
  ok('index.html - inline version guard EXPECTED_BUILD present');
else
  ko('index.html - inline version guard', 'EXPECTED_BUILD missing from inline script in index.html');

if (/window\.COMPHONE_BUILD[\s\S]{0,200}window\.location\.reload/.test(indexHtml))
  ok('index.html - inline guard triggers reload on mismatch');
else
  ko('index.html - inline guard reload', 'inline guard does not call window.location.reload() on mismatch');

// ── sw.js — navigation uses cache:no-cache ────────────────────
const swJs = read('sw.js');

if (/CACHE_V[\s\S]{0,80}sprint19[89]/.test(swJs))
  ok('sw.js - CACHE_V at sprint198+');
else
  ko('sw.js - CACHE_V at sprint198+', 'CACHE_V not at sprint198 or higher');

if (/cache:\s*['"]no-cache['"]/.test(swJs))
  ok('sw.js - navigation fetch uses cache:no-cache');
else
  ko('sw.js - navigation cache:no-cache', 'SW does not use cache:no-cache for navigation — iOS WebKit HTTP cache bypass missing');

if (/isNavigation[\s\S]{0,200}no-cache/.test(swJs))
  ok('sw.js - cache:no-cache gated on isNavigation');
else
  ko('sw.js - isNavigation gate', 'cache:no-cache not correctly gated on navigation requests');

// ── pwa_install.js — periodic registration.update() ──────────
const pwaInstall = read('pwa_install.js');

if (/setInterval[\s\S]{0,200}reg\.update\(\)[\s\S]{0,200}10\s*\*\s*60/.test(pwaInstall))
  ok('pwa_install - periodic registration.update() every 10 min');
else
  ko('pwa_install - periodic reg.update()', 'setInterval reg.update() at 10 min interval missing');

if (/visibilitychange[\s\S]{0,600}reg\.update\(\)/.test(pwaInstall))
  ok('pwa_install - visibilitychange triggers registration.update()');
else
  ko('pwa_install - visibilitychange reg.update()', 'visibilitychange listener does not call reg.update()');

// ── version.json ──────────────────────────────────────────────
const versionJsonPath = path.join(PWA, 'version.json');
if (fs.existsSync(versionJsonPath)) {
  ok('version.json - file exists');
  try {
    const vj = JSON.parse(fs.readFileSync(versionJsonPath, 'utf8'));
    if (vj.v && /^2026/.test(vj.v))
      ok(`version.json - v field set (${vj.v})`);
    else
      ko('version.json - v field', 'version.json.v missing or unexpected format');
    if (vj.c && /sprint19[89]/.test(vj.c))
      ok('version.json - c field at sprint198+');
    else
      ko('version.json - c field', 'version.json.c does not contain sprint198+');
  } catch {
    ko('version.json - parse', 'version.json is not valid JSON');
  }
} else {
  ko('version.json - file exists', 'pwa/version.json not found');
}

// ── version_config.js ─────────────────────────────────────────
const versionCfg = read('version_config.js');

if (/sprint19[89]/.test(versionCfg))
  ok('version_config - sprint198+ version');
else
  ko('version_config - sprint198+', 'version_config.js not at sprint198 or higher');

if (/buildTimestamp:\s*'20260617_\d{4}'/.test(versionCfg))
  ok('version_config - buildTimestamp 20260617_xxxx present');
else
  ko('version_config - buildTimestamp', 'buildTimestamp not set to 20260617_xxxx in version_config.js');

// ── Summary ───────────────────────────────────────────────────
console.log(`\n[Sprint 198] ${fail === 0 ? 'OK' : 'FAIL'} ${pass}/${pass + fail} — Guaranteed update delivery guard ${fail === 0 ? 'passed' : 'FAILED'}`);
if (fail > 0) process.exit(1);
