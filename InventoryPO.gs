// ============================================================
// COMPHONE SUPER APP v5.9.0-phase31a
// InventoryPO.gs — Purchase Order CRUD
// Extracted from Inventory.gs (Phase 31 Refactoring)
// ============================================================

function createPurchaseOrder(data) {
  data = data || {};
  if (typeof data.items === 'string') {
    try { data.items = JSON.parse(data.items); } catch (_itemsParseErr) {}
  }
  var items = Array.isArray(data.items) ? data.items : [];
  if (!items.length) return { success: false, error: '\u0e01\u0e23\u0e38\u0e13\u0e32\u0e23\u0e30\u0e1a\u0e38\u0e23\u0e32\u0e22\u0e01\u0e32\u0e23\u0e2a\u0e34\u0e19\u0e04\u0e49\u0e32' };

  var requestId = String(data.client_request_id || '').trim();
  var lock = LockService.getScriptLock();
  try { lock.waitLock(10000); } catch (_lockError) { return { success: false, error: 'Lock timeout' }; }

  var result;
  try {
    var replay = (typeof getIdempotentReplay_ === 'function') ? getIdempotentReplay_('createPurchaseOrder', requestId) : null;
    if (replay) return replay;

    var ss = getComphoneSheet();
    var poSheet = findSheetByName(ss, 'DB_PURCHASE_ORDERS');
    if (!poSheet) {
      poSheet = ss.insertSheet('DB_PURCHASE_ORDERS');
      poSheet.getRange(1, 1, 1, 11).setValues([[
        'PO_ID','Created_At','Supplier','Status',
        'Item_Code','Item_Name','Qty','Unit_Cost','Total_Cost','Notes','Client_Request_ID'
      ]]);
    }

    var requestColumn = ensurePurchaseOrderRequestColumn_(poSheet);
    var all = poSheet.getDataRange().getValues();
    var durableReplay = findPurchaseOrderReplay_(all, requestColumn, requestId);
    if (durableReplay) {
      if (typeof rememberIdempotentResult_ === 'function') rememberIdempotentResult_('createPurchaseOrder', requestId, durableReplay);
      return durableReplay;
    }

    var poId = generatePurchaseOrderId_(ss, all);
    var totalCost = 0;
    var now = new Date();
    var width = Math.max(poSheet.getLastColumn(), requestColumn + 1, 11);

    for (var i = 0; i < items.length; i++) {
      var item = items[i] || {};
      var qty = Math.max(1, parseInt(item.qty, 10) || 1);
      var unitCost = Math.max(0, parseFloat(item.unit_cost) || 0);
      var lineCost = qty * unitCost;
      totalCost += lineCost;
      var row = new Array(width).fill('');
      row[0] = poId;
      row[1] = now;
      row[2] = String(data.supplier || '\u0e44\u0e21\u0e48\u0e23\u0e30\u0e1a\u0e38');
      row[3] = 'PENDING';
      row[4] = String(item.item_code || '');
      row[5] = String(item.item_name || '');
      row[6] = qty;
      row[7] = unitCost;
      row[8] = lineCost;
      row[9] = String(data.notes || '');
      row[requestColumn] = requestId;
      poSheet.appendRow(row);
    }

    invalidatePurchaseOrderCache_();
    result = {
      success: true,
      po_id: poId,
      total_items: items.length,
      total_cost: totalCost,
      message: '\u0e2a\u0e23\u0e49\u0e32\u0e07\u0e43\u0e1a\u0e2a\u0e31\u0e48\u0e07\u0e0b\u0e37\u0e49\u0e2d ' + poId + ' \u0e40\u0e23\u0e35\u0e22\u0e1a\u0e23\u0e49\u0e2d\u0e22\u0e41\u0e25\u0e49\u0e27'
    };
    try { writeAuditLog('createPurchaseOrder', 'PURCHASE_ORDER', poId, { item_count: items.length, total_cost: totalCost }); } catch (_auditError) {}
    if (typeof rememberIdempotentResult_ === 'function') rememberIdempotentResult_('createPurchaseOrder', requestId, result);
  } catch(e) {
    result = { success: false, error: e.toString() };
  } finally {
    try { lock.releaseLock(); } catch (_releaseError) {}
  }

  if (result && result.success && !data.suppress_notifications) {
    try {
      var msg = '\ud83d\udecd\ufe0f \u0e43\u0e1a\u0e2a\u0e31\u0e48\u0e07\u0e0b\u0e37\u0e49\u0e2d\u0e43\u0e2b\u0e21\u0e48: ' + result.po_id + '\n';
      msg += '\ud83d\udce6 ' + result.total_items + ' \u0e23\u0e32\u0e22\u0e01\u0e32\u0e23 | \u0e23\u0e27\u0e21 ' + result.total_cost.toLocaleString() + ' \u0e1a\u0e32\u0e17\n';
      msg += '\ud83c\udf2d \u0e1c\u0e39\u0e49\u0e08\u0e33\u0e2b\u0e19\u0e48\u0e32\u0e22: ' + (data.supplier || '\u0e44\u0e21\u0e48\u0e23\u0e30\u0e1a\u0e38') + '\n';
      msg += '\ud83d\udccb ' + (data.notes || '');
      sendLineNotify({ message: msg, room: 'PROCUREMENT' });
    } catch (_notifyError) {}
  }
  return result;
}

function ensurePurchaseOrderRequestColumn_(sheet) {
  var lastColumn = Math.max(sheet.getLastColumn(), 10);
  var headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  for (var i = 0; i < headers.length; i++) {
    var normalized = String(headers[i] || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    if (normalized === 'clientrequestid' || normalized === 'requestid') return i;
  }
  sheet.getRange(1, lastColumn + 1).setValue('Client_Request_ID');
  return lastColumn;
}

function findPurchaseOrderReplay_(rows, requestColumn, requestId) {
  if (!requestId || !rows || rows.length < 2) return null;
  var poId = '';
  var totalItems = 0;
  var totalCost = 0;
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][requestColumn] || '').trim() !== requestId) continue;
    poId = poId || String(rows[i][0] || '');
    totalItems++;
    totalCost += Number(rows[i][8] || 0);
  }
  if (!poId) return null;
  return { success: true, po_id: poId, total_items: totalItems, total_cost: totalCost, idempotent_replay: true };
}

function generatePurchaseOrderId_(ss, liveRows) {
  var dateKey = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyyMMdd');
  var pattern = new RegExp('^PO-' + dateKey + '-(\\d+)$', 'i');
  var maxSequence = 0;
  function inspect(value) {
    var match = String(value || '').trim().match(pattern);
    if (match) maxSequence = Math.max(maxSequence, parseInt(match[1], 10) || 0);
  }
  for (var i = 1; liveRows && i < liveRows.length; i++) inspect(liveRows[i][0]);
  var archive = findSheetByName(ss, 'DB_SMOKE_CLEANUP_ARCHIVE');
  if (archive && archive.getLastRow() > 1) {
    var archivedIds = archive.getRange(2, 4, archive.getLastRow() - 1, 1).getValues();
    for (var j = 0; j < archivedIds.length; j++) inspect(archivedIds[j][0]);
  }
  try {
    var properties = PropertiesService.getScriptProperties();
    var key = 'COMPHONE_PO_HIGH_WATER_' + dateKey;
    maxSequence = Math.max(maxSequence, parseInt(properties.getProperty(key) || '0', 10) || 0);
    properties.setProperty(key, String(maxSequence + 1));
  } catch (_propertyError) {}
  return 'PO-' + dateKey + '-' + String(maxSequence + 1).padStart(4, '0');
}

function getPurchaseOrderCacheRevision_() {
  try { return PropertiesService.getScriptProperties().getProperty('COMPHONE_PO_CACHE_REV') || '0'; }
  catch (_propertyError) { return '0'; }
}

function invalidatePurchaseOrderCache_() {
  try {
    var properties = PropertiesService.getScriptProperties();
    var next = (parseInt(properties.getProperty('COMPHONE_PO_CACHE_REV') || '0', 10) || 0) + 1;
    properties.setProperty('COMPHONE_PO_CACHE_REV', String(next));
  } catch (_propertyError) {}
}

function listPurchaseOrders(data) {
  try {
    data = data || {};
    var statusFilter = String(data.status || '').toUpperCase();
    var limit = parseInt(data.limit) || 100;
    var cacheKey = 'po:list:' + getPurchaseOrderCacheRevision_() + ':' + statusFilter + ':' + limit;
    var cache = CacheService.getScriptCache();
    var cached = cache.get(cacheKey);
    if (cached) {
      var parsed = JSON.parse(cached);
      parsed.cached = true;
      return parsed;
    }

    var ss = getComphoneSheet();
    var poSheet = findSheetByName(ss, 'DB_PURCHASE_ORDERS');
    if (!poSheet) return { success: true, items: [], total: 0, cached: false };

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

    var response = { success: true, total: result.length, items: result, cached: false };
    try { cache.put(cacheKey, JSON.stringify(response), 60); } catch (_cacheErr) {}
    return response;
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
    invalidatePurchaseOrderCache_();

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

    invalidatePurchaseOrderCache_();
    writeAuditLog('cancelPurchaseOrder', 'PURCHASE_ORDER', poId, { po_id: poId, status: 'CANCELLED' });
    return { success: true, po_id: poId };

  } catch(e) {
    return { success: false, error: e.toString() };
  } finally {
    lock.releaseLock();
  }
}
