#!/usr/bin/env bash
# ============================================================
# COMPHONE SUPER APP — Post-Incident Watch / Recurrence Detection
# PHMP v1 Observation Mode
# Purpose: Detect if incident patterns recur after hotfix b49da80
# Usage: ./scripts/post-incident-watch.sh [--notify]
# Exit: 0 = clean, 1 = recurrence detected
# ============================================================

set -euo pipefail

NOTIFY=false
if [[ "${1:-}" == "--notify" ]]; then
  NOTIFY=true
fi

ERRORS=()
WARNINGS=()
RECURRENCE=false

function fail() {
  ERRORS+=("❌ $1")
  RECURRENCE=true
}

function warn() {
  WARNINGS+=("⚠️  $1")
}

echo "👁️ COMPHONE POST-INCIDENT WATCH — 48h Observation"
echo "============================================================"
echo "Baseline: b49da80 | $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# --- CHECK 1: Browser Smoke Test ---
echo "🔗 [1/6] Browser Smoke Test..."
if command -v python3 &>/dev/null && [ -f "scripts/browser-smoke-test.py" ]; then
  if python3 scripts/browser-smoke-test.py; then
    echo "   ✅ Browser smoke test passed"
  else
    fail "Browser smoke test FAILED — dashboard has recurrence patterns"
  fi
else
  warn "Python3 not available — skipping browser smoke test"
fi

# --- CHECK 2: Source Code Recurrence Patterns ---
echo ""
echo "🔗 [2/6] Source Recurrence Pattern Check..."

# R2.1: ai_executor_validation.js must NOT be in dashboard_pc.html
if grep -q 'ai_executor_validation.js' pwa/dashboard_pc.html; then
  fail "dashboard_pc.html loads ai_executor_validation.js (recurrence)"
else
  echo "   ✅ ai_executor_validation.js not in dashboard_pc.html"
fi

# R2.2: callGas must NOT route through AI_EXECUTOR
if grep -A5 'async function callGas' pwa/dashboard_pc.html | grep -q 'window.AI_EXECUTOR'; then
  fail "callGas() still routes through AI_EXECUTOR (recurrence)"
else
  echo "   ✅ callGas() does not route through AI_EXECUTOR"
fi

# R2.3: callGas must use direct fetch
if grep -A10 'async function callGas' pwa/dashboard_pc.html | grep -q "fetch(url"; then
  echo "   ✅ callGas() uses direct fetch"
else
  fail "callGas() missing direct fetch (regression)"
fi

# --- CHECK 3: Git Drift Detection ---
echo ""
echo "🔗 [3/6] Git Drift Check..."
if [ -n "$(git status --short 2>/dev/null)" ]; then
  fail "Working tree has uncommitted changes since baseline"
  git status --short | sed 's/^/     /'
else
  echo "   ✅ Working tree clean"
fi

# --- CHECK 4: Version Consistency ---
echo ""
echo "🔗 [4/6] Version Consistency Check..."
CONFIG_V=$(grep -oP "VERSION:\s*'\K[0-9.]+'" clasp-ready/Config.gs | tr -d "'" || echo "X")
SW_V=$(grep -oP "CACHE_V\s*=\s*'comphone-v\K[0-9.]+'" pwa/sw.js | tr -d "'" || echo "X")
PC_V=$(grep -oP "__APP_VERSION\s*=\s*'v\K[0-9.]+'" pwa/dashboard_pc.html | tr -d "'" || echo "X")

if [ "$CONFIG_V" = "$SW_V" ] && [ "$SW_V" = "$PC_V" ]; then
  echo "   ✅ Version consistent: $CONFIG_V"
else
  fail "Version mismatch: Config=$CONFIG_V | SW=$SW_V | PC=$PC_V"
fi

# --- CHECK 5: Security Invariant Check ---
echo ""
echo "🔗 [5/6] Security Invariant Check..."

if grep -q '_checkAuthGateV55_' clasp-ready/Router.gs; then
  echo "   ✅ Auth gate present in Router.gs"
else
  fail "Auth gate MISSING from Router.gs"
fi

if grep -q "functionName.charAt(0) === '_'" clasp-ready/Router.gs; then
  echo "   ✅ Underscore guard present"
else
  fail "Underscore guard MISSING"
fi

if grep -q 'comphone_self_heal_fix_log' pwa/policy_engine.js; then
  echo "   ✅ Self-heal persistence present"
else
  fail "Self-heal persistence MISSING"
fi

# --- CHECK 6: Console Error Simulation ---
echo ""
echo "🔗 [6/6] Console Error Pattern Check..."

# Check that __USER_ROLE has guard
if grep -q 'Object.getOwnPropertyDescriptor(window, .__USER_ROLE.)' pwa/ai_executor_runtime.js; then
  echo "   ✅ __USER_ROLE redefinition guard present"
else
  fail "__USER_ROLE redefinition guard MISSING (recurrence risk)"
fi

# Check that error_boundary doesn't throw on minimal APP
if grep -q 'typeof APP !== .undefined.' pwa/error_boundary.js; then
  echo "   ✅ error_boundary.js has APP safety checks"
else
  warn "error_boundary.js may lack APP safety checks"
fi

# --- REPORT ---
echo ""
echo "============================================================"

if [ ${#WARNINGS[@]} -gt 0 ]; then
  echo "⚠️  WARNINGS (${#WARNINGS[@]}):"
  for w in "${WARNINGS[@]}"; do echo "   $w"; done
fi

if [ "$RECURRENCE" = true ]; then
  echo ""
  echo "🚨 RECURRENCE DETECTED — ${#ERRORS[@]} issue(s):"
  for e in "${ERRORS[@]}"; do echo "   $e"; done
  echo ""
  echo "Status: HOLD — Do NOT promote to GREEN"

  if [ "$NOTIFY" = true ]; then
    echo "[$(date -Iseconds)] RECURRENCE: ${#ERRORS[@]} errors" >> .post-incident-log
  fi

  exit 1
else
  echo ""
  echo "✅ NO RECURRENCE — Observation clean at $(date '+%H:%M:%S')"
  echo "Status: YELLOW (continue observation)"

  if [ "$NOTIFY" = true ]; then
    echo "[$(date -Iseconds)] CLEAN: No recurrence detected" >> .post-incident-log
  fi

  exit 0
fi
