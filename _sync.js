const fs = require('fs');
const p = 'C:/Users/Server/.openclaw/workspace/Shop_vnext/src/LineBot.gs';
let c = fs.readFileSync(p, 'utf8');
const newUrl = 'https://script.google.com/macros/s/AKfycbyKnkVGSNblq758Y63xSGJGCiO-NJyGkLzR8fBGEnwetHAXEPgPs5u5_TX2nkbPXzTn5g/exec';
const m = c.match(/var LINE_GAS_URL = 'https:\/\/script\.google\.com\/macros\/s\/[^\/]+\/exec'/);
if (m) {
  c = c.replace(m[0], "var LINE_GAS_URL = '" + newUrl + "'");
  fs.writeFileSync(p, c, 'utf8');
  console.log('URL synced to @348');
} else {
  console.log('Not found');
  const pos = c.indexOf('LINE_GAS_URL');
  if (pos > 0) console.log('Found at:', c.substring(pos, pos+100));
}
