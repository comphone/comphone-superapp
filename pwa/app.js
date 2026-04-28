/* ===== COMPHONE SUPERAPP — app.js ===== */
'use strict';

// ===== STATE =====
// URL source: GAS_CONFIG.url (from gas_config.js) > fallback
const DEFAULT_SCRIPT_URL = (window.GAS_CONFIG && window.GAS_CONFIG.url) || 'https://script.google.com/macros/s/AKfycbwy8k85i74jsnaIM2LmUJob733ewmU7Tk8MpukLKcV5f2Tl-7LTzy450ovmoh7ez105Hw/exec';

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
      { icon: 'bi-cash-stack', label: 'ขายสินค้า', color: '#fef3c7', textColor: '#92400e', action: 'openPOS' },
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
  // online/offline listeners delegated to offline_db.js (avoids duplicate registration)
  // offline_db.js handles: showOfflineBar + syncOfflineQueue

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

  // แสดง/ซ่อน admin ตาม role (now in More menu)
  const moreAdmin = document.getElementById('more-admin-btn');
  if (moreAdmin) {
    moreAdmin.style.display = (APP.role === 'owner' || APP.role === 'admin') ? '' : 'none';
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

// Home Render → app_home.js
// Jobs Page → app_jobs.js
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
  if (page === 'analytics') {
    if (typeof openAnalyticsSection === 'function') openAnalyticsSection();
  }
}

// Actions + Search + Notifications → app_actions.js

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
// callApi(payload) — REMOVED: api_client.js is the Single Source of Truth for window.callApi
// See api_client.js line 427 — do NOT re-add window.callApi override here

// ===== OFFLINE QUEUE =====
// saveOfflineAction — delegated to offline_db.js (single source of truth)
// If offline_db.js hasn't loaded yet, fallback to localStorage
if (typeof window.saveOfflineAction !== 'function') {
  window.saveOfflineAction = function(action) {
    const queue = JSON.parse(localStorage.getItem('comphone_offline_queue') || '[]');
    queue.push(action);
    localStorage.setItem('comphone_offline_queue', JSON.stringify(queue.slice(-50)));
  };
}

async function syncOfflineQueue() {
  // FIXED: Actually replay queued actions instead of deleting them
  // Priority: IndexedDB (offline_db.js) > localStorage fallback
  try {
    if (typeof syncOfflineQueueLegacy === 'function') {
      await syncOfflineQueueLegacy(); // Uses IndexedDB action_queue
      return;
    }
  } catch(e) { console.warn('[Sync] IndexedDB sync failed, trying localStorage:', e); }

  // Fallback: localStorage queue replay
  const queue = JSON.parse(localStorage.getItem('comphone_offline_queue') || '[]');
  if (!queue.length) return;
  showToast(`🔄 กำลัง Sync ${queue.length} รายการ...`);
  let synced = 0;
  for (const item of queue) {
    try {
      if (item.action && navigator.onLine) {
        await callApi(item.action, item.params || {});
        synced++;
      }
    } catch(e) { console.warn('[Sync] Failed:', item.action, e); }
  }
  localStorage.removeItem('comphone_offline_queue');
  showToast(`✅ Synced ${synced}/${queue.length} รายการ`);
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

// ===== MORE MENU (Bottom Sheet) =====
function showMoreMenu() {
  document.getElementById('more-menu-overlay').style.display = 'flex';
  document.body.style.overflow = 'hidden';
}
function closeMoreMenu() {
  document.getElementById('more-menu-overlay').style.display = 'none';
  document.body.style.overflow = '';
}
function navigateFromMore(page) {
  closeMoreMenu();
  // Highlight the More button since these pages live under it
  const moreBtn = document.getElementById('nav-more');
  goPage(page, moreBtn);
}
