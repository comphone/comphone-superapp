// COMPHONE SUPER APP V5.5
// ============================================================
// after_sales_enhanced.js — After Sales & Warranty Management UI
// เพิ่มความสามารถจาก crm_attendance.js ที่มีอยู่
// ============================================================

// ============================================================
// SECTION 1: After Sales Dashboard (หน้าหลัก)
// ============================================================
async function loadAfterSalesDashboard() {
  var container = document.getElementById('after-sales-content') ||
                  document.getElementById('section-aftersales') ||
                  document.getElementById('main-content');
  if (!container) return;

  container.innerHTML = '<div style="text-align:center;padding:2rem;color:#64748b;">' +
    '<i class="bi bi-hourglass-split" style="font-size:2rem;"></i><br>กำลังโหลด...</div>';

  try {
    var res = await callAPI('getAfterSalesSummary');
    var dueRes = await callAPI('getAfterSalesDue', { days: 7 });

    var summary = (res && res.success && res.data) ? res.data : {};
    var dueItems = (dueRes && dueRes.success && dueRes.records) ? dueRes.records : [];

    container.innerHTML = renderAfterSalesDashboard_(summary, dueItems);
  } catch (err) {
    container.innerHTML = '<div style="padding:1rem;color:#dc2626;">เกิดข้อผิดพลาด: ' + err.message + '</div>';
  }
}

function renderAfterSalesDashboard_(summary, dueItems) {
  var total = summary.total || 0;
  var pending = summary.pending || dueItems.length || 0;
  var completed = summary.completed || 0;
  var overdue = summary.overdue || 0;

  var dueHtml = dueItems.length === 0
    ? '<div style="text-align:center;padding:2rem;color:#94a3b8;"><i class="bi bi-check-circle" style="font-size:2rem;"></i><br>ไม่มีรายการที่ต้องติดตาม</div>'
    : dueItems.map(function(item) {
        var jobId = item.job_id || item.jobId || '';
        var custName = item.customer_name || item.customerName || 'ไม่ระบุ';
        var dueDate = item.due_date || item.dueDate || '';
        var status = item.status || 'pending';
        var isOverdue = item.is_overdue || false;
        return `
          <div style="background:#fff;border-radius:10px;padding:1rem;margin-bottom:0.75rem;
            border-left:4px solid ${isOverdue ? '#ef4444' : '#f59e0b'};">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;">
              <div>
                <div style="font-weight:600;font-size:0.95rem;">${custName}</div>
                <div style="font-size:0.8rem;color:#64748b;">งาน: ${jobId}</div>
                <div style="font-size:0.8rem;color:${isOverdue ? '#ef4444' : '#f59e0b'};font-weight:600;">
                  ${isOverdue ? '⚠️ เลยกำหนด' : '📅 ครบกำหนด'}: ${dueDate}
                </div>
              </div>
              <button onclick="openAfterSalesFollowUpModal('${jobId}','${custName}')"
                style="background:#1e40af;color:#fff;border:none;border-radius:8px;
                       padding:0.4rem 0.75rem;font-size:0.8rem;cursor:pointer;white-space:nowrap;">
                <i class="bi bi-chat-dots"></i> ติดตาม
              </button>
            </div>
          </div>`;
      }).join('');

  return `
    <div style="padding:1rem;max-width:600px;margin:0 auto;">
      <!-- Header -->
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
        <div>
          <h2 style="margin:0;font-size:1.2rem;font-weight:700;">After Sales</h2>
          <div style="font-size:0.8rem;color:#64748b;">ติดตามหลังการซ่อม / รับประกัน</div>
        </div>
        <button onclick="openCreateAfterSalesModal()"
          style="background:#1e40af;color:#fff;border:none;border-radius:8px;
                 padding:0.5rem 1rem;font-size:0.85rem;font-weight:600;cursor:pointer;">
          <i class="bi bi-plus-lg"></i> สร้างรายการ
        </button>
      </div>

      <!-- KPI Cards -->
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:0.5rem;margin-bottom:1rem;">
        ${[
          { label: 'ทั้งหมด', value: total, color: '#1e40af', icon: 'bi-list-ul' },
          { label: 'รอติดตาม', value: pending, color: '#f59e0b', icon: 'bi-clock' },
          { label: 'เสร็จสิ้น', value: completed, color: '#16a34a', icon: 'bi-check-circle' },
          { label: 'เลยกำหนด', value: overdue, color: '#ef4444', icon: 'bi-exclamation-triangle' }
        ].map(function(k) {
          return `<div style="background:#fff;border-radius:10px;padding:0.75rem;text-align:center;border-top:3px solid ${k.color};">
            <i class="bi ${k.icon}" style="font-size:1.2rem;color:${k.color};"></i>
            <div style="font-size:1.3rem;font-weight:700;color:${k.color};">${k.value}</div>
            <div style="font-size:0.7rem;color:#64748b;">${k.label}</div>
          </div>`;
        }).join('')}
      </div>

      <!-- Due Items -->
      <div style="font-weight:600;font-size:0.9rem;color:#374151;margin-bottom:0.5rem;">
        <i class="bi bi-bell"></i> ต้องติดตามใน 7 วัน (${dueItems.length} รายการ)
      </div>
      <div id="after-sales-due-list">${dueHtml}</div>
    </div>`;
}

// ============================================================
// SECTION 2: สร้าง After Sales Record จากงานที่ปิดแล้ว
// ============================================================
function openCreateAfterSalesModal() {
  var m = document.getElementById('modal-create-aftersales');
  if (!m) {
    m = createAfterSalesModal_();
  }
  // โหลดรายการงานที่ปิดแล้ว (status 11)
  loadClosedJobsForAfterSales_();
  m.classList.remove('hidden');
}

function closeCreateAfterSalesModal() {
  var m = document.getElementById('modal-create-aftersales');
  if (m) m.classList.add('hidden');
}

function createAfterSalesModal_() {
  var div = document.createElement('div');
  div.id = 'modal-create-aftersales';
  div.className = 'modal-overlay hidden';
  div.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:flex-end;justify-content:center;';
  div.innerHTML = `
    <div style="background:#fff;border-radius:16px 16px 0 0;width:100%;max-width:480px;padding:1.5rem;max-height:85vh;overflow-y:auto;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
        <h3 style="margin:0;font-size:1.1rem;font-weight:700;">สร้าง After Sales Record</h3>
        <button onclick="closeCreateAfterSalesModal()" style="background:none;border:none;font-size:1.5rem;cursor:pointer;">✕</button>
      </div>
      <div style="font-size:0.85rem;color:#64748b;margin-bottom:1rem;">เลือกงานที่ปิดแล้วเพื่อสร้างรายการติดตาม</div>
      <div id="closed-jobs-list" style="max-height:300px;overflow-y:auto;">
        <div style="text-align:center;padding:1rem;color:#94a3b8;">กำลังโหลด...</div>
      </div>
      <button onclick="closeCreateAfterSalesModal()"
        style="width:100%;margin-top:1rem;background:none;border:1px solid #e2e8f0;border-radius:8px;
               padding:0.6rem;font-size:0.85rem;color:#64748b;cursor:pointer;">ปิด</button>
    </div>`;
  document.body.appendChild(div);
  return div;
}

async function loadClosedJobsForAfterSales_() {
  var list = document.getElementById('closed-jobs-list');
  if (!list) return;
  try {
    var res = await callAPI('getJobs', { status: 11, limit: 20 });
    var jobs = (res && res.success && res.jobs) ? res.jobs : [];
    if (jobs.length === 0) {
      list.innerHTML = '<div style="text-align:center;padding:1rem;color:#94a3b8;">ไม่มีงานที่ปิดแล้ว</div>';
      return;
    }
    list.innerHTML = jobs.map(function(j) {
      var jobId = j.job_id || j.id || '';
      var custName = j.customer_name || j.ชื่อลูกค้า || '';
      var closedDate = j.updated_at || j.closed_at || '';
      return `
        <div style="background:#f8fafc;border-radius:8px;padding:0.75rem;margin-bottom:0.5rem;
          display:flex;justify-content:space-between;align-items:center;">
          <div>
            <div style="font-weight:600;font-size:0.9rem;">${custName}</div>
            <div style="font-size:0.75rem;color:#64748b;">${jobId} | ปิด: ${closedDate}</div>
          </div>
          <button onclick="createAfterSalesFromJob('${jobId}')"
            style="background:#16a34a;color:#fff;border:none;border-radius:8px;
                   padding:0.4rem 0.75rem;font-size:0.8rem;cursor:pointer;">
            <i class="bi bi-plus"></i> สร้าง
          </button>
        </div>`;
    }).join('');
  } catch (err) {
    list.innerHTML = '<div style="color:#dc2626;padding:1rem;">เกิดข้อผิดพลาด: ' + err.message + '</div>';
  }
}

async function createAfterSalesFromJob(jobId) {
  try {
    var res = await callAPI('createAfterSalesRecord', { job_id: jobId });
    if (res && res.success) {
      showToast('✅ สร้าง After Sales Record สำเร็จ');
      closeCreateAfterSalesModal();
      loadAfterSalesDashboard();
    } else {
      showToast('❌ ' + ((res && res.error) || 'สร้างไม่สำเร็จ'));
    }
  } catch (err) {
    showToast('❌ เกิดข้อผิดพลาด: ' + err.message);
  }
}

// ============================================================
// SECTION 3: Follow-up Modal
// ============================================================
function openAfterSalesFollowUpModal(jobId, customerName) {
  var m = document.getElementById('modal-aftersales-followup');
  if (!m) {
    m = createFollowUpModal_();
  }
  document.getElementById('aftersales-job-id').value = jobId;
  document.getElementById('aftersales-customer-name').textContent = customerName || jobId;
  document.getElementById('aftersales-note').value = '';
  document.getElementById('aftersales-next-action').value = '';
  m.classList.remove('hidden');
}

function closeAfterSalesFollowUpModal() {
  var m = document.getElementById('modal-aftersales-followup');
  if (m) m.classList.add('hidden');
}

function createFollowUpModal_() {
  var div = document.createElement('div');
  div.id = 'modal-aftersales-followup';
  div.className = 'modal-overlay hidden';
  div.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:flex-end;justify-content:center;';
  div.innerHTML = `
    <div style="background:#fff;border-radius:16px 16px 0 0;width:100%;max-width:480px;padding:1.5rem;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
        <h3 style="margin:0;font-size:1.1rem;font-weight:700;">บันทึกการติดตาม</h3>
        <button onclick="closeAfterSalesFollowUpModal()" style="background:none;border:none;font-size:1.5rem;cursor:pointer;">✕</button>
      </div>
      <div style="font-weight:600;font-size:0.9rem;color:#1e40af;margin-bottom:1rem;" id="aftersales-customer-name"></div>
      <input type="hidden" id="aftersales-job-id">
      <div style="margin-bottom:0.75rem;">
        <label style="font-size:0.85rem;font-weight:600;color:#374151;display:block;margin-bottom:0.25rem;">บันทึกการติดตาม</label>
        <textarea id="aftersales-note" rows="3" placeholder="เช่น โทรหาลูกค้าแล้ว ลูกค้าพอใจ / ลูกค้าแจ้งปัญหาเพิ่มเติม..."
          style="width:100%;border:1px solid #e2e8f0;border-radius:8px;padding:0.6rem;font-size:0.9rem;resize:none;box-sizing:border-box;"></textarea>
      </div>
      <div style="margin-bottom:1rem;">
        <label style="font-size:0.85rem;font-weight:600;color:#374151;display:block;margin-bottom:0.25rem;">การดำเนินการถัดไป</label>
        <select id="aftersales-next-action"
          style="width:100%;border:1px solid #e2e8f0;border-radius:8px;padding:0.6rem;font-size:0.9rem;">
          <option value="">-- เลือก --</option>
          <option value="completed">✅ เสร็จสิ้น — ไม่ต้องติดตามแล้ว</option>
          <option value="call_again">📞 โทรติดตามอีกครั้ง</option>
          <option value="visit">🔧 นัดเข้าซ่อมเพิ่มเติม</option>
          <option value="warranty_claim">🛡️ เคลมประกัน</option>
          <option value="escalate">⚠️ ส่งต่อผู้จัดการ</option>
        </select>
      </div>
      <div style="display:flex;gap:0.5rem;">
        <button onclick="saveAfterSalesFollowUp()"
          style="flex:1;background:#1e40af;color:#fff;border:none;border-radius:8px;padding:0.75rem;font-size:0.9rem;font-weight:600;cursor:pointer;">
          <i class="bi bi-save"></i> บันทึก
        </button>
        <button onclick="closeAfterSalesFollowUpModal()"
          style="flex:1;background:none;border:1px solid #e2e8f0;border-radius:8px;padding:0.75rem;font-size:0.9rem;cursor:pointer;">
          ยกเลิก
        </button>
      </div>
    </div>`;
  document.body.appendChild(div);
  return div;
}

async function saveAfterSalesFollowUp() {
  var jobId = (document.getElementById('aftersales-job-id') || {}).value || '';
  var note = (document.getElementById('aftersales-note') || {}).value || '';
  var nextAction = (document.getElementById('aftersales-next-action') || {}).value || '';
  var user = (typeof APP !== 'undefined' && APP.user) ? APP.user.name : 'ระบบ';

  if (!note.trim()) { showToast('กรุณากรอกบันทึกการติดตาม'); return; }

  try {
    var res = await callAPI('logAfterSalesFollowUp', {
      record_id: jobId,
      note: note.trim(),
      followup_by: user,
      next_action: nextAction
    });
    if (res && res.success) {
      showToast('✅ บันทึกการติดตามเรียบร้อย');
      closeAfterSalesFollowUpModal();
      loadAfterSalesDashboard();
    } else {
      showToast('❌ ' + ((res && res.error) || 'บันทึกไม่สำเร็จ'));
    }
  } catch (err) {
    showToast('❌ เกิดข้อผิดพลาด: ' + err.message);
  }
}

// ============================================================
// SECTION 4: Quick Clock In/Out Widget (สำหรับหน้า Home ช่าง)
// ============================================================
async function renderAttendanceWidget(containerId) {
  var container = document.getElementById(containerId);
  if (!container) return;

  var user = (typeof APP !== 'undefined' && APP.user) ? APP.user : null;
  if (!user || user.role !== 'tech') return; // แสดงเฉพาะช่าง

  try {
    var res = await callAPI('getTechHistory', {
      tech: user.name || user.username,
      days: 1
    });
    var todayAtt = (res && res.attendance && res.attendance.length > 0) ? res.attendance[0] : null;
    var isClockedIn = todayAtt && todayAtt.clockIn && !todayAtt.clockOut;
    var isClockedOut = todayAtt && todayAtt.clockIn && todayAtt.clockOut;

    container.innerHTML = `
      <div style="background:${isClockedIn ? '#f0fdf4' : '#fafafa'};border:1px solid ${isClockedIn ? '#bbf7d0' : '#e2e8f0'};
        border-radius:12px;padding:1rem;margin-bottom:1rem;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div>
            <div style="font-weight:700;font-size:0.9rem;color:#374151;">
              ${isClockedIn ? '🟢 กำลังทำงาน' : isClockedOut ? '✅ เสร็จงานแล้ว' : '⚪ ยังไม่เช็คอิน'}
            </div>
            ${todayAtt ? `<div style="font-size:0.75rem;color:#64748b;">
              เข้า: ${todayAtt.clockIn || '-'} | ออก: ${todayAtt.clockOut || '-'}
            </div>` : ''}
          </div>
          <div style="display:flex;gap:0.5rem;">
            ${!isClockedIn && !isClockedOut ? `
              <button onclick="doClockAction('in')"
                style="background:#16a34a;color:#fff;border:none;border-radius:8px;padding:0.5rem 0.75rem;font-size:0.8rem;font-weight:600;cursor:pointer;">
                <i class="bi bi-box-arrow-in-right"></i> เช็คอิน
              </button>` : ''}
            ${isClockedIn ? `
              <button onclick="doClockAction('out')"
                style="background:#dc2626;color:#fff;border:none;border-radius:8px;padding:0.5rem 0.75rem;font-size:0.8rem;font-weight:600;cursor:pointer;">
                <i class="bi bi-box-arrow-right"></i> เช็คเอาท์
              </button>` : ''}
          </div>
        </div>
      </div>`;
  } catch (err) {
    container.innerHTML = '';
  }
}

async function doClockAction(type) {
  var user = (typeof APP !== 'undefined' && APP.user) ? APP.user : null;
  if (!user) { showToast('กรุณาเข้าสู่ระบบก่อน'); return; }

  var action = type === 'in' ? 'clockIn' : 'clockOut';
  var label = type === 'in' ? 'เช็คอิน' : 'เช็คเอาท์';

  try {
    var res = await callAPI(action, { tech: user.name || user.username, note: '' });
    if (res && res.success) {
      showToast('✅ ' + label + 'สำเร็จ — ' + new Date().toLocaleTimeString('th-TH'));
      // รีเฟรช widget
      var widgetId = 'attendance-widget';
      if (document.getElementById(widgetId)) renderAttendanceWidget(widgetId);
    } else {
      showToast('❌ ' + ((res && res.error) || label + 'ไม่สำเร็จ'));
    }
  } catch (err) {
    showToast('❌ เกิดข้อผิดพลาด: ' + err.message);
  }
}

// ============================================================
// Expose to global
// ============================================================
window.loadAfterSalesDashboard = loadAfterSalesDashboard;
window.openCreateAfterSalesModal = openCreateAfterSalesModal;
window.closeCreateAfterSalesModal = closeCreateAfterSalesModal;
window.createAfterSalesFromJob = createAfterSalesFromJob;
window.openAfterSalesFollowUpModal = openAfterSalesFollowUpModal;
window.closeAfterSalesFollowUpModal = closeAfterSalesFollowUpModal;
window.saveAfterSalesFollowUp = saveAfterSalesFollowUp;
window.renderAttendanceWidget = renderAttendanceWidget;
window.doClockAction = doClockAction;
