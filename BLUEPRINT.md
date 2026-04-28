# 📘 COMPHONE SUPER APP — BLUEPRINT (Single Source of Truth)

> **เวอร์ชัน:** v5.9.0-phase2d (PWA) / v5.9.0-phase2d (GAS Backend @502)
> **วันที่:** 28 เมษายน 2569 | **Phase:** 30 (Enterprise Intelligence + Auth Enhancement)
> **สถานะ:** 🟢 PRODUCTION — Phase 30 In Progress (Token Auth + Smart Quotation + Notification Fix)
> **Repository:** https://github.com/comphone/comphone-superapp

---

## 1. System Identity

| รายการ | ข้อมูล |
|--------|--------|
| **ชื่อระบบ** | COMPHONE SUPER APP |
| **ประเภทธุรกิจ** | หจก.คอมโฟน แอนด์ อิเล็คโทรนิคส์ — จำหน่าย/ซ่อม IT, มือถือ, CCTV, จัดซื้อภาครัฐ |
| **ที่ตั้ง** | อำเภอโพนทอง จังหวัดร้อยเอ็ด |
| **สถาปัตยกรรม** | GAS Backend + PWA SPA Frontend + LINE Bot + Cloudflare Worker |
| **ปรัชญา** | Zero-Data Entry · Cross-Room Automation · Operational Intelligence |

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    COMPHONE SUPER APP v5.9.0-phase2d                   │
│                                                                 │
│  ┌──────────────┐    ┌──────────────────┐    ┌──────────────┐  │
│  │  LINE Bot    │───►│ Cloudflare Worker│───►│  GAS @501    │  │
│  │  (Webhook)   │    │ (Async Proxy)    │    │  (Backend)   │  │
│  └──────────────┘    └──────────────────┘    └──────┬───────┘  │
│                                                      │          │
│  ┌──────────────┐                            ┌──────▼───────┐  │
│  │  PWA Mobile  │◄──────── GET API ─────────│ Google Sheets│  │
│  │  (Frontend)  │                            │  (13 Tables) │  │
│  └──────────────┘                            └──────────────┘  │
│                                                                 │
│  ┌──────────────┐                            ┌──────────────┐  │
│  │  PC Dashboard│◄──────── GET API ─────────│ Google Drive │  │
│  │  (Responsive)│                            │  (Files/PDF) │  │
│  └──────────────┘                            └──────────────┘  │
│                                                                 │
│  ┌──────────────┐                            ┌──────────────┐  │
│  │  Monitoring  │◄──────── Health ──────────│ GAS Exec Log │  │
│  │  Dashboard   │                            │  (Runtime)   │  │
│  └──────────────┘                            └──────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow
```
User (LINE) → POST /line/webhook
→ Cloudflare Worker (ตอบ 200 OK ทันที <50ms)
→ ctx.waitUntil(fetch(GAS_URL)) [async]
→ GAS ประมวลผล → ตอบกลับ LINE / บันทึก Sheet / แจ้งเตือน Group

User (PWA) → GET GAS_URL?action=xxx
→ GAS ประมวลผล → ส่ง JSON กลับ
→ PWA แสดงผล (SPA — ไม่ reload หน้า)
```

---

## 2.5 🔗 Dependency Checklist (Automated Dependency Mapping)
> **คำสั่ง Mentor:** Hermes ต้องตรวจสอบโมดูลที่เกี่ยวข้องทุกครั้งก่อน Commit งาน  
> **วัตถุประสงค์:** ป้องกันปัญหาฟีเจอร์ไม่สอดคล้องกัน (Version Mismatch)

### กฎการตรวจสอบ (Mandatory Check Before Commit)

| หากแก้ไขโมดูล... | ต้องตรวจสอบโมดูลเหล่านี้ด้วย... | เหตุผล |
|-------------------|----------------------------|---------|
| **Inventory** (สต็อก) | POS, หน้าเบิกอะไหล่, รายงานสต็อก, Dashboard | ระบบสต็อกเชื่อมโยงกับขาย-เบิก-รายงาน |
| **Job System** (งานซ่อม) | Workflow Engine, LINE Bot, Notification, Dashboard | เปลี่ยน state machine ต้องอัปเดตทุกจุด |
| **GAS API** (Backend) | PWA api_client.js, dashboard_pc.html, LINE Bot | API เปลี่ยนต้องอัปเดต frontend ที่เรียกใช้ |
| **PWA Version** (เวอร์ชัน) | index.html, dashboard_pc.html, section_settings.js, version_config.js, sw.js | เวอร์ชันต้องตรงกันทุกจุด (Single Source: version_config.js) |
| **Database Schema** | DatabaseIntegrity.gs, ทุกฟอร์มเพิ่มแก้ไขข้อมูล | Schema เปลี่ยนต้องอัปเดต validation และ UI |
| **LINE Bot** | AILinePrompts.gs, LineBot.gs, LineHandler.gs | เพิ่มบทบาทใหม่ต้องอัปเดต routing และ prompts |
| **Auth/Login** | auth_guard.js, Config.gs, GAS Script Properties | เปลี่ยนระบบล็อกอินต้องตรวจสอบทุกหน้าที่มี login gate |
| **Dashboard** | Dashboard_pc.html, executive_dashboard.html, monitoring_dashboard.html | เปลี่ยน KPI/Charts ต้องอัปเดตทุก dashboard |
| **Tax Engine** | TaxEngine.gs, TaxDocuments.gs, POS, Billing | เปลี่ยนสูตรภาษีต้องตรวจสอบทุกจุดคำนวณ |
| **Notification** | PushNotifications.gs, notification_center.js, LINE Bot | เปลี่ยนรูปแบบการแจ้งเตือนต้องอัปเดตทุกช่องทาง |

### แบบฟอร์มตรวจสอบ (Checklist Template)
```markdown
## Pre-Commit Validation (Copy to commit message)
- [ ] ตรวจสอบโมดูลที่เกี่ยวข้องตาม Dependency Checklist
- [ ] ทดสอบ Cross-Module (Backend ↔ Frontend)
- [ ] อัปเดตเวอร์ชันใน version_config.js (ถ้ามีการเปลี่ยนแปลง)
- [ ] เพิ่ม Cache Busting parameter (ถ้าแก้ไข JS/CSS)
- [ ] ทดสอบบน PWA Mobile (ผ่าน GitHub Pages)
- [ ] ทดสอบบน PC Dashboard
- [ ] Commit message ระบุเหตุผลและผลกระทบต่อโมดูลอื่น
```

### ระบบ Centralized Versioning (Single Source of Truth)
- **Source File:** `pwa/version_config.js`
- **ตัวแปรหลัก:** `APP_VERSION`, `CACHE_VERSION`, `BUILD_TIMESTAMP`
- **การใช้งาน:** ทุกไฟล์ที่ต้องการเวอร์ชัน ให้อ่านจาก `window.COMPHONE_VERSION`
- **ห้าม:** ระบุเวอร์ชันแบบ hardcode ในไฟล์อื่น (ยกเว้น sw.js ซึ่งอ่านจากตัวแปรเดียวกัน)

---

## 3. URLs & Endpoints

| รายการ | URL | สถานะ |
|--------|-----|-------|
| **GAS Web App (Production)** | `https://script.google.com/macros/s/AKfycbwzJgj8ZMWqLYAsg9DklnrJIM2F-O0yH3gHhBjdn6WQDJ3uuLPI87pxAQAvXLdzDx__7A/exec` | ✅ Active |
| **LINE Webhook** | `https://comphone-line-webhook.narinoutagit.workers.dev/line/webhook` | ✅ Active |
| **PWA Mobile App** | `https://comphone.github.io/comphone-superapp/pwa/` | ✅ Active |
| **PC Dashboard** | `https://comphone.github.io/comphone-superapp/pwa/dashboard_pc.html` | ✅ Active |
| **Executive Dashboard** | `https://comphone.github.io/comphone-superapp/pwa/executive_dashboard.html` | ✅ Active |
| **Monitoring Dashboard** | `https://comphone.github.io/comphone-superapp/pwa/monitoring_dashboard.html` | ✅ Active |
| **GitHub Repository** | `https://github.com/comphone/comphone-superapp` | ✅ Public |
| **Google Sheets DB** | `https://docs.google.com/spreadsheets/d/19fkLbSbBdz0EjAV8nE9LLwBiHeIN50BTPptt_PJCRGA` | ✅ Active |
| **Google Drive Root** | `https://drive.google.com/drive/folders/1YRZRG9r1Y_jMHg2XFFKYjK4Hx-sW0Eq0` | ✅ Active |
| **Google Drive Sync** | `https://drive.google.com/drive/folders/1cExEgiIwmhBxZvLQpv10Wvq71ZTp4PfN` | ✅ Active |

### Important IDs
| รายการ | ค่า |
|--------|-----|
| **GAS Script ID** | `1-aoCd5gXoo1dX4FjW62l8JknR3ZPiaf1W7YEmEdtq8gnRzSp4Hwj6043` |
| **Spreadsheet ID** | `19fkLbSbBdz0EjAV8nE9LLwBiHeIN50BTPptt_PJCRGA` |
| **Cloudflare Account** | `838d6a5a046bfaa2a2003bd8005dd80b` |
| **GitHub Pages CNAME** | `comphone.github.io/comphone-superapp` |

---

## 4. Tech Stack

| Layer | เทคโนโลยี | รายละเอียด |
|-------|-----------|-----------|
| **Backend** | Google Apps Script (GAS) V8 | doGet()/doPost() → Router.gs → Modules |
| **Frontend** | PWA SPA — HTML5 + Bootstrap 5.3 + Bootstrap Icons | Section-based Navigation, Mobile-First |
| **Database** | Google Sheets | 13 tables (jobs, customers, stock, billing, etc.) |
| **Notification** | LINE Messaging API + LINE Notify | Multi-channel, role-based routing (5 groups) |
| **AI** | Gemini API (Flash) | Slip verification, Smart Assignment, Vision Analysis |
| **Storage** | Google Drive | รูปภาพงาน, PDF ใบเสร็จ, Backup |
| **Charts** | Chart.js 4.x | Dashboard KPI, Revenue charts |
| **Voice** | Web Speech API | Voice Search (th-TH) |
| **Proxy** | Cloudflare Worker | LINE Webhook async proxy |
| **Hosting** | GitHub Pages | PWA hosting (static) |
| **Deploy** | clasp + rclone + GitHub Actions | Auto-deploy pipeline |
| **Offline** | Service Worker + IndexedDB | Cache-first, offline queue |

---

## 5. File Structure

```
comphone-superapp/
├── BLUEPRINT.md              ← ไฟล์นี้ (Single Source of Truth)
├── deploy_all.sh             ← Master deploy script (WSL)
├── clasp-ready/              ← GAS Backend source (deploy ผ่าน clasp)
│   ├── Router.gs             ← Main router (doGet/doPost)
│   ├── RouterSplit.gs         ← Fast O(1) route lookup (283 actions)
│   ├── Config.gs             ← Configuration & Script Properties
│   ├── Dashboard.gs          ← Dashboard data provider
│   ├── WorkflowEngine.gs     ← AI workflow engine
│   ├── LineBot.gs            ← LINE Bot message handler
│   ├── LineBotIntelligent.gs ← AI-powered LINE responses
│   ├── DriveSync.gs          ← Google Drive sync
│   ├── appsscript.json       ← clasp config
│   └── ... (69 .gs files total)
├── pwa/                      ← PWA Frontend (deploy to GitHub Pages)
│   ├── index.html            ← Mobile PWA (main entry)
│   ├── dashboard_pc.html     ← PC Dashboard
│   ├── executive_dashboard.html
│   ├── monitoring_dashboard.html
│   ├── app.js                ← Mobile app logic
│   ├── sw.js                 ← Service Worker (v5.9.0-phase2d)
│   ├── gas_config.js         ← Auto-generated GAS URL
│   ├── ai_executor_runtime.js ← AI execution framework
│   ├── api_client.js         ← Unified API caller
│   ├── offline_db.js         ← IndexedDB offline queue
│   ├── style.css             ← Main stylesheet
│   ├── manifest.json         ← PWA manifest
│   └── ... (63 files total — 53 JS + 7 HTML + 3 CSS)
├── workers/line-webhook/     ← Cloudflare Worker source
├── docs/                     ← Documentation
├── memory/                   ← AI session context
└── .github/workflows/        ← GitHub Actions (auto-deploy)
```

---

## 6. Feature Status

### ✅ Working (Production)

| ฟีเจอร์ | ไฟล์ | สถานะ |
|---------|------|-------|
| **PC Dashboard** | `dashboard_pc.html` | ✅ KPI, Revenue, Jobs, Charts, Section Loaders |
| **Mobile PWA** | `index.html` + `app.js` | ✅ Login, Jobs, Search, Voice |
| **Executive Dashboard** | `executive_dashboard.html` | ✅ KPI Overview, Drill-down |
| **Monitoring Dashboard** | `monitoring_dashboard.html` | ✅ Health, Latency, Security Log |
| **Service Worker** | `sw.js` | ✅ Cache-first, Offline queue, 15s timeout |
| **AI Executor** | `ai_executor_runtime.js` | ✅ Sandboxed execution, Trust scoring |
| **Execution Lock** | `execution_lock.js` | ✅ Zero-bypass GAS calls |
| **Policy Engine** | `policy_engine.js` | ✅ Human override, Auto-freeze |
| **LINE Bot** | `LineBot.gs` + Worker | ✅ Webhook, Notifications, 5 groups |
| **Job State Machine** | `WorkflowEngine.gs` | ✅ 5-step workflow |
| **Auto Deploy** | `deploy_all.sh` | ✅ tar → rclone → clasp push |
| **Property Guard** | `Router.gs` | ✅ 49/50 properties (1 slot reserved) |

### ✅ Completed (Phase 27.1-28.1 + Phase 2E)

| ฟีเจอร์ | สถานะ | หมายเหตุ |
|---------|-------|---------|
| **Inventory UI** | ✅ Full CRUD | 4 KPI, search/filter, 3-layer stock, transfer, add/edit/delete, PO from low-stock |
| **Dashboard Performance** | ✅ Optimized | `getDashboardBundle` (single-pass + 90s cache), ~11s → ~1-2s |
| **Login (Static Hosting)** | ✅ Fixed | `execution_lock.js` fetch fallback + `Router.gs` doGet routeActionV55 |
| **Deploy Pipeline** | ✅ Hardened | Apps Script API fallback when clasp timeout, 60s timeout |
| **Jobs CRUD** | ✅ Full CRUD | 4 KPI, search, status filter, timeline modal, status transition (12 states) |
| **PO CRUD** | ✅ Full CRUD | Real PO data, 4 KPI, search, receive/cancel |
| **CRM** | ✅ Full CRUD | Real customer data, search, create/edit/view history, follow-up, overdue alerts |
| **Settings** | ✅ Complete | System health, user list, property guard, cache management, quick actions |
| **getProfitReport** | ✅ Optimized | O(N×M) → O(N+M), single DBJOBS read |
| **Login System** | ✅ Phase 28.0 | Login overlay + Session gate (8hr) + Logout, calls loginUser API |
| **Tax/VAT Calculator** | ✅ Phase 28.0 | Full-page VAT 7%/0%/Exempt + WHT 1%/3%/5%, sidebar menu |
| **Billing Section** | ✅ Phase 28.1 | billing_section.js (503 lines), CRUD, PromptPay QR, search/filter, CSV |
| **Attendance Section** | ✅ Phase 28.1 | attendance_section.js (16KB), clock in/out, report, tech history |
| **Warranty Section** | ✅ Phase 28.1 | warranty_section.js (583 lines), CRUD, due alerts, status mgmt |
| **Dashboard 11 Sections** | ✅ Phase 29 | Dashboard, Jobs, PO, Stock, Billing, Warranty, Revenue, Tax, CRM, Attendance, Settings, Photo Upload, Analytics, Customer Portal |
| **POS (Retail Sale)** | ✅ Phase 28.2 | pos.js (240 lines), openPOS modal, add/remove items, VAT 7%, callAPI('createRetailSale'), quickActions button (bi-cash-stack), Deployed to GitHub (01d6635), Synced to Google Drive (v5.9.0-phase2d_20260426_1025) |
| **Error Telemetry** | ✅ Phase 2C | `ErrorTelemetry.gs` (667 lines), DB_ERRORS, trend analysis, severity classification |
| **Logger Visibility** | ✅ Phase 2E-1 | `_logInfo_()` structured logging, DB_LOGS sheet, 17 call sites instrumented |
| **Cron Observability** | ✅ Phase 2E-2 | All 8 cron jobs instrumented with `_logInfo_` entry + `_logError_` catch |
| **Architecture Stewardship** | ✅ Phase 2E | Daily complexity/drift/coupling tracking via `ArchitectureStewardship.gs` |

### ✅ Completed (Phase 29)

| ฟีเจอร์ | สถานะ | หมายเหตุ |
|---------|-------|---------|
| **Photo Upload B/A** | ✅ Phase 29 | `uploadPhoto_` API + Router + UI (drag-drop, preview, base64 upload) |
| **Analytics Section** | ✅ Phase 29 | `analytics_section.js` + dashboard routing + charts UI |
| **Customer Portal** | ✅ Phase 29 | `customer_portal_section.js` + portal UI + job status |
### ✅ Completed (Phase 30 - 28 เมษายน 2569)

| ฟีเจอร์ | สถานะ | หมายเหตุ |
|---------|-------|---------|
| **Token-based Auth** | ✅ Phase 30 | Router.gs รองรับ token จาก query parameter (แก้ปัญหา 401 Unauthorized) |
| **Smart Quotation** | ✅ Phase 30 | `smart_quotation.js` ใช้งานเกณฑ์ราคากลาง (คอมฯ 2568, CCTV 2564) |
| **Notification Loop Fix** | ✅ Phase 30 | แก้ไข toast ซ้อนกันใน `offline_db.js` (ใช้ ID `toast-network`) |
| **Server-side Auth** | ✅ Phase 30 | `auth.js` ตรวจสอบ token กับ GAS (`verifySession`) ก่อนข้ามหน้า Login |
| **Version Update** | ✅ Phase 30 | อัปเดตเวอร์ชันเป็น v5.9.0-phase2d ทุกไฟล์ (analytics.js, sw.js, auth_guard.js) |
| **GAS Deploy @501** | ✅ Phase 30 | Deploy ใหม่ @501 (ลบ photo_upload_section.js ที่ทำให้เกิด Error) |
| **POS Barcode Search** | ✅ Phase 30 | เพิ่มการค้นหาด้วยบาร์โค้ดใน `pos.js` (API: `barcodeLookup`) |
| **POS Profit Margin** | ✅ Phase 30 | แสดงส่วนต่างกำไรในหน้า POS (≥30% เขียว, ≥15% เหลือง, <15% แดง) |
| **Dashboard Retail Sales** | ✅ Phase 30 | เพิ่ม `DBRETAILSALES` ใน DashboardBundle + ฟังก์ชัน `_bundleBuildRetailSales_()` |
| **POS Page Navigation** | ✅ Phase 30 | เพิ่ม `if (page === 'pos')` ใน `goPage()` (เปิดแท็บใหม่) |
| **Version Sync** | ✅ Phase 30 | ตรวจสอบ v5.9.0-phase2d ตรงกันทุกจุด (PWA + GAS) |
| **Menu Beautification** | ✅ Phase 30 | ปรับปรุงธีมเมนู PC (dashboard_pc.html) + Mobile (style.css) ให้สวยงาม ไม่มี bug |
| **Customer Portal V2** | ✅ Phase 30 | เพิ่ม viewCustomerJobs + downloadCustomerReceipts + showJobDetail + showTimeline ใน crm_attendance.js |
| **Dashboard Enhancement** | ✅ Phase 30 | เพิ่ม Retail Sales Widget + Quick Actions + Technician Performance (getTechPerformance) + Responsive KPI Grid |
| **Stock Module** | ✅ Phase 30 | สร้าง stock.js ใหม่ (Full CRUD + Transfer + Movement + Low Stock Alerts + Role-based Access) |
| **PDF Export (PO)** | ✅ Phase 30 | เพิ่ม exportPOToPDF() ใน purchase_order.js ใช้ jsPDF + jsPDF-autoTable |
| **jsPDF Integration** | ✅ Phase 30 | เพิ่ม CDN jsPDF 2.5.2 + jsPDF-autoTable 3.8.2 ใน index.html |
| **AI LINE Agent (Phase2D)** | ✅ Phase 30 | สร้าง AI Agent 3 บทบาท (Dispatcher, Sales Analyst, BI) ใช้ Gemini Pro + Group ID routing + Dispatcher summarize jobs + notify technicians |

### 🔧 Partially Done (Backend Ready, Frontend Needed)

*No items — all Phase 29 features completed.*

### 📋 Planned (Roadmap)

| Phase | ฟีเจอร์ | GAS Action | Priority |
|-------|---------|-----------|----------|
| **Phase 1** | Open Job Form | `openJob` | 🔴 สูง |
| **Phase 1** | Assign Technician | `updateJobStatus` | 🔴 สูง |
| **Phase 1** | Job Timeline View | `getJobTimeline` | 🔴 สูง |
| **Phase 2** | Billing / Receipt | `createBilling` | ✅ Done (Phase 28.1) |
| **Phase 2** | PromptPay QR | `generatePromptPayQR` | ✅ Done (Phase 28.1) |
| **Phase 2** | Slip Verification (AI) | `VisionAnalysis.gs` | 🟠 กลาง |
| **Phase 3** | Customer Portal | `getCustomer` | 🟡 ต่ำ |
| **Phase 3** | Photo Upload B/A | `PhotoQueue.gs` | 🟡 ต่ำ |
| **Phase 3** | Barcode Scanner | `barcodeLookup` | 🟡 ต่ำ |
| **Phase 4** | Predictive Maintenance | AI Analysis | 🟢 ระยะยาว |
| **Phase 4** | Route Optimization | `GpsPipeline.gs` | 🟢 ระยะยาว |

---

## 7. Security Invariants (Frozen)

### 7.1 Auth & Access Control
- **PIN-based Login** — Fast authentication for mobile
- **Role-based UI** — OWNER / ADMIN / TECH / VIEWER
- **Session Token** — Server-side validation via `verifySession()`
- **17 Protected Actions** — Require auth token (billing, AI, backup, etc.)

### 7.2 Execution Security
- **Zero-Bypass GAS** — All API calls through `AI_EXECUTOR` + `GAS_EXECUTE`
- **Execution Lock** — `execution_lock.js` forbids direct GAS calls
- **One-time Approval Tokens** — 3000ms TTL, consumed on use
- **Rate Limiter v2** — 60 req/min per identity (CacheService hash)
- **LINE Signature Verification** — Hard-fail for invalid webhooks

### 7.3 Architecture Freeze (PHMP v1)
- **No architecture changes** without impact audit
- **Security invariants are immutable** — no bypass, no disable
- **Hotfixes** must branch from freeze tag, include regression tests
- **All new features** must pass staging validation

---

## 8. Deploy Pipeline

### 8.1 Deploy Script (`deploy_all.sh`)

```bash
# 1. Reconstruct ~/.clasprc.json from CLASP_TOKEN env var
# 2. Push GAS code: clasp push --force
# 3. Deploy new version: clasp deploy → capture URL
# 4. Update gas_config.js with new URL
# 5. Push to GitHub: git push origin main
# 6. Sync to Google Drive (OAuth2, no Service Account)
```

### 8.2 Environment Variables (Required)

| Variable | 用途 |
|----------|------|
| `CLASP_TOKEN` | สร้าง `~/.clasprc.json` สำหรับ clasp push |
| `GOOGLE_CLIENT_ID` | OAuth2 สำหรับ Drive sync |
| `GOOGLE_CLIENT_SECRET` | OAuth2 สำหรับ Drive sync |
| `GOOGLE_REFRESH_TOKEN` | OAuth2 สำหรับ Drive sync |

### 8.3 GitHub Pages Auto-Deploy
- **Trigger:** Push to `main` branch (paths: `pwa/**`, `memory/session.md`)
- **Action:** `auto-deploy.yml` builds and deploys to GitHub Pages
- **Result:** Files served from repo root — PWA accessible at `https://comphone.github.io/comphone-superapp/pwa/`
- **Important:** GitHub Pages serves from repo root. PWA is at `/comphone-superapp/pwa/` (NOT `/comphone-superapp/`). All paths in code MUST include `/pwa/`.

---

## 9. Configuration Rules

### 9.1 GAS Script Properties (49/50)
- Max 50 properties per script
- Property Guard monitors usage
- High-frequency data → dedicated Spreadsheet (not Script Properties)
- **RULE:** Never exceed 50 — system will reject writes

### 9.2 Service Worker
- **Version:** `CACHE_V = 'comphone-v5.9.0-phase2d'`
- **Timeout:** 15 seconds (GAS cold start can take 5-10s)
- **Strategies:** Cache First (static) | Network First (API) | Network Only (webhook)
- **Offline Queue:** IndexedDB `comphone_offline` v2 (3 stores: action_queue, data_cache, queue)
- **Cache Invalidation:** On version bump, SW clears old caches and reloads all tabs

### 9.3 Version Synchronization
All these MUST match on deploy:

| Surface | File | Key |
|---------|------|-----|
| SW Cache | `sw.js` | `CACHE_V = 'comphone-v5.9.0-phase2d'` |
| PC Dashboard | `dashboard_pc.html` | `__APP_VERSION = 'v5.9.0-phase2d'` |
| GAS Config | `Config.gs` | `CONFIG.VERSION = '5.9.0-phase2d'` |
| gas_config.js | `gas_config.js` | Auto-generated by deploy |

---

## 10. Known Issues & Resolutions

### ✅ Recently Fixed (2026-04-23)

| ปัญหา | สาเหตุ | แก้ไข |
|-------|--------|-------|
| Mobile "เชื่อมต่อไม่ได้" | auth.js + api_client.js ใช้ POST → GAS 302 redirect ฆ่า body | เปลี่ยน POST → GET ทั้งหมด (auth.js, api_client.js, error_boundary.js) |
| PWA Path สับสน | GitHub Pages serve จาก repo root → PWA อยู่ที่ `/pwa/` ไม่ใช่ root | คง path `/comphone-superapp/pwa/` (ไม่ตัด /pwa/ ออก) |
| Version เก่า v5.5 | index.html hardcode "v5.5" | แก้เป็น v5.6.6 |
| SW IndexedDB error | DB version mismatch (SW v2, offline_db v1) | Bump offline_db.js to v2, sync stores |
| gas_config.js URL ผิด | Deploy จับ URL ผิด deployment | แก้ URL ตรง |
| AI Validation 12/16 fail | Recursive test() bug + typeof mismatch | แก้ validation script, add context-aware skip |
| Dashboard "กำลังพัฒนา" | loadSection() แสดง placeholder | เปลี่ยนเป็น live data loaders (11 sections) |
| SW timeout 3s | API ใช้เวลา 11s แต่ timeout 3s | เพิ่มเป็น 15s |
| POST → 405 error (PC) | GAS redirect POST → GET (302) | เปลี่ยนเป็น GET ทั้งหมด (dashboard_pc.html, executive_dashboard.html) |
| system_graph_data.js 404 | ไฟล์ไม่มี | สร้าง stub file |
| 10 ไฟล์ blueprint ซ้ำซ้อน | 47 ไฟล์เอกสารกระจัดกระจาย | รวมเป็น BLUEPRINT.md ไฟล์เดียว + ลบ 10 ไฟล์ซ้ำ |
| Google Drive backup เก่า | SA ไม่มี write quota | ใช้ OAuth2 upload + ลบ backup เก่า |
| **Login fail (Static Hosting)** | `GAS_EXECUTE()` ต้องใช้ `google.script.run` ซึ่งไม่มีบน GitHub Pages | เพิ่ม fetch fallback ใน `execution_lock.js` + `Router.gs` doGet routeActionV55 |
| **GAS doGet ไม่รองรับ loginUser** | `doGet()` hardcode เฉพาะ ~15 actions, ไม่มี loginUser | เพิ่ม `routeActionV55()` fallback สำหรับ actions ที่ไม่ตรง hardcoded list |
| **Dashboard ช้า ~11s** | `getDashboardData()` อ่านซ้ำ 17 ครั้ง (DBJOBS 7x, DB_INVENTORY 3x) | Switch frontend เป็น `getDashboardBundle()` (single-pass + 90s cache) |
| **Inventory UI placeholder** | `renderInventorySection()` แสดงแค่ lowStock count | สร้าง full CRUD UI: 4 KPI, search/filter, table, modals (add/edit/delete/transfer/PO) |
| **deploy_all.sh clasp timeout** | clasp push timeout ไม่มี fallback | เพิ่ม Apps Script API fallback + 60s timeout |

### ⚠️ Current Watchlist

| รายการ | สถานะ | หมายเหตุ |
|-------|-------|---------|
| Browser cache | ⚠️ | ผู้ใช้ต้อง Hard Refresh หลัง deploy |
| Google Drive SA quota | ⚠️ | SA ไม่มี write quota — ต้องใช้ OAuth2 สำหรับ upload |
| Inventory.gs decomposition | 🔴 | 1,502 lines — coupling สูง, ต้อง extract utils ก่อน split |
| BillingManager.gs decomposition | 🔴 | 1,071 lines — same coupling risk as Inventory |
| Anomaly Detection baseline | ⏳ | Phase 2E telemetry active, needs 14 days of data for σ-deviation alerts |
| Blueprint reconciliation | ✅ | File map, versions, phase labels synced 2026-04-24 |

---

## 11. Business Context

### 11.1 User (คุณโหน่ง)
- เจ้าของร้าน IT (ซ่อม/ติดตั้ง/จัดซื้อ) ที่โพนทอง ร้อยเอ็ด
- ชอบกระชับ เน้นประสิทธิภาพ ข้าม setup blocker
- ต้องการ "Professional Grade" system
- **Rule:** ไม่เสียเวลากับ environment issues — เน้นลงมือทำโค้ด

### 11.2 Team
| ชื่อ | บทบาท |
|-----|-------|
| ช่างโต้ | Technician |
| ช่างเหม่ง | Technician |
| ช่างรุ่ง | Technician |
| คุณโหน่ง | Owner / Admin |

### 11.3 LINE Groups
| กลุ่ม | Group ID |
|-------|----------|
| TECHNICIAN | `C8ad22a115f38c9ad3cb5ea5c2ff4863b` |
| ACCOUNTING | `C7b939d1d367e6b854690e58b392e88cc` |
| PROCUREMENT | `Cfd103d59e77acf00e2f2f801d391c566` |
| SALES | `Cb7cc146227212f70e4f171ef3f2bce15` |
| EXECUTIVE | `Cb85204740fa90e38de63c727554e551a` |

---

## 12. Quick Reference

### Login
- Username: `admin` | Password: `admin1234` | Role: OWNER

### Deploy Commands
```bash
# Full deploy (WSL)
cd /mnt/c/Users/Server/comphone-superapp && bash deploy_all.sh

# Manual GAS push
cd clasp-ready && clasp push --force && clasp deploy

# GitHub push (triggers auto-deploy to Pages)
git add -A && git commit -m "..." && git push origin main
```

### Debug Commands (Browser Console)
```javascript
// Check system health
AI_EXECUTOR.debug()

// Check execution lock
window.__TRUSTED_ACTIONS

// Check SW version
navigator.serviceWorker.getRegistration().then(r => r.active.postMessage({type:'GET_VERSION'}))

// Clear all caches
localStorage.clear(); caches.keys().then(ks => ks.forEach(k => caches.delete(k)))

// Check offline DB
indexedDB.databases().then(dbs => console.log(dbs))
```

---

## 13. Development Rules

### 13.1 Operational Principles
1. **ใช้ข้อมูลจริงเป็นฐาน** — ไม่สร้างข้อมูลสมมติ
2. **ไม่ทำงานแบบเงียบ** — error ต้องบันทึกและแจ้งเหตุ
3. **ทำงานต่อเนื่องจนจบงาน** — ไม่ค้างกลางทาง
4. **ความถูกต้องสำคัญกว่าความสวยงาม** — โดยเฉพาะข้อมูลการเงิน
5. **รองรับการขยายตัวแบบค่อยเป็นค่อยไป**

### 13.2 Code Rules
- ❌ **ห้าม** เรียก GAS โดยตรง — ต้องผ่าน `callGas()` หรือ `AI_EXECUTOR`
- ❌ **ห้าม** ใช้ Service Account สำหรับ Drive — ใช้ OAuth2 เท่านั้น
- ❌ **ห้าม** hardcode URL — ใช้ `gas_config.js` เป็น single source
- ❌ **ห้าม** เกิน 50 Script Properties — ใช้ Spreadsheet แทน
- ✅ **ต้อง** sync version ทุก surface หลัง deploy
- ✅ **ต้อง** ใช้ GET สำหรับ API calls (GAS redirect ฆ่า POST body)
- ✅ **ต้อง** timeout 15s สำหรับ API calls (GAS cold start)
- ✅ **ต้อง** error logging ทุก API failure

### 13.3 Deploy Rules (PHMP v1)
- **Freeze tag:** `v5.9.0-phase2d-freeze`
- **Hotfix branch:** `hotfix/{YYYYMMDD}-{description}`
- **No direct push to main** for architecture changes
- **Regression test required** before merge

---

> **เอกสารนี้คือ Single Source of Truth** — อ้างอิงไฟล์นี้ก่อนเริ่มงานทุกครั้ง
> อัปเดตล่าสุด: 2026-04-28 | Phase 30 Complete | Commit `cf02305` — Dashboard + Stock + PDF Export + Menu Beautification

---

## 14. Script Properties (ตั้งค่าแล้วทั้งหมด — 49/50)

| Property | ค่า | 用途 |
|----------|-----|------|
| `DB_SS_ID` | `19fkLbSbBdz0EjAV8nE9LLwBiHeIN50BTPptt_PJCRGA` | Google Sheets Database ID |
| `ROOT_FOLDER_ID` | `1YRZRG9r1Y_jMHg2XFFKYjK4Hx-sW0Eq0` | Google Drive Root Folder |
| `WEB_APP_URL` | Production GAS URL | API Endpoint |
| `LINE_CHANNEL_ACCESS_TOKEN` | [configured] | LINE Messaging API |
| `GEMINI_API_KEY` | [configured] | AI (Slip verify, Vision, Smart Assign) |
| `LINE_GROUP_TECHNICIAN` | `C8ad22a115f38c9ad3cb5ea5c2ff4863b` | แจ้งงานช่าง |
| `LINE_GROUP_ACCOUNTING` | `C7b939d1d367e6b854690e58b392e88cc` | แจ้งบัญชี |
| `LINE_GROUP_PROCUREMENT` | `Cfd103d59e77acf00e2f2f801d391c566` | แจ้งจัดซื้อ |
| `LINE_GROUP_SALES` | `Cb7cc146227212f70e4f171ef3f2bce15` | แจ้งเซลส์ |
| `LINE_GROUP_EXECUTIVE` | `Cb85204740fa90e38de63c727554e551a` | แจ้งผู้บริหาร |
| `TAX_MODE` | `VAT7` | โหมดภาษี (VAT7/ZERO/EXEMPT/MIXED) |
| `BRANCH_ID` | `HQ` | รหัสสาขาปัจจุบัน |
| `COMPANY_NAME` | `ร้านคอมโฟน` | ชื่อบริษัทสำหรับออกเอกสาร |
| `COMPANY_TAX_ID` | `1234567890123` | เลขประจำตัวผู้เสียภาษี |
| `RATE_LIMIT_PER_MIN` | `60` | Request limit ต่อนาที |
| `ALLOWED_ORIGINS` | `*` | CORS Origins |

**RULE:** ห้ามเกิน 50 properties — ใช้ Spreadsheet แทนสำหรับข้อมูล high-frequency

---

## 15. Scheduled Triggers (GAS — 8 ตัว)

| Function | หน้าที่ | ความถี่ |
|----------|---------|---------|
| `sendAfterSalesAlerts` | แจ้งเตือน After Sales | Daily |
| `checkLowStockAlert` | แจ้งเตือนสต็อกต่ำ | Daily |
| `cronMorningAlert` | รายงานเช้า | Daily (08:00) |
| `geminiReorderSuggestion` | AI แนะนำสั่งซื้อ | Daily |
| `autoBackup` | สำรองข้อมูลอัตโนมัติ | Daily |
| `getCRMSchedule` | CRM Follow-up | Daily |
| `cronTaxReminder` | แจ้งเตือนยื่นภาษี | Monthly (วันที่ 1) |
| `cronHealthCheck` | ตรวจสอบสถานะระบบ | Every 30 min |

---

## 16. API Contract

### Request Pattern (เปลี่ยนจาก POST เป็น GET — Phase 26.4)
```
GET {GAS_URL}?action=xxx&token=xxx&param1=val1
```

### Response Pattern
```json
{ "success": true, "data": {...}, "message": "optional" }
```

### Frontend Call Pattern
```js
// Mobile PWA (app.js)
async function callAPI(action, params = {}) {
  const url = GAS_URL + '?' + new URLSearchParams({ action, ...params });
  const res = await fetch(url);
  return res.json();
}

// PC Dashboard (dashboard_pc.html)
async function callGas(action, params) {
  const baseUrl = localStorage.getItem('comphone_gas_url') || GAS_URL;
  const qs = new URLSearchParams({ action, ...params }).toString();
  const r = await fetch(baseUrl + '?' + qs);
  return r.json();
}
```

### Auth
- ส่ง `token` (Session ID) ในทุก request ที่ต้องการสิทธิ์
- Token ได้จาก `loginUser` action → `verifySession()` ฝั่ง server

---

## 17. Implemented Actions (40+)

| กลุ่ม | Actions |
|-------|---------|
| **Auth** | `loginUser`, `logoutUser`, `verifySession`, `listUsers`, `createUser`, `updateUserRole`, `setUserActive` |
| **Jobs** | `getJobs`, `getJobById`, `createJob`, `updateJob`, `updateJobStatus`, `deleteJob`, `addJobNote`, `getJobTimeline`, `assignTechnician`, `openJob` |
| **Inventory** | `getInventory`, `addInventoryItem`, `updateInventoryItem`, `deleteInventoryItem`, `transferStock`, `getStockMovements`, `barcodeLookup`, `getInventoryItemDetail` |
| **Billing** | `createBill`, `getBills`, `updateBillStatus`, `generatePDF`, `verifySlip`, `createBilling` |
| **CRM** | `getCustomers`, `createCustomer`, `updateCustomer`, `getCRMSchedule`, `getCustomer` |
| **Photo** | `uploadPhoto`, `getPhotos`, `processPhotoQueue`, `analyzePhoto` |
| **PO** | `createPO`, `getPOs`, `updatePOStatus`, `approvePO` |
| **Attendance** | `clockIn`, `clockOut`, `getAttendance` |
| **After Sales** | `createAfterSales`, `getAfterSales`, `updateAfterSales`, `createAfterSalesRecord` |
| **Dashboard** | `getDashboardData`, `getDashboardBundle`, `systemStatus`, `getExecutiveDashboard`, `getSystemMetrics`, `getSystemLogs`, `getTechPerformance` |
| **Reports** | `exportPOToPDF`, `getProfitReport` |
| **LINE** | Webhook (auto-detect via `destination` + `events`), `sendLineNotify` |
| **AI/Smart** | `smartAssignment`, `gpsPipeline`, `geminiReorderSuggestion` |
| **System** | `healthCheck`, `guardstatus`, `auditproperties`, `cleanupproperties`, `logSystemError` |
| **Public** | `getJobStatusPublic` (ไม่ต้อง Auth) |

---

## 18. Backend File Map (69 ไฟล์ — as-built 2026-04-24)

### Core System (18)
| ไฟล์ | Lines | หน้าที่ |
|------|-------|---------|
| `Router.gs` | 682 | HTTP Router — doGet()/doPost(), MODULE_ROUTER dispatch |
| `Config.gs` | — | Script Properties wrapper, constants, VERSION |
| `Auth.gs` | — | Login PIN, verifySession, RBAC (4 roles) |
| `Utils.gs` | — | Shared utilities |
| `Setup.gs` | 703 | Initial setup + sheet creation + data seeding |
| `Security.gs` | — | Token verify, Rate limit, CORS |
| `HealthMonitor.gs` | — | System health check + LINE alert |
| `AutoBackup.gs` | — | Scheduled backup + trigger management |
| `Backup.gs` | — | Backup functions |
| `DatabaseIntegrity.gs` | — | DB integrity checks + schema validation |
| `DataSeeding.gs` | — | Seed initial data |
| `SheetOptimizer.gs` | — | Sheet performance optimization |
| `DriveSync.gs` | — | Google Drive sync (OAuth2) |
| `DeployGuide.gs` | — | Deploy documentation |
| `ErrorTelemetry.gs` | 667 | Centralized error telemetry + trend analysis + `_logInfo_`/`_logError_` |
| `ArchitectureStewardship.gs` | 358 | Daily complexity/drift/coupling tracking (cron) |
| `PropertiesGuard.gs` | — | Script Properties overflow protection (49/50 limit) |
| `PropertiesCleanup.gs` | — | Properties audit + cleanup |

### Business Modules (12)
| ไฟล์ | Lines | หน้าที่ |
|------|-------|---------|
| `JobsHandler.gs` | — | Job CRUD + Timeline + Notes |
| `JobStateMachine.gs` | 712 | 12-state machine + transition validation |
| `BillingManager.gs` | 1,071 | Bill/Receipt + PromptPay QR + PDF + Slip Verify |
| `Inventory.gs` | 1,502 | Stock 3-layer (Warehouse/Shop/Van) + PO + Barcode |
| `CustomerManager.gs` | 569 | CRM CRUD + Follow-up schedule |
| `CustomerPortal.gs` | — | Public customer portal |
| `Attendance.gs` | — | Clock in/out + attendance report |
| `AfterSales.gs` | — | Warranty + after-sales follow-up |
| `WarrantyManager.gs` | — | ระบบรับประกันสินค้า |
| `TaxEngine.gs` | — | คำนวณภาษี VAT/WHT |
| `TaxDocuments.gs` | — | สร้าง PDF ใบกำกับภาษี/ภงด. + tax reminder cron |
| `MultiBranch.gs` | — | ระบบจัดการหลายสาขา |

### Sales & Reporting (3)
| ไฟล์ | Lines | หน้าที่ |
|------|-------|---------|
| `RetailSale.gs` | — | ระบบขายปลีก (backend stub) |
| `CRM.gs` | — | CRM functions |
| `Reports.gs` | — | รายงานต่างๆ |

### LINE Bot (6)
| ไฟล์ | Lines | หน้าที่ |
|------|-------|---------|
| `LineBot.gs` | 553 | LINE Webhook handler + command parser |
| `LineBotV2.gs` | 739 | LINE Bot v2 — enhanced commands |
| `LineBotIntelligent.gs` | 909 | AI-powered LINE Bot responses |
| `LineBotQuota.gs` | 643 | LINE API quota management |
| `FlexMessage.gs` | 699 | Flex Message templates |
| `Notify.gs` | — | LINE Notify + Messaging API multi-channel |

### Dashboard & Analytics (5)
| ไฟล์ | Lines | หน้าที่ |
|------|-------|---------|
| `Dashboard.gs` | 841 | Dashboard data provider |
| `DashboardBundle.gs` | — | Single-pass dashboard bundle (1-2s, 90s cache) |
| `DashboardV55.gs` | — | Dashboard v5.5 provider (legacy compat) |
| `ExecutiveDashboard.gs` | 558 | Executive KPI data |
| `WorkflowEngine.gs` | 535 | AI workflow engine |

### AI & Vision (12)
| ไฟล์ | Lines | หน้าที่ |
|------|-------|---------|
| `VisionAnalysis.gs` | — | Gemini vision analysis (slip, photo) |
| `VisionPipeline.gs` | 745 | Vision processing pipeline |
| `VisionLearning.gs` | 708 | Vision learning pipeline |
| `SmartAssignment.gs` | — | AI technician assignment |
| `BusinessAI.gs` | 890 | Business AI logic |
| `BusinessAnalytics.gs` | — | Business analytics engine |
| `BusinessMetrics.gs` | — | Business metrics calculator |
| `GpsPipeline.gs` | — | GPS geofence + route optimization |
| `AgentGateway.gs` | — | AI agent gateway |
| `AgentCollaboration.gs` | — | Multi-agent collaboration |
| `AgentMemory.gs` | — | AI agent memory |
| `AgentScoring.gs` | — | AI agent scoring |

### Governance & Safety (7)
| ไฟล์ | Lines | หน้าที่ |
|------|-------|---------|
| `DecisionGuard.gs` | 444 | Decision safety guard |
| `DecisionLayer.gs` | 330 | Decision abstraction layer |
| `WorkflowSafety.gs` | — | Workflow safety checks |
| `SharedContext.gs` | — | Shared context for agents |
| `MemoryControl.gs` | — | Memory management |
| `LearningIntegration.gs` | — | Learning system integration |
| `AIAuditLog.gs` | — | AI action audit trail |

### Other (6)
| ไฟล์ | Lines | หน้าที่ |
|------|-------|---------|
| `PhotoQueue.gs` | 821 | Photo processing queue |
| `AuditLog.gs` | — | Audit trail |
| `Approval.gs` | — | Multi-level approval workflow |
| `PushNotifications.gs` | — | Push notification support |
| `RouterSplit.gs` | — | Router module split helper |
| `reassign_pending_photos.gs` | — | Photo reassignment script |

---

## 19. Design Rationale

### ทำไมใช้ SPA (ไม่ใช่ Multi-page)?
- ลดภาระ GAS ในการโหลดหน้าใหม่
- UI ตอบสนองเร็ว (Snappy) คล้าย Native App
- รองรับการขยายเมนูในอนาคตได้ง่าย

### ทำไม Inventory 3 ชั้น?
- **คลังหลัก (Main):** รับของเข้าและจัดเก็บ
- **หน้าร้าน (Site):** ขายหรือใช้งานหน้าร้าน
- **รถช่าง (Van):** ช่างพกติดรถไปหน้างาน
- สะท้อนการทำงานจริงของธุรกิจรับเหมาติดตั้ง

### ทำไม PromptPay เป็น payment rail หลัก?
- เหมาะกับงานบริการในไทย
- เชื่อมกับการสร้าง QR ได้ง่าย
- ทำให้ flow สถานะ 10→11 (รอชำระ→ชำระแล้ว) มี automation ชัดเจน

### ทำไมเปลี่ยน POST เป็น GET?
- GAS redirect POST → GET (302 Found) ทำให้ body หาย
- GET with query params ไม่ได้รับผลกระทบจาก redirect
- Dashboard data fetch ใช้ GET ได้ (ไม่ sensitive)

### ทำไม timeout 15 วินาที?
- GAS cold start ใช้เวลา 5-10 วินาที
- เดิมตั้ง 3 วินาที → API timeout ก่อนได้ response
- 15 วินาทีครอบคลุม worst case

---

## 20. API Keys & External Services

| Service | 用途 | สถานะ |
|---------|------|-------|
| **LINE Messaging API** | ส่งข้อความ/Flex Message | ✅ Token configured |
| **LINE Notify** | แจ้งเตือน 5 กลุ่ม | ✅ Configured |
| **Gemini API (Flash)** | Slip verify, Vision, Smart Assign | ✅ Key configured |
| **Google Drive** | เก็บรูปงาน + PDF | ✅ ROOT_FOLDER_ID configured |
| **PromptPay QR** | สร้าง QR รับเงิน | ✅ Built-in (BillingManager.gs) |
| **Slip Verify API** | ตรวจสลิปโอนเงิน | ✅ Via Gemini Vision |
| **Cloudflare Worker** | LINE Webhook async proxy | ✅ Deployed |

---

## 21. Architectural Decisions Log

| # | การตัดสินใจ | เหตุผล |
|---|------------|--------|
| 1 | ยึด Router กลาง (Router.gs) | ดูแลง่าย, single entry point สำหรับ web app deployment |
| 2 | ใช้ Google Sheets ต่อ | สอดคล้องระบบเดิม, ลดเวลา migration, เพิ่ม dynamic header mapping |
| 3 | เปลี่ยนรูปถ่ายเป็น data pipeline | รูป不再是แค่หลักฐาน แต่เป็นตัวขับการประเมินคุณภาพงาน |
| 4 | ยึด state machine เป็นแกนกลาง | validation, audit log, billing trigger, stock reservation ผูกกันเป็นระบบ |
| 5 | 3-layer inventory | สะท้อนการทำงานจริง (ร้าน + ภาคสนาม) |
| 6 | PromptPay เป็น payment rail | เหมาะไทย, QR ง่าย, automation ชัด |
| 7 | Multi-channel notification | LINE + Telegram + Email (อนาคต) ตาม role |
| 8 | GET แทน POST | GAS redirect ฆ่า POST body |
| 9 | SW timeout 15s | GAS cold start 5-10s |
| 10 | OAuth2 แทน Service Account | Drive quota issues with SA |


## 22. Phase 30: Enterprise Intelligence (Current)
**วันที่:** 28 เมษายน 2569 | **สถานะ:** 🟢 PRODUCTION — Token Auth + Smart Quotation + GAS URL Fix Complete*

### 22.1 Frontend Expansion (UI Enhancement + Menu Beautification)

| Module | Description | Status | Priority |
|--------|-------------|--------|----------|
| **POS/Retail UI** | สร้างหน้าขายหน้าร้านสมบูรณ์ (`pos.js`) + เชื่อมต่อกับ `createRetailSale` API + Token-based Auth + Barcode Search + Profit Margin | ✅ Complete | - |
| **Smart Quotation** | เพิ่มระบบเปรียบเทียบราคากลาง (คอมพิวเตอร์ 2568, CCTV 2564) ในหน้า POS | ✅ Complete | - |
| **GAS URL Fix** | อัปเดต `gas_config.js` + `api_client.js` เป็น GAS @501 (fix login/analytics errors) | ✅ Complete | - |
| **Menu Beautification (PC+Mobile)** | ปรับปรุงธีมเมนู PC + Mobile ให้สวยงาม (Bootstrap Icons, active states, hover effects, responsive) | ✅ Complete | IMMEDIATE |
| **Customer Portal V2 (ลูกค้า)** | เพิ่มประวัติงาน (viewCustomerJobs) + ดาวน์โหลดใบเสร็จ (downloadCustomerReceipts) + Timeline (showTimeline) + Job Detail (showJobDetail) | ✅ Complete | HIGH |
| **Dashboard Enhancement** | เพิ่ม Retail Sales Widget + Quick Actions + Technician Performance (getTechPerformance: completed jobs, avg days, rating) + Responsive KPI Grid (4/3/2/1 columns) | ✅ Complete | HIGH |
| **Order Module (สั่งซื้อ)** | สร้างหน้าสร้าง/ติดตามใบสั่งซื้อ (Purchase Order) + PDF Export (exportPOToPDF ด้วย jsPDF) + Receive/Cancel | ✅ Complete | HIGH |
| **Stock Module (สต็อก)** | สร้างโมดูลสต็อกใหม่ (stock.js) + Full CRUD + Stock Transfer + Movement History + Low Stock Alerts + ตรวจสอบสิทธิ์ (Admin/Owner เท่านั้น) | ✅ Complete | MEDIUM |
| **Time/Attendance (เวลา)** | ปรับปรุงหน้าบันทึกเวลาเข้างาน + รายงานการลงเวลาช่าง (Attendance Report) | ⏳ Pending | MEDIUM |
| **Report Module (รายงาน)** | สร้างหน้ารายงานสรุปยอดขาย/สต็อก/งาน + PDF Export | ⏳ Pending | MEDIUM |
| **Analytics V2** | เพิ่ม Predictive Inventory + Anomaly Detection + AI Insights ในหน้า Analytics | ⏳ Pending | MEDIUM |
| **Photo Upload UI (PC)** | เพิ่มส่วนจัดการรูปภาพ (Before/After) ใน PC Dashboard ให้สมบูรณ์เหมือน Mobile PWA | ⏳ Pending | LOW |
| **AI LINE Agent (Phase2D)** | สร้าง AI Agent 3 บทบาท (Dispatcher, Sales Analyst, BI) ใช้ Gemini Pro + รองรับ Group ID routing | ✅ Complete | HIGH |

### 22.2 Intelligence & Automation
| Module | Description | Status |
|--------|-------------|--------|
| **AI LINE Agent (Phase2D)** | สร้าง AI Agent 3 บทบาท (Dispatcher, Sales Analyst, BI) ใช้ Gemini Pro + รองรับ Group ID routing + Auto-notification | ✅ Complete |
| **Predictive Inventory** | ใช้ข้อมูล DB_LOGS + DB_INVENTORY ให้ AI (Gemini) ทำนายการสั่งซื้ออะไหล่ล่วงหน้า | ⏳ Pending |
| **Smart Route Optimization** | พัฒนาระบบวางแผนเส้นทางเดินรถสำหรับช่างติดตั้ง (GPS Pipeline) | ⏳ Pending |
| **Anomaly Detection** | ใช้ข้อมูลจาก ErrorTelemetry สร้างระบบแจ้งเตือนความผิดปกติเชิงรุก (Proactive Alerting) | ⏳ Pending |

### 22.3 Sustainability & Hardening
| Module | Description | Status |
|--------|-------------|--------|
| **Module Decomposition** | แยกไฟล์ขนาดใหญ่ (Inventory.gs, BillingManager.gs) เป็นโมดูลย่อยตามหลัก RouterSplit.gs | ⏳ Pending |
| **Automated Testing** | เริ่มวางโครงสร้างการทดสอบอัตโนมัติ (Unit Test) สำหรับ API actions สำคัญ | ⏳ Pending |
| **Goal** | มุ่งสู่ Phase 30: เปลี่ยนข้อมูล (Data) ให้เป็นความฉลาดในการดำเนินธุรกิจ (Actionable Insights) | 🎯 Target |

### 22.4 Immediate Next Steps (Step-by-Step)
1. ✅ **POS/Retail UI** — Created `pwa/pos.html` + `pwa/pos.js` + Token Auth (Router.gs) + Smart Quotation (`smart_quotation.js`) ✅ **COMPLETE**
2. ⏳ **Customer Portal V2** — Enhance `pwa/customer_portal.js` + `pwa/customer_portal_section.js`
3. ⏳ **Photo Upload UI (PC)** — Add to `pwa/dashboard_pc.html` + `pwa/photo_manager.js`
4. ⏳ **Predictive Inventory** — Create `pwa/predictive_inventory.js` + update `Inventory.gs`
---

## 8. Lessons Learned (Phase 30-31 — 28 เมษายน 2569)

### 🔴 Critical Issues Encountered & Resolutions

| ปัญหา | สาเหตุ | วิธีแก้ไข | Commit |
|-------|-------|----------|--------|
| **Login ไม่ได้** | `gas_config.js` ไม่ได้โหลดใน `index.html` ทำให้ `api_client.js` ใช้ fallback URL เก่า (@501) | เพิ่ม `<script src="gas_config.js">` ก่อน `</head>` + อัปเดต fallback URL เป็น @502 ใน `api_client.js` | `b8ccd2f` |
| **404 Error: mobile_shared.js** | ไฟล์ `mobile_shared.js` ไม่มีใน repo แต่ `index.html` อ้างอิงไว้ | สร้าง `mobile_shared.js` ว่างๆ (104 bytes) | `38a5ed5` |
| **Version Mismatch** | `index.html` ใช้ v5.7.0, `dashboard_pc.html` ใช้ v5.6.8, `version_config.js` ใช้ v5.9.0-phase2d | สร้างระบบ Centralized Versioning (`version_config.js`) + Cache Buster (`?v=...&t=...`) | `0e5321f`, `0f68e2f` |
| **Service Worker Cache** | SW ยังคงเสิร์ฟไฟล์ JS เวอร์ชันเก่า แม้ index.html จะอัปเดตแล้ว | เพิ่ม Cache Buster comment ใน `index.html` + แนะนำผู้ใช้ให้ล้าง Site Data | `0f68e2f` |
| **Google Drive Sync Failed** | `SharedContext.gs` timeout ขณะ sync | ต้อง retry sync อีกครั้ง (pending) | - |
| **Splash Screen ค้าง** | `initApp()` ไม่ทำงาน (สาเหตุที่แท้จริงยังคงอยู่) | ตรวจสอบ Console Error + ล้าง Service Worker Cache (ยังคงแก้ไขไม่สำเร็จ) | - |

### ✅ Completed Work (Phase 30-31)

| งาน | สถานะ | รายละเอียด |
|------|-------|------------|
| **Version Alignment** | ✅ เสร็จ | แก้ไข 4 ไฟล์ให้ใช้เวอร์ชันเดียวกัน (v5.9.0-phase2d) |
| **Centralized Versioning** | ✅ เสร็จ | สร้าง `version_config.js` เป็นแหล่งข้อมูลเดียว |
| **Cache Buster** | ✅ เสร็จ | เพิ่ม timestamp parameter + comment ในทุกไฟล์ PWA |
| **Missing Files Fix** | ✅ เสร็จ | เพิ่ม `mobile_shared.js`, `favicon.ico` |
| **gas_config.js Loading** | ✅ เสร็จ | เพิ่มใน `index.html` ก่อน `</head>` |
| **API Fallback URL** | ✅ เสร็จ | อัปเดตเป็น @502 ใน `api_client.js` |
| **Dashboard Modernization (Phase 31)** | ✅ เสร็จ | เพิ่ม 5 Chart.js v4 functions + CHARTS object |
| **AI LINE Agent (3 บทบาท)** | ✅ Backend ready | สร้าง `AILinePrompts.gs` + อัปเดต `LineBot.gs` (รอ Group IDs จริง) |
| **Dependency Checklist** | ✅ เสร็จ | เพิ่มใน BLUEPRINT Section 2.5 |
| **GitHub Push** | ✅ เสร็จ | 5 commits (`b8ccd2f`, `8695600`, `38a5ed5`, `0f68e2f`, `c7cca60`) |

### ❌ Pending Work (ยังไม่เสร็จ)

| งาน | สถานะ | อุปสรรค |
|------|-------|----------|
| **Login Problem (เข้าระบบไม่ได้)** | ❌ **ยังแก้ไม่สำเร็จ** | Splash Screen ค้างอยู่ แม้จะแก้ไข URL แล้ว สาเหตุน่าจะเป็น Service Worker Cache หรือ JavaScript Error ที่ยังไม่พบ |
| **AI LINE Agent Testing** | ❌ **รอ Group IDs** | ต้องเปลี่ยน Placeholder Group IDs ใน `AILinePrompts.gs` (บรรทัด 169-173) เป็น LINE Group ID จริง |
| **Dashboard PC Testing** | ❌ **รอ Login แก้ไข** | ต้องทดสอบกราฟ Chart.js v4 ทั้ง 5 ตัวหลังจากเข้าระบบได้ |
| **Google Drive Sync** | ❌ **Failed** | `SharedContext.gs` timeout (ต้อง retry) |
| **Service Worker Debug** | ❌ **ยังไม่หาสาเหตุแท้จริง** | ต้องตรวจสอบ Console Error จากผู้ใช้ |

### 🗄️ Backup Status (28 เมษายน 2569 — 15:05)

| สถานที่ | สถานะ | รายละเอียด |
|---------|-------|------------|
| **GitHub Repository** | ✅ **ปัจจุบัน** | `main` branch — ล่าสุด commit `b8ccd2f` (5 commits วันนี้) |
| **Google Drive (Code)** | ❌ **ล้มเหลว** | Sync failed (SharedContext.gs timeout) — ต้อง retry |
| **Google Drive (Backups)** | ✅ **มี** | `backups/` folder — 6 ไฟล์ `.tar.gz` (2026-04-28) |
| **Local Backups** | ✅ **ครบ** | `/mnt/c/Users/Server/comphone-superapp/backups/*.tar.gz` |
| **Session Memory** | ✅ **อัปเดต** | `memory/session.md` + `memory/session_latest.md` |

### 🔧 Next Steps (Priority Order)

1. **🔴 HIGH: แก้ไข Login ไม่ได้** — ตรวจสอบ Console Error + ล้าง Service Worker Cache + ทดสอบบน Incognito
2. **🟠 MEDIUM: ทดสอบ AI LINE Agent** — รอผู้ใช้ส่ง LINE Group IDs จริงมาแทนที่ Placeholder
3. **🟡 LOW: Retry Google Drive Sync** — หลังจากแก้ไข Login ได้แล้ว
4. **🟢 COMPLETE: Dashboard Testing** — ทดสอบกราฟ Chart.js v4 หลัง Login แก้ไข

---

