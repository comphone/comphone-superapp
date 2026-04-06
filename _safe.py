# -*- coding: utf-8 -*-
"""Safe Mode Index.html V316 - Minimal, debug-friendly, always shows something"""
import os

d = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'Shop_vnext', 'src', 'Index.html')
f = open(d, 'w', encoding='utf-8')

# ===== HEAD ======
f.write('<!DOCTYPE html>\n<html lang="th">\n<head>\n')
f.write('<meta charset="UTF-8">\n')
f.write('<meta name="viewport" content="width=device-width, initial-scale=1.0">\n')
f.write('<title>Comphone Dashboard V316</title>\n')

# Inline critical CSS — NO external dependencies initially
f.write('<style>\n')
f.write('*{margin:0;padding:0;box-sizing:border-box}\n')
f.write('body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:#f5f5f5;color:#333;min-height:100vh}\n')

# Loading message — shows IMMEDIATELY
f.write('#loading-msg{text-align:center;padding:40px 20px}\n')
f.write('#loading-msg .spinner{width:40px;height:40px;border:4px solid #ddd;border-top:4px solid #1DB446;border-radius:50%;animation:spin 1s linear infinite;margin:0 auto 16px}\n')
f.write('@keyframes spin{to{transform:rotate(360deg)}}\n')
f.write('#loading-msg p{font-size:16px;color:#666}\n')
f.write('#error-box{display:none;background:#fee;border:2px solid #c33;padding:16px;margin:16px;border-radius:12px}\n')
f.write('#error-box h3{color:#c33;margin-bottom:8px}\n')
f.write('#error-box pre{white-space:pre-wrap;font-size:13px;color:#600}\n')
f.write('#result-box{display:none;padding:16px}\n')
f.write('.card{background:#fff;border-radius:12px;padding:16px;margin:8px;box-shadow:0 2px 8px rgba(0,0,0,0.08)}\n')
f.write('.tiles{display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:0 16px}\n')
f.write('.tile{background:#fff;border-radius:12px;padding:20px;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,0.08)}\n')
f.write('.tile .num{font-size:32px;font-weight:800}\n')
f.write('.tile .lbl{font-size:12px;color:#999;margin-top:4px}\n')
f.write('.amber{color:#E65C00}.blue{color:#1565C0}.green{color:#2E7D32}.red{color:#C62828}\n')
f.write('.header{background:#1DB446;color:#fff;padding:16px;text-align:center;position:fixed;top:0;left:0;right:0;z-index:10}\n')
f.write('.header h1{font-size:18px}\n')
f.write('.content{padding-top:60px;padding-bottom:60px}\n')
f.write('.btn{display:block;margin:8px 16px;padding:12px;background:#1DB446;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;text-align:center}\n')
f.write('</style></head>\n')

# ===== BODY ======
f.write('<body>\n')

# Header
f.write('<div class="header"><h1>Comphone Dashboard V316</h1></div>\n')

# Loading screen — VISIBLE IMMEDIATELY
f.write('<div class="content">\n')
f.write('<div id="loading-msg">\n')
f.write('<div class="spinner"></div>\n')
f.write('<p>ระบบกําลังโหลด...</p>\n')
f.write('<p style="font-size:12px;color:#999;margin-top:8px" id="status-text">เริ่มต้น...</p>\n')
f.write('</div>\n')

# Error box
f.write('<div id="error-box">\n')
f.write('<h3>เกิดข้อผิดพลาด</h3>\n')
f.write('<pre id="error-detail"></pre>\n')
f.write('<button class="btn" onclick="location.reload()">ลองใหม่</button>\n')
f.write('</div>\n')

# Result box — where data goes
f.write('<div id="result-box"></div>\n')
f.write('</div>\n')

# ===== JAVASCRIPT — SIMPLE & SAFE ======
f.write('<script>\n')

# Step 1: Console test
f.write('console.log("V316 Safe Mode started");\n')
f.write('console.log("Document ready:", document.readyState);\n')

# Status text updater
f.write('function setStatus(t){var e=document.getElementById("status-text");if(e)e.textContent=t;console.log("[Status] "+t)}\n')
f.write('function showError(title,detail){\n')
f.write('  console.error("[Error] "+title, detail);\n')
f.write('  var ld=document.getElementById("loading-msg");if(ld)ld.style.display="none";\n')
f.write('  var eb=document.getElementById("error-box");if(eb){eb.style.display="block";document.getElementById("error-detail").textContent=title+"\\n\\n"+JSON.stringify(detail||"",null,2)}\n')
f.write('}\n')
f.write('function showResult(html){\n')
f.write('  var ld=document.getElementById("loading-msg");if(ld)ld.style.display="none";\n')
f.write('  var eb=document.getElementById("error-box");if(eb)eb.style.display="none";\n')
f.write('  var rb=document.getElementById("result-box");if(rb){rb.style.display="block";rb.innerHTML=html}\n')
f.write('}\n')

# Step 2: Check if google.script is available
f.write('setStatus("Checking Google Script runtime...");\n')
f.write('setTimeout(function(){\n')
f.write('  try{\n')
f.write('    console.log("typeof google:", typeof google);\n')
f.write('    if(typeof google === "undefined"){\n')
f.write('      showError("Google Script runtime ไม่พร้อม", "\\nThis page must be opened as a Google Apps Script Web App, not as a standalone HTML file.");\n')
f.write('      return;\n')
f.write('    }\n')
f.write('    if(!google.script){\n')
f.write('      showError("google.script ไม่มี", "ตรวจสอบว่าเปิดผ่าน Web App URL ถูกต้อง");\n')
f.write('      return;\n')
f.write('    }\n')

# Step 3: Call getDashboardData
f.write('    setStatus("Calling getDashboardData()...");\n')
f.write('    console.log("Calling google.script.run.getDashboardData()");\n')
f.write('    google.script.run\n')
f.write('      .withSuccessHandler(function(data){\n')
f.write('        console.log("Success! Data received:", data);\n')
f.write('        try{\n')
f.write('          renderData(data);\n')
f.write('        }catch(e){\n')
f.write('          showError("Render Error: "+e.message, e.stack);\n')
f.write('        }\n')
f.write('      })\n')
f.write('      .withFailureHandler(function(err){\n')
f.write('        console.error("GAS Error:", err);\n')
f.write('        showError("getDashboardData() ล้มเหลว", err.message || JSON.stringify(err));\n')
f.write('      })\n')
f.write('      .getDashboardData();\n')

f.write('  }catch(e){\n')
f.write('    showError("Unexpected Error: "+e.message, e.stack);\n')
f.write('  }\n')
f.write('}, 500);\n')

# Render function
f.write('function renderData(d){\n')
f.write('  setStatus("Rendering...");\n')
f.write('  console.log("Dashboard data:", JSON.stringify(d));\n')

# Summary
f.write('  var s=(d&&d.summary)||{};\n')
f.write('  var html="";\n')

# Summary cards
f.write('  html+="\\u0E2A\\u0E23\\u0E38\\u0E1C\\u0E25\\u0E23\\u0E27\\u0E21";\n')
f.write('  html+="<div class=\\"tiles\\">";\n')
f.write('  html+="<div class=\\"tile\\"><div class=\\"num amber\\">"+((s.pending||0))+"</div><div class=\\"lbl\\">\\u0E23\\u0E2D\\u0E14\\u0E33\\u0E40\\u0E19\\u0E34\\u0E19\\u0E01\\u0E32\\u0E23</div></div>";\n')
f.write('  html+="<div class=\\"tile\\"><div class=\\"num blue\\">"+((s.inProgress||0))+"</div><div class=\\"lbl\\">\\u0E01\\u0E33\\u0E25\\u0E31\\u0E07\\u0E17\\u0E33</div></div>";\n')
f.write('  html+="<div class=\\"tile\\"><div class=\\"num green\\">"+((s.completed||0))+"</div><div class=\\"lbl\\">\\u0E40\\u0E2A\\u0E23\\u0E47\\u0E08\\u0E41\\u0E25\\u0E49\\u0E27</div></div>";\n')
f.write('  html+="<div class=\\"tile\\"><div class=\\"num red\\">"+((s.lowStock||0))+"</div><div class=\\"lbl\\">\\u0E2A\\u0E15\\u0E47\\u0E2D\\u0E01\\u0E15\\u0E48\\u0E33</div></div>";\n')
f.write('  html+="</div>";\n')

# Info
f.write('  html+="<div class=\\"card\\" style=\\"margin:16px\\"><p>\\u0E07\\u0E32\\u0E19\\u0E17\\u0E31\\u0E49\\u0E07\\u0E2B\\u0E21\\u0E14: <b>"+((s.totalJobs||0))+"</b></p>";\n')
f.write('  html+="<p>\\u0E2D\\u0E30\\u0E44\\u0E25\\u0E48: <b>"+((s.totalItems||0))+"</b></p>";\n')
f.write('  html+="<p style=\\"color:#999;font-size:12px\\">\\u0E2D\\u0E31\\u0E1B\\u0E40\\u0E14\\u0E15: "+(s.date||"-")+"</p></div>";\n')

# Jobs
f.write('  var jobs=(d&&d.jobs)||[];\n')
f.write('  html+="<div class=\\"card\\" style=\\"margin:16px\\">";\n')
f.write('  html+="<h3 style=\\"margin-bottom:12px\\">\\u0E07\\u0E32\\u0E19\\u0E25\\u0E48\\u0E32\\u0E2A\\u0E38\\u0E14 ("+jobs.length+")</h3>";\n')
f.write('  for(var i=0;i<Math.min(jobs.length,20);i++){\n')
f.write('    var j=jobs[i];\n')
f.write('    var sc="";\n')
f.write('    if(j.status.indexOf("\\u0E23\\u0E2D")==0)sc="amber";\n')
f.write('    else if(j.status.indexOf("\\u0E01\\u0E33")==0||j.status==="InProgress")sc="blue";\n')
f.write('    else if(j.status.indexOf("\\u0E22\\u0E01")>-1)sc="red";\n')
f.write('    else sc="green";\n')
f.write('    html+="<div class=\\"card\\" style=\\"border-left:4px solid\\">";\n')
f.write('    html+="<b>"+j.id+"</b> - "+j.customer+"<br>";\n')
f.write('    html+="<span class=\\""+sc+"\\">"+j.status+"</span> | "+(j.tech||"-")+(j.created?" | "+j.created:"");\n')
f.write('    html+="</div>";\n')
f.write('  }\n')
f.write('  html+="</div>";\n')

# Stock
f.write('  var inv=(d&&d.inventory)||[];\n')
f.write('  html+="<div class=\\"card\\" style=\\"margin:16px\\">";\n')
f.write('  html+="<h3 style=\\"margin-bottom:12px\\">\\u0E2A\\u0E15\\u0E47\\u0E2D\\u0E01 ("+inv.length+")</h3>";\n')
f.write('  for(var i=0;i<Math.min(inv.length,15);i++){\n')
f.write('    var it=inv[i];\n')
f.write('    var clr=it.alert? "red" : "green";\n')
f.write('    html+="<div style=\\"padding:8px 0;border-bottom:1px solid #eee\\">";\n')
f.write('    html+="<span class=\\""+clr+"\\"><b>"+it.qty+"</b></span> ";\n')
f.write('    html+=it.name+" ("+it.code+")";\n')
f.write('    html+="</div>";\n')
f.write('  }\n')
f.write('  html+="</div>";\n')

f.write('  console.log("Render complete");\n')
f.write('  showResult(html);\n')
f.write('}\n')

f.write('console.log("V316 Safe Mode script loaded");\n')
f.write('</script>\n')
f.write('</body></html>\n')

f.close()
sz = os.path.getsize(d)
print(f"OK: {sz} bytes written to {d}")

# Verify
with open(d, 'r', encoding='utf-8') as rf:
    c = rf.read()
    checks = [
        ("DOCTYPE", "<!DOCTYPE html>" in c),
        ("loading-msg", "id=\"loading-msg\"" in c),
        ("getDashboardData", "getDashboardData()" in c),
        ("withSuccessHandler", "withSuccessHandler" in c),
        ("withFailureHandler", "withFailureHandler" in c),
        ("renderData", "function renderData" in c),
        ("showError", "function showError" in c),
        ("showResult", "function showResult" in c),
        ("closing tags", "</body></html>" in c),
        ("console.log start", 'console.log("V316' in c),
    ]
    for name, result in checks:
        print(f"  {'OK' if result else 'FAIL'}: {name}")
