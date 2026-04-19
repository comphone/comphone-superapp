# COMPHONE SUPER APP V5.5 — Code Standard & Anti-Regression

เอกสารนี้กำหนดมาตรฐานการเขียนโค้ดและกฎเกณฑ์ที่ **AI ทุกตัวต้องปฏิบัติตามอย่างเคร่งครัด** เพื่อป้องกันปัญหา Regression (โค้ดพังเมื่อมีการแก้ไข) และรักษาความเสถียรของระบบ

## 1. กฎเหล็ก (The Golden Rules)

1. **RULE 0: Triple Sync**
   - ทุกครั้งที่มีการแก้ไขโค้ด จะต้อง Sync 3 ที่เสมอ:
     1. **GitHub**: `git commit` และ `git push`
     2. **Google Drive**: รัน `python3 scripts/sync_to_drive.py`
     3. **session.md**: อัปเดตสถานะและ Pending Tasks
   - ห้ามจบงานโดยไม่ทำ RULE 0 เด็ดขาด

2. **RULE 1: Single Source of Truth สำหรับ API**
   - **PWA Mobile & PC Dashboard**: ต้องใช้ `callApi()` (ตัวพิมพ์เล็ก i) จาก `api_client.js` เท่านั้น
   - ห้ามใช้ `callAPI()` (ตัวพิมพ์ใหญ่ I), `callGas()`, หรือ `fetch()` ตรงๆ เด็ดขาด
   - `callApi()` จัดการเรื่อง Timeout (30s), Cache Busting (`_t=Date.now()`), Token Auth, และ **API Logging** (จับเวลาและ error) ให้อัตโนมัติ
   - ใช้ `batchCallApi(calls)` เมื่อต้องการเรียก API หลายเส้นพร้อมกันเพื่อลด Overhead
   - ใช้ Data Normalization Helpers (`normalizeJobData`, `normalizeInventoryItem`) ก่อนนำข้อมูลไป render เสมอ

3. **RULE 2: Authentication & Session**
   - เก็บ Token ไว้ที่ `localStorage['comphone_auth_session']` เท่านั้น
   - โครงสร้าง: `{ token: "...", username: "...", role: "...", loginAt: 123456789 }`
   - ห้ามใช้ key อื่นเช่น `comphone_token` หรือ `APP.token` เด็ดขาด เพื่อให้ PC และ Mobile แชร์ Session กันได้

4. **RULE 3: Safe DOM Manipulation & Loading State**
   - ห้ามใช้ `document.getElementById('...').innerHTML = ...` โดยไม่เช็คว่า element มีอยู่จริง
   - ใช้ Helper Functions จาก `api_client.js`: `safeRender(id, html)`, `safeShow(id)`, `safeHide(id)`
   - การแสดงสถานะ: ใช้ `loadingState()`, `emptyState()`, `errorState()`
   - **สำคัญมาก:** ทุกครั้งที่แสดง Spinner หรือ Loading State ต้องใช้ `try...finally` block เสมอ เพื่อให้แน่ใจว่า Spinner จะถูกซ่อนเมื่อ API ทำงานเสร็จ (ไม่ว่าจะสำเร็จหรือล้มเหลว)

5. **Version Sync & CacheService**
   - ใช้ `checkApiVersion()` เพื่อตรวจสอบว่า Frontend และ Backend (GAS) เป็นเวอร์ชันเดียวกัน
   - Backend จะส่ง `meta.version` กลับมาในทุก Response ผ่าน `jsonOutputV55_()` เพื่อให้ Frontend ตรวจสอบ Mismatch ได้ทันที
   - ใน GAS Backend ต้องใช้ `CacheService` สำหรับข้อมูลที่ถูกเรียกบ่อย (เช่น `getDashboardData`, `healthCheck`) เพื่อลดภาระการ Query Sheet และป้องกัน Rate Limit
## 2. โครงสร้าง Backend (Google Apps Script)

1. **Router.gs**
   - เป็น Entry Point เดียว (`doGet`, `doPost`)
   - การเพิ่ม API ใหม่ ต้องเพิ่มใน `switch (action)` และ `normalizeActionV55_`
   - ต้องคืนค่าผ่าน `jsonOutputV55_()` เสมอ

2. **Error Handling**
   - ทุกฟังก์ชันต้องมี `try...catch`
   - เมื่อเกิด Error ต้องคืนค่า `{ success: false, error: e.toString() }` ห้าม throw error ออกไปตรงๆ

3. **Lock Service**
   - ฟังก์ชันที่มีการเขียนข้อมูล (Create, Update, Delete) ต้องใช้ `LockService.getScriptLock()`
   - `lock.waitLock(10000)` (รอ 10 วินาที)

## 3. โครงสร้าง Frontend (PWA & PC Dashboard)

1. **Cache Busting**
   - การเรียก API ต้องต่อท้ายด้วย `_t=Date.now()` เสมอ เพื่อป้องกัน Service Worker (SW) คืนค่าเก่า

2. **Error Boundary**
   - ใช้ `error_boundary.js` ครอบการทำงานหลัก
   - หากเกิด JS Error ร้ายแรง ระบบจะแสดงหน้า Fallback แทนหน้าขาว

3. **Responsive Design**
   - PC Dashboard: ใช้ Sidebar + Main Content
   - PWA Mobile: ใช้ Bottom Navigation + Stacked Pages

## 4. Anti-Regression Checklist (ก่อน Commit)

ก่อนที่จะ Commit โค้ดใดๆ AI ต้องตรวจสอบสิ่งเหล่านี้:

- [ ] ฟังก์ชันเดิมยังทำงานได้หรือไม่? (เช่น แก้ Dashboard แล้ว Jobs ยังโหลดได้ไหม)
- [ ] มีการลบตัวแปร Global ที่ไฟล์อื่นใช้อยู่หรือไม่? (เช่น `APP`, `AUTH`)
- [ ] `callApi()` ยังส่ง `token` ไปด้วยหรือไม่?
- [ ] UI State (Loading, Empty, Error) ถูกจัดการครบถ้วนหรือไม่?
- [ ] ถ้าแก้ GAS ได้อัปเดต `Router.gs` ให้รองรับ action ใหม่หรือยัง?

---
*อัปเดตล่าสุด: 19 เมษายน 2026*
