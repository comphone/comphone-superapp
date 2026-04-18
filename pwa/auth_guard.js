// ============================================================
// COMPHONE SUPER APP V5.5
// auth_guard.js — Role-based UI Guard
// Version: 5.6.0
// ============================================================
// ฟีเจอร์:
//   1. PERMISSION_MAP — กำหนดสิทธิ์ตาม role
//   2. canAccess(permission) — ตรวจสอบสิทธิ์
//   3. guardPage(page) — ป้องกันการเข้าหน้าที่ไม่มีสิทธิ์
//   4. applyRoleUI() — ซ่อน/แสดง UI elements ตาม role
//   5. requireAuth() — ตรวจสอบว่า login แล้วหรือยัง
// ============================================================

'use strict';

// ============================================================
// PERMISSION MAP
// ============================================================
/**
 * กำหนดสิทธิ์ตาม role (ตรงกับ AUTH_ROLES ใน Auth.gs)
 * level: OWNER=4, ACCOUNTANT=3, SALES=2, TECHNICIAN=1
 */
const PERMISSION_MAP = {
  // Pages
  'page:admin':       ['owner'],
  'page:reports':     ['owner', 'accountant'],
  'page:dashboard':   ['owner', 'accountant', 'sales'],
  'page:jobs':        ['owner', 'accountant', 'sales', 'technician'],
  'page:crm':         ['owner', 'sales'],
  'page:inventory':   ['owner', 'accountant', 'sales'],
  'page:po':          ['owner', 'accountant'],
  'page:attendance':  ['owner', 'accountant'],

  // Actions
  'action:createJob':     ['owner', 'sales'],
  'action:deleteJob':     ['owner'],
  'action:viewRevenue':   ['owner', 'accountant'],
  'action:manageUsers':   ['owner'],
  'action:setupSystem':   ['owner'],
  'action:viewPL':        ['owner', 'accountant'],
  'action:nudgeTech':     ['owner', 'sales'],
  'action:sendLine':      ['owner', 'sales'],
  'action:addAppointment':['owner', 'sales', 'technician'],
  'action:markDone':      ['owner', 'technician'],
  'action:markWaiting':   ['owner', 'technician'],
  'action:createBilling': ['owner', 'accountant', 'sales'],
  'action:transferStock': ['owner', 'accountant'],
  'action:createPO':      ['owner', 'accountant'],
};

// Role aliases (GAS role → PWA role key)
const ROLE_ALIASES = {
  'owner':      'owner',
  'admin':      'owner',      // admin = owner
  'accountant': 'accountant',
  'acct':       'accountant',
  'sales':      'sales',
  'technician': 'technician',
  'tech':       'technician',
  'exec':       'owner',      // exec = owner level
};

// ============================================================
// CORE: canAccess()
// ============================================================
/**
 * ตรวจสอบว่า user ปัจจุบันมีสิทธิ์ทำ permission นี้หรือไม่
 * @param {string} permission - เช่น 'page:admin', 'action:deleteJob'
 * @return {boolean}
 */
function canAccess(permission) {
  if (!permission) return true;

  const user = typeof APP !== 'undefined' ? APP.user : null;
  if (!user) return false;

  // ดึง role ของ user
  const rawRole = String(user.role || user.authRole || '').toLowerCase();
  const role    = ROLE_ALIASES[rawRole] || rawRole;

  // ถ้าไม่มีใน PERMISSION_MAP = ทุกคนเข้าได้
  const allowed = PERMISSION_MAP[permission];
  if (!allowed) return true;

  return allowed.includes(role);
}

// ============================================================
// guardPage() — ป้องกันการเข้าหน้าที่ไม่มีสิทธิ์
// ============================================================
/**
 * ตรวจสอบสิทธิ์ก่อนเข้าหน้า
 * ถ้าไม่มีสิทธิ์จะ redirect กลับหน้า home และแสดง toast
 * @param {string} page - ชื่อหน้า เช่น 'admin', 'reports'
 * @return {boolean} true = มีสิทธิ์, false = ไม่มีสิทธิ์
 */
function guardPage(page) {
  const permission = 'page:' + page;
  if (canAccess(permission)) return true;

  // ไม่มีสิทธิ์
  const user = typeof APP !== 'undefined' ? APP.user : null;
  const role = user ? (user.role || 'unknown') : 'unknown';

  showToast(`⛔ ไม่มีสิทธิ์เข้าหน้านี้ (role: ${role})`);

  // กลับหน้า home
  if (typeof goPage === 'function') {
    goPage('home', document.getElementById('nav-home'));
  }

  return false;
}

// ============================================================
// guardAction() — ป้องกัน action ที่ไม่มีสิทธิ์
// ============================================================
/**
 * ตรวจสอบสิทธิ์ก่อนทำ action
 * @param {string} action - ชื่อ action เช่น 'deleteJob', 'viewRevenue'
 * @return {boolean} true = มีสิทธิ์
 */
function guardAction(action) {
  const permission = 'action:' + action;
  if (canAccess(permission)) return true;

  const user = typeof APP !== 'undefined' ? APP.user : null;
  const role = user ? (user.role || 'unknown') : 'unknown';

  showToast(`⛔ ไม่มีสิทธิ์ทำรายการนี้ (role: ${role})`);
  return false;
}

// ============================================================
// requireAuth() — ตรวจสอบ login
// ============================================================
/**
 * ตรวจสอบว่า user login แล้วหรือยัง
 * ถ้ายังไม่ login จะ redirect ไปหน้า login
 * @return {boolean}
 */
function requireAuth() {
  const user = typeof APP !== 'undefined' ? APP.user : null;
  if (user && (user.authToken || user.username)) return true;

  // ยังไม่ login
  if (typeof goPage === 'function') {
    goPage('login', null);
  } else {
    // Fallback: reload
    window.location.reload();
  }
  return false;
}

// ============================================================
// applyRoleUI() — ซ่อน/แสดง UI elements ตาม role
// ============================================================
/**
 * ซ่อน/แสดง elements ตาม data-role-require attribute
 * ใช้ใน HTML: <button data-role-require="owner,accountant">...</button>
 * เรียกหลัง login สำเร็จ
 */
function applyRoleUI() {
  const user = typeof APP !== 'undefined' ? APP.user : null;
  if (!user) return;

  const rawRole = String(user.role || '').toLowerCase();
  const role    = ROLE_ALIASES[rawRole] || rawRole;

  // Elements ที่ต้องการ role เฉพาะ
  document.querySelectorAll('[data-role-require]').forEach(el => {
    const required = String(el.dataset.roleRequire || '')
      .split(',')
      .map(r => r.trim().toLowerCase());

    if (required.length === 0 || required.includes(role)) {
      el.style.display = '';
      el.removeAttribute('aria-hidden');
    } else {
      el.style.display = 'none';
      el.setAttribute('aria-hidden', 'true');
    }
  });

  // Elements ที่ต้องการ level ขั้นต่ำ
  const ROLE_LEVELS = { owner: 4, accountant: 3, sales: 2, technician: 1 };
  const userLevel = ROLE_LEVELS[role] || 1;

  document.querySelectorAll('[data-role-min-level]').forEach(el => {
    const minLevel = Number(el.dataset.roleMinLevel || 1);
    if (userLevel >= minLevel) {
      el.style.display = '';
    } else {
      el.style.display = 'none';
    }
  });

  // Nav items
  const navAdmin = document.getElementById('nav-admin');
  if (navAdmin) {
    navAdmin.style.display = (role === 'owner') ? '' : 'none';
  }

  // แสดง role badge ใน header (ถ้ามี)
  const roleBadge = document.getElementById('user-role-badge');
  if (roleBadge) {
    const roleLabels = {
      owner: 'เจ้าของ',
      accountant: 'บัญชี',
      sales: 'หน้าร้าน',
      technician: 'ช่าง'
    };
    roleBadge.textContent = roleLabels[role] || role;
    roleBadge.className = 'role-badge role-' + role;
  }
}

// ============================================================
// getRoleLabel() — ดึงชื่อ role ภาษาไทย
// ============================================================
/**
 * @param {string} role
 * @return {string}
 */
function getRoleLabel(role) {
  const labels = {
    owner:      'เจ้าของ',
    admin:      'เจ้าของ',
    accountant: 'บัญชี',
    acct:       'บัญชี',
    sales:      'หน้าร้าน',
    technician: 'ช่าง',
    tech:       'ช่าง',
    exec:       'ผู้บริหาร'
  };
  return labels[String(role || '').toLowerCase()] || role;
}

// ============================================================
// PATCH goPage() — เพิ่ม guard ก่อนเปลี่ยนหน้า
// ============================================================
/**
 * Wrap goPage ที่มีอยู่แล้วใน app.js เพื่อเพิ่ม guard
 * เรียกหลัง app.js โหลดแล้ว
 */
(function patchGoPage() {
  // รอให้ app.js โหลดก่อน
  window.addEventListener('load', function() {
    const originalGoPage = window.goPage;
    if (typeof originalGoPage !== 'function') return;

    window.goPage = function(page, navEl) {
      // Pages ที่ต้อง guard
      const guardedPages = ['admin', 'reports'];
      if (guardedPages.includes(page)) {
        if (!guardPage(page)) return; // ไม่มีสิทธิ์ — หยุด
      }
      return originalGoPage.call(this, page, navEl);
    };
  });
})();

// ============================================================
// EXPOSE
// ============================================================
window.canAccess    = canAccess;
window.guardPage    = guardPage;
window.guardAction  = guardAction;
window.requireAuth  = requireAuth;
window.applyRoleUI  = applyRoleUI;
window.getRoleLabel = getRoleLabel;
window.PERMISSION_MAP = PERMISSION_MAP;
