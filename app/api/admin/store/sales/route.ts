export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma, withDbRetry } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
    return NextResponse.json({ error: 'Failed to fetch sales' }, { status: 500 });
  }
}
