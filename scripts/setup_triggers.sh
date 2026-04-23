#!/bin/bash
# COMPHONE SUPER APP V5.5
# Script สำหรับรัน setupAllTriggers() อัตโนมัติผ่าน clasp

echo "============================================================"
echo " 🚀 COMPHONE SUPER APP V5.5 — Auto Trigger Setup"
echo "============================================================"

# ตรวจสอบว่าติดตั้ง clasp หรือยัง
if ! command -v clasp &> /dev/null; then
    echo "❌ ไม่พบคำสั่ง 'clasp' กรุณาติดตั้งด้วยคำสั่ง:"
    echo "   npm install -g @google/clasp"
    exit 1
fi

# ตรวจสอบว่า login หรือยัง
if [ ! -f ~/.clasprc.json ]; then
    echo "❌ ยังไม่ได้ Login clasp กรุณารันคำสั่ง:"
    echo "   clasp login"
    exit 1
fi

cd "$(dirname "$0")/../clasp-ready" || exit 1

echo "กำลังรันฟังก์ชัน setupAllTriggers() บน Google Apps Script..."
echo "โปรดรอสักครู่..."

# รันฟังก์ชันผ่าน clasp run
# หมายเหตุ: ต้องเปิดใช้งาน Apps Script API ใน Google Cloud Console ก่อน
# และต้องตั้งค่า "executionApi.access": "ANYONE" ใน appsscript.json (ถ้าจำเป็น)
clasp run setupAllTriggers

if [ $? -eq 0 ]; then
    echo "✅ ตั้งค่า Triggers สำเร็จ!"
    echo "คุณสามารถตรวจสอบ Triggers ได้ที่: https://script.google.com/home/triggers"
else
    echo "❌ เกิดข้อผิดพลาดในการรันคำสั่ง"
    echo "คำแนะนำ:"
    echo "1. ตรวจสอบว่าเปิดใช้งาน Apps Script API แล้ว (https://script.google.com/home/usersettings)"
    echo "2. ตรวจสอบว่า Project ID ใน .clasp.json ถูกต้อง"
    echo "3. ลองรัน 'clasp login' ใหม่อีกครั้ง"
fi
