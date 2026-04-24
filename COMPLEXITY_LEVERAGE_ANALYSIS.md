# 🔬 COMPLEXITY LEVERAGE ANALYSIS — Phase 2B Prioritization
## ComPhone Super App v5.7.0-phase2a → Phase 2B Planning

**Date**: 2026-04-24
**Agent**: Complexity Stewardship Agent

---

## 1. CURRENT CODEBASE METRICS

### Scale
| Metric | Value |
|--------|-------|
| Backend files (.gs) | 67 |
| Backend total lines | **30,260** |
| Frontend files (JS/HTML/CSS) | 63 |
| Frontend total lines | **29,398** |
| **Grand total** | **59,658 lines** |
| Average backend file size | 452 lines |
| Average frontend file size | 467 lines |
| Inline styles (JS + HTML) | **2,559** |

### Files Still >1000 Lines (Critical)
| File | Lines | Functions | Domain |
|------|-------|-----------|--------|
| Inventory.gs | 1,492 | 41 | Inventory mgmt |
| Router.gs | 1,331 | 15 + 283 cases | API routing |
| BillingManager.gs | 1,063 | 30 | Billing/POS |

### Files >500 Lines (Watchlist)
| Backend (20 files) | Lines | Frontend (27 files) | Lines |
|---------------------|-------|---------------------|-------|
| LineBotIntelligent.gs | 909 | demo_dashboard.html | 1,349 |
| BusinessAI.gs | 890 | monitoring_dashboard.html | 1,123 |
| Dashboard.gs | 839 | executive_dashboard.html | 1,081 |
| PhotoQueue.gs | 821 | ai_executor_runtime.js | 986 |
| VisionPipeline.gs | 745 | dashboard_pc.html | 953 |
| LineBotV2.gs | 739 | inventory_ui.js | 947 |
| JobStateMachine.gs | 709 | system_graph.html | 763 |
| VisionLearning.gs | 708 | index.html | 725 |
| Setup.gs | 703 | style.css | 693 |
| FlexMessage.gs | 699 | crm_ui.js | 642 |

---

## 2. ROUTER.GS ANALYSIS

### Structure
- **283 case statements** in main switch (`routeActionV55`)
- **112 actions** already in `RouterSplit.gs` MODULE_ROUTER (object lookup, faster)
- **~171 actions** still only in Router.gs switch
- 270 of 283 cases are simple pass-through dispatches: `return jsonOutputV55_(someFunction(payload))`

### Action Domain Distribution (283 total)
| Domain | Count | % |
|--------|-------|---|
| Other/Misc | 56 | 20% |
| Monitoring/Health | 30 | 11% |
| AI Agent | 19 | 7% |
| Jobs | 16 | 6% |
| CRM | 15 | 5% |
| Auth/RBAC | 15 | 5% |
| Inventory | 14 | 5% |
| Billing/POS | 14 | 5% |
| Workflow | 12 | 4% |
| Learning/Memory | 12 | 4% |
| Decision/Guard | 11 | 4% |
| Setup/System | 9 | 3% |
| Shared Context | 8 | 3% |
| Vision | 7 | 2% |
| Audit | 7 | 2% |
| Tax | 6 | 2% |
| Others (<5 each) | ~32 | 11% |

### Extraction Plan for Router.gs
Router.gs is essentially a **pure routing table** — 270/283 cases are one-line pass-throughs. The complexity is in *count*, not *logic*. Two-phase extraction:

**Phase 2B-R1**: Migrate remaining ~171 actions from Router.gs switch into RouterSplit MODULE_ROUTER
- **Impact**: Eliminates Router.gs as a >1000-line file entirely
- **Risk**: Low (RouterSplit already exists and works, just add entries)
- **Lines removed from Router.gs**: ~800 (Router.gs shrinks to ~500 lines: doGet/doPost + infrastructure)
- **Effort**: LOW — mechanical copy of case→object entry

**Phase 2B-R2**: Delete redundant switch cases from Router.gs after migration
- Router.gs becomes ~400 lines (just doGet, doPost, auth gate, error handling)
- **Effort**: LOW

---

## 3. INVENTORY.GS ANALYSIS

### Functional Domains (41 functions, 1,492 lines)
| Domain | Functions | Est. Lines | Description |
|--------|-----------|------------|-------------|
| Core CRUD | 6 | ~250 | add/update/delete/getItem/overview/checkStock |
| Stock Movement | 4 | ~180 | transfer/getHistory/barcode/scanWithdraw |
| Purchase Orders | 4 | ~200 | create/list/receive/cancel PO |
| Reservation System | 3 | ~150 | reserveForJob/release/cutStockAuto |
| Low Stock/Reorder | 5 | ~180 | lowStockAlert/geminiReorder/notifyLowStock |
| Van/Tech Stock | 1 | ~60 | getVanStock |
| Predictive Stocking | 2 | ~100 | predictive/buildAlert |
| Tool Audit | 4 | ~160 | createChecklist/getChecklist/submit/ensureSheet |
| Internal Helpers | 12 | ~210 | sheet ops, row builders, normalizers |

### External Dependencies
- `getConfig()` from Config.gs (API keys for Gemini)
- SpreadsheetApp (direct sheet operations)
- No coupling to BillingManager, CRM, or Dashboard modules

### Split Plan for Inventory.gs
Split into 4 files by domain cluster:

| New File | Functions | Est. Lines |
|----------|-----------|------------|
| InventoryCore.gs | CRUD + Stock Movement + Helpers | ~500 |
| InventoryPO.gs | Purchase Orders | ~250 |
| InventoryReservation.gs | Reservation + Van Stock + Low Stock | ~350 |
| InventoryTools.gs | Tool Audit + Predictive Stocking | ~300 |

**Lines removed**: 1,492 → 4 files averaging 350 lines each
**Effort**: MEDIUM — requires shared helper extraction, function reorganization
**Risk**: MEDIUM — many internal helpers are shared across domains

---

## 4. BILLINGMANAGER.GS ANALYSIS

### Functional Domains (30 functions, 1,063 lines)
| Domain | Functions | Est. Lines |
|--------|-----------|------------|
| Billing CRUD | 8 | ~350 |
| PromptPay QR | 5 | ~200 |
| Slip Verification | 2 | ~150 |
| Receipt Generation | 3 | ~150 |
| Internal Helpers | 12 | ~213 |

### Split Plan
| New File | Functions | Est. Lines |
|----------|-----------|------------|
| BillingCore.gs | CRUD + Sheet ops | ~500 |
| BillingPayment.gs | PromptPay + Slip Verify | ~350 |
| BillingReceipt.gs | Receipt/PDF generation | ~200 |

**Effort**: MEDIUM

---

## 5. INLINE STYLE MIGRATION IMPACT

| Target | Inline Styles | Est. CSS Lines Needed | Priority |
|--------|--------------|----------------------|----------|
| JS files (2,123) | 2,123 occurrences | ~400 new CSS rules | HIGH |
| HTML files (436) | 436 occurrences | ~100 new CSS rules | MEDIUM |
| **Total** | **2,559** | **~500 CSS rules** | |

**Highest impact single files for inline style migration:**
- inventory_ui.js (947 lines, likely many inline styles)
- crm_ui.js (642 lines)
- billing_customer.js (588 lines)
- app.js (575 lines)

**Effort**: HIGH (tedious, error-prone, needs visual regression testing)
**Impact**: MEDIUM (maintainability, not size reduction)

---

## 6. COMPLEXITY LEVERAGE RANKING (Effort → Impact Ratio)

### Scoring: Impact (1-10) ÷ Effort (1-10) = Leverage

| Rank | Phase 2B Target | Impact | Effort | Leverage | Lines Reduced |
|------|-----------------|--------|--------|----------|---------------|
| 🥇 **1** | Router.gs → RouterSplit migration | 8 | 2 | **4.0** | ~800 |
| 🥈 **2** | Inventory.gs split (4-way) | 9 | 4 | **2.25** | 0 (redistributed) |
| 🥉 **3** | BillingManager.gs split (3-way) | 7 | 3 | **2.33** | 0 (redistributed) |
| 4 | Inline style migration (JS) | 6 | 7 | **0.86** | ~2,123 inline |
| 5 | LineBot files consolidation | 5 | 5 | **1.0** | ~300 |
| 6 | Dashboard HTML decomposition | 5 | 6 | **0.83** | ~400 |
| 7 | Frontend files >500 line split | 4 | 6 | **0.67** | varies |

### Detailed Justification

**🥇 #1: Router → RouterSplit Migration (Leverage: 4.0)**
- **WHY #1**: Pure mechanical work, zero logic changes, maximum line reduction
- 171 case statements → 171 MODULE_ROUTER entries (copy-paste pattern)
- Router.gs goes from 1,331 → ~400 lines (-69%)
- Already proven pattern: 112 actions already migrated successfully
- Can be done in one session, immediately testable

**🥈 #2: Inventory.gs 4-way Split (Leverage: 2.25)**
- **WHY #2**: Largest file in codebase, 9 clear functional domains
- Clear domain boundaries make split natural
- Helper functions need careful extraction (shared between domains)
- Once split, each file is independently maintainable/testable
- Prerequisite for future inventory feature expansion

**🥉 #3: BillingManager.gs 3-way Split (Leverage: 2.33)**
- **WHY #3**: Third largest file, clean separation exists
- Payment/PromptPay domain is self-contained
- Receipt generation is independent
- CRUD operations are standard pattern

---

## 7. PHASE 2B PRIORITIZED EXECUTION PLAN

### Wave 2B-1: Router Consolidation [Est: 2 hours]
```
1. Migrate 171 remaining actions from Router.gs → RouterSplit MODULE_ROUTER
2. Remove migrated switch cases from Router.gs
3. Verify RouterSplit routeByModule() handles all actions
4. Router.gs target: ~400 lines (infrastructure only)
```
**Deliverable**: Router.gs < 500 lines, all routing via RouterSplit

### Wave 2B-2: Inventory.gs Decomposition [Est: 4 hours]
```
1. Extract InventoryReservation.gs (reserve/release/cutStock + lowStock)
2. Extract InventoryPO.gs (purchase orders CRUD)
3. Extract InventoryTools.gs (tool audit + predictive stocking)
4. InventoryCore.gs retains: CRUD, stock movement, helpers
5. Verify all RouterSplit entries still resolve correctly
```
**Deliverable**: No inventory file > 500 lines

### Wave 2B-3: BillingManager.gs Decomposition [Est: 3 hours]
```
1. Extract BillingPayment.gs (PromptPay + slip verification)
2. Extract BillingReceipt.gs (receipt PDF generation)
3. BillingCore.gs retains: CRUD + sheet operations + helpers
```
**Deliverable**: No billing file > 500 lines

### Wave 2B-4: Inline Style Extraction [Est: 6 hours]
```
1. Audit top 5 JS files for inline style patterns
2. Create section-specific CSS classes in dashboard_shared.css
3. Migrate inventory_ui.js inline styles first (highest line count)
4. Then crm_ui.js, billing_customer.js, app.js
5. Visual regression testing after each file
```
**Deliverable**: < 500 inline styles remaining (from 2,559)

---

## 8. POST-PHASE 2B PROJECTED METRICS

| Metric | Current | After 2B-1 | After 2B-2 | After 2B-3 | After 2B-4 |
|--------|---------|------------|------------|------------|------------|
| Max backend file | 1,492 | 1,492 | ~500 | ~500 | ~500 |
| Files >1000 lines | 3 | 2 | 1 | **0** | **0** |
| Files >500 lines (BE) | 20 | 20 | 18 | 16 | 16 |
| Router.gs lines | 1,331 | **~400** | ~400 | ~400 | ~400 |
| Inline styles | 2,559 | 2,559 | 2,559 | 2,559 | **~500** |
| Total modules (BE) | 67 | 67 | 70 | 72 | 72 |

---

## 9. RISK ASSESSMENT

| Phase | Risk | Mitigation |
|-------|------|------------|
| 2B-1 (Router) | 🟢 LOW | Proven pattern, no logic changes |
| 2B-2 (Inventory) | 🟡 MEDIUM | Shared helpers need careful extraction |
| 2B-3 (Billing) | 🟡 MEDIUM | Payment logic is sensitive |
| 2B-4 (Inline CSS) | 🟡 MEDIUM | Visual regressions possible |

---

*Analysis complete. Phase 2B-1 (Router consolidation) is the clear highest-leverage starting point.*
