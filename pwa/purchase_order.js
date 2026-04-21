/* ===== PURCHASE ORDER MODULE — COMPHONE SUPER APP v5.5.4 ===== */
'use strict';

// ===== STATE =====
let ALL_PO = [];
let PO_FILTER = 'all';
let PO_ITEMS = []; // รายการสินค้าในฟอร์มสร้าง PO

// ===== callApi fallback — PHASE 20.4: ใช้ AI_EXECUTOR แทน fetch =====
if (typeof callApi === 'undefined') {
  window.callApi = async function(payload) {
    payload = payload || {};
    const action = payload.action;
    if (!action) return { success: false, error: 'ไม่พบ action ใน payload' };
    const params = Object.assign({}, payload);
    delete params.action;

    try {
      const method = (typeof isReadAction === 'function' && isReadAction(action)) ? 'query' : 'execute';
      if (!window.AI_EXECUTOR || !window.AI_EXECUTOR[method]) {
        return { success: false, error: 'AI_EXECUTOR ยังไม่พร้อมใช้งาน' };
      }
      const data = await window.AI_EXECUTOR[method]({ action: action, payload: params });
      if (data && data._headers) delete data._headers;
      return data;
    } catch (e) {
      if (e.message && e.message.includes('APPROVAL_REQUIRED')) {
        return { success: false, error: 'APPROVAL_REQUIRED', message: 'กรุณาขออนุมัติการดำเนินการ' };
      }
      return { success: false, error: e.message };
    }
  };
}

// ===== LOAD PAGE =====
function loadPurchaseOrderPage() {
  const container = document.getElementById('po-list');
  if (!container) return;
  if (ALL_PO.length > 0) { renderPOList(ALL_PO); return; }

  container.innerHTML = '<div style="text-align:center;padding:40px;color:#9ca3af"><div class="spinner" style="margin:0 auto 12px"></div><p>กำลังโหลดใบสั่งซื้อ...</p></div>';

  callApi({ action: 'listPurchaseOrders', limit: 50 }).then(res => {
    if (res && res.success) {
      ALL_PO = res.items || [];
      renderPOList(ALL_PO);
      updatePOBadge(ALL_PO);
    } else {
      container.innerHTML = `<div class="empty-state">
        <i class="bi bi-cart-x" style="font-size:40px;color:#d1d5db;display:block;margin-bottom:8px"></i>
        <p style="color:#9ca3af">ยังไม่มีใบสั่งซื้อ</p>
        <button class="btn-add-job" onclick="showCreatePOModal()">
          <i class="bi bi-plus-circle-fill"></i> สร้างใบสั่งซื้อแรก
        </button>
      </div>`;
    }
  }).catch(() => {
    container.innerHTML = `<div class="empty-state">
      <i class="bi bi-wifi-off" style="font-size:40px;color:#d1d5db;display:block;margin-bottom:8px"></i>
      <p style="color:#9ca3af">ไม่สามารถโหลดข้อมูลได้</p>
      <button class="btn-add-job" onclick="loadPurchaseOrderPage()">
        <i class="bi bi-arrow-clockwise"></i> ลองใหม่
      </button>
    </div>`;
  });
}

// ===== RENDER LIST =====
function renderPOList(orders) {
  const container = document.getElementById('po-list');
  if (!container) return;

  let filtered = orders;
  if (PO_FILTER === 'pending') filtered = orders.filter(o => o.status === 'PENDING');
  else if (PO_FILTER === 'received') filtered = orders.filter(o => o.status === 'RECEIVED');
  else if (PO_FILTER === 'cancelled') filtered = orders.filter(o => o.status === 'CANCELLED');

  if (!filtered.length) {
    container.innerHTML = `
      <div style="padding:8px 16px;display:flex;justify-content:space-between;align-items:center">
        <span style="color:#6b7280;font-size:13px">ใบสั่งซื้อ 0 รายการ</span>
        <button class="btn-add-job" onclick="showCreatePOModal()" style="padding:6px 14px;font-size:12px">
          <i class="bi bi-plus-circle-fill"></i> สร้าง PO
        </button>
      </div>
      <div class="empty-state">
        <i class="bi bi-cart-x" style="font-size:36px;color:#d1d5db;display:block;margin-bottom:8px"></i>
        <p style="color:#9ca3af">ไม่พบใบสั่งซื้อในหมวดนี้</p>
      </div>`;
    return;
  }

  const statusConfig = {
    PENDING:   { label: 'รอรับสินค้า', bg: '#fef3c7', color: '#92400e', icon: 'bi-clock-fill' },
    RECEIVED:  { label: 'รับแล้ว',     bg: '#d1fae5', color: '#065f46', icon: 'bi-check-circle-fill' },
    CANCELLED: { label: 'ยกเลิก',      bg: '#fee2e2', color: '#991b1b', icon: 'bi-x-circle-fill' }
  };

  container.innerHTML = `
    <div style="padding:8px 16px;display:flex;justify-content:space-between;align-items:center">
      <span style="color:#6b7280;font-size:13px">ใบสั่งซื้อ ${filtered.length} รายการ</span>
      <button class="btn-add-job" onclick="showCreatePOModal()" style="padding:6px 14px;font-size:12px">
        <i class="bi bi-plus-circle-fill"></i> สร้าง PO
      </button>
    </div>
    ${filtered.map(po => {
      const sc = statusConfig[po.status] || statusConfig.PENDING;
      const dateStr = po.created_at ? new Date(po.created_at).toLocaleDateString('th-TH', { day:'numeric', month:'short', year:'2-digit' }) : '-';
      const totalItems = po.items ? po.items.length : 0;
      return `
      <div class="job-card" onclick="showPODetail('${po.po_id}')">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
          <div>
            <div style="font-size:11px;color:#9ca3af;font-weight:600">${po.po_id}</div>
            <div style="font-size:14px;font-weight:800;color:#111827;margin-top:2px">${po.supplier || 'ไม่ระบุผู้จำหน่าย'}</div>
            <div style="font-size:12px;color:#6b7280;margin-top:2px">
              <i class="bi bi-calendar3"></i> ${dateStr} &nbsp;|&nbsp;
              <i class="bi bi-box-seam"></i> ${totalItems} รายการ
            </div>
          </div>
          <div style="text-align:right">
            <span style="background:${sc.bg};color:${sc.color};padding:4px 10px;border-radius:20px;font-size:11px;font-weight:700;display:inline-flex;align-items:center;gap:4px">
              <i class="bi ${sc.icon}"></i> ${sc.label}
            </span>
            <div style="font-size:16px;font-weight:900;color:#10b981;margin-top:6px">
              ฿${Number(po.total_cost || 0).toLocaleString()}
            </div>
          </div>
        </div>
        ${po.status === 'PENDING' ? `
        <div class="job-actions" onclick="event.stopPropagation()">
          <button class="job-act-btn btn-success-sm" onclick="confirmReceivePO('${po.po_id}')">
            <i class="bi bi-box-arrow-in-down"></i> รับสินค้า
          </button>
          <button class="job-act-btn btn-gray-sm" onclick="showPODetail('${po.po_id}')">
            <i class="bi bi-eye"></i> ดูรายละเอียด
          </button>
        </div>` : ''}
      </div>`;
    }).join('')}
  `;
}

// ===== FILTER =====
function filterPOStatus(status, btn) {
  PO_FILTER = status;
  document.querySelectorAll('#page-po .filter-tab').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderPOList(ALL_PO);
}

function filterPOSearch(q) {
  if (!q) { renderPOList(ALL_PO); return; }
  const lq = q.toLowerCase();
  const filtered = ALL_PO.filter(o =>
    (o.po_id || '').toLowerCase().includes(lq) ||
    (o.supplier || '').toLowerCase().includes(lq) ||
    (o.items || []).some(i => (i.item_name || '').toLowerCase().includes(lq))
  );
  renderPOList(filtered);
}

// ===== PO DETAIL MODAL =====
function showPODetail(poId) {
  const po = ALL_PO.find(o => o.po_id === poId);
  if (!po) return;

  const statusConfig = {
    PENDING:   { label: 'รอรับสินค้า', bg: '#fef3c7', color: '#92400e' },
    RECEIVED:  { label: 'รับแล้ว',     bg: '#d1fae5', color: '#065f46' },
    CANCELLED: { label: 'ยกเลิก',      bg: '#fee2e2', color: '#991b1b' }
  };
  const sc = statusConfig[po.status] || statusConfig.PENDING;
  const dateStr = po.created_at ? new Date(po.created_at).toLocaleString('th-TH') : '-';

  document.getElementById('modal-po-content').innerHTML = `
    <div style="padding:0 16px 20px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <div>
          <div style="font-size:11px;color:#9ca3af;font-weight:600">ใบสั่งซื้อ</div>
          <div style="font-size:18px;font-weight:900;color:#111827">${po.po_id}</div>
        </div>
        <span style="background:${sc.bg};color:${sc.color};padding:6px 14px;border-radius:20px;font-size:12px;font-weight:700">${sc.label}</span>
      </div>

      <div style="background:#f9fafb;border-radius:14px;padding:14px;margin-bottom:12px">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:12px">
          <div>
            <div style="color:#9ca3af;font-weight:600">ผู้จำหน่าย</div>
            <div style="font-weight:700;color:#111827">${po.supplier || '-'}</div>
          </div>
          <div>
            <div style="color:#9ca3af;font-weight:600">วันที่สั่ง</div>
            <div style="font-weight:700;color:#111827">${dateStr}</div>
          </div>
          <div>
            <div style="color:#9ca3af;font-weight:600">จำนวนรายการ</div>
            <div style="font-weight:700;color:#111827">${(po.items || []).length} รายการ</div>
          </div>
          <div>
            <div style="color:#9ca3af;font-weight:600">ยอดรวม</div>
            <div style="font-weight:800;color:#10b981;font-size:16px">฿${Number(po.total_cost || 0).toLocaleString()}</div>
          </div>
        </div>
      </div>

      <div style="margin-bottom:12px">
        <div class="section-label">รายการสินค้า</div>
        <div style="border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">
          <table style="width:100%;font-size:12px;border-collapse:collapse">
            <thead>
              <tr style="background:#f9fafb">
                <th style="padding:8px 12px;text-align:left;color:#6b7280;font-weight:600">สินค้า</th>
                <th style="padding:8px 8px;text-align:center;color:#6b7280;font-weight:600">จำนวน</th>
                <th style="padding:8px 12px;text-align:right;color:#6b7280;font-weight:600">รวม</th>
              </tr>
            </thead>
            <tbody>
              ${(po.items || []).map((item, i) => `
              <tr style="border-top:1px solid #f3f4f6;background:${i%2===0?'#fff':'#fafafa'}">
                <td style="padding:8px 12px">
                  <div style="font-weight:700;color:#111827">${item.item_name || '-'}</div>
                  ${item.item_code ? `<div style="font-size:10px;color:#9ca3af">${item.item_code}</div>` : ''}
                </td>
                <td style="padding:8px;text-align:center;color:#374151;font-weight:600">${item.qty}</td>
                <td style="padding:8px 12px;text-align:right;font-weight:700;color:#10b981">฿${Number(item.total_cost || 0).toLocaleString()}</td>
              </tr>`).join('')}
            </tbody>
            <tfoot>
              <tr style="background:#f0fdf4;border-top:2px solid #d1fae5">
                <td colspan="2" style="padding:10px 12px;font-weight:800;color:#065f46">ยอดรวมทั้งหมด</td>
                <td style="padding:10px 12px;text-align:right;font-weight:900;color:#10b981;font-size:15px">฿${Number(po.total_cost || 0).toLocaleString()}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      ${po.status === 'PENDING' ? `
      <button class="btn-setup" onclick="confirmReceivePO('${po.po_id}');closeModal('modal-po')" style="background:linear-gradient(135deg,#10b981,#059669)">
        <i class="bi bi-box-arrow-in-down"></i> รับสินค้าเข้าคลัง
      </button>` : ''}
    </div>
  `;
  document.getElementById('modal-po').classList.remove('hidden');
}

// ===== RECEIVE PO =====
function confirmReceivePO(poId) {
  if (!confirm(`ยืนยันรับสินค้าตามใบสั่งซื้อ ${poId}?\n\nระบบจะเพิ่มสต็อกสินค้าทุกรายการในใบนี้อัตโนมัติ`)) return;
  showToast('⏳ กำลังรับสินค้าเข้าคลัง...');
  callApi({
    action: 'receivePurchaseOrder',
    po_id: poId,
    received_by: APP.user ? APP.user.name : 'ADMIN'
  }).then(res => {
    if (res && res.success) {
      showToast(`✅ รับสินค้าสำเร็จ! ${res.received_items || 0} รายการเข้าคลังแล้ว`);
      closeModal('modal-po');
      ALL_PO = [];
      loadPurchaseOrderPage();
    } else {
      showToast('❌ ' + (res && res.error ? res.error : 'เกิดข้อผิดพลาด'));
    }
  }).catch(() => showToast('❌ ไม่สามารถเชื่อมต่อได้'));
}

// ===== CREATE PO MODAL =====
function showCreatePOModal() {
  PO_ITEMS = [];
  document.getElementById('po-supplier').value = '';
  document.getElementById('po-notes').value = '';
  renderPOItemsForm();
  document.getElementById('modal-create-po').classList.remove('hidden');
}

function renderPOItemsForm() {
  const container = document.getElementById('po-items-container');
  if (!container) return;

  if (PO_ITEMS.length === 0) {
    container.innerHTML = `
      <div style="text-align:center;padding:16px;color:#9ca3af;font-size:13px;border:2px dashed #e5e7eb;border-radius:12px">
        <i class="bi bi-box-seam" style="font-size:24px;display:block;margin-bottom:6px"></i>
        ยังไม่มีรายการสินค้า<br>กดปุ่ม "เพิ่มรายการ" ด้านล่าง
      </div>`;
    updatePOTotal();
    return;
  }

  container.innerHTML = PO_ITEMS.map((item, idx) => `
    <div style="background:#f9fafb;border-radius:12px;padding:12px;margin-bottom:8px;position:relative">
      <button onclick="removePOItem(${idx})" style="position:absolute;top:8px;right:8px;background:none;border:none;color:#ef4444;font-size:16px;cursor:pointer;padding:2px 6px">
        <i class="bi bi-x-circle-fill"></i>
      </button>
      <div style="font-size:11px;color:#9ca3af;font-weight:600;margin-bottom:6px">รายการที่ ${idx + 1}</div>
      <div class="form-group-custom" style="margin-bottom:6px">
        <div class="input-wrap">
          <i class="bi bi-box-seam"></i>
          <input type="text" placeholder="ชื่อสินค้า *" value="${item.item_name || ''}"
            oninput="updatePOItem(${idx}, 'item_name', this.value)" style="font-size:13px">
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px">
        <div class="input-wrap">
          <i class="bi bi-upc"></i>
          <input type="text" placeholder="รหัสสินค้า" value="${item.item_code || ''}"
            oninput="updatePOItem(${idx}, 'item_code', this.value)" style="font-size:12px">
        </div>
        <div class="input-wrap">
          <i class="bi bi-123"></i>
          <input type="number" placeholder="จำนวน" value="${item.qty || 1}" min="1"
            oninput="updatePOItem(${idx}, 'qty', this.value)" style="font-size:12px">
        </div>
        <div class="input-wrap">
          <i class="bi bi-currency-exchange"></i>
          <input type="number" placeholder="ราคา/หน่วย" value="${item.unit_cost || ''}" min="0"
            oninput="updatePOItem(${idx}, 'unit_cost', this.value)" style="font-size:12px">
        </div>
      </div>
      ${item.qty && item.unit_cost ? `
      <div style="text-align:right;margin-top:6px;font-size:12px;color:#10b981;font-weight:700">
        รวม: ฿${(Number(item.qty) * Number(item.unit_cost)).toLocaleString()}
      </div>` : ''}
    </div>
  `).join('');

  updatePOTotal();
}

function addPOItem() {
  PO_ITEMS.push({ item_name: '', item_code: '', qty: 1, unit_cost: 0 });
  renderPOItemsForm();
  // Scroll to bottom of modal
  setTimeout(() => {
    const container = document.getElementById('po-items-container');
    if (container) container.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, 100);
}

function removePOItem(idx) {
  PO_ITEMS.splice(idx, 1);
  renderPOItemsForm();
}

function updatePOItem(idx, field, value) {
  if (PO_ITEMS[idx]) {
    PO_ITEMS[idx][field] = field === 'qty' || field === 'unit_cost' ? Number(value) : value;
    updatePOTotal();
  }
}

function updatePOTotal() {
  const total = PO_ITEMS.reduce((sum, item) => sum + (Number(item.qty || 0) * Number(item.unit_cost || 0)), 0);
  const el = document.getElementById('po-total-display');
  if (el) el.textContent = '฿' + total.toLocaleString();
}

function saveNewPO() {
  const supplier = document.getElementById('po-supplier').value.trim();
  const notes = document.getElementById('po-notes').value.trim();

  if (!supplier) { showToast('⚠️ กรุณาระบุชื่อผู้จำหน่าย'); return; }

  const validItems = PO_ITEMS.filter(i => i.item_name && i.item_name.trim());
  if (validItems.length === 0) { showToast('⚠️ กรุณาเพิ่มรายการสินค้าอย่างน้อย 1 รายการ'); return; }

  showToast('⏳ กำลังสร้างใบสั่งซื้อ...');

  callApi({
    action: 'createPurchaseOrder',
    supplier,
    notes,
    items: validItems.map(i => ({
      item_name: i.item_name.trim(),
      item_code: (i.item_code || '').trim(),
      qty: Math.max(1, Number(i.qty) || 1),
      unit_cost: Math.max(0, Number(i.unit_cost) || 0)
    }))
  }).then(res => {
    if (res && res.success) {
      showToast(`✅ สร้าง ${res.po_id} สำเร็จ! (${res.total_items} รายการ)`);
      closeModal('modal-create-po');
      ALL_PO = [];
      loadPurchaseOrderPage();
    } else {
      showToast('❌ ' + (res && res.error ? res.error : 'เกิดข้อผิดพลาด'));
    }
  }).catch(() => showToast('❌ ไม่สามารถเชื่อมต่อได้'));
}

// ===== BADGE =====
function updatePOBadge(orders) {
  const pending = (orders || []).filter(o => o.status === 'PENDING').length;
  const badge = document.getElementById('po-badge');
  if (badge) {
    badge.textContent = pending;
    badge.style.display = pending > 0 ? 'flex' : 'none';
  }
}

// ===== QUICK ACTION from Home =====
function openPurchaseOrders() {
  const navBtn = document.getElementById('nav-po');
  goPage('po', navBtn);
}

// ============================================================
// PURCHASE ORDER EXTENSIONS (Sprint 2)
// ============================================================

/**
 * openCreatePOModal — alias ของ showCreatePOModal
 * ใช้จาก inventory_ui.js และ quick_actions.js
 * @param {Object} prefill - { item_code, item_name, qty } (optional)
 */
function openCreatePOModal(prefill) {
  showCreatePOModal();
  if (prefill) {
    setTimeout(() => {
      // Pre-fill รายการแรก
      const firstCode = document.getElementById('po-item-code-0');
      const firstName = document.getElementById('po-item-name-0');
      const firstQty  = document.getElementById('po-item-qty-0');
      if (firstCode) firstCode.value = prefill.item_code || '';
      if (firstName) firstName.value = prefill.item_name || '';
      if (firstQty)  firstQty.value  = prefill.qty || 1;
      updatePOTotal();
    }, 200);
  }
}

/**
 * cancelPO — ยกเลิก PO
 * @param {string} poId
 */
async function cancelPO(poId) {
  if (!confirm(`ยืนยันยกเลิกใบสั่งซื้อ ${poId}?`)) return;

  const btn = document.querySelector(`[data-cancel-po="${poId}"]`);
  if (btn) { btn.disabled = true; btn.textContent = 'กำลังยกเลิก...'; }

  try {
    const result = await callAPI('cancelPurchaseOrder', { po_id: poId });
    if (!result || !result.success) {
      throw new Error(result?.error || 'ยกเลิกไม่สำเร็จ');
    }
    showToast(`✅ ยกเลิก ${poId} สำเร็จ`);
    closeModal('modal-po');
    ALL_PO = [];
    loadPurchaseOrderPage();
  } catch (err) {
    showToast(`❌ ${err.message}`);
    if (btn) { btn.disabled = false; btn.textContent = 'ยกเลิก PO'; }
  }
}

/**
 * printPO — พิมพ์ใบสั่งซื้อ (เปิด print dialog)
 * @param {string} poId
 */
function printPO(poId) {
  const po = ALL_PO.find(o => o.po_id === poId);
  if (!po) { showToast('ไม่พบข้อมูล PO'); return; }

  const dateStr = po.created_at ? new Date(po.created_at).toLocaleDateString('th-TH') : '-';
  const itemRows = (po.items || []).map(item => `
    <tr>
      <td style="padding:6px 8px;border:1px solid #e5e7eb">${item.item_code || '-'}</td>
      <td style="padding:6px 8px;border:1px solid #e5e7eb">${item.item_name || '-'}</td>
      <td style="padding:6px 8px;border:1px solid #e5e7eb;text-align:center">${item.qty || 0}</td>
      <td style="padding:6px 8px;border:1px solid #e5e7eb;text-align:right">฿${Number(item.unit_cost || 0).toLocaleString()}</td>
      <td style="padding:6px 8px;border:1px solid #e5e7eb;text-align:right">฿${Number(item.total_cost || 0).toLocaleString()}</td>
    </tr>`).join('');

  const html = `<!DOCTYPE html>
<html lang="th"><head>
<meta charset="UTF-8">
<title>ใบสั่งซื้อ ${po.po_id}</title>
<style>
  body { font-family: 'Sarabun', sans-serif; padding: 20mm; font-size: 12pt; }
  h2 { text-align: center; color: #1d4ed8; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; }
  th { background: #f3f4f6; padding: 8px; border: 1px solid #e5e7eb; text-align: left; }
  .total { font-weight: bold; font-size: 14pt; text-align: right; margin-top: 12px; }
  @media print { .no-print { display: none; } }
</style>
</head><body>
<h2>ใบสั่งซื้อ (Purchase Order)</h2>
<p><strong>เลขที่:</strong> ${po.po_id} &nbsp;&nbsp; <strong>วันที่:</strong> ${dateStr}</p>
<p><strong>ผู้จำหน่าย:</strong> ${po.supplier || '-'}</p>
<table>
  <thead>
    <tr>
      <th>รหัส</th><th>ชื่อสินค้า</th><th style="text-align:center">จำนวน</th>
      <th style="text-align:right">ราคา/หน่วย</th><th style="text-align:right">รวม</th>
    </tr>
  </thead>
  <tbody>${itemRows}</tbody>
</table>
<div class="total">ยอดรวมทั้งหมด: ฿${Number(po.total_cost || 0).toLocaleString()}</div>
<br><p style="font-size:10pt;color:#6b7280">พิมพ์โดย: ${(APP && APP.user && APP.user.name) || 'SYSTEM'} | COMPHONE Super App</p>
<script>window.onload = function() { window.print(); }<\/script>
</body></html>`;

  const win = window.open('', '_blank', 'width=800,height=600');
  if (win) {
    win.document.write(html);
    win.document.close();
  } else {
    showToast('ไม่สามารถเปิดหน้าต่างพิมพ์ได้ กรุณาอนุญาต popup');
  }
}

/**
 * exportPOToCSV — export รายการ PO เป็น CSV
 */
function exportPOToCSV() {
  const orders = ALL_PO.filter(o => PO_FILTER === 'all' || o.status === PO_FILTER.toUpperCase());
  if (orders.length === 0) { showToast('ไม่มีข้อมูลที่จะ export'); return; }

  const rows = [['PO ID', 'ผู้จำหน่าย', 'สถานะ', 'จำนวนรายการ', 'ยอดรวม', 'วันที่สั่ง']];
  orders.forEach(po => {
    rows.push([
      po.po_id || '',
      po.supplier || '',
      po.status || '',
      (po.items || []).length,
      po.total_cost || 0,
      po.created_at ? new Date(po.created_at).toLocaleDateString('th-TH') : '',
    ]);
  });

  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `PO_Export_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('✅ Export CSV สำเร็จ');
}

// ============================================================
// EXPOSE ADDITIONAL GLOBALS
// ============================================================
window.openCreatePOModal  = openCreatePOModal;
window.cancelPO           = cancelPO;
window.printPO            = printPO;
window.exportPOToCSV      = exportPOToCSV;
