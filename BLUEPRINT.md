# Comphone Super App — Master Blueprint

> หจก.คอมโฟน & Electronics | ร้อยเอ็ด | ติดตั้ง CCTV, ระบบเครือข่าย, WiFi
> Owner: คุณโหน่ง (นรินทร์) | AI: Comphone AI

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    COMPHONE ECOSYSTEM V320                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌───────┐  │
│  │ 🛠️ ห้องช่าง │    │ 🏪 หน้าร้าน │    │ 📦 คลัง   │    │ 🏢 บริหาร│  │
│  │          │    │          │    │          │    │       │  │
│  │ Digital  │    │ Status   │    │ Reserve  │    │ Profit│  │
│  │ JobSheet │    │ Sync     │    │ CutStock │    │ Calendar│ │
│  │ GPS      │    │ LiveTrack│    │ Reorder  │    │ CRM   │  │
│  │ Photo    │    │ Payment  │    │ QR Check │    │ Backup│  │
│  └────┬─────┘    └────┬─────┘    └────┬─────┘    └───┬───┘  │
│       │               │               │               │       │
│       └───────────────┴───────┬───────┴───────────────┘       │
│                               │                               │
│                     ┌─────────▼─────────┐                     │
│                     │   Router.gs       │                     │
│                     │   (API Gateway)   │                     │
│                     │   30+ Routes      │                     │
│                     └─────────┬─────────┘                     │
│                               │                               │
│                     ┌─────────▼─────────┐                     │
│                     │  Google Sheets    │                     │
│                     │  (Database)       │                     │
│                     └───────────────────┘                     │
│                               │                               │
│                     ┌─────────▼─────────┐                     │
│                     │  LINE Notify      │                     │
│                     │  (4 Rooms)        │                     │
│                     └───────────────────┘                     │
└─────────────────────────────────────────────────────────────┘
```

## 📊 Database Schema

### SS_ID: `19fkLbSbBdz0EjAV8nE9LLwBiHeIN50BTPptt_PJCRGA`

| Sheet | Columns | Purpose |
|-------|---------|---------|
| **DBJOBS** | JobID, ชื่อลูกค้า, อาการ, สถานะ, ช่างที่รับงาน, พิกัด GPS, รูปถ่าย, ลิงก์รูปภาพ, ลิงก์โฟลเดอร์งาน, เวลาสร้าง, เวลาอัปเดต, หมายเหตุ, folder_url | งานซ่อมทั้งหมด |
| **DB_INVENTORY** | รหัส, ชื่อ, จำนวน, ราคาทุน, ราคาขาย | คลังสินค้า/อะไหล่ |
| **DB_BILLING** | JobID, อะไหล่, ค่าแรง, ยอดรวม, สถานะชำระ, วันที่ | การเงิน/บิล |
| **DB_CUSTOMERS** | รหัส, ชื่อ, เบอร์โทร, ประวัติ | ลูกค้า |
| **DB_RESERVATIONS** | job_id, item_code, item_name, qty, reserved_at, status | จองของเมื่อเปิดงาน ⭐V320 |
| **DB_ACTIVITY_LOG** | timestamp, action, user, detail | บันทึกทุกการเปลี่ยนแปลง ⭐V320 |
| **SYSTEM_LOGS** | Timestamp, Type, Room, Message | Log ระบบ |
| **Config** | key, value | API keys, tokens, folder IDs |

### Folder Structure (Drive)
```
ROOT: 1YRZRG9r1Y_jMHg2XFFKYjK4Hx-sW0Eq0
└── 02_SERVICE_PHOTOS/
    ├── 00_สำรวจ/
    ├── 01_ติดตั้ง/
    ├── 02_เสร็จสมบูรณ์/
    ├── 03_MA_ซ่อมบำรุง/
    └── 04_ยกเลิก/
        └── JXXXX_CustomerName/
            └── photos...
```

## 🔌 API Routes (Router.gs)

### Actions (30+ routes)
| Action | Handler | Description |
|--------|---------|-------------|
| เปิดงาน / openjob | openJob() | สร้างงานใหม่ + auto-reserve ของ |
| เช็คงาน / checkjobs | checkJobs() | ดูงานทั้งหมด |
| เช็คสต็อก / checkstock | checkStock() | ดูสต็อก + reserved qty |
| ปิดงาน / closejob | completeJob() | ปิดงาน + auto-cut stock + billing |
| อัพเดทสถานะ / updatestatus | updateJobStatus() | เปลี่ยนสถานะงาน |
| สรุปงาน / summary | summarizeJobs() | สรุปงาน |
| backup / สำรอง | autoBackup() | สำรอง Google Sheets |
| logs / ดูlog | getLastLogs() | ดู activity log |
| stockAlert / เช็คสต็อกเตือน | checkLowStockAlert() | แจ้งเตือนสต็อกต่ำ |
| reorderSuggestion / สั่งซื้อแนะนำ | geminiReorderSuggestion() | Gemini วิเคราะห์สั่งซื้อ |
| reserveItems / จองของ | reserveItemsForJob() | จองอะไหล่ |
| releaseReservation / คืนจอง | releaseReservation() | คืนของจอง |
| cutStockAuto / ตัดสต็อก | cutStockAuto() | ตัดสต็อกอัตโนมัติ |
| getProfitReport | getProfitReport() | สรุปกำไร/ต้นทุน |
| getCalendar | getCalendarJobs() | ตารางงาน 7 วัน |
| getCRMSchedule | getCRMSchedule() | แจ้งเตือนเช็คระยะ |
| dailyReport | getDailyReport() | รายงานรายวัน |
| sendDashboardSummary | sendDashboardSummary() | ส่งสรุปเข้า LINE |
| LINE commands | LineBot.gs | #เปิดงาน #ปิดงาน #เช็คงาน #สรุป |

## 📁 GAS File Structure

```
Shop_vnext/src/
├── appsscript.json          # GAS config
├── Router.gs                # API Gateway (30+ routes)
├── JobsHandler.gs           # Job CRUD (11 fns)
├── Inventory.gs             # Stock + Reservations (8 fns)
├── Dashboard.gs             # Dashboard + Reports (8 fns)
├── Notify.gs                # LINE Notify + Cron (3 fns)
├── Utils.gs                 # DB Helpers (8 fns)
├── AutoBackup.gs            # Backup + Activity Log (5 fns)
├── VisionAnalysis.gs        # AI Image Analysis (5 fns)
├── SmartAssignment.gs       # GPS Route Opt (3 fns)
├── GpsPipeline.gs           # GPS Tracking (5 fns)
├── LineBot.gs               # LINE Integration (12 fns)
└── Index.html               # Dashboard UI (V320)
```

## 🔄 Key Workflows

### 1. เปิดงาน → จองของ → ทำงาน → ปิดงาน
```
ช่าง #เปิดงาน [ชื่อ] [อาการ]
  ↓
Router.openJob()
  ↓
JobsHandler.openJob() → DBJOBS appendRow → JXXXX
  ↓
Inventory.reserveItemsForJob() → DB_RESERVATIONS (reserved)
  ↓
LINE Notify → ห้องช่าง: "เปิดงาน JXXXX แล้ว"
  ↓
[ช่างทำงาน → อัพเดทสถานะ InProgress]
  ↓
ช่าง #ปิดงาน [JXXXX] [parts] [ค่าแรง]
  ↓
JobsHandler.completeJob()
  ↓
Inventory.cutStockAuto() → reserved → consumed
  ↓
JobsHandler.createBilling() → DB_BILLING appendRow
  ↓
(ถ้าสต็อก < 5) _notifyLowStock() → LINE Notify
  ↓
logActivity('JOB_CLOSE') → DB_ACTIVITY_LOG
```

### 2. Stock Flow
```
เปิดงาน (Pending) → reserveItemsForJob() → Qty ลด (reserved)
     ↓
ช่างรับงาน → ทำงาน → ใช้ของ
     ↓
ปิดงาน (Completed) → cutStockAuto() → reserved → consumed
     ↓
Inventory เช็ค → ถ้า < 5 ชิ้น → checkLowStockAlert() → LINE Notify
     ↓
Gemini วิเคราะห์ → geminiReorderSuggestion() → แนะนำสั่งซื้อ
```

## 🤖 AI Integration

### Gemini 2.0 Flash (Vision)
- **Function:** `analyzeWorkImage(imageUrl, context)`
- **Use:** วิเคราะห์รูปงาน → auto-label, detect equipment, quality check
- **Requires:** `setConfig("GEMINI_API_KEY", "AIza...")`
- **Endpoints:**
  - `analyzeWorkImage()` — วิเคราะห์รูปทั่วไป
  - `qualityCheck()` — ตรวจคุณภาพก่อนปิดงาน
  - `geminiReorderSuggestion()` — วิเคราะห์สั่งซื้อ

### OpenAI (Memory Sync)
- **Status:** ❌ API Key 401 — ยังไม่ได้แก้
- **Goal:** Auto-tagging, smart suggestions, customer insights

## 📅 Cron Triggers (Required Setup)

| Function | Schedule | Timezone | Purpose |
|----------|----------|----------|---------|
| `autoBackup()` | `0 0 * * *` | Asia/Bangkok | Backup ทุก 00:00 |
| `checkLowStockAlert()` | `0 6,12,18 * * *` | Asia/Bangkok | เช็คสต็อกทุก 6 ชม |
| `geminiReorderSuggestion()` | `0 9 * * *` | Asia/Bangkok | Gemini วิเคราะห์สั่งซื้อ 09:00 |
| `getCRMSchedule()` | `0 8 * * 1` | Asia/Bangkok | CRM เช็คระยะ จันทร์ 08:00 |

⚠️ **ต้องตั้งค่าเองใน Apps Script UI** → Triggers → + เพิ่มตัวกระตุ้น

## 🌐 Deployment History

| Date | Version | Deploy ID | Summary |
|------|---------|-----------|---------|
| 2026-04-04 16:55 | V312 | ...OMCj3zg | Multi-File 10 ไฟล์, 53 fns |
| 2026-04-04 21:00+ | V318 | ...cyTdaA | Safe Mode Dashboard + Modal |
| 2026-04-04 21:30+ | V319 | ...0sAMjw | Daily Report + LINE Button |
| 2026-04-04 21:50+ | V320→@321 | ...5K-ZA | System Bridge + Vision AI |
| 2026-04-04 22:07 | V319→@322 | ...0sAMjw | Profit + Calendar + CRM |
| 2026-04-04 22:14 | V320→@323 | ...d5p2AQ | Inventory Reservation |
| **2026-04-04 22:16** | **V320→@325** | **...WOS2MA** | **Full Ecosystem Production** ✅ |

## 🎯 Phase 5 Roadmap (Next)

### Q1
- [ ] QR Code Check-out — สแกนก่อนเบิกของ
- [ ] Digital Job Sheet — ฟอร์มช่างใน LINE
- [ ] Pre-order Matching — จองของตาม symptom อัตโนมัติ
- [ ] Warranty PDF — ใบรับประกันอัตโนมัติ
- [ ] Customer Live Tracking — ทีวีหน้าร้าน

### Q2
- [ ] GPS Tool Tracking — เช็คเครื่องมือช่าง
- [ ] Technician KPI Dashboard — ประเมินผลงาน
- [ ] Oil Expense AI — อ่านสลิปปน้ำมัน (Gemini Vision)
- [ ] LINE OA Integration — ลูกค้าเช็คสถานะงาน
- [ ] Profit Real-time Analysis — กราฟกำไรรายวัน

## ⚠️ Important Rules

1. **Thai encoding** — ใช้ Python `utf-8` เสมอ ห้าม PowerShell
2. **.clasp.json** — rootDir ต้องเป็น `"./src"`
3. **Deploy limit** — GAS จำกัด 20 deployments → ลบเก่าก่อน deploy
4. **LINE_GAS_URL** — อัปเดตทุกครั้งหลัง deploy ใหม่
5. **Functions check** — Refactor แล้วต้อง verify ทุก function ครบ
6. **LockService** — ใช้กับ completeJob ป้องกัน race condition
7. **External calls** — ข้อมูลส่วนตัวไม่แชร์นอกห้องที่เกี่ยวข้อง

---

*Master Blueprint — Last Updated: 2026-04-04 22:18*
*Version Current: V320 @325*
*Next Major: V321 (QR Code + Digital Job Sheet)*
