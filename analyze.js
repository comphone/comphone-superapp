const fs = require('fs');
const p = 'C:/Users/Server/.openclaw/workspace/Shop_vnext/src/Index.html';
let c = fs.readFileSync(p, 'utf8');

// Check script tags
const scripts = c.match(/<script>/g);
console.log('Script tags:', scripts ? scripts.length : 0);
const closes = c.match(/<\/script>/g);
console.log('Close script tags:', closes ? closes.length : 0);

// Extract the JS content
const m = c.match(/<script>([\s\S]*?)<\/script>/);
if (!m) { console.log('No script found'); process.exit(1); }

const js = m[1];
console.log('JS content length:', js.length, 'chars');
console.log('JS lines:', js.split('\n').length);

// Try to evaluate
try {
    new Function(js);
    console.log('JS SYNTAX: VALID');
    process.exit(0);
} catch (e) {
    console.log('JS SYNTAX ERROR:', e.message);
    const lineMatch = e.message.match(/line (\d+)/);
    if (lineMatch) {
        const lineNum = parseInt(lineMatch[1]);
        const jsLines = js.split('\n');
        const start = Math.max(0, lineNum - 3);
        const end = Math.min(jsLines.length, lineNum + 2);
        console.log('\n--- Context (JS lines ' + (start+1) + '-' + (end+1) + '):');
        for (let i = start; i < end; i++) {
            const marker = (i === lineNum - 1) ? '>>> ' : '    ';
            console.log(marker + 'Line ' + (i+1) + ': ' + jsLines[i].substring(0, 150));
        }
    }
}

// Also show the raw file lines around problem areas in the HTML
const htmlLines = c.split('\n');
console.log('\n--- HTML lines 176-186:');
for (let i = 175; i < 186; i++) {
    if (htmlLines[i]) console.log('  ' + (i+1) + ': ' + htmlLines[i].substring(0, 150));
}

console.log('\n--- HTML lines with window.open:');
for (let i = 0; i < htmlLines.length; i++) {
    if (htmlLines[i].includes('window.open')) {
        console.log('  ' + (i+1) + ': ' + htmlLines[i].substring(0, 200));
    }
}

console.log('\n--- HTML lines with cSt:');
for (let i = 0; i < htmlLines.length; i++) {
    if (htmlLines[i].includes('cSt(')) {
        console.log('  ' + (i+1) + _: ' + htmlLines[i].substring(0, 200));
    }
}

console.log('\n--- HTML lines with arg1:');
for (let i = 0; i < htmlLines.length; i++) {
    if (htmlLines[i].includes('arg1')) {
        console.log('  ' + (i+1) + ': ' + htmlLines[i].substring(0, 200));
    }
}
