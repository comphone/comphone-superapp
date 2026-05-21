#!/usr/bin/env node
/*
 * Sprint 183 LINE AI Vision Ingress Guard
 *
 * Proves the LINE-group image path is wired to AI Vision safely:
 * LINE webhook -> queuePhotoFromLINE -> PHOTO_QUEUE/Drive -> queued Gemini
 * processor -> Sheet/Drive evidence. This guard never sends LINE messages.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REPORT = path.join(ROOT, 'test_reports', 'sprint183_line_ai_vision_ingress_guard_latest.json');
const TOKEN = process.env.COMPHONE_AUTH_TOKEN || '';
const REQUIRE_LIVE = process.env.COMPHONE_SPRINT183_REQUIRE_LIVE === '1';
const gasConfig = fs.readFileSync(path.join(ROOT, 'pwa', 'gas_config.js'), 'utf8');
const GAS_URL = process.env.COMPHONE_GAS_URL || (gasConfig.match(/url:\s*'([^']+)'/) || [])[1];

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

async function request(action, payload = {}) {
  const data = Object.assign({ action, _t: Date.now() }, payload);
  if (TOKEN) data.token = TOKEN;
  const res = await fetch(`${GAS_URL}?${new URLSearchParams(data).toString()}`, { redirect: 'follow' });
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch (_) { throw new Error(`${action}: non-JSON ${res.status} ${text.slice(0, 120)}`); }
  return { status: res.status, body };
}

async function main() {
  const lineBot = read('clasp-ready/LineBot.gs');
  const photoQueue = read('clasp-ready/PhotoQueue.gs');
  const routerSplit = read('clasp-ready/RouterSplit.gs');
  const apiContract = read('pwa/api_contract.js');
  const visionSection = read('pwa/section_vision.js');
  const checks = [
    { id: 'line-webhook-signature-guard', ok: lineBot.includes('handleLineWebhook') && read('clasp-ready/Router.gs').includes('verifyLineSignature_') },
    { id: 'line-image-routes-to-photo-queue', ok: lineBot.includes('handlePhotoReport') && lineBot.includes('queuePhotoFromLINE') },
    { id: 'photo-queue-writes-drive-sheet', ok: photoQueue.includes('saveToPhotoQueue') && photoQueue.includes('getPhotoQueueSheet') && photoQueue.includes('DriveApp') },
    { id: 'queued-gemini-analysis', ok: photoQueue.includes('processImageSorting') && photoQueue.includes('_analyzeQueuedPhoto') && photoQueue.includes('analyzeWorkImageFromBase64') },
    { id: 'line-ingress-status-action', ok: photoQueue.includes('getVisionLineIngressStatus') && routerSplit.includes('getVisionLineIngressStatus') && apiContract.includes('getVisionLineIngressStatus') },
    { id: 'vision-ui-readiness-visible', ok: visionSection.includes('checkVisionReadiness') && visionSection.includes('gemini_ok') },
    { id: 'no-real-line-send-env', ok: !process.env.COMPHONE_LINE_REAL_SEND && !process.env.COMPHONE_LINE_SEND_CONFIRM },
  ];

  const live = { token_present: !!TOKEN, required: REQUIRE_LIVE, status: 'SKIP' };
  if (!TOKEN) {
    checks.push({ id: 'protected-line-ingress-live', ok: !REQUIRE_LIVE, status: 'SKIP', detail: 'Set COMPHONE_AUTH_TOKEN to read live LINE AI Vision ingress status.' });
  } else {
    const result = await request('getVisionLineIngressStatus', {});
    const ok = result.status === 200 && result.body && result.body.success !== false;
    live.status = ok ? 'OK' : 'FAIL';
    live.http_status = result.status;
    live.ready = !!(result.body && result.body.ready);
    live.pending_photos = result.body && result.body.pending_photos;
    live.checks = result.body && result.body.checks;
    checks.push({
      id: 'protected-line-ingress-live',
      ok: REQUIRE_LIVE ? ok && live.ready : ok,
      live,
      detail: ok && !live.ready ? 'Live action responds, but one or more runtime config checks need attention.' : ''
    });
  }

  const failures = checks.filter(row => !row.ok);
  const report = {
    generated_at: new Date().toISOString(),
    mode: 'line-ai-vision-ingress-readiness-no-line-send',
    status: failures.length ? 'fail' : 'ok',
    token_present: !!TOKEN,
    checks,
    live,
  };
  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, JSON.stringify(report, null, 2) + '\n');
  console.log(`[Sprint 183 LINE AI Vision Ingress] status=${report.status} checks=${checks.length - failures.length}/${checks.length} live=${live.status}`);
  console.log(`[Sprint 183 LINE AI Vision Ingress] report: ${path.relative(ROOT, REPORT).replace(/\\/g, '/')}`);
  if (failures.length) process.exit(1);
}

main().catch(err => {
  console.error('[Sprint 183 LINE AI Vision Ingress] FAILED');
  console.error(err);
  process.exit(1);
});
