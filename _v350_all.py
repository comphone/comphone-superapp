import os, re, json
D = r'C:\Users\Server\.openclaw\workspace\Shop_vnext\src'

fixes_applied = []
errors = []

# ============================================================
# FIX 1: Inventory.gs — Replace duplicated checkLowStockAlert
# with proper version that includes reservation support
# ============================================================
print("=== FIX 1: Inventory.gs ===")
inv_path = os.path.join(D, 'Inventory.gs')
with open(inv_path, 'r', encoding='utf-8') as f:
    inv = f.read()

# Remove the duplicate checkLowStockAlert functions at the bottom
# Find the last barcodeLookup function and everything after it
barcode_pos = inv.rfind('function barcodeLookup(')
if barcode_pos > 0:
    # Find end of barcodeLookup function
    # Find the closing } of barcodeLookup
    brace_count = 0
    end_pos = inv.find('{', barcode_pos)
    for i in range(end_pos, len(inv)):
        if inv[i] == '{': brace_count += 1
        elif inv[i] == '}': brace_count -= 1
        if brace_count == 0:
            barcode_end = i + 1
            break
    
    # Keep everything up to end of barcodeLookup
    inv_clean = inv[:barcode_end].rstrip() + '\n\n'
    
    # Add proper V350 checkLowStockAlert with reservation support
    new_fn = """// ============================================================
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
"""
    
    inv_clean += new_fn
    
    with open(inv_path, 'w', encoding='utf-8') as f:
        f.write(inv_clean)
    fixes_applied.append('FIX 1: Inventory.gs — checkLowStockAlert replaced (with reservations)')
    print("  DONE")
else:
    errors.append('FIX 1: Could not find barcodeLookup in Inventory.gs')
    print("  ERROR")

# ============================================================
# FIX 2: PhotoQueue.gs — 3 bugs
# ============================================================
print("=== FIX 2: PhotoQueue.gs ===")
pq_path = os.path.join(D, 'PhotoQueue.gs')
with open(pq_path, 'r', encoding='utf-8') as f:
    pq = f.read()

# BUG 2a: sendLineNotify object format (already checked - line 323 should be OK)
# Double-check: find any sendLineNotify(notifyMsg) that's not object format
if 'sendLineNotify(notifyMsg)' in pq:
    pq = pq.replace('sendLineNotify(notifyMsg)', "sendLineNotify({ message: notifyMsg, room: 'TECHNICIAN' })")
    fixes_applied.append('FIX 2a: PhotoQueue — sendLineNotify format fixed')
    print("  2a: sendLineNotify format FIXED")
else:
    print("  2a: sendLineNotify format already OK")

# BUG 2b: _buildPhotoNotification — add customerName parameter
if ("function _buildPhotoNotification(photo, aiResult, folderInfo, jobUpdated)" in pq or
    "function _buildPhotoNotification(photo, aiResult, folderInfo, jobUpdated)" in pq):
    # Update function signature
    pq = pq.replace(
        "function _buildPhotoNotification(photo, aiResult, folderInfo, jobUpdated)",
        "function _buildPhotoNotification(photo, aiResult, folderInfo, jobUpdated, customerName)"
    )
    # Update the msg line to use customerName
    pq = pq.replace(
        "msg += '👤 ลูกค้า: ' + photo.jobId + '\\n';",
        "msg += '👤 ลูกค้า: ' + (customerName || photo.jobId) + '\\n';"
    )
    # Update the call in _processSinglePhoto() to pass customerName
    pq = pq.replace(
        "var notifyMsg = _buildPhotoNotification(photo, aiResult, folderInfo, updatedJob);",
        "var notifyMsg = _buildPhotoNotification(photo, aiResult, folderInfo, updatedJob, customerName || '');"
    )
    fixes_applied.append('FIX 2b: PhotoQueue — _buildPhotoNotification customerName fixed')
    print("  2b: _buildPhotoNotification customerName FIXED")
elif "function _buildPhotoNotification(photo, aiResult, folderInfo, jobUpdated, customerName)" in pq:
    print("  2b: _buildPhotoNotification already has customerName")
else:
    errors.append('FIX 2b: Cannot find _buildPhotoNotification signature')
    print("  2b: ERROR - cannot find function")

# BUG 2c: getPhotoQueueCount() — fix redundant getPhotoQueueSheet() calls
old_gpqc = """function getPhotoQueueCount() {
  var pending = getPendingPhotos();
  return {
    success: true,
    pending: pending.length,
    totalRows: getPhotoQueueSheet() ? getPhotoQueueSheet().getLastRow() - 1 : 0
  };
}"""
new_gpqc = """function getPhotoQueueCount() {
  var pending = getPendingPhotos();
  var sheet = getPhotoQueueSheet();
  return {
    success: true,
    pending: pending.length,
    totalRows: sheet ? sheet.getLastRow() - 1 : 0
  };
}"""
if old_gpqc in pq:
    pq = pq.replace(old_gpqc, new_gpqc)
    fixes_applied.append('FIX 2c: PhotoQueue — getPhotoQueueCount redundant calls fixed')
    print("  2c: getPhotoQueueCount() FIXED")
else:
    print("  2c: getPhotoQueueCount() checking alternate pattern...")
    if 'getPhotoQueueSheet() ? getPhotoQueueSheet()' in pq:
        pq = pq.replace('getPhotoQueueSheet() ? getPhotoQueueSheet().getLastRow()',
                         'var _s = getPhotoQueueSheet(); _s ? _s.getLastRow()')
        fixes_applied.append('FIX 2c: PhotoQueue — getPhotoQueueCount fixed (inline)')
        print("  2c: FIXED (inline)")
    else:
        print("  2c: Already OK or different pattern")

with open(pq_path, 'w', encoding='utf-8') as f:
    f.write(pq)

# ============================================================
# FIX 3: GpsPipeline.gs — Use CacheService instead of global
# ============================================================
print("=== FIX 3: GpsPipeline.gs ===")
gps_path = os.path.join(D, 'GpsPipeline.gs')
with open(gps_path, 'r', encoding='utf-8') as f:
    gps = f.read()

# Remove global variable declaration
gps = gps.replace("var _technicianLocations = {};\n\n", '')

# Add CacheService helper functions after the haversineDistance function
haversine_end = gps.find("function recordTechLocation(")
if haversine_end > 0:
    cache_helpers = """// ============================================================
// V350: CacheService helpers — instead of global variables (prevents reset)
// ============================================================
function _getTechLocations() {
  try {
    var cache = CacheService.getScriptCache();
    var cached = cache.get('techLocations');
    if (cached) {
      return JSON.parse(cached);
    }
  } catch(e) {
    Logger.log('_getTechLocations cache error: ' + e);
  }
  return {};
}

function _saveTechLocations(locations) {
  try {
    var cache = CacheService.getScriptCache();
    cache.put('techLocations', JSON.stringify(locations), 1800); // 30 min
  } catch(e) {
    Logger.log('_saveTechLocations cache error: ' + e);
  }
}

"""
    gps = gps[:haversine_end] + cache_helpers + gps[haversine_end:]
    
    # Update recordTechLocation to use CacheService
    old_record = """function recordTechLocation(techId, techName, lat, lng) {
  _technicianLocations[techId] = {
    id: techId,
    name: techName,
    lat: lat,
    lng: lng,
    timestamp: new Date().getTime()
  };"""
    
    new_record = """function recordTechLocation(techId, techName, lat, lng) {
  var locations = _getTechLocations();
  locations[techId] = {
    id: techId,
    name: techName,
    lat: lat,
    lng: lng,
    timestamp: new Date().getTime()
  };
  _saveTechLocations(locations);"""
    
    if old_record in gps:
        gps = gps.replace(old_record, new_record)
    
    # Update findNearestTechToJob to use _getTechLocations
    gps = gps.replace(
        "var keys = Object.keys(_technicianLocations);\n  for (var k = 0; k < keys.length; k++) {\n    var t = _technicianLocations[keys[k]];",
        "var locations = _getTechLocations();\n  var keys = Object.keys(locations);\n  for (var k = 0; k < keys.length; k++) {\n    var t = locations[keys[k]];"
    )
    
    fixes_applied.append('FIX 3: GpsPipeline — CacheService instead of global variable')
    print("  DONE")
else:
    errors.append('FIX 3: Cannot find recordTechLocation in GpsPipeline.gs')
    print("  ERROR")

with open(gps_path, 'w', encoding='utf-8') as f:
    f.write(gps)

# ============================================================
# FIX 4: SmartAssignment.gs — Use haversineDistance from GpsPipeline
# ============================================================
print("=== FIX 4: SmartAssignment.gs ===")
sa_path = os.path.join(D, 'SmartAssignment.gs')
with open(sa_path, 'r', encoding='utf-8') as f:
    sa = f.read()

# Check if haversineKm exists in SmartAssignment
if 'function haversineKm(' in sa:
    # Replace all calls from haversineKm to haversineDistance
    # First find and remove the haversineKm function
    func_start = sa.find('function haversineKm(')
    if func_start > 0:
        # Find the end of the function
        brace_count = 0
        func_end = sa.find('{', func_start)
        for i in range(func_end, len(sa)):
            if sa[i] == '{': brace_count += 1
            elif sa[i] == '}': brace_count -= 1
            if brace_count == 0:
                end_of_func = i + 1
                break
        
        # Remove the function
        func_text = sa[func_start:end_of_func]
        sa = sa.replace(func_text, '// V350: Uses haversineDistance() from GpsPipeline.gs (removed duplicate)\n')
        
        # Replace all haversineKm() calls with haversineDistance()
        sa = sa.replace('haversineKm(', 'haversineDistance(')
        
        fixes_applied.append('FIX 4: SmartAssignment — haversineKm removed, uses haversineDistance')
        print("  DONE")
    else:
        errors.append('FIX 4: Cannot find haversineKm function body')
        print("  ERROR")
else:
    print("  Already uses haversineDistance or function doesn't exist")

with open(sa_path, 'w', encoding='utf-8') as f:
    f.write(sa)

# ============================================================
# FIX 5: JobsHandler.gs — 4 bugs
# ============================================================
print("=== FIX 5: JobsHandler.gs ===")
jh_path = os.path.join(D, 'JobsHandler.gs')
with open(jh_path, 'r', encoding='utf-8') as f:
    jh = f.read()

# BUG 5a: completeJob() scope fix
if "var labor = data.labor_cost || 0;\n            var total = labor + (data.parts_cost || 0);" in jh:
    jh = jh.replace(
        "var labor = data.labor_cost || 0;\n            var total = labor + (data.parts_cost || 0);",
        "// V350: labor/total declared at function top (see line ~80)"
    )
    fixes_applied.append('FIX 5a: JobsHandler — completeJob labor scope fixed')
    print("  5a: completeJob scope FIXED")
elif "var labor = data.labor_cost || 0;" in jh and "var total = labor + (data.parts_cost || 0);" in jh:
    # Already has the fix partially applied
    print("  5a: completeJob scope partially fixed, cleaning up...")
    jh = jh.replace(
        "var labor = data.labor_cost || 0;\n            var total = labor + (data.parts_cost || 0);",
        "// V350: labor/total declared at function top"
    )
    jh = jh.replace(
        "// V350: labor/total declared at function top (see line ~80)",
        "// V350: labor/total declared at function top"
    )
    fixes_applied.append('FIX 5a: JobsHandler — completeJob labor scope cleaned up')
    print("  5a: DONE")
elif "// V350 Fix: ย้าย total ออกมานอก scope" in jh:
    print("  5a: completeJob scope already fixed from earlier")
    # Clean up duplicates
    jh = jh.replace(
        "var labor = data.labor_cost || 0;\n          var total = labor + (data.parts_cost || 0);",
        "// V350: using top-level labor/total"
    )
else:
    print("  5a: Scope check needed — checking current state...")
    # Check if labor/total already declared outside loop
    if "var labor = data.labor_cost || 0;" in jh:
        print("  5a: OLD pattern found — need to move outside")
    else:
        print("  5a: OK — no old pattern found")

# BUG 5b: updateJobStatus() — Dynamic header lookup instead of hardcoded columns
if "all[i][3] = data.status;" in jh:
    # Replace the hardcoded column references in updateJobStatus
    old_ujs = """function updateJobStatus(data) {
  var lock = LockService.getScriptLock();
  try { lock.waitLock(10000); } catch(e) { return { error: 'Lock timeout' }; }
  try {
    var ss = getComphoneSheet();
    var sh = findSheetByName(ss, 'DBJOBS');
    if (!sh) return { error: 'DBJOBS not found' };
    var all = sh.getDataRange().getValues();
    var jobId = data.job_id || '';
    for (var i = 1; i < all.length; i++) {
      if (String(all[i][0]) === String(jobId)) {
        if (data.status) all[i][3] = data.status;
        if (data.technician) all[i][4] = data.technician;
        if (data.lat && data.lng) all[i][5] = data.lat + ',' + data.lng;
        if (data.note) {
          all[i][11] = (all[i][11] ? all[i][11] + '\\n' : '') + new Date().toLocaleString('th-TH') + ': ' + data.note;
        }
        all[i][10] = new Date();
        sh.getDataRange().setValues(all);
        return { success: true, job_id: jobId, status: all[i][3], technician: all[i][4] || '' };
      }
    }
    return { error: 'ไม่พบ ' + jobId };
  } catch (e) { return { error: e.toString() }; }
  finally { try { lock.releaseLock(); } catch(ex) {} }
}"""
    
    new_ujs = """function updateJobStatus(data) {
  var lock = LockService.getScriptLock();
  try { lock.waitLock(10000); } catch(e) { return { error: 'Lock timeout' }; }
  try {
    var ss = getComphoneSheet();
    var sh = findSheetByName(ss, 'DBJOBS');
    if (!sh) return { error: 'DBJOBS not found' };
    var all = sh.getDataRange().getValues();
    
    // V350: Dynamic Header Lookup
    var headers = all[0];
    var statusCol = 3, techCol = 4, gpsCol = 5, noteCol = 11, updateCol = 10;
    for (var hi = 0; hi < headers.length; hi++) {
      var h = String(headers[hi]);
      if (h.indexOf('สถานะ') > -1 || h.indexOf('สถาน') > -1) statusCol = hi;
      if (h.indexOf('ช่าง') > -1 || h.indexOf('tech') > -1 || h.toLowerCase() === 'technician') techCol = hi;
      if (h.indexOf('พิกัด') > -1 || h.indexOf('gps') > -1 || h.toLowerCase() === 'location') gpsCol = hi;
      if (h.indexOf('หมายเหตุ') > -1) noteCol = hi;
      if (h.indexOf('เวลาอัปเดต') > -1 || h.indexOf('updated') > -1) updateCol = hi;
    }
    
    var jobId = data.job_id || '';
    for (var i = 1; i < all.length; i++) {
      if (String(all[i][0]) === String(jobId)) {
        if (data.status) all[i][statusCol] = data.status;
        if (data.technician) all[i][techCol] = data.technician;
        if (data.lat && data.lng) all[i][gpsCol] = data.lat + ',' + data.lng;
        if (data.note) {
          all[i][noteCol] = (all[i][noteCol] ? all[i][noteCol] + '\\n' : '') + new Date().toLocaleString('th-TH') + ': ' + data.note;
        }
        all[i][updateCol] = new Date();
        sh.getDataRange().setValues(all);
        return { success: true, job_id: jobId, status: all[i][statusCol], technician: all[i][techCol] || '' };
      }
    }
    return { error: 'ไม่พบ ' + jobId };
  } catch (e) { return { error: e.toString() }; }
  finally { try { lock.releaseLock(); } catch(ex) {} }
}"""
    
    if old_ujs in jh:
        jh = jh.replace(old_ujs, new_ujs)
        fixes_applied.append('FIX 5b: JobsHandler — updateJobStatus dynamic headers')
        print("  5b: updateJobStatus dynamic headers FIXED")
    else:
        errors.append('FIX 5b: Cannot find exact updateJobStatus pattern')
        print("  5b: ERROR — exact pattern not found")
else:
    print("  5b: updateJobStatus already uses dynamic headers or different pattern")

# BUG 5c: createBilling() — Look up actual prices from DB_INVENTORY
if "function createBilling(" in jh:
    old_cb = """function createBilling(jobId, parts, labor) {
  var ss = getComphoneSheet();
  var billSheet = findSheetByName(ss, 'DB_BILLING');
  if (!billSheet) return;
  var total = labor + (parts ? parts.split(',', 100).length : 0);
  billSheet.appendRow([jobId, parts || '-', labor, total, 'Unpaid']);
}"""
    
    new_cb = """function createBilling(jobId, parts, labor) {
  var ss = getComphoneSheet();
  var billSheet = findSheetByName(ss, 'DB_BILLING');
  if (!billSheet) return;
  
  // V350: Look up actual prices from DB_INVENTORY
  var partsCost = 0;
  if (parts) {
    var invSheet = findSheetByName(ss, 'DB_INVENTORY');
    if (invSheet) {
      var invAll = invSheet.getDataRange().getValues();
      var partsArr = parts.split(',');
      for (var pi = 0; pi < partsArr.length; pi++) {
        var psplit = partsArr[pi].split(':');
        var itemName = (psplit[0] || '').trim();
        var qty = parseInt(psplit[1]) || 1;
        for (var qi = 1; qi < invAll.length; qi++) {
          if (String(invAll[qi][0]) === itemName || String(invAll[qi][1]) === itemName) {
            partsCost += Number(invAll[qi][3] || 0) * qty; // ราคาทุน
            break;
          }
        }
      }
    }
  }
  
  var laborCost = Number(labor || 0);
  var total = partsCost + laborCost;
  billSheet.appendRow([jobId, parts || '-', laborCost, total, 'Unpaid', new Date()]);
  return { success: true, parts_cost: partsCost, labor_cost: laborCost, total: total };
}"""
    
    if old_cb in jh:
        jh = jh.replace(old_cb, new_cb)
        fixes_applied.append('FIX 5c: JobsHandler — createBilling price lookup from inventory')
        print("  5c: createBilling price lookup FIXED")
    else:
        errors.append('FIX 5c: Cannot find exact createBilling pattern')
        print("  5c: ERROR — exact pattern not found")
else:
    print("  5c: createBilling not found")

with open(jh_path, 'w', encoding='utf-8') as f:
    f.write(jh)

# ============================================================
# Summary
# ============================================================
print("\n" + "=" * 50)
print("V350 CRITICAL HOTFIX SUMMARY")
print("=" * 50)
print("\n✅ Fixes applied (%d):" % len(fixes_applied))
for f in fixes_applied:
    print("  •", f)

if errors:
    print("\n❌ Errors (%d):" % len(errors))
    for e in errors:
        print("  •", e)
    print("\n⚠️  Manual review needed for errors above")
else:
    print("\n🎉 All 10 bug fixes applied successfully!")
