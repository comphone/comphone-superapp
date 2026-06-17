// Sprint 199 — Auto Version Bump Guard
// Verifies: bump-version.js exists and works, version_config.js in SW NETWORK_ONLY,
//           all ?v= params consistent across index.html/dashboard_pc.html/sw.js/version.json
'use strict';

const fs   = require('fs');
const path = require('path');

const PWA     = path.join(__dirname, '..', 'pwa');
const SCRIPTS = path.join(__dirname);
const read    = f => fs.readFileSync(path.join(PWA, f), 'utf8');

let pass = 0; let fail = 0;
const ok = label => { console.log('OK   ', label); pass++; };
const ko = (label, reason) => { console.error('FAIL ', label, '-', reason); fail++; };

// ── bump-version.js exists ────────────────────────────────────
const bvPath = path.join(SCRIPTS, 'bump-version.js');
if (fs.existsSync(bvPath))
  ok('bump-version.js - file exists');
else
  ko('bump-version.js - file exists', 'scripts/bump-version.js not found');

// ── sw.js — version_config.js in NETWORK_ONLY ────────────────
const swJs = read('sw.js');

if (/NETWORK_ONLY[\s\S]{0,800}version_config/.test(swJs))
  ok('sw.js - version_config.js in NETWORK_ONLY');
else
  ko('sw.js - version_config.js NETWORK_ONLY', 'version_config.js not listed in NETWORK_ONLY — clients may get stale version info');

if (/CACHE_V[\s\S]{0,80}sprint199/.test(swJs))
  ok('sw.js - CACHE_V at sprint199');
else
  ko('sw.js - CACHE_V at sprint199', 'CACHE_V not updated to sprint199');

// ── Extract current version from version_config.js ───────────
const vcSrc = read('version_config.js');
const semverM    = vcSrc.match(/version:\s*'([^']+)'/);
const timestampM = vcSrc.match(/buildTimestamp:\s*'([^']+)'/);
const cacheM     = vcSrc.match(/cacheVersion:\s*'([^']+)'/);

if (!semverM || !timestampM || !cacheM) {
  ko('version_config.js - parseable', 'Could not parse version/buildTimestamp/cacheVersion');
  process.exit(1);
}
const semver    = semverM[1].replace(/^v/, '');  // 5.18.47-sprint199
const timestamp = timestampM[1];                 // 20260617_2100
const cache     = cacheM[1];                     // comphone-v5.18.47-sprint199-...
const vParam    = `v=${semver}&t=${timestamp}`;

if (/sprint199/.test(semver))
  ok(`version_config.js - at sprint199 (${semver})`);
else
  ko('version_config.js - sprint199', `version_config.js is at ${semver}, not sprint199`);

// ── index.html — all ?v= params match version_config ─────────
{
  const html = read('index.html');
  const allParams = [...html.matchAll(/v=5\.\d+\.\d+-sprint\d+&t=\d+_\d+/g)].map(m => m[0]);
  const wrong = allParams.filter(p => p !== vParam);
  if (wrong.length === 0 && allParams.length > 0)
    ok(`index.html - all ${allParams.length} ?v= params match version_config (${vParam})`);
  else if (wrong.length > 0)
    ko('index.html - ?v= param consistency', `${wrong.length} params still at wrong version: ${[...new Set(wrong)].join(', ')}`);
  else
    ko('index.html - ?v= params found', 'No versioned ?v= params found in index.html');
}

// ── index.html — inline guard EXPECTED_BUILD matches ─────────
{
  const html = read('index.html');
  if (html.includes(`EXPECTED_BUILD = '${timestamp}'`))
    ok(`index.html - inline guard EXPECTED_BUILD='${timestamp}'`);
  else
    ko('index.html - inline guard EXPECTED_BUILD', `EXPECTED_BUILD in inline guard does not match version_config buildTimestamp '${timestamp}'`);
}

// ── dashboard_pc.html — all ?v= params match version_config ──
{
  const html = read('dashboard_pc.html');
  const allParams = [...html.matchAll(/v=5\.\d+\.\d+-sprint\d+&t=\d+_\d+/g)].map(m => m[0]);
  const wrong = allParams.filter(p => p !== vParam);
  if (wrong.length === 0 && allParams.length > 0)
    ok(`dashboard_pc.html - all ${allParams.length} ?v= params match version_config`);
  else if (wrong.length > 0)
    ko('dashboard_pc.html - ?v= consistency', `${wrong.length} params still at wrong version: ${[...new Set(wrong)].join(', ')}`);
  else
    ko('dashboard_pc.html - ?v= params found', 'No versioned ?v= params found in dashboard_pc.html');
}

// ── version.json matches version_config ───────────────────────
{
  const vjPath = path.join(PWA, 'version.json');
  if (fs.existsSync(vjPath)) {
    try {
      const vj = JSON.parse(fs.readFileSync(vjPath, 'utf8'));
      if (vj.v === timestamp)
        ok(`version.json - v field matches buildTimestamp '${timestamp}'`);
      else
        ko('version.json - v field', `version.json.v='${vj.v}' does not match buildTimestamp '${timestamp}'`);
      if (vj.c === cache)
        ok(`version.json - c field matches cacheVersion`);
      else
        ko('version.json - c field', `version.json.c='${vj.c}' does not match cacheVersion '${cache}'`);
    } catch {
      ko('version.json - parse', 'version.json is not valid JSON');
    }
  } else {
    ko('version.json - exists', 'pwa/version.json not found');
  }
}

// ── Summary ───────────────────────────────────────────────────
console.log(`\n[Sprint 199] ${fail === 0 ? 'OK' : 'FAIL'} ${pass}/${pass + fail} — Auto version-bump guard ${fail === 0 ? 'passed' : 'FAILED'}`);
if (fail > 0) process.exit(1);
