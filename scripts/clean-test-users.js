/**
 * Clean Test Users Script
 * Safely removes only users prefixed with 'TEST_'
 * Real student, teacher, and admin data is NEVER touched.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Finding and deleting isolated test accounts (prefixed with TEST_)...');

  const deleted = await prisma.user.deleteMany({
    where: {
      username: {
        startsWith: 'TEST_',
      },
    },
  });

  console.log(`✅ Successfully deleted ${deleted.count} test accounts. Real database data is completely untouched!`);
}

main()
  .catch((e) => {
    console.error('Error cleaning test users:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
