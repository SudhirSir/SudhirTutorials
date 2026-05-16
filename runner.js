const { execSync } = require('child_process');
const fs = require('fs');
try {
  console.log('Starting npm install...');
  execSync('npm.cmd install next react react-dom', { stdio: 'inherit', shell: true });
  execSync('npm.cmd install -D typescript @types/node @types/react @types/react-dom eslint eslint-config-next prisma @prisma/client next-auth', { stdio: 'inherit', shell: true });
  execSync('npx.cmd prisma init', { stdio: 'inherit', shell: true });
  fs.writeFileSync('setup_done.txt', 'Done!');
  console.log('Setup Complete!');
} catch (e) {
  console.error('Error during setup:', e.message);
  fs.writeFileSync('setup_error.txt', e.message);
}
