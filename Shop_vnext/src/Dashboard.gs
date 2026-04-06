// ============================================================
// Dashboard.gs - Dashboard Data APIs (V366)
// doGet + include moved to Router.gs (single entry point)
// ============================================================

function getDashboardData() {
  return {
    success: true,
    jobs: getDashboardJobs(),
    inventory: getDashboardInventory(),
    summary: getDashboardSummary()
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
    var ss = getComphoneSheet();
    var jsh = findSheetByName(ss, 'DBJOBS');
    var ish = findSheetByName(ss, 'DB_INVENTORY');
    var p = 0, c = 0, ip = 0, ls = 0, ti = 0;
    if (jsh) {
      var j = jsh.getDataRange().getValues();
      var sc = 3;
      var headers = j[0];
      for (var hi = 0; hi < headers.length; hi++) {
        var h = String(headers[hi]);
        if (h.indexOf('สถานะ') > -1 || h.indexOf('สถาน') > -1) { sc = hi; break; }
      }
      for (var i = 1; i < j.length; i++) {
        var s = String(j[i][sc]);
        if (s.indexOf('รอดำ') === 0) p++;
        else if (s === 'InProgress' || s.indexOf('กำลัง') === 0) ip++;
        else if (s === 'Completed') c++;
      }
    }
    if (ish) {
      var it = ish.getDataRange().getValues();
      ti = it.length - 1;
      for (var k = 1; k < it.length; k++) {
        if (Number(it[k][2] || 0) < 5) ls++;
      }
    }
    // นับรูปที่ Pending
    var pendingPhotos = 0;
    var pqsh = findSheetByName(ss, 'DB_PHOTO_QUEUE');
    if (pqsh) {
      var pq = pqsh.getDataRange().getValues();
      for (var qi = 1; qi < pq.length; qi++) {
        if (String(pq[qi][7] || '') === 'Pending') pendingPhotos++;
      }
    }
    return {
      totalJobs: p + ip + c, pending: p, inProgress: ip, completed: c,
      totalItems: ti, lowStock: ls, pendingPhotos: pendingPhotos,
      date: Utilities.formatDate(new Date(), 'Asia/Bangkok', 'dd/MM/yyyy HH:mm')
    };
  } catch(e) {
    return { totalJobs:0, pending:0, inProgress:0, completed:0, totalItems:0, lowStock:0, pendingPhotos:0, date:'error' };
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
