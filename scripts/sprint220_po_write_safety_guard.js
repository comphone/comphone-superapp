#!/usr/bin/env node
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const digest = value => crypto.createHash('sha256').update(value).digest('hex');
const po = read('clasp-ready/InventoryPO.gs');
const rootPo = read('InventoryPO.gs');
const cleanup = read('clasp-ready/SmokeCleanup.gs');
const smoke = read('scripts/sprint220_po_write_acceptance.js');
const config = read('clasp-ready/Config.gs');
const evidence = JSON.parse(read('test_reports/sprint220_po_write_production_evidence.json'));

const checks = [
  ['root-clasp-po-aligned', digest(po) === digest(rootPo)],
  ['script-lock', po.includes('LockService.getScriptLock()') && po.includes('lock.waitLock(10000)')],
  ['durable-request-id-column', po.includes('Client_Request_ID') && po.includes('findPurchaseOrderReplay_')],
  ['idempotent-replay', po.includes("getIdempotentReplay_('createPurchaseOrder'") && po.includes('idempotent_replay: true')],
  ['collision-safe-id-allocation', po.includes('COMPHONE_PO_HIGH_WATER_') && po.includes('DB_SMOKE_CLEANUP_ARCHIVE')],
  ['revisioned-read-cache', po.includes('COMPHONE_PO_CACHE_REV') && po.includes('getPurchaseOrderCacheRevision_()')],
  ['mutations-invalidate-cache', (po.match(/invalidatePurchaseOrderCache_\(\)/g) || []).length >= 4],
  ['smoke-notification-suppression', po.includes('!data.suppress_notifications') && smoke.includes('suppress_notifications: true')],
  ['create-audit-trail', po.includes("writeAuditLog('createPurchaseOrder', 'PURCHASE_ORDER'")],
  ['cleanup-invalidates-po-cache', cleanup.includes("item.scope === 'purchase_orders'") && cleanup.includes('invalidatePurchaseOrderCache_')],
  ['acceptance-three-factor-gate', smoke.includes('COMPHONE_PO_ACCEPTANCE') && smoke.includes('CREATE_AND_CLEAN_TEST_PO') && smoke.includes('COMPHONE_AUTH_TOKEN')],
  ['acceptance-always-cleans', smoke.includes('finally {') && smoke.includes("confirm: 'DELETE_REVIEWED_SMOKE_RECORDS'")],
  ['backend-version-current', Number((config.match(/VERSION:\s*'5\.18\.(\d+)/) || [])[1] || 0) >= 21],
  ['production-acceptance-complete', evidence.status === 'ok' && evidence.checks.passed === 6 && evidence.checks.failed === 0],
  ['production-cleanup-complete', evidence.checks.archive_first_cleanup === true && evidence.checks.remaining_live_rows === 0],
  ['production-notification-suppressed', evidence.notification_sent === false]
];

const failed = checks.filter(([, ok]) => !ok);
if (failed.length) {
  console.error('[Sprint 220] FAILED');
  failed.forEach(([id]) => console.error(` - ${id}`));
  process.exit(1);
}
console.log(`[Sprint 220] OK ${checks.length}/${checks.length} - PO write safety guard passed`);
