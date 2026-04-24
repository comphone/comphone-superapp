#!/usr/bin/env bash
# ============================================================
# COMPHONE SUPER APP — DRIFT GUARD (PHMP v1 Freeze Protocol)
# Purpose: Detect unauthorized drift from current baseline
# Usage: ./scripts/drift-guard.sh [baseline_tag]
# Exit: 0 = no drift, 1 = drift detected
# ============================================================

set -euo pipefail

BASELINE_TAG="${1:-v5.6.8-freeze}"
BASELINE_COMMIT=$(git rev-list -n1 "$BASELINE_TAG" 2>/dev/null || echo "")
DRIFT_FOUND=0
ERRORS=()

function fail() {
  ERRORS+=("❌ $1")
  DRIFT_FOUND=1
}

echo "🔍 COMPHONE DRIFT GUARD — Baseline: $BASELINE_TAG ($BASELINE_COMMIT)"
echo "============================================================"

# 1. Check baseline tag exists
if [ -z "$BASELINE_COMMIT" ]; then
  fail "Baseline tag '$BASELINE_TAG' not found. Run freeze setup first."
  echo "${ERRORS[@]}"
  exit 1
fi

# 2. Version Drift Check
echo "🔗 [1/5] Version Drift Check..."
CONFIG_VERSION=$(grep -oP "VERSION:\s*'\K[0-9.]+" clasp-ready/Config.gs | head -1 || echo "MISSING")
SW_VERSION=$(grep -oP "CACHE_V\s*=\s*'comphone-v\K[0-9.]+" pwa/sw.js | head -1 || echo "MISSING")
PC_VERSION=$(grep -oP "__APP_VERSION\s*=\s*'v\K[0-9.]+" pwa/dashboard_pc.html | head -1 || echo "MISSING")

# Frontend versions must match each other
if [ "$SW_VERSION" != "$PC_VERSION" ]; then
  fail "Frontend version mismatch: sw.js=$SW_VERSION vs dashboard=$PC_VERSION"
fi
# Config.gs version is the GAS backend — may differ from frontend
if [ "$CONFIG_VERSION" = "MISSING" ]; then
  fail "Config.gs VERSION not found"
fi
echo "   Config.gs=$CONFIG_VERSION | sw.js=$SW_VERSION | dashboard=$PC_VERSION"

# 3. Load-Order Drift Check
echo "🔗 [2/5] Load-Order Drift Check..."
# Policy engine must load before ai_executor_runtime
INDEX_POLICY_LINE=$(grep -n 'policy_engine.js' pwa/index.html | head -1 | cut -d: -f1 || echo "0")
INDEX_AI_LINE=$(grep -n 'ai_executor_runtime.js' pwa/index.html | head -1 | cut -d: -f1 || echo "999")
if [ "$INDEX_POLICY_LINE" -ge "$INDEX_AI_LINE" ]; then
  fail "index.html: policy_engine.js must load BEFORE ai_executor_runtime.js"
fi

PC_POLICY_LINE=$(grep -n 'policy_engine.js' pwa/dashboard_pc.html | head -1 | cut -d: -f1 || echo "0")
PC_AI_LINE=$(grep -n 'ai_executor_runtime.js' pwa/dashboard_pc.html | head -1 | cut -d: -f1 || echo "999")
if [ "$PC_POLICY_LINE" -ge "$PC_AI_LINE" ]; then
  fail "dashboard_pc.html: policy_engine.js must load BEFORE ai_executor_runtime.js"
fi

# 4. Approval Invariant Drift
echo "🔗 [3/5] Approval Invariant Drift Check..."
if ! grep -q '_checkAuthGateV55_' clasp-ready/Router.gs; then
  fail "Router.gs: _checkAuthGateV55_ missing — auth gate removed!"
fi
if ! grep -q 'functionName.charAt(0) === ._.' clasp-ready/Router.gs; then
  fail "Router.gs: invokeFunctionByNameV55_ underscore guard missing!"
fi
if ! grep -q 'verifyLineSignature_' clasp-ready/Router.gs; then
  fail "Router.gs: verifyLineSignature_ missing — LINE security removed!"
fi
if ! grep -q 'comphone_self_heal_fix_log' pwa/policy_engine.js; then
  fail "policy_engine.js: self-heal persistence missing!"
fi
if ! grep -q 'maxFixPerMinute' pwa/policy_engine.js; then
  fail "policy_engine.js: maxFixPerMinute missing!"
fi

# 5. Stale Branch Divergence
echo "🔗 [4/5] Branch Divergence Check..."
CURRENT_COMMIT=$(git rev-parse HEAD)
if [ "$CURRENT_COMMIT" != "$BASELINE_COMMIT" ]; then
  DIVERGED_FILES=$(git diff --name-only "$BASELINE_TAG" HEAD 2>/dev/null || echo "UNKNOWN")
  if [ -n "$DIVERGED_FILES" ]; then
    fail "Branch has diverged from baseline. Changed files:\n$DIVERGED_FILES"
  fi
fi

# 6. Undeclared Dependency Changes
echo "🔗 [5/5] Undeclared Dependency Check..."
# Check for new JS files in pwa/ not listed in index.html
for js in pwa/*.js; do
  fname=$(basename "$js")
  if ! grep -q "$fname" pwa/index.html && \
     ! grep -q "$fname" pwa/dashboard_pc.html && \
     [ "$fname" != "error_boundary.js" ]; then
    # Some files might be loaded dynamically; warn only
    echo "⚠️  WARN: $fname not found in any HTML load order (may be dynamic)"
  fi
done

# Report
if [ "$DRIFT_FOUND" -eq 0 ]; then
  echo ""
  echo "✅ NO DRIFT DETECTED — System is aligned with baseline $BASELINE_TAG"
  exit 0
else
  echo ""
  echo "❌ DRIFT DETECTED — ${#ERRORS[@]} issue(s) found:"
  for e in "${ERRORS[@]}"; do
    echo "   $e"
  done
  exit 1
fi
