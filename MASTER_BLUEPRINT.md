# COMPHONE SUPER APP V5.5 — Master Blueprint

เอกสารนี้เป็นพิมพ์เขียวหลักของระบบ COMPHONE SUPER APP V5.5 ซึ่งเป็นระบบบริหารจัดการร้านซ่อมมือถือและอุปกรณ์ไอทีแบบครบวงจร

## 1. โครงสร้างระบบ (System Architecture)

### 1.1. กฎเหล็ก (The Golden Rules)
- **RULE 0: Triple Sync** — ทุกครั้งที่แก้โค้ด ต้อง Sync 3 ที่: GitHub, Google Drive, และ `session.md`
- **RULE 1: Single Source of Truth** — ใช้ `callApi()` จาก `api_client.js` เท่านั้น ห้ามใช้ `fetch()` ตรงๆ
- **RULE 2: Authentication** — เก็บ Token ไว้ที่ `localStorage['comphone_auth_session']` เท่านั้น เพื่อแชร์ระหว่าง PC และ Mobile

### 1.2. ส่วนประกอบหลัก (Core Components)
1. **Backend (Google Apps Script)**
   - `Router.gs`: Entry point หลักสำหรับรับ Request (`doGet`, `doPost`)
   - `JobsHandler.gs`: จัดการงานซ่อม (สร้าง, อัปเดตสถานะ, ค้นหา)
   - `Inventory.gs`: จัดการคลังสินค้า (สต็อก, ตัดสต็อก, โอนย้าย)
   - `Reports.gs`: สร้างรายงานสรุปผล (รายรับ, ประสิทธิภาพช่าง)
   - `CRM.gs`: จัดการข้อมูลลูกค้าและประวัติการซ่อม
   - `RetailSale.gs`: จัดการงานขายหน้าร้าน (POS)
   - `TaxEngine.gs` & `TaxDocuments.gs`: ระบบภาษี (VAT, WHT)
   - `WarrantyManager.gs`: จัดการใบรับประกัน
   - `MultiBranch.gs`: จัดการหลายสาขา
   - `HealthMonitor.gs`: ตรวจสอบสุขภาพระบบ

2. **Frontend (PWA Mobile)**
   - `index.html`: โครงสร้างหลักของแอปพลิเคชันมือถือ
   - `app.js`: จัดการ State, Routing, และ Offline Queue
   - `api_client.js`: ศูนย์กลางการเรียก API ไปยัง GAS
   - `auth.js`: จัดการการเข้าสู่ระบบและ Session

3. **Frontend (PC Dashboard)**
   - `dashboard_pc.html`: หน้าจอสำหรับผู้บริหารและแอดมิน (หน้าจอใหญ่)
   - ใช้ `api_client.js` ร่วมกับ PWA Mobile เพื่อความสม่ำเสมอของข้อมูล

## 2. กระบวนการทำงาน (Workflows)

### 2.1. การรับงานซ่อม (Job Creation)
1. แอดมินหรือช่างสร้างงานใหม่ผ่าน PWA หรือ PC Dashboard
2. ระบบส่งข้อมูลไปยัง `Router.gs` (action: `createJob`)
3. `JobsHandler.gs` บันทึกข้อมูลลง Google Sheets และสร้าง Folder ใน Google Drive สำหรับเก็บรูปภาพ
4. ระบบส่ง LINE Notification แจ้งเตือนลูกค้า (ถ้าตั้งค่าไว้)

### 2.2. การจัดการสต็อก (Inventory Management)
1. เมื่อช่างเบิกอะไหล่ ระบบจะเรียก API `scanWithdrawStock`
2. `Inventory.gs` ตรวจสอบจำนวนคงเหลือและตัดสต็อก
3. หากสต็อกต่ำกว่าจุดสั่งซื้อ (Reorder Point) ระบบจะแจ้งเตือนแอดมิน

### 2.3. งานขายหน้าร้าน (POS / Retail Sale)
1. พนักงานขายเลือกสินค้าลงตะกร้าผ่านเมนู POS
2. ระบบคำนวณ VAT อัตโนมัติ (ถ้าตั้งค่าไว้)
3. เรียก API `createRetailSale` เพื่อบันทึกยอดขายและตัดสต็อกทันที

### 2.4. การออกบิลและรับชำระเงิน (Billing & Payment)
1. เมื่องานซ่อมเสร็จสิ้น บัญชีสามารถสร้างบิลผ่านระบบ
2. ระบบสร้าง QR Code พร้อมเพย์สำหรับรับชำระเงิน
3. เมื่อลูกค้าชำระเงิน บัญชีอัปเดตสถานะบิลเป็น "ชำระแล้ว"

## 3. การพัฒนาและบำรุงรักษา (Development & Maintenance)

- **การเพิ่มฟีเจอร์ใหม่:** ต้องอัปเดต `Router.gs` ให้รองรับ Action ใหม่เสมอ
- **การแก้ไข UI:** ต้องทดสอบทั้งบนมือถือ (PWA) และคอมพิวเตอร์ (PC Dashboard)
- **การจัดการ Error:** ใช้ `error_boundary.js` เพื่อป้องกันแอปพลิเคชันค้างเมื่อเกิดข้อผิดพลาด
- **Version Sync:** ต้องอัปเดต `APP_VERSION` ใน `app.js` และ `CONFIG.VERSION` ใน `Router.gs` ให้ตรงกันเสมอ โดย Backend จะส่ง `meta.version` กลับมาในทุก Response ผ่าน `jsonOutputV55_()` เพื่อให้ Frontend ตรวจสอบ Mismatch ได้ทันที
- **Performance & Logging:** ใช้ `CacheService` ใน GAS สำหรับข้อมูลที่ถูกเรียกบ่อย และมีการจับเวลา (Timing) การเรียก API ทุกครั้งใน `api_client.js` (`callApi`) เพื่อตรวจสอบคอขวดของระบบ

---
*อัปเดตล่าสุด: 19 เมษายน 2026*
