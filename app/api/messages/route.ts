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
  receiverId: z.string().min(1),
  content: z.string().min(1).max(5000000),
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const messages = await withDbRetry(() => prisma.message.findMany({
      where: {
        OR: [
          { senderId: session.user.id, deletedBySender: false },
          { receiverId: session.user.id, deletedByReceiver: false }
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
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 200
    }));

    const mappedMessages = messages.map((m: any) => {
      const senderPhoto = m.sender.photoUrl || (m.sender.role === 'STUDENT' ? m.sender.studentProfile?.photoUrl : m.sender.teacherProfile?.photoUrl);
      const receiverPhoto = m.receiver.photoUrl || (m.receiver.role === 'STUDENT' ? m.receiver.studentProfile?.photoUrl : m.receiver.teacherProfile?.photoUrl);

      return {
        ...m,
        sender: {
          id: m.sender.id,
          name: m.sender.name,
          username: m.sender.username,
          role: m.sender.role,
          photoUrl: senderPhoto || null
        },
        receiver: {
          id: m.receiver.id,
          name: m.receiver.name,
          username: m.receiver.username,
          role: m.receiver.role,
          photoUrl: receiverPhoto || null
        }
      };
    });

    return NextResponse.json({ messages: mappedMessages });
  } catch (error) {
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

    const { receiverId, content } = validation.data;

    const message = await withDbRetry(() => prisma.message.create({
      data: {
        senderId: session.user.id,
        receiverId,
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
        }
      }
    }));

    const senderPhoto = message.sender.photoUrl || (message.sender.role === 'STUDENT' ? message.sender.studentProfile?.photoUrl : message.sender.teacherProfile?.photoUrl);
    const receiverPhoto = message.receiver.photoUrl || (message.receiver.role === 'STUDENT' ? message.receiver.studentProfile?.photoUrl : message.receiver.teacherProfile?.photoUrl);

    const formattedMessage = {
      ...message,
      sender: {
        id: message.sender.id,
        name: message.sender.name,
        username: message.sender.username,
        role: message.sender.role,
        photoUrl: senderPhoto || null
      },
      receiver: {
        id: message.receiver.id,
        name: message.receiver.name,
        username: message.receiver.username,
        role: message.receiver.role,
        photoUrl: receiverPhoto || null
      }
    };

    messageEmitter.emit('message', {
      type: 'create',
      message: formattedMessage,
      senderId: message.senderId,
      receiverId: message.receiverId
    });

    return NextResponse.json({ success: true, message });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const messageId = searchParams.get('messageId');
    const chatUserId = searchParams.get('chatUserId');

    if (messageId) {
      const msg = await withDbRetry(() => prisma.message.findUnique({
        where: { id: messageId }
      }));
      if (!msg) return NextResponse.json({ error: 'Message not found' }, { status: 404 });

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

    if (chatUserId) {
      await withDbRetry(() => prisma.message.updateMany({
        where: { senderId: session.user.id, receiverId: chatUserId },
        data: { deletedBySender: true }
      }));

      await withDbRetry(() => prisma.message.updateMany({
        where: { senderId: chatUserId, receiverId: session.user.id },
        data: { deletedByReceiver: true }
      }));

      const deleted = await withDbRetry(() => prisma.message.deleteMany({
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
        }
      }
    }));

    const senderPhoto = updatedMsg.sender.photoUrl || (updatedMsg.sender.role === 'STUDENT' ? updatedMsg.sender.studentProfile?.photoUrl : updatedMsg.sender.teacherProfile?.photoUrl);
    const receiverPhoto = updatedMsg.receiver.photoUrl || (updatedMsg.receiver.role === 'STUDENT' ? updatedMsg.receiver.studentProfile?.photoUrl : updatedMsg.receiver.teacherProfile?.photoUrl);

    const formattedMessage = {
      ...updatedMsg,
      sender: {
        id: updatedMsg.sender.id,
        name: updatedMsg.sender.name,
        username: updatedMsg.sender.username,
        role: updatedMsg.sender.role,
        photoUrl: senderPhoto || null
      },
      receiver: {
        id: updatedMsg.receiver.id,
        name: updatedMsg.receiver.name,
        username: updatedMsg.receiver.username,
        role: updatedMsg.receiver.role,
        photoUrl: receiverPhoto || null
      }
    };

    messageEmitter.emit('message', {
      type: 'update',
      message: formattedMessage,
      senderId: updatedMsg.senderId,
      receiverId: updatedMsg.receiverId
    });

    return NextResponse.json({ success: true, message: formattedMessage });
  } catch (error) {
    console.error('Error updating message:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
