/* ===== EXECUTIVE DASHBOARD MODULE — COMPHONE SUPER APP v5.5.4 ===== */
'use strict';

// ===== STATE =====
let DASHBOARD_DATA = null;
let DASHBOARD_CHART = null; // Chart.js instance

// ===== LOAD DASHBOARD =====
function loadDashboardPage() {
  const container = document.getElementById('dashboard-content');
  if (!container) return;

  container.innerHTML = `
    <div style="text-align:center;padding:48px 16px;color:#9ca3af">
      <div class="spinner" style="margin:0 auto 16px;width:36px;height:36px"></div>
      <p style="font-size:14px">กำลังโหลด Dashboard...</p>
    </div>`;

  callApi({ action: 'getDashboardData' }).then(res => {
    if (res && (res.success || res.totalJobs !== undefined)) {
      DASHBOARD_DATA = res;
      renderDashboard(res);
    } else {
      renderDashboardError(res && res.error ? res.error : 'ไม่สามารถโหลดข้อมูลได้');
    }
  }).catch(err => {
    renderDashboardError('ไม่สามารถเชื่อมต่อ GAS ได้');
  });
}

function renderDashboardError(msg) {
  const container = document.getElementById('dashboard-content');
  if (!container) return;
  container.innerHTML = `
    <div class="empty-state" style="padding:48px 16px">
      <i class="bi bi-wifi-off" style="font-size:40px;color:#d1d5db;display:block;margin-bottom:12px"></i>
      <p style="color:#6b7280;font-size:14px">${msg}</p>
      <button class="btn-add-job" onclick="loadDashboardPage()" style="margin-top:12px">
        <i class="bi bi-arrow-clockwise"></i> ลองใหม่
      </button>
    </div>`;
}

// ===== RENDER DASHBOARD =====
function renderDashboard(data) {
  const container = document.getElementById('dashboard-content');
  if (!container) return;

  const summary = data.summary || data;
  const revenue = summary.revenue || { today: 0, week: 0, month: 0 };
  const totalJobs = Number(summary.totalJobs || summary.total_jobs || 0);
  const overdueJobs = Number(summary.overdueJobs || summary.overdue_jobs || 0);
  const lowStock = Number(summary.lowStock || summary.low_stock || 0);
  const pmDue = Number(summary.pmDueCount || summary.pm_due_count || 0);
  const topTech = summary.topTechnician || null;
  // alerts อาจเป็น object { success, items } หรือ array
  const alertsRaw = data.alerts || summary.alerts || {};
  const alerts = Array.isArray(alertsRaw) ? alertsRaw : (alertsRaw.items || []);
  const recentJobs = (data.jobs || summary.recentJobs || []).slice(0, 8);
  // status_distribution อาจเป็น object { success, total_jobs, statuses } หรือ array
  const sdRaw = data.status_distribution || summary.status_distribution || {};
  const statusDist = Array.isArray(sdRaw) ? sdRaw :
    (sdRaw.statuses || []).filter(s => s.job_count > 0);
  const dateStr = summary.date || new Date().toLocaleDateString('th-TH');

  container.innerHTML = `
    <!-- HEADER ROW -->
    <div style="padding:12px 16px 4px;display:flex;justify-content:space-between;align-items:center">
      <div>
        <div style="font-size:11px;color:#9ca3af">อัปเดตล่าสุด</div>
        <div style="font-size:12px;font-weight:700;color:#374151">${dateStr}</div>
      </div>
      <button onclick="loadDashboardPage()" style="background:#f3f4f6;border:none;border-radius:20px;padding:6px 14px;font-size:12px;color:#374151;cursor:pointer;display:flex;align-items:center;gap:6px">
        <i class="bi bi-arrow-clockwise"></i> รีเฟรช
      </button>
    </div>

    <!-- KPI CARDS -->
    <div style="padding:8px 12px;display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div class="kpi-card" style="background:linear-gradient(135deg,#1e40af,#3b82f6)">
        <div class="kpi-icon"><i class="bi bi-clipboard2-check-fill"></i></div>
        <div class="kpi-value">${totalJobs}</div>
        <div class="kpi-label">งานทั้งหมด</div>
      </div>
      <div class="kpi-card" style="background:linear-gradient(135deg,#10b981,#059669)">
        <div class="kpi-icon"><i class="bi bi-currency-exchange"></i></div>
        <div class="kpi-value">฿${Number(revenue.today || 0).toLocaleString()}</div>
        <div class="kpi-label">รายรับวันนี้</div>
      </div>
      <div class="kpi-card ${overdueJobs > 0 ? 'kpi-alert' : ''}" style="background:${overdueJobs > 0 ? 'linear-gradient(135deg,#dc2626,#ef4444)' : 'linear-gradient(135deg,#6b7280,#9ca3af)'}">
        <div class="kpi-icon"><i class="bi bi-clock-history"></i></div>
        <div class="kpi-value">${overdueJobs}</div>
        <div class="kpi-label">งานเกิน SLA</div>
      </div>
      <div class="kpi-card ${lowStock > 0 ? 'kpi-alert' : ''}" style="background:${lowStock > 0 ? 'linear-gradient(135deg,#d97706,#f59e0b)' : 'linear-gradient(135deg,#6b7280,#9ca3af)'}">
        <div class="kpi-icon"><i class="bi bi-box-seam-fill"></i></div>
        <div class="kpi-value">${lowStock}</div>
        <div class="kpi-label">สต็อกต่ำ</div>
      </div>
    </div>

    <div id="business-ai-cards"></div>

    <!-- REVENUE CHART -->
    <div class="section-card" style="margin:0 12px 10px">
      <div class="section-label">รายรับ (บาท)</div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:12px">
        <div style="text-align:center;background:#f0fdf4;border-radius:12px;padding:10px">
          <div style="font-size:10px;color:#6b7280;font-weight:600">วันนี้</div>
          <div style="font-size:16px;font-weight:900;color:#10b981">฿${Number(revenue.today || 0).toLocaleString()}</div>
        </div>
        <div style="text-align:center;background:#eff6ff;border-radius:12px;padding:10px">
          <div style="font-size:10px;color:#6b7280;font-weight:600">สัปดาห์นี้</div>
          <div style="font-size:16px;font-weight:900;color:#3b82f6">฿${Number(revenue.week || 0).toLocaleString()}</div>
        </div>
        <div style="text-align:center;background:#fef3c7;border-radius:12px;padding:10px">
          <div style="font-size:10px;color:#6b7280;font-weight:600">เดือนนี้</div>
          <div style="font-size:16px;font-weight:900;color:#d97706">฿${Number(revenue.month || 0).toLocaleString()}</div>
        </div>
      </div>
      <div style="position:relative;height:140px">
        <canvas id="revenue-chart" style="width:100%;height:140px"></canvas>
      </div>
    </div>

    <!-- STATUS DISTRIBUTION -->
    ${statusDist.length > 0 ? `
    <div class="section-card" style="margin:0 12px 10px">
      <div class="section-label">สถานะงาน</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px">
        ${statusDist.map(s => `
        <div style="flex:1;min-width:80px;background:#f9fafb;border-radius:12px;padding:10px;text-align:center">
          <div style="font-size:18px;font-weight:900;color:#111827">${s.job_count || s.count || 0}</div>
          <div style="font-size:10px;color:#6b7280;font-weight:600">${s.status_label || s.label || s.status || '-'}</div>
        </div>`).join('')}
      </div>
    </div>` : ''}

    <!-- ALERTS -->
    ${alerts.length > 0 ? `
    <div class="section-card" style="margin:0 12px 10px">
      <div class="section-label" style="color:#ef4444">⚠️ แจ้งเตือนด่วน (${alerts.length})</div>
      ${alerts.slice(0, 5).map(a => `
      <div class="alert-card ${(a.type||'').toLowerCase().includes('overdue') ? 'danger' : (a.type||'').toLowerCase().includes('stock') ? 'warning' : 'success'}" style="margin-bottom:6px">
        <i class="bi ${ (a.type||'').includes('OVERDUE') || (a.type||'').includes('overdue') ? 'bi-clock-fill' : (a.type||'').includes('STOCK') || (a.type||'').includes('stock') ? 'bi-box-seam-fill' : 'bi-info-circle-fill'}"></i>
        <div style="flex:1">
          <div style="font-weight:700;font-size:13px">${a.message || (a.data && a.data.customer_name ? a.id+' — '+a.data.customer_name : '-')}</div>
          ${a.data && a.data.status_label ? `<div style="font-size:11px;font-weight:400">สถานะ: ${a.data.status_label}</div>` : ''}
        </div>
      </div>`).join('')}
    </div>` : ''}

    <!-- TOP TECHNICIAN -->
    ${topTech ? `
    <div class="section-card" style="margin:0 12px 10px">
      <div class="section-label">🏆 ช่างยอดเยี่ยมสัปดาห์นี้</div>
      <div style="display:flex;align-items:center;gap:14px;padding:8px 0">
        <div style="width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,#fbbf24,#d97706);display:flex;align-items:center;justify-content:center;color:white;font-weight:900;font-size:20px;flex-shrink:0">
          ${(topTech.name || '?')[0]}
        </div>
        <div style="flex:1">
          <div style="font-size:16px;font-weight:800;color:#111827">${topTech.name || '-'}</div>
          <div style="font-size:12px;color:#6b7280">${topTech.jobs_completed || 0} งานเสร็จ · ${topTech.kudos || 0} Kudos</div>
          <div style="color:#fbbf24;font-size:14px;margin-top:2px">${'★'.repeat(Math.min(5, Math.round(topTech.rating || 5)))}</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:22px;font-weight:900;color:#10b981">${topTech.jobs_completed || 0}</div>
          <div style="font-size:10px;color:#9ca3af">งาน</div>
        </div>
      </div>
    </div>` : ''}

    <!-- RECENT JOBS -->
    ${recentJobs.length > 0 ? `
    <div style="margin:0 12px 10px">
      <div class="section-label" style="padding:0 4px 8px">งานล่าสุด</div>
      ${recentJobs.map(job => renderDashboardJobRow(job)).join('')}
    </div>` : ''}

    <!-- PM DUE -->
    ${pmDue > 0 ? `
    <div class="section-card" style="margin:0 12px 10px;background:#fffbeb">
      <div style="display:flex;align-items:center;gap:12px">
        <i class="bi bi-calendar-check-fill" style="font-size:24px;color:#d97706"></i>
        <div>
          <div style="font-weight:700;color:#92400e">After-Sales ที่ต้องติดตาม</div>
          <div style="font-size:13px;color:#b45309">${pmDue} ราย รอการติดตาม</div>
        </div>
        <button onclick=\"goPage('crm', document.getElementById('nav-more'))\" style=\"margin-left:auto;background:#d97706;color:white;border:none;border-radius:20px;padding:6px 14px;font-size:12px;cursor:pointer\">ดูเลย</button>
      </div>
    </div>` : ''}

    <div style="height:16px"></div>
  `;

  // Draw revenue chart
  drawRevenueChart(revenue);

  // PHASE 27: Render Business AI cards
  if (typeof renderBusinessAICards === 'function') {
    setTimeout(renderBusinessAICards, 100);
  }
}

// ===== RENDER JOB ROW =====
function renderDashboardJobRow(job) {
  const statusMap = {
    'รับเครื่องแล้ว': { bg: '#dbeafe', color: '#1e40af' },
    'กำลังซ่อม':      { bg: '#fef3c7', color: '#92400e' },
    'รอชิ้นส่วน':     { bg: '#ffedd5', color: '#9a3412' },
    'เสร็จแล้ว':      { bg: '#d1fae5', color: '#065f46' },
    'ด่วน':           { bg: '#fee2e2', color: '#991b1b' },
    'PENDING':        { bg: '#dbeafe', color: '#1e40af' },
    'IN_PROGRESS':    { bg: '#fef3c7', color: '#92400e' },
    'WAITING_PARTS':  { bg: '#ffedd5', color: '#9a3412' },
    'DONE':           { bg: '#d1fae5', color: '#065f46' },
    'URGENT':         { bg: '#fee2e2', color: '#991b1b' }
  };
  const status = job.status || job.current_status || '-';
  const sc = statusMap[status] || { bg: '#f3f4f6', color: '#6b7280' };
  const jobId = job.job_id || job.id || '-';
  const customer = job.customer_name || job.customer || '-';
  const device = job.device || job.symptom || job.title || '-';

  return `
    <div class="job-card" style="margin-bottom:6px" onclick="showToast('${jobId}')">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div style="flex:1;min-width:0">
          <div style="font-size:10px;color:#9ca3af;font-weight:600">${jobId}</div>
          <div style="font-size:13px;font-weight:700;color:#111827;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${device}</div>
          <div style="font-size:11px;color:#6b7280"><i class="bi bi-person-fill"></i> ${customer}</div>
        </div>
        <span style="background:${sc.bg};color:${sc.color};padding:3px 10px;border-radius:20px;font-size:10px;font-weight:700;flex-shrink:0;margin-left:8px">${status}</span>
      </div>
    </div>`;
}

// ===== REVENUE CHART (Chart.js) =====
function drawRevenueChart(revenue) {
  const canvas = document.getElementById('revenue-chart');
  if (!canvas) return;

  // Destroy previous chart
  if (DASHBOARD_CHART) {
    DASHBOARD_CHART.destroy();
    DASHBOARD_CHART = null;
  }

  // Check if Chart.js loaded
  if (typeof Chart === 'undefined') {
    canvas.parentElement.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;height:140px">
        ${[['วันนี้', revenue.today, '#10b981'], ['สัปดาห์', revenue.week, '#3b82f6'], ['เดือน', revenue.month, '#d97706']].map(([label, val, color]) => `
        <div style="display:flex;flex-direction:column;justify-content:flex-end;align-items:center;gap:4px">
          <div style="font-size:11px;font-weight:700;color:${color}">฿${Number(val||0).toLocaleString()}</div>
          <div style="width:100%;background:${color};border-radius:6px 6px 0 0;height:${Math.max(20, Math.min(100, (Number(val||0) / Math.max(1, Number(revenue.month||1))) * 100))}px"></div>
          <div style="font-size:10px;color:#9ca3af">${label}</div>
        </div>`).join('')}
      </div>`;
    return;
  }

  const ctx = canvas.getContext('2d');
  DASHBOARD_CHART = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['วันนี้', 'สัปดาห์นี้', 'เดือนนี้'],
      datasets: [{
        data: [revenue.today || 0, revenue.week || 0, revenue.month || 0],
        backgroundColor: ['#10b981', '#3b82f6', '#d97706'],
        borderRadius: 8,
        borderSkipped: false
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => '฿' + Number(ctx.raw || 0).toLocaleString()
          }
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 11 } } },
        y: {
          grid: { color: '#f3f4f6' },
          ticks: {
            font: { size: 10 },
            callback: val => val >= 1000 ? '฿' + (val/1000).toFixed(0) + 'K' : '฿' + val
          }
        }
      }
    }
  });
}

// ===== REFRESH =====
function refreshDashboard() {
  DASHBOARD_DATA = null;
  loadDashboardPage();
}

// ===== QUICK ACTION =====
function viewDashboard() {
  const navBtn = document.getElementById('nav-more');
  goPage('dashboard', navBtn);
}
