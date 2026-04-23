# COMPHONE Dashboard — System Architecture (v16.0.0)

เอกสารฉบับนี้อธิบายสถาปัตยกรรมของ COMPHONE Dashboard v16.0.0 ซึ่งเป็น **Self-Evolving AI System** ที่สามารถเรียนรู้ ป้องกันตัวเอง และแก้ไขปัญหาได้อัตโนมัติ

---

## 1. Core Flow (Single API Pipeline)

ระบบถูกออกแบบใหม่ทั้งหมดใน v7.0.0 และ v8.0.0 เพื่อกำจัด Wrapper ซ้อนและ Loop ทุกชนิด โดยบังคับให้ทุก User Action ต้องผ่าน `API_CONTROLLER` เท่านั้น

**Flow การทำงาน:**
`User Action → API_CONTROLLER.call() → _v800GuardedCallApi → _BASE_FETCH_FN → DATA_INTEGRITY.sanitize() → Render`

### ⚠️ Control Rules (Golden Rules)
- ❌ **ห้าม callApi ตรง:** ทุกการเรียก API ต้องผ่าน `API_CONTROLLER.call(action, params)`
- ❌ **ห้ามมี multiple timers:** อนุญาตให้มี Timer สำหรับ Sync (`_v800SyncTimer` 60s) และ Ping (`_pingTimer` 30s) เท่านั้น
- ❌ **ห้าม wrapper ซ้อน:** `window.callApi` ถูกยุบเหลือชั้นเดียว
- ❌ **ห้าม render เรียก API:** `loadSection` และ render functions ห้ามเรียก API เด็ดขาด (Render Isolation)
- ✅ **Single Pipeline Only:** 1 Action = 1 Request เสมอ (ควบคุมด้วย `__IN_FLIGHT` guard)

---

## 2. AI Governance & Trust System

ระบบ AI ใน v16.0.0 ไม่สามารถทำงานตามอำเภอใจได้ ต้องผ่านระบบตรวจสอบและประเมินความน่าเชื่อถือ (Trust Score)

### ⚠️ AI Rules
- **Trust Score Gate:** หาก `TRUST_SCORE.AI < 0.70` ระบบจะ **IGNORE** คำสั่ง AI ทันที (Hard Trust Gate)
- **Sandbox Mode:** AI ไม่สามารถ execute คำสั่งตรงได้ ต้องผ่าน `AI_SANDBOX.propose()` และรอการอนุมัติ (หรือ Auto-approve สำหรับ Low Risk)
- **Trusted Execution:** AI สามารถ execute ได้เฉพาะ Action ที่เคยผ่านการ Audit และมีประวัติความสำเร็จสูงเท่านั้น
- **Sanity Guard:** ห้าม AI ทำ 10 Forbidden Actions (เช่น `disableCore`, `killDashboard`, `corruptState`)
- **Rollback Memory:** หาก AI ตัดสินใจพลาดและทำให้ Health Score ลดลงอย่างหนัก (`impactScore < -30`) ระบบจะทำ **Full Rollback** (State + Cache + Queue + UI) อัตโนมัติ

---

## 3. Autonomous Incident Management

ระบบสามารถตรวจจับ วิเคราะห์ และแก้ไขปัญหาได้ด้วยตัวเอง

### Incident Flow
1. **Detect:** `ANOMALY_DETECTOR` และ `GLOBAL_METRICS_ENGINE` ตรวจพบความผิดปกติ (เช่น Latency > 3000ms, Error > 20%)
2. **Analyze:** `ROOT_CAUSE_ENGINE` วิเคราะห์สาเหตุจาก `PROD_REPLAY` และ Logs
3. **Memory Check:** `FAILURE_MEMORY` ตรวจสอบว่าเคยเจอ Pattern นี้หรือไม่ ถ้าเคย → **Instant Fix**
4. **Fix Generation:** หากเป็นปัญหาใหม่ `ADAPTIVE_FIX_GEN` จะสร้าง Fix Combination ใหม่
5. **Execute:** ส่ง Fix ให้ `AUTO_ORCHESTRATOR` ทำงาน
6. **Evaluate:** `OUTCOME_EVALUATOR` วัดผล Health Before/After
7. **Learn:** `FIX_LEARNING_ENGINE` บันทึกผลลัพธ์เพื่อใช้ในอนาคต

### Smart Kill Switch (Auto Freeze)
หากระบบมี Health Score < 60% หรือ Error Rate > 40% ติดต่อกัน 3 ครั้ง ระบบจะเรียก `SYSTEM.freeze()` อัตโนมัติ เพื่อหยุดทุก API, AI, และ Timers พร้อมแสดงหน้าจอ "SYSTEM LOCKED"

---

## 4. Self-Evolving Metrics

ระบบประเมินการพัฒนาของตัวเองทุกวันผ่าน `EVOLUTION_SCORE` (100 คะแนน):
- **Fix Effectiveness (25):** ความสำเร็จของการแก้ไขปัญหา
- **Incident Resolution (20):** อัตราการปิด Incident อัตโนมัติ
- **Health Stability (25):** ความเสถียรของ Health Score
- **Learning Progress (20):** จำนวน Policy และ Knowledge ที่เรียนรู้ใหม่
- **Anomaly Handling (10):** การจัดการกับ Unknown Patterns

**Trend:** `IMPROVING` | `STABLE` | `DECLINING`
