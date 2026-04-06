# -*- coding: utf-8 -*-
"""V323 — Rewrite Index.html with proper JS escaping throughout"""
import os, re

path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'Shop_vnext', 'src', 'Index.html')

with open(path, 'r', encoding='utf-8') as f:
    c = f.read()

# Find ALL lines with potential escaping problems
lines = c.split('\n')
problems = []
for i, line in enumerate(lines, 1):
    # Check for onclick=\" inside a string delimited by "...
    # This breaks because \" ends the JS string
    if 'onclick="' in line:
        problems.append((i, line.rstrip()[:120]))
    # Check for any unescaped double-quote within a string
    # Pattern: "...onclick="func('...')..." where the string delimiter is "

if problems:
    print("=== Lines with onclick= inside double-quoted strings ===")
    for ln, txt in problems:
        print(f"  Line {ln}: {txt}")
else:
    print("No obvious problems found")

# Check the vJob function specifically
vjob_start = None
for i, line in enumerate(lines):
    if 'function vJob(' in line:
        vjob_start = i
        break

if vjob_start:
    print(f"\n=== vJob function (lines {vjob_start+1}-{min(vjob_start+25, len(lines))}) ===")
    for i in range(vjob_start, min(vjob_start+25, len(lines))):
        line = lines[i]
        marker = " <-- PROBLEM" if 'onclick="' in line else ""
        print(f"  {i+1}: {line.rstrip()}{marker}")

# Also check showQuickNote
sqn_start = None
for i, line in enumerate(lines):
    if 'function showQuickNote(' in line:
        sqn_start = i
        break

if sqn_start:
    print(f"\n=== showQuickNote function (lines {sqn_start+1}-{min(sqn_start+15, len(lines))}) ===")
    for i in range(sqn_start, min(sqn_start+15, len(lines))):
        line = lines[i]
        marker = " <-- PROBLEM" if 'onclick="' in line else ""
        print(f"  {i+1}: {line.rstrip()}{marker}")
