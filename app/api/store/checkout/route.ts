export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma, withDbRetry } from '@/lib/prisma';
import Razorpay from 'razorpay';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user) {
      return NextResponse.json({ error: 'You must be logged in to purchase.' }, { status: 401 });
    }

    const { itemId } = await req.json();
    if (!itemId) {
      return NextResponse.json({ error: 'Missing item ID.' }, { status: 400 });
    }

    const item = await withDbRetry(() => prisma.storeItem.findUnique({
      where: { id: itemId }
    }));

    if (!item || !item.isPublished) {
      return NextResponse.json({ error: 'Item not found or unavailable.' }, { status: 404 });
    }

    // Check if already purchased
    const existingPurchase = await withDbRetry(() => prisma.storePurchase.findFirst({
      where: {
        studentId: session.user.id,
        itemId: itemId,
        status: 'SUCCESS'
      }
    }));

    if (existingPurchase) {
      return NextResponse.json({ error: 'You have already purchased this item.' }, { status: 400 });
    }

    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      console.error('Razorpay credentials missing in environment variables.');
      return NextResponse.json({ error: 'Payment gateway not configured.' }, { status: 500 });
    }

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const amountInPaise = Math.round(item.price * 100);

    const orderOptions = {
      amount: amountInPaise,
      currency: 'INR',
      receipt: `store_rec_${Date.now()}`
    };

    const order = await razorpay.orders.create(orderOptions);

    // Create pending purchase record
    const purchase = await withDbRetry(() => prisma.storePurchase.create({
      data: {
        studentId: session.user.id,
        itemId: item.id,
        amount: item.price,
        status: 'PENDING',
        paymentId: order.id
      }
    }));

    return NextResponse.json({ 
      success: true, 
      order, 
      purchaseId: purchase.id,
      keyId: process.env.RAZORPAY_KEY_ID
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to initiate checkout.' }, { status: 500 });
  }
}
