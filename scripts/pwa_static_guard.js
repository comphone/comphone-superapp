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
const cacheMatch = versionJs.match(/CACHE_VERSION\s*=\s*'([^']+)'/);
const swCacheMatch = swJs.match(/CACHE_V\s*=\s*'([^']+)'/);

if (!buildMatch) fail('version_config.js is missing BUILD_TIMESTAMP.');
if (!cacheMatch) fail('version_config.js is missing CACHE_VERSION.');
if (!swCacheMatch) fail('sw.js is missing CACHE_V.');
if (cacheMatch && swCacheMatch && cacheMatch[1] !== swCacheMatch[1]) {
  fail(`CACHE_VERSION mismatch: version_config.js=${cacheMatch[1]} sw.js=${swCacheMatch[1]}`);
}

if (buildMatch) {
  const expectedToken = `t=${buildMatch[1]}`;

  function checkCacheBustTokens(html, pageName) {
    const localRefs = [...html.matchAll(/<(?:script|link)\b[^>]+(?:src|href)="([^"]+)"/g)]
      .map(match => match[1])
      .filter(src => !src.startsWith('http') && !src.startsWith('//') && !src.startsWith('/comphone-superapp/pwa/manifest.json'));

    for (const src of localRefs) {
      if (src.includes('?') && !src.includes(expectedToken)) {
        fail(`Cache bust token mismatch in ${pageName}: ${src}`);
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

const filesToScan = ['index.html', 'dashboard_pc.html', 'version_config.js', 'sw.js', 'pwa_asset_manifest.js', 'api_contract.js', 'api_client.js', 'app.js', 'auth.js', 'auth_guard.js', 'app_home.js', 'admin_panel.js', 'menu_health.js'];
for (const name of filesToScan) {
  const file = path.join(PWA, name);
  const text = readUtf8(file);
  const marker = badMarkers.find(item => text.includes(item));
  if (marker) fail(`Possible UTF-8 mojibake marker in ${rel(file)}.`);
}

if (!/[ก-๙]/.test(indexHtml)) fail('index.html no longer contains Thai text; encoding may be damaged.');
if (!/[ก-๙]/.test(dashboardPcHtml)) fail('dashboard_pc.html no longer contains Thai text; encoding may be damaged.');

const appJs = readUtf8(path.join(PWA, 'app.js'));
if (appJs.includes('window.AI_EXECUTOR[method]')) {
  fail('app.js callAPI() still depends on AI_EXECUTOR; mobile PWA should delegate to api_client.js callApi().');
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
if (dashboardPcHtml.includes('20260428_1130') || dashboardPcHtml.includes('v=282')) {
  fail('dashboard_pc.html contains stale cache-bust token.');
}
if (dashboardPcHtml.includes('localStorage.clear()')) {
  fail('dashboard_pc.html must not clear all localStorage during version changes.');
}
if (dashboardPcHtml.includes('serviceWorker.getRegistrations()') || dashboardPcHtml.includes('location.reload(true)')) {
  fail('dashboard_pc.html must not unregister service workers or force reload during boot.');
}
if (!dashboardPcHtml.includes('updatePcVersionBadge') || dashboardPcHtml.includes('<div id="version_badge">v5.9.0-phase2d')) {
  fail('dashboard_pc.html must render version_badge from version_config.js at runtime.');
}
if (!apiContractJs.includes('getDashboardBundle')) {
  fail('api_contract.js should track getDashboardBundle for PC dashboard fallback health.');
}
if (!apiContractJs.includes('responseShape') || !apiContractJs.includes('generatePromptPayQR')) {
  fail('api_contract.js must include responseShape and billing actions for API matrix parity.');
}
if (!apiContractJs.includes('smoke: false') || !apiContractJs.includes('smokeReason')) {
  fail('api_contract.js must mark record-specific actions that cannot be smoke-tested safely.');
}

const smokeJs = readUtf8(path.join(ROOT, 'scripts', 'pwa_api_smoke.js'));
if (!smokeJs.includes('COMPHONE_SMOKE_REPORT') || !smokeJs.includes('AUTH_FAIL') || !smokeJs.includes('CONTRACT') || !smokeJs.includes('SKIP')) {
  fail('pwa_api_smoke.js must emit classified protected API smoke reports.');
}
const menuHealthJs = readUtf8(path.join(PWA, 'menu_health.js'));
if (!menuHealthJs.includes('exportMenuHealthReport') || !menuHealthJs.includes('smoke === false')) {
  fail('menu_health.js must support skipped smoke actions and exportable reports.');
}

if (failures.length) {
  console.error('[PWA Static Guard] FAILED');
  for (const item of failures) console.error(`- ${item}`);
  process.exit(1);
}

console.log('[PWA Static Guard] OK');
console.log(`- BUILD_TIMESTAMP: ${buildMatch ? buildMatch[1] : 'unknown'}`);
console.log(`- CACHE_VERSION: ${cacheMatch ? cacheMatch[1] : 'unknown'}`);
