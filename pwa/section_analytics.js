/**
 * section_analytics.js — COMPHONE SUPER APP v5.13.8
 * Analytics Section (Analytics)
 * Status: Active — Uses real API data
 */

async function renderAnalyticsSection(data) {
  console.log('[Analytics] Rendering analytics section...', data);
  const container = document.getElementById('analytics-content') || document.getElementById('section-analytics') || document.getElementById('main-content');
  if (!container) return;

  // Show loading state first
  container.innerHTML = `
    <div class="section-header">
      <h2><i class="bi bi-graph-up"></i> Analytics</h2>
      <button class="btn btn-sm btn-primary" onclick="renderAnalyticsSection()">
        <i class="bi bi-arrow-clockwise"></i> รีเฟรช
      </button>
    </div>
    ${loadingState('กำลังโหลดข้อมูล Analytics...')}
  `;

  try {
    // Fetch real analytics data from backend
    const res = await callApi('analyzeBusiness', { period: '7d' });
    let analytics;

    if (res && res.success && res.data) {
      analytics = res.data;
    } else {
      // Fallback: try getDashboardData for basic metrics
      const dashRes = await callApi('getDashboardData', {});
      if (dashRes && dashRes.success && dashRes.summary) {
        analytics = {
          visitors: dashRes.summary.total_jobs || 0,
          pageviews: dashRes.summary.completed_jobs || 0,
          bounceRate: dashRes.summary.revenue ? '—' : '—',
          avgSession: dashRes.summary.avg_repair_time || '—',
          alerts: [],
          recommendations: [],
          predictions: {}
        };
      } else {
        // No data available — show error state
        container.innerHTML = `
          <div class="section-header">
            <h2><i class="bi bi-graph-up"></i> Analytics</h2>
            <button class="btn btn-sm btn-primary" onclick="renderAnalyticsSection()">
              <i class="bi bi-arrow-clockwise"></i> ลองใหม่
            </button>
          </div>
          ${errorState(res?.error || 'ไม่สามารถโหลดข้อมูล Analytics ได้', 'renderAnalyticsSection()')}
        `;
        return;
      }
    }

    // Extract KPIs from analytics data
    const visitors = analytics.visitors || analytics.total_jobs || 0;
    const pageviews = analytics.pageviews || analytics.completed_jobs || 0;
    const bounceRate = analytics.bounceRate || (analytics.alerts ? analytics.alerts.length + ' แจ้งเตือน' : '—');
    const avgSession = analytics.avgSession || analytics.avg_repair_time || '—';

    // Build alerts HTML
    const alerts = analytics.alerts || [];
    let alertsHtml = '';
    if (alerts.length > 0) {
      alertsHtml = `
        <div class="card-box" style="margin-top:16px">
          <h3><i class="bi bi-exclamation-triangle" style="color:#d97706"></i> การแจ้งเตือน (${alerts.length})</h3>
          ${alerts.map(a => `
            <div style="padding:8px 12px;margin-bottom:6px;background:#fef3c7;border-radius:8px;border-left:4px solid ${a.severity === 'high' ? '#ef4444' : a.severity === 'medium' ? '#d97706' : '#6b7280'}">
              <strong>${a.title || 'แจ้งเตือน'}</strong>
              <p style="margin:4px 0 0;font-size:13px;color:#6b7280">${a.message || ''}</p>
            </div>
          `).join('')}
        </div>`;
    }

    // Build recommendations HTML
    const recommendations = analytics.recommendations || [];
    let recsHtml = '';
    if (recommendations.length > 0) {
      recsHtml = `
        <div class="card-box" style="margin-top:16px">
          <h3><i class="bi bi-lightbulb" style="color:#059669"></i> คำแนะนำ (${recommendations.length})</h3>
          ${recommendations.map(r => `
            <div style="padding:8px 12px;margin-bottom:6px;background:#d1fae5;border-radius:8px">
              <strong>${r.title || 'คำแนะนำ'}</strong>
              <p style="margin:4px 0 0;font-size:13px;color:#6b7280">${r.message || ''}</p>
              ${r.impact ? `<span style="font-size:12px;color:#059669">ผลกระทบ: ${r.impact}</span>` : ''}
            </div>
          `).join('')}
        </div>`;
    }

    // Build predictions HTML
    const predictions = analytics.predictions || {};
    let predsHtml = '';
    if (Object.keys(predictions).length > 0) {
      predsHtml = `
        <div class="card-box" style="margin-top:16px">
          <h3><i class="bi bi-clipboard-data" style="color:#7c3aed"></i> พยากรณ์</h3>
          <div class="row">
            ${Object.entries(predictions).map(([key, value]) => `
              <div class="col-md-3">
                <div class="card-box" style="text-align:center">
                  <p style="font-size:13px;color:#6b7280">${key}</p>
                  <h2 style="color:#7c3aed">${value}</h2>
                </div>
              </div>
            `).join('')}
          </div>
        </div>`;
    }

    container.innerHTML = `
      <div class="section-header">
        <h2><i class="bi bi-graph-up"></i> Analytics</h2>
        <button class="btn btn-sm btn-primary" onclick="renderAnalyticsSection()">
          <i class="bi bi-arrow-clockwise"></i> รีเฟรช
        </button>
      </div>
      <div class="row">
        <div class="col-md-3">
          <div class="card-box">
            <h3>งานทั้งหมด</h3>
            <h2>${Number(visitors).toLocaleString()}</h2>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card-box">
            <h3>งานเสร็จ</h3>
            <h2>${Number(pageviews).toLocaleString()}</h2>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card-box">
            <h3>แจ้งเตือน</h3>
            <h2>${bounceRate}</h2>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card-box">
            <h3>เวลาซ่อมเฉลี่ย</h3>
            <h2>${avgSession}</h2>
          </div>
        </div>
      </div>
      ${alertsHtml}
      ${recsHtml}
      ${predsHtml}
    `;
  } catch (e) {
    console.error('[Analytics] Error loading data:', e);
    container.innerHTML = `
      <div class="section-header">
        <h2><i class="bi bi-graph-up"></i> Analytics</h2>
        <button class="btn btn-sm btn-primary" onclick="renderAnalyticsSection()">
          <i class="bi bi-arrow-clockwise"></i> ลองใหม่
        </button>
      </div>
      ${errorState('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', 'renderAnalyticsSection()')}
    `;
  }
}

console.log('[Analytics] section_analytics.js loaded (v5.13.8 — real API)');
