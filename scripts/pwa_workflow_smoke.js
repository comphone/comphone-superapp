const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const API_CONTRACT = require(path.join(ROOT, 'pwa', 'api_contract.js'));
const gasConfig = fs.readFileSync(path.join(ROOT, 'pwa', 'gas_config.js'), 'utf8');
const urlMatch = gasConfig.match(/url:\s*'([^']+)'/);
const GAS_URL = process.env.COMPHONE_GAS_URL || (urlMatch && urlMatch[1]);
const TOKEN = process.env.COMPHONE_AUTH_TOKEN || '';
const REPORT_PATH = process.env.COMPHONE_WORKFLOW_REPORT || path.join(ROOT, 'test_reports', 'pwa_workflow_smoke_latest.json');

if (!GAS_URL) {
  console.error('[PWA Workflow Smoke] Missing GAS URL. Set COMPHONE_GAS_URL or update pwa/gas_config.js.');
  process.exit(1);
}

function classify(error, status) {
  const raw = String(error || '').toUpperCase();
  if (status === 401 || /AUTH|TOKEN|SESSION|LOGIN|401/.test(raw)) return 'AUTH_FAIL';
  if (status === 403 || /PERMISSION|FORBIDDEN|DENIED|ROLE|ADMIN ACCESS|403/.test(raw)) return 'PERMISSION';
  if (/NOT_FOUND|UNKNOWN ACTION|NO_HANDLER|FUNCTION NOT FOUND|ACTION/.test(raw)) return 'CONTRACT';
  if (/REQUIRED|NOT FOUND|MISSING/.test(raw)) return 'DATA_REQUIRED';
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

async function request(action, payload = {}, options = {}) {
  const qsPayload = Object.assign({ action, _t: Date.now() }, payload);
  if (!options.noAuth && TOKEN) qsPayload.token = TOKEN;
  const qs = new URLSearchParams(qsPayload);
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

function latestJobPayload(context) {
  const jobs = context.dashboardJobs || [];
  const job = jobs.find(item => item && (item.job_id || item.id)) || null;
  if (!job) return null;
  return { job_id: job.job_id || job.id };
}

function resolvePayload(step, context) {
  if (step.payloadFrom === 'latestJob') return latestJobPayload(context);
  return sanitizePayload(step.payload);
}

function absorbContext(action, body, context) {
  if (!body || body.success === false) return;
  if (action === 'getDashboardData') {
    context.dashboardJobs = body.jobs || (body.summary && body.summary.recentJobs) || [];
  }
  if (action === 'checkJobs') {
    context.jobs = body.jobs || [];
    if (!context.dashboardJobs || !context.dashboardJobs.length) context.dashboardJobs = context.jobs;
  }
  if (action === 'inventoryOverview') context.inventoryItems = body.items || body.data || [];
  if (action === 'listCustomers') context.customers = body.customers || body.data || [];
}

async function runStep(workflow, step, context, report) {
  const payload = resolvePayload(step, context);
  if (payload === null) {
    const row = {
      workflow: workflow.id,
      label: workflow.label,
      action: step.action,
      required: !!step.required,
      optional: !!step.optional,
      ok: !step.required,
      status_label: 'SKIP',
      http_status: 0,
      elapsed_ms: 0,
      error: step.payloadFrom === 'latestJob' ? 'No latest job available for read-only workflow check' : 'Payload unavailable',
    };
    report.results.push(row);
    return row;
  }

  const started = Date.now();
  try {
    const result = await request(step.action, payload || {}, { noAuth: !!step.noAuth });
    const ok = result.status === 200 && result.body && result.body.success !== false;
    const error = ok ? '' : (result.body && (result.body.error || result.body.message || result.body.status)) || 'unexpected response';
    const row = {
      workflow: workflow.id,
      label: workflow.label,
      action: step.action,
      required: !!step.required,
      optional: !!step.optional,
      ok,
      status_label: ok ? 'OK' : classify(error, result.status),
      http_status: result.status,
      elapsed_ms: Date.now() - started,
      error,
      request_id: result.body && (result.body.request_id || (result.body.meta && result.body.meta.request_id)),
    };
    report.results.push(row);
    absorbContext(step.action, result.body, context);
    return row;
  } catch (err) {
    const row = {
      workflow: workflow.id,
      label: workflow.label,
      action: step.action,
      required: !!step.required,
      optional: !!step.optional,
      ok: false,
      status_label: classify(err.message),
      http_status: 0,
      elapsed_ms: Date.now() - started,
      error: err.message,
    };
    report.results.push(row);
    return row;
  }
}

async function run() {
  const workflows = API_CONTRACT.workflows || [];
  const report = {
    generated_at: new Date().toISOString(),
    gas_url: GAS_URL,
    contract_version: API_CONTRACT.version,
    token_present: !!TOKEN,
    mode: 'read-only',
    results: [],
  };
  const failures = [];

  if (!TOKEN) {
    console.log('[workflow] protected checks need COMPHONE_AUTH_TOKEN; public observability checks will still run.');
  }

  for (const workflow of workflows) {
    const context = {};
    const steps = workflow.readOnly || [];
    for (const step of steps) {
      if (!step.noAuth && !TOKEN) {
        const row = {
          workflow: workflow.id,
          label: workflow.label,
          action: step.action,
          required: !!step.required,
          optional: !!step.optional,
          ok: !step.required,
          status_label: 'SKIP',
          http_status: 0,
          elapsed_ms: 0,
          error: 'COMPHONE_AUTH_TOKEN is not set',
        };
        report.results.push(row);
        continue;
      }
      const row = await runStep(workflow, step, context, report);
      const line = `[${workflow.id.padEnd(16)}] ${step.action}: ${row.status_label} ${row.http_status || ''} ${row.elapsed_ms}ms${row.error ? ' - ' + row.error : ''}`;
      console.log(line);
      if (!row.ok && row.required) failures.push(`${workflow.id}/${step.action}: ${row.status_label} ${row.error}`);
    }
  }

  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2) + '\n', 'utf8');
  console.log(`[PWA Workflow Smoke] report: ${path.relative(ROOT, REPORT_PATH).replace(/\\/g, '/')}`);

  if (failures.length) {
    console.error('[PWA Workflow Smoke] FAILED');
    for (const item of failures) console.error(`- ${item}`);
    process.exit(1);
  }

  console.log('[PWA Workflow Smoke] OK');
}

run().catch(err => {
  console.error('[PWA Workflow Smoke] FAILED');
  console.error(err);
  process.exit(1);
});
