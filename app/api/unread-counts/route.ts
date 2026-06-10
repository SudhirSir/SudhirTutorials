export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma, withDbRetry } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user) {
      return NextResponse.json({ unreadNotifications: 0, unreadMessages: 0 });
    }

    const userId = session.user.id;

    // Fetch counts in a single database round-trip for optimal speed
    const countsResult = await withDbRetry(async () => {
      const results = await prisma.$queryRaw<any[]>`
        SELECT 
          (SELECT COUNT(*)::int FROM "Notification" WHERE "userId" = ${userId} AND "isRead" = false) as "unreadNotifications",
          (SELECT COUNT(*)::int FROM "Message" WHERE "receiverId" = ${userId} AND "isRead" = false) as "unreadMessages"
      `;
      return results[0];
    });

    const unreadNotifications = countsResult?.unreadNotifications || 0;
    const unreadMessages = countsResult?.unreadMessages || 0;

    return NextResponse.json({ unreadNotifications, unreadMessages });
  } catch (error) {
    console.error('Error fetching unread counts:', error);
    return NextResponse.json({ unreadNotifications: 0, unreadMessages: 0 });
  }
}
