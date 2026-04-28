const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const gasConfig = fs.readFileSync(path.join(ROOT, 'pwa', 'gas_config.js'), 'utf8');
const urlMatch = gasConfig.match(/url:\s*'([^']+)'/);
const GAS_URL = process.env.COMPHONE_GAS_URL || (urlMatch && urlMatch[1]);
const TOKEN = process.env.COMPHONE_AUTH_TOKEN || '';

if (!GAS_URL) {
  console.error('[PWA API Smoke] Missing GAS URL. Set COMPHONE_GAS_URL or update pwa/gas_config.js.');
  process.exit(1);
}

const publicActions = [
  { action: 'health', expect: body => body.status === 'healthy' || body.success === true },
  { action: 'getVersion', expect: body => body.success === true && !!body.version },
];

const protectedActions = [
  'getDashboardData',
  'listCustomers',
  'inventoryOverview',
  'listPurchaseOrders',
  'getReportData',
];

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

  for (const item of publicActions) {
    try {
      const result = await request(item.action);
      const ok = result.status === 200 && item.expect(result.body);
      console.log(`[public] ${item.action}: ${ok ? 'OK' : 'FAIL'} ${result.status}`);
      if (!ok) failures.push(`${item.action} returned unexpected body`);
    } catch (err) {
      console.log(`[public] ${item.action}: FAIL ${err.message}`);
      failures.push(err.message);
    }
  }

  if (!TOKEN) {
    console.log('[protected] skipped: set COMPHONE_AUTH_TOKEN to smoke-test menu data actions.');
  } else {
    for (const action of protectedActions) {
      try {
        const result = await request(action, { token: TOKEN });
        const ok = result.status === 200 && result.body && result.body.success !== false;
        console.log(`[protected] ${action}: ${ok ? 'OK' : 'FAIL'} ${result.status}`);
        if (!ok) failures.push(`${action}: ${result.body && (result.body.error || result.body.message) || 'unexpected response'}`);
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
