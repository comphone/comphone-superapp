// ============================================================
// COMPHONE SUPER APP — LINE Command Center
// Phase 188: Room status, alert queue controls, safe room push, notification toggles, and bot reply toggles
// ============================================================

var LINE_CENTER_ROOMS = [
  { id: 'EXECUTIVE', label: 'Executive', role: 'admin' },
  { id: 'TECHNICIAN', label: 'Technician', role: 'tech' },
  { id: 'ACCOUNTING', label: 'Accounting', role: 'finance' },
  { id: 'PROCUREMENT', label: 'Procurement', role: 'manager' },
  { id: 'SALES', label: 'Sales', role: 'manager' },
  { id: 'OWNER', label: 'Owner', role: 'admin' },
  { id: 'ADMIN', label: 'Admin', role: 'admin' },
  { id: 'PRIVATE', label: 'Private Chat', role: 'support' },
  { id: 'UNKNOWN', label: 'Unknown Rooms', role: 'ops' }
];

function getLineNotificationSettings(params) {
  params = params || {};
  return {
    success: true,
    status: 'ok',
    mode: 'notification-only-toggle',
    note: 'Notification toggles suppress outbound LINE pushes only. Bot reply toggles suppress webhook replies only. Backend processing, Vision logs, queues, and audit logs continue.',
    rooms: LINE_CENTER_ROOMS.map(function(room) {
      return _lineCenterRoomStatus_(room);
    })
  };
}

function getLineCommandCenter(params) {
  params = params || {};
  var role = params.role || '';
  var days = Number(params.days || 7);
  var cacheKey = 'line:center:' + role + ':' + days + ':' + (!!params.includeAcknowledged);
  var cache = CacheService.getScriptCache();
  var cached = cache.get(cacheKey);
  if (cached) {
    var parsed = JSON.parse(cached);
    parsed.cached = true;
    return parsed;
  }
  var queue = (typeof getIntelAlertQueue === 'function')
    ? getIntelAlertQueue({ role: role, includeAcknowledged: !!params.includeAcknowledged })
    : { success: false, alerts: [] };
  var grouped = (typeof getGroupedAlerts === 'function')
    ? getGroupedAlerts({ role: role })
    : { success: false, groups: [] };
  var analytics = (typeof getAlertAnalytics === 'function')
    ? getAlertAnalytics(days)
    : { success: false, totals: {} };

  var response = {
    success: true,
    cached: false,
    status: 'ok',
    version: '65-line-command-center',
    rooms: getLineRoomStatus(params).rooms,
    queue: queue,
    grouped: grouped,
    analytics: analytics,
    commands: [
      { command: '#แจ้งเตือน', detail: 'Pull pending alerts for current LINE user/role' },
      { command: '#กลุ่มแจ้งเตือน', detail: 'Show grouped alert cards' },
      { command: '#รับทราบทั้งหมด', detail: 'Acknowledge all pending alerts' },
      { command: '#สถิติ', detail: 'Show 7-day alert analytics' }
    ]
  };
  try { cache.put(cacheKey, JSON.stringify(response), 60); } catch (_cacheErr) {}
  return response;
}

function getLineRoomStatus(params) {
  params = params || {};
  var rooms = LINE_CENTER_ROOMS.map(function(room) {
    return _lineCenterRoomStatus_(room);
  });
  return {
    success: true,
    status: 'ok',
    tokenConfigured: !!(typeof getConfig === 'function' && getConfig('LINE_CHANNEL_ACCESS_TOKEN', '')),
    rooms: rooms,
    configured: rooms.filter(function(room) { return room.configured; }).length,
    total: rooms.length
  };
}

function acknowledgeLineAlert(params) {
  params = params || {};
  var alertId = params.alertId || params.id || '';
  var ackBy = params.lineUserId || params.user || params.username || 'dashboard';
  if (!alertId) return { success: false, error: 'alertId is required' };
  return acknowledgeAlert(alertId, ackBy);
}

function bulkAcknowledgeLineAlerts(params) {
  params = params || {};
  var ids = params.alertIds || params.ids || [];
  if (typeof ids === 'string') ids = ids.split(',').map(function(id) { return id.trim(); }).filter(Boolean);
  if (!ids.length && params.all) {
    var q = getIntelAlertQueue({ includeAcknowledged: false });
    ids = (q.alerts || []).map(function(alert) { return alert.id; });
  }
  return bulkAcknowledge(ids, params.lineUserId || params.user || params.username || 'dashboard');
}

function previewLineRoomMessage(params) {
  params = params || {};
  var rooms = _lineCenterNormalizeRooms_(params.rooms || params.room || params.targetRooms);
  var message = String(params.message || params.text || '').trim();
  var roomStatus = getLineRoomStatus({}).rooms;
  var statusById = {};
  roomStatus.forEach(function(room) { statusById[room.id] = room; });
  return {
    success: true,
    status: 'ok',
    dryRun: true,
    messagePreview: message.substring(0, 500),
    rooms: rooms.map(function(room) {
      var enabled = _lineCenterIsRoomNotificationEnabled_(room);
      return {
        id: room,
        configured: !!(statusById[room] && statusById[room].configured),
        notificationEnabled: enabled,
        willNotify: enabled && !!(statusById[room] && statusById[room].configured),
        key: 'LINE_GROUP_' + room
      };
    })
  };
}

function sendLineRoomMessage(params) {
  params = params || {};
  if (params.confirm !== 'SEND_LINE_ROOM_MESSAGE') {
    return {
      success: false,
      code: 'CONFIRM_REQUIRED',
      error: 'confirm must be SEND_LINE_ROOM_MESSAGE',
      preview: previewLineRoomMessage(params)
    };
  }
  var rooms = _lineCenterNormalizeRooms_(params.rooms || params.room || params.targetRooms);
  var message = String(params.message || params.text || '').trim();
  if (!message) return { success: false, error: 'message is required' };

  var results = rooms.map(function(room) {
    var groupId = _lineCenterResolveRoomId_(room);
    if (!groupId) return { room: room, success: false, error: 'LINE group is not configured' };
    if (!_lineCenterIsRoomNotificationEnabled_(room)) {
      _lineCenterRecordSuppressedNotification_(room, message, 'MANUAL_LINE_ROOM_MESSAGE');
      return { room: room, success: true, skipped: true, notificationEnabled: false, reason: 'room notifications disabled; backend log retained' };
    }
    try {
      if (typeof sendLinePush === 'function') return Object.assign({ room: room }, sendLinePush(message, groupId));
      if (typeof pushLineMessage === 'function') return Object.assign({ room: room }, pushLineMessage(groupId, message));
      return { room: room, success: false, error: 'No LINE push adapter available' };
    } catch (e) {
      return { room: room, success: false, error: e.message };
    }
  });

  if (typeof _recordAnalytics_ === 'function') {
    _recordAnalytics_('push', { alertType: 'MANUAL_LINE_ROOM_MESSAGE', count: results.length });
  }
  if (typeof writeAuditLog === 'function') {
    try { writeAuditLog('LINE_ROOM_MESSAGE_SEND', 'SYSTEM', { rooms: rooms, successCount: results.filter(function(r) { return r.success; }).length }); } catch (_) {}
  }
  return {
    success: results.some(function(r) { return r.success; }),
    status: 'ok',
    results: results,
    preview: previewLineRoomMessage(params)
  };
}

function updateLineNotificationSettings(params) {
  params = params || {};
  var rooms = _lineCenterNormalizeRooms_(params.rooms || params.room || params.targetRooms);
  var enabled = params.enabled;
  if (typeof enabled === 'string') enabled = enabled.toLowerCase() !== 'false' && enabled !== '0' && enabled.toLowerCase() !== 'off';
  enabled = enabled !== false;
  var changed = [];
  for (var i = 0; i < rooms.length; i++) {
    var room = rooms[i];
    var key = _lineCenterNotificationKey_(room);
    if (!key) continue;
    if (typeof setConfig === 'function') setConfig(key, enabled ? 'true' : 'false');
    else PropertiesService.getScriptProperties().setProperty(key, enabled ? 'true' : 'false');
    changed.push({ room: room, key: key, notificationEnabled: enabled });
  }
  if (typeof writeAuditLog === 'function') {
    try {
      writeAuditLog('LINE_NOTIFICATION_SETTINGS_UPDATE', 'SYSTEM', {
        rooms: rooms,
        enabled: enabled,
        note: 'Notification toggle only; backend processing remains active.'
      });
    } catch (_) {}
  }
  try {
    CacheService.getScriptCache().removeAll(['line:center::7:false', 'line:center::7:true']);
  } catch (_cacheErr) {}
  return {
    success: true,
    status: 'ok',
    changed: changed,
    settings: getLineNotificationSettings({}).rooms
  };
}

function updateLineBotReplySettings(params) {
  params = params || {};
  var rooms = _lineCenterNormalizeRooms_(params.rooms || params.room || params.targetRooms);
  var enabled = params.enabled;
  if (typeof enabled === 'string') enabled = enabled.toLowerCase() !== 'false' && enabled !== '0' && enabled.toLowerCase() !== 'off';
  enabled = enabled !== false;
  var changed = [];
  for (var i = 0; i < rooms.length; i++) {
    var room = rooms[i];
    var key = _lineCenterBotReplyKey_(room);
    if (!key) continue;
    if (typeof setConfig === 'function') setConfig(key, enabled ? 'true' : 'false');
    else PropertiesService.getScriptProperties().setProperty(key, enabled ? 'true' : 'false');
    changed.push({ room: room, key: key, botReplyEnabled: enabled });
  }
  if (typeof writeAuditLog === 'function') {
    try {
      writeAuditLog('LINE_BOT_REPLY_SETTINGS_UPDATE', 'SYSTEM', {
        rooms: rooms,
        enabled: enabled,
        note: 'Bot reply toggle only; backend processing remains active.'
      });
    } catch (_) {}
  }
  try {
    CacheService.getScriptCache().removeAll(['line:center::7:false', 'line:center::7:true']);
  } catch (_cacheErr) {}
  return {
    success: true,
    status: 'ok',
    changed: changed,
    settings: getLineNotificationSettings({}).rooms
  };
}

function queueLineCommandAlert(params) {
  params = params || {};
  var alertType = params.alertType || params.type || 'MANUAL_ALERT';
  var data = params.data || {
    detail: params.detail || params.message || 'Manual alert from COMPHONE dashboard',
    value: params.value
  };
  var options = {
    priority: params.priority,
    ttlMin: params.ttlMin,
    targetRoles: params.targetRoles,
    targetUsers: params.targetUsers,
    groupKey: params.groupKey || alertType
  };
  return queueAlertIntelligent(alertType, data, options);
}

function _lineCenterNormalizeRooms_(rooms) {
  if (!rooms) return ['EXECUTIVE'];
  if (typeof rooms === 'string') {
    var raw = rooms.trim();
    if (raw.charAt(0) === '[') {
      try {
        var parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) rooms = parsed;
      } catch (_) {}
    }
    if (typeof rooms === 'string') rooms = rooms.split(',');
  }
  return rooms.map(function(room) { return String(room || '').trim().toUpperCase(); })
    .filter(function(room, index, all) { return room && all.indexOf(room) === index; });
}

function _lineCenterResolveRoomId_(room) {
  room = String(room || '').trim().toUpperCase();
  if (!room) return '';
  if (typeof _getRoomGroupId === 'function') {
    try {
      var direct = _getRoomGroupId(room);
      if (direct) return direct;
    } catch (_) {}
  }
  if (typeof getConfig !== 'function') return '';
  return getConfig('LINE_GROUP_' + room, '') || getConfig('LINE_' + room + '_GROUP_ID', '');
}

function _lineCenterNotificationKey_(room) {
  room = String(room || '').trim().toUpperCase();
  return room ? 'LINE_NOTIFY_' + room + '_ENABLED' : '';
}

function _lineCenterBotReplyKey_(room) {
  room = String(room || '').trim().toUpperCase();
  return room ? 'LINE_BOT_REPLY_' + room + '_ENABLED' : '';
}

function _lineCenterIsRoomNotificationEnabled_(room) {
  var key = _lineCenterNotificationKey_(room);
  if (!key || typeof getConfig !== 'function') return true;
  var value = String(getConfig(key, 'true') || 'true').toLowerCase();
  return value !== 'false' && value !== '0' && value !== 'off' && value !== 'disabled';
}

function _lineCenterRoomStatus_(room) {
  var groupId = _lineCenterResolveRoomId_(room.id);
  var enabled = _lineCenterIsRoomNotificationEnabled_(room.id);
  var botReplyEnabled = _lineCenterIsBotReplyEnabled_(room.id);
  return {
    id: room.id,
    label: room.label,
    role: room.role,
    configured: !!groupId,
    notificationEnabled: enabled,
    botReplyEnabled: botReplyEnabled,
    notificationKey: _lineCenterNotificationKey_(room.id),
    botReplyKey: _lineCenterBotReplyKey_(room.id),
    key: 'LINE_GROUP_' + room.id,
    groupTail: groupId ? String(groupId).slice(-6) : ''
  };
}

function _lineCenterIsBotReplyEnabled_(room) {
  var key = _lineCenterBotReplyKey_(room);
  if (!key || typeof getConfig !== 'function') return true;
  var value = String(getConfig(key, 'true') || 'true').toLowerCase();
  return value !== 'false' && value !== '0' && value !== 'off' && value !== 'disabled';
}

function _lineCenterRecordSuppressedNotification_(room, message, source) {
  var summary = {
    room: String(room || '').toUpperCase(),
    source: source || 'LINE_NOTIFICATION_SUPPRESSED',
    messagePreview: String(message || '').substring(0, 500),
    reason: 'room notifications disabled',
    backendContinues: true
  };
  if (typeof writeAuditLog === 'function') {
    try { writeAuditLog('LINE_NOTIFICATION_SUPPRESSED', 'SYSTEM', summary); } catch (_) {}
  }
  if (typeof queueAlertIntelligent === 'function') {
    try {
      queueAlertIntelligent('LINE_NOTIFICATION_SUPPRESSED', summary, {
        priority: 'low',
        groupKey: 'LINE_NOTIFICATION_SUPPRESSED_' + summary.room,
        targetRoles: ['admin']
      });
    } catch (_) {}
  }
  return summary;
}
