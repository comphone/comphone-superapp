// ============================================================
// COMPHONE SUPER APP v5.9.0-phase2d
// LineBotQuota.gs — LINE Quota Optimization Engine
// Version: 1.0.0
// Strategy: Queue → Pull → Smart Push (max 5/day) → Daily Digest → Cache
// ============================================================

// ─────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────
var QUOTA_MAX_PUSH_PER_DAY  = 5;          // max push messages per day
var QUOTA_DIGEST_HOUR       = 8;          // daily digest sent at 08:00
var QUOTA_CACHE_TTL_SEC     = 300;        // response cache TTL = 5 min
var QUOTA_QUEUE_KEY         = 'LINE_ALERT_QUEUE';
var QUOTA_PUSH_COUNT_KEY    = 'LINE_PUSH_COUNT_TODAY';
var QUOTA_PUSH_DATE_KEY     = 'LINE_PUSH_DATE';
var QUOTA_CACHE_PREFIX      = 'LINE_CACHE_';
var QUOTA_DIGEST_SENT_KEY   = 'LINE_DIGEST_SENT_DATE';

// ─────────────────────────────────────────────────────────────
// PHASE 1 — ALERT QUEUE
// เก็บ alert ใน PropertiesService แทนการ push ทันที
// ─────────────────────────────────────────────────────────────

/**
 * queueAlert(alertType, data)
 * เพิ่ม alert เข้า queue (ไม่ push ทันที)
 * @param {string} alertType - 'SLA_LOW' | 'HEALTH_LOW' | 'ERROR_SPIKE' | 'LATENCY_HIGH'
 * @param {Object} data      - { value, threshold, detail }
 * @returns {Object} { success, queued, queueSize }
 */
function queueAlert(alertType, data) {
  var props = PropertiesService.getScriptProperties();
  var raw   = props.getProperty(QUOTA_QUEUE_KEY) || '[]';
  var queue;
  try { queue = JSON.parse(raw); } catch(e) { queue = []; }

  var entry = {
    id:        Utilities.getUuid(),
    type:      alertType,
    data:      data || {},
    ts:        new Date().toISOString(),
    severity:  _getSeverity_(alertType, data),
    notified:  false
  };
  queue.push(entry);

  // Keep max 50 entries (oldest first)
  if (queue.length > 50) queue = queue.slice(queue.length - 50);

  props.setProperty(QUOTA_QUEUE_KEY, JSON.stringify(queue));
  Logger.log('[QuotaQueue] Queued alert: ' + alertType + ' (queue size: ' + queue.length + ')');

  return { success: true, queued: true, queueSize: queue.length, entry: entry };
}

/**
 * getAlertQueue()
 * ดึง alert queue ทั้งหมด
 */
function getAlertQueue() {
  var props = PropertiesService.getScriptProperties();
  var raw   = props.getProperty(QUOTA_QUEUE_KEY) || '[]';
  try { return JSON.parse(raw); } catch(e) { return []; }
}

/**
 * clearAlertQueue()
 * ล้าง queue หลัง digest ส่งแล้ว
 */
function clearAlertQueue() {
  PropertiesService.getScriptProperties().setProperty(QUOTA_QUEUE_KEY, '[]');
  return { success: true, message: 'Alert queue cleared' };
}

/**
 * getUnnotifiedAlerts()
 * ดึงเฉพาะ alerts ที่ยังไม่ถูก notify
 */
function getUnnotifiedAlerts() {
  return getAlertQueue().filter(function(a) { return !a.notified; });
}

/**
 * markAlertsNotified(ids)
 * mark alerts ว่า notified แล้ว
 */
function markAlertsNotified(ids) {
  var props = PropertiesService.getScriptProperties();
  var queue = getAlertQueue();
  var idSet = {};
  (ids || []).forEach(function(id) { idSet[id] = true; });
  queue.forEach(function(a) { if (idSet[a.id]) a.notified = true; });
  props.setProperty(QUOTA_QUEUE_KEY, JSON.stringify(queue));
  return { success: true, marked: ids.length };
}

// ─────────────────────────────────────────────────────────────
// PHASE 2 — PULL MODEL
// #แจ้งเตือน → replyMessage (ฟรี, ไม่ใช้ quota)
// ─────────────────────────────────────────────────────────────

/**
 * handleAlertPullCommand(replyToken)
 * เมื่อ user พิมพ์ #แจ้งเตือน → reply ด้วย alert queue (ฟรี)
 */
function handleAlertPullCommand(replyToken) {
  var unnotified = getUnnotifiedAlerts();
  var token      = getConfig('LINE_CHANNEL_ACCESS_TOKEN') || '';

  if (unnotified.length === 0) {
    // No alerts — reply with "all clear" message
    var clearMsg = {
      type: 'flex',
      altText: '✅ ไม่มีการแจ้งเตือน',
      contents: {
        type: 'bubble', size: 'kilo',
        body: {
          type: 'box', layout: 'vertical', spacing: 'sm',
          contents: [
            { type: 'text', text: '✅ ไม่มีการแจ้งเตือน', weight: 'bold', color: '#27AE60', size: 'md' },
            { type: 'text', text: 'ระบบทำงานปกติทุกอย่าง', color: '#7f8c8d', size: 'sm', wrap: true }
          ]
        }
      }
    };
    return _lineReply_(replyToken, [clearMsg], token);
  }

  // Build carousel of alerts (max 10 per carousel)
  var recent = unnotified.slice(-10);
  var bubbles = recent.map(function(alert) {
    return _buildAlertFlexV2_(alert.type, alert.data);
  });

  // Mark as notified
  markAlertsNotified(recent.map(function(a) { return a.id; }));

  // Wrap in carousel if multiple
  var msg;
  if (bubbles.length === 1) {
    msg = bubbles[0];
  } else {
    msg = {
      type: 'flex',
      altText: '⚠️ มี ' + bubbles.length + ' การแจ้งเตือน',
      contents: {
        type: 'carousel',
        contents: bubbles.map(function(b) { return b.contents; })
      }
    };
  }

  return _lineReply_(replyToken, [msg], token);
}

/**
 * handleSummaryPullCommand(replyToken)
 * เมื่อ user พิมพ์ #สรุป → reply ด้วย summary (ฟรี)
 * ใช้ cached data ถ้ามี
 */
function handleSummaryPullCommand(replyToken) {
  var token   = getConfig('LINE_CHANNEL_ACCESS_TOKEN') || '';
  var summary = _getCachedSummary_();

  if (!summary) {
    // Fetch fresh data
    summary = _fetchSummaryData_();
    _cacheSummary_(summary);
  }

  var flexMsg = buildSummaryFlexV2_(summary);
  return _lineReply_(replyToken, [flexMsg], token);
}

// ─────────────────────────────────────────────────────────────
// PHASE 3 — SMART PUSH
// push เฉพาะ critical alerts, max 5 ครั้ง/วัน
// ─────────────────────────────────────────────────────────────

/**
 * smartPushAlert(alertType, data, options)
 * Push เฉพาะเมื่อ:
 *   1. severity === 'critical'
 *   2. push count วันนี้ < QUOTA_MAX_PUSH_PER_DAY
 *   3. ไม่มี duplicate alert ใน 30 นาทีที่ผ่านมา
 *
 * @returns {Object} { pushed, reason, remaining }
 */
function smartPushAlert(alertType, data, options) {
  options = options || {};

  // Always queue first
  var queued = queueAlert(alertType, data);

  var severity = _getSeverity_(alertType, data);

  // Non-critical → queue only, no push
  if (severity !== 'critical') {
    return {
      success:   true,
      pushed:    false,
      queued:    true,
      reason:    'Non-critical alert queued (will appear in digest)',
      severity:  severity,
      queueSize: queued.queueSize
    };
  }

  // Check daily push count
  var remaining = _getRemainingPushToday_();
  if (remaining <= 0) {
    return {
      success:   true,
      pushed:    false,
      queued:    true,
      reason:    'Daily push limit reached (' + QUOTA_MAX_PUSH_PER_DAY + '/day). Alert queued.',
      remaining: 0,
      queueSize: queued.queueSize
    };
  }

  // Check duplicate suppression (30 min window)
  if (_isDuplicateAlert_(alertType)) {
    return {
      success:   true,
      pushed:    false,
      queued:    true,
      reason:    'Duplicate alert suppressed (30 min window)',
      remaining: remaining,
      queueSize: queued.queueSize
    };
  }

  // Push!
  var toId    = options.toId || getConfig('LINE_ADMIN_USER_ID') || 'U33d684ffb92560e0eafb0ce8fdf6d4b0';
  var token   = getConfig('LINE_CHANNEL_ACCESS_TOKEN') || '';
  var flexMsg = _buildAlertFlexV2_(alertType, data);
  var result  = _linePush_(toId, [flexMsg], token);

  if (result && result.success !== false) {
    _incrementPushCount_();
    _recordAlertSent_(alertType);
    markAlertsNotified([queued.entry.id]);
    remaining = _getRemainingPushToday_();
  }

  return {
    success:   true,
    pushed:    true,
    queued:    true,
    result:    result,
    remaining: remaining,
    severity:  severity
  };
}

/**
 * checkAndAlertSLAOptimized(slaPercent, options)
 * แทนที่ checkAndAlertSLA เดิม — ใช้ smart push
 */
function checkAndAlertSLAOptimized(slaPercent, options) {
  var threshold = (getConfig('LINE_SLA_THRESHOLD') || 80);
  if (Number(slaPercent) < Number(threshold)) {
    return smartPushAlert('SLA_LOW', {
      value:     slaPercent,
      threshold: threshold,
      detail:    'SLA อยู่ที่ ' + slaPercent + '% ต่ำกว่าเป้า ' + threshold + '%'
    }, options);
  }
  return { success: true, skipped: true, reason: 'SLA OK (' + slaPercent + '%)' };
}

/**
 * checkAndAlertHealthOptimized(healthScore, options)
 */
function checkAndAlertHealthOptimized(healthScore, options) {
  var threshold = (getConfig('LINE_HEALTH_THRESHOLD') || 70);
  if (Number(healthScore) < Number(threshold)) {
    return smartPushAlert('HEALTH_LOW', {
      value:     healthScore,
      threshold: threshold,
      detail:    'Health Score อยู่ที่ ' + healthScore + '% ต่ำกว่าเกณฑ์ ' + threshold + '%'
    }, options);
  }
  return { success: true, skipped: true, reason: 'Health OK (' + healthScore + '%)' };
}

/**
 * checkAndAlertErrorOptimized(errorRate, latencyMs, options)
 */
function checkAndAlertErrorOptimized(errorRate, latencyMs, options) {
  var results = [];
  var errThreshold     = (getConfig('LINE_ERROR_THRESHOLD')   || 10);
  var latencyThreshold = (getConfig('LINE_LATENCY_THRESHOLD') || 8000);

  if (Number(errorRate) > Number(errThreshold)) {
    results.push(smartPushAlert('ERROR_SPIKE', {
      value:     errorRate,
      threshold: errThreshold,
      detail:    'Error rate ' + errorRate + '% สูงกว่าเกณฑ์ ' + errThreshold + '%'
    }, options));
  }
  if (Number(latencyMs) > Number(latencyThreshold)) {
    results.push(smartPushAlert('LATENCY_HIGH', {
      value:     latencyMs,
      threshold: latencyThreshold,
      detail:    'Latency ' + latencyMs + 'ms สูงกว่าเกณฑ์ ' + latencyThreshold + 'ms'
    }, options));
  }
  if (results.length === 0) return { success: true, skipped: true, reason: 'All OK' };
  return { success: true, results: results };
}

// ─────────────────────────────────────────────────────────────
// PHASE 4 — DAILY DIGEST
// สรุปรายวัน 1 message แทน push หลายครั้ง
// เรียกจาก time-based trigger เวลา 08:00
// ─────────────────────────────────────────────────────────────

/**
 * sendDailyDigest()
 * ส่ง digest สรุปประจำวัน (1 push message)
 * เรียกจาก time-based trigger
 */
function sendDailyDigest() {
  var today = _todayStr_();
  var props = PropertiesService.getScriptProperties();

  // Prevent duplicate digest
  if (props.getProperty(QUOTA_DIGEST_SENT_KEY) === today) {
    Logger.log('[Digest] Already sent today: ' + today);
    return { success: true, skipped: true, reason: 'Already sent today' };
  }

  var queue   = getAlertQueue();
  var summary = _getCachedSummary_() || _fetchSummaryData_();
  var token   = getConfig('LINE_CHANNEL_ACCESS_TOKEN') || '';
  var toId    = getConfig('LINE_ADMIN_USER_ID') || 'U33d684ffb92560e0eafb0ce8fdf6d4b0';

  // Build digest flex message
  var digestFlex = _buildDailyDigestFlex_(summary, queue);

  var result = _linePush_(toId, [digestFlex], token);

  if (result && result.success !== false) {
    props.setProperty(QUOTA_DIGEST_SENT_KEY, today);
    // Reset push count for new day
    props.setProperty(QUOTA_PUSH_COUNT_KEY, '0');
    props.setProperty(QUOTA_PUSH_DATE_KEY, today);
    // Clear old alerts
    var unnotified = queue.filter(function(a) { return !a.notified; });
    markAlertsNotified(unnotified.map(function(a) { return a.id; }));
    Logger.log('[Digest] Sent successfully. Alerts included: ' + queue.length);
  }

  return {
    success:      true,
    result:       result,
    alertCount:   queue.length,
    digestDate:   today
  };
}

/**
 * setupDailyDigestTrigger()
 * ตั้ง time-based trigger สำหรับ sendDailyDigest ทุกวัน 08:00
 * เรียกครั้งเดียวจาก GAS Script Editor
 */
function setupDailyDigestTrigger() {
  // Remove existing triggers for sendDailyDigest
  var triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(function(t) {
    if (t.getHandlerFunction() === 'sendDailyDigest') {
      ScriptApp.deleteTrigger(t);
    }
  });

  // Create new daily trigger at 08:00
  ScriptApp.newTrigger('sendDailyDigest')
    .timeBased()
    .everyDays(1)
    .atHour(QUOTA_DIGEST_HOUR)
    .create();

  Logger.log('[Digest] Daily trigger set at ' + QUOTA_DIGEST_HOUR + ':00');
  return { success: true, message: 'Daily digest trigger set at ' + QUOTA_DIGEST_HOUR + ':00' };
}

// ─────────────────────────────────────────────────────────────
// PHASE 5 — CACHE
// cache summary response ลด GAS API calls
// ─────────────────────────────────────────────────────────────

/**
 * getCachedResponse(key)
 * ดึง cached response ถ้ายังไม่ expired
 */
function getCachedResponse(key) {
  var cache = CacheService.getScriptCache();
  var raw   = cache.get(QUOTA_CACHE_PREFIX + key);
  if (!raw) return null;
  try {
    var entry = JSON.parse(raw);
    return entry.data;
  } catch(e) {
    return null;
  }
}

/**
 * setCachedResponse(key, data, ttlSec)
 * เก็บ response ใน cache
 */
function setCachedResponse(key, data, ttlSec) {
  var cache = CacheService.getScriptCache();
  var entry = { data: data, ts: new Date().toISOString() };
  cache.put(QUOTA_CACHE_PREFIX + key, JSON.stringify(entry), ttlSec || QUOTA_CACHE_TTL_SEC);
  return { success: true, key: key, ttl: ttlSec || QUOTA_CACHE_TTL_SEC };
}

/**
 * invalidateCache(key)
 * ลบ cache entry
 */
function invalidateCache(key) {
  CacheService.getScriptCache().remove(QUOTA_CACHE_PREFIX + key);
  return { success: true, invalidated: key };
}

/**
 * getQuotaStatus()
 * ดูสถานะ quota ปัจจุบัน
 */
function getQuotaStatus() {
  var remaining = _getRemainingPushToday_();
  var queue     = getAlertQueue();
  var unnotified = queue.filter(function(a) { return !a.notified; });

  return {
    success:          true,
    pushUsedToday:    QUOTA_MAX_PUSH_PER_DAY - remaining,
    pushRemainingToday: remaining,
    maxPushPerDay:    QUOTA_MAX_PUSH_PER_DAY,
    queueSize:        queue.length,
    unnotifiedAlerts: unnotified.length,
    digestSentToday:  PropertiesService.getScriptProperties().getProperty(QUOTA_DIGEST_SENT_KEY) === _todayStr_(),
    cacheTtlSec:      QUOTA_CACHE_TTL_SEC
  };
}

// ─────────────────────────────────────────────────────────────
// PRIVATE HELPERS
// ─────────────────────────────────────────────────────────────

function _getSeverity_(alertType, data) {
  // critical: SLA < 60%, Health < 50%, Error > 20%, Latency > 15s
  var v = Number((data || {}).value || 0);
  if (alertType === 'SLA_LOW'     && v < 60)    return 'critical';
  if (alertType === 'HEALTH_LOW'  && v < 50)    return 'critical';
  if (alertType === 'ERROR_SPIKE' && v > 20)    return 'critical';
  if (alertType === 'LATENCY_HIGH'&& v > 15000) return 'critical';
  return 'warning';
}

function _getRemainingPushToday_() {
  var props   = PropertiesService.getScriptProperties();
  var today   = _todayStr_();
  var savedDate = props.getProperty(QUOTA_PUSH_DATE_KEY);

  // Reset count if new day
  if (savedDate !== today) {
    props.setProperty(QUOTA_PUSH_COUNT_KEY, '0');
    props.setProperty(QUOTA_PUSH_DATE_KEY, today);
    return QUOTA_MAX_PUSH_PER_DAY;
  }

  var count = parseInt(props.getProperty(QUOTA_PUSH_COUNT_KEY) || '0', 10);
  return Math.max(0, QUOTA_MAX_PUSH_PER_DAY - count);
}

function _incrementPushCount_() {
  var props = PropertiesService.getScriptProperties();
  var today = _todayStr_();
  props.setProperty(QUOTA_PUSH_DATE_KEY, today);
  var count = parseInt(props.getProperty(QUOTA_PUSH_COUNT_KEY) || '0', 10);
  props.setProperty(QUOTA_PUSH_COUNT_KEY, String(count + 1));
}

function _isDuplicateAlert_(alertType) {
  var props   = PropertiesService.getScriptProperties();
  var key     = 'LINE_LAST_ALERT_' + alertType;
  var lastStr = props.getProperty(key);
  if (!lastStr) return false;
  var last    = new Date(lastStr);
  var now     = new Date();
  var diffMin = (now - last) / 60000;
  return diffMin < 30; // suppress if same alert within 30 min
}

function _recordAlertSent_(alertType) {
  var props = PropertiesService.getScriptProperties();
  safeSetProperty('LINE_LAST_ALERT_' + alertType, new Date().toISOString());  // Guard: dynamic key
}

function _todayStr_() {
  var d = new Date();
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
}

function _getCachedSummary_() {
  return getCachedResponse('SUMMARY');
}

function _cacheSummary_(data) {
  setCachedResponse('SUMMARY', data, QUOTA_CACHE_TTL_SEC);
}

function _fetchSummaryData_() {
  // Try to get live data from GAS functions
  try {
    var dashboard = getExecutiveDashboard ? getExecutiveDashboard() : null;
    if (dashboard && dashboard.success) {
      return dashboard.data || dashboard;
    }
  } catch(e) {
    Logger.log('[QuotaCache] fetchSummaryData error: ' + e.message);
  }
  // Fallback placeholder
  return {
    revenue:     { today: 0, week: 0, month: 0 },
    totalJobs:   0,
    overdueJobs: 0,
    sla:         0,
    lowStock:    0,
    healthScore: 0
  };
}

/**
 * _buildDailyDigestFlex_(summary, queue)
 * สร้าง Flex Message สำหรับ Daily Digest
 */
function _buildDailyDigestFlex_(summary, queue) {
  summary = summary || {};
  queue   = queue   || [];

  var criticalAlerts = queue.filter(function(a) {
    return _getSeverity_(a.type, a.data) === 'critical';
  });
  var warningAlerts  = queue.filter(function(a) {
    return _getSeverity_(a.type, a.data) === 'warning';
  });

  var today = _todayStr_();
  var rows  = [];

  // Summary rows
  rows.push(_flexRowV2_('📅 วันที่', today));
  rows.push(_flexSepV2_());
  if (summary.revenue && summary.revenue.today !== undefined) {
    rows.push(_flexRowV2_('💰 รายรับวันนี้', '฿' + Number(summary.revenue.today || 0).toLocaleString()));
  }
  if (summary.totalJobs !== undefined) {
    rows.push(_flexRowV2_('🔧 งานทั้งหมด', String(summary.totalJobs || 0) + ' งาน'));
  }
  if (summary.overdueJobs !== undefined) {
    rows.push(_flexRowV2_('⏰ งานค้าง', String(summary.overdueJobs || 0) + ' งาน'));
  }
  if (summary.sla !== undefined) {
    var slaColor = Number(summary.sla) >= 80 ? '#27AE60' : '#E74C3C';
    rows.push({
      type: 'box', layout: 'horizontal',
      contents: [
        { type: 'text', text: '📊 SLA', size: 'sm', color: '#7f8c8d', flex: 0 },
        { type: 'text', text: summary.sla + '%', size: 'sm', color: slaColor, align: 'end', weight: 'bold' }
      ]
    });
  }
  if (summary.healthScore !== undefined) {
    var hColor = Number(summary.healthScore) >= 70 ? '#27AE60' : '#E74C3C';
    rows.push({
      type: 'box', layout: 'horizontal',
      contents: [
        { type: 'text', text: '💚 Health', size: 'sm', color: '#7f8c8d', flex: 0 },
        { type: 'text', text: summary.healthScore + '%', size: 'sm', color: hColor, align: 'end', weight: 'bold' }
      ]
    });
  }

  rows.push(_flexSepV2_());

  // Alert summary
  var alertText = criticalAlerts.length > 0
    ? '🔴 Critical: ' + criticalAlerts.length + '  ⚠️ Warning: ' + warningAlerts.length
    : warningAlerts.length > 0
      ? '⚠️ Warning: ' + warningAlerts.length + '  ✅ ไม่มี Critical'
      : '✅ ไม่มีการแจ้งเตือน';

  rows.push({
    type: 'text', text: alertText,
    size: 'sm', color: criticalAlerts.length > 0 ? '#E74C3C' : '#27AE60',
    wrap: true
  });

  var headerColor = criticalAlerts.length > 0 ? '#C0392B' : '#2C3E50';

  return {
    type: 'flex',
    altText: '📋 Daily Digest ' + today + ' | ' + alertText,
    contents: {
      type: 'bubble',
      header: {
        type: 'box', layout: 'vertical',
        backgroundColor: headerColor,
        paddingAll: '15px',
        contents: [
          { type: 'text', text: '📋 Daily Digest', color: '#FFFFFF', weight: 'bold', size: 'lg' },
          { type: 'text', text: today, color: '#BDC3C7', size: 'xs' }
        ]
      },
      body: {
        type: 'box', layout: 'vertical', spacing: 'sm',
        contents: rows
      },
      footer: {
        type: 'box', layout: 'horizontal', spacing: 'sm',
        contents: [
          {
            type: 'button', style: 'primary', height: 'sm',
            action: { type: 'message', label: '#แจ้งเตือน', text: '#แจ้งเตือน' }
          },
          {
            type: 'button', style: 'secondary', height: 'sm',
            action: { type: 'message', label: '#สรุป', text: '#สรุป' }
          }
        ]
      }
    }
  };
}
