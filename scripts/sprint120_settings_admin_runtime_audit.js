#!/usr/bin/env node
/*
 * Sprint 120 Settings/Admin Runtime Audit
 *
 * Guards the operator maintenance surfaces: PC Settings, Mobile Admin,
 * live runtime health, diagnostics, repair console, and cache freshness.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REPORT_DIR = path.join(ROOT, 'test_reports');
const REPORT_JSON = path.join(REPORT_DIR, 'sprint120_settings_admin_runtime_latest.json');

function read(rel) {
  const file = path.join(ROOT, rel);
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
}

function has(text, needle) {
  return typeof needle === 'string' ? text.includes(needle) : needle.test(text);
}

function main() {
  const files = {
    settings: read('pwa/section_settings.js'),
    admin: read('pwa/admin_panel.js'),
    runtimeSelfTest: read('pwa/runtime_self_test.js'),
    pcCore: read('pwa/dashboard_pc_core.js'),
    app: read('pwa/app.js'),
    apiContract: read('pwa/api_contract.js'),
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

  check('settings', 'pc-settings-live-summary',
    has(files.settings, 'settings-system-summary-content') &&
      has(files.settings, 'settings-bundle-cache-status') &&
      has(files.settings, 'async function hydrateSettingsSystemSummary') &&
      has(files.settings, "callApi('health'") &&
      has(files.settings, 'async function hydrateSettingsUsersSummary') &&
      has(files.settings, "callApi('listUsers'") &&
      !has(files.settings, "elapsed_ms: 120") &&
      !has(files.settings, "username: 'user1'") &&
      !has(files.settings, 'mock mode 100%'),
    'PC Settings must hydrate live health/users and must not show fake healthy/mock user data.');

  check('settings', 'settings-runtime-panels',
    has(files.settings, 'runtime-selftest-content') &&
      has(files.settings, 'renderRuntimeSelfTestPanel') &&
      has(files.settings, 'settings-data-repair-content') &&
      has(files.settings, 'hydrateSettingsDataRepairPanel') &&
      has(files.settings, 'hydrateSettingsSystemSummary();') &&
      has(files.settings, 'hydrateSystemDiagnostics();') &&
      has(files.pcCore, 'hydrateSettingsRuntimePanels'),
    'Settings must hydrate Runtime Self-Test, Data Repair, live summary, and diagnostics after render.');

  check('settings', 'settings-safe-maintenance-actions',
    has(files.settings, 'collectComphoneDiagnostics') &&
      has(files.settings, 'exportComphoneDiagnostics') &&
      has(files.settings, 'clearPwaRuntimeCache') &&
      has(files.settings, 'EXECUTE_REVIEWED_DATA_REPAIR') &&
      has(files.settings, 'archive_delete_orphan_billing_row'),
    'Settings maintenance actions must keep diagnostics export, scoped cache repair, and gated data repair.');

  check('admin', 'mobile-admin-operations-tabs',
    has(files.admin, 'data-tab="security"') &&
      has(files.admin, 'data-tab="health"') &&
      has(files.admin, 'data-tab="users"') &&
      has(files.admin, 'data-tab="config"') &&
      has(files.admin, 'data-tab="repair"') &&
      has(files.admin, 'data-tab="audit"') &&
      has(files.admin, 'renderDataRepairConsole_') &&
      has(files.admin, 'renderMenuHealthPanel'),
    'Mobile Admin must keep Security, Health, Users, Config, Repair, and Audit operations tabs.');

  check('runtime', 'browser-runtime-coverage',
    has(files.runtimeSelfTest, "id: 'runtime-config'") &&
      has(files.runtimeSelfTest, "id: 'api-health'") &&
      has(files.runtimeSelfTest, "id: 'pages-freshness'") &&
      has(files.runtimeSelfTest, "id: 'ai-vision-runtime'") &&
      has(files.runtimeSelfTest, "id: 'line-command-center'") &&
      has(files.runtimeSelfTest, 'exportRuntimeSelfTest'),
    'Runtime Self-Test must continue to cover config, API health, Pages freshness, Vision, LINE, and export.');

  check('contract', 'admin-settings-contracts',
    [
      'health', 'getVersion', 'listUsers', 'getSecurityStatus', 'getAuditLog',
      'getDataRepairStatus', 'previewDataRepair', 'executeDataRepair'
    ].every(action => has(files.apiContract, action) || has(files.app, action)),
    'Frontend API contract/read-action map must cover Settings/Admin operations.');

  check('ci', 'sprint120-wired',
    has(files.staticGuard, 'sprint120_settings_admin_runtime_audit.js') &&
      has(files.regression, 'sprint120_settings_admin_runtime_audit.js') &&
      has(files.workflow, 'sprint120_settings_admin_runtime_audit.js'),
    'Sprint 120 audit must run in static guard, regression guard, and Actions syntax checks.');

  check('blueprint', 'blueprint-documents-sprint120',
    has(files.blueprint, 'Phase 120 Settings/Admin Runtime Hardening') &&
      has(files.blueprint, 'sprint120_settings_admin_runtime_audit.js') &&
      has(files.blueprint, 'PC Settings no longer seeds fake healthy/user data'),
    'BLUEPRINT must document Sprint 120 Settings/Admin runtime hardening.');

  const p0 = issues.filter(item => item.severity === 'P0').length;
  const score = Math.round((checks.filter(item => item.ok).length / checks.length) * 100);
  const report = {
    generated_at: new Date().toISOString(),
    version: 'sprint120-settings-admin-runtime-1.0.0',
    status: p0 ? 'fail' : 'ok',
    score,
    checks,
    issues,
  };

  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(REPORT_JSON, JSON.stringify(report, null, 2) + '\n', 'utf8');
  console.log(`[Sprint 120 Settings/Admin Runtime] status=${report.status} score=${score}/100`);
  console.log(`[Sprint 120 Settings/Admin Runtime] report: ${path.relative(ROOT, REPORT_JSON).replace(/\\/g, '/')}`);
  if (p0) {
    issues.forEach(item => console.error(`- [${item.severity}] ${item.area}/${item.name}: ${item.detail}`));
    process.exit(1);
  }
}

main();
