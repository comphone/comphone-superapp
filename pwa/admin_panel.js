/**
 * admin_panel.js — Admin Panel (Sprint 3 — TASK 3)
 * COMPHONE SUPER APP V5.5
 *
 * Components:
 *   3a. Security Dashboard (metric cards + locked accounts + force-change list)
 *   3b. User Management (list + create + edit + toggle active + unlock)
 *   3c. Config Panel (Script URL + LINE Token + PromptPay + System Actions)
 *   3d. Audit Log Viewer (paginated table)
 *
 * กฎ: ห้าม onclick inline — ใช้ addEventListener เท่านั้น
 *     เฉพาะ role owner/admin เท่านั้น
 */

'use strict';

/* ─── State ────────────────────────────────────────────────── */
const ADMIN_PANEL = {
  users:       [],
  secStatus:   null,
  auditLogs:   [],
  auditPage:   0,
  auditPerPage: 20,
  tab:         'security'   /* 'security' | 'users' | 'config' | 'audit' */
};

/* ══════════════════════════════════════════════════════════════
   ENTRY POINT
══════════════════════════════════════════════════════════════ */

/**
 * โหลด Admin Panel — เรียกเมื่อ goPage('admin')
 */
async function loadAdminPanel() {
  const container = document.getElementById('admin-panel-content');
  if (!container) return;

  /* ตรวจสิทธิ์ */
  if (!APP.user || !['owner', 'admin'].includes(APP.user.role)) {
    container.innerHTML = `
      <div style="padding:40px;text-align:center">
        <i class="bi bi-shield-lock-fill" style="font-size:48px;color:#dc2626"></i>
        <p style="color:#dc2626;font-weight:700;margin-top:12px">เฉพาะ Owner / Admin เท่านั้น</p>
      </div>`;
    return;
  }

  buildAdminPanelShell_(container);
  switchAdminTab_('security');
}

/* ══════════════════════════════════════════════════════════════
   SHELL + TABS
══════════════════════════════════════════════════════════════ */

function buildAdminPanelShell_(container) {
  container.innerHTML = `
    <div class="admin-tab-bar" id="admin-tab-bar">
      <button class="admin-tab active" data-tab="security"><i class="bi bi-shield-check"></i> Security</button>
      <button class="admin-tab" data-tab="users"><i class="bi bi-people-fill"></i> Users</button>
      <button class="admin-tab" data-tab="config"><i class="bi bi-gear-fill"></i> Config</button>
      <button class="admin-tab" data-tab="audit"><i class="bi bi-journal-text"></i> Audit Log</button>
    </div>
    <div id="admin-tab-content" style="padding:0 0 80px 0"></div>`;

  document.getElementById('admin-tab-bar').addEventListener('click', e => {
    const btn = e.target.closest('.admin-tab');
    if (btn) switchAdminTab_(btn.dataset.tab);
  });
}

function switchAdminTab_(tab) {
  ADMIN_PANEL.tab = tab;
  document.querySelectorAll('#admin-tab-bar .admin-tab').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === tab);
  });
  const content = document.getElementById('admin-tab-content');
  if (!content) return;

  switch (tab) {
    case 'security': renderSecurityDashboard_(content); break;
    case 'users':    renderUserManagement_(content);    break;
    case 'config':   renderConfigPanel_(content);       break;
    case 'audit':    renderAuditLogViewer_(content);    break;
  }
}

/* ══════════════════════════════════════════════════════════════
   3a. Security Dashboard
══════════════════════════════════════════════════════════════ */

async function renderSecurityDashboard_(container) {
  container.innerHTML = '<div class="loading-spinner-sm" style="margin:24px auto"></div>';
  try {
    const [secRes, auditRes] = await Promise.all([
      callAPI('getSecurityStatus', {}),
      callAPI('getAuditLog', { limit: 5 })
    ]);

    if (!secRes.success) throw new Error(secRes.error);
    ADMIN_PANEL.secStatus = secRes;

    const s = secRes;
    const recentLogs = (auditRes.success ? auditRes.logs : []).slice(0, 5);

    container.innerHTML = `
      <!-- Metric Cards -->
      <div class="sec-metrics">
        <div class="sec-metric-card">
          <div class="sec-metric-icon" style="background:#dbeafe;color:#1e40af"><i class="bi bi-people-fill"></i></div>
          <div class="sec-metric-num">${s.users_count || 0}</div>
          <div class="sec-metric-label">ผู้ใช้ทั้งหมด</div>
        </div>
        <div class="sec-metric-card">
          <div class="sec-metric-icon" style="background:#dcfce7;color:#16a34a"><i class="bi bi-person-check-fill"></i></div>
          <div class="sec-metric-num">${s.active_count || 0}</div>
          <div class="sec-metric-label">ใช้งานอยู่</div>
        </div>
        <div class="sec-metric-card ${s.locked_count > 0 ? 'sec-metric-warn' : ''}">
          <div class="sec-metric-icon" style="background:#fee2e2;color:#dc2626"><i class="bi bi-person-lock-fill"></i></div>
          <div class="sec-metric-num">${s.locked_count || 0}</div>
          <div class="sec-metric-label">ถูกล็อค</div>
        </div>
        <div class="sec-metric-card ${s.force_change_count > 0 ? 'sec-metric-warn' : ''}">
          <div class="sec-metric-icon" style="background:#fef9c3;color:#ca8a04"><i class="bi bi-key-fill"></i></div>
          <div class="sec-metric-num">${s.force_change_count || 0}</div>
          <div class="sec-metric-label">ต้องเปลี่ยน PW</div>
        </div>
      </div>

      <!-- Policy Info -->
      <div class="sec-policy-card">
        <div class="sec-policy-title"><i class="bi bi-shield-fill-check"></i> นโยบายความปลอดภัย</div>
        <div class="sec-policy-row">
          <span>ล็อคหลังใส่ผิด</span>
          <strong>${s.max_failed_attempts || 5} ครั้ง</strong>
        </div>
        <div class="sec-policy-row">
          <span>ระยะเวลาล็อค</span>
          <strong>${s.lockout_minutes || 30} นาที</strong>
        </div>
        <div class="sec-policy-row">
          <span>ความยาวรหัสผ่านขั้นต่ำ</span>
          <strong>${s.password_min_length || 8} ตัวอักษร</strong>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="sec-actions">
        <button id="btn-sec-unlock-all" class="btn-secondary" ${s.locked_count === 0 ? 'disabled' : ''}>
          <i class="bi bi-unlock-fill"></i> ปลดล็อคทั้งหมด (${s.locked_count || 0})
        </button>
        <button id="btn-sec-health" class="btn-secondary">
          <i class="bi bi-activity"></i> Health Check
        </button>
      </div>

      <!-- Recent Audit -->
      <div class="sec-audit-preview">
        <div class="section-label">กิจกรรมล่าสุด</div>
        ${recentLogs.length ? recentLogs.map(buildAuditRow_).join('') : '<p style="color:#9ca3af;text-align:center;padding:16px">ไม่มีข้อมูล</p>'}
        <button id="btn-view-all-audit" class="btn-link" style="width:100%;margin-top:8px">ดูทั้งหมด →</button>
      </div>`;

    /* bind buttons */
    document.getElementById('btn-sec-unlock-all').addEventListener('click', unlockAllAccounts_);
    document.getElementById('btn-sec-health').addEventListener('click', runHealthCheck_);
    document.getElementById('btn-view-all-audit').addEventListener('click', () => switchAdminTab_('audit'));

  } catch (e) {
    container.innerHTML = `<div style="padding:24px;text-align:center;color:#ef4444">${e.message}</div>`;
  }
}

async function unlockAllAccounts_() {
  if (!confirm('ปลดล็อคบัญชีที่ถูกล็อคทั้งหมด?')) return;
  const res = await callAPI('unlockAccount', { all: true });
  showToast(res.success ? '✅ ปลดล็อคสำเร็จ' : '❌ ' + (res.error || 'ไม่สำเร็จ'));
  if (res.success) renderSecurityDashboard_(document.getElementById('admin-tab-content'));
}

async function runHealthCheck_() {
  showToast('⏳ กำลังตรวจสอบระบบ...');
  const res = await callAPI('healthCheck', {});
  if (res && res.status === 'ok') {
    showToast(`✅ ระบบปกติ | DB: ${res.db_sheets || '?'} sheets | Uptime: ${res.uptime_days || '?'} วัน`);
  } else {
    showToast('⚠️ ' + JSON.stringify(res));
  }
}

/* ══════════════════════════════════════════════════════════════
   3b. User Management
══════════════════════════════════════════════════════════════ */

async function renderUserManagement_(container) {
  container.innerHTML = '<div class="loading-spinner-sm" style="margin:24px auto"></div>';
  try {
    const res = await callAPI('listUsers', {});
    if (!res.success) throw new Error(res.error || 'โหลดไม่สำเร็จ');
    ADMIN_PANEL.users = res.data || [];
    renderUserList_(container);
  } catch (e) {
    container.innerHTML = `<div style="padding:24px;text-align:center;color:#ef4444">${e.message}</div>`;
  }
}

function renderUserList_(container) {
  const ROLE_COLOR = { owner: '#7c3aed', admin: '#1d4ed8', tech: '#059669', acct: '#d97706', sales: '#0891b2', manager: '#9333ea' };
  const ROLE_LABEL = { owner: 'Owner', admin: 'Admin', tech: 'ช่าง', acct: 'บัญชี', sales: 'Sales', manager: 'Manager' };

  container.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px">
      <div style="font-weight:700">${ADMIN_PANEL.users.length} บัญชี</div>
      <button id="btn-add-user" class="btn-primary-sm"><i class="bi bi-person-plus-fill"></i> เพิ่มผู้ใช้</button>
    </div>
    <div id="user-list-body">
      ${ADMIN_PANEL.users.map((u, idx) => {
        const isLocked = String(u.active || 'TRUE').toUpperCase() === 'FALSE';
        const color = ROLE_COLOR[u.role] || '#6b7280';
        return `
          <div class="user-row ${isLocked ? 'user-row-locked' : ''}">
            <div class="user-avatar-sm" style="background:${color}22;color:${color}">
              ${(u.full_name || u.username || '?').charAt(0).toUpperCase()}
            </div>
            <div style="flex:1;min-width:0">
              <div style="font-weight:600;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
                ${u.full_name || u.username}
              </div>
              <div style="font-size:12px;color:#6b7280">
                @${u.username} · <span style="color:${color}">${ROLE_LABEL[u.role] || u.role}</span>
                ${isLocked ? ' · <span style="color:#ef4444">ถูกล็อค</span>' : ''}
                ${String(u.force_change_pw || '').toUpperCase() === 'TRUE' ? ' · <span style="color:#f59e0b">ต้องเปลี่ยน PW</span>' : ''}
              </div>
            </div>
            <div style="display:flex;gap:6px">
              <button class="btn-icon-sm btn-edit-user" data-idx="${idx}" title="แก้ไข"><i class="bi bi-pencil-fill"></i></button>
              <button class="btn-icon-sm ${isLocked ? 'btn-success-sm' : 'btn-danger-sm'} btn-toggle-user"
                data-idx="${idx}" data-locked="${isLocked}" title="${isLocked ? 'ปลดล็อค' : 'ล็อค'}">
                <i class="bi bi-${isLocked ? 'unlock-fill' : 'lock-fill'}"></i>
              </button>
            </div>
          </div>`;
      }).join('')}
    </div>`;

  document.getElementById('btn-add-user').addEventListener('click', openCreateUserModal_);

  container.querySelectorAll('.btn-edit-user').forEach(btn => {
    btn.addEventListener('click', () => openEditUserModal_(ADMIN_PANEL.users[parseInt(btn.dataset.idx, 10)]));
  });

  container.querySelectorAll('.btn-toggle-user').forEach(btn => {
    btn.addEventListener('click', () => {
      const u = ADMIN_PANEL.users[parseInt(btn.dataset.idx, 10)];
      const isLocked = btn.dataset.locked === 'true';
      toggleUserActive_(u.username, isLocked);
    });
  });
}

async function toggleUserActive_(username, isLocked) {
  const newActive = isLocked; /* ถ้าล็อคอยู่ → set active=true */
  const res = await callAPI('setUserActive', { username, active: newActive });
  showToast(res.success ? `✅ ${newActive ? 'เปิด' : 'ปิด'}ใช้งาน @${username}` : '❌ ' + (res.error || ''));
  if (res.success) renderUserManagement_(document.getElementById('admin-tab-content'));
}

/* ── Create User Modal ─────────────────────────────────────── */
function openCreateUserModal_() {
  const modal = document.getElementById('modal-admin-create-user');
  modal.querySelector('#new-username').value  = '';
  modal.querySelector('#new-fullname').value  = '';
  modal.querySelector('#new-role').value      = 'tech';
  modal.querySelector('#new-password').value  = '';
  modal.classList.remove('hidden');
}

async function submitCreateUser_() {
  const username = document.getElementById('new-username').value.trim();
  const fullName = document.getElementById('new-fullname').value.trim();
  const role     = document.getElementById('new-role').value;
  const password = document.getElementById('new-password').value;

  if (!username || !password) { showToast('⚠️ กรุณากรอก Username และรหัสผ่าน'); return; }

  const btn = document.getElementById('btn-submit-create-user');
  btn.disabled = true;
  btn.innerHTML = '<i class="bi bi-hourglass-split"></i> กำลังสร้าง...';

  try {
    const res = await callAPI('createUser', { username, full_name: fullName, role, password });
    if (!res.success) throw new Error(res.error);
    showToast(`✅ สร้างผู้ใช้ @${username} สำเร็จ`);
    document.getElementById('modal-admin-create-user').classList.add('hidden');
    renderUserManagement_(document.getElementById('admin-tab-content'));
  } catch (e) {
    showToast('❌ ' + e.message);
    btn.disabled = false;
    btn.innerHTML = '<i class="bi bi-person-plus-fill"></i> สร้างผู้ใช้';
  }
}

/* ── Edit User Modal ───────────────────────────────────────── */
function openEditUserModal_(user) {
  const modal = document.getElementById('modal-admin-edit-user');
  modal.querySelector('#edit-user-title').textContent = '@' + user.username;
  modal.querySelector('#edit-role').value = user.role;
  modal.querySelector('#edit-fullname').value = user.full_name || '';
  modal.querySelector('#edit-new-password').value = '';
  modal.dataset.username = user.username;
  modal.classList.remove('hidden');
}

async function submitEditUser_() {
  const modal    = document.getElementById('modal-admin-edit-user');
  const username = modal.dataset.username;
  const role     = modal.querySelector('#edit-role').value;
  const fullName = modal.querySelector('#edit-fullname').value.trim();
  const newPw    = modal.querySelector('#edit-new-password').value;

  const btn = document.getElementById('btn-submit-edit-user');
  btn.disabled = true;
  btn.innerHTML = '<i class="bi bi-hourglass-split"></i> กำลังบันทึก...';

  try {
    const res = await callAPI('updateUserRole', { username, newRole: role, full_name: fullName });
    if (!res.success) throw new Error(res.error);

    if (newPw) {
      const pwRes = await callAPI('forcePasswordChange', { username, new_password: newPw, changed_by: APP.user?.username });
      if (!pwRes.success) throw new Error(pwRes.error);
    }

    showToast(`✅ อัปเดต @${username} สำเร็จ`);
    modal.classList.add('hidden');
    renderUserManagement_(document.getElementById('admin-tab-content'));
  } catch (e) {
    showToast('❌ ' + e.message);
    btn.disabled = false;
    btn.innerHTML = '<i class="bi bi-save-fill"></i> บันทึก';
  }
}

/* ══════════════════════════════════════════════════════════════
   3c. Config Panel
══════════════════════════════════════════════════════════════ */

function renderConfigPanel_(container) {
  const currentUrl = APP.scriptUrl || localStorage.getItem('comphone_script_url') || '';
  const lineToken  = localStorage.getItem('comphone_line_token') || '';
  const promptPay  = localStorage.getItem('comphone_promptpay') || '';

  container.innerHTML = `
    <div style="padding:16px">
      <!-- GAS URL -->
      <div class="config-section">
        <div class="config-section-title"><i class="bi bi-link-45deg"></i> Google Apps Script URL</div>
        <input type="url" id="cfg-script-url" class="form-control" value="${currentUrl}"
          placeholder="https://script.google.com/macros/s/...">
        <button id="btn-save-script-url" class="btn-primary-sm" style="margin-top:8px">
          <i class="bi bi-save-fill"></i> บันทึก URL
        </button>
      </div>

      <!-- LINE Token -->
      <div class="config-section">
        <div class="config-section-title"><i class="bi bi-chat-dots-fill" style="color:#06b6d4"></i> LINE Channel Access Token</div>
        <input type="password" id="cfg-line-token" class="form-control" value="${lineToken}"
          placeholder="LINE Channel Access Token...">
        <small style="color:#9ca3af;font-size:11px">เก็บเฉพาะในเครื่อง (localStorage) — ต้องตั้งใน GAS Properties ด้วย</small>
        <button id="btn-save-line-token" class="btn-primary-sm" style="margin-top:8px">
          <i class="bi bi-save-fill"></i> บันทึก Token
        </button>
      </div>

      <!-- PromptPay -->
      <div class="config-section">
        <div class="config-section-title"><i class="bi bi-qr-code" style="color:#10b981"></i> PromptPay ID</div>
        <input type="text" id="cfg-promptpay" class="form-control" value="${promptPay}"
          placeholder="เบอร์โทร หรือ เลขประจำตัวประชาชน">
        <button id="btn-save-promptpay" class="btn-primary-sm" style="margin-top:8px">
          <i class="bi bi-save-fill"></i> บันทึก PromptPay
        </button>
      </div>

      <!-- System Actions -->
      <div class="config-section">
        <div class="config-section-title"><i class="bi bi-tools"></i> System Actions</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          <button id="btn-cfg-seed" class="btn-secondary">
            <i class="bi bi-database-fill-add"></i> Seed ข้อมูล
          </button>
          <button id="btn-cfg-triggers" class="btn-secondary">
            <i class="bi bi-clock-history"></i> Setup Triggers
          </button>
          <button id="btn-cfg-health" class="btn-secondary">
            <i class="bi bi-activity"></i> Health Check
          </button>
          <button id="btn-cfg-backup" class="btn-secondary">
            <i class="bi bi-cloud-arrow-up-fill"></i> Backup Now
          </button>
        </div>
      </div>
    </div>`;

  /* bind */
  document.getElementById('btn-save-script-url').addEventListener('click', () => {
    const url = document.getElementById('cfg-script-url').value.trim();
    if (!url.startsWith('https://')) { showToast('⚠️ URL ไม่ถูกต้อง'); return; }
    APP.scriptUrl = url;
    localStorage.setItem('comphone_script_url', url);
    showToast('✅ บันทึก Script URL แล้ว');
  });

  document.getElementById('btn-save-line-token').addEventListener('click', () => {
    const token = document.getElementById('cfg-line-token').value.trim();
    localStorage.setItem('comphone_line_token', token);
    showToast('✅ บันทึก LINE Token แล้ว (เฉพาะในเครื่องนี้)');
  });

  document.getElementById('btn-save-promptpay').addEventListener('click', () => {
    const pp = document.getElementById('cfg-promptpay').value.trim();
    localStorage.setItem('comphone_promptpay', pp);
    showToast('✅ บันทึก PromptPay ID แล้ว');
  });

  document.getElementById('btn-cfg-seed').addEventListener('click', async () => {
    if (!confirm('รัน Seed ข้อมูลเริ่มต้น?')) return;
    showToast('⏳ กำลัง Seed...');
    const res = await callAPI('seedAllData', {});
    showToast(res.success ? '✅ Seed สำเร็จ' : '❌ ' + (res.error || ''));
  });

  document.getElementById('btn-cfg-triggers').addEventListener('click', async () => {
    if (!confirm('ตั้ง Triggers ทั้งหมด?')) return;
    showToast('⏳ กำลังตั้ง Triggers...');
    const res = await callAPI('setupAllTriggers', {});
    showToast(res.success ? '✅ ตั้ง Triggers สำเร็จ' : '❌ ' + (res.error || ''));
  });

  document.getElementById('btn-cfg-health').addEventListener('click', runHealthCheck_);

  document.getElementById('btn-cfg-backup').addEventListener('click', async () => {
    showToast('⏳ กำลัง Backup...');
    const res = await callAPI('runBackup', {});
    showToast(res.success ? '✅ Backup สำเร็จ' : '❌ ' + (res.error || ''));
  });
}

/* ══════════════════════════════════════════════════════════════
   3d. Audit Log Viewer
══════════════════════════════════════════════════════════════ */

async function renderAuditLogViewer_(container) {
  container.innerHTML = '<div class="loading-spinner-sm" style="margin:24px auto"></div>';
  try {
    const res = await callAPI('getAuditLog', {
      limit: ADMIN_PANEL.auditPerPage,
      offset: ADMIN_PANEL.auditPage * ADMIN_PANEL.auditPerPage
    });
    if (!res.success) throw new Error(res.error);
    ADMIN_PANEL.auditLogs = res.logs || [];

    container.innerHTML = `
      <div style="padding:12px 16px;display:flex;justify-content:space-between;align-items:center">
        <div style="font-weight:700">Audit Log</div>
        <div style="font-size:12px;color:#9ca3af">หน้า ${ADMIN_PANEL.auditPage + 1}</div>
      </div>
      <div id="audit-log-body">
        ${ADMIN_PANEL.auditLogs.length
          ? ADMIN_PANEL.auditLogs.map(buildAuditRow_).join('')
          : '<p style="color:#9ca3af;text-align:center;padding:24px">ไม่มีข้อมูล</p>'}
      </div>
      <div style="display:flex;gap:8px;padding:12px 16px">
        <button id="btn-audit-prev" class="btn-secondary" ${ADMIN_PANEL.auditPage === 0 ? 'disabled' : ''}>
          <i class="bi bi-chevron-left"></i> ก่อนหน้า
        </button>
        <button id="btn-audit-next" class="btn-secondary" ${ADMIN_PANEL.auditLogs.length < ADMIN_PANEL.auditPerPage ? 'disabled' : ''}>
          ถัดไป <i class="bi bi-chevron-right"></i>
        </button>
      </div>`;

    document.getElementById('btn-audit-prev').addEventListener('click', () => {
      if (ADMIN_PANEL.auditPage > 0) { ADMIN_PANEL.auditPage--; renderAuditLogViewer_(container); }
    });
    document.getElementById('btn-audit-next').addEventListener('click', () => {
      if (ADMIN_PANEL.auditLogs.length >= ADMIN_PANEL.auditPerPage) { ADMIN_PANEL.auditPage++; renderAuditLogViewer_(container); }
    });
  } catch (e) {
    container.innerHTML = `<div style="padding:24px;text-align:center;color:#ef4444">${e.message}</div>`;
  }
}

function buildAuditRow_(log) {
  const actionColor = {
    'LOGIN_SUCCESS': '#10b981', 'LOGIN_FAILED': '#ef4444',
    'PASSWORD_CHANGED': '#3b82f6', 'ACCOUNT_LOCKED': '#f59e0b',
    'USER_CREATED': '#8b5cf6', 'USER_UPDATED': '#6366f1'
  };
  const color = actionColor[log.action] || '#6b7280';
  const timeStr = log.timestamp ? new Date(log.timestamp).toLocaleString('th-TH') : '';
  return `
    <div class="audit-row">
      <div class="audit-dot" style="background:${color}"></div>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:600;color:${color}">${log.action || '-'}</div>
        <div style="font-size:12px;color:#6b7280">${log.username || '-'} · ${timeStr}</div>
        ${log.detail ? `<div style="font-size:11px;color:#9ca3af;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${log.detail}</div>` : ''}
      </div>
    </div>`;
}

/* ══════════════════════════════════════════════════════════════
   Modal Builders
══════════════════════════════════════════════════════════════ */

function buildAdminModals_() {
  /* Create User Modal */
  if (!document.getElementById('modal-admin-create-user')) {
    const div = document.createElement('div');
    div.id = 'modal-admin-create-user';
    div.className = 'modal-overlay hidden';
    div.innerHTML = `
      <div class="modal-box" role="dialog" aria-modal="true">
        <div class="modal-header">
          <h6>เพิ่มผู้ใช้ใหม่</h6>
          <button class="modal-close" id="btn-close-create-user"><i class="bi bi-x-lg"></i></button>
        </div>
        <div class="modal-body" style="padding:16px">
          <div class="form-group"><label>Username *</label>
            <input type="text" id="new-username" class="form-control" placeholder="ตัวอักษรและตัวเลขเท่านั้น"></div>
          <div class="form-group"><label>ชื่อ-นามสกุล</label>
            <input type="text" id="new-fullname" class="form-control" placeholder="ชื่อ-นามสกุล"></div>
          <div class="form-group"><label>Role</label>
            <select id="new-role" class="form-control">
              <option value="tech">ช่าง</option>
              <option value="admin">Admin</option>
              <option value="acct">บัญชี</option>
              <option value="sales">Sales</option>
              <option value="manager">Manager</option>
              <option value="owner">Owner</option>
            </select></div>
          <div class="form-group"><label>รหัสผ่าน *</label>
            <input type="password" id="new-password" class="form-control" placeholder="อย่างน้อย 8 ตัวอักษร"></div>
          <button id="btn-submit-create-user" class="btn-primary" style="width:100%">
            <i class="bi bi-person-plus-fill"></i> สร้างผู้ใช้
          </button>
        </div>
      </div>`;
    document.body.appendChild(div);
    div.addEventListener('click', e => { if (e.target === div) div.classList.add('hidden'); });
    document.getElementById('btn-close-create-user').addEventListener('click', () => div.classList.add('hidden'));
    document.getElementById('btn-submit-create-user').addEventListener('click', submitCreateUser_);
  }

  /* Edit User Modal */
  if (!document.getElementById('modal-admin-edit-user')) {
    const div = document.createElement('div');
    div.id = 'modal-admin-edit-user';
    div.className = 'modal-overlay hidden';
    div.innerHTML = `
      <div class="modal-box" role="dialog" aria-modal="true">
        <div class="modal-header">
          <h6>แก้ไขผู้ใช้ <span id="edit-user-title"></span></h6>
          <button class="modal-close" id="btn-close-edit-user"><i class="bi bi-x-lg"></i></button>
        </div>
        <div class="modal-body" style="padding:16px">
          <div class="form-group"><label>ชื่อ-นามสกุล</label>
            <input type="text" id="edit-fullname" class="form-control"></div>
          <div class="form-group"><label>Role</label>
            <select id="edit-role" class="form-control">
              <option value="tech">ช่าง</option>
              <option value="admin">Admin</option>
              <option value="acct">บัญชี</option>
              <option value="sales">Sales</option>
              <option value="manager">Manager</option>
              <option value="owner">Owner</option>
            </select></div>
          <div class="form-group"><label>รหัสผ่านใหม่ (เว้นว่างถ้าไม่เปลี่ยน)</label>
            <input type="password" id="edit-new-password" class="form-control" placeholder="อย่างน้อย 8 ตัวอักษร"></div>
          <button id="btn-submit-edit-user" class="btn-primary" style="width:100%">
            <i class="bi bi-save-fill"></i> บันทึก
          </button>
        </div>
      </div>`;
    document.body.appendChild(div);
    div.addEventListener('click', e => { if (e.target === div) div.classList.add('hidden'); });
    document.getElementById('btn-close-edit-user').addEventListener('click', () => div.classList.add('hidden'));
    document.getElementById('btn-submit-edit-user').addEventListener('click', submitEditUser_);
  }
}

/* ─── page-admin shell ──────────────────────────────────────── */
function buildAdminPageShell_() {
  const page = document.getElementById('page-admin');
  if (!page || document.getElementById('admin-panel-content')) return;
  page.innerHTML = `
    <div class="page-header"><h5><i class="bi bi-gear-fill" style="color:#7c3aed"></i> Admin Panel</h5></div>
    <div id="admin-panel-content"></div>`;
}

/* ─── Keyboard: Escape ─────────────────────────────────────── */
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  ['modal-admin-create-user', 'modal-admin-edit-user'].forEach(id => {
    const el = document.getElementById(id);
    if (el && !el.classList.contains('hidden')) el.classList.add('hidden');
  });
});

/* ─── Init ──────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  buildAdminModals_();

  /* สร้าง page-admin ถ้ายังไม่มี */
  if (!document.getElementById('page-admin')) {
    const pages = document.getElementById('pages-container');
    if (pages) {
      const div = document.createElement('div');
      div.id = 'page-admin';
      div.className = 'page hidden';
      pages.appendChild(div);
    }
  }
  buildAdminPageShell_();
});
