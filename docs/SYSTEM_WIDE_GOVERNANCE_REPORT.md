# 🔥 COMPHONE SUPER APP — System-Wide Governance Report
## PHMP v1 Full System Discovery | 2026-04-24 07:40 ICT

---

## SYSTEM SNAPSHOT

| Metric | Value |
|--------|-------|
| Total Files | 776 |
| Backend (.gs) | 80 files (1.6MB) |
| Frontend (pwa/) | 62 files (1.4MB) |
| Scripts | 34 files (308KB) |
| Version | v5.6.8 (PWA) / v5.6.5 (GAS @491) |
| HTML Surfaces | 5 (dashboard_pc, index, executive, monitoring, customer_portal) |
| Scheduled Triggers | 10 |
| Script Properties | ~49/50 (near limit) |

---

## RISK MATRIX

### 🔴 CRITICAL (Must fix before next feature phase)

| # | Risk | Root Cause | Blast Radius | Remediation |
|---|------|-----------|--------------|-------------|
| C1 | **No auth on 40+ write actions** | Router.gs POST handler has no centralized auth gate. `createJob`, `deleteInventoryItem`, `createCustomer`, `updateJobStatus` etc. are all callable without token. | Full data manipulation by anyone with GAS URL | Implement `_checkAuthGateV55_` with whitelist of public actions |
| C2 | **GAS URL hardcoded in 7 files** | Each HTML/JS file has its own copy of the URL. If deployment changes, 7 files must be updated. | Total system breakage if URL drifts | Use `gas_config.js` as single source; remove hardcoded URLs from other files |
| C3 | **invokeFunctionByNameV55_ no underscore guard** | Function allows calling any global function including private `_prefixed` ones | Potential call to internal GAS functions | Add `if (functionName.charAt(0) === '_') return error` |

### 🟡 MEDIUM (Should fix within 2 weeks)

| # | Risk | Root Cause | Blast Radius | Remediation |
|---|------|-----------|--------------|-------------|
| M1 | **120+ innerHTML XSS vectors** | All sections render API data via innerHTML without sanitization | XSS if Sheet data is tainted | Use DOMPurify or `textContent` for user data |
| M2 | **Script Properties at 49/50** | LineBotQuota.gs uses 27 properties alone | New features can't store config | Audit and consolidate properties |
| M3 | **No automated test suite** | Only browser-smoke-test.py exists (runtime check, not unit test) | Regressions discovered in production | Add basic test suite for critical paths |
| M4 | **callGas() uses GET for writes** | All API calls go through GET including create/delete/update | Violates HTTP semantics, cache confusion | Migrate writes to POST with auth header |
| M5 | **ai_executor_validation.js in index.html** | Loaded in PWA mobile but was flagged as recurrence pattern | Potential runtime conflicts | Verify intentional; document or remove |

### 🟢 LOW (Track, fix opportunistically)

| # | Risk | Detail |
|---|------|--------|
| L1 | Dead/orphaned JS files | Some pwa/*.js only loaded by index.html, not dashboard_pc |
| L2 | customer_sw.js not in any HTML load order | Only used by customer_portal.html (minor) |
| L3 | SW cache cleanup warning | May serve stale assets after deploy |
| L4 | No clasp.json | Can't use clasp CLI directly; using API fallback |
| L5 | 10 triggers approaching 20 limit | Growth path blocked |

---

## ARCHITECTURE HEALTH

### Data Flow Integrity ✅
```
User → PWA/HTML → callGas() → GET GAS_URL → Router.gs → Handler → Sheets
                                                                        ↓
                                                              Response → JSON → UI
```
Flow is clean, single-pipeline. No circular dependencies detected.

### Load Order ✅
```
dashboard_pc.html:
  gas_config.js → error_boundary.js → execution_lock.js → policy_engine.js
  → ai_executor_runtime.js → approval_guard.js → billing/attendance/warranty

index.html:
  gas_config.js → error_boundary.js → execution_lock.js → policy_engine.js
  → ai_executor_runtime.js → ai_executor_validation.js → offline_db.js → api_client.js
  → app.js → [all feature modules]
```
Policy engine correctly loads before AI executor. No load-order violations.

### Version Sync
| Surface | Version | Status |
|---------|---------|--------|
| Config.gs (backend) | 5.6.5 | ✅ Expected (no backend changes) |
| sw.js | 5.6.8 | ✅ |
| dashboard_pc.html | 5.6.8 | ✅ |
| Cache bust params | ?v=282 | ✅ Fixed this session |
| SW CACHE_V | comphone-v5.6.8 | ✅ |

### IndexedDB Coupling ✅
- SW: DB_VERSION=2, store: 'queue'
- offline_db.js: DB_VERSION=2, stores: 'action_queue', 'data_cache'
- Both at v2, compatible.

---

## WHAT WAS FIXED THIS SESSION

| # | Fix | File | Impact |
|---|-----|------|--------|
| 1 | Cache bust normalization | dashboard_pc.html | All 9 scripts now use `?v=282` consistently |
| 2 | Drift guard baseline update | drift-guard.sh | Baseline updated from v5.6.5 to v5.6.8 |
| 3 | Drift guard version check logic | drift-guard.sh | Now checks frontend consistency (SW==PC) instead of hardcoded 5.6.5 |
| 4 | Impact audit created | docs/IMPACT_AUDIT.md | Phase 28 changes fully documented |
| 5 | Staging workflow created | docs/STAGING_WORKFLOW.md | Branch naming + merge flow |
| 6 | Pre-merge gate created | scripts/pre-merge-gate.sh | 6-check automated gate |
| 7 | Google Drive token verified | ~/.comphone/ | Token valid for narinoutagit@gmail.com |

---

## REMAINING GOVERNANCE DEBT (Prioritized)

### Immediate (Before ANY new feature)
1. **Implement `_checkAuthGateV55_`** in Router.gs — whitelist public actions, require token for all others
2. **Add underscore guard** to `invokeFunctionByNameV55_`
3. **Consolidate GAS URL** — use gas_config.js as single source, remove from 6 other files

### Short-term (Within 2 weeks)
4. Add DOMPurify or sanitize innerHTML in new sections
5. Migrate write API calls from GET to POST
6. Audit Script Properties (consolidate 49 → <30)
7. Add automated test suite

### Long-term
8. Customer Portal integration
9. Design system / component library
10. Predictive maintenance

---

## SYSTEM POSTURE

```json
{
  "architecture": "SOUND — clean data flow, no circular deps",
  "security": "WEAK — no centralized auth gate on write actions",
  "governance": "RECOVERED — impact audit, staging flow, pre-merge gate in place",
  "deployment": "FUNCTIONAL — GitHub Pages + GAS API deploy, no clasp CLI",
  "automation": "PARTIAL — drift/regression guards exist but not enforced in CI",
  "monitoring": "PRESENT — monitoring dashboard, health monitor GS",
  "test_coverage": "MINIMAL — only browser smoke test",
  "system_posture": "YELLOW"
}
```

**YELLOW because:**
- Security gap (no auth on writes) is CRITICAL but pre-existing
- Governance framework is now in place
- System is functionally stable
- All new code follows established patterns
- No active incidents

**To reach GREEN:**
1. Implement centralized auth gate (C1)
2. Fix underscore guard (C3)
3. Pass full regression guard
4. One clean staging-to-main cycle

---

## VERIFICATION RESULTS

| Check | Result | Detail |
|-------|--------|--------|
| Drift Guard | ❌ 2 issues | Both pre-existing (auth gate, underscore guard) |
| Regression Guard | ❌ 5 issues | All pre-existing, no new regressions |
| Browser Smoke Test | ⚠️ 1 pattern | callGas GET-for-write (pre-existing) |
| Version Sync | ✅ PASS | SW=PC=5.6.8, Config=5.6.5 (expected) |
| Load Order | ✅ PASS | Policy before AI executor |
| IndexedDB | ✅ PASS | Both at v2, compatible |
| Cache Bust | ✅ PASS | All scripts at ?v=282 |
| Impact Audit | ✅ EXISTS | docs/IMPACT_AUDIT.md |
| Staging Workflow | ✅ EXISTS | docs/STAGING_WORKFLOW.md |
| Pre-merge Gate | ✅ EXISTS | scripts/pre-merge-gate.sh |

---

## CONCLUSION

ระบบ COMPHONE SUPER APP อยู่ในสถานะ **YELLOW** — ทำงานได้ปกติ, governance framework ถูกสร้างแล้ว, แต่ยังมี security debt ที่ต้องปิดก่อน feature phase ถัดไป

**สิ่งที่ทำแล้ววันนี้:**
- Full system scan (776 files, 80 backend, 62 frontend)
- Cache bust inconsistency fixed
- Impact audit created
- Staging workflow + pre-merge gate created
- Drift guard baseline updated
- Google Drive token verified working
- 7 fixes applied, 0 regressions introduced

**สิ่งที่ต้องทำต่อ (ลำดับความสำคัญ):**
1. 🔴 Auth gate implementation (C1)
2. 🔴 Underscore guard (C3)
3. 🟡 GAS URL consolidation (C2)
4. 🟡 innerHTML sanitization (M1)
5. 🟢 Full staging-to-main cycle

**System Posture: 🟡 YELLOW → GREEN criteria: auth gate + clean staging cycle**
