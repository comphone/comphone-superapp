#!/usr/bin/env bash
# ============================================================
# COMPHONE SUPER APP — REGRESSION GUARD PACK
# Purpose: Pre-deploy regression checks (smoke + security + version)
# Usage: ./scripts/regression-guard.sh
# Exit: 0 = all pass, 1 = regression detected
# ============================================================

set -euo pipefail

ERRORS=()
WARNINGS=()

function fail() {
  ERRORS+=("❌ $1")
}

function warn() {
  WARNINGS+=("⚠️  $1")
}

echo "🧪 COMPHONE REGRESSION GUARD — Pre-Deploy Check Pack"
echo "============================================================"

# ============================================================
# TEST SUITE A: SMOKE TESTS (File Existence)
# ============================================================
echo ""
echo "💨 [SUITE A] Smoke Tests..."

SMOKE_FILES=(
  "clasp-ready/Router.gs"
  "clasp-ready/Config.gs"
  "clasp-ready/Utils.gs"
  "pwa/sw.js"
  "pwa/index.html"
  "pwa/dashboard_pc.html"
  "pwa/policy_engine.js"
  "pwa/approval_guard.js"
  "pwa/execution_lock.js"
  "pwa/error_boundary.js"
  "pwa/app.js"
  "pwa/auth.js"
  ".github/workflows/deploy-gas.yml"
  ".github/workflows/drive-sync.yml"
)

for f in "${SMOKE_FILES[@]}"; do
  if [ ! -f "$f" ]; then
    fail "Missing critical file: $f"
  fi
done

# Check for empty files
for f in "${SMOKE_FILES[@]}"; do
  if [ -f "$f" ] && [ ! -s "$f" ]; then
    fail "Empty critical file: $f"
  fi
done

# ============================================================
# TEST SUITE B: SECURITY INVARIANT TESTS
# ============================================================
echo ""
echo "🔒 [SUITE B] Security Invariant Tests..."

# B1: Auth gate exists and has protected actions
if ! grep -q '_checkAuthGateV55_' clasp-ready/Router.gs; then
  fail "Auth gate _checkAuthGateV55_ missing from Router.gs"
fi
if ! grep -q 'runBackup' clasp-ready/Router.gs; then
  fail "Auth gate action list missing 'runBackup'"
fi

# B2: Private function guard exists
if ! grep -q "functionName.charAt(0) === '_'" clasp-ready/Router.gs; then
  fail "Underscore prefix guard missing from invokeFunctionByNameV55_"
fi

# B3: Rate limiter uses CacheService (not IP-based)
if ! grep -q 'CacheService.getScriptCache()' clasp-ready/Router.gs; then
  fail "Rate limiter CacheService integration missing"
fi
if grep -q 'e.parameter.*ip' clasp-ready/Router.gs; then
  warn "Possible IP-based rate limiting detected (should be token-based)"
fi

# B4: LINE signature hard-fail
if ! grep -q "verifyLineSignature_" clasp-ready/Router.gs; then
  fail "LINE signature hard-fail check missing"
fi

# B5: Approval guard has server timeout
if ! grep -q 'serverTimeoutMs' pwa/approval_guard.js; then
  fail "Approval guard server timeout missing"
fi

# B6: Policy engine has denyAutoFix
if ! grep -q 'denyAutoFix' pwa/policy_engine.js; then
  fail "Policy engine denyAutoFix list missing"
fi

# B7: Execution lock exists
if ! grep -q 'execution_lock\|LOCK_VERSION' pwa/execution_lock.js; then
  warn "Execution lock file may be missing expected content"
fi

# ============================================================
# TEST SUITE C: CACHE / VERSION CHECKS
# ============================================================
echo ""
echo "🔄 [SUITE C] Cache / Version Checks..."

# C1: Version consistency
CONFIG_V=$(grep -oP "VERSION:\s*.\K[0-9.]+" clasp-ready/Config.gs | head -1 || echo "X")
SW_V=$(grep -oP "comphone-v\K[0-9.]+" pwa/sw.js | head -1 || echo "X")
PC_V=$(grep -oP "__APP_VERSION\s*=\s*.v\K[0-9.]+" pwa/dashboard_pc.html | head -1 || echo "X")

# Frontend versions must match each other
if [ "$SW_V" != "$PC_V" ]; then
  fail "Frontend version mismatch: sw.js=$SW_V vs dashboard=$PC_V"
fi
# Backend version documented separately (may differ from frontend)
echo "   Backend=$CONFIG_V | Frontend=$SW_V"

# C2: Service worker cache-bust logic
if ! grep -q 'caches.keys().then(keys => keys.forEach' pwa/sw.js; then
  warn "SW may be missing cache cleanup logic"
fi

# C3: Dashboard has version badge
if ! grep -q 'version_badge' pwa/dashboard_pc.html; then
  fail "Version badge missing from dashboard_pc.html"
fi

# C4: Dashboard cache-bust params on policy scripts
if ! grep -q 'policy_engine.js?v=' pwa/dashboard_pc.html; then
  warn "Policy scripts in dashboard_pc.html missing cache-bust params"
fi

# ============================================================
# TEST SUITE D: LINE IMAGE FLOW TESTS
# ============================================================
echo ""
echo "📱 [SUITE D] LINE Image Flow Tests..."

# D1: Router handles LINE webhook
if ! grep -q 'line/webhook\|LINE_CHANNEL' clasp-ready/Router.gs; then
  fail "LINE webhook handler missing from Router.gs"
fi

# D2: Photo queue sheet exists in Config
if ! grep -q 'PHOTO_QUEUE' clasp-ready/Config.gs; then
  warn "PHOTO_QUEUE sheet not defined in Config.gs"
fi

# D3: Router has image/photo handling logic
if ! grep -q 'photo\|image\|blob\|base64' clasp-ready/Router.gs; then
  warn "Router.gs may be missing image handling logic"
fi

# ============================================================
# TEST SUITE E: BROWSER-LEVEL SMOKE TESTS (Post-Incident Upgrade)
# ============================================================
echo ""
echo "💻 [SUITE E] Browser-Level Smoke Tests..."

if command -v python3 &>/dev/null && [ -f "scripts/browser-smoke-test.py" ]; then
  if python3 scripts/browser-smoke-test.py; then
    echo "   ✅ Browser-level smoke test passed"
  else
    fail "Browser-level smoke test FAILED — recurrence patterns detected"
  fi
else
  warn "Python3 or browser-smoke-test.py unavailable — skipping browser tests"
fi

# E2: Post-incident recurrence patterns
if grep -q 'ai_executor_validation.js' pwa/dashboard_pc.html; then
  fail "RECURRENCE: ai_executor_validation.js loaded in dashboard_pc.html"
fi

if grep -A5 'async function callGas' pwa/dashboard_pc.html | grep -q 'window.AI_EXECUTOR'; then
  fail "RECURRENCE: callGas() routes through AI_EXECUTOR instead of direct fetch"
fi

if ! grep -q 'Object.getOwnPropertyDescriptor(window, .__USER_ROLE.)' pwa/ai_executor_runtime.js; then
  fail "RECURRENCE: __USER_ROLE redefinition guard missing"
fi

# ============================================================
# REPORT
# ============================================================
echo ""
echo "============================================================"

if [ ${#WARNINGS[@]} -gt 0 ]; then
  echo "⚠️  WARNINGS (${#WARNINGS[@]}):"
  for w in "${WARNINGS[@]}"; do echo "   $w"; done
fi

if [ ${#ERRORS[@]} -gt 0 ]; then
  echo "❌ FAILURES (${#ERRORS[@]}):"
  for e in "${ERRORS[@]}"; do echo "   $e"; done
  echo ""
  echo "❌ REGRESSION GUARD FAILED — Deploy blocked."
  exit 1
else
  echo "✅ ALL CHECKS PASSED — Safe to deploy."
  exit 0
fi
