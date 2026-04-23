// ============================================================
// admin.js — Admin Panel UI
// COMPHONE SUPER APP V5.5
// จัดการ User, Roles, System Settings
// ============================================================

'use strict';

// ===== STATE =====
const ADMIN = {
  users: [],
  currentEditUser: null,
  loading: false
};

// ===== MAIN ENTRY =====
async function loadAdminPanel() {
  const container = document.getElementById('admin-content');
  if (!container) return;

  // ตรวจสิทธิ์ — เฉพาะ owner เท่านั้น
  if (!APP.user || APP.user.role !== 'owner') {
    container.innerHTML = `
      <div class="empty-state">
        <i class="bi bi-shield-lock-fill" style="font-size:48px;color:#dc2626;"></i>
        <p>เฉพาะ Owner เท่านั้น</p>
      </div>`;
    return;
  }

  container.innerHTML = `<div class="spinner-border text-primary m-4"></div>`;
  await refreshUserList_();
}

// ===== โหลดและแสดงรายการ Users =====
async function refreshUserList_() {
  const container = document.getElementById('admin-content');
  if (!container) return;

  ADMIN.loading = true;
  const res = await callAPI('listUsers', {});
  ADMIN.loading = false;

  if (!res || !res.success) {
    container.innerHTML = `<div class="alert alert-danger m-3">โหลดข้อมูล User ไม่ได้: ${(res && res.error) || 'ไม่ทราบสาเหตุ'}</div>`;
    return;
  }

  ADMIN.users = res.data || [];
  renderAdminPanel_(container);
}

function renderAdminPanel_(container) {
  const roleColors = { owner: '#7c3aed', admin: '#1d4ed8', tech: '#059669', acct: '#d97706' };
  const roleLabels = { owner: 'Owner', admin: 'Admin', tech: 'ช่าง', acct: 'บัญชี' };

  const userCards = ADMIN.users.map(u => `
    <div class="admin-user-card ${u.active === 'FALSE' || u.active === false ? 'inactive' : ''}">
      <div class="admin-user-avatar" style="background:${roleColors[u.role] || '#6b7280'}20;color:${roleColors[u.role] || '#6b7280'}">
        ${(u.full_name || u.username || '?').charAt(0).toUpperCase()}
      </div>
      <div class="admin-user-info">
        <div class="admin-user-name">${u.full_name || u.username}</div>
        <div class="admin-user-meta">
          <span class="admin-role-badge" style="background:${roleColors[u.role] || '#6b7280'}20;color:${roleColors[u.role] || '#6b7280'}">
            ${roleLabels[u.role] || u.role}
          </span>
          <span class="admin-username">@${u.username}</span>
          ${u.active === 'FALSE' || u.active === false ? '<span class="badge bg-secondary">ปิดใช้งาน</span>' : ''}
        </div>
      </div>
      <div class="admin-user-actions">
        <button class="btn-icon-sm" onclick="openEditUserModal('${u.username}')" title="แก้ไข">
          <i class="bi bi-pencil-fill"></i>
        </button>
        <button class="btn-icon-sm ${u.active === 'FALSE' || u.active === false ? 'btn-success-sm' : 'btn-danger-sm'}"
          onclick="toggleUserActive('${u.username}', ${u.active === 'FALSE' || u.active === false})"
          title="${u.active === 'FALSE' || u.active === false ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}">
          <i class="bi bi-${u.active === 'FALSE' || u.active === false ? 'person-check-fill' : 'person-x-fill'}"></i>
        </button>
      </div>
    </div>`).join('');

  container.innerHTML = `
    <!-- Header -->
    <div class="admin-header">
      <div>
        <h6 style="margin:0;font-weight:700;">จัดการผู้ใช้งาน</h6>
        <small style="color:#6b7280;">${ADMIN.users.length} บัญชี</small>
      </div>
      <button class="btn-primary-sm" onclick="openCreateUserModal()">
        <i class="bi bi-person-plus-fill"></i> เพิ่มผู้ใช้
      </button>
    </div>

    <!-- Stats -->
    <div class="admin-stats-row">
      <div class="admin-stat-card">
        <div class="admin-stat-num">${ADMIN.users.filter(u => u.role === 'tech').length}</div>
        <div class="admin-stat-label">ช่าง</div>
      </div>
      <div class="admin-stat-card">
        <div class="admin-stat-num">${ADMIN.users.filter(u => u.role === 'admin' || u.role === 'owner').length}</div>
        <div class="admin-stat-label">Admin/Owner</div>
      </div>
      <div class="admin-stat-card">
        <div class="admin-stat-num">${ADMIN.users.filter(u => u.active !== 'FALSE' && u.active !== false).length}</div>
        <div class="admin-stat-label">ใช้งานอยู่</div>
      </div>
    </div>

    <!-- User List -->
    <div class="admin-user-list">
      ${userCards || '<p style="color:#9ca3af;text-align:center;padding:24px;">ไม่มีผู้ใช้งาน</p>'}
    </div>

    <!-- System Settings -->
    <div class="section-card" style="margin-top:12px;">
      <div class="section-label">ตั้งค่าระบบ</div>
      <div class="admin-settings-grid">
        <button class="admin-setting-btn" onclick="runSeedData()">
          <i class="bi bi-database-fill-add"></i>
          <span>Seed ข้อมูลเริ่มต้น</span>
        </button>
        <button class="admin-setting-btn" onclick="runSystemStatus()">
          <i class="bi bi-activity"></i>
          <span>ตรวจสอบระบบ</span>
        </button>
        <button class="admin-setting-btn" onclick="runSetupTriggers()">
          <i class="bi bi-clock-history"></i>
          <span>ตั้ง Triggers</span>
        </button>
        <button class="admin-setting-btn" onclick="openScriptUrlSettings()">
          <i class="bi bi-link-45deg"></i>
          <span>ตั้งค่า Script URL</span>
        </button>
      </div>
    </div>`;
}

// ===== Modal: สร้าง User ใหม่ =====
function openCreateUserModal() {
  createAdminModal_('modal-create-user', `
    <div class="modal-header-custom">
      <h6>เพิ่มผู้ใช้งานใหม่</h6>
      <button onclick="closeAdminModal('modal-create-user')"><i class="bi bi-x-lg"></i></button>
    </div>
    <div class="modal-body-custom">
      <div class="form-group-custom">
        <label>Username *</label>
        <input type="text" id="new-username" placeholder="เช่น tote, meng" class="form-control-custom">
      </div>
      <div class="form-group-custom">
        <label>ชื่อ-นามสกุล *</label>
        <input type="text" id="new-fullname" placeholder="เช่น ช่างโต้" class="form-control-custom">
      </div>
      <div class="form-group-custom">
        <label>PIN (4 หลัก) *</label>
        <input type="password" id="new-pin" placeholder="1234" maxlength="4" inputmode="numeric" class="form-control-custom">
      </div>
      <div class="form-group-custom">
        <label>บทบาท *</label>
        <select id="new-role" class="form-control-custom">
          <option value="tech">ช่าง (Tech)</option>
          <option value="admin">Admin</option>
          <option value="acct">บัญชี (Acct)</option>
          <option value="owner">Owner</option>
        </select>
      </div>
    </div>
    <div class="modal-footer-custom">
      <button class="btn-secondary-sm" onclick="closeAdminModal('modal-create-user')">ยกเลิก</button>
      <button class="btn-primary-sm" onclick="submitCreateUser()">
        <i class="bi bi-person-plus-fill"></i> สร้างบัญชี
      </button>
    </div>`);
}

async function submitCreateUser() {
  const username = document.getElementById('new-username').value.trim();
  const fullName = document.getElementById('new-fullname').value.trim();
  const pin = document.getElementById('new-pin').value.trim();
  const role = document.getElementById('new-role').value;

  if (!username || !fullName || !pin || pin.length !== 4) {
    showToast('⚠️ กรอกข้อมูลให้ครบ (PIN 4 หลัก)');
    return;
  }

  showToast('⏳ กำลังสร้างบัญชี...');
  const res = await callAPI('createUser', { username, full_name: fullName, password: pin, role });

  if (res && res.success) {
    showToast(`✅ สร้างบัญชี @${username} สำเร็จ`);
    closeAdminModal('modal-create-user');
    await refreshUserList_();
  } else {
    showToast('❌ ' + ((res && res.error) || 'สร้างไม่สำเร็จ'));
  }
}

// ===== Modal: แก้ไข User =====
function openEditUserModal(username) {
  const user = ADMIN.users.find(u => u.username === username);
  if (!user) return;
  ADMIN.currentEditUser = user;

  createAdminModal_('modal-edit-user', `
    <div class="modal-header-custom">
      <h6>แก้ไข @${username}</h6>
      <button onclick="closeAdminModal('modal-edit-user')"><i class="bi bi-x-lg"></i></button>
    </div>
    <div class="modal-body-custom">
      <div class="form-group-custom">
        <label>บทบาท</label>
        <select id="edit-role" class="form-control-custom">
          <option value="tech" ${user.role === 'tech' ? 'selected' : ''}>ช่าง (Tech)</option>
          <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
          <option value="acct" ${user.role === 'acct' ? 'selected' : ''}>บัญชี (Acct)</option>
          <option value="owner" ${user.role === 'owner' ? 'selected' : ''}>Owner</option>
        </select>
      </div>
      <div class="form-group-custom">
        <label>PIN ใหม่ (เว้นว่างถ้าไม่ต้องการเปลี่ยน)</label>
        <input type="password" id="edit-pin" placeholder="PIN 4 หลัก" maxlength="4" inputmode="numeric" class="form-control-custom">
      </div>
    </div>
    <div class="modal-footer-custom">
      <button class="btn-secondary-sm" onclick="closeAdminModal('modal-edit-user')">ยกเลิก</button>
      <button class="btn-primary-sm" onclick="submitEditUser('${username}')">
        <i class="bi bi-check-lg"></i> บันทึก
      </button>
    </div>`);
}

async function submitEditUser(username) {
  const newRole = document.getElementById('edit-role').value;
  const newPin = document.getElementById('edit-pin').value.trim();

  showToast('⏳ กำลังบันทึก...');

  // อัปเดต Role
  const roleRes = await callAPI('updateUserRole', { username, newRole });
  if (!roleRes || !roleRes.success) {
    showToast('❌ อัปเดต Role ไม่สำเร็จ: ' + ((roleRes && roleRes.error) || ''));
    return;
  }

  showToast(`✅ อัปเดต @${username} สำเร็จ`);
  closeAdminModal('modal-edit-user');
  await refreshUserList_();
}

// ===== Toggle Active =====
async function toggleUserActive(username, currentlyInactive) {
  const newActive = currentlyInactive; // ถ้า inactive อยู่ → set active = true
  showToast(`⏳ ${newActive ? 'เปิด' : 'ปิด'}ใช้งาน @${username}...`);
  const res = await callAPI('setUserActive', { username, active: newActive });
  if (res && res.success) {
    showToast(`✅ ${newActive ? 'เปิด' : 'ปิด'}ใช้งาน @${username} แล้ว`);
    await refreshUserList_();
  } else {
    showToast('❌ ' + ((res && res.error) || 'ไม่สำเร็จ'));
  }
}

// ===== System Actions =====
async function runSeedData() {
  if (!confirm('รัน Seed ข้อมูลเริ่มต้น? (จะข้ามถ้ามีข้อมูลแล้ว)')) return;
  showToast('⏳ กำลัง Seed ข้อมูล...');
  const res = await callAPI('seedAllData', {});
  if (res && res.success) {
    showToast('✅ Seed สำเร็จ: Users=' + (res.data && res.data.users && res.data.users.inserted || 0) +
      ', Inventory=' + (res.data && res.data.inventory && res.data.inventory.inserted || 0));
  } else {
    showToast('⚠️ ' + ((res && res.message) || JSON.stringify(res && res.data)));
  }
}

async function runSystemStatus() {
  showToast('⏳ ตรวจสอบระบบ...');
  const res = await callAPI('systemStatus', {});
  if (res && res.success) {
    const d = res.data || {};
    showToast(`✅ ระบบ OK | GAS: ${d.gasVersion || 'V8'} | Sheets: ${d.sheetsCount || '?'} tables`);
  } else {
    showToast('❌ ตรวจสอบไม่ได้');
  }
}

async function runSetupTriggers() {
  if (!confirm('ตั้งค่า Scheduled Triggers ทั้งหมด?')) return;
  showToast('⏳ กำลังตั้ง Triggers...');
  const res = await callAPI('setupAllTriggers', {});
  if (res && res.success) {
    showToast('✅ ตั้ง Triggers สำเร็จ');
  } else {
    showToast('❌ ' + ((res && res.error) || 'ไม่สำเร็จ'));
  }
}

function openScriptUrlSettings() {
  const current = APP.scriptUrl || localStorage.getItem('comphone_script_url') || '';
  createAdminModal_('modal-script-url', `
    <div class="modal-header-custom">
      <h6>ตั้งค่า Script URL</h6>
      <button onclick="closeAdminModal('modal-script-url')"><i class="bi bi-x-lg"></i></button>
    </div>
    <div class="modal-body-custom">
      <div class="form-group-custom">
        <label>GAS Web App URL</label>
        <input type="url" id="new-script-url" value="${current}" class="form-control-custom"
          placeholder="https://script.google.com/macros/s/...">
        <small style="color:#9ca3af;">URL จาก Google Apps Script → Deploy → Web App</small>
      </div>
    </div>
    <div class="modal-footer-custom">
      <button class="btn-secondary-sm" onclick="closeAdminModal('modal-script-url')">ยกเลิก</button>
      <button class="btn-primary-sm" onclick="saveScriptUrl()">
        <i class="bi bi-save-fill"></i> บันทึก
      </button>
    </div>`);
}

function saveScriptUrl() {
  const url = document.getElementById('new-script-url').value.trim();
  if (!url || !url.startsWith('https://')) {
    showToast('⚠️ URL ไม่ถูกต้อง');
    return;
  }
  APP.scriptUrl = url;
  localStorage.setItem('comphone_script_url', url);
  showToast('✅ บันทึก Script URL แล้ว');
  closeAdminModal('modal-script-url');
}

// ===== Modal Helpers =====
function createAdminModal_(id, content) {
  let modal = document.getElementById(id);
  if (!modal) {
    modal = document.createElement('div');
    modal.id = id;
    modal.className = 'modal-overlay';
    modal.onclick = (e) => { if (e.target === modal) closeAdminModal(id); };
    document.body.appendChild(modal);
  }
  modal.innerHTML = `<div class="modal-card">${content}</div>`;
  modal.classList.remove('hidden');
  modal.style.display = 'flex';
}

function closeAdminModal(id) {
  const modal = document.getElementById(id);
  if (modal) { modal.classList.add('hidden'); modal.style.display = 'none'; }
}
