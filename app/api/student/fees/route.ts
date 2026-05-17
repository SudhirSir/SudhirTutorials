import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { calculateLateFine } from '@/lib/feeUtils';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || (session.user as any).role !== 'STUDENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const studentId = (session.user as any).id;

    const rawFees = await prisma.payment.findMany({
      where: { studentId },
      orderBy: { dueDate: 'desc' }
    });

    const fees = rawFees.map((fee: any) => {
      const now = new Date();
      const due = new Date(fee.dueDate);
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
      const daysLate = Math.floor((today.getTime() - dueDay.getTime()) / (1000 * 60 * 60 * 24));

      const lateFine = calculateLateFine(fee.dueDate, fee.status);
      return {
        ...fee,
        daysLate: daysLate > 0 ? daysLate : 0,
        lateFine,
        totalAmount: fee.amount + lateFine
      };
    });

    return NextResponse.json({ fees });
  } catch (error) {
    console.error('Error fetching student fees:', error);
    return NextResponse.json({ error: 'Failed to fetch fee data' }, { status: 500 });
  }
}
