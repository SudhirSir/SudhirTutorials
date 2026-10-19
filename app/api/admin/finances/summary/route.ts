export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma, withDbRetry } from '@/lib/prisma';
import { appCache } from '@/lib/cache';

const CACHE_KEY = 'admin:finances:summary';
const CACHE_TTL_SECONDS = 20;

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
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1, 0, 0, 0, 0);

    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthName = now.toLocaleString('en-US', { month: 'long' });
    const currentMonthShort = now.toLocaleString('en-US', { month: 'short' });
    const currentYearStr = String(now.getFullYear());

    const isCurrentMonthBilling = (bm?: string | null) => {
      if (!bm) return false;
      const lower = bm.toLowerCase();
      return (lower.includes(currentMonthName.toLowerCase()) || lower.includes(currentMonthShort.toLowerCase())) && lower.includes(currentYearStr);
    };

    // Parallelize all financial queries and wrap atomically with withDbRetry
    const [
      revenueAggregate,
      expenseAggregate,
      pendingAggregateResult,
      currentMonthFees,
      recentPayments,
      recentExpenses
    ] = await withDbRetry(async () => {
      return await Promise.all([
        // 1. Total revenue aggregated directly in PostgreSQL
        prisma.payment.aggregate({
          _sum: {
            paidAmount: true,
            amount: true,
            lateFine: true,
            discount: true
          },
          where: {
            status: { in: ['PAID', 'VERIFIED', 'PAID_ONLINE'] }
          }
        }),

        // 2. Total expenses aggregated directly in PostgreSQL
        prisma.expense.aggregate({
          _sum: {
            amount: true
          }
        }),

        // 3. Pending dues aggregated directly in PostgreSQL
        prisma.payment.aggregate({
          _sum: {
            amount: true,
            paidAmount: true,
            lateFine: true,
            discount: true
          },
          where: {
            NOT: {
              status: { in: ['PAID', 'VERIFIED', 'PAID_ONLINE'] }
            }
          }
        }),

        // 4. Current month fees
        prisma.payment.findMany({
          where: {
            OR: [
              { billingMonth: { contains: currentMonthName, mode: 'insensitive' } },
              { billingMonth: { contains: currentMonthShort, mode: 'insensitive' } },
              { createdAt: { gte: startOfCurrentMonth } },
              { paidAt: { gte: startOfCurrentMonth } }
            ]
          },
          select: { amount: true, paidAmount: true, lateFine: true, discount: true, status: true, billingMonth: true, paidAt: true }
        }),

        // 5. Recent 6 months payments only for chart breakdown (avoids scanning years of data)
        prisma.payment.findMany({
          where: {
            status: { in: ['PAID', 'VERIFIED', 'PAID_ONLINE'] },
            OR: [
              { paidAt: { gte: sixMonthsAgo } },
              { createdAt: { gte: sixMonthsAgo } }
            ]
          },
          select: { paidAmount: true, paidAt: true, createdAt: true, amount: true, lateFine: true, discount: true }
        }),

        // 6. Recent 6 months expenses only for chart breakdown
        prisma.expense.findMany({
          where: {
            OR: [
              { date: { gte: sixMonthsAgo } },
              { createdAt: { gte: sixMonthsAgo } }
            ]
          },
          select: { amount: true, date: true, createdAt: true }
        })
      ]);
    });

    const totalRevenue = (revenueAggregate as any)?._sum?.paidAmount ?? Math.max(0,
      ((revenueAggregate as any)?._sum?.amount || 0) +
      ((revenueAggregate as any)?._sum?.lateFine || 0) -
      ((revenueAggregate as any)?._sum?.discount || 0)
    );

    const totalExpenses = (expenseAggregate as any)?._sum?.amount || 0;

    const currentMonthCollected = currentMonthFees.reduce((acc: number, f: any) => {
      const isPaidThisMonth = f.paidAt && new Date(f.paidAt) >= startOfCurrentMonth;
      const isCurrentMonthInvoice = isCurrentMonthBilling(f.billingMonth);
      if (['PAID', 'VERIFIED', 'PAID_ONLINE'].includes(f.status)) {
        if (isPaidThisMonth || isCurrentMonthInvoice) {
          return acc + (f.paidAmount ?? (f.amount + (f.lateFine || 0) - (f.discount || 0)));
        }
      } else if (isPaidThisMonth) {
        return acc + (f.paidAmount || 0);
      }
      return acc;
    }, 0);

    const currentMonthPending = currentMonthFees.reduce((acc: number, f: any) => {
      if (['PAID', 'VERIFIED', 'PAID_ONLINE'].includes(f.status)) return acc;
      if (isCurrentMonthBilling(f.billingMonth)) {
        return acc + Math.max(0, (f.amount || 0) + (f.lateFine || 0) - (f.discount || 0) - (f.paidAmount || 0));
      }
      return acc;
    }, 0);

    // Sum outstanding balance of all pending/partially paid payments
    const totalPending = Math.max(0,
      ((pendingAggregateResult as any)?._sum?.amount || 0) +
      ((pendingAggregateResult as any)?._sum?.lateFine || 0) -
      ((pendingAggregateResult as any)?._sum?.discount || 0) -
      ((pendingAggregateResult as any)?._sum?.paidAmount || 0)
    );

    // Monthly breakdown (last 6 months) using O(N) Hash Map lookup
    const monthStatsMap = new Map<string, { revenue: number; expenses: number }>();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      monthStatsMap.set(key, { revenue: 0, expenses: 0 });
    }

    recentPayments.forEach((p: any) => {
      const d = p.paidAt ? new Date(p.paidAt) : (p.createdAt ? new Date(p.createdAt) : null);
      if (!d || isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const entry = monthStatsMap.get(key);
      if (entry) {
        entry.revenue += (p.paidAmount ?? (p.amount + (p.lateFine || 0) - (p.discount || 0)));
      }
    });

    recentExpenses.forEach((e: any) => {
      const rawDate = e.date || e.createdAt;
      if (!rawDate) return;
      const d = new Date(rawDate);
      if (isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const entry = monthStatsMap.get(key);
      if (entry) {
        entry.expenses += e.amount;
      }
    });

    const monthlyData = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const entry = monthStatsMap.get(key) || { revenue: 0, expenses: 0 };
      monthlyData.push({
        name: d.toLocaleString('default', { month: 'short' }),
        revenue: entry.revenue,
        expenses: entry.expenses,
        profit: entry.revenue - entry.expenses
      });
    }

    return {
      totalRevenue,
      totalExpenses,
      totalPending,
      currentMonthCollected,
      currentMonthPending,
      netProfit: totalRevenue - totalExpenses,
      monthlyData
    };
  }, CACHE_TTL_SECONDS);

    return NextResponse.json(payload, {
      headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
    });
  } catch (error) {
    console.error('Error fetching finance summary:', error);
    const cached = appCache.get(CACHE_KEY);
    if (cached) {
      return NextResponse.json(cached, {
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
      });
    }
    return NextResponse.json({ error: 'Failed to fetch financial stats' }, { status: 500 });
  }
}
