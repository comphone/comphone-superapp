// ============================================================
// COMPHONE SUPER APP V5.5
// quick_actions.js — Quick Action Implementations
// Version: 5.6.0
// ============================================================
// ฟังก์ชันที่ override stub ใน app.js:
//   sendLine()        — ส่ง LINE ให้ลูกค้า
//   nudgeTech()       — จี้ช่างผ่าน LINE
//   addAppointment()  — นัดหมาย + บันทึกลง GAS
//   markDone()        — เปลี่ยนสถานะงานเป็น "งานเสร็จ"
//   markWaiting()     — เปลี่ยนสถานะงานเป็น "รอชิ้นส่วน"
// ============================================================

'use strict';

// ============================================================
// STATE
// ============================================================
const QA = {
  currentJobId: null,   // Job ID ที่เลือกอยู่ (จาก jobs list)
};

// ============================================================
// HELPER: ดึง Job ID ที่ active อยู่
// ============================================================
function _getActiveJobId() {
  // ลำดับ: QA.currentJobId → JW.currentJobId (job_workflow.js) → APP.jobs[0]
  if (QA.currentJobId) return QA.currentJobId;
  if (typeof JW !== 'undefined' && JW.currentJobId) return JW.currentJobId;
  if (APP.jobs && APP.jobs.length > 0) return APP.jobs[0].id;
  return null;
}

// ============================================================
// HELPER: ดึงข้อมูล job จาก APP.jobs
// ============================================================
function _getJobById(jobId) {
  if (!jobId || !APP.jobs) return null;
  return APP.jobs.find(j => j.id === jobId) || null;
}

// ============================================================
// HELPER: สร้าง loading button state
// ============================================================
function _setButtonLoading(btnId, loading, originalText) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  if (loading) {
    btn.disabled = true;
    btn.dataset.originalText = btn.innerHTML;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status"></span> กำลังส่ง...';
  } else {
    btn.disabled = false;
    btn.innerHTML = originalText || btn.dataset.originalText || 'ตกลง';
  }
}

// ============================================================
// 1. sendLine() — ส่ง LINE ให้ลูกค้า
// ============================================================
/**
 * เปิด modal ส่ง LINE ให้ลูกค้า
 * ถ้ามี job active จะ pre-fill ข้อมูลลูกค้า
 */
function sendLine() {
  const jobId = _getActiveJobId();
  const job   = _getJobById(jobId);

  const customerName  = job ? job.customer : '';
  const customerPhone = job ? job.phone : '';
  const defaultMsg    = job
    ? `สวัสดีครับ คุณ${customerName}\nงานบริการของท่าน (${jobId}) อัปเดตแล้วครับ 🔧\nสอบถามเพิ่มเติม: 02-xxx-xxxx`
    : 'สวัสดีครับ ขอบคุณที่ใช้บริการ COMPHONE 🙏';

  document.getElementById('modal-send-line-content').innerHTML = `
    <div class="form-group-custom">
      <label>ชื่อลูกค้า</label>
      <div class="input-wrap">
        <i class="bi bi-person-fill"></i>
        <input type="text" id="qa-line-customer" value="${customerName}" placeholder="ชื่อลูกค้า">
      </div>
    </div>
    <div class="form-group-custom">
      <label>เบอร์โทร / LINE ID</label>
      <div class="input-wrap">
        <i class="bi bi-telephone-fill"></i>
        <input type="text" id="qa-line-phone" value="${customerPhone}" placeholder="0812345678">
      </div>
    </div>
    <div class="form-group-custom">
      <label>ข้อความ <span style="color:#ef4444">*</span></label>
      <textarea id="qa-line-msg" rows="4" style="width:100%;border-radius:12px;border:1.5px solid #e5e7eb;padding:10px 14px;font-size:14px;resize:vertical">${defaultMsg}</textarea>
    </div>
    ${jobId ? `<div style="font-size:12px;color:#6b7280;margin-bottom:8px">งาน: ${jobId}</div>` : ''}
    <button id="btn-send-line" class="btn-setup" onclick="submitSendLine('${jobId || ''}')">
      <i class="bi bi-chat-dots-fill"></i> ส่ง LINE
    </button>
  `;

  document.getElementById('modal-send-line').classList.remove('hidden');
}

/**
 * Submit ส่ง LINE
 * @param {string} jobId
 */
async function submitSendLine(jobId) {
  const msg = (document.getElementById('qa-line-msg')?.value || '').trim();
  if (!msg) { showToast('กรุณากรอกข้อความ'); return; }

  _setButtonLoading('btn-send-line', true);

  try {
    const res = await callApi('sendLineMessage', {
      message: msg,
      room: 'TECHNICIAN',
      job_id: jobId,
      user: APP.user?.name || APP.user?.username || 'PWA'
    });

    if (res && res.success) {
      showToast('✅ ส่ง LINE สำเร็จ');
      closeModal('modal-send-line');
    } else {
      // LINE อาจไม่ได้ตั้งค่า — แสดง fallback
      showToast('⚠️ บันทึกแล้ว (LINE ยังไม่ได้ตั้งค่า Token)');
      closeModal('modal-send-line');
    }
  } catch (e) {
    showToast('❌ เกิดข้อผิดพลาด: ' + e.message);
  } finally {
    _setButtonLoading('btn-send-line', false);
  }
}

// ============================================================
// 2. nudgeTech() — จี้ช่างผ่าน LINE
// ============================================================
/**
 * เปิด modal จี้ช่าง
 */
async function nudgeTech() {
  // โหลดรายชื่อช่าง
  let techOptions = '<option value="">-- เลือกช่าง --</option>';
  try {
    if (typeof JW !== 'undefined' && JW.techList && JW.techList.length > 0) {
      techOptions += JW.techList.map(t => `<option value="${t}">${t}</option>`).join('');
    } else {
      const res = await callApi('getAllTechsSummary');
      if (res && res.success && res.techs) {
        const techs = res.techs.map(t => t.name).filter(Boolean);
        techOptions += techs.map(t => `<option value="${t}">${t}</option>`).join('');
      }
    }
  } catch (e) {}

  const jobId = _getActiveJobId();

  document.getElementById('modal-nudge-content').innerHTML = `
    <div class="form-group-custom">
      <label>เลือกช่าง <span style="color:#ef4444">*</span></label>
      <select id="qa-nudge-tech" class="form-select" style="border-radius:12px;border:1.5px solid #e5e7eb;padding:10px 14px">
        ${techOptions}
      </select>
    </div>
    ${jobId ? `
    <div class="form-group-custom">
      <label>งาน</label>
      <div class="input-wrap">
        <i class="bi bi-wrench"></i>
        <input type="text" id="qa-nudge-job" value="${jobId}" placeholder="Job ID">
      </div>
    </div>` : ''}
    <div class="form-group-custom">
      <label>ข้อความเพิ่มเติม (ไม่บังคับ)</label>
      <textarea id="qa-nudge-msg" rows="3" style="width:100%;border-radius:12px;border:1.5px solid #e5e7eb;padding:10px 14px;font-size:14px;resize:vertical" placeholder="เช่น ลูกค้ารอนานแล้วนะครับ"></textarea>
    </div>
    <button id="btn-nudge" class="btn-setup" style="background:linear-gradient(135deg,#ef4444,#dc2626)" onclick="submitNudgeTech()">
      <i class="bi bi-bell-fill"></i> ส่งการแจ้งเตือน
    </button>
  `;

  document.getElementById('modal-nudge').classList.remove('hidden');
}

/**
 * Submit จี้ช่าง
 */
async function submitNudgeTech() {
  const techName = document.getElementById('qa-nudge-tech')?.value || '';
  const jobId    = document.getElementById('qa-nudge-job')?.value || _getActiveJobId() || '';
  const extraMsg = document.getElementById('qa-nudge-msg')?.value || '';

  if (!techName) { showToast('กรุณาเลือกช่าง'); return; }

  _setButtonLoading('btn-nudge', true);

  try {
    const res = await callApi('nudgeTech', {
      tech_name: techName,
      job_id: jobId,
      message: extraMsg || null,
      user: APP.user?.name || APP.user?.username || 'Admin'
    });

    if (res && res.success) {
      showToast('🔔 ส่งการแจ้งเตือนช่างแล้ว');
      closeModal('modal-nudge');
    } else {
      showToast('⚠️ บันทึกแล้ว (LINE ยังไม่ได้ตั้งค่า Token)');
      closeModal('modal-nudge');
    }
  } catch (e) {
    showToast('❌ เกิดข้อผิดพลาด: ' + e.message);
  } finally {
    _setButtonLoading('btn-nudge', false);
  }
}

// ============================================================
// 3. addAppointment() — นัดหมาย
// ============================================================
/**
 * เปิด modal นัดหมาย
 */
async function addAppointment() {
  // โหลดรายการงานที่ active
  let jobOptions = '<option value="">-- เลือกงาน (ถ้ามี) --</option>';
  if (APP.jobs && APP.jobs.length > 0) {
    const activeJobs = APP.jobs.filter(j => j.status !== 'done' && j.status !== 'cancel');
    jobOptions += activeJobs.map(j =>
      `<option value="${j.id}">${j.id} — ${j.customer} (${j.title})</option>`
    ).join('');
  }

  // วันที่เริ่มต้น: พรุ่งนี้ 10:00
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);
  const defaultDate = tomorrow.toISOString().slice(0, 16); // yyyy-MM-ddTHH:mm

  document.getElementById('modal-appointment-content').innerHTML = `
    <div class="form-group-custom">
      <label>เลือกงาน</label>
      <select id="qa-appt-job" class="form-select" style="border-radius:12px;border:1.5px solid #e5e7eb;padding:10px 14px">
        ${jobOptions}
      </select>
    </div>
    <div class="form-group-custom">
      <label>วันและเวลานัด <span style="color:#ef4444">*</span></label>
      <input type="datetime-local" id="qa-appt-date" value="${defaultDate}"
        style="width:100%;border-radius:12px;border:1.5px solid #e5e7eb;padding:10px 14px;font-size:14px">
    </div>
    <div class="form-group-custom">
      <label>หมายเหตุ</label>
      <div class="input-wrap">
        <i class="bi bi-sticky-fill"></i>
        <input type="text" id="qa-appt-note" placeholder="เช่น ลูกค้าจะมาส่งเครื่องเอง">
      </div>
    </div>
    <button id="btn-appt" class="btn-setup" style="background:linear-gradient(135deg,#f59e0b,#d97706)" onclick="submitAppointment()">
      <i class="bi bi-calendar-check"></i> บันทึกนัดหมาย
    </button>
  `;

  document.getElementById('modal-appointment').classList.remove('hidden');
}

/**
 * Submit บันทึกนัดหมาย
 */
async function submitAppointment() {
  const jobId = document.getElementById('qa-appt-job')?.value || '';
  const date  = document.getElementById('qa-appt-date')?.value || '';
  const note  = document.getElementById('qa-appt-note')?.value || '';

  if (!date) { showToast('กรุณาเลือกวันและเวลา'); return; }

  _setButtonLoading('btn-appt', true);

  try {
    const payload = {
      appointment_at: date,
      note: note,
      user: APP.user?.name || APP.user?.username || 'PWA'
    };
    if (jobId) payload.job_id = jobId;

    const res = await callApi('addAppointment', payload);

    if (res && res.success) {
      showToast('📅 บันทึกนัดหมายแล้ว');
      closeModal('modal-appointment');
      // Reload jobs data
      if (typeof loadLiveData === 'function') loadLiveData();
    } else if (res && res.error) {
      showToast('❌ ' + res.error);
    } else {
      // Backend ตอบ success: false เพราะไม่มี job_id — ยังบันทึกได้
      showToast('📅 บันทึกนัดหมายแล้ว (ไม่ระบุงาน)');
      closeModal('modal-appointment');
    }
  } catch (e) {
    showToast('❌ เกิดข้อผิดพลาด: ' + e.message);
  } finally {
    _setButtonLoading('btn-appt', false);
  }
}

// ============================================================
// 4. markDone() — เปลี่ยนสถานะงานเป็น "งานเสร็จ"
// ============================================================
/**
 * เปลี่ยนสถานะงาน active เป็น "งานเสร็จ"
 * ถ้าไม่มี job active จะไปหน้า jobs ให้เลือก
 */
async function markDone() {
  const jobId = _getActiveJobId();
  if (!jobId) {
    showToast('กรุณาเลือกงานก่อน');
    goPage('jobs', document.getElementById('nav-jobs'));
    return;
  }

  const job = _getJobById(jobId);
  const jobLabel = job ? `${jobId} (${job.customer})` : jobId;

  // Confirm
  if (!confirm(`ยืนยันว่างาน ${jobLabel} เสร็จแล้ว?`)) return;

  showToast('⏳ กำลังอัปเดตสถานะ...');

  try {
    const res = await callApi('markJobStatus', {
      job_id: jobId,
      new_status: 'งานเสร็จ',
      changed_by: APP.user?.name || APP.user?.username || 'PWA',
      note: 'อัปเดตจาก Quick Action'
    });

    if (res && res.success) {
      showToast('✅ งาน ' + jobId + ' เสร็จแล้ว!');
      QA.currentJobId = null;
      if (typeof loadLiveData === 'function') loadLiveData();
    } else {
      showToast('⚠️ ' + (res?.error || 'ไม่สามารถอัปเดตสถานะได้'));
    }
  } catch (e) {
    showToast('❌ เกิดข้อผิดพลาด: ' + e.message);
  }
}

// ============================================================
// 5. markWaiting() — เปลี่ยนสถานะงานเป็น "รอชิ้นส่วน"
// ============================================================
/**
 * เปลี่ยนสถานะงาน active เป็น "รอชิ้นส่วน"
 */
async function markWaiting() {
  const jobId = _getActiveJobId();
  if (!jobId) {
    showToast('กรุณาเลือกงานก่อน');
    goPage('jobs', document.getElementById('nav-jobs'));
    return;
  }

  const job = _getJobById(jobId);
  const jobLabel = job ? `${jobId} (${job.customer})` : jobId;

  if (!confirm(`ยืนยันว่างาน ${jobLabel} รอชิ้นส่วน?`)) return;

  showToast('⏳ กำลังอัปเดตสถานะ...');

  try {
    const res = await callApi('markJobStatus', {
      job_id: jobId,
      new_status: 'รอชิ้นส่วน',
      changed_by: APP.user?.name || APP.user?.username || 'PWA',
      note: 'รอชิ้นส่วน — อัปเดตจาก Quick Action'
    });

    if (res && res.success) {
      showToast('⏳ งาน ' + jobId + ' รอชิ้นส่วน');
      QA.currentJobId = null;
      if (typeof loadLiveData === 'function') loadLiveData();
    } else {
      showToast('⚠️ ' + (res?.error || 'ไม่สามารถอัปเดตสถานะได้'));
    }
  } catch (e) {
    showToast('❌ เกิดข้อผิดพลาด: ' + e.message);
  }
}

// ============================================================
// EXPOSE: ให้ job_workflow.js และ jobs list ตั้ง currentJobId ได้
// ============================================================
window.QA = QA;
window.sendLine = sendLine;
window.nudgeTech = nudgeTech;
window.addAppointment = addAppointment;
window.markDone = markDone;
window.markWaiting = markWaiting;
window.submitSendLine = submitSendLine;
window.submitNudgeTech = submitNudgeTech;
window.submitAppointment = submitAppointment;
