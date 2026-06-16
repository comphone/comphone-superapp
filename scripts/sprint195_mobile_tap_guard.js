// Sprint 195 — Mobile Tap Reliability Guard
// Verifies: showJobDetail modal display fix, renderTechHome null guard, SW update banner fix
'use strict';

const fs = require('fs');
const path = require('path');

const PWA = path.join(__dirname, '..', 'pwa');
const read = f => fs.readFileSync(path.join(PWA, f), 'utf8');

let pass = 0; let fail = 0;
const ok = label => { console.log('OK   ', label); pass++; };
const ko = (label, reason) => { console.error('FAIL ', label, '-', reason); fail++; };

// ── app_jobs.js ──────────────────────────────────────────────
const appJobs = read('app_jobs.js');

// showJobDetail must set style.display = 'flex' on modal-job
if (/modalJob\.style\.display\s*=\s*'flex'/.test(appJobs))
  ok('showJobDetail - style.display=flex on modal-job');
else
  ko('showJobDetail - style.display=flex', 'missing explicit display:flex when showing modal');

// showJobDetail must also remove hidden class
if (/modalJob\.classList\.remove\('hidden'\)/.test(appJobs))
  ok('showJobDetail - classList.remove hidden');
else
  ko('showJobDetail - classList.remove hidden', 'missing classList.remove(hidden)');

// closeModal must reset style.display
if (/modal\.style\.display\s*=\s*''/.test(appJobs))
  ok('closeModal - style.display reset on close');
else
  ko('closeModal - style.display reset', 'closeModal does not reset style.display');

// mobileJobApi with callApi fallback
if (/typeof callApi === 'function'/.test(appJobs))
  ok('mobileJobApi - callApi fallback');
else
  ko('mobileJobApi - callApi fallback', 'missing callApi fallback');

// ── app_home.js ──────────────────────────────────────────────
const appHome = read('app_home.js');

// app_home.js must NOT use APP.user.name.split directly without guard
if (/APP\.user\.name\.split/.test(appHome))
  ko('app_home - null guard', 'APP.user.name.split used without null guard (crash if name is null)');
else
  ok('app_home - null guard (no unguarded APP.user.name.split)');

// Must have the safe displayName pattern in renderTechHome
if (/\|\| _u\.full_name \|\| _u\.username/.test(appHome))
  ok('renderTechHome - displayName fallback chain');
else
  ko('renderTechHome - displayName fallback chain', 'missing full_name/username fallback');

// ── pwa_install.js ───────────────────────────────────────────
const pwaInstall = read('pwa_install.js');

// SW_ACTIVATED handler must compare versions and call _showUpdateBanner_
if (/newVer !== curVer/.test(pwaInstall))
  ok('pwa_install - SW_ACTIVATED version diff check');
else
  ko('pwa_install - SW_ACTIVATED version diff check', 'missing version comparison in SW_ACTIVATED handler');

if (/newVer !== curVer[\s\S]{0,200}_showUpdateBanner_\(\)/.test(pwaInstall))
  ok('pwa_install - _showUpdateBanner_ called on version mismatch');
else
  ko('pwa_install - _showUpdateBanner_ on mismatch', '_showUpdateBanner_ not triggered when SW version differs');

// ── app.js (renderMoreMenu dead code removed) ─────────────────
const appJs = read('app.js');

// Dead code after return in renderMoreMenu should be gone
// The old dead block started with: content.innerHTML = `\n    <div class="cp-sheet-handle"></div>\n    <div class="more-menu-title"` after a `return;`
if (/return;\s*content\.innerHTML\s*=/.test(appJs))
  ko('renderMoreMenu - dead code removed', 'dead code after return still present');
else
  ok('renderMoreMenu - dead code removed');

// ── version_config.js ────────────────────────────────────────
const versionCfg = read('version_config.js');
if (/sprint195/.test(versionCfg))
  ok('version_config - sprint195 version');
else
  ko('version_config - sprint195 version', 'version not bumped to sprint195');

if (/20260616_1600/.test(versionCfg))
  ok('version_config - build timestamp 20260616_1600');
else
  ko('version_config - build timestamp', 'build timestamp not updated to 20260616_1600');

// ── sw.js ─────────────────────────────────────────────────────
const swJs = read('sw.js');
if (/sprint195/.test(swJs))
  ok('sw.js - sprint195 CACHE_V');
else
  ko('sw.js - sprint195 CACHE_V', 'sw.js CACHE_V not bumped to sprint195');

// ── Summary ──────────────────────────────────────────────────
console.log(`\n[Sprint 195] ${pass + fail > 0 ? (fail === 0 ? 'OK' : 'FAIL') : 'NO TESTS'} ${pass}/${pass + fail} - Mobile tap reliability guard ${fail === 0 ? 'passed' : 'FAILED'}`);
if (fail > 0) process.exit(1);
