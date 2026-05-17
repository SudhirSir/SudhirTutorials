import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// GET: Fetch current user's notifications
export async function GET() {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const notifications = await prisma.notification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({ notifications });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST: Admin/Teacher sends a notification to one or more users
const sendSchema = z.object({
  title: z.string().min(1).max(100),
  message: z.string().min(1).max(500),
  type: z.string().default('SYSTEM'),
  targetRole: z.string().optional(), // 'STUDENT', 'TEACHER', or 'ALL'
  targetUserId: z.string().optional(), // single user, if provided
});

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Only admins and teachers can send notifications
    if (!['ADMIN', 'TEACHER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const validation = sendSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 });
    }

    const { title, message, type, targetRole, targetUserId } = validation.data;

    let targetIds: string[] = [];

    if (targetUserId) {
      targetIds = [targetUserId];
    } else if (targetRole && targetRole !== 'ALL') {
      const users = await prisma.user.findMany({
        where: { role: targetRole },
        select: { id: true },
      });
      targetIds = users.map(u => u.id);
    } else {
      // Broadcast to all students and teachers (not admins)
      const users = await prisma.user.findMany({
        where: { role: { in: ['STUDENT', 'TEACHER'] } },
        select: { id: true },
      });
      targetIds = users.map(u => u.id);
    }

    if (targetIds.length === 0) {
      return NextResponse.json({ error: 'No target users found' }, { status: 400 });
    }

    await prisma.notification.createMany({
      data: targetIds.map(userId => ({ userId, title, message, type })),
    });

    return NextResponse.json({ success: true, sent: targetIds.length });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// PATCH: Mark notifications as read
export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { ids } = body; // array of notification IDs, or empty to mark all

    if (ids && ids.length > 0) {
      await prisma.notification.updateMany({
        where: { id: { in: ids }, userId: session.user.id },
        data: { isRead: true },
      });
    } else {
      await prisma.notification.updateMany({
        where: { userId: session.user.id, isRead: false },
        data: { isRead: true },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
