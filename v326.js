// V326 Patch - Dark Mode + Glassmorphism
const fs = require('fs');
const path = 'C:/Users/Server/.openclaw/workspace/Shop_vnext/src/Index.html';

let c = fs.readFileSync(path, 'utf8');

const oldCssStart = c.indexOf('<style>');
const oldCssEnd = c.indexOf('</style>');

if (oldCssStart < 0 || oldCssEnd < 0) {
  console.log('ERROR: No style tags');
  process.exit(1);
}

const newCss = `<style>
*{margin:0;padding:0;box-sizing:border-box}
:root{
--bg:#0f1419;--bg2:#171f28;--card:rgba(26,35,45,.85);--card2:rgba(35,45,55,.7);
--t1:#e6edf3;--t2:#8b949e;--t3:#484f58;
--green:#3fb950;--orange:#d29922;--red:#f85149;--purple:#bc8cff;--cyan:#39d2c0;--accent:#58a6ff;
--border:rgba(255,255,255,.08);--shadow:0 4px 24px rgba(0,0,0,.4);
}
html{background:var(--bg);color:var(--t1);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;min-height:100vh}
body{padding-bottom:72px}
.hd{background:linear-gradient(135deg,#1a6b3c,#0d4d2b);backdrop-filter:blur(12px);padding:12px 16px 10px;position:sticky;top:0;z-index:100;border-bottom:1px solid rgba(255,255,255,.1);text-align:center}
.hd h1{font-size:15px;font-weight:800}.hd .sub{font-size:10px;opacity:.7;margin-top:1px}
#ld{text-align:center;padding:100px 20px}
#ld .sp{width:44px;height:44px;border:3px solid var(--border);border-top:3px solid var(--green);border-radius:50%;animation:sp .8s linear infinite;margin:0 auto 12px}
@keyframes sp{to{transform:rotate(360deg)}}
#ld p{font-size:14px;color:var(--t2)}
#eb{display:none;background:rgba(248,81,73,.12);border:1px solid var(--red);border-radius:12px;padding:14px;margin:12px}
#eb h3{color:var(--red);margin-bottom:6px;font-size:13px}
#eb pre{font-size:11px;color:var(--t2);white-space:pre-wrap}
#rb{display:none;padding-bottom:8px}
.tl{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:0 10px;margin:10px 0}
.tt{background:var(--card);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,.1);border-radius:14px;padding:12px 6px;text-align:center;box-shadow:var(--shadow);transition:transform .15s}
.tt:active{transform:scale(.97)}.tt .n{font-size:22px;font-weight:800}.tt .l{font-size:9px;color:var(--t2);margin-top:2px;font-weight:600}
.c1{color:var(--orange)}.c2{color:var(--accent)}.c3{color:var(--green)}.c4{color:var(--red)}
.pq{background:linear-gradient(135deg,rgba(188,140,255,.1),rgba(57,210,192,.08));border:1px solid rgba(188,140,255,.25);border-radius:14px;padding:12px;margin:8px 10px;backdrop-filter:blur(8px)}
.pq h3{font-size:12px;font-weight:700;margin-bottom:6px;color:var(--purple)}
.pq .row{display:flex;gap:8px;align-items:center}.pq .cnt{font-size:24px;font-weight:800;color:var(--purple)}
.pq .lbl{font-size:10px;color:var(--t2)}
.pq .btn{flex:1;padding:10px;border:none;border-radius:10px;font-size:11px;font-weight:700;cursor:pointer;background:linear-gradient(135deg,var(--purple),#8b5cf6);color:#fff;box-shadow:0 2px 12px rgba(188,140,255,.25)}
.pq .btn:active{transform:scale(.97)}.pq .btn2{flex:1;padding:10px;border:none;border-radius:10px;font-size:11px;font-weight:700;cursor:pointer;background:linear-gradient(135deg,var(--cyan),#14b8a6);color:#fff}
#fl{background:var(--card);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,.1);border-radius:14px;padding:10px;margin:8px 10px;box-shadow:var(--shadow)}
#fl input,#fl select{width:100%;padding:9px 12px;background:var(--bg2);border:1px solid var(--border);border-radius:10px;color:var(--t1);font-size:12px}
#fl input::placeholder{color:var(--t3)}#fl input:focus,#fl select:focus{border-color:var(--accent);outline:none}
#fl .rw{display:flex;gap:6px;margin-top:6px}#fl .rw>*{flex:1}
.ca{background:var(--card);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,.1);border-radius:14px;padding:10px;margin:8px 10px;box-shadow:var(--shadow)}
.ca h3{font-size:12px;font-weight:700;margin-bottom:6px}
.jc{background:var(--card2);border:1px solid var(--border);border-radius:10px;padding:10px;margin-bottom:6px;cursor:pointer;transition:all .12s}
.jc:active{transform:scale(.99);border-color:var(--accent)}
.jc.a1{border-left:3px solid var(--orange)}.jc.a2{border-left:3px solid var(--accent)}.jc.a3{border-left:3px solid var(--green)}.jc.a4{border-left:3px solid var(--red)}
.jc .ji{font-size:10px;font-weight:800;color:var(--green)}.jc .jb{font-size:8px;font-weight:700;padding:2px 6px;border-radius:6px;display:inline-block;margin-left:5px}
.jc .b1{background:rgba(210,153,34,.15);color:var(--orange)}.jc .b2{background:rgba(88,166,255,.15);color:var(--accent)}
.jc .b3{background:rgba(63,185,80,.15);color:var(--green)}.jc .b4{background:rgba(248,81,73,.15);color:var(--red)}
.jc .jn{font-size:11px;font-weight:600;margin-top:2px}.jc .jy{font-size:10px;color:var(--t2);margin-top:1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.jc .jm{font-size:8px;color:var(--t3);margin-top:3px}
.load-more{text-align:center;padding:10px;color:var(--accent);font-size:11px;font-weight:600;cursor:pointer;background:none;border:1px solid var(--border);border-radius:8px;margin:4px 0}
.si{display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid var(--border)}.si:last-child{border:none}
.si .sn{font-size:11px;font-weight:600}.si .sq{font-size:13px;font-weight:800;padding:2px 7px;border-radius:6px}
.si .sq.lo{background:rgba(248,81,73,.15);color:var(--red)}.si .sq.ok{background:rgba(63,185,80,.15);color:var(--green)}
.si .sc{font-size:9px;color:var(--t3)}
.btn{display:block;margin:6px;padding:11px;background:linear-gradient(135deg,var(--green),#238636);color:#fff;border:none;border-radius:10px;font-size:12px;font-weight:700;cursor:pointer;text-align:center;box-shadow:0 2px 10px rgba(63,185,80,.2);transition:transform .12s}
.btn:active{transform:scale(.97)}.btn.ln{background:linear-gradient(135deg,#06C755,#05a848)}.btn.pu{background:linear-gradient(135deg,#8b5cf6,#6d28d9)}.btn.cy{background:linear-gradient(135deg,var(--cyan),#14b8a6)}
#mo{display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.65);z-index:200;justify-content:center;align-items:flex-end;padding:0;backdrop-filter:blur(4px)}
#mo.op{display:flex}
#mb{background:var(--bg2);border:1px solid rgba(255,255,255,.1);border-radius:18px 18px 0 0;padding:20px 16px 28px;width:100%;max-width:420px;max-height:85vh;overflow-y:auto;box-shadow:0 -8px 40px rgba(0,0,0,.5);animation:su .25s ease}
@keyframes su{from{transform:translateY(100%)}to{transform:translateY(0)}}
#mb h2{font-size:16px;font-weight:800;margin-bottom:4px}#mb .su{font-size:11px;color:var(--t2);margin-bottom:8px}
#mb .dt{font-size:10px;line-height:1.6;margin-bottom:10px;color:var(--t2);white-space:pre-line}
#mb .ac{display:flex;gap:6px;flex-wrap:wrap}
#mb .cx{position:absolute;top:12px;right:16px;background:none;border:none;font-size:20px;cursor:pointer;color:var(--t3)}
input[type=text],textarea{width:100%;padding:10px 12px;background:var(--bg);border:1px solid var(--border);border-radius:10px;color:var(--t1);font-size:12px}
input:focus,textarea:focus{border-color:var(--accent);outline:none}textarea{resize:vertical;min-height:50px}
.ti{padding:6px 0 6px 14px;border-bottom:1px solid var(--border);position:relative}.ti:before{content:'';position:absolute;left:0;top:9px;width:6px;height:6px;border-radius:50%;background:var(--green)}
.ti:last-child{border:none}.ti .ts{font-size:8px;color:var(--t3)}.ti .tn{font-size:10px;font-weight:700}.ti .td{font-size:10px;color:var(--t2)}
.b2{display:inline-flex;align-items:center;padding:8px 12px;border:none;border-radius:8px;font-size:10px;font-weight:600;cursor:pointer;gap:4px}
.bb{background:rgba(88,166,255,.15);color:var(--accent)}.ba{background:rgba(210,153,34,.15);color:var(--orange)}.bp{background:rgba(188,140,255,.15);color:var(--purple)}.bx{background:rgba(99,99,99,.2);color:var(--t2)}
.qab{position:fixed;bottom:0;left:0;right:0;background:rgba(15,20,25,.92);backdrop-filter:blur(12px);border-top:1px solid var(--border);padding:6px 8px;display:flex;gap:5px;z-index:150;padding-bottom:max(6px,env(safe-area-inset-bottom))}
.qab .q{flex:1;padding:9px 4px;border:none;border-radius:10px;font-size:9px;font-weight:700;cursor:pointer;text-align:center;transition:transform .1s}.qab .q:active{transform:scale(.94)}
.q.q1{background:rgba(63,185,80,.15);color:var(--green)}.q.q2{background:rgba(188,140,255,.15);color:var(--purple)}.q.q3{background:rgba(210,153,34,.15);color:var(--orange)}.q.q4{background:rgba(88,166,255,.15);color:var(--accent)}
.nr{text-align:center;padding:16px;color:var(--t3);font-size:11px}.fc{text-align:center;padding:6px;font-size:10px;color:var(--t3)}
</style>`;

// Replace CSS
const oldStyle = c.substring(oldCssStart, oldCssEnd + 8);
c = c.replace(oldStyle, newCss);
console.log('[1] CSS replaced');

// Version
c = c.replace(/Comphone V32\d/g, 'Comphone V326');
console.log('[2] Version V326');

fs.writeFileSync(path, c, 'utf8');
console.log('Saved:', c.length, 'bytes');

// Verify
const c2 = fs.readFileSync(path, 'utf8');
const m = c2.match(/<script>([\s\S]*?)<\/script>/);
if (m) {
  try { new Function(m[1]); console.log('JS VALID'); }
  catch(e) { console.log('JS ERROR:', e.message); }
}
