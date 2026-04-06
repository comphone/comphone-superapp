# -*- coding: utf-8 -*-
"""V317 Part 2 - JavaScript with interaction"""
d = 'C:\\Users\\Server\\.openclaw\\workspace\\Shop_vnext\\src\\Index.html'
f = open(d, 'a', encoding='utf-8')

# JavaScript - using raw strings for clarity
js = r"""
<script>
var DATA=null,JOBS=[],INV=[];
console.log("V317 started");
function st(t){var e=document.getElementById("st");if(e)e.textContent=t}
function se(t,d){console.error(t,d);document.getElementById("ld").style.display="none";var e=document.getElementById("eb");e.style.display="block";document.getElementById("ed").textContent=t+"\n\n"+JSON.stringify(d||"",null,2)}
function sr(h){document.getElementById("ld").style.display="none";document.getElementById("eb").style.display="none";var r=document.getElementById("rb");if(r){r.style.display="block";r.innerHTML=h}}
function om(h){document.getElementById("mc").innerHTML=h;document.getElementById("mo").classList.add("op")}
function cm(){document.getElementById("mo").classList.remove("op")}
function fj(id){for(var i=0;i<JOBS.length;i++){if(JOBS[i].id===id)return JOBS[i]}return null}
function es(s){if(!s)return"";return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}

// VIEW JOB
function vJob(id){
  var j=fj(id);if(!j){alert("ไม่พบงาน "+id);return}
  console.log("Viewing:",j);
  var h="<h2>"+j.id+" - "+es(j.customer)+"</h2>";
  h+="<div class=\"su\">"+es(j.symptom||"")+"</div>";
  h+="<div class=\"dt\">";
  h+="สถานะ: <b>"+j.status+"</b><br>";
  h+="ช่าง: "+(j.tech||"-")+"<br>";
  h+="สร้าง: "+(j.created||"-")+"<br>";
  if(j.folder)h+="โฟลเดอร์: <a href=\""+j.folder+"\" target=\"_blank\">เปิด</a>";
  h+="</div>";
  h+="<div class=\"ac\">";
  h+="<button class=\"b2 bb\" onclick=\"oSt('"+id+"')\">เปลี่ยนสถานะ</button>";
  h+="<button class=\"b2 bx\" onclick=\"eJob('"+id+"')\">แก้ไข</button>";
  if(j.folder)h+="<button class=\"b2 ba\" onclick=\"window.open('"+j.folder+"','_blank')\">โฟลเดอร์</button>";
  h+="</div>";
  om(h);
}

// STATUS CHANGE
function oSt(id){
  var j=fj(id);if(!j)return;
  console.log("Changing status for:",id);
  var h="<h2>เปลี่ยนสถานะ: "+id+"</h2>";
  h+="<div class=\"su\">"+j.customer+"</div>";
  h+="<p style=\"font-weight:600;margin-bottom:12px\">สถานะ: <span style=\"color:#1DB446\">"+j.status+"</span></p>";
  h+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">';
  h+="<button class=\"b2 ba\" onclick=\"cSt('"+id+"','รอดำเนินการ')\">รอดำเนินการ</button>";
  h+="<button class=\"b2 bb\" onclick=\"cSt('"+id+"','InProgress')\">กำลังดำเนินการ</button>";
  h+="<button class=\"b2 bp\" onclick=\"cSt('"+id+"','Completed')\">เสร็จสมบูรณ์</button>";
  h+="<button class=\"b2 bx\" onclick=\"cSt('"+id+"','ยกเลิก')\">ยกเลิก</button>";
  h+="</div>";
  h+="<button class=\"b2 bx\" onclick=\"cm()\">ปิด</button>";
  om(h);
}

function cSt(id,s){
  console.log("cSt:",id,s);
  google.script.run.withSuccessHandler(function(){
    alert("เปลี่ยนเป็น "+s+" แล้ว");cm();refresh();
  }).withFailureHandler(function(e){
    alert("ผิดพลาด: "+e.message);
  }).updateJobStatus({job_id:id,status:s,note:"เปลี่ยนจาก Dashboard"});
}

// EDIT JOB
function eJob(id){
  var j=fj(id);if(!j)return;
  console.log("Editing:",id);
  var h="<h2>แก้ไข: "+id+"</h2>";
  h+="<div class=\"su\">"+es(j.customer)+"</div>";
  h+="<label style=\"font-size:12px;font-weight:600;display:block;margin:8px 0 4px\">ชื่อลูกค้า</label>";
  h+="<input type=\"text\" id=\"en\" value=\""+es(j.customer)+"\">";
  h+="<label style=\"font-size:12px;font-weight:600;display:block;margin:8px 0 4px\">อาการ</label>";
  h+="<textarea id=\"es\" rows=\"3\">"+es(j.symptom||"")+"</textarea>";
  h+="<label style=\"font-size:12px;font-weight:600;display:block;margin:8px 0 4px\">ช่าง</label>";
  h+="<input type=\"text\" id=\"et\" value=\""+es(j.tech||"")+"\">";
  h+='<button class="btn" onclick="sv(\''+id+'\')">บันทึก</button>';
  h+='<button class="btn" style="background:#999" onclick="cm()">ยกเลิก</button>';
  om(h);
}

function sv(id){
  var d={name:document.getElementById("en").value,symptom:document.getElementById("es").value,tech:document.getElementById("et").value};
  if(!d.name){alert("ใส่ชื่อ");return}
  google.script.run.withSuccessHandler(function(){alert("แก้ไขสำเร็จ");cm();refresh()}).withFailureHandler(function(e){alert("ผิด: "+e.message)}).updateJobById(id,d);
}

// REFRESH
function refresh(){
  st("Refreshing...");
  google.script.run.withSuccessHandler(function(d){
    DATA=d;JOBS=(d&&d.jobs)||[];INV=(d&&d.inventory)||[];
    render(d);
  }).withFailureHandler(function(e){st("Fail: "+e.message)}).getDashboardData();
}

// INIT
setTimeout(function(){
  try{
    if(typeof google==="undefined"){se("Google Script ไม่พร้อม","เปิดผ่าน Web App URL");return}
    st("ดึงข้อมูล...");
    google.script.run
      .withSuccessHandler(function(d){
        DATA=d;JOBS=(d&&d.jobs)||[];INV=(d&&d.inventory)||[];
        console.log("Loaded. Jobs:",JOBS.length,"Items:",INV.length);
        render(d);
      })
      .withFailureHandler(function(e){se("getDashboardData() ผิดพลาด",e.message)})
      .getDashboardData();
  }catch(e){se("Unexpected",e.message)}
},300);

// RENDER
function render(d){
  var s=(d&&d.summary)||{};
  var jobs=(d&&d.jobs)||[];
  var inv=(d&&d.inventory)||[];
  var h="";

  // Tiles
  h+='<div class="tl">';
  h+='<div class="te"><div class="n am">'+(s.pending||0)+'</div><div class="l">รอดำเนินการ</div></div>';
  h+='<div class="te"><div class="n bl">'+(s.inProgress||0)+'</div><div class="l">กำลังทำ</div></div>';
  h+='<div class="te"><div class="n gr">'+(s.completed||0)+'</div><div class="l">เสร็จแล้ว</div></div>';
  h+='<div class="te"><div class="n rd">'+(s.lowStock||0)+'</div><div class="l">สต็อกต่ำ</div></div>';
  h+='</div>';

  // Info
  h+='<div class="c" style="margin:16px">';
  h+="<p>งาน: <b>"+(s.totalJobs||0)+"</b></p>";
  h+="<p>อะไหล่: <b>"+(s.totalItems||0)+"</b></p>";
  h+='<p style="color:#999;font-size:12px">อัปเดต: '+(s.date||"-")+'</p></div>';

  // Jobs with onclick
  h+='<div class="c" style="margin:16px">';
  h+='<h3 style="margin:8px">งานล่าสุด ('+jobs.length+')</h3>';
  for(var i=0;i<Math.min(jobs.length,30);i++){
    var j=jobs[i];
    var sc="";
    if(j.status.indexOf("\u0E23\u0E2D")===0)sc="am";
    else if(j.status.indexOf("\u0E01\u0E33")===0||j.status==="InProgress")sc="bl";
    else if(j.status.indexOf("\u0E22\u0E01")>-1)sc="rd";
    else sc="gr";
    h+='<div class="c jc '+sc+'" onclick="vJob(\''+j.id+'\')">';
    h+='<b>'+j.id+'</b> - '+es(j.customer)+'<br>';
    h+='<span class="'+sc+'">'+es(j.status)+'</span>';
    if(j.tech)h+=' | '+es(j.tech);
    if(j.created)h+=' | '+es(j.created);
    h+='</div>';
  }
  h+='</div>';

  // Inventory
  h+='<div class="c" style="margin:16px">';
  h+='<h3 style="margin:8px">สต็อก ('+inv.length+')</h3>';
  for(var k=0;k<Math.min(inv.length,20);k++){
    var it=inv[k];
    var clr=it.alert?"rd":"gr";
    h+='<div style="padding:8px 0;border-bottom:1px solid #eee">';
    h+='<span class="'+clr+'"><b>'+it.qty+'</b></span> '+es(it.name)+' ('+es(it.code)+')';
    h+='</div>';
  }
  h+='</div>';

  h+='<button class="btn" onclick="refresh()">รีเฟรช</button>';
  sr(h);
}

console.log("V317 loaded");
</script>
</body></html>
"""

f.write(js)
import os
f.close()
sz = os.path.getsize(d)
print(f"JS appended. Total: {sz} bytes")

import os
# Verify
with open(d, 'r', encoding='utf-8') as rf:
    c = rf.read()
    checks = [
        ('onclick="vJob', 'onclick="vJob' in c or "onclick=\"vJob" in c),
        ('onclick vJob', 'vJob' in c),
        ('function vJob', 'function vJob' in c),
        ('function oSt', 'function oSt' in c),
        ('function cSt', 'function cSt' in c),
        ('function eJob', 'function eJob' in c),
        ('function sv', 'function sv' in c),
        ('function cm', 'function cm()' in c),
        ('function om', 'function om(' in c),
        ('modal', 'id="mo"' in c),
        ('refresh', 'function refresh' in c),
        ('</body>', '</body></html>' in c),
        ('onclick on card', 'onclick="vJob' in c or "onclick=\"vJob('"+j.id+"')\"" in c),
    ]
    all_ok = True
    for name, ok in checks:
        s = 'OK' if ok else 'FAIL'
        if not ok: all_ok = False
        print(f"  {s}: {name}")
    if all_ok:
        print("ALL 13 CHECKS PASSED!")
    else:
        print("SOME CHECKS FAILED - need review")
