const fs = require('fs');
const path = 'C:/Users/Server/.openclaw/workspace/Shop_vnext/src/Index.html';
let content = fs.readFileSync(path, 'utf8');
let lines = content.split('\n');

// PROBLEM: The grid open <div class="tl"> was deleted. 
// Currently: line 212 has lowStock tile (no extra </div>), line 218 has </div> close
// But there's no corresponding <div class="tl"> open!

// Find: line 215 h+='</div>';  — this closes the grid but there's no open
// Need to INSERT <div class="tl"> open before the first tile

// Find the first tile in the stats grid (the pending tile)
// It should have: h+='<div class="tt"><div class="n c1">'
let firstTileIdx = -1;
for (let i = 200; i < 220; i++) {
  if (lines[i] && lines[i].includes('c1') && lines[i].includes('pending')) {
    firstTileIdx = i;
    break;
  }
}

if (firstTileIdx >= 0) {
  // Find the empty line OR content before the first tile
  // Insert the grid open before the first tile
  console.log(`First tile at line ${firstTileIdx + 1}: ${lines[firstTileIdx].trim().substring(0, 60)}`);
  
  // Check if there's already a grid open nearby
  let hasOpen = false;
  for (let i = firstTileIdx - 5; i < firstTileIdx; i++) {
    if (lines[i] && lines[i].includes("h+='<div class=\"tl\">'") || lines[i].includes("h+='<div class='tl'>")) {
      hasOpen = true;
      console.log(`Grid open found at line ${i+1}`);
    }
  }
  
  if (!hasOpen) {
    // Find where the grid open should be — look for the var h= line in render()
    // In render(), before the first h+= tile, there should be a grid open
    // The pattern is:  var h='<div class="tl">'; ... but it's missing
    // Let me find: "var h='<div" which starts the render string
    for (let i = 195; i < firstTileIdx; i++) {
      if (lines[i] && lines[i].includes("var h='<div class=\"tl\">'")) {
        console.log(`Found grid open at line ${i+1}: ${lines[i].trim()}`);
        hasOpen = true;
      }
      if (lines[i] && lines[i].includes("var h=") && lines[i].includes("tl")) {
        console.log(`Found var h= with tl at line ${i+1}: ${lines[i].trim()}`);
      }
    }
    
    if (!hasOpen) {
      console.log('NO grid open found! Need to add it.');
      // Add before the first tile
      const gridOpen = "    h+='<div class=\"tl\">';";
      lines.splice(firstTileIdx - 1, 0, gridOpen);
      console.log(`INSERTED grid open at new line ${firstTileIdx}`);
    }
  }
}

// Also need to add closing </div> AFTER the last photo tile
// Find the processPhotos tile (should be at line ~214)
let lastTileIdx = -1;
for (let i = 208; i < 220; i++) {
  if (lines[i] && lines[i].includes('processPhotos()') && lines[i].includes('onclick')) {
    lastTileIdx = i;
    break;
  }
}

if (lastTileIdx >= 0) {
  console.log(`\nLast photo tile at line ${lastTileIdx + 1}: ${lines[lastTileIdx].trim().substring(0, 80)}`);
  
  // Check if next line is h+='</div>'
  let hasClose = false;
  for (let i = lastTileIdx + 1; i < lastTileIdx + 5; i++) {
    if (lines[i] && lines[i].trim() === "h+='</div>';") {
      hasClose = true;
      console.log(`Grid close found at line ${i+1}`);
    }
  }
  
  if (!hasClose) {
    console.log('NO grid close found after last tile! Need to add it.');
    lines.splice(lastTileIdx + 1, 0, "    h+='</div>';");
    console.log(`INSERTED grid close at new line ${lastTileIdx + 2}`);
  }
}

// SAVE
content = lines.join('\n');
fs.writeFileSync(path, content, 'utf8');
console.log(`\nSaved.`);

// VERIFY
const check = fs.readFileSync(path, 'utf8');
const m = check.match(/<script>([\s\S]*?)<\/script>/);
if (!m) {
  console.log('NO SCRIPT');
} else {
  try {
    new Function(m[1]);
    console.log('VALID ✓');
  } catch(e) {
    console.log('ERROR:', e.message);
    // Show problematic area
    const lineMatch = e.message.match(/line (\d+)/);
    if (lineMatch) {
      const idx = parseInt(lineMatch[1]);
      const jsLines = m[1].split('\n');
      for (let i = Math.max(0,idx-3); i <= Math.min(jsLines.length-1, idx+2); i++) {
        console.log((i===idx-1? '>>> ': '    ') + `JS L${i+1}: ${jsLines[i].substring(0, 120)}`);
      }
    }
  }
}
