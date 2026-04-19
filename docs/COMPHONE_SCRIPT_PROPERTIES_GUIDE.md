# คู่มือการตั้งค่า Script Properties สำหรับ COMPHONE SUPER APP V5.5

เอกสารนี้รวบรวม **Script Properties** ทั้งหมดที่จำเป็นสำหรับการทำงานของระบบ COMPHONE SUPER APP V5.5 โดยแบ่งตามหมวดหมู่ความสำคัญและการใช้งาน เพื่อให้ผู้ดูแลระบบสามารถตั้งค่าได้อย่างถูกต้องและครบถ้วน

---

## 📌 1. หมวดหมู่: การตั้งค่าหลัก (Required)
*ต้องตั้งค่าก่อนการ Deploy ระบบ ไม่เช่นนั้นระบบจะไม่สามารถทำงานได้*

| Property Key | คำอธิบาย | ตัวอย่างค่า |
|---|---|---|
| **DB_SS_ID** | ID ของ Google Spreadsheet ที่ใช้เป็นฐานข้อมูลหลัก (Database) | `19fkLbSbBdz0EjAV8nE9LLwBiHeIN50BTPptt_PJCRGA` |
| **ROOT_FOLDER_ID** | ID ของ Google Drive Folder หลักที่ใช้เก็บไฟล์ทั้งหมดของระบบ | `1YRZRG9r1Y_jMHg2XFFKYjK4Hx-sW0Eq0` |
| **WEB_APP_URL** | URL ของ Google Apps Script Web App (ได้มาหลังจาก Deploy) | `https://script.google.com/macros/s/.../exec` |

---

## 🔒 2. หมวดหมู่: ความปลอดภัยและการเข้าถึง (Security & Auth)

| Property Key | คำอธิบาย | ตัวอย่างค่า |
|---|---|---|
| **DEFAULT_ADMIN_PASSWORD** | รหัสผ่านเริ่มต้นสำหรับผู้ใช้ใหม่ หรือเมื่อมีการรีเซ็ตรหัสผ่าน (หากไม่ตั้งค่า ระบบจะใช้ `Comphone@2025!`) | `MySecurePass123!` |
| **ALLOW_RESET** | อนุญาตให้รันฟังก์ชันรีเซ็ตระบบ (ลบข้อมูลทั้งหมด) ได้หรือไม่ ต้องตั้งเป็น `YES` เท่านั้นจึงจะรีเซ็ตได้ | `YES` หรือ `NO` |

### ⚠️ เกี่ยวกับค่า `SESSION_xxx` ที่ปรากฏใน Script Properties
หากคุณเข้าไปดูใน Script Properties แล้วพบค่าที่ขึ้นต้นด้วย `SESSION_` ตามด้วยตัวอักษรยาวๆ (เช่น `SESSION_1682bb24233efb48ecab938c063c`) **นี่คือพฤติกรรมปกติของระบบ**

* **มันคืออะไร?** ระบบ COMPHONE ใช้ Script Properties เป็นที่เก็บ Session Token ชั่วคราวเมื่อมีผู้ใช้ Login เข้าสู่ระบบ (แทนการใช้ Cookies เนื่องจากข้อจำกัดของ GAS)
* **ข้อมูลข้างในคืออะไร?** จะเก็บข้อมูลพื้นฐานของผู้ใช้ที่ Login เช่น `{"username":"admin","full_name":"ผู้ดูแลระบบ","role":"OWNER",...}`
* **ต้องทำอะไรกับมันไหม?** **ไม่ต้องทำอะไร** ระบบจะจัดการสร้างและลบ (เมื่อ Logout หรือหมดอายุ) โดยอัตโนมัติ การลบค่าเหล่านี้ด้วยตัวเองจะทำให้ผู้ใช้ที่กำลังใช้งานอยู่ถูกบังคับให้ Logout ทันที

---

## 💬 3. หมวดหมู่: การแจ้งเตือนผ่าน LINE (LINE Messaging API)
*ใช้สำหรับการส่งข้อความแจ้งเตือนไปยังกลุ่มต่างๆ และการทำงานของ LINE Bot*

| Property Key | คำอธิบาย | ตัวอย่างค่า |
|---|---|---|
| **LINE_CHANNEL_ACCESS_TOKEN** | Token สำหรับส่งข้อความผ่าน LINE Messaging API (ได้จาก LINE Developers) | `eyJhbGciOiJIUzI1NiJ9...` |
| **LINE_CHANNEL_SECRET** | Secret Key สำหรับตรวจสอบ Signature ของ Webhook จาก LINE | `a1b2c3d4e5f6...` |
| **LINE_GROUP_TECHNICIAN** | LINE Group ID สำหรับแจ้งเตือนทีมช่าง (เช่น เวลามีงานด่วน) | `C8ad22a115f38c9ad3cb5ea5c2ff4863b` |
| **LINE_GROUP_ACCOUNTING** | LINE Group ID สำหรับแจ้งเตือนทีมบัญชี (เช่น เวลามีการชำระเงิน) | `C7b939d1d367e6b854690e58b392e88cc` |
| **LINE_GROUP_PROCUREMENT** | LINE Group ID สำหรับแจ้งเตือนทีมจัดซื้อ (เช่น สต็อกเหลือน้อย) | `Cfd103d59e77acf00e2f2f801d391c566` |
| **LINE_GROUP_SALES** | LINE Group ID สำหรับแจ้งเตือนทีมขาย | `Cb7cc146227212f70e4f171ef3f2bce15` |
| **LINE_GROUP_EXECUTIVE** | LINE Group ID สำหรับแจ้งเตือนผู้บริหาร | `Cb85204740fa90e38de63c727554e551a` |

---

## 💳 4. หมวดหมู่: การชำระเงินและการตรวจสอบสลิป (Billing & AI)

| Property Key | คำอธิบาย | ตัวอย่างค่า |
|---|---|---|
| **PROMPTPAY_BILLER_ID** | หมายเลขพร้อมเพย์ (เบอร์โทรศัพท์ หรือ เลขบัตรประชาชน) ของร้าน สำหรับรับเงินและตรวจสอบสลิป | `0812345678` หรือ `1100000000000` |
| **GEMINI_API_KEY** | API Key สำหรับใช้งาน Google Gemini Vision ในการอ่านและตรวจสอบสลิปโอนเงิน (Fallback) | `AIzaSyB...` |
| **SLIP_VERIFY_API_URL** | (ทางเลือก) URL ของ API ภายนอกที่ใช้ตรวจสอบสลิปโอนเงิน (ถ้ามี) | `https://api.slipok.com/verify` |

---

## ⚙️ 5. หมวดหมู่: การตั้งค่าระบบทั่วไป (System Config)

| Property Key | คำอธิบาย | ตัวอย่างค่า |
|---|---|---|
| **TAX_MODE** | โหมดการคำนวณภาษี (`VAT7`, `ZERO`, `EXEMPT`, `MIXED`) | `VAT7` |
| **BRANCH_ID** | รหัสสาขาปัจจุบัน | `HQ` |
| **COMPANY_NAME** | ชื่อบริษัทสำหรับออกใบเสร็จ | `หจก.คอมโฟน แอนด์ อิเล็คโทรนิคส์` |
| **COMPANY_TAX_ID** | เลขประจำตัวผู้เสียภาษี | `1234567890123` |
| **RATE_LIMIT_PER_MIN** | จำนวน Request สูงสุดต่อนาที | `60` |
| **ALLOWED_ORIGINS** | CORS Origins ที่อนุญาต | `*` |

---

## 📂 6. หมวดหมู่: โฟลเดอร์ย่อยใน Google Drive (Auto-generated)
*ปกติระบบจะสร้างและตั้งค่าให้อัตโนมัติเมื่อรันฟังก์ชัน `setupAllFolders()` แต่สามารถตั้งค่าเองได้หากต้องการชี้ไปยังโฟลเดอร์ที่มีอยู่แล้ว*

| Property Key | คำอธิบาย |
|---|---|
| **FOLDER_JOBS_PHOTOS** | ID โฟลเดอร์สำหรับเก็บรูปภาพหน้างาน (Before/After) |
| **FOLDER_BILLING_RECEIPTS** | ID โฟลเดอร์สำหรับเก็บใบเสร็จและใบเสนอราคา (PDF) |
| **FOLDER_SLIPS** | ID โฟลเดอร์สำหรับเก็บสลิปโอนเงินที่รอตรวจสอบ |
| **FOLDER_AI_QUEUE** | ID โฟลเดอร์ชั่วคราวสำหรับให้ AI ประมวลผลรูปภาพ |
| **FOLDER_PO** | ID โฟลเดอร์สำหรับเก็บเอกสารใบสั่งซื้อ (Purchase Orders) |

---

## 🛠️ วิธีการตั้งค่า Script Properties

1. เปิดโปรเจกต์ Google Apps Script ของคุณ
2. ไปที่เมนู **Project Settings** (ไอคอนรูปเฟือง ⚙️ ด้านซ้ายมือ)
3. เลื่อนลงมาที่หัวข้อ **Script Properties**
4. คลิกปุ่ม **Edit script properties**
5. คลิก **Add script property**
6. ใส่ชื่อ Property ในช่อง **Property** (เช่น `DB_SS_ID`)
7. ใส่ค่าในช่อง **Value** (เช่น `19fkLbSbBdz0EjAV8nE9LLwBiHeIN50BTPptt_PJCRGA`)
8. ทำซ้ำจนครบทุกค่าที่ต้องการ
9. คลิกปุ่ม **Save script properties**

> **💡 เคล็ดลับ:** คุณสามารถรันฟังก์ชัน `setScriptPropertiesTemplate()` ในไฟล์ `DeployGuide.gs` เพื่อให้ระบบสร้าง Properties พื้นฐานให้โดยอัตโนมัติ จากนั้นคุณเพียงแค่เข้าไปแก้ไขค่าให้ถูกต้อง
