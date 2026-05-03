/**
 * AutoBackupV2.gs — Phase 34: Automated Backup & Recovery System
 * Features: Incremental Backup, One-Click Recovery, Backup Health Check
 * Version: v5.12.0-phase34
 * Date: 2026-05-01
 */

// Backup configuration
var BACKUP_CONFIG = {
  interval_hours: 6,
  keep_daily: 7,    // Keep last 7 daily backups
  keep_weekly: 4,   // Keep last 4 weekly backups
  keep_monthly: 3,  // Keep last 3 monthly backups
  backup_folder_name: 'COMPHONE_BACKUPS',
  sheets_to_backup: [
    'DB_JOBS', 'DB_INVENTORY', 'DB_CUSTOMERS', 
    'DB_BILLING', 'DB_STOCK_MOVEMENTS', 'DB_JOB_ITEMS',
    'DB_PHOTO_QUEUE', 'DB_PURCHASE_ORDERS', 'DB_ATTENDANCE',
    'DB_AFTER_SALES', 'DB_JOB_LOGS', 'DB_USERS', 'DB_ACTIVITY_LOG'
  ]
};

/**
 * สร้าง incremental backup (เรียกทุก 6 ชั่วโมง via Trigger)
 * เรียกใช้โดย: action = 'createBackup'
 */
function createBackup() {
  try {
    var startTime = new Date();
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var backupFolder = getBackupFolder_();
    
    // Create timestamp-based backup name
    var timestamp = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd_HHmm');
    var backupFolderName = 'backup_' + timestamp;
    
    var newBackupFolder = backupFolder.createFolder(backupFolderName);
    
    var backupResults = {
      timestamp: timestamp,
      folder_id: newBackupFolder.getId(),
      folder_url: newBackupFolder.getUrl(),
      sheets_backed_up: 0,
      total_rows: 0,
      errors: [],
      duration_ms: 0
    };
    
    // Backup each sheet
    BACKUP_CONFIG.sheets_to_backup.forEach(function(sheetName) {
      try {
        var sheet = ss.getSheetByName(sheetName);
        if (!sheet) {
          backupResults.errors.push('Sheet not found: ' + sheetName);
          return;
        }
        
        var data = sheet.getDataRange().getValues();
        var rowCount = data.length;
        
        // Convert to CSV
        var csv = arrayToCsv_(data);
        
        // Save as CSV file
        var fileName = sheetName + '_' + timestamp + '.csv';
        newBackupFolder.createFile(fileName, csv, MimeType.CSV);
        
        backupResults.sheets_backed_up++;
        backupResults.total_rows += rowCount;
        
      } catch (e) {
        backupResults.errors.push('Error backing up ' + sheetName + ': ' + e.toString());
      }
    });
    
    // Save backup metadata
    var metadata = {
      version: 'v5.12.0-phase34',
      timestamp: timestamp,
      sheets_backed_up: backupResults.sheets_backed_up,
      total_rows: backupResults.total_rows,
      errors: backupResults.errors,
      backup_type: 'incremental'
    };
    
    newBackupFolder.createFile('backup_metadata.json', JSON.stringify(metadata, null, 2), MimeType.PLAIN_TEXT);
    
    // Clean up old backups
    cleanupOldBackups_(backupFolder);
    
    backupResults.duration_ms = new Date().getTime() - startTime.getTime();
    
    // Log backup result
    logBackupActivity_('CREATE', backupResults);
    
    return {
      success: true,
      message: 'Backup created successfully',
      backup: backupResults
    };
    
  } catch (e) {
    return {
      success: false,
      error: e.toString()
    };
  }
}

/**
 * รายการ backups ทั้งหมด
 * เรียกใช้โดย: action = 'listBackups'
 */
function listBackups() {
  try {
    var backupFolder = getBackupFolder_();
    var subFolders = backupFolder.getFolders();
    
    var backups = [];
    
    while (subFolders.hasNext()) {
      var folder = subFolders.next();
      var folderName = folder.getName();
      
      // Skip non-backup folders
      if (!folderName.startsWith('backup_')) continue;
      
      // Try to read metadata
      var files = folder.getFilesByName('backup_metadata.json');
      var metadata = null;
      
      if (files.hasNext()) {
        var file = files.next();
        try {
          metadata = JSON.parse(file.getBlob().getDataAsString());
        } catch (e) {
          // Ignore parse errors
        }
      }
      
      backups.push({
        name: folderName,
        id: folder.getId(),
        url: folder.getUrl(),
        created: folder.getDateCreated().toISOString(),
        metadata: metadata
      });
    }
    
    // Sort by date (newest first)
    backups.sort(function(a, b) {
      return new Date(b.created) - new Date(a.created);
    });
    
    return {
      success: true,
      count: backups.length,
      backups: backups
    };
    
  } catch (e) {
    return {
      success: false,
      error: e.toString()
    };
  }
}

/**
 * ตรวจสอบ backup health (เรียกทุกวัน via Trigger)
 * เรียกใช้โดย: action = 'checkBackupHealth'
 */
function checkBackupHealth() {
  try {
    var result = listBackups();
    
    if (!result.success) {
      return {
        success: false,
        error: result.error,
        health: 'ERROR'
      };
    }
    
    var backups = result.backups;
    var now = new Date();
    var health = {
      status: 'HEALTHY',
      latest_backup: null,
      hours_since_last: null,
      total_backups: backups.length,
      issues: []
    };
    
    if (backups.length === 0) {
      health.status = 'CRITICAL';
      health.issues.push('No backups found');
    } else {
      var latest = backups[0];
      health.latest_backup = latest;
      
      var lastBackupTime = new Date(latest.created);
      var hoursSince = (now - lastBackupTime) / (1000 * 60 * 60);
      health.hours_since_last = Math.round(hoursSince * 100) / 100;
      
      // Check if backup is too old (> 12 hours)
      if (hoursSince > 12) {
        health.status = 'WARNING';
        health.issues.push('Last backup is ' + Math.round(hoursSince) + ' hours old (> 12 hours)');
      }
      
      // Check for errors in latest backup
      if (latest.metadata && latest.metadata.errors && latest.metadata.errors.length > 0) {
        health.status = 'WARNING';
        health.issues.push('Latest backup has ' + latest.metadata.errors.length + ' errors');
      }
    }
    
    // Log health check
    logBackupActivity_('HEALTH_CHECK', health);
    
    return {
      success: true,
      health: health
    };
    
  } catch (e) {
    return {
      success: false,
      error: e.toString(),
      health: 'ERROR'
    };
  }
}

/**
 * กู้คืนข้อมูลจาก backup (One-Click Recovery)
 * เรียกใช้โดย: action = 'restoreBackup' & backupId=FOLDER_ID
 */
function restoreBackup(backupId) {
  try {
    var drive = DriveApp;
    var backupFolder = drive.getFolderById(backupId);
    
    if (!backupFolder) {
      return {
        success: false,
        error: 'Backup folder not found: ' + backupId
      };
    }
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var restorationLog = {
      backup_id: backupId,
      backup_name: backupFolder.getName(),
      sheets_restored: 0,
      errors: [],
      timestamp: new Date().toISOString()
    };
    
    // Get all CSV files in backup folder
    var files = backupFolder.getFiles();
    
    while (files.hasNext()) {
      var file = files.next();
      var fileName = file.getName();
      
      // Skip metadata file
      if (fileName === 'backup_metadata.json') continue;
      
      // Parse sheet name from filename (format: SHEET_NAME_timestamp.csv)
      var match = fileName.match(/^(.+?)_\d{4}-\d{2}-\d{2}_\d{4}\.csv$/);
      if (!match) continue;
      
      var sheetName = match[1];
      
      try {
        // Read CSV data
        var csvData = file.getBlob().getDataAsString();
        var data = csvToArray_(csvData);
        
        if (data.length === 0) continue;
        
        // Get or create sheet
        var sheet = ss.getSheetByName(sheetName);
        if (!sheet) {
          sheet = ss.insertSheet(sheetName);
        } else {
          // Clear existing data
          sheet.clear();
        }
        
        // Write data to sheet
        sheet.getRange(1, 1, data.length, data[0].length).setValues(data);
        
        restorationLog.sheets_restored++;
        
      } catch (e) {
        restorationLog.errors.push('Error restoring ' + sheetName + ': ' + e.toString());
      }
    }
    
    // Log restoration
    logBackupActivity_('RESTORE', restorationLog);
    
    return {
      success: true,
      message: 'Backup restored successfully',
      restoration: restorationLog
    };
    
  } catch (e) {
    return {
      success: false,
      error: e.toString()
    };
  }
}

/**
 * Helper: Get or create backup folder
 */
function getBackupFolder_() {
  var drive = DriveApp;
  var folderName = BACKUP_CONFIG.backup_folder_name;
  
  var folders = drive.getFoldersByName(folderName);
  if (folders.hasNext()) {
    return folders.next();
  }
  
  return drive.createFolder(folderName);
}

/**
 * Helper: Clean up old backups based on retention policy
 */
function cleanupOldBackups_(parentFolder) {
  var subFolders = parentFolder.getFolders();
  var backups = [];
  
  // Collect all backup folders
  while (subFolders.hasNext()) {
    var folder = subFolders.next();
    if (folder.getName().startsWith('backup_')) {
      backups.push(folder);
    }
  }
  
  // Sort by date (newest first)
  backups.sort(function(a, b) {
    return new Date(b.getDateCreated()) - new Date(a.getDateCreated());
  });
  
  // Keep only the latest N backups (daily retention)
  var toDelete = backups.slice(BACKUP_CONFIG.keep_daily);
  
  toDelete.forEach(function(folder) {
    try {
      folder.setTrashed(true); // Move to trash
    } catch (e) {
      // Ignore delete errors
    }
  });
}

/**
 * Helper: Convert 2D array to CSV string
 */
function arrayToCsv_(data) {
  return data.map(function(row) {
    return row.map(function(cell) {
      var str = String(cell || '');
      // Escape quotes and wrap in quotes if needed
      if (str.indexOf(',') >= 0 || str.indexOf('"') >= 0 || str.indexOf('\n') >= 0) {
        return '"' + str.replace(/"/g, '""') + '"';
      }
      return str;
    }).join(',');
  }).join('\n');
}

/**
 * Helper: Convert CSV string to 2D array
 */
function csvToArray_(csv) {
  var lines = csv.split('\n');
  return lines.map(function(line) {
    // Simple CSV parse (doesn't handle quoted commas perfectly)
    return line.split(',').map(function(cell) {
      // Remove surrounding quotes
      if (cell.startsWith('"') && cell.endsWith('"')) {
        return cell.slice(1, -1).replace(/""/g, '"');
      }
      return cell;
    });
  });
}

/**
 * Helper: Log backup activity
 */
function logBackupActivity_(action, data) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('DB_ACTIVITY_LOG');
    if (!sheet) return;
    
    sheet.appendRow([
      new Date().toISOString(),
      'BACKUP',
      action,
      JSON.stringify(data).substring(0, 500),
      Session.getActiveUser().getEmail() || 'system'
    ]);
  } catch (e) {
    // Ignore logging errors
  }
}

/**
 * API Endpoint: Create Backup
 * Called from Router.gs: action = 'createbackup'
 */
function createBackupAPI(params) {
  return createBackup();
}

/**
 * API Endpoint: List Backups
 * Called from Router.gs: action = 'listbackups'
 */
function listBackupsAPI(params) {
  return listBackups();
}

/**
 * API Endpoint: Check Backup Health
 * Called from Router.gs: action = 'checkbackuphealth'
 */
function checkBackupHealthAPI(params) {
  return checkBackupHealth();
}

/**
 * API Endpoint: Restore Backup
 * Called from Router.gs: action = 'restorebackup' & backupId=...
 */
function restoreBackupAPI(params) {
  var backupId = params.backupId || params.backup_id || '';
  if (!backupId) {
    return { success: false, error: 'Missing backupId parameter' };
  }
  return restoreBackup(backupId);
}

/**
 * Setup backup triggers (call once to initialize)
 * Creates time-based trigger for incremental backup every 6 hours
 */
function setupBackupTriggers() {
  try {
    // Delete existing backup triggers
    ScriptApp.getProjectTriggers().forEach(function(trigger) {
      if (trigger.getHandlerFunction() === 'createBackup') {
        ScriptApp.deleteTrigger(trigger);
      }
    });
    
    // Create new trigger (every 6 hours)
    ScriptApp.newTrigger('createBackup')
      .timeBased()
      .everyHours(6)
      .create();
    
    return {
      success: true,
      message: 'Backup triggers created (every 6 hours)'
    };
    
  } catch (e) {
    return {
      success: false,
      error: e.toString()
    };
  }
}
