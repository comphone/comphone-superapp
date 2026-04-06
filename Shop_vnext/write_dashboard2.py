#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Write DashboardCode.gs with proper UTF-8 Thai encoding"""

# Use actual Thai characters directly in the string
รอดำเนินการ = 'รอดำเนินการ'
กำลังทำ = 'กำลังทำ'
ยกเลิก = 'ยกเลิก'
status_label = 'สถานะ'
station = 'สถาน'
เวลาสร้าง = 'เวลาสร้าง'
ลิงก์โฟลเดอร์ = 'ลิงก์โฟลเดอร์'

code = f'''// ============================================================
// DashboardCode.gs — Dashboard UI + Data APIs
// ============================================================

function doGet(e) {{
  var action = (e && e.parameter && e.parameter.action) || '';
  if (action === 'json') {{
    var result = {{
      success: true,
      jobs: getDashboardJobs(),
      inventory: getDashboardInventory(),
      summary: getDashboardSummary()
    }};
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  }}
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Comphone Dashboard')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0');
}}

function getDashboardData() {{
  return {{
    success: true,
    jobs: getDashboardJobs(),
    inventory: getDashboardInventory(),
    summary: getDashboardSummary()
  }};
}}

function getDashboardJobs() {{
  try {{
    var ss = getComphoneSheet();
    var sheet = findSheetByName(ss, 'DBJOBS');
    if (!sheet) return [];
    var all = sheet.getDataRange().getValues();
    var headerRow = all[0];
    var statusCol = 3, createdCol = 9, folderCol = 12;
    for (var hi = 0; hi < headerRow.length; hi++) {{
      var h = String(headerRow[hi]);
      if (h.indexOf('{status_label}') > -1 || h.indexOf('{station}') > -1) statusCol = hi;
      if (h.indexOf('{เวลาสร้าง}') > -1) createdCol = hi;
      if (h.indexOf('folder') > -1 || h.indexOf('{ลิงก์โฟลเดอร์}') > -1) folderCol = hi;
    }}
    var jobs = [];
    for (var i = all.length - 1; i >= 1 && i >= all.length - 50; i--) {{
      var status = String(all[i][statusCol] || '');
      jobs.push({{
        id: String(all[i][0] || ''),
        customer: String(all[i][1] || ''),
        symptom: String(all[i][2] || ''),
        status: status,
        tech: String(all[i][4] || '-'),
        created: all[i][createdCol] ? Utilities.formatDate(new Date(all[i][createdCol]), 'Asia/Bangkok', 'dd/MM HH:mm') : '-',
        folder: String(all[i][folderCol] || '')
      }});
    }}
    return jobs;
  }} catch(e) {{ return []; }}
}}

function getDashboardInventory() {{
  try {{
    var ss = getComphoneSheet();
    var sheet = findSheetByName(ss, 'DB_INVENTORY');
    if (!sheet) return [];
    var all = sheet.getDataRange().getValues();
    var items = [];
    for (var i = 1; i < all.length; i++) {{
      items.push({{
        code: String(all[i][0] || ''),
        name: String(all[i][1] || ''),
        qty: Number(all[i][2] || 0),
        price: Number(all[i][4] || 0),
        alert: Number(all[i][2] || 0) < 5
      }});
    }}
    return items;
  }} catch(e) {{ return []; }}
}}

function getDashboardSummary() {{
  try {{
    var ss = getComphoneSheet();
    var jobSheet = findSheetByName(ss, 'DBJOBS');
    var invSheet = findSheetByName(ss, 'DB_INVENTORY');
    var pending = 0, completed = 0, inProgress = 0;
    var lowStock = 0, totalItems = 0;

    if (jobSheet) {{
      var jobs = jobSheet.getDataRange().getValues();
      var headerRow = jobs[0];
      var statusCol = 3;
      for (var hi = 0; hi < headerRow.length; hi++) {{
        var h = String(headerRow[hi]);
        if (h.indexOf('{status_label}') > -1 || h.indexOf('{station}') > -1) {{ statusCol = hi; break; }}
      }}
      for (var i = 1; i < jobs.length; i++) {{
        var status = String(jobs[i][statusCol]);
        if (status.indexOf('{รอดำเนินการ}') === 0) pending++;
        else if (status === 'InProgress' || status.indexOf('{กำลังทำ}') === 0) inProgress++;
        else if (status === 'Completed') completed++;
      }}
    }}

    if (invSheet) {{
      var items = invSheet.getDataRange().getValues();
      totalItems = items.length - 1;
      for (var j = 1; j < items.length; j++) {{
        if (Number(items[j][2] || 0) < 5) lowStock++;
      }}
    }}

    return {{
      totalJobs: pending + inProgress + completed,
      pending: pending,
      inProgress: inProgress,
      completed: completed,
      totalItems: totalItems,
      lowStock: lowStock,
      date: Utilities.formatDate(new Date(), 'Asia/Bangkok', 'dd/MM/yyyy HH:mm')
    }};
  }} catch(e) {{
    return {{ totalJobs:0, pending:0, inProgress:0, completed:0, totalItems:0, lowStock:0, date:'error' }};
  }}
}}
'''

path = r'C:\Users\Server\.openclaw\workspace\Shop_vnext\src\DashboardCode.gs'
with open(path, 'w', encoding='utf-8') as f:
    f.write(code)

print(f'Written {len(code)} bytes to DashboardCode.gs')

# Verify Thai encoding
with open(path, 'rb') as f:
    raw = f.read()
    target = 'รอดำเนินการ'.encode('utf-8')
    if target in raw:
        print('Thai encoding: CORRECT')
    else:
        print('Thai encoding: FAILED')
        print('Looking for:', target)
