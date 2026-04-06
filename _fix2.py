# -*- coding: utf-8 -*-
"""Fix dashboard Part 2 - JS"""
d = 'C:\\Users\\Server\\.openclaw\\workspace\\Shop_vnext\\src\\Index.html'
f = open(d, 'a', encoding='utf-8')

f.write("""
var DATA=null,JOBS=[],activeTab='pageDashboard',currentFilter='all',selJobId='',selStatus='';

// ====== NAVIGATION ======
function go(p){
  try{
    document.querySelectorAll('.page').forEach(function(x){x.classList.add('hidden');x.classList.remove('active')});
    var e=document.getElementById(p);if(e){e.classList.remove('hidden');e.classList.add('active')}
    activeTab=p;
    sn('tabDashboard',p==='pageDashboard');sn('tabJobs',p==='pageJobs');sn('tabStock',p==='pageStock');
    var fa=document.getElementById('fabBtn');
    fa.style.display=(p==='pageDashboard'||p==='pageJobs')?'flex':'none';
    if(p==='pageDashboard')rDash();
    else if(p==='pageJobs')rJobs();
    else if(p==='pageStock')rStock();
  }catch(err){showErr('nav: '+err.message)}
}
function sn(id,a){var e=document.getElementById(id);if(!e)return;e.className='flex flex-col items-center px-4 py-2 text-xs transition '+(a?'text-brand font-bold':'text-gray-400 font-semibold')}

// ====== ERROR HANDLING ======
function showErr(m){var b=document.getElementById('errorBar');b.textContent=m;b.classList.remove('hidden');b.classList.add('flex')}
function hideErr(){var b=document.getElementById('errorBar');b.classList.add('hidden');b.classList.remove('flex')}

// ====== DATA LOAD ======
function loadData(){
  try{
    if(typeof google==='undefined' || !google.script){
      showErr('\\u0E04\\u0E23\\u0E2D\\u0E07\\u0E44\\u0E21\\u0E48\\u0E1E\\u0E23\\u0E49\\u0E2D\\u0E21');
      return;
    }
    google.script.run
      .withSuccessHandler(function(d){
        try{
          DATA=d;
          JOBS=(d&&d.jobs)||[];
          if(!d||!d.summary){
            document.getElementById('pageDashboard').innerHTML='<div class="text-center py-20 text-gray-400"><div class="text-4xl mb-3">\\u{1F613}</div><p class="font-semibold">\\u0E02\\u0E49\\u0E2D\\u0E21\\u0E39\\u0E25\\u0E44\\u0E21\\u0E48\\u0E16\\u0E39\\u0E01\\u0E15\\u0E49\\u0E2D\\u0E07</p><p class="text-xs mt-1">'+JSON.stringify(d||{}).substring(0,200)+'</p></div>';
            return;
          }
          if(DATA.summary.date) document.getElementById('clock').textContent=DATA.summary.date;
          hideErr();
          rAct();
        }catch(e){showErr('render: '+e.message);showFallback()}
      })
      .withFailureHandler(function(e){
        hideErr();
        showErr('\\u0E40\\u0E0A\\u0E37\\u0E48\\u0E2D\\u0E21\\u0E15\\u0E48\\u0E2D\\u0E44\\u0E21\\u0E48\\u0E44\\u0E14\\u0E49: '+e.message);
        document.getElementById('pageDashboard').innerHTML='<div class="text-center py-20 text-gray-400"><div class="text-4xl mb-3">\\u274C</div><p class="font-semibold mb-2">'+e.message+'</p><button onclick="loadData()" class="mt-2 px-6 py-3 bg-brand text-white rounded-xl font-bold text-sm">\\u{1F504} \\u0E25\\u0E2D\\u0E07\\u0E43\\u0E2B\\u0E21\\u0E48</button></div>';
      })
      .getDashboardData();
  }catch(e){showErr(e.message);showFallback()}
}
function showFallback(){
  // Don't overwrite - keep skeleton visible, just show error bar
}
function rAct(){try{if(activeTab==='pageDashboard')rDash();else if(activeTab==='pageJobs')rJobs();else if(activeTab==='pageStock')rStock()}catch(e){showErr(e.message)}}

// ====== DASHBOARD ======
function rDash(){
  try{
    if(!DATA||!DATA.summary){return}
    var s=DATA.summary, h='';
    h+='<div class="bg-gradient-to-r from-brand-light to-emerald-100 rounded-2xl p-5 mb-4 border border-brand/20">';
    h+='<div class="flex items-center gap-3">';
    h+='<div class="w-12 h-12 bg-brand rounded-xl flex items-center justify-center text-white text-xl shadow-md">\\u{1F4F1}</div>';
    h+='<div><h2 class="text-lg font-extrabold text-brand-dark">\\u0E22\\u0E34\\u0E19\\u0E14\\u0E35\\u0E15\\u0E49\\u0E2D\\u0E19\\u0E23\\u0E31\\u0E1A</h2>';
    h+='<p class="text-xs text-gray-500">Comphone Super App</p></div></div></div>';
    h+='<div class="grid grid-cols-2 gap-3 mb-4">';
    h+=tl(''+(s.pending||0),'\\u0E23\\u0E2D\\u0E14\\u0E33\\u0E40\\u0E19\\u0E34\\u0E19\\u0E01\\u0E32\\u0E23','bg-amber-50 border-amber-200','text-amber-600','\\u23F3');
    h+=tl(''+(s.inProgress||0),'\\u0E01\\u0E33\\u0E25\\u0E31\\u0E07\\u0E17\\u0E33','bg-blue-50 border-blue-200','text-blue-600','\\uD83D\\uDD04');
    h+=tl(''+(s.completed||0),'\\u0E40\\u0E2A\\u0E23\\u0E47\\u0E08\\u0E41\\u0E25\\u0E49\\u0E27','bg-green-50 border-green-200','text-green-600','\\u2705');
    h+=tl(''+(s.lowStock||0),'\\u0E2A\\u0E15\\u0E47\\u0E2D\\u0E01\\u0E15\\u0E48\\u0E33','bg-red-50 border-red-200','text-red-600','\\uD83D\\uDEA8');
    h+='</div>';
    h+='<div class="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-4">';
    h+='<h3 class="text-sm font-bold text-gray-700 mb-3">\\u0E02\\u0E49\\u0E2D\\u0E21\\u0E39\\u0E25\\u0E23\\u0E27\\u0E21</h3>';
    h+=rw('\\u0E07\\u0E32\\u0E19\\u0E17\\u0E31\\u0E49\\u0E07\\u0E2B\\u0E21\\u0E14',(s.totalJobs||0)+' \\u0E07\\u0E32\\u0E19');
    h+=rw('\\u0E2D\\u0E30\\u0E44\\u0E25\\u0E48\\u0E43\\u0E19\\u0E23\\u0E30\\u0E1A\\u0E1A',(s.totalItems||0)+' \\u0E23\\u0E32\\u0E22\\u0E01\\u0E32\\u0E23');
    h+='<div class="flex justify-between items-center pt-2"><span class="text-xs text-gray-500">\\u0E2D\\u0E31\\u0E1B\\u0E40\\u0E14\\u0E15\\u0E25\\u0E48\\u0E32\\u0E2A\\u0E38\\u0E14</span><span class="font-bold text-xs text-gray-400">'+(s.date||'-')+'</span></div>';
    h+='</div>';
    h+='<button onclick="openNewJob()" class="w-full py-4 bg-gradient-to-r from-brand to-brand-dark text-white rounded-2xl font-bold text-base shadow-lg shadow-brand/20 transition-all mb-3">\\u2795 \\u0E40\\u0E1B\\u0E34\\u0E14\\u0E07\\u0E32\\u0E19\\u0E43\\u0E2B\\u0E21\\u0E48</button>';
    h+='<div class="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-700">\\u0E01\\u0E14\\u0E41\\u0E17\\u0E47\\u0E1A\\u0E07\\u0E32\\u0E19 = \\u0E14\\u0E39\\u0E23\\u0E32\\u0E22 \\u2022 \\u0E01\\u0E14\\u0E41\\u0E17\\u0E47\\u0E1A\\u0E2A\\u0E15\\u0E47\\u0E2D\\u0E01 = \\u0E0A\\u0E47\\u0E2D\\u0E04 \\u2022 \\u0E01\\u0E14 + = \\u0E40\\u0E1B\\u0E34\\u0E14\\u0E07\\u0E32\\u0E19\\u0E43\\u0E2B\\u0E21\\u0E48</div>';
    document.getElementById('pageDashboard').innerHTML=h;
  }catch(e){showErr('Dashboard: '+e.message)}
}
function tl(n,l,bg,c,ic){
  return '<div class="'+bg+' rounded-2xl p-4 border card-hover"><div class="flex justify-between mb-1"><span class="text-3xl font-black '+c+'">'+n+'</span><span class="text-lg opacity-60">'+ic+'</span></div><p class="text-xs font-medium '+c+'">'+l+'</p></div>';
}
function rw(l,v){
  return '<div class="flex justify-between py-2 border-b border-gray-100"><span class="text-xs text-gray-500">'+l+'</span><span class="font-bold text-sm">'+v+'</span></div>';
}
""")

f.close()
print('Part 2 done')
