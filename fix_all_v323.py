# -*- coding: utf-8 -*-
"""V323 - Fix ALL broken lines in Index.html"""
import os

path = r'C:\Users\Server\.openclaw\workspace\Shop_vnext\src\Index.html'

with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

fixes = 0

# PROBLEM 1: Orphaned h+= lines BEFORE function st() (lines ~147-149, 1-based)
# These 3 lines should NOT exist - they're fragments outside any function
# Remove them
new_lines = []
for i, line in enumerate(lines):
    stripped = line.strip()
    # Skip the orphaned h+= lines (they start with h+= and are before function st)
    if stripped.startswith('h+=') and i < 200:
        # Check if this is before the first function definition
        if i < 155:  # before function st(t)
            print(f"  REMOVED orphaned line {i+1}: {stripped[:80]}")
            fixes += 1
            continue
    new_lines.append(line)

lines = new_lines

# Now fix the remaining broken lines by line number
# Map 1-based to 0-based

for i, line in enumerate(lines):
    stripped = line.strip()
    
    # Fix: window.open broken quoting (was: onclick=""window.open...)
    if 'onclick=""window.open' in line or ('onclick=' + chr(34) + chr(34) + 'window.open') in line:
        lines[i] = """  if(j.folder)h+="<div class='b2 ba' onclick='window.open(\""+j.folder+"\",\"_blank\")'>📁 โฟลเดอร์</div>\";\n"""
        print(f"  FIXED window.open at line {i+1}")
        fixes += 1
    
    # Fix: oSt function - cSt buttons broken
    if 'h+=\'<div class=' in line and 'onclick="cSt(' in line:
        # Pattern: h+='<div class='b2 ba' onclick="cSt(\'"+id+"','รอดำเนินการ')">...</div>';
        # Fix: h+="<div class=\"b2 ba\" onclick=\"cSt('"+id+"','รอดำเนินการ')\">...</div>";
        
        # Extract the function args and text content
        import re
        # Match: h+='<div class='XX XX' onclick="cSt(\''+id+\','YY')">ZZ</div>';
        m = re.search(r'h\+='.encode(), stripped.encode())  # just check it exists
        # Replace single quotes in class attr with double quotes
        new_line = line.replace("h+='<div class='", "h+=\"<div class=\"")
        # Fix the onclick: change onclick="cSt(\' to onclick="cSt('
        new_line = new_line.replace("onclick=\"cSt(\\'", "onclick=\"cSt('")
        # Fix: ',' -> ',' (keep)
        # Fix: ')">  to  ')\">
        # This is getting complex - let me just write the correct lines directly
        if "'รอดำเนินการ')" in line:
            lines[i] = "  h+=\"<div class='b2 ba' onclick=\\\"cSt('\"+id+\"','รอดําเนินการ')\\\">\u23f3 \u0e23\u0e2d\u0e14\u0e33\u0e40\u0e19\u0e34\u0e19\u0e01\u0e32\u0e23</div>\";\n"
        elif "'InProgress')" in line:
            lines[i] = "  h+=\"<div class='b2 bb' onclick=\\\"cSt('\"+id+\"','InProgress')\\\">\ud83d\udd04 \u0e01\u0e33\u0e25\u0e31\u0e07\u0e17\u0e33</div>\";\n"
        elif "'Completed')" in line:
            lines[i] = "  h+=\"<div class='b2 bp' onclick=\\\"cSt('\"+id+\"','Completed')\\\">\u2705 \u0e40\u0e2a\u0e23\u0e47\u0e08\u0e2a\u0e21\u0e1a\u0e39\u0e23\u0e13\u0e4c</div>\";\n"
        elif "'ยกเลิก')" in line:
            lines[i] = "  h+=\"<div class='b2 bx' onclick=\\\"cSt('\"+id+\"','\u0e22\u0e01\u0e40\u0e25\u0e34\u0e01')\\\">\u274c \u0e22\u0e01\u0e40\u0e25\u0e34\u0e01</div>\";\n"
        else:
            # Generic fix: change outer ' to " and inner escapes
            new_line = line.replace("h+='<div class='", 'h+="<div class="')
            lines[i] = new_line
        fixes += 1
        print(f"  FIXED cSt at line {i+1}")
    
    # Fix: eJob function - sv button broken
    if 'onclick=\'sv("' in line and "arg1" in line:
        lines[i] = "  h+=\"<button class='btn' onclick='sv('\"+id+\"')'>💾 \u0e1a\u0e31\u0e19\u0e17\u0e36\u0e01</button>\";\n"
        print(f"  FIXED sv at line {i+1}")
        fixes += 1

# Write back
with open(path, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print(f"\nTotal fixes: {fixes}")
print(f"File size: {os.path.getsize(path)} bytes")

# Verify
import subprocess
result = subprocess.run(
    ['node', '-e',
     'const fs=require("fs");const c=fs.readFileSync("C:/Users/Server/.openclaw/workspace/Shop_vnext/src/Index.html","utf8");'
     'const m=c.match(/<script>([\\s\\S]*?)<\\/script>/);'
     'if(m){try{new Function(m[1]);console.log("JS SYNTAX VALID")}catch(e){console.log("JS ERROR: "+e.message)}}'],
    capture_output=True, text=True
)
print(result.stdout.strip())
if result.stderr:
    print("STDERR:", result.stderr[:200])
