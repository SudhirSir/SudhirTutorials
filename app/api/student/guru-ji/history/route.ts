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
