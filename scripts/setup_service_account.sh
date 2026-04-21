#!/bin/bash
# ===================================================================
# COMPHONE SUPER APP — PHASE 24.2
# SERVICE ACCOUNT AUTO-SETUP (No Browser, No Login, Cron-Ready)
# ===================================================================
# ใช้งาน: bash scripts/setup_service_account.sh
# ข้อกำหนด: ต้องมีไฟล์ service-account.json จาก Google Cloud Console
#
# ขั้นตอนการใช้:
#   1. ไปที่ https://console.cloud.google.com/
#   2. IAM & Admin → Service Accounts → Create
#   3. สร้าง Key (JSON) → Download
#   4. วางไฟล์ไว้ที่: ~/.config/rclone/service-account.json
#   5. รันสคริปต์นี้
# ===================================================================

set -euo pipefail
export PATH="$HOME/bin:$PATH"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SA_FILE="$HOME/.config/rclone/service-account.json"
RCLONE_CONF="$HOME/.config/rclone/rclone.conf"

echo -e "${BLUE}🔐 PHASE 24.2 — SERVICE ACCOUNT BACKUP SETUP${NC}"
echo "=============================================="

# -------------------------------------------------------------------
# CHECK 1: rclone installed?
# -------------------------------------------------------------------
if ! command -v rclone >/dev/null 2>&1; then
    echo -e "${RED}❌ rclone ไม่พบ — กำลังติดตั้ง...${NC}"
    curl -fsSL https://rclone.org/install.sh | bash
    export PATH="$HOME/bin:$PATH"
fi
echo -e "${GREEN}✅ rclone: $(rclone version | head -1)${NC}"

# -------------------------------------------------------------------
# CHECK 2: service-account.json exists?
# -------------------------------------------------------------------
if [ ! -f "$SA_FILE" ]; then
    echo ""
    echo -e "${RED}❌ ไม่พบไฟล์ service-account.json${NC}"
    echo ""
    echo -e "${YELLOW}📋 ขั้นตอนที่ต้องทำใน Google Cloud Console:${NC}"
    echo "   1. ไปที่ https://console.cloud.google.com/"
    echo "   2. เลือกโปรเจกต์ (หรือสร้างใหม่)"
    echo "   3. IAM & Admin → Service Accounts"
    echo "   4. กด CREATE SERVICE ACCOUNT"
    echo "   5. Name: comphone-backup"
    echo "   6. กด Create and Continue"
    echo "   7. Grant access: เลือก Role 'Storage → Storage Object Admin'"
    echo "      (หรือ 'Editor' ถ้าไม่เจอ Storage)"
    echo "   8. กด Continue → DONE"
    echo "   9. คลิกที่ Service Account ที่สร้าง"
    echo "  10. แท็บ KEYS → ADD KEY → Create new key → JSON"
    echo "  11. ไฟล์จะดาวน์โหลดอัตโนมัติ"
    echo ""
    echo -e "${YELLOW}📁 จากนั้นวางไฟล์ไว้ที่นี่:${NC}"
    echo "   cp /mnt/c/Users/Server/Downloads/comphone-backup-*.json \\"
    echo "      $SA_FILE"
    echo ""
    echo -e "${YELLOW}🔁 แล้วรันสคริปต์นี้อีกครั้ง${NC}"
    exit 1
fi

echo -e "${GREEN}✅ พบไฟล์ service-account.json${NC}"

# Validate JSON
if ! python3 -m json.tool "$SA_FILE" >/dev/null 2>&1; then
    echo -e "${RED}❌ ไฟล์ service-account.json ไม่ใช่ JSON ที่ถูกต้อง${NC}"
    exit 1
fi
SA_EMAIL=$(python3 -c "import json; print(json.load(open('$SA_FILE'))['client_email'])")
echo -e "${GREEN}📧 Service Account: $SA_EMAIL${NC}"

# -------------------------------------------------------------------
# STEP 3: Create rclone config (NO BROWSER)
# -------------------------------------------------------------------
echo ""
echo -e "${BLUE}⚙️  กำลังสร้าง rclone config...${NC}"

# Remove old gdrive config if exists
if [ -f "$RCLONE_CONF" ]; then
    sed -i '/^\[gdrive\]/,/^\[.*\]$/d' "$RCLONE_CONF" 2>/dev/null || true
    sed -i '/^\[gdrive\]/,$d' "$RCLONE_CONF" 2>/dev/null || true
fi

# Create new config
cat >> "$RCLONE_CONF" <<EOF
[gdrive]
type = drive
scope = drive
service_account_file = $SA_FILE
EOF

echo -e "${GREEN}✅ rclone config สร้างเสร็จแล้ว${NC}"

# -------------------------------------------------------------------
# STEP 4: Verify connection
# -------------------------------------------------------------------
echo ""
echo -e "${BLUE}🔍 ทดสอบการเชื่อมต่อ Google Drive...${NC}"
if rclone listremotes 2>/dev/null | grep -q "^gdrive:"; then
    echo -e "${GREEN}✅ gdrive remote พร้อมใช้งาน${NC}"
else
    echo -e "${RED}❌ gdrive remote ไม่พร้อมใช้งาน${NC}"
    exit 1
fi

# Test listing root
echo ""
echo -e "${BLUE}📂 รายการโฟลเดอร์ใน Drive Root:${NC}"
rclone lsf gdrive: 2>/dev/null | head -10 || echo "  (Drive ว่าง หรือยังไม่มีโฟลเดอร์)"

# -------------------------------------------------------------------
# STEP 5: Create ComphoneBackup folder
# -------------------------------------------------------------------
echo ""
echo -e "${BLUE}📁 สร้างโฟลเดอร์ ComphoneBackup...${NC}"
rclone mkdir "gdrive:ComphoneBackup" 2>/dev/null || true
echo -e "${GREEN}✅ โฟลเดอร์พร้อมใช้งาน${NC}"

# -------------------------------------------------------------------
# STEP 6: Test upload
# -------------------------------------------------------------------
echo ""
echo -e "${BLUE}☁️ ทดสอบอัปโหลดไฟล์...${NC}"
TEST_FILE="/tmp/rclone_test_$(date +%s).txt"
echo "Comphone Backup Test — $(date)" > "$TEST_FILE"

if rclone copy "$TEST_FILE" "gdrive:ComphoneBackup/" 2>&1; then
    echo -e "${GREEN}✅ อัปโหลดสำเร็จ${NC}"
    echo ""
    echo -e "${BLUE}📂 ไฟล์ใน ComphoneBackup:${NC}"
    rclone ls "gdrive:ComphoneBackup" 2>/dev/null
else
    echo -e "${RED}❌ อัปโหลดล้มเหลว${NC}"
    echo ""
    echo -e "${YELLOW}💡 แนะนำ: ตรวจสอบว่า Service Account มีสิทธิ์เข้าถึง Drive${NC}"
    echo "   ไปที่ Google Drive → สร้างโฟลเดอร์ ComphoneBackup → แชร์ให้:"
    echo "   $SA_EMAIL"
    echo "   (ต้องให้สิทธิ์ Editor หรือ Admin)"
    rm -f "$TEST_FILE"
    exit 1
fi

rm -f "$TEST_FILE"

# -------------------------------------------------------------------
# STEP 7: Verify retention script capability
# -------------------------------------------------------------------
echo ""
echo -e "${BLUE}🗑️ ทดสอบ retention policy (dry-run)...${NC}"
rclone delete --dry-run --min-age 7d "gdrive:ComphoneBackup/" 2>/dev/null || true
echo -e "${GREEN}✅ Retention policy พร้อมใช้งาน${NC}"

# -------------------------------------------------------------------
# DONE
# -------------------------------------------------------------------
echo ""
echo "=============================================="
echo -e "${GREEN}🎯 PHASE 24.2 COMPLETE — SERVICE ACCOUNT READY${NC}"
echo "=============================================="
echo ""
echo -e "${BLUE}📊 สรุป:${NC}"
echo "   • No browser required ✅"
echo "   • No token renewal ✅"
echo "   • Cron-compatible ✅"
echo "   • Server-compatible ✅"
echo ""
echo -e "${BLUE}🔄 ครั้งถัดไป cron รัน deploy_all.sh:${NC}"
echo "   backup จะขึ้น Google Drive อัตโนมัติ"
echo ""
echo -e "${YELLOW}⚠️  หมายเหตุ: ถ้าไฟล์ไม่ขึ้น Drive ตรวจสอบ:${NC}"
echo "   1. Service Account ต้องแชร์โฟลเดอร์ ComphoneBackup"
echo "   2. Role ต้องเป็น Editor ขึ้นไป"
echo "   3. Google Drive API ต้องเปิดใช้งานในโปรเจกต์"
