import fs from 'node:fs/promises';

const packageJson = JSON.parse(
  await fs.readFile(new URL('../package.json', import.meta.url), 'utf8')
);
const baseUrl = (process.env.LINE_WORKER_URL ||
  'https://comphone-line-webhook.narinoutagit.workers.dev').replace(/\/$/, '');

const checks = [];
function check(name, condition, detail = '') {
  checks.push({ name, ok: Boolean(condition), detail });
}

async function readJson(response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text.slice(0, 300) };
  }
}

try {
  const healthResponse = await fetch(`${baseUrl}/health`, {
    headers: { 'cache-control': 'no-cache' }
  });
  const health = await readJson(healthResponse);
  check('health-http-200', healthResponse.status === 200, String(healthResponse.status));
  check('health-status-ok', health.status === 'ok', String(health.status || ''));
  check('deployed-version-current', health.version === packageJson.version,
    `expected=${packageJson.version} actual=${health.version || 'missing'}`);
  check('signed-raw-mode-reported',
    health.signature_mode === 'worker-and-gas' || health.signature_mode === 'gas-final-validation',
    String(health.signature_mode || 'missing'));

  const unsignedResponse = await fetch(`${baseUrl}/line/webhook`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ events: [] })
  });
  const unsigned = await readJson(unsignedResponse);
  check('unsigned-webhook-rejected', unsignedResponse.status === 401, String(unsignedResponse.status));
  check('unsigned-error-is-explicit', /missing line signature/i.test(unsigned.error || ''),
    String(unsigned.error || ''));

  const diagnosticResponse = await fetch(`${baseUrl}/diag/gas`, {
    headers: { 'cache-control': 'no-cache' }
  });
  const diagnostic = await readJson(diagnosticResponse);
  check('gas-diagnostic-http-200', diagnosticResponse.status === 200, String(diagnosticResponse.status));
  check('gas-diagnostic-success', diagnostic.success === true && diagnostic.gas_ok === true,
    JSON.stringify({ success: diagnostic.success, gas_ok: diagnostic.gas_ok }));
  check('diagnostic-version-current', diagnostic.worker_version === packageJson.version,
    `expected=${packageJson.version} actual=${diagnostic.worker_version || 'missing'}`);
} catch (error) {
  check('production-request-completed', false, error instanceof Error ? error.message : String(error));
}

const failed = checks.filter(item => !item.ok);
console.log(JSON.stringify({
  service: 'COMPHONE LINE Webhook Worker',
  endpoint: baseUrl,
  expected_version: packageJson.version,
  passed: checks.length - failed.length,
  total: checks.length,
  status: failed.length ? 'FAILED' : 'OK',
  checks
}, null, 2));

if (failed.length) process.exitCode = 1;
