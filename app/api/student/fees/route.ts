export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma, withDbRetry } from '@/lib/prisma';
import { calculateLateFine, generateReceiptNo } from '@/lib/feeUtils';
import { getLateFineSettings } from '@/lib/feeSettings';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || (session.user as any).role !== 'STUDENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const studentId = (session.user as any).id;

    const rawFees = await withDbRetry(() => prisma.payment.findMany({
      where: { studentId },
      include: {
        student: {
          select: {
            name: true,
            username: true,
            studentProfile: {
              select: {
                rollNumber: true,
                registrationNo: true,
                className: true,
                grade: true,
                batch: true,
                phone: true,
                email: true,
                fatherName: true,
                address: true,
                scholarship: true,
              }
            }
          }
        }
      },
      orderBy: { dueDate: 'desc' }
    }));

    const allPayments = await withDbRetry(() => prisma.payment.findMany({
      select: { id: true },
      orderBy: { createdAt: 'asc' }
    }));
    const rankMap = new Map<string, number>();
    allPayments.forEach((p, idx) => rankMap.set(p.id, idx));

    const { perDayFine, flatFineAfter10Days, feeDueDay } = await getLateFineSettings();

    const fees = rawFees.map((fee: any) => {
      const effectiveDueDate = fee.dueDate;

      const now = new Date();
      const due = effectiveDueDate;
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
      const daysLate = Math.floor((today.getTime() - dueDay.getTime()) / (1000 * 60 * 60 * 24));

      const currentFine = fee.status === 'PENDING'
        ? calculateLateFine(effectiveDueDate, fee.status, perDayFine, flatFineAfter10Days)
        : fee.lateFine;

      const scholarship = fee.student?.studentProfile?.scholarship || 0;
      const effectiveDiscount = Math.max(fee.discount, scholarship);
      
      let receiptNo = '-';
      if (['PAID', 'VERIFIED', 'PAID_ONLINE'].includes(fee.status)) {
        const rank = rankMap.get(fee.id) ?? 0;
        const serial = 1001 + rank;
        receiptNo = generateReceiptNo(fee, serial);
      }

      return {
        ...fee,
        discount: effectiveDiscount,
        daysLate: daysLate > 0 ? daysLate : 0,
        lateFine: currentFine,
        currentLateFine: currentFine,
        totalAmount: fee.amount + currentFine - effectiveDiscount + fee.previousBalance,
        receiptNo
      };
    });

    return NextResponse.json({ fees });
  } catch (error) {
    console.error('Error fetching student fees:', error);
    return NextResponse.json({ error: 'Failed to fetch fee data' }, { status: 500 });
  }
}
