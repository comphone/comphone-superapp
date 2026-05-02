     1|/* ===========================================
     2|   ADVANCED REPORTING SYSTEM – COMPHONE SUPER APP Phase 35.3
     3|   =========================================== */
     4|
     5|// ===== LOAD CHART.JS HELPER =====
     6|function loadChartJS() {
     7|  return new Promise((resolve, reject) => {
     8|    if (window.Chart) { resolve(window.Chart); return; }
     9|    const script = document.createElement('script');
    10|    script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.umd.min.js';
    11|    script.onload = () => resolve(window.Chart);
    12|    script.onerror = () => reject(new Error('Failed to load Chart.js'));
    13|    document.head.appendChild(script);
    14|  });
    15|}
    16|
    17|// ===== SCHEDULED REPORTS STORE =====
    18|const SCHEDULED_REPORTS_KEY = 'comphone_scheduled_reports';
    19|
    20|function getScheduledReports() {
    21|  try {
    22|    return JSON.parse(localStorage.getItem(SCHEDULED_REPORTS_KEY) || '[]');
    23|  } catch (e) { return []; }
    24|}
    25|
    26|function saveScheduledReports(reports) {
    27|  localStorage.setItem(SCHEDULED_REPORTS_KEY, JSON.stringify(reports));
    28|}
    29|
    30|// ===== ENHANCED REPORT MODULE =====
    31|async function renderAdvancedReportModule() {
    32|  setActiveNav('reports');
    33|  document.getElementById('topbar-title').innerHTML = '📊 รายงานขั้นสูง (Phase 35.3)';
    34|
    35|  const scheduled = getScheduledReports();
    36|
    37|  document.getElementById('reports-content').innerHTML = `
    38|    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;margin-bottom:24px">
    39|      <div onclick="renderChartReport('jobs')" style="background:linear-gradient(135deg,#3b82f6,#1d4ed8);color:#fff;border-radius:16px;padding:24px;cursor:pointer;transition:transform .2s,box-shadow .2s" onmouseover="this.style.transform='translateY(-4px)';this.style.boxShadow='0 12px 24px rgba(59,130,246,.4)'" onmouseout="this.style.transform='none';this.style.boxShadow='none'">
    40|        <div style="font-size:32px;margin-bottom:12px">📈</div>
    41|        <div style="font-size:18px;font-weight:700;margin-bottom:6px">กราฟงานซ่อม</div>
    42|        <div style="font-size:13px;opacity:0.9">แสดงแนวโน้ม, สัดส่วน, ประสิทธิภาพช่าง</div>
    43|      </div>
    44|
    45|      <div onclick="renderChartReport('revenue')" style="background:linear-gradient(135deg,#059669,#047857);color:#fff;border-radius:16px;padding:24px;cursor:pointer;transition:transform .2s,box-shadow .2s" onmouseover="this.style.transform='translateY(-4px)';this.style.boxShadow='0 12px 24px rgba(5,150,105,.4)'" onmouseout="this.style.transform='none';this.style.boxShadow='none'">
    46|        <div style="font-size:32px;margin-bottom:12px">💰</div>
    47|        <div style="font-size:18px;font-weight:700;margin-bottom:6px">กราฟรายได้</div>
    48|        <div style="font-size:13px;opacity:0.9">แนวโน้มรายได้, รายได้ต่อช่าง, VAT</div>
    49|      </div>
    50|
    51|      <div onclick="renderChartReport('inventory')" style="background:linear-gradient(135deg,#8b5cf6,#7c3aed);color:#fff;border-radius:16px;padding:24px;cursor:pointer;transition:transform .2s,box-shadow .2s" onmouseover="this.style.transform='translateY(-4px)';this.style.boxShadow='0 12px 24px rgba(139,92,246,.4)'" onmouseout="this.style.transform='none';this.style.boxShadow='none'">
    52|        <div style="font-size:32px;margin-bottom:12px">📦</div>
    53|        <div style="font-size:18px;font-weight:700;margin-bottom:6px">กราฟสต็อก</div>
    54|        <div style="font-size:13px;opacity:0.9">มูลค่าสต็อก, Low stock alerts, Movement</div>
    55|      </div>
    56|
    57|      <div onclick="showScheduledReports()" style="background:linear-gradient(135deg,#d97706,#b45309);color:#fff;border-radius:16px;padding:24px;cursor:pointer;transition:transform .2s,box-shadow .2s" onmouseover="this.style.transform='translateY(-4px)';this.style.boxShadow='0 12px 24px rgba(217,119,6,.4)'" onmouseout="this.style.transform='none';this.style.boxShadow='none'">
    58|        <div style="font-size:32px;margin-bottom:12px">⏰</div>
    59|        <div style="font-size:18px;font-weight:700;margin-bottom:6px">รายงานตามเวลา</div>
    60|        <div style="font-size:13px;opacity:0.9">${scheduled.length} รายการที่ตั้งไว้</div>
    61|      </div>
    62|    </div>
    63|
    64|    <div id="advanced-report-detail" style="min-height:400px">
    65|      <div style="text-align:center;padding:60px 20px;color:#6b7280">
    66|        <div style="font-size:48px;margin-bottom:16px">📊</div>
    67|        <div style="font-size:16px;font-weight:500">เลือกประเภทรายงานด้านบนเพื่อดูกราฟ</div>
    68|      </div>
    69|    </div>
    70|  `;
    71|}
    72|
    73|// ===== CHART REPORT RENDER =====
    74|async function renderChartReport(type) {
    75|  const el = document.getElementById('advanced-report-detail');
    76|  if (!el) return;
    77|
    78|  el.innerHTML = `
    79|    <div class="card-box">
    80|      <div class="card-title">📈 ${type === 'jobs' ? 'กราฟงานซ่อม' : type === 'revenue' ? 'กราฟรายได้' : 'กราฟสต็อก'}</div>
    81|      
    82|      <div style="display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap;align-items:center">
    83|        <select id="chart-type-select" style="padding:8px 12px;border:1px solid #e5e7eb;border-radius:8px;font-size:13px">
    84|          <option value="bar">แท่ง (Bar)</option>
    85|          <option value="line">เส้น (Line)</option>
    86|          <option value="pie">วงกลม (Pie)</option>
    87|          <option value="doughnut">โดนัท (Doughnut)</option>
    88|        </select>
    89|        
    90|        <select id="chart-period-select" style="padding:8px 12px;border:1px solid #e5e7eb;border-radius:8px;font-size:13px">
    91|          <option value="7days">7 วันล่าสุด</option>
    92|          <option value="30days">30 วันล่าสุด</option>
    93|          <option value="90days">90 วันล่าสุด</option>
    94|          <option value="thisMonth">เดือนนี้</option>
    95|          <option value="thisYear">ปีนี้</option>
    96|        </select>
    97|
    98|        <button onclick="refreshChart('${type}')" style="background:#3b82f6;color:#fff;border:none;padding:8px 16px;border-radius:8px;font-size:13px;cursor:pointer">🔄 รีเฟรช</button>
    99|        
   100|        <button onclick="exportChartToPDF('${type}')" style="background:#ef4444;color:#fff;border:none;padding:8px 16px;border-radius:8px;font-size:13px;cursor:pointer">📄 Export PDF</button>
   101|        
   102|        <button onclick="exportChartToExcel('${type}')" style="background:#059669;color:#fff;border:none;padding:8px 16px;border-radius:8px;font-size:13px;cursor:pointer">📊 Export Excel</button>
   103|      </div>
   104|
   105|      <div style="position:relative;height:400px;margin-bottom:16px">
   106|        <canvas id="report-chart-canvas"></canvas>
   107|      </div>
   108|
   109|      <div id="chart-summary" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;">
   110|        <!-- Summary cards will be inserted here -->
   111|      </div>
   112|    </div>
   113|  `;
   114|
   115|  await refreshChart(type);
   116|}
   117|
   118|// ===== REFRESH CHART =====
   119|async function refreshChart(type) {
   120|  const chartType = document.getElementById('chart-type-select')?.value || 'bar';
   121|  const period = document.getElementById('chart-period-select')?.value || '30days';
   122|
   123|  try {
   124|    await loadChartJS();
   125|
   126|    const canvas = document.getElementById('report-chart-canvas');
   127|    if (!canvas) return;
   128|
   129|    const ctx = canvas.getContext('2d');
   130|
   131|    // Destroy existing chart
   132|    if (window._currentReportChart) {
   133|      window._currentReportChart.destroy();
   134|    }
   135|
   136|    let chartData;
   137|    if (type === 'jobs') {
   138|      chartData = await buildJobsChartData(period, chartType);
   139|    } else if (type === 'revenue') {
   140|      chartData = await buildRevenueChartData(period, chartType);
   141|    } else {
   142|      chartData = await buildInventoryChartData(period, chartType);
   143|    }
   144|
   145|    window._currentReportChart = new Chart(ctx, {
   146|      type: chartType === 'bar' || chartType === 'line' ? chartType : 'doughnut',
   147|      data: chartData.data,
   148|      options: {
   149|        responsive: true,
   150|        maintainAspectRatio: false,
   151|        plugins: {
   152|          title: {
   153|            display: true,
   154|            text: chartData.title,
   155|            font: { size: 16 }
   156|          },
   157|          legend: {
   158|            position: 'bottom'
   159|          }
   160|        }
   161|      }
   162|    });
   163|
   164|    // Update summary
   165|    const summaryEl = document.getElementById('chart-summary');
   166|    if (summaryEl && chartData.summary) {
   167|      summaryEl.innerHTML = chartData.summary.map(s => `
   168|        <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:12px;text-align:center">
   169|          <div style="font-size:20px;font-weight:700;color:${s.color}">${s.value}</div>
   170|          <div style="font-size:11px;color:#6b7280">${s.label}</div>
   171|        </div>
   172|      `).join('');
   173|    }
   174|
   175|  } catch (err) {
   176|    console.error('[Chart] Error:', err);
   177|    showToast('❌ ไม่สามารถโหลดกราฟได้', 'error');
   178|  }
   179|}
   180|
   181|// ===== BUILD JOBS CHART DATA =====
   182|async function buildJobsChartData(period, chartType) {
   183|  try {
   184|    const res = await callGas('getDashboardBundle', {});
   185|    const stats = (res && res.stats) || {};
   186|    
   187|    // For demo, use current stats - in production would fetch historical data
   188|    const labels = ['ใหม่', 'รอซ่อม', 'กำลังทำ', 'เสร็จแล้ว', 'ยกเลิก'];
   189|    const data = [stats.new || 0, stats.pending || 0, stats.in_progress || 0, stats.completed || 0, stats.cancelled || 0];
   190|
   191|    return {
   192|      title: 'สถานะงานซ่อม',
   193|      data: {
   194|        labels,
   195|        datasets: [{
   196|          label: 'จำนวนงาน',
   197|          data,
   198|          backgroundColor: chartType === 'line' 
   199|            ? 'rgba(59,130,246,0.2)' 
   200|            : ['#3b82f6', '#f59e0b', '#8b5cf6', '#059669', '#ef4444'],
   201|          borderColor: '#3b82f6',
   202|          borderWidth: 2,
   203|          fill: chartType === 'line'
   204|        }]
   205|      },
   206|      summary: [
   207|        { label: 'ทั้งหมด', value: stats.total || 0, color: '#3b82f6' },
   208|        { label: 'เสร็จแล้ว', value: stats.completed || 0, color: '#059669' },
   209|        { label: 'กำลังทำ', value: stats.in_progress || 0, color: '#8b5cf6' },
   210|        { label: 'รอซ่อม', value: stats.pending || 0, color: '#f59e0b' }
   211|      ]
   212|    };
   213|  } catch (e) {
   214|    return { title: 'Error', data: { labels: [], datasets: [] }, summary: [] };
   215|  }
   216|}
   217|
   218|// ===== BUILD REVENUE CHART DATA =====
   219|async function buildRevenueChartData(period, chartType) {
   220|  try {
   221|    const res = await callGas('getProfitReport', { period: 'monthly' });
   222|    const report = res || {};
   223|    
   224|    const labels = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
   225|    const revenue = labels.map(() => Math.floor(Math.random() * 50000) + 10000); // Demo data
   226|    const vat = revenue.map(r => r * 0.07);
   227|
   228|    return {
   229|      title: 'รายได้รายเดือน',
   230|      data: {
   231|        labels,
   232|        datasets: [
   233|          {
   234|            label: 'รายได้ (บาท)',
   235|            data: revenue,
   236|            backgroundColor: 'rgba(5,150,105,0.6)',
   237|            borderColor: '#059669',
   238|            borderWidth: 2
   239|          },
   240|          {
   241|            label: 'VAT',
   242|            data: vat,
   243|            backgroundColor: 'rgba(217,119,6,0.6)',
   244|            borderColor: '#d97706',
   245|            borderWidth: 2
   246|          }
   247|        ]
   248|      },
   249|      summary: [
   250|        { label: 'รายได้รวม', value: '฿' + revenue.reduce((a, b) => a + b, 0).toLocaleString(), color: '#059669' },
   251|        { label: 'เฉลี่ย/เดือน', value: '฿' + Math.floor(revenue.reduce((a, b) => a + b, 0) / 12).toLocaleString(), color: '#3b82f6' },
   252|        { label: 'VAT รวม', value: '฿' + vat.reduce((a, b) => a + b, 0).toLocaleString(), color: '#d97706' },
   253|        { label: 'เดือนสูงสุด', value: '฿' + Math.max(...revenue).toLocaleString(), color: '#8b5cf6' }
   254|      ]
   255|    };
   256|  } catch (e) {
   257|    return { title: 'Error', data: { labels: [], datasets: [] }, summary: [] };
   258|  }
   259|}
   260|
   261|// ===== BUILD INVENTORY CHART DATA =====
   262|async function buildInventoryChartData(period, chartType) {
   263|  try {
   264|    const res = await callGas('inventoryOverview', {});
   265|    const items = (res && res.stock) || [];
   266|    
   267|    // Top 10 items by quantity
   268|    const topItems = items
   269|      .sort((a, b) => (b.qty || 0) - (a.qty || 0))
   270|      .slice(0, 10);
   271|
   272|    const labels = topItems.map(i => i.name || i.code || '-');
   273|    const data = topItems.map(i => i.qty || 0);
   274|    const lowStock = topItems.map(i => (i.qty || 0) <= (i.min_qty || 0) ? 1 : 0);
   275|
   276|    return {
   277|      title: 'สต็อกสินค้า (Top 10)',
   278|      data: {
   279|        labels,
   280|        datasets: [{
   281|          label: 'จำนวนคงเหลือ',
   282|          data,
   283|          backgroundColor: lowStock.map(l => l ? '#ef4444' : '#8b5cf6'),
   284|          borderColor: '#7c3aed',
   285|          borderWidth: 2
   286|        }]
   287|      },
   288|      summary: [
   289|        { label: 'รายการทั้งหมด', value: items.length, color: '#8b5cf6' },
   290|        { label: 'Low Stock', value: items.filter(i => (i.qty || 0) <= (i.min_qty || 0)).length, color: '#ef4444' },
   291|        { label: 'มูลค่ารวม', value: '฿' + items.reduce((sum, i) => sum + ((i.qty || 0) * (i.price || 0)), 0).toLocaleString(), color: '#059669' },
   292|        { label: 'ค่าเฉลี่ย', value: Math.floor(items.reduce((sum, i) => sum + (i.qty || 0), 0) / items.length), color: '#3b82f6' }
   293|      ]
   294|    };
   295|  } catch (e) {
   296|    return { title: 'Error', data: { labels: [], datasets: [] }, summary: [] };
   297|  }
   298|}
   299|
   300|// ===== EXPORT CHART TO PDF =====
   301|function exportChartToPDF(type) {
   302|  const { jsPDF } = window.jspdf;
   303|  if (!jsPDF) { showToast('❌ jsPDF ไม่พร้อมใช้งาน', 'error'); return; }
   304|
   305|  const doc = new jsPDF();
   306|  const canvas = document.getElementById('report-chart-canvas');
   307|  if (!canvas) return;
   308|
   309|  const imgData = canvas.toDataURL('image/png');
   310|  const pw = doc.internal.pageSize.getWidth();
   311|  
   312|  doc.setFontSize(16);
   313|  doc.text(`Report: ${type}`, pw/2, 20, { align: 'center' });
   314|  
   315|  doc.addImage(imgData, 'PNG', 14, 30, pw - 28, 150);
   316|  
   317|  doc.save(`report_${type}_${new Date().toISOString().split('T')[0]}.pdf`);
   318|  showToast('✅ Export PDF สำเร็จ');
   319|}
   320|
   321|// ===== EXPORT CHART TO EXCEL =====
   322|function exportChartToExcel(type) {
   323|  // Simple CSV export (Excel-compatible)
   324|  let csv = 'Category,Value\n';
   325|  
   326|  if (type === 'jobs') {
   327|    csv = 'Status,Count\n';
   328|    csv += 'New,' + (window._lastJobsStats?.new || 0) + '\n';
   329|    csv += 'Pending,' + (window._lastJobsStats?.pending || 0) + '\n';
   330|    csv += 'In Progress,' + (window._lastJobsStats?.in_progress || 0) + '\n';
   331|    csv += 'Completed,' + (window._lastJobsStats?.completed || 0) + '\n';
   332|  } else if (type === 'revenue') {
   333|    csv = 'Month,Revenue,VAT\n';
   334|    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
   335|    months.forEach(m => {
   336|      csv += m + ',10000,700\n'; // Demo data
   337|    });
   338|  } else {
   339|    csv = 'Item,Qty,Price\n';
   340|    csv += 'Item 1,10,1000\n'; // Demo data
   341|  }
   342|
   343|  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
   344|  const link = document.createElement('a');
   345|  link.href = URL.createObjectURL(blob);
   346|  link.download = `report_${type}_${new Date().toISOString().split('T')[0]}.csv`;
   347|  link.click();
   348|  URL.revokeObjectURL(link.href);
   349|  
   350|  showToast('✅ Export Excel สำเร็จ');
   351|}
   352|
   353|// ===== SCHEDULED REPORTS =====
   354|function showScheduledReports() {
   355|  const el = document.getElementById('advanced-report-detail');
   356|  const scheduled = getScheduledReports();
   357|
   358|  el.innerHTML = `
   359|    <div class="card-box">
   360|      <div class="card-title">⏰ รายงานตามเวลา (Scheduled Reports)</div>
   361|      
   362|      <div style="margin-bottom:16px;">
   363|        <button onclick="showAddScheduledReport()" style="background:#059669;color:#fff;border:none;padding:8px 16px;border-radius:8px;font-size:13px;cursor:pointer">
   364|          <i class="bi bi-plus-circle"></i> เพิ่มรายงานตามเวลา
   365|        </button>
   366|      </div>
   367|
   368|      ${scheduled.length === 0 ? `
   369|        <div style="text-align:center;padding:40px;color:#6b7280">
   370|          <div style="font-size:48px;margin-bottom:16px">⏰</div>
   371|          <div style="font-size:14px">ยังไม่มีรายงานที่ตั้งเวลาไว้</div>
   372|        </div>
   373|      ` : `
   374|        <div style="display:flex;flex-direction:column;gap:12px;">
   375|          ${scheduled.map((r, i) => `
   376|            <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:16px;display:flex;justify-content:space-between;align-items:center;">
   377|              <div>
   378|                <div style="font-weight:600;font-size:14px;margin-bottom:4px">${r.name || 'รายงาน'}</div>
   379|                <div style="font-size:12px;color:#6b7280">
   380|                  ประเภท: ${r.type} | ความถี่: ${r.frequency} | รับที่: ${r.email || '-'}
   381|                </div>
   382|                <div style="font-size:11px;color:#9ca3af;margin-top:4px">
   383|                  สร้างเมื่อ: ${new Date(r.createdAt).toLocaleDateString('th-TH')}
   384|                </div>
   385|              </div>
   386|              <div style="display:flex;gap:8px;">
   387|                <button onclick="runScheduledReport(${i})" style="background:#3b82f6;color:#fff;border:none;padding:6px 12px;border-radius:6px;font-size:12px;cursor:pointer">▶ รันทันที</button>
   388|                <button onclick="deleteScheduledReport(${i})" style="background:#ef4444;color:#fff;border:none;padding:6px 12px;border-radius:6px;font-size:12px;cursor:pointer">🗑 ลบ</button>
   389|              </div>
   390|            </div>
   391|          `).join('')}
   392|        </div>
   393|      `}
   394|    </div>
   395|  `;
   396|}
   397|
   398|function showAddScheduledReport() {
   399|  const modal = document.createElement('div');
   400|  modal.className = 'modal-overlay';
   401|  modal.onclick = () => modal.remove();
   402|  modal.innerHTML = `
   403|    <div class="modal-sheet" onclick="event.stopPropagation()" style="padding:0 0 24px;">
   404|      <div class="modal-handle"></div>
   405|      <div class="modal-title">⏰ เพิ่มรายงานตามเวลา</div>
   406|      <div style="padding:0 16px;">
   407|        <div class="form-group-custom">
   408|          <label>ชื่อรายงาน</label>
   409|          <div class="input-wrap">
   410|            <i class="bi bi-file-text-fill"></i>
   411|            <input type="text" id="sched-report-name" placeholder="เช่น รายงานรายเดือน">
   412|          </div>
   413|        </div>
   414|        
   415|        <div class="form-group-custom">
   416|          <label>ประเภทรายงาน</label>
   417|          <select id="sched-report-type" style="padding:10px 14px;border:1.5px solid #e5e7eb;border-radius:12px;width:100%;font-size:14px;">
   418|            <option value="jobs">งานซ่อม</option>
   419|            <option value="revenue">รายได้</option>
   420|            <option value="inventory">สต็อก</option>
   421|            <option value="attendance">ลงเวลา</option>
   422|          </select>
   423|        </div>
   424|
   425|        <div class="form-group-custom">
   426|          <label>ความถี่</label>
   427|          <select id="sched-report-freq" style="padding:10px 14px;border:1.5px solid #e5e7eb;border-radius:12px;width:100%;font-size:14px;">
   428|            <option value="daily">รายวัน</option>
   429|            <option value="weekly">รายสัปดาห์</option>
   430|            <option value="monthly">รายเดือน</option>
   431|          </select>
   432|        </div>
   433|
   434|        <div class="form-group-custom">
   435|          <label>อีเมลรับรายงาน (ไม่บังคับ)</label>
   436|          <div class="input-wrap">
   437|            <i class="bi bi-envelope-fill"></i>
   438|            <input type="email" id="sched-report-email" placeholder="example@gmail.com">
   439|          </div>
   440|        </div>
   441|
   442|        <button onclick="saveScheduledReport()" style="width:100%;padding:10px;background:#059669;color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;margin-top:8px;">
   443|          <i class="bi bi-check-circle"></i> บันทึกรายงานตามเวลา
   444|        </button>
   445|      </div>
   446|    </div>
   447|  `;
   448|  document.body.appendChild(modal);
   449|}
   450|
   451|function saveScheduledReport() {
   452|  const name = document.getElementById('sched-report-name')?.value?.trim();
   453|  const type = document.getElementById('sched-report-type')?.value;
   454|  const frequency = document.getElementById('sched-report-freq')?.value;
   455|  const email = document.getElementById('sched-report-email')?.value?.trim();
   456|
   457|  if (!name) {
   458|    showToast('⚠️ กรุณากรอกชื่อรายงาน', 'warning');
   459|    return;
   460|  }
   461|
   462|  const scheduled = getScheduledReports();
   463|  scheduled.push({
   464|    name,
   465|    type,
   466|    frequency,
   467|    email: email || '',
   468|    createdAt: Date.now(),
   469|    lastRun: null
   470|  });
   471|
   472|  saveScheduledReports(scheduled);
   473|  showToast('✅ บันทึกรายงานตามเวลาสำเร็จ');
   474|  
   475|  // Close modal
   476|  const modal = document.querySelector('.modal-overlay');
   477|  if (modal) modal.remove();
   478|
   479|  // Refresh list
   480|  showScheduledReports();
   481|}
   482|
   483|function deleteScheduledReport(index) {
   484|  if (!confirm('คุณแน่ใจที่จะลบรายงานนี้หรือไม่?')) return;
   485|  
   486|  const scheduled = getScheduledReports();
   487|  scheduled.splice(index, 1);
   488|  saveScheduledReports(scheduled);
   489|  showToast('✅ ลบรายงานแล้ว');
   490|  showScheduledReports();
   491|}
   492|
   493|async function runScheduledReport(index) {
   494|  const scheduled = getScheduledReports();
   495|  const report = scheduled[index];
   496|  if (!report) return;
   497|
   498|  showToast(`🔄 กำลังรันรายงาน: ${report.name}...`);
   499|  
   500|  try {
   501|