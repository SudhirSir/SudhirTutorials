export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { prisma, withDbRetry } from '@/lib/prisma';
import { calculateLateFine, generateReceiptNo } from '@/lib/feeUtils';
import { getLateFineSettings } from '@/lib/feeSettings';
import { z } from 'zod';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { logActivity } from '@/lib/activity';

const feeSchema = z.object({
  type: z.enum(['INDIVIDUAL', 'BATCH']),
  amount: z.union([z.string(), z.number()])
    .transform(val => typeof val === 'string' ? parseFloat(val) : val)
    .refine(val => val >= 0, "Amount cannot be negative"),
  billingMonth: z.string().min(1, "Month is required"),
  title: z.string().optional().default("Monthly Fee"),
  studentId: z.string().optional(), // For individual
  batchId: z.string().optional(), // For batch-specific assignment
  discount: z.number().nonnegative("Discount cannot be negative").optional().default(0),
  remarks: z.string().optional(),
  dueDate: z.string().optional(),
  createdAt: z.string().optional(),
});

const updateStatusSchema = z.object({
  id: z.string().optional(),
  ids: z.array(z.string()).optional(),
  status: z.enum(['PENDING', 'PAID', 'PAID_ONLINE', 'VERIFIED', 'FAILED']).optional(),
  paymentMethod: z.string().optional(),
  transactionId: z.string().optional(),
  discount: z.number().nonnegative("Discount cannot be negative").optional(),
  remarks: z.string().optional(),
  paidAmount: z.number().nonnegative("Paid amount cannot be negative").optional(),
  paidAt: z.string().optional(),
  isUnlocked: z.boolean().optional(),
});

// ─── GET: list every payment ───────────────────────
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const month = searchParams.get('month');
    const studentId = searchParams.get('studentId');
    const studentUsername = searchParams.get('studentUsername');
 
    const where: any = {};
    if (status) where.status = status;
    if (month) where.billingMonth = month;
    if (studentId) {
      where.studentId = studentId;
    } else if (studentUsername) {
      const u = await withDbRetry(() => prisma.user.findUnique({ where: { username: studentUsername } }));
      if (u) where.studentId = u.id;
    }

    const fees = await withDbRetry(() => prisma.payment.findMany({
      where,
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
                baseFee: true,
              }
            }
          } 
        } 
      },
      orderBy: { createdAt: 'desc' },
    }));

    const allPayments = await withDbRetry(() => prisma.payment.findMany({
      select: { id: true },
      orderBy: { createdAt: 'asc' }
    }));
    const rankMap = new Map<string, number>();
    allPayments.forEach((p, idx) => rankMap.set(p.id, idx));

    const { perDayFine, flatFineAfter10Days, feeDueDay } = await getLateFineSettings();

    const enrichedFees = fees.map((fee: any) => {
      const effectiveDueDate = fee.dueDate;

      // For pending fees, show real-time calculated fine
      // For paid/verified fees, show the fine that was locked in at time of payment
      const currentFine = fee.status === 'PENDING' 
        ? calculateLateFine(effectiveDueDate, fee.status, perDayFine, flatFineAfter10Days)
        : fee.lateFine;

      const now = new Date();
      const due = effectiveDueDate;
      const daysLate = Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));

      let receiptNo = '-';
      if (['PAID', 'VERIFIED', 'PAID_ONLINE'].includes(fee.status)) {
        const rank = rankMap.get(fee.id) ?? 0;
        const serial = 1001 + rank;
        receiptNo = generateReceiptNo(fee, serial);
      }

      const scholarship = fee.student?.studentProfile?.scholarship || 0;
      const effectiveDiscount = Math.max(fee.discount, scholarship);

      return {
        ...fee,
        discount: effectiveDiscount,
        daysLate: daysLate > 0 ? daysLate : 0,
        currentLateFine: currentFine,
        totalDue: Math.max(0, fee.amount + currentFine - effectiveDiscount + fee.previousBalance - (fee.paidAmount || 0)),
        receiptNo
      };
    });

    return NextResponse.json({ fees: enrichedFees });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch finances' }, { status: 500 });
  }
}

async function consumeUnpaidBalances(studentId: string): Promise<number> {
  const unresolvedPartials = await withDbRetry(() => prisma.payment.findMany({
    where: {
      studentId: studentId,
      status: { in: ['PAID', 'VERIFIED', 'PAID_ONLINE'] },
      balanceCarriedForward: false
    }
  }));

  let sum = 0;
  for (const fee of unresolvedPartials) {
    const totalDue = fee.amount + (fee.lateFine || 0) - (fee.discount || 0) + (fee.previousBalance || 0);
    const paidAmount = fee.paidAmount || 0;
    const remaining = totalDue - paidAmount;
    if (remaining > 0.01) {
      sum += remaining;
      await withDbRetry(() => prisma.payment.update({
        where: { id: fee.id },
        data: { balanceCarriedForward: true }
      }));
    }
  }
  return sum;
}

function getNextBillingMonth(billingMonth: string): string {
  const parts = billingMonth.split(' ');
  if (parts.length !== 2) return billingMonth;
  const monthName = parts[0];
  const year = parseInt(parts[1], 10);
  const index = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ].indexOf(monthName);
  if (index === -1) return billingMonth;
  const nextIndex = (index + 1) % 12;
  const nextYear = index === 11 ? year + 1 : year;
  const nextMonthName = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ][nextIndex];
  return `${nextMonthName} ${nextYear}`;
}

// ─── POST: assign fee (individual or batch) ─────────────────────────────────
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const validation = feeSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 });
    }

    const { type, amount, billingMonth, title, studentId, batchId, discount, remarks, dueDate, createdAt } = validation.data;

    const parsed = new Date(`${billingMonth} 12`);
    if (isNaN(parsed.getTime())) {
      return NextResponse.json({ error: 'Invalid billingMonth format. Use e.g. "April 2026"' }, { status: 400 });
    }
    
    const finalDueDate = dueDate ? new Date(dueDate) : new Date(parsed.getFullYear(), parsed.getMonth(), 12);
    const finalCreatedAt = createdAt ? new Date(createdAt) : new Date();

    if (type === 'BATCH') {
      const where: any = { role: 'STUDENT' };
      if (batchId) {
        where.studentBatches = { some: { id: batchId } };
      }

      const students = await withDbRetry(() => prisma.user.findMany({ 
        where,
        select: {
          id: true,
          username: true,
          studentProfile: { select: { baseFee: true, scholarship: true } }
        }
      }));
      
      let count = 0;
      for (const s of students) {
        // Prevent duplicate for same month and title
        const existing = await withDbRetry(() => prisma.payment.findFirst({
          where: { studentId: s.id, billingMonth, title: title || 'Monthly Fee' }
        }));
        if (existing) continue;

        const sScholarship = s.studentProfile?.scholarship || 0;
        const sDiscount = Math.max(discount || 0, sScholarship);
        const finalAssignedAmount = amount || s.studentProfile?.baseFee || 0;
        const prevBal = await consumeUnpaidBalances(s.id);
        await withDbRetry(() => prisma.payment.create({
          data: {
            studentId: s.id,
            amount: finalAssignedAmount,
            billingMonth,
            dueDate: finalDueDate,
            createdAt: finalCreatedAt,
            title: title || 'Monthly Fee',
            status: 'PENDING',
            discount: sDiscount,
            previousBalance: prevBal,
            remarks
          }
        }));

        // Notify Student
        try {
          await withDbRetry(() => prisma.notification.create({
            data: {
              userId: s.id,
              title: `💳 New Fee Assigned: ${title || 'Monthly Fee'}`,
              message: `A new fee of ₹${finalAssignedAmount.toFixed(0)} has been assigned to you for ${billingMonth}. Please pay before ${String(finalDueDate.getDate()).padStart(2, '0')}/${String(finalDueDate.getMonth() + 1).padStart(2, '0')}/${finalDueDate.getFullYear()} to avoid late fines.`,
              type: 'FEE',
              isRead: false
            }
          }));
        } catch (err) {
          console.error("Failed to notify student of fee assignment:", err);
        }

        count++;
      }

      await logActivity(
        session.user.id,
        'ASSIGN_FEE_BATCH',
        `Assigned fee of ₹${amount || 'Base Fee'} to ${count} students for month ${billingMonth} (${title})`
      );

      return NextResponse.json({ success: true, count });
    } else {
      // Individual
      const student = await withDbRetry(() => prisma.user.findUnique({ 
        where: { username: studentId },
        select: { id: true, studentProfile: { select: { baseFee: true, scholarship: true } } }
      }));
      if (!student) return NextResponse.json({ error: 'Student ID not found' }, { status: 404 });

      // Prevent duplicate
      const existing = await withDbRetry(() => prisma.payment.findFirst({
        where: { studentId: student.id, billingMonth, title: title || 'Monthly Fee' }
      }));
      if (existing) return NextResponse.json({ error: 'Fee already assigned for this month' }, { status: 400 });

      const sScholarship = student.studentProfile?.scholarship || 0;
      const sDiscount = Math.max(discount || 0, sScholarship);
      const finalAssignedAmount = amount || student.studentProfile?.baseFee || 0;
      const prevBal = await consumeUnpaidBalances(student.id);
      const payment = await withDbRetry(() => prisma.payment.create({
        data: {
          studentId: student.id,
          amount: finalAssignedAmount,
          billingMonth,
          dueDate: finalDueDate,
          createdAt: finalCreatedAt,
          title: title || 'Monthly Fee',
          status: 'PENDING',
          discount: sDiscount,
          previousBalance: prevBal,
          remarks
        },
      }));

      // Notify Student
      try {
        await withDbRetry(() => prisma.notification.create({
          data: {
            userId: student.id,
            title: `💳 New Fee Assigned: ${title || 'Monthly Fee'}`,
            message: `A new individual fee of ₹${finalAssignedAmount.toFixed(0)} has been assigned to you for ${billingMonth}. Please pay before ${String(finalDueDate.getDate()).padStart(2, '0')}/${String(finalDueDate.getMonth() + 1).padStart(2, '0')}/${finalDueDate.getFullYear()} to avoid late fines.`,
            type: 'FEE',
            isRead: false
          }
        }));
      } catch (err) {
        console.error("Failed to notify student of fee assignment:", err);
      }

      await logActivity(
        session.user.id,
        'ASSIGN_FEE_INDIVIDUAL',
        `Assigned fee of ₹${finalAssignedAmount} to student ${studentId} for month ${billingMonth} (${title})`
      );

      return NextResponse.json({ success: true, payment });
    }
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to assign fees' }, { status: 500 });
  }
}

// ─── PATCH: update fee status & lock in amounts ────────────────────────────────
export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const validation = updateStatusSchema.safeParse(body);
    if (!validation.success) return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 });

    const { id, ids, status, paymentMethod, transactionId, discount, remarks, paidAmount, paidAt, isUnlocked } = validation.data;

    // Handle manual unlock/lock override immediately
    if (isUnlocked !== undefined) {
      const targetIds = ids || (id ? [id] : []);
      if (targetIds.length > 0) {
        await withDbRetry(() => prisma.payment.updateMany({
          where: { id: { in: targetIds } },
          data: { isUnlocked }
        }));
        await logActivity(
          session.user.id,
          'UNLOCK_FEE_RECORD',
          `Set isUnlocked to ${isUnlocked} for records: ${targetIds.join(', ')}`
        );
        return NextResponse.json({ success: true });
      }
    }

    const targetIds = ids || (id ? [id] : []);
    if (targetIds.length === 0) {
      return NextResponse.json({ error: 'Missing payment ID(s)' }, { status: 400 });
    }

    const currentFees = await withDbRetry(() => prisma.payment.findMany({
      where: { id: { in: targetIds } },
      include: {
        student: {
          select: {
            studentProfile: {
              select: { scholarship: true }
            }
          }
        }
      },
      orderBy: { dueDate: 'asc' } // Process chronologically!
    }));

    if (currentFees.length === 0) {
      return NextResponse.json({ error: 'Payment records not found' }, { status: 404 });
    }

    const { perDayFine, flatFineAfter10Days } = await getLateFineSettings();
    let paymentDateForFine = new Date();
    if (paidAt) {
      const parts = paidAt.split('-');
      if (parts.length === 3) {
        paymentDateForFine = new Date(
          parseInt(parts[0], 10),
          parseInt(parts[1], 10) - 1,
          parseInt(parts[2], 10)
        );
      } else {
        paymentDateForFine = new Date(paidAt);
      }
    }

    let remainingPaidPool = paidAmount !== undefined ? paidAmount : null;
    const updatedPayments = [];

    for (let i = 0; i < currentFees.length; i++) {
      const feeId = currentFees[i].id;
      // Refresh currentFee from DB to account for any previousBalances carried forward in prior iterations
      const currentFee = await withDbRetry(() => prisma.payment.findUnique({
        where: { id: feeId },
        include: {
          student: {
            select: {
              studentProfile: {
                select: { scholarship: true }
              }
            }
          }
        }
      }));
      if (!currentFee) continue;

      // Enforce chronological check unless overridden by isUnlocked
      if (!currentFee.isUnlocked && (status === 'PAID' || status === 'VERIFIED' || status === 'PAID_ONLINE')) {
        const previousPending = await withDbRetry(() => prisma.payment.findFirst({
          where: {
            studentId: currentFee.studentId,
            status: 'PENDING',
            dueDate: { lt: currentFee.dueDate },
            id: { not: currentFee.id }
          }
        }));

        if (previousPending) {
          return NextResponse.json({
            error: `Cannot collect/verify payment because a previous month's fee (${previousPending.billingMonth}) is still pending. Fees must be collected strictly in chronological order.`
          }, { status: 400 });
        }
      }

      // Lock in late fine only when moving FROM PENDING TO PAID/VERIFIED/PAID_ONLINE
      let lateFine = currentFee.lateFine;
      if (currentFee.status === 'PENDING' && (status === 'PAID' || status === 'VERIFIED' || status === 'PAID_ONLINE')) {
        lateFine = calculateLateFine(currentFee.dueDate, 'PENDING', perDayFine, flatFineAfter10Days, paymentDateForFine);
      }

      const scholarship = currentFee.student?.studentProfile?.scholarship || 0;
      const effectiveDiscount = Math.max(discount !== undefined ? discount : currentFee.discount, scholarship);

      const totalDue = currentFee.amount + lateFine - effectiveDiscount + currentFee.previousBalance;
      const remainingDueBefore = Math.max(0, totalDue - (currentFee.paidAmount || 0));

      let inputPaidAmount = 0;
      if (remainingPaidPool === null) {
        if (currentFee.status === 'PENDING') {
          inputPaidAmount = remainingDueBefore;
        } else {
          inputPaidAmount = 0;
        }
      } else {
        inputPaidAmount = Math.min(remainingPaidPool, remainingDueBefore);
        remainingPaidPool -= inputPaidAmount;
      }

      const newTotalPaidAmount = (currentFee.paidAmount || 0) + inputPaidAmount;
      const finalStatus = status || currentFee.status;
      const remainingBalance = totalDue - newTotalPaidAmount;

      let finalPaidAt: Date | null = null;
      if (['PAID', 'VERIFIED', 'PAID_ONLINE', 'PENDING'].includes(finalStatus) && newTotalPaidAmount > 0) {
        if (paidAt) {
          const parts = paidAt.split('-');
          if (parts.length === 3) {
            const year = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1;
            const day = parseInt(parts[2], 10);
            const liveNow = new Date();
            finalPaidAt = new Date(
              year,
              month,
              day,
              liveNow.getHours(),
              liveNow.getMinutes(),
              liveNow.getSeconds(),
              liveNow.getMilliseconds()
            );
          } else {
            finalPaidAt = new Date(paidAt);
          }
        } else {
          finalPaidAt = currentFee.paidAt || new Date();
        }
      }

      const updated = await withDbRetry(() => prisma.payment.update({
        where: { id: feeId },
        data: {
          status: finalStatus,
          paymentMethod,
          transactionId,
          remarks: remarks !== undefined ? remarks : currentFee.remarks,
          discount: effectiveDiscount,
          lateFine,
          paidAmount: newTotalPaidAmount,
          paidAt: finalPaidAt,
          ...((finalStatus === 'PAID' || finalStatus === 'VERIFIED') && {
            collectedBy: session.user.name || session.user.username || 'Admin'
          })
        },
      }));

      // Carry forward logic: if verified/paid and there is a remaining balance, push to next month
      if ((finalStatus === 'PAID' || finalStatus === 'VERIFIED') && remainingBalance > 0.01) {
        const nextMonthStr = getNextBillingMonth(currentFee.billingMonth);
        const nextFee = await withDbRetry(() => prisma.payment.findFirst({
          where: {
            studentId: currentFee.studentId,
            billingMonth: nextMonthStr
          }
        }));

        if (nextFee) {
          await withDbRetry(() => prisma.payment.update({
            where: { id: nextFee.id },
            data: {
              previousBalance: nextFee.previousBalance + remainingBalance
            }
          }));
          await withDbRetry(() => prisma.payment.update({
            where: { id: currentFee.id },
            data: { balanceCarriedForward: true }
          }));
        }
      }

      if (finalStatus === 'VERIFIED' || finalStatus === 'PAID') {
        try {
          await withDbRetry(() => prisma.notification.create({
            data: {
              userId: currentFee.studentId,
              title: '✅ Fee Payment Verified',
              message: `Your payment of ₹${newTotalPaidAmount.toFixed(0)} for ${currentFee.title} (${currentFee.billingMonth}) has been verified. Carried forward balance: ₹${Math.max(0, remainingBalance).toFixed(0)}.`,
              type: 'FEE',
              isRead: false
            }
          }));
        } catch (err) {
          console.error('Failed to send notification to student:', err);
        }
      }

      updatedPayments.push(updated);
    }

    await logActivity(
      session.user.id,
      'UPDATE_FEE_STATUS',
      `Updated fee status for ${targetIds.length} records. Paid amount: ₹${paidAmount ?? 'Full'}`
    );

    return NextResponse.json({ success: true, payments: updatedPayments });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to update fee status' }, { status: 500 });
  }
}

// ─── PUT: edit any payment/fee record details (admin corrective editing) ───────
export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { id, title, billingMonth, amount, discount, lateFine, status, dueDate, remarks, paidAmount } = body;
    if (!id) return NextResponse.json({ error: 'Missing payment ID' }, { status: 400 });

    if (amount !== undefined && (isNaN(parseFloat(String(amount))) || parseFloat(String(amount)) < 0)) {
      return NextResponse.json({ error: 'Amount cannot be negative' }, { status: 400 });
    }
    if (discount !== undefined && (isNaN(parseFloat(String(discount))) || parseFloat(String(discount)) < 0)) {
      return NextResponse.json({ error: 'Discount cannot be negative' }, { status: 400 });
    }
    if (lateFine !== undefined && (isNaN(parseFloat(String(lateFine))) || parseFloat(String(lateFine)) < 0)) {
      return NextResponse.json({ error: 'Late fine cannot be negative' }, { status: 400 });
    }
    if (paidAmount !== undefined && (isNaN(parseFloat(String(paidAmount))) || parseFloat(String(paidAmount)) < 0)) {
      return NextResponse.json({ error: 'Paid amount cannot be negative' }, { status: 400 });
    }

    const existing = await withDbRetry(() => prisma.payment.findUnique({ 
      where: { id },
      include: {
        student: {
          select: {
            studentProfile: {
              select: { scholarship: true }
            }
          }
        }
      }
    }));
    if (!existing) return NextResponse.json({ error: 'Payment record not found' }, { status: 404 });

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (billingMonth !== undefined) updateData.billingMonth = billingMonth;
    if (amount !== undefined) updateData.amount = parseFloat(String(amount));
    const scholarship = existing.student?.studentProfile?.scholarship || 0;
    const inputDiscount = discount !== undefined ? parseFloat(String(discount)) : existing.discount;
    const effectiveDiscount = Math.max(inputDiscount, scholarship);

    if (discount !== undefined || existing.discount !== effectiveDiscount) {
      updateData.discount = effectiveDiscount;
    }
    if (lateFine !== undefined) updateData.lateFine = parseFloat(String(lateFine));
    if (status !== undefined) updateData.status = status;
    if (remarks !== undefined) updateData.remarks = remarks;
    if (dueDate !== undefined) {
      const parsedDate = new Date(dueDate);
      if (!isNaN(parsedDate.getTime())) {
        updateData.dueDate = parsedDate;
      }
    }

    // If status is being updated, handle paidAmount and paidAt logic
    if (status !== undefined && status !== existing.status) {
      if (status === 'PAID' || status === 'VERIFIED' || status === 'PAID_ONLINE') {
        const finalAmount = (updateData.amount ?? existing.amount);
        const finalFine = (updateData.lateFine ?? existing.lateFine);
        const finalDiscount = (updateData.discount ?? effectiveDiscount);
        updateData.paidAmount = paidAmount !== undefined 
          ? parseFloat(String(paidAmount))
          : Math.max(0, finalAmount + finalFine - finalDiscount);
        updateData.paidAt = new Date();
        if (status === 'PAID' || status === 'VERIFIED') {
          updateData.collectedBy = session.user.name || session.user.username || 'Admin';
        }
      } else if (status === 'PENDING') {
        updateData.paidAmount = paidAmount !== undefined ? parseFloat(String(paidAmount)) : 0;
        updateData.paidAt = null;
        updateData.collectedBy = null;
      }
    } else {
      if (paidAmount !== undefined) {
        updateData.paidAmount = parseFloat(String(paidAmount));
      }
    }

    const updated = await withDbRetry(() => prisma.payment.update({
      where: { id },
      data: updateData,
    }));

    // Carry forward logic: if verified/paid and there is a remaining balance, push to next month
    const remainingBalance = (updated.amount + (updated.lateFine || 0) - (updated.discount || 0) + (updated.previousBalance || 0)) - (updated.paidAmount || 0);
    if ((updated.status === 'PAID' || updated.status === 'VERIFIED') && remainingBalance > 0.01 && !updated.balanceCarriedForward) {
      const nextMonthStr = getNextBillingMonth(updated.billingMonth);
      const nextFee = await withDbRetry(() => prisma.payment.findFirst({
        where: {
          studentId: updated.studentId,
          billingMonth: nextMonthStr
        }
      }));

      if (nextFee) {
        await withDbRetry(() => prisma.payment.update({
          where: { id: nextFee.id },
          data: {
            previousBalance: nextFee.previousBalance + remainingBalance
          }
        }));
        await withDbRetry(() => prisma.payment.update({
          where: { id: updated.id },
          data: { balanceCarriedForward: true }
          }));
      }
    }

    await logActivity(
      session.user.id,
      'EDIT_FEE_RECORD',
      `Edited details for fee record ${id}. Amount: ₹${updated.amount}, Status: ${updated.status}`
    );

    return NextResponse.json({ success: true, payment: updated });
  } catch (error) {
    console.error('Error updating payment:', error);
    return NextResponse.json({ error: 'Failed to update payment details' }, { status: 500 });
  }
}

// ─── DELETE: remove incorrect fee entry ──────────────────────────────────────
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing payment ID' }, { status: 400 });
    await withDbRetry(() => prisma.payment.delete({ where: { id } }));

    await logActivity(
      session.user.id,
      'DELETE_FEE_RECORD',
      `Deleted fee record ${id}`
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete payment' }, { status: 500 });
  }
}
