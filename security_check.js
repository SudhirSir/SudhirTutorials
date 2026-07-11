const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('route.ts')) results.push(file);
    }
  });
  return results;
}

const files = walk('d:/Projects/SUDHIR TUTORIALS WEBAPP/app/api/admin');
files.forEach(f => {
  const c = fs.readFileSync(f, 'utf8');
  if (!c.includes('getServerSession')) {
    console.log('Missing getServerSession: ' + f);
  }
  if (!c.includes('role !== \'ADMIN\'') && !c.includes('role !== "ADMIN"')) {
    console.log('Missing ADMIN check: ' + f);
  }
});
