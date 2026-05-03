/* section_jobs.js — Jobs section extracted from dashboard_pc.html
   Functions: renderJobsSection, _buildJobsTableEnhanced, _filterJobs,
              _filterJobsByStatus, _showJobTimeline, _showJobTransition,
              _doJobTransition, _statusColor, filterSectionJobs
   Globals used: callGas, DASHBOARD_DATA, loadSection, kpiBox, sanitizeHTML */

function renderJobsSection(data) {
  const jobs = data.jobs || [];
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

  document.getElementById('main-content').innerHTML = html;
}

function _buildJobsTableEnhanced(jobs) {
  if (!jobs.length) return '<p style="color:#9ca3af;font-size:13px;text-align:center;padding:20px">ไม่มีงาน</p>';
  return `<div style="overflow-x:auto;max-height:500px;overflow-y:auto"><table class="job-table" style="width:100%">
    <thead><tr>
      <th style="white-space:nowrap">Job ID</th><th>ลูกค้า</th><th>สถานะ</th><th>ช่าง</th><th>วันที่</th><th style="text-align:center">จัดการ</th>
    </tr></thead>
    <tbody id="jobs-tbody">${jobs.map(j => {
      const jobId = j.job_id || j.id || '';
      const status = j.status || '-';
      const tech = j.technician || '-';
      const customer = j.customer || j.customer_name || '-';
      const date = j.date || j.created || '-';
      const isOverdue = j.sla_status === 'OVERDUE' || status === 'เกินกำหนด';
      return `<tr data-jobid="${jobId.toLowerCase()}" data-customer="${customer.toLowerCase()}" data-tech="${tech.toLowerCase()}" data-status="${status}">
        <td style="font-weight:600;font-size:13px;white-space:nowrap">
          ${isOverdue ? '<span style="color:#dc2626;margin-right:4px">⚠️</span>' : ''}
          ${jobId}
        </td>
        <td style="font-size:13px">${customer}</td>
        <td><span style="background:${_statusColor(status)};padding:2px 8px;border-radius:10px;font-size:11px;color:#fff">${status}</span></td>
        <td style="font-size:13px">${tech}</td>
        <td style="font-size:12px;color:#6b7280;white-space:nowrap">${date}</td>
        <td style="text-align:center">
          <div style="display:flex;gap:4px;justify-content:center;flex-wrap:wrap">
            <button onclick="_showJobTimeline('${jobId}')" style="background:#dbeafe;color:#1e40af;border:none;padding:3px 8px;border-radius:6px;font-size:11px;cursor:pointer" title="ดู Timeline">
              <i class="bi bi-clock-history"></i>
            </button>
            <button onclick="_showJobTransition('${jobId}','${status}')" style="background:#d1fae5;color:#059669;border:none;padding:3px 8px;border-radius:6px;font-size:11px;cursor:pointer" title="เปลี่ยนสถานะ">
              <i class="bi bi-arrow-right-circle"></i>
            </button>
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
  if (el) el.innerHTML = _buildJobsTable(filtered);
};
