const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

const checks = [];

function addCheck(name, pass, detail) {
  checks.push({ name, pass: Boolean(pass), detail });
}

const dashboardJs = read('pwa/dashboard.js');
const appHomeJs = read('pwa/app_home.js');
const dashboardCss = read('pwa/dashboard_shared.css');
const mobileCss = read('pwa/mobile_glass.css');
const staticGuard = read('scripts/pwa_static_guard.js');
const regressionGuard = read('scripts/regression-guard.sh');
const autoDeploy = read('.github/workflows/auto-deploy.yml');
const blueprint = read('BLUEPRINT.md');

addCheck(
  'pc-operator-insight-strip',
  dashboardJs.includes('buildOperatorInsightCards') &&
    dashboardJs.includes('renderOperatorInsightCard') &&
    dashboardJs.includes('data-dashboard-polish="operator-insights"') &&
    dashboardJs.includes('operator-insight-strip'),
  'PC dashboard must render an operator insight strip from existing dashboard metrics.'
);

addCheck(
  'pc-command-tiles-accessible',
  dashboardJs.includes('type="button" class="executive-command-tile"') &&
    dashboardJs.includes('aria-label="${label}"'),
  'Executive command tiles must be real buttons with accessible labels.'
);

addCheck(
  'pc-operator-metric-coverage',
  ['billingOpen', 'poOpen', 'visionReview', 'linePending', 'lowStock', 'overdueJobs'].every(token => dashboardJs.includes(token)),
  'Operator insight cards must cover service, billing, stock, Vision, LINE, and overdue risk.'
);

addCheck(
  'mobile-operator-pulse',
  appHomeJs.includes('function renderOperatorPulse') &&
    appHomeJs.includes('data-mobile-operator-pulse="true"') &&
    appHomeJs.includes('pulse + renderTechHome') &&
    appHomeJs.includes('pulse + renderAdminHome') &&
    appHomeJs.includes('pulse + renderAcctHome') &&
    appHomeJs.includes('pulse + renderExecHome'),
  'Mobile home must prepend an operator pulse card for every role.'
);

addCheck(
  'mobile-operator-metric-coverage',
  ['billingOpen', 'visionReview', 'linePending', 'lowStock', 'overdueJobs'].every(token => appHomeJs.includes(token)),
  'Mobile operator pulse must summarize risk across billing, stock, Vision, LINE, and SLA.'
);

addCheck(
  'operator-css',
  dashboardCss.includes('.operator-insight-strip') &&
    dashboardCss.includes('.operator-insight-card') &&
    mobileCss.includes('.operator-pulse-card') &&
    mobileCss.includes('.operator-pulse-metric'),
  'PC and mobile operator analytics components must have dedicated responsive styling.'
);

addCheck(
  'ci-wiring',
  staticGuard.includes('SPRINT122_DASHBOARD_OPERATOR_ANALYTICS') &&
    regressionGuard.includes('sprint122_dashboard_operator_analytics_audit.js') &&
    autoDeploy.includes('scripts/sprint122_dashboard_operator_analytics_audit.js'),
  'Sprint 122 audit must be wired into static guard, regression guard, and GitHub Actions.'
);

addCheck(
  'blueprint-current',
  blueprint.includes('Phase 122 Dashboard Operator Analytics Polish') &&
    blueprint.includes('sprint122_dashboard_operator_analytics_audit.js') &&
    blueprint.includes('20260518_0535'),
  'BLUEPRINT.md must describe Sprint 122 and current build timestamp.'
);

const failed = checks.filter(item => !item.pass);
console.log('Sprint 122 Dashboard Operator Analytics Audit');
console.log(`Score: ${checks.length - failed.length}/${checks.length}`);
for (const item of checks) {
  console.log(`${item.pass ? 'OK ' : 'FAIL'} ${item.name} - ${item.detail}`);
}

if (failed.length) {
  process.exitCode = 1;
}
