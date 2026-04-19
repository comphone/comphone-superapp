# COMPHONE SUPER APP — MASTER BLUEPRINT v5.5.4

> **อัปเดตล่าสุด:** 18 เมษายน 2569 | **สถานะ:** Production Ready (MISSION COMPLETE)  
> **ผู้พัฒนา:** Manus AI + comphone team  
> **Repository:** https://github.com/comphone/comphone-superapp

---

## 1. สถาปัตยกรรมระบบ (System Architecture)

```
┌─────────────────────────────────────────────────────────────────┐
│                    COMPHONE SUPER APP V5.5.4                    │
│                                                                 │
│  ┌──────────────┐    ┌──────────────────┐    ┌──────────────┐  │
│  │  LINE Bot    │───►│ Cloudflare Worker│───►│  GAS @439    │  │
│  │  (Webhook)   │    │ (Async Proxy)    │    │  (Backend)   │  │
│  └──────────────┘    └──────────────────┘    └──────┬───────┘  │
│                                                      │          │
│  ┌──────────────┐                            ┌──────▼───────┐  │
│  │  PWA Mobile  │◄──────── REST API ─────────│ Google Sheets│  │
│  │  (Frontend)  │                            │  (Database)  │  │
│  └──────────────┘                            └──────────────┘  │
│                                                                 │
│  ┌──────────────┐                            ┌──────────────┐  │
│  │  PC Dashboard│◄──────── REST API ─────────│ Google Drive │  │
│  │  (Responsive)│                            │  (Files/PDF) │  │
│  └──────────────┘                            └──────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow
```
User (LINE) → POST /line/webhook
→ Cloudflare Worker (ตอบ 200 OK ทันที <50ms)
→ ctx.waitUntil(fetch(GAS_URL @439)) [async, ไม่รอผล]
→ GAS ประมวลผล → ตอบกลับ LINE / บันทึก Sheet / แจ้งเตือน Group

User (PWA) → POST GAS_URL @439
→ GAS ประมวลผล → ส่ง JSON กลับ
→ PWA แสดงผล
```

---

## 2. URLs และ Endpoints สำคัญ

| รายการ | URL | สถานะ |
|--------|-----|-------|
| **GAS Web App (หลัก @439)** | `https://script.google.com/macros/s/AKfycby-IRTHbHMfCZ8TiXSAJ8zr_T6xQcmJNvGNYYI2X2VoAEMPwYtHwlCp1mf9f6IzWSSJfQ/exec` | ✅ ใช้งานอยู่ |
| **GAS Web App (@438)** | `https://script.google.com/macros/s/AKfycbw87FkEDeoaxQ6mziojRA0HJKUUNGotFlEPGc95UgbbcSrGgjo-TqoxH8D9HUYlMO0V0Q/exec` | ⚠️ เก่า |
| **GAS Web App (@437)** | `https://script.google.com/macros/s/AKfycbye7oTIj-cQjMtSm5CZBJ81mkOHO7GZm9iKFUjcSFBM_DgSsDZXr919Y8D-WezT2jBEUA/exec` | ⚠️ เก่า |
| **LINE Webhook (Cloudflare Worker)** | `https://comphone-line-webhook.narinoutagit.workers.dev/line/webhook` | ✅ ใช้งานอยู่ |
| **PWA Mobile App** | `https://comphone.github.io/comphone-superapp/pwa/` | ✅ ใช้งานอยู่ |
| **PC Dashboard** | `https://comphone.github.io/comphone-superapp/pwa/dashboard_pc.html` | ✅ ใช้งานอยู่ |
| **GitHub Repository** | `https://github.com/comphone/comphone-superapp` | ✅ Public |
| **Google Sheets Database** | `https://docs.google.com/spreadsheets/d/19fkLbSbBdz0EjAV8nE9LLwBiHeIN50BTPptt_PJCRGA` | ✅ ใช้งานอยู่ |
| **Google Drive Root Folder** | `https://drive.google.com/drive/folders/1YRZRG9r1Y_jMHg2XFFKYjK4Hx-sW0Eq0` | ✅ ใช้งานอยู่ |
| **LINE Developers Console** | `https://developers.line.biz/console/` | — |
| **Cloudflare Dashboard** | `https://dash.cloudflare.com/838d6a5a046bfaa2a2003bd8005dd80b` | — |

---

## 3. Script Properties (GAS Environment Variables)

> ตั้งค่าผ่าน: `POST {"action": "setScriptProperties", "properties": {...}}` ไปที่ GAS URL @439  
> ตรวจสอบ: `POST {"action": "systemStatus"}` → ดูส่วน `config`

| Property Key | ค่า | สถานะ |
|-------------|-----|-------|
| `DB_SS_ID` | `19fkLbSbBdz0EjAV8nE9LLwBiHeIN50BTPptt_PJCRGA` | ✅ ตั้งค่าแล้ว |
| `ROOT_FOLDER_ID` | `1YRZRG9r1Y_jMHg2XFFKYjK4Hx-sW0Eq0` | ✅ ตั้งค่าแล้ว |
| `WEB_APP_URL` | `https://script.google.com/macros/s/AKfycby-IRTHbHMfCZ8TiXSAJ8zr_T6xQcmJNvGNYYI2X2VoAEMPwYtHwlCp1mf9f6IzWSSJfQ/exec` | ✅ @439 (อัปเดตแล้ว) |
| `TAX_MODE` | `VAT7` (หรือ `ZERO`, `EXEMPT`, `MIXED`) | ✅ ตั้งค่าแล้ว |
| `BRANCH_ID` | `HQ` | ✅ ตั้งค่าแล้ว |
| `COMPANY_NAME` | `ร้านคอมโฟน` | ✅ ตั้งค่าแล้ว |
| `COMPANY_TAX_ID` | `1234567890123` | ✅ ตั้งค่าแล้ว |
| `LINE_CHANNEL_ACCESS_TOKEN` | `[ดูใน LINE Developers Console > Messaging API > Channel access token]` | ✅ ตั้งค่าแล้ว |
| `GEMINI_API_KEY` | `[ดูใน Google AI Studio > API Keys]` | ✅ ตั้งค่าแล้ว |
| `LINE_GROUP_TECHNICIAN` | `C8ad22a115f38c9ad3cb5ea5c2ff4863b` | ✅ ตั้งค่าแล้ว |
| `LINE_GROUP_ACCOUNTING` | `C7b939d1d367e6b854690e58b392e88cc` | ✅ ตั้งค่าแล้ว |
| `LINE_GROUP_PROCUREMENT` | `Cfd103d59e77acf00e2f2f801d391c566` | ✅ ตั้งค่าแล้ว |
| `LINE_GROUP_SALES` | `Cb7cc146227212f70e4f171ef3f2bce15` | ✅ ตั้งค่าแล้ว |
| `LINE_GROUP_EXECUTIVE` | `Cb85204740fa90e38de63c727554e551a` | ✅ ตั้งค่าแล้ว |

### วิธีตั้งค่า Script Properties ใหม่
```bash
python3.11 -c "
import requests
GAS = 'https://script.google.com/macros/s/AKfycby-IRTHbHMfCZ8TiXSAJ8zr_T6xQcmJNvGNYYI2X2VoAEMPwYtHwlCp1mf9f6IzWSSJfQ/exec'
r = requests.post(GAS, json={
  'action': 'setScriptProperties',
  'properties': {
    'DB_SS_ID': '19fkLbSbBdz0EjAV8nE9LLwBiHeIN50BTPptt_PJCRGA',
    'ROOT_FOLDER_ID': '1YRZRG9r1Y_jMHg2XFFKYjK4Hx-sW0Eq0',
    'WEB_APP_URL': 'GAS_URL_@439',
    'LINE_CHANNEL_ACCESS_TOKEN': 'YOUR_TOKEN',
    'GEMINI_API_KEY': 'YOUR_KEY',
    'LINE_GROUP_TECHNICIAN': 'C8ad22a115f38c9ad3cb5ea5c2ff4863b',
    'LINE_GROUP_ACCOUNTING': 'C7b939d1d367e6b854690e58b392e88cc',
    'LINE_GROUP_PROCUREMENT': 'Cfd103d59e77acf00e2f2f801d391c566',
    'LINE_GROUP_SALES': 'Cb7cc146227212f70e4f171ef3f2bce15',
    'LINE_GROUP_EXECUTIVE': 'Cb85204740fa90e38de63c727554e551a'
  }
})
print(r.json())
"
```

---

## 4. Cloudflare Configuration

| รายการ | ค่า |
|--------|-----|
| **Account ID** | `838d6a5a046bfaa2a2003bd8005dd80b` |
| **Account Name** | narinoutagit's Account |
| **Worker Name** | `comphone-line-webhook` |
| **Worker URL** | `https://comphone-line-webhook.narinoutagit.workers.dev` |
| **LINE Webhook URL** | `https://comphone-line-webhook.narinoutagit.workers.dev/line/webhook` |
| **Worker Version ID** | `e9cce19a-8343-449a-b258-05d42ad28de3` |
| **API Token Name** | `comphone-worker-deploy` |
| **API Token** | `[ดูใน Cloudflare Dashboard > My Profile > API Tokens]` |
| **Zone / Domain** | `comphones101.win` |
| **Worker Source (Local)** | `/home/ubuntu/comphone-line-webhook/src/index.js` |
| **wrangler.toml (Local)** | `/home/ubuntu/comphone-line-webhook/wrangler.toml` |

### Deploy Cloudflare Worker
```bash
cd /home/ubuntu/comphone-line-webhook
wrangler deploy
# หรือ
npx wrangler deploy
```

### Worker Logic (สรุป)
```javascript
// src/index.js — รับ LINE webhook → forward ไป GAS async
export default {
  async fetch(request, env, ctx) {
    if (request.url.includes('/line/webhook')) {
      const body = await request.text();
      ctx.waitUntil(fetch(GAS_URL, { method: 'POST', body })); // async
      return new Response('OK', { status: 200 }); // ตอบ LINE ทันที
    }
  }
}
```

---

## 5. GAS Script IDs

| รายการ | ID / URL |
|--------|---------|
| **GAS Script ID** | `1-aoCd5gXoo1dX4FjW62l8JknR3ZPiaf1W7YEmEdtq8gnRzSp4Hwj6043` |
| **GAS Project URL** | `https://script.google.com/d/1-aoCd5gXoo1dX4FjW62l8JknR3ZPiaf1W7YEmEdtq8gnRzSp4Hwj6043/edit` |
| **Deploy @439 (หลัก)** | `AKfycby-IRTHbHMfCZ8TiXSAJ8zr_T6xQcmJNvGNYYI2X2VoAEMPwYtHwlCp1mf9f6IzWSSJfQ` |
| **Deploy @438** | `AKfycbw87FkEDeoaxQ6mziojRA0HJKUUNGotFlEPGc95UgbbcSrGgjo-TqoxH8D9HUYlMO0V0Q` |
| **Deploy @437** | `AKfycbye7oTIj-cQjMtSm5CZBJ81mkOHO7GZm9iKFUjcSFBM_DgSsDZXr919Y8D-WezT2jBEUA` |
| **clasp.json (Local)** | `/home/ubuntu/github-clone/clasp-ready/.clasp.json` |

### Deploy GAS ใหม่
```bash
# วิธีที่ 1: ใช้ script อัตโนมัติ
python3.11 /home/ubuntu/refresh_clasp_push.py

# วิธีที่ 2: manual
cd /home/ubuntu/github-clone/clasp-ready
clasp push
clasp deploy --description "v5.5.x"
```

---

## 6. Default Login / Test Account

| รายการ | ค่า |
|--------|-----|
| **ชื่อ** | admin |
| **Role** | admin |
| **Script URL** | GAS @439 URL (ด้านบน) |
| **PWA Setup** | เปิด PWA → กรอกชื่อ → เลือก Role → ใส่ Script URL → กด "เริ่มใช้งาน" |
| **ไม่ต้อง Login** | ระบบจำข้อมูลใน localStorage — เปิดครั้งเดียวพอ |

---

## 7. GAS Files (clasp-ready/)

| ไฟล์ | หน้าที่ | ขนาด |
|------|---------|------|
| `Router.gs` | HTTP Router — รับ POST/GET, route ไปยัง handler | ~300 บรรทัด |
| `Config.gs` | ตั้งค่าระบบ, Script Properties, Sheet Names | ~150 บรรทัด |
| `JobManager.gs` | ระบบงานซ่อม — CRUD, Status Machine | ~400 บรรทัด |
| `JobStateMachine.gs` | State transitions 12 ขั้นตอน | ~200 บรรทัด |
| `JobsHandler.gs` | HTTP handlers สำหรับ Job actions | ~150 บรรทัด |
| `InventoryManager.gs` | สต็อก — CRUD, Barcode, Movement | ~350 บรรทัด |
| `Inventory.gs` | Purchase Order functions | ~200 บรรทัด |
| `BillingManager.gs` | ใบเสร็จ — PDF, PromptPay QR | ~300 บรรทัด |
| `CustomerManager.gs` | CRM — CRUD, Filter, History | ~250 บรรทัด |
| `LineBot.gs` | LINE Webhook handler, Commands | ~300 บรรทัด |
| `FlexMessage.gs` | Flex Message templates (4 แบบ) | ~400 บรรทัด |
| `NotifyManager.gs` | LINE Group notifications | ~200 บรรทัด |
| `GeminiAI.gs` | Gemini AI — Reorder suggestions | ~150 บรรทัด |
| `AttendanceManager.gs` | Clock In/Out, Weekly summary | ~200 บรรทัด |
| `AfterSalesManager.gs` | After-sales follow-up | ~200 บรรทัด |
| `PurchaseOrderManager.gs` | Purchase Order management | ~250 บรรทัด |
| `Dashboard.gs` | Dashboard data aggregation | ~300 บรรทัด |
| `DashboardV55.gs` | Dashboard V5.5 enhancements | ~200 บรรทัด |
| `DeployGuide.gs` | initSystem(), setupTriggers() | ~200 บรรทัด |
| `Utils.gs` | Utility functions | ~150 บรรทัด |
| `ReceiptTemplate.html` | HTML template สำหรับ PDF ใบเสร็จ | ~100 บรรทัด |
| `TaxEngine.gs` | ระบบคำนวณภาษี VAT/WHT | ~360 บรรทัด |
| `TaxDocuments.gs` | สร้าง PDF ใบกำกับภาษี/ภงด. | ~340 บรรทัด |
| `WarrantyManager.gs` | ระบบรับประกันสินค้า | ~460 บรรทัด |
| `MultiBranch.gs` | ระบบจัดการหลายสาขา | ~180 บรรทัด |
| `HealthMonitor.gs` | ตรวจสอบสถานะระบบ + Security | ~330 บรรทัด |

---

## 8. GAS API Endpoints (POST ทั้งหมด)

> **วิธีเรียก:** `POST GAS_URL` พร้อม body `{"action": "...", ...params}`

### System Actions
| Action | Parameters | Response |
|--------|-----------|---------|
| `systemStatus` | — | `{overall, database, config, triggers, summary}` |
| `getComphoneConfig` | — | `{app_name, spreadsheet_id, sheets, ...}` |
| `initSystem` | — | สร้าง Sheets 13 ตาราง + Triggers 6 ตัว |
| `setupTriggers` | — | ตั้ง Triggers ทั้งหมด |
| `setScriptProperties` | `{properties: {...}}` | `{success, set, skipped}` |
| `validateConfig` | — | ตรวจสอบ config ครบหรือไม่ |
| `getSchemaInfo` | — | Schema ของทุก Sheet |

### Auth Actions
| Action | Parameters | Response |
|--------|-----------|---------|
| `loginUser` | `{username, password}` | `{success, user, token}` |
| `verifySession` | `{token}` | `{success, user}` |
| `listUsers` | — | `{users}` |
| `createUser` | `{name, role, username, password}` | `{success, user}` |
| `updateUserRole` | `{userId, role}` | `{success}` |

### Job Actions
| Action | Parameters | Response |
|--------|-----------|---------|
| `getDashboardData` | — | `{success, summary, jobs, alerts, status_distribution}` |
| `openJob` / `createJob` | `{customer_name, phone, symptom, device, tech, price, notes}` | `{success, job_id}` |
| `updateJobStatus` | `{job_id, status, note, tech}` | `{success}` |
| `updateJobById` | `{job_id, ...fields}` | `{success}` |
| `transitionJob` | `{job_id, to_state, note}` | `{success, new_state}` |
| `getJobTimeline` | `{job_id}` | `{success, timeline[]}` |
| `addQuickNote` | `{job_id, note}` | `{success}` |
| `getJobStateConfig` | — | `{states, transitions}` |
| `getJobQRData` | `{job_id}` | `{success, qr_data}` |

### Inventory Actions
| Action | Parameters | Response |
|--------|-----------|---------|
| `inventoryOverview` | — | `{success, total_items, items[]}` |
| `addInventoryItem` | `{name, sku, qty, price, min_qty}` | `{success, item_id}` |
| `updateInventoryItem` | `{item_id, ...fields}` | `{success}` |
| `deleteInventoryItem` | `{item_id}` | `{success}` |
| `transferStock` | `{item_id, qty, note}` | `{success}` |
| `checkStock` | `{sku}` | `{success, qty, item}` |
| `barcodeLookup` | `{barcode}` | `{success, item}` |
| `getStockMovementHistory` | `{item_id, limit}` | `{success, movements[]}` |
| `geminiReorderSuggestion` | — | `{success, suggestions[]}` |
| `createPurchaseOrder` | `{supplier, items[], notes}` | `{success, po_id}` |
| `listPurchaseOrders` | `{limit}` | `{success, total, items[]}` |
| `receivePurchaseOrder` | `{po_id}` | `{success}` |

### Customer Actions
| Action | Parameters | Response |
|--------|-----------|---------|
| `listCustomers` | — | `{success, total, customers[]}` |
| `createCustomer` | `{name, phone, address, type, notes}` | `{success, customer_id}` |
| `updateCustomer` | `{customer_id, ...fields}` | `{success}` |
| `getCustomer` | `{customer_id}` | `{success, customer}` |

### Billing Actions
| Action | Parameters | Response |
|--------|-----------|---------|
| `createBilling` | `{job_id, items[], discount, note}` | `{success, billing_id, pdf_url}` |
| `getJobQRData` | `{job_id}` | `{success, promptpay_qr}` |

### Attendance Actions
| Action | Parameters | Response |
|--------|-----------|---------|
| `clockIn` | `{tech, note}` | `{success}` |
| `clockOut` | `{tech, note}` | `{success, work_hours}` |
| `getAttendanceReport` | `{tech, days}` | `{success, records[], total}` |
| `getTechHistory` | `{tech, limit}` | `{success, tech, summary, jobs[], attendance[]}` |
| `getAllTechsSummary` | — | `{success, techs[]}` |

### After-Sales Actions
| Action | Parameters | Response |
|--------|-----------|---------|
| `getAfterSalesDue` | — | `{success, items[], total}` |
| `createAfterSalesRecord` | `{customer_id, job_id, due_date}` | `{success}` |
| `logAfterSalesFollowUp` | `{record_id, note, followup_by, next_action}` | `{success}` |
| `getAfterSalesSummary` | — | `{success, summary}` |

### Tax & Warranty Actions
| Action | Parameters | Response |
|--------|-----------|---------|
| `taxAction` | `{subAction, ...}` | `{success, ...}` |
| `getBranchList` | — | `{success, branches[], current}` |
| `getBranchSummary` | `{branch_id}` | `{success, summary}` |
| `healthCheck` | — | `{success, health}` |
| `getHealthHistory` | `{limit}` | `{success, logs[]}` |

---

## 9. Database Schema (Google Sheets — 13 ตาราง)

| Sheet Name | คอลัมน์หลัก | แถวปัจจุบัน |
|-----------|------------|------------|
| `DBJOBS` | id, customer_name, phone, symptom, device, status, tech, price, created, notes | 18 |
| `DB_INVENTORY` | id, name, sku, qty, min_qty, price, barcode, category | 1 |
| `DB_CUSTOMERS` | id, name, phone, address, type, notes, total_jobs, total_spent, last_job_date | 0 |
| `DB_BILLING` | id, job_id, items, subtotal, discount, total, status, pdf_url, created | 1 |
| `DB_STOCK_MOVEMENTS` | id, item_id, type, qty, note, created_by, created | 0 |
| `DB_JOB_ITEMS` | id, job_id, item_id, qty, price, note | 0 |
| `DB_PHOTO_QUEUE` | id, job_id, url, type, status, created | 0 |
| `DB_PURCHASE_ORDERS` | id, supplier, items, total, status, created_by, created | 0 |
| `DB_ATTENDANCE` | id, tech, clock_in, clock_out, work_hours, note, date | 0 |
| `DB_AFTER_SALES` | id, customer_id, job_id, due_date, status, last_followup, note | 0 |
| `DB_JOB_LOGS` | id, job_id, action, note, by, timestamp | 0 |
| `DB_USERS` | id, name, role, username, password_hash, active, created | 1 |
| `DB_ACTIVITY_LOG` | id, action, user, detail, timestamp | 3 |
| `DB_TAX_REPORT` | id, period, records, summary | 0 |
| `DB_WARRANTY` | id, job_id, customer, status, start, end | 0 |
| `DB_HEALTH_LOG` | id, timestamp, status, errors | 0 |

---

## 10. Triggers (Scheduled Tasks — 6 ตัว)

| Function | ประเภท | ความถี่ | หน้าที่ |
|----------|--------|---------|---------|
| `cronMorningAlert` | CLOCK | ทุกวัน 08:00 | สรุปงานประจำวัน → LINE ทุกกลุ่ม |
| `checkLowStockAlert` | CLOCK | ทุก 6 ชั่วโมง | แจ้งเตือนสต็อกต่ำ → LINE กลุ่มจัดซื้อ |
| `sendAfterSalesAlerts` | CLOCK | ทุกวัน 09:00 | แจ้งเตือน After-Sales ที่ครบกำหนด |
| `geminiReorderSuggestion` | CLOCK | ทุกจันทร์ 08:00 | AI แนะนำสั่งซื้อสินค้า |
| `autoBackup` | CLOCK | ทุกวัน 23:00 | Backup Google Sheets อัตโนมัติ |
| `getCRMSchedule` | CLOCK | ทุกวัน 10:00 | ตรวจสอบนัดหมาย CRM |
| `cronTaxReminder` | CLOCK | วันที่ 1 ของเดือน 09:00 | แจ้งเตือนยื่นภาษี (LINE) |
| `cronHealthCheck` | CLOCK | ทุก 30 นาที | ตรวจสอบสถานะระบบ (LINE Alert) |

---

## 11. LINE Bot Commands

| Command | หน้าที่ |
|---------|---------|
| `สถานะ [JOB-ID]` | ดูสถานะงาน |
| `งาน` | รายการงานทั้งหมด |
| `สต็อก [ชื่อสินค้า]` | ตรวจสอบสต็อก |
| `สรุป` | สรุปประจำวัน |
| `help` | แสดงคำสั่งทั้งหมด |

---

## 12. LINE Flex Message Templates (4 แบบ)

| Template | ใช้เมื่อ | ปุ่ม Deep Link |
|----------|---------|--------------|
| **Job Notification** | งานใหม่, อัปเดตสถานะ | "ดูงาน" → `?page=jobs&id=JOB-xxx` |
| **Billing Notification** | ออกใบเสร็จ | "ดูใบเสร็จ" → `?page=jobs&id=JOB-xxx&tab=billing` |
| **Daily Summary** | cronMorningAlert | "ดู Dashboard" → `?page=dashboard`, "สั่งซื้อ PO" → `?page=po` |
| **Low Stock Alert** | checkLowStockAlert | "จัดการสต็อก" → `?page=po` |

---

## 13. PWA Pages และ Features

| หน้า | ID | เข้าถึงจาก | ข้อมูลจาก API |
|------|-----|-----------|--------------|
| **Home** | `home` | เปิด App | `getDashboardData` |
| **Jobs** | `jobs` | Tab "งาน" | `getDashboardData` → jobs[] |
| **CRM** | `crm` | Tab "ลูกค้า" | `listCustomers`, `getAfterSalesDue` |
| **Purchase Order** | `po` | Tab "สั่งซื้อ" | `listPurchaseOrders` |
| **Dashboard** | `dashboard` | Tab "Dashboard" | `getDashboardData` |
| **Attendance** | `attendance` | Tab "เวลา" | `getTechHistory`, `getAttendanceReport` |
| **Profile** | `profile` | Avatar บน | localStorage |
| **PC Dashboard** | `dashboard_pc.html` | ลิงก์แยก | `getDashboardData` |

### Deep Link URL Pattern
```
https://comphone.github.io/comphone-superapp/pwa/?page=jobs&id=JOB-001
https://comphone.github.io/comphone-superapp/pwa/?page=dashboard
https://comphone.github.io/comphone-superapp/pwa/?page=po
```

---

## 14. PWA Files

| ไฟล์ | หน้าที่ | ขนาด |
|------|---------|------|
| `index.html` | Main HTML — ทุก pages, modals | ~520 บรรทัด |
| `app.js` | Main JS — navigation, API, state | ~934 บรรทัด |
| `crm_attendance.js` | CRM + Attendance module | ~322 บรรทัด |
| `purchase_order.js` | Purchase Order module | ~350 บรรทัด |
| `dashboard.js` | Executive Dashboard module | ~250 บรรทัด |
| `job_workflow.js` | Job Workflow module (Phase 1) | ~420 บรรทัด |
| `style.css` | Styles — Mobile-first, Responsive | ~600 บรรทัด |
| `dashboard_pc.html` | PC Dashboard — Sidebar layout | ~400 บรรทัด |
| `manifest.json` | PWA manifest | ~30 บรรทัด |
| `sw.js` | Service Worker — Offline cache | ~50 บรรทัด |

### callApi / callAPI Architecture
```javascript
// app.js — ทั้งสองฟังก์ชันใช้ POST ไป GAS URL เดียวกัน
callAPI(action, params)  // ใช้ใน job_workflow.js
window.callApi(payload)  // ใช้ใน crm_attendance.js, purchase_order.js, dashboard.js
// ทั้งสองชี้ไป APP.scriptUrl || DEFAULT_SCRIPT_URL
```

---

## 15. Deployment History

| Version | Deploy ID | วันที่ | การเปลี่ยนแปลง |
|---------|-----------|-------|--------------|
| v5.5.0 | @436 | ก่อนหน้า | Initial V5.5 |
| v5.5.1 | @437 | ก่อนหน้า | LINE Bot + Cloudflare |
| v5.5.2 | @438 | ก่อนหน้า | FlexMessage templates |
| v5.5.3 | @439 | 16 เม.ย. 69 | LINE Groups ครบ 5, Gemini AI |
| v5.5.4 | @439 | 17 เม.ย. 69 | PWA Phase 1: Open Job, Assign, Timeline, Note |
| v5.5.5 | @439 | 18 เม.ย. 69 | MISSION COMPLETE: Tax Engine, Warranty, Multi-branch, Health Monitor |

---

## 16. ฟีเจอร์ที่พัฒนาแล้ว ✅

**GAS Backend:**
- [x] ระบบงานซ่อม (Job Management) — CRUD, Status 12 ขั้นตอน, Assign Technician
- [x] ระบบสต็อก (Inventory) — CRUD, Barcode Scanner, Stock Movement
- [x] ระบบลูกค้า (CRM) — CRUD, Filter, ประวัติ, After-Sales
- [x] ระบบใบเสร็จ (Billing) — PDF Generation, PromptPay QR Code
- [x] ระบบลงเวลา (Attendance) — Clock In/Out, Weekly Summary
- [x] After-Sales Follow-up — Due List, Log Follow-up
- [x] LINE Bot — Webhook, Commands, Flex Message (4 templates)
- [x] LINE Group Notifications — 5 กลุ่ม (ช่าง/บัญชี/จัดซื้อ/เซลส์/ผู้บริหาร)
- [x] Gemini AI — Reorder Suggestions (Free Tier)
- [x] Scheduled Alerts — Morning, Low Stock, After-Sales, CRM (6 Triggers)
- [x] Auto Backup — Daily Google Sheets backup
- [x] Cloudflare Worker — Fast LINE webhook proxy (async forward <50ms)
- [x] initSystem() — สร้าง Sheets 13 ตาราง + Triggers 6 ตัวอัตโนมัติ

**PWA Frontend (v5.5.4):**
- [x] PWA — Mobile-first, Offline-capable, Install to Home Screen
- [x] ข้อมูลจริงจาก Sheet — ไม่มี demo data (แก้ไข callApi POST + key mapping)
- [x] **Purchase Order UI** — สร้าง/ดู/รับสินค้า (`purchase_order.js`)
- [x] **Executive Dashboard Mobile** — KPI, กราฟ Chart.js (`dashboard.js`)
- [x] **Executive Dashboard PC** — Sidebar layout, Table, Responsive (`dashboard_pc.html`)
- [x] **LINE Deep Link** — `?page=` URL handler เปิดหน้าอัตโนมัติจาก LINE Bot
- [x] **Open Job Form** — Modal สร้างงานใหม่ + เชื่อม `openJob` API (`job_workflow.js`)
- [x] **Assign Technician** — Modal มอบหมายช่าง + เพิ่มช่างใหม่ (`job_workflow.js`)
- [x] **Job Status Timeline** — ประวัติสถานะแบบ Timeline + ไอคอน (`job_workflow.js`)
- [x] **Quick Note** — จดบันทึกบนงาน + Quick Tags (`job_workflow.js`)

---

## 17. ฟีเจอร์ที่ยังไม่ได้พัฒนา 🔲

**Phase 2 — Financial & Billing:**
- [x] **สร้างบิล / ใบเสร็จ** — Form สร้างใบเสร็จใน PWA (`createBilling` API พร้อม)
- [x] **QR รับเงิน PromptPay** — แสดง QR Code ใน PWA (`getJobQRData` API พร้อม)
- [x] **Slip Verification** — ตรวจสอบสลิปโอนเงินอัตโนมัติ (AI)

**Phase 3 — Customer Experience:**
- [x] **Customer Portal** — ลูกค้าตรวจสอบสถานะงานเอง (ไม่ต้อง Login)
- [x] **Photo Upload** — รูปภาพงานซ่อม Before/After (`handleProcessPhotos` API พร้อม)
- [ ] **Inventory Management UI** — หน้าจัดการสต็อกใน PWA (`inventoryOverview` API พร้อม)

**Phase 4 — Advanced:**
- [x] **Kudos System** — ระบบให้ดาวช่าง
- [x] **Warranty Management** — ระบบรับประกัน
- [x] **P&L Report** — รายงานกำไร-ขาดทุน
- [x] **Auto-Tax Engine** — คำนวณ VAT 7% และ WHT 3% อัตโนมัติ
- [x] **Multi-branch** — รองรับหลายสาขา

---

## 18. Repository Structure

```
comphone-superapp/                    # GitHub: comphone/comphone-superapp
├── clasp-ready/                      # Google Apps Script source
│   ├── .clasp.json                   # clasp config (Script ID)
│   ├── Router.gs                     # HTTP Router (entry point)
│   ├── Config.gs                     # Configuration + Script Properties
│   ├── JobManager.gs                 # Job CRUD
│   ├── JobStateMachine.gs            # Job State transitions
│   ├── JobsHandler.gs                # Job HTTP handlers
│   ├── InventoryManager.gs           # Inventory CRUD
│   ├── Inventory.gs                  # Purchase Order functions
│   ├── BillingManager.gs             # Billing + PDF + QR
│   ├── CustomerManager.gs            # CRM
│   ├── LineBot.gs                    # LINE Webhook handler
│   ├── FlexMessage.gs                # Flex Message templates
│   ├── NotifyManager.gs              # LINE Group notifications
│   ├── GeminiAI.gs                   # Gemini AI integration
│   ├── AttendanceManager.gs          # Attendance
│   ├── AfterSalesManager.gs          # After-sales
│   ├── PurchaseOrderManager.gs       # Purchase orders
│   ├── Dashboard.gs                  # Dashboard data
│   ├── DashboardV55.gs               # Dashboard V5.5 enhancements
│   ├── DeployGuide.gs                # initSystem() + setupTriggers()
│   ├── Utils.gs                      # Utilities
│   └── ReceiptTemplate.html          # PDF receipt HTML template
├── pwa/                              # Progressive Web App (GitHub Pages)
│   ├── index.html                    # Main HTML (all pages + modals)
│   ├── app.js                        # Main JS (navigation, API, state)
│   ├── crm_attendance.js             # CRM + Attendance module
│   ├── purchase_order.js             # Purchase Order module
│   ├── dashboard.js                  # Executive Dashboard module
│   ├── job_workflow.js               # Job Workflow module (Phase 1)
│   ├── style.css                     # Styles
│   ├── dashboard_pc.html             # PC Dashboard (Responsive)
│   ├── manifest.json                 # PWA manifest
│   └── sw.js                         # Service Worker
├── docs/
│   ├── MASTER_BLUEPRINT.md           # This file — system documentation
│   └── PWA_ROADMAP.md                # PWA development roadmap
├── QUICK_REFERENCE.md                # Quick reference card
└── README.md                         # Project overview

# Local only (ไม่อยู่ใน GitHub):
/home/ubuntu/comphone-line-webhook/   # Cloudflare Worker source
├── src/index.js                      # Worker logic
└── wrangler.toml                     # Cloudflare config
```

---

## 19. Development Tools & Commands

### clasp (GAS Deploy)
```bash
# Push + Deploy อัตโนมัติ
python3.11 /home/ubuntu/refresh_clasp_push.py

# Manual
cd /home/ubuntu/github-clone/clasp-ready
clasp push
clasp deploy --description "v5.5.x"
clasp deployments  # ดูรายการ deployments
```

### Cloudflare Worker Deploy
```bash
cd /home/ubuntu/comphone-line-webhook
wrangler deploy
# ดู logs
wrangler tail
```

### GitHub Push
```bash
cd /home/ubuntu/github-clone
git add -A
git commit -m "feat/fix/docs: description"
git push origin main
```

### ตั้งค่า Script Properties
```bash
python3.11 /home/ubuntu/set_line_groups.py
python3.11 /home/ubuntu/set_gemini_key.py
python3.11 /home/ubuntu/update_webapp_url.py
```

### ทดสอบ API
```bash
python3.11 -c "
import requests, json
GAS = 'https://script.google.com/macros/s/AKfycby-IRTHbHMfCZ8TiXSAJ8zr_T6xQcmJNvGNYYI2X2VoAEMPwYtHwlCp1mf9f6IzWSSJfQ/exec'
r = requests.post(GAS, json={'action': 'systemStatus'}, timeout=30)
print(json.dumps(r.json(), ensure_ascii=False, indent=2))
"
```

---

## 20. Backup Locations

| ที่เก็บ | เนื้อหา | สถานะ |
|--------|---------|-------|
| **GitHub** | Source code ทั้งหมด (clasp-ready + pwa + docs) | ✅ Auto push |
| **Google Drive** | MASTER_BLUEPRINT.md + docs | ✅ Manual sync |
| **Local Sandbox** | `/home/ubuntu/github-clone/` | ✅ Working copy |
| **Google Sheets** | ข้อมูลทั้งหมด (autoBackup trigger ทุกวัน 23:00) | ✅ Auto backup |
| **Cloudflare** | Worker source (deploy ล่าสุด) | ✅ Deployed |

---

## 21. Action Items (สิ่งที่ต้องทำ)

### ด่วน
- [ ] ตั้งค่า LINE Webhook URL ใน LINE Developers Console:
  `https://comphone-line-webhook.narinoutagit.workers.dev/line/webhook`

### Phase 2 (ถัดไป)
- [ ] พัฒนา Billing UI — สร้างบิล/ใบเสร็จใน PWA
- [ ] พัฒนา QR รับเงิน PromptPay
- [ ] พัฒนา Inventory Management UI

---

*Blueprint นี้สร้างโดย Manus AI | อัปเดตล่าสุด: 18 เมษายน 2569 | v5.5.5*
