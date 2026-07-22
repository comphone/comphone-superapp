// ============================================================
// COMPHONE SUPER APP V5.5.4
// billing_customer.js — Add Customer, Billing, QR PromptPay
// ============================================================

'use strict';

// ── State ──────────────────────────────────────────────────
var BC = {
  currentJobId: null,
  currentBilling: null,
  billingItems: [],  // [{name, qty, price}]
};

// ============================================================
// ADD CUSTOMER — เพิ่มลูกค้าใหม่
// ============================================================

function openAddCustomerModal(prefillName, prefillPhone) {
  var m = document.getElementById('modal-add-customer');
  if (!m) return;
  // clear form
  var f = m.querySelectorAll('input, select, textarea');
  f.forEach(function(el) { el.value = ''; });
  // prefill ถ้ามี
  if (prefillName) {
    var nameEl = document.getElementById('new-cust-name');
    if (nameEl) nameEl.value = prefillName;
  }
  if (prefillPhone) {
    var phoneEl = document.getElementById('new-cust-phone');
    if (phoneEl) phoneEl.value = prefillPhone;
  }
  m.classList.remove('hidden');
}

function closeAddCustomerModal() {
  if (typeof closeModal === 'function') closeModal('modal-add-customer');
}

async function saveNewCustomer() {
  var name = (document.getElementById('new-cust-name') || {}).value || '';
  var phone = (document.getElementById('new-cust-phone') || {}).value || '';
  var address = (document.getElementById('new-cust-address') || {}).value || '';
  var custType = (document.getElementById('new-cust-type') || {}).value || 'Standard';
  var notes = (document.getElementById('new-cust-notes') || {}).value || '';

  if (!name.trim()) { showToast('กรุณากรอกชื่อลูกค้า'); return; }

  var btn = document.getElementById('btn-save-customer');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="bi bi-hourglass-split"></i> กำลังบันทึก...'; }

  try {
    var res = await callAPI('createCustomer', {
      customer_name: name.trim(),
      phone: phone.trim(),
      address: address.trim(),
      customer_type: custType,
      notes: notes.trim()
    });

    if (res && res.success) {
      showToast('✅ เพิ่มลูกค้า "' + name + '" เรียบร้อย (ID: ' + (res.customer_id || '') + ')');
      closeAddCustomerModal();
      // รีโหลดหน้า CRM ถ้าอยู่ที่นั่น
      if (typeof loadCRMPage === 'function') loadCRMPage();
    } else {
      showToast('❌ ' + (res && res.error ? res.error : 'เพิ่มลูกค้าไม่สำเร็จ'));
    }
  } catch (e) {
    showToast('❌ เกิดข้อผิดพลาด: ' + e.message);
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="bi bi-person-plus"></i> บันทึกลูกค้า'; }
  }
}

// ============================================================
// BILLING UI — ออกใบเสร็จ
// ============================================================

function openBillingModal(jobId) {
  BC.currentJobId = jobId || '';
  BC.billingItems = [];
  BC.currentBilling = null;

  var m = document.getElementById('modal-billing');
  if (!m) return;

  // แสดง loading
  var content = document.getElementById('billing-modal-content');
  if (content) content.innerHTML = '<div style="text-align:center;padding:2rem;"><i class="bi bi-hourglass-split" style="font-size:2rem;"></i><br>กำลังโหลดข้อมูล...</div>';

  m.classList.remove('hidden');

  // โหลดข้อมูล billing ที่มีอยู่
  loadBillingData(jobId);
}

async function loadBillingData(jobId) {
  try {
    // ดึง job detail ก่อน
    var dashRes = await callAPI('getDashboardData', {});
    var job = null;
    if (dashRes && dashRes.jobs) {
      job = dashRes.jobs.find(function(j) { return j.job_id === jobId || j.id === jobId; });
    }

    // ดึง billing ที่มีอยู่
    var billingRes = await callAPI('getBilling', { job_id: jobId });
    if (billingRes && billingRes.success) {
      BC.currentBilling = billingRes.billing;
    }

    renderBillingForm(job, BC.currentBilling);
  } catch (e) {
    var content = document.getElementById('billing-modal-content');
    if (content) content.innerHTML = '<p style="color:red;padding:1rem;">เกิดข้อผิดพลาด: ' + e.message + '</p>';
  }
}

function renderBillingForm(job, billing) {
  var content = document.getElementById('billing-modal-content');
  if (!content) return;

  var customerName = (job && job.customer_name) || (billing && billing.customer_name) || '';
  var phone = (billing && billing.phone) || '';
  var partsDesc = (billing && billing.parts_description) || '';
  var partsCost = (billing && billing.parts_cost) || 0;
  var laborCost = (billing && billing.labor_cost) || 0;
  var discount = (billing && billing.discount) || 0;
  var totalAmount = (billing && billing.total_amount) || 0;
  var amountPaid = (billing && billing.amount_paid) || 0;
  var balanceDue = (billing && billing.balance_due) || totalAmount;
  var paymentStatus = (billing && billing.payment_status) || 'UNPAID';

  var statusBadge = {
    'PAID': '<span style="background:#22c55e;color:#fff;padding:2px 10px;border-radius:12px;font-size:0.8rem;">ชำระแล้ว</span>',
    'PARTIAL': '<span style="background:#f59e0b;color:#fff;padding:2px 10px;border-radius:12px;font-size:0.8rem;">ชำระบางส่วน</span>',
    'UNPAID': '<span style="background:#ef4444;color:#fff;padding:2px 10px;border-radius:12px;font-size:0.8rem;">ยังไม่ชำระ</span>'
  }[paymentStatus] || '';

  content.innerHTML = `
    <div style="padding:0.5rem 0;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
        <div>
          <div style="font-weight:700;font-size:1rem;">${customerName}</div>
          <div style="color:#64748b;font-size:0.85rem;">${BC.currentJobId} ${phone ? '| ' + phone : ''}</div>
        </div>
        <div>${statusBadge}</div>
      </div>

      <div style="background:#f8fafc;border-radius:10px;padding:1rem;margin-bottom:1rem;">
        <div style="font-weight:600;margin-bottom:0.75rem;color:#334155;">รายละเอียดค่าใช้จ่าย</div>

        <div class="form-group" style="margin-bottom:0.75rem;">
          <label style="font-size:0.85rem;color:#64748b;">รายการอะไหล่/ชิ้นส่วน</label>
          <textarea id="bill-parts-desc" rows="2" style="width:100%;border:1px solid #e2e8f0;border-radius:8px;padding:8px;font-size:0.9rem;resize:none;">${partsDesc !== '-' ? partsDesc : ''}</textarea>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;margin-bottom:0.75rem;">
          <div>
            <label style="font-size:0.85rem;color:#64748b;">ค่าอะไหล่ (฿)</label>
            <input type="number" id="bill-parts-cost" value="${partsCost}" min="0" step="0.01"
              style="width:100%;border:1px solid #e2e8f0;border-radius:8px;padding:8px;font-size:0.9rem;"
              oninput="recalcBilling()">
          </div>
          <div>
            <label style="font-size:0.85rem;color:#64748b;">ค่าแรง (฿)</label>
            <input type="number" id="bill-labor-cost" value="${laborCost}" min="0" step="0.01"
              style="width:100%;border:1px solid #e2e8f0;border-radius:8px;padding:8px;font-size:0.9rem;"
              oninput="recalcBilling()">
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;">
          <div>
            <label style="font-size:0.85rem;color:#64748b;">ส่วนลด (฿)</label>
            <input type="number" id="bill-discount" value="${discount}" min="0" step="0.01"
              style="width:100%;border:1px solid #e2e8f0;border-radius:8px;padding:8px;font-size:0.9rem;"
              oninput="recalcBilling()">
          </div>
          <div>
            <label style="font-size:0.85rem;color:#64748b;">ชำระแล้ว (฿)</label>
            <input type="number" id="bill-amount-paid" value="${amountPaid}" min="0" step="0.01"
              style="width:100%;border:1px solid #e2e8f0;border-radius:8px;padding:8px;font-size:0.9rem;"
              oninput="recalcBilling()">
          </div>
        </div>
      </div>

      <!-- Summary -->
      <div id="billing-summary" style="background:linear-gradient(135deg,#1e40af,#3b82f6);color:#fff;border-radius:10px;padding:1rem;margin-bottom:1rem;">
        <div style="display:flex;justify-content:space-between;margin-bottom:0.4rem;">
          <span style="opacity:0.85;">ยอดรวม</span>
          <span id="bill-total-display">฿${totalAmount.toLocaleString('th-TH', {minimumFractionDigits:2})}</span>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:0.4rem;">
          <span style="opacity:0.85;">ชำระแล้ว</span>
          <span id="bill-paid-display">฿${amountPaid.toLocaleString('th-TH', {minimumFractionDigits:2})}</span>
        </div>
        <div style="border-top:1px solid rgba(255,255,255,0.3);margin:0.5rem 0;"></div>
        <div style="display:flex;justify-content:space-between;font-weight:700;font-size:1.1rem;">
          <span>ยอดค้างชำระ</span>
          <span id="bill-balance-display">฿${balanceDue.toLocaleString('th-TH', {minimumFractionDigits:2})}</span>
        </div>
      </div>

      <!-- Action Buttons -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;">
        <button id="btn-save-billing" onclick="saveBilling()"
          style="background:#1e40af;color:#fff;border:none;border-radius:10px;padding:0.75rem;font-size:0.9rem;font-weight:600;cursor:pointer;">
          <i class="bi bi-save"></i> บันทึกใบเสร็จ
        </button>
        <button onclick="openQRPayment()"
          style="background:#22c55e;color:#fff;border:none;border-radius:10px;padding:0.75rem;font-size:0.9rem;font-weight:600;cursor:pointer;">
          <i class="bi bi-qr-code"></i> QR รับเงิน
        </button>
      </div>
    </div>
  `;
}

function recalcBilling() {
  var parts = parseFloat(document.getElementById('bill-parts-cost').value) || 0;
  var labor = parseFloat(document.getElementById('bill-labor-cost').value) || 0;
  var discount = parseFloat(document.getElementById('bill-discount').value) || 0;
  var paid = parseFloat(document.getElementById('bill-amount-paid').value) || 0;

  var subtotal = parts + labor;
  var total = Math.max(0, subtotal - discount);
  var balance = Math.max(0, total - paid);

  var fmt = function(n) { return '฿' + n.toLocaleString('th-TH', {minimumFractionDigits:2}); };
  var el1 = document.getElementById('bill-total-display');
  var el2 = document.getElementById('bill-paid-display');
  var el3 = document.getElementById('bill-balance-display');
  if (el1) el1.textContent = fmt(total);
  if (el2) el2.textContent = fmt(paid);
  if (el3) el3.textContent = fmt(balance);
}

async function saveBilling() {
  if (!BC.currentJobId) { showToast('ไม่พบ Job ID'); return; }

  var partsDesc = (document.getElementById('bill-parts-desc') || {}).value || '';
  var partsCost = parseFloat((document.getElementById('bill-parts-cost') || {}).value) || 0;
  var laborCost = parseFloat((document.getElementById('bill-labor-cost') || {}).value) || 0;
  var discount = parseFloat((document.getElementById('bill-discount') || {}).value) || 0;
  var amountPaid = parseFloat((document.getElementById('bill-amount-paid') || {}).value) || 0;

  var subtotal = partsCost + laborCost;
  var totalAmount = Math.max(0, subtotal - discount);

  var btn = document.getElementById('btn-save-billing');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="bi bi-hourglass-split"></i> กำลังบันทึก...'; }

  try {
    var res = await callAPI('createBilling', {
      job_id: BC.currentJobId,
      parts: partsDesc.trim() || '-',
      parts_cost: partsCost,
      labor_cost: laborCost,
      discount: discount,
      total_amount: totalAmount,
      amount_paid: amountPaid
    });

    if (res && res.success) {
      BC.currentBilling = res.billing;
      showToast('✅ บันทึกใบเสร็จเรียบร้อย');
      // อัปเดต summary display
      recalcBilling();
      // ถ้าชำระครบ → แจ้งเตือน
      if (amountPaid >= totalAmount && totalAmount > 0) {
        showToast('🎉 ชำระเงินครบแล้ว!');
      }
    } else {
      showToast('❌ ' + (res && res.error ? res.error : 'บันทึกไม่สำเร็จ'));
    }
  } catch (e) {
    showToast('❌ เกิดข้อผิดพลาด: ' + e.message);
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="bi bi-save"></i> บันทึกใบเสร็จ'; }
  }
}

function closeBillingModal() {
  if (typeof closeModal === 'function') closeModal('modal-billing');
  BC.currentJobId = null;
  BC.currentBilling = null;
}

// ============================================================
// QR PROMPTPAY — สร้าง QR รับเงิน
// ============================================================

async function openQRPayment(jobIdOverride) {
  var jobId = jobIdOverride || BC.currentJobId;
  if (!jobId) { showToast('กรุณาเลือกงานก่อน'); return; }

  var m = document.getElementById('modal-qr-payment');
  if (!m) return;

  var qrContent = document.getElementById('qr-payment-content');
  if (qrContent) qrContent.innerHTML = '<div style="text-align:center;padding:2rem;"><i class="bi bi-hourglass-split" style="font-size:2rem;"></i><br>กำลังสร้าง QR...</div>';

  m.classList.remove('hidden');

  try {
    // ดึง job detail ก่อน (ถ้ายังไม่ได้บันทึก)
    var billingRes = await callAPI('getBilling', { job_id: jobId });
    var billing = billingRes && billingRes.success ? billingRes.billing : null;

    // ถ้ายังไม่มี billing → สร้างใหม่จาก job
    if (!billing) {
      var createRes = await callAPI('createBilling', { job_id: jobId });
      if (createRes && createRes.success) billing = createRes.billing;
    }

    if (!billing) {
      if (qrContent) qrContent.innerHTML = '<p style="color:red;text-align:center;padding:1rem;">ไม่พบข้อมูลใบเสร็จ กรุณาบันทึกใบเสร็จก่อน</p>';
      return;
    }

    var amount = billing.balance_due || billing.total_amount || 0;
    var promptPayId = billing.promptpay_biller_id || '';

    if (!promptPayId) {
      if (qrContent) qrContent.innerHTML = `
        <div style="text-align:center;padding:1.5rem;">
          <i class="bi bi-exclamation-triangle" style="font-size:2.5rem;color:#f59e0b;"></i>
          <p style="margin:1rem 0;color:#64748b;">ยังไม่ได้ตั้งค่า PromptPay ID<br>กรุณาตั้งค่าใน Script Properties</p>
          <p style="font-size:0.85rem;color:#94a3b8;">PROMPTPAY_BILLER_ID = เบอร์โทร หรือ เลขบัตรประชาชน</p>
        </div>`;
      return;
    }

    // สร้าง QR URL
    var qrRes = await callAPI('generatePromptPayQR', {
      job_id: jobId,
      biller_id: promptPayId,
      amount: amount
    });

    renderQRPayment(billing, qrRes, amount);

  } catch (e) {
    if (qrContent) qrContent.innerHTML = '<p style="color:red;text-align:center;padding:1rem;">เกิดข้อผิดพลาด: ' + e.message + '</p>';
  }
}

function renderQRPayment(billing, qrRes, amount) {
  var qrContent = document.getElementById('qr-payment-content');
  if (!qrContent) return;

  var qrUrl = (qrRes && qrRes.qr_image_url) || (qrRes && qrRes.qr_url) || '';
  var payload = (qrRes && qrRes.payload) || '';
  var promptPayId = billing.promptpay_biller_id || '';

  qrContent.innerHTML = `
    <div style="text-align:center;padding:0.5rem;">
      <div style="font-weight:700;font-size:1.1rem;margin-bottom:0.25rem;">${billing.customer_name || ''}</div>
      <div style="color:#64748b;font-size:0.85rem;margin-bottom:1rem;">${billing.job_id}</div>

      <div style="background:#f8fafc;border-radius:12px;padding:1.25rem;margin-bottom:1rem;display:inline-block;">
        ${qrUrl
          ? `<img src="${qrUrl}" alt="QR PromptPay" style="width:200px;height:200px;border-radius:8px;"
               onerror="this.style.display='none';document.getElementById('qr-fallback').style.display='block';">`
          : ''}
        <div id="qr-fallback" style="${qrUrl ? 'display:none;' : ''}background:#e2e8f0;width:200px;height:200px;border-radius:8px;display:flex;align-items:center;justify-content:center;margin:0 auto;">
          <div style="text-align:center;color:#64748b;">
            <i class="bi bi-qr-code" style="font-size:3rem;"></i>
            <div style="font-size:0.75rem;margin-top:0.5rem;">QR PromptPay</div>
          </div>
        </div>
      </div>

      <div style="background:linear-gradient(135deg,#1e40af,#3b82f6);color:#fff;border-radius:10px;padding:1rem;margin-bottom:1rem;">
        <div style="font-size:0.85rem;opacity:0.85;">ยอดที่ต้องชำระ</div>
        <div style="font-size:1.8rem;font-weight:700;">฿${amount.toLocaleString('th-TH', {minimumFractionDigits:2})}</div>
        <div style="font-size:0.8rem;opacity:0.75;margin-top:0.25rem;">PromptPay: ${promptPayId}</div>
      </div>

      ${payload ? `
      <div style="background:#f1f5f9;border-radius:8px;padding:0.75rem;margin-bottom:1rem;word-break:break-all;font-size:0.75rem;color:#64748b;text-align:left;">
        <div style="font-weight:600;margin-bottom:0.25rem;">EMV Payload:</div>
        <div style="font-family:monospace;">${payload}</div>
      </div>` : ''}

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;">
        <button onclick="markAsPaid('${billing.job_id}', ${amount})"
          style="background:#22c55e;color:#fff;border:none;border-radius:10px;padding:0.75rem;font-size:0.9rem;font-weight:600;cursor:pointer;">
          <i class="bi bi-check-circle"></i> รับเงินแล้ว
        </button>
        <button onclick="copyQRPayload('${payload}')"
          style="background:#f1f5f9;color:#334155;border:1px solid #e2e8f0;border-radius:10px;padding:0.75rem;font-size:0.9rem;font-weight:600;cursor:pointer;">
          <i class="bi bi-clipboard"></i> คัดลอก
        </button>
      </div>
    </div>
  `;
}

async function markAsPaid(jobId, amount) {
  var btn = event.target.closest('button');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="bi bi-hourglass-split"></i> กำลังบันทึก...'; }

  try {
    var res = await callAPI('updatePayment', {
      job_id: jobId,
      amount_paid: amount,
      generate_receipt: true
    });

    if (res && res.success) {
      showToast('🎉 บันทึกการรับเงินเรียบร้อย!');
      closeQRPaymentModal();
      closeBillingModal();
      // รีโหลดหน้า jobs
      if (typeof loadLiveData === 'function') loadLiveData();
    } else {
      showToast('❌ ' + (res && res.error ? res.error : 'บันทึกไม่สำเร็จ'));
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="bi bi-check-circle"></i> รับเงินแล้ว'; }
    }
  } catch (e) {
    showToast('❌ เกิดข้อผิดพลาด: ' + e.message);
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="bi bi-check-circle"></i> รับเงินแล้ว'; }
  }
}

function copyQRPayload(payload) {
  if (!payload) { showToast('ไม่มี payload'); return; }
  if (navigator.clipboard) {
    navigator.clipboard.writeText(payload).then(function() {
      showToast('📋 คัดลอก EMV Payload แล้ว');
    });
  } else {
    showToast('เบราว์เซอร์ไม่รองรับการคัดลอก');
  }
}

function closeQRPaymentModal() {
  if (typeof closeModal === 'function') closeModal('modal-qr-payment');
}

// ============================================================
// INVENTORY UI — จัดการสต็อก
// ============================================================

async function openInventoryPage() {
  var page = document.getElementById('page-inventory');
  if (!page) return;

  // ซ่อนทุกหน้า
  document.querySelectorAll('.page').forEach(function(p) { p.style.display = 'none'; });
  page.style.display = 'block';

  // โหลดข้อมูล
  page.innerHTML = '<div style="text-align:center;padding:3rem;"><i class="bi bi-hourglass-split" style="font-size:2rem;"></i><br>กำลังโหลดสต็อก...</div>';

  try {
    var res = await callAPI('inventoryOverview', {});
    if (res && res.success) {
      renderInventoryPage(res);
    } else {
      page.innerHTML = '<p style="color:red;text-align:center;padding:2rem;">โหลดข้อมูลไม่สำเร็จ</p>';
    }
  } catch (e) {
    page.innerHTML = '<p style="color:red;text-align:center;padding:2rem;">เกิดข้อผิดพลาด: ' + e.message + '</p>';
  }
}

function renderInventoryPage(data) {
  var page = document.getElementById('page-inventory');
  if (!page) return;

  var items = data.items || [];
  var lowStock = items.filter(function(i) { return i.qty <= (i.reorder_point || 5); });

  var itemsHtml = items.length === 0
    ? '<div style="text-align:center;padding:2rem;color:#94a3b8;"><i class="bi bi-box-seam" style="font-size:2.5rem;"></i><br>ยังไม่มีสินค้าในสต็อก</div>'
    : items.map(function(item) {
        var isLow = item.qty <= (item.reorder_point || 5);
        return `
          <div style="background:#fff;border-radius:10px;padding:1rem;margin-bottom:0.75rem;border:1px solid ${isLow ? '#fca5a5' : '#e2e8f0'};${isLow ? 'background:#fff7f7;' : ''}">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;">
              <div style="flex:1;">
                <div style="font-weight:600;font-size:0.95rem;">${item.item_name || item.name || ''}</div>
                <div style="color:#64748b;font-size:0.8rem;">${item.item_code || item.code || ''}</div>
              </div>
              <div style="text-align:right;">
                <div style="font-weight:700;font-size:1.1rem;color:${isLow ? '#ef4444' : '#22c55e'};">${item.qty || 0}</div>
                <div style="font-size:0.75rem;color:#94a3b8;">min: ${item.reorder_point || 5}</div>
              </div>
            </div>
            <div style="display:flex;justify-content:space-between;margin-top:0.5rem;font-size:0.8rem;color:#64748b;">
              <span>ราคาทุน: ฿${(item.cost || 0).toLocaleString('th-TH')}</span>
              <span>ราคาขาย: ฿${(item.price || 0).toLocaleString('th-TH')}</span>
            </div>
            ${isLow ? '<div style="margin-top:0.5rem;font-size:0.8rem;color:#ef4444;font-weight:600;"><i class="bi bi-exclamation-triangle"></i> สต็อกต่ำ — ควรสั่งซื้อ</div>' : ''}
          </div>`;
      }).join('');

  page.innerHTML = `
    <div style="padding:1rem;max-width:600px;margin:0 auto;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
        <div>
          <h2 style="margin:0;font-size:1.2rem;font-weight:700;">คลังสินค้า</h2>
          <div style="color:#64748b;font-size:0.85rem;">${items.length} รายการ${lowStock.length > 0 ? ' | <span style="color:#ef4444;">' + lowStock.length + ' รายการสต็อกต่ำ</span>' : ''}</div>
        </div>
        <button onclick="openAddInventoryModal()"
          style="background:#1e40af;color:#fff;border:none;border-radius:8px;padding:0.5rem 1rem;font-size:0.85rem;font-weight:600;cursor:pointer;">
          <i class="bi bi-plus-lg"></i> เพิ่มสินค้า
        </button>
      </div>

      <div id="inventory-list">${itemsHtml}</div>
    </div>
  `;
}

function openAddInventoryModal() {
  var m = document.getElementById('modal-add-inventory');
  if (!m) return;
  m.querySelectorAll('input, textarea').forEach(function(el) { el.value = ''; });
  m.classList.remove('hidden');
}

function closeAddInventoryModal() {
  if (typeof closeModal === 'function') closeModal('modal-add-inventory');
}

async function saveNewInventoryItem() {
  var code = (document.getElementById('inv-code') || {}).value || '';
  var name = (document.getElementById('inv-name') || {}).value || '';
  var qty = parseFloat((document.getElementById('inv-qty') || {}).value) || 0;
  var cost = parseFloat((document.getElementById('inv-cost') || {}).value) || 0;
  var price = parseFloat((document.getElementById('inv-price') || {}).value) || 0;
  var reorderPoint = parseInt((document.getElementById('inv-reorder') || {}).value) || 5;

  if (!code.trim()) { showToast('กรุณากรอกรหัสสินค้า'); return; }
  if (!name.trim()) { showToast('กรุณากรอกชื่อสินค้า'); return; }

  var btn = document.getElementById('btn-save-inventory');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="bi bi-hourglass-split"></i> กำลังบันทึก...'; }

  try {
    var res = await callAPI('addInventoryItem', {
      item_code: code.trim(),
      item_name: name.trim(),
      qty: qty,
      cost: cost,
      price: price,
      reorder_point: reorderPoint
    });

    if (res && res.success) {
      showToast('✅ เพิ่มสินค้า "' + name + '" เรียบร้อย');
      closeAddInventoryModal();
      openInventoryPage(); // รีโหลด
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
// Expose to global
// ============================================================
window.openAddCustomerModal = openAddCustomerModal;
window.closeAddCustomerModal = closeAddCustomerModal;
window.saveNewCustomer = saveNewCustomer;
window.openBillingModal = openBillingModal;
window.closeBillingModal = closeBillingModal;
window.saveBilling = saveBilling;
window.recalcBilling = recalcBilling;
window.openQRPayment = openQRPayment;
window.closeQRPaymentModal = closeQRPaymentModal;
window.markAsPaid = markAsPaid;
window.copyQRPayload = copyQRPayload;
window.openInventoryPage = openInventoryPage;
window.openAddInventoryModal = openAddInventoryModal;
window.closeAddInventoryModal = closeAddInventoryModal;
window.saveNewInventoryItem = saveNewInventoryItem;
