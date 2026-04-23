// ============================================================
// COMPHONE SUPER APP V5.5
// customer_portal.js — Customer Portal (Public Job Status Tracking)
// Final Sprint T4 — ไม่ต้อง login, ค้นหาด้วย JobID + เบอร์โทร
// ============================================================

'use strict';

const PORTAL = {
  currentJobId: null,
  currentPhone: null,
  data: null
};

// ============================================================
// Entry Point — เรียกจาก goPage('customer-portal') หรือ URL param
// ============================================================

/**
 * โหลดหน้า Customer Portal
 * @param {string} [jobIdParam] - JobID จาก URL param
 */
function loadCustomerPortalPage(jobIdParam) {
  const page = document.getElementById('page-customer-portal');
  if (!page) return;

  // ตรวจสอบ URL params
  const urlParams = new URLSearchParams(window.location.search);
  const jobId = jobIdParam || urlParams.get('jobId') || urlParams.get('job_id') || '';
  const phone = urlParams.get('phone') || '';

  page.innerHTML = renderPortalSearchForm_(jobId, phone);

  // ถ้ามี jobId จาก URL ให้ค้นหาทันที
  if (jobId) {
    PORTAL.currentJobId = jobId.toUpperCase();
    PORTAL.currentPhone = phone;
    document.getElementById('portal-job-id').value = jobId;
    if (phone) document.getElementById('portal-phone').value = phone;
    searchJobStatus_();
  }
}

// ============================================================
// Render — Search Form
// ============================================================

function renderPortalSearchForm_(jobId, phone) {
  return `
    <div class="portal-container" style="max-width:480px;margin:0 auto;padding:16px;">
      <!-- Header -->
      <div style="text-align:center;padding:24px 0 16px;">
        <div style="font-size:48px;margin-bottom:8px;">🔧</div>
        <h2 style="margin:0;font-size:22px;font-weight:700;color:#1e293b;">ตรวจสอบสถานะงาน</h2>
        <p style="margin:4px 0 0;color:#64748b;font-size:14px;">COMPHONE SERVICE CENTER</p>
      </div>

      <!-- Search Card -->
      <div class="card" style="border-radius:16px;padding:20px;margin-bottom:16px;">
        <div style="margin-bottom:14px;">
          <label style="display:block;font-size:13px;font-weight:600;color:#374151;margin-bottom:6px;">
            🔖 หมายเลขงาน (Job ID)
          </label>
          <input id="portal-job-id" type="text" placeholder="เช่น J0001" value="${jobId}"
            style="width:100%;box-sizing:border-box;padding:10px 14px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:16px;outline:none;"
            oninput="this.value=this.value.toUpperCase()"
            onkeydown="if(event.key==='Enter')searchJobStatus_()">
        </div>
        <div style="margin-bottom:16px;">
          <label style="display:block;font-size:13px;font-weight:600;color:#374151;margin-bottom:6px;">
            📱 เบอร์โทรศัพท์ (4 ตัวท้าย)
          </label>
          <input id="portal-phone" type="tel" placeholder="เช่น 5678" value="${phone}" maxlength="10"
            style="width:100%;box-sizing:border-box;padding:10px 14px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:16px;outline:none;"
            onkeydown="if(event.key==='Enter')searchJobStatus_()">
        </div>
        <button onclick="searchJobStatus_()"
          style="width:100%;background:linear-gradient(135deg,#1e40af,#3b82f6);color:#fff;border:none;border-radius:12px;padding:13px;font-size:16px;font-weight:700;cursor:pointer;letter-spacing:0.5px;">
          🔍 ตรวจสอบสถานะ
        </button>
      </div>

      <!-- Result Area -->
      <div id="portal-result"></div>

      <!-- Footer -->
      <div style="text-align:center;padding:16px 0;color:#94a3b8;font-size:12px;">
        <p style="margin:0;">หากต้องการความช่วยเหลือ กรุณาติดต่อ</p>
        <p style="margin:4px 0 0;font-weight:600;color:#64748b;">📞 LINE: @comphone</p>
      </div>
    </div>
  `;
}

// ============================================================
// Search — ค้นหาสถานะงาน
// ============================================================

async function searchJobStatus_() {
  const jobIdInput = document.getElementById('portal-job-id');
  const phoneInput = document.getElementById('portal-phone');
  const resultDiv = document.getElementById('portal-result');

  if (!jobIdInput || !resultDiv) return;

  const jobId = (jobIdInput.value || '').trim().toUpperCase();
  const phone = (phoneInput ? phoneInput.value : '').trim();

  if (!jobId) {
    jobIdInput.style.borderColor = '#ef4444';
    jobIdInput.focus();
    return;
  }
  jobIdInput.style.borderColor = '#e2e8f0';

  PORTAL.currentJobId = jobId;
  PORTAL.currentPhone = phone;

  // Loading state
  resultDiv.innerHTML = `
    <div style="text-align:center;padding:32px;color:#64748b;">
      <div style="font-size:32px;animation:spin 1s linear infinite;display:inline-block;">⏳</div>
      <p style="margin-top:12px;">กำลังค้นหาข้อมูล...</p>
    </div>
  `;

  try {
    const res = await callAPI('getJobStatusPublic', { job_id: jobId, phone: phone });

    if (!res || !res.success) {
      resultDiv.innerHTML = renderPortalError_(res?.error || 'ไม่พบข้อมูลงาน กรุณาตรวจสอบหมายเลขงานและเบอร์โทร');
      return;
    }

    PORTAL.data = res;
    resultDiv.innerHTML = renderPortalJobStatus_(res);

  } catch (err) {
    resultDiv.innerHTML = renderPortalError_('เกิดข้อผิดพลาด: ' + err.message);
  }
}

// ============================================================
// Render — Job Status Card
// ============================================================

function renderPortalJobStatus_(res) {
  const job = res.job || {};
  const timeline = res.timeline || [];
  const photos = res.photos || [];
  const progress = job.progress_percent || 0;
  const color = job.status_color || '#3b82f6';

  return `
    <!-- Status Card -->
    <div class="card" style="border-radius:16px;padding:20px;margin-bottom:12px;border-left:4px solid ${color};">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;">
        <div>
          <div style="font-size:22px;font-weight:700;color:#1e293b;">${job.job_id || PORTAL.currentJobId}</div>
          <div style="font-size:14px;color:#64748b;margin-top:2px;">👤 ${job.customer_name || '-'}</div>
        </div>
        <div style="text-align:right;">
          <span style="font-size:24px;">${job.status_icon || '🔧'}</span>
          <div style="font-size:12px;font-weight:600;color:${color};margin-top:2px;">${job.status_label || '-'}</div>
        </div>
      </div>

      <!-- Progress Bar -->
      <div style="margin-bottom:12px;">
        <div style="display:flex;justify-content:space-between;font-size:12px;color:#64748b;margin-bottom:4px;">
          <span>ความคืบหน้า</span>
          <span>${progress}%</span>
        </div>
        <div style="background:#e2e8f0;border-radius:99px;height:8px;overflow:hidden;">
          <div style="background:${color};height:100%;width:${progress}%;border-radius:99px;transition:width 0.5s ease;"></div>
        </div>
      </div>

      <!-- Job Details -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:13px;">
        ${job.received_date ? `<div><span style="color:#94a3b8;">📅 รับงาน</span><br><strong>${job.received_date}</strong></div>` : ''}
        ${job.technician ? `<div><span style="color:#94a3b8;">👨‍🔧 ช่าง</span><br><strong>${job.technician}</strong></div>` : ''}
        ${job.symptom ? `<div style="grid-column:1/-1;"><span style="color:#94a3b8;">🔍 อาการ</span><br><strong>${job.symptom}</strong></div>` : ''}
        ${job.estimated_price ? `<div style="grid-column:1/-1;"><span style="color:#94a3b8;">💰 ราคาประเมิน</span><br><strong>฿${Number(job.estimated_price).toLocaleString()}</strong></div>` : ''}
        ${job.public_note ? `<div style="grid-column:1/-1;"><span style="color:#94a3b8;">📝 หมายเหตุ</span><br><strong>${job.public_note}</strong></div>` : ''}
      </div>
    </div>

    <!-- Timeline -->
    ${timeline.length > 0 ? renderPortalTimeline_(timeline) : ''}

    <!-- Photos -->
    ${photos.length > 0 ? renderPortalPhotos_(photos) : ''}

    <!-- Share Button -->
    <div style="margin-top:12px;">
      <button onclick="shareJobStatus_()"
        style="width:100%;background:#f1f5f9;color:#334155;border:1px solid #e2e8f0;border-radius:12px;padding:11px;font-size:14px;font-weight:600;cursor:pointer;">
        📤 แชร์สถานะงาน
      </button>
    </div>
  `;
}

// ============================================================
// Render — Timeline
// ============================================================

function renderPortalTimeline_(timeline) {
  const items = timeline.map((item, i) => `
    <div style="display:flex;gap:12px;${i < timeline.length - 1 ? 'padding-bottom:12px;' : ''}">
      <div style="display:flex;flex-direction:column;align-items:center;">
        <div style="width:10px;height:10px;border-radius:50%;background:#3b82f6;flex-shrink:0;margin-top:4px;"></div>
        ${i < timeline.length - 1 ? '<div style="width:2px;flex:1;background:#e2e8f0;margin-top:2px;"></div>' : ''}
      </div>
      <div style="flex:1;padding-bottom:2px;">
        <div style="font-size:13px;font-weight:600;color:#1e293b;">${item.event || '-'}</div>
        ${item.note ? `<div style="font-size:12px;color:#64748b;margin-top:2px;">${item.note}</div>` : ''}
        <div style="font-size:11px;color:#94a3b8;margin-top:2px;">${item.time || ''}</div>
      </div>
    </div>
  `).join('');

  return `
    <div class="card" style="border-radius:16px;padding:16px 20px;margin-bottom:12px;">
      <div style="font-size:14px;font-weight:700;color:#1e293b;margin-bottom:12px;">📋 ประวัติการดำเนินงาน</div>
      ${items}
    </div>
  `;
}

// ============================================================
// Render — Photos
// ============================================================

function renderPortalPhotos_(photos) {
  const imgs = photos.map(p => `
    <div style="aspect-ratio:1;border-radius:8px;overflow:hidden;background:#f1f5f9;">
      <img src="${p.url}" alt="${p.type}" loading="lazy"
        style="width:100%;height:100%;object-fit:cover;cursor:pointer;"
        onclick="window.open('${p.url}','_blank')"
        onerror="this.parentElement.innerHTML='<div style=\'display:flex;align-items:center;justify-content:center;height:100%;color:#94a3b8;font-size:24px;\'>🖼️</div>'">
    </div>
  `).join('');

  return `
    <div class="card" style="border-radius:16px;padding:16px 20px;margin-bottom:12px;">
      <div style="font-size:14px;font-weight:700;color:#1e293b;margin-bottom:12px;">📷 รูปภาพงาน</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;">
        ${imgs}
      </div>
    </div>
  `;
}

// ============================================================
// Render — Error
// ============================================================

function renderPortalError_(message) {
  return `
    <div class="card" style="border-radius:16px;padding:24px;text-align:center;margin-bottom:12px;">
      <div style="font-size:40px;margin-bottom:12px;">😕</div>
      <div style="font-size:15px;font-weight:600;color:#1e293b;margin-bottom:6px;">ไม่พบข้อมูล</div>
      <div style="font-size:13px;color:#64748b;">${message}</div>
      <button onclick="document.getElementById('portal-job-id').focus()"
        style="margin-top:16px;background:#f1f5f9;color:#334155;border:1px solid #e2e8f0;border-radius:10px;padding:9px 20px;font-size:13px;font-weight:600;cursor:pointer;">
        🔄 ลองใหม่
      </button>
    </div>
  `;
}

// ============================================================
// Share — แชร์สถานะงาน
// ============================================================

function shareJobStatus_() {
  const jobId = PORTAL.currentJobId || '';
  const phone = PORTAL.currentPhone || '';
  const baseUrl = window.location.origin + window.location.pathname;
  const shareUrl = `${baseUrl}?page=customer-portal&jobId=${jobId}${phone ? '&phone=' + phone : ''}`;

  if (navigator.share) {
    navigator.share({
      title: 'สถานะงาน ' + jobId + ' — COMPHONE',
      text: 'ตรวจสอบสถานะงานซ่อม ' + jobId,
      url: shareUrl
    }).catch(() => copyToClipboard_(shareUrl));
  } else {
    copyToClipboard_(shareUrl);
  }
}

function copyToClipboard_(text) {
  navigator.clipboard.writeText(text)
    .then(() => showToast('📋 คัดลอก URL แล้ว'))
    .catch(() => showToast('URL: ' + text));
}
