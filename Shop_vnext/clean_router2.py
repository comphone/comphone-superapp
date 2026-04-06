#!/usr/bin/env python3
path = r'C:\Users\Server\.openclaw\workspace\Shop_vnext\src\Router.js'
with open(path, 'rb') as f: raw = f.read()

# Find the duplicate getDashboardData after cronMorningAlert
cron_idx = raw.find(b'function cronMorningAlert')
if cron_idx > -1:
    dup_start = raw.find(b'\nfunction getDashboardData()', cron_idx + 50)
    if dup_start > -1:
        raw = raw[:dup_start]
        print(f'Removed {len(raw)} -> {dup_start} bytes of duplicates')
    else:
        print('No duplicate getDashboardData found after cronMorningAlert')
else:
    print('cronMorningAlert not found')

with open(path, 'wb') as f: f.write(raw)
print('Saved {} bytes'.format(len(raw)))
