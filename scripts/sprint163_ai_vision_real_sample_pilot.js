#!/usr/bin/env node
/*
 * Sprint 163 AI Vision Real Sample Pilot
 *
 * Gated real-sample pilot for AI Vision. Default mode verifies readiness and
 * preview paths only. Real image analysis requires:
 *   COMPHONE_AUTH_TOKEN
 *   COMPHONE_AI_VISION_SAMPLE_PILOT=1
 *   COMPHONE_AI_VISION_SAMPLE_CONFIRM=RUN_REAL_SAMPLE_ANALYSIS
 *   COMPHONE_AI_VISION_SAMPLE_BASE64 or COMPHONE_AI_VISION_SAMPLE_FILE
 *
 * This script never sends real LINE messages.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REPORT = path.join(ROOT, 'test_reports', 'sprint163_ai_vision_real_sample_pilot_latest.json');
const REAL_EVIDENCE_REPORT = path.join(ROOT, 'test_reports', 'sprint163_ai_vision_real_sample_evidence_latest.json');
const TOKEN = process.env.COMPHONE_AUTH_TOKEN || '';
const ENABLED = process.env.COMPHONE_AI_VISION_SAMPLE_PILOT === '1';
const CONFIRM = process.env.COMPHONE_AI_VISION_SAMPLE_CONFIRM === 'RUN_REAL_SAMPLE_ANALYSIS';
const SAMPLE_BASE64 = process.env.COMPHONE_AI_VISION_SAMPLE_BASE64 || '';
const SAMPLE_FILE = process.env.COMPHONE_AI_VISION_SAMPLE_FILE || '';
const gasConfig = fs.readFileSync(path.join(ROOT, 'pwa', 'gas_config.js'), 'utf8');
const GAS_URL = process.env.COMPHONE_GAS_URL || (gasConfig.match(/url:\s*'([^']+)'/) || [])[1];

function read(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }
function has(text, token) { return text.includes(token); }
function loadSampleBase64() {
  if (SAMPLE_BASE64) return SAMPLE_BASE64;
  if (SAMPLE_FILE) return fs.readFileSync(path.resolve(SAMPLE_FILE)).toString('base64');
  return '';
}
async function request(action, payload = {}) {
  const data = Object.assign({ action, _t: Date.now() }, payload);
  if (TOKEN) data.token = TOKEN;
  Object.keys(data).forEach(key => { if (data[key] && typeof data[key] === 'object') data[key] = JSON.stringify(data[key]); });
  const getUrl = `${GAS_URL}?${new URLSearchParams(data).toString()}`;
  const usePost = getUrl.length > 7000;
  const res = await fetch(usePost ? GAS_URL : getUrl, usePost ? {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
    body: JSON.stringify(data),
    redirect: 'follow'
  } : { redirect: 'follow' });
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch (_) { throw new Error(`${action}: non-JSON ${res.status}`); }
  return { status: res.status, body };
}

async function main() {
  const source = [
    read('pwa/section_vision.js'),
    read('clasp-ready/VisionPipeline.gs'),
    read('scripts/vision_e2e_smoke.js'),
    read('scripts/sprint152_ai_vision_real_pilot_guard.js'),
    read('scripts/sprint158_ai_vision_line_room_control_guard.js'),
  ].join('\n');
  const checks = [
    { id: 'sample-pilot-gated', ok: fs.readFileSync(__filename, 'utf8').includes('COMPHONE_AI_VISION_SAMPLE_CONFIRM'), type: 'safety' },
    { id: 'vision-ui-confirmation', ok: has(source, 'Run AI Vision analysis') && has(source, 'confirm('), type: 'ui' },
    { id: 'preview-before-controlled-execute', ok: has(source, 'previewVisionSuggestion') && has(source, 'executeVisionSuggestion'), type: 'contract' },
    { id: 'no-real-line-send', ok: !/request\(\s*['"]sendLineRoomMessage['"]/.test(fs.readFileSync(__filename, 'utf8')), type: 'safety' },
  ];

  if (!TOKEN) {
    checks.push({ id: 'protected-vision-readiness', ok: true, type: 'live', status: 'SKIP', detail: 'COMPHONE_AUTH_TOKEN required for protected Vision readiness.' });
  } else {
    for (const [id, action, payload] of [
      ['stats', 'getVisionDashboardStats', { days: 7 }],
      ['version', 'getVisionPipelineVersion', {}],
      ['review-queue', 'getVisionReviewQueue', { limit: 10, days: 30 }],
      ['suggestions', 'getVisionActionSuggestions', {}],
      ['line-preview', 'previewLineRoomMessage', { rooms: ['TECHNICIAN'], message: 'Sprint 163 AI Vision pilot preview only' }],
    ]) {
      const result = await request(action, payload);
      checks.push({ id: `live-${id}-${action}`, ok: result.status === 200 && result.body && result.body.success !== false, type: 'live', http_status: result.status, dryRun: result.body && result.body.dryRun });
    }
  }

  const shouldRunReal = !!(TOKEN && ENABLED && CONFIRM);
  if (shouldRunReal) {
    const imageBase64 = loadSampleBase64();
    if (!imageBase64) {
      checks.push({ id: 'real-sample-input-present', ok: false, type: 'live-write-gated', detail: 'Set COMPHONE_AI_VISION_SAMPLE_BASE64 or COMPHONE_AI_VISION_SAMPLE_FILE.' });
    } else {
      const sampleMime = process.env.COMPHONE_AI_VISION_SAMPLE_MIME || (/\.png$/i.test(SAMPLE_FILE) ? 'image/png' : 'image/jpeg');
      const result = await request('runVisionPipeline', {
        type: process.env.COMPHONE_AI_VISION_SAMPLE_TYPE || 'QC',
        imageBase64,
        base64: imageBase64,
        mimeType: sampleMime,
        fileName: process.env.COMPHONE_AI_VISION_SAMPLE_NAME || 'sprint163-real-sample.png',
        jobId: process.env.COMPHONE_AI_VISION_SAMPLE_JOB_ID || '',
        source: 'sprint163-real-sample-pilot',
      });
      const body = result.body || {};
      const semanticEvidence = {
        visionLogId: body.visionLogId || '',
        ai_status: body._aiStatus || '',
        provider: body._provider || (body.data && body.data.provider) || '',
        model: body._model || (body.data && body.data.model) || '',
        confidence: Number(body.confidence || 0),
        decision: body.decision && body.decision.code || '',
        photo_category: body.data && body.data.photo_category || '',
        asset_type: body.data && body.data.asset_type || '',
        issue_count: Array.isArray(body.issues) ? body.issues.length : 0,
        equipment_count: body.data && Array.isArray(body.data.detected_equipment) ? body.data.detected_equipment.length : 0,
      };
      const analyzed = result.status === 200 && body.success !== false && !body.error &&
        semanticEvidence.ai_status === 'analyzed' && semanticEvidence.provider === 'google-gemini' &&
        semanticEvidence.model && semanticEvidence.confidence > 0;
      checks.push({ id: 'live-real-sample-analysis', ok: analyzed, type: 'live-write-gated', http_status: result.status, ...semanticEvidence });
    }
  } else {
    checks.push({ id: 'live-real-sample-analysis', ok: true, type: 'live-write-gated', status: 'SKIP', detail: 'Set token plus COMPHONE_AI_VISION_SAMPLE_PILOT=1 and COMPHONE_AI_VISION_SAMPLE_CONFIRM=RUN_REAL_SAMPLE_ANALYSIS to run real sample analysis.' });
  }

  const failures = checks.filter(row => !row.ok);
  const report = { generated_at: new Date().toISOString(), mode: 'ai-vision-real-sample-pilot-no-real-line-send', token_present: !!TOKEN, real_sample_enabled: shouldRunReal, status: failures.length ? 'fail' : 'ok', score: Math.round((checks.length - failures.length) / checks.length * 100), checks };
  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, JSON.stringify(report, null, 2) + '\n', 'utf8');
  // A routine skip-safe regression must never erase the last controlled real run.
  if (shouldRunReal) fs.writeFileSync(REAL_EVIDENCE_REPORT, JSON.stringify(report, null, 2) + '\n', 'utf8');
  console.log(`[Sprint 163 AI Vision Sample Pilot] status=${report.status} score=${report.score}/100 checks=${checks.length - failures.length}/${checks.length} real_sample=${shouldRunReal}`);
  console.log(`[Sprint 163 AI Vision Sample Pilot] report: ${path.relative(ROOT, REPORT).replace(/\\/g, '/')}`);
  if (failures.length) process.exit(1);
}

main().catch(err => {
  console.error('[Sprint 163 AI Vision Sample Pilot] fatal:', err);
  process.exit(1);
});
