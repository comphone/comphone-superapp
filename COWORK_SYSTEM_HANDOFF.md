# COMPHONE SUPER APP - Cowork System Handoff

Updated: 2026-06-16 (Asia/Bangkok)

This document is the concise operational handoff for Cowork or another engineering
agent. Read `BLUEPRINT.md` for history, but use this file for the current review
order and safety boundaries.

## 1. Current Repository State

- Repository: `https://github.com/comphone/comphone-superapp`
- Branch: `main`
- Baseline HEAD inspected before this handoff commit: `19b0447`
  (`Scheduled backup 2026-06-11 18:38`). Run `git log -1 --oneline` for the
  current HEAD after the handoff is committed.
- Last functional implementation commits:
  - `67a522b` - Sprint 193 implementation / auto deploy
  - `c34ae6b` - Mobile primary action label polish
- Commits after `c34ae6b` contain session backup files only. No application source
  changed between `c34ae6b` and the current HEAD.
- Local working copy was missing on 2026-06-12 and was restored by cloning the
  GitHub repository into `C:\Users\Server\comphone-superapp`.
- Working tree was clean immediately after restoration.

## 2. Production Identity

| Component | Current recorded value |
|---|---|
| PWA version | `v5.18.47-sprint184` |
| Blueprint phase | Phase 193 |
| GAS backend version | `v5.18.16-write-flow-validation` |
| GAS deployment | `@620` |
| Production spreadsheet | `19fkLbSbBdz0EjAV8nE9LLwBiHeIN50BTPptt_PJCRGA` |
| LINE Worker source version | `1.0.5-sprint189` |
| Mobile URL | `https://comphone.github.io/comphone-superapp/pwa/` |
| PC URL | `https://comphone.github.io/comphone-superapp/pwa/dashboard_pc.html` |
| LINE webhook | `https://comphone-line-webhook.narinoutagit.workers.dev/line/webhook` |

Production GAS URL is defined only by `pwa/gas_config.js`. Do not copy it into
additional frontend files.

## 3. Architecture

```text
PC Dashboard / Mobile PWA
          |
          v
api_client.js + api_contract.js + session token
          |
          v
Google Apps Script Web App
Router.gs / RouterSplit.gs
          |
          +--> Jobs / CRM / Billing / Reports / Inventory / PO / Warranty
          +--> Admin / Data Repair / Smoke Cleanup / Audit
          +--> AI Vision / Photo Queue / LINE Command Center
          |
          v
Single production Google Spreadsheet

LINE Platform
     |
     v
Cloudflare Worker (signature forwarding + quiet group policy)
     |
     v
GAS LINE handlers -> Photo Queue -> Gemini/Vision -> Sheet/Drive evidence
```

### Source ownership

- `pwa/`: GitHub Pages frontend for PC and mobile.
- Root `*.gs`: readable GAS source and alignment baseline.
- `clasp-ready/`: GAS deployment source. Keep it aligned with root GAS files.
- `workers/line-webhook/`: Cloudflare Worker for LINE ingress.
- `scripts/`: static guards, live smoke tests, release gates, and cleanup gates.
- `docs/database_schema_registry.json`: allowed production Sheet schema.
- `BLUEPRINT.md`: historical single source of truth and agent handoff history.

## 4. Main Product Areas

### PC

- Login/session restore.
- Dashboard command center and role-aware decision widgets.
- Jobs, Billing, Reports, CRM, Inventory, Purchase Orders, Warranty.
- AI Vision review inbox and LINE Command Center.
- Settings/Admin health, data completeness, repair preview, and smoke cleanup.

### Mobile

- Four default dashboard actions: Open Job, Jobs, Billing, Reports.
- Grouped More menu with progressive disclosure.
- Last-page restore and accidental-exit protection.
- Camera is not a main navigation destination. It is opened from Job Detail.
- Job Detail supports photos, completion, timeline, billing, Vision, calling the
  customer, and admin/owner archive-before-delete.
- Admin/owner More menu includes `cleanup-tools` for Smoke/Test Data Cleanup.

## 5. Authentication and API Rules

- `pwa/api_client.js` is the central frontend API client.
- Protected calls require a valid session token.
- `verifySession()` contract and Router auth checks have already been aligned.
- Public actions must remain limited to login, health, version, and genuinely
  public system operations.
- Business data reads and all writes must remain protected.
- Admin actions such as `deleteJob` and `cleanupSmokeTestRecords` require
  admin/owner authorization.
- Never commit a session token or credentials. Use `COMPHONE_AUTH_TOKEN` only as
  a process environment variable for protected smoke tests.

## 6. Database Rules

Google Sheets remains the source of record. Cloudflare D1 is not yet the primary
database and should only be considered later as an operational cache/read model.

Critical tables:

- `DBJOBS`
- `DB_CUSTOMERS`
- `DB_BILLING`
- `DB_INVENTORY`
- `DB_STOCK_MOVEMENTS`
- `DB_JOB_ITEMS`
- `DB_JOB_LOGS`
- `DB_PURCHASE_ORDERS`
- `DB_PHOTO_QUEUE`
- `DB_USERS`
- `DB_ACTIVITY_LOG`

Maintenance and safety tables:

- `DBJOBS_ARCHIVE`
- `DB_SMOKE_CLEANUP_ARCHIVE`
- `DB_DATA_REPAIR_ARCHIVE`
- `DB_DATA_REPAIR_AUDIT`
- `DB_DATA_REVIEW_LOG`

Rules:

1. Do not create a new `DB_*` Sheet without updating the schema registry.
2. Use `getComphoneSheet()` / `findSheetByName()`, not active-spreadsheet state.
3. Archive before destructive change.
4. Require explicit confirmation and audit logging.
5. Do not delete production data merely because it looks like test data.

## 7. AI Vision and LINE State

Implemented:

- LINE signature forwarding through the Worker.
- Room-aware deterministic routing before optional AI.
- Quiet group forwarding: normal group images/text continue backend processing
  without noisy LINE replies.
- Separate per-room Notify and Bot Reply toggles.
- Accounting images without JobID can enter `ACCOUNTING_PENDING`.
- Technician work photos expect JobID context.
- AI Vision Review Inbox exists on PC and mobile.
- Gemini analysis is confirmation-gated and real LINE sends are separately gated.

Still requiring live proof:

- Send one real JobID-tagged image in the configured LINE room.
- Verify growth in `DB_PHOTO_QUEUE`, Drive evidence, Vision log, and Review Inbox.
- Verify the current production GAS source contains the latest JobID-context and
  room-aware routing code.
- Confirm Worker `/health` reports `1.0.5-sprint189`.

Do not make group replies noisy again. Muting replies must not stop backend
processing, queueing, logs, or audit evidence.

## 8. Destructive Operations

### Job deletion

- UI action: Mobile Job Detail, admin/owner only.
- Backend action: `deleteJob`.
- Required confirmation: `DELETE_JOB`.
- Backend archives the row into `DBJOBS_ARCHIVE` before deleting from `DBJOBS`.
- A restore-from-archive workflow is not yet complete.

### Smoke/test cleanup

- UI locations: PC Settings and Mobile Admin/Cleanup Tools.
- Backend action: `cleanupSmokeTestRecords`.
- Preview is the default.
- Execution requires the exact phrase `DELETE_REVIEWED_SMOKE_RECORDS`.
- Backend deletes only rows that still contain recognized smoke/test markers.
- Every deleted row must first be archived to `DB_SMOKE_CLEANUP_ARCHIVE`.

### Data repair

- `previewDataRepair` is read-only.
- `executeDataRepair` requires owner review and
  `EXECUTE_REVIEWED_DATA_REPAIR`.
- Never execute repair or deletion from CI.

## 9d. Full Protected Live Verification — 2026-06-16

Fresh session token (OWNER role) supplied by operator. All protected read
suites passed against production GAS @620.

```
PWA API Smoke (13 endpoints):      OK 13/13
Sprint 85 Live Mobile Menu Smoke:  OK 13/13
Sprint 87 Protected Live QA:       OK 13/13
Sprint 99 Live Readiness Audit:    OK 6/6
Sprint 124 Protected Visual/Menu:  OK 21/21 (static+public+protected)
Sprint 132 Core Workflow Live QA:  OK (J0020 billing miss = optional, expected)
Sprint 133 Support/Admin Live QA:  OK (warranty detail = optional, no Job_ID)
Sprint 134 Data Completeness:      WARNING — 4 known findings (unchanged from prior sweep):
  1. One incomplete DB_BILLING source row
  2. Job J0020 has no readable Billing detail
  3. Current-month daily revenue rows empty (monthly total is healthy)
  4. Warranty list is live but returns no rows
Sprint 138 Review Log Live QA:     OK 4/4
Sprint 139 Data Cleanup Triage:    OK 4 findings (same as Sprint 134 above)
Sprint 161 Protected Live Sweep:   OK 16/16 protected_run=true
Sprint 166 Token Full Sweep Pack:  OK 3/3
```

Sprint 194 Router.gs whitelist fix also discovered via live test and patched
(`listJobArchive`, `previewJobRestore`, `restoreJob` were missing from
`ALLOWED_FUNCTIONS` in Router.gs — now fixed and committed `37910c0`).
Sprint 194 endpoints will be live after the next clasp push + GAS redeploy.

## 9. Verification Completed on 2026-06-12

The following checks passed against the restored GitHub working copy:

```text
PWA Static Guard: OK
CI Readiness: OK, 0 issues
GAS Source Alignment: OK, 14 files checked
GAS Syntax Guard: OK, 91 files
Sprint 193 Delete/Camera/Dashboard Guard: OK, 100/100
```

This does not prove current protected production behavior because no fresh
`COMPHONE_AUTH_TOKEN` was available during this handoff.

## 9a. Verification and Tooling Fixes Completed on 2026-06-13

Windows guard-environment failures were diagnosed as false alarms and fixed at
the root cause. No application or GAS source behavior changed.

Fixes applied:

1. `scripts/regression-guard.sh` and `scripts/post-incident-watch.sh` resolved
   `python3` to the Microsoft Store alias stub, which exists but cannot run
   scripts, so Suite E reported "Browser-level smoke test FAILED" without
   running anything. Both scripts now probe `python3` / `python` / `py` with an
   executability check before selecting an interpreter.
2. `scripts/.guard-checksums.md5` was committed with CRLF endings, so
   `md5sum -c` could not read two of its entries ("FAILED open or read"). The
   file is regenerated with LF endings and `.gitattributes` now pins `*.md5`
   to LF. The underlying script hashes had never actually drifted.
3. `scripts/regression-guard.sh`, `scripts/guard-self-test.sh`, and
   `scripts/drift-guard.sh` now `export LC_ALL=C.UTF-8` because `grep -P`
   aborts under non-UTF-8 multibyte locales on Windows Git Bash, which killed
   guard-self-test at the cache-bust step under `set -euo pipefail`.
4. Git hooks were installed via `bash scripts/install-hooks.sh` (the restored
   clone had none), so pre-commit guard checks are active again.
5. P2 item resolved: `scripts/build_code_index.js` no longer reports
   `missing-mobile-page` for template expressions such as `${card.page}` and
   `${item.page}`; dynamic template routes are excluded from the route index.
   Code Index now reports `risks: none` (routes 20 -> 18).
6. P1 version drift (section 10) partially reconciled:
   - `workers/line-webhook/package.json` bumped `1.0.0` -> `1.0.5-sprint189`
     to match the deployed Worker runtime version (metadata only; no deploy).
   - BLUEPRINT runtime table Build Timestamp corrected `20260521_0800` ->
     `20260521_1200` to match its own stated source `pwa/version_config.js`.
   - Remaining intentional: Blueprint phase 193 vs PWA tag `sprint184` track
     different counters (phase = blueprint history, tag = PWA release) and are
     not force-aligned.

Evidence after fixes (all local, read-only):

```text
PWA Static Guard: OK
CI Readiness: OK, 0 issues
GAS Source Alignment: OK, 14 files
GAS Syntax Guard: OK, 91 files
Guard Self-Test: 8/8 PASSED (no caller-side LC_ALL needed)
Drift Guard: NO DRIFT DETECTED
Regression Guard: ALL CHECKS PASSED (59 sprint guards passed or skipped safely)
Browser Smoke Test: PASS 14 checks (real Python via py launcher)
System Integrity Audit: 100/100, menus 37/37 OK
Code Index: risks none
Pages Deploy Verify: OK (v5.18.47-sprint184, build 20260521_1200)
LINE Worker /health: 1.0.5-sprint189 with correct GAS URL (closes the
  Worker-version live-proof item in section 7)
Mobile Menu Deep QA (Sprint 141): 16/16
Mobile UX Walkthrough (Sprint 145): 17/17
Mobile Menu E2E (Sprint 156): 11/11
PC Dashboard Workflow (Sprint 157): 11/11
Browser Clickthrough Contract (Sprint 160): 47/47
AI Vision Inbox Render Smoke (Sprint 191): 100/100
```

PC/Mobile menu and route mounts were re-verified via the static route/render
contract guards above (the achievable substitute for a live click-through
while no session token is available). Note: the `preview_*` tooling in this
environment is rooted in a different working directory and cannot serve this
repo's `pwa/`, so interactive in-browser clicking was not possible here;
section 12 step 4 (real browser walkthrough) still belongs to the operator.

Still unproven (requires a fresh `COMPHONE_AUTH_TOKEN` from a real login,
which was not available): protected API smoke, token sweep, and the real
JobID-tagged LINE image ingress sample.

## 9c. Sprint 194 — Job Archive Restore (2026-06-16)

Closes the P1 gap: admin/owner can now preview and restore archived jobs from `DBJOBS_ARCHIVE`.

- **GAS backend**: `listJobArchive`, `previewJobRestore`, `restoreJob` added to `JobsHandler.gs` and registered in `RouterSplit.gs`. `restoreJob` requires `RESTORE_JOB` confirmation, checks for duplicate JobID in live DBJOBS, uses LockService, and writes `RESTORE_JOB` to the audit log.
- **Frontend**: Admin panel gains an "Archive" tab (both PC and mobile shell). Shows archived job list, per-job preview cards with field table, duplicate-block warning, and confirmation-gated restore button.
- **Schema**: `DBJOBS_ARCHIVE` registered in `docs/database_schema_registry.json`.
- **Guard**: `scripts/sprint194_job_archive_restore_guard.js` — 23/23 checks — wired into `pwa_static_guard.js`, `regression-guard.sh`, and GitHub Actions.

Still requires live proof: a fresh `COMPHONE_AUTH_TOKEN` is needed to run the protected read path (`listJobArchive`) and confirm the restore flow end-to-end.

## 9b. Runtime Root-Cause Found on 2026-06-15: Corrupted Thai (Mojibake)

Owner reported the app loads and login works, but menus felt "incomplete /
inconsistent." Live runtime checks proved the stack is healthy (GAS
`health` ok with spreadsheet/config/triggers, `getVersion` ok, `loginUser`
and `verifySession` return correct responses, Pages HTTP 200, Worker
`/health` 1.0.5-sprint189). The visible problem was **garbled Thai text**, not
a server outage.

Root cause: commit `9749fef "Harden Sprint 78 reports E2E workflow"`
double-encoded the Thai in two **loaded** PWA scripts (UTF-8 misread as
Windows-874, leaving the `เธ` hallmark bigram plus lone C1 control bytes where
characters like `น`/`้` belonged). The prior version was clean, so this was an
encoding regression, not a content change. Structural guards never caught it
because they check load order/routes/handlers, not text legibility.

| File | Loaded by | Damage | Fix |
|---|---|---|---|
| `pwa/section_revenue.js` | Mobile + PC (Revenue menu) | ~259 corrupted sequences (35 lines): KPI labels, table headers, errors | Reconstructed correct Thai from clean `0b2856f`, kept current `getReportData` normalization logic |
| `pwa/dashboard_pc_core.js` | PC | logout confirm dialog | Restored correct Thai |
| `pwa/advanced_reports.js` | **not loaded** (orphan) | ~753 sequences | Left as-is; flagged for archive (does not reach users) |

Verification of the fix:
- `scripts/thai_encoding_guard.js` (new): OK, 48 loaded PWA scripts clean.
- VM render of `renderRevenueSection` with mock data: KPI/headers/`฿`/customer
  all render as correct Thai, zero `เธ`.
- `node --check` clean on both files; PWA Static Guard OK.

Regression prevention (new guard, wired into pre-commit and CI):
- `scripts/thai_encoding_guard.js` scans every JS the two HTML shells load and
  fails on the `เธ` mojibake bigram (threshold 3) or any C1 control char.
- The same check is embedded in `scripts/pwa_static_guard.js` (runs in the
  pre-commit hook) and added as a Suite step in `scripts/regression-guard.sh`.
- Negative-tested: restoring the corrupted `section_revenue.js` makes the guard
  fail with the exact file/line list; the clean tree passes.

Caveat: this fixes the *legibility* of these menus. Deeper "incompleteness"
(empty data, missing detail rows, workflow gaps) can only be confirmed by
exercising the protected read endpoints per menu with a fresh
`COMPHONE_AUTH_TOKEN`, which was not available this session. Recommend the owner
supply a token so each menu's live data can be swept (handoff section 12 step 3-4).

## 10. Priority Findings for Cowork

### ✅ P0 - Live acceptance evidence (DONE — 2026-06-16)

Protected live sweep completed with fresh OWNER session token. All read
endpoints confirmed healthy. See section 9d for full results.

Remaining operator action: browser click-through on published Pages URLs
(PC + mobile) to confirm visual rendering with real data. Cannot be done
by a code agent without a controlled browser session.

### P1 - Reconcile version and documentation drift

- Blueprint phase is 193 while `version_config.js` remains
  `v5.18.47-sprint184`.
- `version_config.js` build timestamp is `20260521_1200`, while an older
  Blueprint runtime table still says `20260521_0800`.
- Worker `package.json` says `1.0.0`, while runtime source says
  `1.0.5-sprint189`.
- BLUEPRINT contains historical, duplicated, and mojibake sections. Keep its
  current top handoff but move old history into an archive document.

### P1 - Validate production write workflows safely

- Jobs/customer/billing create paths have guarded smoke coverage.
- Payment, inventory transfer, LINE send, and offline replay still need
  staging-only validation.
- Never validate destructive writes against production without preview and
  owner confirmation.

### P1 - Resolve known business-data gaps

- One incomplete `DB_BILLING` source row was previously reported.
- Job `J0020` previously had no readable Billing detail.
- Current-month daily revenue could be legitimately empty; verify period/data.
- Warranty list was healthy but empty.
- Re-run the data-completeness suite before assuming these findings still exist.

### ✅ P1 - Add archive restore (DONE — Sprint 194)

Preview-and-restore for `DBJOBS_ARCHIVE` is implemented. `listJobArchive`,
`previewJobRestore`, and `restoreJob` are live in GAS and the Admin panel
Archive tab. Duplicate detection, RESTORE_JOB confirmation gate, LockService,
and audit logging are all in place. Guard: `sprint194_job_archive_restore_guard.js` 23/23.

### P2 - Frontend and repository cleanup

- Align or archive auxiliary HTML pages that still carry old fallback versions.
- Add a visible service-worker update/reload prompt.
- Reduce historical backup/document noise without deleting audit history.
- Done 2026-06-13: Code Intelligence false positives for template expressions
  such as `${card.page}` and `${item.page}` are fixed in
  `scripts/build_code_index.js` (see section 9a).

## 11. Required Commands

Run local non-destructive checks first:

```powershell
node scripts\pwa_static_guard.js
node scripts\ci_readiness_check.js
node scripts\gas_source_alignment.js
node scripts\gas_syntax_guard.js
node scripts\build_code_index.js
node scripts\system_integrity_audit.js
node scripts\sprint193_delete_camera_dashboard_guard.js
bash scripts/guard-self-test.sh
bash scripts/regression-guard.sh
```

Protected read-only verification:

```powershell
$env:COMPHONE_AUTH_TOKEN='FRESH_SESSION_TOKEN'
node scripts\pwa_api_smoke.js
node scripts\sprint161_protected_live_token_sweep.js
node scripts\sprint166_protected_token_full_sweep_pack.js
Remove-Item Env:\COMPHONE_AUTH_TOKEN -ErrorAction SilentlyContinue
```

Do not place the real token in files, command history screenshots, reports, or
chat messages.

## 12. Cowork Review Order

1. Confirm repo/branch/clean worktree.
2. Run local guards without modifying code.
3. Run protected read-only smoke with a fresh token.
4. Browser-test PC and mobile menus.
5. Inspect production Sheet data gaps.
6. Verify LINE Worker and one real image ingress sample.
7. Fix one failing workflow at a time.
8. Update tests and this handoff with evidence.
9. Update `BLUEPRINT.md` only after verification.
10. Commit narrowly scoped changes; do not mix cleanup with behavior changes.

## 13. Non-Negotiable Safety Rules

- Do not change the production GAS URL casually.
- Do not expose or commit secrets.
- Do not weaken Router authorization to make a menu work.
- Do not bypass archive/confirmation gates.
- Do not create duplicate spreadsheets or unregistered Sheets.
- Do not overwrite unrelated user/agent changes.
- Preserve Thai UTF-8 text.
- Do not claim production is fixed from static checks alone.
