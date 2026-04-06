#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Remove duplicate getDashboardData, openJob2, updateJobById2 from Router.js"""

path = r'C:\Users\Server\.openclaw\workspace\Shop_vnext\src\Router.js'

with open(path, 'r', encoding='utf-8', errors='replace') as f:
    content = f.read()

# Find where "function getDashboardData() {" starts as a standalone function (not in switch)
# It's at the very end of the file after "function cronMorningAlert()"

markers_to_remove = [
    '\nfunction getDashboardData() {',
    '\nfunction openJob2(data) {',
    '\nfunction updateJobById2(jobId, data) {'
]

# Find the last getDashboardData function (not the one in switch statement)
idx = content.rfind('\nfunction getDashboardData() {')

if idx > -1:
    # Remove from this point to end of file
    # Go back to the beginning of this function's line
    line_start = content.rfind('\n', 0, idx)
    if line_start < 0: line_start = 0
    
    content = content[:line_start]
    # Ensure proper ending
    content = content.rstrip()
    if not content.endswith('\n'):
        content += '\n'
    content += '\n'
    print('Removed duplicate functions from end of Router.js')
else:
    print('getDashboardData not found at end (may already be removed)')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Fixed: {} bytes (UTF-8)'.format(len(content)))
