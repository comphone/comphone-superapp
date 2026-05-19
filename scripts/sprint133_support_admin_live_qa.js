#!/usr/bin/env node
/*
 * Sprint 133 Support/Admin Live QA
 *
 * Token-aware, read-only proof for the support and administration chain:
 * Inventory -> Purchase Orders -> Warranty -> Admin Settings.
 *
 * CI-safe without COMPHONE_AUTH_TOKEN: writes a skipped report and exits OK.
 * With a fresh token, it verifies live production read contracts without
 * creating, updating, receiving, repairing, deleting, or sending anything.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const gasConfig = fs.readFileSync(path.join(ROOT, 'pwa', 'gas_config.js'), 'utf8');
const urlMatch = gasConfig.match(/url:\s*'([^']+)'/);
const GAS_URL = process.env.COMPHONE_GAS_URL || (urlMatch && urlMatch[1]);
const TOKEN = process.env.COMPHONE_AUTH_TOKEN || '';
const TIMEOUT_MS = Number(process.env.COMPHONE_SUPPORT_QA_TIMEOUT_MS || 30000);
const REPORT_PATH = process.env.COMPHONE_SUPPORT_QA_REPORT ||
  path.join(ROOT, 'test_reports', 'sprint133_support_admin_live_qa_latest.json');

if (!GAS_URL) {
  console.error('[Sprint 133 Support/Admin Live QA] Missing GAS URL. Set COMPHONE_GAS_URL or update pwa/gas_config.js.');
  process.exit(1);
}

function nestedValue(obj, key) {
  return key.split('.').reduce((current, part) => current && current[part], obj);
}

function rowsFor(body, keys) {
  for (const key of keys) {
    const value = nestedValue(body, key);
    if (Array.isArray(value)) return value;
  }
  return [];
}

function firstValue(obj, keys) {
  for (const key of keys) {
    const value = nestedValue(obj, key);
    if (value !== undefined && value !== null && value !== '') return String(value);
  }
  return '';
}

function encodePayload(payload) {
  const copy = Object.assign({}, payload || {});
  for (const key of Object.keys(copy)) {
    if (copy[key] && typeof copy[key] === 'object') copy[key] = JSON.stringify(copy[key]);
  }
  return copy;
}

async function request(action, payload = {}) {
  const qsPayload = Object.assign({ action, _t: Date.now() }, encodePayload(payload));
  if (TOKEN) qsPayload.token = TOKEN;
  const qs = new URLSearchParams(qsPayload);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${GAS_URL}?${qs.toString()}`, { redirect: 'follow', signal: controller.signal });
    const text = await res.text();
    let body;
    try {
      body = JSON.parse(text);
    } catch (_) {
      throw new Error(`${action}: non-JSON response (${res.status}) ${text.slice(0, 160)}`);
    }
    return { status: res.status, body };
  } finally {
    clearTimeout(timer);
  }
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

function okBase(body) {
  return body && body.success !== false && body.status !== 'error';
}

function selectInventoryItemId(items) {
  for (const item of items || []) {
    const id = firstValue(item, ['item_id', 'Item_ID', 'itemId', 'sku', 'SKU', 'code', 'item_code', 'id']);
    if (id) return id;
  }
  return '';
}

function selectWarrantyJobId(warranties) {
  for (const warranty of warranties || []) {
    const id = firstValue(warranty, ['job_id', 'Job_ID', 'jobId', 'job.ID', 'job.id']);
    if (id) return id;
  }
  return '';
}

function summarize(action, body) {
  if (!body || typeof body !== 'object') return {};
  if (action === 'inventoryOverview') {
    const items = rowsFor(body, ['items', 'data.items', 'data', 'rows', 'stock', 'inventory', 'lowStock']);
    return {
      count: items.length,
      hasOverview: !!(body.overview || body.summary || (body.data && (body.data.overview || body.data.summary))),
      selectedItemId: selectInventoryItemId(items),
    };
  }
  if (action === 'getInventoryItemDetail') {
    return { hasDetail: !!(body.item || body.data || body.record), success: body.success };
  }
  if (action === 'listPurchaseOrders') {
    const orders = rowsFor(body, ['items', 'purchaseOrders', 'orders', 'data.items', 'data', 'rows']);
    return { count: orders.length, firstPoId: firstValue(orders[0] || {}, ['po_id', 'PO_ID', 'poNo', 'po_number', 'id']) };
  }
  if (action === 'listWarranties') {
    const warranties = rowsFor(body, ['warranties', 'items', 'data.warranties', 'data.items', 'data', 'rows']);
    return { count: warranties.length, selectedJobId: selectWarrantyJobId(warranties) };
  }
  if (action === 'getWarrantyByJobId') {
    return { hasWarranty: !!(body.warranty || body.data || body.record), success: body.success };
  }
  if (action === 'getWarrantyDue') {
    const rows = rowsFor(body, ['warranties', 'items', 'data.warranties', 'data.items', 'data', 'rows']);
    return { count: rows.length };
  }
  if (action === 'getSecurityStatus') {
    return { status: body.status || body.security_status || '', success: body.success };
  }
  if (action === 'listUsers') {
    const users = rowsFor(body, ['users', 'items', 'data.users', 'data.items', 'data', 'rows']);
    return { count: users.length };
  }
  if (action === 'getDataRepairStatus') {
    return { status: body.status || '', hasPlan: !!(body.plan || (body.data && body.data.plan)) };
  }
  if (action === 'previewDataRepair') {
    return { dryRun: body.dryRun, preview: !!(body.preview || body.plan || body.data), success: body.success };
  }
  return { status: body.status || '', success: body.success };
}

function record(report, row) {
  report.results.push(row);
  console.log(`[${row.menu.padEnd(14)}] ${row.action}: ${row.status_label} ${row.http_status || 0} ${row.elapsed_ms || 0}ms${row.error ? ' - ' + row.error : ''}`);
}

async function runAction(report, menu, action, payload, verifier, options = {}) {
  const started = Date.now();
  try {
    const result = await request(action, payload);
    const ok = result.status === 200 && okBase(result.body) && (!verifier || verifier(result.body));
    const error = ok ? '' : (result.body && (result.body.error || result.body.message || result.body.status || result.body.code)) || 'unexpected response';
    const row = {
      menu,
      action,
      ok: ok || !!options.optional,
      optional: !!options.optional,
      status_label: ok ? 'OK' : options.optional ? 'OPTIONAL' : classify(error, result.status),
      http_status: result.status,
      elapsed_ms: Date.now() - started,
      error,
      payload_hint: options.payloadHint || '',
      summary: summarize(action, result.body),
    };
    record(report, row);
    return ok ? result.body : null;
  } catch (err) {
    const row = {
      menu,
      action,
      ok: !!options.optional,
      optional: !!options.optional,
      status_label: options.optional ? 'OPTIONAL' : classify(err.message, 0),
      http_status: 0,
      elapsed_ms: Date.now() - started,
      error: err.message,
      payload_hint: options.payloadHint || '',
      summary: {},
    };
    record(report, row);
    return null;
  }
}

function writeReport(report) {
  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2) + '\n', 'utf8');
  console.log(`[Sprint 133 Support/Admin Live QA] report: ${path.relative(ROOT, REPORT_PATH).replace(/\\/g, '/')}`);
}

async function main() {
  const report = {
    generated_at: new Date().toISOString(),
    gas_url: GAS_URL,
    token_present: !!TOKEN,
    mode: TOKEN ? 'protected-read-only-support-admin' : 'skip-safe',
    chain: ['Inventory', 'Purchase Orders', 'Warranty', 'Admin Settings'],
    results: [],
  };

  if (!TOKEN) {
    record(report, {
      menu: 'safety',
      action: 'support-admin-live-qa-gate',
      ok: true,
      status_label: 'SKIP',
      http_status: 0,
      elapsed_ms: 0,
      error: 'set COMPHONE_AUTH_TOKEN to run protected Inventory -> PO -> Warranty -> Admin Settings live QA',
      summary: {},
    });
    writeReport(report);
    console.log('[Sprint 133 Support/Admin Live QA] OK (protected checks skipped safely)');
    return;
  }

  const inventoryBody = await runAction(
    report,
    'Inventory',
    'inventoryOverview',
    {},
    body => rowsFor(body, ['items', 'data.items', 'data', 'rows', 'stock', 'inventory', 'lowStock']).length >= 0 ||
      !!(body.overview || body.summary || (body.data && (body.data.overview || body.data.summary)))
  );
  const inventoryItems = rowsFor(inventoryBody || {}, ['items', 'data.items', 'data', 'rows', 'stock', 'inventory', 'lowStock']);
  const itemId = selectInventoryItemId(inventoryItems);
  if (itemId) {
    await runAction(
      report,
      'Inventory',
      'getInventoryItemDetail',
      { item_code: itemId },
      body => body && body.success !== false,
      { optional: true, payloadHint: 'item_code selected from inventoryOverview; read-only detail' }
    );
  } else {
    record(report, {
      menu: 'Inventory',
      action: 'getInventoryItemDetail',
      ok: true,
      optional: true,
      status_label: 'OPTIONAL',
      http_status: 0,
      elapsed_ms: 0,
      error: 'No live inventory item id returned by inventoryOverview; detail skipped without creating data',
      summary: {},
    });
  }

  await runAction(
    report,
    'Purchase Order',
    'listPurchaseOrders',
    { limit: 25 },
    body => rowsFor(body, ['items', 'purchaseOrders', 'orders', 'data.items', 'data', 'rows']).length >= 0
  );

  const warrantiesBody = await runAction(
    report,
    'Warranty',
    'listWarranties',
    { limit: 25 },
    body => rowsFor(body, ['warranties', 'items', 'data.warranties', 'data.items', 'data', 'rows']).length >= 0
  );
  const warranties = rowsFor(warrantiesBody || {}, ['warranties', 'items', 'data.warranties', 'data.items', 'data', 'rows']);
  const warrantyJobId = selectWarrantyJobId(warranties);
  if (warrantyJobId) {
    await runAction(
      report,
      'Warranty',
      'getWarrantyByJobId',
      { job_id: warrantyJobId },
      body => body && body.success !== false,
      { optional: true, payloadHint: 'job id selected from listWarranties; read-only detail' }
    );
  } else {
    record(report, {
      menu: 'Warranty',
      action: 'getWarrantyByJobId',
      ok: true,
      optional: true,
      status_label: 'OPTIONAL',
      http_status: 0,
      elapsed_ms: 0,
      error: 'No Job_ID returned by listWarranties; warranty detail skipped without mutation',
      summary: {},
    });
  }
  await runAction(
    report,
    'Warranty',
    'getWarrantyDue',
    { days: 30, limit: 25 },
    body => body && body.success !== false,
    { optional: true, payloadHint: 'read-only due list' }
  );

  await runAction(report, 'Admin Settings', 'getSecurityStatus', {}, body => body && body.success !== false);
  await runAction(
    report,
    'Admin Settings',
    'listUsers',
    { limit: 25 },
    body => body && body.success !== false && rowsFor(body, ['users', 'items', 'data.users', 'data.items', 'data', 'rows']).length >= 0
  );
  await runAction(report, 'Admin Settings', 'getDataRepairStatus', {}, body => body && body.success !== false);
  await runAction(
    report,
    'Admin Settings',
    'previewDataRepair',
    { period: 'month' },
    body => body && body.success !== false,
    { payloadHint: 'preview only; no repair execution' }
  );

  writeReport(report);
  const failures = report.results.filter(row => !row.ok);
  if (failures.length) {
    console.error('[Sprint 133 Support/Admin Live QA] FAILED');
    process.exit(1);
  }
  console.log('[Sprint 133 Support/Admin Live QA] OK');
}

main().catch(err => {
  console.error('[Sprint 133 Support/Admin Live QA] FAILED');
  console.error(err);
  process.exit(1);
});
