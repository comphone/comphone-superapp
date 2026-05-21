/* section_jobs.js — Jobs section extracted from dashboard_pc.html
   Functions: renderJobsSection, _buildJobsTableEnhanced, _filterJobs,
              _filterJobsByStatus, _showJobTimeline, _showJobTransition,
              _doJobTransition, _showPcCreateJob, _doPcCreateJob, _statusColor, filterSectionJobs
   Globals used: callGas, DASHBOARD_DATA, loadSection, kpiBox, sanitizeHTML */

function renderJobsSection(data) {
  const jobs = data.jobs || [];
  window.PC_JOBS_DATA = jobs;
  const statuses = (data.status_distribution || {}).statuses || [];
  const statusFilter = statuses.map(s => s.status || s.name).filter(Boolean);
  const open = jobs.filter(j => j.status !== 'เสร็จสิ้น' && j.status !== 'COMPLETED' && j.status !== 'ยกเลิก' && j.status !== 'CANCELLED');
  const completed = jobs.filter(j => j.status === 'เสร็จสิ้น' || j.status === 'COMPLETED');
  const overdue = jobs.filter(j => j.sla_status === 'OVERDUE' || j.status === 'เกินกำหนด');

  let html = `
    <!-- KPI Cards -->
    <div class="kpi-row" style="margin-bottom:16px">
      ${kpiBox('bi-clipboard2-data', '#dbeafe', '#1e40af', jobs.length, 'งานทั้งหมด', '')}
      ${kpiBox('bi-hourglass-split', '#fef3c7', '#d97706', open.length, 'งานเปิด', '')}
      ${kpiBox('bi-check-circle-fill', '#d1fae5', '#059669', completed.length, 'เสร็จแล้ว', '')}
      ${kpiBox('bi-exclamation-triangle-fill', overdue.length > 0 ? '#fee2e2' : '#f1f5f9', overdue.length > 0 ? '#dc2626' : '#6b7280', overdue.length, 'เกิน SLA', overdue.length > 0 ? '⚠️ ต้องดำเนินการ' : '', overdue.length > 0)}
    </div>

    <!-- Filter Bar -->
    <div class="card-box" style="margin-bottom:16px">
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
        <div style="flex:1;min-width:180px">
          <input type="text" id="jobs-search" placeholder="🔍 ค้นหางาน (Job ID/ลูกค้า/ช่าง)..."
            style="width:100%;padding:8px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px"
            oninput="_filterJobs()">
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:4px">
          <button class="btn-refresh" onclick="_filterJobsByStatus('')" style="font-size:11px;padding:4px 10px;background:#1e40af;color:#fff">ทั้งหมด</button>
          ${statusFilter.map(s => `<button class="btn-refresh" onclick="_filterJobsByStatus('${s}')" style="font-size:11px;padding:4px 10px">${s}</button>`).join('')}
        </div>
        <button class="btn-refresh" onclick="_showPcCreateJob()" style="background:#059669;color:#fff;border:none">
          <i class="bi bi-plus-circle"></i> เปิดงาน
        </button>
        <button class="btn-refresh" onclick="loadSection('jobs')" style="background:#f1f5f9"><i class="bi bi-arrow-clockwise"></i></button>
      </div>
    </div>

    <!-- Overdue Alert -->
    ${overdue.length > 0 ? `
    <div class="card-box" style="border-left:4px solid #dc2626;margin-bottom:16px">
      <div class="card-title"><i class="bi bi-exclamation-triangle-fill" style="color:#dc2626"></i> งานเกิน SLA: ${overdue.length} งาน</div>
      <div id="jobs-overdue-list">${_buildJobsTableEnhanced(overdue)}</div>
    </div>` : ''}

    <!-- Jobs Table -->
    <div class="card-box">
      <div class="card-title">
        <i class="bi bi-list-task" style="color:#1e40af"></i> รายการงานทั้งหมด
        <span class="badge-count" id="jobs-count">${jobs.length} งาน</span>
      </div>
      <div id="jobs-section-list">${_buildJobsTableEnhanced(jobs)}</div>
    </div>`;

  return html;
}

function _escapeJobText(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function _jobRequestId(prefix) {
  return (typeof createWriteRequestId === 'function')
    ? createWriteRequestId(prefix || 'job')
    : ((prefix || 'job') + '_' + Date.now() + '_' + Math.random().toString(16).slice(2));
}

function _jobJsArg(value) {
  return JSON.stringify(String(value == null ? '' : value)).replace(/"/g, '&quot;');
}

function _findPcJob(jobId) {
  const key = String(jobId || '');
  return ((window.PC_JOBS_DATA || (typeof DASHBOARD_DATA !== 'undefined' && DASHBOARD_DATA.jobs) || [])).find(j =>
    String(j.job_id || j.id || '') === key
  ) || { job_id: key, id: key };
}

function _pcJobModal(title, bodyHtml, width) {
  const old = document.getElementById('job-modal-overlay');
  if (old) old.remove();
  const modal = `<div id="job-modal-overlay" onclick="this.remove()" style="position:fixed;inset:0;background:rgba(15,23,42,.55);z-index:9999;display:flex;align-items:center;justify-content:center;padding:18px">
    <div onclick="event.stopPropagation()" style="background:#fff;border-radius:16px;padding:22px;max-width:${width || 620}px;width:min(100%,${width || 620}px);max-height:90vh;overflow:auto;box-shadow:0 24px 60px rgba(15,23,42,.28)">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:16px">
        <h3 style="margin:0;font-size:18px;color:#0f172a">${title}</h3>
        <button onclick="document.getElementById('job-modal-overlay').remove()" style="background:#f1f5f9;border:none;width:34px;height:34px;border-radius:10px;cursor:pointer;color:#64748b"><i class="bi bi-x-lg"></i></button>
      </div>
      ${bodyHtml}
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend', modal);
}

async function _showPcJobDetail(jobId) {
  let job = _findPcJob(jobId);
  const key = String(jobId || '');
  if ((!job || (!job.customer && !job.customer_name && !job.symptom && !job.issue)) && key && typeof callApi === 'function') {
    _pcJobModal(`<i class="bi bi-briefcase" style="color:#2563eb"></i> Job ${_escapeJobText(key)}`, '<div style="padding:16px;color:#64748b">Loading job detail...</div>');
    try {
      const detail = await callApi('getJobDetail', { job_id: key });
      if (detail && detail.success && detail.job) job = detail.job;
    } catch (_detailErr) {}
  }
  const id = _escapeJobText(job.job_id || job.id || jobId);
  const customer = _escapeJobText(job.customer || job.customer_name || '-');
  const symptom = _escapeJobText(job.symptom || job.issue || job.detail || '-');
  const status = _escapeJobText(job.status || job.status_label || '-');
  const tech = _escapeJobText(job.technician || job.tech || '-');
  const note = _escapeJobText(job.note || job.notes || '-').replace(/\n/g, '<br>');
  _pcJobModal(`<i class="bi bi-briefcase" style="color:#2563eb"></i> Job ${id}`, `
    <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-bottom:16px">
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:12px"><div style="font-size:11px;color:#64748b">Customer</div><div style="font-weight:700;color:#0f172a">${customer}</div></div>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:12px"><div style="font-size:11px;color:#64748b">Status</div><div style="font-weight:700;color:${_statusColor(status)}">${status}</div></div>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:12px"><div style="font-size:11px;color:#64748b">Technician</div><div style="font-weight:700;color:#0f172a">${tech}</div></div>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:12px"><div style="font-size:11px;color:#64748b">Created</div><div style="font-weight:700;color:#0f172a">${_escapeJobText(job.date || job.created || job.created_at || '-')}</div></div>
    </div>
    <div style="font-size:13px;color:#334155;margin-bottom:12px"><b>Issue:</b> ${symptom}</div>
    <div style="font-size:13px;color:#334155;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:12px;margin-bottom:16px"><b>Notes:</b><br>${note}</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button onclick="_showPcAssignJob('${id}')" style="background:#eff6ff;color:#2563eb;border:none;padding:9px 12px;border-radius:10px;font-weight:700;cursor:pointer"><i class="bi bi-person-check"></i> Assign</button>
      <button onclick="_showPcQuickNote('${id}')" style="background:#fefce8;color:#a16207;border:none;padding:9px 12px;border-radius:10px;font-weight:700;cursor:pointer"><i class="bi bi-pencil-square"></i> Note</button>
      <button onclick="_showJobTimeline('${id}')" style="background:#f1f5f9;color:#334155;border:none;padding:9px 12px;border-radius:10px;font-weight:700;cursor:pointer"><i class="bi bi-clock-history"></i> Timeline</button>
      <button onclick="_openPcJobVision('${id}')" style="background:#f5f3ff;color:#7c3aed;border:none;padding:9px 12px;border-radius:10px;font-weight:700;cursor:pointer"><i class="bi bi-camera"></i> Vision</button>
      <button onclick="_openPcJobBilling('${id}')" style="background:#ecfdf5;color:#047857;border:none;padding:9px 12px;border-radius:10px;font-weight:700;cursor:pointer"><i class="bi bi-receipt"></i> Billing</button>
      <button onclick="_showPcDeleteJob('${id}')" style="background:#fef2f2;color:#b91c1c;border:1px solid #fecaca;padding:9px 12px;border-radius:10px;font-weight:700;cursor:pointer"><i class="bi bi-trash3"></i> Delete</button>
    </div>
  `);
}

function _showPcDeleteJob(jobId) {
  const id = _escapeJobText(jobId);
  _pcJobModal(`<i class="bi bi-trash3" style="color:#dc2626"></i> Delete Job ${id}`, `
    <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:12px;color:#7f1d1d;font-size:13px;margin-bottom:12px">
      This will archive the job to DBJOBS_ARCHIVE first, then remove it from DBJOBS.
    </div>
    <label style="font-size:13px;font-weight:700;color:#334155">Reason
      <input id="pc-job-delete-reason" autocomplete="off" placeholder="Why is this job being deleted?" style="margin-top:6px;width:100%;padding:10px 12px;border:1px solid #e2e8f0;border-radius:10px;font-size:14px">
    </label>
    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px">
      <button onclick="document.getElementById('job-modal-overlay').remove()" style="background:#f8fafc;color:#334155;border:1px solid #e2e8f0;padding:9px 14px;border-radius:10px;font-weight:700;cursor:pointer">Cancel</button>
      <button id="pc-job-delete-btn" onclick="_doPcDeleteJob('${id}')" style="background:#dc2626;color:#fff;border:none;padding:9px 14px;border-radius:10px;font-weight:700;cursor:pointer">Archive & Delete</button>
    </div>
    <div id="pc-job-delete-result" style="margin-top:10px;font-size:12px"></div>
  `);
}

async function _doPcDeleteJob(jobId) {
  const reason = (document.getElementById('pc-job-delete-reason') || {}).value || '';
  const result = document.getElementById('pc-job-delete-result');
  const btn = document.getElementById('pc-job-delete-btn');
  if (!confirm(`Archive and delete job ${jobId}?`)) return;
  try {
    if (btn) btn.disabled = true;
    if (result) result.innerHTML = '<span style="color:#64748b">Deleting...</span>';
    const res = await callApi('deleteJob', { job_id: jobId, confirm: 'DELETE_JOB', reason: reason || 'Deleted from PC Jobs' });
    if (!res || !res.success) throw new Error((res && (res.error || res.message)) || 'Delete failed');
    if (result) result.innerHTML = '<span style="color:#059669">Archived and deleted.</span>';
    if (window.PC_JOBS_DATA) window.PC_JOBS_DATA = window.PC_JOBS_DATA.filter(j => String(j.job_id || j.id || '') !== String(jobId));
    if (typeof DASHBOARD_DATA !== 'undefined' && DASHBOARD_DATA && Array.isArray(DASHBOARD_DATA.jobs)) {
      DASHBOARD_DATA.jobs = DASHBOARD_DATA.jobs.filter(j => String(j.job_id || j.id || '') !== String(jobId));
    }
    setTimeout(() => { document.getElementById('job-modal-overlay')?.remove(); if (typeof loadSection === 'function') loadSection('jobs'); }, 700);
  } catch (e) {
    if (btn) btn.disabled = false;
    if (result) result.innerHTML = `<span style="color:#dc2626">${_escapeJobText(e.message || e)}</span>`;
  }
}

function _showPcAssignJob(jobId) {
  const job = _findPcJob(jobId);
  const id = _escapeJobText(job.job_id || job.id || jobId);
  _pcJobModal(`<i class="bi bi-person-check" style="color:#2563eb"></i> Assign ${id}`, `
    <label style="font-size:13px;font-weight:700;color:#334155">Technician
      <input id="pc-job-assign-tech" value="${_escapeJobText(job.technician || job.tech || '')}" autocomplete="off" style="margin-top:6px;width:100%;padding:10px 12px;border:1px solid #e2e8f0;border-radius:10px;font-size:14px">
    </label>
    <label style="display:block;margin-top:12px;font-size:13px;font-weight:700;color:#334155">Note
      <input id="pc-job-assign-note" autocomplete="off" style="margin-top:6px;width:100%;padding:10px 12px;border:1px solid #e2e8f0;border-radius:10px;font-size:14px" placeholder="Optional assignment note">
    </label>
    <div id="pc-job-assign-result" style="min-height:20px;margin-top:12px;font-size:13px"></div>
    <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px">
      <button onclick="document.getElementById('job-modal-overlay').remove()" style="background:#f1f5f9;color:#334155;border:none;padding:9px 16px;border-radius:10px;cursor:pointer">Cancel</button>
      <button id="pc-job-assign-btn" onclick="_doPcAssignJob('${id}')" style="background:#2563eb;color:#fff;border:none;padding:9px 16px;border-radius:10px;font-weight:700;cursor:pointer">Save</button>
    </div>
  `, 480);
  setTimeout(() => document.getElementById('pc-job-assign-tech')?.focus(), 60);
}

async function _doPcAssignJob(jobId) {
  const tech = document.getElementById('pc-job-assign-tech')?.value.trim() || '';
  const note = document.getElementById('pc-job-assign-note')?.value.trim() || '';
  const result = document.getElementById('pc-job-assign-result');
  const btn = document.getElementById('pc-job-assign-btn');
  if (!tech) { if (result) result.innerHTML = '<span style="color:#dc2626">Please enter technician.</span>'; return; }
  if (!btn || btn.dataset.submitting === '1') return;
  btn.dataset.submitting = '1'; btn.disabled = true;
  try {
    const r = await callApi('transitionJob', { job_id: jobId, new_status: 2, technician: tech, note: note || 'Assigned from PC Dashboard', changed_by: 'PC Dashboard' });
    if (!r || !r.success) throw new Error((r && (r.error || r.message)) || 'Assignment failed');
    if (result) result.innerHTML = '<span style="color:#059669">Assigned successfully.</span>';
    setTimeout(() => { document.getElementById('job-modal-overlay')?.remove(); if (typeof DASHBOARD_DATA !== 'undefined') DASHBOARD_DATA = null; if (typeof loadSection === 'function') loadSection('jobs'); }, 700);
  } catch (e) {
    if (result) result.innerHTML = `<span style="color:#dc2626">${_escapeJobText(e.message || e)}</span>`;
    btn.dataset.submitting = '0'; btn.disabled = false;
  }
}

function _showPcQuickNote(jobId) {
  const id = _escapeJobText(jobId);
  _pcJobModal(`<i class="bi bi-pencil-square" style="color:#a16207"></i> Note ${id}`, `
    <textarea id="pc-job-note-text" rows="5" style="width:100%;padding:12px;border:1px solid #e2e8f0;border-radius:12px;font-size:14px;resize:vertical" placeholder="Add field note..."></textarea>
    <div id="pc-job-note-result" style="min-height:20px;margin-top:12px;font-size:13px"></div>
    <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px">
      <button onclick="document.getElementById('job-modal-overlay').remove()" style="background:#f1f5f9;color:#334155;border:none;padding:9px 16px;border-radius:10px;cursor:pointer">Cancel</button>
      <button id="pc-job-note-btn" onclick="_doPcQuickNote('${id}')" style="background:#a16207;color:#fff;border:none;padding:9px 16px;border-radius:10px;font-weight:700;cursor:pointer">Save Note</button>
    </div>
  `, 520);
  setTimeout(() => document.getElementById('pc-job-note-text')?.focus(), 60);
}

async function _doPcQuickNote(jobId) {
  const note = document.getElementById('pc-job-note-text')?.value.trim() || '';
  const result = document.getElementById('pc-job-note-result');
  const btn = document.getElementById('pc-job-note-btn');
  if (!note) { if (result) result.innerHTML = '<span style="color:#dc2626">Please enter note.</span>'; return; }
  if (!btn || btn.dataset.submitting === '1') return;
  btn.dataset.submitting = '1'; btn.disabled = true;
  try {
    const r = await callApi('addQuickNote', { job_id: jobId, note, user: 'PC Dashboard' });
    if (!r || !r.success) throw new Error((r && (r.error || r.message)) || 'Save note failed');
    if (result) result.innerHTML = '<span style="color:#059669">Note saved.</span>';
    setTimeout(() => { document.getElementById('job-modal-overlay')?.remove(); if (typeof DASHBOARD_DATA !== 'undefined') DASHBOARD_DATA = null; if (typeof loadSection === 'function') loadSection('jobs'); }, 700);
  } catch (e) {
    if (result) result.innerHTML = `<span style="color:#dc2626">${_escapeJobText(e.message || e)}</span>`;
    btn.dataset.submitting = '0'; btn.disabled = false;
  }
}

function _openPcJobVision(jobId) {
  try { localStorage.setItem('comphone_vision_job_id', String(jobId || '')); } catch (_) {}
  document.getElementById('job-modal-overlay')?.remove();
  if (typeof loadSection === 'function') loadSection('vision');
  setTimeout(() => {
    const input = document.getElementById('vision-job-id');
    if (input) input.value = String(jobId || '');
    if (typeof loadVisionFieldContext === 'function') loadVisionFieldContext(String(jobId || ''));
  }, 500);
}

function _openPcJobBilling(jobId) {
  document.getElementById('job-modal-overlay')?.remove();
  if (typeof openBillingModal === 'function') openBillingModal(String(jobId || ''));
  else if (typeof loadSection === 'function') loadSection('billing');
}

function _showPcCreateJob() {
  const old = document.getElementById('job-modal-overlay');
  if (old) old.remove();
  const requestId = _jobRequestId('pc_job');
  const modal = `<div id="job-modal-overlay" onclick="this.remove()" style="position:fixed;inset:0;background:rgba(15,23,42,.55);z-index:9999;display:flex;align-items:center;justify-content:center;padding:18px">
    <div onclick="event.stopPropagation()" style="background:#fff;border-radius:16px;padding:22px;max-width:560px;width:min(100%,560px);max-height:90vh;overflow:auto;box-shadow:0 24px 60px rgba(15,23,42,.28)">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:16px">
        <div>
          <h3 style="margin:0;font-size:18px;color:#0f172a"><i class="bi bi-plus-circle" style="color:#059669"></i> เปิดงานบริการ</h3>
          <div style="font-size:12px;color:#64748b;margin-top:3px">สร้างงานจาก PC Dashboard พร้อม request id กันบันทึกซ้ำ</div>
        </div>
        <button onclick="document.getElementById('job-modal-overlay').remove()" style="background:#f1f5f9;border:none;width:34px;height:34px;border-radius:10px;cursor:pointer;color:#64748b"><i class="bi bi-x-lg"></i></button>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <label style="font-size:13px;font-weight:600;color:#334155">ชื่อลูกค้า *
          <input id="pc-job-customer" autocomplete="off" style="margin-top:6px;width:100%;padding:10px 12px;border:1px solid #e2e8f0;border-radius:10px;font-size:14px">
        </label>
        <label style="font-size:13px;font-weight:600;color:#334155">เบอร์โทร
          <input id="pc-job-phone" autocomplete="off" style="margin-top:6px;width:100%;padding:10px 12px;border:1px solid #e2e8f0;border-radius:10px;font-size:14px">
        </label>
        <label style="grid-column:1/-1;font-size:13px;font-weight:600;color:#334155">อาการ / ปัญหา *
          <input id="pc-job-symptom" autocomplete="off" style="margin-top:6px;width:100%;padding:10px 12px;border:1px solid #e2e8f0;border-radius:10px;font-size:14px">
        </label>
        <label style="font-size:13px;font-weight:600;color:#334155">อุปกรณ์
          <input id="pc-job-device" autocomplete="off" style="margin-top:6px;width:100%;padding:10px 12px;border:1px solid #e2e8f0;border-radius:10px;font-size:14px">
        </label>
        <label style="font-size:13px;font-weight:600;color:#334155">ประเมินราคา
          <input id="pc-job-price" type="number" min="0" step="50" style="margin-top:6px;width:100%;padding:10px 12px;border:1px solid #e2e8f0;border-radius:10px;font-size:14px">
        </label>
        <label style="grid-column:1/-1;font-size:13px;font-weight:600;color:#334155">หมายเหตุ
          <input id="pc-job-note" autocomplete="off" style="margin-top:6px;width:100%;padding:10px 12px;border:1px solid #e2e8f0;border-radius:10px;font-size:14px">
        </label>
      </div>
      <div id="pc-job-result" style="min-height:20px;margin-top:12px;font-size:13px"></div>
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px">
        <button onclick="document.getElementById('job-modal-overlay').remove()" style="background:#f1f5f9;color:#334155;border:none;padding:9px 16px;border-radius:10px;font-size:13px;cursor:pointer">ยกเลิก</button>
        <button id="pc-job-submit-btn" data-client-request-id="${requestId}" onclick="_doPcCreateJob()" style="background:#059669;color:#fff;border:none;padding:9px 16px;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer">
          <i class="bi bi-plus-circle"></i> สร้างงาน
        </button>
      </div>
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend', modal);
  setTimeout(() => document.getElementById('pc-job-customer')?.focus(), 80);
}

async function _doPcCreateJob() {
  const customer = document.getElementById('pc-job-customer')?.value.trim() || '';
  const symptom = document.getElementById('pc-job-symptom')?.value.trim() || '';
  const result = document.getElementById('pc-job-result');
  const btn = document.getElementById('pc-job-submit-btn');
  if (!customer) { if (result) result.innerHTML = '<span style="color:#dc2626">กรุณากรอกชื่อลูกค้า</span>'; return; }
  if (!symptom) { if (result) result.innerHTML = '<span style="color:#dc2626">กรุณากรอกอาการ/ปัญหา</span>'; return; }
  if (!btn || btn.dataset.submitting === '1') return;
  btn.dataset.submitting = '1';
  btn.disabled = true;
  btn.innerHTML = '<i class="bi bi-hourglass-split"></i> กำลังสร้าง...';
  if (result) result.innerHTML = '<span style="color:#64748b">กำลังบันทึกงานบริการ...</span>';
  try {
    const device = document.getElementById('pc-job-device')?.value.trim() || '';
    const res = await callApi('openJob', {
      client_request_id: btn.dataset.clientRequestId || _jobRequestId('pc_job'),
      source: 'pc_dashboard_jobs',
      customer_name: customer,
      phone: document.getElementById('pc-job-phone')?.value.trim() || '',
      symptom: symptom + (device ? ` [${device}]` : ''),
      estimated_price: Number(document.getElementById('pc-job-price')?.value || 0),
      note: document.getElementById('pc-job-note')?.value.trim() || '',
      changed_by: 'PC Dashboard',
    });
    if (res && res.success) {
      if (result) result.innerHTML = `<span style="color:#059669">สร้างงานสำเร็จ ${_escapeJobText(res.job_id || '')}</span>`;
      setTimeout(() => {
        const modal = document.getElementById('job-modal-overlay');
        if (modal) modal.remove();
        if (typeof DASHBOARD_DATA !== 'undefined') DASHBOARD_DATA = null;
        if (typeof loadSection === 'function') loadSection('jobs');
      }, 900);
      return;
    }
    throw new Error((res && (res.error || res.message)) || 'สร้างงานไม่สำเร็จ');
  } catch (err) {
    if (result) result.innerHTML = `<span style="color:#dc2626">${_escapeJobText(err.message || err)}</span>`;
    btn.dataset.submitting = '0';
    btn.disabled = false;
    btn.innerHTML = '<i class="bi bi-plus-circle"></i> สร้างงาน';
  }
}

function _buildJobsTableEnhanced(jobs) {
  if (!jobs.length) return '<p style="color:#9ca3af;font-size:13px;text-align:center;padding:20px">No jobs</p>';
  return `<div style="overflow-x:auto;max-height:500px;overflow-y:auto"><table class="job-table" style="width:100%">
    <thead><tr>
      <th style="white-space:nowrap">Job ID</th><th>Customer</th><th>Status</th><th>Tech</th><th>Date</th><th style="text-align:center">Actions</th>
    </tr></thead>
    <tbody id="jobs-tbody">${jobs.map(j => {
      const jobId = j.job_id || j.id || '';
      const safeJobId = _escapeJobText(jobId);
      const status = j.status || j.status_label || '-';
      const tech = j.technician || j.tech || '-';
      const customer = j.customer || j.customer_name || '-';
      const date = j.date || j.created || j.created_at || '-';
      const safeStatus = _escapeJobText(status);
      const isOverdue = j.sla_status === 'OVERDUE' || status === 'OVERDUE';
      return `<tr data-jobid="${_escapeJobText(String(jobId).toLowerCase())}" data-customer="${_escapeJobText(String(customer).toLowerCase())}" data-tech="${_escapeJobText(String(tech).toLowerCase())}" data-status="${safeStatus}">
        <td style="font-weight:600;font-size:13px;white-space:nowrap">
          ${isOverdue ? '<span style="color:#dc2626;margin-right:4px">!</span>' : ''}
          ${safeJobId}
        </td>
        <td style="font-size:13px">${_escapeJobText(customer)}</td>
        <td><span style="background:${_statusColor(status)};padding:2px 8px;border-radius:10px;font-size:11px;color:#fff">${safeStatus}</span></td>
        <td style="font-size:13px">${_escapeJobText(tech)}</td>
        <td style="font-size:12px;color:#6b7280;white-space:nowrap">${_escapeJobText(date)}</td>
        <td style="text-align:center">
          <div style="display:flex;gap:4px;justify-content:center;flex-wrap:wrap">
            <button onclick="_showPcJobDetail(${_jobJsArg(jobId)})" style="background:#f8fafc;color:#334155;border:1px solid #e2e8f0;padding:3px 8px;border-radius:6px;font-size:11px;cursor:pointer" title="Detail"><i class="bi bi-eye"></i></button>
            <button onclick="_showPcAssignJob(${_jobJsArg(jobId)})" style="background:#eff6ff;color:#2563eb;border:none;padding:3px 8px;border-radius:6px;font-size:11px;cursor:pointer" title="Assign"><i class="bi bi-person-check"></i></button>
            <button onclick="_showPcQuickNote(${_jobJsArg(jobId)})" style="background:#fefce8;color:#a16207;border:none;padding:3px 8px;border-radius:6px;font-size:11px;cursor:pointer" title="Note"><i class="bi bi-pencil-square"></i></button>
            <button onclick="_showJobTimeline(${_jobJsArg(jobId)})" style="background:#dbeafe;color:#1e40af;border:none;padding:3px 8px;border-radius:6px;font-size:11px;cursor:pointer" title="Timeline"><i class="bi bi-clock-history"></i></button>
            <button onclick="_showJobTransition(${_jobJsArg(jobId)},${_jobJsArg(status)})" style="background:#d1fae5;color:#059669;border:none;padding:3px 8px;border-radius:6px;font-size:11px;cursor:pointer" title="Status"><i class="bi bi-arrow-right-circle"></i></button>
            <button onclick="_openPcJobVision(${_jobJsArg(jobId)})" style="background:#f5f3ff;color:#7c3aed;border:none;padding:3px 8px;border-radius:6px;font-size:11px;cursor:pointer" title="Vision"><i class="bi bi-camera"></i></button>
            <button onclick="_openPcJobBilling(${_jobJsArg(jobId)})" style="background:#ecfdf5;color:#047857;border:none;padding:3px 8px;border-radius:6px;font-size:11px;cursor:pointer" title="Billing"><i class="bi bi-receipt"></i></button>
            <button onclick="_showPcDeleteJob(${_jobJsArg(jobId)})" style="background:#fef2f2;color:#b91c1c;border:1px solid #fecaca;padding:3px 8px;border-radius:6px;font-size:11px;cursor:pointer" title="Delete"><i class="bi bi-trash3"></i></button>
          </div>
        </td>
      </tr>`;
    }).join('')}</tbody></table></div>`;
}
function _filterJobs() {
  const search = (document.getElementById('jobs-search')||{}).value||'';
  const rows = document.querySelectorAll('#jobs-tbody tr');
  let visible = 0;
  rows.forEach(r => {
    const jid = r.dataset.jobid||'';
    const cust = r.dataset.customer||'';
    const tech = r.dataset.tech||'';
    const match = !search || jid.includes(search.toLowerCase()) || cust.includes(search.toLowerCase()) || tech.includes(search.toLowerCase());
    r.style.display = match ? '' : 'none';
    if(match) visible++;
  });
  const cnt = document.getElementById('jobs-count');
  if(cnt) cnt.textContent = visible + ' งาน';
}

window._filterJobsByStatus = function(status) {
  const jobs = (DASHBOARD_DATA || {}).jobs || [];
  const filtered = status ? jobs.filter(j => j.status === status) : jobs;
  const el = document.getElementById('jobs-section-list');
  if (el) el.innerHTML = _buildJobsTableEnhanced(filtered);
};

// === JOB TIMELINE ===
async function _showJobTimeline(jobId) {
  try {
    const d = await callApi('getJobTimeline', {job_id: jobId});
    if(!d || !d.success) { alert(d?.error || 'ไม่พบข้อมูล'); return; }
    const events = d.timeline || d.events || [];
    const m = `<div id="job-modal-overlay" onclick="this.remove()" style="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center">
      <div onclick="event.stopPropagation()" style="background:#fff;border-radius:16px;padding:24px;max-width:500px;width:90%;max-height:80vh;overflow-y:auto">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
          <h3 style="margin:0;font-size:16px"><i class="bi bi-clock-history" style="color:#1e40af"></i> Timeline: ${jobId}</h3>
          <button onclick="document.getElementById('job-modal-overlay').remove()" style="background:none;border:none;font-size:20px;cursor:pointer;color:#9ca3af">✕</button>
        </div>
        ${events.length === 0 ? '<p style="color:#9ca3af;font-size:13px;text-align:center">ยังไม่มี timeline</p>' :
          events.map(e => `<div style="display:flex;gap:12px;margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid #f1f5f9">
            <div style="width:8px;height:8px;border-radius:50%;background:#1e40af;margin-top:6px;flex-shrink:0"></div>
            <div>
              <div style="font-size:13px;font-weight:600">${e.status || e.action || '-'}</div>
              <div style="font-size:12px;color:#6b7280">${e.timestamp || e.date || ''} ${e.user || e.by ? '• ' + (e.user || e.by) : ''}</div>
              ${e.notes ? `<div style="font-size:12px;color:#9ca3af;margin-top:4px">${e.notes}</div>` : ''}
            </div>
          </div>`).join('')}
      </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', m);
  } catch(e) { alert('Error: ' + e.message); }
}

// === JOB STATUS TRANSITION ===
function _showJobTransition(jobId, currentStatus) {
  const transitions = {
    'รอดำเนินการ': ['มอบหมายแล้ว', 'ยกเลิก'],
    'มอบหมายแล้ว': ['รับงานแล้ว', 'ยกเลิก'],
    'รับงานแล้ว': ['เดินทาง', 'ยกเลิก'],
    'เดินทาง': ['ถึงหน้างาน'],
    'ถึงหน้างาน': ['เริ่มงาน'],
    'เริ่มงาน': ['รอชิ้นส่วน', 'เสร็จแล้ว'],
    'รอชิ้นส่วน': ['เริ่มงาน'],
    'PENDING': ['ASSIGNED', 'CANCELLED'],
    'ASSIGNED': ['ACCEPTED', 'CANCELLED'],
    'ACCEPTED': ['IN_PROGRESS'],
    'IN_PROGRESS': ['COMPLETED', 'WAITING_PARTS'],
    'WAITING_PARTS': ['IN_PROGRESS']
  };
  const next = transitions[currentStatus] || [];
  if(next.length === 0) { alert(`สถานะ "${currentStatus}" ไม่สามารถเปลี่ยนได้`); return; }

  const m = `<div id="job-modal-overlay" onclick="this.remove()" style="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center">
    <div onclick="event.stopPropagation()" style="background:#fff;border-radius:16px;padding:24px;max-width:400px;width:90%">
      <h3 style="margin:0 0 16px;font-size:16px"><i class="bi bi-arrow-right-circle" style="color:#059669"></i> เปลี่ยนสถานะ: ${jobId}</h3>
      <div style="font-size:13px;margin-bottom:12px">สถานะปัจจุบัน: <span style="background:${_statusColor(currentStatus)};padding:2px 8px;border-radius:10px;font-size:11px;color:#fff">${currentStatus}</span></div>
      <div style="display:flex;flex-direction:column;gap:8px">
        ${next.map(s => `<button onclick="_doJobTransition('${jobId}','${s}')" style="background:#f1f5f9;border:1px solid #e2e8f0;padding:10px 16px;border-radius:8px;font-size:13px;cursor:pointer;text-align:left;font-weight:600">
          → ${s}
        </button>`).join('')}
      </div>
      <div id="trans-result" style="display:none;margin-top:12px"></div>
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend', m);
}

async function _doJobTransition(jobId, newStatus) {
  const resEl = document.getElementById('trans-result');
  if (!confirm(`Confirm job status change for ${jobId} -> ${newStatus}?`)) return;
  try {
    resEl.style.display='block'; resEl.innerHTML='<span style="color:#6b7280;font-size:12px">กำลังเปลี่ยน...</span>';
    const r = await callApi('transitionJob', {job_id: jobId, status: newStatus, changed_by: 'PC Dashboard'});
    if(r && r.success) {
      resEl.innerHTML = `<span style="color:#059669;font-size:12px">✅ เปลี่ยนเป็น "${newStatus}" สำเร็จ</span>`;
      setTimeout(()=>{ document.getElementById('job-modal-overlay').remove(); DASHBOARD_DATA = null; loadSection('jobs'); }, 1200);
    } else {
      resEl.innerHTML = `<span style="color:#ef4444;font-size:12px">❌ ${r?.error || 'เปลี่ยนไม่สำเร็จ'}</span>`;
    }
  } catch(e) { resEl.innerHTML = `<span style="color:#ef4444;font-size:12px">❌ ${e.message}</span>`; }
}

function _statusColor(s) {
  const m = {'รอดำเนินการ':'#6b7280','PENDING':'#6b7280','กำลังดำเนินการ':'#3b82f6','IN_PROGRESS':'#3b82f6',
    'เสร็จสิ้น':'#059669','COMPLETED':'#059669','เกินกำหนด':'#dc2626','OVERDUE':'#dc2626','ยกเลิก':'#9ca3af','CANCELLED':'#9ca3af'};
  return m[s] || '#6b7280';
}

window.filterSectionJobs = function(status) {
  const jobs = (DASHBOARD_DATA || {}).jobs || [];
  const filtered = status ? jobs.filter(j => j.status === status) : jobs;
  const el = document.getElementById('jobs-section-list');
  if (el) el.innerHTML = _buildJobsTableEnhanced(filtered);
};
