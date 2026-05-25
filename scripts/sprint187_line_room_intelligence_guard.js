#!/usr/bin/env node
/*
 * Sprint 187 guard: LINE room-aware AI/Vision responses.
 * This is a static safety guard; it does not send LINE messages.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REPORT = path.join(ROOT, 'test_reports', 'sprint187_line_room_intelligence_guard_latest.json');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function has(text, value) {
  return text.includes(value);
}

function check(id, ok, detail) {
  return { id, ok: !!ok, detail: detail || '' };
}

function main() {
  const line = read('LineBot.gs');
  const lineReady = read('clasp-ready/LineBot.gs');
  const prompts = read('AILinePrompts.gs');
  const promptsReady = read('clasp-ready/AILinePrompts.gs');
  const blueprint = read('BLUEPRINT.md');

  const checks = [
    check('room-policy-layer-root', has(line, 'LINE_ROOM_POLICIES_V55') && has(line, 'getLineRoomPolicyV55_')),
    check('room-policy-layer-clasp', has(lineReady, 'LINE_ROOM_POLICIES_V55') && has(lineReady, 'getLineRoomPolicyV55_')),
    check('accounting-images-no-jobid-queued', has(line, 'ACCOUNTING_PENDING') && has(line, 'รับรูปบัญชี/สลิปเข้าคิวเรียบร้อย')),
    check('sales-procurement-exec-pending-contexts', ['SALES_PENDING', 'PROCUREMENT_PENDING', 'EXECUTIVE_REVIEW'].every(v => has(line, v))),
    check('technician-still-requires-jobid', has(line, 'รูปหน้างานต้องมี JobID')),
    check('accounting-role-not-sales', has(prompts, "ACCOUNTING_ANALYST") && !/C7b939d1d367e6b854690e58b392e88cc': 'SALES_ANALYST/.test(prompts)),
    check('procurement-role-present', has(prompts, 'PROCUREMENT_ASSISTANT')),
    check('no-guessing-rule-present', has(prompts, 'ห้ามเดาตัวเลข') && has(promptsReady, 'ห้ามเดาตัวเลข')),
    check('room-specific-fallbacks-present', ['ห้องช่าง', 'ห้องบัญชี', 'ห้องขาย', 'ห้องจัดซื้อ', 'ห้องผู้บริหาร'].every(v => has(prompts, v))),
    check('blueprint-updated', has(blueprint, 'Room-aware LINE AI/Vision')),
  ];

  const failures = checks.filter(item => !item.ok);
  const report = {
    generated_at: new Date().toISOString(),
    mode: 'line-room-intelligence-static-guard',
    status: failures.length ? 'fail' : 'ok',
    score: Math.round(((checks.length - failures.length) / checks.length) * 100),
    checks,
  };

  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, JSON.stringify(report, null, 2));
  console.log(`[Sprint 187 LINE Room Intelligence Guard] status=${report.status} checks=${checks.length - failures.length}/${checks.length}`);
  console.log(`[Sprint 187 LINE Room Intelligence Guard] report: ${path.relative(ROOT, REPORT)}`);
  if (failures.length) {
    failures.forEach(item => console.error(`- ${item.id}: ${item.detail || 'failed'}`));
    process.exit(1);
  }
}

main();
