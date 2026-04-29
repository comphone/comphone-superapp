// ============================================================
// COMPHONE SUPER APP v5.9.0-phase31a
// InventoryTransfer.gs — Stock Transfer & Location Management
// Extracted from Inventory.gs (Phase 31 Refactoring)
// ============================================================

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
    if (fromIndex < 1) return { success: false, error: '\u0e44\u0e21\u0e48\u0e1e\u0e1a\u0e2a\u0e34\u0e19\u0e04\u0e49\u0e32\u0e43\u0e19\u0e15\u0e49\u0e19\u0e17\u0e32\u0e07' };

    var fromRow = sheetData.rows[fromIndex];
    var available = normalizeNumber_(fromRow[sheetData.ctx.indices.qty], 0);
    if (available < moveQty) {
      return { success: false, error: '\u0e08\u0e33\u0e19\u0e27\u0e19\u0e44\u0e21\u0e48\u0e1e\u0e2d\u0e2a\u0e33\u0e2b\u0e23\u0e31\u0e1a\u0e42\u0e2d\u0e19\u0e22\u0e49\u0e32\u0e22', available: available, requested: moveQty };
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

// ─── Location Helpers ──────────────────────────────────────

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

// ─── Transfer Log ─────────────────────────────────────────

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

// ─── Predictive Stocking ──────────────────────────────────

function predictiveStocking(data) {
  try {
    data = data || {};
    var days = Math.max(1, parseInt(data.days || 3, 10));
    var ss = getComphoneSheet();
    if (!ss) return { success: false, error: 'Spreadsheet not found' };
    var jobSheet = findSheetByName(ss, 'DBJOBS');
    if (!jobSheet || jobSheet.getLastRow() < 2) return { success: true, days: days, technicians: [] };

    var headers = jobSheet.getRange(1, 1, 1, jobSheet.getLastColumn()).getValues()[0];
    var idxCreated = findHeaderIndex_(headers, ['\u0e40\u0e27\u0e25\u0e32\u0e2a\u0e23\u0e49\u0e32\u0e07', 'Created_At', 'CreatedAt']);
    var idxJobId = findHeaderIndex_(headers, ['JobID', 'Job_ID', 'job_id']);
    var idxTech = findHeaderIndex_(headers, ['\u0e0a\u0e48\u0e32\u0e07\u0e17\u0e35\u0e48\u0e23\u0e31\u0e1a\u0e07\u0e32\u0e19', 'Technician', 'tech']);
    var idxStatus = findHeaderIndex_(headers, ['\u0e2a\u0e16\u0e32\u0e19\u0e30', 'Status']);
    var idxNote = findHeaderIndex_(headers, ['\u0e2b\u0e21\u0e32\u0e22\u0e40\u0e2b\u0e15\u0e38', 'Note']);
    var rows = jobSheet.getDataRange().getValues();
    var now = new Date();
    var deadline = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    var techUsage = {};

    for (var i = 1; i < rows.length; i++) {
      var created = parseFlexibleDate_(safeCellRaw_(rows[i], idxCreated));
      if (!created || created.getTime() > deadline.getTime()) continue;
      var statusText = safeCellValue_(rows[i], idxStatus);
      if (statusText === '\u0e1b\u0e34\u0e14\u0e07\u0e32\u0e19' || statusText === '\u0e40\u0e01\u0e47\u0e1a\u0e40\u0e07\u0e34\u0e19\u0e41\u0e25\u0e49\u0e27') continue;
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
  var msg = '\u0e41\u0e08\u0e49\u0e07\u0e40\u0e15\u0e37\u0e2d\u0e19\u0e40\u0e15\u0e23\u0e35\u0e22\u0e21\u0e02\u0e2d\u0e07\u0e25\u0e48\u0e27\u0e07\u0e2b\u0e19\u0e49\u0e32 ' + days + ' \u0e27\u0e31\u0e19\n';
  msg += '\u0e0a\u0e48\u0e32\u0e07: ' + techPlan.tech_id + '\n';
  msg += '\u0e07\u0e32\u0e19\u0e43\u0e19\u0e04\u0e34\u0e27: ' + techPlan.jobs.length + ' \u0e07\u0e32\u0e19\n\n';
  for (var i = 0; i < techPlan.shortages.length; i++) {
    var item = techPlan.shortages[i];
    msg += '\u2022 ' + item.item_name + ' (' + item.item_code + ') \u0e15\u0e49\u0e2d\u0e07\u0e43\u0e0a\u0e49 ' + item.required_qty + ' | \u0e1a\u0e19\u0e23\u0e16 ' + item.van_qty + ' | \u0e02\u0e32\u0e14 ' + item.shortage_qty + '\n';
  }
  return msg;
}

// ─── Tool Audit ────────────────────────────────────────────

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
      auditSheet.appendRow([new Date(), weekKey, techId, '', '', 'NO_STOCK', data.created_by || 'SYSTEM', '\u0e44\u0e21\u0e48\u0e21\u0e35\u0e23\u0e32\u0e22\u0e01\u0e32\u0e23\u0e2d\u0e38\u0e1b\u0e01\u0e23\u0e13\u0e4c\u0e1a\u0e19\u0e23\u0e16']);
      return { success: true, tech_id: techId, week_key: weekKey, total_items: 0, checklist: [] };
    }

    var checklist = [];
    for (var i = 0; i < items.length; i++) {
      auditSheet.appendRow([
        new Date(), weekKey, techId,
        items[i].item_code, items[i].item_name, 'PENDING',
        data.created_by || 'SYSTEM', 'Auto generated from van stock'
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
        timestamp: rows[i][0], week_key: rows[i][1], tech_id: rows[i][2],
        item_code: rows[i][3], item_name: rows[i][4], status: rows[i][5],
        checked_by: rows[i][6], note: rows[i][7]
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
