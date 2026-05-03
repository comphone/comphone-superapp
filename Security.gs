// ============================================================
// COMPHONE SUPER APP v5.9.0-phase31a
// Security.gs — Security Hardening
// Version: 5.6.0
// ============================================================
// ฟีเจอร์:
//   - changePassword()        — เปลี่ยนรหัสผ่านพร้อม policy check
//   - forcePasswordChange()   — admin บังคับเปลี่ยนรหัสผ่าน
//   - lockAccount()           — ล็อคบัญชี
//   - unlockAccount()         — ปลดล็อคบัญชี
//   - trackFailedLogin_()     — นับ login ผิด + auto-lock
//   - resetFailedLogin_()     — reset counter
//   - getSecurityStatus()     — ดูสถานะ security
//   - auditPasswordChange_()  — บันทึก audit
// ============================================================

'use strict';

var SECURITY_PROPS_PREFIX = 'SEC_FAIL_';
var MAX_FAILED_ATTEMPTS   = 5;
var LOCKOUT_MINUTES       = 15;

// Password policy
var PASSWORD_MIN_LENGTH   = 8;
var PASSWORD_REQUIRE_NUM  = true;
var PASSWORD_REQUIRE_UPPER = false; // ผ่อนปรนสำหรับ Thai users

// ============================================================
// เปลี่ยนรหัสผ่าน
// ============================================================
/**
 * changePassword — เปลี่ยนรหัสผ่านของตัวเอง
 * @param {Object} data - { username, old_password, new_password }
 * @return {Object} { success, message }
 */
function changePassword(data) {
  try {
    data = data || {};
    var username    = String(data.username    || '').trim().toLowerCase();
    var oldPassword = String(data.old_password || data.current_password || '').trim();
    var newPassword = String(data.new_password || '').trim();

    if (!username)    return { success: false, error: 'กรุณาระบุ username' };
    if (!oldPassword) return { success: false, error: 'กรุณาระบุรหัสผ่านเดิม' };
    if (!newPassword) return { success: false, error: 'กรุณาระบุรหัสผ่านใหม่' };

    // ตรวจสอบ password policy
    var policyResult = validatePasswordPolicy_(newPassword);
    if (!policyResult.valid) return { success: false, error: policyResult.error };

    var ss = getComphoneSheet();
    var sh = findSheetByName(ss, 'DB_USERS');
    if (!sh) return { success: false, error: 'ไม่พบ DB_USERS' };

    var rows    = sh.getDataRange().getValues();
    var headers = rows[0];
    var idx     = buildHeaderIndex_(headers);
    var colUser = idx['username'] !== undefined ? idx['username'] : 0;
    var colPass = idx['password'] !== undefined ? idx['password'] : 1;
    var colForce = idx['force_change_pw'] !== undefined ? idx['force_change_pw'] : -1;

    var oldHashed = hashPassword_(oldPassword);
    var newHashed = hashPassword_(newPassword);

    for (var i = 1; i < rows.length; i++) {
      var rowUser = String(rows[i][colUser] || '').trim().toLowerCase();
      if (rowUser !== username) continue;

      var rowPass = String(rows[i][colPass] || '').trim();
      // ตรวจสอบรหัสผ่านเดิม (รองรับทั้ง hashed และ plain)
      if (rowPass !== oldHashed && rowPass !== oldPassword) {
        return { success: false, error: 'รหัสผ่านเดิมไม่ถูกต้อง' };
      }

      // ห้ามใช้รหัสผ่านเดิมซ้ำ
      if (newHashed === rowPass || newPassword === rowPass) {
        return { success: false, error: 'ไม่สามารถใช้รหัสผ่านเดิมซ้ำได้' };
      }

      // อัปเดตรหัสผ่าน
      sh.getRange(i + 1, colPass + 1).setValue(newHashed);

      // ล้าง force_change_pw flag
      if (colForce >= 0) {
        sh.getRange(i + 1, colForce + 1).setValue('FALSE');
      }

      auditPasswordChange_(username, 'SELF_CHANGE');
      resetFailedLogin_(username);

      try { logActivity('CHANGE_PASSWORD', username, 'เปลี่ยนรหัสผ่านสำเร็จ'); } catch(e) {}
      try { writeAuditLog('changePassword', 'USER', username, { action: 'SELF_CHANGE' }); } catch(e) {}

      return { success: true, message: 'เปลี่ยนรหัสผ่านสำเร็จ' };
    }

    return { success: false, error: 'ไม่พบผู้ใช้: ' + username };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

// ============================================================
// บังคับเปลี่ยนรหัสผ่าน (Admin)
// ============================================================
/**
 * forcePasswordChange — admin บังคับให้ user เปลี่ยนรหัสผ่านครั้งถัดไป
 * @param {Object} data - { target_username, admin_username, new_password (optional) }
 * @return {Object} { success, message }
 */
function forcePasswordChange(data) {
  try {
    data = data || {};
    var targetUser = String(data.target_username || data.username || '').trim().toLowerCase();
    var adminUser  = String(data.admin_username  || data.admin   || '').trim().toLowerCase();
    var newPass    = String(data.new_password    || '').trim();

    if (!targetUser) return { success: false, error: 'กรุณาระบุ username ที่ต้องการบังคับเปลี่ยน' };

    var ss = getComphoneSheet();
    var sh = findSheetByName(ss, 'DB_USERS');
    if (!sh) return { success: false, error: 'ไม่พบ DB_USERS' };

    var rows    = sh.getDataRange().getValues();
    var headers = rows[0];
    var idx     = buildHeaderIndex_(headers);
    var colUser  = idx['username']        !== undefined ? idx['username']        : 0;
    var colPass  = idx['password']        !== undefined ? idx['password']        : 1;
    var colForce = idx['force_change_pw'] !== undefined ? idx['force_change_pw'] : -1;

    for (var i = 1; i < rows.length; i++) {
      var rowUser = String(rows[i][colUser] || '').trim().toLowerCase();
      if (rowUser !== targetUser) continue;

      // ถ้าส่ง new_password มาด้วย ให้ set ทันที
      if (newPass) {
        var policyResult = validatePasswordPolicy_(newPass);
        if (!policyResult.valid) return { success: false, error: policyResult.error };
        sh.getRange(i + 1, colPass + 1).setValue(hashPassword_(newPass));
      }

      // ตั้ง force_change_pw flag
      if (colForce >= 0) {
        sh.getRange(i + 1, colForce + 1).setValue('TRUE');
      } else {
        // เพิ่ม column ถ้ายังไม่มี
        var lastCol = headers.length + 1;
        sh.getRange(1, lastCol).setValue('force_change_pw');
        sh.getRange(i + 1, lastCol).setValue('TRUE');
      }

      auditPasswordChange_(targetUser, 'FORCE_BY_' + (adminUser || 'ADMIN'));
      try { writeAuditLog('forcePasswordChange', 'USER', targetUser, { admin: adminUser }); } catch(e) {}

      return { success: true, message: `บังคับเปลี่ยนรหัสผ่าน ${targetUser} สำเร็จ` };
    }

    return { success: false, error: 'ไม่พบผู้ใช้: ' + targetUser };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

// ============================================================
// ล็อค / ปลดล็อคบัญชี
// ============================================================
/**
 * lockAccount — ล็อคบัญชี user
 * @param {Object} data - { username, reason, admin_username }
 * @return {Object} { success }
 */
function lockAccount(data) {
  return _setAccountActive_(data, false);
}

/**
 * unlockAccount — ปลดล็อคบัญชี user
 * @param {Object} data - { username, admin_username }
 * @return {Object} { success }
 */
function unlockAccount(data) {
  return _setAccountActive_(data, true);
}

function _setAccountActive_(data, active) {
  try {
    data = data || {};
    var username  = String(data.username || data.target_username || '').trim().toLowerCase();
    var adminUser = String(data.admin_username || data.admin || '').trim();
    var reason    = String(data.reason || '').trim();

    if (!username) return { success: false, error: 'กรุณาระบุ username' };

    var ss = getComphoneSheet();
    var sh = findSheetByName(ss, 'DB_USERS');
    if (!sh) return { success: false, error: 'ไม่พบ DB_USERS' };

    var rows    = sh.getDataRange().getValues();
    var headers = rows[0];
    var idx     = buildHeaderIndex_(headers);
    var colUser   = idx['username'] !== undefined ? idx['username'] : 0;
    var colActive = idx['active']   !== undefined ? idx['active']   : 4;

    for (var i = 1; i < rows.length; i++) {
      var rowUser = String(rows[i][colUser] || '').trim().toLowerCase();
      if (rowUser !== username) continue;

      sh.getRange(i + 1, colActive + 1).setValue(active ? 'TRUE' : 'FALSE');

      var action = active ? 'UNLOCK_ACCOUNT' : 'LOCK_ACCOUNT';
      try { logActivity(action, username, (reason || '') + ' by ' + (adminUser || 'ADMIN')); } catch(e) {}
      try { writeAuditLog(action, 'USER', username, { admin: adminUser, reason: reason }); } catch(e) {}

      // Reset failed login counter เมื่อ unlock
      if (active) resetFailedLogin_(username);

      return { success: true, username: username, active: active };
    }

    return { success: false, error: 'ไม่พบผู้ใช้: ' + username };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

// ============================================================
// Failed Login Tracker
// ============================================================
/**
 * trackFailedLogin_ — นับ login ผิด + auto-lock เมื่อเกิน MAX
 * @param {string} username
 * @return {Object} { locked, attempts_remaining }
 */
function trackFailedLogin_(username) {
  try {
    var props = PropertiesService.getScriptProperties();
    var key   = SECURITY_PROPS_PREFIX + username.toLowerCase();
    var data  = JSON.parse(props.getProperty(key) || '{"count":0,"since":null}');

    data.count++;
    data.since = data.since || new Date().toISOString();
    props.setProperty(key, JSON.stringify(data));

    if (data.count >= MAX_FAILED_ATTEMPTS) {
      // Auto-lock account
      lockAccount({ username: username, reason: 'Auto-lock: ' + data.count + ' failed attempts', admin_username: 'SYSTEM' });
      try { writeAuditLog('AUTO_LOCK', 'USER', username, { reason: 'failed_login_' + data.count }); } catch(e) {}
      return { locked: true, attempts_remaining: 0 };
    }

    return {
      locked: false,
      attempts_remaining: MAX_FAILED_ATTEMPTS - data.count,
      count: data.count
    };
  } catch (e) {
    return { locked: false, attempts_remaining: MAX_FAILED_ATTEMPTS };
  }
}

/**
 * resetFailedLogin_ — reset failed login counter
 * @param {string} username
 */
function resetFailedLogin_(username) {
  try {
    var props = PropertiesService.getScriptProperties();
    props.deleteProperty(SECURITY_PROPS_PREFIX + username.toLowerCase());
  } catch (e) {}
}

// ============================================================
// Security Status
// ============================================================
/**
 * getSecurityStatus — ดูสถานะ security ของระบบ
 * @return {Object} { users_count, locked_count, force_change_count, ... }
 */
function getSecurityStatus() {
  try {
    var ss = getComphoneSheet();
    var sh = findSheetByName(ss, 'DB_USERS');
    if (!sh) return { success: false, error: 'ไม่พบ DB_USERS' };

    var rows    = sh.getDataRange().getValues();
    var headers = rows[0];
    var idx     = buildHeaderIndex_(headers);
    var colActive = idx['active']         !== undefined ? idx['active']         : 4;
    var colForce  = idx['force_change_pw'] !== undefined ? idx['force_change_pw'] : -1;

    var total = 0, locked = 0, forceChange = 0;
    for (var i = 1; i < rows.length; i++) {
      if (!rows[i][0]) continue;
      total++;
      var active = String(rows[i][colActive] || 'TRUE').toUpperCase();
      if (active === 'FALSE' || active === '0') locked++;
      if (colForce >= 0 && String(rows[i][colForce] || '').toUpperCase() === 'TRUE') forceChange++;
    }

    return {
      success:           true,
      users_count:       total,
      locked_count:      locked,
      active_count:      total - locked,
      force_change_count: forceChange,
      max_failed_attempts: MAX_FAILED_ATTEMPTS,
      lockout_minutes:   LOCKOUT_MINUTES,
      password_min_length: PASSWORD_MIN_LENGTH,
      checked_at:        getThaiTimestamp(),
    };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

// ============================================================
// Password Policy Validator
// ============================================================
/**
 * validatePasswordPolicy_ — ตรวจสอบ password policy
 * @param {string} password
 * @return {Object} { valid, error }
 */
function validatePasswordPolicy_(password) {
  if (!password || password.length < PASSWORD_MIN_LENGTH) {
    return { valid: false, error: 'รหัสผ่านต้องมีอย่างน้อย ' + PASSWORD_MIN_LENGTH + ' ตัวอักษร' };
  }
  if (PASSWORD_REQUIRE_NUM && !/\d/.test(password)) {
    return { valid: false, error: 'รหัสผ่านต้องมีตัวเลขอย่างน้อย 1 ตัว' };
  }
  if (PASSWORD_REQUIRE_UPPER && !/[A-Z]/.test(password)) {
    return { valid: false, error: 'รหัสผ่านต้องมีตัวพิมพ์ใหญ่อย่างน้อย 1 ตัว' };
  }
  // ห้ามรหัสผ่านที่ง่ายเกินไป
  var COMMON = ['12345678', 'password', 'admin1234', '00000000', '11111111'];
  if (COMMON.indexOf(password.toLowerCase()) >= 0) {
    return { valid: false, error: 'รหัสผ่านนี้ง่ายเกินไป กรุณาใช้รหัสผ่านที่ซับซ้อนกว่านี้' };
  }
  return { valid: true };
}

// ============================================================
// Audit Helper
// ============================================================
function auditPasswordChange_(username, action) {
  try {
    var props = PropertiesService.getScriptProperties();
    var key   = 'PWD_CHANGE_' + username.toLowerCase();
    props.setProperty(key, JSON.stringify({
      action:     action,
      changed_at: new Date().toISOString(),
    }));
  } catch (e) {}
}
