import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { calculateLateFine } from '@/lib/feeUtils';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || (session.user as any).role !== 'STUDENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { feeId } = await req.json();
    if (!feeId) return NextResponse.json({ error: 'Fee ID is required' }, { status: 400 });

    const fee = await prisma.payment.findUnique({ where: { id: feeId } });
    if (!fee || fee.studentId !== (session.user as any).id) {
      return NextResponse.json({ error: 'Fee not found' }, { status: 404 });
    }

    if (fee.status !== 'PENDING') {
      return NextResponse.json({ error: 'Fee is already paid or processing' }, { status: 400 });
    }

    // Determine total
    const lateFine = calculateLateFine(fee.dueDate, fee.status);
    
    // Process update to PAID_ONLINE
    const updatedFee = await prisma.payment.update({
      where: { id: feeId },
      data: {
        status: 'PAID_ONLINE',
        paidAt: new Date(),
        amount: fee.amount + lateFine
      }
    });

    return NextResponse.json({ success: true, fee: updatedFee, totalPaid: fee.amount + lateFine });
  } catch (error) {
    console.error('Error processing payment:', error);
    return NextResponse.json({ error: 'Failed to process payment' }, { status: 500 });
  }
}
