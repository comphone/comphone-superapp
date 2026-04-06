const fs = require('fs');
const D = 'C:/Users/Server/.openclaw/workspace/Shop_vnext/src';

// ============================================================
// 1. Read current JS_Dashboard.html and extract ONLY the JS code
// ============================================================
let jsDash = fs.readFileSync(D + '/JS_Dashboard.html', 'utf8');

// Remove <script> and </script> tags
let jsCode = jsDash.replace(/^<script>\n?/, '');
jsCode = jsCode.replace(/\n?<\/script>\n?$/, '');
jsCode = jsCode.trim();

// Verify
if (!jsCode.startsWith('// V347')) {
    console.log('❌ Expected V347 header but got:', jsCode.substring(0, 50));
    process.exit(1);
}
if (!jsCode.endsWith('loaded\');')) {
    console.log('❌ Expected to end with console.log but got:', jsCode.substring(jsCode.length - 50));
    process.exit(1);
}

// Validate JS syntax
try {
    new Function(jsCode);
    console.log('✅ JS syntax VALID');
} catch(e) {
    console.log('❌ JS ERROR:', e.message);
    process.exit(1);
}

// ============================================================
// 2. Check for bugs: jtl line, cm() call
// ============================================================
for (let i = 0; i < jsCode.length; i++) {
    if (jsCode.substring(i, i+20).includes('jtl')) {
        const start = Math.max(0, i-20);
        const end = Math.min(jsCode.length, i+60);
        console.log('jtl context:', jsCode.substring(start, end));
    }
    if (jsCode.substring(i, i+14) === 'onclick="cm()"') {
        console.log('❌ STILL HAS cm() at position', i);
        process.exit(1);
    }
}

// ============================================================
// 3. Rewrite JS_Dashboard.html WITHOUT <script> tags
//    GAS HtmlService includes it as raw text via include()
// ============================================================
fs.writeFileSync(D + '/JS_Dashboard.html', jsCode, 'utf8');
console.log('JS_Dashboard.html:', jsCode.length, 'bytes (raw JS, no tags)');

// ============================================================
// 4. Update Index.html — the <?!= include() ?> must be INSIDE <script>
// ============================================================
let idx = fs.readFileSync(D + '/Index.html', 'utf8');

// Fix: move include() inside <script> tags
const pre = `<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<title>Comphone Dashboard V347</title>`;

// Find CSS + HTML up to </head><body>...qab div then <script>
const styleEnd = idx.indexOf('</style>');
const bodyStart = idx.indexOf('<body>');
const qabEnd = idx.indexOf('</div>\n</div>'); // end of qab div
const scriptPos = idx.indexOf('<script>');
const includePos = idx.indexOf("<?!= include('JS_Dashboard'); ?>");

// Build clean structure
// Take everything up to and including the qab closing div
const qabClosePos = idx.lastIndexOf('</div>'); // last </div> before include
const qabSection = idx.substring(0, qabClosePos + 6); // includes </div>

const newIndex = pre + idx.substring(pre.length, qabClosePos + 6).replace(/^<!DOCTYPE html[\s\S]*?<head>[\s\S]*?<\/style>/, '') +
    `\n<script>\n<?!= include('JS_Dashboard'); ?>\n</script>\n</body>\n</html>`;

// Actually let me just find the HTML portion more carefully
const styleBlock = idx.substring(idx.indexOf('<style>'), idx.indexOf('</style>') + 8);
const bodyContent = idx.substring(idx.indexOf('<body>') + 6, idx.indexOf('<script>')).trim();
const qabDivEnd = bodyContent.lastIndexOf('</div>');
const htmlOnly = bodyContent.substring(0, qabDivEnd + 6);

const final = `<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<title>Comphone Dashboard V347</title>
${styleBlock}
</head>
<body>
${htmlOnly}
<script>
<?!= include('JS_Dashboard'); ?>
</script>
</body>
</html>`;

fs.writeFileSync(D + '/Index.html', final, 'utf8');
console.log('Index.html:', final.length, 'bytes');

// ============================================================
// 5. Final verification
// ============================================================
const reIdx = fs.readFileSync(D + '/Index.html', 'utf8');
const reJs = fs.readFileSync(D + '/JS_Dashboard.html', 'utf8');

console.log('\n=== Final Verification ===');
console.log('Index.html:', reIdx.length, 'bytes');
console.log('  Has <?!= include:', reIdx.includes("<?!= include('JS_Dashboard'); ?>"));
console.log('  Ends with </html>:', reIdx.trim().endsWith('</html>'));
console.log('JS_Dashboard.html:', reJs.length, 'bytes');
console.log('  Starts with // V347:', reJs.startsWith('// V347'));
console.log('  No <script> tag:', !reJs.includes('<script>') && !reJs.includes('</script>'));

// Combined JS validation
const combinedJs = reJs; // already raw JS
try {
    new Function(combinedJs);
    console.log('✅ Combined JS syntax: VALID');
} catch(e) {
    console.log('❌ Combined JS syntax ERROR:', e.message);
    process.exit(1);
}

// Count functions
const funcs = combinedJs.match(/function \w+/g) || [];
console.log('Functions found:', funcs.length);

// Check no broken patterns
if (combinedJs.includes('onclick="cm()"')) { console.log('❌ cm() still exists'); process.exit(1); }
if (combinedJs.includes('jtl">"')) { console.log('❌ jtl broken'); process.exit(1); }

console.log('\n✅ V347 Modular: All checks passed!');
