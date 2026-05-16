import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || (session.user as any).role !== 'TEACHER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const teacherId = (session.user as any).id;
    const materials = await prisma.material.findMany({
      where: { teacherId },
      include: {
        course: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ materials });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch materials' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || (session.user as any).role !== 'TEACHER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const teacherId = (session.user as any).id;
    const { title, type, url, courseId } = await req.json();

    if (!title || !type || !url || !courseId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const material = await prisma.material.create({
      data: {
        title,
        type,
        url,
        courseId,
        teacherId
      },
      include: {
        course: { select: { name: true } }
      }
    });

    return NextResponse.json({ success: true, material });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to upload material' }, { status: 500 });
  }
}
