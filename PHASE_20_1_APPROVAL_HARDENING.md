# PHASE 20.1 — APPROVAL HARDENING (PRODUCTION)
## COMPHONE SUPER APP V5.5 → V5.6.1-PROD

---

## 🎯 สรุปงาน

ยกระดับ Approval System จาก **"UI demo"** ว่างนี้ → **"Production Control System"**

|ไฟล์|หน้าที่|หน้าที่|
|---|---|---|
|`approval_guard.js`|`pwa/approval_guard.js`|คลาองไวน์: Pre-check + Audit + Anti-tamper|
|`Approval.gs`|`clasp-ready/Approval.gs`|เซิร์ฟเวอร์: Source of Truth + Session Verify + Nonce|
|`index.html`|ผน่าน `auth_guard.js`|โหลด `approval_guard.js`|

---

## 🛡️ หลักการรับประกัน (Security Principles)

1. **NEVER TRUST CLIENT** — `window.__USER_ROLE` แก้ได้ แต่ Server เป็นตัวตัดสิน
2. **ZERO SILENT FAILURE** — ทุก error ต้อง log + notify + showToast
3. **AUDIT EVERY ACTION** — บันทึกทุก approve/reject/timeout ลง DB_AUDIT
4. **ANTI-REPLAY** — Nonce + Timestamp + Drift Check (5 นาที)

---

## 🔧 วิธีใช้งาน (Migration Guide)

### ✅ BEFORE (เดิม) — ไม่ปลอดภัย

```javascript
function deleteJob(id) {
  if (!confirm('ลบจริง?')) return;
  google.script.run.deleteJob(id);  // ไม่มี role check บน server!
}
```

### ✅ AFTER (ใหม่) — Production Hardened

```javascript
function deleteJob(id) {
  approve(id, 'deleteJob', {
    onSuccess: (result) => {
      // Server บอกว่า approve แล้ว ค่อยทำงานต่อ
      google.script.run.withSuccessHandler(refreshJobList).deleteJob(id);
    },
    onError: (err) => {
      console.error('Approval rejected:', err.reason);
    }
  });
}
```

### ✅ ใช้งานผ่าน Guarded Button (สร้างปุ่มอัตโนมัติ)

```javascript
const btn = createGuardedButton(
  '<i class="bi bi-trash"></i> ลบ',
  'deleteJob',
  jobId,
  (result) => {
    // อนุมัติแล้ว ทำงานต่อ
    refreshJobList();
  },
  {
    className: 'btn btn-danger btn-sm',
    confirmHighImpact: true,
    payload: { jobId: jobId, reason: 'customer_request' }
  }
);
document.getElementById('actions').appendChild(btn);
```

### ✅ Batch Approval (อนุมัติหลายรายการ)

```javascript
const items = selectedJobs.map(j => ({
  id: j.id,
  action: 'updateJobStatus',
  payload: { newStatus: 'CLOSED' }
}));

batchApprove(items, {
  onSuccess: (res) => {
    showToast(`อนุมัติ ${res.approved} รายการ`);
    refreshDashboard();
  }
});
```

---

## 📝 Role และ Impact Mapping

|Action|Min Level|Roles|Impact|Audit|
|---|---|---|---|---|
|deleteData, deleteJob, deleteUser, cancelJob, refund, approveBilling, setupSystem|4|OWNER|high|✅|
|updateJobStatus|2|OWNER, SALES, TECHNICIAN|medium|✅|
|createJob|2|OWNER, SALES|medium|✅|
|createPO, transferStock, rejectBilling|3|OWNER, ACCOUNTANT|medium|✅|
|markDone, markWaiting|1|OWNER, TECHNICIAN|low|✅|
|addAppointment, sendLine, nudgeTech|1-2|mixed|low|❌|
|getDashboardBundle, viewRevenue|1-3|mixed|low|❌|

---

## 🔄 ขั้นตอนการ Deploy

1. **Push ไป GAS:**
   ```bash
   cd /mnt/c/Users/Server/comphone-superapp/clasp-ready
   clasp push
   ```

2. **New Deployment** (บังคับงว่าจะ Force-Clean ตาม Skill)

3. **ทดสอบ:**
   - Login ด้วย role `technician` → ลองกด `deleteJob` → ต้องถูก Reject
   - Login ด้วย role `owner` → กด `deleteJob` → ต้องขึ้น confirm → อนุมัติ

---

## 📁 ไฟล์ Audit

- Client audit buffer: `localStorage.approval_audit_log`
- Server audit: `DB_AUDIT` sheet (action=`APPROVAL_OK` / `APPROVAL_FAIL`)
- ส่งทันที: `syncApprovalAuditLogs()` (เรียกได้หลัง login หรือตาม interval)

---

## ⚠️ ข้อควรระวัง

- ห้ามแก้ไข `SERVER_APPROVAL_RULES` ใน `Approval.gs` โดยตรง และ `APPROVAL_ROLE_MAP` ใน `approval_guard.js` ต้องตรงกันเสมอ
- ห้ามมี action ใหม่ ให้เพิ่มลงทั้ง 2 ไฟล์
- ห้ามยังไม่ได้แก้ `window.__USER_ROLE` ใน legacy code ที่อื่น → ใช้ `canApprove()` แทน
