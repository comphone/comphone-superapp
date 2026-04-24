#!/bin/bash
# ============================================================
# COMPHONE SUPER APP — Architecture Stewardship Guard
# Phase 2C: CI-side architecture health monitoring
# ============================================================
# Measures file complexity, detects drift from baselines,
# and fails CI if critical thresholds are exceeded.
#
# Usage: bash scripts/guard-stewardship.sh
# Exit: 0 = PASS, 1 = FAIL (drift detected)
# ============================================================

set -e

CLASP_DIR="clasp-ready"
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m'

PASS=0
FAIL=0
WARN=0

echo "🏗️  COMPHONE ARCHITECTURE STEWARDSHIP GUARD"
echo "============================================================"

# ── Baseline Thresholds ──────────────────────────────────────
# Format: FILE:MAX_LINES:MAX_FUNCTIONS
BASELINES=(
  "Router.gs:800:25"
  "RouterSplit.gs:500:15"
  "Inventory.gs:1600:50"
  "BillingManager.gs:1200:50"
  "JobStateMachine.gs:1000:40"
  "Auth.gs:800:25"
  "HealthMonitor.gs:500:15"
  "PropertiesGuard.gs:500:15"
  "ErrorTelemetry.gs:600:20"
  "ArchitectureStewardship.gs:400:15"
)

# ── Function to count lines ──────────────────────────────────
count_lines() {
  if [ -f "$CLASP_DIR/$1" ]; then
    wc -l < "$CLASP_DIR/$1" | tr -d ' '
  else
    echo "0"
  fi
}

# ── Function to count functions ──────────────────────────────
count_functions() {
  if [ -f "$CLASP_DIR/$1" ]; then
    grep -c 'function ' "$CLASP_DIR/$1" 2>/dev/null || echo "0"
  else
    echo "0"
  fi
}

# ── Check each file against baseline ─────────────────────────
echo ""
echo "📏 File Complexity Check"
echo "------------------------------------------------------------"

for baseline in "${BASELINES[@]}"; do
  IFS=':' read -r file max_lines max_fn <<< "$baseline"

  if [ ! -f "$CLASP_DIR/$file" ]; then
    continue
  fi

  lines=$(count_lines "$file")
  fns=$(count_functions "$file")

  # Line count check
  warn_threshold=$((max_lines * 85 / 100))
  crit_threshold=$((max_lines * 100 / 100))

  if [ "$lines" -gt "$crit_threshold" ]; then
    echo -e "  ${RED}🔴 $file: $lines lines (CRITICAL: >$crit_threshold, max=$max_lines)${NC}"
    FAIL=$((FAIL + 1))
  elif [ "$lines" -gt "$warn_threshold" ]; then
    echo -e "  ${YELLOW}🟡 $file: $lines lines (WARNING: >$warn_threshold, max=$max_lines)${NC}"
    WARN=$((WARN + 1))
  else
    echo -e "  ${GREEN}✅ $file: $lines lines (max=$max_lines)${NC}"
    PASS=$((PASS + 1))
  fi

  # Function count check
  if [ "$fns" -gt "$max_fn" ]; then
    echo -e "  ${YELLOW}🟡 $file: $fns functions (max=$max_fn)${NC}"
    WARN=$((WARN + 1))
  fi
done

# ── MODULE_ROUTER coverage check ─────────────────────────────
echo ""
echo "🔀 MODULE_ROUTER Coverage"
echo "------------------------------------------------------------"

if [ -f "$CLASP_DIR/RouterSplit.gs" ]; then
  ROUTE_COUNT=$(grep -c "'[a-zA-Z]*':" "$CLASP_DIR/RouterSplit.gs" 2>/dev/null || echo "0")
  SWITCH_CASES=$(grep -c "case '" "$CLASP_DIR/Router.gs" 2>/dev/null || echo "0")

  echo "  MODULE_ROUTER entries: $ROUTE_COUNT"
  echo "  Switch cases: $SWITCH_CASES"

  if [ "$SWITCH_CASES" -gt 10 ]; then
    echo -e "  ${YELLOW}🟡 Switch has $SWITCH_CASES cases (should be ≤2 for clean architecture)${NC}"
    WARN=$((WARN + 1))
  else
    echo -e "  ${GREEN}✅ Switch clean ($SWITCH_CASES cases)${NC}"
    PASS=$((PASS + 1))
  fi
fi

# ── Dead reference check ─────────────────────────────────────
echo ""
echo "💀 Dead Reference Check"
echo "------------------------------------------------------------"

# Check for known dead function references
DEAD_REFS=("cleanupSessions" "forceResetAdmin" "runBackup" "verifyToken")
DEAD_COUNT=0

for ref in "${DEAD_REFS[@]}"; do
  if grep -rq "$ref" "$CLASP_DIR"/*.gs 2>/dev/null; then
    # Check if the function actually exists
    if ! grep -rq "function $ref" "$CLASP_DIR"/*.gs 2>/dev/null; then
      echo -e "  ${YELLOW}⚠️  Dead ref: $ref (referenced but function doesn't exist)${NC}"
      DEAD_COUNT=$((DEAD_COUNT + 1))
    fi
  fi
done

if [ "$DEAD_COUNT" -eq 0 ]; then
  echo -e "  ${GREEN}✅ No dead function references${NC}"
  PASS=$((PASS + 1))
else
  echo -e "  ${YELLOW}🟡 $DEAD_COUNT dead references found${NC}"
  WARN=$((WARN + 1))
fi

# ── Error telemetry coverage ─────────────────────────────────
echo ""
echo "📊 Error Telemetry Coverage"
echo "------------------------------------------------------------"

if [ -f "$CLASP_DIR/ErrorTelemetry.gs" ]; then
  echo -e "  ${GREEN}✅ ErrorTelemetry.gs exists${NC}"
  PASS=$((PASS + 1))

  # Check if _logError_ is referenced from other files
  LOG_ERROR_REFS=$(grep -rl "_logError_" "$CLASP_DIR"/*.gs 2>/dev/null | wc -l)
  echo "  Files using _logError_: $LOG_ERROR_REFS"

  if [ "$LOG_ERROR_REFS" -lt 3 ]; then
    echo -e "  ${YELLOW}🟡 Low adoption: only $LOG_ERROR_REFS files use _logError_ (target: 10+)${NC}"
    WARN=$((WARN + 1))
  else
    echo -e "  ${GREEN}✅ _logError_ adoption: $LOG_ERROR_REFS files${NC}"
    PASS=$((PASS + 1))
  fi
else
  echo -e "  ${RED}🔴 ErrorTelemetry.gs NOT FOUND${NC}"
  FAIL=$((FAIL + 1))
fi

# ── Architecture stewardship files ───────────────────────────
echo ""
echo "🏗️  Architecture Stewardship Files"
echo "------------------------------------------------------------"

for file in "ArchitectureStewardship.gs" "ErrorTelemetry.gs" "PropertiesGuard.gs"; do
  if [ -f "$CLASP_DIR/$file" ]; then
    echo -e "  ${GREEN}✅ $file exists${NC}"
    PASS=$((PASS + 1))
  else
    echo -e "  ${RED}🔴 $file MISSING${NC}"
    FAIL=$((FAIL + 1))
  fi
done

# ── Summary ──────────────────────────────────────────────────
echo ""
echo "============================================================"
echo "Results: $PASS passed, $WARN warnings, $FAIL failed"
echo "============================================================"

if [ "$FAIL" -gt 0 ]; then
  echo -e "${RED}🔴 STEWARDSHIP GUARD FAILED — $FAIL critical issues${NC}"
  exit 1
elif [ "$WARN" -gt 0 ]; then
  echo -e "${YELLOW}🟡 STEWARDSHIP GUARD PASSED WITH WARNINGS — $WARN issues${NC}"
  exit 0
else
  echo -e "${GREEN}🟢 ALL STEWARDSHIP CHECKS PASSED${NC}"
  exit 0
fi
