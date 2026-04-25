// ============================================================
// Analytics Section — Business Intelligence Dashboard
// COMPHONE SUPER APP v5.9.0-phase2d
// Phase 29: AI Business Intelligence (Frontend)
// ============================================================

let ANALYTICS_STATE = {
  period: '7d',
  data: null,
  loading: false
};

// ===== เปิด Analytics Section =====
function openAnalyticsSection() {
  currentSection = 'analytics';
  const container = document.getElementById('section-content');
  if (!container) return;
  container.innerHTML = `
    <div style="padding:16px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <h3 style="margin:0;font-size:18px;font-weight:800;color:#111827">
          <i class="bi bi-graph-up" style="color:#7c3aed;margin-right:8px"></i> Analytics ธุรกิจ
        </h3>
        <select id="analytics-period" onchange="ANALYTICS_STATE.period=this.value; loadAnalyticsData()" style="padding:8px 12px;border-radius:8px;border:1px solid #e5e7eb;font-size:14px">
          <option value="today">วันนี้</option>
          <option value="7d" selected>7 วันล่าสุด</option>
          <option value="30d">30 วันล่าสุด</option>
        </select>
      </div>
      <div id="analytics-loading" style="text-align:center;padding:40px;display:none">
        <i class="bi bi-hourglass-split" style="font-size:24px;color:#6b7280"></i>
        <p style="color:#6b7280;margin-top:8px">กำลังโหลดข้อมูล...</p>
      </div>
      <div id="analytics-content"></div>
    </div>
  `;
  loadAnalyticsData();
}

// ===== โหลดข้อมูล Analytics =====
async function loadAnalyticsData() {
  const loadingEl = document.getElementById('analytics-loading');
  const contentEl = document.getElementById('analytics-content');
  if (!loadingEl || !contentEl) return;

  loadingEl.style.display = 'block';
  contentEl.innerHTML = '';
  ANALYTICS_STATE.loading = true;

  try {
    const res = await callAPI('analyzeBusiness', { period: ANALYTICS_STATE.period });
    if (res && res.success && res.data) {
      ANALYTICS_STATE.data = res.data;
      renderAnalyticsUI(res.data);
    } else {
      contentEl.innerHTML = `<div style="text-align:center;padding:40px;color:#ef4444">
        <i class="bi bi-exclamation-triangle" style="font-size:24px"></i>
        <p>ไม่สามารถโหลดข้อมูลได้: ${res?.error || 'unknown'}</p>
      </div>`;
    }
  } catch (e) {
    contentEl.innerHTML = `<div style="text-align:center;padding:40px;color:#ef4444">
      <i class="bi bi-wifi-off" style="font-size:24px"></i>
      <p>เกิดข้อผิดพลาดในการเชื่อมต่อ</p>
    </div>`;
  } finally {
    loadingEl.style.display = 'none';
    ANALYTICS_STATE.loading = false;
  }
}

// ===== แสดงผล Analytics UI =====
function renderAnalyticsUI(data) {
  const container = document.getElementById('analytics-content');
  if (!container) return;

  const { alerts = [], recommendations = [], predictions = {} } = data;

  let html = '';

  // --- ส่วนแจ้งเตือน (Alerts) ---
  html += `
    <div style="margin-bottom:24px">
      <h4 style="font-size:16px;font-weight:600;color:#111827;margin-bottom:12px">
        <i class="bi bi-exclamation-triangle" style="color:#f59e0b;margin-right:6px"></i> การแจ้งเตือน
        <span class="badge" style="background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:12px;font-size:12px;margin-left:8px">${alerts.length}</span>
      </h4>
  `;
  if (alerts.length === 0) {
    html += `<div style="padding:16px;background:#f0fdf4;border-radius:12px;color:#166534">
      <i class="bi bi-check-circle"></i> ไม่มีการแจ้งเตือนในขณะนี้
    </div>`;
  } else {
    alerts.forEach(alert => {
      const severityColor = alert.severity === 'high' ? '#ef4444' : alert.severity === 'medium' ? '#f59e0b' : '#6b7280';
      html += `
        <div style="padding:12px;background:#f9fafb;border-radius:12px;margin-bottom:8px;border-left:4px solid ${severityColor}">
          <div style="font-weight:600;color:#111827">${alert.title || 'Alert'}</div>
          <div style="font-size:14px;color:#6b7280;margin-top:4px">${alert.message || ''}</div>
          ${alert.metric ? `<div style="font-size:12px;color:#9ca3af;margin-top:4px">Metric: ${alert.metric}</div>` : ''}
        </div>
      `;
    });
  }
  html += `</div>`;

  // --- ส่วนคำแนะนำ (Recommendations) ---
  html += `
    <div style="margin-bottom:24px">
      <h4 style="font-size:16px;font-weight:600;color:#111827;margin-bottom:12px">
        <i class="bi bi-lightbulb" style="color:#10b981;margin-right:6px"></i> คำแนะนำ
        <span class="badge" style="background:#d1fae5;color:#065f46;padding:2px 8px;border-radius:12px;font-size:12px;margin-left:8px">${recommendations.length}</span>
      </h4>
  `;
  if (recommendations.length === 0) {
    html += `<div style="padding:16px;background:#f0fdf4;border-radius:12px;color:#166534">
      <i class="bi bi-check-circle"></i> ไม่มีคำแนะนำในขณะนี้
    </div>`;
  } else {
    recommendations.forEach(rec => {
      html += `
        <div style="padding:12px;background:#f0fdf4;border-radius:12px;margin-bottom:8px">
          <div style="font-weight:600;color:#111827">${rec.title || 'Recommendation'}</div>
          <div style="font-size:14px;color:#6b7280;margin-top:4px">${rec.message || ''}</div>
          ${rec.impact ? `<div style="font-size:12px;color:#059669;margin-top:4px">ผลกระทบ: ${rec.impact}</div>` : ''}
        </div>
      `;
    });
  }
  html += `</div>`;

  // --- ส่วนพยากรณ์ (Predictions) ---
  if (predictions && Object.keys(predictions).length > 0) {
    html += `
      <div>
        <h4 style="font-size:16px;font-weight:600;color:#111827;margin-bottom:12px">
          <i class="bi bi-crystal-ball" style="color:#7c3aed;margin-right:6px"></i> พยากรณ์
        </h4>
        <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(200px, 1fr));gap:12px">
    `;
    for (const [key, value] of Object.entries(predictions)) {
      html += `
        <div style="padding:12px;background:#f5f3ff;border-radius:12px">
          <div style="font-size:14px;color:#6b7280">${key}</div>
          <div style="font-size:20px;font-weight:700;color:#7c3aed;margin-top:4px">${value}</div>
        </div>
      `;
    }
    html += `</div></div>`;
  }

  container.innerHTML = html;
}

// ===== Export functions =====
window.openAnalyticsSection = openAnalyticsSection;
