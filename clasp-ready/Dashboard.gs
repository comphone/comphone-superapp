// ============================================================
// COMPHONE SUPER APP V5.5
// ============================================================
// Dashboard.gs - Dashboard UI & Data APIs
// ============================================================

// ============================================================
// 🔧 Template Include Helper — for modular HTML files
// ============================================================
function includeDashboardV55_(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function dashboardDoGetV55_(e) {
  var action = (e && e.parameter && e.parameter.action) || '';
  if (action === 'json') {
    var result = {
      success: true,
      jobs: getDashboardJobs(),
      inventory: getDashboardInventory(),
      summary: getDashboardSummary()
    };
    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
  }
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('COMPHONE SUPER APP V5.5')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0');
}

function getDashboardData() {
  return {
    success: true,
    jobs: getDashboardJobs(),
    inventory: getDashboardInventory(),
    summary: getDashboardSummary(),
    status_distribution: getJobStatusDistribution(),
    alerts: getAlerts()
  };
}

// ============================================================
// 🖼️ จัดการคิวรูปภาพ (สำหรับปุ่มใน Dashboard)
// ============================================================

function handleProcessPhotos() {
  try {
    var result = processImageSorting();
    if (result.success) {
      sendLineNotify({
        message: '📸 จัดการรูปภาพเสร็จสิ้น!\n✅ สำเร็จ: ' + result.successful + ' รูป\n❌ ล้มเหลว: ' + result.failed + ' รูป\n\n📊 Dashboard: ' + LINE_GAS_URL,
        room: 'TECHNICIAN'
      });
    }
    return result;
  } catch(e) {
    return { success: false, error: e.toString() };
  }
}

function getDashboardJobs() {
  try {
    var ss = getComphoneSheet();
    var sh = findSheetByName(ss, 'DBJOBS');
    if (!sh) return [];
    var all = sh.getDataRange().getValues();
    var sc = 3, cc = 9, fc = 12;
    var headers = all[0];
    for (var hi = 0; hi < headers.length; hi++) {
      var h = String(headers[hi]);
      if (h.indexOf('สถานะ') > -1 || h.indexOf('สถาน') > -1) sc = hi;
      if (h.indexOf('เวลาสร้าง') > -1) cc = hi;
      if (h.indexOf('folder_url') > -1 || h.indexOf('ลิงก์โฟลเดอร์') > -1) fc = hi;
    }
    var jobs = [];
    for (var i = all.length - 1; i >= 1 && i >= all.length - 50; i--) {
      var dateStr = '-';
      try { if (all[i][cc] && all[i][cc] instanceof Date) dateStr = Utilities.formatDate(all[i][cc], 'Asia/Bangkok', 'dd/MM HH:mm'); } catch(e) {}
      jobs.push({
        id: String(all[i][0] || ''), customer: String(all[i][1] || ''),
        symptom: String(all[i][2] || ''), status: String(all[i][sc] || ''),
        tech: String(all[i][4] || '-'), created: dateStr,
        folder: String(all[i][fc] || '')
      });
    }
    return jobs;
  } catch(e) { return []; }
}

function getDashboardInventory() {
  try {
    var ss = getComphoneSheet();
    var sh = findSheetByName(ss, 'DB_INVENTORY');
    if (!sh) return [];
    var all = sh.getDataRange().getValues();
    var items = [];
    for (var i = 1; i < all.length; i++) {
      items.push({
        code: String(all[i][0] || ''), name: String(all[i][1] || ''),
        qty: Number(all[i][2] || 0), price: Number(all[i][4] || 0),
        alert: Number(all[i][2] || 0) < 5
      });
    }
    return items;
  } catch(e) { return []; }
}

function getDashboardSummary() {
  try {
    var statusDistribution = getJobStatusDistribution();
    var revenueToday = getRevenueReport('today');
    var revenueWeek = getRevenueReport('week');
    var revenueMonth = getRevenueReport('month');
    var alerts = getAlerts();
    var jobs = getDashboardJobs();
    var inventory = getDashboardInventory();
    var pendingPhotos = getPendingPhotoQueueCount_();
    var topTechnician = getTopTechnician_();
    var pmSummary = getPmDueSummary_();

    return {
      success: true,
      totalJobs: statusDistribution.total_jobs || 0,
      status_distribution: statusDistribution.statuses || [],
      status_map: statusDistribution.status_map || JOB_STATUS_MAP || {},
      totalItems: inventory.length,
      lowStock: alerts.low_stock_count || 0,
      pendingPhotos: pendingPhotos,
      overdueJobs: alerts.overdue_jobs_count || 0,
      topTechnician: topTechnician,
      pmDueCount: pmSummary.total || 0,
      revenue: {
        today: revenueToday.total_revenue || 0,
        week: revenueWeek.total_revenue || 0,
        month: revenueMonth.total_revenue || 0
      },
      recentJobs: jobs,
      alerts: alerts.items || [],
      date: Utilities.formatDate(new Date(), 'Asia/Bangkok', 'dd/MM/yyyy HH:mm')
    };
  } catch(e) {
    return {
      success: false,
      totalJobs: 0,
      status_distribution: [],
      totalItems: 0,
      lowStock: 0,
      pendingPhotos: 0,
      overdueJobs: 0,
      topTechnician: null,
      pmDueCount: 0,
      revenue: { today: 0, week: 0, month: 0 },
      alerts: [],
      date: 'error',
      error: e.toString()
    };
  }
}

// ============================================================
// Daily Report — สำหรับ Python ดึงรายงานรายวัน
// ============================================================
function getDailyReport() {
  try {
    var ss = getComphoneSheet();
    var jsh = findSheetByName(ss, 'DBJOBS');
    var today = new Date();
    var todayStr = Utilities.formatDate(today, 'Asia/Bangkok', 'yyyy-MM-dd');
    
    var report = {
      date: todayStr,
      dateTH: Utilities.formatDate(today, 'Asia/Bangkok', 'dd/MM/yyyy'),
      totalJobs: 0,
      pending: 0,
      inProgress: 0,
      completed: 0,
      canceled: 0,
      jobsCompleted: [],
      jobsPending: [],
      jobsInProgress: []
    };
    
    if (jsh) {
      var jobs = jsh.getDataRange().getValues();
      var sc = 3, cc = 9; // status col, created col
      var headers = jobs[0];
      for (var hi = 0; hi < headers.length; hi++) {
        var h = String(headers[hi]);
        if (h.indexOf('สถานะ') > -1 || h.indexOf('สถาน') > -1) sc = hi;
        if (h.indexOf('เวลาสร้าง') > -1) cc = hi;
      }
      
      for (var i = 1; i < jobs.length; i++) {
        var row = jobs[i];
        var jobDate = '';
        try {
          if (row[cc] && row[cc] instanceof Date) {
            jobDate = Utilities.formatDate(row[cc], 'Asia/Bangkok', 'yyyy-MM-dd');
          } else {
            jobDate = String(row[cc] || '');
          }
        } catch(e) { jobDate = ''; }
        
        report.totalJobs++;
        var status = String(row[sc] || '');
        var jobObj = {
          id: String(row[0] || ''),
          customer: String(row[1] || ''),
          symptom: String(row[2] || ''),
          status: status,
          tech: String(row[4] || '-'),
          created: jobDate
        };
        
        if (status.indexOf('รอดำ') === 0 || status === 'รอดำเนินการ') {
          report.pending++;
          report.jobsPending.push(jobObj);
        } else if (status === 'InProgress' || status.indexOf('กำลัง') === 0) {
          report.inProgress++;
          report.jobsInProgress.push(jobObj);
        } else if (status === 'Completed') {
          report.completed++;
          report.jobsCompleted.push(jobObj);
        } else if (status.indexOf('ยกเลิก') > -1) {
          report.canceled++;
        }
      }
    }
    
    // Try to get billing data
    try {
      var bsh = findSheetByName(ss, 'DB_BILLING');
      if (bsh) {
        var bills = bsh.getDataRange().getValues();
        var totalRev = 0, totalLab = 0, totalParts = 0;
        var bcols = bills[0];
        var partsIdx = -1, laborIdx = -1, totalIdx = -1;
        for (var bi = 0; bi < bcols.length; bi++) {
          var bn = String(bcols[bi]);
          if (bn.indexOf('ค่าแรง') > -1 || bn.indexOf('labor') > -1 || bn.toLowerCase() === 'labor_cost') laborIdx = bi;
          if (bn.indexOf('รวม') > -1 || bn.indexOf('total') > -1) totalIdx = bi;
          if (bn.indexOf('อะไหล่') > -1 || bn.indexOf('parts') > -1) partsIdx = bi;
        }
        for (var bj = 1; bj < bills.length; bj++) {
          if (totalIdx >= 0) totalRev += Number(bills[bj][totalIdx] || 0);
          if (laborIdx >= 0) totalLab += Number(bills[bj][laborIdx] || 0);
          if (partsIdx >= 0) totalParts += Number(bills[bj][partsIdx] || 0);
        }
        report.totalRevenue = totalRev;
        report.totalLaborCost = totalLab;
        report.totalPartsCost = totalParts;
      }
    } catch(e) { Logger.log('Billing error: ' + e.toString()); }
    
    return report;
  } catch(e) {
    return { error: e.toString(), date: new Date().toISOString() };
  }
}

// ============================================================
// Send Summary to LINE Notify
// ============================================================
function sendDashboardSummary() {
  try {
    var report = getDailyReport();
    if (report.error) return { success: false, error: report.error };
    
    var msg = '📊 สรุปงาน Comphone\n';
    msg += '📅 ' + report.dateTH + '\n\n';
    msg += '📋 งานทั้งหมด: ' + report.totalJobs + ' งาน\n';
    msg += '⏳ รอดำเนินการ: ' + report.pending + ' งาน\n';
    msg += '🔄 กำลังทำ: ' + report.inProgress + ' งาน\n';
    msg += '✅ เสร็จแล้ว: ' + report.completed + ' งาน\n';
    msg += '❌ ยกเลิก: ' + report.canceled + ' งาน\n';
    
    if (report.totalRevenue !== undefined) {
      msg += '\n💰 รายได้รวม: ' + report.totalRevenue.toLocaleString() + ' บาท\n';
      msg += '🔧 ค่าแรง: ' + report.totalLaborCost.toLocaleString() + ' บาท\n';
      msg += '📦 อะไหล่: ' + report.totalPartsCost.toLocaleString() + ' บาท\n';
    }
    
    if (report.jobsCompleted.length > 0) {
      msg += '\n✅ งานที่เสร็จวันนี้:\n';
      for (var i = 0; i < report.jobsCompleted.length && i < 10; i++) {
        var j = report.jobsCompleted[i];
        msg += '• ' + j.id + ' — ' + j.customer + '\n';
      }
    }
    
    return sendLineNotify({ message: msg, room: 'TECHNICIAN' });
  } catch(e) {
    return { success: false, error: e.toString() };
  }
}

// ============================================================
// 💰 Profit Report — สรุปต้นทุน-กำไร
// ============================================================
function getProfitReport(data) {
  try {
    var ss = getComphoneSheet();
    var jsh = findSheetByName(ss, 'DBJOBS');
    var bsh = findSheetByName(ss, 'DB_BILLING');
    var ish = findSheetByName(ss, 'DB_INVENTORY');
    
    var report = {
      totalRevenue: 0,
      totalPartsCost: 0,
      totalLabor: 0,
      grossProfit: 0,
      jobCount: 0,
      jobs: []
    };
    
    if (bsh) {
      var bills = bsh.getDataRange().getValues();
      var bcols = bills[0];
      var jobIdIdx = -1, partsIdx = -1, laborIdx = -1, totalIdx = -1, payIdx = -1;
      
      for (var bi = 0; bi < bcols.length; bi++) {
        var bn = String(bcols[bi]);
        if (bn.indexOf('รหัสงาน') > -1 || bn.toLowerCase().indexOf('job') > -1 || bn.toLowerCase() === 'job_id') jobIdIdx = bi;
        if (bn.indexOf('อะไหล่') > -1 || bn.toLowerCase().indexOf('parts') > -1) partsIdx = bi;
        if (bn.indexOf('ค่าแรง') > -1 || bn.toLowerCase().indexOf('labor') > -1) laborIdx = bi;
        if (bn.indexOf('รวม') > -1 || bn.toLowerCase().indexOf('total') > -1 || bn === 'ยอดรวม') totalIdx = bi;
        if (bn.indexOf('ชำระ') > -1 || bn.indexOf('จ่าย') > -1 || bn.toLowerCase().indexOf('pay') > -1) payIdx = bi;
      }
      
      for (var i = 1; i < bills.length; i++) {
        var rev = totalIdx >= 0 ? Number(bills[i][totalIdx] || 0) : 0;
        var parts = partsIdx >= 0 ? Number(bills[i][partsIdx] || 0) : 0;
        var labor = laborIdx >= 0 ? Number(bills[i][laborIdx] || 0) : 0;
        var cost = parts + labor;
        var profit = rev - cost;
        
        report.totalRevenue += rev;
        report.totalPartsCost += parts;
        report.totalLabor += labor;
        report.grossProfit += profit;
        report.jobCount++;
        
        var jid = jobIdIdx >= 0 ? String(bills[i][jobIdIdx] || '') : 'N/A';
        var cust = '-';
        if (jsh) {
          var jobs = jsh.getDataRange().getValues();
          for (var ji = 1; ji < jobs.length; ji++) {
            if (String(jobs[ji][0]) === jid) {
              cust = String(jobs[ji][1] || '-');
              break;
            }
          }
        }
        
        report.jobs.push({
          jobId: jid, customer: cust,
          revenue: rev, cost: cost,
          partsCost: parts, laborCost: labor,
          profit: profit
        });
      }
    }
    
    report.avgProfitPerJob = report.jobCount > 0 ? report.grossProfit / report.jobCount : 0;
    report.profitMargin = report.totalRevenue > 0 ? (report.grossProfit / report.totalRevenue * 100) : 0;
    
    return report;
  } catch(e) {
    return { error: e.toString() };
  }
}

// ============================================================
// 📅 Calendar Jobs — ตารางนัดหมาย 7 วันหน้า
// ============================================================
function getCalendarJobs(days) {
  try {
    if (!days) days = 7;
    var ss = getComphoneSheet();
    var jsh = findSheetByName(ss, 'DBJOBS');
    if (!jsh) return { error: 'DBJOBS not found' };
    
    var jobs = jsh.getDataRange().getValues();
    var headers = jobs[0];
    var cc = 9, sc = 3;
    for (var hi = 0; hi < headers.length; hi++) {
      var h = String(headers[hi]);
      if (h.indexOf('เวลาสร้าง') > -1) cc = hi;
      if (h.indexOf('สถานะ') > -1 || h.indexOf('สถาน') > -1) sc = hi;
    }
    
    var now = new Date();
    var end = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    var upcoming = [];
    
    for (var i = 1; i < jobs.length; i++) {
      var row = jobs[i];
      var jobDate = row[cc];
      if (!(jobDate instanceof Date)) continue;
      
      if (jobDate >= now && jobDate <= end) {
        upcoming.push({
          id: String(row[0] || ''),
          customer: String(row[1] || ''),
          symptom: String(row[2] || ''),
          status: String(row[sc] || ''),
          tech: String(row[4] || '-'),
          date: Utilities.formatDate(jobDate, 'Asia/Bangkok', 'yyyy-MM-dd'),
          time: Utilities.formatDate(jobDate, 'Asia/Bangkok', 'HH:mm'),
          day: Utilities.formatDate(jobDate, 'Asia/Bangkok', 'EEEE')
        });
      }
    }
    
    upcoming.sort(function(a, b) { return a.date > b.date ? 1 : -1; });
    
    return { jobs: upcoming, count: upcoming.length, days: days };
  } catch(e) {
    return { error: e.toString() };
  }
}

// ============================================================
// 🔔 CRM — แจ้งเตือนเช็คระยะ (6 เดือน / 1 ปี)
// ============================================================
function getCRMSchedule() {
  try {
    var ss = getComphoneSheet();
    var jsh = findSheetByName(ss, 'DBJOBS');
    if (!jsh) return { error: 'DBJOBS not found' };
    
    var jobs = jsh.getDataRange().getValues();
    var cc = 9;
    var headers = jobs[0];
    for (var hi = 0; hi < headers.length; hi++) {
      var h = String(headers[hi]);
      if (h.indexOf('เวลาสร้าง') > -1) cc = hi;
    }
    
    var now = new Date();
    var sixMonths = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000);
    var oneYear = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
    
    var due6m = [];
    var due1y = [];
    
    for (var i = 1; i < jobs.length; i++) {
      var row = jobs[i];
      var jobDate = row[cc];
      if (!(jobDate instanceof Date)) continue;
      
      // คำนวณวันครบกำหนด
      var m6 = new Date(jobDate.getTime() + 180 * 24 * 60 * 60 * 1000);
      var y1 = new Date(jobDate.getTime() + 365 * 24 * 60 * 60 * 1000);
      
      var daysUntil6m = Math.ceil((m6 - now) / (24 * 60 * 60 * 1000));
      var daysUntil1y = Math.ceil((y1 - now) / (24 * 60 * 60 * 1000));
      
      if (daysUntil6m <= 30 && daysUntil6m >= 0) {
        due6m.push({
          id: String(row[0] || ''),
          customer: String(row[1] || ''),
          installDate: Utilities.formatDate(jobDate, 'Asia/Bangkok', 'yyyy-MM-dd'),
          dueDate: Utilities.formatDate(m6, 'Asia/Bangkok', 'yyyy-MM-dd'),
          daysLeft: daysUntil6m
        });
      }
      
      if (daysUntil1y <= 30 && daysUntil1y >= 0) {
        due1y.push({
          id: String(row[0] || ''),
          customer: String(row[1] || ''),
          installDate: Utilities.formatDate(jobDate, 'Asia/Bangkok', 'yyyy-MM-dd'),
          dueDate: Utilities.formatDate(y1, 'Asia/Bangkok', 'yyyy-MM-dd'),
          daysLeft: daysUntil1y
        });
      }
    }
    
    // แจ้งเตือนใน LINE ถ้ามีงานใกล้ครบกำหนด
    var alertMsg = '';
    if (due6m.length > 0) {
      alertMsg += '🔔 แจ้งเตือนเช็คระยะ 6 เดือน:\n';
      for (var i = 0; i < due6m.length; i++) {
        alertMsg += '• ' + due6m[i].customer + ' — อีก ' + due6m[i].daysLeft + ' วัน\n';
      }
    }
    if (due1y.length > 0) {
      alertMsg += '\n🔔 แจ้งเตือนเช็คระยะ 1 ปี:\n';
      for (var j = 0; j < due1y.length; j++) {
        alertMsg += '• ' + due1y[j].customer + ' — อีก ' + due1y[j].daysLeft + ' วัน\n';
      }
    }
    
    if (alertMsg) {
      sendLineNotify({ message: alertMsg, room: 'SALES' });
    }
    
    return {
      check6Month: due6m,
      check1Year: due1y,
      totalAlerts: due6m.length + due1y.length
    };
  } catch(e) {
    return { error: e.toString() };
  }
}


// ============================================================
// Phase 2 — Dashboard APIs
// ============================================================
function getRevenueReport(period) {
  try {
    var normalizedPeriod = normalizeReportPeriod_(period || 'today');
    var ss = getComphoneSheet();
    var sh = findSheetByName(ss, 'DB_BILLING');
    var result = {
      success: true,
      period: normalizedPeriod,
      total_revenue: 0,
      paid_revenue: 0,
      unpaid_revenue: 0,
      bill_count: 0,
      paid_count: 0,
      unpaid_count: 0,
      items: []
    };
    if (!sh || sh.getLastRow() < 2) return result;

    var rows = sh.getDataRange().getValues();
    var headers = rows[0];
    var idxJob = findHeaderIndex_(headers, ['Job_ID', 'job_id', 'JobID']);
    var idxCustomer = findHeaderIndex_(headers, ['Customer_Name', 'customer_name', 'ชื่อลูกค้า']);
    var idxTotal = findHeaderIndex_(headers, ['Total_Amount', 'total_amount', 'รวม', 'ยอดรวม']);
    var idxPaid = findHeaderIndex_(headers, ['Amount_Paid', 'amount_paid']);
    var idxStatus = findHeaderIndex_(headers, ['Payment_Status', 'payment_status', 'สถานะการชำระ']);
    var idxDate = findHeaderIndex_(headers, ['Paid_At', 'paid_at', 'Invoice_Date', 'invoice_date', 'Created_At', 'created_at']);

    for (var i = 1; i < rows.length; i++) {
      var row = rows[i];
      var rowDate = safeDateValue_(idxDate > -1 ? row[idxDate] : '');
      if (!isDateInPeriod_(rowDate, normalizedPeriod)) continue;

      var total = Number(row[idxTotal] || 0);
      var paid = Number(idxPaid > -1 ? row[idxPaid] || 0 : 0);
      var status = String(idxStatus > -1 ? row[idxStatus] || '' : '').toUpperCase();
      result.bill_count++;
      result.total_revenue += total;
      if (status === 'PAID') {
        result.paid_count++;
        result.paid_revenue += paid || total;
      } else {
        result.unpaid_count++;
        result.unpaid_revenue += total - paid;
      }
      result.items.push({
        job_id: String(idxJob > -1 ? row[idxJob] || '' : ''),
        customer_name: String(idxCustomer > -1 ? row[idxCustomer] || '' : ''),
        total_amount: total,
        amount_paid: paid,
        payment_status: status || 'UNPAID',
        date: rowDate ? Utilities.formatDate(rowDate, 'Asia/Bangkok', 'yyyy-MM-dd HH:mm:ss') : ''
      });
    }

    result.total_revenue = Math.round(result.total_revenue * 100) / 100;
    result.paid_revenue = Math.round(result.paid_revenue * 100) / 100;
    result.unpaid_revenue = Math.round(result.unpaid_revenue * 100) / 100;
    return result;
  } catch (e) {
    return { success: false, period: period || 'today', error: e.toString(), items: [] };
  }
}

function getJobStatusDistribution() {
  try {
    var ss = getComphoneSheet();
    var sh = findSheetByName(ss, 'DBJOBS');
    var counters = {};
    for (var code = 1; code <= 12; code++) counters[code] = 0;
    if (!sh || sh.getLastRow() < 2) {
      return { success: true, total_jobs: 0, statuses: buildStatusDistributionArray_(counters), status_map: JOB_STATUS_MAP };
    }

    var ctx = getJobSheetContext_(sh);
    var rows = sh.getRange(2, 1, sh.getLastRow() - 1, ctx.headers.length).getValues();
    for (var i = 0; i < rows.length; i++) {
      var codeVal = inferCurrentStatusCodeFromRow_(rows[i], ctx.indices);
      if (!counters[codeVal]) counters[codeVal] = 0;
      counters[codeVal]++;
    }

    return {
      success: true,
      total_jobs: rows.length,
      statuses: buildStatusDistributionArray_(counters),
      status_map: JOB_STATUS_MAP
    };
  } catch (e) {
    return { success: false, total_jobs: 0, statuses: [], status_map: JOB_STATUS_MAP || {}, error: e.toString() };
  }
}

function getAlerts() {
  try {
    var items = [];
    var lowStockItems = getLowStockItems_();
    var overdueJobs = getOverdueJobs_();
    var pmSummary = getPmDueSummary_();
    var topTechnician = getTopTechnician_();

    for (var i = 0; i < lowStockItems.length; i++) {
      items.push({
        type: 'LOW_STOCK',
        priority: 'high',
        id: lowStockItems[i].code || lowStockItems[i].name,
        message: lowStockItems[i].name + ' คงเหลือ ' + lowStockItems[i].qty + ' ต่ำกว่า reorder point ' + lowStockItems[i].reorder_point,
        data: lowStockItems[i]
      });
    }

    for (var j = 0; j < overdueJobs.length; j++) {
      items.push({
        type: 'OVERDUE_JOB',
        priority: 'high',
        id: overdueJobs[j].job_id,
        message: 'งาน ' + overdueJobs[j].job_id + ' ค้าง ' + overdueJobs[j].age_days + ' วัน',
        data: overdueJobs[j]
      });
    }

    if (pmSummary.total > 0) {
      items.push({
        type: 'PM_DUE',
        priority: 'medium',
        id: 'PM-' + pmSummary.total,
        message: 'มีลูกค้าถึงรอบ PM จำนวน ' + pmSummary.total + ' ราย',
        data: pmSummary.customers.slice(0, 10)
      });
    }

    if (topTechnician && topTechnician.job_count > 0) {
      items.push({
        type: 'TOP_TECHNICIAN',
        priority: 'info',
        id: topTechnician.name,
        message: 'ช่างที่รับงานมากที่สุด: ' + topTechnician.name + ' (' + topTechnician.job_count + ' งาน)',
        data: topTechnician
      });
    }

    return {
      success: true,
      total: items.length,
      low_stock_count: lowStockItems.length,
      overdue_jobs_count: overdueJobs.length,
      pm_due_count: pmSummary.total,
      items: items
    };
  } catch (e) {
    return { success: false, total: 0, items: [], error: e.toString() };
  }
}

function getPendingPhotoQueueCount_() {
  try {
    var ss = getComphoneSheet();
    var sh = findSheetByName(ss, 'DB_PHOTO_QUEUE');
    if (!sh || sh.getLastRow() < 2) return 0;
    var rows = sh.getDataRange().getValues();
    var count = 0;
    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][7] || '') === 'Pending') count++;
    }
    return count;
  } catch (e) {
    return 0;
  }
}

function getLowStockItems_() {
  try {
    var ss = getComphoneSheet();
    var sh = findSheetByName(ss, 'DB_INVENTORY');
    if (!sh || sh.getLastRow() < 2) return [];
    var rows = sh.getDataRange().getValues();
    var headers = rows[0];
    var idxCode = findHeaderIndex_(headers, ['Item_ID', 'Item_Code', 'Code', 'code', 'รหัส']);
    var idxName = findHeaderIndex_(headers, ['Item_Name', 'Name', 'name', 'ชื่อ', 'ชื่อสินค้า']);
    var idxQty = findHeaderIndex_(headers, ['Qty', 'qty', 'Quantity', 'จำนวน']);
    var idxReorder = findHeaderIndex_(headers, ['Reorder_Point', 'reorder_point', 'Min_Qty', 'ขั้นต่ำ', 'จุดสั่งซื้อ']);
    if (idxCode < 0) idxCode = 0;
    if (idxName < 0) idxName = 1;
    if (idxQty < 0) idxQty = 2;

    var items = [];
    for (var i = 1; i < rows.length; i++) {
      var qty = Number(rows[i][idxQty] || 0);
      var reorder = idxReorder > -1 ? Number(rows[i][idxReorder] || 0) : 5;
      if (qty < reorder) {
        items.push({
          code: String(rows[i][idxCode] || ''),
          name: String(rows[i][idxName] || ''),
          qty: qty,
          reorder_point: reorder
        });
      }
    }
    return items;
  } catch (e) {
    return [];
  }
}

function getOverdueJobs_() {
  try {
    var ss = getComphoneSheet();
    var sh = findSheetByName(ss, 'DBJOBS');
    if (!sh || sh.getLastRow() < 2) return [];
    var ctx = getJobSheetContext_(sh);
    var rows = sh.getRange(2, 1, sh.getLastRow() - 1, ctx.headers.length).getValues();
    var overdue = [];
    var now = new Date().getTime();
    for (var i = 0; i < rows.length; i++) {
      var code = inferCurrentStatusCodeFromRow_(rows[i], ctx.indices);
      if (code >= 11) continue;
      var updatedAt = safeDateValue_(safeCellRaw_(rows[i], ctx.indices.updatedAt)) || safeDateValue_(safeCellRaw_(rows[i], ctx.indices.createdAt));
      if (!updatedAt) continue;
      var ageDays = Math.floor((now - updatedAt.getTime()) / 86400000);
      if (ageDays > 3) {
        overdue.push({
          job_id: safeCellValue_(rows[i], ctx.indices.jobId),
          customer_name: safeCellValue_(rows[i], ctx.indices.customer),
          status_code: code,
          status_label: JOB_STATUS_MAP[code] || safeCellValue_(rows[i], ctx.indices.statusText),
          technician: safeCellValue_(rows[i], ctx.indices.tech),
          age_days: ageDays,
          updated_at: Utilities.formatDate(updatedAt, 'Asia/Bangkok', 'yyyy-MM-dd HH:mm:ss')
        });
      }
    }
    overdue.sort(function(a, b) { return b.age_days - a.age_days; });
    return overdue;
  } catch (e) {
    return [];
  }
}

function getTopTechnician_() {
  try {
    var ss = getComphoneSheet();
    var sh = findSheetByName(ss, 'DBJOBS');
    if (!sh || sh.getLastRow() < 2) return null;
    var ctx = getJobSheetContext_(sh);
    var rows = sh.getRange(2, 1, sh.getLastRow() - 1, ctx.headers.length).getValues();
    var stats = {};
    for (var i = 0; i < rows.length; i++) {
      var tech = safeCellValue_(rows[i], ctx.indices.tech) || '-';
      if (!stats[tech]) stats[tech] = 0;
      stats[tech]++;
    }

    var topName = '';
    var topCount = 0;
    for (var name in stats) {
      if (stats.hasOwnProperty(name) && stats[name] > topCount) {
        topName = name;
        topCount = stats[name];
      }
    }
    return topName ? { name: topName, job_count: topCount } : null;
  } catch (e) {
    return null;
  }
}

function getPmDueSummary_() {
  try {
    if (typeof getPredictiveMaintenanceQueue !== 'function') return { total: 0, customers: [] };
    var queue = getPredictiveMaintenanceQueue({ days: 30, include_rainy_season: true });
    if (!queue || !queue.success) return { total: 0, customers: [] };
    return {
      total: Number(queue.total || (queue.customers ? queue.customers.length : 0) || 0),
      customers: queue.customers || []
    };
  } catch (e) {
    return { total: 0, customers: [] };
  }
}

function buildStatusDistributionArray_(counters) {
  var items = [];
  for (var code = 1; code <= 12; code++) {
    items.push({
      status_code: code,
      status_label: JOB_STATUS_MAP[code] || '',
      job_count: Number(counters[code] || 0)
    });
  }
  return items;
}

function normalizeReportPeriod_(period) {
  var text = String(period || 'today').toLowerCase();
  if (text === 'today' || text === 'day') return 'today';
  if (text === 'week' || text === 'weekly') return 'week';
  if (text === 'month' || text === 'monthly') return 'month';
  return 'today';
}

function isDateInPeriod_(date, period) {
  if (!date) return false;
  var now = new Date();
  var todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (period === 'today') return date >= todayStart;

  if (period === 'week') {
    var day = todayStart.getDay();
    var diff = day === 0 ? 6 : day - 1;
    var weekStart = new Date(todayStart.getTime() - diff * 86400000);
    return date >= weekStart;
  }

  if (period === 'month') {
    var monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    return date >= monthStart;
  }
  return false;
}

function safeDateValue_(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  var date = new Date(value);
  return isNaN(date.getTime()) ? null : date;
}
