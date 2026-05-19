#!/usr/bin/env node
/*
 * Sprint 138 Backend Review Log Live QA
 *
 * Token-aware production QA for the Sprint 137 durable Data Completeness review
 * log. This script writes only owner-review metadata to DB_DATA_REVIEW_LOG and
 * audit context to DB_DATA_REPAIR_AUDIT. It must never execute data repair.
 *
 * CI-safe without COMPHONE_AUTH_TOKEN: writes a skipped report and exits OK.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const gasConfig = fs.readFileSync(path.join(ROOT, 'pwa', 'gas_config.js'), 'utf8');
const urlMatch = gasConfig.match(/url:\s*'([^']+)'/);
const GAS_URL = process.env.COMPHONE_GAS_URL || (urlMatch && urlMatch[1]);
const TOKEN = process.env.COMPHONE_AUTH_TOKEN || '';
const TIMEOUT_MS = Number(process.env.COMPHONE_REVIEW_LOG_QA_TIMEOUT_MS || 30000);
const REVIEW_KEY = process.env.COMPHONE_REVIEW_LOG_QA_KEY || 'sprint138-live-qa-review-log';
const REPORT_PATH = process.env.COMPHONE_REVIEW_LOG_QA_REPORT ||
  path.join(ROOT, 'test_reports', 'sprint138_backend_review_log_live_qa_latest.json');

if (!GAS_URL) {
  console.error('[Sprint 138 Backend Review Log Live QA] Missing GAS URL. Set COMPHONE_GAS_URL or update pwa/gas_config.js.');
  process.exit(1);
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
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${GAS_URL}?${new URLSearchParams(qsPayload).toString()}`, {
      redirect: 'follow',
      signal: controller.signal,
    });
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

function reviewCount(body) {
  if (!body || typeof body !== 'object' || !body.reviews || typeof body.reviews !== 'object') return 0;
  return Object.keys(body.reviews).length;
}

function summarize(action, body) {
  if (!body || typeof body !== 'object') return {};
  if (action === 'getDataReviewLog') {
    return {
      sheet: body.sheet,
      count: body.count || reviewCount(body),
      hasQaKey: !!(body.reviews && body.reviews[REVIEW_KEY]),
      qaStatus: body.reviews && body.reviews[REVIEW_KEY] && body.reviews[REVIEW_KEY].status,
    };
  }
  if (action === 'saveDataReviewLog') {
    return {
      sheet: body.sheet,
      findingKey: body.finding_key,
      row: body.row,
      status: body.status,
    };
  }
  if (action === 'previewDataRepair') {
    return {
      hasCandidates: Array.isArray(body.candidates) ? body.candidates.length : undefined,
      mode: body.mode || body.status,
    };
  }
  return { success: body.success, status: body.status };
}

function record(report, row) {
  report.results.push(row);
  console.log(`[${row.scope.padEnd(11)}] ${row.action}: ${row.status_label} ${row.http_status || 0} ${row.elapsed_ms || 0}ms${row.error ? ' - ' + row.error : ''}`);
}

async function runAction(report, scope, action, payload, verifier, options = {}) {
  const started = Date.now();
  try {
    const result = await request(action, payload);
    const body = result.body;
    const ok = result.status === 200 && body && body.success !== false && (!verifier || verifier(body));
    const error = ok ? '' : (body && (body.error || body.message || body.status || body.code)) || 'unexpected response';
    const row = {
      scope,
      action,
      ok: ok || !!options.optional,
      optional: !!options.optional,
      status_label: ok ? 'OK' : options.optional ? 'OPTIONAL' : classify(error, result.status),
      http_status: result.status,
      elapsed_ms: Date.now() - started,
      error,
      summary: summarize(action, body),
    };
    record(report, row);
    return ok ? body : null;
  } catch (err) {
    const row = {
      scope,
      action,
      ok: !!options.optional,
      optional: !!options.optional,
      status_label: options.optional ? 'OPTIONAL' : classify(err.message, 0),
      http_status: 0,
      elapsed_ms: Date.now() - started,
      error: err.message,
      summary: {},
    };
    record(report, row);
    return null;
  }
}

function writeReport(report) {
  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2) + '\n', 'utf8');
  console.log(`[Sprint 138 Backend Review Log Live QA] report: ${path.relative(ROOT, REPORT_PATH).replace(/\\/g, '/')}`);
}

async function main() {
  const report = {
    generated_at: new Date().toISOString(),
    gas_url: GAS_URL,
    token_present: !!TOKEN,
    review_key: REVIEW_KEY,
    mode: 'review-log-live-qa-no-repair-execution',
    results: [],
  };

  if (!TOKEN) {
    record(report, {
      scope: 'safety',
      action: 'backend-review-log-live-qa-gate',
      ok: true,
      status_label: 'SKIP',
      http_status: 0,
      elapsed_ms: 0,
      error: 'set COMPHONE_AUTH_TOKEN to run protected backend review-log live QA',
      summary: {},
    });
    writeReport(report);
    console.log('[Sprint 138 Backend Review Log Live QA] SKIP: token not present.');
    return;
  }

  await runAction(
    report,
    'read-before',
    'getDataReviewLog',
    {},
    body => body.sheet === 'DB_DATA_REVIEW_LOG' && body.reviews && typeof body.reviews === 'object'
  );

  await runAction(
    report,
    'write-meta',
    'saveDataReviewLog',
    {
      finding_key: REVIEW_KEY,
      area: 'Sprint 138 QA',
      status: 'reviewed',
      note: 'Sprint 138 protected live QA - review metadata only; no repair execution.',
      source: 'sprint138_backend_review_log_live_qa',
      operator: 'codex-live-qa',
    },
    body => body.sheet === 'DB_DATA_REVIEW_LOG' && body.finding_key === REVIEW_KEY && body.status === 'saved'
  );

  await runAction(
    report,
    'read-after',
    'getDataReviewLog',
    {},
    body => {
      const review = body.reviews && body.reviews[REVIEW_KEY];
      return body.sheet === 'DB_DATA_REVIEW_LOG' &&
        !!review &&
        review.status === 'reviewed' &&
        /no repair execution/i.test(String(review.note || ''));
    }
  );

  await runAction(
    report,
    'preview-only',
    'previewDataRepair',
    { period: 'month' },
    body => body.success !== false,
    { optional: true }
  );

  const failures = report.results.filter(row => !row.ok);
  report.status = failures.length ? 'fail' : 'ok';
  report.score = Math.round((report.results.filter(row => row.ok).length / report.results.length) * 100);
  writeReport(report);

  console.log(`[Sprint 138 Backend Review Log Live QA] status=${report.status} score=${report.score}/100 results=${report.results.filter(row => row.ok).length}/${report.results.length}`);
  if (failures.length) process.exit(1);
}

main().catch(err => {
  console.error('[Sprint 138 Backend Review Log Live QA] fatal:', err && err.stack ? err.stack : err);
  process.exit(1);
});
