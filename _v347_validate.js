const fs = require('fs');
const D = 'C:/Users/Server/.openclaw/workspace/Shop_vnext/src';

// ============================================================
// 1. Read & fix JS_Dashboard.html — fix vJb jtl line
// ============================================================
let jsDash = fs.readFileSync(D + '/JS_Dashboard.html', 'utf8');

// Fix the broken vJb jtl line
// Was: h2+='<div id="jtl">"></div></div>';
// Should be: h2+='<div id="jtl">\u2b07\ufe0f \u0e42\u0e2b\u0e25\u0e14...</div>';
jsDash = jsDash.replace(
    "h2+='<div id=\"jtl\">\"></div></div>';",
    "h2+='<div id=\"jtl\"></div>';"
);

// Fix cm() -> cl()
jsDash = jsDash.replace('onclick="cm()"', 'onclick="cl()"');

// Validate JS
const scriptContent = jsDash.replace(/^<script>\n?/, '').replace(/\n?<\/script>$/, '');
try {
    new Function(scriptContent);
    console.log('✅ JS syntax VALID');
} catch(e) {
    console.log('❌ JS ERROR:', e.message);
    const lm = e.message.match(/line (\d+)/);
    if (lm) {
        const idx = parseInt(lm[1]);
        const jsl = scriptContent.split('\n');
        for (let i = Math.max(0,idx-3); i <= Math.min(jsl.length-1,idx+3); i++) {
            console.log((i===idx-1?'>>> ':'   ')+'L'+(i+1)+': '+jsl[i].substring(0,120));
        }
    }
    process.exit(1);
}

// Check all required functions
const required = ['se2','sr2','om2','cl','fj2','es2','gs2','gsl2','gsb2','render2','ldJobs','aF','rfr','vJb','adNote','shNote','adNote2','opJob','doOpen','senSum','oSt2','cSt2','eJb2','doSave','procPhotos'];
const funcs = scriptContent.match(/function \w+/g) || [];
console.log('Functions found:', funcs.length);
for (const fn of required) {
    if (!scriptContent.includes('function ' + fn)) {
        console.log('❌ MISSING:', fn);
        process.exit(1);
    }
}

// Check no broken patterns remain
if (scriptContent.includes('onclick="cm()"')) { console.log('❌ cm() not fixed'); process.exit(1); }
if (scriptContent.includes('jtl">"')) { console.log('❌ jtl still broken'); process.exit(1); }
if (!scriptContent.endsWith(');')) { console.log('⚠️ JS does not end with );'); }

// Check tags
if (!jsDash.startsWith('<script>')) { console.log('❌ Missing <script>'); process.exit(1); }
if (!jsDash.endsWith('</script>')) { console.log('❌ Missing </script>'); process.exit(1); }

fs.writeFileSync(D + '/JS_Dashboard.html', jsDash, 'utf8');
console.log('JS_Dashboard.html:', jsDash.length, 'bytes ✅');

// ============================================================
// 2. Read & verify Index.html
// ============================================================
let idx = fs.readFileSync(D + '/Index.html', 'utf8');
if (!idx.includes("<?!= include('JS_Dashboard'); ?>")) {
    console.log('❌ Index.html missing include()');
    process.exit(1);
}
if (!idx.endsWith('</body>\n</html>') && !idx.endsWith('</body></html>')) {
    console.log('❌ Index.html missing closing tags');
    process.exit(1);
}
console.log('Index.html:', idx.length, 'bytes ✅');

// ============================================================
// 3. Read & verify Dashboard.gs has include()
// ============================================================
let dashGs = fs.readFileSync(D + '/Dashboard.gs', 'utf8');
if (!dashGs.includes('function include(')) {
    console.log('❌ Dashboard.gs missing include()');
    process.exit(1);
}
console.log('Dashboard.gs has include() ✅');

// ============================================================
// 4. Verify appsscript.json
// ============================================================
let appsscript = fs.readFileSync(D + '/appsscript.json', 'utf8');
const cfg = JSON.parse(appsscript);
console.log('appsscript.json timeZone:', cfg.timeZone);

// ============================================================
console.log('\n✅ V347 All checks passed!');
