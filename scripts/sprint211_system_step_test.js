/**
 * Sprint 211 — System Step-by-Step Test
 * ทดสอบระบบทีละขั้น: GAS backend → RouterSplit map → PWA API calls → UI mounts
 * รันได้โดยไม่ต้อง browser หรือ token
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PWA = path.join(ROOT, 'pwa');
const GAS = path.join(ROOT, 'clasp-ready');

let passed = 0;
let failed = 0;
let warned = 0;
const results = [];

function ok(label, detail) {
  passed++;
  results.push({ status: 'PASS', label, detail });
  console.log(`  ✅ PASS  ${label}${detail ? ' — ' + detail : ''}`);
}
function fail(label, detail) {
  failed++;
  results.push({ status: 'FAIL', label, detail });
  console.log(`  ❌ FAIL  ${label}${detail ? ' — ' + detail : ''}`);
}
function warn(label, detail) {
  warned++;
  results.push({ status: 'WARN', label, detail });
  console.log(`  ⚠️ WARN  ${label}${detail ? ' — ' + detail : ''}`);
}

function section(title) {
  console.log(`\n${'═'.repeat(60)}\n  ${title}\n${'═'.repeat(60)}`);
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function readFile(p) { try { return fs.readFileSync(p, 'utf8'); } catch { return ''; } }

/** Extract all `function foo(` and `async function foo(` names from .gs / .js text */
function extractFunctionDefs(text) {
  const defs = new Set();
  const re = /(?:async\s+)?function\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*\(/g;
  let m;
  while ((m = re.exec(text)) !== null) defs.add(m[1]);
  // Also: const foo = function( and const foo = async function(
  const re2 = /(?:const|let|var)\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*(?:async\s+)?function\s*\(/g;
  while ((m = re2.exec(text)) !== null) defs.add(m[1]);
  // Arrow functions: const foo = (...) =>
  const re3 = /(?:const|let|var)\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*(?:async\s+)?\(/g;
  while ((m = re3.exec(text)) !== null) defs.add(m[1]);
  return defs;
}

/** Read all .gs files and build a combined set of defined function names */
function buildGasFunctionMap() {
  const all = new Set();
  const files = fs.readdirSync(GAS).filter(f => f.endsWith('.gs'));
  for (const f of files) {
    const text = readFile(path.join(GAS, f));
    for (const name of extractFunctionDefs(text)) all.add(name);
  }
  return all;
}

/** Parse RouterSplit.gs handler→function mappings */
function parseRouterSplitHandlers() {
  const text = readFile(path.join(GAS, 'RouterSplit.gs'));
  const handlers = {};
  // Match: 'actionName': function(p) { return someFn(... }
  // and  : 'actionName': function(p) { return someFn ... }
  const re = /'([A-Za-z_$][A-Za-z0-9_$]*)'\s*:\s*function\s*\(p\)\s*\{[^}]*?return\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*[\(\(]/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    handlers[m[1]] = m[2];
  }
  // fallback: broader pattern for multi-return or complex bodies
  const re2 = /'([A-Za-z_$][A-Za-z0-9_$]*)'\s*:\s*function\s*\(p\)/g;
  while ((m = re2.exec(text)) !== null) {
    if (!handlers[m[1]]) handlers[m[1]] = '__complex__';
  }
  return { handlers, raw: text };
}

/** Get list of production-loaded scripts from pwa_asset_manifest.js */
function getProductionScripts() {
  const manifest = readFile(path.join(PWA, 'pwa_asset_manifest.js'));
  const scripts = new Set();
  const re = /'([A-Za-z_$][A-Za-z0-9_.]+\.js)'/g;
  let m;
  while ((m = re.exec(manifest)) !== null) scripts.add(m[1]);
  return scripts;
}

/** Scan production PWA JS files for actual GAS API calls only */
function scanPwaApiCalls() {
  const actions = new Set();
  const prodScripts = getProductionScripts();
  // Only scan production-loaded files + html
  const files = fs.readdirSync(PWA).filter(f =>
    f.endsWith('.js') && prodScripts.has(f)
  );
  for (const f of files) {
    const text = readFile(path.join(PWA, f));
    // Only actual GAS API calls: callAPI('action',...) callApi('action',...)
    // and callApi({ action: 'foo' }) — the object form
    const re1 = /callAPI\s*\(\s*'([A-Za-z_$][A-Za-z0-9_$]*)'/g;
    const re2 = /callApi\s*\(\s*'([A-Za-z_$][A-Za-z0-9_$]*)'/g;
    const re4 = /callAPI\s*\(\s*"([A-Za-z_$][A-Za-z0-9_$]*)"/g;
    const re5 = /callApi\s*\(\s*"([A-Za-z_$][A-Za-z0-9_$]*)"/g;
    // callApi({ action: 'xxx' }) — only inside callApi/callAPI context
    const re6 = /callApi\s*\(\s*\{[^}]{0,200}action\s*:\s*'([A-Za-z_$][A-Za-z0-9_$]*)'/g;
    const re7 = /callApi\s*\(\s*\{[^}]{0,200}action\s*:\s*"([A-Za-z_$][A-Za-z0-9_$]*)"/g;
    let m;
    for (const re of [re1, re2, re4, re5, re6, re7]) {
      while ((m = re.exec(text)) !== null) actions.add(m[1]);
    }
  }
  return actions;
}

/** Extract all id="..." values from HTML */
function extractHtmlIds(html) {
  const ids = new Set();
  const re = /id="([^"]+)"/g;
  let m;
  while ((m = re.exec(html)) !== null) ids.add(m[1]);
  return ids;
}

// ─── Step 1: File existence ──────────────────────────────────────────────────
section('STEP 1: Critical file existence');
const criticalFiles = [
  'pwa/index.html',
  'pwa/app.js',
  'pwa/api_client.js',
  'pwa/version_config.js',
  'pwa/sw.js',
  'pwa/version.json',
  'pwa/warranty_ui.js',
  'pwa/section_warranty.js',
  'pwa/billing_section.js',
  'pwa/reports.js',
  'pwa/crm_attendance.js',
  'pwa/section_inventory.js',
  'pwa/inventory_ui.js',
  'pwa/analytics_section.js',
  'pwa/admin_panel.js',
  'pwa/job_workflow.js',
  'pwa/quick_actions.js',
  'pwa/billing_slip_verify.js',
  'clasp-ready/RouterSplit.gs',
  'clasp-ready/WarrantyManager.gs',
  'clasp-ready/BillingCore.gs',
  'clasp-ready/Reports.gs',
  'clasp-ready/Attendance.gs',
  'clasp-ready/Inventory.gs',
];
for (const f of criticalFiles) {
  const exists = fs.existsSync(path.join(ROOT, f));
  exists ? ok(f) : fail(f, 'FILE MISSING');
}

// ─── Step 2: Version consistency ─────────────────────────────────────────────
section('STEP 2: Version consistency across all 5 version files');
const vcText    = readFile(path.join(PWA, 'version_config.js'));
const swText    = readFile(path.join(PWA, 'sw.js'));
const vjText    = readFile(path.join(PWA, 'version.json'));
const idxText   = readFile(path.join(PWA, 'index.html'));
const pcText    = readFile(path.join(PWA, 'dashboard_pc.html'));

const vcBuild   = (vcText.match(/buildTimestamp:\s*'([^']+)'/) || [])[1] || '';
const swCache   = (swText.match(/CACHE_V\s*=\s*'([^']+)'/) || [])[1] || '';
const vjCache   = (vjText.match(/"c":"([^"]+)"/) || [])[1] || '';
const vjBuild   = (vjText.match(/"v":"([^"]+)"/) || [])[1] || '';
const idxBuild  = (idxText.match(/EXPECTED_BUILD\s*=\s*'([^']+)'/) || [])[1] || '';

console.log(`    version_config.js  buildTimestamp: ${vcBuild}`);
console.log(`    sw.js              CACHE_V:        ${swCache}`);
console.log(`    version.json       v:              ${vjBuild}`);
console.log(`    index.html         EXPECTED_BUILD: ${idxBuild}`);

(vcBuild && vcBuild === vjBuild && vcBuild === idxBuild)
  ? ok('Build timestamp consistent', vcBuild)
  : fail('Build timestamp mismatch', `vc=${vcBuild} vj=${vjBuild} idx=${idxBuild}`);

const vcSprint = (vcText.match(/version:\s*'([^']+)'/) || [])[1] || '';
swCache.includes(vcSprint.replace('v', ''))
  ? ok('SW cache version matches version_config', vcSprint)
  : fail('SW cache version mismatch', `sw=${swCache} vc=${vcSprint}`);

// ─── Step 3: RouterSplit handlers ────────────────────────────────────────────
section('STEP 3: RouterSplit.gs — handler count and structure');
const { handlers, raw: routerRaw } = parseRouterSplitHandlers();
const actionCount = Object.keys(handlers).length;
actionCount >= 50
  ? ok('RouterSplit handler count', `${actionCount} actions registered`)
  : warn('RouterSplit handler count low', `${actionCount} actions`);

// Check key actions exist
const requiredActions = [
  // Jobs
  'getJobDetail', 'createJob', 'markJobStatus', 'addQuickNote', 'getJobTimeline',
  // CRM / Attendance
  'listCustomers', 'createCustomer', 'clockIn', 'clockOut',
  'getAttendanceMonthlySummary', 'getAttendanceReport',
  // Warranty
  'listWarranties', 'createWarranty', 'getWarrantyByJobId', 'updateWarrantyStatus', 'getWarrantyDue',
  // Billing
  'listBillings', 'createBilling', 'getBilling', 'markBillingPaid', 'generatePromptPayQR',
  // Inventory / PO
  'listPurchaseOrders', 'createPurchaseOrder',
  'inventoryOverview', 'addInventoryItem', 'transferStock', 'barcodeLookup',
  // Reports / Dashboard
  'getReportData', 'getDashboardBundle',
  // Version (health is in Router.gs, not RouterSplit — excluded intentionally)
  'getVersion',
];
for (const action of requiredActions) {
  handlers[action]
    ? ok(`RouterSplit: ${action}`, `→ ${handlers[action]}`)
    : fail(`RouterSplit: ${action}`, 'ACTION MISSING');
}

// ─── Step 4: GAS backend function existence ───────────────────────────────────
section('STEP 4: GAS backend — verify mapped functions are defined');
const gasFns = buildGasFunctionMap();
console.log(`    Total GAS function definitions found: ${gasFns.size}`);

// Spot-check the critical mapped target functions
const criticalGasFns = [
  'createJob', 'getJobDetail', 'transitionJob',
  'clockIn', 'clockOut', 'getAttendanceReport', 'getAttendanceMonthlySummary',
  'listWarranties', 'createWarranty', 'getWarrantyByJobId', 'updateWarrantyStatus', 'getWarrantyDue',
  'listAllBillings_', 'createBilling', 'getBilling', 'markBillingPaid', 'generatePromptPayQR',
  'listPurchaseOrders', 'createPurchaseOrder',
  'getInventoryOverview', 'addInventoryItem', 'transferStock', 'barcodeLookup',
  'listCustomers', 'createCustomer', 'getCustomerHistory', 'getCustomerReceipts',
  'addQuickNote', 'getJobTimelineV55_',
  'getDashboardBundle', 'getReportData',
];
for (const fn of criticalGasFns) {
  gasFns.has(fn)
    ? ok(`GAS fn: ${fn}`)
    : fail(`GAS fn: ${fn}`, 'NOT DEFINED in any .gs file');
}

// ─── Step 5: PWA → RouterSplit contract ──────────────────────────────────────
section('STEP 5: PWA API calls → RouterSplit coverage');
const pwaActions = scanPwaApiCalls();
// Actions handled directly in Router.gs before RouterSplit, not in RouterSplit map
const skipActions = new Set(['action', 'ping', 'echo', 'health', 'healthcheck']);
const missing = [];
for (const action of pwaActions) {
  if (skipActions.has(action)) continue;
  if (!handlers[action]) missing.push(action);
}
missing.length === 0
  ? ok('All PWA API calls covered by RouterSplit', `${pwaActions.size} unique actions`)
  : fail(`${missing.length} PWA actions not in RouterSplit`, missing.join(', '));

// ─── Step 6: index.html content divs ─────────────────────────────────────────
section('STEP 6: index.html — critical content div IDs exist');
const htmlIds = extractHtmlIds(idxText);

const requiredIds = [
  'page-jobs', 'page-crm', 'page-warranty', 'page-billing', 'page-reports',
  'page-inventory', 'page-admin', 'page-analytics',
  'billing-content', 'warranty-content', 'warranty-alert-banner',
  'reports-content', 'admin-content', 'attendance-content', 'crm-list',
  'revenue-content', 'tax-content', 'performance-content',
  'section-content',
  'modal-add-inventory', 'modal-clockin',
];
for (const id of requiredIds) {
  htmlIds.has(id)
    ? ok(`HTML id: #${id}`)
    : fail(`HTML id: #${id}`, 'MISSING from index.html');
}

// ─── Step 7: Script load order ───────────────────────────────────────────────
section('STEP 7: index.html — script load order');
const scriptOrder = [];
const scriptRe = /<script src="([^"?]+)/g;
let sm;
while ((sm = scriptRe.exec(idxText)) !== null) scriptOrder.push(sm[1]);

const requiredScripts = [
  'api_client.js', 'app.js', 'job_workflow.js', 'crm_attendance.js',
  'section_inventory.js', 'inventory_ui.js',
  'billing_section.js', 'reports.js', 'analytics_section.js',
  'admin_panel.js', 'section_warranty.js', 'warranty_ui.js', 'billing_slip_verify.js',
  'section_revenue.js', 'section_tax.js', 'section_performance.js',
];
for (const s of requiredScripts) {
  scriptOrder.includes(s)
    ? ok(`Script loaded: ${s}`, `position ${scriptOrder.indexOf(s) + 1}`)
    : fail(`Script missing: ${s}`, 'NOT in index.html script tags');
}

// Check inventory_ui after section_inventory
const inv = scriptOrder.indexOf('section_inventory.js');
const invUi = scriptOrder.indexOf('inventory_ui.js');
(inv >= 0 && invUi > inv)
  ? ok('Load order: inventory_ui.js after section_inventory.js')
  : fail('Load order: inventory_ui.js must come after section_inventory.js');

// Check warranty_ui after section_warranty
const sw2 = scriptOrder.indexOf('section_warranty.js');
const wu = scriptOrder.indexOf('warranty_ui.js');
(sw2 >= 0 && wu > sw2)
  ? ok('Load order: warranty_ui.js after section_warranty.js')
  : fail('Load order: warranty_ui.js must come after section_warranty.js');

// ─── Step 8: PWA asset manifest completeness ──────────────────────────────────
section('STEP 8: pwa_asset_manifest.js — all loaded scripts are precached');
const manifestText = readFile(path.join(PWA, 'pwa_asset_manifest.js'));
for (const s of requiredScripts) {
  manifestText.includes(`'${s}'`)
    ? ok(`Manifest has: ${s}`)
    : fail(`Manifest missing: ${s}`);
}

// ─── Step 9: Warranty mount fix verification ──────────────────────────────────
section('STEP 9: warranty_ui.js — showWarrantyList mount target');
const warrantyUiText = readFile(path.join(PWA, 'warranty_ui.js'));
const mountLine = warrantyUiText.split('\n').find(l => l.includes('getElementById') && l.includes('showWarrantyList') || false);
// Look specifically at the function body
const showWarrantyListBody = warrantyUiText.match(/async function showWarrantyList[\s\S]{0,200}/)?.[0] || '';
showWarrantyListBody.includes('warranty-content')
  ? ok('warranty_ui.js showWarrantyList targets warranty-content')
  : fail('warranty_ui.js showWarrantyList does NOT target warranty-content');

// ─── Step 10: RBAC fix in job_workflow.js ─────────────────────────────────────
section('STEP 10: job_workflow.js — owner role fix');
const jobWorkflowText = readFile(path.join(PWA, 'job_workflow.js'));
jobWorkflowText.includes("APP.role === 'exec'")
  ? fail("job_workflow.js still uses 'exec' role (should be 'owner')")
  : ok("job_workflow.js: 'exec' role bug is fixed");
jobWorkflowText.includes("APP.role === 'owner'") || jobWorkflowText.includes("isAdmin")
  ? ok("job_workflow.js: owner/admin check present")
  : warn("job_workflow.js: owner/admin check not found");

// ─── Step 11: clockIn modal static HTML ──────────────────────────────────────
section('STEP 11: modal-clockin static HTML in index.html');
idxText.includes('id="modal-clockin"')
  ? ok('modal-clockin exists in index.html')
  : fail('modal-clockin MISSING from index.html');
idxText.includes('id="clockin-confirm-btn"')
  ? ok('clockin-confirm-btn exists in index.html')
  : fail('clockin-confirm-btn MISSING from index.html');
idxText.includes('id="clockin-note"')
  ? ok('clockin-note input exists in index.html')
  : fail('clockin-note input MISSING from index.html');

// ─── Step 12: API error handling for 529 ─────────────────────────────────────
section('STEP 12: api_client.js — HTTP 529 / quota error handling');
const apiClientText = readFile(path.join(PWA, 'api_client.js'));
apiClientText.includes('529') || apiClientText.includes('QUOTA')
  ? ok('api_client.js handles 529/quota errors')
  : fail('api_client.js missing 529/quota error handling');
apiClientText.match(/if\s*\(!res\.ok\)/) || apiClientText.match(/res\.status/)
  ? ok('api_client.js checks res.status before res.json()')
  : warn('api_client.js may call res.json() without status check');

// ─── Step 13: quick_actions.js appointment fix ───────────────────────────────
section('STEP 13: quick_actions.js — addAppointment uses addQuickNote');
const qaText = readFile(path.join(PWA, 'quick_actions.js'));
qaText.includes("'addQuickNote'") || qaText.includes('"addQuickNote"')
  ? ok('quick_actions.js uses addQuickNote for appointments')
  : warn('quick_actions.js: addQuickNote not found — appointment may be broken');
!(qaText.includes("'addAppointment'") || qaText.includes('"addAppointment"'))
  ? ok('quick_actions.js: broken addAppointment removed')
  : fail('quick_actions.js: still calls addAppointment (broken GAS target)');

// ─── Step 14: GAS RouterSplit syntax check ────────────────────────────────────
section('STEP 14: RouterSplit.gs — no obvious syntax errors');
// Check balanced braces (rough heuristic)
const opens = (routerRaw.match(/\{/g) || []).length;
const closes = (routerRaw.match(/\}/g) || []).length;
Math.abs(opens - closes) < 10
  ? ok('RouterSplit.gs brace balance OK', `{ ${opens}  } ${closes}`)
  : warn('RouterSplit.gs brace imbalance', `{ ${opens}  } ${closes}`);
// RouterSplit is called FROM Router.gs — doGet/doPost are in Router.gs, not here
const routerGsText = readFile(path.join(GAS, 'Router.gs'));
routerGsText.includes('function doGet') || routerGsText.includes('function doPost')
  ? ok('Router.gs has doGet/doPost entry points')
  : warn('Router.gs missing doGet/doPost entry points');

// ─── Step 15: Section files have correct entry-points ────────────────────────
section('STEP 15: Section JS files define required entry-point functions');
const entryPoints = {
  'section_warranty.js': 'loadWarrantyPage',
  'billing_section.js': 'loadBillingPage',
  'reports.js': 'loadReportsPage',
  'section_inventory.js': 'loadInventoryPage',
  'crm_attendance.js': 'loadCRMPage',
  'analytics_section.js': 'openAnalyticsSection',
  'admin_panel.js': 'loadAdminPanel',
  'section_revenue.js': 'renderRevenueSection',
  'section_tax.js': 'renderTaxSection',
  'section_performance.js': 'renderPerformanceSection',
  'purchase_order.js': 'loadPurchaseOrderPage',
};
for (const [file, fn] of Object.entries(entryPoints)) {
  const text = readFile(path.join(PWA, file));
  text.includes(`function ${fn}`)
    ? ok(`${file}: ${fn}() defined`)
    : fail(`${file}: ${fn}() MISSING`);
}

// ─── Final summary ─────────────────────────────────────────────────────────
section('SUMMARY');
const total = passed + failed + warned;
console.log(`  Total: ${total}  PASS: ${passed}  FAIL: ${failed}  WARN: ${warned}\n`);

// Export JSON report
const reportDir = path.join(ROOT, 'test_reports');
if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });
const reportPath = path.join(reportDir, 'sprint211_system_step_test.json');
fs.writeFileSync(reportPath, JSON.stringify({ timestamp: new Date().toISOString(), passed, failed, warned, results }, null, 2));
console.log(`  Report: ${reportPath}`);

if (failed > 0) {
  console.log(`\n  ❌ ${failed} test(s) FAILED — system has issues requiring fixes`);
  process.exit(1);
} else {
  console.log(`\n  ✅ All tests passed${warned > 0 ? ` (${warned} warning(s))` : ''}`);
  process.exit(0);
}
