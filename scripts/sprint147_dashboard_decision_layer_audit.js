#!/usr/bin/env node
/*
 * Sprint 147 Dashboard Decision Layer Audit
 *
 * Guards the PC/mobile dashboard as a decision surface, not just KPI cards.
 * The dashboard must surface next actions for Jobs, Billing, Reports,
 * Inventory, AI Vision, and LINE without introducing write calls.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REPORT = path.join(ROOT, 'test_reports', 'sprint147_dashboard_decision_layer_latest.json');

function read(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }
function has(text, token) { return text.includes(token); }

function main() {
  const files = {
    dashboard: read('pwa/dashboard.js'),
    pc: read('pwa/dashboard_pc.html'),
    app: read('pwa/app.js'),
    home: read('pwa/app_home.js'),
    contract: read('pwa/api_contract.js'),
  };
  const dashboardSource = files.dashboard;
  const mobileSource = `${files.app}\n${files.home}`;
  const checks = [
    { id: 'dashboard-decision-layer-rendered', ok: has(dashboardSource, 'dashboard-decision-layer') && has(dashboardSource, 'renderDashboardDecisionLayer'), type: 'static' },
    { id: 'decision-items-builder', ok: has(dashboardSource, 'buildDashboardDecisionItems') && has(dashboardSource, 'decision-priority'), type: 'static' },
    { id: 'jobs-billing-reports-prioritized', ok: ['jobs', 'billing', 'reports'].every(token => has(dashboardSource, token)), type: 'static' },
    { id: 'inventory-vision-line-prioritized', ok: ['inventory', 'vision', 'line-center'].every(token => has(dashboardSource, token)), type: 'static' },
    { id: 'pc-loads-dashboard-script', ok: has(files.pc, 'dashboard.js?') && has(files.pc, 'dashboard_shared.css?'), type: 'static' },
    { id: 'mobile-quick-action-settings-still-present', ok: has(mobileSource, 'showQuickActionSettings') && has(mobileSource, 'runQuickAction'), type: 'static' },
    { id: 'api-contract-supports-decision-routes', ok: ['checkJobs', 'listBillings', 'getReportData', 'inventoryOverview', 'getVisionDashboardStats', 'getLineCommandCenter'].every(token => has(files.contract, token)), type: 'static' },
    { id: 'decision-layer-read-only', ok: !/renderDashboardDecisionLayer[\s\S]*callApi\(['"](?:create|update|delete|save|execute|send)/.test(dashboardSource), type: 'static' },
  ];
  const failures = checks.filter(row => !row.ok);
  const report = { generated_at: new Date().toISOString(), mode: 'dashboard-decision-layer-static-audit', status: failures.length ? 'fail' : 'ok', score: Math.round((checks.length - failures.length) / checks.length * 100), checks };
  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, JSON.stringify(report, null, 2) + '\n', 'utf8');
  console.log(`[Sprint 147 Dashboard Decision Layer] status=${report.status} score=${report.score}/100 checks=${checks.length - failures.length}/${checks.length}`);
  console.log(`[Sprint 147 Dashboard Decision Layer] report: ${path.relative(ROOT, REPORT).replace(/\\/g, '/')}`);
  if (failures.length) process.exit(1);
}

main();
