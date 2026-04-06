const fs = require('fs');
const c = fs.readFileSync('C:/Users/Server/.openclaw/workspace/Shop_vnext/src/Index.html', 'utf8');
const lines = c.split('\n');
let currentFunc = null;
const funcHP = {};
const funcHD = {};
const globalHP = [];

for (let i = 0; i < lines.length; i++) {
  const trimmed = lines[i].trim();
  const fn = trimmed.match(/^function\s+(\w+)/);
  if (fn) { currentFunc = fn[1]; }
  if (currentFunc && (trimmed.startsWith('var h=') || trimmed.startsWith('let h='))) { funcHD[currentFunc] = true; }
  if (lines[i].includes('h+=')) {
    if (currentFunc && trimmed.includes('h+=')) {
      funcHP[currentFunc] = (funcHP[currentFunc] || 0) + 1;
    } else if (!currentFunc) {
      globalHP.push(i + 1);
    }
  }
}

console.log('=== Functions using h+= ===');
for (const fn in funcHP) {
  console.log(fn + ': ' + funcHP[fn] + ' h+= | ' + (funcHD[fn] ? 'OK' : 'NO h= decl'));
}
if (globalHP.length > 0) {
  console.log('GLOBAL h+= at lines: ' + globalHP.join(', '));
} else {
  console.log('No global h+= lines');
}

const m = c.match(/<script>([\s\S]*?)<\/script>/);
if (m) {
  try { new Function(m[1]); console.log('\nJS VALID'); }
  catch(e) { console.log('\nERROR: ' + e.message); }
}
