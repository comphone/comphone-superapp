#!/usr/bin/env node
/*
 * Sprint 177 AI Vision Real Sample Evidence
 *
 * Owner-gated real-sample evidence wrapper. Default mode proves readiness only.
 * Real Vision analysis runs only when Sprint 175 gates are fully set. This
 * script never sends LINE messages.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const REPORT = path.join(ROOT, 'test_reports', 'sprint177_ai_vision_real_sample_evidence_latest.json');
const TOKEN = process.env.COMPHONE_AUTH_TOKEN || '';
const REAL_CONFIRM = process.env.COMPHONE_SPRINT177_EXECUTE_REAL_SAMPLE === '1';

function readJson(file) {
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
}

function run(script, extraEnv = {}) {
  return cp.spawnSync(process.execPath, [script], {
    cwd: ROOT,
    env: Object.assign({}, process.env, extraEnv),
    encoding: 'utf8'
  });
}

function main() {
  const gate = run('scripts/sprint175_ai_vision_sample_pilot_gate.js', REAL_CONFIRM ? {} : {
    COMPHONE_AI_VISION_SAMPLE_PILOT: '',
    COMPHONE_AI_VISION_SAMPLE_CONFIRM: '',
    COMPHONE_SPRINT175_OWNER_CONFIRM: ''
  });
  const pilot = readJson(path.join(ROOT, 'test_reports', 'sprint163_ai_vision_real_sample_pilot_latest.json'));
  const gateReport = readJson(path.join(ROOT, 'test_reports', 'sprint175_ai_vision_sample_pilot_gate_latest.json'));
  const evidence = ['visionLogId', 'real_sample_executed', 'getVisionReviewQueue', 'submitHumanReview', 'linkVisionToJobTimeline'];
  const checks = [
    { id: 'sprint175-owner-gate-clean', ok: gate.status === 0, stdout: gate.stdout.slice(-1000), stderr: gate.stderr.slice(-1000) },
    { id: 'real-execution-policy', ok: REAL_CONFIRM ? gateReport.real_sample_executed === true : gateReport.real_sample_executed === false, requested: REAL_CONFIRM, executed: !!gateReport.real_sample_executed, token_present: !!TOKEN },
    { id: 'vision-log-evidence-if-executed', ok: gateReport.real_sample_executed ? pilot.checks && JSON.stringify(pilot.checks).includes('visionLogId') : true },
    { id: 'no-line-real-send', ok: !process.env.COMPHONE_LINE_SEND_CONFIRM && !process.env.COMPHONE_LINE_REAL_SEND },
    { id: 'evidence-contract-listed', ok: evidence.length === 5, evidence },
  ];
  const failures = checks.filter(row => !row.ok);
  const report = {
    generated_at: new Date().toISOString(),
    mode: 'ai-vision-real-sample-evidence-owner-gated-no-line-send',
    token_present: !!TOKEN,
    requested_real_execution: REAL_CONFIRM,
    real_sample_executed: !!gateReport.real_sample_executed,
    status: failures.length ? 'fail' : 'ok',
    checks
  };
  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, JSON.stringify(report, null, 2) + '\n');
  console.log(`[Sprint 177 AI Vision Evidence] status=${report.status} checks=${checks.length - failures.length}/${checks.length} real_executed=${!!gateReport.real_sample_executed}`);
  console.log(`[Sprint 177 AI Vision Evidence] report: ${path.relative(ROOT, REPORT).replace(/\\/g, '/')}`);
  if (failures.length) process.exit(1);
}

main();
