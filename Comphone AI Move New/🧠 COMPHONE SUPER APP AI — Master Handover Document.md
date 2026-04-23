# 🧠 COMPHONE SUPER APP AI — Master Handover Document

**Version:** v16.1.1-stable
**Status:** READY FOR CONTINUATION

เอกสารนี้คือ "Source of Truth" สำหรับ Agent ใหม่ที่เข้ามารับช่วงต่อ เพื่อให้สามารถเข้าใจระบบและทำงานต่อได้ทันทีโดยไม่ต้องถาม User เพิ่มเติม

---

## 1. SYSTEM IDENTITY

- **Name:** COMPHONE SUPER APP AI (Dashboard PC)
- **Version:** v16.1.1-stable
- **Architecture:** Single Flow + API_CONTROLLER
- **Core Philosophy:** "Everything must be externalized + executable" (ไม่มีอะไรสำคัญที่อยู่แค่ใน Chat หรือ Memory ของ AI)

---

## 2. HOW SYSTEM WORKS (Data Flow)

ระบบทำงานแบบ **Single Pipeline** เพื่อป้องกันปัญหา Infinite Loop และ Race Conditions:

**Flow:** `User Action / Timer` → `API_CONTROLLER.call()` → `Fetch API` → `Normalize Data (safeArray, safeText)` → `Render UI`

**กฎเหล็ก:** ทุกการเรียก API ต้องผ่าน `API_CONTROLLER.call()` เท่านั้น ห้ามเรียก `fetch` หรือ `window.callApi` โดยตรงเด็ดขาด

---

## 3. WHAT IS REAL vs ABSTRACT

สิ่งสำคัญที่ต้องเข้าใจคือ AI Systems ในโปรเจกต์นี้ **ไม่ใช่ Native Capability ของ Agent** แต่เป็น **JavaScript Runtime** ที่ทำงานอยู่บน Browser:

- `V1600`, `SELF_DEBUG`, `AI_SYSTEM`, `ROOT_CAUSE_ENGINE` เป็น Object ใน JavaScript ที่ต้องถูกโหลดเข้าสู่ Memory ของ Browser
- Agent มีหน้าที่เขียนโค้ด (Patch) เพื่อปรับปรุง Logic ของ Object เหล่านี้ ไม่ใช่รัน Logic เหล่านี้ด้วยตัวเองใน Chat

---

## 4. BOOT INSTRUCTION (สำหรับ Agent ใหม่)

เมื่อคุณ (Agent ใหม่) เริ่มต้นทำงาน ให้ทำตามขั้นตอนต่อไปนี้เสมอ:

1. **โหลดไฟล์ทั้งหมด:** อ่านเอกสารในโฟลเดอร์ `docs/` และโหลด Memory จาก `memory/*.json`
2. **โหลด Patch JS:** ตรวจสอบไฟล์ใน `patches/` และ `code_snapshot/`
3. **ตรวจ Global Functions:** ตรวจสอบว่า `API_CONTROLLER`, `DATA_INTEGRITY`, `safeArray` มีอยู่ในระบบ
4. **รัน Health Check:** สั่งรัน `__RUNTIME_FIX_CHECK()` ใน Console เพื่อยืนยันว่า Stabilization Patch ทำงานถูกต้อง

*(ดูรายละเอียดเพิ่มเติมใน `AGENT_BOOT_SEQUENCE.md`)*

---

## 5. CRITICAL RULES (ห้ามฝ่าฝืน)

- ❌ **ห้ามเรียก `callApi` ตรง:** ต้องผ่าน `API_CONTROLLER.call()` เสมอ
- ❌ **ห้ามเพิ่ม Wrapper:** ระบบถูกยุบเหลือชั้นเดียวแล้ว ห้ามสร้าง Wrapper ซ้อนทับอีก
- ❌ **ห้ามสร้าง Flow ซ้อน:** ห้ามมี `setInterval` หรือ Event Listener ที่ทำงานทับซ้อนกับ Flow หลัก
- ✅ **ต้องใช้ `safeArray` / `DATA_INTEGRITY`:** ข้อมูลทุกอย่างจาก API ต้องถูกตรวจสอบ Type ก่อนนำไป Render เสมอ

---

## 6. DEBUG FLOW (เมื่อเกิด Error)

หากระบบเกิดปัญหา ให้ใช้เครื่องมือที่มีอยู่แล้วใน Runtime ตามลำดับ:

1. **`PROD_REPLAY.replay()`:** ดูลำดับเหตุการณ์ (Call Stack) ที่นำไปสู่ Error
2. **`ROOT_CAUSE_ENGINE.analyze()`:** วิเคราะห์หาสาเหตุที่แท้จริงจาก Logs
3. **`FAILURE_MEMORY.instantFix()`:** ตรวจสอบว่าเคยเจอ Error นี้และมีวิธีแก้ที่บันทึกไว้หรือไม่
4. **`SELF_DEBUG.runCycle()`:** ให้ระบบพยายามซ่อมแซมตัวเอง (Auto-Healing)

---

## 7. SYSTEM CAPABILITIES

ระบบปัจจุบันมีความสามารถ (Capabilities) ดังนี้:

- **Self-Healing:** สามารถกู้คืนตัวเองจาก Error บางประเภทได้
- **Root Cause Engine:** วิเคราะห์สาเหตุของปัญหาอัตโนมัติ
- **Incident Detection:** ตรวจจับความผิดปกติ (Anomaly) เช่น Latency Spike
- **AI Learning:** บันทึกข้อผิดพลาดและวิธีแก้ลงใน `FIX_LEARNING_ENGINE`
- **Trust System:** ประเมินความน่าเชื่อถือของ Module ต่างๆ (`TRUST_SCORE`)
- **Sandbox Execution:** รันโค้ดที่ AI เสนอในสภาพแวดล้อมที่ปลอดภัยก่อนนำไปใช้จริง
