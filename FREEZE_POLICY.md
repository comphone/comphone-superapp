# COMPHONE SUPER APP — Architecture Freeze Policy
## PHMP v1 Protocol | Effective: 2026-04-22

---

## 1. Purpose

This document defines the **Architecture Freeze Rules** for the COMPHONE SUPER APP following the PHMP v1 stabilization audit. The goal is to prevent **drift**, **regression**, and **unauthorized architectural changes** while the system maintains a **GREEN** posture.

---

## 2. Scope

This policy applies to:
- All source code in `clasp-ready/`, `pwa/`, `.github/workflows/`
- CI/CD pipeline definitions
- Security invariants (auth gates, rate limiting, approval flows)
- Version synchronization mechanisms
- Service worker and caching strategies

---

## 3. Freeze Rules

### Rule 1: No Architecture Changes Without Impact Audit
- **Any change** to routing logic, auth mechanisms, caching strategy, or deployment pipeline **MUST** be accompanied by an `IMPACT_AUDIT.md` document.
- The audit must cover: security implications, performance impact, backward compatibility, and rollback plan.
- Approval required from project owner (Khun Nong) before merge.

### Rule 2: All New Features Must Pass Staging
- **No feature** may be deployed directly to `main` without passing through a staging environment.
- Staging validation must include:
  - Smoke tests
  - Security invariant checks (run `scripts/regression-guard.sh`)
  - Load-order verification
  - Manual approval gate test
- Staging branch naming: `staging/v{VERSION}-{feature}`

### Rule 3: Security Invariants Are Immutable
- The following security mechanisms are **frozen** and may not be modified, disabled, or bypassed:
  1. `_checkAuthGateV55_` in `Router.gs`
  2. `invokeFunctionByNameV55_` underscore prefix guard
  3. Token-based rate limiter (`CacheService` hash)
  4. `verifyLineSignature_` hard-fail for LINE webhooks
  5. Approval guard cooldown + server validation
  6. Policy engine `maxFixPerMinute` and `denyAutoFix` list
- **Exception:** Hotfix for active security vulnerability — requires emergency override log.

### Rule 4: Hotfixes Must Not Bypass Baseline
- Hotfixes are allowed **only** for:
  - Active outages (RED posture)
  - Security vulnerabilities
  - Data integrity failures
- Hotfix requirements:
  - Branch from `v5.6.5-freeze` tag
  - Naming: `hotfix/{YYYYMMDD}-{description}`
  - Must include regression test results
  - Must update `docs/BASELINE_v5.6.5.md` with a "Hotfix History" section
  - Must be merged back to `main` and re-tagged if it becomes the new baseline

### Rule 5: Version Lock
- The canonical version `5.6.5` must remain synchronized across all 7 surfaces listed in `docs/BASELINE_v5.6.5.md`.
- Any version bump requires simultaneous update to **all** surfaces to prevent invalidation loops.

### Rule 6: Drift Detection Is Mandatory
- `scripts/drift-guard.sh` must be run:
  - Before every manual deploy
  - In CI pipeline before `clasp push`
  - After any merge to `main`
- If drift is detected, deployment is **blocked** until resolved.

---

## 4. Enforcement

| Layer | Mechanism |
|-------|-----------|
| **Pre-commit** | `scripts/drift-guard.sh` run by developer |
| **CI Gate** | GitHub Actions runs `scripts/regression-guard.sh` |
| **Post-merge** | Tag-based comparison alerts if `main` diverges from `v5.6.5-freeze` |
| **Audit Trail** | All freeze rule exceptions logged in `docs/FREEZE_EXCEPTIONS.md` |

---

## 5. Escalation

If a business-critical change conflicts with this freeze policy:
1. Document the conflict in `docs/FREEZE_EXCEPTIONS.md`
2. Propose a phased unfreeze plan (which invariants to relax, for how long)
3. Obtain explicit written approval from project owner
4. Execute with elevated monitoring

---

## 6. Policy Maintenance

This policy is versioned independently of the application:
- **Policy Version:** `FREEZE-2026-04-22-v1`
- **Review Cycle:** Every 90 days or after any major incident
- **Owner:** System Architect / Khun Nong

---

**Status:** `ACTIVE`  
**Architecture Status:** `FROZEN`  
**Next Review:** 2026-07-22
