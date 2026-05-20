#!/usr/bin/env node
/*
 * Sprint 151 Dashboard UX Polish Audit
 *
 * Ensures PC and Mobile dashboards both expose decision-layer next actions,
 * quick-action editing, and route-safe buttons without write calls.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REPORT = path.join(ROOT, 'test_reports', 'sprint151_dashboard_ux_polish_latest.json');

function read(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }
function has(text, token) { return text.includes(token); }

function main() {
  const files = {
    pcDashboard: read('pwa/dashboard.js'),
    mobileHome: read('pwa/app_home.js'),
    mobileApp: read('pwa/app.js'),
    mobileCss: read('pwa/mobile_glass.css'),
    workflow: read('.github/workflows/auto-deploy.yml'),
    regression: read('scripts/regression-guard.sh'),
  };
  const checks = [
    { id: 'pc-decision-layer', ok: has(files.pcDashboard, 'renderDashboardDecisionLayer') && has(files.pcDashboard, 'buildDashboardDecisionItems'), type: 'static' },
    { id: 'mobile-decision-layer', ok: has(files.mobileHome, 'renderMobileDecisionLayer') && has(files.mobileHome, 'buildMobileDecisionItems') && has(files.mobileHome, 'data-mobile-decision-layer'), type: 'static' },
    { id: 'mobile-decision-css', ok: has(files.mobileCss, '.mobile-decision-layer') && has(files.mobileCss, '.mobile-decision-grid') && has(files.mobileCss, '.mobile-decision-item.priority-high'), type: 'static' },
    { id: 'quick-action-settings-linked', ok: has(files.mobileHome, 'showQuickActionSettings') && has(files.mobileApp, 'saveQuickActions'), type: 'static' },
    { id: 'decision-routes-covered', ok: ['jobs', 'billing', 'reports', 'inventory', 'vision', 'line-center'].every(token => has(files.pcDashboard, token) && has(files.mobileHome, token)), type: 'static' },
    { id: 'decision-layers-read-only', ok: !/render(?:Mobile)?DecisionLayer[\s\S]*call(?:Api|API)\(['"](?:create|update|delete|save|execute|send)/.test(files.mobileHome + files.pcDashboard), type: 'static' },
    { id: 'ci-wiring-ready', ok: has(files.workflow, 'sprint151_dashboard_ux_polish_audit.js') && has(files.regression, 'sprint151_dashboard_ux_polish_audit.js'), type: 'static' },
  ];
  const failures = checks.filter(row => !row.ok);
  const report = { generated_at: new Date().toISOString(), mode: 'dashboard-ux-polish-static-audit', status: failures.length ? 'fail' : 'ok', score: Math.round((checks.length - failures.length) / checks.length * 100), checks };
  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, JSON.stringify(report, null, 2) + '\n', 'utf8');
  console.log(`[Sprint 151 Dashboard UX Polish] status=${report.status} score=${report.score}/100 checks=${checks.length - failures.length}/${checks.length}`);
  console.log(`[Sprint 151 Dashboard UX Polish] report: ${path.relative(ROOT, REPORT).replace(/\\/g, '/')}`);
  if (failures.length) process.exit(1);
}

main();
