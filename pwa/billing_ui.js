/**
 * billing_ui.js — Billing List + Invoice View + Payment Confirmation
 * COMPHONE SUPER APP V5.5 | Sprint 3
 *
 * Components:
 *   2a. Billing List Page (หน้ารายการใบเสร็จทั้งหมด + filter + search)
 *   2b. Invoice Detail View (ดูใบเสร็จครบ)
 *   2c. Payment Confirmation Modal (ยืนยันรับเงิน + slip upload)
 *
 * กฎ: ห้าม onclick inline — ใช้ addEventListener เท่านั้น
 *     ทุก API call ผ่าน callAPI() เท่านั้น
 */

'use strict';

/* ─── State ────────────────────────────────────────────────── */
const BILLING_UI = {
  allBillings:  [],
  filter:       { status: 'all', search: '' },
  currentBilling: null
};

/* ══════════════════════════════════════════════════════════════
   COMPONENT 2a — Billing List Page
══════════════════════════════════════════════════════════════ */

/**
 * โหลดและ render รายการ billing ทั้งหมด
 * เรียกเมื่อ goPage('billing')
 */
async function loadBillingListPage() {
  const container = document.getElementById('billing-list-content');
  if (!container) return;

  container.innerHTML = '<div class="loading-spinner-sm" style="margin:24px auto"></div>';

  try {
    const res = await callAPI('listBillings', { status: BILLING_UI.filter.status === 'all' ? '' : BILLING_UI.filter.status });
    if (!res.success) throw new Error(res.error || 'โหลดข้อมูลไม่สำเร็จ');
    BILLING_UI.allBillings = res.billings || [];
    renderBillingList_();
  } catch (e) {
    container.innerHTML = `<div style="padding:24px;text-align:center;color:#ef4444">${e.message}</div>`;
  }
}

/**
 * Render รายการ billing ตาม filter + search
 */
function renderBillingList_() {
  const container = document.getElementById('billing-list-content');
  if (!container) return;

  const q = BILLING_UI.filter.search.toLowerCase();
  const filtered = BILLING_UI.allBillings.filter(b => {
    if (BILLING_UI.filter.status !== 'all' && b.payment_status !== BILLING_UI.filter.status) return false;
    if (q && !(
      (b.customer_name || '').toLowerCase().includes(q) ||
      (b.job_id || '').toLowerCase().includes(q) ||
      (b.billing_id || '').toLowerCase().includes(q)
    )) return false;
    return true;
  });

  if (!filtered.length) {
    container.innerHTML = '<div style="padding:32px;text-align:center;color:#9ca3af">ไม่มีรายการ</div>';
    return;
  }

  /* Summary bar */
  const totalUnpaid = filtered.filter(b => b.payment_status === 'UNPAID').reduce((s, b) => s + (b.balance_due || 0), 0);
  const totalPaid   = filtered.filter(b => b.payment_status === 'PAID').reduce((s, b) => s + (b.total_amount || 0), 0);

  container.innerHTML = `
    <div class="billing-summary-bar">
      <div class="billing-stat">
        <div class="billing-stat-num">${filtered.length}</div>
        <div class="billing-stat-label">รายการ</div>
      </div>
      <div class="billing-stat billing-stat-warn">
        <div class="billing-stat-num">฿${totalUnpaid.toLocaleString()}</div>
        <div class="billing-stat-label">ค้างชำระ</div>
      </div>
      <div class="billing-stat billing-stat-success">
        <div class="billing-stat-num">฿${totalPaid.toLocaleString()}</div>
        <div class="billing-stat-label">รับแล้ว</div>
      </div>
    </div>
    ${filtered.map((b, idx) => buildBillingCard_(b, idx)).join('')}
  `;

  /* bind events */
  container.querySelectorAll('[data-billing-idx]').forEach(el => {
    el.addEventListener('click', () => openInvoiceDetail_(BILLING_UI.allBillings[parseInt(el.dataset.billingIdx, 10)]));
  });
  container.querySelectorAll('[data-pay-idx]').forEach(el => {
    el.addEventListener('click', e => {
      e.stopPropagation();
      openPaymentConfirmModal_(BILLING_UI.allBillings[parseInt(el.dataset.payIdx, 10)]);
    });
  });
}

/**
 * สร้าง HTML ของ billing card
 */
function buildBillingCard_(b, idx) {
  const statusColor = { PAID: '#10b981', UNPAID: '#ef4444', PARTIAL: '#f59e0b' };
  const statusLabel = { PAID: 'ชำระแล้ว', UNPAID: 'ยังไม่ชำระ', PARTIAL: 'ชำระบางส่วน' };
  const color = statusColor[b.payment_status] || '#6b7280';
  const label = statusLabel[b.payment_status] || b.payment_status;
  const dateStr = b.created_at ? new Date(b.created_at).toLocaleDateString('th-TH', {
    year: 'numeric', month: 'short', day: 'numeric'
  }) : '';

  return `
    <div class="billing-card" data-billing-idx="${idx}">
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div>
          <div style="font-weight:700;font-size:14px">${b.customer_name || '-'}</div>
          <div style="font-size:12px;color:#6b7280">${b.job_id || ''} · ${dateStr}</div>
        </div>
        <span class="billing-status-badge" style="background:${color}22;color:${color}">${label}</span>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px">
        <div>
          <div style="font-size:13px;color:#6b7280">ยอดรวม</div>
          <div style="font-weight:800;font-size:16px;color:#111827">฿${Number(b.total_amount || 0).toLocaleString()}</div>
        </div>
        ${b.balance_due > 0 ? `
        <div style="text-align:right">
          <div style="font-size:12px;color:#ef4444">ค้างชำระ</div>
          <div style="font-weight:700;color:#ef4444">฿${Number(b.balance_due).toLocaleString()}</div>
        </div>` : ''}
        ${b.payment_status !== 'PAID' ? `
        <button class="btn-pay" data-pay-idx="${idx}">
          <i class="bi bi-qr-code"></i> รับเงิน
        </button>` : `
        <span style="color:#10b981;font-size:13px"><i class="bi bi-check-circle-fill"></i> ชำระแล้ว</span>`}
      </div>
    </div>`;
}

/* ── Filter Controls ─────────────────────────────────────── */

function setBillingStatusFilter_(status) {
  BILLING_UI.filter.status = status;
  document.querySelectorAll('#billing-filter-tabs .filter-tab').forEach(b => {
    b.classList.toggle('active', b.dataset.status === status);
  });
  renderBillingList_();
}

function setBillingSearch_(q) {
  BILLING_UI.filter.search = q;
  renderBillingList_();
}

/* ══════════════════════════════════════════════════════════════
   COMPONENT 2b — Invoice Detail View
══════════════════════════════════════════════════════════════ */

/**
 * เปิด modal ดูใบเสร็จครบ
 */
function openInvoiceDetail_(billing) {
  BILLING_UI.currentBilling = billing;
  const modal = document.getElementById('modal-invoice-detail');
  const body  = document.getElementById('invoice-detail-body');

  const dateStr = billing.created_at ? new Date(billing.created_at).toLocaleDateString('th-TH', {
    year: 'numeric', month: 'long', day: 'numeric'
  }) : '';
  const paidDate = billing.paid_at ? new Date(billing.paid_at).toLocaleDateString('th-TH') : '';
  const statusColor = { PAID: '#10b981', UNPAID: '#ef4444', PARTIAL: '#f59e0b' };
  const statusLabel = { PAID: 'ชำระแล้ว', UNPAID: 'ยังไม่ชำระ', PARTIAL: 'ชำระบางส่วน' };

  body.innerHTML = `
    <div style="padding:16px">
      <!-- Header -->
      <div style="text-align:center;border-bottom:2px solid #e5e7eb;padding-bottom:16px;margin-bottom:16px">
        <div style="font-size:11px;color:#9ca3af;letter-spacing:2px;text-transform:uppercase">ใบเสร็จรับเงิน</div>
        <div style="font-size:22px;font-weight:800;color:#111827;margin:4px 0">${billing.customer_name || '-'}</div>
        <div style="font-size:12px;color:#6b7280">${billing.job_id || ''} · ${dateStr}</div>
        <span style="background:${statusColor[billing.payment_status] || '#6b7280'}22;color:${statusColor[billing.payment_status] || '#6b7280'};padding:4px 12px;border-radius:20px;font-size:12px;font-weight:700">
          ${statusLabel[billing.payment_status] || billing.payment_status}
        </span>
      </div>

      <!-- Line items -->
      <table style="width:100%;font-size:13px;border-collapse:collapse;margin-bottom:16px">
        <tr style="background:#f9fafb">
          <td style="padding:8px;font-weight:600;color:#6b7280">รายการ</td>
          <td style="padding:8px;text-align:right;font-weight:600;color:#6b7280">จำนวน</td>
        </tr>
        ${billing.parts_desc ? `<tr><td style="padding:6px 8px">อะไหล่: ${billing.parts_desc}</td><td style="padding:6px 8px;text-align:right">฿${Number(billing.parts_cost || 0).toLocaleString()}</td></tr>` : ''}
        <tr><td style="padding:6px 8px">ค่าแรง</td><td style="padding:6px 8px;text-align:right">฿${Number(billing.labor_cost || 0).toLocaleString()}</td></tr>
        ${billing.discount > 0 ? `<tr><td style="padding:6px 8px;color:#10b981">ส่วนลด</td><td style="padding:6px 8px;text-align:right;color:#10b981">-฿${Number(billing.discount).toLocaleString()}</td></tr>` : ''}
        <tr style="border-top:2px solid #e5e7eb;font-weight:800">
          <td style="padding:10px 8px;font-size:15px">ยอดรวม</td>
          <td style="padding:10px 8px;text-align:right;font-size:15px">฿${Number(billing.total_amount || 0).toLocaleString()}</td>
        </tr>
        ${billing.amount_paid > 0 ? `<tr><td style="padding:6px 8px;color:#10b981">ชำระแล้ว</td><td style="padding:6px 8px;text-align:right;color:#10b981">฿${Number(billing.amount_paid).toLocaleString()}</td></tr>` : ''}
        ${billing.balance_due > 0 ? `<tr style="background:#fef2f2"><td style="padding:8px;color:#ef4444;font-weight:700">ค้างชำระ</td><td style="padding:8px;text-align:right;color:#ef4444;font-weight:700">฿${Number(billing.balance_due).toLocaleString()}</td></tr>` : ''}
      </table>

      <!-- Payment info -->
      ${billing.payment_method ? `<div style="font-size:12px;color:#6b7280;margin-bottom:4px">วิธีชำระ: <strong>${billing.payment_method}</strong></div>` : ''}
      ${paidDate ? `<div style="font-size:12px;color:#6b7280;margin-bottom:16px">วันที่ชำระ: <strong>${paidDate}</strong></div>` : ''}

      <!-- Action buttons -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:8px">
        ${billing.payment_status !== 'PAID' ? `
        <button id="btn-invoice-pay" class="btn-primary">
          <i class="bi bi-qr-code"></i> รับเงิน
        </button>` : ''}
        <button id="btn-invoice-print" class="btn-secondary">
          <i class="bi bi-printer"></i> พิมพ์
        </button>
      </div>
    </div>`;

  /* bind buttons */
  const payBtn = document.getElementById('btn-invoice-pay');
  if (payBtn) payBtn.addEventListener('click', () => openPaymentConfirmModal_(billing));

  const printBtn = document.getElementById('btn-invoice-print');
  if (printBtn) printBtn.addEventListener('click', () => printInvoice_(billing));

  modal.classList.remove('hidden');
}

/**
 * พิมพ์ใบเสร็จ (เปิด print dialog)
 */
function printInvoice_(billing) {
  const win = window.open('', '_blank');
  if (!win) { showToast('⚠️ กรุณาอนุญาต popup'); return; }
  const dateStr = billing.created_at ? new Date(billing.created_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' }) : '';
  win.document.write(`<!DOCTYPE html><html lang="th"><head>
    <meta charset="UTF-8"><title>ใบเสร็จ ${billing.job_id}</title>
    <style>body{font-family:sans-serif;max-width:400px;margin:0 auto;padding:20px}
    h2{text-align:center;font-size:18px}
    table{width:100%;border-collapse:collapse}
    td{padding:6px 4px;font-size:13px}
    .total{font-weight:700;font-size:15px;border-top:2px solid #000}
    @media print{button{display:none}}</style></head><body>
    <h2>COMPHONE — ใบเสร็จรับเงิน</h2>
    <p style="text-align:center;font-size:12px;color:#666">${billing.job_id} · ${dateStr}</p>
    <hr>
    <table>
      <tr><td>ลูกค้า</td><td style="text-align:right;font-weight:600">${billing.customer_name || '-'}</td></tr>
      ${billing.parts_desc ? `<tr><td>อะไหล่</td><td style="text-align:right">฿${Number(billing.parts_cost || 0).toLocaleString()}</td></tr>` : ''}
      <tr><td>ค่าแรง</td><td style="text-align:right">฿${Number(billing.labor_cost || 0).toLocaleString()}</td></tr>
      ${billing.discount > 0 ? `<tr><td>ส่วนลด</td><td style="text-align:right;color:green">-฿${Number(billing.discount).toLocaleString()}</td></tr>` : ''}
      <tr class="total"><td>ยอดรวม</td><td style="text-align:right">฿${Number(billing.total_amount || 0).toLocaleString()}</td></tr>
    </table>
    <hr>
    <p style="text-align:center;font-size:11px;color:#888">ขอบคุณที่ใช้บริการ COMPHONE</p>
    <button onclick="window.print()" style="width:100%;padding:8px;margin-top:12px">พิมพ์</button>
  </body></html>`);
  win.document.close();
}

/* ══════════════════════════════════════════════════════════════
   COMPONENT 2c — Payment Confirmation Modal
══════════════════════════════════════════════════════════════ */

/**
 * เปิด modal ยืนยันรับเงิน
 */
function openPaymentConfirmModal_(billing) {
  BILLING_UI.currentBilling = billing;
  const modal = document.getElementById('modal-payment-confirm');

  modal.querySelector('#pay-confirm-customer').textContent = billing.customer_name || '-';
  modal.querySelector('#pay-confirm-jobid').textContent    = billing.job_id || '';
  modal.querySelector('#pay-confirm-amount').textContent   = '฿' + Number(billing.balance_due || billing.total_amount || 0).toLocaleString();
  modal.querySelector('#pay-confirm-method').value         = 'CASH';
  modal.querySelector('#pay-confirm-note').value           = '';
  modal.querySelector('#pay-slip-preview').innerHTML       = '';
  modal.querySelector('#pay-slip-preview').classList.add('hidden');

  /* แสดง QR section */
  const qrSection = modal.querySelector('#pay-qr-section');
  qrSection.innerHTML = '<div style="color:#9ca3af;font-size:12px;text-align:center">กำลังโหลด QR...</div>';
  loadPromptPayQR_(billing, qrSection);

  modal.classList.remove('hidden');
}

/**
 * โหลด PromptPay QR
 */
async function loadPromptPayQR_(billing, container) {
  try {
    const res = await callAPI('generatePromptPayQR', {
      job_id: billing.job_id,
      amount: billing.balance_due || billing.total_amount || 0
    });
    if (!res.success) throw new Error(res.error);

    const qrUrl = res.qr_image_url || res.qr_url || '';
    container.innerHTML = qrUrl
      ? `<div style="text-align:center">
           <img src="${qrUrl}" alt="QR PromptPay" style="width:180px;height:180px;border-radius:8px;border:1px solid #e5e7eb">
           <div style="font-size:11px;color:#9ca3af;margin-top:4px">สแกนเพื่อชำระเงิน</div>
         </div>`
      : `<div style="text-align:center;color:#9ca3af;font-size:12px">ไม่มี QR (ยังไม่ได้ตั้งค่า PromptPay)</div>`;
  } catch (e) {
    container.innerHTML = `<div style="color:#ef4444;font-size:12px;text-align:center">${e.message}</div>`;
  }
}

/**
 * Preview slip image
 */
function previewPaySlip_(input) {
  const file = input.files[0];
  if (!file) return;
  const preview = document.getElementById('pay-slip-preview');
  const reader  = new FileReader();
  reader.onload = e => {
    preview.innerHTML = `<img src="${e.target.result}" style="max-width:100%;border-radius:8px;margin-top:8px">`;
    preview.classList.remove('hidden');
  };
  reader.readAsDataURL(file);
}

/**
 * ยืนยันรับเงิน
 */
async function submitPaymentConfirm_() {
  const billing = BILLING_UI.currentBilling;
  if (!billing) return;

  const method = document.getElementById('pay-confirm-method').value;
  const note   = document.getElementById('pay-confirm-note').value;
  const amount = billing.balance_due || billing.total_amount || 0;

  const btn = document.getElementById('btn-submit-payment');
  btn.disabled = true;
  btn.innerHTML = '<i class="bi bi-hourglass-split"></i> กำลังบันทึก...';

  try {
    const res = await callAPI('markBillingPaid', {
      job_id:         billing.job_id,
      amount_paid:    amount,
      payment_method: method,
      note,
      generate_receipt: true,
      paid_by:        APP.user?.username || 'PWA'
    });
    if (!res.success) throw new Error(res.error);

    showToast('🎉 บันทึกการรับเงินเรียบร้อย!');
    document.getElementById('modal-payment-confirm').classList.add('hidden');
    document.getElementById('modal-invoice-detail').classList.add('hidden');

    /* อัปเดต state */
    const idx = BILLING_UI.allBillings.findIndex(b => b.job_id === billing.job_id);
    if (idx >= 0) {
      BILLING_UI.allBillings[idx].payment_status = 'PAID';
      BILLING_UI.allBillings[idx].amount_paid    = amount;
      BILLING_UI.allBillings[idx].balance_due    = 0;
    }
    renderBillingList_();

    /* รีโหลด jobs ถ้ามี */
    if (typeof loadLiveData === 'function') loadLiveData();
  } catch (e) {
    showToast('❌ ' + e.message);
    btn.disabled = false;
    btn.innerHTML = '<i class="bi bi-check-circle"></i> ยืนยันรับเงิน';
  }
}

/* ══════════════════════════════════════════════════════════════
   Modal Builders
══════════════════════════════════════════════════════════════ */

/**
 * สร้าง Billing List Page section ใน page-billing
 */
function buildBillingListPage_() {
  const page = document.getElementById('page-billing');
  if (!page || document.getElementById('billing-list-content')) return;

  page.innerHTML = `
    <div class="page-header">
      <h5><i class="bi bi-receipt-cutoff" style="color:#3b82f6"></i> ใบเสร็จ / Billing</h5>
      <div class="search-bar-inline">
        <i class="bi bi-search"></i>
        <input type="text" id="billing-search" placeholder="ค้นหาชื่อ, Job ID..." oninput="">
      </div>
    </div>
    <div class="filter-tabs" id="billing-filter-tabs">
      <button class="filter-tab active" data-status="all">ทั้งหมด</button>
      <button class="filter-tab" data-status="UNPAID">ค้างชำระ</button>
      <button class="filter-tab" data-status="PAID">ชำระแล้ว</button>
      <button class="filter-tab" data-status="PARTIAL">บางส่วน</button>
    </div>
    <div id="billing-list-content"></div>`;

  /* bind filter tabs */
  document.getElementById('billing-filter-tabs').addEventListener('click', e => {
    const btn = e.target.closest('.filter-tab');
    if (btn) setBillingStatusFilter_(btn.dataset.status);
  });

  /* bind search */
  document.getElementById('billing-search').addEventListener('input', function () {
    setBillingSearch_(this.value);
  });
}

/**
 * สร้าง modal-invoice-detail
 */
function buildInvoiceDetailModal_() {
  if (document.getElementById('modal-invoice-detail')) return;
  const div = document.createElement('div');
  div.id = 'modal-invoice-detail';
  div.className = 'modal-overlay hidden';
  div.innerHTML = `
    <div class="modal-box modal-lg" role="dialog" aria-modal="true">
      <div class="modal-header">
        <h6>ใบเสร็จรับเงิน</h6>
        <button class="modal-close" id="btn-close-invoice-detail"><i class="bi bi-x-lg"></i></button>
      </div>
      <div class="modal-body" id="invoice-detail-body" style="max-height:70vh;overflow-y:auto"></div>
    </div>`;
  document.body.appendChild(div);
  div.addEventListener('click', e => { if (e.target === div) div.classList.add('hidden'); });
  document.getElementById('btn-close-invoice-detail').addEventListener('click', () => div.classList.add('hidden'));
}

/**
 * สร้าง modal-payment-confirm
 */
function buildPaymentConfirmModal_() {
  if (document.getElementById('modal-payment-confirm')) return;
  const div = document.createElement('div');
  div.id = 'modal-payment-confirm';
  div.className = 'modal-overlay hidden';
  div.innerHTML = `
    <div class="modal-box" role="dialog" aria-modal="true">
      <div class="modal-header">
        <h6>ยืนยันรับเงิน</h6>
        <button class="modal-close" id="btn-close-payment-confirm"><i class="bi bi-x-lg"></i></button>
      </div>
      <div class="modal-body" style="padding:16px">
        <div style="text-align:center;margin-bottom:16px">
          <div style="font-size:14px;color:#6b7280" id="pay-confirm-customer"></div>
          <div style="font-size:12px;color:#9ca3af" id="pay-confirm-jobid"></div>
          <div style="font-size:28px;font-weight:800;color:#111827;margin:8px 0" id="pay-confirm-amount"></div>
        </div>

        <!-- QR Section -->
        <div id="pay-qr-section" style="margin-bottom:16px;min-height:60px"></div>

        <!-- Payment method -->
        <div class="form-group">
          <label>วิธีชำระเงิน</label>
          <select id="pay-confirm-method" class="form-control">
            <option value="CASH">เงินสด</option>
            <option value="TRANSFER">โอนเงิน</option>
            <option value="PROMPTPAY">PromptPay</option>
            <option value="CREDIT_CARD">บัตรเครดิต</option>
          </select>
        </div>

        <!-- Slip upload -->
        <div class="form-group">
          <label>แนบสลิป (ถ้ามี)</label>
          <input type="file" id="pay-slip-input" accept="image/*" class="form-control">
          <div id="pay-slip-preview" class="hidden"></div>
        </div>

        <div class="form-group">
          <label>หมายเหตุ</label>
          <input type="text" id="pay-confirm-note" class="form-control" placeholder="หมายเหตุ...">
        </div>

        <button id="btn-submit-payment" class="btn-primary" style="width:100%">
          <i class="bi bi-check-circle"></i> ยืนยันรับเงิน
        </button>
      </div>
    </div>`;
  document.body.appendChild(div);

  div.addEventListener('click', e => { if (e.target === div) div.classList.add('hidden'); });
  document.getElementById('btn-close-payment-confirm').addEventListener('click', () => div.classList.add('hidden'));
  document.getElementById('btn-submit-payment').addEventListener('click', submitPaymentConfirm_);
  document.getElementById('pay-slip-input').addEventListener('change', function () { previewPaySlip_(this); });
}

/* ─── Keyboard: Escape ─────────────────────────────────────── */
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  ['modal-invoice-detail', 'modal-payment-confirm'].forEach(id => {
    const el = document.getElementById(id);
    if (el && !el.classList.contains('hidden')) el.classList.add('hidden');
  });
});

/* ─── Init ──────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  buildInvoiceDetailModal_();
  buildPaymentConfirmModal_();

  /* สร้าง page-billing ถ้ายังไม่มี */
  if (!document.getElementById('page-billing')) {
    const pages = document.getElementById('pages-container');
    if (pages) {
      const div = document.createElement('div');
      div.id = 'page-billing';
      div.className = 'page hidden';
      pages.appendChild(div);
    }
  }
  buildBillingListPage_();
});

/* ─── Hook เข้ากับ goPage ─────────────────────────────────── */
const _origGoPageBilling = typeof goPage === 'function' ? goPage : null;
function goPageWithBilling(page) {
  if (_origGoPageBilling) _origGoPageBilling(page);
  if (page === 'billing') {
    setTimeout(loadBillingListPage, 100);
  }
}
