#!/usr/bin/env node
/* Sprint 189 compatibility guard for the current LINE room noise policy. */
'use strict';

const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const REPORT = path.join(ROOT, 'test_reports', 'sprint189_line_reply_noise_guard_latest.json');
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const check = (id, ok, detail = '') => ({ id, ok: !!ok, detail });

function main() {
  const worker = read('workers/line-webhook/src/index.js');
  const line = read('LineBot.gs');
  const lineReady = read('clasp-ready/LineBot.gs');
  const blueprint = read('BLUEPRINT.md');
  const checks = [
    check('worker-signed-raw-forward-policy', worker.includes('signed-raw-forward') && worker.includes('summarizeForwardPolicy')),
    check('worker-preserves-signed-reply-token', !worker.includes('delete next.replyToken') && worker.includes('bodyText, signature, summary')),
    check('worker-delegates-replies-to-room-toggle', worker.includes("reply_control: 'gas-room-toggle'")),
    check('worker-version-current', worker.includes('1.0.6-sprint221')),
    check('gas-photo-ack-default-quiet-root', line.includes("getLineReplyModeV55_('LINE_PHOTO_ACK_MODE', 'quiet')") && line.includes('silentAck: true')),
    check('gas-photo-ack-default-quiet-clasp', lineReady.includes("getLineReplyModeV55_('LINE_PHOTO_ACK_MODE', 'quiet')") && lineReady.includes('silentAck: true')),
    check('gas-no-job-hint-throttled', line.includes('shouldReplyLineNoJobHintV55_') && line.includes('30 * 60')),
    check('gas-job-ack-throttled', line.includes('shouldReplyLinePhotoAckV55_') && line.includes('15 * 60')),
    check('blueprint-documents-noise-policy', blueprint.includes('Sprint 189'))
  ];
  const failures = checks.filter(item => !item.ok);
  const report = {
    generated_at: new Date().toISOString(),
    mode: 'line-reply-noise-static-guard',
    status: failures.length ? 'fail' : 'ok',
    score: Math.round(((checks.length - failures.length) / checks.length) * 100),
    checks
  };
  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, JSON.stringify(report, null, 2));
  console.log(`[Sprint 189 LINE Reply Noise Guard] status=${report.status} checks=${checks.length - failures.length}/${checks.length}`);
  console.log(`[Sprint 189 LINE Reply Noise Guard] report: ${path.relative(ROOT, REPORT)}`);
  if (failures.length) {
    failures.forEach(item => console.error(`- ${item.id}: ${item.detail || 'failed'}`));
    process.exit(1);
  }
}

main();
