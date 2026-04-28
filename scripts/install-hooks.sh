#!/bin/bash
# Install git hooks for COMPHONE SUPER APP.
# Run: bash scripts/install-hooks.sh

REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)
if [ -z "$REPO_ROOT" ]; then
  echo "Not in a git repository"
  exit 1
fi

HOOKS_DIR="$REPO_ROOT/.git/hooks"
TRACKED="$REPO_ROOT/scripts/hooks"

echo "Installing git hooks..."
echo "Repo: $REPO_ROOT"
echo ""

if [ -f "$TRACKED/pre-commit" ]; then
  cp "$TRACKED/pre-commit" "$HOOKS_DIR/pre-commit"
  chmod +x "$HOOKS_DIR/pre-commit"
  echo "pre-commit: syntax + security invariants + PWA guard + version sync"
else
  echo "scripts/hooks/pre-commit not found"
fi

cat > "$HOOKS_DIR/post-commit" << 'HOOK'
#!/bin/bash
COMMIT_MSG=$(git log -1 --pretty=%B)
if echo "$COMMIT_MSG" | grep -qE '\[skip push\]|\[skip ci\]|\[no push\]'; then
  echo "Push skipped"
  exit 0
fi
if [ "${AUTO_PUSH}" = "false" ]; then exit 0; fi
BRANCH=$(git rev-parse --abbrev-ref HEAD)
HTTPS_REMOTE="https://github.com/comphone/comphone-superapp.git"

echo "Auto-pushing to origin/$BRANCH..."
for i in 1 2 3; do
  git push origin "$BRANCH" && echo "Push OK" && exit 0
  echo "origin push failed; retrying via HTTPS ($i/3)..."
  git push "$HTTPS_REMOTE" "$BRANCH" && echo "HTTPS push OK" && exit 0
  sleep 3
done

echo "Push failed - run: git push https://github.com/comphone/comphone-superapp.git $BRANCH"
exit 0
HOOK
chmod +x "$HOOKS_DIR/post-commit"
echo "post-commit: auto-push to GitHub with HTTPS fallback"

echo ""
echo "Skip push: AUTO_PUSH=false git commit -m '...'"
echo "Skip hook: git push --no-verify"
