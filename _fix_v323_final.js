const fs = require('fs');
const p = 'C:/Users/Server/.openclaw/workspace/Shop_vnext/src/Index.html';
const c = fs.readFileSync(p, 'utf8');
const lines = c.split('\n');

// Fix specific line numbers by reconstructing the line
// Line 178: h+="<div class='b2 bb' onclick=\"oSt('"+id+"')\">เปลี่ยนสถานะ</div>";
// Fix: change outer " to ' and inner \" to " and \" to "
lines[177] = '  h+=\'<div class="b2 bb" onclick="oSt(\\'' + '"+id+"' + '\\')">เปลี่ยนสถานะ</div>\';';

// Line 179: h+="<div class='b2 bx' onclick=\"eJob('"+id+"')\">แก้ไข</div>";
lines[178] = '  h+=\'<div class="b2 bx" onclick="eJob(\\'' + '"+id+"' + '\\')">แก้ไข</div>\';';

// Line 184: h+="<div class='b2 ba' onclick=\"addNote('"+id+"')\">💾 บันทึกหมายเหตุ</div>";
lines[183] = '  h+=\'<div class="b2 ba" onclick="addNote(\\'' + '"+id+"' + '\\')">💾 บันทึกหมายเหตุ</div>\';';

const result = lines.join('\n');
fs.writeFileSync(p, result, 'utf8');

// Verify
const c2 = fs.readFileSync(p, 'utf8');
const vlines = c2.split('\n');
let bad = 0;
console.log("=== Verification ===");
for (let i = 175; i < 190; i++) {
    const line = vlines[i];
    if (line.includes('onclick')) {
        const hasBroken = line.includes('onclick=\\"') && line.startsWith('  h+="');
        if (hasBroken) {
            console.log(`  ❌ BROKEN line ${i+1}`);
            bad++;
        } else {
            console.log(`  ✅ OK line ${i+1}`);
        }
    }
}

console.log(bad === 0 ? "\n🎉 ALL FIXED!" : `\n⚠️ Still broken: ${bad}`);
