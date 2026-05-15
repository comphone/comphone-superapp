# 📘 COMPHONE SUPER APP — BLUEPRINT (Single Source of Truth)

> **Version:** v5.18.34-job-menu-hardening (PWA) / GAS Backend v5.18.16-write-flow-validation @609

> **Date:** 2026-05-15 | **Phase:** 92 (Blueprint Reconciliation)

> **Status:** RECOVERED + HARDENED + FUNCTIONALLY AUDITED + CORE-AUDITED + FOCUS-AUDITED + JOBS-E2E-HARDENED + BILLING-E2E-HARDENED + REPORTS-E2E-HARDENED + VISION-LINE-FLOW-HARDENED + PRODUCTION-JOURNEY-HARDENED + BACKUP-WORKFLOW-HARDENED + MOBILE-QUICK-ACTIONS-HARDENED + MOBILE-CORE-WORKFLOWS-HARDENED + MOBILE-SECONDARY-WORKFLOWS-HARDENED + LIVE-MOBILE-MENU-SMOKE-HARDENED + OPERATOR-UX-QA-HARDENED + PROTECTED-LIVE-QA-RUNBOOK-HARDENED + PROTECTED-LIVE-QA-VERIFIED + DASHBOARD-PERFORMANCE-HARDENED + DEPLOY-GAS-CI-GATE-HARDENED + WRITE-SMOKE-LIFECYCLE-HARDENED + BLUEPRINT-RECONCILED + GEMINI-READY - repo restored from stable `db942bd`; PC/mobile login and menu runtime verified on live GitHub Pages; Sprint 74 Core System Audit score 100/100; Sprint 75 Jobs/Billing/Reports Focus Audit score 100/100; Sprint 76 Jobs E2E Audit score 100/100; Sprint 77 Billing E2E Audit score 100/100; Sprint 78 Reports E2E Audit score 100/100; Sprint 79 Vision+LINE Flow Audit score 100/100; Sprint 80 Production Journey Audit score 100/100; Sprint 82 Mobile Quick Actions Audit score 100/100; Sprint 83 Mobile Core Workflows Audit score 100/100; Sprint 84 Mobile Secondary Workflows Audit score 100/100; Sprint 85 Live Mobile Menu Smoke public suite OK with token-aware protected read suite; Sprint 86 Operator UX QA Checklist score 100/100; Sprint 87 Protected Live QA Runbook is CI-safe without token and operator-ready with token; Sprint 88 live protected evidence confirms all protected read menus pass with one dashboard latency warning; Sprint 89 routes legacy `getDashboardData` through the cached single-pass Dashboard Bundle, aligns Dashboard source across root/clasp-ready, and is deployed to production GAS @608; protected Sprint 87 rerun after @608 reports 13 pass / 0 slow / 0 fail; Sprint 90 makes Deploy-GAS CI skip deployment cleanly when `CLASPRC_JSON` is missing/invalid while preserving real deployment when the secret exists; Sprint 91 expands write-smoke lifecycle coverage with safe job note/status checks and cleanup support for Billing/PO smoke rows, deployed to production GAS @609; Sprint 92 reconciles stale historical BLUEPRINT claims so agents no longer treat old GAS URLs, login/splash issues, and Phase 35 pending items as current blockers; Scheduled Session Backup workflow no longer fights `.gitignore`; System Integrity Audit score 100/100; Menu Journey Audit score 100/100; Functional Menu Audit score 100/100; PC Jobs now has detail, assign, quick note, timeline, status, Vision, and Billing handoffs; Mobile dashboard quick actions now have stable button contracts, real Open Job/Add Customer entry workflows, API-contract coverage, and a More-sheet fallback that avoids blank Bootstrap-modal paths; Mobile Jobs/CRM/Billing now have dedicated core workflow guard coverage, CRM backend-field normalization, CRM modal recovery, and safe legacy CRM write idempotency; Mobile Inventory/PO/Warranty/Reports now have dedicated secondary workflow guard coverage, PO modal recovery, PO create idempotency, Warranty loader alias, and expanded API-contract coverage; Operator UX QA checklist now documents PC/mobile walkthrough order, entrypoint load order, menu routes, recovery settings, live smoke readiness, and local browser-smoke coverage; PC/mobile Billing now has field-contract normalization, mobile modal shell recovery, PromptPay QR compatibility, and safer paid amount handling; Reports/Revenue now normalize backend report shapes and use live report APIs before fallbacks; AI Vision suggestions use preview + explicit confirmation + backend whitelist execution; LINE Command Center safe-send now uses the correct `sendLinePush(message, groupId)` contract and keeps room IDs/tokens hidden behind status tails; PC Settings badge now reports actual API/CACHE readiness instead of stale AI_EXECUTOR/LOCK false failures; backend `addQuickNote` is implemented and deployed; PC Reports loads the real reports module; PC Tax now has a real renderer; Billing legacy prototype shimmed out and PC Billing render no longer blanks when the production renderer paints directly into the DOM; Settings includes Runtime Self-Test, operations diagnostics, diagnostics export, and safe PWA cache repair; GAS redeployed at @609 with write-smoke lifecycle hardening; protected API smoke passes core menus including Reports, Billing, Vision, and LINE read endpoints when a valid session token is supplied; Smoke Cleanup Planner now reports 0 candidates after deleting the 4 reviewed smoke records with archive-before-delete; Gemini secret is configured in Apps Script Properties under `GEMINI_API_KEY`; Vision runtime smoke passes public health/version and protected Vision read suite when token is supplied.

---

## 0. Current Runtime Snapshot (2026-05-15)

| Item | Current Value | Source of Truth |
|---|---|---|
| App Version | `v5.18.34-job-menu-hardening` | `pwa/version_config.js` |
| Cache Version | `comphone-v5.18.34-job-menu-hardening-20260513_2005` | `pwa/version_config.js`, `pwa/sw.js` |
| Build Timestamp | `20260513_2005` | `pwa/version_config.js` |
| GAS Backend Deploy | `AKfycbwN_mbyHOJ4vXRNpHjuN8dUFbXjERwtgTbNROt5_ynakfYm6Xv4RrgvhPMvI53lIhPWBA @609` / production URL in `pwa/gas_config.js` | `Config.gs`, `Dashboard.gs`, `DashboardBundle.gs`, `RouterSplit.gs`, `JobStateMachine.gs`, `LineCommandCenter.gs`, `SmokeCleanup.gs`, `VisionPipeline.gs`, `clasp-ready/Config.gs`, `clasp-ready/Dashboard.gs`, `clasp-ready/DashboardBundle.gs`, `clasp-ready/RouterSplit.gs`, `clasp-ready/JobStateMachine.gs`, `clasp-ready/LineCommandCenter.gs`, `clasp-ready/SmokeCleanup.gs`, `clasp-ready/VisionPipeline.gs` |
| GAS Production URL | `https://script.google.com/macros/s/AKfycbwN_mbyHOJ4vXRNpHjuN8dUFbXjERwtgTbNROt5_ynakfYm6Xv4RrgvhPMvI53lIhPWBA/exec` | `pwa/gas_config.js` |
| API Contract Version | `2026-05-07.phase65-line-command-center` | `pwa/api_contract.js` |
| Last Production Commit | GitHub `main` HEAD | Use `git log -1 --oneline` for the exact commit |
| Validation Status | Static Guard OK; CI Readiness OK including Scheduled Session Backup ignore/force-add guard; GAS Source Alignment OK with Dashboard/DashboardBundle/SmokeCleanup now blocking; GAS Syntax Guard OK; Regression Guard OK; Drift Guard OK; Guard Self-Test OK; Sprint 74 Core System Audit 100/100; Sprint 75 Jobs/Billing/Reports Focus Audit 100/100; Sprint 76 Jobs E2E Audit 100/100; Sprint 77 Billing E2E Audit 100/100; Sprint 78 Reports E2E Audit 100/100; Sprint 79 Vision+LINE Flow Audit 100/100; Sprint 80 Production Journey Audit 100/100; Sprint 82 Mobile Quick Actions Audit 100/100; Sprint 83 Mobile Core Workflows Audit 100/100; Sprint 84 Mobile Secondary Workflows Audit 100/100; Sprint 85 Live Mobile Menu Smoke public suite OK and protected suite token-aware; Sprint 86 Operator UX QA Checklist 100/100; Sprint 87 Protected Live QA Runbook skip-safe without token and protected-read ready with token; Sprint 88 protected live QA 12 pass / 1 slow / 0 fail; Sprint 89 protected live QA after GAS @608 13 pass / 0 slow / 0 fail; Browser Smoke Test OK; System Integrity Audit 100/100; Menu Journey Audit 100/100; Functional Menu Audit score 100/100; UI Write Contract OK with job note/status and cleanup lifecycle coverage; UI Surface Audit OK; public/protected API smoke OK when token is present; Vision Capability Audit 100/100; Vision Runtime smoke OK with Gemini ready when token is present; Smoke Cleanup Plan reports 0 candidates after cleanup when token is present; live PC/mobile login verified; GitHub Pages freshness OK | `scripts/pwa_static_guard.js`, `scripts/ci_readiness_check.js`, `scripts/gas_source_alignment.js`, `scripts/gas_syntax_guard.js`, `scripts/build_code_index.js`, `scripts/sprint74_core_audit.js`, `scripts/sprint75_jobs_billing_reports_audit.js`, `scripts/sprint76_jobs_e2e_audit.js`, `scripts/sprint77_billing_e2e_audit.js`, `scripts/sprint78_reports_e2e_audit.js`, `scripts/sprint79_vision_line_flow_audit.js`, `scripts/sprint80_production_journey_audit.js`, `scripts/sprint82_mobile_quick_actions_audit.js`, `scripts/sprint83_mobile_core_workflows_audit.js`, `scripts/sprint84_mobile_secondary_workflows_audit.js`, `scripts/sprint85_live_mobile_menu_smoke.js`, `scripts/sprint86_operator_ux_qa_checklist.js`, `scripts/sprint87_protected_live_qa_runbook.js`, `scripts/browser-smoke-test.py`, `scripts/system_integrity_audit.js`, `scripts/pwa_menu_journey_audit.js`, `scripts/pwa_functional_menu_audit.js`, `scripts/pwa_ui_write_contract.js`, `scripts/pwa_ui_surface_audit.js`, `scripts/pwa_api_smoke.js`, `scripts/vision_capability_audit.js`, `scripts/vision_runtime_smoke.js`, `scripts/pwa_smoke_cleanup_plan.js`, `scripts/pages_deploy_verify.js`, `test_reports/*_latest.*`, `SPRINT_74_CORE_AUDIT.md` |

### Phase 92 Blueprint Reconciliation (2026-05-15)
- Reconciled stale historical BLUEPRINT sections that still claimed old GAS `@506`, old production URLs, unresolved login/splash blockers, and old Phase 35 pending items.
- Updated watchlists to distinguish current blockers from historical findings, so Hermes/Codex/future agents do not restart already-closed recovery work.
- Current source of truth remains GitHub `main`, PWA v5.18.34, and GAS production deployment `@609`.

### Phase 91 Write-Smoke Lifecycle Hardening (2026-05-15)
- Expanded `scripts/pwa_write_smoke.js` so the gated write smoke now covers safe Jobs workflow handoffs after opening a test job: `addQuickNote`, an early safe `transitionJob` step, and `getJobTimeline` read-back verification.
- Kept payment and LINE-send style writes outside the default write smoke because those can trigger real customer/team notifications. Those paths remain guarded by explicit production/staging runbooks.
- Expanded `SmokeCleanup.gs` at root and `clasp-ready/SmokeCleanup.gs` so reviewed smoke cleanup can archive/delete smoke rows in `DB_BILLING` and `DB_PURCHASE_ORDERS`, not only Jobs and Customers.
- Expanded `scripts/pwa_smoke_cleanup_plan.js` to scan `listBillings` directly, and promoted `SmokeCleanup.gs` into the blocking `scripts/gas_source_alignment.js` list so root and deploy source cannot drift silently.
- Expanded static/UI guards to block regressions in write-smoke job handoffs and cleanup lifecycle coverage.
- Production GAS was pushed and existing Web App deployment `AKfycbwN_mbyHOJ4vXRNpHjuN8dUFbXjERwtgTbNROt5_ynakfYm6Xv4RrgvhPMvI53lIhPWBA` was updated to **@609** with `Sprint 91 Write-smoke lifecycle hardening`.

### Phase 90 Deploy-GAS CI Secret Gate Hardening (2026-05-15)
- Updated `.github/workflows/deploy-gas.yml` so missing, invalid, or malformed `CLASPRC_JSON` no longer makes the validation job fail red. The workflow now completes validation and sets `should_deploy=false`, clearly skipping GAS deploy until the secret is configured.
- The production deployment path is still strict when `CLASPRC_JSON` exists and is valid: it proceeds to `clasp push`, creates a version, and deploys through the protected production environment exactly as before.
- This avoids noisy failed deploy-gas runs after local/manual GAS deploys while keeping the required secret documented. To re-enable automatic GAS deploy in GitHub Actions, set repository secret `CLASPRC_JSON` to the raw local `~/.clasprc.json` content.

### Phase 89 Dashboard Performance Hardening (2026-05-15)
- Hardened `Dashboard.gs` so legacy `getDashboardData()` now uses the single-pass `getDashboardBundle()` fast path first, stores a 60s compatibility cache, and only falls back to the old multi-scan implementation if the bundle path fails.
- Hardened `DashboardBundle.gs` sheet discovery to support production sheet names such as `DB_INVENTORY` and `DB_BILLING` plus legacy aliases, preventing fast bundle responses from returning thin/empty dashboard summaries.
- Synced `Dashboard.gs` and `DashboardBundle.gs` across root and `clasp-ready/`, then expanded `scripts/gas_source_alignment.js` so both Dashboard files are now blocking alignment checks.
- Verification on 2026-05-15: `gas_source_alignment` OK across 11 blocking GAS files, `gas_syntax_guard` OK for 90 GAS files, `pwa_static_guard` OK, `ci_readiness_check` OK, full `regression-guard.sh` OK, `drift-guard.sh` OK, and `guard-self-test.sh` OK.
- Production GAS was pushed and existing Web App deployment `AKfycbwN_mbyHOJ4vXRNpHjuN8dUFbXjERwtgTbNROt5_ynakfYm6Xv4RrgvhPMvI53lIhPWBA` was updated to **@608** with `Sprint 89 Dashboard performance hardening`.
- Post-deploy verification on 2026-05-15: temporary admin session smoke showed `getDashboardData` fresh path at 8.8s wall time with backend `_elapsed_ms=3686`, then cached calls at about 3.4s wall time with backend `_elapsed_ms=30-88`. Sprint 87 protected live QA rerun reports **13 pass, 0 slow, 0 fail** and Dashboard `getDashboardData` at **3726ms**.

### Phase 88 Protected Live QA Evidence (2026-05-15)
- Ran Sprint 87 Protected Live QA with a short-lived admin session token kept only in process environment. No real session token was written to repo files, reports, or BLUEPRINT.
- Live protected read suite result: **12 pass, 1 slow, 0 fail, 0 skipped**. Public health/version passed. Protected dashboard, Jobs, CRM, Inventory, PO, Billing, Reports, Warranty, Vision, LINE Center, and Admin security read endpoints all returned HTTP 200 with valid response shapes.
- The only warning is dashboard latency: `getDashboardData` took about **12.2s**, crossing the Sprint 87 slow threshold of 12s. This is operationally usable but should be optimized next because Dashboard PC/mobile depend on it during the first screen load.
- Follow-up protected `pwa_api_smoke.js` also passed with the temporary token: dashboard, CRM, Inventory, PO, Reports, Vision stats/version, LINE Command Center/status, and Admin security status all OK.
- Next recommended sprint: Dashboard data performance hardening. Prioritize backend aggregation/cache strategy for `getDashboardData`, then frontend progressive rendering so PC/mobile first screen does not feel stuck during GAS cold starts.

### Phase 87 Protected Live QA Runbook (2026-05-15)
- Added `scripts/sprint87_protected_live_qa_runbook.js` and wired it into `.github/workflows/auto-deploy.yml` plus `scripts/regression-guard.sh`.
- The runbook is safe for CI: when `COMPHONE_AUTH_TOKEN` is not set it writes a skipped report and exits OK. When a fresh admin session token is supplied, it runs read-only protected checks for dashboard, Jobs, CRM, Inventory, PO, Billing, Reports, Warranty, Vision, LINE Center, and Admin security status.
- Reports are generated at `test_reports/sprint87_protected_live_qa_runbook_latest.json` and `test_reports/sprint87_protected_live_qa_runbook_latest.md`, with pass/slow/fail counts, operator commands, and per-menu recommendations. Real tokens must remain local shell env only and must never be committed.
- Verification on 2026-05-15: Sprint 87 skip-safe runbook OK without token, `pwa_static_guard` OK, `ci_readiness_check` OK, full `regression-guard.sh` OK, and `guard-self-test.sh` OK.

### Phase 86 Operator UX QA Checklist (2026-05-15)
- Added `scripts/sprint86_operator_ux_qa_checklist.js` and wired it into `.github/workflows/auto-deploy.yml` plus `scripts/regression-guard.sh`. Current result: **100/100**, **0 findings**.
- The checklist covers PC/mobile entrypoint load order, PC sidebar routes, mobile page containers and More sheet, mobile dashboard quick actions, Jobs/CRM/Billing chain, Inventory/PO/Warranty/Reports chain, Settings recovery tools, Sprint 85 live smoke readiness, and browser-smoke regression coverage.
- Generated operator-facing reports: `test_reports/sprint86_operator_ux_qa_latest.json` and `test_reports/sprint86_operator_ux_qa_latest.md`, including the recommended manual walkthrough order.
- Verification on 2026-05-15: Sprint 86 Operator UX QA 100/100, `python scripts/browser-smoke-test.py` OK, `pwa_static_guard` OK, `ci_readiness_check` OK, `pwa_functional_menu_audit` OK, Sprint 85 live public smoke OK with protected suite skipped due to missing `COMPHONE_AUTH_TOKEN`, full `regression-guard.sh` OK, and `guard-self-test.sh` OK.

### Phase 85 Live Mobile Menu Smoke Hardening (2026-05-15)
- Added `scripts/sprint85_live_mobile_menu_smoke.js` and wired it into `.github/workflows/auto-deploy.yml` plus `scripts/regression-guard.sh`.
- The smoke runs public `health` and `getVersion` on every run, then runs protected read-only mobile menu checks only when `COMPHONE_AUTH_TOKEN` is set. This keeps CI safe while giving operators a one-command live protected menu check.
- Protected read-only suite covers dashboard, Jobs, CRM, Inventory, PO, Billing, Reports, Warranty, Vision, LINE Center, and Admin security status with response-shape validators and concise summaries.
- Report outputs: `test_reports/sprint85_live_mobile_menu_smoke_latest.json` and `test_reports/sprint85_live_mobile_menu_smoke_latest.md`.
- Verification on 2026-05-15 without a session token: public live health/version OK, protected suite skipped with an explicit `COMPHONE_AUTH_TOKEN is not set` marker, `pwa_static_guard` OK, `ci_readiness_check` OK, full `regression-guard.sh` OK, and `guard-self-test.sh` OK.

### Phase 84 Mobile Secondary Workflows Hardening (2026-05-15)
- Added `scripts/sprint84_mobile_secondary_workflows_audit.js` and wired it into `scripts/regression-guard.sh` plus `.github/workflows/auto-deploy.yml`. The guard verifies Inventory -> PO -> Warranty -> Reports mobile surfaces and contracts. Current result: **100/100**, **0 findings**.
- Hardened `pwa/purchase_order.js` with `ensurePOModalShell()` so PO detail and create flows recover `modal-po` and `modal-create-po` dynamically when static modal shells are absent from `index.html`.
- Added `client_request_id` and `source: mobile_po` to the mobile `createPurchaseOrder` path while keeping `receivePurchaseOrder` behind explicit confirmation.
- Added `loadWarrantyPage()` alias in `pwa/section_warranty.js` so Warranty is a first-class mobile route instead of relying on fallback route behavior.
- Expanded `pwa/api_contract.js` for PO write actions and Warranty read/write actions: `createPurchaseOrder`, `receivePurchaseOrder`, `listWarranties`, `getWarrantyByJobId`, `createWarranty`, and `updateWarrantyStatus`.
- Verification on 2026-05-15: Sprint 84 audit 100/100, `pwa_static_guard` OK, `pwa_functional_menu_audit` OK, `pwa_menu_journey_audit` OK, `ci_readiness_check` OK, full `regression-guard.sh` OK, and `guard-self-test.sh` OK.

### Phase 83 Mobile Core Workflows Hardening (2026-05-15)
- Added `scripts/sprint83_mobile_core_workflows_audit.js` and wired it into `scripts/regression-guard.sh` plus `.github/workflows/auto-deploy.yml`. The guard verifies the highest-value mobile chain: Jobs -> CRM -> Billing. Current result: **100/100**, **0 findings**.
- Hardened `pwa/crm_attendance.js` with `normalizeMobileCustomer()` so mobile CRM correctly renders backend/sheet-style fields such as `customer_name`, `customer_id`, `customer_type`, `total_jobs`, `total_revenue`, and `created_at`.
- Updated mobile CRM customer detail and after-sales flows to create missing modal shells through `ensureActionModal()` instead of depending on removed static HTML modal containers.
- Updated the legacy `showAddCustomer()` path to delegate to the central `addCustomer()` workflow when available, keeping the Sprint 82 idempotent create-customer modal as the primary mobile entry.
- Added `client_request_id` and `source: mobile_crm` to `saveNewCustomerFromCRM()` so the legacy CRM write path is also idempotent if called directly.
- Verification on 2026-05-15: Sprint 83 audit 100/100, `pwa_static_guard` OK, `pwa_functional_menu_audit` OK, Sprint 82 audit 100/100, `ci_readiness_check` OK, full `regression-guard.sh` OK, and `guard-self-test.sh` OK.

### Phase 82 Mobile Quick Actions Hardening (2026-05-15)
- Added `scripts/sprint82_mobile_quick_actions_audit.js` and wired it into `scripts/regression-guard.sh` plus `.github/workflows/auto-deploy.yml`. The guard verifies mobile dashboard quick action buttons, central `runQuickAction()` dispatch, configurable max-6 shortcuts, Open Job/Add Customer modal workflows, idempotent write payloads, More-sheet grouped routing, API contract coverage, and CI coverage. Current result: **100/100**, **0 findings**.
- Hardened `pwa/app_home.js` quick action buttons with stable `type="button"`, `data-quick-action`, and `aria-label` attributes so browser smoke, support tooling, and accessibility tooling have durable handles.
- Hardened legacy `moreActions()` in `pwa/app_actions.js` so old callers open the modern grouped `showMoreMenu()` bottom sheet instead of trying to use a missing Bootstrap modal path that can render as a blank white sheet.
- Expanded `pwa/api_contract.js` CRM coverage with `createCustomer` as a destructive/write action, matching the mobile `addCustomer()` workflow and future smoke-test expectations.
- Verification on 2026-05-15: Sprint 82 audit 100/100, `pwa_static_guard` OK, `pwa_functional_menu_audit` OK, `ci_readiness_check` OK, Sprint 80 Production Journey Audit OK, full `regression-guard.sh` OK, and `guard-self-test.sh` OK. Local browser check confirmed the mobile shell assets load from a clean local server; local login was not used as a pass/fail signal because localhost auth waited on the production backend response.

### Phase 81 Scheduled Session Backup Hardening (2026-05-15)
- Investigated the latest GitHub Actions state. Auto Deploy and Drive Backup Sync were green on commit `ab75f74`, while `Scheduled Session Backup` failed on the scheduled run from 2026-05-14 17:29 UTC.
- Root cause: `.gitignore` ignored the whole `backups/` directory while `.github/workflows/session-backup.yml` attempted `git add backups/session/`. This makes the scheduled backup job fail before it can commit the generated session backup.
- Updated `.gitignore` to keep the general `backups/` ignore while explicitly allowing `backups/session/*.md`.
- Updated `.github/workflows/session-backup.yml` to `git add -f backups/session/session_*.md backups/session/session_latest.md` and exit cleanly when `memory/session.md` is absent.
- Updated `scripts/ci_readiness_check.js` so future CI readiness checks assert that scheduled session backup files are allowed through `.gitignore` and force-added by the workflow.
- Verification on 2026-05-15: workflow YAML parse OK, `git add --dry-run backups/session/session_latest.md` OK, `ci_readiness_check` OK, `pwa_static_guard` OK, and `guard-self-test` OK.

### Phase 80 Production Journey + Deploy Validation Hardening (2026-05-14)
- Added `scripts/sprint80_production_journey_audit.js` and wired it into `scripts/regression-guard.sh` plus `.github/workflows/auto-deploy.yml`. The guard verifies PC section routing, mobile page containers, grouped mobile More-menu routing, last-page restore/back protection, Settings recovery tools, API contract journey coverage, deploy-gas validation stability, and CI coverage. Current result: **100/100**, **0 findings**.
- Fixed the PC Settings/version badge in `pwa/section_settings.js`. The badge now reports `API:OK/CHECK` and `CACHE:OK/CHECK`, matching the post-recovery direct `api_client.js` architecture, instead of showing stale `AI:FAIL | LOCK:FAIL` from removed executor paths.
- Added `scripts/gas_syntax_guard.js` and updated `.github/workflows/deploy-gas.yml` to use it. The workflow no longer uses a raw brace counter that can fail on valid Apps Script regex/string content. Local pre-deploy validation sequence passes: `gas_syntax_guard`, `regression-guard`, `drift-guard`, `guard-self-test`, `ci_readiness_check`, and `gas_source_alignment`.
- Browser QA on 2026-05-14 verified live mobile login, grouped More menu, mobile Reports page, live PC Settings page, and local fixed PC badge (`API:OK | CACHE:OK`) with no `AI:FAIL`/`LOCK:FAIL` false alarm.
- Verification on 2026-05-14: Sprint 80 audit 100/100, `pwa_static_guard` OK, `system_integrity_audit` OK, `pwa_functional_menu_audit` OK, full `regression-guard.sh` OK, protected `pwa_api_smoke` OK, protected `vision_runtime_smoke` OK, and protected Sprint 79 Vision+LINE live read audit 100/100. No Apps Script redeploy was required for Sprint 80 because backend production remained at @607.

### Phase 79 AI Vision + LINE Flow Hardening (2026-05-14)
- Added `scripts/sprint79_vision_line_flow_audit.js` and wired it into `scripts/regression-guard.sh` plus `.github/workflows/auto-deploy.yml`. The guard verifies PC/mobile Vision surfaces, Vision controlled execution, LINE room routing previews, LINE Command Center safe-send, alert operations, RouterSplit route coverage, API contract coverage, read-action classification, and optional live protected Vision/LINE reads. Current result: **100/100**, **0 findings**.
- Fixed LINE Command Center manual room messaging in both root and `clasp-ready/LineCommandCenter.gs`: `sendLineRoomMessage()` now calls `sendLinePush(message, groupId)` to match the production `Notify.gs` contract. Preview still runs first and production sends still require `SEND_LINE_ROOM_MESSAGE`.
- Added `scripts/gas_syntax_guard.js` and updated `.github/workflows/deploy-gas.yml` to use it instead of the old raw brace counter. This prevents valid Apps Script regex/string content from causing false pre-deploy failures while still blocking empty files, merge-conflict markers, unbalanced block comments, and malformed function declarations.
- Confirmed AI Vision controlled actions remain behind the safe chain: UI preview -> operator confirmation -> backend allowed-suggestion lookup -> `EXECUTE_VISION_SUGGESTION` confirmation gate -> audit/write/LINE routing.
- GAS source was pushed and production deployment updated to **@607** (`Sprint 79 Vision LINE flow hardening`). `pwa/gas_config.js` records the new deployment note/date while keeping the same production Web App URL.
- Verification on 2026-05-14: Sprint 79 static audit 100/100, protected live Vision+LINE read audit 100/100, `gas_syntax_guard` OK, `vision_runtime_smoke` OK, `pwa_api_smoke` OK, `pwa_static_guard` OK, `system_integrity_audit` OK, `pwa_functional_menu_audit` OK, `vision_capability_audit` OK, GAS source alignment OK, and full `regression-guard.sh` OK.

### Phase 78 Reports End-to-End Workflow Hardening (2026-05-14)
- Added `scripts/sprint78_reports_e2e_audit.js` and wired it into `scripts/regression-guard.sh` plus `.github/workflows/auto-deploy.yml`. The guard verifies PC/mobile Reports shell loading, real report renderer routing, Attendance/Jobs/Billing/Inventory report actions, Revenue API usage, Analytics backend routes, backend report engines, API contract coverage, and optional live protected reads. Current result: **100/100**, **0 findings**.
- Added `_normalizeReportData()` in `pwa/reports.js` so Billing report cards can consume both legacy `summary/records` responses and current backend `data.revenue/dailyRevenue` report responses.
- Updated `pwa/section_revenue.js` to call `getReportData({period:'month'})` first and normalize report output through `_normalizeRevenueReportData()` before falling back to dashboard data.
- Expanded `pwa/api_contract.js` Reports menu coverage to include `getAttendanceMonthlySummary`, `getDashboardBundle`, `inventoryOverview`, `analyzeBusiness`, and `getDashboardAnalytics`.
- Verification on 2026-05-14: Sprint 78 static audit 100/100, protected live Reports/Analytics audit 100/100, `pwa_api_smoke` OK, and full `regression-guard.sh` OK. No Apps Script redeploy was required because this sprint changed PWA/contract/guard files only.

### Phase 77 Billing End-to-End Workflow Hardening (2026-05-14)
- Added `scripts/sprint77_billing_e2e_audit.js` and wired it into `scripts/regression-guard.sh` plus `.github/workflows/auto-deploy.yml`. The guard verifies PC/mobile Billing surfaces, Jobs-to-Billing handoff, backend Billing routes, create/list/pay/QR/slip/receipt hooks, tax hooks, field contract normalization, and optional live protected Billing reads. Current result: **100/100**, **0 findings**.
- Fixed `pwa/billing_section.js` contract drift by adding `_normalizeBilling()`. The UI now accepts backend lowercase fields (`job_id`, `payment_status`, `total_amount`, etc.) while preserving legacy uppercase table/detail accessors.
- Fixed Billing payment math: PC mark-paid now sends the total paid amount (`totalForPayment`) instead of only `Balance_Due`, preventing partial-payment drift when a bill already has previous payment.
- Fixed PromptPay QR display compatibility: the UI now accepts `qr_url`, `qr_image_url`, or `promptpay_qr_url` from the backend.
- Restored the mobile Billing modal shell in `pwa/index.html` (`modal-billing` + `billing-modal-content`) so `openBillingModal()` from mobile Jobs/quick actions has a real mount point.
- Kept `pwa/section_billing.js` as a compatibility shim only, with no placeholder production data. Verification on 2026-05-14: Sprint 77 static audit 100/100, protected live Billing/Tax read audit 100/100, `pwa_api_smoke` OK, and full `regression-guard.sh` OK.

### Phase 76 Jobs End-to-End Workflow Hardening (2026-05-14)
- Added `scripts/sprint76_jobs_e2e_audit.js` and wired it into `scripts/regression-guard.sh` plus `.github/workflows/auto-deploy.yml`. The guard verifies mobile Jobs shell/handlers, PC Jobs renderer/actions, Vision/Billing handoffs, backend Jobs routes, quick-note implementation, billing transition hooks, and API contract coverage. Current static result: **100/100**, **0 findings**.
- PC Jobs (`pwa/section_jobs.js`) now exposes a complete operator row/detail workflow: open/create job, detail modal, assign technician, quick note, timeline, status transition, Vision context handoff, and Billing modal/section handoff. The old undefined `_buildJobsTable()` reference was removed.
- Backend `addQuickNote(jobId, note, user)` is implemented in both root and `clasp-ready/JobStateMachine.gs`. It appends timestamped notes to `DBJOBS`, updates the row timestamp, writes `DB_JOB_LOGS`, and returns the updated job object.
- GAS source was pushed and production deployment updated to **@606** (`Sprint 76 Jobs E2E`). `pwa/gas_config.js` records the new deployment note/date while keeping the same production Web App URL.
- Verification on 2026-05-14: `pwa_static_guard`, `system_integrity_audit`, `pwa_functional_menu_audit`, Sprint 74, Sprint 75, Sprint 76, GAS source alignment, and full `regression-guard.sh` all passed.

### Phase 75 Jobs/Billing/Reports Focus + Smoke Cleanup Gate (2026-05-14)
- Added `scripts/sprint75_jobs_billing_reports_audit.js` for the next menu-by-menu hardening sprint. It focuses on the highest-value operator chain: Jobs, Billing, and Reports. Current static result: **100/100**, **0 P0**, **0 P1**, **0 P2** findings.
- Fixed PC Billing rendering in `pwa/dashboard_pc_core.js`: the PC shell now supports renderers that paint directly into the DOM instead of forcing `undefined` into the section container.
- Replaced legacy `pwa/section_billing.js` prototype content with a compatibility shim. The stale fake billing rows and unfinished/coming-soon handlers are no longer part of the production runtime path.
- Added `SmokeCleanup.gs` at root and `clasp-ready/SmokeCleanup.gs`. `cleanupSmokeTestRecords` archives matching rows into `DB_SMOKE_CLEANUP_ARCHIVE` before deletion and will only delete requested records that still contain smoke markers (`AUTO WRITE SMOKE`, `WSMOKE_`, `PWA_WRITE_SMOKE`, or `smoke-test`).
- `scripts/pwa_smoke_cleanup_plan.js` remains review-first by default. Execution requires `COMPHONE_SMOKE_CLEANUP=1` and `COMPHONE_SMOKE_CLEANUP_CONFIRM=REVIEWED_SMOKE_RECORDS`; the backend action additionally requires `DELETE_REVIEWED_SMOKE_RECORDS`.
- Production cleanup executed on 2026-05-14 after GAS @605: jobs `J0022`, `J0021` and customers `C0003`, `C0002` were archived to `DB_SMOKE_CLEANUP_ARCHIVE` and deleted. A follow-up scan reports **0 smoke cleanup candidates**.
- Added `scripts/set_gas_secret.js` to set allowed GAS Script Properties through the protected admin API using environment variables only. No real Gemini/LINE secret value is stored in the repo.
- Gemini restored on 2026-05-14 under Apps Script Property `GEMINI_API_KEY` using the protected admin API. Follow-up `vision_runtime_smoke.js` passed public health/version plus protected Vision stats, pipeline version, learning version, field context, action suggestions, and review queue.

### Phase 74 Core System Sprint Audit (2026-05-14)
- Added `scripts/sprint74_core_audit.js` as the repo-level Code Intelligence Layer for release health. It checks source-of-truth drift, backend auth/API contracts, PC/mobile runtime scripts, last-page/last-section restore, service-worker repair safety, functional menu/data reality, write-flow idempotency, destructive action confirmation, AI Vision/LINE Center readiness, obvious secret leakage, CI/CD script coverage, and recovery documentation.
- Current audit result: **100/100**, **0 P0**, **0 P1**, **0 P2** findings. Generated reports: `test_reports/sprint74_core_audit_latest.json`, `test_reports/sprint74_core_audit_latest.md`, and `SPRINT_74_CORE_AUDIT.md`.
- `scripts/regression-guard.sh` now runs Sprint 74 Core System Audit, and `.github/workflows/auto-deploy.yml` includes the new audit script in Node syntax checks. Guard checksum was updated in `scripts/.guard-checksums.md5`.
- Live protected API smoke was rerun with a short-lived admin session on 2026-05-14. Core protected menus passed: dashboard, CRM, inventory, purchase orders, reports, Vision stats/version, LINE Command Center/status, and admin security status.
- Smoke Cleanup Planner scanned production read APIs and still reports 4 review candidates from prior write-smoke activity: jobs `J0022`, `J0021` and customers `C0003`, `C0002`. Keep cleanup manual/review-first until the operator approves destructive cleanup mode.
- Remaining operator actions: restore the Gemini secret in Apps Script Properties for real Gemini Vision analysis, and keep all future Hermes/agent-assisted bulk edits gated by `node scripts/sprint74_core_audit.js` plus `bash scripts/regression-guard.sh`.

### Phase 73.2 Functional Menu QA + Data Reality Update (2026-05-13)
- Added `scripts/pwa_functional_menu_audit.js` to validate that required PC/mobile menus have real containers, renderers/loaders, API contracts, diagnostics surfaces, and no required production menu is left as a blank/coming-soon shell.
- Added `scripts/pwa_smoke_cleanup_plan.js`. Default mode is read-only and produces a review plan for smoke/test records. It found 4 production review candidates from the write-smoke harness: jobs `J0022`, `J0021` and customers `C0003`, `C0002`.
- PC `tax` now routes through the real `renderTaxSection()` implementation from `section_tax.js` instead of an inline minimal card.
- PC fallback text now says the module is not loaded and directs operators to Settings diagnostics, avoiding misleading "Coming soon" placeholders in production workflows.
- PC Settings now includes an Operations Diagnostics panel, diagnostics export JSON, and a safe PWA cache/service-worker repair button.
- Regression guard now runs the Functional Menu Audit and Smoke Cleanup Planner as part of the pre-deploy pack.

### Phase 73.1 Post-Recovery Hardening Update (2026-05-13)
- Live GitHub Pages now serves `v5.18.34-job-menu-hardening` and production GAS deployment `@604`.
- Mobile PWA login was verified with the production admin account and loads the operational dashboard after session creation.
- PC Dashboard was verified from the same production session and successfully calls `getDashboardBundle`.
- `pwa/pwa_install.js` now registers `sw.js` with the active cache/build version and repairs stale service worker registrations by unregistering old PWA workers and retrying once.
- `pwa/sw.js` now tolerates partial CDN/precache failures, deletes old caches during activation, avoids caching navigations as stale app shells, and falls back to `index.html` only when offline.
- `pwa/runtime_self_test.js` now treats missing Gemini key as a warning while keeping Vision stats/pipeline/learning endpoints as real failures. This prevents secret-readiness drift from blocking unrelated login/menu deployments.
- `.github/workflows/auto-deploy.yml` now triggers on PWA, guard script, root GAS, and `clasp-ready` source changes so CI cannot miss deploy-critical drift.
- `.github/workflows/drive-sync.yml` now skips safely when Google Drive repository secrets are missing, keeping app deployment green while clearly reporting the backup configuration gap.
- Remaining operator action: restore Gemini secret in Apps Script Properties using one supported key name (`GEMINI_API_KEY`, `GOOGLE_AI_API_KEY`, `GOOGLE_GEMINI_API_KEY`, or `GEMINI_KEY`) and configure Google Drive backup secrets if GitHub Actions Drive backup is required.

### Phase 73 System Recovery Update (2026-05-13)
- Restored repository tree from stable commit `db942bd` after the Phase 74 branch reduced the tracked system from 502 files to 65 files.
- Preserved the damaged state before recovery in stash `pre-recovery-phase74-damaged-state-20260513` and branch `codex/safety-before-recovery-20260513`.
- Restored CI workflows, guard scripts, PWA modules, AI Vision/LINE Center surfaces, runtime self-test, offline/PWA install modules, and full `clasp-ready` GAS source set.
- Re-deployed recovered GAS source to deployment `@604`.
- `pwa/gas_config.js` now uses Web App deployment URL `AKfycbwN_mbyHOJ4vXRNpHjuN8dUFbXjERwtgTbNROt5_ynakfYm6Xv4RrgvhPMvI53lIhPWBA`, not the invalid script-id URL.
- Backend `health` and `getVersion` now return JSON again. Protected API smoke passes dashboard, CRM, inventory, PO, reports, Vision read endpoints, LINE Center, and admin.
- Remaining recovery item: restore Gemini secret in Apps Script Properties under `GEMINI_API_KEY` or another supported alias (`GOOGLE_AI_API_KEY`, `GOOGLE_GEMINI_API_KEY`, `GEMINI_KEY`) to make real Gemini Vision analysis ready.

### Phase 66 Current Review (2026-05-07)
- Status score: **100/100 deploy-observability readiness**. CI now has explicit checks that distinguish missing files, stale checksums, source drift, missing secrets, and GitHub Pages CDN delay.
- Added `scripts/ci_readiness_check.js` to statically verify workflow script references, required guard files, `CLASPRC_JSON` coverage, and `clasp-ready/.clasp.json` availability without reading secret values.
- Added `scripts/gas_source_alignment.js` to compare deploy-root and `clasp-ready` GAS files. It blocks drift for current deploy-critical files (`Config.gs`, `RouterSplit.gs`, `LineCommandCenter.gs`) and reports historical drift in `Router.gs`, `Auth.gs`, and `VisionPipeline.gs` as warnings for a later cleanup phase.
- Added `scripts/pages_deploy_verify.js` to verify GitHub Pages is serving the committed PWA version, build timestamp, cache version, and production GAS URL. CDN delay is reported as `cdn_pending` instead of a false code failure.
- `auto-deploy.yml` now runs CI readiness, GAS alignment, and Pages freshness verification. `deploy-gas.yml` now runs CI readiness and GAS alignment after guard self-test.
- Browser Runtime Self-Test now checks LINE Command Center and GitHub Pages freshness from PC/Mobile Settings.
- `pwa_static_guard.js` now blocks releases if LINE Center or Pages freshness runtime checks are removed.

### Phase 65 Current Review (2026-05-07)
- Status score: **100/100 command-center readiness**. PC and Mobile now have a shared LINE Center surface for room configuration visibility, alert queue monitoring, acknowledgement tracking, analytics, and safe manual room messaging.
- Added `LineCommandCenter.gs` at both deploy root and `clasp-ready/` so the actual GAS deployment path and working source stay aligned.
- New backend actions: `getLineCommandCenter`, `getLineRoomStatus`, `acknowledgeLineAlert`, `bulkAcknowledgeLineAlerts`, `queueLineCommandAlert`, `previewLineRoomMessage`, and `sendLineRoomMessage`.
- `sendLineRoomMessage` is guarded by explicit confirmation `SEND_LINE_ROOM_MESSAGE`; preview is available before push, and no LINE group IDs or tokens are exposed to the frontend.
- `pwa/section_line_center.js` renders the shared PC/Mobile LINE Center panel and calls the API actions explicitly so code-index and menu-integrity tools can verify the workflow.
- `api_contract.js`, `app.js`, `dashboard_pc.html`, `dashboard_pc_core.js`, `index.html`, `pwa_asset_manifest.js`, `pwa_static_guard.js`, and `system_integrity_audit.js` now include LINE Center routing and release checks.
- Production deploy verified at GAS deployment `@560`: backend version `5.18.14-line-command-center`, protected live checks for LINE room status, command center payload, and dry-run message preview passed on 2026-05-07.

### Phase 64 Current Review (2026-05-07)
- Status score: **99/100 operator trust readiness**. Controlled execution now supports dry-run previews before final confirmation, so operators can see sheet writes and LINE rooms before committing.
- GAS `VisionPipeline.gs` exposes `previewVisionSuggestion()` and builds previews for timeline writes, human review, quick notes, job transitions, payment marking, and LINE notifications.
- Vision suggestions now carry `lineRooms` based on type/decision: QC -> TECHNICIAN, SLIP/payment -> ACCOUNTING, PRODUCT -> PROCUREMENT, high-risk failures -> EXECUTIVE.
- LINE dispatch uses resolved `LINE_GROUP_*` group IDs and direct push helpers with fallback logging, reducing ambiguity from duplicate notification wrappers.
- `pwa/section_vision.js` now displays preview details before executing destructive Vision suggestions.
- Production deploy verified at GAS deployment `@559`: backend version `5.18.13-vision-preview-line-router`, preview dry-run, LINE room routing/dedupe, protected API smoke, Vision Runtime smoke, Workflow smoke, and gated Vision E2E smoke passed on 2026-05-07.

### Phase 63 Current Review (2026-05-07)
- Status score: **99/100 controlled-automation readiness**. AI Vision suggestions can now be executed only through a server whitelist, explicit confirmation phrase, and audit logging.
- GAS `VisionPipeline.gs` exposes `executeVisionSuggestion()` for controlled actions such as timeline link, human review, add job note, technician alert, guarded job-done transition, and guarded payment received.
- The execution layer rebuilds current suggestions on the server and refuses arbitrary action names, so the frontend cannot invent a write action.
- `pwa/section_vision.js` runs destructive suggestions through `executeVisionSuggestion()` and keeps local/navigation suggestions client-side.
- `api_contract.js` and PWA bridge helpers now track `executeVisionSuggestion` as a destructive gated Vision action.
- Production deploy verified at GAS deployment `@553`: backend version `5.18.12-vision-controlled-execution`, protected API smoke, Vision Runtime smoke, Workflow smoke, gated Vision E2E smoke, and negative confirmation-gate test passed on 2026-05-07.

### Phase 62 Current Review (2026-05-07)
- Status score: **99/100 operator-assist readiness**. AI Vision now recommends next actions after analysis/review while keeping all write actions behind explicit user confirmation.
- GAS `VisionPipeline.gs` exposes `getVisionActionSuggestions()` to turn Vision decision, confidence, Job ID, and timeline context into safe next-action suggestions.
- `pwa/section_vision.js` now renders Suggested Next Actions on PC/Mobile and can run local navigation, context loading, copy result, review approval/rejection, and timeline linking through existing guarded handlers.
- `api_contract.js`, `app.js`, `app_actions.js`, and release guards now track `getVisionActionSuggestions` as a read-only Vision action.
- Production deploy verified at GAS deployment `@551`: backend version `5.18.11-vision-action-suggestions`, protected API smoke, Vision Runtime smoke with `getVisionActionSuggestions`, Workflow smoke, and gated Vision E2E smoke passed on 2026-05-07.

### Phase 61 Current Review (2026-05-07)
- Status score: **99/100 field-job workflow readiness**. AI Vision can now carry Job ID and expected slip amount context into analysis, read related job/timeline context, and link reviewed Vision results back to the job timeline.
- GAS `VisionPipeline.gs` now supports top-level image payload compatibility, preserves `job_id` in `VISION_LOG`, exposes `getVisionFieldContext()`, and provides `linkVisionToJobTimeline()` for controlled timeline writes.
- `submitHumanReview()` can attach approved/rejected Vision decisions to a job timeline when a Job ID is available, keeping AI output auditable instead of isolated.
- `RouterSplit.gs`, `api_contract.js`, `app.js`, `vision_runtime_smoke.js`, `vision_capability_audit.js`, and `pwa_static_guard.js` now know the field-link actions.
- `pwa/section_vision.js` now has Job ID/expected amount controls, a Job Link & Timeline panel, result-level Link Timeline action, and queue-level context loading for both PC and Mobile.
- Production deploy verified at GAS deployment `@549`: backend version `5.18.10-vision-field-link`, protected API smoke, Vision Runtime smoke with `getVisionFieldContext`, Workflow smoke, and gated Vision E2E smoke passed on 2026-05-07.

### Phase 60 Current Review (2026-05-07)
- Status score: **99/100 field-workflow readiness**. AI Vision now has user-facing result cards, a human review queue, and a gated E2E analysis smoke path.
- GAS `VisionPipeline.gs` now returns `visionLogId` after saving to `VISION_LOG` and exposes `getVisionReviewQueue()` for pending human-review work.
- `RouterSplit.gs` now routes `getVisionReviewQueue`; `Config.gs` backend version is `5.18.9-vision-review-queue`.
- `pwa/section_vision.js` now renders AI results as cards with decision, confidence, issues, extracted fields, approve/reject actions, and a live Human Review Queue panel.
- `submitHumanReview` is now reachable from the UI for both the latest analysis result and queued review items.
- Added `scripts/vision_e2e_smoke.js`. It is skip-safe by default and only runs image analysis when all three gates are set: `COMPHONE_AUTH_TOKEN`, `COMPHONE_VISION_E2E=1`, `COMPHONE_VISION_E2E_CONFIRM=RUN_VISION_ANALYSIS`.
- `scripts/vision_runtime_smoke.js` now also checks `getVisionReviewQueue` when a token is present.
- Static/capability guards now enforce review queue coverage and gated E2E smoke coverage.
- Production deploy verified at GAS deployment `@547`: public health/getVersion, protected API/menu smoke, Vision Runtime smoke, Workflow smoke, and gated Vision E2E smoke passed on 2026-05-07.

### Phase 59 Current Review (2026-05-07)
- Status score: **99/100 AI readiness visibility**. AI Vision now distinguishes between route availability and actual Gemini readiness, so users and release checks can see whether the Vision backend is configured for real AI work.
- `scripts/vision_runtime_smoke.js` now validates public `health.checks.config.gemini_ok` and records `gemini_ok`, `line_ok`, and missing config names in its JSON report without exposing secret values.
- `pwa/section_vision.js` now shows readiness badges for Gemini Vision and LINE in the AI Vision panel on PC and Mobile.
- `pwa/runtime_self_test.js` now checks Gemini readiness as part of the browser-side `ai-vision-runtime` test when a user session exists.
- `scripts/pwa_static_guard.js` now blocks releases if Vision readiness checks are removed from the UI/runtime smoke.
- Current production health check reports `gemini_ok=true`, `line_ok=true`, and no missing required config keys.

### Phase 58 Current Review (2026-05-07)
- Status score: **98/100 runtime-verification readiness**. AI Vision now has read-only terminal smoke and browser-side Runtime Self-Test coverage, so failures in Vision stats/version/learning endpoints are visible before field users rely on the panel.
- Added `scripts/vision_runtime_smoke.js`. It checks public GAS health/version and, when `COMPHONE_AUTH_TOKEN` is set, verifies protected `getVisionDashboardStats`, `getVisionPipelineVersion`, and `getVisionLearningVersion`.
- The smoke writes `test_reports/vision_runtime_smoke_latest.json` and is safe by default. Without a token it records a skip-safe protected row and still verifies public backend availability.
- `scripts/regression-guard.sh` now runs Vision runtime smoke after the structural Vision capability audit.
- `pwa/runtime_self_test.js` now includes `ai-vision-runtime`, allowing PC Settings and Mobile Profile Runtime Self-Test to verify AI Vision from the live browser session after login.
- `scripts/pwa_static_guard.js` now blocks removal of the Vision runtime smoke script or browser-side AI Vision runtime check.
- No destructive Vision image analysis is run by automated guards. Image analysis remains user-confirmed from the UI or explicitly enabled by a future test harness.

### Phase 57 Current Review (2026-05-07)
- Status score: **98/100 functional readiness**. AI Vision is no longer only backend-ready; PC and Mobile now expose an operations panel that users can open from navigation.
- Added `pwa/section_vision.js` as the shared Vision UI module for PC and Mobile.
- PC Dashboard now has an `AI Vision` sidebar item and `section-vision` content area. The panel can refresh Vision stats, check backend Vision versions, jump to billing/reports, and run a guarded image analysis pipeline after a user chooses a file and confirms.
- Mobile PWA now has `page-vision`, a More menu entry, and an optional quick action entry. It can refresh Vision stats, open camera/slip capture, and run the same guarded image analysis panel.
- `pwa/pwa_asset_manifest.js`, `pwa/index.html`, and `pwa/dashboard_pc.html` now load/precache `section_vision.js` so installed PWA clients can use the panel offline-first after update.
- `scripts/pwa_static_guard.js` now blocks releases where the Vision UI script is not loaded/pre-cached or does not call the Vision stats/pipeline actions.
- Destructive Vision analysis still requires explicit user confirmation in the UI. Real secrets remain outside the repository.

### Phase 56 Current Review (2026-05-07)
- Status score: **98/100 structural readiness**. AI Vision now has its own capability audit so the system can detect missing Vision routes, PWA call sites, backend handlers, and contract drift before users hit empty menus or broken image flows.
- Added `scripts/vision_capability_audit.js`. It writes `test_reports/vision_capability_latest.json` and `test_reports/vision_capability_latest.md`.
- `pwa/api_contract.js` now includes the `vision` menu and `vision_ai` workflow: dashboard stats, pipeline version, learning version, photo gallery reads, plus gated destructive actions for photo processing, upload, pipeline runs, QC, slip verification, and human review.
- `pwa/app.js` now classifies `getVisionDashboardStats`, `getVisionPipelineVersion`, and `getVisionLearningVersion` as read-only actions so temporary Vision read failures do not become offline write queue records.
- `scripts/pwa_static_guard.js` now blocks releases that remove AI Vision contract coverage, read-action classification, or the Vision audit script.
- `scripts/regression-guard.sh` now runs the Vision capability audit as part of the pre-deploy guard pack.
- Current Vision capabilities in code: job photo classification, Drive/photo queue processing, before/after collage data, QC pipeline, payment slip AI verification, Vision dashboard stats, human review/learning loop, AgentGateway Vision roles, geofence helper integration, and LINE notification helper integration.
- Secret policy remains unchanged: real `GEMINI_API_KEY`, `GOOGLE_AI_API_KEY`, LINE tokens, and session tokens must stay in GAS Script Properties/private vaults. BLUEPRINT records key names and integration surfaces only, not secret values.
- Runtime note: protected Vision API execution requires a real `COMPHONE_AUTH_TOKEN` in the current terminal process; without it the local audit still validates code/contract structure but does not call production protected Vision endpoints.

### Phase 55 Current Review (2026-05-07)
- Status score: **97/100**. The system now has a gated write-smoke harness so write workflows can be tested deliberately without accidental production writes during normal guard runs.
- Added `scripts/pwa_write_smoke.js`.
- Default mode is non-destructive dry-run. It writes `test_reports/pwa_write_smoke_latest.json` and exits OK without creating records.
- Destructive mode requires all three explicit inputs: `COMPHONE_AUTH_TOKEN`, `COMPHONE_WRITE_SMOKE=1`, and `COMPHONE_WRITE_SMOKE_CONFIRM=CREATE_TEST_RECORDS`.
- When enabled, it creates tagged smoke customer/job/billing records and immediately repeats each write with the same `client_request_id` to verify idempotent replay.
- All smoke records include `source=pwa_write_smoke`, `smoke_id`, and `AUTO TEST ONLY` notes for manual inspection/cleanup.
- `scripts/regression-guard.sh` now runs the write-smoke safety gate in dry-run mode.
- `scripts/pwa_static_guard.js` now blocks removal of write-smoke gating and idempotency checks.

### Phase 54 Current Review (2026-05-07)
- Status score: **97/100**. The next production risk after menu/API stability was duplicate writes from double taps, retry, or offline replay. This phase hardens those write paths.
- Mobile `openJob` and `createCustomer` now attach `client_request_id`, record `source`, block double submit, and refresh live data after success.
- PC/PWA billing creation now attaches `client_request_id`, blocks double submit, and sends normalized billing payload metadata.
- GAS `openJob`, `createCustomer`, and object-style `createBilling` now support idempotent replay through Script Cache for repeated `client_request_id` values.
- `createBilling(dataObject)` is normalized before calling `autoGenerateBillingForJob`, so PWA `createBilling` no longer risks passing `[object Object]` as the job id.
- IndexedDB offline queue now normalizes write records, auto-adds missing `client_request_id`, and replays through `callApi` instead of `callAPI` to avoid re-queuing a failed replay.
- `error_boundary.js` no longer overrides the IndexedDB offline queue when `offline_db.js` is already loaded.
- Static guard now blocks regressions in write idempotency, offline replay, and backend idempotent handlers.

### Phase 53 Current Review (2026-05-07)
- Status score: **96/100**. The foundation is now guarded at three levels: static/code relationship checks in scripts, protected API smoke from terminal, and a browser-side Runtime Self-Test available directly inside the app.
- Added `pwa/runtime_self_test.js` as the live browser health layer. It checks runtime config, auth/session state, public API health/version, menu contract, protected read smoke when a session token exists, service worker/cache state, and AI safety/telemetry signals.
- PC Dashboard Settings now embeds the Runtime Self-Test panel via `renderSettingsSection()` + `hydrateSettingsRuntimePanels()`.
- Mobile Profile now includes a `Runtime Self-Test` entry that opens a bottom-sheet modal, so field users can verify API/session/cache state without opening DevTools.
- `pwa/dashboard_pc.html` and `pwa/index.html` now load `runtime_self_test.js` with the central cache-bust version.
- `pwa/pwa_asset_manifest.js` now includes `runtime_self_test.js` for install/cache parity.
- `scripts/pwa_static_guard.js` now blocks releases where Mobile or PC forget to load the runtime self-test surface.
- Service worker cache bumped to `comphone-v5.18.18-write-smoke-20260507_1130` to force browsers off the previous integrity-audit bundle.

### Phase 51 Current Review (2026-05-07)
- Status score: **95/100**. Core runtime is usable, PC duplicate auth/navigation drift is removed, mobile menu pages now open without offline/runtime errors, quick action modals open correctly, route/API drift now has an automated index guard, and GAS `loginUser` -> `verifySession` token persistence is fixed at deployment `@545`.
- Mobile PWA now loads the central API client, API contract, auth guard, version config, service worker assets, and `mobile_glass.css`.
- Mobile login is generated by `pwa/auth.js`; it now uses the modern glass login shell and reads version/build from `version_config.js`.
- PC dashboard login was modernized and the production mock-login path was removed. PC login must use the real GAS `loginUser` action.
- PC dashboard runtime is consolidated in `pwa/dashboard_pc_core.js`; `pwa/dashboard_pc.html` must remain markup plus asset loading only.
- Mobile `ลูกค้าใหม่` quick action no longer depends on an unloaded external billing customer modal; `pwa/app_actions.js` now builds a local fallback form before calling `createCustomer`.
- `pwa/auth_guard.js` no longer contains redacted `***` role aliases, and static guard now blocks this regression.
- Auth storage is standardized on `localStorage['comphone_auth_session']` and user profile storage on `localStorage['comphone_user']`.
- Backend auth session storage is centralized in `clasp-ready/Auth.gs`; `loginUser`, `verifySession`, and `logoutUser` now share the same Script Properties / overflow-sheet session path.
- Mobile `billing`, `reports`, and `inventory` now have compatibility guards for modules that were originally written for the PC dashboard (`setActiveNav`, `main-content`, `topbar-title`, and inventory mount fallbacks).
- Mobile `openJob()` is restored as an alias to the actual `openNewJob()` quick action, so the "เปิดงาน" workflow opens its modal again.
- Mobile profile version badge now reads from `version_config.js` instead of the old hardcoded `v5.14.0-phase37` label.
- Mobile dashboard quick action now routes `stock` to the actual `inventory` page, removing a hidden dead route.
- Mobile More menu was expanded from the reduced 8-item shell into a grouped operational menu: daily work, CRM, inventory, PO, billing, attendance, warranty, portal, notifications, dashboard, reports, analytics, performance, revenue, tax, admin, and settings. Admin remains role-gated by `more-admin-btn`.
- Mobile `goPage()` no longer redirects real pages such as dashboard, analytics, performance, revenue, and tax away from their own page containers.
- Mobile now stores the last active page in `localStorage['comphone_last_mobile_page']`, restores it on next launch, handles browser Back by closing sheets/modals or returning to Home before leaving, and warns before accidental unload on active work pages/offline queue.
- PC dashboard now stores `localStorage['comphone_last_pc_section']`, restores the last active section after login/session restore, confirms logout, and uses a scroll-contained sidebar grouped by workflow: Main, Jobs/Inventory, Finance, Reports, System.
- `scripts/build_code_index.js` now builds a local SocratiCode-lite map of PWA assets, routes, functions, API calls, GAS functions, router actions, public actions, dependency impact, workflow coverage, orphan/deprecated script candidates, and route risks. Generated reports are `test_reports/code_index_latest.json` and `test_reports/code_index_summary_latest.md`; both must stay uncommitted.
- `scripts/system_integrity_audit.js` now builds the production relationship matrix for Mobile and PC menus: menu -> route/page/section -> renderer function -> loaded JS file -> API contract actions -> GAS handlers -> AI lock/telemetry. Generated reports are `test_reports/system_integrity_latest.json` and `test_reports/system_integrity_latest.md`; both must stay uncommitted.
- `scripts/regression-guard.sh` now runs the System Integrity Audit after the code index so broken menu/renderer/container relationships block release before deployment.
- PC CRM route alignment fixed: sidebar `loadSection('crm')` now matches `#section-crm` and `#crm-content` instead of the legacy `section-customers` id.
- Service worker cache was bumped to `comphone-v5.18.18-write-smoke-20260507_1030` to force browsers off stale assets.
- BLUEPRINT is the source of truth. Old Hermes/SocratiCode notes below are historical unless explicitly marked current here.

### Current Validation Evidence
| Check | Latest Result | Notes |
|---|---|---|
| `node --check pwa/auth.js` | PASS | Auth runtime parses after corrupted constants were restored. |
| `node scripts/pwa_static_guard.js` | PASS | Confirms cache/version alignment, API client loading, protected auth invariants, no production mock login. |
| `node scripts/build_code_index.js` | PASS | PWA JS=79, GAS=88, API actions=40, menu routes=20, workflows=5, risks none; emits JSON + Markdown intelligence reports. |
| `bash scripts/regression-guard.sh` | PASS | CI guard updated to current PC dashboard architecture and now includes code index validation. |
| Login + `verifySession` | PASS | Fresh `admin` login returns a token that verifies immediately on GAS `@545`. Token value is not stored in repo/docs. |
| `node scripts/pwa_api_smoke.js` | PASS protected | `health`, `getVersion`, `getDashboardData`, `listCustomers`, `inventoryOverview`, `listPurchaseOrders`, `getReportData`, and `getSecurityStatus` OK with fresh session token. |
| Local Mobile UI Audit | PASS | Login/session home, Jobs, CRM, Inventory, PO, Billing, Reports, Attendance, Warranty, Profile, `openJob` modal, and `addCustomer` modal open without offline/runtime errors. |
| Local PC UI Audit | PASS | Dashboard, Jobs, PO, Inventory, Billing, Warranty, Revenue, Tax, CRM, Attendance, Reports, Analytics, and Settings sections switch without runtime errors. |
| GitHub push | PASS | Latest review baseline reached `origin/main` via HTTPS after SSH key push failed. |

### 0-100 Health Review
| Area | Score | Status | Reason |
|---|---:|---|---|
| Runtime config/version/cache | 94 | Strong | Central PWA config and service worker cache are aligned at `v5.18.27-vision-preview-line-router`; auxiliary/archival pages still need cleanup. |
| Mobile PWA auth/login | 94 | Strong | Modern login, session restore, menu pages, billing/reports/inventory adapters, and quick-action modals pass local UI audit. |
| PC dashboard auth/login | 92 | Strong | Runtime is consolidated in `dashboard_pc_core.js`; core sections switch cleanly in local UI audit. |
| API contract/backend availability | 92 | Strong | Fresh login, verifySession, and required protected smoke pass against production GAS @545. |
| Menu/workflow confidence | 94 | Strong | Mobile More menu is restored to the full operational map, read-only menu APIs pass, PC/Mobile menu navigation passes local UI audit, open-job/customer modals open, and route drift is now checked by `build_code_index.js`; destructive writes still need staging validation. |
| Security posture | 88 | Good | Secrets are not stored in repo, public whitelist was hardened earlier, static guard protects key/auth drift, and session persistence no longer depends on unread overflow writes. |
| Documentation/source-of-truth hygiene | 70 | Needs cleanup | BLUEPRINT still has historical Phase 30-38 content, old version mentions, and external Hermes/SocratiCode claims that must be marked archival or moved out. |
| Overall | **95/100** | Stable | Base is stable enough to continue feature work; next phase should validate write workflows in staging and polish high-use screens. |

### Remaining Cleanup / Watchlist
| Priority | Item | Current Risk | Recommended Action |
|---|---|---|---|
| Done | Auth session persistence | `loginUser` returned a token that `verifySession` could not find when session writes overflowed away from Script Properties. | Fixed in `clasp-ready/Auth.gs`; deployed to GAS `@545`; protected smoke now passes. |
| Done | PC dashboard duplicate runtime logic | Resolved in `v5.18.7-authguard`. | Keep static guard enforcing one `_doLogin` and no inline core functions in `dashboard_pc.html`. |
| Done | Mobile menu/runtime recovery | Billing/Reports used PC-only `setActiveNav`, Inventory had no mobile loader, Profile showed stale version, and `openJob()` alias was missing. | Fixed in `v5.18.9-ui-menu`; local mobile UI audit passes. |
| Done | Route/API intelligence guard | Legacy `stock` quick action pointed to a missing mobile page and future drift had no fast detector. | Fixed in `v5.18.27-vision-preview-line-router`; run `node scripts/build_code_index.js` before release. |
| Done | Code Intelligence Layer v2 | Future agents needed a compact impact map instead of rereading the full repo. | Added dependency graph, workflow map, orphan classification, and Markdown summary output to `scripts/build_code_index.js`. |
| Done | System Integrity Audit Layer | Menu bugs could hide across route/page/renderer/API/container layers. | Added `scripts/system_integrity_audit.js`; regression guard now reports PC/Mobile menu matrix and AI workflow lock/telemetry status. |
| Done | Mobile menu map recovery | Operational pages existed but were hidden from the reduced More menu, and several pages were redirected away before loading. | Fixed in `v5.18.27-vision-preview-line-router`; full grouped menu restored and real pages can load directly. |
| Done | Navigation continuity | Mobile/PC did not reliably reopen the last working page and accidental Back/close/logout could interrupt work. | Fixed in `v5.18.27-vision-preview-line-router`; mobile and PC persist current page/section and add accidental-exit safeguards. |
| P1 | Destructive write-flow validation | Core gated write smoke now covers create customer, open job, safe job note/status, create billing, idempotent replay, read-back, and cleanup lifecycle. Payment/LINE/inventory transfer writes still require staging-only validation. | Run staging write smoke with `COMPHONE_WRITE_SMOKE=1` only against a safe dataset, then extend to payment/offline replay under explicit staging gates. |
| P1 | Auxiliary pages have old fallback versions | `executive_dashboard.html`, `monitoring_dashboard.html`, `system_graph.html`, some scripts still mention old versions. | Either align them to `version_config.js` or mark/archive them if unused. |
| P2 | BLUEPRINT historical sections are noisy | Old Hermes/SocratiCode claims and v5.9/v5.5 notes can mislead future agents. | Move old phases into an archive section and keep only current rules at the top. |
| Done | API contract version label says partial | `pwa/api_contract.js` now reports `2026-05-07.phase65-line-command-center` and is validated by API smoke/code index. | Keep contract changes tied to `scripts/pwa_api_smoke.js` and `scripts/build_code_index.js`. |
| P2 | Service worker/browser cache UX | Existing users may still hold old SW until refresh/update cycle finishes. | Add visible "update available/reload" prompt and a cache status indicator in Admin Health. |

### Tooling Reality Check
- **SocratiCode is not available in this Codex session.** Treat any SocratiCode/Hermes MCP instructions below as historical notes from another agent environment unless that tool is explicitly installed and callable.
- Current Codex verification uses local file analysis, PowerShell, Git, static guards, smoke scripts, and optional browser automation.

### Secret Handling Rule
- Do not store live secret/token/key values in this repository or in BLUEPRINT.md.
- BLUEPRINT.md records key names, storage locations, owners, and redacted/configured status only.
- Live secrets must stay in GAS Script Properties, GitHub Secrets, Cloudflare Secrets, or local environment variables.

---

## 1. System Identity

| รายการ | ข้อมูล |
|--------|--------|
| **ชื่อระบบ** | COMPHONE SUPER APP |
| **ประเภทธุรกิจ** | หจก.คอมโฟน แอนด์ อิเล็คโทรนิคส์ — จำหน่าย/ซ่อม IT, มือถือ, CCTV, จัดซื้อภาครัฐ |
| **ที่ตั้ง** | อำเภอโพนทอง จังหวัดร้อยเอ็ด |
| **สถาปัตยกรรม** | GAS Backend + PWA SPA Frontend + LINE Bot + Cloudflare Worker |
| **ปรัชญา** | Zero-Data Entry · Cross-Room Automation · Operational Intelligence |

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    COMPHONE SUPER APP v5.9.0-phase31                   │
│                                                                 │
│  ┌──────────────┐    ┌──────────────────┐    ┌──────────────┐  │
│  │  LINE Bot    │───►│ Cloudflare Worker│───►│  GAS @609    │  │
│  │  (Webhook)   │    │ (Async Proxy)    │    │  (Backend)   │  │
│  └──────────────┘    └──────────────────┘    └──────┬───────┘  │
│                                                      │          │
│  ┌──────────────┐                            ┌──────▼───────┐  │
│  │  PWA Mobile  │◄──────── GET API ─────────│ Google Sheets│  │
│  │  (Frontend)  │                            │  (13 Tables) │  │
│  └──────────────┘                            └──────────────┘  │
│                                                                 │
│  ┌──────────────┐                            ┌──────────────┐  │
│  │  PC Dashboard│◄──────── GET API ─────────│ Google Drive │  │
│  │  (Responsive)│                            │  (Files/PDF) │  │
│  └──────────────┘                            └──────────────┘  │
│                                                                 │
│  ┌──────────────┐                            ┌──────────────┐  │
│  │  Monitoring  │◄──────── Health ──────────│ GAS Exec Log │  │
│  │  Dashboard   │                            │  (Runtime)   │  │
│  └──────────────┘                            └──────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow
```
User (LINE) → POST /line/webhook
→ Cloudflare Worker (ตอบ 200 OK ทันที <50ms)
→ ctx.waitUntil(fetch(GAS_URL)) [async]
→ GAS ประมวลผล → ตอบกลับ LINE / บันทึก Sheet / แจ้งเตือน Group

User (PWA) → GET GAS_URL?action=xxx
→ GAS ประมวลผล → ส่ง JSON กลับ
→ PWA แสดงผล (SPA — ไม่ reload หน้า)
```

---

## 2.5 🔗 Dependency Checklist (Automated Dependency Mapping)
> **คำสั่ง Mentor:** Hermes ต้องตรวจสอบโมดูลที่เกี่ยวข้องทุกครั้งก่อน Commit งาน  
> **วัตถุประสงค์:** ป้องกันปัญหาฟีเจอร์ไม่สอดคล้องกัน (Version Mismatch)

### กฎการตรวจสอบ (Mandatory Check Before Commit)

| หากแก้ไขโมดูล... | ต้องตรวจสอบโมดูลเหล่านี้ด้วย... | เหตุผล |
|-------------------|----------------------------|---------|
| **Inventory** (สต็อก) | POS, หน้าเบิกอะไหล่, รายงานสต็อก, Dashboard | ระบบสต็อกเชื่อมโยงกับขาย-เบิก-รายงาน |
| **Job System** (งานซ่อม) | Workflow Engine, LINE Bot, Notification, Dashboard | เปลี่ยน state machine ต้องอัปเดตทุกจุด |
| **GAS API** (Backend) | PWA api_client.js, dashboard_pc.html, LINE Bot | API เปลี่ยนต้องอัปเดต frontend ที่เรียกใช้ |
| **PWA Version** (เวอร์ชัน) | index.html, dashboard_pc.html, section_settings.js, version_config.js, sw.js | เวอร์ชันต้องตรงกันทุกจุด (Single Source: version_config.js) |
| **Database Schema** | DatabaseIntegrity.gs, ทุกฟอร์มเพิ่มแก้ไขข้อมูล | Schema เปลี่ยนต้องอัปเดต validation และ UI |
| **LINE Bot** | AILinePrompts.gs, LineBot.gs, LineHandler.gs | เพิ่มบทบาทใหม่ต้องอัปเดต routing และ prompts |
| **Auth/Login** | auth_guard.js, Config.gs, GAS Script Properties | เปลี่ยนระบบล็อกอินต้องตรวจสอบทุกหน้าที่มี login gate |
| **Dashboard** | Dashboard_pc.html, executive_dashboard.html, monitoring_dashboard.html | เปลี่ยน KPI/Charts ต้องอัปเดตทุก dashboard |
| **Tax Engine** | TaxEngine.gs, TaxDocuments.gs, POS, Billing | เปลี่ยนสูตรภาษีต้องตรวจสอบทุกจุดคำนวณ |
| **Notification** | PushNotifications.gs, notification_center.js, LINE Bot | เปลี่ยนรูปแบบการแจ้งเตือนต้องอัปเดตทุกช่องทาง |

### แบบฟอร์มตรวจสอบ (Checklist Template)
```markdown
## Pre-Commit Validation (Copy to commit message)
- [ ] ตรวจสอบโมดูลที่เกี่ยวข้องตาม Dependency Checklist
- [ ] ทดสอบ Cross-Module (Backend ↔ Frontend)
- [ ] อัปเดตเวอร์ชันใน version_config.js (ถ้ามีการเปลี่ยนแปลง)
- [ ] เพิ่ม Cache Busting parameter (ถ้าแก้ไข JS/CSS)
- [ ] ทดสอบบน PWA Mobile (ผ่าน GitHub Pages)
- [ ] ทดสอบบน PC Dashboard
- [ ] Commit message ระบุเหตุผลและผลกระทบต่อโมดูลอื่น
```

### ระบบ Centralized Versioning (Single Source of Truth)
- **Source File:** `pwa/version_config.js`
- **ตัวแปรหลัก:** `APP_VERSION`, `CACHE_VERSION`, `BUILD_TIMESTAMP`
- **การใช้งาน:** ทุกไฟล์ที่ต้องการเวอร์ชัน ให้อ่านจาก `window.COMPHONE_VERSION`
- **ห้าม:** ระบุเวอร์ชันแบบ hardcode ในไฟล์อื่น (ยกเว้น sw.js ซึ่งอ่านจากตัวแปรเดียวกัน)

---

## 3. URLs & Endpoints

| รายการ | URL | สถานะ |
|--------|-----|-------|
| **GAS Web App (Production)** | `https://script.google.com/macros/s/AKfycbwN_mbyHOJ4vXRNpHjuN8dUFbXjERwtgTbNROt5_ynakfYm6Xv4RrgvhPMvI53lIhPWBA/exec` | Active @609 |
| **LINE Webhook** | `https://comphone-line-webhook.narinoutagit.workers.dev/line/webhook` | ✅ Active |
| **PWA Mobile App** | `https://comphone.github.io/comphone-superapp/pwa/` | ✅ Active |
| **PC Dashboard** | `https://comphone.github.io/comphone-superapp/pwa/dashboard_pc.html` | ✅ Active |
| **Executive Dashboard** | `https://comphone.github.io/comphone-superapp/pwa/executive_dashboard.html` | ✅ Active |
| **Monitoring Dashboard** | `https://comphone.github.io/comphone-superapp/pwa/monitoring_dashboard.html` | ✅ Active |
| **GitHub Repository** | `https://github.com/comphone/comphone-superapp` | Active / main baseline `1a8a1f3` (Phase 34 COMPLETE) |
| **Google Sheets DB** | `https://docs.google.com/spreadsheets/d/19fkLbSbBdz0EjAV8nE9LLwBiHeIN50BTPptt_PJCRGA` | ✅ Active |
| **Google Drive Root** | `https://drive.google.com/drive/folders/1YRZRG9r1Y_jMHg2XFFKYjK4Hx-sW0Eq0` | ✅ Active (used for Sync) |

### Important IDs
| รายการ | ค่า |
|--------|-----|
| **GAS Script ID** | `1-aoCd5gXoo1dX4FjW62l8JknR3ZPiaf1W7YEmEdtq8gnRzSp4Hwj6043` |
| **Spreadsheet ID** | `19fkLbSbBdz0EjAV8nE9LLwBiHeIN50BTPptt_PJCRGA` |
| **Cloudflare Account** | `838d6a5a046bfaa2a2003bd8005dd80b` |
| **GitHub Pages CNAME** | `comphone.github.io/comphone-superapp` |

---

## 4. Tech Stack

| Layer | เทคโนโลยี | รายละเอียด |
|-------|-----------|-----------|
| **Backend** | Google Apps Script (GAS) V8 | doGet()/doPost() → Router.gs → Modules |
| **Frontend** | PWA SPA — HTML5 + Bootstrap 5.3 + Bootstrap Icons | Section-based Navigation, Mobile-First |
| **Database** | Google Sheets | 13 tables (jobs, customers, stock, billing, etc.) |
| **Notification** | LINE Messaging API + LINE Notify | Multi-channel, role-based routing (5 groups) |
| **AI** | Gemini API (Flash) | Slip verification, Smart Assignment, Vision Analysis |
| **Storage** | Google Drive | รูปภาพงาน, PDF ใบเสร็จ, Backup |
| **Charts** | Chart.js 4.x | Dashboard KPI, Revenue charts |
| **Voice** | Web Speech API | Voice Search (th-TH) |
| **Proxy** | Cloudflare Worker | LINE Webhook async proxy |
| **Hosting** | GitHub Pages | PWA hosting (static) |
| **Deploy** | clasp + rclone + GitHub Actions | Auto-deploy pipeline |
| **Offline** | Service Worker + IndexedDB | Cache-first, offline queue |

---

## 2.5 🔍 SocratiCode — Code Intelligence Helper (Main Helper)

SocratiCode is integrated as the **primary code intelligence assistant** for COMPHONE SuperApp development:

- **Role:** Main helper for code search, dependency analysis, impact analysis, and context artifact management.
- **Integrated via:** MCP (Model Context Protocol) in Hermes Agent.
- **Capabilities:**
  - Semantic + keyword search across entire codebase (250 files, 1,710 chunks)
  - Code dependency graph (imports, dependents, circular detection)
  - Impact analysis (blast radius) before refactoring
  - Context artifacts search (API specs, database schemas, infra configs)
  - Auto-update via file watcher (incremental indexing)
- **Usage:** All code-related queries in development phase should prioritize SocratiCode tools (`mcp_socraticode_codebase_search`, etc.)
- **Status:** ✅ Fully operational (Qdrant + Ollama managed containers)

---

## 5. File Structure

```
comphone-superapp/
├── BLUEPRINT.md              ← ไฟล์นี้ (Single Source of Truth)
├── deploy_all.sh             ← Master deploy script (WSL)
├── clasp-ready/              ← GAS Backend source (deploy ผ่าน clasp)
│   ├── Router.gs             ← Main router (doGet/doPost)
│   ├── RouterSplit.gs         ← Fast O(1) route lookup (283 actions)
│   ├── Config.gs             ← Configuration & Script Properties
│   ├── Dashboard.gs          ← Dashboard data provider
│   ├── WorkflowEngine.gs     ← AI workflow engine
│   ├── LineBot.gs            ← LINE Bot message handler
│   ├── LineBotIntelligent.gs ← AI-powered LINE responses
│   ├── DriveSync.gs          ← Google Drive sync
│   ├── appsscript.json       ← clasp config
│   └── ... (69 .gs files total)
├── pwa/                      ← PWA Frontend (deploy to GitHub Pages)
│   ├── index.html            ← Mobile PWA (main entry)
│   ├── dashboard_pc.html     ← PC Dashboard
│   ├── executive_dashboard.html
│   ├── monitoring_dashboard.html
│   ├── app.js                ← Mobile app logic
│   ├── sw.js                 ← Service Worker (v5.9.0-phase31)
│   ├── gas_config.js         ← Auto-generated GAS URL
│   ├── ai_executor_runtime.js ← AI execution framework
│   ├── api_client.js         ← Unified API caller
│   ├── offline_db.js         ← IndexedDB offline queue
│   ├── style.css             ← Main stylesheet
│   ├── manifest.json         ← PWA manifest
│   └── ... (63 files total — 53 JS + 7 HTML + 3 CSS)
├── workers/line-webhook/     ← Cloudflare Worker source
├── docs/                     ← Documentation
├── memory/                   ← AI session context
└── .github/workflows/        ← GitHub Actions (auto-deploy)
```

---

## 6. Feature Status

### ✅ Working (Production)

| ฟีเจอร์ | ไฟล์ | สถานะ |
|---------|------|-------|
| **PC Dashboard** | `dashboard_pc.html` | ✅ KPI, Revenue, Jobs, Charts, Section Loaders |
| **Mobile PWA** | `index.html` + `app.js` | ✅ Login, Jobs, Search, Voice |
| **Executive Dashboard** | `executive_dashboard.html` | ✅ KPI Overview, Drill-down |
| **Monitoring Dashboard** | `monitoring_dashboard.html` | ✅ Health, Latency, Security Log |
| **Service Worker** | `sw.js` | ✅ Cache-first, Offline queue, 15s timeout |
| **AI Executor** | `ai_executor_runtime.js` | ✅ Sandboxed execution, Trust scoring |
| **Execution Lock** | `execution_lock.js` | ✅ Zero-bypass GAS calls |
| **Policy Engine** | `policy_engine.js` | ✅ Human override, Auto-freeze |
| **LINE Bot** | `LineBot.gs` + Worker | ✅ Webhook, Notifications, 5 groups |
| **Job State Machine** | `WorkflowEngine.gs` | ✅ 5-step workflow |
| **Auto Deploy** | `deploy_all.sh` | ✅ tar → rclone → clasp push |
| **Property Guard** | `Router.gs` | ✅ 49/50 properties (1 slot reserved) |

### ✅ Completed (Phase 27.1-28.1 + Phase 2E)

| ฟีเจอร์ | สถานะ | หมายเหตุ |
|---------|-------|---------|
| **Inventory UI** | ✅ Full CRUD | 4 KPI, search/filter, 3-layer stock, transfer, add/edit/delete, PO from low-stock |
| **Dashboard Performance** | ✅ Optimized | `getDashboardBundle` (single-pass + 90s cache), ~11s → ~1-2s |
| **Login (Static Hosting)** | ✅ Fixed | `execution_lock.js` fetch fallback + `Router.gs` doGet routeActionV55 |
| **Deploy Pipeline** | ✅ Hardened | Apps Script API fallback when clasp timeout, 60s timeout |
| **Jobs CRUD** | ✅ Full CRUD | 4 KPI, search, status filter, timeline modal, status transition (12 states) |
| **PO CRUD** | ✅ Full CRUD | Real PO data, 4 KPI, search, receive/cancel |
| **CRM** | ✅ Full CRUD | Real customer data, search, create/edit/view history, follow-up, overdue alerts |
| **Settings** | ✅ Complete | System health, user list, property guard, cache management, quick actions |
| **getProfitReport** | ✅ Optimized | O(N×M) → O(N+M), single DBJOBS read |
| **Login System** | ✅ Phase 28.0 | Login overlay + Session gate (8hr) + Logout, calls loginUser API |
| **Tax/VAT Calculator** | ✅ Phase 28.0 | Full-page VAT 7%/0%/Exempt + WHT 1%/3%/5%, sidebar menu |
| **Billing Section** | ✅ Phase 28.1 | billing_section.js (503 lines), CRUD, PromptPay QR, search/filter, CSV |
| **Attendance Section** | ✅ Phase 28.1 | attendance_section.js (16KB), clock in/out, report, tech history |
| **Warranty Section** | ✅ Phase 28.1 | warranty_section.js (583 lines), CRUD, due alerts, status mgmt |
| **Dashboard 11 Sections** | ✅ Phase 29 | Dashboard, Jobs, PO, Stock, Billing, Warranty, Revenue, Tax, CRM, Attendance, Settings, Photo Upload, Analytics, Customer Portal |
| **POS (Retail Sale)** | ✅ Phase 28.2 | pos.js (240 lines), openPOS modal, add/remove items, VAT 7%, callAPI('createRetailSale'), quickActions button (bi-cash-stack), Deployed to GitHub (01d6635), Synced to Google Drive (v5.9.0-phase31_20260426_1025) |
| **Error Telemetry** | ✅ Phase 2C | `ErrorTelemetry.gs` (667 lines), DB_ERRORS, trend analysis, severity classification |
| **Logger Visibility** | ✅ Phase 2E-1 | `_logInfo_()` structured logging, DB_LOGS sheet, 17 call sites instrumented |
| **Cron Observability** | ✅ Phase 2E-2 | All 8 cron jobs instrumented with `_logInfo_` entry + `_logError_` catch |
| **Architecture Stewardship** | ✅ Phase 2E | Daily complexity/drift/coupling tracking via `ArchitectureStewardship.gs` |

### ✅ Completed (Phase 29)

| ฟีเจอร์ | สถานะ | หมายเหตุ |
|---------|-------|---------|
| **Photo Upload B/A** | ✅ Phase 29 | `uploadPhoto_` API + Router + UI (drag-drop, preview, base64 upload) |
| **Analytics Section** | ✅ Phase 29 | `analytics_section.js` + dashboard routing + charts UI |
| **Customer Portal** | ✅ Phase 29 | `customer_portal_section.js` + portal UI + job status |
### ✅ Completed (Phase 30 - 28 เมษายน 2569)

| ฟีเจอร์ | สถานะ | หมายเหตุ |
|---------|-------|---------|
| **Token-based Auth** | ✅ Phase 30 | Router.gs รองรับ token จาก query parameter (แก้ปัญหา 401 Unauthorized) |
| **Smart Quotation** | ✅ Phase 30 | `smart_quotation.js` ใช้งานเกณฑ์ราคากลาง (คอมฯ 2568, CCTV 2564) |
| **Notification Loop Fix** | ✅ Phase 30 | แก้ไข toast ซ้อนกันใน `offline_db.js` (ใช้ ID `toast-network`) |
| **Server-side Auth** | ✅ Phase 30 | `auth.js` ตรวจสอบ token กับ GAS (`verifySession`) ก่อนข้ามหน้า Login |
| **Version Update** | ✅ Phase 30 | อัปเดตเวอร์ชันเป็น v5.9.0-phase31 ทุกไฟล์ (analytics.js, sw.js, auth_guard.js) |
| **GAS Deploy @506** | OK Phase 30 | Current production deploy for API contract + smoke/workflow stability baseline |
| **POS Barcode Search** | ✅ Phase 30 | เพิ่มการค้นหาด้วยบาร์โค้ดใน `pos.js` (API: `barcodeLookup`) |
| **POS Profit Margin** | ✅ Phase 30 | แสดงส่วนต่างกำไรในหน้า POS (≥30% เขียว, ≥15% เหลือง, <15% แดง) |
| **Dashboard Retail Sales** | ✅ Phase 30 | เพิ่ม `DBRETAILSALES` ใน DashboardBundle + ฟังก์ชัน `_bundleBuildRetailSales_()` |
| **POS Page Navigation** | ✅ Phase 30 | เพิ่ม `if (page === 'pos')` ใน `goPage()` (เปิดแท็บใหม่) |
| **Version Sync** | ✅ Phase 30 | ตรวจสอบ v5.9.0-phase31 ตรงกันทุกจุด (PWA + GAS) |
| **Menu Beautification** | ✅ Phase 30 | ปรับปรุงธีมเมนู PC (dashboard_pc.html) + Mobile (style.css) ให้สวยงาม ไม่มี bug |
| **Customer Portal V2** | ✅ Phase 30 | เพิ่ม viewCustomerJobs + downloadCustomerReceipts + showJobDetail + showTimeline ใน crm_attendance.js |
| **Dashboard Enhancement** | ✅ Phase 30 | เพิ่ม Retail Sales Widget + Quick Actions + Technician Performance (getTechPerformance) + Responsive KPI Grid |
| **Stock Module** | ✅ Phase 30 | สร้าง stock.js ใหม่ (Full CRUD + Transfer + Movement + Low Stock Alerts + Role-based Access) |
| **PDF Export (PO)** | ✅ Phase 30 | เพิ่ม exportPOToPDF() ใน purchase_order.js ใช้ jsPDF + jsPDF-autoTable |
| **jsPDF Integration** | ✅ Phase 30 | เพิ่ม CDN jsPDF 2.5.2 + jsPDF-autoTable 3.8.2 ใน index.html |
| **AI LINE Agent (Phase2D)** | ✅ Phase 30 | สร้าง AI Agent 3 บทบาท (Dispatcher, Sales Analyst, BI) ใช้ Gemini Pro + Group ID routing + Dispatcher summarize jobs + notify technicians |

### ✅ Completed (Phase 32 - 1 พฤษภาคม 2569)

| ฟีเจอร์ | สถานะ | หมายเหตุ |
|---------|-------|---------|
| **Attendance Monthly/Yearly Summary API** | ✅ Phase 32 | เพิ่ม `getAttendanceMonthlySummary()` ใน Attendance.gs (group_by: month/year) |
| **Attendance UI Enhancement** | ✅ Phase 32 | เพิ่มรายงานสรุปรายเดือน/รายปี + PDF Export ใน attendance_section.js |
| **Report Module UI** | ✅ Phase 32 | สร้าง `reports.js` ใหม่ (Phase 32) - 4 ประเภทรายงาน: Attendance, Jobs, Billing, Inventory |
| **Report PDF Export** | ✅ Phase 32 | รองรับ Export PDF ทุกประเภทรายงาน (ใช้ jsPDF) |
| **Automated Unit Testing Framework** | ✅ Phase 32 | สร้าง `api_test_framework.js` - ทดสอบ API อัตโนมัติ |

### 🔮 Phase 33: Anomaly Detection & Predictive Analytics (✅ COMPLETE)

**Target Date:** 2026-05-01  
**Status:** 🟢 PRODUCTION-STABLE — 6/6 features COMPLETED (v5.11.0-phase33 @517)

#### 33.1 Anomaly Detection (Telemetry → Alerts)
- **Baseline Period:** 14 วัน completed (Phase 2E telemetry)
- **Detectors:**
  - σ-Deviation Alerts (DB_JOBS, DB_INVENTORY) ✅
  - API Response Time Anomaly (latency >2σ) ✅
  - Off-hours API Calls (06:00-22:00 threshold) ✅
  - Inventory Stock-out Prediction (reorder point triggers) ✅
- **Action:** เมื่อ anomaly ตรวจพบ → LINE Notify + Executive Dashboard ✅

#### 33.2 Predictive Analytics Module
- **Sales Forecasting:** ✅ COMPLETED
  - วิเคราะห์ยอดขายย้อนหลัง 90 วัน
  - พยากรณ์ยอดขาย 30 วันล่วงหน้า (Linear Regression / Moving Average)
  - Trending Alert สำหรับร้าน IT (อุปกรณ์ขาดตลาด)
- **Inventory Optimization:** ✅ COMPLETED
  - สร้าง Recommended PO (Purchase Order) จาก historical velocity
  - สร้าง Stock Aging Report (FIFO/LIFO analysis)
- **Customer Demand Prediction:** ✅ COMPLETED
  - พยากรณ์ความต้องการลูกค้า (อ้างอิงจาก Jobs history)
  - Suggest Upsell/Cross-sell opportunities

#### 33.3 Advanced AI Features
- **Service Prediction (AI):** ✅ COMPLETED
  - พยากรณ์อุปกรณ์ที่จะเสีย (จาก warranty + repair history)
  - Suggest Preventive Maintenance Schedule
- **Smart Product/Service Recommendation:** ✅ COMPLETED
  - วิเคราะห์ลูกค้าและแนะนำสินค้า/บริการที่เหมาะสม (AI-driven)
  - Integration กับ LINE Bot (push recommendation ไปยังลูกค้า)

#### 33.4 Implementation Backlog
| ฟีเจอร์ | GAS Action | Priority | Status |
|---------|-----------|----------|--------|
| Anomaly Detection Baseline | `getAnomalyBaseline()` | 🔴 HIGH | ✅ COMPLETED (14-day telemetry) |
| Predictive Sales API | `getSalesForecast(days)` | 🔴 HIGH | ✅ COMPLETED (Linear/Moving Avg) |
| Inventory Optimization | `getInventoryRecommendation()` | 🟠 MEDIUM | ✅ COMPLETED (Velocity + PO calc) |
| Customer Demand AI | `predictCustomerDemand(customerId)` | 🟡 LOW | ✅ COMPLETED (Trend + Forecast) |
| Service Prediction | `predictServiceLife(deviceId)` | 🟡 LOW | ✅ COMPLETED (Warranty + History) |
| Smart Recommendation | `getSmartRecommendation(customerId)` | 🟡 LOW | ✅ COMPLETED (AI-driven suggestions) |

---

### 🤖 Phase 34: AI-Driven Customer Engagement & System Optimization (✅ COMPLETE)

**Target Date:** 2026-05-01 (Completed early)  
**Status:** ✅ COMPLETE — 7/7 features finished (v5.12.0-phase34)  
**Version:** v5.12.0-phase34 (Production)

#### 34.1 AI Chatbot V2 (Advanced LINE Bot)
- **Context-Aware Conversations:** 
  - จำประวัติการสนทนา (Session-based memory)
  - เข้าใจบริบทงานซ่อม/ขายจากประโยคธรรมชาติ
- **Smart Intent Recognition:**
  - แยกแยะระหว่าง "แจ้งปัญหา", "เช็คสถานะ", "ขอราคา"
  - Suggest action อัตโนมัติ (สร้างใบงาน, เช็คstock, ส่งใบเสนอราคา)
- **Rich Menu V2:**
  - Dynamic menu ตาม role ของลูกค้า (VIP, Corporate, Walk-in)
  - Quick reply buttons สำหรับงานที่ทำบ่อย

#### 34.2 Performance Monitoring Dashboard (Real-time)
- **Live Metrics Collection:**
  - GAS Execution time, Error rate, API latency
  - PWA Load time, Cache hit rate, Offline queue length
- **Real-time Visualization:**
  - WebSocket/SSE สำหรับ push metrics ไป Dashboard
  - Alert เมื่อเกิน threshold (เช่น Error rate >5%)
- **Historical Analysis:**
  - Trend analysis รายชั่วโมง/รายวัน/รายเดือน
  - Compare performance ระหว่าง version ต่างๆ

#### 34.3 Automated Backup & Recovery System
- **Incremental Backup:**
  - Backup ข้อมูลสำคัญทุก 6 ชั่วโมง (Jobs, Billing, Inventory)
  - Store ใน Google Drive + Local (redundancy)
- **One-Click Recovery:**
  - Restore จาก backup ได้ด้วยคลิกเดียว
  - Preview ของ backup ก่อน restore
- **Backup Health Check:**
  - ตรวจสอบ integrity ของ backup ทุกวัน
  - แจ้งเตือนเมื่อ backup ล้มเหลว

#### 34.4 Security Audit & Hardening
- **Penetration Testing Simulation:**
  - ทดสอบ SQL Injection, XSS, CSRF ใน GAS backend
  - ตรวจสอบ JWT/Session token security
- **Vulnerability Scanning:**
  - Scan dependencies (npm packages, GAS libraries)
  - Check for outdated/compromised components
- **Security Headers & CORS:**
  - เพิ่ม Security headers (CSP, X-Frame-Options, etc.)
  - Harden CORS policy สำหรับ GAS API

#### 34.5 Multi-language Support (EN/TH)
- **Language Toggle:**
  - สวิตช์ภาษา EN/TH ได้จาก Settings
  - จดจำ preference ใน localStorage
- **Dynamic Translation:**
  - JSON-based translation files (en.json, th.json)
  - Runtime language switching (ไม่ต้อง reload หน้า)
- **Localized Number/Date/Currency:**
  - รูปแบบตัวเลข/วันที่/สกุลเงินตาม locale
  - สนับสนุน Thai Baht (฿) และ USD ($)

#### 34.6 Implementation Backlog
| ฟีเจอร์ | GAS Action / Module | Priority | Status |
|---------|---------------------|----------|--------|
| AI Chatbot V2 Context Memory | `LineBotV3.gs` | 🔴 HIGH | ✅ COMPLETED (Context-Aware) |
| Intent Recognition Engine | `LineBotV3.gs` | 🔴 HIGH | ✅ COMPLETED (Smart Intent) |
| Performance Metrics API | `PerformanceMonitor.gs` | 🟠 MEDIUM | ✅ COMPLETED (Backend) |
| Automated Backup Engine | `AutoBackupV2.gs` | 🟠 MEDIUM | ✅ COMPLETED (Backend) |
| Security Audit Tools | `SecurityAudit.gs` | 🟡 LOW | ✅ COMPLETED (Backend) |
| Multi-language Support (Backend) | `LanguageManager.gs` | 🟢 LOW | ✅ COMPLETED (Backend) |
| Real-time Dashboard UI | `performance_dashboard.js` | 🟠 MEDIUM | ⏳ Pending (Frontend) |
| Recovery UI + Preview | `backup_restore.html` | 🟡 LOW | ⏳ Pending (Frontend) |
| Penetration Test Scripts | `scripts/pen_test.js` | 🟡 LOW | ⏳ Pending |
| Language Toggle UI | `language_toggle.js` | 🟢 LOW | ⏳ Pending (Frontend) |
| Translation Files | `i18n/en.json`, `i18n/th.json` | 🟢 LOW | ⏳ Pending (Frontend) |

---

### 🔧 Partially Done (Backend Ready, Frontend Needed)

*No items — all Phase 29 features completed.*

### 🔮 Phase 35: Advanced Integration & Mobile Enhancement (✅ COMPLETE)

**Target Date:** 2026-05-01  
**Status:** Historical complete milestone; superseded by current v5.18.34 / GAS @609 baseline  
**Version:** Historical v5.13.0-phase35; current production snapshot is listed at the top of this BLUEPRINT.

#### 35.1 Accounting Software Integration (✅ COMPLETED)
- **API Endpoint:** `exportBillToAccounting` (ส่งข้อมูลบิลไปยังซอฟต์แวร์บัญชี)
- **Module:** `AccountingIntegration.gs` (สร้างแล้ว)
- **UI:** เพิ่มส่วนตั้งค่าในหน้า Settings (PC Dashboard)
- **Features:** เชื่อมต่อกับ Express/QuickBooks (จำลอง), ทดสอบการเชื่อมต่อ, ส่งบิลอัตโนมัติ

#### 35.2 Mobile Offline Mode V2 (✅ COMPLETED)
- **Module:** `offline_db_v2.js` (Enhanced offline capabilities)
- **Features:**
  - สร้างงาน offline ได้ (`createOfflineJob()`)
  - ดูรายการงาน offline (`getOfflineJobs()`)
  - Cache ลูกค้าและสต็อก (`cacheCustomerV2()`, `cacheInventoryItemV2()`)
  - Sync อัตโนมัติเมื่อออนไลน์พร้อม conflict resolution
  - Sync log และสถิติ (`getOfflineStatsV2()`)
- **UI:** หน้า Offline Jobs ใน `index.html` + Modal สร้างงาน offline

#### 35.3 Advanced Reporting System (✅ COMPLETED)
- **Module:** `advanced_reports.js` (Phase 35.3 Enhanced Reporting)
- **Features:**
  - Chart Visualizations (Bar, Line, Pie, Doughnut) ใช้ Chart.js
  - Scheduled Reports (บันทึกการตั้งค่า + รันตามเวลา)
  - Enhanced PDF Export (ภาพกราฟ + ข้อมูลสรุป)
  - Excel/CSV Export
  - Summary Cards (KPIs สำคัญ)
- **UI:** ศูนย์รวมรายงานขั้นสูงใน `index.html`

#### 35.4 Push Notification V2 (✅ COMPLETED)
- **Module:** `push_notifications_v2.js` (Enhanced Push Notifications)
- **Features:**
  - Location-based Notifications (Geolocation API)
  - Customer History-based Notifications (trackCustomerInteraction)
  - Smart Targeting (segment-based sending)
  - Notification Scheduling (one-time + recurring)
  - Quiet Hours support (ปิดเสียงตามเวลา)
  - Max notifications per day limit
- **UI:** ตั้งค่า Push V2 ใน Settings (`showPushV2Settings()`)

#### 35.5 Mobile Performance Optimization (✅ COMPLETED)
- **Service Worker V2:** Stale-While-Revalidate strategy ใน `sw.js`
- **Resource Hints:** preconnect + dns-prefetch ใน `index.html`
- **Cache Optimization:** ปรับปรุง Cache Version + ล้าง cache เก่า
- **Performance Gains:** 
  - เวลาโหลดหน้าเร็วขึ้น (serve from cache immediately)
  - Network requests ลดลง (dns-prefetch)
  - Background cache update (ไม่รอน user)

#### 35.6 Implementation Backlog
| ฟีเจอร์ | GAS Action / Module | Priority | Status |
|---------|---------------------|----------|--------|
| Accounting Integration | `exportBillToAccounting` (AccountingIntegration.gs) | 🔴 HIGH | ✅ COMPLETED |
| Mobile Offline Mode | `offline_db_v2.js` | 🔴 HIGH | ✅ COMPLETED |
| Advanced Reporting | `advanced_reports.js` | 🟠 MEDIUM | ✅ COMPLETED |
| Push Notification V2 | `push_notifications_v2.js` | 🟠 MEDIUM | ✅ COMPLETED |
| Mobile Performance | `sw.js`, `index.html` optimization | 🟡 LOW | ✅ COMPLETED |

---

### 🔮 Phase 36: System Hardening & UX Polish (✅ COMPLETE)

**Target Date:** 2026-05-02  
**Status:** ✅ COMPLETE — 4/4 features finished (v5.13.0-phase36)  
**Version:** v5.13.0-phase36 (Production)

#### 36.1 API Contract Cross-Check (✅ COMPLETED)
- **Objective:** Reduce frontend/backend drift
- **Actions Added to ALLOWED_FUNCTIONS Whitelist:**
  - Read-only: `getAfterSalesDue`, `getAttendanceReport`, `getCustomerHistory`, `getCustomerReceipts`, `getJobDetail`, `getRetailSales`, `getTechHistory`, `listCustomers`, `listPurchaseOrders`, `logAfterSalesFollowUp`, `receivePurchaseOrder`
  - Write: `createPurchaseOrder`, `deletePurchaseOrder`, `updateAfterSales`
- **Backend Function Created:** `getCustomerReceipts()` in `BillingCore.gs` (returns customer billing records)
- **Result:** Frontend actions now align with backend whitelist — no more 403 errors for valid actions

#### 36.2 Duplicate Module Reduction (✅ COMPLETED)
- **Inventory Modules:**
  - Removed: `inventory.js` (old v5.5, 20KB)
  - Kept: `section_inventory.js` (new v5.13, 40KB)
  - Updated: `index.html` and `pwa_asset_manifest.js` references
- **Billing Modules:**
  - Removed: `billing_ui.js` (old v5.5, 26KB)
  - Kept: `billing_section.js` (new v5.13, 26KB)
  - Added: `billing_section.js` to `index.html` and `pwa_asset_manifest.js`
- **Result:** Cleaner codebase, no more duplicate logic, reduced bundle size

#### 36.3 Browser Smoke Test (✅ COMPLETED)
- **PC Dashboard Test:**
  - URL: `https://comphone.github.io/comphone-superapp/pwa/dashboard_pc.html`
  - Login: admin/admin1234
  - Result: Page stayed on login form (no error messages)
  - Issue: Possible session/cache problem — needs re-test after cache clear
- **Mobile PWA Test:**
  - URL: `https://comphone.github.io/comphone-superapp/pwa/`
  - Login: admin/admin1234
  - Result: Page stayed on login form (no error messages)
  - Issue: Same session/cache problem — both platforms affected
- **Console Warnings:** Version mismatch warning (expected after recent updates)
- **Recorded:** Issues logged for next phase investigation

#### 36.4 User Experience Polish (✅ COMPLETED)
- **Loading States Verified:**
  - Spinners present: `spinner-border` in `admin.js`, `loading-spinner-sm` in `admin_panel.js`
  - Flags present: `isLoading` in `analytics.js`, `ANALYTICS_STATE.loading` in `analytics_section.js`
  - Pattern: Consistent loading state management across modules
- **Error Feedback Verified:**
  - Toast notifications: `showToast()` used extensively in `admin.js` (success/error/warning)
  - Alert fallbacks: `alert alert-danger` in `admin.js` for critical errors
  - Pattern: User-friendly error messages with emoji indicators (✅/❌/⚠️)
- **Mobile Responsive Verified:**
  - CSS: `mobile_shared.css` present with touch-optimized patterns
  - Tokens: `--cp-mobile-bg` in `style.css`
  - Media queries: `@media (max-width: 420px)` in `style.css`
  - Features: Bottom sheets, search bars, empty states all mobile-optimized
- **Result:** UX patterns are consistent and production-ready

#### 36.5 Implementation Backlog
| ฟีเจอร์ | Module | Priority | Status |
|---------|--------|----------|--------|
| API Contract Fix | `Router.gs` + `BillingCore.gs` | 🔴 HIGH | ✅ COMPLETED |
| Duplicate Removal | `index.html` + `pwa_asset_manifest.js` | 🔴 HIGH | ✅ COMPLETED |
| Browser Smoke Test | PC + Mobile PWA | 🟠 MEDIUM | ✅ COMPLETED |
| UX Verification | All JS/CSS modules | 🟡 LOW | ✅ COMPLETED |
| Login Issue Investigation | Next Phase | 🔴 HIGH | ⏳ Pending |

---

### 📋 Planned (Roadmap)

| Phase | ฟีเจอร์ | GAS Action | Priority |
|-------|---------|-----------|----------|
| **Phase 1** | Open Job Form | `openJob` | 🔴 สูง |
| **Phase 1** | Assign Technician | `updateJobStatus` | 🔴 สูง |
| **Phase 1** | Job Timeline View | `getJobTimeline` | 🔴 สูง |
| **Phase 2** | Billing / Receipt | `createBilling` | ✅ Done (Phase 28.1) |
| **Phase 2** | PromptPay QR | `generatePromptPayQR` | ✅ Done (Phase 28.1) |
| **Phase 2** | Slip Verification (AI) | `VisionAnalysis.gs` | 🟠 กลาง |
| **Phase 3** | Customer Portal | `getCustomer` | 🟡 ต่ำ |
| **Phase 3** | Photo Upload B/A | `PhotoQueue.gs` | 🟡 ต่ำ |
| **Phase 3** | Barcode Scanner | `barcodeLookup` | 🟡 ต่ำ |
| **Phase 4** | Predictive Maintenance | AI Analysis | 🟢 ระยะยาว |
| **Phase 4** | Route Optimization | `GpsPipeline.gs` | 🟢 ระยะยาว |

---

## 7. Security Invariants (Frozen)

### 7.1 Auth & Access Control
- **PIN-based Login** — Fast authentication for mobile
- **Role-based UI** — OWNER / ADMIN / TECH / VIEWER
- **Session Token** — Server-side validation via `verifySession()`
- **17 Protected Actions** — Require auth token (billing, AI, backup, etc.)

### 7.2 Execution Security
- **Zero-Bypass GAS** — All API calls through `AI_EXECUTOR` + `GAS_EXECUTE`
- **Execution Lock** — `execution_lock.js` forbids direct GAS calls
- **One-time Approval Tokens** — 3000ms TTL, consumed on use
- **Rate Limiter v2** — 60 req/min per identity (CacheService hash)
- **LINE Signature Verification** — Hard-fail for invalid webhooks

### 7.3 Architecture Freeze (PHMP v1)
- **No architecture changes** without impact audit
- **Security invariants are immutable** — no bypass, no disable
- **Hotfixes** must branch from freeze tag, include regression tests
- **All new features** must pass staging validation

---

## 8. Deploy Pipeline

### 8.1 Deploy Script (`deploy_all.sh`)

```bash
# 1. Reconstruct ~/.clasprc.json from CLASP_TOKEN env var
# 2. Push GAS code: clasp push --force
# 3. Deploy new version: clasp deploy → capture URL
# 4. Update gas_config.js with new URL
# 5. Push to GitHub: git push origin main
# 6. Sync to Google Drive (OAuth2, no Service Account)
```

### 8.2 Environment Variables (Required)

| Variable | 用途 |
|----------|------|
| `CLASP_TOKEN` | สร้าง `~/.clasprc.json` สำหรับ clasp push |
| `GOOGLE_CLIENT_ID` | OAuth2 สำหรับ Drive sync |
| `GOOGLE_CLIENT_SECRET` | OAuth2 สำหรับ Drive sync |
| `GOOGLE_REFRESH_TOKEN` | OAuth2 สำหรับ Drive sync |

### 8.3 GitHub Pages Auto-Deploy
- **Trigger:** Push to `main` branch (paths: `pwa/**`, `memory/session.md`)
- **Action:** `auto-deploy.yml` builds and deploys to GitHub Pages
- **Result:** Files served from repo root — PWA accessible at `https://comphone.github.io/comphone-superapp/pwa/`
- **Important:** GitHub Pages serves from repo root. PWA is at `/comphone-superapp/pwa/` (NOT `/comphone-superapp/`). All paths in code MUST include `/pwa/`.


## 8.4 Validation Commands (Current Mandatory Checks)

```powershell
# Static frontend/backend contract guard
node scripts\pwa_static_guard.js

# Critical PC/mobile menu journey guard
node scripts\pwa_menu_journey_audit.js

# UI write and surface contract guards
node scripts\pwa_ui_write_contract.js
node scripts\pwa_ui_surface_audit.js

# Code intelligence / route drift guard
node scripts\build_code_index.js

# Public + required protected API smoke
$env:COMPHONE_AUTH_TOKEN='YOUR_SESSION_TOKEN'
node scripts\pwa_api_smoke.js

# Optional API smoke
$env:COMPHONE_SMOKE_OPTIONAL='1'
$env:COMPHONE_AUTH_TOKEN='YOUR_SESSION_TOKEN'
node scripts\pwa_api_smoke.js

# Read-only business workflow smoke
$env:COMPHONE_AUTH_TOKEN='YOUR_SESSION_TOKEN'
node scripts\pwa_workflow_smoke.js
```

Latest local reports are generated under `test_reports/*_latest.json` and are intentionally ignored by Git.

---

## 9. Configuration Rules

### 9.1 GAS Script Properties (49/50)
- Max 50 properties per script
- Property Guard monitors usage
- High-frequency data → dedicated Spreadsheet (not Script Properties)
- **RULE:** Never exceed 50 — system will reject writes

### 9.2 Service Worker
| **Version:** `CACHE_VERSION = 'comphone-v5.18.34-job-menu-hardening-20260513_2005'`
- **Timeout:** 15 seconds for API/network fallback
- **Strategies:** Cache First (static) | Network First (API) | Network Only (webhook)
- **Offline Queue:** IndexedDB `comphone_offline` v2 (action_queue, data_cache, queue)
- **Activation Rule:** SW sends `SW_ACTIVATED`; it must not force navigate/reload clients during activate.
- **Update Rule:** reload is gated by explicit user update acceptance through `pwa_install.js`.

### 9.3 Version Synchronization
All these MUST match on deploy:

| Surface | File | Key |
|---------|------|-----|
| SW Cache | `sw.js` | `CACHE_VERSION = 'comphone-v5.18.34-job-menu-hardening-20260513_2005'` |
| PWA Version | `version_config.js` | `APP_VERSION = 'v5.13.0-phase36'` |
| Build Timestamp | `version_config.js` | `BUILD_TIMESTAMP = '20260502_1430'` |
| GAS Version | `version_config.js` | `GAS_VERSION = 'v5.13.0-phase36'` |
| GAS Config | `gas_config.js` | Production deploy URL @506 |
| API Contract | `api_contract.js` | `2026-05-02.phase36-complete` |

---

## 10. Known Issues & Resolutions

### ✅ Recently Fixed (2026-04-23)

### 🔴 Audit Summary (2026-05-02 Workspace Check)

**Overall Score: 90/100** ✅ NEARLY PRODUCTION-READY

| Module | Score | Notes |
|--------|-------|-------|
| GAS backend health/config | 95% | Healthy, version correct, API contract fixed |
| Mobile shell/navigation | 90% | Line-number bug fixed, duplicates removed |
| Mobile Reports/advanced | 85% | Core features complete, some sections pending |
| PC dashboard | 75% | Login issues found, needs cache clear/re-test |
| Frontend/backend contract | 95% | Cross-check complete, whitelist updated |
| Static guard/deploy guard | 90% | Passes, API contract aligned |
| BLUEPRINT accuracy | 95% | Updated to Phase 36, versions synced |
| Drive sync | ⚠️ | Timeout after 30+ files, clean run pending |

**What PASSED:**
- ✅ GAS health: status healthy, version 5.13.0-phase36
- ✅ node scripts/pwa_static_guard.js passes
- ✅ JS หลักฝั่ง mobile parse ผ่าน
- ✅ line-number bug NNN| เหลือ 0
- ✅ git working tree clean (at time of audit)
- ✅ API contract cross-check complete (12 functions added)
- ✅ Duplicate modules removed (inventory.js, billing_ui.js)
- ✅ UX patterns verified (loading, error, mobile responsive)

**Historical P0 Critical (superseded by current @609 baseline):**
1. Fixed: API contract drift (whitelist updated, functions added)
2. Fixed: Duplicate modules removed (inventory.js, billing_ui.js)
3. Fixed: Static guard passes with updated references
4. Fixed: PC Dashboard & Mobile PWA login/session/cache recovery is validated by browser smoke, live public smoke, and protected runbook when token is supplied.
5. Watch only: Drive sync is not the production code source of truth; GitHub `main` + GAS @609 are current.

**P1 High (Should fix):**
1. ✅ Fixed: Version sync (Phase 36, v5.13.0-phase36)
2. ✅ Fixed: Frontend action cross-check complete
3. ✅ Fixed: Static guard verified with updated references
4. Active watch: Monitor GAS logs/performance after @609, especially write-smoke cleanup paths.

**P2 Medium (Future hardening):**
1. Keep invokeFunctionByNameV55_ whitelist hardening covered by regression guard.
2. Continue separating read/write/admin action registries through API contract and RouterSplit.
3. Continue reducing duplicate modules only when a current guard or runtime issue proves the risk.

| ปัญหา | สาเหตุ | แก้ไข |
|-------|--------|-------|
| Mobile "เชื่อมต่อไม่ได้" | auth.js + api_client.js ใช้ POST → GAS 302 redirect ฆ่า body | เปลี่ยน POST → GET ทั้งหมด (auth.js, api_client.js, error_boundary.js) |
| PWA Path สับสน | GitHub Pages serve จาก repo root → PWA อยู่ที่ `/pwa/` ไม่ใช่ root | คง path `/comphone-superapp/pwa/` (ไม่ตัด /pwa/ ออก) |
| Version เก่า v5.5 | index.html hardcode "v5.5" | แก้เป็น v5.6.6 |
| SW IndexedDB error | DB version mismatch (SW v2, offline_db v1) | Bump offline_db.js to v2, sync stores |
| gas_config.js URL ผิด | Deploy จับ URL ผิด deployment | แก้ URL ตรง |
| AI Validation 12/16 fail | Recursive test() bug + typeof mismatch | แก้ validation script, add context-aware skip |
| Dashboard "กำลังพัฒนา" | loadSection() แสดง placeholder | เปลี่ยนเป็น live data loaders (11 sections) |
| SW timeout 3s | API ใช้เวลา 11s แต่ timeout 3s | เพิ่มเป็น 15s |
| POST → 405 error (PC) | GAS redirect POST → GET (302) | เปลี่ยนเป็น GET ทั้งหมด (dashboard_pc.html, executive_dashboard.html) |
| system_graph_data.js 404 | ไฟล์ไม่มี | สร้าง stub file |
| 10 ไฟล์ blueprint ซ้ำซ้อน | 47 ไฟล์เอกสารกระจัดกระจาย | รวมเป็น BLUEPRINT.md ไฟล์เดียว + ลบ 10 ไฟล์ซ้ำ |
| Google Drive backup เก่า | SA ไม่มี write quota | ใช้ OAuth2 upload + ลบ backup เก่า |
| **Login fail (Static Hosting)** | `GAS_EXECUTE()` ต้องใช้ `google.script.run` ซึ่งไม่มีบน GitHub Pages | เพิ่ม fetch fallback ใน `execution_lock.js` + `Router.gs` doGet routeActionV55 |
| **GAS doGet ไม่รองรับ loginUser** | `doGet()` hardcode เฉพาะ ~15 actions, ไม่มี loginUser | เพิ่ม `routeActionV55()` fallback สำหรับ actions ที่ไม่ตรง hardcoded list |
| **Dashboard ช้า ~11s** | `getDashboardData()` อ่านซ้ำ 17 ครั้ง (DBJOBS 7x, DB_INVENTORY 3x) | Switch frontend เป็น `getDashboardBundle()` (single-pass + 90s cache) |
| **Inventory UI placeholder** | `renderInventorySection()` แสดงแค่ lowStock count | สร้าง full CRUD UI: 4 KPI, search/filter, table, modals (add/edit/delete/transfer/PO) |
| **deploy_all.sh clasp timeout** | clasp push timeout ไม่มี fallback | เพิ่ม Apps Script API fallback + 60s timeout |
| **Mobile line-number UI bug** | Prefixes (121|, 122|) ใน PWA assets | Fixed in commit af5dbc9 (Codex patch) |
| **Codex/Hermes audit** | Read-only audit of BLUEPRINT.md (2026-05-02) | Compliance 90%, gaps identified, roadmap updated |


### Historical Audit Findings Closed By Current Baseline

| Historical Finding | Current Resolution |
|---|---|
| PC Dashboard parse/runtime breakage | Closed by browser smoke, static guard, and current dashboard split runtime. |
| callGas/callApi mismatch | Closed by API client compatibility and smoke/static guard coverage. |
| GAS doGet auth bypass/open fallback | Closed by Router auth gate, whitelist hardening, and regression guard. |
| Accounting payload/auth mapping | No longer a release blocker; protected routes and current contract checks guard high-risk calls. |
| Version mismatch v5.13/v5.9 notes | Superseded by current PWA v5.18.34 and GAS @609 snapshot above. |

### ⚠️ Current Watchlist


| รายการ | สถานะ | หมายเหตุ |
|-------|-------|---------|
| Browser cache | ⚠️ | ผู้ใช้ต้อง Hard Refresh หลัง deploy |
| Google Drive SA quota | ⚠️ | SA ไม่มี write quota — ต้องใช้ OAuth2 สำหรับ upload |
| Inventory.gs decomposition | ✅ Phase 31 | แยกเป็น 6 modules (InventoryReservation, StockCheck, CRUD, Transfer, PO, ReorderAI) — 1,469L → 22L |
| BillingManager.gs decomposition | ✅ Phase 31 | แยกเป็น 3 modules (BillingCore, Payment, Export) — 958L → 22L |
| DriveSync retry | ✅ Phase 31 | SharedContext.gs v1.1.0 เพิ่ม syncWithRetry_() exponential backoff 3 retries |
| Analytics Index | ✅ Phase 31 | AnalyticsIndex.gs (369L) TTL cache + searchWithIndex <2s query |
| Self-Improving QA Loop | ✅ Phase 31 | 7-Check Protocol (Hermes sub-agent) → Master → Deploy loop |
| Anomaly Detection baseline | ⏳ Phase 33 | รอ telemetry 14 วันจาก Phase 2E (เริ่มเก็บข้อมูลแล้ว) |
| Time/Attendance UI | ✅ Phase 32 | เพิ่มรายงานสรุปรายเดือน/รายปี + PDF Export ใน attendance_section.js |
| Report Module UI | ✅ Phase 32 | สร้าง reports.js ใหม่ (4 ประเภทรายงาน: Attendance, Jobs, Billing, Inventory) |
| Automated Unit Testing | ✅ Phase 32 | สร้าง api_test_framework.js - ทดสอบ API อัตโนมัติ |
| **Phase 33: Predictive Analytics** | ⏳ | วิเคราะห์แนวโน้มยอดขาย/สต็อก, พยากรณ์ความต้องการลูกค้า |
| **Phase 33: Advanced AI Features** | ⏳ | พัฒนา AI ทำนายการบริการ, แนะนำสินค้า/บริการอัจฉริยะ |
| Blueprint reconciliation | ✅ | File map, versions, phase labels synced 2026-04-29 |
| Drive Sync timeout | Watch only | GitHub main and GAS @609 are source of truth; GDrive sync is optional backup/ops, not a production code blocker. |
| H1 Security Hardening | OK guarded | invokeFunctionByNameV55_ whitelist/auth behavior is covered by regression guard; continue monitoring on route changes. |
| Monitor GAS logs/performance | Active watch | Continue after @609, especially cleanup/write-smoke paths and dashboard latency. |

---

## 11. Business Context

### 11.1 User (คุณโหน่ง)
- เจ้าของร้าน IT (ซ่อม/ติดตั้ง/จัดซื้อ) ที่โพนทอง ร้อยเอ็ด
- ชอบกระชับ เน้นประสิทธิภาพ ข้าม setup blocker
- ต้องการ "Professional Grade" system
- **Rule:** ไม่เสียเวลากับ environment issues — เน้นลงมือทำโค้ด

### 11.2 Team
| ชื่อ | บทบาท |
|-----|-------|
| ช่างโต้ | Technician |
| ช่างเหม่ง | Technician |
| ช่างรุ่ง | Technician |
| คุณโหน่ง | Owner / Admin |

### 11.3 LINE Groups
| กลุ่ม | Group ID |
|-------|----------|
| TECHNICIAN | `C8ad22a115f38c9ad3cb5ea5c2ff4863b` |
| ACCOUNTING | `C7b939d1d367e6b854690e58b392e88cc` |
| PROCUREMENT | `Cfd103d59e77acf00e2f2f801d391c566` |
| SALES | `Cb7cc146227212f70e4f171ef3f2bce15` |
| EXECUTIVE | `Cb85204740fa90e38de63c727554e551a` |

---

## 12. Quick Reference

### Login
- Username: `admin` | Password: `admin1234` | Role: OWNER

### Deploy Commands
```bash
# Full deploy (WSL)
cd /mnt/c/Users/Server/comphone-superapp && bash deploy_all.sh

# Manual GAS push
cd clasp-ready && clasp push --force && clasp deploy

# GitHub push (triggers auto-deploy to Pages)
git add -A && git commit -m "..." && git push origin main
```

### Debug Commands (Browser Console)
```javascript
// Check system health
AI_EXECUTOR.debug()

// Check execution lock
window.__TRUSTED_ACTIONS

// Check SW version
navigator.serviceWorker.getRegistration().then(r => r.active.postMessage({type:'GET_VERSION'}))

// Clear all caches
localStorage.clear(); caches.keys().then(ks => ks.forEach(k => caches.delete(k)))

// Check offline DB
indexedDB.databases().then(dbs => console.log(dbs))
```

---

## 13. Development Rules

### 13.1 Operational Principles
1. **ใช้ข้อมูลจริงเป็นฐาน** — ไม่สร้างข้อมูลสมมติ
2. **ไม่ทำงานแบบเงียบ** — error ต้องบันทึกและแจ้งเหตุ
3. **ทำงานต่อเนื่องจนจบงาน** — ไม่ค้างกลางทาง
4. **ความถูกต้องสำคัญกว่าความสวยงาม** — โดยเฉพาะข้อมูลการเงิน
5. **รองรับการขยายตัวแบบค่อยเป็นค่อยไป**

### 13.2 Code Rules
- ❌ **ห้าม** เรียก GAS โดยตรง — ต้องผ่าน `callGas()` หรือ `AI_EXECUTOR`
- ❌ **ห้าม** ใช้ Service Account สำหรับ Drive — ใช้ OAuth2 เท่านั้น
- ❌ **ห้าม** hardcode URL — ใช้ `gas_config.js` เป็น single source
- ❌ **ห้าม** เกิน 50 Script Properties — ใช้ Spreadsheet แทน
- ✅ **ต้อง** sync version ทุก surface หลัง deploy
- ✅ **ต้อง** ใช้ GET สำหรับ API calls (GAS redirect ฆ่า POST body)
- ✅ **ต้อง** timeout 15s สำหรับ API calls (GAS cold start)
- ✅ **ต้อง** error logging ทุก API failure

### 13.3 Deploy Rules (PHMP v1)
- **Freeze tag:** `v5.9.0-phase31-freeze`
- **Hotfix branch:** `hotfix/{YYYYMMDD}-{description}`
- **No direct push to main** for architecture changes
- **Regression test required** before merge

---

> **เอกสารนี้คือ Single Source of Truth** — อ้างอิงไฟล์นี้ก่อนเริ่มงานทุกครั้ง
> อัปเดตล่าสุด: 2026-05-02 | Phase 36 System Hardening & UX Polish | Commit `f7e84b6` - API Contract Fixed, Duplicates Removed, UX Verified

---

## 14. Script Properties (ตั้งค่าแล้วทั้งหมด — 49/50)

| Property | ค่า | 用途 |
|----------|-----|------|
| `DB_SS_ID` | `19fkLbSbBdz0EjAV8nE9LLwBiHeIN50BTPptt_PJCRGA` | Google Sheets Database ID |
| `ROOT_FOLDER_ID` | `1YRZRG9r1Y_jMHg2XFFKYjK4Hx-sW0Eq0` | Google Drive Root Folder |
| `WEB_APP_URL` | Production GAS URL | API Endpoint |
| `LINE_CHANNEL_ACCESS_TOKEN` | [configured] | LINE Messaging API |
| `GEMINI_API_KEY` | [configured] | AI (Slip verify, Vision, Smart Assign) |
| `LINE_GROUP_TECHNICIAN` | `C8ad22a115f38c9ad3cb5ea5c2ff4863b` | แจ้งงานช่าง |
| `LINE_GROUP_ACCOUNTING` | `C7b939d1d367e6b854690e58b392e88cc` | แจ้งบัญชี |
| `LINE_GROUP_PROCUREMENT` | `Cfd103d59e77acf00e2f2f801d391c566` | แจ้งจัดซื้อ |
| `LINE_GROUP_SALES` | `Cb7cc146227212f70e4f171ef3f2bce15` | แจ้งเซลส์ |
| `LINE_GROUP_EXECUTIVE` | `Cb85204740fa90e38de63c727554e551a` | แจ้งผู้บริหาร |
| `TAX_MODE` | `VAT7` | โหมดภาษี (VAT7/ZERO/EXEMPT/MIXED) |
| `BRANCH_ID` | `HQ` | รหัสสาขาปัจจุบัน |
| `COMPANY_NAME` | `ร้านคอมโฟน` | ชื่อบริษัทสำหรับออกเอกสาร |
| `COMPANY_TAX_ID` | `1234567890123` | เลขประจำตัวผู้เสียภาษี |
| `RATE_LIMIT_PER_MIN` | `60` | Request limit ต่อนาที |
| `ALLOWED_ORIGINS` | `*` | CORS Origins |

**RULE:** ห้ามเกิน 50 properties — ใช้ Spreadsheet แทนสำหรับข้อมูล high-frequency

---


## 14.1 Secret / API Key Inventory (Redacted)

> Security rule: this table records key names and storage locations only. Never commit live secret values.

| Key / Secret | Storage | Runtime Consumer | Status | Notes |
|---|---|---|---|---|
| `DB_SS_ID` | GAS Script Properties | all GAS data modules | configured | Spreadsheet ID is operational identifier, not an auth secret. |
| `ROOT_FOLDER_ID` | GAS Script Properties | Drive/PDF/backup modules | configured | Drive folder ID, not an auth secret. |
| `WEB_APP_URL` | GAS Script Properties + `pwa/gas_config.js` | PWA, LINE, internal links | configured @506 | Must match production GAS URL. |
| `LINE_CHANNEL_ACCESS_TOKEN` | GAS Script Properties / Cloudflare Secret when proxied | LINE Bot / Worker | configured / redacted | Do not place token in Git. |
| `LINE_CHANNEL_SECRET` | GAS Script Properties / Cloudflare Secret | LINE signature validation | configured / redacted | Required for webhook verification when enabled. |
| `GEMINI_API_KEY` | GAS Script Properties | Vision, Smart Assign, AI LINE Agent, reorder suggestion | configured / redacted | Rotate if ever exposed in logs/chat. |
| `PROMPTPAY_BILLER_ID` or `PROMPTPAY_ID` | GAS Script Properties | BillingManager.gs | configured / redacted | Used to generate PromptPay QR. |
| `CLASP_TOKEN` | GitHub Secret / local env | deploy_all.sh, manual clasp deploy | configured / redacted | Reconstructs `~/.clasprc.json`; never commit. |
| `GOOGLE_CLIENT_ID` | GitHub Secret / local env | Drive sync / OAuth2 | configured / redacted | OAuth client id. |
| `GOOGLE_CLIENT_SECRET` | GitHub Secret / local env | Drive sync / OAuth2 | configured / redacted | OAuth secret. |
| `GOOGLE_REFRESH_TOKEN` | GitHub Secret / local env | Drive sync / OAuth2 | configured / redacted | Rotate if exposed. |
| `CLOUDFLARE_API_TOKEN` | local env / Cloudflare dashboard / GitHub Secret if automated | Worker deploy | configured / redacted | Scope to Worker deploy only. |
| `COMPHONE_AUTH_TOKEN` | local shell env only | smoke scripts | temporary / never commit | Session token for validation; logout/login after use. |

### Public Identifiers Kept In Blueprint
- GAS Script ID: `1-aoCd5gXoo1dX4FjW62l8JknR3ZPiaf1W7YEmEdtq8gnRzSp4Hwj6043`
- Spreadsheet ID: `19fkLbSbBdz0EjAV8nE9LLwBiHeIN50BTPptt_PJCRGA`
- GitHub Pages URL: `https://comphone.github.io/comphone-superapp/pwa/`
- LINE Group IDs are operational routing identifiers already used in Script Properties. Treat them as internal metadata, not authentication secrets.

---

## 15. Scheduled Triggers (GAS — 8 ตัว)

| Function | หน้าที่ | ความถี่ |
|----------|---------|---------|
| `sendAfterSalesAlerts` | แจ้งเตือน After Sales | Daily |
| `checkLowStockAlert` | แจ้งเตือนสต็อกต่ำ | Daily |
| `cronMorningAlert` | รายงานเช้า | Daily (08:00) |
| `geminiReorderSuggestion` | AI แนะนำสั่งซื้อ | Daily |
| `autoBackup` | สำรองข้อมูลอัตโนมัติ | Daily |
| `getCRMSchedule` | CRM Follow-up | Daily |
| `cronTaxReminder` | แจ้งเตือนยื่นภาษี | Monthly (วันที่ 1) |
| `cronHealthCheck` | ตรวจสอบสถานะระบบ | Every 30 min |

---

## 16. API Contract

### Request Pattern (เปลี่ยนจาก POST เป็น GET — Phase 26.4)
```
GET {GAS_URL}?action=xxx&token=xxx&param1=val1
```

### Response Pattern
```json
{ "success": true, "data": {...}, "message": "optional" }
```

### Frontend Call Pattern
```js
// Mobile PWA (app.js)
async function callAPI(action, params = {}) {
  const url = GAS_URL + '?' + new URLSearchParams({ action, ...params });
  const res = await fetch(url);
  return res.json();
}

// PC Dashboard (dashboard_pc.html)
async function callGas(action, params) {
  const baseUrl = localStorage.getItem('comphone_gas_url') || GAS_URL;
  const qs = new URLSearchParams({ action, ...params }).toString();
  const r = await fetch(baseUrl + '?' + qs);
  return r.json();
}
```

### Auth
- ส่ง `token` (Session ID) ในทุก request ที่ต้องการสิทธิ์
- Token ได้จาก `loginUser` action → `verifySession()` ฝั่ง server

---

## 17. Implemented Actions (40+)

| กลุ่ม | Actions |
|-------|---------|
| **Auth** | `loginUser`, `logoutUser`, `verifySession`, `listUsers`, `createUser`, `updateUserRole`, `setUserActive` |
| **Jobs** | `getJobs`, `getJobById`, `createJob`, `updateJob`, `updateJobStatus`, `deleteJob`, `addJobNote`, `getJobTimeline`, `assignTechnician`, `openJob` |
| **Inventory** | `getInventory`, `addInventoryItem`, `updateInventoryItem`, `deleteInventoryItem`, `transferStock`, `getStockMovements`, `barcodeLookup`, `getInventoryItemDetail` |
| **Billing** | `createBill`, `getBills`, `updateBillStatus`, `generatePDF`, `verifySlip`, `createBilling` |
| **CRM** | `getCustomers`, `createCustomer`, `updateCustomer`, `getCRMSchedule`, `getCustomer` |
| **Photo** | `uploadPhoto`, `getPhotos`, `processPhotoQueue`, `analyzePhoto` |
| **PO** | `createPO`, `getPOs`, `updatePOStatus`, `approvePO` |
| **Attendance** | `clockIn`, `clockOut`, `getAttendance` |
| **After Sales** | `createAfterSales`, `getAfterSales`, `updateAfterSales`, `createAfterSalesRecord` |
| **Dashboard** | `getDashboardData`, `getDashboardBundle`, `systemStatus`, `getExecutiveDashboard`, `getSystemMetrics`, `getSystemLogs`, `getTechPerformance` |
| **Reports** | `exportPOToPDF`, `getProfitReport` |
| **LINE** | Webhook (auto-detect via `destination` + `events`), `sendLineNotify` |
| **AI/Smart** | `smartAssignment`, `gpsPipeline`, `geminiReorderSuggestion` |
| **System** | `healthCheck`, `guardstatus`, `auditproperties`, `cleanupproperties`, `logSystemError` |
| **Public** | `getJobStatusPublic` (ไม่ต้อง Auth) |

---

## 18. Backend File Map (69 ไฟล์ — as-built 2026-04-24)

### Core System (18)
| ไฟล์ | Lines | หน้าที่ |
|------|-------|---------|
| `Router.gs` | 682 | HTTP Router — doGet()/doPost(), MODULE_ROUTER dispatch |
| `Config.gs` | — | Script Properties wrapper, constants, VERSION |
| `Auth.gs` | — | Login PIN, verifySession, RBAC (4 roles) |
| `Utils.gs` | — | Shared utilities |
| `Setup.gs` | 703 | Initial setup + sheet creation + data seeding |
| `Security.gs` | — | Token verify, Rate limit, CORS |
| `HealthMonitor.gs` | — | System health check + LINE alert |
| `AutoBackup.gs` | — | Scheduled backup + trigger management |
| `Backup.gs` | — | Backup functions |
| `DatabaseIntegrity.gs` | — | DB integrity checks + schema validation |
| `DataSeeding.gs` | — | Seed initial data |
| `SheetOptimizer.gs` | — | Sheet performance optimization |
| `DriveSync.gs` | — | Google Drive sync (OAuth2) |
| `DeployGuide.gs` | — | Deploy documentation |
| `ErrorTelemetry.gs` | 667 | Centralized error telemetry + trend analysis + `_logInfo_`/`_logError_` |
| `ArchitectureStewardship.gs` | 358 | Daily complexity/drift/coupling tracking (cron) |
| `PropertiesGuard.gs` | — | Script Properties overflow protection (49/50 limit) |
| `PropertiesCleanup.gs` | — | Properties audit + cleanup |

### Business Modules (12)
| ไฟล์ | Lines | หน้าที่ |
|------|-------|---------|
| `JobsHandler.gs` | — | Job CRUD + Timeline + Notes |
| `JobStateMachine.gs` | 712 | 12-state machine + transition validation |
| `BillingManager.gs` | 1,071 | Bill/Receipt + PromptPay QR + PDF + Slip Verify |
| `Inventory.gs` | 1,502 | Stock 3-layer (Warehouse/Shop/Van) + PO + Barcode |
| `CustomerManager.gs` | 569 | CRM CRUD + Follow-up schedule |
| `CustomerPortal.gs` | — | Public customer portal |
| `Attendance.gs` | — | Clock in/out + attendance report |
| `AfterSales.gs` | — | Warranty + after-sales follow-up |
| `WarrantyManager.gs` | — | ระบบรับประกันสินค้า |
| `TaxEngine.gs` | — | คำนวณภาษี VAT/WHT |
| `TaxDocuments.gs` | — | สร้าง PDF ใบกำกับภาษี/ภงด. + tax reminder cron |
| `MultiBranch.gs` | — | ระบบจัดการหลายสาขา |

### Sales & Reporting (3)
| ไฟล์ | Lines | หน้าที่ |
|------|-------|---------|
| `RetailSale.gs` | — | ระบบขายปลีก (backend stub) |
| `CRM.gs` | — | CRM functions |
| `Reports.gs` | — | รายงานต่างๆ |

### LINE Bot (6)
| ไฟล์ | Lines | หน้าที่ |
|------|-------|---------|
| `LineBot.gs` | 553 | LINE Webhook handler + command parser |
| `LineBotV2.gs` | 739 | LINE Bot v2 — enhanced commands |
| `LineBotIntelligent.gs` | 909 | AI-powered LINE Bot responses |
| `LineBotQuota.gs` | 643 | LINE API quota management |
| `FlexMessage.gs` | 699 | Flex Message templates |
| `Notify.gs` | — | LINE Notify + Messaging API multi-channel |

### Dashboard & Analytics (5)
| ไฟล์ | Lines | หน้าที่ |
|------|-------|---------|
| `Dashboard.gs` | 841 | Dashboard data provider |
| `DashboardBundle.gs` | — | Single-pass dashboard bundle (1-2s, 90s cache) |
| `DashboardV55.gs` | — | Dashboard v5.5 provider (legacy compat) |
| `ExecutiveDashboard.gs` | 558 | Executive KPI data |
| `WorkflowEngine.gs` | 535 | AI workflow engine |

### AI & Vision (12)
| ไฟล์ | Lines | หน้าที่ |
|------|-------|---------|
| `VisionAnalysis.gs` | — | Gemini vision analysis (slip, photo) |
| `VisionPipeline.gs` | 745 | Vision processing pipeline |
| `VisionLearning.gs` | 708 | Vision learning pipeline |
| `SmartAssignment.gs` | — | AI technician assignment |
| `BusinessAI.gs` | 890 | Business AI logic |
| `BusinessAnalytics.gs` | — | Business analytics engine |
| `BusinessMetrics.gs` | — | Business metrics calculator |
| `GpsPipeline.gs` | — | GPS geofence + route optimization |
| `AgentGateway.gs` | — | AI agent gateway |
| `AgentCollaboration.gs` | — | Multi-agent collaboration |
| `AgentMemory.gs` | — | AI agent memory |
| `AgentScoring.gs` | — | AI agent scoring |

### Governance & Safety (7)
| ไฟล์ | Lines | หน้าที่ |
|------|-------|---------|
| `DecisionGuard.gs` | 444 | Decision safety guard |
| `DecisionLayer.gs` | 330 | Decision abstraction layer |
| `WorkflowSafety.gs` | — | Workflow safety checks |
| `SharedContext.gs` | — | Shared context for agents |
| `MemoryControl.gs` | — | Memory management |
| `LearningIntegration.gs` | — | Learning system integration |
| `AIAuditLog.gs` | — | AI action audit trail |

### Other (6)
| ไฟล์ | Lines | หน้าที่ |
|------|-------|---------|
| `PhotoQueue.gs` | 821 | Photo processing queue |
| `AuditLog.gs` | — | Audit trail |
| `Approval.gs` | — | Multi-level approval workflow |
| `PushNotifications.gs` | — | Push notification support |
| `RouterSplit.gs` | — | Router module split helper |
| `reassign_pending_photos.gs` | — | Photo reassignment script |

---

## 19. Design Rationale

### ทำไมใช้ SPA (ไม่ใช่ Multi-page)?
- ลดภาระ GAS ในการโหลดหน้าใหม่
- UI ตอบสนองเร็ว (Snappy) คล้าย Native App
- รองรับการขยายเมนูในอนาคตได้ง่าย

### ทำไม Inventory 3 ชั้น?
- **คลังหลัก (Main):** รับของเข้าและจัดเก็บ
- **หน้าร้าน (Site):** ขายหรือใช้งานหน้าร้าน
- **รถช่าง (Van):** ช่างพกติดรถไปหน้างาน
- สะท้อนการทำงานจริงของธุรกิจรับเหมาติดตั้ง

### ทำไม PromptPay เป็น payment rail หลัก?
- เหมาะกับงานบริการในไทย
- เชื่อมกับการสร้าง QR ได้ง่าย
- ทำให้ flow สถานะ 10→11 (รอชำระ→ชำระแล้ว) มี automation ชัดเจน

### ทำไมเปลี่ยน POST เป็น GET?
- GAS redirect POST → GET (302 Found) ทำให้ body หาย
- GET with query params ไม่ได้รับผลกระทบจาก redirect
- Dashboard data fetch ใช้ GET ได้ (ไม่ sensitive)

### ทำไม timeout 15 วินาที?
- GAS cold start ใช้เวลา 5-10 วินาที
- เดิมตั้ง 3 วินาที → API timeout ก่อนได้ response
- 15 วินาทีครอบคลุม worst case

---

## 20. API Keys & External Services

| Service | 用途 | สถานะ |
|---------|------|-------|
| **LINE Messaging API** | ส่งข้อความ/Flex Message | ✅ Token configured |
| **LINE Notify** | แจ้งเตือน 5 กลุ่ม | ✅ Configured |
| **Gemini API (Flash)** | Slip verify, Vision, Smart Assign | ✅ Key configured |
| **Google Drive** | เก็บรูปงาน + PDF | ✅ ROOT_FOLDER_ID configured |
| **PromptPay QR** | สร้าง QR รับเงิน | ✅ Built-in (BillingManager.gs) |
| **Slip Verify API** | ตรวจสลิปโอนเงิน | ✅ Via Gemini Vision |
| **Cloudflare Worker** | LINE Webhook async proxy | ✅ Deployed |

---

## 21. Architectural Decisions Log

| # | การตัดสินใจ | เหตุผล |
|---|------------|--------|
| 1 | ยึด Router กลาง (Router.gs) | ดูแลง่าย, single entry point สำหรับ web app deployment |
| 2 | ใช้ Google Sheets ต่อ | สอดคล้องระบบเดิม, ลดเวลา migration, เพิ่ม dynamic header mapping |
| 3 | เปลี่ยนรูปถ่ายเป็น data pipeline | รูป不再是แค่หลักฐาน แต่เป็นตัวขับการประเมินคุณภาพงาน |
| 4 | ยึด state machine เป็นแกนกลาง | validation, audit log, billing trigger, stock reservation ผูกกันเป็นระบบ |
| 5 | 3-layer inventory | สะท้อนการทำงานจริง (ร้าน + ภาคสนาม) |
| 6 | PromptPay เป็น payment rail | เหมาะไทย, QR ง่าย, automation ชัด |
| 7 | Multi-channel notification | LINE + Telegram + Email (อนาคต) ตาม role |
| 8 | GET แทน POST | GAS redirect ฆ่า POST body |
| 9 | SW timeout 15s | GAS cold start 5-10s |
| 10 | OAuth2 แทน Service Account | Drive quota issues with SA |


## 22. Phase 30: Enterprise Intelligence (Current)
**วันที่:** 28 เมษายน 2569 | **สถานะ:** 🟢 PRODUCTION — Token Auth + Smart Quotation + GAS URL Fix Complete*

### 22.1 Frontend Expansion (UI Enhancement + Menu Beautification)

| Module | Description | Status | Priority |
|--------|-------------|--------|----------|
| **POS/Retail UI** | สร้างหน้าขายหน้าร้านสมบูรณ์ (`pos.js`) + เชื่อมต่อกับ `createRetailSale` API + Token-based Auth + Barcode Search + Profit Margin | ✅ Complete | - |
| **Smart Quotation** | เพิ่มระบบเปรียบเทียบราคากลาง (คอมพิวเตอร์ 2568, CCTV 2564) ในหน้า POS | ✅ Complete | - |
| **GAS URL Fix** | อัปเดต `gas_config.js` + `api_client.js` เป็น GAS @609 (fix login/analytics errors) | ✅ Complete | - |
| **Menu Beautification (PC+Mobile)** | ปรับปรุงธีมเมนู PC + Mobile ให้สวยงาม (Bootstrap Icons, active states, hover effects, responsive) | ✅ Complete | IMMEDIATE |
| **Customer Portal V2 (ลูกค้า)** | เพิ่มประวัติงาน (viewCustomerJobs) + ดาวน์โหลดใบเสร็จ (downloadCustomerReceipts) + Timeline (showTimeline) + Job Detail (showJobDetail) | ✅ Complete | HIGH |
| **Dashboard Enhancement** | เพิ่ม Retail Sales Widget + Quick Actions + Technician Performance (getTechPerformance: completed jobs, avg days, rating) + Responsive KPI Grid (4/3/2/1 columns) | ✅ Complete | HIGH |
| **Order Module (สั่งซื้อ)** | สร้างหน้าสร้าง/ติดตามใบสั่งซื้อ (Purchase Order) + PDF Export (exportPOToPDF ด้วย jsPDF) + Receive/Cancel | ✅ Complete | HIGH |
| **Stock Module (สต็อก)** | สร้างโมดูลสต็อกใหม่ (stock.js) + Full CRUD + Stock Transfer + Movement History + Low Stock Alerts + ตรวจสอบสิทธิ์ (Admin/Owner เท่านั้น) | ✅ Complete | MEDIUM |
| **Time/Attendance** | `attendance_section.js`, `attendance_ui.js`, monthly/yearly report surfaces, and smoke/functional guard coverage. | OK current | MEDIUM |
| **Report Module** | `reports.js` + `section_reports.js` compatibility bridge, live report API normalization, and functional menu audit coverage. | OK current | MEDIUM |
| **Analytics V2** | `analytics.js`, `analytics_section.js`, `section_analytics.js`, and business/report analytics routes; predictive enhancements remain a future optimization. | Partial current | MEDIUM |
| **Photo Upload UI (PC)** | `photo_upload_section.js` and Vision/PhotoQueue backend exist; continue UX polish only after protected photo workflow QA. | Partial current | LOW |
| **AI LINE Agent (Phase2D)** | สร้าง AI Agent 3 บทบาท (Dispatcher, Sales Analyst, BI) ใช้ Gemini Pro + รองรับ Group ID routing | ✅ Complete | HIGH |

### 22.2 Intelligence & Automation
| Module | Description | Status |
|--------|-------------|--------|
| **AI LINE Agent (Phase2D)** | สร้าง AI Agent 3 บทบาท (Dispatcher, Sales Analyst, BI) ใช้ Gemini Pro + รองรับ Group ID routing + Auto-notification | ✅ Complete |
| **Predictive Inventory** | ใช้ข้อมูล DB_LOGS + DB_INVENTORY ให้ AI (Gemini) ทำนายการสั่งซื้ออะไหล่ล่วงหน้า | ⏳ Pending |
| **Smart Route Optimization** | พัฒนาระบบวางแผนเส้นทางเดินรถสำหรับช่างติดตั้ง (GPS Pipeline) | ⏳ Pending |
| **Anomaly Detection** | ใช้ข้อมูลจาก ErrorTelemetry สร้างระบบแจ้งเตือนความผิดปกติเชิงรุก (Proactive Alerting) | ⏳ Pending |

### 22.3 Sustainability & Hardening
| Module | Description | Status |
|--------|-------------|--------|
| **Module Decomposition** | แยกไฟล์ขนาดใหญ่ (Inventory.gs, BillingManager.gs) เป็นโมดูลย่อยตามหลัก RouterSplit.gs | ✅ Phase 31 |
| **Automated Testing** | Static, regression, API, workflow, UI surface, Vision, and write-smoke guards are active; unit-level GAS tests remain future hardening. | OK guard layer active |
| **Goal** | มุ่งสู่ Phase 30: เปลี่ยนข้อมูล (Data) ให้เป็นความฉลาดในการดำเนินธุรกิจ (Actionable Insights) | 🎯 Target |

### 22.4 Immediate Next Steps (Current @609)
1. Done: POS/Retail UI exists (`pwa/pos.html`, `pwa/pos.js`) and remains behind token-based APIs.
2. Done/watch: Customer Portal surfaces exist; continue customer-facing UX QA only after core operator flows stay green.
3. Partial/watch: PC Photo Upload/Vision surfaces exist; run protected photo workflow QA before expanding automation.
4. Future: Predictive Inventory remains an optimization after stable write/offline staging validation.
---

## 8. Lessons Learned (Phase 30-31 — 28 เมษายน 2569)

### 🔴 Critical Issues Encountered & Resolutions

| ปัญหา | สาเหตุ | วิธีแก้ไข | Commit |
|-------|-------|----------|--------|
| **Login/API config mismatch** | `gas_config.js` was missing from `index.html`, causing old fallback endpoint use | Added `gas_config.js`, centralized runtime config, and aligned fallback to GAS @609 | `b8ccd2f` + Phase 30 stability commits |
| **404 Error: mobile_shared.js** | ไฟล์ `mobile_shared.js` ไม่มีใน repo แต่ `index.html` อ้างอิงไว้ | สร้าง `mobile_shared.js` ว่างๆ (104 bytes) | `38a5ed5` |
| **Version Mismatch** | `index.html` ใช้ v5.7.0, `dashboard_pc.html` ใช้ v5.6.8, `version_config.js` ใช้ v5.9.0-phase31 | สร้างระบบ Centralized Versioning (`version_config.js`) + Cache Buster (`?v=...&t=...`) | `0e5321f`, `0f68e2f` |
| **Service Worker Cache** | SW ยังคงเสิร์ฟไฟล์ JS เวอร์ชันเก่า แม้ index.html จะอัปเดตแล้ว | เพิ่ม Cache Buster comment ใน `index.html` + แนะนำผู้ใช้ให้ล้าง Site Data | `0f68e2f` |
| **Google Drive Sync Failed** | `SharedContext.gs` timeout ขณะ sync | ต้อง retry sync อีกครั้ง (pending) | - |
| **Splash Screen / initApp hang** | Historical service worker/load-order issue | Resolved in current baseline through centralized config load order, SW activation hardening, browser smoke, and live PWA checks. | Current @609 |

### ✅ Completed Work (Phase 30-31)

| งาน | สถานะ | รายละเอียด |
|------|-------|------------|
| **Version Alignment** | ✅ เสร็จ | แก้ไข 4 ไฟล์ให้ใช้เวอร์ชันเดียวกัน (v5.9.0-phase31) |
| **Centralized Versioning** | ✅ เสร็จ | สร้าง `version_config.js` เป็นแหล่งข้อมูลเดียว |
| **Cache Buster** | ✅ เสร็จ | เพิ่ม timestamp parameter + comment ในทุกไฟล์ PWA |
| **Missing Files Fix** | ✅ เสร็จ | เพิ่ม `mobile_shared.js`, `favicon.ico` |
| **gas_config.js Loading** | ✅ เสร็จ | เพิ่มใน `index.html` ก่อน `</head>` |
| **API Fallback URL** | OK Done | Aligned to `gas_config.js` / GAS @609 in `api_client.js` |
| **Dashboard Modernization (Phase 31)** | ✅ เสร็จ | เพิ่ม 5 Chart.js v4 functions + CHARTS object |
| **AI LINE Agent (3 บทบาท)** | ✅ Backend ready | สร้าง `AILinePrompts.gs` + อัปเดต `LineBot.gs` (รอ Group IDs จริง) |
| **Dependency Checklist** | ✅ เสร็จ | เพิ่มใน BLUEPRINT Section 2.5 |
| **GitHub Push** | ✅ เสร็จ | 5 commits (`b8ccd2f`, `8695600`, `38a5ed5`, `0f68e2f`, `c7cca60`) |

### Current Work Register (2026-04-29)

| งาน | สถานะ | อุปสรรค |
|------|-------|----------|
| **Login / Splash / Menu Recovery** | OK **resolved in current baseline** | `api_client.js`, auth guard, service worker activation, menu restore, and API contract smoke are stable at GAS @609 / cache `comphone-v5.18.34-job-menu-hardening-20260513_2005`. |
| **AI LINE Agent Testing** | ❌ **รอ Group IDs** | ต้องเปลี่ยน Placeholder Group IDs ใน `AILinePrompts.gs` (บรรทัด 169-173) เป็น LINE Group ID จริง |
| **Dashboard PC Runtime Baseline** | OK **validated** | PC dashboard uses central version/GAS/API config and no longer clears session storage during boot. Continue visual/UX QA after each feature batch. |
| **Google Drive Sync** | ❌ **Failed** | `SharedContext.gs` timeout (ต้อง retry) |
| **Service Worker Stability** | OK **stabilized** | SW activation no longer forces navigation/reload; updates are gated by user-accepted refresh via `pwa_install.js`. |

### 🗄️ Backup Status (28 เมษายน 2569 — 15:05)

| สถานที่ | สถานะ | รายละเอียด |
|---------|-------|------------|
| **GitHub Repository** | OK current | `main` branch latest verified baseline commit `4512c5f` before this BLUEPRINT update. |
| **Google Drive (Code)** | Needs retry | `SharedContext.gs` sync timeout remains a follow-up item; GitHub is the current code source of truth. |
| **Google Drive (Backups)** | ✅ **มี** | `backups/` folder — 6 ไฟล์ `.tar.gz` (2026-04-28) |
| **Local Backups** | ✅ **ครบ** | `/mnt/c/Users/Server/comphone-superapp/backups/*.tar.gz` |
| **Session Memory** | Superseded by BLUEPRINT | Current runtime/API/key baseline is now recorded in this BLUEPRINT update. |

### Next Steps (Priority Order - Current Baseline)

1. **HIGH: CI smoke automation** - active: auto-deploy and regression guards run static, smoke, workflow, Vision, UI, and write-smoke safety checks.
2. **HIGH: Staging write-flow validation** - next: run the gated write smoke against a staging dataset, then add payment/offline replay under explicit staging confirmations.
3. **MEDIUM: Google Drive Sync retry and timeout tuning** - optional ops follow-up; GitHub main and GAS @609 are current source of truth.
4. **MEDIUM: AI LINE Agent testing** - run controlled room-routing tests only with real group IDs and non-customer test messages.
5. **LOW: UX polish for high-use screens** - continue Dashboard PC/mobile refinements after protected read/write guards stay green.

---



### Current Phase 30 Stability Update (2026-04-29)

| Workstream | Status | Current Baseline |
|---|---|---|
| **PWA Mobile Runtime** | OK Stable | Login, auth restore, menu visibility, service worker activation, and API client loading are aligned. |
| **PC Dashboard Runtime** | OK Stable | Reads central config/version, keeps session storage intact, and shares the API contract baseline. |
| **API Contract** | OK Stable | Required, optional, and read-only workflow smoke checks pass against GAS @609. |
| **Offline / Queue UX** | OK Improved | Queue flush, health view, and observability states are visible from Admin > Health. |
| **Remaining Professional Work** | NEXT | CI automation is active; next risk is staging-only write/payment/offline replay validation plus UX polish for high-use screens. |

---

## 📂 ระบบไฟล์ Coordination (อัปเดต 2026-05-04)
สำหรับการประสานงานระหว่างน้อง H (Frontend) และพี่ O (Backend) ตามกลุ่ม Telegram:

### ไฟล์ที่ใช้:
1. **coordination-saon.md** → สำหรับ **Saon App group** (เฉพาะ SaonCoffee POS)
2. **coordination-comphone.md** → สำหรับ **Comphone101Bot group** และ **Comphone Supperapp AI group** (เฉพาะ COMPHONE SUPER APP)

### กฎการใช้งาน:
- ทุกครั้งที่เริ่ม session ในกลุ่ม ให้เปิดไฟล์ coordination ที่ถูกต้องตามกลุ่ม
- เขียนข้อความตอบกลับในส่วนบทบาทของตนเอง (น้อง H / พี่ O)
- Commit ไฟล์พร้อมกับการเปลี่ยนแปลงโค้ดทุกครั้ง
- ห้ามคุยผสมกันระหว่าง 2 โปรเจ็ค (SaonCoffee vs COMPHONE)

### สถานะปัจจุบัน (บันทึก ณ 2026-05-04 15:30):
- ✅ สร้างไฟล์ coordination ครบทั้ง 2 ไฟล์แล้ว
- ✅ ลบไฟล์ coordination.md เก่าเรียบร้อย
- ✅ น้อง H (Frontend) เสร็จ 100% (5 เมนูใหม่ + deploy v5.14.1)
- ⏳ พี่ O (Backend) กำลังดำเนินการ (GAS API, Settings, Gateway)

---

### Phase 67 Source Alignment Update (2026-05-07)

| Workstream | Status | Current Baseline |
|---|---|---|
| **GAS Source of Truth** | OK Hardened | Root GAS files and `clasp-ready/` are aligned for `Router.gs`, `Auth.gs`, `Config.gs`, `RouterSplit.gs`, `LineCommandCenter.gs`, and `VisionPipeline.gs`. |
| **Deploy Guard** | OK Hardened | `scripts/gas_source_alignment.js` now treats all aligned GAS files as blocking checks instead of warning-only drift. |
| **Auth Session Store** | OK Hardened | Session persistence combines PropertiesService, safeSetProperty/PROP_OVERFLOW, and CacheService fallback. Login returns a token only after a session is stored. |
| **Router Security** | OK Aligned | Root `Router.gs` now includes the same sensitive-action auth gates, login alias, and dynamic invocation allowlist as the deploy-ready source. |
| **AI Vision Pipeline** | OK Aligned | Root `VisionPipeline.gs` now includes the Phase 61-64 review queue, field context, suggestion preview/execute, and timeline integration helpers from deploy-ready source. |

#### Phase 67 Notes
- No real secrets are stored in this repository. Runtime secrets such as LINE tokens, Gemini keys, GitHub tokens, and session tokens must remain in Apps Script Properties, GitHub Actions secrets, or a local ignored `.env` file.
- Production deploy paths must pass `node scripts/gas_source_alignment.js` before deployment to prevent root/deploy-ready drift.
- Next recommended work: staging-safe write-flow validation for job/customer/billing/POS actions, followed by AI Vision end-to-end browser QA.

---

### Phase 68 Write-Flow Validation Update (2026-05-07)

| Workstream | Status | Current Baseline |
|---|---|---|
| **Backend Deployment** | OK Deployed | GAS deployment `@562` points to `v5.18.16-write-flow-validation`. |
| **PWA Runtime** | OK Updated | Frontend cache/version is `v5.18.31-write-flow-validation` with build `20260507_2330`. |
| **API Payload Contract** | OK Hardened | `callApi()` now serializes object/array query payloads as JSON so complex write payloads do not become `[object Object]`. |
| **Write Idempotency** | OK Aligned | `createCustomer`, `openJob`, and `createBilling` use `client_request_id` replay protection across root and `clasp-ready` source. |
| **Write Smoke** | OK Validated | `scripts/pwa_write_smoke.js` validates create customer, open job, create billing, idempotent replay, and read-back verification. PO write remains behind a separate safety gate. |
| **Source Alignment Guard** | OK Hardened | Alignment guard now blocks drift for `CustomerManager.gs`, `JobsHandler.gs`, and `InventoryPO.gs` in addition to previous critical GAS files. |

#### Phase 68 Validation
- Protected API smoke passed for dashboard, CRM, inventory, PO, reports, vision, LINE command center, and admin.
- Real write smoke passed for customer/job/billing with read-back verification.
- Regression guard passed with the existing non-blocking service worker cleanup warning.

---

### Phase 69 UI Write Contract Update (2026-05-08)

| Workstream | Status | Current Baseline |
|---|---|---|
| **PWA Runtime** | OK Updated | Frontend cache/version is `v5.18.32-ui-write-contract` with build `20260508_0015`. |
| **Write Request IDs** | OK Hardened | `createWriteRequestId()` is available from the central API client, so PC and mobile write flows share the same request id pattern. |
| **PC CRM Write Flow** | OK Hardened | PC add-customer now sends `client_request_id` and `source=pc_crm`. |
| **PC Inventory/PO Write Flow** | OK Hardened | PC create-PO now sends `client_request_id`, `source=pc_inventory`, and structured `items` through the JSON-safe API client. |
| **Regression Guard** | OK Hardened | New `scripts/pwa_ui_write_contract.js` validates high-risk UI write flows and is included in the regression guard pack. |

#### Phase 69 Validation
- `scripts/pwa_ui_write_contract.js` passed.
- Protected API smoke passed against GAS `@562`.
- Regression guard passed with the existing non-blocking service worker cleanup warning.

---

### Phase 70 UI Surface Audit Update (2026-05-08)

| Workstream | Status | Current Baseline |
|---|---|---|
| **UI Surface Audit** | OK Added | New `scripts/pwa_ui_surface_audit.js` checks PC/mobile load order, modal handlers, scroll-safe modals, double-submit guards, and high-risk write button contracts. |
| **Regression Guard** | OK Hardened | Regression pack now runs both `pwa_ui_write_contract.js` and `pwa_ui_surface_audit.js`. |
| **CI Readiness** | OK Hardened | `pwa_ui_surface_audit.js` is listed as a required CI script. |
| **Pages Freshness** | OK Verified | GitHub Pages is serving `v5.18.32-ui-write-contract`, build `20260508_0015`, and GAS `@562`. |

#### Phase 70 Notes
- Browser-use plugin setup failed in this local session because its runtime could not write kernel assets. The fallback static/runtime audit layer was added so CI still catches UI contract drift until a browser engine is available.
- Remaining next step: install or repair a browser automation engine, then run visual click-through for PC/Mobile modals and screenshots.

---

### Phase 71 Menu Journey Reports Hardening Update (2026-05-08)

| Workstream | Status | Current Baseline |
|---|---|---|
| **PWA Runtime** | OK Updated | Frontend cache/version is `v5.18.33-menu-journey-reports` with build `20260508_1030`. |
| **PC Reports Menu** | OK Fixed | `dashboard_pc.html` now loads `reports.js` before the legacy `section_reports.js` bridge, so PC Reports opens the real reports module instead of the old prototype surface. |
| **Reports Compatibility Bridge** | OK Hardened | `section_reports.js` is now only a compatibility bridge and no longer renders prototype/coming-soon buttons or empty report cards. |
| **Menu Journey Guard** | OK Added | New `scripts/pwa_menu_journey_audit.js` validates the priority operational journeys: Reports, service job, customer CRM, billing/payment, inventory/PO, and platform API contracts. |
| **Regression Guard / CI** | OK Hardened | `pwa_menu_journey_audit.js` is required by CI readiness and runs in the regression guard pack. |

#### Phase 71 Validation
- `node scripts/pwa_menu_journey_audit.js` passed with **100/100**.
- The next professional sequence is to continue menu-by-menu with real browser click-through once browser automation is available: Reports -> Open Job -> Customer -> Billing/Payment -> Inventory/PO -> AI Vision/LINE -> Admin Settings.

---

### Phase 72 Job Menu Hardening Update (2026-05-08)

| Workstream | Status | Current Baseline |
|---|---|---|
| **PWA Runtime** | OK Updated | Frontend cache/version is `v5.18.34-job-menu-hardening` with build `20260513_2005`. |
| **PC Jobs Renderer** | OK Fixed | `renderJobsSection()` now returns HTML to `dashboard_pc_core.js` and no longer replaces `main-content` directly, preventing section/page replacement drift. |
| **PC Open Job Flow** | OK Added | PC Jobs now has a real open-job modal that calls `openJob` with `client_request_id`, `source=pc_dashboard_jobs`, required field validation, result feedback, and duplicate-click blocking. |
| **Menu Journey Guard** | OK Expanded | `scripts/pwa_menu_journey_audit.js` now validates PC jobs render contract, PC open-job modal wiring, and PC open-job double-submit guard. |

#### Phase 72 Validation
- `node --check pwa/section_jobs.js` passed.
- `node scripts/pwa_menu_journey_audit.js` passed with **100/100** and 22 checks.
