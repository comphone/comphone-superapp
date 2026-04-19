// ============================================================
// MemoryControl.gs — COMPHONE SUPER APP V5.5
// AI-OS Stabilization — Phase 1: Memory Control
// ============================================================
// Retention Policy: ลบข้อมูลเก่าตาม TTL
// Archive: ย้ายข้อมูลสำคัญไปเก็บใน Archive store
// Pattern Pruning: ลบ patterns ที่ confidence ต่ำหรือไม่ได้ใช้นาน
// ============================================================

var MC_VERSION = '1.0.0';

// ─── RETENTION POLICY CONFIG ──────────────────────────────
var MC_RETENTION = {
  INCIDENTS: {
    CRITICAL: 90,  // วัน
    HIGH:     30,
    MEDIUM:   14,
    LOW:      7
  },
  PATTERNS: {
    maxAge:         30,   // วัน — ลบ pattern ที่ไม่ได้เห็นนานกว่านี้
    minConfidence:  0.30, // ลบ pattern ที่ confidence ต่ำกว่านี้
    minFrequency:   2     // ลบ pattern ที่เกิดน้อยกว่านี้ครั้ง
  },
  SNAPSHOTS: {
    maxAge: 7,    // วัน
    maxCount: 50  // เก็บสูงสุด 50 snapshots
  },
  RULES: {
    maxAge:     180,  // วัน — ลบ rule ที่ไม่ได้ใช้นานกว่านี้
    minHitCount: 0    // ลบ rule ที่ไม่เคย hit เลยหลังจาก maxAge
  }
};

// ─── ARCHIVE STORE KEYS ────────────────────────────────────
var MC_ARCHIVE_KEY     = 'MC_ARCHIVE_INCIDENTS';
var MC_PRUNE_LOG_KEY   = 'MC_PRUNE_LOG';
var MC_ARCHIVE_MAX     = 500;

// ─── MAIN: runRetentionPolicy ──────────────────────────────

/**
 * runRetentionPolicy — รัน retention policy ทั้งหมด
 * ควรตั้งเป็น Time-driven trigger ทุกวัน
 */
function runRetentionPolicy(params) {
  params = params || {};
  var startTs = Date.now();
  var report  = {
    incidents: { archived: 0, deleted: 0 },
    patterns:  { pruned: 0 },
    snapshots: { deleted: 0 },
    rules:     { disabled: 0 }
  };

  try {
    report.incidents = _mcRetainIncidents_();
    report.patterns  = _mcPrunePatterns_();
    report.snapshots = _mcRetainSnapshots_();
    report.rules     = _mcRetainRules_();

    // บันทึก prune log
    _mcLogPrune_(report);

    return {
      success:   true,
      report:    report,
      latencyMs: Date.now() - startTs,
      ts:        new Date().toISOString()
    };
  } catch (e) {
    return { success: false, error: e.toString(), report: report };
  }
}

// ─── INCIDENT RETENTION ────────────────────────────────────

function _mcRetainIncidents_() {
  var result = { archived: 0, deleted: 0 };
  try {
    var incidents = _amLoad_(AM_KEYS.INCIDENTS);
    var now       = Date.now();
    var toKeep    = [];
    var toArchive = [];

    incidents.forEach(function(inc) {
      var ageDays = (now - new Date(inc.ts).getTime()) / (1000 * 60 * 60 * 24);
      var ttl     = MC_RETENTION.INCIDENTS[inc.severity] || MC_RETENTION.INCIDENTS.LOW;

      if (ageDays > ttl) {
        // CRITICAL/HIGH → archive ก่อนลบ
        if (inc.severity === 'CRITICAL' || inc.severity === 'HIGH') {
          toArchive.push(inc);
          result.archived++;
        } else {
          result.deleted++;
        }
      } else {
        toKeep.push(inc);
      }
    });

    // บันทึก archive
    if (toArchive.length > 0) {
      _mcArchiveIncidents_(toArchive);
    }

    _amSave_(AM_KEYS.INCIDENTS, toKeep);
  } catch (e) {
    result.error = e.toString();
  }
  return result;
}

// ─── PATTERN PRUNING ───────────────────────────────────────

/**
 * prunePatterns — ลบ patterns ที่ไม่มีคุณภาพ
 * สามารถเรียกเองได้หรือรันผ่าน runRetentionPolicy
 */
function prunePatterns(params) {
  params = params || {};
  var result = _mcPrunePatterns_(params);
  return Object.assign({ success: true }, result);
}

function _mcPrunePatterns_(params) {
  var result = { pruned: 0, kept: 0, reasons: {} };
  try {
    params = params || {};
    var minConf = params.minConfidence || MC_RETENTION.PATTERNS.minConfidence;
    var minFreq = params.minFrequency  || MC_RETENTION.PATTERNS.minFrequency;
    var maxAge  = params.maxAge        || MC_RETENTION.PATTERNS.maxAge;
    var now     = Date.now();
    var cutoff  = now - maxAge * 24 * 60 * 60 * 1000;

    var patterns = _amLoad_(AM_KEYS.PATTERNS);
    var toKeep   = [];

    patterns.forEach(function(p) {
      var reason = null;

      if (p.confidence < minConf) {
        reason = 'low_confidence(' + p.confidence + '<' + minConf + ')';
      } else if (p.frequency < minFreq) {
        reason = 'low_frequency(' + p.frequency + '<' + minFreq + ')';
      } else if (new Date(p.lastSeen).getTime() < cutoff) {
        reason = 'stale(' + Math.round((now - new Date(p.lastSeen).getTime()) / 86400000) + 'd)';
      }

      if (reason) {
        result.pruned++;
        result.reasons[reason] = (result.reasons[reason] || 0) + 1;
      } else {
        toKeep.push(p);
        result.kept++;
      }
    });

    _amSave_(AM_KEYS.PATTERNS, toKeep);
  } catch (e) {
    result.error = e.toString();
  }
  return result;
}

// ─── SNAPSHOT RETENTION ────────────────────────────────────

function _mcRetainSnapshots_() {
  var result = { deleted: 0 };
  try {
    var snapshots = _amLoad_(AM_KEYS.SNAPSHOTS);
    var now    = Date.now();
    var cutoff = now - MC_RETENTION.SNAPSHOTS.maxAge * 24 * 60 * 60 * 1000;

    var toKeep = snapshots.filter(function(s) {
      return new Date(s.ts).getTime() >= cutoff;
    });

    // จำกัด maxCount
    if (toKeep.length > MC_RETENTION.SNAPSHOTS.maxCount) {
      result.deleted += toKeep.length - MC_RETENTION.SNAPSHOTS.maxCount;
      toKeep = toKeep.slice(0, MC_RETENTION.SNAPSHOTS.maxCount);
    }

    result.deleted += snapshots.length - toKeep.length;
    _amSave_(AM_KEYS.SNAPSHOTS, toKeep);
  } catch (e) {
    result.error = e.toString();
  }
  return result;
}

// ─── RULE RETENTION ────────────────────────────────────────

function _mcRetainRules_() {
  var result = { disabled: 0 };
  try {
    var rules  = _amLoad_(AM_KEYS.RULES);
    var now    = Date.now();
    var cutoff = now - MC_RETENTION.RULES.maxAge * 24 * 60 * 60 * 1000;

    rules = rules.map(function(r) {
      // disable rules ที่ไม่ได้ใช้นานเกินไปและ hitCount ยังเป็น 0
      if (r.source === 'auto' &&
          r.hitCount === 0 &&
          new Date(r.createdAt).getTime() < cutoff) {
        result.disabled++;
        return Object.assign({}, r, { enabled: false, disabledReason: 'unused_auto_rule' });
      }
      return r;
    });

    _amSave_(AM_KEYS.RULES, rules);
  } catch (e) {
    result.error = e.toString();
  }
  return result;
}

// ─── ARCHIVE ───────────────────────────────────────────────

function _mcArchiveIncidents_(incidents) {
  try {
    var raw     = PropertiesService.getScriptProperties().getProperty(MC_ARCHIVE_KEY) || '[]';
    var archive = JSON.parse(raw);
    incidents.forEach(function(inc) {
      archive.unshift(Object.assign({}, inc, { archivedAt: new Date().toISOString() }));
    });
    if (archive.length > MC_ARCHIVE_MAX) archive = archive.slice(0, MC_ARCHIVE_MAX);
    PropertiesService.getScriptProperties().setProperty(MC_ARCHIVE_KEY, JSON.stringify(archive));
  } catch (e) {}
}

/**
 * getArchivedIncidents — ดึง archived incidents
 */
function getArchivedIncidents(params) {
  try {
    params = params || {};
    var limit = parseInt(params.limit || 20, 10);
    var raw   = PropertiesService.getScriptProperties().getProperty(MC_ARCHIVE_KEY) || '[]';
    var archive = JSON.parse(raw);
    return { success: true, count: archive.slice(0, limit).length, total: archive.length, incidents: archive.slice(0, limit) };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

// ─── MEMORY HEALTH CHECK ───────────────────────────────────

/**
 * getMemoryHealth — ตรวจสอบสุขภาพของ Memory store
 */
function getMemoryHealth(params) {
  try {
    var incidents = _amLoad_(AM_KEYS.INCIDENTS);
    var patterns  = _amLoad_(AM_KEYS.PATTERNS);
    var rules     = _amLoad_(AM_KEYS.RULES);
    var snapshots = _amLoad_(AM_KEYS.SNAPSHOTS);

    // คำนวณ storage usage (PropertiesService limit = 500KB per property)
    var incSize  = JSON.stringify(incidents).length;
    var patSize  = JSON.stringify(patterns).length;
    var ruleSize = JSON.stringify(rules).length;
    var snapSize = JSON.stringify(snapshots).length;
    var totalBytes = incSize + patSize + ruleSize + snapSize;

    var usagePct = parseFloat((totalBytes / (500 * 1024) * 100).toFixed(1));

    // ตรวจ low-confidence patterns
    var lowConfPatterns = patterns.filter(function(p) { return p.confidence < MC_RETENTION.PATTERNS.minConfidence; }).length;
    var stalePatterns   = patterns.filter(function(p) {
      return (Date.now() - new Date(p.lastSeen).getTime()) > MC_RETENTION.PATTERNS.maxAge * 86400000;
    }).length;

    var warnings = [];
    if (usagePct > 70) warnings.push('HIGH_STORAGE: ' + usagePct + '%');
    if (lowConfPatterns > 10) warnings.push('LOW_CONF_PATTERNS: ' + lowConfPatterns);
    if (stalePatterns > 5)   warnings.push('STALE_PATTERNS: ' + stalePatterns);
    if (incidents.length > 150) warnings.push('INCIDENTS_NEAR_LIMIT: ' + incidents.length + '/200');

    return {
      success: true,
      status:  warnings.length === 0 ? 'HEALTHY' : (usagePct > 85 ? 'CRITICAL' : 'WARNING'),
      warnings: warnings,
      storage: {
        totalBytes:  totalBytes,
        usagePct:    usagePct,
        breakdown: {
          incidents: incSize,
          patterns:  patSize,
          rules:     ruleSize,
          snapshots: snapSize
        }
      },
      counts: {
        incidents:        incidents.length,
        patterns:         patterns.length,
        rules:            rules.length,
        snapshots:        snapshots.length,
        lowConfPatterns:  lowConfPatterns,
        stalePatterns:    stalePatterns
      },
      retention: MC_RETENTION
    };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

/**
 * setupMemoryControlTrigger — ตั้ง trigger รัน runRetentionPolicy ทุกวัน 02:00
 */
function setupMemoryControlTrigger() {
  try {
    ScriptApp.getProjectTriggers().forEach(function(t) {
      if (t.getHandlerFunction() === 'runRetentionPolicy') ScriptApp.deleteTrigger(t);
    });
    ScriptApp.newTrigger('runRetentionPolicy')
      .timeBased()
      .atHour(2)
      .everyDays(1)
      .create();
    return { success: true, message: 'Memory retention trigger set: daily at 02:00' };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

function _mcLogPrune_(report) {
  try {
    var raw  = PropertiesService.getScriptProperties().getProperty(MC_PRUNE_LOG_KEY) || '[]';
    var logs = JSON.parse(raw);
    logs.unshift({ ts: new Date().toISOString(), report: report });
    if (logs.length > 30) logs = logs.slice(0, 30);
    PropertiesService.getScriptProperties().setProperty(MC_PRUNE_LOG_KEY, JSON.stringify(logs));
  } catch(e) {}
}

/**
 * getMemoryControlVersion
 */
function getMemoryControlVersion() {
  return {
    success: true,
    version: MC_VERSION,
    module: 'MemoryControl',
    features: ['retention-policy', 'archive', 'pattern-pruning', 'snapshot-cleanup', 'rule-retirement', 'memory-health-check', 'daily-trigger']
  };
}
