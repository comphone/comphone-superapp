// Quick deploy V342
const { execSync } = require('child_process');
const cwd = 'C:\\Users\\Server\\.openclaw\\workspace\\Shop_vnext';

try {
  console.log(execSync('clasp push --force', { cwd, encoding: 'utf8' }));
  console.log('\n---');
  console.log(execSync('clasp deploy --description "V326 Final Stable: Zero Bug + null guards + try/catch everywhere"', { cwd, encoding: 'utf8' }));
} catch(e) {
  console.log('Error:', e.message);
}
