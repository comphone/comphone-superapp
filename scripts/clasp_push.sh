#!/bin/bash
# ============================================================
# clasp_push.sh — COMPHONE SUPER APP V5.5
# Push ไฟล์ GAS ทั้งหมดขึ้น Google Apps Script อัตโนมัติ
#
# วิธีใช้:
#   bash scripts/clasp_push.sh              # push อย่างเดียว
#   bash scripts/clasp_push.sh --deploy     # push + สร้าง deployment ใหม่
#   bash scripts/clasp_push.sh --triggers   # push + ตั้ง triggers อัตโนมัติ
#   bash scripts/clasp_push.sh --full       # push + deploy + triggers (ครบ)
# ============================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
CLASP_DIR="$REPO_ROOT/clasp-ready"
SCRIPT_ID="1-aoCd5gXoo1dX4FjW62l8JknR3ZPiaf1W7YEmEdtq8gnRzSp4Hwj6043"

# ── Parse arguments ──────────────────────────────────────────
DO_DEPLOY=false
DO_TRIGGERS=false
for arg in "$@"; do
  case "$arg" in
    --deploy)   DO_DEPLOY=true ;;
    --triggers) DO_TRIGGERS=true ;;
    --full)     DO_DEPLOY=true; DO_TRIGGERS=true ;;
  esac
done

echo "============================================================"
echo " 🚀 COMPHONE SUPER APP V5.5 — clasp push"
echo "============================================================"
echo " Script ID : $SCRIPT_ID"
echo " Source    : $CLASP_DIR"
echo " Deploy    : $DO_DEPLOY"
echo " Triggers  : $DO_TRIGGERS"
echo "============================================================"
echo ""

# ── Step 1: ตรวจสอบ clasp ──────────────────────────────────
echo "🔍 [1/5] ตรวจสอบ clasp..."
if ! command -v clasp &> /dev/null; then
  echo "❌ ไม่พบคำสั่ง 'clasp'"
  echo "   กรุณาติดตั้งด้วยคำสั่ง: npm install -g @google/clasp"
  exit 1
fi
CLASP_VERSION=$(clasp --version 2>/dev/null || echo "unknown")
echo "   ✅ clasp พร้อมใช้งาน (version: $CLASP_VERSION)"

# ── Step 2: ตรวจสอบ login ──────────────────────────────────
echo ""
echo "🔍 [2/5] ตรวจสอบ clasp login..."
if [ ! -f "$HOME/.clasprc.json" ]; then
  echo "❌ ยังไม่ได้ Login clasp"
  echo "   กรุณารันคำสั่ง: clasp login"
  exit 1
fi
echo "   ✅ Login แล้ว"

# ── Step 3: ตรวจสอบไฟล์ .clasp.json ──────────────────────
echo ""
echo "🔍 [3/5] ตรวจสอบ .clasp.json..."
if [ ! -f "$CLASP_DIR/.clasp.json" ]; then
  echo "❌ ไม่พบ .clasp.json ใน $CLASP_DIR"
  exit 1
fi
GS_COUNT=$(ls "$CLASP_DIR"/*.gs 2>/dev/null | wc -l | tr -d ' ')
JSON_COUNT=$(python3 -c "import json; d=json.load(open('$CLASP_DIR/appsscript.json')); print(len(d.get('files',[])))" 2>/dev/null || echo "0")
echo "   ✅ .clasp.json พบแล้ว"
echo "   📁 ไฟล์ .gs จริง: $GS_COUNT ไฟล์"
echo "   📋 ไฟล์ใน appsscript.json: $JSON_COUNT ไฟล์"

if [ "$GS_COUNT" != "$JSON_COUNT" ]; then
  echo "   ⚠️  จำนวนไฟล์ไม่ตรงกัน — ตรวจสอบ appsscript.json"
fi

# ── Step 4: clasp push ────────────────────────────────────
echo ""
echo "📤 [4/5] กำลัง push ไฟล์ขึ้น Google Apps Script..."
cd "$CLASP_DIR"

# Retry loop (สูงสุด 3 ครั้ง)
PUSH_SUCCESS=false
for i in 1 2 3; do
  echo "   ▶ ครั้งที่ $i/3..."
  if clasp push --force 2>&1; then
    PUSH_SUCCESS=true
    break
  fi
  if [ $i -lt 3 ]; then
    echo "   ⚠️  Push ล้มเหลว รอ 5 วินาทีแล้วลองใหม่..."
    sleep 5
  fi
done

if [ "$PUSH_SUCCESS" = false ]; then
  echo ""
  echo "❌ clasp push ล้มเหลวทั้ง 3 ครั้ง"
  echo ""
  echo "🔧 วิธีแก้ไข:"
  echo "   1. ตรวจสอบว่าเปิดใช้งาน Google Apps Script API แล้ว:"
  echo "      https://script.google.com/home/usersettings"
  echo "   2. ตรวจสอบ Script ID ใน .clasp.json ถูกต้อง"
  echo "   3. ลอง login ใหม่: clasp login --no-localhost"
  exit 1
fi

echo ""
echo "   ✅ Push สำเร็จ! ไฟล์ทั้ง $GS_COUNT ไฟล์ขึ้น GAS แล้ว"
echo "   🔗 เปิดดูได้ที่: clasp open"

# ── Step 5 (optional): Deploy ─────────────────────────────
if [ "$DO_DEPLOY" = true ]; then
  echo ""
  echo "🌐 [5a] สร้าง Web App Deployment ใหม่..."
  DEPLOY_OUTPUT=$(clasp deploy --description "COMPHONE v5.5 — $(date '+%Y-%m-%d %H:%M')" 2>&1)
  echo "$DEPLOY_OUTPUT"
  DEPLOY_ID=$(echo "$DEPLOY_OUTPUT" | grep -oP '(?<=Created version )\d+' | head -1)
  if [ -n "$DEPLOY_ID" ]; then
    echo "   ✅ Deploy สำเร็จ (version: $DEPLOY_ID)"
  else
    echo "   ⚠️  Deploy อาจสำเร็จแต่ไม่สามารถอ่าน version ได้"
  fi
fi

# ── Step 5 (optional): Setup Triggers ─────────────────────
if [ "$DO_TRIGGERS" = true ]; then
  echo ""
  echo "⏰ [5b] ตั้งค่า Triggers อัตโนมัติ..."
  TRIGGER_OUTPUT=$(clasp run setupAllTriggers 2>&1)
  echo "$TRIGGER_OUTPUT"
  if echo "$TRIGGER_OUTPUT" | grep -q "success\|processed"; then
    echo "   ✅ Triggers ตั้งค่าสำเร็จ"
  else
    echo "   ⚠️  ไม่สามารถรัน setupAllTriggers() อัตโนมัติได้"
    echo "   → กรุณารันด้วยตนเองใน GAS Editor:"
    echo "     AutoBackup.gs → setupAllTriggers → Run"
  fi
fi

# ── Summary ───────────────────────────────────────────────
echo ""
echo "============================================================"
echo " 📊 SUMMARY"
echo "============================================================"
echo "  GAS Push      ✅ SUCCESS ($GS_COUNT files)"
[ "$DO_DEPLOY"   = true ] && echo "  Web App Deploy ✅ DONE"
[ "$DO_TRIGGERS" = true ] && echo "  Triggers Setup ✅ DONE"
echo ""
echo "  🔗 GAS Editor : https://script.google.com/d/$SCRIPT_ID/edit"
echo "  🔗 Triggers   : https://script.google.com/home/triggers"
echo "============================================================"
