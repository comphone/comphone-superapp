# คู่มือตั้งค่า LINE Webhook — COMPHONE SUPER APP V5.5

> ใช้เวลา ~15 นาที | ทำครั้งเดียว | ไม่ต้องแก้โค้ด

---

## ภาพรวม Architecture

```
LINE App (ลูกค้า/ช่าง)
    ↓  ส่ง message
LINE Platform
    ↓  POST events JSON
Cloudflare Worker (Proxy)
    https://comphone-line-webhook.narinoutagit.workers.dev/line/webhook
    ↓  forward ไปยัง GAS
GAS Web App (Router.gs)
    ↓  ตรวจพบ destination + events[]
handleLineWebhook() → processLineEventV55_()
    ↓
LineBot.gs → FlexMessage.gs → Notify.gs
```

---

## ขั้นตอนที่ 1 — ตั้งค่าใน LINE Developers Console

1. เข้า https://developers.line.biz/console/
2. เลือก **Provider** → เลือก **Channel** (Messaging API)
3. ไปที่แท็บ **Messaging API**
4. หัวข้อ **Webhook settings**:
   - **Webhook URL:** `https://comphone-line-webhook.narinoutagit.workers.dev/line/webhook`
   - กด **Update**
   - เปิด **Use webhook** → Toggle เป็น **ON**
5. กด **Verify** — ต้องได้ผล `200 OK`

---

## ขั้นตอนที่ 2 — ตรวจสอบ Channel Access Token

1. แท็บ **Messaging API** → หัวข้อ **Channel access token**
2. ถ้ายังไม่มี token → กด **Issue**
3. คัดลอก token ทั้งหมด
4. เข้า GAS Script Editor → **Project Settings** → **Script Properties**
5. ตรวจสอบว่า `LINE_CHANNEL_ACCESS_TOKEN` มีค่าตรงกัน

---

## ขั้นตอนที่ 3 — ทดสอบ Bot รับ Group ID

เพิ่ม LINE Bot เข้ากลุ่ม LINE ของทีมงาน (เช่น กลุ่มช่าง):

1. เปิดกลุ่ม LINE → กด **+** → **เพิ่มเพื่อน** → ค้นหา Bot ด้วย `@username`
2. Bot จะส่งข้อความต้อนรับอัตโนมัติ (จาก `saveLineGroupId_()`)
3. ระบบบันทึก Group ID ลง Script Properties อัตโนมัติ

**กลุ่มที่ต้องเพิ่ม Bot:**

| กลุ่ม | Script Property | หน้าที่ |
|-------|----------------|---------|
| กลุ่มช่าง | `LINE_GROUP_TECHNICIAN` | แจ้งงานใหม่, มอบหมายงาน |
| กลุ่มบัญชี | `LINE_GROUP_ACCOUNTING` | แจ้งบิล, ยืนยันชำระเงิน |
| กลุ่มจัดซื้อ | `LINE_GROUP_PROCUREMENT` | แจ้งสั่งซื้ออะไหล่ |
| กลุ่มขาย | `LINE_GROUP_SALES` | สรุปยอดขาย |
| กลุ่มผู้บริหาร | `LINE_GROUP_EXECUTIVE` | รายงานเช้า, ภาพรวม |

---

## ขั้นตอนที่ 4 — ทดสอบส่งข้อความ

พิมพ์ในกลุ่มช่าง:
```
สรุป
```
Bot ควรตอบด้วย Flex Message แสดงสรุปงานวันนี้

พิมพ์:
```
เช็คงาน
```
Bot ควรแสดงรายการงานที่กำลังดำเนินการ

---

## ขั้นตอนที่ 5 — ตรวจสอบ Script Properties หลังเพิ่มกลุ่ม

เข้า GAS Script Editor → Project Settings → Script Properties ตรวจสอบว่ามีค่าครบ:

```
LINE_GROUP_TECHNICIAN  = C.xxxxxxxxxx
LINE_GROUP_ACCOUNTING  = C.xxxxxxxxxx
LINE_GROUP_PROCUREMENT = C.xxxxxxxxxx
LINE_GROUP_SALES       = C.xxxxxxxxxx
LINE_GROUP_EXECUTIVE   = C.xxxxxxxxxx
```

---

## คำสั่ง LINE Bot ที่รองรับ

| คำสั่ง | ผลลัพธ์ |
|--------|---------|
| `สรุป` | Flex Message สรุปงานวันนี้ |
| `เช็คงาน` | รายการงานที่กำลังดำเนินการ |
| `เช็คสต็อก` | รายการสินค้าที่ต่ำกว่า min_qty |
| `เปิดงาน [ชื่อลูกค้า]` | เปิดงานใหม่จาก LINE |
| `เดินทาง [job_id]` | อัปเดตสถานะงานเป็น "กำลังเดินทาง" |
| `ถึงหน้างาน [job_id]` | อัปเดตสถานะเป็น "ทำงานหน้างาน" |
| `งานเสร็จ [job_id]` | อัปเดตสถานะเป็น "เสร็จสิ้น รอตรวจ" |

---

## การแก้ปัญหาเบื้องต้น

| ปัญหา | วิธีแก้ |
|-------|---------|
| Verify ไม่ผ่าน | ตรวจสอบว่า GAS Web App deploy เป็น "Anyone" |
| Bot ไม่ตอบ | ตรวจสอบ `LINE_CHANNEL_ACCESS_TOKEN` ใน Script Properties |
| Group ID ไม่บันทึก | ตรวจสอบว่า Bot มีสิทธิ์เขียน Script Properties |
| ข้อความซ้ำ | ตรวจสอบว่าไม่มี Webhook URL ซ้ำกัน 2 ที่ |
