// ============================================================
// PhotoQueue.gs — Drive-First Photo Queue & Auto Sorting (V324)
// ============================================================

var TEMP_UPLOADS_FOLDER_NAME = 'Temp_Uploads';
var SERVICE_PHASES = ['00_สำรวจ', '01_ติดตั้ง', '02_เสร็จสมบูรณ์', '03_MA_ซ่อมบำรุง', '04_ยกเลิก'];

// ============================================================
// STEP 1: รับรูปจาก LINE → อัปโหลด Drive → Queue
// ============================================================

/**
 * รับรูปจาก LINE Bot → ดาวน์โหลด → อัปโหลไป Temp_Uploads → บันทึกเข้า DB_PHOTO_QUEUE
 * @param {string} imageId - LINE message id
 * @param {string} jobId - Job ID
 * @param {string} techName - ชื่อช่าง
 * @return {object}
 */
function queuePhotoFromLINE(imageId, jobId, techName) {
  try {
    var token = getConfig('LINE_CHANNEL_ACCESS_TOKEN') || '';
    if (!token) return { error: 'LINE_CHANNEL_ACCESS_TOKEN not configured' };

    // 1. ดาวน์โหลดรูปจาก LINE
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

    // 2. หาโฟลเดอร์ Temp_Uploads
    var tempFolder = getOrCreateTempFolder();

    // 3. ตั้งชื่อไฟล์ (timestamp_jobid_tech)
    var ts = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyyMMdd_HHmmss');
    var filename = ts + '_' + jobId + '_' + (techName || 'unknown') + '.jpg';
    blob.setName(filename);

    // 4. อัปโหลด Drive
    var file = tempFolder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    // 5. บันทึกเข้า DB_PHOTO_QUEUE
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
      aiIssues: ''
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
// TEMP FOLDER HELPERS
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

/**
 * หาโฟลเดอร์ลูกค้าจาก JobID
 * ถ้ายังไม่มี โฟลเดอร์ → สร้างใหม่ใน 02_SERVICE_PHOTOS
 */
function getJobPhotoFolder(jobId, customerName, phase) {
  var rootFolder = DriveApp.getFolderById(ROOT_FOLDER_ID);
  var folders = rootFolder.getFoldersByName('02_SERVICE_PHOTOS');
  var serviceFolder;
  if (folders.hasNext()) {
    serviceFolder = folders.next();
  } else {
    serviceFolder = rootFolder.createFolder('02_SERVICE_PHOTOS');
  }

  // หา/สร้าง phase folder
  if (!phase) phase = '00_สำรวจ';
  // แปลง emoji phase name ให้ตรงกับ folder structure
  var phaseFolderName = phase.replace('🔍 ', '').replace('🔧 ', '').replace('✅ ', '').replace('🛠️ ', '');
  var phaseFolders = serviceFolder.getFoldersByName(phaseFolderName);
  var phaseFolder;
  if (phaseFolders.hasNext()) {
    phaseFolder = phaseFolders.next();
  } else {
    phaseFolder = serviceFolder.createFolder(phaseFolderName);
  }

  // หา/สร้าง job folder: JXXXX_CustomerName
  var jobFolderName = jobId + '_' + (customerName || 'unknown').replace(/\s+/g, '_');
  var jobFolders = phaseFolder.getFoldersByName(jobFolderName);
  var jobFolder;
  if (jobFolders.hasNext()) {
    jobFolder = jobFolders.next();
  } else {
    jobFolder = phaseFolder.createFolder(jobFolderName);
  }

  return {
    id: jobFolder.getId(),
    url: jobFolder.getUrl(),
    name: jobFolderName,
    phase: phaseFolderName
  };
}

// ============================================================
// DB_PHOTO_QUEUE — CRUD
// ============================================================

function getPhotoQueueSheet() {
  var ss = getComphoneSheet();
  var sheet = findSheetByName(ss, 'DB_PHOTO_QUEUE');
  if (!sheet) {
    // สร้าง sheet ใหม่
    sheet = ss.insertSheet('DB_PHOTO_QUEUE');
    var headers = ['QueueID', 'FileID', 'FileName', 'FileURL', 'ThumbnailURL',
                    'JobID', 'TechName', 'Status', 'Timestamp',
                    'AILabel', 'AIPhase', 'AIIssues', 'JobPhotoURL', 'ProcessedTimestamp'];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    Logger.log('Created DB_PHOTO_QUEUE sheet');
  }
  return sheet;
}

function generateQueueId() {
  var sheet = getPhotoQueueSheet();
  var row = sheet.getLastRow();
  return 'Q' + String(Math.max(row, 1)).padStart(5, '0');
}

function saveToPhotoQueue(data) {
  var sheet = getPhotoQueueSheet();
  var qid = generateQueueId();
  sheet.appendRow([
    qid, data.fileId, data.fileName, data.fileUrl, data.thumbnailUrl,
    data.jobId, data.techName, data.status, data.timestamp,
    data.aiLabel, data.aiPhase, data.aiIssues, data.jobPhotoUrl || '', ''
  ]);
  return qid;
}

function getPendingPhotos() {
  var sheet = getPhotoQueueSheet();
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  var pending = [];
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][7]) === 'Pending') { // Status column
      pending.push({
        row: i + 1,
        queueId: String(data[i][0] || ''),
        fileId: String(data[i][1] || ''),
        fileName: String(data[i][2] || ''),
        fileUrl: String(data[i][3] || ''),
        jobId: String(data[i][5] || ''),
        techName: String(data[i][6] || ''),
        timestamp: String(data[i][8] || '')
      });
    }
  }
  return pending;
}

/**
 * อัปเดตสถานะใน queue หลัง AI วิเคราะห์แล้ว
 */
function updateQueueStatus(queueId, status, aiLabel, aiPhase, aiIssues, jobPhotoUrl) {
  var sheet = getPhotoQueueSheet();
  var data = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === queueId) {
      var row = i + 1;
      sheet.getRange(row, 8).setValue(status);  // H: Status
      if (aiLabel) sheet.getRange(row, 10).setValue(aiLabel);  // J: AILabel
      if (aiPhase) sheet.getRange(row, 11).setValue(aiPhase);  // K: AIPhase
      if (aiIssues) sheet.getRange(row, 12).setValue(aiIssues); // L: AIIssues
      if (jobPhotoUrl) sheet.getRange(row, 13).setValue(jobPhotoUrl); // M: JobPhotoURL
      sheet.getRange(row, 14).setValue(getThaiTimestamp()); // N: ProcessedTimestamp
      return { success: true, queueId: queueId };
    }
  }
  return { error: 'ไม่พบ QueueID: ' + queueId };
}

// ============================================================
// STEP 2: PROCESS IMAGE SORTING — AI ตรวจสอบ + ย้ายไฟล์
// ============================================================

/**
 * ฟังก์ชันหลัก: จัดการรูปภาพทั้งหมดที่ Pending
 * - ไล่ทีละรูป
 * - วิเคราะห์ด้วย Gemini
 * - ย้ายไฟล์ไปโฟลเดอร์งาน
 * - อัปเดต URL ลง DBJOBS
 * - ส่ง LINE Notify
 */
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

    // Delay เล็กน้อยไม่ให้เกิน rate limit
    Utilities.sleep(1000);
  }

  // สรุปผล
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

/**
 * ประมวลผลรูปเดียว: Gemini → ย้ายไฟล์ → อัปเดต DB → ส่ง Notify
 */
function _processSinglePhoto(photo) {
  try {
    Logger.log('Processing: ' + photo.queueId + ' - ' + photo.fileName + ' (Job: ' + photo.jobId + ')');

    // --- 1. วิเคราะห์ด้วย Gemini ---
    var aiResult = _analyzeQueuedPhoto(photo.fileId, photo);

    var aiLabel = '';
    var aiPhase = '00_สำรวจ';
    var aiIssues = '';

    if (aiResult && !aiResult.error) {
      aiLabel = aiResult.auto_label || '';
      aiPhase = _mapPhase(aiResult);
      aiIssues = (aiResult.quality_issues && aiResult.quality_issues.length > 0)
                  ? aiResult.quality_issues.join(', ') : '';
    }

    // --- 2. หาโฟลเดอร์งานจาก JobID ---
    var jobInfo = _getJobInfo(photo.jobId);
    var customerName = jobInfo ? jobInfo.customer : '';

    var folderInfo = getJobPhotoFolder(photo.jobId, customerName, aiPhase);

    // --- 3. ย้ายไฟล์จาก Temp ไปโฟลเดอร์งาน ---
    var file = DriveApp.getFileById(photo.fileId);
    var tempFolder = getOrCreateTempFolder();

    // เพิ่มโฟลเดอร์งาน แล้วเอาออกจาก Temp
    DriveApp.getFolderById(folderInfo.id).addFile(file);
    tempFolder.removeFile(file);

    var newFileUrl = file.getUrl();
    var thumbnailUrl = file.getDownloadUrl();

    Logger.log('Moved to: ' + folderInfo.name + ' | ' + newFileUrl);

    // --- 4. อัปเดต URL ลง DBJOBS (Photo Link column) ---
    var updatedJob = false;
    if (photo.jobId) {
      updatedJob = _appendPhotoToJob(photo.jobId, file);
    }

    // --- 5. อัปเดตสถานะใน Photo Queue ---
    updateQueueStatus(
      photo.queueId,
      'Processed',
      aiLabel,
      aiPhase,
      aiIssues,
      newFileUrl
    );

    // --- 6. ส่ง LINE Notify ---
    var notifyMsg = _buildPhotoNotification(photo, aiResult, folderInfo, updatedJob, customerName || '');
    try {
      sendLineNotify({ message: notifyMsg, room: 'TECHNICIAN' });
    } catch(e) {
      Logger.log('Notify failed: ' + e);
    }

    return {
      success: true,
      queueId: photo.queueId,
      jobId: photo.jobId,
      customerName: customerName,
      fileName: photo.fileName,
      aiLabel: aiLabel,
      aiPhase: aiPhase,
      folderUrl: folderInfo.url,
      photoUrl: newFileUrl,
      jobPhotoUpdated: updatedJob
    };

  } catch (e) {
    Logger.log('_processSinglePhoto error: ' + e);
    updateQueueStatus(photo.queueId, 'Error', '', '', e.toString(), '');
    return { success: false, queueId: photo.queueId, error: e.toString() };
  }
}

/**
 * วิเคราะห์รูปจาก Drive File โดยใช้ Gemini
 */
function _analyzeQueuedPhoto(fileId, photo) {
  var apiKey = getConfig('GEMINI_API_KEY') || getConfig('GOOGLE_AI_API_KEY') || '';
  if (!apiKey) {
    return { error: 'GEMINI_API_KEY not configured', auto_label: 'ยังไม่ตั้งค่า API Key' };
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
    return { error: 'AI วิเคราะห์ไม่ได้: ' + e.toString() };
  }
}

/**
 * แปลงผล Gemini -> Phase name
 */
function _mapPhase(analysis) {
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

/**
 * ดึงข้อมูลงานจาก DBJOBS
 */
function _getJobInfo(jobId) {
  if (!jobId) return null;
  try {
    var ss = getComphoneSheet();
    var jsh = findSheetByName(ss, 'DBJOBS');
    if (!jsh) return null;

    var data = jsh.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]) === jobId) {
        return {
          id: String(data[i][0]),
          customer: String(data[i][1]),
          symptom: String(data[i][2]),
          status: String(data[i][3]),
          tech: String(data[i][4] || ''),
          folder: String(data[i].length > 12 ? data[i][12] : '')
        };
      }
    }
  } catch (e) {
    Logger.log('_getJobInfo error: ' + e);
  }
  return null;
}

/**
 * เพิ่ม URL รูปเข้าไปใน DBJOBS (Photo Link column)
 * ถ้ามีรูปเก่าอยู่แล้ว → คั่นด้วย comma
 */
function _appendPhotoToJob(jobId, file) {
  try {
    var ss = getComphoneSheet();
    var jsh = findSheetByName(ss, 'DBJOBS');
    if (!jsh) return false;

    var data = jsh.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]) === jobId) {
        var row = i + 1;
        // Column H (index 7) = รูปถ่าย, Column I (index 8) = ลิงก์รูปภาพ
        var currentLink = String(data[i].length > 8 ? data[i][8] : '');
        var newLink = currentLink ? currentLink + ', ' + file.getUrl() : file.getUrl();
        jsh.getRange(row, 9).setValue(newLink); // I = ลิงก์รูปภาพ

        // อัปเดตโฟลเดอร์ลิงก์ด้วย
        var folder = _getJobFolderFromUrl(newLink);
        if (folder && folder.id) {
          jsh.getRange(row, 13).setValue(folder.url); // M = ลิงก์โฟลเดอร์งาน
        }
        return true;
      }
    }
  } catch (e) {
    Logger.log('_appendPhotoToJob error: ' + e);
  }
  return false;
}

function _getJobFolderFromUrl(url) {
  try {
    if (!url) return null;
    var file = DriveApp.getFileById(url.split('/d/')[1].split('/')[0]);
    var parent = file.getParents();
    if (parent.hasNext()) {
      var folder = parent.next();
      return { id: folder.getId(), url: folder.getUrl() };
    }
  } catch (e) {}
  return null;
}

// ============================================================
// LINE NOTIFICATION TEMPLATE
// ============================================================

function _buildPhotoNotification(photo, aiResult, folderInfo, jobUpdated, customerName) {
  var msg = '📸 จัดการรูปภาพสำเร็จ!\n\n';
  msg += '👤 ลูกค้า: ' + (customerName || photo.jobId) + '\n';
  msg += '🔧 งาน: ' + (photo.jobId || 'ไม่ระบุ') + '\n';
  msg += '👷 ช่าง: ' + (photo.techName || 'ไม่ระบุ') + '\n';
  msg += '🏷️ AI Tag: ' + (aiResult && aiResult.auto_label ? aiResult.auto_label : '-') + '\n';
  msg += '📂 Phase: ' + (aiResult ? _mapPhase(aiResult) : '-');

  if (aiResult && aiResult.installation_quality) {
    msg += '\n📊 คุณภาพ: ' + aiResult.installation_quality;
  }

  if (aiResult && aiResult.quality_issues && aiResult.quality_issues.length > 0) {
    msg += '\n⚠️ ปัญหา: ' + aiResult.quality_issues.join(', ');
  }

  msg += '\n📁 โฟลเดอร์: ' + (folderInfo ? folderInfo.name : '-');
  msg += '\n\n' + folderInfo.url;

  // Dashboard link
  var dashUrl = LINE_GAS_URL || 'https://script.google.com/macros/s/AKfycbwHcXfYXRd8S9ZnUYcHxHlNy7vxRcuGZvdptho93Hu0KOrqbKmi54lTUpSnwy4Zt5dFwQ/exec';
  msg += '\n\n📊 ดู Dashboard: ' + dashUrl;

  if (photo.jobId) {
    msg += '\n📸 เพิ่มรูป: ' + dashUrl + '?action=openjob&id=' + photo.jobId;
  }

  return msg;
}

// ============================================================
// DASHBOARD API — จำนวนรูปที่ Pending
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
