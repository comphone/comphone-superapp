// COMPHONE SUPER APP V5.5
// ============================================================
// PhotoQueue.gs — Drive-First Photo Queue & Auto Sorting (V5.5)
// Auto Sorting by AI Label + Geofencing + Collage + Gallery Data
// ============================================================

var TEMP_UPLOADS_FOLDER_NAME = 'Temp_Uploads';
var SERVICE_PHASES = ['00_สำรวจ', '01_ติดตั้ง', '02_เสร็จสมบูรณ์', '03_MA_ซ่อมบำรุง', '04_ยกเลิก'];
var PHOTO_QUEUE_HEADERS = [
  'QueueID', 'FileID', 'FileName', 'FileURL', 'ThumbnailURL',
  'JobID', 'TechName', 'Status', 'Timestamp',
  'AILabel', 'AIPhase', 'AIIssues', 'JobPhotoURL', 'ProcessedTimestamp',
  'AISummary', 'GeoStatus', 'GeoDistanceM', 'GeoNote', 'CollageURL'
];
var PHOTO_CATEGORY_FOLDER_MAP = {
  'Before': '01_Before',
  'After': '02_After',
  'Survey': '03_Survey',
  'Equipment': '04_Equipment'
};

// ============================================================
// STEP 1: รับรูปจาก LINE → อัปโหลด Drive → Queue
// ============================================================

function queuePhotoFromLINE(imageId, jobId, techName) {
  try {
    var token = getConfig('LINE_CHANNEL_ACCESS_TOKEN') || '';
    if (!token) return { error: 'LINE_CHANNEL_ACCESS_TOKEN not configured' };

    var options = {
      method: 'get',
      headers: { 'Authorization': 'Bearer ' + token },
      muteHttpExceptions: true
    };
    var resp = UrlFetchApp.fetch('https://api-data.line.me/v2/bot/message/' + imageId + '/content', options);
    var blob = resp.getBlob();
    if (!blob || blob.getBytes().length < 100) {
      return { error: 'ดาวน์โหลดรูปไม่สำเร็จ — ขนาดเล็กเกินไป' };
    }

    var tempFolder = getOrCreateTempFolder();
    var ts = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyyMMdd_HHmmss');
    var filename = ts + '_' + (jobId || 'NOJOB') + '_' + (techName || 'unknown') + '.jpg';
    blob.setName(filename);

    var file = tempFolder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    var queueId = saveToPhotoQueue({
      fileId: file.getId(),
      fileName: filename,
      fileUrl: file.getUrl(),
      thumbnailUrl: file.getDownloadUrl(),
      jobId: jobId || '',
      techName: techName || '',
      status: 'Pending',
      timestamp: getThaiTimestamp(),
      aiLabel: '',
      aiPhase: '',
      aiIssues: '',
      aiSummary: '',
      geoStatus: '',
      geoDistanceM: '',
      geoNote: '',
      collageUrl: ''
    });

    Logger.log('Photo queued: ' + queueId + ' -> ' + file.getName());

    return {
      success: true,
      queueId: queueId,
      fileId: file.getId(),
      fileName: filename,
      message: 'ฝากรูปเข้าระบบเรียบร้อย (JobID: ' + (jobId || 'ไม่ระบุ') + ') กำลังรอการจัดหมวดหมู่...'
    };
  } catch (e) {
    Logger.log('queuePhotoFromLINE error: ' + e);
    return { error: 'คิวรูปเกิดข้อผิดพลาด: ' + e.toString() };
  }
}

// ============================================================
// TEMP / DRIVE FOLDER HELPERS
// ============================================================

function getOrCreateTempFolder() {
  var rootFolder = DriveApp.getFolderById(ROOT_FOLDER_ID);
  var folders = rootFolder.getFoldersByName(TEMP_UPLOADS_FOLDER_NAME);
  if (folders.hasNext()) return folders.next();
  var folder = rootFolder.createFolder(TEMP_UPLOADS_FOLDER_NAME);
  folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  Logger.log('Created Temp folder: ' + folder.getName() + ' | ' + folder.getId());
  return folder;
}

function getJobPhotoFolder(jobId, customerName, phase, category) {
  var rootFolder = DriveApp.getFolderById(ROOT_FOLDER_ID);
  var serviceFolder = _getOrCreateChildFolder_(rootFolder, '02_SERVICE_PHOTOS');

  if (!phase) phase = '00_สำรวจ';
  var phaseFolderName = String(phase || '00_สำรวจ').replace('🔍 ', '').replace('🔧 ', '').replace('✅ ', '').replace('🛠️ ', '');
  var phaseFolder = _getOrCreateChildFolder_(serviceFolder, phaseFolderName);

  var safeCustomer = String(customerName || 'unknown').replace(/[\\/:*?"<>|#\[\]]/g, ' ').replace(/\s+/g, '_').substring(0, 80);
  var jobFolderName = String(jobId || 'NOJOB') + '_' + safeCustomer;
  var jobFolder = _getOrCreateChildFolder_(phaseFolder, jobFolderName);

  var normalizedCategory = normalizePhotoCategory_(category || 'Survey');
  var categoryFolderName = PHOTO_CATEGORY_FOLDER_MAP[normalizedCategory] || PHOTO_CATEGORY_FOLDER_MAP.Survey;
  var categoryFolder = _getOrCreateChildFolder_(jobFolder, categoryFolderName);

  return {
    id: categoryFolder.getId(),
    url: categoryFolder.getUrl(),
    name: categoryFolderName,
    phase: phaseFolderName,
    category: normalizedCategory,
    jobFolderId: jobFolder.getId(),
    jobFolderUrl: jobFolder.getUrl(),
    jobFolderName: jobFolderName,
    categoryFolderId: categoryFolder.getId(),
    categoryFolderUrl: categoryFolder.getUrl()
  };
}

function _getOrCreateChildFolder_(parentFolder, folderName) {
  var folders = parentFolder.getFoldersByName(folderName);
  if (folders.hasNext()) return folders.next();
  var folder = parentFolder.createFolder(folderName);
  folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return folder;
}

// ============================================================
// DB_PHOTO_QUEUE — CRUD
// ============================================================

function getPhotoQueueSheet() {
  var ss = getComphoneSheet();
  var sheet = findSheetByName(ss, 'DB_PHOTO_QUEUE');
  if (!sheet) {
    sheet = ss.insertSheet('DB_PHOTO_QUEUE');
    sheet.getRange(1, 1, 1, PHOTO_QUEUE_HEADERS.length).setValues([PHOTO_QUEUE_HEADERS]);
    Logger.log('Created DB_PHOTO_QUEUE sheet');
  } else {
    ensurePhotoQueueHeaders_(sheet);
  }
  return sheet;
}

function ensurePhotoQueueHeaders_(sheet) {
  var lastColumn = Math.max(sheet.getLastColumn(), 1);
  var headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  var changed = false;
  for (var i = 0; i < PHOTO_QUEUE_HEADERS.length; i++) {
    if (headers.indexOf(PHOTO_QUEUE_HEADERS[i]) === -1) {
      headers.push(PHOTO_QUEUE_HEADERS[i]);
      changed = true;
    }
  }
  if (changed) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
}

function getPhotoQueueContext_() {
  var sheet = getPhotoQueueSheet();
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  return {
    sheet: sheet,
    headers: headers,
    idx: {
      queueId: findHeaderIndex_(headers, ['QueueID']),
      fileId: findHeaderIndex_(headers, ['FileID']),
      fileName: findHeaderIndex_(headers, ['FileName']),
      fileUrl: findHeaderIndex_(headers, ['FileURL']),
      thumbnailUrl: findHeaderIndex_(headers, ['ThumbnailURL']),
      jobId: findHeaderIndex_(headers, ['JobID']),
      techName: findHeaderIndex_(headers, ['TechName']),
      status: findHeaderIndex_(headers, ['Status']),
      timestamp: findHeaderIndex_(headers, ['Timestamp']),
      aiLabel: findHeaderIndex_(headers, ['AILabel']),
      aiPhase: findHeaderIndex_(headers, ['AIPhase']),
      aiIssues: findHeaderIndex_(headers, ['AIIssues']),
      jobPhotoUrl: findHeaderIndex_(headers, ['JobPhotoURL']),
      processedTimestamp: findHeaderIndex_(headers, ['ProcessedTimestamp']),
      aiSummary: findHeaderIndex_(headers, ['AISummary']),
      geoStatus: findHeaderIndex_(headers, ['GeoStatus']),
      geoDistanceM: findHeaderIndex_(headers, ['GeoDistanceM']),
      geoNote: findHeaderIndex_(headers, ['GeoNote']),
      collageUrl: findHeaderIndex_(headers, ['CollageURL'])
    }
  };
}

function generateQueueId() {
  var sheet = getPhotoQueueSheet();
  var row = sheet.getLastRow();
  return 'Q' + String(Math.max(row, 1)).padStart(5, '0');
}

function saveToPhotoQueue(data) {
  var ctx = getPhotoQueueContext_();
  var qid = generateQueueId();
  var row = _createQueueRow_(ctx.headers.length);

  _setQueueCell_(row, ctx.idx.queueId, qid);
  _setQueueCell_(row, ctx.idx.fileId, data.fileId || '');
  _setQueueCell_(row, ctx.idx.fileName, data.fileName || '');
  _setQueueCell_(row, ctx.idx.fileUrl, data.fileUrl || '');
  _setQueueCell_(row, ctx.idx.thumbnailUrl, data.thumbnailUrl || '');
  _setQueueCell_(row, ctx.idx.jobId, data.jobId || '');
  _setQueueCell_(row, ctx.idx.techName, data.techName || '');
  _setQueueCell_(row, ctx.idx.status, data.status || 'Pending');
  _setQueueCell_(row, ctx.idx.timestamp, data.timestamp || getThaiTimestamp());
  _setQueueCell_(row, ctx.idx.aiLabel, data.aiLabel || '');
  _setQueueCell_(row, ctx.idx.aiPhase, data.aiPhase || '');
  _setQueueCell_(row, ctx.idx.aiIssues, data.aiIssues || '');
  _setQueueCell_(row, ctx.idx.jobPhotoUrl, data.jobPhotoUrl || '');
  _setQueueCell_(row, ctx.idx.processedTimestamp, data.processedTimestamp || '');
  _setQueueCell_(row, ctx.idx.aiSummary, data.aiSummary || '');
  _setQueueCell_(row, ctx.idx.geoStatus, data.geoStatus || '');
  _setQueueCell_(row, ctx.idx.geoDistanceM, data.geoDistanceM || '');
  _setQueueCell_(row, ctx.idx.geoNote, data.geoNote || '');
  _setQueueCell_(row, ctx.idx.collageUrl, data.collageUrl || '');

  ctx.sheet.appendRow(row);
  return qid;
}

function getPendingPhotos() {
  var ctx = getPhotoQueueContext_();
  var data = ctx.sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  var pending = [];
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][ctx.idx.status] || '') === 'Pending') {
      pending.push({
        row: i + 1,
        queueId: String(data[i][ctx.idx.queueId] || ''),
        fileId: String(data[i][ctx.idx.fileId] || ''),
        fileName: String(data[i][ctx.idx.fileName] || ''),
        fileUrl: String(data[i][ctx.idx.fileUrl] || ''),
        thumbnailUrl: String(data[i][ctx.idx.thumbnailUrl] || ''),
        jobId: String(data[i][ctx.idx.jobId] || ''),
        techName: String(data[i][ctx.idx.techName] || ''),
        timestamp: String(data[i][ctx.idx.timestamp] || '')
      });
    }
  }
  return pending;
}

function updateQueueStatus(queueId, status, aiLabel, aiPhase, aiIssues, jobPhotoUrl, extras) {
  var ctx = getPhotoQueueContext_();
  var data = ctx.sheet.getDataRange().getValues();
  extras = extras || {};

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][ctx.idx.queueId] || '') === String(queueId)) {
      var row = i + 1;
      if (ctx.idx.status > -1) ctx.sheet.getRange(row, ctx.idx.status + 1).setValue(status || '');
      if (aiLabel !== undefined && aiLabel !== null && ctx.idx.aiLabel > -1) ctx.sheet.getRange(row, ctx.idx.aiLabel + 1).setValue(aiLabel);
      if (aiPhase !== undefined && aiPhase !== null && ctx.idx.aiPhase > -1) ctx.sheet.getRange(row, ctx.idx.aiPhase + 1).setValue(aiPhase);
      if (aiIssues !== undefined && aiIssues !== null && ctx.idx.aiIssues > -1) ctx.sheet.getRange(row, ctx.idx.aiIssues + 1).setValue(aiIssues);
      if (jobPhotoUrl !== undefined && jobPhotoUrl !== null && ctx.idx.jobPhotoUrl > -1) ctx.sheet.getRange(row, ctx.idx.jobPhotoUrl + 1).setValue(jobPhotoUrl);
      if (ctx.idx.processedTimestamp > -1) ctx.sheet.getRange(row, ctx.idx.processedTimestamp + 1).setValue(getThaiTimestamp());
      if (ctx.idx.aiSummary > -1) ctx.sheet.getRange(row, ctx.idx.aiSummary + 1).setValue(extras.aiSummary || '');
      if (ctx.idx.geoStatus > -1) ctx.sheet.getRange(row, ctx.idx.geoStatus + 1).setValue(extras.geoStatus || '');
      if (ctx.idx.geoDistanceM > -1) ctx.sheet.getRange(row, ctx.idx.geoDistanceM + 1).setValue(extras.geoDistanceM || '');
      if (ctx.idx.geoNote > -1) ctx.sheet.getRange(row, ctx.idx.geoNote + 1).setValue(extras.geoNote || '');
      if (ctx.idx.collageUrl > -1) ctx.sheet.getRange(row, ctx.idx.collageUrl + 1).setValue(extras.collageUrl || '');
      return { success: true, queueId: queueId };
    }
  }
  return { error: 'ไม่พบ QueueID: ' + queueId };
}

// ============================================================
// STEP 2: PROCESS IMAGE SORTING — AI ตรวจสอบ + ย้ายไฟล์ + Geofence
// ============================================================

function processImageSorting() {
  var pending = getPendingPhotos();
  if (pending.length === 0) {
    Logger.log('No pending photos to process');
    return { success: true, processed: 0, message: 'ไม่มีรูปที่ต้องจัดการ' };
  }

  Logger.log('Processing ' + pending.length + ' pending photos...');
  var results = [];
  for (var i = 0; i < pending.length; i++) {
    var photo = pending[i];
    var result = _processSinglePhoto(photo);
    results.push(result);
    Utilities.sleep(1000);
  }

  var successCount = 0;
  for (var j = 0; j < results.length; j++) {
    if (results[j].success) successCount++;
  }

  return {
    success: true,
    processed: results.length,
    successful: successCount,
    failed: results.length - successCount,
    results: results
  };
}

function _processSinglePhoto(photo) {
  try {
    Logger.log('Processing: ' + photo.queueId + ' - ' + photo.fileName + ' (Job: ' + photo.jobId + ')');

    var aiResult = _analyzeQueuedPhoto(photo.fileId, photo);
    var photoCategory = normalizePhotoCategory_(aiResult && !aiResult.error ? (aiResult.photo_category || aiResult.auto_label || '') : 'Survey');
    var aiSummary = aiResult && !aiResult.error ? (aiResult.auto_label || '') : '';
    var aiPhase = _mapPhase(aiResult, photoCategory);
    var aiIssues = _buildAiIssuesText_(aiResult);

    var jobInfo = _getJobInfo(photo.jobId);
    var customerName = jobInfo ? jobInfo.customer : '';

    var geofence = null;
    if (photo.jobId && typeof validatePhotoGeofence === 'function') {
      geofence = validatePhotoGeofence(photo.fileId, photo.jobId, customerName, { radius_m: 300 });
      if (geofence && !geofence.success && geofence.error) {
        aiIssues = mergeIssueText_(aiIssues, 'GeoCheck: ' + geofence.error);
      } else if (geofence && geofence.success && !geofence.in_geofence) {
        aiIssues = mergeIssueText_(aiIssues, 'GeoFence mismatch ' + geofence.distance_m + 'm');
      }
    }

    var folderInfo = getJobPhotoFolder(photo.jobId, customerName, aiPhase, photoCategory);
    var file = DriveApp.getFileById(photo.fileId);
    var tempFolder = getOrCreateTempFolder();

    DriveApp.getFolderById(folderInfo.categoryFolderId).addFile(file);
    try { tempFolder.removeFile(file); } catch (removeErr) { Logger.log('Temp remove warning: ' + removeErr); }

    var newFileUrl = file.getUrl();
    var updatedJob = false;
    if (photo.jobId) {
      updatedJob = _appendPhotoToJob(photo.jobId, file, folderInfo);
    }

    var collage = null;
    if (photo.jobId && photoCategory === 'After') {
      collage = createBeforeAfterCollage(photo.jobId, { skipIfMissing: true, customer_name: customerName });
    }

    updateQueueStatus(
      photo.queueId,
      'Processed',
      photoCategory,
      aiPhase,
      aiIssues,
      newFileUrl,
      {
        aiSummary: aiSummary,
        geoStatus: geofence ? (geofence.status || '') : '',
        geoDistanceM: geofence && geofence.distance_m ? geofence.distance_m : '',
        geoNote: geofence ? (geofence.message || geofence.error || '') : '',
        collageUrl: collage && collage.success ? collage.collageUrl : ''
      }
    );

    var notifyMsg = _buildPhotoNotification(photo, aiResult, folderInfo, updatedJob, customerName || '', geofence, collage);
    try {
      sendLineNotify({ message: notifyMsg, room: 'TECHNICIAN' });
    } catch (e) {
      Logger.log('Notify failed: ' + e);
    }

    return {
      success: true,
      queueId: photo.queueId,
      jobId: photo.jobId,
      customerName: customerName,
      fileName: photo.fileName,
      aiLabel: photoCategory,
      aiSummary: aiSummary,
      aiPhase: aiPhase,
      folderUrl: folderInfo.url,
      photoUrl: newFileUrl,
      jobPhotoUpdated: updatedJob,
      geofence: geofence,
      collage: collage
    };
  } catch (e2) {
    Logger.log('_processSinglePhoto error: ' + e2);
    updateQueueStatus(photo.queueId, 'Error', '', '', e2.toString(), '', { geoNote: e2.toString() });
    return { success: false, queueId: photo.queueId, error: e2.toString() };
  }
}

function _analyzeQueuedPhoto(fileId, photo) {
  var apiKey = getConfig('GEMINI_API_KEY') || getConfig('GOOGLE_AI_API_KEY') || '';
  if (!apiKey) {
    return { error: 'GEMINI_API_KEY not configured', auto_label: 'ยังไม่ตั้งค่า API Key', photo_category: 'Survey' };
  }

  try {
    var file = DriveApp.getFileById(fileId);
    var blob = file.getBlob();
    var bytes = blob.getBytes();
    var base64 = Utilities.base64Encode(bytes);

    var context = 'JobID: ' + (photo.jobId || 'ไม่ระบุ') +
      ' | ช่าง: ' + (photo.techName || 'ไม่ระบุ') +
      ' | ไฟล์: ' + (photo.fileName || '');

    return analyzeWorkImageFromBase64(base64, context);
  } catch (e) {
    Logger.log('_analyzeQueuedPhoto error: ' + e);
    return { error: 'AI วิเคราะห์ไม่ได้: ' + e.toString(), photo_category: 'Survey' };
  }
}

function _mapPhase(analysis, photoCategory) {
  if (photoCategory === 'After') return '02_เสร็จสมบูรณ์';
  if (photoCategory === 'Before' || photoCategory === 'Survey') return '00_สำรวจ';
  if (photoCategory === 'Equipment') return '01_ติดตั้ง';

  if (!analysis) return '00_สำรวจ';
  var text = '';
  if (typeof analysis === 'string') {
    text = analysis.toLowerCase();
  } else if (typeof analysis === 'object') {
    text = (analysis.auto_label || '') + ' ' + (analysis.location_type || '') + ' ' +
      (analysis.installation_quality || '') + ' ' +
      (analysis.quality_issues ? analysis.quality_issues.join(' ') : '');
    text = text.toLowerCase();
  }

  if (text.indexOf('เสร็จ') > -1 || text.indexOf('complete') > -1 || text.indexOf('เรียบร้อย') > -1) {
    return '02_เสร็จสมบูรณ์';
  }
  if (text.indexOf('ติดตั้') > -1 || text.indexOf('install') > -1 || text.indexOf('mount') > -1) {
    return '01_ติดตั้ง';
  }
  if (text.indexOf('ซ่อม') > -1 || text.indexOf('repair') > -1 || text.indexOf('ma') > -1 || text.indexOf('บำรุง') > -1) {
    return '03_MA_ซ่อมบำรุง';
  }
  return '00_สำรวจ';
}

function _buildAiIssuesText_(analysis) {
  if (!analysis || analysis.error) return analysis && analysis.error ? analysis.error : '';
  var issues = [];
  if (analysis.quality_issues && analysis.quality_issues.length) {
    issues.push(analysis.quality_issues.join(', '));
  }
  if (analysis.suggestions && analysis.suggestions.length) {
    issues.push('Suggestions: ' + analysis.suggestions.join(', '));
  }
  return issues.join(' | ');
}

function mergeIssueText_(baseText, extraText) {
  var a = String(baseText || '').trim();
  var b = String(extraText || '').trim();
  if (!a) return b;
  if (!b) return a;
  return a + ' | ' + b;
}

// ============================================================
// DBJOBS HELPERS
// ============================================================

function _getJobInfo(jobId) {
  if (!jobId) return null;
  try {
    var ss = getComphoneSheet();
    var jsh = findSheetByName(ss, 'DBJOBS');
    if (!jsh) return null;

    var values = jsh.getDataRange().getValues();
    var headers = values[0];
    var idxJob = findHeaderIndex_(headers, ['JobID', 'Job_ID', 'jobid', 'job_id']);
    var idxCustomer = findHeaderIndex_(headers, ['ชื่อลูกค้า', 'Customer_Name', 'Customer', 'customer']);
    var idxSymptom = findHeaderIndex_(headers, ['อาการ', 'Symptom', 'Issue', 'symptom']);
    var idxStatus = findHeaderIndex_(headers, ['สถานะ', 'Status', 'status']);
    var idxTech = findHeaderIndex_(headers, ['ช่างที่รับงาน', 'Technician', 'tech', 'ช่าง']);
    var idxFolder = findHeaderIndex_(headers, ['folder_url', 'ลิงก์โฟเดอร์งาน', 'ลิงก์รูปภาพ', 'Folder_URL']);

    for (var i = 1; i < values.length; i++) {
      if (String(values[i][idxJob] || '') === String(jobId)) {
        return {
          id: String(values[i][idxJob] || ''),
          customer: idxCustomer > -1 ? String(values[i][idxCustomer] || '') : '',
          symptom: idxSymptom > -1 ? String(values[i][idxSymptom] || '') : '',
          status: idxStatus > -1 ? String(values[i][idxStatus] || '') : '',
          tech: idxTech > -1 ? String(values[i][idxTech] || '') : '',
          folder: idxFolder > -1 ? String(values[i][idxFolder] || '') : ''
        };
      }
    }
  } catch (e) {
    Logger.log('_getJobInfo error: ' + e);
  }
  return null;
}

function _appendPhotoToJob(jobId, file, folderInfo) {
  try {
    var ss = getComphoneSheet();
    var jsh = findSheetByName(ss, 'DBJOBS');
    if (!jsh) return false;

    var values = jsh.getDataRange().getValues();
    var headers = values[0];
    var idxJob = findHeaderIndex_(headers, ['JobID', 'Job_ID', 'jobid', 'job_id']);
    var idxPhotoLink = findHeaderIndex_(headers, ['ลิงก์รูปภาพ', 'Photo_URL', 'PhotoLinks', 'รูปถ่าย']);
    var idxFolder = findHeaderIndex_(headers, ['folder_url', 'ลิงก์โฟเดอร์งาน', 'Folder_URL']);

    for (var i = 1; i < values.length; i++) {
      if (String(values[i][idxJob] || '') !== String(jobId)) continue;
      var row = i + 1;
      if (idxPhotoLink > -1) {
        var currentLink = String(values[i][idxPhotoLink] || '');
        var links = currentLink ? currentLink.split(',') : [];
        var cleaned = [];
        for (var j = 0; j < links.length; j++) {
          var link = String(links[j] || '').trim();
          if (link) cleaned.push(link);
        }
        if (cleaned.indexOf(file.getUrl()) === -1) cleaned.push(file.getUrl());
        jsh.getRange(row, idxPhotoLink + 1).setValue(cleaned.join(', '));
      }
      if (idxFolder > -1 && folderInfo && folderInfo.jobFolderUrl) {
        jsh.getRange(row, idxFolder + 1).setValue(folderInfo.jobFolderUrl);
      }
      return true;
    }
  } catch (e) {
    Logger.log('_appendPhotoToJob error: ' + e);
  }
  return false;
}

// ============================================================
// QUERY / GALLERY APIs
// ============================================================

function getJobProcessedPhotos(jobId, options) {
  options = options || {};
  var ctx = getPhotoQueueContext_();
  var data = ctx.sheet.getDataRange().getValues();
  var out = [];
  var wantedCategory = options.category ? normalizePhotoCategory_(options.category) : '';

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (String(row[ctx.idx.jobId] || '') !== String(jobId || '')) continue;
    if (options.processedOnly !== false && String(row[ctx.idx.status] || '') !== 'Processed') continue;

    var category = normalizePhotoCategory_(row[ctx.idx.aiLabel] || row[ctx.idx.aiSummary] || 'Survey');
    if (wantedCategory && category !== wantedCategory) continue;

    out.push({
      queueId: String(row[ctx.idx.queueId] || ''),
      fileId: String(row[ctx.idx.fileId] || ''),
      fileName: String(row[ctx.idx.fileName] || ''),
      fileUrl: String(row[ctx.idx.fileUrl] || ''),
      thumbnailUrl: String(row[ctx.idx.thumbnailUrl] || ''),
      jobId: String(row[ctx.idx.jobId] || ''),
      techName: String(row[ctx.idx.techName] || ''),
      status: String(row[ctx.idx.status] || ''),
      timestamp: String(row[ctx.idx.timestamp] || ''),
      aiLabel: category,
      aiPhase: String(row[ctx.idx.aiPhase] || ''),
      aiIssues: String(row[ctx.idx.aiIssues] || ''),
      jobPhotoUrl: String(row[ctx.idx.jobPhotoUrl] || ''),
      processedTimestamp: String(row[ctx.idx.processedTimestamp] || ''),
      aiSummary: String(row[ctx.idx.aiSummary] || ''),
      geofence: {
        status: ctx.idx.geoStatus > -1 ? String(row[ctx.idx.geoStatus] || '') : '',
        distance_m: ctx.idx.geoDistanceM > -1 ? Number(row[ctx.idx.geoDistanceM] || 0) : 0,
        note: ctx.idx.geoNote > -1 ? String(row[ctx.idx.geoNote] || '') : ''
      },
      collageUrl: ctx.idx.collageUrl > -1 ? String(row[ctx.idx.collageUrl] || '') : ''
    });
  }

  out.sort(function(a, b) {
    var av = String(a.processedTimestamp || a.timestamp || '');
    var bv = String(b.processedTimestamp || b.timestamp || '');
    if (options.newestFirst === false) return av.localeCompare(bv);
    return bv.localeCompare(av);
  });
  return out;
}

function getPhotoGalleryData(jobId) {
  var photos = getJobProcessedPhotos(jobId, { newestFirst: true, processedOnly: false });
  var grouped = { Before: [], After: [], Survey: [], Equipment: [] };
  for (var i = 0; i < photos.length; i++) {
    var category = normalizePhotoCategory_(photos[i].aiLabel || 'Survey');
    if (!grouped[category]) grouped[category] = [];
    grouped[category].push(photos[i]);
  }

  return {
    success: true,
    job_id: jobId,
    counts: {
      before: grouped.Before.length,
      after: grouped.After.length,
      survey: grouped.Survey.length,
      equipment: grouped.Equipment.length,
      total: photos.length
    },
    grouped: grouped,
    latest_collage_url: _findLatestCollageUrl_(photos)
  };
}

function _findLatestCollageUrl_(photos) {
  for (var i = 0; i < photos.length; i++) {
    if (photos[i].collageUrl) return photos[i].collageUrl;
  }
  return '';
}

// ============================================================
// AUTO COLLAGE — Before / After
// ============================================================

function createBeforeAfterCollage(jobId, options) {
  try {
    options = options || {};
    var beforePhotos = getJobProcessedPhotos(jobId, { category: 'Before', newestFirst: true });
    var afterPhotos = getJobProcessedPhotos(jobId, { category: 'After', newestFirst: true });

    if (!beforePhotos.length || !afterPhotos.length) {
      if (options.skipIfMissing) {
        return { success: false, error: 'Before/After ไม่ครบสำหรับสร้าง collage', skipped: true };
      }
      return { success: false, error: 'Before/After ไม่ครบสำหรับสร้าง collage' };
    }

    var beforePhoto = beforePhotos[0];
    var afterPhoto = afterPhotos[0];
    var jobInfo = _getJobInfo(jobId) || {};
    var folderInfo = getJobPhotoFolder(jobId, options.customer_name || jobInfo.customer || '', '02_เสร็จสมบูรณ์', 'After');
    var collageFolder = _getOrCreateChildFolder_(DriveApp.getFolderById(folderInfo.jobFolderId), '99_Collage');

    var presentation = SlidesApp.create('COMPHONE_Collage_' + jobId + '_' + Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyyMMdd_HHmmss'));
    var slide = presentation.getSlides()[0];
    _clearDefaultSlideElements_(slide);
    _renderBeforeAfterCollageSlide_(presentation, slide, beforePhoto, afterPhoto, jobId, options.customer_name || jobInfo.customer || '');
    presentation.saveAndClose();

    var pngBlob = _fetchSlideThumbnailBlob_(presentation.getId(), slide.getObjectId(), jobId + '_before_after_collage.png');
    var collageFile = collageFolder.createFile(pngBlob);
    collageFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    try { DriveApp.getFileById(presentation.getId()).setTrashed(true); } catch (trashErr) { Logger.log('Trash temp presentation warning: ' + trashErr); }

    return {
      success: true,
      collageFileId: collageFile.getId(),
      collageUrl: collageFile.getUrl(),
      beforeFileUrl: beforePhoto.fileUrl,
      afterFileUrl: afterPhoto.fileUrl
    };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

function _clearDefaultSlideElements_(slide) {
  var shapes = slide.getShapes();
  for (var i = 0; i < shapes.length; i++) {
    try { shapes[i].remove(); } catch (e) {}
  }
}

function _renderBeforeAfterCollageSlide_(presentation, slide, beforePhoto, afterPhoto, jobId, customerName) {
  var pageWidth = presentation.getPageWidth();
  var pageHeight = presentation.getPageHeight();
  var margin = 24;
  var headerHeight = 50;
  var labelHeight = 28;
  var gap = 14;
  var contentTop = margin + headerHeight + 8;
  var boxWidth = (pageWidth - (margin * 2) - gap) / 2;
  var boxHeight = pageHeight - contentTop - margin - labelHeight;

  var title = slide.insertTextBox('Before / After Collage  |  ' + jobId + (customerName ? '  |  ' + customerName : ''), margin, margin, pageWidth - (margin * 2), headerHeight);
  title.getText().getTextStyle().setFontSize(18).setBold(true);

  var beforeLabel = slide.insertTextBox('BEFORE', margin, contentTop, boxWidth, labelHeight);
  beforeLabel.getText().getTextStyle().setFontSize(14).setBold(true);

  var afterLabel = slide.insertTextBox('AFTER', margin + boxWidth + gap, contentTop, boxWidth, labelHeight);
  afterLabel.getText().getTextStyle().setFontSize(14).setBold(true);

  var beforeImage = slide.insertImage(DriveApp.getFileById(beforePhoto.fileId).getBlob());
  var afterImage = slide.insertImage(DriveApp.getFileById(afterPhoto.fileId).getBlob());

  fitImageIntoBox_(beforeImage, margin, contentTop + labelHeight, boxWidth, boxHeight);
  fitImageIntoBox_(afterImage, margin + boxWidth + gap, contentTop + labelHeight, boxWidth, boxHeight);
}

function fitImageIntoBox_(image, left, top, maxWidth, maxHeight) {
  var width = image.getWidth();
  var height = image.getHeight();
  if (!width || !height) {
    image.setLeft(left).setTop(top).setWidth(maxWidth).setHeight(maxHeight);
    return;
  }

  var scale = Math.min(maxWidth / width, maxHeight / height);
  var newWidth = width * scale;
  var newHeight = height * scale;
  var centeredLeft = left + ((maxWidth - newWidth) / 2);
  var centeredTop = top + ((maxHeight - newHeight) / 2);
  image.setLeft(centeredLeft).setTop(centeredTop).setWidth(newWidth).setHeight(newHeight);
}

function _fetchSlideThumbnailBlob_(presentationId, slideObjectId, fileName) {
  var token = ScriptApp.getOAuthToken();
  var metaResp = UrlFetchApp.fetch(
    'https://slides.googleapis.com/v1/presentations/' + presentationId + '/pages/' + slideObjectId + '/thumbnail?thumbnailProperties.mimeType=PNG&thumbnailProperties.thumbnailSize=LARGE',
    {
      method: 'get',
      headers: { Authorization: 'Bearer ' + token },
      muteHttpExceptions: true
    }
  );

  var meta = JSON.parse(metaResp.getContentText());
  if (!meta || !meta.contentUrl) {
    throw new Error('ไม่สามารถสร้าง thumbnail ของ collage ได้');
  }

  var imageResp = UrlFetchApp.fetch(meta.contentUrl, { muteHttpExceptions: true });
  var blob = imageResp.getBlob();
  blob.setName(fileName || 'collage.png');
  return blob;
}

// ============================================================
// LINE NOTIFICATION TEMPLATE
// ============================================================

function _buildPhotoNotification(photo, aiResult, folderInfo, jobUpdated, customerName, geofence, collage) {
  var normalizedCategory = normalizePhotoCategory_(aiResult && !aiResult.error ? (aiResult.photo_category || aiResult.auto_label || '') : 'Survey');
  var msg = '📸 จัดการรูปภาพสำเร็จ!\n\n';
  msg += '👤 ลูกค้า: ' + (customerName || photo.jobId || '-') + '\n';
  msg += '🔧 งาน: ' + (photo.jobId || 'ไม่ระบุ') + '\n';
  msg += '👷 ช่าง: ' + (photo.techName || 'ไม่ระบุ') + '\n';
  msg += '🏷️ Category: ' + normalizedCategory + '\n';
  msg += '🧠 AI Summary: ' + (aiResult && aiResult.auto_label ? aiResult.auto_label : '-') + '\n';
  msg += '📂 Phase: ' + (folderInfo ? folderInfo.phase : '-');

  if (aiResult && aiResult.installation_quality) {
    msg += '\n📊 คุณภาพ: ' + aiResult.installation_quality;
  }
  if (aiResult && aiResult.quality_issues && aiResult.quality_issues.length > 0) {
    msg += '\n⚠️ ปัญหา: ' + aiResult.quality_issues.join(', ');
  }
  if (geofence) {
    msg += '\n📍 GeoFence: ' + (geofence.status || '-');
    if (geofence.distance_m) msg += ' (' + geofence.distance_m + 'm)';
  }
  if (jobUpdated) {
    msg += '\n🗂️ อัปเดตลิงก์รูปใน DBJOBS แล้ว';
  }

  msg += '\n📁 โฟลเดอร์: ' + (folderInfo ? folderInfo.name : '-');
  msg += '\n' + (folderInfo ? folderInfo.url : '-');

  if (collage && collage.success && collage.collageUrl) {
    msg += '\n🖼️ Collage: ' + collage.collageUrl;
  }

  var dashUrl = LINE_GAS_URL || 'https://script.google.com/macros/s/AKfycbwC8youQ6kfwGZ5DRi0P757KrJh9vhvesE7n8VcVTaj0v54ZbXdpqoJXVh9XzfqwcqtMA/exec';
  msg += '\n\n📊 ดู Dashboard: ' + dashUrl;
  if (photo.jobId) {
    msg += '\n📸 เพิ่มรูป: ' + dashUrl + '?action=openjob&id=' + photo.jobId;
  }

  return msg;
}

// ============================================================
// DASHBOARD API
// ============================================================

function getPhotoQueueCount() {
  var pending = getPendingPhotos();
  var sheet = getPhotoQueueSheet();
  return {
    success: true,
    pending: pending.length,
    totalRows: sheet ? sheet.getLastRow() - 1 : 0
  };
}

// ============================================================
// INTERNAL HELPERS
// ============================================================

function _createQueueRow_(length) {
  var row = [];
  for (var i = 0; i < length; i++) row.push('');
  return row;
}

function _setQueueCell_(row, index, value) {
  if (index > -1) row[index] = value;
}

// ============================================================
// STEP N: อัปโหลดรูปจาก PC Dashboard → Drive → Queue
// ============================================================

function uploadPhoto_(params) {
  try {
    var jobId = params.job_id || '';
    var filename = params.filename || '';
    var mimeType = params.mime_type || 'image/jpeg';
    var base64Data = params.data || '';

    if (!jobId) return { success: false, error: 'ต้องระบุ Job ID' };
    if (!base64Data) return { success: false, error: 'ไม่พบข้อมูลรูปภาพ' };

    // Decode base64 to blob
    var blob = Utilities.newBlob(Utilities.base64Decode(base64Data), mimeType, filename);
    if (!blob || blob.getBytes().length < 100) {
      return { success: false, error: 'ข้อมูลรูปภาพไม่ถูกต้อง' };
    }

    var tempFolder = getOrCreateTempFolder();
    var ts = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyyMMdd_HHmmss');
    var finalName = ts + '_' + jobId + '_PCUpload_' + filename;
    blob.setName(finalName);

    var file = tempFolder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    // Save to queue
    var queueId = saveToPhotoQueue({
      fileId: file.getId(),
      fileName: finalName,
      fileURL: file.getUrl(),
      thumbnailURL: file.getUrl(), // Could generate thumbnail later
      jobId: jobId,
      techName: 'PC-User',
      status: 'Pending',
      timestamp: new Date(),
      aiLabel: '',
      aiPhase: '',
      aiIssues: '',
      jobPhotoURL: '',
      processedTimestamp: '',
      aiSummary: '',
      geoStatus: 'NoCheck',
      geoDistanceM: '',
      geoNote: '',
      collageURL: ''
    });

    return {
      success: true,
      queueId: queueId,
      fileId: file.getId(),
      fileURL: file.getUrl(),
      message: 'อัปโหลดรูปสำเร็จ'
    };
  } catch (e) {
    return { success: false, error: e.message, stack: e.stack };
  }
}
