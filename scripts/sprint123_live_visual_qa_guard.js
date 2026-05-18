const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PWA = path.join(ROOT, 'pwa');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function localAssetsFromIndex(kind) {
  const html = read('pwa/index.html');
  const re = kind === 'script'
    ? /<script\b[^>]+src="([^"]+)"/g
    : /<link\b[^>]+rel="stylesheet"[^>]+href="([^"]+)"/g;
  return [...html.matchAll(re)]
    .map(match => match[1].split('?')[0])
    .filter(src => !src.startsWith('http') && !src.startsWith('//'));
}

function manifestList(manifest, name) {
  const match = manifest.match(new RegExp(`${name}:\\s*\\[([\\s\\S]*?)\\]`));
  return match ? [...match[1].matchAll(/'([^']+)'/g)].map(item => item[1]) : [];
}

const checks = [];
function check(name, pass, detail) {
  checks.push({ name, pass: Boolean(pass), detail });
}

const indexHtml = read('pwa/index.html');
const appJs = read('pwa/app.js');
const appHomeJs = read('pwa/app_home.js');
const appActionsJs = read('pwa/app_actions.js');
const dashboardJs = read('pwa/dashboard.js');
const manifest = read('pwa/pwa_asset_manifest.js');
const staticGuard = read('scripts/pwa_static_guard.js');
const regressionGuard = read('scripts/regression-guard.sh');
const autoDeploy = read('.github/workflows/auto-deploy.yml');
const blueprint = read('BLUEPRINT.md');

const manifestStyles = manifestList(manifest, 'styles');
const manifestScripts = manifestList(manifest, 'scripts');
const manifestPrecache = manifestList(manifest, 'precache');
const indexStyles = localAssetsFromIndex('style');
const indexScripts = localAssetsFromIndex('script');

check(
  'mobile-asset-manifest-complete',
  indexStyles.every(asset => manifestStyles.includes(asset) && manifestPrecache.includes(asset)) &&
    indexScripts.every(asset => manifestScripts.includes(asset) && manifestPrecache.includes(asset)),
  'Every mobile local script/stylesheet loaded by index.html must be listed and pre-cached.'
);

check(
  'critical-route-mounts-present',
  ['reports', 'billing', 'dashboard', 'analytics', 'revenue', 'tax', 'performance', 'vision', 'line-center', 'admin']
    .every(page => indexHtml.includes(`id="page-${page}"`)),
  'Critical More-menu/mobile deep pages must have stable page-* mounts.'
);

check(
  'route-loaders-present',
  [
    "page === 'reports'",
    "page === 'billing'",
    "page === 'dashboard'",
    "page === 'analytics'",
    "page === 'revenue'",
    "page === 'tax'",
    "page === 'performance'",
    "page === 'vision'",
    "page === 'line-center'",
    'ensurePageHasContent(page)'
  ].every(token => appJs.includes(token)),
  'goPage must dispatch all high-value More-menu pages and keep blank-page diagnostics.'
);

check(
  'quick-actions-backed-by-real-surfaces',
  appJs.includes("DEFAULT_QUICK_ACTION_IDS = ['openNewJob', 'addCustomer', 'jobs', 'billing', 'vision', 'line-center']") &&
    appHomeJs.includes('data-quick-action="${qa.id || qa.action || \'\'}"') &&
    appActionsJs.includes("ensureActionModal('modal-new-job'") &&
    appActionsJs.includes("ensureActionModal('modal-add-customer'") &&
    appActionsJs.includes("callAPI('openJob'") &&
    appActionsJs.includes("callAPI('createCustomer'"),
  'Top mobile quick actions must map to real modal/page/write surfaces, not toast-only stubs.'
);

check(
  'more-menu-grouped-and-actionable',
  appJs.includes('const MENU_GROUPS = [') &&
    appJs.includes('renderMoreMenu') &&
    appJs.includes('data-menu-page="${item.page}"') &&
    appJs.includes("data-quick-action=\"${item.id}\"") &&
    appJs.includes('navigateFromMore'),
  'More menu must stay grouped and route with explicit page/action attributes.'
);

check(
  'dashboard-visual-qa-contract',
  dashboardJs.includes('operator-insight-strip') &&
    dashboardJs.includes('executive-command-center') &&
    dashboardJs.includes("renderCommandTile('reports'") &&
    dashboardJs.includes("renderCommandTile('vision'") &&
    dashboardJs.includes("renderCommandTile('line-center'"),
  'Dashboard must keep operator insight plus command tiles for Reports, Vision, and LINE.'
);

check(
  'guard-wiring',
  staticGuard.includes('pwa_asset_manifest.js scripts is missing index.html script') &&
    regressionGuard.includes('sprint123_live_visual_qa_guard.js') &&
    autoDeploy.includes('scripts/sprint123_live_visual_qa_guard.js'),
  'Sprint 123 guard must be wired into static guard, regression guard, and GitHub Actions.'
);

check(
  'blueprint-current',
  blueprint.includes('Phase 123 Live Visual QA Guard') &&
    blueprint.includes('sprint123_live_visual_qa_guard.js') &&
    blueprint.includes('20260518_0615'),
  'BLUEPRINT.md must document Sprint 123 and current build timestamp.'
);

for (const asset of [...indexStyles, ...indexScripts]) {
  check(
    `asset-exists:${asset}`,
    fs.existsSync(path.join(PWA, asset)),
    `Mobile asset exists: ${asset}`
  );
}

const failed = checks.filter(item => !item.pass);
console.log('Sprint 123 Live Visual QA Guard');
console.log(`Score: ${checks.length - failed.length}/${checks.length}`);
for (const item of checks) {
  console.log(`${item.pass ? 'OK ' : 'FAIL'} ${item.name} - ${item.detail}`);
}

if (failed.length) process.exitCode = 1;
