#!/usr/bin/env node
/*
 * Sprint 128 LINE Notification Toggle Live QA
 *
 * Token-aware live QA for Sprint 127 notification-only room toggles.
 * Default behavior is read-only and CI-safe. A real toggle requires:
 *   COMPHONE_AUTH_TOKEN=<fresh token>
 *   COMPHONE_LINE_TOGGLE_CONFIRM=RUN_NOTIFICATION_TOGGLE_ROLLBACK
 *
 * When enabled, the script flips one room setting, verifies preview behavior,
 * and immediately rolls the setting back to its original value.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const gasConfig = fs.readFileSync(path.join(ROOT, 'pwa', 'gas_config.js'), 'utf8');
const urlMatch = gasConfig.match(/url:\s*'([^']+)'/);
const GAS_URL = process.env.COMPHONE_GAS_URL || (urlMatch && urlMatch[1]);
const TOKEN = process.env.COMPHONE_AUTH_TOKEN || '';
const CONFIRM = process.env.COMPHONE_LINE_TOGGLE_CONFIRM === 'RUN_NOTIFICATION_TOGGLE_ROLLBACK';
const TARGET_ROOM = String(process.env.COMPHONE_LINE_TOGGLE_ROOM || '').trim().toUpperCase();
const REPORT_PATH = process.env.COMPHONE_LINE_TOGGLE_QA_REPORT ||
  path.join(ROOT, 'test_reports', 'sprint128_line_notification_toggle_live_qa_latest.json');

if (!GAS_URL) {
  console.error('[Sprint 128 LINE Toggle QA] Missing GAS URL. Set COMPHONE_GAS_URL or update pwa/gas_config.js.');
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
  if (/NOT_FOUND|UNKNOWN ACTION|NO_HANDLER|FUNCTION NOT FOUND|ACTION/.test(raw)) return 'CONTRACT';
  if (/REQUIRED|MISSING|INVALID/.test(raw)) return 'VALIDATION';
  if (/TIMEOUT|ABORT/.test(raw)) return 'TIMEOUT';
  if (/NETWORK|FAILED TO FETCH|LOAD FAILED|OFFLINE/.test(raw)) return 'NETWORK';
  return 'BACKEND';
}

function record(report, row) {
  report.results.push(row);
  console.log(`[${row.scope.padEnd(10)}] ${row.action}: ${row.status_label} ${row.http_status || 0} ${row.elapsed_ms || 0}ms${row.error ? ' - ' + row.error : ''}`);
}

async function runAction(report, scope, action, payload, verifier) {
  const started = Date.now();
  try {
    const result = await request(action, payload);
    const body = result.body;
    const ok = result.status === 200 && body && body.success !== false && (!verifier || verifier(body));
    const error = ok ? '' : (body && (body.error || body.message || body.status || body.code)) || 'unexpected response';
    const row = {
      scope,
      action,
      ok,
      status_label: ok ? 'OK' : classify(error, result.status),
      http_status: result.status,
      elapsed_ms: Date.now() - started,
      error,
      summary: {
        mode: body && body.mode,
        rooms: body && (Array.isArray(body.rooms) ? body.rooms.length : Array.isArray(body.settings) ? body.settings.length : undefined),
        dryRun: body && body.dryRun,
      },
    };
    record(report, row);
    return ok ? body : null;
  } catch (err) {
    record(report, {
      scope,
      action,
      ok: false,
      status_label: classify(err.message, 0),
      http_status: 0,
      elapsed_ms: Date.now() - started,
      error: err.message,
    });
    return null;
  }
}

function pickRoom(settings) {
  const rooms = (settings && settings.rooms) || [];
  if (TARGET_ROOM) return rooms.find(room => room.id === TARGET_ROOM);
  return rooms.find(room => room.configured) || rooms[0];
}

async function main() {
  const report = {
    generated_at: new Date().toISOString(),
    gas_url: GAS_URL,
    token_present: !!TOKEN,
    confirm_present: CONFIRM,
    target_room: TARGET_ROOM || '',
    mode: CONFIRM ? 'toggle-with-rollback' : 'read-only-or-skip',
    results: [],
  };

  if (!TOKEN) {
    record(report, {
      scope: 'safety',
      action: 'line-toggle-live-qa-gate',
      ok: true,
      status_label: 'SKIP',
      http_status: 0,
      elapsed_ms: 0,
      error: 'set COMPHONE_AUTH_TOKEN to run protected LINE notification toggle QA',
    });
  } else {
    const settings = await runAction(
      report,
      'protected',
      'getLineNotificationSettings',
      {},
      body => body.mode === 'notification-only-toggle' && Array.isArray(body.rooms)
    );
    await runAction(
      report,
      'preview',
      'previewLineRoomMessage',
      { rooms: [TARGET_ROOM || 'EXECUTIVE'], message: 'COMPHONE notification-toggle QA preview only' },
      body => body.dryRun === true && Array.isArray(body.rooms)
    );

    const room = pickRoom(settings);
    if (!room) {
      record(report, {
        scope: 'safety',
        action: 'select-toggle-room',
        ok: false,
        status_label: 'VALIDATION',
        http_status: 0,
        elapsed_ms: 0,
        error: 'No LINE rooms are available in getLineNotificationSettings',
      });
    } else if (!CONFIRM) {
      record(report, {
        scope: 'safety',
        action: 'updateLineNotificationSettings',
        ok: true,
        status_label: 'SKIP',
        http_status: 0,
        elapsed_ms: 0,
        error: 'real toggle skipped; set COMPHONE_LINE_TOGGLE_CONFIRM=RUN_NOTIFICATION_TOGGLE_ROLLBACK to flip and rollback one room',
        summary: { room: room.id, original: room.notificationEnabled !== false },
      });
    } else {
      const original = room.notificationEnabled !== false;
      const flipped = !original;
      await runAction(
        report,
        'toggle',
        'updateLineNotificationSettings',
        { rooms: [room.id], enabled: flipped },
        body => Array.isArray(body.changed) && body.changed.some(item => item.room === room.id && item.notificationEnabled === flipped)
      );
      await runAction(
        report,
        'preview',
        'previewLineRoomMessage',
        { rooms: [room.id], message: 'COMPHONE muted-room preview rollback QA' },
        body => body.dryRun === true && Array.isArray(body.rooms) && body.rooms.some(item => item.id === room.id && item.notificationEnabled === flipped)
      );
      await runAction(
        report,
        'rollback',
        'updateLineNotificationSettings',
        { rooms: [room.id], enabled: original },
        body => Array.isArray(body.changed) && body.changed.some(item => item.room === room.id && item.notificationEnabled === original)
      );
    }
  }

  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2) + '\n', 'utf8');
  console.log(`[Sprint 128 LINE Toggle QA] report: ${path.relative(ROOT, REPORT_PATH).replace(/\\/g, '/')}`);

  const failures = report.results.filter(row => !row.ok);
  if (failures.length) {
    console.error('[Sprint 128 LINE Toggle QA] FAILED');
    process.exit(1);
  }
  console.log('[Sprint 128 LINE Toggle QA] OK');
}

main().catch(err => {
  console.error('[Sprint 128 LINE Toggle QA] FAILED');
  console.error(err);
  process.exit(1);
});
