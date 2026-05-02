     1|/* ============================================
     2|   REPORT MODULE – COMPHONE SUPER APP Phase 32
     3|   ============================================ */
     4|
     5|async function renderReportModule(data) {
     6|  setActiveNav('reports');
     7|  document.getElementById('topbar-title').innerHTML = '📊 ศูนย์รวมรายงาน';
     8|
     9|  document.getElementById('reports-content').innerHTML = `
    10|    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;margin-bottom:24px">
    11|      <div onclick="_showReport('attendance')" style="background:linear-gradient(135deg,#3b82f6,#1d4ed8);color:#fff;border-radius:16px;padding:24px;cursor:pointer;transition:transform .2s,box-shadow .2s" onmouseover="this.style.transform='translateY(-4px)';this.style.boxShadow='0 12px 24px rgba(59,130,246,.4)'" onmouseout="this.style.transform='none';this.style.boxShadow='none'">
    12|        <div style="font-size:32px;margin-bottom:12px">⏰</div>
    13|        <div style="font-size:18px;font-weight:700;margin-bottom:6px">รายงานลงเวลา</div>
    14|        <div style="font-size:13px;opacity:0.9">สรุปรายเดือน/รายปี พร้อม Export PDF</div>
    15|      </div>
    16|
    17|      <div onclick="_showReport('jobs')" style="background:linear-gradient(135deg,#059669,#047857);color:#fff;border-radius:16px;padding:24px;cursor:pointer;transition:transform .2s,box-shadow .2s" onmouseover="this.style.transform='translateY(-4px)';this.style.boxShadow='0 12px 24px rgba(5,150,105,.4)'" onmouseout="this.style.transform='none';this.style.boxShadow='none'">
    18|        <div style="font-size:32px;margin-bottom:12px">🔧</div>
    19|        <div style="font-size:18px;font-weight:700;margin-bottom:6px">รายงานงานซ่อม</div>
    20|        <div style="font-size:13px;opacity:0.9">สถิติงาน, อัตราสำเร็จ, รายช่าง</div>
    21|      </div>
    22|
    23|      <div onclick="_showReport('billing')" style="background:linear-gradient(135deg,#d97706,#b45309);color:#fff;border-radius:16px;padding:24px;cursor:pointer;transition:transform .2s,box-shadow .2s" onmouseover="this.style.transform='translateY(-4px)';this.style.boxShadow='0 12px 24px rgba(217,119,6,.4)'" onmouseout="this.style.transform='none';this.style.boxShadow='none'">
    24|        <div style="font-size:32px;margin-bottom:12px">💰</div>
    25|        <div style="font-size:18px;font-weight:700;margin-bottom:6px">รายงานบิล/เงิน</div>
    26|        <div style="font-size:13px;opacity:0.9">สรุปรายได้, ภาษี, PromptPay</div>
    27|      </div>
    28|
    29|      <div onclick="_showReport('inventory')" style="background:linear-gradient(135deg,#8b5cf6,#7c3aed);color:#fff;border-radius:16px;padding:24px;cursor:pointer;transition:transform .2s,box-shadow .2s" onmouseover="this.style.transform='translateY(-4px)';this.style.boxShadow='0 12px 24px rgba(139,92,246,.4)'" onmouseout="this.style.transform='none';this.style.boxShadow='none'">
    30|        <div style="font-size:32px;margin-bottom:12px">📦</div>
    31|        <div style="font-size:18px;font-weight:700;margin-bottom:6px">รายงานสต็อก</div>
    32|        <div style="font-size:13px;opacity:0.9">สินค้าคงคลัง, เคลื่อนไหว, Low Stock</div>
    33|      </div>
    34|    </div>
    35|
    36|    <div id="report-detail" style="min-height:300px">
    37|      <div style="text-align:center;padding:60px 20px;color:#6b7280">
    38|        <div style="font-size:48px;margin-bottom:16px">📊</div>
    39|        <div style="font-size:16px;font-weight:500">เลือกรายงานด้านบนเพื่อดูรายละเอียด</div>
    40|      </div>
    41|    </div>
    42|  `;
    43|}
    44|
    45|async function _showReport(type) {
    46|  const el = document.getElementById('report-detail');
    47|
    48|  if (type === 'attendance') {
    49|    el.innerHTML = `
    50|      <div class="card-box">
    51|        <div class="card-title">📊 รายงานลงเวลา (Attendance Report)</div>
    52|        <div style="display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap;align-items:center">
    53|          <select id="rpt-att-type" style="padding:8px 12px;border:1px solid #e5e7eb;border-radius:8px;font-size:13px">
    54|            <option value="month">รายเดือน</option>
    55|            <option value="year">รายปี</option>
    56|          </select>
    57|          <input type="number" id="rpt-att-year" placeholder="ปี (เช่น 2026)" style="padding:8px 12px;border:1px solid #e5e7eb;border-radius:8px;font-size:13px;width:130px" />
    58|          <button onclick="_loadReportAttendance()" style="background:#3b82f6;color:#fff;border:none;padding:8px 16px;border-radius:8px;font-size:13px;cursor:pointer">📊 แสดงรายงาน</button>
    59|          <button onclick="_exportReportAttendancePDF()" style="background:#ef4444;color:#fff;border:none;padding:8px 16px;border-radius:8px;font-size:13px;cursor:pointer">📄 Export PDF</button>
    60|        </div>
    61|        <div id="rpt-att-content" style="text-align:center;padding:40px;color:#6b7280">กดปุ่ม "แสดงรายงาน" เพื่อโหลดข้อมูล</div>
    62|      </div>
    63|    `;
    64|  } else if (type === 'jobs') {
    65|    el.innerHTML = `
    66|      <div class="card-box">
    67|        <div class="card-title">🔧 รายงานงานซ่อม (Jobs Report)</div>
    68|        <div style="display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap;align-items:center">
    69|          <input type="date" id="rpt-jobs-from" style="padding:8px 12px;border:1px solid #e5e7eb;border-radius:8px;font-size:13px" />
    70|          <span style="color:#6b7280;font-size:13px">ถึง</span>
    71|          <input type="date" id="rpt-jobs-to" style="padding:8px 12px;border:1px solid #e5e7eb;border-radius:8px;font-size:13px" />
    72|          <button onclick="_loadReportJobs()" style="background:#059669;color:#fff;border:none;padding:8px 16px;border-radius:8px;font-size:13px;cursor:pointer">📊 แสดงรายงาน</button>
    73|          <button onclick="_exportReportJobsPDF()" style="background:#ef4444;color:#fff;border:none;padding:8px 16px;border-radius:8px;font-size:13px;cursor:pointer">📄 Export PDF</button>
    74|        </div>
    75|        <div id="rpt-jobs-content" style="text-align:center;padding:40px;color:#6b7280">กดปุ่ม "แสดงรายงาน" เพื่อโหลดข้อมูล</div>
    76|      </div>
    77|    `;
    78|    const today = new Date().toISOString().split('T')[0];
    79|    document.getElementById('rpt-jobs-from').value = today;
    80|    document.getElementById('rpt-jobs-to').value = today;
    81|  } else if (type === 'billing') {
    82|    el.innerHTML = `
    83|      <div class="card-box">
    84|        <div class="card-title">💰 รายงานบิล/เงิน (Billing Report)</div>
    85|        <div style="display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap;align-items:center">
    86|          <input type="date" id="rpt-bill-from" style="padding:8px 12px;border:1px solid #e5e7eb;border-radius:8px;font-size:13px" />
    87|          <span style="color:#6b7280;font-size:13px">ถึง</span>
    88|          <input type="date" id="rpt-bill-to" style="padding:8px 12px;border:1px solid #e5e7eb;border-radius:8px;font-size:13px" />
    89|          <button onclick="_loadReportBilling()" style="background:#d97706;color:#fff;border:none;padding:8px 16px;border-radius:8px;font-size:13px;cursor:pointer">📊 แสดงรายงาน</button>
    90|          <button onclick="_exportReportBillingPDF()" style="background:#ef4444;color:#fff;border:none;padding:8px 16px;border-radius:8px;font-size:13px;cursor:pointer">📄 Export PDF</button>
    91|        </div>
    92|        <div id="rpt-bill-content" style="text-align:center;padding:40px;color:#6b7280">กดปุ่ม "แสดงรายงาน" เพื่อโหลดข้อมูล</div>
    93|      </div>
    94|    `;
    95|    const today = new Date().toISOString().split('T')[0];
    96|    document.getElementById('rpt-bill-from').value = today;
    97|    document.getElementById('rpt-bill-to').value = today;
    98|  } else if (type === 'inventory') {
    99|    el.innerHTML = `
   100|      <div class="card-box">
   101|        <div class="card-title">📦 รายงานสต็อก (Inventory Report)</div>
   102|        <div style="display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap;align-items:center">
   103|          <select id="rpt-inv-type" style="padding:8px 12px;border:1px solid #e5e7eb;border-radius:8px;font-size:13px">
   104|            <option value="all">สต็อกทั้งหมด</option>
   105|            <option value="low">Low Stock เท่านั้น</option>
   106|            <option value="movement">การเคลื่อนไหว</option>
   107|          </select>
   108|          <button onclick="_loadReportInventory()" style="background:#8b5cf6;color:#fff;border:none;padding:8px 16px;border-radius:8px;font-size:13px;cursor:pointer">📊 แสดงรายงาน</button>
   109|          <button onclick="_exportReportInventoryPDF()" style="background:#ef4444;color:#fff;border:none;padding:8px 16px;border-radius:8px;font-size:13px;cursor:pointer">📄 Export PDF</button>
   110|        </div>
   111|        <div id="rpt-inv-content" style="text-align:center;padding:40px;color:#6b7280">กดปุ่ม "แสดงรายงาน" เพื่อโหลดข้อมูล</div>
   112|      </div>
   113|    `;
   114|  }
   115|}
   116|
   117|// ============================================================
   118|// Attendance Report Functions
   119|// ============================================================
   120|async function _loadReportAttendance() {
   121|  const type = document.getElementById('rpt-att-type').value;
   122|  const year = document.getElementById('rpt-att-year').value.trim();
   123|  const el = document.getElementById('rpt-att-content');
   124|  el.innerHTML = '<div style="text-align:center;padding:20px;color:#6b7280">กำลังโหลด...</div>';
   125|
   126|  var params = { group_by: type };
   127|  if (year) params.year = year;
   128|
   129|  try {
   130|    const res = await callGas('getAttendanceMonthlySummary', params);
   131|    if (!res || !res.success || !res.summary || res.summary.length === 0) {
   132|      el.innerHTML = '<div style="text-align:center;padding:30px;color:#6b7280">ไม่พบข้อมูล</div>';
   133|      return;
   134|    }
   135|
   136|    var html = `<div style="margin-bottom:12px;font-size:13px;color:#6b7280">รวมชั่วโมง: <b>${res.total_hours || 0}</b> ชม. | จัดกลุ่ม: <b>${res.group_by === 'year' ? 'รายปี' : 'รายเดือน'}</b></div>`;
   137|
   138|    res.summary.forEach(s => {
   139|      html += `
   140|        <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin-bottom:12px">
   141|          <div style="font-size:15px;font-weight:600;margin-bottom:10px">📅 ${s.period}</div>
   142|          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:12px">
   143|            <div style="background:#fff;border-radius:8px;padding:10px;text-align:center"><div style="font-size:18px;font-weight:700;color:#3b82f6">${(s.total_hours||0).toFixed(1)}</div><div style="font-size:11px;color:#6b7280">ชม.</div></div>
   144|            <div style="background:#fff;border-radius:8px;padding:10px;text-align:center"><div style="font-size:18px;font-weight:700;color:#059669">${s.present_days||0}</div><div style="font-size:11px;color:#6b7280">วัน</div></div>
   145|            <div style="background:#fff;border-radius:8px;padding:10px;text-align:center"><div style="font-size:18px;font-weight:700;color:#d97706">${s.late_days||0}</div><div style="font-size:11px;color:#6b7280">มาสาย</div></div>
   146|            <div style="background:#fff;border-radius:8px;padding:10px;text-align:center"><div style="font-size:18px;font-weight:700;color:#8b5cf6">${s.total_jobs||0}</div><div style="font-size:11px;color:#6b7280">งาน</div></div>
   147|          </div>
   148|          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:8px">
   149|            ${(s.techs||[]).map(t => `<div style="background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:8px"><div style="font-weight:500;font-size:12px">${t.name}</div><div style="font-size:11px;color:#6b7280;margin-top:2px">${t.days}วัน, ${t.hours.toFixed(1)}ชม.</div></div>`).join('')}
   150|          </div>
   151|        </div>
   152|      `;
   153|    });
   154|
   155|    el.innerHTML = html;
   156|    window._lastAttendanceReport = res;
   157|  } catch(e) {
   158|    el.innerHTML = '<div style="text-align:center;padding:20px;color:#ef4444">เกิดข้อผิดพลาด</div>';
   159|  }
   160|}
   161|
   162|async function _exportReportAttendancePDF() {
   163|  const { jsPDF } = window.jspdf;
   164|  if (!jsPDF) { alert('jsPDF not loaded'); return; }
   165|  const res = window._lastAttendanceReport;
   166|  if (!res || !res.summary) { alert('กรุณาโหลดรายงานก่อน'); return; }
   167|
   168|  const doc = new jsPDF();
   169|  const pw = doc.internal.pageSize.getWidth();
   170|  let y = 20;
   171|
   172|  doc.setFontSize(16);
   173|  doc.text('Attendance Report', pw/2, y, { align: 'center' });
   174|  y += 10;
   175|  doc.setFontSize(9);
   176|  doc.text(`Group: ${res.group_by} | Total Hours: ${res.total_hours || 0} hrs`, pw/2, y, { align: 'center' });
   177|  y += 10;
   178|
   179|  res.summary.forEach(s => {
   180|    if (y > 260) { doc.addPage(); y = 20; }
   181|    doc.setFontSize(11);
   182|    doc.text(`Period: ${s.period}`, 14, y);
   183|    y += 7;
   184|    doc.setFontSize(8);
   185|    doc.text(`Hours: ${(s.total_hours||0).toFixed(1)} | Days: ${s.present_days||0} | Late: ${s.late_days||0} | Jobs: ${s.total_jobs||0}`, 14, y);
   186|    y += 7;
   187|    (s.techs||[]).forEach(t => {
   188|      if (y > 270) { doc.addPage(); y = 20; }
   189|      doc.text(`  ${t.name}: ${t.days}d, ${t.hours.toFixed(1)}h, ${t.jobs} jobs`, 18, y);
   190|      y += 5;
   191|    });
   192|    y += 5;
   193|  });
   194|
   195|  doc.save(`attendance_report_${new Date().toISOString().split('T')[0]}.pdf`);
   196|}
   197|
   198|// ============================================================
   199|// Jobs Report Functions
   200|// ============================================================
   201|async function _loadReportJobs() {
   202|  const from = document.getElementById('rpt-jobs-from').value;
   203|  const to = document.getElementById('rpt-jobs-to').value;
   204|  const el = document.getElementById('rpt-jobs-content');
   205|  el.innerHTML = '<div style="text-align:center;padding:20px;color:#6b7280">กำลังโหลด...</div>';
   206|
   207|  try {
   208|    const res = await callGas('getDashboardBundle', {});
   209|    if (!res || !res.success) {
   210|      el.innerHTML = '<div style="text-align:center;padding:30px;color:#6b7280">ไม่พบข้อมูล</div>';
   211|      return;
   212|    }
   213|
   214|    const stats = res.stats || {};
   215|    var html = `
   216|      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px">
   217|        <div style="background:#f0fdf4;border-radius:12px;padding:14px;text-align:center"><div style="font-size:20px;font-weight:700;color:#059669">${stats.total||0}</div><div style="font-size:12px;color:#6b7280">งานทั้งหมด</div></div>
   218|        <div style="background:#fef3c7;border-radius:12px;padding:14px;text-align:center"><div style="font-size:20px;font-weight:700;color:#d97706">${stats.pending||0}</div><div style="font-size:12px;color:#6b7280">รอซ่อม</div></div>
   219|        <div style="background:#dbeafe;border-radius:12px;padding:14px;text-align:center"><div style="font-size:20px;font-weight:700;color:#3b82f6">${stats.in_progress||0}</div><div style="font-size:12px;color:#6b7280">กำลังซ่อม</div></div>
   220|        <div style="background:#fce7f3;border-radius:12px;padding:14px;text-align:center"><div style="font-size:20px;font-weight:700;color:#ec4899">${stats.completed||0}</div><div style="font-size:12px;color:#6b7280">เสร็จสิ้น</div></div>
   221|      </div>
   222|      <div style="font-size:13px;color:#6b7280">วันที่: ${from} ถึง ${to}</div>
   223|    `;
   224|
   225|    el.innerHTML = html;
   226|    window._lastJobsReport = { stats, from, to };
   227|  } catch(e) {
   228|    el.innerHTML = '<div style="text-align:center;padding:20px;color:#ef4444">เกิดข้อผิดพลาด</div>';
   229|  }
   230|}
   231|
   232|async function _exportReportJobsPDF() {
   233|  const { jsPDF } = window.jspdf;
   234|  if (!jsPDF) { alert('jsPDF not loaded'); return; }
   235|  const data = window._lastJobsReport;
   236|  if (!data) { alert('กรุณาโหลดรายงานก่อน'); return; }
   237|
   238|  const doc = new jsPDF();
   239|  const pw = doc.internal.pageSize.getWidth();
   240|  let y = 20;
   241|
   242|  doc.setFontSize(16);
   243|  doc.text('Jobs Report', pw/2, y, { align: 'center' });
   244|  y += 10;
   245|  doc.setFontSize(9);
   246|  doc.text(`Date: ${data.from} to ${data.to}`, pw/2, y, { align: 'center' });
   247|  y += 10;
   248|
   249|  const stats = data.stats || {};
   250|  doc.setFontSize(11);
   251|  doc.text(`Total: ${stats.total||0} | Pending: ${stats.pending||0} | In Progress: ${stats.in_progress||0} | Completed: ${stats.completed||0}`, 14, y);
   252|
   253|  doc.save(`jobs_report_${new Date().toISOString().split('T')[0]}.pdf`);
   254|}
   255|
   256|// ============================================================
   257|// Billing Report Functions
   258|// ============================================================
   259|async function _loadReportBilling() {
   260|  const from = document.getElementById('rpt-bill-from').value;
   261|  const to = document.getElementById('rpt-bill-to').value;
   262|  const el = document.getElementById('rpt-bill-content');
   263|  el.innerHTML = '<div style="text-align:center;padding:20px;color:#6b7280">กำลังโหลด...</div>';
   264|
   265|  try {
   266|    const res = await callGas('getReportData', { date_from: from, date_to: to });
   267|    if (!res || !res.success) {
   268|      el.innerHTML = '<div style="text-align:center;padding:30px;color:#6b7280">ไม่พบข้อมูล</div>';
   269|      return;
   270|    }
   271|
   272|    const summary = res.summary || {};
   273|    var html = `
   274|      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px">
   275|        <div style="background:#fef3c7;border-radius:12px;padding:14px;text-align:center"><div style="font-size:20px;font-weight:700;color:#d97706">${(summary.total_revenue||0).toFixed(2)}</div><div style="font-size:12px;color:#6b7280">รายได้รวม (บาท)</div></div>
   276|        <div style="background:#f0fdf4;border-radius:12px;padding:14px;text-align:center"><div style="font-size:20px;font-weight:700;color:#059669">${summary.count||0}</div><div style="font-size:12px;color:#6b7280">จำนวนบิล</div></div>
   277|        <div style="background:#dbeafe;border-radius:12px;padding:14px;text-align:center"><div style="font-size:20px;font-weight:700;color:#3b82f6">${(summary.avg_per_bill||0).toFixed(2)}</div><div style="font-size:12px;color:#6b7280">เฉลี่ย/บิล</div></div>
   278|        <div style="background:#fce7f3;border-radius:12px;padding:14px;text-align:center"><div style="font-size:20px;font-weight:700;color:#ec4899">${(summary.total_vat||0).toFixed(2)}</div><div style="font-size:12px;color:#6b7280">VAT รวม</div></div>
   279|      </div>
   280|    `;
   281|
   282|    if (res.records && res.records.length > 0) {
   283|      html += `<table class="job-table"><thead><tr><th>วันที่</th><th>บิล</th><th>ลูกค้า</th><th>ยอด</th><th>VAT</th></tr></thead><tbody>`;
   284|      res.records.forEach(r => {
   285|        html += `<tr><td>${r.date||'-'}</td><td>${r.bill_no||'-'}</td><td>${r.customer||'-'}</td><td>${(r.amount||0).toFixed(2)}</td><td>${(r.vat||0).toFixed(2)}</td></tr>`;
   286|      });
   287|      html += '</tbody></table>';
   288|    }
   289|
   290|    el.innerHTML = html;
   291|    window._lastBillingReport = res;
   292|  } catch(e) {
   293|    el.innerHTML = '<div style="text-align:center;padding:20px;color:#ef4444">เกิดข้อผิดพลาด</div>';
   294|  }
   295|}
   296|
   297|async function _exportReportBillingPDF() {
   298|  const { jsPDF } = window.jspdf;
   299|  if (!jsPDF) { alert('jsPDF not loaded'); return; }
   300|  const res = window._lastBillingReport;
   301|  if (!res) { alert('กรุณาโหลดรายงานก่อน'); return; }
   302|
   303|  const doc = new jsPDF();
   304|  const pw = doc.internal.pageSize.getWidth();
   305|  let y = 20;
   306|
   307|  doc.setFontSize(16);
   308|  doc.text('Billing Report', pw/2, y, { align: 'center' });
   309|  y += 10;
   310|
   311|  const s = res.summary || {};
   312|  doc.setFontSize(9);
   313|  doc.text(`Total Revenue: ${(s.total_revenue||0).toFixed(2)} THB | Bills: ${s.count||0} | Avg: ${(s.avg_per_bill||0).toFixed(2)}`, pw/2, y, { align: 'center' });
   314|
   315|  doc.save(`billing_report_${new Date().toISOString().split('T')[0]}.pdf`);
   316|}
   317|
   318|// ============================================================
   319|// Inventory Report Functions
   320|// ============================================================
   321|async function _loadReportInventory() {
   322|  const type = document.getElementById('rpt-inv-type').value;
   323|  const el = document.getElementById('rpt-inv-content');
   324|  el.innerHTML = '<div style="text-align:center;padding:20px;color:#6b7280">กำลังโหลด...</div>';
   325|
   326|  try {
   327|    const res = await callGas('inventoryOverview', {});
   328|    if (!res || !res.success || !res.stock) {
   329|      el.innerHTML = '<div style="text-align:center;padding:30px;color:#6b7280">ไม่พบข้อมูล</div>';
   330|      return;
   331|    }
   332|
   333|    var items = res.stock || [];
   334|    if (type === 'low') items = items.filter(i => (i.qty || 0) <= (i.min_qty || 0));
   335|
   336|    var html = `<div style="margin-bottom:12px;font-size:13px;color:#6b7280">ทั้งหมด <b>${items.length}</b> รายการ</div>`;
   337|    html += '<table class="job-table"><thead><tr><th>รหัส</th><th>ชื่อสินค้า</th><th>คงเหลือ</th><th>Min</th><th>หน่วย</th><th>สถานะ</th></tr></thead><tbody>';
   338|
   339|    items.forEach(i => {
   340|      const isLow = (i.qty || 0) <= (i.min_qty || 0);
   341|      html += `<tr>
   342|        <td>${i.code||'-'}</td>
   343|        <td>${i.name||'-'}</td>
   344|        <td>${i.qty||0}</td>
   345|        <td>${i.min_qty||0}</td>
   346|        <td>${i.unit||'-'}</td>
   347|        <td>${isLow ? '<span style="color:#ef4444;font-weight:500">Low Stock</span>' : '<span style="color:#059669">OK</span>'}</td>
   348|      </tr>`;
   349|    });
   350|
   351|    html += '</tbody></table>';
   352|    el.innerHTML = html;
   353|    window._lastInventoryReport = { items, type };
   354|  } catch(e) {
   355|    el.innerHTML = '<div style="text-align:center;padding:20px;color:#ef4444">เกิดข้อผิดพลาด</div>';
   356|  }
   357|}
   358|
   359|async function _exportReportInventoryPDF() {
   360|  const { jsPDF } = window.jspdf;
   361|  if (!jsPDF) { alert('jsPDF not loaded'); return; }
   362|  const data = window._lastInventoryReport;
   363|  if (!data) { alert('กรุณาโหลดรายงานก่อน'); return; }
   364|
   365|  const doc = new jsPDF();
   366|  const pw = doc.internal.pageSize.getWidth();
   367|  let y = 20;
   368|
   369|  doc.setFontSize(16);
   370|  doc.text('Inventory Report', pw/2, y, { align: 'center' });
   371|  y += 10;
   372|
   373|  doc.setFontSize(9);
   374|  doc.text(`Items: ${data.items.length} | Type: ${data.type}`, pw/2, y, { align: 'center' });
   375|
   376|  doc.save(`inventory_report_${new Date().toISOString().split('T')[0]}.pdf`);
   377|}
   378|