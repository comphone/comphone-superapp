# 🚀 COMPHONE SUPER APP AI — Agent Boot Sequence

**Version:** v16.1.1-stable
**Status:** READY FOR CONTINUATION

เอกสารนี้คือลำดับขั้นตอน (Boot Sequence) ที่ Agent ใหม่ต้องทำตามอย่างเคร่งครัดเมื่อเริ่มต้นทำงานกับระบบนี้ เพื่อให้มั่นใจว่าเข้าใจสถานะปัจจุบันและสามารถทำงานต่อได้ทันที

---

## 1. อ่าน `BOOT_AGENT.md`

- ทำความเข้าใจ Golden Rules ทั้งหมด
- ตรวจสอบคำสั่ง Quick Health Check ที่มีให้ใช้ใน Console

## 2. อ่าน `AGENT_HANDOVER.md`

- ทำความเข้าใจ System Identity และ Data Flow (Single Pipeline)
- รับทราบว่า AI Systems ในโปรเจกต์นี้คือ JavaScript Runtime ไม่ใช่ Native Capability ของ Agent

## 3. โหลด `patches/*.js`

- ตรวจสอบไฟล์ Patch ล่าสุด (เช่น `runtime_guard_v161_fix.js`) เพื่อดูว่ามีการแก้ไขอะไรไปแล้วบ้าง
- ห้ามแก้ไขไฟล์ Patch เดิม เว้นแต่จำเป็นจริงๆ และต้อง Validate ทุกครั้ง

## 4. ตรวจ Runtime

ตรวจสอบว่า Global Functions และ Objects ต่อไปนี้มีอยู่ในระบบ:

- `API_CONTROLLER` (ต้องมี `call` method)
- `DATA_INTEGRITY` (ต้องมี `record` method)
- `safeArray` (ต้องเป็น Function)
- `safeText` (ต้องเป็น Function)

## 5. รัน `__RUNTIME_FIX_CHECK()`

สั่งรันคำสั่งนี้ใน Console เพื่อยืนยันว่า Stabilization Patch ทำงานถูกต้อง:

```javascript
__RUNTIME_FIX_CHECK()
// ต้องได้ผลลัพธ์: { dataIntegrityOK: true, apiPatched: true, safeArrayReady: true }
```

## 6. รัน `V1600.report()`

สั่งรันคำสั่งนี้ใน Console เพื่อดูสถานะปัจจุบันของระบบ:

- Health Score
- Active Incidents
- Evolution Score
- Trust Scores

## 7. เริ่มทำงาน

เมื่อทำตามขั้นตอนที่ 1-6 ครบถ้วนแล้ว คุณสามารถเริ่มทำงานตาม Mission ที่ได้รับมอบหมายได้ทันที โดยยึดหลักการ "Everything must be externalized + executable" เสมอ
