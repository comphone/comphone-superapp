// ============================================================
// Inventory.gs - ระบบสต็อกสัมพันธ์ครบวงจร (V320 → V350 Hotfix)
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
    var ss = getComphoneSheet();
    var invSheet = findSheetByName(ss, 'DB_INVENTORY');
    var resSheet = findSheetByName(ss, 'DB_RESERVATIONS');
    if (!invSheet) return { error: 'DB_INVENTORY not found' };

    var invAll = invSheet.getDataRange().getValues();
    var lowItems = [];
    var reservedItems = [];

    for (var i = 1; i < invAll.length; i++) {
      var code = String(invAll[i][0]);
      var name = String(invAll[i][1]);
      var qty = Number(invAll[i][2] || 0);
      var cost = Number(invAll[i][3] || 0);
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
  } catch(e) { return { error: e.toString() }; }
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
    var results = [];
    for (var i = 1; i < all.length; i++) {
      var v = (String(all[i][0]) + ' ' + String(all[i][1])).toLowerCase();
      if (!search || v.indexOf(search) > -1) {
        var reserved = 0;
        if (resSheet) {
          var resAll = resSheet.getDataRange().getValues();
          for (var j = 1; j < resAll.length; j++) {
            if (String(resAll[j][1]) === String(all[i][0]) && String(resAll[j][5]) === 'reserved') {
              reserved += Number(resAll[j][3] || 0);
            }
          }
        }
        var qty = Number(all[i][2] || 0);
        results.push({
          code: String(all[i][0]), name: String(all[i][1]),
          qty: qty, reserved: reserved, available: qty - reserved,
          cost: Number(all[i][3] || 0), price: Number(all[i][4] || 0),
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
// V350: checkLowStockAlert — Fixed with reservation support & _notifyLowStock
// ============================================================
function checkLowStockAlert() {
  try {
    var ss = getComphoneSheet();
    var sh = findSheetByName(ss, 'DB_INVENTORY');
    if (!sh) return { error: 'DB_INVENTORY not found' };
    var all = sh.getDataRange().getValues();
    var resSheet = findSheetByName(ss, 'DB_RESERVATIONS');
    var lowItems = [];
    var ALERT_THRESHOLD = (typeof INVENTORY_ALERT_THRESHOLD !== 'undefined') ? INVENTORY_ALERT_THRESHOLD : 5;
    for (var i = 1; i < all.length; i++) {
      var code = String(all[i][0]);
      var name = String(all[i][1]);
      var qty = Number(all[i][2] || 0);
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
  } catch(e) { return { error: e.toString() }; }
}
