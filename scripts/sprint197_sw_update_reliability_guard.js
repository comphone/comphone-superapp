// Sprint 197 — SW Update Reliability Guard
// Verifies: delayed skipWaiting, version.json NETWORK_ONLY, controllerchange auto-reload,
//           startup version check, Archive tab graceful error, version bump
'use strict';

const fs   = require('fs');
const path = require('path');

const PWA = path.join(__dirname, '..', 'pwa');
const read = f => fs.readFileSync(path.join(PWA, f), 'utf8');

let pass = 0; let fail = 0;
const ok = label => { console.log('OK   ', label); pass++; };
const ko = (label, reason) => { console.error('FAIL ', label, '-', reason); fail++; };

// ── sw.js ─────────────────────────────────────────────────────
const swJs = read('sw.js');

// CACHE_V must be sprint197
if (/sprint197/.test(swJs))
  ok('sw.js - CACHE_V at sprint197');
else
  ko('sw.js - CACHE_V at sprint197', 'CACHE_V not updated to sprint197');

// version.json must be in NETWORK_ONLY (check the NETWORK_ONLY block contains version.json)
if (/NETWORK_ONLY[\s\S]{0,600}version/.test(swJs))
  ok('sw.js - version.json in NETWORK_ONLY');
else
  ko('sw.js - version.json NETWORK_ONLY', 'version.json not listed in NETWORK_ONLY — old SWs will cache it');

// skipWaiting must be delayed (not called immediately after precache)
if (/setTimeout[\s\S]{0,120}skipWaiting/.test(swJs))
  ok('sw.js - skipWaiting delayed with setTimeout');
else
  ko('sw.js - skipWaiting delay', 'skipWaiting not delayed — statechange=installed may never fire in sprint194 clients');

// activatedByUser still present in SW_ACTIVATED message
if (/activatedByUser:\s*true/.test(swJs))
  ok('sw.js - activatedByUser:true in SW_ACTIVATED');
else
  ko('sw.js - activatedByUser:true', 'SW_ACTIVATED message missing activatedByUser:true');

// SKIP_WAITING message listener present
if (/SKIP_WAITING/.test(swJs))
  ok('sw.js - SKIP_WAITING message listener');
else
  ko('sw.js - SKIP_WAITING listener', 'missing SKIP_WAITING handler in sw.js');

// ── pwa_install.js ────────────────────────────────────────────
const pwaInstall = read('pwa_install.js');

// controllerchange must NOT be gated on _reloadAfterSwUpdate
if (/controllerchange[\s\S]{0,400}_reloadForSwUpdate_\(\)/.test(pwaInstall) &&
    !/controllerchange[\s\S]{0,400}if\s*\(_reloadAfterSwUpdate\)[\s\S]{0,200}_reloadForSwUpdate_/.test(pwaInstall))
  ok('pwa_install - controllerchange always reloads (no _reloadAfterSwUpdate gate)');
else
  ko('pwa_install - controllerchange always reloads', 'controllerchange still gated on _reloadAfterSwUpdate — new SW activation will not auto-reload');

// _scheduleVersionCheck_ function present
if (/function _scheduleVersionCheck_/.test(pwaInstall))
  ok('pwa_install - _scheduleVersionCheck_ function defined');
else
  ko('pwa_install - _scheduleVersionCheck_', 'missing _scheduleVersionCheck_ function');

// _checkVersion_ fetches version.json
if (/version\.json/.test(pwaInstall))
  ok('pwa_install - _checkVersion_ fetches version.json');
else
  ko('pwa_install - version.json fetch', 'pwa_install.js does not reference version.json');

// _scheduleVersionCheck_ is called from registerServiceWorker
if (/_scheduleVersionCheck_\(\)/.test(pwaInstall))
  ok('pwa_install - _scheduleVersionCheck_ called');
else
  ko('pwa_install - _scheduleVersionCheck_ call', '_scheduleVersionCheck_() not called in registerServiceWorker');

// visibilitychange listener re-checks on focus
if (/visibilitychange/.test(pwaInstall))
  ok('pwa_install - visibilitychange version re-check');
else
  ko('pwa_install - visibilitychange', 'missing visibilitychange listener for version re-check');

// ── version.json ──────────────────────────────────────────────
const versionJsonPath = path.join(PWA, 'version.json');
if (fs.existsSync(versionJsonPath)) {
  ok('version.json - file exists');
  try {
    const vj = JSON.parse(fs.readFileSync(versionJsonPath, 'utf8'));
    if (vj.c && /sprint197/.test(vj.c))
      ok('version.json - contains sprint197 cache version');
    else
      ko('version.json - sprint197 content', 'version.json.c does not contain sprint197');
  } catch {
    ko('version.json - parse', 'version.json is not valid JSON');
  }
} else {
  ko('version.json - file exists', 'pwa/version.json not found');
}

// ── admin_panel.js ────────────────────────────────────────────
const adminPanel = read('admin_panel.js');

// Archive error must detect "not allowed" pattern and show Thai message
if (/not allowed|ALLOWED_FUNCTIONS/.test(adminPanel) && /GAS Deploy/.test(adminPanel))
  ok('admin_panel - Archive tab graceful GAS not-deployed error');
else
  ko('admin_panel - Archive graceful error', 'Archive tab does not detect not-allowed errors and show Thai GAS deploy message');

// executeJobRestore_ must have try-catch
if (/executeJobRestore_[\s\S]{0,500}try\s*\{[\s\S]{0,300}restoreJob/.test(adminPanel))
  ok('admin_panel - executeJobRestore_ has try-catch');
else
  ko('admin_panel - executeJobRestore_ try-catch', 'executeJobRestore_ missing try-catch');

// ── version_config.js ─────────────────────────────────────────
const versionCfg = read('version_config.js');
if (/sprint197/.test(versionCfg))
  ok('version_config - sprint197 version');
else
  ko('version_config - sprint197 version', 'version_config.js not updated to sprint197');

if (/20260617_1400/.test(versionCfg))
  ok('version_config - build timestamp 20260617_1400');
else
  ko('version_config - build timestamp', 'build timestamp not 20260617_1400');

// ── index.html ────────────────────────────────────────────────
const indexHtml = read('index.html');
if (/sprint197/.test(indexHtml))
  ok('index.html - sprint197 version params');
else
  ko('index.html - sprint197 version params', 'index.html still has old sprint version params');

if (!/sprint196/.test(indexHtml))
  ok('index.html - no leftover sprint196 params');
else
  ko('index.html - leftover sprint196', 'index.html still has sprint196 references');

// ── Summary ───────────────────────────────────────────────────
console.log(`\n[Sprint 197] ${fail === 0 ? 'OK' : 'FAIL'} ${pass}/${pass + fail} — SW update reliability guard ${fail === 0 ? 'passed' : 'FAILED'}`);
if (fail > 0) process.exit(1);
