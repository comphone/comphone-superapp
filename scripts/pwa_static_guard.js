const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PWA = path.join(ROOT, 'pwa');
const INDEX = path.join(PWA, 'index.html');
const VERSION = path.join(PWA, 'version_config.js');
const SW = path.join(PWA, 'sw.js');

const mustExist = [INDEX, VERSION, SW];
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
const versionJs = readUtf8(VERSION);
const swJs = readUtf8(SW);

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
  const localRefs = [...indexHtml.matchAll(/<(?:script|link)\b[^>]+(?:src|href)="([^"]+)"/g)]
    .map(match => match[1])
    .filter(src => !src.startsWith('http') && !src.startsWith('//') && !src.startsWith('/comphone-superapp/pwa/manifest.json'));

  for (const src of localRefs) {
    if (src.includes('?') && !src.includes(expectedToken)) {
      fail(`Cache bust token mismatch in index.html: ${src}`);
    }
  }
}

for (const match of indexHtml.matchAll(/<script\b[^>]+src="([^"]+)"/g)) {
  const src = match[1];
  if (src.startsWith('http') || src.startsWith('//')) continue;
  const clean = src.split('?')[0].replace(/^\/comphone-superapp\/pwa\//, '');
  const file = path.join(PWA, clean);
  if (!fs.existsSync(file)) fail(`index.html loads missing script: ${src}`);
}

for (const match of swJs.matchAll(/BASE \+ '\/([^']+)'/g)) {
  const asset = match[1];
  if (asset === '' || asset === '/') continue;
  const file = path.join(PWA, asset);
  if (!fs.existsSync(file)) fail(`sw.js pre-caches missing asset: ${asset}`);
}

const filesToScan = ['index.html', 'version_config.js', 'sw.js', 'api_client.js', 'app.js', 'auth.js', 'auth_guard.js', 'app_home.js'];
for (const name of filesToScan) {
  const file = path.join(PWA, name);
  const text = readUtf8(file);
  const marker = badMarkers.find(item => text.includes(item));
  if (marker) fail(`Possible UTF-8 mojibake marker in ${rel(file)}.`);
}

if (!/[ก-๙]/.test(indexHtml)) fail('index.html no longer contains Thai text; encoding may be damaged.');

const appJs = readUtf8(path.join(PWA, 'app.js'));
if (appJs.includes('window.AI_EXECUTOR[method]')) {
  fail('app.js callAPI() still depends on AI_EXECUTOR; mobile PWA should delegate to api_client.js callApi().');
}

const apiClientJs = readUtf8(path.join(PWA, 'api_client.js'));
if (!apiClientJs.includes('normalizeCallApiArgs')) {
  fail('api_client.js must normalize both callApi(action, payload) and callApi({ action, ...payload }) signatures.');
}

if (failures.length) {
  console.error('[PWA Static Guard] FAILED');
  for (const item of failures) console.error(`- ${item}`);
  process.exit(1);
}

console.log('[PWA Static Guard] OK');
console.log(`- BUILD_TIMESTAMP: ${buildMatch ? buildMatch[1] : 'unknown'}`);
console.log(`- CACHE_VERSION: ${cacheMatch ? cacheMatch[1] : 'unknown'}`);
