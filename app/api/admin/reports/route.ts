export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma, withDbRetry } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Calculate date range for Revenue Trends (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    // Parallelize independent database queries to run concurrently
    const [courseStats, payments, attendanceCounts] = await Promise.all([
      // 1. Enrollment by Course
      withDbRetry(() => prisma.course.findMany({
        select: {
          name: true,
          batches: {
            select: {
              _count: { select: { students: true } }
            }
          }
        }
      })),
      // 2. Revenue Trends (last 6 months)
      withDbRetry(() => prisma.payment.findMany({
        where: {
          status: { in: ['PAID', 'VERIFIED', 'PAID_ONLINE'] },
          createdAt: { gte: sixMonthsAgo }
        },
        select: {
          amount: true,
          createdAt: true
        }
      })),
      // 3. Attendance Overview (Global %) in a single aggregate query
      withDbRetry(async () => {
        const results = await prisma.$queryRaw<any[]>`
          SELECT 
            COUNT(*)::int as "total",
            COUNT(CASE WHEN status = 'PRESENT' THEN 1 END)::int as "present"
          FROM "Attendance"
        `;
        return results[0] || { total: 0, present: 0 };
      })
    ]);

    const totalAttendance = attendanceCounts.total || 0;
    const presentCount = attendanceCounts.present || 0;

    const enrollmentData = courseStats.map((c: any) => ({
      name: c.name,
      students: c.batches.reduce((sum: number, b: any) => sum + b._count.students, 0)
    }));

    // Group by month
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const revenueTrend: Record<string, number> = {};
    
    payments.forEach((p: any) => {
      const m = months[new Date(p.createdAt).getMonth()];
      revenueTrend[m] = (revenueTrend[m] || 0) + p.amount;
    });

    const formattedRevenue = Object.entries(revenueTrend).map(([name, amount]) => ({ name, amount }));

    const attendanceRate = totalAttendance > 0 ? (presentCount / totalAttendance) * 100 : 0;

    return NextResponse.json({
      enrollmentData,
      revenueTrend: formattedRevenue,
      attendanceRate
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to generate reports' }, { status: 500 });
  }
}
