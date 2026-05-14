// section_revenue.js โ€” Revenue section extracted from dashboard_pc.html
// Functions: renderRevenueSection, _exportRevenueCSV
// v5.17.0-phase42: Now fetches data via dedicated API call, falls back to dashboard data

// Cache for revenue data so _exportRevenueCSV can access it
let _revenueSectionData = null;

function _normalizeRevenueReportData(res) {
  const raw = (res && res.data) ? res.data : (res || {});
  if (!raw || !Object.keys(raw).length) return res;
  const revenueValue = Number(raw.revenue || raw.total_revenue || 0);
  const dailyRevenue = raw.dailyRevenue || raw.daily_revenue || raw.revenue_by_day || [];
  return {
    success: res && res.success !== false,
    summary: {
      revenue: {
        today: Number((raw.revenue && raw.revenue.today) || raw.today_revenue || 0),
        week: Number((raw.revenue && raw.revenue.week) || raw.week_revenue || 0),
        month: Number((raw.revenue && raw.revenue.month) || revenueValue || 0)
      }
    },
    revenue_by_day: Array.isArray(dailyRevenue) ? dailyRevenue.map(d => ({
      date: d.date || d.day || d.period || '',
      amount: Number(d.amount || d.total || d.revenue || 0)
    })) : [],
    report: { jobs: raw.jobs || raw.profitJobs || [] },
    raw_report: raw
  };
}

async function renderRevenueSection(data) {
  // If no data passed, fetch from API
  if (!data || (!data.summary && !data.revenue_by_day)) {
    try {
      let res = await callApi('getReportData', { period: 'month' });
      if (res && res.success) {
        data = _normalizeRevenueReportData(res);
      } else {
        res = await callApi('getDashboardData', {});
        if (res && res.success) {
          data = res;
        } else {
          const main = document.getElementById('revenue-content') || document.getElementById('main-content');
          if (main) {
            main.innerHTML = errorState(res?.error || 'เนเธกเนเธชเธฒเธกเธฒเธฃเธ–เนเธซเธฅเธ”เธเนเธญเธกเธนเธฅเธฃเธฒเธขเธฃเธฑเธเนเธ”เน', 'renderRevenueSection()');
          }
          return;
        }
      }
    } catch (e) {
      const main = document.getElementById('revenue-content') || document.getElementById('main-content');
      if (main) {
        main.innerHTML = errorState('เนเธกเนเธชเธฒเธกเธฒเธฃเธ–เน€เธเธทเนเธญเธกเธ•เนเธญเน€เธเธดเธฃเนเธเน€เธงเธญเธฃเนเนเธ”เน', 'renderRevenueSection()');
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
      ${kpiBox('bi-currency-exchange', '#d1fae5', '#059669', 'เธฟ'+today.toLocaleString(), 'เธงเธฑเธเธเธตเน', '')}
      ${kpiBox('bi-calendar-week', '#dbeafe', '#1e40af', 'เธฟ'+week.toLocaleString(), 'เธชเธฑเธเธ”เธฒเธซเนเธเธตเน', '')}
      ${kpiBox('bi-calendar-month', '#fef3c7', '#d97706', 'เธฟ'+month.toLocaleString(), 'เน€เธ”เธทเธญเธเธเธตเน', '')}
      ${kpiBox('bi-graph-up-arrow', totalProfit >= 0 ? '#d1fae5' : '#fee2e2', totalProfit >= 0 ? '#059669' : '#ef4444', 'เธฟ'+totalProfit.toLocaleString(), 'เธเธณเนเธฃ', `${margin}% margin`)}
    </div>

    <!-- Revenue Chart -->
    <div class="card-box" style="margin-bottom:16px">
      <div class="card-title"><i class="bi bi-bar-chart-fill" style="color:#d97706"></i> เธฃเธฒเธขเธฃเธฑเธเธฃเธฒเธขเธงเธฑเธ</div>
      <div class="chart-wrap"><canvas id="revenue-section-chart"></canvas></div>
    </div>

    <!-- Daily Breakdown Table -->
    <div class="card-box" style="margin-bottom:16px">
      <div class="card-title">
        <i class="bi bi-table" style="color:#1e40af"></i> เธฃเธฒเธขเธฃเธฑเธเธฃเธฒเธขเธงเธฑเธ
        <span class="badge-count">${dailyRev.length} เธงเธฑเธ</span>
      </div>
      ${dailyRev.length === 0 ? '<p style="color:#9ca3af;font-size:13px;text-align:center;padding:20px">เธขเธฑเธเนเธกเนเธกเธตเธเนเธญเธกเธนเธฅเธฃเธฒเธขเธฃเธฑเธ</p>' :
        `<div style="overflow-x:auto;max-height:300px;overflow-y:auto">
          <table class="job-table" style="width:100%">
            <thead><tr><th>เธงเธฑเธเธ—เธตเน</th><th style="text-align:right">เธฃเธฒเธขเธฃเธฑเธ (เธฟ)</th><th style="text-align:right">เธชเธฐเธชเธก (เธฟ)</th></tr></thead>
            <tbody>${(() => {
              let cumulative = 0;
              return dailyRev.map(d => {
                const amt = Number(d.amount || d.total || 0);
                cumulative += amt;
                return `<tr>
                  <td style="font-size:13px;white-space:nowrap">${d.date || d.day || '-'}</td>
                  <td style="text-align:right;font-weight:600;font-size:13px;color:${amt>0?'#059669':'#9ca3af'}">เธฟ${amt.toLocaleString()}</td>
                  <td style="text-align:right;font-size:13px;color:#6b7280">เธฟ${cumulative.toLocaleString()}</td>
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
        <i class="bi bi-clipboard-data" style="color:#059669"></i> เธเธณเนเธฃ/เธเธฒเธ”เธ—เธธเธ เธ•เธฒเธกเธเธฒเธ
        <span class="badge-count">${profitJobs.length} เธเธฒเธ</span>
      </div>
      <div style="overflow-x:auto;max-height:400px;overflow-y:auto">
        <table class="job-table" style="width:100%">
          <thead><tr><th>Job ID</th><th>เธฅเธนเธเธเนเธฒ</th><th style="text-align:right">เธฃเธฒเธขเธฃเธฑเธ</th><th style="text-align:right">เธ•เนเธเธ—เธธเธ</th><th style="text-align:right">เธเธณเนเธฃ</th></tr></thead>
          <tbody>${profitJobs.map(j => {
            const rev = Number(j.revenue||0);
            const cost = Number(j.cost||0);
            const profit = rev - cost;
            return `<tr>
              <td style="font-weight:600;font-size:13px;white-space:nowrap">${j.jobId||'-'}</td>
              <td style="font-size:13px">${j.customer||'-'}</td>
              <td style="text-align:right;font-size:13px">เธฟ${rev.toLocaleString()}</td>
              <td style="text-align:right;font-size:13px;color:#ef4444">เธฟ${cost.toLocaleString()}</td>
              <td style="text-align:right;font-weight:700;font-size:13px;color:${profit>=0?'#059669':'#ef4444'}">${profit>=0?'':'โ’'}เธฟ${Math.abs(profit).toLocaleString()}</td>
            </tr>`;
          }).join('')}
          <tr style="background:#f8fafc;font-weight:700">
            <td colspan="2" style="font-size:13px">เธฃเธงเธก</td>
            <td style="text-align:right;font-size:13px">เธฟ${totalRevenue.toLocaleString()}</td>
            <td style="text-align:right;font-size:13px;color:#ef4444">เธฟ${totalCost.toLocaleString()}</td>
            <td style="text-align:right;font-size:13px;color:${totalProfit>=0?'#059669':'#ef4444'}">${totalProfit>=0?'':'โ’'}เธฟ${Math.abs(totalProfit).toLocaleString()}</td>
          </tr>
        </table>
      </div>
    </div>` : ''}

    <!-- Summary Card -->
    <div class="card-box">
      <div class="card-title"><i class="bi bi-calculator" style="color:#6b7280"></i> เธชเธฃเธธเธ</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;padding:8px">
        <div style="text-align:center;padding:12px;background:#f8fafc;border-radius:8px">
          <div style="font-size:20px;font-weight:700;color:#059669">เธฟ${totalRevenue.toLocaleString()}</div>
          <div style="font-size:12px;color:#6b7280">เธฃเธฒเธขเธฃเธฑเธเธฃเธงเธก</div>
        </div>
        <div style="text-align:center;padding:12px;background:#f8fafc;border-radius:8px">
          <div style="font-size:20px;font-weight:700;color:#ef4444">เธฟ${totalCost.toLocaleString()}</div>
          <div style="font-size:12px;color:#6b7280">เธ•เนเธเธ—เธธเธเธฃเธงเธก</div>
        </div>
        <div style="text-align:center;padding:12px;background:#f8fafc;border-radius:8px">
          <div style="font-size:20px;font-weight:700;color:${totalProfit>=0?'#059669':'#ef4444'}">เธฟ${totalProfit.toLocaleString()}</div>
          <div style="font-size:12px;color:#6b7280">เธเธณเนเธฃเธชเธธเธ—เธเธด</div>
        </div>
        <div style="text-align:center;padding:12px;background:#f8fafc;border-radius:8px">
          <div style="font-size:20px;font-weight:700;color:#1e40af">${margin}%</div>
          <div style="font-size:12px;color:#6b7280">เธญเธฑเธ•เธฃเธฒเธเธณเนเธฃ</div>
        </div>
      </div>
      <div style="text-align:right;margin-top:12px">
        <button onclick="_showTaxCalculator()" style="background:#059669;color:#fff;border:none;padding:8px 16px;border-radius:8px;font-size:12px;cursor:pointer;margin-right:8px">
          <i class="bi bi-calculator"></i> เธเธณเธเธงเธ“เธ เธฒเธฉเธต
        </button>
        <button onclick="_exportRevenueCSV()" style="background:#1e40af;color:#fff;border:none;padding:8px 16px;border-radius:8px;font-size:12px;cursor:pointer">
          <i class="bi bi-download"></i> Export CSV
        </button>
      </div>
    </div>`;

  const container = document.getElementById('revenue-content') || document.getElementById('main-content');
  if (container) container.innerHTML = html;

  // Render chart
  setTimeout(() => {
    const ctx = document.getElementById('revenue-section-chart');
    if (ctx && dailyRev.length) {
      new Chart(ctx, {
        type: 'bar',
        data: {
          labels: dailyRev.map(d => d.date || d.day || ''),
          datasets: [{ label: 'เธฃเธฒเธขเธฃเธฑเธ (เธฟ)', data: dailyRev.map(d => d.amount || d.total || 0),
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
  if(!dailyRev.length) { alert('เนเธกเนเธกเธตเธเนเธญเธกเธนเธฅเธชเนเธเธญเธญเธ'); return; }
  let csv = 'เธงเธฑเธเธ—เธตเน,เธฃเธฒเธขเธฃเธฑเธ (เธฟ)\n';
  dailyRev.forEach(d => { csv += `${d.date||d.day||''},${d.amount||d.total||0}\n`; });
  const blob = new Blob(['\uFEFF'+csv], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `revenue_${new Date().toISOString().split('T')[0]}.csv`;
  a.click(); URL.revokeObjectURL(url);
}

// Mobile PWA alias โ€” called by app.js goPage("revenue")
function loadRevenuePage() { renderRevenueSection(); }

