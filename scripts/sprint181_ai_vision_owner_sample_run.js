#!/usr/bin/env node
/*
 * Sprint 181 AI Vision Owner Sample Run
 *
 * Operator-facing wrapper for a real owner-approved Vision sample execution.
 * Default mode is readiness-only. Real execution requires all Sprint 179 gates
 * plus:
 *   COMPHONE_SPRINT181_OWNER_RUN=1
 *
 * This script never sends LINE messages.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const REPORT = path.join(ROOT, 'test_reports', 'sprint181_ai_vision_owner_sample_run_latest.json');
const TOKEN = process.env.COMPHONE_AUTH_TOKEN || '';
const OWNER_RUN = process.env.COMPHONE_SPRINT181_OWNER_RUN === '1';

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
  const execution = run('scripts/sprint179_ai_vision_real_sample_execution.js', OWNER_RUN ? {
    COMPHONE_SPRINT179_EXECUTE_REAL_SAMPLE: '1'
  } : {
    COMPHONE_SPRINT179_EXECUTE_REAL_SAMPLE: '',
    COMPHONE_SPRINT177_EXECUTE_REAL_SAMPLE: '',
    COMPHONE_AI_VISION_SAMPLE_PILOT: '',
    COMPHONE_AI_VISION_SAMPLE_CONFIRM: '',
    COMPHONE_SPRINT175_OWNER_CONFIRM: ''
  });
  const executionReport = readJson(path.join(ROOT, 'test_reports', 'sprint179_ai_vision_real_sample_execution_latest.json'));
  const pilotReport = readJson(path.join(ROOT, 'test_reports', 'sprint163_ai_vision_real_sample_pilot_latest.json'));
  const ownerRunbook = [
    'Set COMPHONE_AUTH_TOKEN to a fresh admin/owner session token',
    'Set COMPHONE_AI_VISION_SAMPLE_FILE or COMPHONE_AI_VISION_SAMPLE_BASE64',
    'Set COMPHONE_AI_VISION_SAMPLE_PILOT=1',
    'Set COMPHONE_AI_VISION_SAMPLE_CONFIRM=RUN_REAL_SAMPLE_ANALYSIS',
    'Set COMPHONE_SPRINT175_OWNER_CONFIRM=RUN_OWNER_APPROVED_AI_SAMPLE',
    'Set COMPHONE_SPRINT177_EXECUTE_REAL_SAMPLE=1',
    'Set COMPHONE_SPRINT179_EXECUTE_REAL_SAMPLE=1',
    'Set COMPHONE_SPRINT181_OWNER_RUN=1',
    'Do not set COMPHONE_LINE_SEND_CONFIRM or COMPHONE_LINE_REAL_SEND'
  ];
  const checks = [
    { id: 'sprint179-execution-clean', ok: execution.status === 0, stdout: execution.stdout.slice(-1000), stderr: execution.stderr.slice(-1000) },
    { id: 'owner-run-policy', ok: OWNER_RUN ? executionReport.real_sample_executed === true : executionReport.real_sample_executed === false, owner_run: OWNER_RUN, token_present: !!TOKEN, executed: !!executionReport.real_sample_executed },
    { id: 'vision-log-id-if-executed', ok: executionReport.real_sample_executed ? JSON.stringify(pilotReport).includes('visionLogId') : true },
    { id: 'no-line-real-send', ok: !process.env.COMPHONE_LINE_SEND_CONFIRM && !process.env.COMPHONE_LINE_REAL_SEND },
    { id: 'owner-runbook-present', ok: ownerRunbook.length === 9, ownerRunbook },
  ];
  const failures = checks.filter(row => !row.ok);
  const report = {
    generated_at: new Date().toISOString(),
    mode: 'ai-vision-owner-sample-run-gated-no-line-send',
    token_present: !!TOKEN,
    owner_run: OWNER_RUN,
    real_sample_executed: !!executionReport.real_sample_executed,
    status: failures.length ? 'fail' : 'ok',
    checks
  };
  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, JSON.stringify(report, null, 2) + '\n');
  console.log(`[Sprint 181 AI Vision Owner Run] status=${report.status} checks=${checks.length - failures.length}/${checks.length} real_executed=${!!executionReport.real_sample_executed}`);
  console.log(`[Sprint 181 AI Vision Owner Run] report: ${path.relative(ROOT, REPORT).replace(/\\/g, '/')}`);
  if (failures.length) process.exit(1);
}

main();
