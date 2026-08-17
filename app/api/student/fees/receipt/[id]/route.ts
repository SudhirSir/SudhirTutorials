export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma, withDbRetry } from '@/lib/prisma';
import { generateReceiptNo } from '@/lib/feeUtils';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const id = resolvedParams?.id;
    if (!id) {
      return NextResponse.json({ error: 'Missing receipt ID' }, { status: 400 });
    }

    const fee = await withDbRetry(() => prisma.payment.findUnique({
      where: { id },
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

    let receiptNo = fee.receiptNo;
    if (!receiptNo || !receiptNo.includes('/')) {
      const countBefore = await withDbRetry(() => prisma.payment.count({
        where: { createdAt: { lte: fee.createdAt } }
      }));
      receiptNo = generateReceiptNo(fee, 1000 + countBefore);
    }

    const enrichedFee = {
      ...fee,
      receiptNo
    };

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

    return NextResponse.json({ fee: enrichedFee });
  } catch (error: any) {
    console.error('Error fetching receipt:', error);
    return NextResponse.json({ error: error?.message || 'Server error fetching receipt' }, { status: 500 });
  }
}
