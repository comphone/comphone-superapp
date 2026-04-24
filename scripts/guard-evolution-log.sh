#!/usr/bin/env bash
# ============================================================
# COMPHONE — Guard Evolution Tracker (Adaptive Learning)
# Purpose: Track how guards improve over time
# Run: bash scripts/guard-evolution-log.sh [status|history]
# ============================================================

EVOLUTION_FILE="memory/GUARD_EVOLUTION.json"
mkdir -p memory

# Initialize if missing
if [ ! -f "$EVOLUTION_FILE" ]; then
  cat > "$EVOLUTION_FILE" << 'INIT'
{
  "guards": {
    "drift-guard": {"version": 2, "checks": 5, "last_improved": "2026-04-24"},
    "regression-guard": {"version": 3, "checks": 14, "last_improved": "2026-04-24"},
    "pre-commit-hook": {"version": 2, "checks": 5, "last_improved": "2026-04-24"},
    "deploy-guard": {"version": 1, "checks": 4, "last_improved": "2026-04-24"},
    "guard-self-test": {"version": 2, "checks": 7, "last_improved": "2026-04-24"},
    "pre-merge-gate": {"version": 1, "checks": 6, "last_improved": "2026-04-24"}
  },
  "total_checks": 41,
  "total_improvements": 9,
  "last_audit": "2026-04-24"
}
INIT
fi

case "${1:-status}" in
  status)
    echo "🛡️ GUARD EVOLUTION STATUS"
    echo "============================================================"
    python3 -c "
import json
with open('$EVOLUTION_FILE') as f: d = json.load(f)
guards = d.get('guards', {})
print(f'Total guards: {len(guards)}')
print(f'Total checks: {d.get(\"total_checks\", 0)}')
print(f'Total improvements: {d.get(\"total_improvements\", 0)}')
print(f'Last audit: {d.get(\"last_audit\", \"never\")}')
print()
for name, info in guards.items():
    v = info.get('version', '?')
    c = info.get('checks', '?')
    t = info.get('last_improved', '?')
    print(f'  {name}: v{v} ({c} checks, improved {t})')
" 2>/dev/null
    ;;
    
  history)
    echo "📜 GUARD IMPROVEMENT HISTORY"
    echo "============================================================"
    git log --oneline -- scripts/drift-guard.sh scripts/regression-guard.sh scripts/guard-self-test.sh scripts/pre-merge-gate.sh scripts/browser-smoke-test.py .git/hooks/pre-commit deploy_all.sh
    ;;
    
  *)
    echo "Usage: $0 [status|history]"
    ;;
esac
