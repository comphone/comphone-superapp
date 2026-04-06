#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Fix emoji in Index.html - replace HTML entities with real UTF-8 emoji"""
import re

path = 'C:/Users/Server/.openclaw/workspace/Shop_vnext/src/Index.html'

with open(path, 'r', encoding='utf-8') as f:
    h = f.read()

# Replace HTML entity emojis with real UTF-8 emoji
h = h.replace('&#x1F4CA;', '\U0001F4CA')  # 📊
h = h.replace('&#x1F4CB;', '\U0001F4CB')  # 📋
h = h.replace('&#x1F4E6;', '\U0001F4E6')  # 📦
h = h.replace('&#x2705;', '\u2705')        # ✅
h = h.replace('&#x274C;', '\u274C')        # ❌
h = h.replace('&#x26A0;', '\u26A0')        # ⚠
h = h.replace('&#x1F389;', '\U0001F389')   # 🎉

with open(path, 'w', encoding='utf-8') as f:
    f.write(h)

print('Fixed emoji in Index.html - {} bytes'.format(len(h)))
