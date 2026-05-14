const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REPORT_DIR = path.join(ROOT, 'test_reports');
const JSON_REPORT = path.join(REPORT_DIR, 'sprint80_production_journey_latest.json');
const MD_REPORT = path.join(REPORT_DIR, 'sprint80_production_journey_latest.md');

function read(relPath) {
  const file = path.join(ROOT, relPath);
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
}

function rel(file) {
  return file.replace(/\\/g, '/');
}

function has(text, needle) {
  return typeof needle === 'string' ? text.includes(needle) : needle.test(text);
}

function check(id, label, ok, severity, details, files) {
  return { id, label, ok: !!ok, severity, details, files: files.map(rel) };
}

const files = {
  dashboardHtml: 'pwa/dashboard_pc.html',
  dashboardCore: 'pwa/dashboard_pc_core.js',
  mobileHtml: 'pwa/index.html',
  mobileApp: 'pwa/app.js',
  settings: 'pwa/section_settings.js',
  apiContract: 'pwa/api_contract.js',
  gasConfig: 'pwa/gas_config.js',
  deployGas: '.github/workflows/deploy-gas.yml',
  autoDeploy: '.github/workflows/auto-deploy.yml',
  regressionGuard: 'scripts/regression-guard.sh',
  gasSyntaxGuard: 'scripts/gas_syntax_guard.js',
};

const text = Object.fromEntries(Object.entries(files).map(([key, file]) => [key, read(file)]));

const pcSections = [
  'dashboard', 'jobs', 'po', 'inventory', 'billing', 'warranty',
  'revenue', 'tax', 'reports', 'analytics', 'performance', 'vision',
  'line-center', 'backup', 'crm', 'attendance', 'settings',
];

const mobilePages = [
  'home', 'jobs', 'camera', 'crm', 'po', 'attendance', 'vision',
  'line-center', 'profile', 'reports', 'inventory', 'billing',
  'warranty', 'dashboard', 'customer-portal', 'notifications',
  'analytics', 'revenue', 'tax', 'performance', 'admin',
];

const mobileMenuPages = [
  'jobs', 'crm', 'attendance', 'warranty', 'inventory', 'po', 'billing',
  'revenue', 'tax', 'dashboard', 'vision', 'line-center', 'reports',
  'analytics', 'performance', 'notifications', 'customer-portal',
  'profile', 'admin',
];

const checks = [
  check(
    'pc-section-router-complete',
    'PC dashboard has real section routing for every production sidebar menu.',
    pcSections.every(section => text.dashboardCore.includes(`'${section}'`) || text.dashboardCore.includes(`${section}:`)) &&
      pcSections.every(section => text.dashboardHtml.includes(`loadSection('${section}')`) || section === 'dashboard'),
    'P0',
    `Required PC sections: ${pcSections.join(', ')}`,
    [files.dashboardHtml, files.dashboardCore]
  ),
  check(
    'pc-no-false-ai-lock-badge',
    'PC version badge no longer reports removed AI_EXECUTOR/LOCK paths as production failures.',
    has(text.settings, 'function updateVersionBadge') &&
      has(text.settings, 'API:<span') &&
      has(text.settings, 'CACHE:<span') &&
      !has(text.settings, 'AI:<span') &&
      !has(text.settings, 'LOCK:<span'),
    'P1',
    'The post-recovery PC runtime uses api_client.js directly; a stale AI:FAIL/LOCK:FAIL badge is a false operator alarm.',
    [files.settings]
  ),
  check(
    'mobile-pages-present',
    'Mobile PWA keeps all production page containers present for last-page restore and More-menu navigation.',
    mobilePages.every(page => text.mobileHtml.includes(`id="page-${page}"`)),
    'P0',
    `Required mobile page containers: ${mobilePages.join(', ')}`,
    [files.mobileHtml]
  ),
  check(
    'mobile-more-menu-grouped',
    'Mobile More menu is grouped and routes menu pages without blank white sheets.',
    has(text.mobileApp, 'const MENU_GROUPS') &&
      has(text.mobileApp, 'function renderMoreMenu') &&
      has(text.mobileApp, 'more-menu-group-label') &&
      has(text.mobileApp, 'data-menu-page') &&
      has(text.mobileApp, 'navigateFromMore') &&
      mobileMenuPages.every(page => text.mobileApp.includes(`page: '${page}'`) || text.mobileApp.includes(`page:'${page}'`)),
    'P0',
    'The More sheet is the main mobile navigation surface; all menu pages must be grouped and routable.',
    [files.mobileApp, files.mobileHtml]
  ),
  check(
    'mobile-last-page-restore',
    'Mobile protects current work by restoring the last page and handling accidental back/close flows.',
    has(text.mobileApp, 'const LAST_PAGE_KEY') &&
      has(text.mobileApp, 'localStorage.setItem(LAST_PAGE_KEY') &&
      has(text.mobileApp, 'restoreLastPage') &&
      has(text.mobileApp, 'popstate') &&
      has(text.mobileApp, 'skipHistory'),
    'P1',
    'Mobile should return to the current working page after reopening and intercept accidental back gestures.',
    [files.mobileApp]
  ),
  check(
    'dashboard-settings-diagnostics',
    'Settings keeps diagnostics, self-test, export, and safe cache repair available.',
    has(text.settings, 'runtime-selftest-content') &&
      has(text.settings, 'renderRuntimeSelfTestPanel') &&
      has(text.settings, 'exportComphoneDiagnostics') &&
      has(text.settings, 'clearPwaRuntimeCache') &&
      has(text.settings, 'Operations Diagnostics'),
    'P1',
    'Settings is the recovery surface operators use when menus or caches misbehave.',
    [files.settings]
  ),
  check(
    'api-contract-main-journeys',
    'API contract covers the production journeys used by PC/mobile menu smoke.',
    ['job_e2e', 'billing_payment', 'inventory_pos', 'crm_after_sales', 'observability', 'vision_ai', 'line_command_center']
      .every(id => text.apiContract.includes(id)),
    'P1',
    'Menu journey audits and API smoke should be driven by the shared API contract.',
    [files.apiContract]
  ),
  check(
    'deploy-gas-validation-stable',
    'GAS deploy workflow uses the shared syntax guard instead of a raw brace counter.',
    has(text.deployGas, 'node scripts/gas_syntax_guard.js') &&
      !has(text.deployGas, 'let depth = 0') &&
      !has(text.deployGas, "for (const c of code)") &&
      has(text.gasSyntaxGuard, 'stripStringsAndComments') &&
      has(text.gasSyntaxGuard, 'merge-conflict markers'),
    'P1',
    'Raw brace counting fails on valid Apps Script regex/string content and blocks deploys with false positives.',
    [files.deployGas, files.gasSyntaxGuard]
  ),
  check(
    'ci-regression-coverage',
    'CI syntax checks and regression guard include Sprint 80 production journey audit.',
    has(text.autoDeploy, 'sprint80_production_journey_audit.js') &&
      has(text.regressionGuard, 'sprint80_production_journey_audit.js'),
    'P1',
    'Sprint 80 journey coverage should run locally and in GitHub Actions.',
    [files.autoDeploy, files.regressionGuard]
  ),
];

const findings = checks.filter(item => !item.ok);
const penalty = findings.reduce((sum, item) => sum + ({ P0: 12, P1: 6, P2: 3 }[item.severity] || 2), 0);
const score = Math.max(0, 100 - penalty);

const report = {
  generated_at: new Date().toISOString(),
  version: 'sprint80-production-journey-audit-1.0.0',
  score,
  checks,
  findings: findings.map(item => ({
    id: item.id,
    severity: item.severity,
    label: item.label,
    details: item.details,
    files: item.files,
  })),
};

fs.mkdirSync(REPORT_DIR, { recursive: true });
fs.writeFileSync(JSON_REPORT, JSON.stringify(report, null, 2) + '\n', 'utf8');
fs.writeFileSync(MD_REPORT, [
  '# Sprint 80 Production Journey Audit',
  '',
  `- Generated: ${report.generated_at}`,
  `- Score: ${score}/100`,
  '',
  '## Checks',
  ...checks.map(item => `- ${item.ok ? 'OK' : 'FAIL'} [${item.severity}] ${item.id}: ${item.label}`),
  '',
  '## Findings',
  ...(report.findings.length
    ? report.findings.map(item => `- [${item.severity}] ${item.id}: ${item.details}`)
    : ['- No production journey findings detected.']),
  '',
].join('\n'));

console.log(`[Sprint 80 Production Journey Audit] score=${score}/100 findings=${report.findings.length}`);
console.log(`[Sprint 80 Production Journey Audit] report: ${rel(path.relative(ROOT, JSON_REPORT))}`);

if (report.findings.some(item => item.severity === 'P0' || item.severity === 'P1')) {
  console.error('[Sprint 80 Production Journey Audit] FAILED');
  report.findings.forEach(item => console.error(`- [${item.severity}] ${item.id}: ${item.details}`));
  process.exit(1);
}
