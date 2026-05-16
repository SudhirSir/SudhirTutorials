import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const messageSchema = z.object({
  receiverId: z.string().min(1),
  content: z.string().min(1).max(500),
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: session.user.id },
          { receiverId: session.user.id }
        ]
      },
      include: {
        sender: { select: { name: true, username: true, role: true } },
        receiver: { select: { name: true, username: true, role: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ messages });
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

    if (!validation.success) return NextResponse.json({ error: validation.error.errors[0].message }, { status: 400 });

    const { receiverId, content } = validation.data;

    const message = await prisma.message.create({
      data: {
        senderId: session.user.id,
        receiverId,
        content
      }
    });

    return NextResponse.json({ success: true, message });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
