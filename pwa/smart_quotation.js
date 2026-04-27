// ============================================================
// COMPHONE SMART QUOTATION — ระบบเปรียบเทียบราคากลาง
// Version: v5.9.0-phase2d (Phase 30)
// ============================================================
// เกณฑ์ราคากลางจาก Memory (อ้างอิงสำหรับจัดซื้อภาครัฐ)
// ============================================================

const GOV_PRICE_REF = {
  // คอมพิวเตอร์ ปี 2568 (รวม VAT 7%, 1yr warranty)
  'SERVER': { min: 130000, max: 780000, unit: 'เครื่อง', note: 'CPU 8-32 cores, RAM DDR4/DDR5, AI/GPU support' },
  'DESKTOP': { min: 24000, max: 26000, unit: 'เครื่อง', note: 'CPU 8-32 cores, RAM DDR4/DDR5' },
  'ALL_IN_ONE': { min: 26000, max: 26000, unit: 'เครื่อง', note: 'AIO PC, รวม VAT7%' },
  'LAPTOP': { min: 21000, max: 24000, unit: 'เครื่อง', note: 'โน็ตบุ๊ค, รวม VAT7%' },
  
  // CCTV ปี 2564 (สเปค 1920x1080+, 25-50fps, IR/ICR, 1/3" sensor)
  'CAMERA': { min: 3000, max: 61000, unit: 'ตัว', note: 'กล้องวงจรปิด, Low light 0.02-0.2 LUX' },
  'NVR': { min: 22000, max: 120000, unit: 'เครื่อง', note: 'Network Video Recorder' },
  'POE_SWITCH': { min: 8300, max: 15000, unit: 'ตัว', note: 'PoE Switch for CCTV' }
};

/**
 * หาเกณฑ์ราคากลางตามชื่อสินค้า
 * @param {string} productName - ชื่อสินค้า
 * @returns {object|null} - เกณฑ์ราคาหรือ null
 */
function findGovPriceRef(productName) {
  if (!productName) return null;
  const name = productName.toUpperCase();
  
  for (const key in GOV_PRICE_REF) {
    if (name.includes(key) || name.includes(key.replace('_', ' '))) {
      return { type: key, ...GOV_PRICE_REF[key] };
    }
  }
  return null;
}

/**
 * ตรวจสอบว่าราคาสินค้าอยู่ในเกณฑ์ราคากลางหรือไม่
 * @param {string} productName - ชื่อสินค้า
 * @param {number} price - ราคาที่ต้องการตรวจสอบ
 * @returns {object} - ผลการตรวจสอบ {status, message, reference}
 */
function checkPriceAgainstGovRef(productName, price) {
  const ref = findGovPriceRef(productName);
  if (!ref) {
    return { status: 'NO_REF', message: 'ไม่มีเกณฑ์ราคากลางสำหรับสินค้านี้', reference: null };
  }
  
  const numPrice = Number(price) || 0;
  if (numPrice < ref.min) {
    return {
      status: 'BELOW',
      message: `ราคาต่ำกว่าเกณฑ์ราคากลาง (ขั้นต่ำ ฿${ref.min.toLocaleString()})`,
      reference: ref,
      difference: ref.min - numPrice
    };
  }
  if (numPrice > ref.max) {
    return {
      status: 'ABOVE',
      message: `ราคาสูงกว่าเกณฑ์ราคากลาง (สูงสุด ฿${ref.max.toLocaleString()})`,
      reference: ref,
      difference: numPrice - ref.max
    };
  }
  return {
    status: 'WITHIN',
    message: `ราคาอยู่ในเกณฑ์ราคากลาง (฿${ref.min.toLocaleString()} - ฿${ref.max.toLocaleString()})`,
    reference: ref
  };
}

/**
 * สร้าง HTML สำหรับแสดงผลการเปรียบเทียบราคากลาง
 * @param {object} checkResult - ผลจาก checkPriceAgainstGovRef()
 * @returns {string} - HTML string
 */
function renderGovPriceComparison(checkResult) {
  if (!checkResult || checkResult.status === 'NO_REF') {
    return '<small class="text-muted">ไม่มีเกณฑ์ราคาอ้างอิง</small>';
  }
  
  let colorClass = 'text-success';
  if (checkResult.status === 'BELOW') colorClass = 'text-danger';
  if (checkResult.status === 'ABOVE') colorClass = 'text-warning';
  
  return `
    <div class="gov-price-compare mt-2 p-2 border-start border-3 ${colorClass.replace('text-', 'border-')}">
      <small class="${colorClass}">
        <i class="bi bi-clipboard-check"></i> ${checkResult.message}
      </small><br>
      <small class="text-muted">${checkResult.reference.note}</small>
    </div>
  `;
}

// Export functions (สำหรับใช้ใน pos.js)
if (typeof window !== 'undefined') {
  window.findGovPriceRef = findGovPriceRef;
  window.checkPriceAgainstGovRef = checkPriceAgainstGovRef;
  window.renderGovPriceComparison = renderGovPriceComparison;
  window.GOV_PRICE_REF = GOV_PRICE_REF;
}
