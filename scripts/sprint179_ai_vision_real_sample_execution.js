#!/usr/bin/env node
/*
 * Sprint 179 AI Vision Real Sample Execution
 *
 * Owner-gated wrapper for an actual AI Vision sample run. Default mode is
 * readiness-only. Real execution requires:
 *   COMPHONE_AUTH_TOKEN
 *   COMPHONE_AI_VISION_SAMPLE_FILE or COMPHONE_AI_VISION_SAMPLE_BASE64
 *   COMPHONE_AI_VISION_SAMPLE_PILOT=1
 *   COMPHONE_AI_VISION_SAMPLE_CONFIRM=RUN_REAL_SAMPLE_ANALYSIS
 *   COMPHONE_SPRINT175_OWNER_CONFIRM=RUN_OWNER_APPROVED_AI_SAMPLE
 *   COMPHONE_SPRINT177_EXECUTE_REAL_SAMPLE=1
 *   COMPHONE_SPRINT179_EXECUTE_REAL_SAMPLE=1
 *
 * This script never sends LINE messages.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const REPORT = path.join(ROOT, 'test_reports', 'sprint179_ai_vision_real_sample_execution_latest.json');
const TOKEN = process.env.COMPHONE_AUTH_TOKEN || '';
const EXECUTE = process.env.COMPHONE_SPRINT179_EXECUTE_REAL_SAMPLE === '1';

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
  const evidence = run('scripts/sprint177_ai_vision_real_sample_evidence.js', EXECUTE ? {
    COMPHONE_SPRINT177_EXECUTE_REAL_SAMPLE: '1'
  } : {
    COMPHONE_SPRINT177_EXECUTE_REAL_SAMPLE: '',
    COMPHONE_AI_VISION_SAMPLE_PILOT: '',
    COMPHONE_AI_VISION_SAMPLE_CONFIRM: '',
    COMPHONE_SPRINT175_OWNER_CONFIRM: ''
  });
  const pilot = readJson(path.join(ROOT, 'test_reports', 'sprint163_ai_vision_real_sample_pilot_latest.json'));
  const evidenceReport = readJson(path.join(ROOT, 'test_reports', 'sprint177_ai_vision_real_sample_evidence_latest.json'));
  const requiredGates = [
    'COMPHONE_AUTH_TOKEN',
    'COMPHONE_AI_VISION_SAMPLE_FILE or COMPHONE_AI_VISION_SAMPLE_BASE64',
    'COMPHONE_AI_VISION_SAMPLE_PILOT=1',
    'COMPHONE_AI_VISION_SAMPLE_CONFIRM=RUN_REAL_SAMPLE_ANALYSIS',
    'COMPHONE_SPRINT175_OWNER_CONFIRM=RUN_OWNER_APPROVED_AI_SAMPLE',
    'COMPHONE_SPRINT177_EXECUTE_REAL_SAMPLE=1',
    'COMPHONE_SPRINT179_EXECUTE_REAL_SAMPLE=1'
  ];
  const checks = [
    { id: 'sprint177-evidence-clean', ok: evidence.status === 0, stdout: evidence.stdout.slice(-1000), stderr: evidence.stderr.slice(-1000) },
    { id: 'real-execution-policy', ok: EXECUTE ? evidenceReport.real_sample_executed === true : evidenceReport.real_sample_executed === false, execute_requested: EXECUTE, executed: !!evidenceReport.real_sample_executed, token_present: !!TOKEN },
    { id: 'vision-log-id-if-executed', ok: evidenceReport.real_sample_executed ? JSON.stringify(pilot).includes('visionLogId') : true },
    { id: 'no-line-real-send', ok: !process.env.COMPHONE_LINE_SEND_CONFIRM && !process.env.COMPHONE_LINE_REAL_SEND },
    { id: 'required-gates-documented', ok: requiredGates.length === 7, requiredGates },
  ];
  const failures = checks.filter(row => !row.ok);
  const report = {
    generated_at: new Date().toISOString(),
    mode: 'ai-vision-real-sample-execution-owner-gated-no-line-send',
    token_present: !!TOKEN,
    execute_requested: EXECUTE,
    real_sample_executed: !!evidenceReport.real_sample_executed,
    status: failures.length ? 'fail' : 'ok',
    checks
  };
  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, JSON.stringify(report, null, 2) + '\n');
  console.log(`[Sprint 179 AI Vision Execution] status=${report.status} checks=${checks.length - failures.length}/${checks.length} real_executed=${!!evidenceReport.real_sample_executed}`);
  console.log(`[Sprint 179 AI Vision Execution] report: ${path.relative(ROOT, REPORT).replace(/\\/g, '/')}`);
  if (failures.length) process.exit(1);
}

main();
