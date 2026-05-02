// ============================================================
// COMPHONE SUPER APP V5.5 — auth.js
// Sprint 3: Login PIN + Role-based Access Control
//   3.1 checkAuthState() — ตรวจสอบ session ที่บันทึกไว้
//   3.2 showLoginScreen() — แสดงหน้า Login PIN
//   3.3 submitLogin() — ส่ง username/password ไป GAS
//   3.4 logout() — ออกจากระบบ
//   3.5 renderProfileWithAuth() — แสดงข้อมูล user จาก auth
//   3.6 Role-based UI visibility
// ============================================================

// ===== AUTH STATE =====
const AUTH = {
  token: null,
  username: null,
  fullName: null,
  role: null,
  roleLabel: null,
  level: 0,
  canViewRevenue: false,
  canManageUsers: false,
  loginAt: null,
};

// SESSION_KEY ใน localStorage
const AUTH_SESSION_KEY = 'comphone_auth_session';
const AUTH_USER_KEY = 'comphone_user';

// Role mapping จาก GAS → PWA role
const AUTH_ROLE_MAP = {
  'OWNER':      'admin',
  'owner':      'admin',
  'ADMIN':      'admin',
  'admin':      'admin',
  'ACCOUNTANT': 'acct',
  'accountant': 'acct',
  'ACCT':       'acct',
  'acct':       'acct',
  'SALES':      'admin',
  'sales':      'admin',
  'TECHNICIAN': 'tech',
  'technician': 'tech',
  'TECH':       'tech',
  'tech':       'tech',
  'EXEC':       'exec',
  'exec':       'exec',
};

// ============================================================
// 3.1 CHECK AUTH STATE — เรียกตอน initApp
// ============================================================
function checkAuthState() {
  // ตรวจสอบ session ที่บันทึกไว้
  try {
    const sessionStr = localStorage.getItem(AUTH_SESSION_KEY);
    if (sessionStr) {
      const session = JSON.parse(sessionStr);
      // ตรวจสอบว่า session ยังไม่หมดอายุ (24 ชั่วโมง)
      const loginTime = session.loginAt || session.login_at || session.loginAtMs || 0;
      const loginAge = Date.now() - (new Date(loginTime).getTime() || Number(loginTime) || 0);
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      if (loginAge < maxAge && session.token && session.username) {
        // Session ยังใช้ได้
        applyAuthSession(session);
        return true;
      } else {
        // Session หมดอายุ
        localStorage.removeItem(AUTH_SESSION_KEY);
      }
    }
  } catch (e) {}
  return false;
}

// ============================================================
// 3.2 APPLY AUTH SESSION
// ============================================================
function applyAuthSession(session) {
  AUTH.token = session.token;
  AUTH.username = session.username;
  AUTH.fullName = session.fullName || session.full_name || session.username;
  AUTH.role = session.role;
  AUTH.roleLabel = session.roleLabel || session.role_label || session.role;
  AUTH.level = session.level || 0;
  AUTH.canViewRevenue = session.canViewRevenue || session.can_view_revenue || false;
  AUTH.canManageUsers = session.canManageUsers || session.can_manage_users || false;
  AUTH.loginAt = session.loginAt || session.login_at || Date.now();

  // Map role ไป PWA role
  const pwaRole = AUTH_ROLE_MAP[AUTH.role] || 'tech';

  // อัปเดต APP state
  APP.user = {
    name: AUTH.fullName,
    username: AUTH.username,
    role: pwaRole,
    gasRole: AUTH.role,
    roleLabel: AUTH.roleLabel,
    scriptUrl: APP.scriptUrl || DEFAULT_SCRIPT_URL,
    authToken: AUTH.token,
    loginAt: AUTH.loginAt,
  };
  APP.role = pwaRole;

  // บันทึก user ลง localStorage (สำหรับ app.js)
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(APP.user));
}

// ============================================================
// 3.3 SHOW LOGIN SCREEN
// ============================================================
function showLoginScreen() {
  // ซ่อน setup screen เดิม
  const setupScreen = document.getElementById('setup-screen');
  if (setupScreen) setupScreen.classList.add('hidden');

  // ตรวจสอบว่ามี login screen แล้วหรือยัง
  let loginScreen = document.getElementById('login-screen');
  if (!loginScreen) {
    loginScreen = document.createElement('div');
    loginScreen.id = 'login-screen';
    loginScreen.className = 'screen';
    loginScreen.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:linear-gradient(135deg,#1e3a5f 0%,#0f172a 100%);display:flex;align-items:center;justify-content:center;z-index:9999;padding:20px';
    document.body.appendChild(loginScreen);
  }

  loginScreen.innerHTML = `
    <div style="width:100%;max-width:360px">
      <!-- Logo -->
      <div style="text-align:center;margin-bottom:32px">
        <div style="width:80px;height:80px;background:linear-gradient(135deg,#3b82f6,#8b5cf6);border-radius:24px;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;box-shadow:0 8px 24px rgba(59,130,246,0.4)">
          <i class="bi bi-phone-fill" style="font-size:36px;color:#fff"></i>
        </div>
        <h1 style="color:#fff;font-size:24px;font-weight:800;margin:0">Comphone SuperApp AI</h1>
        <p style="color:#94a3b8;font-size:14px;margin:8px 0 0">ระบบบริหารงานบริการ IT และโซลูชันเทคโนโลยี</p>
      </div>

      <!-- Login Form -->
      <div style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:20px;padding:24px;backdrop-filter:blur(10px)">
        <div style="margin-bottom:16px">
          <label style="color:#94a3b8;font-size:12px;font-weight:600;display:block;margin-bottom:6px">ชื่อผู้ใช้</label>
          <div style="position:relative">
            <i class="bi bi-person-fill" style="position:absolute;left:14px;top:50%;transform:translateY(-50%);color:#64748b;font-size:16px"></i>
            <input type="text" id="login-username" placeholder="username"
              style="width:100%;padding:12px 14px 12px 42px;background:rgba(255,255,255,0.08);border:1.5px solid rgba(255,255,255,0.15);border-radius:12px;color:#fff;font-size:15px;outline:none;box-sizing:border-box"
              autocomplete="username" autocapitalize="none"
              onfocus="this.style.borderColor='#3b82f6'"
              onblur="this.style.borderColor='rgba(255,255,255,0.15)'"
              onkeydown="if(event.key==='Enter')document.getElementById('login-password').focus()">
          </div>
        </div>

        <div style="margin-bottom:20px">
          <label style="color:#94a3b8;font-size:12px;font-weight:600;display:block;margin-bottom:6px">รหัสผ่าน</label>
          <div style="position:relative">
            <i class="bi bi-lock-fill" style="position:absolute;left:14px;top:50%;transform:translateY(-50%);color:#64748b;font-size:16px"></i>
            <input type="password" id="login-password" placeholder="password"
              style="width:100%;padding:12px 14px 12px 42px;background:rgba(255,255,255,0.08);border:1.5px solid rgba(255,255,255,0.15);border-radius:12px;color:#fff;font-size:15px;outline:none;box-sizing:border-box"
              autocomplete="current-password"
              onfocus="this.style.borderColor='#3b82f6'"
              onblur="this.style.borderColor='rgba(255,255,255,0.15)'"
              onkeydown="if(event.key==='Enter')submitLogin()">
          </div>
        </div>

        <button id="login-btn" onclick="submitLogin()"
          style="width:100%;padding:14px;background:linear-gradient(135deg,#3b82f6,#8b5cf6);color:#fff;border:none;border-radius:14px;font-size:15px;font-weight:700;cursor:pointer;letter-spacing:0.5px;transition:opacity 0.2s"
          onmouseenter="this.style.opacity='0.9'" onmouseleave="this.style.opacity='1'">
          <i class="bi bi-box-arrow-in-right"></i> เข้าสู่ระบบ
        </button>

        <div id="login-error" style="display:none;margin-top:12px;padding:10px 14px;background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.3);border-radius:10px;color:#fca5a5;font-size:13px;text-align:center"></div>
      </div>

      <!-- Quick Setup Link -->
      <div style="text-align:center;margin-top:16px">
        <button onclick="showQuickSetup()"
          style="background:none;border:none;color:#64748b;font-size:12px;cursor:pointer;text-decoration:underline">
          ตั้งค่า Script URL
        </button>
      </div>

      <!-- Version -->
      <div style="text-align:center;margin-top:24px;color:#334155;font-size:11px">
        Comphone SuperApp AI v5.5 · PWA
      </div>
    </div>
  `;

  loginScreen.classList.remove('hidden');

  // Focus username
  setTimeout(() => {
    const input = document.getElementById('login-username');
    if (input) input.focus();
  }, 300);
}

// ============================================================
// 3.4 SUBMIT LOGIN
// ============================================================
async function submitLogin() {
  const username = (document.getElementById('login-username') || {}).value || '';
  const password = (document.getElementById('login-password') || {}).value || '';
  const errorDiv = document.getElementById('login-error');
  const btn = document.getElementById('login-btn');

  if (!username.trim()) { showLoginError('กรุณากรอกชื่อผู้ใช้'); return; }
  if (!password.trim()) { showLoginError('กรุณากรอกรหัสผ่าน'); return; }

  // Loading state
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="bi bi-hourglass-split"></i> กำลังเข้าสู่ระบบ...'; }
  if (errorDiv) errorDiv.style.display = 'none';

  try {
    // PHASE 20.4: ใช้ AI_EXECUTOR แทน fetch โดยตรง
    let data;
    if (window.AI_EXECUTOR && window.AI_EXECUTOR.query) {
      data = await window.AI_EXECUTOR.query({
        action: 'loginUser',
        payload: { username: username.trim(), password: password }
      });
    } else {
      // Fallback: GET with query params (POST body หายตอน GAS 302 redirect)
      const url = APP.scriptUrl || DEFAULT_SCRIPT_URL;
      const qs = new URLSearchParams({ action: 'loginUser', username: username.trim(), password: password }).toString();
      const res = await fetch(url + '?' + qs, { redirect: 'follow' });
      data = await res.json();
    }

    if (data && data.success) {
      // บันทึก session
      const session = {
        token: data.token,
        username: data.username,
        fullName: data.full_name || data.username,
        role: data.role,
        roleLabel: data.role_label,
        level: data.level || 0,
        canViewRevenue: data.can_view_revenue || false,
        canManageUsers: data.can_manage_users || false,
        loginAt: Date.now(),
      };
      localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));

      // Apply session
      applyAuthSession(session);

      // ซ่อน login screen
      const loginScreen = document.getElementById('login-screen');
      if (loginScreen) loginScreen.remove();

      // เริ่มแอป
      startMainApp();
    } else {
      const errMsg = data && data.error ? data.error : 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง';
      showLoginError(errMsg);
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="bi bi-box-arrow-in-right"></i> เข้าสู่ระบบ'; }
    }
  } catch (e) {
    showLoginError('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="bi bi-box-arrow-in-right"></i> เข้าสู่ระบบ'; }
  }
}

function showLoginError(msg) {
  const errorDiv = document.getElementById('login-error');
  if (errorDiv) {
    errorDiv.textContent = '❌ ' + msg;
    errorDiv.style.display = 'block';
  }
}

// ============================================================
// 3.5 LOGOUT
// ============================================================
function logout() {
  if (!confirm('ออกจากระบบ?')) return;

  // ลบ session
  localStorage.removeItem(AUTH_SESSION_KEY);
  localStorage.removeItem(AUTH_USER_KEY);

  // Clear AUTH state
  AUTH.token = null;
  AUTH.username = null;
  AUTH.fullName = null;
  AUTH.role = null;

  // Clear APP state
  APP.user = null;
  APP.role = null;
  APP.jobs = [];

  // แสดง login screen
  const mainApp = document.getElementById('main-app');
  if (mainApp) mainApp.classList.add('hidden');

  showLoginScreen();
  showToast('ออกจากระบบแล้ว');
}

// ============================================================
// 3.6 SHOW QUICK SETUP (ตั้งค่า Script URL)
// ============================================================
function showQuickSetup() {
  const url = prompt('Script URL (Google Apps Script):', APP.scriptUrl || DEFAULT_SCRIPT_URL);
  if (url !== null && url.trim()) {
    APP.scriptUrl = url.trim();
    localStorage.setItem('comphone_gas_url', url.trim());
    showToast('บันทึก Script URL แล้ว');
  }
}

// ============================================================
// 3.7 RENDER PROFILE WITH AUTH INFO
// ============================================================
function renderProfileWithAuth() {
  const roleConf = ROLES[APP.role] || ROLES.tech;
  const displayName = AUTH.fullName || (APP.user && APP.user.name) || 'ผู้ใช้';
  const initial = displayName.charAt(0).toUpperCase();

  const avatarLg = document.getElementById('profile-avatar-large');
  if (avatarLg) {
    avatarLg.textContent = initial;
    avatarLg.style.background = 'rgba(255,255,255,0.25)';
    avatarLg.style.color = '#fff';
  }

  const nameLg = document.getElementById('profile-name-large');
  if (nameLg) nameLg.textContent = displayName;

  const roleBadge = document.getElementById('profile-role-badge');
  if (roleBadge) roleBadge.textContent = AUTH.roleLabel || roleConf.label;

  // เพิ่มปุ่ม logout ใน profile
  const profileSection = document.querySelector('.profile-section');
  if (profileSection && !document.getElementById('logout-btn-item')) {
    const logoutItem = document.createElement('div');
    logoutItem.id = 'logout-btn-item';
    logoutItem.className = 'profile-item danger';
    logoutItem.onclick = logout;
    logoutItem.innerHTML = '<i class="bi bi-box-arrow-right"></i><span>ออกจากระบบ</span><i class="bi bi-chevron-right ms-auto"></i>';
    profileSection.appendChild(logoutItem);
  }
}

// ============================================================
// 3.8 ROLE-BASED UI VISIBILITY
// ============================================================
function applyRoleBasedUI() {
  const role = APP.role || 'tech';
  const level = AUTH.level || 0;

  // ซ่อน/แสดง More menu items ตาม role
  const moreInventory = document.getElementById('more-inventory-btn');
  const morePO = document.getElementById('more-po-btn');
  const moreDashboard = document.getElementById('more-dashboard-btn');

  // ทุก role เห็น inventory
  if (moreInventory) moreInventory.style.display = '';

  // Admin/Acct/Exec เห็น PO และ Dashboard
  if (morePO) morePO.style.display = (role === 'tech') ? 'none' : '';
  if (moreDashboard) moreDashboard.style.display = (role === 'tech') ? 'none' : '';
}

// ============================================================
// 3.9 OVERRIDE initApp เพื่อใช้ auth flow
// ============================================================
// ============================================================
// 3.9 INIT APP (Modified for server-side auth check)
// ============================================================
async function initApp() {
  const splash = document.getElementById('splash-screen');
  if (splash) {
    splash.style.opacity = '0';
    splash.style.transition = 'opacity 0.4s';
    setTimeout(() => splash.classList.add('hidden'), 400);
  }

  // โหลด Script URL ที่บันทึกไว้
  const savedUrl = localStorage.getItem('comphone_gas_url');
  if (savedUrl) APP.scriptUrl = savedUrl;

  // ตรวจสอบ local session ก่อน
  const hasLocalSession = checkAuthState();
  
  if (hasLocalSession) {
    // มี session ท้องถิ่น — ตรวจสอบกับเซิร์ฟเวอร์
    try {
      const sessionStr = localStorage.getItem(AUTH_SESSION_KEY);
      const session = JSON.parse(sessionStr);
      
      // เรียก verifySession ตรวจสอบ token กับ GAS
      const result = await callApi('verifySession', { token: session.token });
      
      if (result && (result.success || result.valid)) {
        // Token ยัง valid — ข้ามหน้า Login ได้
        console.log('[Auth] Server validated token — skip login');
        startMainApp();
        return;
      } else if (result && (result._errorKind === 'offline' || result._errorKind === 'timeout')) {
        console.warn('[Auth] Server temporarily unavailable — using local session');
        startMainApp();
        return;
      } else {
        // Token ไม่ valid แล้ว — ลบ session
        console.warn('[Auth] Token invalid on server — clear session');
        localStorage.removeItem(AUTH_SESSION_KEY);
        localStorage.removeItem(AUTH_USER_KEY);
      }
    } catch (e) {
      console.error('[Auth] Server validation failed:', e);
      // ถ้าเชื่อมต่อไม่ได้ ให้ใช้งานต่อด้วย local session (offline mode)
      console.warn('[Auth] Server unreachable — using local session');
      startMainApp();
      return;
    }
  }

  // ไม่มี session ที่ถูกต้อง — ตรวจสอบ legacy user data
  const savedUser = localStorage.getItem(AUTH_USER_KEY);
  if (savedUser) {
    try {
      const data = JSON.parse(savedUser);
      // ถ้ามี authToken แสดงว่าเคย login ผ่าน auth.js
      if (data.authToken) {
        showLoginScreen();
        return;
      }
      // Legacy setup (ไม่มี auth) — ใช้ข้อมูลเดิม
      APP.user = data;
      APP.role = data.role;
      APP.scriptUrl = data.scriptUrl || APP.scriptUrl;
      startMainApp();
      return;
    } catch (e) {}
  }

  // ไม่มีข้อมูลเลย — แสดง login screen
  showLoginScreen();
}

// ============================================================
// 3.10 OVERRIDE startMainApp เพื่อ apply auth
// ============================================================
const _originalStartMainApp = typeof startMainApp === 'function' ? startMainApp : null;

function startMainApp() {
  if (!APP.user) {
    showLoginScreen();
    return;
  }

  const app = document.getElementById('main-app');
  if (!app) return;
  app.classList.remove('hidden');

  // Apply theme
  const roleConf = ROLES[APP.role] || ROLES.tech;
  app.className = 'screen ' + roleConf.theme;

  // Set user info
  const displayName = AUTH.fullName || (APP.user && APP.user.name) || 'ผู้ใช้';
  const initial = displayName.charAt(0).toUpperCase();

  const avatar = document.getElementById('user-avatar');
  if (avatar) {
    avatar.textContent = initial;
    avatar.style.background = 'rgba(255,255,255,0.25)';
    avatar.style.color = '#fff';
  }

  const hour = new Date().getHours();
  const greet = hour < 12 ? 'อรุณสวัสดิ์' : hour < 17 ? 'สวัสดีตอนบ่าย' : 'สวัสดีตอนเย็น';
  const greetEl = document.getElementById('greeting-text');
  if (greetEl) greetEl.textContent = greet + ' 👋';

  const nameEl = document.getElementById('user-name-display');
  if (nameEl) nameEl.textContent = displayName;

  // Render home
  renderHome();
  renderProfileWithAuth();

  // Apply role-based UI
  applyRoleBasedUI();

  // Deep link
  handleDeepLink();

  // โหลดข้อมูลจาก GAS
  loadLiveData();
}

// ============================================================
// 3.11 OVERRIDE changeRole ใน profile
// ============================================================
function changeRole() {
  if (AUTH.token) {
    showToast('บทบาทถูกกำหนดโดยระบบ — ติดต่อ Admin เพื่อเปลี่ยน');
    return;
  }
  // Legacy mode
  const roles = Object.keys(ROLES);
  const idx = roles.indexOf(APP.role);
  const next = roles[(idx + 1) % roles.length];
  APP.role = next;
  if (APP.user) APP.user.role = next;
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(APP.user));
  const app = document.getElementById('main-app');
  if (app) app.className = 'screen ' + ROLES[next].theme;
  renderHome();
  renderProfileWithAuth();
  applyRoleBasedUI();
  showToast(`เปลี่ยนเป็น: ${ROLES[next].label}`);
}

// ============================================================
// EXPOSE GLOBALS
// ============================================================
window.checkAuthState = checkAuthState;
window.showLoginScreen = showLoginScreen;
window.submitLogin = submitLogin;
window.logout = logout;
window.showQuickSetup = showQuickSetup;
window.renderProfileWithAuth = renderProfileWithAuth;
window.applyRoleBasedUI = applyRoleBasedUI;
window.initApp = initApp;
window.startMainApp = startMainApp;
window.changeRole = changeRole;
