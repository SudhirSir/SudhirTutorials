export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { prisma, withDbRetry } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function GET() {
  try {
    const items = await withDbRetry(() => prisma.storeItem.findMany({
      where: { isPublished: true },
      include: {
        onlineTests: {
          select: { id: true, durationMinutes: true, totalMarks: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    }));

    let purchasedItemIds: string[] = [];
    const session = await getServerSession(authOptions) as any;
    if (session?.user?.id && session.user.role === 'STUDENT') {
      const purchases = await withDbRetry(() => prisma.storePurchase.findMany({
        where: { studentId: session.user.id, status: 'SUCCESS' },
        select: { itemId: true }
      }));
      purchasedItemIds = purchases.map((p: any) => p.itemId);
    }

    return NextResponse.json({ items, purchasedItemIds });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch public store items' }, { status: 500 });
  }
}
