# -*- coding: utf-8 -*-
"""
Emergency Fix: Dashboard หน้าขาว -> V314
Fix: Skeleton loading, try-catch, proper error handling
Run: python _fix_dashboard.py
"""
import os

script_dir = os.path.dirname(os.path.abspath(__file__))
dst = os.path.join(script_dir, 'Shop_vnext', 'src', 'Index.html')

css_section = """@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@300;400;500;600;700;800;900&display=swap');
body{font-family:'Noto Sans Thai',-apple-system,sans-serif}
.card-hover{transition:all .2s ease}.card-hover:hover{transform:translateY(-2px);box-shadow:0 8px 25px rgba(0,0,0,.1)}
.fade-in{animation:fadeIn .3s ease-out}@keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
.slide-up{animation:slideUp .3s ease-out}@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
.scrollbar-hide::-webkit-scrollbar{display:none}.scrollbar-hide{-ms-overflow-style:none;scrollbar-width:none}
.line-clamp-2{-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;display:-webkit-box}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
.skeleton{animation:pulse 1.5s ease-in-out infinite;background:#e5e7eb;border-radius:8px}
.skeleton-tile{height:72px;background:#e5e7eb;border-radius:16px}
.skeleton-card{height:120px;background:#e5e7eb;border-radius:16px}
.skeleton-bar{height:16px;background:#e5e7eb;border-radius:8px}
.skeleton-bar-sm{height:12px;background:#e5e7eb;border-radius:6px;width:60%}
.skeleton-stat{height:24px;background:#e5e7eb;border-radius:4px;width:40px;display:inline-block}"""

html_top = """<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Comphone Dashboard V313</title>
<script src="https://cdn.tailwindcss.com"><\/script>
<script>
tailwind.config={theme:{extend:{colors:{brand:{DEFAULT:'#1DB446',dark:'#18933a',light:'#E8F5E9'}}}}};
<\/script>
<style>""" + css_section + """<\/style></head>
<body class="bg-gray-50 text-gray-800 min-h-screen pb-20 pt-16">"""

html_body = """
<header class="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-brand to-brand-dark text-white shadow-lg">
<div class="max-w-3xl mx-auto px-4 py-3 flex justify-between items-center">
<div class="flex items-center gap-2"><span class="text-2xl">&#x1F4F1;</span>
<h1 class="text-lg font-extrabold tracking-tight">Comphone Dashboard</h1></div>
<div id="clock" class="text-xs font-medium opacity-90 bg-white/20 px-3 py-1 rounded-full">...</div></div></header>
<nav class="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-[0_-2px_10px_rgba(0,0,0,0.06)]">
<div class="max-w-3xl mx-auto flex justify-around py-1">
<button id="tabDashboard" class="flex flex-col items-center px-4 py-2 text-xs transition-all text-brand font-bold" onclick="go('pageDashboard')"><span class="text-xl mb-0.5">&#x1F4CA;</span><span>&#x0E2A;&#x0E23;&#x0E38;&#x0E1B;</span></button>
<button id="tabJobs" class="flex flex-col items-center px-4 py-2 text-xs transition-all text-gray-400 font-semibold" onclick="go('pageJobs')"><span class="text-xl mb-0.5">&#x1F4CB;</span><span>&#x0E07;&#x0E32;&#x0E19;</span></button>
<button id="tabStock" class="flex flex-col items-center px-4 py-2 text-xs transition-all text-gray-400 font-semibold" onclick="go('pageStock')"><span class="text-xl mb-0.5">&#x1F4E6;</span><span>&#x0E2A;&#x0E15;&#x0E47;&#x0E2D;&#x0E01;</span></button></div></nav>
<main class="max-w-3xl mx-auto px-4 pt-4">
<section id="pageDashboard" class="page active fade-in">""" + skeleton_dash() + """</section>
<section id="pageJobs" class="page hidden fade-in">
<div class="sticky top-16 z-30 bg-gray-50 py-3 -mx-4 px-4">
<div class="relative"><span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">&#x1F50D;</span>
<input type="text" id="searchInput" placeholder="&#x0E04;&#x0E49;&#x0E19;&#x0E2B;&#x0E32; JobID, &#x0E0A;&#x0E37;&#x0E48;&#x0E2D;" class="w-full pl-10 pr-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-sm focus:border-brand focus:outline-none transition-colors shadow-sm"></div>
<div class="flex gap-2 mt-3 overflow-x-auto scrollbar-hide pb-1">
<button class="filter-btn px-4 py-1.5 bg-brand text-white rounded-full text-xs font-bold ring-2 ring-brand" data-filter="all">&#x0E17;&#x0E31;&#x0E49;&#x0E07;&#x0E2B;&#x0E21;&#x0E14;</button>
<button class="filter-btn px-4 py-1.5 bg-amber-100 text-amber-700 rounded-full text-xs font-bold" data-filter="&#x0E23;&#x0E2D;&#x0E14;&#x0E33;&#x0E40;&#x0E19;&#x0E34;&#x0E19;&#x0E01;&#x0E32;&#x0E23;">&#x23F3; &#x0E23;&#x0E2D;</button>
<button class="filter-btn px-4 py-1.5 bg-blue-100 text-blue-700 rounded-full text-xs font-bold" data-filter="InProgress">&#x1F504; &#x0E17;&#x0E33;</button>
<button class="filter-btn px-4 py-1.5 bg-green-100 text-green-700 rounded-full text-xs font-bold" data-filter="Completed">&#x2705; &#x0E40;&#x0E2A;&#x0E23;&#x0E47;&#x0E08;</button></div></div>
<div id="jobCards" class="space-y-3 pb-4"></div></section>
<section id="pageStock" class="page hidden fade-in">""" + skeleton_stock() + """</section>
<section id="pageForm" class="page hidden fade-in">
<div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
<h2 id="formTitle" class="text-lg font-extrabold text-brand mb-4"></h2>
<div id="formBody" class="space-y-4"></div></div></section></main>
<button id="fabBtn" class="fixed bottom-20 right-5 w-14 h-14 bg-gradient-to-br from-brand to-brand-dark text-white rounded-full shadow-lg shadow-brand/30 flex items-center justify-center text-2xl font-bold z-40 hover:scale-105 active:scale-95 transition-transform" onclick="openNewJob()">+</button>
<div id="alertModal" class="fixed inset-0 z-[60] bg-black/50 hidden items-center justify-center p-4" onclick="if(event.target===this)this.classList.add('hidden')">
<div class="bg-white rounded-2xl p-6 w-full max-w-sm slide-up text-center">
<div id="alertIcon" class="text-4xl mb-3"></div>
<h3 id="alertTitle" class="text-lg font-bold mb-2"></h3>
<p id="alertMsg" class="text-sm text-gray-500 leading-relaxed mb-5 whitespace-pre-line"></p>
<button onclick="document.getElementById('alertModal').classList.add('hidden')" class="w-full py-3 bg-brand text-white rounded-xl font-bold text-sm hover:bg-brand-dark transition-colors">&#x0E15;&#x0E01;&#x0E25;&#x0E07;</button></div></div>
<div id="statusModal" class="fixed inset-0 z-[60] bg-black/50 hidden items-end justify-center" onclick="if(event.target===this)this.classList.add('hidden')">
<div class="bg-white rounded-t-2xl p-5 w-full max-w-md slide-up">
<div class="flex justify-between items-center mb-3">
<h3 id="statusTitle" class="text-lg font-bold"></h3>
<button onclick="document.getElementById('statusModal').classList.add('hidden')" class="text-2xl text-gray-400 hover:text-gray-600">&times;</button></div>
<p id="statusSubtitle" class="text-sm text-gray-500 mb-4"></p>
<div id="statusOptions" class="grid grid-cols-2 gap-2 mb-4"></div>
<div class="mb-4"><label class="text-xs font-bold text-gray-600 mb-1 block">&#x0E2B;&#x0E21;&#x0E32;&#x0E22;&#x0E40;&#x0E2B;&#x0E15;&#x0E38;</label>
<input type="text" id="statusNote" placeholder="&#x0E40;&#x0E1E;&#x0E34;&#x0E48;&#x0E21;..." class="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-brand focus:outline-none"></div>
<button id="statusSave" class="w-full py-3 bg-brand text-white rounded-xl font-bold text-sm hover:bg-brand-dark transition-colors disabled:opacity-50" onclick="saveStatus()">&#x0E1A;&#x0E31;&#x0E19;&#x0E17;&#x0E36;&#x0E01;</button></div></div>
<div id="errorBar" class="hidden fixed top-16 left-0 right-0 z-[80] bg-red-500 text-white text-center py-2 text-sm font-bold"></div>"""

html_close = """<script>""" + js_code() + """<\/script>
</body></html>"""

def skeleton_dash():
    t = '<div class="bg-gradient-to-r from-brand-light to-emerald-100 rounded-2xl p-5 mb-4 border border-brand/20">'
    t += '<div class="flex items-center gap-3"><div class="w-12 h-12 bg-brand/30 rounded-xl skeleton"></div>'
    t += '<div><div class="skeleton skeleton-bar mb-1" style="width:120px"></div><div class="skeleton skeleton-bar-sm"></div></div></div></div>'
    for i in range(4):
        t += '<div class="skeleton skeleton-tile mb-3"></div>'
    t += '<div class="grid grid-cols-2 gap-3 mb-4">'
    for i in range(4):
        t += '<div class="skeleton skeleton-tile"></div>'
    t += '</div>'
    t += '<div class="skeleton skeleton-card mb-4"></div>'
    return t

def skeleton_stock():
    t = '<div class="skeleton skeleton-card mb-4"></div>'
    for i in range(5):
        t += '<div class="skeleton skeleton-bar mb-2" style="height:60px"></div>'
    return t

def js_code():
    # Build JS code line by line to avoid any encoding issues
    lines = []
    lines.append('// ====== STATE ======')
    lines.append("var DATA=null,JOBS=[],activeTab='pageDashboard',currentFilter='all',selJobId='',selStatus='';")
    
    # NAV
    lines.append('// ====== NAV ======')
    lines.append("function go(p){")
    lines.append("  try {")
    lines.append("    document.querySelectorAll('.page').forEach(function(x){x.classList.add('hidden');x.classList.remove('active')});")
    lines.append("    var e=document.getElementById(p);if(e){e.classList.remove('hidden');e.classList.add('active')}")
    lines.append("    activeTab=p;")
    lines.append("    sn('tabDashboard',p==='pageDashboard');")
    lines.append("    sn('tabJobs',p==='pageJobs');")
    lines.append("    sn('tabStock',p==='pageStock');")
    lines.append("    var f=document.getElementById('fabBtn');")
    lines.append("    f.style.display=(p==='pageDashboard'||p==='pageJobs')?'flex':'none';")
    lines.append("    if(p==='pageDashboard')rDash();else if(p==='pageJobs')rJobs();else if(p==='pageStock')rStock();")
    lines.append("  } catch(err) { showErr('nav: '+err.message) }")
    lines.append("}")
    lines.append("function sn(id,a){var e=document.getElementById(id);if(!e)return;e.className='flex flex-col items-center px-4 py-2 text-xs transition '+(a?'text-brand font-bold':'text-gray-400 font-semibold')}")
    
    # DATA LOAD with try-catch
    lines.append('// ====== DATA LOAD ======')
    lines.append("function loadData(){")
    lines.append("  try {")
    lines.append("    if(typeof google==='undefined'||!google.script){")
    lines.append("      showErr('\\u0E04\\u0E23\\u0E2D\\u0E07 Google Script \\u0E44\\u0E21\\u0E48\\u0E1E\\u0E23\\u0E49\\u0E2D\\u0E21');")
    lines.append("      showFallback();")
    lines.append("      return;")
    lines.append("    }")
    lines.append("    google.script.run")
    lines.append("      .withSuccessHandler(function(d){")
    lines.append("        try {")
    lines.append("          DATA=d;")
    lines.append("          JOBS=(d&&d.jobs)||[];")
    lines.append("          if(!d||!d.summary){")
    lines.append("            document.getElementById('pageDashboard').innerHTML='<div class=\\\"text-center py-20 text-gray-400\\\"><div class=\\\"text-4xl mb-3\\\">\\u{1F613}</div><p class=\\\"font-semibold\\\">\\u0E02\\u0E49\\u0E2D\\u0E21\\u0E39\\u0E25\\u0E44\\u0E21\\u0E48\\u0E16\\u0E39\\u0E01\\u0E15\\u0E49\\u0E2D\\u0E07</p><p class=\\\"text-xs mt-1\\\">'+JSON.stringify(d||{}).substring(0,200)+'</p></div>';")
    lines.append("            return;")
    lines.append("          }")
    lines.append("          if(DATA.summary.date)document.getElementById('clock').textContent=DATA.summary.date;")
    lines.append("          hideErr();")
    lines.append("          rAct();")
    lines.append("        } catch(e) { showErr('render: '+e.message); showFallback(); }")
    lines.append("      })")
    lines.append("      .withFailureHandler(function(e){")
    lines.append("        hideErr();")
    lines.append("        showErr('\\u0E1C\\u0E34\\u0E14\\u0E1E\\u0E25\\u0E32\\u0E14: '+e.message);")
    lines.append("        document.getElementById('pageDashboard').innerHTML='<div class=\\\"text-center py-20 text-gray-400\\\"><div class=\\\"text-4xl mb-3\\\">\\u274C</div><p class=\\\"font-semibold\\\">\\u0E40\\u0E0A\\u0E37\\u0E48\\u0E2D\\u0E21\\u0E15\\u0E48\\u0E2D\\u0E44\\u0E21\\u0E48\\u0E44\\u0E14\\u0E49</p><p class=\\\"text-xs text-red-400 mt-2\\\">'+e.message+'</p><button onclick=\\\"loadData()\\\" class=\\\"mt-4 px-4 py-2 bg-brand text-white rounded-xl text-sm font-bold\\\">\\u{1F504} \\u0E25\\u0E2D\\u0E07\\u0E43\\u0E2B\\u0E21\\u0E48</button></div>';")
    lines.append("      })")
    lines.append("      .getDashboardData();")
    lines.append("  } catch(e) { showErr(e.message); showFallback(); }")
    lines.append("}")
    
    # ERROR functions
    lines.append("function showErr(m){var b=document.getElementById('errorBar');b.textContent=m;b.classList.remove('hidden');b.classList.add('flex')}")
    lines.append("function hideErr(){var b=document.getElementById('errorBar');b.classList.add('hidden')}")
    lines.append("function showFallback(){")
    lines.append("  document.getElementById('pageDashboard').innerHTML='<div class=\\\"text-center py-20 text-gray-400\\\"><div class=\\\"text-4xl mb-3\\\">\\u{1F4F1}</div><p class=\\\"font-bold text-lg\\\">Comphone Dashboard</p><p class=\\\"text-sm mt-2\\\">\\u0E01\\u0E33\\u0E25\\u0E31\\u0E07\\u0E42\\u0E2B\\u0E25\\u0E14\\u0E02\\u0E49\\u0E2D\\u0E21\\u0E39\\u0E25...<br>\\u0E01\\u0E14\\u0E40\\u0E1E\\u0E37\\u0E48\\u0E2D\\u0E25\\u0E2D\\u0E07\\u0E43\\u0E2B\\u0E21\\u0E48</p><button onclick=\\\"loadData()\\\" class=\\\"mt-4 px-4 py-2 bg-brand text-white rounded-xl text-sm font-bold\\\">\\u{1F504} \\u0E25\\u0E2D\\u0E07\\u0E43\\u0E2B\\u0E21\\u0E48</button></div>';")
    lines.append("}")
    
    # renderActive
    lines.append("function rAct(){try{if(activeTab==='pageDashboard')rDash();else if(activeTab==='pageJobs')rJobs();else if(activeTab==='pageStock')rStock()}catch(e){showErr(e.message)}}")
    
    # DASHBOARD
    lines.append('// ====== DASHBOARD ======')
    lines.append("function rDash(){")
    lines.append("  try {")
    lines.append("    if(!DATA||!DATA.summary){")
    lines.append("      document.getElementById('pageDashboard').innerHTML='<div class=\\\"text-center py-20\\\"><p>\\u0E04\\u0E48\\u0E32\\u0E22\\u0E31\\u0E07\\u0E42\\u0E2B\\u0E25\\u0E14...</p></div>';")
    lines.append("      return;")
    lines.append("    }")
    lines.append("    var s=DATA.summary,h='';")
    lines.append("    h+='<div class=\\\"bg-gradient-to-r from-brand-light to-emerald-100 rounded-2xl p-5 mb-4 border border-brand/20\\\">';")
    lines.append("    h+='<div class=\\\"flex items-center gap-3\\\">';")
    lines.append("    h+='<div class=\\\"w-12 h-12 bg-brand rounded-xl flex items-center justify-center text-white text-xl shadow-md\\\">\\u{1F4F1}</div>';")
    lines.append("    h+='<div><h2 class=\\\"text-lg font-extrabold text-brand-dark\\\">\\u0E22\\u0E34\\u0E19\\u0E14\\u0E35\\u0E15\\u0E49\\u0E2D\\u0E19\\u0E23\\u0E31\\u0E1A</h2>';")
    lines.append("    h+='<p class=\\\"text-xs text-gray-500\\\">Comphone Super App</p></div></div></div>';")
    lines.append("    h+='<div class=\\\"grid grid-cols-2 gap-3 mb-4\\\">';")
    lines.append("    h+=tl(''+(s.pending||0),'\\u0E23\\u0E2D\\u0E14\\u0E33\\u0E40\\u0E19\\u0E34\\u0E19\\u0E01\\u0E32\\u0E23','bg-amber-50 border-amber-200','text-amber-600','\\u23F3');")
    lines.append("    h+=tl(''+(s.inProgress||0),'\\u0E01\\u0E33\\u0E25\\u0E31\\u0E07\\u0E17\\u0E33','bg-blue-50 border-blue-200','text-blue-600','\\uD83D\\uDD04');")
    lines.append("    h+=tl(''+(s.completed||0),'\\u0E40\\u0E2A\\u0E23\\u0E47\\u0E08\\u0E41\\u0E25\\u0E49\\u0E27','bg-green-50 border-green-200','text-green-600','\\u2705');")
    lines.append("    h+=tl(''+(s.lowStock||0),'\\u0E2A\\u0E15\\u0E47\\u0E2D\\u0E01\\u0E15\\u0E48\\u0E33','bg-red-50 border-red-200','text-red-600','\\uD83D\\uDEA8');")
    lines.append("    h+='</div>';")
    lines.append("    h+='<div class=\\\"bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-4\\\">';")
    lines.append("    h+='<h3 class=\\\"text-sm font-bold text-gray-700 mb-3\\\">\\u0E02\\u0E49\\u0E2D\\u0E21\\u0E39\\u0E25\\u0E23\\u0E27\\u0E21</h3>';")
    lines.append("    h+=rw('\\u0E07\\u0E32\\u0E19\\u0E17\\u0E31\\u0E49\\u0E07\\u0E2B\\u0E21\\u0E14',(s.totalJobs||0)+' \\u0E07\\u0E32\\u0E19');")
    lines.append("    h+=rw('\\u0E2D\\u0E30\\u0E44\\u0E25\\u0E48\\u0E43\\u0E19\\u0E23\\u0E30\\u0E1A\\u0E1A',(s.totalItems||0)+' \\u0E23\\u0E32\\u0E22\\u0E01\\u0E32\\u0E23');")
    lines.append("    h+='<div class=\\\"flex justify-between items-center pt-2\\\"><span class=\\\"text-xs text-gray-500\\\">\\u0E2D\\u0E31\\u0E1B\\u0E40\\u0E14\\u0E15\\u0E25\\u0E48\\u0E32\\u0E2A\\u0E38\\u0E14</span><span class=\\\"font-bold text-xs text-gray-400\\\">'+(s.date||'-')+'</span></div></div>';")
    lines.append("    h+='<button onclick=\\\"openNewJob()\\\" class=\\\"w-full py-4 bg-gradient-to-r from-brand to-brand-dark text-white rounded-2xl font-bold text-base shadow-lg shadow-brand/20 transition-all mb-3\\\">\\u2795 \\u0E40\\u0E1B\\u0E34\\u0E14\\u0E07\\u0E32\\u0E19\\u0E43\\u0E2B\\u0E21\\u0E48</button>';")
    lines.append("    h+='<div class=\\\"bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-700\\\">\\u0E01\\u0E14\\u0E41\\u0E17\\u0E47\\u0E1A\\u0E07\\u0E32\\u0E19\\u0E14\\u0E39\\u0E23\\u0E32\\u0E22 \\u2022 \\u0E01\\u0E14\\u0E41\\u0E17\\u0E47\\u0E1A\\u0E2A\\u0E15\\u0E47\\u0E2D\\u0E01\\u0E40\\u0E0A\\u0E47\\u0E04\\u0E2D\\u0E30\\u0E44\\u0E25\\u0E48 \\u2022 \\u0E01\\u0E14+\\u0E40\\u0E1B\\u0E34\\u0E14\\u0E07\\u0E32\\u0E19\\u0E43\\u0E2B\\u0E21\\u0E48</div>';")
    lines.append("    document.getElementById('pageDashboard').innerHTML=h;")
    lines.append("  } catch(e) { showErr('rDash: '+e.message) }")
    lines.append("}")
    
    lines.append("function tl(n,l,bg,c,ic){return '<div class=\\\"'+bg+' rounded-2xl p-4 border card-hover\\\"><div class=\\\"flex justify-between mb-1\\\"><span class=\\\"text-3xl font-black '+c+'\\\">'+n+'</span><span class=\\\"text-lg opacity-60\\\">'+ic+'</span></div><p class=\\\"text-xs font-medium '+c+'\\\">'+l+'</p></div>'}")
    lines.append("function rw(l,v){return '<div class=\\\"flex justify-between py-2 border-b border-gray-100\\\"><span class=\\\"text-xs text-gray-500\\\">'+l+'</span><span class=\\\"font-bold text-sm\\\">'+v+'</span></div>'}")
    
    # JOBS
    lines.append('// ====== JOBS ======')
    lines.append("function rJobs(flist){")
    lines.append("  try {")
    lines.append("    var list=flist||JOBS;")
    lines.append("    if(currentFilter!=='all'&&!flist){list=[];for(var i=0;i<JOBS.length;i++){if(JOBS[i].status===currentFilter)list.push(JOBS[i])}}")
    lines.append("    var c=document.getElementById('jobCards');")
    lines.append("    if(!list.length){c.innerHTML='<div class=\\\"text-center py-16 text-gray-400\\\"><div class=\\\"text-4xl mb-3\\\">\\u{1F4CB}</div><p class=\\\"font-semibold\\\">\\u0E44\\u0E21\\u0E48\\u0E1E\\u0E1A\\u0E07\\u0E32\\u0E19</p></div>';return}")
    lines.append("    var h='',lim=Math.min(list.length,50);")
    lines.append("    for(var i=0;i<lim;i++)h+=jc(list[i]);")
    lines.append("    c.innerHTML=h;")
    lines.append("    var bn=document.querySelectorAll('.ac-view');for(var b=0;b<bn.length;b++){(function(x){x.onclick=function(){vJob(x.getAttribute('data-id'))}})(bn[b])}")
    lines.append("    bn=document.querySelectorAll('.ac-st');for(b=0;b<bn.length;b++){(function(x){x.onclick=function(){oSt(x.getAttribute('data-id'))}})(bn[b])}")
    lines.append("    bn=document.querySelectorAll('.ac-ed');for(b=0;b<bn.length;b++){(function(x){x.onclick=function(){eJob(x.getAttribute('data-id'))}})(bn[b])}")
    lines.append("  } catch(e) { showErr('rJobs: '+e.message) }")
    lines.append("}")
    
    lines.append("function jc(j){")
    lines.append("  var sc=gCls(j.status),sl=gLbl(j.status),sb=gBdr(j.status);")
    lines.append("  return '<div class=\\\"bg-white rounded-2xl shadow-sm '+sb+' p-4 card-hover fade-in\\\">'+")
    lines.append("    '<div class=\\\"flex justify-between items-start mb-2\\\">'+")
    lines.append("    '<div><span class=\\\"text-xs font-black text-brand\\\">'+esc(j.id)+'</span>'+")
    lines.append("    '<h3 class=\\\"text-sm font-bold text-gray-800 mt-0.5\\\">'+esc(j.customer)+'</h3></div>'+")
    lines.append("    '<span class=\\\"inline-flex px-2.5 py-1 rounded-full text-xs font-bold '+sc+'\\\">'+sl+'</span></div>'+")
    lines.append("    '<p class=\\\"text-xs text-gray-500 leading-relaxed mb-3 line-clamp-2\\\">'+esc(j.symptom||'-')+'</p>'+")
    lines.append("    '<div class=\\\"flex items-center gap-3 text-[11px] text-gray-400 mb-3\\\">'+")
    lines.append("    (j.tech?'<span>\\u0E0A\\u0E48\\u0E32\\u0E07: '+esc(j.tech)+'</span>':'')+")
    lines.append("    (j.created?'<span>\\u0E40\\u0E27\\u0E25\\u0E32: '+esc(j.created)+'</span>':'')+")
    lines.append("    '</div>'+")
    lines.append("    '<div class=\\\"flex gap-2\\\">'+")
    lines.append("    '<button class=\\\"flex-1 py-2 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold ac-view hover:bg-blue-100 transition-colors\\\" data-id=\\\"'+esc(j.id)+'\\\">\\u0E14\\u0E39</button>'+")
    lines.append("    '<button class=\\\"flex-1 py-2 bg-amber-50 text-amber-600 rounded-lg text-xs font-bold ac-st hover:bg-amber-100 transition-colors\\\" data-id=\\\"'+esc(j.id)+'\\\">\\u0E2A\\u0E16\\u0E32\\u0E19\\u0E30</button>'+")
    lines.append("    '<button class=\\\"flex-1 py-2 bg-purple-50 text-purple-600 rounded-lg text-xs font-bold ac-ed hover:bg-purple-100 transition-colors\\\" data-id=\\\"'+esc(j.id)+'\\\">\\u0E41\\u0E01\\u0E49\\u0E44\\u0E02</button>'+")
    lines.append("    '</div></div>';")
    lines.append("}")
    
    lines.append("function gCls(s){if(s.indexOf('\\u0E23\\u0E2D')