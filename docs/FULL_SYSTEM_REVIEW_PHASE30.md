# Full System Review — COMPHONE SUPER APP v5.9.0-phase2d (Phase 30)

วันที่รีวิว: 2026-04-28  
ฐานอ้างอิง: `BLUEPRINT.md` (Single Source of Truth)

## 1) Executive Summary

ระบบอยู่ในสถานะ **Production ที่ใช้งานได้จริง** และมีโครงสร้างที่แข็งแรงสำหรับธุรกิจ SME ที่ต้องการทั้งความเร็วและการควบคุมเชิงปฏิบัติการ โดยจุดเด่นคือการออกแบบแบบ **GAS + PWA + LINE + Worker** ที่เหมาะกับทีมหน้างาน, การทำงานจริงในไทย (PromptPay/LINE), และต้นทุนบำรุงรักษาที่สมเหตุสมผล.

อย่างไรก็ตาม ณ Phase 30 ยังมีความเสี่ยงระดับสูง 3 ด้านที่ควรปิดให้เร็ว:
1. **Reliability ฝั่ง Login/Splash + Service Worker cache behavior** (กระทบการเข้าใช้งานจริงโดยตรง)
2. **Technical debt จากไฟล์แกนขนาดใหญ่มาก** (`Inventory.gs`, `BillingManager.gs`) ที่ทำให้ coupling สูง
3. **Test automation coverage ยังต่ำ** ในเส้นทาง critical เช่น auth, billing, stock transfer, POS sale flow

ข้อเสนอหลัก: ทำแผน 30-60-90 วัน โดยให้ **ความเสถียรการเข้าใช้งานและ regression safety** มาก่อนการเพิ่มฟีเจอร์ใหม่.

---

## 2) ภาพรวมสถาปัตยกรรม (Architecture Assessment)

### จุดแข็ง
- ออกแบบเส้นทาง webhook ถูกต้อง: Worker ตอบ 200 ทันทีแล้วค่อย async ต่อไป GAS (`waitUntil`) ช่วยลด timeout จาก LINE.
- Frontend เป็น SPA + PWA ช่วยลด round-trip และทำ UX ใกล้ native.
- มี observability พอสมควร (`ErrorTelemetry`, `_logInfo_`, cron instrumentation).
- มีแนวคิด security invariants ที่ชัดเจน (execution lock, token verify, rate limit).

### ความเสี่ยง/ข้อสังเกต
- สถาปัตยกรรมพึ่งพา Google Sheets สูงมาก; หาก data volume โตเร็ว latency/locking จะกลายเป็นคอขวด.
- API strategy เปลี่ยนเป็น GET ทั้งหมด แม้แก้ปัญหา 302 ได้ แต่ต้องจัดการเรื่องความยาว URL, sensitive params, และ cache/proxy semantics อย่างมีวินัย.
- มีสัญญาณของ "document drift" บางจุด (เช่น endpoint @501/@502, section หมายเลขซ้ำ, สถานะงานที่ conflict กันบางหัวข้อ) ซึ่งอาจทำให้ตัดสินใจผิดตอน incident.

---

## 3) Security Review (เชิงระบบ)

### สิ่งที่ทำได้ดี
- มี token session และ verifySession ฝั่ง server.
- มี role-based UI + protected actions.
- มี LINE signature verification และ rate limiting.
- วางหลักการห้าม bypass GAS call ผ่าน execution lock.

### Gap ที่ควรปิดเพิ่ม (สำคัญ)
1. **ALLOWED_ORIGINS = `*`**: เสี่ยง CORS กว้างเกินจำเป็น แม้มี token แต่เพิ่ม attack surface.
2. **Credentials ในเอกสาร**: blueprint ระบุ credential ตัวอย่างชัดเจน ควรแยกเป็น redacted profile/secret manager policy.
3. **GET token leakage risk**: token ใน query อาจไปอยู่ใน browser history, proxy logs, referrer.
4. **Session hardening**: ควรเพิ่ม idle timeout + token rotation + revocation list ที่ชัดเจนในเอกสารและโค้ด.

### คำแนะนำปฏิบัติได้ทันที
- ปรับ CORS allowlist เป็นโดเมนใช้งานจริงเท่านั้น.
- ลด token ใน URL โดยใช้ short-lived one-time ticket แลกเป็น server session เมื่อโหลดหน้าแรก.
- บังคับ `Referrer-Policy: strict-origin-when-cross-origin` และ scrub query ใน logging.
- ทำ Security Runbook: incident response สำหรับ token leak/บัญชีหลุด.

---

## 4) Reliability & Operations Review

### สิ่งที่ดี
- มี cron jobs ครอบคลุมงานธุรกิจหลัก.
- มี health check และ monitoring dashboard.
- มี deploy pipeline ที่ค่อนข้างครบ (clasp + pages + drive sync).

### ความเสี่ยงหลัก
1. **Login/Splash ยังมี pending issue** → เป็น P1 เพราะกระทบ availability โดยตรง.
2. **Service Worker invalidation** ยังต้องพึ่ง hard refresh/manual clear ในบางกรณี.
3. **Drive sync timeout** (`SharedContext.gs`) สะท้อนว่ากระบวนการ backup/sync ยังไม่ deterministic 100%.

### แผนแก้เชิงวิศวกรรม
- เพิ่ม SW kill-switch และ emergency no-cache mode จาก remote config.
- เพิ่ม synthetic monitoring ราย 5 นาที (login, getDashboardBundle, createBill smoke).
- เพิ่ม retry with jitter + circuit breaker สำหรับ Drive sync.
- ทำ release gates: ถ้า smoke test fail ห้าม promote version.

---

## 5) Data & Domain Integrity Review

### จุดแข็ง
- มี DatabaseIntegrity และแนวคิด schema validation.
- โมดูลธุรกิจครบวงจรตั้งแต่งานซ่อม สต็อก บิล ภาษี CRM จนถึง portal.

### จุดต้องระวัง
- แกนข้อมูลอยู่ใน Sheets หลายตาราง: ต้องย้ำเรื่อง idempotency, unique keys, และ referential checks ระหว่าง Jobs/Inventory/Billing.
- Flow สถานะงานเชื่อม billing/stock/notification หลายจุด ถ้าไม่มี contract test จะเกิด regression ง่าย.

### ข้อเสนอ
- ระบุ Data Contract ต่อ action สำคัญ (required fields, enums, failure mode) เป็นไฟล์กลาง.
- เพิ่ม reconciliation jobs รายวัน: ยอดขาย vs สต็อกตัด vs เอกสารการเงิน.
- ทำ immutable audit trail สำหรับ state transition ที่กระทบรายได้.

---

## 6) Performance & Scalability Review

### จุดดี
- มี `getDashboardBundle` + cache 90s ลด latency ชัดเจน.
- Worker ช่วยลด webhook latency ได้ดี.

### Bottleneck ที่จะเจอเมื่อโต
- GAS cold start + Sheets read amplification ในโมดูลใหญ่.
- ไฟล์ขนาดใหญ่ >1000 lines ทำให้ optimize เฉพาะจุดยาก.
- ฝั่ง PWA ถ้า cache strategy ไม่ strict อาจเกิด stale data ในจุด critical.

### Roadmap ทางเทคนิค
- แตก read model ของ dashboard แยกจาก transaction path.
- แยก utility/shared logic จาก `Inventory.gs` และ `BillingManager.gs` ก่อนค่อย split handler.
- ใส่ budget metric: p95 latency ต่อ action สำคัญ + error budget ต่อวัน.

---

## 7) Codebase Governance & Delivery

### สิ่งที่ดี
- มี freeze policy และ dependency checklist ก่อน commit.
- มี single source of truth สำหรับเวอร์ชัน (`version_config.js`).

### สิ่งที่ควรยกระดับ
- เพิ่ม CI checks บังคับก่อน merge: lint + smoke + contract tests.
- บังคับ Conventional Commit/PR template ที่สะท้อน cross-module impact.
- เพิ่ม changelog แบบ operator-friendly (มี impact, rollback steps, manual checks).

---

## 8) Priority Matrix (สิ่งที่ควรทำก่อน-หลัง)

### P0 (ภายใน 7 วัน)
1. ปิดปัญหา Login/Splash ให้จบด้วย root-cause report + regression test
2. ออก SW emergency controls (kill-switch + forced refresh banner)
3. จำกัด CORS allowlist และลดความเสี่ยง token ใน URL

### P1 (ภายใน 30 วัน)
1. แตก `Inventory.gs`/`BillingManager.gs` เป็นโมดูลย่อย
2. สร้าง contract tests สำหรับ actions ธุรกิจหลัก
3. ทำ synthetic monitoring + alert routing ตาม severity

### P2 (ภายใน 60-90 วัน)
1. ยกระดับ analytics (predictive + anomaly) บนฐานข้อมูล telemetry ที่นิ่ง
2. ทำ operational data mart/read model สำหรับรายงานหนัก
3. เตรียม migration path หาก Sheets แตะขีดจำกัด throughput

---

## 9) แผนปฏิบัติการ 30-60-90 วัน (Mentor Plan)

### 0-30 วัน: Stabilize
- Freeze feature ใหม่ที่ไม่จำเป็น
- ทำ "Reliability Sprint": login, SW, backup/sync
- นิยาม SLO ขั้นต้น: login success rate, API p95, failed job ratio

### 31-60 วัน: Harden
- เริ่ม test pyramid: unit (core utils), contract (API), e2e smoke (critical paths)
- ทำ structured runbook สำหรับ incident ชั้น P1/P0
- Refactor โมดูลใหญ่ด้วย strangler pattern

### 61-90 วัน: Scale
- แยกภาระ dashboard/reporting ออกจาก transactional API
- เพิ่ม governance metrics: lead time, change failure rate, MTTR
- เตรียม capability uplift ฝั่ง AI ให้ผูกกับ business KPI ชัดเจน

---

## 10) Checklist สำหรับทีม (นำไปใช้ได้ทันที)

### ก่อน Deploy
- [ ] Version sync ครบทุก surface (SW/PWA/GAS)
- [ ] Smoke test ผ่าน: login, dashboard bundle, create/update job, create bill, POS sale
- [ ] Rollback command/steps ถูกต้องและทดสอบแล้ว
- [ ] Monitoring + alert routing พร้อมใช้งาน

### หลัง Deploy (15-30 นาทีแรก)
- [ ] ดู error rate และ p95 latency เทียบ baseline
- [ ] ตรวจกลุ่ม LINE ว่าแจ้งเตือนปกติ
- [ ] ตรวจ offline queue ว่าไม่ค้าง
- [ ] เก็บ release note + incident notes

---

## 11) สรุปสำหรับผู้บริหาร

ระบบนี้ **มีพื้นฐานดีมากและใกล้ระดับ enterprise สำหรับบริบท SME** แล้ว โดยเฉพาะการเชื่อมงานหน้างาน-หลังบ้านผ่าน LINE/PWA/GAS ที่ใช้งานจริงได้คุ้มค่า.

แต่เพื่อให้ "นิ่งและโตได้" ควรจัดลำดับเป็น:
1) **ความเสถียรการเข้าใช้งาน**, 2) **ความปลอดภัยเชิงปฏิบัติ**, 3) **การทดสอบอัตโนมัติ**, 4) **ลด coupling ของโมดูลใหญ่**.

ถ้าปิด 4 เรื่องนี้ได้ใน 1-2 ไตรมาส ระบบจะพร้อมขยับจาก "ใช้งานได้ดี" ไปสู่ "ขยายได้อย่างมั่นใจ".
