#!/usr/bin/env node
/*
 * Sprint 112 Admin Repair Console Audit
 *
 * Guards the PC Settings and Mobile Admin repair consoles that surface Sprint
 * 111 preview/status/execute actions. This remains static by default and does
 * not execute production repair.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REPORT_DIR = path.join(ROOT, 'test_reports');
const REPORT_JSON = path.join(REPORT_DIR, 'sprint112_admin_repair_console_latest.json');
const REPORT_MD = path.join(REPORT_DIR, 'sprint112_admin_repair_console_latest.md');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function has(text, pattern) {
  return pattern instanceof RegExp ? pattern.test(text) : text.includes(pattern);
}

function main() {
  const files = {
    admin: read('pwa/admin_panel.js'),
    settings: read('pwa/section_settings.js'),
    apiContract: read('pwa/api_contract.js'),
    app: read('pwa/app.js'),
    lock: read('pwa/execution_lock.js'),
    sprint111: read('scripts/sprint111_controlled_data_repair_execution.js'),
    workflow: read('.github/workflows/auto-deploy.yml'),
    regression: read('scripts/regression-guard.sh'),
    staticGuard: read('scripts/pwa_static_guard.js'),
    blueprint: read('BLUEPRINT.md'),
  };
  const checks = [];
  const issues = [];

  function check(area, name, ok, detail, severity = 'P0') {
    const row = { area, name, ok: !!ok, severity, detail };
    checks.push(row);
    if (!row.ok) issues.push(row);
  }

  check('mobile_admin', 'repair-tab-and-renderer',
    has(files.admin, 'data-tab="repair"') &&
      has(files.admin, 'renderDataRepairConsole_') &&
      has(files.admin, 'hydrateAdminDataRepair_') &&
      has(files.admin, "callAPI('getDataRepairStatus'") &&
      has(files.admin, "callAPI('previewDataRepair'"),
    'Mobile Admin must expose a Repair tab and load protected repair preview/status.');

  check('mobile_admin', 'execute-gated-by-confirm-phrase',
    has(files.admin, 'executeAdminDataRepair_') &&
      has(files.admin, "callAPI('executeDataRepair'") &&
      has(files.admin, 'EXECUTE_REVIEWED_DATA_REPAIR') &&
      has(files.admin, 'archive_delete_orphan_billing_row') &&
      has(files.admin, 'Archive + Delete Reviewed Row'),
    'Mobile Admin execute path must require exact confirmation and narrow repair action.');

  check('pc_settings', 'repair-panel-hydrated',
    has(files.settings, 'settings-data-repair-content') &&
      has(files.settings, 'hydrateSettingsDataRepairPanel') &&
      has(files.settings, "callApi('getDataRepairStatus'") &&
      has(files.settings, "callApi('previewDataRepair'") &&
      has(files.settings, 'hydrateSettingsDataRepairPanel();'),
    'PC Settings must render and hydrate the Data Repair Console panel.');

  check('pc_settings', 'pc-execute-gated-by-confirm-phrase',
    has(files.settings, 'executeSettingsDataRepair_') &&
      has(files.settings, "callApi('executeDataRepair'") &&
      has(files.settings, 'EXECUTE_REVIEWED_DATA_REPAIR') &&
      has(files.settings, 'archive_delete_orphan_billing_row') &&
      has(files.settings, 'Archive + Delete Reviewed Row'),
    'PC Settings execute path must require exact confirmation and narrow repair action.');

  check('contract', 'repair-actions-in-contract-and-read-list',
    has(files.apiContract, 'getDataRepairStatus') &&
      has(files.apiContract, 'previewDataRepair') &&
      has(files.apiContract, 'executeDataRepair') &&
      has(files.app, 'getDataRepairStatus: true') &&
      has(files.app, 'previewDataRepair: true') &&
      has(files.lock, 'executeDataRepair: true'),
    'PWA contract/read/lock layers must keep repair actions registered.');

  check('safety', 'sprint111-execution-remains-guarded',
    has(files.sprint111, 'archive-before-change') &&
      has(files.sprint111, 'EXECUTE_REVIEWED_DATA_REPAIR') &&
      has(files.sprint111, 'orphan DB_BILLING rows'),
    'Sprint 112 UI must sit on top of the Sprint 111 guarded execution layer.');

  check('ci', 'sprint112-wired',
    has(files.workflow, 'sprint112_admin_repair_console_audit.js') &&
      has(files.regression, 'sprint112_admin_repair_console_audit.js') &&
      has(files.staticGuard, 'sprint112_admin_repair_console_audit.js'),
    'Sprint 112 audit must run in Actions, regression guard, and static guard.');

  check('blueprint', 'blueprint-documents-sprint112',
    has(files.blueprint, 'Phase 112 Admin Repair Console UI') &&
      has(files.blueprint, 'settings-data-repair-content') &&
      has(files.blueprint, 'renderDataRepairConsole_'),
    'BLUEPRINT must document the Sprint 112 UI handoff.');

  const p0 = issues.filter(item => item.severity === 'P0').length;
  const score = Math.round((checks.filter(item => item.ok).length / checks.length) * 100);
  const report = {
    generated_at: new Date().toISOString(),
    version: 'sprint112-admin-repair-console-audit-1.0.0',
    status: p0 ? 'fail' : issues.length ? 'warning' : 'ok',
    score,
    checks,
    issues,
  };

  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(REPORT_JSON, JSON.stringify(report, null, 2) + '\n', 'utf8');
  fs.writeFileSync(REPORT_MD, [
    '# Sprint 112 Admin Repair Console Audit',
    '',
    `- Generated: ${report.generated_at}`,
    `- Status: ${report.status}`,
    `- Score: ${report.score}/100`,
    '',
    '| Area | Check | Result | Detail |',
    '|---|---|---|---|',
    ...checks.map(row => `| ${row.area} | ${row.name} | ${row.ok ? 'OK' : row.severity} | ${row.detail} |`),
    '',
  ].join('\n'), 'utf8');

  console.log(`[Sprint 112 Admin Repair Console] status=${report.status} score=${report.score}/100`);
  console.log(`[Sprint 112 Admin Repair Console] report: ${path.relative(ROOT, REPORT_JSON).replace(/\\/g, '/')}`);
  if (p0) process.exit(1);
}

main();
