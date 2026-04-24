# 📋 COMPHONE SUPER APP — Modernization Sequencing Plan
## PHMP v1 Complexity Phase + Surface Modernization | 2026-04-24

---

## Dependency Map

```
                    ┌─────────────────────────────────────┐
                    │         BACKEND (Must Come First)    │
                    │                                      │
                    │  Utils.gs dedup ──┐                  │
                    │  Router modular ──┼──► Stable API    │
                    │  Auth gate ───────┘    Contract      │
                    └─────────────────────┬────────────────┘
                                          │
                    ┌─────────────────────┼────────────────┐
                    │                     │                │
              ┌─────▼─────┐    ┌──────────▼──┐    ┌───────▼───────┐
              │  PC Dash   │    │  Executive  │    │  Monitoring   │
              │  (depends  │    │  (independ) │    │  (independ)   │
              │  on Router)│    │             │    │               │
              └─────┬──────┘    └─────────────┘    └───────────────┘
                    │
              ┌─────▼──────┐
              │  Mobile PWA │
              │  (depends   │
              │  on Router  │
              │  + PC Dash  │
              │  patterns)  │
              └─────────────┘
```

---

## Sequencing Roadmap

### Wave 1: Backend Foundation (Parallelizable)

| Task | Depends On | Effort | Can Parallel With |
|------|-----------|--------|-------------------|
| Utils.gs dedup (7 functions) | Nothing | 1 hour | Router modularization |
| Router modularization (expand RouterSplit) | Nothing | 4 hours | Utils.gs dedup |
| Dead code audit (15+ actions) | Nothing | 1 hour | Both above |

**Prerequisites:** None — these are pure backend changes
**Risk:** LOW — Utils.gs and RouterSplit.gs are safe to modify
**Gate:** Regression guard must pass after each change

### Wave 2: Independent Surfaces (Parallelizable)

| Task | Depends On | Effort | Can Parallel With |
|------|-----------|--------|-------------------|
| Executive Dashboard modernization | Wave 1 (stable API) | 3 hours | Monitoring + PC Dash extraction |
| Monitoring Dashboard modernization | Nothing (minimal deps) | 2 hours | Executive + PC Dash extraction |
| PC Dashboard section extraction | Wave 1 (Router stable) | 4 hours | Executive + Monitoring |

**Prerequisites:** Wave 1 complete (stable API contract)
**Risk:** LOW for Executive/Monitoring (independent surfaces)
**Risk:** MEDIUM for PC Dashboard (2865 lines, high churn)
**Gate:** Browser smoke test + regression guard

### Wave 3: Mobile PWA (Sequential)

| Task | Depends On | Effort | Notes |
|------|-----------|--------|-------|
| Mobile PWA modernization | Wave 2 (patterns established) | 6 hours | Most complex surface |
| Cross-surface testing | Wave 2 complete | 2 hours | Verify shared modules |

**Prerequisites:** Wave 2 complete (patterns established from PC Dashboard extraction)
**Risk:** HIGH — 41 scripts, most complex surface
**Gate:** Full regression + browser smoke + manual QA

---

## Wave Details

### Wave 1: Backend Foundation

#### 1a. Utils.gs Deduplication (1 hour)
```
Move to Utils.gs:
  - _findColIdx_ (from Approval.gs, AuditLog.gs)
  - findHeaderIndex_ (from Auth.gs, JobStateMachine.gs)
  - roundMoney_ (from BillingManager.gs, TaxEngine.gs)
  - buildEmptyTaxSummary_ (from TaxDocuments.gs, TaxEngine.gs)
  - getReceiptFolderSafe_ (from TaxDocuments.gs, WarrantyManager.gs)

Keep in Config.gs (reference only):
  - buildWebAppUrl_
  - getWebAppBaseUrl_
```

#### 1b. Router Modularization (4 hours)
```
Current: Router.gs (1321 lines, 283 cases)
Target:  Router.gs (~300 lines, dispatcher only)
         + InventoryRouter.gs (inventory cases)
         + BillingRouter.gs (billing cases)
         + AuthRouter.gs (auth cases)
         + CRMSchedulerRouter.gs (CRM + attendance cases)
         + SystemRouter.gs (system/setup cases)

RouterSplit.gs already has 62 functions as fast-path.
Expand it to cover all 283 cases.
```

#### 1c. Dead Code Audit (1 hour)
```
15+ actions with no frontend reference:
  - Verify they're truly dead (check LINE Bot, cron, internal calls)
  - Remove or document intentional internal-only actions
```

### Wave 2: Independent Surfaces

#### 2a. Executive Dashboard (3 hours)
```
Current: 1085 lines, 5 scripts, Chart.js
Dependencies: gas_config.js, chart.js, system_graph_data.js, api_client.js
Coupling: LOW — can modernize independently

Opportunities:
  - Add real-time data refresh
  - Modernize chart library (Chart.js 4.x features)
  - Add responsive mobile layout
  - Connect to auth gate (currently no auth)
```

#### 2b. Monitoring Dashboard (2 hours)
```
Current: 1132 lines, 2 scripts (gas_config only)
Dependencies: gas_config.js only
Coupling: MINIMAL — most independent surface

Opportunities:
  - Add health check visualization
  - Connect to failure-pattern-log.sh data
  - Add guard status dashboard
  - Auto-refresh with complexity metrics
```

#### 2c. PC Dashboard Section Extraction (4 hours)
```
Current: 2865 lines, 15 scripts, inline sections
Already externalized: billing_section.js, attendance_section.js, warranty_section.js
Still inline: dashboard, jobs, inventory, PO, revenue, tax, CRM, settings

Opportunities:
  - Extract remaining inline sections to external .js files
  - Reduce dashboard_pc.html to shell only (~500 lines)
  - Apply sanitizeHTML() to all section renders
  - Standardize section pattern (consistent load/render/update)
```

### Wave 3: Mobile PWA

#### 3a. Mobile PWA Modernization (6 hours)
```
Current: 707 lines HTML, 41 scripts loaded
Already modular: Yes (each section is separate .js)
Coupling: HIGH — shares api_client.js, execution_lock.js, etc.

Opportunities:
  - Apply patterns from PC Dashboard extraction
  - Verify auth gate works with mobile API calls
  - Optimize load order (critical path vs lazy)
  - Apply sanitizeHTML() to mobile sections
  - Verify offline functionality
```

---

## Readiness Matrix

| Task | Backend Ready | Auth Ready | Patterns Ready | Ready? |
|------|--------------|------------|----------------|--------|
| Utils.gs dedup | ✅ | ✅ | ✅ | ✅ NOW |
| Router modularization | ✅ | ✅ | ✅ | ✅ NOW |
| Dead code audit | ✅ | ✅ | ✅ | ✅ NOW |
| Executive Dashboard | ⚠️ Wave 1 | ✅ | ✅ | ⚠️ After Wave 1 |
| Monitoring Dashboard | ✅ | ✅ | ✅ | ✅ NOW |
| PC Dashboard extraction | ⚠️ Wave 1 | ✅ | ✅ | ⚠️ After Wave 1 |
| Mobile PWA | ⚠️ Wave 1+2 | ✅ | ⚠️ Wave 2 | ⚠️ After Wave 2 |

---

## Entropy Prevention Rules

1. **Never modify Router.gs AND a surface in the same commit** — separate backend from frontend
2. **Extract before adding** — if a file exceeds 800 lines, extract before adding new features
3. **Shared modules first** — update gas_config.js, api_client.js BEFORE surface changes
4. **One surface per commit** — don't mix Executive + Monitoring + PC Dashboard changes
5. **Regression guard after every wave** — full pass before moving to next wave

---

## Timeline Estimate

| Wave | Tasks | Effort | Parallel? |
|------|-------|--------|-----------|
| Wave 1 | Backend foundation | 6 hours | Yes (Utils + Router + Dead code) |
| Wave 2 | Independent surfaces | 9 hours | Yes (Executive + Monitoring + PC) |
| Wave 3 | Mobile PWA | 8 hours | No (sequential) |
| **Total** | — | **23 hours** | — |

**With parallelization: ~15 hours effective**
