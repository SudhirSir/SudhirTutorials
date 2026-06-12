export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma, withDbRetry } from '@/lib/prisma';
import { calculateLateFine } from '@/lib/feeUtils';
import { getLateFineSettings } from '@/lib/feeSettings';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || (session.user as any).role !== 'STUDENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const studentId = (session.user as any).id;
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    // Parallelise ALL independent queries — including fee settings that was previously sequential
    const [user, attendanceRecords, testResults, feeSettings] = await Promise.all([
      withDbRetry(() => prisma.user.findUnique({
        where: { id: studentId },
        select: {
          name: true,
          studentBatches: {
            select: {
              id: true,
              name: true,
              className: true,
              subjects: true,
              course: { select: { name: true } },
              teachers: { select: { id: true, name: true } },
              schedules: {
                select: {
                  id: true,
                  dayOfWeek: true,
                  startTime: true,
                  endTime: true,
                  subject: true,
                }
              }
            }
          },
          studentProfile: {
            select: {
              id: true,
              fatherName: true,
              parentContact: true,
              phone: true,
              address: true,
              dob: true,
              photoUrl: true,
              rollNumber: true,
              grade: true,
              scholarship: true,
            }
          },
          payments: {
            orderBy: { dueDate: 'asc' },
            take: 1,
            where: { status: 'PENDING' },
            select: {
              id: true,
              title: true,
              amount: true,
              discount: true,
              dueDate: true,
              status: true,
              paidAmount: true,
              lateFine: true,
              billingMonth: true,
            }
          }
        }
      })),
      // Only last 90 days of attendance to avoid full-table scans
      withDbRetry(() => prisma.attendance.findMany({
        where: {
          studentId,
          date: { gte: ninetyDaysAgo }
        },
        select: { id: true, date: true, status: true },
        orderBy: { date: 'desc' },
        take: 120, // cap at 120 records max
      })),
      // Only recent test results (last 50)
      withDbRetry(() => prisma.testResult.findMany({
        where: { studentId, test: { isPublished: true } },
        select: {
          id: true,
          marks: true,
          totalMarks: true,
          testId: true,
          remarks: true,
          test: { select: { id: true, title: true, subject: true, date: true } }
        },
        orderBy: { id: 'desc' },
        take: 50,
      })),
      // Fee settings fetched in parallel (previously sequential after the DB queries — saves ~200-400ms)
      getLateFineSettings(),
    ]);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Process fee highlight using already-fetched settings
    let feeHighlight = null;
    if (user.payments.length > 0) {
      const pendingPayment = user.payments[0];
      const { perDayFine, flatFineAfter10Days, feeDueDay } = feeSettings;
      const parsed = new Date(`${pendingPayment.billingMonth} ${feeDueDay || 12}`);
      const effectiveDueDate = isNaN(parsed.getTime()) ? pendingPayment.dueDate : parsed;
      const lateFine = calculateLateFine(effectiveDueDate, pendingPayment.status, perDayFine, flatFineAfter10Days);
      const scholarship = user.studentProfile?.scholarship || 0;
      const effectiveDiscount = Math.max(pendingPayment.discount ?? 0, scholarship);
      feeHighlight = {
        ...pendingPayment,
        discount: effectiveDiscount,
        isOverdue: lateFine > 0,
        lateFine,
        currentLateFine: lateFine,
        totalAmount: pendingPayment.amount + lateFine - effectiveDiscount,
      };
    }

    // Calculate dynamic attendance stats
    const totalDays = attendanceRecords.length;
    const presentDays = attendanceRecords.filter((a: any) => a.status === 'PRESENT' || a.status === 'LATE').length;
    const attendancePercent = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 100;

    // Aggregate test results
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
        history: attendanceRecords.slice(0, 10), // last 10 for display
      },
      testStats: {
        totalTests,
        averageScore,
        results: testResults,
      }
    });
  } catch (error) {
    console.error('Error fetching student dashboard:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}
