const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REPORT_DIR = path.join(ROOT, 'test_reports');
const JSON_REPORT = path.join(REPORT_DIR, 'sprint79_vision_line_flow_audit_latest.json');
const MD_REPORT = path.join(REPORT_DIR, 'sprint79_vision_line_flow_audit_latest.md');

function read(relPath) {
  const file = path.join(ROOT, relPath);
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
}

function has(text, needle) {
  return typeof needle === 'string' ? text.includes(needle) : needle.test(text);
}

function rel(file) {
  return file.replace(/\\/g, '/');
}

function check(id, label, ok, details, severity, files) {
  return {
    id,
    label,
    ok: !!ok,
    severity,
    details,
    files: files.map(rel),
  };
}

const files = {
  visionUi: 'pwa/section_vision.js',
  lineUi: 'pwa/section_line_center.js',
  routerSplit: 'clasp-ready/RouterSplit.gs',
  visionPipeline: 'clasp-ready/VisionPipeline.gs',
  lineCenter: 'clasp-ready/LineCommandCenter.gs',
  apiContract: 'pwa/api_contract.js',
  app: 'pwa/app.js',
  dashboardPc: 'pwa/dashboard_pc.html',
  indexHtml: 'pwa/index.html',
  manifest: 'pwa/pwa_asset_manifest.js',
  regressionGuard: 'scripts/regression-guard.sh',
};

const text = Object.fromEntries(Object.entries(files).map(([key, file]) => [key, read(file)]));

const visionReadActions = [
  'getVisionDashboardStats',
  'getVisionPipelineVersion',
  'getVisionLearningVersion',
  'getVisionFieldContext',
  'getVisionActionSuggestions',
  'previewVisionSuggestion',
  'getVisionReviewQueue',
];

const visionWriteActions = [
  'runVisionPipeline',
  'runQCPipeline',
  'submitHumanReview',
  'linkVisionToJobTimeline',
  'executeVisionSuggestion',
];

const lineReadActions = [
  'getLineCommandCenter',
  'getLineRoomStatus',
  'previewLineRoomMessage',
];

const lineWriteActions = [
  'acknowledgeLineAlert',
  'bulkAcknowledgeLineAlerts',
  'queueLineCommandAlert',
  'sendLineRoomMessage',
];

const allVisionActions = visionReadActions.concat(visionWriteActions);
const allLineActions = lineReadActions.concat(lineWriteActions);

const checks = [
  check(
    'vision-ui-surface',
    'PC and mobile Vision panels expose the complete operator workflow.',
    has(text.visionUi, 'function renderVisionSection') &&
      has(text.visionUi, 'function renderMobileVisionPage') &&
      has(text.visionUi, 'function refreshVisionPanel') &&
      has(text.visionUi, 'function runSelectedVisionPipeline') &&
      has(text.visionUi, 'function loadVisionFieldContext') &&
      has(text.visionUi, 'function loadVisionActionSuggestions') &&
      has(text.visionUi, 'function submitVisionReview') &&
      has(text.dashboardPc, "loadSection('vision')") &&
      has(text.indexHtml, 'page-vision') &&
      has(text.manifest, 'section_vision.js'),
    'Vision must stay available from both PC and mobile with dashboard, upload, review, context, and next-action controls.',
    'P0',
    [files.visionUi, files.dashboardPc, files.indexHtml, files.manifest]
  ),
  check(
    'vision-controlled-execution',
    'Destructive Vision suggestions require preview, explicit confirmation, and backend whitelist execution.',
    has(text.visionUi, 'function previewVisionSuggestion') &&
      has(text.visionUi, "visionApi('previewVisionSuggestion'") &&
      has(text.visionUi, "visionApi('executeVisionSuggestion'") &&
      has(text.visionUi, 'formatVisionPreviewText') &&
      has(text.visionUi, 'EXECUTE_VISION_SUGGESTION') &&
      has(text.visionPipeline, 'function previewVisionSuggestion') &&
      has(text.visionPipeline, 'function executeVisionSuggestion') &&
      has(text.visionPipeline, "String(params.confirm || '') !== 'EXECUTE_VISION_SUGGESTION'") &&
      has(text.visionPipeline, 'function _vpFindAllowedSuggestion_') &&
      has(text.visionPipeline, 'function _vpBuildExecutionPreview_'),
    'Vision writes must never be triggered from arbitrary frontend actions; they must go through preview + confirmation + server-selected suggestions.',
    'P0',
    [files.visionUi, files.visionPipeline]
  ),
  check(
    'vision-line-room-routing',
    'Vision suggestions know which LINE rooms will receive notifications before execution.',
    has(text.visionPipeline, 'lineRooms') &&
      has(text.visionPipeline, 'function _vpSuggestedRoomsFor_') &&
      has(text.visionPipeline, 'function _vpResolveLineRoom_') &&
      has(text.visionPipeline, 'function _vpPushVisionLineRooms_') &&
      has(text.visionPipeline, 'notifications.push') &&
      has(text.visionUi, 'LINE ${n.room}') &&
      has(text.visionUi, 'configured') &&
      has(text.visionUi, 'not configured'),
    'Operators should see LINE room targets in dry-run previews, including whether the room is configured.',
    'P1',
    [files.visionUi, files.visionPipeline]
  ),
  check(
    'line-command-center-safe-send',
    'LINE Command Center has read-only status/preview plus explicit confirmation before sending.',
    has(text.lineUi, 'function renderLineCenterSection') &&
      has(text.lineUi, 'function renderMobileLineCenterPage') &&
      has(text.lineUi, "lineApi('getLineCommandCenter'") &&
      has(text.lineUi, "lineApi('getLineRoomStatus'") &&
      has(text.lineUi, "lineApi('previewLineRoomMessage'") &&
      has(text.lineUi, "lineApi('sendLineRoomMessage'") &&
      has(text.lineUi, 'SEND_LINE_ROOM_MESSAGE') &&
      has(text.lineCenter, 'function previewLineRoomMessage') &&
      has(text.lineCenter, 'function sendLineRoomMessage') &&
      has(text.lineCenter, "params.confirm !== 'SEND_LINE_ROOM_MESSAGE'") &&
      has(text.lineCenter, 'sendLinePush(message, groupId)') &&
      has(text.lineCenter, 'tokenConfigured') &&
      has(text.lineCenter, 'groupTail'),
    'Manual LINE pushes must keep real tokens/group IDs hidden and require a dry-runable confirmation flow.',
    'P0',
    [files.lineUi, files.lineCenter]
  ),
  check(
    'line-alert-ops',
    'LINE alerts can be queued, grouped, acknowledged, and audited without exposing group IDs.',
    has(text.lineCenter, 'function getLineCommandCenter') &&
      has(text.lineCenter, 'function acknowledgeLineAlert') &&
      has(text.lineCenter, 'function bulkAcknowledgeLineAlerts') &&
      has(text.lineCenter, 'function queueLineCommandAlert') &&
      has(text.lineCenter, 'function getLineRoomStatus') &&
      has(text.lineCenter, '_recordAnalytics_') &&
      has(text.lineUi, 'ackLineAlert') &&
      has(text.lineUi, 'ackAllLineAlerts') &&
      has(text.lineUi, 'queueLineTestAlert'),
    'LINE Center should support day-to-day operations, not only message sending.',
    'P1',
    [files.lineUi, files.lineCenter]
  ),
  check(
    'router-routes',
    'RouterSplit exposes all protected Vision and LINE actions used by PWA and smoke tests.',
    allVisionActions.concat(allLineActions).every(action => text.routerSplit.includes(`'${action}'`)),
    `Missing route would make the UI appear online while menu actions fail. Required: ${allVisionActions.concat(allLineActions).join(', ')}`,
    'P0',
    [files.routerSplit]
  ),
  check(
    'api-contract-coverage',
    'API contract documents Vision AI and LINE Command Center workflows with destructive actions marked as non-smoke.',
    has(text.apiContract, 'vision_ai') &&
      has(text.apiContract, 'line_command_center') &&
      allVisionActions.concat(allLineActions).every(action => text.apiContract.includes(action)) &&
      has(text.apiContract, "action: 'executeVisionSuggestion', destructive: true, smoke: false") &&
      has(text.apiContract, "action: 'sendLineRoomMessage', destructive: true, smoke: false"),
    'The API contract is the shared source for menu smoke tests and must reflect guarded destructive actions.',
    'P1',
    [files.apiContract]
  ),
  check(
    'read-action-classification',
    'Frontend read-action classification keeps Vision/LINE reads from becoming offline writes.',
    visionReadActions.concat(lineReadActions).every(action => text.app.includes(action)),
    'Read-only dashboard/status/preview calls should not enter the offline write queue when they fail.',
    'P1',
    [files.app]
  ),
  check(
    'ci-regression-coverage',
    'Regression guard runs Vision capability/runtime/E2E checks and Sprint 79 flow audit.',
    has(text.regressionGuard, 'vision_capability_audit.js') &&
      has(text.regressionGuard, 'vision_runtime_smoke.js') &&
      has(text.regressionGuard, 'vision_e2e_smoke.js') &&
      has(text.regressionGuard, 'sprint79_vision_line_flow_audit.js'),
    'Vision/LINE flow drift must be blocked by local regression guard and CI.',
    'P1',
    [files.regressionGuard]
  ),
];

async function callGas(gasUrl, action, payload) {
  const params = {};
  Object.entries(Object.assign({ action, _t: Date.now() }, payload || {})).forEach(([key, value]) => {
    params[key] = value && typeof value === 'object' ? JSON.stringify(value) : value;
  });
  const qs = new URLSearchParams(params);
  const res = await fetch(`${gasUrl}?${qs.toString()}`, { redirect: 'follow' });
  const raw = await res.text();
  let body;
  try {
    body = JSON.parse(raw);
  } catch (_) {
    body = { success: false, error: `non-JSON response ${res.status}: ${raw.slice(0, 160)}` };
  }
  return { status: res.status, body };
}

function getGasUrl() {
  const gasConfig = read('pwa/gas_config.js');
  const match = gasConfig.match(/url:\s*'([^']+)'/);
  return process.env.COMPHONE_GAS_URL || (match && match[1]) || '';
}

async function runLiveReadSmoke(report) {
  const token = process.env.COMPHONE_AUTH_TOKEN || '';
  const gasUrl = getGasUrl();
  report.live = {
    gas_url: gasUrl,
    token_present: !!token,
    mode: 'read-only',
    results: [],
  };
  if (!gasUrl || !token) {
    report.live.skipped = !gasUrl ? 'Missing GAS URL' : 'COMPHONE_AUTH_TOKEN is not set';
    return;
  }

  const liveSteps = [
    { action: 'getVisionDashboardStats', payload: { days: 7 }, validate: body => body && body.success !== false && !!body.stats },
    { action: 'getVisionPipelineVersion', validate: body => body && body.success !== false },
    { action: 'getVisionLearningVersion', validate: body => body && body.success !== false },
    { action: 'getVisionFieldContext', payload: { timelineLimit: 3 }, validate: body => body && body.success !== false && Object.prototype.hasOwnProperty.call(body, 'context_available') },
    { action: 'getVisionActionSuggestions', payload: { result: { type: 'QC', confidence: 0.91, decision: { code: 'APPROVED' }, data: {} } }, validate: body => body && body.success !== false && Array.isArray(body.suggestions) },
    { action: 'getVisionReviewQueue', payload: { limit: 5, days: 30 }, validate: body => body && body.success !== false && Array.isArray(body.queue) },
    { action: 'getLineCommandCenter', payload: { days: 7 }, validate: body => body && body.success !== false && Array.isArray(body.rooms) },
    { action: 'getLineRoomStatus', validate: body => body && body.success !== false && Array.isArray(body.rooms) },
    { action: 'previewLineRoomMessage', payload: { rooms: ['EXECUTIVE'], message: 'SPRINT79 PREVIEW ONLY' }, validate: body => body && body.success !== false && body.dryRun === true },
  ];

  for (const step of liveSteps) {
    const started = Date.now();
    const payload = Object.assign({}, step.payload || {}, { token });
    try {
      const result = await callGas(gasUrl, step.action, payload);
      const ok = result.status === 200 && step.validate(result.body);
      const error = ok ? '' : (result.body && (result.body.error || result.body.message || result.body.status)) || 'unexpected response';
      report.live.results.push({
        action: step.action,
        ok,
        http_status: result.status,
        elapsed_ms: Date.now() - started,
        error,
      });
      console.log(`[live-read ] ${step.action}: ${ok ? 'OK' : 'FAIL'} ${result.status} ${Date.now() - started}ms${error ? ' - ' + error : ''}`);
    } catch (err) {
      report.live.results.push({
        action: step.action,
        ok: false,
        http_status: 0,
        elapsed_ms: Date.now() - started,
        error: err.message,
      });
      console.log(`[live-read ] ${step.action}: FAIL 0 ${Date.now() - started}ms - ${err.message}`);
    }
  }
}

async function main() {
  const report = {
    generated_at: new Date().toISOString(),
    version: 'sprint79-vision-line-flow-audit-1.0.0',
    focus: 'AI Vision + LINE Command Center flow hardening',
    checks,
  };

  await runLiveReadSmoke(report);

  const failed = checks.filter(item => !item.ok);
  const liveFailures = report.live && report.live.results
    ? report.live.results.filter(item => !item.ok).map(item => `live/${item.action}: ${item.error || 'failed'}`)
    : [];
  const severityWeight = { P0: 0, P1: 4, P2: 8, P3: 12 };
  const localPenalty = failed.reduce((sum, item) => sum + (severityWeight[item.severity] || 4), 0);
  const livePenalty = liveFailures.length * 4;
  report.score = Math.max(0, 100 - localPenalty - livePenalty);
  report.findings = failed.map(item => ({
    id: item.id,
    severity: item.severity,
    label: item.label,
    details: item.details,
    files: item.files,
  })).concat(liveFailures.map(item => ({
    id: item.split(':')[0],
    severity: 'P1',
    label: 'Live protected read smoke failed',
    details: item,
    files: ['pwa/gas_config.js'],
  })));

  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(JSON_REPORT, JSON.stringify(report, null, 2) + '\n', 'utf8');
  fs.writeFileSync(MD_REPORT, [
    '# Sprint 79 Vision + LINE Flow Audit',
    '',
    `- Generated: ${report.generated_at}`,
    `- Score: ${report.score}/100`,
    `- Live protected smoke: ${report.live && report.live.token_present ? 'enabled' : 'skipped'}`,
    '',
    '## Checks',
    ...checks.map(item => `- ${item.ok ? 'OK' : 'FAIL'} [${item.severity}] ${item.id}: ${item.label}`),
    '',
    '## Findings',
    ...(report.findings.length
      ? report.findings.map(item => `- [${item.severity}] ${item.id}: ${item.details}`)
      : ['- No Vision/LINE flow findings detected.']),
    '',
  ].join('\n'));

  console.log(`[Sprint 79 Vision+LINE Audit] score: ${report.score}/100`);
  console.log(`[Sprint 79 Vision+LINE Audit] report: ${rel(path.relative(ROOT, JSON_REPORT))}`);

  if (report.findings.some(item => item.severity === 'P0' || item.severity === 'P1')) {
    console.error('[Sprint 79 Vision+LINE Audit] FAILED');
    report.findings.forEach(item => console.error(`- [${item.severity}] ${item.id}: ${item.details}`));
    process.exit(1);
  }
}

main().catch(err => {
  console.error('[Sprint 79 Vision+LINE Audit] FAILED');
  console.error(err.stack || err.message);
  process.exit(1);
});
