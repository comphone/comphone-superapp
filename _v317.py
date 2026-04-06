# -*- coding: utf-8 -*-
"""V317 Full Interaction Dashboard + Modal + LINE_GAS_URL updated"""
import os

d = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'Shop_vnext', 'src', 'Index.html')
f = open(d, 'w', encoding='utf-8')

# === STYLE ===
f.write('<!DOCTYPE html>\n<html lang="th">\n<head>\n')
f.write('<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n')
f.write('<title>Comphone Dashboard V317</title>\n')
f.write('<style>\n')
f.write('*{margin:0;padding:0;box-sizing:border-box}\n')
f.write('body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:#f5f5f5;color:#333;min-height:100vh}\n')
f.write('#loading-msg{text-align:center;padding:40px 20px}\n')
f.write('#loading-msg .spinner{width:40px;height:40px;border:4px solid #ddd;border-top:4px solid #1DB446;border-radius:50%;animation:spin 1s linear infinite;margin:0 auto 16px}\n')
f.write('@keyframes spin{to{transform:rotate(360deg)}}\n')
f.write('#loading-msg p{font-size:16px;color:#666}\n')
f.write('#error-box{display:none;background:#fee;border:2px solid #c33;padding:16px;margin:16px;border-radius:12px}\n')
f.write('#error-box h3{color:#c33;margin-bottom:8px}\n')
f.write('#error-box pre{white-space:pre-wrap;font-size:13px;color:#600}\n')
f.write('#result-box{display:none;padding:16px}\n')
f.write('.c{background:#fff;border-radius:12px;padding:16px;margin:8px;box-shadow:0 2px 8px rgba(0,0,0,.08)}\n')
f.write('.tiles{display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:0 16px}\n')
f.write('.tile{background:#fff;border-radius:12px;padding:20px;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,.08)}\n')
f.write('.tile .n{font-size:32px;font-weight:800}.tile .l{font-size:12px;color:#999;margin-top:4px}\n')
f.write('.am{color:#E65C00}.bl{color:#1565C0}.gr{color:#2E7D32}.rd{color:#C62828}\n')
f.write('.hdr{background:#1DB446;color:#fff;padding:16px;text-align:center;position:fixed;top:0;left:0;right:0;z-index:10}\n')
f.write('.hdr h1{font-size:18px}\n')
f.write('.cnt{padding-top:60px;padding-bottom:60px}\n')
f.write('.btn{display:block;margin:8px 16px;padding:12px;background:#1DB446;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;text-align:center}\n')
f.write('.btn:hover{background:#18933a}\n')
f.write('.btn-sm{display:inline-block;margin:4px;padding:8px 14px;border:none;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer}\n')
f.write('.btn-blue{background:#1565C0;color:#fff}.btn-amber{background:#E65C00;color:#fff}.btn-purple{background:#7B1FA2;color:#fff}.btn-gray{background:#999;color:#fff}\n')
f.write('.jcard{border-left:4px solid #ccc;cursor:pointer;transition:background .15s}\n')
f.write('.jcard:hover{background:#f0f0f0}\n')
f.write('.jcard.am{border-left-color:#E65C00}.jcard.bl{border-left-color:#1565C0}.jcard.gr{border-left-color:#2E7D32}.jcard.rd{border-left-color:#C62828}\n')
f.write('#modal-overlay{display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.5);z-index:100;justify-content:center;align-items:center}\n')
f.write('#modal-overlay.open{display:flex}\n')
f.write('#modal-box{background:#fff;border-radius:16px;padding:24px;width:90%;max-width:440px;max-height:80vh;overflow-y:auto;animation:modalIn .2s ease}\n')
f.write('@keyframes modalIn{from{transform:scale(.9);opacity:0}to{transform:scale(1);opacity:1}}\n')
f.write('#modal-box h2{font-size:16px;font-weight:800;margin-bottom:4px}\n')
f.write('#modal-box .sub{font-size:13px;color:#666;margin-bottom:12px}\n')
f.write('#modal-box .detail{font-size:13px;line-height:1.6;margin-bottom:16px;white-space:pre-line}\n')
f.write('#modal-box .meta{font-size:12px;color:#999;margin-bottom:12px}\n')
f.write('#modal-box .acts{display:flex;gap:8px;flex-wrap:wrap}\n')
f.write('#modal-box .close-x{position:absolute;top:16px;right:16px;background:none;border:none;font-size:22px;cursor:pointer;color:#999}\n')
f.write('</style></head>\n')

# === BODY ===
f.write('<body>\n')
f.write('<div class="hdr"><h1>Comphone Dashboard V317</h1></div>\n')
f.write('<div class="cnt">\n')
f.write('<div id="loading-msg"><div class="spinner"></div><p>กําลังโหลด...</p><p style="font-size:12px;color:#999;margin-top:8px" id="st">เริ่มต้น...</p></div>\n')
f.write('<div id="error-box"><h3>เกิดข้อผิดพลาด</h3><pre id="err-detail"></pre><button class="btn" onclick="location.reload()">ลองใหม่</button></div>\n')
f.write('<div id="result-box"></div>\n')
f.write('</div>\n')

# === MODAL ===
f.write('<div id="modal-overlay" onclick="if(event.target===this)closeModal()">\n')
f.write('<div id="modal-box" style="position:relative">\n')
f.write('<button class="close-x" onclick="closeModal()">&times;</button>\n')
f.write('<div id="modal-content"></div>\n')
f.write('</div></div>\n')

# === JAVASCRIPT ===
f.write('<script>\n')
f.write('var DATA=null,JOBS=[],INV=[];\n')

# Init
f.write('console.log("V317 Full Interaction started");\n')
f.write('function st(t){var e=document.getElementById("st");if(e)e.textContent=t;console.log("[V317] "+t)}\n')
f.write('function showErr(t,d){\n')
f.write('  console.error(t,d);\n')
f.write('  document.getElementById("loading-msg").style.display="none";\n')
f.write('  var e=document.getElementById("error-box");if(e){e.style.display="block";document.getElementById("err-detail").textContent=t+"\\n\\n"+JSON.stringify(d||"",null,2)}\n')
f.write('}\n')
f.write('function showRes(h){\n')
f.write('  document.getElementById("loading-msg").style.display="none";\n')
f.write('  document.getElementById("error-box").style.display="none";\n')
f.write('  var r=document.getElementById("result-box");if(r){r.style.display="block";r.innerHTML=h}\n')
f.write('}\n')

# Open/close modal
f.write('function openModal(html){document.getElementById("modal-content").innerHTML=document.getElementById("modal-overlay").classList.add("open")}\n')
f.write('function closeModal(){document.getElementById("modal-overlay").classList.remove("open")}\n')

# Show job detail modal
f.write('function vJob(id){\n')
f.write('  console.log("vJob called with:", id);\n')
f.write('  var j=findJ(id);\n')
f.write('  if(!j){alert("ไม่พบงาน "+id);return}\n')
f.write('  var h="<h2>"+j.id+" - "+j.customer+"</h2>";\n')
f.write('  h+="<div class=\\\"sub\\\">"+(j.symptom||"")+"</div>";\n')
f.write('  h+="<h4 style=\\\"margin-bottom:4px\\\">รายละเอียด</h4>";\n')
f.write('  h+="<div class=\\\"detail\\>";\n')
f.write('  h+="สถานะ: <b>"+j.status+"</b><br>";\n')
f.write('  h+="ช่าง: "+(j.tech||"-")+"<br>";\n')
f.write('  h+="เวลาสร้าง: "+(j.created||"-")+"<br>";\n')
f.write('  if(j.folder) h+="ลิงก์โฟลเดอร์:<br><a href=\\\""+j.folder+"\\\" target=\\\"_blank\\\">"+j.folder+"</a>";\n')
f.write('  h+="</div>";\n')
f.write('  h+="<div class=\\\"acts\\">";\n')
f.write('  h+="<button class=\\\"btn-sm btn-blue\\\" onclick=\\\"oSt(\\x27"+id+"\\x27)\\\">เปลี่ยนสถานะ</button>";\n')
f.write('  h+="<button class=\\\"btn-sm btn-gray\\\" onclick=\\\"eJob(\\x27"+id+"\\x27)\\\">แก้ไข</button>";\n')
f.write('  h+="<button class=\\\"btn-sm btn-blue\\\" onclick=\\\"window.open(\\x27"+(j.folder||"#")+"\\x27,\\x27_blank\\x27)\\\" class=\\\"btn-sm btn-amber\\\">เปิดโฟลเดอร์</button>";\n')
f.write('  h+="</div>";\n')
f.write('  openModal(h);\n')
f.write('}\n')

# Status change modal
f.write('function oSt(id){\n')
f.write('  console.log("oSt called with:", id);\n')
f.write('  var j=findJ(id);if(!j)return;\n')
f.write('  var h="<h2>เปลี่ยนสถานะ: "+id+"</h2>";\n')
f.write('  h+="<div class=\\\"sub\\\">"+j.customer+"</div>";\n')
f.write('  h+="<p style=\\\"font-weight:600;margin-bottom:8px\\\">สถานะปัจจุบัน: <span style=\\\"color:#1DB446\\\">"+j.status+"</span></p>";\n')
f.write('  h+="<div style=\\\"display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px\\\">";\n')
f.write('  h+="<button class=\\\"btn-sm btn-amber\\\" onclick=\\\"changeSt(\\x27"+id+"\\x27,\\x27\\u0E23\\u0E2D\\u0E14\\u0E33\\u0E40\\u0E19\\u0E34\\u0E19\\u0E01\\u0E32\\u0E23\\x27)\\\">รอดำเนินการ</button>";\n')
f.write('  h+="<button class=\\\"btn-sm btn-blue\\\" onclick=\\\"changeSt(\\x27"+id+"\\x27,\\x27InProgress\\x27)\\\">กำลังดำเนินการ</button>";\n')
f.write('  h+="<button class=\\\"btn-sm btn-purple\\\" onclick=\\\"changeSt(\\x27"+id+"\\x27,\\x27Completed\\x27)\\\">เสร็จสมบูรณ์</button>";\n')
f.write('  h+="<button class=\\\"btn-sm btn-gray\\\" onclick=\\\"changeSt(\\x27"+id+"\\x27,\\x27\\u0E22\\u0E01\\u0E40\\u0E25\\u0E34\\u0E01\\x27)\\\">ยกเลิก</button>";\n')
f.write('  h+="</div>";\n')
f.write('  h+="<button class=\\\"btn-sm btn-gray\\\" onclick=\\\"closeModal()\\\">ยกเลิก</button>";\n')
f.write('  openModal(h);\n')
f.write('}\n')

# Change status
f.write('function changeSt(id,newSt){\n')
f.write('  console.log("changeSt:", id, newSt);\n')
f.write('  if(typeof google==="undefined"||!google.script){alert("Google Script ไม่พร้อม");return}\n')
f.write('  google.script.run.withSuccessHandler(function(){\n')
f.write('    alert("เปลี่ยนสถานะเป็น: "+newSt);\n')
f.write('    closeModal();\n')
f.write('    refreshData();\n')
f.write('  }).withFailureHandler(function(e){\n')
f.write('    alert("ผิดพลาด: "+e.message);\n')
f.write('  }).updateJobStatus({job_id:id,status:newSt,note:"เปลี่ยนจาก Dashboard"});\n')
f.write('}\n')

# Edit job
f.write('function eJob(id){\n')
f.write('  console.log("eJob:", id);\n')
f.write('  var j=findJ(id);if(!j)return;\n')
f.write('  var h="<h2>แก้ไขงาน: "+id+"</h2>";\n')
f.write('  h+="<div class=\\\"sub\\\">"+j.customer+"</div>";\n')
f.write('  h+="<label style=\\\"font-size:12px;font-weight:600;display:block;margin:8px 0 4px\\\">ชื่อลูกค้า</label>";\n')
f.write('  h+="<input id=\\\"e_name\\\" value=\\\""+j.customer+"\\\" style=\\\"width:100%;padding:10px;border:2px solid #ddd;border-radius:8px;font-size:14px\\\">";\n')
f.write('  h+="<label style=\\\"font-size:12px;font-weight:600;display:block;margin:8px 0 4px\\\">อาการ</label>";\n')
f.write('  h+="<textarea id=\\\"e_sym\\\" rows=\\\"3\\\" style=\\\"width:100%;padding:10px;border:2px solid #ddd;border-radius:8px;font-size:14px\\\">"+(j.symptom||"")+"</textarea>";\n')
f.write('  h+="<label style=\\\"font-size:12px;font-weight:600;display:block;margin:8px 0 4px\\\">ช่าง</label>";\n')
f.write('  h+="<input id=\\\"e_tech\\\" value=\\\""+(j.tech||"")+"\\\" style=\\\"width:100%;padding:10px;border:2px solid #ddd;border-radius:8px;font-size:14px\\\">";\n')
f.write('  h+="<div style=\\\"margin-top:12px\\\">";\n')
f.write('  h+="<button class=\\\"btn\\\" onclick=\\\"saveEdit(\\x27"+id+"\\x27)\\\">บันทึก</button>";\n')
f.write('  h+="<button class=\\\"btn\\\" style=\\\"background:#999\\\" onclick=\\\"closeModal()\\\">ยกเลิก</button>";\n')
f.write('  h+="</div>";\n')
f.write('  openModal(h);\n')
f.write('}\n')

f.write('function saveEdit(id){\n')
f.write('  var d={\n')
f.write('    name:document.getElementById("e_name").value,\n')
f.write('    symptom:document.getElementById("e_sym").value,\n')
f.write('    tech:document.getElementById("e_tech").value\n')
f.write('  };\n')
f.write('  if(!d.name){alert("ใส่ชื่อลูกค้า");return}\n')
f.write('  if(typeof google==="undefined"||!google.script){alert("ไม่พร้อม");return}\n')
f.write('  google.script.run.withSuccessHandler(function(){\n')
f.write('    alert("แก้ไขสำเร็จ");\n')
f.write('    closeModal();\n')
f.write('    refreshData();\n')
f.write('  }).withFailureHandler(function(e){\n')
f.write('    alert("ผิดพลาด: "+e.message);\n')
f.write('  }).updateJobById(id,d);\n')
f.write('}\n')

f.write('function findJ(id){for(var i=0;i<JOBS.length;i++){if(JOBS[i].id===id)return JOBS[i]}return null}\n')
f.write('function esc(s){if(!s)return"";return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}\n')

# Refresh
f.write('function refreshData(){\n')
f.write('  if(typeof google!=="undefined"&&google.script){\n')
f.write('    st("Refreshing...");\n')
f.write('    google.script.run.withSuccessHandler(function(d){\n')
f.write('      DATA=d;JOBS=(d&&d.jobs)||[];INV=(d&&d.inventory)||[];\n')
f.write('      render(D);\n')
f.write('    }).withFailureHandler(function(e){\n')
f.write('      st("Refresh failed: "+e.message);\n')
f.write('    }).getDashboardData();\n')
f.write('  }\n')
f.write('}\n')

# INIT
f.write('setTimeout(function(){\n')
f.write('  try{\n')
f.write('    if(typeof google==="undefined"){\n')
f.write('      showErr("Google Script ไม่พร้อม","เปิดผ่าน Web App URL ของ Google Apps Script เท่านั้น");\n')
f.write('      return;\n')
f.write('    }\n')
f.write('    st("ดึงข้อมูล...");\n')
f.write('    google.script.run\n')
f.write('      .withSuccessHandler(function(d){\n')
f.write('        DATA=d;JOBS=(d&&d.jobs)||[];INV=(d&&d.inventory)||[];\n')
f.write('        console.log("Data loaded. Jobs:",JOBS.length,"Inventory:",INV.length);\n')
f.write('        render(d);\n')
f.write('      })\n')
f.write('      .withFailureHandler(function(e){\n')
f.write('        showErr("getDashboardData() ผิดพลาด",e.message);\n')
f.write('      })\n')
f.write('      .getDashboardData();\n')
f.write('  }catch(e){showErr("Unexpected",e.message)}\n')
f.write('},300);\n')

# Render
f.write('function render(d){\n')
f.write('  var s=(d&&d.summary)||{};\n')
f.write('  var jobs=(d&&d.jobs)||[];\n')
f.write('  var inv=(d&&d.inventory)||[];\n')
f.write('  var h="";\n')

# Tiles
f.write('  h+="<div class=\\\"tiles\\">";\n')
f.write('  h+="<div class=\\\"tile\\"><div class=\\\"n am\\\">"+(s.pending||0)+"</div><div class=\\\"l\\">รอดำเนินการ</div></div>";\n')
f.write('  h+="<div class=\\\"tile\\"><div class=\\\"n bl\\">"+(s.inProgress||0)+"</div><div class=\\\"l\\">กำลังทำ</div></div>";\n')
f.write('  h+="<div class=\\\"tile\\"><div class=\\\"n gr\\">"+(s.completed||0)+"</div><div class=\\\"l\\">เสร็จแล้ว</div></div>";\n')
f.write('  h+="<div class=\\\"tile\\"><div class=\\\"n rd\\">"+(s.lowStock||0)+"</div><div class=\\\"l\\">สต็อกต่ำ</div></div>";\n')
f.write('  h+="</div>";\n')

# Info
f.write('  h+="<div class=\\\"c\\\" style=\\\"margin:16px\\">";\n')
f.write('  h+="<p>งานทั้งหมด: <b>"+(s.totalJobs||0)+"</b></p>";\n')
f.write('  h+="<p>อะไหล่: <b>"+(s.totalItems||0)+"</b> รายการ</p>";\n')
f.write('  h+="<p style=\\\"color:#999;font-size:12px\\">อัปเดต: "+(s.date||"-")+"</p>";\n')
f.write('  h+="</div>";\n')

# Jobs with click
f.write('  h+="<div class=\\\"c\\\" style=\\\"margin:16px\\">";\n')
f.write('  h+="<h3 style=\\\"margin:8px\\">งานล่าสุด ("+jobs.length+")</h3>";\n')
f.write('  for(var i=0;i<Math.min(jobs.length,30);i++){\n')
f.write('    var j=jobs[i];\n')
f.write('    var sc="";\n')
f.write('    if(j.status.indexOf("\\u0E23\\u0E2D")===0)sc="am";\n')
f.write('    else if(j.status.indexOf("\\u0E01\\u0E33")===0||j.status==="InProgress")sc="bl";\n')
f.write('    else if(j.status.indexOf("\\u0E22\\u0E01")>-1)sc="rd";\n')
f.write('    else sc="gr";\n')
f.write('    h+="<div class=\\\"c jcard "+sc+"\\\" onclick=\\\"vJob(\\x27"+j.id+"\\x27)\\">";\n')
f.write('    h+="<b>"+j.id+"</b> - "+esc(j.customer)+"<br>";\n')
f.write('    h+="<span class=\\\""+sc+"\\">"+esc(j.status)+"</span>";\n')
f.write('    if(j.tech) h+=" | "+esc(j.tech);\n')
f.write('    if(j.created) h+=" | "+esc(j.created);\n')
f.write('    h+="</div>";\n')
f.write('  }\n')
f.write('  h+="</div>";\n')

# Inventory
f.write('  h+="<div class=\\\"c\\\" style=\\\"margin:16px\\">";\n')
f.write('  h+="<h3 style=\\\"margin:8px\\">สต็อก ("+inv.length+")</h3>";\n')
f.write('  for(var k=0;k<Math.min(inv.length,20);k++){\n')
f.write('    var it=inv[k];\n')
f.write('    var clr=it.alert?"rd":"gr";\n')
f.write('    h+="<div style=\\\"padding:8px 0;border-bottom:1px solid #eee\\">";\n')
f.write('    h+="<span class=\\\""+clr+"\\"><b>"+it.qty+"</b></span> "+esc(it.name)+" ("+esc(it.code)+")";\n')
f.write('    h+="</div>";\n')
f.write('  }\n')
f.write('  h+="</div>";\n')

# Refresh button
f.write('  h+="<button class=\\\"btn\\\" onclick=\\\"refreshData()\\">รีเฟรช</button>";\n')

f.write('  showRes(h);\n')
f.write('}\n')

f.write('console.log("V317 script loaded - Full interaction mode");\n')
f.write('</script>\n')
f.write('</body></html>\n')

f.close()
sz = os.path.getsize(d)
print(f"V317 written: {sz} bytes")

# Verify
with open(d, 'r', encoding='utf-8') as rf:
    c = rf.read()
    checks = [
        ('onclick="vJob', 'onclick="vJob' in c),
        ('onclick="oSt', 'onclick="oSt' in c),
        ('function vJob', 'function vJob(' in c),
        ('function oSt', 'function oSt(' in c),
        ('function changeSt', 'function changeSt(' in c),
        ('function closeModal', 'function closeModal()' in c),
        ('function eJob', 'function eJob(' in c),
        ('function saveEdit', 'function saveEdit(' in c),
        ('function openModal', 'function openModal(' in c),
        ('modal-overlay', 'modal-overlay' in c),
        ('refreshData', 'function refreshData()' in c),
        ('</body></html>', '</body>' in c),
    ]
    all_ok = True
    for name, ok in checks:
        status = 'OK' if ok else 'FAIL'
        if not ok: all_ok = False
        print(f"  {status}: {name}")
    if all_ok:
        print("ALL CHECKS PASSED!")
    else:
        print("SOME CHECKS FAILED!")
