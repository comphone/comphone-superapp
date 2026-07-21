#!/usr/bin/env node
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(ROOT, relative), 'utf8');
const digest = source => crypto.createHash('sha256').update(source).digest('hex');
const ui = read('pwa/section_line_center.js');
const backend = read('clasp-ready/LineCommandCenter.gs');
const rootBackend = read('LineCommandCenter.gs');

const checks = [
  { id: 'nested-alert-detail-formatter', ok: ui.includes('function formatAlertDetail(alert)') && ui.includes('JSON.stringify(candidate)') },
  { id: 'no-object-coercion-in-alert-row', ok: ui.includes('esc(formatAlertDetail(alert))') },
  { id: 'thai-ui-copy-valid', ok: ui.includes('พิมพ์ข้อความที่จะส่งเข้าห้อง LINE') && ui.includes("'พร้อม' : 'ยังไม่ตั้งค่า'") },
  { id: 'thai-command-copy-valid', ok: backend.includes("command: '#แจ้งเตือน'") && backend.includes("command: '#รับทราบทั้งหมด'") },
  { id: 'bot-reply-toggle-preserves-processing', ok: backend.includes('Bot reply toggle only; backend processing remains active.') },
  { id: 'notification-toggle-preserves-processing', ok: backend.includes('Notification toggle only; backend processing remains active.') },
  { id: 'deploy-source-aligned', ok: digest(backend) === digest(rootBackend) }
];

const failures = checks.filter(check => !check.ok);
if (failures.length) {
  console.error('[Sprint 217] FAILED');
  failures.forEach(failure => console.error(` - ${failure.id}`));
  process.exit(1);
}
console.log('[Sprint 217] OK - LINE Center quiet mode and alert rendering guard passed');
