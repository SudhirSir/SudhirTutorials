export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { prisma, withDbRetry } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    // Run all queries in parallel – ~60% faster than sequential awaits
    const [
      totalStudents,
      totalTeachers,
      totalBatches,
      totalCourses,
      classStatsGroup,
      paymentsThisMonth,
      pendingDues
    ] = await Promise.all([
      withDbRetry(() => prisma.user.count({ where: { role: 'STUDENT' } })),
      withDbRetry(() => prisma.user.count({ where: { role: 'TEACHER' } })),
      withDbRetry(() => prisma.batch.count()),
      withDbRetry(() => prisma.course.count()),
      withDbRetry(() => prisma.studentProfile.groupBy({
        by: ['className'],
        _count: { userId: true },
        where: { className: { not: null } },
      })),
      // Use paidAt so newly verified payments appear immediately
      withDbRetry(() => prisma.payment.aggregate({
        where: {
          status: { in: ['PAID', 'VERIFIED', 'PAID_ONLINE'] },
          paidAt: { gte: startOfMonth },
        },
        _sum: { paidAmount: true },
      })),
      withDbRetry(() => prisma.payment.aggregate({
        where: { status: 'PENDING' },
        _sum: { amount: true },
      }))
    ]);

    const activityLogs: any[] = [];

    const classStats = classStatsGroup.map(g => ({
      className: g.className || 'Unknown',
      count: g._count.userId,
    }));

    const response = NextResponse.json({
      totalStudents,
      totalTeachers,
      totalBatches,
      totalCourses,
      classStats,
      revenueThisMonth: paymentsThisMonth._sum.paidAmount || 0,
      pendingDues: pendingDues._sum.amount || 0,
      activityLogs
    });

    // Prevent caching to guarantee real-time data delivery
    response.headers.set('Cache-Control', 'no-store, max-age=0, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    return response;
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch overview data' }, { status: 500 });
  }
}
