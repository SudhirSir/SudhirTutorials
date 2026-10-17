export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { prisma, withDbRetry } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { appCache } from '@/lib/cache';

export async function GET() {
  try {
    const regularItems = await appCache.getOrSet('store:published_items', () =>
      withDbRetry(() => prisma.storeItem.findMany({
        where: { 
          isPublished: true,
          NOT: { id: { startsWith: 'mocktest-' } }
        },
        include: {
          onlineTests: {
            select: { id: true, durationMinutes: true, totalMarks: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      })),
      60
    );

    const storeMockTests = await withDbRetry(() => prisma.chapterMockTest.findMany({
      where: { isPublished: true, isStoreItem: true },
      orderBy: { createdAt: 'desc' }
    }));

    const formattedMockTestItems = storeMockTests.map(m => ({
      id: `mocktest-${m.id}`,
      mockTestId: m.id,
      title: m.title ? `${m.title} (${m.chapterName})` : `${m.chapterName} Mock Test`,
      type: 'MOCK_TEST',
      price: m.storePrice || 0,
      className: m.className,
      board: m.board,
      description: m.description || `Chapter Mock Test for Class ${m.className} ${m.subject} (${m.board}). Duration: ${m.durationMinutes} Mins.`,
      isPublished: true,
      createdAt: m.createdAt
    }));

    const itemMap = new Map<string, any>();
    regularItems.forEach((item: any) => itemMap.set(item.id, item));
    formattedMockTestItems.forEach((item: any) => itemMap.set(item.id, item));
    const items = Array.from(itemMap.values());

    let purchasedItemIds: string[] = [];
    let pendingItemIds: string[] = [];
    const session = await getServerSession(authOptions) as any;
    if (session?.user?.id && session.user.role === 'STUDENT') {
      const [successfulPurchases, pendingPurchases] = await Promise.all([
        withDbRetry(() => prisma.storePurchase.findMany({
          where: { studentId: session.user.id, status: 'SUCCESS' },
          select: { itemId: true }
        })),
        withDbRetry(() => prisma.storePurchase.findMany({
          where: { studentId: session.user.id, status: 'PENDING' },
          select: { itemId: true }
        }))
      ]);
      purchasedItemIds = successfulPurchases.map((p: any) => p.itemId);
      pendingItemIds = pendingPurchases.map((p: any) => p.itemId);
    }

    return NextResponse.json({ items, purchasedItemIds, pendingItemIds });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch public store items' }, { status: 500 });
  }
}
