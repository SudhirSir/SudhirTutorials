export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma, withDbRetry } from '@/lib/prisma';
import { messageEmitter } from '@/lib/events';

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { senderId, groupId } = await req.json();

    if (groupId) {
      await withDbRetry(() => prisma.message.updateMany({
        where: {
          groupId,
          senderId: { not: session.user.id },
          isRead: false
        },
        data: { isRead: true }
      }));

      // Get group members to dispatch SSE
      const groupMembers = await withDbRetry(() => prisma.groupMember.findMany({
        where: { groupId },
        select: { userId: true }
      }));
      const memberIds = groupMembers.map(m => m.userId);

      messageEmitter.emit('message', {
        type: 'read',
        groupId,
        senderId: session.user.id,
        memberIds
      });
    } else if (senderId) {
      await withDbRetry(() => prisma.message.updateMany({
        where: {
          senderId,
          receiverId: session.user.id,
          isRead: false
        },
        data: { isRead: true }
      }));

      // Emit read event to notify the sender
      messageEmitter.emit('message', {
        type: 'read',
        senderId,
        receiverId: session.user.id
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
