// ============================================================
// Customer Portal Section — Self-Service Job Status
// COMPHONE SUPER APP v5.9.0-phase2d
// Phase 29: Customer Portal (Frontend)
// ============================================================

let CUSTOMER_PORTAL_STATE = {
  jobId: '',
  phone: '',
  result: null,
  loading: false
};

// ===== เปิด Customer Portal =====
function openCustomerPortal() {
  currentSection = 'customer-portal';
  const container = document.getElementById('section-customer-content');
  if (!container) return;
  container.innerHTML = `
    <div style="padding:16px">
      <h3 style="margin:0 0 16px;font-size:18px;font-weight:800;color:#111827">
        <i class="bi bi-person-lines-fill" style="color:#3b82f6;margin-right:8px"></i> ตรวจสอบสถานะงาน
      </h3>
      <div class="form-group-custom">
        <label>รหัสงาน (Job ID)</label>
        <div class="input-wrap">
          <i class="bi bi-clipboard-check"></i>
          <input type="text" id="cp-job-id" placeholder="เช่น JOB-12345" 
                 onkeydown="if(event.key==='Enter') searchJobStatus()">
        </div>
      </div>
      <div class="form-group-custom">
        <label>เบอร์โทรศัพท์ (สำหรับยืนยัน)</label>
        <div class="input-wrap">
          <i class="bi bi-phone"></i>
          <input type="tel" id="cp-phone" placeholder="0812345678" 
                 onkeydown="if(event.key==='Enter') searchJobStatus()">
        </div>
      </div>
      <button class="btn-setup" id="cp-search-btn" onclick="searchJobStatus()" style="width:100%;margin-bottom:16px">
        <i class="bi bi-search"></i> ค้นหาสถานะ
      </button>

      <div id="cp-loading" style="display:none;text-align:center;padding:20px">
        <i class="bi bi-hourglass-split" style="font-size:24px;color:#6b7280"></i>
        <p style="color:#6b7280;margin-top:8px">กำลังค้นหา...</p>
      </div>

      <div id="cp-result"></div>
    </div>
  `;
}

// ===== ค้นหาสถานะงาน =====
async function searchJobStatus() {
  const jobId = document.getElementById('cp-job-id').value.trim();
  const phone = document.getElementById('cp-phone').value.trim();
  const resultDiv = document.getElementById('cp-result');
  const loadingDiv = document.getElementById('cp-loading');
  const btn = document.getElementById('cp-search-btn');

  if (!jobId || !phone) {
    showToast('กรุณากรอกรหัสงานและเบอร์โทรศัพท์');
    return;
  }

  loadingDiv.style.display = 'block';
  resultDiv.innerHTML = '';
  btn.disabled = true;

  try {
    const res = await callAPI('getJobStatusPublic', { job_id: jobId, phone: phone });
    if (res && res.success && res.data) {
      renderJobStatus(res.data);
    } else {
      resultDiv.innerHTML = `
        <div style="padding:16px;background:#fef2f2;border-radius:12px;color:#dc2626">
          <i class="bi bi-exclamation-triangle"></i> ไม่พบงานหรือเบอร์โทรศัพท์ไม่ถูกต้อง
        </div>
      `;
    }
  } catch (e) {
    resultDiv.innerHTML = `
      <div style="padding:16px;background:#fef2f2;border-radius:12px;color:#dc2626">
        <i class="bi bi-wifi-off"></i> เกิดข้อผิดพลาดในการเชื่อมต่อ
      </div>
    `;
  } finally {
    loadingDiv.style.display = 'none';
    btn.disabled = false;
  }
}

// ===== แสดงผลสถานะงาน =====
function renderJobStatus(data) {
  const container = document.getElementById('cp-result');
  if (!container) return;

  const statusColors = {
    'OPEN': '#3b82f6',
    'ASSIGNED': '#f59e0b', 
    'IN_PROGRESS': '#f97316',
    'WAIT_PARTS': '#8b5cf6',
    'DELIVERED': '#10b981',
    'CLOSED': '#6b7280'
  };

  const statusColor = statusColors[data.status] || '#6b7280';

  container.innerHTML = `
    <div style="background:#f9fafb;border-radius:16px;padding:16px;border-left:4px solid ${statusColor}">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <h4 style="margin:0;font-size:16px;font-weight:600;color:#111827">${data.job_id || '-'}</h4>
        <span style="background:${statusColor};color:white;padding:4px 12px;border-radius:12px;font-size:12px;font-weight:600">${data.status || '-'}</span>
      </div>
      <div style="font-size:14px;color:#374151;margin-bottom:8px"><strong>อุปกรณ์:</strong> ${data.device_model || '-'}</div>
      <div style="font-size:14px;color:#374151;margin-bottom:8px"><strong>อาการ:</strong> ${data.problem_desc || '-'}</div>
      <div style="font-size:14px;color:#374151;margin-bottom:8px"><strong>ช่างเทคนิค:</strong> ${data.tech_name || 'ยังไม่ได้มอบหมาย'}</div>
      <div style="font-size:14px;color:#6b7280;margin-top:12px;padding-top:12px;border-top:1px solid #e5e7eb">
        <i class="bi bi-clock"></i> อัปเดตล่าสุด: ${data.last_update || '-'}
      </div>
    </div>
  `;
}

// ===== Export functions =====
window.openCustomerPortal = openCustomerPortal;
window.loadCustomerPortalPage = openCustomerPortal; // Alias for goPage
