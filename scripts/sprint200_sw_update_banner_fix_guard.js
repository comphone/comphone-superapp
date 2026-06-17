// Sprint 200 — SW Update Banner Fix Guard
// Verifies: skipWaiting() NOT in install event (banner deadlock fix),
//           version_config.js has emergency controllerchange+SW_ACTIVATED auto-reload,
//           CACHE_V at sprint200
'use strict';

const fs   = require('fs');
const path = require('path');

const PWA = path.join(__dirname, '..', 'pwa');
const read = f => fs.readFileSync(path.join(PWA, f), 'utf8');

let pass = 0; let fail = 0;
const ok = label => { console.log('OK   ', label); pass++; };
const ko = (label, reason) => { console.error('FAIL ', label, '-', reason); fail++; };

// ── sw.js — skipWaiting NOT in install ───────────────────────
const swJs = read('sw.js');

if (/CACHE_V[\s\S]{0,80}sprint200/.test(swJs))
  ok('sw.js - CACHE_V at sprint200');
else
  ko('sw.js - CACHE_V at sprint200', 'CACHE_V not updated to sprint200');

// skipWaiting must NOT be in the install handler
// Check that there's no setTimeout(skipWaiting) pattern inside install
if (!/addEventListener\('install'[\s\S]{0,400}skipWaiting/.test(swJs))
  ok('sw.js - skipWaiting NOT in install handler (banner deadlock fixed)');
else
  ko('sw.js - skipWaiting in install', 'skipWaiting() still called in install handler — this causes controllerchange to fire before user can tap update banner');

// skipWaiting must still be in the SKIP_WAITING message handler
if (/SKIP_WAITING[\s\S]{0,100}skipWaiting\(\)/.test(swJs))
  ok('sw.js - skipWaiting present in SKIP_WAITING message handler');
else
  ko('sw.js - SKIP_WAITING handler', 'skipWaiting() missing from SKIP_WAITING message handler — user-triggered update will not work');

// ── version_config.js — emergency auto-reload ────────────────
const vcSrc = read('version_config.js');

if (/sprint200/.test(vcSrc))
  ok('version_config.js - at sprint200');
else
  ko('version_config.js - sprint200', 'version_config.js not updated to sprint200');

if (/_vcAutoReload_/.test(vcSrc))
  ok('version_config.js - _vcAutoReload_ emergency function present');
else
  ko('version_config.js - _vcAutoReload_', 'emergency auto-reload function missing from version_config.js');

if (/controllerchange[\s\S]{0,200}_vcAutoReload_/.test(vcSrc))
  ok('version_config.js - controllerchange triggers _vcAutoReload_');
else
  ko('version_config.js - controllerchange handler', 'controllerchange listener not attached to _vcAutoReload_ in version_config.js');

if (/SW_ACTIVATED[\s\S]{0,200}_vcAutoReload_/.test(vcSrc))
  ok('version_config.js - SW_ACTIVATED triggers _vcAutoReload_');
else
  ko('version_config.js - SW_ACTIVATED handler', 'SW_ACTIVATED message not handled by _vcAutoReload_ in version_config.js');

// ── version_config.js NETWORK_ONLY in sw.js ──────────────────
if (/NETWORK_ONLY[\s\S]{0,800}version_config/.test(swJs))
  ok('sw.js - version_config.js in NETWORK_ONLY (emergency reload code always fresh)');
else
  ko('sw.js - version_config.js NETWORK_ONLY', 'version_config.js not in NETWORK_ONLY — emergency reload code may be stale');

// ── Summary ───────────────────────────────────────────────────
console.log(`\n[Sprint 200] ${fail === 0 ? 'OK' : 'FAIL'} ${pass}/${pass + fail} — SW update banner fix guard ${fail === 0 ? 'passed' : 'FAILED'}`);
if (fail > 0) process.exit(1);
