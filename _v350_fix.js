const fs = require('fs');
const D = 'C:/Users/Server/.openclaw/workspace/Shop_vnext/src';

// ============================================================
// FIX 1: Inventory.gs - เพิ่ม checkLowStockAlert()
// ============================================================
let inv = fs.readFileSync(D + '/Inventory.gs', 'utf8');
if (!inv.includes('function checkLowStockAlert(')) {
  const newFn = `
// ============================================================
// 📦 V350: Low Stock Alert (standalone function for triggers)
// ============================================================
function checkLowStockAlert() {
  try {
    var ss = getComphoneSheet();
    var sh = findSheetByName(ss, 'DB_INVENTORY');
    if (!sh) return { error: 'DB_INVENTORY not found' };

    var all = sh.getDataRange().getValues();
    var lowItems = [];
    var ALERT_THRESHOLD = 5;

    for (var i = 1; i < all.length; i++) {
      var qty = Number(all[i][2] || 0);
      if (qty < ALERT_THRESHOLD) {
        lowItems.push({ code: String(all[i][0]), name: String(all[i][1]), qty: qty });
      }
    }

    if (lowItems.length > 0 && typeof sendLineNotify === 'function') {
      var msg = '⚠️ แจ้งเตือนสต็อกต่ำ!\\n';
      for (var j = 0; j < lowItems.length; j++) {
        msg += '• ' + lowItems[j].name + ' (เหลือ ' + lowItems[j].qty + ')\\n';
      }
      sendLineNotify({ message: msg, room: 'TECHNICIAN' });
    }
    return { success: true, lowStock: lowItems.length, items: lowItems };
  } catch(e) { return { error: e.toString() }; }
}
`;
  inv = inv + '\n' + newFn;
  fs.writeFileSync(D + '/Inventory.gs', inv, 'utf8');
  console.log('✅ Fix 1: checkLowStockAlert() added to Inventory.gs');
} else {
  console.log('⏭️ Fix 1: checkLowStockAlert() already exists');
}

// ============================================================
// FIX 2: PhotoQueue.gs - แก้ sendLineNotify(notifyMsg) → Object
// ============================================================
let pq = fs.readFileSync(D + '/PhotoQueue.gs', 'utf8');
let pqChanges = 0;
// Find sendLineNotify(notifyMsg) and replace with sendLineNotify({ message: notifyMsg, room: 'TECHNICIAN' })
const pqOld = pq;
pq = pq.replace(/sendLineNotify\(notifyMsg\)/g, "sendLineNotify({ message: notifyMsg, room: 'TECHNICIAN' })");
if (pq !== pqOld) {
  fs.writeFileSync(D + '/PhotoQueue.gs', pq, 'utf8');
  pqChanges = (pqOld.match(/sendLineNotify\(notifyMsg\)/g) || []).length;
  console.log('✅ Fix 2: PhotoQueue.gs sendLineNotify() fixed (' + pqChanges + ' places)');
} else {
  console.log('⏭️ Fix 2: PhotoQueue.gs sendLineNotify() already correct');
}

// ============================================================
// FIX 3: JobsHandler.gs - Fix openJob(): เพิ่ม d.phone ลง row array
// ============================================================
let jh = fs.readFileSync(D + '/JobsHandler.gs', 'utf8');

// Fix openJob: phone field missing from row
// Current: var row = [id, name, symptom, status, tech, gps, '', '', '', new Date(), '', '', ''];
// Should include phone between symptom and status (col 3)
// The current structure: [id, name, symptom, status, tech, gps, '', '', '', created, updated, note, folder]
// We need: [id, name, symptom, phone, status, tech, gps, '', '', '', created, updated, note, folder]
// Actually let's just fix to include phone

if (jh.includes("var row = [id, name, symptom, status, tech, gps, '', '', '', new Date(), '', '', '']")) {
  jh = jh.replace(
    "var row = [id, name, symptom, status, tech, gps, '', '', '', new Date(), '', '', '']",
    "var row = [id, name, symptom, phone, status, tech, gps, '', '', '', new Date(), '', '', '']"
  );
  fs.writeFileSync(D + '/JobsHandler.gs', jh, 'utf8');
  console.log('✅ Fix 3: openJob() - phone added to row array');
} else {
  console.log('⏭️ Fix 3: openJob() phone check needed (checking current state...)');
  const rowMatch = jh.match(/var row = \[id,[^\]]+\]/);
  if (rowMatch) console.log('   Current row:', rowMatch[0]);
}

// Fix completeJob(): scope bug - total declared inside if, used in log
// Need to declare labor & total BEFORE the loop
if (jh.includes("var jobId = data.job_id || '';") && !jh.includes("var labor = Number(data.labor_cost || 0);")) {
  // Add labor/total declaration before the for loop
  jh = jh.replace(
    "var jobId = data.job_id || '';\n    for (var i = 1; i < all.length; i++) {",
    "var jobId = data.job_id || '';\n\n    // V350 Fix: ย้าย total ออกมานอก scope\n    var labor = Number(data.labor_cost || 0);\n    var total = labor + Number(data.parts_cost || 0);\n\n    for (var i = 1; i < all.length; i++) {"
  );

  // Remove duplicate labor/total inside the if block
  jh = jh.replace(
    /\n\s+\/\/ V320: Create billing\n\s+var billSh = findSheetByName\(ss, 'DB_BILLING'\);\n\s+if \(billSh\) \{\n\s+var labor = data\.labor_cost \|\| 0;\n\s+var total = labor \+ \(data\.parts_cost \|\| 0\);/,
    "\n          // V320: Create billing\n          var billSh = findSheetByName(ss, 'DB_BILLING');"
  );

  fs.writeFileSync(D + '/JobsHandler.gs', jh, 'utf8');
  console.log('✅ Fix 4: completeJob() - labor/total moved outside scope');
} else {
  console.log('⏭️ Fix 4: completeJob() scope check (already fixed or different structure)');
  // Check if the fix is already partially applied
  if (jh.includes("var labor = Number(data.labor_cost || 0);") && jh.includes("var total = labor + Number(data.parts_cost || 0);")) {
    console.log('   labor/total already declared outside');
  }
  if (jh.includes("var labor = data.labor_cost || 0;")) {
    console.log('   WARNING: still has old duplicate declaration');
  }
}

// ============================================================
// Final validation
// ============================================================
console.log('\n=== V350 Validation ===');

// Check Inventory.gs has checkLowStockAlert
const invCheck = fs.readFileSync(D + '/Inventory.gs', 'utf8');
console.log(invCheck.includes('function checkLowStockAlert(') ? '✅ checkLowStockAlert' : '❌ checkLowStockAlert');

// Check PhotoQueue.gs has no sendLineNotify(notifyMsg)
const pqCheck = fs.readFileSync(D + '/PhotoQueue.gs', 'utf8');
console.log(!pqCheck.includes('sendLineNotify(notifyMsg)') ? '✅ PhotoQueue sendLineNotify' : '❌ PhotoQueue sendLineNotify');

// Check JobsHandler.gs
const jhCheck = fs.readFileSync(D + '/JobsHandler.gs', 'utf8');

// Check phone in openJob row
const openJobMatch = jhCheck.match(/function openJob\([^{]+\{[\s\S]*?var row = \[[^\]]+\]/);
if (openJobMatch) {
  const row = openJobMatch[0];
  console.log(row.includes('phone') ? '✅ openJob has phone' : '❌ openJob missing phone');
}

// Check labor/total outside loop in completeJob
const cmMatch = jhCheck.match(/function completeJob\([^{]+\{[\s\S]*?var total = labor \+ Number\(data\.parts_cost \|\| 0\);/);
console.log(cmMatch ? '✅ completeJob scope fix' : '❌ completeJob scope issue');

// Check no duplicate labor/total inside billing block
const dupe = jhCheck.match(/var labor = data\.labor_cost \|\| 0;/);
console.log(dupe ? '❌ Still has duplicate labor declaration' : '✅ No duplicate labor declaration');

console.log('\n🎉 V350 Hotfix Complete!');
