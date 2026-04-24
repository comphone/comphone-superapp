// COMPHONE SUPER APP V5.5
// ============================================================
// Auth.gs - Login & Role-Based Access Control (RBAC)
// ============================================================
// Roles: OWNER, ACCOUNTANT, SALES, TECHNICIAN
// ============================================================

var AUTH_ROLES = {
  OWNER:      { label: 'เจ้าของ',    level: 4, canViewRevenue: true,  canManageUsers: true  },
  ACCOUNTANT: { label: 'บัญชี',      level: 3, canViewRevenue: true,  canManageUsers: false },
  SALES:      { label: 'หน้าร้าน',   level: 2, canViewRevenue: false, canManageUsers: false },
  TECHNICIAN: { label: 'ช่าง',       level: 1, canViewRevenue: false, canManageUsers: false }
};

var AUTH_SHEET_NAME = 'DB_USERS';

// ============================================================
// 🔐 Login — ตรวจสอบ username/password
// ============================================================
function loginUser(username, password) {
  try {
    if (!username || !password) return { success: false, error: 'กรุณากรอก username และ password' };
    var ss = getComphoneSheet();
    var sh = findSheetByName(ss, AUTH_SHEET_NAME);
    if (!sh) return { success: false, error: 'ไม่พบตาราง DB_USERS กรุณาตั้งค่าระบบก่อน' };

    var rows = sh.getDataRange().getValues();
    var headers = rows[0];
    var idx = buildHeaderIndex_(headers);

    var colUser = idx['username'] !== undefined ? idx['username'] : idx['Username'] !== undefined ? idx['Username'] : 0;
    var colPass = idx['password'] !== undefined ? idx['password'] : idx['Password'] !== undefined ? idx['Password'] : 1;
    var colRole = idx['role'] !== undefined ? idx['role'] : idx['Role'] !== undefined ? idx['Role'] : 2;
    var colName = idx['full_name'] !== undefined ? idx['full_name'] : idx['name'] !== undefined ? idx['name'] : 3;
    var colActive = idx['active'] !== undefined ? idx['active'] : idx['Active'] !== undefined ? idx['Active'] : 4;

    var hashedInput = hashPassword_(password);

    for (var i = 1; i < rows.length; i++) {
      var row = rows[i];
      var rowUser = String(row[colUser] || '').trim().toLowerCase();
      var rowPass = String(row[colPass] || '').trim();
      var rowActive = String(row[colActive] || 'TRUE').toUpperCase();

      if (rowUser !== username.trim().toLowerCase()) continue;
      if (rowActive === 'FALSE' || rowActive === '0') return { success: false, error: 'บัญชีนี้ถูกระงับการใช้งาน' };

      var passMatch = (rowPass === hashedInput) || (rowPass === password);
      if (!passMatch) {
        try { trackFailedLogin_(rowUser); } catch(e) {}
        return { success: false, error: 'รหัสผ่านไม่ถูกต้อง' };
      }

      var role = String(row[colRole] || 'TECHNICIAN').toUpperCase();
      var roleInfo = AUTH_ROLES[role] || AUTH_ROLES.TECHNICIAN;
      var token = generateSessionToken_(rowUser, role);

      // บันทึก session ลง Script Properties
      var sessionKey = 'SESSION_' + token;
      var sessionData = JSON.stringify({
        username: rowUser,
        full_name: String(row[colName] || rowUser),
        role: role,
        role_label: roleInfo.label,
        level: roleInfo.level,
        can_view_revenue: roleInfo.canViewRevenue,
        can_manage_users: roleInfo.canManageUsers,
        login_at: new Date().toISOString(),
        expires_at: new Date(new Date().getTime() + 8 * 60 * 60 * 1000).toISOString()
      });
      safeSetProperty(sessionKey, sessionData);  // Guard: prevent exceeding 50 props

      try { logActivity('LOGIN', rowUser, 'เข้าสู่ระบบสำเร็จ role=' + role); } catch(e) {}
      try { resetFailedLogin_(rowUser); } catch(e) {}
      try { cleanupExpiredSessions_(); } catch(e) {}  // 🧹 Cleanup ทุกครั้งที่ login

      var forceChangePw = false;
      var colForce = idx['force_change_pw'] !== undefined ? idx['force_change_pw'] : -1;
      if (colForce >= 0) forceChangePw = String(rows[i][colForce] || '').toUpperCase() === 'TRUE';

      return {
        success: true,
        token: token,
        username: rowUser,
        full_name: String(row[colName] || rowUser),
        role: role,
        role_label: roleInfo.label,
        level: roleInfo.level,
        force_change_pw: forceChangePw,
        can_view_revenue: roleInfo.canViewRevenue,
        can_manage_users: roleInfo.canManageUsers
      };
    }

    return { success: false, error: 'ไม่พบ username นี้ในระบบ' };
    } catch (e) {
        try { if (typeof _logError_ === 'function') _logError_('MEDIUM', 'loginUser', e, {source: 'AUTH'}); } catch(_le) {}
    return { success: false, error: e.toString() };
  }
}

// ============================================================
// 🧹 Cleanup Expired Sessions — เรียกทุกครั้งที่ login
// ============================================================
function cleanupExpiredSessions_() {
  try {
    var props = PropertiesService.getScriptProperties();
    var all   = props.getProperties();
    var now   = new Date().getTime();
    var deleted = 0;

    for (var key in all) {
      // ลบเฉพาะ SESSION_ ที่หมดอายุ
      if (key.indexOf('SESSION_') !== 0) continue;
      try {
        var data = JSON.parse(all[key]);
        var expires = new Date(data.expires_at).getTime();
        if (expires < now) {
          props.deleteProperty(key);
          deleted++;
        }
      } catch (e) {
        // JSON ไม่สมบูรณ์ → ลบเลย
        props.deleteProperty(key);
        deleted++;
      }
    }
    if (deleted > 0) {
      Logger.log('🧹 Cleaned up ' + deleted + ' expired sessions');
    }
    return deleted;
  } catch (e) {
    Logger.log('cleanupExpiredSessions error: ' + e);
    return 0;
  }
}

// ============================================================
// 🔓 Logout
// ============================================================
function logoutUser(token) {
  try {
    if (!token) return { success: false, error: 'ไม่มี token' };
    PropertiesService.getScriptProperties().deleteProperty('SESSION_' + token);
    return { success: true };
  } catch (e) {
        try { if (typeof _logError_ === 'function') _logError_('MEDIUM', 'logoutUser', e, {source: 'AUTH'}); } catch(_le) {}
    return { success: false, error: e.toString() };
  }
}

// ============================================================
// ✅ Verify Session Token
// ============================================================
function verifySession(token) {
  try {
    if (!token) return { valid: false, error: 'ไม่มี token' };
    var raw = PropertiesService.getScriptProperties().getProperty('SESSION_' + token);
    if (!raw) return { valid: false, error: 'Session ไม่พบหรือหมดอายุ' };
    var session = JSON.parse(raw);
    var now = new Date();
    var expires = new Date(session.expires_at);
    if (now > expires) {
      PropertiesService.getScriptProperties().deleteProperty('SESSION_' + token);
      return { valid: false, error: 'Session หมดอายุ กรุณาเข้าสู่ระบบใหม่' };
    }
    return { valid: true, session: session };
  } catch (e) {
    return { valid: false, error: e.toString() };
  }
}

// ============================================================
// 👥 User Management (เฉพาะ OWNER)
// ============================================================
function listUsers(requestToken) {
  try {
    var auth = verifySession(requestToken);
    if (!auth.valid) return { success: false, error: auth.error };
    if (!auth.session.can_manage_users) return { success: false, error: 'ไม่มีสิทธิ์จัดการผู้ใช้' };

    var ss = getComphoneSheet();
    var sh = findOrCreateUserSheet_(ss);
    var rows = sh.getDataRange().getValues();
    var users = [];
    for (var i = 1; i < rows.length; i++) {
      if (!rows[i][0]) continue;
      users.push({
        username: String(rows[i][0] || ''),
        full_name: String(rows[i][3] || ''),
        role: String(rows[i][2] || 'TECHNICIAN'),
        role_label: (AUTH_ROLES[String(rows[i][2] || 'TECHNICIAN').toUpperCase()] || AUTH_ROLES.TECHNICIAN).label,
        active: String(rows[i][4] || 'TRUE').toUpperCase() !== 'FALSE',
        created_at: rows[i][5] ? String(rows[i][5]) : ''
      });
    }
    return { success: true, users: users, total: users.length };
  } catch (e) {
        try { if (typeof _logError_ === 'function') _logError_('MEDIUM', 'listUsers', e, {source: 'AUTH'}); } catch(_le) {}
    return { success: false, error: e.toString() };
  }
}

function createUser(requestToken, userData) {
  try {
    var auth = verifySession(requestToken);
    if (!auth.valid) return { success: false, error: auth.error };
    if (!auth.session.can_manage_users) return { success: false, error: 'ไม่มีสิทธิ์จัดการผู้ใช้' };

    var username = String(userData.username || '').trim().toLowerCase();
    var password = String(userData.password || '').trim();
    var role = String(userData.role || 'TECHNICIAN').toUpperCase();
    var fullName = String(userData.full_name || username);

    if (!username || !password) return { success: false, error: 'กรุณากรอก username และ password' };
    if (!AUTH_ROLES[role]) return { success: false, error: 'Role ไม่ถูกต้อง: ' + role };

    var ss = getComphoneSheet();
    var sh = findOrCreateUserSheet_(ss);
    var rows = sh.getDataRange().getValues();
    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][0] || '').toLowerCase() === username) {
        return { success: false, error: 'Username นี้มีอยู่แล้ว' };
      }
    }

    var hashed = hashPassword_(password);
    sh.appendRow([username, hashed, role, fullName, 'TRUE', getThaiTimestamp(), auth.session.username]);
    try { logActivity('CREATE_USER', auth.session.username, 'สร้างผู้ใช้: ' + username + ' role=' + role); } catch(e) {}
    return { success: true, username: username, role: role };
  } catch (e) {
        try { if (typeof _logError_ === 'function') _logError_('MEDIUM', 'createUser', e, {source: 'AUTH'}); } catch(_le) {}
    return { success: false, error: e.toString() };
  }
}

function updateUserRole(requestToken, username, newRole) {
  try {
    var auth = verifySession(requestToken);
    if (!auth.valid) return { success: false, error: auth.error };
    if (!auth.session.can_manage_users) return { success: false, error: 'ไม่มีสิทธิ์จัดการผู้ใช้' };

    newRole = String(newRole || '').toUpperCase();
    if (!AUTH_ROLES[newRole]) return { success: false, error: 'Role ไม่ถูกต้อง' };

    var ss = getComphoneSheet();
    var sh = findSheetByName(ss, AUTH_SHEET_NAME);
    if (!sh) return { success: false, error: 'ไม่พบ DB_USERS' };
    var rows = sh.getDataRange().getValues();
    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][0] || '').toLowerCase() === username.toLowerCase()) {
        sh.getRange(i + 1, 3).setValue(newRole);
        return { success: true, username: username, new_role: newRole };
      }
    }
    return { success: false, error: 'ไม่พบ username: ' + username };
  } catch (e) {
        try { if (typeof _logError_ === 'function') _logError_('MEDIUM', 'updateUserRole', e, {source: 'AUTH'}); } catch(_le) {}
    return { success: false, error: e.toString() };
  }
}

function setUserActive(requestToken, username, active) {
  try {
    var auth = verifySession(requestToken);
    if (!auth.valid) return { success: false, error: auth.error };
    if (!auth.session.can_manage_users) return { success: false, error: 'ไม่มีสิทธิ์จัดการผู้ใช้' };

    var ss = getComphoneSheet();
    var sh = findSheetByName(ss, AUTH_SHEET_NAME);
    if (!sh) return { success: false, error: 'ไม่พบ DB_USERS' };
    var rows = sh.getDataRange().getValues();
    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][0] || '').toLowerCase() === username.toLowerCase()) {
        sh.getRange(i + 1, 5).setValue(active ? 'TRUE' : 'FALSE');
        return { success: true, username: username, active: active };
      }
    }
    return { success: false, error: 'ไม่พบ username: ' + username };
  } catch (e) {
        try { if (typeof _logError_ === 'function') _logError_('MEDIUM', 'setUserActive', e, {source: 'AUTH'}); } catch(_le) {}
    return { success: false, error: e.toString() };
  }
}

// ============================================================
// 🔧 Setup: สร้าง DB_USERS sheet พร้อม default OWNER
// ============================================================
function setupUserSheet() {
  try {
    var ss = getComphoneSheet();
    var sh = findOrCreateUserSheet_(ss);
    var rows = sh.getDataRange().getValues();
    var hasOwner = false;
    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][2] || '').toUpperCase() === 'OWNER') { hasOwner = true; break; }
    }
    if (!hasOwner) {
      // ใช้ DEFAULT_ADMIN_PASSWORD จาก Script Properties หรือ fallback ที่ปลอดภัยกว่า hardcode
      var defaultPw = PropertiesService.getScriptProperties().getProperty('DEFAULT_ADMIN_PASSWORD') || 'Comphone@2025!';
      sh.appendRow(['admin', hashPassword_(defaultPw), 'OWNER', 'ผู้ดูแลระบบ', 'TRUE', getThaiTimestamp(), 'SYSTEM']);
    }
    return { success: true, message: 'DB_USERS พร้อมใช้งาน', rows: sh.getLastRow() - 1 };
  } catch (e) {
        try { if (typeof _logError_ === 'function') _logError_('MEDIUM', 'setUserActive', e, {source: 'AUTH'}); } catch(_le) {}
    return { success: false, error: e.toString() };
  }
}

// ============================================================
// 🔒 Private Helpers
// ============================================================
function hashPassword_(password) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(password || ''));
  return bytes.map(function(b) { return ('0' + (b < 0 ? b + 256 : b).toString(16)).slice(-2); }).join('');
}

function generateSessionToken_(username, role) {
  var raw = username + role + new Date().getTime() + Math.random();
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, raw);
  return bytes.map(function(b) { return ('0' + (b < 0 ? b + 256 : b).toString(16)).slice(-2); }).join('').substring(0, 32);
}

function findOrCreateUserSheet_(ss) {
  var sh = findSheetByName(ss, AUTH_SHEET_NAME);
  if (sh) return sh;
  sh = ss.insertSheet(AUTH_SHEET_NAME);
  sh.appendRow(['username', 'password', 'role', 'full_name', 'active', 'created_at', 'created_by']);
  sh.setFrozenRows(1);
  sh.getRange(1, 1, 1, 7).setFontWeight('bold').setBackground('#1a73e8').setFontColor('#ffffff');
  return sh;
}

function buildHeaderIndex_(headers) {
  var idx = {};
  for (var i = 0; i < headers.length; i++) {
    idx[String(headers[i]).toLowerCase().trim()] = i;
    idx[String(headers[i]).trim()] = i;
  }
  return idx;
}

function findHeaderIndex_(headers, candidates) {
  for (var c = 0; c < candidates.length; c++) {
    for (var h = 0; h < headers.length; h++) {
      if (String(headers[h]).toLowerCase().trim() === candidates[c].toLowerCase()) return h;
    }
  }
  return -1;
}

// ============================================================
// User Management — Admin Panel (Sprint 3 T3)
// ฟังก์ชัน internal สำหรับ Router.gs (ไม่ต้องการ token เพราะ Router ตรวจ auth แล้ว)
// ============================================================

/**
 * listUsers_ — คืนรายชื่อผู้ใช้ทั้งหมด (ไม่รวม password_hash)
 * @param {Object} payload
 * @return {Object} { success, data: Array }
 */
function listUsers_(payload) {
  try {
    var ss = getComphoneSheet();
    var sh = findSheetByName(ss, AUTH_SHEET_NAME);
    if (!sh) return { success: false, error: 'ไม่พบ DB_USERS' };
    var rows    = sh.getDataRange().getValues();
    var headers = rows[0];
    var idx     = buildHeaderIndex_(headers);
    var result  = [];
    for (var i = 1; i < rows.length; i++) {
      if (!rows[i][0]) continue;
      var row = rows[i];
      var colActive = idx['active'] !== undefined ? idx['active'] : 4;
      var colForce  = idx['force_change_pw'] !== undefined ? idx['force_change_pw'] : -1;
      result.push({
        username:        String(row[idx['username'] !== undefined ? idx['username'] : 0] || ''),
        full_name:       String(row[idx['full_name'] !== undefined ? idx['full_name'] : idx['name'] !== undefined ? idx['name'] : 3] || ''),
        role:            String(row[idx['role'] !== undefined ? idx['role'] : 2] || '').toLowerCase(),
        active:          String(row[colActive] || 'TRUE').toUpperCase(),
        force_change_pw: colForce >= 0 ? String(row[colForce] || '').toUpperCase() : 'FALSE',
        created_at:      String(row[idx['created_at'] !== undefined ? idx['created_at'] : 5] || '')
      });
    }
    return { success: true, data: result };
  } catch (e) {
        try { if (typeof _logError_ === 'function') _logError_('MEDIUM', 'listUsers_', e, {source: 'AUTH'}); } catch(_le) {}
    return { success: false, error: e.toString() };
  }
}

/**
 * createUser_ — สร้างผู้ใช้ใหม่ (internal)
 * @param {Object} payload { username, full_name, role, password, created_by }
 * @return {Object} { success }
 */
function createUser_(payload) {
  try {
    var username = String(payload.username || '').trim().toLowerCase();
    var fullName = String(payload.full_name || '').trim();
    var role     = String(payload.role     || 'tech').trim().toLowerCase();
    var password = String(payload.password || '').trim();
    if (!username || !password) return { success: false, error: 'กรุณาระบุ username และ password' };

    var ss = getComphoneSheet();
    var sh = findOrCreateUserSheet_(ss);
    var rows = sh.getDataRange().getValues();
    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][0]).toLowerCase() === username) return { success: false, error: 'Username นี้มีอยู่แล้ว' };
    }

    var hash = hashPassword_(password);
    sh.appendRow([username, hash, role, fullName, 'TRUE', 'FALSE', getThaiTimestamp(), payload.created_by || 'admin']);
    try { writeAuditLog('USER_CREATED', username, 'role=' + role, payload.created_by || 'admin'); } catch(e) {}
    return { success: true };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

/**
 * setUserActive_ — เปิด/ปิดใช้งานบัญชี (internal)
 * @param {Object} payload { username, active: boolean|string, changed_by }
 * @return {Object} { success }
 */
function setUserActive_(payload) {
  try {
    var username = String(payload.username || '').trim().toLowerCase();
    var active   = payload.active === true || payload.active === 'true' || payload.active === 'TRUE';
    var ss = getComphoneSheet();
    var sh = findSheetByName(ss, AUTH_SHEET_NAME);
    if (!sh) return { success: false, error: 'ไม่พบ DB_USERS' };
    var rows    = sh.getDataRange().getValues();
    var headers = rows[0];
    var idx     = buildHeaderIndex_(headers);
    var colActive = idx['active'] !== undefined ? idx['active'] : 4;
    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][0]).toLowerCase() === username) {
        sh.getRange(i + 1, colActive + 1).setValue(active ? 'TRUE' : 'FALSE');
        try { writeAuditLog(active ? 'ACCOUNT_UNLOCKED' : 'ACCOUNT_LOCKED', username, 'by admin', payload.changed_by || 'admin'); } catch(e) {}
        return { success: true };
      }
    }
    return { success: false, error: 'ไม่พบผู้ใช้ ' + username };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

/**
 * updateUserRole_ — อัปเดต role และ full_name (internal)
 * @param {Object} payload { username, newRole, full_name, changed_by }
 * @return {Object} { success }
 */
function updateUserRole_(payload) {
  try {
    var username = String(payload.username || '').trim().toLowerCase();
    var newRole  = String(payload.newRole  || '').trim().toLowerCase();
    var fullName = String(payload.full_name || '').trim();
    var ss = getComphoneSheet();
    var sh = findSheetByName(ss, AUTH_SHEET_NAME);
    if (!sh) return { success: false, error: 'ไม่พบ DB_USERS' };
    var rows    = sh.getDataRange().getValues();
    var headers = rows[0];
    var idx     = buildHeaderIndex_(headers);
    var colRole = idx['role']      !== undefined ? idx['role']      : 2;
    var colName = idx['full_name'] !== undefined ? idx['full_name'] : idx['name'] !== undefined ? idx['name'] : 3;
    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][0]).toLowerCase() === username) {
        if (newRole)  sh.getRange(i + 1, colRole + 1).setValue(newRole);
        if (fullName) sh.getRange(i + 1, colName + 1).setValue(fullName);
        try { writeAuditLog('USER_UPDATED', username, 'role=' + newRole, payload.changed_by || 'admin'); } catch(e) {}
        return { success: true };
      }
    }
    return { success: false, error: 'ไม่พบผู้ใช้ ' + username };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}
