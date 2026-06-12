export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma, withDbRetry } from '@/lib/prisma';
import { messageEmitter } from '@/lib/events';
import { z } from 'zod';

const createGroupSchema = z.object({
  name: z.string().min(1).max(100),
  memberIds: z.array(z.string()).min(1),
});

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const validation = createGroupSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 });
    }

    const { name, memberIds } = validation.data;
    const creatorId = session.user.id;

    // Deduplicate member IDs and ensure creator is included
    const allMembers = Array.from(new Set([creatorId, ...memberIds]));

    // Create the group and its members inside a transaction
    const group = await withDbRetry(() => prisma.$transaction(async (tx) => {
      // 1. Create the ChatGroup
      const chatGroup = await tx.chatGroup.create({
        data: {
          name,
          createdById: creatorId,
        }
      });

      // 2. Create the GroupMember mappings
      await tx.groupMember.createMany({
        data: allMembers.map((userId) => ({
          groupId: chatGroup.id,
          userId,
          isAdmin: userId === creatorId,
        }))
      });

      // 3. Create the initial system message
      await tx.message.create({
        data: {
          senderId: creatorId,
          groupId: chatGroup.id,
          content: `📢 Group "${name}" created.`,
        }
      });

      return chatGroup;
    }));

    // Fetch the newly created group with members to return to client
    const fullGroup = await withDbRetry(() => prisma.chatGroup.findUnique({
      where: { id: group.id },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                role: true,
              }
            }
          }
        }
      }
    }));

    // Emit event via SSE so members can see the group chat update immediately
    // Fetch the system message we just created to send as the first message
    const initialMsg = await withDbRetry(() => prisma.message.findFirst({
      where: { groupId: group.id },
      orderBy: { createdAt: 'desc' },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            username: true,
            role: true,
            photoUrl: true,
          }
        }
      }
    }));

    if (initialMsg) {
      // Format the initial message with simple sender details
      const formattedMessage = {
        ...initialMsg,
        group: {
          id: group.id,
          name: name,
          photoUrl: null,
        }
      };

      messageEmitter.emit('message', {
        type: 'create',
        message: formattedMessage,
        senderId: creatorId,
        groupId: group.id,
        memberIds: allMembers,
      });
    }

    return NextResponse.json({ success: true, group: fullGroup });
  } catch (error) {
    console.error('[Groups API] Error creating group:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
