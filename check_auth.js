const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function check() {
  const user = await prisma.user.findUnique({ where: { username: 'admin' } });
  if (!user) {
    console.log("Admin not found");
    return;
  }
  const match = await bcrypt.compare('admin123', user.passwordHash);
  console.log(`Username: ${user.username}`);
  console.log(`Hash in DB: ${user.passwordHash}`);
  console.log(`Password 'admin123' matches? ${match}`);
  
  const testHash = await bcrypt.hash('admin123', 10);
  console.log(`Generated new hash for 'admin123': ${testHash}`);
  const matchNew = await bcrypt.compare('admin123', testHash);
  console.log(`New hash matches? ${matchNew}`);
}

check().catch(console.error).finally(() => prisma.$disconnect());
