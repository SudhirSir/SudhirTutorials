import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Helper to format months
const MONTHS_LIST = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

// GET: Preview automated billing status for the selected or current month
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const now = new Date();
    const currentMonthName = MONTHS_LIST[now.getMonth()];
    const currentYear = now.getFullYear();
    const billingMonth = searchParams.get('billingMonth') || `${currentMonthName} ${currentYear}`;

    // Get active students
    const students = await prisma.user.findMany({
      where: { role: 'STUDENT' },
      select: {
        id: true,
        name: true,
        username: true,
        studentProfile: {
          select: {
            baseFee: true,
            className: true
          }
        }
      }
    });

    // Check how many already have billing for this month
    const existingBills = await prisma.payment.findMany({
      where: {
        billingMonth,
        title: { startsWith: 'Monthly Tuition Fee' }
      },
      select: {
        studentId: true,
        amount: true
      }
    });

    const alreadyBilledIds = new Set(existingBills.map(b => b.studentId));

    const preview = students.map(s => {
      const isBilled = alreadyBilledIds.has(s.id);
      return {
        id: s.id,
        name: s.name || 'Unnamed Student',
        username: s.username,
        class: s.studentProfile?.className || 'Unassigned',
        baseFee: s.studentProfile?.baseFee || 2500,
        alreadyBilled: isBilled
      };
    });

    return NextResponse.json({
      billingMonth,
      totalActiveStudents: students.length,
      alreadyBilledCount: existingBills.length,
      pendingBillingCount: students.length - existingBills.length,
      preview
    });
  } catch (error) {
    console.error('Error fetching billing preview:', error);
    return NextResponse.json({ error: 'Failed to fetch billing preview status' }, { status: 500 });
  }
}

// POST: Execute the automated monthly billing and calculate student fees
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const now = new Date();
    const currentMonthName = MONTHS_LIST[now.getMonth()];
    const currentYear = now.getFullYear();
    
    // Admin can specify a custom billing month (e.g. "May 2026")
    const billingMonth = body.billingMonth || `${currentMonthName} ${currentYear}`;
    
    // Parse to set due date on the 10th of that month
    const parts = billingMonth.split(' ');
    let parsedYear = currentYear;
    let parsedMonthIndex = now.getMonth();
    if (parts.length === 2) {
      const monthIdx = MONTHS_LIST.findIndex(m => m.toLowerCase() === parts[0].toLowerCase());
      if (monthIdx !== -1) parsedMonthIndex = monthIdx;
      const parsedYr = parseInt(parts[1]);
      if (!isNaN(parsedYr)) parsedYear = parsedYr;
    }
    const dueDate = new Date(parsedYear, parsedMonthIndex, 10); // Due on 10th of billing month

    // Fetch all active students
    const students = await prisma.user.findMany({
      where: { role: 'STUDENT' },
      select: {
        id: true,
        name: true,
        username: true,
        studentProfile: {
          select: {
            baseFee: true
          }
        }
      }
    });

    let createdCount = 0;
    let skippedCount = 0;

    for (const student of students) {
      // Check for duplicate billing record for this student and month
      const existing = await prisma.payment.findFirst({
        where: {
          studentId: student.id,
          billingMonth,
          title: `Monthly Tuition Fee - ${billingMonth}`
        }
      });

      if (existing) {
        skippedCount++;
        continue;
      }

      // Automatically calculate fee using student's baseFee, fallback to default 2500 if unset
      const finalAmount = student.studentProfile?.baseFee || 2500;

      await prisma.payment.create({
        data: {
          studentId: student.id,
          amount: finalAmount,
          billingMonth,
          dueDate,
          title: `Monthly Tuition Fee - ${billingMonth}`,
          status: 'PENDING',
          discount: 0,
          remarks: 'Automated monthly fee assignment'
        }
      });

      // Send billing notification to the student
      try {
        await prisma.notification.create({
          data: {
            userId: student.id,
            title: `💳 Monthly Fee Generated: ${billingMonth}`,
            message: `Your monthly tuition fee invoice of ₹${finalAmount.toFixed(0)} has been automatically generated for ${billingMonth}. Please pay online before ${dueDate.toLocaleDateString()} to avoid late fines.`,
            type: 'FEE',
            isRead: false
          }
        });
      } catch (err) {
        console.error(`Failed to send billing notification for ${student.username}:`, err);
      }

      createdCount++;
    }

    return NextResponse.json({
      success: true,
      billingMonth,
      createdCount,
      skippedCount,
      totalProcessed: students.length
    });
  } catch (error) {
    console.error('Error generating automated billing:', error);
    return NextResponse.json({ error: 'Failed to run automated monthly fee billing' }, { status: 500 });
  }
}
