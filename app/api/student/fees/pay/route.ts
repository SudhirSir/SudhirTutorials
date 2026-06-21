export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma, withDbRetry } from '@/lib/prisma';
import { calculateLateFine } from '@/lib/feeUtils';
import { getLateFineSettings } from '@/lib/feeSettings';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user || session.user.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { feeId, feeIds, transactionId, paymentMethod, customAmount } = await req.json();
    if (!feeId && (!feeIds || feeIds.length === 0)) {
      return NextResponse.json({ error: 'Fee ID or feeIds list is required' }, { status: 400 });
    }

    const parsedCustom = parseFloat(String(customAmount));
    if (isNaN(parsedCustom) || parsedCustom <= 0) {
      return NextResponse.json({ error: 'Valid custom amount is required' }, { status: 400 });
    }

    const { perDayFine, flatFineAfter10Days, feeDueDay } = await getLateFineSettings();
    const txId = transactionId || `pay_${Math.random().toString(36).substr(2, 9)}`;

    let updatedFees = [];
    let totalApplied = 0;
    let notifyMsg = "";
    let studentMsg = "";

    if (feeId === 'OUTSTANDING' || (feeIds && Array.isArray(feeIds) && feeIds.length > 0)) {
      // FIFO Outstanding payment across all pending bills OR selected billing items
      const targetIds = feeIds && Array.isArray(feeIds) ? feeIds : [];
      const allPayments = await withDbRetry(() => prisma.payment.findMany({
        where: { 
          studentId: session.user.id,
          ...(targetIds.length > 0 && { id: { in: targetIds } })
        },
        orderBy: { dueDate: 'asc' },
        include: {
          student: {
            include: {
              studentProfile: {
                select: { scholarship: true }
              }
            }
          }
        }
      }));

      const studentUser = allPayments[0]?.student;
      if (!studentUser) {
        return NextResponse.json({ error: 'No fee records found for student' }, { status: 404 });
      }

      // Filter outstanding payments
      const outstandingPayments = allPayments.filter(fee => {
        if (fee.status === 'PAID_ONLINE') return false; // Already submitted online awaiting verification
        const storedFine = fee.lateFine || 0;
        const effectiveDueDate = fee.dueDate;
        const realTimeFine = fee.status === 'PENDING' ? calculateLateFine(effectiveDueDate, fee.status, perDayFine, flatFineAfter10Days) : 0;
        const activeFine = Math.max(storedFine, realTimeFine);
        const scholarship = fee.student?.studentProfile?.scholarship || 0;
        const effectiveDiscount = Math.max(fee.discount, scholarship);
        const totalInvoiceAmount = fee.amount + activeFine - effectiveDiscount + fee.previousBalance;
        const pendingInvoiceDue = totalInvoiceAmount - (fee.paidAmount || 0);
        return pendingInvoiceDue > 0;
      });

      let remainingPaidPool = parsedCustom;
      let appliedDetails = [];

      for (const fee of outstandingPayments) {
        if (remainingPaidPool <= 0) break;

        const storedFine = fee.lateFine || 0;
        const effectiveDueDate = fee.dueDate;
        const realTimeFine = fee.status === 'PENDING' ? calculateLateFine(effectiveDueDate, fee.status, perDayFine, flatFineAfter10Days) : 0;
        const activeFine = Math.max(storedFine, realTimeFine);
        const scholarship = fee.student?.studentProfile?.scholarship || 0;
        const effectiveDiscount = Math.max(fee.discount, scholarship);
        const totalInvoiceAmount = fee.amount + activeFine - effectiveDiscount + fee.previousBalance;
        const pendingInvoiceDue = Math.max(0, totalInvoiceAmount - (fee.paidAmount || 0));

        const paymentToApply = Math.min(remainingPaidPool, pendingInvoiceDue);
        if (paymentToApply <= 0) continue;

        remainingPaidPool -= paymentToApply;
        totalApplied += paymentToApply;
        const updatedPaidAmount = (fee.paidAmount || 0) + paymentToApply;

        const updated = await withDbRetry(() => prisma.payment.update({
          where: { id: fee.id },
          data: {
            status: 'PAID_ONLINE',
            paidAt: new Date(),
            paymentMethod: paymentMethod || 'Razorpay Direct Link',
            transactionId: txId,
            lateFine: activeFine,
            discount: effectiveDiscount,
            paidAmount: updatedPaidAmount,
            remarks: fee.remarks 
              ? `${fee.remarks} (Paid ₹${paymentToApply.toFixed(2)})` 
              : `Paid ₹${paymentToApply.toFixed(2)} online`
          }
        }));

        updatedFees.push(updated);
        appliedDetails.push(`${fee.billingMonth}: ₹${paymentToApply.toFixed(0)}`);
      }

      if (totalApplied === 0) {
        return NextResponse.json({ error: 'No pending dues to pay or all pending dues are awaiting verification' }, { status: 400 });
      }

      const leftOutstanding = outstandingPayments.reduce((sum, fee) => {
        const storedFine = fee.lateFine || 0;
        const effectiveDueDate = fee.dueDate;
        const realTimeFine = fee.status === 'PENDING' ? calculateLateFine(effectiveDueDate, fee.status, perDayFine, flatFineAfter10Days) : 0;
        const activeFine = Math.max(storedFine, realTimeFine);
        const scholarship = fee.student?.studentProfile?.scholarship || 0;
        const effectiveDiscount = Math.max(fee.discount, scholarship);
        const totalInvoiceAmount = fee.amount + activeFine - effectiveDiscount + fee.previousBalance;
        const pendingInvoiceDue = totalInvoiceAmount - (fee.paidAmount || 0);
        return sum + pendingInvoiceDue;
      }, 0) - totalApplied;

      notifyMsg = `Student ${studentUser.name} (${studentUser.username}) has paid a total outstanding of ₹${totalApplied.toFixed(0)} online via FIFO. Applied: [${appliedDetails.join(', ')}]. Remaining Outstanding Dues: ₹${Math.max(0, leftOutstanding).toFixed(0)}. Please verify and approve.`;
      studentMsg = `Your outstanding payment of ₹${totalApplied.toFixed(0)} was successfully submitted online and is awaiting administrative verification. Details: ${appliedDetails.join(', ')}.`;

    } else {
      // Month-wise specific fee payment
      const fee = await withDbRetry(() => prisma.payment.findUnique({
        where: { id: feeId },
        include: {
          student: {
            include: {
              studentProfile: {
                select: { scholarship: true }
              }
            }
          }
        }
      }));

      if (!fee || fee.studentId !== session.user.id) {
        return NextResponse.json({ error: 'Fee record not found' }, { status: 404 });
      }

      if (fee.status === 'PAID_ONLINE') {
        return NextResponse.json({ error: 'Payment is already processing and awaiting verification' }, { status: 400 });
      }

      // Chronological/Serial payment enforcement: check if there are earlier pending fees
      const previousPending = await withDbRetry(() => prisma.payment.findFirst({
        where: {
          studentId: session.user.id,
          status: 'PENDING',
          isUnlocked: false, // SKIP if unlocked
          dueDate: { lt: fee.dueDate },
          id: { not: fee.id }
        }
      }));

      if (previousPending) {
        return NextResponse.json({ 
          error: `Cannot pay for ${fee.billingMonth} because a previous month's fee (${previousPending.billingMonth}) is still pending. Fees must be paid strictly in chronological order.` 
        }, { status: 400 });
      }

      const storedFine = fee.lateFine || 0;
      const effectiveDueDate = fee.dueDate;
      const realTimeFine = fee.status === 'PENDING' ? calculateLateFine(effectiveDueDate, fee.status, perDayFine, flatFineAfter10Days) : 0;
      const activeFine = Math.max(storedFine, realTimeFine);
      const scholarship = fee.student?.studentProfile?.scholarship || 0;
      const effectiveDiscount = Math.max(fee.discount, scholarship);
      const totalInvoiceAmount = fee.amount + activeFine - effectiveDiscount + fee.previousBalance;
      const pendingInvoiceDue = Math.max(0, totalInvoiceAmount - (fee.paidAmount || 0));

      if (parsedCustom > pendingInvoiceDue) {
        return NextResponse.json({ error: `Amount cannot exceed the pending due of ₹${pendingInvoiceDue.toFixed(2)}` }, { status: 400 });
      }

      totalApplied = parsedCustom;
      const updatedPaidAmount = (fee.paidAmount || 0) + parsedCustom;

      const updated = await withDbRetry(() => prisma.payment.update({
        where: { id: feeId },
        data: {
          status: 'PAID_ONLINE',
          paidAt: new Date(),
          paymentMethod: paymentMethod || 'Razorpay Direct Link',
          transactionId: txId,
          lateFine: activeFine,
          discount: effectiveDiscount,
          paidAmount: updatedPaidAmount,
          remarks: fee.remarks 
            ? `${fee.remarks} (Paid ₹${parsedCustom.toFixed(2)})` 
            : `Paid ₹${parsedCustom.toFixed(2)} online`
        }
      }));

      updatedFees.push(updated);

      const remainingBalance = Math.max(0, totalInvoiceAmount - updatedPaidAmount);

      notifyMsg = `Student ${fee.student.name} (${fee.student.username}) has paid ₹${parsedCustom.toFixed(0)} online for ${fee.title} (${fee.billingMonth}). Remaining month balance: ₹${remainingBalance.toFixed(0)}. Please verify and approve.`;
      studentMsg = remainingBalance > 0
        ? `Your partial payment of ₹${parsedCustom.toFixed(0)} for ${fee.title} (${fee.billingMonth}) was successfully submitted online and is awaiting administrative verification. The remaining balance of ₹${remainingBalance.toFixed(0)} will remain in your outstanding dues.`
        : `Your payment of ₹${parsedCustom.toFixed(0)} for ${fee.title} (${fee.billingMonth}) was successfully submitted online and is awaiting administrative verification.`;
    }

    // Send notifications
    try {
      const admins = await withDbRetry(() => prisma.user.findMany({ where: { role: 'ADMIN' } }));
      for (const admin of admins) {
        await withDbRetry(() => prisma.notification.create({
          data: {
            userId: admin.id,
            title: feeId === 'OUTSTANDING' ? '💳 Outstanding Fees Paid (FIFO)' : '💳 Fee Payment Received (Online)',
            message: notifyMsg,
            type: 'FEE',
            isRead: false
          }
        }));
      }
    } catch (err) {
      console.error('Failed to notify admins of fee payment:', err);
    }

    try {
      await withDbRetry(() => prisma.notification.create({
        data: {
          userId: session.user.id,
          title: feeId === 'OUTSTANDING' ? '💳 Outstanding Fee Payment Submitted' : '💳 Fee Payment Submitted',
          message: studentMsg,
          type: 'FEE',
          isRead: false
        }
      }));
    } catch (err) {
      console.error('Failed to notify student of online payment:', err);
    }

    return NextResponse.json({ success: true, fees: updatedFees, totalPaid: totalApplied });
  } catch (error) {
    console.error('Error processing payment:', error);
    return NextResponse.json({ error: 'Failed to process payment' }, { status: 500 });
  }
}
