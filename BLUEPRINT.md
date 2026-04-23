# 📘 COMPHONE SUPER APP — BLUEPRINT (Single Source of Truth)

> **เวอร์ชัน:** v5.6.6 (PWA) / v5.6.5 (GAS Backend @490)
> **วันที่:** 23 เมษายน 2569 | **Phase:** 26.6
> **สถานะ:** 🟢 PRODUCTION — Active Development
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
│                    COMPHONE SUPER APP v5.6.6                    │
│                                                                 │
│  ┌──────────────┐    ┌──────────────────┐    ┌──────────────┐  │
│  │  LINE Bot    │───►│ Cloudflare Worker│───►│  GAS @490    │  │
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

## 3. URLs & Endpoints

| รายการ | URL | สถานะ |
|--------|-----|-------|
| **GAS Web App (Production)** | `https://script.google.com/macros/s/AKfycbwC8youQ6kfwGZ5DRi0P757KrJh9vhvesE7n8VcVTaj0v54ZbXdpqoJXVh9XzfqwcqtMA/exec` | ✅ Active |
| **LINE Webhook** | `https://comphone-line-webhook.narinoutagit.workers.dev/line/webhook` | ✅ Active |
| **PWA Mobile App** | `https://comphone.github.io/comphone-superapp/` | ✅ Active |
| **PC Dashboard** | `https://comphone.github.io/comphone-superapp/dashboard_pc.html` | ✅ Active |
| **Executive Dashboard** | `https://comphone.github.io/comphone-superapp/executive_dashboard.html` | ✅ Active |
| **Monitoring Dashboard** | `https://comphone.github.io/comphone-superapp/monitoring_dashboard.html` | ✅ Active |
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
│   ├── Config.gs             ← Configuration & Script Properties
│   ├── Dashboard.gs          ← Dashboard data provider
│   ├── WorkflowEngine.gs     ← AI workflow engine
│   ├── LineBot.gs            ← LINE Bot message handler
│   ├── LineBotIntelligent.gs ← AI-powered LINE responses
│   ├── DriveSync.gs          ← Google Drive sync
│   ├── appsscript.json       ← clasp config
│   └── ... (67 .gs files total)
├── pwa/                      ← PWA Frontend (deploy to GitHub Pages)
│   ├── index.html            ← Mobile PWA (main entry)
│   ├── dashboard_pc.html     ← PC Dashboard
│   ├── executive_dashboard.html
│   ├── monitoring_dashboard.html
│   ├── app.js                ← Mobile app logic
│   ├── sw.js                 ← Service Worker (v5.6.6)
│   ├── gas_config.js         ← Auto-generated GAS URL
│   ├── ai_executor_runtime.js ← AI execution framework
│   ├── api_client.js         ← Unified API caller
│   ├── offline_db.js         ← IndexedDB offline queue
│   ├── style.css             ← Main stylesheet
│   ├── manifest.json         ← PWA manifest
│   └── ... (47+ files total)
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

### 🔧 In Progress

| ฟีเจอร์ | สถานะ | หมายเหตุ |
|---------|-------|---------|
| **PC Section Loaders** | 🔧 Basic | Jobs/Revenue/PO/CRM/Settings มี data view แล้ว แต่ยังไม่มี CRUD |
| **Inventory UI** | 🔧 Placeholder | แสดง KPI สต็อกต่ำ แต่ยังไม่มีหน้าจัดการเต็มรูปแบบ |
| **Auto-Tax Engine** | 🔧 Planned | VAT 7% / WHT 3% — Frontend calculation |

### 📋 Planned (Roadmap)

| Phase | ฟีเจอร์ | GAS Action | Priority |
|-------|---------|-----------|----------|
| **Phase 1** | Open Job Form | `openJob` | 🔴 สูง |
| **Phase 1** | Assign Technician | `updateJobStatus` | 🔴 สูง |
| **Phase 1** | Job Timeline View | `getJobTimeline` | 🔴 สูง |
| **Phase 2** | Billing / Receipt | `createBilling` | 🟠 กลาง |
| **Phase 2** | PromptPay QR | Static QR | 🟠 กลาง |
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
- **Trigger:** Push to `main` branch
- **Action:** `auto-deploy.yml` uploads `./pwa/` as site root
- **Result:** Files served at `https://comphone.github.io/comphone-superapp/`
- **Important:** Paths in code use `/comphone-superapp/` NOT `/comphone-superapp/pwa/`

---

## 9. Configuration Rules

### 9.1 GAS Script Properties (49/50)
- Max 50 properties per script
- Property Guard monitors usage
- High-frequency data → dedicated Spreadsheet (not Script Properties)
- **RULE:** Never exceed 50 — system will reject writes

### 9.2 Service Worker
- **Version:** `CACHE_V = 'comphone-v5.6.6'`
- **Timeout:** 15 seconds (GAS cold start can take 5-10s)
- **Strategies:** Cache First (static) | Network First (API) | Network Only (webhook)
- **Offline Queue:** IndexedDB `comphone_offline` v2 (3 stores: action_queue, data_cache, queue)
- **Cache Invalidation:** On version bump, SW clears old caches and reloads all tabs

### 9.3 Version Synchronization
All these MUST match on deploy:

| Surface | File | Key |
|---------|------|-----|
| SW Cache | `sw.js` | `CACHE_V = 'comphone-v5.6.6'` |
| PC Dashboard | `dashboard_pc.html` | `__APP_VERSION = 'v5.6.6'` |
| GAS Config | `Config.gs` | `CONFIG.VERSION = '5.6.5'` |
| gas_config.js | `gas_config.js` | Auto-generated by deploy |

---

## 10. Known Issues & Resolutions

### ✅ Recently Fixed (2026-04-23)

| ปัญหา | สาเหตุ | แก้ไข |
|-------|--------|-------|
| Mobile PWA 404 | Path `/comphone-superapp/pwa/` ผิด (GitHub Pages ไม่มี /pwa/) | แก้ 5 ไฟล์: sw.js, manifest.json, index.html, app.js, push_notifications.js |
| SW IndexedDB error | DB version mismatch (SW v2, offline_db v1) | Bump offline_db.js to v2, sync stores |
| gas_config.js URL ผิด | Deploy จับ URL ผิด deployment | แก้ URL ตรง |
| AI Validation 12/16 fail | Recursive test() bug + typeof mismatch | แก้ validation script, add context-aware skip |
| Dashboard "กำลังพัฒนา" | loadSection() แสดง placeholder | เปลี่ยนเป็น live data loaders (6 sections) |
| SW timeout 3s | API ใช้เวลา 11s แต่ timeout 3s | เพิ่มเป็น 15s |
| POST → 405 error | GAS redirect POST → GET (302) | เปลี่ยนเป็น GET ทั้งหมด |
| system_graph_data.js 404 | ไฟล์ไม่มี | สร้าง stub file |

### ⚠️ Current Watchlist

| รายการ | สถานะ | หมายเหตุ |
|-------|-------|---------|
| Browser cache | ⚠️ | ผู้ใช้ต้อง Hard Refresh หลัง deploy |
| Large data response | ⚠️ | getDashboardData ~11s, ต้อง optimize |
| AI Validation on non-dashboard | ✅ | Schema tests skip gracefully |

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
- **Freeze tag:** `v5.6.5-freeze`
- **Hotfix branch:** `hotfix/{YYYYMMDD}-{description}`
- **No direct push to main** for architecture changes
- **Regression test required** before merge

---

> **เอกสารนี้คือ Single Source of Truth** — อ้างอิงไฟล์นี้ก่อนเริ่มงานทุกครั้ง
> อัปเดตล่าสุด: 2026-04-23 | Phase 26.6 | Commit `345c838`
