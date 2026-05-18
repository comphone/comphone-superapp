#!/usr/bin/env node
/*
 * Sprint 117 Vision + LINE Operational Loop Audit
 *
 * Verifies that Vision suggestions and LINE room sends stay preview-first,
 * confirmation-gated, and wired into operator navigation.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REPORT_DIR = path.join(ROOT, 'test_reports');
const REPORT_JSON = path.join(REPORT_DIR, 'sprint117_vision_line_operational_loop_latest.json');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function has(text, needle) {
  return text.includes(needle);
}

function main() {
  const files = {
    vision: read('pwa/section_vision.js'),
    line: read('pwa/section_line_center.js'),
    apiContract: read('pwa/api_contract.js'),
    runtimeSelfTest: read('pwa/runtime_self_test.js'),
    visionBackend: read('clasp-ready/VisionPipeline.gs'),
    lineBackend: read('clasp-ready/LineCommandCenter.gs') + '\n' + read('clasp-ready/RouterSplit.gs'),
    staticGuard: read('scripts/pwa_static_guard.js'),
    regression: read('scripts/regression-guard.sh'),
    workflow: read('.github/workflows/auto-deploy.yml'),
    blueprint: read('BLUEPRINT.md'),
  };
  const checks = [];
  const issues = [];
  function check(area, name, ok, detail, severity = 'P0') {
    const row = { area, name, ok: !!ok, severity, detail };
    checks.push(row);
    if (!row.ok) issues.push(row);
  }

  check('vision', 'preview-before-execute',
    has(files.vision, "visionApi('previewVisionSuggestion'") &&
      has(files.vision, "visionApi('executeVisionSuggestion'") &&
      has(files.vision, "confirm: 'EXECUTE_VISION_SUGGESTION'") &&
      has(files.vision, 'formatVisionPreviewText'),
    'Vision suggestions must preview impact before gated execution.');

  check('vision', 'operator-handoffs',
    has(files.vision, 'linkLastVisionToJobTimeline') &&
      has(files.vision, 'goVisionBilling') &&
      has(files.vision, 'goVisionReports') &&
      has(files.vision, 'buildActionSuggestions'),
    'Vision panel must link analysis back to timeline, billing, reports, and operator suggestions.');

  check('line', 'line-preview-and-safe-send',
    has(files.line, 'previewLineRoomMessageAction') &&
      has(files.line, 'sendLineRoomMessageAction') &&
      has(files.line, 'sendLineMessageConfirmed') &&
      has(files.line, 'queueLineTestAlert') &&
      has(files.line, 'line-route-matrix'),
    'LINE Center must keep preview, confirmation, test queue, and route matrix surfaces.');

  check('contract', 'vision-line-contract-safety',
    has(files.apiContract, "action: 'executeVisionSuggestion', destructive: true, smoke: false") &&
      has(files.apiContract, 'previewVisionSuggestion') &&
      has(files.apiContract, 'sendLineRoomMessage') &&
      has(files.apiContract, 'getLineCommandCenter'),
    'API contract must mark Vision execution destructive and keep LINE preview/send actions registered.');

  check('backend', 'gated-backend-handlers',
    has(files.visionBackend, "String(params.confirm || '') !== 'EXECUTE_VISION_SUGGESTION'") &&
      has(files.visionBackend, 'function previewVisionSuggestion') &&
      has(files.visionBackend, 'function executeVisionSuggestion') &&
      has(files.lineBackend, 'previewLineRoomMessage') &&
      has(files.lineBackend, 'sendLineRoomMessage'),
    'Backend must keep confirmation-gated Vision execution and LINE preview/send handlers.');

  check('runtime', 'browser-runtime-self-tests',
    has(files.runtimeSelfTest, "id: 'ai-vision-runtime'") &&
      has(files.runtimeSelfTest, "id: 'line-command-center'") &&
      has(files.runtimeSelfTest, "callApi('getVisionDashboardStats'") &&
      has(files.runtimeSelfTest, "callApi('getLineCommandCenter'"),
    'Browser Runtime Self-Test must cover Vision and LINE read paths.');

  check('ci', 'sprint117-wired',
    has(files.staticGuard, 'sprint117_vision_line_operational_loop_audit.js') &&
      has(files.regression, 'sprint117_vision_line_operational_loop_audit.js') &&
      has(files.workflow, 'sprint117_vision_line_operational_loop_audit.js'),
    'Sprint 117 guard must run in static guard, regression guard, and Actions syntax checks.');

  check('blueprint', 'blueprint-documents-sprint117',
    has(files.blueprint, 'Phase 117 Vision + LINE Operational Loop') &&
      has(files.blueprint, 'preview-first') &&
      has(files.blueprint, 'sprint117_vision_line_operational_loop_audit.js'),
    'BLUEPRINT must document Vision + LINE operational loop hardening.');

  const p0 = issues.filter(item => item.severity === 'P0').length;
  const score = Math.round((checks.filter(item => item.ok).length / checks.length) * 100);
  const report = { generated_at: new Date().toISOString(), version: 'sprint117-vision-line-operational-loop-1.0.0', status: p0 ? 'fail' : 'ok', score, checks, issues };
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(REPORT_JSON, JSON.stringify(report, null, 2) + '\n', 'utf8');
  console.log(`[Sprint 117 Vision + LINE Operational Loop] status=${report.status} score=${score}/100`);
  console.log(`[Sprint 117 Vision + LINE Operational Loop] report: ${path.relative(ROOT, REPORT_JSON).replace(/\\/g, '/')}`);
  if (p0) process.exit(1);
}

main();
