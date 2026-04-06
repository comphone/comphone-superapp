// Final V324 fix - read current file, apply 3 fixes, write back, verify
const fs = require('fs');
const path = 'C:/Users/Server/.openclaw/workspace/Shop_vnext/src/Index.html';

let content = fs.readFileSync(path, 'utf8');
const lines = content.split('\n');

console.log('\n=== DIAGNOSIS ===');
console.log('Total lines:', lines.length);

// Find orphan
for (let i = 180; i < 186; i++) {
  if (lines[i] && lines[i].includes('addNote')) {
    if (!lines[i].trim().startsWith('function ') && lines[i].trim().includes('h+=')) {
      console.log(`ORPHAN at line ${i+1}: ${lines[i].trim().substring(0,80)}`);
    }
  }
}

// Find duplicate grid
for (let i = 200; i < 220; i++) {
  if (lines[i] && lines[i].includes('pendingPhotos')) {
    console.log(`PENDING_PHOTOS at line ${i+1}: ${lines[i].trim().substring(0,100)}`);
  }
  if (lines[i] && lines[i].includes('processPhotos') && !lines[i].includes('function')) {
    console.log(`PROCESS_PHOTOS_TILE at line ${i+1}: ${lines[i].trim().substring(0,100)}`);
  }
}

// Find typo
for (let i = 495; i < 510; i++) {
  if (lines[i] && lines[i].includes("รอด")) {
    console.log(`OST line ${i+1}: ${lines[i].trim().substring(0,100)}`);
  }
}
