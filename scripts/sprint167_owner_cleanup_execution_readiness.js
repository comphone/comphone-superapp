#!/usr/bin/env node
/*
 * Sprint 167 Owner Cleanup Execution Readiness
 * Confirms cleanup remains decision-only until owner confirmation, archive, and
 * explicit repair gates are present. This script never mutates production data.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const ROOT = path.resolve(__dirname, '..');
const REPORT = path.join(ROOT, 'test_reports', 'sprint167_owner_cleanup_execution_readiness_latest.json');

async function main() {
  const decision = cp.spawnSync(process.execPath, ['scripts/sprint162_owner_data_cleanup_decision.js'], { cwd: ROOT, env: process.env, encoding: 'utf8' });
  const src = fs.readFileSync(path.join(ROOT, 'DataRepairConsole.gs'), 'utf8') + '\n' + fs.readFileSync(path.join(ROOT, 'pwa/api_contract.js'), 'utf8');
  const checks = [
    { id: 'sprint162-decision-clean', ok: decision.status === 0, stdout: decision.stdout.slice(-1000), stderr: decision.stderr.slice(-1000) },
    { id: 'execute-gate-present', ok: src.includes('EXECUTE_REVIEWED_DATA_REPAIR') && src.includes('executeDataRepair') },
    { id: 'archive-before-change-present', ok: /ARCHIVE|archive/i.test(src) },
    { id: 'no-mutation-in-this-script', ok: !/request\(\s*['"](executeDataRepair|cleanupSmokeTestRecords)['"]/.test(fs.readFileSync(__filename, 'utf8')) },
  ];
  const failures = checks.filter(c => !c.ok);
  const report = { generated_at: new Date().toISOString(), mode: 'owner-cleanup-execution-readiness-no-mutation', status: failures.length ? 'fail' : 'ok', checks };
  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, JSON.stringify(report, null, 2) + '\n');
  console.log(`[Sprint 167 Owner Cleanup Readiness] status=${report.status} checks=${checks.length - failures.length}/${checks.length}`);
  console.log(`[Sprint 167 Owner Cleanup Readiness] report: ${path.relative(ROOT, REPORT).replace(/\\/g, '/')}`);
  if (failures.length) process.exit(1);
}
main().catch(err => { console.error('[Sprint 167 Owner Cleanup Readiness] fatal:', err); process.exit(1); });
