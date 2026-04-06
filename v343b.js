// V343b - Fix 2 remaining patterns
const fs = require('fs');
const path = 'C:/Users/Server/.openclaw/workspace/Shop_vnext/src/Index.html';
let c = fs.readFileSync(path, 'utf8');

// ==== FIX 2: applyFilt - null safety on getAttribute ====
// The issue: c.getAttribute('data-cust').toLowerCase() crashes if attr is null
// Replace: c.getAttribute('data-cust').toLowerCase() → (c.getAttribute('data-cust')||'').toLowerCase()

let changes = 0;

// Replace every occurrence of .getAttribute('...X...').toLowerCase() with safe version
const nullUnsafe = [
  "c.getAttribute('data-cust').toLowerCase()",
  "c.getAttribute('data-jid').toLowerCase()",
  "c.getAttribute('data-symp').toLowerCase()"
];

for (const bad of nullUnsafe) {
  const safe = '(' + bad.replace('.toLowerCase()', '').replace(/\.getAttribute\(/g, "(getAttribute(") + "||'\").toLowerCase()";
  // Simpler approach - just replace the specific strings
}

// Better approach: replace the exact patterns
const replacements1 = [
  ["c.getAttribute('data-cust').toLowerCase()", "(c.getAttribute('data-cust')||'').toLowerCase()"],
  ["c.getAttribute('data-jid').toLowerCase()", "(c.getAttribute('data-jid')||'').toLowerCase()"],
  ["c.getAttribute('data-symp').toLowerCase()", "(c.getAttribute('data-symp')||'').toLowerCase()"],
];

for (const [from, to] of replacements1) {
  if (c.includes(from)) {
    c = c.replaceAll(from, to);
    changes++;
    console.log(`[FIX] ${from.substring(0,40)} → safe`);
  }
}

// Also fix: st2.value and st3.value when element might not exist
// Change: var t=st2.value; → var t=st2?(st2.value||''):'';
if (c.includes('var t=st2.value;')) {
  c = c.replace(/var t=st2\.value;/g, "var t=st2?(st2.value||''):'';");
  changes++;
  console.log('[FIX] st2.value null-safe');
}
if (c.includes('var s=st3.value;')) {
  c = c.replace(/var s=st3\.value;/g, "var s=st3?(st3.value||''):'';");
  changes++;
  console.log('[FIX] st3.value null-safe');
}

// ==== FIX 3: loadMoreJobs - move .load-more logic into try/catch ====
// Current structure:
//   try{
//     ...ca.setAttribute('data-shown',end);
//   }catch(e2){...}
//   var lm=ca.querySelector('.load-more');  ← ca might be undefined here
//
// Need to move the lm code into try block

const old1 = `  ca.setAttribute('data-shown',end);
  }catch(e2){alert('Error loading more');console.log(e2)}
  var lm=ca.querySelector('.load-more');
  if(lm){if(end>=jobs.length)lm.remove();else lm.textContent='\u2b07\ufe0f`;

const new1 = `  ca.setAttribute('data-shown',end);
  var lm=ca.querySelector('.load-more');
  if(lm){if(end>=jobs.length)lm.remove();else lm.textContent='\u2b07\ufe0f`;

// Find the exact text
const lmIdx = c.indexOf("ca.setAttribute('data-shown',end);");
if (lmIdx > 0) {
  // Find the next ~300 chars to see exact structure
  const block = c.substring(lmIdx, lmIdx + 300);
  console.log('\nloadMoreJobs block:\n', block.substring(0, 250));
  
  // The issue: lm and end vars are outside try scope
  // Simplest fix: wrap the lm block too
  // Find the closing }catch line and move lm before it
  
  // Strategy: replace the whole block
  // Match: ca.setAttribute...end};\n  }catch(e2)...e2)}\n  var lm=ca...;}
  const searchStart = "ca.setAttribute('data-shown',end);";
  const searchEnd = "' / '+jobs.length+')';}";
  
  const startIdx = c.indexOf(searchStart);
  const endSearch = c.indexOf(searchEnd, startIdx);
  if (startIdx > 0 && endSearch > startIdx) {
    const fullBlock = c.substring(startIdx, endSearch + searchEnd.length);
    
    const newBlock = `ca.setAttribute('data-shown',end);
  var lm=ca.querySelector('.load-more');
  if(lm){if(end>=jobs.length)lm.remove();else lm.textContent='\\u2b07\\ufe0f \\u0e42\\u0e2b\\u0e25\\u0e14\\u0e40\\u0e1e\\u0e34\\u0e48\\u0e21 ('+end+' / '+jobs.length+')';}
  }catch(e2){alert('Error loading more');console.log(e2)}`;
    
    if (fullBlock !== newBlock) {
      c = c.replace(fullBlock, newBlock);
      changes++;
      console.log('[FIX] loadMoreJobs: moved DOM ops into try block');
    }
  }
}

// Also fix: end variable is used outside try scope, need to declare before try
// In loadMoreJobs, 'end' is inside try, used outside → ReferenceError
// Fix: declare var end = 0 before try

const lmFnStart = c.indexOf('function loadMoreJobs(){\n  try{');
if (lmFnStart > 0) {
  c = c.replace(
    'function loadMoreJobs(){\n  try{',
    'function loadMoreJobs(){\n  var end=0;\n  try{'
  );
  changes++;
  console.log('[FIX] loadMoreJobs: declared end=0 before try');
}

// SAVE
fs.writeFileSync(path, c, 'utf8');
console.log('\nTotal changes:', changes);
console.log('Saved:', c.length, 'bytes');

// VERIFY
const c2 = fs.readFileSync(path, 'utf8');
const m = c2.match(/<script>([\s\S]*?)<\/script>/);
if (!m) {
  console.log('NO SCRIPT');
} else {
  try { new Function(m[1]); console.log('V343 JS VALID ✓'); }
  catch(e) {
    console.log('JS ERROR:', e.message);
    const lm2 = e.message.match(/line (\d+)/);
    if (lm2) {
      const idx = parseInt(lm2[1]);
      const jsl = m[1].split('\n');
      for (let i = Math.max(0, idx - 4); i <= Math.min(jsl.length - 1, idx + 4); i++) {
        console.log((i === idx - 1 ? '>>> ' : '    ') + 'L' + (i+1) + ': ' + jsl[i].substring(0, 130));
      }
    }
  }
}

// Final checks
const selectOpen = (c2.match(/<select/g) || []).length;
const selectClose = (c2.match(/<\/select>/g) || []).length;
console.log(`\nSelect tags: ${selectOpen} open, ${selectClose} close`, selectOpen === selectClose ? '✓' : '✗');

// Check no more unsafe getAttribute
const unsafe = c2.match(/\.getAttribute\('[^']+'\)\.toLowerCase\(\)/g) || [];
console.log('Unsafe getAttribute calls:', unsafe.length === 0 ? 'None ✓' : unsafe.length);
