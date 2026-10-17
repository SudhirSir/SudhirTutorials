export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma, withDbRetry } from '@/lib/prisma';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, purchaseId } = await req.json();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !purchaseId) {
      return NextResponse.json({ error: 'Invalid payment payload.' }, { status: 400 });
    }

    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
      return NextResponse.json({ error: 'Server misconfiguration.' }, { status: 500 });
    }

    // Verify signature
    const generatedSignature = crypto
      .createHmac('sha256', secret)
      .update(razorpay_order_id + '|' + razorpay_payment_id)
      .digest('hex');

    if (generatedSignature !== razorpay_signature) {
      return NextResponse.json({ error: 'Invalid payment signature.' }, { status: 400 });
    }

    // Verify purchase ownership
    const purchase = await withDbRetry(() => prisma.storePurchase.findUnique({
      where: { id: purchaseId }
    }));

    if (!purchase) {
      return NextResponse.json({ error: 'Purchase record not found.' }, { status: 404 });
    }

    if (purchase.studentId !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized: You do not own this purchase record.' }, { status: 403 });
    }

    // Update purchase record
    await withDbRetry(() => prisma.storePurchase.update({
      where: { id: purchaseId },
      data: {
        status: 'SUCCESS',
        paymentId: razorpay_payment_id
      }
    }));

    // Invalidate cached purchases
    try {
      const { appCache } = await import('@/lib/cache');
      appCache.del(`student:purchases:${session.user.id}`);
    } catch (e) {}

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Payment verification failed.' }, { status: 500 });
  }
}
