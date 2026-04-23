// ============================================================
// COMPHONE SUPER APP V5.5
// inventory_ui.js — Barcode Scanner UI + Stock Transfer + Reorder Alert
// Version: 5.6.0
// ============================================================
// ฟีเจอร์:
//   1a. openBarcodeScanner()    — เปิดกล้อง + jsQR scan loop
//   1b. openStockTransferModal() — โอนสต็อกระหว่าง location
//   1c. renderReorderBanner()   — แสดง banner สินค้าใกล้หมด
//   1d. openAddInventoryForm()  — form เพิ่มสินค้าใหม่ (full)
// ============================================================
// กฎ: ห้าม onclick inline, ทุก API ผ่าน callAPI(), modal ปิดด้วย Escape
// ============================================================

'use strict';

// ============================================================
// STATE
// ============================================================
const INV_UI = {
  scannerStream:  null,   // MediaStream ปัจจุบัน
  scannerActive:  false,  // กำลัง scan อยู่หรือไม่
  scannerRafId:   null,   // requestAnimationFrame ID
  lastScannedCode: null,  // barcode ล่าสุดที่ scan ได้
  transferItem:   null,   // item ที่กำลัง transfer
  reorderItems:   [],     // รายการสินค้าที่ต้อง reorder
};

// ============================================================
// 1a. BARCODE SCANNER MODAL
// ============================================================
/**
 * เปิด Barcode Scanner Modal
 * ใช้ jsQR จาก CDN + getUserMedia
 * @param {Function} onDetect - callback(barcode) เมื่อ detect ได้
 */
function openBarcodeScanner(onDetect) {
  _ensureScannerModal_();
  const modal = document.getElementById('modal-barcode-scanner');
  if (!modal) return;

  INV_UI.scannerOnDetect = onDetect || null;
  INV_UI.lastScannedCode = null;

  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');

  // โหลด jsQR จาก CDN ถ้ายังไม่ได้โหลด
  _loadJsQR_().then(() => {
    _startCamera_();
  }).catch(err => {
    _showScannerFallback_(err.message);
  });
}

/**
 * ปิด Barcode Scanner และหยุดกล้อง
 */
function closeBarcodeScanner() {
  _stopCamera_();
  const modal = document.getElementById('modal-barcode-scanner');
  if (modal) {
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
  }
}

/**
 * โหลด jsQR จาก CDN (lazy load)
 * @return {Promise}
 */
function _loadJsQR_() {
  return new Promise((resolve, reject) => {
    if (typeof jsQR !== 'undefined') { resolve(); return; }
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js';
    script.onload  = resolve;
    script.onerror = () => reject(new Error('ไม่สามารถโหลด jsQR ได้'));
    document.head.appendChild(script);
  });
}

/**
 * เริ่มกล้องและ scan loop
 */
async function _startCamera_() {
  const video   = document.getElementById('scanner-video');
  const canvas  = document.getElementById('scanner-canvas');
  const status  = document.getElementById('scanner-status');

  if (!video || !canvas) return;

  // ตรวจสอบ browser support
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    _showScannerFallback_('เบราว์เซอร์ไม่รองรับกล้อง');
    return;
  }

  try {
    if (status) status.textContent = 'กำลังเปิดกล้อง...';

    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
    });

    INV_UI.scannerStream = stream;
    INV_UI.scannerActive = true;

    video.srcObject = stream;
    video.setAttribute('playsinline', true);
    await video.play();

    if (status) status.textContent = 'กำลังสแกน... ชี้กล้องไปที่บาร์โค้ด';

    // เริ่ม scan loop
    _scanLoop_(video, canvas);

  } catch (err) {
    if (err.name === 'NotAllowedError') {
      _showScannerFallback_('ไม่ได้รับอนุญาตใช้กล้อง');
    } else if (err.name === 'NotFoundError') {
      _showScannerFallback_('ไม่พบกล้องในอุปกรณ์');
    } else {
      _showScannerFallback_(err.message);
    }
  }
}

/**
 * Scan loop ด้วย requestAnimationFrame
 */
function _scanLoop_(video, canvas) {
  if (!INV_UI.scannerActive) return;

  const ctx = canvas.getContext('2d');

  function tick() {
    if (!INV_UI.scannerActive) return;

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width  = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert'
      });

      if (code && code.data && code.data !== INV_UI.lastScannedCode) {
        INV_UI.lastScannedCode = code.data;
        _onBarcodeDetected_(code.data);
        return; // หยุด loop ชั่วคราว รอ user action
      }
    }

    INV_UI.scannerRafId = requestAnimationFrame(tick);
  }

  INV_UI.scannerRafId = requestAnimationFrame(tick);
}

/**
 * เมื่อ detect barcode สำเร็จ
 * @param {string} barcode
 */
async function _onBarcodeDetected_(barcode) {
  const status = document.getElementById('scanner-status');
  if (status) status.textContent = `พบบาร์โค้ด: ${barcode} — กำลังค้นหา...`;

  // เสียง feedback (ถ้ามี)
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    osc.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  } catch (_) { /* ไม่มีเสียงก็ไม่เป็นไร */ }

  try {
    const result = await callAPI('barcodeLookup', { barcode });
    _renderScanResult_(barcode, result);
  } catch (err) {
    if (status) status.textContent = `เกิดข้อผิดพลาด: ${err.message}`;
    showToast(`เกิดข้อผิดพลาด: ${err.message}`);
  }
}

/**
 * แสดงผลลัพธ์การ scan
 */
function _renderScanResult_(barcode, result) {
  const resultDiv = document.getElementById('scanner-result');
  const status    = document.getElementById('scanner-status');

  if (!resultDiv) return;

  if (!result || !result.success || !result.item) {
    resultDiv.innerHTML = `
      <div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:12px;margin-top:8px">
        <div style="font-weight:600;color:#dc2626">ไม่พบสินค้า</div>
        <div style="font-size:12px;color:#6b7280;margin-top:4px">บาร์โค้ด: ${barcode}</div>
        <button id="scan-add-new-btn" style="margin-top:8px;padding:6px 12px;background:#3b82f6;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:13px">
          + เพิ่มสินค้าใหม่
        </button>
      </div>`;

    document.getElementById('scan-add-new-btn')
      .addEventListener('click', () => {
        closeBarcodeScanner();
        openAddInventoryForm(barcode);
      });

    if (status) status.textContent = 'ไม่พบสินค้า — กดเพื่อเพิ่มใหม่';
    return;
  }

  const item = result.item;
  const isLow = (item.qty || 0) <= (item.min_qty || item.reorder_point || 5);

  resultDiv.innerHTML = `
    <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:12px;margin-top:8px">
      <div style="font-weight:700;font-size:16px;color:#166534">${item.item_name || item.name || '-'}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:8px;font-size:13px">
        <div><span style="color:#6b7280">รหัส:</span> ${item.item_code || barcode}</div>
        <div><span style="color:#6b7280">หมวด:</span> ${item.category || '-'}</div>
        <div><span style="color:#6b7280">จำนวน:</span>
          <span style="font-weight:700;color:${isLow ? '#dc2626' : '#166534'}">${item.qty || 0} ${item.unit || 'ชิ้น'}</span>
          ${isLow ? '<span style="color:#dc2626;font-size:11px"> ⚠️ ใกล้หมด</span>' : ''}
        </div>
        <div><span style="color:#6b7280">Location:</span> ${item.location || '-'}</div>
        <div><span style="color:#6b7280">ราคาทุน:</span> ฿${_fmt_(item.cost_price || 0)}</div>
        <div><span style="color:#6b7280">ราคาขาย:</span> ฿${_fmt_(item.sell_price || item.price || 0)}</div>
      </div>
      <div style="display:flex;gap:8px;margin-top:10px">
        <button id="scan-transfer-btn" data-code="${item.item_code || barcode}"
          style="flex:1;padding:8px;background:#3b82f6;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:13px">
          โอนสต็อก
        </button>
        <button id="scan-rescan-btn"
          style="flex:1;padding:8px;background:#6b7280;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:13px">
          สแกนใหม่
        </button>
      </div>
    </div>`;

  document.getElementById('scan-transfer-btn')
    .addEventListener('click', () => {
      closeBarcodeScanner();
      openStockTransferModal(item);
    });

  document.getElementById('scan-rescan-btn')
    .addEventListener('click', () => {
      resultDiv.innerHTML = '';
      INV_UI.lastScannedCode = null;
      INV_UI.scannerRafId = requestAnimationFrame(() => _scanLoop_(
        document.getElementById('scanner-video'),
        document.getElementById('scanner-canvas')
      ));
      if (status) status.textContent = 'กำลังสแกน... ชี้กล้องไปที่บาร์โค้ด';
    });

  if (status) status.textContent = `พบสินค้า: ${item.item_name}`;

  // เรียก callback ถ้ามี
  if (typeof INV_UI.scannerOnDetect === 'function') {
    INV_UI.scannerOnDetect(barcode, item);
  }
}

/**
 * Fallback เป็น input text เมื่อกล้องไม่ได้
 */
function _showScannerFallback_(reason) {
  const videoWrap = document.getElementById('scanner-video-wrap');
  const fallback  = document.getElementById('scanner-fallback');
  if (videoWrap) videoWrap.style.display = 'none';
  if (fallback)  fallback.style.display  = '';

  const status = document.getElementById('scanner-status');
  if (status) status.textContent = `ใช้กล้องไม่ได้ (${reason}) — พิมพ์บาร์โค้ดแทน`;
}

/**
 * หยุดกล้องและ scan loop
 */
function _stopCamera_() {
  INV_UI.scannerActive = false;
  if (INV_UI.scannerRafId) {
    cancelAnimationFrame(INV_UI.scannerRafId);
    INV_UI.scannerRafId = null;
  }
  if (INV_UI.scannerStream) {
    INV_UI.scannerStream.getTracks().forEach(t => t.stop());
    INV_UI.scannerStream = null;
  }
  const video = document.getElementById('scanner-video');
  if (video) { video.srcObject = null; }
}

/**
 * สร้าง scanner modal ถ้ายังไม่มี
 */
function _ensureScannerModal_() {
  if (document.getElementById('modal-barcode-scanner')) return;

  const modal = document.createElement('div');
  modal.id = 'modal-barcode-scanner';
  modal.className = 'modal-overlay hidden';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-label', 'Barcode Scanner');
  modal.innerHTML = `
    <div class="modal-box" style="max-width:420px;width:95%">
      <div class="modal-header">
        <h3 style="margin:0;font-size:16px">📷 สแกนบาร์โค้ด</h3>
        <button id="scanner-close-btn" class="modal-close-btn" aria-label="ปิด">&times;</button>
      </div>
      <div class="modal-body" style="padding:12px">
        <div id="scanner-status" style="font-size:13px;color:#6b7280;margin-bottom:8px;text-align:center">
          กำลังเตรียมกล้อง...
        </div>
        <div id="scanner-video-wrap" style="position:relative;background:#000;border-radius:8px;overflow:hidden;aspect-ratio:4/3">
          <video id="scanner-video" style="width:100%;height:100%;object-fit:cover" muted playsinline></video>
          <canvas id="scanner-canvas" style="display:none"></canvas>
          <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none">
            <div style="width:60%;height:60%;border:2px solid #22c55e;border-radius:8px;box-shadow:0 0 0 9999px rgba(0,0,0,0.4)"></div>
          </div>
        </div>
        <div id="scanner-fallback" style="display:none;margin-top:12px">
          <label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px">พิมพ์บาร์โค้ด:</label>
          <div style="display:flex;gap:8px">
            <input id="scanner-manual-input" type="text" placeholder="กรอกบาร์โค้ด..."
              style="flex:1;padding:8px 12px;border:1px solid #d1d5db;border-radius:6px;font-size:14px">
            <button id="scanner-manual-btn"
              style="padding:8px 16px;background:#3b82f6;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:13px">
              ค้นหา
            </button>
          </div>
        </div>
        <div id="scanner-result"></div>
      </div>
    </div>`;

  document.body.appendChild(modal);

  // Event listeners
  document.getElementById('scanner-close-btn')
    .addEventListener('click', closeBarcodeScanner);

  modal.addEventListener('click', e => {
    if (e.target === modal) closeBarcodeScanner();
  });

  document.getElementById('scanner-manual-btn')
    .addEventListener('click', () => {
      const val = document.getElementById('scanner-manual-input').value.trim();
      if (val) _onBarcodeDetected_(val);
    });

  document.getElementById('scanner-manual-input')
    .addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        const val = e.target.value.trim();
        if (val) _onBarcodeDetected_(val);
      }
    });

  // Escape key
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !document.getElementById('modal-barcode-scanner').classList.contains('hidden')) {
      closeBarcodeScanner();
    }
  });
}

// ============================================================
// 1b. STOCK TRANSFER MODAL
// ============================================================
/**
 * เปิด Stock Transfer Modal
 * @param {Object} item - inventory item object
 */
function openStockTransferModal(item) {
  INV_UI.transferItem = item;
  _ensureTransferModal_();

  const modal = document.getElementById('modal-stock-transfer');
  if (!modal) return;

  // Reset form
  const form = document.getElementById('transfer-form');
  if (form) form.reset();

  // แสดงข้อมูลสินค้า
  const itemInfo = document.getElementById('transfer-item-info');
  if (itemInfo) {
    itemInfo.innerHTML = `
      <div style="background:#f8fafc;border-radius:8px;padding:10px;margin-bottom:12px">
        <div style="font-weight:700">${item.item_name || item.name || '-'}</div>
        <div style="font-size:12px;color:#6b7280;margin-top:2px">
          รหัส: ${item.item_code || '-'} | จำนวนคงเหลือ: <strong>${item.qty || item.total_qty || 0}</strong> ${item.unit || 'ชิ้น'}
        </div>
      </div>`;
  }

  // ตั้ง max qty
  const qtyInput = document.getElementById('transfer-qty');
  if (qtyInput) {
    qtyInput.max = item.qty || item.total_qty || 999;
    qtyInput.value = '';
  }

  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');
}

/**
 * ส่ง Stock Transfer
 */
async function submitStockTransfer() {
  const item     = INV_UI.transferItem;
  if (!item) return;

  const from = document.getElementById('transfer-from').value;
  const to   = document.getElementById('transfer-to').value;
  const qty  = parseInt(document.getElementById('transfer-qty').value, 10);
  const note = document.getElementById('transfer-note').value.trim();

  // Validate
  if (!from) { showToast('กรุณาเลือก Location ต้นทาง'); return; }
  if (!to)   { showToast('กรุณาเลือก Location ปลายทาง'); return; }
  if (from === to) { showToast('Location ต้นทางและปลายทางต้องไม่เหมือนกัน'); return; }
  if (!qty || qty <= 0) { showToast('กรุณาระบุจำนวนที่ต้องการโอน'); return; }

  const maxQty = parseInt(document.getElementById('transfer-qty').max, 10) || 0;
  if (qty > maxQty) {
    showToast(`จำนวนที่โอนเกินสต็อกที่มี (สูงสุด ${maxQty})`);
    return;
  }

  const btn = document.getElementById('transfer-submit-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'กำลังโอน...'; }

  try {
    const result = await callAPI('transferStock', {
      item_id:       item.item_code || item.id,
      item_code:     item.item_code,
      from_location: from,
      to_location:   to,
      qty,
      note
    });

    if (!result || !result.success) {
      throw new Error(result?.error || 'โอนสต็อกไม่สำเร็จ');
    }

    showToast(`✅ โอนสต็อกสำเร็จ: ${qty} ${item.unit || 'ชิ้น'} จาก ${from} → ${to}`);
    closeModal('modal-stock-transfer');

    // Refresh inventory list
    if (typeof loadInventoryPage === 'function') loadInventoryPage();

  } catch (err) {
    showToast(`❌ ${err.message}`);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'ยืนยันการโอน'; }
  }
}

/**
 * สร้าง Transfer Modal ถ้ายังไม่มี
 */
function _ensureTransferModal_() {
  if (document.getElementById('modal-stock-transfer')) return;

  const LOCATIONS = [
    { value: 'MAIN', label: 'คลังหลัก (MAIN)' },
    { value: 'VAN_01', label: 'รถช่าง 1 (VAN_01)' },
    { value: 'VAN_02', label: 'รถช่าง 2 (VAN_02)' },
    { value: 'SITE', label: 'หน้างาน (SITE)' },
    { value: 'RETURN', label: 'คืนคลัง (RETURN)' },
  ];

  const opts = LOCATIONS.map(l => `<option value="${l.value}">${l.label}</option>`).join('');

  const modal = document.createElement('div');
  modal.id = 'modal-stock-transfer';
  modal.className = 'modal-overlay hidden';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-label', 'โอนสต็อก');
  modal.innerHTML = `
    <div class="modal-box" style="max-width:400px;width:95%">
      <div class="modal-header">
        <h3 style="margin:0;font-size:16px">🔄 โอนสต็อก</h3>
        <button class="modal-close-btn" data-close="modal-stock-transfer" aria-label="ปิด">&times;</button>
      </div>
      <div class="modal-body" style="padding:16px">
        <div id="transfer-item-info"></div>
        <form id="transfer-form">
          <div style="margin-bottom:12px">
            <label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px">Location ต้นทาง *</label>
            <select id="transfer-from" style="width:100%;padding:8px;border:1px solid #d1d5db;border-radius:6px;font-size:14px">
              <option value="">-- เลือก Location --</option>${opts}
            </select>
          </div>
          <div style="margin-bottom:12px">
            <label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px">Location ปลายทาง *</label>
            <select id="transfer-to" style="width:100%;padding:8px;border:1px solid #d1d5db;border-radius:6px;font-size:14px">
              <option value="">-- เลือก Location --</option>${opts}
            </select>
          </div>
          <div style="margin-bottom:12px">
            <label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px">จำนวนที่โอน *</label>
            <input id="transfer-qty" type="number" min="1" placeholder="ระบุจำนวน"
              style="width:100%;padding:8px;border:1px solid #d1d5db;border-radius:6px;font-size:14px;box-sizing:border-box">
            <div id="transfer-qty-hint" style="font-size:11px;color:#6b7280;margin-top:2px"></div>
          </div>
          <div style="margin-bottom:16px">
            <label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px">หมายเหตุ</label>
            <input id="transfer-note" type="text" placeholder="หมายเหตุ (ไม่บังคับ)"
              style="width:100%;padding:8px;border:1px solid #d1d5db;border-radius:6px;font-size:14px;box-sizing:border-box">
          </div>
          <button id="transfer-submit-btn" type="button"
            style="width:100%;padding:12px;background:#3b82f6;color:#fff;border:none;border-radius:8px;font-size:15px;font-weight:600;cursor:pointer">
            ยืนยันการโอน
          </button>
        </form>
      </div>
    </div>`;

  document.body.appendChild(modal);

  // Events
  document.getElementById('transfer-submit-btn')
    .addEventListener('click', submitStockTransfer);

  modal.querySelector('[data-close]')
    .addEventListener('click', () => closeModal('modal-stock-transfer'));

  modal.addEventListener('click', e => {
    if (e.target === modal) closeModal('modal-stock-transfer');
  });

  // qty hint
  document.getElementById('transfer-qty').addEventListener('input', e => {
    const max  = parseInt(e.target.max, 10) || 0;
    const val  = parseInt(e.target.value, 10) || 0;
    const hint = document.getElementById('transfer-qty-hint');
    if (hint) {
      hint.textContent = val > max
        ? `⚠️ เกินสต็อกที่มี (สูงสุด ${max})`
        : `สต็อกคงเหลือ: ${max} ชิ้น`;
      hint.style.color = val > max ? '#dc2626' : '#6b7280';
    }
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !document.getElementById('modal-stock-transfer').classList.contains('hidden')) {
      closeModal('modal-stock-transfer');
    }
  });
}

// ============================================================
// 1c. REORDER ALERT BANNER
// ============================================================
/**
 * แสดง Reorder Alert Banner บนหน้า inventory
 * @param {Array} items - รายการ inventory items
 */
function renderReorderBanner(items) {
  const page = document.getElementById('page-inventory');
  if (!page) return;

  // ลบ banner เดิม
  const oldBanner = document.getElementById('reorder-alert-banner');
  if (oldBanner) oldBanner.remove();

  // กรองสินค้าที่ต้อง reorder
  const lowItems = (items || []).filter(item => {
    const qty    = item.qty || item.total_qty || 0;
    const minQty = item.min_qty || item.reorder_point || 5;
    return qty <= minQty;
  });

  INV_UI.reorderItems = lowItems;

  if (lowItems.length === 0) return; // ไม่มีสินค้าใกล้หมด

  const banner = document.createElement('div');
  banner.id = 'reorder-alert-banner';
  banner.style.cssText = `
    background:#fef9c3;border:1px solid #fde047;border-radius:8px;
    padding:10px 14px;margin:8px 0;display:flex;align-items:center;
    justify-content:space-between;gap:8px;cursor:pointer;
  `;
  banner.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px">
      <span style="font-size:18px">⚠️</span>
      <span style="font-size:13px;font-weight:600;color:#713f12">
        สินค้าใกล้หมด <strong>${lowItems.length}</strong> รายการ
      </span>
    </div>
    <button id="reorder-view-btn"
      style="padding:5px 12px;background:#f59e0b;color:#fff;border:none;border-radius:6px;font-size:12px;cursor:pointer;white-space:nowrap">
      ดูรายการ
    </button>`;

  // แทรกที่ต้นหน้า inventory
  page.insertBefore(banner, page.firstChild);

  document.getElementById('reorder-view-btn')
    .addEventListener('click', e => {
      e.stopPropagation();
      _openReorderListModal_();
    });

  banner.addEventListener('click', _openReorderListModal_);
}

/**
 * เปิด modal รายการสินค้าที่ต้อง reorder
 */
function _openReorderListModal_() {
  _ensureReorderModal_();
  const modal = document.getElementById('modal-reorder-list');
  if (!modal) return;

  const list = document.getElementById('reorder-items-list');
  if (list) {
    list.innerHTML = INV_UI.reorderItems.map(item => {
      const qty    = item.qty || item.total_qty || 0;
      const minQty = item.min_qty || item.reorder_point || 5;
      return `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid #f3f4f6">
          <div>
            <div style="font-weight:600;font-size:14px">${item.item_name || '-'}</div>
            <div style="font-size:12px;color:#6b7280">
              คงเหลือ: <span style="color:#dc2626;font-weight:700">${qty}</span> / ขั้นต่ำ: ${minQty}
            </div>
          </div>
          <button class="reorder-po-btn" data-code="${item.item_code || ''}" data-name="${item.item_name || ''}"
            style="padding:6px 12px;background:#3b82f6;color:#fff;border:none;border-radius:6px;font-size:12px;cursor:pointer;white-space:nowrap">
            สั่งซื้อ
          </button>
        </div>`;
    }).join('') || '<div style="text-align:center;color:#9ca3af;padding:20px">ไม่มีรายการ</div>';

    // Event delegation สำหรับปุ่มสั่งซื้อ
    list.querySelectorAll('.reorder-po-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        closeModal('modal-reorder-list');
        if (typeof openCreatePOFromItem === 'function') {
          openCreatePOFromItem(btn.dataset.code, btn.dataset.name);
        }
      });
    });
  }

  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');
}

/**
 * สร้าง Reorder List Modal
 */
function _ensureReorderModal_() {
  if (document.getElementById('modal-reorder-list')) return;

  const modal = document.createElement('div');
  modal.id = 'modal-reorder-list';
  modal.className = 'modal-overlay hidden';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.innerHTML = `
    <div class="modal-box" style="max-width:420px;width:95%">
      <div class="modal-header">
        <h3 style="margin:0;font-size:16px">⚠️ สินค้าใกล้หมด</h3>
        <button class="modal-close-btn" data-close="modal-reorder-list" aria-label="ปิด">&times;</button>
      </div>
      <div class="modal-body" style="padding:16px;max-height:60vh;overflow-y:auto">
        <div id="reorder-items-list"></div>
      </div>
    </div>`;

  document.body.appendChild(modal);

  modal.querySelector('[data-close]')
    .addEventListener('click', () => closeModal('modal-reorder-list'));

  modal.addEventListener('click', e => {
    if (e.target === modal) closeModal('modal-reorder-list');
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !document.getElementById('modal-reorder-list').classList.contains('hidden')) {
      closeModal('modal-reorder-list');
    }
  });
}

// ============================================================
// 1d. ADD INVENTORY ITEM FORM
// ============================================================
/**
 * เปิด Add Inventory Item Form
 * @param {string} prefillBarcode - barcode ที่ scan ได้ (optional)
 */
function openAddInventoryForm(prefillBarcode) {
  _ensureAddItemModal_();
  const modal = document.getElementById('modal-add-inventory');
  if (!modal) return;

  // Reset form
  const form = document.getElementById('add-inventory-form');
  if (form) form.reset();

  // Pre-fill barcode ถ้ามี
  if (prefillBarcode) {
    const barcodeInput = document.getElementById('add-inv-barcode');
    if (barcodeInput) barcodeInput.value = prefillBarcode;
  }

  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');
}

/**
 * Submit Add Inventory Item
 */
async function submitAddInventoryItem() {
  const fields = {
    name:      document.getElementById('add-inv-name')?.value.trim(),
    category:  document.getElementById('add-inv-category')?.value.trim(),
    qty:       parseInt(document.getElementById('add-inv-qty')?.value, 10),
    min_qty:   parseInt(document.getElementById('add-inv-min-qty')?.value, 10) || 5,
    unit:      document.getElementById('add-inv-unit')?.value.trim() || 'ชิ้น',
    cost_price:  parseFloat(document.getElementById('add-inv-cost')?.value) || 0,
    sell_price:  parseFloat(document.getElementById('add-inv-sell')?.value) || 0,
    location:  document.getElementById('add-inv-location')?.value,
    barcode:   document.getElementById('add-inv-barcode')?.value.trim(),
  };

  // Validate
  if (!fields.name)     { showToast('กรุณากรอกชื่อสินค้า'); return; }
  if (!fields.category) { showToast('กรุณากรอกหมวดหมู่'); return; }
  if (isNaN(fields.qty) || fields.qty < 0) { showToast('กรุณาระบุจำนวนที่ถูกต้อง'); return; }
  if (!fields.location) { showToast('กรุณาเลือก Location'); return; }

  const btn = document.getElementById('add-inv-submit-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'กำลังบันทึก...'; }

  try {
    const result = await callAPI('addInventoryItem', {
      item_name:    fields.name,
      category:     fields.category,
      qty:          fields.qty,
      min_qty:      fields.min_qty,
      reorder_point: fields.min_qty,
      unit:         fields.unit,
      cost_price:   fields.cost_price,
      sell_price:   fields.sell_price,
      location:     fields.location,
      barcode:      fields.barcode,
    });

    if (!result || !result.success) {
      throw new Error(result?.error || 'บันทึกไม่สำเร็จ');
    }

    showToast(`✅ เพิ่มสินค้า "${fields.name}" สำเร็จ`);
    closeModal('modal-add-inventory');

    if (typeof loadInventoryPage === 'function') loadInventoryPage();

  } catch (err) {
    showToast(`❌ ${err.message}`);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'บันทึกสินค้า'; }
  }
}

/**
 * สร้าง Add Inventory Modal
 */
function _ensureAddItemModal_() {
  if (document.getElementById('modal-add-inventory')) return;

  const CATEGORIES = ['อะไหล่', 'อุปกรณ์', 'เครื่องมือ', 'สายสัญญาณ', 'อื่นๆ'];
  const LOCATIONS  = ['MAIN', 'VAN_01', 'VAN_02', 'SITE'];

  const catOpts = CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join('');
  const locOpts = LOCATIONS.map(l => `<option value="${l}">${l}</option>`).join('');

  const modal = document.createElement('div');
  modal.id = 'modal-add-inventory';
  modal.className = 'modal-overlay hidden';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-label', 'เพิ่มสินค้าใหม่');
  modal.innerHTML = `
    <div class="modal-box" style="max-width:440px;width:95%">
      <div class="modal-header">
        <h3 style="margin:0;font-size:16px">➕ เพิ่มสินค้าใหม่</h3>
        <button class="modal-close-btn" data-close="modal-add-inventory" aria-label="ปิด">&times;</button>
      </div>
      <div class="modal-body" style="padding:16px;max-height:70vh;overflow-y:auto">
        <form id="add-inventory-form">
          ${_formField_('ชื่อสินค้า *', 'add-inv-name', 'text', 'ชื่อสินค้า...')}
          <div style="margin-bottom:12px">
            <label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px">หมวดหมู่ *</label>
            <select id="add-inv-category" style="width:100%;padding:8px;border:1px solid #d1d5db;border-radius:6px;font-size:14px">
              <option value="">-- เลือกหมวดหมู่ --</option>${catOpts}
            </select>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">
            <div>
              <label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px">จำนวน *</label>
              <input id="add-inv-qty" type="number" min="0" placeholder="0"
                style="width:100%;padding:8px;border:1px solid #d1d5db;border-radius:6px;font-size:14px;box-sizing:border-box">
            </div>
            <div>
              <label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px">จำนวนขั้นต่ำ</label>
              <input id="add-inv-min-qty" type="number" min="0" placeholder="5"
                style="width:100%;padding:8px;border:1px solid #d1d5db;border-radius:6px;font-size:14px;box-sizing:border-box">
            </div>
          </div>
          ${_formField_('หน่วย', 'add-inv-unit', 'text', 'ชิ้น, อัน, ม้วน...')}
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">
            <div>
              <label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px">ราคาทุน (฿)</label>
              <input id="add-inv-cost" type="number" min="0" step="0.01" placeholder="0.00"
                style="width:100%;padding:8px;border:1px solid #d1d5db;border-radius:6px;font-size:14px;box-sizing:border-box">
            </div>
            <div>
              <label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px">ราคาขาย (฿)</label>
              <input id="add-inv-sell" type="number" min="0" step="0.01" placeholder="0.00"
                style="width:100%;padding:8px;border:1px solid #d1d5db;border-radius:6px;font-size:14px;box-sizing:border-box">
            </div>
          </div>
          <div style="margin-bottom:12px">
            <label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px">Location *</label>
            <select id="add-inv-location" style="width:100%;padding:8px;border:1px solid #d1d5db;border-radius:6px;font-size:14px">
              <option value="">-- เลือก Location --</option>${locOpts}
            </select>
          </div>
          <div style="margin-bottom:16px">
            <label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px">บาร์โค้ด</label>
            <div style="display:flex;gap:8px">
              <input id="add-inv-barcode" type="text" placeholder="กรอกหรือสแกนบาร์โค้ด"
                style="flex:1;padding:8px;border:1px solid #d1d5db;border-radius:6px;font-size:14px">
              <button id="add-inv-scan-btn" type="button"
                style="padding:8px 12px;background:#6b7280;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:13px">
                📷 สแกน
              </button>
            </div>
          </div>
          <button id="add-inv-submit-btn" type="button"
            style="width:100%;padding:12px;background:#22c55e;color:#fff;border:none;border-radius:8px;font-size:15px;font-weight:600;cursor:pointer">
            บันทึกสินค้า
          </button>
        </form>
      </div>
    </div>`;

  document.body.appendChild(modal);

  document.getElementById('add-inv-submit-btn')
    .addEventListener('click', submitAddInventoryItem);

  document.getElementById('add-inv-scan-btn')
    .addEventListener('click', () => {
      openBarcodeScanner((barcode) => {
        const input = document.getElementById('add-inv-barcode');
        if (input) input.value = barcode;
      });
    });

  modal.querySelector('[data-close]')
    .addEventListener('click', () => closeModal('modal-add-inventory'));

  modal.addEventListener('click', e => {
    if (e.target === modal) closeModal('modal-add-inventory');
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !document.getElementById('modal-add-inventory').classList.contains('hidden')) {
      closeModal('modal-add-inventory');
    }
  });
}

// ============================================================
// HELPERS
// ============================================================
/**
 * สร้าง form field HTML
 */
function _formField_(label, id, type, placeholder) {
  return `
    <div style="margin-bottom:12px">
      <label for="${id}" style="font-size:13px;font-weight:600;display:block;margin-bottom:4px">${label}</label>
      <input id="${id}" type="${type}" placeholder="${placeholder}"
        style="width:100%;padding:8px;border:1px solid #d1d5db;border-radius:6px;font-size:14px;box-sizing:border-box">
    </div>`;
}

/**
 * Format ตัวเลขเป็น X,XXX
 */
function _fmt_(num) {
  return Number(num || 0).toLocaleString('th-TH');
}

// ============================================================
// PATCH loadInventoryPage — เพิ่ม renderReorderBanner
// ============================================================
(function patchInventoryPage() {
  window.addEventListener('load', () => {
    const orig = window.loadInventoryPage;
    if (typeof orig !== 'function') return;

    window.loadInventoryPage = async function() {
      await orig.call(this);
      // หลังโหลดเสร็จ render reorder banner
      if (typeof INV !== 'undefined' && INV.items) {
        renderReorderBanner(INV.items);
      }
    };
  });
})();

// ============================================================
// EXPOSE GLOBALS
// ============================================================
window.openBarcodeScanner     = openBarcodeScanner;
window.closeBarcodeScanner    = closeBarcodeScanner;
window.openStockTransferModal = openStockTransferModal;
window.submitStockTransfer    = submitStockTransfer;
window.renderReorderBanner    = renderReorderBanner;
window.openAddInventoryForm   = openAddInventoryForm;
window.submitAddInventoryItem = submitAddInventoryItem;
