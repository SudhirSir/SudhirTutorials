export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma, withDbRetry } from '@/lib/prisma';
import { generateReceiptNo } from '@/lib/feeUtils';
import { appCache } from '@/lib/cache';

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

    const cacheKey = `fee:receipt:${id}`;
    const enrichedFee = await appCache.getOrSet(cacheKey, async () => {
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

      if (!fee) return null;

      let receiptNo = fee.receiptNo;
      if (!receiptNo || typeof receiptNo !== 'string' || receiptNo.trim().length === 0) {
        receiptNo = generateReceiptNo(fee);
        try {
          await withDbRetry(() => prisma.payment.update({
            where: { id: fee.id },
            data: { receiptNo }
          }));
        } catch (err) {
          console.error("Error persisting receiptNo:", err);
        }
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
        where: { studentId: fee.studentId },
        select: {
          id: true,
          amount: true,
          discount: true,
          paidAmount: true,
          lateFine: true,
          status: true,
          billingMonth: true,
          dueDate: true,
          createdAt: true,
        }
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

      return {
        ...fee,
        receiptNo,
        pendingBalance: totalPendingBalanceBeforeCurrent
      };
    }, 20);

    if (!enrichedFee) {
      return NextResponse.json({ error: 'Receipt not found' }, { status: 404 });
    }

    const userRole = (session.user as any).role;
    const userId = (session.user as any).id;
    if (userRole !== 'ADMIN') {
      if (userRole === 'STUDENT') {
        if (enrichedFee.studentId !== userId) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
      } else {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    return NextResponse.json({ fee: enrichedFee });
  } catch (error) {
    console.error('Error fetching receipt data:', error);
    return NextResponse.json({ error: 'Failed to fetch receipt data' }, { status: 500 });
  }
}
