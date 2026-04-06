# -*- coding: utf-8 -*-
import os
dst = os.path.join(os.path.dirname(__file__), 'Shop_vnext', 'src', 'Index.html')
with open(dst, 'w', encoding='utf-8') as f:
    f.write(generate())
print('OK: wrote', os.path.getsize(dst), 'bytes ->', dst)

def generate():
    return '''\
<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Comphone Dashboard V313</title>
<script src="https://cdn.tailwindcss.com"></script>
<script>
tailwind.config={theme:{extend:{colors:{brand:{DEFAULT:'#1DB446',dark:'#18933a',light:'#E8F5E9'}}}}};
</script>
<style>
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@300;400;500;600;700;800;900&display=swap');
body{font-family:'Noto Sans Thai',-apple-system,sans-serif}
.card-hover{transition:all .2s ease}.card-hover:hover{transform:translateY(-2px);box-shadow:0 8px 25px rgba(0,0,0,.1)}
.fade-in{animation:fadeIn .3s ease-out}@keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
.slide-up{animation:slideUp .3s ease-out}@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
.scrollbar-hide::-webkit-scrollbar{display:none}.scrollbar-hide{-ms-overflow-style:none;scrollbar-width:none}
.line-clamp-2{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
</style></head>
<body class="bg-gray-50 text-gray-800 min-h-screen pb-20 pt-16">
<header class="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-brand to-brand-dark text-white shadow-lg">
<div class="max-w-3xl mx-auto px-4 py-3 flex justify-between items-center">
<div class="flex items-center gap-2"><span class="text-2xl">\U0001F4F1;</span>
<h1 class="text-lg font-extrabold tracking-tight">Comphone Dashboard</h1></div>
<div id="clock" class="text-xs font-medium opacity-90 bg-white/20 px-3 py-1 rounded-full">...</div></div></header>
<nav class="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-[0_-2px_10px_rgba(0,0,0,0.06)]">
<div class="max-w-3xl mx-auto flex justify-around py-1">''' + \
nav_btn('tabDashboard','pageDashboard','\U0001F4CA','\u0E2A\u0E23\u0E38\u0E1B') + \
nav_btn('tabJobs','pageJobs','\U0001F4CB','\u0E07\u0E32\u0E19') + \
nav_btn('tabStock','pageStock','\U0001F4E6','\u0E2A\u0E15\u0E47\u0E2D\u0E01') + '''
</div></nav>
<main class="max-w-3xl mx-auto px-4 pt-4">
<section id="pageDashboard" class="page active fade-in"></section>
<section id="pageJobs" class="page hidden fade-in">
<div class="sticky top-16 z-30 bg-gray-50 py-3 -mx-4 px-4">
<div class="relative">
<span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">\U0001F50D;</span>
<input type="text" id="searchInput" placeholder="\u0E04\u0E49\u0E19\u0E2B\u0E32 JobID, \u0E0A\u0E37\u0E48\u0E2D\u0E25\u0E39\u0E01\u0E04\u0E49\u0E32..." class="w-full pl-10 pr-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-sm focus:border-brand focus:outline-none transition-colors shadow-sm">
</div>
<div class="flex gap-2 mt-3 overflow-x-auto scrollbar-hide pb-1">
<button class="filter-btn px-4 py-1.5 bg-brand text-white rounded-full text-xs font-bold" data-filter="all">\u0E17\u0E31\u0E49\u0E07\u0E2B\u0E21\u0E14</button>
<button class="filter-btn px-4 py-1.5 bg-amber-100 text-amber-700 rounded-full text-xs font-bold" data-filter="\u0E23\u0E2D\u0E14\u0E33\u0E40\u0E19\u0E34\u0E19\u0E01\u0E32\u0E23">\u23F3 \u0E23\u0E2D</button>
<button class="filter-btn px-4 py-1.5 bg-blue-100 text-blue-700 rounded-full text-xs font-bold" data-filter="InProgress">\U0001F504 \u0E17\u0E33</button>
<button class="filter-btn px-4 py-1.5 bg-green-100 text-green-700 rounded-full text-xs font-bold" data-filter="Completed">\u2705 \u0E40\u0E2A\u0E23\u0E47\u0E08</button>
</div></div>
<div id="jobCards" class="space-y-3 pb-4"></div></section>
<section id="pageStock" class="page hidden fade-in"></section>
<section id="pageForm" class="page hidden fade-in">
<div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
<h2 id="formTitle" class="text-lg font-extrabold text-brand mb-4"></h2>
<div id="formBody" class="space-y-4"></div></div></section>
</main>
<button id="fabBtn" class="fixed bottom-20 right-5 w-14 h-14 bg-gradient-to-br from-brand to-brand-dark text-white rounded-full shadow-lg shadow-brand/30 flex items-center justify-center text-2xl font-bold z-40 hover:scale-105 active:scale-95 transition-transform" onclick="openNewJob()">+</button>
<div id="alertModal" class="fixed inset-0 z-[60] bg-black/50 hidden items-center justify-center p-4" onclick="if(event.target===this)this.classList.add('hidden')">
<div class="bg-white rounded-2xl p-6 w-full max-w-sm slide-up text-center">
<div id="alertIcon" class="text-4xl mb-3"></div>
<h3 id="alertTitle" class="text-lg font-bold mb-2"></h3>
<p id="alertMsg" class="text-sm text-gray-500 leading-relaxed mb-5 whitespace-pre-line"></p>
<button onclick="document.getElementById('alertModal').classList.add('hidden')" class="w-full py-3 bg-brand text-white rounded-xl font-bold text-sm hover:bg-brand-dark transition-colors">\u0E15\u0E01\u0E25\u0E07</button></div></div>
<div id="statusModal" class="fixed inset-0 z-[60] bg-black/50 hidden items-end justify-center" onclick="if(event.target===this)this.classList.add('hidden')">
<div class="bg-white rounded-t-2xl p-5 w-full max-w-md slide-up">
<div class="flex justify-between items-center mb-3">
<h3 id="statusTitle" class="text-lg font-bold"></h3>
<button onclick="document.getElementById('statusModal').classList.add('hidden')" class="text-2xl text-gray-400 hover:text-gray-600">&times;</button></div>
<p id="statusSubtitle" class="text-sm text-gray-500 mb-4"></p>
<div id="statusOptions" class="grid grid-cols-2 gap-2 mb-4"></div>
<div class="mb-4">
<label class="text-xs font-bold text-gray-600 mb-1 block">\u0E2B\u0E21\u0E32\u0E22\u0E40\u0E2B\u0E15\u0E38\u0E41\u0E15\u0E48\u0E21</label>
<input type="text" id="statusNote" placeholder="\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E40\u0E15\u0E37\u0E2D\u0E21..." class="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-brand focus:outline-none"></div>
<button id="statusSave" class="w-full py-3 bg-brand text-white rounded-xl font-bold text-sm hover:bg-brand-dark transition-colors disabled:opacity-50" onclick="saveStatus()">\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01</button></div></div>
<div id="loadingOverlay" class="fixed inset-0 z-[70] bg-white/80 hidden items-center justify-center">
<div class="text-center"><div class="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
<p class="text-sm font-semibold text-gray-500">\u0E01\u0E33\u0E25\u0E31\u0E07\u0E42\u0E2B\u0E25\u0E14...</p></div></div>
''' + js_block() + '''
</body></html>'''

def nav_btn(id, page, icon, label):
    active = 'text-brand font-bold' if page == 'pageDashboard' else 'text-gray-400 font-semibold'
    first = page == 'pageDashboard'
    ac = ''
    if first:
        ac = ' id="tabDashboard"'
    return '<button{} class="flex flex-col items-center px-4 py-2 text-xs transition-all {}" onclick="go(\'{}\')"><span class="text-xl mb-0.5">{}</span><span>{}</span></button>'.format(ac, active, page, icon, label)

def js_block():
    return """<script>
// =================== STATE ===================
var DATA=null,JOBS=[],activeTab='pageDashboard',currentFilter='all',selJobId='',selStatus='';

// =================== NAV ===================
function go(p){
  document.querySelectorAll('.page').forEach(function(x){x.classList.add('hidden');x.classList.remove('active')});
  var el=document.getElementById(p);
  if(el){el.classList.remove('hidden');el.classList.add('active')}
  activeTab=p;
  setNav('tabDashboard',p==='pageDashboard');
  setNav('tabJobs',