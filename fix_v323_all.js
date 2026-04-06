const fs = require('fs');
const p = 'C:/Users/Server/.openclaw/workspace/Shop_vnext/src/Index.html';
let lines = fs.readFileSync(p, 'utf8').split('\n');

// The broken pattern on all these lines:
// h+="<div ... onclick=\"func('"+VAL+"')\">"
// 
// Fix: h+='<div ... onclick="func(\''+VAL+'\')">'
// (outer: single-quoted JS string, inner: regular quotes with escaped single-quotes)

let fixes = 0;

// Helper: replace onclick=\"func('..." with onclick='func(\"...'
function fixLine(idx, oldFuncName) {
    const line = lines[idx];
    if (!line) return false;
    
    // Check if this line has the broken pattern
    // Pattern: onclick=\"func('"+  or  onclick="func('"+  
    if (!line.includes('onclick')) return false;
    
    // Fix for single-arg functions: oSt('"+id+"'), eJob(...), addNote(...)
    // Pattern: onclick=\"func('"+VAR+"')\">
    // Or:      onclick="func('"+VAR+"')\">  (after previous fixes may have changed it)
    
    // Replace all onclick=\" and onclick=" (inside h+=") with onclick='
    // and convert inner single-quotes to escaped single-quotes
    
    // Strategy: if line starts with h+=" and has onclick=\" or onclick=" inside
    // convert to h+='<div ... onclick="func(\''+VAL+'\')">...'
    
    if (line.startsWith('  h+="') && line.includes('onclick=')) {
        // Extract the HTML content between the outer quotes
        // h+="<div ... onclick=\"...\">...</div>";
        // Remove h+=" and trailing "
        let html = line.replace(/^  h\+="/, '').replace(/";\s*$/, '');
        
        // Replace onclick=\" with onclick="
        html = html.replace(/onclick=\\'/g, 'onclick=\\\'');
        html = html.replace(/onclick=\\"/g, 'onclick="');
        
        // NOW: onclick="func('"+VAR+"')"
        // The problem: single-quotes inside onclick="..." 
        // when VAL contains '+id+' which has single-quotes
        // onclick="func('"+id+"')"  ->  onclick="func(\''+id+'\')"
        
        // Fix: change inner ' to \' 
        // Pattern: onclick="func('"+  -> onclick="func(\''+
        // Pattern: +')"  -> +\'\')"
        
        html = html.replace(/onclick="(\w+)\('"\+/g, 'onclick="$1(\\\'"+');
        html = html.replace(/\+"\'\)/g, "+\'\\')");
        
        // Now wrap with h+= and single quotes
        lines[idx] = `  h+=\'${html}\';`;
        
        console.log(`  Fixed line ${idx+1} (${oldFuncName}): ` + lines[idx].substring(0, 100));
        fixes++;
        return true;
    }
    return false;
}

// Fix all broken onclick lines
const brokenLineNumbers = [
    177, 178, 183,  // Already partially fixed but verify
];

// Also scan for ALL lines with onclick that still have the broken pattern
for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.includes('onclick')) continue;
    
    // Broken pattern: h+="<div ... onclick=\"func('"+  
    // or: h+="<div ... onclick="func('"+  (after some fixes may have backslashed differently)
    
    // Check for: line has h+=" and onclick followed by broken quoting
    if (line.startsWith('  h+="') || line.startsWith('    h+="')) {
        if (line.includes('onclick=\\') || line.includes('onclick="func') || 
            line.includes('onclick="cSt') || line.includes('onclick="window')) {
            fixLine(i, 'auto');
        }
    }
}

// Save
fs.writeFileSync(p, lines.join('\n'), 'utf8');

console.log(`\nTotal fixes: ${fixes}`);

// Verify
const c2 = fs.readFileSync(p, 'utf8');
const m = c2.match(/<script>([\s\S]*?)<\/script>/);
if (m) {
    try {
        new Function(m[1]);
        console.log('✅ JS SYNTAX VALID!');
    } catch(e) {
        console.log('❌ JS ERROR: ' + e.message);
        const match = e.message.match(/line (\d+)/);
        if (match) {
            const idx = parseInt(match[1]) - 1;
            const jsLines = m[1].split('\n');
            console.log('  Problem:', (jsLines[idx] || '').substring(0, 150));
        }
    }
}
