// ============================================================
// WarrantyManager.gs — Warranty Management System
// COMPHONE SUPER APP v5.9.0-phase31a
// ============================================================
//
// TASK 6: Warranty Management — UI + Logic เชื่อม AfterSales
//
// ทุก action เขียน Audit Log ตาม RULE 5
// ทุกค่า Config ใช้ getConfig() ตาม RULE 4
// ============================================================

var WARRANTY_SHEET = 'DB_WARRANTY';
var WARRANTY_HEADERS = [
  'Warranty_ID', 'Job_ID', 'Customer_ID', 'Customer_Name', 'Phone',
  'Device_Model', 'Service_Type', 'Parts_Used', 'Warranty_Days',
  'Start_Date', 'End_Date', 'Status', 'Claim_Count',
  'Last_Claim_Date', 'Last_Claim_Note', 'Warranty_PDF_URL',
  'Created_By', 'Created_At', 'Updated_At', 'Notes'
];

var WARRANTY_STATUS = {
  ACTIVE:   'ACTIVE',
  EXPIRED:  'EXPIRED',
  CLAIMED:  'CLAIMED',
  VOIDED:   'VOIDED'
};

// ============================================================
// 🔧 createWarranty(data)
// ============================================================
// data: { job_id, customer_name, phone, device_model,
//         service_type, parts_used, warranty_days, user }
// ============================================================
function createWarranty(data) {
  try {
    data = data || {};
    var jobId = String(data.job_id || data.jobId || '').trim();
    if (!jobId) return { success: false, error: 'job_id is required' };

    var ss = getComphoneSheet();
    if (!ss) return { success: false, error: 'Spreadsheet not found' };
    var sh = ensureWarrantySheet_(ss);

    // ตรวจว่ามีอยู่แล้วหรือไม่
    var existing = findWarrantyByJobId_(sh, jobId);
    if (existing) return { success: false, error: 'Warranty already exists for job_id: ' + jobId, warranty: existing };

    var now          = new Date();
    var warrantyDays = parseInt(data.warranty_days || getConfig('DEFAULT_WARRANTY_DAYS', 90), 10);
    var startDate    = now;
    var endDate      = new Date(now.getTime() + warrantyDays * 24 * 60 * 60 * 1000);
    var warrantyId   = 'WR' + Utilities.formatDate(now, 'Asia/Bangkok', 'yyyyMMddHHmmss');

    // ดึงข้อมูลจาก Job ถ้าไม่ได้ส่งมา
    var customerName = data.customer_name || '';
    var phone        = data.phone || '';
    var deviceModel  = data.device_model || '';
    var serviceType  = data.service_type || 'ซ่อมทั่วไป';
    var partsUsed    = data.parts_used || '';

    if (!customerName || !deviceModel) {
      var jobDetail = typeof getJobDetailById_ === 'function' ? getJobDetailById_(jobId) : null;
      if (jobDetail && jobDetail.success && jobDetail.job) {
        var job = jobDetail.job;
        customerName = customerName || job.customer_name || '';
        phone        = phone || job.phone || '';
        deviceModel  = deviceModel || job.symptom || job.device || '';
        partsUsed    = partsUsed || job.parts_description || '';
      }
    }

    var row = [
      warrantyId,
      jobId,
      data.customer_id || '',
      customerName,
      phone,
      deviceModel,
      serviceType,
      partsUsed,
      warrantyDays,
      Utilities.formatDate(startDate, 'Asia/Bangkok', 'yyyy-MM-dd'),
      Utilities.formatDate(endDate, 'Asia/Bangkok', 'yyyy-MM-dd'),
      WARRANTY_STATUS.ACTIVE,
      0,
      '',
      '',
      '',
      data.user || 'SYSTEM',
      Utilities.formatDate(now, 'Asia/Bangkok', 'yyyy-MM-dd HH:mm:ss'),
      Utilities.formatDate(now, 'Asia/Bangkok', 'yyyy-MM-dd HH:mm:ss'),
      data.notes || ''
    ];
    sh.appendRow(row);

    // สร้าง PDF ใบรับประกัน
    var pdfResult = generateWarrantyPdfInternal_(warrantyId, jobId, {
      customer_name: customerName,
      phone:         phone,
      device_model:  deviceModel,
      service_type:  serviceType,
      parts_used:    partsUsed,
      warranty_days: warrantyDays,
      start_date:    Utilities.formatDate(startDate, 'Asia/Bangkok', 'dd/MM/') + (startDate.getFullYear() + 543),
      end_date:      Utilities.formatDate(endDate, 'Asia/Bangkok', 'dd/MM/') + (endDate.getFullYear() + 543)
    });

    if (pdfResult.success) {
      updateWarrantyField_(sh, warrantyId, 'Warranty_PDF_URL', pdfResult.file_url);
    }

    // สร้าง AfterSales record เชื่อมกัน
    if (typeof createAfterSalesRecord === 'function') {
      createAfterSalesRecord(jobId);
    }

    writeAuditLog('WARRANTY_CREATE', data.user || 'SYSTEM', warrantyId + ' job=' + jobId + ' days=' + warrantyDays, { result: 'success' });

    return {
      success:      true,
      warranty_id:  warrantyId,
      job_id:       jobId,
      start_date:   Utilities.formatDate(startDate, 'Asia/Bangkok', 'yyyy-MM-dd'),
      end_date:     Utilities.formatDate(endDate, 'Asia/Bangkok', 'yyyy-MM-dd'),
      warranty_days: warrantyDays,
      pdf_url:      pdfResult.success ? pdfResult.file_url : ''
    };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

// ============================================================
// 🔧 getWarrantyByJobId(data)
// ============================================================
function getWarrantyByJobId(data) {
  try {
    data = data || {};
    var jobId = String(data.job_id || data.jobId || '').trim();
    if (!jobId) return { success: false, error: 'job_id is required' };

    var ss = getComphoneSheet();
    if (!ss) return { success: false, error: 'Spreadsheet not found' };
    var sh = findSheetByName(ss, WARRANTY_SHEET);
    if (!sh || sh.getLastRow() < 2) return { success: false, error: 'No warranty records found' };

    var warranty = findWarrantyByJobId_(sh, jobId);
    if (!warranty) return { success: false, error: 'Warranty not found for job_id: ' + jobId };

    // อัปเดตสถานะอัตโนมัติถ้าหมดอายุ
    warranty = refreshWarrantyStatus_(sh, warranty);

    return { success: true, warranty: warranty };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

// ============================================================
// 🔧 listWarranties(data)
// ============================================================
// data: { status, customer_name, page, page_size }
// ============================================================
function listWarranties(data) {
  try {
    data = data || {};
    var ss = getComphoneSheet();
    if (!ss) return { success: false, error: 'Spreadsheet not found' };
    var sh = findSheetByName(ss, WARRANTY_SHEET);
    if (!sh || sh.getLastRow() < 2) return { success: true, warranties: [], total: 0 };

    var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    var rows    = sh.getRange(2, 1, sh.getLastRow() - 1, headers.length).getValues();
    var now     = new Date();

    var warranties = rows.map(function (row) {
      return buildWarrantyObject_(row, headers);
    }).filter(function (w) {
      if (!w.warranty_id) return false;
      // filter status
      if (data.status && w.status !== data.status) return false;
      // filter customer
      if (data.customer_name && w.customer_name.indexOf(data.customer_name) === -1) return false;
      return true;
    });

    // อัปเดตสถานะหมดอายุ
    warranties = warranties.map(function (w) {
      if (w.status === WARRANTY_STATUS.ACTIVE) {
        var endDate = new Date(w.end_date);
        if (!isNaN(endDate.getTime()) && endDate < now) {
          w.status = WARRANTY_STATUS.EXPIRED;
        }
      }
      return w;
    });

    // Pagination
    var pageSize = parseInt(data.page_size || 20, 10);
    var page     = parseInt(data.page || 1, 10);
    var total    = warranties.length;
    var start    = (page - 1) * pageSize;
    var paged    = warranties.slice(start, start + pageSize);

    return { success: true, warranties: paged, total: total, page: page, page_size: pageSize };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

// ============================================================
// 🔧 updateWarrantyStatus(data)
// ============================================================
// data: { warranty_id | job_id, status, claim_note, user }
// ============================================================
function updateWarrantyStatus(data) {
  try {
    data = data || {};
    var warrantyId = String(data.warranty_id || '').trim();
    var jobId      = String(data.job_id || '').trim();
    var newStatus  = String(data.status || '').toUpperCase();

    if (!WARRANTY_STATUS[newStatus]) return { success: false, error: 'Invalid status. Use: ACTIVE | EXPIRED | CLAIMED | VOIDED' };
    if (!warrantyId && !jobId) return { success: false, error: 'warranty_id or job_id is required' };

    var ss = getComphoneSheet();
    if (!ss) return { success: false, error: 'Spreadsheet not found' };
    var sh = findSheetByName(ss, WARRANTY_SHEET);
    if (!sh || sh.getLastRow() < 2) return { success: false, error: 'Warranty sheet not found' };

    var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    var rows    = sh.getRange(2, 1, sh.getLastRow() - 1, headers.length).getValues();
    var widIdx  = findHeaderIndex_(headers, ['Warranty_ID', 'warranty_id']);
    var jidIdx  = findHeaderIndex_(headers, ['Job_ID', 'job_id']);
    var stIdx   = findHeaderIndex_(headers, ['Status', 'status']);
    var claimCntIdx  = findHeaderIndex_(headers, ['Claim_Count', 'claim_count']);
    var claimDateIdx = findHeaderIndex_(headers, ['Last_Claim_Date', 'last_claim_date']);
    var claimNoteIdx = findHeaderIndex_(headers, ['Last_Claim_Note', 'last_claim_note']);
    var updIdx       = findHeaderIndex_(headers, ['Updated_At', 'updated_at']);

    var now = new Date();
    var found = false;
    for (var i = 0; i < rows.length; i++) {
      var wid = String(rows[i][widIdx] || '').trim();
      var jid = String(rows[i][jidIdx] || '').trim();
      if ((warrantyId && wid === warrantyId) || (jobId && jid === jobId)) {
        rows[i][stIdx]   = newStatus;
        rows[i][updIdx]  = Utilities.formatDate(now, 'Asia/Bangkok', 'yyyy-MM-dd HH:mm:ss');
        if (newStatus === WARRANTY_STATUS.CLAIMED) {
          rows[i][claimCntIdx]  = (parseInt(rows[i][claimCntIdx] || 0, 10) + 1);
          rows[i][claimDateIdx] = Utilities.formatDate(now, 'Asia/Bangkok', 'yyyy-MM-dd');
          rows[i][claimNoteIdx] = data.claim_note || '';
        }
        sh.getRange(i + 2, 1, 1, headers.length).setValues([rows[i]]);
        found = true;

        writeAuditLog('WARRANTY_STATUS_UPDATE', data.user || 'SYSTEM',
          (warrantyId || jobId) + ' → ' + newStatus, { result: 'success' });
        break;
      }
    }

    if (!found) return { success: false, error: 'Warranty not found' };
    return { success: true, status: newStatus };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

// ============================================================
// 🔧 getWarrantyDue(data)
// ============================================================
// ดึงรายการที่ใกล้หมดอายุภายใน X วัน
// data: { days }  default = 7
// ============================================================
function getWarrantyDue(data) {
  try {
    data = data || {};
    var days = parseInt(data.days || 7, 10);
    var ss   = getComphoneSheet();
    if (!ss) return { success: false, error: 'Spreadsheet not found' };
    var sh   = findSheetByName(ss, WARRANTY_SHEET);
    if (!sh || sh.getLastRow() < 2) return { success: true, warranties: [] };

    var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    var rows    = sh.getRange(2, 1, sh.getLastRow() - 1, headers.length).getValues();
    var now     = new Date();
    var cutoff  = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    var due = rows.map(function (row) {
      return buildWarrantyObject_(row, headers);
    }).filter(function (w) {
      if (w.status !== WARRANTY_STATUS.ACTIVE) return false;
      var endDate = new Date(w.end_date);
      return !isNaN(endDate.getTime()) && endDate >= now && endDate <= cutoff;
    });

    return { success: true, warranties: due, days_ahead: days };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

// ============================================================
// 🔧 generateWarrantyPdfInternal_(warrantyId, jobId, info)
// ============================================================
function generateWarrantyPdfInternal_(warrantyId, jobId, info) {
  try {
    info = info || {};
    var companyName = getConfig('COMPANY_NAME', 'ร้านคอมโฟน');
    var companyPhone = getConfig('COMPANY_PHONE', '-');
    var html = buildWarrantyHtml_({
      warrantyId:   warrantyId,
      jobId:        jobId,
      companyName:  companyName,
      companyPhone: companyPhone,
      info:         info
    });

    var folder  = getReceiptFolderSafe_();
    var pdfBlob = Utilities.newBlob(html, 'text/html', warrantyId + '.html')
                    .getAs(MimeType.PDF).setName(warrantyId + '.pdf');
    var pdfFile = folder.createFile(pdfBlob);

    // อัปเดต warranty_url ใน DBJOBS ด้วย
    try {
      var ss = getComphoneSheet();
      if (ss) {
        var jobSh = findSheetByName(ss, 'DBJOBS');
        if (jobSh && jobSh.getLastRow() > 1) {
          var jHeaders = jobSh.getRange(1, 1, 1, jobSh.getLastColumn()).getValues()[0];
          var jidIdx   = findHeaderIndex_(jHeaders, ['JobID', 'Job_ID']);
          var wUrlIdx  = findHeaderIndex_(jHeaders, ['warranty_url']);
          if (jidIdx > -1 && wUrlIdx > -1) {
            var jRows = jobSh.getRange(2, 1, jobSh.getLastRow() - 1, jHeaders.length).getValues();
            for (var i = 0; i < jRows.length; i++) {
              if (String(jRows[i][jidIdx] || '').trim() === String(jobId).trim()) {
                jobSh.getRange(i + 2, wUrlIdx + 1).setValue(pdfFile.getUrl());
                break;
              }
            }
          }
        }
      }
    } catch (e2) { Logger.log('updateJobWarrantyUrl error: ' + e2); }

    return { success: true, file_id: pdfFile.getId(), file_url: pdfFile.getUrl() };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

function buildWarrantyHtml_(opts) {
  var info = opts.info || {};
  return '<!DOCTYPE html><html lang="th"><head><meta charset="UTF-8">' +
    '<style>' +
    'body{font-family:\'Sarabun\',\'TH Sarabun New\',sans-serif;font-size:14px;margin:30px;color:#222;}' +
    'h1{font-size:22px;text-align:center;color:#1a73e8;}' +
    '.subtitle{text-align:center;font-size:13px;color:#555;margin-bottom:20px;}' +
    'table{width:100%;border-collapse:collapse;margin-bottom:16px;}' +
    'th,td{border:1px solid #ccc;padding:8px 12px;font-size:13px;}' +
    'th{background:#e8f0fe;font-weight:bold;width:35%;}' +
    '.highlight{background:#e8f5e9;font-weight:bold;font-size:15px;}' +
    '.footer{margin-top:30px;font-size:12px;color:#888;text-align:center;border-top:1px solid #ccc;padding-top:10px;}' +
    '.seal{text-align:center;margin-top:20px;font-size:40px;}' +
    '</style></head><body>' +
    '<h1>🛡️ ใบรับประกันสินค้า/บริการ</h1>' +
    '<div class="subtitle">WARRANTY CERTIFICATE — ' + opts.companyName + '</div>' +
    '<table>' +
    '<tr><th>เลขที่ใบรับประกัน</th><td><b>' + opts.warrantyId + '</b></td></tr>' +
    '<tr><th>Job ID</th><td>' + opts.jobId + '</td></tr>' +
    '<tr><th>ชื่อลูกค้า</th><td>' + (info.customer_name || '-') + '</td></tr>' +
    '<tr><th>เบอร์โทร</th><td>' + (info.phone || '-') + '</td></tr>' +
    '<tr><th>อุปกรณ์/รุ่น</th><td>' + (info.device_model || '-') + '</td></tr>' +
    '<tr><th>ประเภทงาน</th><td>' + (info.service_type || '-') + '</td></tr>' +
    '<tr><th>อะไหล่ที่ใช้</th><td>' + (info.parts_used || '-') + '</td></tr>' +
    '<tr><th>ระยะเวลารับประกัน</th><td class="highlight">' + (info.warranty_days || 90) + ' วัน</td></tr>' +
    '<tr><th>วันที่เริ่มรับประกัน</th><td>' + (info.start_date || '-') + '</td></tr>' +
    '<tr><th>วันที่หมดอายุ</th><td class="highlight" style="color:#d32f2f;">' + (info.end_date || '-') + '</td></tr>' +
    '</table>' +
    '<p style="font-size:12px;color:#555;">* การรับประกันครอบคลุมเฉพาะงานซ่อมและอะไหล่ที่ระบุข้างต้น ไม่รวมความเสียหายจากอุบัติเหตุหรือการใช้งานผิดวิธี</p>' +
    '<div class="seal">🏪</div>' +
    '<div class="footer">' + opts.companyName + ' | โทร: ' + opts.companyPhone + ' | ออกโดยระบบ COMPHONE SUPER APP V5.5</div>' +
    '</body></html>';
}

// ============================================================
// 🔧 Sheet Helpers
// ============================================================

function ensureWarrantySheet_(ss) {
  var sh = findSheetByName(ss, WARRANTY_SHEET);
  if (!sh) {
    sh = ss.insertSheet(WARRANTY_SHEET);
    sh.getRange(1, 1, 1, WARRANTY_HEADERS.length).setValues([WARRANTY_HEADERS]);
    return sh;
  }
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, WARRANTY_HEADERS.length).setValues([WARRANTY_HEADERS]);
    return sh;
  }
  var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var missing = WARRANTY_HEADERS.filter(function (h) {
    return findHeaderIndex_(headers, [h]) === -1;
  });
  if (missing.length > 0) {
    sh.getRange(1, headers.length + 1, 1, missing.length).setValues([missing]);
  }
  return sh;
}

function findWarrantyByJobId_(sh, jobId) {
  if (!sh || sh.getLastRow() < 2) return null;
  var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var rows    = sh.getRange(2, 1, sh.getLastRow() - 1, headers.length).getValues();
  var jidIdx  = findHeaderIndex_(headers, ['Job_ID', 'job_id']);
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i][jidIdx] || '').trim() === String(jobId).trim()) {
      return buildWarrantyObject_(rows[i], headers);
    }
  }
  return null;
}

function buildWarrantyObject_(row, headers) {
  var obj = {};
  WARRANTY_HEADERS.forEach(function (h) {
    var idx = findHeaderIndex_(headers, [h]);
    obj[h.toLowerCase()] = idx > -1 ? row[idx] : '';
  });
  return obj;
}

function updateWarrantyField_(sh, warrantyId, fieldName, value) {
  if (!sh || sh.getLastRow() < 2) return;
  var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var rows    = sh.getRange(2, 1, sh.getLastRow() - 1, headers.length).getValues();
  var widIdx  = findHeaderIndex_(headers, ['Warranty_ID', 'warranty_id']);
  var fIdx    = findHeaderIndex_(headers, [fieldName]);
  if (fIdx < 0) return;
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i][widIdx] || '').trim() === String(warrantyId).trim()) {
      sh.getRange(i + 2, fIdx + 1).setValue(value);
      break;
    }
  }
}

function refreshWarrantyStatus_(sh, warranty) {
  if (warranty.status === WARRANTY_STATUS.ACTIVE) {
    var endDate = new Date(warranty.end_date);
    if (!isNaN(endDate.getTime()) && endDate < new Date()) {
      warranty.status = WARRANTY_STATUS.EXPIRED;
      updateWarrantyField_(sh, warranty.warranty_id, 'Status', WARRANTY_STATUS.EXPIRED);
    }
  }
  return warranty;
}

// getReceiptFolderSafe_ consolidated to Utils.gs (PHMP v1 dedup)
