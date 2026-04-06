const fs = require('fs');
const p = 'C:/Users/Server/.openclaw/workspace/Shop_vnext/src/LineBot.gs';
let c = fs.readFileSync(p, 'utf8');
const newUrl = 'https://script.google.com/macros/s/AKfycbx5IrjcAk4ZR7Xa9CoSNwFMWObgxo9STWqYjWQo3nEMYXVcAeZxjukLLKiFqIETAz-MHg/exec';
const old = c.match(/var LINE_GAS_URL = 'https:\/\/script\.google\.com\/macros\/s\/[^\/]+\/exec'/);
if (old) {
  c = c.replace(old[0], "var LINE_GAS_URL = '" + newUrl + "'");
  fs.writeFileSync(p, c, 'utf8');
  console.log('URL synced to @346');
} else {
  console.log('URL already correct or not found');
  // Show what's there
  const found = c.indexOf('LINE_GAS_URL');
  if (found > 0) console.log('Found at:', c.substring(found, found + 100));
}
