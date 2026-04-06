const fs = require('fs');
const path = 'C:\\\\Users\\\\Server\\\\.openclaw\\\\workspace\\\\Shop_vnext\\\\src\\\\Index.html';

// Read current file - it already has Thai text, just fix the modal parts
let h = fs.readFileSync(path, 'utf8');

// Fix emoji HTML entities in msg() calls -> use textContent with real emoji
h = h.replace(/msg\('&#x26A0;','msg("\u26A0');
h = h.replace(/&#x26A0;/, '\u26A0');
h = h.replace(/msg\('&#x2705;','msg("\u2705');
h = h.replace(/&#x2705;'/, '\u2705');
h = h.replace(/&#x274C;/, '\u274C');
h = h.replace(/&#x1F389;/, '\uD83C\uDF89');
h = h.replace(/&#x1F4CB;/, '\uD83C\uDF89');

// Fix the stray code at the end
const end = h.indexOf('fs.writeFileSync');
if (end > -1) h = h.substring(0, h.lastIndexOf('\n'));

// Fix double-escaped newlines in alert text
h = h.replace(/\\\\n/g, '\\n');

// Ensure proper ending
if (!h.trim().endsWith('</html>')) {
  h = h.trim();
  h = h.replace(/\n\n*$/, '');
  // Remove the trailing Node.js code that got appended
  const lastScript = h.lastIndexOf('<\/script>');
  if (lastScript > -1) {
    h = h.substring(0, lastScript + 9) + '\n<\/body>\n<\/html>';
  }
}

fs.writeFileSync(path, h, 'utf8');
console.log('Fixed:' + h.length + ' bytes');
