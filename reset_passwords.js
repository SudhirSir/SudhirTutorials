const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  try {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('password123', salt);

    // Get one student
    const student = await prisma.user.findFirst({ where: { role: 'STUDENT' } });
    if (student) {
      await prisma.user.update({
        where: { id: student.id },
        data: { passwordHash: hash }
      });
      console.log(`Student Credentials:`);
      console.log(`Username: ${student.username}`);
      console.log(`Password: password123\n`);
    } else {
      console.log("No student found in DB.");
    }

    // Get one teacher
    const teacher = await prisma.user.findFirst({ where: { role: 'TEACHER' } });
    if (teacher) {
      await prisma.user.update({
        where: { id: teacher.id },
        data: { passwordHash: hash }
      });
      console.log(`Teacher Credentials:`);
      console.log(`Username: ${teacher.username}`);
      console.log(`Password: password123\n`);
    } else {
      console.log("No teacher found in DB.");
    }
    
    // Create/update admin just to be sure
    const adminHash = await bcrypt.hash('admin123', salt);
    const admin = await prisma.user.upsert({
      where: { username: 'admin' },
      update: { passwordHash: adminHash },
      create: {
        username: 'admin',
        name: 'Admin',
        role: 'ADMIN',
        passwordHash: adminHash,
        mustChangePassword: false,
      }
    });
    console.log(`Admin Credentials:`);
    console.log(`Username: admin`);
    console.log(`Password: admin123\n`);

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
