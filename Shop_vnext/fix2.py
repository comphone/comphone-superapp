#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import os

p1 = 'C:/Users/Server/.openclaw/workspace/Shop_vnext/src/Index.html'
p2 = 'C:/Users/Server/.openclaw/workspace/Shop_vnext/src/Index2.html'
if os.path.exists(p2):
    os.remove(p2)
    print('Removed Index2.html')

with open(p1, 'r', encoding='utf-8') as f:
    h = f.read()

# Fix missing </option> tags and > after selected
h = h.replace("h+='รอดำเนินการ';\nh+='<option value=\"InProgress\"'", "h+='>รอดำเนินการ</option>';\nh+='<option value=\"InProgress\"'")
h = h.replace("h+='กำลังดำเนินการ';\nh+='<option value=\"Completed\"'", "h+='>กำลังดำเนินการ</option>';\nh+='<option value=\"Completed\"'")
h = h.replace("h+='เสร็จสมบูรณ์';\nh+='<option value=\"ยกเลิก\"'", "h+='>เสร็จสมบูรณ์</option>';\nh+='<option value=\"ยกเลิก\"'")
h = h.replace("h+='ยกเลิก';\nh+='</select></div>'", "h+='>ยกเลิก</option>';\nh+='</select></div>'")

with open(p1, 'w', encoding='utf-8') as f:
    f.write(h)

print('Fixed: {} bytes'.format(len(h)))
