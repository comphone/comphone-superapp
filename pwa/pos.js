// ============================================================
// POS (Point of Sale) — Retail Sale Interface
// COMPHONE SUPER APP v5.9.0-phase2d
// ============================================================

const POS_STATE = {
  items: [],
  paymentMethod: 'cash',
  customerName: '',
  note: ''
};

// ===== 4.1 เปิด POS Modal =====
function openPOS() {
  document.getElementById('modal-pos-content').innerHTML = `
    <div style="padding:0 16px 16px">
      <h6 style="margin:0 0 12px;font-size:14px;color:#374151">🛒 รายการสินค้า</h6>
      <!-- เพิ่มสินค้า -->
      <div class="form-group-custom">
        <label>ชื่อสินค้า / รหัส</label>
        <div class="input-wrap">
          <i class="bi bi-box-seam"></i>
          <input type="text" id="pos-item-name" placeholder="เช่น iPhone 14 Pro Case" onkeydown="if(event.key==='Enter') addPOSItem()">
        </div>
      </div>
      <div style="display:flex;gap:8px;margin-bottom:12px">
        <div class="form-group-custom" style="flex:1">
          <label>ราคา (บาท)</label>
          <div class="input-wrap">
            <i class="bi bi-currency-dollar"></i>
            <input type="number" id="pos-item-price" placeholder="0" min="0" step="1" onkeydown="if(event.key==='Enter') addPOSItem()">
          </div>
        </div>
        <div class="form-group-custom" style="flex:1">
          <label>จำนวน</label>
          <div class="input-wrap">
            <i class="bi bi-123"></i>
            <input type="number" id="pos-item-qty" placeholder="1" min="1" value="1" onkeydown="if(event.key==='Enter') addPOSItem()">
          </div>
        </div>
      </div>
      <button class="btn-setup" onclick="addPOSItem()" style="width:100%;margin-bottom:16px">
        <i class="bi bi-plus-circle"></i> เพิ่มสินค้า
      </button>

      <!-- ตารางสินค้า -->
      <div id="pos-items-table" style="margin-bottom:16px;max-height:200px;overflow-y:auto">
        <p style="color:#9ca3af;text-align:center;padding:16px">ยังไม่มีสินค้า</p>
      </div>

      <!-- สรุปยอด -->
      <div style="background:#f9fafb;border-radius:12px;padding:12px;margin-bottom:16px">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px">
          <span style="color:#6b7280">รวม</span>
          <span id="pos-subtotal">0</span>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:4px">
          <span style="color:#6b7280">VAT 7%</span>
          <span id="pos-vat">0</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-weight:600;font-size:16px;margin-top:8px;padding-top:8px;border-top:1px solid #e5e7eb">
          <span>รวมทั้งสิ้น</span>
          <span id="pos-total" style="color:#7c3aed">0</span>
        </div>
      </div>

      <!-- วิธีชำระ -->
      <div class="form-group-custom">
        <label>วิธีชำระเงิน</label>
        <div class="input-wrap" style="padding:0">
          <i class="bi bi-wallet2"></i>
          <select id="pos-payment" style="width:100%;border:none;background:transparent;padding:12px 14px 12px 40px;font-size:14px;outline:none;appearance:none;-webkit-appearance:none" onchange="POS_STATE.paymentMethod=this.value">
            <option value="cash">เงินสด</option>
            <option value="qr">สแกน QR</option>
            <option value="transfer">โอนจ่าย</option>
          </select>
        </div>
      </div>

      <!-- ลูกค้า (ไม่บังคับ) -->
      <div class="form-group-custom">
        <label>ชื่อลูกค้า (ไม่บังคับ)</label>
        <div class="input-wrap">
          <i class="bi bi-person"></i>
          <input type="text" id="pos-customer" placeholder="ไม่ระบุ">
        </div>
      </div>

      <!-- หมายเหตุ -->
      <div class="form-group-custom">
        <label>หมายเหตุ</label>
        <div class="input-wrap">
          <i class="bi bi-chat-left"></i>
          <input type="text" id="pos-note" placeholder="หมายเหตุเพิ่มเติม">
        </div>
      </div>

      <!-- ปุ่ม -->
      <button class="btn-setup" id="pos-submit-btn" onclick="submitPOS()" style="width:100%">
        <i class="bi bi-check-circle"></i> ยืนยันขายสินค้า
      </button>
    </div>
  `;
  document.getElementById('modal-pos').classList.remove('hidden');
  setTimeout(() => document.getElementById('pos-item-name').focus(), 200);
}

// ===== 4.2 เพิ่มสินค้าเข้าตะกร้า =====
function addPOSItem() {
  const name = document.getElementById('pos-item-name').value.trim();
  const price = parseFloat(document.getElementById('pos-item-price').value) || 0;
  const qty = parseInt(document.getElementById('pos-item-qty').value) || 1;

  if (!name) { showToast('กรุณาระบุชื่อสินค้า'); return; }
  if (price <= 0) { showToast('กรุณาระบุราคา'); return; }

  POS_STATE.items.push({ name, price, qty });
  
  // เคลียร์ input
  document.getElementById('pos-item-name').value = '';
  document.getElementById('pos-item-price').value = '';
  document.getElementById('pos-item-qty').value = '1';
  document.getElementById('pos-item-name').focus();

  renderPOSTable();
  calculatePOSTotals();
}

// ===== 4.3 ลบสินค้า =====
function removePOSItem(index) {
  POS_STATE.items.splice(index, 1);
  renderPOSTable();
  calculatePOSTotals();
}

// ===== 4.4 แสดงตารางสินค้า =====
function renderPOSTable() {
  const container = document.getElementById('pos-items-table');
  if (POS_STATE.items.length === 0) {
    container.innerHTML = '<p style="color:#9ca3af;text-align:center;padding:16px">ยังไม่มีสินค้า</p>';
    return;
  }

  let html = `
    <table style="width:100%;border-collapse:collapse;font-size:13px">
      <thead>
        <tr style="border-bottom:1px solid #e5e7eb;text-align:left;color:#6b7280">
          <th style="padding:8px 4px">สินค้า</th>
          <th style="padding:8px 4px;text-align:right">ราคา</th>
          <th style="padding:8px 4px;text-align:center">จำนวน</th>
          <th style="padding:8px 4px;text-align:right">รวม</th>
          <th style="padding:8px 4px"></th>
        </tr>
      </thead>
      <tbody>
  `;

  POS_STATE.items.forEach((item, i) => {
    const total = item.price * item.qty;
    html += `
      <tr style="border-bottom:1px solid #f3f4f6">
        <td style="padding:8px 4px">${item.name}</td>
        <td style="padding:8px 4px;text-align:right">${item.price.toLocaleString()}</td>
        <td style="padding:8px 4px;text-align:center">${item.qty}</td>
        <td style="padding:8px 4px;text-align:right">${total.toLocaleString()}</td>
        <td style="padding:8px 4px;text-align:right">
          <button onclick="removePOSItem(${i})" style="background:none;border:none;color:#ef4444;cursor:pointer">
            <i class="bi bi-x-circle"></i>
          </button>
        </td>
      </tr>
    `;
  });

  html += '</tbody></table>';
  container.innerHTML = html;
}

// ===== 4.5 คำนวณยอดรวม =====
function calculatePOSTotals() {
  const subtotal = POS_STATE.items.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const vatRate = 0.07;
  const vatAmount = Math.round(subtotal * vatRate);
  const total = subtotal + vatAmount;

  document.getElementById('pos-subtotal').textContent = subtotal.toLocaleString() + ' ฿';
  document.getElementById('pos-vat').textContent = vatAmount.toLocaleString() + ' ฿';
  document.getElementById('pos-total').textContent = total.toLocaleString() + ' ฿';
}

// ===== 4.6 ส่งข้อมูลไป API =====
async function submitPOS() {
  if (POS_STATE.items.length === 0) {
    showToast('กรุณาเพิ่มสินค้าอย่างน้อย 1 รายการ');
    return;
  }

  const btn = document.getElementById('pos-submit-btn');
  btn.disabled = true;
  btn.innerHTML = '<i class="bi bi-hourglass-split"></i> กำลังบันทึก...';

  const customerName = document.getElementById('pos-customer').value.trim();
  const note = document.getElementById('pos-note').value.trim();
  const paymentMethod = document.getElementById('pos-payment').value;

  try {
    const res = await callAPI('createRetailSale', {
      items: POS_STATE.items.map(item => ({
        name: item.name,
        price: item.price,
        qty: item.qty
      })),
      payment_method: paymentMethod,
      customer_name: customerName || undefined,
      note: note || undefined,
      cashier: (APP.user && APP.user.name) || APP.user || 'POS'
    });

    if (res && res.success) {
      closeModal('modal-pos');
      showToast(`✅ ขายสินค้าเรียบร้อย (${res.sale_id})`);
      // รีเซ็ต state
      POS_STATE.items = [];
      POS_STATE.paymentMethod = 'cash';
      POS_STATE.customerName = '';
      POS_STATE.note = '';
    } else {
      showToast('❌ ' + (res && res.error ? res.error : 'เกิดข้อผิดพลาด'));
      btn.disabled = false;
      btn.innerHTML = '<i class="bi bi-check-circle"></i> ยืนยันขายสินค้า';
    }
  } catch (e) {
    showToast('❌ ไม่สามารถเชื่อมต่อได้');
    btn.disabled = false;
    btn.innerHTML = '<i class="bi bi-check-circle"></i> ยืนยันขายสินค้า';
  }
}

// ===== Export function =====
window.openPOS = openPOS;
