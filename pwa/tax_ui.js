/**
 * tax_ui.js — Tax Documents & Reports UI
 * Comphone SuperApp AI v5.5
 *
 * Components:
 *   1. Tax Panel — แสดงใน Billing Detail (ปุ่มออกใบกำกับภาษี + ภงด.)
 *   2. Tax Report Page — รายงานภาษีรายเดือน
 *   3. Tax Summary Card — สรุปภาษีบน Dashboard
 *
 * Rules:
 *   - ห้าม onclick inline — ใช้ addEventListener เท่านั้น
 *   - ทุก API call ผ่าน callAPI(action, payload)
 *   - canAccess('view_tax') ครอบทุก component
 *   - แสดงเฉพาะ role: admin, acct, exec
 */

// ══════════════════════════════════════════════════════════════
// Constants
// ══════════════════════════════════════════════════════════════

const TAX_MODES = {
  VAT7:    { label: 'มี VAT 7%',          color: 'bg-blue-100 text-blue-800' },
  ZERO:    { label: 'VAT 0% (ส่งออก)',    color: 'bg-green-100 text-green-800' },
  EXEMPT:  { label: 'ยกเว้น VAT',         color: 'bg-gray-100 text-gray-600' },
  MIXED:   { label: 'Mixed (บางรายการ)',  color: 'bg-amber-100 text-amber-800' }
};

// ══════════════════════════════════════════════════════════════
// 1. Tax Panel — ใช้ใน Billing Detail
// ══════════════════════════════════════════════════════════════

/**
 * สร้าง HTML ของ Tax Panel สำหรับแทรกใน Billing Detail
 * @param {Object} billing — billing object จาก API
 * @returns {string} HTML string
 */
function buildTaxPanel(billing) {
  if (!billing || !billing.billing_id) return '';

  const vatAmount = billing.vat_amount || 0;
  const whtAmount = billing.wht_amount || 0;
  const netPayable = billing.net_payable || billing.total_amount || 0;

  return `
    <div id="tax-panel-${billing.billing_id}" class="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3">
      <div class="flex items-center justify-between mb-2">
        <span class="font-medium text-blue-800 text-sm">🧾 ข้อมูลภาษี</span>
        <span class="text-xs text-blue-600">${billing.billing_id}</span>
      </div>
      <div class="grid grid-cols-3 gap-2 text-xs mb-3">
        <div class="text-center">
          <div class="text-gray-500">VAT</div>
          <div class="font-bold text-blue-700">฿${formatMoney(vatAmount)}</div>
        </div>
        <div class="text-center">
          <div class="text-gray-500">ภงด. (WHT)</div>
          <div class="font-bold text-orange-700">฿${formatMoney(whtAmount)}</div>
        </div>
        <div class="text-center">
          <div class="text-gray-500">ยอดสุทธิ</div>
          <div class="font-bold text-green-700">฿${formatMoney(netPayable)}</div>
        </div>
      </div>
      <div class="flex gap-2 flex-wrap">
        <button class="btn-tax-action flex-1 text-xs py-2 px-3 bg-white border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50 font-medium"
          data-action="tax-invoice" data-billing-id="${billing.billing_id}">
          📄 ออกใบกำกับภาษี
        </button>
        <button class="btn-tax-action flex-1 text-xs py-2 px-3 bg-white border border-orange-300 text-orange-700 rounded-lg hover:bg-orange-50 font-medium"
          data-action="wht-doc" data-billing-id="${billing.billing_id}">
          📋 ออก ภงด.
        </button>
      </div>
    </div>
  `;
}

/**
 * เพิ่ม Tax Panel ใน Billing Detail Modal
 * เรียกหลังจาก modal ถูก render แล้ว
 * @param {string} billingId
 * @param {Object} billing
 */
function injectTaxPanel(billingId, billing) {
  if (!canAccess('view_tax')) return;

  // หา container ใน billing detail modal
  const detailContainer = document.getElementById('billing-detail-content') ||
                          document.querySelector('[data-billing-id="' + billingId + '"]');
  if (!detailContainer) return;

  // ป้องกัน inject ซ้ำ
  if (document.getElementById('tax-panel-' + billingId)) return;

  detailContainer.insertAdjacentHTML('beforeend', buildTaxPanel(billing));

  // Event listeners สำหรับปุ่ม Tax
  detailContainer.querySelectorAll('.btn-tax-action').forEach(btn => {
    btn.addEventListener('click', async () => {
      const action = btn.dataset.action;
      const bId = btn.dataset.billingId;
      if (action === 'tax-invoice') await generateTaxInvoiceUI(bId);
      if (action === 'wht-doc') await generateWhtDocUI(bId);
    });
  });
}

/**
 * ออกใบกำกับภาษีอย่างย่อ
 * @param {string} billingId
 */
async function generateTaxInvoiceUI(billingId) {
  const btn = document.querySelector(`[data-action="tax-invoice"][data-billing-id="${billingId}"]`);
  if (btn) { btn.disabled = true; btn.textContent = 'กำลังสร้าง...'; }

  try {
    const result = await callAPI('generateTaxInvoice', { billing_id: billingId });
    showToast('✅ สร้างใบกำกับภาษีสำเร็จ');
    if (result.pdf_url) {
      openPdfLink(result.pdf_url, 'ใบกำกับภาษี ' + billingId);
    }
  } catch (err) {
    showToast(`❌ สร้างใบกำกับภาษีไม่สำเร็จ: ${err.message}`);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '📄 ออกใบกำกับภาษี'; }
  }
}

/**
 * ออกเอกสาร ภงด. (Withholding Tax)
 * @param {string} billingId
 */
async function generateWhtDocUI(billingId) {
  const btn = document.querySelector(`[data-action="wht-doc"][data-billing-id="${billingId}"]`);
  if (btn) { btn.disabled = true; btn.textContent = 'กำลังสร้าง...'; }

  try {
    const result = await callAPI('generateWhtDocument', { billing_id: billingId });
    showToast('✅ สร้างเอกสาร ภงด. สำเร็จ');
    if (result.pdf_url) {
      openPdfLink(result.pdf_url, 'ภงด. ' + billingId);
    }
  } catch (err) {
    showToast(`❌ สร้างเอกสาร ภงด. ไม่สำเร็จ: ${err.message}`);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '📋 ออก ภงด.'; }
  }
}

// ══════════════════════════════════════════════════════════════
// 2. Tax Report Page
// ══════════════════════════════════════════════════════════════

/**
 * แสดงหน้า Tax Report รายเดือน
 * @param {string} [period] — รูปแบบ YYYY-MM (default: เดือนปัจจุบัน)
 */
async function showTaxReportPage(period) {
  if (!canAccess('view_tax')) {
    showToast('⛔ ไม่มีสิทธิ์ดูรายงานภาษี');
    return;
  }

  const now = new Date();
  const defaultPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const currentPeriod = period || defaultPeriod;

  const container = document.getElementById('main-content') ||
                    document.getElementById('main-content-area');
  if (!container) return;

  container.innerHTML = `
    <div class="p-4">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-xl font-bold text-gray-800">🧾 รายงานภาษีรายเดือน</h2>
        <button id="btn-refresh-tax-report" class="btn-secondary text-sm">🔄 รีเฟรช</button>
      </div>

      <!-- Period Selector -->
      <div class="flex gap-2 mb-4 items-center">
        <label class="text-sm text-gray-600 font-medium">เดือน:</label>
        <input type="month" id="tax-report-period" class="input-field text-sm w-auto" value="${currentPeriod}">
        <button id="btn-load-tax-report" class="btn-primary text-sm">โหลด</button>
      </div>

      <!-- Summary Cards -->
      <div id="tax-summary-cards" class="grid grid-cols-2 gap-3 mb-4">
        <div class="bg-gray-50 rounded-lg p-3 text-center">
          <div class="text-xs text-gray-500">กำลังโหลด...</div>
        </div>
      </div>

      <!-- Detail Table -->
      <div class="overflow-x-auto rounded-lg border border-gray-200">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 text-gray-600">
            <tr>
              <th class="px-3 py-2 text-left">Billing ID</th>
              <th class="px-3 py-2 text-left">ลูกค้า</th>
              <th class="px-3 py-2 text-right">ยอดก่อนภาษี</th>
              <th class="px-3 py-2 text-right">VAT</th>
              <th class="px-3 py-2 text-right">ภงด.</th>
              <th class="px-3 py-2 text-right">ยอดสุทธิ</th>
              <th class="px-3 py-2 text-center">เอกสาร</th>
            </tr>
          </thead>
          <tbody id="tax-report-body">
            <tr><td colspan="7" class="text-center py-8 text-gray-400">กำลังโหลด...</td></tr>
          </tbody>
        </table>
      </div>

      <!-- Export Buttons -->
      <div class="flex gap-2 mt-4">
        <button id="btn-export-tax-pdf" class="btn-secondary text-sm">📄 Export PDF</button>
        <button id="btn-send-tax-reminder" class="btn-secondary text-sm">📱 ส่ง LINE แจ้งเตือน</button>
      </div>
    </div>
  `;

  // Event listeners
  document.getElementById('btn-refresh-tax-report').addEventListener('click', () => loadTaxReport());
  document.getElementById('btn-load-tax-report').addEventListener('click', () => loadTaxReport());
  document.getElementById('btn-export-tax-pdf').addEventListener('click', () => exportTaxReportPdf());
  document.getElementById('btn-send-tax-reminder').addEventListener('click', () => sendTaxReminderNow());

  await loadTaxReport();
}

/**
 * โหลดข้อมูล Tax Report จาก API
 */
async function loadTaxReport() {
  const period = document.getElementById('tax-report-period')?.value || '';
  const tbody = document.getElementById('tax-report-body');
  const summaryCards = document.getElementById('tax-summary-cards');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="7" class="text-center py-8 text-gray-400">กำลังโหลด...</td></tr>';

  try {
    const data = await callAPI('taxAction', { sub: 'report', period });
    const records = data.records || [];
    const summary = data.summary || {};

    // Summary Cards
    if (summaryCards) {
      summaryCards.innerHTML = `
        <div class="bg-blue-50 rounded-lg p-3 text-center">
          <div class="text-xs text-gray-500 mb-1">รายได้รวม</div>
          <div class="text-lg font-bold text-blue-700">฿${formatMoney(summary.total_revenue || 0)}</div>
        </div>
        <div class="bg-green-50 rounded-lg p-3 text-center">
          <div class="text-xs text-gray-500 mb-1">VAT รวม</div>
          <div class="text-lg font-bold text-green-700">฿${formatMoney(summary.total_vat || 0)}</div>
        </div>
        <div class="bg-orange-50 rounded-lg p-3 text-center">
          <div class="text-xs text-gray-500 mb-1">ภงด. รวม</div>
          <div class="text-lg font-bold text-orange-700">฿${formatMoney(summary.total_wht || 0)}</div>
        </div>
        <div class="bg-purple-50 rounded-lg p-3 text-center">
          <div class="text-xs text-gray-500 mb-1">ยอดสุทธิรวม</div>
          <div class="text-lg font-bold text-purple-700">฿${formatMoney(summary.total_net || 0)}</div>
        </div>
      `;
    }

    if (records.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center py-8 text-gray-400">ไม่พบข้อมูลภาษีในช่วงนี้</td></tr>';
      return;
    }

    tbody.innerHTML = records.map(r => `
      <tr class="border-t border-gray-100 hover:bg-gray-50">
        <td class="px-3 py-2 font-mono text-blue-600 text-xs">${r.billing_id || '-'}</td>
        <td class="px-3 py-2 text-sm">${escapeHtmlTax(r.customer_name || '-')}</td>
        <td class="px-3 py-2 text-right text-sm">฿${formatMoney(r.subtotal || 0)}</td>
        <td class="px-3 py-2 text-right text-sm text-blue-600">฿${formatMoney(r.vat_amount || 0)}</td>
        <td class="px-3 py-2 text-right text-sm text-orange-600">฿${formatMoney(r.wht_amount || 0)}</td>
        <td class="px-3 py-2 text-right text-sm font-medium">฿${formatMoney(r.net_payable || 0)}</td>
        <td class="px-3 py-2 text-center">
          <button class="text-xs text-blue-500 hover:text-blue-700 mr-1"
            data-action="tax-invoice" data-billing-id="${r.billing_id}">📄</button>
          <button class="text-xs text-orange-500 hover:text-orange-700"
            data-action="wht-doc" data-billing-id="${r.billing_id}">📋</button>
        </td>
      </tr>
    `).join('');

    // Event delegation สำหรับปุ่ม document
    tbody.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const action = btn.dataset.action;
        const bId = btn.dataset.billingId;
        if (action === 'tax-invoice') await generateTaxInvoiceUI(bId);
        if (action === 'wht-doc') await generateWhtDocUI(bId);
      });
    });

  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-8 text-red-500">เกิดข้อผิดพลาด: ${escapeHtmlTax(err.message)}</td></tr>`;
    showToast('❌ โหลดรายงานภาษีไม่สำเร็จ');
  }
}

/**
 * Export Tax Report เป็น PDF
 */
async function exportTaxReportPdf() {
  const period = document.getElementById('tax-report-period')?.value || '';
  try {
    const result = await callAPI('generateTaxInvoice', { period, type: 'monthly_report' });
    if (result.pdf_url) openPdfLink(result.pdf_url, 'รายงานภาษี ' + period);
    else showToast('✅ ส่งรายงานไปยัง Google Drive แล้ว');
  } catch (err) {
    showToast(`❌ Export PDF ไม่สำเร็จ: ${err.message}`);
  }
}

/**
 * ส่ง Tax Reminder ทาง LINE ทันที
 */
async function sendTaxReminderNow() {
  try {
    await callAPI('getTaxReminder', { force: true });
    showToast('✅ ส่งแจ้งเตือนภาษีทาง LINE สำเร็จ');
  } catch (err) {
    showToast(`❌ ส่งแจ้งเตือนไม่สำเร็จ: ${err.message}`);
  }
}

// ══════════════════════════════════════════════════════════════
// 3. Tax Summary Card สำหรับ Dashboard
// ══════════════════════════════════════════════════════════════

/**
 * โหลดและแสดง Tax Summary Card บน Dashboard
 * @param {string} containerId — ID ของ container ที่จะแทรก card
 */
async function loadTaxSummaryCard(containerId) {
  if (!canAccess('view_tax')) return;

  const container = document.getElementById(containerId);
  if (!container) return;

  try {
    const now = new Date();
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const data = await callAPI('taxAction', { sub: 'report', period });
    const summary = data.summary || {};

    const cardHtml = `
      <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4 cursor-pointer hover:shadow-md transition-shadow"
        id="tax-summary-card">
        <div class="flex items-center justify-between mb-3">
          <span class="font-bold text-gray-800">🧾 ภาษีเดือนนี้</span>
          <span class="text-xs text-gray-400">${period}</span>
        </div>
        <div class="grid grid-cols-3 gap-2 text-center text-xs">
          <div>
            <div class="text-gray-500">VAT</div>
            <div class="font-bold text-blue-600">฿${formatMoney(summary.total_vat || 0)}</div>
          </div>
          <div>
            <div class="text-gray-500">ภงด.</div>
            <div class="font-bold text-orange-600">฿${formatMoney(summary.total_wht || 0)}</div>
          </div>
          <div>
            <div class="text-gray-500">รายได้สุทธิ</div>
            <div class="font-bold text-green-600">฿${formatMoney(summary.total_net || 0)}</div>
          </div>
        </div>
        <div class="mt-2 text-xs text-center text-blue-500 underline">ดูรายงานเต็ม →</div>
      </div>
    `;

    container.innerHTML = cardHtml;
    document.getElementById('tax-summary-card')?.addEventListener('click', () => showTaxReportPage());

  } catch (err) {
    // Silent fail — card ไม่ใช่ feature หลัก
    console.warn('[loadTaxSummaryCard]', err.message);
  }
}

// ══════════════════════════════════════════════════════════════
// Helpers
// ══════════════════════════════════════════════════════════════

/**
 * เปิด PDF ใน tab ใหม่ พร้อม fallback toast
 * @param {string} url
 * @param {string} label
 */
function openPdfLink(url, label) {
  try {
    window.open(url, '_blank', 'noopener,noreferrer');
  } catch {
    showToast(`📄 ${label}: ${url}`);
  }
}

/**
 * Format ตัวเลขเป็น Thai currency
 * @param {number} value
 * @returns {string}
 */
function formatMoney(value) {
  const num = parseFloat(value) || 0;
  return num.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Escape HTML เพื่อป้องกัน XSS
 * @param {string} str
 * @returns {string}
 */
function escapeHtmlTax(str) {
  if (typeof str !== 'string') return String(str || '');
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ══════════════════════════════════════════════════════════════
// Export
// ══════════════════════════════════════════════════════════════

if (typeof window !== 'undefined') {
  window.showTaxReportPage = showTaxReportPage;
  window.buildTaxPanel = buildTaxPanel;
  window.injectTaxPanel = injectTaxPanel;
  window.loadTaxSummaryCard = loadTaxSummaryCard;
  window.generateTaxInvoiceUI = generateTaxInvoiceUI;
  window.generateWhtDocUI = generateWhtDocUI;
}
