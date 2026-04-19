/**
 * notification_center.js — Notification Center (Sprint 3 — TASK 4)
 * COMPHONE SUPER APP V5.5
 *
 * Components:
 *   4a. Notification List (in-app + mark read + clear all)
 *   4b. LINE Settings (test send + room config)
 *   4c. Daily Briefing (pull from cronMorningAlert data)
 *   4d. Web Push Settings (subscribe/unsubscribe)
 *
 * กฎ: ห้าม onclick inline — ใช้ addEventListener เท่านั้น
 */

'use strict';

/* ─── State ────────────────────────────────────────────────── */
const NOTIF_CENTER = {
  notifications: [],
  unreadCount:   0,
  tab:           'inbox'   /* 'inbox' | 'line' | 'briefing' | 'push' */
};

/* ══════════════════════════════════════════════════════════════
   ENTRY POINT
══════════════════════════════════════════════════════════════ */

/**
 * เปิด Notification Center modal
 */
function showNotificationCenter() {
  const modal = document.getElementById('modal-notif-center');
  if (!modal) return;
  modal.classList.remove('hidden');
  switchNotifTab_('inbox');
}

/* ══════════════════════════════════════════════════════════════
   SHELL + TABS
══════════════════════════════════════════════════════════════ */

function buildNotifCenterShell_() {
  if (document.getElementById('modal-notif-center')) return;

  const div = document.createElement('div');
  div.id = 'modal-notif-center';
  div.className = 'modal-overlay hidden';
  div.innerHTML = `
    <div class="modal-box modal-fullscreen" role="dialog" aria-modal="true">
      <div class="modal-header">
        <h6><i class="bi bi-bell-fill"></i> Notification Center</h6>
        <button class="modal-close" id="btn-close-notif-center"><i class="bi bi-x-lg"></i></button>
      </div>
      <div class="notif-tab-bar" id="notif-tab-bar">
        <button class="notif-tab active" data-tab="inbox">
          <i class="bi bi-inbox-fill"></i> กล่องข้อความ
          <span id="notif-unread-badge" class="notif-badge-sm hidden">0</span>
        </button>
        <button class="notif-tab" data-tab="line"><i class="bi bi-chat-dots-fill"></i> LINE</button>
        <button class="notif-tab" data-tab="briefing"><i class="bi bi-sun-fill"></i> Daily</button>
        <button class="notif-tab" data-tab="push"><i class="bi bi-phone-vibrate-fill"></i> Push</button>
      </div>
      <div id="notif-tab-content" class="modal-body" style="overflow-y:auto;max-height:calc(85vh - 110px)"></div>
    </div>`;
  document.body.appendChild(div);

  div.addEventListener('click', e => { if (e.target === div) div.classList.add('hidden'); });
  document.getElementById('btn-close-notif-center').addEventListener('click', () => div.classList.add('hidden'));
  document.getElementById('notif-tab-bar').addEventListener('click', e => {
    const btn = e.target.closest('.notif-tab');
    if (btn) switchNotifTab_(btn.dataset.tab);
  });
}

function switchNotifTab_(tab) {
  NOTIF_CENTER.tab = tab;
  document.querySelectorAll('#notif-tab-bar .notif-tab').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === tab);
  });
  const content = document.getElementById('notif-tab-content');
  if (!content) return;
  switch (tab) {
    case 'inbox':    renderNotifInbox_(content);    break;
    case 'line':     renderLINESettings_(content);  break;
    case 'briefing': renderDailyBriefing_(content); break;
    case 'push':     renderPushSettings_(content);  break;
  }
}

/* ══════════════════════════════════════════════════════════════
   4a. Notification Inbox
══════════════════════════════════════════════════════════════ */

function renderNotifInbox_(container) {
  /* ดึงจาก localStorage */
  const stored = JSON.parse(localStorage.getItem('comphone_notifications') || '[]');
  NOTIF_CENTER.notifications = stored;
  NOTIF_CENTER.unreadCount   = stored.filter(n => !n.read).length;
  updateNotifBadge_();

  if (!stored.length) {
    container.innerHTML = `
      <div style="padding:40px;text-align:center">
        <i class="bi bi-bell-slash" style="font-size:40px;color:#d1d5db"></i>
        <p style="color:#9ca3af;margin-top:12px">ไม่มีการแจ้งเตือน</p>
      </div>`;
    return;
  }

  container.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px">
      <div style="font-size:13px;color:#6b7280">${stored.length} รายการ · ${NOTIF_CENTER.unreadCount} ยังไม่อ่าน</div>
      <button id="btn-clear-all-notif" class="btn-link" style="color:#ef4444;font-size:13px">ลบทั้งหมด</button>
    </div>
    <div id="notif-inbox-list">
      ${stored.map((n, idx) => `
        <div class="notif-item ${n.read ? '' : 'notif-unread'}" data-notif-idx="${idx}">
          <div class="notif-icon-wrap" style="background:${notifTypeColor_(n.type)}22;color:${notifTypeColor_(n.type)}">
            <i class="bi bi-${notifTypeIcon_(n.type)}"></i>
          </div>
          <div style="flex:1;min-width:0">
            <div style="font-weight:${n.read ? '400' : '700'};font-size:14px">${n.title || 'แจ้งเตือน'}</div>
            <div style="font-size:12px;color:#6b7280;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${n.body || ''}</div>
            <div style="font-size:11px;color:#9ca3af;margin-top:2px">${n.time ? new Date(n.time).toLocaleString('th-TH') : ''}</div>
          </div>
          ${!n.read ? '<div class="notif-dot"></div>' : ''}
        </div>`).join('')}
    </div>`;

  /* bind */
  document.getElementById('btn-clear-all-notif').addEventListener('click', clearAllNotifications_);
  container.querySelectorAll('.notif-item').forEach(el => {
    el.addEventListener('click', () => markNotifRead_(parseInt(el.dataset.notifIdx, 10)));
  });
}

function notifTypeColor_(type) {
  return { job: '#3b82f6', billing: '#10b981', alert: '#ef4444', info: '#6b7280', line: '#06b6d4' }[type] || '#6b7280';
}

function notifTypeIcon_(type) {
  return { job: 'tools', billing: 'receipt-cutoff', alert: 'exclamation-triangle-fill', info: 'info-circle-fill', line: 'chat-dots-fill' }[type] || 'bell-fill';
}

function markNotifRead_(idx) {
  const stored = JSON.parse(localStorage.getItem('comphone_notifications') || '[]');
  if (stored[idx]) { stored[idx].read = true; }
  localStorage.setItem('comphone_notifications', JSON.stringify(stored));
  const content = document.getElementById('notif-tab-content');
  if (content) renderNotifInbox_(content);
}

function clearAllNotifications_() {
  if (!confirm('ลบการแจ้งเตือนทั้งหมด?')) return;
  localStorage.setItem('comphone_notifications', '[]');
  const content = document.getElementById('notif-tab-content');
  if (content) renderNotifInbox_(content);
  updateNotifBadge_();
}

/**
 * เพิ่ม notification ใหม่ (เรียกจาก modules อื่น)
 */
function pushNotification(title, body, type) {
  const stored = JSON.parse(localStorage.getItem('comphone_notifications') || '[]');
  stored.unshift({ title, body, type: type || 'info', time: Date.now(), read: false });
  if (stored.length > 100) stored.splice(100); /* เก็บแค่ 100 รายการ */
  localStorage.setItem('comphone_notifications', JSON.stringify(stored));
  updateNotifBadge_();

  /* Web Push local notification */
  if (typeof showLocalNotification === 'function') {
    showLocalNotification(title, body, { tag: type || 'info' });
  }
}

function updateNotifBadge_() {
  const stored = JSON.parse(localStorage.getItem('comphone_notifications') || '[]');
  const unread = stored.filter(n => !n.read).length;
  NOTIF_CENTER.unreadCount = unread;

  /* อัปเดต badge ใน top bar */
  const badge = document.getElementById('notif-count');
  if (badge) {
    badge.textContent = unread > 99 ? '99+' : String(unread);
    badge.style.display = unread > 0 ? '' : 'none';
  }

  /* อัปเดต badge ใน tab */
  const tabBadge = document.getElementById('notif-unread-badge');
  if (tabBadge) {
    tabBadge.textContent = unread;
    tabBadge.classList.toggle('hidden', unread === 0);
  }
}

/* ══════════════════════════════════════════════════════════════
   4b. LINE Settings
══════════════════════════════════════════════════════════════ */

function renderLINESettings_(container) {
  const lineToken = localStorage.getItem('comphone_line_token') || '';
  const lineRooms = [
    { key: 'TECHNICIAN', label: 'ห้องช่าง', icon: 'tools' },
    { key: 'MANAGEMENT', label: 'ห้องผู้บริหาร', icon: 'bar-chart-line' },
    { key: 'PROCUREMENT', label: 'ห้องจัดซื้อ', icon: 'cart-fill' },
    { key: 'CUSTOMER',    label: 'ลูกค้า (1:1)', icon: 'person-fill' }
  ];

  container.innerHTML = `
    <div style="padding:16px">
      <!-- Token Status -->
      <div class="notif-section">
        <div class="notif-section-title"><i class="bi bi-chat-dots-fill" style="color:#06b6d4"></i> LINE Channel Token</div>
        <div class="line-token-status ${lineToken ? 'line-token-ok' : 'line-token-missing'}">
          <i class="bi bi-${lineToken ? 'check-circle-fill' : 'exclamation-triangle-fill'}"></i>
          ${lineToken ? 'ตั้งค่าแล้ว' : 'ยังไม่ได้ตั้งค่า — ไปที่ Admin Panel > Config'}
        </div>
      </div>

      <!-- Test Send -->
      <div class="notif-section">
        <div class="notif-section-title">ทดสอบส่ง LINE</div>
        <div class="form-group">
          <label>ห้อง</label>
          <select id="line-test-room" class="form-control">
            ${lineRooms.map(r => `<option value="${r.key}">${r.label}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>ข้อความ</label>
          <textarea id="line-test-msg" class="form-control" rows="2" placeholder="ทดสอบส่งข้อความ...">ทดสอบจาก COMPHONE SuperApp ✅</textarea>
        </div>
        <button id="btn-line-test-send" class="btn-primary" ${!lineToken ? 'disabled' : ''}>
          <i class="bi bi-send-fill"></i> ส่งทดสอบ
        </button>
      </div>

      <!-- Room IDs Info -->
      <div class="notif-section">
        <div class="notif-section-title">ห้อง LINE ที่ใช้งาน</div>
        ${lineRooms.map(r => `
          <div class="line-room-row">
            <div class="line-room-icon"><i class="bi bi-${r.icon}"></i></div>
            <div>
              <div style="font-weight:600;font-size:13px">${r.label}</div>
              <div style="font-size:11px;color:#9ca3af">ตั้งค่าใน GAS Properties: LINE_GROUP_${r.key}</div>
            </div>
          </div>`).join('')}
      </div>
    </div>`;

  document.getElementById('btn-line-test-send').addEventListener('click', async () => {
    const room = document.getElementById('line-test-room').value;
    const msg  = document.getElementById('line-test-msg').value.trim();
    if (!msg) { showToast('⚠️ กรุณากรอกข้อความ'); return; }

    const btn = document.getElementById('btn-line-test-send');
    btn.disabled = true;
    btn.innerHTML = '<i class="bi bi-hourglass-split"></i> กำลังส่ง...';

    try {
      const res = await callApi('sendLineMessage', { room, message: msg });
      showToast(res.success ? '✅ ส่ง LINE สำเร็จ' : '❌ ' + (res.error || 'ส่งไม่สำเร็จ'));
    } catch (e) {
      showToast('❌ ' + e.message);
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="bi bi-send-fill"></i> ส่งทดสอบ';
    }
  });
}

/* ══════════════════════════════════════════════════════════════
   4c. Daily Briefing
══════════════════════════════════════════════════════════════ */

async function renderDailyBriefing_(container) {
  container.innerHTML = '<div class="loading-spinner-sm" style="margin:24px auto"></div>';

  try {
    /* ดึง Dashboard data เพื่อสรุป */
    const res = await callApi('getDashboardData', {});
    const d   = (res.success && res.data) ? res.data : {};

    const now = new Date();
    const greeting = now.getHours() < 12 ? '🌅 สวัสดีตอนเช้า' : now.getHours() < 17 ? '☀️ สวัสดีตอนบ่าย' : '🌙 สวัสดีตอนเย็น';
    const dateStr = now.toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    container.innerHTML = `
      <div style="padding:16px">
        <!-- Greeting -->
        <div class="briefing-header">
          <div style="font-size:20px;font-weight:800">${greeting}</div>
          <div style="font-size:13px;color:#6b7280;margin-top:4px">${dateStr}</div>
          <div style="font-size:13px;color:#6b7280">${APP.user?.full_name || APP.user?.username || ''}</div>
        </div>

        <!-- KPI Summary -->
        <div class="briefing-kpi-grid">
          <div class="briefing-kpi">
            <div class="briefing-kpi-num">${d.jobs_pending || 0}</div>
            <div class="briefing-kpi-label">งานรอดำเนินการ</div>
          </div>
          <div class="briefing-kpi">
            <div class="briefing-kpi-num">${d.jobs_inprog || 0}</div>
            <div class="briefing-kpi-label">กำลังซ่อม</div>
          </div>
          <div class="briefing-kpi">
            <div class="briefing-kpi-num">฿${Number(d.revenue_today || 0).toLocaleString()}</div>
            <div class="briefing-kpi-label">รายได้วันนี้</div>
          </div>
          <div class="briefing-kpi ${(d.low_stock_count || 0) > 0 ? 'briefing-kpi-warn' : ''}">
            <div class="briefing-kpi-num">${d.low_stock_count || 0}</div>
            <div class="briefing-kpi-label">สต็อกใกล้หมด</div>
          </div>
        </div>

        <!-- Alerts -->
        ${buildBriefingAlerts_(d)}

        <!-- Send Morning Alert Button -->
        <button id="btn-send-morning-alert" class="btn-secondary" style="width:100%;margin-top:12px">
          <i class="bi bi-send-fill"></i> ส่งสรุปเช้าไป LINE
        </button>
      </div>`;

    document.getElementById('btn-send-morning-alert').addEventListener('click', sendMorningAlert_);

  } catch (e) {
    container.innerHTML = `<div style="padding:24px;text-align:center;color:#ef4444">${e.message}</div>`;
  }
}

function buildBriefingAlerts_(d) {
  const alerts = [];
  if ((d.jobs_overdue || 0) > 0) alerts.push({ icon: 'exclamation-triangle-fill', color: '#ef4444', text: `งานเกินกำหนด ${d.jobs_overdue} งาน` });
  if ((d.low_stock_count || 0) > 0) alerts.push({ icon: 'box-seam-fill', color: '#f59e0b', text: `สต็อกใกล้หมด ${d.low_stock_count} รายการ` });
  if ((d.unpaid_billing_count || 0) > 0) alerts.push({ icon: 'receipt-cutoff', color: '#3b82f6', text: `ค้างชำระ ${d.unpaid_billing_count} ใบ (฿${Number(d.unpaid_amount || 0).toLocaleString()})` });
  if ((d.followup_due_today || 0) > 0) alerts.push({ icon: 'calendar-check-fill', color: '#8b5cf6', text: `ติดตามลูกค้าวันนี้ ${d.followup_due_today} ราย` });

  if (!alerts.length) return '<div style="color:#10b981;text-align:center;padding:12px"><i class="bi bi-check-circle-fill"></i> ทุกอย่างปกติดี</div>';

  return `<div class="briefing-alerts">
    ${alerts.map(a => `
      <div class="briefing-alert-row">
        <i class="bi bi-${a.icon}" style="color:${a.color};flex-shrink:0"></i>
        <span style="font-size:13px">${a.text}</span>
      </div>`).join('')}
  </div>`;
}

async function sendMorningAlert_() {
  const btn = document.getElementById('btn-send-morning-alert');
  btn.disabled = true;
  btn.innerHTML = '<i class="bi bi-hourglass-split"></i> กำลังส่ง...';
  try {
    const res = await callApi('cronMorningAlert', {});
    showToast(res.success ? '✅ ส่งสรุปเช้าไป LINE แล้ว' : '❌ ' + (res.error || 'ไม่สำเร็จ'));
  } catch (e) {
    showToast('❌ ' + e.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="bi bi-send-fill"></i> ส่งสรุปเช้าไป LINE';
  }
}

/* ══════════════════════════════════════════════════════════════
   4d. Web Push Settings
══════════════════════════════════════════════════════════════ */

function renderPushSettings_(container) {
  const pushSupported = typeof isPushSupported === 'function' ? isPushSupported() : ('serviceWorker' in navigator && 'PushManager' in window);
  const pushEnabled   = localStorage.getItem('comphone_push_enabled') === 'true';

  container.innerHTML = `
    <div style="padding:16px">
      <div class="notif-section">
        <div class="notif-section-title"><i class="bi bi-phone-vibrate-fill"></i> Web Push Notifications</div>
        ${!pushSupported ? `
          <div class="push-unsupported">
            <i class="bi bi-exclamation-triangle-fill"></i>
            เบราว์เซอร์นี้ไม่รองรับ Push Notifications
          </div>` : `
          <div class="push-status-row">
            <div>
              <div style="font-weight:600">แจ้งเตือนบนอุปกรณ์</div>
              <div style="font-size:12px;color:#6b7280">รับแจ้งเตือนแม้ปิดแอปอยู่</div>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" id="push-toggle" ${pushEnabled ? 'checked' : ''}>
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div id="push-status-text" style="font-size:12px;color:#9ca3af;margin-top:8px">
            ${pushEnabled ? '✅ เปิดใช้งานอยู่' : 'ปิดอยู่'}
          </div>`}
      </div>

      <!-- Notification Preferences -->
      <div class="notif-section">
        <div class="notif-section-title">ประเภทการแจ้งเตือน</div>
        ${[
          { key: 'notif_jobs',     label: 'งานซ่อมใหม่ / อัปเดตสถานะ', icon: 'tools' },
          { key: 'notif_billing',  label: 'ใบเสร็จ / การชำระเงิน',      icon: 'receipt-cutoff' },
          { key: 'notif_stock',    label: 'สต็อกใกล้หมด',               icon: 'box-seam-fill' },
          { key: 'notif_crm',      label: 'ติดตามลูกค้า',               icon: 'person-lines-fill' },
          { key: 'notif_morning',  label: 'สรุปเช้าประจำวัน',           icon: 'sun-fill' }
        ].map(p => `
          <div class="notif-pref-row">
            <div style="display:flex;align-items:center;gap:8px">
              <i class="bi bi-${p.icon}" style="color:#6b7280"></i>
              <span style="font-size:13px">${p.label}</span>
            </div>
            <label class="toggle-switch toggle-sm">
              <input type="checkbox" class="notif-pref-toggle" data-key="${p.key}"
                ${localStorage.getItem(p.key) !== 'false' ? 'checked' : ''}>
              <span class="toggle-slider"></span>
            </label>
          </div>`).join('')}
      </div>

      <!-- Test Local Notification -->
      <div class="notif-section">
        <button id="btn-test-local-notif" class="btn-secondary" style="width:100%">
          <i class="bi bi-bell-fill"></i> ทดสอบแจ้งเตือน
        </button>
      </div>
    </div>`;

  /* bind push toggle */
  const pushToggle = document.getElementById('push-toggle');
  if (pushToggle) {
    pushToggle.addEventListener('change', async function () {
      const statusText = document.getElementById('push-status-text');
      if (this.checked) {
        if (typeof subscribePushNotifications === 'function') {
          const ok = await subscribePushNotifications();
          if (ok) {
            localStorage.setItem('comphone_push_enabled', 'true');
            if (statusText) statusText.textContent = '✅ เปิดใช้งานอยู่';
          } else {
            this.checked = false;
            showToast('⚠️ ไม่สามารถเปิด Push ได้ — กรุณาอนุญาตใน Browser');
          }
        } else {
          localStorage.setItem('comphone_push_enabled', 'true');
          if (statusText) statusText.textContent = '✅ เปิดใช้งานอยู่';
        }
      } else {
        if (typeof unsubscribePushNotifications === 'function') {
          await unsubscribePushNotifications();
        }
        localStorage.setItem('comphone_push_enabled', 'false');
        if (statusText) statusText.textContent = 'ปิดอยู่';
      }
    });
  }

  /* bind preference toggles */
  container.querySelectorAll('.notif-pref-toggle').forEach(toggle => {
    toggle.addEventListener('change', function () {
      localStorage.setItem(this.dataset.key, String(this.checked));
    });
  });

  /* test local notification */
  document.getElementById('btn-test-local-notif').addEventListener('click', () => {
    pushNotification('ทดสอบแจ้งเตือน', 'COMPHONE SuperApp ทำงานปกติ ✅', 'info');
    showToast('🔔 ส่งแจ้งเตือนทดสอบแล้ว');
  });
}

/* ══════════════════════════════════════════════════════════════
   Override showNotifications (top bar bell)
══════════════════════════════════════════════════════════════ */

/* Override ฟังก์ชัน showNotifications เดิมใน app.js */
if (typeof window !== 'undefined') {
  window.showNotifications = function () {
    showNotificationCenter();
  };
}

/* ─── Keyboard: Escape ─────────────────────────────────────── */
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  const modal = document.getElementById('modal-notif-center');
  if (modal && !modal.classList.contains('hidden')) modal.classList.add('hidden');
});

/* ─── Init ──────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  buildNotifCenterShell_();
  updateNotifBadge_();

  /* ตรวจสอบ badge ทุก 5 นาที */
  setInterval(updateNotifBadge_, 5 * 60 * 1000);
});
