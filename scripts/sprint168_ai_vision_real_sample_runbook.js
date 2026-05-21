#!/usr/bin/env node
/*
 * Sprint 168 AI Vision Real Sample Runbook
 * Wraps Sprint 163 and records the exact gated environment needed for a real
 * sample pilot. It never sends LINE messages.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const ROOT = path.resolve(__dirname, '..');
const REPORT = path.join(ROOT, 'test_reports', 'sprint168_ai_vision_real_sample_runbook_latest.json');

async function main() {
  const pilot = cp.spawnSync(process.execPath, ['scripts/sprint163_ai_vision_real_sample_pilot.js'], { cwd: ROOT, env: process.env, encoding: 'utf8' });
  const runbook = [
    "Set COMPHONE_AUTH_TOKEN to a fresh admin/owner session token",
    "Set COMPHONE_AI_VISION_SAMPLE_PILOT=1",
    "Set COMPHONE_AI_VISION_SAMPLE_CONFIRM=RUN_REAL_SAMPLE_ANALYSIS",
    "Set COMPHONE_AI_VISION_SAMPLE_FILE or COMPHONE_AI_VISION_SAMPLE_BASE64",
    "Do not set any LINE real-send gate for this pilot"
  ];
  const checks = [
    { id: 'sprint163-pilot-gate-clean', ok: pilot.status === 0, stdout: pilot.stdout.slice(-1000), stderr: pilot.stderr.slice(-1000) },
    { id: 'real-sample-runbook-present', ok: runbook.length === 5, runbook },
    { id: 'no-real-line-send', ok: !/request\(\s*['"]sendLineRoomMessage['"]/.test(fs.readFileSync(__filename, 'utf8')) },
  ];
  const failures = checks.filter(c => !c.ok);
  const report = { generated_at: new Date().toISOString(), mode: 'ai-vision-real-sample-runbook-no-line-send', token_present: !!process.env.COMPHONE_AUTH_TOKEN, status: failures.length ? 'fail' : 'ok', checks };
  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, JSON.stringify(report, null, 2) + '\n');
  console.log(`[Sprint 168 AI Vision Runbook] status=${report.status} checks=${checks.length - failures.length}/${checks.length}`);
  console.log(`[Sprint 168 AI Vision Runbook] report: ${path.relative(ROOT, REPORT).replace(/\\/g, '/')}`);
  if (failures.length) process.exit(1);
}
main().catch(err => { console.error('[Sprint 168 AI Vision Runbook] fatal:', err); process.exit(1); });
