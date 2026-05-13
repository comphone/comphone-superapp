# COMPHONE Recovery Audit - 2026-05-13

## Recovery Action

The repository was restored from the last known stable local baseline:

- `db942bd Phase 72 harden jobs menu flow`
- PWA version: `v5.18.34-job-menu-hardening`
- Stable validation baseline: Static Guard OK, Menu Journey Audit 100/100, System Integrity 100/100, protected API smoke OK.

The damaged Phase 74 working state was preserved before recovery:

- Safety branch: `codex/safety-before-recovery-20260513`
- Stash: `pre-recovery-phase74-damaged-state-20260513`

## Damage Found

Before recovery, current `main` had moved to:

- `4e5a791 v9.0.0-phase74: Content-Type header + ANYONE_ANONYMOUS + SPREADSHEET_ID fix`

Compared with `db942bd`:

- Baseline tracked files: 502
- Damaged tracked files: 65
- Missing tracked files: 458
- Missing from working tree: 457

Critical missing areas included:

- `BLUEPRINT.md`
- `.github/workflows/*`
- most `scripts/*` guard/deploy/smoke tooling
- PWA modules for offline/PWA install/runtime self-test/reports/AI Vision/LINE Center
- many `clasp-ready/*` GAS modules, including `Config.gs`, `RouterSplit.gs`, `LineCommandCenter.gs`, `VisionPipeline.gs`, `Utils.gs`, `Reports.gs`, and `Security.gs`

## API URL Finding

The damaged working tree had this frontend URL:

```text
https://script.google.com/macros/s/1-aoCd5gXoo1dX4FjW62l8JknR3ZPiaf1W7YEmEdtq8gnRzSp4Hwj6043/exec
```

That is a script ID style URL, not a Web App deployment URL. A direct probe returned HTTP 404.

The recovered tree was then redeployed from the restored GAS source. The current recovered Web App deployment URL is:

```text
https://script.google.com/macros/s/AKfycbwN_mbyHOJ4vXRNpHjuN8dUFbXjERwtgTbNROt5_ynakfYm6Xv4RrgvhPMvI53lIhPWBA/exec
```

This deployment is GAS `@604`. It returned JSON for both `health` and `getVersion`.

## Current Validation

Passed after recovery:

- `node scripts\pwa_static_guard.js`
- `node scripts\pwa_menu_journey_audit.js`
- `node scripts\system_integrity_audit.js`
- `node scripts\ci_readiness_check.js`
- `node scripts\build_code_index.js`
- `node scripts\pwa_ui_surface_audit.js`
- `node scripts\pwa_ui_write_contract.js`
- `node scripts\vision_capability_audit.js`
- protected `node scripts\pwa_api_smoke.js` with a fresh admin token

Known remaining item:

- `vision_runtime_smoke.js` still fails the readiness gate because `health.checks.config.gemini_ok=false`. The Apps Script project needs a real Gemini key restored in Script Properties under one of these supported names: `GEMINI_API_KEY`, `GOOGLE_AI_API_KEY`, `GOOGLE_GEMINI_API_KEY`, or `GEMINI_KEY`.

## Next Validation Rule

The repository must not be pushed from a reduced tree again. Minimum pre-push checks:

```powershell
node scripts\pwa_static_guard.js
node scripts\pwa_menu_journey_audit.js
node scripts\system_integrity_audit.js
node scripts\ci_readiness_check.js
node scripts\build_code_index.js
bash -lc './scripts/regression-guard.sh'
```

Protected API smoke requires a fresh login token.
