# COMPHONE SUPER APP V5.5 Memory Log

## เอกสารสรุปบันทึกความจำโครงการ

เอกสารฉบับนี้ใช้บันทึก **การตัดสินใจสำคัญ การเปลี่ยนแปลงเชิงสถาปัตยกรรม และ milestone หลัก** ของโปรเจค **COMPHONE SUPER APP V5.5** เพื่อใช้เป็นฐานอ้างอิงสำหรับการดูแลระบบต่อ, onboarding ทีมงาน, audit การพัฒนา, และการตรวจสอบเหตุผลของการออกแบบแต่ละส่วนในเฟส 1 และเฟส 2 [1] [2] [3] [4]

ระบบถูกพัฒนาบนแนวคิด **ต่อยอดระบบเดิมบน Google Apps Script + Google Sheets** โดยให้ `Router.gs` เป็นศูนย์กลางของ route และ orchestration ขณะที่งานธุรกิจหลักถูกแยกเป็นโมดูลเฉพาะทาง เช่น state machine, smart photo, CRM, inventory, billing, notification และ dashboard เพื่อให้ระบบขยายต่อได้โดยไม่ทำให้โค้ดเดิมพัง [2] [3] [4]

| รายการ | รายละเอียด |
|---|---|
| ชื่อระบบ | **COMPHONE SUPER APP V5.5** |
| วันที่อ้างอิงหลัก | **11 เม.ย. 2569** |
| สถาปัตยกรรม | **Google Apps Script + Google Sheets** |
| จุดประสงค์ของ Memory Log | เก็บบันทึกการตัดสินใจและ milestone สำคัญของโครงการ |

## บันทึกเหตุการณ์สำคัญ

### 11 เม.ย. 2569 — พัฒนา Phase 1 เสร็จ

ในวันที่ 11 เม.ย. 2569 ได้สรุปการพัฒนา **Phase 1** ของระบบเสร็จสมบูรณ์ โดยขอบเขตหลักครอบคลุม **Job State Machine, Smart Photo, Customer CRM และ Inventory 3-Layer** ซึ่งถือเป็นแกนปฏิบัติการของระบบ V5.5 การเปลี่ยนแปลงสำคัญคือการย้ายงานที่เคยกระจัดกระจายให้มาอยู่ภายใต้ state transition ที่ชัดเจน 12 สถานะ พร้อมเชื่อมรูปหน้างาน, การจองอะไหล่, การ sync ลูกค้า และ log การทำงานเข้าด้วยกัน [2]

| หัวข้อ | รายละเอียดการตัดสินใจ |
|---|---|
| Job State Machine | ใช้ state machine 12 สถานะเป็นแกนของทุก workflow |
| Smart Photo | เปลี่ยนรูปหน้างานจากไฟล์แนบธรรมดาให้เป็นข้อมูลที่ AI วิเคราะห์และ QC ได้ |
| Customer CRM | สร้างฐานลูกค้าแบบ sync จากงานจริงและรองรับ predictive maintenance |
| Inventory 3-Layer | แยก stock เป็น Warehouse / Shop / Van เพื่อให้เหมาะกับงานซ่อมและภาคสนาม |

### 11 เม.ย. 2569 — พัฒนา Phase 2 เสร็จ

ในวันเดียวกัน ได้สรุปการพัฒนา **Phase 2** เสร็จสมบูรณ์ โดยต่อยอดจากข้อมูลปฏิบัติการของเฟส 1 ไปสู่ชั้นธุรกิจที่ปิดงานได้ครบลูปมากขึ้น ได้แก่ **Billing & Payment, Notification และ Dashboard** การตัดสินใจสำคัญในช่วงนี้คือทำให้สถานะงานเชื่อมกับการเงินโดยตรง เช่น การสร้าง PromptPay QR เมื่อเข้าสถานะรอเก็บเงิน และการออกใบเสร็จอัตโนมัติเมื่อยืนยันการรับชำระสำเร็จ [4]

| หัวข้อ | รายละเอียดการตัดสินใจ |
|---|---|
| Billing & Payment | เพิ่ม DB_BILLING, PromptPay QR, slip verify และ receipt PDF |
| Notification | เปลี่ยนแนวทางไปใช้ LINE Messaging API และเพิ่ม Telegram |
| Dashboard | เพิ่มภาพรวมงาน รายได้ สต็อกต่ำ PM due และ alert สำคัญ |

### 11 เม.ย. 2569 — สร้าง Diagram 3 ชุด

เพื่อทำให้ทีมสามารถเข้าใจระบบได้เร็วขึ้น ได้จัดทำ diagram จำนวน 3 ชุดเป็นเอกสารอ้างอิงหลัก ได้แก่ **System Architecture**, **Job Lifecycle** และ **Smart Photo Flow** ซึ่งใช้สื่อสารทั้งภาพรวมสถาปัตยกรรม ความสัมพันธ์ระหว่างโมดูล และลำดับการประมวลผลงานรูปภาพในภาคสนาม [5] [6] [7]

| Diagram | จุดประสงค์ |
|---|---|
| `system_architecture_overview.png` | อธิบาย channel, router, modules, databases และ external services |
| `job_lifecycle_flow.png` | อธิบาย 12 สถานะของงานและ automation ที่เชื่อมระหว่างสถานะ |
| `smart_photo_handling_flow.png` | อธิบาย flow การรับรูป, geofence, AI analysis, QC และ collage |

### 11 เม.ย. 2569 — Push โค้ดทั้งหมดขึ้น GitHub

อีก milestone สำคัญคือการผลักโค้ดทั้งหมดขึ้น GitHub เพื่อให้เกิดแหล่งอ้างอิง versioned source of truth สำหรับระบบ V5.5 ซึ่งช่วยให้การส่งมอบงาน การย้อนดูประวัติ และการทำเอกสารประกอบในอนาคตมีโครงสร้างชัดเจนขึ้น ทั้งยังรองรับการจัดเก็บเอกสารสรุปโครงการในโฟลเดอร์ `docs/` ของ repository เดียวกัน [3] [4]

## Architectural Decisions Log

### 1. ยึด Router กลางแทนการกระจาย endpoint

มีการตัดสินใจให้ `Router.gs` เป็นจุดรวมของ route logic สำหรับ action และ view แทนการกระจาย `doGet()` หรือ handler ไปคนละไฟล์ เพราะแนวทางนี้ดูแลง่ายกว่าใน Apps Script project ที่มีหลายโมดูล และช่วยให้ web app deployment มี entry point เดียว [3] [4]

### 2. ใช้ Google Sheets เป็น operational database ต่อไป

โครงการเลือกคง **Google Sheets** เป็นฐานข้อมูลหลักต่อไป เนื่องจากสอดคล้องกับระบบเดิมของธุรกิจและช่วยลดเวลา migration โดยเพิ่มแนวทาง dynamic header mapping, auto-create sheets บางส่วน และ utility กลางเพื่อทำให้โค้ดยืดหยุ่นขึ้นแทนการเปลี่ยน platform ทั้งหมด [2] [4]

### 3. เปลี่ยนงานรูปถ่ายให้เป็น data pipeline

ก่อน V5.5 รูปงานมักทำหน้าที่เพียงหลักฐานแนบงาน แต่การตัดสินใจสำคัญของ Phase 1 คือทำให้รูปเป็น data pipeline ตั้งแต่การรับ event, สร้าง queue, ตรวจ GPS, วิเคราะห์ AI, จัดหมวด, QC และสร้าง collage ส่งผลให้รูปหน้างานกลายเป็นตัวขับการประเมินคุณภาพงาน ไม่ใช่แค่ไฟล์เก็บย้อนหลัง [2] [7]

### 4. ยึด state machine เป็นแกนกลางของระบบปฏิบัติการ

มีการตัดสินใจให้ทุก workflow สำคัญอิงกับสถานะงาน 12 ขั้นแทนการใช้ข้อความสถานะอิสระ เพราะช่วยให้ validation, audit log, billing trigger, stock reservation และ customer follow-up ผูกกันได้เป็นระบบมากขึ้น [2] [6]

### 5. ใช้ 3-layer inventory ให้สอดคล้องงานจริง

การออกแบบ stock เป็น Warehouse, Shop และ Van สะท้อนรูปแบบการทำงานจริงของธุรกิจที่มีทั้งงานร้านและงานภาคสนาม จึงตัดสินใจไม่ใช้ stock quantity แบบชั้นเดียว เพราะไม่ตอบโจทย์การเบิก โอน และตรวจเครื่องมือของช่าง [2]

### 6. ใช้ PromptPay เป็น payment rail หลัก

ใน Phase 2 เลือกให้ PromptPay เป็นช่องทางรับชำระหลักที่ระบบรองรับโดยตรง เนื่องจากเหมาะกับงานบริการในไทย เชื่อมกับการสร้าง QR ได้ง่าย และทำให้ flow สถานะ 10→11 มี automation ที่ชัดเจน [4]

### 7. ปรับ notification เป็น multi-channel

มีการตัดสินใจเลิกพึ่ง LINE Notify แบบเดิมเป็นหลัก แล้วเปลี่ยนมาใช้ LINE Messaging API ร่วมกับ Telegram เพื่อเพิ่มความเสถียร ความยืดหยุ่นของ room mapping และรองรับการแจ้งเตือนตามบทบาทของทีมได้ดีขึ้น [4]

## Milestone Summary Table

| วันที่ | Milestone | สรุปผล |
|---|---|---|
| 11 เม.ย. 2569 | Phase 1 Complete | Smart Photo, Customer CRM, Inventory 3-Layer และ Job State Machine พร้อมใช้งานในระดับโครงสร้าง |
| 11 เม.ย. 2569 | Phase 2 Complete | Billing, Payment, Notification และ Dashboard ถูกเพิ่มเข้าระบบ |
| 11 เม.ย. 2569 | Diagram Complete | มี diagram อ้างอิงครบ 3 ชุดสำหรับสถาปัตยกรรมและ flow หลัก |
| 11 เม.ย. 2569 | GitHub Push Complete | โค้ดระบบถูกผลักขึ้น repository เพื่อใช้เป็น source of truth |

## Current System Positioning

ณ จุดอ้างอิงของ memory log นี้ ระบบ **COMPHONE SUPER APP V5.5** อยู่ในสภาพที่มีองค์ประกอบครบทั้งฝั่งปฏิบัติการและฝั่งปิดงานเชิงธุรกิจ กล่าวคือฝั่งปฏิบัติการมี state machine, smart photo, CRM และ inventory รองรับแล้ว ขณะที่ฝั่งปิดงานมี billing, payment, receipt, notification และ dashboard รองรับครบ ทำให้ระบบพร้อมสำหรับการ deploy ใช้งานจริงภายใต้ Apps Script project เดิมโดยอาศัยการตั้งค่า config และการทดสอบ integration เพิ่มเติม [2] [4]

## Open Notes for Future Continuation

แม้ milestone หลักของ V5.5 จะเสร็จแล้ว แต่ memory log นี้ควรถูกอัปเดตต่อเมื่อมีการเปลี่ยนแปลงเรื่อง schema ชีต, provider สำหรับ slip verification, route ใหม่ใน `Router.gs`, dashboard metrics เพิ่มเติม หรือการย้ายบางส่วนออกจาก Google Sheets ไปยังฐานข้อมูลประเภทอื่นในอนาคต ทั้งนี้เพื่อให้เอกสารยังคงเป็น memory layer ของทีมพัฒนาอย่างแท้จริง [2] [3] [4]

## References

[1]: file:///home/ubuntu/upload/INSTALL_PHASE1_SYSTEMS.md "INSTALL_PHASE1_SYSTEMS.md"
[2]: file:///home/ubuntu/upload/INSTALL_PHASE2_SYSTEMS.md "INSTALL_PHASE2_SYSTEMS.md"
[3]: file:///home/ubuntu/upload/Router.gs "Router.gs"
[4]: file:///home/ubuntu/upload/BillingManager.gs "BillingManager.gs"
[5]: file:///home/ubuntu/upload/system_architecture_overview.png "system_architecture_overview.png"
[6]: file:///home/ubuntu/upload/job_lifecycle_flow.png "job_lifecycle_flow.png"
[7]: file:///home/ubuntu/upload/smart_photo_handling_flow.png "smart_photo_handling_flow.png"
