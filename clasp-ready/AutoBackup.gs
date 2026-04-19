// COMPHONE SUPER APP V5.5
// ============================================================
// AutoBackup.gs — ระบบสำรองข้อมูล + Activity Log
// ============================================================
var BACKUP_FOLDER_ID = '1YRZRG9r1Y_jMHg2XFFKYjK4Hx-sW0Eq0';
var LOG_SHEET = 'DB_ACTIVITY_LOG';

function autoBackup() {
  try {
    var ss = getComphoneSheet();
    var dateStr = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd_HHmmss');
    var copy = DriveApp.getFileById(ss.getId()).makeCopy('COMPHONE_BACKUP_' + dateStr);
    var folder = DriveApp.getFolderById(BACKUP_FOLDER_ID);
    folder.addFile(copy);
    DriveApp.getRootFolder().removeFile(copy);
    Logger.log('Backup created: ' + copy.getUrl());
    return { success: true, url: copy.getUrl(), date: dateStr };
  } catch(e) {
    Logger.log('Backup failed: ' + e);
    return { success: false, error: '' + e };
  }
}

function logActivity(action, user, detail, opts) {
  try {
    var ss = getComphoneSheet();
    var sh = findOrCreateLogSheet(ss);
    var ts = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd HH:mm');
    sh.appendRow([ts, action, user || 'SYSTEM', detail || '']);
  } catch(e) { Logger.log('Log failed: ' + e); }
  // เขียนลง DB_AUDIT ด้วย (structured audit trail)
  try {
    if (typeof writeAuditLog === 'function') {
      writeAuditLog(action, user || 'SYSTEM', detail || '', opts || {});
    }
  } catch(e) { Logger.log('writeAuditLog failed: ' + e.message); }
}

function findOrCreateLogSheet(ss) {
  var sh = findSheetByName(ss, LOG_SHEET);
  if (!sh) {
    sh = ss.insertSheet(LOG_SHEET);
    sh.getRange(1,1,1,4).setValues([['timestamp','action','user','detail']]);
  }
  return sh;
}

function getLastLogs(n) {
  if (!n) n = 50;
  try {
    var ss = getComphoneSheet();
    var sh = findSheetByName(ss, LOG_SHEET);
    if (!sh) return [];
    var d = sh.getDataRange().getValues();
    var out = [];
    var start = Math.max(1, d.length - n);
    for (var i = d.length - 1; i >= start; i--) {
      if (d[i][0]) out.push({ ts: ''+d[i][0], action: ''+d[i][1], user: ''+d[i][2], detail: ''+d[i][3] });
    }
    return out;
  } catch(e) { return []; }
}

// ============================================================
// Job Timeline — ดึงประวัติของงานเฉพาะ
// ============================================================
function getJobTimeline(jobId) {
  return getJobTimelineV55_(jobId);
}

// ============================================================
// Quick Note — เพิ่มหมายเหตุด่วน
// ============================================================
function addQuickNote(jobId, note, user) {
  try {
    var ss = getComphoneSheet();
    var jsh = findSheetByName(ss, 'DBJOBS');
    
    if (jsh) {
      var jobs = jsh.getDataRange().getValues();
      for (var i = 1; i < jobs.length; i++) {
        if (String(jobs[i][0]) === jobId) {
          // หา column หมายเหตุ (index 11)
          while (jobs[i].length < 13) jobs[i].push('');
          jobs[i][11] = (jobs[i][11] ? jobs[i][11] + '\n' : '') + 
            Utilities.formatDate(new Date(), 'Asia/Bangkok', 'dd/MM HH:mm') + 
            ' [' + (user || '-') + ']: ' + note;
          jobs[i][10] = new Date(); // เวลาอัปเดต
          jsh.getDataRange().setValues(jobs);
          
          // บันทึก activity log
          try { logActivity('QUICK_NOTE', user || 'SYSTEM', jobId + ': ' + note); } catch(e) {}
          
          return { success: true, jobId: jobId };
        }
      }
    }
    return { error: 'ไม่พบ JobID: ' + jobId };
  } catch(e) { return { error: e.toString() }; }
}

// ============================================================
// 🔧 SETUP ALL TIME-DRIVEN TRIGGERS (Duplicate-safe)
// ============================================================
/**
 * ตั้ง Time-Driven Triggers ทั้งหมด — ป้องกัน duplicate
 * วิธีใช้: GAS Editor → เลือก setupAllTriggers → กด Run
 * @return {Object} { success, triggers, total, skipped }
 */
function setupAllTriggers() {
  // ── Trigger definitions ──
  var TRIGGER_DEFS = [
    { fn: 'autoBackup',             type: 'daily',   hour: 0,  schedule: 'ทุกวัน 00:00-01:00' },
    { fn: 'checkLowStockAlert',     type: 'hourly',  every: 6, schedule: 'ทุก 6 ชั่วโมง' },
    { fn: 'geminiReorderSuggestion',type: 'daily',   hour: 9,  schedule: 'ทุกวัน 09:00-10:00' },
    { fn: 'getCRMSchedule',         type: 'weekly',  day: ScriptApp.WeekDay.MONDAY, hour: 8, schedule: 'ทุกจันทร์ 08:00-09:00' },
    { fn: 'cronMorningAlert',       type: 'daily',   hour: 6,  schedule: 'ทุกวัน 06:00-07:00' },
    { fn: 'sendAfterSalesAlerts',   type: 'daily',   hour: 8,  schedule: 'ทุกวัน 08:00-09:00' },
    { fn: 'autoSyncToDrive',        type: 'daily',   hour: 2,  schedule: 'ทุกวัน 02:00-03:00' },
    /**
     * cronTaxReminder — แจ้งเตือนยื่นภาษีรายเดือน
     * รันวันที่ 1 ของทุกเดือน เวลา 08:00-09:00
     * handler: TaxDocuments.gs → cronTaxReminder()
     */
    { fn: 'cronTaxReminder',        type: 'monthly', dayOfMonth: 1, hour: 8, schedule: 'วันที่ 1 ของทุกเดือน 08:00-09:00' },
    /**
     * cronHealthCheck — ตรวจสอบสุขภาพระบบอัตโนมัติ
     * รันทุก 30 นาที ตลอด 24 ชั่วโมง
     * handler: HealthMonitor.gs → cronHealthCheck()
     */
    { fn: 'cronHealthCheck',        type: 'minutes', everyMinutes: 30, schedule: 'ทุก 30 นาที' },
    /**
     * cleanupSessions — ลบ SESSION_* ที่ค้างใน ScriptProperties (migration + safety)
     * รันทุก 6 ชั่วโมง
     * handler: Auth.gs → cleanupSessions()
     */
    { fn: 'cleanupSessions',          type: 'hourly',  every: 6,         schedule: 'ทุก 6 ชั่วโมง' },
  ];

  // ── ดึง triggers ที่มีอยู่แล้ว (duplicate prevention) ──
  var existing = {};
  ScriptApp.getProjectTriggers().forEach(function(t) {
    existing[t.getHandlerFunction()] = t;
  });

  var results = [];
  var skipped = [];

  TRIGGER_DEFS.forEach(function(def) {
    // ถ้ามี trigger นี้อยู่แล้ว ข้ามไป
    if (existing[def.fn]) {
      skipped.push(def.fn);
      results.push({ fn: def.fn, schedule: def.schedule, status: '⏭️ skipped (already exists)' });
      return;
    }
    try {
      var builder = ScriptApp.newTrigger(def.fn).timeBased();
      if (def.type === 'daily') {
        builder.atHour(def.hour).everyDays(1);
      } else if (def.type === 'hourly') {
        builder.everyHours(def.every);
      } else if (def.type === 'weekly') {
        builder.onWeekDay(def.day).atHour(def.hour);
      } else if (def.type === 'monthly') {
        // GAS ไม่มี everyMonths() โดยตรง — ใช้ everyDays(1) แล้วกรองในฟังก์ชัน
        // วิธีที่ถูกต้องคือรันทุกวันแล้วเช็ควันที่ 1 ในฟังก์ชัน cronTaxReminder
        builder.atHour(def.hour).everyDays(1);
      } else if (def.type === 'minutes') {
        builder.everyMinutes(def.everyMinutes);
      }
      builder.create();
      results.push({ fn: def.fn, schedule: def.schedule, status: '✅ created' });
    } catch (e) {
      results.push({ fn: def.fn, schedule: def.schedule, status: '❌ ' + e.message });
    }
  });

  Logger.log('setupAllTriggers: ' + results.length + ' processed, ' + skipped.length + ' skipped');
  return {
    success: true,
    triggers: results,
    total: results.length,
    skipped: skipped.length
  };
}

/**
 * ลบ triggers ทั้งหมด (ใช้เมื่อต้องการ reset)
 * @return {Object} { deleted, count }
 */
function deleteAllTriggers() {
  var allTriggers = ScriptApp.getProjectTriggers();
  var deleted = [];
  allTriggers.forEach(function(t) {
    var fn = t.getHandlerFunction();
    ScriptApp.deleteTrigger(t);
    deleted.push(fn);
  });
  Logger.log('deleteAllTriggers: removed ' + deleted.length);
  return { deleted: deleted, count: deleted.length };
}

/**
 * แสดงรายการ triggers ที่ active อยู่
 * @return {Object} { count, triggers }
 */
function listTriggers() {
  var allTriggers = ScriptApp.getProjectTriggers();
  var triggers = allTriggers.map(function(t) {
    return {
      fn:   t.getHandlerFunction(),
      type: String(t.getEventType()),
      id:   t.getUniqueId()
    };
  });
  return { count: triggers.length, triggers: triggers };
}
