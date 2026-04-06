const fs = require('fs');
const content = fs.readFileSync('C:/Users/Server/.openclaw/workspace/Shop_vnext/src/Index.html', 'utf8');
const lines = content.split('\n');

// Show lines 199-220
for (let i = 198; i < 220; i++) {
  console.log(`Line ${i+1}: "${lines[i]}"`);
}
