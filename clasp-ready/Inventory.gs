// ============================================================
// COMPHONE SUPER APP v5.9.0-phase31a
// Inventory.gs — Master Inventory Module Index
// Phase 31 Refactoring: Split into 6 sub-modules
//
// Sub-modules (auto-loaded by GAS global namespace):
//   InventoryReservation.gs — reserveItemsForJob, releaseReservation, cutStockAuto
//   InventoryStockCheck.gs  — checkStock, barcodeLookup, scanWithdrawStock, getInventoryOverview
//   InventoryCRUD.gs        — addInventoryItem, updateInventoryItem, deleteInventoryItem, getInventoryItemDetail, getStockMovementHistory
//   InventoryTransfer.gs    — transferStock, predictiveStocking, Tool Audit
//   InventoryPO.gs          — createPurchaseOrder, listPurchaseOrders, receivePurchaseOrder, cancelPurchaseOrder_
//   InventoryReorderAI.gs   — geminiReorderSuggestion, _geminiAnalyzeReorder, _buildReorderMessage
//
// All sub-module functions are globally available to RouterSplit.gs MODULE_ROUTER
// ============================================================

var INVENTORY_ALERT_THRESHOLD = 5;
var INVENTORY_V55_HEADERS = [
  'Item_Code', 'Item_Name', 'Qty', 'Cost', 'Price',
  'Location_Type', 'Location_Code', 'Assigned_To', 'Updated_At', 'Last_Job_ID', 'Notes'
];

// Inventory.gs Phase 31 — All functions extracted to sub-modules above.
// This file serves as the single owner of INVENTORY_ALERT_THRESHOLD and shared helpers.
