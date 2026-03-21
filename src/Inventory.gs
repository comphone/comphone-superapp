// ==========================================
// Inventory.gs
// COMPHONE SUPER APP - INVENTORY (Movement-based)
// ==========================================

/**
 * ดึงรายชื่อลูกค้าสำหรับ autocomplete ฝั่งหน้าเว็บ
 * @returns {Array<{name:string}>}
 */
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
  } catch (e) {
    logSystemError('getCustomersList', e, {});
    return [];
  }
}

/**
 * ดึงรายการ inventory แบบย่อ สำหรับ autocomplete หรือ parse ชื่อสินค้า/SN
 * @returns {Array<{name:string,sn:string}>}
 */
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
  } catch (e) {
    logSystemError('getInventoryList', e, {});
    return [];
  }
}

/**
 * ดึงข้อมูล inventory ทั้งหมด โดยสามารถกรอง active/category ได้
 * @param {{activeOnly?:boolean, category?:string}=} filters
 * @returns {{items:Array<Object>}|Object}
 */
function getInventoryItems(filters) {
  try {
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
  } catch (err) {
    logSystemError('getInventoryItems', err, { filters: filters || {} });
    return apiError('getInventoryItems', 'GET_INVENTORY_FAILED', err.message, {});
  }
}

/**
 * สรุปภาพรวม inventory เพื่อใช้แดชบอร์ด/แจ้งเตือน low stock
 * @returns {{totalItems:number,lowStock:number,outOfStock:number}|Object}
 */
function getInventorySummary() {
  try {
    const itemResult = getInventoryItems({ activeOnly: true });
    if (itemResult.success === false) return itemResult;

    const items = itemResult.items || [];
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
  } catch (err) {
    logSystemError('getInventorySummary', err, {});
    return apiError('getInventorySummary', 'GET_INVENTORY_SUMMARY_FAILED', err.message, {});
  }
}

/**
 * สร้างข้อมูล low stock dashboard พร้อมรายการสินค้าที่ควรเฝ้าระวัง
 * @returns {Object}
 */
function getLowStockDashboardData() {
  try {
    const itemsResult = getInventoryItems({ activeOnly: true });
    if (itemsResult.success === false) return itemsResult;

    const allItems = itemsResult.items || [];
    const lowStockItems = allItems.filter(function(item) {
      const qty = toNumber(item['จำนวนคงเหลือ']);
      const min = toNumber(item['MinStock']);
      return min > 0 && qty <= min;
    }).map(function(item) {
      const qty = toNumber(item['จำนวนคงเหลือ']);
      const min = toNumber(item['MinStock']);
      return {
        itemId: safeTrim(item['ItemID']),
        sku: safeTrim(item['SKU']),
        name: safeTrim(item['ชื่อสินค้า']),
        category: safeTrim(item['หมวดหมู่']),
        unit: safeTrim(item['หน่วย']),
        qty: qty,
        minStock: min,
        shortage: Math.max(0, min - qty),
        status: qty <= 0 ? 'OUT' : 'LOW'
      };
    }).sort(function(a, b) {
      return b.shortage - a.shortage;
    });

    return apiSuccess('getLowStockDashboardData', {
      generatedAt: formatDateBkk(new Date(), 'yyyy-MM-dd HH:mm:ss'),
      totalLowStock: lowStockItems.length,
      items: lowStockItems
    });
  } catch (err) {
    logSystemError('getLowStockDashboardData', err, {});
    return apiError('getLowStockDashboardData', 'LOW_STOCK_DASHBOARD_FAILED', err.message, {});
  }
}

/**
 * แนะนำการสั่งซื้อเมื่อสต๊อกต่ำ โดยใช้ min stock เป็น baseline
 * @param {{multiplier?:number}=} options
 * @returns {Object}
 */
function getReorderRecommendations(options) {
  try {
    const config = options || {};
    const multiplier = Math.max(1, toNumber(config.multiplier) || 1.5);
    const dashboard = getLowStockDashboardData();
    if (dashboard.success === false) return dashboard;

    const recommendations = (dashboard.items || []).map(function(item) {
      const suggestedQty = Math.max(item.shortage, Math.ceil(item.minStock * multiplier) - item.qty);
      return {
        itemId: item.itemId,
        sku: item.sku,
        name: item.name,
        category: item.category,
        currentQty: item.qty,
        minStock: item.minStock,
        reorderQty: suggestedQty,
        reorderPoint: item.minStock,
        priority: item.qty <= 0 ? 'CRITICAL' : 'NORMAL',
        unit: item.unit
      };
    });

    return apiSuccess('getReorderRecommendations', {
      generatedAt: formatDateBkk(new Date(), 'yyyy-MM-dd HH:mm:ss'),
      count: recommendations.length,
      items: recommendations
    });
  } catch (err) {
    logSystemError('getReorderRecommendations', err, { options: options || {} });
    return apiError('getReorderRecommendations', 'REORDER_RECOMMENDATION_FAILED', err.message, {});
  }
}

/**
 * ตัวกลางสำหรับทำ transaction inventory ทั้ง OUT และ RETURN
 * @param {Object} payload
 * @returns {Object}
 */
function processInventoryTransaction(payload) {
  try {
    const data = payload || {};
    const mode = String(data.mode || 'OUT').trim().toUpperCase();
    if (mode === 'RETURN' || mode === 'PARTIAL_RETURN') return returnInventoryFromJob(data);
    return commitStockOutForJob(data);
  } catch (err) {
    logSystemError('processInventoryTransaction', err, { payload: payload || {} });
    return apiError('processInventoryTransaction', 'PROCESS_INVENTORY_FAILED', err.message, {});
  }
}

/**
 * ตรวจ validation ของรายการสต๊อกก่อนตัดจริง
 * @param {Array<Object>} lines
 * @returns {Object}
 */
function validateStockRequest(lines) {
  try {
    const stockMap = _buildStockMap();
    return _validateInventoryLines(lines, stockMap, 'OUT');
  } catch (err) {
    logSystemError('validateStockRequest', err, { lines: lines || [] });
    return apiError('validateStockRequest', 'VALIDATE_STOCK_FAILED', err.message, {});
  }
}

/**
 * ตัดสต๊อกออกจาก inventory ตามรายการของงาน
 * - สร้าง DB_STOCK_MOVEMENTS ถ้ายังไม่มี
 * - สร้าง DB_JOB_ITEMS ถ้ายังไม่มี
 * - lock transaction เพื่อกันข้อมูลชนกัน
 * @param {{jobId:string,tech?:string,items:Array<Object>,reference?:string}} data
 * @returns {Object}
 */
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
        'หน่วย': line.unit || item.unit,
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
        'หน่วย': line.unit || item.unit,
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
        unit: line.unit || item.unit,
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
    logSystemError('commitStockOutForJob', err, { data: data || {} });
    return apiError('commitStockOutForJob', 'STOCK_OUT_FAILED', err.message, { stack: err.stack || '' });
  } finally {
    lock.releaseLock();
  }
}

/**
 * คืนสต๊อกจากงานกลับเข้า inventory และบันทึก movement = RETURN
 * รองรับ partial return และอัปเดตสถานะใน DB_JOB_ITEMS
 * @param {{jobId:string,tech?:string,items:Array<Object>,reference?:string,mode?:string}} data
 * @returns {Object}
 */
function returnInventoryFromJob(data) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);

    ensureInventorySheetsReady();

    const jobId = safeTrim(data.jobId);
    const tech = safeTrim(data.tech);
    const lines = normalizeInventoryLines(data.items);
    const mode = safeTrim(data.mode || 'RETURN').toUpperCase();

    if (!jobId) {
      return apiError('returnInventoryFromJob', 'INVALID_JOB_ID', 'ไม่พบ jobId', {});
    }

    if (!lines.length) {
      return apiError('returnInventoryFromJob', 'EMPTY_ITEMS', 'ไม่มีรายการคืนสต๊อก', {});
    }

    const stockMap = _buildStockMap();
    const validation = _validateInventoryLines(lines, stockMap, 'RETURN');
    if (!validation.success) return validation;

    const jobItemsSheet = ensureSheetWithHeaders(CONFIG.SHEET_JOB_ITEMS, INVENTORY_SCHEMA.DB_JOB_ITEMS);
    const movementSheet = ensureSheetWithHeaders(CONFIG.SHEET_STOCK_MOVEMENTS, INVENTORY_SCHEMA.DB_STOCK_MOVEMENTS);
    const inventorySheet = getSheet(CONFIG.SHEET_INVENTORY);
    const invData = inventorySheet.getDataRange().getValues();
    const invHeaders = invData[0];
    const processed = [];

    lines.forEach(function(line) {
      const item = stockMap[line.itemId];
      const qty = toNumber(line.qty);
      const moveId = _generateMoveId();
      const now = formatDateBkk(new Date(), 'yyyy-MM-dd HH:mm:ss');

      const linkedJobItem = _findActiveJobItem(jobItemsSheet, jobId, line.itemId, line.serialNumber);
      if (!linkedJobItem) {
        throw new Error('ไม่พบรายการเบิกเดิมใน DB_JOB_ITEMS สำหรับการคืนของ: ' + line.itemId);
      }

      if (linkedJobItem.remainingQty < qty) {
        throw new Error('จำนวนคืนมากกว่าจำนวนที่ยังค้างอยู่ของ itemId: ' + line.itemId);
      }

      _appendRowByHeaders(movementSheet, INVENTORY_SCHEMA.DB_STOCK_MOVEMENTS, {
        'MoveID': moveId,
        'วันที่เวลา': now,
        'JobID': jobId,
        'ItemID': item.itemId,
        'SKU': item.sku,
        'ชื่อสินค้า': item.name,
        'ประเภท': 'RETURN',
        'จำนวน': qty,
        'หน่วย': line.unit || item.unit,
        'SerialNumber': line.serialNumber,
        'หมายเหตุ': line.remark,
        'ผู้ทำรายการ': tech,
        'อ้างอิงเอกสาร': data.reference || ''
      });

      _updateInventoryBalance(inventorySheet, invHeaders, item.itemId, qty);
      _markJobItemReturned(jobItemsSheet, linkedJobItem, qty, mode);

      processed.push({
        itemId: item.itemId,
        name: item.name,
        qty: qty,
        unit: line.unit || item.unit,
        serialNumber: line.serialNumber || '',
        jobItemId: linkedJobItem.jobItemId
      });
    });

    return apiSuccess('returnInventoryFromJob', {
      jobId: jobId,
      processedCount: processed.length,
      mode: mode,
      items: processed,
      message: mode === 'PARTIAL_RETURN' ? 'คืนอะไหล่บางส่วนสำเร็จ' : 'คืนสต๊อกสำเร็จ'
    });

  } catch (err) {
    logSystemError('returnInventoryFromJob', err, { data: data || {} });
    return apiError('returnInventoryFromJob', 'RETURN_STOCK_FAILED', err.message, { stack: err.stack || '' });
  } finally {
    lock.releaseLock();
  }
}

/**
 * alias สำหรับ partial return ให้ route เรียกตรงได้
 * @param {Object} data
 * @returns {Object}
 */
function partialReturnInventoryFromJob(data) {
  try {
    const payload = Object.assign({}, data || {}, { mode: 'PARTIAL_RETURN' });
    return returnInventoryFromJob(payload);
  } catch (err) {
    logSystemError('partialReturnInventoryFromJob', err, { data: data || {} });
    return apiError('partialReturnInventoryFromJob', 'PARTIAL_RETURN_FAILED', err.message, {});
  }
}

/**
 * ปิดงานพร้อมตัดสต๊อกใน flow เดียว
 * รองรับทั้ง items[] แบบใหม่ และ snText แบบ legacy
 * @param {Object} data
 * @returns {Object}
 */
function processJobClosingAndInventory(data) {
  try {
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

    updateJobFields(payload.jobId, { 'สถานะ': payload.closeStatus || 'Completed' });

    return apiSuccess('processJobClosingAndInventory', {
      jobId: payload.jobId,
      message: 'ปิดงานและตัดสต๊อกสำเร็จ',
      closeStatus: payload.closeStatus || 'Completed'
    });
  } catch (err) {
    logSystemError('processJobClosingAndInventory', err, { data: data || {} });
    return apiError('processJobClosingAndInventory', 'JOB_CLOSE_FAILED', err.message, {});
  }
}

/**
 * แปลงข้อความ snText แบบเก่าให้กลายเป็น inventory lines
 * ใช้สำหรับ compatibility กับ flow เดิม
 * @param {string} snText
 * @returns {Array<Object>}
 */
function buildInventoryLinesFromSnText(snText) {
  try {
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
  } catch (err) {
    logSystemError('buildInventoryLinesFromSnText', err, { snText: snText || '' });
    return [];
  }
}

/**
 * หา ItemID จากชื่อสินค้า หรือ S/N สินค้า
 * @param {string} name
 * @param {string} sn
 * @returns {string}
 */
function findInventoryItemIdByNameOrSn(name, sn) {
  try {
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
  } catch (err) {
    logSystemError('findInventoryItemIdByNameOrSn', err, { name: name || '', sn: sn || '' });
    return '';
  }
}

/**
 * normalize รายการ items ให้โครงสร้างคงที่
 * @param {Array<Object>} items
 * @returns {Array<Object>}
 */
function normalizeInventoryLines(items) {
  try {
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
  } catch (err) {
    logSystemError('normalizeInventoryLines', err, { items: items || [] });
    return [];
  }
}

/**
 * เตรียมชีท movement/job items ให้พร้อมใช้งาน ถ้ายังไม่มีให้สร้างทันที
 */
function ensureInventorySheetsReady() {
  try {
    ensureSheetWithHeaders(CONFIG.SHEET_STOCK_MOVEMENTS, INVENTORY_SCHEMA.DB_STOCK_MOVEMENTS);
    ensureSheetWithHeaders(CONFIG.SHEET_JOB_ITEMS, INVENTORY_SCHEMA.DB_JOB_ITEMS);
    ensureSystemLogSheetReady();
  } catch (err) {
    logSystemError('ensureInventorySheetsReady', err, {});
    throw err;
  }
}

/**
 * สร้าง stock map จาก DB_INVENTORY เพื่อ lookup เร็วขึ้นระหว่าง transaction
 * @returns {Object<string,Object>}
 */
function _buildStockMap() {
  try {
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
  } catch (err) {
    logSystemError('_buildStockMap', err, {});
    throw err;
  }
}

/**
 * ตรวจความถูกต้องของรายการสต๊อก เช่น qty, unit, serial, stock balance
 * @param {Array<Object>} lines
 * @param {Object<string,Object>} stockMap
 * @param {'OUT'|'RETURN'} mode
 * @returns {Object}
 */
function _validateInventoryLines(lines, stockMap, mode) {
  try {
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
  } catch (err) {
    logSystemError('_validateInventoryLines', err, { lines: lines || [], mode: mode || '' });
    throw err;
  }
}

/**
 * สร้าง map serial ที่ถูกใช้ออกไปแล้วจาก movement log
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 * @returns {Object<string,boolean>}
 */
function _getUsedSerialMap(sheet) {
  try {
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
  } catch (err) {
    logSystemError('_getUsedSerialMap', err, {});
    throw err;
  }
}

/**
 * หา job item แถวล่าสุดที่ยัง active และยังคืนได้อยู่
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 * @param {string} jobId
 * @param {string} itemId
 * @param {string} serialNumber
 * @returns {Object|null}
 */
function _findActiveJobItem(sheet, jobId, itemId, serialNumber) {
  try {
    const values = sheet.getDataRange().getValues();
    if (values.length < 2) return null;
    const headers = values[0];
    const idxJobItemId = headers.indexOf('JobItemID');
    const idxJobId = headers.indexOf('JobID');
    const idxItemId = headers.indexOf('ItemID');
    const idxQty = headers.indexOf('จำนวน');
    const idxSerial = headers.indexOf('SerialNumber');
    const idxStatus = headers.indexOf('สถานะรายการ');

    for (let i = values.length - 1; i >= 1; i--) {
      const rowJobId = safeTrim(values[i][idxJobId]);
      const rowItemId = safeTrim(values[i][idxItemId]);
      const rowSerial = safeTrim(values[i][idxSerial]);
      const rowStatus = safeTrim(values[i][idxStatus]) || 'Active';
      if (rowJobId !== jobId || rowItemId !== itemId) continue;
      if (serialNumber && rowSerial && serialNumber !== rowSerial) continue;
      if (rowStatus === 'Returned') continue;

      return {
        rowNumber: i + 1,
        jobItemId: safeTrim(values[i][idxJobItemId]),
        qty: toNumber(values[i][idxQty]),
        remainingQty: _extractRemainingQty(rowStatus, toNumber(values[i][idxQty])),
        status: rowStatus
      };
    }
    return null;
  } catch (err) {
    logSystemError('_findActiveJobItem', err, { jobId: jobId || '', itemId: itemId || '', serialNumber: serialNumber || '' });
    throw err;
  }
}

/**
 * อ่าน remaining qty จากข้อความสถานะ เช่น PartialReturned(1/3)
 * @param {string} statusText
 * @param {number} defaultQty
 * @returns {number}
 */
function _extractRemainingQty(statusText, defaultQty) {
  const text = safeTrim(statusText);
  if (!text || text === 'Active') return defaultQty;
  if (text === 'Returned') return 0;
  const matched = text.match(/PartialReturned\((\d+)\/(\d+)\)/i);
  if (matched) {
    const returnedQty = toNumber(matched[1]);
    const totalQty = toNumber(matched[2]);
    return Math.max(0, totalQty - returnedQty);
  }
  return defaultQty;
}

/**
 * อัปเดตสถานะ job item หลังคืนของ
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 * @param {Object} linkedJobItem
 * @param {number} returnQty
 * @param {string} mode
 */
function _markJobItemReturned(sheet, linkedJobItem, returnQty, mode) {
  try {
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const idxStatus = headers.indexOf('สถานะรายการ');
    if (idxStatus === -1) throw new Error('DB_JOB_ITEMS ต้องมีคอลัมน์ สถานะรายการ');

    const totalQty = linkedJobItem.qty;
    const previousRemaining = linkedJobItem.remainingQty;
    const returnedTotal = totalQty - previousRemaining + returnQty;
    let newStatus = 'Returned';
    if (returnedTotal < totalQty || mode === 'PARTIAL_RETURN') {
      newStatus = 'PartialReturned(' + returnedTotal + '/' + totalQty + ')';
      if (returnedTotal >= totalQty) newStatus = 'Returned';
    }

    sheet.getRange(linkedJobItem.rowNumber, idxStatus + 1).setValue(newStatus);
  } catch (err) {
    logSystemError('_markJobItemReturned', err, { linkedJobItem: linkedJobItem || {}, returnQty: returnQty || 0, mode: mode || '' });
    throw err;
  }
}

/**
 * อัปเดต balance ของสินค้าใน DB_INVENTORY ตาม deltaQty
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 * @param {Array<string>} headers
 * @param {string} itemId
 * @param {number} deltaQty
 * @returns {number}
 */
function _updateInventoryBalance(sheet, headers, itemId, deltaQty) {
  try {
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
  } catch (err) {
    logSystemError('_updateInventoryBalance', err, { itemId: itemId || '', deltaQty: deltaQty || 0 });
    throw err;
  }
}

/**
 * สร้าง MoveID แบบไม่ชนกันง่ายสำหรับ movement log
 * @returns {string}
 */
function _generateMoveId() {
  return 'MOVE-' + formatDateBkk(new Date(), 'yyyyMMdd-HHmmss') + '-' + Math.floor(Math.random() * 9000 + 1000);
}

/**
 * สร้าง JobItemID สำหรับ DB_JOB_ITEMS
 * @returns {string}
 */
function _generateJobItemId() {
  return 'JIT-' + formatDateBkk(new Date(), 'yyyyMMdd-HHmmss') + '-' + Math.floor(Math.random() * 9000 + 1000);
}