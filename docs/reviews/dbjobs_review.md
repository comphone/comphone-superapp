# รายงานการตรวจสอบโครงสร้างฐานข้อมูล DB_JOBS (COMPHONE SUPER APP V5.5)

จากการตรวจสอบโครงสร้างฐานข้อมูลใน Google Sheets เปรียบเทียบกับเอกสารข้อกำหนดระบบ (System Specification) สำหรับโครงการ **COMPHONE SUPER APP V5.5** สรุปผลการวิเคราะห์และข้อเสนอแนะได้ดังนี้:

## 1. การวิเคราะห์โครงสร้างปัจจุบัน (Current State)

โครงสร้างฐานข้อมูลปัจจุบันมี Sheet หลักที่ครอบคลุมการทำงานพื้นฐานแล้ว แต่ยังมีบางส่วนที่ต้องปรับปรุงเพื่อให้รองรับฟีเจอร์ใหม่ใน V5.5 ได้อย่างสมบูรณ์

| ชื่อ Sheet | หน้าที่หลัก | สถานะ |
| :--- | :--- | :--- |
| **DBJOBS** | เก็บข้อมูลใบงานหลัก | ครบถ้วนพื้นฐาน แต่ขาดฟิลด์สำหรับระบบ 12 สถานะ และ Voice Log |
| **DB_PHOTO_QUEUE** | คิวรูปภาพสำหรับ AI วิเคราะห์ | **ดีมาก** มีฟิลด์รองรับ AI Analysis และ Phase (Before/After) แล้ว |
| **DB_CUSTOMERS** | ข้อมูลลูกค้า | ครบถ้วน มีพิกัดและ LINE User ID |
| **DB_TECHNICIANS** | ข้อมูลช่าง | ครบถ้วน มีอัตราค่าแรงและ LINE User ID |
| **DB_INVENTORY** | สต๊อกสินค้าหลัก | ครบถ้วน มีจุดสั่งซื้อ (Reorder Point) |
| **DB_STOCK_MOVEMENTS**| ประวัติการเคลื่อนไหวสต๊อก | ครบถ้วน |
| **DB_BILLING** | ข้อมูลการเงิน/บิล | ครบถ้วนพื้นฐาน แต่ขาดฟิลด์สำหรับ Slip Verification |

---

## 2. ข้อเสนอแนะการปรับปรุงเพื่อรองรับ V5.5

เพื่อให้รองรับฟีเจอร์ใหม่ตาม Spec V5.5 จำเป็นต้องมีการเพิ่มคอลัมน์และ Sheet ใหม่ ดังนี้:

### 🛠️ กลุ่มฟีเจอร์หน้างาน (Field Operations)

1.  **DBJOBS (ปรับปรุง):**
    *   เพิ่มคอลัมน์ `Current_Status_Code` (1-12) เพื่อรองรับ **Job State Machine**
    *   เพิ่มคอลัมน์ `Voice_Summary_Log` เพื่อเก็บข้อมูลสรุปจาก **Voice-to-Workflow**
    *   เพิ่มคอลัมน์ `Tool_Checklist_Status` (Boolean) สำหรับตรวจสอบการคืนเครื่องมือตอนปิดงาน
2.  **DB_JOB_LOGS (สร้างใหม่):**
    *   เพื่อเก็บประวัติการเปลี่ยนสถานะ (Timestamp, Status, Location) อย่างละเอียดในแต่ละขั้นตอนของ Job State Machine

### 📦 กลุ่มฟีเจอร์สต๊อกและเครื่องมือ (Inventory & Asset Management)

1.  **DB_INVENTORY (ปรับปรุง):**
    *   เพิ่มคอลัมน์ `Location_Type` (Main / Van / Personal) เพื่อรองรับ **3-Layer Inventory**
    *   เพิ่มคอลัมน์ `Assigned_To` (ID รถ หรือ ID ช่าง) หากเป็นสต๊อกบนรถหรือเครื่องมือส่วนตัว
2.  **DB_TOOL_AUDITS (สร้างใหม่):**
    *   คอลัมน์: `AuditID`, `TechID`, `AuditDate`, `Status` (Complete/Incomplete), `PhotoURL`, `Notes`
    *   เพื่อรองรับระบบ **Weekly Tool Audit**

### 💰 กลุ่มฟีเจอร์การเงินและการขาย (Finance & Sales)

1.  **DB_BILLING (ปรับปรุง):**
    *   เพิ่มคอลัมน์ `PromptPay_Payload` สำหรับเก็บสตริงที่ใช้สร้าง QR Code
    *   เพิ่มคอลัมน์ `Slip_Verify_Status` (Success/Failed/Pending)
    *   เพิ่มคอลัมน์ `Slip_Image_ID` และ `Receipt_PDF_URL` เพื่อรองรับ **Auto-Receipt**

---

## 3. สรุปรายการที่ต้องดำเนินการ (Action Plan)

| ลำดับ | การดำเนินการ | รายละเอียด |
| :--- | :--- | :--- |
| 1 | **Update DBJOBS** | เพิ่มฟิลด์สถานะ 1-12, Voice Log และ Tool Check |
| 2 | **Update DB_BILLING** | เพิ่มฟิลด์สำหรับการตรวจสอบสลิปและออกใบเสร็จอัตโนมัติ |
| 3 | **Update DB_INVENTORY** | เพิ่มการระบุตำแหน่งของ (Location) เพื่อแยกคลังหลัก/รถช่าง |
| 4 | **Create DB_TOOL_AUDITS** | สร้าง Sheet ใหม่เพื่อเก็บประวัติการตรวจเช็คเครื่องมือรายสัปดาห์ |
| 5 | **Create DB_JOB_LOGS** | สร้าง Sheet ใหม่เพื่อเก็บประวัติ Timeline ของแต่ละใบงาน |

**หมายเหตุ:** โครงสร้าง `DB_PHOTO_QUEUE` ออกแบบมาได้ดีมากและพร้อมใช้งานสำหรับ Vision Agent ใน V5.5 ได้ทันทีโดยไม่ต้องแก้ไขเพิ่มเติม
