const fs = require('fs');
const c = fs.readFileSync('C:/Users/Server/.openclaw/workspace/Shop_vnext/src/Index.html', 'utf8');
const lines = c.split('\n');

// Find ALL h+= lines and check if they're inside functions with h declared
console.log('=== Checking all functions that use h+= ===\n');

// Track: which functions declare h, which use h+=
const funcStart = {};
const funcHPlus = {};
const funcHDecl = {};
const globalHPlus = [];

let currentFunc = null;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const trimmed = line.trim();
  
  // Detect function start
  const fnMatch = trimmed.match(/^function\s+(\w+)/);
  if (fnMatch) {
    currentFunc = fnMatch[1];
    funcStart[currentFunc] = i + 1;
  }
  
  // Detect h= declaration (not h+=)
  if (curr && (trimmed.startsWith('var h=') || trimmed.startsWith('let h='))) {
    funcHDecl[currentFunc] = true;
  }
  
  // Track h+= usage
  if (line.includes('h+=')) {
    if (currentFunc && (trimmed.startsWith('h+=') || trimmed.includes('h+='))) {
      funcHPlus[currentFunc] = (funcHPlus[currentFunc] || 0) + 1;
    } else if (!currentFunc) {
      globalHPlus.push(i + 1);
    }
  }
}

console.log('Functions using h+:');
for (const fn in funcHPlus) {
  const decl = funcHDecl[fn] ? '✅ h declared' : '❌ h NOT declared';
  console.log(`  ${fn}: ${funcHPlus[fn]} h+= calls, ${decl}`);
}

if (globalHPlus.length > 0) {
  console.log(`\n⚠️ h+= in GLOBAL scope at lines: ${globalHPlus.join(', ')}`);
} else {
  console.log('\n✅ No global h+= lines');
}

// Final JS validation
const m = c.match(/<script>([\s\S]*?)<\/script>/);
if (m) {
  try {
    new Function(m[1]);
    console.log('\n✅ V324 JS SYNTAX VALID');
  } catch(e) {
    console.log('\n❌ JS ERROR:', e.message);
  }
}
