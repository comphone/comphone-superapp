#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Rebuild Router.js with proper UTF-8 Thai encoding"""

# Read current file (it has mojibake from the fix scripts)
path = r'C:\Users\Server\.openclaw\workspace\Shop_vnext\src\Router.js'
with open(path, 'rb') as f:
    raw = f.read()

# The file has double-encoded UTF-8 (mojibake). Let's check if it can be fixed.
# The corrupted text like '\xc3\x83\xc3\x8d\xc2\xb4' should be '\xe0\xb8\xa3\xe0\xb8\xad' etc.

# Let's just verify file size and functions
import re
fns = re.findall(rb'\nfunction (\w+)', raw)
print('Current functions:', len(fns))

# Try to fix mojibake by decoding as cp1252 then re-encoding as utf-8
# This reverses a common double-encoding issue
try:
    text = raw.decode('utf-8')
    # Check if any mojibake exists
    if '?Ã' in text or 'Ã' in text or '?Ãƒ' in text:
        print('Mojibake detected, attempting fix...')
        # Try: utf-8 -> latin-1 -> utf-8
        fixed = text.encode('latin-1', errors='ignore').decode('utf-8', errors='replace')
        with open(path, 'w', encoding='utf-8') as f:
            f.write(fixed)
        print('Fixed')
    else:
        print('No mojibake found - file may be OK')
except:
    print('Cannot decode as UTF-8')

# Check Thai text specifically
# รอดำเนินการ = \xe0\xb8\xa3\xe0\xb8\xad\xe0\xb8\x94\xe0\xb8\xb3\xe0\xb9\x80\xe0\xb8\x99\xe0\xb8\xb4\xe0\xb9\x89\xe0\xb8\x99\xe0\xb8\x81\xe0\xb8\xb2\xe0\xb8\xa3
target = '\u0e23\u0e2d\u0e14\u0e33\u0e40\u0e19\u0e34\u0e19\u0e01\u0e32\u0e23'
if target.encode('utf-8') in raw:
    print('Thai encoding CORRECT in file')
else:
    print('Thai encoding CORRUPTED in file')
    # Show what's there instead
    idx = raw.find(b'ronMorningAlert')
    if idx > 0:
        print('Around cronMorningAlert:', raw[idx:idx+200])
