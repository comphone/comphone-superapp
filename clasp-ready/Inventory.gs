// ============================================================
// COMPHONE SUPER APP V5.5
// ============================================================
// Inventory.gs - ระบบสต็อกสัมพันธ์ครบวงจร
// จองของเมื่อเปิดงาน / ตัดสต็อกเมื่อปิดงาน / แจ้งเตือน reorder
// ============================================================

var INVENTORY_ALERT_THRESHOLD = 5;

// ---------- RESERVATION SYSTEM ----------
function reserveItemsForJob(jobId, items) {
  try {
    var ss = getComphoneSheet();
    var resSheet = findSheetByName(ss, 'DB_RESERVATIONS');
    if (!resSheet) {
      resSheet = ss.insertSheet('DB_RESERVATIONS');
      resSheet.getRange(1, 1, 1, 6).setValues([['job_id', 'item_code', 'item_name', 'qty', 'reserved_at', 'status']]);
    }
    var invSheet = findSheetByName(ss, 'DB_INVENTORY');
    if (!invSheet) return { error: 'DB_INVENTORY not found' };
    var invAll = invSheet.getDataRange().getValues();
    var results = [];
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var code = item.code || '';
      var qty = Number(item.qty || 1);
      var found = false;
      for (var j = 1; j < invAll.length; j++) {
        if (String(invAll[j][0]) === code || String(invAll[j][1]) === code) {
          found = true;
          var available = Number(invAll[j][2] || 0);
          if (available >= qty) {
            // บันทึก reservation
            resSheet.appendRow([jobId, code, String(invAll[j][1]), qty, new Date(), 'reserved']);
            // ลด available qty
            invAll[j][2] = available - qty;
            results.push({ code: code, name: String(invAll[j][1]), qty: qty, status: 'reserved' });
          } else {
            results.push({ code: code, name: String(invAll[j][1]), qty: qty, status: 'insufficient', available: available });
          }
          break;
        }
      }
      if (!found) results.push({ code: code, name: code, qty: qty, status: 'not_found' });
    }
    invSheet.getDataRange().setValues(invAll);
    return { success: true, jobId: jobId, items: results };
  } catch(e) { return { error: e.toString() }; }
}

function releaseReservation(jobId) {
  try {
    var ss = getComphoneSheet();
    var resSheet = findSheetByName(ss, 'DB_RESERVATIONS');
    if (!resSheet) return { success: false, message: 'No reservations sheet' };
    var invSheet = findSheetByName(ss, 'DB_INVENTORY');
    if (!invSheet) return { error: 'DB_INVENTORY not found' };
    var resAll = resSheet.getDataRange().getValues();
    var invAll = invSheet.getDataRange().getValues();
    var released = 0;
    for (var i = 1; i < resAll.length; i++) {
      if (String(resAll[i][0]) === jobId && String(resAll[i][5]) === 'reserved') {
        var code = String(resAll[i][1]);
        var qty = Number(resAll[i][3]);
        // คืนสต็อก
        for (var j = 1; j < invAll.length; j++) {
          if (String(invAll[j][0]) === code) {
            invAll[j][2] = Number(invAll[j][2]) + qty;
            released++;
            break;
          }
        }
        resAll[i][5] = 'released';
        resAll[i][4] = new Date();
      }
    }
    resSheet.getDataRange().setValues(resAll);
    invSheet.getDataRange().setValues(invAll);
    return { success: true, released: released };
  } catch(e) { return { error: e.toString() }; }
}

// ---------- CUT STOCK (เมื่อปิดงาน) ----------
function cutStockAuto(jobId) {
  try {
    var ss = getComphoneSheet();
    var resSheet = findSheetByName(ss, 'DB_RESERVATIONS');
    var invSheet = findSheetByName(ss, 'DB_INVENTORY');
    var result = { success: true, jobId: jobId, items: [], warnings: [] };

    if (resSheet) {
      // มี reservation → เปลี่ยน status จาก reserved → consumed
      var resAll = resSheet.getDataRange().getValues();
      for (var i = 1; i < resAll.length; i++) {
        if (String(resAll[i][0]) === jobId && String(resAll[i][5]) === 'reserved') {
          resAll[i][5] = 'consumed';
          resAll[i][4] = new Date();
          result.items.push({ code: String(resAll[i][1]), name: String(resAll[i][2]), qty: Number(resAll[i][3]) });
        }
      }
      resSheet.getDataRange().setValues(resAll);
    }

    // ตรวจสอบ low stock
    if (invSheet) {
      var invAll = invSheet.getDataRange().getValues();
      for (var j = 1; j < invAll.length; j++) {
        var qty = Number(invAll[j][2] || 0);
        if (qty < INVENTORY_ALERT_THRESHOLD && qty >= 0) {
          result.warnings.push({ code: String(invAll[j][0]), name: String(invAll[j][1]), qty: qty });
        }
      }
    }

    if (result.warnings.length > 0) {
      _notifyLowStock(result.warnings);
    }

    return result;
  } catch(e) { return { error: e.toString() }; }
}

// ---------- GEMINI REORDER ----------
function geminiReorderSuggestion() {
  var apiKey = getConfig('GEMINI_API_KEY') || getConfig('GOOGLE_AI_API_KEY') || '';
  try {
    _logInfo_('geminiReorderSuggestion', 'Starting reorder analysis', { hasApiKey: !!apiKey });
    var ss = getComphoneSheet();
    var invSheet = findSheetByName(ss, 'DB_INVENTORY');
    var resSheet = findSheetByName(ss, 'DB_RESERVATIONS');
    if (!invSheet) return { error: 'DB_INVENTORY not found' };

    var invAll = invSheet.getDataRange().getValues();

    // Dynamic header mapping (Phase 2E data integrity fix)
    var hdrs = invAll[0];
    var colMap = { code:0, name:1, qty:2, cost:3 };
    for (var hi = 0; hi < hdrs.length; hi++) {
      var hv = String(hdrs[hi]).toLowerCase().replace(/_/g,'');
      if (hv === 'itemcode' || hv === 'code') colMap.code = hi;
      else if (hv === 'itemname' || hv === 'name') colMap.name = hi;
      else if (hv === 'qty' || hv === 'quantity') colMap.qty = hi;
      else if (hv === 'cost') colMap.cost = hi;
    }

    var lowItems = [];
    var reservedItems = [];

    for (var i = 1; i < invAll.length; i++) {
      var code = String(invAll[i][colMap.code]);
      var name = String(invAll[i][colMap.name]);
      var qty = Number(invAll[i][colMap.qty] || 0);
      var cost = Number(invAll[i][colMap.cost] || 0);
      var reserved = 0;

      if (resSheet) {
        var resAll = resSheet.getDataRange().getValues();
        for (var j = 1; j < resAll.length; j++) {
          if (String(resAll[j][1]) === code && String(resAll[j][5]) === 'reserved') {
            reserved += Number(resAll[j][3] || 0);
          }
        }
      }

      var effective = qty - reserved;

      if (effective < INVENTORY_ALERT_THRESHOLD) {
        lowItems.push({ code: code, name: name, qty: qty, reserved: reserved, effective: effective, cost: cost });
      }
    }

    if (lowItems.length === 0) {
      return { success: true, message: 'สต็อกพร้อมทั้งหมดครับ ไม่มีรายการต้องสั่งซื้อ' };
    }

    var reorderText = JSON.stringify(lowItems);

    if (apiKey) {
      return _geminiAnalyzeReorder(apiKey, lowItems);
    }

    // Fallback — ไม่มี Gemini
    var msg = _buildReorderMessage(lowItems);
    sendLineNotify({ message: msg, room: 'PROCUREMENT' });
    return { success: true, message: msg, items: lowItems };
  } catch(e) { _logError_('MEDIUM', 'geminiReorderSuggestion', e); return { error: e.toString() }; }
}

function _geminiAnalyzeReorder(apiKey, lowItems) {
  try {
    var prompt = 'คุณคือผู้ช่วยจัดซื้อร้าน Comphone & Electronics วิเคราะห์รายการสินค้าที่ใกล้หมดและแนะนำการสั่งซื้อ\n\n';
    prompt += 'รายการที่ใกล้หมด:\n';
    for (var i = 0; i < lowItems.length; i++) {
      var item = lowItems[i];
      prompt += '- ' + item.name + ' (' + item.code + ') เหลือ ' + item.effective + ' ชิ้น (จองอยู่ ' + item.reserved + ') ราคาทุน ' + item.cost + ' บาท\n';
    }
    prompt += '\nตอบ JSON เท่านั้น:\n';
    prompt += '{\n';
    prompt += '  "summary": "สรุปสั้นๆ สถานะสต็อก",\n';
    prompt += '  "suggested_orders": [{"code":"รหัส","name":"ชื่อ","order_qty":จำนวน,"est_cost":ราคา}],\n';
    prompt += '  "total_est_cost": ราคารวมทั้งหมด,\n';
    prompt += '  "priority": "สูง/กลาง/ต่ำ"\n';
    prompt += '}\n';
    prompt += '\nตอบ JSON อย่างเดียว ไม่มีข้อความอื่น:';

    var bodyObj = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 1024 }
    };

    var url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + apiKey;
    var options = {
      method: 'post', contentType: 'application/json',
      payload: JSON.stringify(bodyObj), muteHttpExceptions: true
    };

    var response = UrlFetchApp.fetch(url, options);
    var result = JSON.parse(response.getContentText());

    if (result.error) return { error: 'Gemini Error: ' + JSON.stringify(result.error) };

    var content = '';
    if (result.candidates && result.candidates[0] && result.candidates[0].content &&
        result.candidates[0].content.parts) {
      content = result.candidates[0].content.parts[0].text || '';
    }

    var jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      var parsed = JSON.parse(jsonMatch[0]);
      parsed.provider = 'gemini-2.0-flash';
      parsed.raw_items = lowItems;

      var msg = '📦 ' + (parsed.summary || 'รายการสั่งซื้อแนะนำ') + '\n\n';
      msg += '🔍 Priority: ' + (parsed.priority || '-') + '\n';
      if (parsed.suggested_orders && parsed.suggested_orders.length > 0) {
        msg += '\n🛒 คำสั่งซื้อแนะนำ:\n';
        for (var j = 0; j < parsed.suggested_orders.length; j++) {
          var so = parsed.suggested_orders[j];
          msg += '• ' + so.name + ' (' + so.code + ') — สั่ง ' + so.order_qty + ' ชิ้น ≈ ' + (so.est_cost || 0).toLocaleString() + ' บาท\n';
        }
      }
      if (parsed.total_est_cost) {
        msg += '\n💰 ประมาณการรวม: ' + parsed.total_est_cost.toLocaleString() + ' บาท';
      }

      sendLineNotify({ message: msg, room: 'PROCUREMENT' });
      sendLineNotify({ message: msg, room: 'EXECUTIVE' });
      return { success: true, ai: parsed, message: msg };
    }

    var msg = _buildReorderMessage(lowItems);
    sendLineNotify({ message: msg, room: 'PROCUREMENT' });
    return { success: true, message: msg, items: lowItems };
  } catch(e) {
    var m2 = _buildReorderMessage(lowItems);
    sendLineNotify({ message: m2, room: 'PROCUREMENT' });
    return { success: true, message: m2, items: lowItems };
  }
}

function _buildReorderMessage(lowItems) {
  var msg = '🚨 แจ้งเตือนสต็อก Comphone\n\n';
  msg += '❌ หมดสต็อก / ใกล้หมด:\n';
  for (var i = 0; i < lowItems.length; i++) {
    var item = lowItems[i];
    msg += '  🟡 ' + item.name + ' (' + item.code + ') — เหลือ ' + item.effective + ' ชิ้น';
    if (item.reserved > 0) msg += ' (จอง ' + item.reserved + ')';
    msg += '\n';
  }
  msg += '\n🛒 สั่งเพิ่มด่วนครับคุณโหน่ง!';
  return msg;
}

function _notifyLowStock(warnings) {
  if (warnings.length === 0) return;
  var msg = '⚠️ สต็อกต่ำหลังปิดงาน:\n';
  for (var i = 0; i < warnings.length; i++) {
    msg += '• ' + warnings[i].name + ' — เหลือ ' + warnings[i].qty + ' ชิ้น\n';
  }
  sendLineNotify({ message: msg, room: 'PROCUREMENT' });
}

// ---------- BASIC FUNCTIONS ----------
function checkStock(data) {
  try {
    var ss = getComphoneSheet();
    var sh = findSheetByName(ss, 'DB_INVENTORY');
    if (!sh) return { error: 'DB_INVENTORY not found' };
    var all = sh.getDataRange().getValues();
    var resSheet = findSheetByName(ss, 'DB_RESERVATIONS');
    var search = (data.search || '').toLowerCase();

    // Dynamic header mapping (Phase 2E data integrity fix)
    var hdrs = all[0];
    var colMap = { code:0, name:1, qty:2, cost:3, price:4 };
    for (var hi = 0; hi < hdrs.length; hi++) {
      var hv = String(hdrs[hi]).toLowerCase().replace(/_/g,'');
      if (hv === 'itemcode' || hv === 'code') colMap.code = hi;
      else if (hv === 'itemname' || hv === 'name') colMap.name = hi;
      else if (hv === 'qty' || hv === 'quantity') colMap.qty = hi;
      else if (hv === 'cost') colMap.cost = hi;
      else if (hv === 'price') colMap.price = hi;
    }

    var results = [];
    for (var i = 1; i < all.length; i++) {
      var v = (String(all[i][colMap.code]) + ' ' + String(all[i][colMap.name])).toLowerCase();
      if (!search || v.indexOf(search) > -1) {
        var reserved = 0;
        if (resSheet) {
          var resAll = resSheet.getDataRange().getValues();
          for (var j = 1; j < resAll.length; j++) {
            if (String(resAll[j][1]) === String(all[i][colMap.code]) && String(resAll[j][5]) === 'reserved') {
              reserved += Number(resAll[j][3] || 0);
            }
          }
        }
        var qty = Number(all[i][colMap.qty] || 0);
        results.push({
          code: String(all[i][colMap.code]), name: String(all[i][colMap.name]),
          qty: qty, reserved: reserved, available: qty - reserved,
          cost: Number(all[i][colMap.cost] || 0), price: Number(all[i][colMap.price] || 0),
          alert: (qty - reserved) < INVENTORY_ALERT_THRESHOLD
        });
      }
    }
    return { total_items: results.length, items: results };
  } catch(e) { return { error: e.toString() }; }
}

// ============================================================
// V353: barcodeLookup — Dynamic headers, คืน found + alert + cost
// ============================================================
function barcodeLookup(data) {
  try {
    var bc = (data.barcode || '').trim();
    if (!bc) return { found: false, message: 'ไม่มีรหัส barcode' };
    var ss = getComphoneSheet();
    var sh = findSheetByName(ss, 'DB_INVENTORY');
    if (!sh) return { error: 'DB_INVENTORY not found' };
    var all = sh.getDataRange().getValues();

    // V353: Dynamic header lookup
    var hdrs = all[0];
    var cCode = 0, cName = 1, cQty = 2, cCost = 3, cPrice = 4;
    for (var hi = 0; hi < hdrs.length; hi++) {
      var hv = String(hdrs[hi]).toLowerCase();
      if (hv === 'code' || hv === 'item_code' || hv.indexOf('รหัส') > -1) cCode = hi;
      else if (hv === 'name' || hv === 'item_name' || hv.indexOf('ชื่') > -1) cName = hi;
      else if (hv === 'qty' || hv === 'quantity' || hv.indexOf('จำนวน') > -1) cQty = hi;
      else if (hv === 'cost' || hv.indexOf('ต้นทุน') > -1) cCost = hi;
      else if (hv === 'price' || hv.indexOf('ราคาขาย') > -1) cPrice = hi;
    }

    // คำนวณ reserved qty
    var reserved = 0;
    var resSheet = findSheetByName(ss, 'DB_RESERVATIONS');
    var foundCode = null;

    for (var i = 1; i < all.length; i++) {
      var rowCode = String(all[i][cCode]);
      var rowName = String(all[i][cName]);
      if (rowCode === bc || rowName === bc ||
          rowCode.toLowerCase() === bc.toLowerCase() ||
          rowName.toLowerCase() === bc.toLowerCase()) {
        foundCode = rowCode;
        var qty = Number(all[i][cQty] || 0);
        var cost = Number(all[i][cCost] || 0);
        var price = Number(all[i][cPrice] || 0);

        // ตรวจ reservation
        if (resSheet) {
          var resAll = resSheet.getDataRange().getValues();
          for (var ri = 1; ri < resAll.length; ri++) {
            if (String(resAll[ri][1]) === foundCode && String(resAll[ri][5]) === 'reserved') {
              reserved += Number(resAll[ri][3] || 0);
            }
          }
        }
        var effective = qty - reserved;
        var alert = effective < INVENTORY_ALERT_THRESHOLD;

        return {
          found: true,
          code: rowCode,
          name: rowName,
          qty: qty,
          reserved: reserved,
          effective: effective,
          cost: cost,
          price: price,
          alert: alert,
          statusText: alert ? '\ud83d\udd34 เหลือน้อย! (' + effective + ')' : '\u2705 มีสต็อก (' + effective + ')'
        };
      }
    }
    return { found: false, message: 'ไม่พบสินค้า: ' + bc };
  } catch(e) { return { error: e.toString() }; }
}

// ============================================================
// V353: scanWithdrawStock — เบิกสินค้าจากการสแกน
// ============================================================
function scanWithdrawStock(data) {
  var lock = LockService.getScriptLock();
  try { lock.waitLock(10000); } catch(e) { return { error: 'Lock timeout' }; }
  try {
    var bc = (data.barcode || '').trim();
    var qty = Math.max(1, parseInt(data.qty) || 1);
    var jobId = (data.job_id || '').trim();
    var tech = data.tech || 'Dashboard';

    if (!bc) return { error: 'ไม่มีรหัส barcode' };

    var ss = getComphoneSheet();
    var sh = findSheetByName(ss, 'DB_INVENTORY');
    if (!sh) return { error: 'DB_INVENTORY not found' };
    var all = sh.getDataRange().getValues();

    // Dynamic header
    var hdrs = all[0];
    var cCode = 0, cName = 1, cQty = 2;
    for (var hi = 0; hi < hdrs.length; hi++) {
      var hv = String(hdrs[hi]).toLowerCase();
      if (hv === 'code' || hv === 'item_code') cCode = hi;
      else if (hv === 'name' || hv === 'item_name') cName = hi;
      else if (hv === 'qty' || hv === 'quantity') cQty = hi;
    }

    for (var i = 1; i < all.length; i++) {
      var rowCode = String(all[i][cCode]);
      var rowName = String(all[i][cName]);
      if (rowCode === bc || rowName === bc ||
          rowCode.toLowerCase() === bc.toLowerCase() ||
          rowName.toLowerCase() === bc.toLowerCase()) {
        var current = Number(all[i][cQty] || 0);
        if (current < qty) {
          return { error: 'สต็อกไม่พอ! คงเหลือ: ' + current + ', เบิก: ' + qty };
        }
        var newQty = current - qty;
        sh.getRange(i + 1, cQty + 1).setValue(newQty);

        // Log activity
        try {
          logActivity('SCAN_WITHDRAW', tech,
            rowCode + ' \u00d7' + qty + (jobId ? ' [' + jobId + ']' : '') +
            ' | คงเหลือ: ' + current + ' \u2192 ' + newQty);
        } catch(le) {}

        // Low stock check
        if (newQty < INVENTORY_ALERT_THRESHOLD) {
          try { checkLowStockAlert(); } catch(ae) {}
        }

        return {
          success: true,
          code: rowCode,
          name: rowName,
          withdrawn: qty,
          remaining: newQty,
          jobId: jobId,
          alert: newQty < INVENTORY_ALERT_THRESHOLD
        };
      }
    }
    return { error: 'ไม่พบสินค้า: ' + bc };
  } catch(e) {
    return { error: e.toString() };
  } finally {
    try { lock.releaseLock(); } catch(ex) {}
  }
}

// ============================================================
// checkLowStockAlert — reservation-aware low stock alert
// ============================================================
function checkLowStockAlert() {
  try {
    _logInfo_('checkLowStockAlert', 'Starting low stock scan');
    var ss = getComphoneSheet();
    var sh = findSheetByName(ss, 'DB_INVENTORY');
    if (!sh) { _logError_('HIGH', 'checkLowStockAlert', 'DB_INVENTORY not found'); return { error: 'DB_INVENTORY not found' }; }
    var all = sh.getDataRange().getValues();
    var resSheet = findSheetByName(ss, 'DB_RESERVATIONS');

    // Dynamic header mapping (Phase 2E data integrity fix)
    var hdrs = all[0];
    var colMap = { code:0, name:1, qty:2 };
    for (var hi = 0; hi < hdrs.length; hi++) {
      var hv = String(hdrs[hi]).toLowerCase().replace(/_/g,'');
      if (hv === 'itemcode' || hv === 'code') colMap.code = hi;
      else if (hv === 'itemname' || hv === 'name') colMap.name = hi;
      else if (hv === 'qty' || hv === 'quantity') colMap.qty = hi;
    }

    var lowItems = [];
    var ALERT_THRESHOLD = (typeof INVENTORY_ALERT_THRESHOLD !== 'undefined') ? INVENTORY_ALERT_THRESHOLD : 5;
    for (var i = 1; i < all.length; i++) {
      var code = String(all[i][colMap.code]);
      var name = String(all[i][colMap.name]);
      var qty = Number(all[i][colMap.qty] || 0);
      var reserved = 0;
      if (resSheet) {
        var resAll = resSheet.getDataRange().getValues();
        for (var j = 1; j < resAll.length; j++) {
          if (String(resAll[j][1]) === code && String(resAll[j][5]) === 'reserved') {
            reserved += Number(resAll[j][3] || 0);
          }
        }
      }
      var effective = qty - reserved;
      if (effective < ALERT_THRESHOLD) {
        lowItems.push({ code: code, name: name, qty: qty, reserved: reserved, effective: effective });
      }
    }
    if (lowItems.length > 0 && typeof _notifyLowStock === 'function') {
      _notifyLowStock(lowItems);
    }
    return { success: true, lowStock: lowItems.length, items: lowItems };
  } catch(e) { _logError_('MEDIUM', 'checkLowStockAlert', e); return { error: e.toString() }; }
}


// ============================================================
// V5.5 Inventory Enhancement — 3-Layer Inventory / Van Stock / Tool Audit
// ============================================================

var INVENTORY_V55_HEADERS = [
  'Item_Code',
  'Item_Name',
  'Qty',
  'Cost',
  'Price',
  'Location_Type',
  'Location_Code',
  'Assigned_To',
  'Updated_At',
  'Last_Job_ID',
  'Notes'
];

function getInventoryOverview(data) {
  try {
    data = data || {};
    var inv = getInventoryRowsV55_(data);
    if (!inv.success) return inv;
    var grouped = {};
    for (var i = 0; i < inv.items.length; i++) {
      var item = inv.items[i];
      var key = item.item_code || item.item_name;
      if (!grouped[key]) {
        grouped[key] = {
          item_code: item.item_code,
          item_name: item.item_name,
          total_qty: 0,
          main_qty: 0,
          van_qty: 0,
          site_qty: 0,
          records: []
        };
      }
      grouped[key].total_qty += item.qty;
      if (item.location_type === 'MAIN') grouped[key].main_qty += item.qty;
      if (item.location_type === 'VAN') grouped[key].van_qty += item.qty;
      if (item.location_type === 'SITE') grouped[key].site_qty += item.qty;
      grouped[key].records.push(item);
    }
    var out = [];
    for (var keyName in grouped) if (grouped.hasOwnProperty(keyName)) out.push(grouped[keyName]);
    out.sort(function(a, b) { return String(a.item_name).localeCompare(String(b.item_name)); });
    return { success: true, total_items: out.length, items: out };
  } catch (e) {
        try { if (typeof _logError_ === 'function') _logError_('MEDIUM', 'getInventoryOverview', e, {source: 'INVENTORY'}); } catch(_le) {}
    return { success: false, error: e.toString() };
  }
}

function transferStock(fromLocation, toLocation, itemId, qty, options) {
  var lock = LockService.getScriptLock();
  try { lock.waitLock(10000); } catch (e) { return { success: false, error: 'Lock timeout' }; }
  try {
    options = options || {};
    var moveQty = Math.max(1, parseInt(qty || options.qty, 10) || 0);
    if (!moveQty) return { success: false, error: 'qty is required' };

    var from = normalizeInventoryLocation_(fromLocation, options.from_location_code, options.from_assigned_to);
    var to = normalizeInventoryLocation_(toLocation, options.to_location_code, options.to_assigned_to);
    if (!from.location_type || !to.location_type) return { success: false, error: 'Invalid location' };

    var sheetData = getInventorySheetData_();
    if (!sheetData.success) return sheetData;

    var itemKey = safeString_(itemId || options.item_id || options.code || options.item_code || options.name);
    if (!itemKey) return { success: false, error: 'itemId is required' };

    var fromIndex = findInventoryRowByLocationAndItem_(sheetData.rows, sheetData.ctx, itemKey, from);
    if (fromIndex < 1) return { success: false, error: 'ไม่พบสินค้าในต้นทาง' };

    var fromRow = sheetData.rows[fromIndex];
    var available = normalizeNumber_(fromRow[sheetData.ctx.indices.qty], 0);
    if (available < moveQty) {
      return { success: false, error: 'จำนวนไม่พอสำหรับโอนย้าย', available: available, requested: moveQty };
    }

    var itemCode = safeString_(fromRow[sheetData.ctx.indices.itemCode]);
    var itemName = safeString_(fromRow[sheetData.ctx.indices.itemName]);
    fromRow[sheetData.ctx.indices.qty] = available - moveQty;
    fromRow[sheetData.ctx.indices.updatedAt] = new Date();
    fromRow[sheetData.ctx.indices.lastJobId] = firstNonEmpty_(options.job_id, safeCellRaw_(fromRow, sheetData.ctx.indices.lastJobId));

    var toIndex = findInventoryRowByLocationAndItem_(sheetData.rows, sheetData.ctx, itemCode || itemName, to);
    if (toIndex < 1) {
      var newRow = createEmptyRow_(sheetData.ctx.headers.length);
      setIfIndex_(newRow, sheetData.ctx.indices.itemCode, itemCode || itemKey);
      setIfIndex_(newRow, sheetData.ctx.indices.itemName, itemName || itemKey);
      setIfIndex_(newRow, sheetData.ctx.indices.qty, moveQty);
      setIfIndex_(newRow, sheetData.ctx.indices.cost, safeCellRaw_(fromRow, sheetData.ctx.indices.cost));
      setIfIndex_(newRow, sheetData.ctx.indices.price, safeCellRaw_(fromRow, sheetData.ctx.indices.price));
      setInventoryLocationToRow_(newRow, sheetData.ctx.indices, to);
      setIfIndex_(newRow, sheetData.ctx.indices.updatedAt, new Date());
      setIfIndex_(newRow, sheetData.ctx.indices.lastJobId, firstNonEmpty_(options.job_id, ''));
      setIfIndex_(newRow, sheetData.ctx.indices.notes, 'Transferred from ' + from.location_type);
      sheetData.rows.push(newRow);
    } else {
      var toRow = sheetData.rows[toIndex];
      toRow[sheetData.ctx.indices.qty] = normalizeNumber_(toRow[sheetData.ctx.indices.qty], 0) + moveQty;
      toRow[sheetData.ctx.indices.updatedAt] = new Date();
      toRow[sheetData.ctx.indices.lastJobId] = firstNonEmpty_(options.job_id, safeCellRaw_(toRow, sheetData.ctx.indices.lastJobId));
      setInventoryLocationToRow_(toRow, sheetData.ctx.indices, to);
    }

    writeInventorySheetRows_(sheetData.sheet, sheetData.rows);
    appendInventoryTransferLog_(itemCode || itemKey, itemName || itemKey, moveQty, from, to, options.job_id || '', options.changed_by || options.tech || 'SYSTEM');

    return {
      success: true,
      item_code: itemCode || itemKey,
      item_name: itemName || itemKey,
      transferred_qty: moveQty,
      from: from,
      to: to,
      remaining_source_qty: fromRow[sheetData.ctx.indices.qty]
    };
  } catch (e) {
        try { if (typeof _logError_ === 'function') _logError_('MEDIUM', 'transferStock', e, {source: 'INVENTORY'}); } catch(_le) {}
    return { success: false, error: e.toString() };
  } finally {
    try { lock.releaseLock(); } catch (releaseErr) {}
  }
}

function getVanStock(techId) {
  try {
    techId = safeString_(techId);
    if (!techId) return { success: false, error: 'techId is required' };
    var rows = getInventoryRowsV55_({ location_type: 'VAN', assigned_to: techId });
    if (!rows.success) return rows;
    return {
      success: true,
      tech_id: techId,
      total_items: rows.items.length,
      items: rows.items
    };
  } catch (e) {
        try { if (typeof _logError_ === 'function') _logError_('MEDIUM', 'getVanStock', e, {source: 'INVENTORY'}); } catch(_le) {}
    return { success: false, error: e.toString() };
  }
}

function predictiveStocking(data) {
  try {
    data = data || {};
    var days = Math.max(1, parseInt(data.days || 3, 10));
    var ss = getComphoneSheet();
    if (!ss) return { success: false, error: 'Spreadsheet not found' };
    var jobSheet = findSheetByName(ss, 'DBJOBS');
    if (!jobSheet || jobSheet.getLastRow() < 2) return { success: true, days: days, technicians: [] };

    var headers = jobSheet.getRange(1, 1, 1, jobSheet.getLastColumn()).getValues()[0];
    var idxCreated = findHeaderIndex_(headers, ['เวลาสร้าง', 'Created_At', 'CreatedAt']);
    var idxJobId = findHeaderIndex_(headers, ['JobID', 'Job_ID', 'job_id']);
    var idxTech = findHeaderIndex_(headers, ['ช่างที่รับงาน', 'Technician', 'tech']);
    var idxStatus = findHeaderIndex_(headers, ['สถานะ', 'Status']);
    var idxNote = findHeaderIndex_(headers, ['หมายเหตุ', 'Note']);
    var rows = jobSheet.getDataRange().getValues();
    var now = new Date();
    var deadline = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    var techUsage = {};

    for (var i = 1; i < rows.length; i++) {
      var created = parseFlexibleDate_(safeCellRaw_(rows[i], idxCreated));
      if (!created || created.getTime() > deadline.getTime()) continue;
      var statusText = safeCellValue_(rows[i], idxStatus);
      if (statusText === 'ปิดงาน' || statusText === 'เก็บเงินแล้ว') continue;
      var tech = safeCellValue_(rows[i], idxTech) || 'UNASSIGNED';
      var jobId = safeCellValue_(rows[i], idxJobId);
      var parts = extractPartsRequirementFromText_(safeCellValue_(rows[i], idxNote));
      if (!techUsage[tech]) techUsage[tech] = { tech_id: tech, jobs: [], required: {} };
      techUsage[tech].jobs.push({ job_id: jobId, status: statusText, parts: parts });
      for (var p = 0; p < parts.length; p++) {
        var key = parts[p].item_code || parts[p].item_name;
        if (!techUsage[tech].required[key]) {
          techUsage[tech].required[key] = {
            item_code: parts[p].item_code,
            item_name: parts[p].item_name,
            required_qty: 0
          };
        }
        techUsage[tech].required[key].required_qty += parts[p].qty;
      }
    }

    var out = [];
    for (var techId in techUsage) {
      if (!techUsage.hasOwnProperty(techId)) continue;
      var van = getVanStock(techId);
      var vanMap = {};
      if (van.success) {
        for (var v = 0; v < van.items.length; v++) {
          vanMap[van.items[v].item_code || van.items[v].item_name] = van.items[v];
        }
      }
      var shortages = [];
      for (var reqKey in techUsage[techId].required) {
        if (!techUsage[techId].required.hasOwnProperty(reqKey)) continue;
        var req = techUsage[techId].required[reqKey];
        var stock = vanMap[reqKey] ? normalizeNumber_(vanMap[reqKey].qty, 0) : 0;
        if (stock < req.required_qty) {
          shortages.push({
            item_code: req.item_code,
            item_name: req.item_name,
            required_qty: req.required_qty,
            van_qty: stock,
            shortage_qty: req.required_qty - stock
          });
        }
      }
      out.push({
        tech_id: techId,
        jobs: techUsage[techId].jobs,
        shortages: shortages,
        has_alert: shortages.length > 0
      });
    }

    for (var x = 0; x < out.length; x++) {
      if (out[x].has_alert) {
        try {
          sendLineNotify({
            room: 'PROCUREMENT',
            message: buildPredictiveStockingAlert_(out[x], days)
          });
        } catch (notifyErr) {}
      }
    }

    return { success: true, days: days, technicians: out };
  } catch (e) {
        try { if (typeof _logError_ === 'function') _logError_('MEDIUM', 'predictiveStocking', e, {source: 'INVENTORY'}); } catch(_le) {}
    return { success: false, error: e.toString() };
  }
}

function createWeeklyToolAuditChecklist(data) {
  try {
    data = data || {};
    var techId = safeString_(data.tech_id || data.tech || data.technician);
    if (!techId) return { success: false, error: 'tech_id is required' };
    var ss = getComphoneSheet();
    if (!ss) return { success: false, error: 'Spreadsheet not found' };
    var auditSheet = ensureToolAuditSheet_(ss);
    var vanStock = getVanStock(techId);
    var weekKey = getWeekKey_(data.date || new Date());
    var items = vanStock.success ? vanStock.items : [];
    if (items.length === 0) {
      auditSheet.appendRow([new Date(), weekKey, techId, '', '', 'NO_STOCK', data.created_by || 'SYSTEM', 'ไม่มีรายการอุปกรณ์บนรถ']);
      return { success: true, tech_id: techId, week_key: weekKey, total_items: 0, checklist: [] };
    }

    var checklist = [];
    for (var i = 0; i < items.length; i++) {
      auditSheet.appendRow([
        new Date(),
        weekKey,
        techId,
        items[i].item_code,
        items[i].item_name,
        'PENDING',
        data.created_by || 'SYSTEM',
        'Auto generated from van stock'
      ]);
      checklist.push({
        item_code: items[i].item_code,
        item_name: items[i].item_name,
        expected_qty: items[i].qty,
        status: 'PENDING'
      });
    }
    return { success: true, tech_id: techId, week_key: weekKey, total_items: checklist.length, checklist: checklist };
  } catch (e) {
        try { if (typeof _logError_ === 'function') _logError_('MEDIUM', 'createWeeklyToolAuditChecklist', e, {source: 'INVENTORY'}); } catch(_le) {}
    return { success: false, error: e.toString() };
  }
}

function getWeeklyToolAuditChecklist(data) {
  try {
    data = data || {};
    var techId = safeString_(data.tech_id || data.tech || data.technician);
    var weekKey = getWeekKey_(data.date || new Date());
    var ss = getComphoneSheet();
    if (!ss) return { success: false, error: 'Spreadsheet not found' };
    var auditSheet = ensureToolAuditSheet_(ss);
    var rows = auditSheet.getDataRange().getValues();
    var out = [];
    for (var i = 1; i < rows.length; i++) {
      if (techId && String(rows[i][2] || '') !== techId) continue;
      if (String(rows[i][1] || '') !== weekKey) continue;
      out.push({
        timestamp: rows[i][0],
        week_key: rows[i][1],
        tech_id: rows[i][2],
        item_code: rows[i][3],
        item_name: rows[i][4],
        status: rows[i][5],
        checked_by: rows[i][6],
        note: rows[i][7]
      });
    }
    return { success: true, week_key: weekKey, tech_id: techId, total: out.length, checklist: out };
  } catch (e) {
        try { if (typeof _logError_ === 'function') _logError_('MEDIUM', 'getWeeklyToolAuditChecklist', e, {source: 'INVENTORY'}); } catch(_le) {}
    return { success: false, error: e.toString() };
  }
}

function submitToolAudit(data) {
  try {
    data = data || {};
    var techId = safeString_(data.tech_id || data.tech || data.technician);
    var itemCode = safeString_(data.item_code || data.code || data.itemId);
    var status = safeString_(data.status || 'OK').toUpperCase();
    if (!techId || !itemCode) return { success: false, error: 'tech_id and item_code are required' };
    var weekKey = getWeekKey_(data.date || new Date());
    var ss = getComphoneSheet();
    if (!ss) return { success: false, error: 'Spreadsheet not found' };
    var auditSheet = ensureToolAuditSheet_(ss);
    var rows = auditSheet.getDataRange().getValues();
    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][1] || '') === weekKey && String(rows[i][2] || '') === techId && String(rows[i][3] || '') === itemCode) {
        rows[i][0] = new Date();
        rows[i][5] = status;
        rows[i][6] = data.checked_by || techId;
        rows[i][7] = data.note || '';
        auditSheet.getDataRange().setValues(rows);
        return { success: true, week_key: weekKey, tech_id: techId, item_code: itemCode, status: status };
      }
    }
    auditSheet.appendRow([new Date(), weekKey, techId, itemCode, data.item_name || itemCode, status, data.checked_by || techId, data.note || 'Manual audit submit']);
    return { success: true, week_key: weekKey, tech_id: techId, item_code: itemCode, status: status, created: true };
  } catch (e) {
        try { if (typeof _logError_ === 'function') _logError_('MEDIUM', 'submitToolAudit', e, {source: 'INVENTORY'}); } catch(_le) {}
    return { success: false, error: e.toString() };
  }
}

function getInventoryRowsV55_(filters) {
  try {
    filters = filters || {};
    var data = getInventorySheetData_();
    if (!data.success) return data;
    var out = [];
    var search = safeString_(filters.search).toLowerCase();
    var locationType = safeString_(filters.location_type).toUpperCase();
    var assignedTo = safeString_(filters.assigned_to);
    for (var i = 1; i < data.rows.length; i++) {
      var row = data.rows[i];
      var item = buildInventoryObjectFromRow_(row, data.ctx.indices);
      if (!item.item_code && !item.item_name) continue;
      if (search) {
        var text = [item.item_code, item.item_name, item.location_type, item.location_code, item.assigned_to].join(' ').toLowerCase();
        if (text.indexOf(search) === -1) continue;
      }
      if (locationType && item.location_type !== locationType) continue;
      if (assignedTo && String(item.assigned_to || '') !== assignedTo) continue;
      out.push(item);
    }
    return { success: true, total: out.length, items: out };
  } catch (e) {
        try { if (typeof _logError_ === 'function') _logError_('MEDIUM', 'getInventoryRowsV55_', e, {source: 'INVENTORY'}); } catch(_le) {}
    return { success: false, error: e.toString() };
  }
}

function getInventorySheetData_() {
  try {
    var ss = getComphoneSheet();
    if (!ss) return { success: false, error: 'Spreadsheet not found' };
    var sh = findSheetByName(ss, 'DB_INVENTORY');
    if (!sh) return { success: false, error: 'DB_INVENTORY not found' };
    ensureHeadersExist_(sh, INVENTORY_V55_HEADERS);
    var rows = sh.getDataRange().getValues();
    var ctx = getInventoryContextV55_(sh);
    for (var i = 1; i < rows.length; i++) {
      if (!safeCellRaw_(rows[i], ctx.indices.locationType)) rows[i][ctx.indices.locationType] = 'MAIN';
      if (!safeCellRaw_(rows[i], ctx.indices.locationCode)) rows[i][ctx.indices.locationCode] = 'MAIN_STORE';
    }
    return { success: true, sheet: sh, rows: rows, ctx: ctx };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

function writeInventorySheetRows_(sheet, rows) {
  sheet.clearContents();
  sheet.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
}

function getInventoryContextV55_(sheet) {
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  return {
    headers: headers,
    indices: {
      itemCode: findHeaderIndex_(headers, ['Item_Code', 'item_code', 'Code', 'code', 'รหัส']),
      itemName: findHeaderIndex_(headers, ['Item_Name', 'item_name', 'Name', 'name', 'ชื่อสินค้า']),
      qty: findHeaderIndex_(headers, ['Qty', 'qty', 'Quantity', 'จำนวน']),
      cost: findHeaderIndex_(headers, ['Cost', 'cost', 'ต้นทุน']),
      price: findHeaderIndex_(headers, ['Price', 'price', 'ราคาขาย']),
      locationType: findHeaderIndex_(headers, ['Location_Type', 'location_type']),
      locationCode: findHeaderIndex_(headers, ['Location_Code', 'location_code']),
      assignedTo: findHeaderIndex_(headers, ['Assigned_To', 'assigned_to']),
      updatedAt: findHeaderIndex_(headers, ['Updated_At', 'updated_at']),
      lastJobId: findHeaderIndex_(headers, ['Last_Job_ID', 'last_job_id']),
      notes: findHeaderIndex_(headers, ['Notes', 'notes', 'หมายเหตุ'])
    }
  };
}

function buildInventoryObjectFromRow_(row, indices) {
  return {
    item_code: safeCellValue_(row, indices.itemCode),
    item_name: safeCellValue_(row, indices.itemName),
    qty: normalizeNumber_(safeCellRaw_(row, indices.qty), 0),
    cost: normalizeNumber_(safeCellRaw_(row, indices.cost), 0),
    price: normalizeNumber_(safeCellRaw_(row, indices.price), 0),
    location_type: safeString_(safeCellRaw_(row, indices.locationType)).toUpperCase() || 'MAIN',
    location_code: safeCellValue_(row, indices.locationCode) || 'MAIN_STORE',
    assigned_to: safeCellValue_(row, indices.assignedTo),
    updated_at: safeCellValue_(row, indices.updatedAt),
    last_job_id: safeCellValue_(row, indices.lastJobId),
    notes: safeCellValue_(row, indices.notes)
  };
}

function normalizeInventoryLocation_(locationType, locationCode, assignedTo) {
  var type = safeString_(locationType).toUpperCase();
  if (type === 'MAIN' || type === 'MAIN_STORE' || type === 'STORE') {
    return { location_type: 'MAIN', location_code: safeString_(locationCode) || 'MAIN_STORE', assigned_to: '' };
  }
  if (type === 'VAN' || type === 'TECH_VAN') {
    return { location_type: 'VAN', location_code: safeString_(locationCode) || safeString_(assignedTo) || 'TECH_VAN', assigned_to: safeString_(assignedTo) || safeString_(locationCode) };
  }
  if (type === 'SITE' || type === 'JOB_SITE') {
    return { location_type: 'SITE', location_code: safeString_(locationCode) || 'JOB_SITE', assigned_to: safeString_(assignedTo) };
  }
  return { location_type: type, location_code: safeString_(locationCode), assigned_to: safeString_(assignedTo) };
}

function setInventoryLocationToRow_(row, indices, location) {
  setIfIndex_(row, indices.locationType, location.location_type);
  setIfIndex_(row, indices.locationCode, location.location_code);
  setIfIndex_(row, indices.assignedTo, location.assigned_to);
}

function findInventoryRowByLocationAndItem_(rows, ctx, itemKey, location) {
  var target = safeString_(itemKey).toLowerCase();
  for (var i = 1; i < rows.length; i++) {
    var code = safeString_(safeCellRaw_(rows[i], ctx.indices.itemCode)).toLowerCase();
    var name = safeString_(safeCellRaw_(rows[i], ctx.indices.itemName)).toLowerCase();
    var type = safeString_(safeCellRaw_(rows[i], ctx.indices.locationType)).toUpperCase() || 'MAIN';
    var codeLoc = safeString_(safeCellRaw_(rows[i], ctx.indices.locationCode));
    var assigned = safeString_(safeCellRaw_(rows[i], ctx.indices.assignedTo));
    var sameItem = target && (code === target || name === target);
    var sameLocation = type === location.location_type && codeLoc === location.location_code && assigned === location.assigned_to;
    if (sameItem && sameLocation) return i;
  }
  return -1;
}

function ensureInventoryTransferLogSheet_(ss) {
  var sh = findSheetByName(ss, 'DB_STOCK_MOVES');
  var headers = ['Timestamp', 'Item_Code', 'Item_Name', 'Qty', 'From_Location', 'To_Location', 'Job_ID', 'Changed_By'];
  if (!sh) sh = ss.insertSheet('DB_STOCK_MOVES');
  if (sh.getLastRow() === 0) sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  return sh;
}

function appendInventoryTransferLog_(itemCode, itemName, qty, from, to, jobId, changedBy) {
  try {
    var ss = getComphoneSheet();
    if (!ss) return;
    var sh = ensureInventoryTransferLogSheet_(ss);
    sh.appendRow([
      new Date(),
      itemCode || '',
      itemName || '',
      qty || 0,
      from.location_type + ':' + from.location_code + ':' + from.assigned_to,
      to.location_type + ':' + to.location_code + ':' + to.assigned_to,
      jobId || '',
      changedBy || 'SYSTEM'
    ]);
  } catch (e) {
    Logger.log('appendInventoryTransferLog_ error: ' + e);
  }
}

function ensureToolAuditSheet_(ss) {
  var sh = findSheetByName(ss, 'DB_TOOL_AUDITS');
  var headers = ['Timestamp', 'Week_Key', 'Tech_ID', 'Item_Code', 'Item_Name', 'Status', 'Checked_By', 'Note'];
  if (!sh) sh = ss.insertSheet('DB_TOOL_AUDITS');
  if (sh.getLastRow() === 0) sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  return sh;
}

function getWeekKey_(dateValue) {
  var date = parseFlexibleDate_(dateValue) || new Date();
  return Utilities.formatDate(date, 'Asia/Bangkok', 'YYYY-ww');
}

function extractPartsRequirementFromText_(text) {
  var raw = String(text || '');
  var lines = raw.split(/\n|,/);
  var out = [];
  for (var i = 0; i < lines.length; i++) {
    var line = String(lines[i] || '').trim();
    if (!line) continue;
    var match = line.match(/([A-Za-z0-9\-_]+)\s*[:xX]\s*(\d+)/);
    if (match) {
      out.push({ item_code: match[1], item_name: match[1], qty: parseInt(match[2], 10) || 1 });
    }
  }
  return out;
}

function buildPredictiveStockingAlert_(techPlan, days) {
  var msg = 'แจ้งเตือนเตรียมของล่วงหน้า ' + days + ' วัน\n';
  msg += 'ช่าง: ' + techPlan.tech_id + '\n';
  msg += 'งานในคิว: ' + techPlan.jobs.length + ' งาน\n\n';
  for (var i = 0; i < techPlan.shortages.length; i++) {
    var item = techPlan.shortages[i];
    msg += '• ' + item.item_name + ' (' + item.item_code + ') ต้องใช้ ' + item.required_qty + ' | บนรถ ' + item.van_qty + ' | ขาด ' + item.shortage_qty + '\n';
  }
  return msg;
}

// ============================================================
// V5.5+ INVENTORY CRUD — เพิ่ม / แก้ไข / ลบ สินค้า
// ============================================================

/**
 * addInventoryItem — เพิ่มสินค้าใหม่เข้าคลัง
 * payload: { item_code, item_name, qty, cost, price, location_type, location_code, assigned_to, notes, reorder_point }
 */
function addInventoryItem(data) {
  var lock = LockService.getScriptLock();
  try { lock.waitLock(10000); } catch(e) { return { success: false, error: 'Lock timeout' }; }
  try {
    data = data || {};
    var code = String(data.item_code || '').trim();
    var name = String(data.item_name || '').trim();
    if (!code || !name) return { success: false, error: 'กรุณาระบุรหัสสินค้าและชื่อสินค้า' };

    var ss = getComphoneSheet();
    var sh = findSheetByName(ss, 'DB_INVENTORY');
    if (!sh) {
      sh = ss.insertSheet('DB_INVENTORY');
      sh.getRange(1, 1, 1, 14).setValues([[
        'Item_Code','Item_Name','Category','Qty','Cost','Price',
        'Location_Type','Location_Code','Assigned_To','Reorder_Point',
        'Barcode','Updated_At','Last_Job_ID','Notes'
      ]]);
    }

    // ตรวจสอบรหัสซ้ำ
    var all = sh.getDataRange().getValues();
    var hdrs = all[0];
    var colMap = { code:0, name:1, category:2, qty:3, cost:4, price:5,
                   locType:6, locCode:7, assignedTo:8, reorderPoint:9,
                   barcode:10, updatedAt:11, lastJob:12, notes:13 };
    for (var hi = 0; hi < hdrs.length; hi++) {
      var hv = String(hdrs[hi]).toLowerCase().replace(/_/g,'');
      if (hv === 'itemcode' || hv === 'code') colMap.code = hi;
      else if (hv === 'itemname' || hv === 'name') colMap.name = hi;
      else if (hv === 'category') colMap.category = hi;
      else if (hv === 'qty' || hv === 'quantity') colMap.qty = hi;
      else if (hv === 'cost') colMap.cost = hi;
      else if (hv === 'price') colMap.price = hi;
      else if (hv === 'locationtype') colMap.locType = hi;
      else if (hv === 'locationcode') colMap.locCode = hi;
      else if (hv === 'assignedto') colMap.assignedTo = hi;
      else if (hv === 'reorderpoint') colMap.reorderPoint = hi;
      else if (hv === 'barcode') colMap.barcode = hi;
      else if (hv === 'updatedat') colMap.updatedAt = hi;
      else if (hv === 'lastjobid') colMap.lastJob = hi;
      else if (hv === 'notes') colMap.notes = hi;
    }
    for (var i = 1; i < all.length; i++) {
      if (String(all[i][colMap.code]).trim().toLowerCase() === code.toLowerCase()) {
        return { success: false, error: 'รหัสสินค้า "' + code + '" มีอยู่แล้วในระบบ' };
      }
    }

    var locType = String(data.location_type || 'MAIN').toUpperCase();
    var locCode = String(data.location_code || 'MAIN-01');
    var assignedTo = String(data.assigned_to || '');
    var qty = Math.max(0, parseFloat(data.qty) || 0);
    var cost = Math.max(0, parseFloat(data.cost) || 0);
    var price = Math.max(0, parseFloat(data.price) || 0);
    var notes = String(data.notes || '');
    var reorderPoint = Math.max(0, parseInt(data.reorder_point) || 5);
    var category = String(data.category || '');
    var barcode = String(data.barcode || '');

    // Build row array matching actual column positions
    var numCols = Math.max(hdrs.length, 14);
    var row = new Array(numCols);
    row[colMap.code] = code;
    row[colMap.name] = name;
    row[colMap.category] = category;
    row[colMap.qty] = qty;
    row[colMap.cost] = cost;
    row[colMap.price] = price;
    row[colMap.locType] = locType;
    row[colMap.locCode] = locCode;
    row[colMap.assignedTo] = assignedTo;
    row[colMap.reorderPoint] = reorderPoint;
    row[colMap.barcode] = barcode;
    row[colMap.updatedAt] = new Date();
    row[colMap.lastJob] = '';
    row[colMap.notes] = notes;
    sh.appendRow(row);

    try { logActivity('ADD_ITEM', data.added_by || 'ADMIN', code + ' | ' + name + ' | qty:' + qty); } catch(le) {}

    return {
      success: true,
      message: 'เพิ่มสินค้า "' + name + '" เรียบร้อยแล้ว',
      item: { item_code: code, item_name: name, qty: qty, cost: cost, price: price,
              location_type: locType, reorder_point: reorderPoint }
    };
  } catch(e) {
    return { success: false, error: e.toString() };
  } finally {
    try { lock.releaseLock(); } catch(ex) {}
  }
}

/**
 * updateInventoryItem — แก้ไขข้อมูลสินค้า
 * payload: { item_code, item_name, qty, cost, price, location_type, notes, reorder_point }
 */
function updateInventoryItem(data) {
  var lock = LockService.getScriptLock();
  try { lock.waitLock(10000); } catch(e) { return { success: false, error: 'Lock timeout' }; }
  try {
    data = data || {};
    var code = String(data.item_code || '').trim();
    if (!code) return { success: false, error: 'กรุณาระบุรหัสสินค้า' };

    var ss = getComphoneSheet();
    var sh = findSheetByName(ss, 'DB_INVENTORY');
    if (!sh) return { success: false, error: 'DB_INVENTORY not found' };

    var all = sh.getDataRange().getValues();
    var hdrs = all[0];

    // Map headers
    var idx = { code:0, name:1, qty:2, cost:3, price:4, locType:5, locCode:6, assignedTo:7, updatedAt:8, lastJob:9, notes:10, reorderPoint:11 };
    for (var hi = 0; hi < hdrs.length; hi++) {
      var hv = String(hdrs[hi]).toLowerCase().replace(/_/g,'');
      if (hv === 'itemcode' || hv === 'code') idx.code = hi;
      else if (hv === 'itemname' || hv === 'name') idx.name = hi;
      else if (hv === 'qty' || hv === 'quantity') idx.qty = hi;
      else if (hv === 'cost') idx.cost = hi;
      else if (hv === 'price') idx.price = hi;
      else if (hv === 'locationtype') idx.locType = hi;
      else if (hv === 'locationcode') idx.locCode = hi;
      else if (hv === 'assignedto') idx.assignedTo = hi;
      else if (hv === 'updatedat') idx.updatedAt = hi;
      else if (hv === 'notes') idx.notes = hi;
      else if (hv === 'reorderpoint') idx.reorderPoint = hi;
    }

    var found = false;
    for (var i = 1; i < all.length; i++) {
      if (String(all[i][idx.code]).trim().toLowerCase() === code.toLowerCase()) {
        found = true;
        if (data.item_name !== undefined) all[i][idx.name] = String(data.item_name);
        if (data.qty !== undefined) all[i][idx.qty] = Math.max(0, parseFloat(data.qty) || 0);
        if (data.cost !== undefined) all[i][idx.cost] = Math.max(0, parseFloat(data.cost) || 0);
        if (data.price !== undefined) all[i][idx.price] = Math.max(0, parseFloat(data.price) || 0);
        if (data.location_type !== undefined) all[i][idx.locType] = String(data.location_type).toUpperCase();
        if (data.location_code !== undefined) all[i][idx.locCode] = String(data.location_code);
        if (data.assigned_to !== undefined) all[i][idx.assignedTo] = String(data.assigned_to);
        if (data.notes !== undefined) all[i][idx.notes] = String(data.notes);
        if (data.reorder_point !== undefined) all[i][idx.reorderPoint] = Math.max(0, parseInt(data.reorder_point) || 5);
        all[i][idx.updatedAt] = new Date();
        break;
      }
    }

    if (!found) return { success: false, error: 'ไม่พบสินค้ารหัส: ' + code };

    sh.getDataRange().setValues(all);
    try { logActivity('UPDATE_ITEM', data.updated_by || 'ADMIN', 'แก้ไข: ' + code); } catch(le) {}

    return { success: true, message: 'อัปเดตสินค้า "' + code + '" เรียบร้อยแล้ว' };
  } catch(e) {
    return { success: false, error: e.toString() };
  } finally {
    try { lock.releaseLock(); } catch(ex) {}
  }
}

/**
 * deleteInventoryItem — ลบสินค้าออกจากคลัง
 * payload: { item_code }
 */
function deleteInventoryItem(data) {
  var lock = LockService.getScriptLock();
  try { lock.waitLock(10000); } catch(e) { return { success: false, error: 'Lock timeout' }; }
  try {
    data = data || {};
    var code = String(data.item_code || '').trim();
    if (!code) return { success: false, error: 'กรุณาระบุรหัสสินค้า' };

    var ss = getComphoneSheet();
    var sh = findSheetByName(ss, 'DB_INVENTORY');
    if (!sh) return { success: false, error: 'DB_INVENTORY not found' };

    var all = sh.getDataRange().getValues();
    var deleteRow = -1;
    var deletedName = '';
    for (var i = 1; i < all.length; i++) {
      if (String(all[i][0]).trim().toLowerCase() === code.toLowerCase()) {
        deleteRow = i + 1; // 1-indexed row number
        deletedName = String(all[i][1]);
        break;
      }
    }

    if (deleteRow < 0) return { success: false, error: 'ไม่พบสินค้ารหัส: ' + code };

    sh.deleteRow(deleteRow);
    try { logActivity('DELETE_ITEM', data.deleted_by || 'ADMIN', 'ลบ: ' + code + ' | ' + deletedName); } catch(le) {}

    return { success: true, message: 'ลบสินค้า "' + deletedName + '" เรียบร้อยแล้ว' };
  } catch(e) {
    return { success: false, error: e.toString() };
  } finally {
    try { lock.releaseLock(); } catch(ex) {}
  }
}

/**
 * getInventoryItemDetail — ดูรายละเอียดสินค้า 1 รายการ
 * payload: { item_code }
 */
function getInventoryItemDetail(data) {
  try {
    data = data || {};
    var code = String(data.item_code || '').trim();
    if (!code) return { success: false, error: 'กรุณาระบุรหัสสินค้า' };

    var ss = getComphoneSheet();
    var sh = findSheetByName(ss, 'DB_INVENTORY');
    if (!sh) return { success: false, error: 'DB_INVENTORY not found' };

    var all = sh.getDataRange().getValues();
    var hdrs = all[0];
    for (var i = 1; i < all.length; i++) {
      if (String(all[i][0]).trim().toLowerCase() === code.toLowerCase()) {
        var obj = {};
        for (var j = 0; j < hdrs.length; j++) {
          obj[String(hdrs[j]).toLowerCase().replace(/ /g,'_')] = all[i][j];
        }
        // คำนวณ reserved
        var reserved = 0;
        var resSheet = findSheetByName(ss, 'DB_RESERVATIONS');
        if (resSheet) {
          var resAll = resSheet.getDataRange().getValues();
          for (var r = 1; r < resAll.length; r++) {
            if (String(resAll[r][1]) === String(all[i][0]) && String(resAll[r][5]) === 'reserved') {
              reserved += Number(resAll[r][3] || 0);
            }
          }
        }
        obj.reserved = reserved;
        obj.available = (Number(all[i][2]) || 0) - reserved;
        return { success: true, item: obj };
      }
    }
    return { success: false, error: 'ไม่พบสินค้ารหัส: ' + code };
  } catch(e) {
    return { success: false, error: e.toString() };
  }
}

/**
 * getStockMovementHistory — ดูประวัติการเคลื่อนไหวสินค้า
 * payload: { item_code, limit }
 */
function getStockMovementHistory(data) {
  try {
    data = data || {};
    var code = String(data.item_code || '').trim();
    var limit = parseInt(data.limit) || 50;

    var ss = getComphoneSheet();
    var logSheet = findSheetByName(ss, 'DB_INVENTORY_LOG');
    if (!logSheet) return { success: true, items: [], message: 'ยังไม่มีประวัติการเคลื่อนไหว' };

    var all = logSheet.getDataRange().getValues();
    var results = [];
    for (var i = all.length - 1; i >= 1; i--) {
      if (!code || String(all[i][1]).trim().toLowerCase() === code.toLowerCase()) {
        results.push({
          timestamp: all[i][0],
          item_code: String(all[i][1]),
          item_name: String(all[i][2]),
          action: String(all[i][3]),
          qty_change: Number(all[i][4] || 0),
          qty_before: Number(all[i][5] || 0),
          qty_after: Number(all[i][6] || 0),
          job_id: String(all[i][7] || ''),
          changed_by: String(all[i][8] || ''),
          notes: String(all[i][9] || '')
        });
        if (results.length >= limit) break;
      }
    }
    return { success: true, total: results.length, items: results };
  } catch(e) {
    return { success: false, error: e.toString() };
  }
}

/**
 * createPurchaseOrder — สร้างใบสั่งซื้อ
 * payload: { items: [{item_code, item_name, qty, unit_cost}], supplier, notes }
 */
function createPurchaseOrder(data) {
  try {
    data = data || {};
    var items = data.items || [];
    if (!items.length) return { success: false, error: 'กรุณาระบุรายการสินค้า' };

    var ss = getComphoneSheet();
    var poSheet = findSheetByName(ss, 'DB_PURCHASE_ORDERS');
    if (!poSheet) {
      poSheet = ss.insertSheet('DB_PURCHASE_ORDERS');
      poSheet.getRange(1, 1, 1, 10).setValues([[
        'PO_ID','Created_At','Supplier','Status',
        'Item_Code','Item_Name','Qty','Unit_Cost','Total_Cost','Notes'
      ]]);
    }

    var poId = 'PO-' + Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyyMMdd') + '-' + Math.floor(Math.random() * 9000 + 1000);
    var totalCost = 0;
    var now = new Date();

    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var qty = Math.max(1, parseInt(item.qty) || 1);
      var unitCost = Math.max(0, parseFloat(item.unit_cost) || 0);
      var lineCost = qty * unitCost;
      totalCost += lineCost;
      poSheet.appendRow([
        poId, now,
        String(data.supplier || 'ไม่ระบุ'),
        'PENDING',
        String(item.item_code || ''),
        String(item.item_name || ''),
        qty, unitCost, lineCost,
        String(data.notes || '')
      ]);
    }

    // แจ้งเตือนกลุ่มจัดซื้อ
    try {
      var msg = '🛒 ใบสั่งซื้อใหม่: ' + poId + '\n';
      msg += '📦 ' + items.length + ' รายการ | รวม ' + totalCost.toLocaleString() + ' บาท\n';
      msg += '🏭 ผู้จำหน่าย: ' + (data.supplier || 'ไม่ระบุ') + '\n';
      msg += '📋 ' + (data.notes || '');
      sendLineNotify({ message: msg, room: 'PROCUREMENT' });
    } catch(ne) {}

    return {
      success: true,
      po_id: poId,
      total_items: items.length,
      total_cost: totalCost,
      message: 'สร้างใบสั่งซื้อ ' + poId + ' เรียบร้อยแล้ว'
    };
  } catch(e) {
    return { success: false, error: e.toString() };
  }
}

/**
 * listPurchaseOrders — ดูรายการใบสั่งซื้อ
 * payload: { status, limit }
 */
function listPurchaseOrders(data) {
  try {
    data = data || {};
    var statusFilter = String(data.status || '').toUpperCase();
    var limit = parseInt(data.limit) || 100;

    var ss = getComphoneSheet();
    var poSheet = findSheetByName(ss, 'DB_PURCHASE_ORDERS');
    if (!poSheet) return { success: true, items: [], total: 0 };

    var all = poSheet.getDataRange().getValues();
    var grouped = {};
    for (var i = 1; i < all.length; i++) {
      var poId = String(all[i][0]);
      var status = String(all[i][3]);
      if (statusFilter && status !== statusFilter) continue;
      if (!grouped[poId]) {
        grouped[poId] = {
          po_id: poId,
          created_at: all[i][1],
          supplier: String(all[i][2]),
          status: status,
          items: [],
          total_cost: 0
        };
      }
      grouped[poId].items.push({
        item_code: String(all[i][4]),
        item_name: String(all[i][5]),
        qty: Number(all[i][6] || 0),
        unit_cost: Number(all[i][7] || 0),
        total_cost: Number(all[i][8] || 0)
      });
      grouped[poId].total_cost += Number(all[i][8] || 0);
    }

    var result = [];
    for (var key in grouped) {
      if (grouped.hasOwnProperty(key)) result.push(grouped[key]);
    }
    result.sort(function(a, b) { return new Date(b.created_at) - new Date(a.created_at); });
    if (result.length > limit) result = result.slice(0, limit);

    return { success: true, total: result.length, items: result };
  } catch(e) {
    return { success: false, error: e.toString() };
  }
}

/**
 * receivePurchaseOrder — รับสินค้าตามใบสั่งซื้อ (เพิ่มสต็อก)
 * payload: { po_id, received_by }
 */
function receivePurchaseOrder(data) {
  var lock = LockService.getScriptLock();
  try { lock.waitLock(10000); } catch(e) { return { success: false, error: 'Lock timeout' }; }
  try {
    data = data || {};
    var poId = String(data.po_id || '').trim();
    if (!poId) return { success: false, error: 'กรุณาระบุ PO ID' };

    var ss = getComphoneSheet();
    var poSheet = findSheetByName(ss, 'DB_PURCHASE_ORDERS');
    if (!poSheet) return { success: false, error: 'ไม่พบ DB_PURCHASE_ORDERS' };

    var all = poSheet.getDataRange().getValues();
    var invSheet = findSheetByName(ss, 'DB_INVENTORY');
    if (!invSheet) return { success: false, error: 'DB_INVENTORY not found' };

    var invAll = invSheet.getDataRange().getValues();
    var received = [];

    for (var i = 1; i < all.length; i++) {
      if (String(all[i][0]) === poId && String(all[i][3]) === 'PENDING') {
        var itemCode = String(all[i][4]);
        var qty = Number(all[i][6] || 0);

        // เพิ่มสต็อก
        var found = false;
        for (var j = 1; j < invAll.length; j++) {
          if (String(invAll[j][0]) === itemCode) {
            invAll[j][2] = Number(invAll[j][2] || 0) + qty;
            invAll[j][8] = new Date();
            found = true;
            break;
          }
        }
        if (!found) {
          // เพิ่มสินค้าใหม่
          invAll.push([itemCode, String(all[i][5]), qty, Number(all[i][7] || 0), 0, 'MAIN', 'MAIN-01', '', new Date(), poId, 'รับจาก PO: ' + poId, 5]);
        }

        all[i][3] = 'RECEIVED';
        received.push({ item_code: itemCode, item_name: String(all[i][5]), qty: qty });
      }
    }

    if (!received.length) return { success: false, error: 'ไม่พบรายการ PENDING สำหรับ PO: ' + poId };

    poSheet.getDataRange().setValues(all);
    invSheet.getDataRange().setValues(invAll);

    try { logActivity('RECEIVE_PO', data.received_by || 'ADMIN', poId + ' | ' + received.length + ' รายการ'); } catch(le) {}

    return {
      success: true,
      po_id: poId,
      received_items: received.length,
      items: received,
      message: 'รับสินค้าตาม ' + poId + ' เรียบร้อย (' + received.length + ' รายการ)'
    };
  } catch(e) {
    return { success: false, error: e.toString() };
  } finally {
    try { lock.releaseLock(); } catch(ex) {}
  }
}

/**
 * cancelPurchaseOrder_ — ยกเลิก PO (เปลี่ยนสถานะเป็น CANCELLED)
 * @param {Object} data - { po_id }
 * @return {Object} { success, po_id }
 */
function cancelPurchaseOrder_(data) {
  var lock = LockService.getScriptLock();
  try { lock.waitLock(10000); } catch(e) { return { success: false, error: 'Lock timeout' }; }
  try {
    data = data || {};
    var poId = String(data.po_id || '').trim();
    if (!poId) return { success: false, error: 'กรุณาระบุ PO ID' };

    var ss      = getComphoneSheet();
    var poSheet = findSheetByName(ss, 'DB_PURCHASE_ORDERS');
    if (!poSheet) return { success: false, error: 'ไม่พบ DB_PURCHASE_ORDERS' };

    var all = poSheet.getDataRange().getValues();
    var updated = 0;

    for (var i = 1; i < all.length; i++) {
      if (String(all[i][0]) === poId) {
        if (String(all[i][3]) === 'RECEIVED') {
          return { success: false, error: 'ไม่สามารถยกเลิก PO ที่รับสินค้าแล้ว' };
        }
        poSheet.getRange(i + 1, 4).setValue('CANCELLED');
        updated++;
      }
    }

    if (updated === 0) return { success: false, error: 'ไม่พบ PO: ' + poId };

    writeAuditLog('cancelPurchaseOrder', 'PURCHASE_ORDER', poId, { po_id: poId, status: 'CANCELLED' });
    return { success: true, po_id: poId };

  } catch(e) {
    return { success: false, error: e.toString() };
  } finally {
    lock.releaseLock();
  }
}
