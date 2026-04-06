import os, re

D = r'C:\Users\Server\.openclaw\workspace\Shop_vnext\src'

# ============================================================
# Read JobsHandler.gs
# ============================================================
jh_path = os.path.join(D, 'JobsHandler.gs')
with open(jh_path, 'r', encoding='utf-8') as f:
    jh = f.read()

# ============================================================
# Fix 1: completeJob() — rewrite completely (structure was broken)
# ============================================================
# Find the start and end of completeJob function
cj_start = jh.find('function completeJob(')
next_func = '\nfunction updateJobStatus('
cj_end = jh.find(next_func)

before_cj = jh[:cj_start]
after_cj = jh[cj_end:]  # includes the \nfunction updateJobStatus...

complete_job_v350 = '''function completeJob(data) {
  var lock = LockService.getScriptLock();
  try { lock.waitLock(10000); } catch(e) { return { error: 'Lock timeout' }; }
  try {
    var ss = getComphoneSheet();
    var sh = findSheetByName(ss, 'DBJOBS');
    if (!sh) return { error: 'DBJOBS not found' };
    var all = sh.getDataRange().getValues();

    // V350: Dynamic Header Lookup
    var headers = all[0];
    var statusCol = 3, updateCol = 10;
    for (var hi = 0; hi < headers.length; hi++) {
      var h = String(headers[hi]);
      if (h.indexOf('สถานะ') > -1 || h.indexOf('สถาน') > -1) statusCol = hi;
      if (h.indexOf('เวลาอัปเดต') > -1 || h.indexOf('updated') > -1) updateCol = hi;
    }

    var jobId = data.job_id || '';

    // V350 FIX #1: ย้าย labor/total ออกมานอก scope — logActivity reference ได้
    var labor = Number(data.labor_cost || 0);
    var total = labor + Number(data.parts_cost || 0);

    for (var i = 1; i < all.length; i++) {
      if (String(all[i][0]) === String(jobId)) {
        var oldStatus = String(all[i][statusCol] || '');

        if (oldStatus !== 'Completed') {
          all[i][statusCol] = 'Completed';
          all[i][updateCol] = new Date();
          sh.getDataRange().setValues(all);

          // Auto-cut reserved stock OR manual parts
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

          // V350: Create billing — labor/total properly scoped above
          var billSh = findSheetByName(ss, 'DB_BILLING');
          if (billSh) {
            billSh.appendRow([jobId, data.parts || '-', labor, total, 'Unpaid', new Date()]);
          }

          // V350: Call createBilling with inventory price lookup
          try { createBilling(jobId, data.parts, labor); } catch(e) {}

          // Log activity
          try {
            logActivity('JOB_CLOSE', 'SYSTEM||LINE', jobId + ' รายได้: ' + (total || '0') + ' บาท');
          } catch(e) {}

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

'''

# ============================================================
# Fix 2: updateJobStatus() — Dynamic Header Lookup (FIX #3)
# ============================================================
# Read the current state and update if needed

# ============================================================
# Fix 3: createBilling() — Proper price lookup (already done from _v350_all.py)
# ============================================================

# Write the new JobsHandler.gs
new_jh = before_cj + complete_job_v350 + after_cj

# Remove duplicate createBilling if exists (the new one from _v350_all.py is better)
# Actually keep it — it was already updated
with open(jh_path, 'w', encoding='utf-8') as f:
    f.write(new_jh)

# ============================================================
# Validate JobsHandler.gs
# ============================================================
# Balance braces
brace_count = 0
for c in new_jh:
    if c == '{': brace_count += 1
    elif c == '}': brace_count -= 1

print(f'Brace balance: {brace_count} ({'OK' if brace_count == 0 else 'UNBALANCED'})')

# Verify all functions exist
funcs = re.findall(r'function (\w+)\(', new_jh)
required = [
    'openJob', 'checkJobs', 'completeJob', 'updateJobStatus', 'updateJobById',
    'getOrCreateJobFolder', 'saveJobPhoto', 'updatePhotoLink', 'updateJobFolderLink',
    'cutStock', 'createBilling'
]

for fn in required:
    if fn in funcs:
        print(f'OK: {fn} (line {new_jh.index(f"function {fn}(")})')
    else:
        print(f'MISSING: {fn}')

# Check for syntax issues
if 'function completeJob' in new_jh:
    cj_start2 = new_jh.index('function completeJob(')
    cj_end2 = new_jh.index('function updateJobStatus(')
    cj_body = new_jh[cj_start2:cj_end2]
    # Check for unclosed blocks
    if cj_body.count('{') == cj_body.count('}'):
        print(f'completeJob() balanced: {cj_body.count("{")} open/close')
    else:
        print(f'completeJob() UNBALANCED: {cj_body.count("{")} open, {cj_body.count("}")} close')
        
print(f'\nJobsHandler.gs: {len(new_jh)} bytes, {len(funcs)} functions')
