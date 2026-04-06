# -*- coding: utf-8 -*-
"""V323 Final Fix — Fix onclick escaping in Index.html"""
import os, re

path = os.path.join(os.path.dirname(os.path.abspath('.')), 'Server', '.openclaw', 'workspace', 'Shop_vnext', 'src', 'Index.html')
# Actually let me use absolute path
path = r'C:\Users\Server\.openclaw\workspace\Shop_vnext\src\Index.html'

with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Print line 178 raw (0-indexed: 177)
print("=== Raw bytes around line 178 ===")
for i in [177, 178, 179, 183]:
    if i < len(lines):
        line = lines[i]
        # Show first 100 chars with repr
        print(f"  Line {i+1}:")
        chunk = line[:100].rstrip('\r\n')
        print(f"    Text: {chunk}")
        print(f"    Bytes: {' '.join(f'{ord(c):02x}' for c in chunk[:50])}")

# The approach: use regex to find the specific bad patterns
# They all have: onclick=\"func('"+id+"')\"> (backslash-quote in the file)
# We need to: h+="<div ... onclick=\"...  ->  h+='<div ... onclick="...'

# Actually the simplest fix: convert each problematic line from double-quoted to single-quoted h+
# h+="<div onclick=\"func('"+val+"')\">"  ->  h+='<div onclick="func(\''+val+'\')">'

# Let me build the exact replacement by reading actual bytes
print("\n=== Applying fixes ===")

content = ''.join(lines)

# The file literally contains these exact byte sequences.
# Let me check what the actual bytes are at line 178
line178 = lines[177] if len(lines) > 177 else ''
print(f"Line 178 length: {len(line178)}")

# Find the position of 'onclick' in line 178
onclick_pos = line178.find('onclick')
if onclick_pos >= 0:
    snippet = line178[onclick_pos:onclick_pos+50]
    print(f"onclick snippet bytes: {' '.join(f'{ord(c):02x}' for c in snippet)}")
    print(f"onclick snippet text: {repr(snippet)}")

# Now I understand. The file has literal \ and " as separate characters where you see \"
# In Python reading, \ is just \ and " is just "
# So: h+="<div class='b2 bb' onclick=\"oSt('"+id+"')\">เปลี่ยนสถานะ</div>";
# 
# When Python reads this file:
# h+="<div class='b2 bb' onclick=\"oSt('"+id+"')\">เปลี่ยนสถานะ</div>";
# The \ is literal char 0x5C, " is literal char 0x22
#
# In JS parsing, this string starts with " at h+="<div...
# Then at onclick=, the next \" is parsed as escaped " -> literal " char
# But in the JS source, the parser at " sees end of string!
# Wait no: h+="<div...  The " after += starts the string.
# Then it reads: <div class='b2 bb' onclick=
# Then \" -> this is backslash + quote in source. JS parser sees \", which means literal "
# The string continues: <div class='b2 bb' onclick="
# Then: oSt('"+id+"')\">  -> this is OUTSIDE the string because the " from \" closed it!
# 
# EXACTLY. The \" in a JS string literal produces a literal " INSIDE the string.
# But the JS engine doesn't know this is supposed to be HTML. When it encounters \"
# in the source code h+="<div onclick=\"...", it parses:
# 1. `h += "<div class='b2 bb' onclick="`  -- the string, \" produced literal "
# 2. Then `oSt(` is the next token, not in string -> ERROR: unexpected identifier
#
# FIX: Change quoting so the outer string delimiters don't conflict.
# Option A: Use template literal: h+=`<div class='b2 bb' onclick="oSt('${id}')">...</div>`
# Option B: Use single-quoted outer: h+='<div class="b2 bb" onclick="oSt(\''+id+'\')">', 

# Let me do Option A - template literals are cleanest

# For line 178, I need to find the exact text and replace it
# The file contains: h+="<div class='b2 bb' onclick=\"oSt('"+id+"')\">เปลี่ยนสถานะ</div>";
# Note: the \ and " are literal characters in the file

# Let me search for it
search178 = "h+=\"<div class='b2 bb' onclick=\\\"oSt('\"+id+\"')\\\">เปลี่ยนสถานะ</div>\";"
if search178 in content:
    print("FOUND old178!")
    pos = content.find(search178)
    print(f"  At position: {pos}")
    # Show context
    print(f"  Before: ...{repr(content[max(0,pos-20):pos])}")
    print(f"  After: ...{repr(content[pos+len(search178):pos+len(search178)+20])}")
else:
    print("NOT FOUND: old178")
    # Try to find substring
    sub = "onclick=\\\"oSt"
    idx = content.find(sub)
    if idx >= 0:
        print(f"  Found '{sub}' at {idx}")
        print(f"  Context: {repr(content[idx:idx+60])}")
    else:
        print(f"  Even '{sub}' not found!")
        # Print actual chars around onclick on line 178
        chunk = line178
        for j in range(len(chunk)):
            if chunk[j:j+6] == 'onclick':
                context = chunk[max(0,j-5):j+45]
                print(f"  Raw around onclick: {repr(context)}")
                print(f"  Bytes: {' '.join(f'{ord(c):04x}' for c in context[:40])}")
                break
