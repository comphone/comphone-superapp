# 🧠 Session Context — COMPHONE SUPER APP V5.5

> **เวอร์ชัน:** v5.5.5 | **อัปเดตล่าสุด:** 18 เมษายน 2569 | **สถานะ:** Phase 1 + Phase 2 + Phase 3 (บางส่วน) เสร็จสมบูรณ์

---

## 👤 User Context

| รายการ | ข้อมูล |
|--------|--------|
| ตัวตน / บทบาท | เจ้าของร้านซ่อมคอมพิวเตอร์ / มือถือ (Owner) + ทีมช่าง (Technicians) |
| ลักษณะการใช้งาน | Hybrid — Mobile PWA สำหรับช่างหน้างาน / PC Dashboard สำหรับ Admin/บัญชี |
| เป้าหมาย | บริหารจัดการงานซ่อม, สต็อก, CRM, การเงิน และการแจ้งเตือนผ่าน LINE ผ่าน GAS |
| ทีมงาน | ช่างโต้, ช่างเหม่ง, ช่างรุ่ง (ข้อมูลจริงจาก DBJOBS) |

---

## 🏢 Project Overview

| รายการ | ข้อมูล |
|--------|--------|
| ชื่อระบบ | COMPHONE SUPER APP V5.5 |
| ประเภท | ERP / POS / Job Management System |
| สถาปัตยกรรม | GAS Backend + PWA Single Page Application (SPA) |
| ฐานข้อมูล | Google Sheets (Spreadsheet: DBJOBS) |
| GitHub | https://github.com/comphone/comphone-superapp |
| GAS Script ID | `1-aoCd5gXoo1dX4FjW62l8JknR3ZPiaf1W7YEmEdtq8gnRzSp4Hwj6043` |
| GAS Web App URL | ตั้งค่าแล้วใน Script Properties (`WEB_APP_URL`) |
| Spreadsheet ID | `19fkLbSbBdz0EjAV8nE9LLwBiHeIN50BTPptt_PJCRGA` |
| สถานะ Live | ✅ Online — overall: OK (ตรวจสอบ 18 เม.ย. 2569 เวลา 17:26) |
| ข้อมูลจริง | 18 งาน (J0001–J0018) ใน DBJOBS |

---

## ⚙️ Tech Stack

| Layer | เทคโนโลยี | รายละเอียด |
|-------|-----------|-----------|
| Backend | Google Apps Script (GAS) V8 Runtime | doPost() → Router.gs → Modules |
| Frontend | PWA — HTML5 + Bootstrap 5.3 + Font Awesome 6 | SPA ซ่อน/แสดง `<div id="section-xxx">` |
| Database | Google Sheets | 13 sheets ครบ (ดู Data Structure) |
| Notification | LINE Messaging API + LINE Notify | Multi-channel, role-based routing (5 กลุ่ม) |
| AI | Gemini API (Flash) | Slip verification, Smart Assignment, Vision Analysis |
| Storage | Google Drive | รูปภาพงาน (ROOT_FOLDER_ID), PDF ใบเสร็จ |
| Charts | Chart.js | Dashboard KPI |
| Voice | Web Speech API | Voice Search (th-TH) |
| GPS | GpsPipeline.gs | Geofence + Route Optimization |

---

## 🌐 Environment / Config

### Script Properties ที่ตั้งค่าแล้วทั้งหมด

| Property | สถานะ |
|----------|-------|
| `DB_SS_ID` | ✅ `19fkLbSbBdz0EjAV8nE9LLwBiHeIN50BTPptt_PJCRGA` |
| `ROOT_FOLDER_ID` | ✅ ตั้งค่าแล้ว (Google Drive folder สำหรับรูปงาน) |
| `WEB_APP_URL` | ✅ ตั้งค่าแล้ว |
| `LINE_CHANNEL_ACCESS_TOKEN` | ✅ ตั้งค่าแล้ว |
| `GEMINI_API_KEY` | ✅ ตั้งค่าแล้ว |
| `LINE_GROUP_TECHNICIAN` | ✅ ตั้งค่าแล้ว |
| `LINE_GROUP_ACCOUNTING` | ✅ ตั้งค่าแล้ว |
| `LINE_GROUP_PROCUREMENT` | ✅ ตั้งค่าแล้ว |
| `LINE_GROUP_SALES` | ✅ ตั้งค่าแล้ว |
| `LINE_GROUP_EXECUTIVE` | ✅ ตั้งค่าแล้ว |

### Scheduled Triggers (Active — 6 ตัว)

| Function | ประเภท | หน้าที่ |
|----------|--------|---------|
| `sendAfterSalesAlerts` | CLOCK | แจ้งเตือน After Sales |
| `checkLowStockAlert` | CLOCK | แจ้งเตือนสต็อกต่ำ |
| `cronMorningAlert` | CLOCK | รายงานเช้า |
| `geminiReorderSuggestion` | CLOCK | AI แนะนำสั่งซื้อ |
| `autoBackup` | CLOCK | สำรองข้อมูลอัตโนมัติ |
| `getCRMSchedule` | CLOCK | CRM Follow-up |

---

## 🔑 API Keys / External Services

| Service | สถานะ | หมายเหตุ |
|---------|-------|---------|
| LINE Messaging API | ✅ Token ตั้งค่าแล้ว | **⚠️ ต้องตั้ง Webhook URL** ใน LINE Developers Console: `https://comphone-line-webhook.narinoutagit.workers.dev/line/webhook` |
| LINE Notify | ✅ ตั้งค่าแล้ว | 5 กลุ่ม (Tech/Acct/Procurement/Sales/Executive) |
| Gemini API (Flash) | ✅ ตั้งค่าแล้ว | Slip verification + Smart Assignment + Vision |
| Google Drive | ✅ ROOT_FOLDER_ID ตั้งค่าแล้ว | เก็บรูปงาน + PDF |
| PromptPay QR | ✅ Built-in GAS | สร้าง QR ผ่าน BillingManager.gs |

---

## 🔌 API Contract

**Endpoint:** `POST {WEB_APP_URL}` (Content-Type: application/json)

**Request Format:**
```json
{ "action": "actionName", "token": "session_token", ...params }
```

**Response Format:**
```json
{ "success": true/false, "data": {...}, "message": "..." }
```

### Actions ที่ implement แล้วใน Router.gs (ครบ)

| กลุ่ม | Actions |
|-------|---------|
| **Auth** | `loginUser`, `logoutUser`, `verifySession`, `listUsers`, `createUser`, `updateUserRole`, `setUserActive`, `setupUserSheet` |
| **Jobs** | `getJobs`, `getJobById`, `createJob`, `updateJob`, `updateJobStatus`, `deleteJob`, `addJobNote`, `getJobTimeline`, `assignTechnician` |
| **Inventory** | `getInventory`, `addInventoryItem`, `updateInventoryItem`, `deleteInventoryItem`, `transferStock`, `getStockMovements`, `barcodeLookup` |
| **Billing** | `createBill`, `getBills`, `updateBillStatus`, `generatePDF`, `verifySlip` |
| **Customer / CRM** | `getCustomers`, `createCustomer`, `updateCustomer`, `getCRMSchedule` |
| **Photo** | `uploadPhoto`, `getPhotos`, `processPhotoQueue`, `analyzePhoto` |
| **Purchase Order** | `createPO`, `getPOs`, `updatePOStatus`, `approvePO` |
| **Attendance** | `clockIn`, `clockOut`, `getAttendance` |
| **After Sales** | `createAfterSales`, `getAfterSales`, `updateAfterSales` |
| **Dashboard** | `getDashboardData`, `systemStatus` |
| **LINE** | LINE Webhook (auto-detect via `destination` + `events` array) |
| **Notification** | `sendNotify`, `sendLineMessage` |
| **Smart/AI** | `smartAssignment`, `gpsPipeline`, `geminiReorderSuggestion` |
| **Backup** | `autoBackup` |

---

## 📡 Backend Structure

```
clasp-ready/                    ← GAS Backend (23 ไฟล์)
├── .clasp.json                 ← scriptId: 1-aoCd5gXoo1dX4FjW62l8JknR3ZPiaf1W7YEmEdtq8gnRzSp4Hwj6043
├── appsscript.json             ← timezone: Asia/Bangkok, V8, ANYONE_ANONYMOUS
├── Router.gs                   ← Entry point — doPost(), dispatch, AUTH_REQUIRED_ACTIONS_
├── Config.gs                   ← Script Properties wrapper, constants
├── Auth.gs                     ← loginUser, verifySession, RBAC (4 roles)
├── JobsHandler.gs              ← Job CRUD + Timeline + Notes
├── JobStateMachine.gs          ← 12-state machine + transition validation
├── Inventory.gs                ← 3-layer stock (Warehouse/Shop/Van) + PO + Barcode
├── BillingManager.gs           ← Bill/Receipt + PromptPay QR + PDF + Slip Verify
├── CustomerManager.gs          ← CRM CRUD + Follow-up schedule
├── LineBot.gs                  ← LINE Webhook handler + command parser
├── FlexMessage.gs              ← 4 Flex Message templates
├── Notify.gs                   ← LINE Notify + Messaging API multi-channel
├── PhotoQueue.gs               ← Photo upload queue + Drive storage
├── VisionAnalysis.gs           ← Gemini Vision — slip verify + photo QC
├── GpsPipeline.gs              ← GPS geofence + route optimization
├── SmartAssignment.gs          ← AI-based tech assignment
├── Dashboard.gs                ← getDashboardData + KPI aggregation
├── DashboardV55.gs             ← V5.5 enhanced dashboard
├── Attendance.gs               ← Clock in/out + attendance report
├── AfterSales.gs               ← Warranty + after-sales follow-up
├── AutoBackup.gs               ← Scheduled backup to Drive
├── Setup.gs                    ← Initial setup + sheet creation
└── Utils.gs                    ← Shared utilities
```

---

## 🗄️ Data Structure

### Job States (12 ขั้นตอน — JobStateMachine.gs)

| Code | สถานะ | ความหมาย |
|------|-------|---------|
| 0 | รับงานใหม่ | เปิดงานแล้ว ยังไม่ประเมิน |
| 1 | รอมอบหมาย | ประเมินแล้ว รอมอบช่าง |
| 2 | มอบหมายแล้ว | มีช่างรับผิดชอบ |
| 3 | กำลังดำเนินการ | ช่างเริ่มทำงาน |
| 4 | รอชิ้นส่วน | รอสั่งซื้ออะไหล่ |
| 5 | รอลูกค้าอนุมัติ | รอลูกค้าตัดสินใจ |
| 6 | รอนัดหมาย | นัดวันเข้าหน้างาน |
| 7 | กำลังเดินทาง | ช่างออกหน้างาน |
| 8 | ทำงานหน้างาน | ช่างอยู่หน้างาน |
| 9 | เสร็จสิ้น รอตรวจ | งานเสร็จ รอ QC |
| 10 | รอชำระเงิน | ออกบิลแล้ว รอรับเงิน |
| 11 | ปิดงาน | ชำระเงินแล้ว ปิดงาน |
| 99 | ยกเลิก | งานถูกยกเลิก |

### สถานะงานจริง ณ 18 เม.ย. 2569

| สถานะ | จำนวน |
|-------|:---:|
| รอดำเนินการ | 6 |
| คงค้าง | 4 |
| รออนุมัติ | 2 |
| โทรนัดแล้ว | 2 |
| นัด (8.40น./9.00น.) | 2 |
| Completed | 1 |
| ยกเลิก | 1 |
| **รวม** | **18** |

### User Roles (RBAC — Auth.gs)

| Role | สิทธิ์ |
|------|-------|
| `owner` | ทุกอย่าง รวมถึงจัดการ User และดู Report ทั้งหมด |
| `admin` | จัดการงาน สต็อก บัญชี ยกเว้นจัดการ User |
| `tech` | ดูงานตัวเอง อัปเดตสถานะ อัปโหลดรูป |
| `acct` | ดูบิล สร้างใบเสร็จ รายงานการเงิน |

### Google Sheets (13 sheets)

| Sheet | Rows ปัจจุบัน | หน้าที่ |
|-------|:---:|---------|
| DBJOBS | **18** | งานซ่อมทั้งหมด |
| DB_INVENTORY | 1 | สินค้า/อะไหล่ (header เท่านั้น — ยังไม่มีข้อมูล) |
| DB_CUSTOMERS | 1 | ข้อมูลลูกค้า (header เท่านั้น) |
| DB_BILLING | 1 | บิล/ใบเสร็จ (header เท่านั้น) |
| DB_STOCK_MOVEMENTS | 0 | ประวัติการเคลื่อนไหวสต็อก |
| DB_JOB_ITEMS | 0 | อะไหล่ที่ใช้ต่องาน |
| DB_PHOTO_QUEUE | 0 | คิวรูปภาพรอประมวลผล |
| DB_PURCHASE_ORDERS | 0 | ใบสั่งซื้อ |
| DB_ATTENDANCE | 0 | การลงเวลา |
| DB_AFTER_SALES | 0 | After Sales / ประกัน |
| DB_JOB_LOGS | 0 | Log การเปลี่ยนสถานะ |
| DB_USERS | 1 | ผู้ใช้งานระบบ (header เท่านั้น) |
| DB_ACTIVITY_LOG | 5 | Activity audit log |

---

## 🔁 Workflow

### Job Lifecycle
```
เปิดงาน (0) → ประเมิน (1) → มอบหมายช่าง (2) → ดำเนินการ (3)
    ↓                                                    ↓
รอชิ้นส่วน (4) / รอลูกค้า (5) / นัดหมาย (6) / เดินทาง (7) / หน้างาน (8)
                                                         ↓
                                            เสร็จ รอตรวจ (9) → ออกบิล (10) → ปิดงาน (11)
```

### Photo Pipeline
```
ช่างถ่ายรูป → Upload Base64 → PhotoQueue.gs → GPS Geofence Check
→ VisionAnalysis.gs (Gemini) → QC Pass/Fail → Drive Storage → Lightbox Gallery (Job Detail Tab 3)
```

### Billing Flow
```
งานสถานะ 9 → สร้างบิล → QR PromptPay → ลูกค้าโอน → แนบสลิป
→ VisionAnalysis.gs verify slip → สถานะ 11 (ปิดงาน) → LINE แจ้งทีมบัญชี
```

### Notification Routing
```
Event → Notify.gs → LINE Group ตามบทบาท
  ├── งานใหม่/มอบหมาย → LINE_GROUP_TECHNICIAN
  ├── บิล/ชำระเงิน    → LINE_GROUP_ACCOUNTING
  ├── สั่งซื้อ         → LINE_GROUP_PROCUREMENT
  ├── ยอดขาย          → LINE_GROUP_SALES
  └── สรุปภาพรวม      → LINE_GROUP_EXECUTIVE
```

---

## 📂 File Structure

```
comphone-superapp/                  ← GitHub repo
├── clasp-ready/                    ← GAS Backend (23 ไฟล์ .gs)
│   ├── .clasp.json
│   ├── appsscript.json
│   └── [23 ไฟล์ .gs ตามรายการใน Backend Structure]
├── pwa/                            ← PWA Frontend
│   ├── index.html      (28,837 bytes) ← SPA shell + Modals
│   ├── app.js          (48,121 bytes) ← Core logic + Routing
│   ├── style.css       (24,721 bytes)
│   ├── auth.js                     ← Login / Session / RBAC
│   ├── job_workflow.js             ← Job CRUD + State Machine UI
│   ├── inventory.js                ← Inventory 3-layer UI
│   ├── billing_customer.js         ← Billing + QR PromptPay
│   ├── crm_attendance.js           ← CRM + Attendance UI
│   ├── purchase_order.js           ← PO Management UI
│   ├── dashboard.js                ← Chart.js + Live KPI
│   ├── dashboard_pc.html           ← PC Admin Dashboard
│   ├── sw.js                       ← Service Worker (PWA Install)
│   └── manifest.json               ← PWA manifest
└── docs/
    ├── MASTER_BLUEPRINT.md         ← Blueprint หลัก (v5.5.4, 17 เม.ย. 69)
    ├── PWA_ROADMAP.md              ← Roadmap Phase 1-4
    ├── DEV_MEMORY.md               ← Design decisions
    ├── COMPHONE_MEMORY_LOG.md      ← Development history
    └── CHANGELOG_V55_CLEANUP.md   ← Cleanup changelog
```

---

## 📌 Naming Convention

| รายการ | Convention | ตัวอย่าง |
|--------|-----------|---------|
| GAS Functions | camelCase | `getJobById`, `updateJobStatus` |
| GAS Private Functions | camelCase + trailing `_` | `parsePostPayloadV55_()`, `AUTH_REQUIRED_ACTIONS_` |
| JS Frontend Functions | camelCase | `renderJobCard()`, `callAPI()` |
| CSS Classes | kebab-case (Bootstrap-based) | `section-jobs`, `job-card`, `card-glass` |
| Sheet Names | UPPER_SNAKE_CASE | `DB_INVENTORY`, `DBJOBS` |
| Job IDs | J + 4 digits | `J0001`, `J0018` |
| API Actions | camelCase | `getDashboardData`, `loginUser` |
| GAS Files | PascalCase.gs | `JobStateMachine.gs`, `BillingManager.gs` |
| PWA Files | snake_case.js | `job_workflow.js`, `billing_customer.js` |

---

## ✅ งานที่เสร็จในเซสชันนี้ (18 เม.ย. 2569)

| ไฟล์ | ประเภท | หน้าที่ |
|------|--------|--------|
| `DataSeeding.gs` | GAS | Seed DB_USERS (6 users), DB_INVENTORY (20 items), DB_CUSTOMERS (จาก DBJOBS) |
| `billing_slip_verify.js` | PWA | Slip Upload + Gemini AI Verify + ปิดงาน |
| `after_sales_enhanced.js` | PWA | After Sales Dashboard + Follow-up Modal + Attendance Widget |
| `CustomerPortal.gs` | GAS | Public Job Status API (ไม่ต้อง Auth) |
| `customer_portal.html` | PWA | หน้า Public สำหรับลูกค้าตรวจสอบสถานะงาน |
| `Router_patch.gs` | GAS | Patch เพิ่ม case `getJobStatusPublic` |
| `LINE_WEBHOOK_SETUP.md` | Docs | คู่มือตั้งค่า LINE Webhook ทีละขั้นตอน |

---

## 🚧 Pending Tasks

### ⚠️ ด่วน (ต้องทำก่อน Deploy จริง)

- [ ] **ตั้งค่า LINE Webhook URL** ใน LINE Developers Console:
  `https://comphone-line-webhook.narinoutagit.workers.dev/line/webhook`
- [ ] **เพิ่มข้อมูล DB_INVENTORY** — ปัจจุบัน 0 rows ยังไม่มีสินค้าในระบบ
- [ ] **เพิ่มข้อมูล DB_CUSTOMERS** — ปัจจุบัน 0 rows (header เท่านั้น)
- [ ] **เพิ่มข้อมูล DB_USERS** — ปัจจุบัน 0 rows ต้องสร้าง user จริงก่อนใช้งาน
- [ ] **จัดการงานค้าง 16 งาน** — J0001–J0018 ส่วนใหญ่ค้างเกิน 11-16 วัน ไม่มีช่างรับผิดชอบ

### 🟡 Phase 3 — Customer Experience (ถัดไป)

- [ ] **Customer Portal** — หน้าสำหรับลูกค้าตรวจสอบสถานะงานเองโดยไม่ต้อง Login (เข้าผ่าน Job ID)
- [ ] **After Sales UI** — หน้าจัดการ Warranty / Follow-up ใน PWA (`AfterSales.gs` พร้อมแล้ว)
- [ ] **Attendance UI** — หน้าลงเวลาช่าง Clock In/Out (`Attendance.gs` พร้อมแล้ว)
- [ ] **Barcode Scanner UI** — เชื่อม `barcodeLookup` action กับ Camera API ใน PWA

### 🟢 Phase 4 — Advanced Features (ระยะยาว)

- [ ] **Kudos System** — ระบบให้ดาวช่าง / Performance Score
- [ ] **Warranty Management** — ระบบรับประกันสินค้า / งานซ่อม
- [ ] **P&L Report** — รายงานกำไร-ขาดทุนรายเดือน
- [ ] **Auto-Tax Engine** — คำนวณ VAT 7% / WHT 3% อัตโนมัติ
- [ ] **Multi-branch** — รองรับหลายสาขา
- [ ] **Offline Sync** — IndexedDB Queue สำหรับทำงานไม่มีเน็ต

### 🔧 Technical Debt

- [ ] `app.js` ใหญ่มาก (48KB) — ควร refactor แยกเป็น modules ย่อย
- [ ] ทดสอบ flow การเบิกอะไหล่ (DB_STOCK_MOVEMENTS + DB_JOB_ITEMS ยังไม่มีข้อมูล)
- [ ] ทดสอบ Smart Assignment + GPS Pipeline กับข้อมูลจริง
- [ ] ทดสอบ Photo Pipeline end-to-end (DB_PHOTO_QUEUE ยังว่างอยู่)

---

## 🧾 Reusable Prompts

| Prompt | ผลลัพธ์ |
|--------|---------|
| `/skill-creator` | Generate session.md ใหม่จาก conversation |
| `"อ่าน session.md และเริ่ม Phase 3: Customer Portal"` | เริ่มพัฒนา Customer Portal |
| `"อ่าน session.md และแก้ปัญหา [ระบุปัญหา]"` | Debug / Fix ปัญหาเฉพาะจุด |
| `"ตรวจสอบสถานะระบบ"` | เรียก systemStatus + getDashboardData |
| `"อัปเดต session.md"` | Refresh session context ให้เป็นปัจจุบัน |

---

## 🧩 Rules for Next AI

1. **อ่าน session.md นี้ก่อนทุกครั้ง** — ห้ามเดาสถานะโปรเจค
2. **ตรวจสอบ GitHub ก่อนเขียนโค้ดใหม่** — อาจมีไฟล์ที่ implement แล้ว (23 ไฟล์ใน clasp-ready/)
3. **API Contract ต้องสอดคล้อง** — action names ต้องตรงกับ Router.gs เสมอ
4. **ห้าม hardcode** API Key หรือ URL ใดๆ — ใช้ Script Properties เสมอ
5. **GAS ไม่มี `require()`** — ทุก function ต้องอยู่ใน global scope
6. **PWA ใช้ SPA pattern** — ซ่อน/แสดง `<div id="section-xxx">` ด้วย JS ไม่ใช่ navigate
7. **State Machine** — การเปลี่ยนสถานะงานต้องผ่าน `transitionJob` ใน `JobStateMachine.gs` เท่านั้น
8. **Auth Guard** — Action ใหม่ทุกตัวต้องเพิ่มใน `AUTH_REQUIRED_ACTIONS_` ใน `Router.gs`
9. **Naming Convention** — ดูตาราง Naming Convention ด้านบนเสมอ
10. **Blueprint ล่าสุดคือ MASTER_BLUEPRINT.md v5.5.4** — ไม่ใช่ session.md เวอร์ชันเก่า

---

## ▶️ Start Command

```
"อ่าน session.md (v5.5.4) และเริ่ม Phase 3: Customer Portal"
```

หรือระบุงานที่ต้องการ:
```
"อ่าน session.md และแก้ปัญหา [ระบุปัญหา]"
```
