export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma, withDbRetry } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user || session.user.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { onlineTestId, score, timeTaken, autoSubmitted } = body;

    if (!onlineTestId || score === undefined || timeTaken === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const submission = await withDbRetry(() => prisma.onlineTestSubmission.upsert({
      where: {
        onlineTestId_studentId: {
          onlineTestId,
          studentId: session.user.id
        }
      },
      update: {
        score,
        timeTaken,
        autoSubmitted: !!autoSubmitted
      },
      create: {
        onlineTestId,
        studentId: session.user.id,
        score,
        timeTaken,
        autoSubmitted: !!autoSubmitted
      }
    }));

    return NextResponse.json({ success: true, submission });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to submit test' }, { status: 500 });
  }
}
