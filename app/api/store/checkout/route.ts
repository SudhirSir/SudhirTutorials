export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma, withDbRetry } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user) {
      return NextResponse.json({ error: 'You must be logged in to purchase.' }, { status: 401 });
    }

    const { itemId, transactionId } = await req.json();
    if (!itemId || !transactionId) {
      return NextResponse.json({ error: 'Item ID and Transaction ID are required.' }, { status: 400 });
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

    // Create successful purchase record with direct transaction ID verification
    const purchase = await withDbRetry(() => prisma.storePurchase.create({
      data: {
        studentId: session.user.id,
        itemId: item.id,
        amount: item.price,
        status: 'SUCCESS',
        paymentId: transactionId
      }
    }));

    return NextResponse.json({ 
      success: true, 
      purchaseId: purchase.id
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to complete checkout.' }, { status: 500 });
  }
}
