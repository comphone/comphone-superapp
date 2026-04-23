# COMPHONE SUPER APP — PWA Development Roadmap

> อัปเดตล่าสุด: 17 เมษายน 2569 | Version: 5.5.3

---

## สถานะปัจจุบัน (v5.5.3)

### ✅ พัฒนาแล้ว

| ฟีเจอร์ | ไฟล์ | สถานะ |
|---------|------|-------|
| Login / Role Setup | `app.js` | ✅ สมบูรณ์ |
| Home Dashboard (Mobile) | `app.js` | ✅ ใช้ข้อมูลจริงจาก API |
| Job List + Filter + Search | `app.js` | ✅ ดึงข้อมูลจาก Sheet |
| Job Detail Modal | `app.js` | ✅ แสดงข้อมูลจริง |
| Mark Job Done (API) | `app.js` | ✅ เรียก updateJobStatus |
| CRM + After-Sales | `crm_attendance.js` | ✅ สมบูรณ์ |
| Attendance Check-in/out | `crm_attendance.js` | ✅ สมบูรณ์ |
| Purchase Order UI | `purchase_order.js` | ✅ สมบูรณ์ |
| Executive Dashboard (Mobile) | `dashboard.js` | ✅ Chart.js + Live data |
| Executive Dashboard (PC) | `dashboard_pc.html` | ✅ Responsive Sidebar |
| LINE Bot Deep Link | `app.js` + `FlexMessage.gs` | ✅ `?page=` handler |
| Voice Search | `app.js` | ✅ Thai speech recognition |
| PWA Install + Service Worker | `sw.js` + `manifest.json` | ✅ Offline support |

---

## แผนการพัฒนาต่อ

### 🔴 Phase 1 — Core Workflow (สำคัญมาก / Backend พร้อมแล้ว)

| # | ฟีเจอร์ | GAS Action | เวลา | ผลลัพธ์ |
|---|---------|-----------|------|---------|
| **1.1** | **เปิดงานใหม่ (Open Job Form)** | `openJob` | ~2 ชม. | ช่างรับงานได้จาก PWA |
| **1.2** | **มอบหมายช่าง (Assign Tech)** | `updateJobStatus` | ~1 ชม. | Admin มอบหมายงานได้ |
| **1.3** | **Job Status Timeline** | `getJobTimeline` | ~2 ชม. | ดูประวัติสถานะงาน |
| **1.4** | **Quick Note บนงาน** | `addQuickNote` | ~1 ชม. | ช่างจดบันทึกได้ |

### 🟠 Phase 2 — Financial & Billing (สำคัญ / ทีมบัญชีต้องการ)

| # | ฟีเจอร์ | GAS Action | เวลา | ผลลัพธ์ |
|---|---------|-----------|------|---------|
| **2.1** | **สร้างบิล / ใบเสร็จ** | `createBilling` | ~3 ชม. | ออกใบเสร็จได้จาก PWA |
| **2.2** | **QR รับเงิน PromptPay** | Static QR | ~1 ชม. | ลูกค้าสแกนจ่ายได้ |
| **2.3** | **Slip Verification (AI)** | `VisionAnalysis.gs` | ~3 ชม. | ตรวจสลิปอัตโนมัติ |
| **2.4** | **Auto-Tax Engine** | คำนวณใน Frontend | ~1 ชม. | VAT 7% / WHT 3% |

### 🟡 Phase 3 — Customer Experience (ปานกลาง)

| # | ฟีเจอร์ | GAS Action | เวลา | ผลลัพธ์ |
|---|---------|-----------|------|---------|
| **3.1** | **Customer Portal** | `getCustomer` | ~3 ชม. | ลูกค้าตรวจสอบสถานะเอง |
| **3.2** | **Photo Upload Before/After** | `PhotoQueue.gs` | ~2 ชม. | แนบรูปงานซ่อม |
| **3.3** | **Inventory Management UI** | `getInventoryItemDetail` | ~3 ชม. | จัดการสต็อกจาก PWA |
| **3.4** | **Barcode Scanner** | `barcodeLookup` | ~2 ชม. | สแกนบาร์โค้ดสินค้า |

### 🟢 Phase 4 — Advanced Features (ระยะยาว)

| # | ฟีเจอร์ | GAS Action | เวลา | ผลลัพธ์ |
|---|---------|-----------|------|---------|
| **4.1** | **Kudos System** | `updateJobById` | ~2 ชม. | ลูกค้าให้ดาวช่าง |
| **4.2** | **Warranty Management** | `AfterSales.gs` | ~3 ชม. | ติดตามรับประกัน |
| **4.3** | **Multi-branch Support** | Config | ~4 ชม. | รองรับหลายสาขา |
| **4.4** | **P&L Report** | `getDashboardData` | ~2 ชม. | รายงานกำไร-ขาดทุน |

---

## ฟีเจอร์ที่ยังเป็น showToast (ยังไม่ทำงานจริง)

| Function | ใน Role | ควรทำอะไร |
|----------|---------|-----------|
| `openNewJob()` | Admin | เปิด Modal สร้างงานใหม่ → `openJob` |
| `assignJob()` | Admin | เปิด Modal เลือกช่าง → `updateJobStatus` |
| `createReceipt()` | Acct | เปิด Modal ออกใบเสร็จ → `createBilling` |
| `createBill()` | Acct | เปิด Modal สร้างบิล → `createBilling` |
| `showQR()` | Acct | แสดง QR PromptPay |
| `addCustomer()` | Admin | เปิด Modal เพิ่มลูกค้า → `createCustomer` |
| `viewReport()` | Admin | เปิดหน้ารายงาน |
| `viewPL()` | Exec | เปิดรายงาน P&L |
| `addAppointment()` | Admin | เปิดปฏิทินนัดหมาย |
| `nudgeTech()` | Admin | ส่ง LINE แจ้งเตือนช่าง |

---

## แนะนำลำดับการพัฒนา

```
สัปดาห์ที่ 1:  1.1 (Open Job) + 1.2 (Assign Tech) → ทีมงานใช้ได้จริง
สัปดาห์ที่ 2:  1.3 (Timeline) + 1.4 (Quick Note) → ติดตามงานได้ครบ
สัปดาห์ที่ 3:  2.1 (Billing) + 2.2 (QR) → ทีมบัญชีใช้ได้
สัปดาห์ที่ 4:  3.2 (Photo) + 2.3 (Slip) → ลดงาน manual
```

---

## Architecture ปัจจุบัน

```
PWA (GitHub Pages)
├── index.html          — Mobile app shell
├── app.js              — Core: login, navigation, home, jobs
├── dashboard.js        — Executive dashboard (mobile)
├── purchase_order.js   — PO management
├── crm_attendance.js   — CRM + attendance
├── style.css           — Global styles
└── dashboard_pc.html   — PC dashboard (standalone)

GAS Backend (Deploy @439)
├── Router.gs           — API router (40+ actions)
├── JobsHandler.gs      — Job CRUD
├── BillingManager.gs   — Billing + receipts
├── Inventory.gs        — Stock management
├── CustomerManager.gs  — CRM
├── FlexMessage.gs      — LINE notifications
└── DashboardV55.gs     — Dashboard aggregation

Cloudflare Worker
└── comphone-line-webhook — LINE Webhook proxy → GAS
```
