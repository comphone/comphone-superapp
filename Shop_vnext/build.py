#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Builder script - generates Index.html with perfect UTF-8 encoding"""

E_CALENDAR = '📊'
E_CLIPBOARD = '📋'
E_BOX = '📦'
E_CHECK = '✅'
E_X = '❌'
E_WARN = '⚠'
E_PARTY = '🎉'
E_FILE = '📋'

html = """<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Comphone Super App</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,sans-serif;background:#f5f7fa;color:#1a1a2e;min-height:100vh;padding-bottom:80px;padding-top:56px}
.bar{background:linear-gradient(135deg,#1DB446,#18933a);color:#fff;padding:12px 20px;position:fixed;top:0;left:0;right:0;z-index:100;display:flex;justify-content:space-between;align-items:center}
.bar h1{font-size:18px;font-weight:800}
.bar .tm{font-size:11px;opacity:.85}
.pg{display:none;padding:16px}.pg.sh{display:block}
.sg{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-bottom:16px}
.sc{background:#fff;border-radius:16px;padding:16px;box-shadow:0 2px 12px rgba(0,0,0,.06);text-align:center}
.sc .n{font-size:30px;font-weight:800}.sc .l{font-size:11px;color:#999;margin-top:2px}
.srch{margin-bottom:16px}.srch input{width:100%;padding:14px 18px;border:2px solid #e8ecf0;border-radius:14px;font-size:15px;outline:none;background:#fff}
.srch input:focus{border-color:#1DB446}
.jc{background:#fff;border-radius:16px;padding:16px;margin-bottom:12px;box-shadow:0 2px 12px rgba(0,0,0,.06)}
.jc .top{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}
.jc .id{font-weight:800;color:#1DB446}
.jc .nm{font-size:15px;font-weight:700;margin-bottom:3px}
.jc .sy{font-size:13px;color:#666;line-height:1.5;margin-bottom:8px}
.jc .mt{display:flex;gap:14px;font-size:11px;color:#999;margin-bottom:10px;flex-wrap:wrap}
.ab{display:flex;gap:8px}.ab button{flex:1;padding:10px 6px;border:none;border-radius:12px;font-size:12px;font-weight:700;cursor:pointer}
.bv{background:#E3F2FD;color:#1E90FF}.bs{background:#FFF3E0;color:#E65C00}.be{background:#F3E5F5;color:#9C27B0}
.bg2{display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700}
.gp{background:#FFF3E0;color:#E65C00}.gi{background:#E3F2FD;color:#1565C0}.gc{background:#E8F5E9;color:#2E7D32}.gx{background:#FFEBEE;color:#C62828}
.it{background:#fff;border-radius:16px;padding:16px;margin-bottom:10px;box-shadow:0 2px 12px rgba(0,0,0,.06);display:flex;justify-content:space-between;align-items:center}
.it .inf{flex:1}.it .inf h3{font-size:14px;font-weight:700}.it .inf p{font-size:12px;color:#666}
.it .nv{text-align:center}.it .nv .v{font-size:20px;font-weight:800}.it .nv.ok{color:#1DB446}.it .nv.lo{color:#FF4444}
.wel{text-align:center;padding:24px 20px;background:linear-gradient(135deg,#E8F5E9,#C8E6C9);border-radius:16px;margin-bottom:16px}
.wel h2{font-size:18px;font-weight:800;color:#18933a;margin-bottom:4px}.wel p{font-size:13px;color:#666}
.fh{text-align:center;margin-bottom:20px}.fh .ft{font-size:20px;font-weight:800;color:#1DB446;background:#fff;padding:14px;border-radius:16px;box-shadow:0 2px 12px rgba(0,0,0,.06)}
.fg2{margin-bottom:16px}.fg2 label{display:block;font-size:13px;font-weight:700;margin-bottom:6px}
.fg2 input,.fg2 textarea,.fg2 select{width:100%;padding:14px 16px;border:2px solid #e8ecf0;border-radius:14px;font-size:15px;outline:none;background:#fff;font-family:inherit}
.fg2 input:focus,.fg2 textarea:focus{border-color:#1DB446}
.fg2 textarea{resize:vertical;min-height:80px}.fg2 .rq{color:#FF4444}
.bm{display:block;width:100%;padding:16px;background:linear-gradient(135deg,#1DB446,#18933a);color:#fff;border:none;border-radius:14px;font-size:16px;font-weight:800;cursor:pointer;margin-bottom:10px}
.bm:disabled{opacity:.6}
.bc{display:block;width:100%;padding:14px;background:#fff;color:#666;border:2px solid #e8ecf0;border-radius:14px;font-size:14px;font-weight:700;cursor:pointer}
.ib{background:#E3F2FD;border-radius:14px;padding:16px;font-size:12px;line-height:2;white-space:pre-line}
.fab{position:fixed;bottom:88px;right:20px;width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#1DB446,#18933a);color:#fff;border:none;font-size:24px;box-shadow:0 6px 20px rgba(29,180,70,.3);z-index:90;cursor:pointer;display:flex;align-items:center;justify-content:center}
.fab.hd{display:none}
.nb{display:flex;background:#fff;padding:6px 0;position:fixed;bottom:0;left:0;right:0;box-shadow:0 -2px 20px rgba(0,0,0,.06);z-index:100;justify-content:space-around}
.ni{display:flex;flex-direction:column;align-items:center;padding:4px 12px;font-size:10px;font-weight:600;color:#999;cursor:pointer}
.ni.a{color:#1DB446}.ni .ic{font-size:19px;margin-bottom:2px}
.mo2{display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.5);z-index:300;justify-content:center;align-items:flex-end}
.mo2.op{display:flex}.mo2 .bx{background:#fff;border-radius:24px 24px 0 0;padding:28px 24px 24px;width:100%;max-width:400px;animation:su .3s ease}
@keyframes su{from{transform:translateY(100%)}to{transform:translateY(0)}}
.mo2 .bx .ic2{text-align:center;font-size:40px;margin-bottom:12px}.mo2 .bx h3{font-size:17px;font-weight:800;text-align:center;margin-bottom:6px}
.mo2 .bx p{text-align:center;color:#666;font-size:13px;line-height:1.5;margin-bottom:20px;white-space:pre-line}
.mo2 .bx button{display:block;width:100%;padding:14px;background:#1DB446;color:#fff;border:none;border-radius:14px;font-size:15px;font-weight:700;cursor:pointer}
.njb{text-align:center;margin:16px 0}.njb button{padding:16px 32px;background:linear-gradient(135deg,#1DB446,#18933a);color:#fff;border:none;border-radius:14px;font-size:17px;font-weight:800;cursor:pointer}
.st2{display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.5);z-index:300;justify-content:center;align-items:flex-end}
.st2.op{display:flex}.st2 .bx{background:#fff;border-radius:24px 24px 0 0;padding:24px 24px 32px;width:100%;max-width:420px;animation:su .3s ease;position:relative}
.st2 .bx h3{font-size:18px;font-weight:800;margin-bottom:2px;padding-right:30px}.st2 .bx .sub{font-size:13px;color:#666;margin-bottom:16px}
.st2 .bx .x{position:absolute;top:16px;right:20px;font-size:22px;cursor:pointer;color:#999;background:none;border:none}
.st2 .so{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:16px}
.st2 .sr{padding:14px;border:2px solid #e8ecf0;border-radius:14px;text-align:center;cursor:pointer;font-size:14px;font-weight:700}
.st2 .sr.s{border-color:#1DB446;background:#E8F5E9;color:#1DB446}
.ld{text-align:center;padding:60px 20px;color:#999}
</style>
</head>
<body>

<div class="bar"><h1>Comphone AI</h1><div class="tm" id="clock">...</div></div>

<div id="pg1" class="pg sh"></div>
<div id="pg2" class="pg"><div class="srch"><input type="text" id="q" placeholder="ค้นหา JobID, ชื่อลูกค้า..."></div><div id="jl"></div></div>
<div id="pg3" class="pg"></div>
<div id="pg4" class="pg"><div class="fh"><div class="ft" id="ft"></div></div><div id="fb"></div></div>

<button class="fab" id="fabBtn">+</button>

<div class="nb">
  <div class="ni a" id="n1"><span class="ic">""" + E_CALENDAR + """</span>สรุป</div>
  <div class="ni" id="n2"><span class="ic">""" + E_CLIPBOARD + """</span>งาน</div>
  <div class="ni" id="n3"><span class="ic">""" + E_BOX + """</span>สต็อก</div>
</div>

<div class="mo2" id="aMo"><div class="bx"><div class="ic2" id="aIc"></div><h3 id="aT"></h3><p id="aM"></p><button id="aOk">ตกลง</button></div></div>
<div class="st2" id="sMo"><div class="bx"><button class="x" id="sX">&times;</button><h3 id="sT"></h3><p class="sub" id="sI"></p><p style="font-weight:700;margin-bottom:8px;font-size:13px">เลือกสถานะ:</p><div class="so" id="sO"></div><div class="fg2"><label>หมายเหตุ</label><input type="text" id="sN" placeholder="เพิ่มเติม..."></div><button class="bm" id="sA">บันทึก</button></div></div>

<script>
var DATA=null,JOBS=[],selSt='',selId='';

function go(id){document.querySelectorAll('.pg').forEach(function(p){p.classList.remove('sh')});document.getElementById(id).classList.add('sh');document.getElementById('fabBtn').classList.toggle('hd',id!=='pg1'&&id!=='pg2');document.getElementById('n1').classList.toggle('a',id==='pg1');document.getElementById('n2').classList.toggle('a',id==='pg2');document.getElementById('n3').classList.toggle('a',id==='pg3');if(id==='pg1')r1();else if(id==='pg2')r2();else if(id==='pg3')r3();}

document.getElementById('n1').addEventListener('click',function(){go('pg1')});
document.getElementById('n2').addEventListener('click',function(){go('pg2')});
document.getElementById('n3').addEventListener('click',function(){go('pg3')});
document.getElementById('fabBtn').addEventListener('click',nJob);

function msg(ic,ti,mx){document.getElementById('aIc').innerHTML=ic;document.getElementById('aT').textContent=ti;document.getElementById('aM').textContent=mx;document.getElementById('aMo').classList.add('op');}
document.getElementById('aOk').addEventListener('click',function(){document.getElementById('aMo').classList.remove('op');});
document.getElementById('aMo').addEventListener('click',function(e){if(e.target===this)this.classList.remove('op');});

document.getElementById('q').addEventListener('input',function(){var v=this.value.toLowerCase();r2(v?JOBS.filter(function(j){return(j.id+' '+j.customer+' '+(j.tech||'')+' '+(j.symptom||'')).toLowerCase().indexOf(v)>-1}):JOBS);});

function load(){google.script.run.withSuccessHandler(function(d){DATA=d;JOBS=(d&&d.jobs)||[];rndr()}).withFailureHandler(function(e){document.getElementById('pg1').innerHTML='<div class="ld">'+e+'</div>';}).getDashboardData();}

function rndr(){if(!DATA)return;if(DATA.summary&&DATA.summary.date)document.getElementById('clock').textContent=DATA.summary.date;if(document.getElementById('pg1').classList.contains('sh'))r1();else if(document.getElementById('pg2').classList.contains('sh'))r2();else if(document.getElementById('pg3').classList.contains('sh'))r3();}

function r1(){var s=DATA.summary;
var h='<div class="wel"><h2>ยินดีต้อนรับ</h2><p>Comphone Super App ระบบจัดการงานช่าง</p></div>';
h+='<div class="sg">';
h+='<div class="sc"><div class="n">'+(s.pending||0)+'</div><div class="l">รอดำเนินการ</div></div>';
h+='<div class="sc"><div class="n">'+(s.inProgress||0)+'</div><div class="l">กำลังทำ</div></div>';
h+='<div class="sc"><div class="n">'+(s.completed||0)+'</div><div class="l">เสร็จแล้ว</div></div>';
h+='<div class="sc"><div class="n">'+(s.lowStock||0)+'</div><div class="l">สต็อกต่ำ</div></div>';
h+='</div>';
h+='<div class="njb"><button id="nj">เปิดงานใหม่</button></div>';
h+='<div class="ib">กด งาน เพื่อดูรายการทั้งหมด\\nกด สต็อก เพื่อเช็คอะไหล่\\nกดปุ่ม + หรือ เปิดงานใหม่ เพื่อสร้างงาน\\nอัปเดตทุก 1 นาที</div>';
document.getElementById('pg1').innerHTML=h;
document.getElementById('nj').addEventListener('click',nJob);}

function r2(list){list=list||JOBS;if(!list.length){document.getElementById('jl').innerHTML='<div class="ld">ไม่พบงาน</div>';return;}
var h='';for(var i=0;i<Math.min(list.length,50);i++){var j=list[i];
var c=j.status==='รอดำเนินการ'?'gp':(j.status==='InProgress'||j.status.indexOf('กำลัง')>-1?'gi':(j.status.indexOf('ยกเลิก')>-1?'gx':'gc'));
var sl=j.status==='รอดำเนินการ'?'รอ':(j.status==='InProgress'||j.status.indexOf('กำลัง')>-1?'กำลังทำ':(j.status.indexOf('ยกเลิก')>-1?'ยกเลิก':'เสร็จ'));
h+='<div class="jc"><div class="top"><span class="id">'+j.id+'</span><span class="bg2 '+c+'">'+sl+'</span></div>';
h+='<div class="nm">'+j.customer+'</div><div class="sy">'+(j.symptom||'')+'</div>';
h+='<div class="mt">'+(j.tech?'<span>ช่าง: '+j.tech+'</span>':'')+(j.created?'<span>'+j.created+'</span>':'')+'</div>';
h+='<div class="ab"><button class="bv" data-v="'+j.id+'">ดู</button><button class="bs" data-s="'+j.id+'">สถานะ</button><button class="be" data-e="'+j.id+'">แก้ไข</button></div></div>';}
document.getElementById('jl').innerHTML=h;
document.querySelectorAll('#pg2 .jc .bv').forEach(function(el){el.addEventListener('click',function(){vJob(el.getAttribute('data-v'))})});
document.querySelectorAll('#pg2 .jc .bs').forEach(function(el){el.addEventListener('click',function(){oSt(el.getAttribute('data-s'))})});
document.querySelectorAll('#pg2 .jc .be').forEach(function(el){el.addEventListener('click',function(){eJob(el.getAttribute('data-e'))})});}

function r3(){var items=DATA.inventory||[];if(!items.length){document.getElementById('pg3').innerHTML='<div class="ld">ไม่มีข้อมูล</div>';return;}
var h='';for(var i=0;i<items.length;i++){var it=items[i];
h+='<div class="it"><div class="inf"><h3>'+it.code+'</h3><p>'+it.name+'</p></div><div class="nv '+(it.alert?'lo':'ok')+'"><div class="v">'+it.qty+'</div><p>'+(it.alert?'ต่ำ!':'ชิ้น')+'</p></div></div>';}
document.getElementById('pg3').innerHTML=h;}

function nJob(){document.getElementById('ft').textContent='เปิดงานใหม่';buildForm();go('pg4');}
function eJob(id){var j=JOBS.find(function(x){return x.id===id});if(!j)return;document.getElementById('ft').textContent='แก้ไข: '+id;buildForm(j);go('pg4');}

function buildForm(j){j=j||{};
var h='<div class="fg2"><label>ชื่อลูกค้า <span class="rq">*</span></label><input type="text" id="f1" value="'+(j.customer||'')+'" placeholder="เช่น รร.ชุมชนบ้านสว่าง"></div>';
h+='<div class="fg2"><label>เบอร์โทร</label><input type="tel" id="f2" value="'+(j.phone||'')+'" placeholder="08X-XXX-XXXX"></div>';
h+='<div class="fg2"><label>อาการ รายละเอียด <span class="rq">*</span></label><textarea id="f3">'+(j.symptom||'')+'</textarea></div>';
h+='<div class="fg2"><label>ช่างที่รับงาน</label><input type="text" id="f4" value="'+(j.tech||'')+'"></div>';
h+='<div class="fg2"><label>พิกัด ที่อยู่</label><input type="text" id="f5" value="'+(j.gps||'')+'"></div>';
h+='<div class="fg2"><label>สถานะ</label><select id="f6">';
h+='<option value="รอดำเนินการ"';if(j.status==='รอดำเนินการ')h+=' selected';h+='\u0e23\u0e2d\u0e14\u0e33\u0e40\u0e19\u0e34\u0e19\u0e01\u0e32\u0e23';
h+='<option value="InProgress"';if(j.status==='InProgress')h+=' selected';h+='\u0e01\u0e33\u0e25\u0e31\u0e07\u0e14\u0e33\u0e40\u0e19\u0e34\u0e19\u0e01\u0e32\u0e23';
h+='<option value="Completed"';if(j.status==='Completed')h+=' selected';h+='\u0e40\u0e2a\u0e23\u0e47\u0e08\u0e2a\u0e21\u0e1a\u0e39\u0e23\u0e13\u0e4c';
h+='<option value="ยกเลิก"';if(j.status&&j.status.indexOf('\u0e22\u0e01')>-1)h+=' selected';h+='\u0e22\u0e01\u0e40\u0e25\u0e34\u0e01';
h+='</select></div>';
h+='<input type="hidden" id="fid" value="'+(j.id||'')+'">';
h+='<button class="bm" id="fsub">บันทึก</button><button class="bc" id="fcan">ยกเลิก</button>';
document.getElementById('fb').innerHTML=h;
document.getElementById('fsub').addEventListener('click',sForm);
document.getElementById('fcan').addEventListener('click',function(){go('pg2')});}

function sForm(){var id=document.getElementById('fid').value;
var d={name:document.getElementById('f1').value,phone:document.getElementById('f2').value,symptom:document.getElementById('f3').value,tech:document.getElementById('f4').value,gps:document.getElementById('f5').value,status:document.getElementById('f6').value};
if(!d.name){msg('"""+E_WARN+"""','กรุณาใส่ชื่อลูกค้า','');return;}
if(!d.symptom){msg('"""+E_WARN+"""','กรุณาระบุอาการ','');return;}
var btn=document.getElementById('fsub');btn.innerHTML='บันทึก...';btn.disabled=true;
if(id){google.script.run.withSuccessHandler(function(){msg('"""+E_CHECK+"""','แก้ไขสำเร็จ',id);load();go('pg2')}).withFailureHandler(function(e){msg('"""+E_X+"""','ผิดพลาด',e);btn.disabled=false}).updateJobById(id,d);}
else{google.script.run.withSuccessHandler(function(r){msg('"""+E_PARTY+"""','เปิดงานสำเร็จ',r.job_id);btn.innerHTML='บันทึก';btn.disabled=false;nJob()}).withFailureHandler(function(e){msg('"""+E_X+"""','ผิดพลาด',e);btn.disabled=false}).openJob(d);}}

function vJob(id){var j=JOBS.find(function(x){return x.id===id});if(!j)return;var t='สถานะ: '+j.status+'\\nช่าง: '+(j.tech||'-')+'\\nสร้าง: '+j.created;if(j.folder)t+='\\n\\nลิงก์โฟลเดอร์: '+j.folder;msg('"""+E_FILE+"""',j.id+' - '+j.customer,j.symptom+'\\n\\n'+t);}

function oSt(id){selId=id;var j=JOBS.find(function(x){return x.id===id});if(!j)return;
var o=[['รอดำเนินการ','รอ'],['InProgress','กำลังทำ'],['Completed','เสร็จ'],['ยกเลิก','ยกเลิก']];
document.getElementById('sT').textContent=id+' - '+j.customer;document.getElementById('sI').textContent=j.symptom||'';selSt=j.status;
var h='';for(var i=0;i<o.length;i++){h+='<div class="sr" st="'+o[i][0]+'">'+o[i][1]+'</div>';}
document.getElementById('sO').innerHTML=h;selSt=j.status;
document.querySelectorAll('#sO .sr').forEach(function(el){if(el.getAttribute('st')===selSt)el.classList.add('s');el.addEventListener('click',function(){selSt=el.getAttribute('st');document.querySelectorAll('#sO .sr').forEach(function(x){x.classList.remove('s')});el.classList.add('s')})});
document.getElementById('sN').value='';var b=document.getElementById('sA');b.disabled=false;b.innerHTML='บันทึก';document.getElementById('sMo').classList.add('op');b.onclick=aSt;}

function aSt(){if(!selId)return;var b=document.getElementById('sA');b.innerHTML='บันทึก...';b.disabled=true;
google.script.run.withSuccessHandler(function(){msg('"""+E_CHECK+"""','สำเร็จ',selId+' = '+selSt);document.getElementById('sMo').classList.remove('op');load()}).withFailureHandler(function(e){msg('"""+E_X+"""','ผิดพลาด',e);b.disabled=false}).updateJobStatus({job_id:selId,status:selSt,note:document.getElementById('sN').value});}

document.getElementById('sX').addEventListener('click',function(){document.getElementById('sMo').classList.remove('op')});
document.getElementById('sMo').addEventListener('click',function(e){if(e.target===this)this.classList.remove('op')});

load();setInterval(load,60000);
</script>
</body>
</html>"""

with open('C:/Users/Server/.openclaw/workspace/Shop_vnext/src/Index.html', 'w', encoding='utf-8') as f:
    f.write(html)
print('OK: ' + str(len(html)) + ' bytes written with UTF-8')
