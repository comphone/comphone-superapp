#!/usr/bin/env bash
# ============================================================
# verify-deploy.sh — Post-Deploy Verification
# COMPHONE SUPER APP V5.5
#
# MISSION: ตรวจสอบว่า GAS deploy ทำงานปกติได้หลัง deploy
#
# CHECKS:
#   1. Web App URL ตอบสนอง (HTTP 200/302)
#   2. Web App คืนค่าได้ (อาจใช้?health=check)
#   3. ตรวจ clasp status ว่าไฟล์ทั้งหมดอัพโหลด
#   4. ประเภทการทำงาน (version, deployment)
#
# USAGE:
#   ./scripts/verify-deploy.sh              # ใช้ .clasp.json ปัจจุบัน
#   ./scripts/verify-deploy.sh --dev        # ใช้ .clasp.dev.json
# ============================================================

set -euo pipefail

# ── Colors ──
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# ── Config ──
CLASP_DIR="clasp-ready"
USE_DEV=false
WEBAPP_URL=""

# ── Parse args ──
while [[ $# -gt 0 ]]; do
  case $1 in
    --dev)
      USE_DEV=true
      shift
      ;;
    --url)
      WEBAPP_URL="$2"
      shift 2
      ;;
    --help|-h)
      echo "Usage: $0 [--dev] [--url <webapp_url>]"
      echo ""
      echo "Options:"
      echo "  --dev     ใช้ .clasp.dev.json (สำหรับ dev script)"
      echo "  --url     ระบุ Web App URL โดยตรง (ไม่ต้องอ่าน .clasp.json)"
      echo "  --help    แสดงวิธีใช้"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# ── Banner ──
echo -e "${CYAN}"
echo "╔═══════════════════════════════════════════════════════════════════╗"
echo "║  COMPHONE SUPER APP V5.5 — Deploy Verification       ║"
echo "╚══════════════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# ── Determine config ──
CONFIG_FILE="$CLASP_DIR/.clasp.json"
if [ "$USE_DEV" = true ]; then
    CONFIG_FILE="$CLASP_DIR/.clasp.dev.json"
fi

if [ -z "$WEBAPP_URL" ]; then
    if [ ! -f "$CONFIG_FILE" ]; then
        echo -e "${RED}❌ $CONFIG_FILE not found${NC}"
        exit 1
    fi

    SCRIPT_ID=$(cat "$CONFIG_FILE" | grep -oP '"scriptId":\s*"\K[^"]+' || echo "")
    if [ -z "$SCRIPT_ID" ]; then
        echo -e "${RED}❌ scriptId not found in $CONFIG_FILE${NC}"
        exit 1
    fi

    WEBAPP_URL="https://script.google.com/macros/s/${SCRIPT_ID}/exec"
    echo -e "${BLUE}Script ID:${NC} ${SCRIPT_ID:0:15}..."
fi

echo -e "${BLUE}Web App URL:${NC} $WEBAPP_URL"
echo ""

# ── Check 1: HTTP Status ──
echo -e "${BLUE}[Check 1/4]${NC} HTTP Status Check..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -L "$WEBAPP_URL" || echo "000")

if [ "$HTTP_STATUS" = "200" ]; then
    echo -e "${GREEN}✅ HTTP 200 OK — Web app is responding${NC}"
elif [ "$HTTP_STATUS" = "302" ] || [ "$HTTP_STATUS" = "307" ]; then
    echo -e "${YELLOW}⚠️ HTTP $HTTP_STATUS Redirect — may need authentication${NC}"
elif [ "$HTTP_STATUS" = "401" ] || [ "$HTTP_STATUS" = "403" ]; then
    echo -e "${YELLOW}⚠️ HTTP $HTTP_STATUS — Authorization required (expected for some endpoints)${NC}"
elif [ "$HTTP_STATUS" = "404" ]; then
    echo -e "${RED}❌ HTTP 404 — Web app not found${NC}"
    echo "   อาจเป็นว่า deployment ยังไม่ได้สร้าง หรือ URL ไม่ถูกต้อง"
else
    echo -e "${YELLOW}⚠️ HTTP $HTTP_STATUS — Unexpected status${NC}"
fi

# ── Check 2: Content/Health ──
echo ""
echo -e "${BLUE}[Check 2/4]${NC} Response Content Check..."
RESPONSE_BODY=$(curl -s -L "$WEBAPP_URL?health=check" || echo "")

if [ -n "$RESPONSE_BODY" ]; then
    BODY_PREVIEW="${RESPONSE_BODY:0:200}"
    echo -e "${GREEN}✅ Got response (200 chars preview):${NC}"
    echo "   $BODY_PREVIEW"
else
    echo -e "${YELLOW}⚠️ Empty response body${NC}"
fi

# ── Check 3: clasp status (if available) ──
echo ""
echo -e "${BLUE}[Check 3/4]${NC} clasp Status Check..."
if command -v clasp &> /dev/null; then
    cd "$CLASP_DIR"
    if clasp status 2>/dev/null | head -20; then
        echo -e "${GREEN}✅ clasp status OK${NC}"
    else
        echo -e "${YELLOW}⚠️ clasp status failed (may need login)${NC}"
    fi
    cd - > /dev/null
else
    echo -e "${YELLOW}⚠️ clasp CLI not installed — skipping${NC}"
fi

# ── Check 4: File count ──
echo ""
echo -e "${BLUE}[Check 4/4]${NC} Deployed Files..."
FILE_COUNT=$(ls -1 $CLASP_DIR/*.{gs,html,json} 2>/dev/null | wc -l)
echo "   Local files: $FILE_COUNT"

# ── Summary ──
echo ""
echo -e "${CYAN}════════════════════════════════════════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}  📊 VERIFICATION SUMMARY${NC}"
echo -e "${CYAN}════════════════════════════════════════════════════════════════════════════════════════════════════════════════${NC}"
echo ""
echo "  HTTP Status:    $HTTP_STATUS"
echo "  Response Body:  $( [ -n "$RESPONSE_BODY" ] && echo 'Present' || echo 'Empty' )"
echo "  Local Files:    $FILE_COUNT"
echo "  URL:            $WEBAPP_URL"
echo ""

if [ "$HTTP_STATUS" = "200" ] && [ -n "$RESPONSE_BODY" ]; then
    echo -e "${GREEN}  ✅ OVERALL: Deploy looks healthy${NC}"
elif [ "$HTTP_STATUS" = "200" ] || [ "$HTTP_STATUS" = "302" ]; then
    echo -e "${YELLOW}  ⚠️ OVERALL: Partially healthy — check response content${NC}"
else
    echo -e "${RED}  ❌ OVERALL: Deploy may have issues${NC}"
fi

echo ""
echo -e "${CYAN}  ℹ️ Tips:${NC}"
echo "     • If HTTP 401/403: Web app may require auth — try opening in browser"
echo "     • If HTTP 404: Check deployment is active in GAS console"
echo "     • If empty body: Web app may not have a doGet handler"
echo ""
