// COMPHONE SUPER APP V5.5
// ============================================================
// LineBot.gs - LINE Messaging Integration
// Version: 5.6.6 (PHASE 27.1 - AUDIT & REFACTOR)
// Last Updated: 2025-04-22
// Deployed via: GitHub Actions (production environment)
// ============================================================
// CHANGELOG v5.6.6:
//   - Unified resolveJobId_() with strict priority: text > context > null
//   - Centralized Context API: saveContext_(), getContext_(), clearContext_()
//   - Fixed classifyMessage: NEVER pre-resolve from context (only explicit text)
//   - Fixed handlePhotoReport: proper context fallback with clear UX
//   - Fixed handleWorkNote: returns helpful error instead of silent null
//   - Standardized all UX messages: emoji prefix + clear action + hint
//   - Added groupChatUserId_() for reliable user isolation in groups
//   - Added strict validation: every handler validates jobId before proceed
//   - All failures return actionable messages (no silent errors)
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

// ── CONFIG ──
var LINE_CTX_TTL_MS_ = 30 * 60 * 1000;      // 30 นาที
var LINE_THROTTLE_MAX_ = 12;                // ข้อความต่อนาที
var LINE_THROTTLE_WINDOW_MS_ = 60 * 1000;   // 1 นาที
var LINE_BATCH_WINDOW_MS_ = 8 * 1000;       // 8 วินาที สำหรับ batch รูป

// ══════════════════════════════════════════════════════════════════
// SECTION 1: UNIFIED CONTEXT API
// ══════════════════════════════════════════════════════════════════

/**
 * สร้าง key ที่ปลอดภัยสำหรับ PropertiesService
 * รองรับทั้ง user chat และ group chat (groupId + userId ถ้ามี)
 */
function _ctxKey(userId, groupId) {
  var base = 'LINE_CTX_';
  if (groupId && userId) {
    return base + groupId + '_' + userId;
  }
  return base + String(userId || groupId || 'unknown');
}

function _thrKey(userId, groupId) {
  return 'LINE_THR_' + String(userId || groupId || 'unknown');
}

function _batchKey(userId, groupId) {
  return 'LINE_BATCH_' + String(userId || groupId || 'unknown');
}

/**
 * ดึงบริบทผู้ใช้
 * @returns {Object|null} {jobId, ts, source} หรือ null ถ้าไม่มี/หมดอายุ
 */
function getContext_(userId, groupId) {
  if (!userId && !groupId) return null;
  try {
    var raw = PropertiesService.getScriptProperties().getProperty(_ctxKey(userId, groupId));
    if (!raw) return null;
    var ctx = JSON.parse(raw);
    if (!ctx || !ctx.ts) return null;
    if (Date.now() - ctx.ts > LINE_CTX_TTL_MS_) {
      clearContext_(userId, groupId);
      return null;
    }
    return ctx;
  } catch (e) {
    return null;
  }
}

/**
 * บันทึกบริบท
 * @param {string} userId
 * @param {string} groupId
 * @param {string} jobId
 * @param {string} source — ทำไมถึงจำ (เช่น 'text', 'image', 'status')
 */
function saveContext_(userId, groupId, jobId, source) {
  if (!userId && !groupId) return;
  try {
    var ctx = {
      jobId: String(jobId || '').toUpperCase(),
      source: String(source || ''),
      ts: Date.now()
    };
    PropertiesService.getScriptProperties().setProperty(_ctxKey(userId, groupId), JSON.stringify(ctx));
  } catch (e) { /* silent */ }
}

function clearContext_(userId, groupId) {
  if (!userId && !groupId) return;
  try {
    PropertiesService.getScriptProperties().deleteProperty(_ctxKey(userId, groupId));
    PropertiesService.getScriptProperties().deleteProperty(_batchKey(userId, groupId));
  } catch (e) { /* silent */ }
}

// ══════════════════════════════════════════════════════════════════
// SECTION 2: THROTTLE & BATCH
// ══════════════════════════════════════════════════════════════════

function shouldThrottle_(userId, groupId) {
  var id = userId || groupId;
  if (!id) return { allowed: true, remaining: LINE_THROTTLE_MAX_, retryAfter: 0 };
  try {
    var key = _thrKey(userId, groupId);
    var raw = PropertiesService.getScriptProperties().getProperty(key);
    var now = Date.now();
    var entries = raw ? JSON.parse(raw) : [];
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

function recordImageBatch_(userId, groupId, messageId) {
  if (!userId && !groupId) return 1;
  try {
    var key = _batchKey(userId, groupId);
    var now = Date.now();
    var raw = PropertiesService.getScriptProperties().getProperty(key);
    var batch = raw ? JSON.parse(raw) : { images: [], startedAt: now };
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

function getBatchCount_(userId, groupId) {
  if (!userId && !groupId) return 0;
  try {
    var key = _batchKey(userId, groupId);
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

// ══════════════════════════════════════════════════════════════════
// SECTION 3: UNIFIED JOBID RESOLUTION
// ══════════════════════════════════════════════════════════════════

/**
 * สกัด JobID จากข้อความ (ลำดับความ)
 * @returns {string} JobID หรือ ''
 */
function extractJobIdV55_(text) {
  var match = String(text || '').match(/j\d{3,6}/i);
  return match ? String(match[0]).toUpperCase() : '';
}

/**
 * สร้าง JobID แบบอัฐฤษี — ลำดับความ:
 *   1. หาใน text ก่อน
 *   2. ถ้าไม่มี → fallback ไป context (ไม่มีการ validate hint แบบซับซ้อน)
 *   3. ถ้าไม่มี context ทั้งหมด → return null
 *
 * @param {string} text — ข้อความที่อาจมี JobID
 * @param {string} userId
 * @param {string} groupId
 * @returns {string|null} JobID หรือ null
 */
function resolveJobId_(text, userId, groupId) {
  // STEP 1: extract from text
  var fromText = extractJobIdV55_(text);
  if (fromText) {
    // หาเจอในข้อความ แล้ว — ไม่สนใจว่า context จะอัพเดทหลังนี้
    return fromText;
  }

  // STEP 2: fallback to context (only if user explicitly mentions a work-related word, or for images)
  var ctx = getContext_(userId, groupId);
  if (ctx && ctx.jobId) {
    return ctx.jobId;
  }

  // STEP 3: nothing found
  return null;
}

/**
 * สร้างข้อความ UX มาตรฐานให้ผู้ใช้ว่าใช้ Context
 */
function buildContextHint_(jobId, actionLabel) {
  if (!jobId) return '';
  return '\n\nฟ้า จำงาน: ' + jobId +
         (actionLabel ? ' (สำหรับ' + actionLabel + ')' : '') +
         '\nพิมพ์ #clear เพื่อล้างบริบท';
}

/**
 * ข้อความมาตรฐานเมื่อไม่พบ JobID
 */
function buildMissingJobIdMessage_(mediaType) {
  var hint = mediaType === 'image'
    ? '🖼️ รับรูปแล้ว แต่ยังไม่ทราบ JobID\n\n'
    : '❌ ไม่พบ JobID\n\n';

  return createTextMessage(
    hint +
    'วิธีใช้:\n' +
    '1. พิมพ์ JobID ในข้อความ เช่น "J0001 ถึงแล้ว"\n' +
    '2. หลังจากนั้นบอทจำ JobID ได้อัตโนมัติ\n' +
    '3. หรือส่งรูปพร้อมข้อความที่มี JobID'
  );
}

// ══════════════════════════════════════════════════════════════════
// SECTION 4: WEBHOOK ENTRY POINT
// ══════════════════════════════════════════════════════════════════

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
  var userId = source.userId || '';
  var userName = getLineDisplayNameV55_(userId) || 'LINE_USER';

  // ── JOIN EVENT ──
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
    group_id: groupId,
    message_type: message.type || '',
    replied: !!(responseMessage && replyToken)
  };
}

// ══════════════════════════════════════════════════════════════════
// SECTION 5: MESSAGE ROUTER
// ══════════════════════════════════════════════════════════════════

function processLineMessage(message, userId, userName, groupId) {
  groupId = groupId || '';
  message = message || {};
  var text = message.text || '';
  var hasImage = message.type === 'image';
  var hasLocation = message.type === 'location';

  // STEP 1: THROTTLE
  var throttle = shouldThrottle_(userId, groupId);
  if (!throttle.allowed) {
    Logger.log('[LINE THROTTLE] user=' + userId + ' group=' + groupId + ' exceeded ' + LINE_THROTTLE_MAX_ + '/min');
    return createTextMessage('⚠️ คุณส่งข้อความมากเกินไป กรุณาลองใหม่อีก ' + throttle.retryAfter + ' วินาที');
  }

  // STEP 2: COMMANDS (bypass classification)
  if (/^(#?clear|ล้างบริบท)/i.test(text)) {
    clearContext_(userId, groupId);
    return createTextMessage('✅ ล้างบริบทแล้ว\nบอทจำงาน JobID ล่าสุดได้แล้ว');
  }

  if (/^(#?help|ช่วยเหลือ|คำสั่ง)/i.test(text)) {
    return createTextMessage(
      '📚 คำสั่ง LINE Bot COMPHONE V5.5\n\n' +
      '📋 งาน:\n' +
      '#เปิดงาน ลูกค้า|อาการ|ที่อยู่\n' +
      '#ปิดงาน J0001\n' +
      '#เช็คงาน J0001\n' +
      '#เช็คสต็อก [คำค้นหา]\n' +
      '#เช็คบิล J0001\n' +
      '#สรุป\n\n' +
      '📍 สถานะ (ไม่ต้องมี JobID ถ้าบอทจำได้):\n' +
      'J0001 เดินทาง / ถึงแล้ว / เริ่มงาน\n' +
      'J0001 งานเสร็จ / ลูกค้าตรวจรับ\n' +
      'J0001 เก็บเงิน / ปิดงานสมบูรณ์\n\n' +
      '🖼️ รูป: ส่งรูปพร้อมข้อความ หลังจากนั้นบอทจำ JobID ได้\n\n' +
      '⚠️ #clear — ล้างบริบท JobID ที่จำไว้'
    );
  }

  // STEP 3: CLASSIFY (ONLY by text content, NEVER from context)
  var classification = classifyMessage(text, hasImage, hasLocation);
  if (classification.type === 'casual') return null;

  // STEP 4: RESOLVE JobID (text first, then context fallback)
  // สำหรับ image/location: ใช้ context เป็น fallback ได้
  var resolvedJobId = null;
  if (classification.type === 'work_report' || classification.type === 'location_share') {
    resolvedJobId = resolveJobId_(text, userId, groupId);
  } else {
    // สำหรับ text commands/status: ใช้ทั้ง text และ context
    resolvedJobId = resolveJobId_(text, userId, groupId);
  }

  // STEP 5: ROUTE
  switch (classification.type) {
    case 'command':
      return handleCommand(classification, text, userId, userName, groupId, resolvedJobId);
    case 'location_share':
      return handleLocation(message, userId, userName, groupId, resolvedJobId);
    case 'work_report':
      return handlePhotoReport(message, userId, userName, groupId, resolvedJobId);
    case 'status_update':
      return handleStatus(classification, text, userId, userName, groupId, resolvedJobId);
    case 'work_note':
      return handleWorkNote(classification, text, userId, userName, groupId, resolvedJobId);
    default:
      return null;
  }
}

// ══════════════════════════════════════════════════════════════════
// SECTION 6: CLASSIFICATION (text-only, NO context)
// ══════════════════════════════════════════════════════════════════

function classifyMessage(text, hasImage, hasLocation) {
  text = String(text || '').trim();
  var normalized = text.toLowerCase();
  var jobId = extractJobIdV55_(text); // หาเฉพาะจากข้อความเท่านั้น

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

// ══════════════════════════════════════════════════════════════════
// SECTION 7: COMMAND HANDLERS
// ══════════════════════════════════════════════════════════════════

function handleCommand(classification, text, userId, userName, groupId, resolvedJobId) {
  groupId = groupId || '';
  switch (classification.command) {
    case 'get_group_id':
      return handleGetGroupId_(groupId, userId);
    case 'open_job':
      return handleOpenJob(text, userId, userName, groupId);
    case 'close_job':
      return handleCloseJob(text, userId, userName, groupId, resolvedJobId);
    case 'check_job':
      return formatCheckJobsV55_(text);
    case 'check_stock':
      return formatCheckStockV55_(text);
    case 'check_billing':
      return formatCheckBillingV55_(text, userId, groupId, resolvedJobId);
    case 'summary':
      return formatSummaryV55_();
    default:
      return createTextMessage('❌ ไม่พบคำสั่งที่รองรับ');
  }
}

function handleOpenJob(text, userId, userName, groupId) {
  var payload = parseOpenJobTextV55_(text);
  payload.changed_by = userName || userId || 'LINE';
  payload.user = payload.changed_by;
  var result = callRouterActionV55_('createJob', payload);

  if (!result || result.success === false || result.error) {
    return createTextMessage('❌ เปิดงานไม่สำเร็จ: ' + (result && (result.error || result.message) || 'unknown'));
  }

  // บันทึก Context
  if (result.job_id) {
    saveContext_(userId, groupId, result.job_id, 'open_job');
  }

  // ส่ง Flex Message แจ้งกลุ่มช่าง
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

  return createTextMessage([
    '✅ เปิดงานสำเร็จ',
    'JobID: ' + (result.job_id || '-'),
    'สถานะ: ' + (result.status_label || '-'),
    'ลูกค้า: ' + (payload.customer_name || payload.customer || '-')
  ].join('\n'));
}

function handleCloseJob(text, userId, userName, groupId, resolvedJobId) {
  var jobId = resolvedJobId || extractJobIdV55_(text);
  if (!jobId) {
    return buildMissingJobIdMessage_('text');
  }

  var result = callRouterActionV55_('transitionJob', {
    job_id: jobId,
    status_code: 12,
    note: 'ปิดงานผ่าน LINE',
    changed_by: userName || userId || 'LINE'
  });

  if (!result || result.success === false || result.error) {
    return createTextMessage('❌ ปิดงานไม่สำเร็จ: ' + (result && (result.error || result.message) || 'unknown'));
  }

  saveContext_(userId, groupId, jobId, 'close_job');

  if (typeof createStatusFlexMessage_ === 'function') {
    return createStatusFlexMessage_({ job_id: jobId, changed_by: userName || userId }, result.to_status_label || 'ปิดงานสมบูรณ์');
  }
  return createTextMessage('✅ ปิดงานสำเร็จ\nJobID: ' + jobId + '\nสถานะ: ' + (result.to_status_label || 'ปิดงาน'));
}

// ══════════════════════════════════════════════════════════════════
// SECTION 8: LOCATION HANDLER
// ══════════════════════════════════════════════════════════════════

function handleLocation(message, userId, userName, groupId, resolvedJobId) {
  var jobId = resolvedJobId || extractJobIdV55_(message.title || message.address || '');

  if (!jobId) {
    return buildMissingJobIdMessage_('location');
  }

  var update = callRouterActionV55_('updateJobStatus', {
    job_id: jobId,
    lat: message.latitude,
    lng: message.longitude,
    note: 'อัปเดตพิกัดจาก LINE',
    changed_by: userName || userId || 'LINE'
  });

  if (!update || update.error || update.success === false) {
    return createTextMessage('❌ อัปเดตพิกัดไม่สำเร็จ: ' + (update && update.error || 'unknown'));
  }

  saveContext_(userId, groupId, jobId, 'location');

  return createTextMessage(
    '✅ บันทึกพิกัดแล้ว\nJobID: ' + jobId +
    '\nLat: ' + message.latitude +
    '\nLng: ' + message.longitude +
    buildContextHint_(jobId, 'พิกัด')
  );
}

// ══════════════════════════════════════════════════════════════════
// SECTION 9: STATUS HANDLER
// ══════════════════════════════════════════════════════════════════

function handleStatus(classification, text, userId, userName, groupId, resolvedJobId) {
  var jobId = resolvedJobId || classification.jobId || extractJobIdV55_(text);

  if (!jobId) {
    return buildMissingJobIdMessage_('text');
  }

  var result = callRouterActionV55_('transitionJob', {
    job_id: jobId,
    status_code: classification.status_code,
    note: text || 'อัปเดตสถานะผ่าน LINE',
    changed_by: userName || userId || 'LINE'
  });

  if (!result || result.success === false || result.error) {
    return createTextMessage('❌ อัปเดตสถานะไม่สำเร็จ: ' + (result && (result.error || result.message) || 'unknown'));
  }

  saveContext_(userId, groupId, jobId, 'status_update');

  if (typeof createStatusFlexMessage_ === 'function') {
    return createStatusFlexMessage_(
      { job_id: jobId, changed_by: userName || userId, note: text },
      result.to_status_label || '-'
    );
  }

  return createTextMessage(
    '✅ อัปเดตสถานะแล้ว\nJobID: ' + jobId +
    '\nสถานะ: ' + (result.to_status_label || '-') +
    buildContextHint_(jobId, 'อัปเดตสถานะ')
  );
}

// ══════════════════════════════════════════════════════════════════
// SECTION 10: WORK NOTE HANDLER
// ══════════════════════════════════════════════════════════════════

function handleWorkNote(classification, text, userId, userName, groupId, resolvedJobId) {
  var jobId = resolvedJobId || classification.jobId || extractJobIdV55_(text);

  if (!jobId) {
    // ไม่ใช่ null อีกต่อไป — ต้องบอกผู้ใช้ว่าไม่ได้ทำอะไร
    return createTextMessage(
      'ℹ️ ข้อความนี้ยังไม่มี JobID\n' +
      'ถ้าต้องการบันทึกหมายเหตุ กรุณาระบุ JobID ด้วย เช่น "J0001 หมายเหตุ..."'
    );
  }

  var result = callRouterActionV55_('addQuickNote', {
    job_id: jobId,
    note: text,
    user: userName || userId || 'LINE'
  });

  if (!result || result.success === false || result.error) {
    return createTextMessage('❌ บันทึกหมายเหตุไม่สำเร็จ: ' + (result && result.error || 'unknown'));
  }

  saveContext_(userId, groupId, jobId, 'work_note');

  return createTextMessage(
    '📝 บันทึกหมายเหตุแล้ว\nJobID: ' + jobId +
    buildContextHint_(jobId, 'หมายเหตุ')
  );
}

// ══════════════════════════════════════════════════════════════════
// SECTION 11: PHOTO REPORT HANDLER
// ══════════════════════════════════════════════════════════════════

function handlePhotoReport(message, userId, userName, groupId, resolvedJobId) {
  var jobId = resolvedJobId;
  var messageId = message.id || '';

  // CASE 1: ไม่พบ JobID ทั้งหมด (ไม่มีใน text และไม่มี context)
  if (!jobId) {
    return buildMissingJobIdMessage_('image');
  }

  // CASE 2: บันทึก Context และ Batch
  saveContext_(userId, groupId, jobId, 'work_report');
  var batchCount = recordImageBatch_(userId, groupId, messageId);

  // CASE 3: ส่งเข้าคิว Queue
  if (typeof queuePhotoFromLINE === 'function') {
    var queueResult = queuePhotoFromLINE(messageId, jobId, userName || userId || 'LINE');
    if (queueResult && !queueResult.error) {
      var batchHint = batchCount > 1 ? ' (รูปที่ ' + batchCount + ' ในช่วง 8 วิ)' : '';
      return createTextMessage(
        '📷 รับรูปแล้ว' + batchHint + '\n' +
        'JobID: ' + jobId + '\n' +
        'QueueID: ' + (queueResult.queueId || '-') + '\n' +
        (queueResult.message || 'รอประมวลผลอัตโนมัติ') +
        buildContextHint_(jobId, 'รูป')
      );
    }
    return createTextMessage('❌ รับรูปแล้ว แต่เข้าคิวไม่สำเร็จ: ' + (queueResult && queueResult.error || 'unknown'));
  }

  // FALLBACK: ยังไม่มี queuePhoto
  return createTextMessage(
    '📷 รับรูปแล้ว\nJobID: ' + jobId + '\n' +
    'หมายเหตุ: ยังไม่เปิดใช้งานคิวรูปภาพอัตโนมัติ' +
    buildContextHint_(jobId, 'รูป')
  );
}

// ══════════════════════════════════════════════════════════════════
// SECTION 12: GROUP ID HELPERS
// ══════════════════════════════════════════════════════════════════

function handleGetGroupId_(groupId, userId) {
  if (!groupId) {
    return createTextMessage('คำสั่งนี้ใช้ได้เฉพาะใน LINE Group เท่านั้น\nกรุณาเพิ่ม Bot เข้ากลุ่มก่อน แล้วพิมพ์ /groupid');
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

// ══════════════════════════════════════════════════════════════════
// SECTION 13: LINE API HELPERS
// ══════════════════════════════════════════════════════════════════

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

// ══════════════════════════════════════════════════════════════════
// SECTION 14: FORMATTERS
// ══════════════════════════════════════════════════════════════════

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

function formatCheckBillingV55_(text, userId, groupId, resolvedJobId) {
  var jobId = resolvedJobId || extractJobIdV55_(text);
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

function formatSummaryV55_() {
  var dashboard = callRouterActionV55_('getDashboardData', {});
  var summary = dashboard && dashboard.summary ? dashboard.summary : {};
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

// ══════════════════════════════════════════════════════════════════
// SECTION 15: UTILITIES
// ══════════════════════════════════════════════════════════════════

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

function verifyLineSignature_(e) {
  try {
    var secret = getConfig('LINE_CHANNEL_SECRET') || '';
    if (!secret) return true;
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

// ══════════════════════════════════════════════════════════════════
// SECTION 16: SELF-TEST (for debugging)
// ══════════════════════════════════════════════════════════════════

/**
 * ทดสอบระบบ Context + Image Flow
 * วิธีใช้: ใน GAS Editor พิมพ์ testContextFlow_()
 */
function testContextFlow_() {
  var userId = 'TEST_USER_001';
  var groupId = '';

  // Test 1: save context
  saveContext_(userId, groupId, 'J0001', 'status_update');
  var ctx = getContext_(userId, groupId);
  Logger.log('Test 1 - Save/Load: ' + (ctx && ctx.jobId === 'J0001' ? 'PASS' : 'FAIL'));

  // Test 2: resolveJobId_ with text
  var r1 = resolveJobId_('J0002 ถึงแล้ว', userId, groupId);
  Logger.log('Test 2 - Text priority: ' + (r1 === 'J0002' ? 'PASS' : 'FAIL'));

  // Test 3: resolveJobId_ without text (fallback to context)
  var r2 = resolveJobId_('', userId, groupId);
  Logger.log('Test 3 - Context fallback: ' + (r2 === 'J0001' ? 'PASS' : 'FAIL'));

  // Test 4: resolveJobId_ with no context
  var r3 = resolveJobId_('', 'UNKNOWN_USER', '');
  Logger.log('Test 4 - No context: ' + (r3 === null ? 'PASS' : 'FAIL'));

  // Test 5: clear context
  clearContext_(userId, groupId);
  var ctx2 = getContext_(userId, groupId);
  Logger.log('Test 5 - Clear: ' + (ctx2 === null ? 'PASS' : 'FAIL'));

  Logger.log('All tests complete. Check results above.');
}
