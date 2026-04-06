const fs = require('fs');
const c = fs.readFileSync('C:/Users/Server/.openclaw/workspace/Shop_vnext/src/Index.html', 'utf8');
const lines = c.split('\n');

// === VERIFY GRID STRUCTURE IN render() ===
console.log('=== Stats Grid Structure ===');
let inRender = false;
let gridOpen = 0, tiles = 0, gridClose = 0;
for (let i = 0; i < lines.length; i++) {
  const t = lines[i].trim();
  if (t.includes('function render(d){')) inRender = true;
  if (inRender && t.includes('sr(h)')) inRender = false;
  
  if (inRender) {
    if (t.includes('h+=') && t.includes('class="tl"') && !t.includes('class="tt"')) { 
      gridOpen++;
      console.log(`Grid open #${gridOpen} at L${i+1}: ${t.substring(0,60)}`);
    }
    if (t.includes('h+=') && t.includes('class="tt"')) {
      tiles++;
      console.log(`Tile ${tiles}: L${i+1}: ${t.substring(0,80)}`);
    }
    if (t === "h+='</div>';") {
      gridClose++;
      console.log(`Grid close #${gridClose} at L${i+1}`);
    }
  }
}

console.log(`\nResult: ${gridOpen} grid opens, ${tiles} tiles, ${gridClose} grid closes`);
if (gridOpen === 1 && tiles === 6 && gridClose === 1) {
  console.log('Grid structure: CORRECT');
} else {
  console.log('Grid structure: WRONG!');
}

// === CHECK PHOTO QUEUE FUNCTIONS ===
console.log('\n=== Photo Queue Functions ===');
const hasProcessPhotos = c.includes('function processPhotos()');
const hasHandleProcessPhotos = c.includes('handleProcessPhotos');
console.log('processPhotos() JS:', hasProcessPhotos ? '✅' : '❌');
console.log('handleProcessPhotos() backend:', hasHandleProcessPhotos ? '✅' : '❌');

// === VERIFY NO DUPLICATE <div class="tl"> ===
const tlCount = (c.match(/class="tl"/g) || []).length;
console.log(`\n<div class="tl"> occurrences in HTML: ${tlCount} (should be 1 in render + 1 in CSS)`);
