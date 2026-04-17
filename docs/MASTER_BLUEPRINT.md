# 📘 MASTER BLUEPRINT — COMPHONE SUPER APP V5.5+

เอกสารฉบับนี้คือ **แหล่งความจริงเดียว (Single Source of Truth)** สำหรับระบบ COMPHONE SUPER APP V5.5+ รวบรวมข้อมูลทั้งหมดตั้งแต่สถาปัตยกรรม, API Keys, ฟีเจอร์ที่พัฒนาแล้ว, และแผนงานในอนาคต เพื่อให้ AI Model หรือนักพัฒนาคนต่อไปสามารถทำงานต่อได้อย่างราบรื่น

---

## 1. สถาปัตยกรรมระบบ (System Architecture)

ระบบถูกออกแบบมาเป็น **Serverless SPA (Single Page Application)** โดยใช้เทคโนโลยีของ Google ทั้งหมด:

- **Frontend:** HTML/CSS/JS (Bootstrap 5.3, FontAwesome) ทำงานเป็นหน้าเดียว (SPA) โหลดเร็วและรองรับ Mobile-First
- **Backend:** Google Apps Script (GAS) ทำหน้าที่เป็น API Server (REST-like)
- **Database:** Google Sheets (อ่าน/เขียนผ่าน GAS)
- **Storage:** Google Drive (เก็บรูปภาพและไฟล์แนบ)
- **Hosting:** 
  - หลัก: GAS Web App
  - สำรอง/ถาวร: Cloudflare Workers (`comphone-dashboard.narinoutagit.workers.dev`)
  - PWA: GitHub Pages (`comphone.github.io/comphone-superapp/pwa/`)

---

## 2. ที่อยู่ระบบและการเชื่อมต่อ (System Endpoints & Credentials)

> ⚠️ **คำเตือนสำหรับ AI Model:** ห้าม Hardcode API Keys เหล่านี้ลงในโค้ดโดยตรง ให้ใช้ฟังก์ชัน `getConfig('KEY_NAME')` เสมอ

### 2.1 Google Workspace (Core System)
| รายการ | ค่า / ID |
|--------|----------|
| **GAS Script ID** | `1-aoCd5gXoo1dX4FjW62l8JknR3ZPiaf1W7YEmEdtq8gnRzSp4Hwj6043` |
| **Spreadsheet DB ID** | `19fkLbSbBdz0EjAV8nE9LLwBiHeIN50BTPptt_PJCRGA` |
| **Drive Root Folder ID** | `1YRZRG9r1Y_jMHg2XFFKYjK4Hx-sW0Eq0` |

### 2.2 Web URLs
| รายการ | URL |
|--------|-----|
| **GAS Web App (หลัก) @437** | `https://script.google.com/macros/s/AKfycbye7oTIj-cQjMtSm5CZBJ81mkOHO7GZm9iKFUjcSFBM_DgSsDZXr919Y8D-WezT2jBEUA/exec` |
| **GAS Web App (เก่า) @436** | `https://script.google.com/macros/s/AKfycbyubJh1RuPO5NrlNVrxROb9yuLmW-mlZcOEa8zmaOCE2u-xGWTAcI-azwA5C7pn7mlTHg/exec` |
| **PWA App (ถาวร/หลัก)** | `https://comphone.github.io/comphone-superapp/pwa/` |
| **Cloudflare Worker (สำรอง)** | `https://comphone-dashboard.narinoutagit.workers.dev` |
| **GitHub Repository** | `https://github.com/comphone/comphone-superapp` |

### 2.3 LINE Group IDs (สำหรับการแจ้งเตือน)
| กลุ่ม | Group ID |
|-------|----------|
| **TECHNICIAN (ช่าง)** | `C8ad22a115f38c9ad3cb5ea5c2ff4863b` |
| **ACCOUNTING (บัญชี)** | `C7b939d1d367e6b854690e58b392e88cc` |
| **PROCUREMENT (จัดซื้อ)**| `Cfd103d59e77acf00e2f2f801d391c566` |
| **SALES (เซลส์)** | `Cb7cc146227212f70e4f171ef3f2bce15` |

### 2.4 Script Properties (Environment Variables)
ตัวแปรเหล่านี้ต้องตั้งค่าในหน้า Project Settings ของ GAS:

**Required (จำเป็นต้องมี):**
- `DB_SS_ID`: ID ของ Google Sheets
- `ROOT_FOLDER_ID`: ID ของ Google Drive Folder

**Optional (ฟีเจอร์เสริม):**
- `WEB_APP_URL`: URL ของ GAS Web App
- `LINE_CHANNEL_ACCESS_TOKEN`: สำหรับส่ง Push Message
- `GEMINI_API_KEY`: สำหรับระบบ Vision AI วิเคราะห์รูปภาพ
- `TELEGRAM_BOT_TOKEN`: สำหรับส่งแจ้งเตือนผ่าน Telegram
- `PROMPTPAY_BILLER_ID`: สำหรับสร้าง QR Code รับเงิน
- `SLIP_VERIFY_API_KEY`: สำหรับตรวจสอบสลิปโอนเงินอัตโนมัติ

---

## 3. ฟีเจอร์ที่พัฒนาเสร็จสมบูรณ์แล้ว (Completed Features)

ระบบปัจจุบัน (V5.5+) มีฟีเจอร์ที่พร้อมใช้งานทั้ง Frontend และ Backend ดังนี้:

### 📱 Smart Dashboard & UI (PWA)
- **Progressive Web App (PWA):** ติดตั้งบนมือถือได้เหมือน App จาก Play Store/App Store
- **Role-Based Dashboard:** หน้าจอและปุ่มด่วนเปลี่ยนตามบทบาท (ช่าง, แอดมิน, บัญชี, ผู้บริหาร)
- **Offline Support:** มี Service Worker Cache ทำงานได้แม้ไม่มีอินเทอร์เน็ต
- **Auto-Login Memory:** กรอกข้อมูล Setup ครั้งเดียว ระบบจดจำด้วย LocalStorage ไม่ต้อง Login ซ้ำ
- **SPA Architecture:** เปลี่ยนหน้าโดยไม่ต้องโหลดใหม่ (Section-based)
- **Mobile-First Design:** มี Bottom Navigation สำหรับช่างหน้างาน
- **Smart Search:** ค้นหาแบบ Dropdown พิมพ์คำเดียวเจอทั้ง Job ID, ชื่อลูกค้า, อาการ
- **Voice Search:** ค้นหาด้วยเสียงภาษาไทย (Web Speech API)
- **KPI Cards & Revenue:** สรุปยอดงานและรายได้แบบ Real-time

### 🛠️ Job Management (ระบบจัดการงานซ่อม)
- **12-Step Workflow:** ระบบสถานะงาน 12 ขั้นตอน (ตั้งแต่รับเครื่องจนถึงปิดงาน)
- **Job Detail Modal:** หน้าต่างจัดการงานแบบ 4 Tabs (รายละเอียด, สถานะ, ภาพ, Timeline)
- **Photo Gallery & Lightbox:** อัปโหลดรูป, ดูรูปขยายใหญ่, และแชร์รูปผ่าน Web Share API
- **Status Timeline:** บันทึกประวัติการเปลี่ยนสถานะพร้อมเวลาและผู้ดำเนินการ

### 📦 Inventory System (ระบบคลังสินค้า 3 ชั้น ครบวงจร)
- **โครงสร้าง 3 ชั้น:** คลังหลัก (MAIN) → หน้าร้าน (SITE) → รถช่าง (VAN)
- **CRUD สินค้า:** เพิ่ม/แก้ไข/ลบ สินค้า พร้อมกำหนดจุดสั่งซื้อ (Reorder Point)
- **Barcode Scanner:** สแกนรหัสผ่านกล้องมือถือเพื่อค้นหาและเบิกสินค้าทันที
- **Purchase Order:** สร้างใบสั่งซื้อหลายรายการ คำนวณยอดรวมอัตโนมัติ
- **Stock Movement:** บันทึกประวัติการเคลื่อนไหวสินค้าทุกครั้งที่มีการเปลี่ยนแปลง
- **Transfer System:** โอนย้ายสินค้าระหว่างคลังพร้อมบันทึกประวัติ (Log)
- **Low Stock Alert:** แจ้งเตือนเมื่อสินค้าต่ำกว่าจุดสั่งซื้อ

### 🤖 Automation & AI
- **Auto Backup:** สำรองข้อมูล Google Sheets อัตโนมัติทุกคืนเวลา 00:00 น.
- **LINE Notifications:** แจ้งเตือนเมื่อมีงานใหม่, เปลี่ยนสถานะ, หรือสต็อกต่ำ
- **Vision AI Ready:** โครงสร้างรองรับการใช้ Gemini วิเคราะห์รูปภาพอะไหล่

---

## 4. ฟีเจอร์ที่ Backend เสร็จแล้ว (รอพัฒนา UI)

โมดูลเหล่านี้มี API ใน `Router.gs` และไฟล์ Backend ครบแล้ว แต่ยังไม่มีหน้าจอให้ผู้ใช้กด:

1. **CRM (Customer Management):** 
   - API: `listCustomers`, `createCustomer`
   - ไฟล์: `CustomerManager.gs`
2. **Team & Attendance (ระบบลงเวลาช่าง):**
   - API: `getAllTechsSummary`, `clockIn`, `clockOut`
   - ไฟล์: `Attendance.gs`
3. **After-Sales & PM (บริการหลังการขาย):**
   - API: `getAfterSalesDue`, `logFollowUp`
   - ไฟล์: `AfterSales.gs`

---

## 5. แผนงานต่อไปจนระบบสมบูรณ์ (Next Steps & Roadmap)

เพื่อให้ระบบ COMPHONE SUPER APP สมบูรณ์ 100% นี่คือลำดับงานที่ต้องทำต่อไป:

### Phase 1: เติมเต็ม UI ที่ขาดหาย (Immediate Next Steps)
- [ ] **สร้างหน้า "ลูกค้า" (CRM UI):** เพิ่ม `<div id="section-customers">` แสดงตารางลูกค้าและปุ่มเพิ่มลูกค้าใหม่
- [ ] **สร้างหน้า "ทีมช่าง" (Team UI):** แสดงรายชื่อช่าง, สถานะการทำงาน, และปุ่มลงเวลาเข้า-ออกงาน
- [ ] **สร้างหน้า "หลังการขาย" (After-Sales UI):** แสดงตารางงานที่ถึงรอบ PM (Preventive Maintenance)

### Phase 2: ระบบการเงินและเอกสาร (Financial & Docs)
- [ ] **Slip Verification:** เชื่อมต่อ API ตรวจสอบสลิปโอนเงินอัตโนมัติเมื่อลูกค้าชำระเงิน
- [ ] **PDF Generation:** สร้างระบบออกใบเสนอราคา (Quotation) และใบเสร็จรับเงิน (Receipt) เป็น PDF
- [ ] **PromptPay QR:** สร้าง QR Code รับเงินแบบระบุจำนวนเงินอัตโนมัติในหน้า Job Detail

### Phase 3: AI & Advanced Automation
- [ ] **Predictive Maintenance:** ใช้ AI วิเคราะห์ประวัติการซ่อมเพื่อแจ้งเตือนลูกค้าก่อนอะไหล่จะเสีย
- [ ] **Auto-Routing:** ระบบจ่ายงานให้ช่างอัตโนมัติโดยดูจากคิวงานและตำแหน่ง GPS
- [ ] **Inventory Forecasting:** วิเคราะห์แนวโน้มการใช้อะไหล่เพื่อแนะนำการสั่งซื้อล่วงหน้า

---

## 6. โมดูลใหม่ V5.5+ Smart (Planned Features)

ฟีเจอร์เหล่านี้ได้รับการออกแบบและบรรจุใน Blueprint แล้ว รอการพัฒนาในลำดับถัดไป เพื่อยกระดับให้เป็น "ระบบปฏิบัติการองค์กร" อย่างแท้จริง

### 6.1 ศูนย์สั่งการและตัดสินใจ (Executive Decision Center)
> **เป้าหมาย:** บริหารจัดการงานผ่านมือถือได้ทั้งหมด ไม่ต้องเปิดคอมพิวเตอร์

- **Executive Dashboard:** สรุปสถานะการเงิน (กำไร-ขาดทุนรายบิล) และสถานะงานล่าช้าแบบ Real-time
- **Quick Actions:** ปุ่ม Quick Call (โทรหาลูกค้า/ช่างทันที) และ Quick Notify (ส่งข้อความจี้งานเข้า LINE) จากหน้า Dashboard
- **Kudos & Recognition Engine:** ระบบส่ง "ดาวคำชม" ให้ช่างหลังปิดงาน เพื่อสร้างขวัญกำลังใจและเก็บ Data ประเมินผล
- **Executive Daily Pulse:** รายงานอัตโนมัติทุกเช้า 08:30 น. (กำไรเมื่อวาน, งานค้าง, ช่างที่ได้ Kudos สูงสุด)

### 6.2 บัญชีและภาษีอัจฉริยะ (Smart Financial Ecosystem)
> **เป้าหมาย:** ลดงานคีย์เอกสารการเงินและป้องกันความผิดพลาด

- **Auto-Tax Engine:** คำนวณภาษีอัตโนมัติ (VAT 7% และ WHT 3% ตามประเภทลูกค้า)
- **PDF Auto-Generator:** ออกใบเสร็จ PDF อัตโนมัติเมื่อชำระเงิน พร้อมเซฟลง Drive และส่งให้ลูกค้า
- **Slip Matcher Engine:** ตรวจสอบสลิปโอนเงินอัตโนมัติ (เทียบยอดเงินและเวลา) และเปลี่ยนสถานะบิลเป็น "ชำระแล้ว" ทันที
- **Expense & Cost Tracking:** บันทึกต้นทุนอะไหล่ต่องาน คำนวณกำไรสุทธิอัตโนมัติ และออกรายงานกำไร-ขาดทุน

### 6.3 ความต่อเนื่องและการติดตาม (Resilience & Context)
> **เป้าหมาย:** ทำงานได้ไม่สะดุดและจำข้อมูลลูกค้าได้แม่นยำ

- **Offline-First & Auto-Retry:** บันทึกข้อมูลลง LocalStorage ก่อน หากเน็ตหลุดข้อมูลไม่หาย และ Re-sync อัตโนมัติเมื่อเน็ตมา
- **Smart Context Memory:** แสดง "ความทรงจำงาน" (ประวัติการซ่อมเดิม) เมื่อช่างเปิดหน้า Job ID ช่วยให้ตัดสินใจง่ายขึ้น
- **AI Vision-to-Facebook:** ประมวลผลรูป After เป็นภาพสวยงาม พร้อมสร้างแคปชั่น 3 สไตล์ (Professional/Sales/Story) ให้แอดมินกดอนุมัติโพสต์ได้ทันที

### 6.4 ระบบประมวลผลภาพผ่าน LINE Bot อัจฉริยะ (Cost-Effective Vision AI Pipeline)
> **เป้าหมาย:** ลดค่าใช้จ่าย (เครดิต) ในการประมวลผล AI และเพิ่มความเร็วในการตอบสนองของ LINE Bot

- **Async Image Processing:** เมื่อมีการส่งรูปภาพเข้ากลุ่ม LINE (เช่น เปิดงานใหม่, ส่งงาน, บิล) ระบบจะไม่เรียก AI ทันทีเพื่อป้องกันการเปลืองเครดิต
- **Temporary Drive Storage:** รูปภาพจะถูกบันทึกลง Google Drive ชั่วคราว และเก็บ URL ไว้ในคิว (`DB_PHOTO_QUEUE`)
- **Batch Processing (Cron Job):** ตั้งเวลาให้ระบบดึงรูปจากคิวมาประมวลผลด้วย AI ภายหลัง (เช่น ทุก 15 นาที หรือเฉพาะเมื่อช่างกดปุ่ม "วิเคราะห์ภาพ")
- **Contextual Analysis:** AI จะแยกแยะประเภทภาพอัตโนมัติ (ภาพหน้างาน, ภาพอะไหล่, ภาพบิล/สลิป) แล้วนำข้อมูลไปอัปเดตพิกัด GPS, สถานะงาน, หรือยอดเงินในระบบต่อไป

### 6.5 โครงสร้าง Google Drive แบบแยกส่วน (Compartmentalized Storage)
> **เป้าหมาย:** จัดระเบียบไฟล์ให้เป็นหมวดหมู่ แยกสิทธิ์การเข้าถึงระหว่างช่างและบัญชี

ระบบจะสร้างโฟลเดอร์ย่อยอัตโนมัติภายใต้ `ROOT_FOLDER_ID`:
- `📁 COMPHONE_SUPERAPP_ROOT`
  - `📁 JOBS_PHOTOS` (รูปภาพหน้างาน, Before/After - ช่างเข้าถึงได้)
  - `📁 BILLING_RECEIPTS` (ใบเสร็จ, ใบเสนอราคา PDF - บัญชี/เซลส์เข้าถึงได้)
  - `📁 SLIPS_VERIFICATION` (สลิปโอนเงินที่รอตรวจสอบ - บัญชีเข้าถึงได้)
  - `📁 TEMP_AI_QUEUE` (โฟลเดอร์ชั่วคราวสำหรับรูปที่รอ AI ประมวลผล - ลบอัตโนมัติหลังประมวลผลเสร็จ)

### 6.6 ระบบรายงาน LINE Group แบบโต้ตอบแยกตามแผนก (Role-Based Interactive LINE Reports)
> **เป้าหมาย:** ลดความรำคาญ (Noise) ในกลุ่ม LINE โดยส่งเฉพาะข้อมูลที่แต่ละแผนกต้องรู้ พร้อมปุ่ม Action (Deep Link) ให้กดทำงานต่อได้ทันทีโดยไม่ต้องค้นหา

ระบบจะส่งข้อความรูปแบบ **Flex Message** ที่ออกแบบเฉพาะสำหรับ 5 กลุ่มหลัก ดังนี้:

#### 1. กลุ่มช่าง (TECHNICIAN)
- **Trigger (เมื่อไหร่):** เปิดงานใหม่, มอบหมายงาน, งานถึงกำหนด PM, ลูกค้าตามงาน
- **ข้อมูลที่แสดง:** Job ID, อาการเสีย, สถานที่ (พิกัด GPS), กำหนดเสร็จ
- **Action Buttons:**
  - `[รับงาน]` (เปลี่ยนสถานะเป็น "รับงานแล้ว")
  - `[อัปเดตสถานะ]` (เปิด Web App หน้า Job Detail)
  - `[แนบรูปหน้างาน]` (เปิด Web App หน้า Photo Gallery เพื่ออัปโหลดรูป)

#### 2. กลุ่มบัญชี (ACCOUNTING)
- **Trigger (เมื่อไหร่):** งานเปลี่ยนสถานะเป็น "รอเก็บเงิน", มีการโอนเงิน (Slip Matcher ทำงาน), สรุปยอดรายวัน
- **ข้อมูลที่แสดง:** Job ID, ชื่อลูกค้า, ยอดเงินรวม, สถานะการชำระเงิน, ลิงก์ดูสลิป
- **Action Buttons:**
  - `[ตรวจสอบสลิป]` (เปิด Web App หน้าตรวจสอบสลิป)
  - `[ออกใบเสร็จ PDF]` (สร้าง PDF และส่งเข้าโฟลเดอร์ BILLING_RECEIPTS)
  - `[ดูรายละเอียดบิล]`

#### 3. กลุ่มจัดซื้อ/สต็อก (PROCUREMENT)
- **Trigger (เมื่อไหร่):** ช่างกด "รอชิ้นส่วน", สต็อกสินค้าต่ำกว่าจุดสั่งซื้อ (Low Stock Alert), มีการเบิกอะไหล่จำนวนมาก
- **ข้อมูลที่แสดง:** รายการอะไหล่ที่ต้องการ, จำนวน, Job ID ที่รออะไหล่, ยอดคงเหลือในคลัง
- **Action Buttons:**
  - `[เช็คสต็อก]` (เปิด Web App หน้า Inventory)
  - `[อนุมัติเบิก]` (ตัดสต็อกและแจ้งช่าง)
  - `[สั่งซื้อเพิ่ม]`

#### 4. กลุ่มเซลส์/แอดมิน (SALES)
- **Trigger (เมื่อไหร่):** ปิดงานสำเร็จ (พร้อมรูป After), ลูกค้าใหม่ลงทะเบียน, แจ้งเตือน Follow-up
- **ข้อมูลที่แสดง:** Job ID, ชื่อลูกค้า, สรุปงานที่ทำเสร็จ, แคปชั่นที่ AI ร่างให้ (สำหรับโพสต์ Facebook)
- **Action Buttons:**
  - `[ดูรูป Before/After]` (เปิด Photo Gallery)
  - `[อนุมัติโพสต์ FB]` (ส่งรูปและแคปชั่นขึ้น Page)
  - `[ส่งแบบประเมิน]` (ส่งลิงก์ให้ลูกค้าให้คะแนน)

#### 5. กลุ่มผู้บริหาร (EXECUTIVE)
- **Trigger (เมื่อไหร่):** สรุปยอดเช้า 08:30 น. (Daily Pulse), มีงานล่าช้าเกินกำหนด (SLA Breach), มีลูกค้าร้องเรียน
- **ข้อมูลที่แสดง:** สรุปกำไร-ขาดทุนเมื่อวาน, จำนวนงานค้าง, รายชื่อช่างที่ได้ Kudos สูงสุด
- **Action Buttons:**
  - `[ดู Dashboard]` (เปิด Executive Dashboard)
  - `[จี้งานด่วน]` (ส่งข้อความเตือนเข้ากลุ่มช่างทันที)
  - `[โทรหาลูกค้า]` (Quick Call)

### 6.7 ระบบยกระดับการบริการลูกค้า (Customer Experience Enhancement)
> **เป้าหมาย:** สร้างความประทับใจให้ลูกค้าและลดภาระการตอบคำถามของแอดมิน

- **Customer Notification:** แจ้งเตือนลูกค้าผ่าน SMS/LINE OA เมื่อรับเครื่อง, ซ่อมเสร็จ, และพร้อมรับเครื่อง
- **Customer Portal:** หน้าเว็บสำหรับลูกค้า (ไม่ต้องล็อกอิน ใช้ Job ID + เบอร์โทร) เพื่อดูสถานะงาน, รูปภาพ Before/After, และดาวน์โหลดใบเสร็จ PDF
- **Warranty & Claim System:** บันทึกอายุการรับประกันต่องาน แจ้งเตือนเมื่อลูกค้า Claim ในช่วงรับประกัน และแสดงประวัติการรับประกันใน Job Detail
- **Quotation Approval Flow:** ช่างประเมินราคา → ส่งลิงก์ให้ลูกค้าอนุมัติ → ลูกค้ากด "ยืนยัน" → งานเริ่มทำ (ลดการโทรถามราคาซ้ำซ้อน)

### 6.8 ระบบบริหารจัดการขั้นสูง (Advanced Operations)
> **เป้าหมาย:** รองรับการเติบโตของธุรกิจและการจัดการทีมงานที่มีประสิทธิภาพ

- **SLA & Priority Management:** กำหนดระดับความเร่งด่วน (ด่วนมาก/ด่วน/ปกติ) มี SLA Timer นับถอยหลังใน Job Card และแจ้งเตือนผู้บริหารเมื่อเกิน SLA
- **Shift & Scheduling:** จัดตารางกะช่างรายสัปดาห์ แจ้งเตือนก่อนเข้ากะ และรายงานชั่วโมงทำงานรายเดือนสำหรับคำนวณ OT
- **Multi-Branch Support:** รองรับการขยายสาขา แยก Inventory ตามสาขา และรายงานเปรียบเทียบประสิทธิภาพแต่ละสาขา
- **LINE Bot Command:** สั่งงานผ่าน LINE ได้โดยตรง เช่น `/เปิดงาน [ชื่อลูกค้า] [อาการ]`, `/สต็อก [ชื่อสินค้า]`, `/สรุปวันนี้`

---

## 7. กฎสำคัญสำหรับการพัฒนาต่อ (Developer & AI Guidelines)

หาก AI Model (เช่น OpenClaw) หรือนักพัฒนาคนอื่นมารับช่วงต่อ **ต้องปฏิบัติตามกฎเหล่านี้อย่างเคร่งครัด**:

1. **ห้ามสร้างไฟล์ HTML ใหม่:** ระบบเป็น SPA ให้เพิ่มหน้าใหม่โดยใช้ `<div id="section-xxx" class="section hidden">` ใน `Index.html` เท่านั้น
2. **ใช้ Bootstrap 5.3:** ห้ามเขียน Custom CSS หากไม่จำเป็น ให้ใช้ Utility classes ของ Bootstrap
3. **No Hardcoded Secrets:** ห้ามใส่ API Key ลงในโค้ด ให้ดึงผ่าน `getConfig('KEY')` เสมอ
4. **Mobile-First เสมอ:** ผู้ใช้หลักคือช่างหน้างาน ทุก UI ต้องทดสอบบนหน้าจอมือถือ (Responsive)
5. **ใช้ Toast แทน Alert:** ห้ามใช้ `alert()` หรือ `confirm()` ของเบราว์เซอร์ ให้ใช้ `showToast()` และ Bootstrap Modal แทน
6. **API Pattern:** การเรียก Backend ต้องผ่าน `api.callServer('actionName', params)` ใน `JS_Part1.html` เสมอ
7. **Dynamic DOM:** หากต้องสร้าง Element ใหม่ ให้ใช้ `innerHTML` หรือ `document.createElement` และผูก Event Listener แบบ Event Delegation

---
---

## 8. สถานะ Deploy ล่าสุด (Deployment Status)

| รายการ | สถานะ | รายละเอียด |
|--------|--------|------------|
| **GAS Push** | ✅ สำเร็จ | 30 ไฟล์ (22 .gs + 8 .html) |
| **GAS Deploy** | ✅ @437 | v5.5.2 - setScriptProperties API |
| **initSystem()** | ✅ สำเร็จ | Sheets 13 ตาราง + Headers ครบ |
| **Triggers** | ✅ ทำงาน | 6 Triggers (sendAfterSalesAlerts, checkLowStockAlert, cronMorningAlert, geminiReorderSuggestion, autoBackup, getCRMSchedule) |
| **Script Properties** | ✅ ตั้งค่าแล้ว | DB_SS_ID, ROOT_FOLDER_ID, WEB_APP_URL, LINE_CHANNEL_ACCESS_TOKEN, LINE_GROUP_TECHNICIAN, LINE_GROUP_ACCOUNTING, LINE_GROUP_PROCUREMENT |
| **API Test** | ✅ 10/10 PASS | systemStatus, getDashboardData, getJobStateConfig, inventoryOverview, listCustomers, loginUser, addInventoryItem, barcodeLookup, getComphoneConfig, validateConfig |
| **PWA** | ✅ Deploy แล้ว | https://comphone.github.io/comphone-superapp/pwa/ |
| **GitHub** | ✅ Push แล้ว | Repository: comphone/comphone-superapp |

### สิ่งที่ยังต้องทำ (Pending)
- [ ] ตั้งค่า `LINE_GROUP_SALES` และ `LINE_GROUP_EXECUTIVE` (รอ Group ID จากผู้ใช้)
- [ ] ตั้งค่า `GEMINI_API_KEY` (รอ API Key จาก Google AI Studio)
- [ ] พัฒนา UI สำหรับ CRM, Team Attendance, After-Sales
- [ ] ระบบ PDF ใบเสร็จ และ Slip Verification

*อัปเดตล่าสุด: 17 เมษายน 2026 โดย Manus AI (Deploy สำเร็จ, initSystem() เสร็จ, API ทดสอบผ่าน 10/10)*
