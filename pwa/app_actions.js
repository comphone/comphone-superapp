// app_actions.js — Extracted from app.js (Search + Notifications + Actions)
// Globals used: APP, goPage, showToast, callAPI, openPurchaseOrders

// ===== SEARCH =====
function showSearch() {
  document.getElementById('modal-search').classList.remove('hidden');
  setTimeout(() => document.getElementById('global-search-input').focus(), 100);
}

function globalSearch(val) {
  const q = val.toLowerCase().trim();
  const results = document.getElementById('search-results');
  if (!q) { results.innerHTML = '<div style="padding:20px;text-align:center;color:#9ca3af">พิมพ์เพื่อค้นหา</div>'; return; }

  const found = APP.jobs.filter(j =>
    j.id.toLowerCase().includes(q) || j.title.toLowerCase().includes(q) ||
    j.customer.toLowerCase().includes(q) || j.phone.includes(q)
  );
  results.innerHTML = found.length
    ? found.map(j => `<div style="padding:12px 16px;border-bottom:1px solid #f3f4f6;cursor:pointer" onclick="closeModal('modal-search');showJobDetail('${j.id}')">
        <div style="font-size:10px;color:#9ca3af">${j.id}</div>
        <div style="font-size:14px;font-weight:700;color:#111827">${j.title}</div>
        <div style="font-size:12px;color:#6b7280">${j.customer} · ${j.phone}</div>
      </div>`).join('')
    : '<div style="padding:20px;text-align:center;color:#9ca3af">ไม่พบผลลัพธ์</div>';
}

// ===== NOTIFICATIONS =====
function showNotifications() {
  const list = document.getElementById('notif-list');
  const d = APP.dashboardData;
  const alertsRaw = d && d.alerts ? d.alerts : {};
  const alerts = Array.isArray(alertsRaw) ? alertsRaw : (alertsRaw.items || []);

  if (alerts.length === 0) {
    list.innerHTML = '<div style="text-align:center;padding:40px;color:#9ca3af"><i class="bi bi-bell-slash" style="font-size:36px;display:block;margin-bottom:8px"></i>ไม่มีการแจ้งเตือน</div>';
  } else {
    list.innerHTML = alerts.map(a => {
      const isOverdue = (a.type||'').includes('OVERDUE');
      const isStock = (a.type||'').includes('STOCK');
      const color = isOverdue ? '#ef4444' : isStock ? '#f59e0b' : '#10b981';
      const icon = isOverdue ? 'bi-clock-fill' : isStock ? 'bi-box-seam-fill' : 'bi-info-circle-fill';
      const title = a.message || (a.data && a.data.customer_name ? `${a.id} — ${a.data.customer_name}` : '-');
      const sub = a.data && a.data.status_label ? `สถานะ: ${a.data.status_label}` : (isOverdue ? 'เกิน SLA' : isStock ? 'สต็อกต่ำ' : '');
      return `
        <div style="display:flex;align-items:center;gap:10px;padding:12px 16px;border-bottom:1px solid #f3f4f6">
          <div style="width:40px;height:40px;border-radius:50%;background:${color}20;display:flex;align-items:center;justify-content:center;flex-shrink:0">
            <i class="bi ${icon}" style="color:${color};font-size:18px"></i>
          </div>
          <div style="flex:1">
            <div style="font-size:13px;font-weight:700;color:#111827">${title}</div>
            <div style="font-size:11px;color:#6b7280">${sub}</div>
          </div>
        </div>
      `;
    }).join('');
  }
  document.getElementById('modal-notif').classList.remove('hidden');
  document.getElementById('notif-count').style.display = 'none';
}

// ===== ACTIONS =====
function doCheckin() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(pos => {
      showToast(`เช็คอินแล้ว 📍 ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
      saveOfflineAction({ type: 'checkin', lat: pos.coords.latitude, lng: pos.coords.longitude, time: Date.now() });
    }, () => showToast('เช็คอินแล้ว (ไม่พบ GPS)'));
  } else {
    showToast('เช็คอินแล้ว');
  }
}

function markJobDone(jobId) {
  // Delegate ไป markJobDoneV2 ซึ่งใช้ transitionJob จาก job_workflow.js
  if (typeof markJobDoneV2 === 'function') {
    markJobDoneV2(jobId);
  } else {
    const job = APP.jobs.find(j => j.id === jobId);
    if (job) { job.status = 'done'; renderHome(); renderJobsBadge(); }
    showToast('✅ บันทึกงานเสร็จแล้ว');
    callAPI('transitionJob', { job_id: jobId, new_status: 'งานเสร็จ', changed_by: (APP.user && APP.user.name) || APP.user || 'PWA' });
  }
}

function assignJob(jobId) { if (typeof openAssignJob === 'function') openAssignJob(jobId || ''); else showToast('กำลังเปิดหน้ามอบหมายช่าง...'); }

function openCameraForJob(jobId) {
  const input = document.getElementById('camera-input');
  input.dataset.jobId = jobId;
  input.click();
}

function openCamera(type) {
  const input = document.getElementById('camera-input');
  input.dataset.type = type;
  input.click();
}

function openCameraQuick() { openCamera('job'); }
function markDone() { showToast('เลือกงานที่ต้องการก่อน'); goPage('jobs', document.getElementById('nav-jobs')); }
function markWaiting() { showToast('เลือกงานที่ต้องการก่อน'); goPage('jobs', document.getElementById('nav-jobs')); }
function callForHelp() {
  // ส่ง LINE แจ้งเจ้าของร้านว่าช่างต้องการความช่วยเหลือ
  const user = APP.user || {};
  const jobId = APP.currentJobId || '';
  if (typeof QA !== 'undefined' && typeof QA.nudgeTech === 'function') {
    QA.nudgeTech({ jobId, techName: user.display_name || user.username || 'ช่าง', message: '🆘 ต้องการความช่วยเหลือ' });
  } else {
    callAPI('sendLineMessage', {
      message: `🆘 [ขอความช่วยเหลือ] ช่าง ${user.display_name || user.username || 'ช่าง'} ต้องการความช่วยเหลือ${jobId ? ' งาน #' + jobId : ''}`,
      room: 'OWNER',
      sent_by: user.username || 'system'
    }).then(() => showToast('✅ แจ้งเจ้าของร้านแล้ว 🆘')).catch(() => showToast('⚠️ ส่งไม่ได้ — ตรวจสอบ LINE Token'));
  }
}
function openNewJob() {
  // job_workflow.js โหลดแล้ว เรียกได้ตรงๆ
  if (document.getElementById('modal-new-job-content')) {
    // openNewJob จาก job_workflow.js override window.openNewJob แล้ว
    // แต่ถ้ายังไม่โหลด ใช้ fallback
    showToast('กำลังเปิดฟอร์มงานใหม่...');
  } else {
    showToast('กำลังเปิดฟอร์มงานใหม่...');
  }
}
function openNewJob_delayed() { const fn = setInterval(() => { if(typeof openNewJob === 'function' && document.getElementById('modal-new-job-content')) { clearInterval(fn); openNewJob(); } }, 100); setTimeout(() => clearInterval(fn), 3000); }
function addCustomer() {
  if (typeof openAddCustomerModal === 'function') openAddCustomerModal();
  else showToast('กำลังเปิดฟอร์มลูกค้าใหม่...');
}
function callCustomer(phone) { if (phone) window.location.href = 'tel:' + phone; else showToast('กำลังเปิดรายชื่อลูกค้า...'); }
function sendLine() {
  if (typeof QA !== 'undefined' && typeof QA.sendLine === 'function') QA.sendLine();
  else showToast('กำลังเปิด LINE...');
}
function nudgeTech() {
  if (typeof QA !== 'undefined' && typeof QA.nudgeTech === 'function') QA.nudgeTech();
  else showToast('ส่งการแจ้งเตือนช่างแล้ว 🔔');
}
function viewReport() { goPage('reports', document.getElementById('nav-reports')); }
function addAppointment() {
  if (typeof QA !== 'undefined' && typeof QA.addAppointment === 'function') QA.addAppointment();
  else showToast('กำลังเปดปฏิทิน...');
}
function moreActions() {
  // แสดง bottom sheet เมนูเพิ่มเติม
  const items = [
    { label: '📦 คลังสินค้า', action: () => goPage('inventory', document.getElementById('nav-inventory')) },
    { label: '🧾 ใบสั่งซื้อ', action: () => { if (typeof openPurchaseOrders === 'function') openPurchaseOrders(); else goPage('inventory', null); } },
    { label: '📊 รายงาน', action: () => goPage('reports', document.getElementById('nav-reports')) },
    { label: '🔔 การแจ้งเตือน', action: () => goPage('notifications', null) },
    { label: '⚙️ ตั้งค่า', action: () => goPage('admin', document.getElementById('nav-admin')) }
  ];
  const html = items.map(it => `<button class="btn btn-light w-100 text-start mb-2" onclick="this.closest('.modal').querySelector('[data-bs-dismiss]').click();(${it.action.toString()})()">${it.label}</button>`).join('');
  const modal = document.getElementById('modal-more-actions');
  if (modal) {
    modal.querySelector('#more-actions-body').innerHTML = html;
    new bootstrap.Modal(modal).show();
  } else {
    // fallback: ไปหน้า admin
    goPage('admin', document.getElementById('nav-admin'));
  }
}
function openPO() { openPurchaseOrders(); }
function scanSlip() { openCamera('slip'); }
function createReceipt() {
  // เปิด Billing modal — เลือกงานจากรายการงาน
  if (typeof openBillingModal === 'function') openBillingModal(null);
  else showToast('กำลังโหลด Billing module...');
}
function showQR() {
  // เปิด QR PromptPay modal
  if (typeof openQRPaymentModal === 'function') openQRPaymentModal(null);
  else showToast('กำลังโหลด QR module...');
}
function createBill() {
  // เปิด Billing modal — เหมือน createReceipt
  if (typeof openBillingModal === 'function') openBillingModal(null);
  else showToast('กำลังโหลด Billing module...');
}
function viewDashboard() { const navBtn = document.getElementById('nav-dashboard'); goPage('dashboard', navBtn); }
function urgentAction() {
  // ผู้บริหาร: ดู jobs ที่ urgent หรือ SLA เกิน
  goPage('jobs', document.getElementById('nav-jobs'));
  setTimeout(() => {
    const urgentFilter = document.getElementById('filter-urgent');
    if (urgentFilter) urgentFilter.click();
    else showToast('🔴 กรองงานด่วนแล้ว');
  }, 400);
}
function callVIP() {
  // ผู้บริหาร: ไปหน้า CRM เพื่อดูลูกค้า VIP
  goPage('crm', document.getElementById('nav-crm'));
  setTimeout(() => {
    if (typeof loadCRMPage === 'function') loadCRMPage();
  }, 300);
}
function viewPL() {
  if (typeof REPORTS === 'undefined') {
    goPage('reports', document.getElementById('nav-reports'));
    return;
  }
  REPORTS.currentTab = 'pl';
  goPage('reports', document.getElementById('nav-reports'));
}
function fabAction() {
  const actions = { tech: openCameraQuick, admin: openNewJob, acct: scanSlip, exec: viewDashboard };
  (actions[APP.role] || openNewJob)();
}

function handlePhoto(input) {
  const file = input.files[0];
  if (!file) return;

  // ตรวจขนาดไฟล์ (max 10MB)
  if (file.size > 10 * 1024 * 1024) {
    showToast('⚠️ ไฟล์ใหญ่เกินไป (max 10MB)');
    input.value = '';
    return;
  }

  const jobId = input.dataset.jobId || '';
  const type = input.dataset.type || 'job';
  const techName = (APP.user && (APP.user.name || APP.user.username)) || 'Unknown';

  showToast('📸 กำลังอ่านรูป...');

  const reader = new FileReader();
  reader.onload = async (e) => {
    const base64Full = e.target.result; // data:image/jpeg;base64,...
    const base64Data = base64Full.split(',')[1]; // เอาเฉพาะ base64 string
    const mimeType = file.type || 'image/jpeg';
    const fileName = file.name || `photo_${Date.now()}.jpg`;

    // แสดง preview
    showPhotoPreview_(base64Full, jobId, type);

    if (!navigator.onLine) {
      // Offline: บันทึกลง IndexedDB/localStorage
      showToast('📥 Offline — บันทึกไว้ จะ Sync เมื่อออนไลน์');
      saveOfflineAction({
        action: 'handleProcessPhotos',
        params: { base64: base64Data, mimeType, fileName, jobId, photoType: type, techName },
        time: Date.now()
      });
      input.value = '';
      return;
    }

    showToast('☁️ กำลังอัปโหลด...');

    try {
      const res = await callAPI('handleProcessPhotos', {
        base64: base64Data,
        mimeType,
        fileName,
        jobId,
        photoType: type,
        techName,
        username: techName
      });

      if (res && res.success) {
        showToast('✅ อัปโหลดรูปสำเร็จ!');
        // Refresh photo grid ถ้าอยู่หน้า camera
        if (document.getElementById('page-camera').classList.contains('active')) {
          loadRecentPhotos_(jobId);
        }
      } else {
        const errMsg = (res && res.error) || 'ไม่ทราบสาเหตุ';
        showToast('⚠️ อัปโหลดไม่สำเร็จ: ' + errMsg);
        // Fallback: save to offline queue
        saveOfflineAction({
          action: 'handleProcessPhotos',
          params: { base64: base64Data, mimeType, fileName, jobId, photoType: type, techName },
          time: Date.now()
        });
      }
    } catch (err) {
      showToast('⚠️ เน็ตเวิร์คขัดข้อง — บันทึกไว้ใน Queue');
      saveOfflineAction({
        action: 'handleProcessPhotos',
        params: { base64: base64Data, mimeType, fileName, jobId, photoType: type, techName },
        time: Date.now()
      });
    }
  };

  reader.onerror = () => showToast('❌ อ่านไฟล์ไม่ได้');
  reader.readAsDataURL(file);
  input.value = '';
}

// แสดง preview รูปที่เลือก
 function showPhotoPreview_(dataUrl, jobId, type) {
  const area = document.getElementById('photo-preview-area');
  if (!area) return;
  area.innerHTML = `
    <div class="photo-preview-wrap">
      <img src="${dataUrl}" class="photo-preview-img" alt="Preview">
      <div class="photo-preview-meta">
        <span class="badge bg-primary">${type === 'slip' ? '🧾 สลิป' : type === 'bill' ? '📄 บิล' : '📸 หน้างาน'}</span>
        ${jobId ? `<span class="badge bg-secondary">${jobId}</span>` : ''}
      </div>
    </div>`;
}

// โหลดรูปล่าสุดของงาน
async function loadRecentPhotos_(jobId) {
  const grid = document.getElementById('photo-grid');
  if (!grid) return;
  if (!jobId) { grid.innerHTML = '<p style="color:#9ca3af;font-size:13px;">เลือกงานก่อนเพื่อดูรูป</p>'; return; }
  grid.innerHTML = '<div class="spinner-border spinner-border-sm"></div>';
  const res = await callAPI('getPhotoGalleryData', { jobId });
  if (res && res.success && res.data && res.data.photos) {
    const photos = res.data.photos.slice(0, 12);
    grid.innerHTML = photos.map(p =>
      `<div class="photo-thumb" onclick="window.open('${p.url || p.driveUrl}','_blank')">
        <img src="${p.thumbnailUrl || p.url || p.driveUrl}" alt="photo" loading="lazy">
      </div>`
    ).join('') || '<p style="color:#9ca3af;font-size:13px;">ยังไม่มีรูป</p>';
  } else {
    grid.innerHTML = '<p style="color:#9ca3af;font-size:13px;">ไม่พบรูป</p>';
  }
}
