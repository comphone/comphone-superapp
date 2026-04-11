# INSTALL_PHASE1_SYSTEMS.md

## ภาพรวม

เอกสารนี้อธิบายการติดตั้ง **COMPHONE SUPER APP V5.5 Phase 1 Systems** บนโครงสร้างเดิมของโปรเจกต์ `Shop_vnext/src/` โดยต่อยอดจาก **Job State Machine** ที่มีอยู่แล้ว และเพิ่ม 3 ระบบหลักดังนี้

| ระบบ | ไฟล์หลัก | หน้าที่ |
|---|---|---|
| Smart Photo Handling & Vision Agent Enhancement | `PhotoQueue.gs`, `VisionAnalysis.gs`, `GpsPipeline.gs`, `PhotoGallery.html` | วิเคราะห์รูป, แยกหมวด Before/After/Survey/Equipment, ตรวจ geofence, QC automation, collage, gallery |
| Customer Management & CRM | `CustomerManager.gs`, `JobStateMachine.gs`, `Router.gs` | CRUD ลูกค้า, auto-fill ตอนเปิดงาน, history, predictive maintenance |
| Inventory Enhancement (3-Layer) | `Inventory.gs`, `Router.gs` | โอนย้าย stock, stock รถช่าง, predictive stocking, weekly tool audit |

## ไฟล์ที่สร้าง/แก้

### ไฟล์ที่สร้างใหม่

| ไฟล์ | ตำแหน่ง |
|---|---|
| `CustomerManager.gs` | `Shop_vnext/src/CustomerManager.gs` |
| `PhotoGallery.html` | `Shop_vnext/src/PhotoGallery.html` |
| `INSTALL_PHASE1_SYSTEMS.md` | root repo |

### ไฟล์ที่แก้ไข

| ไฟล์ | จุดที่เพิ่ม |
|---|---|
| `PhotoQueue.gs` | auto-sorting, geofence integration, gallery API, before/after collage |
| `VisionAnalysis.gs` | AI label/category, QC trigger helpers |
| `GpsPipeline.gs` | EXIF GPS parsing + geofencing helper |
| `JobStateMachine.gs` | auto QC hook เมื่อสถานะเป็น `8`, customer auto-fill/sync |
| `Inventory.gs` | 3-layer inventory, van stock, predictive stocking, tool audit |
| `Router.gs` | routes สำหรับ photo, customer CRM และ inventory |

## Spreadsheet ที่ใช้

| รายการ | ค่า |
|---|---|
| Google Sheets ID | `19fkLbSbBdz0EjAV8nE9LLwBiHeIN50BTPptt_PJCRGA` |
| ฐานข้อมูลหลัก | Google Apps Script + Google Sheets |
| Utility เดิมที่ใช้ต่อ | `Utils.gs` |

## ชีตที่ต้องมี

ระบบจะพยายามสร้างบางชีตอัตโนมัติถ้ายังไม่มี แต่ควรตรวจสอบให้ครบก่อน deploy

| Sheet | ใช้งานโดย | สถานะ |
|---|---|---|
| `DBJOBS` | Job State Machine / CRM / QC / Predictive Stocking | ต้องมีอยู่แล้ว |
| `DB_CUSTOMERS` | CRM / Geofence lookup / Predictive Maintenance | ระบบช่วยสร้างได้ |
| `DB_CUSTOMER_LOGS` | CRM event logs | ระบบช่วยสร้างได้ |
| `PhotoQueue` หรือชีตคิวรูปตามของเดิม | Photo pipeline | ต้องมีตามระบบเดิม |
| `DB_INVENTORY` หรือชีต inventory เดิม | Inventory 3-layer | ต้องมีตามระบบเดิม |
| `DB_TOOL_AUDITS` | Weekly Tool Audit | ระบบช่วยสร้างได้ |

## คอลัมน์สำคัญที่ระบบใหม่ใช้

### DB_CUSTOMERS

| Column | ความหมาย |
|---|---|
| `Customer_ID` | รหัสลูกค้า |
| `Customer_Name` | ชื่อลูกค้า |
| `Phone` | เบอร์ติดต่อ |
| `Address` | ที่อยู่ |
| `Latitude` / `Longitude` | พิกัดลูกค้า ใช้กับ geofence |
| `LINE_User_ID` | ใช้ส่ง CRM/PM แจ้งเตือน |
| `Customer_Type` | ประเภทลูกค้า |
| `Tags` | tag ลูกค้า |
| `Last_Job_ID` | งานล่าสุด |
| `Last_Service_Date` | วันที่เข้าบริการล่าสุด |
| `Next_PM_Date` | วันนัด PM ถัดไป |
| `Total_Jobs` | จำนวนงานสะสม |
| `Total_Revenue` | รายได้รวม |
| `Notes` | หมายเหตุ |
| `Created_At` / `Updated_At` | timestamp |

### DB_TOOL_AUDITS

ระบบจะใช้โครงสร้างแบบ checklist log ต่อรายการตรวจ โดยเก็บ technician, week key, item, status, note, timestamp

## ขั้นตอนติดตั้ง

### 1) วางไฟล์เข้า Apps Script project

คัดลอกไฟล์ทั้งหมดจาก `Shop_vnext/src/` เข้าโปรเจกต์ Google Apps Script ของระบบจริง โดยต้องมีอย่างน้อยไฟล์ต่อไปนี้ครบ

| กลุ่ม | ไฟล์ |
|---|---|
| Photo/Vision | `PhotoQueue.gs`, `VisionAnalysis.gs`, `GpsPipeline.gs`, `PhotoGallery.html` |
| CRM | `CustomerManager.gs`, `JobStateMachine.gs`, `Router.gs` |
| Inventory | `Inventory.gs`, `Router.gs` |
| Core dependencies | `Utils.gs` และไฟล์เดิมทั้งหมดของระบบ |

### 2) ตรวจ Script Properties / Config เดิม

ระบบใหม่ออกแบบให้ reuse โครงสร้างเดิมก่อน จึงต้องตรวจว่าค่า config สำหรับ Spreadsheet, LINE, Drive และ Web App base URL ของระบบเดิมยังใช้งานได้

> ถ้าระบบเดิมใช้ helper สำหรับเปิด Spreadsheet ด้วย ID เดียวกัน ไม่ต้อง hardcode ซ้ำในไฟล์ใหม่

### 3) ตั้งสิทธิ์ Apps Script

ฟีเจอร์ใหม่ใช้บริการต่อไปนี้

| Service | ใช้ทำอะไร |
|---|---|
| Google Sheets | อ่าน/เขียน DBJOBS, DB_CUSTOMERS, inventory, audit |
| Google Drive | จัดเก็บรูปงานและ collage |
| Google Slides | สร้าง before/after collage |
| UrlFetchApp | เรียก Vision/QC/thumbnail APIs |
| LockService | กัน stock transfer ชนกัน |

เมื่อ deploy ครั้งแรก ให้ authorize scopes ให้ครบ

### 4) Deploy เป็น Web App

ตั้งค่า deploy แบบ Web App ตามรูปแบบเดิมของระบบ แล้วนำ URL ใหม่ไปใส่ใน config ของ LINE Bot / frontend ถ้ามี

ควรตั้งค่า:

| Setting | ค่าแนะนำ |
|---|---|
| Execute as | Me |
| Who has access | Anyone with link หรือผู้ใช้ในองค์กรตาม deployment เดิม |

## Route / Action ที่เพิ่ม

### Photo / Vision

| Action | ตัวอย่าง |
|---|---|
| `photoGalleryData` | `?action=photoGalleryData&jobId=JOB-0001` |
| `createBeforeAfterCollage` | `?action=createBeforeAfterCollage&jobId=JOB-0001` |
| `view=photogallery` | `?view=photogallery&jobId=JOB-0001` |

### Customer / CRM

| Action | ตัวอย่าง |
|---|---|
| `createCustomer` | `?action=createCustomer&customer_name=บริษัทA&phone=081xxxxxxx` |
| `updateCustomer` | `?action=updateCustomer&customer_id=CUST-0001&tags=VIP` |
| `getCustomer` | `?action=getCustomer&customer_id=CUST-0001` |
| `listCustomers` | `?action=listCustomers&search=บริษัท` |
| `getCustomerHistory` | `?action=getCustomerHistory&customer_name=บริษัทA` |
| `syncCustomerFromJob` | `?action=syncCustomerFromJob&jobId=JOB-0001` |
| `predictiveMaintenance` | `?action=predictiveMaintenance&days=30` |
| `runPredictiveMaintenance` | `?action=runPredictiveMaintenance&days=30` |

### Inventory

| Action | ตัวอย่าง |
|---|---|
| `inventoryOverview` | `?action=inventoryOverview` |
| `transferStock` | `?action=transferStock&from_location=WAREHOUSE&to_location=VAN_T001&item_id=SKU001&qty=2` |
| `getVanStock` | `?action=getVanStock&tech_id=T001` |
| `predictiveStocking` | `?action=predictiveStocking&days=3` |
| `createWeeklyToolAuditChecklist` | `?action=createWeeklyToolAuditChecklist&tech_id=T001` |
| `getWeeklyToolAuditChecklist` | `?action=getWeeklyToolAuditChecklist&tech_id=T001` |
| `submitToolAudit` | `?action=submitToolAudit&tech_id=T001&item_id=DRILL01&status=OK` |

## Flow สำคัญของระบบใหม่

### 1) Photo -> Vision -> QC

| เหตุการณ์ | ผลลัพธ์ |
|---|---|
| ช่างส่งรูป | เข้าคิวใน `PhotoQueue` |
| Vision วิเคราะห์รูป | สร้าง category อัตโนมัติ: `Before`, `After`, `Survey`, `Equipment` |
| ระบบอ่าน EXIF GPS | เทียบพิกัดลูกค้าใน `DB_CUSTOMERS` เพื่อเช็ก geofence |
| งานเปลี่ยนสถานะเป็น `8` | trigger QC automation อัตโนมัติ |
| มี Before + After ครบ | สามารถสร้าง collage ได้ |

### 2) CRM

| จุดเชื่อม | ผลลัพธ์ |
|---|---|
| ตอน create/open job | auto-fill ข้อมูลลูกค้าจาก `DB_CUSTOMERS` |
| หลังงานคืบหน้าหรือปิดงาน | sync ประวัติลูกค้าและอัปเดต PM date |
| รัน predictive maintenance | สร้างรายชื่อลูกค้าที่ควร follow-up |

### 3) Inventory 3-Layer

| Layer | ตัวอย่าง |
|---|---|
| Warehouse | คลังกลาง |
| Shop | หน้าร้าน/จุดเบิก |
| Van | รถช่างรายคน |

ระบบใหม่รองรับการโอนสินค้าระหว่าง location และวิเคราะห์ stock รถช่างจากงานล่วงหน้า 3 วัน

## แนวทางทดสอบหลังติดตั้ง

### Test 1: CRM

1. เรียก `createCustomer`
2. เปิดงานใหม่ด้วยข้อมูลลูกค้าคนเดิม
3. ตรวจว่า note / phone / address ถูก auto-fill
4. ปิดงานหรือเปลี่ยนสถานะสำคัญ
5. เรียก `getCustomerHistory` และ `syncCustomerFromJob`

### Test 2: Photo + Geofence + QC

1. อัปโหลดรูปที่มี EXIF GPS
2. ตรวจว่า AI label ถูกจัดหมวดอัตโนมัติ
3. ตรวจว่า geofence ได้ผล `IN_GEOFENCE` หรือ `OUT_OF_GEOFENCE`
4. เปลี่ยนสถานะงานเป็น `8`
5. ตรวจว่า QC automation ทำงาน
6. เปิด `?view=photogallery&jobId=...`

### Test 3: Inventory

1. เรียก `transferStock`
2. ตรวจ stock ต้นทาง/ปลายทาง
3. เรียก `getVanStock`
4. เรียก `predictiveStocking&days=3`
5. สร้าง checklist ด้วย `createWeeklyToolAuditChecklist`
6. ส่งผลตรวจด้วย `submitToolAudit`

## ข้อควรระวัง

| ประเด็น | รายละเอียด |
|---|---|
| Dynamic Header | ระบบใหม่พยายาม map header แบบยืดหยุ่น แต่ชื่อคอลัมน์หลักควรใกล้เคียงตามเอกสารนี้ |
| Geofence | ถ้ารูปไม่มี EXIF GPS จะตรวจ geofence ไม่ได้ |
| Collage | ต้อง authorize Google Slides/Drive ให้ครบ |
| Predictive Maintenance | ถ้าไม่มี `Last_Service_Date`/`Next_PM_Date` จะได้ผลน้อย |
| Predictive Stocking | คุณภาพผลลัพธ์ขึ้นกับข้อมูล job queue และ item mapping ในระบบเดิม |

## แนะนำหลังติดตั้ง

1. เพิ่ม menu หรือ admin dashboard สำหรับเรียก action ใหม่จาก UI เดิม
2. ตั้ง time-based trigger สำหรับ `runPredictiveMaintenance`
3. ตั้ง time-based trigger สำหรับ `createWeeklyToolAuditChecklist`
4. ทดสอบ stock transfer ด้วย sandbox data ก่อนใช้กับคลังจริง
5. ถ้าต้องการ production-ready มากขึ้น ให้เพิ่ม audit log ของ inventory movement แยกอีก 1 sheet

## สรุป

ระบบชุดนี้ถูกออกแบบให้ **ต่อกับโค้ดเดิมโดยไม่รื้อ architecture เดิม** และเน้นใช้ `Utils.gs` กับ dynamic header mapping ให้มากที่สุด เพื่อให้ deploy เข้าโปรเจกต์ปัจจุบันได้เร็วที่สุด
