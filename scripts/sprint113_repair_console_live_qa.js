#!/usr/bin/env node
/*
 * Sprint 113 Repair Console Live QA
 *
 * Static and CI-safe readiness check for the live Repair Console surfaces.
 * It does not execute production repair or require a session token.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REPORT_DIR = path.join(ROOT, 'test_reports');
const REPORT_JSON = path.join(REPORT_DIR, 'sprint113_repair_console_live_qa_latest.json');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function has(text, needle) {
  return text.includes(needle);
}

function main() {
  const files = {
    admin: read('pwa/admin_panel.js'),
    settings: read('pwa/section_settings.js'),
    version: read('pwa/version_config.js'),
    sw: read('pwa/sw.js'),
    index: read('pwa/index.html'),
    pc: read('pwa/dashboard_pc.html'),
    pages: read('scripts/pages_deploy_verify.js'),
    staticGuard: read('scripts/pwa_static_guard.js'),
    regression: read('scripts/regression-guard.sh'),
    workflow: read('.github/workflows/auto-deploy.yml'),
    blueprint: read('BLUEPRINT.md'),
  };
  const checks = [];
  const issues = [];
  function check(area, name, ok, detail, severity = 'P0') {
    const row = { area, name, ok: !!ok, severity, detail };
    checks.push(row);
    if (!row.ok) issues.push(row);
  }

  check('mobile', 'repair-console-rendered',
    has(files.admin, 'data-tab="repair"') &&
      has(files.admin, 'renderDataRepairConsole_') &&
      has(files.admin, 'hydrateAdminDataRepair_') &&
      has(files.admin, 'executeAdminDataRepair_'),
    'Mobile Admin must keep the Repair tab, renderer, hydration, and gated execute handler.');

  check('pc', 'settings-repair-console-rendered',
    has(files.settings, 'settings-data-repair-content') &&
      has(files.settings, 'hydrateSettingsDataRepairPanel') &&
      has(files.settings, 'executeSettingsDataRepair_'),
    'PC Settings must keep the Repair Console panel and gated execute handler.');

  check('safety', 'confirmation-gate-visible',
    has(files.admin, 'EXECUTE_REVIEWED_DATA_REPAIR') &&
      has(files.settings, 'EXECUTE_REVIEWED_DATA_REPAIR') &&
      has(files.admin, 'archive_delete_orphan_billing_row') &&
      has(files.settings, 'archive_delete_orphan_billing_row'),
    'Both UI surfaces must keep exact confirmation and narrow repair action.');

  check('freshness', 'single-build-timestamp',
    has(files.version, "BUILD_TIMESTAMP = '20260518_0515'") &&
      has(files.sw, "20260518_0515") &&
      has(files.index, 't=20260518_0515') &&
      has(files.pc, 't=20260518_0515'),
    'PWA shell, service worker, PC, and mobile pages must share the latest cache token.');

  check('pages', 'pages-freshness-tool-present',
    has(files.pages, 'GitHub Pages is serving the same PWA version/build/GAS URL') &&
      has(files.pages, 'buildTimestamp') &&
      has(files.pages, 'cdn_pending'),
    'Pages deploy verification must detect stale CDN/git-pages builds without blocking local code review.');

  check('ci', 'sprint113-wired',
    has(files.staticGuard, 'sprint113_repair_console_live_qa.js') &&
      has(files.regression, 'sprint113_repair_console_live_qa.js') &&
      has(files.workflow, 'sprint113_repair_console_live_qa.js'),
    'Sprint 113 guard must run in static guard, regression guard, and GitHub Actions syntax checks.');

  check('blueprint', 'blueprint-documents-sprint113',
    has(files.blueprint, 'Phase 113 Repair Console Live QA') &&
      has(files.blueprint, 'pages_deploy_verify.js') &&
      has(files.blueprint, '20260518_0515'),
    'BLUEPRINT must document live Repair Console QA and Pages freshness state.');

  const p0 = issues.filter(item => item.severity === 'P0').length;
  const score = Math.round((checks.filter(item => item.ok).length / checks.length) * 100);
  const report = { generated_at: new Date().toISOString(), version: 'sprint113-repair-console-live-qa-1.0.0', status: p0 ? 'fail' : 'ok', score, checks, issues };
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(REPORT_JSON, JSON.stringify(report, null, 2) + '\n', 'utf8');
  console.log(`[Sprint 113 Repair Console Live QA] status=${report.status} score=${score}/100`);
  console.log(`[Sprint 113 Repair Console Live QA] report: ${path.relative(ROOT, REPORT_JSON).replace(/\\/g, '/')}`);
  if (p0) process.exit(1);
}

main();
