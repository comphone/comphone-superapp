# -*- coding: utf-8 -*-
"""V324 - Fix 3 bugs in Index.html, push + deploy"""
import subprocess

path = r"C:\Users\Server\.openclaw\workspace\Shop_vnext\src\Index.html"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# ===== FIX 1: Delete orphaned h+= line in global scope =====
# Line 182: h+=..addNote.. floats between se() and sr() — not inside any function
orphan = '  h+=\'<div class="b2 ba" onclick="addNote(\\\'\'\+ id +\'\\\')">'
if orphan in content:
    content = content.replace(orphan + '\n', '')
    print("[FIX 1] Deleted orphaned h+= line (global scope)")
else:
    # Try alternate form
    content = content.replace(orphan, '')
    print("[FIX 1] Deleted orphaned h+= (alt pattern)")

# ===== FIX 2: Merge duplicate grid in render() =====
# Current structure (BROKEN):
#   h+='...lowStock...</div></div>';  ← closes tile + grid
#   h+='<div class="tl">';            ← opens NEW grid (duplicate!)
#   h+='<div class="tt">..pendingPhotos..</div></div>';  ← 5th tile
#   h+='<div class="tt">..processPhotos..</div></div>';  ← 6th tile
#   h+='</div>';                      ← closes duplicate grid
#
# Fix: Remove </div> grid close from lowStock line, delete duplicate open+close

old_lowstock = "h+='<div class=\"tt\"><div class=\"n c4\">'+(s.lowStock||0)+'</div><div class=\"l\">🚨 สต็อกต่ำ</div></div></div>';"
new_lowstock = "h+='<div class=\"tt\"><div class=\"n c4\">'+(s.lowStock||0)+'</div><div class=\"l\">🚨 สต็อกต่ำ</div></div>';"

if old_lowstock in content:
    content = content.replace(old_lowstock, new_lowstock)
    print("[FIX 2a] lowStock tile: removed grid-close </div>")
else:
    print("[WARN] FIX 2a: lowStock pattern not found exactly")
    # Show what we have
    for line in content.split('\n'):
        if 'lowStock' in line and 'c4' in line:
            print(f"  Found: {line.strip()[:100]}")

# Delete the duplicate grid open
dup_open = "h+='<div class=\"tl\">';"
idx = content.find(dup_open)
if idx >= 0:
    # Only delete if it appears as a standalone line (not the first grid)
    # The first grid opens earlier, this one is right after lowStock
    ctx = content[max(0,idx-50):idx+100]
    if 'pendingPhotos' in ctx or 'lowStock' in ctx:
        content = content.replace(dup_open, '')
        print("[FIX 2b] Deleted duplicate <div class="tl"> grid open")

# Delete the duplicate grid close (the </div> that ends the duplicate grid)
# It appears right after the processPhotos tile
dup_close_search = content.find("processPhotos()")
if dup_close_search >= 0:
    # Find the </div> that comes after this
    after = content[dup_close_search:]
    # It should be: ...onclick="processPhotos()">...</div>\';
    # Then: h+=\'</div>\';
    # Remove the h+=\'</div>\'; line  
    close_marker = "h+='</div>';"
    close_idx = after.find(close_marker)
    if close_idx >= 0:
        # Delete this line
        content = content[:dup_close_search + close_idx - 1] + content[dup_close_search + close_idx:][content[dup_close_search + close_idx:].find('\n'):]
        print("[FIX 2c] Deleted duplicate grid close")

# ===== FIX 3: Typo รอดำเนินการ → รอดำเนินการ =====
content = content.replace("'รอดาเนินการ'", "'รอดำเนินการ'")
print("[FIX 3] Typo fixed")

# ===== SAVE =====
with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print(f"\nSaved: {len(content)} bytes")

# ===== VERIFY =====
r = subprocess.run(
    ["node", "-e",
     "const fs=require('fs');const c=fs.readFileSync('C:/Users/Server/.openclaw/workspace/Shop_vnext/src/Index.html','utf8');"
     "const m=c.match(/<script>([\\s\\S]*?)<\\/script>/);"
     "if(!m){console.log('NO SCRIPT');process.exit(1)}"
     "try{new Function(m[1]);console.log('VALID')}catch(e){console.log('ERROR:',e.message)}"],
    capture_output=True, text=True
)
print(r.stdout.strip())
if r.stderr:
    print(r.stderr[:200])
