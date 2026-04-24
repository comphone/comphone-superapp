#!/usr/bin/env bash
# ============================================================
# COMPHONE SUPER APP — GUARD SELF-TEST (PHMP v1 Anti-Fragility)
# Purpose: Verify that security guards can detect violations
# Run: bash scripts/guard-self-test.sh
# ============================================================

set -euo pipefail

PASS=0
FAIL=0

function test_pass() { echo "  ✅ $1"; PASS=$((PASS+1)); }
function test_fail() { echo "  ❌ $1"; FAIL=$((FAIL+1)); }

echo "🧪 COMPHONE GUARD SELF-TEST"
echo "============================================================"

# Test 1: Auth gate exists
echo ""
echo "🔒 [1/7] Auth Gate Detection..."
if grep -q '_checkAuthGateV55_' clasp-ready/Router.gs; then
  test_pass "_checkAuthGateV55_ present in Router.gs"
else
  test_fail "_checkAuthGateV55_ MISSING from Router.gs"
fi

# Test 2: Underscore guard exists
echo ""
echo "🔒 [2/7] Underscore Guard Detection..."
if grep -q "functionName.charAt(0) === '_'" clasp-ready/Router.gs; then
  test_pass "Underscore guard present in invokeFunctionByNameV55_"
else
  test_fail "Underscore guard MISSING"
fi

# Test 3: LINE signature check exists
echo ""
echo "🔒 [3/7] LINE Signature Detection..."
if grep -q 'verifyLineSignature_' clasp-ready/Router.gs; then
  test_pass "LINE signature verification present"
else
  test_fail "LINE signature verification MISSING"
fi

# Test 4: Frontend version sync
echo ""
echo "🔄 [4/7] Version Sync Detection..."
SW_V=$(grep -oP "comphone-v\K[0-9.]+" pwa/sw.js 2>/dev/null | head -1 || echo "X")
PC_V=$(grep -oP "__APP_VERSION.*v\K[0-9.]+" pwa/dashboard_pc.html 2>/dev/null | head -1 || echo "X")
if [ "$SW_V" = "$PC_V" ]; then
  test_pass "Frontend versions match: $SW_V"
else
  test_fail "Version mismatch: sw.js=$SW_V vs dashboard=$PC_V"
fi

# Test 5: Cache bust consistency
echo ""
echo "🔄 [5/7] Cache Bust Consistency..."
BUST_VERSIONS=$(grep -oP '\?v=[0-9]+' pwa/dashboard_pc.html 2>/dev/null | sort -u | wc -l)
if [ "$BUST_VERSIONS" -le 1 ]; then
  test_pass "Cache bust versions consistent ($BUST_VERSIONS unique)"
else
  test_fail "Cache bust versions inconsistent ($BUST_VERSIONS unique)"
fi

# Test 6: Pre-commit hook installed
echo ""
echo "🔧 [6/7] Pre-commit Hook..."
if [ "${CI:-false}" = "true" ]; then
  test_pass "Pre-commit hook check skipped (CI environment)"
elif [ -f ".git/hooks/pre-commit" ]; then
  if grep -q '_checkAuthGateV55_' .git/hooks/pre-commit; then
    test_pass "Pre-commit hook installed with security checks"
  else
    test_fail "Pre-commit hook exists but missing security checks"
  fi
else
  test_fail "Pre-commit hook NOT installed (run: bash scripts/install-hooks.sh)"
fi

# Test 7: Guard script integrity (anti-fragility)
echo ""
echo "🔐 [7/7] Guard Script Integrity..."
if [ -f "scripts/.guard-checksums.md5" ]; then
  if md5sum -c scripts/.guard-checksums.md5 --quiet 2>/dev/null; then
    test_pass "All governance scripts match checksums"
  else
    CHANGED=$(md5sum -c scripts/.guard-checksums.md5 2>/dev/null | grep -v "OK$" | wc -l)
    test_fail "$CHANGED governance script(s) modified since checksum creation"
    echo "    Run: md5sum -c scripts/.guard-checksums.md5 to see which"
  fi
else
  test_fail "Guard checksums file missing"
fi

# Report
echo ""
echo "============================================================"
echo "Results: $PASS passed, $FAIL failed"
if [ $FAIL -eq 0 ]; then
  echo "🟢 ALL GUARD SELF-TESTS PASSED"
  exit 0
else
  echo "🔴 $FAIL GUARD SELF-TEST(S) FAILED"
  exit 1
fi
