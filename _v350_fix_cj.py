import os, re
D = r'C:\Users\Server\.openclaw\workspace\Shop_vnext\src'

# Read JobsHandler.gs
jh_path = os.path.join(D, 'JobsHandler.gs')
with open(jh_path, 'r', encoding='utf-8') as f:
    jh = f.read()

# Fix completeJob() — completely rewrite the broken function
# Find everything BEFORE completeJob (up to checkJobs closing brace)
before_cj = jh[:jh.index('function completeJob(')]

# Find everything AFTER completeJob (from next function)
after_cj = jh[jh.index('\nfunction updateJobStatus('):]

completeJob_v350 = """function completeJob(data) {
  var lock = LockService.getScriptLock();
  try { lock.waitLock(10000); } catch(e) { return { error: 'Lock timeout' }; }
  try {
    var ss = getComphoneSheet();
    var sh = findSheetByName(ss, 'DBJOBS');
    if (!sh) return { error: 'DBJOBS not found' };
    var all = sh.getDataRange().getValues();

    // V350: Dynamic Header Lookup (instead of hardcoded column indices)
    var headers = all[0];
    var statusCol = 3, updateCol = 10;
    for (var hi = 0; hi < headers.length; hi++) {
      var h = String(headers[hi]);
      if (h.indexOf('สถานะ') > -1 || h.indexOf('สถาน') > -1) statusCol = hi;
      if (h.indexOf('เวลาอัปเดต') > -1 || h.indexOf('updated') > -1) updateCol = hi;
    }

    var jobId = data.job_id || '';

    // V350: Move labor/total calculation to outer scope so it's accessible everywhere
    var labor = Number(data.labor_cost || 0);
    var total = labor + Number(data.parts_cost || 0);

    for (var i = 1; i < all.length; i++) {
      if (String(all[i][0]) === String(jobId)) {
        var oldStatus = String(all[i][statusCol] || '');

        if (oldStatus !== 'Completed') {
          all[i][statusCol] = 'Completed';
          all[i][updateCol] = new Date();
          sh.getDataRange().setValues(all);

          // V320: Auto-cut reserved stock OR manual parts
          var cutResult = cutStockAuto(jobId);

          // If no reservations, use manual parts from data
          if (cutResult.success && cutResult.items.length === 0 && data.parts) {
            var invSh = findSheetByName(ss, 'DB_INVENTORY');
            if (invSh) {
              var partsArr = String(data.parts).split(',');
              var invAll = invSh.getDataRange().getValues();
              for (var pi = 0; pi < partsArr.length; pi++) {
                var psplit = partsArr[pi].split(':');
                var itemName = (psplit[0] || '').trim();
                var qty = parseInt(psplit[1]) || 1;
                for (var qi = 1; qi < invAll.length; qi++) {
                  if (String(invAll[qi][0]) === itemName || String(invAll[qi][1]) === itemName) {
                    invAll[qi][2] = Math.max(0, Number(invAll[qi][2]) - qty);
                  }
                }
              }
              invSh.getDataRange().setValues(invAll);
              cutResult.items = partsArr.map(function(p) {
                var s = p.split(':');
                return { code: (s[0] || '').trim(), qty: parseInt(s[1]) || 1 };
              });
            }
          }

          // V350: Create billing — labor and total now properly declared above
          var billSh = findSheetByName(ss, 'DB_BILLING');
          if (billSh) {
            billSh.appendRow([jobId, data.parts || '-', labor, total, 'Unpaid', new Date()]);
          }

          // V320: Log
          try {
            logActivity('JOB_CLOSE', 'SYSTEM||LINE', jobId + ' — รายได้: ' + (total || '0') + ' บาท');
          } catch(e) {
            Logger.log('LOG_ACTIVITY error: ' + e);
          }

          return {
            success: true,
            job_id: jobId,
            status: 'Completed',
            message: 'ปิดงานสำเร็จ!',
            stock: cutResult,
            warnings: cutResult.warnings || []
          };
        }

        return { success: true, job_id: jobId, status: 'Completed', message: 'งานนี้ปิดแล้ว' };
      }
    }
    return { error: 'ไม่พบ JobID: ' + jobId };
  } catch (e) {
    return { error: e.toString() };
  } finally {
    try { lock.releaseLock(); } catch(ex) {}
  }
}
"""

# Combine
new_jh = before_cj + completeJob_v350 + after_cj

# Write back
with open(jh_path, 'w', encoding='utf-8') as f:
    f.write(new_jh)

print('JobsHandler.gs completeJob() rewritten — V350')

# Validate: check brace balance
braces = 0
for c in new_jh:
    if c == '{': braces += 1
    elif c == '}': braces -= 1
print('Brace balance:', 'OK' if braces == 0 else 'UNBALANCED (%d)' % braces)

# Count functions
func_count = len(re.findall(r'function \w+\(', new_jh))
print('Functions found:', func_count)

# Check that all required functions exist
for fn in ['openJob', 'checkJobs', 'completeJob', 'updateJobStatus', 'updateJobById', 'getOrCreateJobFolder', 'saveJobPhoto', 'updatePhotoLink', 'updateJobFolderLink', 'cutStock', 'createBilling']:
    if 'function ' + fn + '(' in new_jh:
        print('  ✅ ' + fn)
    else:
        print('  ❌ MISSING: ' + fn)
