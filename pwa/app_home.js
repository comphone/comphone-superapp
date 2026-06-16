// ===== HOME RENDER =====
function renderHome() {
  const roleConf = ROLES[APP.role] || ROLES.tech;
  const quickActions = (typeof getQuickActions === 'function' ? getQuickActions() : roleConf.quickActions).slice(0, 4);

  // Quick Actions
  const qaGrid = document.getElementById('quick-actions-grid');
  qaGrid.className = quickActions.length > 4 ? 'qa-grid-8' : 'qa-grid-4';
  qaGrid.innerHTML = quickActions.map(qa => `
    <button type="button" class="qa-btn-item" data-quick-action="${qa.id || qa.action || ''}" aria-label="${qa.label}" style="background:${qa.color};color:${qa.textColor};" onclick="${qa.id ? `runQuickAction('${qa.id}')` : `${qa.action}()`}">
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
  const _myName = APP.user ? ((APP.user.name || APP.user.full_name || APP.user.username || '').split(' ')[0]) : '';
  const myJobs = APP.jobs.filter(j => j.tech && _myName && j.tech.includes(_myName)).length;
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
      { label: 'ช่างยอดเยี่ยม', value: topTech ? ((topTech.name || '').split(' ')[0] || '-') : '-', sub: topTech ? `${topTech.jobs_completed || 0} งาน` : '', trend: '', color: '#7c3aed' }
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

function renderOperatorPulse() {
  const d = APP.dashboardData || {};
  const summary = d.summary || d || {};
  const revenue = summary.revenue || {};
  const alertsRaw = d.alerts || summary.alerts || {};
  const alerts = Array.isArray(alertsRaw) ? alertsRaw : (alertsRaw.items || []);
  const jobs = Array.isArray(APP.jobs) ? APP.jobs : [];
  const totalJobs = Number(summary.totalJobs || summary.total_jobs || jobs.length || 0);
  const overdueJobs = Number(summary.overdueJobs || summary.overdue_jobs || 0);
  const lowStock = Number(summary.lowStock || summary.low_stock || 0);
  const billingOpen = Number(summary.billingOpen || summary.openBillings || summary.pendingBillings || 0);
  const visionReview = Number(summary.visionReview || summary.visionReviewQueue || summary.pendingVisionReviews || 0);
  const linePending = alerts.length;
  const riskCount = overdueJobs + lowStock + visionReview + linePending;
  const statusText = riskCount > 0 ? 'Action needed' : 'Stable';
  const tone = riskCount > 0 ? 'watch' : 'ok';

  return `
    <section class="operator-pulse-card ${tone}" data-mobile-operator-pulse="true" aria-label="Operator pulse">
      <div class="operator-pulse-head">
        <div>
          <div class="operator-pulse-kicker">Operator Pulse</div>
          <strong>${statusText}</strong>
        </div>
        <button type="button" class="operator-pulse-action" aria-label="Open dashboard" onclick="goPage('dashboard', document.getElementById('nav-home'))">
          <i class="bi bi-speedometer2"></i>
        </button>
      </div>
      <div class="operator-pulse-row">
        <div class="operator-pulse-metric"><span>${totalJobs.toLocaleString()}</span><small>Jobs</small></div>
        <div class="operator-pulse-metric"><span>THB ${Number(revenue.today || 0).toLocaleString()}</span><small>Cash</small></div>
        <div class="operator-pulse-metric ${overdueJobs > 0 ? 'hot' : ''}"><span>${overdueJobs}</span><small>SLA</small></div>
        <div class="operator-pulse-metric ${riskCount > 0 ? 'hot' : ''}"><span>${riskCount}</span><small>Risk</small></div>
      </div>
      <div class="operator-pulse-foot">
        Billing ${billingOpen} | Stock ${lowStock} | Vision ${visionReview} | LINE ${linePending}
      </div>
    </section>`;
}

function renderMobileRoleFocus() {
  const role = APP.role || 'tech';
  const d = APP.dashboardData || {};
  const summary = d.summary || d || {};
  const revenue = summary.revenue || {};
  const jobs = Array.isArray(APP.jobs) ? APP.jobs : [];
  const alertsRaw = d.alerts || summary.alerts || {};
  const alerts = Array.isArray(alertsRaw) ? alertsRaw : (alertsRaw.items || []);
  const totalJobs = Number(summary.totalJobs || summary.total_jobs || jobs.length || 0);
  const overdueJobs = Number(summary.overdueJobs || summary.overdue_jobs || 0);
  const billingOpen = Number(summary.billingOpen || summary.openBillings || summary.pendingBillings || 0);
  const lowStock = Number(summary.lowStock || summary.low_stock || 0);
  const visionReview = Number(summary.visionReview || summary.visionReviewQueue || summary.pendingVisionReviews || 0);
  const linePending = alerts.length;
  const roleMap = {
    tech: { title: 'Field Focus', icon: 'bi-tools', page: 'jobs', value: `${overdueJobs} SLA`, note: `${totalJobs} jobs in queue` },
    admin: { title: 'Dispatch Focus', icon: 'bi-headset', page: 'jobs', value: `${totalJobs} jobs`, note: `${linePending} LINE alerts` },
    acct: { title: 'Cash Focus', icon: 'bi-receipt', page: 'billing', value: `THB ${Number(revenue.today || 0).toLocaleString()}`, note: `${billingOpen} billing follow-up` },
    exec: { title: 'Executive Focus', icon: 'bi-graph-up-arrow', page: 'reports', value: `THB ${Number(revenue.month || 0).toLocaleString()}`, note: `${lowStock + visionReview + linePending} active risks` }
  };
  const card = roleMap[role] || roleMap.admin;
  return `
    <section class="mobile-role-focus-card" data-mobile-role-widget="${role}" aria-label="${card.title}">
      <div class="mobile-role-focus-icon"><i class="bi ${card.icon}"></i></div>
      <div class="mobile-role-focus-copy">
        <small>Role Focus</small>
        <strong>${card.title}</strong>
        <span>${card.value}</span>
        <em>${card.note}</em>
      </div>
      <button type="button" class="mobile-role-focus-action" aria-label="Open ${card.title}" onclick="goPage('${card.page}', document.getElementById('${card.page === 'jobs' ? 'nav-jobs' : 'nav-more'}'))">
        <i class="bi bi-arrow-right-short"></i>
      </button>
    </section>`;
}

function buildMobileDecisionItems() {
  const d = APP.dashboardData || {};
  const summary = d.summary || d || {};
  const revenue = summary.revenue || {};
  const alertsRaw = d.alerts || summary.alerts || {};
  const alerts = Array.isArray(alertsRaw) ? alertsRaw : (alertsRaw.items || []);
  const totalJobs = Number(summary.totalJobs || summary.total_jobs || (APP.jobs || []).length || 0);
  const overdueJobs = Number(summary.overdueJobs || summary.overdue_jobs || 0);
  const billingOpen = Number(summary.billingOpen || summary.openBillings || summary.pendingBillings || 0);
  const lowStock = Number(summary.lowStock || summary.low_stock || 0);
  const visionReview = Number(summary.visionReview || summary.visionReviewQueue || summary.pendingVisionReviews || 0);
  const linePending = alerts.length;
  const items = [
    { id: 'jobs', page: 'jobs', icon: 'bi-tools', title: 'Service', note: overdueJobs > 0 ? `${overdueJobs} SLA risk` : `${totalJobs} jobs`, value: overdueJobs || totalJobs, priority: overdueJobs > 0 ? 'high' : 'normal' },
    { id: 'billing', page: 'billing', icon: 'bi-receipt', title: 'Billing', note: billingOpen > 0 ? `${billingOpen} follow-up` : 'cash clear', value: billingOpen, priority: billingOpen > 0 ? 'high' : 'normal' },
    { id: 'reports', page: 'reports', icon: 'bi-graph-up-arrow', title: 'Reports', note: Number(revenue.month || 0) > 0 ? `THB ${Number(revenue.month || 0).toLocaleString()}` : 'review period', value: Number(revenue.month || 0), priority: Number(revenue.today || 0) <= 0 && Number(revenue.month || 0) <= 0 ? 'watch' : 'normal' },
    { id: 'inventory', page: 'inventory', icon: 'bi-boxes', title: 'Stock', note: lowStock > 0 ? `${lowStock} low-stock` : 'healthy', value: lowStock, priority: lowStock > 0 ? 'watch' : 'normal' },
    { id: 'vision', page: 'vision', icon: 'bi-stars', title: 'Vision', note: visionReview > 0 ? `${visionReview} reviews` : 'pilot ready', value: visionReview, priority: visionReview > 0 ? 'watch' : 'normal' },
    { id: 'line-center', page: 'line-center', icon: 'bi-broadcast-pin', title: 'LINE', note: linePending > 0 ? `${linePending} alerts` : 'rooms healthy', value: linePending, priority: linePending > 0 ? 'watch' : 'normal' }
  ];
  const order = { high: 0, watch: 1, normal: 2 };
  return items.sort((a, b) => (order[a.priority] - order[b.priority]) || (b.value - a.value)).slice(0, 4);
}

function renderMobileDecisionLayer() {
  const items = buildMobileDecisionItems();
  return `
    <section class="mobile-decision-layer" data-mobile-decision-layer="true" aria-label="Mobile decision layer">
      <div class="mobile-decision-head">
        <div>
          <small>Decision Layer</small>
          <strong>Next best actions</strong>
        </div>
        <button type="button" class="mobile-decision-settings" aria-label="Edit quick actions" onclick="showQuickActionSettings()">
          <i class="bi bi-sliders"></i>
        </button>
      </div>
      <div class="mobile-decision-grid">
        ${items.map(item => `
          <button type="button" class="mobile-decision-item priority-${item.priority}" onclick="goPage('${item.page}', document.getElementById('${item.page === 'jobs' ? 'nav-jobs' : 'nav-more'}'))">
            <i class="bi ${item.icon}"></i>
            <span><strong>${item.title}</strong><small>${item.note}</small></span>
          </button>
        `).join('')}
      </div>
    </section>`;
}

function renderMainContent() {
  const area = document.getElementById('main-content-area');
  const role = APP.role;
  const pulse = renderMobileCommandCenter();

  if (role === 'tech') {
    area.innerHTML = pulse + renderTechHome();
  } else if (role === 'admin') {
    area.innerHTML = pulse + renderAdminHome();
  } else if (role === 'acct') {
    area.innerHTML = pulse + renderAcctHome();
  } else if (role === 'exec') {
    area.innerHTML = pulse + renderExecHome();
  }
}

function renderMobileCommandCenter() {
  return `
    <section class="mobile-command-center" data-mobile-command-center="true">
      ${renderOperatorPulse()}
      <div class="mobile-command-row">
        ${renderMobileRoleFocus()}
        ${renderMobileDecisionLayer()}
      </div>
      ${APP.dashboardLoading ? '<div class="mobile-cache-note"><i class="bi bi-cloud-arrow-down"></i> Updating latest data...</div>' : ''}
      ${APP.dashboardFromCache ? `<div class="mobile-cache-note"><i class="bi bi-lightning-charge"></i> Showing ${APP.dashboardFromCache} cached dashboard while syncing</div>` : ''}
    </section>`;
}

function renderTechHome() {
  const _u = APP.user || {};
  const _displayName = _u.name || _u.full_name || _u.username || '';
  const myName = _displayName.split(' ')[0];
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
