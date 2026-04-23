// ============================================================
// COMPHONE SUPER APP V5.5+
// ============================================================
// DeployGuide.gs — คู่มือ Deploy และตั้งค่าระบบครั้งแรก
//
// 📌 วิธีใช้:
//   1. เปิด Google Apps Script Editor
//   2. รันฟังก์ชัน printDeployGuide() เพื่อดูคู่มือใน Logs
//   3. รันฟังก์ชัน setScriptPropertiesTemplate() เพื่อตั้งค่าเริ่มต้น
//   4. แก้ไขค่าใน Script Properties ให้ถูกต้อง
//   5. รัน initSystem() เพื่อสร้าง Database
//   6. Deploy เป็น Web App
// ============================================================

// ============================================================
// 📋 printDeployGuide() — แสดงคู่มือ Deploy ใน Logs
// ============================================================

function printDeployGuide() {
  var guide = [
    '╔══════════════════════════════════════════════════════════╗',
    '║       COMPHONE SUPER APP V5.5+ — DEPLOY GUIDE           ║',
    '╚══════════════════════════════════════════════════════════╝',
    '',
    '📌 ขั้นตอนที่ 1: ตั้งค่า Script Properties',
    '─────────────────────────────────────────',
    '  ไปที่: Project Settings → Script Properties → Add property',
    '',
    '  🔴 จำเป็น (ต้องตั้งค่าก่อน Deploy):',
    '  ┌─────────────────────┬──────────────────────────────────────────────────┐',
    '  │ Key                 │ Value                                            │',
    '  ├─────────────────────┼──────────────────────────────────────────────────┤',
    '  │ DB_SS_ID            │ 19fkLbSbBdz0EjAV8nE9LLwBiHeIN50BTPptt_PJCRGA   │',
    '  │ ROOT_FOLDER_ID      │ 1YRZRG9r1Y_jMHg2XFFKYjK4Hx-sW0Eq0              │',
    '  └─────────────────────┴──────────────────────────────────────────────────┘',
    '',
    '  🟡 แนะนำ (ตั้งค่าเพื่อใช้งานเต็มรูปแบบ):',
    '  ┌──────────────────────────────┬──────────────────────────────────────────┐',
    '  │ Key                          │ คำอธิบาย                                │',
    '  ├──────────────────────────────┼──────────────────────────────────────────┤',
    '  │ WEB_APP_URL                  │ URL ของ Web App (ได้หลัง Deploy)         │',
    '  │ GEMINI_API_KEY               │ Google AI Studio API Key                 │',
    '  │ LINE_CHANNEL_ACCESS_TOKEN    │ LINE Messaging API Token                 │',
    '  │ LINE_GROUP_TECHNICIAN        │ C8ad22a115f38c9ad3cb5ea5c2ff4863b        │',
    '  │ LINE_GROUP_ACCOUNTING        │ C7b939d1d367e6b854690e58b392e88cc        │',
    '  │ LINE_GROUP_PROCUREMENT       │ Group ID กลุ่มจัดซื้อ                   │',
    '  │ LINE_GROUP_SALES             │ Group ID กลุ่มเซลส์                     │',
    '  │ LINE_GROUP_EXECUTIVE         │ Group ID กลุ่มผู้บริหาร                 │',
    '  └──────────────────────────────┴──────────────────────────────────────────┘',
    '',
    '📌 ขั้นตอนที่ 2: รัน initSystem()',
    '─────────────────────────────────',
    '  เปิด Editor → เลือกฟังก์ชัน initSystem → กด Run',
    '  ระบบจะสร้าง Sheets ทั้งหมด 13 ตาราง + โฟลเดอร์ Drive + Triggers',
    '  ตรวจสอบผลใน Logs',
    '',
    '📌 ขั้นตอนที่ 3: Deploy เป็น Web App',
    '─────────────────────────────────────',
    '  Deploy → New Deployment → Web App',
    '  Execute as: Me (narinoutagit@gmail.com)',
    '  Who has access: Anyone',
    '  → Copy URL แล้วนำไปตั้งค่าใน Script Properties: WEB_APP_URL',
    '',
    '📌 ขั้นตอนที่ 4: ทดสอบ API',
    '────────────────────────────',
    '  เปิด Browser: {WEB_APP_URL}?action=help',
    '  ควรได้ JSON: { "success": true, "app": "COMPHONE SUPER APP V5.5+" }',
    '',
    '  ทดสอบ systemStatus:',
    '  POST {WEB_APP_URL} body: {"action":"systemStatus"}',
    '',
    '📌 ขั้นตอนที่ 5: Login ครั้งแรก',
    '──────────────────────────────────',
    '  username: admin',
    '  password: admin1234',
    '  ⚠️  เปลี่ยนรหัสผ่านทันทีหลัง Login',
    '',
    '📌 ขั้นตอนที่ 6: ตั้งค่า LINE Webhook',
    '──────────────────────────────────────',
    '  LINE Developer Console → Messaging API → Webhook URL:',
    '  {WEB_APP_URL}?action=lineWebhook',
    '',
    '╔══════════════════════════════════════════════════════════╗',
    '║  ✅ ระบบพร้อมใช้งาน! เปิด PWA: https://comphone.github.io/comphone-superapp/pwa/  ║',
    '╚══════════════════════════════════════════════════════════╝'
  ];

  guide.forEach(function(line) { Logger.log(line); });
  return { success: true, message: 'ดูคู่มือใน Logs ด้านบน' };
}

// ============================================================
// ⚙️ setScriptPropertiesTemplate() — ตั้งค่า Script Properties เริ่มต้น
// ============================================================

function setScriptPropertiesTemplate() {
  var props = PropertiesService.getScriptProperties();

  // ตั้งค่าเฉพาะที่ยังไม่มี (ไม่ทับค่าเดิม)
  var template = {
    'DB_SS_ID':                     '19fkLbSbBdz0EjAV8nE9LLwBiHeIN50BTPptt_PJCRGA',
    'ROOT_FOLDER_ID':               '1YRZRG9r1Y_jMHg2XFFKYjK4Hx-sW0Eq0',
    'WEB_APP_URL':                  '',
    'GEMINI_API_KEY':               '',
    'LINE_CHANNEL_ACCESS_TOKEN':    '',
    'LINE_GROUP_TECHNICIAN':        'C8ad22a115f38c9ad3cb5ea5c2ff4863b',
    'LINE_GROUP_ACCOUNTING':        'C7b939d1d367e6b854690e58b392e88cc',
    'LINE_GROUP_PROCUREMENT':       '',
    'LINE_GROUP_SALES':             '',
    'LINE_GROUP_EXECUTIVE':         '',
    'LINE_OA_TOKEN':                '',
    'VAT_RATE':                     '0.07',
    'WHT_RATE':                     '0.03',
    'LOW_STOCK_ALERT':              '5'
  };

  var existing = props.getProperties();
  var added = [];
  var skipped = [];

  for (var key in template) {
    if (existing[key] !== undefined && existing[key] !== '') {
      skipped.push(key + ' (มีค่าอยู่แล้ว: ' + existing[key].substring(0, 20) + '...)');
    } else {
      props.setProperty(key, template[key]);
      added.push(key);
    }
  }

  Logger.log('✅ เพิ่ม Script Properties: ' + added.length + ' รายการ');
  Logger.log('⏭️  ข้าม (มีค่าอยู่แล้ว): ' + skipped.length + ' รายการ');
  Logger.log('\n⚠️  กรุณาแก้ไขค่าต่อไปนี้ให้ถูกต้องใน Script Properties:');
  Logger.log('   - GEMINI_API_KEY: ใส่ API Key จาก Google AI Studio');
  Logger.log('   - LINE_CHANNEL_ACCESS_TOKEN: ใส่ Token จาก LINE Developer Console');
  Logger.log('   - WEB_APP_URL: ใส่หลังจาก Deploy เป็น Web App แล้ว');

  return {
    success: true,
    added: added,
    skipped: skipped,
    message: 'ตั้งค่าเสร็จแล้ว กรุณาแก้ไขค่าที่ยังว่างอยู่ใน Script Properties'
  };
}

// ============================================================
// 🧪 runQuickTest() — ทดสอบระบบเบื้องต้น
// ============================================================

function runQuickTest() {
  var results = [];
  var passed = 0;
  var failed = 0;

  function test(name, fn) {
    try {
      var result = fn();
      var ok = result && result.success !== false;
      results.push({ test: name, status: ok ? '✅ PASS' : '⚠️  WARN', result: JSON.stringify(result).substring(0, 100) });
      if (ok) passed++; else failed++;
    } catch (e) {
      results.push({ test: name, status: '❌ FAIL', error: e.toString() });
      failed++;
    }
  }

  // Test 1: Database Connection
  test('Database Connection', function() {
    var ss = getComphoneSheet();
    return { success: !!ss, name: ss ? ss.getName() : null };
  });

  // Test 2: Config
  test('Config Loaded', function() {
    return { success: !!CONFIG && !!CONFIG.SHEETS, sheets: Object.keys(CONFIG.SHEETS).length };
  });

  // Test 3: DBJOBS Sheet
  test('DBJOBS Sheet', function() {
    var ss = getComphoneSheet();
    var sh = ss ? ss.getSheetByName('DBJOBS') : null;
    return { success: !!sh, rows: sh ? sh.getLastRow() : 0 };
  });

  // Test 4: DB_INVENTORY Sheet
  test('DB_INVENTORY Sheet', function() {
    var ss = getComphoneSheet();
    var sh = ss ? ss.getSheetByName('DB_INVENTORY') : null;
    return { success: !!sh, rows: sh ? sh.getLastRow() : 0 };
  });

  // Test 5: DB_USERS Sheet
  test('DB_USERS Sheet', function() {
    var ss = getComphoneSheet();
    var sh = ss ? ss.getSheetByName('DB_USERS') : null;
    return { success: !!sh, rows: sh ? sh.getLastRow() : 0 };
  });

  // Test 6: getDashboardData
  test('getDashboardData API', function() {
    var result = getDashboardData();
    return { success: result && result.success !== false };
  });

  // Test 7: getInventoryOverview
  test('getInventoryOverview API', function() {
    var result = getInventoryOverview({});
    return { success: result && result.success !== false };
  });

  // Test 8: systemStatus
  test('systemStatus API', function() {
    var result = systemStatus();
    return { success: result && result.overall !== 'ERROR' };
  });

  // สรุปผล
  Logger.log('\n╔══════════════════════════════════╗');
  Logger.log('║      QUICK TEST RESULTS          ║');
  Logger.log('╚══════════════════════════════════╝');
  results.forEach(function(r) {
    Logger.log(r.status + ' ' + r.test + (r.error ? ' — ' + r.error : ''));
  });
  Logger.log('──────────────────────────────────');
  Logger.log('✅ PASS: ' + passed + '  ❌ FAIL: ' + failed + '  Total: ' + results.length);

  return {
    success: failed === 0,
    passed: passed,
    failed: failed,
    total: results.length,
    results: results
  };
}
