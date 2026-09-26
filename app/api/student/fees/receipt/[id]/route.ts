export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma, withDbRetry } from '@/lib/prisma';
import { generateReceiptNo } from '@/lib/feeUtils';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const id = resolvedParams?.id;
    if (!id) {
      return NextResponse.json({ error: 'Missing receipt ID' }, { status: 400 });
    }

    const fee = await withDbRetry(() => prisma.payment.findUnique({
      where: { id },
      include: { 
        student: { 
          select: { 
            name: true, 
            username: true,
            studentProfile: {
              select: {
                className: true,
                grade: true
              }
            }
          } 
        } 
      }
    }));

    if (!fee) return NextResponse.json({ error: 'Receipt not found' }, { status: 404 });

    let receiptNo = fee.receiptNo;
    if (!receiptNo || typeof receiptNo !== 'string' || receiptNo.trim().length === 0) {
      receiptNo = generateReceiptNo(fee);
      // Persist to DB so receipt number is 100% permanent
      withDbRetry(() => prisma.payment.update({
        where: { id: fee.id },
        data: { receiptNo }
      })).catch(err => console.error("Error persisting receiptNo:", err));
    }

    const getPaymentMonthSortKey = (p: any): number => {
      if (p.billingMonth && typeof p.billingMonth === 'string') {
        const bm = p.billingMonth.trim();
        if (/^\d{4}-\d{2}$/.test(bm)) {
          const [y, m] = bm.split('-').map(Number);
          return y * 12 + (m - 1);
        }
        const parts = bm.split(/\s+/);
        if (parts.length >= 2) {
          const monthNames = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
          const shortMonthNames = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
          const mStr = parts[0].toLowerCase();
          const yNum = parseInt(parts[1], 10);
          let mIdx = monthNames.indexOf(mStr);
          if (mIdx === -1) mIdx = shortMonthNames.indexOf(mStr.slice(0, 3));
          if (mIdx !== -1 && !isNaN(yNum)) {
            return yNum * 12 + mIdx;
          }
        }
      }
      if (p.dueDate) {
        const d = new Date(p.dueDate);
        if (!isNaN(d.getTime())) return d.getFullYear() * 12 + d.getMonth();
      }
      if (p.createdAt) {
        const d = new Date(p.createdAt);
        if (!isNaN(d.getTime())) return d.getFullYear() * 12 + d.getMonth();
      }
      return 0;
    };

    const currentFeeMonthSortKey = getPaymentMonthSortKey(fee);

    // Calculate total remaining pending fee balance for student BEFORE current month's fee
    const studentPayments = await withDbRetry(() => prisma.payment.findMany({
      where: { studentId: fee.studentId }
    }));

    const totalPendingBalanceBeforeCurrent = studentPayments.reduce((sum, p) => {
      if (p.id === fee.id) return sum;
      if (['PAID', 'VERIFIED', 'PAID_ONLINE'].includes(p.status)) return sum;
      
      const pMonthSortKey = getPaymentMonthSortKey(p);
      if (pMonthSortKey < currentFeeMonthSortKey) {
        const fine = p.lateFine || 0;
        const rem = Math.max(0, p.amount + fine - (p.discount || 0) - (p.paidAmount || 0));
        return sum + rem;
      }
      return sum;
    }, 0);

    const enrichedFee = {
      ...fee,
      receiptNo,
      pendingBalance: totalPendingBalanceBeforeCurrent
    };

    const userRole = (session.user as any).role;
    const userId = (session.user as any).id;
    if (userRole !== 'ADMIN') {
      if (userRole === 'STUDENT') {
        if (fee.studentId !== userId) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (fee.status !== 'VERIFIED' && fee.status !== 'PAID' && fee.status !== 'PAID_ONLINE') {
          return NextResponse.json({ error: 'Receipt is pending payment or verification from the Admin.' }, { status: 403 });
        }
      } else {
        return NextResponse.json({ error: 'Forbidden: Access Denied' }, { status: 403 });
      }
    }

    return NextResponse.json({ fee: enrichedFee });
  } catch (error: any) {
    console.error('Error fetching receipt:', error);
    return NextResponse.json({ error: error?.message || 'Server error fetching receipt' }, { status: 500 });
  }
}
