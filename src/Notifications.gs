// ==========================================
// Notifications.gs
// COMPHONE SUPER APP - LINE Messaging API Alerts
// ==========================================

function notifyNewJobToLineGroup(jobData) {
  const payload = jobData || {};
  const lineConfig = getLineMessagingConfig();
  if (!lineConfig.enabled) {
    return apiError('notifyNewJobToLineGroup', 'LINE_DISABLED', 'LINE Messaging API ยังไม่ได้เปิดใช้งาน', {});
  }

  const text = buildNewJobLineMessage(payload);
  return sendLinePushMessage(lineConfig.groupId, [
    { type: 'text', text: text }
  ]);
}

function buildNewJobLineMessage(jobData) {
  const d = jobData || {};
  const lines = [
    '🆕 แจ้งงานใหม่เข้าระบบ',
    'รหัสงาน: ' + safeTrim(d.jobId || d.JobID),
    'ลูกค้า: ' + safeTrim(d.customer || d['ชื่อลูกค้า']),
    'นัดหมาย: ' + safeTrim(d.appointment || d['นัดหมาย']),
    'สถานะ: ' + safeTrim(d.status || d['สถานะ'] || 'Pending')
  ];

  const phone = safeTrim(d.phone || d['เบอร์โทร']);
  const device = safeTrim(d.device || d['รุ่น/อุปกรณ์']);
  const symptom = safeTrim(d.symptom || d['อาการเสีย']);
  const jobUrl = d.jobUrl || (d.jobId || d.JobID ? WEB_APP_URL + '?job=' + encodeURIComponent(d.jobId || d.JobID) : '');
  const uploadUrl = d.uploadUrl || (d.jobId || d.JobID ? WEB_APP_URL + '?job=' + encodeURIComponent(d.jobId || d.JobID) + '&tab=upload' : '');

  if (phone) lines.push('โทร: ' + phone);
  if (device) lines.push('อุปกรณ์: ' + device);
  if (symptom) lines.push('อาการ/รายละเอียด: ' + symptom);
  if (jobUrl) lines.push('เปิดงาน: ' + jobUrl);
  if (uploadUrl) lines.push('อัปโหลดรูป: ' + uploadUrl);

  return lines.join('\n');
}

function notifyLowStockToLineGroup(summaryData) {
  const lineConfig = getLineMessagingConfig();
  if (!lineConfig.enabled) {
    return apiError('notifyLowStockToLineGroup', 'LINE_DISABLED', 'LINE Messaging API ยังไม่ได้เปิดใช้งาน', {});
  }

  const s = summaryData || {};
  const text = [
    '📦 แจ้งเตือนสต๊อก',
    'สินค้าทั้งหมด: ' + toNumber(s.totalItems),
    'ใกล้หมด: ' + toNumber(s.lowStock),
    'หมดสต๊อก: ' + toNumber(s.outOfStock)
  ].join('\n');

  return sendLinePushMessage(lineConfig.groupId, [
    { type: 'text', text: text }
  ]);
}

function sendLinePushMessage(to, messages) {
  const lineConfig = getLineMessagingConfig();
  if (!lineConfig.channelAccessToken) {
    return apiError('sendLinePushMessage', 'LINE_TOKEN_MISSING', 'ไม่พบ LINE Channel Access Token', {});
  }
  if (!to) {
    return apiError('sendLinePushMessage', 'LINE_TARGET_MISSING', 'ไม่พบ LINE target/group id', {});
  }

  const url = 'https://api.line.me/v2/bot/message/push';
  const payload = {
    to: to,
    messages: messages || []
  };

  try {
    const response = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      headers: {
        Authorization: 'Bearer ' + lineConfig.channelAccessToken
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });

    const code = response.getResponseCode();
    const body = response.getContentText();

    if (code >= 200 && code < 300) {
      return apiSuccess('sendLinePushMessage', {
        code: code,
        body: body,
        messageCount: (messages || []).length
      });
    }

    return apiError('sendLinePushMessage', 'LINE_PUSH_FAILED', 'LINE push message ไม่สำเร็จ', {
      code: code,
      body: body
    });
  } catch (err) {
    return apiError('sendLinePushMessage', 'LINE_PUSH_EXCEPTION', err.message, { stack: err.stack || '' });
  }
}

function getLineMessagingConfig() {
  const props = PropertiesService.getScriptProperties();
  const token = safeTrim(props.getProperty('LINE_CHANNEL_ACCESS_TOKEN') || CONFIG.LINE_CHANNEL_ACCESS_TOKEN);
  const groupId = safeTrim(props.getProperty('LINE_GROUP_ID') || CONFIG.LINE_GROUP_ID);

  return {
    enabled: !!(token && groupId),
    channelAccessToken: token,
    groupId: groupId
  };
}
