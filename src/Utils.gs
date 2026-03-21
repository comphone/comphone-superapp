// มาตรฐาน Response
function apiSuccess(action, data) {
  return { success: true, action: action, ...data };
}

function apiError(action, code, message, details) {
  return {
    success: false,
    action: action || 'unknown',
    errorCode: code || 'UNKNOWN_ERROR',
    message: message || 'เกิดข้อผิดพลาด',
    details: details || {}
  };
}

// งานระบบไฟล์ Drive
function getOrCreateJobFolder(jobId) {
  let rootFolder = DriveApp.getFolderById(CONFIG.DRIVE_ROOT_ID);
  let folders = rootFolder.getFoldersByName(jobId);
  if (folders.hasNext()) return folders.next();
  return rootFolder.createFolder(jobId); 
}

function convertBase64ToBlob(base64Image, fileName) {
  let contentType = base64Image.substring(5, base64Image.indexOf(';'));
  let bytes = Utilities.base64Decode(base64Image.split(',')[1]);
  return Utilities.newBlob(bytes, contentType, fileName);
}