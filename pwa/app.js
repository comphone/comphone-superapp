/* ===== COMPHONE SUPERAPP — app.js ===== */
'use strict';

// ===== STATE =====
const DEFAULT_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzTkaRqupj6H5cDnL69bZj4Nh0er8NLgqrRshy4bh9eq9HI5DdhosUiLaNn-Oaa93_47Q/exec';

const APP = {
  user: null,
  role: null,
  scriptUrl: DEFAULT_SCRIPT_URL,
  currentPage: 'home',
  deferredInstall: null,
  notifEnabled: false,
  offlineQueue: [],
  jobs: [],
  photos: []
};

// ===== ROLE CONFIG =====
const ROLES = {
  tech: {
    label: 'ช่าง',
    theme: 'theme-tech',
    color: '#0d6efd',
    icon: 'bi-tools',
    greeting: 'พร้อมรับงานวันนี้แล้วหรือยัง?',
    quickActions: [
      { icon: 'bi-check2-circle', label: 'เสร็จแล้ว', color: '#d1fae5', textColor: '#065f46', action: 'markDone' },
      { icon: 'bi-camera-fill', label: 'ถ่ายรูป', color: '#dbeafe', textColor: '#1e40af', action: 'openCameraQuick' },
      { icon: 'bi-hourglass-split', label: 'รอชิ้นส่วน', color: '#fef3c7', textColor: '#92400e', action: 'markWaiting' },
      { icon: 'bi-exclamation-triangle-fill', label: 'ขอความช่วย', color: '#fee2e2', textColor: '#991b1b', action: 'callForHelp' }
    ]
  },
  admin: {
    label: 'แอดมิน',
    theme: 'theme-admin',
    color: '#7c3aed',
    icon: 'bi-headset',
    greeting: 'มีงานรอมอบหมายอยู่นะ!',
    quickActions: [
      { icon: 'bi-plus-circle-fill', label: 'เปิดงาน', color: '#ede9fe', textColor: '#5b21b6', action: 'openNewJob' },
      { icon: 'bi-person-plus-fill', label: 'ลูกค้าใหม่', color: '#ffedd5', textColor: '#9a3412', action: 'addCustomer' },
      { icon: 'bi-telephone-fill', label: 'โทรลูกค้า', color: '#dbeafe', textColor: '#1e40af', action: 'callCustomer' },
      { icon: 'bi-chat-dots-fill', label: 'ส่ง LINE', color: '#d1fae5', textColor: '#065f46', action: 'sendLine' },
      { icon: 'bi-bell-fill', label: 'จี้ช่าง', color: '#fee2e2', textColor: '#991b1b', action: 'nudgeTech' },
      { icon: 'bi-clipboard2-data', label: 'รายงาน', color: '#cffafe', textColor: '#164e63', action: 'viewReport' },
      { icon: 'bi-calendar-check', label: 'นัดหมาย', color: '#fef9c3', textColor: '#713f12', action: 'addAppointment' },
      { icon: 'bi-cart-fill', label: 'สั่งซื้อ', color: '#d1fae5', textColor: '#065f46', action: 'openPO' },
      { icon: 'bi-robot', label: 'AI ช่วยซ่อม', color: '#ede9fe', textColor: '#5b21b6', action: 'openAICompanion' },
      { icon: 'bi-magic', label: 'จ่ายงาน V2', color: '#dbeafe', textColor: '#1e40af', action: 'openSmartAssignV2' },
      { icon: 'bi-three-dots', label: 'เพิ่มเติม', color: '#f3f4f6', textColor: '#374151', action: 'moreActions' }
    ]
  },
  acct: {
    label: 'บัญชี',
    theme: 'theme-acct',
    color: '#0891b2',
    icon: 'bi-calculator',
    greeting: 'ตรวจสลิปและออกใบเสร็จได้เลย',
    quickActions: [
      { icon: 'bi-camera-fill', label: 'สแกนสลิป', color: '#cffafe', textColor: '#164e63', action: 'scanSlip' },
      { icon: 'bi-file-earmark-pdf-fill', label: 'ออกใบเสร็จ', color: '#d1fae5', textColor: '#065f46', action: 'createReceipt' },
      { icon: 'bi-qr-code', label: 'QR รับเงิน', color: '#dbeafe', textColor: '#1e40af', action: 'showQR' },
      { icon: 'bi-receipt', label: 'สร้างบิล', color: '#ffedd5', textColor: '#9a3412', action: 'createBill' }
    ]
  },
  exec: {
    label: 'ผู้บริหาร',
    theme: 'theme-exec',
    color: '#d97706',
    icon: 'bi-bar-chart-line',
    greeting: 'Daily Pulse พร้อมแล้ว',
    quickActions: [
      { icon: 'bi-bar-chart-fill', label: 'Dashboard', color: '#fef9c3', textColor: '#713f12', action: 'viewDashboard' },
      { icon: 'bi-megaphone-fill', label: 'จี้งานด่วน', color: '#fee2e2', textColor: '#991b1b', action: 'urgentAction' },
      { icon: 'bi-telephone-fill', label: 'โทรลูกค้า', color: '#d1fae5', textColor: '#065f46', action: 'callVIP' },
      { icon: 'bi-cart-fill', label: 'สั่งซื้อ', color: '#d1fae5', textColor: '#065f46', action: 'openPO' },
      { icon: 'bi-file-earmark-bar-graph', label: 'รายงาน P&L', color: '#dbeafe', textColor: '#1e40af', action: 'viewPL' },
      { icon: 'bi-star-fill', label: 'CSAT', color: '#fef3c7', textColor: '#92400e', action: 'openCSAT' },
      { icon: 'bi-file-earmark-text-fill', label: 'TOR', color: '#ffedd5', textColor: '#9a3412', action: 'openTOR' }
    ]
  }
};

// ===== LIVE DATA HELPERS =====
// แปลง job จาก GAS API ให้เป็นรูปแบบที่ PWA ใช้
function normalizeJob(j) {
  if (!j) return null;
  const statusRaw = (j.status || j.status_label || '').toLowerCase();
  let status = 'new';
  if (/เสร็จ|completed|done/.test(statusRaw)) status = 'done';
  else if (/กำลัง|เริ่มงาน|in.prog/.test(statusRaw)) status = 'inprog';
  else if (/รอชิ้น|waiting/.test(statusRaw)) status = 'waiting';
  else if (/ด่วน|urgent/.test(statusRaw)) status = 'urgent';
  else if (/ยกเลิก|cancel/.test(statusRaw)) status = 'cancel';

  // คำนวณ SLA จากวันที่สร้าง
  let sla = 999;
  try {
    const created = j.created || j.created_at || '';
    const parts = created.split(' ')[0].split('/');
    if (parts.length === 2) {
      const d = new Date(new Date().getFullYear(), parseInt(parts[1])-1, parseInt(parts[0]));
      const diffHrs = (Date.now() - d.getTime()) / 3600000;
      const slaHrs = 72; // default 72 hrs
      sla = Math.round((slaHrs - diffHrs) * 60); // minutes remaining
    }
  } catch(e) {}

  return {
    id: j.id || j.job_id || '-',
    title: j.symptom || j.device || j.title || 'ไม่ระบุอาการ',
    customer: j.customer || j.customer_name || '-',
    phone: j.phone || j.customer_phone || '-',
    status: status,
    statusLabel: j.status || j.status_label || '-',
    sla: sla,
    location: j.location || 'ร้าน',
    price: j.price || j.estimated_price || 0,
    tech: j.tech || j.technician || null,
    note: j.note || j.notes || j.remark || '',
    folder: j.folder || j.folder_url || '',
    created: j.created || j.created_at || '',
    raw: j
  };
}

// ===== INIT =====
window.addEventListener('load', () => {
  // Register Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/comphone-superapp/pwa/sw.js').catch(() => {});
  }

  // PWA Install prompt
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    APP.deferredInstall = e;
    setTimeout(() => {
      const banner = document.getElementById('install-banner');
      if (banner) banner.classList.remove('hidden');
    }, 3000);
  });

  // Offline detection
  window.addEventListener('offline', () => showOfflineBar(true));
  window.addEventListener('online', () => { showOfflineBar(false); syncOfflineQueue(); });

  // Start splash
  setTimeout(initApp, 1800);
});

function initApp() {
  const splash = document.getElementById('splash-screen');
  splash.style.opacity = '0';
  splash.style.transition = 'opacity 0.4s';
  setTimeout(() => splash.classList.add('hidden'), 400);

  // Load saved user
  const saved = localStorage.getItem('comphone_user');
  if (saved) {
    try {
      const data = JSON.parse(saved);
      APP.user = data;
      APP.role = data.role;
      APP.scriptUrl = data.scriptUrl;
      startMainApp();
    } catch {
      showSetup();
    }
  } else {
    showSetup();
  }
}

// ===== SETUP =====
function showSetup() {
  document.getElementById('setup-screen').classList.remove('hidden');
  const urlInput = document.getElementById('setup-url');
  if (urlInput && !urlInput.value) urlInput.value = DEFAULT_SCRIPT_URL;
}

let selectedRole = null;
function selectRole(el) {
  document.querySelectorAll('.role-option').forEach(r => r.classList.remove('selected'));
  el.classList.add('selected');
  selectedRole = el.dataset.role;
}

function completeSetup() {
  const name = document.getElementById('setup-name').value.trim();
  const phone = document.getElementById('setup-phone').value.trim();
  const url = document.getElementById('setup-url').value.trim();

  if (!name) { showToast('กรุณากรอกชื่อ'); return; }
  if (!selectedRole) { showToast('กรุณาเลือกบทบาท'); return; }

  const userData = { name, phone, role: selectedRole, scriptUrl: url, setupAt: Date.now() };
  localStorage.setItem('comphone_user', JSON.stringify(userData));

  APP.user = userData;
  APP.role = selectedRole;
  APP.scriptUrl = url;

  document.getElementById('setup-screen').classList.add('hidden');
  startMainApp();
}

// ===== MAIN APP =====
function startMainApp() {
  const app = document.getElementById('main-app');
  app.classList.remove('hidden');

  // Apply theme
  const roleConf = ROLES[APP.role] || ROLES.tech;
  app.className = 'screen ' + roleConf.theme;

  // Set user info
  const initial = APP.user.name.charAt(0).toUpperCase();
  document.getElementById('user-avatar').textContent = initial;
  document.getElementById('user-avatar').style.background = 'rgba(255,255,255,0.25)';
  document.getElementById('user-avatar').style.color = '#fff';

  const hour = new Date().getHours();
  const greet = hour < 12 ? 'อรุณสวัสดิ์' : hour < 17 ? 'สวัสดีตอนบ่าย' : 'สวัสดีตอนเย็น';
  document.getElementById('greeting-text').textContent = greet + ' 👋';
  document.getElementById('user-name-display').textContent = APP.user.name;

  // แสดง/ซ่อน nav-admin ตาม role
  const navAdmin = document.getElementById('nav-admin');
  if (navAdmin) {
    navAdmin.style.display = (APP.role === 'owner' || APP.role === 'admin') ? '' : 'none';
  }

  // Apply role-based UI guard (auth_guard.js)
  if (typeof applyRoleUI === 'function') applyRoleUI();

  // Force Password Change check
  if (APP.user && APP.user.force_change_pw === true) {
    setTimeout(() => showForcePasswordChangeModal(), 500);
  }

  // Render home ด้วย loading state ก่อน
  renderHome();
  renderProfile();

  // B1: Deep Link handler
  handleDeepLink();

  // โหลดข้อมูลจริงจาก GAS API
  loadLiveData();
}

async function loadLiveData() {
  try {
    const data = await window.AI_EXECUTOR.query({ action: 'getDashboardData' });
    if (!data || !data.success) return;

    // เก็บ jobs จาก API
    const rawJobs = data.jobs || data.summary && data.summary.recentJobs || [];
    APP.jobs = rawJobs.map(normalizeJob).filter(Boolean);
    APP.dashboardData = data;

    // อัปเดต UI
    renderHome();
    renderJobsBadge();

    // ถ้าอยู่หน้า jobs ให้ re-render
    if (APP.currentPage === 'jobs') renderJobsPage();
  } catch(e) {
    // ไม่มี internet — แสดง offline state
    showOfflineBar(true);
  }
}

function handleDeepLink() {
  try {
    const params = new URLSearchParams(window.location.search);
    const page = params.get('page');
    if (!page || page === 'home') return;

    const navBtn = document.getElementById('nav-' + page);
    // รอให้ DOM เรนเอร์ก่อน
    setTimeout(() => {
      goPage(page, navBtn);

      // ถ้ามี id ให้เปิด modal อัตโนมัติ
      const id = params.get('id');
      if (id) {
        setTimeout(() => {
          if (page === 'jobs') showJobDetail(id);
          else if (page === 'po') showPODetail(id);
        }, 800);
      }
    }, 300);
  } catch(e) {}
}

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

// ===== JOB CARD RENDER =====
function renderJobCard(job) {
  const statusMap = {
    urgent: { badge: 'badge-urgent', label: 'ด่วนมาก', border: 'urgent' },
    inprog: { badge: 'badge-inprog', label: 'กำลังซ่อม', border: 'inprog' },
    waiting: { badge: 'badge-wait', label: 'รอชิ้นส่วน', border: 'waiting' },
    done: { badge: 'badge-done', label: 'เสร็จแล้ว', border: 'done' },
    new: { badge: 'badge-new', label: 'รับเครื่องแล้ว', border: '' }
  };
  const s = statusMap[job.status] || statusMap.new;
  const slaHtml = job.sla < 0
    ? `<div class="sla-timer sla-breach"><i class="bi bi-clock-fill"></i> เกิน SLA ${Math.abs(job.sla)} นาที</div>`
    : job.sla < 120
    ? `<div class="sla-timer sla-warn"><i class="bi bi-clock"></i> เหลือ ${job.sla} นาที</div>`
    : `<div class="sla-timer sla-ok"><i class="bi bi-clock"></i> เหลือ ${Math.floor(job.sla/60)} ชม. ${job.sla%60} นาที</div>`;

  return `
    <div class="job-card ${s.border}" onclick="showJobDetail('${job.id}')">
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div>
          <div class="job-id">${job.id}</div>
          <div class="job-title">${job.title}</div>
          <div class="job-meta"><i class="bi bi-person-fill"></i> ${job.customer} &nbsp;|&nbsp; <i class="bi bi-telephone-fill"></i> ${job.phone}</div>
        </div>
        <span class="job-badge ${s.badge}">${s.label}</span>
      </div>
      ${job.status !== 'done' ? `<div style="margin-top:6px">${slaHtml}</div>` : ''}
      <div class="job-actions" onclick="event.stopPropagation()">
        ${job.status === 'new' ? `
          <button class="job-act-btn btn-primary-sm" onclick="assignJob('${job.id}')"><i class="bi bi-person-check"></i> มอบหมายช่าง</button>
          <button class="job-act-btn btn-gray-sm" onclick="showJobDetail('${job.id}')"><i class="bi bi-eye"></i> ดูรายละเอียด</button>
        ` : job.status === 'done' ? `
          <button class="job-act-btn btn-primary-sm" onclick="if(typeof openBillingModal==='function')openBillingModal('${job.id}');else showToast('กำลังออกใบเสร็จ...')"><i class="bi bi-file-earmark-pdf"></i> ออกใบเสร็จ</button>
          <button class="job-act-btn btn-gray-sm" onclick="showJobDetail('${job.id}')"><i class="bi bi-eye"></i> ดู</button>
        ` : `
          <button class="job-act-btn btn-primary-sm" onclick="openCameraForJob('${job.id}')"><i class="bi bi-camera"></i> รูปหน้างาน</button>
          <button class="job-act-btn btn-success-sm" onclick="markJobDone('${job.id}')"><i class="bi bi-check2"></i> เสร็จแล้ว</button>
          <button class="job-act-btn btn-gray-sm" onclick="showJobDetail('${job.id}')"><i class="bi bi-three-dots"></i></button>
        `}
      </div>
    </div>
  `;
}

// ===== JOBS PAGE =====
function renderJobsPage(filter = 'all') {
  const list = document.getElementById('jobs-list');
  let jobs = APP.jobs;
  if (filter !== 'all') jobs = jobs.filter(j => j.status === filter);
  list.innerHTML = jobs.length ? jobs.map(j => renderJobCard(j)).join('') : `<div style="text-align:center;padding:40px;color:#9ca3af"><i class="bi bi-clipboard2-x" style="font-size:40px;display:block;margin-bottom:8px"></i>ไม่พบงาน</div>`;
}

function filterJobs(val) {
  const q = val.toLowerCase();
  const filtered = APP.jobs.filter(j =>
    j.id.toLowerCase().includes(q) ||
    j.title.toLowerCase().includes(q) ||
    j.customer.toLowerCase().includes(q) ||
    j.phone.includes(q)
  );
  document.getElementById('jobs-list').innerHTML = filtered.map(j => renderJobCard(j)).join('');
}

function filterByStatus(status, btn) {
  document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  renderJobsPage(status);
}

function renderJobsBadge() {
  const urgent = APP.jobs.filter(j => j.status === 'urgent' || j.status === 'new').length;
  const badge = document.getElementById('jobs-badge');
  if (badge) { badge.textContent = urgent; badge.style.display = urgent ? 'flex' : 'none'; }
}

// ===== PROFILE PAGE =====
function renderProfile() {
  const roleConf = ROLES[APP.role] || ROLES.tech;
  const initial = APP.user.name.charAt(0).toUpperCase();

  const avatarLg = document.getElementById('profile-avatar-large');
  if (avatarLg) {
    avatarLg.textContent = initial;
    avatarLg.style.background = 'rgba(255,255,255,0.25)';
    avatarLg.style.color = '#fff';
  }
  const nameLg = document.getElementById('profile-name-large');
  if (nameLg) nameLg.textContent = APP.user.name;

  const roleBadge = document.getElementById('profile-role-badge');
  if (roleBadge) roleBadge.textContent = roleConf.label;
}

// ===== NAVIGATION =====
function goPage(page, btn) {
  const pageEl = document.getElementById('page-' + page);
  if (!pageEl) { showToast('ไม่พบหน้า ' + page); return; }

  document.querySelectorAll('.page').forEach(p => { p.classList.remove('active'); p.classList.add('hidden'); });
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

  pageEl.classList.add('active');
  pageEl.classList.remove('hidden');
  if (btn) btn.classList.add('active');
  APP.currentPage = page;

  if (page === 'jobs') renderJobsPage();
  if (page === 'profile') renderProfile();
  if (page === 'crm') loadCRMPage();
  if (page === 'attendance') loadAttendancePage();
  if (page === 'po') loadPurchaseOrderPage();
  if (page === 'dashboard') loadDashboardPage();
  if (page === 'inventory') {
    if (typeof loadInventoryPage === 'function') loadInventoryPage();
    else if (typeof openInventoryPage === 'function') openInventoryPage();
  }
  if (page === 'admin') {
    if (typeof loadAdminPanel === 'function') loadAdminPanel();
  }
  if (page === 'reports') {
    if (typeof loadReportsPage === 'function') loadReportsPage();
  }
  if (page === 'customer-portal') {
    if (typeof loadCustomerPortalPage === 'function') loadCustomerPortalPage();
  }
  if (page === 'notifications') {
    if (typeof loadNotificationCenter === 'function') loadNotificationCenter();
  }
}

// ===== JOB DETAIL MODAL =====
function showJobDetail(jobId) {
  const job = APP.jobs.find(j => j.id === jobId);
  if (!job) return;
  const s = { urgent:'badge-urgent', inprog:'badge-inprog', waiting:'badge-wait', done:'badge-done', new:'badge-new' };
  const sl = { urgent:'ด่วนมาก', inprog:'กำลังซ่อม', waiting:'รอชิ้นส่วน', done:'เสร็จแล้ว', new:'รับเครื่องแล้ว' };

  document.getElementById('modal-job-content').innerHTML = `
    <div style="padding:0 16px 16px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <div>
          <div class="job-id">${job.id}</div>
          <div style="font-size:18px;font-weight:800;color:#111827;margin-top:2px">${job.title}</div>
        </div>
        <span class="job-badge ${s[job.status]}">${sl[job.status]}</span>
      </div>
      <div style="background:#f9fafb;border-radius:14px;padding:14px;margin-bottom:12px">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:12px">
          <div><div style="color:#9ca3af;font-weight:600">ลูกค้า</div><div style="font-weight:700;color:#111827">${job.customer}</div></div>
          <div><div style="color:#9ca3af;font-weight:600">เบอร์โทร</div><div style="font-weight:700;color:#0d6efd">${job.phone}</div></div>
          <div><div style="color:#9ca3af;font-weight:600">ราคาประเมิน</div><div style="font-weight:700;color:#10b981">฿${job.price.toLocaleString()}</div></div>
          <div><div style="color:#9ca3af;font-weight:600">ช่าง</div><div style="font-weight:700;color:#111827">${job.tech || 'ยังไม่ได้มอบหมาย'}</div></div>
        </div>
      </div>
      <div style="margin-bottom:12px">
        <div class="section-label">รูปหน้างาน</div>
        <div class="photo-row">
          <div class="photo-thumb-sm"><i class="bi bi-image"></i></div>
          <div class="photo-thumb-sm"><i class="bi bi-image"></i></div>
          <div class="photo-add-sm" onclick="openCameraForJob('${job.id}')"><i class="bi bi-plus"></i></div>
        </div>
      </div>
      <div style="display:flex;gap:8px">
        <button class="job-act-btn btn-primary-sm" style="flex:1;padding:12px" onclick="openCameraForJob('${job.id}');closeModal('modal-job')">
          <i class="bi bi-camera"></i> ถ่ายรูป
        </button>
        <button class="job-act-btn btn-success-sm" style="flex:1;padding:12px" onclick="markJobDone('${job.id}');closeModal('modal-job')">
          <i class="bi bi-check2-circle"></i> เสร็จแล้ว
        </button>
      </div>
      <button class="job-act-btn btn-gray-sm" style="width:100%;margin-top:8px;padding:12px" onclick="callCustomer('${job.phone}')">
        <i class="bi bi-telephone-fill"></i> โทร ${job.customer}
      </button>
      ${job.status === 'done' ? `
      <button class="job-act-btn" style="width:100%;margin-top:8px;padding:12px;background:#f0fdf4;color:#166534;border:1px solid #bbf7d0;border-radius:12px;font-weight:700;cursor:pointer" id="btn-create-warranty-${job.id}">
        <i class="bi bi-shield-check"></i> สร้างใบรับประกัน
      </button>` : ''}
    </div>
  `;
  document.getElementById('modal-job').classList.remove('hidden');
  // เพิ่ม event listener ปุ่มรับประกัน (ถ้ามี)
  const warrantyBtn = document.getElementById('btn-create-warranty-' + jobId);
  if (warrantyBtn && typeof createWarrantyModal === 'function') {
    warrantyBtn.addEventListener('click', () => {
      closeModal('modal-job');
      createWarrantyModal(job.id, { customer_name: job.customer, description: job.title });
    });
  }
}

function closeModal(id) {
  document.getElementById(id).classList.add('hidden');
}

// ===== SEARCH =====
function showSearch() {
  document.getElementById('modal-search').classList.remove('hidden');
  setTimeout(() => document.getElementById('global-search-input').focus(), 100);
}

function globalSearch(val) {
  const q = val.toLowerCase().trim();
  const results = document.getElementById('search-results');
  if (!q) { results.innerHTML = '<div style="padding:20px;text-align:center;color:#9ca3af">พิมพ์เพื่อค้นหา</div>'; return; }

  const found = APP.jobs.filter(j =>
    j.id.toLowerCase().includes(q) || j.title.toLowerCase().includes(q) ||
    j.customer.toLowerCase().includes(q) || j.phone.includes(q)
  );
  results.innerHTML = found.length
    ? found.map(j => `<div style="padding:12px 16px;border-bottom:1px solid #f3f4f6;cursor:pointer" onclick="closeModal('modal-search');showJobDetail('${j.id}')">
        <div style="font-size:10px;color:#9ca3af">${j.id}</div>
        <div style="font-size:14px;font-weight:700;color:#111827">${j.title}</div>
        <div style="font-size:12px;color:#6b7280">${j.customer} · ${j.phone}</div>
      </div>`).join('')
    : '<div style="padding:20px;text-align:center;color:#9ca3af">ไม่พบผลลัพธ์</div>';
}

// ===== NOTIFICATIONS =====
function showNotifications() {
  const list = document.getElementById('notif-list');
  const d = APP.dashboardData;
  const alertsRaw = d && d.alerts ? d.alerts : {};
  const alerts = Array.isArray(alertsRaw) ? alertsRaw : (alertsRaw.items || []);

  if (alerts.length === 0) {
    list.innerHTML = '<div style="text-align:center;padding:40px;color:#9ca3af"><i class="bi bi-bell-slash" style="font-size:36px;display:block;margin-bottom:8px"></i>ไม่มีการแจ้งเตือน</div>';
  } else {
    list.innerHTML = alerts.map(a => {
      const isOverdue = (a.type||'').includes('OVERDUE');
      const isStock = (a.type||'').includes('STOCK');
      const color = isOverdue ? '#ef4444' : isStock ? '#f59e0b' : '#10b981';
      const icon = isOverdue ? 'bi-clock-fill' : isStock ? 'bi-box-seam-fill' : 'bi-info-circle-fill';
      const title = a.message || (a.data && a.data.customer_name ? `${a.id} — ${a.data.customer_name}` : '-');
      const sub = a.data && a.data.status_label ? `สถานะ: ${a.data.status_label}` : (isOverdue ? 'เกิน SLA' : isStock ? 'สต็อกต่ำ' : '');
      return `
        <div style="display:flex;align-items:center;gap:10px;padding:12px 16px;border-bottom:1px solid #f3f4f6">
          <div style="width:40px;height:40px;border-radius:50%;background:${color}20;display:flex;align-items:center;justify-content:center;flex-shrink:0">
            <i class="bi ${icon}" style="color:${color};font-size:18px"></i>
          </div>
          <div style="flex:1">
            <div style="font-size:13px;font-weight:700;color:#111827">${title}</div>
            <div style="font-size:11px;color:#6b7280">${sub}</div>
          </div>
        </div>
      `;
    }).join('');
  }
  document.getElementById('modal-notif').classList.remove('hidden');
  document.getElementById('notif-count').style.display = 'none';
}

// ===== ACTIONS =====
function doCheckin() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(pos => {
      showToast(`เช็คอินแล้ว 📍 ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
      saveOfflineAction({ type: 'checkin', lat: pos.coords.latitude, lng: pos.coords.longitude, time: Date.now() });
    }, () => showToast('เช็คอินแล้ว (ไม่พบ GPS)'));
  } else {
    showToast('เช็คอินแล้ว');
  }
}

function markJobDone(jobId) {
  // Delegate ไป markJobDoneV2 ซึ่งใช้ transitionJob จาก job_workflow.js
  if (typeof markJobDoneV2 === 'function') {
    markJobDoneV2(jobId);
  } else {
    const job = APP.jobs.find(j => j.id === jobId);
    if (job) { job.status = 'done'; renderHome(); renderJobsBadge(); }
    showToast('✅ บันทึกงานเสร็จแล้ว');
    callAPI('transitionJob', { job_id: jobId, new_status: 'งานเสร็จ', changed_by: (APP.user && APP.user.name) || APP.user || 'PWA' });
  }
}

function assignJob(jobId) { if (typeof openAssignJob === 'function') openAssignJob(jobId || ''); else showToast('กำลังเปิดหน้ามอบหมายช่าง...'); }

function openCameraForJob(jobId) {
  const input = document.getElementById('camera-input');
  input.dataset.jobId = jobId;
  input.click();
}

function openCamera(type) {
  const input = document.getElementById('camera-input');
  input.dataset.type = type;
  input.click();
}

function openCameraQuick() { openCamera('job'); }
function markDone() { showToast('เลือกงานที่ต้องการก่อน'); goPage('jobs', document.getElementById('nav-jobs')); }
function markWaiting() { showToast('เลือกงานที่ต้องการก่อน'); goPage('jobs', document.getElementById('nav-jobs')); }
function callForHelp() {
  // ส่ง LINE แจ้งเจ้าของร้านว่าช่างต้องการความช่วยเหลือ
  const user = APP.user || {};
  const jobId = APP.currentJobId || '';
  if (typeof QA !== 'undefined' && typeof QA.nudgeTech === 'function') {
    QA.nudgeTech({ jobId, techName: user.display_name || user.username || 'ช่าง', message: '🆘 ต้องการความช่วยเหลือ' });
  } else {
    callAPI('sendLineMessage', {
      message: `🆘 [ขอความช่วยเหลือ] ช่าง ${user.display_name || user.username || 'ช่าง'} ต้องการความช่วยเหลือ${jobId ? ' งาน #' + jobId : ''}`,
      room: 'OWNER',
      sent_by: user.username || 'system'
    }).then(() => showToast('✅ แจ้งเจ้าของร้านแล้ว 🆘')).catch(() => showToast('⚠️ ส่งไม่ได้ — ตรวจสอบ LINE Token'));
  }
}
function openNewJob() {
  // job_workflow.js โหลดแล้ว เรียกได้ตรงๆ
  if (document.getElementById('modal-new-job-content')) {
    // openNewJob จาก job_workflow.js override window.openNewJob แล้ว
    // แต่ถ้ายังไม่โหลด ใช้ fallback
    showToast('กำลังเปิดฟอร์มงานใหม่...');
  } else {
    showToast('กำลังเปิดฟอร์มงานใหม่...');
  }
}
function openNewJob_delayed() { const fn = setInterval(() => { if(typeof openNewJob === 'function' && document.getElementById('modal-new-job-content')) { clearInterval(fn); openNewJob(); } }, 100); setTimeout(() => clearInterval(fn), 3000); }
function addCustomer() {
  if (typeof openAddCustomerModal === 'function') openAddCustomerModal();
  else showToast('กำลังเปิดฟอร์มลูกค้าใหม่...');
}
function callCustomer(phone) { if (phone) window.location.href = 'tel:' + phone; else showToast('กำลังเปิดรายชื่อลูกค้า...'); }
function sendLine() {
  if (typeof QA !== 'undefined' && typeof QA.sendLine === 'function') QA.sendLine();
  else showToast('กำลังเปิด LINE...');
}
function nudgeTech() {
  if (typeof QA !== 'undefined' && typeof QA.nudgeTech === 'function') QA.nudgeTech();
  else showToast('ส่งการแจ้งเตือนช่างแล้ว 🔔');
}
function viewReport() { goPage('reports', document.getElementById('nav-reports')); }
function addAppointment() {
  if (typeof QA !== 'undefined' && typeof QA.addAppointment === 'function') QA.addAppointment();
  else showToast('กำลังเปดปฏิทิน...');
}
function moreActions() {
  // แสดง bottom sheet เมนูเพิ่มเติม
  const items = [
    { label: '📦 คลังสินค้า', action: () => goPage('inventory', document.getElementById('nav-inventory')) },
    { label: '🧾 ใบสั่งซื้อ', action: () => { if (typeof openPurchaseOrders === 'function') openPurchaseOrders(); else goPage('inventory', null); } },
    { label: '📊 รายงาน', action: () => goPage('reports', document.getElementById('nav-reports')) },
    { label: '🔔 การแจ้งเตือน', action: () => goPage('notifications', null) },
    { label: '⚙️ ตั้งค่า', action: () => goPage('admin', document.getElementById('nav-admin')) }
  ];
  const html = items.map(it => `<button class="btn btn-light w-100 text-start mb-2" onclick="this.closest('.modal').querySelector('[data-bs-dismiss]').click();(${it.action.toString()})()">${it.label}</button>`).join('');
  const modal = document.getElementById('modal-more-actions');
  if (modal) {
    modal.querySelector('#more-actions-body').innerHTML = html;
    new bootstrap.Modal(modal).show();
  } else {
    // fallback: ไปหน้า admin
    goPage('admin', document.getElementById('nav-admin'));
  }
}
function openPO() { openPurchaseOrders(); }
function scanSlip() { openCamera('slip'); }
function createReceipt() {
  // เปิด Billing modal — เลือกงานจากรายการงาน
  if (typeof openBillingModal === 'function') openBillingModal(null);
  else showToast('กำลังโหลด Billing module...');
}
function showQR() {
  // เปิด QR PromptPay modal
  if (typeof openQRPaymentModal === 'function') openQRPaymentModal(null);
  else showToast('กำลังโหลด QR module...');
}
function createBill() {
  // เปิด Billing modal — เหมือน createReceipt
  if (typeof openBillingModal === 'function') openBillingModal(null);
  else showToast('กำลังโหลด Billing module...');
}
function viewDashboard() { const navBtn = document.getElementById('nav-dashboard'); goPage('dashboard', navBtn); }
function urgentAction() {
  // ผู้บริหาร: ดู jobs ที่ urgent หรือ SLA เกิน
  goPage('jobs', document.getElementById('nav-jobs'));
  setTimeout(() => {
    const urgentFilter = document.getElementById('filter-urgent');
    if (urgentFilter) urgentFilter.click();
    else showToast('🔴 กรองงานด่วนแล้ว');
  }, 400);
}
function callVIP() {
  // ผู้บริหาร: ไปหน้า CRM เพื่อดูลูกค้า VIP
  goPage('crm', document.getElementById('nav-crm'));
  setTimeout(() => {
    if (typeof loadCRMPage === 'function') loadCRMPage();
  }, 300);
}
function viewPL() {
  if (typeof REPORTS === 'undefined') {
    goPage('reports', document.getElementById('nav-reports'));
    return;
  }
  REPORTS.currentTab = 'pl';
  goPage('reports', document.getElementById('nav-reports'));
}
function fabAction() {
  const actions = { tech: openCameraQuick, admin: openNewJob, acct: scanSlip, exec: viewDashboard };
  (actions[APP.role] || openNewJob)();
}

function handlePhoto(input) {
  const file = input.files[0];
  if (!file) return;

  // ตรวจขนาดไฟล์ (max 10MB)
  if (file.size > 10 * 1024 * 1024) {
    showToast('⚠️ ไฟล์ใหญ่เกินไป (max 10MB)');
    input.value = '';
    return;
  }

  const jobId = input.dataset.jobId || '';
  const type = input.dataset.type || 'job';
  const techName = (APP.user && (APP.user.name || APP.user.username)) || 'Unknown';

  showToast('📸 กำลังอ่านรูป...');

  const reader = new FileReader();
  reader.onload = async (e) => {
    const base64Full = e.target.result; // data:image/jpeg;base64,...
    const base64Data = base64Full.split(',')[1]; // เอาเฉพาะ base64 string
    const mimeType = file.type || 'image/jpeg';
    const fileName = file.name || `photo_${Date.now()}.jpg`;

    // แสดง preview
    showPhotoPreview_(base64Full, jobId, type);

    if (!navigator.onLine) {
      // Offline: บันทึกลง IndexedDB/localStorage
      showToast('📥 Offline — บันทึกไว้ จะ Sync เมื่อออนไลน์');
      saveOfflineAction({
        action: 'handleProcessPhotos',
        params: { base64: base64Data, mimeType, fileName, jobId, photoType: type, techName },
        time: Date.now()
      });
      input.value = '';
      return;
    }

    showToast('☁️ กำลังอัปโหลด...');

    try {
      const res = await callAPI('handleProcessPhotos', {
        base64: base64Data,
        mimeType,
        fileName,
        jobId,
        photoType: type,
        techName,
        username: techName
      });

      if (res && res.success) {
        showToast('✅ อัปโหลดรูปสำเร็จ!');
        // Refresh photo grid ถ้าอยู่หน้า camera
        if (document.getElementById('page-camera').classList.contains('active')) {
          loadRecentPhotos_(jobId);
        }
      } else {
        const errMsg = (res && res.error) || 'ไม่ทราบสาเหตุ';
        showToast('⚠️ อัปโหลดไม่สำเร็จ: ' + errMsg);
        // Fallback: save to offline queue
        saveOfflineAction({
          action: 'handleProcessPhotos',
          params: { base64: base64Data, mimeType, fileName, jobId, photoType: type, techName },
          time: Date.now()
        });
      }
    } catch (err) {
      showToast('⚠️ เน็ตเวิร์คขัดข้อง — บันทึกไว้ใน Queue');
      saveOfflineAction({
        action: 'handleProcessPhotos',
        params: { base64: base64Data, mimeType, fileName, jobId, photoType: type, techName },
        time: Date.now()
      });
    }
  };

  reader.onerror = () => showToast('❌ อ่านไฟล์ไม่ได้');
  reader.readAsDataURL(file);
  input.value = '';
}

// แสดง preview รูปที่เลือก
 function showPhotoPreview_(dataUrl, jobId, type) {
  const area = document.getElementById('photo-preview-area');
  if (!area) return;
  area.innerHTML = `
    <div class="photo-preview-wrap">
      <img src="${dataUrl}" class="photo-preview-img" alt="Preview">
      <div class="photo-preview-meta">
        <span class="badge bg-primary">${type === 'slip' ? '🧾 สลิป' : type === 'bill' ? '📄 บิล' : '📸 หน้างาน'}</span>
        ${jobId ? `<span class="badge bg-secondary">${jobId}</span>` : ''}
      </div>
    </div>`;
}

// โหลดรูปล่าสุดของงาน
async function loadRecentPhotos_(jobId) {
  const grid = document.getElementById('photo-grid');
  if (!grid) return;
  if (!jobId) { grid.innerHTML = '<p style="color:#9ca3af;font-size:13px;">เลือกงานก่อนเพื่อดูรูป</p>'; return; }
  grid.innerHTML = '<div class="spinner-border spinner-border-sm"></div>';
  const res = await callAPI('getPhotoGalleryData', { jobId });
  if (res && res.success && res.data && res.data.photos) {
    const photos = res.data.photos.slice(0, 12);
    grid.innerHTML = photos.map(p =>
      `<div class="photo-thumb" onclick="window.open('${p.url || p.driveUrl}','_blank')">
        <img src="${p.thumbnailUrl || p.url || p.driveUrl}" alt="photo" loading="lazy">
      </div>`
    ).join('') || '<p style="color:#9ca3af;font-size:13px;">ยังไม่มีรูป</p>';
  } else {
    grid.innerHTML = '<p style="color:#9ca3af;font-size:13px;">ไม่พบรูป</p>';
  }
}

// ===== PROFILE ACTIONS =====
function showProfile() { goPage('profile', document.getElementById('nav-profile')); }
function editProfile() { showToast('กำลังเปิดฟอร์มแก้ไข...'); }
function changeRole() {
  const roles = Object.keys(ROLES);
  const idx = roles.indexOf(APP.role);
  const next = roles[(idx + 1) % roles.length];
  APP.role = next;
  APP.user.role = next;
  localStorage.setItem('comphone_user', JSON.stringify(APP.user));
  const app = document.getElementById('main-app');
  app.className = 'screen ' + ROLES[next].theme;
  renderHome();
  renderProfile();
  showToast(`เปลี่ยนเป็น: ${ROLES[next].label}`);
}
function showSettings() {
  const url = prompt('Script URL:', APP.scriptUrl || '');
  if (url !== null) {
    APP.scriptUrl = url;
    APP.user.scriptUrl = url;
    localStorage.setItem('comphone_user', JSON.stringify(APP.user));
    showToast('บันทึก Script URL แล้ว');
  }
}
function toggleNotifications() {
  const toggle = document.getElementById('notif-toggle');
  APP.notifEnabled = !APP.notifEnabled;
  toggle.classList.toggle('on', APP.notifEnabled);
  if (APP.notifEnabled && 'Notification' in window) {
    Notification.requestPermission().then(p => showToast(p === 'granted' ? 'เปิดการแจ้งเตือนแล้ว 🔔' : 'ไม่ได้รับอนุญาต'));
  } else {
    showToast('ปิดการแจ้งเตือนแล้ว');
  }
}
function clearCache() {
  if (confirm('ล้างข้อมูลแคช?')) {
    caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k)))).then(() => showToast('ล้างแคชแล้ว'));
  }
}
function resetApp() {
  if (confirm('รีเซ็ตแอปและลบข้อมูลทั้งหมด?')) {
    localStorage.clear();
    location.reload();
  }
}

// ===== VOICE SEARCH =====
function startVoiceSearch() {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    showToast('เบราว์เซอร์ไม่รองรับ Voice Search');
    return;
  }
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const rec = new SR();
  rec.lang = 'th-TH';
  rec.onresult = e => {
    const text = e.results[0][0].transcript;
    const input = document.getElementById('global-search-input') || document.getElementById('jobs-search');
    if (input) { input.value = text; globalSearch(text); }
    showToast('🎤 ค้นหา: ' + text);
  };
  rec.onerror = () => showToast('ไม่ได้ยินเสียง ลองใหม่อีกครั้ง');
  rec.start();
  showToast('🎤 กำลังฟัง...');
}

// ===== API CALL =====
// callAPI(action, params) — ใช้ใน job_workflow.js และทั่วไป
// PHASE 20.4: เปลี่ยนจาก fetch โดยตรง → AI_EXECUTOR
const READ_ACTIONS = {
  getDashboardData: true, getJobStateConfig: true, getJobTimeline: true,
  getJobQRData: true, getPhotoGalleryData: true, inventoryOverview: true,
  getInventoryItemDetail: true, getStockMovementHistory: true, checkStock: true,
  barcodeLookup: true, listPurchaseOrders: true, getCustomer: true,
  listCustomers: true, getCustomerHistoryFull: true, getCustomerListWithStats: true,
  getCRMFollowUpSchedule: true, getCRMMetrics: true, getAfterSalesDue: true,
  getAfterSalesSummary: true, getAttendanceReport: true, getTechHistory: true,
  getAllTechsSummary: true, getBilling: true, listBillings: true, getReportData: true,
  getAuditLog: true, getAuditSummary: true, getSecurityStatus: true, getComphoneConfig: true,
  getSchemaInfo: true, systemStatus: true, health: true, help: true,
  verifySession: true, listUsers: true, geminiReorderSuggestion: true,
  getWarrantyByJobId: true, listWarranties: true, getTaxReport: true,
  getTaxReminder: true, getJobStatusPublic: true, getDriveSyncStatus: true
};

function isReadAction(action) {
  return !!READ_ACTIONS[action];
}

async function callAPI(action, params = {}) {
  if (!navigator.onLine) {
    saveOfflineAction({ action, params, time: Date.now() });
    return null;
  }
  try {
    const method = isReadAction(action) ? 'query' : 'execute';
    const data = await window.AI_EXECUTOR[method]({ action: action, payload: params });
    if (data && data._headers) delete data._headers;
    return data;
  } catch (e) {
    if (e.message && e.message.includes('APPROVAL_REQUIRED')) {
      showToast('กรุณาขออนุมัติการดำเนินการ', 'warning');
    }
    saveOfflineAction({ action, params, time: Date.now() });
    return null;
  }
}
// callApi(payload) — alias สำหรับ crm_attendance.js, purchase_order.js, dashboard.js
window.callApi = async function(payload) {
  payload = payload || {};
  const action = payload.action;
  if (!action) return { success: false, error: 'ไม่พบ action ใน payload' };

  // ลบ action ออกจาก payload เพื่อส่งใน AI_EXECUTOR
  const params = Object.assign({}, payload);
  delete params.action;

  try {
    const method = isReadAction(action) ? 'query' : 'execute';
    const data = await window.AI_EXECUTOR[method]({ action: action, payload: params });
    if (data && data._headers) delete data._headers;
    return data;
  } catch (e) {
    if (e.message && e.message.includes('APPROVAL_REQUIRED')) {
      return { success: false, error: 'APPROVAL_REQUIRED', message: 'กรุณาขออนุมัติการดำเนินการ' };
    }
    return { success: false, error: e.message };
  }
};

// ===== OFFLINE QUEUE =====
function saveOfflineAction(action) {
  const queue = JSON.parse(localStorage.getItem('comphone_offline_queue') || '[]');
  queue.push(action);
  localStorage.setItem('comphone_offline_queue', JSON.stringify(queue.slice(-50)));
}

async function syncOfflineQueue() {
  const queue = JSON.parse(localStorage.getItem('comphone_offline_queue') || '[]');
  if (!queue.length) return;
  showToast(`🔄 กำลัง Sync ${queue.length} รายการ...`);
  localStorage.removeItem('comphone_offline_queue');
}

// ===== OFFLINE BAR =====
function showOfflineBar(show, message) {
  const bar = document.getElementById('offline-bar');
  if (!bar) return;
  if (show) {
    bar.classList.remove('hidden');
    bar.style.display = 'flex';
    if (message) {
      const msgEl = bar.querySelector('span:not(.offline-queue-count)');
      if (msgEl) msgEl.textContent = message;
    }
  } else {
    bar.classList.add('hidden');
    bar.style.display = 'none';
    showToast('✅ เชื่อมต่ออินเทอร์เน็ตแล้ว');
  }
}

// ===== PWA INSTALL =====
function installPWA() {
  if (APP.deferredInstall) {
    APP.deferredInstall.prompt();
    APP.deferredInstall.userChoice.then(r => {
      if (r.outcome === 'accepted') showToast('✅ ติดตั้ง Comphone App แล้ว!');
      APP.deferredInstall = null;
      dismissInstall();
    });
  }
}
function dismissInstall() {
  document.getElementById('install-banner').classList.add('hidden');
}

// ===== TOAST =====
function showToast(msg) {
  const existing = document.getElementById('toast');
  if (existing) existing.remove();
  const t = document.createElement('div');
  t.id = 'toast';
  t.className = 'toast-msg';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2500);
}

// ===== HELPERS =====
function formatDate() {
  const d = new Date();
  const days = ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัส','ศุกร์','เสาร์'];
  const months = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
  return `วัน${days[d.getDay()]}ที่ ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear() + 543}`;
}
