// COMPHONE SUPER APP v5.9.0-phase31a
// ============================================================
// AfterSales.gs - ระบบดูแลลูกค้าหลังการขาย (After-Sales Service)
// ============================================================

var AFTERSALES_SHEET = 'DB_AFTER_SALES';
var WARRANTY_SHEET = 'DB_WARRANTIES';

// ============================================================
// 📋 สร้าง After-Sales Record เมื่อปิดงาน
// ============================================================
function createAfterSalesRecord(jobId) {
  try {
    jobId = String(jobId || '').trim();
    if (!jobId) return { success: false, error: 'กรุณาระบุ Job ID' };

    var ss = getComphoneSheet();
    var jsh = findSheetByName(ss, 'DBJOBS');
    if (!jsh) return { success: false, error: 'ไม่พบ DBJOBS' };

    // ดึงข้อมูลงาน
    var ctx = getJobSheetContext_(jsh);
    var rows = jsh.getDataRange().getValues();
    var jobRow = null;
    for (var i = 1; i < rows.length; i++) {
      if (safeCellValue_(rows[i], ctx.indices.jobId) === jobId) {
        jobRow = rows[i];
        break;
      }
    }
    if (!jobRow) return { success: false, error: 'ไม่พบงาน: ' + jobId };

    var customer = safeCellValue_(jobRow, ctx.indices.customer);
    var tech = safeCellValue_(jobRow, ctx.indices.tech);
    var closedDate = getThaiTimestamp();
    var now = new Date();

    // คำนวณวันนัดตรวจสอบ (6 เดือน และ 1 ปี)
    var check6m = Utilities.formatDate(new Date(now.getTime() + 180 * 86400000), 'Asia/Bangkok', 'yyyy-MM-dd');
    var check1y = Utilities.formatDate(new Date(now.getTime() + 365 * 86400000), 'Asia/Bangkok', 'yyyy-MM-dd');
    var warrantyEnd = Utilities.formatDate(new Date(now.getTime() + 365 * 86400000), 'Asia/Bangkok', 'yyyy-MM-dd');

    var sh = findOrCreateAfterSalesSheet_(ss);
    var recordId = 'AS-' + jobId;

    sh.appendRow([
      recordId, jobId, customer, tech, closedDate,
      warrantyEnd, check6m, check1y,
      'ACTIVE', '', '', '', '', getThaiTimestamp()
    ]);

    try { logActivity('AFTER_SALES_CREATED', 'SYSTEM', 'สร้าง After-Sales สำหรับ ' + jobId); } catch(e) {}

    return {
      success: true,
      record_id: recordId,
      job_id: jobId,
      customer: customer,
      warranty_end: warrantyEnd,
      check_6m: check6m,
      check_1y: check1y
    };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

// ============================================================
// 📅 ดูรายการที่ต้องติดตาม (ใกล้ครบกำหนด)
// ============================================================
function getAfterSalesDue(days) {
  try {
    days = Number(days || 30);
    var ss = getComphoneSheet();
    var sh = findSheetByName(ss, AFTERSALES_SHEET);
    if (!sh || sh.getLastRow() < 2) return { success: true, items: [], total: 0 };

    var rows = sh.getDataRange().getValues();
    var now = new Date();
    var cutoff = new Date(now.getTime() + days * 86400000);
    var items = [];

    for (var i = 1; i < rows.length; i++) {
      var row = rows[i];
      var status = String(row[8] || 'ACTIVE');
      if (status === 'CLOSED') continue;

      var check6m = safeDateValue_(row[6]);
      var check1y = safeDateValue_(row[7]);
      var warrantyEnd = safeDateValue_(row[5]);

      var alerts = [];
      if (check6m && check6m >= now && check6m <= cutoff) {
        alerts.push({ type: 'CHECK_6M', due: Utilities.formatDate(check6m, 'Asia/Bangkok', 'yyyy-MM-dd'), days_left: Math.ceil((check6m - now) / 86400000) });
      }
      if (check1y && check1y >= now && check1y <= cutoff) {
        alerts.push({ type: 'CHECK_1Y', due: Utilities.formatDate(check1y, 'Asia/Bangkok', 'yyyy-MM-dd'), days_left: Math.ceil((check1y - now) / 86400000) });
      }
      if (warrantyEnd && warrantyEnd >= now && warrantyEnd <= cutoff) {
        alerts.push({ type: 'WARRANTY_EXPIRY', due: Utilities.formatDate(warrantyEnd, 'Asia/Bangkok', 'yyyy-MM-dd'), days_left: Math.ceil((warrantyEnd - now) / 86400000) });
      }

      if (alerts.length > 0) {
        items.push({
          record_id: String(row[0] || ''),
          job_id: String(row[1] || ''),
          customer: String(row[2] || ''),
          tech: String(row[3] || ''),
          closed_date: String(row[4] || ''),
          warranty_end: warrantyEnd ? Utilities.formatDate(warrantyEnd, 'Asia/Bangkok', 'yyyy-MM-dd') : '',
          status: status,
          alerts: alerts,
          note: String(row[9] || '')
        });
      }
    }

    items.sort(function(a, b) {
      var aMin = Math.min.apply(null, a.alerts.map(function(x) { return x.days_left; }));
      var bMin = Math.min.apply(null, b.alerts.map(function(x) { return x.days_left; }));
      return aMin - bMin;
    });

    return { success: true, items: items, total: items.length, days_ahead: days };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

// ============================================================
// 📝 บันทึกผลการติดตาม (Follow-up Log)
// ============================================================
function logAfterSalesFollowUp(recordId, note, followUpBy, nextAction) {
  try {
    recordId = String(recordId || '').trim();
    if (!recordId) return { success: false, error: 'กรุณาระบุ Record ID' };

    var ss = getComphoneSheet();
    var sh = findSheetByName(ss, AFTERSALES_SHEET);
    if (!sh) return { success: false, error: 'ไม่พบ DB_AFTER_SALES' };

    var rows = sh.getDataRange().getValues();
    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][0] || '') === recordId) {
        sh.getRange(i + 1, 10).setValue(String(note || ''));
        sh.getRange(i + 1, 11).setValue(String(followUpBy || ''));
        sh.getRange(i + 1, 12).setValue(getThaiTimestamp());
        sh.getRange(i + 1, 13).setValue(String(nextAction || ''));
        try { logActivity('AFTERSALES_FOLLOWUP', followUpBy || 'SYSTEM', recordId + ': ' + note); } catch(e) {}
        return { success: true, record_id: recordId, logged_at: getThaiTimestamp() };
      }
    }
    return { success: false, error: 'ไม่พบ Record: ' + recordId };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

// ============================================================
// 🔔 ส่งแจ้งเตือน After-Sales ผ่าน LINE
// ============================================================
function sendAfterSalesAlerts() {
  try {
    _logInfo_('sendAfterSalesAlerts', 'Starting after-sales alert scan');
    var due = getAfterSalesDue(7);
    if (!due.success || due.total === 0) return { success: true, sent: 0, message: 'ไม่มีรายการที่ต้องแจ้งเตือน' };

    var msg = '🔔 แจ้งเตือน After-Sales\n';
    msg += '📅 ' + Utilities.formatDate(new Date(), 'Asia/Bangkok', 'dd/MM/yyyy') + '\n\n';

    due.items.forEach(function(item) {
      item.alerts.forEach(function(alert) {
        var typeLabel = alert.type === 'CHECK_6M' ? 'เช็คระยะ 6 เดือน' :
                        alert.type === 'CHECK_1Y' ? 'เช็คระยะ 1 ปี' : 'ใบรับประกันหมดอายุ';
        msg += '• ' + item.customer + ' (' + item.job_id + ')\n';
        msg += '  ' + typeLabel + ' — อีก ' + alert.days_left + ' วัน (' + alert.due + ')\n';
      });
    });

    sendLineNotify({ message: msg, room: 'SALES' });
    return { success: true, sent: due.total, message: 'ส่งแจ้งเตือน ' + due.total + ' รายการ' };
  } catch (e) {
    _logError_('MEDIUM', 'sendAfterSalesAlerts', e);
    return { success: false, error: e.toString() };
  }
}

// ============================================================
// 📊 สรุป After-Sales ทั้งหมด
// ============================================================
function getAfterSalesSummary() {
  try {
    var ss = getComphoneSheet();
    var sh = findSheetByName(ss, AFTERSALES_SHEET);
    if (!sh || sh.getLastRow() < 2) return { success: true, total: 0, active: 0, closed: 0, due_30d: 0 };

    var rows = sh.getDataRange().getValues();
    var total = 0, active = 0, closed = 0;
    for (var i = 1; i < rows.length; i++) {
      if (!rows[i][0]) continue;
      total++;
      if (String(rows[i][8] || 'ACTIVE') === 'CLOSED') closed++;
      else active++;
    }

    var due30 = getAfterSalesDue(30);
    return {
      success: true,
      total: total,
      active: active,
      closed: closed,
      due_30d: due30.total || 0
    };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

// ============================================================
// 🔧 Private Helpers
// ============================================================
function findOrCreateAfterSalesSheet_(ss) {
  var sh = findSheetByName(ss, AFTERSALES_SHEET);
  if (sh) return sh;
  sh = ss.insertSheet(AFTERSALES_SHEET);
  sh.appendRow([
    'record_id', 'job_id', 'customer', 'tech', 'closed_date',
    'warranty_end', 'check_6m', 'check_1y',
    'status', 'note', 'followup_by', 'followup_at', 'next_action', 'created_at'
  ]);
  sh.setFrozenRows(1);
  sh.getRange(1, 1, 1, 14).setFontWeight('bold').setBackground('#e67e22').setFontColor('#ffffff');
  return sh;
}
