const fs = require('fs');
const D = 'C:/Users/Server/.openclaw/workspace/Shop_vnext/src';

// ============================================================
// STEP 1: Fix JS_Dashboard.html - ensure it has <script> tags
// ============================================================
let jsDash = fs.readFileSync(D + '/JS_Dashboard.html', 'utf8');

// If it doesn't start with <script>, it's raw JS - wrap it
if (!jsDash.trim().startsWith('<script>')) {
  jsDash = '<script>\n' + jsDash.trim() + '\n</script>';
  console.log('Added <script> tags to JS_Dashboard.html');
}

// Validate JS
const jsCode = jsDash.replace(/^<script>\n?/, '').replace(/\n?<\/script>\s*$/, '');
try {
  new Function(jsCode);
  console.log('✅ JS_Dashboard.html: JS valid');
} catch(e) {
  console.log('❌ JS ERROR:', e.message);
  process.exit(1);
}

fs.writeFileSync(D + '/JS_Dashboard.html', jsDash, 'utf8');

// ============================================================
// STEP 2: Create proper Index.html
// ============================================================
// The structure is:
// 1. <head> with CSS
// 2. <body> with HTML elements
// 3. <script> that uses <?!= include('JS_Dashboard'); ?> to pull in JS
//
// <?!= include() ?> is GAS templated HTML (force-printing scriptlet)
// It includes the CONTENT of JS_Dashboard.html (which is the JS code with <script> tags)
// So we DON'T need extra <script> wrapper - the include already contains <script> tags

const indexHtml = '<!DOCTYPE html>\n'
+ '<html lang="th">\n'
+ '<head>\n'
+ '<meta charset="UTF-8">\n'
+ '<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">\n'
+ '<title>Comphone Dashboard V348</title>\n'
+ '<style>\n'
+ '*{margin:0;padding:0;box-sizing:border-box}\n'
+ ':root{\n--bg:#0f1419;--bg2:#171f28;--card:rgba(26,35,45,.85);--card2:rgba(35,45,55,.7);\n--t1:#e6edf3;--t2:#8b949e;--t3:#484f58;\n--green:#3fb950;--orange:#d29922;--red:#f85149;--purple:#bc8cff;--cyan:#39d2c0;--accent:#58a6ff;\n--border:rgba(255,255,255,.08);--shadow:0 4px 24px rgba(0,0,0,.4);\n}\n'
+ 'html{background:var(--bg);color:var(--t1);font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',sans-serif;min-height:100vh}\n'
+ 'body{padding-bottom:72px}\n'
+ '.hd{background:linear-gradient(135deg,#1a6b3c,#0d4d2b);backdrop-filter:blur(12px);padding:12px 16px 10px;position:sticky;top:0;z-index:100;border-bottom:1px solid rgba(255,255,255,.1);text-align:center}\n'
+ '.hd h1{font-size:15px;font-weight:800}.hd .sub{font-size:10px;opacity:.7;margin-top:1px}\n'
+ '#ld{text-align:center;padding:100px 20px}\n'
+ '#ld .sp{width:44px;height:44px;border:3px solid var(--border);border-top:3px solid var(--green);border-radius:50%;animation:sp .8s linear infinite;margin:0 auto 12px}\n'
+ '@keyframes sp{to{transform:rotate(360deg)}}\n'
+ '#ld p{font-size:14px;color:var(--t2)}\n'
+ '#eb{display:none;background:rgba(248,81,73,.12);border:1px solid var(--red);border-radius:12px;padding:14px;margin:12px}\n'
+ '#eb h3{color:var(--red);margin-bottom:6px;font-size:13px}\n'
+ '#eb pre{font-size:11px;color:var(--t2);white-space:pre-wrap}\n'
+ '#rb{display:none;padding-bottom:8px}\n'
+ '.tl{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:0 10px;margin:10px 0}\n'
+ '.tt{background:var(--card);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,.1);border-radius:14px;padding:12px 6px;text-align:center;box-shadow:var(--shadow);transition:transform .15s}\n'
+ '.tt:active{transform:scale(.97)}.tt .n{font-size:22px;font-weight:800}.tt .l{font-size:9px;color:var(--t2);margin-top:2px;font-weight:600}\n'
+ '.c1{color:var(--orange)}.c2{color:var(--accent)}.c3{color:var(--green)}.c4{color:var(--red)}\n'
+ '.pq{background:linear-gradient(135deg,rgba(188,140,255,.1),rgba(57,210,192,.08));border:1px solid rgba(188,140,255,.25);border-radius:14px;padding:12px;margin:8px 10px;backdrop-filter:blur(8px)}\n'
+ '.pq h3{font-size:12px;font-weight:700;margin-bottom:6px;color:var(--purple)}\n'
+ '.pq .row{display:flex;gap:8px;align-items:center}.pq .cnt{font-size:24px;font-weight:800;color:var(--purple)}\n'
+ '.pq .lbl{font-size:10px;color:var(--t2)}\n'
+ '.pq .btn{flex:1;padding:10px;border:none;border-radius:10px;font-size:11px;font-weight:700;cursor:pointer;background:linear-gradient(135deg,var(--purple),#8b5cf6);color:#fff;box-shadow:0 2px 12px rgba(188,140,255,.25)}\n'
+ '.pq .btn:active{transform:scale(.97)}.pq .btn2{flex:1;padding:10px;border:none;border-radius:10px;font-size:11px;font-weight:700;cursor:pointer;background:linear-gradient(135deg,var(--cyan),#14b8a6);color:#fff}\n'
+ '#fl{background:var(--card);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,.1);border-radius:14px;padding:10px;margin:8px 10px;box-shadow:var(--shadow)}\n'
+ '#fl input,#fl select{width:100%;padding:9px 12px;background:var(--bg2);border:1px solid var(--border);border-radius:10px;color:var(--t1);font-size:12px}\n'
+ '#fl input::placeholder{color:var(--t3)}#fl input:focus,#fl select:focus{border-color:var(--accent);outline:none}\n'
+ '#fl .rw{display:flex;gap:6px;margin-top:6px}#fl .rw>*{flex:1}\n'
+ '.ca{background:var(--card);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,.1);border-radius:14px;padding:10px;margin:8px 10px;box-shadow:var(--shadow)}\n'
+ '.ca h3{font-size:12px;font-weight:700;margin-bottom:6px}\n'
+ '.jc{background:var(--card2);border:1px solid var(--border);border-radius:10px;padding:10px;margin-bottom:6px;cursor:pointer;transition:all .12s}\n'
+ '.jc:active{transform:scale(.99);border-color:var(--accent)}\n'
+ '.jc.a1{border-left:3px solid var(--orange)}.jc.a2{border-left:3px solid var(--accent)}.jc.a3{border-left:3px solid var(--green)}.jc.a4{border-left:3px solid var(--red)}\n'
+ '.jc .ji{font-size:10px;font-weight:800;color:var(--green)}.jc .jb{font-size:8px;font-weight:700;padding:2px 6px;border-radius:6px;display:inline-block;margin-left:5px}\n'
+ '.jc .b1{background:rgba(210,153,34,.15);color:var(--orange)}.jc .b2{background:rgba(88,166,255,.15);color:var(--accent)}\n'
+ '.jc .b3{background:rgba(63,185,80,.15);color:var(--green)}.jc .b4{background:rgba(248,81,73,.15);color:var(--red)}\n'
+ '.jc .jn{font-size:11px;font-weight:600;margin-top:2px}.jc .jy{font-size:10px;color:var(--t2);margin-top:1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}\n'
+ '.jc .jm{font-size:8px;color:var(--t3);margin-top:3px}\n'
+ '.load-more{text-align:center;padding:10px;color:var(--accent);font-size:11px;font-weight:600;cursor:pointer;background:none;border:1px solid var(--border);border-radius:8px;margin:4px 0}\n'
+ '.si{display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid var(--border)}.si:last-child{border:none}\n'
+ '.si .sn{font-size:11px;font-weight:600}.si .sq{font-size:13px;font-weight:800;padding:2px 7px;border-radius:6px}\n'
+ '.si .sq.lo{background:rgba(248,81,73,.15);color:var(--red)}.si .sq.ok{background:rgba(63,185,80,.15);color:var(--green)}\n'
+ '.si .sc{font-size:9px;color:var(--t3)}\n'
+ '.btn{display:block;margin:6px;padding:11px;background:linear-gradient(135deg,var(--green),#238636);color:#fff;border:none;border-radius:10px;font-size:12px;font-weight:700;cursor:pointer;text-align:center;box-shadow:0 2px 10px rgba(63,185,80,.2);transition:transform .12s}\n'
+ '.btn:active{transform:scale(.97)}.btn.ln{background:linear-gradient(135deg,#06C755,#05a848)}.btn.pu{background:linear-gradient(135deg,#8b5cf6,#6d28d9)}.btn.cy{background:linear-gradient(135deg,var(--cyan),#14b8a6)}\n'
+ '#mo{display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.65);z-index:200;justify-content:center;align-items:flex-end;padding:0;backdrop-filter:blur(4px)}\n'
+ '#mo.op{display:flex}\n'
+ '#mb{background:var(--bg2);border:1px solid rgba(255,255,255,.1);border-radius:18px 18px 0 0;padding:20px 16px 28px;width:100%;max-width:420px;max-height:85vh;overflow-y:auto;box-shadow:0 -8px 40px rgba(0,0,0,.5);animation:su .25s ease}\n'
+ '@keyframes su{from{transform:translateY(100%)}to{transform:translateY(0)}}\n'
+ '#mb h2{font-size:16px;font-weight:800;margin-bottom:4px}#mb .su{font-size:11px;color:var(--t2);margin-bottom:8px}\n'
+ '#mb .dt{font-size:10px;line-height:1.6;margin-bottom:10px;color:var(--t2);white-space:pre-line}\n'
+ '#mb .ac{display:flex;gap:6px;flex-wrap:wrap}\n'
+ '#mb .cx{position:absolute;top:12px;right:16px;background:none;border:none;font-size:20px;cursor:pointer;color:var(--t3)}\n'
+ 'input[type=text],textarea{width:100%;padding:10px 12px;background:var(--bg);border:1px solid var(--border);border-radius:10px;color:var(--t1);font-size:12px}\n'
+ 'input:focus,textarea:focus{border-color:var(--accent);outline:none}textarea{resize:vertical;min-height:50px}\n'
+ '.ti{padding:6px 0 6px 14px;border-bottom:1px solid var(--border);position:relative}.ti:before{content:\'\';position:absolute;left:0;top:9px;width:6px;height:6px;border-radius:50%;background:var(--green)}\n'
+ '.ti:last-child{border:none}.ti .ts{font-size:8px;color:var(--t3)}.ti .tn{font-size:10px;font-weight:700}.ti .td{font-size:10px;color:var(--t2)}\n'
+ '.b2{display:inline-flex;align-items:center;padding:8px 12px;border:none;border-radius:8px;font-size:10px;font-weight:600;cursor:pointer;gap:4px}\n'
+ '.bb{background:rgba(88,166,255,.15);color:var(--accent)}.ba{background:rgba(210,153,34,.15);color:var(--orange)}.bp{background:rgba(188,140,255,.15);color:var(--purple)}.bx{background:rgba(99,99,99,.2);color:var(--t2)}\n'
+ '.qab{position:fixed;bottom:0;left:0;right:0;background:rgba(15,20,25,.92);backdrop-filter:blur(12px);border-top:1px solid var(--border);padding:6px 8px;display:flex;gap:5px;z-index:150;padding-bottom:max(6px,env(safe-area-inset-bottom))}\n'
+ '.qab .q{flex:1;padding:9px 4px;border:none;border-radius:10px;font-size:9px;font-weight:700;cursor:pointer;text-align:center;transition:transform .1s}.qab .q:active{transform:scale(.94)}\n'
+ '.q.q1{background:rgba(63,185,80,.15);color:var(--green)}.q.q2{background:rgba(188,140,255,.15);color:var(--purple)}.q.q3{background:rgba(210,153,34,.15);color:var(--orange)}.q.q4{background:rgba(88,166,255,.15);color:var(--accent)}\n'
+ '.nr{text-align:center;padding:16px;color:var(--t3);font-size:11px}.fc{text-align:center;padding:6px;font-size:10px;color:var(--t3)}\n'
+ '</style>\n'
+ '</head>\n'
+ '<body>\n'
+ '<div class="hd"><h1>\ud83d\udcf1 Comphone V348</h1><div class="sub" id="clock">กําลังโหลด...</div></div>\n'
+ '<div id="ld"><div class="sp"></div><p>ระบบกําลังดึงข้อมูล...</p></div>\n'
+ '<div id="eb"><h3>\u26a0\ufe0f เกิดข้อผิดพลาด</h3><pre id="ed"></pre><button class="btn" onclick="location.reload()">\ud83d\udd04 ลองใหม่</button></div>\n'
+ '<div id="rb"></div>\n'
+ '<div id="mo" onclick="if(event.target===this)cl()"><div id="mb" style="position:relative"><button class="cx" onclick="cl()">\u2715</button><div id="mc"></div></div></div>\n'
+ '<div class="qab" id="qab" style="display:none">\n'
+ '<div class="q q1" onclick="opJob()">\u2795 เปิดงาน</div>\n'
+ '<div class="q q2" onclick="shNote()">\ud83d\udcdd หมายเหตุ</div>\n'
+ '<div class="q q3" onclick="senSum()">\ud83d\udc9a สรุป</div>\n'
+ '<div class="q q4" onclick="rfr()">\ud83d\udd04 รีเฟรช</div>\n'
+ '</div>\n'
+ '<?!= include(\'JS_Dashboard\'); ?>\n'
+ '</body>\n'
+ '</html>';

fs.writeFileSync(D + '/Index.html', indexHtml, 'utf8');
console.log('✅ Index.html:', indexHtml.length, 'bytes');

// ============================================================
// STEP 3: Verify Dashboard.gs has include() and createTemplateFromFile
// ============================================================
let dashGs = fs.readFileSync(D + '/Dashboard.gs', 'utf8');

// Check include() function exists
if (!dashGs.includes('function include(')) {
  // Add include() at the top
  const includeFn = `// ============================================================\n// Template Include Helper — for modular HTML files\n// ============================================================\nfunction include(filename) {\n  return HtmlService.createHtmlOutputFromFile(filename).getContent();\n}\n\n`;
  const insertPos = dashGs.indexOf('function doGet(');
  if (insertPos > 0) {
    dashGs = dashGs.substring(0, insertPos) + includeFn + dashGs.substring(insertPos);
  }
  console.log('Added include() to Dashboard.gs');
}

// Change createHtmlOutputFromFile to createTemplateFromFile
if (dashGs.includes('createHtmlOutputFromFile(\'Index\')')) {
  dashGs = dashGs.replace(
    "createHtmlOutputFromFile('Index')",
    "createTemplateFromFile('Index').evaluate()"
  );
  console.log('Fixed doGet to use createTemplateFromFile');
}

fs.writeFileSync(D + '/Dashboard.gs', dashGs, 'utf8');
console.log('✅ Dashboard.gs OK');

// ============================================================
// STEP 4: Final validation
// ============================================================
console.log('\n=== V348 Validation ===');

// Index.html checks
const idx = fs.readFileSync(D + '/Index.html', 'utf8');
const checks = [
  ['Has <!DOCTYPE', idx.startsWith('<!DOCTYPE')],
  ['Has <head>', idx.includes('<head>')],
  ['Has <style>', idx.includes('<style>')],
  ['Has </style>', idx.includes('</style>')],
  ['Has </head>', idx.includes('</head>')],
  ['Has <body>', idx.includes('<body>')],
  ['Has .hd header div', idx.includes('class="hd"')],
  ['Has #ld loading div', idx.includes('id="ld"')],
  ['Has #eb error div', idx.includes('id="eb"')],
  ['Has #rb render div', idx.includes('id="rb"')],
  ['Has #mo modal div', idx.includes('id="mo"')],
  ['Has .qab quick action bar', idx.includes('class="qab"')],
  ['Has include call', idx.includes("<?!= include('JS_Dashboard'); ?>")],
  ['Has </body>', idx.includes('</body>')],
  ['Has </html>', idx.includes('</html>')],
  ['No double <script>', (idx.match(/<script>/g) || []).length === 0],
  ['Ends with /html>', idx.trim().endsWith('</html>')],
];

let allPass = true;
for (const [name, ok] of checks) {
  console.log(ok ? '✅' : '❌', name);
  if (!ok) allPass = false;
}

// JS_Dashboard.html checks
const jsDash2 = fs.readFileSync(D + '/JS_Dashboard.html', 'utf8');
const jsChecks = [
  ['Starts with <script>', jsDash2.startsWith('<script>')],
  ['Ends with </script>', jsDash2.trim().endsWith('</script>')],
  ['Has 25 functions', (jsDash2.match(/function \w+/g) || []).length >= 25],
];

for (const [name, ok] of jsChecks) {
  console.log(ok ? '✅' : '❌', name);
  if (!ok) allPass = false;
}

// Dashboard.gs checks
const dgs = fs.readFileSync(D + '/Dashboard.gs', 'utf8');
const gsChecks = [
  ['Has include() function', dgs.includes('function include(')],
  ['Uses createTemplateFromFile', dgs.includes('createTemplateFromFile(\'Index\')')],
  ['Has .evaluate()', dgs.includes('.evaluate()')],
];

for (const [name, ok] of gsChecks) {
  console.log(ok ? '✅' : '❌', name);
  if (!ok) allPass = false;
}

if (allPass) {
  console.log('\n🎉 V348 ALL CHECKS PASSED!');
} else {
  console.log('\n❌ SOME CHECKS FAILED!');
  process.exit(1);
}
