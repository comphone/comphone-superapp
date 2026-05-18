#!/usr/bin/env node
/*
 * Sprint 129 AI Vision LINE Suppression Live QA
 *
 * Proves the Sprint 127/128 contract with a real protected backend path:
 * when a LINE room is muted, an AI Vision notification action is executed,
 * backend audit/queue work continues, and outbound LINE push is suppressed.
 *
 * Default mode is CI-safe. Real suppression proof requires:
 *   COMPHONE_AUTH_TOKEN=<fresh token>
 *   COMPHONE_VISION_LINE_SUPPRESSION_CONFIRM=RUN_MUTED_VISION_NOTIFICATION
 *
 * The script mutes one configured room, executes only a muted Vision LINE
 * notification suggestion, then rolls the room setting back immediately.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const gasConfig = fs.readFileSync(path.join(ROOT, 'pwa', 'gas_config.js'), 'utf8');
const urlMatch = gasConfig.match(/url:\s*'([^']+)'/);
const GAS_URL = process.env.COMPHONE_GAS_URL || (urlMatch && urlMatch[1]);
const TOKEN = process.env.COMPHONE_AUTH_TOKEN || '';
const CONFIRM = process.env.COMPHONE_VISION_LINE_SUPPRESSION_CONFIRM === 'RUN_MUTED_VISION_NOTIFICATION';
const TARGET_ROOM = String(process.env.COMPHONE_VISION_LINE_SUPPRESSION_ROOM || 'TECHNICIAN').trim().toUpperCase();
const REPORT_PATH = process.env.COMPHONE_VISION_LINE_SUPPRESSION_REPORT ||
  path.join(ROOT, 'test_reports', 'sprint129_vision_line_suppression_live_qa_latest.json');

const QC_FAIL_RESULT = {
  type: 'QC',
  confidence: 0.62,
  decision: { code: 'QC_FAIL' },
  data: { issue: 'Sprint 129 muted LINE notification proof' },
};

if (!GAS_URL) {
  console.error('[Sprint 129 Vision LINE Suppression QA] Missing GAS URL. Set COMPHONE_GAS_URL or update pwa/gas_config.js.');
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

function record(report, row) {
  report.results.push(row);
  console.log(`[${row.scope.padEnd(11)}] ${row.action}: ${row.status_label} ${row.http_status || 0} ${row.elapsed_ms || 0}ms${row.error ? ' - ' + row.error : ''}`);
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
      summary: summarize(body),
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
      summary: {},
    });
    return null;
  }
}

function summarize(body) {
  if (!body || typeof body !== 'object') return {};
  return {
    mode: body.mode,
    roomCount: Array.isArray(body.rooms) ? body.rooms.length : undefined,
    suggestion: body.suggestion && body.suggestion.id,
    notificationRooms: body.preview && Array.isArray(body.preview.notifications) ? body.preview.notifications.map(item => item.room) : undefined,
    executionLine: body.execution && Array.isArray(body.execution.line)
      ? body.execution.line.map(item => ({ room: item.room, skipped: item.skipped === true, notificationEnabled: item.notificationEnabled }))
      : undefined,
  };
}

function findRoom(settings) {
  const rooms = (settings && settings.rooms) || [];
  return rooms.find(room => room.id === TARGET_ROOM) || rooms.find(room => room.id === 'TECHNICIAN') || rooms.find(room => room.configured);
}

async function main() {
  const report = {
    generated_at: new Date().toISOString(),
    gas_url: GAS_URL,
    token_present: !!TOKEN,
    confirm_present: CONFIRM,
    target_room: TARGET_ROOM,
    mode: CONFIRM ? 'muted-vision-notification-with-rollback' : 'read-only-or-skip',
    results: [],
  };

  if (!TOKEN) {
    record(report, {
      scope: 'safety',
      action: 'vision-line-suppression-gate',
      ok: true,
      status_label: 'SKIP',
      http_status: 0,
      elapsed_ms: 0,
      error: 'set COMPHONE_AUTH_TOKEN to run protected AI Vision LINE suppression QA',
      summary: {},
    });
  } else {
    const settings = await runAction(
      report,
      'protected',
      'getLineNotificationSettings',
      {},
      body => body.mode === 'notification-only-toggle' && Array.isArray(body.rooms)
    );
    const room = findRoom(settings);
    const suggestions = await runAction(
      report,
      'protected',
      'getVisionActionSuggestions',
      { result: QC_FAIL_RESULT },
      body => Array.isArray(body.suggestions) && body.suggestions.some(item => item.id === 'notify_technician')
    );
    await runAction(
      report,
      'preview',
      'previewVisionSuggestion',
      { suggestionId: 'notify_technician', result: QC_FAIL_RESULT },
      body => body.preview && Array.isArray(body.preview.notifications) && body.preview.notifications.some(item => item.room === 'TECHNICIAN')
    );

    if (!room) {
      record(report, {
        scope: 'safety',
        action: 'select-suppression-room',
        ok: false,
        status_label: 'VALIDATION',
        http_status: 0,
        elapsed_ms: 0,
        error: 'No LINE rooms are available in getLineNotificationSettings',
        summary: {},
      });
    } else if (!room.configured) {
      record(report, {
        scope: 'safety',
        action: 'executeVisionSuggestion',
        ok: true,
        status_label: 'SKIP',
        http_status: 0,
        elapsed_ms: 0,
        error: `${room.id} is not configured; suppression proof requires a configured LINE room`,
        summary: { room: room.id, configured: false },
      });
    } else if (!CONFIRM) {
      record(report, {
        scope: 'safety',
        action: 'executeVisionSuggestion',
        ok: true,
        status_label: 'SKIP',
        http_status: 0,
        elapsed_ms: 0,
        error: 'muted Vision LINE notification skipped; set COMPHONE_VISION_LINE_SUPPRESSION_CONFIRM=RUN_MUTED_VISION_NOTIFICATION to execute and rollback',
        summary: {
          room: room.id,
          original: room.notificationEnabled !== false,
          suggestions: suggestions && suggestions.count,
        },
      });
    } else {
      const original = room.notificationEnabled !== false;
      await runAction(
        report,
        'toggle',
        'updateLineNotificationSettings',
        { rooms: [room.id], enabled: false },
        body => Array.isArray(body.changed) && body.changed.some(item => item.room === room.id && item.notificationEnabled === false)
      );
      await runAction(
        report,
        'execute',
        'executeVisionSuggestion',
        { suggestionId: 'notify_technician', result: QC_FAIL_RESULT, confirm: 'EXECUTE_VISION_SUGGESTION' },
        body => body.execution && Array.isArray(body.execution.line) && body.execution.line.some(item => item.room === room.id && item.skipped === true && item.notificationEnabled === false)
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
  console.log(`[Sprint 129 Vision LINE Suppression QA] report: ${path.relative(ROOT, REPORT_PATH).replace(/\\/g, '/')}`);

  const failures = report.results.filter(row => !row.ok);
  if (failures.length) {
    console.error('[Sprint 129 Vision LINE Suppression QA] FAILED');
    process.exit(1);
  }
  console.log('[Sprint 129 Vision LINE Suppression QA] OK');
}

main().catch(err => {
  console.error('[Sprint 129 Vision LINE Suppression QA] FAILED');
  console.error(err);
  process.exit(1);
});
