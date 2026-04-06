# -*- coding: utf-8 -*-
"""V324 Fix - 3 surgical edits to Index.html"""
import io, sys, os, subprocess

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

path = r"C:\Users\Server\.openclaw\workspace\Shop_vnext\src\Index.html"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# ========== SHOW CURRENT STATE ==========
print("=== Checking Index.html ===\n")

# Check for the orphaned h+= line between se() and sr()
orphan = 'h+=\'<div class="b2 ba" onclick="addNote'
orphan_pos = content.find(orphan)
print(f"1. Orphaned h+= addNote: found at position {orphan_pos}")

# Check for duplicate grid
dup_tl = content.count('h+=\'<div class="tl">\'')
print(f"2. Duplicate <div class=\"tl\">: {dup_tl} occurrences (should be 1)")

# Check typo
typo_check = content.count("รอดาเนินการ")
print(f"3. Typo รอดาเนินการ (missing า): {typo_check} occurrences")

# ========== FIX ==========

# FIX 1: Remove orphaned h+= line
# This line floats between se() closing and sr() opening — delete it
content = content.replace(
    '  h+=\'<div class="b2 ba" onclick="addNote(\\\'\'\+ id +\'\\\')">💾 บันทึกหมายเหตุ</div>\';\nfunction sr',
    'function sr'
)
# Also without trailing newline variant
content = content.replace(
    '  h+=\'<div class="b2 ba" onclick="addNote(\\\'\'\+ id +\'\\\')">💾 บันทึกหมายเหตุ</div>\';\n',
    ''
)

# FIX 2: Fix duplicate grid in render()
# The render() function creates stats grid with closing </div></div>';
# Then immediately opens another <div class="tl"> for photo tiles 
# → Merge into ONE grid: close lowStock tile + add 2 photo + close grid

old_dup = """h+='<div class="tt"><div class="n c4">'+(s.lowStock||0)+'</div><div class="l">🚨 สต็อกต่ำ</div></div></div>';
    h+='<div class="tl">';
    h+='<div class="tt"><div class="n" style="color:#6C63FF">'+(s.pendingPhotos||0)+'</div><div class="l">📸 รอดำเนินการ</div></div>';
    h+='<div class="tt"><div class="l" style="color:#6C63FF;cursor:pointer" onclick="processPhotos()">▶️ จัดการรูป</div></div>';
    h+='</div>';"""

new_merged = """h+='<div class="tt"><div class="n c4">'+(s.lowStock||0)+'</div><div class="l">🚨 สต็อกต่ำ</div></div>';
    h+='<div class="tt"><div class="n" style="color:#6C63FF">'+(s.pendingPhotos||0)+'</div><div class="l">📸 รอดำเนินการ</div></div>';
    h+='<div class="tt"><div class="l" style="color:#6C63FF;cursor:pointer" onclick="processPhotos()">▶️ จัดการรูป</div></div>';
    h+='</div>';"""

if old_dup in content:
    content = content.replace(old_dup, new_merged)
    print("\n[Fix] Merged duplicate grid into single 6-tile grid")
else:
    print("\n[Warn] Could not find exact duplicate grid pattern")
    # Try to find what's actually there
    idx = content.find("pendingPhotos")
    if idx > 0:
        ctx_start = max(0, idx - 200)
        ctx_end = min(len(content), idx + 300)
        print("Context around 'pendingPhotos':")
        print(repr(content[ctx_start:ctx_end]))

# FIX 3: Typo รอดาเนินการ → รอดำเนินการ
content = content.replace("'รอดาเนินการ'", "'รอดำเนินการ'")
print("[Fix] Typo: รอดำเนินการ → รอดำเนินการ")

# ========== SAVE ==========
with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print(f"\nSaved: {os.path.getsize(path)} bytes")

# ========== VERIFY ==========
r = subprocess.run(
    ["node", "-e",
     "const fs=require('fs');const c=fs.readFileSync('C:/Users/Server/.openclaw/workspace/Shop_vnext/src/Index.html','utf8');"
     "const m=c.match(/<script>([\\s\\S]*?)<\\/script>/);"
     "if(!m){console.log('NO SCRIPT FOUND');process.exit(1)}"
     "try{new Function(m[1]);console.log('JS SYNTAX VALID ✓')}catch(e){console.log('JS ERROR:',e.message);const lm=e.toString().match(/line (\\d+)/);if(lm){const idx=parseInt(lm[1])-1;const jsLines=m[1].split('\\n');for(let i=Math.max(0,idx-2);i<=Math.min(jsLines.length-1,idx+2);i++){console.log((i===idx?'=>> ':'    ')+'Line '+(i+1)+': '+jsLines[i].substring(0,120))}}}"],
    capture_output=True, text=True
)
print("\n" + r.stdout.strip())
if r.stderr:
    print("STDERR: " + r.stderr[:300])
