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
  var userId = source.userId || source.groupId || source.roomId || '';
  var userName = getLineDisplayNameV55_(userId) || 'LINE_USER';

  if (event.type !== 'message') {
    return { success: true, skipped: true, reason: 'unsupported_event_type', type: event.type || '' };
  }

  var responseMessage = processLineMessage(message, userId, userName);
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

function processLineMessage(message, userId, userName) {
  message = message || {};
  var text = message.text || '';
  var hasImage = message.type === 'image';
  var hasLocation = message.type === 'location';
  var classification = classifyMessage(text, hasImage, hasLocation);

  if (classification.type === 'casual') return null;

  switch (classification.type) {
    case 'command':
      return handleCommand(classification, text, userId, userName);
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

function classifyMessage(text, hasImage, hasLocation) {
  text = String(text || '').trim();
  var normalized = text.toLowerCase();
  var jobIdMatch = text.match(/j\d{3,6}/i);
  var jobId = jobIdMatch ? String(jobIdMatch[0]).toUpperCase() : '';

  if (/^(#?เปิดงาน|create job)/i.test(text)) return { type: 'command', command: 'open_job', jobId: jobId };
  if (/^(#?ปิดงาน|close job)/i.test(text)) return { type: 'command', command: 'close_job', jobId: jobId };
  if (/^(#?เช็คงาน|check job)/i.test(text)) return { type: 'command', command: 'check_job', jobId: jobId };
  if (/^(#?เช็คสต็อก|check stock)/i.test(text)) return { type: 'command', command: 'check_stock', jobId: jobId };
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

function handleCommand(classification, text, userId, userName) {
  switch (classification.command) {
    case 'open_job':
      return handleOpenJob(text, userId, userName);
    case 'close_job':
      return handleCloseJob(text, userId, userName);
    case 'check_job':
      return formatCheckJobsV55_(text);
    case 'check_stock':
      return formatCheckStockV55_(text);
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
