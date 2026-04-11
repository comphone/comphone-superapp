# INSTALL_PHASE2_SYSTEMS.md

## ภาพรวม

เอกสารนี้อธิบายการติดตั้ง **COMPHONE SUPER APP V5.5 Phase 2** โดยต่อจาก Phase 1 ที่มีอยู่แล้วบนโครงสร้าง `Google Apps Script + Google Sheets` และใช้ `Utils.gs` เดิมเป็นฐานการเข้าถึงข้อมูลทั้งหมด ระบบที่เพิ่มเข้ามามี 3 ส่วนหลัก ได้แก่ **Billing & Payment System**, **Notification Enhancement**, และ **Dashboard Enhancement**

| ระบบ | ไฟล์หลัก | หน้าที่ |
|---|---|---|
| Billing & Payment System | `BillingManager.gs`, `JobStateMachine.gs`, `JobsHandler.gs`, `Router.gs` | สร้างบิล, สร้าง PromptPay QR, ตรวจสลิปผ่าน API adapter, อัปเดตสถานะการชำระ, ออกใบเสร็จ PDF |
| Notification Enhancement | `Notify.gs`, `Router.gs`, `JobStateMachine.gs` | แจ้งเตือนหลายช่องทางผ่าน LINE / Telegram สำหรับบิล, การชำระเงิน, และ alert สำคัญ |
| Dashboard Enhancement | `Dashboard.gs`, `Router.gs` | สรุปงาน 12 สถานะ, รายได้วันนี้/สัปดาห์/เดือน, สต๊อกต่ำ, งานค้างเกิน 3 วัน, ช่างงานมากสุด, ลูกค้าถึงรอบ PM |

## ไฟล์ที่สร้าง/แก้

### ไฟล์ที่สร้างใหม่

| ไฟล์ | ตำแหน่ง |
|---|---|
| `BillingManager.gs` | `Shop_vnext/src/BillingManager.gs` |
| `INSTALL_PHASE2_SYSTEMS.md` | root repo |

### ไฟล์ที่แก้ไข

| ไฟล์ | จุดที่เพิ่ม |
|---|---|
| `Notify.gs` | multi-channel notification, billing/payment notification, Telegram support |
| `Dashboard.gs` | summary/revenue/status-distribution/alerts APIs สำหรับ Phase 2 |
| `Router.gs` | routes ใหม่ของ billing, dashboard และ notification |
| `JobStateMachine.gs` | auto billing hook ตอนเข้าสถานะ `10` และ auto payment hook ตอนเข้าสถานะ `11` |
| `JobsHandler.gs` | wrapper `createBilling()` เพื่อส่งต่อไปยัง `BillingManager.gs` แบบ backward compatible |

## Spreadsheet ที่ใช้

| รายการ | ค่า |
|---|---|
| Google Sheets ID | `19fkLbSbBdz0EjAV8nE9LLwBiHeIN50BTPptt_PJCRGA` |
| ฐานข้อมูลหลัก | Google Apps Script + Google Sheets |
| Utility เดิมที่ใช้ต่อ | `Utils.gs` |

## ชีตที่ต้องมี

ระบบจะสร้าง `DB_BILLING` ให้อัตโนมัติถ้ายังไม่มี แต่ควรตรวจสอบชีตสำคัญทั้งหมดก่อน deploy

| Sheet | ใช้งานโดย | สถานะ |
|---|---|---|
| `DBJOBS` | Job State Machine / Dashboard / Billing context | ต้องมีอยู่แล้ว |
| `DB_BILLING` | Billing, payment, receipt, revenue report | ระบบช่วยสร้างได้ |
| `DB_INVENTORY` | คำนวณค่าอะไหล่และ low stock alert | ต้องมีอยู่แล้ว |
| `DB_CUSTOMERS` | PM due summary / customer contact | ต้องมีอยู่แล้ว |

## คอลัมน์สำคัญที่ระบบใหม่ใช้

### DB_BILLING

ระบบใหม่รองรับ dynamic header mapping แต่ถ้าต้องการให้ทำงานครบ ควรมีคอลัมน์หลักตามนี้

| Column | ความหมาย |
|---|---|
| `Billing_ID` | รหัสบิล |
| `Job_ID` | อ้างอิงงาน |
| `Customer_Name` | ชื่อลูกค้า |
| `Phone` | เบอร์ลูกค้า |
| `Parts_Description` | รายการอะไหล่ |
| `Parts_Cost` | ค่าอะไหล่ |
| `Labor_Cost` | ค่าแรง |
| `Subtotal` | ยอดก่อนส่วนลด |
| `Discount` | ส่วนลด |
| `Total_Amount` | ยอดรวม |
| `Amount_Paid` | ยอดที่ชำระแล้ว |
| `Balance_Due` | ยอดคงเหลือ |
| `Payment_Status` | `UNPAID` / `PARTIAL` / `PAID` |
| `PromptPay_Biller_ID` | เบอร์พร้อมเพย์หรือเลขบัญชีที่ใช้รับเงิน |
| `PromptPay_Payload` | payload มาตรฐาน EMVCo |
| `PromptPay_QR_URL` | URL สำหรับแสดง QR |
| `Slip_Image_URL` | URL รูปสลิป |
| `Slip_Payload` | raw payload จากบริการตรวจสลิป |
| `Transaction_Ref` | reference การชำระเงิน |
| `Receipt_No` | เลขที่ใบเสร็จ |
| `Receipt_File_ID` | file id บน Drive |
| `Receipt_URL` | URL ใบเสร็จ |
| `Invoice_Date` | วันที่ออกบิล |
| `Paid_At` | วันที่ชำระเงิน |
| `Created_At` / `Updated_At` | timestamp |
| `Notes` | หมายเหตุ |

### DB_INVENTORY

ระบบ dashboard จะพยายามหา field ที่เกี่ยวกับจุดสั่งซื้อซ้ำอัตโนมัติ เช่น `Reorder_Point`, `reorder_point`, `Minimum_Stock` หรือชื่อใกล้เคียง ถ้าต้องการผลลัพธ์แม่นที่สุดควรมีคอลัมน์ reorder point ชัดเจน

### DB_CUSTOMERS

ระบบ dashboard และ notification ใช้ field ด้าน PM และช่องทางติดต่อจากฐานลูกค้าเดิม เช่น `Customer_ID`, `Customer_Name`, `Phone`, `LINE_User_ID`, `Last_Service_Date`, `Next_PM_Date`

## Script Properties / Config ที่ต้องตรวจ

Phase 2 ใช้ config เพิ่มเติมจากระบบเดิม ดังนี้

| Config Key | จำเป็น | ใช้ทำอะไร |
|---|---|---|
| `PROMPTPAY_BILLER_ID` | แนะนำ | ใช้สร้าง PromptPay QR อัตโนมัติ |
| `PROMPTPAY_ID` | สำรอง | ใช้แทน `PROMPTPAY_BILLER_ID` ถ้ามีระบบเดิมเก็บชื่อ key นี้ |
| `SLIP_VERIFY_API_URL` | ถ้ามีตรวจสลิปจริง | endpoint ของบริการตรวจสลิป |
| `SLIP_VERIFY_API_KEY` | ถ้ามีตรวจสลิปจริง | API key สำหรับบริการตรวจสลิป |
| `BILLING_RECEIPT_FOLDER_ID` | แนะนำ | โฟลเดอร์ปลายทางบน Drive สำหรับเก็บใบเสร็จ PDF |
| `LINE_CHANNEL_ACCESS_TOKEN` | ถ้าใช้ LINE push | token สำหรับส่ง LINE notification |
| `TELEGRAM_BOT_TOKEN` | ถ้าใช้ Telegram | bot token สำหรับส่ง Telegram notification |
| `TELEGRAM_CHAT_CUSTOMER` | ไม่บังคับ | chat id ฝั่งลูกค้า |
| `TELEGRAM_CHAT_TECHNICIAN` | ไม่บังคับ | chat id กลุ่มช่าง |
| `TELEGRAM_CHAT_ADMIN` | ไม่บังคับ | chat id ฝั่งแอดมิน |

> ถ้าไม่ได้ตั้ง `SLIP_VERIFY_API_URL` และ `SLIP_VERIFY_API_KEY` ระบบตรวจสลิปจะทำงานได้เฉพาะในโหมด adapter placeholder และควรใช้ `markBillingPaid()` จาก backend ที่เชื่อถือได้แทน

## ขั้นตอนติดตั้ง

### 1) วางไฟล์เข้า Apps Script project

คัดลอกไฟล์จาก `Shop_vnext/src/` เข้าโปรเจกต์ Apps Script ของระบบจริง โดยต้องมีไฟล์ต่อไปนี้อย่างน้อย

| กลุ่ม | ไฟล์ |
|---|---|
| Billing | `BillingManager.gs`, `JobStateMachine.gs`, `JobsHandler.gs`, `Router.gs` |
| Notification | `Notify.gs`, `Router.gs` |
| Dashboard | `Dashboard.gs`, `Router.gs` |
| Core dependencies | `Utils.gs` และไฟล์เดิมทั้งหมดของระบบ |

### 2) ตั้ง Script Properties

เพิ่มหรือยืนยันค่า config ตามตารางด้านบน โดยเฉพาะ `PROMPTPAY_BILLER_ID`, `BILLING_RECEIPT_FOLDER_ID`, และ token ของช่องทางแจ้งเตือนที่ใช้งานจริง

### 3) ตรวจสิทธิ์ Apps Script

ฟีเจอร์ใหม่ใช้บริการต่อไปนี้

| Service | ใช้ทำอะไร |
|---|---|
| Google Sheets | อ่าน/เขียน `DBJOBS`, `DB_BILLING`, `DB_INVENTORY`, `DB_CUSTOMERS` |
| Google Drive | บันทึกใบเสร็จ PDF |
| UrlFetchApp | เรียก QR API, slip verify API, LINE, Telegram |
| HtmlService / ContentService | dashboard และ web response |

เมื่อ deploy ครั้งแรก ให้ authorize scopes ให้ครบ

### 4) Deploy เป็น Web App

ตั้งค่า deploy ตามรูปแบบเดิมของระบบ และอัปเดต URL ปลายทางใน frontend / bot / automation ที่เรียก action ใหม่

| Setting | ค่าแนะนำ |
|---|---|
| Execute as | Me |
| Who has access | ตาม deployment เดิมของระบบ |

## Route / Action ที่เพิ่ม

### Billing & Payment

| Action | ตัวอย่าง |
|---|---|
| `createBilling` | `?action=createBilling&jobId=JOB-0001&parts=SSD:1,RAM:2&labor=500` |
| `getBilling` | `?action=getBilling&job_id=JOB-0001` |
| `generatePromptPayQR` | `?action=generatePromptPayQR&job_id=JOB-0001&amount=1500` |
| `verifyPaymentSlip` | `?action=verifyPaymentSlip&job_id=JOB-0001&slip_image_url=https://...` |
| `markBillingPaid` | `?action=markBillingPaid&job_id=JOB-0001&amount_paid=1500&transaction_ref=TX123` |
| `generateReceiptPDF` | `?action=generateReceiptPDF&job_id=JOB-0001` |

### Dashboard

| Action | ตัวอย่าง |
|---|---|
| `getDashboardSummary` | `?action=getDashboardSummary` |
| `getRevenueReport` | `?action=getRevenueReport&period=today` |
| `getJobStatusDistribution` | `?action=getJobStatusDistribution` |
| `getAlerts` | `?action=getAlerts` |

### Notification

| Action | ตัวอย่าง |
|---|---|
| `notifyBillingReady` | `?action=notifyBillingReady&job_id=JOB-0001` |
| `notifyPaymentReceived` | `?action=notifyPaymentReceived&job_id=JOB-0001` |
| `sendCriticalDashboardAlerts` | `?action=sendCriticalDashboardAlerts` |

## Flow สำคัญของระบบใหม่

### 1) Job State -> Billing

| เหตุการณ์ | ผลลัพธ์ |
|---|---|
| งานถูกเปลี่ยนเป็นสถานะ `10` | ระบบสร้าง billing record อัตโนมัติ |
| มี `PROMPTPAY_BILLER_ID` | ระบบสร้าง PromptPay payload + QR URL อัตโนมัติ |
| เปิด route `notifyBillingReady` หรือ automation เดิมเรียก notify | ระบบส่ง QR และยอดค้างชำระให้ลูกค้า/แอดมิน |

### 2) Payment -> Receipt

| เหตุการณ์ | ผลลัพธ์ |
|---|---|
| backend เรียก `verifyPaymentSlip` | ระบบเรียก API adapter เพื่อตรวจสลิป |
| งานถูกเปลี่ยนเป็นสถานะ `11` หรือเรียก `markBillingPaid` | ระบบอัปเดตยอดชำระและสถานะจ่ายเงิน |
| ชำระครบ | ระบบสร้างใบเสร็จ PDF และพร้อมส่ง notification ยืนยัน |

### 3) Dashboard & Alerts

| เหตุการณ์ | ผลลัพธ์ |
|---|---|
| เรียก `getDashboardSummary` | ได้ภาพรวมงาน รายได้ สต๊อก งานค้าง ช่าง top load และ PM due |
| เรียก `getRevenueReport` | ได้รายได้ตามช่วง `today`, `week`, `month` |
| เรียก `getAlerts` | ได้รายการแจ้งเตือน low stock, overdue jobs, PM due |

## แนวทางทดสอบหลังติดตั้ง

### Test 1: Billing + PromptPay

1. เปลี่ยนงานตัวอย่างไปสถานะ `10`
2. ตรวจว่า `DB_BILLING` ถูกสร้าง record อัตโนมัติ
3. ตรวจว่ามี `PromptPay_Payload` และ `PromptPay_QR_URL`
4. เรียก `getBilling` ของ job เดิมเพื่อตรวจยอดและ QR

### Test 2: Payment + Receipt

1. เรียก `markBillingPaid` ด้วยยอดเต็ม
2. ตรวจว่า `Payment_Status` กลายเป็น `PAID`
3. ตรวจว่า `Receipt_No`, `Receipt_URL`, `Paid_At` ถูกอัปเดต
4. ถ้าใช้ Drive จริง ให้เปิดไฟล์ใบเสร็จจาก URL ที่ได้

### Test 3: Dashboard

1. เรียก `getDashboardSummary`
2. เรียก `getRevenueReport&period=today`
3. เรียก `getJobStatusDistribution`
4. เรียก `getAlerts`
5. ตรวจความถูกต้องเทียบกับข้อมูลจริงใน `DBJOBS`, `DB_BILLING`, `DB_INVENTORY`, `DB_CUSTOMERS`

### Test 4: Notifications

1. ตั้ง LINE token หรือ Telegram bot token
2. เรียก `notifyBillingReady`
3. เรียก `notifyPaymentReceived`
4. ตรวจว่าข้อความถูกส่งไป channel ที่ตั้งไว้

## ข้อควรระวัง

| ประเด็น | รายละเอียด |
|---|---|
| Function collision | ใน Phase 2 ได้ย้าย `doGet()` และ `include()` เดิมของ `Dashboard.gs` เป็นชื่อ internal แบบ legacy เพื่อไม่ชนกับ `Router.gs` |
| Slip verification | ถ้าไม่มี API จริง ระบบจะไม่สามารถยืนยันสลิปแบบ production ได้ ต้องผูกกับ provider จริงก่อนใช้งานรับเงินอัตโนมัติ |
| Dynamic Header | ระบบ map header แบบยืดหยุ่น แต่ชื่อคอลัมน์หลักควรใกล้เคียงตามเอกสารนี้ |
| Receipt storage | ถ้าไม่ตั้ง `BILLING_RECEIPT_FOLDER_ID` ระบบอาจ fallback ไปเก็บไฟล์ตามค่าเริ่มต้นของ implementation เดิม |
| Telegram rooms | ระบบจะอ่าน chat id ตาม key `TELEGRAM_CHAT_*` จึงควรตั้งชื่อให้สอดคล้องกับ room ที่ใช้งานจริง |

## แนะนำหลังติดตั้ง

1. ผูก provider ตรวจสลิปจริงกับ `SLIP_VERIFY_API_URL`
2. ตั้ง time-based trigger สำหรับ `sendCriticalDashboardAlerts`
3. เพิ่ม admin menu หรือ internal UI สำหรับดู `DB_BILLING` และสถานะ receipt
4. ทดสอบกับข้อมูลจริงในสำเนา sheet ก่อนขึ้น production
5. ถ้าต้องการ production-ready เพิ่มขึ้น ควรแยก audit log ของ payment events ออกอีก 1 sheet

## สรุป

Phase 2 ชุดนี้ถูกออกแบบให้ **ต่อกับโค้ดเดิมและ Phase 1 โดยไม่รื้อ architecture เดิม** ใช้ `Utils.gs` และ dynamic header mapping เป็นหลัก พร้อมเพิ่ม billing automation, payment flow, dashboard analytics และ multi-channel notification ให้ใช้งานต่อบน Apps Script project เดิมได้ทันที
