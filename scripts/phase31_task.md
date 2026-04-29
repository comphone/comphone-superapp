# PHASE 31 — Backend Master Task
## Working Directory: C:\Users\Server\comphone-superapp\clasp-ready

## TASK 1: Refactor Inventory.gs (1,469 lines → split into modular files)
Follow RouterSplit.gs pattern. Split Inventory.gs into sub-modules:
- InventoryReservation.gs — reserveItemsForJob(), releaseReservation(), cutStockAuto(), _notifyLowStock()
- InventoryStockCheck.gs — checkStock(), barcodeLookup(), scanWithdrawStock(), getInventoryOverview()
- InventoryCRUD.gs — addInventoryItem(), updateInventoryItem(), deleteInventoryItem(), getInventoryItemDetail()
- InventoryTransfer.gs — transferStock(), getStockMovementHistory()
- InventoryPO.gs — createPurchaseOrder(), listPurchaseOrders(), receivePurchaseOrder()
- InventoryReorderAI.gs — geminiReorderSuggestion(), _geminiAnalyzeReorder(), _buildReorderMessage()
Keep Inventory.gs as main file that forwards to all sub-modules. Each sub-module under 500 lines.
Use ES5 style (var, no arrow functions, no const/let).

## TASK 2: Fix SharedContext.gs / DriveSync timeout
BLUEPRINT.md reports Google Drive Sync Failed in SharedContext.gs.
Add retry logic with exponential backoff. Reduce timeout sensitivity. Ensure sync returns success.

## TASK 3: Data Indexing for Analytics
Create AnalyticsIndex.gs with in-memory indexes for frequent queries (job status, technician, dates).
Reduces full-sheet scans. Cache index in ScriptProperties with TTL. Target: queries under 2 seconds.

## TASK 4: Refactor BillingManager.gs (1,071 lines)
Split into: BillingCore.gs (createBilling, getBilling), BillingPayment.gs (generatePromptPayQR, payments), BillingExport.gs (PDF/export).

## TASK 5: Update version to v5.9.0-phase31a
Update version_config.js and all version strings. Update RouterSplit.gs MODULE_ROUTER for any new function names.

## RULES
- ES5 style only (var, no arrow/const/let/template literals)
- Every function: try/catch with proper error returns
- Follow COMPHONE CORE RULES from BLUEPRINT.md
- Update RouterSplit.gs for any new function names

## NOTIFICATION
When ALL tasks complete, send to Telegram group -1003940142735:
openclaw message send --channel telegram --target "-1003940142735" --message "BACKEND MASTER: Phase 31 Refactoring Complete - Inventory split into 6 sub-modules, DriveSync fixed, AnalyticsIndex created, BillingManager decomposed, Version -> v5.9.0-phase31a. Ready for QA Audit."
If any task fails, send failure message with details.
