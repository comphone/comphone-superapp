# 🧠 Session Context

## 👤 User Context
* **ตัวตน / บทบาท**: เจ้าของร้านซ่อมคอมพิวเตอร์/มือถือ (Owner) และทีมช่าง (Technicians)
* **ลักษณะการใช้งาน**: Hybrid (ใช้งานผ่าน Mobile PWA สำหรับช่าง และ PC สำหรับ Admin/Owner)
* **เป้าหมายของระบบ**: บริหารจัดการงานซ่อม (Job Tracking), สต็อกสินค้า (Inventory), ลูกค้า (CRM), และการเงิน (Billing) แบบครบวงจรผ่าน Google Apps Script (GAS)

## 🏢 Project Overview
* **ชื่อระบบ**: COMPHONE SUPER APP V5.5
* **ประเภท**: ERP / POS / Job Management System
* **สถานะปัจจุบัน**: Sprint 7 เสร็จสมบูรณ์ (Quick Actions เชื่อมต่อ API จริงแล้ว)
* **โมดูลหลัก**:
    1. **Jobs**: ระบบรับงาน, ติดตามสถานะ (State Machine), Timeline
    2. **Inventory**: ระบบสต็อกสินค้า, แจ้งเตือนสต็อกต่ำ
    3. **CRM**: ระบบฐานข้อมูลลูกค้า
    4. **Auth**: ระบบ Login PIN และ Role-based Access Control (RBAC)
    5. **Billing**: ระบบออกบิล, ใบเสร็จ, และ QR PromptPay
    6. **Dashboard**: ระบบสรุปผลการดำเนินงานและแจ้งเตือนผ่าน LINE

## ⚙️ Tech Stack
* **Frontend**: HTML5, CSS3 (Custom Mobile-first), JavaScript (Vanilla JS), Bootstrap Icons
* **Backend**: Google Apps Script (GAS)
* **Database**: Google Sheets (DBJOBS, DB_INVENTORY, DB_USERS, DB_CUSTOMERS, etc.)
* **Integration**: LINE Notify API, Google Drive API

## 🌐 Environment / Config
```js
const CONFIG = {
  DEFAULT_SCRIPT_URL: "https://script.google.com/macros/s/AKfycbzTkaRqupj6H5cDnL69bZj4Nh0er8NLgqrRshy4bh9eq9HI5DdhosUiLaNn-Oaa93_47Q/exec",
  APP_VERSION: "5.5.2",
  SESSION_TTL_HOURS: 24,
  THEMES: { tech: 'theme-tech', admin: 'theme-admin', acct: 'theme-acct', exec: 'theme-exec' }
};
```

## 🔑 API Keys / External Services
```env
SPREADSHEET_ID=XXXX (ดึงจาก Script Properties)
LINE_NOTIFY_TOKEN=XXXX (สำหรับส่งแจ้งเตือนกลุ่ม)
PROMPTPAY_ID=XXXX (สำหรับสร้าง QR Code)
GEMINI_API_KEY=XXXX (สำหรับ AI Reorder Suggestion)
```

## 🔌 API Contract
* **รูปแบบการเรียก**: `async function callAPI(action, params = {})`
* **Request Structure**: `{ action: "string", token: "string", ...payload }`
* **Response Structure**: `{ success: boolean, data: any, error: string }`
* **Auth**: ส่ง `token` (Session ID) ในทุก request ที่ต้องการสิทธิ์

## 📡 Backend Structure
* **Router**: `Router.gs` (doPost/doGet) ทำหน้าที่ Dispatch action
* **Auth Guard**: `requireAuth_(action, payload)` ตรวจสอบสิทธิ์ก่อนเข้าถึงฟังก์ชัน
* **Action Mapping**: `normalizeActionV55_(action)` แมปชื่อภาษาไทย/ย่อ เข้ากับฟังก์ชันหลัก

## 🗄️ Data Structure
### DBJOBS (งานซ่อม)
| field | type | description |
|---|---|---|
| job_id | string | รหัสงาน (JOB-XXXX) |
| customer | string | ชื่อลูกค้า |
| status_label | string | ข้อความสถานะ |
| status_code | number | รหัสสถานะ (1-10) |
| tech | string | ช่างผู้รับผิดชอบ |

### DB_INVENTORY (สต็อก)
| field | type | description |
|---|---|---|
| item_code | string | รหัสสินค้า |
| item_name | string | ชื่อสินค้า |
| qty | number | จำนวนคงเหลือ |
| min_qty | number | จุดสั่งซื้อ |

## 🔁 Workflow
1. **Job Flow**: รับเครื่อง (1) → วินิจฉัย (2) → รออะไหล่ (3) → กำลังซ่อม (4) → ซ่อมเสร็จ (5) → ส่งมอบ (7/9)
2. **Auth Flow**: Login (PIN/Pass) → รับ Token → เก็บใน LocalStorage → ใช้เรียก API
3. **Quick Action Flow**: กดปุ่มหน้า Home → Prompt รับค่า → callAPI → GAS ส่ง LINE/อัปเดตสถานะ

## 📂 File Structure
### Frontend (pwa/)
* `index.html`: โครงสร้างหลักและ Modals
* `style.css`: ดีไซน์ทั้งหมด
* `app.js`: Logic หลักและ Routing
* `auth.js`: ระบบยืนยันตัวตน
* `job_workflow.js`: ระบบงานซ่อม
* `inventory.js`, `crm_attendance.js`, `billing_customer.js`, `purchase_order.js`, `dashboard.js`: โมดูลแยกตามฟังก์ชัน

### Backend (clasp-ready/)
* `Router.gs`, `Auth.gs`, `JobsHandler.gs`, `JobStateMachine.gs`, `Inventory.gs`, `CRM.gs`, `Attendance.gs`, `Billing.gs`, `PurchaseOrder.gs`, `Dashboard.gs`, `AfterSales.gs`, `SystemSetup.gs`

## 📌 Naming Convention
* **Actions**: camelCase (เช่น `openJob`, `nudgeTech`)
* **Functions**: camelCase (Frontend), camelCase (Backend)
* **Database**: UPPER_SNAKE_CASE (เช่น `DB_USERS`)

## 🚧 Pending Tasks
1. **Sprint 8**: Photo Management (ถ่ายรูป/อัปโหลดเข้า Google Drive จริง)
2. **Sprint 9**: LINE Messaging (ส่งข้อความหาลูกค้าโดยตรงผ่าน LINE OA/Notify)
3. **Sprint 10**: Admin Panel UI (ระบบจัดการ User และสิทธิ์การใช้งาน)
4. **Sprint 11**: Offline Sync (ระบบ IndexedDB สำหรับทำงานตอนไม่มีเน็ต)

## 🧾 Reusable Prompts
* "เริ่ม Sprint [X] ตามแผนใน session.md"
* "ตรวจสอบความสัมพันธ์ของโค้ดระหว่าง [File A] และ [File B]"
* "สร้าง GAS function ใหม่สำหรับ [Feature] และเพิ่มใน Router.gs"

## 🧩 Rules for Next AI
* **ห้าม rewrite ระบบ**: ให้ต่อยอดจากไฟล์เดิมในโฟลเดอร์ `pwa/` และ `clasp-ready/`
* **รักษา API Contract**: ทุกการเรียก API ต้องผ่าน `callAPI` และส่ง `token`
* **State Machine**: การเปลี่ยนสถานะงานต้องผ่าน `transitionJob` ใน `JobStateMachine.gs` เท่านั้น
* **UI Consistency**: ใช้ CSS classes ที่มีอยู่ใน `style.css` (เช่น `card-glass`, `btn-action`)

## ▶️ Start Command
"อ่าน session.md และเริ่ม Sprint 8: Photo Management"
