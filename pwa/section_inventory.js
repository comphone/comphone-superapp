// ============================================================
// section_inventory.js — Inventory Section + Barcode Scanner
// Extracted from dashboard_pc.html (Phase 27 modularisation)
// Globals used: callGas, DASHBOARD_DATA, loadSection, sanitizeHTML, kpiBox
// ============================================================
// ============================================================
// INVENTORY SECTION — Full Management UI (PHASE 27.1)
// ============================================================
let _inventoryData = null;
let _inventoryFilter = { search: '', location: '', alert: false };

async function renderInventorySection(data) {
  // Show loading first, then fetch real inventory data
  document.getElementById('main-content').innerHTML = `
    <div class="loading-state">
      <div class="spinner-pc"></div>
      <p>กำลังโหลดข้อมูลสต็อก...</p>
    </div>`;

  try {
    // Fetch real inventory data from backend
    const invData = await callGas('inventoryOverview');
    _inventoryData = invData;
    _renderInventoryUI(invData);
  } catch(e) {
    // Fallback to dashboard summary
    const lowStock = Number((data.summary || {}).lowStock || 0);
    document.getElementById('main-content').innerHTML = `
      <div class="kpi-row" style="margin-bottom:16px">
        ${kpiBox('bi-box-seam-fill', lowStock > 0 ? '#fef3c7' : '#f1f5f9', lowStock > 0 ? '#d97706' : '#6b7280', lowStock, 'สินค้าสต็อกต่ำ', lowStock > 0 ? '⚠️ ต้องสั่งซื้อ' : 'ปกติ')}
      </div>
      <div class="card-box">
        <div class="card-title"><i class="bi bi-exclamation-triangle" style="color:#ef4444"></i> ไม่สามารถโหลดข้อมูลสต็อก</div>
        <p style="color:#9ca3af;font-size:13px;text-align:center;padding:20px">${e.message}</p>
        <div style="text-align:center"><button class="btn-refresh" onclick="loadSection('inventory')"><i class="bi bi-arrow-clockwise"></i> ลองใหม่</button></div>
      </div>`;
  }
}

function _renderInventoryUI(invData) {
  const items = invData.items || [];
  const totalItems = items.length;
  const totalQty = items.reduce((s,i) => s + Number(i.total_qty||0), 0);
  const lowStockItems = items.filter(i => Number(i.total_qty||0) <= 5 && Number(i.total_qty||0) > 0);
  const outOfStock = items.filter(i => Number(i.total_qty||0) <= 0);
  const mainItems = items.filter(i => (i.records||[]).some(r => (r.location_type||'').toUpperCase() === 'MAIN'));
  const vanItems = items.filter(i => (i.records||[]).some(r => (r.location_type||'').toUpperCase() === 'VAN'));

  let html = `
    <!-- KPI Cards -->
    <div class="kpi-row" style="margin-bottom:16px">
      ${kpiBox('bi-box-seam-fill', '#dbeafe', '#1e40af', totalItems, 'รายการสินค้า', `${totalQty} ชิ้นรวม`)}
      ${kpiBox('bi-warehouse', '#f1f5f9', '#6b7280', mainItems.length, 'คลังหลัก (MAIN)', '')}
      ${kpiBox('bi-truck', '#f1f5f9', '#6b7280', vanItems.length, 'รถช่าง (VAN)', '')}
      ${kpiBox('bi-exclamation-triangle-fill', lowStockItems.length > 0 ? '#fef3c7' : '#d1fae5', lowStockItems.length > 0 ? '#d97706' : '#059669', lowStockItems.length, 'สต็อกต่ำ', lowStockItems.length > 0 ? '⚠️ ต้องสั่งซื้อ' : '✅ ปกติ', lowStockItems.length > 0)}
    </div>

    <!-- Action Bar -->
    <div class="card-box" style="margin-bottom:16px">
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
        <div style="flex:1;min-width:200px">
          <input type="text" id="inv-search" placeholder="🔍 ค้นหาสินค้า (รหัส/ชื่อ)..."
            style="width:100%;padding:8px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px"
            oninput="_filterInventory()">
        </div>
        <select id="inv-location-filter" style="padding:8px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px"
          onchange="_filterInventory()">
          <option value="">ทุกคลัง</option>
          <option value="MAIN">คลังหลัก (MAIN)</option>
          <option value="VAN">รถช่าง (VAN)</option>
          <option value="SITE">หน้างาน (SITE)</option>
        </select>
        <label style="display:flex;align-items:center;gap:4px;font-size:13px;cursor:pointer;white-space:nowrap">
          <input type="checkbox" id="inv-alert-filter" onchange="_filterInventory()"> ⚠️ สต็อกต่ำ
        </label>
        <button class="btn-refresh" onclick="_openInventoryScanner_()" style="background:#059669;color:#fff;border:none">
          <i class="bi bi-upc-scan"></i> สแกน
        </button>
        <button class="btn-refresh" onclick="_showAddItemModal()" style="background:#1e40af;color:#fff;border:none">
          <i class="bi bi-plus-lg"></i> เพิ่มสินค้า
        </button>
        <button class="btn-refresh" onclick="loadSection('inventory')" style="background:#f1f5f9">
          <i class="bi bi-arrow-clockwise"></i>
        </button>
      </div>
    </div>

    <!-- Inventory Table -->
    <div class="card-box">
      <div class="card-title">
        <i class="bi bi-list-columns-reverse" style="color:#1e40af"></i> รายการสินค้าคงคลัง
        <span class="badge-count" id="inv-count">${totalItems} รายการ</span>
      </div>
      <div id="inv-table-wrap">${_buildInventoryTable(items)}</div>
    </div>

    <!-- Low Stock Alert -->
    ${lowStockItems.length > 0 ? `
    <div class="card-box" style="margin-top:16px;border-left:4px solid #d97706">
      <div class="card-title"><i class="bi bi-bell-fill" style="color:#d97706"></i> แจ้งเตือนสต็อกต่ำ (${lowStockItems.length})</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px">
        ${lowStockItems.map(i => `
          <div style="background:#fef3c7;padding:8px 12px;border-radius:8px;font-size:12px">
            <strong>${i.item_code}</strong> — ${i.item_name}<br>
            <span style="color:#d97706">เหลือ ${i.total_qty} ชิ้น</span>
          </div>
        `).join('')}
      </div>
      <div style="margin-top:12px;text-align:right">
        <button class="btn-refresh" onclick="_showCreatePOFromLowStock()" style="background:#d97706;color:#fff;border:none;font-size:12px">
          <i class="bi bi-cart-plus"></i> สร้างใบสั่งซื้อจากสินค้าสต็อกต่ำ
        </button>
      </div>
    </div>` : ''}

    <!-- Out of Stock -->
    ${outOfStock.length > 0 ? `
    <div class="card-box" style="margin-top:16px;border-left:4px solid #ef4444">
      <div class="card-title"><i class="bi bi-x-circle-fill" style="color:#ef4444"></i> สินค้าหมด (${outOfStock.length})</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px">
        ${outOfStock.map(i => `
          <div style="background:#fee2e2;padding:8px 12px;border-radius:8px;font-size:12px">
            <strong>${i.item_code}</strong> — ${i.item_name}
          </div>
        `).join('')}
      </div>
    </div>` : ''}
  `;

  document.getElementById('main-content').innerHTML = html;
}

function _buildInventoryTable(items) {
  if (!items || items.length === 0) {
    return '<p style="color:#9ca3af;font-size:13px;text-align:center;padding:20px">ยังไม่มีสินค้าในระบบ</p>';
  }

  let rows = items.map(i => {
    const qty = Number(i.total_qty||0);
    const mainQ = Number(i.main_qty||0);
    const vanQ = Number(i.van_qty||0);
    const siteQ = Number(i.site_qty||0);
    const alert = qty <= 5;
    const rowBg = qty <= 0 ? '#fee2e2' : alert ? '#fef3c7' : '';

    return `<tr style="background:${rowBg}" data-code="${(i.item_code||'').toLowerCase()}" data-name="${(i.item_name||'').toLowerCase()}" data-location="${_getItemLocations(i)}" data-alert="${alert}">
      <td style="font-weight:600;font-size:13px;white-space:nowrap">
        ${alert ? '<span style="color:#ef4444;margin-right:4px">⚠️</span>' : ''}
        ${i.item_code || '-'}
      </td>
      <td style="font-size:13px;max-width:200px;overflow:hidden;text-overflow:ellipsis">${i.item_name || '-'}</td>
      <td style="text-align:center;font-weight:700;font-size:14px;${qty<=0?'color:#ef4444':alert?'color:#d97706':'color:#059669'}">${qty}</td>
      <td style="text-align:center;font-size:13px;color:#6b7280">${mainQ}</td>
      <td style="text-align:center;font-size:13px;color:#6b7280">${vanQ}</td>
      <td style="text-align:center;font-size:13px;color:#6b7280">${siteQ}</td>
      <td style="text-align:center">
        <div style="display:flex;gap:4px;justify-content:center;flex-wrap:wrap">
          <button onclick="_showItemDetail('${i.item_code}')" style="background:#dbeafe;color:#1e40af;border:none;padding:3px 8px;border-radius:6px;font-size:11px;cursor:pointer" title="ดูรายละเอียด">
            <i class="bi bi-eye"></i>
          </button>
          <button onclick="_showTransferModal('${i.item_code}','${i.item_name||''}')" style="background:#d1fae5;color:#059669;border:none;padding:3px 8px;border-radius:6px;font-size:11px;cursor:pointer" title="โอนย้ายสต็อก">
            <i class="bi bi-arrow-left-right"></i>
          </button>
          <button onclick="_showEditItemModal('${i.item_code}')" style="background:#fef3c7;color:#d97706;border:none;padding:3px 8px;border-radius:6px;font-size:11px;cursor:pointer" title="แก้ไข">
            <i class="bi bi-pencil"></i>
          </button>
        </div>
      </td>
    </tr>`;
  }).join('');

  return `<div style="overflow-x:auto">
    <table class="job-table" style="width:100%">
      <thead>
        <tr>
          <th style="white-space:nowrap">รหัส</th>
          <th>ชื่อสินค้า</th>
          <th style="text-align:center;white-space:nowrap">คงเหลือ</th>
          <th style="text-align:center;white-space:nowrap">คลัง</th>
          <th style="text-align:center;white-space:nowrap">รถช่าง</th>
          <th style="text-align:center;white-space:nowrap">หน้างาน</th>
          <th style="text-align:center;white-space:nowrap">จัดการ</th>
        </tr>
      </thead>
      <tbody id="inv-tbody">${rows}</tbody>
    </table>
  </div>`;
}

function _getItemLocations(item) {
  const locs = (item.records||[]).map(r => (r.location_type||'').toUpperCase());
  return [...new Set(locs)].join(',');
}

function _filterInventory() {
  const search = (document.getElementById('inv-search')||{}).value||'';
  const location = (document.getElementById('inv-location-filter')||{}).value||'';
  const alertOnly = (document.getElementById('inv-alert-filter')||{}).checked||false;
  const rows = document.querySelectorAll('#inv-tbody tr');
  let visible = 0;
  rows.forEach(r => {
    const code = r.dataset.code||'';
    const name = r.dataset.name||'';
    const loc = r.dataset.location||'';
    const isAlert = r.dataset.alert==='true';
    const matchSearch = !search || code.includes(search.toLowerCase()) || name.includes(search.toLowerCase());
    const matchLoc = !location || loc.includes(location);
    const matchAlert = !alertOnly || isAlert;
    const show = matchSearch && matchLoc && matchAlert;
    r.style.display = show ? '' : 'none';
    if(show) visible++;
  });
  const cnt = document.getElementById('inv-count');
  if(cnt) cnt.textContent = visible + ' รายการ';
}

// === ITEM DETAIL ===
async function _showItemDetail(itemCode) {
  try {
    const d = await callGas('getInventoryItemDetail', {item_code: itemCode});
    if(!d.success) { alert(d.error||'ไม่พบสินค้า'); return; }
    const i = d.item;
    const hist = await callGas('getStockMovementHistory', {item_code: itemCode, limit: 20});
    const movements = hist.items || [];

    let modalHtml = `
    <div id="inv-modal-overlay" onclick="this.remove()" style="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center">
      <div onclick="event.stopPropagation()" style="background:#fff;border-radius:16px;padding:24px;max-width:600px;width:90%;max-height:80vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.3)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
          <h3 style="margin:0;font-size:18px"><i class="bi bi-box-seam-fill" style="color:#1e40af"></i> ${i.item_code}</h3>
          <button onclick="document.getElementById('inv-modal-overlay').remove()" style="background:none;border:none;font-size:20px;cursor:pointer;color:#9ca3af">✕</button>
        </div>
        <table style="width:100%;font-size:13px;margin-bottom:16px">
          <tr><td style="color:#6b7280;padding:4px 8px">ชื่อ</td><td style="font-weight:600">${i.item_name||'-'}</td></tr>
          <tr><td style="color:#6b7280;padding:4px 8px">คงเหลือ</td><td style="font-weight:700;color:${Number(i.qty)<=0?'#ef4444':'#059669'}">${i.qty} ชิ้น</td></tr>
          <tr><td style="color:#6b7280;padding:4px 8px">จองแล้ว</td><td>${i.reserved||0} ชิ้น</td></tr>
          <tr><td style="color:#6b7280;padding:4px 8px">พร้อมใช้</td><td style="font-weight:600;color:${Number(i.available)<=0?'#ef4444':'#059669'}">${i.available||i.qty} ชิ้น</td></tr>
          <tr><td style="color:#6b7280;padding:4px 8px">ตำแหน่ง</td><td>${i.location_type||'-'} / ${i.location_code||'-'} / ${i.assigned_to||'-'}</td></tr>
          <tr><td style="color:#6b7280;padding:4px 8px">ทุน</td><td>฿${Number(i.cost||0).toLocaleString()}</td></tr>
          <tr><td style="color:#6b7280;padding:4px 8px">ราคาขาย</td><td>฿${Number(i.price||0).toLocaleString()}</td></tr>
          <tr><td style="color:#6b7280;padding:4px 8px">จุดสั่งซื้อ</td><td>${i.reorder_point||5}</td></tr>
          <tr><td style="color:#6b7280;padding:4px 8px">อัปเดต</td><td>${i.updated_at||'-'}</td></tr>
          ${i.notes ? `<tr><td style="color:#6b7280;padding:4px 8px">หมายเหตุ</td><td>${i.notes}</td></tr>` : ''}
        </table>
        ${movements.length > 0 ? `
        <div style="font-size:13px;font-weight:600;margin-bottom:8px"><i class="bi bi-clock-history" style="color:#6b7280"></i> ประวัติล่าสุด (${movements.length})</div>
        <div style="max-height:200px;overflow-y:auto">
          <table style="width:100%;font-size:11px">
            <thead><tr style="background:#f8fafc"><th style="padding:4px">วันที่</th><th>การดำเนินการ</th><th>จำนวน</th><th>โดย</th></tr></thead>
            <tbody>
              ${movements.map(m => `<tr>
                <td style="padding:4px;white-space:nowrap">${(m.timestamp||'').substring(0,16)}</td>
                <td>${m.action||'-'}</td>
                <td style="font-weight:600;color:${Number(m.qty_change)>0?'#059669':'#ef4444'}">${Number(m.qty_change)>0?'+':''}${m.qty_change}</td>
                <td>${m.changed_by||'-'}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>` : '<p style="color:#9ca3af;font-size:12px">ยังไม่มีประวัติการเคลื่อนไหว</p>'}
        <div style="margin-top:16px;display:flex;gap:8px;justify-content:flex-end">
          <button onclick="_showTransferModal('${i.item_code}','${i.item_name||''}')" style="background:#059669;color:#fff;border:none;padding:8px 16px;border-radius:8px;font-size:12px;cursor:pointer">
            <i class="bi bi-arrow-left-right"></i> โอนย้าย
          </button>
          <button onclick="_showEditItemModal('${i.item_code}')" style="background:#d97706;color:#fff;border:none;padding:8px 16px;border-radius:8px;font-size:12px;cursor:pointer">
            <i class="bi bi-pencil"></i> แก้ไข
          </button>
        </div>
      </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
  } catch(e) { alert('Error: ' + e.message); }
}

// === TRANSFER STOCK ===
function _showTransferModal(code, name) {
  const m = `<div id="inv-modal-overlay" onclick="this.remove()" style="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center">
    <div onclick="event.stopPropagation()" style="background:#fff;border-radius:16px;padding:24px;max-width:420px;width:90%">
      <h3 style="margin:0 0 16px;font-size:16px"><i class="bi bi-arrow-left-right" style="color:#059669"></i> โอนย้ายสต็อก</h3>
      <div style="font-size:13px;margin-bottom:12px"><strong>${code}</strong> — ${name}</div>
      <div style="display:flex;gap:8px;margin-bottom:12px">
        <div style="flex:1">
          <label style="font-size:12px;color:#6b7280">จาก</label>
          <select id="tr-from" style="width:100%;padding:8px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px">
            <option value="MAIN">คลังหลัก (MAIN)</option>
            <option value="VAN">รถช่าง (VAN)</option>
            <option value="SITE">หน้างาน (SITE)</option>
          </select>
        </div>
        <div style="flex:1">
          <label style="font-size:12px;color:#6b7280">ไปยัง</label>
          <select id="tr-to" style="width:100%;padding:8px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px">
            <option value="VAN">รถช่าง (VAN)</option>
            <option value="MAIN">คลังหลัก (MAIN)</option>
            <option value="SITE">หน้างาน (SITE)</option>
          </select>
        </div>
      </div>
      <div style="margin-bottom:12px">
        <label style="font-size:12px;color:#6b7280">จำนวน</label>
        <input type="number" id="tr-qty" value="1" min="1" style="width:100%;padding:8px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px">
      </div>
      <div style="margin-bottom:12px">
        <label style="font-size:12px;color:#6b7280">เลขงาน (ถ้ามี)</label>
        <input type="text" id="tr-job" placeholder="JOB-..." style="width:100%;padding:8px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px">
      </div>
      <div id="tr-result" style="display:none;margin-bottom:12px"></div>
      <div style="display:flex;gap:8px;justify-content:flex-end">
        <button onclick="document.getElementById('inv-modal-overlay').remove()" style="background:#f1f5f9;border:none;padding:8px 16px;border-radius:8px;font-size:13px;cursor:pointer">ยกเลิก</button>
        <button onclick="_doTransfer('${code}')" style="background:#059669;color:#fff;border:none;padding:8px 16px;border-radius:8px;font-size:13px;cursor:pointer;font-weight:600">
          <i class="bi bi-check-lg"></i> โอนย้าย
        </button>
      </div>
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend', m);
}

async function _doTransfer(code) {
  const from = document.getElementById('tr-from').value;
  const to = document.getElementById('tr-to').value;
  const qty = parseInt(document.getElementById('tr-qty').value)||1;
  const jobId = document.getElementById('tr-job').value;
  const resEl = document.getElementById('tr-result');
  if(from === to) { resEl.style.display='block'; resEl.innerHTML='<span style="color:#ef4444;font-size:12px">ต้นทางและปลายทางต้องไม่เหมือนกัน</span>'; return; }
  try {
    resEl.style.display='block'; resEl.innerHTML='<span style="color:#6b7280;font-size:12px">กำลังโอน...</span>';
    const r = await callGas('transferStock', {from_location:from, to_location:to, item_code:code, qty:qty, job_id:jobId, changed_by:'PC Dashboard'});
    if(r.success) {
      resEl.innerHTML = `<span style="color:#059669;font-size:12px">✅ โอนสำเร็จ: ${r.item_name||code} ×${qty} → ${to}</span>`;
      setTimeout(()=>{ document.getElementById('inv-modal-overlay').remove(); loadSection('inventory'); }, 1200);
    } else {
      resEl.innerHTML = `<span style="color:#ef4444;font-size:12px">❌ ${r.error||'โอนไม่สำเร็จ'}</span>`;
    }
  } catch(e) { resEl.innerHTML = `<span style="color:#ef4444;font-size:12px">❌ ${e.message}</span>`; }
}

// === ADD ITEM ===
function _showAddItemModal() {
  const m = `<div id="inv-modal-overlay" onclick="this.remove()" style="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center">
    <div onclick="event.stopPropagation()" style="background:#fff;border-radius:16px;padding:24px;max-width:480px;width:90%;max-height:80vh;overflow-y:auto">
      <h3 style="margin:0 0 16px;font-size:16px"><i class="bi bi-plus-lg" style="color:#1e40af"></i> เพิ่มสินค้าใหม่</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div style="grid-column:1/3">
          <label style="font-size:12px;color:#6b7280">รหัสสินค้า *</label>
          <input type="text" id="add-code" placeholder="เช่น ITM-001" style="width:100%;padding:8px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px">
        </div>
        <div style="grid-column:1/3">
          <label style="font-size:12px;color:#6b7280">ชื่อสินค้า *</label>
          <input type="text" id="add-name" placeholder="ชื่อสินค้า" style="width:100%;padding:8px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px">
        </div>
        <div>
          <label style="font-size:12px;color:#6b7280">จำนวนเริ่มต้น</label>
          <input type="number" id="add-qty" value="0" min="0" style="width:100%;padding:8px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px">
        </div>
        <div>
          <label style="font-size:12px;color:#6b7280">จุดสั่งซื้อ</label>
          <input type="number" id="add-reorder" value="5" min="0" style="width:100%;padding:8px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px">
        </div>
        <div>
          <label style="font-size:12px;color:#6b7280">ทุน (฿)</label>
          <input type="number" id="add-cost" value="0" min="0" step="0.01" style="width:100%;padding:8px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px">
        </div>
        <div>
          <label style="font-size:12px;color:#6b7280">ราคาขาย (฿)</label>
          <input type="number" id="add-price" value="0" min="0" step="0.01" style="width:100%;padding:8px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px">
        </div>
        <div>
          <label style="font-size:12px;color:#6b7280">คลัง</label>
          <select id="add-location" style="width:100%;padding:8px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px">
            <option value="MAIN">คลังหลัก (MAIN)</option>
            <option value="VAN">รถช่าง (VAN)</option>
          </select>
        </div>
        <div>
          <label style="font-size:12px;color:#6b7280">ผู้รับผิดชอบ</label>
          <input type="text" id="add-assigned" placeholder="ช่าง..." style="width:100%;padding:8px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px">
        </div>
      </div>
      <div id="add-result" style="display:none;margin-top:12px"></div>
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px">
        <button onclick="document.getElementById('inv-modal-overlay').remove()" style="background:#f1f5f9;border:none;padding:8px 16px;border-radius:8px;font-size:13px;cursor:pointer">ยกเลิก</button>
        <button onclick="_doAddItem()" style="background:#1e40af;color:#fff;border:none;padding:8px 16px;border-radius:8px;font-size:13px;cursor:pointer;font-weight:600">
          <i class="bi bi-plus-lg"></i> เพิ่มสินค้า
        </button>
      </div>
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend', m);
}

async function _doAddItem() {
  const code = document.getElementById('add-code').value.trim();
  const name = document.getElementById('add-name').value.trim();
  if(!code||!name) { document.getElementById('add-result').style.display='block'; document.getElementById('add-result').innerHTML='<span style="color:#ef4444;font-size:12px">กรอกรหัสและชื่อสินค้า</span>'; return; }
  const resEl = document.getElementById('add-result');
  try {
    resEl.style.display='block'; resEl.innerHTML='<span style="color:#6b7280;font-size:12px">กำลังเพิ่ม...</span>';
    const r = await callGas('addInventoryItem', {
      item_code: code, item_name: name,
      qty: parseInt(document.getElementById('add-qty').value)||0,
      cost: parseFloat(document.getElementById('add-cost').value)||0,
      price: parseFloat(document.getElementById('add-price').value)||0,
      location_type: document.getElementById('add-location').value,
      assigned_to: document.getElementById('add-assigned').value,
      reorder_point: parseInt(document.getElementById('add-reorder').value)||5,
      added_by: 'PC Dashboard'
    });
    if(r.success) {
      resEl.innerHTML = `<span style="color:#059669;font-size:12px">✅ เพิ่มสำเร็จ: ${code} — ${name}</span>`;
      setTimeout(()=>{ document.getElementById('inv-modal-overlay').remove(); loadSection('inventory'); }, 1200);
    } else {
      resEl.innerHTML = `<span style="color:#ef4444;font-size:12px">❌ ${r.error||'เพิ่มไม่สำเร็จ'}</span>`;
    }
  } catch(e) { resEl.innerHTML = `<span style="color:#ef4444;font-size:12px">❌ ${e.message}</span>`; }
}

// === EDIT ITEM ===
async function _showEditItemModal(code) {
  try {
    const d = await callGas('getInventoryItemDetail', {item_code: code});
    if(!d.success) { alert(d.error||'ไม่พบสินค้า'); return; }
    const i = d.item;
    const m = `<div id="inv-modal-overlay" onclick="this.remove()" style="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center">
      <div onclick="event.stopPropagation()" style="background:#fff;border-radius:16px;padding:24px;max-width:480px;width:90%;max-height:80vh;overflow-y:auto">
        <h3 style="margin:0 0 16px;font-size:16px"><i class="bi bi-pencil" style="color:#d97706"></i> แก้ไขสินค้า: ${code}</h3>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div style="grid-column:1/3">
            <label style="font-size:12px;color:#6b7280">ชื่อสินค้า</label>
            <input type="text" id="ed-name" value="${(i.item_name||'').replace(/"/g,'&quot;')}" style="width:100%;padding:8px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px">
          </div>
          <div>
            <label style="font-size:12px;color:#6b7280">จำนวน</label>
            <input type="number" id="ed-qty" value="${i.qty||0}" style="width:100%;padding:8px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px">
          </div>
          <div>
            <label style="font-size:12px;color:#6b7280">จุดสั่งซื้อ</label>
            <input type="number" id="ed-reorder" value="${i.reorder_point||5}" style="width:100%;padding:8px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px">
          </div>
          <div>
            <label style="font-size:12px;color:#6b7280">ทุน (฿)</label>
            <input type="number" id="ed-cost" value="${i.cost||0}" step="0.01" style="width:100%;padding:8px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px">
          </div>
          <div>
            <label style="font-size:12px;color:#6b7280">ราคาขาย (฿)</label>
            <input type="number" id="ed-price" value="${i.price||0}" step="0.01" style="width:100%;padding:8px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px">
          </div>
          <div style="grid-column:1/3">
            <label style="font-size:12px;color:#6b7280">หมายเหตุ</label>
            <input type="text" id="ed-notes" value="${(i.notes||'').replace(/"/g,'&quot;')}" style="width:100%;padding:8px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px">
          </div>
        </div>
        <div id="ed-result" style="display:none;margin-top:12px"></div>
        <div style="display:flex;gap:8px;justify-content:space-between;margin-top:16px">
          <button onclick="_doDeleteItem('${code}')" style="background:#fee2e2;color:#ef4444;border:none;padding:8px 16px;border-radius:8px;font-size:12px;cursor:pointer">
            <i class="bi bi-trash"></i> ลบ
          </button>
          <div style="display:flex;gap:8px">
            <button onclick="document.getElementById('inv-modal-overlay').remove()" style="background:#f1f5f9;border:none;padding:8px 16px;border-radius:8px;font-size:13px;cursor:pointer">ยกเลิก</button>
            <button onclick="_doEditItem('${code}')" style="background:#d97706;color:#fff;border:none;padding:8px 16px;border-radius:8px;font-size:13px;cursor:pointer;font-weight:600">
              <i class="bi bi-check-lg"></i> บันทึก
            </button>
          </div>
        </div>
      </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', m);
  } catch(e) { alert('Error: ' + e.message); }
}

async function _doEditItem(code) {
  const resEl = document.getElementById('ed-result');
  try {
    resEl.style.display='block'; resEl.innerHTML='<span style="color:#6b7280;font-size:12px">กำลังบันทึก...</span>';
    const r = await callGas('updateInventoryItem', {
      item_code: code,
      item_name: document.getElementById('ed-name').value,
      qty: parseInt(document.getElementById('ed-qty').value),
      cost: parseFloat(document.getElementById('ed-cost').value),
      price: parseFloat(document.getElementById('ed-price').value),
      reorder_point: parseInt(document.getElementById('ed-reorder').value),
      notes: document.getElementById('ed-notes').value,
      updated_by: 'PC Dashboard'
    });
    if(r.success) {
      resEl.innerHTML = '<span style="color:#059669;font-size:12px">✅ บันทึกสำเร็จ</span>';
      setTimeout(()=>{ document.getElementById('inv-modal-overlay').remove(); loadSection('inventory'); }, 1000);
    } else {
      resEl.innerHTML = `<span style="color:#ef4444;font-size:12px">❌ ${r.error||'บันทึกไม่สำเร็จ'}</span>`;
    }
  } catch(e) { resEl.innerHTML = `<span style="color:#ef4444;font-size:12px">❌ ${e.message}</span>`; }
}

async function _doDeleteItem(code) {
  if(!confirm(`ลบสินค้า ${code}? การดำเนินการนี้ไม่สามารถย้อนกลับได้`)) return;
  try {
    const r = await callGas('deleteInventoryItem', {item_code: code, deleted_by: 'PC Dashboard'});
    if(r.success) {
      document.getElementById('inv-modal-overlay').remove();
      loadSection('inventory');
    } else { alert(r.error||'ลบไม่สำเร็จ'); }
  } catch(e) { alert('Error: ' + e.message); }
}

// === CREATE PO FROM LOW STOCK ===
async function _showCreatePOFromLowStock() {
  if(!_inventoryData) return;
  const lowItems = (_inventoryData.items||[]).filter(i => Number(i.total_qty||0) <= 5 && Number(i.total_qty||0) > 0);
  if(lowItems.length === 0) { alert('ไม่มีสินค้าสต็อกต่ำ'); return; }

  const m = `<div id="inv-modal-overlay" onclick="this.remove()" style="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center">
    <div onclick="event.stopPropagation()" style="background:#fff;border-radius:16px;padding:24px;max-width:560px;width:90%;max-height:80vh;overflow-y:auto">
      <h3 style="margin:0 0 16px;font-size:16px"><i class="bi bi-cart-plus" style="color:#d97706"></i> สร้างใบสั่งซื้อ</h3>
      <div style="margin-bottom:12px">
        <label style="font-size:12px;color:#6b7280">ผู้จำหน่าย</label>
        <input type="text" id="po-supplier" placeholder="ชื่อผู้จำหน่าย" style="width:100%;padding:8px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px">
      </div>
      <table style="width:100%;font-size:12px;margin-bottom:12px">
        <thead><tr style="background:#f8fafc"><th style="padding:6px">รหัส</th><th>ชื่อ</th><th>คงเหลือ</th><th>สั่งซื้อ</th></tr></thead>
        <tbody>
          ${lowItems.map(i => `<tr>
            <td style="padding:6px;font-weight:600">${i.item_code}</td>
            <td>${i.item_name}</td>
            <td style="color:#d97706">${i.total_qty}</td>
            <td><input type="number" id="po-qty-${i.item_code}" value="${10-Number(i.total_qty)}" min="1" style="width:60px;padding:4px;border:1px solid #e2e8f0;border-radius:4px;font-size:12px"></td>
          </tr>`).join('')}
        </tbody>
      </table>
      <div id="po-result" style="display:none;margin-bottom:12px"></div>
      <div style="display:flex;gap:8px;justify-content:flex-end">
        <button onclick="document.getElementById('inv-modal-overlay').remove()" style="background:#f1f5f9;border:none;padding:8px 16px;border-radius:8px;font-size:13px;cursor:pointer">ยกเลิก</button>
        <button onclick="_doCreatePO()" style="background:#d97706;color:#fff;border:none;padding:8px 16px;border-radius:8px;font-size:13px;cursor:pointer;font-weight:600">
          <i class="bi bi-check-lg"></i> สร้าง PO
        </button>
      </div>
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend', m);
}

async function _doCreatePO() {
  if(!_inventoryData) return;
  const lowItems = (_inventoryData.items||[]).filter(i => Number(i.total_qty||0) <= 5 && Number(i.total_qty||0) > 0);
  const supplier = document.getElementById('po-supplier').value.trim();
  const resEl = document.getElementById('po-result');
  const poItems = lowItems.map(i => ({
    item_code: i.item_code, item_name: i.item_name,
    qty: parseInt(document.getElementById('po-qty-'+i.item_code).value)||10,
    unit_cost: 0
  })).filter(i => i.qty > 0);
  if(poItems.length === 0) { resEl.style.display='block'; resEl.innerHTML='<span style="color:#ef4444;font-size:12px">เลือกอย่างน้อย 1 รายการ</span>'; return; }
  try {
    resEl.style.display='block'; resEl.innerHTML='<span style="color:#6b7280;font-size:12px">กำลังสร้าง...</span>';
    const r = await callGas('createPurchaseOrder', {items: poItems, supplier: supplier||'TBD', notes: 'Auto from low-stock alert'});
    if(r.success) {
      resEl.innerHTML = `<span style="color:#059669;font-size:12px">✅ สร้าง PO สำเร็จ: ${r.po_id} (${r.total_items} รายการ)</span>`;
      setTimeout(()=>{ document.getElementById('inv-modal-overlay').remove(); loadSection('po'); }, 1500);
    } else {
      resEl.innerHTML = `<span style="color:#ef4444;font-size:12px">❌ ${r.error||'สร้างไม่สำเร็จ'}</span>`;
    }
  } catch(e) { resEl.innerHTML = `<span style="color:#ef4444;font-size:12px">❌ ${e.message}</span>`; }
}

// ============================================================
// BARCODE SCANNER — Search by barcode/code (PHASE 27.6)
// ============================================================
function _showBarcodeScanner() {
  const m = `<div id="inv-modal-overlay" onclick="this.remove()" style="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center">
    <div onclick="event.stopPropagation()" style="background:#fff;border-radius:16px;padding:24px;max-width:420px;width:90%">
      <h3 style="margin:0 0 16px;font-size:16px"><i class="bi bi-upc-scan" style="color:#059669"></i> ค้นหาสินค้า (Barcode/รหัส)</h3>
      <div style="margin-bottom:12px">
        <input type="text" id="scan-input" placeholder="สแกนหรือพิมพ์ barcode/รหัสสินค้า..."
          style="width:100%;padding:12px;border:2px solid #059669;border-radius:8px;font-size:16px;font-weight:600;text-align:center"
          autofocus onkeydown="if(event.key==='Enter')_doBarcodeLookup()">
      </div>
      <div id="scan-result" style="display:none"></div>
      <div style="display:flex;gap:8px;justify-content:flex-end">
        <button onclick="document.getElementById('inv-modal-overlay').remove()" style="background:#f1f5f9;border:none;padding:8px 16px;border-radius:8px;font-size:13px;cursor:pointer">ปิด</button>
        <button onclick="_doBarcodeLookup()" style="background:#059669;color:#fff;border:none;padding:8px 16px;border-radius:8px;font-size:13px;cursor:pointer;font-weight:600">
          <i class="bi bi-search"></i> ค้นหา
        </button>
      </div>
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend', m);
  setTimeout(() => { const inp = document.getElementById('scan-input'); if(inp) inp.focus(); }, 200);
}

async function _doBarcodeLookup() {
  const barcode = (document.getElementById('scan-input')?.value||'').trim();
  if(!barcode) return;
  const resEl = document.getElementById('scan-result');
  try {
    resEl.style.display='block'; resEl.innerHTML='<span style="color:#6b7280;font-size:12px">กำลังค้นหา...</span>';
    const r = await callGas('barcodeLookup', {barcode: barcode});
    if(r && r.found) {
      const alert = r.alert ? '⚠️ สต็อกต่ำ' : '✅ ปกติ';
      resEl.innerHTML = `
        <div style="background:#f8fafc;border-radius:8px;padding:12px;margin-top:8px">
          <div style="font-size:16px;font-weight:700;color:#1e40af">${r.code}</div>
          <div style="font-size:14px;margin:4px 0">${r.name}</div>
          <div style="display:flex;gap:16px;margin-top:8px">
            <div><span style="font-size:12px;color:#6b7280">คงเหลือ</span><br><span style="font-size:18px;font-weight:700;color:${r.alert?'#ef4444':'#059669'}">${r.qty}</span></div>
            <div><span style="font-size:12px;color:#6b7280">ทุน</span><br><span style="font-size:14px">฿${Number(r.cost||0).toLocaleString()}</span></div>
            <div><span style="font-size:12px;color:#6b7280">ขาย</span><br><span style="font-size:14px">฿${Number(r.price||0).toLocaleString()}</span></div>
          </div>
          <div style="margin-top:8px;font-size:12px;color:${r.alert?'#ef4444':'#059669'}">${alert} ${r.statusText||''}</div>
        </div>`;
    } else {
      resEl.innerHTML = `<div style="background:#fee2e2;border-radius:8px;padding:12px;margin-top:8px">
        <span style="color:#ef4444;font-size:13px">❌ ไม่พบสินค้า: ${barcode}</span>
      </div>`;
    }
  } catch(e) { resEl.innerHTML = `<span style="color:#ef4444;font-size:12px">❌ ${e.message}</span>`; }
}
// _openInventoryScanner_ — Camera scanner (if available) with text-input fallback
// inventory_ui.js provides openBarcodeScanner() on mobile PWA
function _openInventoryScanner_() {
  if (typeof openBarcodeScanner === 'function') {
    openBarcodeScanner((barcode) => {
      const inp = document.getElementById('scan-input');
      if (inp) inp.value = barcode;
      _doBarcodeLookup();
    });
  } else {
    _showBarcodeScanner();
  }
}
