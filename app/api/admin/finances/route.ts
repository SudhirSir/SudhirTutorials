export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateLateFine } from '@/lib/feeUtils';
import { z } from 'zod';

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
});

// ─── GET: list every payment ───────────────────────
export async function GET(req: Request) {
  try {
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
      const u = await prisma.user.findUnique({ where: { username: studentUsername } });
      if (u) where.studentId = u.id;
    }

    const fees = await prisma.payment.findMany({
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
              }
            }
          } 
        } 
      },
      orderBy: { createdAt: 'desc' },
    });

    const enrichedFees = fees.map((fee: any) => {
      // For pending fees, show real-time calculated fine
      // For paid/verified fees, show the fine that was locked in at time of payment
      const currentFine = fee.status === 'PENDING' 
        ? calculateLateFine(fee.dueDate, fee.status)
        : fee.lateFine;

      const now = new Date();
      const due = new Date(fee.dueDate);
      const daysLate = Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));

      // Fast fallback receipt format, full sequential serial computed only when requesting/downloading receipt
      const receiptNo = `REC-${fee.id.slice(-6).toUpperCase()}`;

      return {
        ...fee,
        daysLate: daysLate > 0 ? daysLate : 0,
        currentLateFine: currentFine,
        totalDue: fee.amount + currentFine - fee.discount,
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

      const students = await prisma.user.findMany({ 
        where,
        select: {
          id: true,
          username: true,
          studentProfile: { select: { baseFee: true } }
        }
      });
      
      let count = 0;
      for (const s of students) {
        // Prevent duplicate for same month and title
        const existing = await prisma.payment.findFirst({
          where: { studentId: s.id, billingMonth, title: title || 'Monthly Fee' }
        });
        if (existing) continue;

        const finalAssignedAmount = amount || s.studentProfile?.baseFee || 0;
        await prisma.payment.create({
          data: {
            studentId: s.id,
            amount: finalAssignedAmount,
            billingMonth,
            dueDate: finalDueDate,
            createdAt: finalCreatedAt,
            title: title || 'Monthly Fee',
            status: 'PENDING',
            discount: discount || 0,
            remarks
          }
        });

        // Notify Student
        try {
          await prisma.notification.create({
            data: {
              userId: s.id,
              title: `💳 New Fee Assigned: ${title || 'Monthly Fee'}`,
              message: `A new fee of ₹${finalAssignedAmount.toFixed(0)} has been assigned to you for ${billingMonth}. Please pay before ${finalDueDate.toLocaleDateString()} to avoid late fines.`,
              type: 'FEE',
              isRead: false
            }
          });
        } catch (err) {
          console.error("Failed to notify student of fee assignment:", err);
        }

        count++;
      }

      return NextResponse.json({ success: true, count });
    } else {
      // Individual
      const student = await prisma.user.findUnique({ 
        where: { username: studentId },
        select: { id: true, studentProfile: { select: { baseFee: true } } }
      });
      if (!student) return NextResponse.json({ error: 'Student ID not found' }, { status: 404 });

      // Prevent duplicate
      const existing = await prisma.payment.findFirst({
        where: { studentId: student.id, billingMonth, title: title || 'Monthly Fee' }
      });
      if (existing) return NextResponse.json({ error: 'Fee already assigned for this month' }, { status: 400 });

      const finalAssignedAmount = amount || student.studentProfile?.baseFee || 0;
      const payment = await prisma.payment.create({
        data: {
          studentId: student.id,
          amount: finalAssignedAmount,
          billingMonth,
          dueDate: finalDueDate,
          createdAt: finalCreatedAt,
          title: title || 'Monthly Fee',
          status: 'PENDING',
          discount: discount || 0,
          remarks
        },
      });

      // Notify Student
      try {
        await prisma.notification.create({
          data: {
            userId: student.id,
            title: `💳 New Fee Assigned: ${title || 'Monthly Fee'}`,
            message: `A new individual fee of ₹${finalAssignedAmount.toFixed(0)} has been assigned to you for ${billingMonth}. Please pay before ${finalDueDate.toLocaleDateString()} to avoid late fines.`,
            type: 'FEE',
            isRead: false
          }
        });
      } catch (err) {
        console.error("Failed to notify student of fee assignment:", err);
      }

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
    const body = await req.json();
    const validation = updateStatusSchema.safeParse(body);
    if (!validation.success) return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 });

    const { id, status, paymentMethod, transactionId, discount, remarks } = validation.data;

    const currentFee = await prisma.payment.findUnique({ where: { id } });
    if (!currentFee) return NextResponse.json({ error: 'Payment record not found' }, { status: 404 });

    // Lock in late fine only when moving FROM PENDING TO PAID/VERIFIED
    let lateFine = currentFee.lateFine;
    if (currentFee.status === 'PENDING' && (status === 'PAID' || status === 'VERIFIED')) {
      lateFine = calculateLateFine(currentFee.dueDate, 'PENDING');
    }

    const updated = await prisma.payment.update({
      where: { id },
      data: {
        status,
        paymentMethod,
        transactionId,
        remarks,
        discount: discount !== undefined ? discount : currentFee.discount,
        lateFine,
        paidAmount: status === 'PAID' || status === 'VERIFIED' ? (currentFee.amount + lateFine - (discount ?? currentFee.discount)) : 0,
        paidAt: status === 'PAID' || status === 'VERIFIED' ? new Date() : null,
      },
    });

    // Notify the student that their payment has been verified & recorded in ledger
    if (status === 'VERIFIED' || status === 'PAID') {
      try {
        await prisma.notification.create({
          data: {
            userId: currentFee.studentId,
            title: '✅ Fee Payment Verified',
            message: `Your payment of ₹${(currentFee.amount + lateFine - (discount ?? currentFee.discount)).toFixed(0)} for ${currentFee.title} (${currentFee.billingMonth}) has been verified by the admin and updated in the ledger. You can now download your receipt!`,
            type: 'FEE',
            isRead: false
          }
        });
      } catch (err) {
        console.error('Failed to send notification to student:', err);
      }
    }

    return NextResponse.json({ success: true, payment: updated });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to update fee status' }, { status: 500 });
  }
}

// ─── PUT: edit any payment/fee record details (admin corrective editing) ───────
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, title, billingMonth, amount, discount, lateFine, status, dueDate, remarks } = body;
    if (!id) return NextResponse.json({ error: 'Missing payment ID' }, { status: 400 });

    const existing = await prisma.payment.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Payment record not found' }, { status: 404 });

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (billingMonth !== undefined) updateData.billingMonth = billingMonth;
    if (amount !== undefined) updateData.amount = parseFloat(String(amount));
    if (discount !== undefined) updateData.discount = parseFloat(String(discount));
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
      if (status === 'PAID' || status === 'VERIFIED') {
        const finalAmount = (updateData.amount ?? existing.amount);
        const finalFine = (updateData.lateFine ?? existing.lateFine);
        const finalDiscount = (updateData.discount ?? existing.discount);
        updateData.paidAmount = Math.max(0, finalAmount + finalFine - finalDiscount);
        updateData.paidAt = new Date();
      } else if (status === 'PENDING') {
        updateData.paidAmount = 0;
        updateData.paidAt = null;
      }
    }

    const updated = await prisma.payment.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, payment: updated });
  } catch (error) {
    console.error('Error updating payment:', error);
    return NextResponse.json({ error: 'Failed to update payment details' }, { status: 500 });
  }
}

// ─── DELETE: remove incorrect fee entry ──────────────────────────────────────
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing payment ID' }, { status: 400 });
    await prisma.payment.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete payment' }, { status: 500 });
  }
}
