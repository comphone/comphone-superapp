// COMPHONE SUPER APP v5.9.0-phase2d
// ============================================================
// DashboardV55.gs
// ============================================================

function getDashboardPayloadV55() {
  try {
    var base = typeof getDashboardData === 'function' ? getDashboardData() : { success: true };
    if (base && base.success === false) return base;

    var jobs = getDashboardJobsV55_();
    var summary = base.summary || {};
    var statusDistribution = buildStatusDistributionV55_(jobs);
    var revenue = summary.revenue || {};

    summary.totalJobs = Number(summary.totalJobs || summary.total_jobs || jobs.length || 0);
    summary.total_jobs = summary.totalJobs;
    summary.lowStock = Number(summary.lowStock || summary.low_stock || 0);
    summary.low_stock = summary.lowStock;
    summary.overdueJobs = Number(summary.overdueJobs || summary.overdue_jobs || 0);
    summary.overdue_jobs = summary.overdueJobs;
    summary.pmDueCount = Number(summary.pmDueCount || summary.pm_due_count || summary.pmCustomers || 0);
    summary.pm_due_count = summary.pmDueCount;
    summary.revenue = {
      today: Number(revenue.today || summary.revToday || 0),
      week: Number(revenue.week || summary.revWeek || 0),
      month: Number(revenue.month || summary.revMonth || 0)
    };
    summary.status_distribution = statusDistribution;
    summary.recentJobs = jobs.slice(0, 24);

    return {
      success: true,
      jobs: jobs,
      summary: summary,
      alerts: base.alerts || summary.alerts || [],
      inventory: base.inventory || [],
      status_distribution: statusDistribution
    };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

function updateJobScheduleV55(data) {
  data = data || {};
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (lockError) {
    return { success: false, error: 'Lock timeout' };
  }

  try {
    var jobId = String(data.job_id || data.jobId || '').trim();
    if (!jobId) return { success: false, error: 'job_id is required' };

    var ss = getComphoneSheet();
    if (!ss) return { success: false, error: 'Spreadsheet not found' };

    var sh = findSheetByName(ss, 'DBJOBS');
    if (!sh) return { success: false, error: 'DBJOBS not found' };
    if (sh.getLastRow() < 2) return { success: false, error: 'DBJOBS is empty' };

    var headerValues = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    var appointmentCol = findAppointmentColumnV55_(headerValues);
    if (appointmentCol === -1) {
      appointmentCol = headerValues.length;
      sh.getRange(1, appointmentCol + 1).setValue('Appointment_At');
      headerValues.push('Appointment_At');
    }

    var updatedAtCol = findHeaderIndexV55_(headerValues, ['เวลาอัปเดต', 'updated_at', 'updatedat', 'updated']);
    var noteCol = findHeaderIndexV55_(headerValues, ['หมายเหตุ', 'note']);
    var all = sh.getDataRange().getValues();

    for (var i = 1; i < all.length; i++) {
      if (String(all[i][0] || '').trim() !== jobId) continue;

      while (all[i].length < headerValues.length) all[i].push('');
      var appointmentValue = normalizeScheduleValueV55_(data.appointment_at || data.appointment || data.schedule_at || '');
      all[i][appointmentCol] = appointmentValue;
      if (updatedAtCol > -1) all[i][updatedAtCol] = new Date();
      if (noteCol > -1 && data.note) {
        all[i][noteCol] = (all[i][noteCol] ? all[i][noteCol] + '\n' : '') +
          Utilities.formatDate(new Date(), 'Asia/Bangkok', 'dd/MM/yyyy HH:mm') + ' [SCHEDULE]: ' + data.note;
      }

      sh.getRange(i + 1, 1, 1, headerValues.length).setValues([all[i].slice(0, headerValues.length)]);

      try {
        if (typeof logActivity === 'function') {
          logActivity('JOB_SCHEDULE', data.user || 'WEB_DASHBOARD_V55', jobId + ' → ' + String(appointmentValue || 'cleared'));
        }
      } catch (logError) {}

      return {
        success: true,
        job_id: jobId,
        appointment_at: appointmentValue
      };
    }

    return { success: false, error: 'ไม่พบ Job ID: ' + jobId };
  } catch (e) {
    return { success: false, error: e.toString() };
  } finally {
    try { lock.releaseLock(); } catch (releaseError) {}
  }
}

function getDashboardJobsV55_() {
  var ss = getComphoneSheet();
  if (!ss) return [];

  var sh = findSheetByName(ss, 'DBJOBS');
  if (!sh || sh.getLastRow() < 2) return [];

  var lastColumn = sh.getLastColumn();
  var values = sh.getRange(1, 1, sh.getLastRow(), lastColumn).getValues();
  var headers = values[0] || [];
  var idx = {
    jobId: findHeaderIndexV55_(headers, ['jobid', 'job_id', 'เลขงาน']),
    customer: findHeaderIndexV55_(headers, ['ชื่อลูกค้า', 'customer_name', 'customer', 'name']),
    customerId: findHeaderIndexV55_(headers, ['customer_id', 'รหัสลูกค้า']),
    symptom: findHeaderIndexV55_(headers, ['อาการ', 'symptom', 'issue', 'description']),
    statusText: findHeaderIndexV55_(headers, ['สถานะ', 'status', 'status_text']),
    tech: findHeaderIndexV55_(headers, ['ช่างที่รับงาน', 'technician', 'tech', 'assigned_to']),
    gps: findHeaderIndexV55_(headers, ['พิกัด gps', 'gps', 'location']),
    createdAt: findHeaderIndexV55_(headers, ['เวลาสร้าง', 'created_at', 'createdat', 'created']),
    updatedAt: findHeaderIndexV55_(headers, ['เวลาอัปเดต', 'updated_at', 'updatedat', 'updated']),
    note: findHeaderIndexV55_(headers, ['หมายเหตุ', 'note']),
    folderUrl: findHeaderIndexV55_(headers, ['folder_url', 'โฟลเดอร์', 'folder']),
    statusCode: findHeaderIndexV55_(headers, ['current_status_code', 'status_code']),
    appointmentAt: findAppointmentColumnV55_(headers),
    photoUrls: findHeaderIndexV55_(headers, ['photo_urls', 'photo_links', 'รูป', 'photos'])
  };

  var jobs = [];
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var jobId = safeStringV55_(readCellV55_(row, idx.jobId));
    if (!jobId) continue;

    var statusCode = readCellV55_(row, idx.statusCode);
    var statusText = safeStringV55_(readCellV55_(row, idx.statusText));
    if (!statusText && statusCode && typeof JOB_STATUS_MAP !== 'undefined') {
      statusText = JOB_STATUS_MAP[statusCode] || JOB_STATUS_MAP[String(statusCode)] || '';
    }

    jobs.push({
      id: jobId,
      job_id: jobId,
      customer_name: safeStringV55_(readCellV55_(row, idx.customer)) || 'ไม่ระบุลูกค้า',
      customer_id: safeStringV55_(readCellV55_(row, idx.customerId)),
      symptom: safeStringV55_(readCellV55_(row, idx.symptom)) || 'ไม่ระบุอาการ',
      status_label: statusText || '-',
      current_status_code: statusCode || '',
      technician: safeStringV55_(readCellV55_(row, idx.tech)),
      gps: safeStringV55_(readCellV55_(row, idx.gps)),
      created_at: readCellV55_(row, idx.createdAt),
      updated_at: readCellV55_(row, idx.updatedAt),
      appointment_at: readCellV55_(row, idx.appointmentAt),
      note: safeStringV55_(readCellV55_(row, idx.note)),
      folder_url: safeStringV55_(readCellV55_(row, idx.folderUrl)),
      photo_urls: splitPhotoUrlsV55_(readCellV55_(row, idx.photoUrls))
    });
  }

  jobs.sort(function (a, b) {
    return compareDateValueDescV55_(a.updated_at || a.created_at, b.updated_at || b.created_at);
  });

  return jobs;
}

function buildStatusDistributionV55_(jobs) {
  var bucket = {};
  (jobs || []).forEach(function (job) {
    var label = String(job.status_label || '-');
    var code = String(job.current_status_code || '');
    var key = code || label;
    if (!bucket[key]) {
      bucket[key] = {
        code: code,
        label: label,
        count: 0
      };
    }
    bucket[key].count += 1;
  });

  var out = [];
  for (var key in bucket) {
    if (bucket.hasOwnProperty(key)) out.push(bucket[key]);
  }
  out.sort(function (a, b) {
    return Number(a.code || 999) - Number(b.code || 999);
  });
  return out;
}

function findAppointmentColumnV55_(headers) {
  return findHeaderIndexV55_(headers, ['appointment_at', 'appointment', 'schedule', 'schedule_at', 'วันนัด', 'นัดหมาย', 'due_at', 'due_date']);
}

function findHeaderIndexV55_(headers, candidates) {
  var normalizedCandidates = [];
  for (var i = 0; i < candidates.length; i++) {
    normalizedCandidates.push(normalizeHeaderKeyV55_(candidates[i]));
  }

  for (var col = 0; col < headers.length; col++) {
    var header = normalizeHeaderKeyV55_(headers[col]);
    if (!header) continue;
    for (var j = 0; j < normalizedCandidates.length; j++) {
      var candidate = normalizedCandidates[j];
      if (!candidate) continue;
      if (header === candidate || header.indexOf(candidate) > -1 || candidate.indexOf(header) > -1) {
        return col;
      }
    }
  }
  return -1;
}

function normalizeHeaderKeyV55_(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[\-_]/g, '');
}

function readCellV55_(row, index) {
  if (index < 0 || index >= row.length) return '';
  return row[index];
}

function safeStringV55_(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function splitPhotoUrlsV55_(value) {
  if (!value) return [];
  if (Object.prototype.toString.call(value) === '[object Array]') return value;
  return String(value)
    .split(/[,\n|]/)
    .map(function (item) { return String(item || '').trim(); })
    .filter(function (item) { return !!item; });
}

function compareDateValueDescV55_(left, right) {
  var a = normalizeDateMillisV55_(left);
  var b = normalizeDateMillisV55_(right);
  return b - a;
}

function normalizeDateMillisV55_(value) {
  if (!value) return 0;
  if (Object.prototype.toString.call(value) === '[object Date]') return value.getTime();
  var parsed = new Date(value);
  var millis = parsed.getTime();
  return isNaN(millis) ? 0 : millis;
}

function normalizeScheduleValueV55_(value) {
  if (!value) return '';
  var date = Object.prototype.toString.call(value) === '[object Date]' ? value : new Date(value);
  if (isNaN(date.getTime())) return String(value);
  return date;
}
