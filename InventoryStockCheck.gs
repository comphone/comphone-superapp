// ============================================================
// COMPHONE SUPER APP v5.9.0-phase31a
// InventoryStockCheck.gs — Stock Check, Barcode, Scan & Overview
// Extracted from Inventory.gs (Phase 31 Refactoring)
// ============================================================

// ---------- BASIC STOCK CHECK ----------
function checkStock(data) {
  try {
    var ss = getComphoneSheet();
    var sh = findSheetByName(ss, 'DB_INVENTORY');
    if (!sh) return { error: 'DB_INVENTORY not found' };
    var all = sh.getDataRange().getValues();
    var resSheet = findSheetByName(ss, 'DB_RESERVATIONS');
    var search = (data.search || '').toLowerCase();

    var hdrs = all[0];
    var colMap = { code:0, name:1, qty:2, cost:3, price:4 };
    for (var hi = 0; hi < hdrs.length; hi++) {
      var hv = String(hdrs[hi]).toLowerCase().replace(/_/g,'');
      if (hv === 'itemcode' || hv === 'code') colMap.code = hi;
      else if (hv === 'itemname' || hv === 'name') colMap.name = hi;
      else if (hv === 'qty' || hv === 'quantity') colMap.qty = hi;
      else if (hv === 'cost' || hv === 'costprice') colMap.cost = hi;
      else if (hv === 'price' || hv === 'sellprice') colMap.price = hi;
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

// ---------- BARCODE LOOKUP ----------
function barcodeLookup(data) {
  try {
    var bc = (data.barcode || '').trim();
    if (!bc) return { found: false, message: '\u0e44\u0e21\u0e48\u0e21\u0e35\u0e23\u0e2b\u0e31\u0e2a barcode' };
    var ss = getComphoneSheet();
    var sh = findSheetByName(ss, 'DB_INVENTORY');
    if (!sh) return { error: 'DB_INVENTORY not found' };
    var all = sh.getDataRange().getValues();

    var hdrs = all[0];
    var cCode = 0, cName = 1, cQty = 2, cCost = 3, cPrice = 4;
    for (var hi = 0; hi < hdrs.length; hi++) {
      var hv = String(hdrs[hi]).toLowerCase();
      if (hv === 'code' || hv === 'item_code' || hv.indexOf('\u0e23\u0e2b\u0e31\u0e2a') > -1) cCode = hi;
      else if (hv === 'name' || hv === 'item_name' || hv.indexOf('\u0e0a\u0e37') > -1) cName = hi;
      else if (hv === 'qty' || hv === 'quantity' || hv.indexOf('\u0e08\u0e33\u0e19\u0e27\u0e19') > -1) cQty = hi;
      else if (hv === 'cost' || hv === 'costprice' || hv.indexOf('\u0e15\u0e49\u0e19\u0e17\u0e38\u0e19') > -1) cCost = hi;
      else if (hv === 'price' || hv === 'sellprice' || hv.indexOf('\u0e23\u0e32\u0e04\u0e32\u0e02\u0e32\u0e22') > -1) cPrice = hi;
    }

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
          statusText: alert ? '\ud83d\udd34 \u0e40\u0e2b\u0e25\u0e37\u0e2d\u0e19\u0e49\u0e2d\u0e22! (' + effective + ')' : '\u2705 \u0e21\u0e35\u0e2a\u0e15\u0e47\u0e2d\u0e01 (' + effective + ')'
        };
      }
    }
    return { found: false, message: '\u0e44\u0e21\u0e48\u0e1e\u0e1a\u0e2a\u0e34\u0e19\u0e04\u0e49\u0e32: ' + bc };
  } catch(e) { return { error: e.toString() }; }
}

// ---------- SCAN WITHDRAW ----------
function scanWithdrawStock(data) {
  var lock = LockService.getScriptLock();
  try { lock.waitLock(10000); } catch(e) { return { error: 'Lock timeout' }; }
  try {
    var bc = (data.barcode || '').trim();
    var qty = Math.max(1, parseInt(data.qty) || 1);
    var jobId = (data.job_id || '').trim();
    var tech = data.tech || 'Dashboard';

    if (!bc) return { error: '\u0e44\u0e21\u0e48\u0e21\u0e35\u0e23\u0e2b\u0e31\u0e2a barcode' };

    var ss = getComphoneSheet();
    var sh = findSheetByName(ss, 'DB_INVENTORY');
    if (!sh) return { error: 'DB_INVENTORY not found' };
    var all = sh.getDataRange().getValues();

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
          return { error: '\u0e2a\u0e15\u0e47\u0e2d\u0e01\u0e44\u0e21\u0e48\u0e1e\u0e2d! \u0e04\u0e07\u0e40\u0e2b\u0e25\u0e37\u0e2d: ' + current + ', \u0e40\u0e1a\u0e34\u0e01: ' + qty };
        }
        var newQty = current - qty;
        sh.getRange(i + 1, cQty + 1).setValue(newQty);

        try {
          logActivity('SCAN_WITHDRAW', tech,
            rowCode + ' \u00d7' + qty + (jobId ? ' [' + jobId + ']' : '') +
            ' | \u0e04\u0e07\u0e40\u0e2b\u0e25\u0e37\u0e2d: ' + current + ' \u2192 ' + newQty);
        } catch(le) {}

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
    return { error: '\u0e44\u0e21\u0e48\u0e1e\u0e1a\u0e2a\u0e34\u0e19\u0e04\u0e49\u0e32: ' + bc };
  } catch(e) {
    return { error: e.toString() };
  } finally {
    try { lock.releaseLock(); } catch(ex) {}
  }
}

// ---------- LOW STOCK ALERT ----------
function checkLowStockAlert() {
  try {
    _logInfo_('checkLowStockAlert', 'Starting low stock scan');
    var ss = getComphoneSheet();
    var sh = findSheetByName(ss, 'DB_INVENTORY');
    if (!sh) { _logError_('HIGH', 'checkLowStockAlert', 'DB_INVENTORY not found'); return { error: 'DB_INVENTORY not found' }; }
    var all = sh.getDataRange().getValues();
    var resSheet = findSheetByName(ss, 'DB_RESERVATIONS');

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

// ---------- INVENTORY OVERVIEW (3-layer: MAIN/VAN/SITE) ----------
var INVENTORY_V55_HEADERS = [
  'Item_Code', 'Item_Name', 'Qty', 'Cost', 'Price',
  'Location_Type', 'Location_Code', 'Assigned_To', 'Updated_At', 'Last_Job_ID', 'Notes'
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

// ---------- V5.5 LAYER HELPERS ----------
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

function getVanStock(techId) {
  try {
    techId = safeString_(techId);
    if (!techId) return { success: false, error: 'techId is required' };
    var rows = getInventoryRowsV55_({ location_type: 'VAN', assigned_to: techId });
    if (!rows.success) return rows;
    return { success: true, tech_id: techId, total_items: rows.items.length, items: rows.items };
  } catch (e) {
    try { if (typeof _logError_ === 'function') _logError_('MEDIUM', 'getVanStock', e, {source: 'INVENTORY'}); } catch(_le) {}
    return { success: false, error: e.toString() };
  }
}

// ---------- SHEET DATA HELPERS ----------
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
      itemCode: findHeaderIndex_(headers, ['Item_Code', 'item_code', 'Code', 'code', '\u0e23\u0e2b\u0e31\u0e2a']),
      itemName: findHeaderIndex_(headers, ['Item_Name', 'item_name', 'Name', 'name', '\u0e0a\u0e37\u0e48\u0e2d\u0e2a\u0e34\u0e19\u0e04\u0e49\u0e32']),
      qty: findHeaderIndex_(headers, ['Qty', 'qty', 'Quantity', '\u0e08\u0e33\u0e19\u0e27\u0e19']),
      cost: findHeaderIndex_(headers, ['Cost', 'cost', '\u0e15\u0e49\u0e19\u0e17\u0e38\u0e19']),
      price: findHeaderIndex_(headers, ['Price', 'price', '\u0e23\u0e32\u0e04\u0e32\u0e02\u0e32\u0e22']),
      locationType: findHeaderIndex_(headers, ['Location_Type', 'location_type']),
      locationCode: findHeaderIndex_(headers, ['Location_Code', 'location_code']),
      assignedTo: findHeaderIndex_(headers, ['Assigned_To', 'assigned_to']),
      updatedAt: findHeaderIndex_(headers, ['Updated_At', 'updated_at']),
      lastJobId: findHeaderIndex_(headers, ['Last_Job_ID', 'last_job_id']),
      notes: findHeaderIndex_(headers, ['Notes', 'notes', '\u0e2b\u0e21\u0e32\u0e22\u0e40\u0e2b\u0e15\u0e38'])
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
