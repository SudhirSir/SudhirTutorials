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
    const currentMonth = now.toLocaleString('default', { month: 'long', year: 'numeric' });

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 11); // Get last 12 months for better trend
    sixMonthsAgo.setDate(1);

    // Parallelize all financial queries to drastically minimize database round-trip times
    const [payments, expenses, pendingAggregate, currentMonthFees] = await Promise.all([
      withDbRetry(() => prisma.payment.findMany({
        where: {
          status: { in: ['PAID', 'VERIFIED', 'PAID_ONLINE'] },
          paidAt: { gte: sixMonthsAgo }
        },
        select: { paidAmount: true, paidAt: true, amount: true, lateFine: true, discount: true }
      })),
      withDbRetry(() => prisma.expense.findMany({
        where: { date: { gte: sixMonthsAgo } },
        select: { amount: true, date: true } // Avoid retrieving unnecessary large columns like remarks
      })),
      withDbRetry(() => prisma.payment.findMany({
        select: { amount: true, paidAmount: true, lateFine: true, discount: true }
      })),
      withDbRetry(() => prisma.payment.findMany({
        where: { billingMonth: currentMonth },
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
      return acc + Math.max(0, f.amount + (f.lateFine || 0) - (f.discount || 0) - (f.paidAmount || 0));
    }, 0);

    // Sum the actual outstanding balance of all pending/partially paid payments
    const totalPending = pendingAggregate.reduce((acc: number, p: any) => {
      const fine = p.lateFine || 0;
      const discount = p.discount || 0;
      const paid = p.paidAmount || 0;
      return acc + Math.max(0, p.amount + fine - discount - paid);
    }, 0);

    // Monthly breakdown (last 6 months)
    const monthlyData = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mName = d.toLocaleString('default', { month: 'long', year: 'numeric' });
      
      const mRevenue = payments
        .filter((p: any) => p.paidAt && new Date(p.paidAt).getMonth() === d.getMonth() && new Date(p.paidAt).getFullYear() === d.getFullYear())
        .reduce((acc: number, p: any) => acc + (p.paidAmount || (p.amount + (p.lateFine || 0) - (p.discount || 0))), 0);

      const mExpenses = expenses
        .filter((e: any) => new Date(e.date).getMonth() === d.getMonth() && new Date(e.date).getFullYear() === d.getFullYear())
        .reduce((acc: number, e: any) => acc + e.amount, 0);

      monthlyData.push({
        name: d.toLocaleString('default', { month: 'short' }),
        revenue: mRevenue,
        expenses: mExpenses,
        profit: mRevenue - mExpenses
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
