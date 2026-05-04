// section_revenue.js — Revenue section extracted from dashboard_pc.html
// Functions: renderRevenueSection, _exportRevenueCSV
// v5.14.5-phase37: Now fetches data via dedicated API call, falls back to dashboard data

// Cache for revenue data so _exportRevenueCSV can access it
let _revenueSectionData = null;

async function renderRevenueSection(data) {
  // If no data passed, fetch from API
  if (!data || (!data.summary && !data.revenue_by_day)) {
    // TODO: Backend route 'getRevenueReport' not yet implemented — using getDashboardData as fallback
    try {
      const res = await callApi('getDashboardData', {});
      if (res && res.success) {
        data = res;
      } else {
        const main = document.getElementById('main-content');
        if (main) {
          main.innerHTML = errorState(res?.error || 'ไม่สามารถโหลดข้อมูลรายรับได้', 'renderRevenueSection()');
        }
        return;
      }
    } catch (e) {
      const main = document.getElementById('main-content');
      if (main) {
        main.innerHTML = errorState('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', 'renderRevenueSection()');
      }
      return;
    }
  }

  // Store for CSV export
  _revenueSectionData = data;

  const rev = (data.summary || {}).revenue || {};
  const today = Number(rev.today || 0);
  const week = Number(rev.week || 0);
  const month = Number(rev.month || 0);
  const dailyRev = data.revenue_by_day || [];
  const report = data.report || {};
  const profitJobs = report.jobs || [];

  // Calculate totals
  const totalRevenue = profitJobs.reduce((s,j) => s + Number(j.revenue||0), 0);
  const totalCost = profitJobs.reduce((s,j) => s + Number(j.cost||0), 0);
  const totalProfit = totalRevenue - totalCost;
  const margin = totalRevenue > 0 ? ((totalProfit/totalRevenue)*100).toFixed(1) : 0;

  let html = `
    <!-- KPI Cards -->
    <div class="kpi-row" style="margin-bottom:16px">
      ${kpiBox('bi-currency-exchange', '#d1fae5', '#059669', '฿'+today.toLocaleString(), 'วันนี้', '')}
      ${kpiBox('bi-calendar-week', '#dbeafe', '#1e40af', '฿'+week.toLocaleString(), 'สัปดาห์นี้', '')}
      ${kpiBox('bi-calendar-month', '#fef3c7', '#d97706', '฿'+month.toLocaleString(), 'เดือนนี้', '')}
      ${kpiBox('bi-graph-up-arrow', totalProfit >= 0 ? '#d1fae5' : '#fee2e2', totalProfit >= 0 ? '#059669' : '#ef4444', '฿'+totalProfit.toLocaleString(), 'กำไร', `${margin}% margin`)}
    </div>

    <!-- Revenue Chart -->
    <div class="card-box" style="margin-bottom:16px">
      <div class="card-title"><i class="bi bi-bar-chart-fill" style="color:#d97706"></i> รายรับรายวัน</div>
      <div class="chart-wrap"><canvas id="revenue-section-chart"></canvas></div>
    </div>

    <!-- Daily Breakdown Table -->
    <div class="card-box" style="margin-bottom:16px">
      <div class="card-title">
        <i class="bi bi-table" style="color:#1e40af"></i> รายรับรายวัน
        <span class="badge-count">${dailyRev.length} วัน</span>
      </div>
      ${dailyRev.length === 0 ? '<p style="color:#9ca3af;font-size:13px;text-align:center;padding:20px">ยังไม่มีข้อมูลรายรับ</p>' :
        `<div style="overflow-x:auto;max-height:300px;overflow-y:auto">
          <table class="job-table" style="width:100%">
            <thead><tr><th>วันที่</th><th style="text-align:right">รายรับ (฿)</th><th style="text-align:right">สะสม (฿)</th></tr></thead>
            <tbody>${(() => {
              let cumulative = 0;
              return dailyRev.map(d => {
                const amt = Number(d.amount || d.total || 0);
                cumulative += amt;
                return `<tr>
                  <td style="font-size:13px;white-space:nowrap">${d.date || d.day || '-'}</td>
                  <td style="text-align:right;font-weight:600;font-size:13px;color:${amt>0?'#059669':'#9ca3af'}">฿${amt.toLocaleString()}</td>
                  <td style="text-align:right;font-size:13px;color:#6b7280">฿${cumulative.toLocaleString()}</td>
                </tr>`;
              }).join('');
            })()}</tbody>
          </table>
        </div>`}
    </div>

    <!-- Profit by Job -->
    ${profitJobs.length > 0 ? `
    <div class="card-box" style="margin-bottom:16px">
      <div class="card-title">
        <i class="bi bi-clipboard-data" style="color:#059669"></i> กำไร/ขาดทุน ตามงาน
        <span class="badge-count">${profitJobs.length} งาน</span>
      </div>
      <div style="overflow-x:auto;max-height:400px;overflow-y:auto">
        <table class="job-table" style="width:100%">
          <thead><tr><th>Job ID</th><th>ลูกค้า</th><th style="text-align:right">รายรับ</th><th style="text-align:right">ต้นทุน</th><th style="text-align:right">กำไร</th></tr></thead>
          <tbody>${profitJobs.map(j => {
            const rev = Number(j.revenue||0);
            const cost = Number(j.cost||0);
            const profit = rev - cost;
            return `<tr>
              <td style="font-weight:600;font-size:13px;white-space:nowrap">${j.jobId||'-'}</td>
              <td style="font-size:13px">${j.customer||'-'}</td>
              <td style="text-align:right;font-size:13px">฿${rev.toLocaleString()}</td>
              <td style="text-align:right;font-size:13px;color:#ef4444">฿${cost.toLocaleString()}</td>
              <td style="text-align:right;font-weight:700;font-size:13px;color:${profit>=0?'#059669':'#ef4444'}">${profit>=0?'':'−'}฿${Math.abs(profit).toLocaleString()}</td>
            </tr>`;
          }).join('')}
          <tr style="background:#f8fafc;font-weight:700">
            <td colspan="2" style="font-size:13px">รวม</td>
            <td style="text-align:right;font-size:13px">฿${totalRevenue.toLocaleString()}</td>
            <td style="text-align:right;font-size:13px;color:#ef4444">฿${totalCost.toLocaleString()}</td>
            <td style="text-align:right;font-size:13px;color:${totalProfit>=0?'#059669':'#ef4444'}">${totalProfit>=0?'':'−'}฿${Math.abs(totalProfit).toLocaleString()}</td>
          </tr>
        </table>
      </div>
    </div>` : ''}

    <!-- Summary Card -->
    <div class="card-box">
      <div class="card-title"><i class="bi bi-calculator" style="color:#6b7280"></i> สรุป</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;padding:8px">
        <div style="text-align:center;padding:12px;background:#f8fafc;border-radius:8px">
          <div style="font-size:20px;font-weight:700;color:#059669">฿${totalRevenue.toLocaleString()}</div>
          <div style="font-size:12px;color:#6b7280">รายรับรวม</div>
        </div>
        <div style="text-align:center;padding:12px;background:#f8fafc;border-radius:8px">
          <div style="font-size:20px;font-weight:700;color:#ef4444">฿${totalCost.toLocaleString()}</div>
          <div style="font-size:12px;color:#6b7280">ต้นทุนรวม</div>
        </div>
        <div style="text-align:center;padding:12px;background:#f8fafc;border-radius:8px">
          <div style="font-size:20px;font-weight:700;color:${totalProfit>=0?'#059669':'#ef4444'}">฿${totalProfit.toLocaleString()}</div>
          <div style="font-size:12px;color:#6b7280">กำไรสุทธิ</div>
        </div>
        <div style="text-align:center;padding:12px;background:#f8fafc;border-radius:8px">
          <div style="font-size:20px;font-weight:700;color:#1e40af">${margin}%</div>
          <div style="font-size:12px;color:#6b7280">อัตรากำไร</div>
        </div>
      </div>
      <div style="text-align:right;margin-top:12px">
        <button onclick="_showTaxCalculator()" style="background:#059669;color:#fff;border:none;padding:8px 16px;border-radius:8px;font-size:12px;cursor:pointer;margin-right:8px">
          <i class="bi bi-calculator"></i> คำนวณภาษี
        </button>
        <button onclick="_exportRevenueCSV()" style="background:#1e40af;color:#fff;border:none;padding:8px 16px;border-radius:8px;font-size:12px;cursor:pointer">
          <i class="bi bi-download"></i> Export CSV
        </button>
      </div>
    </div>`;

  document.getElementById('main-content').innerHTML = html;

  // Render chart
  setTimeout(() => {
    const ctx = document.getElementById('revenue-section-chart');
    if (ctx && dailyRev.length) {
      new Chart(ctx, {
        type: 'bar',
        data: {
          labels: dailyRev.map(d => d.date || d.day || ''),
          datasets: [{ label: 'รายรับ (฿)', data: dailyRev.map(d => d.amount || d.total || 0),
            backgroundColor: '#3b82f6', borderRadius: 6 }]
        },
        options: { responsive: true, plugins: { legend: { display: false } },
          scales: { y: { beginAtZero: true } } }
      });
    }
  }, 100);
}

function _exportRevenueCSV() {
  const data = _revenueSectionData || (typeof DASHBOARD_DATA !== 'undefined' ? DASHBOARD_DATA : null) || {};
  const dailyRev = data.revenue_by_day || [];
  if(!dailyRev.length) { alert('ไม่มีข้อมูลส่งออก'); return; }
  let csv = 'วันที่,รายรับ (฿)\n';
  dailyRev.forEach(d => { csv += `${d.date||d.day||''},${d.amount||d.total||0}\n`; });
  const blob = new Blob(['\uFEFF'+csv], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `revenue_${new Date().toISOString().split('T')[0]}.csv`;
  a.click(); URL.revokeObjectURL(url);
}

// Mobile PWA alias — called by app.js goPage("revenue")
function loadRevenuePage() { renderRevenueSection(); }
