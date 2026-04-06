const fs = require('fs');
const p = 'C:/Users/Server/.openclaw/workspace/Shop_vnext/src/Index.html';
const c = fs.readFileSync(p, 'utf8');

const BS = '\\';  // literal backslash
const DQ = '"';   // literal double-quote
const SQ = "'";   // literal single-quote

console.log("=== Finding broken onclick patterns ===\n");

// Pattern: onclick=\"func('"+VAL+"')\">" inside a JS string that starts with "
// File literally has: onclick=BS+DQ then func( then SQ+DQ then VAL then DQ+SQ then ) then BS+DQ
// This is: onclick=\"  (backslash+quote)

// Build search strings precisely
function buildOld(func, valExpr) {
    return 'onclick=' + BS + DQ + func + '(' + SQ + DQ + '+' + valExpr + '+' + DQ + SQ + ')' + BS + DQ + '">';
}

function buildNew(func, valExpr) {
    // h+="<div onclick='func(\"+val+\")'>"
    // = onclick='func("  + val +  ")'>
    return "onclick='" + func + '(' + DQ + SQ + '+' + valExpr + '+' + SQ + DQ + ')' + SQ + "'>";
}

function fixSearchReplace(oldStr, newStr, label) {
    const idx = c.indexOf(oldStr);
    if (idx >= 0) {
        console.log(`  ✅ FOUND ${label} at position ${idx}`);
        return { old: oldStr, newStr };
    } else {
        console.log(`  ❌ NOT FOUND ${label}`);
        // Debug: show what's near the keyword
        const kw = oldStr.substring(Math.min(10, oldStr.length));
        const ki = c.indexOf(kw);
        if (ki >= 0) {
            console.log(`     Found '${kw}' at ${ki}, context: ${c.substring(ki, ki+60)}`);
        }
        return null;
    }
}

// Try each pattern
const fixes = [];

const f178 = fixSearchReplace(
    buildOld('oSt', 'id'),
    buildNew('oSt', 'id'),
    'oSt'
);

const f179 = fixSearchReplace(
    buildOld('eJob', 'id'),
    buildNew('eJob', 'id'),
    'eJob'
);

// window.open is different: '+j.folder+','_blank'
const old_win = 'onclick=' + BS + DQ + "window.open(" + SQ + DQ + "+j.folder+" + DQ + SQ + ",'_blank')" + BS + DQ + '">';
const new_win = "onclick='window.open(" + DQ + SQ + "+j.folder+" + SQ + DQ + ",'_blank')" + SQ + "'>";
const f180 = fixSearchReplace(old_win, new_win, 'window.open');

const f184 = fixSearchReplace(
    buildOld('addNote', 'id'),
    buildNew('addNote', 'id'),
    'addNote'
);

// addQuickNote2 - no params, but raw "
// onclick="addQuickNote2()">  inside h+="..."
const old_qn = 'h+=' + DQ + "<button class='" + SQ + "btn'" + SQ + " onclick=" + DQ + "addQuickNote2()" + DQ + ">";
// Wait, the file has: h+="<button class='btn' onclick="addQuickNote2()">
// After the fix_click.js run, it should now be: h+="<button class='btn' onclick='addQuickNote2()'>
// Let me check both patterns
const old_qn_a = 'h+=' + DQ + "<button class='btn' onclick=" + DQ + "addQuickNote2()" + DQ + ">";
const old_qn_b = "h+=" + DQ + "<button class='btn' onclick=" + SQ + "addQuickNote2()" + SQ + ">";

let f211 = null;
if (c.indexOf(old_qn_a) >= 0) {
    console.log("  ✅ FOUND addQuickNote2 (pattern A - broken)");
    const new_qn = "h+=" + DQ + "<button class='btn' onclick=" + SQ + "addQuickNote2()" + SQ + ">";
    fixes.push({ old: old_qn_a, new: new_qn, label: 'addQuickNote2-A' });
    f211 = true;
} else if (c.indexOf(old_qn_b) >= 0) {
    console.log("  ✅ addQuickNote2 already fixed (pattern B - OK)");
    f211 = true;
} else {
    console.log("  ❌ addQuickNote2 pattern not found, searching...");
    const qi = c.indexOf('addQuickNote2()');
    if (qi >= 0) {
        console.log(`     context: ${c.substring(Math.max(0,qi-30), qi+25)}`);
    }
}

// Build full replacement map from found fixes
let result = c;
let applied = 0;

if (f178) { result = result.replaceAll(f178.old, f178.newStr); applied++; }
if (f179) { result = result.replaceAll(f179.old, f179.newStr); applied++; }
if (f180) { result = result.replaceAll(f180.old, f180.newStr); applied++; }
if (f184) { result = result.replaceAll(f184.old, f184.newStr); applied++; }
for (const fix of fixes) {
    result = result.replaceAll(fix.old, fix.new);
    applied++;
}

console.log(`\n=== Applying ${applied} fixes ===`);

fs.writeFileSync(p, result, 'utf8');

// Verify
const c2 = fs.readFileSync(p, 'utf8');
const lines = c2.split('\n');
let ok = 0, bad = 0;
for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.includes('onclick')) continue;
    if (i < 90 || i > 230) continue;
    
    // Check if onclick=\" appears in a line that starts h+="
    const hasBroken = line.startsWith('  h+="') && line.includes('onclick=\\');
    // Or raw " after onclick= (not \\")
    const hasUnescaped = line.match(/h\+="[^']*onclick="[^\\"]/);
    
    if (hasBroken || hasUnescaped) {
        console.log(`  ❌ BROKEN line ${i+1}: ${line.substring(0, 100)}`);
        bad++;
    } else {
        ok++;
    }
}

console.log(`\n✅ Verification: OK=${ok}, Broken=${bad}`);
console.log(`File size: ${fs.statSync(p).size} bytes`);
