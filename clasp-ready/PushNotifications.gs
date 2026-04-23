// ============================================================
// PushNotifications.gs — Web Push + LINE Trigger
// COMPHONE SUPER APP V5.5
// ส่ง Push Notification ไปยัง PWA และ LINE พร้อมกัน
// ============================================================

// ===== VAPID Config (ต้องตั้งค่าใน Script Properties) =====
// VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT

/**
 * ส่ง Push Notification ไปยัง subscribers ทั้งหมด
 * @param {string} title - หัวข้อ
 * @param {string} body - เนื้อหา
 * @param {Object} options - { url, icon, badge, tag, data }
 */
function sendPushToAll(title, body, options) {
  options = options || {};
  var props = PropertiesService.getScriptProperties();
  var subJson = props.getProperty('PUSH_SUBSCRIBERS');
  if (!subJson) return { sent: 0, reason: 'No subscribers' };

  var subscribers;
  try { subscribers = JSON.parse(subJson); }
  catch(e) { return { sent: 0, error: 'Invalid subscribers JSON' }; }

  if (!Array.isArray(subscribers) || subscribers.length === 0) {
    return { sent: 0, reason: 'Empty subscriber list' };
  }

  var payload = JSON.stringify({
    title: title,
    body: body,
    icon: options.icon || '/comphone-superapp/pwa/icons/icon-192.png',
    badge: options.badge || '/comphone-superapp/pwa/icons/icon-72.png',
    url: options.url || '/',
    tag: options.tag || 'comphone-notif',
    data: options.data || {}
  });

  var sent = 0;
  var failed = 0;
  var toRemove = [];

  subscribers.forEach(function(sub, idx) {
    try {
      var result = sendWebPush_(sub, payload);
      if (result === 'gone') {
        toRemove.push(idx);
      } else if (result === 'ok') {
        sent++;
      } else {
        failed++;
      }
    } catch(e) {
      Logger.log('Push error for subscriber ' + idx + ': ' + e.toString());
      failed++;
    }
  });

  // ลบ subscribers ที่ไม่ valid แล้ว
  if (toRemove.length > 0) {
    toRemove.reverse().forEach(function(i) { subscribers.splice(i, 1); });
    props.setProperty('PUSH_SUBSCRIBERS', JSON.stringify(subscribers));
  }

  return { sent: sent, failed: failed, removed: toRemove.length };
}

/**
 * ส่ง Web Push ไปยัง subscription เดียว
 * ใช้ VAPID authentication
 */
function sendWebPush_(subscription, payloadStr) {
  var props = PropertiesService.getScriptProperties();
  var vapidPublic = props.getProperty('VAPID_PUBLIC_KEY');
  var vapidPrivate = props.getProperty('VAPID_PRIVATE_KEY');
  var vapidSubject = props.getProperty('VAPID_SUBJECT') || 'mailto:admin@comphone.com';

  if (!vapidPublic || !vapidPrivate) {
    Logger.log('VAPID keys not configured');
    return 'error';
  }

  var endpoint = subscription.endpoint;
  if (!endpoint) return 'invalid';

  // Build VAPID JWT
  var vapidToken = buildVapidJWT_(endpoint, vapidSubject, vapidPrivate);

  var headers = {
    'Content-Type': 'application/json',
    'TTL': '86400',
    'Authorization': 'vapid t=' + vapidToken + ', k=' + vapidPublic
  };

  try {
    var response = UrlFetchApp.fetch(endpoint, {
      method: 'POST',
      headers: headers,
      payload: payloadStr,
      muteHttpExceptions: true
    });

    var code = response.getResponseCode();
    if (code === 201 || code === 200) return 'ok';
    if (code === 410 || code === 404) return 'gone'; // subscription expired
    Logger.log('Push response ' + code + ': ' + response.getContentText());
    return 'error';
  } catch(e) {
    Logger.log('Push fetch error: ' + e.toString());
    return 'error';
  }
}

/**
 * Build VAPID JWT token (simplified)
 */
function buildVapidJWT_(endpoint, subject, privateKey) {
  var url = new URL(endpoint);
  var audience = url.protocol + '//' + url.hostname;
  var now = Math.floor(Date.now() / 1000);

  var header = base64UrlEncode_(JSON.stringify({ typ: 'JWT', alg: 'ES256' }));
  var claims = base64UrlEncode_(JSON.stringify({
    aud: audience,
    exp: now + 43200, // 12 hours
    sub: subject
  }));

  // Note: Full VAPID signing requires ES256 which GAS doesn't support natively
  // ใช้ web-push library หรือ Cloudflare Worker แทน
  // Return placeholder — ในการใช้งานจริงต้องใช้ Cloudflare Worker
  return header + '.' + claims + '.SIGNATURE_PLACEHOLDER';
}

function base64UrlEncode_(str) {
  return Utilities.base64EncodeWebSafe(str).replace(/=/g, '');
}

// ===== SUBSCRIBER MANAGEMENT =====

/**
 * บันทึก Push Subscription จาก PWA
 */
function savePushSubscription(data) {
  if (!data || !data.endpoint) return { success: false, error: 'Invalid subscription' };

  var props = PropertiesService.getScriptProperties();
  var subJson = props.getProperty('PUSH_SUBSCRIBERS') || '[]';
  var subscribers;
  try { subscribers = JSON.parse(subJson); }
  catch(e) { subscribers = []; }

  // ตรวจว่ามีแล้วหรือไม่
  var exists = subscribers.some(function(s) { return s.endpoint === data.endpoint; });
  if (!exists) {
    subscribers.push({
      endpoint: data.endpoint,
      keys: data.keys || {},
      username: data.username || 'unknown',
      subscribedAt: new Date().toISOString()
    });
    props.setProperty('PUSH_SUBSCRIBERS', JSON.stringify(subscribers));
  }

  return { success: true, total: subscribers.length };
}

/**
 * ลบ Push Subscription
 */
function removePushSubscription(data) {
  if (!data || !data.endpoint) return { success: false };

  var props = PropertiesService.getScriptProperties();
  var subJson = props.getProperty('PUSH_SUBSCRIBERS') || '[]';
  var subscribers;
  try { subscribers = JSON.parse(subJson); }
  catch(e) { return { success: false }; }

  var before = subscribers.length;
  subscribers = subscribers.filter(function(s) { return s.endpoint !== data.endpoint; });
  props.setProperty('PUSH_SUBSCRIBERS', JSON.stringify(subscribers));

  return { success: true, removed: before - subscribers.length };
}

// ===== NOTIFICATION TRIGGERS =====

/**
 * แจ้งเตือนเมื่อมีงานใหม่
 */
function notifyNewJob(jobId, customerName, techName) {
  var title = '🔧 งานใหม่มาแล้ว!';
  var body = customerName + ' — มอบหมายให้ ' + (techName || 'ยังไม่ได้มอบหมาย');

  // Web Push
  sendPushToAll(title, body, {
    url: '/?page=jobs&id=' + jobId,
    tag: 'new-job-' + jobId,
    data: { jobId: jobId, type: 'new_job' }
  });

  // LINE Notification
  if (typeof sendLineNotification === 'function') {
    sendLineNotification('tech', title + '\n' + body + '\nJob: ' + jobId);
  }
}

/**
 * แจ้งเตือนเมื่องานเสร็จ
 */
function notifyJobComplete(jobId, customerName, techName) {
  var title = '✅ งานเสร็จแล้ว';
  var body = 'Job ' + jobId + ' — ' + customerName + '\nช่าง: ' + (techName || '-');

  sendPushToAll(title, body, {
    url: '/?page=jobs&id=' + jobId,
    tag: 'complete-job-' + jobId,
    data: { jobId: jobId, type: 'job_complete' }
  });

  if (typeof sendLineNotification === 'function') {
    sendLineNotification('admin', title + '\n' + body);
  }
}

/**
 * แจ้งเตือนสต็อกต่ำ (รันด้วย Trigger)
 */
function notifyLowStock() {
  var ss = SpreadsheetApp.openById(
    PropertiesService.getScriptProperties().getProperty('DB_SS_ID')
  );
  var sheet = ss.getSheetByName('DB_INVENTORY');
  if (!sheet) return;

  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var nameIdx = headers.indexOf('Item_Name');
  var qtyIdx = headers.indexOf('Qty');
  var reorderIdx = headers.indexOf('Reorder_Point');

  var lowItems = [];
  for (var i = 1; i < data.length; i++) {
    var qty = Number(data[i][qtyIdx] || 0);
    var reorder = Number(data[i][reorderIdx] || 0);
    if (qty <= reorder && reorder > 0) {
      lowItems.push(data[i][nameIdx] + ' (เหลือ ' + qty + ')');
    }
  }

  if (lowItems.length === 0) return;

  var title = '⚠️ สต็อกต่ำ ' + lowItems.length + ' รายการ';
  var body = lowItems.slice(0, 3).join('\n') + (lowItems.length > 3 ? '\n+อีก ' + (lowItems.length - 3) + ' รายการ' : '');

  sendPushToAll(title, body, {
    url: '/?page=inventory',
    tag: 'low-stock',
    data: { type: 'low_stock', count: lowItems.length }
  });

  if (typeof sendLineNotification === 'function') {
    sendLineNotification('admin', title + '\n' + body);
  }
}

/**
 * แจ้งเตือนรายวัน (รันตอน 08:00)
 */
function sendDailyBriefing() {
  var payload = getDashboardPayloadV55 ? getDashboardPayloadV55() : null;
  if (!payload || !payload.success) return;

  var d = payload.data || {};
  var title = '📊 สรุปวันนี้ — Comphone';
  var body = [
    'งานรอ: ' + (d.pendingJobs || 0),
    'งานเสร็จ: ' + (d.completedToday || 0),
    'รายได้วันนี้: ฿' + ((d.revenueToday || 0).toLocaleString())
  ].join('\n');

  sendPushToAll(title, body, {
    url: '/?page=dashboard',
    tag: 'daily-briefing',
    data: { type: 'daily_briefing' }
  });
}

/**
 * ตั้ง Triggers ทั้งหมด
 */
function setupNotificationTriggers() {
  // ลบ triggers เก่า
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (['notifyLowStock', 'sendDailyBriefing'].indexOf(t.getHandlerFunction()) >= 0) {
      ScriptApp.deleteTrigger(t);
    }
  });

  // Low Stock: ทุกวัน 09:00
  ScriptApp.newTrigger('notifyLowStock')
    .timeBased().everyDays(1).atHour(9).create();

  // Daily Briefing: ทุกวัน 08:00
  ScriptApp.newTrigger('sendDailyBriefing')
    .timeBased().everyDays(1).atHour(8).create();

  return { success: true, triggers: ['notifyLowStock@09:00', 'sendDailyBriefing@08:00'] };
}
