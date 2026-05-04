/**
 * section_warranty.js — COMPHONE SUPER APP v5.14.5-phase37
 * Warranty Section (รับประกัน)
 * Status: Active — Uses real API data (delegates to warranty_section.js if available)
 */

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
                  <td>${w.warranty_id || w.id || '-'}</td>
                  <td>${w.customer || w.customer_name || '-'}</td>
                  <td>${w.device || w.device_model || '-'}</td>
                  <td>${w.expire_date || w.expiry_date || w.expire || '-'}</td>
                  <td><span class="badge ${badgeClass}">${statusLabel}</span></td>
                  <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="_viewWarrantyDetail('${w.warranty_id || w.id || ''}')">
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

// View warranty detail — uses real API
async function _viewWarrantyDetail(warrantyId) {
  if (!warrantyId) return;
  try {
    const res = await callApi('getWarrantyByJobId', { warranty_id: warrantyId });
    if (res && res.success) {
      alert(JSON.stringify(res.warranty || res.data || res, null, 2));
    } else {
      alert('ไม่พบข้อมูลประกัน: ' + (res?.error || 'unknown'));
    }
  } catch (e) {
    alert('เกิดข้อผิดพลาดในการดึงข้อมูล');
  }
}

console.log('[Warranty] section_warranty.js loaded (v5.14.5-phase37 — real API)');
