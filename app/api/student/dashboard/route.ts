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

    // Fetch batches the student is enrolled in
    const user = await prisma.user.findUnique({
      where: { id: studentId },
      include: {
        studentBatches: {
          include: {
            course: { select: { name: true } },
            teachers: { select: { name: true } },
            schedules: true
          }
        },
        payments: {
          orderBy: { dueDate: 'asc' },
          take: 1, // Get the most urgent or recent fee
          where: { status: 'PENDING' }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Process fee status for dashboard (simple highlight)
    let feeHighlight = null;
    if (user.payments.length > 0) {
      const pendingPayment = user.payments[0];
      const lateFine = calculateLateFine(pendingPayment.dueDate, pendingPayment.status);
      feeHighlight = {
        amount: pendingPayment.amount + lateFine,
        dueDate: pendingPayment.dueDate,
        isOverdue: lateFine > 0,
        status: pendingPayment.status
      };
    }

    return NextResponse.json({ 
      name: user.name,
      batches: user.studentBatches,
      feeHighlight
    });
  } catch (error) {
    console.error('Error fetching student dashboard:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}
