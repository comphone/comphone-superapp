#!/bin/bash
# ============================================================
# start-sync-all.sh — COMPHONE Triple Sync Watcher (Linux/Mac)
# รัน: bash scripts/start-sync-all.sh
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$REPO_ROOT"

echo "============================================================"
echo " COMPHONE SUPER APP V5.5 — Triple Sync Watcher"
echo " GitHub + Google Drive + Local Backup"
echo "============================================================"
echo ""

if command -v python3 &>/dev/null; then
    PYTHON=python3
elif command -v python &>/dev/null; then
    PYTHON=python
else
    echo "[ERROR] ไม่พบ Python"
    exit 1
fi

echo "[INFO] เริ่ม Triple Sync Watcher..."
echo "[INFO] กด Ctrl+C เพื่อหยุด"
echo ""

$PYTHON scripts/sync_all.py --watch --debounce 15
