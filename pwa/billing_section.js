/* ============================================================
   COMPHONE SUPER APP — Billing Section UI
   File: pwa/billing_section.js
   ============================================================ */

// ---------- global state ----------
let _billingData = [];
let _billingSearchText = '';
let _billingStatusFilter = 'ALL';

// ===========================================================
// 1. renderBillingSection(data) — main entry
// ===========================================================
function renderBillingSection(data) {
  setActiveNav('billing');
  document.getElementById('topbar-title').innerHTML = '💰 ใบแจ้งหนี้ / Billing';

  document.getElementById('main-content').innerHTML = `
    <!-- KPI Row -->
    <div id="billing-kpi" style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:20px;">
      <div style="background:#f0f9ff;border-radius:12px;padding:16px;text-align:center">
        <div style="font-size:13px;color:#6b7280;">บิลทั้งหมด</div>
        <div id="kpi-total" style="font-size:28px;font-weight:700;color:#3b82f6;">—</div>
      </div>
      <div style="background:#f0f9ff;border-radius:12px;padding:16px;text-align:center">
        <div style="font-size:13px;color:#6b7280;">รอชำระ</div>
        <div id="kpi-unpaid" style="font-size:28px;font-weight:700;color:#ef4444;">—</div>
      </div>
      <div style="background:#f0f9ff;border-radius:12px;padding:16px;text-align:center">
        <div style="font-size:13px;color:#6b7280;">ชำระแล้ว</div>
        <div id="kpi-paid" style="font-size:28px;font-weight:700;color:#059669;">—</div>
      </div>
      <div style="background:#f0f9ff;border-radius:12px;padding:16px;text-align:center">
        <div style="font-size:13px;color:#6b7280;">ยอดค้าง</div>
        <div id="kpi-balance" style="font-size:28px;font-weight:700;color:#d97706;">—</div>
      </div>
    </div>

    <!-- Toolbar -->
    <div class="card-box" style="margin-bottom:20px;">
      <div style="display:flex;flex-wrap:wrap;gap:12px;align-items:center;">
        <input id="billing-search" type="text" placeholder="🔍 ค้นหา Job ID / ชื่อลูกค้า..."
          style="flex:1;min-width:200px;padding:8px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:13px;"
          oninput="_billingSearchText=this.value;_filterBillingTable();" />
        <select id="billing-status-filter"
          style="padding:8px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:13px;"
          onchange="_billingStatusFilter=this.value;_filterBillingTable();">
          <option value="ALL">ทุกสถานะ</option>
          <option value="UNPAID">UNPAID</option>
          <option value="PARTIAL">PARTIAL</option>
          <option value="PAID">PAID</option>
        </select>
        <button onclick="_showCreateBilling()"
          style="background:#3b82f6;color:#fff;border:none;padding:8px 16px;border-radius:8px;font-size:13px;cursor:pointer;">
          ➕ สร้างบิลใหม่
        </button>
        <button onclick="_exportBillingCSV()"
          style="background:#6b7280;color:#fff;border:none;padding:8px 16px;border-radius:8px;font-size:13px;cursor:pointer;">
          📥 Export CSV
        </button>
      </div>
    </div>

    <!-- Table -->
    <div class="card-box">
      <div class="card-title">📋 รายการ Billing</div>
      <div style="overflow-x:auto;">
        <table class="job-table" id="billing-table">
          <thead>
            <tr>
              <th>Billing ID</th>
              <th>Job ID</th>
              <th>ลูกค้า</th>
              <th>เบอร์โทร</th>
              <th>อะไหล่</th>
              <th>ค่าอะไหล่</th>
              <th>ค่าแรง</th>
              <th>ส่วนลด</th>
              <th>ยอดรวม</th>
              <th>ชำระแล้ว</th>
              <th>ค้างชำระ</th>
              <th>สถานะ</th>
              <th>วันที่</th>
              <th>จัดการ</th>
            </tr>
          </thead>
          <tbody id="billing-tbody">
            <tr><td colspan="14" style="text-align:center;padding:24px;color:#6b7280;">กำลังโหลด...</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal Container -->
    <div id="billing-modal"></div>
  `;

  _listBillings();
}

// ===========================================================
// 2. _listBillings() — fetch & display
// ===========================================================
async function _listBillings() {
  try {
    const res = await callGas('listBillings', {});
    if (!res || !res.success) {
      document.getElementById('billing-tbody').innerHTML =
        '<tr><td colspan="14" style="text-align:center;padding:24px;color:#ef4444;">ไม่สามารถโหลดข้อมูลได้</td></tr>';
      return;
    }
    _billingData = res.billings || [];
    _updateBillingKPI();
    _renderBillingRows(_billingData);
  } catch (e) {
    console.error('listBillings error', e);
    document.getElementById('billing-tbody').innerHTML =
      '<tr><td colspan="14" style="text-align:center;padding:24px;color:#ef4444;">เกิดข้อผิดพลาด</td></tr>';
  }
}

// ===========================================================
// 3. _showBillingDetail(jobId) — detail modal
// ===========================================================
async function _showBillingDetail(jobId) {
  const modal = document.getElementById('billing-modal');
  modal.innerHTML = '<div style="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;"><div style="background:#fff;border-radius:16px;padding:32px;max-width:600px;width:90%;max-height:85vh;overflow-y:auto;"><p style="text-align:center;color:#6b7280;">กำลังโหลด...</p></div></div>';

  try {
    const res = await callGas('getBilling', { job_id: jobId });
    if (!res || !res.success) {
      modal.innerHTML = '';
      alert('ไม่พบข้อมูลบิล');
      return;
    }
    const b = res.billing;
    const statusColor = b.Payment_Status === 'PAID' ? '#059669' : b.Payment_Status === 'PARTIAL' ? '#d97706' : '#ef4444';
    const statusBg = b.Payment_Status === 'PAID' ? '#d1fae5' : b.Payment_Status === 'PARTIAL' ? '#fef3c7' : '#fee2e2';

    modal.innerHTML = `
      <div style="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;" onclick="if(event.target===this)document.getElementById('billing-modal').innerHTML='';">
        <div style="background:#fff;border-radius:16px;padding:32px;max-width:640px;width:92%;max-height:85vh;overflow-y:auto;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
            <h2 style="margin:0;font-size:18px;">📄 รายละเอียดบิล #${b.Billing_ID || ''}</h2>
            <button onclick="document.getElementById('billing-modal').innerHTML=''"
              style="background:none;border:none;font-size:22px;cursor:pointer;color:#6b7280;">✕</button>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">
            <div><strong>Job ID:</strong> ${b.Job_ID || '—'}</div>
            <div><strong>ลูกค้า:</strong> ${b.Customer_Name || '—'}</div>
            <div><strong>เบอร์โทร:</strong> ${b.Phone || '—'}</div>
            <div><strong>วันที่:</strong> ${b.Invoice_Date || '—'}</div>
            <div><strong>ใบเสร็จ:</strong> ${b.Receipt_No || '—'}</div>
            <div>
              <strong>สถานะ:</strong>
              <span style="display:inline-block;padding:2px 10px;border-radius:12px;font-size:12px;font-weight:600;color:${statusColor};background:${statusBg};">${b.Payment_Status || '—'}</span>
            </div>
          </div>

          <div style="background:#f9fafb;border-radius:12px;padding:16px;margin-bottom:16px;">
            <div style="margin-bottom:8px;"><strong>อะไหล่:</strong> ${b.Parts_Description || '—'}</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
              <div>ค่าอะไหล่: <strong>฿${Number(b.Parts_Cost || 0).toLocaleString()}</strong></div>
              <div>ค่าแรง: <strong>฿${Number(b.Labor_Cost || 0).toLocaleString()}</strong></div>
              <div>Subtotal: <strong>฿${Number(b.Subtotal || 0).toLocaleString()}</strong></div>
              <div>ส่วนลด: <strong>฿${Number(b.Discount || 0).toLocaleString()}</strong></div>
            </div>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:16px;text-align:center;">
            <div style="background:#f0f9ff;border-radius:12px;padding:12px;">
              <div style="font-size:12px;color:#6b7280;">ยอดรวม</div>
              <div style="font-size:20px;font-weight:700;color:#3b82f6;">฿${Number(b.Total_Amount || 0).toLocaleString()}</div>
            </div>
            <div style="background:#d1fae5;border-radius:12px;padding:12px;">
              <div style="font-size:12px;color:#6b7280;">ชำระแล้ว</div>
              <div style="font-size:20px;font-weight:700;color:#059669;">฿${Number(b.Amount_Paid || 0).toLocaleString()}</div>
            </div>
            <div style="background:#fee2e2;border-radius:12px;padding:12px;">
              <div style="font-size:12px;color:#6b7280;">ค้างชำระ</div>
              <div style="font-size:20px;font-weight:700;color:#ef4444;">฿${Number(b.Balance_Due || 0).toLocaleString()}</div>
            </div>
          </div>

          ${b.Notes ? '<div style="margin-bottom:16px;"><strong>หมายเหตุ:</strong> ' + b.Notes + '</div>' : ''}
          ${b.Paid_At ? '<div style="margin-bottom:16px;color:#059669;"><strong>ชำระเมื่อ:</strong> ' + b.Paid_At + '</div>' : ''}

          <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;">
            ${b.Payment_Status !== 'PAID' ? `
              <button onclick="_doMarkPaid('${b.Job_ID}')"
                style="background:#059669;color:#fff;border:none;padding:8px 16px;border-radius:8px;font-size:13px;cursor:pointer;">✅ ชำระเงิน</button>
              <button onclick="_showPromptPayQR('${b.Job_ID}')"
                style="background:#3b82f6;color:#fff;border:none;padding:8px 16px;border-radius:8px;font-size:13px;cursor:pointer;">📱 PromptPay QR</button>
            ` : ''}
            <button onclick="document.getElementById('billing-modal').innerHTML=''"
              style="background:#6b7280;color:#fff;border:none;padding:8px 16px;border-radius:8px;font-size:13px;cursor:pointer;">ปิด</button>
          </div>
        </div>
      </div>
    `;
  } catch (e) {
    console.error('getBilling error', e);
    modal.innerHTML = '';
    alert('เกิดข้อผิดพลาดในการโหลดข้อมูล');
  }
}

// ===========================================================
// 4. _showCreateBilling() — create form modal
// ===========================================================
function _showCreateBilling() {
  const modal = document.getElementById('billing-modal');
  modal.innerHTML = `
    <div style="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;" onclick="if(event.target===this)document.getElementById('billing-modal').innerHTML='';">
      <div style="background:#fff;border-radius:16px;padding:32px;max-width:560px;width:92%;max-height:85vh;overflow-y:auto;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
          <h2 style="margin:0;font-size:18px;">➕ สร้างบิลใหม่</h2>
          <button onclick="document.getElementById('billing-modal').innerHTML=''"
            style="background:none;border:none;font-size:22px;cursor:pointer;color:#6b7280;">✕</button>
        </div>

        <div style="display:flex;flex-direction:column;gap:14px;">
          <div>
            <label style="font-size:13px;font-weight:600;color:#374151;">Job ID *</label>
            <input id="cb-job-id" type="text" placeholder="เช่น JOB-001"
              style="width:100%;padding:8px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:13px;margin-top:4px;" />
          </div>
          <div>
            <label style="font-size:13px;font-weight:600;color:#374151;">รายละเอียดอะไหล่</label>
            <textarea id="cb-parts-desc" rows="2" placeholder="เช่น หน้าจอ iPhone 14 x1, แบตเตอรี่ x1"
              style="width:100%;padding:8px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:13px;margin-top:4px;resize:vertical;"></textarea>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div>
              <label style="font-size:13px;font-weight:600;color:#374151;">ค่าอะไหล่ (฿)</label>
              <input id="cb-parts-cost" type="number" min="0" value="0"
                style="width:100%;padding:8px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:13px;margin-top:4px;" />
            </div>
            <div>
              <label style="font-size:13px;font-weight:600;color:#374151;">ค่าแรง (฿)</label>
              <input id="cb-labor-cost" type="number" min="0" value="0"
                style="width:100%;padding:8px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:13px;margin-top:4px;" />
            </div>
          </div>
          <div>
            <label style="font-size:13px;font-weight:600;color:#374151;">ส่วนลด (฿)</label>
            <input id="cb-discount" type="number" min="0" value="0"
              style="width:100%;padding:8px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:13px;margin-top:4px;" />
          </div>
          <div>
            <label style="font-size:13px;font-weight:600;color:#374151;">หมายเหตุ</label>
            <input id="cb-notes" type="text" placeholder="หมายเหตุเพิ่มเติม"
              style="width:100%;padding:8px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:13px;margin-top:4px;" />
          </div>

          <div id="cb-preview" style="background:#f0f9ff;border-radius:12px;padding:16px;text-align:center;">
            <div style="font-size:12px;color:#6b7280;">ยอดรวม</div>
            <div style="font-size:24px;font-weight:700;color:#3b82f6;">฿0</div>
          </div>

          <button id="cb-submit-btn" onclick="_doCreateBilling()"
            style="background:#3b82f6;color:#fff;border:none;padding:10px 16px;border-radius:8px;font-size:14px;cursor:pointer;font-weight:600;">
            💾 สร้างบิล
          </button>
        </div>
      </div>
    </div>
  `;

  // live preview
  const updatePreview = () => {
    const parts = parseFloat(document.getElementById('cb-parts-cost').value) || 0;
    const labor = parseFloat(document.getElementById('cb-labor-cost').value) || 0;
    const disc = parseFloat(document.getElementById('cb-discount').value) || 0;
    const total = Math.max(0, parts + labor - disc);
    document.getElementById('cb-preview').innerHTML =
      '<div style="font-size:12px;color:#6b7280;">ยอดรวม</div><div style="font-size:24px;font-weight:700;color:#3b82f6;">฿' + total.toLocaleString() + '</div>';
  };
  ['cb-parts-cost', 'cb-labor-cost', 'cb-discount'].forEach(id => {
    document.getElementById(id).addEventListener('input', updatePreview);
  });
}

async function _doCreateBilling() {
  const jobId = document.getElementById('cb-job-id').value.trim();
  if (!jobId) { alert('กรุณากรอก Job ID'); return; }

  const partsDesc = document.getElementById('cb-parts-desc').value.trim();
  const partsCost = parseFloat(document.getElementById('cb-parts-cost').value) || 0;
  const laborCost = parseFloat(document.getElementById('cb-labor-cost').value) || 0;
  const discount = parseFloat(document.getElementById('cb-discount').value) || 0;
  const notes = document.getElementById('cb-notes').value.trim();

  const btn = document.getElementById('cb-submit-btn');
  btn.disabled = true;
  btn.textContent = '⏳ กำลังสร้าง...';

  try {
    const res = await callGas('createBilling', {
      job_id: jobId,
      parts: { description: partsDesc, cost: partsCost },
      labor: { cost: laborCost, discount: discount, notes: notes }
    });
    if (res && res.success) {
      document.getElementById('billing-modal').innerHTML = '';
      _listBillings();
    } else {
      alert('สร้างบิลไม่สำเร็จ: ' + (res && res.message ? res.message : 'Unknown error'));
      btn.disabled = false;
      btn.textContent = '💾 สร้างบิล';
    }
  } catch (e) {
    console.error('createBilling error', e);
    alert('เกิดข้อผิดพลาด');
    btn.disabled = false;
    btn.textContent = '💾 สร้างบิล';
  }
}

// ===========================================================
// 5. _doMarkPaid(billingId)
// ===========================================================
async function _doMarkPaid(jobId) {
  if (!confirm('ยืนยันการชำระเงินสำหรับ Job ' + jobId + '?')) return;

  // find billing to get amount
  const b = _billingData.find(x => String(x.Job_ID) === String(jobId));
  const balanceDue = b ? Number(b.Balance_Due || 0) : 0;

  try {
    const res = await callGas('markBillingPaid', {
      job_id: jobId,
      amount_paid: balanceDue,
      payment_method: 'cash'
    });
    if (res && res.success) {
      document.getElementById('billing-modal').innerHTML = '';
      _listBillings();
    } else {
      alert('ชำระเงินไม่สำเร็จ');
    }
  } catch (e) {
    console.error('markBillingPaid error', e);
    alert('เกิดข้อผิดพลาด');
  }
}

// ===========================================================
// 6. _showPromptPayQR(jobId)
// ===========================================================
async function _showPromptPayQR(jobId) {
  const modal = document.getElementById('billing-modal');

  try {
    const res = await callGas('generatePromptPayQR', { job_id: jobId });
    if (!res || !res.success) {
      alert('ไม่สามารถสร้าง QR ได้');
      return;
    }

    const qrUrl = res.qr_url || '';
    const amount = res.amount || 0;

    // close current modal content and show QR
    modal.innerHTML = `
      <div style="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;" onclick="if(event.target===this)document.getElementById('billing-modal').innerHTML='';">
        <div style="background:#fff;border-radius:16px;padding:32px;max-width:400px;width:92%;text-align:center;">
          <h2 style="margin:0 0 8px;font-size:18px;">📱 PromptPay QR</h2>
          <p style="color:#6b7280;margin:0 0 16px;font-size:13px;">Job: ${jobId} | ยอด: ฿${Number(amount).toLocaleString()}</p>
          <div style="margin-bottom:20px;">
            ${qrUrl ? '<img src="' + qrUrl + '" alt="PromptPay QR" style="max-width:260px;width:100%;border-radius:12px;border:1px solid #e5e7eb;" />' :
              '<div style="padding:40px;background:#f3f4f6;border-radius:12px;color:#6b7280;">QR Code ไม่พร้อมใช้งาน</div>'}
          </div>
          <p style="font-size:12px;color:#6b7280;margin-bottom:16px;">สแกน QR เพื่อชำระเงินผ่าน Mobile Banking</p>
          <button onclick="document.getElementById('billing-modal').innerHTML=''"
            style="background:#6b7280;color:#fff;border:none;padding:8px 16px;border-radius:8px;font-size:13px;cursor:pointer;">ปิด</button>
        </div>
      </div>
    `;
  } catch (e) {
    console.error('generatePromptPayQR error', e);
    alert('เกิดข้อผิดพลาดในการสร้าง QR');
  }
}

// ===========================================================
// Helper: update KPI cards
// ===========================================================
function _updateBillingKPI() {
  const total = _billingData.length;
  const unpaid = _billingData.filter(b => b.Payment_Status === 'UNPAID').length;
  const paid = _billingData.filter(b => b.Payment_Status === 'PAID').length;
  const balance = _billingData.reduce((sum, b) => sum + (Number(b.Balance_Due) || 0), 0);

  document.getElementById('kpi-total').textContent = total;
  document.getElementById('kpi-unpaid').textContent = unpaid;
  document.getElementById('kpi-paid').textContent = paid;
  document.getElementById('kpi-balance').textContent = '฿' + balance.toLocaleString();
}

// ===========================================================
// Helper: render table rows
// ===========================================================
function _renderBillingRows(list) {
  const tbody = document.getElementById('billing-tbody');
  if (!list || list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="14" style="text-align:center;padding:24px;color:#6b7280;">ไม่พบรายการ</td></tr>';
    return;
  }

  tbody.innerHTML = list.map(b => {
    const status = b.Payment_Status || 'UNPAID';
    const statusColor = status === 'PAID' ? '#059669' : status === 'PARTIAL' ? '#d97706' : '#ef4444';
    const statusBg = status === 'PAID' ? '#d1fae5' : status === 'PARTIAL' ? '#fef3c7' : '#fee2e2';

    return `<tr>
      <td>${b.Billing_ID || '—'}</td>
      <td>${b.Job_ID || '—'}</td>
      <td>${b.Customer_Name || '—'}</td>
      <td>${b.Phone || '—'}</td>
      <td style="max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${b.Parts_Description || ''}">${b.Parts_Description || '—'}</td>
      <td style="text-align:right;">${Number(b.Parts_Cost || 0).toLocaleString()}</td>
      <td style="text-align:right;">${Number(b.Labor_Cost || 0).toLocaleString()}</td>
      <td style="text-align:right;">${Number(b.Discount || 0).toLocaleString()}</td>
      <td style="text-align:right;font-weight:600;">${Number(b.Total_Amount || 0).toLocaleString()}</td>
      <td style="text-align:right;color:#059669;">${Number(b.Amount_Paid || 0).toLocaleString()}</td>
      <td style="text-align:right;color:${Number(b.Balance_Due) > 0 ? '#ef4444' : '#6b7280'};">${Number(b.Balance_Due || 0).toLocaleString()}</td>
      <td><span style="display:inline-block;padding:2px 10px;border-radius:12px;font-size:11px;font-weight:600;color:${statusColor};background:${statusBg};">${status}</span></td>
      <td style="font-size:12px;">${b.Invoice_Date || '—'}</td>
      <td>
        <div style="display:flex;gap:4px;">
          <button onclick="_showBillingDetail('${b.Job_ID}')"
            style="background:#3b82f6;color:#fff;border:none;padding:4px 8px;border-radius:6px;font-size:11px;cursor:pointer;" title="ดูรายละเอียด">👁</button>
          ${status !== 'PAID' ? `
            <button onclick="_showPromptPayQR('${b.Job_ID}')"
              style="background:#3b82f6;color:#fff;border:none;padding:4px 8px;border-radius:6px;font-size:11px;cursor:pointer;" title="PromptPay QR">📱</button>
          ` : ''}
        </div>
      </td>
    </tr>`;
  }).join('');
}

// ===========================================================
// Helper: filter table
// ===========================================================
function _filterBillingTable() {
  let filtered = _billingData;

  // status filter
  if (_billingStatusFilter !== 'ALL') {
    filtered = filtered.filter(b => b.Payment_Status === _billingStatusFilter);
  }

  // search filter
  if (_billingSearchText.trim()) {
    const q = _billingSearchText.trim().toLowerCase();
    filtered = filtered.filter(b =>
      String(b.Job_ID || '').toLowerCase().includes(q) ||
      String(b.Customer_Name || '').toLowerCase().includes(q) ||
      String(b.Billing_ID || '').toLowerCase().includes(q) ||
      String(b.Phone || '').toLowerCase().includes(q)
    );
  }

  _renderBillingRows(filtered);
}

// ===========================================================
// Export CSV
// ===========================================================
function _exportBillingCSV() {
  if (!_billingData || _billingData.length === 0) {
    alert('ไม่มีข้อมูลสำหรับ Export');
    return;
  }

  const headers = [
    'Billing_ID', 'Job_ID', 'Customer_Name', 'Phone', 'Parts_Description',
    'Parts_Cost', 'Labor_Cost', 'Subtotal', 'Discount', 'Total_Amount',
    'Amount_Paid', 'Balance_Due', 'Payment_Status', 'Receipt_No',
    'Invoice_Date', 'Paid_At', 'Notes'
  ];

  const escape = v => {
    const s = String(v == null ? '' : v);
    return '"' + s.replace(/"/g, '""') + '"';
  };

  let csv = '\uFEFF' + headers.join(',') + '\n';
  _billingData.forEach(b => {
    csv += headers.map(h => escape(b[h])).join(',') + '\n';
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'billing_export_' + new Date().toISOString().slice(0, 10) + '.csv';
  a.click();
  URL.revokeObjectURL(url);
}
