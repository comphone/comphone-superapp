const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PWA = path.join(ROOT, 'pwa');
const GAS = path.join(ROOT, 'clasp-ready');
const REPORT = process.env.COMPHONE_CODE_INDEX_REPORT ||
  path.join(ROOT, 'test_reports', 'code_index_latest.json');
const SUMMARY_REPORT = process.env.COMPHONE_CODE_INDEX_SUMMARY ||
  path.join(ROOT, 'test_reports', 'code_index_summary_latest.md');
const SPECIAL_ROUTES = new Set(['login', 'offline-jobs', 'customer-portal', 'notifications', 'pos']);
const ARCHIVAL_SCRIPT_PATTERNS = [
  /^_backup_/,
  /_test\.js$/,
  /^api_test_framework\.js$/,
  /^customer_sw\.js$/,
  /^sw\.js$/,
  /^.*\.bak$/,
];
const DYNAMIC_SCRIPT_ALLOWLIST = new Set([
  'admin.js',
  'advanced_reports.js',
  'after_sales_enhanced.js',
  'attendance_section.js',
  'attendance_ui.js',
  'billing_customer.js',
  'billing_slip_verify.js',
  'branch_health_ui.js',
  'business_ai.js',
  'crm_ui.js',
  'customer_portal_section.js',
  'evidence_harness.js',
  'inventory_ui.js',
  'job_workflow.js',
  'language_manager.js',
  'offline_db_v2.js',
  'pentest_frontend.js',
  'photo_upload_section.js',
  'pos.js',
  'push_notifications_v2.js',
  'quick_actions.js',
  'smart_quotation.js',
  'stock.js',
  'tax_ui.js',
  'telemetry_collector.js',
  'warranty_section.js',
  'warranty_ui.js',
]);

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
  const routes = extractAll(html, /(?:onclick|href)="[^"]*(?:goPage|navigateFromMore)\('([^']+)'/g)
    .filter(route => !route.includes('${'));
  return { file: rel(htmlFile), scripts: uniq(scripts), styles: uniq(styles), routes: uniq(routes) };
}

function scanPwaFile(file) {
  const text = read(file);
  const imports = uniq([
    ...extractAll(text, /importScripts\s*\(\s*['"]([^'"]+)['"]/g),
    ...extractAll(text, /\bimport\s+[^'"]*['"]([^'"]+)['"]/g),
    ...extractAll(text, /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g),
  ]).map(src => src.split('?')[0].replace(/^\.\//, ''));
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
    ]).filter(route => !route.includes('${')),
    imports,
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

function loadedEntrypoints(pwaHtml) {
  const out = new Map();
  for (const html of pwaHtml) {
    for (const script of html.scripts) {
      if (!out.has(script)) out.set(script, []);
      out.get(script).push(html.file);
    }
  }
  return out;
}

function scriptName(file) {
  return file.replace(/^pwa\//, '');
}

function classifyOrphanScript(name) {
  if (ARCHIVAL_SCRIPT_PATTERNS.some(pattern => pattern.test(name))) return 'archival-or-test';
  if (DYNAMIC_SCRIPT_ALLOWLIST.has(name)) return 'dynamic-or-optional';
  if (/^section_/.test(name) || /_section\.js$/.test(name) || /_ui\.js$/.test(name)) return 'legacy-section-module';
  return 'review';
}

function buildWorkflowIndex(apiContract, actionIndex) {
  const actionMap = new Map(actionIndex.map(item => [item.action, item]));
  return (apiContract.workflows || []).map(workflow => {
    const readActions = workflow.readOnly || [];
    const writeActions = workflow.writeActions || [];
    const allActions = [...readActions, ...writeActions];
    const frontendFiles = uniq(allActions.flatMap(item => (actionMap.get(item.action) || {}).frontendFiles || []));
    const gasHandlers = uniq(allActions.flatMap(item => (actionMap.get(item.action) || {}).gasHandlers || []));
    const missingHandlers = allActions
      .filter(item => item.required && ((actionMap.get(item.action) || {}).gasHandlers || []).length === 0)
      .map(item => item.action);
    const detectedFrontendGaps = allActions
      .filter(item => item.required && ((actionMap.get(item.action) || {}).frontendFiles || []).length === 0)
      .map(item => item.action);

    return {
      id: workflow.id,
      label: workflow.label,
      description: workflow.description,
      readActions: readActions.map(item => item.action),
      writeActions: writeActions.map(item => item.action),
      frontendFiles,
      gasHandlers,
      missingHandlers,
      detectedFrontendGaps,
      safeToSmokeReadOnly: missingHandlers.length === 0,
      writeSmokeRequired: writeActions.length > 0,
    };
  });
}

function buildDependencyGraph(pwaHtml, pwaRows, actionIndex, routeIndex, workflowIndex) {
  const entrypointMap = loadedEntrypoints(pwaHtml);
  const apiByFile = new Map();
  for (const action of actionIndex) {
    for (const file of action.frontendFiles) {
      if (!apiByFile.has(file)) apiByFile.set(file, []);
      apiByFile.get(file).push(action.action);
    }
  }
  const routesByFile = new Map();
  for (const route of routeIndex) {
    for (const file of route.frontendFiles) {
      if (!routesByFile.has(file)) routesByFile.set(file, []);
      routesByFile.get(file).push(route.route);
    }
  }
  const workflowsByFile = new Map();
  for (const workflow of workflowIndex) {
    for (const file of workflow.frontendFiles) {
      if (!workflowsByFile.has(file)) workflowsByFile.set(file, []);
      workflowsByFile.get(file).push(workflow.id);
    }
  }

  return pwaRows.map(row => {
    const name = scriptName(row.file);
    return {
      file: row.file,
      loadedBy: uniq(entrypointMap.get(name) || []),
      imports: row.imports,
      routes: uniq(routesByFile.get(row.file) || []),
      apiActions: uniq(apiByFile.get(row.file) || []),
      workflows: uniq(workflowsByFile.get(row.file) || []),
      functions: row.functions.length,
      role: (entrypointMap.get(name) || []).length ? 'entrypoint-loaded' : classifyOrphanScript(name),
    };
  });
}

function writeSummary(report) {
  const topRoutes = report.routes
    .filter(route => route.frontendFiles.length)
    .map(route => `- ${route.route}: ${route.frontendFiles.join(', ')}`)
    .join('\n') || '- none';
  const workflows = report.workflows
    .map(workflow => `- ${workflow.id}: read=${workflow.readActions.length}, write=${workflow.writeActions.length}, frontend=${workflow.frontendFiles.length}, handlers=${workflow.gasHandlers.length}`)
    .join('\n') || '- none';
  const reviewOrphans = report.orphan_pwa_scripts
    .filter(item => item.category === 'review')
    .map(item => `- ${item.file}`)
    .slice(0, 30)
    .join('\n') || '- none';
  const risks = report.risks
    .map(risk => `- [${risk.priority}] ${risk.type}: ${risk.action || risk.route || risk.file} - ${risk.detail}`)
    .join('\n') || '- none';
  const text = [
    '# COMPHONE Code Intelligence Summary',
    '',
    `Generated: ${report.generated_at}`,
    `Version: ${report.version}`,
    '',
    '## Summary',
    `- PWA JS files: ${report.summary.pwa_js_files}`,
    `- GAS files: ${report.summary.gas_gs_files}`,
    `- API contract actions: ${report.summary.api_contract_actions}`,
    `- Menu routes: ${report.summary.menu_routes}`,
    `- Workflows: ${report.summary.workflows}`,
    `- Risk summary: ${JSON.stringify(report.summary.risks_by_priority)}`,
    '',
    '## Route Map',
    topRoutes,
    '',
    '## Workflow Map',
    workflows,
    '',
    '## Review Orphans',
    reviewOrphans,
    '',
    '## Risks',
    risks,
    '',
  ].join('\n');
  fs.writeFileSync(SUMMARY_REPORT, text, 'utf8');
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

  const workflowIndex = buildWorkflowIndex(apiContract, actionIndex);
  const dependencyGraph = buildDependencyGraph(pwaHtml, pwaRows, actionIndex, routeIndex, workflowIndex);

  const orphanPwaScripts = pwaRows
    .map(row => scriptName(row.file))
    .filter(name => !pwaHtml.some(html => html.scripts.includes(name)))
    .filter(name => !name.endsWith('.bak') && !name.includes('asset_manifest'))
    .map(name => ({
      file: `pwa/${name}`,
      category: classifyOrphanScript(name),
    }));

  const report = {
    generated_at: new Date().toISOString(),
    version: '2026-05-06.code-index-v2',
    summary: {
      pwa_js_files: pwaRows.length,
      gas_gs_files: gasRows.length,
      html_entrypoints: pwaHtml.length,
      api_contract_actions: contractActions.length,
      menu_routes: menuRoutes.length,
      workflows: workflowIndex.length,
      risks_by_priority: countBy(risks, 'priority'),
      orphan_pwa_scripts: orphanPwaScripts.length,
      review_orphan_pwa_scripts: orphanPwaScripts.filter(item => item.category === 'review').length,
    },
    html: pwaHtml,
    routes: routeIndex,
    actions: actionIndex,
    workflows: workflowIndex,
    dependency_graph: dependencyGraph,
    risks,
    orphan_pwa_scripts: orphanPwaScripts,
  };

  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, JSON.stringify(report, null, 2) + '\n', 'utf8');
  writeSummary(report);

  console.log('[Code Index] report: ' + rel(REPORT));
  console.log('[Code Index] summary: ' + rel(SUMMARY_REPORT));
  console.log(`[Code Index] PWA JS=${report.summary.pwa_js_files} GAS=${report.summary.gas_gs_files} actions=${report.summary.api_contract_actions} routes=${report.summary.menu_routes}`);
  const riskSummary = Object.entries(report.summary.risks_by_priority).map(([k, v]) => `${k}:${v}`).join(' ') || 'none';
  console.log('[Code Index] risks: ' + riskSummary);
  for (const risk of risks.slice(0, 12)) {
    console.log(`- [${risk.priority}] ${risk.type}: ${risk.action || risk.route} - ${risk.detail}`);
  }

  if (risks.some(risk => risk.priority === 'P0')) process.exit(1);
}

main();
