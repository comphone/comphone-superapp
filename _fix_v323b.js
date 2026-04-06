const fs = require('fs');
const p = 'C:/Users/Server/.openclaw/workspace/Shop_vnext/src/Index.html';
let c = fs.readFileSync(p, 'utf8');

let fixes = 0;

// Fix: change h+="<div ... onclick=\"func('...')" to h+='<div ... onclick='func("...")'
// Strategy: convert the outer string to single-quoted, fix inner quotes

// Line 178: h+="<div class='b2 bb' onclick=\"oSt('"+id+"')\">เปลี่ยนสถานะ</div>";
// -> h+='<div class="b2 bb" onclick="oSt(\''+id+'\')">เปลี่ยนสถานะ</div>';
const old178 = 'h+="<div class=\'b2 bb\' onclick=\\\"oSt(\\'' + '"+id+"' + '\\')\\\">เปลี่ยนสถานะ</div>"';
const new178 = 'h+=\'<div class="b2 bb" onclick="oSt(\\'' + '"+id+'\\'' + ')">เปลี่ยนสถานะ</div>\'';

if (c.includes(old178)) {
    c = c.replace(old178, new178);
    console.log('FIXED line 178: oSt');
    fixes++;
} else {
    console.log('NOT FOUND: old178');
}

// Simpler approach: just search for the unique text around each pattern
// and replace whole line

// Let me use regex with enough context to uniquely identify each bad line

const patterns = [
    // Line 178: onclick=\\\"oSt('"+id+"')\\\">เปลี่ยนสถานะ
    {
        find: /(h\+=)"<div class='b2 bb' onclick=\\"oSt\('"\+id\+"'\)\\">เปลี่ยนสถานะ<\/div>"/,
        repl: "$1+'<div class=\"b2 bb\" onclick=\"oSt(\\''+id+'\\')\">เปลี่ยนสถานะ</div>'"
    },
    // Line 179: onclick=\\\"eJob('"+id+"')\\\">แก้ไข
    {
        find: /(h\+=)"<div class='b2 bx' onclick=\\"eJob\('"\+id\+"'\)\\">แก้ไข<\/div>"/,
        repl: "$1+'<div class=\"b2 bx\" onclick=\"eJob(\\''+id+'\\')\">แก้ไข</div>'"
    },
    // Line 180: onclick=\\\"window.open('"+j.folder+"','_blank')\\\">📁 โฟลเดอร์
    {
        find: /(if\(j\.folder\)h\+=)"<div class='b2 ba' onclick=\\"window\.open\('"\+j\.folder\+"','_blank'\)\\">📁 โฟลเดอร์<\/div>"/,
        repl: "$1+'<div class=\"b2 ba\" onclick=\"window.open(\\''+j.folder+'\\',\\'_blank\\')\">📁 โฟลเดอร์</div>'"
    },
    // Line 184: onclick=\\\"addNote('"+id+"')\\\">💾 บันทึกหมายเหตุ
    {
        find: /(h\+=)"<div class='b2 ba' onclick=\\"addNote\('"\+id\+"'\)\\">💾 บันทึกหมายเหตุ<\/div>"/,
        repl: "$1+'<div class=\"b2 ba\" onclick=\"addNote(\\''+id+'\\')\">💾 บันทึกหมายเหตุ</div>'"
    }
];

for (const pat of patterns) {
    if (pat.find.test(c)) {
        c = c.replace(pat.find, pat.repl);
        console.log('FIXED: ' + pat.find.source.substring(20, 50));
        fixes++;
    } else {
        console.log('NOT FOUND regex: ' + pat.find.source.substring(20, 50));
    }
}

// Save
fs.writeFileSync(p, c, 'utf8');

// Verify
let c2 = fs.readFileSync(p, 'utf8');
const lines2 = c2.split('\n');
let bad = 0;
let ok = 0;
for (let i = 0; i < lines2.length; i++) {
    const line = lines2[i];
    // Bad pattern: string starting with h+="<...  with onclick=\" inside
    // This means: outer quotes are double, and onclick has escaped double -> breaks
    if (line.includes('onclick=\\\\"') || (line.includes('h+="') && line.includes('onclick=\\\\"'))) {
        console.log(`  STILL BAD line ${i+1}: ${line.substring(0, 100)}`);
        bad++;
    }
    if (line.includes('onclick') && (line.includes("oSt") || line.includes("eJob") || line.includes("addNote") || line.includes("window.open"))) {
        if (line.includes('onclick=\\\\"')) {
            console.log(`  STILL BROKEN line ${i+1}`);
            bad++;
        } else {
            console.log(`  OK line ${i+1}`);
            ok++;
        }
    }
}

console.log(`\nFixes: ${fixes}, OK: ${ok}, Bad: ${bad}`);
