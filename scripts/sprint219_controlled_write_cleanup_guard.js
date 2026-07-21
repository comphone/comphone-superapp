#!/usr/bin/env node
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
const digest = source => crypto.createHash('sha256').update(source).digest('hex');
const cleanup = read('clasp-ready/SmokeCleanup.gs');
const rootCleanup = read('SmokeCleanup.gs');
const config = read('clasp-ready/Config.gs');
const evidence = JSON.parse(read('test_reports/sprint219_controlled_write_production_evidence.json'));
const blueprint = read('BLUEPRINT.md');

const checks = [
  ['archive-before-parent-delete', cleanup.includes('archiveSmokeCleanupRow_') && cleanup.includes('sheet.deleteRow(rowNumber)')],
  ['child-cleanup-after-confirmed-parent-delete', cleanup.includes('cleanupSmokeChildRows_(ss, archive, report)') && cleanup.includes('report.deleted || []')],
  ['job-log-cascade', cleanup.includes("sheetName: 'DB_JOB_LOGS'") && cleanup.includes("scope: 'job_logs'")],
  ['customer-log-cascade', cleanup.includes("sheetName: 'DB_CUSTOMER_LOGS'") && cleanup.includes("scope: 'customer_logs'")],
  ['child-archive-before-delete', cleanup.includes("archiveSmokeCleanupRow_(archive, options.scope") && cleanup.includes('report.child_deleted.push')],
  ['audit-log-preserved', !cleanup.includes("sheetName: 'DB_ACTIVITY_LOG'")],
  ['backend-version-current', config.includes("VERSION: '5.18.20-write-cleanup-cascade'")],
  ['root-deploy-source-aligned', digest(cleanup) === digest(rootCleanup)],
  ['production-evidence-ok', evidence.status === 'ok' && evidence.gas_deployment_tested === '@632'],
  ['write-lifecycle-complete', evidence.checks.write_read_idempotency.passed === 14 && evidence.checks.write_read_idempotency.failed === 0],
  ['cleanup-complete', evidence.checks.cleanup.parent_deleted === 3 && evidence.checks.cleanup.child_deleted === 24 && evidence.checks.cleanup.remaining_live_candidates === 0],
  ['audit-preserved', evidence.checks.cleanup.activity_audit_preserved === true],
  ['high-risk-writes-excluded', evidence.purchase_order_write_executed === false && evidence.line_message_sent === false],
  ['blueprint-current', blueprint.includes('v5.18.47-sprint219') && blueprint.includes('@632')]
];
const failed = checks.filter(([, ok]) => !ok);
if (failed.length) {
  console.error('[Sprint 219] FAILED');
  failed.forEach(([id]) => console.error(` - ${id}`));
  process.exit(1);
}
console.log('[Sprint 219] OK - Controlled write cleanup cascade guard passed');
