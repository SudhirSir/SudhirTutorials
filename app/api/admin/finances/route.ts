export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { prisma, withDbRetry } from '@/lib/prisma';
import { calculateLateFine, generateReceiptNo, getGradeLetterCode } from '@/lib/feeUtils';
import { getLateFineSettings } from '@/lib/feeSettings';
import { z } from 'zod';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { logActivity } from '@/lib/activity';

const feeSchema = z.object({
  type: z.enum(['INDIVIDUAL', 'BATCH']),
  amount: z.union([z.string(), z.number()]).transform(val => typeof val === 'string' ? parseFloat(val) : val),
  billingMonth: z.string().min(1, "Month is required"),
  title: z.string().optional().default("Monthly Fee"),
  studentId: z.string().optional(), // For individual
  batchId: z.string().optional(), // For batch-specific assignment
  discount: z.number().optional().default(0),
  remarks: z.string().optional(),
  dueDate: z.string().optional(),
  createdAt: z.string().optional(),
});

const updateStatusSchema = z.object({
  id: z.string().min(1),
  status: z.enum(['PENDING', 'PAID', 'PAID_ONLINE', 'VERIFIED', 'FAILED']),
  paymentMethod: z.string().optional(),
  transactionId: z.string().optional(),
  discount: z.number().optional(),
  remarks: z.string().optional(),
  paidAmount: z.number().optional(),
  paidAt: z.string().optional(),
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
            id: true,
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
      orderBy: { createdAt: 'desc' },
      ...(status || month || studentId || studentUsername ? {} : { take: 250 })
    }));

    const { perDayFine, flatFineAfter10Days } = await getLateFineSettings();
    const now = new Date();

    const enrichedFees = fees.map((fee: any) => {
      const effectiveDueDate = fee.dueDate;

      // For pending fees, show real-time calculated fine
      // For paid/verified fees, show the fine that was locked in at time of payment
      const currentFine = fee.status === 'PENDING' 
        ? calculateLateFine(effectiveDueDate, fee.status, perDayFine, flatFineAfter10Days)
        : fee.lateFine;

      const due = effectiveDueDate;
      const daysLate = Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));

      const receiptNo = generateReceiptNo(fee);
      const effectiveDiscount = fee.discount;

      return {
        ...fee,
        discount: effectiveDiscount,
        daysLate: daysLate > 0 ? daysLate : 0,
        currentLateFine: currentFine,
        totalDue: Math.max(0, fee.amount + currentFine - effectiveDiscount - (fee.paidAmount || 0)),
        receiptNo
      };
    });

    return NextResponse.json({ fees: enrichedFees });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch finances' }, { status: 500 });
  }
}

// ─── POST: assign fee (individual or batch) ─────────────────────────────────
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const validatedData = feeSchema.parse(body);

    const { type, amount, billingMonth, title, studentId, batchId, discount, remarks, dueDate, createdAt } = validatedData;

    const parsed = new Date(`${billingMonth} 12`);
    if (isNaN(parsed.getTime())) {
      return NextResponse.json({ error: 'Invalid billingMonth format. Use e.g. "April 2026"' }, { status: 400 });
    }
    
    const finalDueDate = dueDate ? new Date(dueDate) : new Date(parsed.getFullYear(), parsed.getMonth(), 12);
    const finalCreatedAt = createdAt ? new Date(createdAt) : new Date();
    const currentTotalPayments = await withDbRetry(() => prisma.payment.count());

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
          studentProfile: { select: { baseFee: true, scholarship: true, className: true } }
        }
      }));
      
      let count = 0;
      for (const s of students) {
        // Prevent duplicate for same month
        const existing = await withDbRetry(() => prisma.payment.findFirst({
          where: { studentId: s.id, billingMonth }
        }));
        if (existing) continue;

        const sScholarship = s.studentProfile?.scholarship || 0;
        const sDiscount = Math.max(discount || 0, sScholarship);
        const finalAssignedAmount = amount || s.studentProfile?.baseFee || 0;
        const gradeCode = getGradeLetterCode(s.studentProfile?.className);
        const receiptNo = `${finalCreatedAt.getFullYear()}/${gradeCode}/${1001 + currentTotalPayments + count}`;

        await withDbRetry(() => prisma.payment.create({
          data: {
            studentId: s.id,
            receiptNo,
            amount: finalAssignedAmount,
            billingMonth,
            dueDate: finalDueDate,
            createdAt: finalCreatedAt,
            title: title || 'Monthly Fee',
            status: 'PENDING',
            discount: sDiscount,
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
        select: { id: true, studentProfile: { select: { baseFee: true, scholarship: true, className: true } } }
      }));
      if (!student) return NextResponse.json({ error: 'Student ID not found' }, { status: 404 });

      // Prevent duplicate for same month
      const existing = await withDbRetry(() => prisma.payment.findFirst({
        where: { studentId: student.id, billingMonth }
      }));
      if (existing) return NextResponse.json({ error: `Fee billing has already been generated for this student for ${billingMonth}` }, { status: 400 });

      const sScholarship = student.studentProfile?.scholarship || 0;
      const sBaseFee = student.studentProfile?.baseFee || 0;

      // The UI submits both the base fee (amount) and discount directly.
      let finalAmount = sBaseFee;
      let finalDiscount = sScholarship;

      if (amount !== undefined && amount !== null && typeof amount === 'number' && !isNaN(amount)) {
        finalAmount = amount;
      }
      if (discount !== undefined && discount !== null && typeof discount === 'number' && !isNaN(discount)) {
        finalDiscount = discount;
      }

      const gradeCode = getGradeLetterCode(student.studentProfile?.className);
      const receiptNo = `${finalCreatedAt.getFullYear()}/${gradeCode}/${1001 + currentTotalPayments}`;

      const payment = await withDbRetry(() => prisma.payment.create({
        data: {
          studentId: student.id,
          receiptNo,
          amount: finalAmount,
          billingMonth,
          dueDate: finalDueDate,
          createdAt: finalCreatedAt,
          title: title || 'Monthly Fee',
          status: 'PENDING',
          discount: finalDiscount,
          remarks
        },
      }));

      // Notify Student
      try {
        await withDbRetry(() => prisma.notification.create({
          data: {
            userId: student.id,
            title: `💳 New Fee Assigned: ${title || 'Monthly Fee'}`,
            message: `A new individual fee of ₹${(finalAmount - finalDiscount).toFixed(0)} has been assigned to you for ${billingMonth}. Please pay before ${String(finalDueDate.getDate()).padStart(2, '0')}/${String(finalDueDate.getMonth() + 1).padStart(2, '0')}/${finalDueDate.getFullYear()} to avoid late fines.`,
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
        `Assigned fee of ₹${finalAmount} (Net: ₹${finalAmount - finalDiscount}) to student ${studentId} for month ${billingMonth} (${title})`
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

    const { id, status, paymentMethod, transactionId, discount, remarks, paidAmount, paidAt } = validation.data;

    const currentFee = await withDbRetry(() => prisma.payment.findUnique({ 
      where: { id }
    }));
    if (!currentFee) return NextResponse.json({ error: 'Payment record not found' }, { status: 404 });



    const { perDayFine, flatFineAfter10Days, feeDueDay } = await getLateFineSettings();
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

    // Lock in late fine only when moving FROM PENDING TO PAID/VERIFIED/PAID_ONLINE
    let lateFine = currentFee.lateFine;
    if (currentFee.status === 'PENDING' && (status === 'PAID' || status === 'VERIFIED' || status === 'PAID_ONLINE')) {
      const effectiveDueDate = currentFee.dueDate;
      lateFine = calculateLateFine(effectiveDueDate, 'PENDING', perDayFine, flatFineAfter10Days, paymentDateForFine);
    }

    const effectiveDiscount = discount !== undefined ? discount : currentFee.discount;

    const netDueBefore = currentFee.amount + lateFine - effectiveDiscount;
    const remainingDueBefore = Math.max(0, netDueBefore - (currentFee.paidAmount || 0));

    // Custom paidAmount can be passed.
    // If not passed, we default to remainingDueBefore when collecting cash/cheque/etc from PENDING status.
    // But if verifying an already recorded payment (PAID_ONLINE/PAID status), no new payment is collected (default to 0).
    const defaultPaidAmount = ['PAID_ONLINE', 'PAID'].includes(currentFee.status) ? 0 : remainingDueBefore;
    const inputPaidAmount = paidAmount !== undefined ? paidAmount : defaultPaidAmount;

    // Accumulate total paid amount
    const newTotalPaidAmount = (currentFee.paidAmount || 0) + inputPaidAmount;

    // Decide new status: if accumulated paid is still less than total due, keep status as PENDING (partial payment)
    let finalStatus = status;
    if (status === 'PAID' || status === 'VERIFIED') {
      if (newTotalPaidAmount < netDueBefore - 0.01) {
        finalStatus = 'PENDING';
      }
    }

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
      where: { id },
      data: {
        status: finalStatus,
        paymentMethod,
        transactionId,
        remarks,
        discount: effectiveDiscount,
        lateFine,
        paidAmount: ['PAID', 'VERIFIED', 'PAID_ONLINE', 'PENDING'].includes(finalStatus)
          ? newTotalPaidAmount
          : 0,
        paidAt: finalPaidAt,
        ...((finalStatus === 'PAID' || finalStatus === 'VERIFIED') && {
          collectedBy: session.user.name || session.user.username || 'Admin'
        })
      },
    }));

    // Notify the student that their payment has been verified & recorded in ledger
    if (status === 'VERIFIED' || status === 'PAID') {
      try {
        await withDbRetry(() => prisma.notification.create({
          data: {
            userId: currentFee.studentId,
            title: '✅ Fee Payment Verified',
            message: `Your payment of ₹${(currentFee.amount + lateFine - effectiveDiscount).toFixed(0)} for ${currentFee.title} (${currentFee.billingMonth}) has been verified by the admin and updated in the ledger. You can now download your receipt!`,
            type: 'FEE',
            isRead: false
          }
        }));
      } catch (err) {
        console.error('Failed to send notification to student:', err);
      }
    }

    await logActivity(
      session.user.id,
      'UPDATE_FEE_STATUS',
      `Updated fee status for record ${id} to ${status}. Paid amount: ₹${updated.paidAmount}`
    );

    return NextResponse.json({ success: true, payment: updated });
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
    const effectiveDiscount = discount !== undefined ? parseFloat(String(discount)) : existing.discount;

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
