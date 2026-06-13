import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma, withDbRetry } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user || !['STUDENT', 'TEACHER', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const doubts = await withDbRetry(() => prisma.doubtHistory.findMany({
      where: {
        studentId: session.user.id
      },
      orderBy: {
        createdAt: 'asc'
      },
      take: 20
    }));

    return NextResponse.json({
      success: true,
      doubts
    });
  } catch (error) {
    console.error('Failed to fetch doubt history:', error);
    return NextResponse.json({ error: 'Failed to fetch doubt history' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });
    }

    const doubt = await withDbRetry(() => prisma.doubtHistory.findUnique({
      where: { id }
    }));

    if (!doubt) {
      return NextResponse.json({ error: 'History item not found' }, { status: 404 });
    }

    if (doubt.studentId !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await withDbRetry(() => prisma.doubtHistory.delete({
      where: { id }
    }));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete doubt history:', error);
    return NextResponse.json({ error: 'Failed to delete doubt history' }, { status: 500 });
  }
}
