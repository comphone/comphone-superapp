#!/bin/bash
# COMPHONE SUPER APP — Rclone Setup Helper
# ใช้งาน: bash scripts/setup_rclone.sh
# ขั้นตอน:
#   1. รันสคริปต์
#   2. คัดลอง rclone config (จะได้ URL ให้เปิดใน browser)
#   3. วาง authorization code กลับมา
#   4. ทดสอบว่าใช้งานได้

export PATH="$HOME/bin:$PATH"

echo "🔐 RCLONE SETUP FOR GOOGLE DRIVE"
echo "================================"

if ! command -v rclone >/dev/null 2>&1; then
  echo "❌ rclone ไม่พบ — กำลังติดตั้ง..."
  curl -fsSL https://rclone.org/install.sh | bash
  export PATH="$HOME/bin:$PATH"
fi

echo ""
echo "📁 กำลังเปิด rclone config..."
echo "   ให้ทำตามขั้นตอนนี้:"
echo ""
echo "   1) เลือก 'n' (New remote)"
echo "   2) ใส่ชื่อ: gdrive"
echo "   3) เลือก 'drive' (ลำดับ Google Drive)"
echo "   4) client_id → กด Enter (ใช้ default)"
echo "   5) client_secret → กด Enter (ใช้ default)"
echo "   6) scope → เลือก '1' (Full access)"
echo "   7) root_folder_id → กด Enter"
echo "   8) service_account_file → กด Enter"
echo "   9) Edit advanced config? → กด 'n'"
echo "  10) Use auto config? → กด 'y' (จะเปิด browser ให้ login Google)"
echo "  11) วาง authorization code ที่ได้กลับมาใส่"
echo "  12) เลือก 'q' (Quit config)"
echo ""
echo "⏳ กำลังเปิด rclone config ใน 3 วินาที..."
sleep 3

rclone config

echo ""
echo "🔍 ทดสอบการเชื่อมต่อ..."
if rclone listremotes 2>/dev/null | grep -q "^gdrive:"; then
  echo "✅ gdrive remote พร้อมใช้งานแล้ว"
  
  echo "📁 สร้างโฟลเดอร์ ComphoneBackup..."
  rclone mkdir "gdrive:ComphoneBackup" 2>/dev/null || true
  
  echo "🔍 รายการไฟล์ในโฟลเดอร์ ComphoneBackup:"
  rclone ls "gdrive:ComphoneBackup" 2>/dev/null | tail -5 || echo "  (ว่างเปล่า)"
  
  echo ""
  echo "🎯 RCLONE SETUP COMPLETE — ใช้งานได้แล้ว"
else
  echo "❌ ยังไม่พบ gdrive remote — กรุณาลองใหม่"
fi
