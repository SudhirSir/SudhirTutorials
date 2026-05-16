const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const users = await prisma.user.findMany({ take: 5 });
    const payments = await prisma.payment.findMany({ take: 5 });
    console.log(JSON.stringify({ users, payments }, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
