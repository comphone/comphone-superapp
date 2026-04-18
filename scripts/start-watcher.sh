#!/bin/bash
# ============================================================
# start-watcher.sh — COMPHONE Auto-Push Watcher (Linux/Mac)
# รัน: bash scripts/start-watcher.sh
# ============================================================

echo "============================================================"
echo " COMPHONE SUPER APP V5.5 — Auto-Push Watcher"
echo "============================================================"
echo ""

# เปลี่ยนไปยัง repo root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$REPO_ROOT"

# ตรวจสอบ Python
if command -v python3 &>/dev/null; then
    PYTHON=python3
elif command -v python &>/dev/null; then
    PYTHON=python
else
    echo "[ERROR] ไม่พบ Python กรุณาติดตั้ง Python 3.8+ ก่อน"
    exit 1
fi

# ตรวจสอบ git
if ! command -v git &>/dev/null; then
    echo "[ERROR] ไม่พบ git กรุณาติดตั้ง git ก่อน"
    exit 1
fi

echo "[INFO] Python: $PYTHON"
echo "[INFO] Repo: $REPO_ROOT"
echo "[INFO] Branch: main"
echo "[INFO] Debounce: 15 วินาที"
echo ""
echo "กด Ctrl+C เพื่อหยุด Watcher"
echo "============================================================"
echo ""

# รัน watcher
$PYTHON scripts/auto_push.py --repo . --branch main --debounce 15

echo ""
echo "[INFO] Watcher หยุดทำงาน"
