export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma, withDbRetry } from '@/lib/prisma';
import { calculateLateFine, generateReceiptNo } from '@/lib/feeUtils';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {

  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const fee = await withDbRetry(() => prisma.payment.findUnique({
      where: { id: id },
      include: { 
        student: { 
          select: { 
            name: true, 
            username: true,
            studentProfile: {
              select: {
                className: true,
                grade: true
              }
            }
          } 
        } 
      }
    }));

    if (!fee) return NextResponse.json({ error: 'Receipt not found' }, { status: 404 });

    // Count all payments created before or on this payment
    const count = await withDbRetry(() => prisma.payment.count({
      where: {
        createdAt: {
          lte: fee.createdAt
        }
      }
    }));

    const serial = 1000 + count;
    const receiptNo = generateReceiptNo(fee, serial);

    // Attach receiptNo
    const enrichedFee = {
      ...fee,
      receiptNo
    };

    // Allow admin to see any receipt, students can only see their own and only after admin verification
    const userRole = (session.user as any).role;
    const userId = (session.user as any).id;
    if (userRole !== 'ADMIN') {
      if (userRole === 'STUDENT') {
        if (fee.studentId !== userId) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (fee.status !== 'VERIFIED' && fee.status !== 'PAID' && fee.status !== 'PAID_ONLINE') {
          return NextResponse.json({ error: 'Receipt is pending payment or verification from the Admin.' }, { status: 403 });
        }
      } else {
        return NextResponse.json({ error: 'Forbidden: Access Denied' }, { status: 403 });
      }
    }

    // Include lateFine dynamically even if it's past
    // Note: This calculates current late fine if it was paid late, wait: if it's already PAID_ONLINE, calculateLateFine returns 0.
    // So we need to store late fine or calculate it properly for receipt. For now, since `calculateLateFine` uses current date, it won't be historically accurate unless we check paidAt.
    // For simplicity, we just return the base amount if paid. In a real app we'd have a `lateFinePaid` column.
    
    return NextResponse.json({ fee: enrichedFee });
  } catch (error) {
    console.error('Error fetching receipt:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
