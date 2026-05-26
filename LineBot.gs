// COMPHONE SUPER APP v5.9.0-phase31a
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
  '555', 'ok', 'โอเค', 'รับทราบ', 'ครับ', 'ค่ะ', 'เดี๋ยว', 'ขอบคุณ', 'ฝนตก', 'รถติด', 'สวัสดี', 'hello', 'hi'
];

var LINE_ROOM_POLICIES_V55 = {
  TECHNICIAN: {
    label: 'ห้องช่าง',
    pendingJobId: '',
    noJobImage: 'รูปหน้างานต้องมี JobID เพื่อกันรูปหลุดงาน\nวิธีใช้: พิมพ์ JobID เช่น J0020 แล้วส่งรูปอีกครั้ง',
    queuedPrefix: 'รับรูปหน้างานเข้าคิวเรียบร้อย'
  },
  ACCOUNTING: {
    label: 'ห้องบัญชี',
    pendingJobId: 'ACCOUNTING_PENDING',
    noJobImage: 'รับรูปบัญชี/สลิปเข้าคิวเรียบร้อย',
    queuedPrefix: 'รับรูปบัญชี/สลิปเข้าคิวเรียบร้อย'
  },
  SALES: {
    label: 'ห้องขาย',
    pendingJobId: 'SALES_PENDING',
    noJobImage: 'รับรูปลูกค้า/ฝ่ายขายเข้าคิวเรียบร้อย',
    queuedPrefix: 'รับรูปลูกค้า/ฝ่ายขายเข้าคิวเรียบร้อย'
  },
  PROCUREMENT: {
    label: 'ห้องจัดซื้อ',
    pendingJobId: 'PROCUREMENT_PENDING',
    noJobImage: 'รับรูปสินค้า/อะไหล่เข้าคิวเรียบร้อย',
    queuedPrefix: 'รับรูปสินค้า/อะไหล่เข้าคิวเรียบร้อย'
  },
  EXECUTIVE: {
    label: 'ห้องผู้บริหาร',
    pendingJobId: 'EXECUTIVE_REVIEW',
    noJobImage: 'รับรูปสำหรับตรวจสอบภาพรวมเข้าคิวเรียบร้อย',
    queuedPrefix: 'รับรูปสำหรับผู้บริหารเข้าคิวเรียบร้อย'
  },
  UNKNOWN: {
    label: 'ห้องทั่วไป',
    pendingJobId: '',
    noJobImage: 'รับรูปแล้ว แต่ยังไม่รู้ว่าควรผูกกับงานใด\nกรุณาพิมพ์ JobID เช่น J0020 แล้วส่งรูปอีกครั้ง',
    queuedPrefix: 'รับรูปเข้าคิวเรียบร้อย'
  }
};

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
  var replyEnabled = isLineBotReplyEnabledV55_(groupId);
  if (responseMessage && replyToken && replyEnabled) {
    replyLineMessage(replyToken, normalizeLineMessagesV55_(responseMessage));
  }

  return {
    success: true,
    user_id: userId,
    message_type: message.type || '',
    replied: !!(responseMessage && replyToken && replyEnabled),
    reply_suppressed: !!(responseMessage && replyToken && !replyEnabled),
    bot_reply_enabled: replyEnabled
  };
}

function processLineMessage(message, userId, userName, groupId) {
  groupId = groupId || '';
  message = message || {};
  var text = message.text || '';
  var hasImage = message.type === 'image';
  var hasLocation = message.type === 'location';
  var isPrivateChat = !groupId;
  rememberLineJobContextV55_(text, userId, groupId);

  var classification = classifyMessage(text, hasImage, hasLocation);
  switch (classification.type) {
    case 'command':
      return handleCommand(classification, text, userId, userName, groupId);
    case 'location_share':
      return handleLocation(message, classification, userId, userName);
    case 'work_report':
      return handlePhotoReport(message, classification, userId, userName, groupId);
    case 'status_update':
      return handleStatus(classification, text, userId, userName);
  }
  
  if (classification.type === 'casual') {
    return isPrivateChat ? formatPrivateLineHelpV55_() : null;
  }
  if (classification.type === 'work_note' && classification.jobId) {
    var noteResult = handleWorkNote(classification, text, userId, userName);
    if (noteResult) return noteResult;
  }

  // ── AI LINE Agent: ใช้เฉพาะข้อความที่ตั้งใจถาม/วิเคราะห์ ไม่ดักทุกข้อความในห้องช่าง ──
  var aiRole = detectRoleFromGroupId_(groupId);
  if (aiRole && text) {
    var lowerText = text.toLowerCase();
    var aiKeywords = ['ai', '@ai', 'ผู้ช่วย', 'วิเคราะห์', 'analyze', 'insight', 'แนะนำ', 'ช่วยวิเคราะห์', 'ถามระบบ'];
    var shouldUseAI = false;
    
    for (var k = 0; k < aiKeywords.length; k++) {
      if (lowerText.indexOf(aiKeywords[k]) > -1) {
        shouldUseAI = true;
        break;
      }
    }
    
    if (shouldUseAI) {
      var aiResult = processWithAILineAgent(groupId, text, userName);
      if (aiResult) return aiResult;
    }
  }

  if (classification.type === 'work_note') return handleWorkNote(classification, text, userId, userName);
  return null;
}

function formatPrivateLineHelpV55_() {
  return createTextMessage([
    'สวัสดีครับ COMPHONE Bot พร้อมใช้งาน',
    'คำสั่งที่ใช้ได้:',
    '- /groupid ใช้ในกลุ่มเพื่อดู Group ID',
    '- เช็คงาน J0020',
    '- สรุป',
    '- ส่งรูปงานในกลุ่มพร้อม JobID เพื่อเข้า AI Vision',
    'ถ้าต้องการถาม AI ให้ขึ้นต้นด้วย "ai" หรือ "วิเคราะห์"'
  ].join('\n'));
}

function classifyMessage(text, hasImage, hasLocation) {
  text = String(text || '').trim();
  var normalized = text.toLowerCase();
  var jobIdMatch = text.match(/j\d{3,6}/i);
  var jobId = jobIdMatch ? String(jobIdMatch[0]).toUpperCase() : '';

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

function handlePhotoReport(message, classification, userId, userName, groupId) {
  var jobId = classification.jobId || getLineJobContextV55_(userId, groupId);
  var room = detectLineRoomNameV55_(groupId);
  if (!jobId) {
    var policy = getLineRoomPolicyV55_(room);
    if (policy.pendingJobId) {
      return queueRoomPendingPhotoV55_(message, userId, userName, room, policy);
    }
    return createTextMessage(policy.noJobImage);
  }

  if (typeof queuePhotoFromLINE === 'function') {
    var queueResult = queuePhotoFromLINE(message.id || '', jobId, userName || userId || 'LINE');
    if (queueResult && !queueResult.error) {
      var roomPolicy = getLineRoomPolicyV55_(room);
      return createTextMessage(roomPolicy.queuedPrefix + '\nJobID: ' + jobId + '\nQueueID: ' + (queueResult.queueId || '-') + '\n' + (queueResult.message || 'รอประมวลผลอัตโนมัติ'));
    }
    return createTextMessage('รับรูปแล้ว แต่เข้าคิวไม่สำเร็จ: ' + (queueResult && queueResult.error || 'unknown'));
  }

  return createTextMessage('รับรูปเรียบร้อย\nJobID: ' + jobId + '\nหมายเหตุ: ยังไม่เปิดใช้งานคิวรูปภาพอัตโนมัติในสคริปต์นี้');
}

function queueAccountingPhotoV55_(message, userId, userName) {
  return queueRoomPendingPhotoV55_(message, userId, userName, 'ACCOUNTING', getLineRoomPolicyV55_('ACCOUNTING'));
}

function queueRoomPendingPhotoV55_(message, userId, userName, room, policy) {
  policy = policy || getLineRoomPolicyV55_(room);
  var placeholderJobId = policy.pendingJobId || '';
  if (!placeholderJobId) return createTextMessage(policy.noJobImage);

  if (typeof queuePhotoFromLINE === 'function') {
    var queueResult = queuePhotoFromLINE(message.id || '', placeholderJobId, userName || userId || 'LINE_ACCOUNTING');
    if (queueResult && !queueResult.error) {
      return createTextMessage([
        policy.noJobImage,
        'QueueID: ' + (queueResult.queueId || '-'),
        'ห้อง: ' + policy.label,
        'สถานะ: รอผูกกับ JobID/บิล/รายการที่เกี่ยวข้อง',
        'ถ้าต้องการผูกทันที ให้พิมพ์ JobID เช่น J0020 แล้วส่งรูปอีกครั้ง'
      ].join('\n'));
    }
    return createTextMessage('รับรูปแล้ว แต่เข้าคิวไม่สำเร็จ: ' + (queueResult && queueResult.error || 'unknown'));
  }

  return createTextMessage('รับรูปแล้ว\nหมายเหตุ: ยังไม่เปิดใช้งานคิวรูปภาพอัตโนมัติในสคริปต์นี้');
}

function getLineRoomPolicyV55_(room) {
  room = String(room || 'UNKNOWN').toUpperCase();
  return LINE_ROOM_POLICIES_V55[room] || LINE_ROOM_POLICIES_V55.UNKNOWN;
}

function detectLineRoomNameV55_(groupId) {
  groupId = String(groupId || '').trim();
  if (!groupId) return 'PRIVATE';
  var rooms = {
    'C8ad22a115f38c9ad3cb5ea5c2ff4863b': 'TECHNICIAN',
    'C7b939d1d367e6b854690e58b392e88cc': 'ACCOUNTING',
    'Cfd103d59e77acf00e2f2f801d391c566': 'PROCUREMENT',
    'Cb7cc146227212f70e4f171ef3f2bce15': 'SALES',
    'Cb85204740fa90e38de63c727554e551a': 'EXECUTIVE'
  };
  return rooms[groupId] || 'UNKNOWN';
}

function isLineBotReplyEnabledV55_(groupId) {
  var room = detectLineRoomNameV55_(groupId);
  if (room === 'PRIVATE') return getLineBotReplySettingV55_('PRIVATE');
  if (room === 'UNKNOWN') return getLineBotReplySettingV55_('UNKNOWN');
  return getLineBotReplySettingV55_(room);
}

function getLineBotReplySettingV55_(room) {
  room = String(room || '').trim().toUpperCase();
  if (!room) return true;
  var key = 'LINE_BOT_REPLY_' + room + '_ENABLED';
  if (typeof getConfig !== 'function') return true;
  var value = String(getConfig(key, 'true') || 'true').toLowerCase();
  return value !== 'false' && value !== '0' && value !== 'off' && value !== 'disabled';
}

function rememberLineJobContextV55_(text, userId, groupId) {
  var jobId = extractJobIdV55_(text);
  if (!jobId) return;
  try {
    var cache = CacheService.getScriptCache();
    var keys = getLineJobContextKeysV55_(userId, groupId);
    for (var i = 0; i < keys.length; i++) cache.put(keys[i], jobId, 60 * 60 * 6);
  } catch (err) {
    Logger.log('rememberLineJobContextV55_ error: ' + err);
  }
}

function getLineJobContextV55_(userId, groupId) {
  try {
    var cache = CacheService.getScriptCache();
    var keys = getLineJobContextKeysV55_(userId, groupId);
    for (var i = 0; i < keys.length; i++) {
      var jobId = cache.get(keys[i]);
      if (jobId) return jobId;
    }
  } catch (err) {
    Logger.log('getLineJobContextV55_ error: ' + err);
  }
  return '';
}

function getLineJobContextKeysV55_(userId, groupId) {
  var keys = [];
  if (groupId && userId) keys.push('LINE_JOB_CTX_' + groupId + '_' + userId);
  if (groupId) keys.push('LINE_JOB_CTX_GROUP_' + groupId);
  if (userId) keys.push('LINE_JOB_CTX_USER_' + userId);
  return keys;
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
