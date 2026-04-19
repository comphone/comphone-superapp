// ============================================================
// COMPHONE SUPER APP V5.5+
// ============================================================
// Setup.gs — ระบบ Initialize ฐานข้อมูลและตั้งค่าระบบครั้งแรก
// รันฟังก์ชัน initSystem() เพียงครั้งเดียวเพื่อเตรียมระบบให้พร้อมใช้งาน
// ============================================================

// ============================================================
// 📋 Schema Definitions — กำหนด Header ของแต่ละ Sheet
// ============================================================

var SCHEMA = {

  DBJOBS: {
    sheetName: 'DBJOBS',
    headers: [
      'JobID',
      'ชื่อลูกค้า',
      'เบอร์โทร',
      'อาการ',
      'สถานะ',
      'Current_Status_Code',
      'ช่างที่รับงาน',
      'พิกัด GPS',
      'เวลาสร้าง',
      'เวลาอัปเดต',
      'หมายเหตุ',
      'folder_url',
      'warranty_url',
      'Tool_Checklist_Status',
      'Voice_Summary_Log',
      'priority',
      'sla_deadline',
      'customer_id',
      'branch_id'
    ],
    color: '#1a73e8',
    description: 'ตารางงานซ่อมหลัก'
  },

  DB_INVENTORY: {
    sheetName: 'DB_INVENTORY',
    headers: [
      'Item_Code',
      'Item_Name',
      'Category',
      'Qty',
      'Cost',
      'Price',
      'Location_Type',
      'Location_Code',
      'Assigned_To',
      'Reorder_Point',
      'Barcode',
      'Updated_At',
      'Last_Job_ID',
      'Notes'
    ],
    color: '#0f9d58',
    description: 'ตารางสินค้าและอะไหล่'
  },

  DB_CUSTOMERS: {
    sheetName: 'DB_CUSTOMERS',
    headers: [
      'Customer_ID',
      'ชื่อ',
      'เบอร์โทร',
      'อีเมล',
      'ที่อยู่',
      'Line_ID',
      'ประเภทลูกค้า',
      'ยอดซื้อสะสม',
      'จำนวนงาน',
      'คะแนน',
      'หมายเหตุ',
      'Created_At',
      'Updated_At'
    ],
    color: '#e37400',
    description: 'ตารางข้อมูลลูกค้า (CRM)'
  },

  DB_BILLING: {
    sheetName: 'DB_BILLING',
    headers: [
      'Bill_ID',
      'Job_ID',
      'Customer_ID',
      'Customer_Name',
      'Items_Detail',
      'Labor_Cost',
      'Parts_Cost',
      'Subtotal',
      'VAT_Amount',
      'WHT_Amount',
      'Total_Amount',
      'Payment_Status',
      'Payment_Method',
      'Slip_URL',
      'Receipt_PDF_URL',
      'Created_At',
      'Paid_At',
      'Created_By'
    ],
    color: '#d93025',
    description: 'ตารางบิลและการชำระเงิน'
  },

  DB_STOCK_MOVEMENTS: {
    sheetName: 'DB_STOCK_MOVEMENTS',
    headers: [
      'Move_ID',
      'Item_Code',
      'Item_Name',
      'Move_Type',
      'Qty_Change',
      'From_Location',
      'To_Location',
      'Job_ID',
      'PO_ID',
      'Performed_By',
      'Note',
      'Timestamp'
    ],
    color: '#7627bb',
    description: 'ตารางประวัติการเคลื่อนไหวสินค้า'
  },

  DB_JOB_ITEMS: {
    sheetName: 'DB_JOB_ITEMS',
    headers: [
      'Record_ID',
      'Job_ID',
      'Item_Code',
      'Item_Name',
      'Qty',
      'Unit_Cost',
      'Unit_Price',
      'Total_Cost',
      'Total_Price',
      'Status',
      'Added_At',
      'Added_By'
    ],
    color: '#137333',
    description: 'ตารางอะไหล่ที่ใช้ในแต่ละงาน'
  },

  DB_PHOTO_QUEUE: {
    sheetName: 'DB_PHOTO_QUEUE',
    headers: [
      'Queue_ID',
      'Job_ID',
      'Image_URL',
      'Drive_File_ID',
      'Image_Type',
      'AI_Status',
      'AI_Result',
      'AI_Category',
      'Processed_At',
      'Created_At',
      'Source'
    ],
    color: '#c5221f',
    description: 'ตาราง Queue รูปภาพรอ AI ประมวลผล'
  },

  DB_PURCHASE_ORDERS: {
    sheetName: 'DB_PURCHASE_ORDERS',
    headers: [
      'PO_ID',
      'Supplier',
      'Items_Detail',
      'Total_Amount',
      'Status',
      'Ordered_By',
      'Approved_By',
      'Order_Date',
      'Expected_Date',
      'Received_Date',
      'Note'
    ],
    color: '#b06000',
    description: 'ตารางใบสั่งซื้อสินค้า'
  },

  DB_ATTENDANCE: {
    sheetName: 'DB_ATTENDANCE',
    headers: [
      'Record_ID',
      'Username',
      'Full_Name',
      'Date',
      'Clock_In',
      'Clock_Out',
      'Total_Hours',
      'GPS_In',
      'GPS_Out',
      'Note'
    ],
    color: '#1967d2',
    description: 'ตารางการลงเวลาทำงานช่าง'
  },

  DB_AFTER_SALES: {
    sheetName: 'DB_AFTER_SALES',
    headers: [
      'AS_ID',
      'Job_ID',
      'Customer_ID',
      'Customer_Name',
      'Phone',
      'Service_Type',
      'Next_Due_Date',
      'Last_Contact',
      'Status',
      'Note',
      'Created_At'
    ],
    color: '#1e8e3e',
    description: 'ตารางงานหลังการขายและ PM'
  },

  DB_JOB_LOGS: {
    sheetName: 'DB_JOB_LOGS',
    headers: [
      'Log_ID',
      'Job_ID',
      'From_Status',
      'To_Status',
      'Changed_By',
      'Note',
      'Timestamp'
    ],
    color: '#5f6368',
    description: 'ตาราง Log การเปลี่ยนสถานะงาน'
  },

  DB_USERS: {
    sheetName: 'DB_USERS',
    headers: [
      'username',
      'password',
      'role',
      'full_name',
      'active',
      'created_at',
      'created_by'
    ],
    color: '#1a73e8',
    description: 'ตารางผู้ใช้งานระบบ'
  },

  DB_ACTIVITY_LOG: {
    sheetName: 'DB_ACTIVITY_LOG',
    headers: [
      'Log_ID',
      'Action',
      'User',
      'Detail',
      'Timestamp'
    ],
    color: '#5f6368',
    description: 'ตาราง Activity Log ทั่วไป'
  },

  DB_TAX_REPORT: {
    sheetName: 'DB_TAX_REPORT',
    headers: [
      'Report_ID',
      'Period',
      'Bill_ID',
      'Job_ID',
      'Customer_Name',
      'Subtotal',
      'VAT_Amount',
      'WHT_Amount',
      'Net_Payable',
      'Tax_Mode',
      'Branch_ID',
      'Created_At'
    ],
    color: '#e37400',
    description: 'ตารางรายงานภาษีรายเดือน'
  },

  DB_WARRANTY: {
    sheetName: 'DB_WARRANTY',
    headers: [
      'Warranty_ID',
      'Job_ID',
      'Customer_ID',
      'Customer_Name',
      'Phone',
      'Device',
      'Issue',
      'Warranty_Type',
      'Start_Date',
      'End_Date',
      'Duration_Days',
      'Status',
      'PDF_URL',
      'Branch_ID',
      'Created_At',
      'Updated_At'
    ],
    color: '#1e8e3e',
    description: 'ตารางใบรับประกันสินค้า/บริการ'
  },

  DB_HEALTH_LOG: {
    sheetName: 'DB_HEALTH_LOG',
    headers: [
      'Log_ID',
      'Timestamp',
      'Overall_Status',
      'Response_Time_Ms',
      'Sheets_OK',
      'Config_OK',
      'Error_Count',
      'Errors_Detail',
      'Triggered_By'
    ],
    color: '#1967d2',
    description: 'ตาราง Health Check Log'
  }
};

// ============================================================
// 🚀 MAIN: initSystem() — รันครั้งเดียวเพื่อเตรียมระบบ
// ============================================================

function initSystem() {
  var results = {
    success: true,
    timestamp: getThaiTimestamp(),
    sheets: [],
    triggers: [],
    users: null,
    folders: [],
    errors: []
  };

  try {
    var ss = getComphoneSheet();
    if (!ss) throw new Error('ไม่สามารถเชื่อมต่อ Google Sheets ได้ กรุณาตั้งค่า DB_SS_ID ใน Script Properties');

    Logger.log('🚀 initSystem() เริ่มต้น...');
    Logger.log('📊 Spreadsheet: ' + ss.getName() + ' (' + ss.getId() + ')');

    // ── ขั้นที่ 1: สร้าง/ตรวจสอบ Sheets ทั้งหมด ──
    Logger.log('\n📋 ขั้นที่ 1: ตรวจสอบและสร้าง Sheets...');
    for (var key in SCHEMA) {
      var schema = SCHEMA[key];
      var sheetResult = ensureSheet_(ss, schema);
      results.sheets.push(sheetResult);
      Logger.log((sheetResult.created ? '✅ สร้างใหม่' : '⏭️  มีอยู่แล้ว') + ': ' + schema.sheetName);
    }

    // ── ขั้นที่ 2: สร้าง User เริ่มต้น (admin) ──
    Logger.log('\n👤 ขั้นที่ 2: ตรวจสอบ User เริ่มต้น...');
    try {
      var userResult = setupUserSheet();
      results.users = userResult;
      Logger.log('✅ User Setup: ' + JSON.stringify(userResult));
    } catch (e) {
      results.errors.push('User Setup: ' + e.toString());
      Logger.log('❌ User Setup Error: ' + e);
    }

    // ── ขั้นที่ 3: สร้างโฟลเดอร์ Google Drive ──
    Logger.log('\n📁 ขั้นที่ 3: ตรวจสอบโฟลเดอร์ Google Drive...');
    try {
      var folderResult = ensureDriveFolders_();
      results.folders = folderResult;
      Logger.log('✅ Drive Folders: ' + folderResult.length + ' โฟลเดอร์');
    } catch (e) {
      results.errors.push('Drive Folders: ' + e.toString());
      Logger.log('❌ Drive Folders Error: ' + e);
    }

    // ── ขั้นที่ 4: ตั้งค่า Triggers ──
    Logger.log('\n⏰ ขั้นที่ 4: ตั้งค่า Triggers อัตโนมัติ...');
    try {
      var triggerResult = setupAllTriggers();
      results.triggers = triggerResult.triggers || [];
      Logger.log('✅ Triggers: ' + results.triggers.length + ' รายการ');
    } catch (e) {
      results.errors.push('Triggers: ' + e.toString());
      Logger.log('❌ Triggers Error: ' + e);
    }

    // ── ขั้นที่ 5: บันทึก Log ──
    try {
      logActivity('SYSTEM_INIT', 'SYSTEM', 'initSystem() รันสำเร็จ — Sheets: ' + results.sheets.length + ', Errors: ' + results.errors.length);
    } catch (e) {}

    // ── สรุปผล ──
    Logger.log('\n' + '='.repeat(50));
    Logger.log('✅ initSystem() เสร็จสมบูรณ์');
    Logger.log('📊 Sheets: ' + results.sheets.length + ' รายการ');
    Logger.log('⏰ Triggers: ' + results.triggers.length + ' รายการ');
    Logger.log('❌ Errors: ' + results.errors.length + ' รายการ');
    if (results.errors.length > 0) {
      Logger.log('⚠️  Errors:');
      results.errors.forEach(function(e) { Logger.log('   - ' + e); });
    }
    Logger.log('='.repeat(50));
    Logger.log('\n📌 ขั้นตอนต่อไป:');
    Logger.log('1. Deploy GAS เป็น Web App (Execute as: Me, Access: Anyone)');
    Logger.log('2. นำ Web App URL ไปใส่ใน Script Properties: WEB_APP_URL');
    Logger.log('3. ตั้งค่า LINE_CHANNEL_ACCESS_TOKEN ใน Script Properties');
    Logger.log('4. ทดสอบ API ด้วย ?action=help');
    Logger.log('5. Login ด้วย username: admin, password: admin1234');

    if (results.errors.length > 0) results.success = false;
    return results;

  } catch (e) {
    Logger.log('❌ initSystem() FATAL ERROR: ' + e);
    results.success = false;
    results.errors.push('FATAL: ' + e.toString());
    return results;
  }
}

// ============================================================
// 🔧 Helper: ensureSheet_ — สร้าง Sheet พร้อม Header ถ้ายังไม่มี
// ============================================================

function ensureSheet_(ss, schema) {
  var result = {
    sheetName: schema.sheetName,
    created: false,
    headersAdded: false,
    error: null
  };

  try {
    var sh = ss.getSheetByName(schema.sheetName);

    if (!sh) {
      // สร้าง Sheet ใหม่
      sh = ss.insertSheet(schema.sheetName);
      result.created = true;
    }

    // ตรวจสอบ/เพิ่ม Headers
    var existingHeaders = [];
    if (sh.getLastRow() > 0) {
      existingHeaders = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0]
        .map(function(h) { return String(h).trim(); })
        .filter(function(h) { return h !== ''; });
    }

    if (existingHeaders.length === 0) {
      // ยังไม่มี Header — เพิ่มทั้งหมด
      sh.appendRow(schema.headers);
      sh.setFrozenRows(1);

      // จัดสไตล์ Header row
      var headerRange = sh.getRange(1, 1, 1, schema.headers.length);
      headerRange.setFontWeight('bold')
                 .setBackground(schema.color || '#1a73e8')
                 .setFontColor('#ffffff')
                 .setHorizontalAlignment('center');

      // ปรับความกว้างคอลัมน์อัตโนมัติ
      try { sh.autoResizeColumns(1, schema.headers.length); } catch(e) {}

      result.headersAdded = true;
    } else {
      // มี Header อยู่แล้ว — ตรวจสอบว่าครบหรือไม่ แล้วเพิ่มคอลัมน์ที่ขาด
      var missingHeaders = schema.headers.filter(function(h) {
        return existingHeaders.indexOf(h) === -1;
      });

      if (missingHeaders.length > 0) {
        var lastCol = sh.getLastColumn();
        for (var i = 0; i < missingHeaders.length; i++) {
          sh.getRange(1, lastCol + i + 1).setValue(missingHeaders[i])
            .setFontWeight('bold')
            .setBackground(schema.color || '#1a73e8')
            .setFontColor('#ffffff');
        }
        result.headersAdded = true;
        result.missingAdded = missingHeaders;
      }
    }

    return result;

  } catch (e) {
    result.error = e.toString();
    return result;
  }
}

// ============================================================
// 📁 Helper: ensureDriveFolders_ — สร้างโฟลเดอร์ Drive ที่จำเป็น
// ============================================================

function ensureDriveFolders_() {
  var results = [];
  var rootId = (typeof ROOT_FOLDER_ID !== 'undefined' && ROOT_FOLDER_ID)
               || getConfig('ROOT_FOLDER_ID', '');

  if (!rootId) {
    Logger.log('⚠️  ROOT_FOLDER_ID ไม่ได้ตั้งค่า — ข้ามการสร้างโฟลเดอร์');
    return [{ name: 'ROOT', status: 'skipped', reason: 'ROOT_FOLDER_ID not set' }];
  }

  var subFolders = [
    { name: 'JOBS_PHOTOS',       desc: 'รูปภาพหน้างาน Before/After',        configKey: 'FOLDER_JOBS_PHOTOS' },
    { name: 'BILLING_RECEIPTS',  desc: 'ใบเสร็จและใบเสนอราคา PDF',          configKey: 'FOLDER_BILLING_RECEIPTS' },
    { name: 'SLIPS_VERIFICATION',desc: 'สลิปโอนเงินรอตรวจสอบ',              configKey: 'FOLDER_SLIPS' },
    { name: 'TEMP_AI_QUEUE',     desc: 'รูปรอ AI ประมวลผล (ลบอัตโนมัติ)',   configKey: 'FOLDER_AI_QUEUE' },
    { name: 'PURCHASE_ORDERS',   desc: 'เอกสารใบสั่งซื้อ PDF',              configKey: 'FOLDER_PO' }
  ];

  try {
    var rootFolder = DriveApp.getFolderById(rootId);

    for (var i = 0; i < subFolders.length; i++) {
      var sf = subFolders[i];
      try {
        var existingFolders = rootFolder.getFoldersByName(sf.name);
        var folder;

        if (existingFolders.hasNext()) {
          folder = existingFolders.next();
          results.push({ name: sf.name, id: folder.getId(), created: false });
        } else {
          folder = rootFolder.createFolder(sf.name);
          results.push({ name: sf.name, id: folder.getId(), created: true });
        }

        // บันทึก Folder ID ลง Script Properties
        try {
          PropertiesService.getScriptProperties().setProperty(sf.configKey, folder.getId());
        } catch(e) {}

      } catch (e) {
        results.push({ name: sf.name, error: e.toString(), created: false });
      }
    }
  } catch (e) {
    results.push({ name: 'ROOT', error: 'ไม่สามารถเข้าถึง ROOT_FOLDER_ID: ' + e.toString() });
  }

  return results;
}

// ============================================================
// 🔍 systemStatus() — ตรวจสอบสุขภาพระบบ (Health Check)
// ============================================================

function systemStatus() {
  var status = {
    timestamp: getThaiTimestamp(),
    overall: 'OK',
    database: {},
    config: {},
    triggers: [],
    summary: {}
  };

  // ── ตรวจสอบ Sheets ──
  try {
    var ss = getComphoneSheet();
    if (!ss) throw new Error('Spreadsheet not found');

    var sheetNames = Object.keys(SCHEMA).map(function(k) { return SCHEMA[k].sheetName; });
    var missing = [];
    var present = [];

    for (var i = 0; i < sheetNames.length; i++) {
      var sh = ss.getSheetByName(sheetNames[i]);
      if (sh) {
        present.push({ name: sheetNames[i], rows: Math.max(0, sh.getLastRow() - 1) });
      } else {
        missing.push(sheetNames[i]);
      }
    }

    status.database = {
      connected: true,
      spreadsheetId: ss.getId(),
      spreadsheetName: ss.getName(),
      sheetsPresent: present,
      sheetsMissing: missing
    };

    if (missing.length > 0) status.overall = 'WARNING';

  } catch (e) {
    status.database = { connected: false, error: e.toString() };
    status.overall = 'ERROR';
  }

  // ── ตรวจสอบ Script Properties ──
  var requiredProps = ['DB_SS_ID', 'ROOT_FOLDER_ID'];
  var optionalProps = ['WEB_APP_URL', 'LINE_CHANNEL_ACCESS_TOKEN', 'GEMINI_API_KEY',
                       'LINE_GROUP_TECHNICIAN', 'LINE_GROUP_ACCOUNTING',
                       'LINE_GROUP_PROCUREMENT', 'LINE_GROUP_SALES', 'LINE_GROUP_EXECUTIVE'];

  try {
    var props = PropertiesService.getScriptProperties().getProperties();
    var configStatus = {};

    requiredProps.forEach(function(k) {
      configStatus[k] = props[k] ? '✅ ตั้งค่าแล้ว' : '❌ ยังไม่ตั้งค่า (จำเป็น)';
      if (!props[k]) status.overall = 'WARNING';
    });

    optionalProps.forEach(function(k) {
      configStatus[k] = props[k] ? '✅ ตั้งค่าแล้ว' : '⚪ ยังไม่ตั้งค่า (ไม่บังคับ)';
    });

    status.config = configStatus;
  } catch (e) {
    status.config = { error: e.toString() };
  }

  // ── ตรวจสอบ Triggers ──
  try {
    var triggers = ScriptApp.getProjectTriggers();
    status.triggers = triggers.map(function(t) {
      return { function: t.getHandlerFunction(), type: t.getEventType().toString() };
    });
  } catch (e) {
    status.triggers = [{ error: e.toString() }];
  }

  // ── สรุป ──
  status.summary = {
    sheetsReady: status.database.connected && (status.database.sheetsMissing || []).length === 0,
    triggersActive: status.triggers.length > 0,
    lineConfigured: !!(status.config['LINE_CHANNEL_ACCESS_TOKEN'] || '').includes('✅'),
    aiConfigured: !!(status.config['GEMINI_API_KEY'] || '').includes('✅')
  };

  return status;
}

// ============================================================
// 🔄 resetSystem() — รีเซ็ตระบบ (ใช้ระวัง! ลบข้อมูลทั้งหมด)
// ============================================================

function resetSystem() {
  // ป้องกันการรันโดยไม่ตั้งใจ
  var confirm = getConfig('ALLOW_RESET', 'NO');
  if (confirm !== 'YES') {
    return {
      success: false,
      message: 'ต้องตั้งค่า Script Property ALLOW_RESET = YES ก่อนจึงจะรีเซ็ตได้'
    };
  }

  try {
    var ss = getComphoneSheet();
    if (!ss) return { success: false, error: 'Spreadsheet not found' };

    var deleted = [];
    for (var key in SCHEMA) {
      var sh = ss.getSheetByName(SCHEMA[key].sheetName);
      if (sh) {
        // ลบข้อมูลแต่คง Header ไว้
        if (sh.getLastRow() > 1) {
          sh.deleteRows(2, sh.getLastRow() - 1);
        }
        deleted.push(SCHEMA[key].sheetName);
      }
    }

    // รีเซ็ต flag
    PropertiesService.getScriptProperties().deleteProperty('ALLOW_RESET');
    logActivity('SYSTEM_RESET', 'SYSTEM', 'ล้างข้อมูลทั้งหมด: ' + deleted.join(', '));

    return { success: true, deleted: deleted, message: 'รีเซ็ตข้อมูลสำเร็จ (Header ยังคงอยู่)' };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

// ============================================================
// 📊 getSchemaInfo() — คืนข้อมูล Schema ทั้งหมด (สำหรับ Debug)
// ============================================================

function getSchemaInfo() {
  var info = [];
  for (var key in SCHEMA) {
    var s = SCHEMA[key];
    info.push({
      sheetName: s.sheetName,
      description: s.description,
      columnCount: s.headers.length,
      headers: s.headers
    });
  }
  return { success: true, total: info.length, schemas: info };
}

// ============================================================
// 📊 getSystemMetrics() — Production Monitoring V5.5.8
// ============================================================
function getSystemMetrics() {
  var cache = CacheService.getScriptCache();
  var metrics = {
    timestamp: new Date().toISOString(),
    version:   CONFIG.VERSION || 'V5.5.8',
    sessions: (function() {
      try {
        var count = parseInt(cache.get('METRIC_ACTIVE_SESSIONS') || '0', 10);
        return { active: count, max_per_user: 3 };
      } catch(e) { return { active: 'N/A', error: e.message }; }
    })(),
    security: (function() {
      try {
        var log = JSON.parse(cache.get('SEC_LOG_LATEST') || '[]');
        return {
          recent_events:       log.length,
          rate_limit_exceeded: log.filter(function(e){ return e.event === 'RATE_LIMIT_EXCEEDED'; }).length,
          invalid_token:       log.filter(function(e){ return e.event && e.event.indexOf('INVALID') >= 0; }).length,
          last_event:          log.length > 0 ? log[0].timestamp : null
        };
      } catch(e) { return { error: e.message }; }
    })(),
    triggers: (function() {
      try {
        var t = ScriptApp.getProjectTriggers();
        return { count: t.length, functions: t.map(function(x){ return x.getHandlerFunction(); }) };
      } catch(e) { return { count: 0, error: e.message }; }
    })(),
    properties: (function() {
      try {
        var keys = Object.keys(PropertiesService.getScriptProperties().getProperties());
        var sessionKeys = keys.filter(function(k){ return k.startsWith('SESSION_') && k !== 'SESSION_MD_CONTENT'; });
        return { total: keys.length, session_keys: sessionKeys.length, warning: keys.length > 45 ? 'Approaching limit (50)' : null };
      } catch(e) { return { error: e.message }; }
    })(),
    health: (function() {
      try {
        var h = healthCheckV55_();
        return { status: h.status, elapsed_ms: h.elapsed_ms, spreadsheet: h.checks && h.checks.spreadsheet ? h.checks.spreadsheet.ok : false };
      } catch(e) { return { status: 'error', error: e.message }; }
    })()
  };
  return { success: true, metrics: metrics };
}
