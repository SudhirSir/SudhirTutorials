export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma, withDbRetry } from '@/lib/prisma';
import { sendPushNotification } from '@/lib/push';
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
          { senderId: session.user.id },
          { receiverId: session.user.id }
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
      orderBy: { createdAt: 'desc' }
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
      }
    }));

    // Dispatch native push notification
    let displayBody = content;
    if (content.startsWith('data:')) {
      displayBody = '📎 Media attachment';
    } else if (content.length > 80) {
      displayBody = content.substring(0, 80) + '...';
    }
    await sendPushNotification(receiverId, `💬 New message from ${session.user.name || 'User'}`, displayBody);

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
      // Find the message to verify ownership
      const msg = await withDbRetry(() => prisma.message.findUnique({
        where: { id: messageId }
      }));
      if (!msg) return NextResponse.json({ error: 'Message not found' }, { status: 404 });

      // Verify that current user is either the sender or the receiver
      if (msg.senderId !== session.user.id && msg.receiverId !== session.user.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      await withDbRetry(() => prisma.message.delete({
        where: { id: messageId }
      }));

      return NextResponse.json({ success: true, deletedMessageId: messageId });
    }

    if (chatUserId) {
      // Delete all messages in the conversation between current user and chatUserId
      const deleted = await withDbRetry(() => prisma.message.deleteMany({
        where: {
          OR: [
            { senderId: session.user.id, receiverId: chatUserId },
            { senderId: chatUserId, receiverId: session.user.id }
          ]
        }
      }));

      return NextResponse.json({ success: true, deletedCount: deleted.count });
    }

    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
  } catch (error) {
    console.error('Error deleting messages:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
