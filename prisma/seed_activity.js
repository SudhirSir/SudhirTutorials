const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    // Find admin user
    const admin = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });

    if (!admin) {
      console.error('Admin user not found. Please run seed.mjs first.');
      return;
    }

    console.log(`Seeding activity logs for Admin: ${admin.name} (${admin.id})`);

    // Array of realistic administrative actions
    const activities = [
      {
        userId: admin.id,
        action: 'UPDATE_SETTINGS',
        details: 'Updated late fine settings: per-day fine set to ₹15, flat fine set to ₹150.',
        createdAt: new Date(Date.now() - 1000 * 60 * 10) // 10 minutes ago
      },
      {
        userId: admin.id,
        action: 'DISBURSE_SALARY',
        details: 'Approved and paid salary of ₹45,000 to teacher Sanjay Sir (teacher1) for May 2026. Transaction ID: TXN987654321.',
        createdAt: new Date(Date.now() - 1000 * 60 * 45) // 45 minutes ago
      },
      {
        userId: admin.id,
        action: 'VERIFY_STUDENT_PROFILE',
        details: 'Verified enrollment documents and profile for student Rohan Sharma (student1).',
        createdAt: new Date(Date.now() - 1000 * 60 * 120) // 2 hours ago
      },
      {
        userId: admin.id,
        action: 'ASSIGN_FEE_RECORD',
        details: 'Generated May 2026 monthly fee invoices for Grade 10 - Alpha Batch.',
        createdAt: new Date(Date.now() - 1000 * 60 * 360) // 6 hours ago
      },
      {
        userId: admin.id,
        action: 'CREATE_USER',
        details: 'Created new teacher account: teacher2 (Meera Patel).',
        createdAt: new Date(Date.now() - 1000 * 60 * 1440) // 1 day ago
      },
      {
        userId: admin.id,
        action: 'CREATE_BATCH',
        details: 'Initialized new academic batch: Grade 9 - Beta Science.',
        createdAt: new Date(Date.now() - 1000 * 60 * 2880) // 2 days ago
      },
      {
        userId: admin.id,
        action: 'UPDATE_SETTINGS',
        details: 'Updated Razorpay integration credentials.',
        createdAt: new Date(Date.now() - 1000 * 60 * 4320) // 3 days ago
      },
      {
        userId: admin.id,
        action: 'VERIFY_STUDENT_PROFILE',
        details: 'Verified student onboarding details for Rohan Sharma.',
        createdAt: new Date(Date.now() - 1000 * 60 * 5760) // 4 days ago
      }
    ];

    // Delete existing activity logs to start fresh or keep them and append
    await prisma.activityLog.deleteMany({
      where: { userId: admin.id }
    });

    for (const act of activities) {
      await prisma.activityLog.create({
        data: act
      });
    }

    console.log('Successfully seeded 8 highly realistic Admin Activity Logs!');
  } catch (error) {
    console.error('Error seeding activities:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
