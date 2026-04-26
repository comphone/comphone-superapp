// ============================================================
// COMPHONE SUPER APP v5.9.0-phase2d
// LineBotV2.gs — Enterprise LINE Messaging API Integration
// Version: 2.0.0
// ============================================================
// Features:
//   Phase 2 — sendLineMessage() unified send function
//   Phase 3 — Alert System (SLA / Health / Error)
//   Phase 4 — User Mapping (userId ↔ system user)
//   Phase 5 — Alert triggers with push + reply
//   Phase 6 — Interactive Flex Messages + Quick Reply
//   Phase 7 — Command Handler (#สรุป #งาน #แจ้งเตือน #ช่วยเหลือ)
//   Phase 8 — HMAC-SHA256 Webhook Signature Verification
// ============================================================

// ─────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────
var LINE_API_BASE_V2 = 'https://api.line.me/v2/bot/message';

var LINE_ALERT_THRESHOLDS_V2 = {
  SLA_MIN:         80,   // % — alert ถ้า SLA ต่ำกว่า
  HEALTH_MIN:      70,   // % — alert ถ้า Health Score ต่ำกว่า
  ERROR_RATE_MAX:  10,   // % — alert ถ้า error rate สูงกว่า
  LATENCY_MAX_MS:  5000  // ms — alert ถ้า latency สูงกว่า
};

// ─────────────────────────────────────────────────────────────
// PHASE 2 — UNIFIED SEND FUNCTION
// ─────────────────────────────────────────────────────────────

/**
 * sendLineMessage(toId, message, options)
 * Unified function: push (ถ้ามี quota) หรือ reply (ถ้ามี replyToken)
 *
 * @param {string} toId         - userId หรือ groupId สำหรับ push
 * @param {string|Object} message - text string หรือ LINE message object
 * @param {Object} options      - { replyToken, type: 'push'|'reply'|'auto' }
 * @returns {Object} result
 */
function sendLineMessage(toId, message, options) {
  options = options || {};
  var token   = getConfig('LINE_CHANNEL_ACCESS_TOKEN') || '';
  var msgObj  = _normalizeMessageV2_(message);
  var mode    = options.type || 'auto';

  // auto: ถ้ามี replyToken ให้ใช้ reply (ฟรี), ไม่งั้นใช้ push
  if (mode === 'auto') {
    mode = options.replyToken ? 'reply' : 'push';
  }

  if (mode === 'reply' && options.replyToken) {
    return _lineReply_(options.replyToken, [msgObj], token);
  }
  return _linePush_(toId, [msgObj], token);
}

/**
 * sendLineAlert(alertType, data, options)
 * ส่ง alert ไปยัง Admin หรือ Group ที่กำหนด
 *
 * @param {string} alertType - 'SLA_LOW' | 'HEALTH_LOW' | 'ERROR_SPIKE' | 'LATENCY_HIGH' | 'CUSTOM'
 * @param {Object} data      - { value, threshold, detail }
 * @param {Object} options   - { toId, replyToken }
 */
function sendLineAlert(alertType, data, options) {
  options = options || {};
  data    = data    || {};

  var toId = options.toId ||
             getConfig('LINE_ADMIN_USER_ID') ||
             'U33d684ffb92560e0eafb0ce8fdf6d4b0';

  var flexMsg = _buildAlertFlexV2_(alertType, data);
  return sendLineMessage(toId, flexMsg, options);
}

// ─────────────────────────────────────────────────────────────
// PHASE 3 — ALERT SYSTEM (triggered by monitoring)
// ─────────────────────────────────────────────────────────────

/**
 * checkAndAlertSLA(slaPercent, options)
 * เรียกจาก HealthMonitor หรือ cron job
 */
function checkAndAlertSLA(slaPercent, options) {
  if (Number(slaPercent) < LINE_ALERT_THRESHOLDS_V2.SLA_MIN) {
    return sendLineAlert('SLA_LOW', {
      value:     slaPercent,
      threshold: LINE_ALERT_THRESHOLDS_V2.SLA_MIN,
      detail:    'SLA อยู่ที่ ' + slaPercent + '% ต่ำกว่าเป้า ' + LINE_ALERT_THRESHOLDS_V2.SLA_MIN + '%'
    }, options);
  }
  return { success: true, skipped: true, reason: 'SLA OK' };
}

/**
 * checkAndAlertHealth(healthScore, options)
 */
function checkAndAlertHealth(healthScore, options) {
  if (Number(healthScore) < LINE_ALERT_THRESHOLDS_V2.HEALTH_MIN) {
    return sendLineAlert('HEALTH_LOW', {
      value:     healthScore,
      threshold: LINE_ALERT_THRESHOLDS_V2.HEALTH_MIN,
      detail:    'Health Score อยู่ที่ ' + healthScore + '% ต่ำกว่าเกณฑ์ ' + LINE_ALERT_THRESHOLDS_V2.HEALTH_MIN + '%'
    }, options);
  }
  return { success: true, skipped: true, reason: 'Health OK' };
}

/**
 * checkAndAlertError(errorRate, options)
 */
function checkAndAlertError(errorRate, latencyMs, options) {
  var alerts = [];
  if (Number(errorRate) > LINE_ALERT_THRESHOLDS_V2.ERROR_RATE_MAX) {
    alerts.push(sendLineAlert('ERROR_SPIKE', {
      value:     errorRate,
      threshold: LINE_ALERT_THRESHOLDS_V2.ERROR_RATE_MAX,
      detail:    'Error rate ' + errorRate + '% สูงกว่าเกณฑ์ ' + LINE_ALERT_THRESHOLDS_V2.ERROR_RATE_MAX + '%'
    }, options));
  }
  if (Number(latencyMs) > LINE_ALERT_THRESHOLDS_V2.LATENCY_MAX_MS) {
    alerts.push(sendLineAlert('LATENCY_HIGH', {
      value:     latencyMs,
      threshold: LINE_ALERT_THRESHOLDS_V2.LATENCY_MAX_MS,
      detail:    'Latency ' + latencyMs + 'ms สูงกว่าเกณฑ์ ' + LINE_ALERT_THRESHOLDS_V2.LATENCY_MAX_MS + 'ms'
    }, options));
  }
  if (alerts.length === 0) return { success: true, skipped: true, reason: 'All OK' };
  return { success: true, alerts: alerts };
}

// ─────────────────────────────────────────────────────────────
// PHASE 4 — USER MAPPING
// ─────────────────────────────────────────────────────────────

/**
 * mapLineUserToSystem(lineUserId, systemUsername)
 * บันทึก mapping userId ↔ system user ใน Config
 */
function mapLineUserToSystem(lineUserId, systemUsername) {
  var mapJson = getConfig('LINE_USER_MAP_JSON') || '{}';
  var map = {};
  try { map = JSON.parse(mapJson); } catch (_) {}
  map[lineUserId] = systemUsername;
  setConfig('LINE_USER_MAP_JSON', JSON.stringify(map));
  return { success: true, mapped: lineUserId + ' → ' + systemUsername };
}

/**
 * getSystemUserFromLine(lineUserId)
 * ดึง system username จาก LINE userId
 */
function getSystemUserFromLine(lineUserId) {
  var mapJson = getConfig('LINE_USER_MAP_JSON') || '{}';
  try {
    var map = JSON.parse(mapJson);
    return map[lineUserId] || null;
  } catch (_) {
    return null;
  }
}

/**
 * getLineUserIdFromSystem(systemUsername)
 * ดึง LINE userId จาก system username (reverse lookup)
 */
function getLineUserIdFromSystem(systemUsername) {
  var mapJson = getConfig('LINE_USER_MAP_JSON') || '{}';
  try {
    var map = JSON.parse(mapJson);
    var keys = Object.keys(map);
    for (var i = 0; i < keys.length; i++) {
      if (map[keys[i]] === systemUsername) return keys[i];
    }
  } catch (_) {}
  return null;
}

// ─────────────────────────────────────────────────────────────
// PHASE 6 — INTERACTIVE MESSAGES (Flex + Quick Reply)
// ─────────────────────────────────────────────────────────────

/**
 * buildQuickReplyV2_(items)
 * สร้าง Quick Reply bar
 * @param {Array} items - [{ label, text }]
 */
function buildQuickReplyV2_(items) {
  return {
    items: items.map(function(item) {
      return {
        type:   'action',
        action: { type: 'message', label: item.label, text: item.text }
      };
    })
  };
}

/**
 * buildSummaryFlexV2_(summary)
 * สร้าง Flex Message สำหรับ #สรุป command
 */
function buildSummaryFlexV2_(summary) {
  summary = summary || {};
  var revenue = summary.revenue || {};
  var ts      = new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });

  return {
    type: 'flex',
    altText: '📊 สรุป COMPHONE — ' + ts,
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type:            'box',
        layout:          'vertical',
        backgroundColor: '#1a1a2e',
        contents: [{
          type:   'text',
          text:   '📊 COMPHONE SUPER APP',
          color:  '#00d4ff',
          weight: 'bold',
          size:   'lg'
        }, {
          type:  'text',
          text:  ts,
          color: '#888888',
          size:  'xs'
        }]
      },
      body: {
        type:   'box',
        layout: 'vertical',
        spacing: 'md',
        contents: [
          _flexRowV2_('💰 รายได้วันนี้',  '฿' + _fmtNum_(revenue.today  || 0)),
          _flexRowV2_('💰 รายได้สัปดาห์', '฿' + _fmtNum_(revenue.week   || 0)),
          _flexRowV2_('💰 รายได้เดือน',   '฿' + _fmtNum_(revenue.month  || 0)),
          _flexSepV2_(),
          _flexRowV2_('🔧 งานทั้งหมด',    String(summary.totalJobs    || 0) + ' งาน'),
          _flexRowV2_('⏰ งานค้าง',        String(summary.overdueJobs  || 0) + ' งาน'),
          _flexRowV2_('📋 SLA',            String(summary.sla          || 0) + '%'),
          _flexSepV2_(),
          _flexRowV2_('📦 สต็อกต่ำ',      String(summary.lowStock     || 0) + ' รายการ'),
          _flexRowV2_('💚 Health Score',   String(summary.healthScore  || 0) + '%')
        ]
      },
      footer: {
        type:   'box',
        layout: 'horizontal',
        spacing: 'sm',
        contents: [
          _flexBtnV2_('📋 งานวันนี้',  '#งาน',    '#27ae60'),
          _flexBtnV2_('🔔 แจ้งเตือน', '#แจ้งเตือน', '#e74c3c'),
          _flexBtnV2_('❓ ช่วยเหลือ',  '#ช่วยเหลือ', '#3498db')
        ]
      }
    }
  };
}

/**
 * buildJobsFlexV2_(jobs)
 * สร้าง Flex Message สำหรับ #งาน command
 */
function buildJobsFlexV2_(jobs) {
  jobs = jobs || [];
  var ts = new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });

  var rows = jobs.slice(0, 8).map(function(job) {
    var statusEmoji = {
      'OPEN':        '🟡',
      'IN_PROGRESS': '🔵',
      'WAITING':     '🟠',
      'DONE':        '✅',
      'CLOSED':      '⬛'
    }[job.status] || '⚪';

    return {
      type:   'box',
      layout: 'horizontal',
      margin: 'sm',
      contents: [
        { type: 'text', text: statusEmoji + ' ' + (job.job_id || '-'), flex: 2, size: 'sm', color: '#00d4ff' },
        { type: 'text', text: (job.customer_name || '-').substring(0, 10), flex: 3, size: 'sm', color: '#ffffff' },
        { type: 'text', text: job.status || '-', flex: 2, size: 'xs', color: '#aaaaaa', align: 'end' }
      ]
    };
  });

  if (rows.length === 0) {
    rows = [{ type: 'text', text: 'ไม่มีงานวันนี้ ✅', color: '#27ae60', align: 'center' }];
  }

  return {
    type:     'flex',
    altText:  '🔧 งานวันนี้ — ' + jobs.length + ' งาน',
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type:            'box',
        layout:          'vertical',
        backgroundColor: '#1a1a2e',
        contents: [{
          type:   'text',
          text:   '🔧 งานวันนี้ (' + jobs.length + ' งาน)',
          color:  '#00d4ff',
          weight: 'bold',
          size:   'lg'
        }, {
          type: 'text', text: ts, color: '#888888', size: 'xs'
        }]
      },
      body: {
        type:     'box',
        layout:   'vertical',
        spacing:  'sm',
        contents: rows
      },
      footer: {
        type:   'box',
        layout: 'horizontal',
        spacing: 'sm',
        contents: [
          _flexBtnV2_('📊 สรุป',      '#สรุป',      '#27ae60'),
          _flexBtnV2_('🔔 แจ้งเตือน', '#แจ้งเตือน', '#e74c3c')
        ]
      }
    }
  };
}

// ─────────────────────────────────────────────────────────────
// PHASE 7 — COMMAND HANDLER (V2)
// ─────────────────────────────────────────────────────────────

/**
 * handleLineBotCommandV2(text, userId, replyToken)
 * จัดการ command ใหม่ที่เพิ่มใน V2
 * ถูกเรียกจาก handleCommand() ใน LineBot.gs
 *
 * @returns {Object|null} LINE message object หรือ null ถ้าไม่ match
 */
function handleLineBotCommandV2(text, userId, replyToken) {
  var normalized = String(text || '').trim().toLowerCase();

  // #สรุป — Executive Summary
  if (/^#?สรุป/.test(normalized) || /^summary/.test(normalized)) {
    return _handleSummaryCommandV2_(userId);
  }

  // #งาน — Jobs today
  if (/^#?งาน/.test(normalized) || /^#?jobs/.test(normalized)) {
    return _handleJobsCommandV2_(userId);
  }

  // #แจ้งเตือน — Alert status
  if (/^#?แจ้งเตือน/.test(normalized) || /^#?alert/.test(normalized)) {
    return _handleAlertStatusV2_(userId);
  }

  // #ช่วยเหลือ / #help — Help menu
  if (/^#?ช่วยเหลือ/.test(normalized) || /^#?help/.test(normalized)) {
    return _handleHelpCommandV2_();
  }

  // #ผูกบัญชี <username> — Map LINE → system user
  var mapMatch = text.match(/^#?ผูกบัญชี\s+(\S+)/i);
  if (mapMatch) {
    return _handleMapUserV2_(userId, mapMatch[1]);
  }

  // #สถานะระบบ — System health
  if (/^#?สถานะระบบ/.test(normalized) || /^#?health/.test(normalized)) {
    return _handleSystemHealthV2_();
  }

  return null; // ไม่ match — ให้ LineBot.gs จัดการต่อ
}

// ─────────────────────────────────────────────────────────────
// PHASE 8 — WEBHOOK SECURITY (HMAC-SHA256)
// ─────────────────────────────────────────────────────────────

/**
 * verifyLineSignatureV2_(e)
 * ตรวจสอบ X-Line-Signature header จาก LINE Platform
 * ใช้ Channel Secret จาก Config
 *
 * @param {Object} e - GAS doPost event
 * @returns {boolean}
 */
function verifyLineSignatureV2_(e) {
  try {
    var secret = getConfig('LINE_CHANNEL_SECRET') || '45b888aeb54588d185bd906ff5b869b5';
    if (!secret) return true; // dev mode: ไม่มี secret = ผ่าน

    // ดึง signature จาก header (GAS ส่งมาใน e.parameter หรือ e.headers)
    var signature = '';
    if (e.parameter && e.parameter['X-Line-Signature']) {
      signature = e.parameter['X-Line-Signature'];
    } else if (e.headers && e.headers['X-Line-Signature']) {
      signature = e.headers['X-Line-Signature'];
    } else if (e.postData && e.postData.headers) {
      signature = e.postData.headers['X-Line-Signature'] || '';
    }

    if (!signature) {
      Logger.log('verifyLineSignatureV2_: No X-Line-Signature header');
      return false;
    }

    var body = (e.postData && e.postData.contents) || '';
    var keyBytes  = Utilities.newBlob(secret).getBytes();
    var dataBytes = Utilities.newBlob(body).getBytes();
    var hmac      = Utilities.computeHmacSha256Signature(dataBytes, keyBytes);
    var computed  = Utilities.base64Encode(hmac);

    if (computed !== signature) {
      Logger.log('verifyLineSignatureV2_: Signature mismatch. Expected: ' + computed + ' Got: ' + signature);
      return false;
    }
    return true;
  } catch (err) {
    Logger.log('verifyLineSignatureV2_ error: ' + err);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────
// INTERNAL COMMAND HANDLERS
// ─────────────────────────────────────────────────────────────

function _handleSummaryCommandV2_(userId) {
  try {
    var result = callRouterActionV55_('getExecutiveDashboard', {});
    var data   = (result && result.data) || {};
    var summary = {
      revenue:      data.revenue      || {},
      totalJobs:    data.totalJobs    || 0,
      overdueJobs:  data.overdueJobs  || 0,
      sla:          data.sla          || 0,
      lowStock:     data.lowStock     || 0,
      healthScore:  data.healthScore  || 0
    };
    var flex = buildSummaryFlexV2_(summary);
    flex.quickReply = buildQuickReplyV2_([
      { label: '🔧 งาน',      text: '#งาน' },
      { label: '🔔 แจ้งเตือน', text: '#แจ้งเตือน' },
      { label: '❓ ช่วยเหลือ', text: '#ช่วยเหลือ' }
    ]);
    return flex;
  } catch (err) {
    return _createTextMsgV2_('❌ ไม่สามารถดึงข้อมูลสรุปได้: ' + err.toString());
  }
}

function _handleJobsCommandV2_(userId) {
  try {
    var result = callRouterActionV55_('getJobsToday', {});
    var jobs   = (result && result.jobs) || [];
    var flex   = buildJobsFlexV2_(jobs);
    flex.quickReply = buildQuickReplyV2_([
      { label: '📊 สรุป',      text: '#สรุป' },
      { label: '🔔 แจ้งเตือน', text: '#แจ้งเตือน' }
    ]);
    return flex;
  } catch (err) {
    return _createTextMsgV2_('❌ ไม่สามารถดึงข้อมูลงานได้: ' + err.toString());
  }
}

function _handleAlertStatusV2_(userId) {
  try {
    var result = callRouterActionV55_('getSystemHealth', {});
    var data   = (result && result.data) || {};
    var sla    = Number(data.sla    || 100);
    var health = Number(data.health || 100);

    var alerts = [];
    if (sla    < LINE_ALERT_THRESHOLDS_V2.SLA_MIN)    alerts.push('🚨 SLA: ' + sla + '% (ต่ำกว่า ' + LINE_ALERT_THRESHOLDS_V2.SLA_MIN + '%)');
    if (health < LINE_ALERT_THRESHOLDS_V2.HEALTH_MIN) alerts.push('🚨 Health: ' + health + '% (ต่ำกว่า ' + LINE_ALERT_THRESHOLDS_V2.HEALTH_MIN + '%)');

    var msg = alerts.length > 0
      ? '⚠️ แจ้งเตือนที่ต้องดำเนินการ:\n' + alerts.join('\n')
      : '✅ ระบบทำงานปกติ\nSLA: ' + sla + '%\nHealth: ' + health + '%';

    return _createTextMsgV2_(msg);
  } catch (err) {
    return _createTextMsgV2_('❌ ไม่สามารถตรวจสอบสถานะได้: ' + err.toString());
  }
}

function _handleHelpCommandV2_() {
  var helpText = [
    '📖 คำสั่ง COMPHONE Bot',
    '',
    '📊 #สรุป — สรุปภาพรวมธุรกิจ',
    '🔧 #งาน — งานวันนี้ทั้งหมด',
    '🔔 #แจ้งเตือน — ตรวจสอบ alert',
    '💚 #สถานะระบบ — Health Score',
    '',
    '🔧 #เปิดงาน ชื่อ|อาการ — เปิดงานใหม่',
    '✅ #ปิดงาน J0001 — ปิดงาน',
    '🔍 #เช็คงาน J0001 — ดูสถานะงาน',
    '📦 #เช็คสต็อก — ดูสินค้า',
    '💳 #เช็คบิล J0001 — ดูบิล',
    '',
    '👤 #ผูกบัญชี username — เชื่อม LINE กับระบบ'
  ].join('\n');

  var msg = _createTextMsgV2_(helpText);
  msg.quickReply = buildQuickReplyV2_([
    { label: '📊 สรุป',  text: '#สรุป' },
    { label: '🔧 งาน',   text: '#งาน' },
    { label: '💚 สถานะ', text: '#สถานะระบบ' }
  ]);
  return msg;
}

function _handleMapUserV2_(lineUserId, systemUsername) {
  var result = mapLineUserToSystem(lineUserId, systemUsername);
  if (result.success) {
    return _createTextMsgV2_('✅ ผูกบัญชีสำเร็จ!\nLINE → ' + systemUsername + '\n\nตอนนี้คุณสามารถใช้คำสั่งทั้งหมดได้แล้ว');
  }
  return _createTextMsgV2_('❌ ผูกบัญชีไม่สำเร็จ: ' + (result.error || 'unknown error'));
}

function _handleSystemHealthV2_() {
  try {
    var result = callRouterActionV55_('getSystemHealth', {});
    var data   = (result && result.data) || {};
    var lines  = [
      '💚 สถานะระบบ COMPHONE',
      '',
      '🔢 Version: ' + (data.version || '5.5.8'),
      '💚 Health: ' + (data.health || 0) + '%',
      '📋 SLA: ' + (data.sla || 0) + '%',
      '⚡ Response: ' + (data.responseTime || 0) + 'ms',
      '🔧 Triggers: ' + (data.triggers || 0),
      '',
      data.health >= 70 ? '✅ ระบบทำงานปกติ' : '⚠️ ระบบต้องการการดูแล'
    ];
    return _createTextMsgV2_(lines.join('\n'));
  } catch (err) {
    return _createTextMsgV2_('❌ ไม่สามารถดึงข้อมูลระบบได้');
  }
}

// ─────────────────────────────────────────────────────────────
// ALERT FLEX BUILDER
// ─────────────────────────────────────────────────────────────

function _buildAlertFlexV2_(alertType, data) {
  var configs = {
    'SLA_LOW':      { emoji: '🚨', title: 'SLA ต่ำกว่าเกณฑ์',     color: '#e74c3c', icon: '📋' },
    'HEALTH_LOW':   { emoji: '⚠️', title: 'Health Score ต่ำ',      color: '#e67e22', icon: '💚' },
    'ERROR_SPIKE':  { emoji: '🔴', title: 'Error Rate สูงผิดปกติ', color: '#c0392b', icon: '❌' },
    'LATENCY_HIGH': { emoji: '🐌', title: 'Response ช้าผิดปกติ',   color: '#8e44ad', icon: '⏱️' },
    'CUSTOM':       { emoji: '🔔', title: 'แจ้งเตือน',              color: '#2980b9', icon: '📢' }
  };

  var cfg = configs[alertType] || configs['CUSTOM'];
  var ts  = new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });

  return {
    type:     'flex',
    altText:  cfg.emoji + ' ' + cfg.title + ' — ' + (data.detail || ''),
    contents: {
      type: 'bubble',
      size: 'kilo',
      header: {
        type:            'box',
        layout:          'vertical',
        backgroundColor: cfg.color,
        contents: [{
          type:   'text',
          text:   cfg.emoji + ' ' + cfg.title,
          color:  '#ffffff',
          weight: 'bold',
          size:   'md'
        }]
      },
      body: {
        type:    'box',
        layout:  'vertical',
        spacing: 'sm',
        contents: [
          { type: 'text', text: cfg.icon + ' ' + (data.detail || 'ตรวจพบความผิดปกติ'), wrap: true, color: '#333333' },
          _flexSepV2_(),
          _flexRowV2_('ค่าปัจจุบัน', String(data.value || '-')),
          _flexRowV2_('เกณฑ์',       String(data.threshold || '-')),
          _flexRowV2_('เวลา',        ts)
        ]
      },
      footer: {
        type:   'box',
        layout: 'horizontal',
        contents: [_flexBtnV2_('📊 ดูสรุป', '#สรุป', cfg.color)]
      }
    }
  };
}

// ─────────────────────────────────────────────────────────────
// LINE API INTERNAL CALLERS
// ─────────────────────────────────────────────────────────────

function _linePush_(toId, messages, token) {
  if (!token) return { success: false, error: 'LINE_CHANNEL_ACCESS_TOKEN not configured' };
  if (!toId)  return { success: false, error: 'toId is required for push' };

  var payload = { to: toId, messages: messages };
  return _callLineApiV2_(LINE_API_BASE_V2 + '/push', payload, token);
}

function _lineReply_(replyToken, messages, token) {
  if (!token)       return { success: false, error: 'LINE_CHANNEL_ACCESS_TOKEN not configured' };
  if (!replyToken)  return { success: false, error: 'replyToken is required' };

  var payload = { replyToken: replyToken, messages: messages };
  return _callLineApiV2_(LINE_API_BASE_V2 + '/reply', payload, token);
}

function _callLineApiV2_(url, payload, token) {
  try {
    var resp = UrlFetchApp.fetch(url, {
      method:          'post',
      contentType:     'application/json',
      headers:         { 'Authorization': 'Bearer ' + token },
      payload:         JSON.stringify(payload),
      muteHttpExceptions: true
    });
    var code = resp.getResponseCode();
    var body = resp.getContentText() || '{}';
    if (code >= 200 && code < 300) {
      return { success: true, status: code };
    }
    Logger.log('LINE API error: HTTP ' + code + ' — ' + body);
    return { success: false, status: code, error: body };
  } catch (err) {
    Logger.log('_callLineApiV2_ error: ' + err);
    return { success: false, error: err.toString() };
  }
}

// ─────────────────────────────────────────────────────────────
// FLEX MESSAGE HELPERS
// ─────────────────────────────────────────────────────────────

function _flexRowV2_(label, value) {
  return {
    type:   'box',
    layout: 'horizontal',
    contents: [
      { type: 'text', text: label, flex: 3, size: 'sm', color: '#888888' },
      { type: 'text', text: String(value), flex: 4, size: 'sm', color: '#ffffff', align: 'end', weight: 'bold' }
    ]
  };
}

function _flexSepV2_() {
  return { type: 'separator', margin: 'sm', color: '#333333' };
}

function _flexBtnV2_(label, text, color) {
  return {
    type:   'button',
    flex:   1,
    height: 'sm',
    style:  'primary',
    color:  color || '#00d4ff',
    action: { type: 'message', label: label, text: text }
  };
}

function _createTextMsgV2_(text) {
  return { type: 'text', text: String(text || '') };
}

function _normalizeMessageV2_(message) {
  if (typeof message === 'string') return { type: 'text', text: message };
  if (message && message.type)     return message;
  return { type: 'text', text: JSON.stringify(message) };
}

function _fmtNum_(n) {
  return Number(n || 0).toLocaleString('th-TH');
}

// ─────────────────────────────────────────────────────────────
// SETUP HELPER — เรียกครั้งเดียวเพื่อตั้งค่า credentials
// ─────────────────────────────────────────────────────────────

/**
 * setupLineBotV2()
 * เรียกจาก GAS Script Editor ครั้งเดียวเพื่อบันทึก credentials
 */
function setupLineBotV2() {
  setConfig('LINE_CHANNEL_ACCESS_TOKEN',
    '8VnOeGjnvGgt0MEHcEAfJNq3ZP51mGd4FjbwhPyqXk3AKujyGj5OXFU/hFHDeX77R3Whc5poaURaTRty806fqs3uat6cL1IS1fX7freWr8zYvG9mN3EHLO+av6V07yg8id/Bb33EYMM5XMhY7HjR0gdB04t89/1O/w1cDnyilFU=');
  setConfig('LINE_CHANNEL_SECRET', '45b888aeb54588d185bd906ff5b869b5');
  setConfig('LINE_ADMIN_USER_ID',  'U33d684ffb92560e0eafb0ce8fdf6d4b0');

  // Map admin LINE user → system user
  mapLineUserToSystem('U33d684ffb92560e0eafb0ce8fdf6d4b0', 'admin');

  Logger.log('✅ LINE Bot V2 setup complete');
  return { success: true, message: 'LINE Bot V2 configured' };
}

/**
 * testLineBotV2()
 * ทดสอบส่ง reply message (ไม่ใช้ push quota)
 * เรียกจาก GAS Script Editor
 */
function testLineBotV2() {
  // Test buildSummaryFlexV2_ structure
  var flex = buildSummaryFlexV2_({
    revenue:     { today: 12500, week: 87000, month: 320000 },
    totalJobs:   15,
    overdueJobs: 2,
    sla:         92,
    lowStock:    3,
    healthScore: 85
  });
  Logger.log('Summary Flex: ' + JSON.stringify(flex).substring(0, 200));

  // Test alert flex
  var alertFlex = _buildAlertFlexV2_('SLA_LOW', {
    value: 75, threshold: 80, detail: 'SLA อยู่ที่ 75% ต่ำกว่าเป้า 80%'
  });
  Logger.log('Alert Flex: ' + JSON.stringify(alertFlex).substring(0, 200));

  return { success: true, message: 'LineBotV2 structure OK' };
}
