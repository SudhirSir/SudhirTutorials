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

    let itemPrice = 0;
    let targetItemId = itemId;

    if (String(itemId).startsWith('mocktest-')) {
      const rawMockId = String(itemId).replace(/^mocktest-/, '');
      const mockTest = await withDbRetry(() => prisma.chapterMockTest.findUnique({
        where: { id: rawMockId }
      }));
      if (!mockTest || !mockTest.isPublished || !mockTest.isStoreItem) {
        return NextResponse.json({ error: 'Mock Test package unavailable.' }, { status: 404 });
      }
      itemPrice = mockTest.storePrice || 0;
    } else {
      const item = await withDbRetry(() => prisma.storeItem.findUnique({
        where: { id: itemId }
      }));

      if (!item || !item.isPublished) {
        return NextResponse.json({ error: 'Item not found or unavailable.' }, { status: 404 });
      }
      itemPrice = item.price;
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

    // Create successful purchase record
    const purchase = await withDbRetry(() => prisma.storePurchase.create({
      data: {
        studentId: session.user.id,
        itemId: itemId,
        amount: itemPrice,
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
