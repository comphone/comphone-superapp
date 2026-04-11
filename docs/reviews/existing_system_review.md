# รายงานสรุปการตรวจสอบระบบเดิม COMPHONE SUPER APP (V5.0 -> V5.5)

จากการตรวจสอบระบบเดิมผ่าน GitHub Repository และ Google Sheets ฐานข้อมูล เพื่อเปรียบเทียบกับเอกสารข้อกำหนด V5.5 สรุปผลการวิเคราะห์ได้ดังนี้:

## 1. การตรวจสอบ GitHub Repository
ระบบเดิมมีการพัฒนาแยกเป็น 2 ส่วนหลักคือ `src/` (V5.0) และ `Shop_vnext/` (V5.1+) โดยมีโครงสร้างไฟล์และหน้าที่ดังนี้:

| ชื่อไฟล์ | หน้าที่หลักในระบบเดิม | สถานะความพร้อมสำหรับ V5.5 |
| :--- | :--- | :--- |
| `Router.gs` | จัดการ Webhook จาก LINE/Telegram และ API สำหรับ Web App | **พร้อมใช้:** รองรับ Dual Engine อยู่แล้ว |
| `JobsHandler.gs` | จัดการวงจรชีวิตใบงาน (Open, Update, Complete) และสร้าง Folder Drive | **ต้องปรับปรุง:** เพื่อรองรับ 12 สถานะ (Job State Machine) |
| `Inventory.gs` | ระบบสต๊อกแบบ Movement-based (เบิก/คืน/ตัดสต๊อกอัตโนมัติ) | **พร้อมใช้:** รองรับ Serial Number และการคืนของแล้ว |
| `PhotoQueue.gs` | ระบบคิวรูปภาพ จัดเก็บลง Drive และคัดแยกอัตโนมัติ | **พร้อมใช้:** เป็นหัวใจของ Vision Agent ใน V5.5 |
| `VisionAnalysis.gs`| เชื่อมต่อ Gemini AI เพื่อวิเคราะห์รูปภาพหน้างาน QC | **พร้อมใช้:** มี Prompt สำหรับตรวจความเรียบร้อยแล้ว |
| `GpsPipeline.gs` | คำนวณระยะทางและระบุพิกัดช่าง | **พร้อมใช้:** ใช้สำหรับ Geofencing Alert |
| `Utils.gs` | ฟังก์ชันสร้าง PDF (ใบเสร็จ/ใบรับประกัน) และ Helper ต่างๆ | **พร้อมใช้:** รองรับการสร้างเอกสารอัตโนมัติ |

---

## 2. การตรวจสอบ Google Sheets (ฐานข้อมูล)
จากการใช้ `gws CLI` ตรวจสอบ Spreadsheet ID: `19fkLbSbBdz0EjAV8nE9LLwBiHeIN50BTPptt_PJCRGA` พบ Sheet และคอลัมน์สำคัญดังนี้:

### 📊 รายการ Sheet และโครงสร้างคอลัมน์
*   **DBJOBS (ใบงานหลัก):**
    *   `JobID`, `ชื่อลูกค้า`, `อาการ`, `สถานะ`, `ช่างที่รับงาน`, `พิกัด GPS`, `รูปถ่าย`, `ลิงก์รูปภาพ`, `ลิงก์โฟเดอร์งาน`, `เวลาสร้าง`, `เวลาอัปเดต`, `หมายเหตุ`, `folder_url`, `Ref_ID`, `AI_Vision_Analysis`
    *   *ข้อสังเกต:* มีฟิลด์รองรับ AI Vision แล้ว แต่ยังขาด `Current_Status_Code` (1-12) และ `Voice_Summary_Log`
*   **DB_INVENTORY (สต๊อก):**
    *   `รหัสสินค้า`, `SKU`, `ชื่อสินค้า`, `หมวดหมู่`, `หน่วย`, `จำนวนคงเหลือ`, `จุดสั่งซื้อ (ขั้นต่ำ)`, `ต้นทุนเฉลี่ย`, `ราคาขาย`, `ใช้ซีเรียล`, `สถานะ`, `หมายเหตุ`, `วันที่อัปเดต`
    *   *ข้อสังเกต:* ยังขาดการระบุ `Location_Type` (Main/Van/Personal) เพื่อรองรับสต๊อก 3 ชั้น
*   **DB_PHOTO_QUEUE (คิวรูปภาพ):**
    *   `QueueID`, `FileID`, `FileName`, `FileURL`, `ThumbnailURL`, `JobID`, `TechName`, `Status`, `Timestamp`, `AILabel`, `AIPhase`, `AIIssues`, `JobPhotoURL`, `ProcessedTimestamp`
    *   *ข้อสังเกต:* โครงสร้างสมบูรณ์มาก พร้อมใช้งานสำหรับ Vision Agent

---

## 3. สรุปการเปรียบเทียบเทียบกับ Spec V5.5

### ✅ โค้ด/ฟีเจอร์ที่มีอยู่แล้วและใช้ต่อได้เลย
1.  **Vision Field Agent:** ระบบคิวรูปภาพและการเชื่อมต่อ Gemini AI วิเคราะห์งาน QC (จาก `PhotoQueue.gs` และ `VisionAnalysis.gs`)
2.  **Inventory Core:** ระบบตัดสต๊อกตามรายการอะไหล่และ Serial Number (จาก `Inventory.gs`)
3.  **Auto-PDF Generation:** ระบบสร้างใบรับประกันและใบเสร็จอัตโนมัติหลังปิดงาน (จาก `Utils.gs`)
4.  **Drive Auto-Sorting:** ระบบสร้างโฟลเดอร์ลูกค้าและแยกรูป Before/After ลง Drive อัตโนมัติ

### 🛠️ โค้ด/ฟีเจอร์ที่ต้องปรับปรุง
1.  **Job State Machine:** ต้องปรับปรุง `JobsHandler.gs` ให้รองรับการเปลี่ยนสถานะ 1-12 ผ่าน QR Code และบันทึก Log ละเอียดลง `DB_JOB_LOGS`
2.  **3-Layer Inventory:** ต้องเพิ่ม Logic การโอนย้ายสินค้าระหว่างคลังหลัก ไปยังรถช่าง (Van Stock)
3.  **Geofencing:** ต้องนำพิกัดจาก `GpsPipeline.gs` มาตรวจสอบร่วมกับที่อยู่ลูกค้าใน `DB_CUSTOMERS` เพื่อยืนยันการเข้าหน้างานจริง

### 🆕 ส่วนที่ต้องเขียนใหม่ทั้งหมด
1.  **Voice-to-Workflow:** ระบบรับข้อความเสียงจาก LINE แล้วใช้ Whisper API สรุปงาน
2.  **PromptPay & Slip Verification:** ระบบสร้าง QR Code รับเงินอัตโนมัติและตรวจสอบสลิปผ่าน API
3.  **Weekly Tool Audit:** ระบบแจ้งเตือนช่างให้เช็คเครื่องมือทุกเย็นวันอาทิตย์พร้อมหน้าจอ LIFF Checklist

---

## 4. ลำดับการพัฒนาที่แนะนำ (Recommended Roadmap)

1.  **เตรียมฐานข้อมูล:** เพิ่มคอลัมน์ใน `DBJOBS`, `DB_INVENTORY` และสร้าง Sheet `DB_JOB_LOGS`, `DB_TOOL_AUDITS`
2.  **อัปเกรด Field Ops:** พัฒนา Job State Machine (1-12) และระบบสั่งงานด้วยเสียง (Voice-to-Workflow)
3.  **ระบบการเงินอัตโนมัติ:** พัฒนา PromptPay QR และ Slip Verification เพื่อเร่งการปิดยอดเงิน
4.  **ระบบสต๊อกอัจฉริยะ:** พัฒนา 3-Layer Inventory และระบบแจ้งเตือนของขาดบนรถช่างล่วงหน้า (Predictive Stocking)
5.  **ระบบ CRM & Marketing:** พัฒนา AI Marketing Content เพื่อโพสต์รูปผลงานลง Facebook อัตโนมัติ
