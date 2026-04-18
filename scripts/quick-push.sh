#!/bin/bash
# ============================================================
# quick-push.sh — Push โค้ดทั้งหมดไปยัง GitHub ทันที
# รัน: bash scripts/quick-push.sh "commit message"
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$REPO_ROOT"

# รับ commit message จาก argument หรือสร้างอัตโนมัติ
if [ -n "$1" ]; then
    MSG="$1"
else
    TIMESTAMP=$(date '+%Y-%m-%d %H:%M')
    CHANGED=$(git status --porcelain | wc -l | tr -d ' ')
    MSG="🔄 Auto-update $CHANGED files [$TIMESTAMP]"
fi

echo "============================================================"
echo " COMPHONE Quick Push"
echo " Message: $MSG"
echo "============================================================"

# ตรวจสอบว่ามีการเปลี่ยนแปลง
if git diff --quiet && git diff --staged --quiet && [ -z "$(git ls-files --others --exclude-standard)" ]; then
    echo "ℹ️ ไม่มีการเปลี่ยนแปลง — ไม่ต้อง push"
    exit 0
fi

# git add -A
echo "📦 Adding all changes..."
git add -A

# git commit
echo "📝 Committing..."
git commit -m "$MSG"
if [ $? -ne 0 ]; then
    echo "❌ Commit ล้มเหลว"
    exit 1
fi

# git push
echo "🚀 Pushing to GitHub..."
for i in 1 2 3; do
    git push origin main
    if [ $? -eq 0 ]; then
        echo "✅ Push สำเร็จ!"
        echo ""
        echo "📊 Latest commit:"
        git log -1 --oneline
        exit 0
    fi
    echo "⚠️ Retry $i/3..."
    sleep 5
done

echo "❌ Push ล้มเหลวทั้ง 3 ครั้ง"
echo "   ลองรัน: git push origin main"
exit 1
