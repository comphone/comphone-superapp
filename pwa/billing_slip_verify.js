// COMPHONE SUPER APP V5.5
// ============================================================
// billing_slip_verify.js — Slip Upload, AI Verify, Close Job
// เพิ่มต่อจาก billing_customer.js
// ============================================================

var BSV = {
  currentJobId: null,
  currentBillingId: null,
  currentAmount: 0,
  slipBase64: null,
  slipMimeType: 'image/jpeg'
};

// ============================================================
// เปิด Modal อัปโหลดสลิป
// ============================================================
function openSlipUploadModal(jobId, billingId, amount) {
  BSV.currentJobId = jobId;
  BSV.currentBillingId = billingId;
  BSV.currentAmount = amount || 0;
  BSV.slipBase64 = null;

  var m = document.getElementById('modal-slip-upload');
  if (!m) {
    createSlipUploadModal_();
    m = document.getElementById('modal-slip-upload');
  }

  // Reset UI
  document.getElementById('slip-preview-area').innerHTML =
    '<div style="color:#94a3b8;text-align:center;padding:2rem;">' +
    '<i class="bi bi-image" style="font-size:2.5rem;"></i><br>ยังไม่ได้เลือกรูป</div>';
  document.getElementById('slip-verify-result').innerHTML = '';
  document.getElementById('slip-amount-display').textContent =
    '฿' + (amount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 });

  var btnVerify = document.getElementById('btn-verify-slip');
  if (btnVerify) { btnVerify.disabled = true; }

  m.classList.remove('hidden');
}

function closeSlipUploadModal() {
  var m = document.getElementById('modal-slip-upload');
  if (m) m.classList.add('hidden');
}

// ============================================================
// สร้าง Modal DOM (ถ้ายังไม่มีใน index.html)
// ============================================================
function createSlipUploadModal_() {
  var div = document.createElement('div');
  div.id = 'modal-slip-upload';
  div.className = 'modal-overlay hidden';
  div.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:flex-end;justify-content:center;';
  div.innerHTML = `
    <div style="background:#fff;border-radius:16px 16px 0 0;width:100%;max-width:480px;padding:1.5rem;max-height:90vh;overflow-y:auto;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
        <h3 style="margin:0;font-size:1.1rem;font-weight:700;color:#1e293b;">
          <i class="bi bi-receipt-cutoff"></i> ยืนยันการชำระเงิน
        </h3>
        <button onclick="closeSlipUploadModal()"
          style="background:none;border:none;font-size:1.5rem;cursor:pointer;color:#64748b;">✕</button>
      </div>

      <!-- ยอดที่ต้องชำระ -->
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:1rem;margin-bottom:1rem;text-align:center;">
        <div style="font-size:0.85rem;color:#16a34a;margin-bottom:0.25rem;">ยอดที่ต้องชำระ</div>
        <div id="slip-amount-display" style="font-size:1.8rem;font-weight:700;color:#15803d;">฿0.00</div>
      </div>

      <!-- Upload Area -->
      <div style="margin-bottom:1rem;">
        <div style="font-size:0.85rem;font-weight:600;color:#374151;margin-bottom:0.5rem;">แนบสลิปโอนเงิน</div>
        <div style="display:flex;gap:0.5rem;margin-bottom:0.75rem;">
          <label for="slip-file-input"
            style="flex:1;background:#1e40af;color:#fff;border:none;border-radius:8px;padding:0.6rem;font-size:0.85rem;font-weight:600;cursor:pointer;text-align:center;">
            <i class="bi bi-image"></i> เลือกรูปภาพ
          </label>
          <label for="slip-camera-input"
            style="flex:1;background:#0891b2;color:#fff;border:none;border-radius:8px;padding:0.6rem;font-size:0.85rem;font-weight:600;cursor:pointer;text-align:center;">
            <i class="bi bi-camera"></i> ถ่ายรูป
          </label>
        </div>
        <input type="file" id="slip-file-input" accept="image/*" style="display:none;" onchange="handleSlipFileSelect(this)">
        <input type="file" id="slip-camera-input" accept="image/*" capture="environment" style="display:none;" onchange="handleSlipFileSelect(this)">

        <!-- Preview -->
        <div id="slip-preview-area"
          style="border:2px dashed #cbd5e1;border-radius:10px;min-height:120px;display:flex;align-items:center;justify-content:center;overflow:hidden;">
          <div style="color:#94a3b8;text-align:center;padding:2rem;">
            <i class="bi bi-image" style="font-size:2.5rem;"></i><br>ยังไม่ได้เลือกรูป
          </div>
        </div>
      </div>

      <!-- Verify Result -->
      <div id="slip-verify-result" style="margin-bottom:1rem;"></div>

      <!-- Action Buttons -->
      <div style="display:flex;gap:0.5rem;">
        <button id="btn-verify-slip" onclick="verifySlipWithAI()" disabled
          style="flex:1;background:#7c3aed;color:#fff;border:none;border-radius:8px;padding:0.75rem;font-size:0.9rem;font-weight:600;cursor:pointer;opacity:0.5;">
          <i class="bi bi-robot"></i> ตรวจสอบด้วย AI
        </button>
        <button id="btn-confirm-paid" onclick="confirmPaymentManual()" disabled
          style="flex:1;background:#16a34a;color:#fff;border:none;border-radius:8px;padding:0.75rem;font-size:0.9rem;font-weight:600;cursor:pointer;opacity:0.5;">
          <i class="bi bi-check-circle"></i> ยืนยันรับเงิน
        </button>
      </div>
      <button onclick="closeSlipUploadModal()"
        style="width:100%;margin-top:0.5rem;background:none;border:1px solid #e2e8f0;border-radius:8px;padding:0.6rem;font-size:0.85rem;color:#64748b;cursor:pointer;">
        ยกเลิก
      </button>
    </div>
  `;
  document.body.appendChild(div);
}

// ============================================================
// จัดการไฟล์ที่เลือก — แปลงเป็น Base64
// ============================================================
function handleSlipFileSelect(input) {
  var file = input.files && input.files[0];
  if (!file) return;

  BSV.slipMimeType = file.type || 'image/jpeg';

  var reader = new FileReader();
  reader.onload = function(e) {
    var dataUrl = e.target.result;
    // แยก base64 จาก data URL
    BSV.slipBase64 = dataUrl.split(',')[1];

    // แสดง preview
    var preview = document.getElementById('slip-preview-area');
    if (preview) {
      preview.innerHTML = `
        <img src="${dataUrl}" alt="slip preview"
          style="max-width:100%;max-height:250px;border-radius:8px;object-fit:contain;">`;
    }

    // เปิดปุ่ม verify และ confirm
    var btnVerify = document.getElementById('btn-verify-slip');
    var btnConfirm = document.getElementById('btn-confirm-paid');
    if (btnVerify) { btnVerify.disabled = false; btnVerify.style.opacity = '1'; }
    if (btnConfirm) { btnConfirm.disabled = false; btnConfirm.style.opacity = '1'; }

    // Reset result
    document.getElementById('slip-verify-result').innerHTML = '';
  };
  reader.readAsDataURL(file);
}

// ============================================================
// ตรวจสอบสลิปด้วย Gemini AI
// ============================================================
async function verifySlipWithAI() {
  if (!BSV.slipBase64) { showToast('กรุณาเลือกรูปสลิปก่อน'); return; }

  var btn = document.getElementById('btn-verify-slip');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="bi bi-hourglass-split"></i> กำลังตรวจสอบ...'; }

  var resultDiv = document.getElementById('slip-verify-result');
  resultDiv.innerHTML = '<div style="text-align:center;padding:1rem;color:#7c3aed;">AI กำลังวิเคราะห์สลิป...</div>';

  try {
    var res = await callApi('verifyPaymentSlip', {
      job_id: BSV.currentJobId,
      billing_id: BSV.currentBillingId,
      slip_base64: BSV.slipBase64,
      slip_mime_type: BSV.slipMimeType,
      expected_amount: BSV.currentAmount
    });

    if (res && res.success) {
      var v = res.verification || res.data || {};
      var passed = v.verified === true || v.amount_match === true;
      var detectedAmount = v.detected_amount || v.amount || 0;
      var confidence = v.confidence || v.score || 0;

      resultDiv.innerHTML = `
        <div style="background:${passed ? '#f0fdf4' : '#fff7ed'};border:1px solid ${passed ? '#bbf7d0' : '#fed7aa'};
          border-radius:10px;padding:1rem;margin-bottom:0.5rem;">
          <div style="font-weight:700;font-size:1rem;color:${passed ? '#15803d' : '#c2410c'};margin-bottom:0.5rem;">
            ${passed ? '✅ สลิปถูกต้อง' : '⚠️ ตรวจสอบอีกครั้ง'}
          </div>
          <div style="font-size:0.85rem;color:#374151;">
            <div>ยอดที่ตรวจพบ: <strong>฿${Number(detectedAmount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</strong></div>
            <div>ยอดที่คาดหวัง: <strong>฿${Number(BSV.currentAmount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</strong></div>
            ${confidence ? '<div>ความเชื่อมั่น: <strong>' + Math.round(confidence * 100) + '%</strong></div>' : ''}
            ${v.note ? '<div style="margin-top:0.5rem;color:#64748b;">' + v.note + '</div>' : ''}
          </div>
        </div>`;

      if (passed) {
        // ถ้า AI ยืนยันแล้ว ให้ confirm อัตโนมัติ
        var btnConfirm = document.getElementById('btn-confirm-paid');
        if (btnConfirm) {
          btnConfirm.style.background = '#15803d';
          btnConfirm.innerHTML = '<i class="bi bi-check-circle-fill"></i> ยืนยันรับเงิน (AI ผ่านแล้ว)';
        }
      }
    } else {
      var errMsg = (res && res.error) || (res && res.message) || 'ตรวจสอบไม่สำเร็จ';
      resultDiv.innerHTML = `
        <div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:10px;padding:1rem;">
          <div style="color:#dc2626;font-weight:600;">❌ ${errMsg}</div>
          <div style="font-size:0.8rem;color:#64748b;margin-top:0.25rem;">กรุณายืนยันด้วยตนเองแทน</div>
        </div>`;
    }
  } catch (err) {
    resultDiv.innerHTML = `
      <div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:10px;padding:1rem;">
        <div style="color:#dc2626;font-weight:600;">❌ เกิดข้อผิดพลาด: ${err.message}</div>
      </div>`;
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="bi bi-robot"></i> ตรวจสอบด้วย AI'; }
  }
}

// ============================================================
// ยืนยันรับเงินด้วยตนเอง (ไม่ผ่าน AI)
// ============================================================
async function confirmPaymentManual() {
  if (!BSV.currentJobId) { showToast('ไม่พบข้อมูลงาน'); return; }

  var btn = document.getElementById('btn-confirm-paid');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="bi bi-hourglass-split"></i> กำลังบันทึก...'; }

  try {
    var payload = {
      job_id: BSV.currentJobId,
      billing_id: BSV.currentBillingId,
      payment_method: 'โอนเงิน',
      paid_amount: BSV.currentAmount
    };
    if (BSV.slipBase64) {
      payload.slip_base64 = BSV.slipBase64;
      payload.slip_mime_type = BSV.slipMimeType;
    }

    var res = await callApi('markBillingPaid', payload);
    if (res && res.success) {
      showToast('✅ บันทึกการชำระเงินเรียบร้อย — ปิดงานแล้ว');
      closeSlipUploadModal();
      // ปิด QR modal ถ้าเปิดอยู่
      if (typeof closeQRPaymentModal === 'function') closeQRPaymentModal();
      // ปิด billing modal
      if (typeof closeBillingModal === 'function') closeBillingModal();
      // รีโหลดหน้า jobs
      if (typeof loadJobsPage === 'function') setTimeout(loadJobsPage, 500);
      else if (typeof openJobsPage === 'function') setTimeout(openJobsPage, 500);
    } else {
      showToast('❌ ' + ((res && res.error) || 'บันทึกไม่สำเร็จ'));
    }
  } catch (err) {
    showToast('❌ เกิดข้อผิดพลาด: ' + err.message);
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="bi bi-check-circle"></i> ยืนยันรับเงิน'; }
  }
}

// ============================================================
// Patch: เพิ่มปุ่ม "แนบสลิป" ใน QR Payment Modal ที่มีอยู่
// เรียกหลัง renderQRPayment() ใน billing_customer.js
// ============================================================
function injectSlipButtonToQRModal(jobId, billingId, amount) {
  var qrContent = document.getElementById('qr-payment-content');
  if (!qrContent) return;

  // ตรวจว่ามีปุ่มแล้วหรือยัง
  if (document.getElementById('btn-open-slip-upload')) return;

  var slipBtn = document.createElement('div');
  slipBtn.style.cssText = 'margin-top:1rem;';
  slipBtn.innerHTML = `
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:1rem 0;">
    <div style="text-align:center;font-size:0.85rem;color:#64748b;margin-bottom:0.75rem;">
      ลูกค้าโอนแล้ว? แนบสลิปเพื่อยืนยันและปิดงาน
    </div>
    <button id="btn-open-slip-upload"
      onclick="openSlipUploadModal('${jobId}','${billingId}',${amount})"
      style="width:100%;background:#16a34a;color:#fff;border:none;border-radius:10px;
             padding:0.85rem;font-size:0.95rem;font-weight:700;cursor:pointer;">
      <i class="bi bi-receipt-cutoff"></i> แนบสลิป &amp; ปิดงาน
    </button>`;
  qrContent.appendChild(slipBtn);
}

// ============================================================
// Expose to global
// ============================================================
window.openSlipUploadModal = openSlipUploadModal;
window.closeSlipUploadModal = closeSlipUploadModal;
window.handleSlipFileSelect = handleSlipFileSelect;
window.verifySlipWithAI = verifySlipWithAI;
window.confirmPaymentManual = confirmPaymentManual;
window.injectSlipButtonToQRModal = injectSlipButtonToQRModal;
