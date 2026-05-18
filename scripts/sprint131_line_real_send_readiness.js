#!/usr/bin/env node
/*
 * Sprint 131 LINE Real-Send Readiness
 *
 * CI-safe by default. With COMPHONE_AUTH_TOKEN it verifies:
 * - room settings/status are readable
 * - target rooms can be previewed without sending
 * - sendLineRoomMessage rejects calls without the backend confirmation phrase
 * - a configured muted room follows the send path but suppresses outbound push
 *   and is rolled back immediately
 *
 * A real outbound LINE send remains behind a separate owner gate:
 *   COMPHONE_LINE_REAL_SEND=1
 *   COMPHONE_LINE_REAL_SEND_CONFIRM=OWNER_APPROVED_REAL_LINE_SEND
 *   COMPHONE_LINE_REAL_SEND_MESSAGE='...'
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const gasConfig = fs.readFileSync(path.join(ROOT, 'pwa', 'gas_config.js'), 'utf8');
const urlMatch = gasConfig.match(/url:\s*'([^']+)'/);
const GAS_URL = process.env.COMPHONE_GAS_URL || (urlMatch && urlMatch[1]);
const TOKEN = process.env.COMPHONE_AUTH_TOKEN || '';
const TARGET_ROOMS = (process.env.COMPHONE_LINE_READINESS_ROOMS || '')
  .split(',')
  .map(room => room.trim().toUpperCase())
  .filter(Boolean);
const REAL_SEND_ENABLED = process.env.COMPHONE_LINE_REAL_SEND === '1' || process.env.COMPHONE_LINE_REAL_SEND === 'true';
const REAL_SEND_CONFIRM = process.env.COMPHONE_LINE_REAL_SEND_CONFIRM === 'OWNER_APPROVED_REAL_LINE_SEND';
const REAL_SEND_MESSAGE = String(process.env.COMPHONE_LINE_REAL_SEND_MESSAGE || '').trim();
const REPORT_PATH = process.env.COMPHONE_LINE_READINESS_REPORT ||
  path.join(ROOT, 'test_reports', 'sprint131_line_real_send_readiness_latest.json');

if (!GAS_URL) {
  console.error('[Sprint 131 LINE Real-Send Readiness] Missing GAS URL. Set COMPHONE_GAS_URL or update pwa/gas_config.js.');
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

function summarize(body) {
  if (!body || typeof body !== 'object') return {};
  return {
    mode: body.mode,
    roomCount: Array.isArray(body.rooms) ? body.rooms.length : undefined,
    configured: body.configured,
    tokenConfigured: body.tokenConfigured,
    dryRun: body.dryRun,
    changed: Array.isArray(body.changed) ? body.changed.map(item => ({
      room: item.room,
      notificationEnabled: item.notificationEnabled,
    })) : undefined,
    sendResults: Array.isArray(body.results) ? body.results.map(item => ({
      room: item.room,
      success: item.success,
      skipped: item.skipped === true,
      notificationEnabled: item.notificationEnabled,
      error: item.error || '',
    })) : undefined,
    previewRooms: body.preview && Array.isArray(body.preview.rooms)
      ? body.preview.rooms.map(item => ({
        id: item.id,
        configured: item.configured,
        notificationEnabled: item.notificationEnabled,
        willNotify: item.willNotify,
      }))
      : undefined,
  };
}

function record(report, row) {
  report.results.push(row);
  console.log(`[${row.scope.padEnd(12)}] ${row.action}: ${row.status_label} ${row.http_status || 0} ${row.elapsed_ms || 0}ms${row.error ? ' - ' + row.error : ''}`);
}

async function runAction(report, scope, action, payload, verifier) {
  const started = Date.now();
  try {
    const result = await request(action, payload);
    const ok = result.status === 200 && result.body && (!verifier || verifier(result.body));
    const error = ok ? '' : (result.body && (result.body.error || result.body.message || result.body.status || result.body.code)) || 'unexpected response';
    const row = {
      scope,
      action,
      ok,
      status_label: ok ? 'OK' : classify(error, result.status),
      http_status: result.status,
      elapsed_ms: Date.now() - started,
      error,
      summary: summarize(result.body),
    };
    record(report, row);
    return ok ? result.body : null;
  } catch (err) {
    record(report, {
      scope,
      action,
      ok: false,
      status_label: classify(err.message, 0),
      http_status: 0,
      elapsed_ms: Date.now() - started,
      error: err.message,
      summary: {},
    });
    return null;
  }
}

function choosePreviewRooms(status) {
  const rooms = (status && status.rooms) || [];
  if (TARGET_ROOMS.length) return TARGET_ROOMS;
  const configured = rooms.filter(room => room.configured).map(room => room.id);
  return configured.length ? configured : rooms.slice(0, 3).map(room => room.id);
}

function chooseMutedProofRoom(status) {
  const rooms = (status && status.rooms) || [];
  return rooms.find(room => room.configured) || null;
}

async function main() {
  const report = {
    generated_at: new Date().toISOString(),
    gas_url: GAS_URL,
    token_present: !!TOKEN,
    real_send_enabled: REAL_SEND_ENABLED,
    real_send_confirmation_present: REAL_SEND_CONFIRM,
    target_rooms: TARGET_ROOMS,
    mode: REAL_SEND_ENABLED && REAL_SEND_CONFIRM ? 'owner-approved-real-send' : 'readiness-and-muted-send-proof',
    results: [],
  };

  if (!TOKEN) {
    record(report, {
      scope: 'safety',
      action: 'line-real-send-readiness-gate',
      ok: true,
      status_label: 'SKIP',
      http_status: 0,
      elapsed_ms: 0,
      error: 'set COMPHONE_AUTH_TOKEN to run protected LINE real-send readiness checks',
      summary: {},
    });
  } else {
    const status = await runAction(report, 'protected', 'getLineRoomStatus', {}, body => Array.isArray(body.rooms));
    await runAction(report, 'protected', 'getLineNotificationSettings', {}, body => body.mode === 'notification-only-toggle' && Array.isArray(body.rooms));
    const previewRooms = choosePreviewRooms(status);
    await runAction(report, 'preview', 'previewLineRoomMessage', {
      rooms: previewRooms,
      message: 'COMPHONE Sprint 131 LINE readiness preview only',
    }, body => body.success !== false && body.dryRun === true && Array.isArray(body.rooms));

    await runAction(report, 'safety', 'sendLineRoomMessage', {
      rooms: previewRooms.slice(0, 1),
      message: 'COMPHONE Sprint 131 confirm-required proof',
    }, body => body.success === false && body.code === 'CONFIRM_REQUIRED' && body.preview && body.preview.dryRun === true);

    const proofRoom = chooseMutedProofRoom(status);
    if (!proofRoom) {
      record(report, {
        scope: 'safety',
        action: 'muted-send-proof',
        ok: true,
        status_label: 'SKIP',
        http_status: 0,
        elapsed_ms: 0,
        error: 'No configured LINE room is available for muted send proof',
        summary: {},
      });
    } else {
      const original = proofRoom.notificationEnabled !== false;
      await runAction(report, 'toggle', 'updateLineNotificationSettings', {
        rooms: [proofRoom.id],
        enabled: false,
      }, body => Array.isArray(body.changed) && body.changed.some(item => item.room === proofRoom.id && item.notificationEnabled === false));
      await runAction(report, 'muted-send', 'sendLineRoomMessage', {
        rooms: [proofRoom.id],
        message: 'COMPHONE Sprint 131 muted send proof - no outbound push expected',
        confirm: 'SEND_LINE_ROOM_MESSAGE',
      }, body => Array.isArray(body.results) && body.results.some(item => item.room === proofRoom.id && item.success === true && item.skipped === true && item.notificationEnabled === false));
      await runAction(report, 'rollback', 'updateLineNotificationSettings', {
        rooms: [proofRoom.id],
        enabled: original,
      }, body => Array.isArray(body.changed) && body.changed.some(item => item.room === proofRoom.id && item.notificationEnabled === original));
    }

    if (REAL_SEND_ENABLED && REAL_SEND_CONFIRM) {
      if (!REAL_SEND_MESSAGE) {
        record(report, {
          scope: 'real-send',
          action: 'sendLineRoomMessage',
          ok: false,
          status_label: 'VALIDATION',
          http_status: 0,
          elapsed_ms: 0,
          error: 'COMPHONE_LINE_REAL_SEND_MESSAGE is required for owner-approved real sends',
          summary: {},
        });
      } else {
        await runAction(report, 'real-send', 'sendLineRoomMessage', {
          rooms: previewRooms,
          message: REAL_SEND_MESSAGE,
          confirm: 'SEND_LINE_ROOM_MESSAGE',
        }, body => Array.isArray(body.results));
      }
    } else {
      record(report, {
        scope: 'safety',
        action: 'owner-approved-real-send',
        ok: true,
        status_label: 'SKIP',
        http_status: 0,
        elapsed_ms: 0,
        error: 'real outbound LINE send skipped; require COMPHONE_LINE_REAL_SEND=1, COMPHONE_LINE_REAL_SEND_CONFIRM=OWNER_APPROVED_REAL_LINE_SEND, and COMPHONE_LINE_REAL_SEND_MESSAGE',
        summary: {},
      });
    }
  }

  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2) + '\n', 'utf8');
  console.log(`[Sprint 131 LINE Real-Send Readiness] report: ${path.relative(ROOT, REPORT_PATH).replace(/\\/g, '/')}`);

  const failures = report.results.filter(row => !row.ok);
  if (failures.length) {
    console.error('[Sprint 131 LINE Real-Send Readiness] FAILED');
    process.exit(1);
  }
  console.log('[Sprint 131 LINE Real-Send Readiness] OK');
}

main().catch(err => {
  console.error('[Sprint 131 LINE Real-Send Readiness] FAILED');
  console.error(err);
  process.exit(1);
});
