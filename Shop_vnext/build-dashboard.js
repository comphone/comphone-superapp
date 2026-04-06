const fs = require('fs');

// Build the HTML using only ASCII-safe Unicode escapes for Thai
const html = [
'<!DOCTYPE html><html lang="th"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Comphone</title>',
'<style>',
'*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,sans-serif;background:#f5f7fa;color:#1a1a2e;min-height:100vh;padding-bottom:80px;padding-top:56px}',
'.bar{background:linear-gradient(135deg,#1DB446,#18933a);color:#fff;padding:12px 20px;position:fixed;top:0;left:0;right:0;z-index:100;display:flex;justify-content:space-between;align-items:center}',
'.bar h1{font-size:18px;font-weight:800}.bar .tm{font-size:11px;opacity:.85}',
'.pg{display:none;padding:16px}.pg.sh{display:block}',
'.sg{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-bottom:16px}',
'.sc{background:#fff;border-radius:16px;padding:16px;box-shadow:0 2px 12px rgba(0,0,0,.06);text-align:center}',
'.sc .n{font-size:30px;font-weight:800}.sc .l{font-size:11px;color:#999;margin-top:2px}',
'.srch{margin-bottom:16px}.srch input{width:100%;padding:14px 18px;border:2px solid #e8ecf0;border-radius:14px;font-size:15px;outline:none;background:#fff}',
.srch input:focus{border-color:#1DB446}',
.jc{background:#fff;border-radius:16px;padding:16px;margin-bottom:12px;box-shadow:0 2px 12px rgba(0,0,0,.06)}',
.jc .top{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}',
.jc .id{font-weight:800;color:#1DB446}.jc .nm{font-size:15px;font-weight:700;margin-bottom:3px}',
'.jc .sy{font-size:13px;color:#666;line-height:1.5;margin-bottom:8px}',
'.jc .mt{display:flex;gap:14px;font-size:11px;color:#999;margin-bottom:10px;flex-wrap