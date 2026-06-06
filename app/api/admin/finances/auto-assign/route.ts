import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma, withDbRetry } from '@/lib/prisma';

// Helper to format months
const MONTHS_LIST = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

// GET: Preview automated billing status for the selected or current month
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const now = new Date();
    const currentMonthName = MONTHS_LIST[now.getMonth()];
    const currentYear = now.getFullYear();
    const billingMonth = searchParams.get('billingMonth') || `${currentMonthName} ${currentYear}`;

    // Get active students
    const students = await withDbRetry(() => prisma.user.findMany({
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
        },
        studentBatches: {
          select: {
            defaultFee: true
          }
        }
      }
    }));

    // Check how many already have billing for this month
    const existingBills = await withDbRetry(() => prisma.payment.findMany({
      where: {
        billingMonth,
        title: { startsWith: 'Monthly Tuition Fee' }
      },
      select: {
        studentId: true,
        amount: true
      }
    }));

    const alreadyBilledIds = new Set(existingBills.map(b => b.studentId));

    const preview = students.map(s => {
      const isBilled = alreadyBilledIds.has(s.id);
      let calculatedBaseFee = 2500;
      if (s.studentProfile) {
        const baseFeeVal = s.studentProfile.baseFee;
        if (baseFeeVal === null || baseFeeVal === undefined) {
          calculatedBaseFee = 2500;
        } else if (baseFeeVal > 0) {
          calculatedBaseFee = baseFeeVal;
        } else {
          // baseFee is explicitly 0
          const batchFees = s.studentBatches?.map(b => b.defaultFee || 0).filter(f => f > 0) || [];
          if (batchFees.length > 0) {
            calculatedBaseFee = Math.max(...batchFees);
          } else {
            calculatedBaseFee = 0;
          }
        }
      } else {
        // No profile, fallback to 2500
        calculatedBaseFee = 2500;
      }

      return {
        id: s.id,
        name: s.name || 'Unnamed Student',
        username: s.username,
        class: s.studentProfile?.className || 'Unassigned',
        baseFee: calculatedBaseFee,
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
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
    const students = await withDbRetry(() => prisma.user.findMany({
      where: { role: 'STUDENT' },
      select: {
        id: true,
        name: true,
        username: true,
        studentProfile: {
          select: {
            baseFee: true
          }
        },
        studentBatches: {
          select: {
            defaultFee: true
          }
        }
      }
    }));

    let createdCount = 0;
    let skippedCount = 0;

    for (const student of students) {
      // Check for duplicate billing record for this student and month
      const existing = await withDbRetry(() => prisma.payment.findFirst({
        where: {
          studentId: student.id,
          billingMonth,
          title: `Monthly Tuition Fee - ${billingMonth}`
        }
      }));

      if (existing) {
        skippedCount++;
        continue;
      }

      // Automatically calculate fee using student's baseFee, fallback to default 2500 if unset
      let finalAmount = 2500;
      if (student.studentProfile) {
        const baseFeeVal = student.studentProfile.baseFee;
        if (baseFeeVal === null || baseFeeVal === undefined) {
          finalAmount = 2500;
        } else if (baseFeeVal > 0) {
          finalAmount = baseFeeVal;
        } else {
          // baseFee is explicitly 0
          const batchFees = student.studentBatches?.map(b => b.defaultFee || 0).filter(f => f > 0) || [];
          if (batchFees.length > 0) {
            finalAmount = Math.max(...batchFees);
          } else {
            finalAmount = 0;
          }
        }
      }

      await withDbRetry(() => prisma.payment.create({
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
      }));

      // Send billing notification to the student
      try {
        await withDbRetry(() => prisma.notification.create({
          data: {
            userId: student.id,
            title: `💳 Monthly Fee Generated: ${billingMonth}`,
            message: `Your monthly tuition fee invoice of ₹${finalAmount.toFixed(0)} has been automatically generated for ${billingMonth}. Please pay online before ${String(dueDate.getDate()).padStart(2, '0')}/${String(dueDate.getMonth() + 1).padStart(2, '0')}/${dueDate.getFullYear()} to avoid late fines.`,
            type: 'FEE',
            isRead: false
          }
        }));
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
