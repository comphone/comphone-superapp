# COMPHONE SUPER APP V5.5 — Anti-Regression Guide

เอกสารฉบับนี้จัดทำขึ้นเพื่อป้องกันปัญหา **Regression** (การแก้ไขโค้ดใหม่แล้วทำให้ฟีเจอร์เดิมพัง) ซึ่งเป็นปัญหาที่พบบ่อยในการพัฒนาแอปพลิเคชันขนาดใหญ่ที่มีหลายโมดูลเชื่อมโยงกัน

## 1. ปัญหาที่พบบ่อยและวิธีป้องกัน

### 1.1. การเรียก API ล้มเหลว (API Call Failures)
**ปัญหา:** การเปลี่ยนชื่อฟังก์ชันใน Backend (GAS) หรือการเปลี่ยนพารามิเตอร์ ทำให้ Frontend เรียกใช้งานไม่ได้
**วิธีป้องกัน:**
- ใช้ `api_client.js` เป็นศูนย์กลางการเรียก API ทั้งหมด
- ห้ามใช้ `fetch()` โดยตรงในไฟล์อื่นๆ
- ตรวจสอบ `Router.gs` เสมอว่ามี `case` รองรับ action ที่เรียกหรือไม่
- ใช้ `normalizeApiResponse()` เพื่อจัดการรูปแบบข้อมูลที่ส่งกลับมาให้เป็นมาตรฐานเดียวกัน

### 1.2. ปัญหา Authentication หลุด (Session Loss)
**ปัญหา:** ผู้ใช้ต้องล็อกอินใหม่บ่อยครั้ง หรือ PC Dashboard ไม่แชร์ Session กับ PWA Mobile
**วิธีป้องกัน:**
- เก็บ Token ไว้ที่ `localStorage['comphone_auth_session']` เท่านั้น
- โครงสร้างข้อมูลต้องเป็น `{ token: "...", username: "...", role: "...", loginAt: 123456789 }`
- ห้ามใช้ key อื่นเช่น `comphone_token` หรือ `APP.token` เด็ดขาด
- ฟังก์ชัน `callApi()` ต้องดึง Token จาก `comphone_auth_session` อัตโนมัติ

### 1.3. Data Mismatch (โครงสร้างข้อมูลจาก API ไม่ตรงกับที่ UI คาดหวัง)
**ปัญหา:** GAS ส่งข้อมูลกลับมาเป็น `job_id` แต่ UI คาดหวัง `id` ทำให้ข้อมูลไม่แสดง
**วิธีป้องกัน:**
- ใช้ Data Normalization Helpers ใน `api_client.js` เสมอ:
  - `normalizeJobData(j)` สำหรับงานบริการ
  - `normalizeInventoryItem(item)` สำหรับคลังสินค้า
- ห้ามใช้ raw data จาก API ตรงๆ ในการ render UI

### 1.4. UI พังจากการแก้ไข DOM (DOM Manipulation Errors)
**ปัญหา:** การใช้ `innerHTML` กับ Element ที่ไม่มีอยู่จริง ทำให้เกิด JavaScript Error และหยุดการทำงานของสคริปต์ทั้งหมด
**วิธีป้องกัน:**
- ใช้ Helper Functions จาก `api_client.js` เช่น `safeRender(id, html)`, `safeShow(id)`, `safeHide(id)`
- ตรวจสอบว่า Element มีอยู่จริงก่อนแก้ไขเสมอ
- จัดการสถานะ UI ให้ครบถ้วน: Loading (`loadingState()`), Empty (`emptyState()`), Error (`errorState()`)

### 1.5. ปัญหา Cache ค้าง (Stale Cache)
**ปัญหา:** ผู้ใช้ไม่เห็นการอัปเดตใหม่เนื่องจาก Service Worker (SW) หรือ Browser Cache เก็บไฟล์เก่าไว้
**วิธีป้องกัน:**
- การเรียก API ต้องต่อท้ายด้วย `_t=Date.now()` เสมอ (Cache Busting)
- อัปเดต `APP_VERSION` และ `APP_BUILD` ในไฟล์หลัก (`app.js`, `dashboard_pc.html`) ทุกครั้งที่มีการแก้ไขสำคัญ

### 1.6. API Request Overload (ยิง API ซ้ำซ้อน)
**ปัญหา:** หน้า Dashboard ยิง API 5-6 เส้นพร้อมกัน ทำให้ GAS Rate Limit (60 req/min) ทำงาน
**วิธีป้องกัน:**
- ใช้ `batchCallApi(calls)` ใน `api_client.js` เพื่อรวม request (ถ้าเป็นไปได้) หรือยิงแบบขนานอย่างปลอดภัย
- ใช้ `CacheService` ใน GAS Backend เสมอสำหรับข้อมูลที่โหลดบ่อย (เช่น `getDashboardData`, `healthCheck`) เพื่อลดภาระการ Query Sheet
- ตรวจสอบว่าไม่มีการเรียก API ซ้ำซ้อนใน `window.addEventListener('load')`

### 1.7. UI ค้างเมื่อ API ล้มเหลว (Infinite Loading)
**ปัญหา:** เมื่อ API error หรือ timeout หน้าจอจะแสดง Spinner ค้างไว้ตลอดไป
**วิธีป้องกัน:**
- ทุกครั้งที่มีการเรียก API และแสดง Spinner ต้องใช้ `try...finally` block เสมอ
- ใน `finally` block ต้องลบ Spinner หรือเรียก `loadingState(false)` ทุกครั้ง ไม่ว่าจะสำเร็จหรือล้มเหลว

### 1.8. Version Mismatch (Frontend ใหม่ แต่ Backend เก่า)
**ปัญหา:** PWA อัปเดตแล้วเรียก API ใหม่ แต่ GAS ยังไม่ได้ Deploy ทำให้เกิด Error "Unknown Action"
**วิธีป้องกัน:**
- ใช้ `checkApiVersion()` ใน `api_client.js` เพื่อตรวจสอบ `CONFIG.VERSION` ของ GAS
- หาก Major/Minor version ไม่ตรงกัน ระบบจะแจ้งเตือนผู้ใช้ให้ Deploy GAS ใหม่

## 2. ขั้นตอนการตรวจสอบก่อน Commit (Pre-Commit Checklist)

ก่อนที่จะทำการ Commit โค้ดใดๆ นักพัฒนา (หรือ AI) ต้องตรวจสอบรายการต่อไปนี้:

1. **ตรวจสอบฟังก์ชันเดิม:** ฟังก์ชันหลัก (เช่น การโหลด Dashboard, การแสดงรายการงาน) ยังทำงานได้ปกติหรือไม่?
2. **ตรวจสอบ Global Variables:** มีการลบหรือแก้ไขตัวแปร Global (เช่น `APP`, `AUTH`) ที่ไฟล์อื่นเรียกใช้หรือไม่?
3. **ตรวจสอบ API Calls:** `callApi()` ยังส่ง `token` ไปด้วยอย่างถูกต้องหรือไม่?
4. **ตรวจสอบ UI States:** สถานะ Loading, Empty, และ Error ถูกจัดการอย่างเหมาะสมหรือไม่?
5. **ตรวจสอบ Backend Router:** หากมีการเพิ่มหรือแก้ไข API ใน GAS ได้อัปเดต `Router.gs` ให้รองรับแล้วหรือยัง?

## 3. กฎการทำงานร่วมกัน (Collaboration Rules)

- **RULE 0 (Triple Sync):** ทุกครั้งที่มีการแก้ไขโค้ด ต้องทำ 3 ขั้นตอนเสมอ:
  1. Commit และ Push ขึ้น GitHub
  2. รันสคริปต์ Sync ขึ้น Google Drive (`python3 scripts/sync_to_drive.py`)
  3. อัปเดตสถานะใน `session.md`
- **ห้ามจบงานโดยไม่ทำ RULE 0 เด็ดขาด** เพื่อให้มั่นใจว่าโค้ดทุกที่ตรงกันและพร้อมสำหรับการพัฒนาต่อในอนาคต

---
*อัปเดตล่าสุด: 19 เมษายน 2026*
