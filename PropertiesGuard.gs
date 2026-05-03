// COMPHONE SUPER APP v5.9.0-phase31a
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

// ============================================================
// 5. BYTE-AWARE SAFE WRITERS — prevent 500KB overflow
// ============================================================
// These check byte capacity BEFORE writing, unlike the key-count
// based safeSetProperty above. Use these for cron jobs that may
// write large or many values in a single execution.
// ============================================================
var PROP_BYTE_BLOCK_THRESHOLD = 0.90;  // block writes above 90%
var PROP_BYTE_WARN_THRESHOLD  = 0.80;  // warn above 80%

/**
 * safeSetProperty_ — Byte-aware safe write (single key)
 * Checks current byte usage BEFORE writing. Rejects if >90% full.
 *
 * @param {string} key   Property key
 * @param {string} value Property value
 * @return {Object} { success, method, detail, capacity_pct }
 */
function safeSetProperty_(key, value) {
  try {
    var props = PropertiesService.getScriptProperties();
    var existing = props.getProperty(key);
    var isUpdate = existing !== null;

    // Updates to existing keys don't increase total size much — allow them
    // but still check capacity if the new value is significantly larger
    if (isUpdate) {
      var sizeDelta = String(value).length - String(existing).length;
      if (sizeDelta <= 0) {
        props.setProperty(key, value);
        return { success: true, method: 'property', detail: 'updated (smaller/same)', capacity_pct: null };
      }
      // Value grew — check capacity
    }

    // Check byte capacity
    var capacity = getPropertiesCapacity();
    if (!capacity.success) {
      // Can't check capacity — allow write but warn
      Logger.log('⚠️ safeSetProperty_: capacity check failed, allowing write for key=' + key);
      props.setProperty(key, value);
      return { success: true, method: 'property', detail: 'capacity check failed, write allowed', capacity_pct: null };
    }

    var pct = capacity.pct / 100; // convert to 0-1 range

    // Estimate new usage after write
    var newBytes = key.length + String(value).length;
    var existingBytes = isUpdate ? (key.length + String(existing).length) : 0;
    var deltaBytes = newBytes - existingBytes;
    var projectedPct = Math.round(((capacity.used_bytes + deltaBytes) / PROP_BYTE_LIMIT) * 100);

    // BLOCK if projected usage > 90%
    if (projectedPct >= PROP_BYTE_BLOCK_THRESHOLD * 100) {
      Logger.log('🔴 safeSetProperty_: BLOCKED key=' + key + ' — projected ' + projectedPct + '% (used=' + capacity.used_kb + 'KB + ' + deltaBytes + 'B)');

      // Try overflow to sheet
      try {
        var overflowResult = overflowToSheet_(key, value);
        if (overflowResult && overflowResult.success) {
          return {
            success: true, method: 'sheet',
            detail: 'overflow to sheet (projected ' + projectedPct + '%)',
            capacity_pct: projectedPct
          };
        }
      } catch (oe) {}

      return {
        success: false, method: 'blocked',
        detail: 'projected ' + projectedPct + '% exceeds 90% limit (' + capacity.used_kb + 'KB / 500KB)',
        capacity_pct: projectedPct
      };
    }

    // WARN if > 80%
    if (projectedPct >= PROP_BYTE_WARN_THRESHOLD * 100) {
      Logger.log('⚠️ safeSetProperty_: WARNING key=' + key + ' — projected ' + projectedPct + '%');
    }

    // Allow write
    props.setProperty(key, value);
    return {
      success: true, method: 'property',
      detail: (isUpdate ? 'updated' : 'new') + ' (projected ' + projectedPct + '%)',
      capacity_pct: projectedPct
    };
  } catch (e) {
    Logger.log('❌ safeSetProperty_ error: key=' + key + ' err=' + e);
    return { success: false, method: 'error', detail: e.toString(), capacity_pct: null };
  }
}

/**
 * safeSetProperties_ — Byte-aware safe batch write
 * Writes multiple properties, stopping if capacity exceeded.
 *
 * @param {Object} keyValueMap { key: value, ... }
 * @return {Object} { written, overflow, blocked, errors, details }
 */
function safeSetProperties_(keyValueMap) {
  var results = { written: 0, overflow: 0, blocked: 0, errors: 0, details: [] };
  var keys = Object.keys(keyValueMap || {});

  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    var result = safeSetProperty_(key, keyValueMap[key]);

    if (result.success) {
      if (result.method === 'sheet') {
        results.overflow++;
      } else {
        results.written++;
      }
    } else if (result.method === 'blocked') {
      results.blocked++;
      // Once blocked, remaining keys are likely blocked too — skip to save API calls
      Logger.log('🔴 safeSetProperties_: stopping batch after block at key=' + key);
      for (var j = i + 1; j < keys.length; j++) {
        results.blocked++;
        results.details.push({ key: keys[j], status: 'skipped (batch halted)' });
      }
      break;
    } else {
      results.errors++;
    }
    results.details.push({ key: key, status: result.method + ': ' + result.detail });
  }

  return results;
}

/**
 * getPropertiesCapacityReport — Formatted human-readable report
 * @return {string} Multi-line report text
 */
function getPropertiesCapacityReport() {
  var capacity = getPropertiesCapacity();
  if (!capacity.success) return '❌ Properties capacity check failed: ' + (capacity.error || 'unknown');

  var lines = [
    '═══ PropertiesService Capacity Report ═══',
    'Status:    ' + capacity.status,
    'Used:      ' + capacity.used_kb + ' KB / ' + capacity.limit_kb + ' KB (' + capacity.pct + '%)',
    'Keys:      ' + capacity.key_count + ' / ' + capacity.key_limit,
    'Remaining: ' + Math.round((capacity.limit_bytes - capacity.used_bytes) / 1024) + ' KB',
    '',
    '── Top Consumers ──'
  ];

  for (var i = 0; i < Math.min(5, capacity.top_consumers.length); i++) {
    var tc = capacity.top_consumers[i];
    lines.push('  ' + (i + 1) + '. ' + tc.key + ' (' + Math.round(tc.bytes / 1024 * 10) / 10 + ' KB)');
  }

  // Thresholds info
  lines.push('');
  lines.push('── Thresholds ──');
  lines.push('  Warning:  ' + (PROP_BYTE_WARN_THRESHOLD * 100) + '% (' + Math.round(PROP_BYTE_LIMIT * PROP_BYTE_WARN_THRESHOLD / 1024) + ' KB)');
  lines.push('  Block:    ' + (PROP_BYTE_BLOCK_THRESHOLD * 100) + '% (' + Math.round(PROP_BYTE_LIMIT * PROP_BYTE_BLOCK_THRESHOLD / 1024) + ' KB)');
  lines.push('  Cleanup:  every 1 hour (auto trigger)');
  lines.push('');
  lines.push('Timestamp: ' + capacity.timestamp);
  lines.push('═══════════════════════════════════════════');

  return lines.join('\n');
}

// ============================================================
// 6. BYTE-LEVEL CAPACITY MONITORING
// ============================================================
// GAS Limits: ScriptProperties = 500KB total, 4KB per key
// https://developers.google.com/apps-script/guides/services/quotas
var PROP_BYTE_LIMIT = 500 * 1024; // 500 KB
var PROP_BYTE_ALERT_THRESHOLD = 0.80; // 80% warning

/**
 * getPropertiesCapacity — Returns byte-level capacity info
 * @return {Object} { used_bytes, limit_bytes, pct, key_count, status, top_keys }
 */
function getPropertiesCapacity() {
  try {
    var props = PropertiesService.getScriptProperties();
    var all = props.getProperties();
    var keys = Object.keys(all);
    var totalBytes = 0;
    var keySizes = [];

    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      var value = all[key] || '';
      // Each key-value pair: key bytes + value bytes (UTF-8 approximation)
      var pairBytes = key.length + String(value).length;
      totalBytes += pairBytes;
      keySizes.push({ key: key, bytes: pairBytes });
    }

    // Sort by size descending for top consumers
    keySizes.sort(function(a, b) { return b.bytes - a.bytes; });

    var pct = Math.round((totalBytes / PROP_BYTE_LIMIT) * 100);
    var status = '✅ OK';
    if (pct >= 90) status = '🔴 CRITICAL';
    else if (pct >= 80) status = '⚠️ WARNING';
    else if (pct >= 60) status = '🟡 MONITOR';

    return {
      success: true,
      used_bytes: totalBytes,
      used_kb: Math.round(totalBytes / 1024 * 10) / 10,
      limit_bytes: PROP_BYTE_LIMIT,
      limit_kb: 500,
      pct: pct,
      status: status,
      key_count: keys.length,
      key_limit: PROP_GUARD.HARD_LIMIT,
      alert_threshold_pct: Math.round(PROP_BYTE_ALERT_THRESHOLD * 100),
      top_consumers: keySizes.slice(0, 10),
      timestamp: new Date().toISOString()
    };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

/**
 * checkPropertiesCapacityAlert — Returns alert info if threshold exceeded
 * @return {Object|null} Alert object or null if within limits
 */
function checkPropertiesCapacityAlert() {
  var capacity = getPropertiesCapacity();
  if (!capacity.success) return null;

  if (capacity.pct >= PROP_BYTE_ALERT_THRESHOLD * 100) {
    return {
      alert: true,
      level: capacity.pct >= 90 ? 'CRITICAL' : 'WARNING',
      message: 'Script Properties ใช้งาน ' + capacity.used_kb + 'KB / ' + capacity.limit_kb + 'KB (' + capacity.pct + '%)',
      used_kb: capacity.used_kb,
      limit_kb: capacity.limit_kb,
      pct: capacity.pct,
      top_consumers: capacity.top_consumers.slice(0, 5),
      recommendation: capacity.pct >= 90
        ? '⚠️ ควร cleanup properties ทันที! รัน deepCleanupProperties()'
        : '📊 เฝ้าดู — ใกล้ถึง limit แล้ว'
    };
  }
  return null;
}
