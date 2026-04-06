const fs = require('fs');
const D = 'C:/Users/Server/.openclaw/workspace/Shop_vnext/src';

// Read Index.html
const content = fs.readFileSync(D + '/Index.html', 'utf8');

// Extract JS
const so = content.lastIndexOf('<script>');
const sc = content.lastIndexOf('</script>');
const preJs = content.substring(0, so + 8); // includes <script>
const js = content.substring(so + 8, sc);
const postJs = content.substring(sc); // includes </script></body></html>

console.log('Pre:', preJs.length, 'JS:', js.length, 'Post:', postJs.length);

// Fix 1: The broken vJb() line - find any line with jtl
const lines = js.split('\n');
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  // Fix: h2+='<div id="jtl">"></div></div>' → h2+='<div id="jtl"></div></div>'
  if (line.includes('jtl')) {
    console.log('FOUND jtl at line', i+1, ':', line.substring(0, 100));
    if (line.includes('">')) {
      lines[i] = line.replace('h2+\'<div id="jtl">', 'h2+\'<div id="jtl"></div></div>')
                     .replace('">");', '');
      console.log('  FIXED to:', lines[i].substring(0, 100));
    }
  }
  // Fix 2: cm() doesn't exist - replace with cl()
  if (line.includes('onclick="cm()"') || /onclick="cm\(\)"/.test(line)) {
    console.log('FOUND cm() at line', i+1, ':', line.substring(0, 100));
  }
}

// Write back
const fixedJs = lines.join('\n');
const fixedContent = preJs + fixedJs + postJs;
fs.writeFileSync(D + '/Index.html', fixedContent, 'utf8');
console.log('Wrote fixed Index.html:', fixedContent.length, 'bytes');

// Now extract clean JS for JS_Dashboard.html
const cleanJs = fixedJs
  // Replace "cm()" with "cl()" if any
  .replace(/onclick="cm\(\)"/g, 'onclick="cl()"');

// Write JS_Dashboard.html (just the JS in a <script> tag)
const jsDashboard = '<script>\n' + cleanJs + '\n</script>';
fs.writeFileSync(D + '/JS_Dashboard.html', jsDashboard, 'utf8');
console.log('Wrote JS_Dashboard.html:', jsDashboard.length, 'bytes');

// Create the new minimal Index.html (HTML+CSS + include statement)
// For GAS templated HTML: <?!= include('JS_Dashboard'); ?>
const newIdx = preJs.trim() + '\n<?!= include(\'JS_Dashboard\'); ?>\n</body>\n</html>';
console.log('New Index.html would be:', newIdx.length, 'bytes');

// Validate JS syntax
try {
  new Function(cleanJs);
  console.log('✅ JS syntax VALID');
} catch(e) {
  console.log('❌ JS syntax ERROR:', e.message);
  // Show error context
  const lm = e.message.match(/line (\d+)/);
  if (lm) {
    const idx2 = parseInt(lm[1]);
    const jsl = cleanJs.split('\n');
    for (let i = Math.max(0, idx2-3); i <= Math.min(jsl.length-1, idx2+3); i++) {
      console.log((i===idx2-1?'>>> ':'    ')+'L'+(i+1)+': '+jsl[i].substring(0,120));
    }
  }
}

// Count functions
const funcs = cleanJs.match(/function \w+/g);
console.log('Functions found:', (funcs||[]).length);
for (const fn of (funcs||[])) console.log('  ', fn);

// Check all required functions
const required = ['se2','sr2','om2','cl','fj2','es2','gs2','gsl2','gsb2','render2','ldJobs','aF','rfr','vJb','adNote','shNote','adNote2','opJob','doOpen','senSum','oSt2','cSt2','eJb2','doSave','procPhotos'];
for (const fn of required) {
  if (!cleanJs.includes('function '+fn)) console.log('MISSING:', fn);
}
