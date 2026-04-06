import os
D = r'C:\Users\Server\.openclaw\workspace\Shop_vnext\src'

# ============================================================
# FIX 1: Inventory.gs - add checkLowStockAlert()
# ============================================================
inv_path = os.path.join(D, 'Inventory.gs')
with open(inv_path, 'r', encoding='utf-8') as f:
    inv = f.read()

if 'function checkLowStockAlert(' not in inv:
    new_fn = '''
// ============================================================
// V350: Low Stock Alert Trigger — ป้องกัน Trigger Crash
// ============================================================
function checkLowStockAlert() {
  try {
    var ss = getComphoneSheet();
    var sh = findSheetByName(ss, 'DB_INVENTORY');
    if (!sh) return { error: 'DB_INVENTORY not found' };

    var all = sh.getDataRange().getValues();
    var lowItems = [];
    var ALERT_THRESHOLD = 5;

    for (var i = 1; i < all.length; i++) {
      var qty = Number(all[i][2] || 0);
      if (qty < ALERT_THRESHOLD) {
        lowItems.push({ code: String(all[i][0]), name: String(all[i][1]), qty: qty });
      }
    }

    if (lowItems.length > 0 && typeof sendLineNotify === 'function') {
      var msg = '\\u26a0\\ufe0f แจ้งเตือนสต็อกต่ำ!\\n';
      for (var j = 0; j < lowItems.length; j++) {
        msg += '\\u2022 ' + lowItems[j].name + ' (เหลือ ' + lowItems[j].qty + ')\\n';
      }
      sendLineNotify({ message: msg, room: 'TECHNICIAN' });
    }
    return { success: true, lowStock: lowItems.length, items: lowItems };
  } catch(e) { return { error: e.toString() }; }
}
'''
    inv = inv.rstrip() + '\n' + new_fn
    with open(inv_path, 'w', encoding='utf-8') as f:
        f.write(inv)
    print('FIX 1: checkLowStockAlert() added to Inventory.gs')
else:
    print('FIX 1: Already exists')

# ============================================================
# FIX 2: PhotoQueue.gs - sendLineNotify(notifyMsg) -> Object
# ============================================================
pq_path = os.path.join(D, 'PhotoQueue.gs')
with open(pq_path, 'r', encoding='utf-8') as f:
    pq = f.read()

if 'sendLineNotify(notifyMsg)' in pq:
    pq = pq.replace('sendLineNotify(notifyMsg)', "sendLineNotify({ message: notifyMsg, room: 'TECHNICIAN' })")
    with open(pq_path, 'w', encoding='utf-8') as f:
        f.write(pq)
    print('FIX 2: PhotoQueue.gs sendLineNotify() fixed')
else:
    # Check if already using object format
    if "sendLineNotify({ message: notifyMsg, room: 'TECHNICIAN' })" in pq:
        print('FIX 2: Already correct')
    else:
        print('FIX 2: Pattern not found - checking manually...')
        for line in pq.split('\n'):
            if 'sendLineNotify' in line:
                print('  Found:', line.strip())

# ============================================================
# FIX 3: JobsHandler.gs - openJob() phone in row
# ============================================================
jh_path = os.path.join(D, 'JobsHandler.gs')
with open(jh_path, 'r', encoding='utf-8') as f:
    jh = f.read()

# Check if phone is already in the row
if "var row = [id, name, symptom, status, tech, gps," in jh and "var row = [id, name, symptom, phone, status, tech," not in jh:
    jh = jh.replace(
        "var row = [id, name, symptom, status, tech, gps, '', '', '', new Date(), '', '', '']",
        "var row = [id, name, symptom, phone, status, tech, gps, '', '', '', new Date(), '', '', '']"
    )
    with open(jh_path, 'w', encoding='utf-8') as f:
        f.write(jh)
    print('FIX 3a: openJob() phone added to row')
else:
    # Check if already fixed
    if 'var row = [id, name, symptom, phone, status, tech,' in jh:
        print('FIX 3a: Already has phone in row')
    else:
        print('FIX 3a: Checking row pattern...')
        for line in jh.split('\n'):
            if 'var row = [id,' in line:
                print('  Found:', line.strip()[:100])

# ============================================================
# FIX 4: JobsHandler.gs - completeJob() scope fix
# ============================================================
with open(jh_path, 'r', encoding='utf-8') as f:
    jh = f.read()

# Check if labor/total already declared outside the for loop in completeJob
if "var jobId = data.job_id || '';" in jh and "var labor = Number(data.labor_cost || 0);" in jh:
    print('FIX 4: completeJob() scope already fixed')
else:
    # Check for the pattern we need to fix
    if "var labor = data.labor_cost || 0;" in jh:
        # Need to fix - move declarations outside
        lines = jh.split('\n')
        new_lines = []
        in_complete_job = False
        added_labor = False
        for i, line in enumerate(lines):
            if 'function completeJob(' in line:
                in_complete_job = True
            
            if in_complete_job and "var jobId = data.job_id || '';" in line and not added_labor:
                # Add labor/total declarations right after jobId
                new_lines.append(line)
                # Check next few lines for the for loop
                if i + 1 < len(lines) and 'for (var i = 1;' in lines[i+1]:
                    new_lines.append('')
                    new_lines.append('    // V350 Fix: ย้ายตัวแปร total ออกมานอก Scope')
                    new_lines.append("    var labor = Number(data.labor_cost || 0);")
                    new_lines.append("    var total = labor + Number(data.parts_cost || 0);")
                    added_labor = True
            elif in_complete_job and 'var labor = data.labor_cost || 0;' in line:
                # Remove old declaration inside if block
                new_lines.append('')  # keep the line but it will be overwritten below
                line = line.replace('var labor = data.labor_cost || 0;', '// V350: moved outside (labor)')
                new_lines.pop()
                new_lines.append(line)
            elif in_complete_job and 'var total = labor + (data.parts_cost || 0);' in line:
                line = line.replace('var total = labor + (data.parts_cost || 0);', '// V350: moved outside (total)')
                new_lines.append(line)
            else:
                new_lines.append(line)
        
        jh = '\n'.join(new_lines)
        with open(jh_path, 'w', encoding='utf-8') as f:
            f.write(jh)
        print('FIX 4: completeJob() scope fix applied')
    else:
        print('FIX 4: Pattern not found - checking manually...')
        for line in jh.split('\n'):
            if 'labor' in line and 'completeJob' not in line:
                print('  Found:', line.strip()[:100])

print('\n=== V350 Hotfix Complete ===')
