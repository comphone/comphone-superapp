// ============================================================
// COMPHONE SUPER APP V5.5 — inventory.js
// Sprint 2: Inventory Management UI
//   2.1 loadInventoryPage() — โหลดและแสดงสต็อก
//   2.2 renderInventoryList() — แสดงรายการสินค้า
//   2.3 searchInventory() — ค้นหาสินค้า
//   2.4 openAddInventoryModal() — เพิ่มสินค้าใหม่
//   2.5 adjustStock() — ปรับสต็อก (เพิ่ม/ลด)
//   2.6 showInventoryDetail() — ดูรายละเอียดสินค้า
// ============================================================

// ===== STATE =====
const INV = {
  items: [],          // รายการสินค้าทั้งหมด
  filtered: [],       // รายการที่กรองแล้ว
  searchQuery: '',    // คำค้นหาปัจจุบัน
  currentItem: null,  // สินค้าที่กำลังดูอยู่
};

// ============================================================
// 2.1 LOAD INVENTORY PAGE
// ============================================================
async function loadInventoryPage() {
  const page = document.getElementById('page-inventory');
  if (!page) return;

  page.innerHTML = `
    <div class="page-header" style="padding-bottom:0">
      <h5><i class="bi bi-boxes" style="color:#f59e0b"></i> คลังสินค้า</h5>
    </div>
    <div style="padding:12px 16px 0">
      <!-- Search Bar -->
      <div style="display:flex;gap:8px;margin-bottom:12px">
        <div style="flex:1;position:relative">
          <i class="bi bi-search" style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:#9ca3af;font-size:14px"></i>
          <input type="text" id="inv-search-input" placeholder="ค้นหาสินค้า รหัส ชื่อ..."
            style="width:100%;padding:10px 12px 10px 36px;border:1.5px solid #e5e7eb;border-radius:12px;font-size:14px;outline:none;box-sizing:border-box"
            oninput="searchInventory(this.value)">
        </div>
        <button onclick="openAddInventoryModal()"
          style="padding:10px 14px;background:#f59e0b;color:#fff;border:none;border-radius:12px;font-size:13px;font-weight:700;cursor:pointer;white-space:nowrap;flex-shrink:0">
          <i class="bi bi-plus-lg"></i> เพิ่ม
        </button>
      </div>
      <!-- Stats Row -->
      <div id="inv-stats" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:12px">
        <div style="background:#f0fdf4;border-radius:12px;padding:10px;text-align:center">
          <div style="font-size:18px;font-weight:800;color:#16a34a" id="inv-stat-total">-</div>
          <div style="font-size:10px;color:#6b7280;font-weight:600">รายการ</div>
        </div>
        <div style="background:#fff7ed;border-radius:12px;padding:10px;text-align:center">
          <div style="font-size:18px;font-weight:800;color:#ea580c" id="inv-stat-low">-</div>
          <div style="font-size:10px;color:#6b7280;font-weight:600">สต็อกต่ำ</div>
        </div>
        <div style="background:#eff6ff;border-radius:12px;padding:10px;text-align:center">
          <div style="font-size:18px;font-weight:800;color:#2563eb" id="inv-stat-value">-</div>
          <div style="font-size:10px;color:#6b7280;font-weight:600">มูลค่า (฿)</div>
        </div>
      </div>
    </div>
    <!-- List -->
    <div id="inv-list" style="padding:0 16px 80px;overflow-y:auto">
      <div style="text-align:center;padding:3rem;color:#9ca3af">
        <i class="bi bi-hourglass-split" style="font-size:2rem;display:block;margin-bottom:8px"></i>
        กำลังโหลดสต็อก...
      </div>
    </div>
  `;

  try {
    const res = await callAPI('inventoryOverview', {});
    if (res && res.success) {
      INV.items = res.items || [];
      INV.filtered = INV.items;
      renderInventoryStats();
      renderInventoryList(INV.items);
    } else {
      document.getElementById('inv-list').innerHTML = `
        <div style="text-align:center;padding:3rem;color:#ef4444">
          <i class="bi bi-exclamation-triangle" style="font-size:2rem;display:block;margin-bottom:8px"></i>
          โหลดข้อมูลไม่สำเร็จ<br><small>${res && res.error ? res.error : 'กรุณาลองใหม่'}</small>
        </div>
      `;
    }
  } catch (e) {
    document.getElementById('inv-list').innerHTML = `
      <div style="text-align:center;padding:3rem;color:#ef4444">
        <i class="bi bi-wifi-off" style="font-size:2rem;display:block;margin-bottom:8px"></i>
        ไม่สามารถเชื่อมต่อได้
      </div>
    `;
  }
}

// ============================================================
// 2.2 RENDER INVENTORY STATS
// ============================================================
function renderInventoryStats() {
  const items = INV.items;
  const lowStock = items.filter(i => (i.total_qty || i.qty || 0) <= (i.reorder_point || 5));
  const totalValue = items.reduce((sum, i) => sum + ((i.total_qty || i.qty || 0) * (i.cost || 0)), 0);

  const statTotal = document.getElementById('inv-stat-total');
  const statLow = document.getElementById('inv-stat-low');
  const statValue = document.getElementById('inv-stat-value');

  if (statTotal) statTotal.textContent = items.length;
  if (statLow) statLow.textContent = lowStock.length;
  if (statValue) statValue.textContent = totalValue > 999 ? (totalValue/1000).toFixed(1) + 'K' : totalValue.toLocaleString('th-TH');
}

// ============================================================
// 2.3 RENDER INVENTORY LIST
// ============================================================
function renderInventoryList(items) {
  const list = document.getElementById('inv-list');
  if (!list) return;

  if (!items || items.length === 0) {
    list.innerHTML = `
      <div style="text-align:center;padding:3rem;color:#9ca3af">
        <i class="bi bi-box-seam" style="font-size:2.5rem;display:block;margin-bottom:8px"></i>
        ยังไม่มีสินค้าในสต็อก
        <br><button onclick="openAddInventoryModal()"
          style="margin-top:12px;padding:8px 16px;background:#f59e0b;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer">
          <i class="bi bi-plus-lg"></i> เพิ่มสินค้าแรก
        </button>
      </div>
    `;
    return;
  }

  list.innerHTML = items.map(item => {
    const qty = item.total_qty !== undefined ? item.total_qty : (item.qty || 0);
    const reorderPoint = item.reorder_point || 5;
    const isLow = qty <= reorderPoint;
    const isOut = qty === 0;
    const cost = item.cost || 0;
    const price = item.price || 0;

    const stockColor = isOut ? '#ef4444' : isLow ? '#f59e0b' : '#10b981';
    const stockBg = isOut ? '#fef2f2' : isLow ? '#fffbeb' : '#f0fdf4';
    const borderColor = isOut ? '#fca5a5' : isLow ? '#fde68a' : '#bbf7d0';

    return `
      <div onclick="showInventoryDetail('${item.item_code}')"
        style="background:#fff;border-radius:14px;padding:14px;margin-bottom:10px;border:1.5px solid ${borderColor};cursor:pointer;transition:box-shadow 0.2s"
        onmouseenter="this.style.boxShadow='0 4px 12px rgba(0,0,0,0.08)'"
        onmouseleave="this.style.boxShadow='none'">
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <div style="flex:1;min-width:0">
            <div style="font-weight:700;font-size:14px;color:#111827;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${item.item_name || '-'}</div>
            <div style="font-size:11px;color:#6b7280;margin-top:2px">${item.item_code || '-'}</div>
          </div>
          <div style="text-align:right;flex-shrink:0;margin-left:8px">
            <div style="font-size:20px;font-weight:800;color:${stockColor};background:${stockBg};padding:4px 10px;border-radius:10px;line-height:1.2">${qty}</div>
            <div style="font-size:10px;color:#9ca3af;margin-top:2px">min: ${reorderPoint}</div>
          </div>
        </div>
        <div style="display:flex;justify-content:space-between;margin-top:8px;font-size:11px;color:#6b7280">
          <span>ทุน: ฿${cost.toLocaleString('th-TH')}</span>
          <span>ขาย: ฿${price.toLocaleString('th-TH')}</span>
          ${item.main_qty !== undefined ? `<span>คลัง: ${item.main_qty} | รถ: ${item.van_qty || 0}</span>` : ''}
        </div>
        ${isLow ? `
          <div style="margin-top:6px;font-size:11px;color:${stockColor};font-weight:700">
            <i class="bi bi-exclamation-triangle-fill"></i> ${isOut ? 'หมดสต็อก!' : 'สต็อกต่ำ — ควรสั่งซื้อ'}
          </div>
        ` : ''}
      </div>
    `;
  }).join('');
}

// ============================================================
// 2.4 SEARCH INVENTORY
// ============================================================
function searchInventory(query) {
  INV.searchQuery = (query || '').toLowerCase().trim();
  if (!INV.searchQuery) {
    INV.filtered = INV.items;
  } else {
    INV.filtered = INV.items.filter(item =>
      (item.item_name || '').toLowerCase().includes(INV.searchQuery) ||
      (item.item_code || '').toLowerCase().includes(INV.searchQuery)
    );
  }
  renderInventoryList(INV.filtered);
}

// ============================================================
// 2.5 SHOW INVENTORY DETAIL + ADJUST STOCK
// ============================================================
function showInventoryDetail(itemCode) {
  const item = INV.items.find(i => i.item_code === itemCode);
  if (!item) return;
  INV.currentItem = item;

  const qty = item.total_qty !== undefined ? item.total_qty : (item.qty || 0);
  const reorderPoint = item.reorder_point || 5;
  const isLow = qty <= reorderPoint;

  // สร้าง modal content ใน modal-job (ใช้ modal เดิมที่มีอยู่)
  document.getElementById('modal-job-content').innerHTML = `
    <div style="padding:0 16px 16px">
      <!-- Header -->
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px">
        <div style="flex:1">
          <div style="font-size:12px;font-weight:700;color:#6b7280">${item.item_code}</div>
          <div style="font-size:18px;font-weight:800;color:#111827;margin-top:2px">${item.item_name}</div>
        </div>
        <span style="padding:5px 12px;border-radius:20px;background:${isLow ? '#fef2f2' : '#f0fdf4'};color:${isLow ? '#ef4444' : '#16a34a'};font-size:12px;font-weight:700;flex-shrink:0">
          ${isLow ? 'สต็อกต่ำ' : 'ปกติ'}
        </span>
      </div>

      <!-- Stock Info -->
      <div style="background:#f9fafb;border-radius:14px;padding:14px;margin-bottom:12px">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:12px">
          <div>
            <div style="color:#9ca3af;font-weight:600">จำนวนรวม</div>
            <div style="font-size:22px;font-weight:800;color:${isLow ? '#ef4444' : '#10b981'}">${qty}</div>
          </div>
          <div>
            <div style="color:#9ca3af;font-weight:600">จุดสั่งซื้อขั้นต่ำ</div>
            <div style="font-size:22px;font-weight:800;color:#6b7280">${reorderPoint}</div>
          </div>
          ${item.main_qty !== undefined ? `
          <div>
            <div style="color:#9ca3af;font-weight:600">คลังหลัก</div>
            <div style="font-weight:700;color:#111827">${item.main_qty || 0}</div>
          </div>
          <div>
            <div style="color:#9ca3af;font-weight:600">รถช่าง</div>
            <div style="font-weight:700;color:#111827">${item.van_qty || 0}</div>
          </div>
          ` : ''}
          <div>
            <div style="color:#9ca3af;font-weight:600">ราคาทุน</div>
            <div style="font-weight:700;color:#111827">฿${(item.cost || 0).toLocaleString('th-TH')}</div>
          </div>
          <div>
            <div style="color:#9ca3af;font-weight:600">ราคาขาย</div>
            <div style="font-weight:700;color:#10b981">฿${(item.price || 0).toLocaleString('th-TH')}</div>
          </div>
        </div>
      </div>

      <!-- Adjust Stock -->
      <div style="background:#fffbeb;border-radius:14px;padding:14px;margin-bottom:12px">
        <div style="font-size:12px;font-weight:700;color:#92400e;margin-bottom:8px">ปรับสต็อก</div>
        <div style="display:flex;gap:8px;align-items:center">
          <input type="number" id="adj-qty" placeholder="จำนวน" min="1"
            style="flex:1;padding:10px 12px;border:1.5px solid #fde68a;border-radius:10px;font-size:14px;outline:none">
          <select id="adj-type"
            style="padding:10px 12px;border:1.5px solid #fde68a;border-radius:10px;font-size:13px;outline:none;background:#fff">
            <option value="add">+ เพิ่ม</option>
            <option value="remove">- ลด</option>
          </select>
        </div>
        <input type="text" id="adj-note" placeholder="หมายเหตุ (ไม่บังคับ)"
          style="width:100%;margin-top:8px;padding:10px 12px;border:1.5px solid #fde68a;border-radius:10px;font-size:13px;outline:none;box-sizing:border-box">
        <button onclick="submitAdjustStock()"
          style="width:100%;margin-top:8px;padding:12px;background:#f59e0b;color:#fff;border:none;border-radius:12px;font-size:14px;font-weight:700;cursor:pointer">
          <i class="bi bi-arrow-repeat"></i> ปรับสต็อก
        </button>
      </div>

      <!-- Actions -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <button onclick="openCreatePOFromItem('${item.item_code}','${item.item_name}')"
          style="padding:12px;background:#eff6ff;color:#2563eb;border:none;border-radius:12px;font-size:13px;font-weight:700;cursor:pointer">
          <i class="bi bi-cart-plus-fill"></i> สั่งซื้อ
        </button>
        <button onclick="closeModal('modal-job')"
          style="padding:12px;background:#f3f4f6;color:#374151;border:none;border-radius:12px;font-size:13px;font-weight:700;cursor:pointer">
          <i class="bi bi-x-circle"></i> ปิด
        </button>
      </div>
    </div>
  `;
  document.getElementById('modal-job').classList.remove('hidden');
}

// ============================================================
// 2.6 SUBMIT ADJUST STOCK
// ============================================================
async function submitAdjustStock() {
  const item = INV.currentItem;
  if (!item) return;

  const qtyInput = document.getElementById('adj-qty');
  const typeInput = document.getElementById('adj-type');
  const noteInput = document.getElementById('adj-note');

  const qty = parseInt(qtyInput.value) || 0;
  const type = typeInput.value;
  const note = noteInput.value.trim();

  if (qty <= 0) { showToast('กรุณาระบุจำนวนที่ถูกต้อง'); return; }

  const currentQty = item.total_qty !== undefined ? item.total_qty : (item.qty || 0);
  if (type === 'remove' && qty > currentQty) {
    showToast(`❌ สต็อกไม่พอ (มี ${currentQty} ชิ้น)`);
    return;
  }

  showToast('⏳ กำลังปรับสต็อก...');

  try {
    // ใช้ transferStock หรือ updateInventoryItem
    const newQty = type === 'add' ? currentQty + qty : currentQty - qty;
    const res = await callAPI('updateInventoryItem', {
      item_code: item.item_code,
      qty: newQty,
      notes: note || `${type === 'add' ? 'เพิ่ม' : 'ลด'} ${qty} ชิ้น โดย ${(APP.user && APP.user.name) || 'PWA'}`,
      updated_by: (APP.user && APP.user.name) || APP.user || 'PWA',
    });

    if (res && res.success) {
      showToast(`✅ ปรับสต็อก "${item.item_name}" เป็น ${newQty} ชิ้น`);
      closeModal('modal-job');
      // รีโหลดหน้า inventory
      await loadInventoryPage();
    } else {
      showToast('❌ ' + (res && res.error ? res.error : 'ปรับสต็อกไม่สำเร็จ'));
    }
  } catch (e) {
    showToast('❌ ไม่สามารถเชื่อมต่อได้');
  }
}

// ============================================================
// 2.7 OPEN ADD INVENTORY MODAL (ใช้ modal ที่มีอยู่ใน index.html)
// ============================================================
function openAddInventoryModal() {
  const m = document.getElementById('modal-add-inventory');
  if (!m) return;
  // Clear fields
  m.querySelectorAll('input').forEach(el => { el.value = el.defaultValue || ''; });
  m.classList.remove('hidden');
}

// ============================================================
// 2.8 SAVE NEW INVENTORY ITEM (override billing_customer.js version)
// ============================================================
async function saveNewInventoryItem() {
  const code = (document.getElementById('inv-code') || {}).value || '';
  const name = (document.getElementById('inv-name') || {}).value || '';
  const qty = parseFloat((document.getElementById('inv-qty') || {}).value) || 0;
  const cost = parseFloat((document.getElementById('inv-cost') || {}).value) || 0;
  const price = parseFloat((document.getElementById('inv-price') || {}).value) || 0;
  const reorderPoint = parseInt((document.getElementById('inv-reorder') || {}).value) || 5;

  if (!code.trim()) { showToast('กรุณากรอกรหัสสินค้า'); return; }
  if (!name.trim()) { showToast('กรุณากรอกชื่อสินค้า'); return; }

  const btn = document.getElementById('btn-save-inventory');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="bi bi-hourglass-split"></i> กำลังบันทึก...'; }

  try {
    const res = await callAPI('addInventoryItem', {
      item_code: code.trim(),
      item_name: name.trim(),
      qty: qty,
      cost: cost,
      price: price,
      reorder_point: reorderPoint,
      added_by: (APP.user && APP.user.name) || APP.user || 'PWA',
    });

    if (res && res.success) {
      showToast(`✅ เพิ่มสินค้า "${name}" เรียบร้อย`);
      closeModal('modal-add-inventory');
      // รีโหลดหน้า inventory ถ้าอยู่หน้านั้น
      if (APP.currentPage === 'inventory') await loadInventoryPage();
    } else {
      showToast('❌ ' + (res && res.error ? res.error : 'เพิ่มสินค้าไม่สำเร็จ'));
    }
  } catch (e) {
    showToast('❌ เกิดข้อผิดพลาด: ' + e.message);
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="bi bi-plus-lg"></i> เพิ่มสินค้า'; }
  }
}

// ============================================================
// 2.9 OPEN CREATE PO FROM ITEM
// ============================================================
function openCreatePOFromItem(itemCode, itemName) {
  closeModal('modal-job');
  // เปิดหน้า PO พร้อมข้อมูลสินค้า
  const navBtn = document.getElementById('nav-po');
  goPage('po', navBtn);
  setTimeout(() => {
    if (typeof openCreatePOModal === 'function') {
      openCreatePOModal();
      // Pre-fill item
      setTimeout(() => {
        const codeInput = document.getElementById('po-item-code');
        const nameInput = document.getElementById('po-item-name');
        if (codeInput) codeInput.value = itemCode;
        if (nameInput) nameInput.value = itemName;
      }, 300);
    }
  }, 300);
}

// ============================================================
// EXPOSE GLOBALS
// ============================================================
window.loadInventoryPage = loadInventoryPage;
window.renderInventoryList = renderInventoryList;
window.searchInventory = searchInventory;
window.showInventoryDetail = showInventoryDetail;
window.submitAdjustStock = submitAdjustStock;
window.openAddInventoryModal = openAddInventoryModal;
window.saveNewInventoryItem = saveNewInventoryItem;
window.openCreatePOFromItem = openCreatePOFromItem;
