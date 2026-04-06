#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Refactor Router.js into Multi-File Architecture (V309)"""

import re

path = r'C:\Users\Server\.openclaw\workspace\Shop_vnext\src\Router.js'
with open(path, 'r', encoding='utf-8', errors='replace') as f:
    content = f.read()

# ============================================================
# 1. Fix Thai encoding in Router.js (replace mojibake)
# ============================================================
# Read raw bytes to see what's actually there
with open(path, 'rb') as f:
    raw = f.read()

# The mojibake patterns found:
# รอดำเนินการ should be: \xe0\xb8\xa3\xe0\xb8\xad\xe0\xb8\xb4\xe0\xb8\xb3\xe0\xb9\x80\xe0\xb8\x99\xe0\xb8\xb4\xe0\xb9\x89\xe0\xb8\x81\xe0\xb8\xa3
# กำลังทำ should be: \xe0\xb8\x81\xe0\xb8\xb3\xe0\xb8\xa5\xe0\xb8\xb1\xe0\xb8\x81\xe0\xb8\xb3\xe0\xb9\x80\xe0\xb8\xa7\xe0\xb8\x99\xe0\xb8\xa5\xe0\xb8\xb3
# ลูกค้าใหม่ should be: \xe0\xb8\xa5\xe0\xb8 xb9\xe0\xb8\x81\xe0\xb8\x84\xe0\xb9\x89\xe0\xb8\xb2\xe0\xb9\x83\xe0\xb8\xab\xe0\xb8\x81\xe0\xb9\x88
# etc.

# Read with latin-1 to preserve bytes, then try to fix
text = raw.decode('latin-1')

# Fix common double-encoding patterns
fixes = {
    # รอดำเนินการ
    '\xc3\xa3\xc2\xad\xc2\xb4\xc3\xa4\xc2\xb9\xc3\x94\xc2\xb9\xc2\xa1\xc3\x92\xc3\xa3\xc2': 'รอดำเนินการ',
    # ลูกค้าใหม่
    '\xc3\xa5\xc2\xa5\xc2\x81\xc2\xa4\xc3\xa7': 'ลูกค้าใหม่',
}

# Since we can't easily fix the mojibake, let's rebuild from scratch
# with correct Thai encoding in all files

print('Current file:', len(raw), 'bytes')
print('Functions:', len(re.findall(rb'\nfunction (\w+)', raw)))

# Now create the 5+ files from scratch using Python with correct UTF-8 encoding
