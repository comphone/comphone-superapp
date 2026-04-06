# -*- coding: utf-8 -*-
"""V323 Fix — find exact broken onclicks, fix them"""
import os

path = r'C:\Users\Server\.openclaw\workspace\Shop_vnext\src\Index.html'

with open(path, 'rb') as f:
    raw = f.read()

text = raw.decode('utf-8')

# Find all lines with onclick
lines = text.split('\n')
print("=== Lines with onclick (90-230) ===")
for i, line in enumerate(lines):
    if 'onclick' in line and 90 <= i <= 230:
        print(f"\nLINE {i+1}:")
        # Show raw repr (safe for terminal)
        safe = repr(line[:150])
        print(f"  {safe}")
