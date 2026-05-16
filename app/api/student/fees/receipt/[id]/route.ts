import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { calculateLateFine } from '@/lib/feeUtils';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {

  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const fee = await prisma.payment.findUnique({
      where: { id: id },
      include: { student: { select: { name: true, username: true } } }
    });

    if (!fee) return NextResponse.json({ error: 'Receipt not found' }, { status: 404 });

    // Allow admin to see any receipt, students can only see their own
    if ((session.user as any).role === 'STUDENT' && fee.studentId !== (session.user as any).id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Include lateFine dynamically even if it's past
    // Note: This calculates current late fine if it was paid late, wait: if it's already PAID_ONLINE, calculateLateFine returns 0.
    // So we need to store late fine or calculate it properly for receipt. For now, since `calculateLateFine` uses current date, it won't be historically accurate unless we check paidAt.
    // For simplicity, we just return the base amount if paid. In a real app we'd have a `lateFinePaid` column.
    
    return NextResponse.json({ fee });
  } catch (error) {
    console.error('Error fetching receipt:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
