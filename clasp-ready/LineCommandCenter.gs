// ============================================================
// COMPHONE SUPER APP — LINE Command Center
// Phase 65: Room status, alert queue controls, and safe room push
// ============================================================

var LINE_CENTER_ROOMS = [
  { id: 'EXECUTIVE', label: 'Executive', role: 'admin' },
  { id: 'TECHNICIAN', label: 'Technician', role: 'tech' },
  { id: 'ACCOUNTING', label: 'Accounting', role: 'finance' },
  { id: 'PROCUREMENT', label: 'Procurement', role: 'manager' },
  { id: 'SALES', label: 'Sales', role: 'manager' },
  { id: 'OWNER', label: 'Owner', role: 'admin' },
  { id: 'ADMIN', label: 'Admin', role: 'admin' }
];

function getLineCommandCenter(params) {
  params = params || {};
  var role = params.role || '';
  var days = Number(params.days || 7);
  var queue = (typeof getIntelAlertQueue === 'function')
    ? getIntelAlertQueue({ role: role, includeAcknowledged: !!params.includeAcknowledged })
    : { success: false, alerts: [] };
  var grouped = (typeof getGroupedAlerts === 'function')
    ? getGroupedAlerts({ role: role })
    : { success: false, groups: [] };
  var analytics = (typeof getAlertAnalytics === 'function')
    ? getAlertAnalytics(days)
    : { success: false, totals: {} };

  return {
    success: true,
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
}

function getLineRoomStatus(params) {
  params = params || {};
  var rooms = LINE_CENTER_ROOMS.map(function(room) {
    var groupId = _lineCenterResolveRoomId_(room.id);
    return {
      id: room.id,
      label: room.label,
      role: room.role,
      configured: !!groupId,
      key: 'LINE_GROUP_' + room.id,
      groupTail: groupId ? String(groupId).slice(-6) : ''
    };
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
      return {
        id: room,
        configured: !!(statusById[room] && statusById[room].configured),
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
  if (typeof rooms === 'string') rooms = rooms.split(',');
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
