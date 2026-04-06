const fs = require('fs');
const p = 'C:/Users/Server/.openclaw/workspace/Shop_vnext/src/Index.html';
let c = fs.readFileSync(p, 'utf8');

// Show all onclick lines to understand exact patterns
const lines = c.split('\n');
console.log('=== onclick lines ===');
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('onclick') && i >= 90 && i <= 220) {
        console.log(`Line ${i+1}: ${JSON.stringify(lines[i])}`);
    }
}

// The problem is clear from previous output:
// Line 178: h+=\"<div class='b2 bb' onclick=\\\"oSt('\"+id+\"')\\\">เปลี่ยนสถานะ</div>\";\r
// 
// In the raw file, this is literally:
// h+="<div class='b2 bb' onclick=\"oSt('"+id+"')\">เปลี่ยนสถานะ</div>";
//
// When JS parses this:
// - String starts at: h+="<div class='b2 bb' onclick=
// - The \" is an escaped " which the JS parser treats as literal quote INSIDE the string
// - But wait - \" inside a JS "..." string IS a literal "
// - So the string becomes: <div class='b2 bb' onclick="
// - Then: oSt('"+id+"') is parsed as IDENTIFIERS outside the string
// - Hence "Unexpected identifier 'oSt'"
//
// FIX: Replace with onclick=' oSt(" + val + ") ' using single quotes for HTML attribute
// h+="<div class='b2 bb' onclick='oSt(\""+id+"\")'>เปลี่ยนสถานะ</div>";
// Now the HTML attribute is single-quoted, and the value inside uses \" which 
// produces literal " in output.

let fixes = 0;

// Fix 1: oSt
const old1 = `h+="<div class='b2 bb' onclick="oSt('"+id+"')">เปลี่ยนสถานะ</div>";`;
const new1 = `h+="<div class='b2 bb' onclick='oSt("'+id+'")'>เปลี่ยนสถานะ</div>";`;
if (c.includes(old1)) {
    c = c.replace(old1, new1);
    fixes++;
    console.log('FIXED: oSt');
} else {
    console.log('NOT FOUND: old1');
}

// Fix 2: eJob  
const old2 = `h+="<div class='b2 bx' onclick="eJob('"+id+"')">แก้ไข</div>";`;
const new2 = `h+="<div class='b2 bx' onclick='eJob("'+id+'")'>แก้ไข</div>";`;
if (c.includes(old2)) {
    c = c.replace(old2, new2);
    fixes++;
    console.log('FIXED: eJob');
} else {
    console.log('NOT FOUND: old2');
}

// Fix 3: window.open
const old3 = `h+="<div class='b2 ba' onclick="window.open('"+j.folder+"','_blank')">📁 โฟลเดอร์</div>";`;
const new3 = `h+="<div class='b2 ba' onclick='window.open("'+j.folder+'","_blank")'>📁 โฟลเดอร์</div>";`;
if (c.includes(old3)) {
    c = c.replace(old3, new3);
    fixes++;
    console.log('FIXED: window.open');
} else {
    console.log('NOT FOUND: old3');
}

// Fix 4: addNote
const old4 = `h+="<div class='b2 ba' onclick="addNote('"+id+"')">💾 บันทึกหมายเหตุ</div>";`;
const new4 = `h+="<div class='b2 ba' onclick='addNote("'+id+'")'>💾 บันทึกหมายเหตุ</div>";`;
if (c.includes(old4)) {
    c = c.replace(old4, new4);
    fixes++;
    console.log('FIXED: addNote');
} else {
    console.log('NOT FOUND: old4');
}

// Fix 5: addQuickNote2
const old5 = `h+="<button class='btn' onclick="addQuickNote2()">💾 บันทึก</button>";`;
const new5 = `h+="<button class='btn' onclick='addQuickNote2()'>💾 บันทึก</button>";`;
if (c.includes(old5)) {
    c = c.replace(old5, new5);
    fixes++;
    console.log('FIXED: addQuickNote2');
} else {
    console.log('NOT FOUND: old5');
}

console.log(`\nTotal fixes: ${fixes}`);

// Check remaining issues
console.log('\n=== Remaining onclick lines ===');
const lines2 = c.split('\n');
for (let i = 0; i < lines2.length; i++) {
    if (lines2[i].includes('onclick') && i >= 90 && i <= 220) {
        // Check for unescaped onclick=" in string literals
        if (lines2[i].includes('onclick="')) {
            console.log(`  WARN Line ${i+1}: still has onclick=" - ${lines2[i].substring(0, 80)}`);
        }
    }
}

fs.writeFileSync(p, c, 'utf8');
console.log(`\nSaved. Size: ${fs.statSync(p).size} bytes`);
