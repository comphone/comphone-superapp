#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Remove duplicate functions from end of Router.js"""

path = r'C:\Users\Server\.openclaw\workspace\Shop_vnext\src\Router.js'

with open(path, 'r', encoding='utf-8', errors='replace') as f:
    content = f.read()

# Find the duplicated getDashboardData at end of file
# The functions added by fix_router3.py are:
# getDashboardData, openJob (2nd), updateJobById, getDashboardJobs, getDashboardInventory, getDashboardSummary

# Find the position of cronMorningAlert's last closing brace
# Then find where duplicate functions start

dup_marker = '\nfunction getDashboardData()'
# Find all occurrences
idx = content.find(dup_marker)
if idx > -1:
    # Find the one that's after cronMorningAlert
    cron_idx = content.find('function cronMorningAlert')
    if cron_idx > -1 and idx > cron_idx:
        # Remove everything from this point
        content = content[:idx]
        print('Removed duplicate getDashboardData + functions after cronMorningAlert')

# Also remove extra openJob and updateJobById if they exist after updateJobStatus
# Find updateJobStatus
ujs_idx = content.find('function updateJobStatus(data)')
if ujs_idx > -1:
    # Find its end (the finally block)
    finally_idx = content.find('} finally {', ujs_idx)
    if finally_idx > -1:
        # Find the end of this function
        brace_count = 0
        i = finally_idx
        found = False
        while i < len(content):
            if content[i] == '{': brace_count += 1
            elif content[i] == '}': 
                brace_count -= 1
                if brace_count == 0:
                    content = content[:i+1]
                    print('Trimmed after updateJobStatus function')
                    found = True
                    break
            i += 1

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Fixed Router.js: {} bytes'.format(len(content)))
