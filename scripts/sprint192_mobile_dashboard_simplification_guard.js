#!/usr/bin/env node
/**
 * Sprint 192 Mobile Dashboard Simplification Guard
 * Protects the lean mobile dashboard redesign: 4 quick actions, cached boot,
 * compact command center, and grouped More menu.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REPORT = path.join(ROOT, 'test_reports', 'sprint192_mobile_dashboard_simplification_guard_latest.json');

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

function has(text, token) {
  return text.includes(token);
}

const files = {
  app: read('pwa/app.js'),
  home: read('pwa/app_home.js'),
  css: read('pwa/mobile_glass.css'),
  workflow: read('.github/workflows/auto-deploy.yml'),
  regression: read('scripts/regression-guard.sh'),
  blueprint: read('BLUEPRINT.md'),
};

const checks = [
  {
    id: 'quick-actions-limited-to-four',
    ok: has(files.app, 'MOBILE_QUICK_ACTION_LIMIT = 4') &&
      has(files.app, "DEFAULT_QUICK_ACTION_IDS = ['openNewJob', 'jobs', 'billing', 'reports']") &&
      has(files.home, '.slice(0, 4)'),
  },
  {
    id: 'dashboard-cache-fast-boot',
    ok: ['DASHBOARD_CACHE_KEY', 'DASHBOARD_CACHE_TTL_MS', 'hydrateMobileDashboardCache', 'persistMobileDashboardCache', 'dashboardFromCache'].every(token => has(files.app, token)),
  },
  {
    id: 'command-center-compact',
    ok: has(files.home, 'renderMobileCommandCenter') &&
      has(files.home, 'data-mobile-command-center') &&
      has(files.css, '.mobile-command-center') &&
      has(files.css, '.mobile-cache-note'),
  },
  {
    id: 'more-menu-progressive-disclosure',
    ok: has(files.app, 'bindMoreMenuActions') &&
      has(files.app, 'more-menu-advanced') &&
      has(files.app, 'เมนูอื่นในหมวดนี้') &&
      has(files.css, '.more-menu-advanced') &&
      has(files.css, '.more-menu-subtitle'),
  },
  {
    id: 'existing-dashboard-contracts-preserved',
    ok: ['renderOperatorPulse', 'renderMobileRoleFocus', 'renderMobileDecisionLayer', 'data-mobile-role-widget', 'data-mobile-decision-layer'].every(token => has(files.home, token)),
  },
  {
    id: 'ci-wiring',
    ok: has(files.workflow, 'sprint192_mobile_dashboard_simplification_guard.js') &&
      has(files.regression, 'sprint192_mobile_dashboard_simplification_guard'),
  },
  {
    id: 'blueprint-current',
    ok: has(files.blueprint, 'Sprint 192') &&
      has(files.blueprint, 'Mobile Dashboard Simplification'),
  },
];

const failures = checks.filter(check => !check.ok);
const report = {
  sprint: 192,
  name: 'Mobile Dashboard Simplification Guard',
  generated_at: new Date().toISOString(),
  score: Math.round(((checks.length - failures.length) / checks.length) * 100),
  checks,
  failures,
};

fs.mkdirSync(path.dirname(REPORT), { recursive: true });
fs.writeFileSync(REPORT, JSON.stringify(report, null, 2));

if (failures.length) {
  console.error('[Sprint 192] FAILED');
  failures.forEach(failure => console.error(` - ${failure.id}`));
  console.error(`[Sprint 192] report: ${path.relative(ROOT, REPORT)}`);
  process.exit(1);
}

console.log(`[Sprint 192] OK ${report.score}/100 - Mobile dashboard simplification guard passed`);
console.log(`[Sprint 192] report: ${path.relative(ROOT, REPORT)}`);
