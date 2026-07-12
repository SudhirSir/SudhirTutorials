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

    const { perDayFine, flatFineAfter10Days, feeDueDay } = await getLateFineSettings();

    const feeIds = rawFees.map(f => f.id);
    const paymentIndexMap = new Map<string, number>();

    if (feeIds.length > 0) {
      const rowNumbers = await withDbRetry(() => prisma.$queryRaw<Array<{ id: string; rn: bigint | number }>>`
        WITH ordered_payments AS (
          SELECT id, ROW_NUMBER() OVER (ORDER BY "createdAt" ASC) as rn
          FROM "Payment"
        )
        SELECT id, rn FROM ordered_payments WHERE id = ANY(${feeIds})
      `);
      rowNumbers.forEach(r => {
        paymentIndexMap.set(r.id, Number(r.rn));
      });
    }

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

      const effectiveDiscount = fee.discount;
      
      // Compute actual sequential receipt number matched with receipt page
      const count = paymentIndexMap.get(fee.id) || 1;
      const serial = 1000 + count;
      const receiptNo = generateReceiptNo(fee, serial);

      return {
        ...fee,
        discount: effectiveDiscount,
        daysLate: daysLate > 0 ? daysLate : 0,
        lateFine: currentFine,
        currentLateFine: currentFine,
        totalAmount: fee.amount + currentFine - effectiveDiscount,
        receiptNo
      };
    });

    return NextResponse.json({ fees });
  } catch (error) {
    console.error('Error fetching student fees:', error);
    return NextResponse.json({ error: 'Failed to fetch fee data' }, { status: 500 });
  }
}
