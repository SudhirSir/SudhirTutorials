export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma, withDbRetry } from '@/lib/prisma';
import { generateReceiptNo } from '@/lib/feeUtils';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const monthName = searchParams.get('month') || new Date().toLocaleString('en-US', { month: 'long' });
    const yearStr = searchParams.get('year') || String(new Date().getFullYear());

    // Fetch all relevant data for the statement in parallel
    const [fees, expenses, salaries] = await Promise.all([
      withDbRetry(() => prisma.payment.findMany({
        where: {
          status: { in: ['PAID', 'VERIFIED', 'PAID_ONLINE'] }
        },
        include: {
          student: {
            select: { name: true, username: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      })).catch((err) => { console.error('Error fetching statement fees:', err); return []; }),

      withDbRetry(() => prisma.expense.findMany({
        orderBy: { date: 'desc' }
      })).catch((err) => { console.error('Error fetching statement expenses:', err); return []; }),

      withDbRetry(() => prisma.salaryRecord.findMany({
        where: { status: 'PAID' },
        include: {
          teacher: {
            select: { name: true, username: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      })).catch((err) => { console.error('Error fetching statement salaries:', err); return []; })
    ]);

    // Filter by requested month and year
    const inflow = fees.filter((f: any) => {
      const rawDate = f.paidAt || f.createdAt;
      if (!rawDate) return false;
      const date = new Date(rawDate);
      if (isNaN(date.getTime())) return false;
      const m = date.toLocaleString('en-US', { month: 'long' });
      const y = String(date.getFullYear());
      return m.toLowerCase() === monthName.toLowerCase() && y === yearStr;
    });

    const outExpenses = expenses.filter((e: any) => {
      const rawDate = e.date || e.createdAt;
      if (!rawDate) return false;
      const date = new Date(rawDate);
      if (isNaN(date.getTime())) return false;
      const m = date.toLocaleString('en-US', { month: 'long' });
      const y = String(date.getFullYear());
      return m.toLowerCase() === monthName.toLowerCase() && y === yearStr;
    });

    const outSalaries = salaries.filter((s: any) => {
      const rawDate = s.paidAt || s.createdAt;
      if (!rawDate) return false;
      const date = new Date(rawDate);
      if (isNaN(date.getTime())) return false;
      const m = date.toLocaleString('en-US', { month: 'long' });
      const y = String(date.getFullYear());
      return m.toLowerCase() === monthName.toLowerCase() && y === yearStr;
    });

    const totalInflow = inflow.reduce((sum: number, f: any) => {
      const val = f.paidAmount ?? (f.amount + (f.lateFine || 0) - (f.discount || 0));
      return sum + (val || 0);
    }, 0);

    const totalExpenses = outExpenses.reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
    const totalSalaries = outSalaries.reduce((sum: number, s: any) => sum + (s.netPaid || 0), 0);
    const netBalance = totalInflow - (totalExpenses + totalSalaries);

    const ledgerData = [
      ...inflow.map((f: any) => {
        const d = f.paidAt ? new Date(f.paidAt) : new Date(f.createdAt);
        return {
          id: f.id,
          date: d.toISOString(),
          ref: f.receiptNo || generateReceiptNo(f),
          desc: `Fee Collected - ${f.student?.name || 'Student'} (${f.student?.username || 'N/A'}) - ${f.billingMonth || ''} [${f.title || 'Fee'}]`,
          type: 'FEE_INFLOW',
          inflow: f.paidAmount ?? (f.amount + (f.lateFine || 0) - (f.discount || 0)),
          outflow: 0
        };
      }),
      ...outExpenses.map((e: any) => {
        const d = new Date(e.date || e.createdAt);
        return {
          id: e.id,
          date: d.toISOString(),
          ref: `EXP-${e.id.slice(-6).toUpperCase()}`,
          desc: `Administrative Expense - ${e.title || 'Expense'} (${e.category || 'OTHER'})${e.remarks ? ' - ' + e.remarks : ''}`,
          type: 'EXPENSE_OUTFLOW',
          inflow: 0,
          outflow: e.amount || 0
        };
      }),
      ...outSalaries.map((s: any) => {
        const d = new Date(s.paidAt || s.createdAt);
        return {
          id: s.id,
          date: d.toISOString(),
          ref: `SAL-${s.id.slice(-6).toUpperCase()}`,
          desc: `Salary Disbursed - ${s.teacher?.name || 'Faculty Member'} - ${s.month || ''}`,
          type: 'SALARY_OUTFLOW',
          inflow: 0,
          outflow: s.netPaid || 0
        };
      })
    ].sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return NextResponse.json({
      month: monthName,
      year: yearStr,
      totalInflow,
      totalExpenses,
      totalSalaries,
      netBalance,
      ledgerData
    }, {
      headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
    });
  } catch (error) {
    console.error('Error fetching monthly statement:', error);
    return NextResponse.json({ error: 'Failed to fetch statement' }, { status: 500 });
  }
}
