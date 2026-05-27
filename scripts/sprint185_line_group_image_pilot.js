#!/usr/bin/env node
/*
 * Sprint 185 LINE Group Image Pilot Guard
 *
 * Verifies that the production AI Vision + LINE group image path is ready for
 * an owner-run real pilot. This script never sends LINE messages and never
 * injects fake images into production; it reads live readiness when a session
 * token or login env is available.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REPORT = path.join(ROOT, 'test_reports', 'sprint185_line_group_image_pilot_latest.json');
const gasConfig = fs.readFileSync(path.join(ROOT, 'pwa', 'gas_config.js'), 'utf8');
const GAS_URL = process.env.COMPHONE_GAS_URL || (gasConfig.match(/url:\s*'([^']+)'/) || [])[1];

let token = process.env.COMPHONE_AUTH_TOKEN || '';

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function redactLiveStatus(body) {
  if (!body || typeof body !== 'object') return {};
  return {
    success: body.success !== false,
    status: body.status || '',
    mode: body.mode || '',
    ready: body.ready === true,
    pending_photos: Number(body.pending_photos || 0),
    total_photos: Number(body.total_photos || 0),
    checks: body.checks || {},
    workflow_steps: Array.isArray(body.workflow) ? body.workflow.length : 0,
    note: body.note || ''
  };
}

async function request(action, payload = {}) {
  const qs = new URLSearchParams(Object.assign({ action, _t: Date.now() }, payload));
  const res = await fetch(`${GAS_URL}?${qs.toString()}`, { redirect: 'follow' });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch (_) {
    throw new Error(`${action}: non-JSON ${res.status} ${text.slice(0, 120)}`);
  }
  return { status: res.status, body };
}

async function maybeLogin(checks) {
  if (token) return { source: 'COMPHONE_AUTH_TOKEN', ok: true };
  const username = process.env.COMPHONE_LOGIN_USERNAME || '';
  const password = process.env.COMPHONE_LOGIN_PASSWORD || '';
  if (!username || !password) {
    checks.push({
      id: 'protected-live-login-or-token',
      ok: true,
      status: 'SKIP',
      detail: 'Set COMPHONE_AUTH_TOKEN, or COMPHONE_LOGIN_USERNAME + COMPHONE_LOGIN_PASSWORD, to read protected live ingress status.'
    });
    return { source: 'none', ok: false, skipped: true };
  }
  const result = await request('loginUser', { username, password });
  const nextToken = result.body && (result.body.token || result.body.session_token);
  if (result.status === 200 && result.body && result.body.success !== false && nextToken) {
    token = nextToken;
    checks.push({ id: 'protected-live-login-or-token', ok: true, status: 'OK', source: 'login-env' });
    return { source: 'login-env', ok: true };
  }
  checks.push({
    id: 'protected-live-login-or-token',
    ok: false,
    status: 'FAIL',
    http_status: result.status,
    error: (result.body && (result.body.error || result.body.message)) || 'login failed'
  });
  return { source: 'login-env', ok: false };
}

async function main() {
  if (!GAS_URL) throw new Error('Missing GAS URL. Set COMPHONE_GAS_URL or update pwa/gas_config.js.');

  const lineBot = read('clasp-ready/LineBot.gs');
  const photoQueue = read('clasp-ready/PhotoQueue.gs');
  const router = read('clasp-ready/Router.gs');
  const routerSplit = read('clasp-ready/RouterSplit.gs');
  const apiContract = read('pwa/api_contract.js');
  const worker = read('workers/line-webhook/src/index.js');
  const setupDoc = fs.existsSync(path.join(ROOT, 'delivery', 'docs', 'LINE_WEBHOOK_CHECKLIST.md'))
    ? read('delivery/docs/LINE_WEBHOOK_CHECKLIST.md')
    : '';

  const checks = [
    { id: 'gas-url-present', ok: /^https:\/\/script\.google\.com\/macros\/s\//.test(GAS_URL) },
    { id: 'line-webhook-signature-guard', ok: lineBot.includes('handleLineWebhook') && router.includes('verifyLineSignature_') },
    { id: 'line-image-event-handler', ok: lineBot.includes('handlePhotoReport') && lineBot.includes('queuePhotoFromLINE') },
    { id: 'line-image-job-context-memory', ok: lineBot.includes('rememberLineJobContextV55_') && lineBot.includes('getLineJobContextV55_') },
    { id: 'photo-queue-drive-sheet-path', ok: photoQueue.includes('saveToPhotoQueue') && photoQueue.includes('DriveApp') && photoQueue.includes('DB_PHOTO_QUEUE') },
    { id: 'queued-gemini-processing', ok: photoQueue.includes('processImageSorting') && photoQueue.includes('_analyzeQueuedPhoto') && photoQueue.includes('analyzeWorkImageFromBase64') },
    { id: 'protected-status-action-routed', ok: photoQueue.includes('getVisionLineIngressStatus') && routerSplit.includes('getVisionLineIngressStatus') && apiContract.includes('getVisionLineIngressStatus') },
    { id: 'worker-forwards-line-signature', ok: worker.includes("'X-Line-Signature': signature") || worker.includes('"X-Line-Signature": signature') },
    { id: 'worker-passes-signature-as-gas-query-param', ok: worker.includes("searchParams.set('X-Line-Signature', signature)") || worker.includes('searchParams.set("X-Line-Signature", signature)') },
    { id: 'worker-forwards-line-payload-to-gas', ok: worker.includes('const bodyText = await request.text()') && worker.includes('forwardToGAS(env.GAS_URL') && (worker.includes('prepareForwardPayload') || worker.includes('bodyText, signature')) },
    { id: 'worker-gas-diagnostic-endpoint', ok: worker.includes('/diag/gas') && worker.includes('runGasDiagnostic') },
    { id: 'notification-toggle-does-not-stop-backend', ok: photoQueue.includes('LINE notification toggles affect outbound push only') },
    { id: 'no-real-line-send-env', ok: !process.env.COMPHONE_LINE_REAL_SEND && !process.env.COMPHONE_LINE_SEND_CONFIRM },
    { id: 'operator-checklist-present', ok: setupDoc.includes('Webhook URL') || setupDoc.includes('line/webhook') },
  ];

  const publicHealth = await request('health', {});
  const healthOk = publicHealth.status === 200 && publicHealth.body && publicHealth.body.success !== false;
  const config = publicHealth.body && publicHealth.body.checks && publicHealth.body.checks.config || {};
  checks.push({
    id: 'public-health-ai-line-config',
    ok: healthOk && config.gemini_ok === true && config.line_ok === true,
    http_status: publicHealth.status,
    status: healthOk ? 'OK' : 'FAIL',
    summary: {
      gemini_ok: config.gemini_ok === true,
      line_ok: config.line_ok === true,
      missing_count: Array.isArray(config.missing) ? config.missing.length : 0
    }
  });

  const login = await maybeLogin(checks);
  const live = { status: 'SKIP', token_present: !!token, token_source: login.source, ingress: null };
  if (token) {
    const ingress = await request('getVisionLineIngressStatus', { token });
    live.status = ingress.status === 200 && ingress.body && ingress.body.success !== false ? 'OK' : 'FAIL';
    live.http_status = ingress.status;
    live.ingress = redactLiveStatus(ingress.body);
    checks.push({
      id: 'protected-live-ingress-status',
      ok: live.status === 'OK' && live.ingress.ready === true,
      status: live.status,
      detail: live.status === 'OK' && live.ingress.ready !== true
        ? 'Protected action responds, but one or more live runtime readiness checks need attention.'
        : ''
    });
  }

  const ownerPilotRunbook = [
    'Open the configured LINE technician group that contains the COMPHONE bot.',
    'Send one clear job photo with caption containing an existing JobID, for example: J0020 before/after test.',
    'Wait for the webhook and queued processor; do not enable LINE real-send env vars from CI.',
    'Run this guard again with COMPHONE_AUTH_TOKEN or login env and verify pending_photos/total_photos changed as expected.',
    'Open AI Vision review queue and confirm the new Vision evidence is linked to Sheet/Drive before using it operationally.'
  ];
  checks.push({ id: 'owner-real-pilot-runbook', ok: ownerPilotRunbook.length === 5 });

  const failures = checks.filter(row => !row.ok);
  const report = {
    generated_at: new Date().toISOString(),
    mode: 'line-group-image-real-pilot-readiness-no-line-send',
    gas_url: GAS_URL,
    status: failures.length ? 'fail' : 'ok',
    token_present: !!token,
    live,
    checks,
    ownerPilotRunbook
  };

  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, JSON.stringify(report, null, 2) + '\n', 'utf8');
  console.log(`[Sprint 185 LINE Group Image Pilot] status=${report.status} checks=${checks.length - failures.length}/${checks.length} live=${live.status}`);
  console.log(`[Sprint 185 LINE Group Image Pilot] report: ${path.relative(ROOT, REPORT).replace(/\\/g, '/')}`);
  if (failures.length) process.exit(1);
}

main().catch(err => {
  console.error('[Sprint 185 LINE Group Image Pilot] FAILED');
  console.error(err);
  process.exit(1);
});
