const fs = require('fs');
const path = 'C:/Users/Server/.openclaw/workspace/Shop_vnext/src/Index.html';
let c = fs.readFileSync(path, 'utf8');

// PROBLEM: In render(), var h= is never declared.
// The first h+= comes after s,jobs,inv but no h= '<div class="tl">' exists.
// Previous edit removed it by accident.

// Find the pattern: ...var inv=(d&&d.inventory)||[];
// After it: var h='<div class="tl">'; should exist
// Check if it exists:
const idx = c.indexOf("var inv=(d&&d.inventory)||[];");
if (idx > 0) {
  const after = c.substring(idx + "var inv=(d&&d.inventory)||[];".length, idx + 50);
  console.log("After inv=:", after.substring(0, 50));
  
  if (after.includes("var h=")) {
    console.log("var h= EXISTS after inv= — no fix needed");
  } else if (after.includes("h+='")) {
    console.log("h+= exists BUT no var h= — THIS IS THE BUG!");
    
    // Insert var h= before the first h+=
    const insert = ";var h='<div class=\"tl\">';";
    c = c.replace("var inv=(d&&d.inventory)||[];", "var inv=(d&&d.inventory)||[];" + insert);
    console.log("FIXED: Added var h= grid open after inv=");
  }
}

// Also check: maybe the first line of render already has it differently
const renderIdx = c.indexOf("function render(d){");
if (renderIdx > 0) {
  const chunk = c.substring(renderIdx, renderIdx + 300);
  console.log("\nFirst 300 chars of render():");
  console.log(chunk);
}

// === FIX for duplicate grid close ===
// In the stats area there should be exactly ONE grid close after 6 tiles
// Find all h+='</div>'; in the stats grid area
const statsStart = c.indexOf("h+='<div class=\"tt\"><div class=\"n c1\">");
if (statsStart > 0) {
  const statsEnd = c.indexOf("Filter bar", statsStart);
  if (statsEnd > 0) {
    const statsArea = c.substring(statsStart, statsEnd);
    const gridCloses = (statsArea.match(/h\+='\<\/div>';/g) || []).length;
    console.log(`\nStats grid has ${gridCloses} h+='</div>'; (should be 1)`);
    
    if (gridCloses > 1) {
      console.log("Need to remove duplicate grid closes.");
      // Find each one
      let pos = 0;
      let count = 0;
      while (true) {
        const foundIdx = statsArea.indexOf("h+='</div>';", pos);
        if (foundIdx === -1) break;
        count++;
        console.log(`  Grid close #${count} at offset ${foundIdx} (absolute: ${statsStart + foundIdx})`);
        // Show surrounding chars
        const ctx = statsArea.substring(Math.max(0, foundIdx - 30), foundIdx + 30);
        console.log(`    Context: "...${ctx}..."`);
        pos = foundIdx + 14;
      }
    }
  }
}

// SAVE
fs.writeFileSync(path, c, 'utf8');
console.log('\nSaved');

// VERIFY
const c2 = fs.readFileSync(path, 'utf8');
const m = c2.match(/<script>([\s\S]*?)<\/script>/);
if (!m) {
  console.log('NO SCRIPT');
} else {
  try {
    new Function(m[1]);
    console.log('JS VALID');
  } catch(e) {
    console.log('ERROR:', e.message);
  }
}
