// COMPHONE SUPER APP V5.5
// ============================================================
// JobStateMachine.gs - QR Job State Machine V5.5
// ============================================================

var JOB_STATUS_MAP = {
  1: 'รอมอบหมาย',
  2: 'มอบหมายแล้ว',
  3: 'รับงานแล้ว',
  4: 'เดินทาง',
  5: 'ถึงหน้างาน',
  6: 'เริ่มงาน',
  7: 'รอชิ้นส่วน',
  8: 'งานเสร็จ',
  9: 'ลูกค้าตรวจรับ',
  10: 'รอเก็บเงิน',
  11: 'เก็บเงินแล้ว',
  12: 'ปิดงาน'
};

var JOB_ALLOWED_TRANSITIONS = {
  1: [2],
  2: [3],
  3: [4],
  4: [5],
  5: [6],
  6: [7, 8],
  7: [6, 8],
  8: [9],
  9: [10],
  10: [11],
  11: [12],
  12: []
};

var JOB_STATUS_ALIASES = {
  'รอมอบหมาย': 1,
  'เปิดงาน': 1,
  'รอดำเนินการ': 1,
  'มอบหมายแล้ว': 2,
  'มอบหมายงาน': 2,
  'โทรนัดแล้ว': 2,
  'รับงานแล้ว': 3,
  'เตรียมอุปกรณ์': 3,
  'เดินทาง': 4,
  'ถึงหน้างาน': 5,
  'เริ่มงาน': 6,
  'เริ่มปฏิบัติงาน': 6,
  'รอชิ้นส่วน': 7,
  'รออะไหล่': 7,
  'งานเสร็จ': 8,
  'ติดตั้งเสร็จ': 8,
  'ลูกค้าตรวจรับ': 9,
  'รอเก็บเงิน': 10,
  'รอชำระเงิน': 10,
  'เก็บเงินแล้ว': 11,
  'ปิดงาน': 12,
  'completed': 12,
  'complete': 12
};

function getJobStateConfig() {
  var items = [];
  for (var code = 1; code <= 12; code++) {
    items.push({
      code: code,
      label: JOB_STATUS_MAP[code],
      allowed_next: getAllowedTransitionObjects_(code)
    });
  }
  return {
    success: true,
    states: items,
    total: items.length
  };
}

function createJob(data) {
  var lock = LockService.getScriptLock();
  try { lock.waitLock(10000); } catch (e) { return { success: false, error: 'Lock timeout' }; }
  try {
    data = data || {};
    if (typeof enrichJobDataWithCustomer_ === 'function') {
      data = enrichJobDataWithCustomer_(data);
    }
    var ss = getComphoneSheet();
    if (!ss) return { success: false, error: 'Spreadsheet not found' };

    var sh = findSheetByName(ss, 'DBJOBS');
    if (!sh) return { success: false, error: 'DBJOBS not found' };

    var ctx = getJobSheetContext_(sh);
    var jobId = String(data.job_id || '').trim() || generateNextJobId_(sh, ctx.indices.jobId);
    if (findJobRowIndexById_(sh, ctx, jobId) > -1) {
      return { success: false, error: 'Job ID already exists: ' + jobId };
    }

    var statusCode = normalizeStatusCode_(data.current_status_code || data.status_code || data.new_status || data.status || 1);
    if (!JOB_STATUS_MAP[statusCode]) statusCode = 1;

    var row = createEmptyRow_(ctx.headers.length);
    setIfIndex_(row, ctx.indices.jobId, jobId);
    setIfIndex_(row, ctx.indices.customer, data.customer_name || data.customer || data.name || 'ลูกค้าใหม่');
    setIfIndex_(row, ctx.indices.symptom, data.symptom || data.issue || 'อาการไม่ระบุ');
    setIfIndex_(row, ctx.indices.statusText, JOB_STATUS_MAP[statusCode]);
    setIfIndex_(row, ctx.indices.tech, data.tech || data.technician || data.assigned_to || '');
    setIfIndex_(row, ctx.indices.gps, buildGpsValue_(data));
    setIfIndex_(row, ctx.indices.createdAt, new Date());
    setIfIndex_(row, ctx.indices.updatedAt, new Date());
    setIfIndex_(row, ctx.indices.note, data.note || '');
    setIfIndex_(row, ctx.indices.folderUrl, data.folder_url || '');
    setIfIndex_(row, ctx.indices.currentStatusCode, statusCode);
    setIfIndex_(row, ctx.indices.voiceSummaryLog, data.voice_summary_log || '');
    setIfIndex_(row, ctx.indices.toolChecklistStatus, data.tool_checklist_status || '');

    sh.appendRow(row);

    var reservationInfo = null;
    if (data.parts && Array.isArray(data.parts) && data.parts.length > 0 && typeof reserveItemsForJob === 'function') {
      reservationInfo = reserveItemsForJob(jobId, data.parts);
    }

    var customerSync = null;
    if (typeof syncCustomerFromJob === 'function') {
      customerSync = syncCustomerFromJob(jobId);
    }

    appendJobStatusLog_(jobId, '', JOB_STATUS_MAP[statusCode], data.changed_by || data.user || 'SYSTEM', data.note || 'สร้างใบงานใหม่');

    try { if (typeof logActivity === 'function') logActivity('JOB_CREATE', data.changed_by || data.user || 'SYSTEM', jobId + ' — ' + (data.customer_name || data.customer || data.name || 'ลูกค้าใหม่')); } catch (logErr) {}

    // ── Smart Auto-Assign: มอบหมายช่างอัตโนมัติหลังสร้างงาน ──
    var autoAssignResult = null;
    try {
      if (typeof smartAssignTech_ === 'function' && !data.technician && !data.tech && !data.assigned_to) {
        var _gpsParts = buildGpsValue_(data);
        var _lat = 0, _lng = 0;
        if (_gpsParts && _gpsParts.indexOf(',') > -1) {
          var _coords = _gpsParts.split(',');
          _lat = parseFloat(_coords[0]) || 0;
          _lng = parseFloat(_coords[1]) || 0;
        }
        var _assignPayload = {
          job_id: jobId,
          lat: _lat || parseFloat(data.lat || data.latitude || 0),
          lng: _lng || parseFloat(data.lng || data.longitude || 0),
          symptom: data.symptom || data.issue || '',
          required_skills: data.required_skills || []
        };
        var _smartResult = smartAssignTech_(_assignPayload);
        if (_smartResult && _smartResult.success && _smartResult.recommended && _smartResult.recommended.length > 0) {
          var _bestTech = _smartResult.recommended[0];
          // Auto-assign best tech to the job row
          var _assignCtx = getJobSheetContext_(sh);
          var _assignRowIdx = findJobRowIndexById_(sh, _assignCtx, jobId);
          if (_assignRowIdx > -1) {
            var _assignRow = sh.getRange(_assignRowIdx, 1, 1, _assignCtx.headers.length).getValues()[0];
            setIfIndex_(_assignRow, _assignCtx.indices.tech, _bestTech.techName);
            setIfIndex_(_assignRow, _assignCtx.indices.statusText, JOB_STATUS_MAP[2]); // status 2 = มอบหมายแล้ว
            setIfIndex_(_assignRow, _assignCtx.indices.currentStatusCode, 2);
            setIfIndex_(_assignRow, _assignCtx.indices.updatedAt, new Date());
            var _prevNote = safeCellValue_(_assignRow, _assignCtx.indices.note);
            var _assignNote = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd HH:mm:ss') + ' [AUTO-ASSIGN] ' + _bestTech.techName + ' — ' + _bestTech.reason;
            setIfIndex_(_assignRow, _assignCtx.indices.note, _prevNote ? _prevNote + '\n' + _assignNote : _assignNote);
            sh.getRange(_assignRowIdx, 1, 1, _assignCtx.headers.length).setValues([_assignRow]);
          }
          // Update status code for return value
          statusCode = 2;
          // Log the auto-assign transition
          appendJobStatusLog_(jobId, JOB_STATUS_MAP[1], JOB_STATUS_MAP[2], 'AUTO-ASSIGN', _bestTech.techName + ' — ' + _bestTech.reason);
          try { if (typeof logActivity === 'function') logActivity('AUTO_ASSIGN', 'SYSTEM', jobId + ' → ' + _bestTech.techName + ' (' + _bestTech.distKm + 'km, score=' + _bestTech.score + ')'); } catch (aaLogErr) {}
          autoAssignResult = {
            assigned: true,
            tech_id: _bestTech.techId,
            tech_name: _bestTech.techName,
            score: _bestTech.score,
            dist_km: _bestTech.distKm,
            eta_min: _bestTech.etaMin,
            reason: _bestTech.reason,
            alternatives: _smartResult.recommended.slice(1) // other candidates
          };
        } else if (_smartResult && !_smartResult.success) {
          autoAssignResult = { assigned: false, reason: _smartResult.error || 'No suitable tech found' };
        } else {
          autoAssignResult = { assigned: false, reason: 'No active techs available' };
        }
      }
    } catch (aaErr) {
      Logger.log('Auto-assign error for ' + jobId + ': ' + aaErr);
      autoAssignResult = { assigned: false, reason: 'Auto-assign error: ' + aaErr.toString() };
    }

    var qr = generateJobQR(jobId);
    return {
      success: true,
      job_id: jobId,
      status_code: statusCode,
      status_label: JOB_STATUS_MAP[statusCode],
      auto_assign: autoAssignResult,
      reservation: reservationInfo,
      customer_sync: customerSync,
      qr: qr
    };
  } catch (e) {
        try { if (typeof _logError_ === 'function') _logError_('MEDIUM', 'createJob', e, {source: 'JOB_STATE'}); } catch(_le) {}
    return { success: false, error: e.toString() };
  } finally {
    try { lock.releaseLock(); } catch (releaseErr) {}
  }
}

function transitionJob(jobId, newStatus, options) {
  var lock = LockService.getScriptLock();
  try { lock.waitLock(10000); } catch (e) { return { success: false, error: 'Lock timeout' }; }
  try {
    options = options || {};
    jobId = String(jobId || options.job_id || '').trim();
    if (!jobId) return { success: false, error: 'jobId is required' };

    var targetStatus = normalizeStatusCode_(newStatus || options.new_status || options.status_code || options.status);
    if (!JOB_STATUS_MAP[targetStatus]) return { success: false, error: 'Invalid target status: ' + newStatus };

    var ss = getComphoneSheet();
    if (!ss) return { success: false, error: 'Spreadsheet not found' };
    var sh = findSheetByName(ss, 'DBJOBS');
    if (!sh) return { success: false, error: 'DBJOBS not found' };

    var ctx = getJobSheetContext_(sh);
    var rowIndex = findJobRowIndexById_(sh, ctx, jobId);
    if (rowIndex < 0) return { success: false, error: 'ไม่พบ Job ID: ' + jobId };

    var rowValues = sh.getRange(rowIndex, 1, 1, ctx.headers.length).getValues()[0];
    var currentStatus = inferCurrentStatusCodeFromRow_(rowValues, ctx.indices);
    var currentLabel = JOB_STATUS_MAP[currentStatus] || '';
    var targetLabel = JOB_STATUS_MAP[targetStatus] || '';

    if (currentStatus === targetStatus) {
      return {
        success: true,
        job_id: jobId,
        from_status_code: currentStatus,
        to_status_code: targetStatus,
        from_status_label: currentLabel,
        to_status_label: targetLabel,
        message: 'สถานะปัจจุบันตรงกับสถานะที่ส่งมาอยู่แล้ว'
      };
    }

    var allowed = JOB_ALLOWED_TRANSITIONS[currentStatus] || [];
    if (allowed.indexOf(targetStatus) === -1) {
      return {
        success: false,
        error: 'Invalid transition from ' + currentLabel + ' to ' + targetLabel,
        current_status_code: currentStatus,
        current_status_label: currentLabel,
        allowed_next: getAllowedTransitionObjects_(currentStatus)
      };
    }

    setIfIndex_(rowValues, ctx.indices.currentStatusCode, targetStatus);
    setIfIndex_(rowValues, ctx.indices.statusText, targetLabel);
    setIfIndex_(rowValues, ctx.indices.updatedAt, new Date());

    var gpsValue = buildGpsValue_(options);
    if (gpsValue) setIfIndex_(rowValues, ctx.indices.gps, gpsValue);

    if (options.technician || options.tech || options.assigned_to) {
      setIfIndex_(rowValues, ctx.indices.tech, options.technician || options.tech || options.assigned_to);
    }

    if (options.note) {
      var oldNote = safeCellValue_(rowValues, ctx.indices.note);
      var noteLine = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd HH:mm:ss') + ' [' + (options.changed_by || options.user || 'SYSTEM') + '] ' + options.note;
      setIfIndex_(rowValues, ctx.indices.note, oldNote ? oldNote + '\n' + noteLine : noteLine);
    }

    sh.getRange(rowIndex, 1, 1, ctx.headers.length).setValues([rowValues]);
    appendJobStatusLog_(jobId, currentLabel, targetLabel, options.changed_by || options.user || 'SYSTEM', options.note || '');

    var automation = runJobTransitionAutomation_(jobId, currentStatus, targetStatus, options);

    try { if (typeof logActivity === 'function') logActivity('JOB_STATUS_TRANSITION', options.changed_by || options.user || 'SYSTEM', jobId + ' ' + currentLabel + ' -> ' + targetLabel); } catch (logErr) {}

    return {
      success: true,
      job_id: jobId,
      from_status_code: currentStatus,
      to_status_code: targetStatus,
      from_status_label: currentLabel,
      to_status_label: targetLabel,
      allowed_next: getAllowedTransitionObjects_(targetStatus),
      job: buildJobObjectFromRow_(rowValues, ctx.indices),
      automation: automation
    };
  } catch (e) {
        try { if (typeof _logError_ === 'function') _logError_('MEDIUM', 'transitionJob', e, {source: 'JOB_STATE'}); } catch(_le) {}
    return { success: false, error: e.toString() };
  } finally {
    try { lock.releaseLock(); } catch (releaseErr) {}
  }
}

function generateJobQR(jobId) {
  jobId = String(jobId || '').trim();
  if (!jobId) return { success: false, error: 'jobId is required' };

  var baseUrl = getWebAppBaseUrl_();
  var targetUrl = baseUrl ? buildWebAppUrl_(baseUrl, { view: 'jobqr', jobId: jobId }) : '';
  var qrImageUrl = targetUrl ? 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=' + encodeURIComponent(targetUrl) : '';

  return {
    success: true,
    job_id: jobId,
    web_app_url: targetUrl,
    qr_image_url: qrImageUrl,
    warning: targetUrl ? '' : 'ยังไม่พบ URL ของ Web App กรุณา Deploy Web App หรือกำหนด Script Property ชื่อ WEB_APP_URL'
  };
}

function getJobWebAppPayload(jobId) {
  var detail = getJobDetailById_(jobId);
  if (!detail.success) return detail;

  var timelineData = getJobTimelineV55_(jobId);
  var qrData = generateJobQR(jobId);

  return {
    success: true,
    job: detail.job,
    timeline: timelineData.timeline || [],
    qr: qrData,
    state_machine: getJobStateConfig().states,
    timestamp: Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd HH:mm:ss')
  };
}

function getJobTimelineV55_(jobId) {
  try {
    jobId = String(jobId || '').trim();
    if (!jobId) return { success: false, error: 'jobId is required', timeline: [] };

    var jobDetail = getJobDetailById_(jobId);
    if (!jobDetail.success) return { success: false, error: jobDetail.error, timeline: [] };

    var ss = getComphoneSheet();
    var logSheet = findSheetByName(ss, 'DB_JOB_LOGS');
    var timeline = [];

    if (logSheet && logSheet.getLastRow() > 1) {
      var rows = logSheet.getDataRange().getValues();
      for (var i = 1; i < rows.length; i++) {
        if (String(rows[i][1] || '') === jobId) {
          var rawTimestamp = rows[i][5];
          var displayTimestamp = formatTimelineTimestamp_(rawTimestamp);
          timeline.push({
            log_id: String(rows[i][0] || ''),
            job_id: jobId,
            from_status: String(rows[i][2] || ''),
            to_status: String(rows[i][3] || ''),
            changed_by: String(rows[i][4] || ''),
            timestamp: displayTimestamp,
            note: String(rows[i][6] || ''),
            ts: displayTimestamp,
            user: String(rows[i][4] || ''),
            action: 'STATUS_CHANGE',
            detail: [String(rows[i][2] || ''), String(rows[i][3] || '')].join(' -> ')
          });
        }
      }
    }

    if (timeline.length === 0) {
      var legacySheet = findSheetByName(ss, typeof LOG_SHEET !== 'undefined' ? LOG_SHEET : 'DB_ACTIVITY_LOG');
      if (legacySheet && legacySheet.getLastRow() > 1) {
        var legacyRows = legacySheet.getDataRange().getValues();
        for (var j = 1; j < legacyRows.length; j++) {
          var detail = String(legacyRows[j][3] || '');
          if (detail.indexOf(jobId) > -1) {
            var legacyTs = formatTimelineTimestamp_(legacyRows[j][0]);
            timeline.push({
              log_id: 'LEGACY-' + j,
              job_id: jobId,
              from_status: '',
              to_status: String(jobDetail.job.status_label || ''),
              changed_by: String(legacyRows[j][2] || ''),
              timestamp: legacyTs,
              note: detail,
              ts: legacyTs,
              user: String(legacyRows[j][2] || ''),
              action: String(legacyRows[j][1] || ''),
              detail: detail
            });
          }
        }
      }
    }

    timeline.sort(function (a, b) {
      return timelineTimestampToMillis_(b.timestamp) - timelineTimestampToMillis_(a.timestamp);
    });

    return {
      success: true,
      job: jobDetail.job,
      timeline: timeline
    };
  } catch (e) {
    return { success: false, error: e.toString(), timeline: [] };
  }
}

function getJobDetailById_(jobId) {
  try {
    jobId = String(jobId || '').trim();
    if (!jobId) return { success: false, error: 'jobId is required' };

    var ss = getComphoneSheet();
    if (!ss) return { success: false, error: 'Spreadsheet not found' };
    var sh = findSheetByName(ss, 'DBJOBS');
    if (!sh) return { success: false, error: 'DBJOBS not found' };

    var ctx = getJobSheetContext_(sh);
    var rowIndex = findJobRowIndexById_(sh, ctx, jobId);
    if (rowIndex < 0) return { success: false, error: 'ไม่พบ Job ID: ' + jobId };

    var row = sh.getRange(rowIndex, 1, 1, ctx.headers.length).getValues()[0];
    var job = buildJobObjectFromRow_(row, ctx.indices);
    job.allowed_next = getAllowedTransitionObjects_(job.current_status_code);
    job.transitions_count = job.allowed_next.length;

    return { success: true, job: job, row_index: rowIndex };
  } catch (e) {
        try { if (typeof _logError_ === 'function') _logError_('MEDIUM', 'getJobDetailById_', e, {source: 'JOB_STATE'}); } catch(_le) {}
    return { success: false, error: e.toString() };
  }
}

function getJobSheetContext_(sheet) {
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  return {
    headers: headers,
    indices: {
      jobId: findHeaderIndex_(headers, ['JobID', 'Job_ID', 'jobid', 'job_id']),
      customer: findHeaderIndex_(headers, ['ชื่อลูกค้า', 'Customer_Name', 'Customer', 'customer']),
      symptom: findHeaderIndex_(headers, ['อาการ', 'Symptom', 'Issue', 'symptom']),
      statusText: findHeaderIndex_(headers, ['สถานะ', 'Status', 'status']),
      tech: findHeaderIndex_(headers, ['ช่างที่รับงาน', 'Technician', 'tech', 'ช่าง']),
      gps: findHeaderIndex_(headers, ['พิกัด GPS', 'GPS', 'Location', 'gps']),
      createdAt: findHeaderIndex_(headers, ['เวลาสร้าง', 'Created_At', 'CreatedAt', 'created_at']),
      updatedAt: findHeaderIndex_(headers, ['เวลาอัปเดต', 'Updated_At', 'UpdatedAt', 'updated_at']),
      note: findHeaderIndex_(headers, ['หมายเหตุ', 'Note', 'note']),
      folderUrl: findHeaderIndex_(headers, ['folder_url', 'ลิงก์โฟเดอร์งาน', 'ลิงก์รูปภาพ', 'Folder_URL']),
      currentStatusCode: findHeaderIndex_(headers, ['Current_Status_Code', 'current_status_code']),
      voiceSummaryLog: findHeaderIndex_(headers, ['Voice_Summary_Log', 'voice_summary_log']),
      toolChecklistStatus: findHeaderIndex_(headers, ['Tool_Checklist_Status', 'tool_checklist_status'])
    }
  };
}

function buildJobObjectFromRow_(row, indices) {
  var statusCode = inferCurrentStatusCodeFromRow_(row, indices);
  return {
    job_id: safeCellValue_(row, indices.jobId),
    customer_name: safeCellValue_(row, indices.customer),
    symptom: safeCellValue_(row, indices.symptom),
    status_label: JOB_STATUS_MAP[statusCode] || safeCellValue_(row, indices.statusText),
    current_status_code: statusCode,
    technician: safeCellValue_(row, indices.tech),
    gps: safeCellValue_(row, indices.gps),
    created_at: formatTimelineTimestamp_(safeCellRaw_(row, indices.createdAt)),
    updated_at: formatTimelineTimestamp_(safeCellRaw_(row, indices.updatedAt)),
    note: safeCellValue_(row, indices.note),
    folder_url: safeCellValue_(row, indices.folderUrl)
  };
}

function appendJobStatusLog_(jobId, fromStatus, toStatus, changedBy, note) {
  try {
    var ss = getComphoneSheet();
    if (!ss) return;
    var sh = ensureJobLogSheet_(ss);
    sh.appendRow([
      generateJobLogId_(),
      jobId,
      fromStatus || '',
      toStatus || '',
      changedBy || 'SYSTEM',
      new Date(),
      note || ''
    ]);
  } catch (e) {
    Logger.log('appendJobStatusLog_ error: ' + e);
  }
}

function runJobTransitionAutomation_(jobId, fromStatusCode, toStatusCode, options) {
  var result = {
    triggered: false,
    qc: null,
    customer_sync: null,
    billing: null,
    payment: null,
    notifications: []
  };

  try {
    if ((Number(toStatusCode) === 8 || Number(toStatusCode) === 12) && typeof syncCustomerFromJob === 'function') {
      result.customer_sync = syncCustomerFromJob(jobId);
    }

    if (Number(toStatusCode) === 8 && typeof runJobCompletionQC === 'function') {
      result.triggered = true;
      result.qc = runJobCompletionQC(jobId, {
        source: 'JobStateMachine',
        transition_from: fromStatusCode,
        transition_to: toStatusCode,
        changed_by: options && (options.changed_by || options.user || 'SYSTEM')
      });
    }

    if (Number(toStatusCode) === 10 && typeof autoGenerateBillingForJob === 'function') {
      result.triggered = true;
      result.billing = autoGenerateBillingForJob(jobId, options || {});
      if (typeof notifyBillingReady === 'function') {
        result.notifications.push(notifyBillingReady({
          job_id: jobId,
          changed_by: options && (options.changed_by || options.user || 'SYSTEM')
        }));
      }
    }

    // เมื่อปิดงาน (status 12) สร้าง After-Sales record อัตโนมัติ
    if (Number(toStatusCode) === 12 && typeof createAfterSalesRecord === 'function') {
      result.triggered = true;
      try { result.after_sales = createAfterSalesRecord(jobId); } catch(asErr) { result.after_sales = { success: false, error: asErr.toString() }; }
    }

    if (Number(toStatusCode) === 11 && options && options.source !== 'BillingManager' && typeof markBillingPaid === 'function') {
      result.triggered = true;
      result.payment = markBillingPaid({
        job_id: jobId,
        amount_paid: options.amount_paid || options.amount || '',
        transaction_ref: options.transaction_ref || options.ref || '',
        slip_image_url: options.slip_image_url || options.slip_url || '',
        changed_by: options.changed_by || options.user || 'SYSTEM',
        skip_job_transition: true,
        generate_receipt: options.generate_receipt !== false
      });
      if (typeof notifyPaymentReceived === 'function') {
        result.notifications.push(notifyPaymentReceived({
          job_id: jobId,
          changed_by: options.changed_by || options.user || 'SYSTEM'
        }));
      }
    }
  } catch (e) {
    result.qc = result.qc || { success: false, error: e.toString() };
  }

  return result;
}

function ensureJobLogSheet_(ss) {
  var sh = findSheetByName(ss, 'DB_JOB_LOGS');
  if (!sh) {
    sh = ss.insertSheet('DB_JOB_LOGS');
    sh.getRange(1, 1, 1, 7).setValues([['Log_ID', 'Job_ID', 'Status_From', 'Status_To', 'Changed_By', 'Timestamp', 'Note']]);
  } else if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, 7).setValues([['Log_ID', 'Job_ID', 'Status_From', 'Status_To', 'Changed_By', 'Timestamp', 'Note']]);
  }
  return sh;
}

function generateJobLogId_() {
  return 'JL' + Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyyMMddHHmmss') + '-' + Math.floor(Math.random() * 900 + 100);
}

function getAllowedTransitionObjects_(statusCode) {
  var codes = JOB_ALLOWED_TRANSITIONS[Number(statusCode) || 0] || [];
  var out = [];
  for (var i = 0; i < codes.length; i++) {
    out.push({ code: codes[i], label: JOB_STATUS_MAP[codes[i]] || '' });
  }
  return out;
}

function inferCurrentStatusCodeFromRow_(row, indices) {
  var codeFromColumn = normalizeStatusCode_(safeCellRaw_(row, indices.currentStatusCode));
  if (JOB_STATUS_MAP[codeFromColumn]) return codeFromColumn;
  var codeFromStatus = normalizeStatusCode_(safeCellRaw_(row, indices.statusText));
  if (JOB_STATUS_MAP[codeFromStatus]) return codeFromStatus;
  return 1;
}

function normalizeStatusCode_(value) {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return Math.round(value);
  var text = String(value).trim();
  if (!text) return 0;
  if (/^\d+$/.test(text)) return parseInt(text, 10);
  var lower = text.toLowerCase();
  return JOB_STATUS_ALIASES[text] || JOB_STATUS_ALIASES[lower] || 0;
}

function generateNextJobId_(sheet, jobIdIndex) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return 'J0001';
  var values = sheet.getRange(2, (jobIdIndex > -1 ? jobIdIndex : 0) + 1, lastRow - 1, 1).getValues();
  var maxId = 0;
  for (var i = 0; i < values.length; i++) {
    var match = String(values[i][0] || '').match(/J(\d+)/i);
    if (match) maxId = Math.max(maxId, parseInt(match[1], 10));
  }
  return 'J' + String(maxId + 1).padStart(4, '0');
}

function findJobRowIndexById_(sheet, ctx, jobId) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;
  var values = sheet.getRange(2, (ctx.indices.jobId > -1 ? ctx.indices.jobId : 0) + 1, lastRow - 1, 1).getValues();
  for (var i = 0; i < values.length; i++) {
    if (String(values[i][0] || '') === String(jobId)) return i + 2;
  }
  return -1;
}

function findHeaderIndex_(headers, candidates) {
  var lowerCandidates = [];
  for (var i = 0; i < candidates.length; i++) lowerCandidates.push(String(candidates[i]).toLowerCase());

  for (var j = 0; j < headers.length; j++) {
    var exact = String(headers[j] || '').trim();
    if (candidates.indexOf(exact) > -1) return j;
  }

  for (var k = 0; k < headers.length; k++) {
    var lowerHeader = String(headers[k] || '').trim().toLowerCase();
    if (lowerCandidates.indexOf(lowerHeader) > -1) return k;
  }

  for (var h = 0; h < headers.length; h++) {
    var headerText = String(headers[h] || '').trim().toLowerCase();
    for (var c = 0; c < lowerCandidates.length; c++) {
      if (headerText.indexOf(lowerCandidates[c]) > -1 || lowerCandidates[c].indexOf(headerText) > -1) return h;
    }
  }
  return -1;
}

function createEmptyRow_(length) {
  var row = [];
  for (var i = 0; i < length; i++) row.push('');
  return row;
}

function setIfIndex_(row, index, value) {
  if (index > -1) row[index] = value;
}

function safeCellRaw_(row, index) {
  return index > -1 ? row[index] : '';
}

function safeCellValue_(row, index) {
  var value = safeCellRaw_(row, index);
  if (value === null || value === undefined) return '';
  return value instanceof Date ? formatTimelineTimestamp_(value) : String(value);
}

function formatTimelineTimestamp_(value) {
  if (!value) return '';
  if (value instanceof Date) return Utilities.formatDate(value, 'Asia/Bangkok', 'yyyy-MM-dd HH:mm:ss');
  var date = new Date(value);
  if (!isNaN(date.getTime())) return Utilities.formatDate(date, 'Asia/Bangkok', 'yyyy-MM-dd HH:mm:ss');
  return String(value);
}

function timelineTimestampToMillis_(value) {
  if (!value) return 0;
  var date = new Date(value);
  if (!isNaN(date.getTime())) return date.getTime();
  return 0;
}

function buildGpsValue_(data) {
  data = data || {};
  if (data.gps) return String(data.gps);
  if (data.lat && data.lng) return String(data.lat) + ',' + String(data.lng);
  if (data.latitude && data.longitude) return String(data.latitude) + ',' + String(data.longitude);
  return '';
}

function getWebAppBaseUrl_() {
  var configuredUrl = '';
  try { configuredUrl = getConfig('WEB_APP_URL') || ''; } catch (e) {}
  if (configuredUrl) return configuredUrl;
  try {
    var runtimeUrl = ScriptApp.getService().getUrl();
    if (runtimeUrl) return runtimeUrl;
  } catch (e2) {}
  return '';
}

function buildWebAppUrl_(baseUrl, params) {
  var query = [];
  for (var key in params) {
    if (params.hasOwnProperty(key) && params[key] !== '' && params[key] !== null && params[key] !== undefined) {
      query.push(encodeURIComponent(key) + '=' + encodeURIComponent(params[key]));
    }
  }
  return baseUrl + (baseUrl.indexOf('?') > -1 ? '&' : '?') + query.join('&');
}
