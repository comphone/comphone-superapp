#!/usr/bin/env node
/*
 * Sprint 119 Inventory / PO / Warranty Workflow Hardening Audit
 *
 * Guards the supporting operations chain:
 * Inventory visibility -> Purchase Order receiving -> Warranty lookup/claim.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REPORT_DIR = path.join(ROOT, 'test_reports');
const REPORT_JSON = path.join(REPORT_DIR, 'sprint119_inventory_po_warranty_latest.json');

function read(rel) {
  const file = path.join(ROOT, rel);
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
}

function has(text, needle) {
  return typeof needle === 'string' ? text.includes(needle) : needle.test(text);
}

function main() {
  const files = {
    inventory: read('pwa/section_inventory.js'),
    po: read('pwa/purchase_order.js'),
    warranty: read('pwa/section_warranty.js'),
    app: read('pwa/app.js'),
    apiContract: read('pwa/api_contract.js'),
    router: read('clasp-ready/RouterSplit.gs'),
    inventoryBackend: read('clasp-ready/InventoryCRUD.gs') + '\n' + read('clasp-ready/InventoryStockCheck.gs') + '\n' + read('clasp-ready/InventoryPO.gs'),
    warrantyBackend: read('clasp-ready/WarrantyManager.gs'),
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

  check('inventory', 'inventory-live-workflow',
    has(files.inventory, 'function renderInventorySection') &&
      has(files.inventory, 'function _inventoryMount_') &&
      has(files.inventory, 'function loadInventoryPage') &&
      has(files.inventory, "callApi('inventoryOverview'") &&
      has(files.inventory, '_showItemDetail') &&
      has(files.inventory, '_showTransferModal') &&
      has(files.inventory, '_showCreatePOFromLowStock'),
    'Inventory must keep live overview, detail, transfer, and low-stock PO handoff surfaces.');

  check('po', 'po-no-ai-executor-fallback',
    has(files.po, 'API client is not ready for Purchase Orders') &&
      has(files.po, "typeof window.callAPI === 'function'") &&
      !has(files.po, 'AI_EXECUTOR'),
    'Purchase Order fallback must bridge to the unified API client and must not resurrect AI_EXECUTOR.');

  check('po', 'po-create-receive-contract',
    has(files.po, 'function loadPurchaseOrderPage') &&
      has(files.po, "action: 'listPurchaseOrders'") &&
      has(files.po, 'function showCreatePOModal') &&
      has(files.po, 'function saveNewPO') &&
      has(files.po, 'client_request_id') &&
      has(files.po, 'function confirmReceivePO') &&
      has(files.po, "action: 'receivePurchaseOrder'") &&
      has(files.po, 'ensurePOModalShell'),
    'PO must keep create and receive workflows idempotent, confirmed, and modal-shell resilient.');

  check('warranty', 'warranty-detail-contract-safe',
    has(files.warranty, 'let _warrantyCache = []') &&
      has(files.warranty, 'function _warrantyValue') &&
      has(files.warranty, 'function _warrantyJsArg') &&
      has(files.warranty, 'function _ensureWarrantyDetailModal') &&
      has(files.warranty, '_warrantyCache.find') &&
      has(files.warranty, "callApi('getWarrantyByJobId', { job_id: warrantyId })") &&
      !has(files.warranty, "callApi('getWarrantyByJobId', { warranty_id: warrantyId })"),
    'Warranty detail must use cached list records first and must not send warranty_id to the job-id lookup action.');

  check('warranty', 'warranty-claim-contract',
    has(files.warranty, 'function _markWarrantyClaimed') &&
      has(files.warranty, "callApi('updateWarrantyStatus'") &&
      has(files.warranty, "status: 'CLAIMED'") &&
      has(files.warranty, 'renderWarrantySection()'),
    'Warranty detail must expose a guarded claim status path and refresh after update.');

  check('routes', 'frontend-route-registration',
    has(files.app, "if (page === 'inventory')") &&
      has(files.app, "if (page === 'po')") &&
      has(files.app, "if (page === 'warranty')"),
    'Mobile router must keep Inventory, PO, and Warranty as first-class pages.');

  check('backend', 'backend-action-coverage',
    [
      'inventoryOverview', 'listPurchaseOrders', 'createPurchaseOrder', 'receivePurchaseOrder',
      'listWarranties', 'getWarrantyByJobId', 'createWarranty', 'updateWarrantyStatus'
    ].every(action => has(files.router, action) && has(files.apiContract, action)),
    'RouterSplit and API contract must both cover Inventory, PO, and Warranty actions.');

  check('backend', 'backend-sheet-coverage',
    has(files.inventoryBackend, 'DB_INVENTORY') &&
      has(files.inventoryBackend, 'DB_PURCHASE_ORDERS') &&
      has(files.inventoryBackend, 'receivePurchaseOrder') &&
      has(files.warrantyBackend, 'DB_WARRANTIES') &&
      has(files.warrantyBackend, 'function updateWarrantyStatus'),
    'Backend managers must keep canonical Inventory/PO/Warranty sheet workflows.');

  check('ci', 'sprint119-wired',
    has(files.staticGuard, 'sprint119_inventory_po_warranty_audit.js') &&
      has(files.regression, 'sprint119_inventory_po_warranty_audit.js') &&
      has(files.workflow, 'sprint119_inventory_po_warranty_audit.js'),
    'Sprint 119 audit must run in static guard, regression guard, and Actions syntax checks.');

  check('blueprint', 'blueprint-documents-sprint119',
    has(files.blueprint, 'Phase 119 Inventory/PO/Warranty Workflow Hardening') &&
      has(files.blueprint, 'sprint119_inventory_po_warranty_audit.js') &&
      has(files.blueprint, 'PO no longer falls back to AI_EXECUTOR'),
    'BLUEPRINT must document Sprint 119 and the operational workflow hardening.');

  const p0 = issues.filter(item => item.severity === 'P0').length;
  const score = Math.round((checks.filter(item => item.ok).length / checks.length) * 100);
  const report = {
    generated_at: new Date().toISOString(),
    version: 'sprint119-inventory-po-warranty-1.0.0',
    status: p0 ? 'fail' : 'ok',
    score,
    checks,
    issues,
  };

  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(REPORT_JSON, JSON.stringify(report, null, 2) + '\n', 'utf8');
  console.log(`[Sprint 119 Inventory/PO/Warranty] status=${report.status} score=${score}/100`);
  console.log(`[Sprint 119 Inventory/PO/Warranty] report: ${path.relative(ROOT, REPORT_JSON).replace(/\\/g, '/')}`);
  if (p0) {
    issues.forEach(item => console.error(`- [${item.severity}] ${item.area}/${item.name}: ${item.detail}`));
    process.exit(1);
  }
}

main();
