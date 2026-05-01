#!/usr/bin/env python3
"""
Fix cache buster in index.html and dashboard_pc.html
Replace old version patterns with new v5.12.0-phase34
"""
import re
import sys

files = [
    '/mnt/c/Users/Server/comphone-superapp/pwa/index.html',
    '/mnt/c/Users/Server/comphone-superapp/pwa/dashboard_pc.html'
]

old_pattern = r'v=5\.10\.0-phase32v=5\.9\.0-phase2d|v=5\.10\.0-phase32v=5\.9\.0-phase31|v=5\.9\.0-phase31a[^&"]*'
new_version = 'v=5.12.0-phase34'

for filepath in files:
    print(f'Processing: {filepath}')
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Replace old version patterns with new version
        # Also fix malformed double-version strings
        updated = re.sub(old_pattern, new_version, content)
        
        # Update timestamp to new one
        updated = re.sub(r't=20\d{6}_\d{4}', 't=20260501_1800', updated)
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(updated)
        
        print(f'  ✅ Fixed: {filepath}')
    except Exception as e:
        print(f'  ❌ Error: {e}')
        sys.exit(1)

print('\n✅ All cache buster strings updated to v5.12.0-phase34!')
