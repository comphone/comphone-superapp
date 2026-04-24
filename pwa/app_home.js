// ===== HOME RENDER =====
function renderHome() {
  const roleConf = ROLES[APP.role] || ROLES.tech;

  // Quick Actions
  const qaGrid = document.getElementById('quick-actions-grid');
  qaGrid.className = roleConf.quickActions.length > 4 ? 'qa-grid-8' : 'qa-grid-4';
  qaGrid.innerHTML = roleConf.quickActions.map(qa => `
    <button class="qa-btn-item" style="background:${qa.color};color:${qa.textColor};" onclick="${qa.action}()">
      <i class="bi ${qa.icon}"></i>
      ${qa.label}
    </button>
  `).join('');

  // Stats
  renderStats();

  // Main content
  renderMainContent();
}

function renderStats() {
  const row = document.getElementById('stats-row');
  const role = APP.role;
  const d = APP.dashboardData;
  const summary = d && d.summary ? d.summary : {};
  const revenue = summary.revenue || {};
  const totalJobs = Number(summary.totalJobs || APP.jobs.length || 0);
  const overdueJobs = Number(summary.overdueJobs || 0);
  const doneJobs = APP.jobs.filter(j => j.status === 'done').length;
  const pendingJobs = APP.jobs.filter(j => j.status !== 'done' && j.status !== 'cancel').length;
  const myJobs = APP.jobs.filter(j => j.tech && APP.user && j.tech.includes(APP.user.name.split(' ')[0])).length;
  const topTech = summary.topTechnician;

  const statsMap = {
    tech: [
      { label: 'งานของฉัน', value: myJobs || pendingJobs, sub: 'งานทั้งหมด', trend: '', color: '#0d6efd' },
      { label: 'งานรอดำเนินการ', value: pendingJobs, sub: 'ยังไม่เสร็จ', trend: pendingJobs > 5 ? 'down' : '', color: '#f59e0b' }
    ],
    admin: [
      { label: 'งานทั้งหมด', value: totalJobs, sub: 'ในระบบ', trend: '', color: '#7c3aed' },
      { label: 'รอดำเนินการ', value: pendingJobs, sub: overdueJobs > 0 ? `เกิน SLA ${overdueJobs} งาน` : 'ปกติ', trend: overdueJobs > 0 ? 'down' : '', color: '#ef4444' },
      { label: 'เสร็จแล้ว', value: doneJobs, sub: 'งาน', trend: doneJobs > 0 ? 'up' : '', color: '#10b981' },
      { label: 'เกิน SLA', value: overdueJobs, sub: 'ต้องดำเนินการ', trend: overdueJobs > 0 ? 'down' : '', color: '#f97316' }
    ],
    acct: [
      { label: 'รายรับวันนี้', value: '฿' + Number(revenue.today || 0).toLocaleString(), sub: 'บาท', trend: revenue.today > 0 ? 'up' : '', color: '#10b981' },
      { label: 'รายรับเดือนนี้', value: '฿' + Number(revenue.month || 0).toLocaleString(), sub: 'บาท', trend: '', color: '#0891b2' },
      { label: 'งานทั้งหมด', value: totalJobs, sub: 'ในระบบ', trend: '', color: '#7c3aed' },
      { label: 'เสร็จแล้ว', value: doneJobs, sub: 'งาน', trend: '', color: '#f59e0b' }
    ],
    exec: [
      { label: 'รายรับวันนี้', value: '฿' + Number(revenue.today || 0).toLocaleString(), sub: 'เดือน: ฿' + Number(revenue.month || 0).toLocaleString(), trend: revenue.today > 0 ? 'up' : '', color: '#d97706' },
      { label: 'งานค้าง', value: pendingJobs, sub: overdueJobs > 0 ? `เกิน SLA ${overdueJobs} งาน` : 'ปกติ', trend: overdueJobs > 0 ? 'down' : '', color: '#ef4444' },
      { label: 'งานเสร็จ', value: doneJobs, sub: `จาก ${totalJobs} งาน`, trend: doneJobs > 0 ? 'up' : '', color: '#0d6efd' },
      { label: 'ช่างยอดเยี่ยม', value: topTech ? topTech.name.split(' ')[0] : '-', sub: topTech ? `${topTech.jobs_completed || 0} งาน` : '', trend: '', color: '#7c3aed' }
    ]
  };

  const stats = statsMap[role] || statsMap.tech;
  row.innerHTML = stats.map(s => `
    <div class="stat-card" style="border-top-color:${s.color}">
      <div class="stat-label">${s.label}</div>
      <div class="stat-value" style="color:${s.color}">${s.value}</div>
      ${s.trend === 'up' ? `<div class="stat-trend up"><i class="bi bi-arrow-up-short"></i>${s.sub}</div>` :
        s.trend === 'down' ? `<div class="stat-trend down"><i class="bi bi-arrow-down-short"></i>${s.sub}</div>` :
        `<div class="stat-sub">${s.sub}</div>`}
    </div>
  `).join('');
}

function renderMainContent() {
  const area = document.getElementById('main-content-area');
  const role = APP.role;

  if (role === 'tech') {
    area.innerHTML = renderTechHome();
  } else if (role === 'admin') {
    area.innerHTML = renderAdminHome();
  } else if (role === 'acct') {
    area.innerHTML = renderAcctHome();
  } else if (role === 'exec') {
    area.innerHTML = renderExecHome();
  }
}

function renderTechHome() {
  const myName = APP.user ? APP.user.name.split(' ')[0] : '';
  const myJobs = APP.jobs.filter(j => !myName || (j.tech && j.tech.includes(myName)) || j.status !== 'done');
  const d = APP.dashboardData;
  const topTech = d && d.summary && d.summary.topTechnician;
  return `
    <div class="checkin-banner" style="background:linear-gradient(135deg,#0d6efd,#0a58ca)">
      <div class="checkin-icon-wrap"><i class="bi bi-geo-alt-fill"></i></div>
      <div class="checkin-info">
        <h6>ยังไม่ได้เช็คอิน</h6>
        <p>${formatDate()}</p>
      </div>
      <button class="checkin-action-btn" style="color:#0d6efd" onclick="doCheckin()">เช็คอิน</button>
    </div>
    <div style="padding:0 12px 4px"><div class="section-label">งานในระบบ (${myJobs.length} งาน)</div></div>
    ${myJobs.length === 0 ? `<div style="text-align:center;padding:30px;color:#9ca3af"><i class="bi bi-clipboard2-check" style="font-size:36px;display:block;margin-bottom:8px"></i>ไม่มีงานค้าง</div>` : myJobs.slice(0,3).map(j => renderJobCard(j)).join('')}
    ${topTech ? `
    <div class="kudos-banner">
      <div style="font-size:36px">⭐</div>
      <div>
        <div style="font-weight:700;font-size:13px">ช่างยอดเยี่ยมสัปดาห์นี้</div>
        <div style="font-size:22px;font-weight:900">${topTech.name}</div>
        <div style="font-size:11px;opacity:0.8">${topTech.jobs_completed || 0} งานเสร็จ</div>
      </div>
    </div>` : ''}
  `;
}

function renderAdminHome() {
  const pending = APP.jobs.filter(j => j.status === 'new' || j.status === 'urgent');
  const overdue = APP.jobs.filter(j => j.sla < 0 && j.status !== 'done' && j.status !== 'cancel');
  const d = APP.dashboardData;
  const alertsRaw = d && d.alerts ? d.alerts : {};
  const alerts = Array.isArray(alertsRaw) ? alertsRaw : (alertsRaw.items || []);
  return `
    ${overdue.length > 0 ? `
    <div style="padding:0 12px 4px"><div class="section-label" style="color:#ef4444">⚠️ งานเกิน SLA (${overdue.length} งาน)</div></div>
    ${overdue.slice(0,2).map(j => renderJobCard(j)).join('')}` : ''}
    <div style="padding:0 12px 4px;margin-top:4px"><div class="section-label">งานทั้งหมด (${APP.jobs.length} งาน)</div></div>
    ${APP.jobs.length === 0 ? `<div style="text-align:center;padding:30px;color:#9ca3af"><div style="font-size:32px;margin-bottom:8px">⏳</div>กำลังโหลดข้อมูล...</div>` :
      APP.jobs.slice(0,5).map(j => renderJobCard(j)).join('')}
  `;
}

function renderAcctHome() {
  const pending = APP.jobs.filter(j => j.status === 'done');
  const d = APP.dashboardData;
  const summary = d && d.summary ? d.summary : {};
  const revenue = summary.revenue || {};
  const todayRevenue = Number(revenue.today || 0);
  const vat = Math.round(todayRevenue * 0.07 * 100) / 100;
  const wht = Math.round(todayRevenue * 0.03 * 100) / 100;
  const net = todayRevenue - vat;
  return `
    <div class="slip-scan-card">
      <i class="bi bi-camera-fill"></i>
      <h6>กดเพื่อสแกนสลิปใหม่</h6>
      <p>AI จะตรวจยอดและจับคู่บิลอัตโนมัติ</p>
      <button class="slip-scan-btn" onclick="scanSlip()"><i class="bi bi-camera"></i> เปิดกล้อง</button>
    </div>
    <div style="padding:0 12px 4px"><div class="section-label">งานเสร็จแล้ว (${pending.length} งาน)</div></div>
    ${pending.length === 0 ? `<div style="text-align:center;padding:20px;color:#9ca3af">ยังไม่มีงานเสร็จ</div>` :
      pending.map(j => `
        <div class="bill-row">
          <div class="avatar-sm" style="background:#fee2e2;color:#dc2626">${(j.customer||'-').charAt(0)}</div>
          <div><div class="bill-amount">฿${Number(j.price||0).toLocaleString()}</div><div class="bill-sub">${j.id} · ${j.customer}</div></div>
          <span class="bill-status-badge" style="background:#d1fae5;color:#065f46">เสร็จ</span>
        </div>
      `).join('')}
    <div class="mini-chart-card">
      <div class="chart-title">สรุปภาษีวันนี้ (อัตโนมัติ)</div>
      <div style="display:flex;justify-content:space-between;font-size:12px;color:#374151">
        <div><span style="font-weight:700">VAT 7%</span><br><span style="font-size:18px;font-weight:900;color:#0891b2">฿${vat.toLocaleString()}</span></div>
        <div><span style="font-weight:700">WHT 3%</span><br><span style="font-size:18px;font-weight:900;color:#7c3aed">฿${wht.toLocaleString()}</span></div>
        <div><span style="font-weight:700">รายรับวันนี้</span><br><span style="font-size:18px;font-weight:900;color:#10b981">฿${todayRevenue.toLocaleString()}</span></div>
      </div>
    </div>
  `;
}

function renderExecHome() {
  const d = APP.dashboardData;
  const summary = d && d.summary ? d.summary : {};
  const alertsRaw = d && d.alerts ? d.alerts : {};
  const alerts = Array.isArray(alertsRaw) ? alertsRaw : (alertsRaw.items || []);
  const topTech = summary.topTechnician;
  const revenue = summary.revenue || {};
  const overdueJobs = APP.jobs.filter(j => j.sla < 0 && j.status !== 'done' && j.status !== 'cancel');

  return `
    ${alerts.length > 0 ? `
    <div style="padding:0 12px 4px"><div class="section-label" style="color:#ef4444">⚠️ แจ้งเตือนด่วน (${alerts.length})</div></div>
    ${alerts.slice(0,3).map(a => {
      const isOverdue = (a.type||'').includes('OVERDUE');
      const isStock = (a.type||'').includes('STOCK');
      const cls = isOverdue ? 'danger' : isStock ? 'warning' : 'success';
      const icon = isOverdue ? 'bi-clock-fill' : isStock ? 'bi-box-seam-fill' : 'bi-info-circle-fill';
      const msg = a.message || (a.data && a.data.customer_name ? `${a.id} — ${a.data.customer_name}` : '-');
      return `<div class="alert-card ${cls}">
        <i class="bi ${icon}"></i>
        <div style="flex:1"><div style="font-weight:700">${msg}</div>${a.data && a.data.status_label ? `<div style="font-size:11px;font-weight:400">สถานะ: ${a.data.status_label}</div>` : ''}</div>
      </div>`;
    }).join('')}` : ''}

    <div style="padding:0 12px 4px;margin-top:4px"><div class="section-label">งานล่าสุด</div></div>
    ${APP.jobs.length === 0 ? `<div style="text-align:center;padding:30px;color:#9ca3af"><div style="font-size:32px;margin-bottom:8px">⏳</div>กำลังโหลดข้อมูล...</div>` :
      APP.jobs.slice(0,4).map(j => renderJobCard(j)).join('')}

    ${topTech ? `
    <div style="padding:0 12px 4px;margin-top:4px"><div class="section-label">ช่างยอดเยี่ยมสัปดาห์นี้</div></div>
    <div class="rank-card">
      <div class="rank-num">1</div>
      <div class="avatar-sm" style="background:#fef9c3;color:#d97706">${(topTech.name||'?')[0]}</div>
      <div style="flex:1"><div style="font-size:13px;font-weight:700">${topTech.name}</div><div class="stars-row">${'★'.repeat(Math.min(5,Math.round(topTech.rating||5)))} <span style="color:#9ca3af;font-size:11px">${topTech.kudos||0} Kudos</span></div></div>
      <div style="text-align:right"><div style="font-size:12px;font-weight:700;color:#10b981">${topTech.jobs_completed||0} งาน</div><div style="font-size:10px;color:#9ca3af">สัปดาห์นี้</div></div>
    </div>` : ''}
  `;
}
