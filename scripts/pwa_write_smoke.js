const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const gasConfig = fs.readFileSync(path.join(ROOT, 'pwa', 'gas_config.js'), 'utf8');
const urlMatch = gasConfig.match(/url:\s*'([^']+)'/);
const GAS_URL = process.env.COMPHONE_GAS_URL || (urlMatch && urlMatch[1]);
const TOKEN = process.env.COMPHONE_AUTH_TOKEN || '';
const ENABLED = process.env.COMPHONE_WRITE_SMOKE === '1' || process.env.COMPHONE_WRITE_SMOKE === 'true';
const CONFIRM = process.env.COMPHONE_WRITE_SMOKE_CONFIRM === 'CREATE_TEST_RECORDS';
const REPORT_PATH = process.env.COMPHONE_WRITE_SMOKE_REPORT || path.join(ROOT, 'test_reports', 'pwa_write_smoke_latest.json');

if (!GAS_URL) {
  console.error('[PWA Write Smoke] Missing GAS URL. Set COMPHONE_GAS_URL or update pwa/gas_config.js.');
  process.exit(1);
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

async function request(action, payload = {}) {
  const qsPayload = Object.assign({ action, _t: Date.now() }, payload);
  if (TOKEN) qsPayload.token = TOKEN;
  const qs = new URLSearchParams(qsPayload);
  const res = await fetch(`${GAS_URL}?${qs.toString()}`, { redirect: 'follow' });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch (_) {
    throw new Error(`${action}: non-JSON response (${res.status}) ${text.slice(0, 160)}`);
  }
  return { status: res.status, body };
}

function makeId(prefix) {
  return [
    prefix,
    new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14),
    Math.random().toString(36).slice(2, 8)
  ].join('_');
}

function writeReport(report) {
  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2) + '\n', 'utf8');
  console.log(`[PWA Write Smoke] report: ${path.relative(ROOT, REPORT_PATH).replace(/\\/g, '/')}`);
}

function record(report, row) {
  report.results.push(row);
  console.log(`[${row.phase.padEnd(12)}] ${row.action}: ${row.status_label} ${row.http_status || ''} ${row.elapsed_ms || 0}ms${row.error ? ' - ' + row.error : ''}`);
}

async function runAction(report, phase, action, payload, verifier) {
  const started = Date.now();
  try {
    const result = await request(action, payload);
    const ok = result.status === 200 && result.body && result.body.success !== false && (!verifier || verifier(result.body));
    const error = ok ? '' : (result.body && (result.body.error || result.body.message || result.body.status)) || 'unexpected response';
    const row = {
      phase,
      action,
      ok,
      status_label: ok ? 'OK' : classify(error, result.status),
      http_status: result.status,
      elapsed_ms: Date.now() - started,
      error,
      response_id: result.body && (result.body.job_id || result.body.customer_id || (result.body.billing && result.body.billing.billing_id)),
      idempotent_replay: !!(result.body && result.body.idempotent_replay),
      request_id: result.body && (result.body.request_id || (result.body.meta && result.body.meta.request_id)),
    };
    record(report, row);
    return { row, body: result.body };
  } catch (err) {
    const row = {
      phase,
      action,
      ok: false,
      status_label: classify(err.message),
      http_status: 0,
      elapsed_ms: Date.now() - started,
      error: err.message,
    };
    record(report, row);
    return { row, body: null };
  }
}

async function run() {
  const smokeId = makeId('WSMOKE');
  const report = {
    generated_at: new Date().toISOString(),
    gas_url: GAS_URL,
    mode: ENABLED && CONFIRM ? 'write' : 'dry-run',
    token_present: !!TOKEN,
    confirmation_present: CONFIRM,
    smoke_id: smokeId,
    cleanup: 'manual: test records are tagged with smoke_id and source=pwa_write_smoke',
    results: [],
  };

  if (!ENABLED || !CONFIRM || !TOKEN) {
    const missing = [];
    if (!TOKEN) missing.push('COMPHONE_AUTH_TOKEN');
    if (!ENABLED) missing.push('COMPHONE_WRITE_SMOKE=1');
    if (!CONFIRM) missing.push('COMPHONE_WRITE_SMOKE_CONFIRM=CREATE_TEST_RECORDS');
    record(report, {
      phase: 'safety',
      action: 'write-smoke-gate',
      ok: true,
      status_label: 'SKIP',
      http_status: 0,
      elapsed_ms: 0,
      error: `write smoke skipped; set ${missing.join(', ')}`,
    });
    writeReport(report);
    console.log('[PWA Write Smoke] OK (dry-run skip)');
    return;
  }

  const customerRequestId = makeId('customer');
  const customerName = `COMPHONE WRITE SMOKE ${smokeId}`;
  const customerPayload = {
    client_request_id: customerRequestId,
    source: 'pwa_write_smoke',
    smoke_id: smokeId,
    customer_name: customerName,
    name: customerName,
    phone: '099' + String(Date.now()).slice(-7),
    customer_type: 'smoke-test',
    notes: `AUTO TEST ONLY ${smokeId}`,
  };

  const firstCustomer = await runAction(report, 'customer', 'createCustomer', customerPayload, body => !!body.customer_id);
  await runAction(report, 'customer', 'createCustomer', customerPayload, body => body.idempotent_replay === true || body.customer_id === (firstCustomer.body && firstCustomer.body.customer_id));

  const jobRequestId = makeId('job');
  const jobPayload = {
    client_request_id: jobRequestId,
    source: 'pwa_write_smoke',
    smoke_id: smokeId,
    customer_name: customerName,
    phone: customerPayload.phone,
    symptom: `AUTO WRITE SMOKE - DO NOT PROCESS ${smokeId}`,
    device: 'Smoke Test Device',
    note: `AUTO TEST ONLY ${smokeId}`,
    changed_by: 'PWA_WRITE_SMOKE',
  };

  const firstJob = await runAction(report, 'job', 'openJob', jobPayload, body => !!body.job_id);
  const jobId = firstJob.body && firstJob.body.job_id;
  await runAction(report, 'job', 'openJob', jobPayload, body => body.idempotent_replay === true || body.job_id === jobId);

  if (jobId) {
    const billingRequestId = makeId('billing');
    const billingPayload = {
      client_request_id: billingRequestId,
      source: 'pwa_write_smoke',
      smoke_id: smokeId,
      job_id: jobId,
      parts: { description: `Smoke part ${smokeId}`, cost: 1 },
      labor: { cost: 1, discount: 0, notes: `AUTO TEST ONLY ${smokeId}` },
    };
    const firstBilling = await runAction(report, 'billing', 'createBilling', billingPayload, body => !!(body.billing && body.billing.billing_id));
    await runAction(report, 'billing', 'createBilling', billingPayload, body => body.idempotent_replay === true || ((body.billing && body.billing.billing_id) === (firstBilling.body && firstBilling.body.billing && firstBilling.body.billing.billing_id)));
  } else {
    record(report, {
      phase: 'billing',
      action: 'createBilling',
      ok: false,
      status_label: 'SKIP',
      http_status: 0,
      elapsed_ms: 0,
      error: 'openJob did not return job_id',
    });
  }

  writeReport(report);
  const failures = report.results.filter(row => !row.ok);
  if (failures.length) {
    console.error('[PWA Write Smoke] FAILED');
    process.exit(1);
  }
  console.log('[PWA Write Smoke] OK');
}

run().catch(err => {
  console.error('[PWA Write Smoke] FAILED');
  console.error(err);
  process.exit(1);
});
