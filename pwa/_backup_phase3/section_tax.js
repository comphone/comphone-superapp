// ============================================================
// TAX CALCULATOR — VAT 7% + WHT 1/3/5% (PHASE 27.6)
// ============================================================
function _showTaxCalculator() {
  const m = `<div id="tax-modal-overlay" onclick="this.remove()" style="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center">
    <div onclick="event.stopPropagation()" style="background:#fff;border-radius:16px;padding:24px;max-width:480px;width:90%;max-height:80vh;overflow-y:auto">
      <h3 style="margin:0 0 16px;font-size:16px"><i class="bi bi-calculator" style="color:#059669"></i> คำนวณภาษี (VAT + WHT)</h3>

      <!-- Input -->
      <div style="margin-bottom:12px">
        <label style="font-size:12px;color:#6b7280">จำนวนเงิน (ก่อน VAT)</label>
        <input type="number" id="tax-amount" value="0" min="0" step="0.01"
          style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;font-size:16px;font-weight:700"
          oninput="_calcTax()">
      </div>

      <div style="display:flex;gap:12px;margin-bottom:16px">
        <div style="flex:1">
          <label style="font-size:12px;color:#6b7280">โหมด VAT</label>
          <select id="tax-vat-mode" style="width:100%;padding:8px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px" onchange="_calcTax()">
            <option value="VAT7">VAT 7%</option>
            <option value="ZERO">VAT 0% (ส่งออก)</option>
            <option value="EXEMPT">ไม่มี VAT (ยกเว้น)</option>
          </select>
        </div>
        <div style="flex:1">
          <label style="font-size:12px;color:#6b7280">หัก ณ ที่จ่าย (WHT)</label>
          <select id="tax-wht-rate" style="width:100%;padding:8px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px" onchange="_calcTax()">
            <option value="0">ไม่หัก</option>
            <option value="1">1%</option>
            <option value="3">3%</option>
            <option value="5">5%</option>
          </select>
        </div>
      </div>

      <!-- Results -->
      <div id="tax-results" style="background:#f8fafc;border-radius:12px;padding:16px">
        <table style="width:100%;font-size:13px">
          <tr><td style="color:#6b7280;padding:4px 0">จำนวนเงิน (ก่อน VAT)</td><td style="text-align:right;font-weight:600" id="tax-subtotal">฿0.00</td></tr>
          <tr><td style="color:#6b7280;padding:4px 0">VAT</td><td style="text-align:right;font-weight:600;color:#1e40af" id="tax-vat-label">0%</td></tr>
          <tr><td style="color:#6b7280;padding:4px 0">จำนวน VAT</td><td style="text-align:right;font-weight:600;color:#1e40af" id="tax-vat-amount">฿0.00</td></tr>
          <tr style="border-top:1px solid #e2e8f0"><td style="padding:8px 0;font-weight:600">รวม (รวม VAT)</td><td style="text-align:right;font-weight:700;font-size:15px" id="tax-total">฿0.00</td></tr>
          <tr><td style="color:#6b7280;padding:4px 0">หัก ณ ที่จ่าย</td><td style="text-align:right;font-weight:600;color:#ef4444" id="tax-wht-label">0%</td></tr>
          <tr><td style="color:#6b7280;padding:4px 0">จำนวน WHT</td><td style="text-align:right;font-weight:600;color:#ef4444" id="tax-wht-amount">฿0.00</td></tr>
          <tr style="border-top:2px solid #1e40af"><td style="padding:8px 0;font-weight:700;font-size:14px">💰 ยอดสุทธิ (Net Payable)</td><td style="text-align:right;font-weight:700;font-size:18px;color:#059669" id="tax-net">฿0.00</td></tr>
        </table>
      </div>

      <!-- Copy button -->
      <div style="margin-top:12px;display:flex;gap:8px;justify-content:flex-end">
        <button onclick="_copyTaxResult()" style="background:#f1f5f9;border:1px solid #e2e8f0;padding:8px 16px;border-radius:8px;font-size:12px;cursor:pointer">
          <i class="bi bi-clipboard"></i> Copy
        </button>
        <button onclick="document.getElementById('tax-modal-overlay').remove()" style="background:#1e40af;color:#fff;border:none;padding:8px 16px;border-radius:8px;font-size:12px;cursor:pointer">
          ปิด
        </button>
      </div>
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend', m);
  _calcTax();
}

function _calcTax() {
  const amount = parseFloat(document.getElementById('tax-amount')?.value) || 0;
  const vatMode = document.getElementById('tax-vat-mode')?.value || 'VAT7';
  const whtRate = parseInt(document.getElementById('tax-wht-rate')?.value) || 0;

  // VAT calculation
  let vatPercent = 0;
  if (vatMode === 'VAT7') vatPercent = 7;
  else if (vatMode === 'ZERO') vatPercent = 0;
  // EXEMPT = 0

  const vatAmount = amount * vatPercent / 100;
  const totalWithVat = amount + vatAmount;

  // WHT calculation (on original amount, not including VAT)
  const whtAmount = amount * whtRate / 100;
  const netPayable = totalWithVat - whtAmount;

  // Update UI
  const el = (id) => document.getElementById(id);
  if(el('tax-subtotal')) el('tax-subtotal').textContent = '฿' + amount.toLocaleString('th-TH', {minimumFractionDigits:2});
  if(el('tax-vat-label')) el('tax-vat-label').textContent = vatPercent + '%';
  if(el('tax-vat-amount')) el('tax-vat-amount').textContent = '฿' + vatAmount.toLocaleString('th-TH', {minimumFractionDigits:2});
  if(el('tax-total')) el('tax-total').textContent = '฿' + totalWithVat.toLocaleString('th-TH', {minimumFractionDigits:2});
  if(el('tax-wht-label')) el('tax-wht-label').textContent = whtRate + '%';
  if(el('tax-wht-amount')) el('tax-wht-amount').textContent = '฿' + whtAmount.toLocaleString('th-TH', {minimumFractionDigits:2});
  if(el('tax-net')) el('tax-net').textContent = '฿' + netPayable.toLocaleString('th-TH', {minimumFractionDigits:2});
}

function _copyTaxResult() {
  const amount = parseFloat(document.getElementById('tax-amount')?.value) || 0;
  const vatMode = document.getElementById('tax-vat-mode')?.value || 'VAT7';
  const whtRate = document.getElementById('tax-wht-rate')?.value || '0';
  const net = document.getElementById('tax-net')?.textContent || '';
  const text = `🧮 คำนวณภาษี\nจำนวน: ฿${amount.toLocaleString()}\nVAT: ${vatMode}\nWHT: ${whtRate}%\nสุทธิ: ${net}`;
  navigator.clipboard.writeText(text).then(() => {
    const btn = event.target;
    btn.textContent = '✅ Copied!';
    setTimeout(() => { btn.innerHTML = '<i class="bi bi-clipboard"></i> Copy'; }, 1500);
  });
}

function renderTaxSection() {
  setActiveNav('tax');
  document.getElementById('topbar-title').innerHTML =
    '<i class="bi bi-receipt-cutoff" style="color:#059669;margin-right:8px"></i>คำนวณภาษี (VAT / WHT)';

  document.getElementById('main-content').innerHTML = `
    <div class="card-box" style="max-width:640px;margin:0 auto">
      <div class="card-title"><i class="bi bi-calculator" style="color:#059669"></i> คำนวณภาษีมูลค่าเพิ่ม + หัก ณ ที่จ่าย</div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
        <div>
          <label style="font-size:12px;color:#6b7280;display:block;margin-bottom:4px">จำนวนเงิน (ก่อน VAT)</label>
          <input type="number" id="tax-page-amount" value="0" min="0" step="0.01"
            style="width:100%;padding:10px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:16px;font-weight:600;box-sizing:border-box"
            oninput="_calcTaxPage()">
        </div>
        <div>
          <label style="font-size:12px;color:#6b7280;display:block;margin-bottom:4px">โหมด VAT</label>
          <select id="tax-page-vat" style="width:100%;padding:10px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:14px;box-sizing:border-box" onchange="_calcTaxPage()">
            <option value="VAT7">VAT 7% (ขายในประเทศ)</option>
            <option value="ZERO">VAT 0% (ส่งออก)</option>
            <option value="EXEMPT">ไม่มี VAT (ยกเว้น)</option>
          </select>
        </div>
      </div>

      <div style="margin-bottom:16px">
        <label style="font-size:12px;color:#6b7280;display:block;margin-bottom:4px">อัตรา WHT (หัก ณ ที่จ่าย)</label>
        <select id="tax-page-wht" style="width:100%;padding:10px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:14px;box-sizing:border-box" onchange="_calcTaxPage()">
          <option value="0">ไม่หัก ณ ที่จ่าย</option>
          <option value="1">WHT 1% (ค่าขนส่ง)</option>
          <option value="3">WHT 3% (ค่าบริการ)</option>
          <option value="5">WHT 5% (ค่าโฆษณา/ค่าเช่า)</option>
        </select>
      </div>

      <!-- Results -->
      <div id="tax-page-results" style="background:linear-gradient(135deg,#f0fdf4,#ecfdf5);border:1.5px solid #bbf7d0;border-radius:12px;padding:20px">
        <table style="width:100%;font-size:14px;border-collapse:collapse">
          <tr style="border-bottom:1px solid #d1fae5">
            <td style="padding:8px 0;color:#6b7280">จำนวนเงิน (ก่อน VAT)</td>
            <td style="text-align:right;font-weight:600;padding:8px 0" id="tp-subtotal">฿0.00</td>
          </tr>
          <tr style="border-bottom:1px solid #d1fae5">
            <td style="padding:8px 0;color:#6b7280">VAT <span id="tp-vat-pct">7</span>%</td>
            <td style="text-align:right;font-weight:600;color:#059669;padding:8px 0" id="tp-vat">฿0.00</td>
          </tr>
          <tr style="border-bottom:1px solid #d1fae5">
            <td style="padding:8px 0;color:#6b7280;font-weight:700">รวม (รวม VAT)</td>
            <td style="text-align:right;font-weight:700;font-size:16px;padding:8px 0" id="tp-total">฿0.00</td>
          </tr>
          <tr style="border-bottom:1px solid #d1fae5">
            <td style="padding:8px 0;color:#6b7280">หัก ณ ที่จ่าย <span id="tp-wht-pct">0</span>%</td>
            <td style="text-align:right;font-weight:600;color:#ef4444;padding:8px 0" id="tp-wht">-฿0.00</td>
          </tr>
          <tr>
            <td style="padding:12px 0 0;font-weight:800;font-size:16px">💰 ยอดสุทธิ</td>
            <td style="text-align:right;font-weight:800;font-size:20px;color:#059669;padding:12px 0 0" id="tp-net">฿0.00</td>
          </tr>
        </table>
      </div>

      <div style="display:flex;gap:8px;margin-top:16px;justify-content:flex-end">
        <button onclick="_copyTaxPage()" style="background:#f1f5f9;color:#334155;border:none;padding:8px 16px;border-radius:8px;font-size:12px;cursor:pointer">
          <i class="bi bi-clipboard"></i> Copy
        </button>
        <button onclick="document.getElementById('tax-page-amount').value=0;_calcTaxPage()" style="background:#fee2e2;color:#ef4444;border:none;padding:8px 16px;border-radius:8px;font-size:12px;cursor:pointer">
          <i class="bi bi-x-circle"></i> ล้าง
        </button>
      </div>
    </div>
  `;
  _calcTaxPage();
}

function _calcTaxPage() {
  const amount = parseFloat(document.getElementById('tax-page-amount')?.value) || 0;
  const vatMode = document.getElementById('tax-page-vat')?.value || 'VAT7';
  const whtRate = parseInt(document.getElementById('tax-page-wht')?.value) || 0;
  let vatPct = vatMode === 'VAT7' ? 7 : 0;
  const vat = amount * vatPct / 100;
  const total = amount + vat;
  const wht = amount * whtRate / 100;
  const net = total - wht;
  const fmt = (v) => '฿' + v.toLocaleString('th-TH', {minimumFractionDigits:2});
  document.getElementById('tp-subtotal').textContent = fmt(amount);
  document.getElementById('tp-vat-pct').textContent = vatPct;
  document.getElementById('tp-vat').textContent = fmt(vat);
  document.getElementById('tp-total').textContent = fmt(total);
  document.getElementById('tp-wht-pct').textContent = whtRate;
  document.getElementById('tp-wht').textContent = '-' + fmt(wht);
  document.getElementById('tp-net').textContent = fmt(net);
}

function _copyTaxPage() {
  const amount = document.getElementById('tax-page-amount')?.value || '0';
  const vatMode = document.getElementById('tax-page-vat')?.value || 'VAT7';
  const whtRate = document.getElementById('tax-page-wht')?.value || '0';
  const net = document.getElementById('tp-net')?.textContent || '';
  const text = `🧮 คำนวณภาษี\\nจำนวน: ฿${parseFloat(amount).toLocaleString()}\\nVAT: ${vatMode}\\nWHT: ${whtRate}%\\nสุทธิ: ${net}`;
  navigator.clipboard.writeText(text).then(() => {
    const btn = event.target;
    btn.textContent = '✅ Copied!';
    setTimeout(() => { btn.innerHTML = '<i class="bi bi-clipboard"></i> Copy'; }, 1500);
  });
}
