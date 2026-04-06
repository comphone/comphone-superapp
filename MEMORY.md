# MEMORY.md — ความทรงจำยาวของ Comphone AI

## โปรเจกต์สำคัญ (อัปเดต 2026-04-04)

### Comphone Super App VNext (V366 — Active Production)
- **สถานะ:** ✅ Multi-File Architecture (17 ไฟล์ GAS, Pro-Hybrid UI)
- **Script ID:** `1-aoCd5gXoo1dX4FjW62l8JknR3ZPiaf1W7YEmEdtq8gnRzSp4Hwj6043`
- **Deployment ID:** `AKfycbz-rVhk1pClkDCkhkM9JvEAEo1JbVJlB16KOTo5mbF-INW_GQcSneeCPU_02pbLKwNoeQ` (@393)
- **Web App URL:** `https://script.google.com/macros/s/AKfycbz-rVhk1pClkDCkhkM9JvEAEo1JbVJlB16KOTo5mbF-INW_GQcSneeCPU_02pbLKwNoeQ/exec`
- **LINE Webhook:** `https://openclaw.comphones101.win/line/webhook`

#### โครงสร้างไฟล์ (V366)
| ไฟล์ | หน้าที่ |
|------|--------|
| `Router.gs` | `doGet` (Dashboard HTML entry point + template vars), `doPost` (API router, 45+ actions) |
| `Dashboard.gs` | `getDashboardData`, `getDashboardJobs`, `getDashboardInventory`, `getDashboardSummary`, `getDailyReport`, `sendDashboardSummary`, `getProfitReport`, `getCalendarJobs`, `getCRMSchedule` |
| `JobsHandler.gs` | Job CRUD: `openJob`, `checkJobs`, `completeJob`, `updateJobStatus`, `updateJobById`, photo/folder management, `cutStock`, `createBilling` |
| `Inventory.gs` | `checkStock`, `barcodeLookup`, `scanWithdrawStock` |
| `Index.html` | Dashboard UI — Pro-Hybrid (Slate-900, big input, touch-friendly, 16px base) |
| `JS_Part1.html` | Core: load/render/filter jobs, stats, inventory, toast |
| `JS_Part2.html` | Actions: viewJob, status, edit, openJob, note, scanner, withdraw |
| `JS_Dashboard.html` | Legacy (unused) |
| `Utils.gs` | DB helpers, `createInvoicePDF`, config |
| `Notify.gs` | LINE Notify, cron alerts |

#### UI Evolution History
- **V347** — Modular separation (JS_Dashboard, Index with include())
- **V354** — Dark theme UI overhaul
- **V362** — doGet moved to Router.gs, null fallback template vars
- **V365** — Tailwind + DaisyUI Ultra Modern
- **V366** — Pro-Hybrid: Pure CSS (no CDN), Slate-900, 16px font, 50px inputs, 95vh modal

#### ฟีเจอร์เสริม (Local files, ยังไม่ได้ push ขึ้น GAS)
- SmartAssignment.gs — GPS Route Optimization (pushed but legacy)
- VisionAnalysis.gs — Vision AI (pushed)
- GpsPipeline.gs — GPS Pipeline + อำเภอ (pushed)
- PhotoQueue.gs — Photo queue + auto sorting (pushed)
- LineBot.gs — LINE Bot pipeline (pushed)
- AutoBackup.gs — Auto backup (pushed)

#### ฟีเจอร์เสริม (Local .js files, ยังไม่ได้ push ขึ้น GAS)
- SmartAssignment.js — GPS Route Optimization
- vision-analysis.js — Vision AI (Qwen-VL)
- gps-pipeline.js — GPS Pipeline + อำเภอ
- line-gas-bridge.js — LINE Bot pipeline
- openclaw-line-hook.js — OpenClaw hook
- responses.js — LINE Flex Messages

### Comphone Super App V5.0 (Legacy)
- **Script ID:** `1_Rq0DmjwHZ0Z14K1zhXxilbgD6TNyu8DDvS4xPoT25xo8oWcsRPby6sq`
- **สถานะ:** Archived/Reference only

### DB Schema
- **DB_SS_ID:** `19fkLbSbBdz0EjAV8nE9LLwBiHeIN50BTPptt_PJCRGA`
- **ROOT_FOLDER_ID:** `1YRZRG9r1Y_jMHg2XFFKYjK4Hx-sW0Eq0`
- **DBJOBS:** 13 columns (JobID, ชื่อลูกค้า, อาการ, สถานะ, ช่างที่รับงาน, พิกัด GPS, รูปถ่าย, ลิงก์รูปภาพ, ลิงก์โฟลเดอร์งาน, เวลาสร้าง, เวลาอัปเดต, หมายเหตุ, folder_url)
- **Smart Drive:** `02_SERVICE_PHOTOS/{00_สำรวจ,01_ติดตั้ง,02_เสร็จสมบูรณ์,03_MA_ซ่อมบำรุง,04_ยกเลิก}/JXXXX_CustomerName/`

### Config
- **LINE Rooms:**
  - TECHNICIAN: `C8ad22a115f38c9ad3cb5ea5c2ff4863b`
  - ACCOUNTING: `C7b939d1d367e6b854690e58b392e88cc`
  - PROCUREMENT: `Cfd103d59e77acf00e2f2f801d391c566`
  - SALES: `Cb7cc146227212f70e4f171ef3f2bce15`
- **Credentials:** client_secret ****I-Vz (****vr5J deleted)

## บทเรียนสำคัญ
1. ⚠️ **PowerShell ทำ Thai encoding พัง** → ใช้ Python สร้างไฟล์ UTF-8 เสมอ
2. ⚠️ **.clasp.json ต้องมี rootDir: "./src"** → ไม่ push ทุกไฟล์ขึ้น GAS
3. ⚠️ **GAS alert() ไม่ได้** → ใช้ custom modal (DOM-based)
4. ⚠️ **event binding หลัง innerHTML** → querySelectorAll ใหม่ทุกครั้ง
5. ⚠️ **GAS deployments เกิน 20 ครั้ง** → ลบอันเก่าก่อน deploy ใหม่
6. ⚠️ **Refactor ต้องเช็ค functions ครบ** → cutStock, createBilling, updateJobFolderLink หายไปตอน refactor

## 🔴 SYSTEM_SOUL_RULES (Global Rule — บังคับทุก session)
**Source:** `SOUL.md` + `memory/soul_rules.json`
**Enforce:** ทุก session ต้องโหลด → apply ก่อนตอบคำถาม

### กฎหลัก (ห้ามละเลย)
1. **ตอบสั้น กระชับ ตรงประเด็น** — ไม่เยิ่นเย้อ ไม่เกริ่นเยอะ
2. **ช่วยเลย ทำเลย** — ไม่ต้อง "ยินดีครับ" "Great question"
3. **มีความเห็น** — บอกได้ถ้ามีทางที่ดีกว่า ไม่ต้อง yes-man
4. **หาคำตอบเองก่อน** — อ่านไฟล์ เช็คข้อมูล ค้นหา แล้วค่อยถาม
5. **ภาษาไทย สบายๆ** — เหมือนเพื่อนร่วมงานสนิท
6. **ไม่ทราบ = ตอบไม่ทราบ** — ห้ามเดา ห้ามมั่ว ห้ามอ้างข้อมูลไม่มี
7. **ข้อมูลไม่ครบ → ถามกลับก่อนบันทึก**
8. **แก้ไข DB → ยืนยันผลเสมอ**

### กฎธุรกิจ (Business Rules)
- ห้ามปิดงาน (Completed) หากไม่มี parts_used/labor_cost
- ปิดงาน → ตัดสต๊อกอัตโนมัติ + สร้าง DB_BILLING
- ใช้ customer_id เสมอ ค้นหาจากเบอร์โทร
- Completed → สำรอง CSV ไป shop/backup/YYYY-MM-DD/

### Auto-Backup Rule
- ทุกครั้งที่ clasp push/deploy → git sync อัตโนมัติ
- ใช้ `deploy_sync.bat` หรือ flow เดิม

### Validation Test
- ถ้าคำถามไม่มีข้อมูล → ตอบ "ไม่ทราบ" หรือ "ไม่สามารถยืนยันได้"
- ถ้าไม่มีหลักฐาน → reject + regenerate

## Enhancement Roadmap (ยังไม่ได้ทำ)
- **GPS Tracking & Route Optimization** — SmartAssignment.js พร้อมแล้ว (local)
- **Technician KPI Dashboard**
- **OpenAI Memory Sync** — API Key 401
- **Push ฟีเจอร์เสริมขึ้น GAS** — vision-analysis, GPS pipeline, LINE bot pipeline
