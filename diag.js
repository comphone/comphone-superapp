const fs = require('fs');
const c = fs.readFileSync('C:/Users/Server/.openclaw/workspace/Shop_vnext/src/Index.html', 'utf8');
const lines = c.split('\n');

// Show the start of render function
for (let i = 195; i < 218; i++) {
  console.log(`L${i+1}: ${lines[i]}`);
}
