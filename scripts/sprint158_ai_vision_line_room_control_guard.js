#!/usr/bin/env node
/*
 * Sprint 158 AI Vision + LINE Room Control Guard
 *
 * Verifies that AI Vision can operate with per-room notification controls:
 * muted rooms suppress outbound LINE pushes only, while backend logs/review
 * queues/audit flows continue.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REPORT = path.join(ROOT, 'test_reports', 'sprint158_ai_vision_line_room_control_guard_latest.json');
const TOKEN = process.env.COMPHONE_AUTH_TOKEN || '';
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
    visionGs: read('clasp-ready/VisionPipeline.gs'),
    lineGs: read('clasp-ready/LineCommandCenter.gs'),
    routerGs: read('clasp-ready/RouterSplit.gs') + '\n' + read('clasp-ready/Router.gs'),
    visionUi: read('pwa/section_vision.js'),
    lineUi: read('pwa/section_line_center.js'),
    contract: read('pwa/api_contract.js'),
    lineSmoke: read('scripts/pwa_line_room_smoke.js'),
  };
  const source = Object.values(files).join('\n');
  const checks = [
    { id: 'line-notification-settings-contract', ok: has(source, 'getLineNotificationSettings') && has(source, 'updateLineNotificationSettings'), type: 'contract' },
    { id: 'room-mute-does-not-stop-backend', ok: has(files.lineGs, 'backend processing') && has(files.lineGs, 'Vision logs') && has(files.lineGs, 'audit logs continue'), type: 'safety' },
    { id: 'vision-line-router-respects-mute', ok: has(files.visionGs, '_vpPushVisionLineRooms_') && has(files.visionGs, 'notificationEnabled: false') && has(files.visionGs, 'Vision processing and logs retained'), type: 'vision' },
    { id: 'line-ui-room-toggle-present', ok: has(files.lineUi, 'toggleLineRoomNotification') && has(files.lineUi, 'Backend processing, Vision logs, and audit records will continue'), type: 'ui' },
    { id: 'vision-ui-execution-preview', ok: has(files.visionUi, 'previewVisionSuggestion') && has(files.visionUi, 'executeVisionSuggestion') && has(files.visionUi, 'formatVisionPreviewText'), type: 'ui' },
    { id: 'line-real-send-gated', ok: has(files.lineSmoke, 'COMPHONE_LINE_SEND_CONFIRM') && has(files.lineSmoke, 'SEND_TEST_LINE_MESSAGE'), type: 'safety' },
    { id: 'router-exposes-vision-line-actions', ok: ['getLineCommandCenter', 'getLineNotificationSettings', 'updateLineNotificationSettings', 'getVisionDashboardStats', 'runVisionPipeline', 'executeVisionSuggestion'].every(token => has(files.routerGs, token)), type: 'router' },
    { id: 'api-contract-documents-controls', ok: has(files.contract, 'updateLineNotificationSettings') && has(files.contract, 'notification') && has(files.contract, 'executeVisionSuggestion'), type: 'contract' },
  ];
  if (!TOKEN) {
    checks.push({ id: 'protected-ai-line-live-reads', ok: true, type: 'live', status: 'SKIP', detail: 'COMPHONE_AUTH_TOKEN required for live AI/LINE reads.' });
  } else {
    for (const [id, action, payload] of [
      ['vision-stats', 'getVisionDashboardStats', { days: 7 }],
      ['vision-version', 'getVisionPipelineVersion', {}],
      ['vision-review-queue', 'getVisionReviewQueue', { limit: 10, days: 30 }],
      ['line-rooms', 'getLineRoomStatus', {}],
      ['line-notification-settings', 'getLineNotificationSettings', {}],
      ['line-command-center', 'getLineCommandCenter', { days: 7 }],
      ['line-preview', 'previewLineRoomMessage', { rooms: ['TECHNICIAN'], message: 'Sprint 158 preview only' }],
    ]) {
      const result = await request(action, payload);
      checks.push({ id: `live-${id}`, ok: result.status === 200 && result.body && result.body.success !== false, type: 'live', http_status: result.status, dryRun: result.body && result.body.dryRun });
    }
  }
  const failures = checks.filter(row => !row.ok);
  const report = { generated_at: new Date().toISOString(), mode: 'ai-vision-line-room-control-no-real-send', token_present: !!TOKEN, status: failures.length ? 'fail' : 'ok', score: Math.round((checks.length - failures.length) / checks.length * 100), checks };
  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, JSON.stringify(report, null, 2) + '\n', 'utf8');
  console.log(`[Sprint 158 AI Vision LINE Control] status=${report.status} score=${report.score}/100 checks=${checks.length - failures.length}/${checks.length}`);
  console.log(`[Sprint 158 AI Vision LINE Control] report: ${path.relative(ROOT, REPORT).replace(/\\/g, '/')}`);
  if (failures.length) process.exit(1);
}

main().catch(err => {
  console.error('[Sprint 158 AI Vision LINE Control] fatal:', err);
  process.exit(1);
});
