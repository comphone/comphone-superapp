# 🧠 COMPHONE Dashboard — Boot Agent Guide (v16.0.0)

**เอกสารนี้สำคัญที่สุดสำหรับ Agent ใหม่ที่เข้ามารับช่วงต่อ**
กรุณาอ่านและทำความเข้าใจก่อนเริ่มแก้ไขโค้ดใดๆ ในระบบ

---

## 🧠 SYSTEM IDENTITY

- **System:** COMPHONE Dashboard
- **Version:** v16.0.0
- **Type:** Self-Evolving AI System (ระบบที่เรียนรู้และแก้ไขตัวเองได้)
- **Core Philosophy:** "หนึ่งระบบ = หนึ่ง flow" และ "ระบบที่ดีที่สุดคือระบบที่เรียนรู้จากความพัง"

---

## ⚠️ GOLDEN RULES (ห้ามฝ่าฝืนเด็ดขาด)

1. **ห้ามแก้ UI ก่อน Core:** ปัญหา 99% อยู่ที่ Data Flow และ State Management ไม่ใช่ CSS/HTML
2. **ห้ามเพิ่ม Wrapper:** `window.callApi` ถูกยุบเหลือชั้นเดียวแล้ว ห้ามสร้าง Wrapper ซ้อนทับอีก (Spaghetti Pipeline)
3. **ห้ามมี callApi มากกว่า 1 Entry:** ทุกการเรียก API ต้องผ่าน `API_CONTROLLER.call()` เท่านั้น ห้ามเรียกตรง
4. **ต้องวิเคราะห์ทั้งระบบก่อนแก้:** ใช้ `V1600.report()` และ `PROD_REPLAY.replay()` เพื่อดูภาพรวมก่อนเสมอ ห้ามเดา

---

## 🧠 HOW TO START (เมื่อได้รับมอบหมายงาน)

1. **อ่าน SYSTEM_ARCHITECTURE.md:** ทำความเข้าใจ Single API Pipeline และ AI Governance
2. **โหลด Memory JSON:** ตรวจสอบ `DECISION_LOG.json`, `POLICY_ENGINE.json`, `FAILURE_MEMORY.json` เพื่อดูว่าระบบเคยเรียนรู้อะไรไปแล้วบ้าง
3. **ตรวจ TRUST_SCORE:** ดูว่า AI และ Module ต่างๆ มีความน่าเชื่อถือแค่ไหน (ถ้า < 0.70 ระบบจะไม่ให้ AI ทำงาน)
4. **Run `V1600.report()`:** ใน F12 Console เพื่อดูสถานะปัจจุบัน (Health, Incidents, Evolution Score)

---

## 🧠 DEBUG FLOW (เมื่อเกิดปัญหา)

ระบบถูกออกแบบให้ Debug ตัวเองได้ผ่าน 4 ขั้นตอน (Self Debug Loop):

1. **DETECT:** `ANOMALY_DETECTOR` หรือ `GLOBAL_METRICS_ENGINE` ตรวจพบปัญหา (เช่น Latency Spike)
2. **ANALYZE:** `ROOT_CAUSE_ENGINE` วิเคราะห์สาเหตุจาก Logs และ Replay
3. **ROOT CAUSE:** `FAILURE_MEMORY` ตรวจสอบว่าเคยเจอ Pattern นี้ไหม ถ้าเคย → ใช้ Fix เดิม
4. **FIX:** `ADAPTIVE_FIX_GEN` สร้าง Fix ใหม่ (ถ้าเป็นปัญหาใหม่) และ `AUTO_ORCHESTRATOR` นำไปใช้
5. **VALIDATE:** `OUTCOME_EVALUATOR` วัดผล Health Before/After และบันทึกลง `FIX_LEARNING_ENGINE`

**หน้าที่ของคุณ:** หากระบบแก้ตัวเองไม่ได้ (เช่น Anomaly) คุณต้องเข้ามาแทรกแซงในขั้นตอน **FIX** โดยสร้าง Fix Strategy ใหม่ที่ปลอดภัยและไม่ทำลาย Architecture เดิม

---

## 🛡️ AI SAFETY & GOVERNANCE

- **Sandbox Mode:** AI ไม่สามารถ Execute คำสั่งตรงได้ ต้องผ่าน `AI_SANDBOX.propose()`
- **Hard Trust Gate:** หาก AI Trust < 0.70 คำสั่งจะถูก Block ทันที
- **Full Rollback:** หาก AI ทำพลาด ระบบจะ Rollback State, Cache, Queue, และ UI กลับไปก่อนหน้าอัตโนมัติ
- **Sanity Guard:** ห้าม AI ทำ 10 Forbidden Actions (เช่น `disableCore`, `killDashboard`)

**จำไว้ว่า:** คุณคือ AI Agent ที่ต้องทำงานภายใต้กฎเหล่านี้เช่นกัน ห้ามพยายาม Bypass ระบบความปลอดภัยเด็ดขาด
