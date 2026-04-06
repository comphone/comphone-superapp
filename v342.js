// V342 - Final Stability Fix
const fs = require('fs');
const path = 'C:/Users/Server/.openclaw/workspace/Shop_vnext/src/Index.html';
let c = fs.readFileSync(path, 'utf8');

// ===== FIX 1: applyFilt() null guard =====
// The function crashes when fsearch/ftech/fstat don't exist
// or when data-cust attributes are null/undefined
const oldApplyFilt = `function applyFilt(){

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

  if(cnt)cnt.textContent='แสดง '+shown+' งาน';}`;

const newApplyFilt = `function applyFilt(){
  try{
  var cards=document.querySelectorAll('.jc');
  if(!cards||cards.length===0)return;
  var sr2=document.getElementById('fsearch');
  var st2=document.getElementById('ftech');
  var st3=document.getElementById('fstat');
  if(!sr2)return;
  var q=(sr2.value||'').toLowerCase();
  var t=st2?st2.value||'':'';
  var s=st3?st3.value||'':'';
  var shown=0;
  for(var i=0;i<cards.length;i++){
    var card=cards[i];
    var match=true;
    if(q){var cc=(card.getAttribute('data-cust')||'').toLowerCase();var cj=(card.getAttribute('data-jid')||'').toLowerCase();var cs=(card.getAttribute('data-symp')||'').toLowerCase();if(cc.indexOf(q)===-1&&cj.indexOf(q)===-1&&cs.indexOf(q)===-1)match=false}
    if(t&&card.getAttribute('data-tech')!==t)match=false;
    if(s&&card.getAttribute('data-stat')!==s)match=false;
    if(match){card.style.display='block';shown++}else{card.style.display='none'}
  }
  var cnt=document.getElementById('fcnt');
  if(cnt)cnt.textContent='แสดง '+shown+' งาน';
  }catch(e){console.log('applyFilt error:',e)}
}`;

if (c.includes(oldApplyFilt)) {
  c = c.replace(oldApplyFilt, newApplyFilt);
  console.log('[1] applyFilt: null-safe guards added');
} else {
  console.log('[X1] applyFilt pattern not found — using regex fallback');
  // Fallback: just add try-catch around the function
  // Find the function by name and wrap it
  const fnIdx = c.indexOf('function applyFilt(){');
  if (fnIdx > 0) {
    // Find the matching closing brace
    const fnStart = fnIdx + 'function applyFilt(){'.length;
    let depth = 1, pos = fnStart;
    while (pos < c.length && depth > 0) {
      const ch = c[pos];
      if (ch === '{') depth++;
      else if (ch === '}') depth--;
      pos++;
    }
    // pos is now after the closing brace
    const fnBody = c.substring(fnStart, pos - 1);
    const oldFn = c.substring(fnIdx, pos);
    const newFn = `function applyFilt(){try{${fnBody}}catch(e){console.log('applyFilt error:',e)}}`;
    c = c.replace(oldFn, newFn);
    console.log('[1] applyFilt: wrapped in try-catch');
  }
}

// ===== FIX 2: Change all refresh() → refreshData() =====
// processPhotos() still calls refresh() which doesn't exist
c = c.replace(/\brefresh\(\)/g, 'refreshData()');
console.log('[2] All refresh() calls → refreshData()');

// ===== FIX 3: Fix loadMoreJobs null guards =====
const oldLoadMore = `function loadMoreJobs(){
  var el=document.querySelector('.ca .jc');
  if(!el)return;
  var ca=el.closest('.ca');`;

const newLoadMore = `function loadMoreJobs(){
  try{
  var el=document.querySelector('.ca .jc');
  if(!el)return;
  var ca=el.closest('.ca');
  if(!ca)return;`;
c = c.replace(oldLoadMore, newLoadMore);
console.log('[3] loadMoreJobs: null guard added');

// Fix the loadMoreJobs closing — need to add closing try-catch
// Find: ca.setAttribute('data-shown',end);
const endIdx = c.indexOf("ca.setAttribute('data-shown',end);");
if (endIdx > 0) {
  // Find the end of this function's closing brace
  const after = c.substring(endIdx);
  const braceIdx = after.indexOf('}');
  if (braceIdx > 0 && after.substring(braceIdx - 1, braceIdx) !== '}') {
    // Close the try-catch before the closing brace
    const before = c.substring(0, endIdx + "ca.setAttribute('data-shown',end);".length);
    const rest = c.substring(endIdx + "ca.setAttribute('data-shown',end);".length);
    c = before + "\n  }catch(e2){alert('Error loading more');console.log(e2)}" + rest;
    console.log('[4] loadMoreJobs: try-catch closed');
  }
}

// ===== FIX 4: Fix .cnt class reference → id="fcnt" =====
// In render(), filter uses id="fcnt" but CSS has .cnt — no issue since we use getElementById
// But check the filter bar div — currently has class="fl" but CSS is #fl
// Fix: change the filter bar's class to match CSS
c = c.replace('id="filter" class="fl"', 'id="fl"');

// ===== FIX 5: Update console.log version =====
c = c.replace('console.log("V321 loaded")', 'console.log("V326 loaded")');
console.log('[5] Version log → V326');

// ===== FIX 6: Update title =====
c = c.replace('<title>Comphone Dashboard V323</title>', '<title>Comphone Dashboard V326</title>');
console.log('[6] Title → V326');

// ===== SAVE =====
fs.writeFileSync(path, c, 'utf8');
console.log('\nSaved:', c.length, 'bytes');

// ===== VERIFY =====
const check = fs.readFileSync(path, 'utf8');
const m = check.match(/<script>([\s\S]*?)<\/script>/);
if (!m) {
  console.log('❌ NO SCRIPT TAG');
} else {
  try {
    new Function(m[1]);
    console.log('✅ JS SYNTAX VALID');
  } catch(e) {
    console.log('❌ JS ERROR:', e.message);
    const lm = e.message.match(/line (\d+)/);
    if (lm) {
      const idx = parseInt(lm[1]);
      const jsl = m[1].split('\n');
      const end = Math.min(jsl.length, idx + 4);
      for (let i = Math.max(0, idx - 4); i < end; i++) {
        console.log((i === idx - 1 ? '>>> ' : '    ') + 'L' + (i+1) + ': ' + jsl[i].substring(0, 130));
      }
    }
  }
}
