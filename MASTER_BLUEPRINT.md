# COMPHONE SUPER APP V5.5 — Master Blueprint

เอกสารนี้เป็นพิมพ์เขียวหลักของระบบ COMPHONE SUPER APP V5.5 ซึ่งเป็นระบบบริหารจัดการร้านซ่อมมือถือและอุปกรณ์ไอทีแบบครบวงจร

## 1. โครงสร้างระบบ (System Architecture)

### 1.0. Architecture Principle (V5.5.8 — FINAL)

| Layer | Technology | Role |
|-------|-----------|------|
| **Backend** | Google Apps Script | **API ONLY** — JSON responses เท่านั้น |
| **Frontend** | PWA (GitHub Pages) | **UI Source — SINGLE SOURCE OF TRUTH** |
| **Database** | Google Sheets | Data Storage |

> ⚠️ **CRITICAL RULE: GAS เป็น API Backend เท่านั้น** — ไม่มี `HtmlService` อีกต่อไป (V5.5.8+)  
> ✅ **UI Source = PWA ONLY** — `https://comphone.github.io/comphone-superapp/pwa/`  
> ❌ ห้าม render HTML ผ่าน GAS ไม่ว่ากรณีใด  
> ❌ ห้ามมี Dashboard ซ้ำซ้อนหลายที่

### 1.1. กฎเหล็ก (The Golden Rules)
- **RULE 0: Triple Sync** — ทุกครั้งที่แก้โค้ด ต้อง Sync 3 ที่: GitHub, Google Drive, และ `session.md`
- **RULE 1: Single Source of Truth** — ใช้ `callApi()` จาก `api_client.js` เท่านั้น ห้ามใช้ `fetch()` ตรงๆ
- **RULE 2: Authentication** — เก็บ Token ไว้ที่ `localStorage['comphone_auth_session']` เท่านั้น เพื่อแชร์ระหว่าง PC และ Mobile
- **RULE 3: UI Source** — **PWA ONLY** — ไม่มี GAS UI อีกต่อไป
- **RULE 4: Session Storage** — **ห้ามใช้ `ScriptProperties` เก็บ session** — ใช้ `CacheService.getScriptCache()` เท่านั้น

> **🔒 SESSION RULE (V5.5.8 — Final Lock)**
>
> | รายการ | กฎ | เหตุผล |
> |--------|------|----------|
> | `ScriptProperties.setProperty('SESSION_*')` | ❌ ห้าม | Session leak, เกิน 50 properties |
> | `CacheService.getScriptCache()` | ✅ ใช้ | TTL 6h, auto-expire, ไม่ค้าง |
> | `SESSION_MD_CONTENT` | ✅ ยกเว้น | ใช้สำหรับ DriveSync เท่านั้น |
> | Token format | `<32hex>.<8hex_hmac>` | HMAC-SHA256 signed |
>
> **Guard Functions (Security.gs — V5.5.8):**
> - `blockSessionPropertyUsage_()` — ตรวจและลบ SESSION_* ทันทีเมื่อพบ
> - `auditSessionLeak_()` — ตรวจสอบทุกวัน 03:00 + auto-fix (trigger: daily)
> - `cleanupSessions()` — ลบ SESSION_* ทุก 6 ชั่วโมง (trigger: hourly)

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

## 🔒 PRODUCTION STATUS: LOCKED (V5.5.8)

> **ระบบผ่าน Final Sign-Off แล้ว — พร้อมใช้งาน Production 100%**

| Area | Status | รายละเอียด |
|------|--------|------------|
| **Backend** | ✅ API Only | GAS = JSON API เท่านั้น ไม่มี HtmlService |
| **Frontend** | ✅ PWA Only | UI Source = `https://comphone.github.io/comphone-superapp/pwa/` |
| **Session** | ✅ Hardened | CacheService + HMAC-SHA256 + max 3 sessions/user |
| **Rate Limit** | ✅ Active | 60 req/min + burst 10/5s per token |
| **Security Log** | ✅ Active | IP + endpoint + timestamp ใน CacheService |
| **Trigger Safety** | ✅ Locked | `resetTriggers_()` ก่อนสร้างใหม่ ไม่มี duplicate |
| **Backup** | ✅ Daily | Snapshot ทุกวัน 00:00 + log BACKUP_SUCCESS |
| **Audit** | ✅ Daily | `auditSessionLeak_()` ทุกวัน 03:00 |
| **Version Sync** | ✅ Locked | `APP_VERSION === CONFIG.VERSION === 5.5.8` |
| **Monitoring** | ✅ Active | `getSystemMetrics()` — sessions, security, triggers, properties |
| **Anti-Pattern** | ✅ 0 Issues | callAPI=0, callGas=0, AUTH.token=0, SESSION_*=0 |

### Trigger Schedule (Production)

| Function | Schedule | Handler |
|----------|----------|---------|
| `autoBackup` | ทุกวัน 00:00 | AutoBackup.gs |
| `autoSyncToDrive` | ทุกวัน 02:00 | DriveSync.gs |
| `auditSessionLeak_` | ทุกวัน 03:00 | Security.gs |
| `cronMorningAlert` | ทุกวัน 06:00 | Alerts.gs |
| `sendAfterSalesAlerts` | ทุกวัน 08:00 | AfterSales.gs |
| `geminiReorderSuggestion` | ทุกวัน 09:00 | Inventory.gs |
| `cleanupSessions` | ทุก 6 ชั่วโมง | Auth.gs |
| `cronHealthCheck` | ทุก 30 นาที | HealthMonitor.gs |

### Monitoring Dashboard (V5.5.8)

ระบบมี Real-time Monitoring Dashboard สำหรับผู้ดูแลระบบ:
- **URL:** `https://comphone.github.io/comphone-superapp/pwa/monitoring_dashboard.html`
- **Features:** 
  - 8 Metric Cards (Health, Latency, Sessions, Rate Limit, Errors, Triggers, Properties, Version)
  - API Latency History Chart (20 ค่าล่าสุด)
  - Security Events Chart (Rate Limit vs Invalid Token)
  - Trigger Schedule Table
  - Security Log Viewer พร้อม Filter
  - Auto-refresh ทุก 5 วินาที

### Next Phase: SaaS & Multi-tenant

- Multi-tenant support (รองรับหลายร้านค้าในระบบเดียว)
- Advanced analytics & Business Intelligence
- Role-based Access Control (RBAC) ขั้นสูง

---
*อัปเดตล่าสุด: 19 เมษายน 2026 (V5.5.8 — Production Hardened + Final Sign-Off)*
