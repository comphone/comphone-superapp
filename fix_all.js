const fs = require('fs');
const p = 'C:/Users/Server/.openclaw/workspace/Shop_vnext/src/Index.html';
let lines = fs.readFileSync(p, 'utf8').split('\n');

// FIX: For ALL lines with broken onclick, replace the ENTIRE line with correct version.
// Strategy: Use onclick='func("'+var+'")'> inside double-quoted h+="..." strings.

let fixes = 0;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // Remove orphaned h+= lines (should be inside functions, not standalone before them)
  if (i < 200 && line.trim().startsWith('h+="<div') && !line.includes('function')) {
    // Check if next line starts a function - these are orphaned
    if (i+1 < lines.length && (lines[i+1].includes('function ') || !lines[i+1].includes('h+'))) {
      console.log(`Removed orphan line ${i+1}: ${line.trim().substring(0,60)}`);
      lines[i] = '';
      fixes++;
      continue;
    }
  }
  
  // Fix window.open broken quoting
  if (line.includes('onclick=""window.open') || line.includes('onclick=""window')) {
    lines[i] = `  if(j.folder)h+="<div class='b2 ba' onclick='window.open(\\""+j.folder+"\\",\\"_blank\\")'>\uD83D\uDCC1 \u0E42\u0E1F\u0E25\u0E40\u0E14\u0E2D\u0E23\u0E4C</div>";`;
    console.log(`Fixed window.open at line ${i+1}`);
    fixes++;
    continue;
  }
  
  // Fix cSt buttons in oSt function - these use h+='<div class='...">
  // Broken: h+='<div class='b2 ba' onclick="cSt('"+id+"','รอดำเนินการ')">
  // The single quotes on class='b2 ba' end the outer single-quote string too early
  if (line.includes("onclick=\"cSt('\"") || line.includes("h+='<div class='b2")) {
    // Rewrite to use double-quoted outer string
    if (line.includes("รอดำเนินการ")) {
      lines[i] = `  h+="<div class='b2 ba' onclick='cSt(\""+id+"\",\"\u0E23\u0E2D\u0E14\u0E33\u0E40\u0E19\u0E34\u0E19\u0E01\u0E32\u0E23\")'>\u23F3 \u0E23\u0E2D\u0E14\u0E33\u0E40\u0E19\u0E34\u0E19\u0E01\u0E32\u0E23</div>";`;
    } else if (line.includes("InProgress")) {
      lines[i] = `  h+="<div class='b2 bb' onclick='cSt(\""+id+"\",\"InProgress\")'>\uD83D\uDD04 \u0E01\u0E33\u0E25\u0E31\u0E07\u0E17\u0E33</div>";`;
    } else if (line.includes("Completed")) {
      lines[i] = `  h+="<div class='b2 bp' onclick='cSt(\""+id+"\",\"Completed\")'>\u2705 \u0E40\u0E2A\u0E23\u0E47\u0E08\u0E2A\u0E21\u0E1A\u0E39\u0E23\u0E13\u0E4C</div>";`;
    } else if (line.includes("ยกเลิก")) {
      lines[i] = `  h+="<div class='b2 bx' onclick='cSt(\""+id+"\",\"\u0E22\u0E01\u0E40\u0E25\u0E34\u0E01\")'>\u274C \u0E22\u0E01\u0E40\u0E25\u0E34\u0E01</div>";`;
    }
    // Generic: just convert single-quoted outer to double-quoted outer
    else if (line.startsWith("  h+='<div class='")) {
      // Convert to double-quoted outer string
      let fixed = line.replace("h+='<div class='", 'h+="<div class="')
                      .replace("'>", '">')
                      .replace("onclick=\\'", "onclick='");
      lines[i] = fixed;
    }
    console.log(`Fixed cSt/class at line ${i+1}`);
    fixes++;
    continue;
  }
  
  // Fix sv button in eJob - broken arg1
  if (line.includes("onclick='sv(\"')") || (line.includes("arg1") && line.includes("onclick"))) {
    lines[i] = `  h+="<button class='btn' onclick='sv(\""+id+"\")'>\uD83D\uDCBE \u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01</button>";`;
    console.log(`Fixed sv button at line ${i+1}`);
    fixes++;
    continue;
  }
}

// Remove empty lines that were orphaned lines
lines = lines.filter(l => l.trim() !== '');

fs.writeFileSync(p, lines.join('\n'), 'utf8');
console.log(`\nTotal fixes: ${fixes}`);
console.log(`File size: ${fs.statSync(p).size} bytes`);

// Verify
const c2 = fs.readFileSync(p, 'utf8');
const m = c2.match(/<script>([\s\S]*?)<\/script>/);
if (m) {
  try {
    new Function(m[1]);
    console.log('\n✅ JS SYNTAX VALID!');
  } catch(e) {
    console.log('\n❌ JS ERROR:', e.message);
    const lm = e.message.match(/line (\d+)/);
    if (lm) {
      const jsLines = m[1].split('\n');
      const idx = parseInt(lm[1]) - 1;
      console.log('  Error at:', (jsLines[idx] || '').substring(0, 150));
    }
  }
}
