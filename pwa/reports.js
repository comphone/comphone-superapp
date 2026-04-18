// ============================================================
// reports.js — Report & Analytics Module
// COMPHONE SUPER APP V5.5
// P&L Report, Tech Performance, Revenue Chart
// ============================================================

'use strict';

const REPORTS = {
  currentTab: 'pl',
  data: null,
  charts: {},
  period: 'month' // week | month | quarter | year
};

// ===== MAIN ENTRY =====
async function loadReportsPage() {
  const container = document.getElementById('reports-content');
  if (!container) return;

  container.innerHTML = `
    <!-- Period Selector -->
    <div class="filter-tabs" style="margin-bottom:12px;">
      <button class="filter-tab ${REPORTS.period === 'week' ? 'active' : ''}" onclick="setReportPeriod('week', this)">สัปดาห์นี้</button>
      <button class="filter-tab ${REPORTS.period === 'month' ? 'active' : ''}" onclick="setReportPeriod('month', this)">เดือนนี้</button>
      <button class="filter-tab ${REPORTS.period === 'quarter' ? 'active' : ''}" onclick="setReportPeriod('quarter', this)">ไตรมาส</button>
      <button class="filter-tab ${REPORTS.period === 'year' ? 'active' : ''}" onclick="setReportPeriod('year', this)">ปีนี้</button>
    </div>

    <!-- Report Tabs -->
    <div class="report-tabs">
      <button class="report-tab ${REPORTS.currentTab === 'pl' ? 'active' : ''}" onclick="switchReportTab('pl', this)">
        <i class="bi bi-cash-stack"></i> P&L
      </button>
      <button class="report-tab ${REPORTS.currentTab === 'tech' ? 'active' : ''}" onclick="switchReportTab('tech', this)">
        <i class="bi bi-person-badge"></i> ช่าง
      </button>
      <button class="report-tab ${REPORTS.currentTab === 'revenue' ? 'active' : ''}" onclick="switchReportTab('revenue', this)">
        <i class="bi bi-graph-up-arrow"></i> รายได้
      </button>
      <button class="report-tab ${REPORTS.currentTab === 'inventory' ? 'active' : ''}" onclick="switchReportTab('inventory', this)">
        <i class="bi bi-boxes"></i> สต็อก
      </button>
    </div>

    <!-- Report Content -->
    <div id="report-body">
      <div class="spinner-border text-primary m-4"></div>
    </div>`;

  await loadReportData_();
}

async function setReportPeriod(period, btn) {
  REPORTS.period = period;
  document.querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  await loadReportData_();
}

async function switchReportTab(tab, btn) {
  REPORTS.currentTab = tab;
  document.querySelectorAll('.report-tab').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderReportBody_();
}

async function loadReportData_() {
  const body = document.getElementById('report-body');
  if (body) body.innerHTML = '<div class="spinner-border text-primary m-4"></div>';

  // ลอง cache ก่อน
  const cacheKey = `report_${REPORTS.period}`;
  const cached = await getCachedData(cacheKey);
  if (cached) {
    REPORTS.data = cached;
    renderReportBody_();
    return;
  }

  const res = await callAPI('getReportData', { period: REPORTS.period });
  if (res && res.success) {
    REPORTS.data = res.data;
    await cacheAPIResponse(cacheKey, res.data, 15); // cache 15 นาที
  } else {
    /* แสดง error จริง — ไม่ใช้ mock */
    const errBody = document.getElementById('report-body');
    if (errBody) errBody.innerHTML = `
      <div style="padding:32px;text-align:center">
        <i class="bi bi-exclamation-triangle-fill" style="font-size:40px;color:#f59e0b"></i>
        <p style="margin-top:12px;color:#374151;font-weight:600">ไม่สามารถโหลดข้อมูลได้</p>
        <p style="color:#6b7280;font-size:13px">${res?.error || 'กรุณาตรวจสอบการเชื่อมต่อ GAS'}</p>
        <button onclick="loadReportData_()" class="btn-secondary" style="margin-top:12px">
          <i class="bi bi-arrow-clockwise"></i> ลองใหม่
        </button>
      </div>`;
    return;
  }

  renderReportBody_();
}

function renderReportBody_() {
  const body = document.getElementById('report-body');
  if (!body || !REPORTS.data) return;

  // Destroy existing charts
  Object.values(REPORTS.charts).forEach(c => { try { c.destroy(); } catch(e) {} });
  REPORTS.charts = {};

  switch (REPORTS.currentTab) {
    case 'pl':       body.innerHTML = renderPLReport_(); break;
    case 'tech':     body.innerHTML = renderTechReport_(); break;
    case 'revenue':  body.innerHTML = renderRevenueReport_(); break;
    case 'inventory': body.innerHTML = renderInventoryReport_(); break;
  }

  // วาด charts หลัง DOM render
  setTimeout(drawCharts_, 100);
}

// ===== P&L REPORT =====
function renderPLReport_() {
  const d = REPORTS.data;
  const revenue = d.revenue || 0;
  const cost = d.cost || 0;
  const profit = revenue - cost;
  const margin = revenue > 0 ? ((profit / revenue) * 100).toFixed(1) : 0;

  return `
    <div class="report-summary-grid">
      <div class="report-kpi-card green">
        <div class="report-kpi-label">รายได้รวม</div>
        <div class="report-kpi-value">฿${revenue.toLocaleString()}</div>
        <div class="report-kpi-sub">${d.jobCount || 0} งาน</div>
      </div>
      <div class="report-kpi-card red">
        <div class="report-kpi-label">ต้นทุนรวม</div>
        <div class="report-kpi-value">฿${cost.toLocaleString()}</div>
        <div class="report-kpi-sub">อะไหล่ + ค่าแรง</div>
      </div>
      <div class="report-kpi-card ${profit >= 0 ? 'blue' : 'orange'}">
        <div class="report-kpi-label">กำไรสุทธิ</div>
        <div class="report-kpi-value">฿${profit.toLocaleString()}</div>
        <div class="report-kpi-sub">Margin ${margin}%</div>
      </div>
    </div>

    <!-- P&L Breakdown -->
    <div class="section-card">
      <div class="section-label">รายละเอียด P&L</div>
      <div class="pl-table">
        ${(d.breakdown || []).map(row => `
          <div class="pl-row">
            <span class="pl-label">${row.label}</span>
            <span class="pl-amount ${row.type === 'income' ? 'text-green' : 'text-red'}">
              ${row.type === 'income' ? '+' : '-'}฿${(row.amount || 0).toLocaleString()}
            </span>
          </div>`).join('')}
        <div class="pl-row pl-total">
          <span class="pl-label">กำไรสุทธิ</span>
          <span class="pl-amount ${profit >= 0 ? 'text-green' : 'text-red'}">฿${profit.toLocaleString()}</span>
        </div>
      </div>
    </div>

    <!-- Revenue by Category Chart -->
    <div class="section-card">
      <div class="section-label">รายได้แยกตามประเภทงาน</div>
      <canvas id="chart-pl-category" height="200"></canvas>
    </div>`;
}

// ===== TECH PERFORMANCE =====
function renderTechReport_() {
  const techs = REPORTS.data.techPerformance || [];

  const rows = techs.map(t => `
    <div class="tech-perf-card">
      <div class="tech-perf-avatar">${(t.name || '?').charAt(0)}</div>
      <div class="tech-perf-info">
        <div class="tech-perf-name">${t.name || 'ไม่ระบุ'}</div>
        <div class="tech-perf-stats">
          <span><i class="bi bi-check2-circle text-green"></i> ${t.completed || 0} งาน</span>
          <span><i class="bi bi-clock text-orange"></i> ${t.avgDays || 0} วัน/งาน</span>
          <span><i class="bi bi-star-fill text-yellow"></i> ${t.rating || '-'}</span>
        </div>
        <div class="tech-perf-bar-wrap">
          <div class="tech-perf-bar" style="width:${Math.min((t.completed || 0) / Math.max(...techs.map(x => x.completed || 1)) * 100, 100)}%"></div>
        </div>
      </div>
      <div class="tech-perf-revenue">
        <div class="tech-perf-rev-num">฿${(t.revenue || 0).toLocaleString()}</div>
        <div class="tech-perf-rev-label">รายได้</div>
      </div>
    </div>`).join('');

  return `
    <div class="section-card">
      <div class="section-label">ผลงานช่างแต่ละคน</div>
      ${rows || '<p style="color:#9ca3af;text-align:center;padding:24px;">ไม่มีข้อมูล</p>'}
    </div>

    <div class="section-card">
      <div class="section-label">เปรียบเทียบงานที่เสร็จ</div>
      <canvas id="chart-tech-compare" height="220"></canvas>
    </div>`;
}

// ===== REVENUE CHART =====
function renderRevenueReport_() {
  const d = REPORTS.data;
  return `
    <div class="section-card">
      <div class="section-label">รายได้รายวัน</div>
      <canvas id="chart-revenue-daily" height="220"></canvas>
    </div>

    <div class="section-card">
      <div class="section-label">รายได้แยกตามช่องทาง</div>
      <canvas id="chart-revenue-channel" height="200"></canvas>
    </div>

    <div class="section-card">
      <div class="section-label">Top 5 ลูกค้า</div>
      ${(d.topCustomers || []).map((c, i) => `
        <div class="top-customer-row">
          <span class="top-rank">#${i+1}</span>
          <span class="top-name">${c.name}</span>
          <span class="top-amount">฿${(c.total || 0).toLocaleString()}</span>
        </div>`).join('') || '<p style="color:#9ca3af;text-align:center;padding:16px;">ไม่มีข้อมูล</p>'}
    </div>`;
}

// ===== INVENTORY REPORT =====
function renderInventoryReport_() {
  const d = REPORTS.data;
  const lowStock = (d.lowStockItems || []);

  return `
    <div class="report-summary-grid">
      <div class="report-kpi-card blue">
        <div class="report-kpi-label">มูลค่าสต็อก</div>
        <div class="report-kpi-value">฿${(d.inventoryValue || 0).toLocaleString()}</div>
        <div class="report-kpi-sub">${d.totalItems || 0} รายการ</div>
      </div>
      <div class="report-kpi-card orange">
        <div class="report-kpi-label">สต็อกต่ำ</div>
        <div class="report-kpi-value">${lowStock.length}</div>
        <div class="report-kpi-sub">ต้องสั่งซื้อ</div>
      </div>
    </div>

    ${lowStock.length > 0 ? `
    <div class="section-card">
      <div class="section-label" style="color:#dc2626;">⚠️ สต็อกต่ำ — ต้องสั่งซื้อ</div>
      ${lowStock.map(item => `
        <div class="low-stock-row">
          <span class="low-stock-name">${item.name}</span>
          <span class="low-stock-qty ${item.qty <= 0 ? 'text-red' : 'text-orange'}">
            ${item.qty <= 0 ? 'หมด' : `เหลือ ${item.qty}`}
          </span>
          <button class="btn-xs btn-primary-sm" onclick="createPOForItem('${item.code}')">สั่งซื้อ</button>
        </div>`).join('')}
    </div>` : ''}

    <div class="section-card">
      <div class="section-label">สต็อกแยกตามประเภท</div>
      <canvas id="chart-inventory-category" height="200"></canvas>
    </div>`;
}

// ===== DRAW CHARTS =====
function drawCharts_() {
  const d = REPORTS.data;
  if (!d || typeof Chart === 'undefined') return;

  const chartDefaults = {
    responsive: true,
    plugins: { legend: { position: 'bottom', labels: { font: { size: 11 }, padding: 12 } } }
  };

  // P&L Category Chart
  if (document.getElementById('chart-pl-category') && d.categoryRevenue) {
    REPORTS.charts.plCategory = new Chart(
      document.getElementById('chart-pl-category'),
      {
        type: 'doughnut',
        data: {
          labels: d.categoryRevenue.map(c => c.label),
          datasets: [{ data: d.categoryRevenue.map(c => c.amount),
            backgroundColor: ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4'] }]
        },
        options: { ...chartDefaults }
      }
    );
  }

  // Tech Compare Chart
  if (document.getElementById('chart-tech-compare') && d.techPerformance) {
    REPORTS.charts.techCompare = new Chart(
      document.getElementById('chart-tech-compare'),
      {
        type: 'bar',
        data: {
          labels: d.techPerformance.map(t => t.name),
          datasets: [
            { label: 'งานเสร็จ', data: d.techPerformance.map(t => t.completed || 0),
              backgroundColor: '#3b82f6' },
            { label: 'งานรับ', data: d.techPerformance.map(t => t.total || 0),
              backgroundColor: '#e5e7eb' }
          ]
        },
        options: { ...chartDefaults, scales: { y: { beginAtZero: true } } }
      }
    );
  }

  // Revenue Daily Chart
  if (document.getElementById('chart-revenue-daily') && d.dailyRevenue) {
    REPORTS.charts.revenueDaily = new Chart(
      document.getElementById('chart-revenue-daily'),
      {
        type: 'line',
        data: {
          labels: d.dailyRevenue.map(r => r.date),
          datasets: [{
            label: 'รายได้ (฿)',
            data: d.dailyRevenue.map(r => r.amount),
            borderColor: '#10b981',
            backgroundColor: 'rgba(16,185,129,0.1)',
            fill: true,
            tension: 0.4
          }]
        },
        options: { ...chartDefaults, scales: { y: { beginAtZero: true } } }
      }
    );
  }

  // Revenue Channel Chart
  if (document.getElementById('chart-revenue-channel') && d.channelRevenue) {
    REPORTS.charts.revenueChannel = new Chart(
      document.getElementById('chart-revenue-channel'),
      {
        type: 'pie',
        data: {
          labels: d.channelRevenue.map(c => c.label),
          datasets: [{ data: d.channelRevenue.map(c => c.amount),
            backgroundColor: ['#3b82f6','#10b981','#f59e0b','#ef4444'] }]
        },
        options: { ...chartDefaults }
      }
    );
  }

  // Inventory Category Chart
  if (document.getElementById('chart-inventory-category') && d.inventoryByCategory) {
    REPORTS.charts.inventoryCategory = new Chart(
      document.getElementById('chart-inventory-category'),
      {
        type: 'bar',
        data: {
          labels: d.inventoryByCategory.map(c => c.label),
          datasets: [{
            label: 'จำนวน (ชิ้น)',
            data: d.inventoryByCategory.map(c => c.qty),
            backgroundColor: '#6366f1'
          }]
        },
        options: { ...chartDefaults, indexAxis: 'y', scales: { x: { beginAtZero: true } } }
      }
    );
  }
}

// Mock data removed — ใช้ Real API จาก Reports.gs แทน (Final Sprint T1)
