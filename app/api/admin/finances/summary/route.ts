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

    const now = new Date();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthName = now.toLocaleString('en-US', { month: 'long' });

    const currentMonthShort = now.toLocaleString('en-US', { month: 'short' });

    // Parallelize all financial queries to drastically minimize database round-trip times
    const [payments, expenses, pendingAggregateResult, currentMonthFees] = await Promise.all([
      withDbRetry(() => prisma.payment.findMany({
        where: {
          status: { in: ['PAID', 'VERIFIED', 'PAID_ONLINE'] }
        },
        select: { paidAmount: true, paidAt: true, createdAt: true, amount: true, lateFine: true, discount: true }
      })).catch((err) => { console.error('Error fetching paid payments:', err); return []; }),
      withDbRetry(() => prisma.expense.findMany({
        select: { amount: true, date: true, createdAt: true }
      })).catch((err) => { console.error('Error fetching expenses:', err); return []; }),
      withDbRetry(() => prisma.payment.aggregate({
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
      })).catch((err) => { console.error('Error aggregating pending payments:', err); return { _sum: {} }; }),
      withDbRetry(() => prisma.payment.findMany({
        where: {
          OR: [
            { billingMonth: { contains: currentMonthName, mode: 'insensitive' } },
            { billingMonth: { contains: currentMonthShort, mode: 'insensitive' } },
            { createdAt: { gte: startOfCurrentMonth } },
            { paidAt: { gte: startOfCurrentMonth } }
          ]
        },
        select: { amount: true, paidAmount: true, lateFine: true, discount: true, status: true }
      })).catch((err) => { console.error('Error fetching current month fees:', err); return []; })
    ]);

    const totalRevenue = payments.reduce((acc: number, p: any) => {
      const amt = p.paidAmount ?? (p.amount + (p.lateFine || 0) - (p.discount || 0));
      return acc + (amt || 0);
    }, 0);

    const totalExpenses = expenses.reduce((acc: number, e: any) => acc + (e.amount || 0), 0);

    const currentMonthCollected = currentMonthFees.reduce((acc: number, f: any) => {
      if (['PAID', 'VERIFIED', 'PAID_ONLINE'].includes(f.status)) {
        return acc + (f.paidAmount ?? (f.amount + (f.lateFine || 0) - (f.discount || 0)));
      }
      return acc + (f.paidAmount || 0);
    }, 0);

    const currentMonthPending = currentMonthFees.reduce((acc: number, f: any) => {
      if (['PAID', 'VERIFIED', 'PAID_ONLINE'].includes(f.status)) return acc;
      return acc + Math.max(0, (f.amount || 0) + (f.lateFine || 0) - (f.discount || 0) - (f.paidAmount || 0));
    }, 0);

    // Sum the actual outstanding balance of all pending/partially paid payments
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

    payments.forEach((p: any) => {
      const d = p.paidAt ? new Date(p.paidAt) : (p.createdAt ? new Date(p.createdAt) : null);
      if (!d || isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const entry = monthStatsMap.get(key);
      if (entry) {
        entry.revenue += (p.paidAmount ?? (p.amount + (p.lateFine || 0) - (p.discount || 0)));
      }
    });

    expenses.forEach((e: any) => {
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

    return NextResponse.json({
      totalRevenue,
      totalExpenses,
      totalPending,
      currentMonthCollected,
      currentMonthPending,
      netProfit: totalRevenue - totalExpenses,
      monthlyData
    }, {
      headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
    });
  } catch (error) {
    console.error('Error fetching finance summary:', error);
    return NextResponse.json({ error: 'Failed to fetch financial stats' }, { status: 500 });
  }
}
