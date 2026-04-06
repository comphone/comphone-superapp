#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Fix corrupted Thai text in Router.js getDashboardSummary + remove duplicate functions"""

path = 'C:/Users/Server/.openclaw/workspace/Shop_vnext/src/Router.js'

with open(path, 'r', encoding='utf-8') as f:
    h = f.read()

# Fix getDashboardSummary - replace corrupted Thai with correct
old_summary = """function getDashboardSummary() {
  try {
    var ss = getComphoneSheet();
    var js = findSheetByName(ss, 'DBJOBS');
    var inv = findSheetByName(ss, 'DB_INVENTORY');
    var p=0,c=0,ip=0,ls=0,ti=0;
    if(js){var j=js.getDataRange().getValues();for(var i=1;i<j.length;i++){if(j[i][3]=='\u0e23\u0e2d\u0e14\u0e33\u0e40\u0e19\u0e34\u0e19\u0e01\u0e32\u0e23')p++;else if(j[i][3]=='InProgress'||j[i][3]=='\u0e01\u0e33\u0e25\u0e31\u0e07\u0e17\u0e33')ip++;else if(j[i][3]=='Completed')c++;}}
    if(inv){var it=inv.getDataRange().getValues();ti=it.length-1;for(var k=1;k<it.length;k++){if(it[k][2]<5)ls++;}}
    return{totalJobs:p+ip+c,pending:p,inProgress:ip,completed:c,totalItems:ti,lowStock:ls,date:Utilities.formatDate(new Date(),'Asia/Bangkok','dd/MM/yyyy HH:mm')};
  } catch(e){return{};}
}"""

new_summary = """function getDashboardSummary() {
  try {
    var ss = getComphoneSheet();
    var js = findSheetByName(ss, 'DBJOBS');
    var inv = findSheetByName(ss, 'DB_INVENTORY');
    var p=0,c=0,ip=0,ls=0,ti=0;
    if(js){var j=js.getDataRange().getValues();for(var i=1;i<j.length;i++){if(j[i][3]==='\u0e23\u0e2d\u0e14\u0e33\u0e40\u0e19\u0e34\u0e19\u0e01\u0e32\u0e23')p++;else if(j[i][3]==='InProgress'||j[i][3].indexOf('\u0e01\u0e33\u0e25\u0e31\u0e07')>-1)ip++;else if(j[i][3]==='Completed')c++;}}
    if(inv){var it=inv.getDataRange().getValues();ti=it.length-1;for(var k=1;k<it.length;k++){if(it[k][2]<5)ls++;}}
    return{totalJobs:p+ip+c,pending:p,inProgress:ip,completed:c,totalItems:ti,lowStock:ls,date:Utilities.formatDate(new Date(),'Asia/Bangkok','dd/MM/yyyy HH:mm')};
  } catch(e){return{};}
}"""

# The corrupted text in the file - let's find it by pattern
# Find getDashboardSummary function and fix the corrupted Thai strings
import re

# Find the getDashboardSummary function and replace it
match = re.search(r'function getDashboardSummary\(\).*?catch\(e\)\{return\{\};\}\n\}', h, re.DOTALL)
if match:
    h = h[:match.start()] + new_summary + h[match.end():]
    print('Fixed getDashboardSummary')
else:
    # Try to find any corrupted Thai text
    corrupted = [
        ('\u0e23\u0e2d\u0e14\u0e33\u0e40\u0e19\u0e34\u0e19\u0e01\u0e32\u0e23', '\u0e23\u0e2d\u0e14\u0e33\u0e40\u0e19\u0e34\u0e19\u0e01\u0e32\u0e23'),
        ('\u0e01\u0e33\u0e25\u0e31\u0e07\u0e17\u0e33', '\u0e01\u0e33\u0e25\u0e31\u0e07\u0e17\u0e33'),
    ]
    for old, new in corrupted:
        if old in h:
            h = h.replace(old, new)
            print(f'Fixed: {old} -> {new}')
    
    # If still not found, search for the corrupted garbled text
    # The garbled version of รอดำเนินการ
    garbled_patterns = [
        '\u0e23\u0e2d\u0e14\u0e33\u0e40\u0e19\u0e34\u0e19\u0e01\u0e32\u0e23',
    ]
    print('Searching for corrupted patterns...')

with open(path, 'w', encoding='utf-8') as f:
    f.write(h)

print('Saved: {} bytes'.format(len(h)))
