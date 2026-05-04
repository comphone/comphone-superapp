/**
 * Performance Dashboard Section — Phase 34 Frontend
 * Renders performance metrics and charts in PC Dashboard
 * Version: v5.12.0-phase34
 * Date: 2026-05-01
 */

let PERFORMANCE_CHARTS = {};

/**
 * Render Performance Dashboard
 */
function renderPerformanceSection(data) {
  const container = document.getElementById('main-content');
  if (!container) return;
  
  const metrics = data || {};
  const gas = metrics.gas || {};
  const pwa = metrics.pwa || {};
  const sheets = metrics.sheets || {};
  const system = metrics.system || {};
  
  container.innerHTML = `
    <div class="section-header">
      <h2 data-i18n="Performance Dashboard">Performance Dashboard</h2>
      <div class="section-actions">
        <button class="btn-refresh" onclick="loadPerformanceData()">
          <i class="bi bi-arrow-clockwise"></i> <span data-i18n="Refresh">รีเฟรช</span>
        </button>
        <select class="period-selector" onchange="loadHistoricalData(this.value)">
          <option value="24h" data-i18n="Last 24 Hours">24 ชั่วโมงล่าสุด</option>
          <option value="7d" data-i18n="Last 7 Days">7 วันล่าสุด</option>
          <option value="30d" data-i18n="Last 30 Days">30 วันล่าสุด</option>
        </select>
      </div>
    </div>
    
    <!-- KPI Row -->
    <div class="kpi-row">
      <div class="kpi-box">
        <div class="kpi-icon-box" style="background:linear-gradient(135deg, #dbeafe, #bfdbfe);color:#1e40af;">
          <i class="bi bi-speedometer2"></i>
        </div>
        <div>
          <div class="kpi-num">${formatMs(gas.execution_time_avg || 0)}</div>
          <div class="kpi-lbl" data-i18n="Avg Response Time">เวลาตอบสนองเฉลี่ย</div>
          <div class="kpi-sub">Max: ${formatMs(gas.execution_time_max || 0)}</div>
        </div>
      </div>
      
      <div class="kpi-box">
        <div class="kpi-icon-box" style="background:linear-gradient(135deg, #d1fae5, #a7f3d0);color:#065f46;">
          <i class="bi bi-check-circle"></i>
        </div>
        <div>
          <div class="kpi-num">${(gas.uptime_percentage || 0).toFixed(2)}%</div>
          <div class="kpi-lbl" data-i18n="Uptime">เวลาทำงาน (Uptime)</div>
          <div class="kpi-sub">${gas.api_calls_total || 0} <span data-i18n="API calls">การเรียก API</span></div>
        </div>
      </div>
      
      <div class="kpi-box">
        <div class="kpi-icon-box" style="background:linear-gradient(135deg, #fef3c7, #fde68a);color:#92400e;">
          <i class="bi bi-exclamation-triangle"></i>
        </div>
        <div>
          <div class="kpi-num">${((gas.error_rate || 0) * 100).toFixed(2)}%</div>
          <div class="kpi-lbl" data-i18n="Error Rate">อัตราเกิดข้อผิดพลาด</div>
          <div class="kpi-sub">${(gas.active_sessions || 0)} <span data-i18n="active sessions">เซสชันที่ใช้งาน</span></div>
        </div>
      </div>
      
      <div class="kpi-box">
        <div class="kpi-icon-box" style="background:linear-gradient(135deg, #ede9fe, #ddd6fe);color:#5b21b6;">
          <i class="bi bi-database"></i>
        </div>
        <div>
          <div class="kpi-num">${(sheets.total_rows || 0).toLocaleString()}</div>
          <div class="kpi-lbl" data-i18n="Total Rows">จำนวนแถวทั้งหมด</div>
          <div class="kpi-sub">${(sheets.total_sheets || 0)} <span data-i18n="sheets">ชีท</span></div>
        </div>
      </div>
    </div>
    
    <!-- Charts Row -->
    <div class="grid-2">
      <div class="card-box">
        <div class="card-title">
          <i class="bi bi-graph-up"></i> <span data-i18n="API Calls (24h)">การเรียก API (24 ชั่วโมง)</span>
        </div>
        <div class="chart-container">
          <canvas id="chart-api-calls"></canvas>
        </div>
      </div>
      
      <div class="card-box">
        <div class="card-title">
          <i class="bi bi-percent"></i> <span data-i18n="Error Rate Trend">แนวโน้มอัตราเกิดข้อผิดพลาด</span>
        </div>
        <div class="chart-container">
          <canvas id="chart-error-rate"></canvas>
        </div>
      </div>
    </div>
    
    <div class="grid-2" style="margin-top:16px;">
      <div class="card-box">
        <div class="card-title">
          <i class="bi bi-hourglass-split"></i> <span data-i18n="Response Time Trend">แนวโน้มเวลาตอบสนอง</span>
        </div>
        <div class="chart-container">
          <canvas id="chart-response-time"></canvas>
        </div>
      </div>
      
      <div class="card-box">
        <div class="card-title">
          <i class="bi bi-info-circle"></i> <span data-i18n="System Info">ข้อมูลระบบ</span>
        </div>
        <div class="system-info">
          <div class="info-row">
            <span class="info-label" data-i18n="Timezone">เขตเวลา:</span>
            <span class="info-value">${system.timezone || '-'}</span>
          </div>
          <div class="info-row">
            <span class="info-label" data-i18n="Current Time">เวลาปัจจุบัน:</span>
            <span class="info-value">${system.current_time ? new Date(system.current_time).toLocaleString('th-TH') : '-'}</span>
          </div>
          <div class="info-row">
            <span class="info-label" data-i18n="Triggers">Trigger Count:</span>
            <span class="info-value">${system.trigger_count || 0}</span>
          </div>
          <div class="info-row">
            <span class="info-label" data-i18n="Script Properties">Script Properties:</span>
            <span class="info-value">${system.script_properties_count || 0}</span>
          </div>
          <div class="info-row">
            <span class="info-label" data-i18n="Cache Hit Rate">Cache Hit Rate:</span>
            <span class="info-value">${(system.cache_hit_rate * 100 || 0).toFixed(1)}%</span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- PWA Metrics -->
    <div class="card-box" style="margin-top:16px;">
      <div class="card-title">
        <i class="bi bi-phone"></i> <span data-i18n="PWA Frontend Metrics">PWA Frontend Metrics</span>
      </div>
      <div class="grid-2">
        <div class="info-row">
          <span class="info-label" data-i18n="Avg Load Time">เวลาโหลดเฉลี่ย:</span>
          <span class="info-value">${formatMs(pwa.load_time_avg || 0)}</span>
        </div>
        <div class="info-row">
          <span class="info-label" data-i18n="Cache Hit Rate">Cache Hit Rate:</span>
          <span class="info-value">${((pwa.cache_hit_rate || 0) * 100).toFixed(1)}%</span>
        </div>
        <div class="info-row">
          <span class="info-label" data-i18n="Offline Queue">Offline Queue:</span>
          <span class="info-value">${pwa.offline_queue_length || 0} <span data-i18n="items">รายการ</span></span>
        </div>
        <div class="info-row">
          <span class="info-label" data-i18n="Active Users">Active Users:</span>
          <span class="info-value">${pwa.active_users || 0}</span>
        </div>
        <div class="info-row">
          <span class="info-label" data-i18n="Page Views Today">Page Views วันนี้:</span>
          <span class="info-value">${pwa.page_views_today || 0}</span>
        </div>
      </div>
    </div>
  `;
  
  // Apply translations
  if (window.LanguageManager && window.LanguageManager.applyTranslations) {
    setTimeout(() => window.LanguageManager.applyTranslations(), 100);
  }
  
  // Load historical data for charts
  loadHistoricalData('24h');
}

/**
 * Load Performance Metrics
 */
async function loadPerformanceData() {
  try {
    const result = await callApi('getPerformanceMetrics');
    if (result && result.success) {
      renderPerformanceSection(result.data);
    } else {
      console.error('[Performance] Failed to load metrics:', result?.error);
    }
  } catch (e) {
    console.error('[Performance] Error loading metrics:', e);
  }
}

/**
 * Load Historical Data for Charts
 */
async function loadHistoricalData(period) {
  try {
    const result = await callApi('getHistoricalMetrics', { period: period });
    if (result && result.success) {
      renderHistoricalCharts(result.data);
    }
  } catch (e) {
    console.error('[Performance] Error loading historical data:', e);
  }
}

/**
 * Render Historical Charts
 */
function renderHistoricalCharts(data) {
  if (!data || !data.data) return;
  
  const labels = data.data.labels || [];
  const datasets = data.data.datasets || {};
  
  // API Calls Chart
  renderLineChart('chart-api-calls', labels, datasets.api_calls || [], 
    'API Calls', 'rgba(59, 130, 246, 0.8)', 'rgba(59, 130, 246, 0.1)');
  
  // Error Rate Chart
  renderLineChart('chart-error-rate', labels, (datasets.error_rates || []).map(v => v * 100), 
    'Error Rate (%)', 'rgba(239, 68, 68, 0.8)', 'rgba(239, 68, 68, 0.1)');
  
  // Response Time Chart
  renderLineChart('chart-response-time', labels, datasets.response_times || [], 
    'Response Time (ms)', 'rgba(16, 185, 129, 0.8)', 'rgba(16, 185, 129, 0.1)');
}

/**
 * Render Line Chart using Chart.js
 */
function renderLineChart(canvasId, labels, data, label, borderColor, backgroundColor) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  
  // Destroy existing chart
  if (PERFORMANCE_CHARTS[canvasId]) {
    PERFORMANCE_CHARTS[canvasId].destroy();
  }
  
  const ctx = canvas.getContext('2d');
  PERFORMANCE_CHARTS[canvasId] = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: label,
        data: data,
        borderColor: borderColor,
        backgroundColor: backgroundColor,
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 2,
        pointHoverRadius: 5
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}

/**
 * Format milliseconds to human readable
 */
function formatMs(ms) {
  if (ms < 1000) return ms + ' ms';
  return (ms / 1000).toFixed(2) + ' s';
}

/**
 * Register Performance section in loadSection
 */
if (typeof window.SECTION_REGISTRY === 'undefined') {
  window.SECTION_REGISTRY = {};
}
window.SECTION_REGISTRY['performance'] = renderPerformanceSection;

console.log('[Performance Section] Loaded');

// Mobile PWA alias — called by app.js goPage("performance")
function loadPerformancePage() { renderPerformanceSection(); }

