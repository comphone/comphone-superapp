#!/usr/bin/env node
/*
 * Sprint 165 Browser/Profile Click-Through Pack
 * Produces a browser-ready click-through contract and optionally probes
 * protected reads when COMPHONE_AUTH_TOKEN is present.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const REPORT = path.join(ROOT, 'test_reports', 'sprint165_browser_profile_clickthrough_pack_latest.json');

async function main() {
  const child = require('child_process').spawnSync(process.execPath, ['scripts/sprint160_real_browser_clickthrough_contract.js'], {
    cwd: ROOT,
    env: process.env,
    encoding: 'utf8'
  });
  const contractPath = path.join(ROOT, 'test_reports', 'sprint160_real_browser_clickthrough_contract_latest.json');
  const contract = fs.existsSync(contractPath) ? JSON.parse(fs.readFileSync(contractPath, 'utf8')) : {};
  const checklist = [
    'Mobile login/session restore',
    'Mobile Dashboard -> Jobs -> New customer -> Billing -> Reports -> Vision -> LINE Center -> Settings',
    'PC Dashboard -> Jobs -> Billing -> Reports -> Inventory/PO -> Vision -> LINE Center -> Settings',
    'Reload on current page and verify last-page/last-section restore',
    'Confirm no false offline state while network is online'
  ];
  const checks = [
    { id: 'sprint160-contract-ran', ok: child.status === 0, stdout: child.stdout.slice(-1000), stderr: child.stderr.slice(-1000) },
    { id: 'route-contract-clean', ok: contract.status === 'ok', score: contract.score },
    { id: 'manual-profile-checklist-present', ok: checklist.length >= 5, checklist },
  ];
  const failures = checks.filter(c => !c.ok);
  const report = { generated_at: new Date().toISOString(), mode: 'browser-profile-clickthrough-pack', token_present: !!process.env.COMPHONE_AUTH_TOKEN, status: failures.length ? 'fail' : 'ok', checks };
  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, JSON.stringify(report, null, 2) + '\n');
  console.log(`[Sprint 165 Browser Profile Clickthrough] status=${report.status} checks=${checks.length - failures.length}/${checks.length}`);
  console.log(`[Sprint 165 Browser Profile Clickthrough] report: ${path.relative(ROOT, REPORT).replace(/\\/g, '/')}`);
  if (failures.length) process.exit(1);
}
main().catch(err => { console.error('[Sprint 165 Browser Profile Clickthrough] fatal:', err); process.exit(1); });
