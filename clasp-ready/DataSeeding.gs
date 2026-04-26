// ============================================================
// COMPHONE SUPER APP v5.9.0-phase2d
// DataSeeding.gs — Initial Data Setup (Idempotent)
// Version: 5.6.0
// ============================================================
// วิธีใช้: GAS Editor → เลือก seedAllData → กด Run (ครั้งเดียวหลัง deploy)
// ถ้ามีข้อมูลอยู่แล้วจะข้ามโดยอัตโนมัติ (idempotent)
// ============================================================

'use strict';

/**
 * รัน seed ทั้งหมดในครั้งเดียว — idempotent (รันซ้ำได้ปลอดภัย)
 * @return {Object} ผลลัพธ์การ seed แต่ละ table
 */
function seedAllData() {
  Logger.log('=== COMPHONE SEED START ===');
  const results = {
    users:     seedUsers(),
    inventory: seedInventory(),
    customers: seedCustomers()
  };
  Logger.log('=== SEED RESULTS ===');
  Logger.log(JSON.stringify(results, null, 2));
  Logger.log('=== COMPHONE SEED DONE ===');
  return results;
}

// ============================================================
// SEED 1: DB_USERS — 6 users
// ============================================================
/**
 * Seed ผู้ใช้งานเริ่มต้น 6 คน (admin, manager, tech1, tech2, accounting, sales)
 * Columns: User_ID, Username, Password_Hash, Role, Full_Name, Active, Created_At, Created_By
 * @return {Object} { success, inserted, skipped, reason }
 */
function seedUsers() {
  try {
    const ss = SpreadsheetApp.openById(
      PropertiesService.getScriptProperties().getProperty('DB_SS_ID')
    );
    const sheet = ss.getSheetByName('DB_USERS');
    if (!sheet) return { success: false, error: 'DB_USERS sheet not found' };

    ensureUserHeaders_(sheet);

    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      Logger.log('seedUsers: skipped — already has ' + (lastRow - 1) + ' rows');
      return { success: false, skipped: true, reason: 'DB_USERS already has data (' + (lastRow - 1) + ' rows)' };
    }

    const now = new Date().toISOString();

    // — แต่ละ user ใช้ password เริ่มต้นที่แตกต่างกัน + force_change_pw = TRUE —
    // ผู้ใช้ต้องเปลี่ยนรหัสผ่านในการเข้าใช้ครั้งแรก
    // User_ID, Username, Password_Hash, Role, Full_Name, Active, Created_At, Created_By, Force_Change_PW
    const users = [
      ['USR-001', 'admin',      hashPin_('Admin@2025!'),  'owner',   'เจ้าของร้าน (Admin)',  'TRUE', now, 'system', 'TRUE'],
      ['USR-002', 'manager',    hashPin_('Mgr@2025!'),    'admin',   'ผู้จัดการ',             'TRUE', now, 'system', 'TRUE'],
      ['USR-003', 'tech1',      hashPin_('Tech1@2025!'),  'tech',    'ช่างโต้',               'TRUE', now, 'system', 'TRUE'],
      ['USR-004', 'tech2',      hashPin_('Tech2@2025!'),  'tech',    'ช่างเหม่ง',             'TRUE', now, 'system', 'TRUE'],
      ['USR-005', 'accounting', hashPin_('Acct@2025!'),   'acct',    'ฝ่ายบัญชี',             'TRUE', now, 'system', 'TRUE'],
      ['USR-006', 'sales',      hashPin_('Sales@2025!'),  'sales',   'ฝ่ายขาย',               'TRUE', now, 'system', 'TRUE'],
    ];

    // ตรวจสอบว่า header มี Force_Change_PW column หรือไม่
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var hasForcePW = headers.some(function(h) { return String(h).toLowerCase().includes('force'); });
    if (!hasForcePW) {
      // เพิ่ม column Force_Change_PW
      var newCol = sheet.getLastColumn() + 1;
      sheet.getRange(1, newCol).setValue('Force_Change_PW');
    }

    sheet.getRange(2, 1, users.length, users[0].length).setValues(users);
    SpreadsheetApp.flush();

    Logger.log('seedUsers: inserted ' + users.length + ' users with unique passwords + force_change_pw');
    return {
      success: true,
      inserted: users.length,
      credentials: [
        { user: 'admin',      pass: 'Admin@2025!',  role: 'owner' },
        { user: 'manager',    pass: 'Mgr@2025!',    role: 'admin' },
        { user: 'tech1',      pass: 'Tech1@2025!',  role: 'tech' },
        { user: 'tech2',      pass: 'Tech2@2025!',  role: 'tech' },
        { user: 'accounting', pass: 'Acct@2025!',   role: 'acct' },
        { user: 'sales',      pass: 'Sales@2025!',  role: 'sales' }
      ],
      note: 'All users must change password on first login (force_change_pw=TRUE)'
    };
  } catch (e) {
    Logger.log('seedUsers ERROR: ' + e.message);
    return { success: false, error: e.message };
  }
}

/**
 * ตรวจสอบและสร้าง header row สำหรับ DB_USERS
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 */
function ensureUserHeaders_(sheet) {
  const headers = [
    'User_ID', 'Username', 'Password_Hash', 'Role',
    'Full_Name', 'Active', 'Created_At', 'Created_By'
  ];
  const firstRow = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  if (firstRow[0] !== 'User_ID') {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    Logger.log('ensureUserHeaders_: created header row');
  }
}

// ============================================================
// SEED 2: DB_INVENTORY — 20 รายการ
// ============================================================
/**
 * Seed สินค้าคงคลังเริ่มต้น 20 รายการ
 * Columns: Item_Code, Item_Name, Category, Qty, Min_Qty, Unit,
 *          Cost_Price, Sell_Price, Location_Type, Location_Code,
 *          Assigned_To, Barcode, Updated_At, Last_Job_ID, Notes
 * @return {Object} { success, inserted, skipped, reason }
 */
function seedInventory() {
  try {
    const ss = SpreadsheetApp.openById(
      PropertiesService.getScriptProperties().getProperty('DB_SS_ID')
    );
    const sheet = ss.getSheetByName('DB_INVENTORY');
    if (!sheet) return { success: false, error: 'DB_INVENTORY sheet not found' };

    ensureInventoryHeaders_(sheet);

    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      Logger.log('seedInventory: skipped — already has ' + (lastRow - 1) + ' rows');
      return { success: false, skipped: true, reason: 'DB_INVENTORY already has data (' + (lastRow - 1) + ' rows)' };
    }

    const now = new Date().toISOString();
    const items = [
      ['ITM-001', 'RAM DDR4 8GB',           'RAM',        10, 3,  'ชิ้น', 800,  1200, 'Shop',      'S01', '', '', now, '', ''],
      ['ITM-002', 'RAM DDR4 16GB',          'RAM',         5, 2,  'ชิ้น', 1500, 2200, 'Shop',      'S01', '', '', now, '', ''],
      ['ITM-003', 'SSD 256GB SATA',         'Storage',     8, 3,  'ชิ้น', 900,  1500, 'Shop',      'S02', '', '', now, '', ''],
      ['ITM-004', 'SSD 512GB SATA',         'Storage',     5, 2,  'ชิ้น', 1600, 2500, 'Shop',      'S02', '', '', now, '', ''],
      ['ITM-005', 'HDD 1TB 2.5"',           'Storage',     6, 2,  'ชิ้น', 1200, 1800, 'Shop',      'S02', '', '', now, '', ''],
      ['ITM-006', 'Thermal Paste Noctua',   'Consumable', 20, 5,  'หลอด', 80,   150,  'Shop',      'S03', '', '', now, '', ''],
      ['ITM-007', 'Thermal Pad 0.5mm',      'Consumable', 15, 5,  'แผ่น', 30,   80,   'Shop',      'S03', '', '', now, '', ''],
      ['ITM-008', 'Laptop Battery 11.1V',   'Battery',     4, 2,  'ชิ้น', 800,  1500, 'Shop',      'S04', '', '', now, '', ''],
      ['ITM-009', 'Laptop Charger 65W',     'Adapter',     5, 2,  'ชิ้น', 400,  800,  'Shop',      'S04', '', '', now, '', ''],
      ['ITM-010', 'Screen 15.6" FHD',       'Display',     2, 1,  'ชิ้น', 2500, 4500, 'Shop',      'S05', '', '', now, '', ''],
      ['ITM-011', 'iPhone Battery (Gen)',   'Battery',     5, 2,  'ชิ้น', 600,  1200, 'Shop',      'S06', '', '', now, '', ''],
      ['ITM-012', 'Samsung Battery (Gen)',  'Battery',     5, 2,  'ชิ้น', 400,  900,  'Shop',      'S06', '', '', now, '', ''],
      ['ITM-013', 'iPhone Screen (Gen)',    'Display',     3, 1,  'ชิ้น', 1500, 3000, 'Shop',      'S07', '', '', now, '', ''],
      ['ITM-014', 'Samsung Screen (Gen)',   'Display',     3, 1,  'ชิ้น', 1200, 2500, 'Shop',      'S07', '', '', now, '', ''],
      ['ITM-015', 'USB-C Charging Port',   'Port',        8, 3,  'ชิ้น', 150,  350,  'Shop',      'S08', '', '', now, '', ''],
      ['ITM-016', 'RJ45 Connector Cat6',   'Network',   100, 20, 'ชิ้น', 5,    15,   'Warehouse', 'W01', '', '', now, '', ''],
      ['ITM-017', 'UTP Cable Cat6 (เมตร)', 'Network',   200, 50, 'เมตร', 8,    20,   'Warehouse', 'W01', '', '', now, '', ''],
      ['ITM-018', 'Network Switch 8-port', 'Network',     3, 1,  'ชิ้น', 800,  1500, 'Shop',      'S09', '', '', now, '', ''],
      ['ITM-019', 'Screwdriver Set',       'Tools',       3, 1,  'ชุด',  300,  0,    'Van',       'V01', 'tech1', '', now, '', 'ไม่ขาย'],
      ['ITM-020', 'Anti-static Wristband', 'Tools',       5, 2,  'ชิ้น', 50,   0,    'Shop',      'S10', '', '', now, '', 'ไม่ขาย'],
    ];

    sheet.getRange(2, 1, items.length, items[0].length).setValues(items);
    SpreadsheetApp.flush();

    Logger.log('seedInventory: inserted ' + items.length + ' items');
    return { success: true, inserted: items.length };
  } catch (e) {
    Logger.log('seedInventory ERROR: ' + e.message);
    return { success: false, error: e.message };
  }
}

/**
 * ตรวจสอบและสร้าง header row สำหรับ DB_INVENTORY
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 */
function ensureInventoryHeaders_(sheet) {
  const headers = [
    'Item_Code', 'Item_Name', 'Category', 'Qty', 'Min_Qty', 'Unit',
    'Cost_Price', 'Sell_Price', 'Location_Type', 'Location_Code',
    'Assigned_To', 'Barcode', 'Updated_At', 'Last_Job_ID', 'Notes'
  ];
  const firstRow = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  if (firstRow[0] !== 'Item_Code') {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    Logger.log('ensureInventoryHeaders_: created header row');
  }
}

// ============================================================
// SEED 3: DB_CUSTOMERS — 5 รายการ (+ extract จาก DBJOBS)
// ============================================================
/**
 * Seed ลูกค้าเริ่มต้น — ดึงจาก DBJOBS + เพิ่มตัวอย่าง
 * @return {Object} { success, inserted, skipped, reason }
 */
function seedCustomers() {
  try {
    const ss = SpreadsheetApp.openById(
      PropertiesService.getScriptProperties().getProperty('DB_SS_ID')
    );
    const custSheet = ss.getSheetByName('DB_CUSTOMERS');
    if (!custSheet) return { success: false, error: 'DB_CUSTOMERS sheet not found' };

    ensureCustomerHeaders_(custSheet);

    const lastRow = custSheet.getLastRow();
    if (lastRow > 1) {
      Logger.log('seedCustomers: skipped — already has ' + (lastRow - 1) + ' rows');
      return { success: false, skipped: true, reason: 'DB_CUSTOMERS already has data (' + (lastRow - 1) + ' rows)' };
    }

    const now = new Date().toISOString();

    const jobSheet = ss.getSheetByName('DBJOBS');
    let rows = [];
    if (jobSheet) {
      rows = extractCustomersFromJobs_(jobSheet, now);
    }

    if (rows.length === 0) {
      rows = [
        ['CUS-001', 'บริษัท ABC จำกัด',   '081-234-5678', 'abc@example.com', '', '', 'นิติบุคคล',    0, 0, 0, 'ลูกค้าประจำ', now, now],
        ['CUS-002', 'คุณสมชาย ทำดี',      '082-345-6789', '',                '', '', 'บุคคลทั่วไป', 0, 0, 0, '',            now, now],
        ['CUS-003', 'ร้านค้า XYZ',        '083-456-7890', 'xyz@shop.com',    '', '', 'นิติบุคคล',    0, 0, 0, '',            now, now],
        ['CUS-004', 'คุณสมหญิง ใจดี',     '084-567-8901', '',                '', '', 'บุคคลทั่วไป', 0, 0, 0, '',            now, now],
        ['CUS-005', 'โรงเรียน เทคโนโลยี', '085-678-9012', 'school@edu.th',   '', '', 'นิติบุคคล',    0, 0, 0, 'ลูกค้า VIP',  now, now],
      ];
    }

    custSheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
    SpreadsheetApp.flush();

    Logger.log('seedCustomers: inserted ' + rows.length + ' customers');
    return {
      success: true,
      inserted: rows.length,
      source: rows.length > 5 ? 'extracted from DBJOBS' : 'fallback sample data'
    };
  } catch (e) {
    Logger.log('seedCustomers ERROR: ' + e.message);
    return { success: false, error: e.message };
  }
}

/**
 * ดึงข้อมูลลูกค้าจาก DBJOBS (deduplicate ด้วยเบอร์โทร)
 * @param {GoogleAppsScript.Spreadsheet.Sheet} jobSheet
 * @param {string} now - ISO timestamp
 * @return {Array} rows สำหรับ DB_CUSTOMERS
 */
function extractCustomersFromJobs_(jobSheet, now) {
  const jobData = jobSheet.getDataRange().getValues();
  if (jobData.length < 2) return [];

  const headers  = jobData[0];
  const nameIdx  = headers.indexOf('ชื่อลูกค้า');
  const phoneIdx = headers.indexOf('เบอร์โทร');
  if (nameIdx === -1) return [];

  const seen = {};
  const customers = [];
  let counter = 1;

  for (let i = 1; i < jobData.length; i++) {
    const name  = String(jobData[i][nameIdx]  || '').trim();
    const phone = phoneIdx >= 0 ? String(jobData[i][phoneIdx] || '').trim() : '';
    if (!name) continue;

    const key = phone || name;
    if (seen[key]) { seen[key].jobCount++; continue; }

    const custId = 'CUS-' + String(counter).padStart(4, '0');
    seen[key] = { id: custId, name, phone, jobCount: 1 };
    customers.push(seen[key]);
    counter++;
  }

  return customers.map(c => [
    c.id, c.name, c.phone, '', '', '',
    'บุคคลทั่วไป', 0, c.jobCount, 0, '', now, now
  ]);
}

/**
 * ตรวจสอบและสร้าง header row สำหรับ DB_CUSTOMERS
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 */
function ensureCustomerHeaders_(sheet) {
  const headers = [
    'Customer_ID', 'Name', 'Phone', 'Email', 'Address', 'Line_ID',
    'Type', 'Total_Purchase', 'Job_Count', 'Score', 'Notes', 'Created_At', 'Updated_At'
  ];
  const firstRow = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  if (firstRow[0] !== 'Customer_ID') {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    Logger.log('ensureCustomerHeaders_: created header row');
  }
}

// ============================================================
// HELPER: hashPin_() — SHA-256
// ============================================================
/**
 * Hash PIN/Password ด้วย SHA-256
 * @param {string} pin - PIN หรือ password ที่ต้องการ hash
 * @return {string} hex string ของ SHA-256
 */
function hashPin_(pin) {
  const raw = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(pin),
    Utilities.Charset.UTF_8
  );
  return raw.map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('');
}

// ============================================================
// UTILITY: resetSheetData() — ใช้เมื่อต้องการ seed ใหม่
// ⚠️ ระวัง: ลบข้อมูลทั้งหมดใน sheet นั้น (ยกเว้น header)
// ============================================================
/**
 * ลบข้อมูลทั้งหมดใน sheet (ยกเว้น header row) เพื่อ seed ใหม่
 * @param {string} sheetName - ชื่อ sheet ที่ต้องการ reset
 * @return {Object} { success, cleared }
 */
function resetSheetData(sheetName) {
  try {
    const ss = SpreadsheetApp.openById(
      PropertiesService.getScriptProperties().getProperty('DB_SS_ID')
    );
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return { success: false, error: 'Sheet not found: ' + sheetName };

    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      sheet.deleteRows(2, lastRow - 1);
      SpreadsheetApp.flush();
    }
    Logger.log('resetSheetData: cleared ' + sheetName);
    return { success: true, cleared: sheetName };
  } catch (e) {
    Logger.log('resetSheetData ERROR: ' + e.message);
    return { success: false, error: e.message };
  }
}
