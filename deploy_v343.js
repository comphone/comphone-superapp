// Deploy V343
const { execSync } = require('child_process');
const cwd = 'C:\\Users\\Server\\.openclaw\\workspace\\Shop_vnext';

try {
  console.log(execSync('clasp push --force', { cwd, encoding: 'utf8' }));
  console.log('\n--- Deploying ---');
  console.log(execSync('clasp deploy --description "V343 Final Stability: null guards + select fix + applyFilt null-safe + loadMore scoping"', { cwd, encoding: 'utf8' }));
} catch(e) {
  console.log('EXIT CODE:', e.status);
  console.log(e.stdout);
  if (e.stderr) console.log(e.stderr);
}
