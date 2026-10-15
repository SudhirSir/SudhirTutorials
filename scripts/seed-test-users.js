/**
 * Seed Test Users Script
 * Creates dedicated, collision-free test accounts for all roles:
 * - Admin (TEST_ADMIN)
 * - Teacher (TEST_TEACHER)
 * - Class 10th Student (TEST_STU_10)
 * - Class 12th Student (TEST_STU_12)
 * - Store / Online Buyer Student (TEST_STORE)
 *
 * Characteristics:
 * - Prefixed with 'TEST_' so they never clash with real users
 * - Fake 99999xxxx phones and test.*@test.sudhirtutorials.me emails
 * - 'onboardingCompleted: true', 'mustChangePassword: false', 'isProfileVerified: true'
 *   so you immediately enter the dashboard upon login without setup roadblocks.
 * - Uses upsert so it is safe to run multiple times without duplicating data.
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const DEFAULT_PASSWORD = 'Test@12345';

async function main() {
  console.log('🚀 Generating/updating isolated test accounts...');
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  // 1. TEST ADMIN
  const admin = await prisma.user.upsert({
    where: { username: 'TEST_ADMIN' },
    update: {
      name: '[TEST] Admin User',
      passwordHash,
      role: 'ADMIN',
      isActive: true,
      mustChangePassword: false,
      onboardingCompleted: true,
      isProfileVerified: true,
      isStoreUser: false,
    },
    create: {
      username: 'TEST_ADMIN',
      name: '[TEST] Admin User',
      passwordHash,
      role: 'ADMIN',
      isActive: true,
      mustChangePassword: false,
      onboardingCompleted: true,
      isProfileVerified: true,
      isStoreUser: false,
    },
  });
  console.log(`✅ Admin ready: username="${admin.username}", password="${DEFAULT_PASSWORD}"`);

  // 2. TEST TEACHER
  const teacher = await prisma.user.upsert({
    where: { username: 'TEST_TEACHER' },
    update: {
      name: '[TEST] Demo Teacher',
      passwordHash,
      role: 'TEACHER',
      isActive: true,
      mustChangePassword: false,
      onboardingCompleted: true,
      isProfileVerified: true,
      isStoreUser: false,
    },
    create: {
      username: 'TEST_TEACHER',
      name: '[TEST] Demo Teacher',
      passwordHash,
      role: 'TEACHER',
      isActive: true,
      mustChangePassword: false,
      onboardingCompleted: true,
      isProfileVerified: true,
      isStoreUser: false,
    },
  });

  await prisma.teacherProfile.upsert({
    where: { userId: teacher.id },
    update: {
      subject: 'Science & Mathematics',
      email: 'test.teacher@test.sudhirtutorials.me',
      emailVerified: true,
      phone: '9999900001',
    },
    create: {
      userId: teacher.id,
      subject: 'Science & Mathematics',
      email: 'test.teacher@test.sudhirtutorials.me',
      emailVerified: true,
      phone: '9999900001',
    },
  });
  console.log(`✅ Teacher ready: username="${teacher.username}", password="${DEFAULT_PASSWORD}"`);

  // 3. TEST STUDENT - CLASS 10 CBSE
  const student10 = await prisma.user.upsert({
    where: { username: 'TEST_STU_10' },
    update: {
      name: '[TEST] Class 10 Student',
      passwordHash,
      role: 'STUDENT',
      isActive: true,
      mustChangePassword: false,
      onboardingCompleted: true,
      isProfileVerified: true,
      isStoreUser: false,
    },
    create: {
      username: 'TEST_STU_10',
      name: '[TEST] Class 10 Student',
      passwordHash,
      role: 'STUDENT',
      isActive: true,
      mustChangePassword: false,
      onboardingCompleted: true,
      isProfileVerified: true,
      isStoreUser: false,
    },
  });

  await prisma.studentProfile.upsert({
    where: { userId: student10.id },
    update: {
      className: '10th',
      board: 'CBSE',
      rollNumber: 'TEST-10-001',
      registrationNo: 'REG-TEST-10',
      email: 'test.stu10@test.sudhirtutorials.me',
      emailVerified: true,
      phone: '9999900010',
      fatherName: 'Test Parent 10',
      parentContact: '9999900011',
      address: 'Test City, Demo Address',
    },
    create: {
      userId: student10.id,
      className: '10th',
      board: 'CBSE',
      rollNumber: 'TEST-10-001',
      registrationNo: 'REG-TEST-10',
      email: 'test.stu10@test.sudhirtutorials.me',
      emailVerified: true,
      phone: '9999900010',
      fatherName: 'Test Parent 10',
      parentContact: '9999900011',
      address: 'Test City, Demo Address',
    },
  });
  console.log(`✅ Student (Class 10 CBSE) ready: username="${student10.username}", password="${DEFAULT_PASSWORD}"`);

  // 4. TEST STUDENT - CLASS 12 CBSE
  const student12 = await prisma.user.upsert({
    where: { username: 'TEST_STU_12' },
    update: {
      name: '[TEST] Class 12 Student',
      passwordHash,
      role: 'STUDENT',
      isActive: true,
      mustChangePassword: false,
      onboardingCompleted: true,
      isProfileVerified: true,
      isStoreUser: false,
    },
    create: {
      username: 'TEST_STU_12',
      name: '[TEST] Class 12 Student',
      passwordHash,
      role: 'STUDENT',
      isActive: true,
      mustChangePassword: false,
      onboardingCompleted: true,
      isProfileVerified: true,
      isStoreUser: false,
    },
  });

  await prisma.studentProfile.upsert({
    where: { userId: student12.id },
    update: {
      className: '12th',
      board: 'CBSE',
      rollNumber: 'TEST-12-001',
      registrationNo: 'REG-TEST-12',
      email: 'test.stu12@test.sudhirtutorials.me',
      emailVerified: true,
      phone: '9999900012',
      fatherName: 'Test Parent 12',
      parentContact: '9999900013',
      address: 'Test City, Demo Address',
    },
    create: {
      userId: student12.id,
      className: '12th',
      board: 'CBSE',
      rollNumber: 'TEST-12-001',
      registrationNo: 'REG-TEST-12',
      email: 'test.stu12@test.sudhirtutorials.me',
      emailVerified: true,
      phone: '9999900012',
      fatherName: 'Test Parent 12',
      parentContact: '9999900013',
      address: 'Test City, Demo Address',
    },
  });
  console.log(`✅ Student (Class 12 CBSE) ready: username="${student12.username}", password="${DEFAULTPASSWORD = 'Test@12345'}"`);

  // 5. TEST STORE USER (Independent Online Buyer)
  const storeUser = await prisma.user.upsert({
    where: { username: 'TEST_STORE' },
    update: {
      name: '[TEST] Online Store Buyer',
      passwordHash,
      role: 'STUDENT',
      isStoreUser: true,
      isActive: true,
      mustChangePassword: false,
      onboardingCompleted: true,
      isProfileVerified: true,
    },
    create: {
      username: 'TEST_STORE',
      name: '[TEST] Online Store Buyer',
      passwordHash,
      role: 'STUDENT',
      isStoreUser: true,
      isActive: true,
      mustChangePassword: false,
      onboardingCompleted: true,
      isProfileVerified: true,
    },
  });

  await prisma.studentProfile.upsert({
    where: { userId: storeUser.id },
    update: {
      email: 'test.store@test.sudhirtutorials.me',
      emailVerified: true,
      phone: '9999900099',
    },
    create: {
      userId: storeUser.id,
      email: 'test.store@test.sudhirtutorials.me',
      emailVerified: true,
      phone: '9999900099',
    },
  });
  console.log(`✅ Store User ready: username="${storeUser.username}", password="${DEFAULT_PASSWORD}"`);

  console.log('\n🎉 All test credentials seeded successfully without interfering with real users!');
}

main()
  .catch((e) => {
    console.error('Error creating test users:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
