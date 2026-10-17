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

        prisma.user.findMany({
          where: {
            role: 'STUDENT',
            NOT: { isStoreUser: true }
          },
          select: {
            studentProfile: {
              select: { className: true, batch: true, grade: true }
            },
            studentBatches: {
              select: { className: true, name: true }
            }
          }
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

      const GRADE_ORDER = [
        'Playgroup', 'Nursery', 'L.K.G', 'U.K.G',
        '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th',
        '11th', '11th (Sci)', '11th (Com)', '12th', '12th (Sci)', '12th (Com)',
        'Other'
      ];

      function normalizeClassName(raw?: string | null, batch?: string | null, batchClass?: string | null): string {
        const val = (raw && raw.trim()) ? raw.trim() : (batch && batch.trim()) ? batch.trim() : (batchClass && batchClass.trim()) ? batchClass.trim() : '';
        if (!val) return 'Other';
        const lower = val.toLowerCase();
        if (lower.includes('u.k.g') || lower.includes('ukg')) return 'U.K.G';
        if (lower.includes('l.k.g') || lower.includes('lkg')) return 'L.K.G';
        if (lower.includes('nursery')) return 'Nursery';
        if (lower.includes('playgroup')) return 'Playgroup';
        if (lower.match(/\b(class\s*)?12(th)?\s*(\(sci|\(science|sci)?/i) && (lower.includes('sci') || lower.includes('zunoon'))) return '12th (Sci)';
        if (lower.match(/\b(class\s*)?12(th)?\s*(\(com|\(commerce|com)?/i) && lower.includes('com')) return '12th (Com)';
        if (lower.match(/\b(class\s*)?12(th)?\b/i) || lower.includes('xii')) return '12th (Sci)';
        if (lower.match(/\b(class\s*)?11(th)?\s*(\(sci|\(science|sci)?/i) && lower.includes('sci')) return '11th (Sci)';
        if (lower.match(/\b(class\s*)?11(th)?\s*(\(com|\(commerce|com)?/i) && lower.includes('com')) return '11th (Com)';
        if (lower.match(/\b(class\s*)?11(th)?\b/i) || lower.includes('xi')) return '11th';
        if (lower.match(/\b(class\s*)?10(th)?\b/i) || lower.includes(' x ') || lower.endsWith(' x') || lower.includes('mission x')) return '10th';
        if (lower.match(/\b(class\s*)?9(th)?\b/i) || lower.includes(' ix') || lower.includes('class ix') || lower === 'ix') return '9th';
        if (lower.match(/\b(class\s*)?8(th)?\b/i) || lower.includes('viii')) return '8th';
        if (lower.match(/\b(class\s*)?7(th)?\b/i) || lower.includes('vii')) return '7th';
        if (lower.match(/\b(class\s*)?6(th)?\b/i) || lower.includes('vi')) return '6th';
        if (lower.match(/\b(class\s*)?5(th)?\b/i) || lower.includes(' v') || lower === 'v') return '5th';
        if (lower.match(/\b(class\s*)?4(th)?\b/i) || lower.includes(' iv') || lower === 'iv') return '4th';
        if (lower.match(/\b(class\s*)?3(rd)?\b/i) || lower.includes('iii')) return '3rd';
        if (lower.match(/\b(class\s*)?2(nd)?\b/i) || lower.includes('ii')) return '2nd';
        if (lower.match(/\b(class\s*)?1(st)?\b/i)) return '1st';
        return val;
      }

      const classCountMap: Record<string, number> = {};
      classGroups.forEach((s: any) => {
        const batchCls = s.studentBatches && s.studentBatches[0] ? (s.studentBatches[0].className || s.studentBatches[0].name) : '';
        const cls = normalizeClassName(s.studentProfile?.className || s.studentProfile?.grade, s.studentProfile?.batch, batchCls);
        classCountMap[cls] = (classCountMap[cls] || 0) + 1;
      });

      const classStats = Object.entries(classCountMap)
        .map(([className, count]) => ({ className, count }))
        .sort((a, b) => {
          const idxA = GRADE_ORDER.indexOf(a.className);
          const idxB = GRADE_ORDER.indexOf(b.className);
          if (idxA !== -1 && idxB !== -1) return idxA - idxB;
          if (idxA !== -1) return -1;
          if (idxB !== -1) return 1;
          return a.className.localeCompare(b.className);
        });

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
