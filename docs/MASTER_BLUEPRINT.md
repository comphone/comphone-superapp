# COMPHONE SUPER APP V5.5 — Master Blueprint

> **อัปเดตล่าสุด:** เมษายน 2569 (April 2026)
> เอกสารฉบับนี้คือ **Single Source of Truth** ของระบบ COMPHONE SUPER APP V5.5 รวบรวมสถาปัตยกรรม, ที่อยู่ระบบ, การเชื่อมต่อ, และสถานะการพัฒนาทั้งหมด เพื่อให้นักพัฒนาและ AI Model รับช่วงต่อได้ทันที

---

## 1. ที่อยู่ระบบทั้งหมด (System Endpoints & IDs)

### 1.1 Google Apps Script (GAS) — Backend หลัก

| รายการ | ค่า |
| :--- | :--- |
| **GAS Script ID** | `1-aoCd5gXoo1dX4FjW62l8JknR3ZPiaf1W7YEmEdtq8gnRzSp4Hwj6043` |
| **GAS Editor URL** | https://script.google.com/home/projects/1-aoCd5gXoo1dX4FjW62l8JknR3ZPiaf1W7YEmEdtq8gnRzSp4Hwj6043/edit |
| **Web App URL** | ตั้งค่าใน Script Properties: `WEB_APP_URL` (ได้รับหลัง Deploy) |
| **Runtime** | V8 |
| **Timezone** | Asia/Bangkok |

### 1.2 Google Drive & Sheets — ฐานข้อมูล

| รายการ | ID / URL |
| :--- | :--- |
| **Spreadsheet (DB) ID** | `19fkLbSbBdz0EjAV8nE9LLwBiHeIN50BTPptt_PJCRGA` |
| **Spreadsheet URL** | https://docs.google.com/spreadsheets/d/19fkLbSbBdz0EjAV8nE9LLwBiHeIN50BTPptt_PJCRGA |
| **Root Drive Folder ID** | `1YRZRG9r1Y_jMHg2XFFKYjK4Hx-sW0Eq0` |
| **Drive Folder URL** | https://drive.google.com/drive/folders/1YRZRG9r1Y_jMHg2XFFKYjK4Hx-sW0Eq0 |

> **หมายเหตุ:** ค่าทั้งสองนี้ถูก Hardcode ไว้เป็น Fallback ใน `Config.gs` (`_FALLBACK_SS_ID` และ `_FALLBACK_FOLDER_ID`) ระบบจะดึงค่าจาก Script Properties ก่อน หากไม่พบจึงใช้ Fallback

### 1.3 GitHub Repository — Source Code

| รายการ | ค่า |
| :--- | :--- |
| **Repository** | https://github.com/comphone/comphone-superapp |
| **Branch หลัก** | `main` |
| **โค้ดพร้อม Deploy** | `clasp-ready/` |
| **เอกสารระบบ** | `docs/` |
| **Auto Sync Script (Windows)** | `auto-sync.bat` |

### 1.4 LINE Groups — Hardcoded Defaults ใน `Notify.gs`

ค่าเหล่านี้ถูก Hardcode เป็น Default ไว้ใน `Notify.gs` ฟังก์ชัน `_getRoomGroupId()` ระบบจะดึงค่าจาก Script Properties ก่อน หากไม่พบจึงใช้ค่าด้านล่าง

| กลุ่ม | LINE Group ID |
| :--- | :--- |
| **TECHNICIAN** (ช่าง) | `C8ad22a115f38c9ad3cb5ea5c2ff4863b` |
| **ACCOUNTING** (บัญชี) | `C7b939d1d367e6b854690e58b392e88cc` |
| **PROCUREMENT** (จัดซื้อ) | `Cfd103d59e77acf00e2f2f801d391c566` |
| **SALES** (เซลส์) | `Cb7cc146227212f70e4f171ef3f2bce15` |
| **EXECUTIVE** (ผู้บริหาร) | `C8ad22a115f38c9ad3cb5ea5c2ff4863b` (ใช้ร่วมกับ TECHNICIAN) |

---

## 2. Script Properties ที่ต้องตั้งค่า (Configuration Keys)

ตั้งค่าได้ที่ GAS Editor → Project Settings → Script Properties

### 2.1 Required (จำเป็นต้องมี)

| Key | ใช้สำหรับ | Fallback ถ้าไม่ตั้ง |
| :--- | :--- | :--- |
| `DB_SS_ID` | Google Sheets Database ID | `19fkLbSbBdz0EjAV8nE9LLwBiHeIN50BTPptt_PJCRGA` |
| `ROOT_FOLDER_ID` | Google Drive Root Folder ID | `1YRZRG9r1Y_jMHg2XFFKYjK4Hx-sW0Eq0` |

### 2.2 Optional (แนะนำให้ตั้ง)

| Key | ใช้สำหรับ |
| :--- | :--- |
| `WEB_APP_URL` | URL ของ Web App ที่ Deploy (ใช้สร้าง QR Code และ Link) |
| `LINE_CHANNEL_ACCESS_TOKEN` | ส่ง Push Message ผ่าน LINE Messaging API |
| `LINE_GROUP_TECHNICIAN` | Override Group ID กลุ่มช่าง |
| `LINE_GROUP_ACCOUNTING` | Override Group ID กลุ่มบัญชี |
| `LINE_GROUP_PROCUREMENT` | Override Group ID กลุ่มจัดซื้อ |
| `LINE_GROUP_SALES` | Override Group ID กลุ่มเซลส์ |
| `LINE_GROUP_ADMIN` | Override Group ID กลุ่มแอดมิน |
| `TELEGRAM_BOT_TOKEN` | ส่งแจ้งเตือนผ่าน Telegram Bot |
| `TELEGRAM_CHAT_TECHNICIAN` | Chat ID ห้องช่าง (Telegram) |
| `TELEGRAM_CHAT_ADMIN` | Chat ID ห้องแอดมิน (Telegram) |
| `GEMINI_API_KEY` | Google Gemini AI Vision (วิเคราะห์รูปภาพหน้างาน) |
| `PROMPTPAY_BILLER_ID` | สร้าง PromptPay QR อัตโนมัติ |
| `SLIP_VERIFY_API_URL` | Endpoint ตรวจสอบสลิปโอนเงิน |
| `SLIP_VERIFY_API_KEY` | API Key สำหรับตรวจสลิป |
| `BILLING_RECEIPT_FOLDER_ID` | โฟลเดอร์เก็บใบเสร็จ PDF บน Drive |

---

## 3. สถาปัตยกรรมระบบ (System Architecture)

ระบบพัฒนาบน **Google Apps Script (GAS)** โดยใช้ Google Sheets เป็นฐานข้อมูลหลัก Frontend เป็น Single Page Application (SPA) ที่ไม่ต้องการ Server ภายนอก

- **Frontend:** HTML5, CSS3 (Bootstrap 5.3), Vanilla JavaScript (ES5/ES6)
- **Backend:** Google Apps Script (GAS) — `doGet` / `doPost` ใน `Router.gs`
- **Database:** Google Sheets (ไม่มี SQL, ใช้ Row-based storage)
- **File Storage:** Google Drive (รูปภาพ, PDF ใบเสร็จ)
- **Authentication:** Session Token เก็บใน Script Properties + Browser Cookie
- **Notifications:** LINE Messaging API (หลัก), Telegram Bot API (สำรอง)
- **AI Vision:** Google Gemini AI (วิเคราะห์รูปภาพหน้างาน)

### 3.1 โครงสร้างไฟล์หลัก (Core Files)

| ไฟล์ | หน้าที่หลัก |
| :--- | :--- |
| `Index.html` | หน้า UI หลัก (SPA) — Navbar, Bottom Nav, Section containers |
| `JS_Part1.html` | JavaScript ส่วนเชื่อมต่อ API (`google.script.run`) และ Utility Functions |
| `JS_Part2.html` | JavaScript ส่วนจัดการ UI, Event Listeners, `showSection()`, Inventory, Modal |
| `JS_Dashboard.html` | JavaScript เฉพาะ Dashboard — KPI render, Smart Search, Voice Search |
| `Router.gs` | Entry point Backend (`doGet`, `doPost`) และ API Routing ทั้งหมด |
| `Config.gs` | Configuration Manager, Script Properties, Fallback values |
| `Auth.gs` | Login, RBAC 4 ระดับ, Session Management |
| `JobStateMachine.gs` | Workflow 12 ขั้นตอน, State transitions, Job CRUD |
| `Inventory.gs` | สต็อก 3 ชั้น (Main/Site/Van), Transfer, Low-stock alerts |
| `CustomerManager.gs` | CRM — ข้อมูลลูกค้า, ประวัติการซ่อม, Auto-fill |
| `Notify.gs` | LINE Push Message, Telegram, Room mapping |
| `VisionAnalysis.gs` | Gemini AI Vision — วิเคราะห์รูปภาพ, Photo Queue processing |
| `GpsPipeline.gs` | GPS tracking — บันทึกพิกัด, เชื่อม Google Maps |
| `Attendance.gs` | ลงเวลาเข้า-ออกงานช่าง, สรุปผลงาน |
| `AfterSales.gs` | After-Sales PM tracking, Follow-up log, แจ้งเตือนหมดประกัน |
| `BillingManager.gs` | สร้างบิล, PromptPay QR, ตรวจสลิป, ใบเสร็จ PDF |
| `Dashboard.gs` | API สำหรับ Dashboard — Summary, Revenue, Alerts |
| `AutoBackup.gs` | สำรองข้อมูล Google Sheets ทุกคืน 00:00-01:00 น. |
| `LineBot.gs` | LINE Bot Webhook handler |
| `SmartAssignment.gs` | มอบหมายงานอัตโนมัติตาม GPS และ Workload |

### 3.2 โครงสร้างฐานข้อมูล (Google Sheets — Tabs)

| Sheet Name | เก็บข้อมูล |
| :--- | :--- |
| `DBJOBS` | งานซ่อม/ติดตั้งหลัก (Job ID, สถานะ, ช่าง, ลูกค้า, รายได้) |
| `DB_INVENTORY` | สินค้าและสต็อก (SKU, ชื่อ, ราคา, จำนวนแต่ละคลัง) |
| `DB_CUSTOMERS` | ข้อมูลลูกค้า (ชื่อ, เบอร์, ที่อยู่, ประวัติ) |
| `DB_STOCK_MOVEMENTS` | ประวัติการเคลื่อนไหวสต็อก (เบิก, โอน, รับเข้า) |
| `DB_JOB_ITEMS` | รายการสินค้า/อะไหล่ที่ใช้ในแต่ละงาน |
| `DB_BILLING` | การวางบิลและการชำระเงิน |
| `DB_JOB_LOGS` | Timeline การเปลี่ยนสถานะงาน (ใครทำ, เมื่อไหร่, GPS) |
| `DB_PHOTO_QUEUE` | คิวรูปภาพที่รอ Gemini AI ประมวลผล |
| `DB_USERS` | ผู้ใช้งานระบบ (Username, Password Hash, Role) |
| `DB_ACTIVITY_LOG` | Activity Log ทั้งหมด (Audit trail) |

---

## 4. ระบบหลัก (Core Modules)

### 4.1 Job State Machine — Workflow 12 ขั้นตอน

```
1. รอมอบหมาย → 2. มอบหมายแล้ว → 3. รับงานแล้ว → 4. เดินทาง
→ 5. ถึงหน้างาน → 6. เริ่มงาน ⇄ 7. รอชิ้นส่วน
→ 8. งานเสร็จ → 9. ลูกค้าตรวจรับ → 10. รอเก็บเงิน
→ 11. เก็บเงินแล้ว → 12. ปิดงาน
```

### 4.2 Role-Based Access Control (RBAC)

| Role | Level | สิทธิ์ |
| :--- | :---: | :--- |
| OWNER | 4 | เข้าถึงทุกส่วน, ดูรายได้รวม, จัดการผู้ใช้ |
| ACCOUNTANT | 3 | ดูรายได้, จัดการบิล, ไม่สามารถจัดการผู้ใช้ |
| SALES | 2 | เปิดงาน, ดูสต็อก, ไม่เห็นรายได้รวม |
| TECHNICIAN | 1 | ดูงานที่ได้รับมอบหมาย, อัปเดตสถานะ, เบิกของ |

### 4.3 Inventory System — สต็อก 3 ชั้น

```
MAIN (คลังหลัก) ← รับของเข้า / จัดเก็บ
     ↓ โอนย้าย (Transfer)
SITE (หน้าร้าน) ← ขายหน้าร้าน / โชว์สินค้า
     ↓ โอนย้าย (Transfer)
VAN  (รถช่าง)  ← ช่างเบิกติดรถ / ใช้งานหน้างาน
```

---

## 5. สถานะการพัฒนา (Development Status)

### 5.1 ✅ ฟีเจอร์ที่พัฒนาเสร็จแล้ว (UI + Backend ครบ)

| ฟีเจอร์ | ไฟล์ที่เกี่ยวข้อง |
| :--- | :--- |
| Smart Dashboard (Mobile-first, KPI Cards, Revenue) | `Index.html`, `JS_Dashboard.html`, `Dashboard.gs` |
| Smart Search (พิมพ์คำเดียวค้นข้าม Job/Customer/Tech) | `JS_Dashboard.html` |
| Voice Search (ภาษาไทย, Web Speech API) | `JS_Dashboard.html` |
| Quick Filter Chips (กรองสถานะด้วยคลิกเดียว) | `JS_Dashboard.html` |
| Job Detail Modal (4 Tabs: Detail, Status, Photos, Timeline) | `JS_Part2.html`, `Index.html` |
| Status Progress Bar (แสดง Step 1-12 ใน Modal) | `JS_Part2.html` |
| Photo Gallery + Lightbox (ดูรูปขนาดใหญ่) | `JS_Part2.html` |
| Web Share API (แชร์รูปไป LINE/WhatsApp) | `JS_Part2.html` |
| Inventory UI (สต็อก 3 ชั้น + Transfer Modal) | `JS_Part2.html`, `Inventory.gs` |
| Job State Machine (12 ขั้นตอน) | `JobStateMachine.gs` |
| RBAC (4 ระดับ) | `Auth.gs` |
| LINE Bot + Push Notifications | `LineBot.gs`, `Notify.gs` |
| GPS Pipeline | `GpsPipeline.gs` |
| Gemini AI Vision (วิเคราะห์รูปภาพ) | `VisionAnalysis.gs` |
| Auto Backup (ทุกคืน 00:00-01:00 น.) | `AutoBackup.gs` |
| Toast Notifications (แทน alert()) | `JS_Part2.html` |
| Keyboard Shortcuts (Ctrl+K = Search) | `JS_Dashboard.html` |

### 5.2 ⏳ ฟีเจอร์ที่ Backend เสร็จแล้ว รอสร้าง UI

| ฟีเจอร์ | API ที่มีอยู่ | ไฟล์ Backend | สิ่งที่ต้องทำ |
| :--- | :--- | :--- | :--- |
| **CRM ลูกค้า** | `listCustomers`, `createCustomer`, `updateCustomer` | `CustomerManager.gs` | Section ตารางลูกค้า + ฟอร์ม + ประวัติ |
| **ทีมช่าง + ลงเวลา** | `getAllTechsSummary`, `clockIn`, `clockOut` | `Attendance.gs` | Section ตารางช่าง + ปุ่มลงเวลา |
| **After-Sales & PM** | `getAfterSalesDue`, `logFollowUp` | `AfterSales.gs` | Section ตารางแจ้งเตือน PM + ฟอร์ม Follow-up |

### 5.3 🗺️ Roadmap อนาคต

- **LINE Bot Rich Menu + LIFF:** เชื่อม Rich Menu กับ Web App ให้ไร้รอยต่อ
- **Automated Billing PDF:** สร้างใบแจ้งหนี้ PDF อัตโนมัติเมื่อสถานะถึง "รอเก็บเงิน" (โครงร่างมีใน `BillingManager.gs` แล้ว)
- **Predictive Maintenance AI:** ใช้ประวัติการซ่อมวิเคราะห์ด้วย AI คาดการณ์รอบการเสียของอุปกรณ์

---

## 6. คู่มือ Deploy (Deployment Guide)

```bash
# 1. Clone repository
git clone https://github.com/comphone/comphone-superapp.git
cd comphone-superapp/clasp-ready

# 2. Login Google Account
clasp login

# 3. Push โค้ดขึ้น GAS
clasp push

# 4. เปิด GAS Editor ตรวจสอบ
clasp open

# 5. Deploy Web App ใน GAS Editor
# Deploy → New Deployment → Web App
# Execute as: Me | Who has access: Anyone
```

หลัง Deploy ให้คัดลอก Web App URL ไปตั้งค่าใน Script Properties: `WEB_APP_URL`

---

## 6.1 Static Website (Permanent Preview)

Dashboard Preview ถูก Deploy เป็นเว็บไซต์ถาวรบน Cloudflare Pages:

| รายการ | ค่า |
| :--- | :--- |
| **URL** | https://comphone-superapp.pages.dev |
| **Source** | `clasp-ready/dashboard_preview.html` |
| **Platform** | Cloudflare Pages (ฟรี, ถาวร, CDN ทั่วโลก) |
| **Auto Deploy** | Push ขึ้น GitHub branch `main` → Deploy อัตโนมัติ |

---

## 8. โมดูลใหม่ V5.5+ Smart (Planned Features)

ฟีเจอร์เหล่านี้ได้รับการออกแบบและบรรจุใน Blueprint แล้ว รอการพัฒนาในลำดับถัดไป

### 8.1 Executive Decision Center — ศูนย์สั่งการ

> **เป้าหมาย:** บริหารจัดการงานผ่านมือถือได้ทั้งหมด ไม่ต้องเปิดคอมพิวเตอร์

| ฟีเจอร์ | รายละเอียด | Priority |
| :--- | :--- | :---: |
| **Executive Dashboard** | สรุปกำไร-ขาดทุนรายบิล + งานล่าช้า Real-time | 🔴 สูง |
| **Quick Call Button** | กดโทรหาลูกค้า/ช่างได้ทันทีจากหน้างานค้าง | 🔴 สูง |
| **Quick Notify Button** | ส่งข้อความจี้งานเข้าห้อง LINE โดยตรงจาก Dashboard | 🔴 สูง |
| **Kudos & Recognition Engine** | ส่งดาวคำชมช่างหลังปิดงาน เก็บเป็น Data ประเมินผล | 🟡 กลาง |
| **Executive Daily Pulse** | รายงานอัตโนมัติทุกเช้า 08:30 น. (กำไร, งานค้าง, Kudos) | 🟡 กลาง |

**API ที่ต้องสร้างใหม่:**
- `getExecutiveSummary()` — ดึงข้อมูลกำไร-ขาดทุนรายบิล
- `sendKudos(jobId, techId, message)` — ส่งคำชมช่าง
- `sendDailyPulse()` — Trigger รายงานประจำวัน (เพิ่มใน AutoBackup.gs)

---

### 8.2 Smart Financial Ecosystem — บัญชีและภาษีอัจฉริยะ

> **เป้าหมาย:** ลดงานคีย์เอกสารการเงินและป้องกันความผิดพลาด

| ฟีเจอร์ | รายละเอียด | Priority |
| :--- | :--- | :---: |
| **Auto-Tax Engine** | คำนวณ VAT 7% และ WHT 3% อัตโนมัติตามประเภทลูกค้า | 🔴 สูง |
| **PDF Auto-Generator** | ออกใบเสร็จ PDF อัตโนมัติเมื่อชำระเงิน → บันทึก Drive + ส่งลูกค้า | 🔴 สูง |
| **Slip Matcher Engine** | ตรวจสลิปโอนเงินอัตโนมัติ เทียบยอดกับ DB_BILLING → เปลี่ยนสถานะอัตโนมัติ | 🔴 สูง |

**Script Properties ที่ต้องตั้งค่า:**
- `SLIP_VERIFY_API_URL` — Endpoint ตรวจสอบสลิป
- `SLIP_VERIFY_API_KEY` — API Key ตรวจสลิป
- `BILLING_RECEIPT_FOLDER_ID` — โฟลเดอร์เก็บใบเสร็จ PDF
- `PROMPTPAY_BILLER_ID` — เลขบัญชี PromptPay

**API ที่มีโครงร่างแล้วใน `BillingManager.gs`:**
- `createBill()`, `verifySlip()`, `generateReceiptPDF()`

---

### 8.3 Resilience & Context — ความต่อเนื่องและการติดตาม

> **เป้าหมาย:** ทำงานได้ไม่สะดุดและจำข้อมูลลูกค้าได้แม่นยำ

| ฟีเจอร์ | รายละเอียด | Priority |
| :--- | :--- | :---: |
| **Offline-First & Auto-Retry** | บันทึกผ่าน LocalStorage ก่อน → Re-sync อัตโนมัติเมื่อสัญญาณกลับ | 🟡 กลาง |
| **Smart Context Memory** | แสดง "ความทรงจำงาน" ใน Job Detail (เคยซ่อมอะไร เมื่อไหร่) | 🟡 กลาง |
| **AI Vision-to-Facebook** | ส่งรูป 1 รูป → AI สร้างแคปชั่น 3 สไตล์ (Professional/Sales/Story) → อนุมัติโพสต์ด้วยปุ่มเดียว | 🟢 ต่ำ |

**API ที่ต้องสร้างใหม่:**
- `getCustomerHistory(customerId)` — ดึงประวัติการซ่อมทั้งหมดของลูกค้า
- `generateSocialCaption(imageUrl, style)` — สร้างแคปชั่น Facebook ด้วย Gemini AI
- `approveAndPostToFacebook(jobId, captionIndex)` — โพสต์ Facebook Page

---

### 8.4 ตารางเปรียบเทียบ Blueprint เดิม vs V5.5+ Smart

| หมวดหมู่ | Blueprint เดิม (V5.5) | V5.5+ Smart (Planned) |
| :--- | :--- | :--- |
| สถานะงาน | 12 ขั้นตอน | ปรับเป็น 5 ขั้นตอนกระชับ (แนะนำ) |
| การเงิน | ออกบิลได้ | คำนวณภาษีอัตโนมัติ + จับคู่สลิปเอง |
| ทีมช่าง | ติดตามงาน | คำนวณค่าแรงรายหน้างาน + ระบบ Kudos |
| การตลาด | โพสต์ภาพหน้างาน | AI สร้างแคปชั่น 3 สไตล์ + อนุมัติด้วยปุ่มเดียว |
| การจัดการงาน | ดูงานเฉยๆ | Decision Center + Quick Actions |

---

## 9. กฎสำคัญสำหรับ AI Model ที่จะทำงานต่อ (Handoff Rules)

1. **SPA Architecture:** การเพิ่มหน้าใหม่ **ห้ามสร้างไฟล์ HTML ใหม่** ให้เพิ่ม `<div id="section-xxx" class="section hidden">` ใน `Index.html` และเรียก `showSection('section-xxx')` ใน `JS_Part2.html`
2. **API Pattern:** เรียก Backend ด้วย `google.script.run.withSuccessHandler(fn).withFailureHandler(fn).functionName(params)` ตาม Pattern ใน `JS_Part1.html`
3. **No Hardcoded Secrets:** API Keys ใหม่ต้องเพิ่มใน `Config.gs` (`OPTIONAL_PROPERTIES`) และดึงค่าผ่าน `getConfig('KEY_NAME')` เสมอ
4. **UI Framework:** ใช้ Bootstrap 5.3 classes เป็นหลัก หลีกเลี่ยง Custom CSS ที่ไม่จำเป็น
5. **Mobile-First:** ออกแบบ UI รองรับมือถือเสมอ เพราะผู้ใช้หลักคือช่างภาคสนาม
6. **Toast แทน Alert:** ใช้ `showToast(message, type)` แทน `alert()` ทุกกรณี
7. **Error Handling:** ทุก API call ต้องมี `.withFailureHandler()` และแสดง Toast error ให้ผู้ใช้เห็น
8. **V5.5+ Smart Modules:** ฟีเจอร์ใหม่ใน Section 8 ให้ใช้ Gemini AI API ผ่าน `getConfig('GEMINI_API_KEY')` และ Facebook Graph API ผ่าน `getConfig('FACEBOOK_PAGE_TOKEN')`
