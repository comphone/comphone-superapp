const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PWA = path.join(ROOT, 'pwa');
const GAS = path.join(ROOT, 'clasp-ready');
const REPORT_JSON = process.env.COMPHONE_SYSTEM_AUDIT_REPORT ||
  path.join(ROOT, 'test_reports', 'system_integrity_latest.json');
const REPORT_MD = process.env.COMPHONE_SYSTEM_AUDIT_SUMMARY ||
  path.join(ROOT, 'test_reports', 'system_integrity_latest.md');

const STATUS_SCORE = { ok: 100, warn: 70, fail: 25 };
const SPECIAL_OVERLAY_PAGES = new Set(['customer-portal', 'notifications']);
const STANDALONE_PAGES = new Set(['pos']);

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function exists(file) {
  return fs.existsSync(file);
}

function rel(file) {
  return path.relative(ROOT, file).replace(/\\/g, '/');
}

function uniq(items) {
  return [...new Set(items.filter(Boolean))].sort();
}

function extractAll(text, regex, mapper = match => match[1]) {
  return [...text.matchAll(regex)].map(mapper).filter(Boolean);
}

function listFiles(dir, ext) {
  if (!exists(dir)) return [];
  return fs.readdirSync(dir)
    .filter(name => name.endsWith(ext))
    .map(name => path.join(dir, name));
}

function loadApiContract() {
  const file = path.join(PWA, 'api_contract.js');
  delete require.cache[require.resolve(file)];
  return require(file);
}

function parseHtml(name) {
  const file = path.join(PWA, name);
  if (!exists(file)) return null;
  const html = read(file);
  return {
    file: rel(file),
    scripts: extractAll(html, /<script\b[^>]+src="([^"]+)"/g)
      .filter(src => !/^https?:\/\//.test(src) && !src.startsWith('//'))
      .map(src => src.split('?')[0].replace(/^\/comphone-superapp\/pwa\//, '')),
    styles: extractAll(html, /<link\b[^>]+rel="stylesheet"[^>]+href="([^"]+)"/g)
      .filter(src => !/^https?:\/\//.test(src) && !src.startsWith('//'))
      .map(src => src.split('?')[0].replace(/^\/comphone-superapp\/pwa\//, '')),
    pageIds: extractAll(html, /id="page-([^"]+)"/g),
    sectionIds: extractAll(html, /id="section-([^"]+)"/g),
    contentIds: extractAll(html, /id="([^"]+-content)"/g),
    goPageRoutes: uniq([
      ...extractAll(html, /(?:goPage|navigateFromMore)\('([^']+)'/g),
      ...extractAll(html, /loadSection\('([^']+)'/g),
    ]),
  };
}

function parsePwaFile(file) {
  const text = read(file);
  return {
    file: rel(file),
    name: path.basename(file),
    text,
    functions: uniq(extractAll(text, /\bfunction\s+([A-Za-z_$][\w$]*)\s*\(/g)),
    windowExports: uniq(extractAll(text, /window\.([A-Za-z_$][\w$]*)\s*=/g)),
    apiCalls: uniq([
      ...extractAll(text, /\bcallApi\s*\(\s*['"]([^'"]+)['"]/g),
      ...extractAll(text, /\bcallAPI\s*\(\s*['"]([^'"]+)['"]/g),
      ...extractAll(text, /\bcallGas\s*\(\s*['"]([^'"]+)['"]/g),
    ]),
    routeCalls: uniq([
      ...extractAll(text, /\bgoPage\s*\(\s*['"]([^'"]+)['"]/g),
      ...extractAll(text, /\bnavigateFromMore\s*\(\s*['"]([^'"]+)['"]/g),
    ]),
    containerRefs: uniq(extractAll(text, /getElementById\(['"]([^'"]+)['"]\)/g)),
  };
}

function parseGasFile(file) {
  const text = read(file);
  return {
    file: rel(file),
    functions: uniq(extractAll(text, /\bfunction\s+([A-Za-z_$][\w$]*)\s*\(/g)),
    routerActions: uniq(extractAll(text, /['"]([A-Za-z_$][\w$]*)['"]\s*:\s*function\s*\(/g)),
  };
}

function makeFunctionIndex(pwaRows) {
  const map = new Map();
  for (const row of pwaRows) {
    for (const fn of [...row.functions, ...row.windowExports]) {
      if (!map.has(fn)) map.set(fn, []);
      map.get(fn).push(row.file);
    }
  }
  return map;
}

function makeApiIndex(rows, gasRows) {
  const frontend = new Map();
  for (const row of rows) {
    for (const action of row.apiCalls) {
      if (!frontend.has(action)) frontend.set(action, []);
      frontend.get(action).push(row.file);
    }
  }

  const gas = new Map();
  for (const row of gasRows) {
    for (const action of [...row.routerActions, ...row.functions]) {
      if (!gas.has(action)) gas.set(action, []);
      gas.get(action).push(row.file);
    }
  }

  return { frontend, gas };
}

function parseMobileMenu(appText) {
  const groups = [];
  const groupRegex = /\{\s*label:\s*'([^']+)'\s*,\s*items:\s*\[([\s\S]*?)\]\s*\}/g;
  for (const groupMatch of appText.matchAll(groupRegex)) {
    const [, groupLabel, body] = groupMatch;
    const items = [];
    const itemRegex = /\{\s*id:\s*'([^']+)'(?:\s*,\s*page:\s*'([^']+)')?(?:\s*,\s*fn:\s*'([^']+)')?\s*,\s*icon:\s*'([^']+)'\s*,\s*label:\s*'([^']+)'(?:\s*,\s*roles:\s*\[([^\]]+)\])?\s*\}/g;
    for (const itemMatch of body.matchAll(itemRegex)) {
      const [, id, page, fn, icon, label, rolesRaw] = itemMatch;
      items.push({
        id,
        page: page || null,
        fn: fn || null,
        icon,
        label,
        roles: rolesRaw ? extractAll(rolesRaw, /'([^']+)'/g) : [],
        group: groupLabel,
        surface: 'mobile',
      });
    }
    groups.push({ label: groupLabel, items });
  }
  return groups.flatMap(group => group.items);
}

function parsePcMenu(htmlText) {
  const items = [];
  const regex = /<a\b[^>]*class="nav-item[^"]*"[^>]*onclick="loadSection\('([^']+)'\)[^"]*"[\s\S]*?<\/a>/g;
  for (const match of htmlText.matchAll(regex)) {
    const labelMatch = match[0].match(/<span\b[^>]*>([^<]+)<\/span>/);
    items.push({
      id: match[1],
      page: match[1],
      fn: null,
      icon: '',
      label: labelMatch ? labelMatch[1].trim() : match[1],
      roles: [],
      group: 'PC Sidebar',
      surface: 'pc',
    });
  }
  return items;
}

function parseGoPageRenderers(appText) {
  const map = new Map();
  const blockRegex = /if\s*\(page === '([^']+)'\)\s*\{?([\s\S]*?)(?=\n\s*if\s*\(page === '|\n\s*}\s*\n\s*\/\/ POS|\n\s*ensurePageHasContent)/g;
  for (const match of appText.matchAll(blockRegex)) {
    const page = match[1];
    const block = match[2];
    const fns = uniq([
      ...extractAll(block, /\b([A-Za-z_$][\w$]*)\s*\(/g)
        .filter(fn => !['if', 'confirm', 'window', 'console', 'document'].includes(fn)),
      ...extractAll(block, /typeof\s+([A-Za-z_$][\w$]*)\s*===\s*'function'/g),
    ]);
    if (fns.length) map.set(page, fns);
  }
  return map;
}

function parsePcRenderers(coreText) {
  const renderers = new Map();
  const sectionRegex = /['"]?([a-z][a-z0-9_-]+)['"]?:\s*\(\)\s*=>\s*\{([\s\S]*?)\n\s*\},/g;
  for (const match of coreText.matchAll(sectionRegex)) {
    const section = match[1];
    const block = match[2];
    const fns = uniq([
      ...extractAll(block, /global\.([A-Za-z_$][\w$]*)/g),
      ...extractAll(block, /\b([A-Za-z_$][\w$]*)\s*\(/g)
        .filter(fn => !['if', 'document'].includes(fn)),
    ]);
    renderers.set(section, fns);
  }
  return renderers;
}

function contractByMenu(apiContract) {
  const map = new Map();
  for (const menu of apiContract.menus || []) map.set(menu.id, menu);
  return map;
}

function collectIssuesForMenu({ menu, html, pwaRows, functionIndex, apiIndex, contractMap, renderers }) {
  const issues = [];
  const page = menu.page || null;
  const route = page || menu.id;
  const pageIds = menu.surface === 'pc' ? html.pc.sectionIds : html.mobile.pageIds;
  const contentIds = menu.surface === 'pc' ? html.pc.contentIds : html.mobile.contentIds;
  const loadedScripts = new Set(menu.surface === 'pc' ? html.pc.scripts : html.mobile.scripts);

  if (page && !pageIds.includes(page) && !SPECIAL_OVERLAY_PAGES.has(page) && !STANDALONE_PAGES.has(page)) {
    issues.push({ priority: 'P1', type: 'missing-page-container', detail: `${menu.surface} route '${page}' has no matching page/section container.` });
  }

  if (menu.fn && !(functionIndex.get(menu.fn) || []).length) {
    issues.push({ priority: 'P1', type: 'missing-action-function', detail: `Quick/menu function '${menu.fn}' is not defined in loaded PWA JS.` });
  }

  const rendererFns = uniq(renderers.get(route) || []);
  const rendererFiles = uniq(rendererFns.flatMap(fn => functionIndex.get(fn) || [])
    .filter(file => loadedScripts.has(file.replace(/^pwa\//, ''))));
  if (page && !SPECIAL_OVERLAY_PAGES.has(page) && !STANDALONE_PAGES.has(page) && !rendererFns.length) {
    issues.push({ priority: 'P2', type: 'missing-renderer-link', detail: `No detected renderer function for route '${route}'.` });
  }
  if (rendererFns.length && !rendererFiles.length) {
    issues.push({ priority: 'P1', type: 'renderer-not-defined', detail: `Renderer candidates not found: ${rendererFns.join(', ')}` });
  }

  for (const file of rendererFiles) {
    const row = pwaRows.find(item => item.file === file);
    if (!row) continue;
    const usesMainContentOnly = row.containerRefs.includes('main-content') &&
      !row.containerRefs.includes(`${route}-content`) &&
      !row.containerRefs.includes(`page-${route}`) &&
      menu.surface === 'mobile';
    if (usesMainContentOnly) {
      issues.push({ priority: 'P1', type: 'mobile-container-mismatch', detail: `${file} references main-content without mobile container fallback for '${route}'.` });
    }
  }

  const contract = contractMap.get(route);
  const apiActions = contract ? (contract.actions || []) : [];
  for (const action of apiActions) {
    const frontendFiles = uniq(apiIndex.frontend.get(action.action) || []);
    const gasFiles = uniq(apiIndex.gas.get(action.action) || []);
    if (action.required && !gasFiles.length) {
      issues.push({ priority: 'P0', type: 'missing-required-gas-action', detail: `${action.action} has no GAS handler.` });
    }
    if (action.required && !frontendFiles.length) {
      issues.push({ priority: 'P2', type: 'required-api-not-called-by-pwa', detail: `${action.action} is required by contract but not directly called by PWA JS.` });
    }
  }

  return {
    id: menu.id,
    label: menu.label,
    group: menu.group,
    surface: menu.surface,
    route,
    pageExists: !page || pageIds.includes(page) || SPECIAL_OVERLAY_PAGES.has(page) || STANDALONE_PAGES.has(page),
    contentCandidates: contentIds.filter(id => id.startsWith(route) || id.includes(route)),
    functionAction: menu.fn,
    rendererFunctions: rendererFns,
    rendererFiles,
    apiActions: apiActions.map(item => ({
      action: item.action,
      required: !!item.required,
      frontendFiles: uniq(apiIndex.frontend.get(item.action) || []),
      gasHandlers: uniq(apiIndex.gas.get(item.action) || []),
    })),
    issues,
    status: issues.some(issue => issue.priority === 'P0' || issue.priority === 'P1') ? 'fail' :
      issues.length ? 'warn' : 'ok',
  };
}

function buildAiContract(pwaRows, gasRows) {
  const aiFiles = pwaRows.filter(row => /ai|executor|policy|lock|business/i.test(row.file));
  const gasAiFiles = gasRows.filter(row => /AI|Gemini|Executor|Policy|Lock|Business/i.test(row.file));
  const actions = uniq([...aiFiles.flatMap(row => row.apiCalls), ...gasAiFiles.flatMap(row => row.functions)]);
  const hasLock = pwaRows.some(row => /execution_lock|policy_engine/.test(row.file));
  const hasTelemetry = pwaRows.some(row => /telemetry|error_boundary|api_client/.test(row.file));
  const issues = [];
  if (!hasLock) issues.push({ priority: 'P1', type: 'missing-ai-lock', detail: 'No AI execution lock/policy layer detected.' });
  if (!hasTelemetry) issues.push({ priority: 'P2', type: 'missing-ai-telemetry', detail: 'No telemetry/error reporter detected for AI workflow.' });
  return {
    files: uniq([...aiFiles.map(row => row.file), ...gasAiFiles.map(row => row.file)]),
    actions,
    hasLock,
    hasTelemetry,
    issues,
    status: issues.some(issue => issue.priority === 'P1') ? 'fail' : issues.length ? 'warn' : 'ok',
  };
}

function writeMarkdown(report) {
  const failing = report.menus.filter(menu => menu.status !== 'ok');
  const rows = report.menus.map(menu => `| ${menu.surface} | ${menu.label} | ${menu.route} | ${menu.status} | ${menu.rendererFunctions.join(', ') || '-'} | ${menu.apiActions.map(a => a.action).join(', ') || '-'} | ${menu.issues.map(i => `[${i.priority}] ${i.type}`).join('<br>') || '-'} |`).join('\n');
  const risks = report.risks.map(risk => `- [${risk.priority}] ${risk.scope}: ${risk.type} - ${risk.detail}`).join('\n') || '- none';
  const text = [
    '# COMPHONE System Integrity Audit',
    '',
    `Generated: ${report.generated_at}`,
    `Version: ${report.version}`,
    '',
    '## Score',
    `- Overall: ${report.summary.score}/100`,
    `- Menus: ${report.summary.menus_total}`,
    `- OK: ${report.summary.menus_ok}`,
    `- Warn: ${report.summary.menus_warn}`,
    `- Fail: ${report.summary.menus_fail}`,
    `- Risks: ${report.risks.length}`,
    '',
    '## Highest Priority Risks',
    risks,
    '',
    '## Menu Functional Matrix',
    '| Surface | Menu | Route | Status | Renderer | API actions | Issues |',
    '|---|---|---|---|---|---|---|',
    rows || '| - | - | - | - | - | - | - |',
    '',
    '## Failing Or Warning Menus',
    failing.map(menu => `- ${menu.surface}/${menu.label}: ${menu.issues.map(i => `[${i.priority}] ${i.detail}`).join('; ')}`).join('\n') || '- none',
    '',
    '## AI Workflow Contract',
    `- Status: ${report.ai.status}`,
    `- Lock layer: ${report.ai.hasLock ? 'yes' : 'no'}`,
    `- Telemetry: ${report.ai.hasTelemetry ? 'yes' : 'no'}`,
    `- Files: ${report.ai.files.join(', ') || '-'}`,
    '',
  ].join('\n');
  fs.writeFileSync(REPORT_MD, text, 'utf8');
}

function main() {
  const mobileHtml = parseHtml('index.html');
  const pcHtml = parseHtml('dashboard_pc.html');
  const pwaRows = listFiles(PWA, '.js').map(parsePwaFile);
  const gasRows = listFiles(GAS, '.gs').map(parseGasFile);
  const apiContract = loadApiContract();
  const functionIndex = makeFunctionIndex(pwaRows);
  const apiIndex = makeApiIndex(pwaRows, gasRows);
  const contractMap = contractByMenu(apiContract);

  const appText = read(path.join(PWA, 'app.js'));
  const pcCoreText = exists(path.join(PWA, 'dashboard_pc_core.js')) ? read(path.join(PWA, 'dashboard_pc_core.js')) : '';
  const mobileMenus = parseMobileMenu(appText);
  const pcMenus = parsePcMenu(read(path.join(PWA, 'dashboard_pc.html')));
  const mobileRenderers = parseGoPageRenderers(appText);
  const pcRenderers = parsePcRenderers(pcCoreText);

  const html = { mobile: mobileHtml, pc: pcHtml };
  const menus = [
    ...mobileMenus.map(menu => collectIssuesForMenu({ menu, html, pwaRows, functionIndex, apiIndex, contractMap, renderers: mobileRenderers })),
    ...pcMenus.map(menu => collectIssuesForMenu({ menu, html, pwaRows, functionIndex, apiIndex, contractMap, renderers: pcRenderers })),
  ];

  const ai = buildAiContract(pwaRows, gasRows);
  const risks = [
    ...menus.flatMap(menu => menu.issues.map(issue => ({
      priority: issue.priority,
      scope: `${menu.surface}:${menu.route}`,
      type: issue.type,
      detail: issue.detail,
    }))),
    ...ai.issues.map(issue => Object.assign({ scope: 'ai' }, issue)),
  ].sort((a, b) => (a.priority > b.priority ? 1 : -1));

  const menuScore = menus.length
    ? Math.round(menus.reduce((sum, menu) => sum + STATUS_SCORE[menu.status], 0) / menus.length)
    : 0;
  const aiPenalty = ai.status === 'fail' ? 10 : ai.status === 'warn' ? 4 : 0;
  const score = Math.max(0, menuScore - aiPenalty);

  const report = {
    generated_at: new Date().toISOString(),
    version: '2026-05-07.system-integrity-v1',
    summary: {
      score,
      menus_total: menus.length,
      menus_ok: menus.filter(menu => menu.status === 'ok').length,
      menus_warn: menus.filter(menu => menu.status === 'warn').length,
      menus_fail: menus.filter(menu => menu.status === 'fail').length,
      risks_p0: risks.filter(risk => risk.priority === 'P0').length,
      risks_p1: risks.filter(risk => risk.priority === 'P1').length,
      risks_p2: risks.filter(risk => risk.priority === 'P2').length,
    },
    html,
    menus,
    ai,
    risks,
  };

  fs.mkdirSync(path.dirname(REPORT_JSON), { recursive: true });
  fs.writeFileSync(REPORT_JSON, JSON.stringify(report, null, 2) + '\n', 'utf8');
  writeMarkdown(report);

  console.log('[System Integrity] report: ' + rel(REPORT_JSON));
  console.log('[System Integrity] summary: ' + rel(REPORT_MD));
  console.log(`[System Integrity] score=${score}/100 menus=${menus.length} ok=${report.summary.menus_ok} warn=${report.summary.menus_warn} fail=${report.summary.menus_fail}`);
  for (const risk of risks.slice(0, 12)) {
    console.log(`- [${risk.priority}] ${risk.scope}: ${risk.type} - ${risk.detail}`);
  }

  if (risks.some(risk => risk.priority === 'P0')) process.exit(1);
}

main();
