import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { calculateLateFine } from '@/lib/feeUtils';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || (session.user as any).role !== 'STUDENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const studentId = (session.user as any).id;

    // Parallelize independent database queries for maximum performance
    const [user, attendanceRecords, testResults] = await Promise.all([
      prisma.user.findUnique({
        where: { id: studentId },
        include: {
          studentBatches: {
            include: {
              course: { select: { name: true } },
              teachers: { select: { name: true } },
              schedules: true
            }
          },
          studentProfile: true,
          payments: {
            orderBy: { dueDate: 'asc' },
            take: 1, // Get the most urgent or recent fee
            where: { status: 'PENDING' }
          }
        }
      }),
      prisma.attendance.findMany({
        where: { studentId },
      }),
      prisma.testResult.findMany({
        where: { studentId },
        include: { test: true }
      })
    ]);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Process fee status for dashboard (simple highlight)
    let feeHighlight = null;
    if (user.payments.length > 0) {
      const pendingPayment = user.payments[0];
      const lateFine = calculateLateFine(pendingPayment.dueDate, pendingPayment.status);
      feeHighlight = {
        amount: pendingPayment.amount + lateFine,
        dueDate: pendingPayment.dueDate,
        isOverdue: lateFine > 0,
        status: pendingPayment.status
      };
    }

    // Calculate dynamic attendance stats
    const totalDays = attendanceRecords.length;
    const presentDays = attendanceRecords.filter((a: any) => a.status === 'PRESENT' || a.status === 'LATE').length;
    const attendancePercent = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 100;

    // Fetch dynamic test results
    const totalTests = testResults.length;
    const totalObtained = testResults.reduce((acc: number, r: any) => acc + r.marks, 0);
    const totalMax = testResults.reduce((acc: number, r: any) => acc + r.totalMarks, 0);
    const averageScore = totalMax > 0 ? Math.round((totalObtained / totalMax) * 100) : null;

    return NextResponse.json({ 
      name: user.name,
      batches: user.studentBatches,
      profile: user.studentProfile,
      feeHighlight,
      attendance: {
        percentage: attendancePercent,
        total: totalDays,
        present: presentDays,
        history: attendanceRecords.slice(-10) // return last 10 records for history view
      },
      testStats: {
        totalTests,
        averageScore,
        results: testResults
      }
    });
  } catch (error) {
    console.error('Error fetching student dashboard:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}
