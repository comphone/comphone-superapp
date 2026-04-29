// COMPHONE SUPER APP v5.9.0-phase31a
// ============================================================
// Attendance.gs - ระบบลงเวลาทำงานและประวัติช่าง
// ============================================================

var ATTENDANCE_SHEET = 'DB_ATTENDANCE';
var TECH_HISTORY_SHEET = 'DB_TECH_HISTORY';

// ============================================================
// ⏰ Clock In / Clock Out
// ============================================================
function clockIn(techName, note) {
  try {
    techName = String(techName || '').trim();
    if (!techName) return { success: false, error: 'กรุณาระบุชื่อช่าง' };

    var ss = getComphoneSheet();
    var sh = findOrCreateAttendanceSheet_(ss);
    var today = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd');
    var now = getThaiTimestamp();

    // ตรวจสอบว่า clock-in แล้วหรือยัง
    var rows = sh.getDataRange().getValues();
    for (var i = rows.length - 1; i >= 1; i--) {
      if (String(rows[i][0] || '') === today &&
          String(rows[i][1] || '').toLowerCase() === techName.toLowerCase() &&
          !rows[i][3]) {
        return { success: false, error: techName + ' ลงเวลาเข้างานวันนี้แล้ว (' + rows[i][2] + ')' };
      }
    }

    var rowId = 'ATT-' + today.replace(/-/g, '') + '-' + techName.replace(/\s/g, '').substring(0, 4).toUpperCase();
    sh.appendRow([today, techName, now, '', '', '', 'PRESENT', String(note || ''), rowId]);

    try { logActivity('CLOCK_IN', techName, 'เข้างาน ' + now); } catch(e) {}
    return { success: true, tech: techName, clock_in: now, date: today, id: rowId };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

function clockOut(techName, note) {
  try {
    techName = String(techName || '').trim();
    if (!techName) return { success: false, error: 'กรุณาระบุชื่อช่าง' };

    var ss = getComphoneSheet();
    var sh = findOrCreateAttendanceSheet_(ss);
    var today = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd');
    var now = new Date();
    var nowStr = getThaiTimestamp();

    var rows = sh.getDataRange().getValues();
    for (var i = rows.length - 1; i >= 1; i--) {
      if (String(rows[i][0] || '') === today &&
          String(rows[i][1] || '').toLowerCase() === techName.toLowerCase() &&
          !rows[i][3]) {

        var clockInTime = safeDateValue_(rows[i][2]);
        var hoursWorked = clockInTime ? Math.round((now - clockInTime) / 36000) / 100 : 0;

        sh.getRange(i + 1, 4).setValue(nowStr);
        sh.getRange(i + 1, 5).setValue(hoursWorked);
        sh.getRange(i + 1, 9).setValue(String(note || ''));

        try { logActivity('CLOCK_OUT', techName, 'ออกงาน ' + nowStr + ' ชม.ทำงาน=' + hoursWorked); } catch(e) {}
        return { success: true, tech: techName, clock_out: nowStr, hours_worked: hoursWorked, date: today };
      }
    }
    return { success: false, error: techName + ' ยังไม่ได้ลงเวลาเข้างานวันนี้' };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

// ============================================================
// 📋 ดูรายงานการลงเวลา
// ============================================================
function getAttendanceReport(params) {
  try {
    params = params || {};
    var ss = getComphoneSheet();
    var sh = findSheetByName(ss, ATTENDANCE_SHEET);
    if (!sh || sh.getLastRow() < 2) return { success: true, records: [], total: 0 };

    var rows = sh.getDataRange().getValues();
    var techFilter = String(params.tech || '').trim().toLowerCase();
    var dateFrom = params.date_from || '';
    var dateTo = params.date_to || '';
    var records = [];

    for (var i = 1; i < rows.length; i++) {
      var row = rows[i];
      var rowDate = String(row[0] || '');
      var rowTech = String(row[1] || '');

      if (techFilter && rowTech.toLowerCase() !== techFilter) continue;
      if (dateFrom && rowDate < dateFrom) continue;
      if (dateTo && rowDate > dateTo) continue;

      records.push({
        date: rowDate,
        tech: rowTech,
        clock_in: String(row[2] || '-'),
        clock_out: String(row[3] || '-'),
        hours_worked: Number(row[4] || 0),
        jobs_done: Number(row[5] || 0),
        status: String(row[6] || 'PRESENT'),
        note: String(row[7] || ''),
        id: String(row[8] || '')
      });
    }

    records.sort(function(a, b) { return b.date > a.date ? 1 : -1; });

    var totalHours = records.reduce(function(sum, r) { return sum + r.hours_worked; }, 0);
    var presentDays = records.filter(function(r) { return r.status === 'PRESENT'; }).length;

    return {
      success: true,
      records: records,
      total: records.length,
      total_hours: Math.round(totalHours * 100) / 100,
      present_days: presentDays,
      tech: techFilter || 'ทั้งหมด'
    };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

// ============================================================
// 🏆 ประวัติการทำงานของช่าง (Tech History)
// ============================================================
function getTechHistory(techName, params) {
  try {
    techName = String(techName || '').trim();
    params = params || {};
    var ss = getComphoneSheet();

    // ดึงงานทั้งหมดของช่างคนนี้จาก DBJOBS
    var jsh = findSheetByName(ss, 'DBJOBS');
    var jobs = [];
    if (jsh && jsh.getLastRow() > 1) {
      var jrows = jsh.getDataRange().getValues();
      var jHeaders = jrows[0];
      var ctx = getJobSheetContext_(jsh);
      for (var i = 1; i < jrows.length; i++) {
        var rowTech = safeCellValue_(jrows[i], ctx.indices.tech) || '';
        if (techName && rowTech.toLowerCase() !== techName.toLowerCase()) continue;
        var statusCode = inferCurrentStatusCodeFromRow_(jrows[i], ctx.indices);
        jobs.push({
          job_id: safeCellValue_(jrows[i], ctx.indices.jobId),
          customer: safeCellValue_(jrows[i], ctx.indices.customer),
          symptom: safeCellValue_(jrows[i], ctx.indices.symptom),
          status_code: statusCode,
          status_label: JOB_STATUS_MAP[statusCode] || String(jrows[i][ctx.indices.statusText] || ''),
          is_completed: statusCode >= 11,
          created_at: jrows[i][ctx.indices.createdAt] instanceof Date
            ? Utilities.formatDate(jrows[i][ctx.indices.createdAt], 'Asia/Bangkok', 'yyyy-MM-dd')
            : String(jrows[i][ctx.indices.createdAt] || ''),
          tech: rowTech
        });
      }
    }

    // ดึงข้อมูลการลงเวลา
    var attendance = getAttendanceReport({ tech: techName });

    // สรุปสถิติ
    var completedJobs = jobs.filter(function(j) { return j.is_completed; });
    var inProgressJobs = jobs.filter(function(j) { return !j.is_completed; });

    return {
      success: true,
      tech: techName || 'ทั้งหมด',
      summary: {
        total_jobs: jobs.length,
        completed_jobs: completedJobs.length,
        in_progress_jobs: inProgressJobs.length,
        completion_rate: jobs.length > 0 ? Math.round(completedJobs.length / jobs.length * 100) : 0,
        total_work_days: attendance.present_days || 0,
        total_hours: attendance.total_hours || 0
      },
      jobs: jobs,
      attendance: attendance.records || []
    };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

// ============================================================
// 📊 สรุปช่างทุกคน (สำหรับ Dashboard)
// ============================================================
function getAllTechsSummary() {
  try {
    var ss = getComphoneSheet();
    var jsh = findSheetByName(ss, 'DBJOBS');
    if (!jsh || jsh.getLastRow() < 2) return { success: true, techs: [] };

    var jrows = jsh.getDataRange().getValues();
    var ctx = getJobSheetContext_(jsh);
    var stats = {};

    for (var i = 1; i < jrows.length; i++) {
      var tech = safeCellValue_(jrows[i], ctx.indices.tech) || 'ไม่ระบุ';
      if (!stats[tech]) stats[tech] = { name: tech, total: 0, completed: 0, in_progress: 0 };
      var code = inferCurrentStatusCodeFromRow_(jrows[i], ctx.indices);
      stats[tech].total++;
      if (code >= 11) stats[tech].completed++;
      else stats[tech].in_progress++;
    }

    var techs = Object.keys(stats).map(function(k) {
      var s = stats[k];
      s.completion_rate = s.total > 0 ? Math.round(s.completed / s.total * 100) : 0;
      return s;
    });
    techs.sort(function(a, b) { return b.total - a.total; });

    return { success: true, techs: techs, total_techs: techs.length };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

// ============================================================
// 🔧 Private Helpers
// ============================================================
function findOrCreateAttendanceSheet_(ss) {
  var sh = findSheetByName(ss, ATTENDANCE_SHEET);
  if (sh) return sh;
  sh = ss.insertSheet(ATTENDANCE_SHEET);
  sh.appendRow(['date', 'tech_name', 'clock_in', 'clock_out', 'hours_worked', 'jobs_done', 'status', 'note', 'record_id']);
  sh.setFrozenRows(1);
  sh.getRange(1, 1, 1, 9).setFontWeight('bold').setBackground('#0f9d58').setFontColor('#ffffff');
  return sh;
}

function safeCellRaw_(row, idx) {
  if (idx === undefined || idx === null || idx < 0) return '';
  return row[idx] !== undefined ? row[idx] : '';
}

function safeCellValue_(row, idx) {
  var raw = safeCellRaw_(row, idx);
  if (raw instanceof Date) return Utilities.formatDate(raw, 'Asia/Bangkok', 'yyyy-MM-dd HH:mm:ss');
  return String(raw || '');
}
