#!/usr/bin/env node
/*
 * Sprint 189 guard: LINE reply noise suppression.
 * Static guard only; it does not call LINE, GAS, or Cloudflare.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REPORT = path.join(ROOT, 'test_reports', 'sprint189_line_reply_noise_guard_latest.json');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function has(text, value) {
  return text.includes(value);
}

function check(id, ok, detail = '') {
  return { id, ok: !!ok, detail };
}

function main() {
  const worker = read('workers/line-webhook/src/index.js');
  const line = read('LineBot.gs');
  const lineReady = read('clasp-ready/LineBot.gs');
  const blueprint = read('BLUEPRINT.md');

  const checks = [
    check('worker-quiet-forward-policy', has(worker, 'prepareForwardPayload') && has(worker, 'quiet-group-forward')),
    check('worker-strips-group-reply-token', has(worker, 'delete next.replyToken') && has(worker, 'images_silenced') && has(worker, 'text_silenced')),
    check('worker-keeps-explicit-commands', has(worker, 'isExplicitLineCommand') && has(worker, '/^\\/groupid') && has(worker, 'เช็คงาน')),
    check('worker-version-bumped', has(worker, '1.0.5-sprint189')),
    check('gas-photo-ack-default-quiet-root', has(line, "getLineReplyModeV55_('LINE_PHOTO_ACK_MODE', 'quiet')") && has(line, 'silentAck: true')),
    check('gas-photo-ack-default-quiet-clasp', has(lineReady, "getLineReplyModeV55_('LINE_PHOTO_ACK_MODE', 'quiet')") && has(lineReady, 'silentAck: true')),
    check('gas-no-job-hint-throttled', has(line, 'shouldReplyLineNoJobHintV55_') && has(line, '30 * 60')),
    check('gas-job-ack-throttled', has(line, 'shouldReplyLinePhotoAckV55_') && has(line, '15 * 60')),
    check('blueprint-documents-noise-policy', has(blueprint, 'Sprint 189') && has(blueprint, 'quiet-group-forward')),
  ];

  const failures = checks.filter(item => !item.ok);
  const report = {
    generated_at: new Date().toISOString(),
    mode: 'line-reply-noise-static-guard',
    status: failures.length ? 'fail' : 'ok',
    score: Math.round(((checks.length - failures.length) / checks.length) * 100),
    checks,
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
