const fs = require('fs');
const c = fs.readFileSync('C:/Users/Server/.openclaw/workspace/Shop_vnext/src/Index.html', 'utf8');
const lines = c.split('\n');

// Show lines 175-185
console.log('=== Lines 175-190 ===');
for (let i = 174; i < 190; i++) {
  console.log(`L${i+1}: ${lines[i]}`);
}

// Full JS validation
const m = c.match(/<script>([\s\S]*?)<\/script>/);
if (m) {
  console.log('\n=== JS Check ===');
  try {
    new Function(m[1]);
    console.log('VALID');
  } catch(e) {
    console.log('ERROR:', e.message);
    const lm = e.toString().match(/line (\d+)/);
    if (lm) {
      const idx = parseInt(lm[1]);
      const jsl = m[1].split('\n');
      for (let i = Math.max(0, idx-4); i <= Math.min(jsl.length-1, idx+4); i++) {
        console.log((i===idx-1?'>>>':'   ') + ` JS L${i+1}: ${jsl[i].substring(0, 150)}`);
      }
    }
  }
}
