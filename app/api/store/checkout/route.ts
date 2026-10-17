export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma, withDbRetry } from '@/lib/prisma';
import { appCache } from '@/lib/cache';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: 'You must be logged in to purchase.' }, { status: 401 });
    }

    const dbUser = await withDbRetry(() => prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true }
    }));
    if (!dbUser) {
      return NextResponse.json({ error: 'User account not found. Please log in again.' }, { status: 401 });
    }

    const { itemId, transactionId } = await req.json();
    if (!itemId || !transactionId) {
      return NextResponse.json({ error: 'Item ID and Transaction ID are required.' }, { status: 400 });
    }

    let itemPrice = 0;

    let itemTitle = 'Store Item';
    if (String(itemId).startsWith('mocktest-')) {
      const rawMockId = String(itemId).replace(/^mocktest-/, '');
      const mockTest = await withDbRetry(() => prisma.chapterMockTest.findUnique({
        where: { id: rawMockId }
      }));
      if (!mockTest || !mockTest.isPublished || !mockTest.isStoreItem) {
        return NextResponse.json({ error: 'Mock Test package unavailable.' }, { status: 404 });
      }
      itemPrice = mockTest.storePrice || 0;
      itemTitle = mockTest.title ? `${mockTest.title} (${mockTest.chapterName})` : `${mockTest.chapterName} Mock Test`;

      // Ensure a corresponding StoreItem exists in PostgreSQL so that foreign key constraint is satisfied
      await withDbRetry(() => prisma.storeItem.upsert({
        where: { id: itemId },
        update: {
          title: itemTitle,
          price: itemPrice,
          type: 'MOCK_TEST',
          className: mockTest.className,
          board: mockTest.board,
          isPublished: true
        },
        create: {
          id: itemId,
          title: itemTitle,
          price: itemPrice,
          type: 'MOCK_TEST',
          className: mockTest.className,
          board: mockTest.board,
          description: mockTest.description || `Chapter Mock Test for Class ${mockTest.className} ${mockTest.subject} (${mockTest.board}).`,
          isPublished: true
        }
      }));
    } else {
      const item = await withDbRetry(() => prisma.storeItem.findUnique({
        where: { id: itemId }
      }));

      if (!item || !item.isPublished) {
        return NextResponse.json({ error: 'Item not found or unavailable.' }, { status: 404 });
      }
      itemPrice = item.price;
      itemTitle = item.title;
    }

    // Check if already purchased or pending
    const existingPurchase = await withDbRetry(() => prisma.storePurchase.findFirst({
      where: {
        studentId: session.user.id,
        itemId: itemId,
        status: { in: ['SUCCESS', 'PENDING'] }
      }
    }));

    if (existingPurchase) {
      if (existingPurchase.status === 'SUCCESS') {
        return NextResponse.json({ error: 'You have already purchased this item and have full access.' }, { status: 400 });
      }
      return NextResponse.json({ error: 'You have already submitted a payment reference for this item. It is currently pending admin verification.' }, { status: 400 });
    }

    // Create purchase record in PENDING status awaiting Admin verification
    const purchase = await withDbRetry(() => prisma.storePurchase.create({
      data: {
        studentId: session.user.id,
        itemId: itemId,
        amount: itemPrice,
        status: 'PENDING',
        paymentId: transactionId
      }
    }));

    appCache.invalidate('store:');
    appCache.invalidate('admin:store');

    // Notify admins about the new pending store purchase
    try {
      const admins = await withDbRetry(() => prisma.user.findMany({
        where: { role: 'ADMIN' },
        select: { id: true }
      }));
      if (admins.length > 0) {
        await withDbRetry(() => prisma.notification.createMany({
          data: admins.map((adm: any) => ({
            userId: adm.id,
            senderId: session.user.id,
            title: `🛍️ New Store Purchase to Verify: ₹${itemPrice}`,
            message: `Student "${session.user.name || session.user.username}" submitted transaction ID "${transactionId}" for "${itemTitle}". Please verify and unlock access in Store Manager.`,
            type: 'FEE'
          }))
        }));
      }
    } catch (notifErr) {
      console.warn("Could not notify admin of store purchase (non-fatal):", notifErr);
    }

    return NextResponse.json({ 
      success: true, 
      status: 'PENDING',
      purchaseId: purchase.id,
      amount: purchase.amount,
      message: 'Payment reference submitted! Access will be granted once verified by Admin.'
    });
  } catch (error: any) {
    console.error('[Store Checkout Error]:', error);
    return NextResponse.json({ error: error?.message || 'Failed to complete checkout.' }, { status: 500 });
  }
}
