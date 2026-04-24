#!/bin/bash
# install-hooks.sh — Install git hooks for COMPHONE SUPER APP
# Run: bash scripts/install-hooks.sh

REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)
if [ -z "$REPO_ROOT" ]; then
  echo "❌ Not in a git repository"
  exit 1
fi

HOOKS_DIR="$REPO_ROOT/.git/hooks"
TRACKED="$REPO_ROOT/scripts/hooks"

echo "📦 Installing git hooks..."
echo "   Repo: $REPO_ROOT"
echo ""

# Copy tracked hooks
if [ -f "$TRACKED/pre-commit" ]; then
  cp "$TRACKED/pre-commit" "$HOOKS_DIR/pre-commit"
  chmod +x "$HOOKS_DIR/pre-commit"
  echo "✅ pre-commit: syntax + security invariants + version sync"
else
  echo "⚠️ scripts/hooks/pre-commit not found"
fi

# Post-commit (auto-push)
cat > "$HOOKS_DIR/post-commit" << 'HOOK'
#!/bin/bash
COMMIT_MSG=$(git log -1 --pretty=%B)
if echo "$COMMIT_MSG" | grep -qE '\[skip push\]|\[skip ci\]|\[no push\]'; then
  exit 0
fi
if [ "${AUTO_PUSH}" = "false" ]; then exit 0; fi
BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "🚀 Auto-pushing to origin/$BRANCH..."
for i in 1 2 3; do
  git push origin "$BRANCH" && echo "✅ Push OK" && exit 0
  echo "⚠️ Retry $i/3..."
  sleep 3
done
echo "❌ Push failed — run 'git push' manually"
exit 0
HOOK
chmod +x "$HOOKS_DIR/post-commit"
echo "✅ post-commit: auto-push to GitHub"

echo ""
echo "💡 Skip push: AUTO_PUSH=false git commit -m '...'"
echo "💡 Skip hook:  git push --no-verify"
