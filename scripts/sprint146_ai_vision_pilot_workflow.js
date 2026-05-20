#!/usr/bin/env node
/*
 * Sprint 146 AI Vision Pilot Workflow
 *
 * Verifies that AI Vision can run as an operator pilot across Vision + LINE
 * without real sends by default. Real image analysis and real LINE delivery
 * remain owner-gated outside this guard.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REPORT = path.join(ROOT, 'test_reports', 'sprint146_ai_vision_pilot_workflow_latest.json');
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
  const source = Object.values(files).join('\n');
  const checks = [
    { id: 'vision-pilot-preview-first', ok: has(source, 'previewVisionSuggestion') && has(source, 'getVisionActionSuggestions'), type: 'static' },
    { id: 'vision-review-queue-human-gated', ok: has(source, 'getVisionReviewQueue') && (has(source, 'confirm') || has(source, 'review')), type: 'static' },
    { id: 'line-room-preview-no-real-send', ok: has(source, 'previewLineRoomMessage') && has(source, 'SEND_LINE_ROOM_MESSAGE') && has(source, 'CONFIRM_REQUIRED'), type: 'static' },
    { id: 'room-toggle-suppresses-notification-only', ok: has(source, 'notificationEnabled') && has(source, 'skipped'), type: 'static' },
    { id: 'pilot-does-not-call-real-send', ok: !/await\s+request\(\s*['"]sendLineRoomMessage['"]/.test(fs.readFileSync(__filename, 'utf8')), type: 'static' },
  ];

  if (!TOKEN) {
    checks.push({ id: 'protected-ai-vision-pilot', ok: true, type: 'live', status: 'SKIP', detail: 'COMPHONE_AUTH_TOKEN required for protected AI Vision pilot reads.' });
  } else {
    for (const [id, action, payload] of [
      ['stats', 'getVisionDashboardStats', { days: 7 }],
      ['pipeline-version', 'getVisionPipelineVersion', {}],
      ['suggestions', 'getVisionActionSuggestions', {}],
      ['review-queue', 'getVisionReviewQueue', { limit: 10, days: 30 }],
      ['line-room-status', 'getLineRoomStatus', {}],
      ['line-preview', 'previewLineRoomMessage', { rooms: ['EXECUTIVE'], message: 'Sprint 146 AI Vision pilot preview only' }],
    ]) {
      const result = await request(action, payload);
      checks.push({ id: `live-${id}-${action}`, ok: result.status === 200 && result.body && result.body.success !== false, type: 'live', http_status: result.status, dryRun: result.body && result.body.dryRun });
    }
  }

  const failures = checks.filter(row => !row.ok);
  const report = { generated_at: new Date().toISOString(), gas_url: GAS_URL, token_present: !!TOKEN, mode: 'ai-vision-pilot-no-real-send', status: failures.length ? 'fail' : 'ok', score: Math.round((checks.length - failures.length) / checks.length * 100), checks };
  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, JSON.stringify(report, null, 2) + '\n', 'utf8');
  console.log(`[Sprint 146 AI Vision Pilot] status=${report.status} score=${report.score}/100 checks=${checks.length - failures.length}/${checks.length}`);
  console.log(`[Sprint 146 AI Vision Pilot] report: ${path.relative(ROOT, REPORT).replace(/\\/g, '/')}`);
  if (failures.length) process.exit(1);
}

main().catch(err => { console.error('[Sprint 146 AI Vision Pilot] fatal:', err); process.exit(1); });
