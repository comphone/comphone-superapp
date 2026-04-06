# -*- coding: utf-8 -*-
"""V317 Full Interaction - Fixed onclick with proper quotes"""
import os
d = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'Shop_vnext', 'src', 'Index.html')
f = open(d, 'w', encoding='utf-8')

# STYLE
f.write('<!DOCTYPE html>\n<html lang="th">\n<head>\n')
f.write('<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n')
f.write('<title>Comphone Dashboard V317</title>\n')
f.write('<style>\n')
lines = [
    '*{margin:0;padding:0;box-sizing:border-box}',
    'body{font-family:-apple-system,sans-serif;background:#f5f5f5;color:#333;min-height:100vh}',
    '#ld{text-align:center;padding:40px 20px}',
    '#ld .sp{width:40px;height:40px;border:4px solid #ddd;border-top:4px solid #1DB446;border-radius:50%;animation:sp 1s linear infinite;margin:0 auto 16px}',
    '@keyframes sp{to{transform:rotate(360deg)}}',
    '#ld p{font-size:16px;color:#666}',
    '#eb{display:none;background:#fee;border:2px solid #c33;padding:16px;margin:16px;border-radius:12px}',
    '#eb h3{color:#c33;margin-bottom:8px}',
    '#eb pre{white-space:pre-wrap;font-size:13px;color:#600}',
    '#rb{display:none;padding:16px}',
    '.c{background:#fff;border-radius:12px;padding:16px;margin:8px;box-shadow:0 2px 8px rgba(0,0,0,.08)}',
    '.tl{display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:0 16px}',
    '.te{background:#fff;border-radius:12px;padding:20px;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,.08)}',
    '.te .n{font-size:32px;font-weight:800}.te .l{font-size:12px;color:#999;margin-top:4px}',
    '.am{color:#E65C00}.bl{color:#1565C0}.gr{color:#2E7D32}.rd{color:#C62828}',
    '.hd{background:#1DB446;color:#fff;padding:16px;text-align:center;position:fixed;top:0;left:0;right:0;z-index:10}',
    '.hd h1{font-size:18px}',
    '.ct{padding-top:60px;padding-bottom:60px}',
    '.btn{display:block;margin:8px 16px;padding:12px;background:#1DB446;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;text-align:center}',
    '.b2{display:inline-block;margin:4px;padding:8px 14px;border:none;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer}',
    '.bb{background:#1565C0;color:#fff}.ba{background:#E65C00;color:#fff}.bp{background:#7B1FA2;color:#fff}.bx{background:#999;color:#fff}',
    '.jc{border-left:4px solid #ccc;cursor:pointer;transition:background .15s}',
    '.jc:hover{background:#f8f8f8}',
    '.jc.am{border-left-color:#E65C00}.jc.bl{border-left-color:#1565C0}.jc.gr{border-left-color:#2E7D32}.jc.rd{border-left-color:#C62828}',
    '#mo{display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.5);z-index:100;justify-content:center;align-items:center}',
    '#mo.op{display:flex}',
    '#mb{background:#fff;border-radius:16px;padding:24px;width:90%;max-width:440px;max-height:80vh;overflow-y:auto;animation:mi .2s ease}',
    '@keyframes mi{from{transform:scale(.9);opacity:0}to{transform:scale(1);opacity:1}}',
    '#mb h2{font-size:16px;font-weight:800;margin-bottom:4px}',
    '#mb .su{font-size:13px;color:#666;margin-bottom:12px}',
    '#mb .dt{font-size:13px;line-height:1.6;margin-bottom:16px;white-space:pre-line}',
    '#mb .ac{display:flex;gap:8px;flex-wrap:wrap}',
    '#mb .cx{position:absolute;top:16px;right:16px;background:none;border:none;font-size:22px;cursor:pointer;color:#999}',
    'input[type="text"],textarea{width:100%;padding:10px;border:2px solid #ddd;border-radius:8px;font-size:14px;font-family:inherit}',
    'textarea{resize:vertical;min-height:60px}',
]
for l in lines:
    f.write(l + '\n')
f.write('</style></head>\n')

# BODY
f.write('<body>\n')
f.write('<div class="hd"><h1>Comphone Dashboard V317</h1></div>\n')
f.write('<div class="ct">\n')
f.write('<div id="ld"><div class="sp"></div><p>ระบบกําลังโหลด...</p><p style="font-size:12px;color:#999;margin-top:8px" id="st">เริ่มต้น...</p></div>\n')
f.write('<div id="eb"><h3>เกิดข้อผิดพลาด</h3><pre id="ed"></pre><button class="btn" onclick="location.reload()">ลองใหม่</button></div>\n')
f.write('<div id="rb"></div>\n')
f.write('</div>\n')

# Modal
f.write('<div id="mo" onclick="if(event.target===this)closeModal()"><div id="mb" style="position:relative"><button class="cx" onclick="closeModal()">&times;</button><div id="mc"></div></div></div>\n')

f.close()
print(f"HTML+CSS done: {os.path.getsize(d)} bytes")
