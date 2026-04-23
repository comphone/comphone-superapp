// COMPHONE SUPER APP V5.5
// ============================================================
// PropertiesCleanup.gs — จัดการ Script Properties ไม่ให้เกิน 50
// ============================================================
// รันด้วย: cleanupAllProperties() หรือ auditProperties()
// ============================================================

// ============================================================
// 📊 Audit — ดูว่ามีอะไรบ้างใน Script Properties
// ============================================================
function auditProperties() {
  var props = PropertiesService.getScriptProperties();
  var all   = props.getProperties();
  var keys  = Object.keys(all);

  var categories = {
    'SESSION_':    { count: 0, keys: [], desc: 'Login sessions (ควร cleanup อัตโนมัติ)' },
    'AG_KEY_':     { count: 0, keys: [], desc: 'Agent API keys' },
    'AG_':         { count: 0, keys: [], desc: 'Agent Gateway data' },
    'WF_':         { count: 0, keys: [], desc: 'Workflow Engine data' },
    'WS_':         { count: 0, keys: [], desc: 'Workflow Safety data' },
    'DG_':         { count: 0, keys: [], desc: 'Decision Guard data' },
    'AM_':         { count: 0, keys: [], desc: 'Agent Memory data' },
    'AS_':         { count: 0, keys: [], desc: 'Agent Scoring data' },
    'ACO_':        { count: 0, keys: [], desc: 'Agent Collaboration data' },
    'MC_':         { count: 0, keys: [], desc: 'Memory Control data' },
    'LI_':         { count: 0, keys: [], desc: 'Learning Integration data' },
    'LINE_':       { count: 0, keys: [], desc: 'LINE Bot data' },
    'PUSH_':       { count: 0, keys: [], desc: 'Push Notifications data' },
    'QUOTA_':      { count: 0, keys: [], desc: 'LINE Bot Quota data' },
    'vl_':         { count: 0, keys: [], desc: 'Vision Learning data' },
    'SESSION_MD':  { count: 0, keys: [], desc: 'Session backup content' },
    'OTHER':       { count: 0, keys: [], desc: 'Config / Other' }
  };

  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    var categorized = false;

    // Match categories (check longer prefixes first)
    var prefixes = ['SESSION_', 'AG_KEY_', 'AG_', 'WF_', 'WS_', 'DG_', 'AM_', 'AS_', 'ACO_', 'MC_', 'LI_', 'LINE_', 'PUSH_', 'QUOTA_', 'vl_', 'SESSION_MD'];
    for (var j = 0; j < prefixes.length; j++) {
      if (key.indexOf(prefixes[j]) === 0) {
        categories[prefixes[j]].count++;
        categories[prefixes[j]].keys.push(key);
        categorized = true;
        break;
      }
    }
    if (!categorized) {
      categories['OTHER'].count++;
      categories['OTHER'].keys.push(key);
    }
  }

  // แสดงผล
  Logger.log('═══════════════════════════════════════');
  Logger.log('📊 SCRIPT PROPERTIES AUDIT');
  Logger.log('   Total: ' + keys.length + ' / 50 limit');
  Logger.log('═══════════════════════════════════════');

  var lines = [];
  for (var cat in categories) {
    if (categories[cat].count > 0) {
      var entry = '  ' + cat + ': ' + categories[cat].count + ' — ' + categories[cat].desc;
      Logger.log(entry);
      lines.push(entry);
      // Log first few keys
      var sample = categories[cat].keys.slice(0, 3);
      for (var s = 0; s < sample.length; s++) {
        Logger.log('    └─ ' + sample[s]);
      }
      if (categories[cat].keys.length > 3) {
        Logger.log('    └─ ... +' + (categories[cat].keys.length - 3) + ' more');
      }
    }
  }

  return {
    total: keys.length,
    categories: categories,
    overLimit: keys.length > 50,
    summary: lines.join('\n')
  };
}

// ============================================================
// 🧹 Cleanup All — ลบ properties ที่หมดอายุ/เก่า
// ============================================================
function cleanupAllProperties() {
  var props = PropertiesService.getScriptProperties();
  var all   = props.getProperties();
  var keys  = Object.keys(all);
  var now   = new Date().getTime();
  var deleted = 0;
  var report  = [];

  Logger.log('🧹 Starting cleanup... (' + keys.length + ' properties)');

  for (var i = 0; i < keys.length; i++) {
    var key   = keys[i];
    var value = all[key];
    var shouldDelete = false;
    var reason = '';

    // 1. SESSION_ ที่หมดอายุ
    if (key.indexOf('SESSION_') === 0 && key !== 'SESSION_MD_CONTENT') {
      try {
        var data = JSON.parse(value);
        if (data.expires_at && new Date(data.expires_at).getTime() < now) {
          shouldDelete = true;
          reason = 'expired session';
        }
      } catch (e) {
        shouldDelete = true;
        reason = 'invalid JSON session';
      }
    }

    // 2. AG_ACTIVITY_LOG — ถ้าใหญ่เกิน 10KB ให้ล้าง
    if (key === 'AG_ACTIVITY_LOG' && value.length > 10000) {
      try {
        var logs = JSON.parse(value);
        if (logs.length > 20) {
          props.setProperty(key, JSON.stringify(logs.slice(-20)));
          report.push('  ✂️ AG_ACTIVITY_LOG: trimmed from ' + logs.length + ' to 20 entries');
          continue;
        }
      } catch (e) {}
    }

    // 3. LINE_LAST_ALERT_ — ลบถ้าเก่ากว่า 30 วัน
    if (key.indexOf('LINE_LAST_ALERT_') === 0) {
      try {
        var alertDate = new Date(value).getTime();
        if (alertDate < now - 30 * 24 * 60 * 60 * 1000) {
          shouldDelete = true;
          reason = 'alert older than 30 days';
        }
      } catch (e) {}
    }

    if (shouldDelete) {
      props.deleteProperty(key);
      deleted++;
      report.push('  🗑️ ' + key + ' (' + reason + ')');
    }
  }

  Logger.log('═══════════════════════════════════════');
  Logger.log('🧹 CLEANUP COMPLETE');
  Logger.log('   Deleted: ' + deleted);
  Logger.log('   Remaining: ' + (keys.length - deleted));
  Logger.log('═══════════════════════════════════════');
  for (var r = 0; r < report.length; r++) {
    Logger.log(report[r]);
  }

  return {
    deleted: deleted,
    remaining: keys.length - deleted,
    report: report
  };
}

// ============================================================
// 🔄 Reset — ลบ properties ที่ไม่ใช่ config หลัก (ใช้เมื่อจำเป็น)
// ============================================================
function resetNonEssentialProperties() {
  var KEEP_KEYS = [
    'DB_SS_ID', 'DEFAULT_ADMIN_PASSWORD', 'DRIVE_FOLDER_IDS',
    'PUSH_SUBSCRIBERS', 'SESSION_MD_CONTENT'
  ];

  var props = PropertiesService.getScriptProperties();
  var all   = props.getProperties();
  var keys  = Object.keys(all);
  var deleted = 0;

  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    var keep = false;
    for (var k = 0; k < KEEP_KEYS.length; k++) {
      if (key === KEEP_KEYS[k]) { keep = true; break; }
    }
    // เก็บ AG_KEY_ ไว้ (agent API keys)
    if (key.indexOf('AG_KEY_') === 0) keep = true;

    if (!keep) {
      props.deleteProperty(key);
      deleted++;
    }
  }

  Logger.log('🔄 Reset complete: deleted ' + deleted + ', kept ' + (keys.length - deleted));
  return { deleted: deleted, kept: keys.length - deleted };
}
