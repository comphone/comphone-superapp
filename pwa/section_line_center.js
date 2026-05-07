(function(global) {
  'use strict';

  function lineApi(action, payload) {
    if (typeof global.callApi === 'function') return global.callApi(action, payload || {});
    if (typeof global.callAPI === 'function') return global.callAPI(action, payload || {});
    return Promise.reject(new Error('API client is not available'));
  }

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function(ch) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch];
    });
  }

  function statusBadge(ok) {
    return `<span class="line-badge ${ok ? 'ok' : 'warn'}">${ok ? 'พร้อม' : 'ยังไม่ตั้งค่า'}</span>`;
  }

  function renderShell(isMobile) {
    return `
      <style>
        .line-center-wrap{display:grid;gap:14px;padding:${isMobile ? '0 12px 90px' : '0'}}
        .line-center-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:12px}
        .line-card{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:14px;box-shadow:0 8px 24px rgba(15,23,42,.05)}
        .line-card h4{margin:0 0 8px;font-size:14px;color:#0f172a;display:flex;gap:8px;align-items:center}
        .line-metric{font-size:26px;font-weight:800;color:#0f766e;line-height:1}
        .line-muted{font-size:12px;color:#64748b}
        .line-room-row,.line-alert-row{display:flex;gap:10px;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid #f1f5f9}
        .line-room-row:last-child,.line-alert-row:last-child{border-bottom:0}
        .line-badge{font-size:11px;font-weight:700;border-radius:999px;padding:4px 8px;background:#fef3c7;color:#92400e;white-space:nowrap}
        .line-badge.ok{background:#dcfce7;color:#166534}.line-badge.warn{background:#fee2e2;color:#991b1b}
        .line-actions{display:flex;gap:8px;flex-wrap:wrap}
        .line-btn{border:0;border-radius:9px;padding:8px 11px;font-size:12px;font-weight:700;cursor:pointer;background:#0f766e;color:#fff}
        .line-btn.secondary{background:#e2e8f0;color:#0f172a}.line-btn.danger{background:#ef4444;color:#fff}
        .line-input,.line-select{width:100%;border:1px solid #cbd5e1;border-radius:9px;padding:9px;font-size:13px}
        .line-room-check{display:flex;align-items:center;gap:6px;font-size:12px;color:#334155}
        .line-preview{background:#f8fafc;border:1px dashed #cbd5e1;border-radius:10px;padding:10px;font-size:12px;color:#334155;white-space:pre-wrap}
      </style>
      <div class="line-center-wrap">
        <div class="line-center-grid" id="line-center-kpis">
          <div class="line-card"><h4><i class="bi bi-hourglass-split"></i> Pending</h4><div class="line-metric">-</div><div class="line-muted">alerts waiting for ack</div></div>
          <div class="line-card"><h4><i class="bi bi-check2-circle"></i> Ack Rate</h4><div class="line-metric">-</div><div class="line-muted">last 7 days</div></div>
          <div class="line-card"><h4><i class="bi bi-broadcast-pin"></i> Rooms</h4><div class="line-metric">-</div><div class="line-muted">configured LINE rooms</div></div>
        </div>
        <div class="line-center-grid">
          <div class="line-card">
            <h4><i class="bi bi-diagram-3"></i> LINE Rooms</h4>
            <div id="line-center-rooms"><div class="line-muted">Loading rooms...</div></div>
          </div>
          <div class="line-card">
            <h4><i class="bi bi-bell"></i> Alert Queue</h4>
            <div class="line-actions" style="margin-bottom:8px">
              <button class="line-btn secondary" onclick="refreshLineCommandCenter()">Refresh</button>
              <button class="line-btn" onclick="ackAllLineAlerts()">Ack all</button>
            </div>
            <div id="line-center-alerts"><div class="line-muted">Loading alerts...</div></div>
          </div>
        </div>
        <div class="line-card">
          <h4><i class="bi bi-send-check"></i> Safe Room Message</h4>
          <div class="line-center-grid">
            <div>
              <div class="line-muted" style="margin-bottom:6px">Rooms</div>
              <div id="line-center-room-checks"></div>
            </div>
            <div>
              <div class="line-muted" style="margin-bottom:6px">Message</div>
              <textarea id="line-message-text" class="line-input" rows="4" placeholder="พิมพ์ข้อความที่จะส่งเข้าห้อง LINE"></textarea>
              <div class="line-actions" style="margin-top:8px">
                <button class="line-btn secondary" onclick="previewLineMessage()">Preview</button>
                <button class="line-btn" onclick="sendLineMessageConfirmed()">Send with confirmation</button>
              </div>
            </div>
          </div>
          <div id="line-message-preview" class="line-preview" style="margin-top:10px">Preview will appear here.</div>
        </div>
        <div class="line-card">
          <h4><i class="bi bi-terminal"></i> LINE Commands</h4>
          <div id="line-center-commands" class="line-muted">#แจ้งเตือน, #กลุ่มแจ้งเตือน, #รับทราบทั้งหมด, #สถิติ</div>
        </div>
      </div>`;
  }

  function renderData(data) {
    data = data || {};
    const queue = data.queue || {};
    const analytics = data.analytics || {};
    const totals = analytics.totals || {};
    const rooms = data.rooms || [];
    const alerts = queue.alerts || [];
    const kpis = document.getElementById('line-center-kpis');
    if (kpis) {
      kpis.innerHTML = `
        <div class="line-card"><h4><i class="bi bi-hourglass-split"></i> Pending</h4><div class="line-metric">${alerts.length}</div><div class="line-muted">alerts waiting for ack</div></div>
        <div class="line-card"><h4><i class="bi bi-check2-circle"></i> Ack Rate</h4><div class="line-metric">${esc((analytics.quotaStatus || {}).ackRate || '0%')}</div><div class="line-muted">${totals.acknowledged || 0} acknowledged</div></div>
        <div class="line-card"><h4><i class="bi bi-broadcast-pin"></i> Rooms</h4><div class="line-metric">${rooms.filter(r => r.configured).length}/${rooms.length}</div><div class="line-muted">configured LINE rooms</div></div>`;
    }
    const roomEl = document.getElementById('line-center-rooms');
    if (roomEl) {
      roomEl.innerHTML = rooms.map(room => `
        <div class="line-room-row">
          <div><strong>${esc(room.label || room.id)}</strong><div class="line-muted">${esc(room.key)} ${room.groupTail ? '...' + esc(room.groupTail) : ''}</div></div>
          ${statusBadge(room.configured)}
        </div>`).join('') || '<div class="line-muted">No rooms found.</div>';
    }
    const checks = document.getElementById('line-center-room-checks');
    if (checks) {
      checks.innerHTML = rooms.map(room => `
        <label class="line-room-check">
          <input type="checkbox" value="${esc(room.id)}" ${room.configured ? '' : 'disabled'} ${room.id === 'EXECUTIVE' ? 'checked' : ''}>
          ${esc(room.label || room.id)} ${room.configured ? '' : '(not configured)'}
        </label>`).join('');
    }
    const alertEl = document.getElementById('line-center-alerts');
    if (alertEl) {
      alertEl.innerHTML = alerts.slice(0, 8).map(alert => `
        <div class="line-alert-row">
          <div>
            <strong>${esc(alert.type || 'ALERT')}</strong>
            <div class="line-muted">${esc((alert.data && (alert.data.detail || alert.data.jobId)) || alert.id || '')}</div>
          </div>
          <button class="line-btn secondary" onclick="ackLineAlert('${esc(alert.id)}')">Ack</button>
        </div>`).join('') || '<div class="line-muted">No pending alerts.</div>';
    }
    const cmdEl = document.getElementById('line-center-commands');
    if (cmdEl && data.commands) {
      cmdEl.innerHTML = data.commands.map(cmd => `<div><strong>${esc(cmd.command)}</strong> <span class="line-muted">${esc(cmd.detail)}</span></div>`).join('');
    }
  }

  async function refreshLineCommandCenter() {
    const mounts = ['line-center-rooms', 'line-center-alerts'];
    mounts.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = '<div class="line-muted">Loading...</div>';
    });
    try {
      const res = await lineApi('getLineCommandCenter', { days: 7 });
      renderData(res && res.data ? res.data : res);
    } catch (error) {
      const el = document.getElementById('line-center-alerts');
      if (el) el.innerHTML = `<div class="line-muted">Error: ${esc(error.message)}</div>`;
    }
  }

  function selectedRooms() {
    return Array.from(document.querySelectorAll('#line-center-room-checks input:checked')).map(input => input.value);
  }

  async function previewLineMessage() {
    const message = document.getElementById('line-message-text')?.value || '';
    const previewEl = document.getElementById('line-message-preview');
    try {
      const res = await lineApi('previewLineRoomMessage', { rooms: selectedRooms(), message });
      const data = res && res.data ? res.data : res;
      if (previewEl) previewEl.textContent = JSON.stringify(data, null, 2);
    } catch (error) {
      if (previewEl) previewEl.textContent = error.message;
    }
  }

  async function sendLineMessageConfirmed() {
    const message = document.getElementById('line-message-text')?.value || '';
    if (!message.trim()) return alert('Please enter a message.');
    if (!confirm('Send this message to selected LINE rooms?')) return;
    const previewEl = document.getElementById('line-message-preview');
    try {
      const res = await lineApi('sendLineRoomMessage', {
        rooms: selectedRooms(),
        message,
        confirm: 'SEND_LINE_ROOM_MESSAGE'
      });
      if (previewEl) previewEl.textContent = JSON.stringify(res && res.data ? res.data : res, null, 2);
      refreshLineCommandCenter();
    } catch (error) {
      if (previewEl) previewEl.textContent = error.message;
    }
  }

  async function ackLineAlert(id) {
    await lineApi('acknowledgeLineAlert', { alertId: id });
    refreshLineCommandCenter();
  }

  async function ackAllLineAlerts() {
    if (!confirm('Acknowledge all pending LINE alerts?')) return;
    await lineApi('bulkAcknowledgeLineAlerts', { all: true });
    refreshLineCommandCenter();
  }

  function renderLineCenterSection() {
    return renderShell(false);
  }

  function renderMobileLineCenterPage() {
    const el = document.getElementById('line-center-content') || document.getElementById('page-line-center');
    if (!el) return;
    el.innerHTML = renderShell(true);
    refreshLineCommandCenter();
  }

  function hydrateLineCenterPanel() {
    refreshLineCommandCenter();
  }

  global.renderLineCenterSection = renderLineCenterSection;
  global.renderMobileLineCenterPage = renderMobileLineCenterPage;
  global.hydrateLineCenterPanel = hydrateLineCenterPanel;
  global.refreshLineCommandCenter = refreshLineCommandCenter;
  global.previewLineMessage = previewLineMessage;
  global.sendLineMessageConfirmed = sendLineMessageConfirmed;
  global.ackLineAlert = ackLineAlert;
  global.ackAllLineAlerts = ackAllLineAlerts;
})(typeof window !== 'undefined' ? window : globalThis);
