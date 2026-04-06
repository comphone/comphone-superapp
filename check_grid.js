const fs = require('fs');
const c = fs.readFileSync('C:/Users/Server/.openclaw/workspace/Shop_vnext/src/Index.html', 'utf8');
const lines = c.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('pendingPhotos') || lines[i].includes('processPhotos') || lines[i].includes('lowStock') || lines[i].includes('จัดการรูป')) {
    console.log('Line ' + (i+1) + ': ' + lines[i].substring(0, 130));
  }
}
// Check structure: the tl grid should open once, have 6 tiles, close once
let tlCount = 0;
let tileCount = 0;
let inRender = false;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('function render')) inRender = true;
  if (inRender && i > 200 && i < 300) {
    if (lines[i].includes('h+=') && lines[i].includes('<div class="tt">')) tileCount++;
  }
  if (inRender && lines[i].includes('sr(h)')) inRender = false;
}
console.log('Total tiles in render: ' + tileCount);
console.log('Expected: 6 (4 original + 2 photo)');
