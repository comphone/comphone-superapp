const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const API_CONTRACT = require(path.join(ROOT, 'pwa', 'api_contract.js'));
const gasConfig = fs.readFileSync(path.join(ROOT, 'pwa', 'gas_config.js'), 'utf8');
const urlMatch = gasConfig.match(/url:\s*'([^']+)'/);
const GAS_URL = process.env.COMPHONE_GAS_URL || (urlMatch && urlMatch[1]);
const TOKEN = process.env.COMPHONE_AUTH_TOKEN || '';
const INCLUDE_OPTIONAL = process.env.COMPHONE_SMOKE_OPTIONAL === '1' || process.env.COMPHONE_SMOKE_OPTIONAL === 'true';
const REPORT_PATH = process.env.COMPHONE_SMOKE_REPORT || path.join(ROOT, 'test_reports', 'pwa_api_smoke_latest.json');

if (!GAS_URL) {
  console.error('[PWA API Smoke] Missing GAS URL. Set COMPHONE_GAS_URL or update pwa/gas_config.js.');
  process.exit(1);
}

const publicActions = API_CONTRACT.publicActions;
const protectedActions = API_CONTRACT.protectedActions.filter(item => item.required || INCLUDE_OPTIONAL);

function classify(error, status) {
  const raw = String(error || '').toUpperCase();
  if (status === 401 || /AUTH|TOKEN|SESSION|LOGIN|401/.test(raw)) return 'AUTH_FAIL';
  if (status === 403 || /PERMISSION|FORBIDDEN|DENIED|ROLE|ADMIN ACCESS|403/.test(raw)) return 'PERMISSION';
  if (/NOT_FOUND|UNKNOWN ACTION|NO_HANDLER|FUNCTION NOT FOUND|ACTION/.test(raw)) return 'CONTRACT';
  if (/TIMEOUT|ABORT/.test(raw)) return 'TIMEOUT';
  if (/NETWORK|FAILED TO FETCH|LOAD FAILED|OFFLINE/.test(raw)) return 'NETWORK';
  return 'BACKEND';
}

function sanitizePayload(payload) {
  const copy = Object.assign({}, payload || {});
  Object.keys(copy).forEach(key => {
    if (copy[key] === '__SMOKE_EMPTY__') copy[key] = '';
  });
  return copy;
}

async function request(action, payload = {}) {
  const qs = new URLSearchParams(Object.assign({ action, _t: Date.now() }, payload));
  const res = await fetch(`${GAS_URL}?${qs.toString()}`, { redirect: 'follow' });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch (_) {
    throw new Error(`${action}: non-JSON response (${res.status}) ${text.slice(0, 120)}`);
  }
  return { status: res.status, body };
}

async function run() {
  const failures = [];
  const report = {
    generated_at: new Date().toISOString(),
    gas_url: GAS_URL,
    contract_version: API_CONTRACT.version,
    token_present: !!TOKEN,
    include_optional: INCLUDE_OPTIONAL,
    results: [],
  };

  function record(row) {
    report.results.push(row);
    const scope = row.scope.padEnd(9);
    const menu = (row.menu || '-').padEnd(10);
    console.log(`[${scope}] ${menu} ${row.action}: ${row.status_label} ${row.http_status || ''} ${row.elapsed_ms}ms${row.error ? ' - ' + row.error : ''}`);
  }

  for (const item of publicActions) {
    const action = item.action;
    const started = Date.now();
    try {
      const result = await request(action, sanitizePayload(item.payload));
      const ok = result.status === 200 && (
        result.body.status === 'healthy' ||
        result.body.success === true
      );
      const error = ok ? '' : (result.body && (result.body.error || result.body.message || result.body.status)) || 'unexpected response';
      const statusLabel = ok ? 'OK' : classify(error, result.status);
      record({
        scope: 'public',
        menu: item.menu || 'System',
        action,
        required: true,
        optional: false,
        ok,
        status_label: statusLabel,
        http_status: result.status,
        elapsed_ms: Date.now() - started,
        error,
      });
      if (!ok) failures.push(`${action}: ${statusLabel} ${error}`);
    } catch (err) {
      record({
        scope: 'public',
        menu: item.menu || 'System',
        action,
        required: true,
        optional: false,
        ok: false,
        status_label: classify(err.message),
        http_status: 0,
        elapsed_ms: Date.now() - started,
        error: err.message,
      });
      failures.push(err.message);
    }
  }

  if (!TOKEN) {
    console.log('[protected] skipped: set COMPHONE_AUTH_TOKEN to smoke-test menu data actions.');
  } else {
    for (const item of protectedActions) {
      const started = Date.now();
      try {
        const payload = Object.assign(sanitizePayload(item.payload), { token: TOKEN });
        const result = await request(item.action, payload);
        const ok = result.status === 200 && result.body && result.body.success !== false;
        const error = ok ? '' : (result.body && (result.body.error || result.body.message || result.body.status)) || 'unexpected response';
        const statusLabel = ok ? 'OK' : classify(error, result.status);
        record({
          scope: 'protected',
          menu: item.menu,
          action: item.action,
          required: !!item.required,
          optional: !!item.optional || !item.required,
          ok,
          status_label: statusLabel,
          http_status: result.status,
          elapsed_ms: Date.now() - started,
          error,
          code: result.body && result.body.code,
          kind: result.body && result.body.kind,
          request_id: result.body && result.body.request_id,
        });
        if (!ok && item.required) failures.push(`${item.menu}/${item.action}: ${statusLabel} ${error}`);
      } catch (err) {
        const statusLabel = classify(err.message);
        record({
          scope: 'protected',
          menu: item.menu,
          action: item.action,
          required: !!item.required,
          optional: !!item.optional || !item.required,
          ok: false,
          status_label: statusLabel,
          http_status: 0,
          elapsed_ms: Date.now() - started,
          error: err.message,
        });
        if (item.required) failures.push(`${item.menu}/${item.action}: ${statusLabel} ${err.message}`);
      }
    }
  }

  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2) + '\n', 'utf8');
  console.log(`[PWA API Smoke] report: ${path.relative(ROOT, REPORT_PATH).replace(/\\/g, '/')}`);

  if (failures.length) {
    console.error('[PWA API Smoke] FAILED');
    for (const item of failures) console.error(`- ${item}`);
    process.exit(1);
  }

  console.log('[PWA API Smoke] OK');
}

run().catch(err => {
  console.error('[PWA API Smoke] FAILED');
  console.error(err);
  process.exit(1);
});
