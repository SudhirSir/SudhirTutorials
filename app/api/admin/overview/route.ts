export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { prisma, withDbRetry } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { appCache } from '@/lib/cache';

const CACHE_KEY = 'admin:overview:stats';
const CACHE_TTL_SECONDS = 60; // 1 minute healthy cache

// Stale memory fallback so dashboard never renders '--' even during transient DB cold-starts
let lastKnownOverviewStats: any = null;

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

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const forceRefresh = searchParams.get('fresh') === 'true';

    if (forceRefresh) {
      appCache.del(CACHE_KEY);
    }

    const payload = await appCache.getOrSet(CACHE_KEY, async () => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthName = now.toLocaleString('en-US', { month: 'long' });
      const monthShort = now.toLocaleString('en-US', { month: 'short' });

      // Run streamlined queries with safe individual fallbacks to prevent cascading pool failures
      const [
        students,
        teacherCount,
        batchCount,
        courseCount,
        payments
      ] = await Promise.all([
        // 1. All students with profile & batch in one query (gives totalStudents + classStats)
        withDbRetry(() => prisma.user.findMany({
          where: { role: 'STUDENT', NOT: { isStoreUser: true } },
          select: {
            id: true,
            studentProfile: { select: { className: true, batch: true, grade: true } },
            studentBatches: { select: { className: true, name: true } }
          }
        })).catch((err) => {
          console.error("Overview students query error:", err);
          return lastKnownOverviewStats ? null : [];
        }),

        // 2. Teacher count
        withDbRetry(() => prisma.user.count({
          where: { role: 'TEACHER', NOT: { isStoreUser: true } }
        })).catch(() => lastKnownOverviewStats?.totalTeachers ?? 0),

        // 3. Batches count
        withDbRetry(() => prisma.batch.count()).catch(() => lastKnownOverviewStats?.totalBatches ?? 0),

        // 4. Courses count
        withDbRetry(() => prisma.course.count()).catch(() => lastKnownOverviewStats?.totalCourses ?? 0),

        // 5. All payments in ONE fast query (gives revenueThisMonth + pendingDues without slow ILIKE regexes)
        withDbRetry(() => prisma.payment.findMany({
          select: {
            amount: true,
            lateFine: true,
            discount: true,
            paidAmount: true,
            status: true,
            paidAt: true,
            createdAt: true,
            billingMonth: true
          }
        })).catch((err) => {
          console.error("Overview payments query error:", err);
          return null;
        })
      ]);

      const totalStudents = students ? students.length : (lastKnownOverviewStats?.totalStudents ?? 0);
      const totalTeachers = teacherCount;
      const totalBatches = batchCount;
      const totalCourses = courseCount;

      // Calculate class distribution
      let classStats = lastKnownOverviewStats?.classStats || [];
      if (Array.isArray(students)) {
        const classCountMap: Record<string, number> = {};
        students.forEach((s: any) => {
          const batchCls = s.studentBatches && s.studentBatches[0] ? (s.studentBatches[0].className || s.studentBatches[0].name) : '';
          const cls = normalizeClassName(s.studentProfile?.className || s.studentProfile?.grade, s.studentProfile?.batch, batchCls);
          classCountMap[cls] = (classCountMap[cls] || 0) + 1;
        });

        classStats = Object.entries(classCountMap)
          .map(([className, count]) => ({ className, count }))
          .sort((a, b) => {
            const idxA = GRADE_ORDER.indexOf(a.className);
            const idxB = GRADE_ORDER.indexOf(b.className);
            if (idxA !== -1 && idxB !== -1) return idxA - idxB;
            if (idxA !== -1) return -1;
            if (idxB !== -1) return 1;
            return a.className.localeCompare(b.className);
          });
      }

      // Calculate finances
      let revenueThisMonth = lastKnownOverviewStats?.revenueThisMonth ?? 0;
      let pendingDues = lastKnownOverviewStats?.pendingDues ?? 0;

      if (Array.isArray(payments)) {
        revenueThisMonth = 0;
        pendingDues = 0;

        for (const p of payments) {
          const isPaid = ['PAID', 'VERIFIED', 'PAID_ONLINE'].includes(p.status);
          const isThisMonth = 
            (p.paidAt && p.paidAt >= startOfMonth) ||
            (p.createdAt && p.createdAt >= startOfMonth) ||
            (p.billingMonth && (
              p.billingMonth.toLowerCase().includes(monthName.toLowerCase()) ||
              p.billingMonth.toLowerCase().includes(monthShort.toLowerCase())
            ));

          if (isPaid) {
            if (isThisMonth) {
              const effectivePaid = p.paidAmount ?? (p.amount + (p.lateFine || 0) - (p.discount || 0));
              revenueThisMonth += effectivePaid;
            }
          } else {
            const net = (p.amount || 0) + (p.lateFine || 0) - (p.discount || 0) - (p.paidAmount || 0);
            pendingDues += Math.max(0, net);
            if (isThisMonth && p.paidAmount && p.paidAmount > 0) {
              revenueThisMonth += p.paidAmount;
            }
          }
        }
      }

      const result = {
        totalStudents,
        totalTeachers,
        totalBatches,
        totalCourses,
        classStats,
        revenueThisMonth,
        pendingDues,
        activityLogs: []
      };

      lastKnownOverviewStats = result;
      return result;
    }, CACHE_TTL_SECONDS);

    return NextResponse.json(payload, {
      headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
    });
  } catch (error) {
    console.error('Error in overview route:', error);
    if (lastKnownOverviewStats) {
      return NextResponse.json(lastKnownOverviewStats, {
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
      });
    }
    const cached = appCache.get(CACHE_KEY);
    if (cached) {
      return NextResponse.json(cached, {
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
      });
    }
    // Return graceful non-empty zero structure so frontend never crashes or shows '--'
    return NextResponse.json({
      totalStudents: 0,
      totalTeachers: 0,
      totalBatches: 0,
      totalCourses: 0,
      classStats: [],
      revenueThisMonth: 0,
      pendingDues: 0,
      activityLogs: []
    });
  }
}
