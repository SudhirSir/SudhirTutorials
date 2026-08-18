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

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthName = now.toLocaleString('en-US', { month: 'long' });

    const statsResult = await withDbRetry(async () => {
      const [
        totalStudents,
        totalTeachers,
        totalBatches,
        totalCourses,
        currentMonthFees,
        pendingPayments,
        classGroups
      ] = await Promise.all([
        prisma.user.count({ where: { role: 'STUDENT', NOT: { isStoreUser: true } } }).catch(() => 0),
        prisma.user.count({ where: { role: 'TEACHER', NOT: { isStoreUser: true } } }).catch(() => 0),
        prisma.batch.count().catch(() => 0),
        prisma.course.count().catch(() => 0),
        prisma.payment.findMany({
          where: {
            OR: [
              { paidAt: { gte: startOfMonth } },
              { createdAt: { gte: startOfMonth } },
              { billingMonth: { contains: monthName, mode: 'insensitive' } }
            ]
          },
          select: { paidAmount: true, amount: true, lateFine: true, discount: true, status: true }
        }).catch(() => []),
        prisma.payment.findMany({
          where: {
            NOT: {
              status: { in: ['PAID', 'VERIFIED', 'PAID_ONLINE'] }
            }
          },
          select: { amount: true, lateFine: true, discount: true, paidAmount: true }
        }).catch(() => []),
        prisma.studentProfile.groupBy({
          by: ['className'],
          _count: { userId: true },
          where: { className: { not: null } }
        }).catch(() => [])
      ]);

      const revenueThisMonth = currentMonthFees.reduce((sum, f) => {
        if (['PAID', 'VERIFIED', 'PAID_ONLINE'].includes(f.status)) {
          return sum + (f.paidAmount || (f.amount + (f.lateFine || 0) - (f.discount || 0)));
        }
        return sum + (f.paidAmount || 0);
      }, 0);

      const pendingDues = pendingPayments.reduce((sum, p) => {
        const net = (p.amount || 0) + (p.lateFine || 0) - (p.discount || 0) - (p.paidAmount || 0);
        return sum + Math.max(0, net);
      }, 0);

      const classStats = classGroups.map(g => ({
        className: g.className || 'Unknown',
        count: g._count?.userId || 0
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
