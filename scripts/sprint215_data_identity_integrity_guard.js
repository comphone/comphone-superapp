#!/usr/bin/env node
/**
 * Sprint 215 Data Identity Integrity Guard
 * Prevents deleted Job IDs from being reused and keeps legacy billing rows visible/cleanable.
 */
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const REPORT = path.join(ROOT, 'test_reports', 'sprint215_data_identity_integrity_guard_latest.json');
const read = relative => fs.readFileSync(path.join(ROOT, relative), 'utf8');
const digest = source => crypto.createHash('sha256').update(source).digest('hex');

function makeSheet(name, rows, parent) {
  return {
    getName: () => name,
    getParent: () => parent,
    getLastRow: () => rows.length,
    getLastColumn: () => Math.max(0, ...rows.map(row => row.length)),
    getDataRange: () => ({ getValues: () => rows.map(row => row.slice()) }),
    getRange: (row, column, rowCount, columnCount) => ({
      getValues: () => rows
        .slice(row - 1, row - 1 + rowCount)
        .map(values => values.slice(column - 1, column - 1 + columnCount))
    })
  };
}

function simulateJobIds(source) {
  const propertyValues = new Map([['COMPHONE_JOB_ID_HIGH_WATER', '21']]);
  const sheets = new Map();
  const spreadsheet = {};
  const context = {
    console,
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: key => propertyValues.get(key) || null,
        setProperty: (key, value) => propertyValues.set(key, String(value))
      })
    },
    findSheetByName: (_ss, name) => sheets.get(name) || null
  };
  vm.createContext(context);
  vm.runInContext(source, context);

  const live = makeSheet('DBJOBS', [['JobID'], ['J0020']], spreadsheet);
  sheets.set('DBJOBS_ARCHIVE', makeSheet('DBJOBS_ARCHIVE', [
    ['archived_at', 'archived_by', 'archived_role', 'archive_reason', 'archive_meta', 'JobID'],
    ['', '', '', '', '', 'J0019']
  ], spreadsheet));
  sheets.set('DB_SMOKE_CLEANUP_ARCHIVE', makeSheet('DB_SMOKE_CLEANUP_ARCHIVE', [
    ['Archived_At', 'Scope', 'Source_Sheet', 'Record_ID'],
    ['', 'jobs', 'DBJOBS', 'J0022']
  ], spreadsheet));
  sheets.set('DB_BILLING', makeSheet('DB_BILLING', [
    ['Billing_ID', 'Job_ID'],
    ['B1', 'J0021']
  ], spreadsheet));

  const first = context.generateNextJobId_(live, 0);
  const second = context.generateNextJobId_(live, 0);
  context.recordJobIdHighWater_('J0100');
  const afterExplicit = context.generateNextJobId_(live, 0);
  return { first, second, afterExplicit };
}

async function simulateLegacyBillingList(source) {
  const spreadsheet = {};
  const rows = [];
  const sheet = makeSheet('DB_BILLING', rows, spreadsheet);
  const context = {
    console,
    getComphoneSheet: () => spreadsheet,
    findSheetByName: () => sheet,
    findHeaderIndex_: (headers, candidates) => headers.findIndex(header =>
      candidates.some(candidate => String(header).trim().toLowerCase() === String(candidate).trim().toLowerCase())),
    safeCellRaw_: (row, index) => index > -1 ? row[index] : '',
    safeCellValue_: (row, index) => index > -1 && row[index] != null ? String(row[index]) : '',
    normalizeMoneyValue_: value => Number(value || 0),
    formatDateTimeSafe_: value => value ? String(value) : ''
  };
  vm.createContext(context);
  vm.runInContext(source, context);
  const headers = ['Legacy_Total'].concat(Array.from(context.BILLING_DEFAULT_HEADERS));
  const summary = new Array(headers.length).fill('');
  summary[0] = 600;
  const valid = new Array(headers.length).fill('');
  valid[headers.indexOf('Billing_ID')] = 'B-SMOKE';
  valid[headers.indexOf('Job_ID')] = 'J0021';
  valid[headers.indexOf('Customer_Name')] = 'Smoke Customer';
  rows.push(headers, summary, valid);
  return context.listAllBillings_({});
}

function simulateCleanupHeaderPriority(source) {
  const context = { console };
  vm.createContext(context);
  vm.runInContext(source, context);
  return context.findSmokeCleanupHeaderIndex_(
    ['Legacy_Total', 'Bill_ID', 'Billing_ID'],
    ['Billing_ID', 'billing_id', 'Bill_ID', 'bill_id']
  );
}

async function main() {
  const jobs = read('clasp-ready/JobStateMachine.gs');
  const billing = read('clasp-ready/BillingCore.gs');
  const cleanup = read('clasp-ready/SmokeCleanup.gs');
  const dashboardBundle = read('clasp-ready/DashboardBundle.gs');
  const alignment = read('scripts/gas_source_alignment.js');
  const cleanupPlan = read('scripts/pwa_smoke_cleanup_plan.js');
  const regression = read('scripts/regression-guard.sh');
  const staticGuard = read('scripts/pwa_static_guard.js');
  const workflow = read('.github/workflows/auto-deploy.yml');
  const blueprint = read('BLUEPRINT.md');
  const config = read('clasp-ready/Config.gs');
  const jobSimulation = simulateJobIds(jobs);
  const billingSimulation = await simulateLegacyBillingList(billing);
  const cleanupHeaderIndex = simulateCleanupHeaderPriority(cleanup);

  const checks = [
    {
      id: 'job-id-high-water-property',
      ok: jobs.includes("COMPHONE_JOB_ID_HIGH_WATER") &&
        jobs.includes('recordJobIdHighWater_(jobId)') &&
        jobs.includes("String(maxId + 1)")
    },
    {
      id: 'job-id-scans-historical-references',
      ok: ['DBJOBS_ARCHIVE', 'DB_SMOKE_CLEANUP_ARCHIVE', 'DB_DATA_REPAIR_ARCHIVE', 'DB_BILLING', 'DB_JOB_LOGS', 'DB_WARRANTIES', 'DB_PHOTO_QUEUE']
        .every(name => jobs.includes(`name: '${name}'`))
    },
    {
      id: 'job-id-parser-is-exact',
      ok: jobs.includes(".match(/^J(\\d+)$/i)") && jobs.includes('maxJobSequenceInColumn_')
    },
    {
      id: 'job-id-allocation-behavior',
      ok: jobSimulation.first === 'J0023' &&
        jobSimulation.second === 'J0024' &&
        jobSimulation.afterExplicit === 'J0101',
      detail: jobSimulation
    },
    {
      id: 'billing-list-uses-schema-not-column-zero',
      ok: billing.includes('if (!billing.billing_id && !billing.job_id) continue;') &&
        !billing.includes('if (!row[0]) continue;')
    },
    {
      id: 'legacy-billing-list-behavior',
      ok: billingSimulation.success === true &&
        billingSimulation.count === 1 &&
        billingSimulation.billings[0].billing_id === 'B-SMOKE' &&
        billingSimulation.billings[0].job_id === 'J0021',
      detail: billingSimulation
    },
    {
      id: 'cleanup-header-helper-is-namespaced',
      ok: cleanup.includes('function findSmokeCleanupHeaderIndex_(') &&
        cleanup.includes('var idCol = findSmokeCleanupHeaderIndex_(headers, headerNames);') &&
        cleanup.includes('report.scans.push(scan)') &&
        cleanup.includes('scan.id_header = headers[idCol]')
    },
    {
      id: 'cleanup-prefers-canonical-billing-id',
      ok: cleanupHeaderIndex === 2,
      detail: { selected_index: cleanupHeaderIndex, expected_index: 2 }
    },
    {
      id: 'cleanup-plan-carries-billing-records',
      ok: cleanupPlan.includes("scope = 'billings'") &&
        cleanupPlan.includes("['billings', 'listBillings'") &&
        cleanupPlan.includes("if (scope === 'billings') return row.billing_id") &&
        cleanupPlan.includes('id: idOf(row, scope)')
    },
    {
      id: 'cleanup-historical-reports-are-hints-only',
      ok: cleanupPlan.includes('report.hints = loadLatestWriteSmokeCandidates()') &&
        cleanupPlan.includes("report.status = 'nothing-to-clean'") &&
        cleanupPlan.includes('backend cleanup was not called')
    },
    {
      id: 'backend-empty-cleanup-is-safe-noop',
      ok: cleanup.includes("report.status = 'no-records-selected'") &&
        cleanup.includes('cleanup is a safe no-op') &&
        !cleanup.includes('using known reviewed smoke candidates')
    },
    {
      id: 'cleanup-invalidates-current-read-caches',
      ok: cleanup.includes('invalidateSmokeCleanupCaches_(requested)') &&
        cleanup.includes("'dashboard_data_v89'") &&
        cleanup.includes("'dashboard_bundle_v61'") &&
        dashboardBundle.includes("cache.remove('dashboard_data_v89')")
    },
    {
      id: 'deploy-source-pairs-are-aligned',
      ok: ['JobStateMachine.gs', 'BillingCore.gs', 'SmokeCleanup.gs']
        .every(file => digest(read(file)) === digest(read(path.join('clasp-ready', file))))
    },
    {
      id: 'alignment-guard-covers-data-identity-files',
      ok: ['JobStateMachine.gs', 'BillingCore.gs', 'SmokeCleanup.gs']
        .every(file => alignment.includes(`'${file}'`))
    },
    {
      id: 'backend-version-current',
      ok: config.includes("VERSION: '5.18.17-id-integrity'")
    },
    {
      id: 'completion-gates-wired',
      ok: regression.includes('sprint215_data_identity_integrity_guard') &&
        staticGuard.includes('sprint215_data_identity_integrity_guard.js') &&
        workflow.includes('sprint215_data_identity_integrity_guard.js')
    },
    {
      id: 'blueprint-current',
      ok: blueprint.includes('Sprint 215') && blueprint.includes('Data Identity Integrity')
    }
  ];

  const failures = checks.filter(check => !check.ok);
  const report = {
    sprint: 215,
    name: 'Data Identity Integrity Guard',
    generated_at: new Date().toISOString(),
    score: Math.round(((checks.length - failures.length) / checks.length) * 100),
    checks,
    failures
  };
  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, JSON.stringify(report, null, 2) + '\n', 'utf8');

  if (failures.length) {
    console.error(`[Sprint 215] FAILED ${report.score}/100`);
    failures.forEach(failure => console.error(` - ${failure.id}`));
    process.exit(1);
  }
  console.log('[Sprint 215] OK 100/100 - Data identity integrity guard passed');
}

main().catch(error => {
  console.error('[Sprint 215] FAILED with exception');
  console.error(error);
  process.exit(1);
});
