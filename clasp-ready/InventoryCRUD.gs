// ============================================================
// COMPHONE SUPER APP v5.9.0-phase31a
// InventoryCRUD.gs — Add / Update / Delete / Detail inventory items
// Extracted from Inventory.gs (Phase 31 Refactoring)
// ============================================================

function addInventoryItem(data) {
  var lock = LockService.getScriptLock();
  try { lock.waitLock(10000); } catch(e) { return { success: false, error: 'Lock timeout' }; }
  try {
    data = data || {};
    var code = String(data.item_code || '').trim();
    var name = String(data.item_name || '').trim();
    if (!code || !name) return { success: false, error: '\u0e01\u0e23\u0e38\u0e13\u0e32\u0e23\u0e30\u0e1a\u0e38\u0e23\u0e2b\u0e31\u0e2a\u0e2a\u0e34\u0e19\u0e04\u0e49\u0e32\u0e41\u0e25\u0e30\u0e0a\u0e37\u0e48\u0e2d\u0e2a\u0e34\u0e19\u0e04\u0e49\u0e32' };

    var ss = getComphoneSheet();
    var sh = findSheetByName(ss, 'DB_INVENTORY');
    if (!sh) {
      sh = ss.insertSheet('DB_INVENTORY');
      sh.getRange(1, 1, 1, 14).setValues([[
        'Item_Code','Item_Name','Category','Qty','Min_Qty','Unit','Cost_Price','Sell_Price',
        'Location_Type','Location_Code','Assigned_To','Barcode','Updated_At','Last_Job_ID','Notes'
      ]]);
    }

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
      else if (hv === 'cost' || hv === 'costprice') colMap.cost = hi;
      else if (hv === 'price' || hv === 'sellprice') colMap.price = hi;
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
        return { success: false, error: '\u0e23\u0e2b\u0e31\u0e2a\u0e2a\u0e34\u0e19\u0e04\u0e49\u0e32 "' + code + '" \u0e21\u0e35\u0e2d\u0e22\u0e39\u0e48\u0e41\u0e25\u0e49\u0e27\u0e43\u0e19\u0e23\u0e30\u0e1a\u0e1a' };
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
      message: '\u0e40\u0e1e\u0e34\u0e48\u0e21\u0e2a\u0e34\u0e19\u0e04\u0e49\u0e32 "' + name + '" \u0e40\u0e23\u0e35\u0e22\u0e1a\u0e23\u0e49\u0e2d\u0e22\u0e41\u0e25\u0e49\u0e27',
      item: { item_code: code, item_name: name, qty: qty, cost: cost, price: price,
              location_type: locType, reorder_point: reorderPoint }
    };
  } catch(e) {
    return { success: false, error: e.toString() };
  } finally {
    try { lock.releaseLock(); } catch(ex) {}
  }
}

function updateInventoryItem(data) {
  var lock = LockService.getScriptLock();
  try { lock.waitLock(10000); } catch(e) { return { success: false, error: 'Lock timeout' }; }
  try {
    data = data || {};
    var code = String(data.item_code || '').trim();
    if (!code) return { success: false, error: '\u0e01\u0e23\u0e38\u0e13\u0e32\u0e23\u0e30\u0e1a\u0e38\u0e23\u0e2b\u0e31\u0e2a\u0e2a\u0e34\u0e19\u0e04\u0e49\u0e32' };

    var ss = getComphoneSheet();
    var sh = findSheetByName(ss, 'DB_INVENTORY');
    if (!sh) return { success: false, error: 'DB_INVENTORY not found' };

    var all = sh.getDataRange().getValues();
    var hdrs = all[0];

    var idx = { code:0, name:1, qty:2, cost:3, price:4, locType:5, locCode:6, assignedTo:7, updatedAt:8, lastJob:9, notes:10, reorderPoint:11 };
    for (var hi = 0; hi < hdrs.length; hi++) {
      var hv = String(hdrs[hi]).toLowerCase().replace(/_/g,'');
      if (hv === 'itemcode' || hv === 'code') idx.code = hi;
      else if (hv === 'itemname' || hv === 'name') idx.name = hi;
      else if (hv === 'qty' || hv === 'quantity') idx.qty = hi;
      else if (hv === 'cost' || hv === 'costprice') idx.cost = hi;
      else if (hv === 'price' || hv === 'sellprice') idx.price = hi;
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

    if (!found) return { success: false, error: '\u0e44\u0e21\u0e48\u0e1e\u0e1a\u0e2a\u0e34\u0e19\u0e04\u0e49\u0e32\u0e23\u0e2b\u0e31\u0e2a: ' + code };

    sh.getDataRange().setValues(all);
    try { logActivity('UPDATE_ITEM', data.updated_by || 'ADMIN', '\u0e41\u0e01\u0e49\u0e44\u0e02: ' + code); } catch(le) {}

    return { success: true, message: '\u0e2d\u0e31\u0e1b\u0e40\u0e14\u0e15\u0e2a\u0e34\u0e19\u0e04\u0e49\u0e32 "' + code + '" \u0e40\u0e23\u0e35\u0e22\u0e1a\u0e23\u0e49\u0e2d\u0e22\u0e41\u0e25\u0e49\u0e27' };
  } catch(e) {
    return { success: false, error: e.toString() };
  } finally {
    try { lock.releaseLock(); } catch(ex) {}
  }
}

function deleteInventoryItem(data) {
  var lock = LockService.getScriptLock();
  try { lock.waitLock(10000); } catch(e) { return { success: false, error: 'Lock timeout' }; }
  try {
    data = data || {};
    var code = String(data.item_code || '').trim();
    if (!code) return { success: false, error: '\u0e01\u0e23\u0e38\u0e13\u0e32\u0e23\u0e30\u0e1a\u0e38\u0e23\u0e2b\u0e31\u0e2a\u0e2a\u0e34\u0e19\u0e04\u0e49\u0e32' };

    var ss = getComphoneSheet();
    var sh = findSheetByName(ss, 'DB_INVENTORY');
    if (!sh) return { success: false, error: 'DB_INVENTORY not found' };

    var all = sh.getDataRange().getValues();
    var hdrs = all[0];
    var cCode = 0, cName = 1;
    for (var hi = 0; hi < hdrs.length; hi++) {
      var hv = String(hdrs[hi]).toLowerCase().replace(/_/g,'');
      if (hv === 'itemcode' || hv === 'code') cCode = hi;
      else if (hv === 'itemname' || hv === 'name') cName = hi;
    }
    var deleteRow = -1;
    var deletedName = '';
    for (var i = 1; i < all.length; i++) {
      if (String(all[i][cCode]).trim().toLowerCase() === code.toLowerCase()) {
        deleteRow = i + 1;
        deletedName = String(all[i][cName]);
        break;
      }
    }

    if (deleteRow < 0) return { success: false, error: '\u0e44\u0e21\u0e48\u0e1e\u0e1a\u0e2a\u0e34\u0e19\u0e04\u0e49\u0e32\u0e23\u0e2b\u0e31\u0e2a: ' + code };

    sh.deleteRow(deleteRow);
    try { logActivity('DELETE_ITEM', data.deleted_by || 'ADMIN', '\u0e25\u0e1a: ' + code + ' | ' + deletedName); } catch(le) {}

    return { success: true, message: '\u0e25\u0e1a\u0e2a\u0e34\u0e19\u0e04\u0e49\u0e32 "' + deletedName + '" \u0e40\u0e23\u0e35\u0e22\u0e1a\u0e23\u0e49\u0e2d\u0e22\u0e41\u0e25\u0e49\u0e27' };
  } catch(e) {
    return { success: false, error: e.toString() };
  } finally {
    try { lock.releaseLock(); } catch(ex) {}
  }
}

function getInventoryItemDetail(data) {
  try {
    data = data || {};
    var code = String(data.item_code || '').trim();
    if (!code) return { success: false, error: '\u0e01\u0e23\u0e38\u0e13\u0e32\u0e23\u0e30\u0e1a\u0e38\u0e23\u0e2b\u0e31\u0e2a\u0e2a\u0e34\u0e19\u0e04\u0e49\u0e32' };

    var ss = getComphoneSheet();
    var sh = findSheetByName(ss, 'DB_INVENTORY');
    if (!sh) return { success: false, error: 'DB_INVENTORY not found' };

    var all = sh.getDataRange().getValues();
    var hdrs = all[0];
    var cCode = 0, cQty = 2;
    for (var hi = 0; hi < hdrs.length; hi++) {
      var hv = String(hdrs[hi]).toLowerCase().replace(/_/g,'');
      if (hv === 'itemcode' || hv === 'code') cCode = hi;
      else if (hv === 'qty' || hv === 'quantity') cQty = hi;
    }
    for (var i = 1; i < all.length; i++) {
      if (String(all[i][cCode]).trim().toLowerCase() === code.toLowerCase()) {
        var obj = {};
        for (var j = 0; j < hdrs.length; j++) {
          obj[String(hdrs[j]).toLowerCase().replace(/ /g,'_')] = all[i][j];
        }
        var reserved = 0;
        var resSheet = findSheetByName(ss, 'DB_RESERVATIONS');
        if (resSheet) {
          var resAll = resSheet.getDataRange().getValues();
          for (var r = 1; r < resAll.length; r++) {
            if (String(resAll[r][1]) === String(all[i][cCode]) && String(resAll[r][5]) === 'reserved') {
              reserved += Number(resAll[r][3] || 0);
            }
          }
        }
        obj.reserved = reserved;
        obj.available = (Number(all[i][cQty]) || 0) - reserved;
        return { success: true, item: obj };
      }
    }
    return { success: false, error: '\u0e44\u0e21\u0e48\u0e1e\u0e1a\u0e2a\u0e34\u0e19\u0e04\u0e49\u0e32\u0e23\u0e2b\u0e31\u0e2a: ' + code };
  } catch(e) {
    return { success: false, error: e.toString() };
  }
}

function getStockMovementHistory(data) {
  try {
    data = data || {};
    var code = String(data.item_code || '').trim();
    var limit = parseInt(data.limit) || 50;

    var ss = getComphoneSheet();
    var logSheet = findSheetByName(ss, 'DB_INVENTORY_LOG');
    if (!logSheet) return { success: true, items: [], message: '\u0e22\u0e31\u0e07\u0e44\u0e21\u0e48\u0e21\u0e35\u0e1b\u0e23\u0e30\u0e27\u0e31\u0e15\u0e34\u0e01\u0e32\u0e23\u0e40\u0e04\u0e25\u0e37\u0e48\u0e2d\u0e19\u0e44\u0e2b\u0e27' };

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
