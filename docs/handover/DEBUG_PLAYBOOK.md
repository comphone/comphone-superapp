# COMPHONE Dashboard — Debug Playbook (v16.0.0)

คู่มือฉบับนี้รวบรวมแนวทางการแก้ไขปัญหา (Debug Strategy) สำหรับ COMPHONE Dashboard v16.0.0 ซึ่งเป็นระบบที่สามารถแก้ไขตัวเองได้ส่วนใหญ่ แต่ยังต้องการมนุษย์ในกรณี Anomaly หรือ CRITICAL Incident

---

## 1. Error Patterns & Root Causes

ระบบ `ROOT_CAUSE_ENGINE` สามารถตรวจจับ 8 สาเหตุหลักได้อัตโนมัติ:

| Pattern | อาการที่พบ | สาเหตุที่แท้จริง (Root Cause) |
|---|---|---|
| **Maximum call stack** | หน้าจอค้าง, Browser เตือน Out of Memory | เกิด Loop จาก Wrapper ซ้อนกัน หรือ Recursive Function |
| **alerts.slice is not a function** | UI Error, ข้อมูลไม่แสดง | Data Type Error (API ส่ง Object มาแทน Array) |
| **offline false positive** | API ตกไปอยู่ Offline Queue ทั้งที่เน็ตปกติ | `navigator.onLine` ทำงานผิดพลาดบน GAS iframe |
| **duplicate API call** | ข้อมูลซ้ำ, โหลดช้า | User กดปุ่มรัวๆ หรือ Race Condition จาก Timer หลายตัว |
| **stale cache** | ข้อมูลเก่าไม่ยอมอัปเดต | Cache ไม่ถูก Invalidate หลังจากการทำ Transaction |
| **circuit open** | API ถูก Block ชั่วคราว | Error Rate > 5 ครั้งติดกัน (Circuit Breaker ทำงาน) |
| **latency spike** | โหลดนานกว่า 3000ms | Backend ช้า หรือ Payload ใหญ่เกินไป |
| **AI trust degraded** | AI ไม่ยอมทำงาน | AI ตัดสินใจพลาดบ่อยจน Trust Score < 0.70 |

---

## 2. Fix Strategy Mapping

เมื่อพบปัญหา ระบบ `FIX_LEARNING_ENGINE` จะเลือก Fix ที่ดีที่สุดจากประวัติ แต่หากคุณต้อง Manual Debug ให้ใช้คำสั่งเหล่านี้ใน F12 Console:

### 🛠️ ปัญหา: API ค้าง / โหลดไม่เสร็จ (Stuck Lock)
- **Fix:** `API_CONTROLLER.unlock('actionName')` หรือ `API_CONTROLLER.clearAllLocks()`
- **เหตุผล:** `__IN_FLIGHT` guard อาจค้างหาก Promise ไม่ resolve (แม้จะมี Auto Lock Timeout 10s แล้วก็ตาม)

### 🛠️ ปัญหา: ข้อมูลเก่า / Stale Cache
- **Fix:** `localStorage.clear()` หรือ `APP_STATE.clearCache()`
- **เหตุผล:** บังคับให้ระบบดึงข้อมูลใหม่จาก Backend

### 🛠️ ปัญหา: API ถูก Block (Circuit Open)
- **Fix:** `API_CONTROLLER.resetCircuit('actionName')`
- **เหตุผล:** Circuit Breaker อาจเปิดค้างหาก Backend เคยล่ม ให้ Reset เพื่อลองใหม่

### 🛠️ ปัญหา: ระบบรวน / AI ทำงานผิดพลาด
- **Fix:** `SYSTEM.freeze('emergency')` ตามด้วย `FULL_ROLLBACK.rollback(snapshotId)`
- **เหตุผล:** หยุดระบบทันที และย้อนกลับไปยัง State/Cache/UI ก่อนที่ AI จะตัดสินใจพลาด

### 🛠️ ปัญหา: Anomaly Detected (Unknown Pattern)
- **Fix:** ตรวจสอบ `INCIDENT_MANAGER.getActive()` และ `ANOMALY_DETECTOR.getAnomalies(5)`
- **เหตุผล:** ระบบไม่กล้า Auto-fix สิ่งที่ไม่รู้จัก คุณต้องวิเคราะห์ Logs และสร้าง Fix ใหม่ด้วยตัวเอง

---

## 3. Debug Commands (F12 Console)

| คำสั่ง | หน้าที่ |
|---|---|
| `V1600.report()` | ดูสถานะรวมของระบบ (Health, Evolution, Trust, Incidents) |
| `REAL_HEALTH.report()` | ดูคะแนน Health Score จริง (0-100) พร้อม Violations |
| `PROD_REPLAY.replay()` | เล่นซ้ำ Session ล่าสุดเพื่อดูว่า User ทำอะไรก่อนพัง |
| `XAI_LOG.explain(0)` | อ่านคำอธิบายการตัดสินใจล่าสุดของ AI (WHY, ACTION, EXPECTED) |
| `ROOT_CAUSE_ENGINE.lastCause()` | ดูสาเหตุของปัญหาล่าสุดที่ระบบวิเคราะห์ได้ |
| `FAILURE_MEMORY.stats()` | ดู Pattern ที่ระบบจำได้ และ Fix ที่เคยใช้สำเร็จ |
| `SAFE_MODE.enable('manual')` | เปิด Safe Mode (ปิดฟีเจอร์หนักๆ) ชั่วคราว |
| `SYSTEM.unfreeze()` | ปลดล็อกระบบหลังจาก Auto Freeze ทำงาน |
