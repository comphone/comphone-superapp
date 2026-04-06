#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Fix Thai encoding in Router.js and restore doGet"""

path = r'C:\Users\Server\.openclaw\workspace\Shop_vnext\src\Router.js'

with open(path, 'r', encoding='utf-8', errors='replace') as f:
    content = f.read()

# Replace corrupted Thai text with correct UTF-8 Thai
# รอดำเนินการ
content = content.replace('\u0e23\u0e2d\u0e14\u0e33\u0e40\u0e19\u0e34\u0e19\u0e01\u0e32\u0e23', 'รอดำเนินการ')
# ลูกค้าใหม่  
content = content.replace('\u0e25\u0e39\u0e01\u0e04\u0e49\u0e32\u0e43\u0e2b\u0e21\u0e48', 'ลูกค้าใหม่')
# อาการไม่ระบุ
content = content.replace('\u0e2d\u0e32\u0e01\u0e32\u0e23\u0e44\u0e21\u0e48\u0e23\u0e30\u0e1a\u0e38', 'อาการไม่ระบุ')
# เปิดงาน สำเร็จ
content = content.replace('\u0e40\u0e1b\u0e34\u0e14\u0e07\u0e32\u0e19', 'เปิดงาน')
content = content.replace('\u0e2a\u0e33\u0e40\u0e23\u0e47\u0e08', 'สำเร็จ')
# ไม่พบบลูกค้า
content = content.replace('\u0e44\u0e21\u0e48\u0e21\u0e35\u0e07\u0e32\u0e19\u0e43\u0e19\u0e23\u0e30\u0e1a\u0e1a', 'ไม่มีงานในระบบ')
# แก้ไข
content = content.replace('\u0e41\u0e01\u0e49\u0e44\u0e02', 'แก้ไข')
# บันทึก
content = content.replace('\u0e1a\u0e31\u0e19\u0e17\u0e36\u0e01', 'บันทึก')
# กำลังเดินทาง
content = content.replace('\u0e01\u0e33\u0e25\u0e31\u0e07\u0e40\u0e14\u0e34\u0e19\u0e17\u0e32\u0e07', 'กำลังเดินทาง')
# ถึงสถานที่
content = content.replace('\u0e16\u0e36\u0e01\u0e2a\u0e16\u0e32\u0e19\u0e17\u0e35\u0e48', 'ถึงสถานที่')
# เริ่มงาน
content = content.replace('\u0e40\u0e23\u0e34\u0e48\u0e21\u0e07\u0e32\u0e19', 'เริ่มงาน')
# เสร็จงาน
content = content.replace('\u0e40\u0e2a\u0e23\u0e47\u0e08\u0e07\u0e32\u0e19', 'เสร็จงาน')

# Add doGet back at top (after doPost function)
# Find first function that's not doPost
import re
match = re.search(r'\n// ---------- ACTION HANDLERS ----------', content)
if match:
    # Insert doGet before ACTION HANDLERS
    doget_code = '''
function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || '';
  
  if (action === 'json') {
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      jobs: getDashboardJobs(),
      inventory: getDashboardInventory(),
      summary: getDashboardSummary()
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  return serveDashboard();
}

function serveDashboard() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Comphone Super App — Dashboard')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0');
}

'''
    content = content[:match.start()] + doget_code + content[match.start():]
    print('Added doGet + serveDashboard')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Fixed Router.js: {} bytes'.format(len(content)))

# Verify
fns = re.findall(r'\nfunction (\w+)', content)
print('Functions:', len(fns))
for fn in fns:
    print(' -', fn)
    