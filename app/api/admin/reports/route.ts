import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Enrollment by Course
    const courseStats = await prisma.course.findMany({
      select: {
        name: true,
        _count: {
          select: {
            batches: {
              // This is a bit complex in Prisma, we'll just sum students in batches
            }
          }
        },
        batches: {
          select: {
            _count: { select: { students: true } }
          }
        }
      }
    });

    const enrollmentData = courseStats.map(c => ({
      name: c.name,
      students: c.batches.reduce((sum, b) => sum + b._count.students, 0)
    }));

    // 2. Revenue Trends (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const payments = await prisma.payment.findMany({
      where: {
        status: { in: ['PAID', 'VERIFIED', 'PAID_ONLINE'] },
        createdAt: { gte: sixMonthsAgo }
      },
      select: {
        amount: true,
        createdAt: true
      }
    });

    // Group by month
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const revenueTrend: Record<string, number> = {};
    
    payments.forEach(p => {
      const m = months[new Date(p.createdAt).getMonth()];
      revenueTrend[m] = (revenueTrend[m] || 0) + p.amount;
    });

    const formattedRevenue = Object.entries(revenueTrend).map(([name, amount]) => ({ name, amount }));

    // 3. Attendance Overview (Global %)
    const totalAttendance = await prisma.attendance.count();
    const presentCount = await prisma.attendance.count({ where: { status: 'PRESENT' } });
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
