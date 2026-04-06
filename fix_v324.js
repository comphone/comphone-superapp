// Final fix: remove duplicate <div class="tl"> and orphaned h+=
const fs = require('fs');
const path = 'C:/Users/Server/.openclaw/workspace/Shop_vnext/src/Index.html';

let content = fs.readFileSync(path, 'utf8');

// Check the grid structure
const lines = content.split('\n');

// Line 212 (index 211): lowStock tile - ends with </div></div>'; (tile close + grid close)
// Line 213 (index 212): h+='<div class="tl">'; - duplicate grid open
// Line 214 (index 213): pendingPhotos tile 
// Line 215 (index 214): processPhotos tile
// Line 216 (index 215): h+='</div>'; - duplicate grid close

// The issue: Line 212's </div></div> closes both the tile AND the entire grid.
// Then Line 213 opens a new grid, Line 214-215 add tiles, Line 216 closes that new grid.

// FIX 1: Delete the orphaned h+= on line 182
// It's between function se() and function sr()
// Find it by searching for the pattern
let orphanIdx = -1;
for (let i = 180; i < 185; i++) {
  if (lines[i] && lines[i].trim().startsWith('h+=') && lines[i].includes('addNote') && !lines[i].trim().startsWith('function')) {
    orphanIdx = i;
    break;
  }
}

if (orphanIdx >= 0) {
  console.log(`[FIX 1] Deleting orphaned h+= on line ${orphanIdx + 1}`);
  console.log(`  Content: ${lines[orphanIdx].trim().substring(0, 80)}`);
  lines[orphanIdx] = ''; // will filter out empty lines
}

// FIX 2: Merge grids - make ONE 6-tile grid instead of two
// Step A: On line 212 (index 211), change </div></div>' to </div>' 
// This removes the grid close, keeps tile close
if (lines[211]) {
  const before = lines[211];
  lines[211] = before.replace('</div></div>', '</div>');
  if (before !== lines[211]) {
    console.log(`[FIX 2a] Line 212: Removed grid-close </div>, keeping tile-close </div>`);
    console.log(`  Before: ${before.trim().substring(0, 80)}`);
    console.log(`  After:  ${lines[211].trim().substring(0, 80)}`);
  }
}

// Step B: Delete line 213 (index 212): h+='<div class="tl">';
if (lines[212] && lines[212].includes("h+='<div class=\"tl\">'")) {
  console.log(`[FIX 2b] Line 213: Deleted duplicate grid open`);
  lines[212] = '';
}

// Step C: Delete line 216 (index 215): h+='</div>'; that closes the duplicate grid
if (lines[215] && lines[215].trim() === "h+='</div>';") {
  console.log(`[FIX 2c] Line 216: Deleted duplicate grid close`);
  lines[215] = '';
}

// FIX 3: Typo รอดำเนินการ → รอดำเนินการ
let typoCount = 0;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("รอดาเนินการ")) {
    lines[i] = lines[i].replace(/รอดาเนินการ/g, 'รอดำเนินการ');
    typoCount++;
    console.log(`[FIX 3] Line ${i+1}: Fixed typo รอดำเนินการ → รอดำเนินการ`);
  }
}
if (typoCount === 0) {
  console.log(`[FIX 3] No typo found (already fixed or different)`);
  // Check what's there
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("รอด") && lines[i].includes("ดำเนินการ") && lines[i].includes("cSt")) {
      console.log(`  Line ${i+1} has cSt with รอ text: ${lines[i].substring(0, 100)}`);
    }
  }
}

// REBUILD
content = lines.filter(l => l !== '').join('\n');

// SAVE
fs.writeFileSync(path, content, 'utf8');
console.log(`\nSaved: ${content.length} bytes`);

// VERIFY
const check = fs.readFileSync(path, 'utf8');
const m = check.match(/<script>([\s\S]*?)<\/script>/);
if (!m) {
  console.log('❌ NO SCRIPT TAG FOUND');
} else {
  try {
    new Function(m[1]);
    console.log('✅ V324 JS SYNTAX VALID');
  } catch(e) {
    console.log('❌ JS ERROR:', e.message);
    const lineMatch = e.message.match(/line (\d+)/);
    if (lineMatch) {
      const jsLine = parseInt(lineMatch[1]);
      const jsLines = m[1].split('\n');
      const start = Math.max(0, jsLine - 3);
      const end = Math.min(jsLines.length, jsLine + 3);
      for (let i = start; i < end; i++) {
        const mark = (i === jsLine - 1) ? '>>>' : '   ';
        console.log(`${mark} JS Line ${i+1}: ${jsLines[i].substring(0, 120)}`);
      }
    }
  }
}

// Confirm grid tile count
const tlMatch = content.match(/function render\([\s\S]*?sr\(h\)/);
if (tlMatch) {
  const tiles = (tlMatch[0].match(/h\+='\<div class="tt"/g) || []).length;
  console.log(`Render function has ${tiles} tiles (expected 6)`);
}
