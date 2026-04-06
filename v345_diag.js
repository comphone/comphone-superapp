// V345 — Find the unclosed brace
const fs = require('fs');
const path = 'C:/Users/Server/.openclaw/workspace/Shop_vnext/src/Index.html';
const c = fs.readFileSync(path, 'utf8');
const m = c.match(/<script>([\s\S]*?)<\/script>/);
if (!m) { console.log('NO SCRIPT'); process.exit(1); }

const js = m[1];
const lines = js.split('\n');

// Check: find all function definitions and verify they're closed
const funcs = [];
let depth = 0;
for (let i = 0; i < lines.length; i++) {
  const trimmed = lines[i].trim();
  const fnMatch = trimmed.match(/^function\s+(\w+)/);
  if (fnMatch) {
    funcs.push(fnMatch[1]);
  }
  for (const ch of lines[i]) {
    if (ch === '{') depth++;
    else if (ch === '}') depth--;
  }
}

console.log('Top-level brace balance:', depth);
console.log('Functions found:', funcs.length);

if (depth !== 0) {
  console.log('MISMATCH! Looking for unclosed function...');
  // Walk through each function and check individually
  let lineIdx = 0;
  for (let fi = 0; fi < funcs.length; fi++) {
    const fnName = funcs[fi];
    // Find this function
    const startLine = lines.findIndex((l, idx) => idx >= lineIdx && l.includes('function ' + fnName + '('));
    if (startLine === -1) continue;
    
    // Count braces from this function
    let d = 0;
    let started = false;
    let endLine = startLine;
    for (let j = startLine; j < lines.length; j++) {
      for (const ch of lines[j]) {
        if (ch === '{') { d++; started = true; }
        else if (ch === '}') d--;
      }
      if (started && d === 0) { endLine = j; break; }
    }
    
    if (d !== 0) {
      console.log(`  ❌ function ${fnName} (L${startLine+1}->L${endLine+1}): ${d} unclosed braces`);
      console.log(`     Last 3 lines:`, lines.slice(Math.max(0, endLine - 3), endLine + 1).map(l => l.substring(0, 100)));
      // Check if next function starts
      if (fi + 1 < funcs.length) {
        const nxtName = funcs[fi + 1];
        const nxtLine = lines.findIndex((l, idx) => idx > endLine && l.includes('function ' + nxtName + '('));
        if (nxtLine > endLine) {
          console.log(`     Next lines before ${nxtName}:`);
          for (let k = endLine; k < nxtLine; k++) {
            console.log(`       L${k+1}: ${lines[k].substring(0, 120)}`);
          }
        }
      }
    }
  }
} else {
  console.log('All braces balanced at top level');
}

// Also try to actually parse for "Unexpected end of input"
try {
  new Function(js);
  console.log('\n✅ JS SYNTAX VALID');
} catch(e) {
  console.log('\n❌ JS ERROR:', e.message);
  // Try narrowing down
  if (e.message.includes('Unexpected end of input')) {
    console.log('Looking for truncation...');
    console.log('Last 20 lines:');
    const lastLines = lines.slice(-20);
    lastLines.forEach((l, i) => console.log(`  ${(lines.length - 20 + i + 1)}: ${l}`));
  }
}
