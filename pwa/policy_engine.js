/** ============================================================
 * PHASE 26.5 — HUMAN OVERRIDE & POLICY CONTROL
 * COMPHONE SUPER APP V5.5
 *
 * MISSION: ควบคุม AI ให้ไม่หลุดกรอบ
 *
 * FEATURES:
 *   1. GLOBAL KILL SWITCH (SYSTEM_CONTROL)
 *   2. POLICY ENGINE (allow/deny auto-fix categories)
 *   3. RATE LIMIT SELF HEAL (maxFixPerMinute)
 *   4. MANUAL OVERRIDE PANEL (ADMIN_CONTROL)
 *   5. SAFE MODE EXIT LOGIC (auto-exit on health recovery)
 *   6. AUDIT LOG (window.__AI_AUDIT_LOG) — ทุก action
 * ============================================================ */

'use strict';

// ------------------------------------------------------------------
// STEP 1 — GLOBAL KILL SWITCH
// ------------------------------------------------------------------
window.SYSTEM_CONTROL = {
  enabled: true,
  selfHeal: true,
  execution: true
};

// Guard: ถ้า disabled ให้หยุด self-heal ทันที
(function guardSystemControl() {
  if (!window.SYSTEM_CONTROL.selfHeal && typeof window.STOP_SELF_HEAL === 'function') {
    window.STOP_SELF_HEAL();
    console.warn('[POLICY] SYSTEM_CONTROL.selfHeal = false — Self-heal stopped immediately');
  }
})();

// ------------------------------------------------------------------
// STEP 2 — POLICY ENGINE
// ------------------------------------------------------------------
window.POLICY = {
  allowAutoFix: ['API_ERROR', 'TIMEOUT', 'RATE_LIMIT'],
  denyAutoFix:  ['SECURITY', 'UNTRUSTED_ACTION', 'CONFIG', 'UNKNOWN'],
  maxFixPerMinute: 3,

  /**
   * ตรวจว่า cause ได้รับอนุญาตให้ auto-fix หรือไม่
   */
  canAutoFix: function(cause) {
    if (!cause) return false;
    const upper = String(cause).toUpperCase();

    // deny มีอะไรก็ต้อง deny ทันที
    if (this.denyAutoFix.includes(upper)) return false;
    if (this.denyAutoFix.some(d => upper.includes(d))) return false;

    // allow ต้องตรงกับที่อยู่ใน allow list
    if (this.allowAutoFix.includes(upper)) return true;
    if (this.allowAutoFix.some(a => upper.includes(a))) return true;

    // default-deny: ถ้าไม่อยู่ใน allow และไม่อยู่ใน deny — block ไว้
    return false;
  }
};

// ------------------------------------------------------------------
// STEP 3 — RATE LIMIT SELF HEAL
// ------------------------------------------------------------------
window.__SELF_HEAL_FIX_LOG = []; // { ts: number, cause: string, success: boolean }

// PHASE 26.6 FIX: Persist self-heal fix log — โหลดจาก localStorage ถ้ามี
(function loadPersistedFixLog() {
  try {
    const saved = localStorage.getItem('comphone_self_heal_fix_log');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) window.__SELF_HEAL_FIX_LOG = parsed;
    }
  } catch (e) {
    console.warn('[SELF_HEAL] Failed to load persisted fix log:', e);
  }
})();

window.RATE_LIMIT_SELF_HEAL = {
  /**
   * บันทึก fix ที่เกิดขึ้น และตรวจ rate limit
   * คืนค่า true = ผ่าน, false = ถูก block
   */
  recordAndCheck: function(cause, success) {
    const now = Date.now();
    window.__SELF_HEAL_FIX_LOG.push({ ts: now, cause: String(cause), success: !!success });

    // เก็บแค่ 100 entries
    if (window.__SELF_HEAL_FIX_LOG.length > 100) {
      window.__SELF_HEAL_FIX_LOG = window.__SELF_HEAL_FIX_LOG.slice(-100);
    }

    // PHASE 26.6 FIX: Persist ทุกครั้งที่มีการบันทึก
    try {
      localStorage.setItem('comphone_self_heal_fix_log', JSON.stringify(window.__SELF_HEAL_FIX_LOG));
    } catch (e) {}

    // นับ fixes ใน 1 นาที
    const oneMinuteAgo = now - 60000;
    const recentFixes = window.__SELF_HEAL_FIX_LOG.filter(x => x.ts >= oneMinuteAgo);

    if (recentFixes.length > window.POLICY.maxFixPerMinute) {
      console.error('[RATE_LIMIT] มี Auto-fix มากกว่า ' + window.POLICY.maxFixPerMinute + ' ครั้ง ใน 1 นาที → STOP SELF HEAL');

      // STOP IMMEDIATELY
      if (typeof window.STOP_SELF_HEAL === 'function') {
        window.STOP_SELF_HEAL();
      }

      // ALERT ADMIN
      window.ALERT_ADMIN('RATE_LIMIT_SELF_HEAL', {
        message: 'Self-heal ถูกหยุดเนื่องจาก fix เกิน ' + window.POLICY.maxFixPerMinute + ' ครั้ง/นาที',
        recentFixes: recentFixes,
        timestamp: now
      });

      // Push audit
      window.AI_AUDIT_PUSH({
        type: 'RATE_LIMIT_TRIGGERED',
        detail: 'Self-heal stopped due to excessive fixes',
        count: recentFixes.length,
        ts: now
      });

      return false; // blocked
    }

    return true; // allowed
  },

  getStats: function() {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    return {
      lastMinuteCount: window.__SELF_HEAL_FIX_LOG.filter(x => x.ts >= oneMinuteAgo).length,
      totalCount: window.__SELF_HEAL_FIX_LOG.length,
      lastFix: window.__SELF_HEAL_FIX_LOG[window.__SELF_HEAL_FIX_LOG.length - 1] || null
    };
  }
};

// ------------------------------------------------------------------
// STEP 4 — MANUAL OVERRIDE PANEL
// ------------------------------------------------------------------
window.ADMIN_CONTROL = function() {
  return {
    stopSelfHeal: function() {
      if (typeof window.STOP_SELF_HEAL === 'function') {
        window.STOP_SELF_HEAL();
        window.SYSTEM_CONTROL.selfHeal = false;
        console.log('[ADMIN] ผู้ดูแลคุม STOP SELF HEAL และ lock selfHeal = false');
        window.AI_AUDIT_PUSH({ type: 'ADMIN_OVERRIDE', action: 'stopSelfHeal', ts: Date.now() });
        return { ok: true, status: 'SELF_HEAL_STOPPED' };
      }
      return { ok: false, error: 'STOP_SELF_HEAL ไม่พร้อม' };
    },

    startSelfHeal: function() {
      window.SYSTEM_CONTROL.selfHeal = true;
      if (typeof window.START_SELF_HEAL === 'function') {
        window.START_SELF_HEAL();
        console.log('[ADMIN] ผู้ดูแลคุม START SELF HEAL');
        window.AI_AUDIT_PUSH({ type: 'ADMIN_OVERRIDE', action: 'startSelfHeal', ts: Date.now() });
        return { ok: true, status: 'SELF_HEAL_STARTED' };
      }
      return { ok: false, error: 'START_SELF_HEAL ไม่พร้อม' };
    },

    clearFailures: function() {
      try {
        localStorage.removeItem('comphone_failure_mem');
        if (window.FAILURE_MEMORY) window.FAILURE_MEMORY.records = [];
        console.log('[ADMIN] ล้าง failure memory');
        window.AI_AUDIT_PUSH({ type: 'ADMIN_OVERRIDE', action: 'clearFailures', ts: Date.now() });
        return { ok: true, status: 'FAILURES_CLEARED' };
      } catch (e) {
        return { ok: false, error: String(e) };
      }
    },

    resetSystem: function() {
      window.AI_AUDIT_PUSH({ type: 'ADMIN_OVERRIDE', action: 'resetSystem', ts: Date.now() });
      console.warn('[ADMIN] รีเซ็ตระบบโดยผู้ดูแล...');
      location.reload(true);
      return { ok: true, status: 'RELOADING' }; // จะไม่ทันถึงบรรทัดนี้เท่านั้น
    },

    // Bonus: ปรับ policy แบบ real-time
    setPolicy: function(updates) {
      if (updates.allowAutoFix) window.POLICY.allowAutoFix = updates.allowAutoFix;
      if (updates.denyAutoFix)  window.POLICY.denyAutoFix  = updates.denyAutoFix;
      if (typeof updates.maxFixPerMinute === 'number') window.POLICY.maxFixPerMinute = updates.maxFixPerMinute;
      window.AI_AUDIT_PUSH({ type: 'ADMIN_OVERRIDE', action: 'setPolicy', updates: updates, ts: Date.now() });
      return { ok: true, policy: window.POLICY };
    },

    getStatus: function() {
      return {
        systemControl: window.SYSTEM_CONTROL,
        policy: window.POLICY,
        rateLimitStats: window.RATE_LIMIT_SELF_HEAL.getStats(),
        selfHealStatus: (typeof window.SELF_HEAL_STATUS === 'function') ? window.SELF_HEAL_STATUS() : null,
        auditLogLength: window.__AI_AUDIT_LOG.length
      };
    }
  };
};

// ------------------------------------------------------------------
// STEP 5 — SAFE MODE EXIT LOGIC
// ------------------------------------------------------------------
window.__SAFE_MODE_HEALTH_HISTORY = []; // { ts: number, health: number }
window.__SAFE_MODE_ACTIVE = false;

// PHASE 26.6 FIX: Persist safe mode health history — โหลดจาก localStorage ถ้ามี
(function loadPersistedHealthHistory() {
  try {
    const saved = localStorage.getItem('comphone_safe_mode_health');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) window.__SAFE_MODE_HEALTH_HISTORY = parsed;
    }
  } catch (e) {
    console.warn('[SAFE_MODE] Failed to load persisted health history:', e);
  }
})();

window.SAFE_MODE_MONITOR = {
  /**
   * บันทึก health score แล้วตรวจ safe mode exit condition
   * health: 0-100
   */
  recordHealth: function(health) {
    const now = Date.now();
    const entry = { ts: now, health: Number(health) || 0 };
    window.__SAFE_MODE_HEALTH_HISTORY.push(entry);

    // เก็บแค่ 5 นาที (15s ต่อ entry — 20 entries/min)
    const maxEntries = 20;
    if (window.__SAFE_MODE_HEALTH_HISTORY.length > maxEntries) {
      window.__SAFE_MODE_HEALTH_HISTORY = window.__SAFE_MODE_HEALTH_HISTORY.slice(-maxEntries);
    }

    // PHASE 26.6 FIX: Persist ทุกครั้งที่บันทึก
    try {
      localStorage.setItem('comphone_safe_mode_health', JSON.stringify(window.__SAFE_MODE_HEALTH_HISTORY));
    } catch (e) {}

    // ถ้า safe mode ทำงานอยู่ → ตรวจ exit condition
    if (window.__SAFE_MODE_ACTIVE) {
      this._checkExitCondition();
    }
  },

  _checkExitCondition: function() {
    const now = Date.now();
    const twoMinutesAgo = now - 120000;

    // เอา entries ใน 2 นาทีที่มี health > 80
    const healthyEntries = window.__SAFE_MODE_HEALTH_HISTORY.filter(
      e => e.ts >= twoMinutesAgo && e.health > 80
    );

    // ต้องมี entry อย่างน้อย 4 ตัว (ครึ่ง 1 นาที) และทุกตัวต้อง health > 80
    const totalInWindow = window.__SAFE_MODE_HEALTH_HISTORY.filter(e => e.ts >= twoMinutesAgo).length;
    if (totalInWindow >= 4 && healthyEntries.length === totalInWindow) {
      this.exitSafeMode();
    }
  },

  enterSafeMode: function(reason) {
    window.__SAFE_MODE_ACTIVE = true;
    window.__AI_EXECUTOR_ENABLED = false;
    console.warn('[SAFE_MODE] ENTER — เหตุผล:', reason);
    window.AI_AUDIT_PUSH({ type: 'SAFE_MODE', action: 'ENTER', reason: reason, ts: Date.now() });
  },

  exitSafeMode: function() {
    window.__SAFE_MODE_ACTIVE = false;
    window.__AI_EXECUTOR_ENABLED = true;
    console.warn('[SAFE_MODE] EXIT — สุขภาพกลับมาสูงเกิน 80 ต่อเนื่อง 2 นาที');
    window.AI_AUDIT_PUSH({ type: 'SAFE_MODE', action: 'EXIT', reason: 'health_recovered', ts: Date.now() });
  },

  isActive: function() {
    return window.__SAFE_MODE_ACTIVE;
  }
};

// Auto-record health ทุก 6 วินาที (ถ้ามี HEALTH_CHECK)
setInterval(function() {
  if (typeof window.EXECUTION_HEALTH_CHECK === 'function') {
    try {
      const health = window.EXECUTION_HEALTH_CHECK();
      window.SAFE_MODE_MONITOR.recordHealth(health.score || 0);
    } catch (e) {
      window.SAFE_MODE_MONITOR.recordHealth(0);
    }
  }
}, 6000);

// ------------------------------------------------------------------
// STEP 6 — AUDIT LOG
// ------------------------------------------------------------------
window.__AI_AUDIT_LOG = [];

window.AI_AUDIT_PUSH = function(entry) {
  if (!entry || typeof entry !== 'object') return;

  const record = Object.assign({
    ts: Date.now(),
    iso: new Date().toISOString()
  }, entry);

  window.__AI_AUDIT_LOG.push(record);

  // persist ล่าสุด 200 entries
  const maxAudit = 200;
  if (window.__AI_AUDIT_LOG.length > maxAudit) {
    window.__AI_AUDIT_LOG = window.__AI_AUDIT_LOG.slice(-maxAudit);
  }

  try {
    localStorage.setItem('comphone_audit_log', JSON.stringify(window.__AI_AUDIT_LOG));
  } catch (e) {
    // ignore quota
  }

  // ส่งไป console ด้วย สำหรับ traceability
  console.log('[AUDIT]', record.type || 'ACTION', record);
};

// Load persisted audit ถ้ามี
(function loadPersistedAudit() {
  try {
    const saved = localStorage.getItem('comphone_audit_log');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        window.__AI_AUDIT_LOG = parsed;
      }
    }
  } catch (e) {
    console.warn('[AUDIT] Failed to load persisted audit log:', e);
  }
})();

// ------------------------------------------------------------------
// STEP 7 — ALERT ADMIN HELPER
// ------------------------------------------------------------------
window.ALERT_ADMIN = function(channel, payload) {
  // 1. Console
  console.error('[ADMIN_ALERT][' + channel + ']', payload);

  // 2. GAS notify ถ้ามี
  if (window.GAS_EXECUTE && typeof window.GAS_EXECUTE === 'function') {
    try {
      window.GAS_EXECUTE('notifyAdmin', {
        subject: '[COMPHONE ADMIN ALERT] ' + channel,
        body: JSON.stringify(payload, null, 2)
      });
    } catch (e) {
      console.warn('[ALERT_ADMIN] GAS notify failed:', e);
    }
  }

  // 3. ส่งงาน audit ด้วย
  window.AI_AUDIT_PUSH({
    type: 'ADMIN_ALERT',
    channel: channel,
    payload: payload,
    ts: Date.now()
  });
};

// ------------------------------------------------------------------
// STEP 8 — INTEGRATION HELPERS (called by ai_executor_runtime.js)
// ------------------------------------------------------------------

/**
 * วังไว้ใน AI_EXECUTOR.execute ก่อนทุก execution
 */
window.POLICY_CHECK_BEFORE_EXECUTE = function(decision) {
  // Kill switch
  if (!window.SYSTEM_CONTROL.execution) {
    return { blocked: true, reason: 'SYSTEM_CONTROL.execution = false' };
  }

  // Safe mode guard
  if (window.__SAFE_MODE_ACTIVE) {
    return { blocked: true, reason: 'SAFE_MODE_ACTIVE' };
  }

  return { blocked: false };
};

/**
 * วังไว้ใน AUTO_FIX ก่อนทำงาน
 */
window.POLICY_CHECK_BEFORE_FIX = function(cause) {
  // Kill switch
  if (!window.SYSTEM_CONTROL.selfHeal) {
    return { allowed: false, reason: 'SYSTEM_CONTROL.selfHeal = false' };
  }

  // Policy category check
  if (!window.POLICY.canAutoFix(cause)) {
    return { allowed: false, reason: 'POLICY_DENIED: ' + cause };
  }

  // Rate limit check
  if (!window.RATE_LIMIT_SELF_HEAL.recordAndCheck(cause, true)) {
    return { allowed: false, reason: 'RATE_LIMIT_EXCEEDED' };
  }

  return { allowed: true };
};

console.log('[POLICY_ENGINE] PHASE 26.5 loaded — Human Override & Policy Control ready');
