const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  try {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('password123', salt);

    // 1. Create Course
    const course = await prisma.course.create({
      data: {
        name: 'Science & Mathematics',
        description: 'Comprehensive tuition for Grade 10 Science & Mathematics'
      }
    });
    console.log('Created Course:', course.name);

    // 2. Create Teacher
    const teacher = await prisma.user.create({
      data: {
        username: 'teacher1',
        name: 'Sanjay Sir',
        passwordHash: passwordHash,
        role: 'TEACHER',
        onboardingCompleted: true,
        isProfileVerified: true,
        mustChangePassword: false,
        teacherProfile: {
          create: {
            subject: 'Science',
            email: 'sanjay.sir@sudhirtutorials.com',
            phone: '9876543210',
            address: '12, Gokul Nagar, Thane East, Mumbai',
            dob: '1985-05-15',
            qualification: 'M.Sc. in Physics, B.Ed.',
            experience: '12 Years',
            salary: 45000
          }
        }
      }
    });
    console.log('Created Teacher:', teacher.name);

    // 3. Create Student
    const student = await prisma.user.create({
      data: {
        username: 'student1',
        name: 'Rohan Sharma',
        passwordHash: passwordHash,
        role: 'STUDENT',
        onboardingCompleted: true,
        isProfileVerified: true,
        mustChangePassword: false,
        studentProfile: {
          create: {
            rollNumber: 'STU-101',
            registrationNo: 'REG2026101',
            grade: '10th',
            className: '10th',
            batch: 'Grade 10 - Alpha Batch',
            school: 'St. Xavier High School',
            email: 'rohan.sharma@gmail.com',
            phone: '9123456780',
            fatherName: 'Alok Sharma',
            parentContact: '9123456781',
            address: 'Flat 402, Shiv Shakti Tower, Thane West, Mumbai',
            baseFee: 3000,
            dob: '2011-08-12',
            photoUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&h=200&fit=crop'
          }
        }
      }
    });
    console.log('Created Student:', student.name);

    // 4. Create Batch
    const batch = await prisma.batch.create({
      data: {
        name: 'Grade 10 - Alpha Batch',
        className: '10th',
        subjects: 'Physics, Chemistry, Maths',
        defaultFee: 3000,
        courseId: course.id,
        teachers: { connect: { id: teacher.id } },
        students: { connect: { id: student.id } }
      }
    });
    console.log('Created Batch:', batch.name);

    // 5. Create Schedules
    await prisma.schedule.createMany({
      data: [
        {
          batchId: batch.id,
          dayOfWeek: 1, // Monday
          startTime: '17:00',
          endTime: '18:30',
          room: 'Classroom A'
        },
        {
          batchId: batch.id,
          dayOfWeek: 3, // Wednesday
          startTime: '17:00',
          endTime: '18:30',
          room: 'Classroom A'
        },
        {
          batchId: batch.id,
          dayOfWeek: 5, // Friday
          startTime: '17:00',
          endTime: '18:30',
          room: 'Classroom B'
        }
      ]
    });
    console.log('Created Schedules for Batch');

    // 6. Create Attendance
    await prisma.attendance.createMany({
      data: [
        {
          batchId: batch.id,
          studentId: student.id,
          date: new Date('2026-05-11'),
          status: 'PRESENT'
        },
        {
          batchId: batch.id,
          studentId: student.id,
          date: new Date('2026-05-13'),
          status: 'PRESENT'
        },
        {
          batchId: batch.id,
          studentId: student.id,
          date: new Date('2026-05-15'),
          status: 'LATE'
        }
      ]
    });
    console.log('Created Attendance Records');

    // 7. Create Test & Results
    const test = await prisma.test.create({
      data: {
        title: 'Physics Chapter 1 Test',
        courseId: course.id,
        date: new Date('2026-05-14T10:00:00Z')
      }
    });
    await prisma.testResult.create({
      data: {
        testId: test.id,
        studentId: student.id,
        marks: 85,
        totalMarks: 100,
        remarks: 'Excellent understanding of Mechanics'
      }
    });
    console.log('Created Test & Test Results');

    // 8. Create Payment
    await prisma.payment.create({
      data: {
        studentId: student.id,
        title: 'May 2026 Monthly Tuition Fee',
        billingMonth: 'May 2026',
        dueDate: new Date('2026-05-25'),
        amount: 3000,
        discount: 0,
        lateFine: 0,
        status: 'PENDING'
      }
    });
    console.log('Created Payment Record');

    console.log('\nSeeding completed successfully!');
    console.log('Student Username: student1 | Password: password123');
    console.log('Teacher Username: teacher1 | Password: password123');

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
