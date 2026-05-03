# CLASP_PUSH_GUIDE.md

เอกสารนี้อธิบายวิธีนำโค้ดในโฟลเดอร์ `clasp-ready` ไป push เข้า **Google Apps Script Project** ของระบบ COMPHONE SUPER APP V5.5 ได้ทันที โดยอ้างอิง Script ID ที่กำหนดไว้แล้วในไฟล์ `.clasp.json` และค่าคอนฟิกสำหรับ Web App ตามที่เตรียมไว้ใน `appsscript.json` [1] [2]

| รายการ | ค่า |
|---|---|
| GitHub Repo | `comphone/comphone-superapp` |
| โฟลเดอร์ที่ใช้ | `clasp-ready/` |
| Script ID | `1-aoCd5gXoo1dX4FjW62l8JknR3ZPiaf1W7YEmEdtq8gnRzSp4Hwj6043` |
| Runtime | `V8` |
| Time Zone | `Asia/Bangkok` |

## 1) ติดตั้ง clasp

ให้ติดตั้งคำสั่ง `clasp` บนเครื่องก่อนด้วยคำสั่งด้านล่าง

```bash
npm install -g @google/clasp
```

เมื่อติดตั้งเสร็จ ให้ตรวจสอบว่าใช้งานได้จริงด้วยคำสั่ง `clasp --version` เพื่อยืนยันว่าเครื่องพร้อมสำหรับการ push โค้ดขึ้น Apps Script

## 2) Login Google Account

ให้ล็อกอินด้วยบัญชี Google ที่มีสิทธิ์เข้าถึง Apps Script Project เป้าหมาย

```bash
clasp login
```

ถ้าเครื่องเปิด browser ไม่ได้ ให้ใช้วิธี login แบบไม่ใช้ localhost ตามคู่มือของ clasp แต่ในกรณีทั่วไปคำสั่งด้านบนเพียงพอสำหรับการเริ่มใช้งาน

## 3) Clone หรือ Download โฟลเดอร์ `clasp-ready` จาก GitHub

ให้ดึง repository มาก่อน แล้วเข้าไปใช้งานโฟลเดอร์ `clasp-ready` ที่ถูกเตรียมไว้แล้ว

```bash
git clone https://github.com/comphone/comphone-superapp.git
cd comphone-superapp/clasp-ready
```

ถ้าไม่ได้ใช้ `git clone` สามารถดาวน์โหลด ZIP จาก GitHub แล้วแตกไฟล์ จากนั้นเข้าโฟลเดอร์ `clasp-ready` ได้เช่นกัน

## 4) ตรวจไฟล์ที่ต้องมีในโฟลเดอร์

ก่อน push ให้ตรวจว่ามีไฟล์สำคัญครบ โดยเฉพาะ `.clasp.json`, `appsscript.json`, ไฟล์ `.gs` และไฟล์ `.html` ทั้งหมดของระบบ

| กลุ่มไฟล์ | รายการสำคัญ |
|---|---|
| CLASP Config | `.clasp.json`, `appsscript.json` |
| Core | `Utils.gs`, `Config.gs`, `AutoBackup.gs`, `Router.gs`, `JobsHandler.gs`, `JobStateMachine.gs` |
| Phase 1 | `PhotoQueue.gs`, `VisionAnalysis.gs`, `GpsPipeline.gs`, `CustomerManager.gs`, `Inventory.gs`, `PhotoGallery.html` |
| Phase 2 | `BillingManager.gs`, `Notify.gs`, `Dashboard.gs` |
| UI / Legacy | `Index.html`, `JS_Dashboard.html`, `JS_Part1.html`, `JS_Part2.html`, `JobQRView.html`, `LineBot.gs`, `SmartAssignment.gs` |

## 5) Push โค้ดเข้า Google Apps Script

เมื่ออยู่ในโฟลเดอร์ `clasp-ready` แล้ว ให้ push โค้ดขึ้น Apps Script ได้ทันที

```bash
clasp push
```

ถ้าระบบถามให้ยืนยันการ overwrite ให้ตรวจอีกครั้งว่าอยู่ในโปรเจกต์ถูกตัว แล้วค่อยยืนยัน เพราะคำสั่งนี้จะส่งไฟล์ในโฟลเดอร์ปัจจุบันขึ้นไปแทนชุดไฟล์ใน Apps Script project เป้าหมาย

## 6) เปิด GAS Editor เพื่อตรวจสอบ

หลัง push เสร็จ ให้เปิดหน้า Apps Script Editor เพื่อตรวจไฟล์และตรวจ syntax อีกรอบ

```bash
clasp open
```

ให้เช็กว่าไฟล์ `.gs` และ `.html` ขึ้นครบ รวมถึง `appsscript.json` ถูกตั้งค่าเป็น `V8`, `Asia/Bangkok` และ Web App config ตามที่เตรียมไว้ [2]

## 7) Deploy Web App แบบละเอียด

หลังตรวจไฟล์เรียบร้อย ให้ deploy Web App ใหม่จากหน้า Apps Script Editor ตามขั้นตอนนี้

| ขั้นตอน | รายละเอียด |
|---|---|
| 1 | เปิดโปรเจกต์ใน Apps Script Editor |
| 2 | กด **Deploy** |
| 3 | เลือก **New deployment** |
| 4 | เลือกประเภท **Web app** |
| 5 | ตั้งคำอธิบายเวอร์ชัน เช่น `COMPHONE V5.5 clasp deploy 2026-04-11` |
| 6 | ตั้งค่า **Execute as** เป็นบัญชีที่ deploy |
| 7 | ตั้งค่า **Who has access** ให้ตรงกับนโยบายใช้งานจริง |
| 8 | กด **Deploy** และอนุญาตสิทธิ์ที่ระบบร้องขอ |
| 9 | คัดลอก URL ของ Web App ใหม่ไปอัปเดตใน Bot / Frontend / Automation ที่เรียกใช้งาน |

สำหรับไฟล์ `appsscript.json` ที่เตรียมไว้ ค่า Web App ถูกกำหนดเป็น `USER_DEPLOYING` และ `ANYONE_ANONYMOUS` แล้ว แต่ตอน deploy จริงควรตรวจซ้ำให้ตรงกับการใช้งาน production ของร้านอีกครั้ง [2]

## 8) ตั้ง Script Properties ที่จำเป็น

ก่อนใช้งาน production ให้เปิด **Project Settings > Script Properties** แล้วตั้งค่าที่ระบบต้องใช้จริง โดยรายการด้านล่างมาจากเอกสารติดตั้งของ Phase 1 และ Phase 2 [3] [4]

| Script Property | สถานะ | ใช้งานสำหรับ |
|---|---|---|
| `PROMPTPAY_BILLER_ID` | แนะนำ | สร้าง PromptPay QR อัตโนมัติ |
| `PROMPTPAY_ID` | สำรอง | ใช้แทน `PROMPTPAY_BILLER_ID` ถ้าระบบเดิมใช้ชื่อนี้ |
| `SLIP_VERIFY_API_URL` | ตามระบบจริง | Endpoint ตรวจสลิป |
| `SLIP_VERIFY_API_KEY` | ตามระบบจริง | API Key สำหรับตรวจสลิป |
| `BILLING_RECEIPT_FOLDER_ID` | แนะนำ | โฟลเดอร์เก็บใบเสร็จ PDF บน Drive |
| `LINE_CHANNEL_ACCESS_TOKEN` | ถ้าใช้ LINE | ส่งข้อความผ่าน LINE Messaging API |
| `TELEGRAM_BOT_TOKEN` | ถ้าใช้ Telegram | ส่งข้อความผ่าน Telegram |
| `TELEGRAM_CHAT_CUSTOMER` | ไม่บังคับ | ห้องลูกค้า |
| `TELEGRAM_CHAT_TECHNICIAN` | ไม่บังคับ | ห้องช่าง |
| `TELEGRAM_CHAT_ADMIN` | ไม่บังคับ | ห้องแอดมิน |

นอกจากนี้ต้องตรวจค่า config เดิมของระบบให้ครบ เช่น Spreadsheet ID, การเชื่อม Google Drive, ค่า Web App base URL และค่าที่ helper ใน `Utils.gs` หรือ `Config.gs` ใช้อ้างอิงอยู่เดิม เพื่อไม่ให้ระบบใหม่ชนกับของเดิมหลัง deploy [3] [4]

## 9) เช็กลิสต์หลัง push

หลังจาก push และ deploy แล้ว ควรทดสอบเส้นทางหลักของระบบทันทีเพื่อยืนยันว่า production พร้อมใช้งาน

| จุดทดสอบ | สิ่งที่ควรตรวจ |
|---|---|
| Routing | route ใน `Router.gs` เรียกได้ปกติ |
| Job Flow | เปลี่ยนสถานะงานได้ และ hook ของ state machine ทำงาน |
| Photo Flow | เปิด `PhotoGallery.html` ได้ และ route ของรูปทำงาน |
| Inventory | inventory overview / transfer stock ทำงาน |
| Billing | สร้าง billing, QR และ receipt flow ได้ |
| Notification | LINE / Telegram ส่งข้อความได้ |
| Dashboard | summary, report และ alerts ตอบกลับถูกต้อง |

## 10) คำสั่งที่ใช้บ่อย

```bash
clasp status
clasp push
clasp pull
clasp open
clasp deployments
clasp deploy
```

ถ้าต้องการสำรองโค้ดจากโปรเจกต์จริงกลับลงเครื่องก่อนแก้ไข สามารถใช้ `clasp pull` ได้ แต่สำหรับชุดนี้ โฟลเดอร์ `clasp-ready` ถูกจัดให้พร้อมสำหรับ `clasp push` โดยตรงอยู่แล้ว [1]

## References

[1]: https://github.com/comphone/comphone-superapp "comphone/comphone-superapp"
[2]: https://script.google.com/home/projects/1-aoCd5gXoo1dX4FjW62l8JknR3ZPiaf1W7YEmEdtq8gnRzSp4Hwj6043/edit "Google Apps Script Project"
[3]: file:///home/ubuntu/upload/INSTALL_PHASE1_SYSTEMS.md "INSTALL_PHASE1_SYSTEMS.md"
[4]: file:///home/ubuntu/upload/INSTALL_PHASE2_SYSTEMS.md "INSTALL_PHASE2_SYSTEMS.md"
