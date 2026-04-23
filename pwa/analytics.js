// ============================================================
// COMPHONE SUPER APP V5.5
// analytics.js — Dashboard Analytics (Chart.js)
// Version: 5.6.0
// ============================================================
// ฟีเจอร์:
//   3a. loadDashboardPage()   — โหลดข้อมูล + render ทั้งหมด
//   3b. renderKPICards()      — KPI 4 cards (Revenue, Jobs, LowStock, Overdue)
//   3c. renderJobStatusChart()— Doughnut chart สถานะงาน
//   3d. renderRevenueChart()  — Bar chart รายได้ Today/Week/Month
//   3e. renderTopTechCard()   — Top Technician card
//   3f. renderAlertList()     — รายการ alerts
//   3g. refreshDashboard()    — refresh ด้วยตนเอง
// ============================================================

'use strict';

// ============================================================
// STATE
// ============================================================
const ANALYTICS = {
  data:          null,
  charts:        {},     // { jobStatus: Chart, revenue: Chart }
  refreshTimer:  null,
  isLoading:     false,
  lastUpdated:   null,
  REFRESH_MS:    5 * 60 * 1000, // auto-refresh ทุก 5 นาที
};

// สีสำหรับ job status
const STATUS_COLORS = {
  'OPEN':        '#3b82f6',
  'PENDING':     '#f59e0b',
  'IN_PROGRESS': '#8b5cf6',
  'WAITING_PART':'#f97316',
  'DONE':        '#22c55e',
  'CLOSED':      '#6b7280',
  'CANCELLED':   '#ef4444',
};

// ============================================================
// 3a. LOAD DASHBOARD PAGE
// ============================================================
/**
 * โหลดข้อมูล Dashboard และ render ทั้งหมด
 */
async function loadDashboardPage() {
  if (ANALYTICS.isLoading) return;
  ANALYTICS.isLoading = true;

  const container = document.getElementById('dashboard-content');
  if (!container) { ANALYTICS.isLoading = false; return; }

  // แสดง skeleton loading
  container.innerHTML = _buildSkeletonHTML_();

  try {
    // โหลด Chart.js ถ้ายังไม่ได้โหลด
    await _loadChartJS_();

    // ดึงข้อมูลจาก GAS
    const result = await callAPI('getDashboardData');

    if (!result || !result.success) {
      throw new Error(result?.error || 'โหลดข้อมูลไม่สำเร็จ');
    }

    const summary = result.summary || result;
    ANALYTICS.data = summary;
    ANALYTICS.lastUpdated = new Date();

    // Render ทุก component
    container.innerHTML = _buildDashboardHTML_();
    renderKPICards(summary);
    renderJobStatusChart(summary.status_distribution || []);
    renderRevenueChart(summary.revenue || {});
    renderTopTechCard(summary.topTechnician);
    renderAlertList(summary.alerts || []);
    _renderLastUpdated_();

    // ตั้ง auto-refresh
    _startAutoRefresh_();

  } catch (err) {
    container.innerHTML = _buildErrorHTML_(err.message);
    console.error('[Analytics] loadDashboardPage error:', err);
  } finally {
    ANALYTICS.isLoading = false;
  }
}

// ============================================================
// 3b. KPI CARDS
// ============================================================
/**
 * Render KPI Cards 4 ใบ
 * @param {Object} summary
 */
function renderKPICards(summary) {
  const container = document.getElementById('analytics-kpi-cards');
  if (!container) return;

  const revenue = summary.revenue || {};
  const cards = [
    {
      icon:  'bi-currency-exchange',
      color: '#22c55e',
      bg:    '#f0fdf4',
      label: 'รายได้วันนี้',
      value: `฿${_fmt_(revenue.today || 0)}`,
      sub:   `เดือนนี้: ฿${_fmt_(revenue.month || 0)}`,
    },
    {
      icon:  'bi-clipboard2-check-fill',
      color: '#3b82f6',
      bg:    '#eff6ff',
      label: 'งานทั้งหมด',
      value: _fmtNum_(summary.totalJobs || 0),
      sub:   `เกินกำหนด: ${summary.overdueJobs || 0} งาน`,
      subColor: (summary.overdueJobs || 0) > 0 ? '#dc2626' : '#6b7280',
    },
    {
      icon:  'bi-boxes',
      color: '#f59e0b',
      bg:    '#fffbeb',
      label: 'สินค้าในคลัง',
      value: _fmtNum_(summary.totalItems || 0),
      sub:   `ใกล้หมด: ${summary.lowStock || 0} รายการ`,
      subColor: (summary.lowStock || 0) > 0 ? '#dc2626' : '#6b7280',
    },
    {
      icon:  'bi-person-check-fill',
      color: '#8b5cf6',
      bg:    '#f5f3ff',
      label: 'ช่างยอดเยี่ยม',
      value: summary.topTechnician?.name || '-',
      sub:   summary.topTechnician ? `${summary.topTechnician.job_count || 0} งาน` : 'ยังไม่มีข้อมูล',
    },
  ];

  container.innerHTML = cards.map(card => `
    <div style="background:${card.bg};border-radius:12px;padding:14px 16px;flex:1;min-width:140px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
        <i class="bi ${card.icon}" style="font-size:18px;color:${card.color}"></i>
        <span style="font-size:11px;color:#6b7280;font-weight:600">${card.label}</span>
      </div>
      <div style="font-size:22px;font-weight:800;color:#111827;line-height:1">${card.value}</div>
      <div style="font-size:11px;color:${card.subColor || '#6b7280'};margin-top:4px">${card.sub}</div>
    </div>`).join('');
}

// ============================================================
// 3c. JOB STATUS DOUGHNUT CHART
// ============================================================
/**
 * Render Doughnut Chart สถานะงาน
 * @param {Array} statusDistribution - [{ status, count }]
 */
function renderJobStatusChart(statusDistribution) {
  const canvas = document.getElementById('chart-job-status');
  if (!canvas || typeof Chart === 'undefined') return;

  // Destroy chart เดิมถ้ามี
  if (ANALYTICS.charts.jobStatus) {
    ANALYTICS.charts.jobStatus.destroy();
    delete ANALYTICS.charts.jobStatus;
  }

  if (!statusDistribution || statusDistribution.length === 0) {
    canvas.parentElement.innerHTML = '<div style="text-align:center;color:#9ca3af;padding:20px;font-size:13px">ไม่มีข้อมูลงาน</div>';
    return;
  }

  const labels = statusDistribution.map(s => _statusLabel_(s.status || s.name || s.key));
  const data   = statusDistribution.map(s => s.count || s.value || 0);
  const colors = statusDistribution.map(s => STATUS_COLORS[s.status || s.name || s.key] || '#9ca3af');

  ANALYTICS.charts.jobStatus = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors,
        borderWidth: 2,
        borderColor: '#fff',
        hoverOffset: 6,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            font: { size: 11, family: 'Sarabun, sans-serif' },
            padding: 10,
            boxWidth: 12,
          }
        },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.label}: ${ctx.raw} งาน (${_pct_(ctx.raw, data)}%)`
          }
        }
      }
    }
  });
}

// ============================================================
// 3d. REVENUE BAR CHART
// ============================================================
/**
 * Render Bar Chart รายได้
 * @param {Object} revenue - { today, week, month }
 */
function renderRevenueChart(revenue) {
  const canvas = document.getElementById('chart-revenue');
  if (!canvas || typeof Chart === 'undefined') return;

  if (ANALYTICS.charts.revenue) {
    ANALYTICS.charts.revenue.destroy();
    delete ANALYTICS.charts.revenue;
  }

  const labels = ['วันนี้', 'สัปดาห์นี้', 'เดือนนี้'];
  const data   = [revenue.today || 0, revenue.week || 0, revenue.month || 0];
  const maxVal = Math.max(...data, 1);

  ANALYTICS.charts.revenue = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'รายได้ (฿)',
        data,
        backgroundColor: ['#22c55e', '#3b82f6', '#8b5cf6'],
        borderRadius: 8,
        borderSkipped: false,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ` ฿${_fmt_(ctx.raw)}`
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          max: Math.ceil(maxVal * 1.2),
          ticks: {
            font: { size: 10 },
            callback: v => `฿${_fmtK_(v)}`
          },
          grid: { color: '#f3f4f6' }
        },
        x: {
          ticks: { font: { size: 11, family: 'Sarabun, sans-serif' } },
          grid: { display: false }
        }
      }
    }
  });
}

// ============================================================
// 3e. TOP TECHNICIAN CARD
// ============================================================
/**
 * Render Top Technician Card
 * @param {Object|null} tech
 */
function renderTopTechCard(tech) {
  const container = document.getElementById('analytics-top-tech');
  if (!container) return;

  if (!tech) {
    container.innerHTML = '<div style="text-align:center;color:#9ca3af;padding:12px;font-size:13px">ยังไม่มีข้อมูล</div>';
    return;
  }

  const initial = (tech.name || '?').charAt(0).toUpperCase();
  container.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;padding:8px 0">
      <div style="width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#8b5cf6,#3b82f6);
        display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;color:#fff;flex-shrink:0">
        ${initial}
      </div>
      <div style="flex:1">
        <div style="font-weight:700;font-size:15px;color:#111827">${tech.name || '-'}</div>
        <div style="font-size:12px;color:#6b7280;margin-top:2px">
          ${tech.job_count || 0} งานเสร็จ
          ${tech.avg_rating ? ` · ⭐ ${Number(tech.avg_rating).toFixed(1)}` : ''}
        </div>
      </div>
      <div style="text-align:right">
        <div style="font-size:11px;color:#6b7280">รายได้</div>
        <div style="font-weight:700;color:#22c55e;font-size:14px">฿${_fmt_(tech.revenue || 0)}</div>
      </div>
    </div>`;
}

// ============================================================
// 3f. ALERT LIST
// ============================================================
/**
 * Render Alert List
 * @param {Array} alerts
 */
function renderAlertList(alerts) {
  const container = document.getElementById('analytics-alerts');
  if (!container) return;

  if (!alerts || alerts.length === 0) {
    container.innerHTML = '<div style="text-align:center;color:#9ca3af;padding:12px;font-size:13px">✅ ไม่มี alerts</div>';
    return;
  }

  const ALERT_ICONS = {
    low_stock:    { icon: '📦', color: '#f59e0b', bg: '#fffbeb' },
    overdue:      { icon: '⏰', color: '#ef4444', bg: '#fef2f2' },
    pm_due:       { icon: '🔧', color: '#8b5cf6', bg: '#f5f3ff' },
    pending_photo:{ icon: '📸', color: '#3b82f6', bg: '#eff6ff' },
    default:      { icon: '⚠️', color: '#6b7280', bg: '#f9fafb' },
  };

  container.innerHTML = alerts.slice(0, 5).map(alert => {
    const type  = alert.type || 'default';
    const style = ALERT_ICONS[type] || ALERT_ICONS.default;
    return `
      <div style="display:flex;align-items:center;gap:10px;padding:8px 10px;
        background:${style.bg};border-radius:8px;margin-bottom:6px">
        <span style="font-size:16px">${style.icon}</span>
        <div style="flex:1">
          <div style="font-size:13px;font-weight:600;color:${style.color}">${alert.title || alert.message || '-'}</div>
          ${alert.detail ? `<div style="font-size:11px;color:#6b7280;margin-top:1px">${alert.detail}</div>` : ''}
        </div>
      </div>`;
  }).join('');
}

// ============================================================
// 3g. REFRESH DASHBOARD
// ============================================================
/**
 * Refresh Dashboard ด้วยตนเอง
 */
async function refreshDashboard() {
  const btn = document.getElementById('dashboard-refresh-btn');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="bi bi-arrow-clockwise" style="animation:spin 1s linear infinite"></i>';
  }

  await loadDashboardPage();

  if (btn) {
    btn.disabled = false;
    btn.innerHTML = '<i class="bi bi-arrow-clockwise"></i>';
  }
}

// ============================================================
// HTML BUILDERS
// ============================================================
function _buildDashboardHTML_() {
  return `
    <!-- Header -->
    <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px 8px">
      <div>
        <div style="font-size:18px;font-weight:700;color:#111827">Executive Dashboard</div>
        <div id="dashboard-last-updated" style="font-size:11px;color:#9ca3af;margin-top:1px"></div>
      </div>
      <button id="dashboard-refresh-btn" onclick="refreshDashboard()"
        style="padding:7px 10px;background:#f3f4f6;border:none;border-radius:8px;cursor:pointer;font-size:16px"
        title="รีเฟรช">
        <i class="bi bi-arrow-clockwise"></i>
      </button>
    </div>

    <!-- KPI Cards -->
    <div style="padding:0 12px 12px">
      <div id="analytics-kpi-cards" style="display:flex;gap:8px;overflow-x:auto;padding-bottom:4px"></div>
    </div>

    <!-- Job Status Chart -->
    <div style="padding:0 12px 12px">
      <div style="background:#fff;border-radius:12px;padding:14px;box-shadow:0 1px 3px rgba(0,0,0,0.08)">
        <div style="font-size:13px;font-weight:700;color:#374151;margin-bottom:12px">
          <i class="bi bi-pie-chart-fill" style="color:#3b82f6;margin-right:6px"></i>สถานะงานทั้งหมด
        </div>
        <div style="height:200px;position:relative">
          <canvas id="chart-job-status"></canvas>
        </div>
      </div>
    </div>

    <!-- Revenue Chart -->
    <div style="padding:0 12px 12px">
      <div style="background:#fff;border-radius:12px;padding:14px;box-shadow:0 1px 3px rgba(0,0,0,0.08)">
        <div style="font-size:13px;font-weight:700;color:#374151;margin-bottom:12px">
          <i class="bi bi-bar-chart-fill" style="color:#22c55e;margin-right:6px"></i>รายได้
        </div>
        <div style="height:160px;position:relative">
          <canvas id="chart-revenue"></canvas>
        </div>
      </div>
    </div>

    <!-- Top Tech + Alerts row -->
    <div style="padding:0 12px 12px;display:grid;grid-template-columns:1fr 1fr;gap:8px">
      <div style="background:#fff;border-radius:12px;padding:14px;box-shadow:0 1px 3px rgba(0,0,0,0.08)">
        <div style="font-size:12px;font-weight:700;color:#374151;margin-bottom:8px">
          <i class="bi bi-trophy-fill" style="color:#f59e0b;margin-right:4px"></i>ช่างยอดเยี่ยม
        </div>
        <div id="analytics-top-tech"></div>
      </div>
      <div style="background:#fff;border-radius:12px;padding:14px;box-shadow:0 1px 3px rgba(0,0,0,0.08)">
        <div style="font-size:12px;font-weight:700;color:#374151;margin-bottom:8px">
          <i class="bi bi-bell-fill" style="color:#ef4444;margin-right:4px"></i>Alerts
        </div>
        <div id="analytics-alerts"></div>
      </div>
    </div>

    <!-- Spin animation -->
    <style>
      @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    </style>`;
}

function _buildSkeletonHTML_() {
  const card = `<div style="height:80px;background:#f3f4f6;border-radius:12px;flex:1;min-width:140px;animation:pulse 1.5s infinite"></div>`;
  return `
    <style>@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }</style>
    <div style="padding:12px">
      <div style="height:24px;background:#f3f4f6;border-radius:6px;width:60%;margin-bottom:16px;animation:pulse 1.5s infinite"></div>
      <div style="display:flex;gap:8px;margin-bottom:12px">${card}${card}${card}${card}</div>
      <div style="height:220px;background:#f3f4f6;border-radius:12px;margin-bottom:12px;animation:pulse 1.5s infinite"></div>
      <div style="height:180px;background:#f3f4f6;border-radius:12px;animation:pulse 1.5s infinite"></div>
    </div>`;
}

function _buildErrorHTML_(msg) {
  return `
    <div style="text-align:center;padding:40px 20px">
      <div style="font-size:40px;margin-bottom:12px">📊</div>
      <div style="font-weight:600;color:#374151;margin-bottom:6px">โหลดข้อมูลไม่สำเร็จ</div>
      <div style="font-size:12px;color:#9ca3af;margin-bottom:16px">${msg || 'เกิดข้อผิดพลาด'}</div>
      <button onclick="loadDashboardPage()"
        style="padding:10px 20px;background:#3b82f6;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:14px">
        ลองใหม่
      </button>
    </div>`;
}

// ============================================================
// HELPERS
// ============================================================
function _loadChartJS_() {
  return new Promise((resolve, reject) => {
    if (typeof Chart !== 'undefined') { resolve(); return; }
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
    s.onload  = resolve;
    s.onerror = () => reject(new Error('ไม่สามารถโหลด Chart.js ได้'));
    document.head.appendChild(s);
  });
}

function _startAutoRefresh_() {
  if (ANALYTICS.refreshTimer) clearInterval(ANALYTICS.refreshTimer);
  ANALYTICS.refreshTimer = setInterval(() => {
    // Auto-refresh เฉพาะเมื่อหน้า dashboard กำลังแสดงอยู่
    const page = document.getElementById('page-dashboard');
    if (page && !page.classList.contains('hidden')) {
      loadDashboardPage();
    }
  }, ANALYTICS.REFRESH_MS);
}

function _renderLastUpdated_() {
  const el = document.getElementById('dashboard-last-updated');
  if (el && ANALYTICS.lastUpdated) {
    el.textContent = `อัปเดต: ${ANALYTICS.lastUpdated.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}`;
  }
}

function _statusLabel_(status) {
  const MAP = {
    'OPEN':         'รับงาน',
    'PENDING':      'รอดำเนินการ',
    'IN_PROGRESS':  'กำลังซ่อม',
    'WAITING_PART': 'รออะไหล่',
    'DONE':         'เสร็จแล้ว',
    'CLOSED':       'ปิดงาน',
    'CANCELLED':    'ยกเลิก',
  };
  return MAP[status] || status || 'ไม่ระบุ';
}

function _fmt_(num) {
  return Number(num || 0).toLocaleString('th-TH');
}

function _fmtNum_(num) {
  return Number(num || 0).toLocaleString('th-TH');
}

function _fmtK_(num) {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000)    return `${(num / 1000).toFixed(0)}K`;
  return String(num);
}

function _pct_(val, arr) {
  const total = arr.reduce((s, v) => s + v, 0);
  if (!total) return 0;
  return Math.round((val / total) * 100);
}

// ============================================================
// EXPOSE GLOBALS
// ============================================================
window.loadDashboardPage    = loadDashboardPage;
window.renderKPICards       = renderKPICards;
window.renderJobStatusChart = renderJobStatusChart;
window.renderRevenueChart   = renderRevenueChart;
window.renderTopTechCard    = renderTopTechCard;
window.renderAlertList      = renderAlertList;
window.refreshDashboard     = refreshDashboard;
