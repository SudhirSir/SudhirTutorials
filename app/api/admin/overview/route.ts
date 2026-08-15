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

    const statsResult = await withDbRetry(async () => {
      const [
        totalStudents,
        totalTeachers,
        totalBatches,
        totalCourses,
        paymentsThisMonth,
        pendingDuesAggregate,
        classGroups
      ] = await Promise.all([
        prisma.user.count({ where: { role: 'STUDENT', isStoreUser: false } }),
        prisma.user.count({ where: { role: 'TEACHER', isStoreUser: false } }),
        prisma.batch.count(),
        prisma.course.count(),
        prisma.payment.aggregate({
          _sum: { paidAmount: true },
          where: {
            status: { in: ['PAID', 'VERIFIED', 'PAID_ONLINE'] },
            paidAt: { gte: startOfMonth }
          }
        }),
        prisma.payment.aggregate({
          _sum: {
            amount: true,
            lateFine: true,
            discount: true,
            paidAmount: true,
          },
          where: {
            NOT: {
              status: { in: ['PAID', 'VERIFIED', 'PAID_ONLINE'] }
            }
          }
        }),
        prisma.studentProfile.groupBy({
          by: ['className'],
          _count: { userId: true },
          where: { className: { not: null } }
        })
      ]);

      const revenueThisMonth = paymentsThisMonth._sum.paidAmount || 0;
      const pendingDues = Math.max(0, 
        (pendingDuesAggregate._sum.amount || 0) + 
        (pendingDuesAggregate._sum.lateFine || 0) - 
        (pendingDuesAggregate._sum.discount || 0) - 
        (pendingDuesAggregate._sum.paidAmount || 0)
      );
      const classStats = classGroups.map(g => ({
        className: g.className || 'Unknown',
        count: g._count.userId || 0
      }));

      return {
        totalStudents,
        totalTeachers,
        totalBatches,
        totalCourses,
        revenueThisMonth,
        pendingDues,
        classStats
      };
    });

    const totalStudents = statsResult?.totalStudents || 0;
    const totalTeachers = statsResult?.totalTeachers || 0;
    const totalBatches = statsResult?.totalBatches || 0;
    const totalCourses = statsResult?.totalCourses || 0;
    const revenueThisMonth = statsResult?.revenueThisMonth || 0;
    const pendingDues = statsResult?.pendingDues || 0;
    const classStats = statsResult?.classStats || [];

    const activityLogs: any[] = [];

    const response = NextResponse.json({
      totalStudents,
      totalTeachers,
      totalBatches,
      totalCourses,
      classStats,
      revenueThisMonth,
      pendingDues,
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
