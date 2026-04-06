# -*- coding: utf-8 -*-
"""Fix ALL onclick escaping in Index.html"""
import re

path = r'C:\Users\Server\.openclaw\workspace\Shop_vnext\src\Index.html'

with open(path, 'r', encoding='utf-8') as f:
    text = f.read()

# The broken pattern is: onclick=\"func('"+VAR+"')\">"
# where \ and " are real chars in the file (not escapes)
# In the regex: onclick=\\"func\('"+VAR+"'\)\\">
# Because in the source, the literal chars are: o n c l i c k = \ " f u n c ( ' " + V A R + " ' ) \ " >

# Fix using regex
# The pattern: onclick=\"func('"+...+"')\">
# Replace with: onclick='func("'+...+'")'>

# More robust: find and fix each broken pattern
patterns = [
    # onclick=\"oSt('"+id+"')\">  ->  onclick='oSt("'+id+'")'>
    (r"onclick=\\\"oSt\('\\\"\+id\+\"\\'\)\\\">", "onclick='oSt(\"'+id+'\")'>"),
    (r"onclick=\\\\\"oSt\('\"(\+id\+)\"\\'\)\\\\\">", "onclick='oSt(\"'+id+'\")'>"),
]

# Approach: just use str.replace with exact match
fixes_applied = 0

# From the hex dump analysis, the file has these exact characters:
# onclick=\ followed by " followed by funcName( followed by ' followed by " +id+ " followed by ' followed by ) followed by \ followed by " followed by >

# Build search strings using chr() to be 100% precise
bs = chr(92)   # backslash
dq = chr(34)   # double-quote
sq = chr(39)   # single-quote

# old = onclick=\"func('"+VAR+"')\">
# In text: onclick=\  "  func(  '  "  +id+  "  '  )  \  "  >
# = 'onclick=' + bs + dq + 'func(' + sq + dq + '+id+' + dq + sq + ')' + bs + dq + '>'

# Wait - I need to look at what the file ACTUALLY contains.
# From _show.py output, line 178 in the file is literally:
#   h+="<div class='b2 bb' onclick=\"oSt('"+id+"')\">เปลี่ยนสถานะ</div>";
# 
# When Python reads this file, the text it gets is:
# '  h+="<div class=\'b2 bb\' onclick="oSt(\''+id+'\')">...'
# 
# So:
# h+="<div class='b2 bb' onclick=  <- outer string starts with "
# \"  <- backslash + quote = JS escape for literal " 
# oSt('"+id+"')\  <- this would be outside the string!
# 
# NO WAIT. Python is not a JS parser. When Python reads the file,
# the file literally contains the chars: \ " o S t ( ' " + i d + " ' ) \ " >
# Python just reads all these chars as-is.
# 
# So in Python string, the text is:
# h+="<div class='b2 bb' onclick=\"oSt('"+id+"')\">เปลี่ยนสถานะ</div>";
# 
# Which is exactly what Python prints when I do repr(line).
# The backslash and double-quote are real characters.
# 
# When JS parses this code:
# h += "<div class='b2 bb' onclick="  <- string ends at " after onclick=
# Then: oSt('"+id+"')\">  -> ERROR: unexpected identifier 'oSt'
# 
# FIX: I need to change the outer string quotes to single quotes
# OR change the onclick to use single quotes in the HTML

# Let me just do direct string replacement in Python
old_oSt = 'onclick=\\"oSt(\\'' + '"+id+"' + '\\')\\">'
# Let me type this character by character:
# o n c l i c k = \ " o S t ( ' " 
old2 = "onclick=\\\"oSt(\\''\"+id+\"\\'\\)\">"

# Actually I'll just build it from chr calls to avoid any confusion
old3 = (
    'onclick=' + bs + dq +  # onclick=\"
    'oSt(' + sq + dq +       # oSt('"
    '+id+' +                  # +id+
    dq + sq +                 # "')
    ')' + bs + dq +           # )\">
    '>'
)

if old3 in text:
    print(f"FOUND old_oSt (chr-built)")
    new3 = (
        "onclick='" +           # onclick='
        'oSt(' + dq + sq +     # oSt("'
        "+id+" +               # +id+
        sq + dq +              # '")
        ')' + sq +             # )'>
        '>'
    )
    text = text.replace(old3, new3)
    fixes_applied += 1
    print("FIXED: oSt")
else:
    print(f"NOT FOUND: old3 ({len(old3)} chars)")

# Same for eJob
old_eJob = (
    'onclick=' + bs + dq +
    'eJob(' + sq + dq +
    '+id+' +
    dq + sq +
    ')' + bs + dq +
    '>'
)
if old_eJob in text:
    new_eJob = (
        "onclick='" +
        'eJob(' + dq + sq +
        "+id+" +
        sq + dq +
        ')' + sq +
        '>'
    )
    text = text.replace(old_eJob, new_eJob)
    fixes_applied += 1
    print("FIXED: eJob")
else:
    print(f"NOT FOUND: eJob ({len(old_eJob)} chars)")

# addNote
old_add = (
    'onclick=' + bs + dq +
    'addNote(' + sq + dq +
    '+id+' +
    dq + sq +
    ')' + bs + dq +
    '>'
)
if old_add in text:
    new_add = (
        "onclick='" +
        'addNote(' + dq + sq +
        "+id+" +
        sq + dq +
        ')' + sq +
        '>'
    )
    text = text.replace(old_add, new_add)
    fixes_applied += 1
    print("FIXED: addNote")
else:
    print(f"NOT FOUND: addNote ({len(old_add)} chars)")

# window.open - different, has '_blank' and j.folder
old_win = (
    'onclick=' + bs + dq +
    "window.open(" + sq + dq +
    "+j.folder+" +
    dq + sq +
    ",'_blank')" + bs + dq +
    '>'
)
if old_win in text:
    new_win = (
        "onclick='" +
        "window.open(" + dq + sq +
        "+j.folder+" +
        sq + dq +
        ",'_blank')" + sq +
        '>'
    )
    text = text.replace(old_win, new_win)
    fixes_applied += 1
    print("FIXED: window.open")
else:
    print(f"NOT FOUND: window.open ({len(old_win)} chars)")

# addQuickNote2 - simpler, already fixed by previous run
old_qn = 'onclick="' + "addQuickNote2()" + dq + '>'
if old_qn in text:
    text = text.replace(old_qn, "onclick='addQuickNote2()'>")
    fixes_applied += 1
    print("FIXED: addQuickNote2")
else:
    print("ALREADY FIXED or NOT FOUND: addQuickNote2")

# Save
with open(path, 'w', encoding='utf-8') as f:
    f.write(text)

print(f"\nFixes applied: {fixes_applied}")

# Run Node.js verification
import subprocess
result = subprocess.run(
    ['node', '-e', '''
const fs = require('fs');
const c = fs.readFileSync('C:/Users/Server/.openclaw/workspace/Shop_vnext/src/Index.html', 'utf8');
const m = c.match(/<script>([\\s\\S]*?)<\\/script>/);
if (m) {
    try { new Function(m[1]); console.log("SYNTAX: VALID"); }
    catch(e) { console.log("SYNTAX ERROR: " + e.message); }
}
'''],
    capture_output=True, text=True
)
print(result.stdout.strip())
if result.stderr:
    print("STDERR:", result.stderr[:300])
