import os
p = r'C:\Users\Server\.openclaw\workspace\Shop_vnext\src\LineBot.gs'
with open(p, 'r', encoding='utf-8-sig') as f:
    c = f.read()
new_url = 'https://script.google.com/macros/s/AKfycbwrI5zQEPkauLqtv8KZel98cexTT1WHMjGsGnq4S-GtdoNZq46sQg5r1ZksJRissTC0NA/exec'
old = "var LINE_GAS_URL = '" + c.split("var LINE_GAS_URL = '")[1].split("';")[0] + "';"
new = "var LINE_GAS_URL = '" + new_url + "';"
print('OLD:', old[:80])
c = c.replace(old, new)
with open(p, 'w', encoding='utf-8-sig') as f:
    f.write(c)
print('SYNCED to @350')
