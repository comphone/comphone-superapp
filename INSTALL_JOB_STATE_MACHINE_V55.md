# คู่มือติดตั้งและใช้งาน Job State Machine (QR Code 12 สถานะ) สำหรับ COMPHONE SUPER APP V5.5

เอกสารนี้สรุปวิธีติดตั้งโมดูล **Job State Machine 12 สถานะ** ที่เพิ่มเข้าไปในโปรเจกต์ปัจจุบันของ **COMPHONE SUPER APP V5.5** โดยออกแบบให้ทำงานร่วมกับโค้ดเดิมใน `Router.gs`, `JobsHandler.gs`, `AutoBackup.gs`, `Utils.gs` และฐานข้อมูล `DBJOBS` / `DB_JOB_LOGS` ได้ทันทีโดยไม่ต้องรื้อโครงสร้างหลักของระบบเดิม

ระบบชุดนี้รองรับการสร้างใบงาน, การเปลี่ยนสถานะตามลำดับที่อนุญาต, การสร้าง QR Code ประจำใบงาน, การเปิดหน้า Web App สำหรับช่างจาก QR, และการบันทึก Timeline ทุกครั้งที่สถานะเปลี่ยนลงใน `DB_JOB_LOGS` แยกจากใบงานหลักอย่างชัดเจน

## ไฟล์ที่เพิ่มและไฟล์ที่แก้ไข

| ประเภท | ไฟล์ | หน้าที่ |
| --- | --- | --- |
| **เพิ่มใหม่** | `Shop_vnext/src/JobStateMachine.gs` | แกนหลักของระบบ 12 สถานะ, validation, timeline, QR, Web App payload |
| **เพิ่มใหม่** | `Shop_vnext/src/JobQRView.html` | หน้า Web App สำหรับช่างที่เปิดจาก QR บนมือถือ |
| **แก้ไข** | `Shop_vnext/src/Router.gs` | เพิ่ม route สำหรับ QR page, JSON payload, และ POST actions ใหม่ |
| **แก้ไข** | `Shop_vnext/src/JobsHandler.gs` | ให้ flow เดิม `openJob()` และ `updateJobStatus()` เชื่อมกับ state machine |
| **แก้ไข** | `Shop_vnext/src/AutoBackup.gs` | ให้ `getJobTimeline()` เดิมเรียกใช้ timeline ใหม่จาก `DB_JOB_LOGS` |

## โครงสร้างสถานะ 12 ขั้น

ระบบใช้รหัสสถานะตามที่กำหนดในงานนี้ โดยเก็บทั้ง **รหัสสถานะ** และ **ข้อความสถานะ** ลงใน `DBJOBS` เพื่อให้รายงานเดิมยังอ่านได้ และ workflow ใหม่ยังตรวจสอบ transition ได้ถูกต้อง

| Code | สถานะ | Allowed Next |
| --- | --- | --- |
| **1** | รอมอบหมาย | 2 |
| **2** | มอบหมายแล้ว | 3 |
| **3** | รับงานแล้ว | 4 |
| **4** | เดินทาง | 5 |
| **5** | ถึงหน้างาน | 6 |
| **6** | เริ่มงาน | 7, 8 |
| **7** | รอชิ้นส่วน | 6, 8 |
| **8** | งานเสร็จ | 9 |
| **9** | ลูกค้าตรวจรับ | 10 |
| **10** | รอเก็บเงิน | 11 |
| **11** | เก็บเงินแล้ว | 12 |
| **12** | ปิดงาน | - |

จุดสำคัญคือระบบจะไม่ยอมให้ข้ามขั้นที่ไม่อยู่ใน `Allowed Next` เช่น จาก `1` ไป `4` หรือจาก `8` ย้อนกลับไป `5` โดยตรง หากเรียก API ด้วยสถานะที่ไม่ถูกต้อง ระบบจะตอบกลับเป็น error พร้อมรายการสถานะถัดไปที่อนุญาต เพื่อให้ฝั่ง UI หรือ Bot ใช้แสดงผลต่อได้ทันที

## โครงสร้างชีตที่ต้องมี

ระบบนี้ออกแบบให้ยืดหยุ่นกับ header เดิมของ `DBJOBS` โดยจะค้นหาคอลัมน์จากชื่อ header ที่ใกล้เคียงกัน แต่เพื่อให้ใช้งานได้สมบูรณ์ แนะนำให้ตรวจสอบว่ามีคอลัมน์ต่อไปนี้อยู่จริง

| Sheet | คอลัมน์ที่ต้องมี | หมายเหตุ |
| --- | --- | --- |
| **DBJOBS** | `JobID` หรือ `Job_ID` | ใช้เป็นรหัสอ้างอิงหลักของใบงาน |
| **DBJOBS** | `สถานะ` หรือ `Status` | เก็บข้อความสถานะ เช่น `รอมอบหมาย` |
| **DBJOBS** | `Current_Status_Code` | คอลัมน์สำคัญสำหรับ state machine |
| **DBJOBS** | `ชื่อลูกค้า` / `Customer_Name` | ใช้แสดงบนหน้า QR Web App |
| **DBJOBS** | `อาการ` / `Symptom` | ใช้แสดงรายละเอียดงาน |
| **DBJOBS** | `ช่างที่รับงาน` / `Technician` | ใช้แสดงผู้รับผิดชอบ |
| **DBJOBS** | `หมายเหตุ` / `Note` | ระบบจะ append หมายเหตุการเปลี่ยนสถานะ |
| **DBJOBS** | `เวลาอัปเดต` / `Updated_At` | ระบบอัปเดตอัตโนมัติเมื่อสถานะเปลี่ยน |
| **DB_JOB_LOGS** | `Log_ID, Job_ID, Status_From, Status_To, Changed_By, Timestamp, Note` | ระบบจะสร้างให้อัตโนมัติถ้ายังไม่มีชีตนี้ |

ถ้า `DB_JOB_LOGS` ยังไม่มี ระบบจะสร้างชีตนี้ให้อัตโนมัติพร้อม header มาตรฐานในการรันครั้งแรกที่มีการสร้างงานหรือเปลี่ยนสถานะ

## ฟังก์ชันหลักที่พร้อมใช้งาน

โมดูลใหม่เพิ่มฟังก์ชันหลักตาม requirement ที่ขอ และออกแบบให้เรียกใช้งานได้ทั้งจาก `doPost()` เดิม, จาก Bot, และจากฟังก์ชันภายใน Apps Script เอง

| ฟังก์ชัน | หน้าที่ | หมายเหตุ |
| --- | --- | --- |
| `createJob(data)` | สร้างใบงานใหม่ | สร้าง `Job ID`, ตั้งสถานะเริ่มต้น, บันทึก log, คืนข้อมูล QR |
| `transitionJob(jobId, newStatus, options)` | เปลี่ยนสถานะพร้อม validation | บล็อก transition ที่ไม่อยู่ในกฎ |
| `getJobTimeline(jobId)` | ดึง Timeline ของงาน | redirect ไปใช้ `DB_JOB_LOGS` แบบใหม่ |
| `generateJobQR(jobId)` | สร้าง URL และ QR image URL | ใช้ URL ของ Web App ปัจจุบันหรือ `WEB_APP_URL` |
| `doGet(e)` | เปิดหน้า Web App และ JSON endpoint | route ใหม่ถูกเสริมเข้าใน Router เดิม |
| `getJobWebAppPayload(jobId)` | รวมข้อมูล job + timeline + qr | ใช้สำหรับหน้า `JobQRView.html` |
| `getJobStateConfig()` | คืนค่า state config ทั้ง 12 สถานะ | ใช้สำหรับ UI / Bot / external client |

## Route และ Action ที่เพิ่มในระบบ

ฝั่ง Router ถูกขยายโดยไม่ทับ route เดิม ทำให้ระบบเก่าที่ยังเรียก `openjob`, `updatestatus` หรือ dashboard route เดิมยังทำงานต่อได้

| ประเภท | รูปแบบ | หน้าที่ |
| --- | --- | --- |
| **GET** | `?view=jobqr&jobId=J0001` | เปิดหน้า Web App สำหรับช่างจาก QR |
| **GET** | `?action=jobqrdata&jobId=J0001` | คืน JSON สำหรับหน้า Job QR |
| **POST** | `{ "action": "createJob", ... }` | สร้างงานใหม่ผ่าน Router |
| **POST** | `{ "action": "transitionJob", "job_id": "J0001", "new_status": 4 }` | เปลี่ยนสถานะพร้อม validation |
| **POST** | `{ "action": "generateJobQR", "job_id": "J0001" }` | คืน URL และรูป QR ของงาน |
| **POST** | `{ "action": "getJobStateConfig" }` | คืนค่ากฎ state machine |
| **POST** | `{ "action": "getJobQRData", "job_id": "J0001" }` | คืนข้อมูล job สำหรับ Web App |

หน้า `JobQRView.html` ถูกออกแบบให้ใช้งานบนมือถือโดยตรง มีส่วนแสดงข้อมูลใบงาน, สถานะปัจจุบัน, QR, ช่องกรอกผู้เปลี่ยนสถานะ, ช่องหมายเหตุ, ปุ่มสถานะถัดไปเฉพาะที่อนุญาต, และ timeline ย้อนหลังของงานนั้น

## ขั้นตอนติดตั้งใน Google Apps Script Project

ให้นำไฟล์ที่แก้ไขและไฟล์ใหม่จาก repo ไปวางทับในโปรเจกต์ Apps Script ตัวจริง จากนั้นตรวจสอบว่าไฟล์ต่อไปนี้อยู่ครบในโปรเจกต์เดียวกัน ได้แก่ `Utils.gs`, `Router.gs`, `JobsHandler.gs`, `AutoBackup.gs`, `JobStateMachine.gs`, และ `JobQRView.html`

หลังจากนั้นให้เปิด **Project Settings** และเพิ่ม Script Property ชื่อ `WEB_APP_URL` ถ้าต้องการล็อก URL ของ Web App ไว้ตายตัวสำหรับการสร้าง QR โดยค่าที่ใส่ควรเป็น URL จาก deployment ล่าสุดของ Web App หากไม่ตั้งค่า ระบบจะพยายามใช้ URL runtime จาก service ปัจจุบันแทน

เมื่ออัปเดตโค้ดเสร็จแล้ว ให้ Deploy Web App ใหม่หรืออัปเดต deployment เดิม โดยคงรูปแบบการเข้าถึงแบบ public ตามที่โปรเจกต์เดิมใช้อยู่ เพื่อให้ช่างสามารถสแกน QR แล้วเปิดหน้าสถานะได้โดยตรงจากมือถือ

## ตัวอย่างการเรียกใช้งาน

### 1) สร้างใบงานใหม่

```json
{
  "action": "createJob",
  "customer_name": "บริษัท ABC",
  "symptom": "ติดตั้งกล้อง 4 จุด",
  "technician": "ช่างเอก",
  "changed_by": "ADMIN",
  "note": "เปิดงานจากแอดมิน"
}
```

### 2) เปลี่ยนสถานะไปขั้นถัดไป

```json
{
  "action": "transitionJob",
  "job_id": "J0001",
  "new_status": 4,
  "changed_by": "ช่างเอก",
  "note": "ออกเดินทางแล้ว"
}
```

### 3) ขอ QR ของงาน

```json
{
  "action": "generateJobQR",
  "job_id": "J0001"
}
```

### 4) เปิดหน้า Web App โดยตรง

```text
https://script.google.com/macros/s/DEPLOYMENT_ID/exec?view=jobqr&jobId=J0001
```

## สิ่งที่ระบบทำอัตโนมัติ

เมื่อเรียก `createJob()` ระบบจะกำหนดสถานะเริ่มต้น, สร้างแถวใน `DBJOBS`, บันทึก timeline แรกลง `DB_JOB_LOGS`, และคืนข้อมูล QR พร้อมใช้งานกลับไปทันที ส่วนเมื่อเรียก `transitionJob()` ระบบจะตรวจสอบสถานะปัจจุบัน, ตรวจ allowed transition, อัปเดตสถานะใหม่ใน `DBJOBS`, append หมายเหตุพร้อม timestamp, และสร้างประวัติใน `DB_JOB_LOGS` ทุกครั้ง

เพื่อให้ระบบเก่าทำงานร่วมกันได้ `openJob()` ใน `JobsHandler.gs` ถูกปรับให้เรียก `createJob()` และ `updateJobStatus()` จะพยายามแปลง status ที่รับเข้ามาเป็น state code ใหม่ก่อนเสมอ หากแปลงได้ก็จะวิ่งผ่าน state machine ทันที แต่หากเป็นการใช้งานเก่าแบบข้อความทั่วไปที่จับคู่ไม่ได้ ระบบยังคง fallback ไปใช้ logic เดิมเพื่อไม่ให้ของเก่าพัง

## การทดสอบหลังติดตั้ง

หลัง deploy ให้ทดสอบอย่างน้อย 5 กรณีต่อไปนี้เพื่อยืนยันว่าระบบพร้อมใช้งานจริง

| ลำดับ | กรณีทดสอบ | ผลลัพธ์ที่คาดหวัง |
| --- | --- | --- |
| **1** | สร้างงานใหม่ด้วย `createJob` | มีแถวใหม่ใน `DBJOBS`, สถานะเริ่มต้นถูกต้อง, มี log ใน `DB_JOB_LOGS` |
| **2** | เปลี่ยนจาก 1 → 2 | สำเร็จและมี timeline เพิ่ม 1 รายการ |
| **3** | ลองเปลี่ยนจาก 1 → 4 โดยตรง | ระบบต้อง reject และคืน allowed_next |
| **4** | เปิด URL `?view=jobqr&jobId=...` บนมือถือ | เห็นข้อมูลใบงาน ปุ่มสถานะ และ timeline |
| **5** | สแกน QR หลัง deploy ใหม่ | เปิดหน้าเดียวกับข้อ 4 ได้ทันที |

## หมายเหตุสำคัญเชิงใช้งานจริง

ถ้ามีการเปลี่ยน deployment URL ของ Web App ในอนาคต ควรอัปเดต `WEB_APP_URL` ทันทีเพื่อให้ QR ใหม่ชี้ถูกปลายทางเสมอ มิฉะนั้น QR ที่สร้างภายหลังอาจชี้ไป URL runtime เก่าหรือ URL ที่ไม่ตรง deployment ที่ใช้งานจริง

ถ้าใน `DBJOBS` ยังไม่มีคอลัมน์ `Current_Status_Code` แม้ requirement ระบุว่ามีแล้ว ระบบจะยังอ่านสถานะข้อความเดิมได้บางส่วนจาก alias mapping แต่เพื่อความถูกต้องของรายงานและ state validation ควรเพิ่มคอลัมน์นี้ในชีตจริงก่อนใช้งาน production

เอกสารนี้ตั้งใจให้ใช้เป็นคู่มือ deploy แบบเร็วสำหรับทีมงาน หากต้องการต่อยอดให้เชื่อมกับ LINE LIFF, location check-in, geofencing, หรือ notification ข้ามห้องในขั้นถัดไป สามารถต่อจาก `transitionJob()` ได้ทันทีโดยใช้ event เดียวกันเป็น trigger กลางของ workflow
