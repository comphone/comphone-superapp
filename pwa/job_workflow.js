// ============================================================
// COMPHONE SUPER APP V5.5 — job_workflow.js
// Phase 1 Core Workflow:
//   1.1 Open Job Form (สร้างงานใหม่)
//   1.2 Assign Technician (มอบหมายช่าง)
//   1.3 Job Status Timeline (ประวัติสถานะ)
//   1.4 Quick Note (จดบันทึกบนงาน)
// ============================================================

// ===== STATE =====
const JW = {
  techList: [],        // รายชื่อช่างทั้งหมด
  currentJobId: null,  // Job ID ที่กำลังดูอยู่
};

// ===== INIT =====
async function loadTechList() {
  if (JW.techList.length > 0) return;
  try {
    const res = await callAPI('getAllTechsSummary');
    if (res && res.success && res.techs) {
      JW.techList = res.techs.map(t => t.name).filter(n => n && n !== 'ไม่ระบุ');
    }
  } catch (e) {}
}

// ============================================================
// 1.1 OPEN JOB FORM — สร้างงานใหม่
// ============================================================
async function openNewJob() {
  await loadTechList();
  const techOptions = JW.techList.map(t =>
    `<option value="${t}">${t}</option>`
  ).join('');

  document.getElementById('modal-new-job-content').innerHTML = `
    <div style="padding:0 16px 16px">
      <!-- ลูกค้า -->
      <div class="form-group-custom">
        <label>ชื่อลูกค้า <span style="color:#ef4444">*</span></label>
        <div class="input-wrap">
          <i class="bi bi-person-fill"></i>
          <input type="text" id="nj-customer" placeholder="เช่น คุณสมศักดิ์ วงศ์ดี" autocomplete="off">
        </div>
      </div>
      <!-- เบอร์โทร -->
      <div class="form-group-custom">
        <label>เบอร์โทรศัพท์</label>
        <div class="input-wrap">
          <i class="bi bi-telephone-fill"></i>
          <input type="tel" id="nj-phone" placeholder="0812345678">
        </div>
      </div>
      <!-- อาการ -->
      <div class="form-group-custom">
        <label>อาการ / ปัญหา <span style="color:#ef4444">*</span></label>
        <div class="input-wrap">
          <i class="bi bi-tools"></i>
          <input type="text" id="nj-symptom" placeholder="เช่น หน้าจอแตก, ชาร์จไม่เข้า">
        </div>
      </div>
      <!-- อุปกรณ์ -->
      <div class="form-group-custom">
        <label>อุปกรณ์</label>
        <div class="input-wrap">
          <i class="bi bi-phone-fill"></i>
          <input type="text" id="nj-device" placeholder="เช่น iPhone 14 Pro, Samsung S23">
        </div>
      </div>
      <!-- ราคาประเมิน -->
      <div class="form-group-custom">
        <label>ราคาประเมิน (บาท)</label>
        <div class="input-wrap">
          <i class="bi bi-currency-exchange"></i>
          <input type="number" id="nj-price" placeholder="0" min="0" step="50">
        </div>
      </div>
      <!-- มอบหมายช่าง -->
      <div class="form-group-custom">
        <label>มอบหมายช่าง (ไม่บังคับ)</label>
        <div class="input-wrap" style="padding:0">
          <i class="bi bi-person-badge-fill" style="position:absolute;left:14px;top:50%;transform:translateY(-50%);color:#9ca3af;z-index:1"></i>
          <select id="nj-tech" style="width:100%;border:none;background:transparent;padding:12px 14px 12px 40px;font-size:14px;outline:none;appearance:none;-webkit-appearance:none">
            <option value="">-- ยังไม่มอบหมาย --</option>
            ${techOptions}
          </select>
        </div>
      </div>
      <!-- หมายเหตุ -->
      <div class="form-group-custom">
        <label>หมายเหตุ</label>
        <div class="input-wrap">
          <i class="bi bi-chat-left-text"></i>
          <input type="text" id="nj-note" placeholder="หมายเหตุเพิ่มเติม">
        </div>
      </div>
      <!-- ปุ่ม -->
      <button class="btn-setup" id="nj-submit-btn" onclick="submitNewJob()" style="margin-top:8px">
        <i class="bi bi-plus-circle-fill"></i> สร้างงานใหม่
      </button>
    </div>
  `;
  document.getElementById('modal-new-job').classList.remove('hidden');
  setTimeout(() => document.getElementById('nj-customer').focus(), 200);
}

async function submitNewJob() {
  const customer = document.getElementById('nj-customer').value.trim();
  const symptom = document.getElementById('nj-symptom').value.trim();
  if (!customer) { showToast('กรุณากรอกชื่อลูกค้า'); return; }
  if (!symptom) { showToast('กรุณากรอกอาการ/ปัญหา'); return; }

  const phone = document.getElementById('nj-phone').value.trim();
  const device = document.getElementById('nj-device').value.trim();
  const price = parseFloat(document.getElementById('nj-price').value) || 0;
  const tech = document.getElementById('nj-tech').value;
  const note = document.getElementById('nj-note').value.trim();

  const btn = document.getElementById('nj-submit-btn');
  btn.disabled = true;
  btn.innerHTML = '<i class="bi bi-hourglass-split"></i> กำลังสร้างงาน...';

  try {
    const res = await callAPI('openJob', {
      customer_name: customer,
      symptom: symptom + (device ? ` [${device}]` : ''),
      phone: phone,
      estimated_price: price,
      technician: tech,
      note: note,
      changed_by: APP.user || 'PWA',
    });

    if (res && res.success) {
      closeModal('modal-new-job');
      showToast(`✅ สร้างงาน ${res.job_id} เรียบร้อย`);
      // รีโหลดข้อมูล
      await loadLiveData();
      // ถ้าอยู่หน้า jobs ให้ refresh
      if (document.getElementById('page-jobs') && !document.getElementById('page-jobs').classList.contains('hidden')) {
        renderJobsPage();
      }
    } else {
      showToast('❌ ' + (res && res.error ? res.error : 'เกิดข้อผิดพลาด'));
      btn.disabled = false;
      btn.innerHTML = '<i class="bi bi-plus-circle-fill"></i> สร้างงานใหม่';
    }
  } catch (e) {
    showToast('❌ ไม่สามารถเชื่อมต่อได้');
    btn.disabled = false;
    btn.innerHTML = '<i class="bi bi-plus-circle-fill"></i> สร้างงานใหม่';
  }
}

// ============================================================
// 1.2 ASSIGN TECHNICIAN — มอบหมายช่าง
// ============================================================
async function openAssignJob(jobId) {
  JW.currentJobId = jobId;
  await loadTechList();

  const job = APP.jobs.find(j => j.id === jobId) || { id: jobId, customer: '', tech: '' };
  const techOptions = JW.techList.map(t =>
    `<option value="${t}" ${t === job.tech ? 'selected' : ''}>${t}</option>`
  ).join('');

  document.getElementById('modal-assign-content').innerHTML = `
    <div style="padding:0 16px 16px">
      <div style="background:#f0f9ff;border-radius:12px;padding:12px;margin-bottom:16px">
        <div style="font-size:12px;color:#0369a1;font-weight:700">${jobId}</div>
        <div style="font-size:15px;font-weight:800;color:#111827">${job.customer || 'ลูกค้า'}</div>
        <div style="font-size:12px;color:#6b7280;margin-top:2px">${job.title || job.symptom || ''}</div>
      </div>
      <div class="form-group-custom">
        <label>เลือกช่าง <span style="color:#ef4444">*</span></label>
        <div class="input-wrap" style="padding:0">
          <i class="bi bi-person-badge-fill" style="position:absolute;left:14px;top:50%;transform:translateY(-50%);color:#9ca3af;z-index:1"></i>
          <select id="assign-tech-select" style="width:100%;border:none;background:transparent;padding:12px 14px 12px 40px;font-size:14px;outline:none;appearance:none;-webkit-appearance:none">
            <option value="">-- เลือกช่าง --</option>
            ${techOptions}
            <option value="__new__">+ เพิ่มชื่อช่างใหม่</option>
          </select>
        </div>
      </div>
      <div id="assign-new-tech-wrap" style="display:none" class="form-group-custom">
        <label>ชื่อช่างใหม่</label>
        <div class="input-wrap">
          <i class="bi bi-person-plus-fill"></i>
          <input type="text" id="assign-new-tech-input" placeholder="กรอกชื่อช่าง">
        </div>
      </div>
      <div class="form-group-custom">
        <label>หมายเหตุ (ไม่บังคับ)</label>
        <div class="input-wrap">
          <i class="bi bi-chat-left-text"></i>
          <input type="text" id="assign-note" placeholder="เช่น ให้ไปถึงก่อน 10.00 น.">
        </div>
      </div>
      <button class="btn-setup" id="assign-submit-btn" onclick="submitAssignJob()" style="margin-top:8px">
        <i class="bi bi-person-check-fill"></i> ยืนยันมอบหมายงาน
      </button>
    </div>
  `;

  // Toggle ช่องกรอกชื่อใหม่
  document.getElementById('assign-tech-select').onchange = function() {
    document.getElementById('assign-new-tech-wrap').style.display =
      this.value === '__new__' ? 'block' : 'none';
  };

  document.getElementById('modal-assign').classList.remove('hidden');
}

async function submitAssignJob() {
  const select = document.getElementById('assign-tech-select');
  let tech = select.value;
  if (tech === '__new__') {
    tech = document.getElementById('assign-new-tech-input').value.trim();
  }
  if (!tech) { showToast('กรุณาเลือกช่าง'); return; }

  const note = document.getElementById('assign-note').value.trim();
  const btn = document.getElementById('assign-submit-btn');
  btn.disabled = true;
  btn.innerHTML = '<i class="bi bi-hourglass-split"></i> กำลังมอบหมาย...';

  try {
    const res = await callAPI('updateJobStatus', {
      job_id: JW.currentJobId,
      technician: tech,
      new_status: 'มอบหมายแล้ว',
      note: note || `มอบหมายให้ ${tech}`,
      changed_by: APP.user || 'PWA',
    });

    if (res && res.success) {
      closeModal('modal-assign');
      showToast(`✅ มอบหมายงาน ${JW.currentJobId} ให้ ${tech} แล้ว`);
      await loadLiveData();
      if (document.getElementById('page-jobs') && !document.getElementById('page-jobs').classList.contains('hidden')) {
        renderJobsPage();
      }
    } else {
      showToast('❌ ' + (res && res.error ? res.error : 'เกิดข้อผิดพลาด'));
      btn.disabled = false;
      btn.innerHTML = '<i class="bi bi-person-check-fill"></i> ยืนยันมอบหมายงาน';
    }
  } catch (e) {
    showToast('❌ ไม่สามารถเชื่อมต่อได้');
    btn.disabled = false;
    btn.innerHTML = '<i class="bi bi-person-check-fill"></i> ยืนยันมอบหมายงาน';
  }
}

// ============================================================
// 1.3 JOB STATUS TIMELINE — ประวัติสถานะงาน
// ============================================================
async function showJobTimeline(jobId) {
  JW.currentJobId = jobId;
  const job = APP.jobs.find(j => j.id === jobId) || { id: jobId, customer: '' };

  document.getElementById('modal-timeline-content').innerHTML = `
    <div style="padding:0 16px">
      <div style="background:#f0f9ff;border-radius:12px;padding:12px;margin-bottom:16px">
        <div style="font-size:12px;color:#0369a1;font-weight:700">${jobId}</div>
        <div style="font-size:15px;font-weight:800;color:#111827">${job.customer || 'ลูกค้า'}</div>
      </div>
      <div id="timeline-list" style="padding-bottom:8px">
        <div style="text-align:center;padding:24px;color:#9ca3af">
          <i class="bi bi-hourglass-split" style="font-size:24px;display:block;margin-bottom:8px"></i>
          กำลังโหลด...
        </div>
      </div>
    </div>
  `;
  document.getElementById('modal-timeline').classList.remove('hidden');

  try {
    const res = await callAPI('getJobTimeline', { job_id: jobId });
    const list = document.getElementById('timeline-list');

    if (!res || !res.success) {
      list.innerHTML = `<div style="text-align:center;padding:24px;color:#ef4444">ไม่สามารถโหลดข้อมูลได้</div>`;
      return;
    }

    const timeline = res.timeline || [];
    if (timeline.length === 0) {
      list.innerHTML = `<div style="text-align:center;padding:24px;color:#9ca3af">ยังไม่มีประวัติสถานะ</div>`;
      return;
    }

    list.innerHTML = timeline.map((item, idx) => {
      const isFirst = idx === 0;
      const color = isFirst ? '#10b981' : '#6b7280';
      const bgColor = isFirst ? '#d1fae5' : '#f3f4f6';
      const icon = getTimelineIcon(item.to_status || item.action || '');
      return `
        <div style="display:flex;gap:12px;margin-bottom:${idx < timeline.length - 1 ? '0' : '8px'}">
          <!-- Line + dot -->
          <div style="display:flex;flex-direction:column;align-items:center;width:32px;flex-shrink:0">
            <div style="width:32px;height:32px;border-radius:50%;background:${bgColor};display:flex;align-items:center;justify-content:center;flex-shrink:0">
              <i class="bi ${icon}" style="color:${color};font-size:14px"></i>
            </div>
            ${idx < timeline.length - 1 ? `<div style="width:2px;flex:1;background:#e5e7eb;margin:4px 0"></div>` : ''}
          </div>
          <!-- Content -->
          <div style="flex:1;padding-bottom:${idx < timeline.length - 1 ? '16px' : '0'}">
            <div style="font-size:13px;font-weight:700;color:#111827">${item.to_status || item.action || 'อัปเดต'}</div>
            ${item.from_status ? `<div style="font-size:11px;color:#9ca3af">จาก: ${item.from_status}</div>` : ''}
            ${item.note ? `<div style="font-size:12px;color:#374151;margin-top:2px;background:#f9fafb;border-radius:8px;padding:6px 8px">${item.note}</div>` : ''}
            <div style="font-size:11px;color:#9ca3af;margin-top:4px">
              <i class="bi bi-clock"></i> ${item.timestamp || item.ts || '-'}
              ${item.changed_by || item.user ? `&nbsp;·&nbsp;<i class="bi bi-person"></i> ${item.changed_by || item.user}` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');
  } catch (e) {
    document.getElementById('timeline-list').innerHTML =
      `<div style="text-align:center;padding:24px;color:#ef4444">เกิดข้อผิดพลาด</div>`;
  }
}

function getTimelineIcon(status) {
  const s = (status || '').toLowerCase();
  if (s.includes('สร้าง') || s.includes('create') || s.includes('new')) return 'bi-plus-circle-fill';
  if (s.includes('มอบหมาย') || s.includes('assign')) return 'bi-person-check-fill';
  if (s.includes('กำลัง') || s.includes('progress') || s.includes('repair')) return 'bi-tools';
  if (s.includes('รอ') || s.includes('wait') || s.includes('pending')) return 'bi-clock-fill';
  if (s.includes('เสร็จ') || s.includes('complete') || s.includes('done')) return 'bi-check-circle-fill';
  if (s.includes('ยกเลิก') || s.includes('cancel')) return 'bi-x-circle-fill';
  if (s.includes('note') || s.includes('หมายเหตุ')) return 'bi-chat-left-text-fill';
  return 'bi-arrow-right-circle-fill';
}

// ============================================================
// 1.4 QUICK NOTE — จดบันทึกบนงาน
// ============================================================
function openQuickNote(jobId) {
  JW.currentJobId = jobId;
  const job = APP.jobs.find(j => j.id === jobId) || { id: jobId, customer: '' };

  document.getElementById('modal-note-content').innerHTML = `
    <div style="padding:0 16px 16px">
      <div style="background:#fefce8;border-radius:12px;padding:12px;margin-bottom:16px">
        <div style="font-size:12px;color:#ca8a04;font-weight:700">${jobId}</div>
        <div style="font-size:15px;font-weight:800;color:#111827">${job.customer || 'ลูกค้า'}</div>
      </div>
      <!-- Quick Tags -->
      <div style="margin-bottom:12px">
        <div style="font-size:12px;color:#6b7280;font-weight:600;margin-bottom:6px">เลือก Tag ด่วน</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px">
          ${['รอชิ้นส่วน', 'โทรนัดแล้ว', 'รอลูกค้ายืนยัน', 'ซ่อมเสร็จรอรับ', 'ส่งซ่อมต่อ'].map(tag =>
            `<button onclick="setNoteTag('${tag}')" style="padding:5px 12px;border-radius:20px;border:1.5px solid #e5e7eb;background:#fff;font-size:12px;cursor:pointer;font-weight:600;color:#374151">${tag}</button>`
          ).join('')}
        </div>
      </div>
      <!-- Note Input -->
      <div class="form-group-custom">
        <label>บันทึก <span style="color:#ef4444">*</span></label>
        <textarea id="quick-note-input" rows="3" placeholder="พิมพ์บันทึก..." style="width:100%;border:1.5px solid #e5e7eb;border-radius:12px;padding:12px;font-size:14px;resize:none;outline:none;font-family:inherit"></textarea>
      </div>
      <button class="btn-setup" id="note-submit-btn" onclick="submitQuickNote()" style="margin-top:4px">
        <i class="bi bi-chat-left-text-fill"></i> บันทึก
      </button>
    </div>
  `;
  document.getElementById('modal-note').classList.remove('hidden');
  setTimeout(() => document.getElementById('quick-note-input').focus(), 200);
}

function setNoteTag(tag) {
  const input = document.getElementById('quick-note-input');
  if (input) {
    input.value = tag;
    input.focus();
  }
}

async function submitQuickNote() {
  const note = document.getElementById('quick-note-input').value.trim();
  if (!note) { showToast('กรุณากรอกบันทึก'); return; }

  const btn = document.getElementById('note-submit-btn');
  btn.disabled = true;
  btn.innerHTML = '<i class="bi bi-hourglass-split"></i> กำลังบันทึก...';

  try {
    const res = await callAPI('addQuickNote', {
      job_id: JW.currentJobId,
      note: note,
      user: APP.user || 'PWA',
    });

    if (res && res.success) {
      closeModal('modal-note');
      showToast('✅ บันทึกเรียบร้อย');
      // อัปเดต note ใน APP.jobs ทันที (ไม่ต้อง reload ทั้งหมด)
      const job = APP.jobs.find(j => j.id === JW.currentJobId);
      if (job) {
        const now = new Date();
        const ts = `${String(now.getDate()).padStart(2,'0')}/${String(now.getMonth()+1).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
        job.note = (job.note ? job.note + '\n' : '') + `${ts} [${APP.user||'PWA'}]: ${note}`;
      }
    } else {
      showToast('❌ ' + (res && res.error ? res.error : 'เกิดข้อผิดพลาด'));
      btn.disabled = false;
      btn.innerHTML = '<i class="bi bi-chat-left-text-fill"></i> บันทึก';
    }
  } catch (e) {
    showToast('❌ ไม่สามารถเชื่อมต่อได้');
    btn.disabled = false;
    btn.innerHTML = '<i class="bi bi-chat-left-text-fill"></i> บันทึก';
  }
}

// ============================================================
// UPGRADE showJobDetail — เพิ่มปุ่ม Assign, Note, Timeline
// ============================================================
function showJobDetailV2(jobId) {
  const job = APP.jobs.find(j => j.id === jobId);
  if (!job) return;

  const statusColors = {
    urgent: '#ef4444', inprog: '#3b82f6', waiting: '#f59e0b',
    done: '#10b981', new: '#8b5cf6', default: '#6b7280'
  };
  const statusLabels = {
    urgent: 'ด่วนมาก', inprog: 'กำลังซ่อม', waiting: 'รอชิ้นส่วน',
    done: 'เสร็จแล้ว', new: 'รับเครื่องแล้ว'
  };
  const color = statusColors[job.status] || statusColors.default;
  const label = statusLabels[job.status] || job.status || 'ไม่ระบุ';

  const isAdmin = APP.role === 'admin' || APP.role === 'exec';
  const isTech = APP.role === 'tech';

  document.getElementById('modal-job-content').innerHTML = `
    <div style="padding:0 16px 16px">
      <!-- Header -->
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px">
        <div>
          <div style="font-size:12px;font-weight:700;color:#6b7280">${job.id}</div>
          <div style="font-size:18px;font-weight:800;color:#111827;margin-top:2px">${job.customer}</div>
          <div style="font-size:13px;color:#6b7280;margin-top:2px">${job.title || job.symptom || ''}</div>
        </div>
        <span style="padding:5px 12px;border-radius:20px;background:${color}20;color:${color};font-size:12px;font-weight:700;flex-shrink:0">${label}</span>
      </div>

      <!-- Info Grid -->
      <div style="background:#f9fafb;border-radius:14px;padding:14px;margin-bottom:12px">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:12px">
          <div>
            <div style="color:#9ca3af;font-weight:600">เบอร์โทร</div>
            <div style="font-weight:700;color:#0d6efd">${job.phone || '-'}</div>
          </div>
          <div>
            <div style="color:#9ca3af;font-weight:600">ราคาประเมิน</div>
            <div style="font-weight:700;color:#10b981">฿${Number(job.price||0).toLocaleString()}</div>
          </div>
          <div>
            <div style="color:#9ca3af;font-weight:600">ช่างที่รับผิดชอบ</div>
            <div style="font-weight:700;color:#111827">${job.tech || 'ยังไม่มอบหมาย'}</div>
          </div>
          <div>
            <div style="color:#9ca3af;font-weight:600">วันที่สร้าง</div>
            <div style="font-weight:700;color:#111827">${job.created || '-'}</div>
          </div>
        </div>
        ${job.note ? `
          <div style="margin-top:10px;padding-top:10px;border-top:1px solid #e5e7eb">
            <div style="font-size:11px;color:#9ca3af;font-weight:600;margin-bottom:4px">บันทึกล่าสุด</div>
            <div style="font-size:12px;color:#374151;white-space:pre-wrap">${job.note.split('\n').slice(-2).join('\n')}</div>
          </div>
        ` : ''}
      </div>

      <!-- Action Buttons -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
        ${isTech || isAdmin ? `
          <button class="job-act-btn btn-primary-sm" style="padding:12px" onclick="openCameraForJob('${job.id}');closeModal('modal-job')">
            <i class="bi bi-camera-fill"></i> ถ่ายรูป
          </button>
        ` : ''}
        ${isTech ? `
          <button class="job-act-btn btn-success-sm" style="padding:12px" onclick="markJobDone('${job.id}');closeModal('modal-job')">
            <i class="bi bi-check2-circle"></i> เสร็จแล้ว
          </button>
        ` : ''}
        ${isAdmin ? `
          <button class="job-act-btn" style="padding:12px;background:#eff6ff;color:#2563eb;border:none;border-radius:12px;font-size:13px;font-weight:700;cursor:pointer" onclick="closeModal('modal-job');openAssignJob('${job.id}')">
            <i class="bi bi-person-check-fill"></i> มอบหมายช่าง
          </button>
        ` : ''}
        <button class="job-act-btn" style="padding:12px;background:#fefce8;color:#ca8a04;border:none;border-radius:12px;font-size:13px;font-weight:700;cursor:pointer" onclick="closeModal('modal-job');openQuickNote('${job.id}')">
          <i class="bi bi-chat-left-text-fill"></i> บันทึก
        </button>
        <button class="job-act-btn" style="padding:12px;background:#f0fdf4;color:#16a34a;border:none;border-radius:12px;font-size:13px;font-weight:700;cursor:pointer" onclick="closeModal('modal-job');showJobTimeline('${job.id}')">
          <i class="bi bi-clock-history"></i> ประวัติ
        </button>
        ${job.phone ? `
          <button class="job-act-btn" style="padding:12px;background:#f9fafb;color:#374151;border:none;border-radius:12px;font-size:13px;font-weight:700;cursor:pointer" onclick="callCustomer('${job.phone}')">
            <i class="bi bi-telephone-fill"></i> โทร
          </button>
        ` : ''}
      </div>
    </div>
  `;
  document.getElementById('modal-job').classList.remove('hidden');
}

// Override showJobDetail ด้วย V2
window.showJobDetail = showJobDetailV2;
