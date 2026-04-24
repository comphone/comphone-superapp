# 🔄 COMPHONE SUPER APP — Staging Workflow (PHMP v1)
## Generated: 2026-04-24 | Governance Recovery

---

## Workflow

```
feature/xxx ──► pre-merge-gate.sh ──► staging/vX.Y.Z ──► smoke test ──► main
                                              │
                                              ▼
                                    regression-guard.sh
                                    drift-guard.sh
                                    impact audit review
                                    manual approval
```

## Branch Naming Convention

| Prefix | Use Case |
|--------|----------|
| `feature/*` | New features |
| `fix/*` | Bug fixes |
| `hotfix/*` | Emergency production fixes |
| `staging/*` | Pre-release staging branches |

## Step-by-Step

### 1. Create Feature Branch
```bash
git checkout main
git pull origin main
git checkout -b feature/my-feature
```

### 2. Develop & Commit
```bash
# Make changes...
git add -A
git commit -m "FEATURE: description"
```

### 3. Run Pre-Merge Gate
```bash
bash scripts/pre-merge-gate.sh feature/my-feature
# Must pass ALL checks before proceeding
```

### 4. Create Staging Branch
```bash
git checkout -b staging/v5.6.9-my-feature
git merge feature/my-feature
```

### 5. Smoke Test on Staging
- Open `dashboard_pc.html?v=staging` in browser
- Test all affected sections
- Run browser smoke test: `python3 scripts/browser-smoke-test.py`

### 6. Merge to Main
```bash
git checkout main
git merge staging/v5.6.9-my-feature
git tag -a v5.6.9-freeze -m "New freeze baseline"
git push origin main --tags
```

### 7. Post-Merge
```bash
bash scripts/drift-guard.sh v5.6.9-freeze
bash scripts/regression-guard.sh
```

---

## Rules

1. **No direct commits to main** — Always go through feature branch + gate
2. **Hotfixes** branch from the current freeze tag, not from main
3. **Every merge** requires passing `pre-merge-gate.sh`
4. **Every release** gets a new `vX.Y.Z-freeze` tag
5. **Impact audit** required for any change touching security, auth, or routing

---

## Emergency Override

If production is DOWN (RED posture):
1. Document the emergency in `docs/FREEZE_EXCEPTIONS.md`
2. Create `hotfix/YYYYMMDD-description` branch from freeze tag
3. Fix and test
4. Merge with `--no-verify` if gate fails on non-critical checks
5. Update freeze tag post-merge
