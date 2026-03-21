// ==========================================
// Utils.gs
// COMPHONE SUPER APP - UTILITIES
// ==========================================

const INVENTORY_SCHEMA = {
  DB_INVENTORY: [
    'ItemID',
    'SKU',
    'ชื่อสินค้า',
    'หมวดหมู่',
    'หน่วย',
    'จำนวนคงเหลือ',
    'MinStock',
    'ต้นทุนเฉลี่ย',
    'ราคาขาย',
    'SerialRequired',
    'สถานะ'
  ],
  DB_STOCK_MOVEMENTS: [
    'MoveID',
    'วันที่เวลา',
    'JobID',
    'ItemID',
    'SKU',
    'ชื่อสินค้า',
    'ประเภท',
    'จำนวน',
    'หน่วย',
    'SerialNumber',
    'หมายเหตุ',
    'ผู้ทำรายการ',
    'อ้างอิงเอกสาร'
  ],
  DB_JOB_ITEMS: [
    'JobItemID',
    'JobID',
    'ItemID',
    'SKU',
    'ชื่อสินค้า',
    'จำนวน',
    'หน่วย',
    'SerialNumber',
    'ประเภท',
    'หมายเหตุ',
    'ผู้ทำรายการ',
    'วันที่เวลา',
    'สถานะรายการ'
  ],
  DB_SYSTEM_LOGS: [
    'LogID',
    'วันที่เวลา',
    'โมดูล',
    'ข้อความ',
    'รายละเอียด',
    'StackTrace'
  ]
};

function apiSuccess(action, data) {
  return Object.assign({ success: true, action: action }, data || {});
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

function getSheet(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error('ไม่พบชีท: ' + sheetName);
  return sheet;
}

function tryGetSheet(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(sheetName);
}

function ensureSheetWithHeaders(sheetName, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) sheet = ss.insertSheet(sheetName);

  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();
  const currentHeaders = (lastRow >= 1 && lastColumn >= 1)
    ? sheet.getRange(1, 1, 1, lastColumn).getValues()[0]
    : [];

  const same = headers.length === currentHeaders.length && headers.every(function(h, i) {
    return String(currentHeaders[i] || '') === String(h);
  });

  if (!same) {
    sheet.clear();
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }

  return sheet;
}

function ensureSystemLogSheetReady() {
  return ensureSheetWithHeaders('DB_SYSTEM_LOGS', INVENTORY_SCHEMA.DB_SYSTEM_LOGS);
}

function logSystemError(moduleName, err, details) {
  try {
    const sheet = ensureSystemLogSheetReady();
    const row = [
      'LOG-' + formatDateBkk(new Date(), 'yyyyMMdd-HHmmss') + '-' + Math.floor(Math.random() * 9000 + 1000),
      formatDateBkk(new Date(), 'yyyy-MM-dd HH:mm:ss'),
      safeTrim(moduleName),
      safeTrim(err && err.message ? err.message : err),
      JSON.stringify(details || {}),
      err && err.stack ? String(err.stack) : ''
    ];
    sheet.appendRow(row);
  } catch (loggingError) {
    console.error('logSystemError failed: ' + loggingError.message);
  }
}

function mapRowByHeaders(headers, row, rowNumber) {
  const obj = {};
  headers.forEach(function(h, i) {
    obj[h] = row[i];
  });
  obj.__rowNumber = rowNumber || null;
  return obj;
}

function _appendRowByHeaders(sheet, headers, dataObj) {
  const row = headers.map(function(header) {
    return dataObj && Object.prototype.hasOwnProperty.call(dataObj, header) ? dataObj[header] : '';
  });
  sheet.appendRow(row);
}

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

function formatDateBkk(date, format) {
  return Utilities.formatDate(date || new Date(), 'GMT+7', format || 'yyyy-MM-dd');
}

function safeTrim(value) {
  return String(value == null ? '' : value).trim();
}

function toNumber(value) {
  if (value === null || value === undefined || value === '') return 0;
  const n = Number(String(value).replace(/,/g, '').trim());
  return isNaN(n) ? 0 : n;
}

function toBoolean(value) {
  const v = String(value == null ? '' : value).trim().toLowerCase();
  return v === 'true' || v === 'yes' || v === '1' || v === 'y';
}

function splitSerials(serialText) {
  const text = String(serialText || '').trim();
  if (!text) return [];
  return text.split(/[ ,\n]+/).map(function(s) {
    return String(s || '').trim();
  }).filter(Boolean);
}
