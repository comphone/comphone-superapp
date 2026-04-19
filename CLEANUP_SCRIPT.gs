// ============================================================
// CLEANUP_SCRIPT.gs
// วิธีใช้: วางโค้ดนี้ใน GAS Editor → เลือก function → กด Run
// ============================================================

/**
 * STEP 1: รัน cleanupAllSessionProperties()
 * ลบ Script Properties ทั้งหมดที่ขึ้นต้นด้วย SESSION_
 * (ยกเว้น SESSION_MD_CONTENT ที่ใช้สำหรับ DriveSync)
 */
function cleanupAllSessionProperties() {
  var props = PropertiesService.getScriptProperties();
  var all = props.getProperties();
  var deleted = [];
  var kept = [];

  Object.keys(all).forEach(function(key) {
    if (key.startsWith('SESSION_') && key !== 'SESSION_MD_CONTENT') {
      props.deleteProperty(key);
      deleted.push(key);
    } else if (key.startsWith('SESSION_')) {
      kept.push(key);
    }
  });

  Logger.log('✅ Deleted ' + deleted.length + ' SESSION_* properties');
  Logger.log('📋 Kept: ' + JSON.stringify(kept));
  Logger.log('🔑 Remaining properties: ' + Object.keys(props.getProperties()).length);

  return {
    success: true,
    deleted: deleted.length,
    kept: kept,
    remaining: Object.keys(props.getProperties()).length
  };
}

/**
 * STEP 2: รัน listAllProperties()
 * แสดง Script Properties ทั้งหมดที่เหลือ (เพื่อตรวจสอบ)
 */
function listAllProperties() {
  var props = PropertiesService.getScriptProperties();
  var all = props.getProperties();
  var keys = Object.keys(all);

  Logger.log('📊 Total properties: ' + keys.length);
  keys.forEach(function(key) {
    var val = all[key];
    // ซ่อน sensitive values
    if (key.toLowerCase().includes('password') || key.toLowerCase().includes('secret') || key.toLowerCase().includes('token')) {
      Logger.log('  ' + key + ' = [HIDDEN]');
    } else {
      Logger.log('  ' + key + ' = ' + String(val).substring(0, 80));
    }
  });
}

/**
 * STEP 3: รัน setupCleanupTrigger()
 * ตั้ง trigger cleanupSessions ทุก 6 ชั่วโมง
 */
function setupCleanupTrigger() {
  // ลบ trigger เก่าที่ชื่อ cleanupSessions ก่อน (ถ้ามี)
  var triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(function(t) {
    if (t.getHandlerFunction() === 'cleanupSessions' || t.getHandlerFunction() === 'cleanupAllSessionProperties') {
      ScriptApp.deleteTrigger(t);
      Logger.log('🗑 Deleted old trigger: ' + t.getHandlerFunction());
    }
  });

  // สร้าง trigger ใหม่
  ScriptApp.newTrigger('cleanupAllSessionProperties')
    .timeBased()
    .everyHours(6)
    .create();

  Logger.log('✅ Cleanup trigger set: every 6 hours → cleanupAllSessionProperties()');

  // แสดง triggers ทั้งหมด
  var allTriggers = ScriptApp.getProjectTriggers();
  Logger.log('📋 Total triggers: ' + allTriggers.length);
  allTriggers.forEach(function(t) {
    Logger.log('  - ' + t.getHandlerFunction());
  });
}

/**
 * STEP 4: รัน runAllCleanup()
 * รันทุกอย่างพร้อมกัน (แนะนำ)
 */
function runAllCleanup() {
  Logger.log('🚀 Starting COMPHONE Session Cleanup...');
  Logger.log('');

  // 1. Cleanup SESSION_* properties
  Logger.log('=== STEP 1: Cleanup SESSION_* Properties ===');
  var result = cleanupAllSessionProperties();
  Logger.log('Result: ' + JSON.stringify(result));
  Logger.log('');

  // 2. List remaining properties
  Logger.log('=== STEP 2: Remaining Properties ===');
  listAllProperties();
  Logger.log('');

  // 3. Setup cleanup trigger
  Logger.log('=== STEP 3: Setup Cleanup Trigger ===');
  setupCleanupTrigger();
  Logger.log('');

  Logger.log('✅ DONE! Script Properties สะอาดแล้ว');
}
