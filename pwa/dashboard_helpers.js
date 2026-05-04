/**
 * kpiBox — KPI summary card for PC Dashboard sections
 * Used by: section_jobs.js, section_po.js, section_inventory.js, 
 *          section_revenue.js, section_crm.js
 *
 * @param {string} icon - Bootstrap icon class (e.g., 'bi-clipboard2-data')
 * @param {string} bg - Background color (e.g., '#dbeafe')
 * @param {string} color - Text color (e.g., '#1e40af')
 * @param {number|string} value - KPI value
 * @param {string} label - KPI label
 * @param {string} subtitle - Optional subtitle
 * @param {boolean} urgent - If true, add pulsing urgent indicator
 * @returns {string} HTML string
 */
function kpiBox(icon, bg, color, value, label, subtitle, urgent) {
  const pulseClass = urgent ? 'kpi-pulse' : '';
  return `
    <div class="kpi-box ${pulseClass}" style="background:${bg};border-left:4px solid ${color}">
      <div class="kpi-icon"><i class="bi ${icon}" style="color:${color}"></i></div>
      <div class="kpi-body">
        <div class="kpi-value" style="color:${color}">${value}</div>
        <div class="kpi-label">${label}</div>
        ${subtitle ? `<div class="kpi-sub">${subtitle}</div>` : ''}
      </div>
    </div>`;
}
