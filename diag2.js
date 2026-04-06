const fs = require('fs');
const c = fs.readFileSync('C:/Users/Server/.openclaw/workspace/Shop_vnext/src/Index.html', 'utf8');
const lines = c.split('\n');
console.log('Total lines:', lines.length, 'Size:', c.length);
for (let i = 0; i < lines.length; i++) {
  const t = lines[i].trim();
  if (t.startsWith('function ')) {
    console.log('L' + (i+1) + ': ' + t.substring(0, 80));
  }
}
// Check if CSS classes are dark mode
console.log('\nCSS check:', c.includes('--bg:') ? 'DARK MODE' : 'LIGHT MODE');
console.log('V326:', c.includes('V326'));
