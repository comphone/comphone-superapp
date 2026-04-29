// ============================================================
// COMPHONE SUPER APP v5.9.0-phase31a
// InventoryPO.gs — Purchase Order CRUD
// Extracted from Inventory.gs (Phase 31 Refactoring)
// ============================================================

function createPurchaseOrder(data) {
  try {
    data = data || {};
    var items = data.items || [];
    if (!items.length) return { success: false, error: '\u0e01\u0e23\u0e38\u0e13\u0e32\u0e23\u0e30\u0e1a\u0e38\u0e23\u0e32\u0e22\u0e01\u0e32\u0e23\u0e2a\u0e34\u0e19\u0e04\u0e49\u0e32' };

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
        String(data.supplier || '\u0e44\u0e21\u0e48\u0e23\u0e30\u0e1a\u0e38'),
        'PENDING',
        String(item.item_code || ''),
        String(item.item_name || ''),
        qty, unitCost, lineCost,
        String(data.notes || '')
      ]);
    }

    try {
      var msg = '\ud83d\udecd\ufe0f \u0e43\u0e1a\u0e2a\u0e31\u0e48\u0e07\u0e0b\u0e37\u0e49\u0e2d\u0e43\u0e2b\u0e21\u0e48: ' + poId + '\n';
      msg += '\ud83d\udce6 ' + items.length + ' \u0e23\u0e32\u0e22\u0e01\u0e32\u0e23 | \u0e23\u0e27\u0e21 ' + totalCost.toLocaleString() + ' \u0e1a\u0e32\u0e17\n';
      msg += '\ud83c\udf2d \u0e1c\u0e39\u0e49\u0e08\u0e33\u0e2b\u0e19\u0e48\u0e32\u0e22: ' + (data.supplier || '\u0e44\u0e21\u0e48\u0e23\u0e30\u0e1a\u0e38') + '\n';
      msg += '\ud83d\udccb ' + (data.notes || '');
      sendLineNotify({ message: msg, room: 'PROCUREMENT' });
    } catch(ne) {}

    return {
      success: true,
      po_id: poId,
      total_items: items.length,
      total_cost: totalCost,
      message: '\u0e2a\u0e23\u0e49\u0e32\u0e07\u0e43\u0e1a\u0e2a\u0e31\u0e48\u0e07\u0e0b\u0e37\u0e49\u0e2d ' + poId + ' \u0e40\u0e23\u0e35\u0e22\u0e1a\u0e23\u0e49\u0e2d\u0e22\u0e41\u0e25\u0e49\u0e27'
    };
  } catch(e) {
    return { success: false, error: e.toString() };
  }
}

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

function receivePurchaseOrder(data) {
  var lock = LockService.getScriptLock();
  try { lock.waitLock(10000); } catch(e) { return { success: false, error: 'Lock timeout' }; }
  try {
    data = data || {};
    var poId = String(data.po_id || '').trim();
    if (!poId) return { success: false, error: '\u0e01\u0e23\u0e38\u0e13\u0e32\u0e23\u0e30\u0e1a\u0e38 PO ID' };

    var ss = getComphoneSheet();
    var poSheet = findSheetByName(ss, 'DB_PURCHASE_ORDERS');
    if (!poSheet) return { success: false, error: '\u0e44\u0e21\u0e48\u0e1e\u0e1a DB_PURCHASE_ORDERS' };

    var all = poSheet.getDataRange().getValues();
    var invSheet = findSheetByName(ss, 'DB_INVENTORY');
    if (!invSheet) return { success: false, error: 'DB_INVENTORY not found' };

    var invAll = invSheet.getDataRange().getValues();
    var invHdrs = invAll[0];
    var iCode = 0, iName = 1, iQty = 3, iCost = 4, iPrice = 5,
        iLocType = 6, iLocCode = 7, iUpdated = 11, iLastJob = 12, iNotes = 13;
    for (var hi = 0; hi < invHdrs.length; hi++) {
      var hv = String(invHdrs[hi]).toLowerCase().replace(/_/g,'');
      if (hv === 'itemcode' || hv === 'code') iCode = hi;
      else if (hv === 'itemname' || hv === 'name') iName = hi;
      else if (hv === 'qty' || hv === 'quantity') iQty = hi;
      else if (hv === 'cost' || hv === 'costprice') iCost = hi;
      else if (hv === 'price' || hv === 'sellprice') iPrice = hi;
      else if (hv === 'locationtype') iLocType = hi;
      else if (hv === 'locationcode') iLocCode = hi;
      else if (hv === 'updatedat') iUpdated = hi;
      else if (hv === 'lastjobid') iLastJob = hi;
      else if (hv === 'notes') iNotes = hi;
    }
    var received = [];

    for (var i = 1; i < all.length; i++) {
      if (String(all[i][0]) === poId && String(all[i][3]) === 'PENDING') {
        var itemCode = String(all[i][4]);
        var qty = Number(all[i][6] || 0);

        var found = false;
        for (var j = 1; j < invAll.length; j++) {
          if (String(invAll[j][iCode]) === itemCode) {
            invAll[j][iQty] = Number(invAll[j][iQty] || 0) + qty;
            invAll[j][iUpdated] = new Date();
            found = true;
            break;
          }
        }
        if (!found) {
          var numCols = Math.max(invHdrs.length, 14);
          var newRow = new Array(numCols);
          newRow[iCode] = itemCode;
          newRow[iName] = String(all[i][5]);
          newRow[iQty] = qty;
          newRow[iCost] = Number(all[i][7] || 0);
          newRow[iPrice] = 0;
          newRow[iLocType] = 'MAIN';
          newRow[iLocCode] = 'MAIN-01';
          newRow[iUpdated] = new Date();
          newRow[iLastJob] = poId;
          newRow[iNotes] = '\u0e23\u0e31\u0e1a\u0e08\u0e32\u0e01 PO: ' + poId;
          invAll.push(newRow);
        }

        all[i][3] = 'RECEIVED';
        received.push({ item_code: itemCode, item_name: String(all[i][5]), qty: qty });
      }
    }

    if (!received.length) return { success: false, error: '\u0e44\u0e21\u0e48\u0e1e\u0e1a\u0e23\u0e32\u0e22\u0e01\u0e32\u0e23 PENDING \u0e2a\u0e33\u0e2b\u0e23\u0e31\u0e1a PO: ' + poId };

    poSheet.getDataRange().setValues(all);
    invSheet.getDataRange().setValues(invAll);

    try { logActivity('RECEIVE_PO', data.received_by || 'ADMIN', poId + ' | ' + received.length + ' \u0e23\u0e32\u0e22\u0e01\u0e32\u0e23'); } catch(le) {}

    return {
      success: true,
      po_id: poId,
      received_items: received.length,
      items: received,
      message: '\u0e23\u0e31\u0e1a\u0e2a\u0e34\u0e19\u0e04\u0e49\u0e32\u0e15\u0e32\u0e21 ' + poId + ' \u0e40\u0e23\u0e35\u0e22\u0e1a\u0e23\u0e49\u0e2d\u0e22 (' + received.length + ' \u0e23\u0e32\u0e22\u0e01\u0e32\u0e23)'
    };
  } catch(e) {
    return { success: false, error: e.toString() };
  } finally {
    try { lock.releaseLock(); } catch(ex) {}
  }
}

function cancelPurchaseOrder_(data) {
  var lock = LockService.getScriptLock();
  try { lock.waitLock(10000); } catch(e) { return { success: false, error: 'Lock timeout' }; }
  try {
    data = data || {};
    var poId = String(data.po_id || '').trim();
    if (!poId) return { success: false, error: '\u0e01\u0e23\u0e38\u0e13\u0e32\u0e23\u0e30\u0e1a\u0e38 PO ID' };

    var ss      = getComphoneSheet();
    var poSheet = findSheetByName(ss, 'DB_PURCHASE_ORDERS');
    if (!poSheet) return { success: false, error: '\u0e44\u0e21\u0e48\u0e1e\u0e1a DB_PURCHASE_ORDERS' };

    var all = poSheet.getDataRange().getValues();
    var updated = 0;

    for (var i = 1; i < all.length; i++) {
      if (String(all[i][0]) === poId) {
        if (String(all[i][3]) === 'RECEIVED') {
          return { success: false, error: '\u0e44\u0e21\u0e48\u0e2a\u0e32\u0e21\u0e32\u0e23\u0e16\u0e22\u0e01\u0e40\u0e25\u0e34\u0e01 PO \u0e17\u0e35\u0e48\u0e23\u0e31\u0e1a\u0e2a\u0e34\u0e19\u0e04\u0e49\u0e32\u0e41\u0e25\u0e49\u0e27' };
        }
        poSheet.getRange(i + 1, 4).setValue('CANCELLED');
        updated++;
      }
    }

    if (updated === 0) return { success: false, error: '\u0e44\u0e21\u0e48\u0e1e\u0e1a PO: ' + poId };

    writeAuditLog('cancelPurchaseOrder', 'PURCHASE_ORDER', poId, { po_id: poId, status: 'CANCELLED' });
    return { success: true, po_id: poId };

  } catch(e) {
    return { success: false, error: e.toString() };
  } finally {
    lock.releaseLock();
  }
}
