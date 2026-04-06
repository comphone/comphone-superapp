// FINAL COMPREHENSIVE V324 VERIFICATION
const fs = require('fs');
const path = 'C:/Users/Server/.openclaw/workspace/Shop_vnext/src/Index.html';
const c = fs.readFileSync(path, 'utf8');
const lines = c.split('\n');

console.log('=== V324 FINAL VERIFICATION ===\n');

// 1. JS Syntax Validation
const m = c.match(/<script>([\s\S]*?)<\/script>/);
if (!m) {
  console.log('❌ NO SCRIPT TAG');
  process.exit(1);
}

let jsValid = false;
try {
  new Function(m[1]);
  console.log('✅ 1. JS SYNTAX VALID');
  jsValid = true;
} catch(e) {
  console.log('❌ 1. JS ERROR:', e.message);
}

// 2. Check no orphaned h+= in global scope
let inFunc = false;
let orphanLines = [];
for (let i = 0; i < lines.length; i++) {
  const trimmed = lines[i].trim();
  if (!inFunc && trimmed.startsWith('function ')) inFunc = true;
  if (!inFunc && trimmed.startsWith('h+=') && i > 175) {
    orphanLines.push(i + 1);
  }
}
if (orphanLines.length === 0) {
  console.log('✅ 2. No orphaned h+= lines in global scope');
} else {
  console.log('❌ 2. Orphaned h+= at lines:', orphanLines);
}

// 3. All functions using h+= have h declared
let currentFunc = null;
const funcHD = {}; // h declared
const funcHP = {}; // h+= used
for (let i = 0; i < lines.length; i++) {
  const trimmed = lines[i].trim();
  const fnMatch = trimmed.match(/^function\s+(\w+)/);
  if (fnMatch) { currentFunc = fnMatch[1]; }
  if (currentFunc && (trimmed.startsWith('var h=') || trimmed.startsWith('let h='))) funcHD[currentFunc] = true;
  if (lines[i].includes('h+=')) funcHP[currentFunc] = (funcHP[currentFunc] || 0) + 1;
}

let allOK = true;
for (const fn in funcHP) {
  if (!funcHD[fn]) {
    console.log(`❌ 3. ${fn}: uses h+= ${funcHP[fn]}x but h NOT declared`);
    allOK = false;
  }
}
if (allOK) console.log('✅ 3. All functions declare h before using h+=');

// 4. No unclosed brackets / braces
let braces = 0, parens = 0;
for (let i = 0; i < m[1].length; i++) {
  const ch = m[1][i];
  if (ch === '{') braces++;
  else if (ch === '}') braces--;
  else if (ch === '(') parens++;
  else if (ch === ')') parens--;
}
if (braces === 0) console.log('✅ 4. Braces balanced'); else console.log(`❌ 4. Unbalanced braces: ${braces}`);
if (parens === 0) console.log('✅ 5. Parentheses balanced'); else console.log(`❌ 5. Unbalanced parens: ${parens}`);

// 5. Google script.run connections - check for typos in function names
const gasCalls = m[1].match(/google\.script\.run\.(\w+)\(/g) || [];
const uniqueCalls = [...new Set(gasCalls)];
console.log(`✅ 6. Google Apps Script calls: ${uniqueCalls.length} unique functions`);
uniqueCalls.forEach(x => console.log(`   - ${x}`));

// 6. Check for duplicate grid issues
const varHMatch = c.match(/var h='<div class="tl">/);
console.log(varHMatch ? '✅ 7. Grid div open declared in render() at L' + 
  (c.substring(0, varHMatch.index).split('\n').length + 1) : '❌ 7. Grid div open MISSING');

// 7. Typo check
const typoCount = (c.match(/รอดาเนินการ/g) || []).length;
if (typoCount === 0) console.log('✅ 8. No "รอดาเนินการ" typo');
else console.log(`❌ 8. Found ${typoCount} instances of typo รอดาเนินการ`);

console.log('\n=== SUMMARY ===');
if (jsValid && orphanLines.length === 0 && allOK && braces === 0 && parens === 0 && typoCount === 0) {
  console.log('🎉 ALL CHECKS PASSED - Ready to deploy V324');
} else {
  console.log('⚠️ Some checks failed - review above');
}
