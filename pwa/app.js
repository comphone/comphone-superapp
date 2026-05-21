/* ===== COMPHONE SUPERAPP — app.js ===== */
'use strict';

// ===== STATE =====
// URL source: gas_config.js / version_config.js. Do not hardcode deployment URLs here.
const DEFAULT_SCRIPT_URL = window.COMPHONE_GAS_URL || (window.GAS_CONFIG && window.GAS_CONFIG.url) || '';
const LAST_PAGE_KEY = 'comphone_last_mobile_page';
const QUICK_ACTIONS_KEY = 'comphone_mobile_quick_actions';
const RESTORABLE_PAGES = new Set([
  'home', 'jobs', 'camera', 'crm', 'po', 'attendance', 'profile',
  'reports', 'inventory', 'billing', 'warranty', 'dashboard',
  'analytics', 'revenue', 'tax', 'performance', 'vision', 'line-center', 'admin'
]);

const MENU_GROUPS = [
  {
    label: 'งานบริการ',
    items: [
      { id: 'jobs', page: 'jobs', icon: 'bi-clipboard2-check-fill', label: 'งานทั้งหมด' },
      { id: 'openNewJob', fn: 'openNewJob', icon: 'bi-plus-circle-fill', label: 'เปิดงาน' },
      { id: 'crm', page: 'crm', icon: 'bi-people-fill', label: 'ลูกค้า' },
      { id: 'addCustomer', fn: 'addCustomer', icon: 'bi-person-plus-fill', label: 'ลูกค้าใหม่' },
      { id: 'attendance', page: 'attendance', icon: 'bi-clock-fill', label: 'ลงเวลา' },
      { id: 'warranty', page: 'warranty', icon: 'bi-shield-check', label: 'รับประกัน' }
    ]
  },
  {
    label: 'คลังและจัดซื้อ',
    items: [
      { id: 'inventory', page: 'inventory', icon: 'bi-boxes', label: 'สต็อก' },
      { id: 'po', page: 'po', icon: 'bi-cart-fill', label: 'สั่งซื้อ' },
      { id: 'billing', page: 'billing', icon: 'bi-receipt', label: 'วางบิล' },
      { id: 'revenue', page: 'revenue', icon: 'bi-currency-exchange', label: 'รายรับ' },
      { id: 'tax', page: 'tax', icon: 'bi-file-earmark-text', label: 'ภาษี' }
    ]
  },
  {
    label: 'บริหารและวิเคราะห์',
    items: [
      { id: 'dashboard', page: 'dashboard', icon: 'bi-speedometer2', label: 'Dashboard' },
      { id: 'vision', page: 'vision', icon: 'bi-stars', label: 'AI Vision' },
      { id: 'line-center', page: 'line-center', icon: 'bi-broadcast-pin', label: 'LINE Center' },
      { id: 'reports', page: 'reports', icon: 'bi-graph-up-arrow', label: 'รายงาน' },
      { id: 'analytics', page: 'analytics', icon: 'bi-activity', label: 'Analytics' },
      { id: 'performance', page: 'performance', icon: 'bi-lightning-charge-fill', label: 'Performance' }
    ]
  },
  {
    label: 'ระบบ',
    items: [
      { id: 'notifications', page: 'notifications', icon: 'bi-bell-fill', label: 'แจ้งเตือน' },
      { id: 'customer-portal', page: 'customer-portal', icon: 'bi-person-badge', label: 'Portal' },
      { id: 'profile', page: 'profile', icon: 'bi-gear-fill', label: 'ตั้งค่า' },
      { id: 'admin', page: 'admin', icon: 'bi-shield-lock-fill', label: 'Admin', roles: ['admin', 'owner'] }
    ]
  }
];

const QUICK_ACTION_CATALOG = MENU_GROUPS.flatMap(group => group.items)
  .filter(item => ['openNewJob', 'addCustomer', 'jobs', 'crm', 'billing', 'inventory', 'po', 'reports', 'dashboard', 'vision', 'line-center', 'notifications'].includes(item.id))
  .map(item => ({
    id: item.id,
    icon: item.icon,
    label: item.label,
    page: item.page,
    fn: item.fn,
    color: {
      openNewJob: '#ede9fe',
      addCustomer: '#ffedd5',
      jobs: '#dbeafe',
      crm: '#d1fae5',
      billing: '#fef3c7',
      inventory: '#e0f2fe',
      po: '#fce7f3',
      reports: '#dcfce7',
      dashboard: '#fef9c3',
      vision: '#ccfbf1',
      'line-center': '#e0e7ff',
      notifications: '#fee2e2'
    }[item.id] || '#f8fafc',
    textColor: {
      openNewJob: '#5b21b6',
      addCustomer: '#9a3412',
      jobs: '#1e40af',
      crm: '#065f46',
      billing: '#92400e',
      inventory: '#075985',
      po: '#9d174d',
      reports: '#166534',
      dashboard: '#713f12',
      vision: '#0f766e',
      'line-center': '#3730a3',
      notifications: '#991b1b'
    }[item.id] || '#0f172a'
  }));

const DEFAULT_QUICK_ACTION_IDS = ['openNewJob', 'addCustomer', 'jobs', 'billing', 'vision', 'line-center'];
const LEGACY_QUICK_ACTION_DEFAULTS = [
  ['openNewJob', 'addCustomer', 'jobs', 'crm']
];

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
      { icon: 'bi-plus-circle-fill', label: 'เปิดงาน', color: '#dbeafe', textColor: '#1e40af', action: 'openNewJob' },
      { icon: 'bi-person-plus-fill', label: 'ลูกค้าใหม่', color: '#ffedd5', textColor: '#9a3412', action: 'addCustomer' },
      { icon: 'bi-telephone-fill', label: 'โทรลูกค้า', color: '#d1fae5', textColor: '#065f46', action: 'callCustomer' }
    ]
  },
  admin: {
    label: 'แอดมิน',
    theme: 'theme-admin',
    color: '#7c3aed',
    icon: 'bi-headset',
    greeting: 'มีงานรอมอบหมายอยู่แนะ!',
    quickActions: [
      { icon: 'bi-plus-circle-fill', label: 'เปิดงาน', color: '#ede9fe', textColor: '#5b21b6', action: 'openNewJob' },
      { icon: 'bi-person-plus-fill', label: 'ลูกค้าใหม่', color: '#ffedd5', textColor: '#9a3412', action: 'addCustomer' },
      { icon: 'bi-telephone-fill', label: 'โทรลูกค้า', color: '#dbeafe', textColor: '#1e40af', action: 'callCustomer' }
    ]
  },
  acct: {
    label: 'บัญชี',
    theme: 'theme-acct',
    color: '#0891b2',
    icon: 'bi-calculator',
    greeting: 'ตรวจสลิปและออกใบเสร็จได้เลย',
    quickActions: [
      { icon: 'bi-camera-fill', label: 'สแกนสลิป', color: '#ccfafe', textColor: '#164e63', action: 'scanSlip' },
      { icon: 'bi-file-earmark-pdf-fill', label: 'ออกใบเสร็จ', color: '#d1fae5', textColor: '#065f46', action: 'createReceipt' },
      { icon: 'bi-qr-code', label: 'QR รับเงิน', color: '#dbeafe', textColor: '#1e40af', action: 'showQR' }
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
      { icon: 'bi-telephone-fill', label: 'โทรลูกค้า', color: '#d1fae5', textColor: '#065f46', action: 'callVIP' }
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

  // Start splash via the final auth-aware boot function.
  setTimeout(() => {
    if (typeof window.initApp === 'function') {
      window.initApp();
    } else {
      initApp();
    }
  }, 1800);
});

window.addEventListener('popstate', (event) => {
  if (!document.getElementById('main-app') || document.getElementById('main-app').classList.contains('hidden')) return;
  const moreMenu = document.getElementById('more-menu-overlay');
  if (moreMenu && moreMenu.style.display === 'flex') {
    closeMoreMenu();
    history.pushState({ page: APP.currentPage }, '', location.href);
    return;
  }
  const openModal = document.querySelector('.modal-overlay:not(.hidden), .cp-sheet-overlay:not(.hidden):not(#more-menu-overlay)');
  if (openModal && openModal.id !== 'more-menu-overlay') {
    openModal.classList.add('hidden');
    document.body.style.overflow = '';
    history.pushState({ page: APP.currentPage }, '', location.href);
    return;
  }
  if (APP.currentPage && APP.currentPage !== 'home') {
    goPage('home', document.getElementById('nav-home'), { skipHistory: true });
    history.pushState({ page: 'home' }, '', location.href);
  }
});

window.addEventListener('beforeunload', (event) => {
  const hasOfflineQueue = !!localStorage.getItem('comphone_offline_queue');
  const protectedPage = APP.currentPage && !['home', 'profile'].includes(APP.currentPage);
  if (hasOfflineQueue || protectedPage) {
    event.preventDefault();
    event.returnValue = '';
  }
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
  const deepLinked = handleDeepLink();
  if (!deepLinked) restoreLastPage();

  // โหลดข้อมูลจริงจาก GAS API
  loadLiveData();
}

async function loadLiveData() {
  try {
    const data = await callApi('getDashboardData');
    if (!data || !data.success) {
      APP.dashboardError = data || { error: 'Dashboard API returned an unsuccessful response' };
      renderHome();
      if (APP.currentPage === 'dashboard' && typeof loadDashboardPage === 'function') loadDashboardPage();
      return;
    }

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
    // Keep the shell usable; page modules show their own retry states.
    console.warn('[App] loadLiveData failed:', e && e.message ? e.message : e);
  }
}

function handleDeepLink() {
  try {
    const params = new URLSearchParams(window.location.search);
    const page = params.get('page');
    if (!page || page === 'home') return false;

    // รอให้ DOM เรนเอร์ก่อน
    setTimeout(() => {
      goPage(page, getNavButtonForPage(page));

      // ถ้ามี id ให้เปิด modal อัตโนมัติ
      const id = params.get('id');
      if (id) {
        setTimeout(() => {
          if (page === 'jobs') showJobDetail(id);
          else if (page === 'po') showPODetail(id);
        }, 800);
      }
    }, 300);
    return true;
  } catch(e) {
    return false;
  }
}

function getNavButtonForPage(page) {
  const direct = document.getElementById('nav-' + page);
  if (direct) return direct;
  const morePages = ['dashboard', 'crm', 'inventory', 'po', 'billing', 'reports', 'attendance', 'warranty', 'admin', 'analytics', 'revenue', 'tax', 'performance', 'vision', 'line-center'];
  return morePages.includes(page) ? document.getElementById('nav-more') : null;
}

function restoreLastPage() {
  try {
    const savedPage = localStorage.getItem(LAST_PAGE_KEY);
    if (!savedPage || savedPage === 'home' || !RESTORABLE_PAGES.has(savedPage)) return;
    setTimeout(() => goPage(savedPage, getNavButtonForPage(savedPage)), 350);
  } catch(e) {}
}

// Home Render → app_home.js
// Jobs Page → app_jobs.js
// ===== PROFILE PAGE =====
function renderProfile() {
  const roleConf = ROLES[APP.role] || ROLES.tech;
  const initial = APP.user.name.charAt(0).toUpperCase();
  const version = (window.VERSION_CONFIG && window.VERSION_CONFIG.version) || window.COMPHONE_VERSION || '';
  const versionLabel = document.querySelector('.app-version [data-i18n="Version"]');
  if (versionLabel && version) versionLabel.textContent = version;

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
function setActiveNav(page) {
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const direct = document.getElementById('nav-' + page);
  const nestedPages = ['dashboard', 'crm', 'inventory', 'po', 'billing', 'reports', 'attendance', 'warranty', 'profile', 'admin', 'analytics', 'revenue', 'tax', 'performance', 'vision', 'line-center'];
  const btn = direct || (nestedPages.includes(page) ? document.getElementById('nav-more') : null);
  if (btn) btn.classList.add('active');
}

function goPage(page, btn, options = {}) {
  // ===== PAGE REDIRECTS FOR MERGED/REMOVED PAGES =====
  // Customer Portal -> show as overlay (not a nav page)
  if (page === 'customer-portal') {
    console.log('[Nav] Customer Portal is overlay-only');
    if (typeof loadCustomerPortalPage === 'function') loadCustomerPortalPage();
    return;
  }
  // Notifications -> show as overlay (not a nav page)
  if (page === 'notifications') {
    console.log('[Nav] Notifications is overlay-only');
    if (typeof loadNotificationCenter === 'function') loadNotificationCenter();
    else if (typeof showNotificationCenter === 'function') showNotificationCenter();
    return;
  }
  // Profile now includes Settings (backup moved to Settings/Profile)
  
  const pageEl = document.getElementById('page-' + page);
  if (!pageEl) { showToast('ไม่พบหน้า ' + page); return; }
  const pageLoadToken = markPageLoading(page, pageEl);

  // Page Exit Animation
  const currentPage = document.querySelector('.page.active');
  if (currentPage && currentPage !== pageEl) {
    currentPage.classList.add('page-exit');
    setTimeout(() => {
      currentPage.classList.remove('active', 'page-exit');
      currentPage.classList.add('hidden');
    }, 300);
  }

  // Hide all pages
  document.querySelectorAll('.page').forEach(p => { 
    if (p !== pageEl && !p.classList.contains('page-exit')) {
      p.classList.remove('active');
      p.classList.add('hidden');
    }
  });
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

  // Page Enter Animation
  setTimeout(() => {
    pageEl.classList.remove('hidden');
    pageEl.classList.add('active', 'page-enter');
    setTimeout(() => {
      pageEl.classList.remove('page-enter');
    }, 400);
  }, currentPage && currentPage !== pageEl ? 300 : 0);
  
  if (btn) btn.classList.add('active');
  else setActiveNav(page);
  APP.currentPage = page;
  if (RESTORABLE_PAGES.has(page)) {
    localStorage.setItem(LAST_PAGE_KEY, page);
    if (!options.skipHistory && history && history.pushState) {
      history.pushState({ page }, '', location.href);
    }
  }

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
    else if (typeof renderReportModule === 'function') renderReportModule();
  }
  if (page === 'customer-portal') {
    if (typeof loadCustomerPortalPage === 'function') loadCustomerPortalPage();
  }
  if (page === 'notifications') {
    if (typeof loadNotificationCenter === 'function') loadNotificationCenter();
    else if (typeof showNotificationCenter === 'function') showNotificationCenter();
  }
  if (page === 'analytics') {
    if (typeof openAnalyticsSection === 'function') openAnalyticsSection();
  }
  if (page === 'billing') {
    if (typeof loadBillingPage === 'function') loadBillingPage();
    else if (typeof renderBillingSection === 'function') renderBillingSection();
  }
  if (page === 'warranty') {
    if (typeof loadWarrantyPage === 'function') loadWarrantyPage();
    else if (typeof renderWarrantySection === 'function') renderWarrantySection();
  }
  if (page === 'revenue') {
    if (typeof loadRevenuePage === 'function') loadRevenuePage();
    else if (typeof renderRevenueSection === 'function') renderRevenueSection();
  }
  if (page === 'tax') {
    if (typeof loadTaxPage === 'function') loadTaxPage();
    else if (typeof renderTaxSection === 'function') renderTaxSection();
  }
  if (page === 'performance') {
    if (typeof loadPerformancePage === 'function') loadPerformancePage();
    else if (typeof renderPerformanceSection === 'function') renderPerformanceSection();
  }
  if (page === 'vision') {
    if (typeof renderMobileVisionPage === 'function') renderMobileVisionPage();
  }
  if (page === 'line-center') {
    if (typeof renderMobileLineCenterPage === 'function') renderMobileLineCenterPage();
  }
  if (page === 'pos') {
    // POS page is standalone - open in new tab or redirect
    const posUrl = '/comphone-superapp/pwa/pos.html';
    if (confirm('เปิดหน้าขายหน้าร้าน (POS)?\nกด OK เพื่อเปิดในแท็บใหม่')) {
      window.open(posUrl, '_blank');
    }
  }
  ensurePageHasContent(page);
  setTimeout(() => markPageReady(page, pageEl, pageLoadToken), 1200);
}

function getPageMount(page) {
  return document.getElementById(page + '-content')
    || document.getElementById('page-' + page)?.querySelector('[id$="-content"]')
    || document.getElementById('page-' + page);
}

function markPageLoading(page, pageEl) {
  if (!pageEl) return 0;
  const token = Date.now();
  APP.pageLoadToken = token;
  pageEl.setAttribute('aria-busy', 'true');
  pageEl.setAttribute('data-page-state', 'loading');
  const mount = getPageMount(page);
  if (mount && !['home', 'profile', 'jobs', 'camera'].includes(page) && !(mount.textContent || '').trim()) {
    mount.innerHTML = `
      <div class="loading-state page-loading-watchdog" data-loading-skeleton="true" style="padding:32px 18px">
        <div class="spinner"></div>
        <p>Loading ${getMenuItemLabel(page)}...</p>
      </div>`;
  }
  setTimeout(() => {
    if (APP.pageLoadToken !== token) return;
    markPageReady(page, pageEl, token);
    ensurePageHasContent(page, { forceDiagnostic: true });
  }, 6500);
  return token;
}

function markPageReady(page, pageEl, token) {
  if (!pageEl || (token && APP.pageLoadToken !== token)) return;
  pageEl.setAttribute('aria-busy', 'false');
  pageEl.setAttribute('data-page-state', 'ready');
}

function ensurePageHasContent(page, options = {}) {
  const mount = getPageMount(page);
  if (!mount || ['home', 'profile', 'jobs', 'camera'].includes(page)) return;
  setTimeout(() => {
    const hasOnlyLoading = !!mount.querySelector('[data-loading-skeleton="true"]');
    if (!mount) return;
    if (!hasOnlyLoading && ((mount.textContent || '').trim() || mount.querySelector('canvas,table,.card-box,.job-card,.kpi-box,.empty-state,.loading-state'))) return;
    if (hasOnlyLoading && !options.forceDiagnostic) return;
    mount.innerHTML = `
      <div class="empty-state page-load-diagnostic" style="padding:32px 18px">
        <i class="bi bi-grid"></i>
        <p style="font-weight:700;margin-bottom:4px">${getMenuItemLabel(page)}</p>
        <p style="font-size:12px;color:#64748b">No visible content was rendered yet. Try refresh, check network, or open Runtime Self-Test.</p>
        <button class="btn-add-job" onclick="goPage('home', document.getElementById('nav-home'))">
          <i class="bi bi-house"></i> Home
        </button>
      </div>`;
  }, 900);
}

function getMenuItemLabel(id) {
  const item = MENU_GROUPS.flatMap(group => group.items).find(entry => entry.id === id || entry.page === id);
  return item ? item.label : id;
}

function getQuickActions() {
  let ids = DEFAULT_QUICK_ACTION_IDS;
  try {
    const saved = JSON.parse(localStorage.getItem(QUICK_ACTIONS_KEY) || '[]');
    if (Array.isArray(saved) && saved.length) {
      const isLegacyDefault = LEGACY_QUICK_ACTION_DEFAULTS.some(legacy =>
        legacy.length === saved.length && legacy.every((id, index) => saved[index] === id)
      );
      ids = isLegacyDefault ? DEFAULT_QUICK_ACTION_IDS : saved.slice(0, 6);
      if (isLegacyDefault) {
        localStorage.setItem(QUICK_ACTIONS_KEY, JSON.stringify(ids));
      }
    }
  } catch (e) {}
  const actions = ids.map(id => QUICK_ACTION_CATALOG.find(item => item.id === id)).filter(Boolean);
  return actions.length ? actions : QUICK_ACTION_CATALOG.filter(item => DEFAULT_QUICK_ACTION_IDS.includes(item.id));
}

function runQuickAction(id) {
  const action = QUICK_ACTION_CATALOG.find(item => item.id === id);
  if (!action) return showToast('ไม่พบปุ่มด่วน');
  if (action.fn && typeof window[action.fn] === 'function') return window[action.fn]();
  if (action.page) return goPage(action.page, action.page === 'jobs' ? document.getElementById('nav-jobs') : document.getElementById('nav-more'));
  showToast('ปุ่มนี้ยังไม่พร้อมใช้งาน');
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
function showQuickActionSettings() {
  document.getElementById('modal-quick-actions')?.remove();
  const selected = new Set(getQuickActions().map(item => item.id));
  const rows = QUICK_ACTION_CATALOG.map(item => `
    <label class="quick-settings-row">
      <span><i class="bi ${item.icon}"></i> ${item.label}</span>
      <input type="checkbox" value="${item.id}" ${selected.has(item.id) ? 'checked' : ''}>
    </label>
  `).join('');

  const html = `
    <div id="modal-quick-actions" class="modal-overlay" onclick="closeModal('modal-quick-actions')">
      <div class="modal-sheet quick-settings-sheet" onclick="event.stopPropagation()">
        <div class="modal-handle"></div>
        <div class="modal-title-row">
          <h5><i class="bi bi-sliders"></i> จัดปุ่มด่วนหน้า Dashboard</h5>
          <button onclick="closeModal('modal-quick-actions')"><i class="bi bi-x-lg"></i></button>
        </div>
        <p class="quick-settings-help">เลือกได้สูงสุด 6 ปุ่ม ระบบจะจำไว้ในเครื่องนี้และแสดงบนหน้าแรก</p>
        <div class="quick-settings-list">${rows}</div>
        <div class="quick-settings-actions">
          <button class="btn-gray-sm" onclick="resetQuickActions()">ค่าเริ่มต้น</button>
          <button class="btn-primary-sm" onclick="saveQuickActions()">บันทึก</button>
        </div>
      </div>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
}
function saveQuickActions() {
  const modal = document.getElementById('modal-quick-actions');
  const checked = Array.from(modal.querySelectorAll('input[type="checkbox"]:checked')).map(el => el.value).slice(0, 6);
  if (!checked.length) return showToast('เลือกอย่างน้อย 1 ปุ่ม');
  localStorage.setItem(QUICK_ACTIONS_KEY, JSON.stringify(checked));
  closeModal('modal-quick-actions');
  renderHome();
  showToast('บันทึกปุ่มด่วนแล้ว');
}
function resetQuickActions() {
  localStorage.removeItem(QUICK_ACTIONS_KEY);
  closeModal('modal-quick-actions');
  renderHome();
  showToast('คืนค่าปุ่มด่วนเริ่มต้นแล้ว');
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
  if (confirm('รีเซ็ตแอปและลบข้อมูลทั้งหมด?\n\nข้อมูล session, หน้าล่าสุด และคิว offline ในเครื่องนี้จะถูกล้าง')) {
    localStorage.clear();
    location.reload();
  }
}

// ===== SETUP & LOGIN =====
window.saveSetup = function() {
  const name = document.getElementById('setup-name')?.value?.trim();
  const phone = document.getElementById('setup-phone')?.value?.trim();
  const selectedRoleEl = document.querySelector('.role-option.selected');
  const role = selectedRoleEl?.dataset?.role;
  const scriptUrl = document.getElementById('setup-script-url')?.value?.trim();

  if (!name || !phone || !role) {
    showToast('⚠️ กรุณากรอกข้อมูลให้ครบถ้วน');
    return;
  }

  const userData = { name, phone, role, scriptUrl: scriptUrl || '' };
  localStorage.setItem('comphone_user', JSON.stringify(userData));
  localStorage.setItem('comphone_logged_in', 'true');

  // Initialize APP state to prevent null reference in changeRole()
  APP.user = userData;
  APP.role = role;

  if (scriptUrl) {
    localStorage.setItem('comphone_script_url', scriptUrl);
    if (window.GAS_CONFIG) window.GAS_CONFIG.url = scriptUrl;
  }

  showToast('✅ ยินดีต้อนรับ ' + name);
  if (typeof changeRole === 'function') changeRole(role);
  else if (typeof applyRoleUI === 'function') applyRoleUI(role);
};

// alias for button onclick="completeSetup()"
window.completeSetup = window.saveSetup;

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
// Mobile PWA delegates to api_client.js so every module uses one auth/session path.
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
  getTaxReminder: true, getJobStatusPublic: true, getDriveSyncStatus: true,
  getVisionDashboardStats: true, getVisionPipelineVersion: true, getVisionLearningVersion: true,
  getVisionLineIngressStatus: true,
  getVisionFieldContext: true,
  getVisionActionSuggestions: true,
  previewVisionSuggestion: true,
  getVisionReviewQueue: true,
  getLineCommandCenter: true,
  getLineRoomStatus: true,
  getLineNotificationSettings: true,
  getIntelAlertQueue: true,
  getAlertAnalytics: true,
  getGroupedAlerts: true,
  previewLineRoomMessage: true,
  getDataRepairStatus: true,
  previewDataRepair: true,
  cleanupSmokeTestRecords: true,
  getDataReviewLog: true
};

function isReadAction(action) {
  return !!READ_ACTIONS[action];
}

async function callAPI(action, params = {}) {
  if (!navigator.onLine) {
    if (!isReadAction(action)) saveOfflineAction({ action, params, time: Date.now() });
    return null;
  }
  try {
    if (typeof window.callApi !== 'function') {
      throw new Error('callApi is not available');
    }
    const data = await window.callApi(action, params);
    if (data && data._headers) delete data._headers;
    return data;
  } catch (e) {
    if (e.message && e.message.includes('APPROVAL_REQUIRED')) {
      showToast('กรุณาขออนุมัติการดำเนินการ', 'warning');
    }
    if (!isReadAction(action)) saveOfflineAction({ action, params, time: Date.now() });
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
    // ไม่ต้อง showToast ที่นี่ (จัดการใน network listener แทน)
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
  const overlay = document.getElementById('more-menu-overlay');
  if (!overlay) return;
  renderMoreMenu();
  overlay.style.display = 'flex';
  overlay.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  if (history && history.pushState) history.pushState({ sheet: 'more-menu', page: APP.currentPage }, '', location.href);
}
function closeMoreMenu() {
  const overlay = document.getElementById('more-menu-overlay');
  if (!overlay) return;
  overlay.style.display = 'none';
  overlay.classList.add('hidden');
  document.body.style.overflow = '';
}
function navigateFromMore(page) {
  closeMoreMenu();
  // Highlight the More button since these pages live under it
  const moreBtn = document.getElementById('nav-more');
  goPage(page, moreBtn);
}
function renderMoreMenu() {
  const content = document.getElementById('more-menu-content');
  if (!content) return;
  const role = APP.user && APP.user.role;
  content.innerHTML = `
    <div class="cp-sheet-handle"></div>
    <div class="more-menu-title" data-i18n="More">เพิ่มเติม</div>
    ${MENU_GROUPS.map(group => {
      const items = group.items.filter(item => !item.roles || item.roles.includes(role));
      if (!items.length) return '';
      return `
        <div class="more-menu-group-label">${group.label}</div>
        <div class="more-menu-grid">
          ${items.map(item => `
            <button class="more-menu-item" ${item.fn ? `data-quick-action="${item.id}"` : `data-menu-page="${item.page}"`}>
              <div class="more-menu-icon"><i class="bi ${item.icon}"></i></div>
              <span>${item.label}</span>
            </button>
          `).join('')}
        </div>`;
    }).join('')}`;
  content.querySelectorAll('[data-quick-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      closeMoreMenu();
      runQuickAction(btn.getAttribute('data-quick-action'));
    });
  });
  content.querySelectorAll('[data-menu-page]').forEach(btn => {
    btn.addEventListener('click', () => navigateFromMore(btn.getAttribute('data-menu-page')));
  });
}

// ===== ACCOUNTING INTEGRATION (Phase 35) =====
function showAccountingSettings() {
  const section = document.getElementById('accounting-settings-section');
  if (section) {
    section.classList.toggle('hidden');
  }
}

function testMobileAccountingConnection() {
  const software = document.getElementById('mobile-accounting-software').value;
  const apiKey = document.getElementById('mobile-accounting-api-key').value;
  const statusEl = document.getElementById('mobile-accounting-status');
  
  // Show loading
  if (statusEl) {
    statusEl.style.background = '#fef3c7';
    statusEl.style.color = '#92400e';
    statusEl.innerHTML = '⏳ กำลังตรวจสอบ...';
  }
  
  // Call API
  if (typeof callGas === 'function') {
    callApi('checkAccountingConnection', {})
      .then(r => {
        if (statusEl) {
          if (r && r.success) {
            statusEl.style.background = '#f0fdf4';
            statusEl.style.color = '#059669';
            statusEl.innerHTML = `✅ เชื่อมต่อสำเร็จกับ ${software} (จำลอง)`;
          } else {
            statusEl.style.background = '#fee2e2';
            statusEl.style.color = '#ef4444';
            statusEl.innerHTML = `❌ เชื่อมต่อล้มเหลว: ${r?.error || 'Unknown error'}`;
          }
        }
      })
      .catch(e => {
        if (statusEl) {
          statusEl.style.background = '#fee2e2';
          statusEl.style.color = '#ef4444';
          statusEl.innerHTML = `❌ เกิดข้อผิดพลาด: ${e.message}`;
        }
      });
  } else {
    // Fallback: simulate
    setTimeout(() => {
      if (statusEl) {
        statusEl.style.background = '#f0fdf4';
        statusEl.style.color = '#059669';
        statusEl.innerHTML = `✅ เชื่อมต่อสำเร็จกับ ${software} (จำลอง)`;
      }
    }, 1000);
  }
}

function exportMobileBillToAccounting() {
  const billId = prompt('ใส่ Bill ID ที่ต้องการส่งไปบัญชี:');
  if (!billId) return;
  
  if (typeof callGas === 'function') {
    callApi('exportBillToAccounting', { billId })
      .then(r => {
        if (r && r.success) {
          alert(`✅ ส่งบิล ${billId} ไปยังซอฟต์แวร์บัญชีสำเร็จ\nReference: ${r.data?.accountingRef || '-'}`);
        } else {
          alert(`❌ ส่งบิลล้มเหลว: ${r?.error || 'Unknown error'}`);
        }
      })
      .catch(e => {
        alert(`❌ เกิดข้อผิดพลาด: ${e.message}`);
      });
  } else {
    alert(`✅ (จำลอง) ส่งบิล ${billId} ไปยังซอฟต์แวร์บัญชีสำเร็จ`);
  }
}

// ===== OFFLINE JOBS UI (Phase 35.2) =====
function showOfflineJobs() {
  goPage('offline-jobs');
  loadOfflineJobs();
}

async function loadOfflineJobs(filter = 'all') {
  try {
    const jobs = await getOfflineJobs();
    const stats = await getOfflineStatsV2();
    
    // Update stats bar
    const statsBar = document.getElementById('offline-stats-bar');
    if (statsBar) {
      statsBar.innerHTML = `
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;">
          <div style="background:#f0fdf4;padding:8px;border-radius:8px;text-align:center;">
            <div style="font-size:18px;font-weight:700;color:#059669;">${stats.jobs?.total || 0}</div>
            <div style="font-size:10px;color:#6b7280;">ทั้งหมด</div>
          </div>
          <div style="background:#fef3c7;padding:8px;border-radius:8px;text-align:center;">
            <div style="font-size:18px;font-weight:700;color:#92400e;">${stats.jobs?.pending || 0}</div>
            <div style="font-size:10px;color:#6b7280;">รอ Sync</div>
          </div>
          <div style="background:#dbeafe;padding:8px;border-radius:8px;text-align:center;">
            <div style="font-size:18px;font-weight:700;color:#1e40af;">${stats.jobs?.synced || 0}</div>
            <div style="font-size:10px;color:#6b7280;">Sync แล้ว</div>
          </div>
          <div style="background:#ede9fe;padding:8px;border-radius:8px;text-align:center;">
            <div style="font-size:18px;font-weight:700;color:#5b21b6;">${stats.queue?.pending || 0}</div>
            <div style="font-size:10px;color:#6b7280;">คิว Sync</div>
          </div>
        </div>
      `;
    }
    
    // Filter jobs
    let filtered = jobs;
    if (filter === 'pending') {
      filtered = jobs.filter(j => j.status === 'OFFLINE_PENDING');
    } else if (filter === 'synced') {
      filtered = jobs.filter(j => j.status === 'SYNCED');
    }
    
    // Render jobs
    const listEl = document.getElementById('offline-jobs-list');
    if (!listEl) return;
    
    if (filtered.length === 0) {
      listEl.innerHTML = '<div style="text-align:center;padding:40px;color:#9ca3af;"><i class="bi bi-inbox" style="font-size:48px;display:block;margin-bottom:8px;"></i>ไม่มีงาน offline</div>';
      return;
    }
    
    listEl.innerHTML = filtered.map(job => `
      <div style="background:#fff;border-radius:12px;padding:12px;margin-bottom:8px;border:1px solid #e5e7eb;">
        <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:8px;">
          <div style="font-weight:600;font-size:14px;">${job.customer_name || 'ไม่ระบุ'}</div>
          <span style="font-size:10px;padding:2px 8px;border-radius:10px;${job.status === 'SYNCED' ? 'background:#d1fae5;color:#065f46;' : 'background:#fef3c7;color:#92400e;'}">${job.status === 'SYNCED' ? '✅ Sync แล้ว' : '⏳ รอ Sync'}</span>
        </div>
        <div style="font-size:12px;color:#6b7280;margin-bottom:4px;"><i class="bi bi-phone-fill"></i> ${job.device || '-'}</div>
        <div style="font-size:12px;color:#374151;margin-bottom:8px;"><i class="bi bi-exclamation-circle"></i> ${job.symptom || job.title || '-'}</div>
        <div style="font-size:10px;color:#9ca3af;"><i class="bi bi-clock"></i> ${new Date(job.createdAt || job.time).toLocaleString('th-TH')}</div>
      </div>
    `).join('');
  } catch (err) {
    console.error('[OfflineJobs] Load error:', err);
  }
}

function filterOfflineJobs(filter, btn) {
  // Update active tab
  const tabs = btn.parentElement.querySelectorAll('.filter-tab');
  tabs.forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  
  loadOfflineJobs(filter);
}

function showCreateOfflineJob() {
  document.getElementById('modal-create-offline-job').classList.remove('hidden');
}

async function saveOfflineJob() {
  const name = document.getElementById('offline-cust-name')?.value?.trim();
  const phone = document.getElementById('offline-cust-phone')?.value?.trim();
  const device = document.getElementById('offline-device')?.value?.trim();
  const symptom = document.getElementById('offline-symptom')?.value?.trim();
  
  if (!name) {
    showToast('⚠️ กรุณากรอกชื่อลูกค้า', 'warning');
    return;
  }
  
  const result = await createOfflineJob({
    customer_name: name,
    customer_phone: phone,
    device: device,
    symptom: symptom
  });
  
  if (result && result.success) {
    closeModal('modal-create-offline-job');
    // Clear form
    ['offline-cust-name', 'offline-cust-phone', 'offline-device', 'offline-symptom'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    loadOfflineJobs();
  }
}

// ===== END OF FILE =====
function showSyncQueue() {
  getQueueStats().then(stats => {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.onclick = () => modal.remove();
    modal.innerHTML = `
      <div class="modal-sheet" onclick="event.stopPropagation()" style="padding:16px;">
        <div class="modal-handle"></div>
        <div class="modal-title">📋 คิว offline (${stats.total} รายการ)</div>
        <div style="padding:8px 0;">
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px;">
            <div style="background:#f0fdf4;padding:8px;border-radius:8px;text-align:center;">
              <div style="font-size:18px;font-weight:700;color:#059669;">${stats.pending}</div>
              <div style="font-size:10px;color:#6b7280;">รอ Sync</div>
            </div>
            <div style="background:#dbeafe;padding:8px;border-radius:8px;text-align:center;">
              <div style="font-size:18px;font-weight:700;color:#1e40af;">${stats.done}</div>
              <div style="font-size:10px;color:#6b7280;">เสร็จแล้ว</div>
            </div>
            <div style="background:#fee2e2;padding:8px;border-radius:8px;text-align:center;">
              <div style="font-size:18px;font-weight:700;color:#ef4444;">${stats.failed}</div>
              <div style="font-size:10px;color:#6b7280;">ล้มเหลว</div>
            </div>
          </div>
          <button onclick="syncOfflineQueueLegacy(); this.disabled=true; this.textContent='กำลัง Sync...';" style="width:100%;padding:8px;background:#1e40af;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:12px;">🔄 Sync ทันที</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  });
}
