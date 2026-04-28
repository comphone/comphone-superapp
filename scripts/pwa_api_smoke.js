const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const API_CONTRACT = require(path.join(ROOT, 'pwa', 'api_contract.js'));
const gasConfig = fs.readFileSync(path.join(ROOT, 'pwa', 'gas_config.js'), 'utf8');
const urlMatch = gasConfig.match(/url:\s*'([^']+)'/);
const GAS_URL = process.env.COMPHONE_GAS_URL || (urlMatch && urlMatch[1]);
const TOKEN = process.env.COMPHONE_AUTH_TOKEN || '';

if (!GAS_URL) {
  console.error('[PWA API Smoke] Missing GAS URL. Set COMPHONE_GAS_URL or update pwa/gas_config.js.');
  process.exit(1);
}

const publicActions = API_CONTRACT.publicActions.map(item => item.action);
const protectedActions = API_CONTRACT.protectedActions.filter(item => item.required);

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

  for (const action of publicActions) {
    try {
      const result = await request(action);
      const ok = result.status === 200 && (
        result.body.status === 'healthy' ||
        result.body.success === true
      );
      console.log(`[public] ${action}: ${ok ? 'OK' : 'FAIL'} ${result.status}`);
      if (!ok) failures.push(`${action} returned unexpected body`);
    } catch (err) {
      console.log(`[public] ${item.action}: FAIL ${err.message}`);
      failures.push(err.message);
    }
  }

  if (!TOKEN) {
    console.log('[protected] skipped: set COMPHONE_AUTH_TOKEN to smoke-test menu data actions.');
  } else {
    for (const item of protectedActions) {
      try {
        const payload = Object.assign({}, item.payload || {}, { token: TOKEN });
        Object.keys(payload).forEach(key => {
          if (payload[key] === '__SMOKE_EMPTY__') payload[key] = '';
        });
        const result = await request(item.action, payload);
        const ok = result.status === 200 && result.body && result.body.success !== false;
        console.log(`[protected] ${item.menu}/${item.action}: ${ok ? 'OK' : 'FAIL'} ${result.status}`);
        if (!ok) failures.push(`${item.menu}/${item.action}: ${result.body && (result.body.error || result.body.message) || 'unexpected response'}`);
      } catch (err) {
        console.log(`[protected] ${action}: FAIL ${err.message}`);
        failures.push(err.message);
      }
    }
  }

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
