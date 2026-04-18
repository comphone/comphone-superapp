/**
 * crm_ui.js — CRM UI: Customer History Timeline + Follow-up Calendar + After-Sales Dashboard
 * COMPHONE SUPER APP V5.5 | Sprint 3
 *
 * Components:
 *   1a. Customer History Timeline
 *   1b. Follow-up Calendar View (7 วันข้างหน้า)
 *   1c. After-Sales Status Dashboard (Metric cards + overdue list)
 *
 * กฎ: ห้าม onclick inline — ใช้ addEventListener เท่านั้น
 *     ทุก API call ผ่าน callAPI() เท่านั้น
 *     modal ปิดด้วย Escape และกดนอก modal ได้
 */

'use strict';

/* ─── State ────────────────────────────────────────────────── */
const CRM_UI = {
  currentCustomer: null,
  historyFilter:   { type: 'all', from: '', to: '' },
  calendarData:    {},
  metricsData:     null
};

/* ─── Bootstrap ─────────────────────────────────────────────── */

/**
 * เรียกเมื่อเปิดหน้า CRM — โหลด metrics + calendar
 */
async function initCRMDashboard() {
  try {
    await Promise.all([
      loadCRMMetrics_(),
      loadFollowUpCalendar_()
    ]);
  } catch (e) {
    showToast('⚠️ โหลด CRM ไม่สำเร็จ: ' + e.message);
  }
}

/* ══════════════════════════════════════════════════════════════
   COMPONENT 1a — Customer History Timeline
══════════════════════════════════════════════════════════════ */

/**
 * เปิด modal แสดง Customer History Timeline
 * @param {string} customerId
 * @param {string} customerName
 */
async function openCustomerTimeline(customerId, customerName) {
  CRM_UI.currentCustomer = { id: customerId, name: customerName };
  CRM_UI.historyFilter   = { type: 'all', from: '', to: '' };

  const modal = document.getElementById('modal-crm-timeline');
  if (!modal) { buildTimelineModal_(); }

  document.getElementById('modal-crm-timeline').classList.remove('hidden');
  document.getElementById('crm-timeline-title').textContent = customerName || 'ประวัติลูกค้า';
  document.getElementById('crm-timeline-body').innerHTML = '<div class="loading-spinner-sm"></div>';

  await fetchAndRenderTimeline_();
}

/**
 * ดึงข้อมูลและ render timeline
 */
async function fetchAndRenderTimeline_() {
  try {
    const res = await callAPI('getCustomerHistoryFull', {
      customer_id:   CRM_UI.currentCustomer.id,
      customer_name: CRM_UI.currentCustomer.name
    });
    if (!res.success) throw new Error(res.error || 'โหลดข้อมูลไม่สำเร็จ');
    renderTimeline_(res.events || []);
  } catch (e) {
    document.getElementById('crm-timeline-body').innerHTML =
      `<div style="padding:24px;text-align:center;color:#ef4444">${e.message}</div>`;
  }
}

/**
 * Render timeline events
 * @param {Array} events
 */
function renderTimeline_(events) {
  const container = document.getElementById('crm-timeline-body');
  if (!events.length) {
    container.innerHTML = '<div style="padding:32px;text-align:center;color:#9ca3af">ไม่มีประวัติ</div>';
    return;
  }

  const filtered = filterTimelineEvents_(events);

  container.innerHTML = filtered.map(ev => buildTimelineItem_(ev)).join('');

  /* bind detail modal */
  container.querySelectorAll('[data-ev-idx]').forEach(el => {
    el.addEventListener('click', () => {
      const idx = parseInt(el.dataset.evIdx, 10);
      openEventDetail_(filtered[idx]);
    });
  });
}

/**
 * กรอง events ตาม filter
 */
function filterTimelineEvents_(events) {
  return events.filter(ev => {
    if (CRM_UI.historyFilter.type !== 'all' && ev.type !== CRM_UI.historyFilter.type) return false;
    if (CRM_UI.historyFilter.from && ev.date < CRM_UI.historyFilter.from) return false;
    if (CRM_UI.historyFilter.to   && ev.date > CRM_UI.historyFilter.to + 'T23:59:59') return false;
    return true;
  });
}

/**
 * สร้าง HTML ของ timeline item
 */
function buildTimelineItem_(ev, idx) {
  const typeLabel = { job: 'งานซ่อม', followup: 'ติดตาม', payment: 'ชำระเงิน', line: 'LINE' };
  const dateStr = ev.date ? new Date(ev.date).toLocaleDateString('th-TH', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  }) : '';

  let detail = '';
  if (ev.type === 'job') {
    detail = `<span class="badge-status">${ev.status || ''}</span> ${ev.detail || ''} ${ev.technician ? '· ช่าง: ' + ev.technician : ''}`;
  } else if (ev.type === 'followup') {
    detail = `ผล: ${ev.result || 'รอติดตาม'} ${ev.note ? '· ' + ev.note : ''}`;
  } else if (ev.type === 'payment') {
    detail = `฿${Number(ev.amount || 0).toLocaleString()} · ${ev.method || ''}`;
  }

  return `
    <div class="timeline-item" data-ev-idx="${idx}" style="cursor:pointer">
      <div class="timeline-icon" style="background:${ev.color || '#6b7280'}22;color:${ev.color || '#6b7280'}">
        <i class="bi ${ev.icon || 'bi-circle-fill'}"></i>
      </div>
      <div class="timeline-content">
        <div class="timeline-header">
          <span class="timeline-type">${typeLabel[ev.type] || ev.type}</span>
          <span class="timeline-date">${dateStr}</span>
        </div>
        <div class="timeline-detail">${detail}</div>
        ${ev.job_id ? `<div class="timeline-jobid">Job: ${ev.job_id}</div>` : ''}
      </div>
    </div>`;
}

/**
 * เปิด modal รายละเอียด event
 */
function openEventDetail_(ev) {
  const typeLabel = { job: 'งานซ่อม', followup: 'ติดตาม', payment: 'ชำระเงิน', line: 'LINE' };
  const dateStr = ev.date ? new Date(ev.date).toLocaleString('th-TH') : '';
  let html = `<div style="padding:16px">
    <div style="font-size:13px;color:#6b7280;margin-bottom:12px">${dateStr}</div>
    <table style="width:100%;font-size:13px;border-collapse:collapse">`;

  if (ev.type === 'job') {
    html += row_('Job ID', ev.job_id) + row_('รายละเอียด', ev.detail) +
            row_('สถานะ', ev.status) + row_('ช่าง', ev.technician) +
            row_('ยอด', ev.amount ? '฿' + Number(ev.amount).toLocaleString() : '') +
            row_('วิธีชำระ', ev.method);
  } else if (ev.type === 'followup') {
    html += row_('ผลการติดต่อ', ev.result) + row_('หมายเหตุ', ev.note) + row_('โดย', ev.by);
  }

  html += '</table></div>';

  const modal = document.getElementById('modal-crm-event-detail');
  modal.querySelector('.modal-body').innerHTML = html;
  modal.classList.remove('hidden');
}

function row_(label, val) {
  if (!val) return '';
  return `<tr><td style="color:#9ca3af;padding:4px 8px 4px 0;width:100px">${label}</td><td style="padding:4px 0;font-weight:600">${val}</td></tr>`;
}

/* ── Timeline Filter Controls ──────────────────────────────── */

function setTimelineTypeFilter_(type) {
  CRM_UI.historyFilter.type = type;
  document.querySelectorAll('#crm-timeline-filter-tabs .filter-tab').forEach(b => {
    b.classList.toggle('active', b.dataset.type === type);
  });
  fetchAndRenderTimeline_();
}

function applyTimelineDateFilter_() {
  CRM_UI.historyFilter.from = document.getElementById('crm-timeline-from').value || '';
  CRM_UI.historyFilter.to   = document.getElementById('crm-timeline-to').value   || '';
  fetchAndRenderTimeline_();
}

/* ══════════════════════════════════════════════════════════════
   COMPONENT 1b — Follow-up Calendar View
══════════════════════════════════════════════════════════════ */

/**
 * โหลดและ render ตาราง follow-up 7 วันข้างหน้า
 */
async function loadFollowUpCalendar_() {
  try {
    const from = new Date();
    const to   = new Date(from.getTime() + 7 * 24 * 60 * 60 * 1000);
    const fmt  = d => d.toISOString().split('T')[0];

    const res = await callAPI('getCRMFollowUpSchedule', {
      from_date: fmt(from),
      to_date:   fmt(to)
    });

    if (!res.success) throw new Error(res.error || 'โหลดปฏิทินไม่สำเร็จ');
    CRM_UI.calendarData = res.schedule || {};
    renderFollowUpCalendar_();
  } catch (e) {
    const el = document.getElementById('crm-followup-calendar');
    if (el) el.innerHTML = `<div style="color:#ef4444;padding:8px">${e.message}</div>`;
  }
}

/**
 * Render ตาราง 7 วัน
 */
function renderFollowUpCalendar_() {
  const container = document.getElementById('crm-followup-calendar');
  if (!container) return;

  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    days.push(d);
  }

  container.innerHTML = days.map(d => {
    const key   = d.toISOString().split('T')[0];
    const items = CRM_UI.calendarData[key] || [];
    const label = d.toLocaleDateString('th-TH', { weekday: 'short', month: 'short', day: 'numeric' });
    const isToday = key === new Date().toISOString().split('T')[0];

    return `
      <div class="calendar-day ${isToday ? 'calendar-today' : ''}">
        <div class="calendar-day-header">${label}${isToday ? ' <span class="badge-today">วันนี้</span>' : ''}</div>
        ${items.length
          ? items.map((item, idx) => `
            <div class="calendar-item ${item.result ? 'calendar-done' : ''}"
                 data-cid="${item.customer_id}"
                 data-cname="${item.customer_name}"
                 data-date="${key}"
                 data-cal-idx="${idx}">
              <i class="bi bi-person-fill"></i> ${item.customer_name}
              ${item.result ? `<span class="badge-done">✓</span>` : ''}
            </div>`).join('')
          : '<div class="calendar-empty">ไม่มีนัด</div>'
        }
        <button class="btn-add-followup" data-date="${key}">
          <i class="bi bi-plus-circle"></i> เพิ่มนัด
        </button>
      </div>`;
  }).join('');

  /* bind events */
  container.querySelectorAll('.calendar-item').forEach(el => {
    el.addEventListener('click', () => openFollowUpModal_(
      el.dataset.cid, el.dataset.cname, el.dataset.date
    ));
  });
  container.querySelectorAll('.btn-add-followup').forEach(el => {
    el.addEventListener('click', () => openScheduleFollowUpModal_(el.dataset.date));
  });
}

/**
 * เปิด modal บันทึกผลการติดต่อ
 */
function openFollowUpModal_(customerId, customerName, date) {
  const modal = document.getElementById('modal-followup-result');
  modal.querySelector('#followup-customer-name').textContent = customerName;
  modal.querySelector('#followup-customer-id').value  = customerId;
  modal.querySelector('#followup-date').value         = date;
  modal.querySelector('#followup-result').value       = '';
  modal.querySelector('#followup-note').value         = '';
  modal.querySelector('#followup-next-date').value    = '';
  modal.querySelector('#followup-next-date-row').classList.add('hidden');
  modal.classList.remove('hidden');
}

/**
 * เปิด modal นัดหมาย follow-up ใหม่
 */
function openScheduleFollowUpModal_(date) {
  const modal = document.getElementById('modal-schedule-followup');
  modal.querySelector('#schedule-followup-date').value = date || '';
  modal.querySelector('#schedule-followup-cid').value  = '';
  modal.querySelector('#schedule-followup-cname').value= '';
  modal.querySelector('#schedule-followup-note').value = '';
  modal.classList.remove('hidden');
}

/**
 * บันทึกผลการติดต่อ
 */
async function submitFollowUpResult_() {
  const modal      = document.getElementById('modal-followup-result');
  const customerId = modal.querySelector('#followup-customer-id').value;
  const result     = modal.querySelector('#followup-result').value;
  const note       = modal.querySelector('#followup-note').value;
  const nextDate   = modal.querySelector('#followup-next-date').value;

  if (!result) { showToast('⚠️ กรุณาเลือกผลการติดต่อ'); return; }

  try {
    showToast('💾 กำลังบันทึก...');
    const res = await callAPI('logFollowUpResult', {
      customer_id:   customerId,
      result,
      note,
      next_date:     nextDate,
      created_by:    APP.user?.username || 'PWA'
    });
    if (!res.success) throw new Error(res.error);
    showToast('✅ บันทึกผลการติดตามแล้ว');
    modal.classList.add('hidden');
    await loadFollowUpCalendar_();
    await loadCRMMetrics_();
  } catch (e) {
    showToast('❌ ' + e.message);
  }
}

/**
 * บันทึกนัด follow-up ใหม่
 */
async function submitScheduleFollowUp_() {
  const modal  = document.getElementById('modal-schedule-followup');
  const cid    = modal.querySelector('#schedule-followup-cid').value;
  const cname  = modal.querySelector('#schedule-followup-cname').value;
  const date   = modal.querySelector('#schedule-followup-date').value;
  const note   = modal.querySelector('#schedule-followup-note').value;

  if (!cname && !cid) { showToast('⚠️ กรุณาระบุชื่อลูกค้า'); return; }
  if (!date) { showToast('⚠️ กรุณาเลือกวันที่'); return; }

  try {
    showToast('💾 กำลังบันทึก...');
    const res = await callAPI('scheduleFollowUp', {
      customer_id:   cid,
      customer_name: cname,
      scheduled_date: date,
      note,
      created_by: APP.user?.username || 'PWA'
    });
    if (!res.success) throw new Error(res.error);
    showToast('✅ บันทึกนัดหมายแล้ว');
    modal.classList.add('hidden');
    await loadFollowUpCalendar_();
  } catch (e) {
    showToast('❌ ' + e.message);
  }
}

/* ══════════════════════════════════════════════════════════════
   COMPONENT 1c — After-Sales Status Dashboard
══════════════════════════════════════════════════════════════ */

/**
 * โหลด metrics และ render dashboard
 */
async function loadCRMMetrics_() {
  try {
    const res = await callAPI('getCRMMetrics', {});
    if (!res.success) throw new Error(res.error);
    CRM_UI.metricsData = res;
    renderCRMMetrics_(res);
  } catch (e) {
    /* silent fail — metrics ไม่ critical */
  }
}

/**
 * Render metric cards + overdue list
 */
function renderCRMMetrics_(data) {
  const container = document.getElementById('crm-after-sales-section');
  if (!container) return;

  const overdueHtml = (data.overdue_7days || []).map(c => `
    <div class="overdue-item" style="color:#ef4444">
      <i class="bi bi-exclamation-circle-fill"></i>
      <span>${c.customer_name}</span>
      <span style="font-size:11px;color:#9ca3af">ค้างตั้งแต่ ${c.scheduled_date}</span>
    </div>`).join('') || '<div style="color:#10b981;padding:8px">ไม่มีค้าง 🎉</div>';

  container.innerHTML = `
    <div class="section-label" style="margin-bottom:8px">📊 After-Sales Dashboard</div>
    <div class="metric-cards-row">
      <div class="metric-card">
        <div class="metric-num">${data.today || 0}</div>
        <div class="metric-label">ติดตามวันนี้</div>
      </div>
      <div class="metric-card metric-warn">
        <div class="metric-num">${data.overdue_yesterday || 0}</div>
        <div class="metric-label">ค้างจากเมื่อวาน</div>
      </div>
      <div class="metric-card metric-success">
        <div class="metric-num">${data.done_this_week || 0}</div>
        <div class="metric-label">เสร็จสัปดาห์นี้</div>
      </div>
    </div>
    ${(data.overdue_7days || []).length ? `
    <div class="overdue-section">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <span style="font-weight:700;font-size:13px;color:#ef4444">⚠️ ค้างเกิน 7 วัน (${data.overdue_7days.length} ราย)</span>
        <button id="btn-nudge-sales" class="btn-nudge">
          <i class="bi bi-megaphone-fill"></i> จี้ทีมขาย
        </button>
      </div>
      ${overdueHtml}
    </div>` : ''}
  `;

  const nudgeBtn = document.getElementById('btn-nudge-sales');
  if (nudgeBtn) {
    nudgeBtn.addEventListener('click', nudgeSalesTeam_);
  }
}

/**
 * ส่ง LINE ไปยัง SALES group
 */
async function nudgeSalesTeam_() {
  try {
    showToast('📢 กำลังส่งแจ้งเตือนทีมขาย...');
    const res = await callAPI('nudgeSalesTeam', { requested_by: APP.user?.username || 'PWA' });
    if (!res.success) throw new Error(res.error);
    showToast(`✅ ส่ง LINE ทีมขายแล้ว (${res.sent} ราย)`);
  } catch (e) {
    showToast('❌ ' + e.message);
  }
}

/* ══════════════════════════════════════════════════════════════
   Modal Builders
══════════════════════════════════════════════════════════════ */

/**
 * สร้าง modal-crm-timeline ถ้ายังไม่มี
 */
function buildTimelineModal_() {
  const div = document.createElement('div');
  div.id = 'modal-crm-timeline';
  div.className = 'modal-overlay hidden';
  div.innerHTML = `
    <div class="modal-box modal-lg" role="dialog" aria-modal="true">
      <div class="modal-header">
        <h6 id="crm-timeline-title">ประวัติลูกค้า</h6>
        <button class="modal-close" id="btn-close-timeline"><i class="bi bi-x-lg"></i></button>
      </div>
      <div class="modal-filter-bar" id="crm-timeline-filter-tabs">
        <button class="filter-tab active" data-type="all">ทั้งหมด</button>
        <button class="filter-tab" data-type="job">งานซ่อม</button>
        <button class="filter-tab" data-type="followup">ติดตาม</button>
        <button class="filter-tab" data-type="payment">ชำระเงิน</button>
      </div>
      <div class="modal-filter-bar" style="gap:8px">
        <input type="date" id="crm-timeline-from" placeholder="จากวันที่">
        <input type="date" id="crm-timeline-to" placeholder="ถึงวันที่">
        <button id="btn-apply-date-filter" class="btn-sm">กรอง</button>
      </div>
      <div class="modal-body" id="crm-timeline-body" style="max-height:60vh;overflow-y:auto"></div>
    </div>`;
  document.body.appendChild(div);

  /* bind events */
  div.addEventListener('click', e => {
    if (e.target === div) div.classList.add('hidden');
  });
  document.getElementById('btn-close-timeline').addEventListener('click', () => {
    div.classList.add('hidden');
  });
  document.getElementById('crm-timeline-filter-tabs').addEventListener('click', e => {
    const btn = e.target.closest('.filter-tab');
    if (btn) setTimelineTypeFilter_(btn.dataset.type);
  });
  document.getElementById('btn-apply-date-filter').addEventListener('click', applyTimelineDateFilter_);
}

/**
 * สร้าง modal-crm-event-detail
 */
function buildEventDetailModal_() {
  const div = document.createElement('div');
  div.id = 'modal-crm-event-detail';
  div.className = 'modal-overlay hidden';
  div.innerHTML = `
    <div class="modal-box" role="dialog" aria-modal="true">
      <div class="modal-header">
        <h6>รายละเอียด</h6>
        <button class="modal-close" id="btn-close-event-detail"><i class="bi bi-x-lg"></i></button>
      </div>
      <div class="modal-body"></div>
    </div>`;
  document.body.appendChild(div);
  div.addEventListener('click', e => { if (e.target === div) div.classList.add('hidden'); });
  document.getElementById('btn-close-event-detail').addEventListener('click', () => div.classList.add('hidden'));
}

/**
 * สร้าง modal-followup-result
 */
function buildFollowUpResultModal_() {
  const div = document.createElement('div');
  div.id = 'modal-followup-result';
  div.className = 'modal-overlay hidden';
  div.innerHTML = `
    <div class="modal-box" role="dialog" aria-modal="true">
      <div class="modal-header">
        <h6>บันทึกผลการติดต่อ — <span id="followup-customer-name"></span></h6>
        <button class="modal-close" id="btn-close-followup-result"><i class="bi bi-x-lg"></i></button>
      </div>
      <div class="modal-body" style="padding:16px">
        <input type="hidden" id="followup-customer-id">
        <input type="hidden" id="followup-date">
        <div class="form-group">
          <label>ผลการติดต่อ <span style="color:#ef4444">*</span></label>
          <select id="followup-result" class="form-control">
            <option value="">-- เลือก --</option>
            <option value="contacted">ติดต่อสำเร็จ</option>
            <option value="no_answer">ไม่รับสาย</option>
            <option value="reschedule">นัดใหม่</option>
          </select>
        </div>
        <div class="form-group">
          <label>หมายเหตุ</label>
          <textarea id="followup-note" class="form-control" rows="3" placeholder="บันทึกรายละเอียด..."></textarea>
        </div>
        <div class="form-group hidden" id="followup-next-date-row">
          <label>วันนัดใหม่</label>
          <input type="date" id="followup-next-date" class="form-control">
        </div>
        <button id="btn-submit-followup-result" class="btn-primary" style="width:100%">บันทึก</button>
      </div>
    </div>`;
  document.body.appendChild(div);

  div.addEventListener('click', e => { if (e.target === div) div.classList.add('hidden'); });
  document.getElementById('btn-close-followup-result').addEventListener('click', () => div.classList.add('hidden'));
  document.getElementById('btn-submit-followup-result').addEventListener('click', submitFollowUpResult_);
  document.getElementById('followup-result').addEventListener('change', function () {
    document.getElementById('followup-next-date-row').classList.toggle('hidden', this.value !== 'reschedule');
  });
}

/**
 * สร้าง modal-schedule-followup
 */
function buildScheduleFollowUpModal_() {
  const div = document.createElement('div');
  div.id = 'modal-schedule-followup';
  div.className = 'modal-overlay hidden';
  div.innerHTML = `
    <div class="modal-box" role="dialog" aria-modal="true">
      <div class="modal-header">
        <h6>เพิ่มนัดหมาย Follow-up</h6>
        <button class="modal-close" id="btn-close-schedule-followup"><i class="bi bi-x-lg"></i></button>
      </div>
      <div class="modal-body" style="padding:16px">
        <input type="hidden" id="schedule-followup-cid">
        <div class="form-group">
          <label>ชื่อลูกค้า <span style="color:#ef4444">*</span></label>
          <input type="text" id="schedule-followup-cname" class="form-control" placeholder="ชื่อลูกค้า">
        </div>
        <div class="form-group">
          <label>วันที่นัด <span style="color:#ef4444">*</span></label>
          <input type="date" id="schedule-followup-date" class="form-control">
        </div>
        <div class="form-group">
          <label>หมายเหตุ</label>
          <textarea id="schedule-followup-note" class="form-control" rows="2" placeholder="รายละเอียด..."></textarea>
        </div>
        <button id="btn-submit-schedule-followup" class="btn-primary" style="width:100%">บันทึกนัด</button>
      </div>
    </div>`;
  document.body.appendChild(div);

  div.addEventListener('click', e => { if (e.target === div) div.classList.add('hidden'); });
  document.getElementById('btn-close-schedule-followup').addEventListener('click', () => div.classList.add('hidden'));
  document.getElementById('btn-submit-schedule-followup').addEventListener('click', submitScheduleFollowUp_);
}

/* ─── Keyboard: Escape ปิด modal ─────────────────────────── */
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  ['modal-crm-timeline', 'modal-crm-event-detail', 'modal-followup-result', 'modal-schedule-followup'].forEach(id => {
    const el = document.getElementById(id);
    if (el && !el.classList.contains('hidden')) el.classList.add('hidden');
  });
});

/* ─── Init: สร้าง modals ทั้งหมดเมื่อ DOM พร้อม ─────────── */
document.addEventListener('DOMContentLoaded', () => {
  buildTimelineModal_();
  buildEventDetailModal_();
  buildFollowUpResultModal_();
  buildScheduleFollowUpModal_();

  /* เพิ่ม Follow-up Calendar container ใน page-crm ถ้ายังไม่มี */
  const crmPage = document.getElementById('page-crm');
  if (crmPage && !document.getElementById('crm-followup-calendar')) {
    const calSection = document.createElement('div');
    calSection.innerHTML = `
      <div class="section-label" style="margin:12px 16px 8px">📅 ตารางติดตาม 7 วันข้างหน้า</div>
      <div id="crm-followup-calendar" class="followup-calendar" style="overflow-x:auto;display:flex;gap:8px;padding:0 16px 8px"></div>`;
    crmPage.appendChild(calSection);
  }
});

/* ─── Hook เข้ากับ showCustomerDetail เดิม ──────────────── */
const _origShowCustomerDetail = typeof showCustomerDetail === 'function' ? showCustomerDetail : null;
function showCustomerDetailWithTimeline(customerId) {
  if (_origShowCustomerDetail) _origShowCustomerDetail(customerId);
  /* เพิ่มปุ่ม "ดูประวัติ" ใน modal-customer */
  setTimeout(() => {
    const content = document.getElementById('modal-customer-content');
    if (!content) return;
    if (content.querySelector('.btn-timeline')) return;
    const c = (typeof ALL_CUSTOMERS !== 'undefined' ? ALL_CUSTOMERS : []).find(x => x.id === customerId || x.phone === customerId);
    if (!c) return;
    const btnRow = content.querySelector('[style*="grid-template-columns"]');
    if (btnRow) {
      const btn = document.createElement('button');
      btn.className = 'btn-action btn-timeline';
      btn.innerHTML = '<i class="bi bi-clock-history"></i> ดูประวัติ';
      btn.addEventListener('click', () => openCustomerTimeline(c.id || c.phone, c.name));
      btnRow.appendChild(btn);
    }
  }, 50);
}
