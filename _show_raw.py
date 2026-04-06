# -*- coding: utf-8 -*-
"""V323 - Fix onClick escaping with raw byte-level replacement.
Problem: In JS file, lines like:
    h+="<div onclick=\"oSt('"+id+"')\">"
The \" inside a double-quoted JS string makes the " literal, ending the string.
Fix: swap to single-quoted outer string.
"""

path = r'C:\Users\Server\.openclaw\workspace\Shop_vnext\src\Index.html'

with open(path, 'rb') as f:
    data = f.read()

text = data.decode('utf-8')

# Show the exact characters around the problematic patterns
for keyword in ['oSt(', 'eJob(', 'addNote(', 'addQuickNote2']:
    idx = text.find(keyword)
    while idx >= 0:
        before = text[max(0,idx-25):idx]
        after = text[idx:idx+70]
        print(f"Found '{keyword}' at {idx}")
        print(f"  Before: {repr(before)}")
        print(f"  After:  {repr(after)}")
        print()
        idx = text.find(keyword, idx + len(keyword))
