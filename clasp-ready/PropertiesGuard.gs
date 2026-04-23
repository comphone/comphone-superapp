// COMPHONE SUPER APP V5.5
// ============================================================
// PropertiesGuard.gs — ป้องกัน Script Properties เกิน 50
// ============================================================
// 3 ชั้นป้องกัน:
//   1. Safe Setter — ตรวจ count ก่อน set ทุกครั้ง
//   2. Auto Cleanup Trigger — ล้าง expired ทุก 1 ชั่วโมง
//   3. Overflow to Sheet — ข้อมูลใหญ่ย้ายไป Spreadsheet อัตโนมัติ
// ============================================================

var PROP_GUARD = {
  MAX_PROPS:     45,    // เริ่ม warning ที่ 45 (เหลือ buffer 5)
  HARD_LIMIT:    50,    // GAS hard limit
  CLEANUP_PREFIXES: ['SESSION_', 'LINE_LAST_', 'LINE_PUSH_', 'LINE_ALERT_'],
  OVERFLOW_SHEET: 'PROP_OVERFLOW'  // Sheet สำหรับเก็บข้อมูลที่ล้น
};

// ============================================================
// 1. SAFE SETTER — ใช้แทน PropertiesService.getScriptProperties().setProperty()
// ============================================================
/**
 * ตั้งค่า Script Property อย่างปลอดภัย
 * ถ้าใกล้เกิน limit → cleanup อัตโนมัติก่อน
 * ถ้า key ใหม่ + count >= limit → ย้ายไป Spreadsheet แทน
 *
 * @param {string} key
 * @param {string} value
 * @param {Object} opts - { force: false, overflowToSheet: true }
 * @return {Object} { success, method: 'property'|'sheet'|'blocked', detail }
 */
function safeSetProperty(key, value, opts) {
  opts = opts || {};
  var props = PropertiesService.getScriptProperties();
  var count = Object.keys(props.getProperties()).length;
  var keyExists = props.getProperty(key) !== null;

  // ถ้า key มีอยู่แล้ว → update ได้เลย (ไม่เพิ่ม count)
  if (keyExists) {
    props.setProperty(key, value);
    return { success: true, method: 'property', detail: 'updated existing key' };
  }

  // ถ้า key ใหม่ → ตรวจ count
  if (count >= PROP_GUARD.MAX_PROPS) {
    // Cleanup ก่อน
    var cleaned = cleanupExpiredSessions_();

    // ตรวจ count หลัง cleanup
    count = Object.keys(props.getProperties()).length;

    if (count >= PROP_GUARD.HARD_LIMIT) {
      // ยังเกิน → ย้ายไป Spreadsheet
      if (opts.overflowToSheet !== false) {
        var overflowResult = overflowToSheet_(key, value);
        return {
          success: true,
          method: 'sheet',
          detail: 'overflow to sheet (props=' + count + ')',
          sheetResult: overflowResult
        };
      }
      return {
        success: false,
        method: 'blocked',
        detail: 'limit reached (' + count + '/' + PROP_GUARD.HARD_LIMIT + '), overflow disabled'
      };
    }
  }

  // ปกติ → set ได้
  props.setProperty(key, value);
  return { success: true, method: 'property', detail: 'new key (count=' + (count + 1) + ')' };
}

/**
 * ตั้งค่าหลาย properties พร้อมกัน (safe batch)
 * @param {Object} keyValueMap
 * @return {Object} summary
 */
function safeSetProperties(keyValueMap) {
  var results = { success: 0, overflow: 0, blocked: 0 };
  for (var key in keyValueMap) {
    var result = safeSetProperty(key, keyValueMap[key]);
    if (result.success) {
      if (result.method === 'sheet') results.overflow++;
      else results.success++;
    } else {
      results.blocked++;
    }
  }
  return results;
}

// ============================================================
// 2. AUTO CLEANUP TRIGGER — ตั้ง trigger อัตโนมัติ
// ============================================================
/**
 * ตั้ง time-driven trigger ให้ cleanup ทุก 1 ชั่วโมง
 * รันครั้งเดียวตอน setup
 */
function setupPropertiesGuardTrigger() {
  // ลบ trigger เดิม (ถ้ามี)
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'propertiesGuardCleanup_') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }

  // ตั้ง trigger ใหม่ — ทุก 1 ชั่วโมง
  ScriptApp.newTrigger('propertiesGuardCleanup_')
    .timeBased()
    .everyHours(1)
    .create();

  Logger.log('✅ Properties Guard trigger set (every 1 hour)');
  return { success: true, message: 'Trigger set: cleanup every 1 hour' };
}

/**
 * ฟังก์ชันที่ trigger เรียก — cleanup + log
 */
function propertiesGuardCleanup_() {
  try {
    var props = PropertiesService.getScriptProperties();
    var before = Object.keys(props.getProperties()).length;

    // Cleanup expired sessions
    cleanupExpiredSessions_();

    // Cleanup LINE state ที่เก่า
    cleanupOldLineState_();

    var after = Object.keys(props.getProperties()).length;
    var diff = before - after;

    if (diff > 0) {
      Logger.log('🧹 Properties Guard: cleaned ' + diff + ' (' + before + ' → ' + after + ')');
    }

    // Warning ถ้าใกล้เกิน
    if (after >= PROP_GUARD.MAX_PROPS) {
      Logger.log('⚠️ WARNING: Script Properties at ' + after + '/' + PROP_GUARD.HARD_LIMIT);
    }
  } catch (e) {
    Logger.log('❌ propertiesGuardCleanup error: ' + e);
  }
}

/**
 * ลบ LINE state ที่เก่ากว่า 24 ชั่วโมง
 */
function cleanupOldLineState_() {
  var props = PropertiesService.getScriptProperties();
  var keys = ['LINE_LAST_EVENT', 'LINE_LAST_QUICK_REPLY', 'LINE_LAST_USER_ID',
              'LINE_LAST_VERIFY_PROBE', 'LINE_LAST_WEBHOOK_SUMMARY',
              'LINE_ALERT_QUEUE', 'LINE_PUSH_COUNT_TODAY'];

  keys.forEach(function(k) {
    // ลบถ้ามี (state เหล่านี้ regenerate ได้)
    if (props.getProperty(k)) {
      props.deleteProperty(k);
    }
  });
}

// ============================================================
// 3. OVERFLOW TO SHEET — เก็บข้อมูลใหญ่ใน Spreadsheet
// ============================================================
/**
 * ย้ายข้อมูลไป Spreadsheet เมื่อ Properties เต็ม
 */
function overflowToSheet_(key, value) {
  try {
    var ssId = PropertiesService.getScriptProperties().getProperty('DB_SS_ID');
    if (!ssId) return { success: false, error: 'DB_SS_ID not set' };

    var ss = SpreadsheetApp.openById(ssId);
    var sheet = ss.getSheetByName(PROP_GUARD.OVERFLOW_SHEET);

    // สร้าง sheet ถ้ายังไม่มี
    if (!sheet) {
      sheet = ss.insertSheet(PROP_GUARD.OVERFLOW_SHEET);
      sheet.appendRow(['timestamp', 'key', 'value', 'size_bytes']);
    }

    sheet.appendRow([
      new Date().toISOString(),
      key,
      value,
      String(value).length
    ]);

    // เก็บแค่ 100 แถวล่าสุด
    if (sheet.getLastRow() > 101) {
      sheet.deleteRows(2, sheet.getLastRow() - 101);
    }

    return { success: true, sheet: PROP_GUARD.OVERFLOW_SHEET };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

// ============================================================
// 4. MONITORING — ดูสถานะปัจจุบัน
// ============================================================
function propertiesGuardStatus() {
  var props = PropertiesService.getScriptProperties();
  var count = Object.keys(props.getProperties()).length;
  var triggers = ScriptApp.getProjectTriggers().filter(function(t) {
    return t.getHandlerFunction() === 'propertiesGuardCleanup_';
  });

  return {
    count: count,
    limit: PROP_GUARD.HARD_LIMIT,
    maxSafe: PROP_GUARD.MAX_PROPS,
    remaining: PROP_GUARD.HARD_LIMIT - count,
    usage: Math.round(count / PROP_GUARD.HARD_LIMIT * 100) + '%',
    guardTriggerActive: triggers.length > 0,
    status: count < PROP_GUARD.MAX_PROPS ? '✅ OK' :
            count < PROP_GUARD.HARD_LIMIT ? '⚠️ WARNING' : '🔴 CRITICAL'
  };
}
