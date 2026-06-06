export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma, withDbRetry } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const [unreadMessages, unreadNotifications] = await withDbRetry(() => Promise.all([
      withDbRetry(() => prisma.message.count({
        where: { receiverId: session.user.id, isRead: false }
      })),
      withDbRetry(() => prisma.notification.count({
        where: { userId: session.user.id, isRead: false }
      }))
    ]));

    return NextResponse.json({ unreadMessages, unreadNotifications });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

