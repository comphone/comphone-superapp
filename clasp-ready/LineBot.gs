// COMPHONE SUPER APP V5.5
// ============================================================
// LineBot.gs - LINE Messaging Integration
// ============================================================

var LINE_GAS_URL = (typeof getWebAppBaseUrl_ === 'function' ? getWebAppBaseUrl_() : '') || '';

var LINE_WORK_KEYWORDS_V55 = [
  'เปิดงาน', 'ปิดงาน', 'เช็คงาน', 'เช็คสต็อก', 'สรุป', 'งาน', 'job', 'ซ่อม', 'ติดตั้ง',
  'เดินทาง', 'ถึงหน้างาน', 'เริ่มงาน', 'รอชิ้นส่วน', 'งานเสร็จ', 'เก็บเงิน', 'ลูกค้า',
  'cctv', 'wifi', 'router', 'network', 'gps', 'location', 'รูป', 'ภาพ'
];

var LINE_CASUAL_KEYWORDS_V55 = [
  '555', 'ok', 'โอเค', 'รับทราบ', 'ครับ', 'ค่ะ', 'เดี๋ยว', 'ขอบคุณ', 'ฝนตก', 'รถติด'
];

// ── CONTEXT MEMORY & THROTTLE CONFIG ──
var LINE_CTX_TTL_MS_ = 30 * 60 * 1000;      // 30 นาที
var LINE_THROTTLE_MAX_ = 12;                // ข้อความต่อนาที
var LINE_THROTTLE_WINDOW_MS_ = 60 * 1000;   // 1 นาที
var LINE_BATCH_WINDOW_MS_ = 8 * 1000;       // 8 วินาที สำหรับ batch รูป

// ══════════════════════════════════════════════════════════════════
// CONTEXT MEMORY — จำงาน JobID ล่าสุดในบริบทของผู้ใช้
// ══════════════════════════════════════════════════════════════════

function getLineCtxKey_(userId) { return 'LINE_CTX_' + String(userId); }
function getLineThrottleKey_(userId) { return 'LINE_THR_' + String(userId); }
function getLineBatchKey_(userId) { return 'LINE_BATCH_' + String(userId); }

/**
 * ดึงบริบทผู้ใช้ และลบถ้าหมดอายุ
 * @returns {Object|null} {lastJobId, lastAction, lastTs}
 */
function getUserContext_(userId) {
  if (!userId) return null;
  try {
    var raw = PropertiesService.getScriptProperties().getProperty(getLineCtxKey_(userId));
    if (!raw) return null;
    var ctx = JSON.parse(raw);
    if (!ctx || !ctx.lastTs) return null;
    if (Date.now() - ctx.lastTs > LINE_CTX_TTL_MS_) {
      clearUserContext_(userId);
      return null;
    }
    return ctx;
  } catch (e) {
    return null;
  }
}

function setUserContext_(userId, jobId, action) {
  if (!userId) return;
  try {
    var ctx = {
      lastJobId: String(jobId || '').toUpperCase(),
      lastAction: String(action || ''),
      lastTs: Date.now()
    };
    PropertiesService.getScriptProperties().setProperty(getLineCtxKey_(userId), JSON.stringify(ctx));
  } catch (e) { /* silent */ }
}

function clearUserContext_(userId) {
  if (!userId) return;
  try {
    PropertiesService.getScriptProperties().deleteProperty(getLineCtxKey_(userId));
    PropertiesService.getScriptProperties().deleteProperty(getLineBatchKey_(userId));
  } catch (e) { /* silent */ }
}

// ══════════════════════════════════════════════════════════════════
// THROTTLE — กันสแปมป์หลังว่นรวด
// ══════════════════════════════════════════════════════════════════

function shouldThrottle_(userId) {
  if (!userId) return { allowed: true, remaining: LINE_THROTTLE_MAX_, retryAfter: 0 };
  try {
    var key = getLineThrottleKey_(userId);
    var raw = PropertiesService.getScriptProperties().getProperty(key);
    var now = Date.now();
    var entries = raw ? JSON.parse(raw) : [];
    // กรองเฉพาะรายการใน window
    entries = entries.filter(function(ts) { return now - ts < LINE_THROTTLE_WINDOW_MS_; });
    if (entries.length >= LINE_THROTTLE_MAX_) {
      var oldest = entries[0];
      var retryAfter = Math.ceil((oldest + LINE_THROTTLE_WINDOW_MS_ - now) / 1000);
      return { allowed: false, remaining: 0, retryAfter: Math.max(1, retryAfter) };
    }
    entries.push(now);
    PropertiesService.getScriptProperties().setProperty(key, JSON.stringify(entries));
    return { allowed: true, remaining: LINE_THROTTLE_MAX_ - entries.length, retryAfter: 0 };
  } catch (e) {
    return { allowed: true, remaining: LINE_THROTTLE_MAX_, retryAfter: 0 };
  }
}

// ══════════════════════════════════════════════════════════════════
// BATCH IMAGE — รวมรูปที่ส่งในช่วงสันหนึ่ง
// ══════════════════════════════════════════════════════════════════

function recordImageBatch_(userId, jobId, messageId) {
  if (!userId) return 1;
  try {
    var key = getLineBatchKey_(userId);
    var now = Date.now();
    var raw = PropertiesService.getScriptProperties().getProperty(key);
    var batch = raw ? JSON.parse(raw) : { images: [], startedAt: now };
    // รีเซ็ตถ้าหมดเวลาเกิน
    if (now - batch.startedAt > LINE_BATCH_WINDOW_MS_) {
      batch = { images: [], startedAt: now };
    }
    batch.images.push({ messageId: messageId || '', ts: now });
    PropertiesService.getScriptProperties().setProperty(key, JSON.stringify(batch));
    return batch.images.length;
  } catch (e) {
    return 1;
  }
}

function getBatchCount_(userId) {
  if (!userId) return 0;
  try {
    var key = getLineBatchKey_(userId);
    var raw = PropertiesService.getScriptProperties().getProperty(key);
    if (!raw) return 0;
    var batch = JSON.parse(raw);
    var now = Date.now();
    if (!batch || now - batch.startedAt > LINE_BATCH_WINDOW_MS_) return 0;
    return batch.images ? batch.images.length : 0;
  } catch (e) {
    return 0;
  }
}

/**
 * สร้าง JobID แบบอัฐฤษี—หาในข้อความก่อน แล้วหาจาก Context
 * @returns {string} JobID หรือ ''
 */
function extractJobIdSmart_(text, userId, hint) {
  var fromText = extractJobIdV55_(text);
  if (fromText) return fromText;
  var ctx = getUserContext_(userId);
  if (ctx && ctx.lastJobId) {
    // ถ้ามี hint (เช่น สถานะ) และ context ตรงกัน ใช้ได้เลย
    if (!hint || ctx.lastAction === hint) return ctx.lastJobId;
    // ถ้าไม่มี hint หรือ hint ตรง ก็ใช้ context ได้ (เช่น ส่งรูปไม่มีระบุ JobID)
    return ctx.lastJobId;
  }
  return '';
}

/**
 * สร้างข้อความแจ้งผู้ใช้ว่าใช้ Context JobID แทน
 */
function buildContextHint_(jobId, actionLabel) {
  if (!jobId) return '';
  return '\n\nฟ้า จำงาน: ' + jobId +
         (actionLabel ? ' (สำหรับ' + actionLabel + ')' : '') +
         '\nพิมพ์ #clear เพื่อล้างบริบท';
}

function handleLineWebhook(e) {
  try {
    var body = parseLineWebhookBodyV55_(e);
    var events = body.events || [];
    var handled = [];

    for (var i = 0; i < events.length; i++) {
      var eventResult = processLineEventV55_(events[i]);
      if (eventResult) handled.push(eventResult);
    }

    return { success: true, handled: handled.length, results: handled };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function processLineEventV55_(event) {
  event = event || {};
  var message = event.message || {};
  var source = event.source || {};
  var replyToken = event.replyToken || '';
  var groupId = source.groupId || source.roomId || '';
  var userId = source.userId || groupId || '';
  var userName = getLineDisplayNameV55_(userId) || 'LINE_USER';

  // ── จับ join event: เมื่อ Bot ถูกเพิ่มเข้ากลุ่ม ──
  if (event.type === 'join' && groupId) {
    saveLineGroupId_(groupId, replyToken);
    return { success: true, event_type: 'join', group_id: groupId };
  }

  if (event.type !== 'message') {
    return { success: true, skipped: true, reason: 'unsupported_event_type', type: event.type || '' };
  }

  var responseMessage = processLineMessage(message, userId, userName, groupId);
  if (responseMessage && replyToken) {
    replyLineMessage(replyToken, normalizeLineMessagesV55_(responseMessage));
  }

  return {
    success: true,
    user_id: userId,
    message_type: message.type || '',
    replied: !!(responseMessage && replyToken)
  };
}

function processLineMessage(message, userId, userName, groupId) {
  groupId = groupId || '';
  message = message || {};
  var text = message.text || '';
  var hasImage = message.type === 'image';
  var hasLocation = message.type === 'location';

  // ── STEP 1: ANTI-SPAM THROTTLE ──
  var throttle = shouldThrottle_(userId);
  if (!throttle.allowed) {
    Logger.log('[LINE THROTTLE] ผู้ใช้ ' + userId + ' ส่งมากเกิน ' + LINE_THROTTLE_MAX_ + ' ข้อความ/นาที');
    return createTextMessage('⚠️ คุณส่งข้อความมากเกินไป กรุณาลองใหม่อีก ' + throttle.retryAfter + ' วินาที');
  }

  // ── STEP 2: CLEAR CONTEXT COMMAND ──
  if (/^(#?clear|ล้างบริบท)/i.test(text)) {
    clearUserContext_(userId);
    return createTextMessage('✅ ล้างบริบทแล้ว\nบอทจำงาน JobID ล่าสุดได้แล้ว');
  }

  // ── STEP 3: SMART CLASSIFICATION ──
  var classification = classifyMessage(text, hasImage, hasLocation, userId);
  if (classification.type === 'casual') return null;

  // ── STEP 4: ROUTE ──
  switch (classification.type) {
    case 'command':
      return handleCommand(classification, text, userId, userName, groupId);
    case 'location_share':
      return handleLocation(message, classification, userId, userName);
    case 'work_report':
      return handlePhotoReport(message, classification, userId, userName);
    case 'status_update':
      return handleStatus(classification, text, userId, userName);
    case 'work_note':
      return handleWorkNote(classification, text, userId, userName);
    default:
      return null;
  }
}

function classifyMessage(text, hasImage, hasLocation, userId) {
  text = String(text || '').trim();
  var normalized = text.toLowerCase();

  // ใช้ Smart Extraction: หาในข้อความก่อน ถ้าไม่มีค่อยใช้ Context
  var jobIdFromText = extractJobIdV55_(text);
  var jobId = jobIdFromText || extractJobIdSmart_(text, userId, '') || '';

  if (/^\/groupid/i.test(text)) return { type: 'command', command: 'get_group_id' };
  if (/^(#?เปิดงาน|create job)/i.test(text)) return { type: 'command', command: 'open_job', jobId: jobId };
  if (/^(#?ปิดงาน|close job)/i.test(text)) return { type: 'command', command: 'close_job', jobId: jobId };
  if (/^(#?เช็คงาน|check job)/i.test(text)) return { type: 'command', command: 'check_job', jobId: jobId };
  if (/^(#?เช็คสต็อก|check stock)/i.test(text)) return { type: 'command', command: 'check_stock', jobId: jobId };
  if (/^(#?เช็คบิล|เช็คยอด|check bill)/i.test(text)) return { type: 'command', command: 'check_billing', jobId: jobId };
  if (/^(#?สรุป|summary)/i.test(text)) return { type: 'command', command: 'summary', jobId: jobId };

  if (hasLocation) return { type: 'location_share', jobId: jobId };
  if (hasImage) return { type: 'work_report', subType: 'photo', jobId: jobId };

  if (/(เดินทาง|on the way)/i.test(text)) return { type: 'status_update', status_code: 4, jobId: jobId };
  if (/(ถึงหน้างาน|ถึงแล้ว|arrived)/i.test(text)) return { type: 'status_update', status_code: 5, jobId: jobId };
  if (/(เริ่มงาน|start work|เริ่ม)/i.test(text)) return { type: 'status_update', status_code: 6, jobId: jobId };
  if (/(รอชิ้นส่วน|รออะไหล่)/i.test(text)) return { type: 'status_update', status_code: 7, jobId: jobId };
  if (/(งานเสร็จ|เสร็จแล้ว|done)/i.test(text)) return { type: 'status_update', status_code: 8, jobId: jobId };
  if (/(ลูกค้าตรวจรับ|ตรวจรับ)/i.test(text)) return { type: 'status_update', status_code: 9, jobId: jobId };
  if (/(รอเก็บเงิน|รอชำระเงิน)/i.test(text)) return { type: 'status_update', status_code: 10, jobId: jobId };
  if (/(เก็บเงินแล้ว|ชำระแล้ว)/i.test(text)) return { type: 'status_update', status_code: 11, jobId: jobId };
  if (/(ปิดงานสมบูรณ์|complete)/i.test(text)) return { type: 'status_update', status_code: 12, jobId: jobId };

  var workScore = countKeywordMatchesV55_(normalized, LINE_WORK_KEYWORDS_V55);
  var casualScore = countKeywordMatchesV55_(normalized, LINE_CASUAL_KEYWORDS_V55);

  if (jobId || workScore > 0) return { type: 'work_note', jobId: jobId };
  if (casualScore > 0 || normalized.length < 10) return { type: 'casual' };
  return { type: 'work_note', jobId: jobId };
}

function handleCommand(classification, text, userId, userName, groupId) {
  groupId = groupId || '';
  switch (classification.command) {
    case 'get_group_id':
      return handleGetGroupId_(groupId, userId);
    case 'open_job':
      return handleOpenJob(text, userId, userName);
    case 'close_job':
      return handleCloseJob(text, userId, userName);
    case 'check_job':
      return formatCheckJobsV55_(text);
    case 'check_stock':
      return formatCheckStockV55_(text);
    case 'check_billing':
      return formatCheckBillingV55_(text);
    case 'summary':
      return formatSummaryV55_();
    default:
      return createTextMessage('ไม่พบคำสั่งที่รองรับ');
  }
}

function handleOpenJob(text, userId, userName) {
  var payload = parseOpenJobTextV55_(text);
  payload.changed_by = userName || userId || 'LINE';
  payload.user = payload.changed_by;
  var result = callRouterActionV55_('createJob', payload);

  if (!result || result.success === false || result.error) {
    return createTextMessage('เปิดงานไม่สำเร็จ: ' + (result && (result.error || result.message) || 'unknown'));
  }

  // ส่ง Flex Message แจ้งกลุ่มช่างด้วย
  if (typeof notifyNewJobToTechnicians === 'function') {
    notifyNewJobToTechnicians({
      job_id: result.job_id,
      customer_name: payload.customer_name || payload.customer,
      symptom: payload.symptom,
      address: payload.address || '',
      technician: payload.technician || 'ยังไม่มอบหมาย',
      priority: payload.priority || 'ปกติ',
      due_date: payload.due_date || '-'
    });
  }
  // ตอบกลับผู้ส่งด้วย Flex Message
  if (typeof createJobFlexMessage_ === 'function') {
    return createJobFlexMessage_({
      job_id: result.job_id,
      customer_name: payload.customer_name || payload.customer,
      symptom: payload.symptom,
      address: payload.address || '',
      technician: payload.technician || 'ยังไม่มอบหมาย',
      priority: payload.priority || 'ปกติ',
      due_date: payload.due_date || '-'
    });
  }
  var lines = [
    'เปิดงานสำเร็จ',
    'JobID: ' + (result.job_id || '-'),
    'สถานะ: ' + (result.status_label || '-'),
    'ลูกค้า: ' + (payload.customer_name || payload.customer || '-'),
    LINE_GAS_URL ? ('Dashboard: ' + LINE_GAS_URL) : ''
  ];
  return createTextMessage(lines.filter(Boolean).join('\n'));
}

function handleCloseJob(text, userId, userName) {
  var jobId = extractJobIdV55_(text);
  if (!jobId) return createTextMessage('กรุณาระบุ JobID เช่น #ปิดงาน J0001');

  var result = callRouterActionV55_('transitionJob', {
    job_id: jobId,
    status_code: 12,
    note: 'ปิดงานผ่าน LINE',
    changed_by: userName || userId || 'LINE'
  });

  if (!result || result.success === false || result.error) {
    return createTextMessage('ปิดงานไม่สำเร็จ: ' + (result && (result.error || result.message) || 'unknown'));
  }

  // ส่ง Flex Message อัปเดตสถานะ
  if (typeof createStatusFlexMessage_ === 'function') {
    return createStatusFlexMessage_({ job_id: jobId, changed_by: userName || userId }, result.to_status_label || 'ปิดงานสมบูรณ์');
  }
  return createTextMessage('ปิดงานสำเร็จ\nJobID: ' + jobId + '\nสถานะ: ' + (result.to_status_label || 'ปิดงาน'));
}

function handleLocation(message, classification, userId, userName) {
  var jobId = classification.jobId || extractJobIdV55_(message.title || message.address || '');
  if (!jobId) {
    return createTextMessage('รับพิกัดแล้ว แต่ยังไม่พบ JobID กรุณาส่งข้อความ เช่น J0001 ถึงหน้างาน พร้อมแชร์ตำแหน่งอีกครั้ง');
  }

  var update = callRouterActionV55_('updateJobStatus', {
    job_id: jobId,
    lat: message.latitude,
    lng: message.longitude,
    note: 'อัปเดตพิกัดจาก LINE',
    changed_by: userName || userId || 'LINE'
  });

  if (!update || update.error || update.success === false) {
    return createTextMessage('อัปเดตพิกัดไม่สำเร็จ: ' + (update && update.error || 'unknown'));
  }

  return createTextMessage('บันทึกพิกัดเรียบร้อย\nJobID: ' + jobId);
}

function handleStatus(classification, text, userId, userName) {
  var jobId = classification.jobId || extractJobIdV55_(text);
  if (!jobId) return createTextMessage('กรุณาระบุ JobID เช่น J0001 ถึงหน้างาน');

  var result = callRouterActionV55_('transitionJob', {
    job_id: jobId,
    status_code: classification.status_code,
    note: text || 'อัปเดตสถานะผ่าน LINE',
    changed_by: userName || userId || 'LINE'
  });

  if (!result || result.success === false || result.error) {
    return createTextMessage('อัปเดตสถานะไม่สำเร็จ: ' + (result && (result.error || result.message) || 'unknown'));
  }

  // ส่ง Flex Message อัปเดตสถานะ
  if (typeof createStatusFlexMessage_ === 'function') {
    return createStatusFlexMessage_({ job_id: jobId, changed_by: userName || userId, note: text }, result.to_status_label || statusLabel);
  }
  return createTextMessage('อัปเดตสถานะเรียบร้อย\nJobID: ' + jobId + '\nสถานะ: ' + (result.to_status_label || '-'));
}

function handleWorkNote(classification, text, userId, userName) {
  var jobId = classification.jobId || extractJobIdV55_(text);
  if (!jobId) return null;

  var result = callRouterActionV55_('addQuickNote', {
    job_id: jobId,
    note: text,
    user: userName || userId || 'LINE'
  });

  if (!result || result.success === false || result.error) {
    return createTextMessage('บันทึกหมายเหตุไม่สำเร็จ: ' + (result && result.error || 'unknown'));
  }

  return createTextMessage('บันทึกหมายเหตุแล้ว\nJobID: ' + jobId);
}

function handlePhotoReport(message, classification, userId, userName) {
  var jobId = classification.jobId || '';
  if (!jobId) {
    return createTextMessage('รับรูปแล้ว แต่ยังไม่พบ JobID กรุณาส่งรูปพร้อมข้อความ เช่น J0001 ถึงหน้างาน');
  }

  if (typeof queuePhotoFromLINE === 'function') {
    var queueResult = queuePhotoFromLINE(message.id || '', jobId, userName || userId || 'LINE');
    if (queueResult && !queueResult.error) {
      return createTextMessage('รับรูปเข้าคิวเรียบร้อย\nJobID: ' + jobId + '\nQueueID: ' + (queueResult.queueId || '-') + '\n' + (queueResult.message || 'รอประมวลผลอัตโนมัติ'));
    }
    return createTextMessage('รับรูปแล้ว แต่เข้าคิวไม่สำเร็จ: ' + (queueResult && queueResult.error || 'unknown'));
  }

  return createTextMessage('รับรูปเรียบร้อย\nJobID: ' + jobId + '\nหมายเหตุ: ยังไม่เปิดใช้งานคิวรูปภาพอัตโนมัติในสคริปต์นี้');
}

// ── GROUP ID HELPERS ──
function handleGetGroupId_(groupId, userId) {
  if (!groupId) {
    return createTextMessage('คำสั่งนี้ใช้ได้เฉพาะใน LINE Group เท่านั้น\nกรุณาเพิ่ม Bot เข้ากลุ่มก่อนแล้วพิมพ์ /groupid ในกลุ่มนั้น');
  }
  return createTextMessage('LINE Group ID ของกลุ่มนี้:\n\n' + groupId + '\n\nคัดลอก ID นี้ไปตั้งค่าในระบบได้เลย');
}

function saveLineGroupId_(groupId, replyToken) {
  if (!groupId) return;
  try {
    var ss = SpreadsheetApp.openById(getConfig('DB_SS_ID'));
    var logSheet = ss.getSheetByName('DB_ACTIVITY_LOG');
    if (logSheet) {
      logSheet.appendRow([
        new Date(),
        'LINE_JOIN',
        groupId,
        'Bot ถูกเพิ่มเข้ากลุ่ม',
        'LINE_BOT'
      ]);
    }
    if (replyToken) {
      replyLineMessage(replyToken, [createTextMessage(
        'สวัสดี! COMPHONE Bot พร้อมใช้งานแล้ว\n\nGroup ID ของกลุ่มนี้:\n' + groupId + '\n\nพิมพ์ /groupid เพื่อดู ID ได้ตลอดเวลา'
      )]);
    }
  } catch (err) {
    // ไม่ต้อง throw เพื่อไม่ให้ webhook ล้ม
  }
}

function replyLineMessage(replyToken, messages) {
  var channelToken = getConfig('LINE_CHANNEL_ACCESS_TOKEN') || '';
  if (!channelToken || !replyToken) return { success: false, error: 'LINE reply configuration missing' };
  return callLineMessagingApiV55_('https://api.line.me/v2/bot/message/reply', {
    replyToken: replyToken,
    messages: normalizeLineMessagesV55_(messages)
  }, channelToken);
}

function pushLineMessage(to, messages) {
  var channelToken = getConfig('LINE_CHANNEL_ACCESS_TOKEN') || '';
  if (!channelToken || !to) return { success: false, error: 'LINE push configuration missing' };
  return callLineMessagingApiV55_('https://api.line.me/v2/bot/message/push', {
    to: to,
    messages: normalizeLineMessagesV55_(messages)
  }, channelToken);
}

function sendLineNotify(payload) {
  payload = payload || {};
  var targetUserId = payload.userId || payload.to || getConfig('LINE_DEFAULT_PUSH_USER_ID') || '';
  if (!targetUserId) {
    return { success: false, error: 'LINE_DEFAULT_PUSH_USER_ID not configured' };
  }
  return pushLineMessage(targetUserId, createTextMessage(payload.message || ''));
}

function createTextMessage(text) {
  return {
    type: 'text',
    text: String(text || '').substring(0, 5000)
  };
}

function formatCheckJobsV55_(text) {
  var searchText = String(text || '').replace(/^(#?เช็คงาน|check job)/i, '').trim();
  var dashboard = callRouterActionV55_('getDashboardData', {});
  var jobs = (dashboard && dashboard.jobs) || [];
  var filtered = [];

  for (var i = 0; i < jobs.length; i++) {
    var job = jobs[i] || {};
    if (!searchText || String(job.id).indexOf(searchText) > -1 || String(job.customer).indexOf(searchText) > -1) {
      filtered.push(job);
    }
    if (filtered.length >= 5) break;
  }

  if (!filtered.length) return createTextMessage('ไม่พบงานที่ค้นหา');

  var lines = ['รายการงานล่าสุด'];
  for (var j = 0; j < filtered.length; j++) {
    lines.push((j + 1) + '. ' + filtered[j].id + ' | ' + filtered[j].customer + ' | ' + filtered[j].status);
  }
  return createTextMessage(lines.join('\n'));
}

function formatCheckStockV55_(text) {
  var keyword = String(text || '').replace(/^(#?เช็คสต็อก|check stock)/i, '').trim().toLowerCase();
  var dashboard = callRouterActionV55_('getDashboardData', {});
  var items = (dashboard && dashboard.inventory) || [];
  var filtered = [];

  for (var i = 0; i < items.length; i++) {
    var item = items[i] || {};
    var haystack = (String(item.code || '') + ' ' + String(item.name || '')).toLowerCase();
    if (!keyword || haystack.indexOf(keyword) > -1) filtered.push(item);
    if (filtered.length >= 5) break;
  }

  if (!filtered.length) return createTextMessage('ไม่พบรายการสต็อก');

  var lines = ['สต็อกที่ค้นหา'];
  for (var j = 0; j < filtered.length; j++) {
    lines.push((j + 1) + '. ' + filtered[j].code + ' | ' + filtered[j].name + ' | คงเหลือ ' + Number(filtered[j].qty || 0));
  }
  return createTextMessage(lines.join('\n'));
}

function formatSummaryV55_() {
  var dashboard = callRouterActionV55_('getDashboardData', {});
  var summary = dashboard && dashboard.summary ? dashboard.summary : {};
  // ใช้ Flex Message ถ้ามี
  if (typeof createSummaryFlexMessage_ === 'function') {
    return createSummaryFlexMessage_(summary);
  }
  var revenue = summary.revenue || {};
  return createTextMessage([
    'สรุป COMPHONE SUPER APP V5.5',
    'งานทั้งหมด: ' + Number(summary.totalJobs || 0),
    'สต็อกต่ำ: ' + Number(summary.lowStock || 0),
    'งานค้าง: ' + Number(summary.overdueJobs || 0),
    'รายได้วันนี้: ' + Number(revenue.today || 0),
    'รายได้สัปดาห์: ' + Number(revenue.week || 0),
    'รายได้เดือน: ' + Number(revenue.month || 0)
  ].join('\n'));
}

function callRouterActionV55_(action, payload) {
  if (typeof routeActionV55 === 'function') {
    return routeActionV55(action, payload || {});
  }
  var globalScope = typeof globalThis !== 'undefined' ? globalThis : this;
  var fn = globalScope[action];
  if (typeof fn !== 'function') return { success: false, error: 'Action not available: ' + action };
  return fn(payload || {});
}

function parseLineWebhookBodyV55_(e) {
  if (!e || !e.postData || !e.postData.contents) return {};
  return JSON.parse(e.postData.contents || '{}');
}

/**
 * ตรวจสอบ HMAC-SHA256 signature จาก LINE Platform
 * @param {Object} e - GAS doPost event
 * @returns {boolean}
 */
function verifyLineSignature_(e) {
  try {
    var secret = getConfig('LINE_CHANNEL_SECRET') || '';
    if (!secret) return true; // ถ้ายังไม่ตั้งค่า ให้ผ่าน (dev mode)
    var signature = (e.parameter && e.parameter['X-Line-Signature']) ||
                    (e.headers && e.headers['X-Line-Signature']) || '';
    if (!signature) return false;
    var body = (e.postData && e.postData.contents) || '';
    var key = Utilities.newBlob(secret).getBytes();
    var data = Utilities.newBlob(body).getBytes();
    var hmac = Utilities.computeHmacSha256Signature(data, key);
    var computed = Utilities.base64Encode(hmac);
    return computed === signature;
  } catch (err) {
    Logger.log('verifyLineSignature_ error: ' + err);
    return false;
  }
}

function normalizeLineMessagesV55_(messages) {
  if (!messages) return [];
  return Array.isArray(messages) ? messages : [messages];
}

function callLineMessagingApiV55_(url, payload, channelToken) {
  try {
    var response = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      headers: { Authorization: 'Bearer ' + channelToken },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
    var text = response.getContentText() || '{}';
    return { success: response.getResponseCode() >= 200 && response.getResponseCode() < 300, status: response.getResponseCode(), body: text };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function parseOpenJobTextV55_(text) {
  text = String(text || '').replace(/^(#?เปิดงาน|create job)/i, '').trim();
  var parts = text.split('|');
  return {
    customer_name: String(parts[0] || 'ลูกค้าใหม่').trim(),
    symptom: String(parts[1] || 'รับงานจาก LINE').trim(),
    note: String(parts[2] || '').trim(),
    source: 'LINE'
  };
}

function extractJobIdV55_(text) {
  var match = String(text || '').match(/j\d{3,6}/i);
  return match ? String(match[0]).toUpperCase() : '';
}

function countKeywordMatchesV55_(text, keywords) {
  var count = 0;
  for (var i = 0; i < keywords.length; i++) {
    if (text.indexOf(String(keywords[i]).toLowerCase()) > -1) count++;
  }
  return count;
}

function getLineDisplayNameV55_(userId) {
  var mapJson = getConfig('LINE_USER_MAP_JSON') || '{}';
  try {
    var map = JSON.parse(mapJson);
    return map[userId] || '';
  } catch (error) {
    return '';
  }
}

/**
 * formatCheckBillingV55_ — ตรวจสอบยอดบิลผ่าน LINE
 * คำสั่ง: #เช็คบิล J0001 หรือ #เช็คยอด J0001
 * @param {string} text
 * @returns {Object} LINE text message
 */
function formatCheckBillingV55_(text) {
  var jobId = extractJobIdV55_(text);
  if (!jobId) {
    return createTextMessage(
      '📋 วิธีใช้: #เช็คบิล [JobID]\n' +
      'ตัวอย่าง: #เช็คบิล J0001\n\n' +
      'หรือ: #เช็คยอด J0001'
    );
  }

  var result = callRouterActionV55_('getBilling', { job_id: jobId });
  if (!result || result.success === false || !result.billing) {
    return createTextMessage('❌ ไม่พบข้อมูลบิลสำหรับ ' + jobId + '\n' + (result && result.error || ''));
  }

  var b = result.billing;
  var statusEmoji = b.payment_status === 'PAID' ? '✅' : (b.payment_status === 'PARTIAL' ? '🔶' : '⏳');
  var statusLabel = b.payment_status === 'PAID' ? 'ชำระแล้ว' : (b.payment_status === 'PARTIAL' ? 'ชำระบางส่วน' : 'ยังไม่ชำระ');

  var lines = [
    statusEmoji + ' ข้อมูลบิล ' + jobId,
    '👤 ลูกค้า: ' + (b.customer_name || '-'),
    '💰 ยอดรวม: ฿' + Number(b.total_amount || 0).toLocaleString(),
    '✅ ชำระแล้ว: ฿' + Number(b.amount_paid || 0).toLocaleString(),
    '📌 คงค้าง: ฿' + Number(b.balance_due || 0).toLocaleString(),
    '🏷️ สถานะ: ' + statusLabel
  ];

  if (b.transaction_ref) lines.push('🔖 Ref: ' + b.transaction_ref);
  if (b.paid_at) lines.push('🕒 ชำระเมื่อ: ' + String(b.paid_at).substring(0, 10));

  return createTextMessage(lines.join('\n'));
}
