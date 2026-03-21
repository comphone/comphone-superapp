// ==========================================
// Inventory.gs
// COMPHONE SUPER APP - INVENTORY (Movement-based)
// ==========================================

function getCustomersList() {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_CUSTOMERS);
    const data = sheet.getDataRange().getValues();
    const cName = data[0].indexOf('ชื่อลูกค้า/บริษัท');
    if (cName === -1) return [];
    let list = [];
    for (let i = 1; i < data.length; i++) {
      if (data[i][cName]) list.push({ name: String(data[i][cName]).trim() });
      if (list.length >= 100) break;
    }
    return list;
  } catch (e) { return []; }
}

function getInventoryList() {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_INVENTORY);
    const data = sheet.getDataRange().getValues();
    const cName = data[0].indexOf('ชื่อสินค้า');
    const cSN = data[0].indexOf('S/N สินค้า');
    if (cName === -1) return [];
    let list = [];
    for (let i = 1; i < data.length; i++) {
      if (data[i][cName]) list.push({ name: String(data[i][cName]).trim(), sn: String(cSN !== -1 ? data[i][cSN] : '') });
    }
    return list;
  } catch (e) { return []; }
}

function getInventoryItems(filters) {
  const sheet = getSheet(CONFIG.SHEET_INVENTORY);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return { items: [] };

  const headers = values[0];
  const rows = values.slice(1);
  const list = rows.map(function(row, i) {
    return mapRowByHeaders(headers, row, i + 2);
  }).filter(function(item) {
    if (!filters) return true;
    if (filters.activeOnly && String(item['สถานะ'] || '').trim() === 'Inactive') return false;
    if (filters.category && String(item['หมวดหมู่'] || '').trim() !== String(filters.category).trim()) return false;
    return true;
  });

  return { items: list };
}

function getInventorySummary() {
  const items = getInventoryItems({ activeOnly: true }).items || [];
  let totalItems = items.length;
  let lowStock = 0;
  let outOfStock = 0;

  items.forEach(function(item) {
    const qty = toNumber(item['จำนวนคงเหลือ']);
    const min = toNumber(item['MinStock']);
    if (qty <= 0) outOfStock++;
    else if (min > 0 && qty <= min) lowStock++;
  });

  return {
    totalItems: totalItems,
    lowStock: lowStock,
    outOfStock: outOfStock
  };
}

function processInventoryTransaction(payload) {
  const data = payload || {};
  const mode = String(data.mode || 'OUT').trim().toUpperCase();

  if (mode === 'RETURN') {
    return returnInventoryFromJob(data);
  }

  return commitStockOutForJob(data);
}

function validateStockRequest(lines) {
  const stockMap = _buildStockMap();
  return _validateInventoryLines(lines, stockMap, 'OUT');
}

function commitStockOutForJob(data) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);

    ensureInventorySheetsReady();

    const jobId = safeTrim(data.jobId);
    const tech = safeTrim(data.tech);
    const lines = normalizeInventoryLines(data.items);

    if (!jobId) {
      return apiError('commitStockOutForJob', 'INVALID_JOB_ID', 'ไม่พบ jobId', {});
    }

    if (!lines.length) {
      return apiError('commitStockOutForJob', 'EMPTY_ITEMS', 'ไม่มีรายการสต๊อกให้ตัด', {});
    }

    const stockMap = _buildStockMap();
    const validation = _validateInventoryLines(lines, stockMap, 'OUT');
    if (!validation.success) return validation;

    const jobItemsSheet = ensureSheetWithHeaders(CONFIG.SHEET_JOB_ITEMS, INVENTORY_SCHEMA.DB_JOB_ITEMS);
    const movementSheet = ensureSheetWithHeaders(CONFIG.SHEET_STOCK_MOVEMENTS, INVENTORY_SCHEMA.DB_STOCK_MOVEMENTS);
    const inventorySheet = getSheet(CONFIG.SHEET_INVENTORY);
    const invData = inventorySheet.getDataRange().getValues();
    const invHeaders = invData[0];

    const processed = [];

    lines.forEach(function(line) {
      const item = stockMap[line.itemId];
      const moveId = _generateMoveId();
      const jobItemId = _generateJobItemId();
      const now = formatDateBkk(new Date(), 'yyyy-MM-dd HH:mm:ss');
      const qty = toNumber(line.qty);

      _appendRowByHeaders(jobItemsSheet, INVENTORY_SCHEMA.DB_JOB_ITEMS, {
        'JobItemID': jobItemId,
        'JobID': jobId,
        'ItemID': item.itemId,
        'SKU': item.sku,
        'ชื่อสินค้า': item.name,
        'จำนวน': qty,
        'หน่วย': line.unit,
        'SerialNumber': line.serialNumber,
        'ประเภท': 'OUT',
        'หมายเหตุ': line.remark,
        'ผู้ทำรายการ': tech,
        'วันที่เวลา': now,
        'สถานะรายการ': 'Active'
      });

      _appendRowByHeaders(movementSheet, INVENTORY_SCHEMA.DB_STOCK_MOVEMENTS, {
        'MoveID': moveId,
        'วันที่เวลา': now,
        'JobID': jobId,
        'ItemID': item.itemId,
        'SKU': item.sku,
        'ชื่อสินค้า': item.name,
        'ประเภท': 'OUT',
        'จำนวน': qty,
        'หน่วย': line.unit,
        'SerialNumber': line.serialNumber,
        'หมายเหตุ': line.remark,
        'ผู้ทำรายการ': tech,
        'อ้างอิงเอกสาร': data.reference || ''
      });

      _updateInventoryBalance(inventorySheet, invHeaders, item.itemId, -qty);

      processed.push({
        itemId: item.itemId,
        name: item.name,
        qty: qty,
        unit: line.unit,
        serialNumber: line.serialNumber || ''
      });
    });

    return apiSuccess('commitStockOutForJob', {
      jobId: jobId,
      processedCount: processed.length,
      items: processed,
      message: 'ตัดสต๊อกสำเร็จ'
    });

  } catch (err) {
    return apiError('commitStockOutForJob', 'STOCK_OUT_FAILED', err.message, { stack: err.stack || '' });
  } finally {
    lock.releaseLock();
  }
}

function returnInventoryFromJob(data) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);

    ensureInventorySheetsReady();

    const jobId = safeTrim(data.jobId);
    const tech = safeTrim(data.tech);
    const lines = normalizeInventoryLines(data.items);

    if (!jobId) {
      return apiError('returnInventoryFromJob', 'INVALID_JOB_ID', 'ไม่พบ jobId', {});
    }

    if (!lines.length) {
      return apiError('returnInventoryFromJob', 'EMPTY_ITEMS', 'ไม่มีรายการคืนสต๊อก', {});
    }

    const stockMap = _buildStockMap();
    const validation = _validateInventoryLines(lines, stockMap, 'RETURN');
    if (!validation.success) return validation;

    const movementSheet = ensureSheetWithHeaders(CONFIG.SHEET_STOCK_MOVEMENTS, INVENTORY_SCHEMA.DB_STOCK_MOVEMENTS);
    const inventorySheet = getSheet(CONFIG.SHEET_INVENTORY);
    const invData = inventorySheet.getDataRange().getValues();
    const invHeaders = invData[0];
    const processed = [];

    lines.forEach(function(line) {
      const item = stockMap[line.itemId];
      const moveId = _generateMoveId();
      const now = formatDateBkk(new Date(), 'yyyy-MM-dd HH:mm:ss');
      const qty = toNumber(line.qty);

      _appendRowByHeaders(movementSheet, INVENTORY_SCHEMA.DB_STOCK_MOVEMENTS, {
        'MoveID': moveId,
        'วันที่เวลา': now,
        'JobID': jobId,
        'ItemID': item.itemId,
        'SKU': item.sku,
        'ชื่อสินค้า': item.name,
        'ประเภท': 'RETURN',
        'จำนวน': qty,
        'หน่วย': line.unit,
        'SerialNumber': line.serialNumber,
        'หมายเหตุ': line.remark,
        'ผู้ทำรายการ': tech,
        'อ้างอิงเอกสาร': data.reference || ''
      });

      _updateInventoryBalance(inventorySheet, invHeaders, item.itemId, qty);

      processed.push({
        itemId: item.itemId,
        name: item.name,
        qty: qty,
        unit: line.unit,
        serialNumber: line.serialNumber || ''
      });
    });

    return apiSuccess('returnInventoryFromJob', {
      jobId: jobId,
      processedCount: processed.length,
      items: processed,
      message: 'คืนสต๊อกสำเร็จ'
    });

  } catch (err) {
    return apiError('returnInventoryFromJob', 'RETURN_STOCK_FAILED', err.message, { stack: err.stack || '' });
  } finally {
    lock.releaseLock();
  }
}

function processJobClosingAndInventory(data) {
  const payload = data || {};
  const lines = normalizeInventoryLines(payload.items);

  if (!payload.jobId) {
    return apiError('processJobClosingAndInventory', 'INVALID_JOB_ID', 'ไม่พบ jobId', {});
  }

  if (!lines.length && payload.snText) {
    const fallbackLines = buildInventoryLinesFromSnText(payload.snText);
    payload.items = fallbackLines;
  }

  if ((payload.items || []).length) {
    const result = commitStockOutForJob(payload);
    if (!result.success) return result;
  }

  try {
    updateJobFields(payload.jobId, { 'สถานะ': payload.closeStatus || 'Completed' });
  } catch (err) {
    return apiError('processJobClosingAndInventory', 'JOB_CLOSE_FAILED', err.message, {});
  }

  return apiSuccess('processJobClosingAndInventory', {
    jobId: payload.jobId,
    message: 'ปิดงานและตัดสต๊อกสำเร็จ',
    closeStatus: payload.closeStatus || 'Completed'
  });
}

function buildInventoryLinesFromSnText(snText) {
  const text = safeTrim(snText);
  if (!text) return [];

  const inventory = getInventoryList();
  const used = {};
  const lines = [];

  inventory.forEach(function(item) {
    const name = safeTrim(item.name);
    const sn = safeTrim(item.sn);
    let matched = false;
    if (name && text.indexOf(name) !== -1) matched = true;
    if (!matched && sn && text.indexOf(sn) !== -1) matched = true;
    if (!matched) return;

    const key = name || sn;
    if (used[key]) return;
    used[key] = true;

    const itemId = findInventoryItemIdByNameOrSn(name, sn);
    if (!itemId) return;

    lines.push({
      itemId: itemId,
      qty: 1,
      unit: '',
      serialNumber: sn,
      remark: 'Auto parsed from snText'
    });
  });

  return lines;
}

function findInventoryItemIdByNameOrSn(name, sn) {
  const sheet = getSheet(CONFIG.SHEET_INVENTORY);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return '';
  const headers = values[0];
  const idxItemId = headers.indexOf('ItemID');
  const idxName = headers.indexOf('ชื่อสินค้า');
  const idxSn = headers.indexOf('S/N สินค้า');

  for (let i = 1; i < values.length; i++) {
    const rowName = safeTrim(idxName !== -1 ? values[i][idxName] : '');
    const rowSn = safeTrim(idxSn !== -1 ? values[i][idxSn] : '');
    if ((name && rowName === name) || (sn && rowSn === sn)) {
      return safeTrim(values[i][idxItemId]);
    }
  }
  return '';
}

function normalizeInventoryLines(items) {
  return (items || []).map(function(item) {
    return {
      itemId: safeTrim(item.itemId || item.ItemID),
      qty: toNumber(item.qty || item.quantity || item['จำนวน']),
      unit: safeTrim(item.unit || item['หน่วย']),
      serialNumber: safeTrim(item.serialNumber || item.serial || item['SerialNumber']),
      remark: safeTrim(item.remark || item.note || item['หมายเหตุ'])
    };
  }).filter(function(item) {
    return item.itemId && item.qty > 0;
  });
}

function ensureInventorySheetsReady() {
  ensureSheetWithHeaders(CONFIG.SHEET_STOCK_MOVEMENTS, INVENTORY_SCHEMA.DB_STOCK_MOVEMENTS);
  ensureSheetWithHeaders(CONFIG.SHEET_JOB_ITEMS, INVENTORY_SCHEMA.DB_JOB_ITEMS);
}

function _buildStockMap() {
  const sheet = getSheet(CONFIG.SHEET_INVENTORY);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return {};

  const headers = values[0];
  const rows = values.slice(1);
  const map = {};

  rows.forEach(function(row, index) {
    const obj = mapRowByHeaders(headers, row, index + 2);
    const itemId = safeTrim(obj['ItemID']);
    if (!itemId) return;

    map[itemId] = {
      rowNumber: index + 2,
      itemId: itemId,
      sku: safeTrim(obj['SKU']),
      name: safeTrim(obj['ชื่อสินค้า']),
      category: safeTrim(obj['หมวดหมู่']),
      unit: safeTrim(obj['หน่วย']),
      qty: toNumber(obj['จำนวนคงเหลือ']),
      minStock: toNumber(obj['MinStock']),
      serialRequired: toBoolean(obj['SerialRequired']),
      status: safeTrim(obj['สถานะ']) || 'Active'
    };
  });

  return map;
}

function _validateInventoryLines(lines, stockMap, mode) {
  const errors = [];
  const movementSheet = tryGetSheet(CONFIG.SHEET_STOCK_MOVEMENTS);
  const usedSerials = movementSheet ? _getUsedSerialMap(movementSheet) : {};

  (lines || []).forEach(function(line, idx) {
    const label = 'รายการที่ ' + (idx + 1);
    const item = stockMap[line.itemId];
    if (!item) {
      errors.push(label + ': ไม่พบ ItemID ' + line.itemId);
      return;
    }

    if (item.status === 'Inactive') {
      errors.push(label + ': สินค้านี้ถูกปิดใช้งาน');
    }

    if (line.qty <= 0) {
      errors.push(label + ': จำนวนต้องมากกว่า 0');
    }

    if (line.unit && item.unit && line.unit !== item.unit) {
      errors.push(label + ': หน่วยไม่ตรงกับ master (' + item.unit + ')');
    }

    if (mode === 'OUT' && item.qty < line.qty) {
      errors.push(label + ': จำนวนคงเหลือไม่พอ (' + item.qty + ' ' + item.unit + ')');
    }

    const serials = splitSerials(line.serialNumber);
    if (item.serialRequired) {
      if (!serials.length) {
        errors.push(label + ': สินค้านี้ต้องระบุ Serial Number');
      }
      if (serials.length !== line.qty) {
        errors.push(label + ': จำนวน Serial Number ต้องเท่ากับ qty');
      }
      if (mode === 'OUT') {
        serials.forEach(function(sn) {
          if (usedSerials[sn]) {
            errors.push(label + ': Serial ถูกใช้ออกไปแล้ว -> ' + sn);
          }
        });
      }
    }
  });

  if (errors.length) {
    return apiError('validateStockRequest', 'INVALID_STOCK_REQUEST', 'ข้อมูลสต๊อกไม่ผ่าน validation', {
      errors: errors
    });
  }

  return apiSuccess('validateStockRequest', {
    valid: true,
    lineCount: (lines || []).length
  });
}

function _getUsedSerialMap(sheet) {
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return {};
  const headers = values[0];
  const idxType = headers.indexOf('ประเภท');
  const idxSerial = headers.indexOf('SerialNumber');
  const used = {};

  values.slice(1).forEach(function(row) {
    const type = safeTrim(row[idxType]);
    const serialText = safeTrim(row[idxSerial]);
    const serials = splitSerials(serialText);
    if (type === 'OUT') {
      serials.forEach(function(sn) { used[sn] = true; });
    }
    if (type === 'RETURN') {
      serials.forEach(function(sn) { delete used[sn]; });
    }
  });

  return used;
}

function _updateInventoryBalance(sheet, headers, itemId, deltaQty) {
  const idxItemId = headers.indexOf('ItemID');
  const idxQty = headers.indexOf('จำนวนคงเหลือ');
  if (idxItemId === -1 || idxQty === -1) {
    throw new Error('schema DB_INVENTORY ไม่ครบ: ต้องมี ItemID และ จำนวนคงเหลือ');
  }

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) throw new Error('DB_INVENTORY ไม่มีข้อมูล');

  const idValues = sheet.getRange(2, idxItemId + 1, lastRow - 1, 1).getValues();
  for (let i = 0; i < idValues.length; i++) {
    if (safeTrim(idValues[i][0]) === itemId) {
      const rowNumber = i + 2;
      const currentQty = toNumber(sheet.getRange(rowNumber, idxQty + 1).getValue());
      const newQty = currentQty + deltaQty;
      if (newQty < 0) throw new Error('สต๊อกติดลบไม่ได้ สำหรับ ItemID: ' + itemId);
      sheet.getRange(rowNumber, idxQty + 1).setValue(newQty);
      return newQty;
    }
  }

  throw new Error('ไม่พบ ItemID ใน DB_INVENTORY: ' + itemId);
}

function _generateMoveId() {
  return 'MOVE-' + formatDateBkk(new Date(), 'yyyyMMdd-HHmmss') + '-' + Math.floor(Math.random() * 9000 + 1000);
}

function _generateJobItemId() {
  return 'JIT-' + formatDateBkk(new Date(), 'yyyyMMdd-HHmmss') + '-' + Math.floor(Math.random() * 9000 + 1000);
}
