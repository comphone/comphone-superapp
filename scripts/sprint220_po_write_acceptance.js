#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REPORT = path.join(ROOT, 'test_reports', 'sprint220_po_write_acceptance_latest.json');
const TOKEN = process.env.COMPHONE_AUTH_TOKEN || '';
const ENABLED = /^(1|true)$/i.test(process.env.COMPHONE_PO_ACCEPTANCE || '');
const CONFIRMED = process.env.COMPHONE_PO_ACCEPTANCE_CONFIRM === 'CREATE_AND_CLEAN_TEST_PO';
const gasConfig = fs.readFileSync(path.join(ROOT, 'pwa', 'gas_config.js'), 'utf8');
const GAS_URL = process.env.COMPHONE_GAS_URL || (gasConfig.match(/url:\s*'([^']+)'/) || [])[1];

function smokeId() {
  return `PO_WSMOKE_${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}_${Math.random().toString(36).slice(2, 8)}`;
}

async function request(action, payload = {}) {
  const params = Object.assign({ action, token: TOKEN, _t: Date.now() }, payload);
  Object.keys(params).forEach(key => {
    if (params[key] && typeof params[key] === 'object') params[key] = JSON.stringify(params[key]);
  });
  const response = await fetch(`${GAS_URL}?${new URLSearchParams(params)}`, { redirect: 'follow' });
  const text = await response.text();
  let body;
  try { body = JSON.parse(text); }
  catch (_) { throw new Error(`${action}: non-JSON ${response.status} ${text.slice(0, 120)}`); }
  return { status: response.status, body };
}

function add(report, id, ok, detail = '') {
  report.checks.push({ id, ok: !!ok, detail });
  console.log(`[Sprint 220] ${ok ? 'OK' : 'FAIL'} ${id}${detail ? ` - ${detail}` : ''}`);
}

function writeReport(report) {
  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, JSON.stringify(report, null, 2) + '\n', 'utf8');
  console.log(`[Sprint 220] report: ${path.relative(ROOT, REPORT).replace(/\\/g, '/')}`);
}

async function main() {
  const report = {
    generated_at: new Date().toISOString(),
    environment: 'production',
    mode: ENABLED && CONFIRMED && TOKEN ? 'controlled-write' : 'skip-safe',
    token_present: !!TOKEN,
    notification_suppressed: true,
    status: 'ok',
    checks: []
  };
  if (!GAS_URL) throw new Error('Missing GAS URL');
  if (!ENABLED || !CONFIRMED || !TOKEN) {
    add(report, 'safety-gate', true, 'SKIP: requires token plus explicit PO acceptance confirmation');
    writeReport(report);
    return;
  }

  const marker = smokeId();
  const requestId = `po_accept_${marker}`;
  const payload = {
    client_request_id: requestId,
    source: 'pwa_write_smoke',
    smoke_id: marker,
    supplier: `COMPHONE AUTO WRITE SMOKE ${marker}`,
    notes: `AUTO WRITE SMOKE - DELETE AFTER ACCEPTANCE ${marker}`,
    suppress_notifications: true,
    items: [{ item_code: `SMOKE-${marker}`, item_name: `AUTO WRITE SMOKE ITEM ${marker}`, qty: 1, unit_cost: 1 }]
  };

  let poId = '';
  try {
    const created = await request('createPurchaseOrder', payload);
    poId = String(created.body && created.body.po_id || '');
    add(report, 'create-po', created.status === 200 && created.body.success !== false && !!poId);

    const replay = await request('createPurchaseOrder', payload);
    add(report, 'idempotent-replay', replay.status === 200 && replay.body.idempotent_replay === true && String(replay.body.po_id || '') === poId);

    const listed = await request('listPurchaseOrders', { limit: 100 });
    const matching = (listed.body && listed.body.items || []).filter(item => String(item.po_id || '') === poId);
    add(report, 'immediate-readback', listed.status === 200 && matching.length === 1);
  } finally {
    if (poId) {
      const records = JSON.stringify([{ scope: 'purchase_orders', id: poId }]);
      const preview = await request('cleanupSmokeTestRecords', { execute: 'false', records });
      const previewMatches = (preview.body && preview.body.candidates || []).filter(item => String(item.id || '') === poId && item.marker_ok === true);
      add(report, 'cleanup-preview-marker-gate', preview.status === 200 && previewMatches.length >= 1);

      const cleanup = await request('cleanupSmokeTestRecords', {
        execute: 'true',
        confirm: 'DELETE_REVIEWED_SMOKE_RECORDS',
        records
      });
      const deleted = (cleanup.body && cleanup.body.deleted || []).filter(item => String(item.id || '') === poId);
      add(report, 'archive-first-cleanup', cleanup.status === 200 && cleanup.body.executed === true && deleted.length >= 1, `rows=${deleted.length}`);

      const after = await request('listPurchaseOrders', { limit: 100 });
      const remains = (after.body && after.body.items || []).some(item => String(item.po_id || '') === poId);
      add(report, 'post-cleanup-absence', after.status === 200 && !remains);
    } else {
      add(report, 'cleanup-not-required', true, 'No PO was created');
    }
  }

  const failures = report.checks.filter(check => !check.ok);
  report.status = failures.length ? 'fail' : 'ok';
  report.summary = { passed: report.checks.length - failures.length, failed: failures.length };
  writeReport(report);
  if (failures.length) process.exit(1);
}

main().catch(error => {
  console.error('[Sprint 220] FAILED', error.message);
  process.exit(1);
});
