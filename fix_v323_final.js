const fs = require('fs');
const p = 'C:/Users/Server/.openclaw/workspace/Shop_vnext/src/Index.html';
let c = fs.readFileSync(p, 'utf8');

// The core issue:
// h+="<div class='b2 bx' onclick=...">..."
// If I change outer " to ', I must ALSO change class='...' to class="..."
// And fix the onclick quoting.
//
// Simplest approach: use regex to fix ALL broken onclick patterns
// regardless of location.
//
// Broken patterns (all inside double-quoted JS strings starting with h+="):
// 1. onclick=\"func('"+VAL+"')\">
// 2. onclick="func('"+VAL+"')\">  (if the backslash was removed)
// 3. onclick="func('"+VAL+"','"+VAL2+"')\">

// Pattern matches: onclick followed by = then either \" or " then func name
// Then single-quote then "+VAL+" then single-quote then ) then quote then >

// Use a broad regex approach: find all instances and fix them one by one

let fixes = 0;

// Regex: find onclick="..." or onclick=\"..." patterns where the attribute value
// starts with funcName('"+
// Captures: funcName and the expression inside

// For patterns like: onclick="cSt('"+id+"','รอดำเนินการ')"
// Or: onclick="oSt('"+id+"')"

const regex = /onclick=["']([a-zA-Z]+)\(['"]([^\)]+?)['"]\)(?:,\s*['"]([^'"\)]+?)['"])?['"]>/g;

c = c.replace(regex, (fullMatch, func, arg1, arg2) => {
    // Found a broken onclick, fix it
    fixes++;
    if (arg2) {
        // Two-arg function: cSt('"+id+"','status')
        return `onclick='${func}("'+arg1+'","'+arg2+'")'>`;
    } else {
        // One-arg function: oSt('"+id+"')  
        return `onclick='${func}("'+arg1+'")'>`;
    }
});

console.log(`Fixed ${fixes} onclick patterns`);

// Also fix any remaining onclick=\\\" or raw onclick=" inside h+=" strings
for (let pass = 0; pass < 3; pass++) {
    // Pattern: onclick=\"  (backslash-quote, the original problem)
    if (c.includes('onclick=\\"')) {
        // Find the context and fix
        let idx;
        while ((idx = c.indexOf('onclick=\\"')) !== -1) {
            // Look for the pattern: onclick=\\\"func('"+...+"')\\"> or similar
            let end = c.indexOf('">', idx);
            if (end === -1) break;
            let seg = c.substring(idx, end + 2);
            console.log(`  Pass ${pass+1}: fixing ${seg.substring(0, 60)}`);
            // Replace the backslash-quote with regular quote (since we'll fix quoting properly)
            c = c.substring(0, idx) + 'onclick="' + c.substring(idx + 9);
            fixes++;
        }
    }
}

// Now: some patterns might have mixed quoting after fixes
// Let me check for onclick=" inside strings that ALSO start with h+='
// Those should use escaped quotes

// Check for h+='<div ... onclick="  - this is OK
// Check for h+="<div ... onclick='  - this is also OK

// The key verification: extract JS and try to parse it
fs.writeFileSync(p, c, 'utf8');

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
            if (jsLines[idx]) {
                console.log('  Line ' + match[1] + ': ' + jsLines[idx].substring(0, 200));
            }
        }
    }
}

console.log(`\nFile size: ${fs.statSync(p).size} bytes`);
