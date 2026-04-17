/* ===== COMPHONE SUPERAPP — app.js ===== */
'use strict';

// ===== STATE =====
const DEFAULT_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby-IRTHbHMfCZ8TiXSAJ8zr_T6xQcmJNvGNYYI2X2VoAEMPwYtHwlCp1mf9f6IzWSSJfQ/exec';

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
      { icon: 'bi-file-earmark-bar-graph', label: 'รายงาน P&L', color: '#dbeafe', textColor: '#1e40af', action: 'viewPL' }
    ]
  }
};

// ===== SAMPLE DATA =====
const SAMPLE_JOBS = [
  { id: 'JOB-0417-001', title: 'iPhone 14 Pro — จอแตก', customer: 'สมศักดิ์ วงศ์ดี', phone: '081-234-5678', status: 'urgent', sla: -120, location: 'ลาดพร้าว 71', price: 1500, tech: 'สมชาย' },
  { id: 'JOB-0417-002', title: 'Samsung S23 — แบตเสื่อม', customer: 'มาลี ใจดี', phone: '089-876-5432', status: 'inprog', sla: 90, location: 'ร้าน', price: 850, tech: 'วิชัย' },
  { id: 'JOB-0417-003', title: 'OPPO Reno8 — เมนบอร์ดเสีย', customer: 'ประสิทธิ์ มั่นคง', phone: '062-111-2222', status: 'waiting', sla: 240, location: 'ร้าน', price: 2200, tech: 'สมชาย' },
  { id: 'JOB-0417-004', title: 'Xiaomi 13T — หน้าจอดำ', customer: 'วิชัย สุขใจ', phone: '091-333-4444', status: 'new', sla: 480, location: 'ร้าน', price: 1200, tech: null },
  { id: 'JOB-0417-005', title: 'iPhone 13 — แบตหมดเร็ว', customer: 'อรุณี ดีงาม', phone: '086-555-6666', status: 'done', sla: 0, location: 'ร้าน', price: 650, tech: 'วิชัย' }
];

const SAMPLE_NOTIFS = [
  { icon: 'bi-exclamation-triangle-fill', color: '#ef4444', title: 'JOB-001 เกิน SLA 2 ชั่วโมง', sub: 'iPhone 14 Pro · สมศักดิ์', time: '5 นาทีที่แล้ว' },
  { icon: 'bi-box-seam-fill', color: '#f59e0b', title: 'สต็อก "กระจก iPhone 14" เหลือ 2 ชิ้น', sub: 'ต่ำกว่าจุดสั่งซื้อ', time: '1 ชั่วโมงที่แล้ว' },
  { icon: 'bi-trophy-fill', color: '#10b981', title: 'สมชาย ได้รับ Kudos 5 ดาว', sub: 'จากลูกค้า 3 ราย', time: '2 ชั่วโมงที่แล้ว' }
];

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

  // Load jobs
  APP.jobs = SAMPLE_JOBS;

  // Render home
  renderHome();
  renderJobsBadge();
  renderProfile();
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

  const statsMap = {
    tech: [
      { label: 'งานของฉัน', value: '3', sub: 'วันนี้', trend: '', color: '#0d6efd' },
      { label: 'Kudos เดือนนี้', value: '12 ⭐', sub: 'อันดับ 2 ของทีม', trend: '', color: '#f59e0b' }
    ],
    admin: [
      { label: 'งานวันนี้', value: '12', sub: '+3 จากเมื่อวาน', trend: 'up', color: '#7c3aed' },
      { label: 'รอมอบหมาย', value: '4', sub: 'ต้องจัดการด่วน', trend: 'down', color: '#ef4444' },
      { label: 'เสร็จวันนี้', value: '7', sub: 'เป้า 10 งาน', trend: 'up', color: '#10b981' },
      { label: 'ลูกค้าใหม่', value: '2', sub: 'วันนี้', trend: '', color: '#f97316' }
    ],
    acct: [
      { label: 'รายรับวันนี้', value: '฿8,450', sub: '+12% vs เมื่อวาน', trend: 'up', color: '#10b981' },
      { label: 'รอเก็บเงิน', value: '฿3,200', sub: '3 บิล', trend: 'down', color: '#ef4444' },
      { label: 'สลิปรอตรวจ', value: '2', sub: 'ใบ', trend: '', color: '#f59e0b' },
      { label: 'ออกใบเสร็จ', value: '5', sub: 'ใบวันนี้', trend: '', color: '#0891b2' }
    ],
    exec: [
      { label: 'กำไรวันนี้', value: '฿12,450', sub: '+18% vs เมื่อวาน', trend: 'up', color: '#d97706' },
      { label: 'งานค้าง', value: '5', sub: '2 เกิน SLA', trend: 'down', color: '#ef4444' },
      { label: 'งานเสร็จ', value: '7', sub: 'เป้า 10/วัน', trend: 'up', color: '#0d6efd' },
      { label: 'ลูกค้าพึงพอใจ', value: '4.8★', sub: 'จาก 12 รีวิว', trend: 'up', color: '#7c3aed' }
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
  const myJobs = APP.jobs.filter(j => j.tech === APP.user.name.split(' ')[0] || j.status !== 'done');
  return `
    <div class="checkin-banner" style="background:linear-gradient(135deg,#0d6efd,#0a58ca)">
      <div class="checkin-icon-wrap"><i class="bi bi-geo-alt-fill"></i></div>
      <div class="checkin-info">
        <h6>ยังไม่ได้เช็คอิน</h6>
        <p>${formatDate()}</p>
      </div>
      <button class="checkin-action-btn" style="color:#0d6efd" onclick="doCheckin()">เช็คอิน</button>
    </div>
    <div style="padding:0 12px 4px"><div class="section-label">งานของฉัน (${myJobs.length} งาน)</div></div>
    ${myJobs.slice(0,3).map(j => renderJobCard(j)).join('')}
    <div class="kudos-banner">
      <div style="font-size:36px">⭐</div>
      <div>
        <div style="font-weight:700;font-size:13px">Kudos เดือนนี้</div>
        <div style="font-size:22px;font-weight:900">12 ดาว</div>
        <div style="font-size:11px;opacity:0.8">อันดับ 2 ของทีม</div>
      </div>
    </div>
  `;
}

function renderAdminHome() {
  const pending = APP.jobs.filter(j => j.status === 'new');
  return `
    <div style="padding:0 12px 4px"><div class="section-label">รอมอบหมายช่าง <span style="display:inline-block;width:8px;height:8px;background:#ef4444;border-radius:50%;margin-left:4px;"></span></div></div>
    ${pending.map(j => renderJobCard(j)).join('')}
    <div style="padding:0 12px 4px;margin-top:4px"><div class="section-label">Follow-up วันนี้</div></div>
    <div class="bill-row">
      <div class="avatar-sm" style="background:#ede9fe;color:#7c3aed">ก</div>
      <div><div style="font-size:13px;font-weight:700">กมลา รักดี</div><div class="bill-sub">ซ่อมเสร็จ 3 วันที่แล้ว — ยังไม่ได้ติดตาม</div></div>
      <button class="bill-status-badge" style="background:#ede9fe;color:#7c3aed;border:none;cursor:pointer" onclick="showToast('กำลังโทร...')">โทร</button>
    </div>
    <div class="bill-row">
      <div class="avatar-sm" style="background:#fef9c3;color:#d97706">ป</div>
      <div><div style="font-size:13px;font-weight:700">ประยุทธ์ ใจเย็น</div><div class="bill-sub">ครบกำหนดรับประกัน 7 วัน</div></div>
      <button class="bill-status-badge" style="background:#fef9c3;color:#d97706;border:none;cursor:pointer" onclick="showToast('เปิด LINE...')">LINE</button>
    </div>
  `;
}

function renderAcctHome() {
  const pending = APP.jobs.filter(j => j.status === 'done');
  return `
    <div class="slip-scan-card">
      <i class="bi bi-camera-fill"></i>
      <h6>กดเพื่อสแกนสลิปใหม่</h6>
      <p>AI จะตรวจยอดและจับคู่บิลอัตโนมัติ</p>
      <button class="slip-scan-btn" onclick="scanSlip()"><i class="bi bi-camera"></i> เปิดกล้อง</button>
    </div>
    <div style="padding:0 12px 4px"><div class="section-label">บิลรอเก็บเงิน</div></div>
    ${pending.map(j => `
      <div class="bill-row">
        <div class="avatar-sm" style="background:#fee2e2;color:#dc2626">${j.customer.charAt(0)}</div>
        <div><div class="bill-amount">฿${j.price.toLocaleString()}</div><div class="bill-sub">${j.id} · ${j.customer}</div></div>
        <span class="bill-status-badge" style="background:#fee2e2;color:#dc2626">รอเก็บ</span>
      </div>
    `).join('')}
    <div class="mini-chart-card">
      <div class="chart-title">สรุปภาษีวันนี้ (อัตโนมัติ)</div>
      <div style="display:flex;justify-content:space-between;font-size:12px;color:#374151">
        <div><span style="font-weight:700">VAT 7%</span><br><span style="font-size:18px;font-weight:900;color:#0891b2">฿591.50</span></div>
        <div><span style="font-weight:700">WHT 3%</span><br><span style="font-size:18px;font-weight:900;color:#7c3aed">฿253.50</span></div>
        <div><span style="font-weight:700">ยอดสุทธิ</span><br><span style="font-size:18px;font-weight:900;color:#10b981">฿7,605</span></div>
      </div>
    </div>
  `;
}

function renderExecHome() {
  return `
    <div style="padding:0 12px 4px"><div class="section-label">แจ้งเตือนด่วน</div></div>
    <div class="alert-card danger" onclick="showToast('เปิดรายละเอียดงาน...')">
      <i class="bi bi-exclamation-triangle-fill"></i>
      <div><div style="font-weight:700">JOB-001 เกิน SLA 2 ชั่วโมง</div><div style="font-size:11px;font-weight:400">iPhone 14 Pro · สมศักดิ์ วงศ์ดี</div></div>
      <button class="alert-action-btn" style="background:#ef4444;color:#fff" onclick="event.stopPropagation();showToast('ส่งการแจ้งเตือนช่างแล้ว')">จี้ช่าง</button>
    </div>
    <div class="alert-card warning" onclick="showToast('เปิดหน้าสต็อก...')">
      <i class="bi bi-box-seam-fill"></i>
      <div><div style="font-weight:700">สต็อก "กระจก iPhone 14" เหลือ 2 ชิ้น</div><div style="font-size:11px;font-weight:400">ต่ำกว่าจุดสั่งซื้อ (5 ชิ้น)</div></div>
      <button class="alert-action-btn" style="background:#f59e0b;color:#000" onclick="event.stopPropagation();showToast('เปิดใบสั่งซื้อ...')">สั่งซื้อ</button>
    </div>
    <div class="alert-card success">
      <i class="bi bi-trophy-fill"></i>
      <div><div style="font-weight:700">สมชาย ได้รับ Kudos 5 ดาว</div><div style="font-size:11px;font-weight:400">จากลูกค้า 3 รายวันนี้</div></div>
    </div>
    <div class="mini-chart-card">
      <div class="chart-title">รายได้ 7 วันล่าสุด (บาท)</div>
      <div class="bar-chart-row">
        ${[35,50,42,55,48,38,60].map((h,i) => `
          <div class="bar-item">
            <div class="bar-fill" style="height:${h}px;background:${i===6?'#0d6efd':'#bfdbfe'}"></div>
            <div class="bar-lbl" style="color:${i===6?'#0d6efd':'#9ca3af'};font-weight:${i===6?'700':'400'}">${['จ','อ','พ','พฤ','ศ','ส','วันนี้'][i]}</div>
          </div>
        `).join('')}
      </div>
    </div>
    <div style="padding:0 12px 4px"><div class="section-label">อันดับช่างสัปดาห์นี้</div></div>
    <div class="rank-card">
      <div class="rank-num">1</div>
      <div class="avatar-sm" style="background:#fef9c3;color:#d97706">ส</div>
      <div style="flex:1"><div style="font-size:13px;font-weight:700">สมชาย ทำดี</div><div class="stars-row">★★★★★ <span style="color:#9ca3af;font-size:11px">12 Kudos</span></div></div>
      <div style="text-align:right"><div style="font-size:12px;font-weight:700;color:#10b981">7 งาน</div><div style="font-size:10px;color:#9ca3af">สัปดาห์นี้</div></div>
    </div>
    <div class="rank-card">
      <div class="rank-num silver">2</div>
      <div class="avatar-sm" style="background:#dbeafe;color:#1e40af">ว</div>
      <div style="flex:1"><div style="font-size:13px;font-weight:700">วิชัย มุ่งมั่น</div><div class="stars-row">★★★★☆ <span style="color:#9ca3af;font-size:11px">8 Kudos</span></div></div>
      <div style="text-align:right"><div style="font-size:12px;font-weight:700;color:#10b981">5 งาน</div><div style="font-size:10px;color:#9ca3af">สัปดาห์นี้</div></div>
    </div>
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
          <button class="job-act-btn btn-primary-sm" onclick="showToast('กำลังออกใบเสร็จ...')"><i class="bi bi-file-earmark-pdf"></i> ออกใบเสร็จ</button>
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
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

  document.getElementById('page-' + page).classList.add('active');
  if (btn) btn.classList.add('active');
  APP.currentPage = page;

  if (page === 'jobs') renderJobsPage();
  if (page === 'profile') renderProfile();
  if (page === 'crm') loadCRMPage();
  if (page === 'attendance') loadAttendancePage();
  if (page === 'po') loadPurchaseOrderPage();
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
    </div>
  `;
  document.getElementById('modal-job').classList.remove('hidden');
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
  list.innerHTML = SAMPLE_NOTIFS.map(n => `
    <div style="display:flex;align-items:center;gap:10px;padding:12px 16px;border-bottom:1px solid #f3f4f6">
      <div style="width:40px;height:40px;border-radius:50%;background:${n.color}20;display:flex;align-items:center;justify-content:center;flex-shrink:0">
        <i class="bi ${n.icon}" style="color:${n.color};font-size:18px"></i>
      </div>
      <div style="flex:1">
        <div style="font-size:13px;font-weight:700;color:#111827">${n.title}</div>
        <div style="font-size:11px;color:#6b7280">${n.sub}</div>
      </div>
      <div style="font-size:10px;color:#9ca3af;flex-shrink:0">${n.time}</div>
    </div>
  `).join('');
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
  const job = APP.jobs.find(j => j.id === jobId);
  if (job) { job.status = 'done'; renderHome(); renderJobsBadge(); }
  showToast('✅ บันทึกงานเสร็จแล้ว');
  callAPI('updateJobStatus', { jobId, status: 'done' });
}

function assignJob(jobId) {
  showToast('กำลังเปิดหน้ามอบหมายช่าง...');
}

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
function callForHelp() { showToast('ส่งการแจ้งเตือนแล้ว 🆘'); }
function openNewJob() { showToast('กำลังเปิดฟอร์มงานใหม่...'); }
function addCustomer() { showToast('กำลังเปิดฟอร์มลูกค้าใหม่...'); }
function callCustomer(phone) { if (phone) window.location.href = 'tel:' + phone; else showToast('กำลังเปิดรายชื่อลูกค้า...'); }
function sendLine() { showToast('กำลังเปิด LINE...'); }
function nudgeTech() { showToast('ส่งการแจ้งเตือนช่างแล้ว 🔔'); }
function viewReport() { showToast('กำลังโหลดรายงาน...'); }
function addAppointment() { showToast('กำลังเปิดปฏิทิน...'); }
function moreActions() { showToast('เพิ่มเติม...'); }
function openPO() { openPurchaseOrders(); }
function scanSlip() { openCamera('slip'); }
function createReceipt() { showToast('กำลังสร้างใบเสร็จ...'); }
function showQR() { showToast('กำลังสร้าง QR รับเงิน...'); }
function createBill() { showToast('กำลังสร้างบิล...'); }
function viewDashboard() { showToast('กำลังโหลด Dashboard...'); }
function urgentAction() { showToast('ส่งการแจ้งเตือนด่วนแล้ว'); }
function callVIP() { showToast('กำลังโทรหาลูกค้า VIP...'); }
function viewPL() { showToast('กำลังโหลดรายงาน P&L...'); }
function fabAction() {
  const actions = { tech: openCameraQuick, admin: openNewJob, acct: scanSlip, exec: viewDashboard };
  (actions[APP.role] || openNewJob)();
}

function handlePhoto(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const jobId = input.dataset.jobId;
    const type = input.dataset.type || 'job';
    showToast(`📸 รับรูปแล้ว — กำลังอัปโหลด...`);
    // Save to offline queue if no internet
    saveOfflineAction({ type: 'photo', jobId, photoType: type, dataUrl: e.target.result.substring(0, 100), time: Date.now() });
    setTimeout(() => showToast('✅ อัปโหลดรูปสำเร็จ'), 1500);
  };
  reader.readAsDataURL(file);
  input.value = '';
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
async function callAPI(action, params = {}) {
  if (!APP.scriptUrl) return null;
  if (!navigator.onLine) {
    saveOfflineAction({ action, params, time: Date.now() });
    return null;
  }
  try {
    const url = `${APP.scriptUrl}?action=${action}&${new URLSearchParams(params)}`;
    const res = await fetch(url);
    return await res.json();
  } catch (e) {
    saveOfflineAction({ action, params, time: Date.now() });
    return null;
  }
}

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
function showOfflineBar(show) {
  let bar = document.getElementById('offline-bar');
  if (!bar && show) {
    bar = document.createElement('div');
    bar.id = 'offline-bar';
    bar.className = 'offline-bar';
    bar.textContent = '⚠️ ออฟไลน์ — ข้อมูลจะ Sync เมื่อเชื่อมต่ออินเทอร์เน็ต';
    document.body.prepend(bar);
  } else if (bar && !show) {
    bar.remove();
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
