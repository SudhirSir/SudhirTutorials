import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: { passwordHash: hash },
    create: {
      username: 'admin',
      name: 'Master Admin',
      passwordHash: hash,
      role: 'ADMIN',
      mustChangePassword: false,
    }
  });
  console.log("Admin seeded: admin / admin123");
}

main().catch(console.error).finally(() => prisma.$disconnect());
