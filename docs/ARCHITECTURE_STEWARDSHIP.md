# 🏛️ COMPHONE SUPER APP — Architecture Stewardship Plan
## PHMP v1 Long-Term Resilience | 2026-04-24

---

## Stewardship Philosophy

GREEN is not a destination — it's a **state that requires active maintenance**.
This plan ensures GREEN posture survives team changes, feature growth, and time.

---

## Current State Summary

| Metric | Value |
|--------|-------|
| Backend files | 67 .gs (30,004 lines) |
| Frontend files | 43 .js (19,308 lines) |
| Router actions | 283 case statements |
| Auth gate coverage | 100% writes (default-deny) |
| Enforcement layers | 3 (pre-commit, pre-merge, deploy) |
| Guard self-test | 6/6 passing |

---

## Stewardship Risks

### 1. Enforcement Decay

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Pre-commit hook not installed by new contributor | HIGH | HIGH | Hook tracked in repo + install script documented |
| deploy_all.sh guard bypassed (manual deploy) | MEDIUM | HIGH | Document: ALL deploys must use deploy_all.sh |
| Guard patterns become stale as code evolves | MEDIUM | MEDIUM | Guard self-test catches this |
| GitHub Actions has no guard enforcement | MEDIUM | MEDIUM | Add guard step to CI workflow (future) |

### 2. Complexity Growth

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Router.gs grows beyond maintainable size | HIGH | MEDIUM | Already 1321 lines — consider RouterSplit refactor |
| Inventory.gs (1492 lines) accumulates debt | MEDIUM | LOW | Monitor, refactor when >2000 lines |
| New actions added without auth gate review | MEDIUM | HIGH | Default-deny protects; review PUBLIC whitelist additions |
| innerHTML XSS surface grows | MEDIUM | MEDIUM | sanitizeHTML() available; enforce in code review |

### 3. Configuration Drift

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| GAS URL changes, 3 fallback files not updated | LOW | HIGH | Consolidated to GAS_CONFIG.url; fallbacks are safety net |
| Config.gs version diverges from frontend | LOW | LOW | Documented as expected (backend != frontend) |
| SW cache version not bumped on deploy | MEDIUM | MEDIUM | Pre-commit checks frontend version sync |
| Script Properties exceed 50 limit | LOW | LOW | Currently 17 unique keys — safe margin |

### 4. Knowledge Loss

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| New maintainer doesn't know PHMP protocol | MEDIUM | HIGH | BLUEPRINT.md + FREEZE_POLICY.md + this document |
| Guard logic not understood | MEDIUM | MEDIUM | Guards are simple grep checks — self-documenting |
| Session context lost between AI sessions | LOW | MEDIUM | memory/session.md + Hermes memory system |

---

## Preventive Evolution Roadmap

### Phase 1: Immediate (This Session) ✅

| # | Measure | Status |
|---|---------|--------|
| 1 | Pre-commit hook tracked in repo (scripts/hooks/pre-commit) | ✅ Done |
| 2 | install-hooks.sh updated to copy from tracked location | ✅ Done |
| 3 | Guard self-test script (scripts/guard-self-test.sh) | ✅ Done |
| 4 | Stewardship plan documented | ✅ Done |

### Phase 2: Short-Term (Next 2 Weeks)

| # | Measure | Effort |
|---|---------|--------|
| 1 | Add guard step to GitHub Actions workflow | 30 min |
| 2 | Apply sanitizeHTML() to Phase 28 section table renders | 1 hour |
| 3 | Create weekly health check cron (drift + regression + self-test) | 30 min |
| 4 | Document auth gate PUBLIC/ADMIN whitelists in BLUEPRINT.md | 30 min |

### Phase 3: Medium-Term (Next Month)

| # | Measure | Effort |
|---|---------|--------|
| 1 | RouterSplit refactor — extract auth actions to separate module | 4 hours |
| 2 | Add basic API test suite (auth check, CRUD validation) | 4 hours |
| 3 | Complexity monitoring — alert when files exceed 1500 lines | 1 hour |
| 4 | Migrate write API calls from GET to POST | 8 hours |

### Phase 4: Long-Term (Next Quarter)

| # | Measure | Effort |
|---|---------|--------|
| 1 | Full CI/CD with guard enforcement in GitHub Actions | 4 hours |
| 2 | Automated guard pattern updates (detect new actions) | 2 hours |
| 3 | Design system + component library | 16 hours |
| 4 | Customer Portal integration | 8 hours |

---

## Enforcement Chain (Current + Planned)

```
TODAY:
  Pre-commit → Deploy Pipeline → Production

PLANNED (Phase 2):
  Pre-commit → GitHub Actions CI → Pre-merge Gate → Deploy Pipeline → Production

FUTURE (Phase 4):
  Pre-commit → GitHub Actions CI (guards + tests) → Pre-merge Gate
  → Staging Deploy → Smoke Test → Production Deploy → Post-deploy Verify
```

---

## Key Principles

1. **Default-deny** — Auth gate blocks everything not explicitly whitelisted
2. **Defense in depth** — Multiple enforcement layers (pre-commit, deploy, CI)
3. **Self-testing** — Guards must be able to detect their own removal
4. **Documentation as code** — Stewardship plans tracked in repo
5. **Simplicity over cleverness** — Guards are grep checks, not complex logic

---

## Review Schedule

| Review | Frequency | Scope |
|--------|-----------|-------|
| Guard self-test | Weekly | Run scripts/guard-self-test.sh |
| Drift guard | Before every deploy | Run scripts/drift-guard.sh |
| Regression guard | Before every merge | Run scripts/regression-guard.sh |
| Stewardship review | Monthly | Review this document + update roadmap |
| Full architecture audit | Quarterly | Complete system scan + risk assessment |
