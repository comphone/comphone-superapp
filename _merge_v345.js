// V345 - Merge parts + validate
const fs = require('fs');
const base = 'C:/Users/Server/.openclaw/workspace/Shop_vnext/src';

let p1 = fs.readFileSync(base + '/Index.html', 'utf8');
let p2 = fs.readFileSync(base + '/_part2.html', 'utf8');

// The part1 ends with: <div id="jtl">
// The part2 starts with: "></div></div>';
// So: <div id="jtl"> + "></div></div>';
// = <div id="jtl"></div></div>';
// That's correct!

let combined = p1 + p2 + '\n</script>\n</body>\n</html>';

// Check: does the <script> block parse?
const m = combined.match(/<script>([\s\S]*?)<\/script>/);
if (!m) {
  console.log('NO SCRIPT TAG FOUND');
  process.exit(1);
}

try {
  new Function(m[1]);
  console.log('V345 JS VALID');
} catch(e) {
  console.log('JS ERROR:', e.message);
  const lm = e.message.match(/line (\d+)/);
  if (lm) {
    const idx = parseInt(lm[1]);
    const jsl = m[1].split('\n');
    for (let i = Math.max(0, idx - 4); i <= Math.min(jsl.length - 1, idx + 4); i++) {
      console.log((i === idx - 1 ? '>>> ' : '    ') + 'JS L' + (i + 1) + ': ' + jsl[i].substring(0, 140));
    }
  }
  process.exit(1);
}

// Check all required functions exist
const funcs = ['se2','sr2','om2','cl','fj2','es2','gs2','gsl2','gsb2','render2','ldJobs','aF','rfr','vJb','adNote','shNote','adNote2','opJob','doOpen','senSum','oSt2','cSt2','eJb2','doSave','procPhotos'];
for (const fn of funcs) {
  if (!m[1].includes('function ' + fn)) {
    console.log('MISSING:', fn);
  }
}

// Check tags
console.log('Has </script>:', combined.includes('</script>'));
console.log('Has </body>:', combined.includes('</body>'));
console.log('Has </html>:', combined.includes('</html>'));
console.log('Size:', combined.length, 'bytes');

// Check for truncation
const lastLines = combined.split('\n').slice(-3);
console.log('Last 3 lines:', lastLines);

// Save
fs.writeFileSync(base + '/Index.html', combined, 'utf8');

// Clean up
try { fs.unlinkSync(base + '/_part2.html'); } catch(e) {}

console.log('\nSaved OK');
