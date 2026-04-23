#!/bin/bash
# ============================================================
# clasp_push.sh -- COMPHONE SUPER APP V5.5
# Push ไฟล์ GAS ทั้งหมดขึ้น Google Apps Script อัตโนมัติ
#
# วิธีใช้ (รันจาก root ของโปรเจกต์):
#   bash scripts/clasp_push.sh              # push อย่างเดียว
#   bash scripts/clasp_push.sh --deploy     # push + สร้าง deployment ใหม่
#   bash scripts/clasp_push.sh --triggers   # push + ตั้ง triggers อัตโนมัติ
#   bash scripts/clasp_push.sh --full       # push + deploy + triggers (ครบ)
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
CLASP_DIR="$REPO_ROOT/clasp-ready"
SCRIPT_ID="1-aoCd5gXoo1dX4FjW62l8JknR3ZPiaf1W7YEmEdtq8gnRzSp4Hwj6043"

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
echo " COMPHONE SUPER APP V5.5 -- clasp push"
echo "============================================================"
echo " Script ID : $SCRIPT_ID"
echo " Source    : $CLASP_DIR"
echo " Deploy    : $DO_DEPLOY"
echo " Triggers  : $DO_TRIGGERS"
echo "============================================================"
echo ""

# ── Step 1: ตรวจสอบ clasp ────────────────────────────────────
echo "[1/5] ตรวจสอบ clasp..."
if ! command -v clasp > /dev/null 2>&1; then
  echo "[ERROR] ไม่พบคำสั่ง 'clasp'"
  echo "        กรุณาติดตั้งด้วยคำสั่ง: npm install -g @google/clasp"
  exit 1
fi
CLASP_VER=$(clasp --version 2>/dev/null || echo "unknown")
echo "[OK] clasp พร้อมใช้งาน ($CLASP_VER)"

# ── Step 2: ตรวจสอบ login ────────────────────────────────────
echo ""
echo "[2/5] ตรวจสอบ clasp login..."

# รองรับทั้ง Linux/Mac (~/.clasprc.json) และ Windows Git Bash
CLASPRC_PATHS=(
  "$HOME/.clasprc.json"
  "$USERPROFILE/.clasprc.json"
  "/c/Users/$USERNAME/.clasprc.json"
)
CLASPRC_FOUND=false
for p in "${CLASPRC_PATHS[@]}"; do
  if [ -f "$p" ]; then
    CLASPRC_FOUND=true
    echo "[OK] Login แล้ว (พบ $p)"
    break
  fi
done

if [ "$CLASPRC_FOUND" = false ]; then
  echo "[ERROR] ยังไม่ได้ Login clasp"
  echo "        กรุณารันคำสั่ง: clasp login"
  exit 1
fi

# ── Step 3: ตรวจสอบ .clasp.json ──────────────────────────────
echo ""
echo "[3/5] ตรวจสอบ .clasp.json..."
if [ ! -f "$CLASP_DIR/.clasp.json" ]; then
  echo "[ERROR] ไม่พบ .clasp.json ใน $CLASP_DIR"
  exit 1
fi

GS_COUNT=$(ls "$CLASP_DIR"/*.gs 2>/dev/null | wc -l | tr -d ' ')
echo "[OK] .clasp.json พบแล้ว"
echo "     ไฟล์ .gs จริง: $GS_COUNT ไฟล์"

# ── Step 4: clasp push ────────────────────────────────────────
echo ""
echo "[4/5] กำลัง push ไฟล์ขึ้น Google Apps Script..."
cd "$CLASP_DIR" || exit 1

PUSH_SUCCESS=false
for i in 1 2 3; do
  echo "  ครั้งที่ $i/3..."
  if clasp push --force; then
    PUSH_SUCCESS=true
    echo "[OK] Push สำเร็จ! ($GS_COUNT ไฟล์)"
    break
  fi
  if [ "$i" -lt 3 ]; then
    echo "  Push ล้มเหลว รอ 5 วินาที..."
    sleep 5
  fi
done

if [ "$PUSH_SUCCESS" = false ]; then
  echo ""
  echo "[ERROR] clasp push ล้มเหลวทั้ง 3 ครั้ง"
  echo ""
  echo "วิธีแก้ไข:"
  echo "  1. เปิดใช้งาน Apps Script API:"
  echo "     https://script.google.com/home/usersettings"
  echo "  2. ตรวจสอบ Script ID ใน .clasp.json"
  echo "  3. ลอง login ใหม่: clasp login"
  exit 1
fi

# ── Step 5a (optional): Deploy ────────────────────────────────
if [ "$DO_DEPLOY" = true ]; then
  echo ""
  echo "[5a] สร้าง Web App Deployment ใหม่..."
  DEPLOY_OUT=$(clasp deploy --description "COMPHONE v5.5 -- $(date '+%Y-%m-%d %H:%M')" 2>&1)
  echo "$DEPLOY_OUT"
  if echo "$DEPLOY_OUT" | grep -qi "created\|version"; then
    echo "[OK] Deploy สำเร็จ"
  else
    echo "[WARN] Deploy อาจมีปัญหา ตรวจสอบใน GAS Editor"
  fi
fi

# ── Step 5b (optional): Setup Triggers ────────────────────────
if [ "$DO_TRIGGERS" = true ]; then
  echo ""
  echo "[5b] ตั้งค่า Triggers อัตโนมัติ..."
  TRIGGER_OUT=$(clasp run setupAllTriggers 2>&1)
  echo "$TRIGGER_OUT"
  if echo "$TRIGGER_OUT" | grep -qi "success\|processed"; then
    echo "[OK] Triggers ตั้งค่าสำเร็จ"
  else
    echo "[WARN] ไม่สามารถรัน setupAllTriggers() อัตโนมัติได้"
    echo "       กรุณารันด้วยตนเองใน GAS Editor:"
    echo "       AutoBackup.gs -> setupAllTriggers -> Run"
  fi
fi

# ── Summary ───────────────────────────────────────────────────
echo ""
echo "============================================================"
echo " SUMMARY"
echo "============================================================"
echo "  GAS Push      SUCCESS ($GS_COUNT files)"
if [ "$DO_DEPLOY"   = true ]; then echo "  Web App Deploy DONE"; fi
if [ "$DO_TRIGGERS" = true ]; then echo "  Triggers Setup DONE"; fi
echo ""
echo "  GAS Editor : https://script.google.com/d/$SCRIPT_ID/edit"
echo "  Triggers   : https://script.google.com/home/triggers"
echo "============================================================"
