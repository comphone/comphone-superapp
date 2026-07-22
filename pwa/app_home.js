// ===== HOME RENDER =====
function renderHome() {
  const roleConf = ROLES[APP.role] || ROLES.tech;
  const quickActions = (typeof getQuickActions === 'function' ? getQuickActions() : roleConf.quickActions).slice(0, 4);

  const qaGrid = document.getElementById('quick-actions-grid');
  qaGrid.className = quickActions.length > 4 ? 'qa-grid-8' : 'qa-grid-4';
  qaGrid.innerHTML = quickActions.map(qa => `
    <button type="button" class="qa-btn-item" data-quick-action="${qa.id || qa.action || ''}" aria-label="${qa.label}" style="background:${qa.color};color:${qa.textColor};" onclick="${qa.id ? `runQuickAction('${qa.id}')` : `${qa.action}()`}">
      <i class="bi ${qa.icon}"></i>
      ${qa.label}
    </button>
  `).join('');

  renderStats();
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
      { label: 'งานของฉัน', value: myJobs || pendingJobs, sub: 'งานทั้งหมด', icon: 'bi-person-check-fill', color: '#2563eb', bg: '#eff6ff' },
      { label: 'รอดำเนินการ', value: pendingJobs, sub: 'ยังไม่เสร็จ', icon: 'bi-hourglass-split', color: '#d97706', bg: '#fffbeb',
        alert: pendingJobs > 5 }
    ],
    admin: [
      { label: 'งานทั้งหมด', value: totalJobs, sub: 'ในระบบ', icon: 'bi-clipboard2-data-fill', color: '#7c3aed', bg: '#f5f3ff' },
      { label: 'รอดำเนินการ', value: pendingJobs, sub: overdueJobs > 0 ? `เกิน SLA ${overdueJobs} งาน` : 'ปกติ', icon: 'bi-clock-fill', color: '#dc2626', bg: '#fef2f2',
        alert: overdueJobs > 0 },
      { label: 'เสร็จแล้ว', value: doneJobs, sub: 'งาน', icon: 'bi-check-circle-fill', color: '#059669', bg: '#ecfdf5' },
      { label: 'เกิน SLA', value: overdueJobs, sub: 'ต้องดำเนินการ', icon: 'bi-exclamation-triangle-fill', color: '#ea580c', bg: '#fff7ed',
        alert: overdueJobs > 0 }
    ],
    acct: [
      { label: 'รายรับวันนี้', value: '฿' + Number(revenue.today || 0).toLocaleString(), sub: 'บาท', icon: 'bi-cash-coin', color: '#059669', bg: '#ecfdf5' },
      { label: 'รายรับเดือนนี้', value: '฿' + Number(revenue.month || 0).toLocaleString(), sub: 'บาท', icon: 'bi-graph-up-arrow', color: '#0891b2', bg: '#ecfeff' },
      { label: 'งานทั้งหมด', value: totalJobs, sub: 'ในระบบ', icon: 'bi-clipboard2-data-fill', color: '#7c3aed', bg: '#f5f3ff' },
      { label: 'เสร็จแล้ว', value: doneJobs, sub: 'งาน', icon: 'bi-check-circle-fill', color: '#d97706', bg: '#fffbeb' }
    ],
    exec: [
      { label: 'รายรับวันนี้', value: '฿' + Number(revenue.today || 0).toLocaleString(), sub: 'เดือน: ฿' + Number(revenue.month || 0).toLocaleString(), icon: 'bi-currency-dollar', color: '#d97706', bg: '#fffbeb' },
      { label: 'งานค้าง', value: pendingJobs, sub: overdueJobs > 0 ? `เกิน SLA ${overdueJobs} งาน` : 'ปกติ', icon: 'bi-clock-fill', color: '#dc2626', bg: '#fef2f2',
        alert: overdueJobs > 0 },
      { label: 'งานเสร็จ', value: doneJobs, sub: `จาก ${totalJobs} งาน`, icon: 'bi-check-circle-fill', color: '#2563eb', bg: '#eff6ff' },
      { label: 'ช่างยอดเยี่ยม', value: topTech ? ((topTech.name || '').split(' ')[0] || '-') : '-', sub: topTech ? `${topTech.jobs_completed || 0} งาน` : '', icon: 'bi-trophy-fill', color: '#7c3aed', bg: '#f5f3ff' }
    ]
  };

  const stats = statsMap[role] || statsMap.tech;
  row.innerHTML = stats.map(s => `
    <div class="stat-card-v2 ${s.alert ? 'stat-alert' : ''}">
      <div class="stat-icon-wrap" style="background:${s.bg};color:${s.color}">
        <i class="bi ${s.icon}"></i>
      </div>
      <div class="stat-body">
        <div class="stat-v2-label">${s.label}</div>
        <div class="stat-v2-value" style="color:${s.color}">${s.value}</div>
        <div class="stat-v2-sub">${s.sub}</div>
      </div>
    </div>
  `).join('');
}

// ─── ภาพรวมระบบ (Operator Pulse) ───────────────────────────────
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
  const statusText = riskCount > 0 ? 'มีเรื่องต้องดูแล' : 'ปกติดี';
  const tone = riskCount > 0 ? 'watch' : 'ok';

  return `
    <section class="operator-pulse-card ${tone}" data-mobile-operator-pulse="true" aria-label="ภาพรวมระบบ">
      <div class="operator-pulse-head">
        <div>
          <div class="operator-pulse-kicker">ภาพรวมระบบ</div>
          <strong>${statusText}</strong>
        </div>
        <button type="button" class="operator-pulse-action" aria-label="ดูแดชบอร์ด" onclick="goPage('dashboard', document.getElementById('nav-home'))">
          <i class="bi bi-speedometer2"></i>
        </button>
      </div>
      <div class="operator-pulse-row">
        <div class="operator-pulse-metric"><span>${totalJobs.toLocaleString()}</span><small>งาน</small></div>
        <div class="operator-pulse-metric"><span>฿${Number(revenue.today || 0).toLocaleString()}</span><small>รายรับวันนี้</small></div>
        <div class="operator-pulse-metric ${overdueJobs > 0 ? 'hot' : ''}"><span>${overdueJobs}</span><small>เกิน SLA</small></div>
        <div class="operator-pulse-metric ${riskCount > 0 ? 'hot' : ''}"><span>${riskCount}</span><small>ความเสี่ยง</small></div>
      </div>
      <div class="operator-pulse-foot">
        บิลค้าง ${billingOpen} · สินค้าต่ำ ${lowStock} · AI Vision ${visionReview} · LINE ${linePending}
      </div>
    </section>`;
}

// ─── โฟกัสตามบทบาท (Role Focus) ─────────────────────────────────
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
    tech: { title: 'งานช่าง', icon: 'bi-tools', page: 'jobs', value: overdueJobs > 0 ? `${overdueJobs} งานเกิน SLA` : `${totalJobs} งาน`, note: 'คิวงานของฉัน' },
    admin: { title: 'จัดการงาน', icon: 'bi-headset', page: 'jobs', value: `${totalJobs} งาน`, note: `LINE แจ้งเตือน ${linePending} รายการ` },
    acct: { title: 'การเงิน', icon: 'bi-receipt', page: 'billing', value: `฿${Number(revenue.today || 0).toLocaleString()}`, note: `บิลค้างชำระ ${billingOpen} รายการ` },
    exec: { title: 'ภาพรวมธุรกิจ', icon: 'bi-graph-up-arrow', page: 'reports', value: `฿${Number(revenue.month || 0).toLocaleString()}`, note: `ความเสี่ยง ${lowStock + visionReview + linePending} รายการ` }
  };
  const card = roleMap[role] || roleMap.admin;
  return `
    <section class="mobile-role-focus-card" data-mobile-role-widget="${role}" aria-label="${card.title}">
      <div class="mobile-role-focus-icon"><i class="bi ${card.icon}"></i></div>
      <div class="mobile-role-focus-copy">
        <small>โฟกัสของคุณ</small>
        <strong>${card.title}</strong>
        <span>${card.value}</span>
        <em>${card.note}</em>
      </div>
      <button type="button" class="mobile-role-focus-action" aria-label="ไปที่ ${card.title}" onclick="goPage('${card.page}', document.getElementById('${card.page === 'jobs' ? 'nav-jobs' : 'nav-more'}'))">
        <i class="bi bi-arrow-right-short"></i>
      </button>
    </section>`;
}

// ─── งานสำคัญ (Decision Layer) ──────────────────────────────────
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
    { id: 'jobs', page: 'jobs', icon: 'bi-tools', title: 'งานบริการ', note: overdueJobs > 0 ? `${overdueJobs} เกิน SLA` : `${totalJobs} งาน`, value: overdueJobs || totalJobs, priority: overdueJobs > 0 ? 'high' : 'normal' },
    { id: 'billing', page: 'billing', icon: 'bi-receipt', title: 'ออกบิล', note: billingOpen > 0 ? `ค้าง ${billingOpen} รายการ` : 'ไม่มีค้าง', value: billingOpen, priority: billingOpen > 0 ? 'high' : 'normal' },
    { id: 'reports', page: 'reports', icon: 'bi-graph-up-arrow', title: 'รายงาน', note: Number(revenue.month || 0) > 0 ? `฿${Number(revenue.month || 0).toLocaleString()}` : 'ดูสรุป', value: Number(revenue.month || 0), priority: Number(revenue.today || 0) <= 0 && Number(revenue.month || 0) <= 0 ? 'watch' : 'normal' },
    { id: 'inventory', page: 'inventory', icon: 'bi-boxes', title: 'คลังสินค้า', note: lowStock > 0 ? `สินค้าต่ำ ${lowStock} รายการ` : 'ปกติ', value: lowStock, priority: lowStock > 0 ? 'watch' : 'normal' },
    { id: 'vision', page: 'vision', icon: 'bi-stars', title: 'AI Vision', note: visionReview > 0 ? `รอรีวิว ${visionReview}` : 'พร้อมใช้งาน', value: visionReview, priority: visionReview > 0 ? 'watch' : 'normal' },
    { id: 'line-center', page: 'line-center', icon: 'bi-broadcast-pin', title: 'LINE', note: linePending > 0 ? `แจ้งเตือน ${linePending}` : 'ปกติ', value: linePending, priority: linePending > 0 ? 'watch' : 'normal' }
  ];
  const order = { high: 0, watch: 1, normal: 2 };
  return items.sort((a, b) => (order[a.priority] - order[b.priority]) || (b.value - a.value)).slice(0, 4);
}

function renderMobileDecisionLayer() {
  const items = buildMobileDecisionItems();
  return `
    <section class="mobile-decision-layer" data-mobile-decision-layer="true" aria-label="งานสำคัญ">
      <div class="mobile-decision-head">
        <div>
          <small>การดำเนินงาน</small>
          <strong>สิ่งที่ต้องทำตอนนี้</strong>
        </div>
        <button type="button" class="mobile-decision-settings" aria-label="ปรับแต่ง" onclick="showQuickActionSettings()">
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
      ${APP.dashboardLoading ? '<div class="mobile-cache-note"><i class="bi bi-cloud-arrow-down"></i> กำลังอัปเดตข้อมูลล่าสุด...</div>' : ''}
      ${APP.dashboardFromCache ? `<div class="mobile-cache-note"><i class="bi bi-lightning-charge"></i> แสดงข้อมูลจาก cache ขณะ sync ใหม่</div>` : ''}
    </section>`;
}

// ─── หน้าหลักตามบทบาท ────────────────────────────────────────────
function renderTechHome() {
  const _u = APP.user || {};
  const _displayName = _u.name || _u.full_name || _u.username || '';
  const myName = _displayName.split(' ')[0];
  const myJobs = APP.jobs.filter(j => !myName || (j.tech && j.tech.includes(myName)) || j.status !== 'done');
  const d = APP.dashboardData;
  const topTech = d && d.summary && d.summary.topTechnician;
  return `
    <div class="checkin-banner" style="background:linear-gradient(135deg,#2563eb,#1d4ed8)">
      <div class="checkin-icon-wrap"><i class="bi bi-geo-alt-fill"></i></div>
      <div class="checkin-info">
        <h6>ยังไม่ได้เช็คอิน</h6>
        <p>${formatDate()}</p>
      </div>
      <button class="checkin-action-btn" style="color:#2563eb" onclick="doCheckin()">เช็คอิน</button>
    </div>
    <div class="home-section-header">
      <span>งานในคิว</span>
      <span class="home-section-count">${myJobs.length} งาน</span>
    </div>
    ${myJobs.length === 0
      ? `<div class="home-empty-state"><i class="bi bi-clipboard2-check"></i><p>ไม่มีงานค้าง</p></div>`
      : myJobs.slice(0, 3).map(j => renderJobCard(j)).join('')}
    ${myJobs.length > 3 ? `<button class="home-see-all-btn" onclick="goPage('jobs',document.getElementById('nav-jobs'))"><i class="bi bi-list-ul"></i> ดูงานทั้งหมด (${myJobs.length} งาน)</button>` : ''}
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
  const overdue = APP.jobs.filter(j => j.sla < 0 && j.status !== 'done' && j.status !== 'cancel');
  const allJobs = APP.jobs;
  return `
    ${overdue.length > 0 ? `
    <div class="home-section-header alert">
      <span><i class="bi bi-exclamation-triangle-fill" style="margin-right:4px"></i>เกิน SLA</span>
      <span class="home-section-count alert">${overdue.length} งาน</span>
    </div>
    ${overdue.slice(0, 2).map(j => renderJobCard(j)).join('')}` : ''}
    <div class="home-section-header" style="margin-top:${overdue.length > 0 ? '4px' : '0'}">
      <span>งานทั้งหมด</span>
      <span class="home-section-count">${allJobs.length} งาน</span>
    </div>
    ${allJobs.length === 0
      ? `<div class="home-empty-state"><div style="font-size:32px">⏳</div><p>กำลังโหลดข้อมูล...</p></div>`
      : allJobs.slice(0, 5).map(j => renderJobCard(j)).join('')}
    ${allJobs.length > 5 ? `<button class="home-see-all-btn" onclick="goPage('jobs',document.getElementById('nav-jobs'))"><i class="bi bi-list-ul"></i> ดูงานทั้งหมด (${allJobs.length} งาน)</button>` : ''}
  `;
}

function renderAcctHome() {
  const donedJobs = APP.jobs.filter(j => j.status === 'done');
  const d = APP.dashboardData;
  const summary = d && d.summary ? d.summary : {};
  const revenue = summary.revenue || {};
  const todayRevenue = Number(revenue.today || 0);
  const vat = Math.round(todayRevenue * 0.07 * 100) / 100;
  const wht = Math.round(todayRevenue * 0.03 * 100) / 100;
  return `
    <div class="slip-scan-card">
      <i class="bi bi-camera-fill"></i>
      <h6>กดเพื่อสแกนสลิปใหม่</h6>
      <p>AI จะตรวจยอดและจับคู่บิลอัตโนมัติ</p>
      <button class="slip-scan-btn" onclick="scanSlip()"><i class="bi bi-camera"></i> เปิดกล้อง</button>
    </div>
    <div class="mini-chart-card">
      <div class="chart-title">สรุปภาษีวันนี้</div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;text-align:center">
        <div class="tax-chip" style="color:#0891b2">
          <div class="tax-chip-label">VAT 7%</div>
          <div class="tax-chip-value">฿${vat.toLocaleString()}</div>
        </div>
        <div class="tax-chip" style="color:#7c3aed">
          <div class="tax-chip-label">WHT 3%</div>
          <div class="tax-chip-value">฿${wht.toLocaleString()}</div>
        </div>
        <div class="tax-chip" style="color:#059669">
          <div class="tax-chip-label">รายรับวันนี้</div>
          <div class="tax-chip-value">฿${todayRevenue.toLocaleString()}</div>
        </div>
      </div>
    </div>
    <div class="home-section-header">
      <span>งานเสร็จแล้ว</span>
      <span class="home-section-count">${donedJobs.length} งาน</span>
    </div>
    ${donedJobs.length === 0
      ? `<div class="home-empty-state"><i class="bi bi-receipt"></i><p>ยังไม่มีงานเสร็จ</p></div>`
      : donedJobs.slice(0, 5).map(j => `
        <div class="bill-row">
          <div class="avatar-sm" style="background:#fee2e2;color:#dc2626">${(j.customer || '-').charAt(0)}</div>
          <div style="flex:1;min-width:0">
            <div class="bill-amount">฿${Number(j.price || 0).toLocaleString()}</div>
            <div class="bill-sub">${j.id} · ${j.customer}</div>
          </div>
          <span class="bill-status-badge" style="background:#d1fae5;color:#065f46">เสร็จ</span>
        </div>
      `).join('')}
  `;
}

function renderExecHome() {
  const d = APP.dashboardData;
  const summary = d && d.summary ? d.summary : {};
  const alertsRaw = d && d.alerts ? d.alerts : {};
  const alerts = Array.isArray(alertsRaw) ? alertsRaw : (alertsRaw.items || []);
  const topTech = summary.topTechnician;
  const revenue = summary.revenue || {};

  return `
    ${alerts.length > 0 ? `
    <div class="home-section-header alert">
      <span><i class="bi bi-bell-fill" style="margin-right:4px"></i>แจ้งเตือนด่วน</span>
      <span class="home-section-count alert">${alerts.length} รายการ</span>
    </div>
    ${alerts.slice(0, 3).map(a => {
      const isOverdue = (a.type || '').includes('OVERDUE');
      const isStock = (a.type || '').includes('STOCK');
      const cls = isOverdue ? 'danger' : isStock ? 'warning' : 'success';
      const icon = isOverdue ? 'bi-clock-fill' : isStock ? 'bi-box-seam-fill' : 'bi-info-circle-fill';
      const msg = a.message || (a.data && a.data.customer_name ? `${a.id} — ${a.data.customer_name}` : '-');
      return `<div class="alert-card ${cls}">
        <i class="bi ${icon}"></i>
        <div style="flex:1"><div style="font-weight:700">${msg}</div>${a.data && a.data.status_label ? `<div style="font-size:11px;color:#6b7280">สถานะ: ${a.data.status_label}</div>` : ''}</div>
      </div>`;
    }).join('')}` : ''}
    <div class="home-section-header" style="margin-top:${alerts.length > 0 ? '4px' : '0'}">
      <span>งานล่าสุด</span>
      <span class="home-section-count">${APP.jobs.length} งาน</span>
    </div>
    ${APP.jobs.length === 0
      ? `<div class="home-empty-state"><div style="font-size:32px">⏳</div><p>กำลังโหลดข้อมูล...</p></div>`
      : APP.jobs.slice(0, 4).map(j => renderJobCard(j)).join('')}
    ${APP.jobs.length > 4 ? `<button class="home-see-all-btn" onclick="goPage('jobs',document.getElementById('nav-jobs'))"><i class="bi bi-list-ul"></i> ดูงานทั้งหมด</button>` : ''}
    ${topTech ? `
    <div class="home-section-header" style="margin-top:4px">
      <span>ช่างยอดเยี่ยมสัปดาห์นี้</span>
    </div>
    <div class="rank-card">
      <div class="rank-num">1</div>
      <div class="avatar-sm" style="background:#fef9c3;color:#d97706">${(topTech.name || '?')[0]}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:700">${topTech.name}</div>
        <div class="stars-row">${'★'.repeat(Math.min(5, Math.round(topTech.rating || 5)))} <span style="color:#9ca3af;font-size:11px">${topTech.kudos || 0} คะแนน</span></div>
      </div>
      <div style="text-align:right">
        <div style="font-size:12px;font-weight:700;color:#059669">${topTech.jobs_completed || 0} งาน</div>
        <div style="font-size:10px;color:#9ca3af">สัปดาห์นี้</div>
      </div>
    </div>` : ''}
  `;
}
