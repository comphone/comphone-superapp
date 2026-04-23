#!/bin/bash
# COMPHONE SUPER APP — FULL AUTO DEPLOY PIPELINE
# PHASE 24: Hardened Backup System + Deploy Pipeline
# PHASE 25.6: OAuth2 ONLY — Service Account REMOVED (Golden Rule)
# RULES: No set -e on clasp, retry logic, timeout, verify, rclone backup

# Load env vars (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN, CLASP_TOKEN, RCLONE_CONFIG)
if [ -f "$HOME/.bashrc" ]; then source "$HOME/.bashrc" 2>/dev/null; fi

# PATH — ให้หา rclone ที่ ~/bin ด้วย
export PATH="$HOME/bin:$PATH"

# Redirect output เป็น log
LOG_FILE="/mnt/c/Users/Server/comphone-superapp/deploy.log"
exec >> "$LOG_FILE" 2>&1

echo ""
echo "================================================================"
echo "🚀 COMPHONE FULL AUTO DEPLOY START — $(date)"
echo "================================================================"

DATE=$(date +"%Y-%m-%d_%H-%M-%S")
ROOT="/mnt/c/Users/Server/comphone-superapp"

cd "$ROOT" || { echo "❌ Cannot cd to $ROOT"; exit 1; }

# ========================
# RETRY HELPER
# ========================
retry() {
  local max=3
  local delay=2
  local n=1
  while [ $n -le $max ]; do
    echo "  [retry] Attempt $n/$max: $*"
    if "$@"; then
      return 0
    fi
    if [ $n -eq $max ]; then
      echo "  [retry] All $max attempts failed"
      return 1
    fi
    n=$((n + 1))
    sleep $delay
  done
}

# ========================
# 0. PRECHECK
# ========================
echo "🔍 PRECHECK..."

MISSING=0
for f in pwa/ai_executor_runtime.js pwa/execution_lock.js pwa/approval_guard.js clasp-ready/Router.gs clasp-ready/Auth.gs; do
  if [ ! -f "$f" ]; then
    echo "❌ Missing core file: $f"
    MISSING=1
  fi
done
if [ "$MISSING" -eq 1 ]; then
  echo "❌ CORE FILE MISSING — ABORT"
  exit 1
fi
echo "✅ Core files OK"

if ! git remote get-url origin >/dev/null 2>&1; then
  echo "❌ Git remote not configured"
  exit 1
fi
echo "✅ Git remote OK"

if [ ! -f "clasp-ready/.clasp.json" ]; then
  echo "❌ .clasp.json missing"
  exit 1
fi
echo "✅ Clasp config OK"

# ========================
# 1. LOCAL BACKUP (PRIMARY)
# ========================
echo "💾 Creating local backup..."
mkdir -p backups
BACKUP_NAME="backup_$DATE.tar.gz"
BACKUP_PATH="backups/$BACKUP_NAME"

tar -czf "$BACKUP_PATH" \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='*.tar.gz' \
  --exclude='backups' \
  .

BACKUP_SIZE=$(du -h "$BACKUP_PATH" | cut -f1)
echo "✅ Local backup: $BACKUP_PATH ($BACKUP_SIZE)"

# ========================
# 2. GOOGLE DRIVE BACKUP (rclone — OAuth2 mode only, NO Service Account)
# ========================
DRIVE_OK=0
if command -v rclone >/dev/null 2>&1; then
  echo "☁️ Uploading backup to Google Drive (OAuth2)..."
  if rclone listremotes 2>/dev/null | grep -q "^gdrive:"; then
    rclone mkdir "gdrive:ComphoneBackup" 2>/dev/null || true
    if rclone copy "$BACKUP_PATH" "gdrive:ComphoneBackup/" 2>&1; then
      echo "✅ Drive backup success: $BACKUP_NAME"
      DRIVE_OK=1
    else
      echo "⚠️ rclone copy failed — using Python fallback"
    fi
  else
    echo "⚠️ rclone 'gdrive' remote not configured — using Python fallback"
  fi
else
  echo "⚠️ rclone not installed — using Python fallback"
fi

# FALLBACK: Python Drive upload (ถ้า rclone ไม่ทำงาน)
if [ "$DRIVE_OK" -eq 0 ] && [ -f "scripts/drive_backup.py" ]; then
  echo "🔄 Trying Python fallback..."
  if python3 scripts/drive_backup.py "$BACKUP_PATH" 2>&1; then
    echo "✅ Python fallback backup success"
    DRIVE_OK=1
  else
    echo "⚠️ Python fallback also failed"
  fi
fi

if [ "$DRIVE_OK" -eq 0 ]; then
  echo "❌ DRIVE BACKUP FAILED — backup only available locally"
fi

# ========================
# 3. RETENTION POLICY
# ========================
echo "🗑️ Cleaning old backups..."
# ลบ local backup เกิน 7 วัน
find backups/ -type f -name "backup_*.tar.gz" -mtime +7 -delete 2>/dev/null
LOCAL_COUNT=$(find backups/ -type f -name "backup_*.tar.gz" | wc -l)
echo "✅ Local retention: $LOCAL_COUNT backups kept"

# ลบ Drive backup เกิน 7 วัน (ถ้า rclone พร้อม)
if command -v rclone >/dev/null 2>&1 && rclone listremotes 2>/dev/null | grep -q "^gdrive:"; then
  rclone delete --min-age 7d "gdrive:ComphoneBackup/" 2>/dev/null || true
  echo "✅ Drive retention: deleted backups older than 7 days"
fi

# ========================
# 4. BACKUP STATUS LOG
# ========================
echo "$DATE - BACKUP $([ "$DRIVE_OK" -eq 1 ] && echo 'OK' || echo 'PARTIAL') - $BACKUP_NAME ($BACKUP_SIZE)" >> backup.log

# ========================
# 5. GIT PUSH (MAIN)
# ========================
echo "📦 Pushing to GitHub..."
if git diff --cached --quiet && git diff --quiet; then
  echo "⚠️ No local changes to commit"
else
  git add .
  git commit -m "AUTO DEPLOY $DATE" || echo "⚠️ Commit skipped"
fi

if retry git push origin main; then
  echo "✅ GitHub push OK"
else
  echo "❌ Git push failed after retries"
  exit 1
fi

# ========================
# 6. SYNC PRODUCTION BRANCH
# ========================
echo "🔄 Sync production branch..."
if retry git push origin main:production/v16-stable --force; then
  echo "✅ Production branch synced"
else
  echo "⚠️ Production branch sync failed (non-critical)"
fi

# ========================
# 7. DEPLOY GAS
# ========================
echo "☁️ Deploying to GAS..."
cd clasp-ready || { echo "❌ Cannot cd clasp-ready"; exit 1; }

# PHASE 25.5: Generate ~/.clasprc.json from CLASP_TOKEN env var
if [ -n "$CLASP_TOKEN" ]; then
  echo "  → Writing ~/.clasprc.json from CLASP_TOKEN env var..."
  CLASPRC="$HOME/.clasprc.json"
  # Decode if base64, otherwise use raw value
  if echo "$CLASP_TOKEN" | python3 -c "import sys,json; json.loads(sys.stdin.read())" 2>/dev/null; then
    echo "$CLASP_TOKEN" > "$CLASPRC"
  else
    echo "$CLASP_TOKEN" | base64 -d > "$CLASPRC" 2>/dev/null || echo "$CLASP_TOKEN" > "$CLASPRC"
  fi
  chmod 600 "$CLASPRC"
  echo "  ✅ ~/.clasprc.json written"
else
  echo "  ⚠️ CLASP_TOKEN not set — using existing ~/.clasprc.json"
fi

echo "  → Running clasp push..."
CLASP_OUTPUT=$(clasp push 2>&1)
CLASP_EXIT=$?

echo "$CLASP_OUTPUT"

if echo "$CLASP_OUTPUT" | grep -q "Pushed"; then
  echo "✅ GAS push verified (output contains 'Pushed')"
  GAS_OK=1
elif [ $CLASP_EXIT -eq 0 ]; then
  echo "✅ GAS push exit 0"
  GAS_OK=1
else
  echo "⚠️ clasp exit = $CLASP_EXIT, output not verified. Retrying..."
  CLASP_OUTPUT=$(retry clasp push 2>&1)
  if echo "$CLASP_OUTPUT" | grep -q "Pushed"; then
    echo "✅ GAS push verified on retry"
    GAS_OK=1
  else
    echo "❌ GAS push failed after retry"
    GAS_OK=0
  fi
fi

cd "$ROOT"

# ========================
# 7.5 AUTO-DISCOVER GAS URL + GENERATE gas_config.js
# ========================
echo "🔗 Auto-discovering GAS deployment URL..."
GAS_URL=""
if [ "$GAS_OK" = "1" ]; then
  # Deploy new version and capture URL
  DEPLOY_OUTPUT=$(clasp deploy --description "Auto Deploy $DATE" 2>&1)
  echo "$DEPLOY_OUTPUT"
  GAS_URL=$(echo "$DEPLOY_OUTPUT" | grep -oP 'https://script\.google\.com/macros/s/[A-Za-z0-9_-]+/exec' | head -1)
  if [ -n "$GAS_URL" ]; then
    echo "✅ GAS URL discovered: $GAS_URL"
    # Generate gas_config.js for frontend
    cat > "$ROOT/pwa/gas_config.js" << GASCONFIG
// AUTO-GENERATED by deploy_all.sh — DO NOT EDIT MANUALLY
// Generated: $DATE
const GAS_CONFIG = {
  url: '$GAS_URL',
  deployDate: '$DATE',
  version: 'auto'
};
// Expose globally
window.GAS_CONFIG = GAS_CONFIG;
window.COMPHONE_GAS_URL = GAS_CONFIG.url;
GASCONFIG
    echo "✅ pwa/gas_config.js generated"
  else
    echo "⚠️ Could not extract GAS URL from deploy output"
    echo "  → Using fallback: manual URL in gas_config.js"
  fi
fi

# ========================
# 8. VERIFY GITHUB PAGES
# 8. VERIFY GITHUB PAGES
# ========================
echo "🔍 Verifying GitHub Pages..."
sleep 5

PAGE_URL="https://comphone.github.io/comphone-superapp/pwa/dashboard_pc.html?nocache=$DATE"
PAGE=$(curl -sL "$PAGE_URL" 2>/dev/null || true)

if echo "$PAGE" | grep -q "AI_EXECUTOR"; then
  echo "✅ Pages updated (AI_EXECUTOR detected)"
  PAGES_OK=1
else
  echo "⚠️ Pages not updated yet (cache delay possible)"
  PAGES_OK=0
fi

INDEX_URL="https://comphone.github.io/comphone-superapp/pwa/index.html?nocache=$DATE"
INDEX=$(curl -sL "$INDEX_URL" 2>/dev/null || true)

if echo "$INDEX" | grep -q "ai_executor_runtime"; then
  echo "✅ index.html has ai_executor_runtime.js"
  INDEX_OK=1
else
  echo "⚠️ index.html may still be cached"
  INDEX_OK=0
fi

# ========================
# 9. VERIFY CORE FILES
# ========================
echo "🔍 Final core file check..."
[ -f "pwa/ai_executor_runtime.js" ] && echo "✅ AI_EXECUTOR exists" || echo "❌ Missing AI_EXECUTOR"
[ -f "pwa/execution_lock.js" ] && echo "✅ Execution Lock exists" || echo "❌ Missing Execution Lock"
[ -f "pwa/approval_guard.js" ] && echo "✅ Approval Guard exists" || echo "❌ Missing Approval Guard"

# ========================
# 10. FINAL REPORT
# ========================
echo ""
echo "================================================================"
echo "📊 DEPLOY REPORT — $DATE"
echo "================================================================"
echo "Auth Mode:          OAuth2 ONLY (SA removed)"
echo "GitHub Push:        ✅"
echo "GAS Deploy:         $([ "$GAS_OK" = "1" ] && echo '✅' || echo '❌')"
echo "Local Backup:       $BACKUP_PATH ($BACKUP_SIZE)"
echo "Drive Backup:       $([ "$DRIVE_OK" -eq 1 ] && echo '✅' || echo '❌')"
echo "Pages (dashboard):  $([ "$PAGES_OK" = "1" ] && echo '✅' || echo '⚠️')"
echo "Pages (index):      $([ "$INDEX_OK" = "1" ] && echo '✅' || echo '⚠️')"
echo "================================================================"
echo "🎯 DEPLOY COMPLETE — $(date)"
echo "================================================================"
echo ""
