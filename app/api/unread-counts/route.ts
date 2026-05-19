import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user) {
      return NextResponse.json({ unreadNotifications: 0, unreadMessages: 0 });
    }

    const userId = session.user.id;

    // Fetch counts in parallel for optimal speed
    const [unreadNotifications, unreadMessages] = await Promise.all([
      prisma.notification.count({
        where: {
          userId,
          isRead: false
        }
      }),
      prisma.message.count({
        where: {
          receiverId: userId,
          isRead: false
        }
      })
    ]);

    return NextResponse.json({ unreadNotifications, unreadMessages });
  } catch (error) {
    console.error('Error fetching unread counts:', error);
    return NextResponse.json({ unreadNotifications: 0, unreadMessages: 0 });
  }
}
