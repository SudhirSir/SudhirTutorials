import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateLateFine } from '@/lib/feeUtils';
import { z } from 'zod';

const feeSchema = z.object({
  type: z.enum(['INDIVIDUAL', 'BATCH']),
  amount: z.union([z.string(), z.number()]).transform(val => typeof val === 'string' ? parseFloat(val) : val),
  billingMonth: z.string().min(1, "Month is required"),
  title: z.string().optional().default("Monthly Fee"),
  studentId: z.string().optional(),
});

const updateStatusSchema = z.object({
  id: z.string().min(1),
  status: z.enum(['PENDING', 'PAID', 'PAID_ONLINE', 'VERIFIED', 'FAILED']),
});

// ─── GET: list every payment with computed late-fine ───────────────────────
export async function GET() {
  try {
    const raw = await prisma.payment.findMany({
      include: { student: { select: { name: true, username: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const fees = raw.map(fee => {
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
        totalAmount: fee.amount + lateFine,
      };
    });

    return NextResponse.json({ fees });
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
      return NextResponse.json({ error: validation.error.errors[0].message }, { status: 400 });
    }

    const { type, amount, billingMonth, title, studentId } = validation.data;

    // Parse billingMonth like "April 2026" → Due date = 12th of that month
    const parsed = new Date(`${billingMonth} 12`);
    if (isNaN(parsed.getTime())) {
      return NextResponse.json({ error: 'Invalid billingMonth format. Use e.g. "April 2026"' }, { status: 400 });
    }
    const dueDate = new Date(parsed.getFullYear(), parsed.getMonth(), 12);

    if (type === 'BATCH') {
      const students = await prisma.user.findMany({ 
        where: { role: 'STUDENT' },
        include: { studentProfile: true }
      });
      
      const payments = students.map((s: any) => ({
        studentId: s.id,
        amount: parseFloat(amount) || s.studentProfile?.baseFee || 0,
        billingMonth,
        dueDate,
        title: title || 'Monthly Fee',
        status: 'PENDING',
      }));

      await prisma.payment.createMany({ data: payments });
      return NextResponse.json({ success: true, count: payments.length });
    } else {
      // Individual
      const student = await prisma.user.findUnique({ 
        where: { username: studentId },
        include: { studentProfile: true }
      });
      if (!student) {
        return NextResponse.json({ error: 'Student ID not found' }, { status: 404 });
      }

      const finalAmount = parseFloat(amount) || student.studentProfile?.baseFee || 0;

      const payment = await prisma.payment.create({
        data: {
          studentId: student.id,
          amount: finalAmount,
          billingMonth,
          dueDate,
          title: title || 'Monthly Fee',
          status: 'PENDING',
        },
      });
      return NextResponse.json({ success: true, payment });
    }
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to assign fees' }, { status: 500 });
  }
}

// ─── PATCH: update fee status ────────────────────────────────────────────────
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const validation = updateStatusSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: validation.error.errors[0].message }, { status: 400 });
    }

    const { id, status } = validation.data;
    const updated = await prisma.payment.update({
      where: { id },
      data: {
        status,
        paidAt: status === 'PAID' || status === 'VERIFIED' ? new Date() : null,
      },
    });
    return NextResponse.json({ success: true, payment: updated });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update fee status' }, { status: 500 });
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
