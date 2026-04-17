# COMPHONE SUPER APP V5.5 — MASTER BLUEPRINT

> **Single Source of Truth** | อัปเดตล่าสุด: 17 เมษายน 2026 | Version: 5.5.3 | GAS Deploy: @439

เอกสารนี้รวบรวมข้อมูลทั้งหมดของระบบ COMPHONE SUPER APP ตั้งแต่ API Keys, URLs, สถาปัตยกรรม, ฟีเจอร์ที่พัฒนาแล้ว และแผนงานในอนาคต เพื่อให้ AI Model หรือนักพัฒนาสามารถทำงานต่อได้ทันที

---

## 1. สถาปัตยกรรมระบบ (System Architecture)

```
┌─────────────────────────────────────────────────────────┐
│                    USER INTERFACES                       │
│  PWA (GitHub Pages)  │  LINE Bot  │  LINE Groups (5)    │
└──────────┬───────────┴─────┬──────┴──────────┬──────────┘
           │                 │                  │
           ▼                 ▼                  │
┌──────────────────┐  ┌──────────────────┐     │
│  GAS Web App     │  │ Cloudflare Worker│◄────┘
│  @439 (หลัก)     │◄─│ LINE Webhook     │
│  REST API        │  │ Proxy (async)    │
└────────┬─────────┘  └──────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────┐
│               Google Workspace                           │
│  Sheets (DB 13 tables)  │  Drive (Files/PDF)  │  Gemini  │
└──────────────────────────────────────────────────────────┘
```

---

## 2. URLs และ Endpoints สำคัญ

| รายการ | URL |
|--------|-----|
| **GAS Web App (หลัก @439)** | `https://script.google.com/macros/s/AKfycby-IRTHbHMfCZ8TiXSAJ8zr_T6xQcmJNvGNYYI2X2VoAEMPwYtHwlCp1mf9f6IzWSSJfQ/exec` |
| **GAS Web App (@438)** | `https://script.google.com/macros/s/AKfycbw87FkEDeoaxQ6mziojRA0HJKUUNGotFlEPGc95UgbbcSrGgjo-TqoxH8D9HUYlMO0V0Q/exec` |
| **GAS Web App (@437)** | `https://script.google.com/macros/s/AKfycbye7oTIj-cQjMtSm5CZBJ81mkOHO7GZm9iKFUjcSFBM_DgSsDZXr919Y8D-WezT2jBEUA/exec` |
| **LINE Webhook (Cloudflare Worker)** | `https://comphone-line-webhook.narinoutagit.workers.dev/line/webhook` |
| **PWA App** | `https://comphone.github.io/comphone-superapp/pwa/` |
| **GitHub Repository** | `https://github.com/comphone/comphone-superapp` |
| **Google Sheets Database** | `https://docs.google.com/spreadsheets/d/19fkLbSbBdz0EjAV8nE9LLwBiHeIN50BTPptt_PJCRGA` |
| **Google Drive Root Folder** | `https://drive.google.com/drive/folders/1YRZRG9r1Y_jMHg2XFFKYjK4Hx-sW0Eq0` |
| **LINE Developers Console** | `https://developers.line.biz/console/` |
| **Cloudflare Dashboard** | `https://dash.cloudflare.com/838d6a5a046bfaa2a2003bd8005dd80b` |

---

## 3. Script Properties (GAS Environment Variables)

> ตั้งค่าผ่าน: `POST {"action": "setScriptProperties", "properties": {...}}` ไปที่ GAS URL @439

| Property Key | ค่า | สถานะ |
|-------------|-----|-------|
| `DB_SS_ID` | `19fkLbSbBdz0EjAV8nE9LLwBiHeIN50BTPptt_PJCRGA` | ✅ ตั้งค่าแล้ว |
| `ROOT_FOLDER_ID` | `1YRZRG9r1Y_jMHg2XFFKYjK4Hx-sW0Eq0` | ✅ ตั้งค่าแล้ว |
| `WEB_APP_URL` | GAS @437 URL (ควรอัปเดตเป็น @439) | ⚠️ ล้าสมัย |
| `LINE_CHANNEL_ACCESS_TOKEN` | (ไม่แสดงเพื่อความปลอดภัย) | ✅ ตั้งค่าแล้ว |
| `GEMINI_API_KEY` | `AQ.Ab8R***...***OTgQ` (ดูใน Google AI Studio) | ✅ ตั้งค่าแล้ว |
| `LINE_GROUP_TECHNICIAN` | `C8ad22a115f38c9ad3cb5ea5c2ff4863b` | ✅ ตั้งค่าแล้ว |
| `LINE_GROUP_ACCOUNTING` | `C7b939d1d367e6b854690e58b392e88cc` | ✅ ตั้งค่าแล้ว |
| `LINE_GROUP_PROCUREMENT` | `Cfd103d59e77acf00e2f2f801d391c566` | ✅ ตั้งค่าแล้ว |
| `LINE_GROUP_SALES` | `Cb7cc146227212f70e4f171ef3f2bce15` | ✅ ตั้งค่าแล้ว |
| `LINE_GROUP_EXECUTIVE` | `Cb85204740fa90e38de63c727554e551a` | ✅ ตั้งค่าแล้ว |

---

## 4. Cloudflare Configuration

| รายการ | ค่า |
|--------|-----|
| **Account ID** | `838d6a5a046bfaa2a2003bd8005dd80b` |
| **Account Name** | narinoutagit's Account |
| **Worker Name** | `comphone-line-webhook` |
| **Worker URL** | `https://comphone-line-webhook.narinoutagit.workers.dev` |
| **Worker Version ID** | `e9cce19a-8343-449a-b258-05d42ad28de3` |
| **API Token Name** | `comphone-worker-deploy` |
| **API Token** | `cfut_Dt***...***40b5843` (ดูใน Cloudflare Dashboard) |
| **Zone / Domain** | `comphones101.win` |
| **Worker Source** | `/home/ubuntu/comphone-line-webhook/src/index.js` |
| **Deploy Command** | `cd /home/ubuntu/comphone-line-webhook && wrangler deploy` |

### Worker Flow
```
LINE Platform → POST /line/webhook
→ Cloudflare Worker (ตอบ 200 OK ทันที <50ms)
→ ctx.waitUntil(fetch(GAS_URL @439)) [async, ไม่รอผล]
→ GAS ประมวลผล LINE events
```

---

## 5. GAS Script IDs

| รายการ | ID |
|--------|-----|
| **GAS Script ID** | `1-aoCd5gXoo1dX4FjW62l8JknR3ZPiaf1W7YEmEdtq8gnRzSp4Hwj6043` |
| **Deploy @439 (หลัก)** | `AKfycby-IRTHbHMfCZ8TiXSAJ8zr_T6xQcmJNvGNYYI2X2VoAEMPwYtHwlCp1mf9f6IzWSSJfQ` |
| **Deploy @438** | `AKfycbw87FkEDeoaxQ6mziojRA0HJKUUNGotFlEPGc95UgbbcSrGgjo-TqoxH8D9HUYlMO0V0Q` |
| **Deploy @437** | `AKfycbye7oTIj-cQjMtSm5CZBJ81mkOHO7GZm9iKFUjcSFBM_DgSsDZXr919Y8D-WezT2jBEUA` |

---

## 6. Default Login

| Field | ค่า |
|-------|-----|
| **Username** | `admin` |
| **Password** | `admin1234` |
| **Role** | OWNER |

---

## 7. GAS Files (clasp-ready/)

| ไฟล์ | หน้าที่ | Version |
|------|---------|---------|
| `Router.gs` | HTTP Router (doGet/doPost), routing ทุก action | v5.5.3 |
| `Config.gs` | Script Properties, REQUIRED_PROPERTIES, setScriptPropertiesFromPayload | v5.5.3 |
| `JobManager.gs` | จัดการงานซ่อม (CRUD, status, assign) | v5.5+ |
| `InventoryManager.gs` | สต็อกสินค้า, barcode lookup, stock movement | v5.5+ |
| `BillingManager.gs` | ใบเสร็จ, PDF generation, PromptPay QR Code | v5.5.3 |
| `CustomerManager.gs` | CRM, ข้อมูลลูกค้า, ประวัติ | v5.5+ |
| `LineBot.gs` | LINE Bot webhook, commands (/groupid /status /help) | v5.5.3 |
| `FlexMessage.gs` | LINE Flex Message templates | **NEW v5.5.3** |
| `NotifyManager.gs` | ส่ง LINE notifications ไปกลุ่มต่างๆ | v5.5+ |
| `GeminiAI.gs` | Gemini AI integration, reorder suggestions | v5.5+ |
| `AttendanceManager.gs` | ระบบลงเวลาช่าง (clock in/out) | v5.5+ |
| `AfterSalesManager.gs` | After-sales follow-up, CRM schedule | v5.5+ |
| `PurchaseOrderManager.gs` | ใบสั่งซื้อ, Purchase Orders | v5.5+ |
| `DeployGuide.gs` | คู่มือ deploy, initSystem() | v5.5+ |
| `Utils.gs` | Utility functions, date/time helpers | v5.5+ |
| `ReceiptTemplate.html` | HTML template สำหรับ PDF ใบเสร็จ | **NEW v5.5.3** |

---

## 8. GAS API Endpoints

### System Actions
| Action | หมายเหตุ |
|--------|---------|
| `systemStatus` | ตรวจสอบสถานะระบบทั้งหมด (DB, Triggers, Config) |
| `getDashboardData` | ข้อมูล Dashboard (token required) |
| `getComphoneConfig` | ค่า config ทั้งหมด |
| `validateConfig` | ตรวจสอบ config ครบไหม |
| `initSystem` | สร้าง Sheets 13 ตาราง + Triggers 6 ตัว (confirm: true) |
| `setScriptProperties` | ตั้งค่า Script Properties (properties: {...}) |

### Auth Actions
| Action | หมายเหตุ |
|--------|---------|
| `loginUser` | Login, return token (username, password) |
| `logoutUser` | Logout (token) |

### Job Actions
| Action | หมายเหตุ |
|--------|---------|
| `getJobs` | รายการงาน (token, status?) |
| `getJobById` | ดูงานตาม ID (token, jobId) |
| `createJob` | สร้างงานใหม่ (token, ...jobData) |
| `updateJobStatus` | อัปเดตสถานะ (token, jobId, status) |
| `assignTechnician` | มอบหมายช่าง (token, jobId, techId) |
| `completeJob` | ปิดงาน (token, jobId) |

### Inventory Actions
| Action | หมายเหตุ |
|--------|---------|
| `getInventory` | รายการสต็อก (token) |
| `addInventoryItem` | เพิ่มสินค้า (token, ...itemData) |
| `updateInventory` | อัปเดตจำนวน (token, itemId, qty) |
| `barcodeLookup` | ค้นหาด้วย barcode |
| `getLowStockItems` | สินค้าใกล้หมด (token) |

### Customer Actions
| Action | หมายเหตุ |
|--------|---------|
| `listCustomers` | รายชื่อลูกค้า (token, filter?) |
| `createCustomer` | เพิ่มลูกค้าใหม่ (token, ...customerData) |
| `getCustomerById` | ดูลูกค้าตาม ID (token, customerId) |
| `updateCustomer` | แก้ไขข้อมูลลูกค้า (token, customerId, ...data) |

### Billing Actions
| Action | หมายเหตุ |
|--------|---------|
| `getBillingByJob` | ดูใบเสร็จตามงาน (token, jobId) |
| `createBilling` | สร้างใบเสร็จ (token, ...billingData) |
| `generateReceiptPDF` | สร้าง PDF ใบเสร็จ (token, billingId) |
| `getDailySummary` | สรุปรายรับประจำวัน (token, date?) |

### Attendance Actions
| Action | หมายเหตุ |
|--------|---------|
| `clockIn` | เช็คอิน (token, userId?) |
| `clockOut` | เช็คเอาท์ (token, userId?) |
| `getAttendanceToday` | การเข้างานวันนี้ (token) |
| `getWeeklyAttendance` | สรุปรายสัปดาห์ (token, userId?) |

### After-Sales Actions
| Action | หมายเหตุ |
|--------|---------|
| `getAfterSalesDue` | รายการที่ต้องติดตาม (token) |
| `logAfterSalesFollowUp` | บันทึกการติดตาม (token, jobId, note, nextDate?) |

---

## 9. Database Schema (Google Sheets — 13 ตาราง)

| Sheet | Columns หลัก |
|-------|-------------|
| `DBJOBS` | JOB_ID, DATE, CUSTOMER_NAME, PHONE, DEVICE, PROBLEM, STATUS, TECHNICIAN, PRICE, DEPOSIT |
| `DB_INVENTORY` | ITEM_ID, BARCODE, NAME, CATEGORY, QTY, MIN_QTY, COST, PRICE, LOCATION |
| `DB_CUSTOMERS` | CUSTOMER_ID, NAME, PHONE, EMAIL, ADDRESS, TYPE, TOTAL_JOBS, TOTAL_SPENT, LAST_VISIT |
| `DB_BILLING` | BILLING_ID, JOB_ID, DATE, ITEMS, SUBTOTAL, DISCOUNT, TAX, TOTAL, PAYMENT_METHOD, PDF_URL |
| `DB_STOCK_MOVEMENTS` | MOVE_ID, DATE, ITEM_ID, TYPE, QTY, REASON, USER |
| `DB_JOB_ITEMS` | ITEM_ID, JOB_ID, PART_ID, PART_NAME, QTY, UNIT_PRICE, TOTAL |
| `DB_PURCHASE_ORDERS` | PO_ID, DATE, SUPPLIER, ITEMS, TOTAL, STATUS, RECEIVED_DATE |
| `DB_ATTENDANCE` | ATT_ID, DATE, USER_ID, NAME, CLOCK_IN, CLOCK_OUT, HOURS, NOTE |
| `DB_AFTER_SALES` | AS_ID, JOB_ID, CUSTOMER, PHONE, DEVICE, LAST_CONTACT, NEXT_CONTACT, STATUS, NOTE |
| `DB_JOB_LOGS` | LOG_ID, JOB_ID, DATE, ACTION, USER, NOTE |
| `DB_USERS` | USER_ID, USERNAME, PASSWORD_HASH, NAME, ROLE, LINE_USER_ID, ACTIVE |
| `DB_ACTIVITY_LOG` | LOG_ID, TIMESTAMP, USER, ACTION, DETAILS, IP |
| `DB_PHOTO_QUEUE` | QUEUE_ID, JOB_ID, PHOTO_URL, STATUS, UPLOADED_AT |

---

## 10. Triggers (Scheduled Tasks — 6 ตัว)

| Function | Schedule | หน้าที่ |
|----------|----------|---------|
| `sendAfterSalesAlerts` | ทุกวัน 09:00 | แจ้งเตือน After-Sales ที่ต้องติดตาม |
| `checkLowStockAlert` | ทุกวัน 08:00 | ตรวจสอบสต็อกต่ำ แจ้ง LINE กลุ่มจัดซื้อ |
| `cronMorningAlert` | ทุกวัน 07:30 | สรุปงานประจำวัน ส่ง LINE กลุ่มช่าง |
| `geminiReorderSuggestion` | ทุกสัปดาห์ | AI วิเคราะห์แนะนำสั่งซื้อสต็อก |
| `autoBackup` | ทุกวัน 02:00 | สำรองข้อมูล Google Sheets |
| `getCRMSchedule` | ทุกวัน 09:30 | ดึงนัดหมาย CRM ประจำวัน |

---

## 11. LINE Bot Commands

| Command | หน้าที่ |
|---------|---------|
| `/groupid` | แสดง Group ID ของกลุ่มนั้น (ใช้ตอนตั้งค่า) |
| `/status` | สรุปสถานะงานวันนี้ |
| `/stock` | รายการสต็อกต่ำ |
| `/help` | แสดงคำสั่งทั้งหมด |

---

## 12. LINE Flex Message Templates

| Function | ใช้เมื่อ | ส่งไปกลุ่ม |
|----------|---------|-----------|
| `createJobFlexMessage(jobData)` | สร้างงานใหม่ | TECHNICIAN |
| `createReceiptFlexMessage(billingData)` | สร้างใบเสร็จ | ACCOUNTING |
| `createDailySummaryFlex(summaryData)` | cronMorningAlert | EXECUTIVE |
| `createLowStockFlex(items)` | สต็อกต่ำกว่า min_qty | PROCUREMENT |

---

## 13. PWA Pages และ Features

| หน้า | Section ID | Features |
|------|-----------|---------|
| **Dashboard** | `section-dashboard` | KPI Cards, งานค้าง, รายรับวันนี้, สต็อกต่ำ |
| **งาน (Jobs)** | `section-jobs` | รายการงาน, สร้างงาน, อัปเดตสถานะ, มอบหมายช่าง |
| **สต็อก (Inventory)** | `section-inventory` | รายการสินค้า, สแกน Barcode, เพิ่ม/ลดสต็อก |
| **ลูกค้า (CRM)** | `section-customers` | รายชื่อลูกค้า, Filter, เพิ่มลูกค้า, ประวัติ |
| **เวลาทำงาน** | `section-attendance` | เช็คอิน/เอาท์, ประวัติรายสัปดาห์ |
| **ใบเสร็จ (Billing)** | `section-billing` | สร้างใบเสร็จ, PDF, PromptPay QR |
| **ตั้งค่า (Setup)** | `section-setup` | ตั้งค่า GAS URL, Login |

---

## 14. PWA Files

| ไฟล์ | หน้าที่ | Version |
|------|---------|---------|
| `pwa/index.html` | Main HTML — ทุกหน้า, modals | v5.5.3 |
| `pwa/app.js` | Main JS — navigation, API calls, UI | v5.5.3 |
| `pwa/crm_attendance.js` | CRM + Attendance functions | **NEW v5.5.3** |
| `pwa/style.css` | Custom CSS | v5.5+ |
| `pwa/manifest.json` | PWA manifest | v5.5+ |
| `pwa/sw.js` | Service Worker (offline cache) | v5.5+ |

---

## 15. Deployment History

| Version | Date | GAS Deploy | Description |
|---------|------|-----------|-------------|
| v5.5.0 | 2026-04-07 | @436 | Initial deploy |
| v5.5.1 | 2026-04-17 | @437 | initSystem, Triggers, Config |
| v5.5.2 | 2026-04-17 | @438 | setScriptProperties API, LINE Group ID detection |
| **v5.5.3** | **2026-04-17** | **@439** | FlexMessage.gs, CRM UI, Attendance, PDF Receipt, Cloudflare Worker |

---

## 16. ฟีเจอร์ที่พัฒนาแล้ว ✅

- [x] ระบบงานซ่อม (Job Management) — CRUD, Status 12 ขั้นตอน, Assign Technician
- [x] ระบบสต็อก (Inventory) — CRUD, Barcode Scanner, Stock Movement
- [x] ระบบลูกค้า (CRM) — CRUD, Filter, ประวัติ, After-Sales
- [x] ระบบใบเสร็จ (Billing) — PDF Generation, PromptPay QR Code
- [x] ระบบลงเวลา (Attendance) — Clock In/Out, Weekly Summary
- [x] After-Sales Follow-up — Due List, Log Follow-up
- [x] LINE Bot — Webhook, Commands, Flex Message (4 templates)
- [x] LINE Group Notifications — 5 กลุ่ม (ช่าง/บัญชี/จัดซื้อ/เซลส์/ผู้บริหาร)
- [x] Gemini AI — Reorder Suggestions (Free Tier)
- [x] Scheduled Alerts — Morning, Low Stock, After-Sales, CRM
- [x] Auto Backup — Daily Google Sheets backup
- [x] Cloudflare Worker — Fast LINE webhook proxy (async forward)
- [x] PWA — Mobile-first, Offline-capable, Install to Home Screen
- [x] initSystem() — สร้าง Sheets 13 ตาราง + Triggers 6 ตัวอัตโนมัติ

---

## 17. ฟีเจอร์ที่ยังไม่ได้พัฒนา 🔲

- [ ] **Purchase Order UI** — หน้าสร้างใบสั่งซื้อใน PWA (Backend มีแล้ว)
- [ ] **Executive Dashboard** — กราฟ KPI, รายงานกำไร-ขาดทุน
- [ ] **Slip Verification** — ตรวจสอบสลิปโอนเงินอัตโนมัติ
- [ ] **LINE Bot Deep Link** — กดปุ่มใน Flex Message แล้วเปิด PWA ตรงหน้างาน
- [ ] **Photo Upload** — รูปภาพงานซ่อม Before/After
- [ ] **Customer Portal** — ลูกค้าตรวจสอบสถานะงานเอง (ไม่ต้อง Login)
- [ ] **Multi-branch** — รองรับหลายสาขา
- [ ] **Warranty Management** — ระบบรับประกัน
- [ ] **Auto-Tax Engine** — คำนวณ VAT 7% และ WHT 3% อัตโนมัติ
- [ ] **Kudos System** — ระบบให้ดาวช่าง

---

## 18. Repository Structure

```
comphone-superapp/
├── clasp-ready/              # Google Apps Script source
│   ├── .clasp.json           # clasp config (Script ID)
│   ├── Router.gs             # HTTP Router
│   ├── Config.gs             # Configuration
│   ├── JobManager.gs         # Job management
│   ├── InventoryManager.gs   # Inventory
│   ├── BillingManager.gs     # Billing + PDF
│   ├── CustomerManager.gs    # CRM
│   ├── LineBot.gs            # LINE Bot handler
│   ├── FlexMessage.gs        # Flex Message templates [NEW]
│   ├── NotifyManager.gs      # LINE notifications
│   ├── GeminiAI.gs           # Gemini AI
│   ├── AttendanceManager.gs  # Attendance
│   ├── AfterSalesManager.gs  # After-sales
│   ├── PurchaseOrderManager.gs # Purchase orders
│   ├── DeployGuide.gs        # Deploy guide + initSystem
│   ├── Utils.gs              # Utilities
│   └── ReceiptTemplate.html  # PDF receipt template [NEW]
├── pwa/                      # Progressive Web App
│   ├── index.html            # Main HTML
│   ├── app.js                # Main JavaScript
│   ├── crm_attendance.js     # CRM + Attendance JS [NEW]
│   ├── style.css             # Styles
│   ├── manifest.json         # PWA manifest
│   └── sw.js                 # Service Worker
├── docs/
│   └── MASTER_BLUEPRINT.md   # This file
└── (comphone-line-webhook/)  # Cloudflare Worker (local only)
    ├── src/index.js
    └── wrangler.toml
```

---

## 19. Development Tools & Commands

### clasp (GAS Deploy)
```bash
# Push โค้ดขึ้น GAS
python3.11 /home/ubuntu/refresh_clasp_push.py

# หรือ manual
cd /home/ubuntu/github-clone/clasp-ready
clasp push
clasp deploy --description "v5.5.x"
```

### Cloudflare Worker Deploy
```bash
cd /home/ubuntu/comphone-line-webhook
wrangler deploy
```

### GitHub Push
```bash
cd /home/ubuntu/github-clone
git add -A
git commit -m "feat: description"
git push origin main
```

### ตั้งค่า Script Properties
```bash
python3.11 /home/ubuntu/set_line_groups.py
python3.11 /home/ubuntu/set_gemini_key.py
```

---

## 20. Action Items (สิ่งที่ต้องทำ)

### ด่วน (ทำทันที)
- [ ] อัปเดต `WEB_APP_URL` ใน Script Properties ให้ชี้ไป @439 (ปัจจุบันยังเป็น @437)
- [ ] ตั้งค่า LINE Webhook URL ใน LINE Developers Console เป็น:
  `https://comphone-line-webhook.narinoutagit.workers.dev/line/webhook`

### ถัดไป
- [ ] พัฒนา Purchase Order UI ใน PWA
- [ ] พัฒนา Executive Dashboard พร้อมกราฟ
- [ ] เพิ่ม LINE Bot Deep Link ใน Flex Messages

---

*Blueprint นี้สร้างโดย Manus AI | อัปเดตทุกครั้งที่มีการ deploy ใหม่*
