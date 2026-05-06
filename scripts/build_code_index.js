const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PWA = path.join(ROOT, 'pwa');
const GAS = path.join(ROOT, 'clasp-ready');
const REPORT = process.env.COMPHONE_CODE_INDEX_REPORT ||
  path.join(ROOT, 'test_reports', 'code_index_latest.json');
const SPECIAL_ROUTES = new Set(['login', 'offline-jobs', 'customer-portal', 'notifications', 'pos']);

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function rel(file) {
  return path.relative(ROOT, file).replace(/\\/g, '/');
}

function listFiles(dir, ext) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(name => name.endsWith(ext))
    .map(name => path.join(dir, name));
}

function uniq(items) {
  return [...new Set(items)].sort();
}

function countBy(items, key) {
  const out = {};
  for (const item of items) {
    const value = item[key] || 'unknown';
    out[value] = (out[value] || 0) + 1;
  }
  return out;
}

function extractAll(text, regex, mapper = match => match[1]) {
  return [...text.matchAll(regex)].map(mapper).filter(Boolean);
}

function parseHtmlAssets(htmlFile) {
  const html = read(htmlFile);
  const scripts = extractAll(html, /<script\b[^>]+src="([^"]+)"/g)
    .filter(src => !src.startsWith('http') && !src.startsWith('//'))
    .map(src => src.split('?')[0].replace(/^\/comphone-superapp\/pwa\//, ''));
  const styles = extractAll(html, /<link\b[^>]+rel="stylesheet"[^>]+href="([^"]+)"/g)
    .filter(src => !src.startsWith('http') && !src.startsWith('//'))
    .map(src => src.split('?')[0].replace(/^\/comphone-superapp\/pwa\//, ''));
  const routes = extractAll(html, /(?:onclick|href)="[^"]*(?:goPage|navigateFromMore)\('([^']+)'/g);
  return { file: rel(htmlFile), scripts: uniq(scripts), styles: uniq(styles), routes: uniq(routes) };
}

function scanPwaFile(file) {
  const text = read(file);
  return {
    file: rel(file),
    functions: uniq([
      ...extractAll(text, /\bfunction\s+([A-Za-z_$][\w$]*)\s*\(/g),
      ...extractAll(text, /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\(/g),
    ]),
    apiCalls: uniq([
      ...extractAll(text, /\bcallApi\s*\(\s*['"]([^'"]+)['"]/g),
      ...extractAll(text, /\bcallAPI\s*\(\s*['"]([^'"]+)['"]/g),
      ...extractAll(text, /\bcallGas\s*\(\s*['"]([^'"]+)['"]/g),
    ]),
    pageRoutes: uniq([
      ...extractAll(text, /\bgoPage\s*\(\s*['"]([^'"]+)['"]/g),
      ...extractAll(text, /\bnavigateFromMore\s*\(\s*['"]([^'"]+)['"]/g),
    ]),
    quickActions: uniq(extractAll(text, /\baction:\s*['"]([^'"]+)['"]/g)),
    onclickFunctions: uniq(extractAll(text, /onclick="([A-Za-z_$][\w$]*)\s*\(/g)),
  };
}

function scanGasFile(file) {
  const text = read(file);
  return {
    file: rel(file),
    functions: uniq(extractAll(text, /\bfunction\s+([A-Za-z_$][\w$]*)\s*\(/g)),
    routerActions: uniq(extractAll(text, /['"]([A-Za-z_$][\w$]*)['"]\s*:\s*function\s*\(/g)),
    publicActions: uniq(extractAll(text, /['"]([A-Za-z_$][\w$]*)['"]\s*:\s*1/g)),
  };
}

function loadApiContract() {
  const contractFile = path.join(PWA, 'api_contract.js');
  delete require.cache[require.resolve(contractFile)];
  return require(contractFile);
}

function makeLookup(rows, field) {
  const map = new Map();
  for (const row of rows) {
    for (const value of row[field] || []) {
      if (!map.has(value)) map.set(value, []);
      map.get(value).push(row.file);
    }
  }
  return map;
}

function main() {
  const pwaHtml = ['index.html', 'dashboard_pc.html']
    .map(name => path.join(PWA, name))
    .filter(fs.existsSync)
    .map(parseHtmlAssets);
  const pwaRows = listFiles(PWA, '.js').map(scanPwaFile);
  const gasRows = listFiles(GAS, '.gs').map(scanGasFile);
  const apiContract = loadApiContract();

  const pwaFunctionMap = makeLookup(pwaRows, 'functions');
  const pwaApiCallMap = makeLookup(pwaRows, 'apiCalls');
  const gasFunctionMap = makeLookup(gasRows, 'functions');
  const gasRouterMap = makeLookup(gasRows, 'routerActions');

  const contractActions = uniq([
    ...(apiContract.publicActions || []).map(item => item.action),
    ...(apiContract.protectedActions || []).map(item => item.action),
    ...(apiContract.workflows || []).flatMap(workflow => [
      ...(workflow.readOnly || []).map(item => item.action),
      ...(workflow.writeActions || []).map(item => item.action),
    ]),
  ]);

  const menuRoutes = uniq([
    ...pwaHtml.flatMap(item => item.routes),
    ...pwaRows.flatMap(item => item.pageRoutes),
  ]);
  const pageIds = uniq(extractAll(read(path.join(PWA, 'index.html')), /id="page-([^"]+)"/g));

  const actionIndex = contractActions.map(action => ({
    action,
    contract: true,
    frontendFiles: uniq(pwaApiCallMap.get(action) || []),
    gasHandlers: uniq([...(gasRouterMap.get(action) || []), ...(gasFunctionMap.get(action) || [])]),
    required: !!(apiContract.protectedActions || []).find(item => item.action === action && item.required),
    write: !!(apiContract.workflows || []).find(workflow => (workflow.writeActions || []).some(item => item.action === action)),
  }));

  const routeIndex = menuRoutes.map(route => ({
    route,
    pageExists: pageIds.includes(route),
    loaderCandidates: [`load${route.charAt(0).toUpperCase()}${route.slice(1)}Page`, `render${route.charAt(0).toUpperCase()}${route.slice(1)}Section`],
    frontendFiles: uniq(pwaRows.filter(row => row.pageRoutes.includes(route)).map(row => row.file)),
  }));

  const risks = [];
  for (const item of actionIndex) {
    if (item.required && item.gasHandlers.length === 0) {
      risks.push({ priority: 'P0', type: 'missing-gas-handler', action: item.action, detail: 'Required API contract action has no GAS router/function handler.' });
    }
    if (item.required && item.frontendFiles.length === 0) {
      risks.push({ priority: 'P1', type: 'unused-required-contract-action', action: item.action, detail: 'Required API action is in contract but not called by PWA JS.' });
    }
    if (item.write && item.frontendFiles.length === 0) {
      risks.push({ priority: 'P1', type: 'write-action-no-frontend-call', action: item.action, detail: 'Workflow write action has no detected PWA caller.' });
    }
  }
  for (const route of routeIndex) {
    if (!route.pageExists && !SPECIAL_ROUTES.has(route.route)) {
      risks.push({ priority: 'P1', type: 'missing-mobile-page', route: route.route, detail: 'Menu route has no matching #page-* element in index.html.' });
    }
  }

  const orphanPwaScripts = pwaRows
    .map(row => row.file.replace(/^pwa\//, ''))
    .filter(name => !pwaHtml.some(html => html.scripts.includes(name)))
    .filter(name => !name.endsWith('.bak') && !name.includes('asset_manifest'));

  const report = {
    generated_at: new Date().toISOString(),
    version: '2026-05-06.code-index-v1',
    summary: {
      pwa_js_files: pwaRows.length,
      gas_gs_files: gasRows.length,
      html_entrypoints: pwaHtml.length,
      api_contract_actions: contractActions.length,
      menu_routes: menuRoutes.length,
      risks_by_priority: countBy(risks, 'priority'),
      orphan_pwa_scripts: orphanPwaScripts.length,
    },
    html: pwaHtml,
    routes: routeIndex,
    actions: actionIndex,
    risks,
    orphan_pwa_scripts: orphanPwaScripts,
  };

  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, JSON.stringify(report, null, 2) + '\n', 'utf8');

  console.log('[Code Index] report: ' + rel(REPORT));
  console.log(`[Code Index] PWA JS=${report.summary.pwa_js_files} GAS=${report.summary.gas_gs_files} actions=${report.summary.api_contract_actions} routes=${report.summary.menu_routes}`);
  const riskSummary = Object.entries(report.summary.risks_by_priority).map(([k, v]) => `${k}:${v}`).join(' ') || 'none';
  console.log('[Code Index] risks: ' + riskSummary);
  for (const risk of risks.slice(0, 12)) {
    console.log(`- [${risk.priority}] ${risk.type}: ${risk.action || risk.route} - ${risk.detail}`);
  }

  if (risks.some(risk => risk.priority === 'P0')) process.exit(1);
}

main();
