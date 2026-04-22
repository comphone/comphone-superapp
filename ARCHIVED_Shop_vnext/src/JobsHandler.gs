// ============================================================
// JobsHandler.gs - Job CRUD, Photos, Folders (V352)
// V350: Dynamic header lookup + labor/total outside loop
// V352: Auto Warranty PDF after completeJob
// ============================================================

function openJob(data) {
  data = data || {};
  if (!data.customer_name && data.name) data.customer_name = data.name;
  if (!data.changed_by) data.changed_by = data.user || data.technician || 'SYSTEM||LINE';
  if (!data.current_status_code && !data.status_code) {
    data.current_status_code = normalizeStatusCode_(data.status) || 1;
  }
  return createJob(data);
}

function checkJobs(data) {
  try {
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
    var search = (data.search || '').toLowerCase();
    var results = [];
    for (var i = 1; i < all.length; i++) {
      var j = all[i];
      if (!search || String(j[0]).toLowerCase().indexOf(search) > -1 || String(j[1]).toLowerCase().indexOf(search) > -1 || String(j[4] || '').toLowerCase().indexOf(search) > -1) {
        var created = '-';
        try { if (j[cc] && j[cc] instanceof Date) created = Utilities.formatDate(j[cc], 'Asia/Bangkok', 'dd/MM HH:mm'); } catch(e) {}
        results.push({ job_id: String(j[0]), customer: String(j[1]), symptom: String(j[2]), status: String(j[sc]), technician: String(j[4] || ''), folder_url: String(j[fc] || ''), created: created });
      }
    }
    return { count: results.length, jobs: results };
  } catch (e) { return { error: e.toString() }; }
}

function completeJob(data) {
  var lock = LockService.getScriptLock();
  try { lock.waitLock(10000); } catch(e) { return { error: 'Lock timeout' }; }
  try {
    var ss = getComphoneSheet();
    var sh = findSheetByName(ss, 'DBJOBS');
    if (!sh) return { error: 'DBJOBS not found' };
    var all = sh.getDataRange().getValues();

    // V350: Dynamic Header Lookup (instead of hardcoded column indices)
    var headers = all[0];
    var statusCol = 3, updateCol = 10;
    for (var hi = 0; hi < headers.length; hi++) {
      var h = String(headers[hi]);
      if (h.indexOf('สถานะ') > -1 || h.indexOf('สถาน') > -1) statusCol = hi;
      if (h.indexOf('เวลาอัปเดต') > -1 || h.indexOf('updated') > -1) updateCol = hi;
    }

    var jobId = data.job_id || '';

    // V350: Move labor/total calculation to outer scope so it's accessible everywhere
    var labor = Number(data.labor_cost || 0);
    var total = labor + Number(data.parts_cost || 0);

    for (var i = 1; i < all.length; i++) {
      if (String(all[i][0]) === String(jobId)) {
        var oldStatus = String(all[i][statusCol] || '');

        if (oldStatus !== 'Completed') {
          all[i][statusCol] = 'Completed';
          all[i][updateCol] = new Date();
          sh.getDataRange().setValues(all);

          // V320: Auto-cut reserved stock OR manual parts
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

          // V350: Create billing via createBilling() — proper price lookup from DB_INVENTORY
          var billingResult = createBilling(jobId, data.parts || '', labor);

          // V352: Auto Warranty PDF + send LINE push
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

          // V320: Log
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

    // V350: Dynamic Header Lookup
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
  if (typeof createBillingPhase2_ === 'function') {
    return createBillingPhase2_(jobId, parts, labor);
  }
  return { success: false, error: 'BillingManager not available' };
}
