# 🧠 Session Context — COMPHONE SUPER APP V5.5
> **เวอร์ชัน:** v5.5.10 | **อัปเดต:** 18 เมษายน 2569 | **สถานะ:** MISSION COMPLETE ✅ (Phase 1-4) + Auto-Push ✅ + Drive Sync ✅ — คะแนน 100/100 | **Triple Backup:** ✅ Active
> **ไฟล์นี้คือ "สมองสำรอง" ของ AI — อ่านก่อนเริ่มงานทุกครั้ง ห้ามเดาสถานะโปรเจค**

---

## 👤 User Context

| รายการ | ข้อมูล |
|--------|--------|
| **ตัวตน / บทบาท** | เจ้าของร้านซ่อมคอมพิวเตอร์/มือถือ (Owner) + ทีมช่าง (Technicians) |
| **ชื่อบริษัท** | หจก.คอมโฟน แอนด์ อิเล็คโทรนิคส์ |
| **ลักษณะการใช้งาน** | Hybrid — Mobile PWA สำหรับช่างหน้างาน / PC Dashboard สำหรับ Admin/บัญชี |
| **เป้าหมาย** | บริหารจัดการงานซ่อม, สต็อก, CRM, การเงิน ครบวงจรผ่าน GAS |
| **ทีมงาน** | ช่างโต้, ช่างเหม่ง, ช่างรุ่ง (ข้อมูลจริงจาก DBJOBS) |
| **ความต้องการพิเศษ** | Mobile-first, ทำงานอัตโนมัติสูงสุด, AI ช่วยเขียนโค้ด/push/deploy เอง |

---

## 🏢 Project Overview

| รายการ | ข้อมูล |
|--------|--------|
| **ชื่อระบบ** | COMPHONE SUPER APP V5.5 |
| **ประเภท** | ERP / POS / Job Management System |
| **สถาปัตยกรรม** | GAS Backend + PWA Single Page Application (SPA) |
| **ฐานข้อมูล** | Google Sheets (13 tables) |
| **GitHub** | https://github.com/comphone/comphone-superapp |
| **GAS Script ID** | `1-aoCd5gXoo1dX4FjW62l8JknR3ZPiaf1W7YEmEdtq8gnRzSp4Hwj6043` |
| **Spreadsheet ID** | `19fkLbSbBdz0EjAV8nE9LLwBiHeIN50BTPptt_PJCRGA` |
| **GAS Deploy** | @441 (ล่าสุด) — Online ✅ |
| **API Keys Registry** | `memory/API_KEYS_REGISTRY.md` |
| **Skills Context** | `memory/SKILLS_CONTEXT.md` |
| **ข้อมูลจริง** | 18 งาน (J0001–J0018) ใน DBJOBS |

---

## ⚙️ Tech Stack

| Layer | เทคโนโลยี | รายละเอียด |
|-------|-----------|-----------|
| **Backend** | Google Apps Script (GAS) V8 Runtime | doPost() → Router.gs → Modules |
| **Frontend** | PWA — HTML5 + Bootstrap 5.3 + Font Awesome 6 | SPA ซ่อน/แสดง `<div id="section-xxx">` |
| **Database** | Google Sheets | 13 sheets ครบ |
| **Notification** | LINE Messaging API + LINE Notify | Multi-channel, role-based routing (5 กลุ่ม) |
| **AI** | Gemini API (Flash) | Slip verification, Smart Assignment, Vision Analysis |
| **Storage** | Google Drive | รูปภาพงาน (ROOT_FOLDER_ID), PDF ใบเสร็จ |
| **Charts** | Chart.js | Dashboard KPI |
| **Voice** | Web Speech API | Voice Search (th-TH) |
| **GPS** | GpsPipeline.gs | Geofence + Route Optimization |
| **Proxy** | Cloudflare Worker | LINE Webhook async proxy |
| **Hosting** | GitHub Pages | PWA hosting |

---

## 🌐 Environment / Config

### URLs สำคัญ

| รายการ | URL |
|--------|-----|
| **GAS API @441 (หลัก)** | `https://script.google.com/macros/s/AKfycbzE5tyKNA-W6gDQEixw9VTDznTNn5FuToVeVuO_OQL75fDSrpW8U9BT3bhVn4kjKc37/exec` |
| **LINE Webhook** | `https://comphone-line-webhook.narinoutagit.workers.dev/line/webhook` |
| **PWA Mobile** | `https://comphone.github.io/comphone-superapp/pwa/` |
| **PC Dashboard** | `https://comphone.github.io/comphone-superapp/pwa/dashboard_pc.html` |
| **Google Sheets DB** | `https://docs.google.com/spreadsheets/d/19fkLbSbBdz0EjAV8nE9LLwBiHeIN50BTPptt_PJCRGA` |
| **GAS Script Editor** | `https://script.google.com/d/1-aoCd5gXoo1dX4FjW62l8JknR3ZPiaf1W7YEmEdtq8gnRzSp4Hwj6043/edit` |
| **Cloudflare Dashboard** | `https://dash.cloudflare.com/838d6a5a046bfaa2a2003bd8005dd80b` |

### Default Login
| Username | Password | Role |
|----------|----------|------|
| `admin` | `admin1234` | OWNER |

### Script Properties (ตั้งค่าแล้วทั้งหมด)

| Property | สถานะ |
|----------|-------|
| `DB_SS_ID` | ✅ `19fkLbSbBdz0EjAV8nE9LLwBiHeIN50BTPptt_PJCRGA` |
| `ROOT_FOLDER_ID` | ✅ `1YRZRG9r1Y_jMHg2XFFKYjK4Hx-sW0Eq0` |
| `WEB_APP_URL` | ✅ `https://script.google.com/macros/s/AKfycbzE5tyKNA-W6gDQEixw9VTDznTNn5FuToVeVuO_OQL75fDSrpW8U9BT3bhVn4kjKc37/exec` |
| `LINE_CHANNEL_ACCESS_TOKEN` | ✅ ตั้งค่าแล้ว |
| `GEMINI_API_KEY` | ✅ ตั้งค่าแล้ว |
| `LINE_GROUP_TECHNICIAN` | ✅ `C8ad22a115f38c9ad3cb5ea5c2ff4863b` |
| `LINE_GROUP_ACCOUNTING` | ✅ `C7b939d1d367e6b854690e58b392e88cc` |
| `LINE_GROUP_PROCUREMENT` | ✅ `Cfd103d59e77acf00e2f2f801d391c566` |
| `LINE_GROUP_SALES` | ✅ `Cb7cc146227212f70e4f171ef3f2bce15` |
| `LINE_GROUP_EXECUTIVE` | ✅ `Cb85204740fa90e38de63c727554e551a` |
| `TAX_MODE` | ✅ `VAT7` |
| `BRANCH_ID` | ✅ `HQ` |
| `COMPANY_NAME` | ✅ `ร้านคอมโฟน` |
| `COMPANY_TAX_ID` | ✅ `1234567890123` |

### Cloudflare Worker
| รายการ | ค่า |
|--------|-----|
| **Account ID** | `838d6a5a046bfaa2a2003bd8005dd80b` |
| **Worker Name** | `comphone-line-webhook` |
| **Worker Version** | `e9cce19a-8343-449a-b258-05d42ad28de3` |

### Scheduled Triggers (Active — 6 ตัว)

| Function | หน้าที่ |
|----------|---------|
| `sendAfterSalesAlerts` | แจ้งเตือน After Sales |
| `checkLowStockAlert` | แจ้งเตือนสต็อกต่ำ |
| `cronMorningAlert` | รายงานเช้า |
| `geminiReorderSuggestion` | AI แนะนำสั่งซื้อ |
| `autoBackup` | สำรองข้อมูลอัตโนมัติ |
| `getCRMSchedule` | CRM Follow-up |
| `cronTaxReminder` | แจ้งเตือนยื่นภาษี (วันที่ 1 ของเดือน) |
| `cronHealthCheck` | ตรวจสอบสถานะระบบ (ทุก 30 นาที) |

---

## 🔑 API Keys / External Services

| Service | สถานะ | หมายเหตุ |
|---------|-------|---------|
| **LINE Messaging API** | ✅ Token ตั้งค่าแล้ว | **⚠️ ต้องตั้ง Webhook URL** ใน LINE Developers Console |
| **LINE Notify** | ✅ ตั้งค่าแล้ว | 5 กลุ่ม |
| **Gemini API (Flash)** | ✅ ตั้งค่าแล้ว | Slip verify + Smart Assignment + Vision |
| **Google Drive** | ✅ ROOT_FOLDER_ID ตั้งค่าแล้ว | รูปงาน + PDF |
| **PromptPay QR** | ✅ Built-in GAS | สร้าง QR ผ่าน BillingManager.gs |

---

## 🔌 API Contract

```
Endpoint: POST {WEB_APP_URL}
Request:  { action: "string", token?: "string", ...payload }
Response: { success: boolean, data: any, message?: string }
Auth:     ส่ง token (Session ID) ในทุก request ที่ต้องการสิทธิ์
```

### Frontend Pattern
```js
async function callAPI(action, params = {}) {
  const res = await fetch(CONFIG.DEFAULT_SCRIPT_URL, {
    method: 'POST',
    body: JSON.stringify({ action, token: getToken(), ...params })
  });
  return res.json();
}
```

### GAS Return Pattern
```js
return ContentService.createTextOutput(
  JSON.stringify({ success: true, data: result })
).setMimeType(ContentService.MimeType.JSON);
```

### Actions ที่ implement แล้วใน Router.gs (40+ actions)

| กลุ่ม | Actions |
|-------|---------|
| **Auth** | `loginUser`, `logoutUser`, `verifySession`, `listUsers`, `createUser`, `updateUserRole`, `setUserActive` |
| **Jobs** | `getJobs`, `getJobById`, `createJob`, `updateJob`, `updateJobStatus`, `deleteJob`, `addJobNote`, `getJobTimeline`, `assignTechnician`, `openJob` |
| **Inventory** | `getInventory`, `addInventoryItem`, `updateInventoryItem`, `deleteInventoryItem`, `transferStock`, `getStockMovements`, `barcodeLookup`, `getInventoryItemDetail` |
| **Billing** | `createBill`, `getBills`, `updateBillStatus`, `generatePDF`, `verifySlip`, `createBilling` |
| **Customer / CRM** | `getCustomers`, `createCustomer`, `updateCustomer`, `getCRMSchedule`, `getCustomer` |
| **Photo** | `uploadPhoto`, `getPhotos`, `processPhotoQueue`, `analyzePhoto` |
| **Purchase Order** | `createPO`, `getPOs`, `updatePOStatus`, `approvePO` |
| **Attendance** | `clockIn`, `clockOut`, `getAttendance` |
| **After Sales** | `createAfterSales`, `getAfterSales`, `updateAfterSales`, `createAfterSalesRecord` |
| **Dashboard** | `getDashboardData`, `systemStatus` |
| **LINE** | LINE Webhook (auto-detect via `destination` + `events`) |
| **Notification** | `sendNotify`, `sendLineMessage` |
| **Smart/AI** | `smartAssignment`, `gpsPipeline`, `geminiReorderSuggestion` |
| **Public (ไม่ต้อง Auth)** | `getJobStatusPublic` |
| **Tax & Warranty** | `taxAction`, `getBranchList`, `getBranchSummary`, `healthCheck`, `getHealthHistory` |

---

## 📡 Backend Structure (23 ไฟล์)

| ไฟล์ | หน้าที่ |
|------|---------|
| `Router.gs` | HTTP Router — doPost(), dispatch, AUTH_REQUIRED_ACTIONS_ |
| `Config.gs` | Script Properties wrapper, constants |
| `Auth.gs` | Login PIN, verifySession, RBAC (4 roles) |
| `JobsHandler.gs` | Job CRUD + Timeline + Notes |
| `JobStateMachine.gs` | 12-state machine + transition validation |
| `BillingManager.gs` | Bill/Receipt + PromptPay QR + PDF + Slip Verify |
| `Inventory.gs` + `InventoryManager.gs` | Stock 3-layer (Warehouse/Shop/Van) + PO + Barcode |
| `CustomerManager.gs` | CRM CRUD + Follow-up schedule |
| `LineBot.gs` | LINE Webhook handler + command parser |
| `FlexMessage.gs` | 4 Flex Message templates |
| `Notify.gs` | LINE Notify + Messaging API multi-channel |
| `PhotoQueue.gs` | Photo upload queue → Drive storage |
| `VisionAnalysis.gs` | Gemini Vision — slip verify + photo QC |
| `GpsPipeline.gs` | GPS geofence + route optimization |
| `SmartAssignment.gs` | AI-based tech assignment |
| `Dashboard.gs` + `DashboardV55.gs` | Dashboard aggregation + KPI |
| `Attendance.gs` | Clock in/out + attendance report |
| `AfterSales.gs` | Warranty + after-sales follow-up |
| `PurchaseOrder.gs` | PO management |
| `AutoBackup.gs` | Scheduled backup to Drive |
| `Setup.gs` + `SystemSetup.gs` | Initial setup + sheet creation |
| `Utils.gs` | Shared utilities |
| `TaxEngine.gs` | ระบบคำนวณภาษี VAT/WHT |
| `TaxDocuments.gs` | สร้าง PDF ใบกำกับภาษี/ภงด. |
| `WarrantyManager.gs` | ระบบรับประกันสินค้า |
| `MultiBranch.gs` | ระบบจัดการหลายสาขา |
| `HealthMonitor.gs` | ตรวจสอบสถานะระบบ + Security |

---

## 🗄️ Data Structure

### Job Status Codes (12 states — JobStateMachine.gs)

| Code | สถานะ |
|------|-------|
| 0 | รับงานใหม่ |
| 1 | รอมอบหมาย |
| 2 | มอบหมายแล้ว |
| 3 | กำลังดำเนินการ |
| 4 | รอชิ้นส่วน |
| 5 | รอลูกค้าอนุมัติ |
| 6 | รอนัดหมาย |
| 7 | กำลังเดินทาง |
| 8 | ทำงานหน้างาน |
| 9 | เสร็จสิ้น รอตรวจ |
| 10 | รอชำระเงิน |
| 11 | ปิดงาน |
| 99 | ยกเลิก |

### User Roles (RBAC)

| Role | สิทธิ์ |
|------|-------|
| `owner` | ทุกอย่าง รวมถึงจัดการ User และดู Report ทั้งหมด |
| `admin` | จัดการงาน สต็อก บัญชี ยกเว้นจัดการ User |
| `tech` | ดูงานตัวเอง อัปเดตสถานะ อัปโหลดรูป |
| `acct` | ดูบิล สร้างใบเสร็จ รายงานการเงิน |

### Google Sheets (13 tables)

| Sheet | Rows | สถานะ |
|-------|:---:|-------|
| `DBJOBS` | 18 | ✅ มีข้อมูลจริง |
| `DB_INVENTORY` | 1 | ⚠️ ว่าง — ต้อง seed |
| `DB_CUSTOMERS` | 1 | ⚠️ ว่าง — ต้อง seed |
| `DB_BILLING` | 1 | ⚠️ ว่าง |
| `DB_USERS` | 1 | ⚠️ ว่าง — ต้อง seed |
| `DB_STOCK_MOVEMENTS` | 0 | ว่าง |
| `DB_JOB_ITEMS` | 0 | ว่าง |
| `DB_PHOTO_QUEUE` | 0 | ว่าง |
| `DB_PURCHASE_ORDERS` | 0 | ว่าง |
| `DB_ATTENDANCE` | 0 | ว่าง |
| `DB_AFTER_SALES` | 0 | ว่าง |
| `DB_JOB_LOGS` | มีข้อมูล | ✅ |
| `DB_ACTIVITY_LOG` | 5 | ✅ |
| `DB_TAX_REPORT` | 0 | ว่าง |
| `DB_WARRANTY` | 0 | ว่าง |
| `DB_HEALTH_LOG` | 0 | ว่าง |

---

## 🔁 Workflow

### Job Lifecycle
```
เปิดงาน (0) → รอมอบหมาย (1) → มอบหมายช่าง (2) → กำลังดำเนินการ (3)
  → รอชิ้นส่วน (4) / รอลูกค้า (5) / นัดหมาย (6) / เดินทาง (7) / หน้างาน (8)
  → เสร็จ รอตรวจ (9) → ออกบิล (10) → ปิดงาน (11)
```

### Billing Flow
```
งานสถานะ 9 → สร้างบิล → QR PromptPay → ลูกค้าโอน → แนบสลิป
→ VisionAnalysis.gs verify slip → สถานะ 11 → LINE แจ้งทีมบัญชี
```

### Photo Pipeline
```
ช่างถ่ายรูป → Upload Base64 → PhotoQueue.gs → GPS Geofence Check
→ VisionAnalysis.gs (Gemini) → QC Pass/Fail → Drive Storage → Lightbox Gallery
```

### Notification Routing
```
Event → Notify.gs → LINE Group ตามบทบาท
  งานใหม่/มอบหมาย → LINE_GROUP_TECHNICIAN
  บิล/ชำระเงิน    → LINE_GROUP_ACCOUNTING
  สั่งซื้อ         → LINE_GROUP_PROCUREMENT
  ยอดขาย          → LINE_GROUP_SALES
  สรุปภาพรวม      → LINE_GROUP_EXECUTIVE
```

---

## 📂 File Structure

```
comphone-superapp/                  ← GitHub repo
├── clasp-ready/                    ← GAS Backend (23 ไฟล์ .gs)
│   ├── .clasp.json                 ← scriptId
│   ├── appsscript.json             ← timezone: Asia/Bangkok, V8
│   └── [23 ไฟล์ .gs ตามรายการใน Backend Structure]
├── pwa/                            ← PWA Frontend (GitHub Pages)
│   ├── index.html      (28,837 bytes)
│   ├── app.js          (48,121 bytes)
│   ├── style.css       (24,721 bytes)
│   ├── auth.js, job_workflow.js, inventory.js
│   ├── billing_customer.js, crm_attendance.js
│   ├── purchase_order.js, dashboard.js
│   ├── dashboard_pc.html, sw.js, manifest.json
│   └── worker.js, worker_v425.js
└── docs/
    ├── MASTER_BLUEPRINT.md         ← Blueprint หลัก (v5.5.4)
    ├── PWA_ROADMAP.md              ← Roadmap Phase 1-4
    ├── DEV_MEMORY.md               ← Design decisions
    └── COMPHONE_MEMORY_LOG.md      ← Development history
```

---

## 📌 Naming Convention

| ประเภท | Convention | ตัวอย่าง |
|--------|-----------|---------|
| GAS Functions | camelCase | `getJobById`, `updateJobStatus` |
| GAS Private | camelCase + trailing `_` | `parsePostPayloadV55_()` |
| JS Frontend | camelCase | `renderJobCard()`, `callAPI()` |
| CSS Classes | kebab-case | `section-jobs`, `card-glass` |
| Sheet Names | UPPER_SNAKE_CASE | `DB_INVENTORY`, `DBJOBS` |
| Job IDs | J + 4 digits | `J0001`, `J0018` |
| API Actions | camelCase | `getDashboardData`, `loginUser` |
| GAS Files | PascalCase.gs | `JobStateMachine.gs` |
| PWA Files | snake_case.js | `job_workflow.js` |

---

## 🎨 Design Decisions (ห้ามเปลี่ยน)

> บันทึกจาก Development Memory — ผ่านการทดสอบแล้ว

1. **SPA Architecture** — ใช้ JS ซ่อน/แสดง `<div id="section-xxx">` ไม่ใช่หลายไฟล์ HTML
2. **Mobile-first** — ออกแบบสำหรับมือถือก่อน ขยายไป PC ทีหลัง
3. **Toast Notifications** — ไม่ใช้ `alert()` ใช้ Toast ที่มุมจอแทน
4. **Job Detail Tabs 4 ส่วน** — รายละเอียด / สถานะ / ภาพ / Timeline
5. **Smart Search** — ค้นหาข้าม Job ID, ชื่อลูกค้า, อาการ, ช่าง ในช่องเดียว
6. **Inventory 3 ชั้น** — Main / Site / Van (ตามการทำงานจริงของธุรกิจ)
7. **Cloudflare Worker** — ใช้เป็น LINE Webhook proxy เพราะ GAS มี cold start delay
8. **PIN Auth** — ใช้ PIN แทน OAuth เพราะง่ายสำหรับช่างในสนาม

---

## ✅ งานที่เสร็จในเซสชันล่าสุด (18 เมษายน 2569 — เซสชัน 3: MISSION COMPLETE)

| ไฟล์ | ประเภท | หน้าที่ |
|------|--------|--------|
| `TaxEngine.gs` | GAS | VAT Flexible (VAT7/ZERO/EXEMPT/MIXED) + WHT ภงด. 1%/3%/5% |
| `TaxDocuments.gs` | GAS | ใบกำกับภาษีอย่างย่อ PDF + รายงาน ภงด. PDF รายเดือน + Tax Reminder |
| `WarrantyManager.gs` | GAS | สร้างใบรับประกัน PDF + เชื่อม AfterSales + แจ้งเตือนใกล้หมดอายุ |
| `MultiBranch.gs` | GAS | branch_id ทุก 7 tables + filter query + getBranchSummary() |
| `HealthMonitor.gs` | GAS | Token verify, Rate limit, CORS, Health Check auto + LINE alert |
| `sync_all.py` | Script | แก้ไข Google Drive Sync Token Validation |
| `API_KEYS_REGISTRY.md` | Docs | รวบรวม API Keys และ Endpoints ทั้งหมด |
| `SKILLS_CONTEXT.md` | Docs | รวบรวม Skills ที่ใช้ในโปรเจกต์ |
---

## 🚧 Pending Tasks

### ⚠️ ด่วนที่สุด (ทำก่อน Deploy จริง)

- [ ] **ตั้งค่า LINE Webhook URL** ใน LINE Developers Console → `https://comphone-line-webhook.narinoutagit.workers.dev/line/webhook`
- [ ] **Seed ข้อมูลเริ่มต้น** — รัน `seedAllData()` ใน `DataSeeding.gs` (อยู่ใน delivery/)
- [ ] **เพิ่ม DB_USERS** — ต้องสร้าง user จริงก่อนใช้งาน
- [ ] **จัดการงานค้าง 16 งาน** — J0001–J0018 ส่วนใหญ่ค้างเกิน 11-16 วัน ไม่มีช่างรับผิดชอบ

### 🔴 Phase 3 — ถัดไป (Backend พร้อมแล้ว)

| # | งาน | GAS Action | สถานะ |
|---|-----|-----------|-------|
| 3.1 | Customer Portal | `getJobStatusPublic` | ✅ สร้างแล้วใน delivery/ |
| 3.2 | Photo Upload Before/After | `PhotoQueue.gs` | รอ integrate ใน PWA |
| 3.3 | Inventory Management UI | `getInventoryItemDetail` | รอพัฒนา |
| 3.4 | Barcode Scanner | `barcodeLookup` | รอพัฒนา |
| 3.5 | Open Job Form (PWA) | `openJob` | ⚠️ ปัจจุบันเป็น showToast เท่านั้น |
| 3.6 | Assign Tech (PWA) | `updateJobStatus` | ⚠️ ปัจจุบันเป็น showToast เท่านั้น |

### 🟡 Phase 4 — Advanced Features (เสร็จแล้ว ✅)

- [x] Kudos System (ลูกค้าให้ดาวช่าง)
- [x] Warranty Management
- [x] P&L Report
- [x] Auto-Tax Engine (VAT 7% / WHT 3%)
- [x] Multi-branch Support
- [x] Offline Sync (IndexedDB)

### 🔧 Technical Debt

- [ ] `app.js` ใหญ่มาก (48KB) — ควร refactor แยก modules
- [ ] ทดสอบ Smart Assignment + GPS Pipeline กับข้อมูลจริง
- [ ] ทดสอบ Photo Pipeline end-to-end
- [ ] Functions ที่ยังเป็น `showToast()` เท่านั้น: `openNewJob()`, `assignJob()`, `createReceipt()`, `showQR()`, `addCustomer()`, `viewReport()`, `viewPL()`, `addAppointment()`, `nudgeTech()`

---

## 🔒 Triple Backup — กฎเหล็ก (ห้ามละเมิด)

> **ทุกครั้งที่ session.md อัปเดต ต้อง backup พร้อมกัน 3 ที่เสมอ — ห้ามขาดแม้แต่ที่เดียว**

| # | ที่เก็บ | Path / Location | วิธี |
|---|---------|----------------|------|
| 1 | **Google Drive** | `ROOT_FOLDER_ID/SessionBackups/` | GAS `backupSession` action (SessionBackup.gs) |
| 2 | **Local** | `/home/ubuntu/session_backups/` | `triple_backup.py` |
| 3 | **GitHub** | `memory/session.md` ใน repo | git commit + push |

**คำสั่ง Triple Backup (คำสั่งเดียว):**
```bash
python3 /home/ubuntu/skills/comphone-handover/scripts/triple_backup.py \
  --session /memory/session.md \
  --github-token $GITHUB_TOKEN
```

**ถ้าไม่มี PAT:** ใช้ `--skip-github` แล้ว push ผ่าน GitHub.com หรือ GitHub Desktop

---

## 🛠️ Deploy Commands

```bash
# GAS push + deploy
python3.11 /home/ubuntu/refresh_clasp_push.py

# Cloudflare Worker
cd /home/ubuntu/comphone-line-webhook && wrangler deploy

# GitHub push
cd /home/ubuntu/github-clone && git add -A && git commit -m "feat: ..." && git push origin main

# ตรวจสอบ GAS status
python3.11 /home/ubuntu/skills/comphone-superapp-dev/references/gas_status_check.py
```

---

## 🧾 Reusable Prompts

| Prompt | ผลลัพธ์ |
|--------|---------|
| `"ใช้ skill comphone-superapp-dev เพื่อพัฒนา [feature]"` | เริ่มพัฒนา feature ใหม่ |
| `"ใช้ skill comphone-session-audit เพื่ออัปเดต session.md"` | Audit + อัปเดต context |
| `"ใช้ skill comphone-handover เพื่อเตรียมย้ายห้องแชทใหม่"` | สร้าง ZIP + Start Prompt |
| `"ตรวจสอบ GAS status และรายงานผล"` | เรียก systemStatus + getDashboardData |
| `"อัปเดต session.md"` | Refresh session context ให้เป็นปัจจุบัน |

---

## 🧩 Rules for Next AI

1. **อ่าน session.md นี้ก่อนทุกครั้ง** — ห้ามเดาสถานะโปรเจค
2. **ตรวจสอบ GitHub ก่อนเขียนโค้ดใหม่** — อาจมีไฟล์ที่ implement แล้ว (23 ไฟล์ใน clasp-ready/)
3. **API Contract ต้องสอดคล้อง** — action names ต้องตรงกับ Router.gs เสมอ
4. **ห้าม hardcode** API Key หรือ URL — ใช้ Script Properties เสมอ
5. **GAS ไม่มี `require()`** — ทุก function ต้องอยู่ใน global scope
6. **PWA ใช้ SPA pattern** — ซ่อน/แสดง `<div id="section-xxx">` ด้วย JS ไม่ใช่ navigate
7. **State Machine** — เปลี่ยนสถานะงานต้องผ่าน `transitionJob` ใน `JobStateMachine.gs` เท่านั้น
8. **Auth Guard** — Action ใหม่ทุกตัวต้องเพิ่มใน `AUTH_REQUIRED_ACTIONS_` ใน `Router.gs`
9. **Naming Convention** — ดูตาราง Naming Convention ด้านบนเสมอ
10. **อัปเดต session.md** — ก่อนปิดห้องแชททุกครั้ง
11. **Triple Backup หลังอัปเดต session.md ทุกครั้ง** — Google Drive + Local + GitHub ห้ามขาดแม้แต่ที่เดียว
12. **ใช้ `triple_backup.py`** — รัน script เดียวจบ อย่า backup ทีละที่

---

## ▶️ Start Command (สำหรับห้องแชทใหม่)

คัดลอกข้อความนี้เป็นข้อความแรกในห้องใหม่ พร้อมแนบไฟล์ `session.md` นี้:

```
คุณคือ Senior AI System Architect สำหรับโปรเจค COMPHONE SUPER APP V5.5

อ่าน session.md ที่แนบมานี้ให้ครบก่อน แล้วยืนยันว่าเข้าใจโปรเจคแล้วโดยสรุป:
1. สถานะปัจจุบันของระบบ
2. Pending Tasks ที่ต้องทำต่อ
3. สิ่งที่ต้องการให้ทำในเซสชันนี้

จากนั้นรอคำสั่งจากฉัน
```
