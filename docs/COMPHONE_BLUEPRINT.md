# COMPHONE SUPER APP V5.5 Blueprint

## 1. ภาพรวมโปรเจค

**COMPHONE SUPER APP V5.5** เป็นระบบบริหารงานสำหรับร้านซ่อมคอมพิวเตอร์และมือถือของ **หจก.คอมโฟนแอนด์อิเลคโทรนิคส์** โดยออกแบบบนสถาปัตยกรรม **Google Apps Script + Google Sheets** เพื่อให้ใช้งานจริงได้บนระบบเดิมโดยไม่ต้องรื้อโครงสร้างหลัก ระบบเน้นการจัดการงานบริการภาคสนาม งานซ่อม งานติดตั้ง การติดตามรูปหน้างาน การบริหารลูกค้า การควบคุมสต็อก การเรียกเก็บเงิน และการแจ้งเตือนหลายช่องทางในสภาพแวดล้อมเดียวกัน [1] [2] [3] [4]

ในเชิงธุรกิจ ระบบชุดนี้มีเป้าหมายเพื่อทำให้วงจรงานตั้งแต่เปิดใบงาน มอบหมายช่าง เดินทาง ตรวจหน้างาน ใช้อะไหล่ เก็บหลักฐานรูปภาพ ส่งมอบงาน สร้าง QR รับชำระ ออกใบเสร็จ และติดตามลูกค้าหลังการขาย ทำงานแบบต่อเนื่องภายใต้ฐานข้อมูล Google Sheets เดียวกัน พร้อมเปิดทางให้ LINE Bot และ Telegram Bot ทำหน้าที่เป็นช่องทางรับเหตุการณ์และสั่งงานจากภาคสนามได้โดยตรง [1] [3] [5]

| รายการ | รายละเอียด |
|---|---|
| ชื่อระบบ | **COMPHONE SUPER APP V5.5** |
| เจ้าของระบบ | **หจก.คอมโฟนแอนด์อิเลคโทรนิคส์** |
| สถาปัตยกรรมหลัก | **Google Apps Script + Google Sheets** |
| ช่องทางหลัก | **LINE Bot, Telegram Bot, Web App Views** |
| วัตถุประสงค์ | ระบบบริหารงานร้านซ่อมคอมพิวเตอร์/มือถือและงานติดตั้งภาคสนาม |
| กลุ่มความสามารถหลัก | Job State Machine, Smart Photo, CRM, Inventory, Billing, Notification, Dashboard |
| หลักการออกแบบ | ต่อกับระบบเดิมได้เร็ว, ใช้งานจริง, ใช้ dynamic header mapping และ reuse `Utils.gs` |

## 2. System Architecture

ภาพรวมสถาปัตยกรรมอ้างอิงจากแผนภาพ `system_architecture_overview.png` ซึ่งแสดงให้เห็นว่า **Router.gs** เป็นศูนย์กลางรับคำสั่งจาก webhook, web app views และ action parameters ก่อนกระจายไปยังโมดูลย่อย เช่น `JobStateMachine`, `PhotoQueue`, `VisionAnalysis`, `CustomerManager`, `Inventory`, `Billing`, `Notify` และ `Dashboard` จากนั้นโมดูลเหล่านี้จะอ่านและเขียนข้อมูลกลับไปยังชีตฐานข้อมูลต่าง ๆ เช่น `DBJOBS`, `DB_CUSTOMERS`, `DB_INVENTORY`, `DB_BILLING`, `DB_JOB_LOGS`, `DB_STOCK_MOVEMENTS` และ `DB_PHOTO_QUEUE` [1] [5] [6]

ระบบภายนอกที่เชื่อมต่อมีบทบาทชัดเจนตามหน้าที่ โดย **Google Drive** ใช้เก็บรูปงาน เอกสาร และใบเสร็จ, **Gemini AI** ใช้วิเคราะห์รูปภาพ แยกหมวดหมู่ ตรวจคุณภาพงาน และช่วยแนะนำการจัดซื้อบางกรณี, ส่วน **PromptPay API** ใช้สร้าง QR รับชำระและรองรับการยืนยันการชำระผ่านชั้น adapter สำหรับการตรวจสลิป [1] [4] [6] [7]

| ชั้นสถาปัตยกรรม | องค์ประกอบ | บทบาท |
|---|---|---|
| Channels | LINE Bot, Telegram Bot | รับ webhook, รูปภาพ, ข้อความ, location และใช้เป็นช่องทางแจ้งเตือน |
| Entry Layer | `Router.gs` | route action/view ไปยังโมดูลที่เกี่ยวข้อง |
| Core Modules | `JobStateMachine.gs`, `JobsHandler.gs`, `PhotoQueue.gs`, `VisionAnalysis.gs`, `GpsPipeline.gs`, `CustomerManager.gs`, `Inventory.gs`, `BillingManager.gs`, `Notify.gs`, `Dashboard.gs` | ประมวลผลธุรกิจหลัก |
| Database | Google Sheets (`DBJOBS`, `DB_CUSTOMERS`, `DB_BILLING`, `DB_INVENTORY`, `DB_STOCK_MOVEMENTS`, `DB_JOB_LOGS`, `DB_PHOTO_QUEUE`, `DB_TOOL_AUDITS`) | เก็บสถานะงาน ลูกค้า สต็อก การเงิน และ audit |
| File Storage | Google Drive | เก็บรูปงาน โฟลเดอร์งาน Collage และใบเสร็จ PDF |
| AI / Payment | Gemini AI, PromptPay API | วิเคราะห์รูป ตรวจ QC สร้าง QR และรองรับตรวจสลิป |
| Views | `PhotoGallery.html`, `CustomerView`, `Dashboard`, `JobQRView` | แสดงผลฝั่งผู้ใช้/แอดมิน |

### 2.1 การไหลของคำสั่งหลัก

เมื่อมี event จาก LINE หรือ Telegram เข้ามา ระบบจะส่งต่อมายัง `Router.gs` เพื่อแยกกรณี เช่น เปิดงาน, เปลี่ยนสถานะ, รับรูปภาพ, เรียกข้อมูล dashboard, เรียกข้อมูล billing หรือเปิด view แบบ web app จากนั้นโมดูลเฉพาะทางจะทำงานและอัปเดตข้อมูลกลับสู่ฐานข้อมูลกลาง หากเป็นงานรูปภาพจะไปที่ `PhotoQueue.gs` และ `VisionAnalysis.gs`; หากเป็น lifecycle งานจะไปที่ `JobStateMachine.gs`; หากเป็นสต็อกจะไป `Inventory.gs`; และถ้าเป็นงานเรียกเก็บเงินจะไป `BillingManager.gs` ร่วมกับ `Notify.gs` และ `Dashboard.gs` [3] [4] [5] [6] [7] [8] [9] [10]

### 2.2 แหล่งข้อมูลหลักใน Google Sheets

แม้ระบบจะใช้ dynamic header mapping เพื่อลดการพึ่งชื่อคอลัมน์แบบตายตัว แต่มีชีตหลักที่จำเป็นต่อการทำงาน production ได้แก่ `DBJOBS`, `DB_CUSTOMERS`, `DB_CUSTOMER_LOGS`, `DB_PHOTO_QUEUE`, `DB_INVENTORY`, `DB_TOOL_AUDITS`, `DB_STOCK_MOVEMENTS`, `DB_BILLING` และ `SYSTEM_LOGS` โดยหลายชีตสามารถสร้างอัตโนมัติได้เมื่อยังไม่มี แต่ `DBJOBS` และชีตฐานข้อมูลหลักของงาน/สต็อกควรมีพร้อมก่อน deploy [1] [2] [3] [4] [7] [8]

| ชีต | บทบาท |
|---|---|
| `DBJOBS` | แกนกลางข้อมูลใบงาน สถานะ ช่าง พิกัด หมายเหตุ และผลวิเคราะห์ AI |
| `DB_CUSTOMERS` | ฐานข้อมูลลูกค้า พิกัด ช่องทางติดต่อ ประวัติงาน และ PM |
| `DB_CUSTOMER_LOGS` | log เหตุการณ์ CRM และ predictive maintenance |
| `DB_PHOTO_QUEUE` | คิวรูปภาพ การจัดหมวด AI ผล geofence และลิงก์ collage |
| `DB_INVENTORY` | รายการสต็อกหลัก ปริมาณ ราคา และข้อมูล reorder |
| `DB_RESERVATIONS` | บันทึกการจองอะไหล่ให้ใบงาน |
| `DB_STOCK_MOVEMENTS` | ประวัติการโอน/เคลื่อนไหวสต็อก |
| `DB_TOOL_AUDITS` | checklist และผลตรวจเครื่องมือรายสัปดาห์ |
| `DB_BILLING` | ข้อมูลบิล PromptPay สลิป การรับเงิน และใบเสร็จ |
| `DB_JOB_LOGS` | ประวัติการเปลี่ยนสถานะและการดำเนินงาน |
| `SYSTEM_LOGS` | fallback log สำหรับ notification และ CRM events |

## 3. Functional Architecture by Domain

### 3.1 Channel Layer: LINE Bot และ Telegram Bot

ช่องทางสื่อสารหลักของระบบคือ LINE Bot และ Telegram Bot ซึ่งใช้ทั้งในฝั่งรับข้อมูลจากช่างและฝั่งส่งการแจ้งเตือนกลับไปยังทีมงานหรือลูกค้า โดย LINE ใช้ทั้ง webhook รับรูปภาพและ Messaging API สำหรับ push message ส่วน Telegram ใช้สำหรับส่งข้อความแจ้งเตือนแบบหลายห้องตาม room mapping เช่น TECHNICIAN, ACCOUNTING และ EXECUTIVE [5] [9]

### 3.2 Core Routing Layer: `Router.gs`

`Router.gs` ทำหน้าที่เป็น application router ของระบบ โดยรวม endpoint สำหรับการจัดการ job, customer, photo, inventory, billing, dashboard และ notification ไว้ในจุดเดียว แนวทางนี้ช่วยให้ web app deployment มีจุดเข้าเพียงชุดเดียว และลดการกระจาย logic ของ `doGet()` หรือ route handling ไปหลายไฟล์ [3] [4]

### 3.3 Job Lifecycle Layer: `JobStateMachine.gs` + `JobsHandler.gs`

กลไกการเดินสถานะของงานใช้ **state machine 12 สถานะ** เป็นแกนหลัก โดย `JobStateMachine.gs` จัดการ transition, validation และ automation hook ระหว่างแต่ละช่วง ส่วน `JobsHandler.gs` ยังทำหน้าที่เป็นเลเยอร์ compatibility สำหรับฟังก์ชันเดิม เช่น `openJob`, `completeJob`, `updateJobStatus`, การสร้างโฟลเดอร์งาน และการบันทึกรูป เพื่อให้ระบบใหม่ทำงานร่วมกับโค้ดเก่าได้โดยไม่แตกหัก [2] [3] [8]

### 3.4 Smart Photo Layer: `PhotoQueue.gs` + `VisionAnalysis.gs` + `GpsPipeline.gs`

ระบบ Smart Photo เริ่มจากการรับรูปจาก LINE หรือ Telegram แล้วนำรูปขึ้น Google Drive ชั่วคราวก่อนบันทึกเข้า `DB_PHOTO_QUEUE` จากนั้น `VisionAnalysis.gs` จะเรียก Gemini วิเคราะห์รูปเพื่อแยกหมวดเป็น `Before`, `After`, `Survey` หรือ `Equipment` พร้อมสรุปป้ายกำกับ อุปกรณ์ที่พบ ปัญหาคุณภาพ และความพร้อมในการปิดงาน ขณะเดียวกัน `GpsPipeline.gs` จะอ่าน EXIF GPS และเปรียบเทียบกับพิกัดลูกค้าเพื่อประเมิน geofence หากผ่านและถึงสถานะงานที่เหมาะสม ระบบสามารถสร้าง before/after collage และเรียก QC อัตโนมัติได้ [1] [2] [6] [10]

### 3.5 Customer CRM Layer: `CustomerManager.gs`

`CustomerManager.gs` จัดการข้อมูลลูกค้าแบบ CRUD พร้อมความสามารถในการ sync ข้อมูลจากใบงานเข้าสู่ฐานลูกค้า, ดึงประวัติงานย้อนหลัง, คำนวณรอบ PM ถัดไป และสร้างคิวลูกค้าที่ควร follow-up ตามกำหนดเวลา หรือ campaign ช่วงฤดูฝน ระบบยังบันทึก event log ของลูกค้าลง `DB_CUSTOMER_LOGS` เพื่อรองรับ audit และ CRM automation ภายหลัง [2] [10]

### 3.6 Inventory Layer: `Inventory.gs`

โมดูลสต็อกประกอบด้วยระบบจองอะไหล่ตอนเปิดงาน, ตัดสต็อกเมื่อปิดงาน, แจ้งเตือนของใกล้หมด, โอนสต็อกระหว่างคลัง/หน้าร้าน/รถช่าง, วิเคราะห์ predictive stocking และรองรับ checklist สำหรับ weekly tool audit โดยแนวคิดหลักคือ **3-layer inventory** ได้แก่ Warehouse, Shop และ Van ของช่างแต่ละคน ซึ่งเหมาะกับรูปแบบงานติดตั้งภาคสนามและงานซ่อมที่มีการเบิกอะไหล่จากหลายจุด [2] [8]

### 3.7 Billing and Payment Layer: `BillingManager.gs`

`BillingManager.gs` รับผิดชอบการสร้าง billing record จากใบงาน, คำนวณ parts/labor/subtotal/discount/total, สร้าง PromptPay payload และ QR URL, ตรวจสลิปผ่าน API adapter, อัปเดตสถานะการชำระเป็น `UNPAID`, `PARTIAL` หรือ `PAID`, และสร้างใบเสร็จ PDF ลง Google Drive เมื่อรับชำระครบ ระบบนี้ผูกกับ lifecycle งานโดยเฉพาะเมื่อเข้าสถานะ `10` และ `11` [4] [7]

### 3.8 Notification Layer: `Notify.gs`

`Notify.gs` ถูกปรับจากแนวทาง LINE Notify เดิมไปใช้ **LINE Messaging API** และเพิ่ม **Telegram** เป็นอีกช่องทางหนึ่ง โมดูลนี้รองรับการส่งข้อความแบบ multi-channel, การแจ้งเตือน billing ready, การยืนยันการรับชำระเงิน, การส่ง alert สำคัญจาก dashboard และการ fallback log ลง `SYSTEM_LOGS` หาก token หรือ group/chat ID ไม่พร้อม [4] [9]

### 3.9 Analytics and View Layer: `Dashboard.gs` + UI Files

`Dashboard.gs` ให้ทั้ง API และ UI data สำหรับภาพรวมงาน รายได้ สถานะสต็อก งานค้าง low stock PM due และ top technician ขณะเดียวกัน `PhotoGallery.html` เป็นหน้า gallery แบบ responsive สำหรับดูรูปตามหมวด `Before`, `After`, `Survey`, `Equipment` พร้อมข้อมูล geofence, AI phase, ปัญหาที่พบ และ before/after collage ส่วนแผนภาพสถาปัตยกรรมยังอ้างถึง `CustomerView` และ `JobQRView` ในฐานะ web app views สำหรับข้อมูลลูกค้าและหน้าจอ QR สถานะงาน [1] [4] [6]

## 4. Module Inventory and Responsibilities

ตารางต่อไปนี้สรุปบทบาทของไฟล์หลักที่อยู่ในขอบเขต V5.5 เพื่อใช้เป็นฐานสำหรับการดูแลต่อ, onboarding ทีม, และตรวจสอบจุดเชื่อมของระบบทั้งสองเฟส [1] [2] [3] [4] [5] [6] [7] [8] [9] [10]

| ไฟล์ | บทบาทหลัก | จุดเชื่อมสำคัญ |
|---|---|---|
| `Router.gs` | จุดรับ action/view ของ Web App และ bot integration | ทุกโมดูลหลัก |
| `JobStateMachine.gs` | คุม transition 12 สถานะและ automation hooks | `DBJOBS`, `DB_JOB_LOGS`, billing/QC/notification |
| `JobsHandler.gs` | compatibility layer สำหรับ job CRUD และโฟลเดอร์รูป | `DBJOBS`, Drive, Inventory, Billing |
| `PhotoQueue.gs` | คิวรูป Drive-first, auto sorting, collage, gallery data | `DB_PHOTO_QUEUE`, Drive, Vision, Gps |
| `VisionAnalysis.gs` | วิเคราะห์รูปด้วย Gemini, QC, auto-label | Gemini AI, `DBJOBS` |
| `GpsPipeline.gs` | GPS/EXIF parsing, geofence, nearest tech | `DB_CUSTOMERS`, `DBJOBS` |
| `CustomerManager.gs` | CRM, history, sync จาก job, predictive maintenance | `DB_CUSTOMERS`, `DB_CUSTOMER_LOGS` |
| `Inventory.gs` | reservation, cut stock, transfer, predictive stocking, tool audit | `DB_INVENTORY`, `DB_RESERVATIONS`, `DB_STOCK_MOVEMENTS`, `DB_TOOL_AUDITS` |
| `BillingManager.gs` | billing, PromptPay QR, slip verify, receipt PDF | `DB_BILLING`, PromptPay, Drive |
| `Notify.gs` | LINE/Telegram notifications และ fallback logs | LINE Messaging API, Telegram, `SYSTEM_LOGS` |
| `Dashboard.gs` | dashboard summary, alerts, revenue report | `DBJOBS`, `DB_BILLING`, `DB_INVENTORY`, `DB_CUSTOMERS` |
| `PhotoGallery.html` | UI แสดงรูปงานตามหมวดและ collage | `photoGalleryData` route |
| `CustomerView.html` | UI ข้อมูลลูกค้า | อ้างอิงจากสถาปัตยกรรมภาพรวม [1] |
| `JobQRView.html` | UI แสดง QR / job status | อ้างอิงจากสถาปัตยกรรมภาพรวม [1] |
| `Utils.gs` | helper กลาง, config, spreadsheet access, header mapping | dependency ระดับระบบ [2] [4] |

### 4.1 รายละเอียดเชิงหน้าที่ของ UI สำคัญ

`PhotoGallery.html` เป็น UI ที่พร้อมใช้งานจริงสำหรับเปิดดูรูปงานตาม `jobId` และ filter ตามหมวด โดยแสดงจำนวนรูปแต่ละประเภท, latest collage, รายละเอียดภาพ, เวลา, ช่าง, AI phase, สถานะ geofence และหมายเหตุจาก AI ซึ่งเหมาะกับการให้ทีมงานหรือลูกค้าภายในตรวจหลักฐานงานย้อนหลังได้รวดเร็ว [6]

| UI / View | หน้าที่ | แหล่งข้อมูล |
|---|---|---|
| `PhotoGallery.html` | แสดงรูปตามหมวด Before/After/Survey/Equipment และ collage | `action=photoGalleryData` |
| `CustomerView.html` | แสดงข้อมูลลูกค้า/ประวัติงาน | อ้างอิงจาก Router + Architecture [1] [3] |
| `JobQRView.html` | แสดง QR และสถานะงานสำหรับการรับชำระหรือเช็กสถานะ | อ้างอิงจาก Architecture และ Phase 2 flow [1] [4] |
| Dashboard View | แสดงสรุปงาน รายได้ และ alert | `Dashboard.gs` |

## 5. Job Lifecycle (12 สถานะ)

แผนภาพ `job_lifecycle_flow.png` ระบุวงจรงานแบบ 12 สถานะตั้งแต่เปิดงานจนปิดจ็อบสมบูรณ์ โดยใช้ state machine เป็นตัวควบคุมการเปลี่ยนผ่านและเชื่อมอัตโนมัติกับ inventory, photo QC, billing, receipt และ customer follow-up ทำให้สถานะของงานมีความหมายเชิงปฏิบัติการและเชิงบัญชีในตัวเดียวกัน [2] [5]

| สถานะ | ชื่อสถานะ | ความหมายเชิงปฏิบัติการ | Automation หลัก |
|---|---|---|---|
| 1 | รออนุมัติงาน | เปิดงานแล้ว รอมอบหมาย | สร้าง job record |
| 2 | มอบหมายแล้ว | assign ช่าง/ทีม | sync assignee และบันทึก log |
| 3 | รับงานแล้ว | ช่างยืนยันรับงาน | แจ้งความพร้อมเริ่มงาน |
| 4 | เดินทาง | ช่างกำลังไปหน้างาน | เก็บ progress log |
| 5 | ถึงหน้างาน | ตรวจ geofence / manual review | validate GPS/EXIF |
| 6 | เริ่มงาน | เริ่มปฏิบัติงานและจองอะไหล่ | auto-reserve inventory |
| 7 | รอชิ้นส่วน | อะไหล่ขาด/ต้องโอน/รอ supplier | เชื่อม stock movement |
| 8 | งานเสร็จ | ช่างทำงานหน้างานเสร็จ | auto vision QC + collage |
| 9 | ลูกค้าตรวจรับ | ส่งมอบงานให้ลูกค้าตรวจ | รับผล QC / sign-off |
| 10 | รอเก็บเงิน | สร้าง PromptPay QR | auto-create billing + QR |
| 11 | เก็บเงินแล้ว | ตรวจสลิปและออกใบเสร็จ | slip verify + auto-receipt |
| 12 | ปิดงาน | สำรองเอกสารและติดตามความพึงพอใจ | auto-backup + customer satisfaction |

### 5.1 จุดเชื่อม automation ตามสถานะ

สถานะ `8` เป็นจุดเริ่มของ **Auto QC** โดยระบบจะใช้รูปหมวด After เป็นหลักในการวิเคราะห์คุณภาพงานและตรวจว่าพร้อมปิดงานหรือยัง ขณะที่สถานะ `10` เป็น trigger สำหรับการสร้าง billing และ QR รับชำระ และสถานะ `11` คือช่วงยืนยันการรับเงินพร้อมออกใบเสร็จ ทำให้การทำงานของทีมปฏิบัติการและการเงินไม่แยกขาดจากกัน [2] [4] [7]

| Trigger | ผลลัพธ์ |
|---|---|
| เปลี่ยนเป็นสถานะ 5 | เริ่มตรวจ geofence จากพิกัดรูป/ลูกค้า |
| เปลี่ยนเป็นสถานะ 6 | จองอะไหล่ให้ใบงาน |
| เปลี่ยนเป็นสถานะ 8 | Vision QC, create collage, แจ้ง rework ถ้าจำเป็น |
| เปลี่ยนเป็นสถานะ 10 | สร้าง billing record และ PromptPay QR |
| เปลี่ยนเป็นสถานะ 11 หรือเรียก `markBillingPaid` | อัปเดต payment status และสร้างใบเสร็จ |
| เปลี่ยนเป็นสถานะ 12 | backup เอกสาร, บันทึก follow-up, ปิดจบงาน |

## 6. Smart Photo Handling Flow

จากแผนภาพ `smart_photo_handling_flow.png` ลำดับของ Smart Photo เริ่มจากช่างส่งรูปผ่าน LINE หรือ Telegram แล้ว `Router.gs` รับ webhook ก่อนส่งต่อให้ `PhotoQueue.gs` สร้าง queue record หลังจากนั้นระบบจะดึง metadata เช่น EXIF, GPS และ timestamp มาตรวจ geofence หากรูปอยู่ในรัศมีลูกค้า ระบบจึงจะส่งต่อไปให้ Gemini วิเคราะห์และ auto-label แล้วจัดเก็บลงโฟลเดอร์ Google Drive ที่ถูกต้องตาม phase และ category [2] [6] [10]

เมื่อสถานะงานอยู่ที่ `8` ระบบจะทำ Auto QC เพิ่มเติม หากผ่านจะสร้าง before/after collage และอัปเดต `DB_PHOTO_QUEUE` กับ `DBJOBS` ว่าประมวลผลแล้ว แต่หากไม่ผ่านจะส่งแจ้งเตือนให้ช่างหรือแอดมินกลับไปแก้งานหรือส่งหลักฐานเพิ่มเติม แนวทางนี้ทำให้รูปหน้างานไม่ใช่เพียงหลักฐานเก็บไฟล์ แต่เป็นอินพุตที่ขับเคลื่อนคุณภาพงานจริง [2] [6] [10]

| ขั้นตอน | โมดูลหลัก | ผลลัพธ์ |
|---|---|---|
| Receive photo | `Router.gs`, `PhotoQueue.gs` | เกิด queue record ใน `DB_PHOTO_QUEUE` |
| Extract metadata | `GpsPipeline.gs` / helper ใน `PhotoQueue.gs` | ได้ EXIF / GPS / timestamp |
| Geofence check | `GpsPipeline.gs` | PASS / OUT_OF_GEOFENCE / NO_EXIF |
| AI analysis | `VisionAnalysis.gs` | category, auto_label, issues, readiness |
| Store to Drive | `PhotoQueue.gs` | จัดเข้าหมวด Before/After/Survey/Equipment |
| Auto QC | `VisionAnalysis.gs` | PASS / NEEDS_REVIEW |
| Collage generation | `PhotoQueue.gs` / Slides integration | ลิงก์ before-after collage |
| Update database | `DB_PHOTO_QUEUE`, `DBJOBS` | mark processed และเก็บผลวิเคราะห์ |

## 7. CRM and Customer Lifecycle

ฝั่ง CRM ถูกออกแบบให้เชื่อมกับ lifecycle งานโดยตรง ไม่ใช่แยกฐานลูกค้าออกจากงานบริการ เมื่อเปิดงานใหม่ ระบบสามารถ auto-fill ข้อมูลลูกค้าจาก `DB_CUSTOMERS`; เมื่อมีการดำเนินงานหรือปิดงาน ระบบจะ sync ข้อมูลล่าสุดกลับไปยังประวัติลูกค้า รวมถึง `Last_Job_ID`, `Last_Service_Date`, `Next_PM_Date`, จำนวนงานสะสม และหมายเหตุที่ดึงจากใบงาน [2] [10]

อีกความสามารถสำคัญคือ **Predictive Maintenance** ซึ่งสร้างคิวลูกค้าที่ใกล้ถึงรอบ PM ภายในจำนวนวันที่กำหนด หรือ campaign เชิงฤดูกาล เช่นก่อนเข้าฤดูฝน พร้อมสร้างข้อความ follow-up อัตโนมัติและบันทึก event log เพื่อใช้ในการบริการหลังการขายและสร้างรายได้ซ้ำ [2] [10]

| ความสามารถ | รายละเอียด |
|---|---|
| CRUD ลูกค้า | สร้าง แก้ไข ค้นหา และดึงข้อมูลลูกค้า |
| Customer matching | จับคู่ด้วย `customer_id`, ชื่อ, เบอร์โทร หรือ LINE user ID |
| Sync from Job | ดึงข้อมูลจาก DBJOBS มาอัปเดตฐานลูกค้า |
| History lookup | ดึงประวัติงานย้อนหลังของลูกค้า |
| PM calculation | คำนวณวัน PM ถัดไปจากรอบ 330 วันโดยค่าเริ่มต้น |
| Predictive queue | สร้างรายชื่อที่ควร follow-up ภายใน x วัน |
| CRM logging | บันทึก `SYNC_FROM_JOB`, `PREDICTIVE_PM` และ event อื่น |

## 8. Inventory 3-Layer Design

สต็อกของ V5.5 ไม่ได้จำกัดอยู่ที่การนับคงเหลือในชีตเดียว แต่ขยายไปสู่การควบคุมการใช้อะไหล่ตามงานจริง โดยมีทั้ง reservation, consumption, transfer และ tool audit แนวคิดนี้เหมาะกับธุรกิจที่มีทั้งคลังกลาง หน้าร้าน และรถช่าง ซึ่งต้องยืดหยุ่นต่อการเบิกของหน้างานและการโอนสินค้าแบบเร่งด่วน [2] [8]

| Layer | ความหมาย | ตัวอย่างการใช้ |
|---|---|---|
| Warehouse | คลังกลาง | รับเข้า/เก็บอะไหล่หลัก |
| Shop | หน้าร้านหรือจุดเบิก | เตรียมของสำหรับงานรายวัน |
| Van | รถช่างรายคน | stock ติดรถสำหรับงานภาคสนาม |

ระบบรองรับการจองอะไหล่เมื่อเริ่มงาน, คืนของหากยกเลิก reservation, ตัดของเมื่อปิดงาน, แจ้ง low stock, วิเคราะห์ reorder ผ่าน Gemini และสร้าง checklist ตรวจเครื่องมือรายสัปดาห์ ทั้งหมดนี้ช่วยให้สต็อกมี traceability มากขึ้นโดยไม่ต้องเปลี่ยนแพลตฟอร์มฐานข้อมูล [2] [8]

## 9. Billing, Payment, and Receipt Automation

เฟส 2 เพิ่มความสามารถด้านการเงินแบบครบลูป โดย billing record ถูกสร้างอัตโนมัติจากบริบทของงานและรายการค่าใช้จ่าย เมื่อมี `PROMPTPAY_BILLER_ID` ระบบจะสร้าง payload มาตรฐานและ QR image URL ทันที จากนั้นสามารถส่ง QR ให้ลูกค้าผ่าน notification flow ได้ เมื่อได้รับสลิป ระบบรองรับการตรวจสอบผ่าน API adapter และเมื่อยืนยันการรับเงินครบก็จะออกใบเสร็จ PDF พร้อมบันทึก URL และ file ID กลับเข้า `DB_BILLING` [4] [7] [9]

| ขั้นตอน | โมดูล | ผลลัพธ์ |
|---|---|---|
| Create billing | `BillingManager.gs` | สร้าง record ใน `DB_BILLING` |
| Generate QR | `generatePromptPayQR()` | ได้ payload และ QR URL |
| Notify billing | `Notify.gs` | ส่งยอดและ QR ไปทีมบัญชี/ลูกค้า |
| Verify slip | `verifyPaymentSlip()` | ตรวจยอดและผู้รับเงิน |
| Mark paid | `markBillingPaid()` | ปรับ `Payment_Status` และยอดคงเหลือ |
| Generate receipt | `generateReceiptPDF()` | ได้ใบเสร็จ PDF บน Google Drive |

## 10. Dashboard and Reporting

`Dashboard.gs` ทำหน้าที่เป็นทั้ง data API และฐานของ dashboard ฝั่งผู้ดูแล โดยสรุปงานล่าสุด, สถานะการกระจายของงาน, รายได้รายวัน/สัปดาห์/เดือน, จำนวนสต็อกต่ำ, งานค้างเกินกำหนด, จำนวนรูปที่ค้างประมวลผล, top technician และลูกค้าที่ถึงรอบ PM ได้จากฐานข้อมูลหลักโดยตรง [4] [7]

ในเชิงปฏิบัติ Dashboard ช่วยให้ผู้บริหารเห็นภาระงานและปัญหาสำคัญได้จากจุดเดียว ขณะเดียวกันยังมีฟังก์ชันส่งสรุปรายวันหรือ critical alerts ออกไปยัง LINE/Telegram เพื่อให้ทีมตัดสินใจได้เร็วขึ้นโดยไม่ต้องเปิด Apps Script หรือ Google Sheets ตลอดเวลา [4] [7] [9]

## 11. Development Timeline

เส้นทางพัฒนาของ V5.5 แบ่งออกเป็น 2 เฟสหลักอย่างชัดเจน โดย **Phase 1** เน้นการทำให้ข้อมูลหน้างานและข้อมูลปฏิบัติการมีคุณภาพสูงขึ้น ส่วน **Phase 2** เน้นการปิดลูปทางการเงิน การแจ้งเตือน และการมองภาพรวมผ่าน dashboard [2] [4]

| Phase | ขอบเขตงาน | ผลลัพธ์หลัก |
|---|---|---|
| Phase 1 | Job State Machine, Smart Photo, Customer CRM, Inventory 3-Layer | งานมีสถานะ 12 ขั้น, รูปถูกจัดหมวดและ QC ได้, ลูกค้าถูก sync อัตโนมัติ, สต็อกสัมพันธ์กับงาน |
| Phase 2 | Billing & Payment, Notification, Dashboard | สร้างบิลและ PromptPay QR, ตรวจรับชำระ, ออกใบเสร็จ, แจ้งเตือนหลายช่องทาง, มี dashboard summary |

## 12. Deployment Guide

การ deploy ระบบนี้ควรทำใน Google Apps Script project เดิมของ COMPHONE โดยยึดหลัก **ต่อของเดิม ไม่รื้อโครงสร้างเดิม** ไฟล์ใหม่และไฟล์ที่แก้ควรถูกคัดลอกเข้า project ให้ครบ จากนั้นตรวจ config, scopes และ web app deployment ให้พร้อมก่อนทดสอบกับข้อมูลจริง [2] [4]

### 12.1 ขั้นตอน deploy แนะนำ

| ลำดับ | ขั้นตอน |
|---|---|
| 1 | สำรอง Apps Script project และ Google Sheet ปัจจุบันก่อนแก้ไข |
| 2 | คัดลอกไฟล์ `.gs` และ `.html` ที่เกี่ยวข้องเข้า project ให้ครบ |
| 3 | ตรวจว่า `Utils.gs` และ helper กลางของระบบเดิมยังใช้งานได้ |
| 4 | ตรวจ/ตั้ง Script Properties และ Config ที่จำเป็น |
| 5 | authorize scopes สำหรับ Sheets, Drive, UrlFetch, Slides, LockService, HtmlService |
| 6 | deploy เป็น Web App โดย `Execute as: Me` |
| 7 | อัปเดต URL ปลายทางใน LINE Bot, Telegram Bot และ automation ภายนอก |
| 8 | ทดสอบ CRM, Photo/QC, Inventory, Billing, Dashboard ตาม test plan |

### 12.2 Script Properties / Config ที่ต้องตั้ง

| Config Key | จำเป็น | ใช้งานโดย |
|---|---|---|
| `ROOT_FOLDER_ID` | จำเป็น | เก็บรูปงานและโฟลเดอร์หลักบน Drive [8] |
| `LINE_CHANNEL_ACCESS_TOKEN` | จำเป็นถ้าใช้ LINE | รับ/ส่งข้อความ LINE และดึงรูป [5] [9] |
| `PROMPTPAY_BILLER_ID` | แนะนำมาก | สร้าง PromptPay QR [4] [7] |
| `PROMPTPAY_ID` | สำรอง | fallback สำหรับระบบเดิม [4] [7] |
| `SLIP_VERIFY_API_URL` | ถ้ามี provider จริง | ตรวจสลิปอัตโนมัติ [4] [7] |
| `SLIP_VERIFY_API_KEY` | ถ้ามี provider จริง | auth สำหรับ slip verify [4] [7] |
| `BILLING_RECEIPT_FOLDER_ID` | แนะนำ | ปลายทางใบเสร็จ PDF [4] [7] |
| `TELEGRAM_BOT_TOKEN` | ถ้าใช้ Telegram | ส่งข้อความ Telegram [4] [9] |
| `TELEGRAM_CHAT_TECHNICIAN` | ไม่บังคับ | chat กลุ่มช่าง [4] |
| `TELEGRAM_CHAT_ADMIN` | ไม่บังคับ | chat แอดมิน [4] |
| `TELEGRAM_CHAT_CUSTOMER` | ไม่บังคับ | chat ลูกค้า [4] |
| `LINE_GROUP_TECHNICIAN` / `LINE_GROUP_ACCOUNTING` / `LINE_GROUP_PROCUREMENT` / `LINE_GROUP_EXECUTIVE` | แนะนำ | room mapping สำหรับ push message [9] |
| `GEMINI_API_KEY` หรือ `GOOGLE_AI_API_KEY` | จำเป็นสำหรับ AI | Vision analysis และ reorder suggestion [6] [8] |

### 12.3 ชีตที่ควรสร้าง/ตรวจสอบก่อนใช้งานจริง

| ชีต | สถานะก่อนใช้งานจริง |
|---|---|
| `DBJOBS` | ต้องมีและเป็นฐานข้อมูลงานหลัก |
| `DB_CUSTOMERS` | ควรมีเพื่อให้ CRM และ geofence ทำงานเต็ม |
| `DB_CUSTOMER_LOGS` | ควรมีหรือให้ระบบสร้าง |
| `DB_PHOTO_QUEUE` | ควรมีหรือให้ระบบสร้าง |
| `DB_INVENTORY` | ต้องมีสำหรับ stock และ billing context |
| `DB_RESERVATIONS` | ให้ระบบสร้างได้ แต่ควรตรวจ schema |
| `DB_STOCK_MOVEMENTS` | ควรมีเพื่อ trace การโอนสต็อก |
| `DB_TOOL_AUDITS` | ควรมีสำหรับ weekly tool audit |
| `DB_BILLING` | ให้ระบบสร้างได้ แต่ควรตรวจ schema |
| `DB_JOB_LOGS` | ควรมีสำหรับ state transition logging |
| `SYSTEM_LOGS` | ควรมีสำหรับ fallback notification logs |

### 12.4 ข้อควรระวังระดับ production

| ประเด็น | คำแนะนำ |
|---|---|
| Dynamic Header | แม้ระบบ map header ได้ยืดหยุ่น แต่คอลัมน์หลักควรใกล้เคียงตาม blueprint นี้ |
| Geofence | รูปที่ไม่มี EXIF GPS จะตรวจพื้นที่ไม่ได้ |
| Slip verification | ถ้ายังไม่มี provider จริง ไม่ควรพึ่งการยืนยันสลิปอัตโนมัติเต็มรูปแบบ |
| Receipt storage | ควรกำหนดโฟลเดอร์ปลายทางให้ชัดด้วย `BILLING_RECEIPT_FOLDER_ID` |
| Function collision | ควรตรวจซ้ำว่า `Router.gs` เป็น entry point หลักและไม่มี `doGet()` ซ้ำจากไฟล์เดิม [4] |
| Backward compatibility | `JobsHandler.gs` ยังรองรับโค้ดเดิม จึงควรทดสอบทั้ง flow ใหม่และ flow เก่า |

## 13. Recommended Production Checklist

ก่อนขึ้นใช้งานจริง ควรยืนยันว่าระบบสามารถทำงานจบลูปขั้นต่ำได้จริง ได้แก่ เปิดงาน, เปลี่ยนสถานะ, รับรูป, QC, จอง/ตัดสต็อก, สร้าง billing, รับชำระ, ออกใบเสร็จ, แจ้งเตือน และอ่าน dashboard summary ได้จาก data จริง เพราะ V5.5 ถูกออกแบบให้ค่อย ๆ เสริมจากระบบเดิม ไม่ใช่เริ่มใหม่ทั้งหมด [2] [4]

| Checklist | ผ่าน/ไม่ผ่าน |
|---|---|
| เปิดงานใหม่และเปลี่ยนสถานะ 1→12 ได้ครบ |  |
| รับรูปจาก LINE/Telegram และสร้าง queue record ได้ |  |
| Geofence และ AI category ทำงานกับรูปจริงได้ |  |
| Auto QC ทำงานเมื่อสถานะเป็น 8 |  |
| CRM sync จาก job ได้ |  |
| Reservation / cut stock / transfer stock ทำงานได้ |  |
| Billing และ PromptPay QR ถูกสร้างตอนสถานะ 10 |  |
| Mark paid และ receipt PDF ทำงานได้ |  |
| LINE / Telegram notification ส่งได้จริง |  |
| Dashboard summary ตรงกับข้อมูลในชีต |  |

## 14. References

[1]: file:///home/ubuntu/upload/system_architecture_overview.png "system_architecture_overview.png"
[2]: file:///home/ubuntu/upload/INSTALL_PHASE1_SYSTEMS.md "INSTALL_PHASE1_SYSTEMS.md"
[3]: file:///home/ubuntu/upload/Router.gs "Router.gs"
[4]: file:///home/ubuntu/upload/INSTALL_PHASE2_SYSTEMS.md "INSTALL_PHASE2_SYSTEMS.md"
[5]: file:///home/ubuntu/upload/job_lifecycle_flow.png "job_lifecycle_flow.png"
[6]: file:///home/ubuntu/upload/smart_photo_handling_flow.png "smart_photo_handling_flow.png"
[7]: file:///home/ubuntu/upload/BillingManager.gs "BillingManager.gs"
[8]: file:///home/ubuntu/upload/JobsHandler.gs "JobsHandler.gs"
[9]: file:///home/ubuntu/upload/Notify.gs "Notify.gs"
[10]: file:///home/ubuntu/upload/CustomerManager.gs "CustomerManager.gs"
