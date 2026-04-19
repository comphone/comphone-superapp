# 🚀 คู่มือการตั้งค่า Triggers อัตโนมัติ (COMPHONE SUPER APP V5.5)

ในระบบ COMPHONE SUPER APP V5.5 มีฟังก์ชันที่ต้องทำงานตามเวลา (Time-Driven Triggers) ทั้งหมด 8 ตัว เช่น การสำรองข้อมูลรายวัน, การแจ้งเตือนภาษีรายเดือน, และการตรวจสอบสุขภาพระบบทุก 30 นาที

เพื่อความสะดวก คุณสามารถตั้งค่า Triggers ทั้งหมดได้อัตโนมัติผ่าน 2 วิธีดังนี้:

---

## วิธีที่ 1: รันผ่าน Google Apps Script Editor (แนะนำและง่ายที่สุด)

วิธีนี้ไม่ต้องติดตั้งโปรแกรมเพิ่มเติมใดๆ และปลอดภัยที่สุด

1. เปิดโปรเจกต์ Google Apps Script ของคุณ
2. ในแถบเมนูด้านซ้าย เลือกไฟล์ `AutoBackup.gs`
3. ที่แถบเครื่องมือด้านบน (ข้างปุ่ม Debug) ให้คลิกที่ Dropdown รายชื่อฟังก์ชัน
4. เลือกฟังก์ชัน **`setupAllTriggers`**
5. คลิกปุ่ม **Run (เรียกใช้)**
6. หากระบบขอสิทธิ์การเข้าถึง (Authorization) ให้กดยอมรับ
7. รอจนกว่า Execution log จะแสดงข้อความว่า `setupAllTriggers: 8 processed, 0 skipped`

**หมายเหตุ:** ฟังก์ชันนี้มีระบบป้องกันการสร้างซ้ำ (Duplicate Prevention) คุณสามารถกดรันกี่ครั้งก็ได้โดยไม่ทำให้เกิด Trigger ซ้ำซ้อน

---

## วิธีที่ 2: รันผ่าน Command Line (CLI) ด้วย Clasp

สำหรับนักพัฒนาที่ต้องการรันผ่าน Terminal หรือ CI/CD Pipeline

### สิ่งที่ต้องเตรียม
1. ติดตั้ง Node.js และ Clasp: `npm install -g @google/clasp`
2. เปิดใช้งาน Google Apps Script API ที่: [https://script.google.com/home/usersettings](https://script.google.com/home/usersettings)
3. Login เข้าสู่ระบบ: `clasp login`

### การใช้งาน
รันสคริปต์ที่เตรียมไว้ให้ในโฟลเดอร์ `scripts`:

```bash
cd scripts
./setup_triggers.sh
```

สคริปต์จะทำการเรียกใช้ `clasp run setupAllTriggers` ให้โดยอัตโนมัติ

---

## รายการ Triggers ที่จะถูกสร้าง

| ฟังก์ชัน | ความถี่ | หน้าที่ |
|---|---|---|
| `autoBackup` | ทุกวัน 00:00-01:00 | สำรองข้อมูล Google Sheets ลง Drive |
| `checkLowStockAlert` | ทุก 6 ชั่วโมง | ตรวจสอบและแจ้งเตือนสต็อกเหลือน้อย |
| `geminiReorderSuggestion` | ทุกวัน 09:00-10:00 | ให้ AI แนะนำการสั่งซื้ออะไหล่ |
| `getCRMSchedule` | ทุกวันจันทร์ 08:00-09:00 | สรุปตารางติดตามลูกค้า (CRM) |
| `cronMorningAlert` | ทุกวัน 06:00-07:00 | สรุปงานประจำวันตอนเช้า |
| `sendAfterSalesAlerts` | ทุกวัน 08:00-09:00 | แจ้งเตือนการรับประกันใกล้หมดอายุ |
| `autoSyncToDrive` | ทุกวัน 02:00-03:00 | ซิงค์ไฟล์โค้ดลง Google Drive |
| `cronTaxReminder` | วันที่ 1 ของเดือน 08:00-09:00 | แจ้งเตือนการยื่นภาษี (ภงด.) |
| `cronHealthCheck` | ทุก 30 นาที | ตรวจสอบสถานะระบบและ API |

---

## การตรวจสอบ Triggers
คุณสามารถตรวจสอบ Triggers ที่ทำงานอยู่ทั้งหมดได้โดย:
1. เปิด Google Apps Script Editor
2. คลิกที่ไอคอน **นาฬิกา (Triggers)** ที่เมนูด้านซ้าย
3. คุณจะเห็นรายการ Triggers ทั้งหมดที่ถูกสร้างขึ้นพร้อมเวลาที่กำหนดรันครั้งถัดไป
