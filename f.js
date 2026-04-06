const fs = require('fs');
const c = fs.readFileSync('C:/Users/Server/.openclaw/workspace/Shop_vnext/src/Index.html', 'utf8');
const lines = c.split('\n');

// Show render() function start (lines 200-230)
for (let i = 199; i < 230; i++) {
  console.log(`L${i+1}: ${lines[i]}`);
}
