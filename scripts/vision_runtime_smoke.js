const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const gasConfig = fs.readFileSync(path.join(ROOT, 'pwa', 'gas_config.js'), 'utf8');
const urlMatch = gasConfig.match(/url:\s*'([^']+)'/);
const GAS_URL = process.env.COMPHONE_GAS_URL || (urlMatch && urlMatch[1]);
const TOKEN = process.env.COMPHONE_AUTH_TOKEN || '';
const REPORT_PATH = process.env.COMPHONE_VISION_RUNTIME_REPORT ||
  path.join(ROOT, 'test_reports', 'vision_runtime_smoke_latest.json');

if (!GAS_URL) {
  console.error('[Vision Runtime Smoke] Missing GAS URL. Set COMPHONE_GAS_URL or update pwa/gas_config.js.');
  process.exit(1);
}

const PUBLIC_STEPS = [
  {
    action: 'health',
    label: 'GAS health + AI config',
    validate: body => body && body.success !== false &&
      (!body.checks || !body.checks.config || body.checks.config.gemini_ok === true),
  },
  { action: 'getVersion', label: 'Backend version' },
];

const PROTECTED_STEPS = [
  {
    action: 'getVisionDashboardStats',
    label: 'Vision dashboard stats',
    payload: { days: 7 },
    validate: body => body && body.success !== false && !!body.stats,
  },
  {
    action: 'getVisionPipelineVersion',
    label: 'Vision pipeline version',
    validate: body => body && body.success !== false,
  },
  {
    action: 'getVisionLearningVersion',
    label: 'Vision learning version',
    validate: body => body && body.success !== false,
  },
  {
    action: 'getVisionFieldContext',
    label: 'Vision field job context',
    payload: { timelineLimit: 3 },
    validate: body => body && body.success !== false && Object.prototype.hasOwnProperty.call(body, 'context_available'),
  },
  {
    action: 'getVisionReviewQueue',
    label: 'Vision human review queue',
    payload: { limit: 5, days: 30 },
    validate: body => body && body.success !== false && Array.isArray(body.queue),
  },
];

function classify(error, status) {
  const raw = String(error || '').toUpperCase();
  if (status === 401 || /AUTH|TOKEN|SESSION|LOGIN|401/.test(raw)) return 'AUTH_FAIL';
  if (status === 403 || /PERMISSION|FORBIDDEN|DENIED|ROLE|ADMIN ACCESS|403/.test(raw)) return 'PERMISSION';
  if (/NOT_FOUND|UNKNOWN ACTION|NO_HANDLER|FUNCTION NOT FOUND|ACTION/.test(raw)) return 'CONTRACT';
  if (/TIMEOUT|ABORT/.test(raw)) return 'TIMEOUT';
  if (/NETWORK|FAILED TO FETCH|LOAD FAILED|OFFLINE/.test(raw)) return 'NETWORK';
  return 'BACKEND';
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

function summarize(body) {
  if (!body || typeof body !== 'object') return {};
  if (body.checks && body.checks.config) {
    return {
      status: body.status || '',
      version: body.version || '',
      gemini_ok: body.checks.config.gemini_ok === true,
      line_ok: body.checks.config.line_ok === true,
      missing: body.checks.config.missing || [],
    };
  }
  const stats = body.stats || (body.data && body.data.stats);
  if (stats) {
    return {
      total: stats.total || 0,
      approved: stats.approved || 0,
      needReview: stats.needReview || 0,
      failed: stats.failed || 0,
      avgConfidence: stats.avgConfidence || '0',
    };
  }
  if (Array.isArray(body.queue)) {
    return {
      queueCount: body.count || body.queue.length,
      sample: body.queue.slice(0, 3).map(item => ({
        visionLogId: item.visionLogId,
        type: item.type,
        decision: item.decision,
        confidence: item.confidence,
      })),
    };
  }
  if (Object.prototype.hasOwnProperty.call(body, 'context_available')) {
    return {
      context_available: body.context_available === true,
      job_id: body.job_id || '',
      timeline_count: body.timeline_count || 0,
    };
  }
  return {
    version: body.version || body.pipeline_version || body.learning_version || (body.data && body.data.version) || '',
    status: body.status || '',
  };
}

async function runStep(scope, step, report) {
  const started = Date.now();
  try {
    const payload = Object.assign({}, step.payload || {});
    if (scope === 'protected') payload.token = TOKEN;
    const result = await request(step.action, payload);
    const ok = result.status === 200 && (step.validate ? step.validate(result.body) : result.body && result.body.success !== false);
    const error = ok ? '' : (result.body && (result.body.error || result.body.message || result.body.status)) || 'unexpected response';
    const row = {
      scope,
      action: step.action,
      label: step.label,
      ok,
      status_label: ok ? 'OK' : classify(error, result.status),
      http_status: result.status,
      elapsed_ms: Date.now() - started,
      error,
      summary: summarize(result.body),
    };
    report.results.push(row);
    console.log(`[${scope.padEnd(9)}] ${step.action}: ${row.status_label} ${row.http_status} ${row.elapsed_ms}ms${error ? ' - ' + error : ''}`);
    return row;
  } catch (err) {
    const row = {
      scope,
      action: step.action,
      label: step.label,
      ok: false,
      status_label: classify(err.message),
      http_status: 0,
      elapsed_ms: Date.now() - started,
      error: err.message,
      summary: {},
    };
    report.results.push(row);
    console.log(`[${scope.padEnd(9)}] ${step.action}: ${row.status_label} 0 ${row.elapsed_ms}ms - ${err.message}`);
    return row;
  }
}

async function run() {
  const report = {
    generated_at: new Date().toISOString(),
    gas_url: GAS_URL,
    token_present: !!TOKEN,
    mode: 'read-only',
    results: [],
  };
  const failures = [];

  for (const step of PUBLIC_STEPS) {
    const row = await runStep('public', step, report);
    if (!row.ok) failures.push(`${step.action}: ${row.status_label} ${row.error}`);
  }

  if (!TOKEN) {
    const row = {
      scope: 'protected',
      action: 'vision-read-suite',
      label: 'Vision protected read suite',
      ok: true,
      status_label: 'SKIP',
      http_status: 0,
      elapsed_ms: 0,
      error: 'COMPHONE_AUTH_TOKEN is not set',
      summary: {},
    };
    report.results.push(row);
    console.log('[protected] vision-read-suite: SKIP 0 0ms - COMPHONE_AUTH_TOKEN is not set');
  } else {
    for (const step of PROTECTED_STEPS) {
      const row = await runStep('protected', step, report);
      if (!row.ok) failures.push(`${step.action}: ${row.status_label} ${row.error}`);
    }
  }

  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2) + '\n', 'utf8');
  console.log(`[Vision Runtime Smoke] report: ${path.relative(ROOT, REPORT_PATH).replace(/\\/g, '/')}`);

  if (failures.length) {
    console.error('[Vision Runtime Smoke] FAILED');
    failures.forEach(item => console.error(`- ${item}`));
    process.exit(1);
  }

  console.log('[Vision Runtime Smoke] OK');
}

run().catch(err => {
  console.error('[Vision Runtime Smoke] FAILED');
  console.error(err);
  process.exit(1);
});
