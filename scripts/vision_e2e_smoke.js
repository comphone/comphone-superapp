const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const gasConfig = fs.readFileSync(path.join(ROOT, 'pwa', 'gas_config.js'), 'utf8');
const urlMatch = gasConfig.match(/url:\s*'([^']+)'/);
const GAS_URL = process.env.COMPHONE_GAS_URL || (urlMatch && urlMatch[1]);
const TOKEN = process.env.COMPHONE_AUTH_TOKEN || '';
const ENABLED = process.env.COMPHONE_VISION_E2E === '1';
const CONFIRM = process.env.COMPHONE_VISION_E2E_CONFIRM === 'RUN_VISION_ANALYSIS';
const REPORT_PATH = process.env.COMPHONE_VISION_E2E_REPORT ||
  path.join(ROOT, 'test_reports', 'vision_e2e_smoke_latest.json');

// 1x1 PNG. This is intentionally tiny: the smoke validates the protected route,
// request contract, logging/review surfaces, and error handling without pretending
// to be a real field-photo quality test.
const SAMPLE_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=';

if (!GAS_URL) {
  console.error('[Vision E2E Smoke] Missing GAS URL. Set COMPHONE_GAS_URL or update pwa/gas_config.js.');
  process.exit(1);
}

async function request(action, payload = {}) {
  const qs = new URLSearchParams(Object.assign({ action, _t: Date.now() }, payload));
  const res = await fetch(`${GAS_URL}?${qs.toString()}`, { redirect: 'follow' });
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); }
  catch (_) { throw new Error(`${action}: non-JSON response (${res.status}) ${text.slice(0, 120)}`); }
  return { status: res.status, body };
}

async function run() {
  const report = {
    generated_at: new Date().toISOString(),
    gas_url: GAS_URL,
    token_present: !!TOKEN,
    enabled: ENABLED,
    confirmed: CONFIRM,
    mode: 'gated-vision-analysis',
    results: [],
  };

  function record(row) {
    report.results.push(row);
    console.log(`[${row.scope.padEnd(10)}] ${row.action}: ${row.status_label} ${row.http_status || ''} ${row.elapsed_ms || 0}ms${row.error ? ' - ' + row.error : ''}`);
  }

  if (!TOKEN || !ENABLED || !CONFIRM) {
    record({
      scope: 'safety',
      action: 'vision-e2e-gate',
      ok: true,
      status_label: 'SKIP',
      http_status: 0,
      elapsed_ms: 0,
      error: 'set COMPHONE_AUTH_TOKEN, COMPHONE_VISION_E2E=1, COMPHONE_VISION_E2E_CONFIRM=RUN_VISION_ANALYSIS',
    });
  } else {
    const started = Date.now();
    const result = await request('runVisionPipeline', {
      token: TOKEN,
      type: 'QC',
      base64: SAMPLE_PNG_BASE64,
      mimeType: 'image/png',
      fileName: 'vision-e2e-smoke.png',
      source: 'vision_e2e_smoke',
    });
    const ok = result.status === 200 && result.body && result.body.type === 'QC' && result.body.decision;
    record({
      scope: 'protected',
      action: 'runVisionPipeline',
      ok,
      status_label: ok ? 'OK' : 'FAIL',
      http_status: result.status,
      elapsed_ms: Date.now() - started,
      error: ok ? '' : (result.body && (result.body.error || result.body._error || result.body.message)) || 'unexpected response',
      summary: {
        type: result.body && result.body.type,
        decision: result.body && result.body.decision && result.body.decision.code,
        confidence: result.body && result.body.confidence,
        visionLogId: result.body && result.body.visionLogId,
      },
    });
  }

  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2) + '\n', 'utf8');
  console.log(`[Vision E2E Smoke] report: ${path.relative(ROOT, REPORT_PATH).replace(/\\/g, '/')}`);

  const failures = report.results.filter(row => !row.ok);
  if (failures.length) {
    console.error('[Vision E2E Smoke] FAILED');
    failures.forEach(row => console.error(`- ${row.action}: ${row.error}`));
    process.exit(1);
  }
  console.log('[Vision E2E Smoke] OK');
}

run().catch(err => {
  console.error('[Vision E2E Smoke] FAILED');
  console.error(err);
  process.exit(1);
});
