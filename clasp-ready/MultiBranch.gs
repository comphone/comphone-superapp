// ============================================================
// MultiBranch.gs — Multi-branch Support (Basic)
// COMPHONE SUPER APP V5.5+
// ============================================================
//
// TASK 7: เพิ่ม branch_id ทุก table + filter query
//
// ทุก action เขียน Audit Log ตาม RULE 5
// ทุกค่า Config ใช้ getConfig() ตาม RULE 4
// ============================================================

// ── ตาราง Schema ที่ต้องมี branch_id ──────────────────────
var BRANCH_AWARE_SHEETS = [
  'DBJOBS',
  'DB_BILLING',
  'DB_INVENTORY',
  'DB_CUSTOMERS',
  'DB_ATTENDANCE',
  'DB_PURCHASE_ORDERS',
  'DB_WARRANTY'
];

// ============================================================
// 🔧 getCurrentBranchId()
// ============================================================
// ดึง branch_id ปัจจุบันจาก Config
// ============================================================
function getCurrentBranchId() {
  return getConfig('BRANCH_ID', 'HQ') || 'HQ';
}

// ============================================================
// 🔧 getBranchList()
// ============================================================
// ดึงรายชื่อสาขาทั้งหมด (จาก Script Property BRANCH_LIST)
// ============================================================
function getBranchList() {
  var raw = getConfig('BRANCH_LIST', 'HQ');
  var branches = String(raw).split(',').map(function (b) {
    return b.trim();
  }).filter(function (b) { return b.length > 0; });
  return { success: true, branches: branches, current: getCurrentBranchId() };
}

// ============================================================
// 🔧 ensureBranchIdColumn(sheetName)
// ============================================================
// ตรวจสอบและเพิ่มคอลัมน์ branch_id ให้ Sheet ถ้ายังไม่มี
// ============================================================
function ensureBranchIdColumn(sheetName) {
  try {
    var ss = getComphoneSheet();
    if (!ss) return { success: false, error: 'Spreadsheet not found' };
    var sh = findSheetByName(ss, sheetName);
    if (!sh) return { success: false, error: 'Sheet not found: ' + sheetName };
    if (sh.getLastRow() === 0) return { success: false, error: 'Sheet is empty' };

    var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    var branchIdx = findHeaderIndex_(headers, ['branch_id', 'Branch_ID', 'BranchID']);
    if (branchIdx > -1) return { success: true, action: 'already_exists', sheet: sheetName };

    // เพิ่มคอลัมน์ branch_id ท้ายสุด
    var newCol = sh.getLastColumn() + 1;
    sh.getRange(1, newCol).setValue('branch_id');

    // เติมค่า default = HQ สำหรับ row ที่มีอยู่
    var lastRow = sh.getLastRow();
    if (lastRow > 1) {
      var defaultBranch = getCurrentBranchId();
      var fillValues = [];
      for (var i = 0; i < lastRow - 1; i++) fillValues.push([defaultBranch]);
      sh.getRange(2, newCol, lastRow - 1, 1).setValues(fillValues);
    }

    writeAuditLog('BRANCH_COLUMN_ADDED', 'SYSTEM', sheetName + ' col=' + newCol, { result: 'success' });
    return { success: true, action: 'added', sheet: sheetName, column: newCol };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

// ============================================================
// 🔧 ensureAllBranchIdColumns()
// ============================================================
// เพิ่ม branch_id ให้ทุก Sheet ที่กำหนดไว้
// ============================================================
function ensureAllBranchIdColumns() {
  var results = {};
  BRANCH_AWARE_SHEETS.forEach(function (sheetName) {
    results[sheetName] = ensureBranchIdColumn(sheetName);
  });
  return { success: true, results: results };
}

// ============================================================
// 🔧 filterByBranch(rows, headers, branchId)
// ============================================================
// กรอง rows ตาม branch_id
// branchId = '' หรือ 'ALL' = ไม่กรอง (ดูทุกสาขา)
// ============================================================
function filterByBranch(rows, headers, branchId) {
  if (!branchId || branchId === 'ALL') return rows;
  var branchIdx = findHeaderIndex_(headers, ['branch_id', 'Branch_ID', 'BranchID']);
  if (branchIdx < 0) return rows;
  return rows.filter(function (row) {
    var rowBranch = String(row[branchIdx] || '').trim();
    return rowBranch === '' || rowBranch === branchId;
  });
}

// ============================================================
// 🔧 setBranchId(rows, headers, branchId)
// ============================================================
// เซ็ต branch_id ให้ row ก่อน append
// ============================================================
function setBranchIdOnRow(row, headers, branchId) {
  var branchIdx = findHeaderIndex_(headers, ['branch_id', 'Branch_ID', 'BranchID']);
  if (branchIdx > -1 && !row[branchIdx]) {
    row[branchIdx] = branchId || getCurrentBranchId();
  }
  return row;
}

// ============================================================
// 🔧 getBranchSummary(branchId)
// ============================================================
// สรุปข้อมูลของสาขา: จำนวนงาน, บิล, สต็อก
// ============================================================
function getBranchSummary(branchId) {
  try {
    branchId = branchId || getCurrentBranchId();
    var ss = getComphoneSheet();
    if (!ss) return { success: false, error: 'Spreadsheet not found' };

    var result = { branch_id: branchId, jobs: 0, billing: 0, inventory_items: 0 };

    // นับงาน
    var jobSh = findSheetByName(ss, 'DBJOBS');
    if (jobSh && jobSh.getLastRow() > 1) {
      var jHeaders = jobSh.getRange(1, 1, 1, jobSh.getLastColumn()).getValues()[0];
      var jRows    = jobSh.getRange(2, 1, jobSh.getLastRow() - 1, jHeaders.length).getValues();
      result.jobs  = filterByBranch(jRows, jHeaders, branchId).length;
    }

    // นับบิล
    var billSh = findSheetByName(ss, 'DB_BILLING');
    if (billSh && billSh.getLastRow() > 1) {
      var bHeaders    = billSh.getRange(1, 1, 1, billSh.getLastColumn()).getValues()[0];
      var bRows       = billSh.getRange(2, 1, billSh.getLastRow() - 1, bHeaders.length).getValues();
      result.billing  = filterByBranch(bRows, bHeaders, branchId).length;
    }

    // นับสต็อก
    var invSh = findSheetByName(ss, 'DB_INVENTORY');
    if (invSh && invSh.getLastRow() > 1) {
      var iHeaders           = invSh.getRange(1, 1, 1, invSh.getLastColumn()).getValues()[0];
      var iRows              = invSh.getRange(2, 1, invSh.getLastRow() - 1, iHeaders.length).getValues();
      result.inventory_items = filterByBranch(iRows, iHeaders, branchId).length;
    }

    writeAuditLog('BRANCH_SUMMARY', 'SYSTEM', 'branch=' + branchId, { result: 'success' });
    return { success: true, summary: result };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

// ============================================================
// 🔧 API Handler: branchAction(data)
// ============================================================
function branchAction(data) {
  data = data || {};
  var sub = String(data.sub || data.subAction || '').trim();

  if (sub === 'list' || sub === 'getBranchList') return getBranchList();
  if (sub === 'current' || sub === 'getCurrentBranch') return { success: true, branch_id: getCurrentBranchId() };
  if (sub === 'summary' || sub === 'getBranchSummary') return getBranchSummary(data.branch_id || '');
  if (sub === 'ensureColumns' || sub === 'setup') return ensureAllBranchIdColumns();

  return { success: false, error: 'Unknown sub-action. Use: list | current | summary | ensureColumns' };
}
