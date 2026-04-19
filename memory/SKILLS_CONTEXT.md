# 🧠 Skills Context Registry
**COMPHONE SUPER APP V5.5**

เอกสารนี้รวบรวม Agent Skills ที่เกี่ยวข้องกับโปรเจกต์ COMPHONE SUPER APP V5.5 เพื่อให้ AI ในเซสชันถัดไปสามารถเรียกใช้งานได้อย่างถูกต้องและต่อเนื่อง

---

## 1. `comphone-superapp-dev`
**หน้าที่:** Development and session management (Senior AI System Architect v4)
**การใช้งาน:**
- ใช้สำหรับพัฒนาฟีเจอร์ใหม่ (Phase 3+)
- ตรวจสอบสถานะโปรเจกต์เทียบกับ Blueprint
- Deploy GAS/PWA modules
- ตรวจสอบความสอดคล้องของ API contract

**คำสั่งเรียกใช้:**
> "ใช้ skill comphone-superapp-dev เพื่อพัฒนา [feature]"

---

## 2. `comphone-session-audit`
**หน้าที่:** Audit and update session.md
**การใช้งาน:**
- ตรวจสอบความถูกต้องของสถานะโปรเจกต์
- อัปเดต `session.md` ให้ตรงกับโค้ดจริงใน GitHub และ GAS API
- ค้นหาช่องโหว่ใน Pending Tasks
- Onboard AI ใหม่เข้าสู่ context ที่ถูกต้อง

**คำสั่งเรียกใช้:**
> "ใช้ skill comphone-session-audit เพื่ออัปเดต session.md"

---

## 3. `comphone-context-recovery`
**หน้าที่:** Session context management, recovery, and handover
**การใช้งาน:**
- สร้างหรืออัปเดต `session.md` จากเอกสารหลายไฟล์
- กู้คืน context ที่หายไปเมื่อเริ่มห้องแชทใหม่
- รวมเอกสารโปรเจกต์เป็นไฟล์ session เดียว
- ตรวจสอบความสมบูรณ์ของ `session.md`
- ตั้งค่า auto-backup workflows

**คำสั่งเรียกใช้:**
> "ใช้ skill comphone-context-recovery เพื่อกู้คืน context"

---

## 4. `comphone-handover`
**หน้าที่:** Session handover, backup, and chat room migration
**การใช้งาน:**
- อัปเดต `session.md` ก่อนปิดห้องแชท
- เตรียมไฟล์ handover ZIP สำหรับ GitHub push
- สร้าง auto-backup workflows
- Onboard AI ใหม่พร้อม context เต็มรูปแบบจากเซสชันก่อนหน้า

**คำสั่งเรียกใช้:**
> "ใช้ skill comphone-handover เพื่อเตรียมย้ายห้องแชทใหม่"

---

## 💡 วิธีการใช้งาน Skills ร่วมกัน
1. **เริ่มเซสชันใหม่:** เรียกใช้ `comphone-session-audit` หรือ `comphone-context-recovery` เพื่อทำความเข้าใจสถานะล่าสุด
2. **ระหว่างการพัฒนา:** เรียกใช้ `comphone-superapp-dev` เพื่อเขียนโค้ดและ deploy
3. **จบเซสชัน:** เรียกใช้ `comphone-handover` เพื่อบันทึกสถานะและเตรียมส่งมอบให้เซสชันถัดไป

---
*เอกสารนี้สร้างโดย Manus AI | อัปเดตล่าสุด: 18 เมษายน 2569*
