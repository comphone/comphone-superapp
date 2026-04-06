# -*- coding: utf-8 -*-
"""V319 Part B — HTML body + JS + Modal + LINE button"""
d = 'C:\\Users\\Server\\.openclaw\\workspace\\Shop_vnext\\src\\Index.html'
f = open(d, 'a', encoding='utf-8')

html = r"""
<div class="hd">
  <h1>📱 Comphone Dashboard</h1>
  <div class="sub" id="clock">...</div>
</div>
<div class="ct">
  <div id="ld"><div class="sp"></div><p>ระบบกำลังโหลด...</p><p class="hint" id="st">เริ่มต้น...</p></div>
  <div id="eb"><h3>⚠️ เกิดข้อผิดพลาด</h3><pre id="ed"></pre><button class="btn" onclick="location.reload()">🔄 ลองใหม่</button></div>
  <div id="rb"></div>
</div>

<!-- Modal -->
<div id="mo" onclick="if(event.target===this)cm()">
  <div id="mb" style="position:relative">
    <button class="cx" onclick="cm()">&times;</button>
    <div id="mc"></div>
  </div>
</div>

<script>
// ===== STATE =====
var DATA=null,JOBS=[],INV=[];
var LINE_MSG='';
console.log("V319 loaded");

// ===== UTILS =====
function st(t){var e=document.getElementById("st");if(e)e.textContent=t}
function se(t,d){
  console.error(t,d);
  document.getElementById("ld").style.display="none";
  document.getElementById("eb").style.display="block";
  document.getElementById("ed").textContent=t+"\n\n"+JSON.stringify(d||"",null,2);
}
function sr(h){
  document.getElementById("ld").style.display="none";
  document.getElementById("eb").style.display="none";
  var r=document.getElementById("rb");
  if(r){r.style.display="block";r.innerHTML=h}
}
function om(h){
  document.getElementById("mc").innerHTML=h;
  document.getElementById("mo").classList.add("op");
}
function cm(){document.getElementById("mo").classList.remove("op")}
function fj(id){for(var i=0;i<JOBS.length;i++){if(JOBS[i].id===id)return JOBS[i]}return null}
function es(s){if(!s)return"";return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}
function gs(s){
  if(!s)return"";
  if(s.indexOf("\u0E23\u0E2D")===0)return "am";
  if(s==="InProgress"||s.indexOf("\u0E01\u0E33")===0)return "bl";
  if(s.indexOf("\u0E22\u0E01")>-1)return "rd";
  return"gr";
}
function gsl(s){
  if(!s)return"📋";
  if(s.indexOf("\u0E23\u0E2D")===0)return"⏳ รอ";
  if(s==="InProgress"||s.indexOf("\u0E01\u0E33")===0)return"🔄 กำลังทำ";
  if(s.indexOf("\u0E22\u0E01")>-1)return"❌ ยกเลิก";
  return"✅ เสร็จแล้ว";
}

// ===== INIT =====
setTimeout(function(){
  try{
    if(typeof google==="undefined"){se("Google Script ไม่พร้อม","เปิดผ่าน Web App URL เท่านั้น");return}
    st("ดึงข้อมูล...");
    google.script.run
      .withSuccessHandler(function(d){
        try{
          DATA=d;JOBS=(d&&d.jobs)||[];INV=(d&&d.inventory)||[];
          if(DATA&&DATA.summary&&DATA.summary.date)document.getElementById("clock").textContent=DATA.summary.date;
          console.log("Loaded. Jobs:",JOBS.length,"Items:",INV.length);
          render(d);
        }catch(e){se("Render failed",e.message)}
      })
      .withFailureHandler(function(e){se("getDashboardData() ผิดพลาด",e.message)})
      .getDashboardData();
  }catch(e){se("Unexpected",e.message)}
},300);

// ===== RENDER =====
function render(d){
  try{
    var s=(d&&d.summary)||{};
    var jobs=(d&&d.jobs)||[];
    var inv=(d&&d.inventory)||[];
    var h="";

    // Tiles
    h+='<div class="tl">';
    h+='<div class="te"><div class="n am">'+(s.pending||0)+'</div><div class="l">⏳ รอดำเนินการ</div></div>';
    h+='<div class="te"><div class="n bl">'+(s.inProgress||0)+'</div><div class="l">🔄 กำลังทำ</div></div>';
    h+='<div class="te"><div class="n gr">'+(s.completed||0)+'</div><div class="l">✅ เสร็จแล้ว</div></div>';
    h+='<div class="te"><div class="n rd">'+(s.lowStock||0)+'</div><div class="l">🚨 สต็อกต่ำ</div></div>';
    h+='</div>';

    // Info
    h+='<div class="ca">';
    h+="<h3>📊 ข้อมูลรวม</h3>";
    h+='<div class="info"><span class="lb">งานทั้งหมด</span><span class="vl">'+(s.totalJobs||0)+' งาน</span></div>';
    h+='<div class="info"><span class="lb">อะไหล่ในระบบ</span><span class="vl">'+(s.totalItems||0)+' รายการ</span></div>';
    h+='<div class="info"><span class="lb">อัปเดตล่าสุด</span><span class="vl" style="color:#999;font-size:12px">'+(s.date||"-")+'</span></div>';
    h+='</div>';

    // Jobs
    h+='<div class="ca"><h3>📋 งานล่าสุด ('+jobs.length+')</h3>';
    for(var i=0;i<Math.min(jobs.length,30);i++){
      var j=jobs[i];var sc=gs(j.status);
      h+='<div class="jc '+sc+'" onclick="vJob(\''+j.id+'\')">';
      h+='<span class="jid">'+j.id+'</span> ';
      h+='<span class="jst '+sc+'">'+gsl(j.status)+'</span>';
      h+='<div class="jnm">'+es(j.customer)+'</div>';
      if(j.symptom)h+='<div style="font-size:12px;color:#666;margin:2px 0;line-clamp:1;overflow:hidden;text-overflow:ellipsis">'+es(j.symptom)+'</div>';
      h+='<div class="jmeta">';
      if(j.tech)h+='🔧 '+es(j.tech);
      if(j.created)h+=' 🕐 '+es(j.created);
      h+='</div></div>';
    }
    h+='</div>';

    // Stock
    h+='<div class="ca"><h3>📦 สต็อก ('+inv.length+')</h3>';
    for(var k=0;k<Math.min(inv.length,20);k++){
      var it=inv[k];var lo=it.alert;
      h+='<div class="si">';
      h+='<div><div class="sn">'+es(it.name)+'</div><div class="sc">'+es(it.code)+'</div></div>';
      h+='<div class="sq '+(lo?"lo":"ok")+'">'+it.qty+'</div>';
      h+='</div>';
    }
    h+='</div>';

    // Action buttons
    h+='<button class="btn" onclick="refresh()">🔄 รีเฟรชข้อมูล</button>';
    h+='<button class="btn ln" onclick="sendLineSummary()">💚 ส่งสรุปเข้า LINE</button>';
    h+='<button class="btn" style="background:linear-gradient(135deg,#6C63FF,#5A52E0)" onclick="openNewJob()">➕ เปิดงานใหม่</button>';

    sr(h);
  }catch(e){se("Render error",e.message)}
}

function refresh(){
  st("Refreshing...");
  google.script.run.withSuccessHandler(function(d){
    try{
      DATA=d;JOBS=(d&&d.jobs)||[];INV=(d&&d.inventory)||[];
      if(DATA&&DATA.summary&&DATA.summary.date)document.getElementById("clock").textContent=DATA.summary.date;
      render(d);
    }catch(e){se("Refresh render",e.message)}
  }).withFailureHandler(function(e){st("Fail: "+e.message)}).getDashboardData();
}

// ===== VIEW JOB =====
function vJob(id){
  var j=fj(id);if(!j){alert("ไม่พบงาน "+id);return}
  console.log("View:",id);
  var h="<h2>📋 "+j.id+"</h2>";
  h+="<div class=\"su\">"+es(j.customer)+"</div>";
  h+="<div class=\"dt\">";
  h+="📌 อาการ: "+es(j.symptom||"-")+"\n";
  h+="📊 สถานะ: <b>"+j.status+"</b>\n";
  h+="🔧 ช่าง: "+(j.tech||"-")+"\n";
  h+="🕐 สร้าง: "+(j.created||"-")+"\n";
  h+="📁 โฟลเดอร์: "+(j.folder?'<a href="'+j.folder+'" target="_blank">เปิดดู</a>':"ไม่มี");
  h+="</div>";
  h+="<div class=\"ac\">";
  h+='<button class="b2 bb" onclick="oSt(\''+id+'\')">📝 เปลี่ยนสถานะ</button>';
  h+='<button class="b2 bx" onclick="eJob(\''+id+'\')">✏️ แก้ไข</button>';
  if(j.folder)h+='<button class="b2 ba" onclick="window.open(\''+j.folder+'\',\'_blank\')">📁 โฟลเดอร์</button>';
  h+='</div>';
  om(h);
}

// ===== STATUS CHANGE =====
function oSt(id){
  var j=fj(id);if(!j)return;
  console.log("Status:",id);
  var h="<h2>📝 เปลี่ยนสถานะ</h2>";
  h+="<div class=\"su\">"+j.id+" — "+es(j.customer)+"</div>";
  h+="<p style=\"font-weight:600;margin-bottom:12px\">ปัจจุบัน: <span style=\"color:#1DB446\">"+j.status+"</span></p>";
  h+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">';
  h+='<button class="b2 ba" onclick="cSt(\''+id+'\',\'\u0E23\u0E2D\u0E14\u0E33\u0E40\u0E19\u0E34\u0E19\u0E01\u0E32\u0E23\')">⏳ รอดำเนินการ</button>';
  h+='<button class="b2 bb" onclick="cSt(\''+id+'\','+'\'InProgress\'">🔄 กำลังดำเนินการ</button>';
  h+='<button class="b2 bp" onclick="cSt(\''+id+'\','+'\'Completed\')">✅ เสร็จสมบูรณ์</button>';
  h+='<button class="b2 bx" onclick="cSt(\''+id+'\','+'\'\u0E22\u0E01\u0E40\u0E25\u0E34\u0E01\')">❌ ยกเลิก</button>';
  h+="</div>";
  h+='<button class="b2 bx" onclick="cm()">ปิด</button>';
  om(h);
}

function cSt(id,s){
  console.log("Change:",id,s);
  google.script.run.withSuccessHandler(function(){
    cm();
    alert("✅ เปลี่ยนเป็น "+s+" แล้ว");
    refresh();
  }).withFailureHandler(function(e){
    alert("❌ ผิดพลาด: "+e.message);
  }).updateJobStatus({job_id:id,status:s,note:"เปลี่ยนจาก Dashboard"});
}

// ===== EDIT JOB =====
function eJob(id){
  var j=fj(id);if(!j)return;
  console.log("Edit:",id);
  var h="<h2>✏️ แก้ไข: "+id+"</h2>";
  h+="<div class=\"su\">"+es(j.customer)+"</div>";
  h+='<label style="font-size:12px;font-weight:600;display:block;margin:8px 0 4px">ชื่อลูกค้า</label>';
  h+='<input type="text" id="en" value="'+es(j.customer)+'">';
  h+='<label style="font-size:12px;font-weight:600;display:block;margin:8px 0 4px">อาการ</label>';
  h+='<textarea id="es" rows="3">'+es(j.symptom||"")+'</textarea>';
  h+='<label style="font-size:12px;font-weight:600;display:block;margin:8px 0 4px">ช่าง</label>';
  h+='<input type="text" id="et" value="'+es(j.tech||"")+'">';
  h+='<button class="btn" onclick="sv(\''+id+'\')">💾 บันทึก</button>';
  h+='<button class="btn" style="background:#999" onclick="cm()">ยกเลิก</button>';
  om(h);
}

function sv(id){
  var d={name:document.getElementById("en").value,symptom:document.getElementById("es").value,tech:document.getElementById("et").value};
  if(!d.name){alert("⚠️ กรุณาใส่ชื่อลูกค้า");return}
  google.script.run.withSuccessHandler(function(){
    alert("✅ แก้ไขสำเร็จ");cm();refresh();
  }).withFailureHandler(function(e){
    alert("❌ ผิดพลาด: "+e.message);
  }).updateJobById(id,d);
}

// ===== OPEN NEW JOB =====
function openNewJob(){
  var h="<h2>➕ เปิดงานใหม่</h2>";
  h+='<label style="font-size:12px;font-weight:600;display:block;margin:8px 0 4px">ชื่อลูกค้า <span style="color:red">*</span></label>';
  h+='<input type="text" id="nn" placeholder="เช่น รร.ชุมชนสว่าง">';
  h+='<label style="font-size:12px;font-weight:600;display:block;margin:8px 0 4px">เบอร์โทร</label>';
  h+='<input type="text" id="np" placeholder="08X-XXX-XXXX">';
  h+='<label style="font-size:12px;font-weight:600;display:block;margin:8px 0 4px">อาการ/รายละเอียด <span style="color:red">*</span></label>';
  h+='<textarea id="ns" rows="3" placeholder="ระบุอาการหรือรายละเอียดงาน"></textarea>';
  h+='<label style="font-size:12px;font-weight:600;display:block;margin:8px 0 4px">ช่าง</label>';
  h+='<input type="text" id="nt" placeholder="ชื่อช่าง">';
  h+='<button class="btn" onclick="sj()">🚀 เปิดงาน</button>';
  h+='<button class="btn" style="background:#999" onclick="cm()">ยกเลิก</button>';
  om(h);
}

function sj(){
  var d={name:document.getElementById("nn").value,phone:document.getElementById("np").value,symptom:document.getElementById("ns").value,tech:document.getElementById("nt").value};
  if(!d.name){alert("⚠️ ใส่ชื่อลูกค้า");return}
  if(!d.symptom){alert("⚠️ ระบุอาการ");return}
  google.script.run.withSuccessHandler(function(r){
    alert("🎉 เปิดงานสำเร็จ: "+r.job_id);
    cm();refresh();
  }).withFailureHandler(function(e){alert("❌ ผิดพลาด: "+e.message)}).openJob(d);
}

// ===== LINE SUMMARY =====
function sendLineSummary(){
  if(CONFIRM("ส่งสรุปสถานะงานเข้ากลุ่ม LINE ใช่ไหม?")){
    google.script.run.withSuccessHandler(function(r){
      if(r&&r.success)alert("✅ ส่งสรุปเข้า LINE สำเร็จ!");
      else alert("❌ ส่งไม่สำเร็จ: "+JSON.stringify(r));
    }).withFailureHandler(function(e){alert("❌ Error: "+e.message)}).sendDashboardSummary();
  }
}

function CONFIRM(q){
  var h="<h2>💚 ส่งสรุป LINE</h2>";
  h+="<div class=\"dt\">"+q+"</div>";
  h+='<button class="btn ln" onclick="doLineSend()">✅ ส่งเลย</button>';
  h+='<button class="btn" style="background:#999" onclick="cm()">ยกเลิก</button>';
  om(h);
  return false;
}

function doLineSend(){
  cm();
  st("กำลังส่งสรุปเข้า LINE...");
  google.script.run.withSuccessHandler(function(r){
    if(r&&r.success)alert("✅ ส่งสรุปเข้า LINE สำเร็จ!");
    else alert("❌ "+JSON.stringify(r));
    st("");
    refresh();
  }).withFailureHandler(function(e){
    alert("❌ Error: "+e.message);
    st("");
  }).sendDashboardSummary();
}

console.log("V319 Full loaded");
</script>
</body>
</html>
"""

f.write(html)
f.close()

import os
sz = os.path.getsize(d)
print(f"V319 complete: {sz} bytes")

# Verify
with open(d, 'r', encoding='utf-8') as rf:
    c = rf.read()
    checks = [
        ('V319', 'V319' in c),
        ('sendLineSummary', 'sendLineSummary' in c),
        ('sendDashboardSummary', 'sendDashboardSummary' in c),
        ('doLineSend', 'doLineSend' in c),
        ('onclick vJob', "onclick=\"vJob('" in c),
        ('onclick oSt', "oSt('" in c),
        ('openNewJob', 'openNewJob' in c),
        ('refresh fn', 'function refresh' in c),
        ('modal', 'id="mo"' in c),
        ('single script', c.count('<script>') == 1),
        ('single /script', c.count('</script>') == 1),
        ('single body', c.count('<body>') == 1),
        ('single /html', c.count('</html>') == 1),
    ]
    for name, ok in checks:
        print(f"  {'OK' if ok else 'FAIL'}: {name}")
    passed = sum(1 for _,ok in checks if ok)
    print(f"\n✅ {passed}/{len(checks)} checks passed")