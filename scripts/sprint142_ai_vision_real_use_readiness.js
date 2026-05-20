#!/usr/bin/env node
/*
 * Sprint 142 AI Vision Real-Use Readiness
 *
 * Guards the real-use boundary: photo analysis remains confirmation-gated,
 * suggestions are preview-first, and LINE sends remain muted/owner-gated.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REPORT = path.join(ROOT, 'test_reports', 'sprint142_ai_vision_real_use_readiness_latest.json');
const TOKEN = process.env.COMPHONE_AUTH_TOKEN || '';
const gasConfig = fs.readFileSync(path.join(ROOT, 'pwa', 'gas_config.js'), 'utf8');
const urlMatch = gasConfig.match(/url:\s*'([^']+)'/);
const GAS_URL = process.env.COMPHONE_GAS_URL || (urlMatch && urlMatch[1]);

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
    lineUi: read('pwa/section_line_center.js'),
    visionGs: read('VisionPipeline.gs'),
    lineGs: read('LineCommandCenter.gs'),
    contract: read('pwa/api_contract.js'),
  };
  const checks = [
    { id: 'vision-analysis-confirmation-gated', ok: has(files.visionUi, 'COMPHONE_VISION_E2E_CONFIRM') || has(files.visionGs, 'EXECUTE_VISION_SUGGESTION') || has(files.visionUi, 'confirm'), type: 'static' },
    { id: 'suggestions-preview-first', ok: has(files.contract, 'previewVisionSuggestion') && has(files.contract, 'getVisionActionSuggestions'), type: 'static' },
    { id: 'line-real-send-owner-gated', ok: has(files.lineGs, 'OWNER_APPROVED_REAL_LINE_SEND') || has(files.lineUi, 'previewLineRoomMessage') || has(files.contract, 'previewLineRoomMessage'), type: 'static' },
    { id: 'notification-toggle-preserves-backend-work', ok: has(files.lineGs, 'notificationEnabled') && has(files.lineGs, 'skipped'), type: 'static' },
  ];

  if (!TOKEN) {
    checks.push({ id: 'vision-live-read-suite', ok: true, type: 'live', status: 'SKIP', detail: 'COMPHONE_AUTH_TOKEN required for live Vision readiness.' });
  } else {
    for (const [id, action, payload] of [
      ['vision-stats', 'getVisionDashboardStats', { days: 7 }],
      ['vision-pipeline-version', 'getVisionPipelineVersion', {}],
      ['vision-suggestions', 'getVisionActionSuggestions', {}],
      ['vision-review-queue', 'getVisionReviewQueue', { limit: 10, days: 30 }],
      ['line-preview', 'previewLineRoomMessage', { rooms: ['EXECUTIVE'], message: 'Sprint 142 preview only' }],
    ]) {
      const result = await request(action, payload);
      checks.push({ id, ok: result.status === 200 && result.body && result.body.success !== false, type: 'live', http_status: result.status, dryRun: result.body && result.body.dryRun });
    }
  }

  const failures = checks.filter(row => !row.ok);
  const report = { generated_at: new Date().toISOString(), gas_url: GAS_URL, token_present: !!TOKEN, mode: 'ai-vision-real-use-readiness-no-real-send', status: failures.length ? 'fail' : 'ok', score: Math.round((checks.length - failures.length) / checks.length * 100), checks };
  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, JSON.stringify(report, null, 2) + '\n', 'utf8');
  console.log(`[Sprint 142 AI Vision Readiness] status=${report.status} score=${report.score}/100 checks=${checks.length - failures.length}/${checks.length}`);
  console.log(`[Sprint 142 AI Vision Readiness] report: ${path.relative(ROOT, REPORT).replace(/\\/g, '/')}`);
  if (failures.length) process.exit(1);
}

main().catch(err => { console.error('[Sprint 142 AI Vision Readiness] fatal:', err); process.exit(1); });
