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

    const countsResult = await withDbRetry(async () => {
      const results = await prisma.$queryRaw<any[]>`
        SELECT 
          (SELECT COUNT(*)::int FROM "Message" WHERE "receiverId" = ${session.user.id} AND "isRead" = false) as "unreadMessages",
          (SELECT COUNT(*)::int FROM "Notification" WHERE "userId" = ${session.user.id} AND "isRead" = false) as "unreadNotifications"
      `;
      return results[0];
    });

    const unreadMessages = countsResult?.unreadMessages || 0;
    const unreadNotifications = countsResult?.unreadNotifications || 0;

    return NextResponse.json({ unreadMessages, unreadNotifications });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

