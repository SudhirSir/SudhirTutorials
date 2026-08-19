export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { prisma, withDbRetry } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

let cachedOverviewStats: { timestamp: number; data: any } | null = null;
const CACHE_TTL_MS = 1500; // 1.5s in-memory cache for ultra responsive 2.5s polling

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const forceRefresh = searchParams.get('fresh') === 'true';
    const nowTs = Date.now();

    if (!forceRefresh && cachedOverviewStats && (nowTs - cachedOverviewStats.timestamp < CACHE_TTL_MS)) {
      return NextResponse.json(cachedOverviewStats.data, {
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
      });
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthName = now.toLocaleString('en-US', { month: 'long' });
    const monthShort = now.toLocaleString('en-US', { month: 'short' });

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
        prisma.user.count({
          where: {
            role: 'STUDENT',
            NOT: { isStoreUser: true }
          }
        }),

        prisma.user.count({
          where: {
            role: 'TEACHER',
            NOT: { isStoreUser: true }
          }
        }),

        prisma.batch.count(),
        prisma.course.count(),

        prisma.payment.findMany({
          where: {
            OR: [
              { paidAt: { gte: startOfMonth } },
              { createdAt: { gte: startOfMonth } },
              { billingMonth: { contains: monthName, mode: 'insensitive' } },
              { billingMonth: { contains: monthShort, mode: 'insensitive' } }
            ]
          },
          select: { paidAmount: true, amount: true, lateFine: true, discount: true, status: true }
        }),

        prisma.payment.findMany({
          where: {
            NOT: {
              status: { in: ['PAID', 'VERIFIED', 'PAID_ONLINE'] }
            }
          },
          select: { amount: true, lateFine: true, discount: true, paidAmount: true }
        }),

        prisma.studentProfile.groupBy({
          by: ['className'],
          _count: { userId: true },
          where: { className: { not: null } }
        })
      ]);

      const revenueThisMonth = currentMonthFees.reduce((sum, f) => {
        if (['PAID', 'VERIFIED', 'PAID_ONLINE'].includes(f.status)) {
          const effectivePaid = f.paidAmount ?? (f.amount + (f.lateFine || 0) - (f.discount || 0));
          return sum + effectivePaid;
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

    // Merge with previous cached non-zero data if any field returned 0 spuriously
    const prevData = cachedOverviewStats?.data;
    const payload = {
      totalStudents: statsResult?.totalStudents || prevData?.totalStudents || 0,
      totalTeachers: statsResult?.totalTeachers || prevData?.totalTeachers || 0,
      totalBatches: statsResult?.totalBatches || prevData?.totalBatches || 0,
      totalCourses: statsResult?.totalCourses || prevData?.totalCourses || 0,
      classStats: (statsResult?.classStats && statsResult.classStats.length > 0) ? statsResult.classStats : (prevData?.classStats || []),
      revenueThisMonth: statsResult?.revenueThisMonth || prevData?.revenueThisMonth || 0,
      pendingDues: statsResult?.pendingDues || prevData?.pendingDues || 0,
      activityLogs: []
    };

    if (payload.totalStudents > 0 || payload.totalTeachers > 0 || payload.revenueThisMonth > 0) {
      cachedOverviewStats = { timestamp: nowTs, data: payload };
    }

    return NextResponse.json(payload, {
      headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
    });
  } catch (error) {
    console.error('Error fetching overview stats:', error);
    if (cachedOverviewStats?.data) {
      return NextResponse.json(cachedOverviewStats.data, {
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
      });
    }
    return NextResponse.json({ error: 'Failed to fetch overview data' }, { status: 500 });
  }
}
