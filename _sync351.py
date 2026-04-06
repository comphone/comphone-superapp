import os
p = r'C:\Users\Server\.openclaw\workspace\Shop_vnext\src\LineBot.gs'
with open(p, 'r', encoding='utf-8-sig') as f:
    c = f.read()
new_url = 'https://script.google.com/macros/s/AKfycbxO23P_kz2uUXsHbtUhn6gflOjE0ZZNV6bf3K8JDy7IK0PGdEJe_UtyYiqO_oY_WXqnvg/exec'
old = "var LINE_GAS_URL = '" + c.split("var LINE_GAS_URL = '")[1].split("';")[0] + "';"
new = "var LINE_GAS_URL = '" + new_url + "';"
c = c.replace(old, new)
with open(p, 'w', encoding='utf-8-sig') as f:
    f.write(c)
print('SYNCED to @351')
