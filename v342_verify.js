// Final V342 verify + version bump
const fs = require('fs');
const path = 'C:/Users/Server/.openclaw/workspace/Shop_vnext/src/Index.html';
let c = fs.readFileSync(path, 'utf8');

// Version bumps
c = c.replace(/V326/g, 'V342');
console.log('[Bumped] V326 -> V342');

fs.writeFileSync(path, c, 'utf8');

// Full validation
const c2 = fs.readFileSync(path, 'utf8');
const m = c2.match(/<script>([\s\S]*?)<\/script>/);
if (!m) {
  console.log('NO SCRIPT');
  process.exit(1);
}

try {
  new Function(m[1]);
  console.log('V342 JS VALID');
} catch(e) {
  console.log('ERROR:', e.message);
}

// Check all critical functions exist
const funcs = ['applyFilt','render','vJob','refreshData','processPhotos','loadMoreJobs','oSt','eJob','sv','cSt','addNote','sj','sendLineSummary','cm','om','es','gs','gsl','fj','sr','se','st','openNewJob','showQuickNote','addQuickNote2'];
const missing = [];
for (const fn of funcs) {
  if (!c2.includes('function ' + fn)) {
    missing.push(fn);
  }
}
if (missing.length > 0) {
  console.log('MISSING functions:', missing.join(', '));
} else {
  console.log('ALL', funcs.length, 'functions present');
}

// Check for unreplaced refresh() calls (should be none except refreshData)
const refreshCalls = [];
const lines = c2.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('refresh()') && !lines[i].includes('refreshData') && !lines[i].includes('refreshData()')) {
    refreshCalls.push('L' + (i+1) + ': ' + lines[i].trim().substring(0, 80));
  }
}
if (refreshCalls.length > 0) {
  console.log('WARNING: Still has refresh() calls:', refreshCalls.join(' | '));
} else {
  console.log('No stale refresh() calls');
}
