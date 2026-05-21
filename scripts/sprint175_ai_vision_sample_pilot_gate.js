#!/usr/bin/env node
/*
 * Sprint 175 AI Vision Sample Pilot Gate
 *
 * Final owner-gated wrapper for real AI Vision sample analysis. Default mode
 * proves readiness only. Real analysis requires token, sample input, and two
 * confirmation env vars. This script never sends LINE messages.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const REPORT = path.join(ROOT, 'test_reports', 'sprint175_ai_vision_sample_pilot_gate_latest.json');
const TOKEN = process.env.COMPHONE_AUTH_TOKEN || '';
const SAMPLE_FILE = process.env.COMPHONE_AI_VISION_SAMPLE_FILE || '';
const SAMPLE_BASE64 = process.env.COMPHONE_AI_VISION_SAMPLE_BASE64 || '';
const ENABLED = process.env.COMPHONE_AI_VISION_SAMPLE_PILOT === '1';
const CONFIRM = process.env.COMPHONE_AI_VISION_SAMPLE_CONFIRM === 'RUN_REAL_SAMPLE_ANALYSIS';
const OWNER_CONFIRM = process.env.COMPHONE_SPRINT175_OWNER_CONFIRM === 'RUN_OWNER_APPROVED_AI_SAMPLE';
const REAL_READY = !!(TOKEN && (SAMPLE_FILE || SAMPLE_BASE64) && ENABLED && CONFIRM && OWNER_CONFIRM);

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

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
  const evidence = run('scripts/sprint171_ai_vision_sample_evidence_contract.js');
  const pilot = run('scripts/sprint163_ai_vision_real_sample_pilot.js', REAL_READY ? {} : {
    COMPHONE_AI_VISION_SAMPLE_PILOT: '',
    COMPHONE_AI_VISION_SAMPLE_CONFIRM: ''
  });
  const pilotReport = readJson(path.join(ROOT, 'test_reports', 'sprint163_ai_vision_real_sample_pilot_latest.json'));
  const ownSource = fs.readFileSync(__filename, 'utf8');
  const source = [
    ownSource,
    read('scripts/sprint163_ai_vision_real_sample_pilot.js'),
    read('pwa/section_vision.js'),
    read('clasp-ready/VisionPipeline.gs')
  ].join('\n');
  const runbook = [
    'Set COMPHONE_AUTH_TOKEN to a fresh admin/owner session token',
    'Set COMPHONE_AI_VISION_SAMPLE_FILE or COMPHONE_AI_VISION_SAMPLE_BASE64',
    'Set COMPHONE_AI_VISION_SAMPLE_PILOT=1',
    'Set COMPHONE_AI_VISION_SAMPLE_CONFIRM=RUN_REAL_SAMPLE_ANALYSIS',
    'Set COMPHONE_SPRINT175_OWNER_CONFIRM=RUN_OWNER_APPROVED_AI_SAMPLE',
    'Do not set COMPHONE_LINE_SEND_CONFIRM or any LINE real-send env var'
  ];
  const checks = [
    { id: 'ai-vision-evidence-contract-clean', ok: evidence.status === 0, stdout: evidence.stdout.slice(-1000), stderr: evidence.stderr.slice(-1000) },
    { id: 'pilot-script-clean', ok: pilot.status === 0, stdout: pilot.stdout.slice(-1000), stderr: pilot.stderr.slice(-1000) },
    { id: 'real-analysis-owner-gated', ok: REAL_READY ? pilotReport.real_sample_enabled === true : pilotReport.real_sample_enabled === false, real_ready: REAL_READY, pilot_real_sample_enabled: !!pilotReport.real_sample_enabled },
    { id: 'vision-evidence-path-present', ok: ['visionLogId', 'getVisionReviewQueue', 'submitHumanReview', 'linkVisionToJobTimeline'].every(token => source.includes(token)) },
    { id: 'no-real-line-send', ok: !/request\(\s*['"]sendLineRoomMessage['"]/.test(ownSource) && !process.env.COMPHONE_LINE_SEND_CONFIRM },
    { id: 'owner-runbook-present', ok: runbook.length === 6, runbook },
  ];
  const failures = checks.filter(row => !row.ok);
  const report = {
    generated_at: new Date().toISOString(),
    mode: 'ai-vision-sample-pilot-owner-gated-no-line-send',
    token_present: !!TOKEN,
    real_ready: REAL_READY,
    real_sample_executed: !!pilotReport.real_sample_enabled,
    status: failures.length ? 'fail' : 'ok',
    checks
  };
  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, JSON.stringify(report, null, 2) + '\n');
  console.log(`[Sprint 175 AI Vision Pilot Gate] status=${report.status} checks=${checks.length - failures.length}/${checks.length} real_ready=${REAL_READY}`);
  console.log(`[Sprint 175 AI Vision Pilot Gate] report: ${path.relative(ROOT, REPORT).replace(/\\/g, '/')}`);
  if (failures.length) process.exit(1);
}

main();
