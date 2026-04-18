// COMPHONE SUPER APP V5.5
// ============================================================
// DataSeeding.gs — Initial Data Setup
// รัน seedAllData() ครั้งเดียวหลัง deploy ระบบใหม่
// ============================================================

/**
 * รัน seed ทั้งหมดในครั้งเดียว
 * วิธีใช้: เปิด Script Editor → เลือก seedAllData → กด Run
 */
function seedAllData() {
  var results = {
    users: seedUsers(),
    inventory: seedInventory(),
    customers: seedCustomers()
  };
  Logger.log('=== SEED RESULTS ===');
  Logger.log(JSON.stringify(results, null, 2));
  return results;
}

// ============================================================
// SEED 1: DB_USERS
// ============================================================
function seedUsers() {
  var ss = SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('DB_SS_ID'));
  var sheet = ss.getSheetByName('DB_USERS');
  if (!sheet) return { success: false, error: 'DB_USERS sheet not found' };

  // ตรวจสอบว่ามีข้อมูลแล้วหรือไม่ (ป้องกัน seed ซ้ำ)
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    return { success: false, skipped: true, reason: 'DB_USERS already has data (' + (lastRow - 1) + ' rows)' };
  }

  var now = new Date().toISOString();
  // password คือ SHA-256 ของ PIN "1234" — เปลี่ยนก่อนใช้งานจริง
  var defaultPinHash = hashPin_('1234');

  var users = [
    // username, password(hash), role, full_name, active, created_at, created_by
    ['owner',   defaultPinHash, 'owner', 'เจ้าของร้าน',   'TRUE', now, 'system'],
    ['admin',   defaultPinHash, 'admin', 'ผู้ดูแลระบบ',    'TRUE', now, 'system'],
    ['tote',    defaultPinHash, 'tech',  'ช่างโต้',        'TRUE', now, 'system'],
    ['meng',    defaultPinHash, 'tech',  'ช่างเหม่ง',      'TRUE', now, 'system'],
    ['rung',    defaultPinHash, 'tech',  'ช่างรุ่ง',       'TRUE', now, 'system'],
    ['acct',    defaultPinHash, 'acct',  'ฝ่ายบัญชี',      'TRUE', now, 'system'],
  ];

  sheet.getRange(2, 1, users.length, users[0].length).setValues(users);
  return { success: true, inserted: users.length, note: 'Default PIN is 1234 — change immediately' };
}

// ============================================================
// SEED 2: DB_INVENTORY
// ============================================================
function seedInventory() {
  var ss = SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('DB_SS_ID'));
  var sheet = ss.getSheetByName('DB_INVENTORY');
  if (!sheet) return { success: false, error: 'DB_INVENTORY sheet not found' };

  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    return { success: false, skipped: true, reason: 'DB_INVENTORY already has data (' + (lastRow - 1) + ' rows)' };
  }

  var now = new Date().toISOString();
  // Item_Code, Item_Name, Category, Qty, Cost, Price, Location_Type, Location_Code, Assigned_To, Reorder_Point, Barcode, Updated_At, Last_Job_ID, Notes
  var items = [
    // ── อะไหล่คอมพิวเตอร์ ──
    ['ITM-001', 'RAM DDR4 8GB',           'RAM',          10, 800,  1200, 'Shop', 'S01', '',       3,  '', now, '', ''],
    ['ITM-002', 'RAM DDR4 16GB',          'RAM',          5,  1500, 2200, 'Shop', 'S01', '',       2,  '', now, '', ''],
    ['ITM-003', 'SSD 256GB SATA',         'Storage',      8,  900,  1500, 'Shop', 'S02', '',       3,  '', now, '', ''],
    ['ITM-004', 'SSD 512GB SATA',         'Storage',      5,  1600, 2500, 'Shop', 'S02', '',       2,  '', now, '', ''],
    ['ITM-005', 'HDD 1TB 2.5"',           'Storage',      6,  1200, 1800, 'Shop', 'S02', '',       2,  '', now, '', ''],
    ['ITM-006', 'Thermal Paste Noctua',   'Consumable',   20, 80,   150,  'Shop', 'S03', '',       5,  '', now, '', ''],
    ['ITM-007', 'Thermal Pad 0.5mm',      'Consumable',   15, 30,   80,   'Shop', 'S03', '',       5,  '', now, '', ''],
    ['ITM-008', 'Laptop Battery 11.1V',   'Battery',      4,  800,  1500, 'Shop', 'S04', '',       2,  '', now, '', ''],
    ['ITM-009', 'Laptop Charger 65W',     'Adapter',      5,  400,  800,  'Shop', 'S04', '',       2,  '', now, '', ''],
    ['ITM-010', 'Screen 15.6" FHD',       'Display',      2,  2500, 4500, 'Shop', 'S05', '',       1,  '', now, '', ''],
    // ── อะไหล่มือถือ ──
    ['ITM-011', 'iPhone Battery (Gen)',   'Battery',      5,  600,  1200, 'Shop', 'S06', '',       2,  '', now, '', ''],
    ['ITM-012', 'Samsung Battery (Gen)',  'Battery',      5,  400,  900,  'Shop', 'S06', '',       2,  '', now, '', ''],
    ['ITM-013', 'iPhone Screen (Gen)',    'Display',      3,  1500, 3000, 'Shop', 'S07', '',       1,  '', now, '', ''],
    ['ITM-014', 'Samsung Screen (Gen)',   'Display',      3,  1200, 2500, 'Shop', 'S07', '',       1,  '', now, '', ''],
    ['ITM-015', 'USB-C Charging Port',   'Port',         8,  150,  350,  'Shop', 'S08', '',       3,  '', now, '', ''],
    // ── อุปกรณ์เครือข่าย ──
    ['ITM-016', 'RJ45 Connector Cat6',   'Network',      100, 5,   15,   'Warehouse', 'W01', '', 20, '', now, '', ''],
    ['ITM-017', 'UTP Cable Cat6 (เมตร)', 'Network',      200, 8,   20,   'Warehouse', 'W01', '', 50, '', now, '', ''],
    ['ITM-018', 'Network Switch 8-port', 'Network',      3,  800,  1500, 'Shop', 'S09', '',       1,  '', now, '', ''],
    // ── อุปกรณ์ช่าง ──
    ['ITM-019', 'Screwdriver Set',       'Tools',        3,  300,  0,    'Van',  'V01', 'tote',   1,  '', now, '', 'ไม่ขาย'],
    ['ITM-020', 'Anti-static Wristband', 'Tools',        5,  50,   0,    'Shop', 'S10', '',       2,  '', now, '', 'ไม่ขาย'],
  ];

  sheet.getRange(2, 1, items.length, items[0].length).setValues(items);
  return { success: true, inserted: items.length };
}

// ============================================================
// SEED 3: DB_CUSTOMERS (จาก DBJOBS ที่มีอยู่)
// ============================================================
function seedCustomers() {
  var ss = SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('DB_SS_ID'));
  var custSheet = ss.getSheetByName('DB_CUSTOMERS');
  if (!custSheet) return { success: false, error: 'DB_CUSTOMERS sheet not found' };

  var lastRow = custSheet.getLastRow();
  if (lastRow > 1) {
    return { success: false, skipped: true, reason: 'DB_CUSTOMERS already has data (' + (lastRow - 1) + ' rows)' };
  }

  // ดึงข้อมูลลูกค้าจาก DBJOBS (deduplicate ด้วยเบอร์โทร)
  var jobSheet = ss.getSheetByName('DBJOBS');
  if (!jobSheet) return { success: false, error: 'DBJOBS sheet not found' };

  var jobData = jobSheet.getDataRange().getValues();
  var headers = jobData[0];
  var nameIdx = headers.indexOf('ชื่อลูกค้า');
  var phoneIdx = headers.indexOf('เบอร์โทร');

  if (nameIdx === -1) return { success: false, error: 'ไม่พบ column ชื่อลูกค้า ใน DBJOBS' };

  var seen = {};
  var customers = [];
  var now = new Date().toISOString();
  var counter = 1;

  for (var i = 1; i < jobData.length; i++) {
    var name = String(jobData[i][nameIdx] || '').trim();
    var phone = phoneIdx >= 0 ? String(jobData[i][phoneIdx] || '').trim() : '';
    if (!name) continue;

    var key = phone || name;
    if (seen[key]) {
      // นับจำนวนงานเพิ่ม
      seen[key].jobCount++;
      continue;
    }

    var custId = 'CUS-' + String(counter).padStart(4, '0');
    var row = {
      id: custId, name: name, phone: phone,
      email: '', address: '', lineId: '',
      type: 'บุคคลทั่วไป', totalPurchase: 0, jobCount: 1,
      score: 0, notes: '', createdAt: now, updatedAt: now
    };
    seen[key] = row;
    customers.push(row);
    counter++;
  }

  // Customer_ID, ชื่อ, เบอร์โทร, อีเมล, ที่อยู่, Line_ID, ประเภทลูกค้า, ยอดซื้อสะสม, จำนวนงาน, คะแนน, หมายเหตุ, Created_At, Updated_At
  var rows = customers.map(function(c) {
    return [c.id, c.name, c.phone, c.email, c.address, c.lineId,
            c.type, c.totalPurchase, c.jobCount, c.score, c.notes, c.createdAt, c.updatedAt];
  });

  if (rows.length > 0) {
    custSheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
  }

  return { success: true, inserted: rows.length, source: 'extracted from DBJOBS' };
}

// ============================================================
// HELPER: Hash PIN (SHA-256 simple)
// ============================================================
function hashPin_(pin) {
  var raw = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(pin),
    Utilities.Charset.UTF_8
  );
  return raw.map(function(b) {
    return ('0' + (b & 0xFF).toString(16)).slice(-2);
  }).join('');
}

// ============================================================
// UTILITY: Reset sheet (ใช้เมื่อต้องการ seed ใหม่)
// ⚠️ ระวัง: ลบข้อมูลทั้งหมดใน sheet นั้น
// ============================================================
function resetSheetData(sheetName) {
  var ss = SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('DB_SS_ID'));
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return { success: false, error: 'Sheet not found: ' + sheetName };
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.deleteRows(2, lastRow - 1);
  }
  return { success: true, cleared: sheetName };
}
