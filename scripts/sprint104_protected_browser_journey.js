#!/usr/bin/env node
/*
 * Sprint 104 Protected Browser Journey
 *
 * Token-aware, read-only production journey guard for the highest-value PC and
 * mobile menu chain. CI can run this without secrets: static contracts still
 * run, protected live checks are skipped safely when COMPHONE_AUTH_TOKEN is not
 * supplied. With a token, it verifies that priority menus have working data
 * routes instead of blank shells.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REPORT_DIR = path.join(ROOT, 'test_reports');
const REPORT_JSON = path.join(REPORT_DIR, 'sprint104_protected_browser_journey_latest.json');
const REPORT_MD = path.join(REPORT_DIR, 'sprint104_protected_browser_journey_latest.md');
const gasConfig = fs.readFileSync(path.join(ROOT, 'pwa', 'gas_config.js'), 'utf8');
const urlMatch = gasConfig.match(/url:\s*'([^']+)'/);
const GAS_URL = process.env.COMPHONE_GAS_URL || (urlMatch && urlMatch[1]);
const TOKEN = process.env.COMPHONE_AUTH_TOKEN || '';
const TIMEOUT_MS = Number(process.env.COMPHONE_LIVE_QA_TIMEOUT_MS || 30000);
const SLOW_MS = Number(process.env.COMPHONE_LIVE_QA_SLOW_MS || 15000);
const FAIL_ON_SLOW = /^(1|true|yes)$/i.test(process.env.COMPHONE_LIVE_QA_FAIL_ON_SLOW || '');

if (!GAS_URL) {
  console.error('[Sprint 104 Protected Browser Journey] Missing GAS URL.');
  process.exit(1);
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function has(text, pattern) {
  return pattern instanceof RegExp ? pattern.test(text) : text.includes(pattern);
}

function nestedValue(obj, key) {
  return key.split('.').reduce((current, part) => current && current[part], obj);
}

function normalizeArray(body, keys) {
  for (const key of keys) {
    const value = nestedValue(body, key);
    if (Array.isArray(value)) return value;
  }
  return [];
}

function hasObject(body, keys) {
  return keys.some(key => {
    const value = nestedValue(body, key);
    return value && typeof value === 'object' && !Array.isArray(value);
  });
}

function firstValue(body, keys) {
  for (const key of keys) {
    const value = nestedValue(body, key);
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return '';
}

function okBase(body) {
  return body && body.success !== false && body.status !== 'error';
}

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
    if (copy[key] && typeof copy[key] === 'object') copy[key] = JSON.stringify(copy[key]);
  });
  return copy;
}

async function request(action, payload = {}) {
  const qs = new URLSearchParams(Object.assign({ action, _t: Date.now() }, sanitizePayload(payload)));
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

const STATIC_FILES = {
  pcHtml: read('pwa/dashboard_pc.html'),
  mobileHtml: read('pwa/index.html'),
  pcCore: read('pwa/dashboard_pc_core.js'),
  app: read('pwa/app.js'),
  dashboard: read('pwa/dashboard.js'),
  apiContract: read('pwa/api_contract.js'),
  reports: read('pwa/reports.js'),
  jobs: read('pwa/section_jobs.js'),
  billing: read('pwa/billing_section.js'),
  vision: read('pwa/section_vision.js'),
  line: read('pwa/section_line_center.js'),
  settings: read('pwa/section_settings.js'),
  workflow: read('.github/workflows/auto-deploy.yml'),
  regression: read('scripts/regression-guard.sh'),
  staticGuard: read('scripts/pwa_static_guard.js'),
};

const PRIORITY_MENUS = [
  { id: 'jobs', label: 'Jobs', pcRenderer: 'jobs', mobilePage: 'page-jobs', api: ['checkJobs', 'getJobStateConfig', 'getJobTimeline'] },
  { id: 'billing', label: 'Billing', pcRenderer: 'billing', mobilePage: 'page-billing', api: ['listBillings', 'getBilling'] },
  { id: 'reports', label: 'Reports', pcRenderer: 'reports', mobilePage: 'page-reports', api: ['getReportData'] },
  { id: 'vision', label: 'AI Vision', pcRenderer: 'vision', mobilePage: 'page-vision', api: ['getVisionDashboardStats', 'getVisionPipelineVersion', 'getVisionReviewQueue', 'getVisionFieldContext'] },
  { id: 'line-center', label: 'LINE Center', pcRenderer: 'line-center', mobilePage: 'page-line-center', api: ['getLineCommandCenter', 'getLineRoomStatus', 'getIntelAlertQueue'] },
  { id: 'settings', label: 'Settings', pcRenderer: 'settings', mobilePage: 'page-profile', api: ['getSecurityStatus'] },
];

function staticChecks() {
  const checks = [];

  function check(area, name, ok, detail, severity = 'P0') {
    checks.push({ area, name, ok: !!ok, severity, detail });
  }

  check('static_shell', 'mobile-loads-api-client-before-app',
    STATIC_FILES.mobileHtml.indexOf('api_client.js') !== -1 &&
      STATIC_FILES.mobileHtml.indexOf('app.js') !== -1 &&
      STATIC_FILES.mobileHtml.indexOf('api_client.js') < STATIC_FILES.mobileHtml.indexOf('app.js'),
    'Mobile must load api_client.js before app.js.');

  check('static_shell', 'pc-loads-api-client-before-core',
    STATIC_FILES.pcHtml.indexOf('api_client.js') !== -1 &&
      STATIC_FILES.pcHtml.indexOf('dashboard_pc_core.js') !== -1 &&
      STATIC_FILES.pcHtml.indexOf('api_client.js') < STATIC_FILES.pcHtml.indexOf('dashboard_pc_core.js'),
    'PC must load api_client.js before dashboard_pc_core.js.');

  check('static_shell', 'no-main-content-wipe',
    has(STATIC_FILES.pcCore, 'getSectionMount') &&
      has(STATIC_FILES.pcCore, 'renderMissingSection') &&
      !has(STATIC_FILES.pcCore, 'main.innerHTML = global.renderSettingsSection()') &&
      !has(STATIC_FILES.pcCore, "main.innerHTML = '<h3>"),
    'Priority renderers must mount inside section content instead of replacing #main-content.');

  check('static_shell', 'mobile-restore-and-close-protection',
    has(STATIC_FILES.app, 'LAST_PAGE_KEY') &&
      has(STATIC_FILES.app, 'RESTORABLE_PAGES') &&
      has(STATIC_FILES.app, 'getNavButtonForPage') &&
      has(STATIC_FILES.app, "window.addEventListener('popstate'") &&
      has(STATIC_FILES.app, "window.addEventListener('beforeunload'"),
    'Mobile should restore last active page and protect operators from accidental back/close.');

  check('static_shell', 'more-sheet-data-driven',
    has(STATIC_FILES.app, 'renderMoreMenu') &&
      has(STATIC_FILES.app, 'more-menu-grid') &&
      has(STATIC_FILES.mobileHtml, 'more-menu-overlay') &&
      has(STATIC_FILES.mobileHtml, 'more-menu-content'),
    'Mobile More menu must be a scrollable data-driven grouped surface.');

  for (const menu of PRIORITY_MENUS) {
    check('pc_route_contract', `${menu.id}:sidebar-route`,
      menu.id === 'dashboard' || has(STATIC_FILES.pcHtml, `loadSection('${menu.id}')`),
      `PC sidebar should expose ${menu.label}.`);

    check('pc_route_contract', `${menu.id}:section-mount`,
      has(STATIC_FILES.pcHtml, `id="section-${menu.id}"`) &&
        (menu.id === 'dashboard' || has(STATIC_FILES.pcHtml, `id="${menu.id}-content"`)),
      `PC ${menu.label} needs stable section and content mounts.`);

    check('pc_route_contract', `${menu.id}:renderer-route`,
      has(STATIC_FILES.pcCore, `${menu.pcRenderer}:`) || has(STATIC_FILES.pcCore, `'${menu.pcRenderer}':`),
      `dashboard_pc_core.js must route ${menu.label}.`);

    check('mobile_route_contract', `${menu.id}:page-container`,
      has(STATIC_FILES.mobileHtml, `id="${menu.mobilePage}"`),
      `Mobile ${menu.label} needs a stable page container.`);

    check('command_center_contract', `${menu.id}:command-tile`,
      menu.id === 'settings' ||
        has(STATIC_FILES.dashboard, `openDashboardCommand('${menu.id}')`) ||
        has(STATIC_FILES.dashboard, `renderCommandTile('${menu.id}'`),
      `Dashboard command center should keep ${menu.label} reachable.`,
      menu.id === 'settings' ? 'P1' : 'P0');

    for (const action of menu.api) {
      check('api_contract', `${menu.id}:${action}`,
        has(STATIC_FILES.apiContract, action),
        `api_contract.js should track ${action} for ${menu.label}.`);
    }
  }

  check('module_runtime', 'jobs-real-renderer',
    has(STATIC_FILES.jobs, 'renderJobsSection') &&
      has(STATIC_FILES.app, 'renderJobsPage') &&
      (has(STATIC_FILES.app, "callAPI('checkJobs'") || has(STATIC_FILES.apiContract, 'checkJobs')),
    'Jobs module must render PC/mobile and have a checkJobs read contract.');

  check('module_runtime', 'billing-real-renderer',
    has(STATIC_FILES.billing, 'renderBillingSection') &&
      (has(STATIC_FILES.app, "renderBillingSection()") || has(STATIC_FILES.app, "renderBillingSection(data)")) &&
      has(STATIC_FILES.billing, 'listBillings'),
    'Billing module must render PC/mobile and call listBillings.');

  check('module_runtime', 'reports-real-renderer',
    has(STATIC_FILES.reports, 'renderReportModule') && has(STATIC_FILES.reports, 'getReportData'),
    'Reports module must render a real report module and call getReportData.');

  check('module_runtime', 'vision-real-renderer',
    has(STATIC_FILES.vision, 'renderVisionSection') &&
      has(STATIC_FILES.vision, 'renderMobileVisionPage') &&
      has(STATIC_FILES.vision, "visionApi('getVisionDashboardStats'") &&
      has(STATIC_FILES.vision, "visionApi('getVisionReviewQueue'"),
    'Vision module must render PC/mobile and load stats/review queue.');

  check('module_runtime', 'line-real-renderer',
    has(STATIC_FILES.line, 'renderLineCenterSection') &&
      has(STATIC_FILES.line, 'renderMobileLineCenterPage') &&
      has(STATIC_FILES.line, 'getLineCommandCenter') &&
      has(STATIC_FILES.line, 'getLineRoomStatus'),
    'LINE Center module must render PC/mobile and load command/status data.');

  check('ci_contract', 'sprint104-wired',
    has(STATIC_FILES.workflow, 'sprint104_protected_browser_journey.js') &&
      has(STATIC_FILES.regression, 'sprint104_protected_browser_journey.js') &&
      has(STATIC_FILES.staticGuard, 'sprint104_protected_browser_journey.js'),
    'Sprint 104 protected browser journey must be wired into Actions, regression guard, and static guard.',
    'P1');

  return checks;
}

const PUBLIC_STEPS = [
  {
    scope: 'public',
    menu: 'system',
    action: 'health',
    validate: body => okBase(body) && (!body.status || ['healthy', 'ok'].includes(String(body.status).toLowerCase())),
    summarize: body => ({ status: body.status || '', version: body.version || '' }),
    recommendation: 'Confirm GAS deployment URL and public Router mapping first.',
  },
  {
    scope: 'public',
    menu: 'system',
    action: 'getVersion',
    validate: okBase,
    summarize: body => ({ version: firstValue(body, ['version', 'backend_version', 'data.version']) }),
    recommendation: 'Check version route and deployment freshness.',
  },
];

const PROTECTED_STEPS = [
  {
    menu: 'dashboard',
    action: 'getDashboardData',
    validate: body => okBase(body) && (hasObject(body, ['summary', 'data.summary', 'data']) || normalizeArray(body, ['jobs', 'data.jobs']).length >= 0),
    summarize: body => ({ hasSummary: hasObject(body, ['summary', 'data.summary']), jobs: normalizeArray(body, ['jobs', 'data.jobs']).length }),
    recommendation: 'Fix dashboard API response normalization before PC/mobile home QA.',
  },
  {
    menu: 'jobs',
    action: 'checkJobs',
    payload: { limit: 10 },
    validate: body => okBase(body) && normalizeArray(body, ['jobs', 'items', 'data.jobs', 'data.items', 'data']).length >= 0,
    summarize: body => ({ count: normalizeArray(body, ['jobs', 'items', 'data.jobs', 'data.items', 'data']).length }),
    capture: (state, body) => {
      const jobs = normalizeArray(body, ['jobs', 'items', 'data.jobs', 'data.items', 'data']);
      const latest = jobs.find(item => firstValue(item, ['Job_ID', 'job_id', 'id', 'ID']));
      if (latest) state.latestJobId = firstValue(latest, ['Job_ID', 'job_id', 'id', 'ID']);
    },
    recommendation: 'Check JobsHandler route aliases and Jobs sheet response shape.',
  },
  {
    menu: 'jobs',
    action: 'getJobStateConfig',
    validate: body => okBase(body) && (hasObject(body, ['states', 'data.states', 'config', 'data.config']) || normalizeArray(body, ['states', 'data.states']).length >= 0),
    summarize: body => ({ hasConfig: hasObject(body, ['states', 'data.states', 'config', 'data.config']) }),
    recommendation: 'Fix job state config before status transition UI can be trusted.',
  },
  {
    menu: 'jobs',
    action: 'getJobTimeline',
    payloadFromState: state => state.latestJobId ? { job_id: state.latestJobId, jobId: state.latestJobId } : null,
    optional: true,
    validate: okBase,
    summarize: body => ({ timeline: normalizeArray(body, ['timeline', 'items', 'data.timeline', 'data.items']).length }),
    recommendation: 'Timeline is optional here; if it fails, inspect record-specific job aliases.',
  },
  {
    menu: 'billing',
    action: 'listBillings',
    payload: { limit: 10 },
    validate: body => okBase(body) && normalizeArray(body, ['billings', 'items', 'data.billings', 'data.items', 'data']).length >= 0,
    summarize: body => ({ count: normalizeArray(body, ['billings', 'items', 'data.billings', 'data.items', 'data']).length }),
    capture: (state, body) => {
      const billings = normalizeArray(body, ['billings', 'items', 'data.billings', 'data.items', 'data']);
      const latest = billings.find(item => firstValue(item, ['Billing_ID', 'billing_id', 'id', 'ID']));
      if (latest) {
        state.latestBillingId = firstValue(latest, ['Billing_ID', 'billing_id', 'id', 'ID']);
        state.latestBillingJobId = firstValue(latest, ['Job_ID', 'job_id', 'jobId']);
      }
    },
    recommendation: 'Fix BillingManager list route and response normalization.',
  },
  {
    menu: 'billing',
    action: 'getBilling',
    payloadFromState: state => state.latestBillingJobId ? { job_id: state.latestBillingJobId, jobId: state.latestBillingJobId } : null,
    optional: true,
    validate: okBase,
    summarize: body => ({ id: firstValue(body, ['billing.Billing_ID', 'billing.billing_id', 'data.Billing_ID', 'id']) }),
    recommendation: 'Billing detail is optional unless a latest billing record is available.',
  },
  {
    menu: 'reports',
    action: 'getReportData',
    payload: { period: 'month' },
    validate: body => okBase(body) && (hasObject(body, ['data', 'summary']) || normalizeArray(body, ['records', 'data.records', 'data.dailyRevenue']).length >= 0),
    summarize: body => ({ hasData: hasObject(body, ['data', 'summary']), records: normalizeArray(body, ['records', 'data.records', 'data.dailyRevenue']).length }),
    recommendation: 'Fix report route/renderer bridge before reports can be called usable.',
  },
  {
    menu: 'vision',
    action: 'getVisionDashboardStats',
    payload: { days: 7 },
    validate: body => okBase(body) && hasObject(body, ['stats', 'data.stats', 'data']),
    summarize: body => ({ hasStats: hasObject(body, ['stats', 'data.stats']) }),
    recommendation: 'Check Vision dashboard route and Gemini readiness state.',
  },
  {
    menu: 'vision',
    action: 'getVisionPipelineVersion',
    validate: okBase,
    summarize: body => ({ version: firstValue(body, ['version', 'pipeline_version', 'data.version']) }),
    recommendation: 'Check Vision pipeline version route.',
  },
  {
    menu: 'vision',
    action: 'getVisionReviewQueue',
    payload: { limit: 10 },
    validate: body => okBase(body) && normalizeArray(body, ['queue', 'items', 'data.queue', 'data.items', 'data']).length >= 0,
    summarize: body => ({ count: normalizeArray(body, ['queue', 'items', 'data.queue', 'data.items', 'data']).length }),
    recommendation: 'Check Vision review queue route and sheet headers.',
  },
  {
    menu: 'vision',
    action: 'getVisionFieldContext',
    payloadFromState: state => state.latestJobId ? { entity_type: 'job', entity_id: state.latestJobId, job_id: state.latestJobId } : null,
    optional: true,
    validate: okBase,
    summarize: body => ({ hasContext: hasObject(body, ['context', 'data.context', 'fields', 'data.fields']) }),
    recommendation: 'Vision field context is optional unless a latest job exists.',
  },
  {
    menu: 'line-center',
    action: 'getLineCommandCenter',
    validate: body => okBase(body) && (hasObject(body, ['summary', 'data.summary', 'data']) || normalizeArray(body, ['rooms', 'data.rooms']).length >= 0),
    summarize: body => ({ rooms: normalizeArray(body, ['rooms', 'data.rooms']).length, hasSummary: hasObject(body, ['summary', 'data.summary']) }),
    recommendation: 'Check LINE command center route and configured room metadata.',
  },
  {
    menu: 'line-center',
    action: 'getLineRoomStatus',
    validate: body => okBase(body) && (hasObject(body, ['rooms', 'data.rooms']) || normalizeArray(body, ['rooms', 'data.rooms']).length >= 0),
    summarize: body => ({ rooms: normalizeArray(body, ['rooms', 'data.rooms']).length, hasRoomsObject: hasObject(body, ['rooms', 'data.rooms']) }),
    recommendation: 'Check LINE room status route and room config.',
  },
  {
    menu: 'line-center',
    action: 'getIntelAlertQueue',
    payload: { limit: 10 },
    validate: body => okBase(body) && normalizeArray(body, ['alerts', 'queue', 'items', 'data.alerts', 'data.queue', 'data.items', 'data']).length >= 0,
    summarize: body => ({ count: normalizeArray(body, ['alerts', 'queue', 'items', 'data.alerts', 'data.queue', 'data.items', 'data']).length }),
    recommendation: 'Check intelligence alert queue route.',
  },
  {
    menu: 'settings',
    action: 'getSecurityStatus',
    validate: okBase,
    summarize: body => ({ status: firstValue(body, ['status', 'security_status', 'data.status']) }),
    recommendation: 'Check admin role/session contract.',
  },
].map(step => Object.assign({ scope: 'protected' }, step));

async function runLiveStep(step, state) {
  const started = Date.now();
  const dynamicPayload = step.payloadFromState ? step.payloadFromState(state) : {};
  if (step.payloadFromState && !dynamicPayload) {
    return {
      scope: step.scope,
      menu: step.menu,
      action: step.action,
      ok: true,
      optional: true,
      slow: false,
      status_label: 'SKIP',
      http_status: 0,
      elapsed_ms: 0,
      error: 'No source record available for record-specific read.',
      summary: {},
      recommendation: '',
    };
  }
  try {
    const payload = Object.assign({}, step.payload || {}, dynamicPayload || {});
    if (step.scope === 'protected') payload.token = TOKEN;
    const result = await request(step.action, payload);
    const elapsed = Date.now() - started;
    const ok = result.status === 200 && step.validate(result.body);
    const error = ok ? '' : (result.body && (result.body.error || result.body.message || result.body.status)) || 'unexpected response shape';
    const slow = ok && elapsed >= SLOW_MS;
    if (ok && typeof step.capture === 'function') step.capture(state, result.body);
    return {
      scope: step.scope,
      menu: step.menu,
      action: step.action,
      ok,
      optional: !!step.optional,
      slow,
      status_label: ok ? (slow ? 'SLOW' : 'OK') : classify(error, result.status),
      http_status: result.status,
      elapsed_ms: elapsed,
      error,
      summary: step.summarize ? step.summarize(result.body) : {},
      recommendation: ok ? '' : step.recommendation,
    };
  } catch (err) {
    return {
      scope: step.scope,
      menu: step.menu,
      action: step.action,
      ok: false,
      optional: !!step.optional,
      slow: false,
      status_label: classify(err.name === 'AbortError' ? 'timeout' : err.message),
      http_status: 0,
      elapsed_ms: Date.now() - started,
      error: err.name === 'AbortError' ? `timeout after ${TIMEOUT_MS}ms` : err.message,
      summary: {},
      recommendation: step.recommendation,
    };
  }
}

function writeReports(report) {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(REPORT_JSON, JSON.stringify(report, null, 2) + '\n', 'utf8');

  const lines = [
    '# Sprint 104 Protected Browser Journey',
    '',
    `- Generated: ${report.generated_at}`,
    `- Status: ${report.status}`,
    `- Score: ${report.score}/100`,
    `- Token present: ${report.token_present ? 'yes' : 'no'}`,
    `- Static checks: ${report.summary.static_pass}/${report.summary.static_total}`,
    `- Live checks: ${report.summary.live_pass} pass, ${report.summary.live_slow} slow, ${report.summary.live_fail} fail, ${report.summary.live_skip} skipped`,
    '',
    '## Static Contracts',
    '',
    '| Area | Check | Result | Detail |',
    '|---|---|---|---|',
    ...report.static_checks.map(row => `| ${row.area} | ${row.name} | ${row.ok ? 'OK' : row.severity} | ${row.detail} |`),
    '',
    '## Live Journey',
    '',
    '| Scope | Menu | Action | Result | HTTP | Time | Recommendation |',
    '|---|---|---|---|---:|---:|---|',
    ...report.live_results.map(row => `| ${row.scope} | ${row.menu} | ${row.action} | ${row.status_label} | ${row.http_status} | ${row.elapsed_ms}ms | ${row.recommendation || row.error || ''} |`),
    '',
  ];
  fs.writeFileSync(REPORT_MD, lines.join('\n'), 'utf8');
}

async function main() {
  const staticResults = staticChecks();
  const liveResults = [];
  const state = {};
  const report = {
    generated_at: new Date().toISOString(),
    version: 'sprint104-protected-browser-journey-1.0.0',
    focus: 'protected browser journey for Jobs, Billing, Reports, AI Vision, LINE Center, and Settings',
    gas_url: GAS_URL,
    token_present: !!TOKEN,
    timeout_ms: TIMEOUT_MS,
    slow_threshold_ms: SLOW_MS,
    fail_on_slow: FAIL_ON_SLOW,
    status: 'pending',
    score: 0,
    summary: {
      static_total: staticResults.length,
      static_pass: staticResults.filter(row => row.ok).length,
      static_fail: staticResults.filter(row => !row.ok).length,
      live_pass: 0,
      live_slow: 0,
      live_fail: 0,
      live_skip: 0,
    },
    static_checks: staticResults,
    live_results: liveResults,
  };

  const staticP0Failures = staticResults.filter(row => !row.ok && row.severity === 'P0');

  if (!TOKEN) {
    liveResults.push({
      scope: 'protected',
      menu: 'protected-browser-journey',
      action: 'operator-token-required',
      ok: true,
      optional: true,
      slow: false,
      status_label: 'SKIP',
      http_status: 0,
      elapsed_ms: 0,
      error: 'COMPHONE_AUTH_TOKEN is not set',
      summary: { protected_steps: PROTECTED_STEPS.length },
      recommendation: 'Set COMPHONE_AUTH_TOKEN from a fresh login session to run protected live journey checks.',
    });
    report.summary.live_skip = PROTECTED_STEPS.length;
  } else {
    for (const step of PUBLIC_STEPS.concat(PROTECTED_STEPS)) {
      const row = await runLiveStep(step, state);
      liveResults.push(row);
      if (row.status_label === 'SKIP') report.summary.live_skip += 1;
      else if (!row.ok && !row.optional) report.summary.live_fail += 1;
      else if (!row.ok && row.optional) report.summary.live_skip += 1;
      else if (row.slow) report.summary.live_slow += 1;
      else report.summary.live_pass += 1;
      console.log(`[${row.scope.padEnd(9)}] ${row.menu.padEnd(12)} ${row.action}: ${row.status_label} ${row.http_status} ${row.elapsed_ms}ms${row.error ? ' - ' + row.error : ''}`);
    }
  }

  const checksTotal = report.summary.static_total + liveResults.length;
  const checksPassed = report.summary.static_pass + liveResults.filter(row => row.ok).length;
  report.score = checksTotal ? Math.round((checksPassed / checksTotal) * 100) : 0;

  if (staticP0Failures.length || report.summary.live_fail > 0 || (FAIL_ON_SLOW && report.summary.live_slow > 0)) {
    report.status = 'fail';
  } else if (report.summary.static_fail > 0 || report.summary.live_slow > 0 || !TOKEN) {
    report.status = 'warning';
  } else {
    report.status = 'ok';
  }

  writeReports(report);
  console.log(`[Sprint 104 Protected Browser Journey] status=${report.status} score=${report.score}/100 static=${report.summary.static_pass}/${report.summary.static_total} live_fail=${report.summary.live_fail}`);
  console.log(`[Sprint 104 Protected Browser Journey] report: ${path.relative(ROOT, REPORT_JSON).replace(/\\/g, '/')}`);

  if (report.status === 'fail') process.exit(1);
}

main().catch(err => {
  console.error('[Sprint 104 Protected Browser Journey] FAILED:', err.message);
  process.exit(1);
});
