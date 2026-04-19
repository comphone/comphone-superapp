// ============================================================
// DecisionGuard.gs — COMPHONE SUPER APP V5.5
// AI-OS Stabilization — Phase 2: Decision Guard
// ============================================================
// Cooldown: ป้องกัน alert/action เดิมยิงซ้ำในช่วงเวลาสั้น
// Deduplication: ตรวจสอบ fingerprint ก่อน trigger ทุกครั้ง
// Rate Limiting: จำกัดจำนวน actions ต่อ agent ต่อนาที
// ============================================================

var DG_VERSION = '1.0.0';

// ─── COOLDOWN CONFIG ───────────────────────────────────────
// หน่วย: วินาที
var DG_COOLDOWN = {
  // Alert types
  'P1-CRITICAL':         300,   // 5 นาที
  'P2-HIGH':             900,   // 15 นาที
  'P3-MEDIUM':           1800,  // 30 นาที
  // Workflow triggers
  'QC_FAIL':             600,   // 10 นาที
  'PAYMENT_ERROR':       300,   // 5 นาที
  'SLA_LOW':             1800,  // 30 นาที
  // Decision actions
  'SEND_CRITICAL_ALERT': 300,
  'SEND_WARNING_ALERT':  600,
  'TRIGGER_QC_WORKFLOW': 600,
  'TRIGGER_PAYMENT_WORKFLOW': 300,
  'TRIGGER_SLA_WORKFLOW':     1800,
  'REQUEST_HUMAN_REVIEW':     3600, // 1 ชั่วโมง
  'RUN_LEARNING_CYCLE':       21600, // 6 ชั่วโมง
  // Default
  'DEFAULT':             120    // 2 นาที
};

// ─── RATE LIMIT CONFIG ─────────────────────────────────────
var DG_RATE_LIMIT = {
  perAgent: {
    'manus':    20,  // actions ต่อนาที
    'openclaw': 15,
    'hermes':   15,
    'internal': 50,
    'DEFAULT':  10
  },
  perAction: {
    'decide':        30,
    'triggerWorkflow': 10,
    'agentCall':     20,
    'DEFAULT':       15
  }
};

// ─── STORAGE KEYS ──────────────────────────────────────────
var DG_COOLDOWN_KEY  = 'DG_COOLDOWN_STATE';
var DG_DEDUP_KEY     = 'DG_DEDUP_FINGERPRINTS';
var DG_RATE_KEY      = 'DG_RATE_COUNTERS';
var DG_GUARD_LOG_KEY = 'DG_GUARD_LOG';

// ─── MAIN: checkGuard ──────────────────────────────────────

/**
 * checkGuard — ตรวจสอบทุก guard ก่อน execute action
 * @param {Object} params - { actionType, agentId, payload?, fingerprint? }
 * @returns {Object} { allowed, reason, retryAfter? }
 */
function checkGuard(params) {
  params = params || {};
  var actionType  = params.actionType  || params.action || 'DEFAULT';
  var agentId     = params.agentId     || 'unknown';
  var payload     = params.payload     || {};
  var fingerprint = params.fingerprint || _dgFingerprint_(actionType, payload);

  // 1. ตรวจ Cooldown
  var cooldownCheck = _dgCheckCooldown_(actionType, fingerprint);
  if (!cooldownCheck.allowed) {
    _dgLogGuard_('COOLDOWN_BLOCK', agentId, actionType, cooldownCheck.reason);
    return cooldownCheck;
  }

  // 2. ตรวจ Deduplication
  var dedupCheck = _dgCheckDedup_(fingerprint, actionType);
  if (!dedupCheck.allowed) {
    _dgLogGuard_('DEDUP_BLOCK', agentId, actionType, dedupCheck.reason);
    return dedupCheck;
  }

  // 3. ตรวจ Rate Limit
  var rateCheck = _dgCheckRateLimit_(agentId, actionType);
  if (!rateCheck.allowed) {
    _dgLogGuard_('RATE_LIMIT_BLOCK', agentId, actionType, rateCheck.reason);
    return rateCheck;
  }

  // ผ่านทุก guard → บันทึก cooldown + dedup
  _dgSetCooldown_(actionType, fingerprint);
  _dgMarkDedup_(fingerprint, actionType);
  _dgIncrRateCounter_(agentId, actionType);

  return { allowed: true, fingerprint: fingerprint };
}

/**
 * checkGuardAndDecide — ตรวจ guard แล้ว decide (wrapper สำหรับ DecisionLayer)
 */
function checkGuardAndDecide(params) {
  params = params || {};
  var guardCheck = checkGuard({
    actionType: 'decide',
    agentId:    params.agentId || 'system',
    payload:    params
  });

  if (!guardCheck.allowed) {
    return Object.assign({ success: false, guardBlocked: true }, guardCheck);
  }

  return decide(params);
}

/**
 * checkGuardAndTrigger — ตรวจ guard แล้ว trigger workflow
 */
function checkGuardAndTrigger(params) {
  params = params || {};
  var workflowId = params.workflowId || '';
  var guardCheck = checkGuard({
    actionType: workflowId,
    agentId:    params.agentId || 'system',
    payload:    params.trigger || {}
  });

  if (!guardCheck.allowed) {
    return Object.assign({ success: false, guardBlocked: true }, guardCheck);
  }

  return triggerWorkflow(params);
}

// ─── COOLDOWN ──────────────────────────────────────────────

function _dgCheckCooldown_(actionType, fingerprint) {
  try {
    var state = _dgLoadState_(DG_COOLDOWN_KEY);
    var key   = actionType + ':' + fingerprint;
    var entry = state[key];

    if (!entry) return { allowed: true };

    var ttl  = DG_COOLDOWN[actionType] || DG_COOLDOWN.DEFAULT;
    var elapsed = (Date.now() - entry.ts) / 1000;

    if (elapsed < ttl) {
      var retryAfter = Math.ceil(ttl - elapsed);
      return {
        allowed:    false,
        reason:     'COOLDOWN_ACTIVE: ' + actionType + ' (retry in ' + retryAfter + 's)',
        retryAfter: retryAfter,
        cooldownTtl: ttl
      };
    }
    return { allowed: true };
  } catch (e) {
    return { allowed: true }; // fail-open: ถ้า error ให้ผ่าน
  }
}

function _dgSetCooldown_(actionType, fingerprint) {
  try {
    var state = _dgLoadState_(DG_COOLDOWN_KEY);
    var key   = actionType + ':' + fingerprint;
    state[key] = { ts: Date.now(), actionType: actionType };

    // cleanup entries เก่า (> 24 ชั่วโมง)
    var cutoff = Date.now() - 24 * 60 * 60 * 1000;
    Object.keys(state).forEach(function(k) {
      if (state[k].ts < cutoff) delete state[k];
    });

    _dgSaveState_(DG_COOLDOWN_KEY, state);
  } catch (e) {}
}

// ─── DEDUPLICATION ─────────────────────────────────────────

function _dgCheckDedup_(fingerprint, actionType) {
  try {
    var state = _dgLoadState_(DG_DEDUP_KEY);
    var entry = state[fingerprint];

    if (!entry) return { allowed: true };

    // dedup window = cooldown time
    var window = DG_COOLDOWN[actionType] || DG_COOLDOWN.DEFAULT;
    var elapsed = (Date.now() - entry.ts) / 1000;

    if (elapsed < window) {
      return {
        allowed:    false,
        reason:     'DUPLICATE_DETECTED: identical action within ' + Math.round(elapsed) + 's (window=' + window + 's)',
        duplicate:  true,
        originalTs: new Date(entry.ts).toISOString()
      };
    }
    return { allowed: true };
  } catch (e) {
    return { allowed: true };
  }
}

function _dgMarkDedup_(fingerprint, actionType) {
  try {
    var state = _dgLoadState_(DG_DEDUP_KEY);
    state[fingerprint] = { ts: Date.now(), actionType: actionType };

    // cleanup เก่า
    var cutoff = Date.now() - 24 * 60 * 60 * 1000;
    Object.keys(state).forEach(function(k) {
      if (state[k].ts < cutoff) delete state[k];
    });

    _dgSaveState_(DG_DEDUP_KEY, state);
  } catch (e) {}
}

// ─── RATE LIMITING ─────────────────────────────────────────

function _dgCheckRateLimit_(agentId, actionType) {
  try {
    var counters = _dgLoadState_(DG_RATE_KEY);
    var now      = Date.now();
    var minute   = Math.floor(now / 60000); // นาทีปัจจุบัน

    var agentKey  = 'agent:' + agentId + ':' + minute;
    var actionKey = 'action:' + actionType + ':' + minute;

    var agentCount  = counters[agentKey]  || 0;
    var actionCount = counters[actionKey] || 0;

    var agentLimit  = DG_RATE_LIMIT.perAgent[agentId]     || DG_RATE_LIMIT.perAgent.DEFAULT;
    var actionLimit = DG_RATE_LIMIT.perAction[actionType] || DG_RATE_LIMIT.perAction.DEFAULT;

    if (agentCount >= agentLimit) {
      return {
        allowed: false,
        reason:  'RATE_LIMIT_AGENT: ' + agentId + ' (' + agentCount + '/' + agentLimit + ' per min)',
        retryAfter: 60 - (now % 60000) / 1000
      };
    }
    if (actionCount >= actionLimit) {
      return {
        allowed: false,
        reason:  'RATE_LIMIT_ACTION: ' + actionType + ' (' + actionCount + '/' + actionLimit + ' per min)',
        retryAfter: 60 - (now % 60000) / 1000
      };
    }
    return { allowed: true };
  } catch (e) {
    return { allowed: true };
  }
}

function _dgIncrRateCounter_(agentId, actionType) {
  try {
    var counters = _dgLoadState_(DG_RATE_KEY);
    var now      = Date.now();
    var minute   = Math.floor(now / 60000);

    var agentKey  = 'agent:' + agentId + ':' + minute;
    var actionKey = 'action:' + actionType + ':' + minute;

    counters[agentKey]  = (counters[agentKey]  || 0) + 1;
    counters[actionKey] = (counters[actionKey] || 0) + 1;

    // cleanup counters เก่า (> 5 นาที)
    var cutoffMin = minute - 5;
    Object.keys(counters).forEach(function(k) {
      var parts = k.split(':');
      var min   = parseInt(parts[parts.length - 1], 10);
      if (min < cutoffMin) delete counters[k];
    });

    _dgSaveState_(DG_RATE_KEY, counters);
  } catch (e) {}
}

// ─── GUARD MANAGEMENT ──────────────────────────────────────

/**
 * resetCooldown — ล้าง cooldown สำหรับ action type ที่ระบุ (admin only)
 */
function resetCooldown(params) {
  try {
    params = params || {};
    var actionType = params.actionType || '';
    var state = _dgLoadState_(DG_COOLDOWN_KEY);

    if (actionType) {
      Object.keys(state).forEach(function(k) {
        if (k.startsWith(actionType + ':')) delete state[k];
      });
    } else {
      // ล้างทั้งหมด
      Object.keys(state).forEach(function(k) { delete state[k]; });
    }

    _dgSaveState_(DG_COOLDOWN_KEY, state);
    return { success: true, cleared: actionType || 'ALL' };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

/**
 * getGuardStatus — ดูสถานะ guard ปัจจุบัน
 */
function getGuardStatus(params) {
  try {
    var cooldowns = _dgLoadState_(DG_COOLDOWN_KEY);
    var dedups    = _dgLoadState_(DG_DEDUP_KEY);
    var rates     = _dgLoadState_(DG_RATE_KEY);
    var now       = Date.now();

    // นับ active cooldowns
    var activeCooldowns = [];
    Object.keys(cooldowns).forEach(function(k) {
      var parts      = k.split(':');
      var actionType = parts[0];
      var ttl        = DG_COOLDOWN[actionType] || DG_COOLDOWN.DEFAULT;
      var elapsed    = (now - cooldowns[k].ts) / 1000;
      if (elapsed < ttl) {
        activeCooldowns.push({
          key:        k,
          actionType: actionType,
          retryAfter: Math.ceil(ttl - elapsed)
        });
      }
    });

    // นับ rate counters ปัจจุบัน
    var minute = Math.floor(now / 60000);
    var currentRates = {};
    Object.keys(rates).forEach(function(k) {
      if (k.endsWith(':' + minute)) {
        currentRates[k.replace(':' + minute, '')] = rates[k];
      }
    });

    return {
      success:          true,
      activeCooldowns:  activeCooldowns.length,
      cooldownDetails:  activeCooldowns,
      activeDedups:     Object.keys(dedups).length,
      currentRates:     currentRates,
      config:           { cooldown: DG_COOLDOWN, rateLimit: DG_RATE_LIMIT }
    };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

/**
 * getGuardLog — ดู guard block log
 */
function getGuardLog(params) {
  try {
    params = params || {};
    var limit = parseInt(params.limit || 20, 10);
    var raw   = PropertiesService.getScriptProperties().getProperty(DG_GUARD_LOG_KEY) || '[]';
    var logs  = JSON.parse(raw);
    return { success: true, count: logs.slice(0, limit).length, logs: logs.slice(0, limit) };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

/**
 * getDecisionGuardVersion
 */
function getDecisionGuardVersion() {
  return {
    success: true,
    version: DG_VERSION,
    module: 'DecisionGuard',
    features: ['cooldown-per-type', 'deduplication', 'rate-limiting', 'guard-log', 'reset-cooldown', 'guard-status']
  };
}

// ─── PRIVATE HELPERS ───────────────────────────────────────

function _dgFingerprint_(actionType, payload) {
  // สร้าง fingerprint จาก actionType + payload keys ที่สำคัญ
  var key = actionType;
  if (payload) {
    var sig = '';
    ['jobId', 'type', 'workflowId', 'agentId', 'alertType'].forEach(function(f) {
      if (payload[f]) sig += ':' + f + '=' + payload[f];
    });
    key += sig;
  }
  // Hash แบบง่าย (Adler-32 style)
  var hash = 0;
  for (var i = 0; i < key.length; i++) {
    hash = ((hash << 5) - hash + key.charCodeAt(i)) & 0xffffffff;
  }
  return Math.abs(hash).toString(16).substring(0, 8);
}

function _dgLoadState_(key) {
  try {
    // ลอง CacheService ก่อน (เร็วกว่า)
    var cache  = CacheService.getScriptCache();
    var cached = cache.get('DG_' + key);
    if (cached) {
      try { return JSON.parse(cached); } catch(e) {}
    }
    var raw = PropertiesService.getScriptProperties().getProperty(key) || '{}';
    var data = JSON.parse(raw);
    try { cache.put('DG_' + key, raw, 60); } catch(e) {}
    return data;
  } catch (e) {
    return {};
  }
}

function _dgSaveState_(key, data) {
  var json = JSON.stringify(data);
  PropertiesService.getScriptProperties().setProperty(key, json);
  try { CacheService.getScriptCache().put('DG_' + key, json, 60); } catch(e) {}
}

function _dgLogGuard_(blockType, agentId, actionType, reason) {
  try {
    var raw  = PropertiesService.getScriptProperties().getProperty(DG_GUARD_LOG_KEY) || '[]';
    var logs = JSON.parse(raw);
    logs.unshift({
      blockType:  blockType,
      agentId:    agentId,
      actionType: actionType,
      reason:     reason,
      ts:         new Date().toISOString()
    });
    if (logs.length > 200) logs = logs.slice(0, 200);
    PropertiesService.getScriptProperties().setProperty(DG_GUARD_LOG_KEY, JSON.stringify(logs));
  } catch(e) {}
}
