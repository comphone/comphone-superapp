/* ============================================
   ATTENDANCE SECTION – COMPHONE SUPER APP
   ============================================ */

async function renderAttendanceSection(data) {
  setActiveNav('attendance');
  document.getElementById('topbar-title').innerHTML = '📅 ลงเวลาเข้างาน';

  document.getElementById('main-content').innerHTML = `
    <div id="attendance-kpis" style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:20px;">
      <div style="background:#f0f9ff;border-radius:12px;padding:16px;text-align:center">
        <div style="font-size:24px;font-weight:700;color:#3b82f6" id="att-kpi-records">-</div>
        <div style="font-size:13px;color:#6b7280;margin-top:4px">ลงเวลาวันนี้</div>
      </div>
      <div style="background:#f0f9ff;border-radius:12px;padding:16px;text-align:center">
        <div style="font-size:24px;font-weight:700;color:#059669" id="att-kpi-present">-</div>
        <div style="font-size:13px;color:#6b7280;margin-top:4px">ช่างเข้างาน</div>
      </div>
      <div style="background:#f0f9ff;border-radius:12px;padding:16px;text-align:center">
        <div style="font-size:24px;font-weight:700;color:#d97706" id="att-kpi-hours">-</div>
        <div style="font-size:13px;color:#6b7280;margin-top:4px">ชั่วโมงรวมวันนี้</div>
      </div>
      <div style="background:#f0f9ff;border-radius:12px;padding:16px;text-align:center">
        <div style="font-size:24px;font-weight:700;color:#3b82f6" id="att-kpi-jobs">-</div>
        <div style="font-size:13px;color:#6b7280;margin-top:4px">งานเสร็จวันนี้</div>
      </div>
    </div>

    <div style="display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap;align-items:center">
      <button onclick="_showClockIn()" style="background:#059669;color:#fff;border:none;padding:8px 16px;border-radius:8px;font-size:13px;cursor:pointer">⏰ เข้างาน (Clock In)</button>
      <button onclick="_showClockOut()" style="background:#ef4444;color:#fff;border:none;padding:8px 16px;border-radius:8px;font-size:13px;cursor:pointer">🏁 ออกงาน (Clock Out)</button>
      <div style="flex:1"></div>
      <input type="date" id="att-date-from" style="padding:8px 12px;border:1px solid #e5e7eb;border-radius:8px;font-size:13px" />
      <span style="color:#6b7280;font-size:13px">ถึง</span>
      <input type="date" id="att-date-to" style="padding:8px 12px;border:1px solid #e5e7eb;border-radius:8px;font-size:13px" />
      <input type="text" id="att-tech-filter" placeholder="🔍 ชื่อช่าง..." style="padding:8px 12px;border:1px solid #e5e7eb;border-radius:8px;font-size:13px;width:160px" />
      <button onclick="_listAttendance()" style="background:#3b82f6;color:#fff;border:none;padding:8px 16px;border-radius:8px;font-size:13px;cursor:pointer">ค้นหา</button>
    </div>

    <div class="card-box" style="margin-bottom:20px">
      <div class="card-title">สรุปช่างทั้งหมด</div>
      <div id="att-tech-summary" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;">กำลังโหลด...</div>
    </div>

    <div class="card-box">
      <div class="card-title">บันทึกเวลาเข้างาน</div>
      <div id="att-table-wrap">กำลังโหลด...</div>
    </div>
  `;

  // set default dates
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('att-date-from').value = today;
  document.getElementById('att-date-to').value = today;

  await _loadKPIs();
  await _loadTechSummary();
  await _listAttendance();
}

async function _loadKPIs() {
  const today = new Date().toISOString().split('T')[0];
  try {
    const res = await callGas('getAttendanceReport', { date_from: today, date_to: today });
    if (res && res.success) {
      const records = res.records || [];
      const present = records.filter(r => r.status === 'PRESENT' || r.status === 'LATE').length;
      const hours = records.reduce((s, r) => s + (parseFloat(r.hours_worked) || 0), 0);
      const jobs = records.reduce((s, r) => s + (parseInt(r.jobs_done) || 0), 0);
      const kpiEl = document.getElementById('att-kpi-records');
    if (!kpiEl) return; // section was replaced
    document.getElementById('att-kpi-records').textContent = records.length;
      document.getElementById('att-kpi-present').textContent = present;
      document.getElementById('att-kpi-hours').textContent = hours.toFixed(1) + ' ชม.';
      document.getElementById('att-kpi-jobs').textContent = jobs;
    }
  } catch(e) { if (document.getElementById('att-tbody')) console.error('KPI load error', e); }
}

async function _loadTechSummary() {
  const el = document.getElementById('att-tech-summary');
  try {
    const res = await callGas('getAllTechsSummary', {});
    if (!res || !res.success || !res.techs || res.techs.length === 0) {
      el.innerHTML = '<div style="color:#6b7280;font-size:13px">ไม่มีข้อมูลช่าง</div>';
      return;
    }
    el.innerHTML = res.techs.map(t => `
      <div onclick="_showTechHistory('${(t.name||'').replace(/'/g,"\\'")}')" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:14px;cursor:pointer;transition:box-shadow .2s" onmouseover="this.style.box-shadow='0 2px 8px rgba(0,0,0,.1)'" onmouseout="this.style.box-shadow='none'">
        <div style="font-weight:600;font-size:14px">${t.name||'-'}</div>
        <div style="font-size:12px;color:#6b7280;margin-top:4px">วันนี้: ${t.status||'ยังไม่เข้างาน'}</div>
        <div style="font-size:12px;color:#6b7280">ชม.รวม: ${t.total_hours||0} ชม.</div>
      </div>
    `).join('');
  } catch(e) { el.innerHTML = '<div style="color:#ef4444;font-size:13px">โหลดข้อมูลไม่สำเร็จ</div>'; }
}

async function _listAttendance() {
  const wrap = document.getElementById('att-table-wrap');
  wrap.innerHTML = '<div style="text-align:center;padding:20px;color:#6b7280">กำลังโหลด...</div>';

  const date_from = document.getElementById('att-date-from').value;
  const date_to = document.getElementById('att-date-to').value;
  const tech = document.getElementById('att-tech-filter').value.trim();

  const params = {};
  if (date_from) params.date_from = date_from;
  if (date_to) params.date_to = date_to;
  if (tech) params.tech = tech;

  try {
    const res = await callGas('getAttendanceReport', params);
    if (!res || !res.success || !res.records || res.records.length === 0) {
      wrap.innerHTML = '<div style="text-align:center;padding:30px;color:#6b7280">ไม่พบข้อมูล</div>';
      return;
    }
    const records = res.records;
    let html = `
      <div style="display:flex;gap:16px;margin-bottom:12px;font-size:13px;color:#6b7280">
        <span>ทั้งหมด: <b>${res.total||records.length}</b> รายการ</span>
        <span>ชั่วโมงรวม: <b>${res.total_hours||'-'}</b></span>
        <span>วันเข้างาน: <b>${res.present_days||'-'}</b></span>
      </div>
      <table class="job-table">
        <thead>
          <tr>
            <th>วันที่</th><th>ช่าง</th><th>เข้างาน</th><th>ออกงาน</th><th>ชั่วโมง</th><th>งาน</th><th>สถานะ</th><th>หมายเหตุ</th>
          </tr>
        </thead>
        <tbody>
    `;
    const badge = (s) => {
      const map = { PRESENT:'#059669', ABSENT:'#ef4444', LATE:'#d97706', HALF_DAY:'#3b82f6' };
      return `<span style="background:${map[s]||'#6b7280'}22;color:${map[s]||'#6b7280'};padding:3px 10px;border-radius:12px;font-size:12px;font-weight:500">${s||'-'}</span>`;
    };
    records.forEach(r => {
      html += `<tr>
        <td>${r.date||'-'}</td>
        <td><a href="#" onclick="event.preventDefault();_showTechHistory('${(r.tech||'').replace(/'/g,"\\'")}')" style="color:#3b82f6;text-decoration:none;font-weight:500">${r.tech||'-'}</a></td>
        <td>${r.clock_in||'-'}</td>
        <td>${r.clock_out||'-'}</td>
        <td>${r.hours_worked||'-'}</td>
        <td>${r.jobs_done||0}</td>
        <td>${badge(r.status)}</td>
        <td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.note||'-'}</td>
      </tr>`;
    });
    html += '</tbody></table>';
    wrap.innerHTML = html;
  } catch(e) {
    wrap.innerHTML = '<div style="text-align:center;padding:20px;color:#ef4444">เกิดข้อผิดพลาดในการโหลดข้อมูล</div>';
  }
}

function _showClockIn() {
  _showAttendanceModal('⏰ ลงเวลาเข้างาน (Clock In)', '_doClockIn()');
}

function _showClockOut() {
  _showAttendanceModal('🏁 ลงเวลาออกงาน (Clock Out)', '_doClockOut()');
}

function _showAttendanceModal(title, onSubmit) {
  // remove existing modal
  const old = document.getElementById('att-modal');
  if (old) old.remove();

  const modal = document.createElement('div');
  modal.id = 'att-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center';
  modal.onclick = function(e) { if (e.target === modal) modal.remove(); };

  modal.innerHTML = `
    <div style="background:#fff;border-radius:16px;padding:28px;width:420px;max-width:95vw;box-shadow:0 20px 60px rgba(0,0,0,.2)">
      <div style="font-size:18px;font-weight:700;margin-bottom:20px">${title}</div>
      <div style="margin-bottom:14px">
        <label style="display:block;font-size:13px;font-weight:500;margin-bottom:6px;color:#374151">ชื่อช่าง</label>
        <input type="text" id="att-modal-tech" placeholder="กรอกชื่อช่าง..." style="width:100%;padding:10px 14px;border:1px solid #e5e7eb;border-radius:8px;font-size:14px;box-sizing:border-box" />
      </div>
      <div style="margin-bottom:20px">
        <label style="display:block;font-size:13px;font-weight:500;margin-bottom:6px;color:#374151">หมายเหตุ</label>
        <textarea id="att-modal-note" rows="3" placeholder="บันทึกเพิ่มเติม (ไม่บังคับ)" style="width:100%;padding:10px 14px;border:1px solid #e5e7eb;border-radius:8px;font-size:14px;resize:vertical;box-sizing:border-box"></textarea>
      </div>
      <div id="att-modal-msg" style="margin-bottom:14px;font-size:13px;display:none"></div>
      <div style="display:flex;gap:10px;justify-content:flex-end">
        <button onclick="document.getElementById('att-modal').remove()" style="background:#f3f4f6;color:#374151;border:none;padding:8px 16px;border-radius:8px;font-size:13px;cursor:pointer">ยกเลิก</button>
        <button onclick="${onSubmit}" style="background:#3b82f6;color:#fff;border:none;padding:8px 16px;border-radius:8px;font-size:13px;cursor:pointer">ยืนยัน</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  document.getElementById('att-modal-tech').focus();
}

async function _doClockIn() {
  const tech_name = document.getElementById('att-modal-tech').value.trim();
  const note = document.getElementById('att-modal-note').value.trim();
  const msgEl = document.getElementById('att-modal-msg');

  if (!tech_name) {
    msgEl.style.display = 'block';
    msgEl.style.color = '#ef4444';
    msgEl.textContent = 'กรุณากรอกชื่อช่าง';
    return;
  }

  msgEl.style.display = 'block';
  msgEl.style.color = '#6b7280';
  msgEl.textContent = 'กำลังลงเวลา...';

  try {
    const res = await callGas('clockIn', { tech_name, note });
    if (res && res.success) {
      msgEl.style.color = '#059669';
      msgEl.textContent = '✅ ลงเวลาเข้างานสำเร็จ!';
      setTimeout(() => { document.getElementById('att-modal')?.remove(); _listAttendance(); _loadKPIs(); _loadTechSummary(); }, 1200);
    } else {
      msgEl.style.color = '#ef4444';
      msgEl.textContent = '❌ ' + (res?.error || 'เกิดข้อผิดพลาด');
    }
  } catch(e) {
    msgEl.style.color = '#ef4444';
    msgEl.textContent = '❌ ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์';
  }
}

async function _doClockOut() {
  const tech_name = document.getElementById('att-modal-tech').value.trim();
  const note = document.getElementById('att-modal-note').value.trim();
  const msgEl = document.getElementById('att-modal-msg');

  if (!tech_name) {
    msgEl.style.display = 'block';
    msgEl.style.color = '#ef4444';
    msgEl.textContent = 'กรุณากรอกชื่อช่าง';
    return;
  }

  msgEl.style.display = 'block';
  msgEl.style.color = '#6b7280';
  msgEl.textContent = 'กำลังลงเวลา...';

  try {
    const res = await callGas('clockOut', { tech_name, note });
    if (res && res.success) {
      msgEl.style.color = '#059669';
      msgEl.textContent = '✅ ลงเวลาออกงานสำเร็จ!';
      setTimeout(() => { document.getElementById('att-modal')?.remove(); _listAttendance(); _loadKPIs(); _loadTechSummary(); }, 1200);
    } else {
      msgEl.style.color = '#ef4444';
      msgEl.textContent = '❌ ' + (res?.error || 'เกิดข้อผิดพลาด');
    }
  } catch(e) {
    msgEl.style.color = '#ef4444';
    msgEl.textContent = '❌ ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์';
  }
}

async function _showTechHistory(techName) {
  const old = document.getElementById('att-modal');
  if (old) old.remove();

  const modal = document.createElement('div');
  modal.id = 'att-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center';
  modal.onclick = function(e) { if (e.target === modal) modal.remove(); };

  modal.innerHTML = `
    <div style="background:#fff;border-radius:16px;padding:28px;width:680px;max-width:95vw;max-height:80vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.2)">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
        <div style="font-size:18px;font-weight:700">📋 ประวัติ – ${techName}</div>
        <button onclick="document.getElementById('att-modal').remove()" style="background:#f3f4f6;color:#374151;border:none;padding:6px 12px;border-radius:8px;font-size:13px;cursor:pointer">✕ ปิด</button>
      </div>
      <div id="att-history-content" style="text-align:center;padding:20px;color:#6b7280">กำลังโหลด...</div>
    </div>
  `;
  document.body.appendChild(modal);

  try {
    const res = await callGas('getTechHistory', { tech_name: techName });
    const el = document.getElementById('att-history-content');
    if (!res || !res.success || !res.history || res.history.length === 0) {
      el.innerHTML = '<div style="color:#6b7280">ไม่มีประวัติ</div>';
      return;
    }
    const badge = (s) => {
      const map = { PRESENT:'#059669', ABSENT:'#ef4444', LATE:'#d97706', HALF_DAY:'#3b82f6' };
      return `<span style="background:${map[s]||'#6b7280'}22;color:${map[s]||'#6b7280'};padding:2px 8px;border-radius:10px;font-size:11px;font-weight:500">${s||'-'}</span>`;
    };
    let html = '<table class="job-table"><thead><tr><th>วันที่</th><th>เข้า</th><th>ออก</th><th>ชม.</th><th>งาน</th><th>สถานะ</th></tr></thead><tbody>';
    res.history.forEach(r => {
      html += `<tr><td>${r.date||'-'}</td><td>${r.clock_in||'-'}</td><td>${r.clock_out||'-'}</td><td>${r.hours_worked||'-'}</td><td>${r.jobs_done||0}</td><td>${badge(r.status)}</td></tr>`;
    });
    html += '</tbody></table>';
    el.innerHTML = html;
  } catch(e) {
    const el = document.getElementById('att-history-content');
    if (el) el.innerHTML = '<div style="color:#ef4444">เกิดข้อผิดพลาด</div>';
  }
}
