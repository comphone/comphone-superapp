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

function logActivity(action, user, detail) {
  try {
    var ss = getComphoneSheet();
    var sh = findOrCreateLogSheet(ss);
    var ts = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd HH:mm');
    sh.appendRow([ts, action, user || 'SYSTEM', detail || '']);
  } catch(e) { Logger.log('Log failed: ' + e); }
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
// 🔧 SETUP ALL TIME-DRIVEN TRIGGERS
// ============================================================
function setupAllTriggers() {
  // ลบ triggers เก่าทั้งหมดก่อน
  deleteAllTriggers();
  
  var triggers = [];
  
  // 1. autoBackup — ทุกวัน 00:00-01:00
  try {
    ScriptApp.newTrigger('autoBackup')
      .timeBased()
      .atHour(0)
      .everyDays(1)
      .create();
    triggers.push({ fn: 'autoBackup', schedule: 'ทุกวัน 00:00-01:00', status: '✅' });
  } catch(e) {
    triggers.push({ fn: 'autoBackup', schedule: 'ทุกวัน 00:00-01:00', status: '❌ ' + e });
  }
  
  // 2. checkLowStockAlert — ทุก 6 ชั่วโมง
  try {
    ScriptApp.newTrigger('checkLowStockAlert')
      .timeBased()
      .everyHours(6)
      .create();
    triggers.push({ fn: 'checkLowStockAlert', schedule: 'ทุก 6 ชั่วโมง', status: '✅' });
  } catch(e) {
    triggers.push({ fn: 'checkLowStockAlert', schedule: 'ทุก 6 ชั่วโมง', status: '❌ ' + e });
  }
  
  // 3. geminiReorderSuggestion — ทุกวัน 09:00-10:00
  try {
    ScriptApp.newTrigger('geminiReorderSuggestion')
      .timeBased()
      .atHour(9)
      .everyDays(1)
      .create();
    triggers.push({ fn: 'geminiReorderSuggestion', schedule: 'ทุกวัน 09:00-10:00', status: '✅' });
  } catch(e) {
    triggers.push({ fn: 'geminiReorderSuggestion', schedule: 'ทุกวัน 09:00-10:00', status: '❌ ' + e });
  }
  
  // 4. getCRMSchedule — ทุกจันทร์ 08:00-09:00
  try {
    ScriptApp.newTrigger('getCRMSchedule')
      .timeBased()
      .onWeekDay(ScriptApp.WeekDay.MONDAY)
      .atHour(8)
      .create();
    triggers.push({ fn: 'getCRMSchedule', schedule: 'จันทรทุก 08:00-09:00', status: '✅' });
  } catch(e) {
    triggers.push({ fn: 'getCRMSchedule', schedule: 'จันทรทุก 08:00-09:00', status: '❌ ' + e });
  }
  
  // 5. cronMorningAlert — ทุกวัน 06:00-07:00 (สรุปเช้า)
  try {
    ScriptApp.newTrigger('cronMorningAlert')
      .timeBased()
      .atHour(6)
      .everyDays(1)
      .create();
    triggers.push({ fn: 'cronMorningAlert', schedule: 'ทุกวัน 06:00-07:00', status: '✅' });
  } catch(e) {
    triggers.push({ fn: 'cronMorningAlert', schedule: 'ทุกวัน 06:00-07:00', status: '❌ ' + e });
  }

  // 6. sendAfterSalesAlerts — ทุกวัน 08:00-09:00 (แจ้งเตือน After-Sales)
  try {
    ScriptApp.newTrigger('sendAfterSalesAlerts')
      .timeBased()
      .atHour(8)
      .everyDays(1)
      .create();
    triggers.push({ fn: 'sendAfterSalesAlerts', schedule: 'ทุกวัน 08:00-09:00', status: '✅' });
  } catch(e) {
    triggers.push({ fn: 'sendAfterSalesAlerts', schedule: 'ทุกวัน 08:00-09:00', status: '❌ ' + e });
  }
  
  return { success: true, triggers: triggers, total: triggers.length };
}

function deleteAllTriggers() {
  var allTriggers = ScriptApp.getProjectTriggers();
  var deleted = [];
  for (var i = 0; i < allTriggers.length; i++) {
    var fn = allTriggers[i].getHandlerFunction();
    ScriptApp.deleteTrigger(allTriggers[i]);
    deleted.push(fn);
  }
  return { deleted: deleted, count: deleted.length };
}

function listTriggers() {
  var allTriggers = ScriptApp.getProjectTriggers();
  var triggers = [];
  for (var i = 0; i < allTriggers.length; i++) {
    triggers.push({
      fn: allTriggers[i].getHandlerFunction(),
      type: allTriggers[i].getEventType(),
      id: allTriggers[i].getUniqueId()
    });
  }
  return { count: triggers.length, triggers: triggers };
}
