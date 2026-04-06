# -*- coding: utf-8 -*-
"""V321 Index.html — Job Timeline + Quick Note + Smart Filter + Mobile First"""
import os

d = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'Shop_vnext', 'src', 'Index.html')

# === CSS + HTML HEAD ===
html_header = '''<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<title>Comphone Dashboard V321</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:#f5f7f5;color:#222;min-height:100vh;-webkit-tap-highlight-color:transparent}
.hd{background:linear-gradient(135deg,#1DB446,#0e8a34);color:#fff;padding:11px 14px;text-align:center;position:fixed;top:0;left:0;right:0;z-index:10}
.hd h1{font-size:15px;font-weight:800}.hd .sub{font-size:10px;opacity:.85;margin-top:1px}
#ld{text-align:center;padding:80px 20px}
#ld .sp{width:40px;height:40px;border:3px solid #ddd;border-top:3px solid #1DB446;border-radius:50%;animation:sp .7s linear infinite;margin:0 auto 10px}
@keyframes sp{to{transform:rotate(360deg)}}
#ld p{font-size:14px;color:#666}
#eb{display:none;background:#ffeaea;border:2px solid #e55;padding:14px;margin:14px;border-radius:10px}
#eb h3{color:#c00;margin-bottom:6px} #eb pre{white-space:pre-wrap;font-size:12px;color:#600}
#rb{display:none;padding:0 0 70px}
#filter{background:#fff;border-radius:12px;padding:10px;margin:0 6px 8px;box-shadow:0 1px 6px rgba(0,0,0,.04)}
#filter .fl{font-size:10px;color:#888;margin-bottom:5px;font-weight:600}
#filter input,#filter select{width:100%;padding:8px 10px;border:1.5px solid #e5e5e5;border-radius:8px;font-size:12px;font-family:inherit;margin-bottom:5px}
#filter input:focus,#filter select:focus{border-color:#1DB446;outline:none}
#filter .row{display:flex;gap:5px} #filter .row>*{flex:1;margin-bottom:0}
.tl{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;padding:0 6px;margin-bottom:10px}
@media(max-width:360px){.tl{grid-template-columns:repeat(2,1fr)}}
.tt{background:#fff;border-radius:12px;padding:10px 5px;text-align:center;box-shadow:0 1px 5px rgba(0,0,0,.04)}
.tt .n{font-size:20px;font-weight:800} .tt .l{font-size:9px;color:#888;margin-top:1px}
.c1{color:#E65C00}.c2{color:#1565C0}.c3{color:#2E7D32}.c4{color:#C62828}
.ca{background:#fff;border-radius:10px;padding:10px;margin:0 6px 6px;box-shadow:0 1px 4px rgba(0,0,0,.03);font-size:11px}
.ca h3{margin:0 0 6px;font-size:12px;font-weight:700;color:#333}
.jc{background:#fff;border-radius:9px;padding:9px;margin:0 6px 5px;box-shadow:0 1px 3px rgba(0,0,0,.02);cursor:pointer;border:1px solid #eee}
.jc:active{background:#f2faf2;transform:scale(.985)}
.jc.a1{border-left:3px solid #E65C00}.jc.a2{border-left:3px solid #1565C0}.jc.a3{border-left:3px solid #2E7D32}.jc.a4{border-left:3px solid #C62828}
.jc .ji{font-size:10px;font-weight:800;color:#1DB446}
.jc .jb{font-size:9px;font-weight:600;padding:1px 5px;border-radius:5px;display:inline-block}
.jc .b1{background:#FFF3E0;color:#E65C00}.jc .b2{background:#E3F2FD;color:#1565C0}.jc .b3{background:#E8F5E9;color:#2E7D32}.jc .b4{background:#FFEBEE;color:#C62828}
.jc .jn{font-size:11px;font-weight:600;margin:1px 0}
.jc .jy{font-size:9px;color:#666;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.jc .jm{font-size:8px;color:#999;margin-top:2px}
.si{display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid #f0f0f0}
.si:last-child{border-bottom:none}
.si .sn{font-size:11px;font-weight:600}.si .sq{font-size:13px;font-weight:800;padding:2px 6px;border-radius:5px}
.si .sq.lo{background:#FFEBEE;color:#C62828}.si .sq.ok{background:#E8F5E9;color:#2E7D32}
.si .sc{font-size:9px;color:#999}
.btn{display:block;margin:6px;padding:11px;background:linear-gradient(135deg,#1DB446,#0e8a34);color:#fff;border:none;border-radius:9px;font-size:12px;font-weight:700;cursor:pointer;text-align:center;box-shadow:0 2px 8px rgba(29,180,70,.15)}
.btn:active{transform:scale(.97)}
.btn.ln{background:linear-gradient(135deg,#06C755,#05a848)}.btn.pu{background:linear-gradient(135deg,#6C63FF,#5A52E0)}.btn.or{background:linear-gradient(135deg,#FF9800,#F57C00)}
.b2{display:inline-block;margin:3px;padding:6px 10px;border:none;border-radius:7px;font-size:10px;font-weight:600;cursor:pointer;white-space:nowrap}
.bb{background:#1565C0;color:#fff}.ba{background:#E65C00;color:#fff}.bp{background:#7B1FA2;color:#fff}.bx{background:#999;color:#fff}
#mo{display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.5);z-index:100;justify-content:center;align-items:flex-start;padding:14px;overflow-y:auto}
#mo.op{display:flex}
#mb{background:#fff;border-radius:14px;padding:16px;width:100%;max-width:380px;margin-top:16px;box-shadow:0 10px 40px rgba(0,0,0,.15)}
#mb h2{font-size:14px;font-weight:800;margin-bottom:3px;color:#222}
#mb .su{font-size:11px;color:#666;margin-bottom:8px}
#mb .dt{font-size:10px;line-height:1.5;margin-bottom:10px;white-space:pre-line}
#mb .ac{display:flex;gap:5px;flex-wrap:wrap}
#mb .cx{position:absolute;top:8px;right:10px;background:none;border:none;font-size:16px;cursor:pointer;color:#999}
input[type=text],textarea{width:100%;padding:8px 10px;border:1.5px solid #e5e5e5;border-radius:7px;font-size:12px;font-family:inherit}
input:focus,textarea:focus{border-color:#1DB446;outline:none}
textarea{resize:vertical;min-height:44px}
.tline{position:relative;padding-left:16px;margin:6px 0}
.tline:before{content:'';position:absolute;left:4px;top:0;bottom:0;width:2px;background:#e0e0e0}
.ti{position:relative;padding:5px 0 5px 12px;border-bottom:1px solid #f7f7f7}
.ti:last-child{border-bottom:none}
.ti:before{content:'';position:absolute;left:-15px;top:8px;width:8px;height:8px;border-radius:50%;background:#1DB446;border:2px solid #fff}
.ti .ts{font-size:9px;color:#999;font-weight:600}
.ti .tn{font-size:10px;font-weight:700;color:#333;margin-top:1px}
.ti .td{font-size:10px;color:#666;margin-top:1px}
.nr{text-align:center;padding:16px;color:#999;font-size:11px}
.qab{position:fixed;bottom:0;left:0;right:0;background:#fff;border-top:1px solid #e5e5e5;padding:5px;display:flex;gap:4px;box-shadow:0 -2px 8px rgba(0,0,0,.04);z-index:50}
.qab .q{flex:1;padding:8px 3px;border:none;border-radius:7px;font-size:9px;font-weight:700;cursor:pointer;text-align:center}
.qab .q:active{transform:scale(.95)}
.q.q1{background:#E8F5E9;color:#2E7D32}.q.q2{background:#E3F2FD;color:#1565C0}.q.q3{background:#FFF3E0;color:#E65C00}.q.q4{background:#F3E5F5;color:#7B1FA2}
</style></head>

<body>
<div class="hd"><h1>📱 Comphone V321</h1><div class="sub" id="clock">...</div></div>
<div class="ct"><div id="ld"><div class="sp"></div><p>ระบบกำลังโหลด...</p><p style="font-size:10px;color:#999;margin-top:4px" id="st">เริ่มต้น...</p></div>
<div id="eb"><h3>⚠️ เกิดข้อผิดพลาด</h3><pre id="ed"></pre><button class="btn" onclick="location.reload()">🔄 ลองใหม่</button></div>
<div id="rb"></div></div>
<div id="mo" onclick="if(event.target===this)cm()"><div id="mb" style="position:relative"><button class="cx" onclick="cm()">✕</button><div id="mc"></div></div></div>
<div class="qab" id="qab" style="display:none">
  <div class="q q1" onclick="openNewJob()">➕ เปิดงาน</div>
  <div class="q q2" onclick="sendLineSummary()">💚 สรุป</div>
  <div class="q q3" onclick="showQuickNote()">📝 หมายเหตุ</div>
  <div class="q q4" onclick="refresh()">🔄 รีเฟรช</div>
</div>

<script>
var DATA=null,JOBS=[],INV=[],CUR_FILT=null,CUR_VIEW=null;
function st(t){var e=document.getElementById("st");if(e)e.textContent=t}
function se(t,d){console.error(t,d);document.getElementById("ld").style.display="none";var e=document.getElementById("eb");e.style.display="block";document.getElementById("ed").textContent=t}
function sr(h){document.getElementById("ld").style.display="none";document.getElementById("eb").style.display="none";var r=document.getElementById("rb");if(r){r.style.display="block";r.innerHTML=h;document.getElementById("qab").style.display="flex"}}
function om(h){document.getElementById("mc").innerHTML=h;document.getElementById("mo").classList.add("op")}
function cm(){document.getElementById("mo").classList.remove("op")}
function fj(id){for(var i=0;i<JOBS.length;i++){if(JOBS[i].id===id)return JOBS[i]}return null}
function es(s){if(!s)return"";return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}
function gs(s){if(!s)return"";if(s.indexOf("\\u0E23\\u0E2D")===0)return"a1";if(s==="InProgress"||s.indexOf("\\u0E01\\u0E33")===0)return"a2";if(s.indexOf("\\u0E22\\u0E01")>-1)return"a4";return"a3"}
function gsl(s){if(!s)return"📋";if(s.indexOf("\\u0E23\\u0E2D")===0)return"⏳ รอ";if(s==="InProgress"||s.indexOf("\\u0E01\\u0E33")===0)return"🔄 กำลังทำ";if(s.indexOf("\\u0E22\\u0E01")>-1)return"❌ ยกเลิก";return"✅ เสร็จแล้ว"}

function render(d){
  try{
    var s=(d&&d.summary)||{};var jobs=(d&&d.jobs)||[];var inv=(d&&d.inventory)||[];
    var h='<div class="tl">';
    h+='<div class="tt"><div class="n c1">'+(s.pending||0)+'</div><div class="l">⏳ รอดำเนินการ</div></div>';
    h+='<div class="tt"><div class="n c2">'+(s.inProgress||0)+'</div><div class="l">🔄 กำลังทำ</div></div>';
    h+='<div class="tt"><div class="n c3">'+(s.completed||0)+'</div><div class="l">✅ เสร็จแล้ว</div></div>';
    h+='<div class="tt"><div class="n c4">'+(s.lowStock||0)+'</div><div class="l">🚨 สต็อกต่ำ</div></div></div>';

    // Filter bar
    h+='<div id="filter"><div class="fl">🔍 ค้นหางาน</div>';
    h+='<input type="text" id="fsearch" placeholder="พิมพ์ชื่อลูกค้า, JobID, อาการ..." oninput="applyFilt()">';
    h+='<div class="row"><select id="ftech" onchange="applyFilt()"><option value="">ช่างทั้งหมด</option>';
    // Extract unique tech names
    var techs={},jc=0;for(var ti=0;ti<Math.min(jobs.length,30);ti++){var jt=jobs[ti].tech;if(jt&&jt!="-"){techs[jt]=1;jc++}}
    for(var k in techs)h+='<option>'+k+'</option></div>';
    h+='<div class="row"><select id="fstat" onchange="applyFilt()"><option value="">สถานะทั้งหมด</option>';
    h+='<option value="รอดำเนินการ">⏳ รอดำเนินการ</option><option value="InProgress">🔄 กำลังทำ</option><option value="Completed">✅ เสร็จแล้ว</option><option value="ยกเลิก">❌ ยกเลิก</option></select></div>';
    h+='<div class="cnt" id="fcnt"></div></div>';

    // Job list
    h+='<div class="ca"><h3>📋 งานล่าสุด</h3>';
    for(var i=0;i<Math.min(jobs.length,50);i++){
      var j=jobs[i];var sc=gs(j.status);
      h+='<div class="jc '+sc+'" data-jid="'+j.id+'" data-tech="'+(j.tech||'')+'" data-stat="'+j.status+'" data-cust="'+j.customer+'" data-symp="'+(j.symptom||'')+'" onclick="vJob(\\''+j.id+'\\')">';
      h+='<span class="ji">'+j.id+'</span> <span class="jb b'+(sc.charAt(1)||'3')+'">'+gsl(j.status)+'</span>';
      h+='<div class="jn">'+es(j.customer)+'</div>';
      if(j.symptom)h+='<div class="jy">'+es(j.symptom)+'</div>';
      h+='<div class="jm">🔧 '+(j.tech||'-')+(j.created?' 🕐 '+j.created:'')+'</div></div>';
    }
    h+='</div>';

    // Stock
    h+='<div class="ca"><h3>📦 คลังสินค้า</h3>';
    for(var k=0;k<Math.min(inv.length,25);k++){
      var it=inv[k];
      h+='<div class="si"><div><div class="sn">'+es(it.name)+'</div><div class="sc">'+es(it.code)+'</div></div><div class="sq '+(it.alert?'lo':'ok')+'">'+it.qty+'</div></div>';
    }
    h+='</div>';

    h+='<button class="btn ln" onclick="sendLineSummary()">💚 ส่งสรุปเข้า LINE</button>';
    h+='<button class="btn pu" onclick="openNewJob()">➕ เปิดงานใหม่</button>';
    sr(h);applyFilt();
  }catch(e){se("Render error",e.message)}
}

function applyFilt(){
  var cards=document.querySelectorAll('.jc');
  var se2=document.getElementById('fsearch');
  var st2=document.getElementById('ftech');
  var st3=document.getElementById('fstat');
  if(!se2)return;
  var q=se2.value.toLowerCase();
  var t=st2.value;
  var s=st3.value;
  var shown=0;
  for(var i=0;i<cards.length;i++){
    var c=cards[i];
    var match=true;
    if(q){var cc=c.getAttribute('data-cust').toLowerCase();var cj=c.getAttribute('data-jid').toLowerCase();var cs2=c.getAttribute('data-symp').toLowerCase();if(cc.indexOf(q)===-1&&cj.indexOf(q)===-1&&cs2.indexOf(q)===-1)match=false}
    if(t&&c.getAttribute('data-tech')!==t)match=false;
    if(s&&c.getAttribute('data-stat')!==s)match=false;
    if(match){c.style.display='block';shown++}else{c.style.display='none'}
  }
  var cnt=document.getElementById('fcnt');
  if(cnt)cnt.textContent='แสดง '+shown+' งาน';
}

function refresh(){st("Refreshing...");google.script.run.withSuccessHandler(function(d){DATA=d;JOBS=(d&&d.jobs)||[];INV=(d&&d.inventory)||[];if(DATA&&DATA.summary&&DATA.summary.date)document.getElementById("clock").textContent=DATA.summary.date;render(d)}).withFailureHandler(function(e){st("Fail: "+e.message)}).getDashboardData()}

function vJob(id){
  var j=fj(id);if(!j){alert("ไม่พบงาน "+id);return}
  CUR_VIEW=id;
  var h="<h2>📋 "+j.id+"</h2>";
  h+="<div class='su'>"+es(j.customer)+"</div>";
  h+="<div class='dt'>📌 "+es(j.symptom||"-")+"\\n📝 "+j.status+"\\n🔧 "+(j.tech||"-")+"\\n🕐 "+(j.created||"-")+"</div>";
  h+="<div class='ac'>";
  h+="<div class='b2 bb' onclick=\"oSt('"+id+"')\">เปลี่ยนสถานะ</div>";
  h+="<div class='b2 bx' onclick=\"eJob('"+id+"')\">แก้ไข</div>";
  if(j.folder)h+="<div class='b2 ba' onclick=\"window.open('"+j.folder+"','_blank')\">📁 โฟลเดอร์</div>";
  h+="</div><hr style='margin:10px 0'>";
  h+="<div class='fl'>📝 หมายเหตุด่วน</div>";
  h+="<textarea id='qnote' rows='2' placeholder='พิมพ์หมายเหตุ... เช่น ลูกค้าขอเพิ่มจุด'></textarea>";
  h+="<div class='b2 ba' onclick=\"addNote('"+id+"')\">💾 บันทึกหมายเหตุ</div>";
  h+="<hr style='margin:10px 0'>";
  h+="<div class='fl'>📜 ประวัติงาน</div>";
  h+="<div class='tline' id='jtl'><div class='nr'>กำลังโหลด...</div></div>";
  om(h);
  // Load timeline
  google.script.run.withSuccessHandler(function(r){
    var el=document.getElementById('jtl');
    if(el&&r&&r.timeline){
      if(r.timeline.length===0)el.innerHTML="<div class='nr'>ยังไม่ไม่มีบันทึก</div>";
      else{var x="";for(var i=0;i<Math.min(r.timeline.length,20);i++){var e2=r.timeline[i];x+="<div class='ti'><div class='ts'>"+e2.ts+"</div><div class='tn'>"+e2.action+"</div><div class='td'>"+e2.detail+"</div><div class='tu'>โดย: "+e2.user+"</div></div>"};el.innerHTML=x}
    }
  }).getJobTimeline(id);
}

function addNote(id){
  var n=document.getElementById('qnote');if(!n||!n.value){alert("พิมพ์หมายเหตุก่อน")}
  google.script.run.withSuccessHandler(function(){alert("✅ บันทึกหมายเหตุแล้ว");cm();refresh()}).withFailureHandler(function(e){alert("❌ "+e.message)}).addQuickNote(id,n.value,"โหน่ง");
}

function showQuickNote(){
  var h="<h2>📝 หมายเหตุด่วน</h2>";
  h+="<div class='su'>เพิ่มหมายเหตุให้กับงาน</div>";
  h+="<label style='font-size:11px;font-weight:600;margin-bottom:3px;display:block'>Job ID</label>";
  h+="<input type='text' id='qnjob' placeholder='เช่น J0001'>";
  h+="<label style='font-size:11px;font-weight:600;margin:6px 0 3px;display:block'>หมายเหตุ</label>";
  h+="<textarea id='qnnote' rows='3' placeholder='ข้อความด่วน...'></textarea>";
  h+="<button class='btn' onclick=\"addQuickNote2()\">💾 บันทึก</button>";
  h+="<button class='btn' style='background:#999' onclick='cm()'>ยกเลิก</button>";
  om(h);
}

function addQuickNote2(){
  var id=document.getElementById('qnjob').value;
  var n=document.getElementById('qnnote').value;
  if(!id){alert("ใส่ Job ID");return}
  if(!n){alert("ใส่หมายเหตุ");return}
  google.script.run.withSuccessHandler(function(){alert("✅ บันทึกแล้ว");cm();refresh()}).withFailureHandler(function(e){alert("❌ "+e.message)}).addQuickNote(id,n,"โหน่ง");
}

function openNewJob(){
  var h="<h2>➕ เปิดงานใหม่</h2>";
  h+="<input type='text' id='nn' placeholder='ชื่อลูกค้า *' style='margin-top:6px'>";
  h+="<input type='text' id='np' placeholder='เบอร์โทร' style='margin-top:5px'>";
  h+="<textarea id='ns' rows='2' placeholder='อาการ/รายละเอียด *' style='margin-top:5px'></textarea>";
  h+="<input type='text' id='nt' placeholder='ช่าง' style='margin-top:5px'>";
  h+="<button class='btn' onclick='sj()'>🚀 เปิดงาน</button>";
  h+="<button class='btn' style='background:#999' onclick='cm()'>ยกเลิก</button>";
  om(h);
}

function sj(){
  var d={name:document.getElementById('nn').value,phone:document.getElementById('np').value,symptom:document.getElementById('ns').value,tech:document.getElementById('nt').value};
  if(!d.name){alert("ใส่ชื่อลูกค้า");return}
  google.script.run.withSuccessHandler(function(r){alert("🎉 เปิดงาน: "+r.job_id);cm();refresh()}).withFailureHandler(function(e){alert("❌ "+e.message)}).openJob(d);
}

function sendLineSummary(){
  st("กำลังส่ง...");
  google.script.run.withSuccessHandler(function(r){if(r&&r.success)alert("✅ ส่งเข้า LINE สำเร็จ!");else alert("❌ "+JSON.stringify(r));st("");refresh()}).withFailureHandler(function(e){alert("❌ "+e.message);st("")}).sendDashboardSummary();
  cm();
}

function oSt(id){
  var j=fj(id);if(!j)return;
  var h="<h2>📝 เปลี่ยนสถานะ</h2><div class='su'>"+id+" - "+es(j.customer)+"</div>";
  h+="<div style='font-weight:600;margin-bottom:8px'>ปัจจุบัน: "+j.status+"</div>";
  h+="<div class='b2 ba' onclick=\"cSt('"+id+"','รอดำเนินการ')\">⏳ รอดำเนินการ</div>";
  h+="<div class='b2 bb' onclick=\"cSt('"+id+"','InProgress')\">🔄 กำลังทำ</div>";
  h+="<div class='b2 bp' onclick=\"cSt('"+id+"','Completed')\">✅ เสร็จสมบูรณ์</div>";
  h+="<div class='b2 bx' onclick=\"cSt('"+id+"','ยกเลิก')\">❌ ยกเลิก</div>";
  h+="<div class='b2 bx' onclick='cm()'>ปิด</div>";
  om(h);
}

function cSt(id,s){
  google.script.run.withSuccessHandler(function(){cm();alert("✅ "+s);refresh()}).withFailureHandler(function(e){alert("❌ "+e.message)}).updateJobStatus({job_id:id,status:s,note:"Dashboard"});
}

function eJob(id){
  var j=fj(id);if(!j)return;
  var h="<h2>✏️ แก้ไข: "+id+"</h2><div class='su'>"+es(j.customer)+"</div>";
  h+="<input type='text' id='en' value='"+es(j.customer)+"' style='margin-top:5px'>";
  h+="<textarea id='es' rows='2' style='margin-top:5px'>"+es(j.symptom||"")+"</textarea>";
  h+="<input type='text' id='et' value='"+es(j.tech||"")+"' style='margin-top:5px'>";
  h+="<button class='btn' onclick=\"sv('"+id+"')\">💾 บันทึก</button>";
  h+="<button class='btn' style='background:#999' onclick='cm()'>ยกเลิก</button>";
  om(h);
}

function sv(id){
  var d={name:document.getElementById('en').value,symptom:document.getElementById('es').value,tech:document.getElementById('et').value};
  google.script.run.withSuccessHandler(function(){alert("✅ แก้ไขแล้ว");cm();refresh()}).withFailureHandler(function(e){alert("❌ "+e.message)}).updateJobById(id,d);
}

setTimeout(function(){
  try{
    if(typeof google==="undefined"){se("Google Script ไม่พร้อม","เปิดผ่าน Web App URL เท่านั้น");return}
    st("ดึงข้อมูล...");
    google.script.run.withSuccessHandler(function(d){
      try{DATA=d;JOBS=(d&&d.jobs)||[];INV=(d&&d.inventory)||[];if(DATA&&DATA.summary&&DATA.summary.date)document.getElementById("clock").textContent=DATA.summary.date;console.log("Loaded:",JOBS.length,"jobs,",INV.length,"items");render(d)}catch(e){se("Render",e.message)}
    }).withFailureHandler(function(e){se("getDashboardData",e.message)}).getDashboardData();
  }catch(e){se("Unexpected",e.message)}
},300);

console.log("V321 loaded");
</script>
</body>
</html>
'''

with open(d, 'w', encoding='utf-8') as f:
    f.write(html_header)

print(f"V321 Index.html written: {os.path.getsize(d)/1024:.1f} KB")

# Validate
with open(d, 'r', encoding='utf-8') as f:
    c = f.read()

checks = [
    ("Filter bar", "fsearch" in c),
    ("Tech filter", "ftech" in c),
    ("Status filter", "fstat" in c),
    ("applyFilt", "applyFilt" in c),
    ("Job Timeline", "jtl" in c),
    ("getJobTimeline", "getJobTimeline" in c),
    ("Quick Note button", "showQuickNote" in c),
    ("Quick Note input", "qnote" in c),
    ("addQuickNote", "addQuickNote" in c),
    ("Quick Actions Bar", "qab" in c),
    ("Mobile CSS", "max-width:360px" in c),
    ("Single <script>", c.count("<script>") == 1),
    ("Single </script>", c.count("</script>") == 1),
    ("V321 in title", "V321" in c),
]
ok = sum(1 for _,v in checks if v)
for n,v in checks:
    print(f"  {'✅' if v else '❌'} {n}")
print(f"\n{ok}/{len(checks)} checks passed")