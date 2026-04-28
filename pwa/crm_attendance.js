/* ===== CRM / CUSTOMERS ===== */
let ALL_CUSTOMERS = [];
let CRM_FILTER = 'all';

function loadCRMPage() {
  if (ALL_CUSTOMERS.length > 0) { renderCRMList(ALL_CUSTOMERS); return; }
  document.getElementById('crm-list').innerHTML = '<div style="text-align:center;padding:40px;color:#9ca3af"><div class="spinner" style="margin:0 auto 12px"></div><p>กำลังโหลดข้อมูลลูกค้า...</p></div>';
  callApi({ action: 'listCustomers' }).then(res => {
    if (res && res.success) {
      ALL_CUSTOMERS = res.customers || res.data || [];
      renderCRMList(ALL_CUSTOMERS);
      loadAfterSalesSection();
    } else {
      document.getElementById('crm-list').innerHTML = '<div class="empty-state"><i class="bi bi-people"></i><p>ยังไม่มีข้อมูลลูกค้า</p><button class="btn-add-job" onclick="showAddCustomer()"><i class="bi bi-person-plus-fill"></i> เพิ่มลูกค้าใหม่</button></div>';
    }
  }).catch(() => {
    document.getElementById('crm-list').innerHTML = '<div class="empty-state"><i class="bi bi-wifi-off"></i><p>ไม่สามารถโหลดข้อมูลได้</p></div>';
  });
}

function renderCRMList(customers) {
  const container = document.getElementById('crm-list');
  if (!customers || customers.length === 0) {
    container.innerHTML = '<div class="empty-state"><i class="bi bi-people"></i><p>ยังไม่มีข้อมูลลูกค้า</p><button class="btn-add-job" onclick="showAddCustomer()"><i class="bi bi-person-plus-fill"></i> เพิ่มลูกค้าใหม่</button></div>';
    return;
  }
  let filtered = customers;
  if (CRM_FILTER === 'vip') filtered = customers.filter(c => c.type === 'vip' || c.type === 'VIP');
  else if (CRM_FILTER === 'due') filtered = customers.filter(c => c.followUpDate);
  else if (CRM_FILTER === 'new') {
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
    filtered = customers.filter(c => c.createdAt && new Date(c.createdAt) > weekAgo);
  }
  const typeLabel = { regular: 'ทั่วไป', vip: 'VIP', corporate: 'องค์กร' };
  const typeColor = { regular: '#6b7280', vip: '#f59e0b', corporate: '#3b82f6' };
  container.innerHTML = `
    <div style="padding:8px 16px;display:flex;justify-content:space-between;align-items:center">
      <span style="color:#6b7280;font-size:13px">ลูกค้าทั้งหมด ${filtered.length} ราย</span>
      <button class="btn-add-job" onclick="showAddCustomer()" style="padding:6px 14px;font-size:12px"><i class="bi bi-person-plus-fill"></i> เพิ่มลูกค้า</button>
    </div>
    ${filtered.map(c => `
    <div class="job-card" onclick="showCustomerDetail('${c.id || c.phone}')">
      <div style="display:flex;align-items:center;gap:12px">
        <div style="width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#667eea,#764ba2);display:flex;align-items:center;justify-content:center;color:white;font-weight:800;font-size:16px;flex-shrink:0">${(c.name||'?')[0]}</div>
        <div style="flex:1;min-width:0">
          <div style="font-weight:700;font-size:14px;color:#111827">${c.name || '-'}</div>
          <div style="font-size:12px;color:#6b7280">${c.phone || '-'}</div>
          ${c.lastJobDate ? `<div style="font-size:11px;color:#9ca3af">งานล่าสุด: ${c.lastJobDate}</div>` : ''}
        </div>
        <div style="text-align:right;flex-shrink:0">
          <span style="background:${typeColor[c.type]||'#6b7280'}22;color:${typeColor[c.type]||'#6b7280'};padding:3px 8px;border-radius:20px;font-size:11px;font-weight:700">${typeLabel[c.type]||'ทั่วไป'}</span>
          ${c.totalJobs ? `<div style="font-size:11px;color:#9ca3af;margin-top:4px">${c.totalJobs} งาน</div>` : ''}
        </div>
      </div>
    </div>`).join('')}
  `;
}

function filterCustomers(q) {
  if (!q) { renderCRMList(ALL_CUSTOMERS); return; }
  const lq = q.toLowerCase();
  const filtered = ALL_CUSTOMERS.filter(c =>
    (c.name||'').toLowerCase().includes(lq) ||
    (c.phone||'').includes(lq) ||
    (c.address||'').toLowerCase().includes(lq)
  );
  renderCRMList(filtered);
}

function filterCRMType(type, btn) {
  CRM_FILTER = type;
  document.querySelectorAll('#page-crm .filter-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderCRMList(ALL_CUSTOMERS);
}

function showCustomerDetail(customerId) {
  const c = ALL_CUSTOMERS.find(x => (x.id === customerId || x.phone === customerId));
  if (!c) return;
  const typeLabel = { regular: 'ทั่วไป', vip: '⭐ VIP', corporate: '🏢 องค์กร' };
  document.getElementById('modal-customer-content').innerHTML = `
    <div style="padding:0 16px 20px">
      <div style="text-align:center;padding:20px 0 16px">
        <div style="width:72px;height:72px;border-radius:50%;background:linear-gradient(135deg,#667eea,#764ba2);display:flex;align-items:center;justify-content:center;color:white;font-weight:800;font-size:28px;margin:0 auto 12px">${(c.name||'?')[0]}</div>
        <div style="font-size:20px;font-weight:800;color:#111827">${c.name||'-'}</div>
        <div style="font-size:13px;color:#6b7280">${typeLabel[c.type]||'ทั่วไป'}</div>
      </div>
      <div style="background:#f9fafb;border-radius:14px;padding:14px;margin-bottom:12px">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:12px">
          <div><div style="color:#9ca3af;font-weight:600">เบอร์โทร</div><div style="font-weight:700;color:#111827">${c.phone||'-'}</div></div>
          <div><div style="color:#9ca3af;font-weight:600">จำนวนงาน</div><div style="font-weight:700;color:#111827">${c.totalJobs||0} งาน</div></div>
          <div><div style="color:#9ca3af;font-weight:600">ยอดรวม</div><div style="font-weight:700;color:#10b981">${c.totalSpent ? '฿'+Number(c.totalSpent).toLocaleString() : '-'}</div></div>
          <div><div style="color:#9ca3af;font-weight:600">งานล่าสุด</div><div style="font-weight:700;color:#111827">${c.lastJobDate||'-'}</div></div>
        </div>
        ${c.address ? `<div style="margin-top:10px;font-size:12px"><div style="color:#9ca3af;font-weight:600">ที่อยู่</div><div style="font-weight:600;color:#374151">${c.address}</div></div>` : ''}
        ${c.notes ? `<div style="margin-top:10px;font-size:12px"><div style="color:#9ca3af;font-weight:600">หมายเหตุ</div><div style="font-weight:600;color:#374151">${c.notes}</div></div>` : ''}
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <button class="btn-action" onclick="callCustomerPhone('${c.phone}')"><i class="bi bi-telephone-fill"></i> โทร</button>
        <button class="btn-action btn-secondary" onclick="showAfterSalesModal('${c.id||c.phone}','${c.name}','')"><i class="bi bi-chat-dots-fill"></i> ติดตาม</button>
      </div>
    </div>
  `;
  document.getElementById('modal-customer').classList.remove('hidden');
}

function callCustomerPhone(phone) {
  if (phone) window.location.href = 'tel:' + phone;
}

function showAddCustomer() {
  document.getElementById('new-cust-name').value = '';
  document.getElementById('new-cust-phone').value = '';
  document.getElementById('new-cust-address').value = '';
  document.getElementById('new-cust-notes').value = '';
  document.getElementById('new-cust-type').value = 'regular';
  document.getElementById('modal-add-customer').classList.remove('hidden');
}

function saveNewCustomerFromCRM() {
  const name = document.getElementById('new-cust-name').value.trim();
  const phone = document.getElementById('new-cust-phone').value.trim();
  if (!name || !phone) { showToast('⚠️ กรุณากรอกชื่อและเบอร์โทร'); return; }
  const payload = {
    action: 'addCustomer',
    name, phone,
    address: document.getElementById('new-cust-address').value.trim(),
    notes: document.getElementById('new-cust-notes').value.trim(),
    type: document.getElementById('new-cust-type').value
  };
  showToast('⏳ กำลังบันทึก...');
  callApi({ ...payload, action: 'createCustomer' }).then(res => {
    if (res && res.success) {
      showToast('✅ เพิ่มลูกค้าสำเร็จ!');
      closeModal('modal-add-customer');
      ALL_CUSTOMERS = [];
      loadCRMPage();
    } else {
      showToast('❌ ' + (res && res.error ? res.error : 'เกิดข้อผิดพลาด'));
    }
  }).catch(() => showToast('❌ ไม่สามารถเชื่อมต่อได้'));
}

/* ===== AFTER-SALES ===== */
function loadAfterSalesSection() {
  callApi({ action: 'getAfterSalesDue' }).then(res => {
    const section = document.getElementById('crm-after-sales-section');
    const afterItems = (res && res.success) ? (res.items || res.data || []) : [];
    if (!section || afterItems.length === 0) return;
    section.innerHTML = `
      <div class="section-card">
        <div class="section-label" style="color:#ef4444">⚠️ ต้องติดตาม After-Sales (${afterItems.length} รายการ)</div>
        ${afterItems.map(a => `
        <div class="job-card" onclick="showAfterSalesModal('${a.customerId||a.customer_id||''}','${a.customerName||a.customer_name||''}','${a.jobId||a.job_id||''}')">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <div>
              <div style="font-weight:700;font-size:13px">${a.customerName||a.customer_name||'-'}</div>
              <div style="font-size:11px;color:#6b7280">งาน: ${a.jobId||a.job_id||'-'} | ${a.dueDate||a.due_date||'-'}</div>
            </div>
            <span style="background:#fee2e2;color:#ef4444;padding:3px 8px;border-radius:20px;font-size:11px;font-weight:700">ติดตาม</span>
          </div>
        </div>`).join('')}
      </div>`;
    const badge = document.getElementById('crm-badge');
    if (badge) { badge.textContent = afterItems.length; badge.style.display = 'flex'; }
  }).catch(() => {});
}

function showAfterSalesModal(customerId, customerName, jobId) {
  const content = document.getElementById('modal-aftersales-content');
  content.innerHTML = `
    <div style="margin-bottom:12px">
      <div style="font-weight:700;font-size:15px;color:#111827">${customerName||'ลูกค้า'}</div>
      ${jobId ? `<div style="font-size:12px;color:#6b7280">งาน: ${jobId}</div>` : ''}
    </div>
    <div class="form-group-custom">
      <label>ผลการติดตาม</label>
      <select id="aftersales-result" class="form-select" style="border-radius:12px;border:1.5px solid #e5e7eb;padding:10px 14px">
        <option value="satisfied">ลูกค้าพอใจ ✅</option>
        <option value="callback">ต้องโทรกลับ 📞</option>
        <option value="issue">มีปัญหา ⚠️</option>
        <option value="warranty">ขอรับประกัน 🔧</option>
      </select>
    </div>
    <div class="form-group-custom">
      <label>หมายเหตุ</label>
      <div class="input-wrap"><i class="bi bi-chat-left-text"></i><input type="text" id="aftersales-note" placeholder="รายละเอียดเพิ่มเติม"></div>
    </div>
    <button class="btn-setup" onclick="saveAfterSales('${customerId}','${jobId||''}')" style="margin-top:8px">
      <i class="bi bi-check-circle-fill"></i> บันทึกผลติดตาม
    </button>
  `;
  closeModal('modal-customer');
  document.getElementById('modal-aftersales').classList.remove('hidden');
}

function saveAfterSales(customerId, jobId) {
  const result = document.getElementById('aftersales-result').value;
  const note = document.getElementById('aftersales-note').value.trim();
  showToast('⏳ กำลังบันทึก...');
  callApi({ action: 'logAfterSalesFollowUp', record_id: jobId, note, followup_by: APP.user ? APP.user.name : '', next_action: result }).then(res => {
    if (res && res.success) {
      showToast('✅ บันทึก After-Sales สำเร็จ!');
      closeModal('modal-aftersales');
      ALL_CUSTOMERS = [];
      loadCRMPage();
    } else {
      showToast('❌ ' + (res && res.error ? res.error : 'เกิดข้อผิดพลาด'));
    }
  }).catch(() => showToast('❌ ไม่สามารถเชื่อมต่อได้'));
}

/* ===== ATTENDANCE ===== */
let CLOCK_ACTION = 'in';

function loadAttendancePage() {
  const container = document.getElementById('attendance-content');
  container.innerHTML = '<div style="text-align:center;padding:40px;color:#9ca3af"><div class="spinner" style="margin:0 auto 12px"></div><p>กำลังโหลด...</p></div>';
  // getTechHistory returns { success, tech, summary, jobs, attendance }
  callApi({ action: 'getTechHistory', tech: APP.user ? APP.user.name : '', limit: 1 }).then(res => {
    // ดึงข้อมูล attendance ล่าสุด (วันนี้) จาก attendance array
    const todayAtt = res && res.attendance && res.attendance.length > 0 ? res.attendance[0] : null;
    renderAttendancePage(todayAtt);
  }).catch(() => renderAttendancePage(null));
}

function renderAttendancePage(data) {
  const container = document.getElementById('attendance-content');
  const now = new Date();
  const timeStr = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
  const dateStr = formatDate();
  const isClockedIn = data && data.clockIn && !data.clockOut;
  const isClockedOut = data && data.clockIn && data.clockOut;

  container.innerHTML = `
    <div style="padding:16px">
      <div style="background:linear-gradient(135deg,#1e40af,#3b82f6);border-radius:20px;padding:24px;text-align:center;color:white;margin-bottom:16px">
        <div style="font-size:48px;font-weight:900;letter-spacing:2px" id="live-clock">${timeStr}</div>
        <div style="font-size:13px;opacity:0.85;margin-top:4px">${dateStr}</div>
        ${isClockedIn ? `<div style="background:rgba(255,255,255,0.2);border-radius:20px;padding:6px 16px;margin-top:12px;font-size:13px">⏱️ เช็คอินแล้ว ${data.clockIn}</div>` : ''}
        ${isClockedOut ? `<div style="background:rgba(255,255,255,0.2);border-radius:20px;padding:6px 16px;margin-top:12px;font-size:13px">✅ เสร็จงานแล้ว | ทำงาน ${data.workHours||'-'} ชม.</div>` : ''}
      </div>
      ${!isClockedOut ? `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
        <button class="btn-action" onclick="showClockModal('in')" ${isClockedIn ? 'disabled style="opacity:0.4"' : ''}>
          <i class="bi bi-box-arrow-in-right"></i> เช็คอิน
        </button>
        <button class="btn-action" onclick="showClockModal('out')" ${!isClockedIn ? 'disabled style="opacity:0.4"' : ''} style="${isClockedIn ? 'background:linear-gradient(135deg,#ef4444,#dc2626);color:white' : ''}">
          <i class="bi bi-box-arrow-right"></i> เช็คเอาท์
        </button>
      </div>` : ''}
      ${data ? `
      <div class="section-card">
        <div class="section-label">สรุปวันนี้</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div style="background:#f0fdf4;border-radius:12px;padding:12px;text-align:center">
            <div style="font-size:22px;font-weight:800;color:#16a34a">${data.clockIn||'-'}</div>
            <div style="font-size:11px;color:#6b7280">เวลาเข้า</div>
          </div>
          <div style="background:#fef2f2;border-radius:12px;padding:12px;text-align:center">
            <div style="font-size:22px;font-weight:800;color:#dc2626">${data.clockOut||'-'}</div>
            <div style="font-size:11px;color:#6b7280">เวลาออก</div>
          </div>
        </div>
        ${data.workHours ? `<div style="text-align:center;margin-top:12px;font-size:14px;color:#374151">ชั่วโมงทำงาน: <strong>${data.workHours} ชม.</strong></div>` : ''}
      </div>` : `
      <div class="empty-state"><i class="bi bi-clock"></i><p>ยังไม่มีการเช็คอินวันนี้</p></div>`}
      <div id="weekly-attendance" style="margin-top:8px"></div>
    </div>
  `;
  setInterval(() => {
    const el = document.getElementById('live-clock');
    if (el) el.textContent = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
  }, 30000);
  loadWeeklyAttendance();
}

function loadWeeklyAttendance() {
  callApi({ action: 'getAttendanceReport', tech: APP.user ? APP.user.name : '', days: 7 }).then(res => {
    const container = document.getElementById('weekly-attendance');
    if (!container || !res || !res.success) return;
    const days = res.records || res.data || [];
    const dayNames = ['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา'];
    container.innerHTML = `
      <div class="section-card">
        <div class="section-label">สัปดาห์นี้</div>
        <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px">
          ${dayNames.map((d, i) => {
            const att = days[i];
            const hasIn = att && att.clockIn;
            return `<div style="text-align:center">
              <div style="font-size:10px;color:#9ca3af;margin-bottom:4px">${d}</div>
              <div style="width:32px;height:32px;border-radius:50%;margin:0 auto;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;background:${hasIn ? '#dcfce7' : '#f3f4f6'};color:${hasIn ? '#16a34a' : '#9ca3af'}">
                ${hasIn ? '✓' : '-'}
              </div>
              ${att && att.workHours ? `<div style="font-size:9px;color:#6b7280;margin-top:2px">${att.workHours}h</div>` : ''}
            </div>`;
          }).join('')}
        </div>
      </div>`;
  }).catch(() => {});
}

function viewCustomerJobs(customerId, customerName) {
  closeModal('modal-customer');
  const jobsContainer = document.getElementById('crm-jobs-modal');
  if (!jobsContainer) {
    showToast('❌ ไม่พบ container สำหรับแสดงงาน');
    return;
  }
  jobsContainer.innerHTML = '<div style="text-align:center;padding:20px;color:#9ca3af"><div class="spinner-pc"></div><p>กำลังโหลดประวัติงาน...</p></div>';
  
  callApi({ action: 'getCustomerHistory', customer_id: customerId }).then(res => {
    if (!res || !res.success || !res.jobs || res.jobs.length === 0) {
      jobsContainer.innerHTML = '<div class="empty-state"><i class="bi bi-inbox"></i><p>ไม่มีประวัติงาน</p></div>';
      return;
    }
    const jobs = res.jobs;
    jobsContainer.innerHTML = `
      <div style="padding:16px">
        <div style="font-weight:700;font-size:16px;color:#111827;margin-bottom:12px">ประวัติงานของ ${customerName || 'ลูกค้า'}</div>
        <div style="display:flex;flex-direction:column;gap:8px">
          ${jobs.map(job => `
            <div class="job-card" onclick="showJobDetail('${job.id || job.job_id}')">
              <div style="display:flex;justify-content:space-between;align-items:center">
                <div style="font-weight:600;font-size:13px;color:#111827">${job.symptom || job.device || 'ไม่ระบุอาการ'}</div>
                <span class="status-badge" style="background:${getStatusColor(job.status)};color:#fff">${job.status || '-'}</span>
              </div>
              <div style="font-size:11px;color:#6b7280;margin-top:4px">${job.created || job.created_at || '-'} | ${job.tech || job.technician || 'ไม่ระบุช่าง'}</div>
              ${job.price ? `<div style="font-size:12px;font-weight:600;color:#10b981;margin-top:4px">฿${Number(job.price).toLocaleString()}</div>` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }).catch(() => {
    jobsContainer.innerHTML = '<div class="empty-state"><i class="bi bi-wifi-off"></i><p>ไม่สามารถโหลดข้อมูลได้</p></div>';
  });
}

function downloadCustomerReceipts(customerId) {
  showToast('⏳ กำลังเตรียมใบเสร็จ...');
  callApi({ action: 'getCustomerReceipts', customer_id: customerId }).then(res => {
    if (!res || !res.success || !res.receipts || res.receipts.length === 0) {
      showToast('❌ ไม่พบใบเสร็จสำหรับลูกค้ารายนี้');
      return;
    }
    // ดาวน์โหลดใบเสร็จแรก (หรือแสดงรายการให้เลือก)
    const receipt = res.receipts[0];
    if (receipt.url) {
      // กรณีมี URL สำหรับดาวน์โหลด
      window.open(receipt.url, '_blank');
      showToast('✅ กำลังดาวน์โหลดใบเสร็จ...');
    } else if (receipt.base64) {
      // กรณีได้ข้อมูล Base64 (PDF/รูปภาพ)
      const link = document.createElement('a');
      link.href = 'data:application/pdf;base64,' + receipt.base64;
      link.download = `receipt_${customerId}_${Date.now()}.pdf`;
      link.click();
      showToast('✅ ดาวน์โหลดใบเสร็จสำเร็จ!');
    } else {
      showToast('❌ รูปแบบใบเสร็จไม่รองรับ');
    }
  }).catch(() => showToast('❌ ไม่สามารถเชื่อมต่อเพื่อดาวน์โหลดใบเสร็จได้'));
}

function showJobDetail(jobId) {
  if (!jobId) return;
  closeModal('modal-crm-jobs');
  const detailContainer = document.getElementById('job-detail-modal-content');
  if (!detailContainer) {
    showToast('❌ ไม่พบ container สำหรับรายละเอียดงาน');
    return;
  }
  detailContainer.innerHTML = '<div style="text-align:center;padding:20px;color:#9ca3af"><div class="spinner-pc"></div><p>กำลังโหลดรายละเอียดงาน...</p></div>';
  
  callApi({ action: 'getJobDetail', job_id: jobId }).then(res => {
    if (!res || !res.success || !res.job) {
      detailContainer.innerHTML = '<div class="empty-state"><i class="bi bi-exclamation-triangle"></i><p>ไม่พบรายละเอียดงาน</p></div>';
      return;
    }
    const job = res.job;
    detailContainer.innerHTML = `
      <div style="padding:16px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
          <div style="font-weight:700;font-size:16px;color:#111827">งาน #${job.id || jobId}</div>
          <span class="status-badge" style="background:${getStatusColor(job.status)};color:#fff">${job.status || '-'}</span>
        </div>
        <div style="background:#f9fafb;border-radius:14px;padding:14px;margin-bottom:12px">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:12px">
            <div><div style="color:#9ca3af;font-weight:600">อุปกรณ์</div><div style="font-weight:700;color:#111827">${job.device || job.symptom || '-'}</div></div>
            <div><div style="color:#9ca3af;font-weight:600">ช่างเทคนิค</div><div style="font-weight:700;color:#111827">${job.tech || job.technician || '-'}</div></div>
            <div><div style="color:#9ca3af;font-weight:600">วันที่สร้าง</div><div style="font-weight:700;color:#111827">${job.created || job.created_at || '-'}</div></div>
            <div><div style="color:#9ca3af;font-weight:600">ราคา</div><div style="font-weight:700;color:#10b981">${job.price ? '฿'+Number(job.price).toLocaleString() : '-'}</div></div>
          </div>
          ${job.address ? `<div style="margin-top:10px;font-size:12px"><div style="color:#9ca3af;font-weight:600">ที่อยู่</div><div style="font-weight:600;color:#374151">${job.address}</div></div>` : ''}
          ${job.note ? `<div style="margin-top:10px;font-size:12px"><div style="color:#9ca3af;font-weight:600">หมายเหตุ</div><div style="font-weight:600;color:#374151">${job.note}</div></div>` : ''}
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <button class="btn-action" onclick="downloadCustomerReceipts('${job.customer_id || job.customerId}')" style="background:#10b981;color:#fff">
            <i class="bi bi-download"></i> ดาวน์โหลดใบเสร็จ
          </button>
          <button class="btn-action btn-secondary" onclick="showTimeline('${jobId}')">
            <i class="bi bi-clock-history"></i> ประวัติสถานะ
          </button>
        </div>
      </div>
    `;
    document.getElementById('modal-job-detail').classList.remove('hidden');
  }).catch(() => {
    detailContainer.innerHTML = '<div class="empty-state"><i class="bi bi-wifi-off"></i><p>ไม่สามารถโหลดข้อมูลได้</p></div>';
  });
}

function showTimeline(jobId) {
  // เรียกใช้ modal-timeline ที่มีอยู่แล้ว
  if (typeof loadJobTimeline === 'function') {
    loadJobTimeline(jobId);
  }
  closeModal('modal-job-detail');
  document.getElementById('modal-timeline').classList.remove('hidden');
}

function getStatusColor(status) {
  const s = (status || '').toLowerCase();
  if (/เสร็จ|completed|done/.test(s)) return '#10b981';
  if (/กำลัง|in.prog/.test(s)) return '#3b82f6';
  if (/รอชิ้น|waiting/.test(s)) return '#f59e0b';
  if (/ด่วน|urgent/.test(s)) return '#ef4444';
  return '#6b7280';
}

function showClockModal(type) {
  CLOCK_ACTION = type;
  document.getElementById('clockin-confirm-btn').innerHTML = type === 'in' ? '<i class="bi bi-clock-fill"></i> ยืนยันเช็คอิน' : '<i class="bi bi-clock-fill"></i> ยืนยันเช็คเอาท์';
  document.getElementById('clockin-note').value = '';
  document.getElementById('modal-clockin').classList.remove('hidden');
}

function confirmClockAction() {
  const note = document.getElementById('clockin-note').value.trim();
  const action = CLOCK_ACTION === 'in' ? 'clockIn' : 'clockOut';
  showToast('⏳ กำลังบันทึก...');
  callApi({ action, tech: APP.user ? APP.user.name : '', note }).then(res => {
    if (res && res.success) {
      showToast(CLOCK_ACTION === 'in' ? '✅ เช็คอินสำเร็จ!' : '✅ เช็คเอาท์สำเร็จ!');
      closeModal('modal-clockin');
      loadAttendancePage();
    } else {
      showToast('❌ ' + (res && res.error ? res.error : 'เกิดข้อผิดพลาด'));
    }
  }).catch(() => showToast('❌ ไม่สามารถเชื่อมต่อได้'));
}
