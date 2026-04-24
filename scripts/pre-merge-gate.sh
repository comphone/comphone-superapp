#!/usr/bin/env bash
# ============================================================
# COMPHONE SUPER APP — PRE-MERGE GATE (PHMP v1 Compliance)
# Purpose: Run all governance checks before merging to main
# Usage: ./scripts/pre-merge-gate.sh <feature-branch>
# Exit: 0 = safe to merge, 1 = blocked
# ============================================================

set -euo pipefail

FEATURE_BRANCH="${1:-}"
BASELINE_TAG="${2:-v5.6.8-freeze}"
ERRORS=()
WARNINGS=()

function fail() { ERRORS+=("❌ $1"); }
function warn() { WARNINGS+=("⚠️  $1"); }

echo "🔐 COMPHONE PRE-MERGE GATE — PHMP v1 Compliance Check"
echo "============================================================"
echo "  Feature Branch: ${FEATURE_BRANCH:-'(current branch)'}"
echo "  Baseline:       $BASELINE_TAG"
echo ""

# ─── Check 1: Feature Branch Exists ─────────────────────
if [ -n "$FEATURE_BRANCH" ]; then
  if ! git rev-parse --verify "$FEATURE_BRANCH" >/dev/null 2>&1; then
    fail "Branch '$FEATURE_BRANCH' does not exist"
  fi
  # Check branch naming convention
  if [[ ! "$FEATURE_BRANCH" =~ ^(feature|hotfix|fix|staging)/ ]]; then
    warn "Branch '$FEATURE_BRANCH' doesn't follow naming convention (feature/*, hotfix/*, fix/*, staging/*)"
  fi
fi

# ─── Check 2: Drift Guard ───────────────────────────────
echo "🔍 [1/6] Running Drift Guard..."
if bash scripts/drift-guard.sh "$BASELINE_TAG" 2>&1; then
  echo "   ✅ Drift guard passed"
else
  fail "Drift guard FAILED — see output above"
fi

# ─── Check 3: Regression Guard ──────────────────────────
echo ""
echo "🧪 [2/6] Running Regression Guard..."
if bash scripts/regression-guard.sh 2>&1; then
  echo "   ✅ Regression guard passed"
else
  fail "Regression guard FAILED — see output above"
fi

# ─── Check 4: No Direct Main Commits ────────────────────
echo ""
echo "🚫 [3/6] Checking for direct main commits..."
if [ -n "$FEATURE_BRANCH" ]; then
  MAIN_AHEAD=$(git rev-list --count main.."$FEATURE_BRANCH" 2>/dev/null || echo "0")
  BEHIND=$(git rev-list --count "$FEATURE_BRANCH"..main 2>/dev/null || echo "0")
  echo "   Branch is $MAIN_AHEAD commits ahead of main, $BEHIND behind"
  if [ "$BEHIND" -gt 0 ]; then
    warn "Branch is $BEHIND commits behind main — consider rebasing"
  fi
fi

# ─── Check 5: Impact Audit Exists ───────────────────────
echo ""
echo "📋 [4/6] Checking for Impact Audit..."
if [ -f "docs/IMPACT_AUDIT.md" ]; then
  AUDIT_AGE=$(( ($(date +%s) - $(stat -c %Y docs/IMPACT_AUDIT.md)) / 3600 ))
  if [ "$AUDIT_AGE" -gt 168 ]; then
    warn "IMPACT_AUDIT.md is ${AUDIT_AGE}h old (>7 days) — may be stale"
  else
    echo "   ✅ IMPACT_AUDIT.md exists (${AUDIT_AGE}h old)"
  fi
else
  fail "No docs/IMPACT_AUDIT.md — PHMP Rule 1 requires impact audit before merge"
fi

# ─── Check 6: Version Sync ──────────────────────────────
echo ""
echo "🔄 [5/6] Version Sync Check..."
CONFIG_V=$(grep -oP "VERSION:\s*.\K[0-9.]+" clasp-ready/Config.gs 2>/dev/null | head -1 || echo "X")
SW_V=$(grep -oP "comphone-v\K[0-9.]+" pwa/sw.js 2>/dev/null | head -1 || echo "X")
PC_V=$(grep -oP "__APP_VERSION\s*=\s*.v\K[0-9.]+" pwa/dashboard_pc.html 2>/dev/null | head -1 || echo "X")
echo "   Config=$CONFIG_V | SW=$SW_V | PC=$PC_V"
if [ "$SW_V" != "$PC_V" ]; then
  fail "Frontend version mismatch: SW=$SW_V vs PC=$PC_V"
fi

# ─── Check 7: Self-Critique ─────────────────────────────
echo ""
echo "🔍 [6/6] Self-Critique Verification..."
if grep -q "Self-Critique" docs/IMPACT_AUDIT.md 2>/dev/null; then
  echo "   ✅ Self-critique section found in IMPACT_AUDIT.md"
else
  fail "No self-critique section in IMPACT_AUDIT.md — PHMP Rule 5"
fi

# ─── Report ──────────────────────────────────────────────
echo ""
echo "============================================================"
if [ ${#WARNINGS[@]} -gt 0 ]; then
  echo "⚠️  WARNINGS (${#WARNINGS[@]}):"
  for w in "${WARNINGS[@]}"; do echo "   $w"; done
fi

if [ ${#ERRORS[@]} -gt 0 ]; then
  echo "❌ BLOCKED (${#ERRORS[@]}):"
  for e in "${ERRORS[@]}"; do echo "   $e"; done
  echo ""
  echo "❌ PRE-MERGE GATE FAILED — Cannot merge to main."
  echo "   Fix issues above and re-run."
  exit 1
else
  echo "✅ ALL GATES PASSED — Safe to merge to main."
  echo "   Run: git checkout main && git merge $FEATURE_BRANCH"
  exit 0
fi
