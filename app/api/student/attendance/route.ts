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
      const daySchedules = batchSchedules.filter((s: any) => (s.dayOfWeek % 7) === dayOfWeek);
      const activeSchedules = daySchedules.length > 0 ? daySchedules : batchSchedules;

      // 1. Time range: From first class start to last class end of the day
      let timeStr = '5:15 PM - 7:20 PM';
      if (activeSchedules.length > 0) {
        const sorted = [...activeSchedules].sort((x: any, y: any) => (x.startTime || '').localeCompare(y.startTime || ''));
        const startTime = sorted[0]?.startTime || '5:15 PM';
        const endTime = sorted[sorted.length - 1]?.endTime || '7:20 PM';
        timeStr = `${startTime} - ${endTime}`;
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
