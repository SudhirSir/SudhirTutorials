export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma, withDbRetry } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user || session.user.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const attendanceRecords = await withDbRetry(() => prisma.attendance.findMany({
      where: {
        studentId: session.user.id
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
      orderBy: { date: 'desc' }
    }));

    const totalDays = attendanceRecords.length;
    const presentDays = attendanceRecords.filter((a: any) => a.status === 'PRESENT' || a.status === 'LATE').length;
    const attendancePercent = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 100;

    const enrichedAttendance = attendanceRecords.map((a: any) => {
      const recordDate = new Date(a.date);
      const dayOfWeek = recordDate.getDay();
      const batchSchedules = a.batch?.schedules || [];
      const matchedSchedule = batchSchedules.find((s: any) => s.dayOfWeek === dayOfWeek) || batchSchedules[0];

      const timeStr = matchedSchedule
        ? `${matchedSchedule.startTime} - ${matchedSchedule.endTime}`
        : '5:15 PM - 7:20 PM';

      const subjectStr = matchedSchedule?.subject || a.batch?.subjects || 'General';
      const teacherNames = a.batch?.teachers?.map((t: any) => t.name).filter(Boolean).join(', ') || 'Sudhir Sir';

      return {
        id: a.id,
        date: a.date,
        status: a.status,
        time: timeStr,
        subject: subjectStr,
        teacherName: teacherNames,
        batchName: a.batch?.name || 'Assigned Batch'
      };
    });

    return NextResponse.json({
      attendance: {
        percentage: attendancePercent,
        total: totalDays,
        present: presentDays,
        history: enrichedAttendance
      }
    });
  } catch (error) {
    console.error('Error fetching student attendance:', error);
    return NextResponse.json({ error: 'Failed to fetch attendance' }, { status: 500 });
  }
}
