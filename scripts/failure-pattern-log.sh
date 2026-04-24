#!/usr/bin/env bash
# ============================================================
# COMPHONE — Failure Pattern Log (Adaptive Learning)
# Purpose: Capture structured failure patterns for trend analysis
# Run: bash scripts/failure-pattern-log.sh [check|log|report]
# ============================================================

MEMORY_FILE="memory/FAILURE_PATTERNS.json"
mkdir -p memory

# Initialize if missing
if [ ! -f "$MEMORY_FILE" ]; then
  echo '{"patterns":[],"metadata":{"created":"2026-04-24","version":1}}' > "$MEMORY_FILE"
fi

case "${1:-check}" in
  check)
    # Run all guards and capture any failures as patterns
    echo "🔍 Checking for failure patterns..."
    TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    # Run drift guard
    if ! bash scripts/drift-guard.sh v5.6.8-freeze 2>&1 | grep -q "NO DRIFT"; then
      DRIFT_ISSUES=$(bash scripts/drift-guard.sh v5.6.8-freeze 2>&1 | grep "❌" | head -5)
      echo "  ⚠️ Drift detected: $DRIFT_ISSUES"
      # Log pattern
      python3 -c "
import json
with open('$MEMORY_FILE') as f: d = json.load(f)
d['patterns'].append({
  'type': 'drift', 'timestamp': '$TIMESTAMP',
  'detail': '''$DRIFT_ISSUES''',
  'resolved': False
})
with open('$MEMORY_FILE', 'w') as f: json.dump(d, f, indent=2)
print('  📝 Pattern logged')
" 2>/dev/null
    else
      echo "  ✅ No drift patterns"
    fi
    
    # Run regression guard
    if ! bash scripts/regression-guard.sh 2>&1 | grep -q "ALL CHECKS PASSED"; then
      REG_ISSUES=$(bash scripts/regression-guard.sh 2>&1 | grep "❌" | head -5)
      echo "  ⚠️ Regression detected: $REG_ISSUES"
    else
      echo "  ✅ No regression patterns"
    fi
    
    # Check complexity thresholds
    echo ""
    echo "📊 Complexity check:"
    OVER_THRESHOLD=0
    for f in clasp-ready/*.gs pwa/*.js; do
      lines=$(wc -l < "$f" 2>/dev/null)
      if [ "$lines" -gt 1000 ]; then
        echo "  🔴 CRITICAL: $(basename $f) — $lines lines (threshold: 1000)"
        OVER_THRESHOLD=$((OVER_THRESHOLD+1))
      elif [ "$lines" -gt 800 ]; then
        echo "  🟡 WARNING: $(basename $f) — $lines lines (threshold: 800)"
        OVER_THRESHOLD=$((OVER_THRESHOLD+1))
      fi
    done
    if [ $OVER_THRESHOLD -eq 0 ]; then
      echo "  ✅ All files within complexity thresholds"
    fi
    ;;
    
  report)
    # Generate failure pattern report
    echo "📊 FAILURE PATTERN REPORT"
    echo "============================================================"
    python3 -c "
import json
with open('$MEMORY_FILE') as f: d = json.load(f)
patterns = d.get('patterns', [])
print(f'Total patterns: {len(patterns)}')
by_type = {}
for p in patterns:
    t = p.get('type','unknown')
    by_type[t] = by_type.get(t, 0) + 1
for t, c in sorted(by_type.items()):
    print(f'  {t}: {c}')
unresolved = [p for p in patterns if not p.get('resolved')]
print(f'Unresolved: {len(unresolved)}')
" 2>/dev/null
    ;;
    
  *)
    echo "Usage: $0 [check|log|report]"
    ;;
esac
