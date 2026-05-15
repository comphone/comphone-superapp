#!/usr/bin/env node
/*
 * LINE Command Center smoke harness.
 *
 * Default mode is read-only: verify room status, dashboard payload, and dry-run
 * preview. Real LINE pushes are behind a separate explicit safety gate.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const gasConfig = fs.readFileSync(path.join(ROOT, 'pwa', 'gas_config.js'), 'utf8');
const urlMatch = gasConfig.match(/url:\s*'([^']+)'/);
const GAS_URL = process.env.COMPHONE_GAS_URL || (urlMatch && urlMatch[1]);
const TOKEN = process.env.COMPHONE_AUTH_TOKEN || '';
const SEND_ENABLED = process.env.COMPHONE_LINE_SEND === '1' || process.env.COMPHONE_LINE_SEND === 'true';
const SEND_CONFIRM = process.env.COMPHONE_LINE_SEND_CONFIRM === 'SEND_TEST_LINE_MESSAGE';
const ROOMS = (process.env.COMPHONE_LINE_TEST_ROOMS || 'EXECUTIVE')
  .split(',')
  .map(room => room.trim().toUpperCase())
  .filter(Boolean);
const REPORT_PATH = process.env.COMPHONE_LINE_SMOKE_REPORT ||
  path.join(ROOT, 'test_reports', 'pwa_line_room_smoke_latest.json');

if (!GAS_URL) {
  console.error('[PWA LINE Room Smoke] Missing GAS URL. Set COMPHONE_GAS_URL or update pwa/gas_config.js.');
  process.exit(1);
}

async function request(action, payload = {}) {
  const qsPayload = Object.assign({ action, _t: Date.now() }, payload);
  if (TOKEN) qsPayload.token = TOKEN;
  for (const key of Object.keys(qsPayload)) {
    const value = qsPayload[key];
    if (value && typeof value === 'object') qsPayload[key] = JSON.stringify(value);
  }
  const res = await fetch(`${GAS_URL}?${new URLSearchParams(qsPayload).toString()}`, { redirect: 'follow' });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch (_) {
    throw new Error(`${action}: non-JSON response (${res.status}) ${text.slice(0, 160)}`);
  }
  return { status: res.status, body };
}

function classify(error, status) {
  const raw = String(error || '').toUpperCase();
  if (status === 401 || /AUTH|TOKEN|SESSION|LOGIN|401/.test(raw)) return 'AUTH_FAIL';
  if (status === 403 || /PERMISSION|FORBIDDEN|DENIED|ROLE|ADMIN ACCESS|403/.test(raw)) return 'PERMISSION';
  if (/CONFIRM_REQUIRED/.test(raw)) return 'CONFIRM_REQUIRED';
  if (/NOT_FOUND|UNKNOWN ACTION|NO_HANDLER|FUNCTION NOT FOUND|ACTION/.test(raw)) return 'CONTRACT';
  if (/REQUIRED|MISSING|INVALID/.test(raw)) return 'VALIDATION';
  if (/TIMEOUT|ABORT/.test(raw)) return 'TIMEOUT';
  if (/NETWORK|FAILED TO FETCH|LOAD FAILED|OFFLINE/.test(raw)) return 'NETWORK';
  return 'BACKEND';
}

function writeReport(report) {
  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2) + '\n', 'utf8');
  console.log(`[PWA LINE Room Smoke] report: ${path.relative(ROOT, REPORT_PATH).replace(/\\/g, '/')}`);
}

async function runAction(report, scope, action, payload, verifier) {
  const started = Date.now();
  try {
    const result = await request(action, payload);
    const ok = result.status === 200 && result.body && result.body.success !== false && (!verifier || verifier(result.body));
    const error = ok ? '' : (result.body && (result.body.error || result.body.message || result.body.status || result.body.code)) || 'unexpected response';
    const row = {
      scope,
      action,
      ok,
      status_label: ok ? 'OK' : classify(error, result.status),
      http_status: result.status,
      elapsed_ms: Date.now() - started,
      error,
      summary: {
        rooms: result.body && (result.body.total || (Array.isArray(result.body.rooms) ? result.body.rooms.length : undefined)),
        configured: result.body && result.body.configured,
        tokenConfigured: result.body && result.body.tokenConfigured,
        dryRun: result.body && result.body.dryRun,
      },
    };
    report.results.push(row);
    console.log(`[${scope.padEnd(10)}] ${action}: ${row.status_label} ${row.http_status} ${row.elapsed_ms}ms${error ? ' - ' + error : ''}`);
    return result.body;
  } catch (err) {
    const row = {
      scope,
      action,
      ok: false,
      status_label: classify(err.message, 0),
      http_status: 0,
      elapsed_ms: Date.now() - started,
      error: err.message,
    };
    report.results.push(row);
    console.log(`[${scope.padEnd(10)}] ${action}: ${row.status_label} 0 ${row.elapsed_ms}ms - ${row.error}`);
    return null;
  }
}

async function main() {
  const report = {
    generated_at: new Date().toISOString(),
    gas_url: GAS_URL,
    token_present: !!TOKEN,
    send_enabled: SEND_ENABLED,
    send_confirmation_present: SEND_CONFIRM,
    rooms: ROOMS,
    mode: SEND_ENABLED && SEND_CONFIRM ? 'send-test-line-message' : 'read-only-preview',
    results: [],
  };

  if (!TOKEN) {
    report.results.push({
      scope: 'safety',
      action: 'line-smoke-gate',
      ok: true,
      status_label: 'SKIP',
      http_status: 0,
      elapsed_ms: 0,
      error: 'set COMPHONE_AUTH_TOKEN to run protected LINE room checks',
    });
    writeReport(report);
    console.log('[PWA LINE Room Smoke] OK (protected checks skipped safely)');
    return;
  }

  await runAction(report, 'protected', 'getLineRoomStatus', {}, body => Array.isArray(body.rooms));
  await runAction(report, 'protected', 'getLineCommandCenter', { days: 7 }, body => !!(Array.isArray(body.rooms) && body.queue && body.analytics));
  await runAction(report, 'preview', 'previewLineRoomMessage', {
    rooms: ROOMS,
    message: 'COMPHONE LINE smoke preview only',
  }, body => body.dryRun === true && Array.isArray(body.rooms));

  if (SEND_ENABLED && SEND_CONFIRM) {
    await runAction(report, 'send', 'sendLineRoomMessage', {
      rooms: ROOMS,
      message: `COMPHONE automated LINE smoke test ${new Date().toISOString()}`,
      confirm: 'SEND_LINE_ROOM_MESSAGE',
    }, body => Array.isArray(body.results));
  } else {
    report.results.push({
      scope: 'safety',
      action: 'sendLineRoomMessage',
      ok: true,
      status_label: 'SKIP',
      http_status: 0,
      elapsed_ms: 0,
      error: 'real LINE send skipped; set COMPHONE_LINE_SEND=1 and COMPHONE_LINE_SEND_CONFIRM=SEND_TEST_LINE_MESSAGE',
    });
  }

  writeReport(report);
  const failures = report.results.filter(row => !row.ok);
  if (failures.length) {
    console.error('[PWA LINE Room Smoke] FAILED');
    process.exit(1);
  }
  console.log('[PWA LINE Room Smoke] OK');
}

main().catch(err => {
  console.error('[PWA LINE Room Smoke] FAILED');
  console.error(err);
  process.exit(1);
});
