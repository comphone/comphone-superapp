// ============================================================
// COMPHONE SUPER APP v5.9.0-phase2d — Backup.gs
// Auto-backup to Google Drive
// ============================================================

function backupToDrive() {
  try {
    const folderId = "1cExEgiIwmhBxZvLQpv10Wvq71ZTp4PfN";
    let folder;
    try {
      folder = DriveApp.getFolderById(folderId);
    } catch (e) {
      // Fallback: use root if folder not found
      folder = DriveApp.getRootFolder();
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const url = ss.getUrl();
    const name = ss.getName();

    const content = JSON.stringify({
      timestamp: new Date().toISOString(),
      system: "COMPHONE v16.1.1",
      spreadsheet: name,
      spreadsheetUrl: url,
      note: "AUTO BACKUP"
    }, null, 2);

    const fileName = "backup_" + Date.now() + "_comphone.json";
    const file = folder.createFile(fileName, content, MimeType.JSON);

    return {
      success: true,
      fileName: fileName,
      fileUrl: file.getUrl(),
      folderId: folderId
    };
  } catch (e) {
    return {
      success: false,
      error: e.toString()
    };
  }
}
