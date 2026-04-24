// section_crm.js — CRM section extracted from dashboard_pc.html
// Functions: renderCRMSection, _buildCRMTable, _filterCRM, _showCustomerDetail,
//            _showAddCustomerModal, _doAddCustomer, _showEditCustomerModal,
//            _doEditCustomer, _showScheduleFollowUp, _doScheduleFollowUp

async function renderCRMSection(data) {
  // Show loading first, then fetch real customer data
  document.getElementById('main-content').innerHTML = `
    <div class="loading-state">
      <div class="spinner-pc"></div>
      <p>กำลังโหลดข้อมูลลูกค้า...</p>
    </div>`;

  try {
    const custData = await callGas('listCustomers');
    const customers = custData.customers || [];
    const statsData = await callGas('getCustomerListWithStats', {filter:'all'}).catch(()=>({customers:[]}));
    const stats = statsData.customers || [];
    const overdue = stats.filter(c => c.overdue);
    const metrics = await callGas('getCRMMetrics').catch(()=>({}));

    // Merge stats into customers
    const statsMap = {};
    stats.forEach(s => { if(s.id) statsMap[s.id] = s; if(s.name) statsMap[s.name] = s; });
    const enriched = customers.map(c => ({
      ...c,
      total_jobs: (statsMap[c.customer_id]||statsMap[c.customer_name]||{}).total_jobs || c.total_jobs || 0,
      overdue: (statsMap[c.customer_id]||statsMap[c.customer_name]||{}).overdue || false
    }));

    const totalCustomers = enriched.length;
    const vipCustomers = enriched.filter(c => (c.customer_type||'').toLowerCase() === 'vip' || Number(c.total_revenue||0) > 10000).length;
    const withPhone = enriched.filter(c => c.phone).length;

    let html = `
      <!-- KPI Cards -->
      <div class="kpi-row" style="margin-bottom:16px">
        ${kpiBox('bi-people-fill', '#dbeafe', '#1e40af', totalCustomers, 'ลูกค้าทั้งหมด', `${withPhone} มีเบอร์`)}
        ${kpiBox('bi-star-fill', '#fef3c7', '#d97706', vipCustomers, 'VIP', '')}
        ${kpiBox('bi-telephone-fill', overdue.length > 0 ? '#fee2e2' : '#d1fae5', overdue.length > 0 ? '#ef4444' : '#059669', overdue.length, 'เกิน 7 วัน', overdue.length > 0 ? '⚠️ ต้องติดตาม' : '', overdue.length > 0)}
        ${kpiBox('bi-calendar-check', '#f1f5f9', '#6b7280', metrics.today||0, 'Follow-up วันนี้', '')}
      </div>

      <!-- Action Bar -->
      <div class="card-box" style="margin-bottom:16px">
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
          <div style="flex:1;min-width:200px">
            <input type="text" id="crm-search" placeholder="🔍 ค้นหาลูกค้า (ชื่อ/เบอร์/ที่อยู่)..."
              style="width:100%;padding:8px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px"
              oninput="_filterCRM()">
          </div>
          <button class="btn-refresh" onclick="_showFollowUpSchedule()" style="background:#1e40af;color:#fff;border:none">
            <i class="bi bi-calendar3"></i> ปฏิทิน
          </button>
          <button class="btn-refresh" onclick="_showAddCustomerModal()" style="background:#059669;color:#fff;border:none">
            <i class="bi bi-person-plus"></i> เพิ่มลูกค้า
          </button>
          <button class="btn-refresh" onclick="loadSection('crm')" style="background:#f1f5f9">
            <i class="bi bi-arrow-clockwise"></i>
          </button>
        </div>
      </div>

      <!-- Overdue Follow-up Alert -->
      ${overdue.length > 0 ? `
      <div class="card-box" style="margin-bottom:16px;border-left:4px solid #ef4444">
        <div class="card-title"><i class="bi bi-bell-fill" style="color:#ef4444"></i> ลูกค้าเกินกำหนดติดตาม (${overdue.length})</div>
        <div style="display:flex;flex-wrap:wrap;gap:8px">
          ${overdue.slice(0,10).map(c => `
            <div style="background:#fee2e2;padding:8px 12px;border-radius:8px;font-size:12px;cursor:pointer"
              onclick="_showCustomerDetail('${c.id||c.customer_id||''}','${(c.name||c.customer_name||'').replace(/'/g,"\\'")}')">
              <strong>${c.name||c.customer_name||'-'}</strong>
              ${c.phone ? `<br>📞 ${c.phone}` : ''}
              ${c.last_job ? `<br>งานล่าสุด: ${c.last_job}` : ''}
            </div>
          `).join('')}
        </div>
        ${overdue.length > 10 ? `<div style="font-size:12px;color:#9ca3af;margin-top:8px">และอีก ${overdue.length-10} ราย...</div>` : ''}
      </div>` : ''}

      <!-- Customer Table -->
      <div class="card-box">
        <div class="card-title">
          <i class="bi bi-people-fill" style="color:#059669"></i> รายชื่อลูกค้าทั้งหมด
          <span class="badge-count" id="crm-count">${totalCustomers} ราย</span>
        </div>
        <div id="crm-table-wrap">${_buildCRMTable(enriched)}</div>
      </div>`;

    document.getElementById('main-content').innerHTML = html;
  } catch(e) {
    // Fallback: extract from jobs
    const jobs = data.jobs || [];
    const customers = {};
    jobs.forEach(j => {
      const name = j.customer || j.customer_name;
      if (!name) return;
      if (!customers[name]) customers[name] = { customer_name: name, total_jobs: 0, total_revenue: 0 };
      customers[name].total_jobs++;
      customers[name].total_revenue += Number(j.total || j.amount || 0);
    });
    const custList = Object.values(customers).sort((a,b) => b.total_revenue - a.total_revenue);
    document.getElementById('main-content').innerHTML = `
      <div class="card-box">
        <div class="card-title"><i class="bi bi-people-fill" style="color:#059669"></i> ลูกค้า (จากงาน)
          <span class="badge-count">${custList.length} ราย</span>
        </div>
        <p style="color:#ef4444;font-size:12px;text-align:center;padding:8px">⚠️ ${e.message}</p>
        ${custList.length === 0 ? '<p style="color:#9ca3af;font-size:13px;text-align:center;padding:20px">ไม่มีข้อมูลลูกค้า</p>' :
          `<div style="overflow-x:auto;max-height:500px;overflow-y:auto"><table class="job-table" style="width:100%">
            <thead><tr><th>ลูกค้า</th><th style="text-align:center">งาน</th><th style="text-align:right">ยอดรวม (฿)</th></tr></thead>
            <tbody>${custList.map(c => `<tr>
              <td style="font-weight:600">${c.customer_name}</td>
              <td style="text-align:center">${c.total_jobs}</td>
              <td style="text-align:right">฿${c.total_revenue.toLocaleString()}</td>
            </tr>`).join('')}</tbody></table></div>`}
      </div>`;
  }
}

function _buildCRMTable(customers) {
  if (!customers.length) return '<p style="color:#9ca3af;font-size:13px;text-align:center;padding:20px">ยังไม่มีลูกค้า</p>';
  return `<div style="overflow-x:auto;max-height:500px;overflow-y:auto">
    <table class="job-table" style="width:100%">
      <thead><tr>
        <th style="white-space:nowrap">ชื่อ</th><th>เบอร์</th><th>ประเภท</th>
        <th style="text-align:center">งาน</th><th style="text-align:right">รายได้</th><th style="text-align:center">จัดการ</th>
      </tr></thead>
      <tbody id="crm-tbody">${customers.map(c => {
        const id = c.customer_id || '';
        const name = c.customer_name || '-';
        const phone = c.phone || '-';
        const type = c.customer_type || '-';
        const jobs = c.total_jobs || 0;
        const rev = Number(c.total_revenue || 0);
        const isVip = type.toLowerCase() === 'vip' || rev > 10000;
        const isOverdue = c.overdue;
        return `<tr data-name="${name.toLowerCase()}" data-phone="${(phone||'').toLowerCase()}" data-type="${type.toLowerCase()}">
          <td style="font-weight:600;font-size:13px">
            ${isVip ? '<span style="color:#d97706;margin-right:4px">⭐</span>' : ''}
            ${isOverdue ? '<span style="color:#ef4444;margin-right:4px">⚠️</span>' : ''}
            ${name}
          </td>
          <td style="font-size:13px">${phone}</td>
          <td><span style="background:${isVip?'#fef3c7':'#f1f5f9'};padding:2px 8px;border-radius:10px;font-size:11px;color:${isVip?'#d97706':'#6b7280'}">${type}</span></td>
          <td style="text-align:center;font-size:13px">${jobs}</td>
          <td style="text-align:right;font-weight:600;font-size:13px">฿${rev.toLocaleString()}</td>
          <td style="text-align:center">
            <div style="display:flex;gap:4px;justify-content:center">
              <button onclick="_showCustomerDetail('${id}','${name.replace(/'/g,"\\'")}')" style="background:#dbeafe;color:#1e40af;border:none;padding:3px 8px;border-radius:6px;font-size:11px;cursor:pointer" title="ดูรายละเอียด">
                <i class="bi bi-eye"></i>
              </button>
              <button onclick="_showEditCustomerModal('${id}')" style="background:#fef3c7;color:#d97706;border:none;padding:3px 8px;border-radius:6px;font-size:11px;cursor:pointer" title="แก้ไข">
                <i class="bi bi-pencil"></i>
              </button>
            </div>
          </td>
        </tr>`;
      }).join('')}</tbody>
    </table>
  </div>`;
}

function _filterCRM() {
  const search = (document.getElementById('crm-search')||{}).value||'';
  const rows = document.querySelectorAll('#crm-tbody tr');
  let visible = 0;
  rows.forEach(r => {
    const name = r.dataset.name||'';
    const phone = r.dataset.phone||'';
    const match = !search || name.includes(search.toLowerCase()) || phone.includes(search.toLowerCase());
    r.style.display = match ? '' : 'none';
    if(match) visible++;
  });
  const cnt = document.getElementById('crm-count');
  if(cnt) cnt.textContent = visible + ' ราย';
}

// === CUSTOMER DETAIL ===
async function _showCustomerDetail(id, name) {
  try {
    const lookup = id ? {customer_id: id} : {customer_name: name};
    const d = await callGas('getCustomerHistoryFull', lookup);
    if(!d || !d.success) { alert(d?.error||'ไม่พบข้อมูล'); return; }
    const cust = d.customer || {};
    const events = d.events || [];

    const m = `<div id="crm-modal-overlay" onclick="this.remove()" style="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center">
      <div onclick="event.stopPropagation()" style="background:#fff;border-radius:16px;padding:24px;max-width:560px;width:90%;max-height:80vh;overflow-y:auto">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
          <h3 style="margin:0;font-size:16px"><i class="bi bi-person-fill" style="color:#059669"></i> ${cust.name || name}</h3>
          <button onclick="document.getElementById('crm-modal-overlay').remove()" style="background:none;border:none;font-size:20px;cursor:pointer;color:#9ca3af">✕</button>
        </div>
        <div style="font-size:13px;margin-bottom:16px;padding:12px;background:#f8fafc;border-radius:8px">
          <div>📞 ${cust.phone || '-'}</div>
          ${cust.id ? `<div>🆔 ${cust.id}</div>` : ''}
        </div>
        <div style="font-size:13px;font-weight:600;margin-bottom:8px"><i class="bi bi-clock-history" style="color:#6b7280"></i> ประวัติ (${events.length})</div>
        ${events.length === 0 ? '<p style="color:#9ca3af;font-size:12px;text-align:center">ยังไม่มีประวัติ</p>' :
          `<div style="max-height:300px;overflow-y:auto">
            ${events.map(e => `<div style="display:flex;gap:12px;margin-bottom:10px;padding-bottom:10px;border-bottom:1px solid #f1f5f9">
              <div style="width:28px;height:28px;border-radius:50%;background:${e.color||'#dbeafe'};display:flex;align-items:center;justify-content:center;flex-shrink:0">
                <i class="bi ${e.icon||'bi-circle'}" style="font-size:12px;color:#fff"></i>
              </div>
              <div style="flex:1">
                <div style="font-size:12px;font-weight:600">${e.type==='job'?'🔧 งาน':'📞 ติดตาม'} ${e.job_id||''}</div>
                <div style="font-size:12px;color:#6b7280">${e.detail||e.note||e.result||''}</div>
                <div style="font-size:11px;color:#9ca3af">${(e.date||'').substring(0,16)} ${e.technician||e.by||''}</div>
                ${e.amount ? `<div style="font-size:12px;font-weight:600;color:#059669">฿${Number(e.amount).toLocaleString()}</div>` : ''}
              </div>
            </div>`).join('')}
          </div>`}
        <div style="margin-top:16px;display:flex;gap:8px;justify-content:flex-end">
          <button onclick="_showScheduleFollowUp('${cust.id||''}','${(cust.name||name).replace(/'/g,"\\'")}')" style="background:#059669;color:#fff;border:none;padding:8px 16px;border-radius:8px;font-size:12px;cursor:pointer">
            <i class="bi bi-telephone"></i> นัดติดตาม
          </button>
          <button onclick="_showEditCustomerModal('${cust.id||''}')" style="background:#d97706;color:#fff;border:none;padding:8px 16px;border-radius:8px;font-size:12px;cursor:pointer">
            <i class="bi bi-pencil"></i> แก้ไข
          </button>
        </div>
      </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', m);
  } catch(e) { alert('Error: ' + e.message); }
}

// === ADD CUSTOMER ===
function _showAddCustomerModal() {
  const m = `<div id="crm-modal-overlay" onclick="this.remove()" style="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center">
    <div onclick="event.stopPropagation()" style="background:#fff;border-radius:16px;padding:24px;max-width:480px;width:90%;max-height:80vh;overflow-y:auto">
      <h3 style="margin:0 0 16px;font-size:16px"><i class="bi bi-person-plus" style="color:#059669"></i> เพิ่มลูกค้าใหม่</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div style="grid-column:1/3">
          <label style="font-size:12px;color:#6b7280">ชื่อลูกค้า *</label>
          <input type="text" id="crm-add-name" placeholder="ชื่อ-นามสกุล" style="width:100%;padding:8px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px">
        </div>
        <div>
          <label style="font-size:12px;color:#6b7280">เบอร์โทร</label>
          <input type="tel" id="crm-add-phone" placeholder="0xx-xxx-xxxx" style="width:100%;padding:8px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px">
        </div>
        <div>
          <label style="font-size:12px;color:#6b7280">ประเภท</label>
          <select id="crm-add-type" style="width:100%;padding:8px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px">
            <option value="Standard">Standard</option>
            <option value="VIP">VIP</option>
            <option value="Corporate">Corporate</option>
          </select>
        </div>
        <div style="grid-column:1/3">
          <label style="font-size:12px;color:#6b7280">ที่อยู่</label>
          <input type="text" id="crm-add-address" placeholder="ที่อยู่" style="width:100%;padding:8px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px">
        </div>
        <div style="grid-column:1/3">
          <label style="font-size:12px;color:#6b7280">หมายเหตุ</label>
          <input type="text" id="crm-add-notes" placeholder="บันทึกเพิ่มเติม" style="width:100%;padding:8px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px">
        </div>
      </div>
      <div id="crm-add-result" style="display:none;margin-top:12px"></div>
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px">
        <button onclick="document.getElementById('crm-modal-overlay').remove()" style="background:#f1f5f9;border:none;padding:8px 16px;border-radius:8px;font-size:13px;cursor:pointer">ยกเลิก</button>
        <button onclick="_doAddCustomer()" style="background:#059669;color:#fff;border:none;padding:8px 16px;border-radius:8px;font-size:13px;cursor:pointer;font-weight:600">
          <i class="bi bi-check-lg"></i> เพิ่มลูกค้า
        </button>
      </div>
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend', m);
}

async function _doAddCustomer() {
  const name = document.getElementById('crm-add-name').value.trim();
  if(!name) { document.getElementById('crm-add-result').style.display='block'; document.getElementById('crm-add-result').innerHTML='<span style="color:#ef4444;font-size:12px">กรอกชื่อลูกค้า</span>'; return; }
  const resEl = document.getElementById('crm-add-result');
  try {
    resEl.style.display='block'; resEl.innerHTML='<span style="color:#6b7280;font-size:12px">กำลังเพิ่ม...</span>';
    const r = await callGas('createCustomer', {
      customer_name: name,
      phone: document.getElementById('crm-add-phone').value,
      customer_type: document.getElementById('crm-add-type').value,
      address: document.getElementById('crm-add-address').value,
      notes: document.getElementById('crm-add-notes').value
    });
    if(r && r.success) {
      resEl.innerHTML = `<span style="color:#059669;font-size:12px">✅ เพิ่มสำเร็จ: ${r.customer_id} — ${name}</span>`;
      setTimeout(()=>{ document.getElementById('crm-modal-overlay').remove(); loadSection('crm'); }, 1200);
    } else {
      resEl.innerHTML = `<span style="color:#ef4444;font-size:12px">❌ ${r?.error||'เพิ่มไม่สำเร็จ'}</span>`;
    }
  } catch(e) { resEl.innerHTML = `<span style="color:#ef4444;font-size:12px">❌ ${e.message}</span>`; }
}

// === EDIT CUSTOMER ===
async function _showEditCustomerModal(id) {
  try {
    const d = await callGas('getCustomer', {customer_id: id});
    if(!d || !d.success) { alert(d?.error||'ไม่พบลูกค้า'); return; }
    const c = d.customer;
    const m = `<div id="crm-modal-overlay" onclick="this.remove()" style="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center">
      <div onclick="event.stopPropagation()" style="background:#fff;border-radius:16px;padding:24px;max-width:480px;width:90%;max-height:80vh;overflow-y:auto">
        <h3 style="margin:0 0 16px;font-size:16px"><i class="bi bi-pencil" style="color:#d97706"></i> แก้ไข: ${c.customer_name}</h3>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div style="grid-column:1/3">
            <label style="font-size:12px;color:#6b7280">ชื่อลูกค้า</label>
            <input type="text" id="crm-ed-name" value="${(c.customer_name||'').replace(/"/g,'&quot;')}" style="width:100%;padding:8px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px">
          </div>
          <div>
            <label style="font-size:12px;color:#6b7280">เบอร์โทร</label>
            <input type="tel" id="crm-ed-phone" value="${(c.phone||'').replace(/"/g,'&quot;')}" style="width:100%;padding:8px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px">
          </div>
          <div>
            <label style="font-size:12px;color:#6b7280">ประเภท</label>
            <select id="crm-ed-type" style="width:100%;padding:8px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px">
              <option value="Standard" ${c.customer_type==='Standard'?'selected':''}>Standard</option>
              <option value="VIP" ${c.customer_type==='VIP'?'selected':''}>VIP</option>
              <option value="Corporate" ${c.customer_type==='Corporate'?'selected':''}>Corporate</option>
            </select>
          </div>
          <div style="grid-column:1/3">
            <label style="font-size:12px;color:#6b7280">ที่อยู่</label>
            <input type="text" id="crm-ed-address" value="${(c.address||'').replace(/"/g,'&quot;')}" style="width:100%;padding:8px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px">
          </div>
          <div style="grid-column:1/3">
            <label style="font-size:12px;color:#6b7280">หมายเหตุ</label>
            <input type="text" id="crm-ed-notes" value="${(c.notes||'').replace(/"/g,'&quot;')}" style="width:100%;padding:8px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px">
          </div>
        </div>
        <div id="crm-ed-result" style="display:none;margin-top:12px"></div>
        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px">
          <button onclick="document.getElementById('crm-modal-overlay').remove()" style="background:#f1f5f9;border:none;padding:8px 16px;border-radius:8px;font-size:13px;cursor:pointer">ยกเลิก</button>
          <button onclick="_doEditCustomer('${id}')" style="background:#d97706;color:#fff;border:none;padding:8px 16px;border-radius:8px;font-size:13px;cursor:pointer;font-weight:600">
            <i class="bi bi-check-lg"></i> บันทึก
          </button>
        </div>
      </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', m);
  } catch(e) { alert('Error: ' + e.message); }
}

async function _doEditCustomer(id) {
  const resEl = document.getElementById('crm-ed-result');
  try {
    resEl.style.display='block'; resEl.innerHTML='<span style="color:#6b7280;font-size:12px">กำลังบันทึก...</span>';
    const r = await callGas('updateCustomer', {
      customer_id: id,
      customer_name: document.getElementById('crm-ed-name').value,
      phone: document.getElementById('crm-ed-phone').value,
      customer_type: document.getElementById('crm-ed-type').value,
      address: document.getElementById('crm-ed-address').value,
      notes: document.getElementById('crm-ed-notes').value
    });
    if(r && r.success) {
      resEl.innerHTML = '<span style="color:#059669;font-size:12px">✅ บันทึกสำเร็จ</span>';
      setTimeout(()=>{ document.getElementById('crm-modal-overlay').remove(); loadSection('crm'); }, 1000);
    } else {
      resEl.innerHTML = `<span style="color:#ef4444;font-size:12px">❌ ${r?.error||'บันทึกไม่สำเร็จ'}</span>`;
    }
  } catch(e) { resEl.innerHTML = `<span style="color:#ef4444;font-size:12px">❌ ${e.message}</span>`; }
}

// === SCHEDULE FOLLOW-UP ===
function _showScheduleFollowUp(id, name) {
  const m = `<div id="crm-followup-overlay" onclick="this.remove()" style="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:10000;display:flex;align-items:center;justify-content:center">
    <div onclick="event.stopPropagation()" style="background:#fff;border-radius:16px;padding:24px;max-width:400px;width:90%">
      <h3 style="margin:0 0 16px;font-size:16px"><i class="bi bi-telephone" style="color:#059669"></i> นัดติดตาม: ${name}</h3>
      <div style="margin-bottom:12px">
        <label style="font-size:12px;color:#6b7280">วันที่นัด</label>
        <input type="date" id="fu-date" value="${new Date().toISOString().split('T')[0]}" style="width:100%;padding:8px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px">
      </div>
      <div style="margin-bottom:12px">
        <label style="font-size:12px;color:#6b7280">บันทึก</label>
        <input type="text" id="fu-note" placeholder="เหตุผลการติดตาม" style="width:100%;padding:8px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px">
      </div>
      <div id="fu-result" style="display:none;margin-bottom:12px"></div>
      <div style="display:flex;gap:8px;justify-content:flex-end">
        <button onclick="document.getElementById('crm-followup-overlay').remove()" style="background:#f1f5f9;border:none;padding:8px 16px;border-radius:8px;font-size:13px;cursor:pointer">ยกเลิก</button>
        <button onclick="_doScheduleFollowUp('${id}','${name.replace(/'/g,"\\'")}')" style="background:#059669;color:#fff;border:none;padding:8px 16px;border-radius:8px;font-size:13px;cursor:pointer;font-weight:600">
          <i class="bi bi-check-lg"></i> นัดติดตาม
        </button>
      </div>
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend', m);
}

async function _doScheduleFollowUp(id, name) {
  const resEl = document.getElementById('fu-result');
  try {
    resEl.style.display='block'; resEl.innerHTML='<span style="color:#6b7280;font-size:12px">กำลังบันทึก...</span>';
    const r = await callGas('getCRMFollowUpSchedule', {
      customer_id: id, customer_name: name,
      scheduled_date: document.getElementById('fu-date').value,
      note: document.getElementById('fu-note').value,
      created_by: 'PC Dashboard'
    });
    if(r && r.success) {
      resEl.innerHTML = `<span style="color:#059669;font-size:12px">✅ นัดติดตามสำเร็จ: ${r.followup_id||''}</span>`;
      setTimeout(()=>{ document.getElementById('crm-followup-overlay').remove(); }, 1200);
    } else {
      resEl.innerHTML = `<span style="color:#ef4444;font-size:12px">❌ ${r?.error||'นัดไม่สำเร็จ'}</span>`;
    }
  } catch(e) { resEl.innerHTML = `<span style="color:#ef4444;font-size:12px">❌ ${e.message}</span>`; }
}
