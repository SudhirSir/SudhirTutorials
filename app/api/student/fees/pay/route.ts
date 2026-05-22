import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { calculateLateFine } from '@/lib/feeUtils';
import { getLateFineSettings } from '@/lib/feeSettings';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user || session.user.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { feeId, transactionId, paymentMethod, customAmount } = await req.json();
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

    const { perDayFine, flatFineAfter10Days } = await getLateFineSettings();

    // Determine total
    const lateFine = calculateLateFine(fee.dueDate, fee.status, perDayFine, flatFineAfter10Days);
    const totalAmount = fee.amount + lateFine - fee.discount;

    let isPartial = false;
    let actualPaidAmount = totalAmount;
    let remainingBalance = 0;

    if (customAmount !== undefined && customAmount !== null) {
      const parsedCustom = parseFloat(String(customAmount));
      if (!isNaN(parsedCustom) && parsedCustom > 0 && parsedCustom < totalAmount) {
        isPartial = true;
        actualPaidAmount = parsedCustom;
        remainingBalance = totalAmount - parsedCustom;
      }
    }

    let updatedFee;
    const txId = transactionId || `pay_${Math.random().toString(36).substr(2, 9)}`;

    if (isPartial) {
      // 1. Update the existing invoice to reflect exactly what was paid
      // We set paidAmount = actualPaidAmount, status = PAID_ONLINE,
      // and adjust the base amount to be: actualPaidAmount - lateFine + fee.discount (balancing the credit/debit perfectly!)
      const adjustedBaseAmount = Math.max(0, actualPaidAmount - lateFine + fee.discount);

      updatedFee = await prisma.payment.update({
        where: { id: feeId },
        data: {
          status: 'PAID_ONLINE',
          paidAt: new Date(),
          paymentMethod: paymentMethod || 'RAZORPAY',
          transactionId: txId,
          lateFine: lateFine,
          amount: adjustedBaseAmount,
          paidAmount: actualPaidAmount,
          remarks: fee.remarks ? `${fee.remarks} (Partial Payment 1)` : 'Partial Payment 1'
        }
      });

      // 2. Create a new PENDING payment for the remaining balance
      await prisma.payment.create({
        data: {
          studentId: fee.studentId,
          title: fee.title,
          billingMonth: fee.billingMonth,
          dueDate: fee.dueDate,
          amount: remainingBalance,
          discount: 0,
          lateFine: 0,
          status: 'PENDING',
          remarks: `Remaining balance for ${fee.billingMonth} after partial payment of ₹${actualPaidAmount}`
        }
      });
    } else {
      // Full Payment
      updatedFee = await prisma.payment.update({
        where: { id: feeId },
        data: {
          status: 'PAID_ONLINE',
          paidAt: new Date(),
          paymentMethod: paymentMethod || 'RAZORPAY',
          transactionId: txId,
          lateFine: lateFine,
          paidAmount: totalAmount
        }
      });
    }

    // Notify ALL Admins about this payment so they can verify it
    try {
      const admins = await prisma.user.findMany({
        where: { role: 'ADMIN' }
      });

      const notifyMsg = isPartial
        ? `Student ${fee.student.name} (${fee.student.username}) has paid a partial amount of ₹${actualPaidAmount.toFixed(0)} online for ${fee.title} (${fee.billingMonth}). Remaining balance: ₹${remainingBalance.toFixed(0)}. Please verify and approve.`
        : `Student ${fee.student.name} (${fee.student.username}) has paid ₹${totalAmount.toFixed(0)} online for ${fee.title} (${fee.billingMonth}). Please verify and approve.`;

      for (const admin of admins) {
        await prisma.notification.create({
          data: {
            userId: admin.id,
            title: isPartial ? '💳 Partial Fee Payment Received' : '💳 Fee Payment Received (Online)',
            message: notifyMsg,
            type: 'FEE',
            isRead: false
          }
        });
      }
    } catch (err) {
      console.error('Failed to notify admins of fee payment:', err);
    }

    // Notify the Student that online payment has been submitted
    try {
      const studentMsg = isPartial
        ? `Your partial payment of ₹${actualPaidAmount.toFixed(0)} for ${fee.title} (${fee.billingMonth}) was successfully submitted online and is awaiting administrative verification. The remaining balance of ₹${remainingBalance.toFixed(0)} has been added to your outstanding dues.`
        : `Your payment of ₹${totalAmount.toFixed(0)} for ${fee.title} (${fee.billingMonth}) was successfully submitted online and is awaiting administrative verification.`;

      await prisma.notification.create({
        data: {
          userId: session.user.id,
          title: isPartial ? '💳 Partial Fee Payment Submitted' : '💳 Fee Payment Submitted',
          message: studentMsg,
          type: 'FEE',
          isRead: false
        }
      });
    } catch (err) {
      console.error('Failed to notify student of online payment:', err);
    }

    return NextResponse.json({ success: true, fee: updatedFee, totalPaid: actualPaidAmount, remainingBalance });
  } catch (error) {
    console.error('Error processing payment:', error);
    return NextResponse.json({ error: 'Failed to process payment' }, { status: 500 });
  }
}
