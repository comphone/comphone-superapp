async function renderPOSection(data) {
  // Show loading first, then fetch real PO data
  document.getElementById('main-content').innerHTML = `
    <div class="loading-state">
      <div class="spinner-pc"></div>
      <p>กำลังโหลดใบสั่งซื้อ...</p>
    </div>`;

  try {
    const poData = await callGas('listPurchaseOrders', {limit: 50});
    const poItems = poData.items || [];
    const pending = poItems.filter(p => p.status === 'PENDING');
    const received = poItems.filter(p => p.status === 'RECEIVED');
    const cancelled = poItems.filter(p => p.status === 'CANCELLED');

    let html = `
      <div class="kpi-row" style="margin-bottom:16px">
        ${kpiBox('bi-cart-fill', '#dbeafe', '#1e40af', poItems.length, 'PO ทั้งหมด', '')}
        ${kpiBox('bi-hourglass-split', '#fef3c7', '#d97706', pending.length, 'รออนุมัติ', '')}
        ${kpiBox('bi-check-circle-fill', '#d1fae5', '#059669', received.length, 'รับแล้ว', '')}
        ${kpiBox('bi-x-circle', '#f1f5f9', '#6b7280', cancelled.length, 'ยกเลิก', '')}
      </div>

      <div class="card-box" style="margin-bottom:16px">
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
          <div style="flex:1;min-width:180px">
            <input type="text" id="po-search" placeholder="🔍 ค้นหา PO (PO ID/ผู้จำหน่าย)..."
              style="width:100%;padding:8px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px"
              oninput="_filterPO()">
          </div>
          <button class="btn-refresh" onclick="loadSection('po')" style="background:#f1f5f9"><i class="bi bi-arrow-clockwise"></i></button>
        </div>
      </div>

      ${pending.length > 0 ? `
      <div class="card-box" style="margin-bottom:16px;border-left:4px solid #d97706">
        <div class="card-title"><i class="bi bi-hourglass-split" style="color:#d97706"></i> รออนุมัติ/รับของ (${pending.length})</div>
        <div style="overflow-x:auto">
          <table class="job-table" style="width:100%">
            <thead><tr><th>PO ID</th><th>ผู้จำหน่าย</th><th>วันที่</th><th>รายการ</th><th>รวม</th><th style="text-align:center">จัดการ</th></tr></thead>
            <tbody>${pending.map(po => `<tr>
              <td style="font-weight:600;font-size:13px;white-space:nowrap">${po.po_id}</td>
              <td style="font-size:13px">${po.supplier || '-'}</td>
              <td style="font-size:12px;color:#6b7280;white-space:nowrap">${(po.created_at||'').substring(0,16)}</td>
              <td style="font-size:12px">${(po.items||[]).map(i => `${i.item_name} ×${i.qty}`).join(', ')}</td>
              <td style="font-weight:600;font-size:13px">฿${Number(po.total_cost||0).toLocaleString()}</td>
              <td style="text-align:center">
                <div style="display:flex;gap:4px;justify-content:center">
                  <button onclick="_receivePO('${po.po_id}')" style="background:#d1fae5;color:#059669;border:none;padding:3px 10px;border-radius:6px;font-size:11px;cursor:pointer;font-weight:600" title="รับของ">
                    <i class="bi bi-check-lg"></i> รับ
                  </button>
                  <button onclick="_cancelPO('${po.po_id}')" style="background:#fee2e2;color:#ef4444;border:none;padding:3px 10px;border-radius:6px;font-size:11px;cursor:pointer" title="ยกเลิก">
                    <i class="bi bi-x-lg"></i>
                  </button>
                </div>
              </td>
            </tr>`).join('')}</tbody>
          </table>
        </div>
      </div>` : ''}

      <div class="card-box">
        <div class="card-title">
          <i class="bi bi-cart-fill" style="color:#1e40af"></i> ประวัติใบสั่งซื้อทั้งหมด
          <span class="badge-count" id="po-count">${poItems.length} รายการ</span>
        </div>
        <div id="po-table-wrap">${_buildPOTable(poItems)}</div>
      </div>`;

    document.getElementById('main-content').innerHTML = html;
  } catch(e) {
    // Fallback to dashboard data
    const jobs = data.jobs || [];
    const pendingPO = jobs.filter(j => j.status === 'รอดำเนินการ' || j.status === 'PENDING');
    document.getElementById('main-content').innerHTML = `
      <div class="card-box">
        <div class="card-title"><i class="bi bi-cart-fill" style="color:#1e40af"></i> ใบสั่งซื้อ
          <span class="badge-count">${pendingPO.length}</span>
        </div>
        <p style="color:#ef4444;font-size:13px;text-align:center;padding:12px">⚠️ ${e.message}</p>
        ${pendingPO.length === 0 ? '<p style="color:#9ca3af;font-size:13px;text-align:center;padding:20px">ไม่มีรายการรออนุมัติ</p>' :
          _buildJobsTableEnhanced(pendingPO)}
      </div>`;
  }
}

function _buildPOTable(poItems) {
  if (!poItems.length) return '<p style="color:#9ca3af;font-size:13px;text-align:center;padding:20px">ยังไม่มีใบสั่งซื้อ</p>';
  return `<div style="overflow-x:auto;max-height:400px;overflow-y:auto">
    <table class="job-table" style="width:100%">
      <thead><tr><th>PO ID</th><th>สถานะ</th><th>ผู้จำหน่าย</th><th>วันที่</th><th>รวม</th></tr></thead>
      <tbody id="po-tbody">${poItems.map(po => {
        const statusColor = po.status === 'RECEIVED' ? '#059669' : po.status === 'CANCELLED' ? '#9ca3af' : '#d97706';
        return `<tr data-po="${(po.po_id||'').toLowerCase()}" data-supplier="${(po.supplier||'').toLowerCase()}">
          <td style="font-weight:600;font-size:13px;white-space:nowrap">${po.po_id}</td>
          <td><span style="background:${statusColor};padding:2px 8px;border-radius:10px;font-size:11px;color:#fff">${po.status}</span></td>
          <td style="font-size:13px">${po.supplier || '-'}</td>
          <td style="font-size:12px;color:#6b7280;white-space:nowrap">${(po.created_at||'').substring(0,16)}</td>
          <td style="font-weight:600;font-size:13px">฿${Number(po.total_cost||0).toLocaleString()}</td>
        </tr>`;
      }).join('')}</tbody>
    </table>
  </div>`;
}

function _filterPO() {
  const search = (document.getElementById('po-search')||{}).value||'';
  const rows = document.querySelectorAll('#po-tbody tr');
  let visible = 0;
  rows.forEach(r => {
    const po = r.dataset.po||'';
    const sup = r.dataset.supplier||'';
    const match = !search || po.includes(search.toLowerCase()) || sup.includes(search.toLowerCase());
    r.style.display = match ? '' : 'none';
    if(match) visible++;
  });
  const cnt = document.getElementById('po-count');
  if(cnt) cnt.textContent = visible + ' รายการ';
}

async function _receivePO(poId) {
  if(!confirm(`รับของ PO ${poId}? สินค้าจะถูกเพิ่มเข้าสต็อกอัตโนมัติ`)) return;
  try {
    const r = await callGas('receivePurchaseOrder', {po_id: poId, received_by: 'PC Dashboard'});
    if(r && r.success) {
      alert(`✅ รับของสำเร็จ: ${r.received_items} รายการ`);
      DASHBOARD_DATA = null;
      loadSection('po');
    } else { alert('❌ ' + (r?.error || 'รับของไม่สำเร็จ')); }
  } catch(e) { alert('Error: ' + e.message); }
}

async function _cancelPO(poId) {
  if(!confirm(`ยกเลิก PO ${poId}?`)) return;
  try {
    const r = await callGas('cancelPurchaseOrder', {po_id: poId});
    if(r && r.success) {
      alert('✅ ยกเลิกสำเร็จ');
      DASHBOARD_DATA = null;
      loadSection('po');
    } else { alert('❌ ' + (r?.error || 'ยกเลิกไม่สำเร็จ')); }
  } catch(e) { alert('Error: ' + e.message); }
}
