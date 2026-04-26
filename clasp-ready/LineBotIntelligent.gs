// ============================================================
// COMPHONE SUPER APP v5.9.0-phase2d
// LineBotIntelligent.gs — Intelligent Notification System
// Version: 1.0.0
// Features: Priority Queue, Alert TTL, User Targeting,
//           Acknowledge System, Alert Grouping, Analytics
// ============================================================

// ─────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────
var INTEL_QUEUE_KEY       = 'INTEL_ALERT_QUEUE';
var INTEL_ANALYTICS_KEY   = 'INTEL_ANALYTICS';
var INTEL_ACK_KEY_PREFIX  = 'INTEL_ACK_';
var INTEL_DEFAULT_TTL_MIN = 120;   // alert expires after 2 hours by default
var INTEL_CRITICAL_TTL_MIN= 1440;  // critical alerts expire after 24 hours

// Priority levels (lower number = higher priority)
var INTEL_PRIORITY = {
  CRITICAL: 1,
  HIGH:     2,
  MEDIUM:   3,
  LOW:      4,
  INFO:     5
};

// Role → alert type mapping
var INTEL_ROLE_ALERT_MAP = {
  admin:   ['SLA_LOW', 'HEALTH_LOW', 'ERROR_SPIKE', 'LATENCY_HIGH', 'STOCK_LOW', 'OVERDUE_JOBS'],
  manager: ['SLA_LOW', 'HEALTH_LOW', 'OVERDUE_JOBS', 'STOCK_LOW'],
  tech:    ['OVERDUE_JOBS'],
  finance: ['BILLING_OVERDUE', 'REVENUE_DROP']
};

// ─────────────────────────────────────────────────────────────
// PHASE 1 — PRIORITY QUEUE
// เพิ่ม priority field + sort ก่อนส่ง
// ─────────────────────────────────────────────────────────────

/**
 * queueAlertIntelligent(alertType, data, options)
 * เพิ่ม alert เข้า intelligent queue พร้อม priority, TTL, targeting
 * @param {string} alertType - 'SLA_LOW' | 'HEALTH_LOW' | 'ERROR_SPIKE' | ...
 * @param {Object} data      - { value, threshold, detail, jobId, ... }
 * @param {Object} options   - { priority, ttlMin, targetRoles, targetUsers, groupKey }
 * @returns {Object} { success, queued, queueSize, entry }
 */
function queueAlertIntelligent(alertType, data, options) {
  options = options || {};
  var props = PropertiesService.getScriptProperties();
  var queue = _getIntelQueue_();

  var severity = _getIntelSeverity_(alertType, data);
  var priority = options.priority || _getPriorityFromSeverity_(severity);
  var ttlMin   = options.ttlMin   || (severity === 'critical' ? INTEL_CRITICAL_TTL_MIN : INTEL_DEFAULT_TTL_MIN);
  var now      = new Date();
  var expireAt = new Date(now.getTime() + ttlMin * 60 * 1000).toISOString();

  var entry = {
    id:          Utilities.getUuid(),
    type:        alertType,
    data:        data || {},
    ts:          now.toISOString(),
    expireAt:    expireAt,
    ttlMin:      ttlMin,
    severity:    severity,
    priority:    priority,
    targetRoles: options.targetRoles || _getDefaultRolesForAlert_(alertType),
    targetUsers: options.targetUsers || [],
    groupKey:    options.groupKey    || alertType,
    notified:    false,
    acknowledged: false,
    ackBy:       null,
    ackAt:       null
  };

  // Auto-expire old alerts before adding
  queue = _expireAlerts_(queue);

  // Check for grouping — merge with existing same groupKey
  var grouped = _tryGroupAlert_(queue, entry);
  if (grouped.merged) {
    props.setProperty(INTEL_QUEUE_KEY, JSON.stringify(grouped.queue));
    _recordAnalytics_('queue', { alertType: alertType, action: 'grouped', priority: priority });
    return { success: true, queued: true, grouped: true, queueSize: grouped.queue.length, entry: grouped.mergedEntry };
  }

  queue.push(entry);

  // Keep max 100 entries, sorted by priority
  queue = _sortByPriority_(queue);
  if (queue.length > 100) queue = queue.slice(0, 100);

  props.setProperty(INTEL_QUEUE_KEY, JSON.stringify(queue));
  _recordAnalytics_('queue', { alertType: alertType, action: 'added', priority: priority, severity: severity });

  Logger.log('[IntelQueue] Queued: ' + alertType + ' P' + priority + ' (size: ' + queue.length + ')');
  return { success: true, queued: true, grouped: false, queueSize: queue.length, entry: entry };
}

/**
 * getIntelAlertQueue(options)
 * ดึง alert queue พร้อม filter และ sort
 * @param {Object} options - { role, userId, severity, includeExpired, includeAcknowledged }
 */
function getIntelAlertQueue(options) {
  options = options || {};
  var queue = _getIntelQueue_();

  // Auto-expire
  queue = _expireAlerts_(queue);
  _saveIntelQueue_(queue);

  // Filter
  var filtered = queue.filter(function(a) {
    if (!options.includeExpired    && a.expired)      return false;
    if (!options.includeAcknowledged && a.acknowledged) return false;
    if (options.severity && a.severity !== options.severity) return false;
    if (options.role     && !_isAlertForRole_(a, options.role)) return false;
    if (options.userId   && !_isAlertForUser_(a, options.userId)) return false;
    return true;
  });

  // Sort by priority
  filtered = _sortByPriority_(filtered);

  return {
    success:  true,
    alerts:   filtered,
    total:    filtered.length,
    expired:  queue.filter(function(a) { return a.expired; }).length,
    acknowledged: queue.filter(function(a) { return a.acknowledged; }).length
  };
}

/**
 * getPrioritizedAlerts(role, userId)
 * ดึง alerts ที่ filter ตาม role/user และ sort ตาม priority
 */
function getPrioritizedAlerts(role, userId) {
  return getIntelAlertQueue({ role: role, userId: userId });
}

// ─────────────────────────────────────────────────────────────
// PHASE 2 — ALERT TTL
// auto expire alert + ลบ alert เก่า
// ─────────────────────────────────────────────────────────────

/**
 * expireOldAlerts()
 * ลบ alerts ที่หมดอายุแล้ว
 * เรียกจาก time-based trigger หรือ manual
 */
function expireOldAlerts() {
  var queue  = _getIntelQueue_();
  var before = queue.length;
  queue = _expireAlerts_(queue);
  var expired = queue.filter(function(a) { return a.expired; }).length;

  // Remove expired from active queue (keep for analytics)
  var active  = queue.filter(function(a) { return !a.expired; });
  _saveIntelQueue_(active);

  _recordAnalytics_('expire', { removed: before - active.length, expired: expired });

  return {
    success:        true,
    before:         before,
    after:          active.length,
    expiredRemoved: before - active.length
  };
}

/**
 * setAlertTTL(alertId, ttlMin)
 * เปลี่ยน TTL ของ alert ที่มีอยู่แล้ว
 */
function setAlertTTL(alertId, ttlMin) {
  var queue = _getIntelQueue_();
  var found = false;
  queue.forEach(function(a) {
    if (a.id === alertId) {
      var newExpire = new Date(new Date().getTime() + ttlMin * 60 * 1000).toISOString();
      a.expireAt = newExpire;
      a.ttlMin   = ttlMin;
      a.expired  = false;
      found = true;
    }
  });
  if (found) _saveIntelQueue_(queue);
  return { success: found, alertId: alertId, ttlMin: ttlMin };
}

// ─────────────────────────────────────────────────────────────
// PHASE 3 — USER TARGETING
// map alert → role/user + filter ตอน pull
// ─────────────────────────────────────────────────────────────

/**
 * getAlertsForRole(role)
 * ดึง alerts ที่ target ไปยัง role นี้
 */
function getAlertsForRole(role) {
  return getIntelAlertQueue({ role: role });
}

/**
 * getAlertsForUser(userId)
 * ดึง alerts ที่ target ไปยัง userId นี้
 */
function getAlertsForUser(userId) {
  return getIntelAlertQueue({ userId: userId });
}

/**
 * handlePullCommandIntelligent(replyToken, lineUserId)
 * เมื่อ user พิมพ์ #แจ้งเตือน → reply ด้วย alerts ที่ filter ตาม role/user
 */
function handlePullCommandIntelligent(replyToken, lineUserId) {
  var token      = getConfig('LINE_CHANNEL_ACCESS_TOKEN') || '';
  var systemUser = getSystemUserFromLine ? getSystemUserFromLine(lineUserId) : null;
  var role       = systemUser ? (systemUser.role || 'tech') : 'tech';

  var result = getIntelAlertQueue({ role: role, userId: lineUserId });
  var alerts = result.alerts || [];

  if (alerts.length === 0) {
    var clearMsg = {
      type: 'flex', altText: '✅ ไม่มีการแจ้งเตือน',
      contents: {
        type: 'bubble', size: 'kilo',
        body: {
          type: 'box', layout: 'vertical', spacing: 'sm',
          contents: [
            { type: 'text', text: '✅ ไม่มีการแจ้งเตือน', weight: 'bold', color: '#27AE60', size: 'md' },
            { type: 'text', text: 'ระบบทำงานปกติ สำหรับ role: ' + role, color: '#7f8c8d', size: 'sm', wrap: true }
          ]
        }
      }
    };
    return _lineReply_(replyToken, [clearMsg], token);
  }

  // Build prioritized flex messages (max 10)
  var recent  = alerts.slice(0, 10);
  var bubbles = recent.map(function(alert) {
    return _buildIntelAlertFlex_(alert);
  });

  // Mark as notified
  var ids = recent.map(function(a) { return a.id; });
  _markNotified_(ids);
  _recordAnalytics_('pull', { role: role, count: recent.length });

  var msg;
  if (bubbles.length === 1) {
    msg = bubbles[0];
  } else {
    msg = {
      type: 'flex',
      altText: '⚠️ มี ' + bubbles.length + ' การแจ้งเตือน (role: ' + role + ')',
      contents: { type: 'carousel', contents: bubbles.map(function(b) { return b.contents; }) }
    };
  }

  return _lineReply_(replyToken, [msg], token);
}

// ─────────────────────────────────────────────────────────────
// PHASE 4 — ACKNOWLEDGE SYSTEM
// user กด "รับทราบ" → alert หายจาก queue
// ─────────────────────────────────────────────────────────────

/**
 * acknowledgeAlert(alertId, lineUserId)
 * mark alert ว่า acknowledged แล้ว
 * @returns {Object} { success, alertId, ackBy, ackAt }
 */
function acknowledgeAlert(alertId, lineUserId) {
  var queue = _getIntelQueue_();
  var found = null;

  queue.forEach(function(a) {
    if (a.id === alertId && !a.acknowledged) {
      a.acknowledged = true;
      a.ackBy        = lineUserId || 'unknown';
      a.ackAt        = new Date().toISOString();
      found = a;
    }
  });

  if (found) {
    _saveIntelQueue_(queue);
    _recordAnalytics_('acknowledge', { alertType: found.type, ackBy: found.ackBy });
    Logger.log('[IntelAck] Alert acknowledged: ' + alertId + ' by ' + lineUserId);
  }

  return {
    success: !!found,
    alertId: alertId,
    ackBy:   found ? found.ackBy : null,
    ackAt:   found ? found.ackAt : null,
    message: found ? 'รับทราบแล้ว ✅' : 'ไม่พบ alert นี้'
  };
}

/**
 * handleAcknowledgePostback(replyToken, alertId, lineUserId)
 * จัดการ postback เมื่อ user กด "รับทราบ" ใน Flex Message
 */
function handleAcknowledgePostback(replyToken, alertId, lineUserId) {
  var token  = getConfig('LINE_CHANNEL_ACCESS_TOKEN') || '';
  var result = acknowledgeAlert(alertId, lineUserId);

  var replyMsg = {
    type: 'flex', altText: result.success ? '✅ รับทราบแล้ว' : '❌ ไม่พบ alert',
    contents: {
      type: 'bubble', size: 'kilo',
      body: {
        type: 'box', layout: 'vertical', spacing: 'sm',
        contents: [
          {
            type: 'text',
            text: result.success ? '✅ รับทราบแล้ว' : '❌ ไม่พบ alert',
            weight: 'bold',
            color: result.success ? '#27AE60' : '#E74C3C',
            size: 'md'
          },
          {
            type: 'text',
            text: result.success
              ? 'บันทึกเวลา: ' + (result.ackAt || '').substring(0, 19).replace('T', ' ')
              : 'Alert ID: ' + alertId,
            color: '#7f8c8d', size: 'sm', wrap: true
          }
        ]
      }
    }
  };

  return _lineReply_(replyToken, [replyMsg], token);
}

/**
 * bulkAcknowledge(alertIds, lineUserId)
 * รับทราบหลาย alerts พร้อมกัน
 */
function bulkAcknowledge(alertIds, lineUserId) {
  var results = (alertIds || []).map(function(id) {
    return acknowledgeAlert(id, lineUserId);
  });
  var successCount = results.filter(function(r) { return r.success; }).length;
  return { success: true, acknowledged: successCount, total: alertIds.length };
}

// ─────────────────────────────────────────────────────────────
// PHASE 5 — ALERT GROUPING
// รวม alert ซ้ำ เช่น SLA ต่ำ 5 งาน → 1 message
// ─────────────────────────────────────────────────────────────

/**
 * getGroupedAlerts(options)
 * ดึง alerts แบบ grouped ตาม groupKey
 * @returns {Object} { success, groups: [{groupKey, count, alerts, worstSeverity, latestTs}] }
 */
function getGroupedAlerts(options) {
  options = options || {};
  var result = getIntelAlertQueue(options);
  var alerts = result.alerts || [];

  // Group by groupKey
  var groups = {};
  alerts.forEach(function(a) {
    var key = a.groupKey || a.type;
    if (!groups[key]) {
      groups[key] = {
        groupKey:      key,
        alertType:     a.type,
        count:         0,
        alerts:        [],
        worstSeverity: 'info',
        worstPriority: INTEL_PRIORITY.INFO,
        latestTs:      a.ts,
        values:        []
      };
    }
    var g = groups[key];
    g.count++;
    g.alerts.push(a);
    if (a.priority < g.worstPriority) {
      g.worstPriority = a.priority;
      g.worstSeverity = a.severity;
    }
    if (a.ts > g.latestTs) g.latestTs = a.ts;
    if (a.data && a.data.value !== undefined) g.values.push(Number(a.data.value));
  });

  // Compute summary stats per group
  var groupList = Object.keys(groups).map(function(key) {
    var g = groups[key];
    if (g.values.length > 0) {
      g.minValue = Math.min.apply(null, g.values);
      g.maxValue = Math.max.apply(null, g.values);
      g.avgValue = Math.round(g.values.reduce(function(s, v) { return s + v; }, 0) / g.values.length * 10) / 10;
    }
    return g;
  });

  // Sort groups by worstPriority
  groupList.sort(function(a, b) { return a.worstPriority - b.worstPriority; });

  return {
    success:    true,
    groups:     groupList,
    totalAlerts: alerts.length,
    groupCount: groupList.length
  };
}

/**
 * buildGroupedFlexMessage(groupKey, options)
 * สร้าง Flex Message สำหรับ grouped alerts
 */
function buildGroupedFlexMessage(groupKey, options) {
  var result = getGroupedAlerts(options);
  var group  = (result.groups || []).find(function(g) { return g.groupKey === groupKey; });

  if (!group) {
    return { type: 'text', text: 'ไม่พบ group: ' + groupKey };
  }

  var headerColor = group.worstSeverity === 'critical' ? '#C0392B' : '#E67E22';
  var icon        = group.worstSeverity === 'critical' ? '🔴' : '⚠️';

  var rows = [
    { type: 'box', layout: 'horizontal', contents: [
      { type: 'text', text: 'จำนวน alerts', size: 'sm', color: '#7f8c8d', flex: 0 },
      { type: 'text', text: String(group.count) + ' รายการ', size: 'sm', color: '#2C3E50', align: 'end', weight: 'bold' }
    ]},
    { type: 'box', layout: 'horizontal', contents: [
      { type: 'text', text: 'Severity', size: 'sm', color: '#7f8c8d', flex: 0 },
      { type: 'text', text: group.worstSeverity.toUpperCase(), size: 'sm',
        color: group.worstSeverity === 'critical' ? '#E74C3C' : '#E67E22', align: 'end', weight: 'bold' }
    ]}
  ];

  if (group.minValue !== undefined) {
    rows.push({ type: 'box', layout: 'horizontal', contents: [
      { type: 'text', text: 'ค่า Min/Avg/Max', size: 'sm', color: '#7f8c8d', flex: 0 },
      { type: 'text', text: group.minValue + ' / ' + group.avgValue + ' / ' + group.maxValue,
        size: 'sm', color: '#2C3E50', align: 'end' }
    ]});
  }

  rows.push({ type: 'separator' });
  rows.push({ type: 'text', text: 'ล่าสุด: ' + (group.latestTs || '').substring(0, 19).replace('T', ' '),
    size: 'xs', color: '#95a5a6', wrap: true });

  // Acknowledge all button
  var ackAllIds = group.alerts.map(function(a) { return a.id; }).join(',');

  return {
    type: 'flex',
    altText: icon + ' ' + group.groupKey + ': ' + group.count + ' alerts',
    contents: {
      type: 'bubble',
      header: {
        type: 'box', layout: 'vertical', backgroundColor: headerColor, paddingAll: '12px',
        contents: [
          { type: 'text', text: icon + ' ' + group.groupKey, color: '#FFFFFF', weight: 'bold', size: 'md' },
          { type: 'text', text: group.count + ' alerts รวมกัน', color: '#BDC3C7', size: 'xs' }
        ]
      },
      body: { type: 'box', layout: 'vertical', spacing: 'sm', contents: rows },
      footer: {
        type: 'box', layout: 'horizontal', spacing: 'sm',
        contents: [{
          type: 'button', style: 'primary', height: 'sm',
          action: { type: 'postback', label: '✅ รับทราบทั้งหมด',
            data: 'action=bulkAck&ids=' + ackAllIds }
        }]
      }
    }
  };
}

// ─────────────────────────────────────────────────────────────
// PHASE 6 — ANALYTICS
// นับ alert per day, push vs pull, quota usage
// ─────────────────────────────────────────────────────────────

/**
 * getAlertAnalytics(days)
 * ดู analytics ย้อนหลัง N วัน
 * @param {number} days - จำนวนวันย้อนหลัง (default 7)
 */
function getAlertAnalytics(days) {
  days = days || 7;
  var props = PropertiesService.getScriptProperties();
  var raw   = props.getProperty(INTEL_ANALYTICS_KEY) || '[]';
  var all;
  try { all = JSON.parse(raw); } catch(e) { all = []; }

  var cutoff = new Date(new Date().getTime() - days * 24 * 60 * 60 * 1000).toISOString();
  var recent = all.filter(function(e) { return e.ts >= cutoff; });

  // Aggregate by day
  var byDay = {};
  recent.forEach(function(e) {
    var day = e.ts.substring(0, 10);
    if (!byDay[day]) byDay[day] = { date: day, queued: 0, pushed: 0, pulled: 0, acknowledged: 0, expired: 0, grouped: 0 };
    if (e.action === 'queue' || e.action === 'added') byDay[day].queued++;
    if (e.action === 'push')                          byDay[day].pushed++;
    if (e.action === 'pull')                          byDay[day].pulled += (e.count || 1);
    if (e.action === 'acknowledge')                   byDay[day].acknowledged++;
    if (e.action === 'expire')                        byDay[day].expired += (e.removed || 0);
    if (e.action === 'grouped')                       byDay[day].grouped++;
  });

  var days_list = Object.keys(byDay).sort().map(function(d) { return byDay[d]; });

  // Totals
  var totals = days_list.reduce(function(acc, d) {
    acc.queued       += d.queued;
    acc.pushed       += d.pushed;
    acc.pulled       += d.pulled;
    acc.acknowledged += d.acknowledged;
    acc.expired      += d.expired;
    acc.grouped      += d.grouped;
    return acc;
  }, { queued: 0, pushed: 0, pulled: 0, acknowledged: 0, expired: 0, grouped: 0 });

  // Alert type breakdown
  var byType = {};
  recent.filter(function(e) { return e.alertType; }).forEach(function(e) {
    byType[e.alertType] = (byType[e.alertType] || 0) + 1;
  });

  // Quota usage estimate
  var quotaStatus = getQuotaStatus ? getQuotaStatus() : {};
  var pushUsedToday = quotaStatus.pushUsedToday || 0;
  var pushRemaining = quotaStatus.pushRemainingToday || 5;

  return {
    success:       true,
    period:        days + ' days',
    byDay:         days_list,
    totals:        totals,
    byType:        byType,
    quotaStatus: {
      pushUsedToday:      pushUsedToday,
      pushRemainingToday: pushRemaining,
      maxPushPerDay:      5,
      pullRatio:          totals.queued > 0
        ? Math.round(totals.pulled / totals.queued * 100) + '%'
        : '0%',
      ackRate:            totals.queued > 0
        ? Math.round(totals.acknowledged / totals.queued * 100) + '%'
        : '0%'
    },
    recommendations: _getAnalyticsRecommendations_(totals, byType)
  };
}

/**
 * buildAnalyticsFlexMessage(days)
 * สร้าง Flex Message สรุป analytics
 */
function buildAnalyticsFlexMessage(days) {
  days = days || 7;
  var data = getAlertAnalytics(days);

  var rows = [
    { type: 'box', layout: 'horizontal', contents: [
      { type: 'text', text: '📥 Queued', size: 'sm', color: '#7f8c8d', flex: 0 },
      { type: 'text', text: String(data.totals.queued), size: 'sm', color: '#2C3E50', align: 'end', weight: 'bold' }
    ]},
    { type: 'box', layout: 'horizontal', contents: [
      { type: 'text', text: '📤 Pushed', size: 'sm', color: '#7f8c8d', flex: 0 },
      { type: 'text', text: String(data.totals.pushed), size: 'sm', color: '#E74C3C', align: 'end', weight: 'bold' }
    ]},
    { type: 'box', layout: 'horizontal', contents: [
      { type: 'text', text: '📲 Pulled', size: 'sm', color: '#7f8c8d', flex: 0 },
      { type: 'text', text: String(data.totals.pulled), size: 'sm', color: '#27AE60', align: 'end', weight: 'bold' }
    ]},
    { type: 'box', layout: 'horizontal', contents: [
      { type: 'text', text: '✅ Acknowledged', size: 'sm', color: '#7f8c8d', flex: 0 },
      { type: 'text', text: String(data.totals.acknowledged), size: 'sm', color: '#2980B9', align: 'end', weight: 'bold' }
    ]},
    { type: 'separator' },
    { type: 'box', layout: 'horizontal', contents: [
      { type: 'text', text: '📊 Pull Ratio', size: 'sm', color: '#7f8c8d', flex: 0 },
      { type: 'text', text: data.quotaStatus.pullRatio, size: 'sm', color: '#27AE60', align: 'end', weight: 'bold' }
    ]},
    { type: 'box', layout: 'horizontal', contents: [
      { type: 'text', text: '✅ Ack Rate', size: 'sm', color: '#7f8c8d', flex: 0 },
      { type: 'text', text: data.quotaStatus.ackRate, size: 'sm', color: '#2980B9', align: 'end', weight: 'bold' }
    ]},
    { type: 'box', layout: 'horizontal', contents: [
      { type: 'text', text: '💬 Push Today', size: 'sm', color: '#7f8c8d', flex: 0 },
      { type: 'text', text: data.quotaStatus.pushUsedToday + '/' + data.quotaStatus.maxPushPerDay,
        size: 'sm', color: data.quotaStatus.pushUsedToday >= 4 ? '#E74C3C' : '#27AE60', align: 'end', weight: 'bold' }
    ]}
  ];

  // Top alert types
  var topTypes = Object.keys(data.byType).sort(function(a, b) { return data.byType[b] - data.byType[a]; }).slice(0, 3);
  if (topTypes.length > 0) {
    rows.push({ type: 'separator' });
    rows.push({ type: 'text', text: 'Top Alert Types:', size: 'xs', color: '#95a5a6' });
    topTypes.forEach(function(t) {
      rows.push({ type: 'box', layout: 'horizontal', contents: [
        { type: 'text', text: t, size: 'xs', color: '#7f8c8d', flex: 0 },
        { type: 'text', text: String(data.byType[t]), size: 'xs', color: '#2C3E50', align: 'end' }
      ]});
    });
  }

  return {
    type: 'flex',
    altText: '📊 Alert Analytics ' + days + ' วัน',
    contents: {
      type: 'bubble',
      header: {
        type: 'box', layout: 'vertical', backgroundColor: '#2C3E50', paddingAll: '12px',
        contents: [
          { type: 'text', text: '📊 Alert Analytics', color: '#FFFFFF', weight: 'bold', size: 'md' },
          { type: 'text', text: 'ย้อนหลัง ' + days + ' วัน', color: '#BDC3C7', size: 'xs' }
        ]
      },
      body: { type: 'box', layout: 'vertical', spacing: 'sm', contents: rows }
    }
  };
}

// ─────────────────────────────────────────────────────────────
// COMMAND HANDLER — #สถิติ #รับทราบทั้งหมด
// ─────────────────────────────────────────────────────────────

/**
 * handleIntelCommand(replyToken, command, lineUserId)
 * จัดการ commands ใหม่ที่เพิ่มมาจาก Intelligent System
 */
function handleIntelCommand(replyToken, command, lineUserId) {
  var token = getConfig('LINE_CHANNEL_ACCESS_TOKEN') || '';
  var cmd   = (command || '').trim().toLowerCase();

  if (cmd === '#สถิติ' || cmd === '#analytics' || cmd === '#วิเคราะห์') {
    var flex = buildAnalyticsFlexMessage(7);
    return _lineReply_(replyToken, [flex], token);
  }

  if (cmd === '#รับทราบทั้งหมด' || cmd === '#ackall') {
    var queue = _getIntelQueue_();
    var ids   = queue.filter(function(a) { return !a.acknowledged && !a.expired; }).map(function(a) { return a.id; });
    var result = bulkAcknowledge(ids, lineUserId);
    var msg = {
      type: 'flex', altText: '✅ รับทราบทั้งหมด ' + result.acknowledged + ' รายการ',
      contents: {
        type: 'bubble', size: 'kilo',
        body: {
          type: 'box', layout: 'vertical', spacing: 'sm',
          contents: [
            { type: 'text', text: '✅ รับทราบทั้งหมด', weight: 'bold', color: '#27AE60', size: 'md' },
            { type: 'text', text: result.acknowledged + ' รายการ ณ ' + new Date().toLocaleString('th-TH'),
              color: '#7f8c8d', size: 'sm', wrap: true }
          ]
        }
      }
    };
    return _lineReply_(replyToken, [msg], token);
  }

  if (cmd === '#กลุ่มแจ้งเตือน' || cmd === '#groups') {
    var grouped = getGroupedAlerts();
    if (grouped.groups.length === 0) {
      return _lineReply_(replyToken, [{ type: 'text', text: '✅ ไม่มีการแจ้งเตือนที่รอดำเนินการ' }], token);
    }
    var flexes = grouped.groups.slice(0, 5).map(function(g) {
      return buildGroupedFlexMessage(g.groupKey);
    });
    if (flexes.length === 1) {
      return _lineReply_(replyToken, [flexes[0]], token);
    }
    var carousel = {
      type: 'flex',
      altText: '📋 Alert Groups (' + grouped.groupCount + ' กลุ่ม)',
      contents: { type: 'carousel', contents: flexes.map(function(f) { return f.contents; }) }
    };
    return _lineReply_(replyToken, [carousel], token);
  }

  return null; // not handled
}

// ─────────────────────────────────────────────────────────────
// PRIVATE HELPERS
// ─────────────────────────────────────────────────────────────

function _getIntelQueue_() {
  var raw = PropertiesService.getScriptProperties().getProperty(INTEL_QUEUE_KEY) || '[]';
  try { return JSON.parse(raw); } catch(e) { return []; }
}

function _saveIntelQueue_(queue) {
  PropertiesService.getScriptProperties().setProperty(INTEL_QUEUE_KEY, JSON.stringify(queue));
}

function _expireAlerts_(queue) {
  var now = new Date().toISOString();
  return queue.map(function(a) {
    if (!a.expired && a.expireAt && a.expireAt < now) {
      a.expired = true;
    }
    return a;
  });
}

function _sortByPriority_(queue) {
  return queue.slice().sort(function(a, b) {
    var pa = a.priority || INTEL_PRIORITY.INFO;
    var pb = b.priority || INTEL_PRIORITY.INFO;
    if (pa !== pb) return pa - pb;
    // Same priority → newer first
    return (b.ts || '') > (a.ts || '') ? 1 : -1;
  });
}

function _tryGroupAlert_(queue, newEntry) {
  var groupKey = newEntry.groupKey || newEntry.type;
  // Find existing unacknowledged, unexpired alert with same groupKey
  var existing = null;
  for (var i = 0; i < queue.length; i++) {
    if (queue[i].groupKey === groupKey && !queue[i].acknowledged && !queue[i].expired) {
      existing = queue[i];
      break;
    }
  }
  if (!existing) return { merged: false, queue: queue };

  // Merge: update count, worst value, latest ts
  existing.groupCount = (existing.groupCount || 1) + 1;
  existing.ts         = newEntry.ts; // update to latest
  existing.expireAt   = newEntry.expireAt; // extend TTL
  existing.notified   = false; // re-notify

  // Update data with worst value
  if (newEntry.data && newEntry.data.value !== undefined) {
    var oldVal = Number(existing.data.value || 0);
    var newVal = Number(newEntry.data.value || 0);
    // For SLA/Health: lower is worse; for Error/Latency: higher is worse
    var lowerIsBad = ['SLA_LOW', 'HEALTH_LOW'].indexOf(existing.type) >= 0;
    existing.data.value = lowerIsBad ? Math.min(oldVal, newVal) : Math.max(oldVal, newVal);
    existing.data.detail = 'รวม ' + existing.groupCount + ' รายการ — ค่าแย่สุด: ' + existing.data.value;
  }

  // Update priority if new one is higher
  if (newEntry.priority < existing.priority) {
    existing.priority = newEntry.priority;
    existing.severity = newEntry.severity;
  }

  return { merged: true, queue: queue, mergedEntry: existing };
}

function _getIntelSeverity_(alertType, data) {
  var v = Number((data || {}).value || 0);
  if (alertType === 'SLA_LOW'      && v < 60)    return 'critical';
  if (alertType === 'HEALTH_LOW'   && v < 50)    return 'critical';
  if (alertType === 'ERROR_SPIKE'  && v > 20)    return 'critical';
  if (alertType === 'LATENCY_HIGH' && v > 15000) return 'critical';
  if (alertType === 'SLA_LOW'      && v < 70)    return 'high';
  if (alertType === 'HEALTH_LOW'   && v < 60)    return 'high';
  if (alertType === 'ERROR_SPIKE'  && v > 10)    return 'high';
  return 'warning';
}

function _getPriorityFromSeverity_(severity) {
  var map = { critical: 1, high: 2, medium: 3, warning: 3, low: 4, info: 5 };
  return map[severity] || INTEL_PRIORITY.MEDIUM;
}

function _getDefaultRolesForAlert_(alertType) {
  var roles = [];
  Object.keys(INTEL_ROLE_ALERT_MAP).forEach(function(role) {
    if (INTEL_ROLE_ALERT_MAP[role].indexOf(alertType) >= 0) roles.push(role);
  });
  return roles.length > 0 ? roles : ['admin'];
}

function _isAlertForRole_(alert, role) {
  if (!role) return true;
  var targetRoles = alert.targetRoles || ['admin'];
  return targetRoles.indexOf(role) >= 0 || targetRoles.indexOf('all') >= 0;
}

function _isAlertForUser_(alert, userId) {
  if (!userId) return true;
  var targetUsers = alert.targetUsers || [];
  if (targetUsers.length === 0) return true; // no specific user targeting = all
  return targetUsers.indexOf(userId) >= 0;
}

function _markNotified_(ids) {
  var queue = _getIntelQueue_();
  var idSet = {};
  (ids || []).forEach(function(id) { idSet[id] = true; });
  queue.forEach(function(a) { if (idSet[a.id]) a.notified = true; });
  _saveIntelQueue_(queue);
}

function _recordAnalytics_(action, data) {
  try {
    var props = PropertiesService.getScriptProperties();
    var raw   = props.getProperty(INTEL_ANALYTICS_KEY) || '[]';
    var all;
    try { all = JSON.parse(raw); } catch(e) { all = []; }

    all.push({
      ts:        new Date().toISOString(),
      action:    action,
      alertType: (data || {}).alertType || null,
      priority:  (data || {}).priority  || null,
      severity:  (data || {}).severity  || null,
      count:     (data || {}).count     || null,
      removed:   (data || {}).removed   || null,
      ackBy:     (data || {}).ackBy     || null
    });

    // Keep max 1000 entries
    if (all.length > 1000) all = all.slice(all.length - 1000);
    props.setProperty(INTEL_ANALYTICS_KEY, JSON.stringify(all));
  } catch(e) {
    Logger.log('[Analytics] Error: ' + e.message);
  }
}

function _getAnalyticsRecommendations_(totals, byType) {
  var recs = [];
  if (totals.pushed > 10) recs.push('⚠️ Push count สูง — พิจารณาลด threshold หรือเพิ่ม dedup window');
  if (totals.acknowledged < totals.queued * 0.5) recs.push('📌 Ack rate ต่ำ — แนะนำให้ user ใช้ #รับทราบทั้งหมด');
  if (totals.grouped > totals.queued * 0.3) recs.push('✅ Grouping ทำงานดี — ลด noise ได้มาก');
  var topType = Object.keys(byType).sort(function(a, b) { return byType[b] - byType[a]; })[0];
  if (topType && byType[topType] > 5) recs.push('🔍 ' + topType + ' เกิดบ่อย — ตรวจสอบ root cause');
  return recs;
}

function _buildIntelAlertFlex_(alert) {
  var severity    = alert.severity || 'warning';
  var priority    = alert.priority || 3;
  var headerColor = severity === 'critical' ? '#C0392B' : (severity === 'high' ? '#E67E22' : '#F39C12');
  var icon        = severity === 'critical' ? '🔴' : (severity === 'high' ? '🟠' : '⚠️');
  var priorityLabel = ['', 'P1-CRITICAL', 'P2-HIGH', 'P3-MEDIUM', 'P4-LOW', 'P5-INFO'][priority] || 'P3';

  var rows = [
    { type: 'box', layout: 'horizontal', contents: [
      { type: 'text', text: 'Type', size: 'sm', color: '#7f8c8d', flex: 0 },
      { type: 'text', text: alert.type || '', size: 'sm', color: '#2C3E50', align: 'end', weight: 'bold' }
    ]},
    { type: 'box', layout: 'horizontal', contents: [
      { type: 'text', text: 'Priority', size: 'sm', color: '#7f8c8d', flex: 0 },
      { type: 'text', text: priorityLabel, size: 'sm', color: headerColor, align: 'end', weight: 'bold' }
    ]}
  ];

  if (alert.data && alert.data.value !== undefined) {
    rows.push({ type: 'box', layout: 'horizontal', contents: [
      { type: 'text', text: 'ค่า', size: 'sm', color: '#7f8c8d', flex: 0 },
      { type: 'text', text: String(alert.data.value) + (alert.data.threshold ? ' / เกณฑ์ ' + alert.data.threshold : ''),
        size: 'sm', color: headerColor, align: 'end', weight: 'bold' }
    ]});
  }

  if (alert.data && alert.data.detail) {
    rows.push({ type: 'separator' });
    rows.push({ type: 'text', text: alert.data.detail, size: 'xs', color: '#7f8c8d', wrap: true });
  }

  if (alert.groupCount && alert.groupCount > 1) {
    rows.push({ type: 'text', text: '📦 รวม ' + alert.groupCount + ' รายการ', size: 'xs', color: '#9B59B6', wrap: true });
  }

  var expireStr = alert.expireAt ? alert.expireAt.substring(0, 16).replace('T', ' ') : '';
  rows.push({ type: 'text', text: 'หมดอายุ: ' + expireStr, size: 'xs', color: '#BDC3C7', wrap: true });

  return {
    type: 'flex',
    altText: icon + ' ' + (alert.type || '') + ' [' + priorityLabel + ']',
    contents: {
      type: 'bubble',
      header: {
        type: 'box', layout: 'vertical', backgroundColor: headerColor, paddingAll: '10px',
        contents: [
          { type: 'text', text: icon + ' ' + (alert.type || ''), color: '#FFFFFF', weight: 'bold', size: 'sm' },
          { type: 'text', text: priorityLabel, color: '#FFEAA7', size: 'xs' }
        ]
      },
      body: { type: 'box', layout: 'vertical', spacing: 'sm', contents: rows },
      footer: {
        type: 'box', layout: 'horizontal', spacing: 'sm',
        contents: [{
          type: 'button', style: 'primary', height: 'sm',
          action: { type: 'postback', label: '✅ รับทราบ',
            data: 'action=ack&alertId=' + (alert.id || '') }
        }]
      }
    }
  };
}
