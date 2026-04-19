/**
 * branch_health_ui.js — Multi-Branch Selector + Health Monitor Dashboard
 * Comphone SuperApp AI v5.5
 *
 * Components:
 *   1. Branch Selector Dropdown — แสดงบน Top Bar (admin/exec เท่านั้น)
 *   2. Health Monitor Dashboard — หน้าสถานะระบบ
 *   3. Health Status Badge — แสดงบน Top Bar
 *
 * Rules:
 *   - Branch Selector เฉพาะ admin/exec
 *   - Health Dashboard เฉพาะ admin/exec
 *   - ทุก API call ผ่าน callApi(action, payload)
 *   - canAccess ครอบทุก component
 */

// ══════════════════════════════════════════════════════════════
// State
// ══════════════════════════════════════════════════════════════

const BranchState = {
  currentBranchId: '',
  branches: [],
  lastHealthCheck: null
};

// ══════════════════════════════════════════════════════════════
// 1. Branch Selector
// ══════════════════════════════════════════════════════════════

/**
 * เพิ่ม Branch Selector Dropdown ใน Top Bar
 * เรียกหลัง DOM พร้อมและ user login แล้ว
 */
async function initBranchSelector() {
  if (!canAccess('manage_branch')) return;

  try {
    const data = await callApi('getBranchList', {});
    BranchState.branches = data.branches || data.rows || [];

    if (BranchState.branches.length <= 1) return; // ไม่แสดงถ้ามีสาขาเดียว

    // หา Top Bar Right section
    const topBarRight = document.querySelector('.top-bar-right');
    if (!topBarRight || document.getElementById('branch-selector')) return;

    const selectorHtml = `
      <div id="branch-selector" class="relative">
        <button id="btn-branch-selector" class="icon-btn flex items-center gap-1 text-xs font-medium"
          title="เลือกสาขา" aria-label="เลือกสาขา">
          <i class="bi bi-building"></i>
          <span id="branch-selector-label" class="hidden sm:inline">ทุกสาขา</span>
        </button>
        <div id="branch-dropdown" class="hidden absolute right-0 top-full mt-1 bg-white shadow-lg rounded-lg border border-gray-200 min-w-40 z-50">
          <div class="p-2 border-b border-gray-100 text-xs text-gray-500 font-medium">เลือกสาขา</div>
          <div id="branch-list-items"></div>
        </div>
      </div>
    `;

    topBarRight.insertAdjacentHTML('afterbegin', selectorHtml);

    // Render branch list
    renderBranchList_();

    // Toggle dropdown
    document.getElementById('btn-branch-selector').addEventListener('click', (e) => {
      e.stopPropagation();
      document.getElementById('branch-dropdown').classList.toggle('hidden');
    });

    // ปิด dropdown เมื่อคลิกนอก
    document.addEventListener('click', () => {
      document.getElementById('branch-dropdown')?.classList.add('hidden');
    });

  } catch (err) {
    console.warn('[initBranchSelector]', err.message);
  }
}

/**
 * Render รายการสาขาใน Dropdown
 */
function renderBranchList_() {
  const listContainer = document.getElementById('branch-list-items');
  if (!listContainer) return;

  const allOption = `
    <button class="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${!BranchState.currentBranchId ? 'font-bold text-blue-600' : 'text-gray-700'}"
      data-branch-id="">
      🏢 ทุกสาขา
    </button>
  `;

  const branchOptions = BranchState.branches.map(b => `
    <button class="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${BranchState.currentBranchId === b.branch_id ? 'font-bold text-blue-600' : 'text-gray-700'}"
      data-branch-id="${b.branch_id}">
      📍 ${escapeHtmlBranch(b.branch_name || b.branch_id)}
    </button>
  `).join('');

  listContainer.innerHTML = allOption + branchOptions;

  // Event listeners
  listContainer.querySelectorAll('button[data-branch-id]').forEach(btn => {
    btn.addEventListener('click', () => selectBranch(btn.dataset.branchId));
  });
}

/**
 * เลือกสาขา
 * @param {string} branchId — ถ้าว่างหมายถึง "ทุกสาขา"
 */
function selectBranch(branchId) {
  BranchState.currentBranchId = branchId;

  // อัปเดต label
  const label = document.getElementById('branch-selector-label');
  if (label) {
    if (!branchId) {
      label.textContent = 'ทุกสาขา';
    } else {
      const branch = BranchState.branches.find(b => b.branch_id === branchId);
      label.textContent = branch ? (branch.branch_name || branchId) : branchId;
    }
  }

  // ปิด dropdown
  document.getElementById('branch-dropdown')?.classList.add('hidden');

  // Re-render branch list (อัปเดต active state)
  renderBranchList_();

  // บันทึกลง localStorage เพื่อ persist
  try { localStorage.setItem('comphone_branch_id', branchId); } catch {}

  // แจ้ง event ให้ component อื่นรับรู้
  window.dispatchEvent(new CustomEvent('branchChanged', { detail: { branchId } }));

  showToast(branchId ? `📍 เปลี่ยนเป็นสาขา: ${branchId}` : '🏢 แสดงทุกสาขา');
}

/**
 * ดึง branch ID ที่เลือกอยู่ปัจจุบัน
 * @returns {string}
 */
function getCurrentBranch() {
  return BranchState.currentBranchId ||
         (typeof localStorage !== 'undefined' ? localStorage.getItem('comphone_branch_id') || '' : '');
}

// ══════════════════════════════════════════════════════════════
// 2. Health Monitor Dashboard
// ══════════════════════════════════════════════════════════════

/**
 * แสดงหน้า Health Monitor Dashboard
 */
async function showHealthDashboard() {
  if (!canAccess('view_health')) {
    showToast('⛔ ไม่มีสิทธิ์ดูสถานะระบบ');
    return;
  }

  const container = document.getElementById('main-content') ||
                    document.getElementById('main-content-area');
  if (!container) return;

  container.innerHTML = `
    <div class="p-4">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-xl font-bold text-gray-800">🩺 สถานะระบบ</h2>
        <button id="btn-refresh-health" class="btn-secondary text-sm">🔄 ตรวจสอบ</button>
      </div>

      <!-- Status Overview -->
      <div id="health-overview" class="bg-gray-50 rounded-xl p-4 mb-4 text-center">
        <div class="text-gray-400 text-sm">กำลังตรวจสอบ...</div>
      </div>

      <!-- Metrics Grid -->
      <div id="health-metrics" class="grid grid-cols-2 gap-3 mb-4"></div>

      <!-- History Table -->
      <div class="mb-2">
        <div class="flex items-center justify-between">
          <span class="font-medium text-gray-700 text-sm">ประวัติ Health Check</span>
          <select id="health-history-limit" class="input-field text-xs w-auto">
            <option value="10">10 รายการล่าสุด</option>
            <option value="25">25 รายการล่าสุด</option>
            <option value="50">50 รายการล่าสุด</option>
          </select>
        </div>
      </div>
      <div class="overflow-x-auto rounded-lg border border-gray-200">
        <table class="w-full text-xs">
          <thead class="bg-gray-50 text-gray-600">
            <tr>
              <th class="px-3 py-2 text-left">เวลา</th>
              <th class="px-3 py-2 text-left">สถานะ</th>
              <th class="px-3 py-2 text-right">Response (ms)</th>
              <th class="px-3 py-2 text-left">หมายเหตุ</th>
            </tr>
          </thead>
          <tbody id="health-history-body">
            <tr><td colspan="4" class="text-center py-6 text-gray-400">กำลังโหลด...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  document.getElementById('btn-refresh-health').addEventListener('click', () => runHealthCheck());
  document.getElementById('health-history-limit').addEventListener('change', () => loadHealthHistory());

  await runHealthCheck();
  await loadHealthHistory();
}

/**
 * รัน Health Check และแสดงผล
 */
async function runHealthCheck() {
  const overview = document.getElementById('health-overview');
  const metrics = document.getElementById('health-metrics');
  if (overview) overview.innerHTML = '<div class="text-gray-400 text-sm animate-pulse">กำลังตรวจสอบ...</div>';

  try {
    const result = await callApi('healthCheck', { triggered_by: 'pwa_dashboard' });
    BranchState.lastHealthCheck = result;

    const isOk = result.status === 'OK' || result.overall === 'OK';
    const statusColor = isOk ? 'text-green-600' : 'text-red-600';
    const statusBg = isOk ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200';
    const statusIcon = isOk ? '✅' : '❌';

    if (overview) {
      overview.className = `rounded-xl p-4 mb-4 border ${statusBg}`;
      overview.innerHTML = `
        <div class="text-3xl mb-2">${statusIcon}</div>
        <div class="text-xl font-bold ${statusColor}">${isOk ? 'ระบบทำงานปกติ' : 'พบปัญหา'}</div>
        <div class="text-xs text-gray-500 mt-1">ตรวจสอบเมื่อ: ${new Date().toLocaleTimeString('th-TH')}</div>
        ${result.response_time_ms ? `<div class="text-xs text-gray-500">Response time: ${result.response_time_ms}ms</div>` : ''}
      `;
    }

    // Metrics
    if (metrics && result.checks) {
      metrics.innerHTML = Object.entries(result.checks).map(([key, check]) => {
        const ok = check.status === 'OK' || check.ok === true;
        return `
          <div class="bg-white rounded-lg border ${ok ? 'border-green-200' : 'border-red-200'} p-3">
            <div class="flex items-center justify-between mb-1">
              <span class="text-xs font-medium text-gray-700">${escapeHtmlBranch(key)}</span>
              <span class="text-sm">${ok ? '✅' : '❌'}</span>
            </div>
            ${check.value !== undefined ? `<div class="text-xs text-gray-500">${escapeHtmlBranch(String(check.value))}</div>` : ''}
            ${check.message ? `<div class="text-xs ${ok ? 'text-green-600' : 'text-red-600'}">${escapeHtmlBranch(check.message)}</div>` : ''}
          </div>
        `;
      }).join('');
    }

    // อัปเดต Health Badge บน Top Bar
    updateHealthBadge(isOk);

  } catch (err) {
    if (overview) {
      overview.className = 'rounded-xl p-4 mb-4 border bg-red-50 border-red-200';
      overview.innerHTML = `
        <div class="text-3xl mb-2">❌</div>
        <div class="text-xl font-bold text-red-600">ไม่สามารถตรวจสอบได้</div>
        <div class="text-xs text-red-500 mt-1">${escapeHtmlBranch(err.message)}</div>
      `;
    }
    updateHealthBadge(false);
  }
}

/**
 * โหลดประวัติ Health Check
 */
async function loadHealthHistory() {
  const tbody = document.getElementById('health-history-body');
  if (!tbody) return;

  const limit = parseInt(document.getElementById('health-history-limit')?.value || '10');
  tbody.innerHTML = '<tr><td colspan="4" class="text-center py-6 text-gray-400">กำลังโหลด...</td></tr>';

  try {
    const data = await callApi('getHealthHistory', { limit });
    const history = data.history || data.rows || [];

    if (history.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="text-center py-6 text-gray-400">ยังไม่มีประวัติ</td></tr>';
      return;
    }

    tbody.innerHTML = history.map(h => {
      const isOk = h.status === 'OK';
      return `
        <tr class="border-t border-gray-100">
          <td class="px-3 py-2 text-gray-600">${formatThaiDateTime(h.timestamp)}</td>
          <td class="px-3 py-2">
            <span class="px-2 py-0.5 rounded-full text-xs ${isOk ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">
              ${isOk ? '✅ OK' : '❌ ERROR'}
            </span>
          </td>
          <td class="px-3 py-2 text-right ${h.response_time_ms > 2000 ? 'text-orange-600 font-medium' : 'text-gray-600'}">
            ${h.response_time_ms ? h.response_time_ms + 'ms' : '-'}
          </td>
          <td class="px-3 py-2 text-gray-500 text-xs max-w-xs truncate">${escapeHtmlBranch(h.note || h.message || '-')}</td>
        </tr>
      `;
    }).join('');

  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-center py-6 text-red-500">เกิดข้อผิดพลาด: ${escapeHtmlBranch(err.message)}</td></tr>`;
  }
}

// ══════════════════════════════════════════════════════════════
// 3. Health Status Badge บน Top Bar
// ══════════════════════════════════════════════════════════════

/**
 * เพิ่ม Health Badge บน Top Bar
 */
function initHealthBadge() {
  if (!canAccess('view_health')) return;

  const topBarRight = document.querySelector('.top-bar-right');
  if (!topBarRight || document.getElementById('health-badge')) return;

  const badgeHtml = `
    <button id="health-badge" class="icon-btn relative" title="สถานะระบบ" aria-label="สถานะระบบ">
      <i class="bi bi-heart-pulse-fill text-gray-400" id="health-badge-icon"></i>
    </button>
  `;

  topBarRight.insertAdjacentHTML('afterbegin', badgeHtml);

  document.getElementById('health-badge').addEventListener('click', () => showHealthDashboard());
}

/**
 * อัปเดต Health Badge icon และสี
 * @param {boolean} isOk
 */
function updateHealthBadge(isOk) {
  const icon = document.getElementById('health-badge-icon');
  if (!icon) return;
  icon.className = `bi bi-heart-pulse-fill ${isOk ? 'text-green-500' : 'text-red-500'}`;
}

// ══════════════════════════════════════════════════════════════
// Helpers
// ══════════════════════════════════════════════════════════════

/**
 * แปลง timestamp เป็นรูปแบบไทย
 * @param {string} ts
 * @returns {string}
 */
function formatThaiDateTime(ts) {
  if (!ts) return '-';
  try {
    const d = new Date(ts);
    return d.toLocaleString('th-TH', {
      day: '2-digit', month: '2-digit', year: '2-digit',
      hour: '2-digit', minute: '2-digit'
    });
  } catch {
    return ts;
  }
}

/**
 * Escape HTML เพื่อป้องกัน XSS
 * @param {string} str
 * @returns {string}
 */
function escapeHtmlBranch(str) {
  if (typeof str !== 'string') return String(str || '');
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ══════════════════════════════════════════════════════════════
// Init
// ══════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  // รอให้ user login ก่อน แล้วค่อย init
  window.addEventListener('userLoggedIn', () => {
    initBranchSelector();
    initHealthBadge();
  });

  // ถ้า user login แล้วอยู่แล้ว (page reload)
  setTimeout(() => {
    if (typeof canAccess === 'function') {
      initBranchSelector();
      initHealthBadge();
    }
  }, 1500);
});

// Export
if (typeof window !== 'undefined') {
  window.showHealthDashboard = showHealthDashboard;
  window.initBranchSelector = initBranchSelector;
  window.getCurrentBranch = getCurrentBranch;
  window.selectBranch = selectBranch;
  window.runHealthCheck = runHealthCheck;
}
