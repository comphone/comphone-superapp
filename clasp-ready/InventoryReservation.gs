// ============================================================
// COMPHONE SUPER APP v5.9.0-phase31a
// InventoryReservation.gs — Job Reservation & Stock Cut System
// Extracted from Inventory.gs (Phase 31 Refactoring)
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
            resSheet.appendRow([jobId, code, String(invAll[j][1]), qty, new Date(), 'reserved']);
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

function _notifyLowStock(warnings) {
  if (warnings.length === 0) return;
  var msg = '\u26a0\ufe0f \u0e2a\u0e15\u0e47\u0e2d\u0e01\u0e15\u0e48\u0e33\u0e2b\u0e25\u0e31\u0e07\u0e1b\u0e34\u0e14\u0e07\u0e32\u0e19:\n';
  for (var i = 0; i < warnings.length; i++) {
    msg += '\u2022 ' + warnings[i].name + ' \u2014 \u0e40\u0e2b\u0e25\u0e37\u0e2d ' + warnings[i].qty + ' \u0e0a\u0e34\u0e49\u0e19\n';
  }
  sendLineNotify({ message: msg, room: 'PROCUREMENT' });
}
