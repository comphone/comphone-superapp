/**
 * DriveSync.gs — COMPHONE SUPER APP V5.5
 * =========================================================
 * Sync โค้ดและ session.md ขึ้น Google Drive อัตโนมัติ
 * 
 * ฟังก์ชันหลัก:
 *   syncCodeToDrive()         — sync ไฟล์โค้ดทั้งหมดขึ้น Drive
 *   backupSessionToDrive()    — backup session.md ขึ้น Drive
 *   receiveCodeSync()         — รับ payload จาก Python script (via doPost)
 *   setupDriveSyncTrigger()   — ตั้ง time trigger อัตโนมัติ
 *   getDriveSyncStatus()      — ดูสถานะ sync ล่าสุด
 */

// ─── Config ────────────────────────────────────────────────
var DRIVE_SYNC_CONFIG = {
  BACKUP_FOLDER_NAME:  'COMPHONE_Backups',
  CODE_FOLDER_NAME:    'COMPHONE_Code',
  SESSION_FOLDER_NAME: 'COMPHONE_Session',
  MAX_BACKUPS:         30,       // เก็บ backup สูงสุด 30 ไฟล์
  SYNC_INTERVAL_HOURS: 1,        // sync ทุก 1 ชั่วโมง
  PROP_KEY_LAST_SYNC:  'DRIVE_LAST_SYNC',
  PROP_KEY_FOLDER_IDS: 'DRIVE_FOLDER_IDS',
};

// ─── Folder Management ─────────────────────────────────────

/**
 * หรือสร้าง folder ใน Google Drive
 * @param {string} folderName
 * @param {Folder} parentFolder - optional
 * @returns {Folder}
 */
function getOrCreateFolder_(folderName, parentFolder) {
  var parent = parentFolder || DriveApp.getRootFolder();
  var folders = parent.getFoldersByName(folderName);
  if (folders.hasNext()) {
    return folders.next();
  }
  return parent.createFolder(folderName);
}

/**
 * ดึง/สร้าง folder structure สำหรับ COMPHONE backups
 * @returns {Object} { root, code, session, backups }
 */
function getDriveFolders_() {
  var props = PropertiesService.getScriptProperties();
  var cached = props.getProperty(DRIVE_SYNC_CONFIG.PROP_KEY_FOLDER_IDS);
  
  if (cached) {
    try {
      var ids = JSON.parse(cached);
      // ตรวจสอบว่า folder ยังมีอยู่
      DriveApp.getFolderById(ids.root);
      return {
        root:    DriveApp.getFolderById(ids.root),
        code:    DriveApp.getFolderById(ids.code),
        session: DriveApp.getFolderById(ids.session),
        backups: DriveApp.getFolderById(ids.backups),
      };
    } catch(e) {
      // folder ถูกลบ — สร้างใหม่
      props.deleteProperty(DRIVE_SYNC_CONFIG.PROP_KEY_FOLDER_IDS);
    }
  }
  
  // สร้าง folder structure ใหม่
  var root    = getOrCreateFolder_(DRIVE_SYNC_CONFIG.BACKUP_FOLDER_NAME);
  var code    = getOrCreateFolder_(DRIVE_SYNC_CONFIG.CODE_FOLDER_NAME, root);
  var session = getOrCreateFolder_(DRIVE_SYNC_CONFIG.SESSION_FOLDER_NAME, root);
  var backups = getOrCreateFolder_('Backups', root);
  
  // Cache folder IDs
  props.setProperty(DRIVE_SYNC_CONFIG.PROP_KEY_FOLDER_IDS, JSON.stringify({
    root:    root.getId(),
    code:    code.getId(),
    session: session.getId(),
    backups: backups.getId(),
  }));
  
  return { root, code, session, backups };
}

// ─── File Sync Helpers ─────────────────────────────────────

/**
 * อัปโหลดหรืออัปเดตไฟล์ใน Drive folder
 * @param {Folder} folder
 * @param {string} fileName
 * @param {string} content
 * @param {string} mimeType
 * @returns {File}
 */
function upsertFile_(folder, fileName, content, mimeType) {
  mimeType = mimeType || MimeType.PLAIN_TEXT;
  var blob = Utilities.newBlob(content, mimeType, fileName);
  
  // ตรวจสอบว่าไฟล์มีอยู่แล้วหรือไม่
  var files = folder.getFilesByName(fileName);
  if (files.hasNext()) {
    var existing = files.next();
    existing.setContent(content);
    return existing;
  }
  return folder.createFile(blob);
}

/**
 * ลบไฟล์เก่าเกิน maxCount ไฟล์ใน folder
 * @param {Folder} folder
 * @param {string} prefix - prefix ของชื่อไฟล์
 * @param {number} maxCount
 */
function cleanOldFiles_(folder, prefix, maxCount) {
  var files = [];
  var iter = folder.getFiles();
  while (iter.hasNext()) {
    var f = iter.next();
    if (f.getName().startsWith(prefix)) {
      files.push({ file: f, date: f.getDateCreated() });
    }
  }
  
  // เรียงตามวันที่เก่าสุดก่อน
  files.sort(function(a, b) { return a.date - b.date; });
  
  // ลบไฟล์เก่าที่เกิน maxCount
  var toDelete = files.length - maxCount;
  for (var i = 0; i < toDelete; i++) {
    files[i].file.setTrashed(true);
  }
  
  return toDelete > 0 ? toDelete : 0;
}

// ─── Main Sync Functions ───────────────────────────────────

/**
 * Backup session.md ขึ้น Google Drive
 * เรียกจาก: triple_backup.py, SessionBackup.gs, หรือ trigger
 * @param {string} content - เนื้อหา session.md
 * @returns {Object} { success, fileName, folderId, url }
 */
function backupSessionToDrive(content) {
  try {
    var folders = getDriveFolders_();
    var timestamp = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyyMMdd_HHmm');
    
    // บันทึกไฟล์ timestamp
    var tsFileName = 'session_' + timestamp + '.md';
    var tsFile = upsertFile_(folders.backups, tsFileName, content);
    
    // อัปเดต session_latest.md
    var latestFile = upsertFile_(folders.session, 'session_latest.md', content);
    
    // ลบไฟล์เก่า
    var deleted = cleanOldFiles_(folders.backups, 'session_', DRIVE_SYNC_CONFIG.MAX_BACKUPS);
    
    // บันทึก timestamp ล่าสุด
    PropertiesService.getScriptProperties().setProperty(
      DRIVE_SYNC_CONFIG.PROP_KEY_LAST_SYNC,
      new Date().toISOString()
    );
    
    _logInfo_('DriveSync:sessionBackup', 'Session backup complete', { file: tsFileName, deleted: deleted });
    
    return {
      success:  true,
      fileName: tsFileName,
      latestId: latestFile.getId(),
      folderId: folders.backups.getId(),
      url:      latestFile.getUrl(),
      deleted:  deleted,
    };
  } catch(e) {
    _logError_('MEDIUM', 'DriveSync:sessionBackup', e);
    return { success: false, error: e.message };
  }
}

/**
 * Sync ไฟล์โค้ดที่ส่งมาจาก Python script ขึ้น Drive
 * @param {Object} payload - { files: [{name, content, folder}], version, timestamp }
 * @returns {Object} { success, synced, errors }
 */
function syncCodeFiles_(payload) {
  try {
    var folders = getDriveFolders_();
    var synced = [];
    var errors = [];
    var version = payload.version || 'unknown';
    var timestamp = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyyMMdd_HHmm');
    
    // สร้าง version folder
    var versionFolder = getOrCreateFolder_('v' + version + '_' + timestamp, folders.code);
    
    var files = payload.files || [];
    files.forEach(function(fileInfo) {
      try {
        var targetFolder = versionFolder;
        
        // สร้าง sub-folder ถ้าระบุ
        if (fileInfo.folder) {
          targetFolder = getOrCreateFolder_(fileInfo.folder, versionFolder);
        }
        
        var file = upsertFile_(targetFolder, fileInfo.name, fileInfo.content);
        synced.push({ name: fileInfo.name, id: file.getId(), url: file.getUrl() });
      } catch(e) {
        errors.push({ name: fileInfo.name, error: e.message });
      }
    });
    
    // สร้าง index.json สรุปไฟล์ทั้งหมด
    var indexContent = JSON.stringify({
      version:   version,
      timestamp: new Date().toISOString(),
      files:     synced.map(function(f) { return f.name; }),
      total:     synced.length,
    }, null, 2);
    upsertFile_(versionFolder, '_index.json', indexContent, MimeType.PLAIN_TEXT);
    
    // ลบ version folder เก่า (เก็บ 10 versions)
    cleanOldFiles_(folders.code, 'v', 10);
    
    _logInfo_('DriveSync:codeSync', 'Code sync complete', { synced: synced.length, errors: errors.length });
    
    return {
      success:   errors.length === 0,
      synced:    synced.length,
      errors:    errors,
      folderId:  versionFolder.getId(),
      folderUrl: versionFolder.getUrl(),
    };
  } catch(e) {
    _logError_('MEDIUM', 'DriveSync:codeSync', e);
    return { success: false, error: e.message };
  }
}

// ─── HTTP Endpoint (รับจาก Python) ────────────────────────

/**
 * รับ payload จาก Python drive_sync.py ผ่าน doPost
 * เพิ่มใน Router.gs: case 'syncCodeToDrive': return DriveSync_receiveSync(payload);
 * @param {Object} payload
 * @returns {Object}
 */
function DriveSync_receiveSync(payload) {
  var action = payload.sync_action || 'session';
  
  if (action === 'session') {
    var content = payload.content || '';
    if (!content) return { success: false, error: 'No content provided' };
    return backupSessionToDrive(content);
  }
  
  if (action === 'code') {
    return syncCodeFiles_(payload);
  }
  
  return { success: false, error: 'Unknown sync_action: ' + action };
}

// ─── Status & Info ─────────────────────────────────────────

/**
 * ดูสถานะ Drive Sync ล่าสุด
 * @returns {Object}
 */
function getDriveSyncStatus() {
  try {
    var props = PropertiesService.getScriptProperties();
    var lastSync = props.getProperty(DRIVE_SYNC_CONFIG.PROP_KEY_LAST_SYNC);
    var folders = getDriveFolders_();
    
    // นับไฟล์ backup
    var backupCount = 0;
    var iter = folders.backups.getFiles();
    while (iter.hasNext()) { iter.next(); backupCount++; }
    
    return {
      success:       true,
      lastSync:      lastSync || 'Never',
      backupCount:   backupCount,
      maxBackups:    DRIVE_SYNC_CONFIG.MAX_BACKUPS,
      folderUrl:     folders.root.getUrl(),
      sessionUrl:    folders.session.getUrl(),
      codeUrl:       folders.code.getUrl(),
    };
  } catch(e) {
    return { success: false, error: e.message };
  }
}

// ─── Triggers ──────────────────────────────────────────────

/**
 * ตั้งค่า Time Trigger สำหรับ Drive Sync อัตโนมัติ
 * รันครั้งเดียวใน GAS Editor
 */
function setupDriveSyncTrigger() {
  // ลบ trigger เก่า
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === 'autoSyncToDrive') {
      ScriptApp.deleteTrigger(t);
    }
  });
  
  // สร้าง trigger ใหม่ — ทุก 1 ชั่วโมง
  ScriptApp.newTrigger('autoSyncToDrive')
    .timeBased()
    .everyHours(DRIVE_SYNC_CONFIG.SYNC_INTERVAL_HOURS)
    .create();
  
  Logger.log('✅ Drive Sync trigger set: every ' + DRIVE_SYNC_CONFIG.SYNC_INTERVAL_HOURS + ' hour(s)');
}

/**
 * ฟังก์ชันที่ trigger เรียก — sync session.md ล่าสุดจาก PropertiesService
 */
function autoSyncToDrive() {
  var props = PropertiesService.getScriptProperties();
  var sessionContent = props.getProperty('SESSION_MD_CONTENT');
  
  if (!sessionContent) {
    Logger.log('ℹ️ autoSyncToDrive: No session content to sync');
    return;
  }
  
  var result = backupSessionToDrive(sessionContent);
  Logger.log('autoSyncToDrive result: ' + JSON.stringify(result));
}

/**
 * บันทึก session.md content ไว้ใน PropertiesService เพื่อให้ trigger ใช้ได้
 * เรียกจาก Python หลัง sync
 * @param {string} content
 */
function storeSessionContent(content) {
  if (content && content.length > 0) {
    PropertiesService.getScriptProperties().setProperty('SESSION_MD_CONTENT', content);
    return { success: true };
  }
  return { success: false, error: 'Empty content' };
}

// ─── Router Integration ────────────────────────────────────
// เพิ่มใน Router.gs:
//   case 'syncCodeToDrive':   return DriveSync_receiveSync(payload);
//   case 'getDriveSyncStatus': return getDriveSyncStatus();
//   case 'storeSessionContent': return storeSessionContent(payload.content);
