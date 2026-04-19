// ============================================================
// COMPHONE SUPER APP V5.5 — job_workflow.js
// Sprint 1 Complete:
//   1.1 Open Job Form (สร้างงานใหม่)
//   1.2 Assign Technician (มอบหมายช่าง) — ใช้ transitionJob
//   1.3 Job Status Timeline (ประวัติสถานะ)
//   1.4 Quick Note (จดบันทึกบนงาน)
//   1.5 Mark Job Done → Billing Flow
//   1.6 Job Detail V2 (แสดงข้อมูลครบ + Quick Search)
// ============================================================

// ===== STATE =====
const JW = {
  techList: [],        // รายชื่อช่างทั้งหมด
  currentJobId: null,  // Job ID ที่กำลังดูอยู่
};

// JOB_STATUS_MAP (สำหรับ display)
const JOB_STATUS_LABELS = {
  1: 'รอมอบหมาย',
  2: 'มอบหมายแล้ว',
  3: 'รับงานแล้ว',
  4: 'เดินทาง',
  5: 'ถึงหน้างาน',
  6: 'เริ่มงาน',
  7: 'รอชิ้นส่วน',
  8: 'งานเสร็จ',
  9: 'ลูกค้าตรวจรับ',
  10: 'รอเก็บเงิน',
  11: 'เก็บเงินแล้ว',
  12: 'ปิดงาน'
};

// ===== INIT =====
async function loadTechList() {
  if (JW.techList.length > 0) return;
  try {
    const res = await callApi('getAllTechsSummary');
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
    const res = await callApi('openJob', {
      customer_name: customer,
      symptom: symptom + (device ? ` [${device}]` : ''),
      phone: phone,
      estimated_price: price,
      technician: tech,
      note: note,
      changed_by: (APP.user && APP.user.name) || APP.user || 'PWA',
    });

    if (res && res.success) {
      closeModal('modal-new-job');
      showToast(`✅ สร้างงาน ${res.job_id} เรียบร้อย`);
      await loadLiveData();
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
// 1.2 ASSIGN TECHNICIAN — มอบหมายช่าง (ใช้ transitionJob)
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
    // ใช้ transitionJob (ไม่ใช่ updateJobStatus)
    const res = await callApi('transitionJob', {
      job_id: JW.currentJobId,
      new_status: 'มอบหมายแล้ว',
      technician: tech,
      note: note || `มอบหมายให้ ${tech}`,
      changed_by: (APP.user && APP.user.name) || APP.user || 'PWA',
    });

    if (res && res.success) {
      closeModal('modal-assign');
      showToast(`✅ มอบหมายงาน ${JW.currentJobId} ให้ ${tech} แล้ว`);
      await loadLiveData();
      if (document.getElementById('page-jobs') && !document.getElementById('page-jobs').classList.contains('hidden')) {
        renderJobsPage();
      }
    } else {
      // ถ้า transition ไม่ได้ (เช่น status ไม่ใช่ 1) ลองใช้ updateJobById แทน
      const fallback = await callApi('updateJobById', {
        job_id: JW.currentJobId,
        technician: tech,
        note: note || `มอบหมายให้ ${tech}`,
        changed_by: (APP.user && APP.user.name) || APP.user || 'PWA',
      });
      if (fallback && fallback.success) {
        closeModal('modal-assign');
        showToast(`✅ อัปเดตช่าง ${tech} สำหรับงาน ${JW.currentJobId} แล้ว`);
        await loadLiveData();
        if (document.getElementById('page-jobs') && !document.getElementById('page-jobs').classList.contains('hidden')) {
          renderJobsPage();
        }
      } else {
        showToast('❌ ' + (res && res.error ? res.error : 'เกิดข้อผิดพลาด'));
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-person-check-fill"></i> ยืนยันมอบหมายงาน';
      }
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
      <div id="timeline-list" style="text-align:center;padding:2rem;color:#9ca3af">
        <i class="bi bi-hourglass-split" style="font-size:1.5rem"></i><br>กำลังโหลดประวัติ...
      </div>
    </div>
  `;
  document.getElementById('modal-timeline').classList.remove('hidden');

  try {
    const res = await callApi('getJobTimeline', { job_id: jobId });
    const list = document.getElementById('timeline-list');
    if (!list) return;

    if (res && res.success && res.timeline && res.timeline.length > 0) {
      list.innerHTML = res.timeline.map((ev, i) => `
        <div style="display:flex;gap:12px;margin-bottom:16px">
          <div style="display:flex;flex-direction:column;align-items:center">
            <div style="width:28px;height:28px;border-radius:50%;background:${i === 0 ? '#10b981' : '#e5e7eb'};display:flex;align-items:center;justify-content:center;flex-shrink:0">
              <i class="bi bi-check2" style="color:${i === 0 ? '#fff' : '#9ca3af'};font-size:14px"></i>
            </div>
            ${i < res.timeline.length - 1 ? '<div style="width:2px;flex:1;background:#e5e7eb;margin:4px 0"></div>' : ''}
          </div>
          <div style="flex:1;padding-bottom:8px">
            <div style="font-weight:700;font-size:13px;color:#111827">${ev.to_status || ev.status || ev.event || '-'}</div>
            <div style="font-size:11px;color:#6b7280;margin-top:2px">${ev.changed_at || ev.timestamp || ev.time || ''}</div>
            ${ev.changed_by || ev.user ? `<div style="font-size:11px;color:#9ca3af">โดย: ${ev.changed_by || ev.user}</div>` : ''}
            ${ev.note ? `<div style="font-size:12px;color:#374151;margin-top:4px;padding:6px;background:#f9fafb;border-radius:8px">${ev.note}</div>` : ''}
          </div>
        </div>
      `).join('');
    } else {
      list.innerHTML = '<div style="text-align:center;padding:2rem;color:#9ca3af"><i class="bi bi-clock-history" style="font-size:2rem"></i><br>ยังไม่มีประวัติสถานะ</div>';
    }
  } catch (e) {
    const list = document.getElementById('timeline-list');
    if (list) list.innerHTML = '<div style="text-align:center;padding:2rem;color:#ef4444">โหลดไม่สำเร็จ</div>';
  }
}

// ============================================================
// 1.4 QUICK NOTE — จดบันทึกบนงาน
// ============================================================
async function openQuickNote(jobId) {
  JW.currentJobId = jobId;
  const job = APP.jobs.find(j => j.id === jobId) || { id: jobId, customer: '' };

  document.getElementById('modal-note-content').innerHTML = `
    <div style="padding:0 16px 16px">
      <div style="background:#fefce8;border-radius:12px;padding:12px;margin-bottom:16px">
        <div style="font-size:12px;color:#ca8a04;font-weight:700">${jobId}</div>
        <div style="font-size:14px;font-weight:700;color:#111827">${job.customer || 'ลูกค้า'}</div>
      </div>
      ${job.note ? `
        <div style="margin-bottom:12px">
          <div style="font-size:11px;color:#9ca3af;font-weight:600;margin-bottom:6px">บันทึกล่าสุด</div>
          <div style="background:#f9fafb;border-radius:10px;padding:10px;font-size:12px;color:#374151;white-space:pre-wrap;max-height:100px;overflow-y:auto">${job.note.split('\n').slice(-3).join('\n')}</div>
        </div>
      ` : ''}
      <div class="form-group-custom">
        <label>บันทึกใหม่</label>
        <div class="input-wrap">
          <i class="bi bi-chat-left-text-fill"></i>
          <input type="text" id="quick-note-input" placeholder="พิมพ์บันทึก..." autocomplete="off">
        </div>
      </div>
      <button class="btn-setup" id="note-submit-btn" onclick="submitQuickNote()" style="margin-top:8px">
        <i class="bi bi-chat-left-text-fill"></i> บันทึก
      </button>
    </div>
  `;
  document.getElementById('modal-note').classList.remove('hidden');
  setTimeout(() => {
    const input = document.getElementById('quick-note-input');
    if (input) input.focus();
  }, 200);
}

async function submitQuickNote() {
  const note = document.getElementById('quick-note-input').value.trim();
  if (!note) { showToast('กรุณากรอกบันทึก'); return; }

  const btn = document.getElementById('note-submit-btn');
  btn.disabled = true;
  btn.innerHTML = '<i class="bi bi-hourglass-split"></i> กำลังบันทึก...';

  try {
    const res = await callApi('addQuickNote', {
      job_id: JW.currentJobId,
      note: note,
      user: (APP.user && APP.user.name) || APP.user || 'PWA',
    });

    if (res && res.success) {
      closeModal('modal-note');
      showToast('✅ บันทึกเรียบร้อย');
      const job = APP.jobs.find(j => j.id === JW.currentJobId);
      if (job) {
        const now = new Date();
        const ts = `${String(now.getDate()).padStart(2,'0')}/${String(now.getMonth()+1).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
        const userName = (APP.user && APP.user.name) || APP.user || 'PWA';
        job.note = (job.note ? job.note + '\n' : '') + `${ts} [${userName}]: ${note}`;
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
// 1.5 MARK JOB DONE — งานเสร็จ + Billing Flow
// ============================================================
async function markJobDoneV2(jobId) {
  const job = APP.jobs.find(j => j.id === jobId);
  if (!job) { showToast('ไม่พบงาน ' + jobId); return; }

  // ปิด modal ก่อน
  closeModal('modal-job');

  // แสดง confirm
  if (!confirm(`ยืนยันว่างาน ${jobId} เสร็จแล้ว?`)) return;

  showToast('⏳ กำลังอัปเดตสถานะ...');

  try {
    const res = await callApi('transitionJob', {
      job_id: jobId,
      new_status: 'งานเสร็จ',
      changed_by: (APP.user && APP.user.name) || APP.user || 'PWA',
      note: 'งานเสร็จแล้ว',
    });

    if (res && res.success) {
      // อัปเดต local state
      if (job) job.status = 'done';
      await loadLiveData();
      showToast('✅ บันทึกงานเสร็จแล้ว');

      // ถามว่าจะออกบิลเลยไหม
      setTimeout(() => {
        if (confirm('งานเสร็จแล้ว! ต้องการออกใบเสร็จเลยไหม?')) {
          if (typeof openBillingModal === 'function') {
            openBillingModal(jobId);
          } else {
            showToast('กำลังเปิดหน้าออกบิล...');
          }
        }
      }, 500);
    } else {
      // ถ้า transition ไม่ได้ (สถานะไม่ถูก) แสดง error พร้อม allowed_next
      const errMsg = res && res.error ? res.error : 'เกิดข้อผิดพลาด';
      const allowedNext = res && res.allowed_next ? res.allowed_next.map(n => n.label).join(', ') : '';
      showToast('❌ ' + errMsg + (allowedNext ? `\nสถานะถัดไปที่ทำได้: ${allowedNext}` : ''));
    }
  } catch (e) {
    showToast('❌ ไม่สามารถเชื่อมต่อได้');
  }
}

// ============================================================
// 1.6 ADVANCE JOB STATUS — เลื่อนสถานะ (ใช้ transitionJob)
// ============================================================
async function advanceJobStatus(jobId, targetStatus) {
  showToast('⏳ กำลังอัปเดตสถานะ...');
  try {
    const res = await callApi('transitionJob', {
      job_id: jobId,
      new_status: targetStatus,
      changed_by: (APP.user && APP.user.name) || APP.user || 'PWA',
    });
    if (res && res.success) {
      await loadLiveData();
      showToast(`✅ อัปเดตเป็น "${res.to_status_label}" แล้ว`);
      // ถ้าเป็นงานเสร็จ ถามออกบิล
      if (res.to_status_code === 8) {
        setTimeout(() => {
          if (confirm('งานเสร็จแล้ว! ต้องการออกใบเสร็จเลยไหม?')) {
            if (typeof openBillingModal === 'function') openBillingModal(jobId);
          }
        }, 500);
      }
    } else {
      showToast('❌ ' + (res && res.error ? res.error : 'เกิดข้อผิดพลาด'));
    }
  } catch (e) {
    showToast('❌ ไม่สามารถเชื่อมต่อได้');
  }
}

// ============================================================
// 1.7 SHOW JOB DETAIL V2 — แสดงข้อมูลครบ
// ============================================================
function showJobDetailV2(jobId) {
  const job = APP.jobs.find(j => j.id === jobId);
  if (!job) return;

  // ใช้ statusLabel จาก normalizeJob ก่อน ถ้าไม่มีใช้ status
  const statusLabel = job.statusLabel || job.status || '-';
  const statusNum = job.raw && job.raw.status_code ? Number(job.raw.status_code) : 0;

  // สีตาม status
  const statusColorMap = {
    'done': '#10b981', 'inprog': '#3b82f6', 'waiting': '#f59e0b',
    'urgent': '#ef4444', 'new': '#8b5cf6', 'cancel': '#6b7280'
  };
  const color = statusColorMap[job.status] || '#6b7280';

  // สร้าง allowed next buttons
  const allowedNext = job.raw && job.raw.allowed_next ? job.raw.allowed_next : [];
  const nextBtns = allowedNext.length > 0 ? `
    <div style="margin-bottom:8px">
      <div style="font-size:11px;color:#9ca3af;font-weight:600;margin-bottom:6px">เลื่อนสถานะ</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px">
        ${allowedNext.map(n => `
          <button onclick="closeModal('modal-job');advanceJobStatus('${job.id}','${n.label}')"
            style="padding:6px 12px;background:#f0f9ff;color:#0369a1;border:1px solid #bae6fd;border-radius:20px;font-size:12px;font-weight:600;cursor:pointer">
            → ${n.label}
          </button>
        `).join('')}
      </div>
    </div>
  ` : '';

  const isAdmin = APP.role === 'admin' || APP.role === 'exec';
  const isTech = APP.role === 'tech';

  // แยก device จาก symptom ถ้ามี [device] format
  let symptomDisplay = job.title || '-';
  let deviceDisplay = job.raw && job.raw.device ? job.raw.device : '';
  const deviceMatch = symptomDisplay.match(/^(.*?)\s*\[(.+)\]$/);
  if (deviceMatch) {
    symptomDisplay = deviceMatch[1].trim();
    if (!deviceDisplay) deviceDisplay = deviceMatch[2].trim();
  }

  document.getElementById('modal-job-content').innerHTML = `
    <div style="padding:0 16px 16px">
      <!-- Header -->
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px">
        <div style="flex:1;min-width:0">
          <div style="font-size:12px;font-weight:700;color:#6b7280">${job.id}</div>
          <div style="font-size:18px;font-weight:800;color:#111827;margin-top:2px">${job.customer}</div>
          <div style="font-size:13px;color:#6b7280;margin-top:2px">${symptomDisplay}</div>
        </div>
        <span style="padding:5px 12px;border-radius:20px;background:${color}20;color:${color};font-size:12px;font-weight:700;flex-shrink:0;margin-left:8px">${statusLabel}</span>
      </div>

      <!-- Info Grid -->
      <div style="background:#f9fafb;border-radius:14px;padding:14px;margin-bottom:12px">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:12px">
          <div>
            <div style="color:#9ca3af;font-weight:600">เบอร์โทร</div>
            <div style="font-weight:700;color:#0d6efd">${job.phone && job.phone !== '-' ? job.phone : '-'}</div>
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
          ${deviceDisplay ? `
          <div style="grid-column:1/-1">
            <div style="color:#9ca3af;font-weight:600">อุปกรณ์</div>
            <div style="font-weight:700;color:#111827">${deviceDisplay}</div>
          </div>
          ` : ''}
        </div>
        ${job.note ? `
          <div style="margin-top:10px;padding-top:10px;border-top:1px solid #e5e7eb">
            <div style="font-size:11px;color:#9ca3af;font-weight:600;margin-bottom:4px">บันทึกล่าสุด</div>
            <div style="font-size:12px;color:#374151;white-space:pre-wrap;max-height:60px;overflow-y:auto">${job.note.split('\n').slice(-2).join('\n')}</div>
          </div>
        ` : ''}
      </div>

      <!-- Next Status Buttons -->
      ${nextBtns}

      <!-- Action Buttons -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
        ${isTech || isAdmin ? `
          <button class="job-act-btn btn-primary-sm" style="padding:12px" onclick="openCameraForJob('${job.id}');closeModal('modal-job')">
            <i class="bi bi-camera-fill"></i> ถ่ายรูป
          </button>
        ` : ''}
        ${isTech ? `
          <button class="job-act-btn btn-success-sm" style="padding:12px" onclick="markJobDoneV2('${job.id}')">
            <i class="bi bi-check2-circle"></i> เสร็จแล้ว
          </button>
        ` : ''}
        ${isAdmin ? `
          <button class="job-act-btn" style="padding:12px;background:#eff6ff;color:#2563eb;border:none;border-radius:12px;font-size:13px;font-weight:700;cursor:pointer" onclick="closeModal('modal-job');openAssignJob('${job.id}')">
            <i class="bi bi-person-check-fill"></i> มอบหมายช่าง
          </button>
          <button class="job-act-btn" style="padding:12px;background:#f0fdf4;color:#16a34a;border:none;border-radius:12px;font-size:13px;font-weight:700;cursor:pointer" onclick="closeModal('modal-job');openBillingModal && openBillingModal('${job.id}')">
            <i class="bi bi-receipt"></i> ออกบิล
          </button>
        ` : ''}
        <button class="job-act-btn" style="padding:12px;background:#fefce8;color:#ca8a04;border:none;border-radius:12px;font-size:13px;font-weight:700;cursor:pointer" onclick="closeModal('modal-job');openQuickNote('${job.id}')">
          <i class="bi bi-chat-left-text-fill"></i> บันทึก
        </button>
        <button class="job-act-btn" style="padding:12px;background:#f5f3ff;color:#7c3aed;border:none;border-radius:12px;font-size:13px;font-weight:700;cursor:pointer" onclick="closeModal('modal-job');showJobTimeline('${job.id}')">
          <i class="bi bi-clock-history"></i> ประวัติ
        </button>
        ${job.phone && job.phone !== '-' ? `
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

// ============================================================
// EXPOSE GLOBALS
// ============================================================
window.openNewJob = openNewJob;
window.submitNewJob = submitNewJob;
window.openAssignJob = openAssignJob;
window.submitAssignJob = submitAssignJob;
window.showJobTimeline = showJobTimeline;
window.openQuickNote = openQuickNote;
window.submitQuickNote = submitQuickNote;
window.markJobDoneV2 = markJobDoneV2;
window.advanceJobStatus = advanceJobStatus;
window.showJobDetailV2 = showJobDetailV2;
