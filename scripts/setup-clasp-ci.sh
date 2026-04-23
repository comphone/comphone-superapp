#!/usr/bin/env bash
# ============================================================
# setup-clasp-ci.sh — Generate CLASP_CREDENTIALS for GitHub Actions
# COMPHONE SUPER APP V5.5
#
# MISSION: ช่วยสร้าง CLASP_CREDENTIALS secret สำหรับ GitHub Actions
#
# WHAT IT DOES:
#   1. อ่าน ~/.clasprc.json จากเครื่อง local
#   2. Encode เป็น base64
#   3. แสดงวิธีการเพิ่มเข้า GitHub Secrets
#
# PREREQUISITES:
#   - เคยรัน clasp login บน local machine แล้ว
#   - มี ~/.clasprc.json อยู่
#   - ติดตั้ง gh CLI หรือทำด้วยมือ
#
# USAGE:
#   ./scripts/setup-clasp-ci.sh
#   ./scripts/setup-clasp-ci.sh --copy  # คัดลอง base64 ไว้ clipboard
# ============================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

COPY_MODE=false
CLASPRC="$HOME/.clasprc.json"

# ── Parse args ──
while [[ $# -gt 0 ]]; do
  case $1 in
    --copy)
      COPY_MODE=true
      shift
      ;;
    --help|-h)
      echo "Usage: $0 [--copy]"
      echo ""
      echo "Options:"
      echo "  --copy   คัดลอง base64 ไว้ clipboard หลังแสดงผล"
      echo "  --help   แสดงวิธีใช้"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

echo -e "${CYAN}"
echo "╔══════════════════════════════════════════════════════════════════════════╗"
echo "║  COMPHONE SUPER APP V5.5 — CI Credential Setup       ║"
echo "╚══════════════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# ── Step 1: Check clasprc ──
echo -e "${BLUE}[1/4]${NC} ตรวจหา ~/.clasprc.json..."
if [ ! -f "$CLASPRC" ]; then
    echo -e "${RED}❌ $CLASPRC not found${NC}"
    echo ""
    echo "คุณยังไม่ได้รัน clasp login — กรุณารันก่อน:"
    echo "  clasp login"
    echo ""
    echo "แล้วลองใหม่อีกครั้ง"
    exit 1
fi

echo -e "${GREEN}✅ Found: $CLASPRC${NC}"

# ── Step 2: Validate JSON ──
echo -e "${BLUE}[2/4]${NC} ตรวจว่าเป็น JSON ที่ถูกต้อง..."
if ! python3 -c "import json; json.load(open('$CLASPRC'))" 2>/dev/null; then
    echo -e "${RED}❌ $CLASPRC ไม่ใช่ JSON ที่ถูกต้อง${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Valid JSON${NC}"

# ── Step 3: Encode ──
echo -e "${BLUE}[3/4]${NC} Encode เป็น base64..."
B64=$(cat "$CLASPRC" | base64 -w 0)
B64_LENGTH=${#B64}

echo -e "${GREEN}✅ Encoded ($B64_LENGTH chars)${NC}"

# ── Step 4: Show instructions ──
echo ""
echo -e "${CYAN}═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}⚠️ อย่ากระบุ base64 นี้ให้ใครอื่น! มันคือข้อมูลล็อกอินที่สำคัญ${NC}"
echo ""

if [ "$COPY_MODE" = true ]; then
    # Try to copy to clipboard
    if command -v xclip &> /dev/null; then
        echo "$B64" | xclip -selection clipboard
        echo -e "${GREEN}✅ Copied to clipboard!${NC}"
    elif command -v pbcopy &> /dev/null; then
        echo "$B64" | pbcopy
        echo -e "${GREEN}✅ Copied to clipboard!${NC}"
    elif command -v clip.exe &> /dev/null; then
        echo "$B64" | clip.exe
        echo -e "${GREEN}✅ Copied to Windows clipboard!${NC}"
    else
        echo -e "${YELLOW}⚠️ No clipboard tool found — manual copy required${NC}"
    fi
fi

echo ""
echo -e "${BLUE}📋 วิธีเพิ่มเข้้า GitHub Secrets:${NC}"
echo ""
echo "   1. ไปที่ GitHub → Repository → Settings → Secrets → Actions"
echo "   2. Click 'New repository secret'"
echo "   3. Name:  CLASP_CREDENTIALS"
echo "   4. Value: [paste base64 string ด้านล่าง]"
echo "   5. Click 'Add secret'"
echo ""
echo "   หรือใช้ gh CLI:"
echo "   gh secret set CLASP_CREDENTIALS --body '$B64'"
echo ""
echo -e "${CYAN}════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════${NC}"

# ── Step 5: Environment setup reminder ──
echo ""
echo -e "${BLUE}🔐 ขั้นตอนถัดไป (ใน GitHub UI):${NC}"
echo ""
echo "   1. ไป Settings → Environments → New environment"
echo "      Name: production"
echo ""
echo "   2. ใน Protection rules:"
echo "      ☑️ Required reviewers: 1 (add ชื่อของคุณ)"
echo "      ☑️ Wait timer: 30 seconds"
echo "      ☑️ Deployment branches: main only"
echo ""
echo -e "${GREEN}✅ เมื่อทำทั้งหมด แล้ว GitHub Actions จะ deploy GAS ได้อัตโนมัติ!${NC}"
