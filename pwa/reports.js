/* ============================================
REPORT MODULE – COMPHONE SUPER APP Phase 32
============================================ */
async function renderReportModule(data) {
setActiveNav('reports');
const titleEl = document.getElementById('topbar-title') || document.querySelector('#page-reports .page-header h5');
if (titleEl) titleEl.innerHTML = '📊 ศูนย์รวมรายงาน';
const mount = document.getElementById('reports-content') || document.getElementById('main-content');
if (!mount) return;
mount.innerHTML = `
<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;margin-bottom:24px">
<div onclick="_showReport('attendance')" style="background:linear-gradient(135deg,#3b82f6,#1d4ed8);color:#fff;border-radius:16px;padding:24px;cursor:pointer;transition:transform .2s,box-shadow .2s" onmouseover="this.style.transform='translateY(-4px)';this.style.boxShadow='0 12px 24px rgba(59,130,246,.4)'" onmouseout="this.style.transform='none';this.style.boxShadow='none'">
<div style="font-size:32px;margin-bottom:12px">⏰</div>
<div style="font-size:18px;font-weight:700;margin-bottom:6px">รายงานลงเวลา</div>
<div style="font-size:13px;opacity:0.9">สรุปรายเดือน/รายปี พร้อม Export PDF</div>
</div>
<div onclick="_showReport('jobs')" style="background:linear-gradient(135deg,#059669,#047857);color:#fff;border-radius:16px;padding:24px;cursor:pointer;transition:transform .2s,box-shadow .2s" onmouseover="this.style.transform='translateY(-4px)';this.style.boxShadow='0 12px 24px rgba(5,150,105,.4)'" onmouseout="this.style.transform='none';this.style.boxShadow='none'">
<div style="font-size:32px;margin-bottom:12px">🔧</div>
<div style="font-size:18px;font-weight:700;margin-bottom:6px">รายงานงานซ่อม</div>
<div style="font-size:13px;opacity:0.9">สถิติงาน, อัตราสำเร็จ, รายช่าง</div>
</div>
<div onclick="_showReport('billing')" style="background:linear-gradient(135deg,#d97706,#b45309);color:#fff;border-radius:16px;padding:24px;cursor:pointer;transition:transform .2s,box-shadow .2s" onmouseover="this.style.transform='translateY(-4px)';this.style.boxShadow='0 12px 24px rgba(217,119,6,.4)'" onmouseout="this.style.transform='none';this.style.boxShadow='none'">
<div style="font-size:32px;margin-bottom:12px">💰</div>
<div style="font-size:18px;font-weight:700;margin-bottom:6px">รายงานบิล/เงิน</div>
<div style="font-size:13px;opacity:0.9">สรุปรายได้, ภาษี, PromptPay</div>
</div>
<div onclick="_showReport('inventory')" style="background:linear-gradient(135deg,#8b5cf6,#7c3aed);color:#fff;border-radius:16px;padding:24px;cursor:pointer;transition:transform .2s,box-shadow .2s" onmouseover="this.style.transform='translateY(-4px)';this.style.boxShadow='0 12px 24px rgba(139,92,246,.4)'" onmouseout="this.style.transform='none';this.style.boxShadow='none'">
<div style="font-size:32px;margin-bottom:12px">📦</div>
<div style="font-size:18px;font-weight:700;margin-bottom:6px">รายงานสต็อก</div>
<div style="font-size:13px;opacity:0.9">สินค้าคงคลัง, เคลื่อนไหว, Low Stock</div>
</div>
</div>
<div id="report-detail" style="min-height:300px">
<div style="text-align:center;padding:60px 20px;color:#6b7280">
<div style="font-size:48px;margin-bottom:16px">📊</div>
<div style="font-size:16px;font-weight:500">เลือกรายงานด้านบนเพื่อดูรายละเอียด</div>
</div>
</div>
`;
}

function _normalizeReportData(res) {
const raw = (res && res.data) ? res.data : (res || {});
const revenue = Number(raw.revenue || raw.total_revenue || (raw.revenue && raw.revenue.period) || 0);
const billCount = Number(raw.billing_count || raw.count || (raw.breakdown && raw.breakdown.length) || 0);
const daily = raw.dailyRevenue || raw.daily_revenue || raw.records || [];
const records = Array.isArray(daily) ? daily.map(r => ({
date: r.date || r.day || r.period || '-',
bill_no: r.billing_id || r.bill_no || r.job_id || '-',
customer: r.customer || r.customer_name || '-',
amount: Number(r.amount || r.total || r.revenue || 0),
vat: Number(r.vat || r.vat_amount || 0)
})) : [];
return {
success: res && res.success !== false,
summary: {
total_revenue: revenue,
count: billCount || records.length,
avg_per_bill: (billCount || records.length) > 0 ? revenue / (billCount || records.length) : 0,
total_vat: Number(raw.total_vat || raw.vat_amount || 0)
},
records,
raw
};
}

async function _showReport(type) {
const el = document.getElementById('report-detail');
if (type === 'attendance') {
el.innerHTML = `
<div class="card-box">
<div class="card-title">📊 รายงานลงเวลา (Attendance Report)</div>
<div style="display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap;align-items:center">
<select id="rpt-att-type" style="padding:8px 12px;border:1px solid #e5e7eb;border-radius:8px;font-size:13px">
<option value="month">รายเดือน</option>
<option value="year">รายปี</option>
</select>
<input type="number" id="rpt-att-year" placeholder="ปี (เช่น 2026)" style="padding:8px 12px;border:1px solid #e5e7eb;border-radius:8px;font-size:13px;width:130px" />
<button onclick="_loadReportAttendance()" style="background:#3b82f6;color:#fff;border:none;padding:8px 16px;border-radius:8px;font-size:13px;cursor:pointer">📊 แสดงรายงาน</button>
<button onclick="_exportReportAttendancePDF()" style="background:#ef4444;color:#fff;border:none;padding:8px 16px;border-radius:8px;font-size:13px;cursor:pointer">📄 Export PDF</button>
</div>
<div id="rpt-att-content" style="text-align:center;padding:40px;color:#6b7280">กดปุ่ม "แสดงรายงาน" เพื่อโหลดข้อมูล</div>
</div>
`;
} else if (type === 'jobs') {
el.innerHTML = `
<div class="card-box">
<div class="card-title">🔧 รายงานงานซ่อม (Jobs Report)</div>
<div style="display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap;align-items:center">
<input type="date" id="rpt-jobs-from" style="padding:8px 12px;border:1px solid #e5e7eb;border-radius:8px;font-size:13px" />
<span style="color:#6b7280;font-size:13px">ถึง</span>
<input type="date" id="rpt-jobs-to" style="padding:8px 12px;border:1px solid #e5e7eb;border-radius:8px;font-size:13px" />
<button onclick="_loadReportJobs()" style="background:#059669;color:#fff;border:none;padding:8px 16px;border-radius:8px;font-size:13px;cursor:pointer">📊 แสดงรายงาน</button>
<button onclick="_exportReportJobsPDF()" style="background:#ef4444;color:#fff;border:none;padding:8px 16px;border-radius:8px;font-size:13px;cursor:pointer">📄 Export PDF</button>
</div>
<div id="rpt-jobs-content" style="text-align:center;padding:40px;color:#6b7280">กดปุ่ม "แสดงรายงาน" เพื่อโหลดข้อมูล</div>
</div>
`;
const today = new Date().toISOString().split('T')[0];
document.getElementById('rpt-jobs-from').value = today;
document.getElementById('rpt-jobs-to').value = today;
} else if (type === 'billing') {
el.innerHTML = `
<div class="card-box">
<div class="card-title">💰 รายงานบิล/เงิน (Billing Report)</div>
<div style="display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap;align-items:center">
<input type="date" id="rpt-bill-from" style="padding:8px 12px;border:1px solid #e5e7eb;border-radius:8px;font-size:13px" />
<span style="color:#6b7280;font-size:13px">ถึง</span>
<input type="date" id="rpt-bill-to" style="padding:8px 12px;border:1px solid #e5e7eb;border-radius:8px;font-size:13px" />
<button onclick="_loadReportBilling()" style="background:#d97706;color:#fff;border:none;padding:8px 16px;border-radius:8px;font-size:13px;cursor:pointer">📊 แสดงรายงาน</button>
<button onclick="_exportReportBillingPDF()" style="background:#ef4444;color:#fff;border:none;padding:8px 16px;border-radius:8px;font-size:13px;cursor:pointer">📄 Export PDF</button>
</div>
<div id="rpt-bill-content" style="text-align:center;padding:40px;color:#6b7280">กดปุ่ม "แสดงรายงาน" เพื่อโหลดข้อมูล</div>
</div>
`;
const today = new Date().toISOString().split('T')[0];
document.getElementById('rpt-bill-from').value = today;
document.getElementById('rpt-bill-to').value = today;
} else if (type === 'inventory') {
el.innerHTML = `
<div class="card-box">
<div class="card-title">📦 รายงานสต็อก (Inventory Report)</div>
<div style="display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap;align-items:center">
<select id="rpt-inv-type" style="padding:8px 12px;border:1px solid #e5e7eb;border-radius:8px;font-size:13px">
<option value="all">สต็อกทั้งหมด</option>
<option value="low">Low Stock เท่านั้น</option>
<option value="movement">การเคลื่อนไหว</option>
</select>
<button onclick="_loadReportInventory()" style="background:#8b5cf6;color:#fff;border:none;padding:8px 16px;border-radius:8px;font-size:13px;cursor:pointer">📊 แสดงรายงาน</button>
<button onclick="_exportReportInventoryPDF()" style="background:#ef4444;color:#fff;border:none;padding:8px 16px;border-radius:8px;font-size:13px;cursor:pointer">📄 Export PDF</button>
</div>
<div id="rpt-inv-content" style="text-align:center;padding:40px;color:#6b7280">กดปุ่ม "แสดงรายงาน" เพื่อโหลดข้อมูล</div>
</div>
`;
}
}
// ============================================================
// Attendance Report Functions
// ============================================================
async function _loadReportAttendance() {
const type = document.getElementById('rpt-att-type').value;
const year = document.getElementById('rpt-att-year').value.trim();
const el = document.getElementById('rpt-att-content');
el.innerHTML = '<div style="text-align:center;padding:20px;color:#6b7280">กำลังโหลด...</div>';
var params = { group_by: type };
if (year) params.year = year;
try {
const res = await callApi('getAttendanceMonthlySummary', params);
if (!res || !res.success || !res.summary || res.summary.length === 0) {
el.innerHTML = '<div style="text-align:center;padding:30px;color:#6b7280">ไม่พบข้อมูล</div>';
return;
}
var html = `<div style="margin-bottom:12px;font-size:13px;color:#6b7280">รวมชั่วโมง: <b>${res.total_hours || 0}</b> ชม. | จัดกลุ่ม: <b>${res.group_by === 'year' ? 'รายปี' : 'รายเดือน'}</b></div>`;
res.summary.forEach(s => {
html += `
<div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin-bottom:12px">
<div style="font-size:15px;font-weight:600;margin-bottom:10px">📅 ${s.period}</div>
<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:12px">
<div style="background:#fff;border-radius:8px;padding:10px;text-align:center"><div style="font-size:18px;font-weight:700;color:#3b82f6">${(s.total_hours||0).toFixed(1)}</div><div style="font-size:11px;color:#6b7280">ชม.</div></div>
<div style="background:#fff;border-radius:8px;padding:10px;text-align:center"><div style="font-size:18px;font-weight:700;color:#059669">${s.present_days||0}</div><div style="font-size:11px;color:#6b7280">วัน</div></div>
<div style="background:#fff;border-radius:8px;padding:10px;text-align:center"><div style="font-size:18px;font-weight:700;color:#d97706">${s.late_days||0}</div><div style="font-size:11px;color:#6b7280">มาสาย</div></div>
<div style="background:#fff;border-radius:8px;padding:10px;text-align:center"><div style="font-size:18px;font-weight:700;color:#8b5cf6">${s.total_jobs||0}</div><div style="font-size:11px;color:#6b7280">งาน</div></div>
</div>
<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:8px">
${(s.techs||[]).map(t => `<div style="background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:8px"><div style="font-weight:500;font-size:12px">${t.name}</div><div style="font-size:11px;color:#6b7280;margin-top:2px">${t.days}วัน, ${t.hours.toFixed(1)}ชม.</div></div>`).join('')}
</div>
</div>
`;
});
el.innerHTML = html;
window._lastAttendanceReport = res;
} catch(e) {
el.innerHTML = '<div style="text-align:center;padding:20px;color:#ef4444">เกิดข้อผิดพลาด</div>';
}
}
async function _exportReportAttendancePDF() {
const { jsPDF } = window.jspdf;
if (!jsPDF) { alert('jsPDF not loaded'); return; }
const res = window._lastAttendanceReport;
if (!res || !res.summary) { alert('กรุณาโหลดรายงานก่อน'); return; }
const doc = new jsPDF();
const pw = doc.internal.pageSize.getWidth();
let y = 20;
doc.setFontSize(16);
doc.text('Attendance Report', pw/2, y, { align: 'center' });
y += 10;
doc.setFontSize(9);
doc.text(`Group: ${res.group_by} | Total Hours: ${res.total_hours || 0} hrs`, pw/2, y, { align: 'center' });
y += 10;
res.summary.forEach(s => {
if (y > 260) { doc.addPage(); y = 20; }
doc.setFontSize(11);
doc.text(`Period: ${s.period}`, 14, y);
y += 7;
doc.setFontSize(8);
doc.text(`Hours: ${(s.total_hours||0).toFixed(1)} | Days: ${s.present_days||0} | Late: ${s.late_days||0} | Jobs: ${s.total_jobs||0}`, 14, y);
y += 7;
(s.techs||[]).forEach(t => {
if (y > 270) { doc.addPage(); y = 20; }
doc.text(`  ${t.name}: ${t.days}d, ${t.hours.toFixed(1)}h, ${t.jobs} jobs`, 18, y);
y += 5;
});
y += 5;
});
doc.save(`attendance_report_${new Date().toISOString().split('T')[0]}.pdf`);
}
// ============================================================
// Jobs Report Functions
// ============================================================
async function _loadReportJobs() {
const from = document.getElementById('rpt-jobs-from').value;
const to = document.getElementById('rpt-jobs-to').value;
const el = document.getElementById('rpt-jobs-content');
el.innerHTML = '<div style="text-align:center;padding:20px;color:#6b7280">กำลังโหลด...</div>';
try {
let res = await callApi('getDashboardBundle', {});
if (!res || res.success === false) res = await callApi('getDashboardData', {});
if (!res || !res.success) {
el.innerHTML = '<div style="text-align:center;padding:30px;color:#6b7280">ไม่พบข้อมูล</div>';
return;
}
const summary = res.summary || {};
const stats = res.stats || {
total: summary.totalJobs || 0,
pending: summary.pendingJobs || summary.openJobs || 0,
in_progress: summary.inProgressJobs || 0,
completed: summary.completedJobs || summary.doneJobs || 0
};
var html = `
<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px">
<div style="background:#f0fdf4;border-radius:12px;padding:14px;text-align:center"><div style="font-size:20px;font-weight:700;color:#059669">${stats.total||0}</div><div style="font-size:12px;color:#6b7280">งานทั้งหมด</div></div>
<div style="background:#fef3c7;border-radius:12px;padding:14px;text-align:center"><div style="font-size:20px;font-weight:700;color:#d97706">${stats.pending||0}</div><div style="font-size:12px;color:#6b7280">รอซ่อม</div></div>
<div style="background:#dbeafe;border-radius:12px;padding:14px;text-align:center"><div style="font-size:20px;font-weight:700;color:#3b82f6">${stats.in_progress||0}</div><div style="font-size:12px;color:#6b7280">กำลังซ่อม</div></div>
<div style="background:#fce7f3;border-radius:12px;padding:14px;text-align:center"><div style="font-size:20px;font-weight:700;color:#ec4899">${stats.completed||0}</div><div style="font-size:12px;color:#6b7280">เสร็จสิ้น</div></div>
</div>
<div style="font-size:13px;color:#6b7280">วันที่: ${from} ถึง ${to}</div>
`;
el.innerHTML = html;
window._lastJobsReport = { stats, from, to };
} catch(e) {
el.innerHTML = '<div style="text-align:center;padding:20px;color:#ef4444">เกิดข้อผิดพลาด</div>';
}
}
async function _exportReportJobsPDF() {
const { jsPDF } = window.jspdf;
if (!jsPDF) { alert('jsPDF not loaded'); return; }
const data = window._lastJobsReport;
if (!data) { alert('กรุณาโหลดรายงานก่อน'); return; }
const doc = new jsPDF();
const pw = doc.internal.pageSize.getWidth();
let y = 20;
doc.setFontSize(16);
doc.text('Jobs Report', pw/2, y, { align: 'center' });
y += 10;
doc.setFontSize(9);
doc.text(`Date: ${data.from} to ${data.to}`, pw/2, y, { align: 'center' });
y += 10;
const stats = data.stats || {};
doc.setFontSize(11);
doc.text(`Total: ${stats.total||0} | Pending: ${stats.pending||0} | In Progress: ${stats.in_progress||0} | Completed: ${stats.completed||0}`, 14, y);
doc.save(`jobs_report_${new Date().toISOString().split('T')[0]}.pdf`);
}
// ============================================================
// Billing Report Functions
// ============================================================
async function _loadReportBilling() {
const from = document.getElementById('rpt-bill-from').value;
const to = document.getElementById('rpt-bill-to').value;
const el = document.getElementById('rpt-bill-content');
el.innerHTML = '<div style="text-align:center;padding:20px;color:#6b7280">กำลังโหลด...</div>';
try {
const apiRes = await callApi('getReportData', { period: 'month', date_from: from, date_to: to });
const res = _normalizeReportData(apiRes);
if (!res || !res.success) {
el.innerHTML = '<div style="text-align:center;padding:30px;color:#6b7280">ไม่พบข้อมูล</div>';
return;
}
const records = Array.isArray(res.records) ? res.records : [];
const summary = res.summary || {};
var html = `
<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px">
<div style="background:#fef3c7;border-radius:12px;padding:14px;text-align:center"><div style="font-size:20px;font-weight:700;color:#d97706">${(summary.total_revenue||0).toFixed(2)}</div><div style="font-size:12px;color:#6b7280">รายได้รวม (บาท)</div></div>
<div style="background:#f0fdf4;border-radius:12px;padding:14px;text-align:center"><div style="font-size:20px;font-weight:700;color:#059669">${summary.count||0}</div><div style="font-size:12px;color:#6b7280">จำนวนบิล</div></div>
<div style="background:#dbeafe;border-radius:12px;padding:14px;text-align:center"><div style="font-size:20px;font-weight:700;color:#3b82f6">${(summary.avg_per_bill||0).toFixed(2)}</div><div style="font-size:12px;color:#6b7280">เฉลี่ย/บิล</div></div>
<div style="background:#fce7f3;border-radius:12px;padding:14px;text-align:center"><div style="font-size:20px;font-weight:700;color:#ec4899">${(summary.total_vat||0).toFixed(2)}</div><div style="font-size:12px;color:#6b7280">VAT รวม</div></div>
</div>
`;
if (records.length > 0) {
html += `<table class="job-table"><thead><tr><th>วันที่</th><th>บิล</th><th>ลูกค้า</th><th>ยอด</th><th>VAT</th></tr></thead><tbody>`;
records.forEach(r => {
html += `<tr><td>${r.date||'-'}</td><td>${r.bill_no||'-'}</td><td>${r.customer||'-'}</td><td>${(r.amount||0).toFixed(2)}</td><td>${(r.vat||0).toFixed(2)}</td></tr>`;
});
html += '</tbody></table>';
} else {
html += `
<div class="report-empty-state" style="border:1px dashed #f59e0b;background:#fffbeb;color:#92400e;border-radius:12px;padding:16px;line-height:1.6">
  <div style="font-weight:800;margin-bottom:4px">No billing records for this period</div>
  <div style="font-size:13px">Summary is available, but the daily drilldown returned no rows. Check the selected date range, Billing date/status/amount fields, or open the Data Repair Console if production rows look incomplete.</div>
</div>`;
}
el.innerHTML = html;
window._lastBillingReport = res;
} catch(e) {
el.innerHTML = '<div style="text-align:center;padding:20px;color:#ef4444">เกิดข้อผิดพลาด</div>';
}
}
async function _exportReportBillingPDF() {
const { jsPDF } = window.jspdf;
if (!jsPDF) { alert('jsPDF not loaded'); return; }
const res = window._lastBillingReport;
if (!res) { alert('กรุณาโหลดรายงานก่อน'); return; }
const doc = new jsPDF();
const pw = doc.internal.pageSize.getWidth();
let y = 20;
doc.setFontSize(16);
doc.text('Billing Report', pw/2, y, { align: 'center' });
y += 10;
const s = res.summary || {};
doc.setFontSize(9);
doc.text(`Total Revenue: ${(s.total_revenue||0).toFixed(2)} THB | Bills: ${s.count||0} | Avg: ${(s.avg_per_bill||0).toFixed(2)}`, pw/2, y, { align: 'center' });
doc.save(`billing_report_${new Date().toISOString().split('T')[0]}.pdf`);
}
// ============================================================
// Inventory Report Functions
// ============================================================
async function _loadReportInventory() {
const type = document.getElementById('rpt-inv-type').value;
const el = document.getElementById('rpt-inv-content');
el.innerHTML = '<div style="text-align:center;padding:20px;color:#6b7280">กำลังโหลด...</div>';
try {
const res = await callApi('inventoryOverview', {});
if (!res || !res.success || !res.stock) {
el.innerHTML = '<div style="text-align:center;padding:30px;color:#6b7280">ไม่พบข้อมูล</div>';
return;
}
var items = res.stock || [];
if (type === 'low') items = items.filter(i => (i.qty || 0) <= (i.min_qty || 0));
var html = `<div style="margin-bottom:12px;font-size:13px;color:#6b7280">ทั้งหมด <b>${items.length}</b> รายการ</div>`;
html += '<table class="job-table"><thead><tr><th>รหัส</th><th>ชื่อสินค้า</th><th>คงเหลือ</th><th>Min</th><th>หน่วย</th><th>สถานะ</th></tr></thead><tbody>';
items.forEach(i => {
const isLow = (i.qty || 0) <= (i.min_qty || 0);
html += `<tr>
<td>${i.code||'-'}</td>
<td>${i.name||'-'}</td>
<td>${i.qty||0}</td>
<td>${i.min_qty||0}</td>
<td>${i.unit||'-'}</td>
<td>${isLow ? '<span style="color:#ef4444;font-weight:500">Low Stock</span>' : '<span style="color:#059669">OK</span>'}</td>
</tr>`;
});
html += '</tbody></table>';
el.innerHTML = html;
window._lastInventoryReport = { items, type };
} catch(e) {
el.innerHTML = '<div style="text-align:center;padding:20px;color:#ef4444">เกิดข้อผิดพลาด</div>';
}
}
async function _exportReportInventoryPDF() {
const { jsPDF } = window.jspdf;
if (!jsPDF) { alert('jsPDF not loaded'); return; }
const data = window._lastInventoryReport;
if (!data) { alert('กรุณาโหลดรายงานก่อน'); return; }
const doc = new jsPDF();
const pw = doc.internal.pageSize.getWidth();
let y = 20;
doc.setFontSize(16);
doc.text('Inventory Report', pw/2, y, { align: 'center' });
y += 10;
doc.setFontSize(9);
doc.text(`Items: ${data.items.length} | Type: ${data.type}`, pw/2, y, { align: 'center' });
doc.save(`inventory_report_${new Date().toISOString().split('T')[0]}.pdf`);
}

// Mobile PWA alias — called by app.js goPage("reports")
function loadReportsPage() { renderReportModule(); }
