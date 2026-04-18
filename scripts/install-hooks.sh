#!/bin/bash
# ============================================================
# install-hooks.sh — ติดตั้ง git hooks สำหรับ COMPHONE SUPER APP
# รัน: bash scripts/install-hooks.sh
# ============================================================

REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)
if [ -z "$REPO_ROOT" ]; then
  echo "❌ ไม่พบ git repository กรุณารันในโฟลเดอร์โปรเจค"
  exit 1
fi

HOOKS_DIR="$REPO_ROOT/.git/hooks"
SCRIPTS_DIR="$REPO_ROOT/scripts/hooks"

echo "📦 ติดตั้ง git hooks สำหรับ COMPHONE SUPER APP V5.5"
echo "   Repo: $REPO_ROOT"
echo ""

# สร้าง pre-commit hook
cat > "$HOOKS_DIR/pre-commit" << 'HOOK'
#!/bin/bash
echo "🔍 [pre-commit] Checking JS syntax..."
ERRORS=0
for file in $(git diff --cached --name-only --diff-filter=ACM | grep '\.js$'); do
  if [ -f "$file" ]; then
    node --check "$file" 2>&1
    if [ $? -ne 0 ]; then
      echo "❌ Syntax error: $file"
      ERRORS=$((ERRORS + 1))
    fi
  fi
done
if [ $ERRORS -gt 0 ]; then
  echo "❌ พบ $ERRORS ไฟล์ที่มี error — commit ถูกยกเลิก"
  exit 1
fi
echo "✅ ผ่านการตรวจสอบ"
exit 0
HOOK

# สร้าง post-commit hook
cat > "$HOOKS_DIR/post-commit" << 'HOOK'
#!/bin/bash
COMMIT_MSG=$(git log -1 --pretty=%B)
if echo "$COMMIT_MSG" | grep -qE '\[skip push\]|\[skip ci\]|\[no push\]'; then
  echo "ℹ️ Push skipped"
  exit 0
fi
if [ "${AUTO_PUSH}" = "false" ]; then exit 0; fi
BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "🚀 Auto-pushing to origin/$BRANCH..."
for i in 1 2 3; do
  git push origin "$BRANCH" && echo "✅ Push สำเร็จ" && exit 0
  echo "⚠️ Retry $i/3..."
  sleep 3
done
echo "❌ Push ล้มเหลว — รัน 'git push' ด้วยตนเอง"
exit 0
HOOK

chmod +x "$HOOKS_DIR/pre-commit" "$HOOKS_DIR/post-commit"

echo "✅ ติดตั้ง hooks สำเร็จ:"
echo "   - pre-commit: ตรวจสอบ JS syntax"
echo "   - post-commit: Auto-push ไปยัง GitHub"
echo ""
echo "💡 เพื่อ push โดยไม่ผ่าน hook: git push --no-verify"
echo "💡 เพื่อ commit โดยไม่ push:    AUTO_PUSH=false git commit -m '...'"
