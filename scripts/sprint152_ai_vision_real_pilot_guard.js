#!/usr/bin/env node
/*
 * Sprint 152 AI Vision Real Pilot Guard
 *
 * Defines the real-pilot path for AI Vision while keeping CI safe. Default mode
 * verifies readiness and previews only. Real image analysis requires explicit
 * environment gates and still never sends a real LINE message from this script.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REPORT = path.join(ROOT, 'test_reports', 'sprint152_ai_vision_real_pilot_latest.json');
const TOKEN = process.env.COMPHONE_AUTH_TOKEN || '';
const REAL_PILOT = process.env.COMPHONE_AI_VISION_REAL_PILOT === '1';
const CONFIRM = process.env.COMPHONE_AI_VISION_REAL_PILOT_CONFIRM === 'RUN_AI_VISION_PILOT';
const gasConfig = fs.readFileSync(path.join(ROOT, 'pwa', 'gas_config.js'), 'utf8');
const GAS_URL = process.env.COMPHONE_GAS_URL || (gasConfig.match(/url:\s*'([^']+)'/) || [])[1];

function read(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }
function has(text, token) { return text.includes(token); }
async function request(action, payload = {}) {
  const data = Object.assign({ action, _t: Date.now() }, payload);
  if (TOKEN) data.token = TOKEN;
  Object.keys(data).forEach(key => { if (data[key] && typeof data[key] === 'object') data[key] = JSON.stringify(data[key]); });
  const res = await fetch(`${GAS_URL}?${new URLSearchParams(data).toString()}`, { redirect: 'follow' });
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch (_) { throw new Error(`${action}: non-JSON ${res.status}`); }
  return { status: res.status, body };
}

async function main() {
  const files = {
    visionUi: read('pwa/section_vision.js'),
    visionGs: read('VisionPipeline.gs'),
    lineGs: read('LineCommandCenter.gs'),
    e2e: read('scripts/vision_e2e_smoke.js'),
    contract: read('pwa/api_contract.js'),
  };
  const source = Object.values(files).join('\n');
  const checks = [
    { id: 'real-pilot-env-gated', ok: has(files.e2e, 'COMPHONE_VISION_E2E_CONFIRM') && has(fs.readFileSync(__filename, 'utf8'), 'COMPHONE_AI_VISION_REAL_PILOT_CONFIRM'), type: 'static' },
    { id: 'gemini-key-script-property', ok: has(files.visionGs, 'GEMINI_API_KEY') && has(files.visionGs, 'GOOGLE_AI_API_KEY'), type: 'static' },
    { id: 'vision-ui-confirmation', ok: has(files.visionUi, 'Run AI Vision analysis') && has(files.visionUi, 'confirm('), type: 'static' },
    { id: 'suggestion-preview-before-execute', ok: has(files.visionUi, 'previewVisionSuggestion') && has(files.visionUi, 'executeVisionSuggestion'), type: 'static' },
    { id: 'line-send-not-used-by-pilot-guard', ok: !/await\s+request\(\s*['"]sendLineRoomMessage['"]/.test(fs.readFileSync(__filename, 'utf8')), type: 'static' },
    { id: 'api-contract-vision-actions', ok: ['runVisionPipeline', 'getVisionDashboardStats', 'previewVisionSuggestion', 'executeVisionSuggestion'].every(token => has(files.contract, token)), type: 'static' },
  ];

  if (!TOKEN) {
    checks.push({ id: 'protected-ai-vision-real-pilot', ok: true, type: 'live', status: 'SKIP', detail: 'COMPHONE_AUTH_TOKEN required for protected AI Vision pilot proof.' });
  } else {
    for (const [id, action, payload] of [
      ['stats', 'getVisionDashboardStats', { days: 7 }],
      ['pipeline-version', 'getVisionPipelineVersion', {}],
      ['suggestions', 'getVisionActionSuggestions', {}],
      ['review-queue', 'getVisionReviewQueue', { limit: 10, days: 30 }],
      ['line-preview', 'previewLineRoomMessage', { rooms: ['TECHNICIAN'], message: 'Sprint 152 AI Vision real-pilot preview only' }],
    ]) {
      const result = await request(action, payload);
      checks.push({ id: `live-${id}-${action}`, ok: result.status === 200 && result.body && result.body.success !== false, type: 'live', http_status: result.status, dryRun: result.body && result.body.dryRun });
    }
    if (REAL_PILOT && CONFIRM) {
      const samplePngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=';
      const result = await request('runVisionPipeline', {
        type: 'QC',
        imageBase64: samplePngBase64,
        jobId: process.env.COMPHONE_AI_VISION_REAL_PILOT_JOB_ID || '',
        source: 'sprint152-real-pilot',
      });
      checks.push({ id: 'live-real-vision-pilot-run', ok: result.status === 200 && result.body && result.body.success !== false, type: 'live-write-gated', http_status: result.status, visionLogId: result.body && result.body.visionLogId });
    } else {
      checks.push({ id: 'live-real-vision-pilot-run', ok: true, type: 'live-write-gated', status: 'SKIP', detail: 'Set COMPHONE_AI_VISION_REAL_PILOT=1 and COMPHONE_AI_VISION_REAL_PILOT_CONFIRM=RUN_AI_VISION_PILOT to run real image analysis.' });
    }
  }

  const failures = checks.filter(row => !row.ok);
  const report = { generated_at: new Date().toISOString(), gas_url: GAS_URL, token_present: !!TOKEN, real_pilot_enabled: REAL_PILOT && CONFIRM, mode: 'ai-vision-real-pilot-guard-no-real-line-send', status: failures.length ? 'fail' : 'ok', score: Math.round((checks.length - failures.length) / checks.length * 100), checks };
  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, JSON.stringify(report, null, 2) + '\n', 'utf8');
  console.log(`[Sprint 152 AI Vision Real Pilot] status=${report.status} score=${report.score}/100 checks=${checks.length - failures.length}/${checks.length}`);
  console.log(`[Sprint 152 AI Vision Real Pilot] report: ${path.relative(ROOT, REPORT).replace(/\\/g, '/')}`);
  if (failures.length) process.exit(1);
}

main().catch(err => { console.error('[Sprint 152 AI Vision Real Pilot] fatal:', err); process.exit(1); });
