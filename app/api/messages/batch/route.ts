import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma, withDbRetry } from '@/lib/prisma';
import { messageEmitter } from '@/lib/events';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const batchMessageSchema = z.object({
  batchId: z.string().min(1),
  content: z.string().min(1).max(5000),
});

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user || (session.user.role !== 'ADMIN' && session.user.role !== 'TEACHER')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const validation = batchMessageSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 });
    }

    const { batchId, content } = validation.data;

    // Verify batch existence and get students
    const batch = await withDbRetry(() => prisma.batch.findUnique({
      where: { id: batchId },
      select: {
        id: true,
        name: true,
        teachers: { select: { id: true } },
        students: { select: { id: true } }
      }
    }));

    if (!batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    // Role-based verification: Teachers can only message batches they are assigned to
    if (session.user.role === 'TEACHER') {
      const isAssigned = batch.teachers.some((t: any) => t.id === session.user.id);
      if (!isAssigned) {
        return NextResponse.json({ error: 'Forbidden: You are not assigned to this batch' }, { status: 403 });
      }
    }

    const studentIds = batch.students.map((s: any) => s.id);
    if (studentIds.length === 0) {
      return NextResponse.json({ error: 'No students enrolled in this batch' }, { status: 400 });
    }

    // Create message records in parallel and trigger notifications
    const messages = await Promise.all(studentIds.map(async (studentId) => {
      return withDbRetry(() => prisma.message.create({
        data: {
          senderId: session.user.id,
          receiverId: studentId,
          content
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              username: true,
              role: true,
              photoUrl: true
            }
          },
          receiver: {
            select: {
              id: true,
              name: true,
              username: true,
              role: true,
              photoUrl: true
            }
          }
        }
      }));
    }));

    // Emit socket/SSE update events for each created message
    messages.forEach((msg) => {
      const senderPhoto = msg.sender.photoUrl || null;
      const receiverPhoto = msg.receiver.photoUrl || null;

      const formattedMessage = {
        ...msg,
        sender: {
          ...msg.sender,
          photoUrl: senderPhoto
        },
        receiver: {
          ...msg.receiver,
          photoUrl: receiverPhoto
        }
      };

      messageEmitter.emit('message', {
        type: 'create',
        message: formattedMessage,
        senderId: msg.senderId,
        receiverId: msg.receiverId
      });
    });

    return NextResponse.json({ success: true, count: messages.length });
  } catch (error) {
    console.error('Error sending batch message:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
