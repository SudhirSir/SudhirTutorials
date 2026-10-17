export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma, withDbRetry } from '@/lib/prisma';
import { appCache } from '@/lib/cache';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const mode = searchParams.get('mode');

    if (mode === 'customers') {
      const customers = await withDbRetry(() => prisma.user.findMany({
        where: { isStoreUser: true },
        select: {
          id: true,
          name: true,
          username: true,
          createdAt: true,
          studentProfile: {
            select: {
              email: true,
              phone: true
            }
          },
          _count: {
            select: { storePurchases: true }
          },
          storePurchases: {
            select: {
              id: true,
              amount: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }));
      return NextResponse.json({ customers }, {
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
      });
    }

    const purchases = await withDbRetry(() => prisma.storePurchase.findMany({
      include: {
        student: { select: { name: true, username: true } },
        item: { select: { title: true, type: true, className: true, board: true } }
      },
      orderBy: { createdAt: 'desc' }
    }));

    // Map properties for backward and forward compatibility
    const mappedPurchases = purchases.map((p: any) => ({
      ...p,
      amount: p.amount ?? 0,
      amountPaid: p.amount ?? 0,
      student: p.student,
      user: p.student,
      item: p.item,
      storeItem: p.item
    }));

    return NextResponse.json({ purchases: mappedPurchases }, {
      headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
    });
  } catch (error) {
    console.error('Error fetching sales/customers data:', error);
    return NextResponse.json({ error: 'Failed to fetch sales/customers data' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { purchaseId, status } = await req.json();
    if (!purchaseId || !['SUCCESS', 'FAILED', 'PENDING'].includes(status)) {
      return NextResponse.json({ error: 'Valid purchaseId and status are required' }, { status: 400 });
    }

    const updated = await withDbRetry(() => prisma.storePurchase.update({
      where: { id: purchaseId },
      data: { status },
      include: {
        student: { select: { id: true, name: true, username: true } },
        item: { select: { title: true } }
      }
    }));

    appCache.invalidate('store:');
    appCache.invalidate('admin:store');

    // If approved, notify the student immediately
    if (status === 'SUCCESS' && updated.student?.id) {
      try {
        await withDbRetry(() => prisma.notification.create({
          data: {
            userId: updated.student.id,
            senderId: session.user.id,
            title: `🎉 Access Unlocked: ${updated.item?.title || 'Store Item'}`,
            message: `Your payment has been verified by the institute! Access to "${updated.item?.title || 'Store Item'}" is now fully unlocked in your library.`,
            type: 'ANNOUNCEMENT'
          }
        }));
      } catch (ne) {
        console.error("Failed to notify student of purchase approval:", ne);
      }
    }

    return NextResponse.json({ success: true, purchase: updated });
  } catch (error: any) {
    console.error('Error updating purchase status:', error);
    return NextResponse.json({ error: error?.message || 'Failed to update purchase status' }, { status: 500 });
  }
}
