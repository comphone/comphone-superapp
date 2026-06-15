/* ===========================================
ADVANCED REPORTING SYSTEM โ€“ COMPHONE SUPER APP Phase 35.3
=========================================== */
// ===== LOAD CHART.JS HELPER =====
function loadChartJS() {
return new Promise((resolve, reject) => {
if (window.Chart) { resolve(window.Chart); return; }
const script = document.createElement('script');
script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.umd.min.js';
script.onload = () => resolve(window.Chart);
script.onerror = () => reject(new Error('Failed to load Chart.js'));
document.head.appendChild(script);
});
}
// ===== SCHEDULED REPORTS STORE =====
const SCHEDULED_REPORTS_KEY = 'comphone_scheduled_reports';
function getScheduledReports() {
try {
return JSON.parse(localStorage.getItem(SCHEDULED_REPORTS_KEY) || '[]');
} catch (e) { return []; }
}
function saveScheduledReports(reports) {
localStorage.setItem(SCHEDULED_REPORTS_KEY, JSON.stringify(reports));
}
// ===== ENHANCED REPORT MODULE =====
async function renderAdvancedReportModule() {
setActiveNav('reports');
document.getElementById('topbar-title').innerHTML = '๐“ เธฃเธฒเธขเธเธฒเธเธเธฑเนเธเธชเธนเธ (Phase 35.3)';
const scheduled = getScheduledReports();
document.getElementById('reports-content').innerHTML = `
<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;margin-bottom:24px">
<div onclick="renderChartReport('jobs')" style="background:linear-gradient(135deg,#3b82f6,#1d4ed8);color:#fff;border-radius:16px;padding:24px;cursor:pointer;transition:transform .2s,box-shadow .2s" onmouseover="this.style.transform='translateY(-4px)';this.style.boxShadow='0 12px 24px rgba(59,130,246,.4)'" onmouseout="this.style.transform='none';this.style.boxShadow='none'">
<div style="font-size:32px;margin-bottom:12px">๐“</div>
<div style="font-size:18px;font-weight:700;margin-bottom:6px">เธเธฃเธฒเธเธเธฒเธเธเนเธญเธก</div>
<div style="font-size:13px;opacity:0.9">เนเธชเธ”เธเนเธเธงเนเธเนเธก, เธชเธฑเธ”เธชเนเธงเธ, เธเธฃเธฐเธชเธดเธ—เธเธดเธ เธฒเธเธเนเธฒเธ</div>
</div>
<div onclick="renderChartReport('revenue')" style="background:linear-gradient(135deg,#059669,#047857);color:#fff;border-radius:16px;padding:24px;cursor:pointer;transition:transform .2s,box-shadow .2s" onmouseover="this.style.transform='translateY(-4px)';this.style.boxShadow='0 12px 24px rgba(5,150,105,.4)'" onmouseout="this.style.transform='none';this.style.boxShadow='none'">
<div style="font-size:32px;margin-bottom:12px">๐’ฐ</div>
<div style="font-size:18px;font-weight:700;margin-bottom:6px">เธเธฃเธฒเธเธฃเธฒเธขเนเธ”เน</div>
<div style="font-size:13px;opacity:0.9">เนเธเธงเนเธเนเธกเธฃเธฒเธขเนเธ”เน, เธฃเธฒเธขเนเธ”เนเธ•เนเธญเธเนเธฒเธ, VAT</div>
</div>
<div onclick="renderChartReport('inventory')" style="background:linear-gradient(135deg,#8b5cf6,#7c3aed);color:#fff;border-radius:16px;padding:24px;cursor:pointer;transition:transform .2s,box-shadow .2s" onmouseover="this.style.transform='translateY(-4px)';this.style.boxShadow='0 12px 24px rgba(139,92,246,.4)'" onmouseout="this.style.transform='none';this.style.boxShadow='none'">
<div style="font-size:32px;margin-bottom:12px">๐“ฆ</div>
<div style="font-size:18px;font-weight:700;margin-bottom:6px">เธเธฃเธฒเธเธชเธ•เนเธญเธ</div>
<div style="font-size:13px;opacity:0.9">เธกเธนเธฅเธเนเธฒเธชเธ•เนเธญเธ, Low stock alerts, Movement</div>
</div>
<div onclick="showScheduledReports()" style="background:linear-gradient(135deg,#d97706,#b45309);color:#fff;border-radius:16px;padding:24px;cursor:pointer;transition:transform .2s,box-shadow .2s" onmouseover="this.style.transform='translateY(-4px)';this.style.boxShadow='0 12px 24px rgba(217,119,6,.4)'" onmouseout="this.style.transform='none';this.style.boxShadow='none'">
<div style="font-size:32px;margin-bottom:12px">โฐ</div>
<div style="font-size:18px;font-weight:700;margin-bottom:6px">เธฃเธฒเธขเธเธฒเธเธ•เธฒเธกเน€เธงเธฅเธฒ</div>
<div style="font-size:13px;opacity:0.9">${scheduled.length} เธฃเธฒเธขเธเธฒเธฃเธ—เธตเนเธ•เธฑเนเธเนเธงเน</div>
</div>
</div>
<div id="advanced-report-detail" style="min-height:400px">
<div style="text-align:center;padding:60px 20px;color:#6b7280">
<div style="font-size:48px;margin-bottom:16px">๐“</div>
<div style="font-size:16px;font-weight:500">เน€เธฅเธทเธญเธเธเธฃเธฐเน€เธ เธ—เธฃเธฒเธขเธเธฒเธเธ”เนเธฒเธเธเธเน€เธเธทเนเธญเธ”เธนเธเธฃเธฒเธ</div>
</div>
</div>
`;
}
// ===== CHART REPORT RENDER =====
async function renderChartReport(type) {
const el = document.getElementById('advanced-report-detail');
if (!el) return;
el.innerHTML = `
<div class="card-box">
<div class="card-title">๐“ ${type === 'jobs' ? 'เธเธฃเธฒเธเธเธฒเธเธเนเธญเธก' : type === 'revenue' ? 'เธเธฃเธฒเธเธฃเธฒเธขเนเธ”เน' : 'เธเธฃเธฒเธเธชเธ•เนเธญเธ'}</div>
<div style="display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap;align-items:center">
<select id="chart-type-select" style="padding:8px 12px;border:1px solid #e5e7eb;border-radius:8px;font-size:13px">
<option value="bar">เนเธ—เนเธ (Bar)</option>
<option value="line">เน€เธชเนเธ (Line)</option>
<option value="pie">เธงเธเธเธฅเธก (Pie)</option>
<option value="doughnut">เนเธ”เธเธฑเธ— (Doughnut)</option>
</select>
<select id="chart-period-select" style="padding:8px 12px;border:1px solid #e5e7eb;border-radius:8px;font-size:13px">
<option value="7days">7 เธงเธฑเธเธฅเนเธฒเธชเธธเธ”</option>
<option value="30days">30 เธงเธฑเธเธฅเนเธฒเธชเธธเธ”</option>
<option value="90days">90 เธงเธฑเธเธฅเนเธฒเธชเธธเธ”</option>
<option value="thisMonth">เน€เธ”เธทเธญเธเธเธตเน</option>
<option value="thisYear">เธเธตเธเธตเน</option>
</select>
<button onclick="refreshChart('${type}')" style="background:#3b82f6;color:#fff;border:none;padding:8px 16px;border-radius:8px;font-size:13px;cursor:pointer">๐” เธฃเธตเน€เธเธฃเธ</button>
<button onclick="exportChartToPDF('${type}')" style="background:#ef4444;color:#fff;border:none;padding:8px 16px;border-radius:8px;font-size:13px;cursor:pointer">๐“ Export PDF</button>
<button onclick="exportChartToExcel('${type}')" style="background:#059669;color:#fff;border:none;padding:8px 16px;border-radius:8px;font-size:13px;cursor:pointer">๐“ Export Excel</button>
</div>
<div style="position:relative;height:400px;margin-bottom:16px">
<canvas id="report-chart-canvas"></canvas>
</div>
<div id="chart-summary" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;">
<!-- Summary cards will be inserted here -->
</div>
</div>
`;
await refreshChart(type);
}
// ===== REFRESH CHART =====
async function refreshChart(type) {
const chartType = document.getElementById('chart-type-select')?.value || 'bar';
const period = document.getElementById('chart-period-select')?.value || '30days';
try {
await loadChartJS();
const canvas = document.getElementById('report-chart-canvas');
if (!canvas) return;
const ctx = canvas.getContext('2d');
// Destroy existing chart
if (window._currentReportChart) {
window._currentReportChart.destroy();
}
let chartData;
if (type === 'jobs') {
chartData = await buildJobsChartData(period, chartType);
} else if (type === 'revenue') {
chartData = await buildRevenueChartData(period, chartType);
} else {
chartData = await buildInventoryChartData(period, chartType);
}
window._currentReportChart = new Chart(ctx, {
type: chartType === 'bar' || chartType === 'line' ? chartType : 'doughnut',
data: chartData.data,
options: {
responsive: true,
maintainAspectRatio: false,
plugins: {
title: {
display: true,
text: chartData.title,
font: { size: 16 }
},
legend: {
position: 'bottom'
}
}
}
});
// Update summary
const summaryEl = document.getElementById('chart-summary');
if (summaryEl && chartData.summary) {
summaryEl.innerHTML = chartData.summary.map(s => `
<div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:12px;text-align:center">
<div style="font-size:20px;font-weight:700;color:${s.color}">${s.value}</div>
<div style="font-size:11px;color:#6b7280">${s.label}</div>
</div>
`).join('');
}
} catch (err) {
console.error('[Chart] Error:', err);
showToast('โ เนเธกเนเธชเธฒเธกเธฒเธฃเธ–เนเธซเธฅเธ”เธเธฃเธฒเธเนเธ”เน', 'error');
}
}
// ===== BUILD JOBS CHART DATA =====
async function buildJobsChartData(period, chartType) {
try {
const res = await callApi('getDashboardBundle', {});
const stats = (res && res.stats) || {};
// For demo, use current stats - in production would fetch historical data
const labels = ['เนเธซเธกเน', 'เธฃเธญเธเนเธญเธก', 'เธเธณเธฅเธฑเธเธ—เธณ', 'เน€เธชเธฃเนเธเนเธฅเนเธง', 'เธขเธเน€เธฅเธดเธ'];
const data = [stats.new || 0, stats.pending || 0, stats.in_progress || 0, stats.completed || 0, stats.cancelled || 0];
return {
title: 'เธชเธ–เธฒเธเธฐเธเธฒเธเธเนเธญเธก',
data: {
labels,
datasets: [{
label: 'เธเธณเธเธงเธเธเธฒเธ',
data,
backgroundColor: chartType === 'line'
? 'rgba(59,130,246,0.2)'
: ['#3b82f6', '#f59e0b', '#8b5cf6', '#059669', '#ef4444'],
borderColor: '#3b82f6',
borderWidth: 2,
fill: chartType === 'line'
}]
},
summary: [
{ label: 'เธ—เธฑเนเธเธซเธกเธ”', value: stats.total || 0, color: '#3b82f6' },
{ label: 'เน€เธชเธฃเนเธเนเธฅเนเธง', value: stats.completed || 0, color: '#059669' },
{ label: 'เธเธณเธฅเธฑเธเธ—เธณ', value: stats.in_progress || 0, color: '#8b5cf6' },
{ label: 'เธฃเธญเธเนเธญเธก', value: stats.pending || 0, color: '#f59e0b' }
]
};
} catch (e) {
return { title: 'Error', data: { labels: [], datasets: [] }, summary: [] };
}
}
// ===== BUILD REVENUE CHART DATA =====
async function buildRevenueChartData(period, chartType) {
try {
const res = await callApi('getProfitReport', { period: 'monthly' });
const report = res || {};
const labels = ['เธก.เธ.', 'เธ.เธ.', 'เธกเธต.เธ.', 'เน€เธก.เธข.', 'เธ.เธ.', 'เธกเธด.เธข.', 'เธ.เธ.', 'เธช.เธ.', 'เธ.เธข.', 'เธ•.เธ.', 'เธ.เธข.', 'เธ.เธ.'];
const revenue = labels.map(() => Math.floor(Math.random() * 50000) + 10000); // Demo data
const vat = revenue.map(r => r * 0.07);
return {
title: 'เธฃเธฒเธขเนเธ”เนเธฃเธฒเธขเน€เธ”เธทเธญเธ',
data: {
labels,
datasets: [
{
label: 'เธฃเธฒเธขเนเธ”เน (เธเธฒเธ—)',
data: revenue,
backgroundColor: 'rgba(5,150,105,0.6)',
borderColor: '#059669',
borderWidth: 2
},
{
label: 'VAT',
data: vat,
backgroundColor: 'rgba(217,119,6,0.6)',
borderColor: '#d97706',
borderWidth: 2
}
]
},
summary: [
{ label: 'เธฃเธฒเธขเนเธ”เนเธฃเธงเธก', value: 'เธฟ' + revenue.reduce((a, b) => a + b, 0).toLocaleString(), color: '#059669' },
{ label: 'เน€เธเธฅเธตเนเธข/เน€เธ”เธทเธญเธ', value: 'เธฟ' + Math.floor(revenue.reduce((a, b) => a + b, 0) / 12).toLocaleString(), color: '#3b82f6' },
{ label: 'VAT เธฃเธงเธก', value: 'เธฟ' + vat.reduce((a, b) => a + b, 0).toLocaleString(), color: '#d97706' },
{ label: 'เน€เธ”เธทเธญเธเธชเธนเธเธชเธธเธ”', value: 'เธฟ' + Math.max(...revenue).toLocaleString(), color: '#8b5cf6' }
]
};
} catch (e) {
return { title: 'Error', data: { labels: [], datasets: [] }, summary: [] };
}
}
// ===== BUILD INVENTORY CHART DATA =====
async function buildInventoryChartData(period, chartType) {
try {
const res = await callApi('inventoryOverview', {});
const items = (res && res.stock) || [];
// Top 10 items by quantity
const topItems = items
.sort((a, b) => (b.qty || 0) - (a.qty || 0))
.slice(0, 10);
const labels = topItems.map(i => i.name || i.code || '-');
const data = topItems.map(i => i.qty || 0);
const lowStock = topItems.map(i => (i.qty || 0) <= (i.min_qty || 0) ? 1 : 0);
return {
title: 'เธชเธ•เนเธญเธเธชเธดเธเธเนเธฒ (Top 10)',
data: {
labels,
datasets: [{
label: 'เธเธณเธเธงเธเธเธเน€เธซเธฅเธทเธญ',
data,
backgroundColor: lowStock.map(l => l ? '#ef4444' : '#8b5cf6'),
borderColor: '#7c3aed',
borderWidth: 2
}]
},
summary: [
{ label: 'เธฃเธฒเธขเธเธฒเธฃเธ—เธฑเนเธเธซเธกเธ”', value: items.length, color: '#8b5cf6' },
{ label: 'Low Stock', value: items.filter(i => (i.qty || 0) <= (i.min_qty || 0)).length, color: '#ef4444' },
{ label: 'เธกเธนเธฅเธเนเธฒเธฃเธงเธก', value: 'เธฟ' + items.reduce((sum, i) => sum + ((i.qty || 0) * (i.price || 0)), 0).toLocaleString(), color: '#059669' },
{ label: 'เธเนเธฒเน€เธเธฅเธตเนเธข', value: Math.floor(items.reduce((sum, i) => sum + (i.qty || 0), 0) / items.length), color: '#3b82f6' }
]
};
} catch (e) {
return { title: 'Error', data: { labels: [], datasets: [] }, summary: [] };
}
}
// ===== EXPORT CHART TO PDF =====
function exportChartToPDF(type) {
const { jsPDF } = window.jspdf;
if (!jsPDF) { showToast('โ jsPDF เนเธกเนเธเธฃเนเธญเธกเนเธเนเธเธฒเธ', 'error'); return; }
const doc = new jsPDF();
const canvas = document.getElementById('report-chart-canvas');
if (!canvas) return;
const imgData = canvas.toDataURL('image/png');
const pw = doc.internal.pageSize.getWidth();
doc.setFontSize(16);
doc.text(`Report: ${type}`, pw/2, 20, { align: 'center' });
doc.addImage(imgData, 'PNG', 14, 30, pw - 28, 150);
doc.save(`report_${type}_${new Date().toISOString().split('T')[0]}.pdf`);
showToast('โ… Export PDF เธชเธณเน€เธฃเนเธ');
}
// ===== EXPORT CHART TO EXCEL =====
function exportChartToExcel(type) {
// Simple CSV export (Excel-compatible)
let csv = 'Category,Value\n';
if (type === 'jobs') {
csv = 'Status,Count\n';
csv += 'New,' + (window._lastJobsStats?.new || 0) + '\n';
csv += 'Pending,' + (window._lastJobsStats?.pending || 0) + '\n';
csv += 'In Progress,' + (window._lastJobsStats?.in_progress || 0) + '\n';
csv += 'Completed,' + (window._lastJobsStats?.completed || 0) + '\n';
} else if (type === 'revenue') {
csv = 'Month,Revenue,VAT\n';
const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
months.forEach(m => {
csv += m + ',10000,700\n'; // Demo data
});
} else {
csv = 'Item,Qty,Price\n';
csv += 'Item 1,10,1000\n'; // Demo data
}
const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
const link = document.createElement('a');
link.href = URL.createObjectURL(blob);
link.download = `report_${type}_${new Date().toISOString().split('T')[0]}.csv`;
link.click();
URL.revokeObjectURL(link.href);
showToast('โ… Export Excel เธชเธณเน€เธฃเนเธ');
}
// ===== SCHEDULED REPORTS =====
function showScheduledReports() {
const el = document.getElementById('advanced-report-detail');
const scheduled = getScheduledReports();
el.innerHTML = `
<div class="card-box">
<div class="card-title">โฐ เธฃเธฒเธขเธเธฒเธเธ•เธฒเธกเน€เธงเธฅเธฒ (Scheduled Reports)</div>
<div style="margin-bottom:16px;">
<button onclick="showAddScheduledReport()" style="background:#059669;color:#fff;border:none;padding:8px 16px;border-radius:8px;font-size:13px;cursor:pointer">
<i class="bi bi-plus-circle"></i> เน€เธเธดเนเธกเธฃเธฒเธขเธเธฒเธเธ•เธฒเธกเน€เธงเธฅเธฒ
</button>
</div>
${scheduled.length === 0 ? `
<div style="text-align:center;padding:40px;color:#6b7280">
<div style="font-size:48px;margin-bottom:16px">โฐ</div>
<div style="font-size:14px">เธขเธฑเธเนเธกเนเธกเธตเธฃเธฒเธขเธเธฒเธเธ—เธตเนเธ•เธฑเนเธเน€เธงเธฅเธฒเนเธงเน</div>
</div>
` : `
<div style="display:flex;flex-direction:column;gap:12px;">
${scheduled.map((r, i) => `
<div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:16px;display:flex;justify-content:space-between;align-items:center;">
<div>
<div style="font-weight:600;font-size:14px;margin-bottom:4px">${r.name || 'เธฃเธฒเธขเธเธฒเธ'}</div>
<div style="font-size:12px;color:#6b7280">
เธเธฃเธฐเน€เธ เธ—: ${r.type} | เธเธงเธฒเธกเธ–เธตเน: ${r.frequency} | เธฃเธฑเธเธ—เธตเน: ${r.email || '-'}
</div>
<div style="font-size:11px;color:#9ca3af;margin-top:4px">
เธชเธฃเนเธฒเธเน€เธกเธทเนเธญ: ${new Date(r.createdAt).toLocaleDateString('th-TH')}
</div>
</div>
<div style="display:flex;gap:8px;">
<button onclick="runScheduledReport(${i})" style="background:#3b82f6;color:#fff;border:none;padding:6px 12px;border-radius:6px;font-size:12px;cursor:pointer">โ–ถ เธฃเธฑเธเธ—เธฑเธเธ—เธต</button>
<button onclick="deleteScheduledReport(${i})" style="background:#ef4444;color:#fff;border:none;padding:6px 12px;border-radius:6px;font-size:12px;cursor:pointer">๐—‘ เธฅเธ</button>
</div>
</div>
`).join('')}
</div>
`}
</div>
`;
}
function showAddScheduledReport() {
const modal = document.createElement('div');
modal.className = 'modal-overlay';
modal.onclick = () => modal.remove();
modal.innerHTML = `
<div class="modal-sheet" onclick="event.stopPropagation()" style="padding:0 0 24px;">
<div class="modal-handle"></div>
<div class="modal-title">โฐ เน€เธเธดเนเธกเธฃเธฒเธขเธเธฒเธเธ•เธฒเธกเน€เธงเธฅเธฒ</div>
<div style="padding:0 16px;">
<div class="form-group-custom">
<label>เธเธทเนเธญเธฃเธฒเธขเธเธฒเธ</label>
<div class="input-wrap">
<i class="bi bi-file-text-fill"></i>
<input type="text" id="sched-report-name" placeholder="เน€เธเนเธ เธฃเธฒเธขเธเธฒเธเธฃเธฒเธขเน€เธ”เธทเธญเธ">
</div>
</div>
<div class="form-group-custom">
<label>เธเธฃเธฐเน€เธ เธ—เธฃเธฒเธขเธเธฒเธ</label>
<select id="sched-report-type" style="padding:10px 14px;border:1.5px solid #e5e7eb;border-radius:12px;width:100%;font-size:14px;">
<option value="jobs">เธเธฒเธเธเนเธญเธก</option>
<option value="revenue">เธฃเธฒเธขเนเธ”เน</option>
<option value="inventory">เธชเธ•เนเธญเธ</option>
<option value="attendance">เธฅเธเน€เธงเธฅเธฒ</option>
</select>
</div>
<div class="form-group-custom">
<label>เธเธงเธฒเธกเธ–เธตเน</label>
<select id="sched-report-freq" style="padding:10px 14px;border:1.5px solid #e5e7eb;border-radius:12px;width:100%;font-size:14px;">
<option value="daily">เธฃเธฒเธขเธงเธฑเธ</option>
<option value="weekly">เธฃเธฒเธขเธชเธฑเธเธ”เธฒเธซเน</option>
<option value="monthly">เธฃเธฒเธขเน€เธ”เธทเธญเธ</option>
</select>
</div>
<div class="form-group-custom">
<label>เธญเธตเน€เธกเธฅเธฃเธฑเธเธฃเธฒเธขเธเธฒเธ (เนเธกเนเธเธฑเธเธเธฑเธ)</label>
<div class="input-wrap">
<i class="bi bi-envelope-fill"></i>
<input type="email" id="sched-report-email" placeholder="example@gmail.com">
</div>
</div>
<button onclick="saveScheduledReport()" style="width:100%;padding:10px;background:#059669;color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;margin-top:8px;">
<i class="bi bi-check-circle"></i> เธเธฑเธเธ—เธถเธเธฃเธฒเธขเธเธฒเธเธ•เธฒเธกเน€เธงเธฅเธฒ
</button>
</div>
</div>
`;
document.body.appendChild(modal);
}
function saveScheduledReport() {
const name = document.getElementById('sched-report-name')?.value?.trim();
const type = document.getElementById('sched-report-type')?.value;
const frequency = document.getElementById('sched-report-freq')?.value;
const email = document.getElementById('sched-report-email')?.value?.trim();
if (!name) {
showToast('โ ๏ธ เธเธฃเธธเธ“เธฒเธเธฃเธญเธเธเธทเนเธญเธฃเธฒเธขเธเธฒเธ', 'warning');
return;
}
const scheduled = getScheduledReports();
scheduled.push({
name,
type,
frequency,
email: email || '',
createdAt: Date.now(),
lastRun: null
});
saveScheduledReports(scheduled);
showToast('โ… เธเธฑเธเธ—เธถเธเธฃเธฒเธขเธเธฒเธเธ•เธฒเธกเน€เธงเธฅเธฒเธชเธณเน€เธฃเนเธ');
// Close modal
const modal = document.querySelector('.modal-overlay');
if (modal) modal.remove();
// Refresh list
showScheduledReports();
}
function deleteScheduledReport(index) {
if (!confirm('เธเธธเธ“เนเธเนเนเธเธ—เธตเนเธเธฐเธฅเธเธฃเธฒเธขเธเธฒเธเธเธตเนเธซเธฃเธทเธญเนเธกเน?')) return;
const scheduled = getScheduledReports();
scheduled.splice(index, 1);
saveScheduledReports(scheduled);
showToast('โ… เธฅเธเธฃเธฒเธขเธเธฒเธเนเธฅเนเธง');
showScheduledReports();
}
async function runScheduledReport(index) {
const scheduled = getScheduledReports();
const report = scheduled[index];
if (!report) return;
showToast(`๐” เธเธณเธฅเธฑเธเธฃเธฑเธเธฃเธฒเธขเธเธฒเธ: ${report.name}...`);
try {
if (report.type === 'jobs' || report.type === 'revenue' || report.type === 'inventory') {
await renderChartReport(report.type);
} else if (report.type === 'attendance') {
if (typeof renderAttendanceSection === 'function') {
await renderAttendanceSection();
} else if (typeof showAttendance === 'function') {
showAttendance();
}
}
report.lastRun = Date.now();
saveScheduledReports(scheduled);
showToast('Report completed');
showScheduledReports();
} catch (err) {
console.error('[ScheduledReport] Error:', err);
showToast('Unable to run report', 'error');
}
}
