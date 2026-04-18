# ✅ LINE Webhook Setup Checklist — COMPHONE SUPER APP V5.5

## ขั้นตอนที่ต้องทำ (ทำตามลำดับ)

### Step 1: ตั้งค่า Webhook URL ใน LINE Developers Console

1. เปิด https://developers.line.biz/console/
2. เลือก Provider → Channel (Messaging API)
3. ไปที่ **Messaging API** tab
4. ใส่ Webhook URL:
   ```
   https://comphone-line-webhook.narinoutagit.workers.dev/line/webhook
   ```
5. เปิด **Use webhook** = ON
6. กด **Verify** → ต้องได้ `200 OK`

### Step 2: ทดสอบส่งข้อความ

พิมพ์ใน LINE OA:
- `เช็คงาน` → ควรได้รายการงาน
- `เช็คสต็อก RAM` → ควรได้ข้อมูลสต็อก
- `สรุป` → ควรได้ Dashboard summary

### Step 3: ตรวจสอบ Script Properties

ใน GAS Editor → Project Settings → Script Properties ต้องมี:
- `LINE_CHANNEL_ACCESS_TOKEN` ✅
- `LINE_GROUP_TECHNICIAN` = `C8ad22a115f38c9ad3cb5ea5c2ff4863b` ✅
- `LINE_GROUP_ACCOUNTING` = `C7b939d1d367e6b854690e58b392e88cc` ✅

### Step 4: ทดสอบ Push Notification

รัน `sendAfterSalesAlerts()` ใน GAS Editor → ตรวจสอบว่า LINE Group ได้รับข้อความ

---

## Cloudflare Worker Status

| รายการ | ค่า |
|--------|-----|
| Worker URL | `https://comphone-line-webhook.narinoutagit.workers.dev/line/webhook` |
| Account ID | `838d6a5a046bfaa2a2003bd8005dd80b` |
| Version | `e9cce19a-8343-449a-b258-05d42ad28de3` |
| Status | ✅ Active |

---

## คำสั่ง LINE ที่รองรับ

| คำสั่ง | ผลลัพธ์ |
|--------|---------|
| `เช็คงาน` / `งาน` | รายการงานทั้งหมด |
| `เช็คสต็อก [ชื่อ]` | ค้นหาสต็อก |
| `สรุป` / `summary` | Dashboard KPI |
| `เปิดงาน [รายละเอียด]` | สร้างงานใหม่ |
| `ปิดงาน [Job ID]` | ปิดงาน |
| `อัพเดท [Job ID] [สถานะ]` | อัปเดตสถานะ |
| ส่งรูป + caption `[Job ID]` | อัปโหลดรูปหน้างาน |
| ส่ง Location | บันทึก GPS ช่าง |
