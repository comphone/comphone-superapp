# COMPHONE SUPER APP — Security Gap Analysis
## Hotfix b49da80: Direct Fetch Bypass in dashboard_pc.html
## PHMP v1 Protocol | Post-Incident Review

---

## 1. Change Summary

| Before (Broken) | After (Hotfix) |
|-----------------|----------------|
| `callGas()` → `AI_EXECUTOR.execute/query` → `GAS_EXECUTE` → `google.script.run` | `callGas()` → direct `fetch()` to GAS URL |
| Required approval token for ALL actions | No approval token for read actions via fetch |
| Dependent on `google.script.run` runtime | Independent of GAS iframe runtime |

---

## 2. Threat Model Analysis

### 2.1 What Changed?

**Client-side execution path for `dashboard_pc.html`:**

```
[BEFORE]
User → dashboard_pc.html → AI_EXECUTOR.query → GAS_EXECUTE → google.script.run → GAS
                                          → approval token required
                                          → whitelist checked
                                          → nonce + execMeta added

[AFTER]
User → dashboard_pc.html → callGas() → fetch(POST) → GAS Web App URL → GAS
                                    → no approval token
                                    → no whitelist check on client
                                    → basic JSON payload
```

### 2.2 Is This a Security Gap?

**Verdict: NO critical security gap. Acceptable risk for the following reasons:**

| Control Layer | Before | After | Assessment |
|---------------|--------|-------|------------|
| **Auth Gate (Server)** | `_checkAuthGateV55_` enforced | `_checkAuthGateV55_` still enforced | ✅ UNCHANGED — Server still rejects unauthorized actions |
| **Token Validation** | `verifySession(token)` required for write | `verifySession(token)` still required for write | ✅ UNCHANGED — Server-side only |
| **Rate Limiter** | Token-based hash in CacheService | Token-based hash in CacheService | ✅ UNCHANGED |
| **Private Function Guard** | Underscore prefix block | Underscore prefix block | ✅ UNCHANGED — Server-side |
| **Client Approval Gate** | 3s token + whitelist | N/A for read-only | ⚠️  REMOVED for read path only |
| **Client Whitelist** | `__TRUSTED_ACTIONS` checked | Not checked by fetch | ⚠️  REMOVED for read path only |

### 2.3 Attack Scenarios

#### Scenario A: Attacker calls write action from PC Dashboard
- **Path:** `fetch(POST {action: "deleteJob", ...})` to GAS URL
- **Server Response:** `401 AUTH_REQUIRED` — `_checkAuthGateV55_` blocks without token
- **Result:** ✅ BLOCKED at server

#### Scenario B: Attacker bypasses client to call GAS directly
- **Path:** Direct `fetch` to GAS URL with malicious payload
- **Server Response:** Same as any client — auth gate + rate limiter apply
- **Result:** ✅ NO NEW VULNERABILITY — GAS is already a public endpoint

#### Scenario C: Attacker modifies dashboard_pc.html source
- **Path:** If attacker can edit the HTML, they can make any fetch call
- **Mitigation:** Source is in GitHub repo + deployed via CI/CD
- **Result:** ✅ REQUIRES COMPROMISE OF GITHUB/CI FIRST

### 2.4 What Was Actually Lost?

| Lost Control | Impact | Mitigation |
|--------------|--------|------------|
| Client-side `__TRUSTED_ACTIONS` whitelist | Low — Server whitelist is the real gate | Server `_checkAuthGateV55_` |
| 3-second approval token TTL | Low — Token was client-side only anyway | Server session validation |
| `__EXECUTION_LOG` trace on client | Low — Audit trail still on server | Server audit logs |
| Nonce generation | Low — Nonce was not verified server-side | No functional security value |

**Conclusion:** The client-side controls that were "bypassed" were defense-in-depth layers, not primary security boundaries. The primary security boundary (`Router.gs` auth gate + rate limiter) remains intact.

---

## 3. Path Separation Review

### 3.1 Two Different Deployment Contexts

| Aspect | PWA (`index.html`) | PC Dashboard (`dashboard_pc.html`) |
|--------|-------------------|-----------------------------------|
| **Hosting** | GAS Web App (`script.google.com`) | GitHub Pages / static file |
| **Runtime** | Has `google.script.run` | No `google.script.run` |
| **Security Model** | AI_EXECUTOR + approval gate | Direct fetch (stateless) |
| **Primary Use** | Mobile field staff | Office desktop executive view |
| **Write Actions** | Via approval + token | Via approval + token (server gate) |
| **Read Actions** | Via AI_EXECUTOR.query | Via direct fetch |

### 3.2 Is the Separation Correct?

**Verdict: YES — Correct separation.**

The PWA and PC Dashboard serve different contexts:
- PWA runs inside the GAS iframe where `google.script.run` is available
- PC Dashboard is a static HTML file that must use standard HTTP to reach GAS
- Both paths converge at the same server-side `Router.gs` where auth is enforced

### 3.3 Recommended Separation Hardening

To make the separation explicit and prevent future confusion:

1. **Rename `callGas` in dashboard_pc.html** to `callGasDirect` or `fetchGas`
2. **Add header comment** in dashboard_pc.html: `// STATIC HOST PATH — uses direct fetch, not AI_EXECUTOR`
3. **Add runtime detection** in `execution_lock.js`: If `google.script.run` is unavailable, log a clear message instead of retrying for 10s

---

## 4. Recommendations

### Immediate (No Action Required)
- ✅ Hotfix is secure — no rollback needed
- ✅ Continue 48h observation

### Short-Term (Post-Observation)
- Add explicit `// STATIC_HOST` comment to `callGas()` in dashboard_pc.html
- Improve `execution_lock.js` failure message when `google.script.run` absent
- Consider adding CORS headers validation to `fetch()` call

### Long-Term
- Evaluate unifying both paths behind a single `API_CLIENT` abstraction that detects runtime context (GAS iframe vs static) and chooses the appropriate transport
- Add server-side request origin logging to detect unexpected call sources

---

## 5. Final Assessment

| Question | Answer |
|----------|--------|
| Did hotfix create new vulnerabilities? | **No** — Server-side gates unchanged |
| Did hotfix weaken existing security? | **Marginally** — Removed client-side defense-in-depth for read path only |
| Is the risk acceptable? | **Yes** — For read-only dashboard data on a public endpoint |
| Should we revert? | **No** — Revert would re-break dashboard |
| Should we harden further? | **Yes** — Add explicit path separation comments + improve error messages |

---

**Analyst:** PHMP v1 Post-Incident Review  
**Date:** 2026-04-22  
**Hotfix:** b49da80  
**Classification:** NOT A SECURITY REGRESSION
