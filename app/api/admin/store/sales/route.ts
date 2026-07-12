export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma, withDbRetry } from '@/lib/prisma';

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
          storePurchases: {
            select: {
              id: true,
              amount: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }));
      return NextResponse.json({ customers });
    }

    const purchases = await withDbRetry(() => prisma.storePurchase.findMany({
      include: {
        student: { select: { name: true, username: true } },
        item: { select: { title: true, type: true, className: true, board: true } }
      },
      orderBy: { createdAt: 'desc' }
    }));

    return NextResponse.json({ purchases });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch sales/customers data' }, { status: 500 });
  }
}
