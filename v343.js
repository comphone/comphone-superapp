// V343 - Final Stability Fix
const fs = require('fs');
const path = 'C:/Users/Server/.openclaw/workspace/Shop_vnext/src/Index.html';
let c = fs.readFileSync(path, 'utf8');

// ============================================================
// FIX 1: HTML Structure — broken <select>/<div> nesting in filter
// CURRENT (broken):
//   h+='<div class="row"><select id="ftech" ...><option value="">ช่างทั้งหมด</option>';
//   for(var k in techs)h+='<option>'+k+'</option></div>';
//
// PROBLEM: </div> closes <div class="row"> but <select> is never closed!
//
// FIX: Close </select> before </div>
// ============================================================

const oldTechBad = "for(var k in techs)h+='<option>'+k+'</option></div>';";
const newTechGood = "for(var k in techs)h+='<option>'+es(k)+'</option>';h+='</select></div>';";

if (c.includes(oldTechBad)) {
  c = c.replace(oldTechBad, newTechGood);
  console.log('[FIX 1] Fixed select/div nesting in tech filter');
} else {
  console.log('[WARN 1] tech filter pattern not exact — searching...');
  // Find and show what's there
  const idx = c.indexOf('for(var k in techs)');
  if (idx > 0) {
    console.log('  Actual:', c.substring(idx, idx + 60));
  }
}

// ============================================================
// FIX 2: applyFilt() — null-safe on EVERY attribute access
// ============================================================

const oldAF = `function applyFilt(){try{

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

}catch(e){console.log('applyFilt error:',e)}}`;

const newAF = `function applyFilt(){try{
  var cards=document.querySelectorAll('.jc');
  if(!cards||cards.length===0)return;
  var sr2=document.getElementById('fsearch');
  if(!sr2)return;
  var st2=document.getElementById('ftech');
  var st3=document.getElementById('fstat');
  var q=(sr2.value||'').toLowerCase();
  var t=st2?st2.value||'':'';
  var s=st3?st3.value||'':'';
  var shown=0;
  for(var i=0;i<cards.length;i++){
    var card=cards[i];
    var match=true;
    if(q){
      var cc=(card.getAttribute('data-cust')||'').toLowerCase();
      var cj=(card.getAttribute('data-jid')||'').toLowerCase();
      var cs=(card.getAttribute('data-symp')||'').toLowerCase();
      if(cc.indexOf(q)===-1&&cj.indexOf(q)===-1&&cs.indexOf(q)===-1)match=false;
    }
    if(t&&(card.getAttribute('data-tech')||'')!==t)match=false;
    if(s&&(card.getAttribute('data-stat')||'')!==s)match=false;
    if(match){card.style.display='block';shown++}else{card.style.display='none'}
  }
  var cnt=document.getElementById('fcnt');
  if(cnt)cnt.textContent='แสดง '+shown+' งาน';
}catch(e){console.log('applyFilt error:',e)}}`;

if (c.includes(oldAF)) {
  c = c.replace(oldAF, newAF);
  console.log('[FIX 2] applyFilt: fully null-safe');
} else {
  console.log('[WARN 2] applyFilt pattern not exact');
  // Check the actual text around this function
  const idx = c.indexOf('function applyFilt()');
  if (idx > 0) {
    const end = c.indexOf('}catch(e){console.log', idx);
    if (end > 0) {
      const fn = c.substring(idx, end + 40);
      console.log('  Actual fn (first 200):', fn.substring(0, 200));
    }
  }
}

// ============================================================
// FIX 3: loadMoreJobs() — ca used outside try/catch
// ============================================================

// Current:
//   try{
//     ...ca = el.closest('.ca'); if(!ca)return;
//     ...ca.setAttribute('data-shown',end);
//   }catch(e2){...}
//   var lm = ca.querySelector('.load-more');  // ca might be undefined if el was null
//
// But wait — if el is null, we return early inside try. So ca should be OK.
// Actually, the real issue: if el is null, we return — but lm uses ca after catch.
// Move lm and end/lm logic INTO the try block.

const oldLM = `  ca.setAttribute('data-shown',end);
  }catch(e2){alert('Error loading more');console.log(e2)}
  var lm=ca.querySelector('.load-more');
  if(lm){if(end>=jobs.length)lm.remove();else lm.textContent='\u2b07\ufe0f \u0e42\u0e2b\u0e25\u0e14\u0e40\u0e1e\u0e34\u0e48\u0e21 ('+end+' / '+jobs.length+')';}`;

const newLM = `  ca.setAttribute('data-shown',end);
  var lm=ca.querySelector('.load-more');
  if(lm){if(end>=jobs.length)lm.remove();else lm.textContent='\u2b07\ufe0f \u0e42\u0e2b\u0e25\u0e14\u0e40\u0e1e\u0e34\u0e48\u0e21 ('+end+' / '+jobs.length+')';}
  }catch(e2){alert('Error loading more');console.log(e2)}`;

if (c.includes(oldLM)) {
  c = c.replace(oldLM, newLM);
  console.log('[FIX 3] loadMoreJobs: moved DOM ops inside try/catch');
} else {
  console.log('[WARN 3] loadMoreJobs pattern not exact');
  const idx = c.indexOf("ca.setAttribute('data-shown',end);");
  if (idx > 0) {
    console.log('  Actual:', c.substring(idx, idx + 200));
  }
}

// ============================================================
// FIX 4: Hide error bar on success — sr() should hide #eb
// Already done in sr() — verify
// ============================================================
if (c.includes('document.getElementById("eb").style.display="none"')) {
  console.log('[OK 4] sr() hides error bar ✓');
} else {
  console.log('[WARN 4] sr() might not hide error bar');
}

// ============================================================
// FIX 5: Version bump
// ============================================================
c = c.replace(/V342/g, 'V343');
console.log('[FIX 5] Version → V343');

// ============================================================
// SAVE
// ============================================================
fs.writeFileSync(path, c, 'utf8');
console.log('\nSaved:', c.length, 'bytes');

// ============================================================
// VERIFY — Full JS validation
// ============================================================
const c2 = fs.readFileSync(path, 'utf8');
const m = c2.match(/<script>([\s\S]*?)<\/script>/);
if (!m) {
  console.log('❌ NO SCRIPT TAG');
  process.exit(1);
}

try {
  new Function(m[1]);
  console.log('✅ V343 JS SYNTAX VALID');
} catch(e) {
  console.log('❌ JS ERROR:', e.message);
  const lm = e.message.match(/line (\d+)/);
  if (lm) {
    const idx = parseInt(lm[1]);
    const jsl = m[1].split('\n');
    for (let i = Math.max(0, idx - 4); i <= Math.min(jsl.length - 1, idx + 4); i++) {
      console.log((i === idx - 1 ? '>>> ' : '    ') + 'L' + (i+1) + ': ' + jsl[i].substring(0, 140));
    }
  }
}

// Check for unclosed tags
const selectOpen = (c.match(/<select/g) || []).length;
const selectClose = (c.match(/<\/select>/g) || []).length;
console.log(`\n<select>: ${selectOpen} opens, ${selectClose} closes`, selectOpen === selectClose ? '✓' : '✗ MISMATCH');

// Check all functions exist
const funcs = ['applyFilt','render','vJob','refreshData','processPhotos','loadMoreJobs','oSt','eJob','sv','cSt','addNote','sj','sendLineSummary','cm','om','es','gs','gsl','fj','sr','se','st','openNewJob','showQuickNote','addQuickNote2'];
const missing = funcs.filter(fn => !c2.includes('function ' + fn + '('));
if (missing.length > 0) console.log('MISSING:', missing.join(', '));
else console.log('ALL', funcs.length, 'functions present ✓');

// Check HTML ends properly
console.log('Ends with </html>:', c2.trim().endsWith('</html>') ? '✓' : '✗');
console.log('Ends with </script>:', c2.includes('</script>') && c2.endsWith('</html>') ? '✓' : '✗');
