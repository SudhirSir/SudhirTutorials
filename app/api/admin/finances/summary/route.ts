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

    // Parallelize all financial queries to drastically minimize database round-trip times
    const [payments, expenses, pendingAggregateResult, currentMonthFees] = await Promise.all([
      withDbRetry(() => prisma.payment.findMany({
        where: {
          status: { in: ['PAID', 'VERIFIED', 'PAID_ONLINE'] },
          OR: [
            { paidAt: { gte: sixMonthsAgo } },
            { createdAt: { gte: sixMonthsAgo } }
          ]
        },
        select: { paidAmount: true, paidAt: true, createdAt: true, amount: true, lateFine: true, discount: true }
      })),
      withDbRetry(() => prisma.expense.findMany({
        where: { date: { gte: sixMonthsAgo } },
        select: { amount: true, date: true } // Avoid retrieving unnecessary large columns like remarks
      })),
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
      })),
      withDbRetry(() => prisma.payment.findMany({
        where: {
          OR: [
            { billingMonth: { contains: currentMonthName, mode: 'insensitive' } },
            { createdAt: { gte: startOfCurrentMonth } }
          ]
        },
        select: { amount: true, paidAmount: true, lateFine: true, discount: true, status: true }
      }))
    ]);

    const totalRevenue = payments.reduce((acc: number, p: any) => acc + (p.paidAmount || (p.amount + (p.lateFine || 0) - (p.discount || 0))), 0);
    const totalExpenses = expenses.reduce((acc: number, e: any) => acc + e.amount, 0);

    const currentMonthCollected = currentMonthFees.reduce((acc: number, f: any) => {
      if (['PAID', 'VERIFIED', 'PAID_ONLINE'].includes(f.status)) {
        return acc + (f.paidAmount || (f.amount + (f.lateFine || 0) - (f.discount || 0)));
      }
      return acc + (f.paidAmount || 0);
    }, 0);

    const currentMonthPending = currentMonthFees.reduce((acc: number, f: any) => {
      if (['PAID', 'VERIFIED', 'PAID_ONLINE'].includes(f.status)) return acc;
      return acc + Math.max(0, f.amount + (f.lateFine || 0) - (f.discount || 0) - (f.paidAmount || 0));
    }, 0);

    // Sum the actual outstanding balance of all pending/partially paid payments
    const totalPending = Math.max(0,
      (pendingAggregateResult._sum.amount || 0) +
      (pendingAggregateResult._sum.lateFine || 0) -
      (pendingAggregateResult._sum.discount || 0) -
      (pendingAggregateResult._sum.paidAmount || 0)
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
      if (!d) return;
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const entry = monthStatsMap.get(key);
      if (entry) {
        entry.revenue += (p.paidAmount || (p.amount + (p.lateFine || 0) - (p.discount || 0)));
      }
    });

    expenses.forEach((e: any) => {
      if (!e.date) return;
      const d = new Date(e.date);
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
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch financial stats' }, { status: 500 });
  }
}
