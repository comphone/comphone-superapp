# -*- coding: utf-8 -*-
"""V323 Final Fix — precise byte-level replacement"""
import os, re

path = r'C:\Users\Server\.openclaw\workspace\Shop_vnext\src\Index.html'

with open(path, 'rb') as f:
    raw = f.read()

# From hex dump of line 178:
# onclick = 6f 6e 63 6c 69 63 6b
# = 3d
# \" = 5c 22  <- THIS is the problem!
# oSt(' = 6f 53 74 28 27
# "+id+" = 22 2b 69 64 2b 22
# ')\">" = 27 29 5c 22 ...
#
# The 5c 22 sequence means backslash + quote.
# In JS: h+="<div onclick=\"oSt('"+id+"')\">"
# The JS parser: string starts at ", then sees \", produces literal "
# BUT then +id+ continues... wait, let me parse carefully:
#
# The FULL line is (from hex):
# 20 20 68 2b 3d 22 ... 3d 5c 22 6f 53 74 ...
#   = "  h  +  =  "  ...  =  \  "  o  S  t ...
#
# So h += " starts a string. The string reads until the next unescaped ".
# The \ " is escaped, so it CONTINUES the string with a literal "
# Then: oSt('"+id+"')\"> 
# Wait... the second " in "+id+" would END the string!
# Because after the first \" (literal "), the next 22 (" from "+id+") ends it!
# So: string = '<div class=\'b2 bb\' onclick="'
# Outside string: "+id+"')\">เปลี่ยนสถานะ</div>";
# The " is concat, id is identifier, then + ends concat, then "+id+"')\">  
# Hmm, it's actually: '+id+"' -- the first " ends the string,
# then +id+ is expression, then "' is...
#
# Let me just fix all the broken lines by replacing the raw bytes.

BACKSLASH = b'\\'  # raw backslash byte
QUOTE = b'"'       # raw double-quote byte
SQUOTE = b"'"      # raw single-quote byte

# Pattern: onclick=\"func('"+VAR+"')\">"
# Bytes: ...onclick=" oSt(' "+id+" ')" ...
# where \" = backslash + quote = BS+DQ

# Build the broken patterns as raw bytes
def broken(func, varExpr):
    """Build the broken onclick pattern as bytes"""
    # onclick=\"func('"+VAR+"')\">
    return b'onclick=' + BACKSLASH + QUOTE + func.encode() + b'(' + SQUOTE + QUOTE + b'+' + varExpr + b'+' + QUOTE + SQUOTE + b')' + BACKSLASH + QUOTE + b'">'

def fixed(func, varExpr):
    """Build the fixed onclick pattern as bytes"""
    # onclick='func("'+VAR+'")'>
    return b"onclick='" + func.encode() + b'(' + QUOTE + SQUOTE + b'+' + varExpr + b'+' + SQUOTE + QUOTE + b')' + SQUOTE + b"'>"

fixes = [
    (broken('oSt', b'id'), fixed('oSt', b'id'), 'oSt'),
    (broken('eJob', b'id'), fixed('eJob', b'id'), 'eJob'),
    (broken('addNote', b'id'), fixed('addNote', b'id'), 'addNote'),
    (broken('window.open', b'j.folder'), fixed('window.open', b'j.folder'), 'window.open'),
]

count = 0
for old, new, label in fixes:
    if old in raw:
        raw = raw.replace(old, new)
        count += 1
        print(f"  FIXED: {label}")
    else:
        print(f"  NOT FOUND: {label}")
        # Debug: show what's near the function name
        kw = func_name = label.replace('window.open', 'window').encode()
        if kw in raw:
            idx = raw.find(kw)
            before = raw[max(0,idx-15):idx]
            after = raw[idx:idx+20]
            print(f"    Found {kw} at {idx}")
            print(f"    Before: {before}")
            print(f"    After: {after}")

# Fix addQuickNote2 - different pattern (no backslash, just raw ")
# onclick="addQuickNote2()"> inside h+="..."
old_qn = b'onclick="addQuickNote2()">'
new_qn = b"onclick='addQuickNote2()'>"
if old_qn in raw:
    raw = raw.replace(old_qn, new_qn)
    count += 1
    print(f"  FIXED: addQuickNote2")
else:
    # Check if already fixed
    if b"onclick='addQuickNote2()'>" in raw:
        print(f"  OK: addQuickNote2 already fixed")
    else:
        print(f"  NOT FOUND: addQuickNote2")

# Save
with open(path, 'wb') as f:
    f.write(raw)

print(f"\nTotal fixes: {count}")
print(f"File size: {os.path.getsize(path)} bytes")

# Verify
with open(path, 'rb') as f:
    text = f.read().decode('utf-8')

lines = text.split('\n')
bad = 0
for i, line in enumerate(lines, 1):
    if 'onclick=\\' + '"' in line and 'h+="<' in line and i >= 170 and i <= 190:
        # Check: does this have h+=" followed by ... onclick=\" (which in the string is onclick=literal"
        if 'h+="' in line:
            print(f"  ❌ POSSIBLY BROKEN line {i}: {line[:100]}")
            bad += 1

print(f"\n  Lines checked for issues. Potentially broken: {bad}")
if bad == 0:
    print("  🎉 ALL CHECKS PASSED!")
