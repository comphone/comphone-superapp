#!/usr/bin/env node
/*
 * Sprint 125 Role-Based Dashboard Widgets Audit
 *
 * Guards the PC and mobile role-aware dashboard widgets so future UI work can
 * add intelligence without removing the stable operator dashboard contracts.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

const checks = [];
function check(name, pass, detail) {
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
const versionJs = read('pwa/version_config.js');
const build = (versionJs.match(/BUILD_TIMESTAMP\s*=\s*'([^']+)'/) || [])[1] || '';

check(
  'pc-role-widget-renderer',
  dashboardJs.includes('function renderRoleFocusWidget') &&
    dashboardJs.includes('function getDashboardRole') &&
    dashboardJs.includes('data-role-widget="${role}"') &&
    dashboardJs.includes('role-focus-widget'),
  'PC dashboard must render a role-aware focus widget.'
);

check(
  'pc-role-widget-roles',
  ['tech', 'admin', 'acct', 'exec'].every(role => dashboardJs.includes(`${role}: {`)) &&
    ['Field Focus', 'Dispatch Focus', 'Cash Focus', 'Executive Focus'].every(label => dashboardJs.includes(label)),
  'PC role widget must cover tech/admin/acct/exec focus modes.'
);

check(
  'mobile-role-widget-renderer',
  appHomeJs.includes('function renderMobileRoleFocus') &&
    appHomeJs.includes('data-mobile-role-widget="${role}"') &&
    appHomeJs.includes('function renderMobileCommandCenter') &&
    appHomeJs.includes('renderOperatorPulse()') &&
    appHomeJs.includes('renderMobileRoleFocus()'),
  'Mobile home must render the role-aware focus widget inside the compact command center next to Operator Pulse context.'
);

check(
  'mobile-role-widget-roles',
  ['tech:', 'admin:', 'acct:', 'exec:'].every(role => appHomeJs.includes(role)) &&
    ['Field Focus', 'Dispatch Focus', 'Cash Focus', 'Executive Focus'].every(label => appHomeJs.includes(label)),
  'Mobile role widget must cover all operator roles.'
);

check(
  'existing-dashboard-contracts-preserved',
  dashboardJs.includes('operator-insight-strip') &&
    appHomeJs.includes('operator-pulse-card') &&
    dashboardJs.includes('executive-command-center') &&
    appHomeJs.includes('quick-actions-grid'),
  'Sprint 125 must preserve Sprint 122/123 dashboard contracts.'
);

check(
  'role-widget-css',
  dashboardCss.includes('.role-focus-widget') &&
    dashboardCss.includes('.role-focus-action') &&
    mobileCss.includes('.mobile-role-focus-card') &&
    mobileCss.includes('.mobile-role-focus-action'),
  'PC and mobile role widgets must have dedicated responsive styles.'
);

check(
  'ci-wiring',
  staticGuard.includes('SPRINT125_ROLE_BASED_DASHBOARD_WIDGETS') &&
    regressionGuard.includes('sprint125_role_based_dashboard_widgets_audit.js') &&
    autoDeploy.includes('scripts/sprint125_role_based_dashboard_widgets_audit.js'),
  'Sprint 125 audit must be wired into static guard, regression guard, and GitHub Actions.'
);

check(
  'blueprint-current',
  blueprint.includes('Phase 125 Role-Based Dashboard Widgets') &&
    blueprint.includes('sprint125_role_based_dashboard_widgets_audit.js') &&
    build &&
    blueprint.includes(build),
  'BLUEPRINT.md must document Sprint 125 and current build timestamp.'
);

const failed = checks.filter(item => !item.pass);
console.log('Sprint 125 Role-Based Dashboard Widgets Audit');
console.log(`Score: ${checks.length - failed.length}/${checks.length}`);
for (const item of checks) {
  console.log(`${item.pass ? 'OK ' : 'FAIL'} ${item.name} - ${item.detail}`);
}

if (failed.length) process.exitCode = 1;
