export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma, withDbRetry } from '@/lib/prisma';
import { calculateLateFine } from '@/lib/feeUtils';
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
              }
            }
          }
        }
      },
      orderBy: { dueDate: 'desc' }
    }));

    const { perDayFine, flatFineAfter10Days } = await getLateFineSettings();

    const fees = rawFees.map((fee: any) => {
      const now = new Date();
      const due = new Date(fee.dueDate);
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
      const daysLate = Math.floor((today.getTime() - dueDay.getTime()) / (1000 * 60 * 60 * 24));

      const currentFine = fee.status === 'PENDING'
        ? calculateLateFine(fee.dueDate, fee.status, perDayFine, flatFineAfter10Days)
        : fee.lateFine;
      return {
        ...fee,
        daysLate: daysLate > 0 ? daysLate : 0,
        lateFine: currentFine,
        currentLateFine: currentFine,
        totalAmount: fee.amount + currentFine - fee.discount
      };
    });

    return NextResponse.json({ fees });
  } catch (error) {
    console.error('Error fetching student fees:', error);
    return NextResponse.json({ error: 'Failed to fetch fee data' }, { status: 500 });
  }
}
