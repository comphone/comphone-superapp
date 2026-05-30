const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PWA = path.join(ROOT, 'pwa');
const INDEX = path.join(PWA, 'index.html');
const DASHBOARD_PC = path.join(PWA, 'dashboard_pc.html');
const VERSION = path.join(PWA, 'version_config.js');
const SW = path.join(PWA, 'sw.js');
const ASSET_MANIFEST = path.join(PWA, 'pwa_asset_manifest.js');
const SCHEMA_REGISTRY = path.join(ROOT, 'docs', 'database_schema_registry.json');
const SPRINT108_GUARD = path.join(ROOT, 'scripts', 'sprint108_database_schema_registry_guard.js');
const SPRINT109_REPAIR = path.join(ROOT, 'scripts', 'sprint109_data_repair_console_plan.js');
const SPRINT111_REPAIR_EXECUTION = path.join(ROOT, 'scripts', 'sprint111_controlled_data_repair_execution.js');
const SPRINT112_ADMIN_REPAIR = path.join(ROOT, 'scripts', 'sprint112_admin_repair_console_audit.js');
const SPRINT113_REPAIR_LIVE_QA = path.join(ROOT, 'scripts', 'sprint113_repair_console_live_qa.js');
const SPRINT114_JOBS_POLISH = path.join(ROOT, 'scripts', 'sprint114_jobs_workflow_polish_audit.js');
const SPRINT115_BILLING_RESILIENCE = path.join(ROOT, 'scripts', 'sprint115_billing_resilience_audit.js');
const SPRINT116_REPORTS_DRILLDOWN = path.join(ROOT, 'scripts', 'sprint116_reports_drilldown_audit.js');
const SPRINT117_VISION_LINE_LOOP = path.join(ROOT, 'scripts', 'sprint117_vision_line_operational_loop_audit.js');
const SPRINT119_INVENTORY_PO_WARRANTY = path.join(ROOT, 'scripts', 'sprint119_inventory_po_warranty_audit.js');
const SPRINT120_SETTINGS_ADMIN_RUNTIME = path.join(ROOT, 'scripts', 'sprint120_settings_admin_runtime_audit.js');
const SPRINT121_PERFORMANCE_ACCESSIBILITY = path.join(ROOT, 'scripts', 'sprint121_performance_accessibility_audit.js');
const SPRINT122_DASHBOARD_OPERATOR_ANALYTICS = path.join(ROOT, 'scripts', 'sprint122_dashboard_operator_analytics_audit.js');
const SPRINT123_LIVE_VISUAL_QA = path.join(ROOT, 'scripts', 'sprint123_live_visual_qa_guard.js');
const SPRINT124_PROTECTED_VISUAL_MENU_QA = path.join(ROOT, 'scripts', 'sprint124_protected_visual_menu_qa.js');
const SPRINT125_ROLE_BASED_DASHBOARD_WIDGETS = path.join(ROOT, 'scripts', 'sprint125_role_based_dashboard_widgets_audit.js');
const SPRINT126_AI_VISION_ROLE_READINESS = path.join(ROOT, 'scripts', 'sprint126_ai_vision_role_readiness_audit.js');
const SPRINT127_VISION_LINE_NOTIFICATION_CONTROLS = path.join(ROOT, 'scripts', 'sprint127_vision_line_notification_controls_audit.js');
const SPRINT128_LINE_NOTIFICATION_TOGGLE_LIVE_QA = path.join(ROOT, 'scripts', 'sprint128_line_notification_toggle_live_qa.js');
const SPRINT129_VISION_LINE_SUPPRESSION_LIVE_QA = path.join(ROOT, 'scripts', 'sprint129_vision_line_suppression_live_qa.js');
const SPRINT131_LINE_REAL_SEND_READINESS = path.join(ROOT, 'scripts', 'sprint131_line_real_send_readiness.js');
const SPRINT132_CORE_WORKFLOW_LIVE_QA = path.join(ROOT, 'scripts', 'sprint132_core_workflow_live_qa.js');
const SPRINT133_SUPPORT_ADMIN_LIVE_QA = path.join(ROOT, 'scripts', 'sprint133_support_admin_live_qa.js');
const SPRINT134_DATA_COMPLETENESS_REVIEW = path.join(ROOT, 'scripts', 'sprint134_data_completeness_review.js');
const SPRINT135_DATA_COMPLETENESS_PANEL = path.join(ROOT, 'scripts', 'sprint135_data_completeness_panel_audit.js');
const SPRINT136_DATA_REVIEW_WORKFLOW = path.join(ROOT, 'scripts', 'sprint136_data_review_workflow_audit.js');
const SPRINT137_BACKEND_REVIEW_LOG = path.join(ROOT, 'scripts', 'sprint137_backend_review_log_audit.js');
const SPRINT138_BACKEND_REVIEW_LOG_LIVE_QA = path.join(ROOT, 'scripts', 'sprint138_backend_review_log_live_qa.js');
const SPRINT139_DATA_CLEANUP_TRIAGE = path.join(ROOT, 'scripts', 'sprint139_data_cleanup_triage.js');
const SPRINT140_JOBS_BILLING_REPORTS = path.join(ROOT, 'scripts', 'sprint140_jobs_billing_reports_live_polish.js');
const SPRINT141_MOBILE_MENU_DEEP_QA = path.join(ROOT, 'scripts', 'sprint141_mobile_menu_deep_qa.js');
const SPRINT142_AI_VISION_REAL_USE = path.join(ROOT, 'scripts', 'sprint142_ai_vision_real_use_readiness.js');
const SPRINT143_PERMISSION_OPS = path.join(ROOT, 'scripts', 'sprint143_permission_ops_hardening.js');
const SPRINT144_OWNER_DATA_RESOLUTION = path.join(ROOT, 'scripts', 'sprint144_owner_data_resolution.js');
const SPRINT145_MOBILE_UX_WALKTHROUGH = path.join(ROOT, 'scripts', 'sprint145_mobile_ux_walkthrough.js');
const SPRINT146_AI_VISION_PILOT = path.join(ROOT, 'scripts', 'sprint146_ai_vision_pilot_workflow.js');
const SPRINT147_DASHBOARD_DECISION_LAYER = path.join(ROOT, 'scripts', 'sprint147_dashboard_decision_layer_audit.js');
const SPRINT148_OPS_PERMISSION_CLEANUP = path.join(ROOT, 'scripts', 'sprint148_ops_permission_cleanup.js');
const SPRINT149_LIVE_BROWSER_VISUAL_QA = path.join(ROOT, 'scripts', 'sprint149_live_browser_visual_qa.js');
const SPRINT150_DATA_CLEANUP_OWNER_WORKFLOW = path.join(ROOT, 'scripts', 'sprint150_data_cleanup_owner_workflow.js');
const SPRINT151_DASHBOARD_UX_POLISH = path.join(ROOT, 'scripts', 'sprint151_dashboard_ux_polish_audit.js');
const SPRINT152_AI_VISION_REAL_PILOT = path.join(ROOT, 'scripts', 'sprint152_ai_vision_real_pilot_guard.js');
const SPRINT153_PERMISSION_FALLBACK_CLOSURE = path.join(ROOT, 'scripts', 'sprint153_permission_fallback_closure.js');

const mustExist = [INDEX, DASHBOARD_PC, VERSION, SW, ASSET_MANIFEST, SCHEMA_REGISTRY, SPRINT108_GUARD, SPRINT109_REPAIR, SPRINT111_REPAIR_EXECUTION, SPRINT112_ADMIN_REPAIR, SPRINT113_REPAIR_LIVE_QA, SPRINT114_JOBS_POLISH, SPRINT115_BILLING_RESILIENCE, SPRINT116_REPORTS_DRILLDOWN, SPRINT117_VISION_LINE_LOOP, SPRINT119_INVENTORY_PO_WARRANTY, SPRINT120_SETTINGS_ADMIN_RUNTIME, SPRINT121_PERFORMANCE_ACCESSIBILITY, SPRINT122_DASHBOARD_OPERATOR_ANALYTICS, SPRINT123_LIVE_VISUAL_QA, SPRINT124_PROTECTED_VISUAL_MENU_QA, SPRINT125_ROLE_BASED_DASHBOARD_WIDGETS, SPRINT126_AI_VISION_ROLE_READINESS, SPRINT127_VISION_LINE_NOTIFICATION_CONTROLS, SPRINT128_LINE_NOTIFICATION_TOGGLE_LIVE_QA, SPRINT129_VISION_LINE_SUPPRESSION_LIVE_QA, SPRINT131_LINE_REAL_SEND_READINESS, SPRINT132_CORE_WORKFLOW_LIVE_QA, SPRINT133_SUPPORT_ADMIN_LIVE_QA, SPRINT134_DATA_COMPLETENESS_REVIEW, SPRINT135_DATA_COMPLETENESS_PANEL, SPRINT136_DATA_REVIEW_WORKFLOW, SPRINT137_BACKEND_REVIEW_LOG, SPRINT138_BACKEND_REVIEW_LOG_LIVE_QA, SPRINT139_DATA_CLEANUP_TRIAGE, SPRINT140_JOBS_BILLING_REPORTS, SPRINT141_MOBILE_MENU_DEEP_QA, SPRINT142_AI_VISION_REAL_USE, SPRINT143_PERMISSION_OPS, SPRINT144_OWNER_DATA_RESOLUTION, SPRINT145_MOBILE_UX_WALKTHROUGH, SPRINT146_AI_VISION_PILOT, SPRINT147_DASHBOARD_DECISION_LAYER, SPRINT148_OPS_PERMISSION_CLEANUP, SPRINT149_LIVE_BROWSER_VISUAL_QA, SPRINT150_DATA_CLEANUP_OWNER_WORKFLOW, SPRINT151_DASHBOARD_UX_POLISH, SPRINT152_AI_VISION_REAL_PILOT, SPRINT153_PERMISSION_FALLBACK_CLOSURE];
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
for (const asset of indexStyles) {
  if (!manifestStyles.includes(asset)) fail(`pwa_asset_manifest.js styles is missing index.html stylesheet: ${asset}`);
  if (!manifestPrecache.includes(asset)) fail(`pwa_asset_manifest.js precache is missing index.html stylesheet: ${asset}`);
}
for (const asset of indexScripts) {
  if (!manifestScripts.includes(asset)) fail(`pwa_asset_manifest.js scripts is missing index.html script: ${asset}`);
  if (!manifestPrecache.includes(asset)) fail(`pwa_asset_manifest.js precache is missing index.html script: ${asset}`);
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

const filesToScan = ['index.html', 'dashboard_pc.html', 'version_config.js', 'sw.js', 'pwa_asset_manifest.js', 'api_contract.js', 'api_client.js', 'app.js', 'auth.js', 'auth_guard.js', 'app_home.js', 'admin_panel.js', 'menu_health.js', 'runtime_self_test.js', 'section_vision.js', 'section_line_center.js'];
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

const schemaRegistryJson = readUtf8(SCHEMA_REGISTRY);
const sprint108GuardJs = readUtf8(SPRINT108_GUARD);
const sprint109RepairJs = readUtf8(SPRINT109_REPAIR);
const sprint111RepairExecutionJs = readUtf8(SPRINT111_REPAIR_EXECUTION);
const sprint112AdminRepairJs = readUtf8(SPRINT112_ADMIN_REPAIR);
const sprint113RepairLiveQaJs = readUtf8(SPRINT113_REPAIR_LIVE_QA);
const sprint114JobsPolishJs = readUtf8(SPRINT114_JOBS_POLISH);
const sprint115BillingResilienceJs = readUtf8(SPRINT115_BILLING_RESILIENCE);
const sprint116ReportsDrilldownJs = readUtf8(SPRINT116_REPORTS_DRILLDOWN);
const sprint117VisionLineLoopJs = readUtf8(SPRINT117_VISION_LINE_LOOP);
const sprint119InventoryPoWarrantyJs = readUtf8(SPRINT119_INVENTORY_PO_WARRANTY);
const sprint120SettingsAdminRuntimeJs = readUtf8(SPRINT120_SETTINGS_ADMIN_RUNTIME);
const sprint121PerformanceAccessibilityJs = readUtf8(SPRINT121_PERFORMANCE_ACCESSIBILITY);
const sprint122DashboardOperatorAnalyticsJs = readUtf8(SPRINT122_DASHBOARD_OPERATOR_ANALYTICS);
const sprint123LiveVisualQaJs = readUtf8(SPRINT123_LIVE_VISUAL_QA);
const sprint124ProtectedVisualMenuQaJs = readUtf8(SPRINT124_PROTECTED_VISUAL_MENU_QA);
const sprint125RoleBasedDashboardWidgetsJs = readUtf8(SPRINT125_ROLE_BASED_DASHBOARD_WIDGETS);
const sprint126AiVisionRoleReadinessJs = readUtf8(SPRINT126_AI_VISION_ROLE_READINESS);
const sprint127VisionLineNotificationControlsJs = readUtf8(SPRINT127_VISION_LINE_NOTIFICATION_CONTROLS);
const sprint128LineNotificationToggleLiveQaJs = readUtf8(SPRINT128_LINE_NOTIFICATION_TOGGLE_LIVE_QA);
const sprint129VisionLineSuppressionLiveQaJs = readUtf8(SPRINT129_VISION_LINE_SUPPRESSION_LIVE_QA);
const sprint131LineRealSendReadinessJs = readUtf8(SPRINT131_LINE_REAL_SEND_READINESS);
const sprint132CoreWorkflowLiveQaJs = readUtf8(SPRINT132_CORE_WORKFLOW_LIVE_QA);
const sprint133SupportAdminLiveQaJs = readUtf8(SPRINT133_SUPPORT_ADMIN_LIVE_QA);
const sprint134DataCompletenessReviewJs = readUtf8(SPRINT134_DATA_COMPLETENESS_REVIEW);
const sprint135DataCompletenessPanelJs = readUtf8(SPRINT135_DATA_COMPLETENESS_PANEL);
const sprint136DataReviewWorkflowJs = readUtf8(SPRINT136_DATA_REVIEW_WORKFLOW);
const sprint137BackendReviewLogJs = readUtf8(SPRINT137_BACKEND_REVIEW_LOG);
const sprint138BackendReviewLogLiveQaJs = readUtf8(SPRINT138_BACKEND_REVIEW_LOG_LIVE_QA);
const sprint139DataCleanupTriageJs = readUtf8(SPRINT139_DATA_CLEANUP_TRIAGE);
const sprint140JobsBillingReportsJs = readUtf8(SPRINT140_JOBS_BILLING_REPORTS);
const sprint141MobileMenuDeepQaJs = readUtf8(SPRINT141_MOBILE_MENU_DEEP_QA);
const sprint142AiVisionRealUseJs = readUtf8(SPRINT142_AI_VISION_REAL_USE);
const sprint143PermissionOpsJs = readUtf8(SPRINT143_PERMISSION_OPS);
const sprint144OwnerDataResolutionJs = readUtf8(SPRINT144_OWNER_DATA_RESOLUTION);
const sprint145MobileUxWalkthroughJs = readUtf8(SPRINT145_MOBILE_UX_WALKTHROUGH);
const sprint146AiVisionPilotJs = readUtf8(SPRINT146_AI_VISION_PILOT);
const sprint147DashboardDecisionLayerJs = readUtf8(SPRINT147_DASHBOARD_DECISION_LAYER);
const sprint148OpsPermissionCleanupJs = readUtf8(SPRINT148_OPS_PERMISSION_CLEANUP);
const sprint149LiveBrowserVisualQaJs = readUtf8(SPRINT149_LIVE_BROWSER_VISUAL_QA);
const sprint150DataCleanupOwnerWorkflowJs = readUtf8(SPRINT150_DATA_CLEANUP_OWNER_WORKFLOW);
const sprint151DashboardUxPolishJs = readUtf8(SPRINT151_DASHBOARD_UX_POLISH);
const sprint152AiVisionRealPilotJs = readUtf8(SPRINT152_AI_VISION_REAL_PILOT);
const sprint153PermissionFallbackClosureJs = readUtf8(SPRINT153_PERMISSION_FALLBACK_CLOSURE);
if (!schemaRegistryJson.includes('"canonical_tables"') || !schemaRegistryJson.includes('"aliases"') || !schemaRegistryJson.includes('"DB_SS_ID"')) {
  fail('docs/database_schema_registry.json must define canonical_tables, aliases, and DB_SS_ID spreadsheet metadata.');
}
if (!sprint108GuardJs.includes('Sprint 108 Database Schema Registry Guard') ||
    !sprint108GuardJs.includes('unregistered-sheet-name') ||
    !sprint108GuardJs.includes('active-spreadsheet-context') ||
    !sprint108GuardJs.includes('COMPHONE_SCHEMA_STRICT')) {
  fail('scripts/sprint108_database_schema_registry_guard.js must guard unregistered sheets, active spreadsheet context drift, and strict schema mode.');
}
if (!sprint109RepairJs.includes('Sprint 109 Data Repair Console Plan') ||
    !sprint109RepairJs.includes('archive_before_change') ||
    !sprint109RepairJs.includes('production_mutation: false')) {
  fail('scripts/sprint109_data_repair_console_plan.js must stay read-only and require archive-before-change repair policy.');
}
if (!sprint111RepairExecutionJs.includes('Sprint 111 Controlled Data Repair Execution Guard') ||
    !sprint111RepairExecutionJs.includes('EXECUTE_REVIEWED_DATA_REPAIR') ||
    !sprint111RepairExecutionJs.includes('archive-before-change') ||
    !sprint111RepairExecutionJs.includes('DataRepairConsole.gs')) {
  fail('scripts/sprint111_controlled_data_repair_execution.js must guard the controlled data repair execution layer.');
}
if (!sprint112AdminRepairJs.includes('Sprint 112 Admin Repair Console Audit') ||
    !sprint112AdminRepairJs.includes('settings-data-repair-content') ||
    !sprint112AdminRepairJs.includes('renderDataRepairConsole_') ||
    !sprint112AdminRepairJs.includes('EXECUTE_REVIEWED_DATA_REPAIR')) {
  fail('scripts/sprint112_admin_repair_console_audit.js must guard PC/mobile Admin Repair Console UI safety.');
}
if (!sprint113RepairLiveQaJs.includes('Sprint 113 Repair Console Live QA') ||
    !sprint113RepairLiveQaJs.includes('single-build-timestamp') ||
    !sprint113RepairLiveQaJs.includes('pages_deploy_verify.js') ||
    !sprint113RepairLiveQaJs.includes('EXECUTE_REVIEWED_DATA_REPAIR')) {
  fail('scripts/sprint113_repair_console_live_qa.js must guard live repair console readiness and Pages freshness.');
}
if (!sprint114JobsPolishJs.includes('Sprint 114 Jobs Workflow Polish Audit') ||
    !sprint114JobsPolishJs.includes('detail-timeline-vision-billing-handoffs') ||
    !sprint114JobsPolishJs.includes('openMobileJobTimeline') ||
    !sprint114JobsPolishJs.includes('transitionJob')) {
  fail('scripts/sprint114_jobs_workflow_polish_audit.js must guard PC/mobile Jobs workflow continuity.');
}
if (!sprint115BillingResilienceJs.includes('Sprint 115 Billing Resilience Audit') ||
    !sprint115BillingResilienceJs.includes('billing-row-incomplete') ||
    !sprint115BillingResilienceJs.includes('Missing Job_ID - open Data Repair Console') ||
    !sprint115BillingResilienceJs.includes('safe-inline-job-id')) {
  fail('scripts/sprint115_billing_resilience_audit.js must guard incomplete Billing row resilience.');
}
if (!sprint116ReportsDrilldownJs.includes('Sprint 116 Reports Drilldown Audit') ||
    !sprint116ReportsDrilldownJs.includes('report-empty-state') ||
    !sprint116ReportsDrilldownJs.includes('No billing records for this period') ||
    !sprint116ReportsDrilldownJs.includes('getReportData')) {
  fail('scripts/sprint116_reports_drilldown_audit.js must guard Reports drilldown and diagnostic empty states.');
}
if (!sprint117VisionLineLoopJs.includes('Sprint 117 Vision + LINE Operational Loop Audit') ||
    !sprint117VisionLineLoopJs.includes('preview-first') ||
    !sprint117VisionLineLoopJs.includes('EXECUTE_VISION_SUGGESTION') ||
    !sprint117VisionLineLoopJs.includes('line-route-matrix')) {
  fail('scripts/sprint117_vision_line_operational_loop_audit.js must guard preview-first Vision and LINE operational loops.');
}
if (!sprint119InventoryPoWarrantyJs.includes('Sprint 119 Inventory / PO / Warranty Workflow Hardening Audit') ||
    !sprint119InventoryPoWarrantyJs.includes('po-no-ai-executor-fallback') ||
    !sprint119InventoryPoWarrantyJs.includes('warranty-detail-contract-safe') ||
    !sprint119InventoryPoWarrantyJs.includes('Inventory/PO/Warranty')) {
  fail('scripts/sprint119_inventory_po_warranty_audit.js must guard Inventory, PO, and Warranty workflow hardening.');
}
if (!sprint120SettingsAdminRuntimeJs.includes('Sprint 120 Settings/Admin Runtime Audit') ||
    !sprint120SettingsAdminRuntimeJs.includes('pc-settings-live-summary') ||
    !sprint120SettingsAdminRuntimeJs.includes('mobile-admin-operations-tabs') ||
    !sprint120SettingsAdminRuntimeJs.includes('Settings/Admin')) {
  fail('scripts/sprint120_settings_admin_runtime_audit.js must guard Settings/Admin runtime hardening.');
}
if (!sprint121PerformanceAccessibilityJs.includes('Sprint 121 Performance + Accessibility Audit') ||
    !sprint121PerformanceAccessibilityJs.includes('page-loading-watchdog') ||
    !sprint121PerformanceAccessibilityJs.includes('touch-focus-reduced-motion') ||
    !sprint121PerformanceAccessibilityJs.includes('Performance/Accessibility')) {
  fail('scripts/sprint121_performance_accessibility_audit.js must guard performance and accessibility hardening.');
}
if (!sprint122DashboardOperatorAnalyticsJs.includes('Sprint 122 Dashboard Operator Analytics Audit') ||
    !sprint122DashboardOperatorAnalyticsJs.includes('pc-operator-insight-strip') ||
    !sprint122DashboardOperatorAnalyticsJs.includes('mobile-operator-pulse') ||
    !sprint122DashboardOperatorAnalyticsJs.includes('Dashboard Operator Analytics')) {
  fail('scripts/sprint122_dashboard_operator_analytics_audit.js must guard dashboard operator analytics polish.');
}
if (!sprint123LiveVisualQaJs.includes('Sprint 123 Live Visual QA Guard') ||
    !sprint123LiveVisualQaJs.includes('mobile-asset-manifest-complete') ||
    !sprint123LiveVisualQaJs.includes('quick-actions-backed-by-real-surfaces') ||
    !sprint123LiveVisualQaJs.includes('Live Visual QA')) {
  fail('scripts/sprint123_live_visual_qa_guard.js must guard live visual QA contracts.');
}
if (!sprint124ProtectedVisualMenuQaJs.includes('Sprint 124 Protected Visual/Menu QA') ||
    !sprint124ProtectedVisualMenuQaJs.includes('COMPHONE_AUTH_TOKEN') ||
    !sprint124ProtectedVisualMenuQaJs.includes('MENU_STEPS') ||
    !sprint124ProtectedVisualMenuQaJs.includes('protected visual/menu QA')) {
  fail('scripts/sprint124_protected_visual_menu_qa.js must guard token-aware protected visual/menu QA.');
}
if (!sprint125RoleBasedDashboardWidgetsJs.includes('Sprint 125 Role-Based Dashboard Widgets Audit') ||
    !sprint125RoleBasedDashboardWidgetsJs.includes('pc-role-widget-renderer') ||
    !sprint125RoleBasedDashboardWidgetsJs.includes('mobile-role-widget-renderer') ||
    !sprint125RoleBasedDashboardWidgetsJs.includes('Role-Based Dashboard Widgets')) {
  fail('scripts/sprint125_role_based_dashboard_widgets_audit.js must guard role-based dashboard widgets.');
}
if (!sprint126AiVisionRoleReadinessJs.includes('Sprint 126 AI Vision + Role Readiness Audit') ||
    !sprint126AiVisionRoleReadinessJs.includes('vision-analysis-gated') ||
    !sprint126AiVisionRoleReadinessJs.includes('runtime-smoke-boundary') ||
    !sprint126AiVisionRoleReadinessJs.includes('AI Vision read-runtime ready; real image analysis remains confirmation-gated')) {
  fail('scripts/sprint126_ai_vision_role_readiness_audit.js must guard AI Vision readiness and role-dashboard operating boundaries.');
}
if (!sprint127VisionLineNotificationControlsJs.includes('Sprint 127 Vision + LINE Notification Controls Audit') ||
    !sprint127VisionLineNotificationControlsJs.includes('mute-suppresses-only-push') ||
    !sprint127VisionLineNotificationControlsJs.includes('notification-only-toggle')) {
  fail('scripts/sprint127_vision_line_notification_controls_audit.js must guard muted LINE room notification behavior.');
}
if (!sprint128LineNotificationToggleLiveQaJs.includes('Sprint 128 LINE Notification Toggle Live QA') ||
    !sprint128LineNotificationToggleLiveQaJs.includes('RUN_NOTIFICATION_TOGGLE_ROLLBACK') ||
    !sprint128LineNotificationToggleLiveQaJs.includes('toggle-with-rollback') ||
    !sprint128LineNotificationToggleLiveQaJs.includes('previewLineRoomMessage')) {
  fail('scripts/sprint128_line_notification_toggle_live_qa.js must guard token-aware notification toggle rollback QA.');
}
if (!sprint129VisionLineSuppressionLiveQaJs.includes('Sprint 129 AI Vision LINE Suppression Live QA') ||
    !sprint129VisionLineSuppressionLiveQaJs.includes('RUN_MUTED_VISION_NOTIFICATION') ||
    !sprint129VisionLineSuppressionLiveQaJs.includes('executeVisionSuggestion') ||
    !sprint129VisionLineSuppressionLiveQaJs.includes('muted-vision-notification-with-rollback')) {
  fail('scripts/sprint129_vision_line_suppression_live_qa.js must guard muted AI Vision LINE notification proof with rollback.');
}
if (!sprint131LineRealSendReadinessJs.includes('Sprint 131 LINE Real-Send Readiness') ||
    !sprint131LineRealSendReadinessJs.includes('OWNER_APPROVED_REAL_LINE_SEND') ||
    !sprint131LineRealSendReadinessJs.includes('CONFIRM_REQUIRED') ||
    !sprint131LineRealSendReadinessJs.includes('muted-send') ||
    !sprint131LineRealSendReadinessJs.includes('real outbound LINE send skipped')) {
  fail('scripts/sprint131_line_real_send_readiness.js must keep real LINE sends owner-gated and prove muted send suppression safely.');
}
if (!sprint132CoreWorkflowLiveQaJs.includes('Sprint 132 Core Workflow Live QA') ||
    !sprint132CoreWorkflowLiveQaJs.includes('Jobs -> Billing -> Reports -> AI Vision -> LINE Center') ||
    !sprint132CoreWorkflowLiveQaJs.includes('checkJobs') ||
    !sprint132CoreWorkflowLiveQaJs.includes('getBilling') ||
    !sprint132CoreWorkflowLiveQaJs.includes('getReportData') ||
    !sprint132CoreWorkflowLiveQaJs.includes('getVisionActionSuggestions') ||
    !sprint132CoreWorkflowLiveQaJs.includes('previewLineRoomMessage')) {
  fail('scripts/sprint132_core_workflow_live_qa.js must guard the protected Jobs/Billing/Reports/Vision/LINE read-only workflow chain.');
}
if (!sprint133SupportAdminLiveQaJs.includes('Sprint 133 Support/Admin Live QA') ||
    !sprint133SupportAdminLiveQaJs.includes('Inventory -> Purchase Orders -> Warranty -> Admin Settings') ||
    !sprint133SupportAdminLiveQaJs.includes('inventoryOverview') ||
    !sprint133SupportAdminLiveQaJs.includes('listPurchaseOrders') ||
    !sprint133SupportAdminLiveQaJs.includes('listWarranties') ||
    !sprint133SupportAdminLiveQaJs.includes('getSecurityStatus') ||
    !sprint133SupportAdminLiveQaJs.includes('previewDataRepair')) {
  fail('scripts/sprint133_support_admin_live_qa.js must guard the protected Inventory/PO/Warranty/Admin read-only workflow chain.');
}
if (!sprint134DataCompletenessReviewJs.includes('Sprint 134 Data Completeness Review') ||
    !sprint134DataCompletenessReviewJs.includes('Billing detail linkage') ||
    !sprint134DataCompletenessReviewJs.includes('Warranty detail linkage') ||
    !sprint134DataCompletenessReviewJs.includes('current-month report revenue rows') ||
    !sprint134DataCompletenessReviewJs.includes('previewDataRepair') ||
    !sprint134DataCompletenessReviewJs.includes('COMPHONE_DATA_COMPLETENESS_FAIL_ON_GAP')) {
  fail('scripts/sprint134_data_completeness_review.js must preserve read-only Billing/Reports/Warranty/Data Repair completeness review coverage.');
}
if (!sprint135DataCompletenessPanelJs.includes('Sprint 135 Data Completeness Panel Audit') ||
    !sprint135DataCompletenessPanelJs.includes('settings-data-completeness-content') ||
    !sprint135DataCompletenessPanelJs.includes('admin-data-completeness') ||
    !sprint135DataCompletenessPanelJs.includes('business-data warnings') ||
    !sprint135DataCompletenessPanelJs.includes('executeDataRepair')) {
  fail('scripts/sprint135_data_completeness_panel_audit.js must guard PC/mobile Data Completeness panels and repair separation.');
}
if (!sprint136DataReviewWorkflowJs.includes('Sprint 136 Data Review Workflow Audit') ||
    !sprint136DataReviewWorkflowJs.includes('exportSettingsDataCompletenessReview') ||
    !sprint136DataReviewWorkflowJs.includes('exportAdminDataCompletenessReview_') ||
    !sprint136DataReviewWorkflowJs.includes('comphone_data_completeness_reviews') ||
    !sprint136DataReviewWorkflowJs.includes('no-repair-in-review-workflow')) {
  fail('scripts/sprint136_data_review_workflow_audit.js must guard export, notes, reviewed state, deep links, and no-repair review workflow.');
}
if (!sprint137BackendReviewLogJs.includes('Sprint 137 Backend Review Log Audit') ||
    !sprint137BackendReviewLogJs.includes('DB_DATA_REVIEW_LOG') ||
    !sprint137BackendReviewLogJs.includes('getDataReviewLog') ||
    !sprint137BackendReviewLogJs.includes('saveDataReviewLog') ||
    !sprint137BackendReviewLogJs.includes('script_properties_fallback') ||
    !sprint137BackendReviewLogJs.includes('review-log-not-repair')) {
  fail('scripts/sprint137_backend_review_log_audit.js must guard durable backend review log and no-repair behavior.');
}
if (!sprint138BackendReviewLogLiveQaJs.includes('Sprint 138 Backend Review Log Live QA') ||
    !sprint138BackendReviewLogLiveQaJs.includes('COMPHONE_AUTH_TOKEN') ||
    !sprint138BackendReviewLogLiveQaJs.includes('review-log-live-qa-no-repair-execution') ||
    !sprint138BackendReviewLogLiveQaJs.includes('getDataReviewLog') ||
    !sprint138BackendReviewLogLiveQaJs.includes('saveDataReviewLog') ||
    !sprint138BackendReviewLogLiveQaJs.includes('previewDataRepair')) {
  fail('scripts/sprint138_backend_review_log_live_qa.js must guard token-aware backend review log live QA without repair execution.');
}
if (!sprint139DataCleanupTriageJs.includes('Sprint 139 Data Cleanup Triage') ||
    !sprint139DataCleanupTriageJs.includes('manual_backfill') ||
    !sprint139DataCleanupTriageJs.includes('controlled_repair_candidate') ||
    !sprint139DataCleanupTriageJs.includes('production_mutation: false')) {
  fail('scripts/sprint139_data_cleanup_triage.js must classify data gaps without production mutation.');
}
if (!sprint140JobsBillingReportsJs.includes('Sprint 140 Jobs -> Billing -> Reports Live Polish') ||
    !sprint140JobsBillingReportsJs.includes('checkJobs') ||
    !sprint140JobsBillingReportsJs.includes('listBillings') ||
    !sprint140JobsBillingReportsJs.includes('getReportData')) {
  fail('scripts/sprint140_jobs_billing_reports_live_polish.js must guard the Jobs/Billing/Reports chain.');
}
if (!sprint141MobileMenuDeepQaJs.includes('Sprint 141 Mobile Menu Deep QA') ||
    !sprint141MobileMenuDeepQaJs.includes('ROUTES') ||
    !sprint141MobileMenuDeepQaJs.includes('blank-page') ||
    !sprint141MobileMenuDeepQaJs.includes('COMPHONE_AUTH_TOKEN')) {
  fail('scripts/sprint141_mobile_menu_deep_qa.js must guard mobile route/page and protected menu action readiness.');
}
if (!sprint142AiVisionRealUseJs.includes('Sprint 142 AI Vision Real-Use Readiness') ||
    !sprint142AiVisionRealUseJs.includes('preview-first') ||
    !sprint142AiVisionRealUseJs.includes('OWNER_APPROVED_REAL_LINE_SEND') ||
    !sprint142AiVisionRealUseJs.includes('no-real-send')) {
  fail('scripts/sprint142_ai_vision_real_use_readiness.js must guard AI Vision real-use and no-real-send boundaries.');
}
if (!sprint143PermissionOpsJs.includes('Sprint 143 Permission & Ops Hardening') ||
    !sprint143PermissionOpsJs.includes('script_properties_fallback') ||
    !sprint143PermissionOpsJs.includes('no-google-api-key-leak') ||
    !sprint143PermissionOpsJs.includes('saveDataReviewLog')) {
  fail('scripts/sprint143_permission_ops_hardening.js must guard permissions, fallback visibility, and secret hygiene.');
}
if (!sprint144OwnerDataResolutionJs.includes('Sprint 144 Owner Data Resolution') ||
    !sprint144OwnerDataResolutionJs.includes('owner-data-resolution-no-production-mutation') ||
    !sprint144OwnerDataResolutionJs.includes('requires_owner_approval') ||
    !sprint144OwnerDataResolutionJs.includes('repair-execution-is-not-invoked')) {
  fail('scripts/sprint144_owner_data_resolution.js must convert cleanup findings into an owner-approved non-mutating plan.');
}
if (!sprint145MobileUxWalkthroughJs.includes('Sprint 145 Mobile UX Walkthrough') ||
    !sprint145MobileUxWalkthroughJs.includes('mobile-ux-walkthrough-read-only') ||
    !sprint145MobileUxWalkthroughJs.includes('showQuickActionSettings') ||
    !sprint145MobileUxWalkthroughJs.includes('page-load-diagnostic')) {
  fail('scripts/sprint145_mobile_ux_walkthrough.js must guard mobile UX, quick actions, restore, and blank-page diagnostics.');
}
if (!sprint146AiVisionPilotJs.includes('Sprint 146 AI Vision Pilot Workflow') ||
    !sprint146AiVisionPilotJs.includes('ai-vision-pilot-no-real-send') ||
    !sprint146AiVisionPilotJs.includes('getLineRoomStatus') ||
    !sprint146AiVisionPilotJs.includes('previewLineRoomMessage') ||
    !sprint146AiVisionPilotJs.includes('CONFIRM_REQUIRED')) {
  fail('scripts/sprint146_ai_vision_pilot_workflow.js must guard Vision pilot flow with LINE preview and no real send.');
}
if (!sprint147DashboardDecisionLayerJs.includes('Sprint 147 Dashboard Decision Layer Audit') ||
    !sprint147DashboardDecisionLayerJs.includes('dashboard-decision-layer') ||
    !sprint147DashboardDecisionLayerJs.includes('renderDashboardDecisionLayer') ||
    !sprint147DashboardDecisionLayerJs.includes('decision-layer-read-only')) {
  fail('scripts/sprint147_dashboard_decision_layer_audit.js must guard the dashboard decision layer.');
}
if (!sprint148OpsPermissionCleanupJs.includes('Sprint 148 Ops Permission Cleanup') ||
    !sprint148OpsPermissionCleanupJs.includes('ops-permission-cleanup-readiness') ||
    !sprint148OpsPermissionCleanupJs.includes('DB_DATA_REVIEW_LOG') ||
    !sprint148OpsPermissionCleanupJs.includes('no-google-api-key-leak')) {
  fail('scripts/sprint148_ops_permission_cleanup.js must guard ops permission cleanup and secret hygiene.');
}
if (!sprint149LiveBrowserVisualQaJs.includes('Sprint 149 Live Browser Visual QA') ||
    !sprint149LiveBrowserVisualQaJs.includes('live-browser-visual-qa-read-only') ||
    !sprint149LiveBrowserVisualQaJs.includes('COMPHONE_PAGES_BASE') ||
    !sprint149LiveBrowserVisualQaJs.includes('protected route read probes')) {
  fail('scripts/sprint149_live_browser_visual_qa.js must guard live Pages visual readiness and protected read probes.');
}
if (!sprint150DataCleanupOwnerWorkflowJs.includes('Sprint 150 Data Cleanup Owner Workflow') ||
    !sprint150DataCleanupOwnerWorkflowJs.includes('data-cleanup-owner-workflow-no-mutation') ||
    !sprint150DataCleanupOwnerWorkflowJs.includes('jobs:J0022') ||
    !sprint150DataCleanupOwnerWorkflowJs.includes('does-not-execute-repair')) {
  fail('scripts/sprint150_data_cleanup_owner_workflow.js must guard owner-approved data cleanup without mutation.');
}
if (!sprint151DashboardUxPolishJs.includes('Sprint 151 Dashboard UX Polish Audit') ||
    !sprint151DashboardUxPolishJs.includes('mobile-decision-layer') ||
    !sprint151DashboardUxPolishJs.includes('renderMobileDecisionLayer') ||
    !sprint151DashboardUxPolishJs.includes('decision-layers-read-only')) {
  fail('scripts/sprint151_dashboard_ux_polish_audit.js must guard PC/Mobile dashboard decision-layer UX.');
}
if (!sprint152AiVisionRealPilotJs.includes('Sprint 152 AI Vision Real Pilot Guard') ||
    !sprint152AiVisionRealPilotJs.includes('COMPHONE_AI_VISION_REAL_PILOT_CONFIRM') ||
    !sprint152AiVisionRealPilotJs.includes('ai-vision-real-pilot-guard-no-real-line-send') ||
    !sprint152AiVisionRealPilotJs.includes('runVisionPipeline')) {
  fail('scripts/sprint152_ai_vision_real_pilot_guard.js must guard the gated AI Vision real pilot.');
}
if (!sprint153PermissionFallbackClosureJs.includes('Sprint 153 Permission Fallback Closure') ||
    !sprint153PermissionFallbackClosureJs.includes('permission-fallback-closure-readiness') ||
    !sprint153PermissionFallbackClosureJs.includes('fallback-retirement-ready') ||
    !sprint153PermissionFallbackClosureJs.includes('DB_DATA_REVIEW_LOG')) {
  fail('scripts/sprint153_permission_fallback_closure.js must guard review-log fallback closure readiness.');
}
if (!dashboardJs.includes('renderDashboardDecisionLayer') ||
    !dashboardJs.includes('buildDashboardDecisionItems') ||
    !dashboardJs.includes('dashboard-decision-layer') ||
    !dashboardJs.includes('decision-priority')) {
  fail('pwa/dashboard.js must render the Sprint 147 dashboard decision layer.');
}
const appHomeJs = readUtf8(path.join(PWA, 'app_home.js'));
const mobileGlassCss = readUtf8(path.join(PWA, 'mobile_glass.css'));
if (!appHomeJs.includes('renderMobileDecisionLayer') ||
    !appHomeJs.includes('buildMobileDecisionItems') ||
    !appHomeJs.includes('data-mobile-decision-layer') ||
    !mobileGlassCss.includes('.mobile-decision-layer')) {
  fail('Mobile home must render and style the Sprint 151 decision layer.');
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
    !apiContractJs.includes('previewVisionSuggestion') ||
    !apiContractJs.includes('linkVisionToJobTimeline') ||
    !apiContractJs.includes('executeVisionSuggestion') ||
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
if (!indexHtml.includes('section_line_center.js?') ||
    !dashboardPcHtml.includes('section_line_center.js?') ||
    !assetManifestJs.includes('section_line_center.js') ||
    !apiContractJs.includes('getLineCommandCenter') ||
    !apiContractJs.includes('sendLineRoomMessage')) {
  fail('PC/mobile must load, precache, and contract the LINE Command Center UI/actions.');
}
const runtimeSelfTestLineJs = readUtf8(path.join(PWA, 'runtime_self_test.js'));
if (!runtimeSelfTestLineJs.includes("id: 'line-command-center'") ||
    !runtimeSelfTestLineJs.includes("id: 'pages-freshness'") ||
    !runtimeSelfTestLineJs.includes("callApi('getLineCommandCenter'") ||
    !runtimeSelfTestLineJs.includes('version_config.js?runtime=')) {
  fail('runtime_self_test.js must verify LINE Center and GitHub Pages freshness from the live browser runtime.');
}
const sectionVisionJs = readUtf8(path.join(PWA, 'section_vision.js'));
if (!sectionVisionJs.includes('renderVisionSection') ||
    !sectionVisionJs.includes('renderMobileVisionPage') ||
    !sectionVisionJs.includes("visionApi('getVisionDashboardStats'") ||
    !sectionVisionJs.includes("visionApi('runVisionPipeline'") ||
    !sectionVisionJs.includes("visionApi('getVisionReviewQueue'") ||
    !sectionVisionJs.includes("visionApi('getVisionFieldContext'") ||
    !sectionVisionJs.includes("visionApi('getVisionActionSuggestions'") ||
    !sectionVisionJs.includes("visionApi('previewVisionSuggestion'") ||
    !sectionVisionJs.includes("visionApi('linkVisionToJobTimeline'") ||
    !sectionVisionJs.includes("visionApi('executeVisionSuggestion'") ||
    !sectionVisionJs.includes("visionApi('submitHumanReview'") ||
    !sectionVisionJs.includes('buildResultCards') ||
    !sectionVisionJs.includes('buildReviewQueue') ||
    !sectionVisionJs.includes('buildFieldContext') ||
    !sectionVisionJs.includes('buildActionSuggestions') ||
    !sectionVisionJs.includes('runVisionSuggestion') ||
    !sectionVisionJs.includes('EXECUTE_VISION_SUGGESTION') ||
    !sectionVisionJs.includes('formatVisionPreviewText') ||
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
if (!writeSmokeJs.includes("'addQuickNote'") ||
    !writeSmokeJs.includes("'transitionJob'") ||
    !writeSmokeJs.includes("'getJobTimeline'") ||
    !writeSmokeJs.includes('nextSafeJobStatus')) {
  fail('pwa_write_smoke.js must cover safe job note/status handoffs and timeline read-back.');
}
const smokeCleanupGs = readUtf8(path.join(ROOT, 'clasp-ready', 'SmokeCleanup.gs'));
if (!smokeCleanupGs.includes('groups.billings') ||
    !smokeCleanupGs.includes('groups.purchase_orders') ||
    !smokeCleanupGs.includes('Billing_ID') ||
    !smokeCleanupGs.includes('PO_ID')) {
  fail('SmokeCleanup.gs must archive/delete reviewed smoke rows across Jobs, Customers, Billing, and PO.');
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
const lineRoomSmokeJs = readUtf8(path.join(ROOT, 'scripts', 'pwa_line_room_smoke.js'));
if (!lineRoomSmokeJs.includes('COMPHONE_LINE_SEND_CONFIRM') ||
    !lineRoomSmokeJs.includes('SEND_TEST_LINE_MESSAGE') ||
    !lineRoomSmokeJs.includes('previewLineRoomMessage') ||
    !lineRoomSmokeJs.includes('sendLineRoomMessage') ||
    !lineRoomSmokeJs.includes('line-smoke-gate')) {
  fail('pwa_line_room_smoke.js must gate real LINE room sends and verify read-only preview flow.');
}
for (const [fileName, marker, tokenAware] of [
  ['sprint154_post_deploy_pages_confirmation.js', 'Post-Deploy Pages Confirmation', false],
  ['sprint155_owner_data_backfill_readiness.js', 'Owner Data Backfill Readiness', true],
  ['sprint156_mobile_menu_e2e_guard.js', 'Mobile Menu E2E Guard', true],
  ['sprint157_pc_dashboard_workflow_guard.js', 'PC Dashboard Workflow Guard', true],
  ['sprint158_ai_vision_line_room_control_guard.js', 'AI Vision + LINE Room Control Guard', true],
  ['sprint159_post_deploy_publish_confirmation.js', 'Post-Deploy Publish Confirmation', false],
  ['sprint160_real_browser_clickthrough_contract.js', 'Real Browser Click-Through Contract', true],
  ['sprint161_protected_live_token_sweep.js', 'Protected Live Token Sweep', true],
  ['sprint162_owner_data_cleanup_decision.js', 'Owner Data Cleanup Decision', true],
  ['sprint163_ai_vision_real_sample_pilot.js', 'AI Vision Real Sample Pilot', true],
  ['sprint164_pages_publish_lock.js', 'Pages Publish Lock', false],
  ['sprint165_browser_profile_clickthrough_pack.js', 'Browser/Profile Click-Through Pack', true],
  ['sprint166_protected_token_full_sweep_pack.js', 'Protected Token Full Sweep Pack', true],
  ['sprint167_owner_cleanup_execution_readiness.js', 'Owner Cleanup Execution Readiness', false],
  ['sprint168_ai_vision_real_sample_runbook.js', 'AI Vision Real Sample Runbook', false],
  ['sprint169_pages_fresh_release_gate.js', 'Pages Fresh Release Gate', false],
  ['sprint170_protected_browser_acceptance_gate.js', 'Protected Browser Acceptance Gate', true],
  ['sprint171_ai_vision_sample_evidence_contract.js', 'AI Vision Sample Evidence Contract', false],
  ['sprint172_line_room_notification_matrix_gate.js', 'LINE Room Notification Matrix Gate', false],
  ['sprint173_release_readiness_master_gate.js', 'Release Readiness Master Gate', false],
  ['sprint174_strict_protected_browser_runbook.js', 'Strict Protected Browser Runbook', true],
  ['sprint175_ai_vision_sample_pilot_gate.js', 'AI Vision Sample Pilot Gate', true],
  ['sprint176_published_protected_acceptance.js', 'Published Protected Acceptance', true],
  ['sprint177_ai_vision_real_sample_evidence.js', 'AI Vision Real Sample Evidence', true],
  ['sprint178_strict_live_acceptance_gate.js', 'Strict Live Acceptance Gate', true],
  ['sprint179_ai_vision_real_sample_execution.js', 'AI Vision Real Sample Execution', true],
  ['sprint180_strict_protected_live_proof.js', 'Strict Protected Live Proof', true],
  ['sprint181_ai_vision_owner_sample_run.js', 'AI Vision Owner Sample Run', true],
  ['sprint182_smoke_cleanup_execution.js', 'Sprint 182 Smoke Cleanup Execution', true],
  ['sprint183_line_ai_vision_ingress_guard.js', 'Sprint 183 LINE AI Vision Ingress Guard', true],
  ['sprint185_line_group_image_pilot.js', 'Sprint 185 LINE Group Image Pilot', true],
  ['sprint190_ai_vision_review_inbox_guard.js', 'AI Vision Review Inbox', false],
  ['sprint191_ai_vision_inbox_render_smoke.js', 'AI Vision Inbox Render Smoke', false],
  ['sprint192_mobile_dashboard_simplification_guard.js', 'Mobile Dashboard Simplification', false],
]) {
  const body = readUtf8(path.join(ROOT, 'scripts', fileName));
  if (!body.includes(marker) || (tokenAware && !body.includes('COMPHONE_AUTH_TOKEN'))) {
    fail(`${fileName} must document and guard ${marker}.`);
  }
}
if (!adminPanelJs.includes('Smoke/Test Data Cleanup') ||
    !adminPanelJs.includes('executeAdminSmokeCleanup_') ||
    !readUtf8(path.join(PWA, 'section_settings.js')).includes('executeSettingsSmokeCleanup_')) {
  fail('PC Settings and Mobile Admin must expose owner-confirmed smoke/test data cleanup controls.');
}
if (!apiContractJs.includes('getVisionLineIngressStatus') ||
    !readUtf8(path.join(ROOT, 'clasp-ready', 'PhotoQueue.gs')).includes('getVisionLineIngressStatus') ||
    !readUtf8(path.join(ROOT, 'clasp-ready', 'RouterSplit.gs')).includes('getVisionLineIngressStatus')) {
  fail('AI Vision LINE ingress status must be exposed through GAS and the PWA API contract.');
}
const runtimeSelfTestJs = readUtf8(path.join(PWA, 'runtime_self_test.js'));
if (!runtimeSelfTestJs.includes('ai-vision-runtime') ||
    !runtimeSelfTestJs.includes('getVisionDashboardStats') ||
    !runtimeSelfTestJs.includes('getVisionPipelineVersion') ||
    !runtimeSelfTestJs.includes('getVisionLearningVersion')) {
  fail('runtime_self_test.js must include browser-side AI Vision runtime checks.');
}
const sprint98AuditJs = readUtf8(path.join(ROOT, 'scripts', 'sprint98_operator_workflow_audit.js'));
if (!sprint98AuditJs.includes('Sprint 98 Operator Workflow Audit') ||
    !sprint98AuditJs.includes('executive-command-center') ||
    !sprint98AuditJs.includes('line-route-matrix') ||
    !sprint98AuditJs.includes('vision-operational-loop')) {
  fail('sprint98_operator_workflow_audit.js must guard Jobs/Billing, mobile, PC dashboard, LINE, and Vision workflow polish.');
}
const sprint99AuditJs = readUtf8(path.join(ROOT, 'scripts', 'sprint99_live_readiness_audit.js'));
if (!sprint99AuditJs.includes('Sprint 99 Live Readiness Audit') ||
    !sprint99AuditJs.includes('single-build-timestamp') ||
    !sprint99AuditJs.includes('legacy-quick-actions-migration') ||
    !sprint99AuditJs.includes('command-center-live-surface')) {
  fail('sprint99_live_readiness_audit.js must guard live cache freshness, quick-action migration, and PC command-center readiness.');
}
const sprint100AuditJs = readUtf8(path.join(ROOT, 'scripts', 'sprint100_operator_menu_audit.js'));
if (!sprint100AuditJs.includes('Sprint 100 Operator Menu Audit') ||
    !sprint100AuditJs.includes('Jobs -> Billing -> Reports -> AI Vision -> LINE Center') ||
    !sprint100AuditJs.includes('billing-read-write-payment-surface') ||
    !sprint100AuditJs.includes('line-read-preview-safe-send')) {
  fail('sprint100_operator_menu_audit.js must guard priority menu click-through readiness across Jobs, Billing, Reports, Vision, and LINE.');
}
const sprint101AuditJs = readUtf8(path.join(ROOT, 'scripts', 'sprint101_write_lifecycle_audit.js'));
if (!sprint101AuditJs.includes('Sprint 101 Write Lifecycle Audit') ||
    !sprint101AuditJs.includes('controlled Jobs/Billing write lifecycle and cleanup') ||
    !sprint101AuditJs.includes('latest-write-report-candidates') ||
    !sprint101AuditJs.includes('billing-smoke-marker-persisted')) {
  fail('sprint101_write_lifecycle_audit.js must guard controlled Jobs/Billing write lifecycle and cleanup evidence.');
}
const sprint102AuditJs = readUtf8(path.join(ROOT, 'scripts', 'sprint102_live_ux_menu_audit.js'));
if (!sprint102AuditJs.includes('Sprint 102 Live UX Menu Audit') ||
    !sprint102AuditJs.includes('section-renderers-do-not-wipe-main-shell') ||
    !sprint102AuditJs.includes('nested-page-restore-uses-more-nav') ||
    !sprint102AuditJs.includes('more-menu-scrollable-grouped-surface')) {
  fail('sprint102_live_ux_menu_audit.js must guard PC/Mobile live UX menu runtime stability.');
}
const sprint103WalkthroughJs = readUtf8(path.join(ROOT, 'scripts', 'sprint103_visual_runtime_walkthrough.js'));
if (!sprint103WalkthroughJs.includes('Sprint 103 Visual Runtime Walkthrough') ||
    !sprint103WalkthroughJs.includes('no-main-shell-wipe-regression') ||
    !sprint103WalkthroughJs.includes('Critical Thai label') ||
    !sprint103WalkthroughJs.includes('service-to-cash-commands-visible')) {
  fail('sprint103_visual_runtime_walkthrough.js must guard visual menu labels, PC shell stability, and service-to-cash surfaces.');
}
const sprint104JourneyJs = readUtf8(path.join(ROOT, 'scripts', 'sprint104_protected_browser_journey.js'));
if (!sprint104JourneyJs.includes('Sprint 104 Protected Browser Journey') ||
    !sprint104JourneyJs.includes('protected browser journey') ||
    !sprint104JourneyJs.includes('getLineRoomStatus') ||
    !sprint104JourneyJs.includes('getVisionPipelineVersion') ||
    !sprint104JourneyJs.includes('COMPHONE_AUTH_TOKEN')) {
  fail('sprint104_protected_browser_journey.js must guard token-aware protected browser journeys across Vision and LINE.');
}
const sprint105DetailJs = readUtf8(path.join(ROOT, 'scripts', 'sprint105_record_detail_completeness.js'));
if (!sprint105DetailJs.includes('Sprint 105 Record Detail Completeness') ||
    !sprint105DetailJs.includes('getJobTimeline') ||
    !sprint105DetailJs.includes('getBilling') ||
    !sprint105DetailJs.includes('getReportData') ||
    !sprint105DetailJs.includes('COMPHONE_AUTH_TOKEN')) {
  fail('sprint105_record_detail_completeness.js must guard token-aware Jobs/Billing/Reports detail and drilldown reads.');
}
const sprint106DataQualityJs = readUtf8(path.join(ROOT, 'scripts', 'sprint106_production_data_quality_guard.js'));
if (!sprint106DataQualityJs.includes('Sprint 106 Production Data Quality Guard') ||
    !sprint106DataQualityJs.includes('listBillings') ||
    !sprint106DataQualityJs.includes('incomplete_rows') ||
    !sprint106DataQualityJs.includes('COMPHONE_DATA_QUALITY_FAIL_ON_WARN') ||
    !sprint106DataQualityJs.includes('COMPHONE_AUTH_TOKEN')) {
  fail('sprint106_production_data_quality_guard.js must guard token-aware production data quality warnings.');
}
const sprint107CleanupPlanJs = readUtf8(path.join(ROOT, 'scripts', 'sprint107_controlled_data_cleanup_plan.js'));
if (!sprint107CleanupPlanJs.includes('Sprint 107 Controlled Data Cleanup') ||
    !sprint107CleanupPlanJs.includes('COMPHONE_DATA_CLEANUP_CONFIRM') ||
    !sprint107CleanupPlanJs.includes('REVIEWED_PRODUCTION_DATA_CLEANUP_PLAN') ||
    !sprint107CleanupPlanJs.includes('archive-before-change') ||
    !sprint107CleanupPlanJs.includes('safe_automation')) {
  fail('sprint107_controlled_data_cleanup_plan.js must keep production cleanup/backfill in read-only planned mode with explicit future gates.');
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
