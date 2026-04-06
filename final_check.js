const fs = require('fs');
const c = fs.readFileSync('C:/Users/Server/.openclaw/workspace/Shop_vnext/src/Index.html', 'utf8');
const lines = c.split('\n');
let cur = null, hp = {}, hd = {};
for (let i = 0; i < lines.length; i++) {
  const t = lines[i].trim();
  const m = t.match(/^function\s+(\w+)/);
  if (m) cur = m[1];
  if (cur && (t.startsWith('var h=') || t.startsWith('let h='))) hd[cur] = true;
  if (lines[i].includes('h+=') && cur) hp[cur] = (hp[cur]||0) + 1;
}
console.log('h+= declarations:');
for (const f in hp) console.log('  ' + f + ': ' + hp[f] + ' h+= | ' + (hd[f] ? 'OK' : 'MISSING VAR H='));
const m = c.match(/<script>([\s\S]*)<\/script>/);
if (m) { try { new Function(m[1]); console.log('\nJS: VALID'); } catch(e) { console.log('\nJS ERROR:', e.message); } }
