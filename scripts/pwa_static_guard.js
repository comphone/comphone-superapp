const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PWA = path.join(ROOT, 'pwa');
const INDEX = path.join(PWA, 'index.html');
const DASHBOARD_PC = path.join(PWA, 'dashboard_pc.html');
const VERSION = path.join(PWA, 'version_config.js');
const SW = path.join(PWA, 'sw.js');
const ASSET_MANIFEST = path.join(PWA, 'pwa_asset_manifest.js');

const mustExist = [INDEX, DASHBOARD_PC, VERSION, SW, ASSET_MANIFEST];
const badMarkers = [
  '\u00e0\u00b8',
  '\u00e0\u00b9',
  '\u00e2\u20ac',
  '\u00c2',
  '\u0e40\u0e18',
  '\u0e42\u20ac',
];

function readUtf8(file) {
  if (!fs.existsSync(file)) {
    throw new Error(`Missing required file: ${path.relative(ROOT, file)}`);
  }
  return fs.readFileSync(file, 'utf8');
}

function rel(file) {
  return path.relative(ROOT, file).replace(/\\/g, '/');
}

function fail(message) {
  failures.push(message);
}

const failures = [];
for (const file of mustExist) readUtf8(file);

const indexHtml = readUtf8(INDEX);
const dashboardPcHtml = readUtf8(DASHBOARD_PC);
const versionJs = readUtf8(VERSION);
const swJs = readUtf8(SW);
const assetManifestJs = readUtf8(ASSET_MANIFEST);

const buildMatch = versionJs.match(/BUILD_TIMESTAMP\s*=\s*'([^']+)'/);
const appVersionMatch = versionJs.match(/APP_VERSION\s*=\s*'([^']+)'/);
const cacheMatch = versionJs.match(/CACHE_VERSION\s*=\s*'([^']+)'/);
const swCacheMatch = swJs.match(/CACHE_V\s*=\s*'([^']+)'/);

if (!buildMatch) fail('version_config.js is missing BUILD_TIMESTAMP.');
if (!appVersionMatch) fail('version_config.js is missing APP_VERSION.');
if (!cacheMatch) fail('version_config.js is missing CACHE_VERSION.');
if (!swCacheMatch) fail('sw.js is missing CACHE_V.');
if (cacheMatch && swCacheMatch && cacheMatch[1] !== swCacheMatch[1]) {
  fail(`CACHE_VERSION mismatch: version_config.js=${cacheMatch[1]} sw.js=${swCacheMatch[1]}`);
}

if (buildMatch) {
  const expectedToken = `t=${buildMatch[1]}`;
  const expectedVersionToken = appVersionMatch ? `v=${appVersionMatch[1].replace(/^v/, '')}` : '';

  function checkCacheBustTokens(html, pageName) {
    const localRefs = [...html.matchAll(/<(?:script|link)\b[^>]+(?:src|href)="([^"]+)"/g)]
      .map(match => match[1])
      .filter(src => !src.startsWith('http') && !src.startsWith('//') && !src.startsWith('/comphone-superapp/pwa/manifest.json'));

    for (const src of localRefs) {
      if (src.includes('?') && !src.includes(expectedToken)) {
        fail(`Cache bust token mismatch in ${pageName}: ${src}`);
      }
      if (expectedVersionToken && src.includes('?') && !src.includes(expectedVersionToken)) {
        fail(`Cache bust version mismatch in ${pageName}: ${src}`);
      }
    }
  }

  checkCacheBustTokens(indexHtml, 'index.html');
  checkCacheBustTokens(dashboardPcHtml, 'dashboard_pc.html');
}

for (const match of indexHtml.matchAll(/<script\b[^>]+src="([^"]+)"/g)) {
  const src = match[1];
  if (src.startsWith('http') || src.startsWith('//')) continue;
  const clean = src.split('?')[0].replace(/^\/comphone-superapp\/pwa\//, '');
  const file = path.join(PWA, clean);
  if (!fs.existsSync(file)) fail(`index.html loads missing script: ${src}`);
}
for (const match of dashboardPcHtml.matchAll(/<script\b[^>]+src="([^"]+)"/g)) {
  const src = match[1];
  if (src.startsWith('http') || src.startsWith('//')) continue;
  const clean = src.split('?')[0].replace(/^\/comphone-superapp\/pwa\//, '');
  const file = path.join(PWA, clean);
  if (!fs.existsSync(file)) fail(`dashboard_pc.html loads missing script: ${src}`);
}

function parseManifestList(name) {
  const match = assetManifestJs.match(new RegExp(`${name}:\\s*\\[([\\s\\S]*?)\\]`));
  if (!match) return [];
  return [...match[1].matchAll(/'([^']+)'/g)].map(item => item[1]);
}

const manifestStyles = parseManifestList('styles');
const manifestScripts = parseManifestList('scripts');
const manifestPrecache = parseManifestList('precache');
const indexStyles = [...indexHtml.matchAll(/<link\b[^>]+rel="stylesheet"[^>]+href="([^"]+)"/g)]
  .map(match => match[1].split('?')[0])
  .filter(src => !src.startsWith('http') && !src.startsWith('//'));
const indexScripts = [...indexHtml.matchAll(/<script\b[^>]+src="([^"]+)"/g)]
  .map(match => match[1].split('?')[0])
  .filter(src => !src.startsWith('http') && !src.startsWith('//'));

for (const asset of manifestStyles) {
  if (!indexStyles.includes(asset)) fail(`index.html is missing stylesheet from pwa_asset_manifest.js: ${asset}`);
}
for (const asset of manifestScripts) {
  if (!indexScripts.includes(asset)) fail(`index.html is missing script from pwa_asset_manifest.js: ${asset}`);
}
for (const asset of [...manifestStyles, ...manifestScripts]) {
  if (!manifestPrecache.includes(asset)) fail(`pwa_asset_manifest.js precache is missing loaded asset: ${asset}`);
}
if (!manifestStyles.includes('mobile_glass.css') || !manifestPrecache.includes('mobile_glass.css')) {
  fail('pwa_asset_manifest.js must load and precache mobile_glass.css.');
}
for (const asset of manifestPrecache) {
  if (asset === '/') continue;
  const file = path.join(PWA, asset);
  if (!fs.existsSync(file)) fail(`pwa_asset_manifest.js pre-caches missing asset: ${asset}`);
}

for (const match of swJs.matchAll(/BASE \+ '\/([^']+)'/g)) {
  const asset = match[1];
  if (asset === '' || asset === '/') continue;
  const file = path.join(PWA, asset);
  if (!fs.existsSync(file)) fail(`sw.js pre-caches missing asset: ${asset}`);
}

const filesToScan = ['index.html', 'dashboard_pc.html', 'version_config.js', 'sw.js', 'pwa_asset_manifest.js', 'api_contract.js', 'api_client.js', 'app.js', 'auth.js', 'auth_guard.js', 'app_home.js', 'admin_panel.js', 'menu_health.js', 'runtime_self_test.js', 'section_vision.js'];
for (const name of filesToScan) {
  const file = path.join(PWA, name);
  const text = readUtf8(file);
  const marker = badMarkers.find(item => text.includes(item));
  if (marker) fail(`Possible UTF-8 mojibake marker in ${rel(file)}.`);
}

if (!/[ก-๙]/.test(indexHtml)) fail('index.html no longer contains Thai text; encoding may be damaged.');
if (!/[ก-๙]/.test(dashboardPcHtml)) fail('dashboard_pc.html no longer contains Thai text; encoding may be damaged.');

const appJs = readUtf8(path.join(PWA, 'app.js'));
const appActionsJs = readUtf8(path.join(PWA, 'app_actions.js'));
if (appJs.includes('window.AI_EXECUTOR[method]')) {
  fail('app.js callAPI() still depends on AI_EXECUTOR; mobile PWA should delegate to api_client.js callApi().');
}
for (const fn of ['openNewJob', 'submitNewJob', 'addCustomer', 'saveNewCustomer', 'openPO', 'openPOS', 'openAICompanion', 'openSmartAssignV2']) {
  if (!appActionsJs.includes(`function ${fn}`)) {
    fail(`app_actions.js must provide mobile quick action function: ${fn}().`);
  }
}
if (!appActionsJs.includes("callAPI('openJob'") || !appActionsJs.includes("callAPI('createCustomer'") ||
    !appActionsJs.includes('modal-add-customer-content') || !appActionsJs.includes('new-cust-name')) {
  fail('app_actions.js mobile quick actions must create jobs/customers through unified callAPI and include a local add-customer fallback form.');
}
if (!appActionsJs.includes('createWriteRequestId') ||
    !appActionsJs.includes('client_request_id') ||
    !appActionsJs.includes("dataset.submitting === '1'")) {
  fail('app_actions.js write flows must include client_request_id idempotency and submit double-click guards.');
}
if (appActionsJs.includes("showToast('กำลังเปิดฟอร์มงานใหม่") || appActionsJs.includes("showToast('กำลังเปิดฟอร์มลูกค้าใหม่")) {
  fail('app_actions.js must not leave openNewJob/addCustomer as toast-only stubs.');
}

if (swJs.includes('client.navigate(client.url)')) {
  fail('sw.js must not force-navigate clients during activate; use SW_ACTIVATED messaging instead.');
}
if (!swJs.includes('SW_ACTIVATED')) {
  fail('sw.js must notify clients with SW_ACTIVATED after activation.');
}
const pwaInstallJs = readUtf8(path.join(PWA, 'pwa_install.js'));
if (!pwaInstallJs.includes('_reloadAfterSwUpdate')) {
  fail('pwa_install.js must gate reloads behind explicit update acceptance.');
}

const apiClientJs = readUtf8(path.join(PWA, 'api_client.js'));
if (!apiClientJs.includes('normalizeCallApiArgs')) {
  fail('api_client.js must normalize both callApi(action, payload) and callApi({ action, ...payload }) signatures.');
}
if (!apiClientJs.includes('classifyApiError') || !apiClientJs.includes('apiErrorState')) {
  fail('api_client.js must expose classifyApiError() and apiErrorState() for precise menu error states.');
}
if (!apiClientJs.includes('apiErrorInfo')) {
  fail('api_client.js must expose apiErrorInfo() for object-based error panels.');
}
if (!indexHtml.includes('offline_db.js?')) {
  fail('index.html must load offline_db.js so mobile queue/sync/offline banner state is consistent.');
}
if (!indexHtml.includes('notification_center.js?')) {
  fail('index.html must load notification_center.js for the notifications menu.');
}
if (!indexHtml.includes('runtime_self_test.js?')) {
  fail('index.html must load runtime_self_test.js for mobile system health checks.');
}
if (!appJs.includes('if (!isReadAction(action)) saveOfflineAction')) {
  fail('app.js must not queue read-only API failures as offline write actions.');
}
const dashboardJs = readUtf8(path.join(PWA, 'dashboard.js'));
if (!dashboardJs.includes('apiErrorInfo(raw,') || dashboardJs.includes('bi-wifi-off')) {
  fail('dashboard.js must use classified API errors instead of showing every dashboard failure as offline.');
}
const authJs = readUtf8(path.join(PWA, 'auth.js'));
if (!authJs.includes('session.loginAt || session.login_at') || !authJs.includes('result.success || result.valid') || !authJs.includes("result._errorKind === 'offline'")) {
  fail('auth.js must accept loginAt/login_at, success/valid verifySession contracts, and keep local sessions during temporary offline/timeout checks.');
}
if (authJs.includes('const AUTH=***') || authJs.includes("AUTH_USER_KEY='***'") || authJs.includes('v5.5')) {
  fail('auth.js contains corrupted/redacted auth constants or stale login version text.');
}
const authGuardJs = readUtf8(path.join(PWA, 'auth_guard.js'));
if (authGuardJs.includes('***') || !authGuardJs.includes('const AUTH_ROLE_ALIASES = {')) {
  fail('auth_guard.js must not contain redacted role aliases.');
}
const adminPanelJs = readUtf8(path.join(PWA, 'admin_panel.js'));
if (!adminPanelJs.includes("data-tab=\"health\"") || !adminPanelJs.includes('renderMenuHealthPanel')) {
  fail('admin_panel.js must expose the Menu Health tab.');
}
const apiContractJs = readUtf8(path.join(PWA, 'api_contract.js'));
if (!apiContractJs.includes('COMPHONE_API_CONTRACT') || !apiContractJs.includes('protectedActions')) {
  fail('api_contract.js must publish COMPHONE_API_CONTRACT with protectedActions.');
}

const pcContractIndex = dashboardPcHtml.indexOf('api_contract.js');
const pcApiClientIndex = dashboardPcHtml.indexOf('api_client.js');
if (pcContractIndex === -1) fail('dashboard_pc.html must load api_contract.js.');
if (pcApiClientIndex === -1) fail('dashboard_pc.html must load api_client.js.');
if (pcContractIndex !== -1 && pcApiClientIndex !== -1 && pcContractIndex > pcApiClientIndex) {
  fail('dashboard_pc.html must load api_contract.js before api_client.js.');
}
if (!dashboardPcHtml.includes('dashboard_shared.css?')) {
  fail('dashboard_pc.html must cache-bust dashboard_shared.css.');
}
if (!dashboardPcHtml.includes('runtime_self_test.js?')) {
  fail('dashboard_pc.html must load runtime_self_test.js for PC settings health checks.');
}
if (dashboardPcHtml.includes('20260428_1130') || dashboardPcHtml.includes('v=282')) {
  fail('dashboard_pc.html contains stale cache-bust token.');
}
if (dashboardPcHtml.includes('localStorage.clear()')) {
  fail('dashboard_pc.html must not clear all localStorage during version changes.');
}
const dashboardPcCoreJs = fs.existsSync(path.join(PWA, 'dashboard_pc_core.js'))
  ? readUtf8(path.join(PWA, 'dashboard_pc_core.js'))
  : '';
const pcRuntimeSource = dashboardPcHtml + '\n' + dashboardPcCoreJs;
if (!pcRuntimeSource.includes("res._errorKind === 'offline'") ||
    (!pcRuntimeSource.includes('res.valid || res.success') && !pcRuntimeSource.includes('res.success || res.valid'))) {
  fail('PC dashboard runtime must accept success/valid session contracts and preserve local sessions on temporary offline/timeout checks.');
}
if (pcRuntimeSource.includes('MOCK LOGIN ONLY') || pcRuntimeSource.includes('Attempting login (MOCK MODE)') || pcRuntimeSource.includes('mock-token')) {
  fail('PC dashboard runtime must not create mock login sessions in production.');
}
const pcLoginFunctions = pcRuntimeSource.match(/function _doLogin\b/g) || [];
if (pcLoginFunctions.length !== 1) {
  fail('PC dashboard runtime must have exactly one real _doLogin function.');
}
if (!dashboardPcHtml.includes('dashboard_pc_core.js?') || dashboardPcHtml.includes('function _doLogin(') || dashboardPcHtml.includes('function loadSection(')) {
  fail('dashboard_pc.html must load dashboard_pc_core.js and must not duplicate core runtime functions inline.');
}
if (dashboardPcHtml.includes('serviceWorker.getRegistrations()') || dashboardPcHtml.includes('location.reload(true)')) {
  fail('dashboard_pc.html must not unregister service workers or force reload during boot.');
}
if ((!dashboardPcHtml.includes('updatePcVersionBadge') && !dashboardPcCoreJs.includes('updatePcVersionBadge')) ||
    !dashboardPcHtml.includes('id="version_badge"') ||
    dashboardPcHtml.includes('<div id="version_badge">v5.9.0-phase2d')) {
  fail('dashboard_pc.html must render version_badge from version_config.js at runtime.');
}
if (!apiContractJs.includes('getDashboardBundle')) {
  fail('api_contract.js should track getDashboardBundle for PC dashboard fallback health.');
}
if (!apiContractJs.includes('responseShape') || !apiContractJs.includes('generatePromptPayQR')) {
  fail('api_contract.js must include responseShape and billing actions for API matrix parity.');
}
if (!apiContractJs.includes('workflows') || !apiContractJs.includes('job_e2e') || !apiContractJs.includes('observability')) {
  fail('api_contract.js must include workflow contracts for data workflow stabilization.');
}
if (!apiContractJs.includes('smoke: false') || !apiContractJs.includes('smokeReason')) {
  fail('api_contract.js must mark record-specific actions that cannot be smoke-tested safely.');
}
if (!apiContractJs.includes('vision_ai') ||
    !apiContractJs.includes('getVisionDashboardStats') ||
    !apiContractJs.includes('getVisionReviewQueue') ||
    !apiContractJs.includes('getVisionFieldContext') ||
    !apiContractJs.includes('getVisionActionSuggestions') ||
    !apiContractJs.includes('linkVisionToJobTimeline') ||
    !apiContractJs.includes('runVisionPipeline') ||
    !apiContractJs.includes('verifyPaymentSlip')) {
  fail('api_contract.js must include AI Vision workflow contracts and protected Vision actions.');
}
if (!appJs.includes('getVisionDashboardStats') ||
    !appJs.includes('getVisionPipelineVersion') ||
    !appJs.includes('getVisionLearningVersion')) {
  fail('app.js READ_ACTIONS must classify AI Vision dashboard/version reads as read-only.');
}
if (!indexHtml.includes('section_vision.js?') ||
    !dashboardPcHtml.includes('section_vision.js?') ||
    !assetManifestJs.includes('section_vision.js')) {
  fail('PC/mobile must load and precache section_vision.js for the AI Vision UI.');
}
const sectionVisionJs = readUtf8(path.join(PWA, 'section_vision.js'));
if (!sectionVisionJs.includes('renderVisionSection') ||
    !sectionVisionJs.includes('renderMobileVisionPage') ||
    !sectionVisionJs.includes("visionApi('getVisionDashboardStats'") ||
    !sectionVisionJs.includes("visionApi('runVisionPipeline'") ||
    !sectionVisionJs.includes("visionApi('getVisionReviewQueue'") ||
    !sectionVisionJs.includes("visionApi('getVisionFieldContext'") ||
    !sectionVisionJs.includes("visionApi('getVisionActionSuggestions'") ||
    !sectionVisionJs.includes("visionApi('linkVisionToJobTimeline'") ||
    !sectionVisionJs.includes("visionApi('submitHumanReview'") ||
    !sectionVisionJs.includes('buildResultCards') ||
    !sectionVisionJs.includes('buildReviewQueue') ||
    !sectionVisionJs.includes('buildFieldContext') ||
    !sectionVisionJs.includes('buildActionSuggestions') ||
    !sectionVisionJs.includes('runVisionSuggestion') ||
    !sectionVisionJs.includes('checkVisionReadiness') ||
    !sectionVisionJs.includes('gemini_ok')) {
  fail('section_vision.js must render PC/mobile Vision panels and call Vision stats/pipeline actions.');
}

const smokeJs = readUtf8(path.join(ROOT, 'scripts', 'pwa_api_smoke.js'));
if (!smokeJs.includes('COMPHONE_SMOKE_REPORT') || !smokeJs.includes('AUTH_FAIL') || !smokeJs.includes('CONTRACT') || !smokeJs.includes('SKIP')) {
  fail('pwa_api_smoke.js must emit classified protected API smoke reports.');
}
const workflowSmokeJs = readUtf8(path.join(ROOT, 'scripts', 'pwa_workflow_smoke.js'));
if (!workflowSmokeJs.includes('COMPHONE_WORKFLOW_REPORT') || !workflowSmokeJs.includes('read-only') || !workflowSmokeJs.includes('latestJob')) {
  fail('pwa_workflow_smoke.js must provide read-only workflow smoke checks.');
}
const writeSmokeJs = readUtf8(path.join(ROOT, 'scripts', 'pwa_write_smoke.js'));
if (!writeSmokeJs.includes('COMPHONE_WRITE_SMOKE_CONFIRM') ||
    !writeSmokeJs.includes('CREATE_TEST_RECORDS') ||
    !writeSmokeJs.includes('client_request_id') ||
    !writeSmokeJs.includes('idempotent_replay')) {
  fail('pwa_write_smoke.js must gate destructive writes and verify idempotent replay.');
}
const visionAuditJs = readUtf8(path.join(ROOT, 'scripts', 'vision_capability_audit.js'));
if (!visionAuditJs.includes('Vision Capability Audit') ||
    !visionAuditJs.includes('getVisionDashboardStats') ||
    !visionAuditJs.includes('verifyPaymentSlip') ||
    !visionAuditJs.includes('COMPHONE_AUTH_TOKEN')) {
  fail('vision_capability_audit.js must validate AI Vision capability, protected routes, and token-aware runtime gaps.');
}
const visionRuntimeSmokeJs = readUtf8(path.join(ROOT, 'scripts', 'vision_runtime_smoke.js'));
if (!visionRuntimeSmokeJs.includes('Vision Runtime Smoke') ||
    !visionRuntimeSmokeJs.includes('getVisionDashboardStats') ||
    !visionRuntimeSmokeJs.includes('getVisionPipelineVersion') ||
    !visionRuntimeSmokeJs.includes('getVisionLearningVersion') ||
    !visionRuntimeSmokeJs.includes('getVisionReviewQueue') ||
    !visionRuntimeSmokeJs.includes('getVisionFieldContext') ||
    !visionRuntimeSmokeJs.includes('getVisionActionSuggestions') ||
    !visionRuntimeSmokeJs.includes('COMPHONE_AUTH_TOKEN') ||
    !visionRuntimeSmokeJs.includes('gemini_ok')) {
  fail('vision_runtime_smoke.js must provide token-aware read-only AI Vision runtime checks.');
}
const visionE2eSmokeJs = readUtf8(path.join(ROOT, 'scripts', 'vision_e2e_smoke.js'));
if (!visionE2eSmokeJs.includes('COMPHONE_VISION_E2E_CONFIRM') ||
    !visionE2eSmokeJs.includes('RUN_VISION_ANALYSIS') ||
    !visionE2eSmokeJs.includes('runVisionPipeline') ||
    !visionE2eSmokeJs.includes('vision-e2e-gate')) {
  fail('vision_e2e_smoke.js must gate AI Vision image analysis behind explicit confirmation.');
}
const runtimeSelfTestJs = readUtf8(path.join(PWA, 'runtime_self_test.js'));
if (!runtimeSelfTestJs.includes('ai-vision-runtime') ||
    !runtimeSelfTestJs.includes('getVisionDashboardStats') ||
    !runtimeSelfTestJs.includes('getVisionPipelineVersion') ||
    !runtimeSelfTestJs.includes('getVisionLearningVersion')) {
  fail('runtime_self_test.js must include browser-side AI Vision runtime checks.');
}
const offlineDbJs = readUtf8(path.join(PWA, 'offline_db.js'));
if (!offlineDbJs.includes('normalizeOfflineAction_') || !offlineDbJs.includes('const res = await callApi(item.action')) {
  fail('offline_db.js must normalize offline writes and replay through callApi without re-queuing failures.');
}
const errorBoundaryJs = readUtf8(path.join(PWA, 'error_boundary.js'));
if (!errorBoundaryJs.includes("if (typeof window.saveOfflineAction !== 'function')") ||
    !errorBoundaryJs.includes("if (typeof window.syncOfflineQueue !== 'function')")) {
  fail('error_boundary.js must not override the IndexedDB offline queue implementation.');
}
const jobsHandlerGs = readUtf8(path.join(ROOT, 'clasp-ready', 'JobsHandler.gs'));
if (!jobsHandlerGs.includes('getIdempotentReplay_') ||
    !jobsHandlerGs.includes('rememberIdempotentResult_') ||
    !jobsHandlerGs.includes("getIdempotentReplay_('openJob'") ||
    !jobsHandlerGs.includes("getIdempotentReplay_('createBilling'")) {
  fail('JobsHandler.gs must protect openJob/createBilling with idempotent client_request_id replay.');
}
const customerManagerGs = readUtf8(path.join(ROOT, 'clasp-ready', 'CustomerManager.gs'));
if (!customerManagerGs.includes("getIdempotentReplay_('createCustomer'") ||
    !customerManagerGs.includes("rememberIdempotentResult_('createCustomer'")) {
  fail('CustomerManager.gs must protect createCustomer with idempotent client_request_id replay.');
}
const menuHealthJs = readUtf8(path.join(PWA, 'menu_health.js'));
if (!menuHealthJs.includes('exportMenuHealthReport') || !menuHealthJs.includes('smoke === false') || !menuHealthJs.includes('menu-health-observe')) {
  fail('menu_health.js must support skipped smoke actions, observability summary, and exportable reports.');
}

if (failures.length) {
  console.error('[PWA Static Guard] FAILED');
  for (const item of failures) console.error(`- ${item}`);
  process.exit(1);
}

console.log('[PWA Static Guard] OK');
console.log(`- BUILD_TIMESTAMP: ${buildMatch ? buildMatch[1] : 'unknown'}`);
console.log(`- CACHE_VERSION: ${cacheMatch ? cacheMatch[1] : 'unknown'}`);
