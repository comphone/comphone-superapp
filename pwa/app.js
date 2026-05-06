     1|/* ===== COMPHONE SUPERAPP — app.js ===== */
     2|'use strict';
     3|
     4|// ===== STATE =====
     5|// URL source: gas_config.js / version_config.js. Do not hardcode deployment URLs here.
     6|const DEFAULT_SCRIPT_URL = window.COMPHONE_GAS_URL || (window.GAS_CONFIG && window.GAS_CONFIG.url) || '';
     7|
     8|const APP = {
     9|  user: null,
    10|  role: null,
    11|  scriptUrl: DEFAULT_SCRIPT_URL,
    12|  currentPage: 'home',
    13|  deferredInstall: null,
    14|  notifEnabled: false,
    15|  offlineQueue: [],
    16|  jobs: [],
    17|  photos: []
    18|};
    19|
    20|// ===== ROLE CONFIG =====
    21|const ROLES = {
    22|  tech: {
    23|    label: 'ช่าง',
    24|    theme: 'theme-tech',
    25|    color: '#0d6efd',
    26|    icon: 'bi-tools',
    27|    greeting: 'พร้อมรับงานวันนี้แล้วหรือยัง?',
    28|    quickActions: [
    29|      { icon: 'bi-plus-circle-fill', label: 'เปิดงาน', color: '#dbeafe', textColor: '#1e40af', action: 'openNewJob' },
    30|      { icon: 'bi-person-plus-fill', label: 'ลูกค้าใหม่', color: '#ffedd5', textColor: '#9a3412', action: 'addCustomer' },
    31|      { icon: 'bi-telephone-fill', label: 'โทรลูกค้า', color: '#d1fae5', textColor: '#065f46', action: 'callCustomer' }
    32|    ]
    33|  },
    34|  admin: {
    35|    label: 'แอดมิน',
    36|    theme: 'theme-admin',
    37|    color: '#7c3aed',
    38|    icon: 'bi-headset',
    39|    greeting: 'มีงานรอมอบหมายอยู่แนะ!',
    40|    quickActions: [
    41|      { icon: 'bi-plus-circle-fill', label: 'เปิดงาน', color: '#ede9fe', textColor: '#5b21b6', action: 'openNewJob' },
    42|      { icon: 'bi-person-plus-fill', label: 'ลูกค้าใหม่', color: '#ffedd5', textColor: '#9a3412', action: 'addCustomer' },
    43|      { icon: 'bi-telephone-fill', label: 'โทรลูกค้า', color: '#dbeafe', textColor: '#1e40af', action: 'callCustomer' }
    44|    ]
    45|  },
    46|  acct: {
    47|    label: 'บัญชี',
    48|    theme: 'theme-acct',
    49|    color: '#0891b2',
    50|    icon: 'bi-calculator',
    51|    greeting: 'ตรวจสลิปและออกใบเสร็จได้เลย',
    52|    quickActions: [
    53|      { icon: 'bi-camera-fill', label: 'สแกนสลิป', color: '#ccfafe', textColor: '#164e63', action: 'scanSlip' },
    54|      { icon: 'bi-file-earmark-pdf-fill', label: 'ออกใบเสร็จ', color: '#d1fae5', textColor: '#065f46', action: 'createReceipt' },
    55|      { icon: 'bi-qr-code', label: 'QR รับเงิน', color: '#dbeafe', textColor: '#1e40af', action: 'showQR' }
    56|    ]
    57|  },
    58|  exec: {
    59|    label: 'ผู้บริหาร',
    60|    theme: 'theme-exec',
    61|    color: '#d97706',
    62|    icon: 'bi-bar-chart-line',
    63|    greeting: 'Daily Pulse พร้อมแล้ว',
    64|    quickActions: [
    65|      { icon: 'bi-bar-chart-fill', label: 'Dashboard', color: '#fef9c3', textColor: '#713f12', action: 'viewDashboard' },
    66|      { icon: 'bi-megaphone-fill', label: 'จี้งานด่วน', color: '#fee2e2', textColor: '#991b1b', action: 'urgentAction' },
    67|      { icon: 'bi-telephone-fill', label: 'โทรลูกค้า', color: '#d1fae5', textColor: '#065f46', action: 'callVIP' }
    68|    ]
    69|  }
    70|};
    71|
    72|// ===== LIVE DATA HELPERS =====
    73|// แปลง job จาก GAS API ให้เป็นรูปแบบที่ PWA ใช้
    74|function normalizeJob(j) {
    75|  if (!j) return null;
    76|  const statusRaw = (j.status || j.status_label || '').toLowerCase();
    77|  let status = 'new';
    78|  if (/เสร็จ|completed|done/.test(statusRaw)) status = 'done';
    79|  else if (/กำลัง|เริ่มงาน|in.prog/.test(statusRaw)) status = 'inprog';
    80|  else if (/รอชิ้น|waiting/.test(statusRaw)) status = 'waiting';
    81|  else if (/ด่วน|urgent/.test(statusRaw)) status = 'urgent';
    82|  else if (/ยกเลิก|cancel/.test(statusRaw)) status = 'cancel';
    83|
    84|  // คำนวณ SLA จากวันที่สร้าง
    85|  let sla = 999;
    86|  try {
    87|    const created = j.created || j.created_at || '';
    88|    const parts = created.split(' ')[0].split('/');
    89|    if (parts.length === 2) {
    90|      const d = new Date(new Date().getFullYear(), parseInt(parts[1])-1, parseInt(parts[0]));
    91|      const diffHrs = (Date.now() - d.getTime()) / 3600000;
    92|      const slaHrs = 72; // default 72 hrs
    93|      sla = Math.round((slaHrs - diffHrs) * 60); // minutes remaining
    94|    }
    95|  } catch(e) {}
    96|
    97|  return {
    98|    id: j.id || j.job_id || '-',
    99|    title: j.symptom || j.device || j.title || 'ไม่ระบุอาการ',
   100|    customer: j.customer || j.customer_name || '-',
   101|    phone: j.phone || j.customer_phone || '-',
   102|    status: status,
   103|    statusLabel: j.status || j.status_label || '-',
   104|    sla: sla,
   105|    location: j.location || 'ร้าน',
   106|    price: j.price || j.estimated_price || 0,
   107|    tech: j.tech || j.technician || null,
   108|    note: j.note || j.notes || j.remark || '',
   109|    folder: j.folder || j.folder_url || '',
   110|    created: j.created || j.created_at || '',
   111|    raw: j
   112|  };
   113|}
   114|
   115|// ===== INIT =====
   116|
   117|window.addEventListener('load', () => {
   118|  // PWA Install prompt
   119|  window.addEventListener('beforeinstallprompt', e => {
   120|    e.preventDefault();
   121|    APP.deferredInstall = e;
   122|    setTimeout(() => {
   123|      const banner = document.getElementById('install-banner');
   124|      if (banner) banner.classList.remove('hidden');
   125|    }, 3000);
   126|  });
   127|
   128|  // Offline detection
   129|  // online/offline listeners delegated to offline_db.js (avoids duplicate registration)
   130|  // offline_db.js handles: showOfflineBar + syncOfflineQueue
   131|
   132|  // Start splash via the final auth-aware boot function.
   133|  setTimeout(() => {
   134|    if (typeof window.initApp === 'function') {
   135|      window.initApp();
   136|    } else {
   137|      initApp();
   138|    }
   139|  }, 1800);
   140|});
   141|
   142|function initApp() {
   143|  const splash = document.getElementById('splash-screen');
   144|  splash.style.opacity = '0';
   145|  splash.style.transition = 'opacity 0.4s';
   146|  setTimeout(() => splash.classList.add('hidden'), 400);
   147|
   148|  // Load saved user
   149|  const saved = localStorage.getItem('comphone_user');
   150|  if (saved) {
   151|    try {
   152|      const data = JSON.parse(saved);
   153|      APP.user = data;
   154|      APP.role = data.role;
   155|      APP.scriptUrl = data.scriptUrl;
   156|      startMainApp();
   157|    } catch {
   158|      showSetup();
   159|    }
   160|  } else {
   161|    showSetup();
   162|  }
   163|}
   164|
   165|// ===== SETUP =====
   166|function showSetup() {
   167|  document.getElementById('setup-screen').classList.remove('hidden');
   168|  const urlInput = document.getElementById('setup-url');
   169|  if (urlInput && !urlInput.value) urlInput.value = DEFAULT_SCRIPT_URL;
   170|}
   171|
   172|let selectedRole = null;
   173|function selectRole(el) {
   174|  document.querySelectorAll('.role-option').forEach(r => r.classList.remove('selected'));
   175|  el.classList.add('selected');
   176|  selectedRole = el.dataset.role;
   177|}
   178|
   179|function completeSetup() {
   180|  const name = document.getElementById('setup-name').value.trim();
   181|  const phone = document.getElementById('setup-phone').value.trim();
   182|  const url = document.getElementById('setup-url').value.trim();
   183|
   184|  if (!name) { showToast('กรุณากรอกชื่อ'); return; }
   185|  if (!selectedRole) { showToast('กรุณาเลือกบทบาท'); return; }
   186|
   187|  const userData = { name, phone, role: selectedRole, scriptUrl: url, setupAt: Date.now() };
   188|  localStorage.setItem('comphone_user', JSON.stringify(userData));
   189|
   190|  APP.user = userData;
   191|  APP.role = selectedRole;
   192|  APP.scriptUrl = url;
   193|
   194|  document.getElementById('setup-screen').classList.add('hidden');
   195|  startMainApp();
   196|}
   197|
   198|// ===== MAIN APP =====
   199|function startMainApp() {
   200|  const app = document.getElementById('main-app');
   201|  app.classList.remove('hidden');
   202|
   203|  // Apply theme
   204|  const roleConf = ROLES[APP.role] || ROLES.tech;
   205|  app.className = 'screen ' + roleConf.theme;
   206|
   207|  // Set user info
   208|  const initial = APP.user.name.charAt(0).toUpperCase();
   209|  document.getElementById('user-avatar').textContent = initial;
   210|  document.getElementById('user-avatar').style.background = 'rgba(255,255,255,0.25)';
   211|  document.getElementById('user-avatar').style.color = '#fff';
   212|
   213|  const hour = new Date().getHours();
   214|  const greet = hour < 12 ? 'อรุณสวัสดิ์' : hour < 17 ? 'สวัสดีตอนบ่าย' : 'สวัสดีตอนเย็น';
   215|  document.getElementById('greeting-text').textContent = greet + ' 👋';
   216|  document.getElementById('user-name-display').textContent = APP.user.name;
   217|
   218|  // แสดง/ซ่อน admin ตาม role (now in More menu)
   219|  const moreAdmin = document.getElementById('more-admin-btn');
   220|  if (moreAdmin) {
   221|    moreAdmin.style.display = (APP.role === 'owner' || APP.role === 'admin') ? '' : 'none';
   222|  }
   223|
   224|  // Apply role-based UI guard (auth_guard.js)
   225|  if (typeof applyRoleUI === 'function') applyRoleUI();
   226|
   227|  // Force Password Change check
   228|  if (APP.user && APP.user.force_change_pw === true) {
   229|    setTimeout(() => showForcePasswordChangeModal(), 500);
   230|  }
   231|
   232|  // Render home ด้วย loading state ก่อน
   233|  renderHome();
   234|  renderProfile();
   235|
   236|  // B1: Deep Link handler
   237|  handleDeepLink();
   238|
   239|  // โหลดข้อมูลจริงจาก GAS API
   240|  loadLiveData();
   241|}
   242|
   243|async function loadLiveData() {
   244|  try {
   245|    const data = await callApi('getDashboardData');
   246|    if (!data || !data.success) {
   247|      APP.dashboardError = data || { error: 'Dashboard API returned an unsuccessful response' };
   248|      renderHome();
   249|      if (APP.currentPage === 'dashboard' && typeof loadDashboardPage === 'function') loadDashboardPage();
   250|      return;
   251|    }
   252|
   253|    // เก็บ jobs จาก API
   254|    const rawJobs = data.jobs || data.summary && data.summary.recentJobs || [];
   255|    APP.jobs = rawJobs.map(normalizeJob).filter(Boolean);
   256|    APP.dashboardData = data;
   257|
   258|    // อัปเดต UI
   259|    renderHome();
   260|    renderJobsBadge();
   261|
   262|    // ถ้าอยู่หน้า jobs ให้ re-render
   263|    if (APP.currentPage === 'jobs') renderJobsPage();
   264|  } catch(e) {
   265|    // Keep the shell usable; page modules show their own retry states.
   266|    console.warn('[App] loadLiveData failed:', e && e.message ? e.message : e);
   267|  }
   268|}
   269|
   270|function handleDeepLink() {
   271|  try {
   272|    const params = new URLSearchParams(window.location.search);
   273|    const page = params.get('page');
   274|    if (!page || page === 'home') return;
   275|
   276|    const navBtn = document.getElementById('nav-' + page);
   277|    // รอให้ DOM เรนเอร์ก่อน
   278|    setTimeout(() => {
   279|      goPage(page, navBtn);
   280|
   281|      // ถ้ามี id ให้เปิด modal อัตโนมัติ
   282|      const id = params.get('id');
   283|      if (id) {
   284|        setTimeout(() => {
   285|          if (page === 'jobs') showJobDetail(id);
   286|          else if (page === 'po') showPODetail(id);
   287|        }, 800);
   288|      }
   289|    }, 300);
   290|  } catch(e) {}
   291|}
   292|
   293|// Home Render → app_home.js
   294|// Jobs Page → app_jobs.js
   295|// ===== PROFILE PAGE =====
   296|function renderProfile() {
   297|  const roleConf = ROLES[APP.role] || ROLES.tech;
   298|  const initial = APP.user.name.charAt(0).toUpperCase();
   299|
   300|  const avatarLg = document.getElementById('profile-avatar-large');
   301|  if (avatarLg) {
   302|    avatarLg.textContent = initial;
   303|    avatarLg.style.background = 'rgba(255,255,255,0.25)';
   304|    avatarLg.style.color = '#fff';
   305|  }
   306|  const nameLg = document.getElementById('profile-name-large');
   307|  if (nameLg) nameLg.textContent = APP.user.name;
   308|
   309|  const roleBadge = document.getElementById('profile-role-badge');
   310|  if (roleBadge) roleBadge.textContent = roleConf.label;
   311|}
   312|
   313|// ===== NAVIGATION =====
   314|function goPage(page, btn) {
   315|  // ===== PAGE REDIRECTS FOR MERGED/REMOVED PAGES =====
   316|  // Dashboard -> Home (Dashboard merged into Home)
   317|  if (page === 'dashboard') {
   318|    console.log('[Nav] Dashboard merged into Home, redirecting...');
   319|    page = 'home';
   320|  }
   321|  // Analytics -> Reports (Analytics merged into Reports)
   322|  if (page === 'analytics') {
   323|    console.log('[Nav] Analytics merged into Reports, redirecting...');
   324|    page = 'reports';
   325|  }
   326|  // Performance -> Reports (Performance merged into Reports)
   327|  if (page === 'performance') {
   328|    console.log('[Nav] Performance merged into Reports, redirecting...');
   329|    page = 'reports';
   330|  }
   331|  // Revenue -> Billing (Revenue merged into Billing)
   332|  if (page === 'revenue') {
   333|    console.log('[Nav] Revenue merged into Billing, redirecting...');
   334|    page = 'billing';
   335|  }
   336|  // Tax -> Billing (Tax merged into Billing)
   337|  if (page === 'tax') {
   338|    console.log('[Nav] Tax merged into Billing, redirecting...');
   339|    page = 'billing';
   340|  }
   341|  // Customer Portal -> show as overlay (not a nav page)
   342|  if (page === 'customer-portal') {
   343|    console.log('[Nav] Customer Portal is overlay-only');
   344|    if (typeof loadCustomerPortalPage === 'function') loadCustomerPortalPage();
   345|    return;
   346|  }
   347|  // Notifications -> show as overlay (not a nav page)
   348|  if (page === 'notifications') {
   349|    console.log('[Nav] Notifications is overlay-only');
   350|    if (typeof loadNotificationCenter === 'function') loadNotificationCenter();
   351|    else if (typeof showNotificationCenter === 'function') showNotificationCenter();
   352|    return;
   353|  }
   354|  // Profile now includes Settings (backup moved to Settings/Profile)
   355|  
   356|  const pageEl = document.getElementById('page-' + page);
   357|  if (!pageEl) { showToast('ไม่พบหน้า ' + page); return; }
   358|
   359|  // Page Exit Animation
   360|  const currentPage = document.querySelector('.page.active');
   361|  if (currentPage && currentPage !== pageEl) {
   362|    currentPage.classList.add('page-exit');
   363|    setTimeout(() => {
   364|      currentPage.classList.remove('active', 'page-exit');
   365|      currentPage.classList.add('hidden');
   366|    }, 300);
   367|  }
   368|
   369|  // Hide all pages
   370|  document.querySelectorAll('.page').forEach(p => { 
   371|    if (p !== pageEl && !p.classList.contains('page-exit')) {
   372|      p.classList.remove('active');
   373|      p.classList.add('hidden');
   374|    }
   375|  });
   376|  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
   377|
   378|  // Page Enter Animation
   379|  setTimeout(() => {
   380|    pageEl.classList.remove('hidden');
   381|    pageEl.classList.add('active', 'page-enter');
   382|    setTimeout(() => {
   383|      pageEl.classList.remove('page-enter');
   384|    }, 400);
   385|  }, currentPage && currentPage !== pageEl ? 300 : 0);
   386|  
   387|  if (btn) btn.classList.add('active');
   388|  APP.currentPage = page;
   389|
   390|  if (page === 'jobs') renderJobsPage();
   391|  if (page === 'profile') renderProfile();
   392|  if (page === 'crm') loadCRMPage();
   393|  if (page === 'attendance') loadAttendancePage();
   394|  if (page === 'po') loadPurchaseOrderPage();
   395|  if (page === 'dashboard') loadDashboardPage();
   396|  if (page === 'inventory') {
   397|    if (typeof loadInventoryPage === 'function') loadInventoryPage();
   398|    else if (typeof openInventoryPage === 'function') openInventoryPage();
   399|  }
   400|  if (page === 'admin') {
   401|    if (typeof loadAdminPanel === 'function') loadAdminPanel();
   402|  }
   403|  if (page === 'reports') {
   404|    if (typeof loadReportsPage === 'function') loadReportsPage();
   405|    else if (typeof renderReportModule === 'function') renderReportModule();
   406|  }
   407|  if (page === 'customer-portal') {
   408|    if (typeof loadCustomerPortalPage === 'function') loadCustomerPortalPage();
   409|  }
   410|  if (page === 'notifications') {
   411|    if (typeof loadNotificationCenter === 'function') loadNotificationCenter();
   412|    else if (typeof showNotificationCenter === 'function') showNotificationCenter();
   413|  }
   414|  if (page === 'analytics') {
   415|    if (typeof openAnalyticsSection === 'function') openAnalyticsSection();
   416|  }
   417|  if (page === 'billing') {
   418|    if (typeof loadBillingPage === 'function') loadBillingPage();
   419|    else if (typeof renderBillingSection === 'function') renderBillingSection();
   420|  }
   421|  if (page === 'warranty') {
   422|    if (typeof loadWarrantyPage === 'function') loadWarrantyPage();
   423|    else if (typeof renderWarrantySection === 'function') renderWarrantySection();
   424|  }
   425|  if (page === 'revenue') {
   426|    if (typeof loadRevenuePage === 'function') loadRevenuePage();
   427|    else if (typeof renderRevenueSection === 'function') renderRevenueSection();
   428|  }
   429|  if (page === 'tax') {
   430|    if (typeof loadTaxPage === 'function') loadTaxPage();
   431|    else if (typeof renderTaxSection === 'function') renderTaxSection();
   432|  }
   433|  if (page === 'performance') {
   434|    if (typeof loadPerformancePage === 'function') loadPerformancePage();
   435|    else if (typeof renderPerformanceSection === 'function') renderPerformanceSection();
   436|  }
   437|  if (page === 'pos') {
   438|    // POS page is standalone - open in new tab or redirect
   439|    const posUrl = '/comphone-superapp/pwa/pos.html';
   440|    if (confirm('เปิดหน้าขายหน้าร้าน (POS)?\nกด OK เพื่อเปิดในแท็บใหม่')) {
   441|      window.open(posUrl, '_blank');
   442|    }
   443|  }
   444|}
   445|
   446|// Actions + Search + Notifications → app_actions.js
   447|
   448|// ===== PROFILE ACTIONS =====
   449|function showProfile() { goPage('profile', document.getElementById('nav-profile')); }
   450|function editProfile() { showToast('กำลังเปิดฟอร์มแก้ไข...'); }
   451|function changeRole() {
   452|  const roles = Object.keys(ROLES);
   453|  const idx = roles.indexOf(APP.role);
   454|  const next = roles[(idx + 1) % roles.length];
   455|  APP.role = next;
   456|  APP.user.role = next;
   457|  localStorage.setItem('comphone_user', JSON.stringify(APP.user));
   458|  const app = document.getElementById('main-app');
   459|  app.className = 'screen ' + ROLES[next].theme;
   460|  renderHome();
   461|  renderProfile();
   462|  // Re-apply role-based UI after role change
   463|  if (typeof applyRoleUI === 'function') applyRoleUI();
   464|  showToast(`เปลี่ยนเป็น: ${ROLES[next].label}`);
   465|}
   466|function showSettings() {
   467|  const url = prompt('Script URL:', APP.scriptUrl || '');
   468|  if (url !== null) {
   469|    APP.scriptUrl = url;
   470|    APP.user.scriptUrl = url;
   471|    localStorage.setItem('comphone_user', JSON.stringify(APP.user));
   472|    showToast('บันทึก Script URL แล้ว');
   473|  }
   474|}
   475|function toggleNotifications() {
   476|  const toggle = document.getElementById('notif-toggle');
   477|  APP.notifEnabled = !APP.notifEnabled;
   478|  toggle.classList.toggle('on', APP.notifEnabled);
   479|  if (APP.notifEnabled && 'Notification' in window) {
   480|    Notification.requestPermission().then(p => showToast(p === 'granted' ? 'เปิดการแจ้งเตือนแล้ว 🔔' : 'ไม่ได้รับอนุญาต'));
   481|  } else {
   482|    showToast('ปิดการแจ้งเตือนแล้ว');
   483|  }
   484|}
   485|function clearCache() {
   486|  if (confirm('ล้างข้อมูลแคช?')) {
   487|    caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k)))).then(() => showToast('ล้างแคชแล้ว'));
   488|  }
   489|}
   490|function resetApp() {
   491|  if (confirm('รีเซ็ตแอปและลบข้อมูลทั้งหมด?')) {
   492|    localStorage.clear();
   493|    location.reload();
   494|  }
   495|}
   496|
   497|// ===== VOICE SEARCH =====
   498|function startVoiceSearch() {
   499|  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
   500|    showToast('เบราว์เซอร์ไม่รองรับ Voice Search');
   501|

// ===== SAVE SETUP (Login) =====
window.saveSetup = function() {
  const name = document.getElementById('setup-name')?.value?.trim();
  const phone = document.getElementById('setup-phone')?.value?.trim();
  const scriptUrl = document.getElementById('setup-script-url')?.value?.trim();
  
  // Get selected role
  let selectedRole = '';
  const roleIds = ['setup-role-tech', 'setup-role-admin', 'setup-role-acct', 'setup-role-exec'];
  for (const id of roleIds) {
    const btn = document.getElementById(id);
    if (btn && (btn.classList.contains('selected') || btn.style.border || btn.getAttribute('data-selected') === 'true')) {
      selectedRole = id.replace('setup-role-', '');
      break;
    }
  }
  
  // Validate
  if (!name) { alert('กรุณากรอกชื่อ-นามสกุล'); return; }
  if (!phone || phone.length < 9) { alert('กรุณากรอกเบอร์โทรศัพท์ให้ถูกต้อง'); return; }
  if (!selectedRole) { alert('กรุณาเลือกบทบาทของคุณ'); return; }
  if (!scriptUrl || !scriptUrl.includes('script.google.com')) { alert('กรุณาวาง SCRIPT URL จาก Google Apps Script'); return; }
  
  // Save to localStorage
  const userData = {
    name: name,
    phone: phone,
    role: selectedRole,
    setupDone: true,
    setupDate: new Date().toISOString()
  };
  
  localStorage.setItem('comphone_user', JSON.stringify(userData));
  localStorage.setItem('comphone_script_url', scriptUrl);
  localStorage.setItem('comphone_role', selectedRole);
  
  // Update APP state
  if (window.APP) {
    window.APP.user = userData;
    window.APP.role = selectedRole;
    window.APP.scriptUrl = scriptUrl;
  }
  
  // Update global config
  if (window.GAS_CONFIG) window.GAS_CONFIG.url = scriptUrl;
  window.COMPHONE_GAS_URL = scriptUrl;
  
  console.log('[Setup] User saved:', name, '| Role:', selectedRole);
  
  // Hide setup screen, show app
  const setupScreen = document.getElementById('setup-screen');
  const appContainer = document.getElementById('app-container') || document.getElementById('pages-container');
  
  if (setupScreen) {
    setupScreen.classList.add('hidden');
    setupScreen.style.display = 'none';
  }
  
  // Show main app - navigate to home/dashboard
  if (typeof goPage === 'function') {
    goPage('home', document.getElementById('nav-home'));
  } else if (typeof loadDashboardPage === 'function') {
    loadDashboardPage();
  } else {
    window.location.reload();
  }
}
