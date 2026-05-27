const { execSync } = require('child_process');
try {
  console.log(execSync('clangd --version').toString());
} catch (e) {
  console.log('clangd not found');
}
try {
  console.log(execSync('git --version').toString());
} catch (e) {
  console.log('git not found');
}
