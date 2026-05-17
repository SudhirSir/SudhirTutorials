import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { calculateLateFine } from '@/lib/feeUtils';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user || session.user.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { feeId, transactionId, paymentMethod } = await req.json();
    if (!feeId) return NextResponse.json({ error: 'Fee ID is required' }, { status: 400 });

    const fee = await prisma.payment.findUnique({
      where: { id: feeId },
      include: { student: true }
    });
    if (!fee || fee.studentId !== session.user.id) {
      return NextResponse.json({ error: 'Fee not found' }, { status: 404 });
    }

    if (fee.status !== 'PENDING') {
      return NextResponse.json({ error: 'Fee is already paid or processing' }, { status: 400 });
    }

    // Determine total
    const lateFine = calculateLateFine(fee.dueDate, fee.status);
    const totalAmount = fee.amount + lateFine - fee.discount;

    // Process update to PAID_ONLINE
    const updatedFee = await prisma.payment.update({
      where: { id: feeId },
      data: {
        status: 'PAID_ONLINE',
        paidAt: new Date(),
        paymentMethod: paymentMethod || 'RAZORPAY',
        transactionId: transactionId || `pay_${Math.random().toString(36).substr(2, 9)}`,
        lateFine: lateFine,
        paidAmount: totalAmount
      }
    });

    // Notify ALL Admins about this payment so they can verify it
    try {
      const admins = await prisma.user.findMany({
        where: { role: 'ADMIN' }
      });

      for (const admin of admins) {
        await prisma.notification.create({
          data: {
            userId: admin.id,
            title: '💳 Fee Payment Received (Online)',
            message: `Student ${fee.student.name} (${fee.student.username}) has paid ₹${totalAmount.toFixed(0)} online for ${fee.title} (${fee.billingMonth}). Please verify and approve.`,
            type: 'FEE',
            isRead: false
          }
        });
      }
    } catch (err) {
      console.error('Failed to notify admins of fee payment:', err);
    }

    return NextResponse.json({ success: true, fee: updatedFee, totalPaid: totalAmount });
  } catch (error) {
    console.error('Error processing payment:', error);
    return NextResponse.json({ error: 'Failed to process payment' }, { status: 500 });
  }
}
