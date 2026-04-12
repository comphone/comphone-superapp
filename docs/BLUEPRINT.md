# COMPHONE SUPER APP V5.5 — System Blueprint

เอกสารนี้คือ Blueprint หลักของระบบ COMPHONE SUPER APP V5.5 ที่อัปเดตล่าสุด (เมษายน 2026) ครอบคลุมสถาปัตยกรรม ฟีเจอร์ที่มีอยู่ และแผนการพัฒนาในอนาคต

---

## 1. สถาปัตยกรรมระบบ (System Architecture)

ระบบถูกออกแบบเป็น **Single Page Application (SPA)** โดยใช้ Google Apps Script (GAS) เป็น Backend และ HTML/JS/CSS เป็น Frontend

### 1.1 Frontend (UI Layer)
- **Framework:** Bootstrap 5.3 + Font Awesome 6
- **Structure:** Section-based Navigation (`<div id="section-xxx">`) ทำให้เปลี่ยนหน้าได้ทันทีโดยไม่ต้องโหลดใหม่
- **Mobile-First:** ออกแบบให้ใช้งานบนมือถือได้ดีเยี่ยมผ่าน Bottom Navigation Bar
- **ไฟล์หลัก:**
  - `Index.html`: โครงสร้าง HTML หลักทั้งหมด (Dashboard, Inventory, Modals)
  - `JS_Part1.html`: API Wrapper, State Management, Utilities
  - `JS_Part2.html`: Event Listeners, UI Logic, Navigation
  - `JS_Dashboard.html`: Logic เฉพาะสำหรับหน้า Dashboard

### 1.2 Backend (API Layer)
- **Router:** `Router.gs` ทำหน้าที่รับ Request ทั้งหมด (ทั้ง GET สำหรับ HTML และ POST สำหรับ JSON API)
- **Data Storage:** Google Sheets (ผ่าน `Utils.gs` และ Manager ต่างๆ)
- **Configuration:** Script Properties (ผ่าน `Config.gs`) เพื่อความปลอดภัย ไม่ฝัง Token ในโค้ด

---

## 2. ฟีเจอร์หลักในปัจจุบัน (Current Features)

### 2.1 Smart Dashboard
- **KPI Cards:** สรุปภาพรวมงาน (ทั้งหมด, กำลังทำ, ค้าง, เสร็จ)
- **Revenue Tracking:** สรุปรายได้ วันนี้/สัปดาห์/เดือน
- **Quick Stats:** แจ้งเตือนสต็อกต่ำ, PM ถึงรอบ, รูปรอประมวลผล
- **Smart Search:** ค้นหา Job ID, ลูกค้า, อาการ, ช่าง ได้ในช่องเดียว พร้อม Dropdown แสดงผล Real-time
- **Voice Search:** รองรับการค้นหาด้วยเสียงภาษาไทย (Web Speech API)
- **Quick Filters:** กรองสถานะงานด้วยคลิกเดียว (รอดำเนินการ, กำลังทำ, รอชำระ, ปิดงาน)

### 2.2 Job Management (ระบบจัดการงาน)
- **12-Step Workflow:** รองรับสถานะงาน 12 ขั้นตอน (รอมอบหมาย → ปิดงาน)
- **Job Detail Modal:**
  - **Tab รายละเอียด:** ข้อมูลลูกค้า, อาการ, บันทึกหมายเหตุด่วน
  - **Tab สถานะ:** เปลี่ยนสถานะด้วยการคลิก (Visual Steps), มอบหมายช่าง
  - **Tab ภาพ (Photo Gallery):** ดูภาพแบบ Grid, อัปโหลดภาพใหม่, Lightbox ดูภาพเต็มจอพร้อมปุ่มแชร์/ดาวน์โหลด
  - **Tab Timeline:** ประวัติการเปลี่ยนสถานะ, เวลา, ผู้ดำเนินการ, ลิงก์ GPS
- **Share Job:** แชร์ข้อมูลงานไปยัง LINE หรือแอปอื่นๆ ได้ทันที

### 2.3 Inventory System (ระบบคลังสินค้า 3 ชั้น)
- **โครงสร้าง 3 ชั้น:** คลังหลัก (Main) → หน้าร้าน (Site) → รถช่าง (Van)
- **Dashboard View:** สรุปจำนวนรายการในแต่ละคลัง และแจ้งเตือนสต็อกต่ำ
- **Inventory Table:** แสดงยอดรวมและยอดแยกตามคลัง พร้อม Badge สถานะ

---

## 3. แผนการพัฒนาเมนูในอนาคต (Future Expansion)

สถาปัตยกรรม SPA ที่ออกแบบไว้รองรับการเพิ่มเมนูใหม่ได้ง่ายมาก โดย Backend มี API เตรียมไว้พร้อมแล้ว

### Phase 1: CRM & Customer Management
- **เป้าหมาย:** จัดการฐานข้อมูลลูกค้าและประวัติการซ่อม
- **API ที่มีอยู่:** `createCustomer`, `updateCustomer`, `getCustomer`, `listCustomers`
- **UI Plan:** สร้าง `section-customers` แสดงตารางลูกค้าและประวัติงาน

### Phase 2: Team & Attendance
- **เป้าหมาย:** จัดการทีมช่างและเวลาเข้า-ออกงาน
- **API ที่มีอยู่:** `clockIn`, `clockOut`, `getAttendanceReport`, `getAllTechsSummary`
- **UI Plan:** สร้าง `section-team` แสดงสถานะช่าง (กำลังทำงาน/ว่าง) และประวัติการลงเวลา

### Phase 3: After-Sales Service
- **เป้าหมาย:** จัดการงาน PM (Preventive Maintenance) และการรับประกัน
- **API ที่มีอยู่:** `createAfterSalesRecord`, `getAfterSalesDue`
- **UI Plan:** สร้าง `section-aftersales` แสดงรายการที่ถึงรอบ PM พร้อมปุ่มสร้างงานใหม่

---

## 4. มาตรฐานการเขียนโค้ด (Coding Standards)

1. **No Hardcoded Secrets:** ห้ามฝัง API Key หรือ Token ในโค้ด ให้ใช้ `Config.gs` (Script Properties) เสมอ
2. **UI Components:** ใช้ Bootstrap 5 classes เป็นหลัก หลีกเลี่ยง Custom CSS หากไม่จำเป็น
3. **Non-blocking UI:** ใช้ Toast Notification แทน `alert()` เพื่อไม่ให้ขัดจังหวะการทำงานของผู้ใช้
4. **Mobile Responsiveness:** ทดสอบ UI บนหน้าจอมือถือเสมอ (ใช้ `col-12 col-md-6` pattern)
5. **API Calls:** ใช้ `api.callServer('actionName', payload)` ที่เตรียมไว้ใน `JS_Part1.html` เสมอ
