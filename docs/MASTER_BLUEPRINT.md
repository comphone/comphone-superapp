# COMPHONE SUPER APP V5.5 - Master Blueprint

เอกสารฉบับนี้คือ **Master Blueprint** ที่รวบรวมข้อมูลสถาปัตยกรรม โครงสร้างข้อมูล การเชื่อมต่อ API และสถานะการพัฒนาของระบบ COMPHONE SUPER APP V5.5 ทั้งหมด เพื่อใช้เป็นแหล่งอ้างอิง (Single Source of Truth) สำหรับนักพัฒนาและ AI Model ที่จะเข้ามารับช่วงต่อ

---

## 1. สถาปัตยกรรมระบบ (System Architecture)

ระบบถูกพัฒนาบน **Google Apps Script (GAS)** โดยใช้ Google Sheets เป็นฐานข้อมูลหลัก และมี Frontend เป็น Single Page Application (SPA)

*   **Frontend:** HTML5, CSS3 (Bootstrap 5.3), Vanilla JavaScript (ES5/ES6)
*   **Backend:** Google Apps Script (GAS)
*   **Database:** Google Sheets (`DB_SS_ID`)
*   **File Storage:** Google Drive (`ROOT_FOLDER_ID`)
*   **Authentication:** Session-based (เก็บ Token ใน Script Properties)
*   **External APIs:** LINE Messaging API, Telegram Bot API, Google Gemini AI (Vision)

### 1.1 โครงสร้างไฟล์หลัก (Core Files)

| ไฟล์ | หน้าที่หลัก |
| :--- | :--- |
| `Index.html` | หน้า UI หลัก (SPA) รวม Navbar, Sidebar, และโครงสร้าง Section ต่างๆ |
| `JS_Part1.html` | JavaScript ส่วนเชื่อมต่อ API (GAS `google.script.run`) และ Utility Functions |
| `JS_Part2.html` | JavaScript ส่วนจัดการ UI, Event Listeners, และ Logic ของแต่ละ Section |
| `JS_Dashboard.html` | JavaScript เฉพาะสำหรับหน้า Dashboard (Charts, KPI, Status Board) |
| `Router.gs` | Entry point ของ Backend (ฟังก์ชัน `doGet`, `doPost`) และ API Routing |
| `Config.gs` | จัดการ Configuration, Environment Variables (Script Properties) |
| `Auth.gs` | ระบบ Login, Role-Based Access Control (RBAC), และ Session Management |
| `JobStateMachine.gs` | จัดการ Workflow 12 ขั้นตอนของงานซ่อม/ติดตั้ง |
| `Inventory.gs` | ระบบจัดการสต็อก 3 ชั้น (Main → Site → Van) |
| `CustomerManager.gs` | ระบบ CRM จัดการข้อมูลลูกค้าและประวัติ |
| `Notify.gs` | ระบบแจ้งเตือนผ่าน LINE และ Telegram |
| `VisionAnalysis.gs` | เชื่อมต่อ Gemini AI เพื่อวิเคราะห์รูปภาพหน้างาน |

---

## 2. การตั้งค่าและการเชื่อมต่อ (Configuration & Integrations)

ระบบใช้ **Script Properties** ในการเก็บค่า Configuration และ API Keys ทั้งหมด (ห้าม Hardcode ใน Source Code)

### 2.1 Script Properties ที่จำเป็น (Required)

*   `DB_SS_ID`: ID ของ Google Sheets ที่ใช้เป็นฐานข้อมูล
*   `ROOT_FOLDER_ID`: ID ของ Google Drive Folder หลักสำหรับเก็บไฟล์และรูปภาพ

### 2.2 Script Properties สำหรับ Integration (Optional)

*   `WEB_APP_URL`: URL ของ Web App ที่ Deploy แล้ว (ใช้สำหรับสร้าง QR Code และ Link)
*   `LINE_CHANNEL_ACCESS_TOKEN`: Token สำหรับ LINE Messaging API (ส่ง Push Message)
*   `LINE_GROUP_TECHNICIAN`: Group ID ของกลุ่มช่าง
*   `LINE_GROUP_SALES`: Group ID ของกลุ่มเซลส์
*   `LINE_GROUP_ADMIN`: Group ID ของกลุ่มแอดมิน
*   `TELEGRAM_BOT_TOKEN`: Token สำหรับ Telegram Bot (ทางเลือกสำรอง)
*   `GEMINI_API_KEY` (หรือ `GOOGLE_AI_API_KEY`): API Key สำหรับใช้งาน Gemini Vision AI

### 2.3 โครงสร้างฐานข้อมูล (Google Sheets)

ระบบคาดหวังให้มี Sheet (Tab) ต่อไปนี้ใน `DB_SS_ID`:

*   `DBJOBS`: ข้อมูลงานซ่อม/ติดตั้งหลัก
*   `DB_INVENTORY`: ข้อมูลสินค้าและสต็อก
*   `DB_CUSTOMERS`: ข้อมูลลูกค้า
*   `DB_STOCK_MOVEMENTS`: ประวัติการเคลื่อนไหวของสต็อก
*   `DB_JOB_ITEMS`: รายการสินค้า/อะไหล่ที่ใช้ในแต่ละงาน
*   `DB_BILLING`: ข้อมูลการวางบิลและการชำระเงิน
*   `DB_JOB_LOGS`: ประวัติการเปลี่ยนสถานะงาน (Timeline)
*   `DB_PHOTO_QUEUE`: คิวรูปภาพที่รอการประมวลผล
*   `DB_USERS`: ข้อมูลผู้ใช้งานระบบ (Username, Password Hash, Role)

---

## 3. ระบบและฟีเจอร์หลัก (Core Modules)

### 3.1 Job State Machine (Workflow 12 ขั้นตอน)

ระบบจัดการงานผ่าน 12 สถานะที่กำหนดไว้ตายตัวใน `JobStateMachine.gs`:

1.  รอมอบหมาย
2.  มอบหมายแล้ว
3.  รับงานแล้ว
4.  เดินทาง
5.  ถึงหน้างาน
6.  เริ่มงาน
7.  รอชิ้นส่วน
8.  งานเสร็จ
9.  ลูกค้าตรวจรับ
10. รอเก็บเงิน
11. เก็บเงินแล้ว
12. ปิดงาน

### 3.2 Role-Based Access Control (RBAC)

กำหนดสิทธิ์ผู้ใช้งาน 4 ระดับใน `Auth.gs`:

*   **OWNER (Level 4):** เข้าถึงได้ทุกส่วน, ดูรายได้, จัดการผู้ใช้
*   **ACCOUNTANT (Level 3):** ดูรายได้, จัดการบิล, ไม่สามารถจัดการผู้ใช้
*   **SALES (Level 2):** เปิดงาน, ดูสต็อก, ไม่เห็นรายได้รวม
*   **TECHNICIAN (Level 1):** ดูงานที่ได้รับมอบหมาย, อัปเดตสถานะ, เบิกของ

### 3.3 Inventory System (สต็อก 3 ชั้น)

ออกแบบเพื่อรองรับการทำงานจริงของช่างภาคสนาม:

*   **MAIN (คลังหลัก):** รับของเข้า, จัดเก็บ
*   **SITE (หน้าร้าน):** ขายหน้าร้าน, โชว์สินค้า
*   **VAN (รถช่าง):** สต็อกย่อยที่ช่างเบิกติดรถไปหน้างาน

---

## 4. สถานะการพัฒนา (Development Status)

### 4.1 ฟีเจอร์ที่พัฒนาเสร็จแล้ว (Completed - Ready to Use)

*   **Smart Dashboard:** UI ใหม่แบบ Mobile-first, KPI Cards, Revenue Tracking
*   **Smart Search & Voice Search:** ค้นหาข้าม Entity (Job, Customer, Tech) พร้อมรองรับเสียงภาษาไทย
*   **Job Detail Modal:** แสดงข้อมูลงานแบบ 4 Tabs (Detail, Status, Photos, Timeline)
*   **Photo Gallery & Lightbox:** ดูรูปภาพงาน, แชร์ผ่าน Web Share API
*   **Inventory UI:** หน้าจอจัดการสต็อก 3 ชั้น และระบบโอนย้าย (Transfer)
*   **Backend APIs:** API สำหรับ CRM, After-Sales, Attendance, Billing มีครบถ้วนในฝั่ง GAS

### 4.2 ฟีเจอร์ที่ Backend เสร็จแล้ว แต่ยังไม่มี UI (Pending Frontend)

ฟีเจอร์เหล่านี้มี API ใน `Router.gs` และไฟล์ Backend ที่เกี่ยวข้องแล้ว รอเพียงการสร้าง `<div id="section-xxx">` ใน `Index.html` และเขียน JS เรียกใช้:

1.  **ระบบลูกค้าสัมพันธ์ (CRM):**
    *   API: `listCustomers`, `createCustomer`, `updateCustomer` (ใน `CustomerManager.gs`)
    *   สิ่งที่ต้องทำ: สร้างหน้าตารางรายชื่อลูกค้า, ฟอร์มเพิ่ม/แก้ไข, และหน้าดูประวัติการซ่อมของลูกค้าแต่ละราย
2.  **ระบบจัดการทีมช่าง (Team & Attendance):**
    *   API: `getAllTechsSummary`, `clockIn`, `clockOut` (ใน `Attendance.gs`)
    *   สิ่งที่ต้องทำ: สร้างหน้าตารางรายชื่อช่าง, ปุ่มลงเวลาเข้า-ออกงาน, และหน้าดูสรุปผลงานของช่างแต่ละคน
3.  **ระบบบริการหลังการขาย (After-Sales & PM):**
    *   API: `getAfterSalesDue`, `logFollowUp` (ใน `AfterSales.gs`)
    *   สิ่งที่ต้องทำ: สร้างหน้าตารางแจ้งเตือนงานที่ถึงรอบ PM (Preventive Maintenance) หรือใกล้หมดประกัน, และฟอร์มบันทึกการโทรติดตามลูกค้า

### 4.3 ฟีเจอร์ที่วางแผนไว้ในอนาคต (Future Roadmap)

*   **Line Bot Rich Menu:** ปรับปรุง Rich Menu ของ LINE Bot ให้เชื่อมต่อกับ Web App (LIFF) ได้อย่างไร้รอยต่อ
*   **Automated Billing:** ระบบสร้างใบแจ้งหนี้ (PDF) อัตโนมัติเมื่อสถานะงานเปลี่ยนเป็น "รอเก็บเงิน" (มีโครงร่างใน `BillingManager.gs` แล้ว)
*   **Predictive Maintenance AI:** ใช้ข้อมูลประวัติการซ่อมมาวิเคราะห์ด้วย AI เพื่อคาดการณ์รอบการเสียของอุปกรณ์

---

## 5. คำแนะนำสำหรับ AI Model ที่จะทำงานต่อ (Handoff Notes)

1.  **Single Page Application (SPA):** การเพิ่มหน้าใหม่ **ห้าม** สร้างไฟล์ HTML ใหม่ ให้เพิ่ม `<div id="section-new">` ใน `Index.html` และใช้ฟังก์ชัน `showSection('section-new')` ใน `JS_Part2.html` เพื่อสลับหน้า
2.  **API Calls:** การเรียก Backend ให้ใช้ Pattern ที่มีอยู่ใน `JS_Part1.html` (เช่น `google.script.run.withSuccessHandler(...)`)
3.  **No Hardcoded Secrets:** หากต้องใช้ API Key หรือ Token ใหม่ ให้เพิ่มใน `Config.gs` (`OPTIONAL_PROPERTIES`) และดึงค่าผ่าน `getConfig('KEY_NAME')` เสมอ
4.  **UI Framework:** ใช้ Bootstrap 5.3 classes เป็นหลัก หลีกเลี่ยงการเขียน Custom CSS หากไม่จำเป็น เพื่อรักษาความสม่ำเสมอของ Design System
5.  **Mobile-First:** ออกแบบ UI ให้รองรับหน้าจอมือถือเสมอ (ใช้ Grid system ของ Bootstrap) เนื่องจากผู้ใช้หลักคือช่างภาคสนาม
