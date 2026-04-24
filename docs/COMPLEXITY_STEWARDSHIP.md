# 🏗️ COMPHONE SUPER APP — Complexity Stewardship Plan
## PHMP v1 Structural Evolution | 2026-04-24

---

## Complexity Debt Inventory

### CRITICAL (Refactor Required)

| File | Lines | Functions | Risk | Refactor Strategy |
|------|-------|-----------|------|-------------------|
| Inventory.gs | 1,492 | 41 | God module | Split: InventoryCRUD.gs + InventoryAnalytics.gs + InventorySync.gs |
| Router.gs | 1,321 | 15+283 cases | Routing monolith | Expand RouterSplit.gs — extract case groups to modules |
| app.js | 1,199 | ~30 | Frontend monolith | Already modular (loadSection pattern); extract inline sections |
| BillingManager.gs | 1,065 | 41 | God module | Split: BillingCRUD.gs + BillingPDF.gs + BillingPayment.gs |

### WARNING (Monitor)

| File | Lines | Action |
|------|-------|--------|
| LineBotIntelligent.gs | 909 | Monitor, split if >1200 |
| ai_executor_runtime.js | 986 | Monitor, split if >1200 |
| inventory_ui.js | 947 | Monitor, split if >1200 |
| Dashboard.gs | 839 | Monitor |
| PhotoQueue.gs | 821 | Monitor |
| BusinessAI.gs | 890 | Monitor |

---

## Coupling Analysis

### Router.gs — Central Coupling Hub

```
Router.gs (283 cases, 328 unique function calls)
    │
    ├── Inventory.gs (41 functions)
    ├── BillingManager.gs (41 functions)
    ├── CRM.gs
    ├── Auth.gs
    ├── Attendance.gs
    ├── WarrantyManager.gs
    ├── LineBot.gs / LineBotV2.gs / LineBotIntelligent.gs
    ├── PhotoQueue.gs
    ├── VisionPipeline.gs
    ├── Dashboard.gs / DashboardBundle.gs
    └── ... 57+ other .gs files
```

**Risk:** Every action flows through Router.gs. Any change to routing affects all modules.

### Duplicate Functions (7 instances)

| Function | Files | Fix |
|----------|-------|-----|
| `_findColIdx_` | Approval.gs, AuditLog.gs | Move to Utils.gs |
| `buildEmptyTaxSummary_` | TaxDocuments.gs, TaxEngine.gs | Move to Utils.gs |
| `buildWebAppUrl_` | Config.gs, JobStateMachine.gs | Keep in Config.gs, reference |
| `findHeaderIndex_` | Auth.gs, JobStateMachine.gs | Move to Utils.gs |
| `getReceiptFolderSafe_` | TaxDocuments.gs, WarrantyManager.gs | Move to Utils.gs |
| `getWebAppBaseUrl_` | Config.gs, JobStateMachine.gs | Keep in Config.gs, reference |
| `roundMoney_` | BillingManager.gs, TaxEngine.gs | Move to Utils.gs |

---

## Entropy Growth Risks

| Risk | Indicator | Current | Threshold |
|------|-----------|---------|-----------|
| File churn | dashboard_pc.html | 50 changes/month | ⚠️ HIGH |
| Router growth | New actions added | 283 cases | 300 = refactor trigger |
| Duplicate code | 7 duplicate functions | 7 | 10 = consolidation trigger |
| Dead code | Actions with no frontend | 15+ | Audit needed |
| Module coupling | Router calls 328 functions | 328 | 400 = decouple trigger |

---

## Structural Evolution Roadmap

### Phase 1: Duplication Elimination (1 hour)

| # | Action | Impact |
|---|--------|--------|
| 1 | Move 5 duplicate functions to Utils.gs | Reduce code by ~200 lines |
| 2 | Update references in Approval.gs, AuditLog.gs, etc. | Single source of truth |
| 3 | Run regression guard | Verify no breakage |

### Phase 2: Router Modularization (4 hours)

| # | Action | Impact |
|---|--------|--------|
| 1 | Expand RouterSplit.gs — extract case groups | Router.gs: 1321 → ~500 lines |
| 2 | Create module routers: InventoryRouter.gs, BillingRouter.gs, etc. | Each module handles its own routing |
| 3 | Router.gs becomes dispatcher only | Reduces coupling |

### Phase 3: Frontend Modularization (4 hours)

| # | Action | Impact |
|---|--------|--------|
| 1 | Extract inline sections from dashboard_pc.html | Reduces churn on monolith |
| 2 | Create section loader pattern (already exists for billing/attendance/warranty) | Consistent modularization |
| 3 | app.js split: app-core.js + app-sections.js | Each < 800 lines |

### Phase 4: Complexity Monitoring Automation (1 hour)

| # | Action | Impact |
|---|--------|--------|
| 1 | Add complexity check to pre-commit hook | Block commits that exceed thresholds |
| 2 | Add complexity report to failure-pattern-log.sh | Already partially done |
| 3 | Create complexity trend tracking | Monitor growth over time |

---

## Architecture Evolution Paths

### Current: Hub-and-Spoke (Router-centric)

```
Frontend → Router.gs → Module.gs → Sheets
```

### Target: Event-Driven Modular

```
Frontend → Gateway.gs → ModuleRouter.gs → Module.gs → Sheets
                         ├── InventoryRouter
                         ├── BillingRouter
                         ├── AuthRouter
                         └── ...
```

### Benefits:
- Router.gs shrinks from 1321 to ~300 lines
- Each module owns its routing
- Modules can be tested independently
- New features don't touch Router.gs

---

## Key Metrics to Track

| Metric | Current | Target | Threshold |
|--------|---------|--------|-----------|
| Max file size | 1,492 lines | <800 lines | 1,000 = CRITICAL |
| Router cases | 283 | <200 | 300 = refactor |
| Duplicate functions | 7 | 0 | 10 = consolidation |
| Guard checks | 43+ | 50+ | Growing |
| Enforcement layers | 4 | 5 (+ CI) | 3 = minimum |
| Dead code actions | 15+ | 0 | Audit needed |

---

## Review Schedule

| Review | Frequency | Action |
|--------|-----------|--------|
| Complexity check | Weekly | Run failure-pattern-log.sh |
| Duplicate detection | Monthly | grep for duplicate functions |
| Router size check | Monthly | wc -l Router.gs |
| Dead code audit | Quarterly | Check action references |
| Architecture review | Quarterly | Full coupling analysis |
