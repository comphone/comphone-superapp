// ============================================================
// COMPHONE SUPER APP v5.9.0-phase31a
// ============================================================
// JobsHandler.gs - Job CRUD, Photos, Folders
// ============================================================

function openJob(data) {
  data = data || {};
  var replay = getIdempotentReplay_('openJob', data.client_request_id);
  if (replay) return replay;
  if (!data.customer_name && data.name) data.customer_name = data.name;
  if (!data.changed_by) data.changed_by = data.user || data.technician || 'SYSTEM||LINE';
  if (!data.current_status_code && !data.status_code) {
    data.current_status_code = normalizeStatusCode_(data.status) || 1;
  }
  var result = createJob(data);
  rememberIdempotentResult_('openJob', data.client_request_id, result);
  return result;
}

function checkJobs(data) {
  try {
    data = data || {};
    var search = String(data.search || '').toLowerCase();
    var limit = Math.max(1, parseInt(data.limit || 50, 10) || 50);
    var cacheKey = 'jobs:check:' + search + ':' + limit;
    var cache = CacheService.getScriptCache();
    var cached = cache.get(cacheKey);
    if (cached) {
      var parsed = JSON.parse(cached);
      parsed.cached = true;
      return parsed;
    }

    var ss = getComphoneSheet();
    var sh = findSheetByName(ss, 'DBJOBS');
    if (!sh) return { error: 'DBJOBS not found' };
    var all = sh.getDataRange().getValues();
    var sc = 3, cc = 9, fc = 12;
    var headers = all[0];
    for (var hi = 0; hi < headers.length; hi++) {
      var h = String(headers[hi]);
      if (h.indexOf('สถานะ') > -1 || h.indexOf('สถาน') > -1) sc = hi;
      if (h.indexOf('เวลาสร้าง') > -1) cc = hi;
      if (h.indexOf('folder') > -1 || h.indexOf('ลิงก์โฟลเดอร์') > -1) fc = hi;
    }
    var results = [];
    for (var i = all.length - 1; i >= 1; i--) {
      var j = all[i];
      if (!search || String(j[0]).toLowerCase().indexOf(search) > -1 || String(j[1]).toLowerCase().indexOf(search) > -1 || String(j[4] || '').toLowerCase().indexOf(search) > -1) {
        var created = '-';
        try { if (j[cc] && j[cc] instanceof Date) created = Utilities.formatDate(j[cc], 'Asia/Bangkok', 'dd/MM HH:mm'); } catch(e) {}
        results.push({ job_id: String(j[0]), customer: String(j[1]), symptom: String(j[2]), status: String(j[sc]), technician: String(j[4] || ''), folder_url: String(j[fc] || ''), created: created });
        if (results.length >= limit) break;
      }
    }
    var response = { success: true, count: results.length, jobs: results, cached: false };
    try { cache.put(cacheKey, JSON.stringify(response), 60); } catch (_cacheErr) {}
    return response;
  } catch (e) { return { error: e.toString() }; }
}

function getJobDetail(data) {
  data = data || {};
  var jobId = data.job_id || data.jobId || data.id || '';
  if (!jobId) return { success: false, error: 'job_id is required' };
  if (typeof getJobDetailById_ !== 'function') return { success: false, error: 'Job detail service not loaded' };
  return getJobDetailById_(jobId);
}

function deleteJob(data) {
  data = data || {};
  var jobId = String(data.job_id || data.jobId || data.id || '').trim();
  var confirmText = String(data.confirm || data.confirmation || '').trim();
  var reason = String(data.reason || '').trim();
  var user = String(data._auth_user || data.user || 'SYSTEM').trim();
  var role = String(data._auth_role || data.role || '').toLowerCase();

  if (!jobId) return { success: false, error: 'job_id is required' };
  if (confirmText !== 'DELETE_JOB') {
    return { success: false, error: 'DELETE_JOB confirmation is required' };
  }
  if (role && role !== 'admin' && role !== 'owner') {
    return { success: false, error: 'Admin access required' };
  }

  var lock = LockService.getScriptLock();
  try { lock.waitLock(10000); } catch (e) { return { success: false, error: 'Lock timeout' }; }
  try {
    var ss = getComphoneSheet();
    var sh = findSheetByName(ss, 'DBJOBS');
    if (!sh) return { success: false, error: 'DBJOBS not found' };
    var values = sh.getDataRange().getValues();
    if (values.length < 2) return { success: false, error: 'No jobs found' };

    var headers = values[0];
    var jobIdCol = findHeaderIndex_(headers, ['JobID', 'Job_ID', 'jobid', 'job_id']);
    if (jobIdCol < 0) jobIdCol = 0;

    var rowIndex = -1;
    for (var i = 1; i < values.length; i++) {
      if (String(values[i][jobIdCol] || '').trim() === jobId) {
        rowIndex = i + 1;
        break;
      }
    }
    if (rowIndex < 0) return { success: false, error: 'Job not found: ' + jobId };

    var row = sh.getRange(rowIndex, 1, 1, headers.length).getValues()[0];
    var archive = getOrCreateJobArchiveSheet_(ss, headers);
    archive.appendRow([
      Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd HH:mm:ss'),
      user || 'SYSTEM',
      role || '',
      reason || 'Deleted from COMPHONE PWA',
      JSON.stringify({ source_sheet: 'DBJOBS', source_row: rowIndex })
    ].concat(row));

    sh.deleteRow(rowIndex);
    try {
      writeAuditLog('DELETE_JOB', user || 'SYSTEM', 'Archived and deleted job ' + jobId + (reason ? ': ' + reason : ''), {
        role: role,
        job_id: jobId,
        result: 'ok'
      });
    } catch (_auditErr) {}

    return {
      success: true,
      job_id: jobId,
      archived: true,
      archive_sheet: 'DBJOBS_ARCHIVE',
      deleted: 1,
      message: 'Job archived and deleted'
    };
  } catch (e) {
    return { success: false, error: e.toString() };
  } finally {
    try { lock.releaseLock(); } catch (_unlockErr) {}
  }
}

function getOrCreateJobArchiveSheet_(ss, sourceHeaders) {
  var name = 'DBJOBS_ARCHIVE';
  var sh = findSheetByName(ss, name);
  var headers = ['archived_at', 'archived_by', 'archived_role', 'archive_reason', 'archive_meta'].concat(sourceHeaders || []);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    return sh;
  }
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  return sh;
}

// ────────────────────────────────────────────────────────────
// Sprint 194 — Job Archive Restore
// ────────────────────────────────────────────────────────────

function listJobArchive(data) {
  data = data || {};
  var role = String(data._auth_role || data.role || '').toLowerCase();
  if (role && role !== 'admin' && role !== 'owner') {
    return { success: false, error: 'Admin access required' };
  }
  try {
    var ss = getComphoneSheet();
    var sh = findSheetByName(ss, 'DBJOBS_ARCHIVE');
    if (!sh || sh.getLastRow() < 2) return { success: true, count: 0, archived_jobs: [] };
    var values = sh.getDataRange().getValues();
    var headers = values[0];
    var jobIdOffset = headers.indexOf('JobID');
    if (jobIdOffset < 0) jobIdOffset = headers.indexOf('Job_ID');
    var customerOffset = headers.indexOf('Customer_Name');
    if (customerOffset < 0) customerOffset = headers.indexOf('customer_name');
    var limit = Math.min(100, Math.max(1, parseInt(data.limit || 50, 10) || 50));
    var results = [];
    for (var i = values.length - 1; i >= 1 && results.length < limit; i--) {
      var row = values[i];
      var archivedAt = row[0] ? String(row[0]) : '';
      var archivedBy = row[1] ? String(row[1]) : '';
      var archiveReason = row[3] ? String(row[3]) : '';
      var jobId = jobIdOffset >= 0 ? String(row[jobIdOffset] || '') : '';
      var customer = customerOffset >= 0 ? String(row[customerOffset] || '') : '';
      results.push({
        row_index: i + 1,
        archived_at: archivedAt,
        archived_by: archivedBy,
        archive_reason: archiveReason,
        job_id: jobId,
        customer: customer
      });
    }
    return { success: true, count: results.length, archived_jobs: results };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

function previewJobRestore(data) {
  data = data || {};
  var jobId = String(data.job_id || data.jobId || '').trim();
  var role = String(data._auth_role || data.role || '').toLowerCase();
  if (!jobId) return { success: false, error: 'job_id is required' };
  if (role && role !== 'admin' && role !== 'owner') {
    return { success: false, error: 'Admin access required' };
  }
  try {
    var ss = getComphoneSheet();
    var archiveSh = findSheetByName(ss, 'DBJOBS_ARCHIVE');
    if (!archiveSh || archiveSh.getLastRow() < 2) {
      return { success: false, error: 'No archived jobs found' };
    }
    var archiveValues = archiveSh.getDataRange().getValues();
    var archiveHeaders = archiveValues[0];
    var jobIdOffset = archiveHeaders.indexOf('JobID');
    if (jobIdOffset < 0) jobIdOffset = archiveHeaders.indexOf('Job_ID');
    if (jobIdOffset < 0) jobIdOffset = 5;

    var candidateRow = null;
    var candidateRowIndex = -1;
    for (var i = archiveValues.length - 1; i >= 1; i--) {
      if (String(archiveValues[i][jobIdOffset] || '').trim() === jobId) {
        candidateRow = archiveValues[i];
        candidateRowIndex = i + 1;
        break;
      }
    }
    if (!candidateRow) {
      return { success: false, error: 'Archived job not found: ' + jobId };
    }

    var liveSh = findSheetByName(ss, 'DBJOBS');
    var duplicateExists = false;
    if (liveSh && liveSh.getLastRow() >= 2) {
      var liveValues = liveSh.getDataRange().getValues();
      var liveHeaders = liveValues[0];
      var liveJobIdCol = findHeaderIndex_(liveHeaders, ['JobID', 'Job_ID', 'jobid', 'job_id']);
      if (liveJobIdCol < 0) liveJobIdCol = 0;
      for (var j = 1; j < liveValues.length; j++) {
        if (String(liveValues[j][liveJobIdCol] || '').trim() === jobId) {
          duplicateExists = true;
          break;
        }
      }
    }

    var previewFields = {};
    for (var k = 5; k < archiveHeaders.length; k++) {
      if (archiveHeaders[k]) previewFields[archiveHeaders[k]] = candidateRow[k];
    }

    return {
      success: true,
      job_id: jobId,
      archive_row_index: candidateRowIndex,
      archived_at: String(candidateRow[0] || ''),
      archived_by: String(candidateRow[1] || ''),
      archive_reason: String(candidateRow[3] || ''),
      duplicate_exists: duplicateExists,
      can_restore: !duplicateExists,
      preview: previewFields
    };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

function restoreJob(data) {
  data = data || {};
  var jobId = String(data.job_id || data.jobId || '').trim();
  var confirmText = String(data.confirm || data.confirmation || '').trim();
  var reason = String(data.reason || '').trim();
  var user = String(data._auth_user || data.user || 'SYSTEM').trim();
  var role = String(data._auth_role || data.role || '').toLowerCase();

  if (!jobId) return { success: false, error: 'job_id is required' };
  if (confirmText !== 'RESTORE_JOB') {
    return { success: false, error: 'RESTORE_JOB confirmation is required' };
  }
  if (role && role !== 'admin' && role !== 'owner') {
    return { success: false, error: 'Admin access required' };
  }

  var lock = LockService.getScriptLock();
  try { lock.waitLock(10000); } catch (e) { return { success: false, error: 'Lock timeout' }; }
  try {
    var ss = getComphoneSheet();

    var liveSh = findSheetByName(ss, 'DBJOBS');
    if (!liveSh) return { success: false, error: 'DBJOBS not found' };
    var liveAll = liveSh.getDataRange().getValues();
    var liveHeaders = liveAll[0];
    var liveJobIdCol = findHeaderIndex_(liveHeaders, ['JobID', 'Job_ID', 'jobid', 'job_id']);
    if (liveJobIdCol < 0) liveJobIdCol = 0;
    for (var j = 1; j < liveAll.length; j++) {
      if (String(liveAll[j][liveJobIdCol] || '').trim() === jobId) {
        return { success: false, error: 'Job ' + jobId + ' already exists in DBJOBS — restore blocked to prevent overwrite' };
      }
    }

    var archiveSh = findSheetByName(ss, 'DBJOBS_ARCHIVE');
    if (!archiveSh || archiveSh.getLastRow() < 2) {
      return { success: false, error: 'No archived jobs found' };
    }
    var archiveValues = archiveSh.getDataRange().getValues();
    var archiveHeaders = archiveValues[0];
    var jobIdOffset = archiveHeaders.indexOf('JobID');
    if (jobIdOffset < 0) jobIdOffset = archiveHeaders.indexOf('Job_ID');
    if (jobIdOffset < 0) jobIdOffset = 5;

    var candidateRow = null;
    var candidateRowIndex = -1;
    for (var i = archiveValues.length - 1; i >= 1; i--) {
      if (String(archiveValues[i][jobIdOffset] || '').trim() === jobId) {
        candidateRow = archiveValues[i];
        candidateRowIndex = i + 1;
        break;
      }
    }
    if (!candidateRow) {
      return { success: false, error: 'Archived job not found: ' + jobId };
    }

    var jobRow = candidateRow.slice(5);
    liveSh.appendRow(jobRow);

    try {
      writeAuditLog('RESTORE_JOB', user || 'SYSTEM', 'Restored job ' + jobId + ' from DBJOBS_ARCHIVE' + (reason ? ': ' + reason : ''), {
        role: role,
        job_id: jobId,
        archive_row_index: candidateRowIndex,
        result: 'ok'
      });
    } catch (_auditErr) {}

    return {
      success: true,
      job_id: jobId,
      restored: true,
      restored_to: 'DBJOBS',
      message: 'Job restored from archive'
    };
  } catch (e) {
    return { success: false, error: e.toString() };
  } finally {
    try { lock.releaseLock(); } catch (_unlockErr) {}
  }
}

function completeJob(data) {
  var lock = LockService.getScriptLock();
  try { lock.waitLock(10000); } catch(e) { return { error: 'Lock timeout' }; }
  try {
    var ss = getComphoneSheet();
    var sh = findSheetByName(ss, 'DBJOBS');
    if (!sh) return { error: 'DBJOBS not found' };
    var all = sh.getDataRange().getValues();

    // Dynamic header lookup (instead of hardcoded column indices)
    var headers = all[0];
    var statusCol = 3, updateCol = 10;
    for (var hi = 0; hi < headers.length; hi++) {
      var h = String(headers[hi]);
      if (h.indexOf('สถานะ') > -1 || h.indexOf('สถาน') > -1) statusCol = hi;
      if (h.indexOf('เวลาอัปเดต') > -1 || h.indexOf('updated') > -1) updateCol = hi;
    }

    var jobId = data.job_id || '';

    // Move labor/total calculation to outer scope so it remains accessible
    var labor = Number(data.labor_cost || 0);
    var total = labor + Number(data.parts_cost || 0);

    for (var i = 1; i < all.length; i++) {
      if (String(all[i][0]) === String(jobId)) {
        var oldStatus = String(all[i][statusCol] || '');

        if (oldStatus !== 'Completed') {
          all[i][statusCol] = 'Completed';
          all[i][updateCol] = new Date();
          sh.getDataRange().setValues(all);

          // Auto-cut reserved stock or manual parts
          var cutResult = cutStockAuto(jobId);

          // If no reservations, use manual parts from data
          if (cutResult.success && cutResult.items.length === 0 && data.parts) {
            var invSh = findSheetByName(ss, 'DB_INVENTORY');
            if (invSh) {
              var partsArr = String(data.parts).split(',');
              var invAll = invSh.getDataRange().getValues();
              for (var pi = 0; pi < partsArr.length; pi++) {
                var psplit = partsArr[pi].split(':');
                var itemName = (psplit[0] || '').trim();
                var qty = parseInt(psplit[1]) || 1;
                for (var qi = 1; qi < invAll.length; qi++) {
                  if (String(invAll[qi][0]) === itemName || String(invAll[qi][1]) === itemName) {
                    invAll[qi][2] = Math.max(0, Number(invAll[qi][2]) - qty);
                  }
                }
              }
              invSh.getDataRange().setValues(invAll);
              cutResult.items = partsArr.map(function(p) {
                var s = p.split(':');
                return { code: (s[0] || '').trim(), qty: parseInt(s[1]) || 1 };
              });
            }
          }

          // Create billing via createBilling() with price lookup from DB_INVENTORY
          var billingResult = createBilling(jobId, data.parts || '', labor);

          // Auto Warranty PDF + send LINE push
          try {
            var warrantyResult = generateWarrantyPDF(jobId);
            if (warrantyResult && warrantyResult.success && warrantyResult.warrantyUrl) {
              sendLineNotify({
                message: '\ud83d\udee1\ufe0f ใบรับประกันอัตโนมัติ\n\n' +
                  '\ud83d\udccb งาน: ' + jobId + '\n' +
                  '\ud83d\udcb0 ยอดรวม: ' + (billingResult ? billingResult.total : total) + ' บาท\n' +
                  '\ud83d\udcc4 PDF: ' + warrantyResult.warrantyUrl + '\n' +
                  '\ud83d\udcc5 รับประกันถึง: ' + warrantyResult.warrantyEnd,
                room: 'TECHNICIAN'
              });
            }
          } catch(wErr) {
            Logger.log('WARRANTY_PDF auto error: ' + wErr);
          }

          // Log
          try {
            logActivity('JOB_CLOSE', 'SYSTEM||LINE', jobId + ' \u2014 รายได้: ' + (total || '0') + ' บาท');
          } catch(e) {
            Logger.log('LOG_ACTIVITY error: ' + e);
          }

          return {
            success: true,
            job_id: jobId,
            status: 'Completed',
            message: 'ปิดงานสำเร็จ!',
            stock: cutResult,
            warnings: cutResult.warnings || []
          };
        }

        return { success: true, job_id: jobId, status: 'Completed', message: 'งานนี้ปิดแล้ว' };
      }
    }
    return { error: 'ไม่พบ JobID: ' + jobId };
  } catch (e) {
    return { error: e.toString() };
  } finally {
    try { lock.releaseLock(); } catch(ex) {}
  }
}

function updateJobStatus(data) {
  data = data || {};
  var inferredTransition = normalizeStatusCode_(data.new_status || data.status_code || data.status);
  if (inferredTransition && JOB_STATUS_MAP[inferredTransition]) {
    return transitionJob(data.job_id || data.jobId || '', inferredTransition, data);
  }

  var lock = LockService.getScriptLock();
  try { lock.waitLock(10000); } catch(e) { return { error: 'Lock timeout' }; }
  try {
    var ss = getComphoneSheet();
    var sh = findSheetByName(ss, 'DBJOBS');
    if (!sh) return { error: 'DBJOBS not found' };
    var all = sh.getDataRange().getValues();

    // Dynamic header lookup
    var headers = all[0];
    var statusCol = 3, techCol = 4, gpsCol = 5, noteCol = 11, updateCol = 10;
    for (var hi = 0; hi < headers.length; hi++) {
      var h = String(headers[hi]);
      if (h.indexOf('สถานะ') > -1 || h.indexOf('สถาน') > -1) statusCol = hi;
      if (h.indexOf('ช่าง') > -1 || h.indexOf('tech') > -1 || h.toLowerCase() === 'technician') techCol = hi;
      if (h.indexOf('พิกัด') > -1 || h.indexOf('gps') > -1 || h.toLowerCase() === 'location') gpsCol = hi;
      if (h.indexOf('หมายเหตุ') > -1) noteCol = hi;
      if (h.indexOf('เวลาอัปเดต') > -1 || h.indexOf('updated') > -1) updateCol = hi;
    }

    var jobId = data.job_id || '';
    for (var i = 1; i < all.length; i++) {
      if (String(all[i][0]) === String(jobId)) {
        if (data.status) all[i][statusCol] = data.status;
        if (data.technician) all[i][techCol] = data.technician;
        if (data.lat && data.lng) all[i][gpsCol] = data.lat + ',' + data.lng;
        if (data.note) {
          all[i][noteCol] = (all[i][noteCol] ? all[i][noteCol] + '\n' : '') + new Date().toLocaleString('th-TH') + ': ' + data.note;
        }
        all[i][updateCol] = new Date();
        sh.getDataRange().setValues(all);
        return { success: true, job_id: jobId, status: all[i][statusCol], technician: all[i][techCol] || '' };
      }
    }
    return { error: 'ไม่พบ ' + jobId };
  } catch (e) { return { error: e.toString() }; }
  finally { try { lock.releaseLock(); } catch(ex) {} }
}

function updateJobById(jobId, data) {
  var lock = LockService.getScriptLock();
  try { lock.waitLock(10000); } catch(e) { return { error: 'Lock timeout' }; }
  try {
    var ss = getComphoneSheet();
    var sh = findSheetByName(ss, 'DBJOBS');
    if (!sh) return { error: 'DBJOBS not found' };
    var all = sh.getDataRange().getValues();
    for (var i=1; i < all.length; i++) {
      if (String(all[i][0]) === String(jobId)) {
        if (data.name) all[i][1] = data.name;
        if (data.symptom) all[i][2] = data.symptom;
        if (data.status) all[i][3] = data.status;
        if (data.tech) all[i][4] = data.tech;
        if (data.gps) all[i][5] = data.gps;
        all[i][10] = new Date();
        sh.getDataRange().setValues(all);
        return { success: true };
      }
    }
    return { error: 'ไม่พบ ' + jobId };
  } catch (e) { return { error: e.toString() }; }
  finally { try { lock.releaseLock(); } catch(ex) {} }
}

function getOrCreateJobFolder(data) {
  try {
    var jobId = data.job_id || '';
    var name = data.customer_name || 'Unknown';
    var phase = data.phase || '00_สำรวจ';
    var rootId = getConfig('ROOT_FOLDER_ID') || '1YRZRG9r1Y_jMHg2XFFKYjK4Hx-sW0Eq0';
    var root = DriveApp.getFolderById(rootId);
    var pf = root.getFoldersByName('02_SERVICE_PHOTOS');
    var photos = pf.hasNext() ? pf.next() : root.createFolder('02_SERVICE_PHOTOS');
    var phf = photos.getFoldersByName(phase);
    var phaseFolder = phf.hasNext() ? phf.next() : photos.createFolder(phase);
    var jname = jobId + '_' + name;
    var ex = phaseFolder.getFoldersByName(jname);
    var folder = ex.hasNext() ? ex.next() : phaseFolder.createFolder(jname);
    // Update DB
    var ss = getComphoneSheet();
    var sh = findSheetByName(ss, 'DBJOBS');
    if (sh) {
      var all = sh.getDataRange().getValues();
      for (var i = 1; i < all.length; i++) {
        if (String(all[i][0]) === String(jobId)) {
          while (all[i].length < 13) all[i].push('');
          all[i][12] = folder.getUrl();
          sh.getDataRange().setValues(all);
          break;
        }
      }
    }
    return { success: true, folder_url: folder.getUrl(), folder_id: folder.getId(), name: jname };
  } catch (e) { return { error: e.toString() }; }
}

function saveJobPhoto(data) {
  try {
    var fr = getOrCreateJobFolder(data);
    if (fr.error) return fr;
    var folder = DriveApp.getFolderById(fr.folder_id);
    var b64 = data.image_base64 || '';
    var fname = data.file_name || 'photo_' + Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyyMMdd_HHmmss') + '.jpg';
    var mime = data.mime_type || 'image/jpeg';
    var bytes = Utilities.base64Decode(b64);
    var blob = Utilities.newBlob(bytes, mime, fname);
    var file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return { success: true, file_url: file.getUrl(), download_url: 'https://drive.google.com/uc?id=' + file.getId() };
  } catch (e) { return { error: e.toString() }; }
}

function updatePhotoLink(data) {
  try {
    var ss = getComphoneSheet();
    var sh = findSheetByName(ss, 'DBJOBS');
    if (!sh) return { error: 'DBJOBS not found' };
    var all = sh.getDataRange().getValues();
    var photoUrl = data.photo_url || '';
    var folderUrl = data.folder_url || '';
    for (var i = 1; i < all.length; i++) {
      if (String(all[i][0]) === String(data.job_id)) {
        while (all[i].length < 13) all[i].push('');
        all[i][7] = (all[i][7] ? all[i][7] + '\n' : '') + photoUrl;
        if (folderUrl) all[i][12] = folderUrl;
        all[i][10] = new Date();
        sh.getDataRange().setValues(all);
        return { success: true };
      }
    }
    return { error: 'ไม่พบ' };
  } catch (e) { return { error: e.toString() }; }
}

function updateJobFolderLink(jobId, folderUrl) {
  try {
    var ss = getComphoneSheet();
    var sh = findSheetByName(ss, 'DBJOBS');
    if (!sh) return;
    var all = sh.getDataRange().getValues();
    for (var i = 1; i < all.length; i++) {
      if (String(all[i][0]) == jobId) {
        while (all[i].length < 13) all[i].push('');
        all[i][12] = folderUrl;
        sh.getDataRange().setValues(all);
        return;
      }
    }
  } catch (e) { Logger.log('updateJobFolderLink failed: ' + e); }
}

function cutStock(partsStr) {
  var ss = getComphoneSheet();
  var stockSheet = findSheetByName(ss, 'DB_INVENTORY');
  if (!stockSheet) return;
  var parts = partsStr.split(',');
  var allStock = stockSheet.getDataRange().getValues();
  for (var i = 0; i < parts.length; i++) {
    var split = parts[i].split(':');
    var item = split[0];
    var qty = parseInt(split[1]) || 1;
    for (var j = 1; j < allStock.length; j++) {
      if (String(allStock[j][0]) === item || String(allStock[j][1]) === item) {
        allStock[j][2] = Math.max(0, allStock[j][2] - qty);
      }
    }
  }
  stockSheet.getDataRange().setValues(allStock);
}

function createBilling(jobId, parts, labor) {
  var data = null;
  if (jobId && typeof jobId === 'object') {
    data = jobId;
    jobId = data.job_id || data.jobId || '';
    if (typeof data.parts === 'string' && data.parts.charAt(0) === '{') {
      try { data.parts = JSON.parse(data.parts); } catch (_partsParseErr) {}
    }
    if (typeof data.labor === 'string' && data.labor.charAt(0) === '{') {
      try { data.labor = JSON.parse(data.labor); } catch (_laborParseErr) {}
    }
    if (data.parts && typeof data.parts === 'object') {
      parts = data.parts.description || data.parts.parts_description || '';
      if (data.parts.cost != null && data.parts_cost == null) data.parts_cost = data.parts.cost;
    } else {
      parts = data.parts || data.parts_description || parts || '';
    }
    if (data.labor && typeof data.labor === 'object') {
      labor = data.labor.cost || data.labor.labor_cost || labor || 0;
      if (data.labor.discount != null && data.discount == null) data.discount = data.labor.discount;
      if (data.labor.notes && !data.notes) data.notes = data.labor.notes;
    } else {
      labor = data.labor_cost || labor || 0;
    }
    var replay = getIdempotentReplay_('createBilling', data.client_request_id);
    if (replay) return replay;
  }
  if (typeof createBillingPhase2_ === 'function') {
    var result = data && typeof autoGenerateBillingForJob === 'function'
      ? autoGenerateBillingForJob(jobId, {
          parts: parts || '',
          parts_cost: data.parts_cost,
          labor_cost: Number(labor || 0),
          discount: data.discount,
          notes: data.notes,
          source: data.source || 'PWA'
        })
      : createBillingPhase2_(jobId, parts, labor);
    if (data) rememberIdempotentResult_('createBilling', data.client_request_id, result);
    return result;
  }
  return { success: false, error: 'BillingManager not available' };
}

function getIdempotentReplay_(action, clientRequestId) {
  try {
    clientRequestId = String(clientRequestId || '').trim();
    if (!clientRequestId) return null;
    var key = 'idem:' + action + ':' + clientRequestId;
    var cached = CacheService.getScriptCache().get(key);
    if (!cached) return null;
    var replay = JSON.parse(cached);
    replay.idempotent_replay = true;
    return replay;
  } catch (e) {
    return null;
  }
}

function rememberIdempotentResult_(action, clientRequestId, result) {
  try {
    clientRequestId = String(clientRequestId || '').trim();
    if (!clientRequestId || !result || result.success === false) return;
    var key = 'idem:' + action + ':' + clientRequestId;
    CacheService.getScriptCache().put(key, JSON.stringify(result), 21600);
  } catch (e) {}
}
