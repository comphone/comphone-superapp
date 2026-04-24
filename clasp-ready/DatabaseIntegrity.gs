// ============================================================
// DatabaseIntegrity.gs — COMPHONE SUPER APP V5.5
// ============================================================
// ระบบตรวจสอบและรักษาความสมบูรณ์ของฐานข้อมูล Google Sheets
// Functions:
//   validateSchema_(sheetName)       — ตรวจ header + เพิ่ม column ที่ขาด
//   safeWriteRow_(sheetName, data)   — เขียนข้อมูลโดย map column ตามชื่อ
//   runIntegrityCheck()              — ตรวจสอบ job_id unique, relation ถูกต้อง
//   cleanAllData()                   — trim, normalize, fix date format
// ============================================================

// ============================================================
// 1. validateSchema_(sheetName) — ตรวจสอบ header + เพิ่ม column ที่ขาด
// ============================================================

function validateSchema_(sheetName) {
  var result = {
    sheetName: sheetName,
    status: 'OK',
    added: [],
    errors: []
  };

  try {
    var ss = getComphoneSheet();
    if (!ss) {
      result.status = 'ERROR';
      result.errors.push('ไม่สามารถเชื่อมต่อ Spreadsheet ได้');
      return result;
    }

    var schema = SCHEMA[sheetName];
    if (!schema) {
      result.status = 'SKIP';
      result.errors.push('ไม่พบ schema สำหรับ ' + sheetName);
      return result;
    }

    var sh = ss.getSheetByName(schema.sheetName);
    if (!sh) {
      // สร้าง sheet ใหม่ถ้ายังไม่มี
      sh = ss.insertSheet(schema.sheetName);
      sh.getRange(1, 1, 1, schema.headers.length).setValues([schema.headers]);
      sh.getRange(1, 1, 1, schema.headers.length)
        .setBackground(schema.color || '#1a73e8')
        .setFontColor('#ffffff')
        .setFontWeight('bold');
      result.status = 'CREATED';
      result.added = schema.headers;
      Logger.log('✅ สร้าง sheet ใหม่: ' + schema.sheetName);
      return result;
    }

    // ตรวจสอบ header ที่มีอยู่
    var lastCol = sh.getLastColumn();
    var existingHeaders = lastCol > 0
      ? sh.getRange(1, 1, 1, lastCol).getValues()[0].map(function(h) { return String(h).trim(); })
      : [];

    // หา column ที่ขาด
    var missingHeaders = schema.headers.filter(function(h) {
      return existingHeaders.indexOf(h) === -1;
    });

    if (missingHeaders.length > 0) {
      // เพิ่ม column ที่ขาดต่อท้าย
      var startCol = lastCol + 1;
      missingHeaders.forEach(function(header, i) {
        var cell = sh.getRange(1, startCol + i);
        cell.setValue(header);
        cell.setBackground(schema.color || '#1a73e8')
            .setFontColor('#ffffff')
            .setFontWeight('bold');
      });
      result.status = 'UPDATED';
      result.added = missingHeaders;
      Logger.log('✅ เพิ่ม column ใน ' + sheetName + ': ' + missingHeaders.join(', '));
    }

    return result;

  } catch (e) {
    result.status = 'ERROR';
    result.errors.push(e.message);
    Logger.log('❌ validateSchema_ error [' + sheetName + ']: ' + e.message);
    return result;
  }
}

// ============================================================
// 2. safeWriteRow_(sheetName, data) — เขียนข้อมูลโดย map column ตามชื่อ
// ============================================================

function safeWriteRow_(sheetName, data) {
  var result = {
    success: false,
    rowIndex: -1,
    errors: []
  };

  try {
    var ss = getComphoneSheet();
    if (!ss) throw new Error('ไม่สามารถเชื่อมต่อ Spreadsheet ได้');

    var schema = SCHEMA[sheetName];
    if (!schema) throw new Error('ไม่พบ schema สำหรับ ' + sheetName);

    // ตรวจสอบ schema ก่อนเขียน
    validateSchema_(sheetName);

    var sh = ss.getSheetByName(schema.sheetName);
    if (!sh) throw new Error('ไม่พบ sheet: ' + schema.sheetName);

    // อ่าน header จาก sheet จริง (ไม่ใช้จาก SCHEMA เพื่อรองรับ column เพิ่มเติม)
    var lastCol = sh.getLastColumn();
    if (lastCol === 0) {
      // sheet ว่าง ให้เขียน header ก่อน
      sh.getRange(1, 1, 1, schema.headers.length).setValues([schema.headers]);
      lastCol = schema.headers.length;
    }
    var actualHeaders = sh.getRange(1, 1, 1, lastCol).getValues()[0].map(function(h) {
      return String(h).trim();
    });

    // Map data ตาม header จริง
    var row = new Array(actualHeaders.length).fill('');
    actualHeaders.forEach(function(header, i) {
      if (data.hasOwnProperty(header)) {
        var val = data[header];
        // Normalize value
        if (val === null || val === undefined) {
          row[i] = '';
        } else if (val instanceof Date) {
          row[i] = Utilities.formatDate(val, 'Asia/Bangkok', 'yyyy-MM-dd HH:mm:ss');
        } else {
          row[i] = String(val).trim();
        }
      }
    });

    // เพิ่มแถวใหม่
    var nextRow = sh.getLastRow() + 1;
    sh.getRange(nextRow, 1, 1, row.length).setValues([row]);

    result.success = true;
    result.rowIndex = nextRow;
    return result;

  } catch (e) {
    result.errors.push(e.message);
    Logger.log('❌ safeWriteRow_ error [' + sheetName + ']: ' + e.message);
    return result;
  }
}

// ============================================================
// 3. runIntegrityCheck() — ตรวจสอบ job_id unique, relation ถูกต้อง
// ============================================================

function runIntegrityCheck() {
  var report = {
    timestamp: getThaiTimestamp(),
    checks: [],
    totalIssues: 0,
    summary: ''
  };

  try {
    var ss = getComphoneSheet();
    if (!ss) throw new Error('ไม่สามารถเชื่อมต่อ Spreadsheet ได้');

    // ── Check 1: DBJOBS — JobID unique ──
    var jobsCheck = checkJobIdUnique_(ss);
    report.checks.push(jobsCheck);
    report.totalIssues += jobsCheck.issues;

    // ── Check 2: DB_BILLING — Job_ID ต้องมีอยู่ใน DBJOBS ──
    var billingCheck = checkBillingJobRelation_(ss);
    report.checks.push(billingCheck);
    report.totalIssues += billingCheck.issues;

    // ── Check 3: DB_WARRANTY — Job_ID ต้องมีอยู่ใน DBJOBS ──
    var warrantyCheck = checkWarrantyJobRelation_(ss);
    report.checks.push(warrantyCheck);
    report.totalIssues += warrantyCheck.issues;

    // ── Check 4: DB_CUSTOMERS — Customer_ID unique ──
    var customerCheck = checkCustomerIdUnique_(ss);
    report.checks.push(customerCheck);
    report.totalIssues += customerCheck.issues;

    // ── Check 5: Schema validation ทุก sheet ──
    var schemaCheck = checkAllSchemas_();
    report.checks.push(schemaCheck);
    report.totalIssues += schemaCheck.issues;

    report.summary = report.totalIssues === 0
      ? '✅ ผ่านการตรวจสอบทั้งหมด — ไม่พบปัญหา'
      : '⚠️ พบปัญหา ' + report.totalIssues + ' รายการ';

    _logInfo_('runIntegrityCheck', 'Integrity check complete', { summary: report.summary });
    return { success: true, report: report };

  } catch (e) {
    _logError_('HIGH', 'runIntegrityCheck', e);
    return { success: false, error: e.message, report: report };
  }
}

function checkJobIdUnique_(ss) {
  var check = { name: 'DBJOBS.JobID Unique', status: 'OK', issues: 0, details: [] };
  try {
    var sh = ss.getSheetByName('DBJOBS');
    if (!sh || sh.getLastRow() < 2) return check;
    var data = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues();
    var seen = {};
    data.forEach(function(row, i) {
      var id = String(row[0]).trim();
      if (!id) return;
      if (seen[id]) {
        check.issues++;
        check.details.push('Duplicate JobID: ' + id + ' (row ' + (i + 2) + ')');
      }
      seen[id] = true;
    });
    if (check.issues > 0) check.status = 'WARN';
  } catch (e) {
    check.status = 'ERROR';
    check.details.push(e.message);
  }
  return check;
}

function checkBillingJobRelation_(ss) {
  var check = { name: 'DB_BILLING.Job_ID → DBJOBS', status: 'OK', issues: 0, details: [] };
  try {
    var jobsSh = ss.getSheetByName('DBJOBS');
    var billingSh = ss.getSheetByName('DB_BILLING');
    if (!jobsSh || !billingSh || billingSh.getLastRow() < 2) return check;

    var jobIds = new Set();
    if (jobsSh.getLastRow() >= 2) {
      jobsSh.getRange(2, 1, jobsSh.getLastRow() - 1, 1).getValues().forEach(function(r) {
        if (r[0]) jobIds.add(String(r[0]).trim());
      });
    }

    var billingHeaders = billingSh.getRange(1, 1, 1, billingSh.getLastColumn()).getValues()[0];
    var jobIdCol = billingHeaders.indexOf('Job_ID');
    if (jobIdCol < 0) { check.details.push('ไม่พบ column Job_ID ใน DB_BILLING'); return check; }

    var billingData = billingSh.getRange(2, jobIdCol + 1, billingSh.getLastRow() - 1, 1).getValues();
    billingData.forEach(function(row, i) {
      var jid = String(row[0]).trim();
      if (jid && !jobIds.has(jid)) {
        check.issues++;
        check.details.push('DB_BILLING row ' + (i + 2) + ': Job_ID "' + jid + '" ไม่มีใน DBJOBS');
      }
    });
    if (check.issues > 0) check.status = 'WARN';
  } catch (e) {
    check.status = 'ERROR';
    check.details.push(e.message);
  }
  return check;
}

function checkWarrantyJobRelation_(ss) {
  var check = { name: 'DB_WARRANTY.Job_ID → DBJOBS', status: 'OK', issues: 0, details: [] };
  try {
    var jobsSh = ss.getSheetByName('DBJOBS');
    var warrantySh = ss.getSheetByName('DB_WARRANTY');
    if (!jobsSh || !warrantySh || warrantySh.getLastRow() < 2) return check;

    var jobIds = new Set();
    if (jobsSh.getLastRow() >= 2) {
      jobsSh.getRange(2, 1, jobsSh.getLastRow() - 1, 1).getValues().forEach(function(r) {
        if (r[0]) jobIds.add(String(r[0]).trim());
      });
    }

    var headers = warrantySh.getRange(1, 1, 1, warrantySh.getLastColumn()).getValues()[0];
    var jobIdCol = headers.indexOf('Job_ID');
    if (jobIdCol < 0) return check;

    var data = warrantySh.getRange(2, jobIdCol + 1, warrantySh.getLastRow() - 1, 1).getValues();
    data.forEach(function(row, i) {
      var jid = String(row[0]).trim();
      if (jid && !jobIds.has(jid)) {
        check.issues++;
        check.details.push('DB_WARRANTY row ' + (i + 2) + ': Job_ID "' + jid + '" ไม่มีใน DBJOBS');
      }
    });
    if (check.issues > 0) check.status = 'WARN';
  } catch (e) {
    check.status = 'ERROR';
    check.details.push(e.message);
  }
  return check;
}

function checkCustomerIdUnique_(ss) {
  var check = { name: 'DB_CUSTOMERS.Customer_ID Unique', status: 'OK', issues: 0, details: [] };
  try {
    var sh = ss.getSheetByName('DB_CUSTOMERS');
    if (!sh || sh.getLastRow() < 2) return check;
    var data = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues();
    var seen = {};
    data.forEach(function(row, i) {
      var id = String(row[0]).trim();
      if (!id) return;
      if (seen[id]) {
        check.issues++;
        check.details.push('Duplicate Customer_ID: ' + id + ' (row ' + (i + 2) + ')');
      }
      seen[id] = true;
    });
    if (check.issues > 0) check.status = 'WARN';
  } catch (e) {
    check.status = 'ERROR';
    check.details.push(e.message);
  }
  return check;
}

function checkAllSchemas_() {
  var check = { name: 'Schema Validation (ทุก sheet)', status: 'OK', issues: 0, details: [] };
  try {
    Object.keys(SCHEMA).forEach(function(key) {
      var result = validateSchema_(key);
      if (result.status === 'ERROR') {
        check.issues++;
        check.details.push(key + ': ' + result.errors.join(', '));
      } else if (result.status === 'UPDATED' || result.status === 'CREATED') {
        check.details.push(key + ': ' + result.status + ' (' + result.added.join(', ') + ')');
      }
    });
    if (check.issues > 0) check.status = 'WARN';
  } catch (e) {
    check.status = 'ERROR';
    check.details.push(e.message);
  }
  return check;
}

// ============================================================
// 4. cleanAllData() — trim, normalize, fix date format
// ============================================================

function cleanAllData() {
  var report = {
    timestamp: getThaiTimestamp(),
    sheets: [],
    totalCleaned: 0
  };

  var sheetsToClean = ['DBJOBS', 'DB_CUSTOMERS', 'DB_BILLING', 'DB_INVENTORY', 'DB_WARRANTY'];

  try {
    var ss = getComphoneSheet();
    if (!ss) throw new Error('ไม่สามารถเชื่อมต่อ Spreadsheet ได้');

    sheetsToClean.forEach(function(sheetName) {
      var sheetResult = cleanSheet_(ss, sheetName);
      report.sheets.push(sheetResult);
      report.totalCleaned += sheetResult.cleaned;
    });

    Logger.log('🧹 cleanAllData: ทำความสะอาด ' + report.totalCleaned + ' cells ใน ' + sheetsToClean.length + ' sheets');
    return { success: true, report: report };

  } catch (e) {
    Logger.log('❌ cleanAllData error: ' + e.message);
    return { success: false, error: e.message, report: report };
  }
}

function cleanSheet_(ss, sheetName) {
  var result = { sheetName: sheetName, cleaned: 0, errors: [] };
  try {
    var sh = ss.getSheetByName(sheetName);
    if (!sh || sh.getLastRow() < 2) return result;

    var lastRow = sh.getLastRow();
    var lastCol = sh.getLastColumn();
    if (lastCol === 0) return result;

    var headers = sh.getRange(1, 1, 1, lastCol).getValues()[0].map(function(h) {
      return String(h).trim().toLowerCase();
    });

    var data = sh.getRange(2, 1, lastRow - 1, lastCol).getValues();
    var modified = false;

    data.forEach(function(row, ri) {
      row.forEach(function(cell, ci) {
        var original = cell;
        var cleaned = cell;

        if (typeof cell === 'string') {
          // trim whitespace
          cleaned = cell.trim();
          // normalize multiple spaces
          cleaned = cleaned.replace(/\s+/g, ' ');
        }

        // fix date columns
        var header = headers[ci] || '';
        if ((header.includes('date') || header.includes('_at') || header.includes('time')) && typeof cell === 'string' && cell.trim()) {
          var d = new Date(cell);
          if (!isNaN(d.getTime()) && cell.indexOf('/') > -1) {
            // แปลง DD/MM/YYYY → YYYY-MM-DD
            cleaned = Utilities.formatDate(d, 'Asia/Bangkok', 'yyyy-MM-dd');
          }
        }

        if (cleaned !== original) {
          data[ri][ci] = cleaned;
          result.cleaned++;
          modified = true;
        }
      });
    });

    if (modified) {
      sh.getRange(2, 1, lastRow - 1, lastCol).setValues(data);
    }

  } catch (e) {
    result.errors.push(e.message);
    Logger.log('❌ cleanSheet_ error [' + sheetName + ']: ' + e.message);
  }
  return result;
}

// ============================================================
// 5. runDatabaseMaintenance() — รันทุกอย่างในครั้งเดียว
// ============================================================

function runDatabaseMaintenance() {
  Logger.log('🔧 เริ่ม Database Maintenance...');

  var results = {
    timestamp: getThaiTimestamp(),
    schemaValidation: null,
    integrityCheck: null,
    cleanData: null,
    summary: ''
  };

  // Step 1: Validate all schemas
  Logger.log('📋 Step 1: Validate Schemas...');
  var schemaResults = [];
  Object.keys(SCHEMA).forEach(function(key) {
    schemaResults.push(validateSchema_(key));
  });
  results.schemaValidation = {
    total: schemaResults.length,
    created: schemaResults.filter(function(r) { return r.status === 'CREATED'; }).length,
    updated: schemaResults.filter(function(r) { return r.status === 'UPDATED'; }).length,
    ok: schemaResults.filter(function(r) { return r.status === 'OK'; }).length,
    errors: schemaResults.filter(function(r) { return r.status === 'ERROR'; }).length
  };

  // Step 2: Run integrity check
  Logger.log('🔍 Step 2: Integrity Check...');
  results.integrityCheck = runIntegrityCheck();

  // Step 3: Clean data
  Logger.log('🧹 Step 3: Clean Data...');
  results.cleanData = cleanAllData();

  results.summary = [
    '✅ Schema: ' + results.schemaValidation.ok + ' OK, ' + results.schemaValidation.updated + ' updated, ' + results.schemaValidation.created + ' created',
    '🔍 Integrity: ' + (results.integrityCheck.success ? results.integrityCheck.report.summary : '❌ Error'),
    '🧹 Clean: ' + (results.cleanData.success ? results.cleanData.report.totalCleaned + ' cells cleaned' : '❌ Error')
  ].join(' | ');

  Logger.log('✅ Database Maintenance เสร็จสิ้น: ' + results.summary);
  return results;
}
