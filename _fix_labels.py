# -*- coding: utf-8 -*-
import os, subprocess

path = r"C:\Users\Server\.openclaw\workspace\Shop_vnext\src\Index.html"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Fix 1: First cSt — should be "รอดาเนินการ" with class ba
content = content.replace(
    """`<div class="b2 bx" onclick="cSt(${JSON.stringify(id)},'cancel')">cancel</div>`""",
    """`<div class="b2 ba" onclick="cSt(${JSON.stringify(id)},'รอดาเนินการ')">รอดาเนินการ</div>`""",
    1  # only first occurrence
)

# Fix 2: Last cSt — should be "ยกเลิก"  (2nd occurrence of cancel)
content = content.replace(
    """`<div class="b2 bx" onclick="cSt(${JSON.stringify(id)},'cancel')">cancel</div>`""",
    """`<div class="b2 bx" onclick="cSt(${JSON.stringify(id)},'ยกเลิก')">ยกเลิก</div>`""",
    1  # only first occurrence — this is the 2nd one now
)

# Fix 3: save() -> sv()  (the function name is sv, not save)
content = content.replace(
    """onclick="save(${JSON.stringify(id)})">save</button>""",
    """onclick="sv(${JSON.stringify(id)})">บันทึก</button>"""
)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("Fixed labels")

# Verify
r = subprocess.run(
    ["node", "-e",
     "const fs=require('fs');const c=fs.readFileSync('C:/Users/Server/.openclaw/workspace/Shop_vnext/src/Index.html','utf8');"
     "const m=c.match(/<script>([\\s\\S]*?)<\\/script>/);"
     "try{new Function(m[1]);console.log('VALID')}catch(e){console.log('ERROR:',e.message)}"],
    capture_output=True, text=True
)
print(r.stdout.strip())
if r.stderr:
    print(r.stderr[:200])
