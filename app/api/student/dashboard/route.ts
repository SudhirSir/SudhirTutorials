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

    // Parallelise ALL independent queries — including fee settings
    const [user, attendanceRecords, testResults, feeSettings] = await Promise.all([
      withDbRetry(() => prisma.user.findUnique({
        where: { id: studentId },
        select: {
          name: true,
          createdAt: true,
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
              className: true,
              batch: true,
            }
          },
          payments: {
            orderBy: { dueDate: 'asc' },
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
      withDbRetry(() => prisma.attendance.findMany({
        where: {
          studentId,
        },
        include: {
          batch: {
            select: {
              id: true,
              name: true,
              className: true,
              subjects: true,
              schedules: {
                select: {
                  dayOfWeek: true,
                  startTime: true,
                  endTime: true,
                  subject: true
                }
              },
              teachers: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        },
        orderBy: { date: 'desc' },
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
      getLateFineSettings(),
    ]);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Process fee highlight to aggregate TOTAL outstanding balance across all pending fees
    let feeHighlight = null;
    if (user.payments.length > 0) {
      const { perDayFine, flatFineAfter10Days } = feeSettings;
      
      let totalOutstandingBalance = 0;
      let hasOverdueFee = false;
      let totalCurrentLateFines = 0;

      user.payments.forEach(payment => {
        const fine = calculateLateFine(payment.dueDate, payment.status, perDayFine, flatFineAfter10Days);
        if (fine > 0) hasOverdueFee = true;
        totalCurrentLateFines += fine;
        const discount = payment.discount ?? 0;
        const netDue = payment.amount + fine - discount - (payment.paidAmount || 0);
        totalOutstandingBalance += Math.max(0, netDue);
      });

      const oldestPayment = user.payments[0];
      const oldestFine = calculateLateFine(oldestPayment.dueDate, oldestPayment.status, perDayFine, flatFineAfter10Days);

      feeHighlight = {
        ...oldestPayment,
        isOverdue: hasOverdueFee,
        currentLateFine: oldestFine,
        totalCurrentLateFines,
        totalAmount: Math.max(0, totalOutstandingBalance),
        pendingMonthsCount: user.payments.length,
      };
    }

    // Calculate dynamic attendance stats
    const totalDays = attendanceRecords.length;
    const presentDays = attendanceRecords.filter((a: any) => a.status === 'PRESENT' || a.status === 'LATE').length;
    const attendancePercent = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 100;

    // Aggregate test results (filtered by student joining date)
    const studentJoinDate = (user as any).createdAt ? new Date((user as any).createdAt) : null;
    const joinDateStart = studentJoinDate ? new Date(studentJoinDate.getFullYear(), studentJoinDate.getMonth(), studentJoinDate.getDate()).getTime() : 0;

    const validTestResults = testResults.filter((tr: any) => {
      if (!joinDateStart || !tr.test?.date) return true;
      return new Date(tr.test.date).getTime() >= joinDateStart;
    });

    const totalTests = validTestResults.length;
    const totalObtained = validTestResults.reduce((acc: number, r: any) => acc + r.marks, 0);
    const totalMax = validTestResults.reduce((acc: number, r: any) => acc + (r.totalMarks || 100), 0);
    const averageScore = totalMax > 0 ? Math.round((totalObtained / totalMax) * 100) : null;

    // Guard against cross-class contamination for timetable & schedules
    let activeBatches = user.studentBatches || [];
    const profClass = (user.studentProfile?.className || '').trim().toLowerCase();
    if (profClass) {
      const is12 = /12|xii/i.test(profClass);
      const is11 = /11|xi/i.test(profClass);
      const is10 = /10|x\b/i.test(profClass);
      const is9 = /9|ix/i.test(profClass);
      const is8 = /8|viii/i.test(profClass);

      const isMismatch = (batchClass: string | null | undefined) => {
        if (!batchClass) return false;
        const bc = batchClass.toLowerCase();
        if (is10 && (/12|xii/i.test(bc) || /11|xi/i.test(bc) || /9|ix/i.test(bc) || /8|viii/i.test(bc))) return true;
        if (is12 && (/10|x\b/i.test(bc) || /11|xi/i.test(bc) || /9|ix/i.test(bc) || /8|viii/i.test(bc))) return true;
        if (is9 && (/12|xii/i.test(bc) || /11|xi/i.test(bc) || /10|x\b/i.test(bc) || /8|viii/i.test(bc))) return true;
        if (is8 && (/12|xii/i.test(bc) || /11|xi/i.test(bc) || /10|x\b/i.test(bc) || /9|ix/i.test(bc))) return true;
        return false;
      };

      activeBatches = activeBatches.filter(b => !isMismatch(b.className));

      // Fallback: If no matching batch connected, find matching batch by profile batch or class
      if (activeBatches.length === 0) {
        const fallbackBatch = await withDbRetry(() => prisma.batch.findFirst({
          where: {
            OR: [
              ...(user.studentProfile?.batch ? [{ name: user.studentProfile.batch }] : []),
              { className: { contains: user.studentProfile?.className || '' } }
            ]
          },
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
        }));
        if (fallbackBatch) {
          activeBatches = [fallbackBatch];
        }
      }
    }

    const enrichedAttendance = attendanceRecords.map((a: any) => {
      const recordDate = new Date(a.date);
      const dayOfWeek = recordDate.getDay();
      const batchSchedules = a.batch?.schedules || [];
      const daySchedules = batchSchedules.filter((s: any) => (s.dayOfWeek % 7) === dayOfWeek);
      const activeSchedules = daySchedules.length > 0 ? daySchedules : batchSchedules;

      // 1. Time range: From first class start to last class end of the day
      let timeStr = 'Scheduled Time';
      if (activeSchedules.length > 0) {
        const sorted = [...activeSchedules].sort((x: any, y: any) => (x.startTime || '').localeCompare(y.startTime || ''));
        const startTime = sorted[0]?.startTime || '';
        const endTime = sorted[sorted.length - 1]?.endTime || '';
        timeStr = startTime && endTime ? `${startTime} - ${endTime}` : (startTime || endTime || 'Scheduled Time');
      }

      // 2. Subjects: Comma separated list of all subjects held on that day
      const daySubjects = activeSchedules.map((s: any) => s.subject).filter(Boolean);
      const uniqueSubjects = Array.from(new Set(daySubjects));
      const subjectStr = uniqueSubjects.length > 0 
        ? uniqueSubjects.join(', ') 
        : (a.batch?.subjects || 'General');

      // 3. Single teacher name who marked attendance
      const singleTeacherName = a.batch?.teachers?.[0]?.name || 'Sudhir Sir';

      return {
        id: a.id,
        date: a.date,
        status: a.status,
        time: timeStr,
        subject: subjectStr,
        teacherName: singleTeacherName,
        batchName: a.batch?.name || 'Assigned Batch'
      };
    });

    return NextResponse.json({
      name: user.name,
      batches: activeBatches,
      profile: user.studentProfile,
      feeHighlight,
      attendance: {
        percentage: attendancePercent,
        total: totalDays,
        present: presentDays,
        history: enrichedAttendance,
      },
      testStats: {
        totalTests,
        averageScore,
        results: validTestResults,
      }
    });
  } catch (error) {
    console.error('Error fetching student dashboard:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}
