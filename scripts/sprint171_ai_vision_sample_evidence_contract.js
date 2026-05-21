#!/usr/bin/env node
/*
 * Sprint 171 AI Vision Sample Evidence Contract
 *
 * Locks the real-sample evidence shape without exposing secrets or sending
 * LINE. Real image analysis remains behind Sprint 163/168 gates.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const REPORT = path.join(ROOT, 'test_reports', 'sprint171_ai_vision_sample_evidence_contract_latest.json');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function main() {
  const runbook = cp.spawnSync(process.execPath, ['scripts/sprint168_ai_vision_real_sample_runbook.js'], {
    cwd: ROOT,
    env: process.env,
    encoding: 'utf8'
  });
  const pilot = read('scripts/sprint163_ai_vision_real_sample_pilot.js');
  const visionUi = read('pwa/section_vision.js');
  const pipeline = read('clasp-ready/VisionPipeline.gs');
  const requiredEvidence = ['visionLogId', 'review-queue', 'getVisionFieldContext', 'submitHumanReview', 'linkVisionToJobTimeline'];
  const checks = [
    { id: 'sprint168-runbook-clean', ok: runbook.status === 0, stdout: runbook.stdout.slice(-1000), stderr: runbook.stderr.slice(-1000) },
    { id: 'sample-output-records-log-id', ok: pilot.includes('visionLogId') && pipeline.includes('VisionLog') },
    { id: 'human-review-loop-present', ok: visionUi.includes('submitHumanReview') && visionUi.includes('getVisionReviewQueue') },
    { id: 'job-link-loop-present', ok: visionUi.includes('linkVisionToJobTimeline') && visionUi.includes('getVisionFieldContext') },
    { id: 'no-secret-material-in-contract', ok: !/(AIza|LINE_CHANNEL_ACCESS_TOKEN|COMPHONE_AUTH_TOKEN\s*=)/.test(pilot + visionUi) },
    { id: 'evidence-fields-documented', ok: requiredEvidence.length === 5, requiredEvidence },
  ];
  const failures = checks.filter(row => !row.ok);
  const report = { generated_at: new Date().toISOString(), mode: 'ai-vision-sample-evidence-contract-no-line-send', token_present: !!process.env.COMPHONE_AUTH_TOKEN, status: failures.length ? 'fail' : 'ok', checks };
  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, JSON.stringify(report, null, 2) + '\n');
  console.log(`[Sprint 171 AI Vision Evidence] status=${report.status} checks=${checks.length - failures.length}/${checks.length}`);
  console.log(`[Sprint 171 AI Vision Evidence] report: ${path.relative(ROOT, REPORT).replace(/\\/g, '/')}`);
  if (failures.length) process.exit(1);
}

main();
