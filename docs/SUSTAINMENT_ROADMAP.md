# 🛡️ COMPHONE SUPER APP — Sustainment Roadmap
## PHMP v1 Long-Term Maintainability | 2026-04-24

---

## GREEN Posture Durability Assessment

### What Makes GREEN Fragile

| Fragility Point | Risk | Mitigation |
|----------------|------|------------|
| Guards exist but weren't enforced | Someone deploys without running guards | ✅ FIXED: deploy_all.sh now blocks on guard failure |
| No pre-commit enforcement | Bad code committed without checks | ✅ FIXED: Enhanced pre-commit hook with security invariants |
| innerHTML sanitizer exists but not applied | XSS vectors remain in old code | Sanitizer available; apply incrementally |
| No automated test suite | Regressions found in production | Add basic test suite (future phase) |
| Script Properties near limit | New features can't store config | Audit and consolidate (17 unique keys — actually safe) |
| Manual deploy process | Human error in deploy sequence | Guards now automated in deploy_all.sh |

### GREEN Criteria (Must Maintain)

| # | Criterion | Enforcement |
|---|-----------|-------------|
| 1 | `_checkAuthGateV55_` in Router.gs | Pre-commit + deploy_all.sh |
| 2 | Underscore guard in `invokeFunctionByNameV55_` | Pre-commit + deploy_all.sh |
| 3 | LINE signature verification present | Pre-commit + deploy_all.sh |
| 4 | Frontend version sync (SW==PC) | Pre-commit + deploy_all.sh |
| 5 | Drift guard passes | Pre-merge gate (manual) |
| 6 | Regression guard passes | Pre-merge gate (manual) |
| 7 | Impact audit exists for changes | Pre-merge gate (manual) |

---

## Hardening Roadmap

### Tier 1: Automation (This Session) ✅

| # | Measure | Status |
|---|---------|--------|
| 1 | Enhanced pre-commit hook (syntax + security invariants + version sync) | ✅ Done |
| 2 | deploy_all.sh security guard checks | ✅ Done |
| 3 | Pre-merge gate script | ✅ Done (previous session) |

### Tier 2: Prevention (Next 2 Weeks)

| # | Measure | Priority | Effort |
|---|---------|----------|--------|
| 1 | Apply `sanitizeHTML()` to Phase 28 sections (billing, attendance, warranty) | MEDIUM | 1 hour |
| 2 | Add `sanitizeHTML()` to index.html sections with API data rendering | MEDIUM | 2 hours |
| 3 | Consolidate Script Properties (audit 17 keys, remove unused) | LOW | 30 min |
| 4 | Document which actions are public vs admin in BLUEPRINT.md | LOW | 30 min |

### Tier 3: Resilience (Next Month)

| # | Measure | Priority | Effort |
|---|---------|----------|--------|
| 1 | Add basic test suite (API response validation, auth check tests) | HIGH | 4 hours |
| 2 | Migrate write API calls from GET to POST | MEDIUM | 8 hours |
| 3 | Add DOMPurify as proper dependency (replace lightweight sanitizer) | LOW | 1 hour |
| 4 | Create weekly health check cron job (drift + regression + properties) | MEDIUM | 1 hour |

### Tier 4: Architecture (Future Phases)

| # | Measure | Priority | Effort |
|---|---------|----------|--------|
| 1 | Centralized GAS URL (gas_config.js as true single source, remove all fallbacks) | LOW | 2 hours |
| 2 | Customer Portal integration | LOW | 8 hours |
| 3 | Design system / component library | LOW | 16 hours |
| 4 | Automated CI guard enforcement (GitHub Actions) | MEDIUM | 2 hours |

---

## Enforcement Chain

```
Code Change
    │
    ▼
[Pre-commit Hook] ─── JS syntax + security invariants + version sync
    │                   Blocks commit if fails
    ▼
[Pre-merge Gate] ───── drift-guard + regression-guard + impact audit
    │                   Blocks merge to main if fails
    ▼
[Deploy Pipeline] ──── security invariants + version sync + core files
    │                   Blocks deploy if fails
    ▼
[Production] ───────── GitHub Pages auto-deploys from main
```

---

## Monitoring Checklist (Weekly)

- [ ] Run `bash scripts/drift-guard.sh` — should pass
- [ ] Run `bash scripts/regression-guard.sh` — should pass
- [ ] Check Script Properties count (should be <40)
- [ ] Check GAS deployment URL matches gas_config.js
- [ ] Review any new innerHTML usage in PRs
- [ ] Verify auth gate covers any new actions added

---

## Key Lessons (From This Recovery)

1. **Guards without enforcement are documentation, not protection** — must be in the deploy pipeline
2. **Version drift is the #1 cause of user confusion** — cache busting must be consistent
3. **Auth must be centralized** — per-action inline auth creates gaps
4. **Security patterns must match code** — guards checking wrong patterns cause false failures
5. **GREEN is not permanent** — it requires active maintenance
