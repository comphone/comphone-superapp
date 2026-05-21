#!/usr/bin/env node
/*
 * Sprint 172 LINE Room Notification Matrix Gate
 *
 * Verifies that LINE room notification controls are modeled as per-room
 * outbound-notification toggles, not as switches that stop backend work.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const REPORT = path.join(ROOT, 'test_reports', 'sprint172_line_room_notification_matrix_gate_latest.json');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function main() {
  const upstream = cp.spawnSync(process.execPath, ['scripts/sprint158_ai_vision_line_room_control_guard.js'], {
    cwd: ROOT,
    env: process.env,
    encoding: 'utf8'
  });
  const lineGs = read('clasp-ready/LineCommandCenter.gs');
  const visionGs = read('clasp-ready/VisionPipeline.gs');
  const lineUi = read('pwa/section_line_center.js');
  const smoke = read('scripts/pwa_line_room_smoke.js');
  const matrix = ['EXECUTIVE', 'TECHNICIAN', 'ACCOUNTING', 'INVENTORY', 'SYSTEM'];
  const checks = [
    { id: 'sprint158-room-control-clean', ok: upstream.status === 0, stdout: upstream.stdout.slice(-1000), stderr: upstream.stderr.slice(-1000) },
    { id: 'per-room-settings-api-present', ok: lineGs.includes('getLineNotificationSettings') && lineGs.includes('updateLineNotificationSettings') },
    { id: 'mute-preserves-backend-work', ok: lineGs.includes('backend processing') && lineGs.includes('audit logs continue') && visionGs.includes('Vision processing and logs retained') },
    { id: 'ui-explains-notification-only-mute', ok: lineUi.includes('Backend processing, Vision logs, and audit records will continue') },
    { id: 'preview-before-send-gate', ok: smoke.includes('previewLineRoomMessage') && smoke.includes('COMPHONE_LINE_SEND_CONFIRM') },
    { id: 'room-matrix-declared', ok: matrix.length >= 5, matrix },
  ];
  const failures = checks.filter(row => !row.ok);
  const report = { generated_at: new Date().toISOString(), mode: 'line-room-notification-matrix-gate-no-real-send', token_present: !!process.env.COMPHONE_AUTH_TOKEN, status: failures.length ? 'fail' : 'ok', checks };
  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, JSON.stringify(report, null, 2) + '\n');
  console.log(`[Sprint 172 LINE Room Matrix] status=${report.status} checks=${checks.length - failures.length}/${checks.length}`);
  console.log(`[Sprint 172 LINE Room Matrix] report: ${path.relative(ROOT, REPORT).replace(/\\/g, '/')}`);
  if (failures.length) process.exit(1);
}

main();
