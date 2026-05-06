#!/usr/bin/env bash
# ============================================================
# COMPHONE SUPER APP - DRIFT GUARD
# Purpose: detect risky config/version/security drift before deploy.
# Usage: ./scripts/drift-guard.sh [optional-baseline-tag]
# Exit: 0 = no blocking drift, 1 = blocking drift detected
# ============================================================

set -euo pipefail

BASELINE_TAG="${1:-}"
BASELINE_COMMIT=""
DRIFT_FOUND=0
ERRORS=()
SKIP_DIVERGENCE=0

if [ -n "$BASELINE_TAG" ]; then
  BASELINE_COMMIT=$(git rev-list -n1 "$BASELINE_TAG" 2>/dev/null || echo "")
fi

function fail() {
  ERRORS+=("ERROR: $1")
  DRIFT_FOUND=1
}

echo "COMPHONE DRIFT GUARD - Baseline: ${BASELINE_TAG:-current deploy} (${BASELINE_COMMIT:-no frozen tag})"
echo "============================================================"

if [ -z "$BASELINE_TAG" ]; then
  echo "WARN: No baseline tag provided - skipping historical divergence check"
  SKIP_DIVERGENCE=1
elif [ -z "$BASELINE_COMMIT" ]; then
  if [ "${CI:-false}" = "true" ]; then
    echo "WARN: Baseline tag '$BASELINE_TAG' not found - skipping divergence checks in CI"
    SKIP_DIVERGENCE=1
  else
    fail "Baseline tag '$BASELINE_TAG' not found"
  fi
fi

echo ""
echo "[1/5] Version Drift Check..."
CONFIG_VERSION=$(grep -oP "VERSION:\s*'\K[0-9.]+" clasp-ready/Config.gs | head -1 || echo "MISSING")
SW_VERSION=$(grep -oP "CACHE_V\s*=\s*'comphone-v\K[0-9.]+" pwa/sw.js | head -1 || echo "MISSING")
PC_VERSION=$(grep -oP "[?&]v=\K[0-9.]+" pwa/dashboard_pc.html | head -1 || echo "MISSING")
MOBILE_VERSION=$(grep -oP "[?&]v=\K[0-9.]+" pwa/index.html | head -1 || echo "MISSING")

if [ "$SW_VERSION" = "MISSING" ]; then
  fail "sw.js frontend version not found"
fi
if [ "$PC_VERSION" = "MISSING" ]; then
  fail "dashboard_pc.html frontend asset version not found"
fi
if [ "$MOBILE_VERSION" = "MISSING" ]; then
  fail "index.html frontend asset version not found"
fi
if [ "$SW_VERSION" != "$PC_VERSION" ]; then
  fail "Frontend version mismatch: sw.js=$SW_VERSION vs dashboard=$PC_VERSION"
fi
if [ "$SW_VERSION" != "$MOBILE_VERSION" ]; then
  fail "Frontend version mismatch: sw.js=$SW_VERSION vs mobile=$MOBILE_VERSION"
fi
if [ "$CONFIG_VERSION" = "MISSING" ]; then
  fail "Config.gs VERSION not found"
fi
echo "   Config.gs=$CONFIG_VERSION | sw.js=$SW_VERSION | dashboard=$PC_VERSION | mobile=$MOBILE_VERSION"

echo ""
echo "[2/5] Load-Order Drift Check..."
if ! grep -q 'version_config.js' pwa/index.html; then
  fail "index.html missing version_config.js"
fi
if ! grep -q 'gas_config.js' pwa/index.html; then
  fail "index.html missing gas_config.js"
fi
if ! grep -q 'api_client.js' pwa/index.html; then
  fail "index.html missing api_client.js"
fi
if ! grep -q 'dashboard_pc_core.js' pwa/dashboard_pc.html; then
  fail "dashboard_pc.html missing dashboard_pc_core.js"
fi
if grep -q '<script src="ai_executor_validation.js"' pwa/index.html pwa/dashboard_pc.html; then
  fail "ai_executor_validation.js recurrence in HTML load order"
fi

INDEX_VERSION_LINE=$(grep -n 'version_config.js' pwa/index.html | head -1 | cut -d: -f1 || echo "999")
INDEX_API_LINE=$(grep -n 'api_client.js' pwa/index.html | head -1 | cut -d: -f1 || echo "0")
if [ "$INDEX_VERSION_LINE" -ge "$INDEX_API_LINE" ]; then
  fail "index.html: version_config.js must load before api_client.js"
fi

echo ""
echo "[3/5] Security Invariant Drift Check..."
if ! grep -q '_checkAuthGateV55_' clasp-ready/Router.gs; then
  fail "Router.gs: _checkAuthGateV55_ missing"
fi
if ! grep -q 'functionName.charAt(0) === ._.' clasp-ready/Router.gs; then
  fail "Router.gs: invokeFunctionByNameV55_ underscore guard missing"
fi
if ! grep -q 'verifyLineSignature_' clasp-ready/Router.gs; then
  fail "Router.gs: verifyLineSignature_ missing"
fi
if grep -A25 'var PUBLIC_ACTIONS' clasp-ready/Router.gs | grep -q "'listCustomers'"; then
  fail "Router.gs: PUBLIC_ACTIONS exposes listCustomers"
fi
if grep -A25 'var PUBLIC_ACTIONS' clasp-ready/Router.gs | grep -q "'getSecurityStatus'"; then
  fail "Router.gs: PUBLIC_ACTIONS exposes getSecurityStatus"
fi
if grep -Eiq "COMPHONE_AUTH_TOKEN.*[a-f0-9]{24,}" BLUEPRINT.md docs/*.md 2>/dev/null; then
  fail "Possible live COMPHONE_AUTH_TOKEN value documented"
fi

echo ""
echo "[4/5] Branch Divergence Check..."
if [ "$SKIP_DIVERGENCE" -eq 1 ]; then
  echo "   Skipped"
elif [ "${CI:-false}" = "true" ]; then
  echo "   Skipped in CI"
else
  CURRENT_COMMIT=$(git rev-parse HEAD)
  if [ "$CURRENT_COMMIT" != "$BASELINE_COMMIT" ]; then
    DIVERGED_FILES=$(git diff --name-only "$BASELINE_TAG" HEAD 2>/dev/null || echo "")
    if [ -n "$DIVERGED_FILES" ]; then
      fail "Branch diverged from baseline $BASELINE_TAG"
    fi
  fi
fi

echo ""
echo "[5/5] Dependency Index Check..."
if command -v node >/dev/null 2>&1 && [ -f scripts/build_code_index.js ]; then
  node scripts/build_code_index.js
else
  fail "Node or scripts/build_code_index.js missing"
fi

if [ "$DRIFT_FOUND" -eq 0 ]; then
  echo ""
  echo "NO DRIFT DETECTED - System is aligned with ${BASELINE_TAG:-current deploy}"
  exit 0
fi

echo ""
echo "DRIFT DETECTED - ${#ERRORS[@]} issue(s) found:"
for e in "${ERRORS[@]}"; do
  echo "   $e"
done
exit 1
