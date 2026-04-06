const fs = require('fs');
const D = 'C:/Users/Server/.openclaw/workspace/Shop_vnext/src';

// Read current JS_Dashboard.html (raw JS, no tags)
const jsFile = D + '/JS_Dashboard.html';
let js = fs.readFileSync(jsFile, 'utf8');

// Check if already has <script>
if (!js.startsWith('<script>')) {
  // Add <script> at the start
  js = '<script>\n' + js;
}
if (!js.endsWith('</script>')) {
  // Add </script> at the end
  js = js + '\n</script>';
}

// Save JS_Dashboard.html with proper <script> tags
fs.writeFileSync(jsFile, js, 'utf8');

// Validate
const jsInner = js.replace(/^<script>\n?/, '').replace(/\n?<\/script>$/, '');
try {
  new Function(jsInner);
  console.log('✅ JS_Dashboard.html: VALID JS + <script> tags');
} catch (e) {
  console.log('❌ JS ERROR:', e.message);
  process.exit(1);
}
console.log('JS_Dashboard.html:', js.length, 'bytes');
console.log('Functions:', (jsInner.match(/function \w+/g) || []).length);

// Check for broken patterns
if (jsInner.includes('"cm()"')) { console.log('❌ cm() found'); process.exit(1); }
if (jsInner.includes('jtl">"')) { console.log('❌ jtl broken'); process.exit(1); }
console.log('No broken patterns ✅');
