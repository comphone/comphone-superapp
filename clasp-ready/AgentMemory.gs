// ============================================================
// AgentMemory.gs — COMPHONE SUPER APP V5.5
// AI Operating System — Phase 1: Agent Memory
// ============================================================
// ระบบความจำกลางสำหรับ AI Agents ทั้งหมด
// เก็บ: incidents, patterns, rules, context snapshots
// Storage: PropertiesService (persistent) + CacheService (fast)
// ============================================================

var AM_VERSION = '1.0.0';

// ─── STORAGE KEYS ──────────────────────────────────────────
var AM_KEYS = {
  INCIDENTS:  'AM_INCIDENTS',   // [{id, type, data, ts, resolved, agentId}]
  PATTERNS:   'AM_PATTERNS',    // [{id, type, frequency, lastSeen, confidence, action}]
  RULES:      'AM_RULES',       // [{id, name, condition, action, priority, enabled}]
  SNAPSHOTS:  'AM_SNAPSHOTS',   // [{ts, health, alerts, workload, triggeredBy}]
  STATS:      'AM_STATS'        // {totalIncidents, resolvedIncidents, rulesApplied}
};

var AM_MAX = {
  INCIDENTS: 200,
  PATTERNS:  100,
  SNAPSHOTS: 50
};

// ─── PHASE 1A: INCIDENT MEMORY ─────────────────────────────

/**
 * amStoreIncident — บันทึก incident ลง memory
 * @param {Object} params - { type, data, agentId, severity? }
 * @returns {Object} { success, incidentId }
 */
function amStoreIncident(params) {
  try {
    params = params || {};
    var type     = params.type     || 'UNKNOWN';
    var data     = params.data     || {};
    var agentId  = params.agentId  || 'system';
    var severity = params.severity || 'MEDIUM'; // LOW / MEDIUM / HIGH / CRITICAL

    var incidents = _amLoad_(AM_KEYS.INCIDENTS);
    var id = 'inc_' + Utilities.getUuid().replace(/-/g, '').substring(0, 12);

    var entry = {
      id:        id,
      type:      type,
      data:      data,
      agentId:   agentId,
      severity:  severity,
      ts:        new Date().toISOString(),
      resolved:  false,
      resolvedAt: null,
      resolvedBy: null,
      tags:      params.tags || []
    };

    incidents.unshift(entry);
    if (incidents.length > AM_MAX.INCIDENTS) {
      incidents = incidents.slice(0, AM_MAX.INCIDENTS);
    }
    _amSave_(AM_KEYS.INCIDENTS, incidents);

    // Update stats
    _amIncrStat_('totalIncidents');

    // Auto-detect patterns from new incident
    _amDetectPattern_(type, data);

    return { success: true, incidentId: id, severity: severity };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

/**
 * amResolveIncident — ทำเครื่องหมายว่า incident แก้ไขแล้ว
 */
function amResolveIncident(params) {
  try {
    params = params || {};
    var id       = params.incidentId || params.id || '';
    var resolvedBy = params.resolvedBy || params.agentId || 'system';
    var note     = params.note || '';

    var incidents = _amLoad_(AM_KEYS.INCIDENTS);
    var found = false;
    incidents = incidents.map(function(inc) {
      if (inc.id === id) {
        found = true;
        return Object.assign({}, inc, {
          resolved:   true,
          resolvedAt: new Date().toISOString(),
          resolvedBy: resolvedBy,
          resolutionNote: note
        });
      }
      return inc;
    });

    if (!found) return { success: false, error: 'Incident not found: ' + id };

    _amSave_(AM_KEYS.INCIDENTS, incidents);
    _amIncrStat_('resolvedIncidents');

    return { success: true, incidentId: id, resolvedBy: resolvedBy };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

/**
 * amGetIncidents — ดึง incidents ตาม filter
 */
function amGetIncidents(params) {
  try {
    params = params || {};
    var type     = params.type     || '';
    var severity = params.severity || '';
    var resolved = params.resolved; // true/false/undefined
    var agentId  = params.agentId  || '';
    var limit    = parseInt(params.limit || 20, 10);
    var days     = parseInt(params.days  || 7,  10);

    var cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    var incidents = _amLoad_(AM_KEYS.INCIDENTS);

    incidents = incidents.filter(function(inc) {
      if (new Date(inc.ts).getTime() < cutoff) return false;
      if (type     && inc.type     !== type)     return false;
      if (severity && inc.severity !== severity) return false;
      if (agentId  && inc.agentId  !== agentId)  return false;
      if (resolved !== undefined && inc.resolved !== resolved) return false;
      return true;
    });

    return {
      success:   true,
      count:     incidents.slice(0, limit).length,
      total:     incidents.length,
      incidents: incidents.slice(0, limit),
      filter:    { type: type || 'all', severity: severity || 'all', resolved: resolved, days: days }
    };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

// ─── PHASE 1B: PATTERN MEMORY ──────────────────────────────

/**
 * amStorePattern — บันทึก/อัปเดต pattern ที่พบซ้ำ
 */
function amStorePattern(params) {
  try {
    params = params || {};
    var type       = params.type       || 'UNKNOWN';
    var confidence = parseFloat(params.confidence || 0.5);
    // รองรับทั้ง suggestedAction (ใหม่) และ action (legacy) เพื่อหลีกเลี่ยง Router key conflict
    var action     = params.suggestedAction || params.patternAction || params._action || '';
    var metadata   = params.metadata   || {};

    var patterns = _amLoad_(AM_KEYS.PATTERNS);

    // ค้นหา pattern เดิม
    var existing = null;
    var idx = -1;
    patterns.forEach(function(p, i) {
      if (p.type === type) { existing = p; idx = i; }
    });

    if (existing) {
      // อัปเดต frequency และ confidence
      var newFreq = (existing.frequency || 1) + 1;
      var newConf = Math.min(0.99, (existing.confidence * 0.7) + (confidence * 0.3));
        patterns[idx] = Object.assign({}, existing, {
          frequency:  newFreq,
          confidence: parseFloat(newConf.toFixed(3)),
          lastSeen:   new Date().toISOString(),
          suggestedAction: action || existing.suggestedAction || existing.action,
          metadata:   Object.assign({}, existing.metadata, metadata)
        });
      } else {
        var id = 'pat_' + Utilities.getUuid().replace(/-/g, '').substring(0, 10);
        patterns.unshift({
          id:         id,
          type:       type,
          frequency:  1,
          confidence: confidence,
          firstSeen:  new Date().toISOString(),
          lastSeen:   new Date().toISOString(),
          suggestedAction: action,
          metadata:   metadata
        });
      if (patterns.length > AM_MAX.PATTERNS) {
        patterns = patterns.slice(0, AM_MAX.PATTERNS);
      }
    }

    _amSave_(AM_KEYS.PATTERNS, patterns);
    return { success: true, type: type, frequency: existing ? existing.frequency + 1 : 1, patternStored: true };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

/**
 * amGetPatterns — ดึง patterns เรียงตาม frequency/confidence
 */
function amGetPatterns(params) {
  try {
    params = params || {};
    var minConf  = parseFloat(params.minConfidence || 0);
    var minFreq  = parseInt(params.minFrequency || 0, 10);
    var limit    = parseInt(params.limit || 20, 10);

    var patterns = _amLoad_(AM_KEYS.PATTERNS);
    patterns = patterns.filter(function(p) {
      return p.confidence >= minConf && p.frequency >= minFreq;
    });
    patterns.sort(function(a, b) {
      return (b.frequency * b.confidence) - (a.frequency * a.confidence);
    });

    return {
      success:  true,
      count:    patterns.slice(0, limit).length,
      patterns: patterns.slice(0, limit)
    };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

// ─── PHASE 1C: RULE MEMORY ─────────────────────────────────

/**
 * amStoreRule — บันทึก rule ใหม่หรืออัปเดต rule เดิม
 * rule: { name, condition: {field, op, value}, action, priority, enabled }
 */
function amStoreRule(params) {
  try {
    params = params || {};
    var name      = params.name      || '';
    var condition = params.condition || {};
    // รองรับทั้ง ruleAction (ใหม่) และ action (legacy) เพื่อหลีกเลี่ยง Router key conflict
    var action    = params.ruleAction || params.suggestedAction || params._action || '';
    var priority  = parseInt(params.priority || 5, 10);
    var enabled   = params.enabled !== false;
    var source    = params.source   || 'manual'; // manual / auto / learning

    if (!name) return { success: false, error: 'Rule name required' };
    if (!condition || !action) return { success: false, error: 'condition and ruleAction required' };

    var rules = _amLoad_(AM_KEYS.RULES);

    // ตรวจสอบว่ามี rule ชื่อนี้แล้วหรือไม่
    var existingIdx = -1;
    rules.forEach(function(r, i) { if (r.name === name) existingIdx = i; });

    var ruleObj = {
      id:        existingIdx >= 0 ? rules[existingIdx].id : ('rule_' + Utilities.getUuid().replace(/-/g, '').substring(0, 10)),
      name:      name,
      condition: condition,
      action:    action,
      priority:  priority,
      enabled:   enabled,
      source:    source,
      createdAt: existingIdx >= 0 ? rules[existingIdx].createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      hitCount:  existingIdx >= 0 ? (rules[existingIdx].hitCount || 0) : 0
    };

    if (existingIdx >= 0) {
      rules[existingIdx] = ruleObj;
    } else {
      rules.push(ruleObj);
    }

    // เรียงตาม priority (ต่ำ = สำคัญกว่า)
    rules.sort(function(a, b) { return a.priority - b.priority; });
    _amSave_(AM_KEYS.RULES, rules);

    return { success: true, ruleId: ruleObj.id, name: name, isNew: existingIdx < 0 };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

/**
 * amGetRules — ดึง rules ที่ active
 */
function amGetRules(params) {
  try {
    params = params || {};
    var enabledOnly = params.enabledOnly !== false;
    var source      = params.source || '';

    var rules = _amLoad_(AM_KEYS.RULES);
    if (enabledOnly) rules = rules.filter(function(r) { return r.enabled; });
    if (source)      rules = rules.filter(function(r) { return r.source === source; });

    return { success: true, count: rules.length, rules: rules };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

/**
 * amEvaluateRules — ประเมิน rules กับ context ที่กำหนด
 * @returns {Array} matched rules เรียงตาม priority
 */
function amEvaluateRules(context) {
  try {
    context = context || {};
    var rules = _amLoad_(AM_KEYS.RULES).filter(function(r) { return r.enabled; });
    var matched = [];

    rules.forEach(function(rule) {
      if (_amCheckCondition_(context, rule.condition)) {
        matched.push({
          ruleId:   rule.id,
          name:     rule.name,
          action:   rule.action,
          priority: rule.priority,
          condition: rule.condition
        });
        // อัปเดต hitCount
        rule.hitCount = (rule.hitCount || 0) + 1;
      }
    });

    // บันทึก hitCount ที่อัปเดต
    _amSave_(AM_KEYS.RULES, rules);
    _amIncrStat_('rulesApplied', matched.length);

    return { success: true, matched: matched, count: matched.length };
  } catch (e) {
    return { success: false, error: e.toString(), matched: [] };
  }
}

// ─── PHASE 1D: CONTEXT SNAPSHOTS ───────────────────────────

/**
 * amSaveSnapshot — บันทึก system state snapshot
 */
function amSaveSnapshot(snapshot) {
  try {
    var snapshots = _amLoad_(AM_KEYS.SNAPSHOTS);
    var entry = Object.assign({}, snapshot, {
      ts: new Date().toISOString(),
      id: 'snap_' + Date.now()
    });
    snapshots.unshift(entry);
    if (snapshots.length > AM_MAX.SNAPSHOTS) {
      snapshots = snapshots.slice(0, AM_MAX.SNAPSHOTS);
    }
    _amSave_(AM_KEYS.SNAPSHOTS, snapshots);
    return { success: true, snapshotId: entry.id };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

/**
 * amGetSnapshots — ดึง snapshots ล่าสุด
 */
function amGetSnapshots(params) {
  try {
    params = params || {};
    var limit = parseInt(params.limit || 10, 10);
    var snapshots = _amLoad_(AM_KEYS.SNAPSHOTS).slice(0, limit);
    return { success: true, count: snapshots.length, snapshots: snapshots };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

// ─── MEMORY DASHBOARD ──────────────────────────────────────

/**
 * getAgentMemoryDashboard — ภาพรวม memory ทั้งหมด
 */
function getAgentMemoryDashboard(params) {
  try {
    var incidents = _amLoad_(AM_KEYS.INCIDENTS);
    var patterns  = _amLoad_(AM_KEYS.PATTERNS);
    var rules     = _amLoad_(AM_KEYS.RULES);
    var stats     = _amLoadStats_();

    var now = Date.now();
    var last24h = now - 24 * 60 * 60 * 1000;
    var last7d  = now - 7  * 24 * 60 * 60 * 1000;

    var recentInc = incidents.filter(function(i) { return new Date(i.ts).getTime() >= last24h; });
    var openInc   = incidents.filter(function(i) { return !i.resolved; });
    var critInc   = openInc.filter(function(i)   { return i.severity === 'CRITICAL'; });

    return {
      success: true,
      version: AM_VERSION,
      summary: {
        totalIncidents:    incidents.length,
        openIncidents:     openInc.length,
        criticalIncidents: critInc.length,
        last24hIncidents:  recentInc.length,
        totalPatterns:     patterns.length,
        activeRules:       rules.filter(function(r) { return r.enabled; }).length,
        totalRules:        rules.length
      },
      topPatterns: patterns.slice(0, 5).map(function(p) {
        return { type: p.type, frequency: p.frequency, confidence: p.confidence };
      }),
      recentIncidents: incidents.slice(0, 5).map(function(i) {
        return { id: i.id, type: i.type, severity: i.severity, resolved: i.resolved, ts: i.ts };
      }),
      stats: stats
    };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

/**
 * getAgentMemoryVersion — ดู version
 */
function getAgentMemoryVersion() {
  return {
    success: true,
    version: AM_VERSION,
    module: 'AgentMemory',
    features: ['incidents', 'patterns', 'rules', 'snapshots', 'auto-pattern-detection', 'rule-evaluation']
  };
}

// ─── PRIVATE HELPERS ───────────────────────────────────────

function _amLoad_(key) {
  try {
    // ลอง cache ก่อน (เร็วกว่า)
    var cache = CacheService.getScriptCache();
    var cached = cache.get('AM_CACHE_' + key);
    if (cached) {
      try { return JSON.parse(cached); } catch(e) {}
    }
    // fallback: PropertiesService
    var raw = PropertiesService.getScriptProperties().getProperty(key) || '[]';
    var data = JSON.parse(raw);
    // บันทึกลง cache 5 นาที
    try { cache.put('AM_CACHE_' + key, raw, 300); } catch(e) {}
    return data;
  } catch (e) {
    return [];
  }
}

function _amSave_(key, data) {
  var json = JSON.stringify(data);
  PropertiesService.getScriptProperties().setProperty(key, json);
  // อัปเดต cache
  try {
    CacheService.getScriptCache().put('AM_CACHE_' + key, json, 300);
  } catch(e) {}
}

function _amLoadStats_() {
  try {
    var raw = PropertiesService.getScriptProperties().getProperty(AM_KEYS.STATS) || '{}';
    return JSON.parse(raw);
  } catch(e) { return {}; }
}

function _amIncrStat_(key, amount) {
  try {
    var stats = _amLoadStats_();
    stats[key] = (stats[key] || 0) + (amount || 1);
    PropertiesService.getScriptProperties().setProperty(AM_KEYS.STATS, JSON.stringify(stats));
  } catch(e) {}
}

function _amDetectPattern_(type, data) {
  // Auto-detect: ถ้า incident type เดิมเกิดซ้ำ → บันทึกเป็น pattern
  try {
    var incidents = _amLoad_(AM_KEYS.INCIDENTS);
    var sameType  = incidents.filter(function(i) { return i.type === type; });
    if (sameType.length >= 2) {
      amStorePattern({
        type:       type,
        confidence: Math.min(0.9, 0.3 + (sameType.length * 0.1)),
        action:     'auto_detected',
        metadata:   { sampleCount: sameType.length }
      });
    }
  } catch(e) {}
}

function _amCheckCondition_(context, condition) {
  if (!condition || !condition.field) return true;
  var val = context[condition.field];
  switch (condition.op) {
    case 'eq':       return val === condition.value;
    case 'neq':      return val !== condition.value;
    case 'gt':       return Number(val) > Number(condition.value);
    case 'lt':       return Number(val) < Number(condition.value);
    case 'gte':      return Number(val) >= Number(condition.value);
    case 'lte':      return Number(val) <= Number(condition.value);
    case 'contains': return String(val || '').includes(String(condition.value));
    case 'exists':   return val !== undefined && val !== null && val !== '';
    case 'in':       return Array.isArray(condition.value) && condition.value.includes(val);
    default:         return true;
  }
}
