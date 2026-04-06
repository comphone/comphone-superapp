const fs = require('fs');
const path = 'C:/Users/Server/.openclaw/workspace/Shop_vnext/src/Index.html';
let content = fs.readFileSync(path, 'utf8');

// === PROBLEM DIAGNOSIS ===
// In render(), the first line should be: var h='<div class="tl">';
// But my previous fix broke it — looking at the code:
//   var s=...;var jobs=...;var inv=...;
//   MISSING: var h='<div class="tl">';
//   h+='<div class="tt">...(pending tile)...
//
// So h is never declared! That's the "h is not defined" error.

// === FIX ===
// Find: var s=(d&&d.summary)||{};var jobs=(d&&d.jobs)||[];var inv=(d&&d.inventory)||[];
// Replace with: ...above...;var h='<div class="tl">';

const oldInit = "var s=(d&&d.summary)||{};var jobs=(d&&d.jobs)||[];var inv=(d&&d.inventory)||[];"
const newInit = "var s=(d&&d.summary)||{};var jobs=(d&&d.jobs)||[];var inv=(d&&d.inventory)||[];var h='<div class=\"tl\">';"

if (content.includes(oldInit)) {
  content = content.replace(oldInit, newInit);
  console.log('[FIX] Added var h= grid open to render() initialization');
} else {
  console.log('[WARN] Could not find exact initialization pattern');
  // Try to find what IS there
  const renderIdx = content.indexOf('function render(d)');
  if (renderIdx > 0) {
    const snippet = content.substring(renderIdx, renderIdx + 300);
    console.log('First 300 chars after render():');
    console.log(snippet);
  }
}

// === FIX 2: Also fix the grid close ===
// The grid should close right after the photo tiles
// Currently there are TWO h+='</div>'; lines in the render area
// One closes the stats grid (correct), one is extra (wrong)

// Check how many tile-closing </div>'s are in the stats area
const renderStart = content.indexOf('function render(d)');
const renderEnd = content.indexOf('function applyFilt', renderStart);
if (renderEnd === -1) {
  console.log('[WARN] Could not find render end');
} else {
  const renderBody = content.substring(renderStart, renderEnd);
  const tileDivs = (renderBody.match(/h\+='\<div class="tt"/g) || []).length;
  const gridCloses = (renderBody.match(/h\+='\<\/div>';/g) || []).length;
  console.log(`\nRender stats grid: ${tileDivs} tiles, ${gridCloses} grid closes`);
  
  // For 6 tiles in 1 grid, we need: 1 grid open, 6 tile wrappers, 1 grid close
  // gridCloses should be 1. If it's more, there's extras.
  
  // If there are multiple </div> grid closes, we need to figure out which to keep
  // The correct pattern: 6 tiles, then ONE h+='</div>'; to close the grid
}

// === SAVE ===
fs.writeFileSync(path, content, 'utf8');
console.log('\nSaved.');

// === VERIFY JS ===
const c = fs.readFileSync(path, 'utf8');
const m = c.match(/<script>([\s\S]*?)<\/script>/);
if (!m) {
  console.log('NO SCRIPT');
} else {
  try {
    new Function(m[1]);
    console.log('V324 JS VALID');
  } catch(e) {
    console.log('JS ERROR:', e.message);
    const lm = e.toString().match(/line (\d+)/);
    if (lm) {
      const idx = parseInt(lm[1]);
      const jsl = m[1].split('\n');
      for (let i = Math.max(0, idx-3); i <= Math.min(jsl.length-1, idx+3); i++) {
        console.log((i===idx-1?'>>>':'   ') + ` L${i+1}: ${jsl[i].substring(0,130)}`);
      }
    }
  }
}
