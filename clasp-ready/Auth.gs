// COMPHONE SUPER APP V5.5
// ============================================================
// Auth.gs - Login & Role-Based Access Control (RBAC)
// ============================================================
// VERSION: 5.5.8-SECURE
// CHANGE LOG:
//   V5.5.8: ย้าย session storage จาก ScriptProperties → CacheService
//           เพิ่ม HMAC-SHA256 token signature
//           เพิ่ม cleanupSessions() + auto-cleanup trigger
//           เพิ่ม suspicious activity logging
// ============================================================
// Roles: OWNER, ACCOUNTANT, SALES, TECHNICIAN
// ============================================================

'use strict';

var AUTH_ROLES = {
  OWNER:      { label: 'เจ้าของ',    level: 4, canViewRevenue: true,  canManageUsers: true  },
  ACCOUNTANT: { label: 'บัญชี',      level: 3, canViewRevenue: true,  canManageUsers: false },
  SALES:      { label: 'หน้าร้าน',   level: 2, canViewRevenue: false, canManageUsers: false },
  TECHNICIAN: { label: 'ช่าง',       level: 1, canViewRevenue: false, canManageUsers: false }
};

var AUTH_SHEET_NAME    = 'DB_USERS';
var SESSION_TTL_SEC    = 8 * 60 * 60;   // 8 ชั่วโมง (CacheService max = 21600 = 6h, fallback ใช้ 6h)
var SESSION_CACHE_TTL  = 6 * 60 * 60;   // CacheService รองรับสูงสุด 6 ชั่วโมง
var TOKEN_HMAC_SECRET  = 'COMPHONE_V5_HMAC_2026';  // ใช้ Script Property override ได้
var MAX_SESSIONS_PER_USER = 3;          // Cache Harden V5.5.8: max concurrent sessions ต่อ user

// ============================================================
// 🔐 Login — ตรวจสอบ username/password
// ============================================================
function loginUser(username, password) {
  try {
    if (!username || !password) return { success: false, error: 'กรุณากรอก username และ password' };
    var ss = getComphoneSheet();
    var sh = findSheetByName(ss, AUTH_SHEET_NAME);
    if (!sh) return { success: false, error: 'ไม่พบตาราง DB_USERS กรุณาตั้งค่าระบบก่อน' };

    var rows    = sh.getDataRange().getValues();
    var headers = rows[0];
    var idx     = buildHeaderIndex_(headers);

    var colUser   = idx['username']  !== undefined ? idx['username']  : 0;
    var colPass   = idx['password']  !== undefined ? idx['password']  : 1;
    var colRole   = idx['role']      !== undefined ? idx['role']      : 2;
    var colName   = idx['full_name'] !== undefined ? idx['full_name'] : idx['name'] !== undefined ? idx['name'] : 3;
    var colActive = idx['active']    !== undefined ? idx['active']    : 4;

    var hashedInput = hashPassword_(password);

    for (var i = 1; i < rows.length; i++) {
      var row      = rows[i];
      var rowUser  = String(row[colUser]   || '').trim().toLowerCase();
      var rowPass  = String(row[colPass]   || '').trim();
      var rowActive = String(row[colActive] || 'TRUE').toUpperCase();

      if (rowUser !== username.trim().toLowerCase()) continue;
      if (rowActive === 'FALSE' || rowActive === '0') {
        return { success: false, error: 'บัญชีนี้ถูกระงับการใช้งาน' };
      }

      var passMatch = (rowPass === hashedInput) || (rowPass === password);
      if (!passMatch) {
        try { trackFailedLogin_(rowUser); } catch(e) {}
        return { success: false, error: 'รหัสผ่านไม่ถูกต้อง' };
      }

      var role     = String(row[colRole] || 'TECHNICIAN').toUpperCase();
      var roleInfo = AUTH_ROLES[role] || AUTH_ROLES.TECHNICIAN;
      var token    = generateSignedToken_(rowUser, role);

      // ✅ Cache Harden: ตรวจ max sessions ต่อ user (MAX_SESSIONS_PER_USER = 3)
      try {
        var _userSessionKey = 'USR_SESS_' + rowUser;
        var _existingSessions = JSON.parse(getCacheService_().get(_userSessionKey) || '[]');
        if (_existingSessions.length >= MAX_SESSIONS_PER_USER) {
          // ลบ session เก่าสุด (oldest first)
          var _oldest = _existingSessions.shift();
          getCacheService_().remove('SESSION_' + _oldest);
          Logger.log('🔒 [Auth] Max sessions reached for ' + rowUser + ' — removed oldest: ' + _oldest.substring(0,8) + '...');
        }
        _existingSessions.push(token);
        getCacheService_().put(_userSessionKey, JSON.stringify(_existingSessions), SESSION_CACHE_TTL);
      } catch(e) { /* max session check ไม่ critical */ }

      // ✅ บันทึก session ลง CacheService (ไม่ใช้ ScriptProperties)
      var sessionData = JSON.stringify({
        username:         rowUser,
        full_name:        String(row[colName] || rowUser),
        role:             role,
        role_label:       roleInfo.label,
        level:            roleInfo.level,
        can_view_revenue: roleInfo.canViewRevenue,
        can_manage_users: roleInfo.canManageUsers,
        login_at:         new Date().toISOString(),
        expires_at:       new Date(new Date().getTime() + SESSION_TTL_SEC * 1000).toISOString()
      });
      getCacheService_().put('SESSION_' + token, sessionData, SESSION_CACHE_TTL);

      try { logActivity('LOGIN', rowUser, 'เข้าสู่ระบบสำเร็จ role=' + role); } catch(e) {}
      try { resetFailedLogin_(rowUser); } catch(e) {}

      var forceChangePw = false;
      var colForce = idx['force_change_pw'] !== undefined ? idx['force_change_pw'] : -1;
      if (colForce >= 0) forceChangePw = String(rows[i][colForce] || '').toUpperCase() === 'TRUE';

      return {
        success:          true,
        token:            token,
        username:         rowUser,
        full_name:        String(row[colName] || rowUser),
        role:             role,
        role_label:       roleInfo.label,
        level:            roleInfo.level,
        force_change_pw:  forceChangePw,
        can_view_revenue: roleInfo.canViewRevenue,
        can_manage_users: roleInfo.canManageUsers
      };
    }

    return { success: false, error: 'ไม่พบ username นี้ในระบบ' };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

// ============================================================
// 🔓 Logout
// ============================================================
function logoutUser(token) {
  try {
    if (!token) return { success: false, error: 'ไม่มี token' };
    getCacheService_().remove('SESSION_' + token);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

// ============================================================
// ✅ Verify Session Token (CacheService + HMAC validation)
// ============================================================
function verifySession(token) {
  try {
    if (!token) return { valid: false, error: 'ไม่มี token' };

    // 1. ตรวจ HMAC signature ก่อน (ป้องกัน forged token)
    if (!verifyTokenSignature_(token)) {
      logSuspiciousActivity_('INVALID_TOKEN_SIGNATURE', token.substring(0, 8) + '...');
      return { valid: false, error: 'Token ไม่ถูกต้อง (signature invalid)' };
    }

    // 2. ดึง session จาก CacheService
    var raw = getCacheService_().get('SESSION_' + token);
    if (!raw) {
      return { valid: false, error: 'Session ไม่พบหรือหมดอายุ กรุณาเข้าสู่ระบบใหม่' };
    }

    var session = JSON.parse(raw);

    // 3. ตรวจ expiry ซ้ำ (double-check)
    var now     = new Date();
    var expires = new Date(session.expires_at);
    if (now > expires) {
      getCacheService_().remove('SESSION_' + token);
      return { valid: false, error: 'Session หมดอายุ กรุณาเข้าสู่ระบบใหม่' };
    }

    return { valid: true, session: session };
  } catch (e) {
    return { valid: false, error: e.toString() };
  }
}

// ============================================================
// 🧹 cleanupSessions — ลบ SESSION_* ที่ค้างใน ScriptProperties
// (ใช้สำหรับ migrate จาก version เก่า + ทำความสะอาด)
// ============================================================
function cleanupSessions() {
  try {
    var props = PropertiesService.getScriptProperties();
    var all   = props.getProperties();
    var deleted = 0;

    Object.keys(all).forEach(function(key) {
      if (key.startsWith('SESSION_')) {
        props.deleteProperty(key);
        deleted++;
      }
    });

    // Log ผลลัพธ์
    try {
      logActivity('CLEANUP_SESSIONS', 'SYSTEM',
        'ลบ SESSION_* จาก ScriptProperties: ' + deleted + ' รายการ');
    } catch(e) {}

    return { success: true, deleted: deleted, message: 'ลบ SESSION_* เรียบร้อย: ' + deleted + ' รายการ' };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

// ============================================================
// 🔒 verifyToken — สำหรับ Router.gs ใช้ตรวจ token ทุก request
// ============================================================
function verifyToken(token) {
  return verifySession(token);
}

// ============================================================
// 👥 User Management (เฉพาะ OWNER)
// ============================================================
function listUsers(requestToken) {
  try {
    var auth = verifySession(requestToken);
    if (!auth.valid) return { success: false, error: auth.error };
    if (!auth.session.can_manage_users) return { success: false, error: 'ไม่มีสิทธิ์จัดการผู้ใช้' };

    var ss   = getComphoneSheet();
    var sh   = findOrCreateUserSheet_(ss);
    var rows = sh.getDataRange().getValues();
    var users = [];
    for (var i = 1; i < rows.length; i++) {
      if (!rows[i][0]) continue;
      users.push({
        username:   String(rows[i][0] || ''),
        full_name:  String(rows[i][3] || ''),
        role:       String(rows[i][2] || 'TECHNICIAN'),
        role_label: (AUTH_ROLES[String(rows[i][2] || 'TECHNICIAN').toUpperCase()] || AUTH_ROLES.TECHNICIAN).label,
        active:     String(rows[i][4] || 'TRUE').toUpperCase() !== 'FALSE',
        created_at: rows[i][5] ? String(rows[i][5]) : ''
      });
    }
    return { success: true, users: users, total: users.length };
  } catch (e) {
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
    var role     = String(userData.role     || 'TECHNICIAN').toUpperCase();
    var fullName = String(userData.full_name || username);

    if (!username || !password) return { success: false, error: 'กรุณากรอก username และ password' };
    if (!AUTH_ROLES[role]) return { success: false, error: 'Role ไม่ถูกต้อง: ' + role };

    var ss   = getComphoneSheet();
    var sh   = findOrCreateUserSheet_(ss);
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

    var ss   = getComphoneSheet();
    var sh   = findSheetByName(ss, AUTH_SHEET_NAME);
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
    return { success: false, error: e.toString() };
  }
}

function setUserActive(requestToken, username, active) {
  try {
    var auth = verifySession(requestToken);
    if (!auth.valid) return { success: false, error: auth.error };
    if (!auth.session.can_manage_users) return { success: false, error: 'ไม่มีสิทธิ์จัดการผู้ใช้' };

    var ss   = getComphoneSheet();
    var sh   = findSheetByName(ss, AUTH_SHEET_NAME);
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
      var defaultPw = PropertiesService.getScriptProperties().getProperty('DEFAULT_ADMIN_PASSWORD') || 'Comphone@2025!';
      sh.appendRow(['admin', hashPassword_(defaultPw), 'OWNER', 'ผู้ดูแลระบบ', 'TRUE', getThaiTimestamp(), 'SYSTEM']);
    }
    return { success: true, message: 'DB_USERS พร้อมใช้งาน', rows: sh.getLastRow() - 1 };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

// ============================================================
// 🔧 Force Reset Admin
// ============================================================
function forceResetAdmin(newPassword) {
  try {
    var ss = getComphoneSheet();
    var sh = findSheetByName(ss, AUTH_SHEET_NAME);
    if (!sh) {
      sh = ss.insertSheet(AUTH_SHEET_NAME);
    }
    sh.clearContents();
    sh.appendRow(['username', 'password', 'role', 'full_name', 'active', 'created_at', 'created_by']);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, 7).setFontWeight('bold').setBackground('#1a73e8').setFontColor('#ffffff');
    var pw = newPassword || PropertiesService.getScriptProperties().getProperty('DEFAULT_ADMIN_PASSWORD') || 'Comphone@2025!';
    sh.appendRow(['admin', hashPassword_(pw), 'OWNER', 'ผู้ดูแลระบบ', 'TRUE', getThaiTimestamp(), 'SYSTEM']);
    return { success: true, message: 'รีเซ็ต DB_USERS สำเร็จ สร้าง admin user ใหม่แล้ว', username: 'admin' };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

// ============================================================
// 🔒 Private Helpers
// ============================================================

/**
 * getCacheService_ — คืน ScriptCache (shared ระหว่าง requests ทั้งหมด)
 */
function getCacheService_() {
  return CacheService.getScriptCache();
}

/**
 * hashPassword_ — SHA-256 hash
 */
function hashPassword_(password) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(password || ''));
  return bytes.map(function(b) { return ('0' + (b < 0 ? b + 256 : b).toString(16)).slice(-2); }).join('');
}

/**
 * getHmacSecret_ — ดึง HMAC secret จาก Script Properties (ถ้ามี) หรือใช้ default
 */
function getHmacSecret_() {
  try {
    var secret = PropertiesService.getScriptProperties().getProperty('AUTH_HMAC_SECRET');
    return secret || TOKEN_HMAC_SECRET;
  } catch(e) {
    return TOKEN_HMAC_SECRET;
  }
}

/**
 * generateSignedToken_ — สร้าง token พร้อม HMAC signature
 * Format: <random_32hex>.<hmac_8hex>
 */
function generateSignedToken_(username, role) {
  var raw    = username + role + new Date().getTime() + Math.random();
  var bytes  = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, raw);
  var random = bytes.map(function(b) { return ('0' + (b < 0 ? b + 256 : b).toString(16)).slice(-2); }).join('').substring(0, 32);

  var hmacBytes = Utilities.computeHmacSha256Signature(random, getHmacSecret_());
  var hmac = hmacBytes.map(function(b) { return ('0' + (b < 0 ? b + 256 : b).toString(16)).slice(-2); }).join('').substring(0, 8);

  return random + '.' + hmac;
}

/**
 * verifyTokenSignature_ — ตรวจ HMAC signature ของ token
 */
function verifyTokenSignature_(token) {
  try {
    if (!token || typeof token !== 'string') return false;
    var parts = token.split('.');
    if (parts.length !== 2) return false;

    var random = parts[0];
    var sig    = parts[1];
    if (random.length !== 32 || sig.length !== 8) return false;

    var hmacBytes = Utilities.computeHmacSha256Signature(random, getHmacSecret_());
    var expected  = hmacBytes.map(function(b) { return ('0' + (b < 0 ? b + 256 : b).toString(16)).slice(-2); }).join('').substring(0, 8);

    return sig === expected;
  } catch(e) {
    return false;
  }
}

/**
 * logSuspiciousActivity_ — บันทึก suspicious activity
 */
function logSuspiciousActivity_(type, detail) {
  try {
    var msg = '[SECURITY] ' + type + ' | ' + detail + ' | ' + new Date().toISOString();
    Logger.log(msg);
    // บันทึกลง Activity Log ด้วย
    try { logActivity('SECURITY_ALERT', 'SYSTEM', type + ': ' + detail); } catch(e2) {}
  } catch(e) {}
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
// ============================================================

function listUsers_(payload) {
  try {
    var ss      = getComphoneSheet();
    var sh      = findSheetByName(ss, AUTH_SHEET_NAME);
    if (!sh) return { success: false, error: 'ไม่พบ DB_USERS' };
    var rows    = sh.getDataRange().getValues();
    var headers = rows[0];
    var idx     = buildHeaderIndex_(headers);
    var result  = [];
    for (var i = 1; i < rows.length; i++) {
      if (!rows[i][0]) continue;
      var row      = rows[i];
      var colActive = idx['active']         !== undefined ? idx['active']         : 4;
      var colForce  = idx['force_change_pw'] !== undefined ? idx['force_change_pw'] : -1;
      result.push({
        username:        String(row[idx['username']  !== undefined ? idx['username']  : 0] || ''),
        full_name:       String(row[idx['full_name'] !== undefined ? idx['full_name'] : idx['name'] !== undefined ? idx['name'] : 3] || ''),
        role:            String(row[idx['role']      !== undefined ? idx['role']      : 2] || '').toLowerCase(),
        active:          String(row[colActive] || 'TRUE').toUpperCase(),
        force_change_pw: colForce >= 0 ? String(row[colForce] || '').toUpperCase() : 'FALSE',
        created_at:      String(row[idx['created_at'] !== undefined ? idx['created_at'] : 5] || '')
      });
    }
    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

function createUser_(payload) {
  try {
    var username = String(payload.username || '').trim().toLowerCase();
    var fullName = String(payload.full_name || '').trim();
    var role     = String(payload.role     || 'tech').trim().toLowerCase();
    var password = String(payload.password || '').trim();
    if (!username || !password) return { success: false, error: 'กรุณาระบุ username และ password' };

    var ss   = getComphoneSheet();
    var sh   = findOrCreateUserSheet_(ss);
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

function setUserActive_(payload) {
  try {
    var username = String(payload.username || '').trim().toLowerCase();
    var active   = payload.active === true || payload.active === 'true' || payload.active === 'TRUE';
    var ss       = getComphoneSheet();
    var sh       = findSheetByName(ss, AUTH_SHEET_NAME);
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

function updateUserRole_(payload) {
  try {
    var username = String(payload.username || '').trim().toLowerCase();
    var newRole  = String(payload.newRole  || '').trim().toLowerCase();
    var fullName = String(payload.full_name || '').trim();
    var ss       = getComphoneSheet();
    var sh       = findSheetByName(ss, AUTH_SHEET_NAME);
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
