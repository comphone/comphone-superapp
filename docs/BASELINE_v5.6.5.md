# COMPHONE SUPER APP — Architecture Freeze Baseline
## PHMP v1 Protocol | Immutable Reference

---

## 1. Commit Baseline Reference

| Field | Value |
|-------|-------|
| **Commit Hash** | `80d7a53` |
| **Commit Message** | `AUTO DEPLOY 2026-04-22_16-10-03` |
| **Tag** | `v5.6.5-freeze` |
| **Branch** | `main` |
| **Date** | 2026-04-22 16:10:03 +07:00 |
| **Author** | System (AUTO DEPLOY) |
| **Tree Status** | Clean (no uncommitted changes) |
| **Remote Sync** | `origin/main` @ `80d7a53` |

---

## 2. Version Baseline (v5.6.5)

Canonical version `5.6.5` is unified across **7 critical surfaces**:

| Surface | File | Key |
|---------|------|-----|
| GAS Config | `clasp-ready/Config.gs` | `CONFIG.VERSION = '5.6.5'` |
| SW Cache | `pwa/sw.js` | `CACHE_V = 'comphone-v5.6.5'` |
| PC Dashboard | `pwa/dashboard_pc.html` | `window.__APP_VERSION = 'v5.6.5'` |
| PC Badge | `pwa/dashboard_pc.html` | `#version_badge` innerText |
| Execution Lock | `pwa/execution_lock.js` | `LOCK_VERSION = '5.6.5'` (if present) |
| Cache Bust | `pwa/dashboard_pc.html` | `?v=566` suffix on policy scripts |
| Router Health | `clasp-ready/Router.gs` | `healthCheckV55_()` returns `CONFIG.VERSION` |

**Invariant:** Any mismatch between these surfaces triggers cache invalidation and reload.

---

## 3. Security Invariants Baseline

### 3.1 Auth Gate (`_checkAuthGateV55_`)
- **Location:** `clasp-ready/Router.gs:943-972`
- **Rule:** Actions in `AUTH_REQUIRED` list MUST provide `payload.token`
- **Token Validation:** `verifySession(token)` — server-side only
- **Actions Protected (17):**
  `cancelPurchaseOrder`, `scheduleFollowUp`, `logFollowUpResult`, `nudgeSalesTeam`, `nudgeTech`, `smartAssignTech`, `smartAssignV2`, `geminiSlipVerify`, `verifyPaymentSlip`, `askAI`, `sendCSAT`, `generateTOR`, `exportTORpdf`, `runBackup`, `seedAllData`, `pruneAuditLog`

### 3.2 Private Function Guard (`invokeFunctionByNameV55_`)
- **Location:** `clasp-ready/Router.gs:975-988`
- **Rule:** Rejects any `functionName` starting with `_` (underscore prefix)
- **Purpose:** Prevents client from calling internal/private GAS functions directly

### 3.3 Rate Limiter v2
- **Location:** `clasp-ready/Router.gs` (entry of `doPost`)
- **Rule:** Uses `CacheService.getScriptCache()` with key = hash of `token + username + action`
- **TTL:** 60 seconds
- **Limit:** 60 requests/minute per identity
- **Failure Response:** HTTP 429 + `{error: 'RATE_LIMIT', retryAfter: N}`

### 3.4 LINE Webhook Signature Verification
- **Location:** `clasp-ready/Router.gs:121-125`
- **Rule:** Hard-fail if `verifyLineSignature_` function is missing (no silent fallback)
- **Purpose:** Prevents spoofed LINE webhook payloads

### 3.5 Approval Guard (Client-Side)
- **Location:** `pwa/approval_guard.js`
- **Rule:**
  - 3-second cooldown between approvals (anti double-click)
  - 15-second server timeout
  - High-impact actions require explicit confirmation
  - Server-side validation is the source of truth (client role map is fallback only)
  - Token + Timestamp + Nonce validation (anti-tamper)

### 3.6 Policy Engine (Self-Heal Control)
- **Location:** `pwa/policy_engine.js`
- **Rule:**
  - `SYSTEM_CONTROL.selfHeal` — global kill switch
  - `POLICY.allowAutoFix` — whitelist: `API_ERROR`, `TIMEOUT`, `RATE_LIMIT`
  - `POLICY.denyAutoFix` — blacklist: `SECURITY`, `UNTRUSTED_ACTION`, `CONFIG`, `UNKNOWN`
  - `maxFixPerMinute = 3`
  - Safe mode auto-exit when health > 80 for 2 minutes
  - Audit log persisted to `window.__AI_AUDIT_LOG` and `localStorage.comphone_self_heal_fix_log`

### 3.7 Execution Lock (Client-Side)
- **Location:** `pwa/execution_lock.js`
- **Rule:** Locks `google.script.run` properties to prevent unauthorized GAS access
- **Version:** Tied to `5.6.5`

---

## 4. Deploy Baseline

### 4.1 CI/CD Pipeline
| Workflow | File | Trigger |
|----------|------|---------|
| GAS Deploy | `.github/workflows/deploy-gas.yml` | Push to `main`, `workflow_dispatch` |
| Drive Sync | `.github/workflows/drive-sync.yml` | Push to `main`, `workflow_dispatch` |

### 4.2 Required Secrets (GitHub)
| Secret | Used By | Status |
|--------|---------|--------|
| `CLASPRC_JSON` | `deploy-gas.yml` | User-managed (OAuth2 `.clasprc.json`) |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | `drive-sync.yml` | User-managed (Drive backup) |

### 4.3 Deploy Script (Local/WSL)
| Script | Purpose |
|--------|---------|
| `deploy_all.sh` | Full deploy pipeline (WSL → tar → rclone SA-mode → GitHub push → clasp push) |
| `scripts/setup-clasp-ci.sh` | CI secret setup helper |

### 4.4 Environment Requirement
- GitHub Environment: `production` (must be created manually in repo Settings)

---

## 5. Dependency Manifest

### 5.1 External CDN (Runtime)
| Dependency | Version | URL |
|------------|---------|-----|
| Bootstrap CSS | 5.3.3 | `https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css` |
| Bootstrap Icons | 1.11.3 | `https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css` |
| Chart.js | 4.4.3 | `https://cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.umd.min.js` |

### 5.2 Build / Deploy Tools
| Tool | Version | Purpose |
|------|---------|---------|
| clasp | Latest (npm) | Google Apps Script deploy |
| rclone | Latest (curl) | Google Drive sync/backup |
| GitHub Actions | `ubuntu-latest` | CI runner |

### 5.3 Google Workspace APIs
| API | Scope |
|-----|-------|
| Google Apps Script | Script execution |
| Google Sheets | Data persistence |
| Google Drive | File storage (photos, receipts, PDFs) |
| CacheService | Rate limiting |
| PropertiesService | Configuration |

### 5.4 Integrations
| Service | Use Case |
|---------|----------|
| LINE Messaging API | Webhook, notifications, image handling |
| Gemini API | AI slip verification (`geminiSlipVerify`) |

---

## 6. Load Order Baseline

### 6.1 PWA (`pwa/index.html`)
```
1. error_boundary.js
2. execution_lock.js
3. policy_engine.js
4. ai_executor_runtime.js
5. offline_db.js
6. app.js
7. crm_attendance.js
8. purchase_order.js
9. dashboard.js
10. job_workflow.js
11. billing_customer.js
12. inventory.js
13. inventory_ui.js
14. auth.js
15. billing_slip_verify.js
16. after_sales_enhanced.js
17. push_notifications.js
18. reports.js
19. admin.js
20. auth_guard.js
21. approval_guard.js
22. quick_actions.js
23. attendance_ui.js
24. analytics.js
25. crm_ui.js
26. billing_ui.js
27. admin_panel.js
28. customer_portal.js
29. notification_center.js
```

### 6.2 PC Dashboard (`pwa/dashboard_pc.html`)
```
1. error_boundary.js
2. execution_lock.js?v=566
3. policy_engine.js?v=566
4. ai_executor_runtime.js?v=566
5. approval_guard.js?v=566
6. ai_executor_validation.js?v=566
```

**Invariant:** `policy_engine.js` MUST load before `ai_executor_runtime.js`.

---

## 7. File Manifest (Critical)

| File | Purpose | Frozen |
|------|---------|--------|
| `clasp-ready/Router.gs` | Request routing, auth, rate limit, LINE signature | ✅ YES |
| `clasp-ready/Config.gs` | Canonical version, sheet/folder names | ✅ YES |
| `clasp-ready/Utils.gs` | Shared utilities, Drive safety | ✅ YES |
| `pwa/sw.js` | Service worker, cache management | ✅ YES |
| `pwa/index.html` | PWA entry, script load order | ✅ YES |
| `pwa/dashboard_pc.html` | PC dashboard, version lock | ✅ YES |
| `pwa/policy_engine.js` | Self-heal control, audit log | ✅ YES |
| `pwa/approval_guard.js` | Approval validation, role checks | ✅ YES |
| `pwa/execution_lock.js` | GAS execution lock | ✅ YES |
| `pwa/error_boundary.js` | Global error catching | ✅ YES |
| `.github/workflows/deploy-gas.yml` | GAS deployment pipeline | ✅ YES |
| `.github/workflows/drive-sync.yml` | Drive backup pipeline | ✅ YES |

---

## 8. Verification Checksum (Manual)

```bash
# Verify tag exists
git show v5.6.5-freeze --quiet

# Verify tree clean
git status --short

# Verify version consistency
grep "VERSION.*5.6.5" clasp-ready/Config.gs
grep "CACHE_V.*5.6.5" pwa/sw.js
grep "__APP_VERSION.*5.6.5" pwa/dashboard_pc.html
```

---

**Frozen by:** PHMP v1 Protocol — Architecture Freeze Mode  
**Date:** 2026-04-22  
**Baseline Status:** `IMMUTABLE`  
