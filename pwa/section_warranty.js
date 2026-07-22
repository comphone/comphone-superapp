/**
 * section_warranty.js — COMPHONE SUPER APP v5.17.0-phase42
 * Warranty Section (รับประกัน)
 * Status: Active — Uses real API data (delegates to warranty_section.js if available)
 */

let _warrantyCache = [];

function _warrantyValue(warranty, keys, fallback) {
  warranty = warranty || {};
  for (const key of keys) {
    if (warranty[key] !== undefined && warranty[key] !== null && String(warranty[key]).trim() !== '') {
      return warranty[key];
    }
  }
  return fallback || '-';
}

function _warrantyEsc(value) {
  return String(value === undefined || value === null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function _warrantyJsArg(value) {
  return JSON.stringify(String(value === undefined || value === null ? '' : value))
    .replace(/</g, '\\u003C')
    .replace(/>/g, '\\u003E')
    .replace(/&/g, '\\u0026');
}

function _ensureWarrantyDetailModal() {
  let modal = document.getElementById('modal-warranty-detail');
  if (modal) return modal;
  modal = document.createElement('div');
  modal.id = 'modal-warranty-detail';
  modal.className = 'modal-overlay hidden';
  modal.onclick = () => closeModal('modal-warranty-detail');
  modal.innerHTML = `
    <div class="modal-sheet" onclick="event.stopPropagation()">
      <div class="modal-handle"></div>
      <div id="modal-warranty-detail-content"></div>
    </div>`;
  document.body.appendChild(modal);
  return modal;
}

async function renderWarrantySection(data) {
  console.log('[Warranty] Rendering warranty section...', data);

  // If the full warranty_section.js is loaded, delegate to it
  if (typeof warranty_section_js_loaded !== 'undefined' || typeof _listWarranties === 'function') {
    // The full warranty_section.js renderWarrantySection handles everything
    if (typeof window._originalRenderWarrantySection === 'function') {
      return window._originalRenderWarrantySection(data);
    }
  }

  const container = document.getElementById('warranty-content') || document.getElementById('section-warranty') || document.getElementById('main-content');
  if (!container) return;

  // Show loading
  container.innerHTML = `
    <div class="section-header">
      <h2><i class="bi bi-shield-check"></i> รับประกัน</h2>
      <button class="btn btn-sm btn-primary" onclick="renderWarrantySection()">
        <i class="bi bi-arrow-clockwise"></i> รีเฟรช
      </button>
    </div>
    ${loadingState('กำลังโหลดข้อมูลประกัน...')}
  `;

  try {
    // Fetch real warranty list from backend
    const res = await callApi('listWarranties', {});

    if (!res || !res.success) {
      container.innerHTML = `
        <div class="section-header">
          <h2><i class="bi bi-shield-check"></i> รับประกัน</h2>
          <button class="btn btn-sm btn-primary" onclick="renderWarrantySection()">
            <i class="bi bi-arrow-clockwise"></i> ลองใหม่
          </button>
        </div>
        ${errorState(res?.error || 'ไม่สามารถโหลดข้อมูลประกันได้', 'renderWarrantySection()')}
      `;
      return;
    }

    const warranties = res.warranties || res.items || [];
    _warrantyCache = warranties;

    if (warranties.length === 0) {
      container.innerHTML = `
        <div class="section-header">
          <h2><i class="bi bi-shield-check"></i> รับประกัน</h2>
        </div>
        ${emptyState('bi-shield-check', 'ยังไม่มีข้อมูลประกัน', 'เมื่อมีงานที่มีประกัน จะแสดงที่นี่')}
      `;
      return;
    }

    container.innerHTML = `
      <div class="section-header">
        <h2><i class="bi bi-shield-check"></i> รับประกัน</h2>
        <button class="btn btn-sm btn-primary" onclick="renderWarrantySection()">
          <i class="bi bi-arrow-clockwise"></i> รีเฟรช
        </button>
      </div>
      <div class="table-responsive">
        <table class="table table-hover">
          <thead>
            <tr>
              <th>เลขที่</th>
              <th>ลูกค้า</th>
              <th>อุปกรณ์</th>
              <th>วันหมดประกัน</th>
              <th>สถานะ</th>
              <th>ดู</th>
            </tr>
          </thead>
          <tbody>
            ${warranties.map(w => {
              const status = (w.status || '').toUpperCase();
              const isActive = status === 'ACTIVE';
              const isExpiring = status === 'EXPIRING' || status === 'EXPIRED_SOON';
              const isExpired = status === 'EXPIRED';
              const statusLabel = isActive ? 'ใช้งานอยู่' : isExpiring ? 'ใกล้หมด' : isExpired ? 'หมดอายุ' : status || '—';
              const badgeClass = isActive ? 'bg-success' : isExpiring ? 'bg-warning' : isExpired ? 'bg-danger' : 'bg-secondary';
              return `
                <tr>
                  <td>${_warrantyEsc(_warrantyValue(w, ['warranty_id', 'id']))}</td>
                  <td>${_warrantyEsc(_warrantyValue(w, ['customer', 'customer_name', 'Customer_Name']))}</td>
                  <td>${_warrantyEsc(_warrantyValue(w, ['device', 'device_model', 'Device_Model']))}</td>
                  <td>${_warrantyEsc(_warrantyValue(w, ['expire_date', 'expiry_date', 'expire', 'end_date', 'End_Date']))}</td>
                  <td><span class="badge ${badgeClass}">${statusLabel}</span></td>
                  <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="_viewWarrantyDetail(${_warrantyJsArg(w.warranty_id || w.id || '')})">
                      <i class="bi bi-eye"></i>
                    </button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch (e) {
    console.error('[Warranty] Error:', e);
    container.innerHTML = `
      <div class="section-header">
        <h2><i class="bi bi-shield-check"></i> รับประกัน</h2>
        <button class="btn btn-sm btn-primary" onclick="renderWarrantySection()">
          <i class="bi bi-arrow-clockwise"></i> ลองใหม่
        </button>
      </div>
      ${errorState('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', 'renderWarrantySection()')}
    `;
  }
}

// View warranty detail — uses list cache first to avoid warranty_id/job_id contract mismatch.
async function _viewWarrantyDetail(warrantyId) {
  if (!warrantyId) return;
  const modal = _ensureWarrantyDetailModal();
  const content = document.getElementById('modal-warranty-detail-content');
  let warranty = _warrantyCache.find(w => String(w.warranty_id || w.id || '') === String(warrantyId));

  if (!warranty) {
    try {
      const res = await callApi('getWarrantyByJobId', { job_id: warrantyId });
      if (res && res.success) warranty = res.warranty || res.data;
    } catch (e) {
      warranty = null;
    }
  }

  if (!warranty) {
    content.innerHTML = `
      <div class="modal-title">Warranty Detail</div>
      <div style="padding:0 16px 20px">
        <div class="empty-state">Warranty record not found.</div>
        <button class="btn-cancel" onclick="closeModal('modal-warranty-detail')">Close</button>
      </div>`;
    modal.classList.remove('hidden');
    return;
  }

  const warrantyKey = _warrantyValue(warranty, ['warranty_id', 'id']);
  const jobId = _warrantyValue(warranty, ['job_id', 'Job_ID'], '');
  const status = _warrantyValue(warranty, ['status', 'Status']);
  const pdfUrl = _warrantyValue(warranty, ['warranty_pdf_url', 'pdf_url', 'Warranty_PDF_URL'], '');
  content.innerHTML = `
    <div class="modal-title">Warranty Detail</div>
    <div style="padding:0 16px 20px">
      <div class="detail-grid" style="display:grid;gap:10px">
        <div><b>ID:</b> ${_warrantyEsc(warrantyKey)}</div>
        <div><b>Job:</b> ${_warrantyEsc(jobId || '-')}</div>
        <div><b>Customer:</b> ${_warrantyEsc(_warrantyValue(warranty, ['customer_name', 'customer', 'Customer_Name']))}</div>
        <div><b>Phone:</b> ${_warrantyEsc(_warrantyValue(warranty, ['phone', 'Phone']))}</div>
        <div><b>Device:</b> ${_warrantyEsc(_warrantyValue(warranty, ['device_model', 'device', 'Device_Model']))}</div>
        <div><b>Service:</b> ${_warrantyEsc(_warrantyValue(warranty, ['service_type', 'Service_Type']))}</div>
        <div><b>Period:</b> ${_warrantyEsc(_warrantyValue(warranty, ['start_date', 'Start_Date']))} - ${_warrantyEsc(_warrantyValue(warranty, ['end_date', 'End_Date']))}</div>
        <div><b>Status:</b> ${_warrantyEsc(status)}</div>
        <div><b>Claims:</b> ${_warrantyEsc(_warrantyValue(warranty, ['claim_count', 'Claim_Count'], '0'))}</div>
        ${pdfUrl && pdfUrl !== '-' ? `<div><a class="btn btn-sm btn-outline-primary" href="${_warrantyEsc(pdfUrl)}" target="_blank" rel="noopener">Open PDF</a></div>` : ''}
      </div>
      <div class="form-button-group" style="margin-top:16px">
        <button class="btn-cancel" onclick="closeModal('modal-warranty-detail')">Close</button>
        <button class="btn-setup" onclick="_markWarrantyClaimed(${_warrantyJsArg(warrantyKey)})">Mark Claimed</button>
      </div>
    </div>`;
  modal.classList.remove('hidden');
}

async function _markWarrantyClaimed(warrantyId) {
  if (!warrantyId) return;
  const res = await callApi('updateWarrantyStatus', {
    warranty_id: warrantyId,
    status: 'CLAIMED',
    claim_note: 'Updated from PWA warranty detail'
  });
  if (res && res.success) {
    closeModal('modal-warranty-detail');
    return renderWarrantySection();
  }
  alert('Unable to update warranty status: ' + (res?.error || 'unknown'));
}

function loadWarrantyPage() {
  return renderWarrantySection();
}

console.log('[Warranty] section_warranty.js loaded (v5.17.0-phase42 — real API)');
