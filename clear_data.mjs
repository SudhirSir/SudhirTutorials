import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  await prisma.payment.deleteMany({});
  await prisma.material.deleteMany({});
  await prisma.test.deleteMany({});
  await prisma.schedule.deleteMany({});
  await prisma.batch.deleteMany({});
  await prisma.course.deleteMany({});
  await prisma.studentProfile.deleteMany({});
  await prisma.teacherProfile.deleteMany({});
  await prisma.message.deleteMany({});
  await prisma.notification.deleteMany({});
  
  // delete all users except admin
  await prisma.user.deleteMany({
    where: {
      username: { not: 'admin' }
    }
  });

  console.log("Database cleared! Only admin user remains.");
}

main().finally(() => prisma.$disconnect());
