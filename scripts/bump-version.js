#!/usr/bin/env node
// ============================================================
// COMPHONE — Version Bump Automation
// Usage: node scripts/bump-version.js --sprint=199 --build=20260618_0900
//        (reads version_config.js as source of truth if no flags given)
// Updates: index.html, dashboard_pc.html, sw.js, version.json
// ============================================================
'use strict';

const fs   = require('fs');
const path = require('path');

// ── Parse CLI args ────────────────────────────────────────────
const args = {};
process.argv.slice(2).forEach(a => {
  const m = a.match(/^--(\w+)=(.+)$/);
  if (m) args[m[1]] = m[2];
});

const PWA = path.join(__dirname, '..', 'pwa');
const read  = f => fs.readFileSync(path.join(PWA, f), 'utf8');
const write = (f, s) => fs.writeFileSync(path.join(PWA, f), s, 'utf8');

// ── Extract current version from version_config.js ───────────
const vcSrc = read('version_config.js');

function extract(pattern) {
  const m = vcSrc.match(pattern);
  return m ? m[1] : null;
}

const currentVersion   = extract(/version:\s*'([^']+)'/);   // e.g. v5.18.47-sprint198
const currentTimestamp = extract(/buildTimestamp:\s*'([^']+)'/); // e.g. 20260617_2000
const currentCache     = extract(/cacheVersion:\s*'([^']+)'/);   // e.g. comphone-v5.18.47-sprint198-20260617_2000

if (!currentVersion || !currentTimestamp) {
  console.error('ERROR: Could not parse version_config.js — check version/buildTimestamp fields');
  process.exit(1);
}

// Strip leading 'v' for numeric part
const semver = currentVersion.replace(/^v/, '');  // 5.18.47-sprint198

// ── Determine target version ──────────────────────────────────
let targetSprint, targetTimestamp, targetSemver, targetCache;

if (args.sprint || args.build) {
  const sprintStr = args.sprint || semver.replace(/.*-sprint/, 'sprint');
  const sprintNum = args.sprint || semver.match(/sprint(\d+)/)?.[1];
  targetTimestamp = args.build || currentTimestamp;
  const semverBase = semver.replace(/-sprint\d+/, '');
  targetSemver    = `${semverBase}-sprint${sprintNum}`;
  targetCache     = `comphone-v${targetSemver}-${targetTimestamp}`;
} else {
  // No args — just report current state, no changes
  targetSemver    = semver;
  targetTimestamp = currentTimestamp;
  targetCache     = currentCache;
}

const V_PARAM = `v=${targetSemver}&t=${targetTimestamp}`;
const OLD_V_PATTERN = /v=5\.\d+\.\d+-sprint\d+&t=\d+_\d+/g;

console.log(`\n[bump-version] Current : v${semver} @ ${currentTimestamp}`);
if (args.sprint || args.build) {
  console.log(`[bump-version] Target  : v${targetSemver} @ ${targetTimestamp}`);
  console.log(`[bump-version] Cache   : ${targetCache}`);
} else {
  console.log(`[bump-version] Mode    : VERIFY (no --sprint/--build flags given)`);
}
console.log('');

let changed = 0;

// ── index.html ────────────────────────────────────────────────
{
  const orig = read('index.html');
  const updated = orig.replace(OLD_V_PATTERN, V_PARAM);
  const count = (orig.match(OLD_V_PATTERN) || []).length;
  if (updated !== orig) {
    write('index.html', updated);
    console.log(`✅ index.html       — updated ${count} ?v= params → ${V_PARAM}`);
    changed++;
  } else if (orig.includes(V_PARAM)) {
    console.log(`✔  index.html       — already at ${V_PARAM} (${count} params)`);
  } else {
    console.log(`⚠️  index.html       — no ?v= params found to update`);
  }
}

// ── dashboard_pc.html ─────────────────────────────────────────
{
  const orig = read('dashboard_pc.html');
  const updated = orig.replace(OLD_V_PATTERN, V_PARAM);
  const count = (orig.match(OLD_V_PATTERN) || []).length;
  if (updated !== orig) {
    write('dashboard_pc.html', updated);
    console.log(`✅ dashboard_pc.html — updated ${count} ?v= params → ${V_PARAM}`);
    changed++;
  } else if (orig.includes(V_PARAM)) {
    console.log(`✔  dashboard_pc.html — already at ${V_PARAM} (${count} params)`);
  } else {
    console.log(`⚠️  dashboard_pc.html — no ?v= params found to update`);
  }
}

// ── sw.js — CACHE_V ───────────────────────────────────────────
{
  const orig = read('sw.js');
  const newCacheV = `const CACHE_V = '${targetCache}';`;
  const updated = orig.replace(/const CACHE_V = '[^']+';/, newCacheV);
  if (updated !== orig) {
    write('sw.js', updated);
    console.log(`✅ sw.js             — CACHE_V → ${targetCache}`);
    changed++;
  } else if (orig.includes(targetCache)) {
    console.log(`✔  sw.js             — CACHE_V already ${targetCache}`);
  } else {
    console.log(`⚠️  sw.js             — CACHE_V not updated (pattern not found)`);
  }
}

// ── version.json ──────────────────────────────────────────────
{
  const vjPath = path.join(PWA, 'version.json');
  const newVj = JSON.stringify({ v: targetTimestamp, c: targetCache }) + '\n';
  let orig = '';
  try { orig = fs.readFileSync(vjPath, 'utf8'); } catch {}
  if (orig.trim() !== newVj.trim()) {
    fs.writeFileSync(vjPath, newVj, 'utf8');
    console.log(`✅ version.json      — {"v":"${targetTimestamp}","c":"${targetCache}"}`);
    changed++;
  } else {
    console.log(`✔  version.json      — already up to date`);
  }
}

// ── index.html — inline version guard EXPECTED_BUILD ──────────
{
  const orig = read('index.html');
  const updated = orig.replace(
    /var EXPECTED_BUILD = '[^']+'/,
    `var EXPECTED_BUILD = '${targetTimestamp}'`
  );
  if (updated !== orig) {
    write('index.html', updated);
    console.log(`✅ index.html (guard) — EXPECTED_BUILD → '${targetTimestamp}'`);
    changed++;
  } else if (orig.includes(`EXPECTED_BUILD = '${targetTimestamp}'`)) {
    console.log(`✔  index.html (guard) — EXPECTED_BUILD already '${targetTimestamp}'`);
  } else {
    console.log(`⚠️  index.html (guard) — EXPECTED_BUILD pattern not found`);
  }
}

// ── version_config.js — only if explicit bump ─────────────────
if (args.sprint || args.build) {
  const orig = read('version_config.js');
  let updated = orig;
  updated = updated.replace(/version:\s*'[^']+'/, `version: 'v${targetSemver}'`);
  updated = updated.replace(/buildTimestamp:\s*'[^']+'/, `buildTimestamp: '${targetTimestamp}'`);
  updated = updated.replace(/cacheVersion:\s*'[^']+'/, `cacheVersion: '${targetCache}'`);
  updated = updated.replace(/const APP_VERSION = '[^']+'/, `const APP_VERSION = 'v${targetSemver}'`);
  updated = updated.replace(/const BUILD_TIMESTAMP = '[^']+'/, `const BUILD_TIMESTAMP = '${targetTimestamp}'`);
  updated = updated.replace(/const CACHE_VERSION = '[^']+'/, `const CACHE_VERSION = '${targetCache}'`);
  if (updated !== orig) {
    write('version_config.js', updated);
    console.log(`✅ version_config.js — bumped to v${targetSemver} @ ${targetTimestamp}`);
    changed++;
  } else {
    console.log(`✔  version_config.js — already at v${targetSemver}`);
  }
}

// ── Summary ───────────────────────────────────────────────────
console.log('');
if (changed > 0) {
  console.log(`[bump-version] ${changed} file(s) updated. Review changes then commit.`);
  console.log(`[bump-version] Run regression guard: bash scripts/regression-guard.sh`);
} else {
  console.log(`[bump-version] All files already consistent — no changes needed.`);
}
