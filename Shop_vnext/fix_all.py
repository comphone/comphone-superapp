#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Fix form options and remove Index2.html"""
import os

# 1. Remove Index2.html
p2 = 'C:/Users/Server/.openclaw/workspace/Shop_vnext/src/Index2.html'
if os.path.exists(p2):
    os.remove(p2)
    print('Removed Index2.html')

# 2. Fix Index.htmll
p1 = 'C:/Users/Server/.openclaw/workspace/Shop_vnext/src/Index.html'
with open(p1, 'r', encoding='utf-8') as f:
    h = f.read()

# Fix form options - add </option> tags
old = """h+='<option value="รอดำเนินการ"';if(j.status==='รอดำเนินการ')h+=' selected';h+=' รอดำเนินการ';
h+='<option value="InProgress"';if(j.status==='InProgress')h+=' selected';h+=' กำลังดำเนินการ';
h+='<option value="Completed"';if(j.status==='Completed')h+=' selected';h+=' เสร็จสมบูรณ์';
h+='<option value="ยกเลิก"';if(j.status&&j.status.indexOf('ยก')>-1)h+=' selected';h+=' ยกเลิก';
h+='</select></div>';"""

new = """h+='<option value="รอดำเนินการ"';if(j.status==='รอดำเนินการ')h+=' selected';h+='>รอดำเนินการ</option>';
h+='<option value="InProgress"';if(j.status==='InProgress')h+=' selected';h+='>กำลังดำเนินการ</option>';
h+='<option value="Completed"';if(j.status==='Completed')h+=' selected';h+='>เสร็จสมบูรณ์</option>';
h+='<option value="ยกเลิก"';if(j.status&&j.status.indexOf('ยกเลิก')>-1)h+=' selected';h+='>ยกเลิก</option>';
h+='</select></div>';"""

if old in h:
    h = h.replace(old, new)
    print('Fixed form options')
else:
    print('WARNING: Could not find form options text')

with open(p1, 'w', encoding='utf-8') as f:
    f.write(h)

print('Fixed: {} bytes'.format(len(h)))
