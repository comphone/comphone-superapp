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
if ! grep -q 'ADMIN_ACTIONS' clasp-ready/Router.gs; then
  fail "Admin action list missing from auth gate"
fi
if ! grep -q "'createUser'" clasp-ready/Router.gs; then
  fail "Admin auth gate action list missing 'createUser'"
fi
if grep -A25 'var PUBLIC_ACTIONS' clasp-ready/Router.gs | grep -q "'listCustomers'"; then
  fail "Public whitelist exposes listCustomers"
fi
if grep -A25 'var PUBLIC_ACTIONS' clasp-ready/Router.gs | grep -q "'getSecurityStatus'"; then
  fail "Public whitelist exposes getSecurityStatus"
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
PC_V=$(grep -oP "[?&]v=\K[0-9.]+" pwa/dashboard_pc.html | head -1 || echo "X")
MOBILE_V=$(grep -oP "[?&]v=\K[0-9.]+" pwa/index.html | head -1 || echo "X")

# Frontend versions must match each other
if [ "$SW_V" != "$PC_V" ]; then
  fail "Frontend version mismatch: sw.js=$SW_V vs dashboard=$PC_V"
fi
if [ "$SW_V" != "$MOBILE_V" ]; then
  fail "Frontend version mismatch: sw.js=$SW_V vs mobile=$MOBILE_V"
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
if ! grep -q 'api_client.js?v=' pwa/dashboard_pc.html; then
  fail "dashboard_pc.html missing cache-busted api_client.js"
fi
if ! grep -q 'dashboard_pc_core.js?v=' pwa/dashboard_pc.html; then
  fail "dashboard_pc.html missing cache-busted dashboard_pc_core.js"
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

if command -v node &>/dev/null && [ -f "scripts/build_code_index.js" ]; then
  if node scripts/build_code_index.js; then
    echo "   โ… Code intelligence index passed"
  else
    fail "Code intelligence index FAILED"
  fi
else
  warn "Node or build_code_index.js unavailable — skipping code index"
fi

if command -v node &>/dev/null && [ -f "scripts/system_integrity_audit.js" ]; then
  if node scripts/system_integrity_audit.js; then
    echo "   ✅ System integrity audit passed"
  else
    fail "System integrity audit FAILED"
  fi
else
  warn "Node or system_integrity_audit.js unavailable — skipping system integrity audit"
fi

if command -v node &>/dev/null && [ -f "scripts/vision_capability_audit.js" ]; then
  if node scripts/vision_capability_audit.js; then
    echo "   AI Vision capability audit passed"
  else
    fail "AI Vision capability audit FAILED"
  fi
else
  warn "Node or vision_capability_audit.js unavailable - skipping AI Vision capability audit"
fi

if command -v node &>/dev/null && [ -f "scripts/vision_runtime_smoke.js" ]; then
  if node scripts/vision_runtime_smoke.js; then
    echo "   AI Vision runtime smoke passed"
  else
    fail "AI Vision runtime smoke FAILED"
  fi
else
  warn "Node or vision_runtime_smoke.js unavailable - skipping AI Vision runtime smoke"
fi

if command -v node &>/dev/null && [ -f "scripts/vision_e2e_smoke.js" ]; then
  if node scripts/vision_e2e_smoke.js; then
    echo "   AI Vision E2E safety gate passed"
  else
    fail "AI Vision E2E safety gate FAILED"
  fi
else
  warn "Node or vision_e2e_smoke.js unavailable - skipping AI Vision E2E safety gate"
fi

if command -v node &>/dev/null && [ -f "scripts/pwa_write_smoke.js" ]; then
  if node scripts/pwa_write_smoke.js; then
    echo "   Write smoke safety gate passed"
  else
    fail "Write smoke safety gate FAILED"
  fi
else
  warn "Node or pwa_write_smoke.js unavailable - skipping write smoke safety gate"
fi

if command -v node &>/dev/null && [ -f "scripts/pwa_ui_write_contract.js" ]; then
  if node scripts/pwa_ui_write_contract.js; then
    echo "   PWA UI write contract passed"
  else
    fail "PWA UI write contract FAILED"
  fi
else
  warn "Node or pwa_ui_write_contract.js unavailable - skipping PWA UI write contract"
fi

if command -v node &>/dev/null && [ -f "scripts/pwa_ui_surface_audit.js" ]; then
  if node scripts/pwa_ui_surface_audit.js; then
    echo "   PWA UI surface audit passed"
  else
    fail "PWA UI surface audit FAILED"
  fi
else
  warn "Node or pwa_ui_surface_audit.js unavailable - skipping PWA UI surface audit"
fi

# E2: Post-incident recurrence patterns (check ALL surfaces)
if grep -q '<script src="ai_executor_validation.js"' pwa/dashboard_pc.html; then
  fail "RECURRENCE: ai_executor_validation.js loaded in dashboard_pc.html"
fi
if grep -q '<script src="ai_executor_validation.js"' pwa/index.html; then
  fail "RECURRENCE: ai_executor_validation.js loaded in index.html"
fi
if [ -f pwa/ai_executor_validation.js ]; then
  fail "RECURRENCE: ai_executor_validation.js file still exists in pwa/"
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
