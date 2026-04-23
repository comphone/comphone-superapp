#!/usr/bin/env bash
# ============================================================
# local-dev-push.sh — Safe Local Development Push
# COMPHONE SUPER APP V5.5
#
# MISSION: Push ไป dev script อย่างปลอดภัย — production ให้ GitHub Actions จัดการเท่านั้น
#
# SAFETY GUARDS:
#   1. ตรวจว่าใช้ .clasp.dev.json (ไม่ใช้ .clasp.json ที่เป็น production)
#   2. แสดง warning ถ้า scriptId ตรงกับ production
#   3. ข้อความยืนยันก่อน push
#   4. สร้าง version อัตโนมัติทุกครั้ง
#
# USAGE:
#   ./scripts/local-dev-push.sh              # push ไป dev
#   ./scripts/local-dev-push.sh --force      # ข้ามการยืนยัน
# ============================================================

set -euo pipefail

# ── Colors ──
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ── Config ──
CLASP_DIR="clasp-ready"
DEV_CONFIG="$CLASP_DIR/.clasp.dev.json"
PROD_CONFIG="$CLASP_DIR/.clasp.json"
FORCE=false

# ── Parse args ──
while [[ $# -gt 0 ]]; do
  case $1 in
    --force)
      FORCE=true
      shift
      ;;
    --help|-h)
      echo "Usage: $0 [--force]"
      echo ""
      echo "Options:"
      echo "  --force   ข้ามการยืนยันก่อน push (ไม่แนะนำ)"
      echo "  --help    แสดงวิธีใช้"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      echo "Use --help for usage"
      exit 1
      ;;
  esac
done

# ── Banner ──
echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════════════════════╗"
echo "║  COMPHONE SUPER APP V5.5 — Local Dev Push        ║"
echo "║  ⚠️  Production deploy ให้ GitHub Actions เท่านั้ນ  ║"
echo "╚══════════════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# ── Step 1: Check clasp CLI ──
echo -e "${BLUE}[1/6]${NC} ตรวจสอบ clasp CLI..."
if ! command -v clasp &> /dev/null; then
    echo -e "${RED}❌ clasp ไม่พบ — รัน: npm install -g @google/clasp${NC}"
    exit 1
fi
echo -e "${GREEN}✅ clasp $(clasp --version)${NC}"

# ── Step 2: Check dev config ──
echo -e "${BLUE}[2/6]${NC} ตรวจสอบ dev config (.clasp.dev.json)..."
if [ ! -f "$DEV_CONFIG" ]; then
    echo -e "${RED}❌ $DEV_CONFIG ไม่พบ${NC}"
    echo ""
    echo "วิธีสร้าງ:"
    echo "1. Copy $PROD_CONFIG ไปที่ $DEV_CONFIG"
    echo "2. เปลี่ยน scriptId เป็น dev script ID"
    echo "3. อย่างทำงานกับ production ID!"
    exit 1
fi

DEV_SCRIPT_ID=$(cat "$DEV_CONFIG" | grep -oP '"scriptId":\s*"\K[^"]+' || echo "")
if [ -z "$DEV_SCRIPT_ID" ] || [ "$DEV_SCRIPT_ID" = "YOUR_DEV_SCRIPT_ID_HERE" ]; then
    echo -e "${RED}❌ Dev scriptId ไม่ได้ตั้งค่า${NC}"
    echo "กรุณาแก้ไข $DEV_CONFIG ให้มี scriptId ที่ถูกต้อง"
    exit 1
fi
echo -e "${GREEN}✅ Dev config OK (Script ID: ${DEV_SCRIPT_ID:0:15}...)${NC}"

# ── Step 3: Safety Check — Compare with production ──
echo -e "${BLUE}[3/6]${NC} ตรวจความปลอดภัย..."
PROD_SCRIPT_ID=""
if [ -f "$PROD_CONFIG" ]; then
    PROD_SCRIPT_ID=$(cat "$PROD_CONFIG" | grep -oP '"scriptId":\s*"\K[^"]+' || echo "")
fi

if [ "$DEV_SCRIPT_ID" = "$PROD_SCRIPT_ID" ] && [ -n "$PROD_SCRIPT_ID" ]; then
    echo -e "${RED}"
    echo "═════════════════════════════════════════════════════════════════"
    echo "  🚨 DANGER: Dev config ใช้ production Script ID!"
    echo ""
    echo "  Dev Script ID:  $DEV_SCRIPT_ID"
    echo "  Prod Script ID: $PROD_SCRIPT_ID"
    echo ""
    echo "  ถ้าคุณ push ตอนนี้ จะไปทับ production โดยตรง!"
    echo "  Production deploy ควรให้ GitHub Actions จัดการเท่านั้น"
    echo "═════════════════════════════════════════════════════════════════"
    echo -e "${NC}"

    if [ "$FORCE" = false ]; then
        echo -e "${YELLOW}กรุณาใช้ --force หากต้องการ push ไป production (ไม่แนะนำ)${NC}"
        exit 1
    else
        echo -e "${YELLOW}⚠️ --force ใช้งาน — กำลังจะ push ไป production...${NC}"
        echo "หยุด 5 วินาที เพื่อ cancel กด Ctrl+C"
        sleep 5
    fi
else
    echo -e "${GREEN}✅ Safety check passed — dev script ID ไม่ตรงกับ production${NC}"
fi

# ── Step 4: Confirm push ──
if [ "$FORCE" = false ]; then
    echo ""
    echo -e "${YELLOW}ยืนยัน: คุณกำลังจะ push ไป dev script${NC}"
    echo "  Script ID: ${DEV_SCRIPT_ID:0:15}..."
    echo "  Files: $(ls -1 $CLASP_DIR/*.{gs,html,json} 2>/dev/null | wc -l) files"
    echo ""
    read -p "กด Enter เพื่อดำเนินการ หรืห Ctrl+C เพื่อยกเลิก: "
fi

# ── Step 5: Push ──
echo -e "${BLUE}[5/6]${NC} กำลัง push ไป dev script..."
cd "$CLASP_DIR"

# Use dev config
if ! clasp push --rootDir . --config $DEV_CONFIG 2>&1; then
    echo -e "${RED}❌ Push failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Push successful!${NC}"

# ── Step 6: Create version ──
echo -e "${BLUE}[6/6]${NC} สร้าง version..."
VERSION_DESC="dev-$(date +%Y%m%d-%H%M)"
if clasp version "$VERSION_DESC" 2>&1; then
    echo -e "${GREEN}✅ Version created: $VERSION_DESC${NC}"
else
    echo -e "${YELLOW}⚠️ Could not create version (non-fatal)${NC}"
fi

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✅ Dev push complete!                                      ║${NC}"
echo -e "${GREEN}║                                                           ║${NC}"
echo -e "${GREEN}║  ℹ️ Production deploy ให้ GitHub Actions เท่านั้น     ║${NC}"
echo -e "${GREEN}║     • Commit และ push ไป main                        ║${NC}"
echo -e "${GREEN}║     • GitHub Actions จะ deploy ให้อัตโนมัติ        ║${NC}"
echo -e "${GREEN}║     • ต้องมีคนอนุมัติใน Environment 'production'  ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════════════════╝${NC}"
