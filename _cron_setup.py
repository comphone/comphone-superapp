# -*- coding: utf-8 -*-
"""Setup cron triggers for Comphone Super App"""
import subprocess
import json

# ตั้งเวลาตาม Asia/Bangkok (UTC+7)
triggers = [
    {
        "functionName": "autoBackup",
        "timeZone": "Asia/Bangkok",
        "schedule": "0 0 * * *",  # ทุก 00:00
        "description": "สำรองข้อมูลทุกเที่ยงคืน"
    },
    {
        "functionName": "checkLowStockAlert",
        "timeZone": "Asia/Bangkok", 
        "schedule": "0 6,12,18 * * *",  # ทุก 6 ชม (6:00, 12:00, 18:00)
        "description": "เช็คสต็อกทุก 6 ชั่วโมง"
    },
    {
        "functionName": "geminiReorderSuggestion",
        "timeZone": "Asia/Bangkok",
        "schedule": "0 9 * * *",  # ทุก 09:00
        "description": "Gemini วิเคราะห์สั่งซื้อแนะนำทุกวัน"
    },
    {
        "functionName": "getCRMSchedule", 
        "timeZone": "Asia/Bangkok",
        "schedule": "0 8 * * 1",  # จันทรทุก 08:00
        "description": "เช็ค CRM เช็คระยะทุกจันทร์เช้า"
    }
]

print("🔧 ตั้ง Cron Triggers:")
print(f"{'ลำดับ':<6} {'ฟังก์ชัน':<25} {'เวลา':<20} {'คำอธิบาย'}")
print("-" * 80)
for i, t in enumerate(triggers):
    print(f"{i+1:<6} {t['functionName']:<25} {t['schedule']:<20} {t['description']}")

print("\n⚠️  GAS Cron ต้องสร้างด้วย Apps Script UI:")
print("📌 ไปที่ https://script.google.com → เลือกโปรเจกต์")
print("📌 เมนูด้านซ้าย: ตัวกระตุ้น (Triggers) → + เพิ่มตัวกระตุ้น")
print("📌 ตั้งค่า 4 ตัวตามตารางด้านบน")
print("\nหรือใช้ script ด้านล่าง:")
for i, t in enumerate(triggers):
    print(f'\n// ตัวที่ {i+1}: {t["description"]}')
    print(f'// Function: {t["functionName"]}')
    print(f'// Schedule: {t["schedule"]}')
