/* ===== STOCK MODULE — COMPHONE SUPER APP v5.9.0 ===== */
'use strict';

// ===== STATE =====
let ALL_STOCK = [];
let STOCK_FILTER = 'all';

// ===== LOAD PAGE =====
function loadStockPage() {
  const container = document.getElementById('stock-list');
  if (!container) return;
  if (ALL_STOCK.length > 0) { renderStockList(ALL_STOCK); return; }

  container.innerHTML = '<div style="text-align:center;padding:40px;color:#9ca3af"><div class="spinner" style="margin:0 auto 12px"></div><p>กำลังโหลดสต็อก...</p></div>';

  callApi({ action: 'listStockItems', limit: 200 }).then(res => {
    if (res && res.success) {
      ALL_STOCK = res.items || [];
      renderStockList(ALL_STOCK);
      updateStockBadge(ALL_STOCK);
    } else {
      container.innerHTML = `<div class="empty-state">
        <i class="bi bi-box-seam" style="font-size:40px;color:#d1d5db;display:block;margin-bottom:8px"></i>
        <p style="color:#9ca3af">ยังไม่มีรายการสต็อก</p>
        <button class="btn-add-job" onclick="showCreateStockModal()">
          <i class="bi bi-plus-circle-fill"></i> เพิ่มสต็อกแรก
        </button>
      </div>`;
    }
  }).catch(() => {
    container.innerHTML = `<div class="empty-state">
      <i class="bi bi-wifi-off" style="font-size:40px;color:#d1d5db;display:block;margin-bottom:8px"></i>
      <p style="color:#9ca3af">ไม่สามารถโหลดข้อมูลได้</p>
      <button class="btn-add-job" onclick="loadStockPage()">
        <i class="bi bi-arrow-clockwise"></i> ลองใหม่
      </button>
    </div>`;
  });
}

// ===== RENDER LIST =====
function renderStockList(items) {
  const container = document.getElementById('stock-list');
  if (!container) return;

  let filtered = items;
  if (STOCK_FILTER === 'low') filtered = items.filter(s => s.qty <= (s.min_qty || 10));
  else if (STOCK_FILTER === 'out') filtered = items.filter(s => s.qty <= 0);

  if (!filtered.length) {
    container.innerHTML = `
      <div style="padding:8px 16px;display:flex;justify-content:space-between;align-items:center">
        <span style="color:#6b7280;font-size:13px">สต็อก 0 รายการ</span>
        <button class="btn-add-job" onclick="showCreateStockModal()" style="padding:6px 14px;font-size:12px">
          <i class="bi bi-plus-circle-fill"></i> เพิ่มสต็อก
        </button>
      </div>
      <div class="empty-state">
        <i class="bi bi-box-seam" style="font-size:36px;color:#d1d5db;display:block;margin-bottom:8px"></i>
        <p style="color:#9ca3af">ไม่พบรายการสต็อกในหมวดนี้</p>
      </div>`;
    return;
  }

  container.innerHTML = `
    <div style="padding:8px 16px;display:flex;justify-content:space-between;align-items:center">
      <span style="color:#6b7280;font-size:13px">สต็อก ${filtered.length} รายการ</span>
      <button class="btn-add-job" onclick="showCreateStockModal()" style="padding:6px 14px;font-size:12px">
        <i class="bi bi-plus-circle-fill"></i> เพิ่มสต็อก
      </button>
    </div>
    ${filtered.map(item => `
      <div class="job-card" onclick="showStockDetail('${item.item_code}')">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
          <div>
            <div style="font-size:11px;color:#9ca3af;font-weight:600">${item.item_code || '-'}</div>
            <div style="font-size:14px;font-weight:800;color:#111827;margin-top:2px">${item.item_name || '-'}</div>
            <div style="font-size:12px;color:#6b7280;margin-top:2px">
              <i class="bi bi-upc"></i> ${item.category || 'ไม่ระบุ'}
            </div>
          </div>
          <div style="text-align:right">
            <span style="background:${item.qty <= 0 ? '#fee2e2' : item.qty <= (item.min_qty || 10) ? '#fef3c7' : '#d1fae5'};color:${item.qty <= 0 ? '#991b1b' : item.qty <= (item.min_qty || 10) ? '#92400e' : '#065f46'};padding:4px 10px;border-radius:20px;font-size:11px;font-weight:700">
              ${item.qty <= 0 ? 'หมด' : item.qty <= (item.min_qty || 10) ? 'ต่ำ' : 'ปรกติ'} ${item.qty || 0} ${item.unit || 'ชิ้น'}
            </span>
            <div style="font-size:16px;font-weight:900;color:#10b981;margin-top:6px">
              ฿${Number(item.unit_cost || 0).toLocaleString()}/${item.unit || 'ชิ้น'}
            </div>
          </div>
        </div>
      </div>
    `).join('')}
  `;
}

// ===== FILTER =====
function filterStockStatus(status, btn) {
  STOCK_FILTER = status;
  document.querySelectorAll('#page-stock .filter-tab').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderStockList(ALL_STOCK);
}

// ===== STOCK DETAIL =====
function showStockDetail(itemCode) {
  const item = ALL_STOCK.find(i => i.item_code === itemCode);
  if (!item) return;

  const content = document.getElementById('stock-detail-content');
  if (!content) return;

  content.innerHTML = `
    <div style="padding:0 16px 20px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <div>
          <div style="font-size:11px;color:#9ca3af;font-weight:600">รหัสสต็อก</div>
          <div style="font-size:18px;font-weight:900;color:#111827">${item.item_code || '-'}</div>
        </div>
        <span style="background:${item.qty <= 0 ? '#fee2e2' : item.qty <= (item.min_qty || 10) ? '#fef3c7' : '#d1fae5'};color:${item.qty <= 0 ? '#991b1b' : item.qty <= (item.min_qty || 10) ? '#92400e' : '#065f46'};padding:6px 14px;border-radius:20px;font-size:12px;font-weight:700">
          ${item.qty <= 0 ? 'หมด' : item.qty <= (item.min_qty || 10) ? 'ต่ำ' : 'ปรกติ'} ${item.qty || 0} ${item.unit || 'ชิ้น'}
        </span>
      </div>

      <div style="background:#f9fafb;border-radius:14px;padding:14px;margin-bottom:12px">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:12px">
          <div>
            <div style="color:#9ca3af;font-weight:600">ชื่อสต็อก</div>
            <div style="font-weight:700;color:#111827">${item.item_name || '-'}</div>
          </div>
          <div>
            <div style="color:#9ca3af;font-weight:600">หมวดหมู่</div>
            <div style="font-weight:700;color:#111827">${item.category || '-'}</div>
          </div>
          <div>
            <div style="color:#9ca3af;font-weight:600">ราคาต่อหน่วย</div>
            <div style="font-weight:700;color:#10b981">฿${Number(item.unit_cost || 0).toLocaleString()}</div>
          </div>
          <div>
            <div style="color:#9ca3af;font-weight:600">จำนวนขั้นต่ำ</div>
            <div style="font-weight:700;color:#111827">${item.min_qty || 10} ${item.unit || 'ชิ้น'}</div>
          </div>
        </div>
      </div>

      <div style="margin-bottom:12px">
        <div class="section-label">ประวัติการเคลื่อนไหว</div>
        <div id="stock-movement-list" style="text-align:center;padding:12px;color:#9ca3af;font-size:12px">
          <div class="spinner" style="margin:0 auto 8px"></div>
          กำลังโหลดประวัติ...
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <button class="btn-action" onclick="showAdjustStockModal('${item.item_code}')">
          <i class="bi bi-arrow-left-right"></i> ปรับปรุงสต็อก
        </button>
        <button class="btn-action" onclick="showTransferStockModal('${item.item_code}')">
          <i class="bi bi-truck"></i> โอนย้ายสต็อก
        </button>
      </div>
    </div>
  `;

  document.getElementById('modal-stock-detail').classList.remove('hidden');

  // Load movement history
  loadStockMovements(item.item_code);
}

// ===== STOCK MOVEMENT =====
function loadStockMovements(itemCode) {
  const container = document.getElementById('stock-movement-list');
  if (!container) return;

  callApi({ action: 'getStockMovements', item_code: itemCode, limit: 20 }).then(res => {
    if (!res || !res.success || !res.movements || res.movements.length === 0) {
      container.innerHTML = '<div style="text-align:center;padding:12px;color:#9ca3af;font-size:12px">ไม่มีประวัติการเคลื่อนไหว</div>';
      return;
    }

    container.innerHTML = res.movements.map(m => `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-top:1px solid #f3f4f6">
        <div>
          <div style="font-size:12px;font-weight:700;color:#111827">${m.type || '-'}</div>
          <div style="font-size:11px;color:#9ca3af">${m.date ? new Date(m.date).toLocaleDateString('th-TH') : '-'}</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:14px;font-weight:900;color:${m.qty_change > 0 ? '#10b981' : '#ef4444'}">
            ${m.qty_change > 0 ? '+' : ''}${m.qty_change || 0} ${m.unit || 'ชิ้น'}
          </div>
          <div style="font-size:11px;color:#6b7280">คงเหลือ: ${m.qty_after || 0}</div>
        </div>
      </div>
    `).join('');
  }).catch(() => {
    container.innerHTML = '<div style="text-align:center;padding:12px;color:#9ca3af;font-size:12px">ไม่สามารถโหลดประวัติได้</div>';
  });
}

// ===== CREATE STOCK MODAL =====
function showCreateStockModal() {
  // ตรวจสอบสิทธิ์ (เฉพาะ Admin/Owner)
  if (APP && APP.user && !['admin', 'owner'].includes(APP.user.role)) {
    showToast('⚠️ ไม่มีสิทธิ์เพิ่มสต็อก');
    return;
  }
  document.getElementById('stock-item-code').value = '';
  document.getElementById('stock-item-name').value = '';
  document.getElementById('stock-category').value = '';
  document.getElementById('stock-qty').value = 0;
  document.getElementById('stock-unit-cost').value = 0;
  document.getElementById('stock-min-qty').value = 10;
  document.getElementById('stock-unit').value = 'ชิ้น';
  document.getElementById('modal-create-stock').classList.remove('hidden');
}

// ===== SAVE NEW STOCK =====
function saveNewStock() {
  const item_code = document.getElementById('stock-item-code').value.trim();
  const item_name = document.getElementById('stock-item-name').value.trim();
  const category = document.getElementById('stock-category').value.trim();
  const qty = Number(document.getElementById('stock-qty').value) || 0;
  const unit_cost = Number(document.getElementById('stock-unit-cost').value) || 0;
  const min_qty = Number(document.getElementById('stock-min-qty').value) || 10;
  const unit = document.getElementById('stock-unit').value.trim() || 'ชิ้น';

  if (!item_name) { showToast('⚠️ กรุณาระบุชื่อสต็อก'); return; }

  showToast('⏳ กำลังเพิ่มสต็อก...');

  callApi({
    action: 'createStockItem',
    item_code,
    item_name,
    category,
    qty,
    unit_cost,
    min_qty,
    unit
  }).then(res => {
    if (res && res.success) {
      showToast(`✅ เพิ่ม ${item_name} สำเร็จ!`);
      closeModal('modal-create-stock');
      ALL_STOCK = [];
      loadStockPage();
    } else {
      showToast('❌ ' + (res && res.error ? res.error : 'เกิดข้อผิดพลาด'));
    }
  }).catch(() => showToast('❌ ไม่สามารถเชื่อมต่อได้'));
}

// ===== ADJUST STOCK MODAL =====
function showAdjustStockModal(itemCode) {
  // ตรวจสอบสิทธิ์ (เฉพาะ Admin/Owner)
  if (APP && APP.user && !['admin', 'owner'].includes(APP.user.role)) {
    showToast('⚠️ ไม่มีสิทธิ์ปรับปรุงสต็อก');
    return;
  }
  document.getElementById('adjust-item-code').value = itemCode || '';
  document.getElementById('adjust-qty-change').value = 0;
  document.getElementById('adjust-reason').value = '';
  document.getElementById('modal-adjust-stock').classList.remove('hidden');
}

// ===== TRANSFER STOCK MODAL =====
function showTransferStockModal(itemCode) {
  // ตรวจสอบสิทธิ์ (เฉพาะ Admin/Owner)
  if (APP && APP.user && !['admin', 'owner'].includes(APP.user.role)) {
    showToast('⚠️ ไม่มีสิทธิ์โอนย้ายสต็อก');
    return;
  }
  document.getElementById('transfer-item-code').value = itemCode || '';
  document.getElementById('transfer-qty').value = 0;
  document.getElementById('transfer-to-location').value = '';
  document.getElementById('transfer-reason').value = '';
  document.getElementById('modal-transfer-stock').classList.remove('hidden');
}

// ===== UPDATE STOCK BADGE =====
function updateStockBadge(items) {
  const low = (items || []).filter(s => s.qty <= (s.min_qty || 10) && s.qty > 0).length;
  const badge = document.getElementById('stock-badge');
  if (badge) {
    badge.textContent = low;
    badge.style.display = low > 0 ? 'flex' : 'none';
  }
}

// ===== EXPOSE GLOBALS =====
window.loadStockPage = loadStockPage;
window.filterStockStatus = filterStockStatus;
window.showStockDetail = showStockDetail;
window.showCreateStockModal = showCreateStockModal;
window.saveNewStock = saveNewStock;
window.showAdjustStockModal = showAdjustStockModal;
window.showTransferStockModal = showTransferStockModal;

// ===== ADJUST STOCK (Phase 30) =====
function adjustStock() {
  const itemCode = document.getElementById('adjust-item-code').value.trim();
  const qtyChange = Number(document.getElementById('adjust-qty-change').value) || 0;
  const reason = document.getElementById('adjust-reason').value.trim();
  
  if (!itemCode || qtyChange === 0) { showToast('⚠️ กรุณาระบุรหัสสินค้าและจำนวนการปรับ'); return; }
  
  showToast('⏳ กำลังปรับปรุงสต็อก...');
  
  callApi({
    action: 'adjustStockItem',
    item_code: itemCode,
    qty_change: qtyChange,
    reason: reason || 'Manual adjustment'
  }).then(res => {
    if (res && res.success) {
      showToast(`✅ ปรับสต็อก ${itemCode} สำเร็จ! (เปลี่ยนแปลง: ${qtyChange})`);
      closeModal('modal-adjust-stock');
      ALL_STOCK = [];
      loadStockPage();
    } else {
      showToast('❌ ' + (res && res.error ? res.error : 'เกิดข้อผิดพลาด'));
    }
  }).catch(() => showToast('❌ ไม่สามารถเชื่อมต่อได้'));
}

// ===== TRANSFER STOCK (Phase 30) =====
function transferStock() {
  const itemCode = document.getElementById('transfer-item-code').value.trim();
  const qty = Number(document.getElementById('transfer-qty').value) || 0;
  const toLocation = document.getElementById('transfer-to-location').value.trim();
  const reason = document.getElementById('transfer-reason').value.trim();
  
  if (!itemCode || qty <= 0 || !toLocation) { showToast('⚠️ กรุณาระบุรหัสสินค้า, จำนวน, และสถานที่ปลายทาง'); return; }
  
  showToast('⏳ กำลังโอนย้ายสต็อก...');
  
  callApi({
    action: 'transferStockItem',
    item_code: itemCode,
    qty: qty,
    to_location: toLocation,
    reason: reason || 'Transfer'
  }).then(res => {
    if (res && res.success) {
      showToast(`✅ โอนย้าย ${itemCode} จำนวน ${qty} ไปยัง ${toLocation} สำเร็จ!`);
      closeModal('modal-transfer-stock');
      ALL_STOCK = [];
      loadStockPage();
    } else {
      showToast('❌ ' + (res && res.error ? res.error : 'เกิดข้อผิดพลาด'));
    }
  }).catch(() => showToast('❌ ไม่สามารถเชื่อมต่อได้'));
}
