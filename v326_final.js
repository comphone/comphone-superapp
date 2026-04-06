// V326 Final Polish: Zero-bug defaults + Lazy Loading + processPhotos
const fs = require('fs');
const path = 'C:/Users/Server/.openclaw/workspace/Shop_vnext/src/Index.html';
let c = fs.readFileSync(path, 'utf8');

// === PATCH 1: Change refresh() to refreshData() + try/catch ===
const oldRefresh = `function refresh(){st("Refreshing...");google.script.run.withSuccessHandler(function(d){DATA=d;JOBS=(d&&d.jobs)||[];INV=(d&&d.inventory)||[];if(DATA&&DATA.summary&&DATA.summary.date)document.getElementById("clock").textContent=DATA.summary.date;render(d)}).withFailureHandler(function(e){st("Fail: "+e.message)}).getDashboardData()}`;

const newRefresh = `function refreshData(){try{google.script.run.withSuccessHandler(function(d2){try{DATA=d2;JOBS=(d2&&d2.jobs)||[];INV=(d2&&d2.inventory)||[];if(d2&&d2.summary&&d2.summary.date)document.getElementById("clock").textContent=d2.summary.date;render(d2)}catch(e3){se("Render",e3.message||e3)}}).withFailureHandler(function(e){se("Fail",e.message||e)}).getDashboardData()}catch(e){se("Refresh",e.message||e)}}`;

if (c.includes(oldRefresh)) {
  c = c.replace(oldRefresh, newRefresh);
  console.log('[1] refreshData with zero-bug try-catch');
} else {
  console.log('[X1] Could not find exact refresh pattern — finding it...');
  const idx = c.indexOf('function refresh()');
  if (idx > 0) {
    const line = c.substring(idx, idx + 200);
    console.log('Found:', line.substring(0, 100));
    c = c.replace(/function refresh\(\)\{/g, 'function refreshData(){');
    console.log('[1] Renamed refresh -> refreshData');
  }
}

// === PATCH 2: Limit jobs to 20 + add load-more button ===
const oldJobLine = '    for(var i=0;i<Math.min(jobs.length,50);i++){';
const newJobBlock = `    JOBS_ALL=jobs;var end=Math.min(jobs.length,20);for(var i=0;i<end;i++){`;

if (c.includes(oldJobLine)) {
  c = c.replace(oldJobLine, newJobBlock);
  console.log('[2] Jobs limited to 20 initially');
}

// Add load-more button after job cards
const afterJobs = "      h+='</div>';";
const afterJobsWithLazy = `      h+='</div>';
    if(jobs.length>20)h+='<div class="load-more" onclick="loadMoreJobs()">\\u2b07\\ufe0f \\u0e42\\u0e2b\\u0e25\\u0e14\\u0e40\\u0e1e\\u0e34\\u0e48\\u0e21 ('+'20 / '+jobs.length+')'+'</div>';`;

if (c.includes(afterJobs) && !c.includes('loadMoreJobs')) {
  c = c.replace(afterJobs, afterJobsWithLazy);
  console.log('[3] Added load-more button placeholder');
}

// Add loadMoreJobs function before processPhotos
const loadMoreFn = `
function loadMoreJobs(){
  var el=document.querySelector('.ca .jc');
  if(!el)return;
  var ca=el.closest('.ca');
  var jobs=JOBS_ALL||JOBS;
  var shown=(ca&&ca.getAttribute('data-shown'))?parseInt(ca.getAttribute('data-shown')):20;
  var end=Math.min(shown+20,jobs.length);
  var h='';
  for(var i=shown;i<end;i++){
    var j=jobs[i];var sc=gs(j.status);
    h='<div class="jc '+sc+'" data-jid="'+j.id+'" data-tech="'+(j.tech||'')+'" data-stat="'+j.status+'" data-cust="'+j.customer+'" data-symp="'+(j.symptom||'')+'" onclick="vJob(\\''+j.id+'\\')">';
    h+='<span class="ji">'+j.id+'</span><span class="jb b'+(sc.charAt(1)||'3')+'">'+gsl(j.status)+'</span>';
    h+='<div class="jn">'+es(j.customer)+'</div>';
    if(j.symptom)h+='<div class="jy">'+es(j.symptom)+'</div>';
    h+='<div class="jm">\\ud83d\\udd27 '+(j.tech||'-')+(j.created?' \\ud83d\\udd50 '+j.created:'')+'</div></div>';
    var div=document.createElement('div');div.innerHTML=h;
    ca.insertBefore(div.firstChild,ca.querySelector('.load-more'));
  }
  ca.setAttribute('data-shown',end);
  var lm=ca.querySelector('.load-more');
  if(lm){if(end>=jobs.length)lm.remove();else lm.textContent='\\u2b07\\ufe0f \\u0e42\\u0e2b\\u0e25\\u0e14\\u0e40\\u0e1e\\u0e34\\u0e48\\u0e21 ('+end+' / '+jobs.length+')';}
}
`;

if (!c.includes('function loadMoreJobs')) {
  const procIdx = c.indexOf('function processPhotos()');
  if (procIdx > 0) {
    c = c.substring(0, procIdx) + loadMoreFn + c.substring(procIdx);
    console.log('[4] Added loadMoreJobs()');
  }
}

// === PATCH 3: Fix processPhotos to use refreshData ===
c = c.replace('refresh()', 'refreshData()');
console.log('[5] Updated all refresh() calls to refreshData()');

// === PATCH 4: Update onclick in quick action bar ===
c = c.replace('onclick="refreshData()"', 'onclick="refreshData()"');

// === SAVE ===
fs.writeFileSync(path, c, 'utf8');
console.log('\nSaved:', c.length, 'bytes');

// === VERIFY ===
const c2 = fs.readFileSync(path, 'utf8');
const m = c2.match(/<script>([\s\S]*?)<\/script>/);
if (!m) {
  console.log('NO SCRIPT');
} else {
  try { new Function(m[1]); console.log('JS VALID'); }
  catch(e) {
    console.log('JS ERROR:', e.message);
    const lm = e.message.match(/line (\d+)/);
    if (lm) {
      const idx = parseInt(lm[1]);
      const jsl = m[1].split('\n');
      for (let i = Math.max(0, idx - 3); i <= Math.min(jsl.length - 1, idx + 3); i++) {
        console.log((i === idx - 1 ? '>>> ' : '    ') + 'L' + (i+1) + ': ' + jsl[i].substring(0, 130));
      }
    }
  }
}
