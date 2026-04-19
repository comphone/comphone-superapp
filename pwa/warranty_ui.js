/**
 * warranty_ui.js — Warranty Management UI
 * Comphone SuperApp AI v5.5
 *
 * Components:
 *   1. Warranty List Page (listWarranties)
 *   2. Create Warranty Modal (createWarranty)
 *   3. Warranty Detail Modal (getWarrantyByJobId, updateWarrantyStatus)
 *   4. Warranty Alert Banner (getWarrantyDue)
 *
 * Rules:
 *   - ห้าม onclick inline — ใช้ addEventListener เท่านั้น
 *   - ทุก API call ผ่าน callApi(action, payload)
 *   - ทุก async function มี try/catch + showToast() แสดง error
 *   - modal ปิดด้วย Escape key และกดนอก modal ได้
 *   - canAccess ครอบ updateWarrantyStatus (admin/manager เท่านั้น)
 */

// ══════════════════════════════════════════════════════════════
// Constants
// ══════════════════════════════════════════════════════════════

const WARRANTY_STATUS = {
  ACTIVE:  { label: 'ใช้งานได้',    color: 'bg-green-100 text-green-800' },
  EXPIRED: { label: 'หมดอายุ',      color: 'bg-gray-100 text-gray-600' },
  CLAIMED: { label: 'เคลมแล้ว',     color: 'bg-amber-100 text-amber-800' },
  VOIDED:  { label: 'ยกเลิก',       color: 'bg-red-100 text-red-700' }
};

const WARRANTY_DURATIONS = [
  { value: 30,  label: '30 วัน (1 เดือน)' },
  { value: 90,  label: '90 วัน (3 เดือน)' },
  { value: 180, label: '180 วัน (6 เดือน)' },
  { value: 365, label: '365 วัน (1 ปี)' }
];

// ══════════════════════════════════════════════════════════════
// 1. Warranty List Page
// ══════════════════════════════════════════════════════════════

/**
 * แสดงหน้า Warranty List
 * @param {string} [filterStatus] — กรองตาม status (optional)
 */
async function showWarrantyList(filterStatus = '') {
  const container = document.getElementById('main-content');
  if (!container) return;

  container.innerHTML = `
    <div class="p-4">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-xl font-bold text-gray-800">📋 รายการใบรับประกัน</h2>
        <button id="btn-refresh-warranty" class="btn-secondary text-sm">🔄 รีเฟรช</button>
      </div>

      <!-- Filters -->
      <div class="flex flex-wrap gap-2 mb-4">
        <select id="warranty-filter-status" class="input-field text-sm w-auto">
          <option value="">ทุกสถานะ</option>
          <option value="ACTIVE">ใช้งานได้</option>
          <option value="EXPIRED">หมดอายุ</option>
          <option value="CLAIMED">เคลมแล้ว</option>
          <option value="VOIDED">ยกเลิก</option>
        </select>
        <select id="warranty-filter-due" class="input-field text-sm w-auto">
          <option value="">ทุกช่วงเวลา</option>
          <option value="7">ใกล้หมด 7 วัน</option>
          <option value="14">ใกล้หมด 14 วัน</option>
          <option value="30">ใกล้หมด 30 วัน</option>
        </select>
      </div>

      <!-- Table -->
      <div class="overflow-x-auto rounded-lg border border-gray-200">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 text-gray-600">
            <tr>
              <th class="px-3 py-2 text-left">W#</th>
              <th class="px-3 py-2 text-left">ลูกค้า</th>
              <th class="px-3 py-2 text-left">สินค้า/บริการ</th>
              <th class="px-3 py-2 text-left">วันหมดอายุ</th>
              <th class="px-3 py-2 text-left">สถานะ</th>
              <th class="px-3 py-2 text-left">วันเหลือ</th>
              <th class="px-3 py-2 text-center">จัดการ</th>
            </tr>
          </thead>
          <tbody id="warranty-list-body">
            <tr><td colspan="7" class="text-center py-8 text-gray-400">กำลังโหลด...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  // ตั้งค่า filter เริ่มต้น
  if (filterStatus) {
    document.getElementById('warranty-filter-status').value = filterStatus;
  }

  // Event listeners
  document.getElementById('btn-refresh-warranty').addEventListener('click', () => loadWarrantyList());
  document.getElementById('warranty-filter-status').addEventListener('change', () => loadWarrantyList());
  document.getElementById('warranty-filter-due').addEventListener('change', () => loadWarrantyList());

  await loadWarrantyList();
}

/**
 * โหลดข้อมูล Warranty List จาก API
 */
async function loadWarrantyList() {
  const tbody = document.getElementById('warranty-list-body');
  if (!tbody) return;

  const status = document.getElementById('warranty-filter-status')?.value || '';
  const dueFilter = document.getElementById('warranty-filter-due')?.value || '';

  tbody.innerHTML = '<tr><td colspan="7" class="text-center py-8 text-gray-400">กำลังโหลด...</td></tr>';

  try {
    let data;
    if (dueFilter) {
      data = await callApi('getWarrantyDue', { days_ahead: parseInt(dueFilter) });
    } else {
      data = await callApi('listWarranties', { filter: status, page: 1, limit: 100 });
    }

    if (!data || !data.success) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center py-8 text-red-400">ไม่สามารถเชื่อมต่อ API ได้</td></tr>';
      return;
    }
    const warranties = data.warranties || data.rows || [];

    if (warranties.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center py-8 text-gray-400">ไม่พบรายการ</td></tr>';
      return;
    }

    tbody.innerHTML = warranties.map(w => {
      const daysLeft = calculateDaysLeft(w.expiry_date);
      const statusInfo = WARRANTY_STATUS[w.status] || { label: w.status, color: 'bg-gray-100 text-gray-600' };
      const daysClass = daysLeft !== null && daysLeft < 7 ? 'text-red-600 font-bold' : 'text-gray-700';

      return `
        <tr class="border-t border-gray-100 hover:bg-gray-50 cursor-pointer" data-warranty-id="${w.warranty_id}">
          <td class="px-3 py-2 font-mono text-blue-600">${w.warranty_id || '-'}</td>
          <td class="px-3 py-2">${escapeHtml(w.customer_name || '-')}</td>
          <td class="px-3 py-2 text-gray-600 max-w-xs truncate">${escapeHtml(w.job_description || '-')}</td>
          <td class="px-3 py-2">${formatThaiDate(w.expiry_date)}</td>
          <td class="px-3 py-2">
            <span class="px-2 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}">${statusInfo.label}</span>
          </td>
          <td class="px-3 py-2 ${daysClass}">
            ${daysLeft !== null ? `${daysLeft} วัน` : '-'}
          </td>
          <td class="px-3 py-2 text-center">
            <button class="btn-icon text-blue-500 hover:text-blue-700" data-action="view-warranty" data-id="${w.warranty_id}" title="ดูรายละเอียด">👁️</button>
          </td>
        </tr>
      `;
    }).join('');

    // Event delegation สำหรับปุ่ม view
    tbody.querySelectorAll('[data-action="view-warranty"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        showWarrantyDetail(btn.dataset.id);
      });
    });

    // คลิกแถวเพื่อดูรายละเอียด
    tbody.querySelectorAll('tr[data-warranty-id]').forEach(row => {
      row.addEventListener('click', () => showWarrantyDetail(row.dataset.warrantyId));
    });

  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-8 text-red-500">เกิดข้อผิดพลาด: ${escapeHtml(err.message)}</td></tr>`;
    showToast('❌ โหลดรายการรับประกันไม่สำเร็จ');
  }
}

// ══════════════════════════════════════════════════════════════
// 2. Create Warranty Modal
// ══════════════════════════════════════════════════════════════

/**
 * เปิด Modal สร้างใบรับประกันใหม่
 * @param {string} jobId — Job ID ที่ต้องการสร้างใบรับประกัน
 * @param {Object} [jobInfo] — ข้อมูล job เพิ่มเติม (optional)
 */
function createWarrantyModal(jobId, jobInfo = {}) {
  const modalHtml = `
    <div id="modal-create-warranty" class="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="modal-warranty-title">
      <div class="modal-box max-w-lg">
        <div class="modal-header">
          <h3 id="modal-warranty-title" class="font-bold text-lg">🛡️ สร้างใบรับประกัน</h3>
          <button class="modal-close-btn" data-modal="modal-create-warranty" aria-label="ปิด">✕</button>
        </div>
        <div class="modal-body space-y-4">
          <!-- Job Info (auto-fill) -->
          <div class="bg-blue-50 rounded-lg p-3 text-sm">
            <div class="font-medium text-blue-800 mb-1">ข้อมูลงาน</div>
            <div class="text-blue-700">Job ID: <span class="font-mono font-bold">${escapeHtml(jobId)}</span></div>
            ${jobInfo.customer_name ? `<div class="text-blue-700">ลูกค้า: ${escapeHtml(jobInfo.customer_name)}</div>` : ''}
            ${jobInfo.description ? `<div class="text-blue-700 truncate">งาน: ${escapeHtml(jobInfo.description)}</div>` : ''}
          </div>

          <!-- Duration -->
          <div>
            <label class="form-label">ระยะเวลารับประกัน <span class="text-red-500">*</span></label>
            <select id="warranty-duration" class="input-field">
              ${WARRANTY_DURATIONS.map(d => `<option value="${d.value}">${d.label}</option>`).join('')}
            </select>
          </div>

          <!-- Terms -->
          <div>
            <label class="form-label">เงื่อนไขการรับประกัน <span class="text-red-500">*</span></label>
            <textarea id="warranty-terms" class="input-field" rows="4"
              placeholder="เช่น รับประกันอะไหล่และค่าแรง ไม่รวมความเสียหายจากการใช้งานผิดวิธี..."></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button id="btn-cancel-warranty" class="btn-secondary" data-modal="modal-create-warranty">ยกเลิก</button>
          <button id="btn-submit-warranty" class="btn-primary">🛡️ สร้างใบรับประกัน</button>
        </div>
      </div>
    </div>
  `;

  // เพิ่ม modal เข้า DOM
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  const modal = document.getElementById('modal-create-warranty');

  // ปิด modal
  modal.querySelectorAll('[data-modal="modal-create-warranty"]').forEach(btn => {
    btn.addEventListener('click', () => closeWarrantyModal('modal-create-warranty'));
  });

  // ปิดด้วย Escape key
  const escHandler = (e) => {
    if (e.key === 'Escape') {
      closeWarrantyModal('modal-create-warranty');
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);

  // ปิดเมื่อกดนอก modal
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeWarrantyModal('modal-create-warranty');
  });

  // Submit
  document.getElementById('btn-submit-warranty').addEventListener('click', async () => {
    await submitCreateWarranty(jobId);
  });
}

/**
 * ส่งข้อมูลสร้างใบรับประกัน
 * @param {string} jobId
 */
async function submitCreateWarranty(jobId) {
  const duration = parseInt(document.getElementById('warranty-duration')?.value || '90');
  const terms = document.getElementById('warranty-terms')?.value?.trim();

  if (!terms) {
    showToast('⚠️ กรุณาระบุเงื่อนไขการรับประกัน');
    return;
  }

  const btn = document.getElementById('btn-submit-warranty');
  btn.disabled = true;
  btn.textContent = 'กำลังสร้าง...';

  try {
    const result = await callApi('createWarranty', {
      job_id: jobId,
      duration_days: duration,
      terms: terms
    });

    closeWarrantyModal('modal-create-warranty');
    showToast('✅ สร้างใบรับประกันสำเร็จ');

    // แสดงปุ่มดู PDF
    if (result.pdf_url) {
      showWarrantyPdfButton(result.warranty_id, result.pdf_url);
    }

    // รีเฟรช list ถ้าอยู่ในหน้า warranty list
    if (document.getElementById('warranty-list-body')) {
      await loadWarrantyList();
    }

    // รีเฟรช alert banner
    await loadWarrantyAlertBanner();

  } catch (err) {
    showToast(`❌ สร้างใบรับประกันไม่สำเร็จ: ${err.message}`);
    btn.disabled = false;
    btn.textContent = '🛡️ สร้างใบรับประกัน';
  }
}

// ══════════════════════════════════════════════════════════════
// 3. Warranty Detail Modal
// ══════════════════════════════════════════════════════════════

/**
 * แสดง Modal รายละเอียดใบรับประกัน
 * @param {string} warrantyId
 */
async function showWarrantyDetail(warrantyId) {
  try {
    const data = await callApi('getWarrantyByJobId', { warranty_id: warrantyId });
    const w = data.warranty || data;

    const canUpdate = canAccess('manage_warranty');
    const statusInfo = WARRANTY_STATUS[w.status] || { label: w.status, color: 'bg-gray-100 text-gray-600' };
    const daysLeft = calculateDaysLeft(w.expiry_date);

    const modalHtml = `
      <div id="modal-warranty-detail" class="modal-overlay" role="dialog" aria-modal="true">
        <div class="modal-box max-w-lg">
          <div class="modal-header">
            <h3 class="font-bold text-lg">🛡️ ใบรับประกัน ${escapeHtml(w.warranty_id || '')}</h3>
            <button class="modal-close-btn" data-modal="modal-warranty-detail" aria-label="ปิด">✕</button>
          </div>
          <div class="modal-body space-y-3 text-sm">
            <div class="grid grid-cols-2 gap-3">
              <div><span class="text-gray-500">ลูกค้า:</span><br><span class="font-medium">${escapeHtml(w.customer_name || '-')}</span></div>
              <div><span class="text-gray-500">Job ID:</span><br><span class="font-mono">${escapeHtml(w.job_id || '-')}</span></div>
              <div><span class="text-gray-500">วันเริ่ม:</span><br><span>${formatThaiDate(w.start_date)}</span></div>
              <div><span class="text-gray-500">วันหมดอายุ:</span><br>
                <span class="${daysLeft !== null && daysLeft < 7 ? 'text-red-600 font-bold' : ''}">${formatThaiDate(w.expiry_date)}</span>
                ${daysLeft !== null ? `<span class="text-xs text-gray-500 ml-1">(${daysLeft} วัน)</span>` : ''}
              </div>
            </div>
            <div>
              <span class="text-gray-500">สถานะ:</span>
              <span class="ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}">${statusInfo.label}</span>
            </div>
            <div>
              <span class="text-gray-500">เงื่อนไข:</span>
              <p class="mt-1 bg-gray-50 rounded p-2 text-gray-700">${escapeHtml(w.terms || '-')}</p>
            </div>
            ${canUpdate ? `
            <div>
              <label class="form-label">อัปเดตสถานะ (admin/manager)</label>
              <select id="warranty-update-status" class="input-field">
                ${Object.entries(WARRANTY_STATUS).map(([k, v]) =>
                  `<option value="${k}" ${w.status === k ? 'selected' : ''}>${v.label}</option>`
                ).join('')}
              </select>
            </div>
            ` : ''}
          </div>
          <div class="modal-footer flex-wrap gap-2">
            <button class="btn-secondary" data-modal="modal-warranty-detail">ปิด</button>
            ${w.pdf_url ? `<a href="${w.pdf_url}" target="_blank" class="btn-secondary">📄 ดู PDF</a>` : ''}
            <button id="btn-send-warranty-line" class="btn-secondary">📱 ส่ง LINE ลูกค้า</button>
            ${canUpdate ? `<button id="btn-update-warranty-status" class="btn-primary">💾 บันทึกสถานะ</button>` : ''}
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modal = document.getElementById('modal-warranty-detail');

    // ปิด modal
    modal.querySelectorAll('[data-modal="modal-warranty-detail"]').forEach(btn => {
      btn.addEventListener('click', () => closeWarrantyModal('modal-warranty-detail'));
    });

    const escHandler = (e) => {
      if (e.key === 'Escape') {
        closeWarrantyModal('modal-warranty-detail');
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeWarrantyModal('modal-warranty-detail');
    });

    // ส่ง LINE
    document.getElementById('btn-send-warranty-line')?.addEventListener('click', async () => {
      try {
        await callApi('sendWarrantyLine', { warranty_id: warrantyId });
        showToast('✅ ส่ง LINE ลูกค้าสำเร็จ');
      } catch (err) {
        showToast(`❌ ส่ง LINE ไม่สำเร็จ: ${err.message}`);
      }
    });

    // อัปเดตสถานะ
    if (canUpdate) {
      document.getElementById('btn-update-warranty-status')?.addEventListener('click', async () => {
        const newStatus = document.getElementById('warranty-update-status')?.value;
        if (!newStatus) return;
        try {
          await callApi('updateWarrantyStatus', { warranty_id: warrantyId, status: newStatus });
          closeWarrantyModal('modal-warranty-detail');
          showToast('✅ อัปเดตสถานะสำเร็จ');
          if (document.getElementById('warranty-list-body')) await loadWarrantyList();
        } catch (err) {
          showToast(`❌ อัปเดตสถานะไม่สำเร็จ: ${err.message}`);
        }
      });
    }

  } catch (err) {
    showToast(`❌ โหลดข้อมูลใบรับประกันไม่สำเร็จ: ${err.message}`);
  }
}

// ══════════════════════════════════════════════════════════════
// 4. Warranty Alert Banner
// ══════════════════════════════════════════════════════════════

/**
 * โหลดและแสดง Alert Banner บน Dashboard
 * ถ้ามีใบรับประกันหมดอายุใน 7 วัน
 */
async function loadWarrantyAlertBanner() {
  const bannerContainer = document.getElementById('warranty-alert-banner');
  if (!bannerContainer) return;

  try {
    const data = await callApi('getWarrantyDue', { days_ahead: 7 });
    const dueWarranties = data.warranties || data.rows || [];

    if (dueWarranties.length === 0) {
      bannerContainer.innerHTML = '';
      bannerContainer.classList.add('hidden');
      return;
    }

    bannerContainer.classList.remove('hidden');
    bannerContainer.innerHTML = `
      <div class="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="text-amber-600 text-lg">⚠️</span>
          <div>
            <span class="font-medium text-amber-800">มีใบรับประกัน ${dueWarranties.length} รายการ ใกล้หมดอายุใน 7 วัน</span>
          </div>
        </div>
        <button id="btn-view-due-warranties" class="text-sm text-amber-700 underline hover:text-amber-900">ดูรายการ →</button>
      </div>
    `;

    document.getElementById('btn-view-due-warranties')?.addEventListener('click', () => {
      showWarrantyList('ACTIVE');
    });

  } catch (err) {
    // Silent fail — banner ไม่ใช่ feature หลัก
    console.warn('[loadWarrantyAlertBanner]', err.message);
  }
}

// ══════════════════════════════════════════════════════════════
// Helpers
// ══════════════════════════════════════════════════════════════

/**
 * ปิด modal และลบออกจาก DOM
 * @param {string} modalId
 */
function closeWarrantyModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.remove();
}

/**
 * แสดงปุ่มดู PDF หลังสร้างใบรับประกัน
 * @param {string} warrantyId
 * @param {string} pdfUrl
 */
function showWarrantyPdfButton(warrantyId, pdfUrl) {
  const toastArea = document.getElementById('toast-area') || document.body;
  const btn = document.createElement('div');
  btn.className = 'fixed bottom-20 right-4 z-50 bg-white shadow-lg rounded-lg p-3 border border-green-200';
  btn.innerHTML = `
    <div class="text-sm font-medium text-green-800 mb-2">✅ สร้างใบรับประกัน ${escapeHtml(warrantyId)} สำเร็จ</div>
    <a href="${pdfUrl}" target="_blank" class="btn-primary text-sm">📄 ดู PDF ใบรับประกัน</a>
    <button class="ml-2 text-gray-400 hover:text-gray-600 text-xs">✕</button>
  `;
  btn.querySelector('button').addEventListener('click', () => btn.remove());
  toastArea.appendChild(btn);
  setTimeout(() => btn.remove(), 15000);
}

/**
 * คำนวณจำนวนวันที่เหลือจนถึงวันหมดอายุ
 * @param {string} expiryDate
 * @returns {number|null}
 */
function calculateDaysLeft(expiryDate) {
  if (!expiryDate) return null;
  const expiry = new Date(expiryDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.floor((expiry - today) / (1000 * 60 * 60 * 24));
  return diff;
}

/**
 * แปลงวันที่เป็นรูปแบบไทย (วัน/เดือน/ปี พ.ศ.)
 * @param {string} dateStr
 * @returns {string}
 */
function formatThaiDate(dateStr) {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear() + 543;
    return `${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
}

/**
 * Escape HTML เพื่อป้องกัน XSS
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  if (typeof str !== 'string') return String(str || '');
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ══════════════════════════════════════════════════════════════
// Init — โหลด Alert Banner เมื่อ DOM พร้อม
// ══════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  // โหลด warranty alert banner บน dashboard
  loadWarrantyAlertBanner();
});

// Export สำหรับใช้จาก module อื่น
if (typeof window !== 'undefined') {
  window.showWarrantyList = showWarrantyList;
  window.createWarrantyModal = createWarrantyModal;
  window.showWarrantyDetail = showWarrantyDetail;
  window.loadWarrantyAlertBanner = loadWarrantyAlertBanner;
}
