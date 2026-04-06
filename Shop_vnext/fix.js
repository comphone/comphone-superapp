const fs = require('fs');
const p = 'C:\\\\Users\\\\Server\\\\.openclaw\\\\workspace\\\\Shop_vnext\\\\src\\\\Index.html';
let h = fs.readFileSync(p, 'utf8');
// Remove trailing Node.js code
const ei = h.indexOf('fs.write');
if (ei > -1) h = h.substring(0, ei);
// Fix HTML entity emojis in msg() calls
h = h.replace(/msg\(&#x1F4CB;/g, 'msg("\uD83D\uDCCB');
h = h.replace(/msg\(&#x1F389;/g, 'msg("\uD83C\uDF89');
h = h.replace(/msg\(&#x2705;/g, 'msg("\u2705');
h = h.replace(/msg\(&#x274C;/g, 'msg("\u274C');
h = h.replace(/msg\(&#x26A0;/g, 'msg("\u26A0');
// Ensure proper ending
if (!h.includes('</script>')) { h += '</script></body></html>'; }
else {
  const si = h.lastIndexOf('</script>');
  const after = h.substring(si + 9).trim();
  if (after && !after.startsWith('</body>')) {
    h = h.substring(0, si + 9) + '\n</body>\n</html>';
  }
}
fs.writeFileSync(p, h, 'utf8');
console.log('Fixed: ' + h.length + ' bytes');
