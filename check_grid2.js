const fs = require('fs');
const content = fs.readFileSync('C:/Users/Server/.openclaw/workspace/Shop_vnext/src/Index.html', 'utf8');
const lines = content.split('\n');

// Check lines around render() grid
for (let i = 208; i < 220; i++) {
  console.log(`Line ${i+1}: ${lines[i]}`);
}

// Count grid opens/closes in render
let tlOpen = 0, tlClose = 0;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("h+='<div class=\"tl\">'")) tlOpen++;
  if (lines[i].trim() === "h+='</div>';" && i > 180 && i < 300) tlClose++;
}
console.log(`\nGrid opens in render: ${tlOpen}`);
console.log('Grid closes in render area:', tlClose);
