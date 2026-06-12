export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma, withDbRetry } from '@/lib/prisma';
import { sendPushNotification } from '@/lib/push';
import { messageEmitter } from '@/lib/events';
import { z } from 'zod';

const messageSchema = z.object({
  receiverId: z.string().optional(),
  groupId: z.string().optional(),
  content: z.string().min(1).max(5000000),
}).refine(data => data.receiverId || data.groupId, {
  message: "Either receiverId or groupId must be provided",
  path: ["receiverId"]
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Get groups the user belongs to
    const memberships = await withDbRetry(() => prisma.groupMember.findMany({
      where: { userId: session.user.id },
      select: { groupId: true }
    }));
    const groupIds = memberships.map((m: any) => m.groupId);

    const messages = await withDbRetry(() => prisma.message.findMany({
      where: {
        OR: [
          { senderId: session.user.id, deletedBySender: false },
          { receiverId: session.user.id, deletedByReceiver: false },
          { groupId: { in: groupIds } }
        ]
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            username: true,
            role: true,
            photoUrl: true,
            studentProfile: { select: { photoUrl: true } },
            teacherProfile: { select: { photoUrl: true } }
          }
        },
        receiver: {
          select: {
            id: true,
            name: true,
            username: true,
            role: true,
            photoUrl: true,
            studentProfile: { select: { photoUrl: true } },
            teacherProfile: { select: { photoUrl: true } }
          }
        },
        group: {
          select: {
            id: true,
            name: true,
            photoUrl: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 200
    }));

    const mappedMessages = messages.map((m: any) => {
      const senderPhoto = m.sender.photoUrl || (m.sender.role === 'STUDENT' ? m.sender.studentProfile?.photoUrl : m.sender.teacherProfile?.photoUrl);
      const receiverPhoto = m.receiver ? (m.receiver.photoUrl || (m.receiver.role === 'STUDENT' ? m.receiver.studentProfile?.photoUrl : m.receiver.teacherProfile?.photoUrl)) : null;

      return {
        ...m,
        sender: {
          id: m.sender.id,
          name: m.sender.name,
          username: m.sender.username,
          role: m.sender.role,
          photoUrl: senderPhoto || null
        },
        receiver: m.receiver ? {
          id: m.receiver.id,
          name: m.receiver.name,
          username: m.receiver.username,
          role: m.receiver.role,
          photoUrl: receiverPhoto || null
        } : null,
        group: m.group ? {
          id: m.group.id,
          name: m.group.name,
          photoUrl: m.group.photoUrl
        } : null
      };
    });

    return NextResponse.json({ messages: mappedMessages });
  } catch (error) {
    console.error('Error in GET messages:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const validation = messageSchema.safeParse(body);

    if (!validation.success) return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 });

    const { receiverId, groupId, content } = validation.data;

    const message = await withDbRetry(() => prisma.message.create({
      data: {
        senderId: session.user.id,
        receiverId: receiverId || null,
        groupId: groupId || null,
        content
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            username: true,
            role: true,
            photoUrl: true,
            studentProfile: { select: { photoUrl: true } },
            teacherProfile: { select: { photoUrl: true } }
          }
        },
        receiver: {
          select: {
            id: true,
            name: true,
            username: true,
            role: true,
            photoUrl: true,
            studentProfile: { select: { photoUrl: true } },
            teacherProfile: { select: { photoUrl: true } }
          }
        },
        group: {
          select: {
            id: true,
            name: true,
            photoUrl: true
          }
        }
      }
    }));

    const senderPhoto = message.sender.photoUrl || (message.sender.role === 'STUDENT' ? message.sender.studentProfile?.photoUrl : message.sender.teacherProfile?.photoUrl);
    const receiverPhoto = message.receiver ? (message.receiver.photoUrl || (message.receiver.role === 'STUDENT' ? message.receiver.studentProfile?.photoUrl : message.receiver.teacherProfile?.photoUrl)) : null;

    const formattedMessage = {
      ...message,
      sender: {
        id: message.sender.id,
        name: message.sender.name,
        username: message.sender.username,
        role: message.sender.role,
        photoUrl: senderPhoto || null
      },
      receiver: message.receiver ? {
        id: message.receiver.id,
        name: message.receiver.name,
        username: message.receiver.username,
        role: message.receiver.role,
        photoUrl: receiverPhoto || null
      } : null,
      group: message.group ? {
        id: message.group.id,
        name: message.group.name,
        photoUrl: message.group.photoUrl
      } : null
    };

    let memberIds: string[] = [];
    if (groupId) {
      const members = await withDbRetry(() => prisma.groupMember.findMany({
        where: { groupId },
        select: { userId: true }
      }));
      memberIds = members.map((m: any) => m.userId);
    }

    messageEmitter.emit('message', {
      type: 'create',
      message: formattedMessage,
      senderId: message.senderId,
      receiverId: message.receiverId,
      groupId: message.groupId,
      memberIds: groupId ? memberIds : undefined
    });

    return NextResponse.json({ success: true, message: formattedMessage });
  } catch (error) {
    console.error('Error in POST message:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const messageId = searchParams.get('messageId');
    const messageIdsParam = searchParams.get('messageIds');
    const chatUserId = searchParams.get('chatUserId');
    const chatGroupId = searchParams.get('chatGroupId');

    // Case 1: Bulk delete messages
    if (messageIdsParam) {
      const messageIds = messageIdsParam.split(',').filter(id => id.length > 0);
      if (messageIds.length === 0) return NextResponse.json({ error: 'No message IDs provided' }, { status: 400 });

      const msgs = await withDbRetry(() => prisma.message.findMany({
        where: { id: { in: messageIds } }
      }));

      const authorizedMsgs = msgs.filter(m => m.senderId === session.user.id || m.receiverId === session.user.id || m.groupId !== null);

      for (const msg of authorizedMsgs) {
        if (msg.groupId) {
          // For group messages, they are deleted for the user by just deleting them globally if sender, or not supported.
          // Wait, for groups let's just delete the message from the DB if they are the sender, or ignore if not sender.
          // To be simple, we delete it globally if the sender deletes it.
          if (msg.senderId === session.user.id) {
            await withDbRetry(() => prisma.message.delete({ where: { id: msg.id } }));
            
            // Get group member IDs for SSE notification
            const members = await withDbRetry(() => prisma.groupMember.findMany({
              where: { groupId: msg.groupId! },
              select: { userId: true }
            }));
            const memberIds = members.map((gm: any) => gm.userId);

            messageEmitter.emit('message', {
              type: 'delete',
              messageId: msg.id,
              senderId: msg.senderId,
              groupId: msg.groupId,
              memberIds,
              deletedByUserId: session.user.id
            });
          }
        } else {
          // Direct message deletion logic (same as single message)
          const isSender = msg.senderId === session.user.id;
          const updateData = isSender ? { deletedBySender: true } : { deletedByReceiver: true };
          const willBothBeDeleted = (isSender && msg.deletedByReceiver) || (!isSender && msg.deletedBySender);

          if (willBothBeDeleted) {
            await withDbRetry(() => prisma.message.delete({
              where: { id: msg.id }
            }));
          } else {
            await withDbRetry(() => prisma.message.update({
              where: { id: msg.id },
              data: updateData
            }));
          }

          messageEmitter.emit('message', {
            type: 'delete',
            messageId: msg.id,
            senderId: msg.senderId,
            receiverId: msg.receiverId,
            deletedByUserId: session.user.id
          });
        }
      }

      return NextResponse.json({ success: true, deletedCount: authorizedMsgs.length });
    }

    // Case 2: Single message delete
    if (messageId) {
      const msg = await withDbRetry(() => prisma.message.findUnique({
        where: { id: messageId }
      }));
      if (!msg) return NextResponse.json({ error: 'Message not found' }, { status: 404 });

      if (msg.groupId) {
        if (msg.senderId !== session.user.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        await withDbRetry(() => prisma.message.delete({ where: { id: messageId } }));
        
        const members = await withDbRetry(() => prisma.groupMember.findMany({
          where: { groupId: msg.groupId! },
          select: { userId: true }
        }));
        const memberIds = members.map((gm: any) => gm.userId);

        messageEmitter.emit('message', {
          type: 'delete',
          messageId,
          senderId: msg.senderId,
          groupId: msg.groupId,
          memberIds,
          deletedByUserId: session.user.id
        });

        return NextResponse.json({ success: true, deletedMessageId: messageId });
      }

      if (msg.senderId !== session.user.id && msg.receiverId !== session.user.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const isSender = msg.senderId === session.user.id;
      const updateData = isSender ? { deletedBySender: true } : { deletedByReceiver: true };
      const willBothBeDeleted = (isSender && msg.deletedByReceiver) || (!isSender && msg.deletedBySender);

      if (willBothBeDeleted) {
        await withDbRetry(() => prisma.message.delete({
          where: { id: messageId }
        }));
      } else {
        await withDbRetry(() => prisma.message.update({
          where: { id: messageId },
          data: updateData
        }));
      }

      messageEmitter.emit('message', {
        type: 'delete',
        messageId,
        senderId: msg.senderId,
        receiverId: msg.receiverId,
        deletedByUserId: session.user.id
      });

      return NextResponse.json({ success: true, deletedMessageId: messageId });
    }

    // Case 3: Delete entire direct chat
    if (chatUserId) {
      await withDbRetry(() => prisma.message.updateMany({
        where: { senderId: session.user.id, receiverId: chatUserId },
        data: { deletedBySender: true }
      }));

      await withDbRetry(() => prisma.message.updateMany({
        where: { senderId: chatUserId, receiverId: session.user.id },
        data: { deletedByReceiver: true }
      }));

      await withDbRetry(() => prisma.message.deleteMany({
        where: {
          OR: [
            { senderId: session.user.id, receiverId: chatUserId, deletedBySender: true, deletedByReceiver: true },
            { senderId: chatUserId, receiverId: session.user.id, deletedBySender: true, deletedByReceiver: true }
          ]
        }
      }));

      messageEmitter.emit('message', {
        type: 'deleteChat',
        chatUserId,
        senderId: session.user.id,
        receiverId: chatUserId,
        deletedByUserId: session.user.id
      });

      return NextResponse.json({ success: true });
    }

    // Case 4: Delete group chat / leave group
    if (chatGroupId) {
      await withDbRetry(() => prisma.groupMember.deleteMany({
        where: { groupId: chatGroupId, userId: session.user.id }
      }));

      const memberCount = await withDbRetry(() => prisma.groupMember.count({
        where: { groupId: chatGroupId }
      }));

      if (memberCount === 0) {
        await withDbRetry(() => prisma.chatGroup.delete({
          where: { id: chatGroupId }
        }));
      }

      messageEmitter.emit('message', {
        type: 'deleteChat',
        chatGroupId,
        senderId: session.user.id,
        deletedByUserId: session.user.id
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
  } catch (error) {
    console.error('Error deleting messages:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { messageId, content } = body;

    if (!messageId || !content || content.trim().length === 0) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const msg = await withDbRetry(() => prisma.message.findUnique({
      where: { id: messageId }
    }));

    if (!msg) return NextResponse.json({ error: 'Message not found' }, { status: 404 });

    if (msg.senderId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const timeElapsed = Date.now() - new Date(msg.createdAt).getTime();
    if (timeElapsed > 240000) {
      return NextResponse.json({ error: 'Editing time window (4 minutes) expired' }, { status: 400 });
    }

    const updatedMsg = await withDbRetry(() => prisma.message.update({
      where: { id: messageId },
      data: { content },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            username: true,
            role: true,
            photoUrl: true,
            studentProfile: { select: { photoUrl: true } },
            teacherProfile: { select: { photoUrl: true } }
          }
        },
        receiver: {
          select: {
            id: true,
            name: true,
            username: true,
            role: true,
            photoUrl: true,
            studentProfile: { select: { photoUrl: true } },
            teacherProfile: { select: { photoUrl: true } }
          }
        },
        group: {
          select: {
            id: true,
            name: true,
            photoUrl: true
          }
        }
      }
    }));

    const senderPhoto = updatedMsg.sender.photoUrl || (updatedMsg.sender.role === 'STUDENT' ? updatedMsg.sender.studentProfile?.photoUrl : updatedMsg.sender.teacherProfile?.photoUrl);
    const receiverPhoto = updatedMsg.receiver ? (updatedMsg.receiver.photoUrl || (updatedMsg.receiver.role === 'STUDENT' ? updatedMsg.receiver.studentProfile?.photoUrl : updatedMsg.receiver.teacherProfile?.photoUrl)) : null;

    const formattedMessage = {
      ...updatedMsg,
      sender: {
        id: updatedMsg.sender.id,
        name: updatedMsg.sender.name,
        username: updatedMsg.sender.username,
        role: updatedMsg.sender.role,
        photoUrl: senderPhoto || null
      },
      receiver: updatedMsg.receiver ? {
        id: updatedMsg.receiver.id,
        name: updatedMsg.receiver.name,
        username: updatedMsg.receiver.username,
        role: updatedMsg.receiver.role,
        photoUrl: receiverPhoto || null
      } : null,
      group: updatedMsg.group ? {
        id: updatedMsg.group.id,
        name: updatedMsg.group.name,
        photoUrl: updatedMsg.group.photoUrl
      } : null
    };

    let memberIds: string[] = [];
    if (updatedMsg.groupId) {
      const members = await withDbRetry(() => prisma.groupMember.findMany({
        where: { groupId: updatedMsg.groupId! },
        select: { userId: true }
      }));
      memberIds = members.map((m: any) => m.userId);
    }

    messageEmitter.emit('message', {
      type: 'update',
      message: formattedMessage,
      senderId: updatedMsg.senderId,
      receiverId: updatedMsg.receiverId,
      groupId: updatedMsg.groupId,
      memberIds: updatedMsg.groupId ? memberIds : undefined
    });

    return NextResponse.json({ success: true, message: formattedMessage });
  } catch (error) {
    console.error('Error updating message:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
