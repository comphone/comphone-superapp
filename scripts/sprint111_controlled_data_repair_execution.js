#!/usr/bin/env node
/*
 * Sprint 111 Controlled Data Repair Execution Guard
 *
 * Static + CI-safe guard for the production repair execution layer. The guard
 * verifies that repair execution is routed, gated, archived, audited, and
 * exposed as token-aware admin actions without mutating production data.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REPORT_DIR = path.join(ROOT, 'test_reports');
const REPORT_JSON = path.join(REPORT_DIR, 'sprint111_controlled_data_repair_execution_latest.json');
const REPORT_MD = path.join(REPORT_DIR, 'sprint111_controlled_data_repair_execution_latest.md');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function has(text, needle) {
  return text.includes(needle);
}

function check(rows, area, name, ok, detail, severity = 'P0') {
  rows.push({ area, name, ok: !!ok, severity, detail });
}

function main() {
  const rows = [];
  const files = {
    rootRepair: read('DataRepairConsole.gs'),
    readyRepair: read('clasp-ready/DataRepairConsole.gs'),
    rootRouter: read('RouterSplit.gs'),
    readyRouter: read('clasp-ready/RouterSplit.gs'),
    rootConfig: read('Config.gs'),
    readyConfig: read('clasp-ready/Config.gs'),
    registry: read('docs/database_schema_registry.json'),
    apiContract: read('pwa/api_contract.js'),
    app: read('pwa/app.js'),
    lock: read('pwa/execution_lock.js'),
    staticGuard: read('scripts/pwa_static_guard.js'),
    regression: read('scripts/regression-guard.sh'),
    workflow: read('.github/workflows/auto-deploy.yml'),
    alignment: read('scripts/gas_source_alignment.js'),
    blueprint: read('BLUEPRINT.md'),
  };

  check(rows, 'backend', 'repair-console-root-and-clasp-ready',
    files.rootRepair === files.readyRepair &&
      has(files.rootRepair, 'Sprint 111 Controlled Data Repair Console') &&
      has(files.rootRepair, 'previewDataRepair') &&
      has(files.rootRepair, 'executeDataRepair') &&
      has(files.rootRepair, 'getDataRepairStatus'),
    'Root and clasp-ready DataRepairConsole.gs must be identical and expose preview/status/execute actions.');

  check(rows, 'safety', 'archive-before-change-and-confirm-gate',
    has(files.rootRepair, "DATA_REPAIR_CONFIRM = 'EXECUTE_REVIEWED_DATA_REPAIR'") &&
      has(files.rootRepair, 'ensureDataRepairArchive_') &&
      has(files.rootRepair, 'ensureDataRepairAudit_') &&
      has(files.rootRepair, 'logDataRepairAudit_') &&
      has(files.rootRepair, 'sh.deleteRow(rowNumber)') &&
      files.rootRepair.indexOf('archive.appendRow') < files.rootRepair.indexOf('sh.deleteRow(rowNumber)'),
    'Execute path must require the explicit confirm phrase and archive/audit before deleting a billing orphan row.');

  check(rows, 'safety', 'execution-narrow-scope',
    has(files.rootRepair, "candidate.safe_action !== 'archive_delete_orphan_billing_row'") &&
      has(files.rootRepair, 'business_review_only') &&
      has(files.rootRepair, 'manual_backfill_required') &&
      has(files.rootRepair, 'Row now has Billing_ID or Job_ID'),
    'Automatic execution must be limited to orphan DB_BILLING rows and block report/backfill candidates.');

  check(rows, 'router', 'protected-routes-registered',
    ['previewDataRepair', 'executeDataRepair', 'getDataRepairStatus'].every(action =>
      has(files.rootRouter, `'${action}'`) && has(files.readyRouter, `'${action}'`)
    ),
    'RouterSplit must expose the repair actions through the normal protected API route.');

  check(rows, 'schema', 'repair-support-sheets-registered',
    ['DB_DATA_REPAIR_ARCHIVE', 'DB_DATA_REPAIR_AUDIT'].every(sheet =>
      has(files.registry, `"${sheet}"`) && has(files.rootConfig, `'${sheet}'`) && has(files.readyConfig, `'${sheet}'`)
    ),
    'Archive and audit sheets must be registered as support sheets before creation.');

  check(rows, 'frontend', 'admin-contract-and-read-actions',
    has(files.apiContract, 'getDataRepairStatus') &&
      has(files.apiContract, 'previewDataRepair') &&
      has(files.apiContract, 'executeDataRepair') &&
      has(files.apiContract, 'EXECUTE_REVIEWED_DATA_REPAIR') &&
      has(files.app, 'getDataRepairStatus: true') &&
      has(files.app, 'previewDataRepair: true') &&
      has(files.lock, 'executeDataRepair: true'),
    'PWA contract/read-action/lock layers must know repair preview/status and gated execution.');

  check(rows, 'ci', 'sprint111-wired-into-guards',
    has(files.staticGuard, 'sprint111_controlled_data_repair_execution.js') &&
      has(files.regression, 'sprint111_controlled_data_repair_execution.js') &&
      has(files.workflow, 'sprint111_controlled_data_repair_execution.js') &&
      has(files.alignment, "'DataRepairConsole.gs'"),
    'Sprint 111 guard must be wired into static guard, regression guard, workflow syntax checks, and GAS alignment.');

  check(rows, 'blueprint', 'blueprint-documents-sprint111',
    has(files.blueprint, 'Phase 111 Controlled Data Repair Execution') &&
      has(files.blueprint, 'EXECUTE_REVIEWED_DATA_REPAIR') &&
      has(files.blueprint, 'DB_DATA_REPAIR_ARCHIVE') &&
      has(files.blueprint, 'DB_DATA_REPAIR_AUDIT'),
    'BLUEPRINT must document the Sprint 111 handoff and safety gates for future agents.');

  const failures = rows.filter(row => !row.ok && row.severity === 'P0');
  const warnings = rows.filter(row => !row.ok && row.severity !== 'P0');
  const report = {
    generated_at: new Date().toISOString(),
    version: 'sprint111-controlled-data-repair-execution-1.0.0',
    status: failures.length ? 'fail' : (warnings.length ? 'warning' : 'ok'),
    score: Math.round((rows.filter(row => row.ok).length / rows.length) * 100),
    checks: rows,
    safety_policy: {
      production_mutation_default: false,
      execute_confirm: 'EXECUTE_REVIEWED_DATA_REPAIR',
      archive_before_change: true,
      audit_required: true,
      automatic_scope: ['orphan DB_BILLING rows with no Billing_ID and no Job_ID']
    }
  };

  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(REPORT_JSON, JSON.stringify(report, null, 2) + '\n', 'utf8');
  fs.writeFileSync(REPORT_MD, [
    '# Sprint 111 Controlled Data Repair Execution',
    '',
    `- Generated: ${report.generated_at}`,
    `- Status: ${report.status}`,
    `- Score: ${report.score}/100`,
    '',
    '| Area | Check | Result | Detail |',
    '|---|---|---|---|',
    ...rows.map(row => `| ${row.area} | ${row.name} | ${row.ok ? 'OK' : row.severity} | ${row.detail} |`),
    '',
  ].join('\n'), 'utf8');

  console.log(`[Sprint 111 Controlled Data Repair Execution] status=${report.status} score=${report.score}/100`);
  console.log(`[Sprint 111 Controlled Data Repair Execution] report: ${path.relative(ROOT, REPORT_JSON).replace(/\\/g, '/')}`);
  if (failures.length) process.exit(1);
}

main();
