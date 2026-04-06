# -*- coding: utf-8 -*-
"""V323 Final — Fix ALL broken onclick patterns"""
import os, subprocess

path = r'C:\Users\Server\.openclaw\workspace\Shop_vnext\src\Index.html'

with open(path, 'r', encoding='utf-8') as f:
    c = f.read()

# The broken pattern: h+="<div ... onclick=\"func('"+val+"')\">"
# The \" inside a double-quoted JS string breaks it.
# Fix: h+='<div ... onclick="func(\''+val+'\')">...'
#     (outer: single-quoted JS string, inner: double-quoted HTML attribute with escaped single-quote JS value)

# === Pattern 1: oSt('"+id+"') ===
old1 = """h+="<div class='b2 bb' onclick=\\"oSt('"+id+"')\\">เปลี่ยนสถานะ</div>";"""
new1 = """h+='<div class="b2 bb" onclick="oSt(\\''+id+'\\')">เปลี่ยนสถานะ</div>';"""

# === Pattern 2: eJob('"+id+"') ===
old2 = """h+="<div class='b2 bx' onclick=\\"eJob('"+id+"')\\">แก้ไข</div>";"""
new2 = """h+='<div class="b2 bx" onclick="eJob(\\''+id+'\\')">แก้ไข</div>';"""

# === Pattern 3: addNote('"+id+"') ===
old3 = """h+="<div class='b2 ba' onclick=\\"addNote('"+id+"')\\">💾 บันทึกหมายเหตุ</div>";"""
new3 = """h+='<div class="b2 ba" onclick="addNote(\\''+id+'\\')">💾 บันทึกหมายเหตุ</div>';"""

# === Pattern 4-7: cSt('"+id+"','status') ===
old4 = """h+="<div class='b2 ba' onclick=\\"cSt('"+id+"','รอดำเนินการ')\\">⏳ รอดำเนินการ</div>";"""
new4 = """h+='<div class="b2 ba" onclick="cSt(\\''+id+'\\',\\'รอดำเนินการ\\')">⏳ รอดำเนินการ</div>';"""

old5 = """h+="<div class='b2 bb' onclick=\\"cSt('"+id+"','InProgress')\\">🔄 กำลังทำ</div>";"""
new5 = """h+='<div class="b2 bb" onclick="cSt(\\''+id+'\\',\\'InProgress\\')">🔄 กำลังทำ</div>';"""

old6 = """h+="<div class='b2 bp' onclick=\\"cSt('"+id+"','Completed')\\">✅ เสร็จสมบูรณ์</div>";"""
new6 = """h+='<div class="b2 bp" onclick="cSt(\\''+id+'\\',\\'Completed\\')">✅ เสร็จสมบูรณ์</div>';"""

old7 = """h+="<div class='b2 bx' onclick=\\"cSt('"+id+"','ยกเลิก')\\">❌ ยกเลิก</div>";"""
new7 = """h+='<div class="b2 bx" onclick="cSt(\\''+id+'\\',\\'ยกเลิก\\')">❌ ยกเลิก</div>';"""

# === Pattern 8: window.open('"+folder+"','_blank') ===
old8 = '''h+="<div class='b2 ba' onclick=\\"window.open('"+j.folder+"','_blank')\\">📁 โฟลเดอร์</div>";'''
new8 = '''h+='<div class="b2 ba" onclick="window.open(\\''+j.folder+'\\',\\'_blank\\')">📁 โฟลเดอร์</div>';'''

# === Pattern 9: addQuickNote2() (may already be fixed) ===
old9 = """h+="<button class='btn' onclick="addQuickNote2()">💾 บันทึก</button>";"""
new9 = """h+="<button class='btn' onclick='addQuickNote2()'>💾 บันทึก</button>";"""

# Apply all fixes
fixes = [
    (old1, new1, "oSt"),
    (old2, new2, "eJob"),
    (old3, new3, "addNote"),
    (old4, new4, "cSt-รอดำเนินการ"),
    (old5, new5, "cSt-InProgress"),
    (old6, new6, "cSt-Completed"),
    (old7, new7, "cSt-ยกเลิก"),
    (old8, new8, "window.open"),
    (old9, new9, "addQuickNote2"),
]

count = 0
for old, new, label in fixes:
    if old in c:
        c = c.replace(old, new)
        count += 1
        print(f"  ✅ FIXED: {label}")
    else:
        print(f"  ℹ️  NOT FOUND: {label}")

# Save
with open(path, 'w', encoding='utf-8') as f:
    f.write(c)

print(f"\nTotal fixes: {count}")
print(f"File size: {os.path.getsize(path)} bytes")

# Verify with Node.js
result = subprocess.run(
    ["node", "-e",
     "const fs=require('fs');const c=fs.readFileSync('C:/Users/Server/.openclaw/workspace/Shop_vnext/src/Index.html','utf8');const m=c.match(/<script>([\\s\\S]*?)<\\/script>/);if(m){try{new Function(m[1]);console.log('JS SYNTAX VALID ✓')}catch(e){console.log('JS ERROR: '+e.message);const lines=e.message.match(/line (\\d+)/);if(lines){const idx=parseInt(lines[1])-1;const ll=m[1].split(String.fromCharCode(10));console.log('  At line '+(idx+1)+': '+(ll[idx]?ll[idx].substring(0,150):''))}}}"],
    capture_output=True, text=True
)
print("\n" + result.stdout.strip())
if result.stderr:
    print("STDERR:", result.stderr[:300])
