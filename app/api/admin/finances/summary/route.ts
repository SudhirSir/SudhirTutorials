import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const now = new Date();
    const currentMonth = now.toLocaleString('default', { month: 'long', year: 'numeric' });

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 11); // Get last 12 months for better trend
    sixMonthsAgo.setDate(1);

    // Revenue from verified/paid payments
    const payments = await prisma.payment.findMany({
      where: {
        status: { in: ['PAID', 'VERIFIED', 'PAID_ONLINE'] },
        paidAt: { gte: sixMonthsAgo }
      },
      select: { paidAmount: true, paidAt: true, amount: true, lateFine: true, discount: true }
    });

    // Expenses
    const expenses = await prisma.expense.findMany({
      where: { date: { gte: sixMonthsAgo } }
    });

    const totalRevenue = payments.reduce((acc, p) => acc + (p.paidAmount || (p.amount + (p.lateFine || 0) - (p.discount || 0))), 0);
    const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
    const pendingPayments = await prisma.payment.findMany({
      where: { status: 'PENDING' },
      select: { amount: true }
    });
    const totalPending = pendingPayments.reduce((acc, p) => acc + p.amount, 0);

    // Monthly breakdown (last 6 months)
    const monthlyData = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mName = d.toLocaleString('default', { month: 'long', year: 'numeric' });
      
      const mRevenue = payments
        .filter(p => p.paidAt && new Date(p.paidAt).getMonth() === d.getMonth() && new Date(p.paidAt).getFullYear() === d.getFullYear())
        .reduce((acc, p) => acc + (p.paidAmount || (p.amount + p.lateFine - p.discount)), 0);

      const mExpenses = expenses
        .filter(e => new Date(e.date).getMonth() === d.getMonth() && new Date(e.date).getFullYear() === d.getFullYear())
        .reduce((acc, e) => acc + e.amount, 0);

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
      netProfit: totalRevenue - totalExpenses,
      monthlyData
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch financial stats' }, { status: 500 });
  }
}
